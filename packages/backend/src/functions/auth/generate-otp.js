"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_ses_1 = require("@aws-sdk/client-ses");
const validation_1 = require("../../utils/validation");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('GenerateOTP');
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const sesClient = new client_ses_1.SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const handler = async (event) => {
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
        const request = JSON.parse(event.body);
        // Validate email
        if (!request.email) {
            return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
        }
        if (!(0, validation_1.validateEmail)(request.email)) {
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
            await dynamoClient.send(new lib_dynamodb_1.PutCommand({
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
        }
        catch (dbError) {
            logger.error('Failed to store OTP in DynamoDB', {
                correlationId,
                email: request.email,
                error: dbError.message
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
        }
        catch (emailError) {
            logger.error('Failed to send OTP email', {
                correlationId,
                email: request.email,
                error: emailError.message
            });
            return errorResponse(500, 'EMAIL_SEND_FAILED', 'Failed to send OTP email', correlationId);
        }
        logger.info('Generate OTP completed successfully', {
            correlationId,
            email: request.email
        });
        const response = {
            success: true,
            message: 'OTP sent to your email',
            email: request.email,
            expiresIn
        };
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('Generate OTP failed', {
            correlationId,
            error: error.message,
            name: error.name,
            stack: error.stack
        });
        return errorResponse(500, 'GENERATE_OTP_FAILED', error.message || 'Failed to generate OTP', correlationId);
    }
};
exports.handler = handler;
/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
/**
 * Send OTP via email using AWS SES
 */
async function sendOTPEmail(email, otp, userName, correlationId) {
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
        await sesClient.send(new client_ses_1.SendEmailCommand(params));
        logger.info('OTP email sent via SES', {
            correlationId,
            email
        });
    }
    catch (error) {
        logger.error('Failed to send OTP email via SES', {
            correlationId,
            email,
            error: error.message
        });
        throw error;
    }
}
/**
 * Standard error response
 */
function errorResponse(statusCode, code, message, correlationId) {
    return {
        statusCode,
        headers: cors_1.corsHeaders,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtb3RwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdGUtb3RwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHOzs7QUFHSCw4REFBMEQ7QUFDMUQsd0RBQW1EO0FBQ25ELG9EQUFrRTtBQUNsRSx1REFBdUQ7QUFDdkQsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsYUFBYSxDQUFDLENBQUM7QUFDM0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDM0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFhNUUsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDM0MsYUFBYTtZQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7U0FDekIsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSxh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QUVEOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlLEVBQ2YsYUFBcUI7SUFFckIsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUUsa0JBQVc7UUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxhQUFhO2FBQ3pCO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEdlbmVyYXRlIE9UUCBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIEdlbmVyYXRlcyBhbmQgc2VuZHMgYSBuZXcgT1RQIHRvIHRoZSB1c2VyJ3MgZW1haWxcclxuICogVXNlZCBmb3IgcGFzc3dvcmRsZXNzIGF1dGhlbnRpY2F0aW9uIGZsb3dcclxuICogXHJcbiAqIFJlcXVlc3Q6XHJcbiAqIHtcclxuICogICBcImVtYWlsXCI6IFwidXNlckBleGFtcGxlLmNvbVwiXHJcbiAqIH1cclxuICogXHJcbiAqIFJlc3BvbnNlOlxyXG4gKiB7XHJcbiAqICAgXCJzdWNjZXNzXCI6IHRydWUsXHJcbiAqICAgXCJtZXNzYWdlXCI6IFwiT1RQIHNlbnQgdG8geW91ciBlbWFpbFwiLFxyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCIsXHJcbiAqICAgXCJleHBpcmVzSW5cIjogNjAwXHJcbiAqIH1cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgUHV0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFNFU0NsaWVudCwgU2VuZEVtYWlsQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zZXMnO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZUVtYWlsIH0gZnJvbSAnLi4vLi4vdXRpbHMvdmFsaWRhdGlvbic7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0dlbmVyYXRlT1RQJyk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3Qgc2VzQ2xpZW50ID0gbmV3IFNFU0NsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuXHJcbmludGVyZmFjZSBHZW5lcmF0ZU9UUFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBHZW5lcmF0ZU9UUFJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGUgT1RQIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IEdlbmVyYXRlT1RQUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWxcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0VNQUlMJywgJ0VtYWlsIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF2YWxpZGF0ZUVtYWlsKHJlcXVlc3QuZW1haWwpKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfRU1BSUwnLCAnUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0dlbmVyYXRpbmcgT1RQIGZvciBlbWFpbCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIE9UUFxyXG4gICAgY29uc3Qgb3RwID0gZ2VuZXJhdGVPVFAoKTtcclxuICAgIGNvbnN0IG90cFRhYmxlTmFtZSA9IHByb2Nlc3MuZW52Lk9UUF9UQUJMRV9OQU1FIHx8ICdPVFAnO1xyXG4gICAgY29uc3QgZXhwaXJlc0luID0gMTAgKiA2MDsgLy8gMTAgbWludXRlc1xyXG4gICAgY29uc3Qgb3RwRXhwaXJhdGlvblRpbWUgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSArIGV4cGlyZXNJbjtcclxuXHJcbiAgICAvLyBTdG9yZSBPVFAgaW4gRHluYW1vREJcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IG90cFRhYmxlTmFtZSxcclxuICAgICAgICBJdGVtOiB7XHJcbiAgICAgICAgICBvdHBJZDogYCR7cmVxdWVzdC5lbWFpbH0tJHtEYXRlLm5vdygpfWAsXHJcbiAgICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICAgIG90cDogb3RwLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgdHRsOiBvdHBFeHBpcmF0aW9uVGltZSxcclxuICAgICAgICAgIGF0dGVtcHRzOiAwLFxyXG4gICAgICAgICAgbWF4QXR0ZW1wdHM6IDVcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ09UUCBzdG9yZWQgaW4gRHluYW1vREInLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICBleHBpcmVzSW5cclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChkYkVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHN0b3JlIE9UUCBpbiBEeW5hbW9EQicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIGVycm9yOiAoZGJFcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ09UUF9TVE9SQUdFX0ZBSUxFRCcsICdGYWlsZWQgdG8gZ2VuZXJhdGUgT1RQJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gU2VuZCBPVFAgdmlhIGVtYWlsXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBzZW5kT1RQRW1haWwocmVxdWVzdC5lbWFpbCwgb3RwLCByZXF1ZXN0LmVtYWlsLCBjb3JyZWxhdGlvbklkKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ09UUCBlbWFpbCBzZW50IHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZW1haWxFcnJvcikge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBzZW5kIE9UUCBlbWFpbCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIGVycm9yOiAoZW1haWxFcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0VNQUlMX1NFTkRfRkFJTEVEJywgJ0ZhaWxlZCB0byBzZW5kIE9UUCBlbWFpbCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0ZSBPVFAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBHZW5lcmF0ZU9UUFJlc3BvbnNlID0ge1xyXG4gICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICBtZXNzYWdlOiAnT1RQIHNlbnQgdG8geW91ciBlbWFpbCcsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICBleHBpcmVzSW5cclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0dlbmVyYXRlIE9UUCBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBuYW1lOiBlcnJvci5uYW1lLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0dFTkVSQVRFX09UUF9GQUlMRUQnLCBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gZ2VuZXJhdGUgT1RQJywgY29ycmVsYXRpb25JZCk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIGEgNi1kaWdpdCBPVFBcclxuICovXHJcbmZ1bmN0aW9uIGdlbmVyYXRlT1RQKCk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIE1hdGguZmxvb3IoMTAwMDAwICsgTWF0aC5yYW5kb20oKSAqIDkwMDAwMCkudG9TdHJpbmcoKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNlbmQgT1RQIHZpYSBlbWFpbCB1c2luZyBBV1MgU0VTXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzZW5kT1RQRW1haWwoXHJcbiAgZW1haWw6IHN0cmluZyxcclxuICBvdHA6IHN0cmluZyxcclxuICB1c2VyTmFtZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBodG1sQ29udGVudCA9IGBcclxuICAgIDwhRE9DVFlQRSBodG1sPlxyXG4gICAgPGh0bWw+XHJcbiAgICAgIDxoZWFkPlxyXG4gICAgICAgIDxzdHlsZT5cclxuICAgICAgICAgIGJvZHkgeyBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7IH1cclxuICAgICAgICAgIC5jb250YWluZXIgeyBtYXgtd2lkdGg6IDYwMHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweDsgfVxyXG4gICAgICAgICAgLmhlYWRlciB7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICM3YjYxZmY7IG1hcmdpbi1ib3R0b206IDIwcHg7IH1cclxuICAgICAgICAgIC5vdHAtYm94IHsgYmFja2dyb3VuZC1jb2xvcjogI2YwZjBmMDsgcGFkZGluZzogMjBweDsgdGV4dC1hbGlnbjogY2VudGVyOyBib3JkZXItcmFkaXVzOiA4cHg7IG1hcmdpbjogMjBweCAwOyB9XHJcbiAgICAgICAgICAub3RwLWNvZGUgeyBmb250LXNpemU6IDMycHg7IGZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogIzdiNjFmZjsgbGV0dGVyLXNwYWNpbmc6IDVweDsgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTsgfVxyXG4gICAgICAgICAgLmZvb3RlciB7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICM5OTk7IGZvbnQtc2l6ZTogMTJweDsgbWFyZ2luLXRvcDogMjBweDsgfVxyXG4gICAgICAgIDwvc3R5bGU+XHJcbiAgICAgIDwvaGVhZD5cclxuICAgICAgPGJvZHk+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxyXG4gICAgICAgICAgICA8aDI+8J+UkCBNSVNSQSBQbGF0Zm9ybSAtIE9UUCBWZXJpZmljYXRpb248L2gyPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxwPkhpICR7dXNlck5hbWV9LDwvcD5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHA+WW91ciBPbmUtVGltZSBQYXNzd29yZCAoT1RQKSBmb3IgTUlTUkEgUGxhdGZvcm0gaXM6PC9wPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwib3RwLWJveFwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwib3RwLWNvZGVcIj4ke290cH08L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8cD48c3Ryb25nPuKPsCBUaGlzIGNvZGUgd2lsbCBleHBpcmUgaW4gMTAgbWludXRlcy48L3N0cm9uZz48L3A+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxwPklmIHlvdSBkaWRuJ3QgcmVxdWVzdCB0aGlzIGNvZGUsIHBsZWFzZSBpZ25vcmUgdGhpcyBlbWFpbCBhbmQgeW91ciBhY2NvdW50IHdpbGwgcmVtYWluIHNlY3VyZS48L3A+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxociBzdHlsZT1cImJvcmRlcjogbm9uZTsgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlZWU7IG1hcmdpbjogMjBweCAwO1wiPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9vdGVyXCI+XHJcbiAgICAgICAgICAgIDxwPk1JU1JBIENvbXBsaWFuY2UgUGxhdGZvcm08L3A+XHJcbiAgICAgICAgICAgIDxwPkF1dG9tYXRlZCBDb2RlIEFuYWx5c2lzICYgQ29tcGxpYW5jZSBWZXJpZmljYXRpb248L3A+XHJcbiAgICAgICAgICAgIDxwPsKpIDIwMjYgLSBBbGwgcmlnaHRzIHJlc2VydmVkPC9wPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIDwvYm9keT5cclxuICAgIDwvaHRtbD5cclxuICBgO1xyXG5cclxuICBjb25zdCB0ZXh0Q29udGVudCA9IGBcclxuTUlTUkEgUGxhdGZvcm0gLSBPVFAgVmVyaWZpY2F0aW9uXHJcblxyXG5IaSAke3VzZXJOYW1lfSxcclxuXHJcbllvdXIgT25lLVRpbWUgUGFzc3dvcmQgKE9UUCkgZm9yIE1JU1JBIFBsYXRmb3JtIGlzOlxyXG5cclxuJHtvdHB9XHJcblxyXG7ij7AgVGhpcyBjb2RlIHdpbGwgZXhwaXJlIGluIDEwIG1pbnV0ZXMuXHJcblxyXG5JZiB5b3UgZGlkbid0IHJlcXVlc3QgdGhpcyBjb2RlLCBwbGVhc2UgaWdub3JlIHRoaXMgZW1haWwgYW5kIHlvdXIgYWNjb3VudCB3aWxsIHJlbWFpbiBzZWN1cmUuXHJcblxyXG4tLS1cclxuTUlTUkEgQ29tcGxpYW5jZSBQbGF0Zm9ybVxyXG5BdXRvbWF0ZWQgQ29kZSBBbmFseXNpcyAmIENvbXBsaWFuY2UgVmVyaWZpY2F0aW9uXHJcbsKpIDIwMjYgLSBBbGwgcmlnaHRzIHJlc2VydmVkXHJcbiAgYDtcclxuXHJcbiAgY29uc3QgcGFyYW1zID0ge1xyXG4gICAgU291cmNlOiBwcm9jZXNzLmVudi5TRVNfRlJPTV9FTUFJTCB8fCAnbm9yZXBseUBtaXNyYS1wbGF0Zm9ybS5jb20nLFxyXG4gICAgRGVzdGluYXRpb246IHtcclxuICAgICAgVG9BZGRyZXNzZXM6IFtlbWFpbF0sXHJcbiAgICB9LFxyXG4gICAgTWVzc2FnZToge1xyXG4gICAgICBTdWJqZWN0OiB7XHJcbiAgICAgICAgRGF0YTogJ1lvdXIgTUlTUkEgUGxhdGZvcm0gT1RQIENvZGUnLFxyXG4gICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIEJvZHk6IHtcclxuICAgICAgICBIdG1sOiB7XHJcbiAgICAgICAgICBEYXRhOiBodG1sQ29udGVudCxcclxuICAgICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBUZXh0OiB7XHJcbiAgICAgICAgICBEYXRhOiB0ZXh0Q29udGVudCxcclxuICAgICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IHNlc0NsaWVudC5zZW5kKG5ldyBTZW5kRW1haWxDb21tYW5kKHBhcmFtcyBhcyBhbnkpKTtcclxuICAgIGxvZ2dlci5pbmZvKCdPVFAgZW1haWwgc2VudCB2aWEgU0VTJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHNlbmQgT1RQIGVtYWlsIHZpYSBTRVMnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsLFxyXG4gICAgICBlcnJvcjogKGVycm9yIGFzIGFueSkubWVzc2FnZVxyXG4gICAgfSk7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==