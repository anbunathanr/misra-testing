/**
 * Get Profile Lambda Function
 * 
 * Retrieves the authenticated user's profile information
 * Requires valid JWT token in Authorization header
 * 
 * Request:
 * GET /auth/profile
 * Authorization: Bearer <jwt-token>
 * 
 * Response:
 * {
 *   "userId": "cognito-user-id",
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "emailVerified": true,
 *   "mfaEnabled": true,
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "lastModified": "2024-01-15T10:30:00Z"
 * }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as AWS from 'aws-sdk';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';
import { extractUserFromToken } from '../../utils/auth-util';

const logger = createLogger('GetProfile');
const cognito = new AWS.CognitoIdentityServiceProvider();

interface UserProfile {
  userId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  lastModified: string;
  attributes?: Record<string, string>;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  logger.info('Get profile request received', {
    correlationId,
    path: event.path,
    method: event.httpMethod
  });

  try {
    // Extract user from token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader) {
      return errorResponse(401, 'MISSING_AUTH_HEADER', 'Authorization header is required', correlationId);
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return errorResponse(401, 'INVALID_AUTH_HEADER', 'Invalid authorization header format', correlationId);
    }

    // Extract user info from token
    const userInfo = extractUserFromToken(token);
    if (!userInfo) {
      return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token', correlationId);
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    if (!userPoolId) {
      logger.error('COGNITO_USER_POOL_ID not configured', { correlationId });
      return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
    }

    logger.info('Fetching user profile', {
      correlationId,
      userId: userInfo.sub,
      email: userInfo.email
    });

    // Get user details from Cognito
    const getUserResponse = await cognito.adminGetUser({
      UserPoolId: userPoolId,
      Username: userInfo.email
    }).promise();

    if (!getUserResponse.Username) {
      logger.warn('User not found in Cognito', {
        correlationId,
        userId: userInfo.sub,
        email: userInfo.email
      });
      return errorResponse(404, 'USER_NOT_FOUND', 'User not found', correlationId);
    }

    // Extract user attributes
    const attributes: Record<string, string> = {};
    getUserResponse.UserAttributes?.forEach(attr => {
      attributes[attr.Name || ''] = attr.Value || '';
    });

    // Check MFA status
    const mfaOptions = getUserResponse.UserMFASettingList || [];
    const mfaEnabled = mfaOptions.length > 0;

    const profile: UserProfile = {
      userId: userInfo.sub,
      email: attributes['email'] || userInfo.email,
      name: attributes['name'] || attributes['given_name'] || 'Unknown',
      emailVerified: attributes['email_verified'] === 'true',
      mfaEnabled,
      createdAt: getUserResponse.UserCreateDate?.toISOString() || new Date().toISOString(),
      lastModified: getUserResponse.UserLastModifiedDate?.toISOString() || new Date().toISOString(),
      attributes
    };

    logger.info('User profile retrieved successfully', {
      correlationId,
      userId: profile.userId,
      email: profile.email,
      mfaEnabled: profile.mfaEnabled
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(profile)
    };

  } catch (error: any) {
    logger.error('Failed to get user profile', {
      correlationId,
      error: error.message,
      code: error.code,
      stack: error.stack
    });

    // Handle specific Cognito errors
    if (error.code === 'UserNotFoundException') {
      return errorResponse(404, 'USER_NOT_FOUND', 'User not found', correlationId);
    } else if (error.code === 'NotAuthorizedException') {
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized access', correlationId);
    } else if (error.code === 'InvalidParameterException') {
      return errorResponse(400, 'INVALID_PARAMETERS', error.message, correlationId);
    }

    return errorResponse(500, 'PROFILE_FETCH_FAILED', 'Failed to retrieve user profile', correlationId);
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
