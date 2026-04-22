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
import * as AWS from 'aws-sdk';
import { validateEmail, validatePassword } from '../../utils/validation';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Register');
const cognito = new AWS.CognitoIdentityServiceProvider();

interface RegisterRequest {
  email: string;
  password: string;
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
  
  logger.info('User registration request received', {
    correlationId,
    path: event.path,
    method: event.httpMethod
  });

  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
    }

    const request: RegisterRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email || !request.password) {
      return errorResponse(400, 'MISSING_FIELDS', 'Email and password are required', correlationId);
    }

    // Validate email format
    if (!validateEmail(request.email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
    }

    // Validate password strength
    const passwordValidation = validatePassword(request.password);
    if (!passwordValidation.isValid) {
      return errorResponse(400, 'WEAK_PASSWORD', passwordValidation.message, correlationId);
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      logger.error('COGNITO_USER_POOL_ID not configured', { correlationId });
      return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
    }

    logger.info('Attempting to register user', {
      correlationId,
      email: request.email,
      name: request.name
    });

    // Check if user already exists
    try {
      await cognito.adminGetUser({
        UserPoolId: userPoolId,
        Username: request.email
      }).promise();

      // User exists
      logger.warn('User already exists', {
        correlationId,
        email: request.email
      });

      return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
    } catch (error: any) {
      if (error.code !== 'UserNotFoundException') {
        throw error;
      }
      // User doesn't exist, continue with registration
    }

    // Create user with temporary password
    const tempPassword = generateTemporaryPassword();
    
    logger.info('Creating Cognito user', {
      correlationId,
      email: request.email
    });

    const createUserResponse = await cognito.adminCreateUser({
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
    }).promise();

    const userId = createUserResponse.User?.Username;
    if (!userId) {
      throw new Error('Failed to create user - no user ID returned');
    }

    logger.info('User created successfully', {
      correlationId,
      userId,
      email: request.email
    });

    // Set permanent password
    logger.info('Setting permanent password', {
      correlationId,
      userId
    });

    await cognito.adminSetUserPassword({
      UserPoolId: userPoolId,
      Username: request.email,
      Password: request.password,
      Permanent: true
    }).promise();

    logger.info('Permanent password set', {
      correlationId,
      userId
    });

    // Enable SOFTWARE_TOKEN_MFA for TOTP support
    logger.info('Enabling SOFTWARE_TOKEN_MFA', {
      correlationId,
      userId
    });

    await cognito.adminSetUserMFAPreference({
      UserPoolId: userPoolId,
      Username: request.email,
      SoftwareTokenMfaSettings: {
        Enabled: true,
        PreferredMfa: false // Not preferred yet, will be set after setup
      }
    }).promise();

    logger.info('SOFTWARE_TOKEN_MFA enabled', {
      correlationId,
      userId
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
      code: error.code,
      stack: error.stack
    });

    // Handle specific Cognito errors
    if (error.code === 'UsernameExistsException') {
      return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
    } else if (error.code === 'InvalidPasswordException') {
      return errorResponse(400, 'INVALID_PASSWORD', error.message, correlationId);
    } else if (error.code === 'TooManyRequestsException') {
      return errorResponse(429, 'TOO_MANY_REQUESTS', 'Too many registration attempts. Please try again later.', correlationId);
    }

    return errorResponse(500, 'REGISTRATION_FAILED', 'Failed to register user', correlationId);
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
