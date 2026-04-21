import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  CognitoIdentityProviderClient,
  AssociateSoftwareTokenCommand,
  VerifySoftwareTokenCommand,
  RespondToAuthChallengeCommand,
  InitiateAuthCommand,
  AdminInitiateAuthCommand,
  AdminSetUserMFAPreferenceCommand,
  ChallengeNameType,
  AuthFlowType
} from '@aws-sdk/client-cognito-identity-provider';
import * as speakeasy from 'speakeasy';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('VerifyOTPCognito');
const cognitoClient = new CognitoIdentityProviderClient({ 
  region: process.env.AWS_REGION || 'us-east-1' 
});

interface VerifyOTPRequest {
  email: string;
  session?: string; // Cognito session from previous auth step
  challengeName?: string; // Type of MFA challenge
  automaticVerification?: boolean; // Flag for autonomous workflow
}

interface VerifyOTPResponse {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  session?: string;
  challengeName?: string;
  message: string;
  nextStep?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || 'unknown';
  
  logger.info('OTP verification request received', {
    correlationId,
    path: event.path,
    method: event.httpMethod
  });

  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const request: VerifyOTPRequest = JSON.parse(event.body);

    if (!request.email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required');
    }

    // For autonomous workflow, handle automatic TOTP verification
    if (request.automaticVerification) {
      return await handleAutomaticTOTPVerification(request, correlationId);
    }

    // For manual workflow, handle standard MFA challenge
    return await handleManualTOTPVerification(request, correlationId);

  } catch (error: any) {
    logger.error('OTP verification failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });

    return errorResponse(500, 'VERIFICATION_ERROR', 'OTP verification failed');
  }
};

/**
 * Handle automatic TOTP verification for autonomous workflow
 * This sets up TOTP MFA and automatically generates/verifies codes
 */
async function handleAutomaticTOTPVerification(
  request: VerifyOTPRequest, 
  correlationId: string
): Promise<APIGatewayProxyResult> {
  
  logger.info('Starting automatic TOTP verification', {
    correlationId,
    email: request.email
  });

  try {
    // Step 1: Initiate auth to get session
    const authResult = await cognitoClient.send(new AdminInitiateAuthCommand({
      UserPoolId: process.env.COGNITO_USER_POOL_ID!,
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthFlow: AuthFlowType.ADMIN_NO_SRP_AUTH,
      AuthParameters: {
        USERNAME: request.email,
        PASSWORD: await generateTemporaryPassword(request.email), // Use stored temp password
      },
    }));

    // Step 2: Handle MFA_SETUP challenge if user needs TOTP setup
    if (authResult.ChallengeName === ChallengeNameType.MFA_SETUP) {
      logger.info('MFA setup required, associating software token', {
        correlationId,
        email: request.email
      });

      // Associate software token (get TOTP secret)
      const associateResult = await cognitoClient.send(new AssociateSoftwareTokenCommand({
        Session: authResult.Session,
      }));

      if (!associateResult.SecretCode) {
        throw new Error('Failed to get TOTP secret from Cognito');
      }

      // Generate TOTP code using the secret
      const totpCode = speakeasy.totp({
        secret: associateResult.SecretCode,
        encoding: 'base32',
        time: Math.floor(Date.now() / 1000),
        window: 2, // Allow some time drift
      });

      logger.info('Generated TOTP code for verification', {
        correlationId,
        email: request.email,
        codeLength: totpCode.length
      });

      // Verify the software token
      const verifyResult = await cognitoClient.send(new VerifySoftwareTokenCommand({
        Session: authResult.Session,
        UserCode: totpCode,
      }));

      if (verifyResult.Status !== 'SUCCESS') {
        throw new Error(`TOTP verification failed: ${verifyResult.Status}`);
      }

      // Enable TOTP MFA for the user
      await cognitoClient.send(new AdminSetUserMFAPreferenceCommand({
        UserPoolId: process.env.COGNITO_USER_POOL_ID!,
        Username: request.email,
        SoftwareTokenMfaSettings: {
          Enabled: true,
          PreferredMfa: true,
        },
      }));

      logger.info('TOTP MFA enabled successfully', {
        correlationId,
        email: request.email
      });

      // Continue with authentication using the new session
      const finalAuthResult = await cognitoClient.send(new RespondToAuthChallengeCommand({
        ClientId: process.env.COGNITO_CLIENT_ID!,
        ChallengeName: ChallengeNameType.MFA_SETUP,
        Session: verifyResult.Session,
        ChallengeResponses: {
          USERNAME: request.email,
        },
      }));

      return successResponse({
        success: true,
        accessToken: finalAuthResult.AuthenticationResult?.AccessToken,
        idToken: finalAuthResult.AuthenticationResult?.IdToken,
        refreshToken: finalAuthResult.AuthenticationResult?.RefreshToken,
        message: 'TOTP MFA setup completed successfully',
        nextStep: 'authenticated'
      });
    }

    // Step 3: Handle SOFTWARE_TOKEN_MFA challenge for existing TOTP users
    if (authResult.ChallengeName === ChallengeNameType.SOFTWARE_TOKEN_MFA) {
      logger.info('SOFTWARE_TOKEN_MFA challenge received', {
        correlationId,
        email: request.email
      });

      // Get user's TOTP secret (this would be stored securely in Cognito)
      // For autonomous workflow, we need to generate the TOTP code server-side
      const totpCode = await generateTOTPCodeForUser(request.email, correlationId);

      // Respond to the MFA challenge
      const challengeResult = await cognitoClient.send(new RespondToAuthChallengeCommand({
        ClientId: process.env.COGNITO_CLIENT_ID!,
        ChallengeName: ChallengeNameType.SOFTWARE_TOKEN_MFA,
        Session: authResult.Session,
        ChallengeResponses: {
          USERNAME: request.email,
          SOFTWARE_TOKEN_MFA_CODE: totpCode,
        },
      }));

      return successResponse({
        success: true,
        accessToken: challengeResult.AuthenticationResult?.AccessToken,
        idToken: challengeResult.AuthenticationResult?.IdToken,
        refreshToken: challengeResult.AuthenticationResult?.RefreshToken,
        message: 'TOTP MFA verification completed successfully',
        nextStep: 'authenticated'
      });
    }

    // If no MFA challenge, user might already be authenticated
    if (authResult.AuthenticationResult) {
      return successResponse({
        success: true,
        accessToken: authResult.AuthenticationResult.AccessToken,
        idToken: authResult.AuthenticationResult.IdToken,
        refreshToken: authResult.AuthenticationResult.RefreshToken,
        message: 'Authentication completed (no MFA required)',
        nextStep: 'authenticated'
      });
    }

    throw new Error(`Unexpected auth state: ${authResult.ChallengeName || 'unknown'}`);

  } catch (error: any) {
    logger.error('Automatic TOTP verification failed', {
      correlationId,
      email: request.email,
      error: error.message
    });

    return errorResponse(400, 'AUTO_TOTP_FAILED', error.message);
  }
}

