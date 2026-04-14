import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EmailVerificationService } from '../../services/auth/email-verification-service';

const emailVerificationService = new EmailVerificationService();

interface ResendVerificationRequest {
  email: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const { email }: ResendVerificationRequest = JSON.parse(event.body);

    if (!email) {
      return errorResponse(400, 'INVALID_INPUT', 'Email is required');
    }

    const result = await emailVerificationService.resendVerificationCode(email);

    if (!result.success) {
      return errorResponse(400, 'RESEND_FAILED', result.message);
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
    console.error('Resend verification error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Failed to resend verification code');
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