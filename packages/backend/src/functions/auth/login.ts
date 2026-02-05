import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTService } from '../../services/auth/jwt-service';
import { UserService } from '../../services/user/user-service';
import { N8nService } from '../../services/auth/n8n-service';

// Local type definitions (avoiding shared package import issues)
interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: any;
  expiresIn: number;
}

const jwtService = new JWTService();
const userService = new UserService();
const n8nService = new N8nService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const loginRequest: LoginRequest = JSON.parse(event.body);

    // Validate input
    if (!loginRequest.email || !loginRequest.password) {
      return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
    }

    // Validate credentials with n8n
    const n8nUser = await n8nService.validateCredentials(
      loginRequest.email,
      loginRequest.password
    );

    if (!n8nUser) {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // Get or create user in our system
    let user = await userService.getUserByEmail(loginRequest.email);
    
    if (!user) {
      // Create new user from n8n data
      user = await userService.createUser({
        email: n8nUser.email,
        organizationId: n8nUser.organizationId,
        role: n8nUser.role || 'developer',
        preferences: {
          theme: 'light',
          notifications: {
            email: true,
            webhook: false,
          },
          defaultMisraRuleSet: 'MISRA_C_2012',
        },
      });
    } else {
      // Update last login time
      await userService.updateLastLogin(user.userId);
    }

    // Generate JWT tokens
    const tokenPair = await jwtService.generateTokenPair({
      userId: user.userId,
      email: user.email,
      organizationId: user.organizationId,
      role: user.role,
    });

    const response: LoginResponse = {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user,
      expiresIn: tokenPair.expiresIn,
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
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('n8n')) {
        return errorResponse(503, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication service temporarily unavailable');
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