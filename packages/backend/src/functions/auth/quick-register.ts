import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UnifiedAuthService } from '../../services/auth/unified-auth-service';

const unifiedAuthService = new UnifiedAuthService();

interface QuickRegisterRequest {
  email: string;
  name?: string;
}

interface QuickRegisterResponse {
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

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const { email, name }: QuickRegisterRequest = JSON.parse(event.body);

    if (!email) {
      return errorResponse(400, 'INVALID_EMAIL', 'Valid email address is required');
    }

    // Use unified authentication service with retry capability
    const authResult = await unifiedAuthService.quickRegister(
      email,
      name,
      {
        maxRetries: 2, // Allow 2 retries for registration attempts
        baseDelay: 1000, // 1 second base delay
        maxDelay: 3000   // Max 3 seconds delay
      }
    );

    const response: QuickRegisterResponse = {
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
    console.error('Quick register error:', error);
    
    // Parse error message for better user experience
    const errorMessage = error.message || 'Registration failed';
    
    if (errorMessage.includes('INVALID_EMAIL')) {
      return errorResponse(400, 'INVALID_EMAIL', 'Valid email address is required');
    } else if (errorMessage.includes('USER_CREATION_FAILED')) {
      return errorResponse(500, 'USER_CREATION_FAILED', 'Failed to create user account. Please try again.');
    } else if (errorMessage.includes('RETRY_EXHAUSTED')) {
      return errorResponse(503, 'SERVICE_TEMPORARILY_UNAVAILABLE', 'Registration service is temporarily unavailable. Please try again in a few moments.');
    } else if (errorMessage.includes('COGNITO_ERROR')) {
      return errorResponse(500, 'AUTH_SERVICE_ERROR', 'Authentication service error. Please try again.');
    } else {
      return errorResponse(500, 'REGISTRATION_ERROR', 'Failed to process registration. Please try again.');
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
        requestId: Math.random().toString(36).substring(7)
      }
    })
  };
}