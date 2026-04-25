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
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { validateEmail, validatePassword } from '../../utils/validation';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('Register');
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

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

    // Generate and send OTP via email
    const otp = generateOTP();
    const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';
    const otpExpirationTime = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes from now

    logger.info('Generating OTP for user', {
      correlationId,
      email: request.email,
      otpTableName
    });

    // Store OTP in DynamoDB
    try {
      await dynamoClient.send(new PutCommand({
        TableName: otpTableName,
        Item: {
          otpId: `${request.email}-${Date.now()}`,
          email: request.email,
          otp: otp,
          createdAt: Date.now(),
          ttl: otpExpirationTime,
          userId: userId
        }
      }));
      logger.info('OTP stored in DynamoDB', {
        correlationId,
        email: request.email
      });
    } catch (dbError) {
      logger.warn('Failed to store OTP in DynamoDB', {
        correlationId,
        error: (dbError as any).message
      });
      // Continue anyway - we'll still send the OTP via email
    }

    // Send OTP via email
    try {
      await sendOTPEmail(request.email, otp, request.name || request.email, correlationId);
      logger.info('OTP email sent successfully', {
        correlationId,
        email: request.email
      });
    } catch (emailError) {
      logger.error('Failed to send OTP email', {
        correlationId,
        email: request.email,
        error: (emailError as any).message
      });
      // Don't fail registration if email fails - user can request OTP later
    }

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
          name: request.name || request.email,
          otpVerified: false
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
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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
 * Send OTP via email using AWS SES
 */
async function sendOTPEmail(
  email: string,
  otp: string,
  userName: string,
  correlationId: string
): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #7b61ff; margin-bottom: 20px; }
          .otp-box { background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #7b61ff; letter-spacing: 5px; font-family: monospace; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 MISRA Platform - OTP Verification</h2>
          </div>
          
          <p>Hi ${userName},</p>
          
          <p>Your One-Time Password (OTP) for MISRA Platform is:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          
          <p><strong>⏰ This code will expire in 10 minutes.</strong></p>
          
          <p>If you didn't request this code, please ignore this email and your account will remain secure.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <div class="footer">
            <p>MISRA Compliance Platform</p>
            <p>Automated Code Analysis & Compliance Verification</p>
            <p>© 2026 - All rights reserved</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
MISRA Platform - OTP Verification

Hi ${userName},

Your One-Time Password (OTP) for MISRA Platform is:

${otp}

⏰ This code will expire in 10 minutes.

If you didn't request this code, please ignore this email and your account will remain secure.

---
MISRA Compliance Platform
Automated Code Analysis & Compliance Verification
© 2026 - All rights reserved
  `;

  const params = {
    Source: process.env.SES_FROM_EMAIL || 'noreply@misra-platform.com',
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'Your MISRA Platform OTP Code',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textContent,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params as any));
    logger.info('OTP email sent via SES', {
      correlationId,
      email
    });
  } catch (error) {
    logger.error('Failed to send OTP email via SES', {
      correlationId,
      email,
      error: (error as any).message
    });
    throw error;
  }
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
