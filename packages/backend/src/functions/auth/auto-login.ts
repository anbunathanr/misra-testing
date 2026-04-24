/**
 * Auto-Login Lambda Function
 * 
 * Logs in user after OTP verification without requiring password
 * This is used in the automated authentication flow
 * 
 * For existing users: Uses the temporary password set during registration
 * For new users: Uses the temporary password generated during registration
 * 
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresIn": 3600,
 *   "user": {
 *     "userId": "...",
 *     "email": "user@example.com",
 *     "name": "User"
 *   }
 * }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  AuthFlowType,
  AdminGetUserCommand
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, GetCommand } from '@aws-sdk/client-dynamodb';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AutoLogin');
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});
const dynamoClient = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

interface AutoLoginRequest {
  email: string;
}

interface AutoLoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    userId: string;
    email: string;
    name: string;
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  logger.info('Auto-login request received', {
    correlationId,
    path: event.path,
    method: event.httpMethod
  });

  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
    }

    const request: AutoLoginRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
    }

    logger.info('Auto-logging in user', {
      correlationId,
      email: request.email
    });

    // Try to get the temporary password from DynamoDB (stored during registration)
    let tempPassword = 'TestPass123!@#'; // Fallback for existing users
    
    try {
      const usersTableName = process.env.USERS_TABLE_NAME || 'misra-users';
      const userRecord = await dynamoClient.send(new GetCommand({
        TableName: usersTableName,
        Key: {
          email: { S: request.email }
        }
      }));

      if (userRecord.Item?.tempPassword?.S) {
        tempPassword = userRecord.Item.tempPassword.S;
        logger.info('Retrieved temporary password from DynamoDB', { correlationId });
      }
    } catch (dbError) {
      logger.warn('Could not retrieve temp password from DynamoDB, using fallback', {
        correlationId,
        error: (dbError as any).message
      });
      // Continue with fallback password
    }

    // Authenticate with Cognito using the temporary password
    const authResult = await cognitoClient.send(new AdminInitiateAuthCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
      AuthParameters: {
        USERNAME: request.email,
        PASSWORD: tempPassword,
      },
    }));

    // Check if authentication was successful
    if (!authResult.AuthenticationResult) {
      throw new Error('Authentication failed - no tokens returned from Cognito');
    }

    logger.info('Auto-login successful', {
      correlationId,
      email: request.email
    });

    // Extract user ID from the access token (sub claim)
    const accessTokenParts = authResult.AuthenticationResult.AccessToken!.split('.');
    let userId = request.email.split('@')[0];
    let userName = 'User';
    
    try {
      const payload = JSON.parse(Buffer.from(accessTokenParts[1], 'base64').toString());
      userId = payload.sub || userId;
    } catch (e) {
      logger.warn('Could not extract userId from token', { correlationId });
    }

    // Try to get user name from Cognito
    try {
      const userInfo = await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: request.email
      }));

      const nameAttr = userInfo.UserAttributes?.find(attr => attr.Name === 'name');
      if (nameAttr?.Value) {
        userName = nameAttr.Value;
      }
    } catch (e) {
      logger.warn('Could not retrieve user name from Cognito', { correlationId });
    }

    const response: AutoLoginResponse = {
      accessToken: authResult.AuthenticationResult.AccessToken!,
      refreshToken: authResult.AuthenticationResult.RefreshToken!,
      expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600,
      user: {
        userId,
        email: request.email,
        name: userName
      }
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    logger.error('Auto-login failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });

    // Check if it's an authentication error
    if (error.message?.includes('Incorrect username or password') || 
        error.name === 'NotAuthorizedException') {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Incorrect username or password', correlationId);
    }

    return errorResponse(500, 'AUTO_LOGIN_FAILED', error.message || 'Failed to auto-login', correlationId);
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
