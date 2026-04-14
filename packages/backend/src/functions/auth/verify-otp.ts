import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EmailVerificationService } from '../../services/auth/email-verification-service';

const emailVerificationService = new EmailVerificationService();

interface VerifyOTPRequest {
  email: string;
  otpCode: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const { email, otpCode }: VerifyOTPRequest = JSON.parse(event.body);

    if (!email || !otpCode) {
      return errorResponse(400, 'INVALID_INPUT', 'Email and OTP code are required');
    }

    const result = await emailVerificationService.verifyOTP(email, otpCode);

    if (!result.success) {
      return errorResponse(400, 'OTP_VERIFICATION_FAILED', result.message);
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify({
        success: true,
        message: result.message
      })
    };

  } catch (error: any) {
    console.error('OTP verification error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'OTP verification failed');
  }
};

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
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
        requestId: Math.random().toString(36).substring(7)
      }
    })
  };
}