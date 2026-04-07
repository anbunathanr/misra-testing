import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
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
const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });

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

    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      return errorResponse(500, 'CONFIG_ERROR', 'Cognito client not configured');
    }

    // Authenticate against Cognito
    let cognitoSub: string;
    try {
      const authResult = await cognitoClient.send(new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: loginRequest.email,
          PASSWORD: loginRequest.password,
        },
      }));

      if (!authResult.AuthenticationResult?.IdToken) {
        return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }

      // Decode Cognito ID token to get sub
      const parts = authResult.AuthenticationResult.IdToken.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      cognitoSub = payload.sub;
    } catch (cognitoError: any) {
      console.error('Cognito auth error:', cognitoError.name, cognitoError.message);
      if (
        cognitoError.name === 'NotAuthorizedException' ||
        cognitoError.name === 'UserNotFoundException'
      ) {
        return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
      }
      if (cognitoError.name === 'UserNotConfirmedException') {
        return errorResponse(401, 'USER_NOT_CONFIRMED', 'User is not confirmed. Please verify your email.');
      }
      return errorResponse(500, 'AUTH_ERROR', 'Authentication service error');
    }

    // Get or create user in DynamoDB
    let user = await userService.getUserByEmail(loginRequest.email);

    if (!user) {
      user = await userService.createUser({
        email: loginRequest.email,
        organizationId: cognitoSub, // use Cognito sub as org ID for new users
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