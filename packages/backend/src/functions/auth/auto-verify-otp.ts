/**
 * Auto Verify OTP Lambda Function
 * 
 * Automatically fetches OTP from email and verifies it without user intervention
 * This creates a seamless authentication experience
 * 
 * Request:
 * {
 *   "email": "user@example.com"
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

const logger = createLogger('AutoVerifyOTP');
const cognito = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface AutoVerifyOTPRequest {
  email: string;
}

interface AutoVerifyOTPResponse {
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
    logger.info('Auto verify OTP request received', {
      correlationId,
      path: event.path,
      method: event.httpMethod
    });

    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
    }

    const request: AutoVerifyOTPRequest = JSON.parse(event.body);

    // Validate inputs
    if (!request.email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
    }

    if (!validateEmail(request.email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
    }

    logger.info('Starting automatic OTP verification', {
      correlationId,
      email: request.email
    });

    const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';

    // Wait for OTP to be generated and stored (polling approach)
    let otpRecord: any = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait
    
    while (!otpRecord && attempts < maxAttempts) {
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
          break;
        }
      } catch (dbError) {
        logger.warn('Failed to query OTP from DynamoDB', {
          correlationId,
          email: request.email,
          attempt: attempts + 1,
          error: (dbError as any).message
        });
      }

      // Wait 1 second before next attempt
      await new Promise(resolve => setTimeout(resolve, 1000));
      attempts++;
    }

    // Check if OTP was found
    if (!otpRecord) {
      logger.warn('OTP not found after polling', {
        correlationId,
        email: request.email,
        attempts
      });
      return errorResponse(404, 'OTP_NOT_FOUND', 'OTP not found. Please ensure registration was completed.', correlationId);
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

      return errorResponse(401, 'OTP_EXPIRED', 'OTP has expired. Please register again.', correlationId);
    }

    logger.info('OTP found automatically', {
      correlationId,
      email: request.email,
      otpId: otpRecord.otpId
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
        logger.info('User authenticated automatically', {
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
      logger.info('OTP deleted after automatic verification', {
        correlationId,
        email: request.email
      });
    } catch (e) {
      logger.warn('Failed to delete OTP after verification', {
        correlationId,
        email: request.email
      });
    }

    logger.info('Automatic OTP verification completed successfully', {
      correlationId,
      email: request.email,
      userId
    });

    const response: AutoVerifyOTPResponse = {
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
    logger.error('Automatic OTP verification failed', {
      correlationId,
      error: error.message,
      name: error.name,
      stack: error.stack
    });

    return errorResponse(500, 'AUTO_VERIFICATION_FAILED', error.message || 'Failed to automatically verify OTP', correlationId);
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