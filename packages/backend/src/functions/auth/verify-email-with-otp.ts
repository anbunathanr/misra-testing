import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { UnifiedAuthService } from '../../services/auth/unified-auth-service';
import { corsHeaders } from '../../utils/cors';
import { validateEmail } from '../../utils/validation';
import { authErrorHandler } from '../../utils/auth-error-handler';

interface VerifyEmailWithOTPRequest {
  email: string;
  confirmationCode: string;
}

interface VerifyEmailWithOTPResponse {
  success: boolean;
  message: string;
  otpSetup: {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    issuer: string;
    accountName: string;
  };
  nextStep: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Verify email with OTP request:', JSON.stringify(event, null, 2));

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

    const request: VerifyEmailWithOTPRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.email || !request.confirmationCode) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'MISSING_FIELDS',
            message: 'Email and confirmation code are required'
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

    // Validate confirmation code format (should be 6 digits)
    if (!/^\d{6}$/.test(request.confirmationCode.trim())) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: {
            code: 'INVALID_CODE_FORMAT',
            message: 'Confirmation code must be 6 digits'
          }
        })
      };
    }

    // Initialize authentication service
    const authService = new UnifiedAuthService();

    // Handle email verification with OTP setup
    const result = await authService.handleEmailVerificationComplete(
      request.email, 
      request.confirmationCode.trim()
    );

    const response: VerifyEmailWithOTPResponse = {
      success: true,
      message: result.message,
      otpSetup: result.otpSetup,
      nextStep: result.nextStep
    };

    console.log('Email verification with OTP setup completed successfully');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('Email verification with OTP setup failed:', error);

    // Use the error handler to transform and log the error
    const authError = authErrorHandler.handleError(error, {
      operation: 'verify-email-with-otp',
      email: request?.email,
      step: 'email_verification'
    });

    // Return the transformed error response
    return authErrorHandler.toAPIResponse(authError);
  }
};