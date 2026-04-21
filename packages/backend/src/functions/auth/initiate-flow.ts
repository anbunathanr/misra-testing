import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoTOTPService } from '../../services/auth/cognito-totp-service';
import { corsHeaders } from '../../utils/cors';
import { validateEmail } from '../../utils/validation';
import { createLogger } from '../../utils/logger';

const logger = createLogger('InitiateFlow');

interface InitiateFlowRequest {
  email: string;
  name?: string;
}

interface InitiateFlowResponse {
  state: string;
  requiresRegistration: boolean;
  requiresMFASetup: boolean;
  message: string;
  tempPassword?: string; // For autonomous workflow
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  logger.info('Initiate authentication flow request:', {
    correlationId,
    path: event.path,
    method: event.httpMethod
  });

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'MISSING_BODY',
            message: 'Request body is required'
          }
        })
      };
    }

    const request: InitiateFlowRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'MISSING_EMAIL',
            message: 'Email is required'
          }
        })
      };
    }

    // Validate email format
    if (!validateEmail(request.email)) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'INVALID_EMAIL',
            message: 'Please provide a valid email address'
          }
        })
      };
    }

    // Initialize Cognito TOTP service
    const cognitoTOTPService = new CognitoTOTPService();

    // Check if user exists
    const userExists = await cognitoTOTPService.userExists(request.email);

    let response: InitiateFlowResponse;

    if (!userExists) {
      // Create new user with MFA enabled for autonomous workflow
      logger.info('Creating new user with MFA enabled', {
        correlationId,
        email: request.email
      });

      const createResult = await cognitoTOTPService.createUserWithMFA(
        request.email, 
        request.name
      );

      response = {
        state: 'user_created',
        requiresRegistration: false, // Already created
        requiresMFASetup: true, // Will need MFA setup
        message: 'User created successfully. MFA setup required.',
        tempPassword: createResult.tempPassword
      };
    } else {
      // User exists, they can proceed to login
      logger.info('User exists, ready for authentication', {
        correlationId,
        email: request.email
      });

      response = {
        state: 'user_exists',
        requiresRegistration: false,
        requiresMFASetup: false, // Will be determined during auth
        message: 'User exists. Ready for authentication.'
      };
    }

    logger.info('Authentication flow initiated successfully:', {
      correlationId,
      email: request.email,
      state: response.state
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    logger.error('Authentication flow initiation failed:', error, {
      correlationId,
    });

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: {
          code: 'FLOW_INITIATION_FAILED',
          message: error.message || 'Failed to initiate authentication flow',
          timestamp: new Date().toISOString(),
          requestId: correlationId
        }
      })
    };
  }
};