import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoTOTPService, AuthenticationResult } from '../../services/auth/cognito-totp-service';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('AutonomousLogin');

interface AutonomousLoginRequest {
  email: string;
  password: string; // Temporary password from initiate-flow
}

interface AutonomousLoginResponse {
  success: boolean;
  accessToken?: string;
  idToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user?: {
    userId: string;
    email: string;
    name: string;
  };
  message: string;
  nextStep?: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  logger.info('Autonomous login request received', {
    correlationId,
    path: event.path,
    method: event.httpMethod
  });

  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const request: AutonomousLoginRequest = JSON.parse(event.body);

    if (!request.email || !request.password) {
      return errorResponse(400, 'MISSING_CREDENTIALS', 'Email and password are required');
    }

    logger.info('Starting autonomous login with auto MFA', {
      correlationId,
      email: request.email
    });

    // Initialize Cognito TOTP service
    const cognitoTOTPService = new CognitoTOTPService();

    // Authenticate with automatic MFA handling
    const authResult = await cognitoTOTPService.authenticateWithAutoMFA(
      request.email,
      request.password
    );

    // Check if we got a complete authentication result
    if ('accessToken' in authResult) {
      // Authentication completed successfully
      const authResponse = authResult as AuthenticationResult;
      
      logger.info('Autonomous login completed successfully', {
        correlationId,
        email: request.email,
        expiresIn: authResponse.expiresIn
      });

      const response: AutonomousLoginResponse = {
        success: true,
        accessToken: authResponse.accessToken,
        idToken: authResponse.idToken,
        refreshToken: authResponse.refreshToken,
        expiresIn: authResponse.expiresIn,
        user: {
          userId: extractUserIdFromToken(authResponse.idToken),
          email: request.email,
          name: extractNameFromToken(authResponse.idToken) || request.email.split('@')[0]
        },
        message: 'Authentication completed successfully with automatic MFA setup',
        nextStep: 'authenticated'
      };

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(response)
      };
    } else {
      // Got an MFA challenge (shouldn't happen in autonomous flow, but handle gracefully)
      logger.warn('Received MFA challenge in autonomous flow', {
        correlationId,
        email: request.email,
        challengeName: authResult.challengeName
      });

      return errorResponse(
        500, 
        'AUTONOMOUS_MFA_FAILED', 
        'Autonomous MFA setup failed - received unexpected challenge'
      );
    }

  } catch (error: any) {
    logger.error('Autonomous login failed', {
      correlationId,
      error: error.message,
      stack: error.stack
    });

    // Parse error message to provide better user feedback
    let errorCode = 'LOGIN_FAILED';
    let errorMessage = 'Authentication failed';

    if (error.message.includes('USER_CREATION_FAILED')) {
      errorCode = 'USER_CREATION_FAILED';
      errorMessage = 'Failed to create user account';
    } else if (error.message.includes('AUTH_FAILED')) {
      errorCode = 'AUTH_FAILED';
      errorMessage = 'Authentication failed - please check credentials';
    } else if (error.message.includes('TOTP_SETUP_FAILED')) {
      errorCode = 'TOTP_SETUP_FAILED';
      errorMessage = 'Failed to set up two-factor authentication';
    } else if (error.message.includes('MFA_CHALLENGE_FAILED')) {
      errorCode = 'MFA_CHALLENGE_FAILED';
      errorMessage = 'Two-factor authentication verification failed';
    }

    return errorResponse(500, errorCode, errorMessage);
  }
};

/**
 * Extract user ID from JWT token (simplified implementation)
 */
function extractUserIdFromToken(idToken: string): string {
  try {
    // In a real implementation, you would properly decode and verify the JWT
    // For now, we'll use a placeholder approach
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return payload.sub || payload['cognito:username'] || 'unknown';
  } catch (error) {
    logger.warn('Failed to extract user ID from token', { error });
    return 'unknown';
  }
}

/**
 * Extract name from JWT token (simplified implementation)
 */
function extractNameFromToken(idToken: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    return payload.given_name || payload.name || null;
  } catch (error) {
    logger.warn('Failed to extract name from token', { error });
    return null;
  }
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