import { APIGatewayProxyHandler } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';

const cognito = new CognitoIdentityServiceProvider();

interface TestLoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    name: string;
  };
  expiresIn: number;
  testOtp: string;
  testMode: boolean;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    // Only allow in development/staging
    const environment = process.env.ENVIRONMENT || 'production';
    const testModeEnabled = process.env.TEST_MODE_ENABLED === 'true';

    if (!testModeEnabled || environment === 'production') {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Test mode not enabled' }),
      };
    }

    const userPoolId = process.env.COGNITO_USER_POOL_ID!;
    const clientId = process.env.COGNITO_CLIENT_ID!;

    // Generate test credentials
    const testEmail = 'test-misra@example.com';
    const testPassword = 'TestPassword123!';
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const userId = uuidv4();

    // Create or update test user
    try {
      await cognito.adminCreateUser({
        UserPoolId: userPoolId,
        Username: testEmail,
        TemporaryPassword: testPassword,
        MessageAction: 'SUPPRESS',
        UserAttributes: [
          { Name: 'email', Value: testEmail },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'custom:user_id', Value: userId },
          { Name: 'name', Value: 'Test User' },
        ],
      }).promise();
    } catch (err: any) {
      // User might already exist, that's fine
      if (err.code !== 'UsernameExistsException') {
        throw err;
      }
    }

    // Set permanent password
    await cognito.adminSetUserPassword({
      UserPoolId: userPoolId,
      Username: testEmail,
      Password: testPassword,
      Permanent: true,
    }).promise();

    // Initiate auth
    const authResponse = await cognito.adminInitiateAuth({
      UserPoolId: userPoolId,
      ClientId: clientId,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: testEmail,
        PASSWORD: testPassword,
      },
    }).promise();

    // Store OTP in DynamoDB for verification (optional, for real OTP flow)
    // For now, we'll just return it directly in test mode

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        accessToken: authResponse.AuthenticationResult?.AccessToken,
        refreshToken: authResponse.AuthenticationResult?.RefreshToken,
        user: {
          userId,
          email: testEmail,
          name: 'Test User',
        },
        expiresIn: authResponse.AuthenticationResult?.ExpiresIn || 3600,
        testOtp, // OTP returned directly in test mode
        testMode: true,
      } as TestLoginResponse),
    };
  } catch (error) {
    console.error('[TEST-LOGIN] Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
