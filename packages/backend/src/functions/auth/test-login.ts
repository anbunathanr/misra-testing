import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTService } from '../../services/auth/jwt-service';
import { UserService } from '../../services/user/user-service';

interface TestLoginRequest {
  email: string;
  password: string;
  testMode?: boolean;
}

interface TestLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: any;
  expiresIn: number;
  testOtp?: string; // Only in test mode
  testMode: boolean;
}

const jwtService = new JWTService();
const userService = new UserService();

// Generate a 6-digit OTP for testing
function generateTestOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Only allow test mode in development/staging
    const isTestModeAllowed = process.env.ENVIRONMENT === 'development' || 
                              process.env.ENVIRONMENT === 'staging' ||
                              process.env.TEST_MODE_ENABLED === 'true';

    if (!isTestModeAllowed) {
      return errorResponse(403, 'TEST_MODE_DISABLED', 'Test mode is not enabled in this environment');
    }

    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const loginRequest: TestLoginRequest = JSON.parse(event.body);

    if (!loginRequest.email || !loginRequest.password) {
      return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
    }

    // In test mode, accept any password for test accounts
    if (loginRequest.testMode) {
      // Get or create test user
      let user = await userService.getUserByEmail(loginRequest.email);

      if (!user) {
        user = await userService.createUser({
          email: loginRequest.email,
          organizationId: 'test-org',
          role: 'developer',
          preferences: {
            theme: 'light',
            notifications: { email: true, webhook: false },
            defaultMisraRuleSet: 'MISRA_C_2012',
          },
        });
      } else {
        await userService.updateLastLogin(user.userId);
      }

      // Generate platform JWT tokens
      const tokenPair = await jwtService.generateTokenPair({
        userId: user.userId,
        email: user.email,
        organizationId: user.organizationId,
        role: user.role,
      });

      const testOtp = generateTestOtp();

      // Store OTP in memory cache (in production, use Redis or DynamoDB)
      // For now, we'll return it directly in test mode
      console.log(`[TEST_MODE] Generated OTP for ${loginRequest.email}: ${testOtp}`);

      const response: TestLoginResponse = {
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        user,
        expiresIn: tokenPair.expiresIn,
        testOtp, // Return OTP for automated testing
        testMode: true,
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
    }

    // Regular login (non-test mode) - would use Cognito
    return errorResponse(400, 'INVALID_REQUEST', 'Use test-login endpoint with testMode: true');

  } catch (error) {
    console.error('Test login error:', error);
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
