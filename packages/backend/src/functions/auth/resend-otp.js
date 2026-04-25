"use strict";
/**
 * Resend OTP Lambda Function
 *
 * Handles OTP resend for existing users who didn't receive their initial OTP
 * or whose OTP has expired
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
 *   "email": "user@example.com"
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client_ses_1 = require("@aws-sdk/client-ses");
const validation_1 = require("../../utils/validation");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('ResendOTP');
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const sesClient = new client_ses_1.SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    try {
        logger.info('Resend OTP request received', {
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
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        if (!userPoolId) {
            logger.error('COGNITO_USER_POOL_ID not configured', { correlationId });
            return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
        }
        logger.info('Verifying user exists', {
            correlationId,
            email: request.email
        });
        // Verify user exists in Cognito
        let userId;
        try {
            const userResponse = await cognito.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: request.email
            }));
            userId = userResponse.Username || request.email;
        }
        catch (error) {
            if (error.name === 'UserNotFoundException') {
                logger.warn('User not found', {
                    correlationId,
                    email: request.email
                });
                return errorResponse(404, 'USER_NOT_FOUND', 'User with this email does not exist', correlationId);
            }
            throw error;
        }
        logger.info('User verified, generating new OTP', {
            correlationId,
            email: request.email,
            userId
        });
        // Generate new OTP
        const otp = generateOTP();
        const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';
        const otpExpirationTime = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes from now
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
                    userId: userId
                }
            }));
            logger.info('OTP stored in DynamoDB', {
                correlationId,
                email: request.email
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
        logger.info('Resend OTP completed successfully', {
            correlationId,
            email: request.email
        });
        const response = {
            success: true,
            message: 'OTP sent to your email',
            email: request.email
        };
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('Resend OTP failed', {
            correlationId,
            error: error.message,
            name: error.name,
            stack: error.stack
        });
        return errorResponse(500, 'RESEND_OTP_FAILED', error.message || 'Failed to resend OTP', correlationId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzZW5kLW90cC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlc2VuZC1vdHAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7OztHQWlCRzs7O0FBR0gsZ0dBQStHO0FBQy9HLDhEQUEwRDtBQUMxRCx3REFBbUQ7QUFDbkQsb0RBQWtFO0FBQ2xFLHVEQUF1RDtBQUN2RCwyQ0FBK0M7QUFDL0MsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxXQUFXLENBQUMsQ0FBQztBQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLGdFQUE2QixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDckcsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDM0YsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFZNUUsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUU7WUFDekMsYUFBYTtZQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7U0FDekIsQ0FBQyxD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LENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWUsRUFDZixhQUFxQjtJQUVyQixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLGFBQWE7YUFDekI7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUmVzZW5kIE9UUCBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIEhhbmRsZXMgT1RQIHJlc2VuZCBmb3IgZXhpc3RpbmcgdXNlcnMgd2hvIGRpZG4ndCByZWNlaXZlIHRoZWlyIGluaXRpYWwgT1RQXHJcbiAqIG9yIHdob3NlIE9UUCBoYXMgZXhwaXJlZFxyXG4gKiBcclxuICogUmVxdWVzdDpcclxuICoge1xyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCJcclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcInN1Y2Nlc3NcIjogdHJ1ZSxcclxuICogICBcIm1lc3NhZ2VcIjogXCJPVFAgc2VudCB0byB5b3VyIGVtYWlsXCIsXHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIlxyXG4gKiB9XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgQWRtaW5HZXRVc2VyQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBQdXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgU0VTQ2xpZW50LCBTZW5kRW1haWxDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlcyc7XHJcbmltcG9ydCB7IHZhbGlkYXRlRW1haWwgfSBmcm9tICcuLi8uLi91dGlscy92YWxpZGF0aW9uJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignUmVzZW5kT1RQJyk7XHJcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3Qgc2VzQ2xpZW50ID0gbmV3IFNFU0NsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuXHJcbmludGVyZmFjZSBSZXNlbmRPVFBSZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVzZW5kT1RQUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGxvZ2dlci5pbmZvKCdSZXNlbmQgT1RQIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IFJlc2VuZE9UUFJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGVtYWlsXHJcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19FTUFJTCcsICdFbWFpbCBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdmFsaWRhdGVFbWFpbChyZXF1ZXN0LmVtYWlsKSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX0VNQUlMJywgJ1BsZWFzZSBwcm92aWRlIGEgdmFsaWQgZW1haWwgYWRkcmVzcycsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVzZXJQb29sSWQgPSBwcm9jZXNzLmVudi5DT0dOSVRPX1VTRVJfUE9PTF9JRDtcclxuICAgIGlmICghdXNlclBvb2xJZCkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0NPR05JVE9fVVNFUl9QT09MX0lEIG5vdCBjb25maWd1cmVkJywgeyBjb3JyZWxhdGlvbklkIH0gYXMgYW55KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQ09ORklHX0VSUk9SJywgJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgY29uZmlndXJhdGlvbiBlcnJvcicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdWZXJpZnlpbmcgdXNlciBleGlzdHMnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBWZXJpZnkgdXNlciBleGlzdHMgaW4gQ29nbml0b1xyXG4gICAgbGV0IHVzZXJJZDogc3RyaW5nO1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlclJlc3BvbnNlID0gYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pKTtcclxuICAgICAgdXNlcklkID0gdXNlclJlc3BvbnNlLlVzZXJuYW1lIHx8IHJlcXVlc3QuZW1haWw7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdVc2VyIG5vdCBmb3VuZCcsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ1VTRVJfTk9UX0ZPVU5EJywgJ1VzZXIgd2l0aCB0aGlzIGVtYWlsIGRvZXMgbm90IGV4aXN0JywgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1VzZXIgdmVyaWZpZWQsIGdlbmVyYXRpbmcgbmV3IE9UUCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgbmV3IE9UUFxyXG4gICAgY29uc3Qgb3RwID0gZ2VuZXJhdGVPVFAoKTtcclxuICAgIGNvbnN0IG90cFRhYmxlTmFtZSA9IHByb2Nlc3MuZW52Lk9UUF9UQUJMRV9OQU1FIHx8ICdPVFAnO1xyXG4gICAgY29uc3Qgb3RwRXhwaXJhdGlvblRpbWUgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSArICgxMCAqIDYwKTsgLy8gMTAgbWludXRlcyBmcm9tIG5vd1xyXG5cclxuICAgIC8vIFN0b3JlIE9UUCBpbiBEeW5hbW9EQlxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogb3RwVGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IHtcclxuICAgICAgICAgIG90cElkOiBgJHtyZXF1ZXN0LmVtYWlsfS0ke0RhdGUubm93KCl9YCxcclxuICAgICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgb3RwOiBvdHAsXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICB0dGw6IG90cEV4cGlyYXRpb25UaW1lLFxyXG4gICAgICAgICAgdXNlcklkOiB1c2VySWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ09UUCBzdG9yZWQgaW4gRHluYW1vREInLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGRiRXJyb3IpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gc3RvcmUgT1RQIGluIER5bmFtb0RCJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgZXJyb3I6IChkYkVycm9yIGFzIGFueSkubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnT1RQX1NUT1JBR0VfRkFJTEVEJywgJ0ZhaWxlZCB0byBnZW5lcmF0ZSBPVFAnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZW5kIE9UUCB2aWEgZW1haWxcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHNlbmRPVFBFbWFpbChyZXF1ZXN0LmVtYWlsLCBvdHAsIHJlcXVlc3QuZW1haWwsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnT1RQIGVtYWlsIHNlbnQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChlbWFpbEVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHNlbmQgT1RQIGVtYWlsJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgZXJyb3I6IChlbWFpbEVycm9yIGFzIGFueSkubWVzc2FnZVxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnRU1BSUxfU0VORF9GQUlMRUQnLCAnRmFpbGVkIHRvIHNlbmQgT1RQIGVtYWlsJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1Jlc2VuZCBPVFAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBSZXNlbmRPVFBSZXNwb25zZSA9IHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogJ09UUCBzZW50IHRvIHlvdXIgZW1haWwnLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignUmVzZW5kIE9UUCBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBuYW1lOiBlcnJvci5uYW1lLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ1JFU0VORF9PVFBfRkFJTEVEJywgZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHJlc2VuZCBPVFAnLCBjb3JyZWxhdGlvbklkKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgYSA2LWRpZ2l0IE9UUFxyXG4gKi9cclxuZnVuY3Rpb24gZ2VuZXJhdGVPVFAoKTogc3RyaW5nIHtcclxuICByZXR1cm4gTWF0aC5mbG9vcigxMDAwMDAgKyBNYXRoLnJhbmRvbSgpICogOTAwMDAwKS50b1N0cmluZygpO1xyXG59XHJcblxyXG4vKipcclxuICogU2VuZCBPVFAgdmlhIGVtYWlsIHVzaW5nIEFXUyBTRVNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHNlbmRPVFBFbWFpbChcclxuICBlbWFpbDogc3RyaW5nLFxyXG4gIG90cDogc3RyaW5nLFxyXG4gIHVzZXJOYW1lOiBzdHJpbmcsXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGh0bWxDb250ZW50ID0gYFxyXG4gICAgPCFET0NUWVBFIGh0bWw+XHJcbiAgICA8aHRtbD5cclxuICAgICAgPGhlYWQ+XHJcbiAgICAgICAgPHN0eWxlPlxyXG4gICAgICAgICAgYm9keSB7IGZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgYmFja2dyb3VuZC1jb2xvcjogI2Y1ZjVmNTsgfVxyXG4gICAgICAgICAgLmNvbnRhaW5lciB7IG1heC13aWR0aDogNjAwcHg7IG1hcmdpbjogMCBhdXRvOyBiYWNrZ3JvdW5kLWNvbG9yOiB3aGl0ZTsgcGFkZGluZzogMjBweDsgYm9yZGVyLXJhZGl1czogOHB4OyB9XHJcbiAgICAgICAgICAuaGVhZGVyIHsgdGV4dC1hbGlnbjogY2VudGVyOyBjb2xvcjogIzdiNjFmZjsgbWFyZ2luLWJvdHRvbTogMjBweDsgfVxyXG4gICAgICAgICAgLm90cC1ib3ggeyBiYWNrZ3JvdW5kLWNvbG9yOiAjZjBmMGYwOyBwYWRkaW5nOiAyMHB4OyB0ZXh0LWFsaWduOiBjZW50ZXI7IGJvcmRlci1yYWRpdXM6IDhweDsgbWFyZ2luOiAyMHB4IDA7IH1cclxuICAgICAgICAgIC5vdHAtY29kZSB7IGZvbnQtc2l6ZTogMzJweDsgZm9udC13ZWlnaHQ6IGJvbGQ7IGNvbG9yOiAjN2I2MWZmOyBsZXR0ZXItc3BhY2luZzogNXB4OyBmb250LWZhbWlseTogbW9ub3NwYWNlOyB9XHJcbiAgICAgICAgICAuZm9vdGVyIHsgdGV4dC1hbGlnbjogY2VudGVyOyBjb2xvcjogIzk5OTsgZm9udC1zaXplOiAxMnB4OyBtYXJnaW4tdG9wOiAyMHB4OyB9XHJcbiAgICAgICAgPC9zdHlsZT5cclxuICAgICAgPC9oZWFkPlxyXG4gICAgICA8Ym9keT5cclxuICAgICAgICA8ZGl2IGNsYXNzPVwiY29udGFpbmVyXCI+XHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+XHJcbiAgICAgICAgICAgIDxoMj7wn5SQIE1JU1JBIFBsYXRmb3JtIC0gT1RQIFZlcmlmaWNhdGlvbjwvaDI+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHA+SGkgJHt1c2VyTmFtZX0sPC9wPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8cD5Zb3VyIE9uZS1UaW1lIFBhc3N3b3JkIChPVFApIGZvciBNSVNSQSBQbGF0Zm9ybSBpczo8L3A+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJvdHAtYm94XCI+XHJcbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJvdHAtY29kZVwiPiR7b3RwfTwvZGl2PlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxwPjxzdHJvbmc+4o+wIFRoaXMgY29kZSB3aWxsIGV4cGlyZSBpbiAxMCBtaW51dGVzLjwvc3Ryb25nPjwvcD5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHA+SWYgeW91IGRpZG4ndCByZXF1ZXN0IHRoaXMgY29kZSwgcGxlYXNlIGlnbm9yZSB0aGlzIGVtYWlsIGFuZCB5b3VyIGFjY291bnQgd2lsbCByZW1haW4gc2VjdXJlLjwvcD5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPGhyIHN0eWxlPVwiYm9yZGVyOiBub25lOyBib3JkZXItdG9wOiAxcHggc29saWQgI2VlZTsgbWFyZ2luOiAyMHB4IDA7XCI+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb290ZXJcIj5cclxuICAgICAgICAgICAgPHA+TUlTUkEgQ29tcGxpYW5jZSBQbGF0Zm9ybTwvcD5cclxuICAgICAgICAgICAgPHA+QXV0b21hdGVkIENvZGUgQW5hbHlzaXMgJiBDb21wbGlhbmNlIFZlcmlmaWNhdGlvbjwvcD5cclxuICAgICAgICAgICAgPHA+wqkgMjAyNiAtIEFsbCByaWdodHMgcmVzZXJ2ZWQ8L3A+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICA8L2Rpdj5cclxuICAgICAgPC9ib2R5PlxyXG4gICAgPC9odG1sPlxyXG4gIGA7XHJcblxyXG4gIGNvbnN0IHRleHRDb250ZW50ID0gYFxyXG5NSVNSQSBQbGF0Zm9ybSAtIE9UUCBWZXJpZmljYXRpb25cclxuXHJcbkhpICR7dXNlck5hbWV9LFxyXG5cclxuWW91ciBPbmUtVGltZSBQYXNzd29yZCAoT1RQKSBmb3IgTUlTUkEgUGxhdGZvcm0gaXM6XHJcblxyXG4ke290cH1cclxuXHJcbuKPsCBUaGlzIGNvZGUgd2lsbCBleHBpcmUgaW4gMTAgbWludXRlcy5cclxuXHJcbklmIHlvdSBkaWRuJ3QgcmVxdWVzdCB0aGlzIGNvZGUsIHBsZWFzZSBpZ25vcmUgdGhpcyBlbWFpbCBhbmQgeW91ciBhY2NvdW50IHdpbGwgcmVtYWluIHNlY3VyZS5cclxuXHJcbi0tLVxyXG5NSVNSQSBDb21wbGlhbmNlIFBsYXRmb3JtXHJcbkF1dG9tYXRlZCBDb2RlIEFuYWx5c2lzICYgQ29tcGxpYW5jZSBWZXJpZmljYXRpb25cclxuwqkgMjAyNiAtIEFsbCByaWdodHMgcmVzZXJ2ZWRcclxuICBgO1xyXG5cclxuICBjb25zdCBwYXJhbXMgPSB7XHJcbiAgICBTb3VyY2U6IHByb2Nlc3MuZW52LlNFU19GUk9NX0VNQUlMIHx8ICdub3JlcGx5QG1pc3JhLXBsYXRmb3JtLmNvbScsXHJcbiAgICBEZXN0aW5hdGlvbjoge1xyXG4gICAgICBUb0FkZHJlc3NlczogW2VtYWlsXSxcclxuICAgIH0sXHJcbiAgICBNZXNzYWdlOiB7XHJcbiAgICAgIFN1YmplY3Q6IHtcclxuICAgICAgICBEYXRhOiAnWW91ciBNSVNSQSBQbGF0Zm9ybSBPVFAgQ29kZScsXHJcbiAgICAgICAgQ2hhcnNldDogJ1VURi04JyxcclxuICAgICAgfSxcclxuICAgICAgQm9keToge1xyXG4gICAgICAgIEh0bWw6IHtcclxuICAgICAgICAgIERhdGE6IGh0bWxDb250ZW50LFxyXG4gICAgICAgICAgQ2hhcnNldDogJ1VURi04JyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIFRleHQ6IHtcclxuICAgICAgICAgIERhdGE6IHRleHRDb250ZW50LFxyXG4gICAgICAgICAgQ2hhcnNldDogJ1VURi04JyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICB9O1xyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgc2VzQ2xpZW50LnNlbmQobmV3IFNlbmRFbWFpbENvbW1hbmQocGFyYW1zIGFzIGFueSkpO1xyXG4gICAgbG9nZ2VyLmluZm8oJ09UUCBlbWFpbCBzZW50IHZpYSBTRVMnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gc2VuZCBPVFAgZW1haWwgdmlhIFNFUycsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWwsXHJcbiAgICAgIGVycm9yOiAoZXJyb3IgYXMgYW55KS5tZXNzYWdlXHJcbiAgICB9KTtcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH07XHJcbn1cclxuIl19