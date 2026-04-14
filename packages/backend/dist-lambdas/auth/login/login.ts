import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UnifiedAuthService } from '../../services/auth/unified-auth-service';

// Local type definitions
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: any;
  expiresIn: number;
  message: string;
}

const unifiedAuthService = new UnifiedAuthService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const loginRequest: LoginRequest = JSON.parse(event.body);

    if (!loginRequest.email || !loginRequest.password) {
      return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
    }

    // Use unified authentication service with retry capability
    const authResult = await unifiedAuthService.login(
      loginRequest.email, 
      loginRequest.password,
      {
        maxRetries: 2, // Allow 2 retries for login attempts
        baseDelay: 1000, // 1 second base delay
        maxDelay: 3000   // Max 3 seconds delay
      }
    );

    const response: LoginResponse = {
      accessToken: authResult.accessToken,
      refreshToken: authResult.refreshToken,
      user: authResult.user,
      expiresIn: authResult.expiresIn,
      message: authResult.message
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

  } catch (error: any) {
    console.error('Login error:', error);
    
    // Parse error message for better user experience
    const errorMessage = error.message || 'Internal server error';
    
    if (errorMessage.includes('INVALID_CREDENTIALS')) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    } else if (errorMessage.includes('USER_NOT_CONFIRMED')) {
      return errorResponse(401, 'USER_NOT_CONFIRMED', 'User is not confirmed. Please verify your email.');
    } else if (errorMessage.includes('RETRY_EXHAUSTED')) {
      return errorResponse(503, 'SERVICE_TEMPORARILY_UNAVAILABLE', 'Authentication service is temporarily unavailable. Please try again in a few moments.');
    } else if (errorMessage.includes('CONFIG_ERROR')) {
      return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error');
    } else {
      return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
    }
  }
};

// ✅ Standard error response
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