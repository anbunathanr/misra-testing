/**
 * Verify OTP Email Lambda Function
 * 
 * Verifies the OTP provided by the user and authenticates them
 * Returns JWT tokens for authenticated session
 * 
 * Request:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "accessToken": "jwt-token",
 *   "refreshToken": "refresh-token",
 *   "user": {
 *     "email": "user@example.com",
 *     "userId": "cognito-user-id"
 *   },
 *   "expiresIn": 3600
 * }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, AdminGetUserCommand, AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { validateEmail } from '../../utils/validation';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VerifyOTPEmail');
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface VerifyOTPRequest {
  email: string;
  otp: string;
}

interface VerifyOTPResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: {
    email: string;
    userId: string;
  };
  expiresIn: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  try {
    logger.info('Verify OTP request received', {
      correlationId,
      path: event.path,
      method: event.httpMethod
    });

    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
    }

    const request: VerifyOTPRequest = JSON.parse(event.body);

    // Validate inputs
    if (!request.email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
    }

    if (!validateEmail(request.email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
    }

    if (!request.otp) {
      return errorResponse(400, 'MISSING_OTP', 'OTP is required', correlationId);
    }

    if (!/^\d{6}$/.test(request.otp)) {
      return errorResponse(400, 'INVALID_OTP_FORMAT', 'OTP must be a 6-digit number', correlationId);
    }

    logger.info('Verifying OTP', {
      correlationId,
      email: request.email
    });

    const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';

    // Query OTP from DynamoDB using EmailIndex GSI
    let otpRecord: any = null;
    try {
      const queryResponse = await dynamoClient.send(new QueryCommand({
        TableName: otpTableName,
        IndexName: 'EmailIndex',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': request.email
        },
        ScanIndexForward: false, // Get most recent first
        Limit: 1
      }));

      if (queryResponse.Items && queryResponse.Items.length > 0) {
        otpRecord = queryResponse.Items[0];
      }
    } catch (dbError) {
      logger.error('Failed to query OTP from DynamoDB', {
        correlationId,
        email: request.email,
        error: (dbError as any).message
      });
      return errorResponse(500, 'OTP_LOOKUP_FAILED', 'Failed to verify OTP', correlationId);
    }

    // Check if OTP exists
    if (!otpRecord) {
      logger.warn('OTP not found', {
        correlationId,
        email: request.email
      });
      return errorResponse(404, 'OTP_NOT_FOUND', 'OTP not found or has expired', correlationId);
    }

    // Check if OTP has expired
    const now = Math.floor(Date.now() / 1000);
    if (otpRecord.ttl && otpRecord.ttl < now) {
      logger.warn('OTP expired', {
        correlationId,
        email: request.email,
        ttl: otpRecord.ttl,
        now
      });
      
      // Delete expired OTP
      try {
        await dynamoClient.send(new DeleteCommand({
          TableName: otpTableName,
          Key: {
            otpId: otpRecord.otpId
          }
        }));
      } catch (e) {
        logger.warn('Failed to delete expired OTP', { correlationId });
      }

      return errorResponse(401, 'OTP_EXPIRED', 'OTP has expired. Please request a new one.', correlationId);
    }

    // Verify OTP matches
    if (otpRecord.otp !== request.otp) {
      logger.warn('OTP mismatch', {
        correlationId,
        email: request.email
      });

      // Increment attempt counter
      const attempts = (otpRecord.attempts || 0) + 1;
      const maxAttempts = otpRecord.maxAttempts || 5;

      if (attempts >= maxAttempts) {
        logger.warn('Max OTP attempts exceeded', {
          correlationId,
          email: request.email,
          attempts,
          maxAttempts
        });

        // Delete OTP after max attempts
        try {
          await dynamoClient.send(new DeleteCommand({
            TableName: otpTableName,
            Key: {
              otpId: otpRecord.otpId
            }
          }));
        } catch (e) {
          logger.warn('Failed to delete OTP after max attempts', { correlationId });
        }

        return errorResponse(429, 'TOO_MANY_ATTEMPTS', 'Too many failed OTP attempts. Please request a new OTP.', correlationId);
      }

      return errorResponse(401, 'INVALID_OTP', `Invalid OTP. ${maxAttempts - attempts} attempts remaining.`, correlationId);
    }

    logger.info('OTP verified successfully', {
      correlationId,
      email: request.email
    });

    // Get user from Cognito
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      logger.error('COGNITO_USER_POOL_ID not configured', { correlationId } as any);
      return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
    }

    let userId: string;
    try {
      const userResponse = await cognito.send(new AdminGetUserCommand({
        UserPoolId: userPoolId,
        Username: request.email
      }));
      userId = userResponse.Username || request.email;
    } catch (error: any) {
      if (error.name === 'UserNotFoundException') {
        logger.warn('User not found in Cognito', {
          correlationId,
          email: request.email
        });
        return errorResponse(404, 'USER_NOT_FOUND', 'User not found', correlationId);
      }
      throw error;
    }

    logger.info('User found in Cognito', {
      correlationId,
      email: request.email,
      userId
    });

    // Get temporary password from DynamoDB (stored during registration)
    const usersTableName = process.env.USERS_TABLE_NAME || 'misra-users';
    let tempPassword: string | null = null;

    try {
      const userQuery = await dynamoClient.send(new QueryCommand({
        TableName: usersTableName,
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: {
          ':email': request.email
        },
        Limit: 1
      }));

      if (userQuery.Items && userQuery.Items.length > 0) {
        tempPassword = userQuery.Items[0].tempPassword;
      }
    } catch (e) {
      logger.warn('Failed to retrieve user credentials from DynamoDB', {
        correlationId,
        email: request.email
      });
    }

    // Authenticate user with Cognito
    let authTokens: any = null;
    if (tempPassword) {
      try {
        const authResponse = await cognito.send(new AdminInitiateAuthCommand({
          UserPoolId: userPoolId,
          ClientId: process.env.COGNITO_CLIENT_ID || '',
          AuthFlow: 'ADMIN_NO_SRP_AUTH',
          AuthParameters: {
            USERNAME: request.email,
            PASSWORD: tempPassword
          }
        }));

        authTokens = authResponse.AuthenticationResult;
        logger.info('User authenticated successfully', {
          correlationId,
          email: request.email
        });
      } catch (authError: any) {
        logger.error('Failed to authenticate user', {
          correlationId,
          email: request.email,
          error: authError.message
        });
        return errorResponse(401, 'AUTHENTICATION_FAILED', 'Failed to authenticate user', correlationId);
      }
    } else {
      logger.warn('No temporary password found, cannot authenticate', {
        correlationId,
        email: request.email
      });
      return errorResponse(500, 'AUTH_SETUP_INCOMPLETE', 'User authentication setup incomplete', correlationId);
    }

    // Delete OTP after successful verification
    try {
      await dynamoClient.send(new DeleteCommand({
        TableName: otpTableName,
        Key: {
          otpId: otpRecord.otpId
        }
      }));
      logger.info('OTP deleted after verification', {
        correlationId,
        email: request.email
      });
    } catch (e) {
      logger.warn('Failed to delete OTP after verification', {
        correlationId,
        email: request.email
      });
    }

    logger.info('OTP verification completed successfully', {
      correlationId,
      email: request.email,
      userId
    });

    const response: VerifyOTPResponse = {
      success: true,
      accessToken: authTokens.AccessToken,
      refreshToken: authTokens.RefreshToken,
      user: {
        email: request.email,
        userId
      },
      expiresIn: authTokens.ExpiresIn || 3600
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    logger.error('OTP verification failed', {
      correlationId,
      error: error.message,
      name: error.name,
      stack: error.stack
    });

    return errorResponse(500, 'VERIFICATION_FAILED', error.message || 'Failed to verify OTP', correlationId);
  }
};

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
