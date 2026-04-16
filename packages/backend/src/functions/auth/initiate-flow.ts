import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UnifiedAuthService } from '../../services/auth/unified-auth-service';
import { corsHeaders } from '../../utils/cors';
import { validateEmail } from '../../utils/validation';
import { authErrorHandler } from '../../utils/auth-error-handler';

interface InitiateFlowRequest {
  email: string;
  name?: string;
}

interface InitiateFlowResponse {
  state: string;
  requiresEmailVerification: boolean;
  requiresOTPSetup: boolean;
  message: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Initiate authentication flow request:', JSON.stringify(event, null, 2));

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

    // Initialize authentication service
    const authService = new UnifiedAuthService();

    // Initiate authentication flow
    const result = await authService.initiateAuthenticationFlow(request.email, request.name);

    const response: InitiateFlowResponse = {
      state: result.state,
      requiresEmailVerification: result.requiresEmailVerification,
      requiresOTPSetup: result.requiresOTPSetup,
      message: result.message
    };

    console.log('Authentication flow initiated successfully:', response);

    const httpResponse = {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

    console.log('Returning HTTP response:', JSON.stringify(httpResponse));

    return httpResponse;

  } catch (error: any) {
    console.error('Authentication flow initiation failed:', error);

    // Use the error handler to transform and log the error
    const authError = authErrorHandler.handleError(error, {
      operation: 'initiate-flow',
      email: event.body ? JSON.parse(event.body).email : undefined,
      step: 'flow_initiation'
    });

    // Return the transformed error response
    return authErrorHandler.toAPIResponse(authError);
  }
};