/**
 * Auto-Login Lambda Function
 * 
 * Logs in user after OTP verification without requiring password
 * This is used in the automated authentication flow
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
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AutoLogin');
const cognitoClient = new CognitoIdentityProviderClient({ 
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

    // Authenticate with Cognito using the fixed test password
    // This password was used during registration and OTP verification
    const tempPassword = 'TestPass123!@#';

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
    
    try {
      const payload = JSON.parse(Buffer.from(accessTokenParts[1], 'base64').toString());
      userId = payload.sub || userId;
    } catch (e) {
      logger.warn('Could not extract userId from token', { correlationId });
    }

    const response: AutoLoginResponse = {
      accessToken: authResult.AuthenticationResult.AccessToken!,
      refreshToken: authResult.AuthenticationResult.RefreshToken!,
      expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600,
      user: {
        userId,
        email: request.email,
        name: 'User'
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
