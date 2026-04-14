import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EmailVerificationService } from '../../services/auth/email-verification-service';

const emailVerificationService = new EmailVerificationService();

interface VerifyEmailRequest {
  email: string;
  confirmationCode: string;
}

interface VerifyEmailResponse {
  success: boolean;
  message: string;
  otpSetup?: {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  };
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const { email, confirmationCode }: VerifyEmailRequest = JSON.parse(event.body);

    if (!email || !confirmationCode) {
      return errorResponse(400, 'INVALID_INPUT', 'Email and confirmation code are required');
    }

    // Verify email and automatically set up OTP
    const result = await emailVerificationService.verifyEmail(email, confirmationCode);

    if (!result.success) {
      return errorResponse(400, 'VERIFICATION_FAILED', result.message);
    }

    const response: VerifyEmailResponse = {
      success: true,
      message: result.message,
      otpSetup: result.requiresOTP ? {
        secret: result.otpSecret!,
        qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(`otpauth://totp/MISRA Platform:${email}?secret=${result.otpSecret}&issuer=MISRA Platform`)}`,
        backupCodes: result.backupCodes!
      } : undefined
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('Email verification error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Email verification failed');
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