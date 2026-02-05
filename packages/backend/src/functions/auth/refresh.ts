import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTService } from '../../services/auth/jwt-service';
import { UserService } from '../../services/user/user-service';

// Local type definitions (avoiding shared package import issues)
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

const jwtService = new JWTService();
const userService = new UserService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const refreshRequest: RefreshRequest = JSON.parse(event.body);

    // Validate input
    if (!refreshRequest.refreshToken) {
      return errorResponse(400, 'INVALID_INPUT', 'Refresh token is required');
    }

    // Verify refresh token
    const tokenData = await jwtService.verifyRefreshToken(refreshRequest.refreshToken);

    // Get user data
    const user = await userService.getUserById(tokenData.userId);
    
    if (!user) {
      return errorResponse(401, 'USER_NOT_FOUND', 'User not found');
    }

    // Generate new access token
    const newTokens = await jwtService.refreshAccessToken(
      refreshRequest.refreshToken,
      {
        userId: user.userId,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      }
    );

    const response: RefreshResponse = {
      accessToken: newTokens.accessToken,
      expiresIn: newTokens.expiresIn,
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return errorResponse(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token expired');
      } else if (error.message.includes('Invalid')) {
        return errorResponse(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
      }
    }
    
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
  }
};

function errorResponse(
  statusCode: number,
  code: string,
  message: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
      },
    }),
  };
}