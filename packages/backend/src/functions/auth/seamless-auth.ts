import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UnifiedAuthService } from '../../services/auth/unified-auth-service';

const unifiedAuthService = new UnifiedAuthService();

interface SeamlessAuthRequest {
  email: string;
  password?: string; // Optional - if not provided, uses quick registration
  name?: string;     // Optional - used for quick registration
}

interface SeamlessAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    name: string;
    organizationId: string;
    role: string;
  };
  expiresIn: number;
  isNewUser: boolean;
  message: string;
}

/**
 * Seamless authentication endpoint that handles both new registration and existing user login
 * - If password is provided: attempts standard login
 * - If no password: uses quick registration flow (creates user if doesn't exist)
 * - Includes retry capability for authentication failures
 * - Returns session tokens with 1-hour expiration
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const authRequest: SeamlessAuthRequest = JSON.parse(event.body);

    if (!authRequest.email) {
      return errorResponse(400, 'INVALID_EMAIL', 'Valid email address is required');
    }

    // Use unified authentication service with enhanced retry capability
    const authResult = await unifiedAuthService.authenticate(
      {
        email: authRequest.email,
        password: authRequest.password,
        name: authRequest.name
      },
      {
        maxRetries: 3, // Allow 3 retries for seamless auth
        baseDelay: 1000, // 1 second base delay
        maxDelay: 5000   // Max 5 seconds delay
      }
    );

    const response: SeamlessAuthResponse = {
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      user: authResult.user,
      expiresIn: authResult.expiresIn,
      isNewUser: authResult.isNewUser,
      message: authResult.message
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('Seamless auth error:', error);
    
    // Parse error message for better user experience with retry guidance
    const errorMessage = error.message || 'Authentication failed';
    
    if (errorMessage.includes('INVALID_EMAIL')) {
      return errorResponse(400, 'INVALID_EMAIL', 'Valid email address is required');
    } else if (errorMessage.includes('INVALID_CREDENTIALS')) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password. Please check your credentials and try again.');
    } else if (errorMessage.includes('USER_NOT_CONFIRMED')) {
      return errorResponse(401, 'USER_NOT_CONFIRMED', 'User is not confirmed. Please verify your email and try again.');
    } else if (errorMessage.includes('USER_CREATION_FAILED')) {
      return errorResponse(500, 'USER_CREATION_FAILED', 'Failed to create user account. Please try again in a few moments.');
    } else if (errorMessage.includes('RETRY_EXHAUSTED')) {
      return errorResponse(503, 'SERVICE_TEMPORARILY_UNAVAILABLE', 'Authentication service is temporarily unavailable. Please wait a moment and try again.');
    } else if (errorMessage.includes('CONFIG_ERROR')) {
      return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error. Please contact support if this persists.');
    } else if (errorMessage.includes('COGNITO_ERROR')) {
      return errorResponse(500, 'AUTH_SERVICE_ERROR', 'Authentication service error. Please try again in a few moments.');
    } else {
      return errorResponse(500, 'AUTHENTICATION_ERROR', 'Authentication failed. Please try again.');
    }
  }
};

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
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
        retryable: statusCode >= 500 || code === 'SERVICE_TEMPORARILY_UNAVAILABLE'
      }
    })
  };
}