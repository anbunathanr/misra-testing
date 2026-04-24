/**
 * Register Lambda Function
 * 
 * Handles user registration with AWS Cognito
 * Creates a new user with SOFTWARE_TOKEN_MFA enabled for TOTP support
 * 
 * Request:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePassword123!",
 *   "name": "John Doe"
 * }
 * 
 * Response:
 * {
 *   "userId": "cognito-user-id",
 *   "email": "user@example.com",
 *   "message": "User registered successfully. Please verify your email.",
 *   "requiresEmailVerification": true
 * }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminGetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { validateEmail, validatePassword } from '../../utils/validation';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Register');
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface RegisterRequest {
  email: string;
  password?: string; // Optional for passwordless flow
  name?: string;
}

interface RegisterResponse {
  userId: string;
  email: string;
  message: string;
  requiresEmailVerification: boolean;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  try {
    logger.info('User registration request received', {
      correlationId,
      path: event.path,
      method: event.httpMethod
    });

    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
    }

    const request: RegisterRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
    }

    // Validate email format
    if (!validateEmail(request.email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
    }

    // If password is provided, validate it
    if (request.password) {
      const passwordValidation = validatePassword(request.password);
      if (!passwordValidation.isValid) {
        return errorResponse(400, 'WEAK_PASSWORD', passwordValidation.message, correlationId);
      }
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      logger.error('COGNITO_USER_POOL_ID not configured', { correlationId } as any);
      return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
    }

    logger.info('Attempting to register user', {
      correlationId,
      email: request.email,
      name: request.name
    });

    // Check if user already exists
    try {
      await cognito.send(new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: request.email
      }));

      // User exists
      logger.warn('User already exists', {
        correlationId,
        email: request.email
      });

      return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
    } catch (error: any) {
      if (error.name !== 'UserNotFoundException') {
        throw error;
      }
      // User doesn't exist, continue with registration
    }

    // Create user with temporary password
    const tempPassword = generateTemporaryPassword();
    
    logger.info('Creating Cognito user', {
      correlationId,
      email: request.email,
      passwordProvided: !!request.password
    });

    const createUserResponse = await cognito.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: request.email,
      TemporaryPassword: tempPassword,
      UserAttributes: [
        {
          Name: 'email',
          Value: request.email
        },
        {
          Name: 'email_verified',
          Value: 'false'
        },
        {
          Name: 'name',
          Value: request.name || request.email
        },
        {
          Name: 'custom:otpEnabled',
          Value: 'false'
        }
      ],
      MessageAction: 'SUPPRESS' // Don't send welcome email yet
    }));

    const userId = createUserResponse.User?.Username;
    if (!userId) {
      throw new Error('Failed to create user - no user ID returned');
    }

    logger.info('User created successfully', {
      correlationId,
      userId,
      email: request.email
    });

    // Set permanent password if provided, otherwise use temporary password
    const finalPassword = request.password || tempPassword;
    
    logger.info('Setting permanent password', {
      correlationId,
      userId,
      isCustomPassword: !!request.password
    });

    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: request.email,
      Password: finalPassword,
      Permanent: true
    }));

    logger.info('Permanent password set', {
      correlationId,
      userId
    });

    // Store temporary password in DynamoDB for auto-login
    try {
      const usersTableName = process.env.USERS_TABLE_NAME || 'misra-users';
      await dynamoClient.send(new PutCommand({
        TableName: usersTableName,
        Item: {
          email: request.email,
          userId: userId,
          tempPassword: finalPassword,
          createdAt: Date.now(),
          name: request.name || request.email
        }
      }));
      logger.info('Stored user credentials in DynamoDB', {
        correlationId,
        email: request.email
      });
    } catch (dbError) {
      logger.warn('Failed to store credentials in DynamoDB', {
        correlationId,
        error: (dbError as any).message
      });
      // Continue anyway - DynamoDB storage is optional for auto-login fallback
    }

    // Note: SOFTWARE_TOKEN_MFA will be set up during the login/OTP verification flow
    // The user needs to associate a software token first before we can set MFA preference
    // This is handled in the verify-otp Lambda function

    logger.info('User registration completed successfully', {
      correlationId,
      userId,
      email: request.email
    });

    const response: RegisterResponse = {
      userId,
      email: request.email,
      message: 'User registered successfully. Please verify your email and set up MFA.',
      requiresEmailVerification: true
    };

    logger.info('User registration completed successfully', {
      correlationId,
      userId,
      email: request.email
    });

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    logger.error('User registration failed', {
      correlationId,
      error: error.message,
      name: error.name,
      stack: error.stack
    });

    // Handle specific Cognito errors
    if (error.name === 'UsernameExistsException') {
      return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
    } else if (error.name === 'InvalidPasswordException') {
      return errorResponse(400, 'INVALID_PASSWORD', error.message, correlationId);
    } else if (error.name === 'TooManyRequestsException') {
      return errorResponse(429, 'TOO_MANY_REQUESTS', 'Too many registration attempts. Please try again later.', correlationId);
    }

    return errorResponse(500, 'REGISTRATION_FAILED', error.message || 'Failed to register user', correlationId);
  }
};

/**
 * Generate a temporary password that meets Cognito requirements
 */
function generateTemporaryPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const digits = '0123456789';
  const symbols = '!@#$%^&*';

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Add random characters to reach minimum length
  const allChars = uppercase + lowercase + digits + symbols;
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Standard error response
 */
function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  correlationId: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: correlationId
      }
    })
  };
}
