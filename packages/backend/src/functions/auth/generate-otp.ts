/**
 * Generate OTP Lambda Function
 * 
 * Generates and sends a new OTP to the user's email
 * Used for passwordless authentication flow
 * 
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP sent to your email",
 *   "email": "user@example.com",
 *   "expiresIn": 600
 * }
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { validateEmail } from '../../utils/validation';
import { corsHeaders } from '../../utils/cors';
import { createLogger } from '../../utils/logger';

const logger = createLogger('GenerateOTP');
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

interface GenerateOTPRequest {
  email: string;
}

interface GenerateOTPResponse {
  success: boolean;
  message: string;
  email: string;
  expiresIn: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
  
  try {
    logger.info('Generate OTP request received', {
      correlationId,
      path: event.path,
      method: event.httpMethod
    });

    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
    }

    const request: GenerateOTPRequest = JSON.parse(event.body);

    // Validate email
    if (!request.email) {
      return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
    }

    if (!validateEmail(request.email)) {
      return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
    }

    logger.info('Generating OTP for email', {
      correlationId,
      email: request.email
    });

    // Generate OTP
    const otp = generateOTP();
    const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';
    const expiresIn = 10 * 60; // 10 minutes
    const otpExpirationTime = Math.floor(Date.now() / 1000) + expiresIn;

    // Store OTP in DynamoDB
    try {
      await dynamoClient.send(new PutCommand({
        TableName: otpTableName,
        Item: {
          otpId: `${request.email}-${Date.now()}`,
          email: request.email,
          otp: otp,
          createdAt: Date.now(),
          ttl: otpExpirationTime,
          attempts: 0,
          maxAttempts: 5
        }
      }));
      logger.info('OTP stored in DynamoDB', {
        correlationId,
        email: request.email,
        expiresIn
      });
    } catch (dbError) {
      logger.error('Failed to store OTP in DynamoDB', {
        correlationId,
        email: request.email,
        error: (dbError as any).message
      });
      return errorResponse(500, 'OTP_STORAGE_FAILED', 'Failed to generate OTP', correlationId);
    }

    // Send OTP via email
    try {
      await sendOTPEmail(request.email, otp, request.email, correlationId);
      logger.info('OTP email sent successfully', {
        correlationId,
        email: request.email
      });
    } catch (emailError) {
      logger.error('Failed to send OTP email', {
        correlationId,
        email: request.email,
        error: (emailError as any).message
      });
      return errorResponse(500, 'EMAIL_SEND_FAILED', 'Failed to send OTP email', correlationId);
    }

    logger.info('Generate OTP completed successfully', {
      correlationId,
      email: request.email
    });

    const response: GenerateOTPResponse = {
      success: true,
      message: 'OTP sent to your email',
      email: request.email,
      expiresIn
    };

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    logger.error('Generate OTP failed', {
      correlationId,
      error: error.message,
      name: error.name,
      stack: error.stack
    });

    return errorResponse(500, 'GENERATE_OTP_FAILED', error.message || 'Failed to generate OTP', correlationId);
  }
};

/**
 * Generate a 6-digit OTP
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via email using AWS SES
 */
async function sendOTPEmail(
  email: string,
  otp: string,
  userName: string,
  correlationId: string
): Promise<void> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
          .header { text-align: center; color: #7b61ff; margin-bottom: 20px; }
          .otp-box { background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #7b61ff; letter-spacing: 5px; font-family: monospace; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>🔐 MISRA Platform - OTP Verification</h2>
          </div>
          
          <p>Hi ${userName},</p>
          
          <p>Your One-Time Password (OTP) for MISRA Platform is:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          
          <p><strong>⏰ This code will expire in 10 minutes.</strong></p>
          
          <p>If you didn't request this code, please ignore this email and your account will remain secure.</p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          
          <div class="footer">
            <p>MISRA Compliance Platform</p>
            <p>Automated Code Analysis & Compliance Verification</p>
            <p>© 2026 - All rights reserved</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const textContent = `
MISRA Platform - OTP Verification

Hi ${userName},

Your One-Time Password (OTP) for MISRA Platform is:

${otp}

⏰ This code will expire in 10 minutes.

If you didn't request this code, please ignore this email and your account will remain secure.

---
MISRA Compliance Platform
Automated Code Analysis & Compliance Verification
© 2026 - All rights reserved
  `;

  const params = {
    Source: process.env.SES_FROM_EMAIL || 'noreply@misra-platform.com',
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'Your MISRA Platform OTP Code',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: htmlContent,
          Charset: 'UTF-8',
        },
        Text: {
          Data: textContent,
          Charset: 'UTF-8',
        },
      },
    },
  };

  try {
    await sesClient.send(new SendEmailCommand(params as any));
    logger.info('OTP email sent via SES', {
      correlationId,
      email
    });
  } catch (error) {
    logger.error('Failed to send OTP email via SES', {
      correlationId,
      email,
      error: (error as any).message
    });
    throw error;
  }
}

/**
 * Standard error response
 */
function errorResponse(
  statusCode: number,
  code: string,
  message: string,
  correlationId: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: correlationId
      }
    })
  };
}
