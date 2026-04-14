import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UnifiedAuthService } from '../../services/auth/unified-auth-service';
import { corsHeaders } from '../../utils/cors';
import { validateEmail } from '../../utils/validation';
import { authErrorHandler } from '../../utils/auth-error-handler';

interface CompleteOTPSetupRequest {
  email: string;
  otpCode: string;
}

interface CompleteOTPSetupResponse {
  success: boolean;
  message: string;
  userSession: {
    userId: string;
    email: string;
    name: string;
    organizationId: string;
    role: string;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Complete OTP setup request:', JSON.stringify(event, null, 2));

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

    const request: CompleteOTPSetupRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email || !request.otpCode) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'MISSING_FIELDS',
            message: 'Email and OTP code are required'
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

    // Validate OTP code format (should be 6 digits)
    if (!/^\d{6}$/.test(request.otpCode.trim())) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'INVALID_OTP_FORMAT',
            message: 'OTP code must be 6 digits'
          }
        })
      };
    }

    // Initialize authentication service
    const authService = new UnifiedAuthService();

    // Complete OTP setup and establish session
    const result = await authService.completeOTPSetup(request.email, request.otpCode.trim());

    const response: CompleteOTPSetupResponse = {
      success: true,
      message: result.message,
      userSession: result.user,
      tokens: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn
      }
    };

    console.log('OTP setup completed successfully for user:', result.user.userId);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('OTP setup completion failed:', error);

    // Use the error handler to transform and log the error
    const authError = authErrorHandler.handleError(error, {
      operation: 'complete-otp-setup',
      email: request?.email,
      step: 'otp_setup'
    });

    // Return the transformed error response
    return authErrorHandler.toAPIResponse(authError);
  }
};