import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UserService } from '../../services/user/user-service';

// Local type definitions
interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface RegisterResponse {
  message: string;
}

const userService = new UserService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const registerRequest: RegisterRequest = JSON.parse(event.body);

    // Validate input
    if (!registerRequest.email || !registerRequest.password || !registerRequest.name) {
      return errorResponse(400, 'INVALID_INPUT', 'Email, password, and name are required');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registerRequest.email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please enter a valid email address');
    }

    // Validate password strength
    if (registerRequest.password.length < 8) {
      return errorResponse(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(registerRequest.email);
    
    if (existingUser) {
      return errorResponse(409, 'USER_EXISTS', 'An account with this email already exists');
    }

    // Create new user in our system (internal auth - no n8n dependency)
    const user = await userService.createUser({
      email: registerRequest.email,
      organizationId: 'default-org',
      role: 'developer',
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          webhook: false,
        },
        defaultMisraRuleSet: 'MISRA_C_2012',
      },
    });

    const response: RegisterResponse = {
      message: 'User registered successfully. Please verify your email.',
    };

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Register error:', error);
    
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