/**
 * Handle manual TOTP verification (for standard user workflow)
 */
async function handleManualTOTPVerification(
  request: VerifyOTPRequest, 
  correlationId: string
): Promise<APIGatewayProxyResult> {
  
  // This would handle manual OTP entry by users
  // Implementation depends on the specific manual workflow requirements
  
  return errorResponse(501, 'NOT_IMPLEMENTED', 'Manual TOTP verification not yet implemented');
}

/**
 * Generate TOTP code for a user (server-side generation for autonomous workflow)
 * In production, this would retrieve the user's TOTP secret securely
 */
async function generateTOTPCodeForUser(email: string, correlationId: string): Promise<string> {
  // NOTE: This is a simplified implementation
  // In production, you would:
  // 1. Retrieve the user's TOTP secret from secure storage (Cognito stores this internally)
  // 2. Use the secret to generate the current TOTP code
  // 3. Handle time synchronization and window tolerance
  
  logger.info('Generating TOTP code for user', {
    correlationId,
    email
  });

  // For now, we'll use a placeholder implementation
  // The actual secret would be retrieved from Cognito's internal storage
  const secret = await getStoredTOTPSecret(email);
  
  const totpCode = speakeasy.totp({
    secret: secret,
    encoding: 'base32',
    time: Math.floor(Date.now() / 1000),
    window: 2,
  });

  logger.info('TOTP code generated successfully', {
    correlationId,
    email,
    codeLength: totpCode.length
  });

  return totpCode;
}

/**
 * Retrieve stored TOTP secret for a user
 * This is a placeholder - in production, Cognito manages TOTP secrets internally
 */
async function getStoredTOTPSecret(email: string): Promise<string> {
  // In the actual implementation, this would:
  // 1. Query Cognito to get the user's MFA settings
  // 2. Extract the TOTP secret (if accessible)
  // 3. Return the secret for code generation
  
  // For now, return a placeholder secret
  // This needs to be replaced with actual Cognito integration
  return 'PLACEHOLDER_SECRET_FROM_COGNITO';
}

/**
 * Generate temporary password for user (used in autonomous workflow)
 */
async function generateTemporaryPassword(email: string): Promise<string> {
  // This would retrieve or generate a temporary password for the user
  // In the autonomous workflow, users are created with known temporary passwords
  return 'TempPass123!'; // Placeholder - should be retrieved from secure storage
}

function successResponse(data: VerifyOTPResponse): APIGatewayProxyResult {
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify(data)
  };
}

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
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