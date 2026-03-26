import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTService } from '../../services/auth/jwt-service';
import { UserService } from '../../services/user/user-service';

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
}

const jwtService = new JWTService();
const userService = new UserService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // ✅ Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const loginRequest: LoginRequest = JSON.parse(event.body);

    // ✅ Validate input
    if (!loginRequest.email || !loginRequest.password) {
      return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
    }

    // 🔥 TEMP AUTH (BYPASS N8N FOR DEMO)
    if (loginRequest.password !== "123456") {
      return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    // TEMP: Mock authentication (bypass n8n)
const n8nUser = {
  email: loginRequest.email,
  organizationId: "test-org",
  role: "developer" as const
};

    // ✅ Get or create user in DynamoDB
    let user = await userService.getUserByEmail(loginRequest.email);

    if (!user) {
      user = await userService.createUser({
        email: n8nUser.email,
        organizationId: n8nUser.organizationId,
        role: n8nUser.role,
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
      await userService.updateLastLogin(user.userId);
    }

    // ✅ Generate JWT tokens
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

    return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
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