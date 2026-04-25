"use strict";
/**
 * Register Lambda Function
 *
 * Handles user registration with AWS Cognito
 * Creates a new user with SOFTWARE_TOKEN_MFA enabled for TOTP support
 *
 * Request:
 * {
 *   "email": "user@example.com",
 *   "password": "SecurePassword123!",
 *   "name": "John Doe"
 * }
 *
 * Response:
 * {
 *   "userId": "cognito-user-id",
 *   "email": "user@example.com",
 *   "message": "User registered successfully. Please verify your email.",
 *   "requiresEmailVerification": true
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
const logger = (0, logger_1.createLogger)('Register');
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const sesClient = new client_ses_1.SESClient({ region: process.env.AWS_REGION || 'us-east-1' });
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    try {
        logger.info('User registration request received', {
            correlationId,
            path: event.path,
            method: event.httpMethod
        });
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.email) {
            return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
        }
        // Validate email format
        if (!(0, validation_1.validateEmail)(request.email)) {
            return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
        }
        // If password is provided, validate it
        if (request.password) {
            const passwordValidation = (0, validation_1.validatePassword)(request.password);
            if (!passwordValidation.isValid) {
                return errorResponse(400, 'WEAK_PASSWORD', passwordValidation.message, correlationId);
            }
        }
        const userPoolId = process.env.COGNITO_USER_POOL_ID;
        if (!userPoolId) {
            logger.error('COGNITO_USER_POOL_ID not configured', { correlationId });
            return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error', correlationId);
        }
        logger.info('Attempting to register user', {
            correlationId,
            email: request.email,
            name: request.name
        });
        // Check if user already exists
        try {
            await cognito.send(new client_cognito_identity_provider_1.AdminGetUserCommand({
                UserPoolId: userPoolId,
                Username: request.email
            }));
            // User exists
            logger.warn('User already exists', {
                correlationId,
                email: request.email
            });
            return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
        }
        catch (error) {
            if (error.name !== 'UserNotFoundException') {
                throw error;
            }
            // User doesn't exist, continue with registration
        }
        // Create user with temporary password
        const tempPassword = generateTemporaryPassword();
        logger.info('Creating Cognito user', {
            correlationId,
            email: request.email,
            passwordProvided: !!request.password
        });
        const createUserResponse = await cognito.send(new client_cognito_identity_provider_1.AdminCreateUserCommand({
            UserPoolId: userPoolId,
            Username: request.email,
            TemporaryPassword: tempPassword,
            UserAttributes: [
                {
                    Name: 'email',
                    Value: request.email
                },
                {
                    Name: 'email_verified',
                    Value: 'false'
                },
                {
                    Name: 'name',
                    Value: request.name || request.email
                },
                {
                    Name: 'custom:otpEnabled',
                    Value: 'false'
                }
            ],
            MessageAction: 'SUPPRESS' // Don't send welcome email yet
        }));
        const userId = createUserResponse.User?.Username;
        if (!userId) {
            throw new Error('Failed to create user - no user ID returned');
        }
        logger.info('User created successfully', {
            correlationId,
            userId,
            email: request.email
        });
        // Set permanent password if provided, otherwise use temporary password
        const finalPassword = request.password || tempPassword;
        logger.info('Setting permanent password', {
            correlationId,
            userId,
            isCustomPassword: !!request.password
        });
        await cognito.send(new client_cognito_identity_provider_1.AdminSetUserPasswordCommand({
            UserPoolId: userPoolId,
            Username: request.email,
            Password: finalPassword,
            Permanent: true
        }));
        logger.info('Permanent password set', {
            correlationId,
            userId
        });
        // Generate and send OTP via email
        const otp = generateOTP();
        const otpTableName = process.env.OTP_TABLE_NAME || 'OTP';
        const otpExpirationTime = Math.floor(Date.now() / 1000) + (10 * 60); // 10 minutes from now
        logger.info('Generating OTP for user', {
            correlationId,
            email: request.email,
            otpTableName
        });
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
            logger.warn('Failed to store OTP in DynamoDB', {
                correlationId,
                error: dbError.message
            });
            // Continue anyway - we'll still send the OTP via email
        }
        // Send OTP via email
        try {
            await sendOTPEmail(request.email, otp, request.name || request.email, correlationId);
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
            // Don't fail registration if email fails - user can request OTP later
        }
        // Store temporary password in DynamoDB for auto-login
        try {
            const usersTableName = process.env.USERS_TABLE_NAME || 'misra-users';
            await dynamoClient.send(new lib_dynamodb_1.PutCommand({
                TableName: usersTableName,
                Item: {
                    email: request.email,
                    userId: userId,
                    tempPassword: finalPassword,
                    createdAt: Date.now(),
                    name: request.name || request.email,
                    otpVerified: false
                }
            }));
            logger.info('Stored user credentials in DynamoDB', {
                correlationId,
                email: request.email
            });
        }
        catch (dbError) {
            logger.warn('Failed to store credentials in DynamoDB', {
                correlationId,
                error: dbError.message
            });
            // Continue anyway - DynamoDB storage is optional for auto-login fallback
        }
        // Note: SOFTWARE_TOKEN_MFA will be set up during the login/OTP verification flow
        // The user needs to associate a software token first before we can set MFA preference
        // This is handled in the verify-otp Lambda function
        logger.info('User registration completed successfully', {
            correlationId,
            userId,
            email: request.email
        });
        const response = {
            userId,
            email: request.email,
            message: 'User registered successfully. Please verify your email and set up MFA.',
            requiresEmailVerification: true
        };
        logger.info('User registration completed successfully', {
            correlationId,
            userId,
            email: request.email
        });
        return {
            statusCode: 201,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('User registration failed', {
            correlationId,
            error: error.message,
            name: error.name,
            stack: error.stack
        });
        // Handle specific Cognito errors
        if (error.name === 'UsernameExistsException') {
            return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
        }
        else if (error.name === 'InvalidPasswordException') {
            return errorResponse(400, 'INVALID_PASSWORD', error.message, correlationId);
        }
        else if (error.name === 'TooManyRequestsException') {
            return errorResponse(429, 'TOO_MANY_REQUESTS', 'Too many registration attempts. Please try again later.', correlationId);
        }
        return errorResponse(500, 'REGISTRATION_FAILED', error.message || 'Failed to register user', correlationId);
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
 * Generate a temporary password that meets Cognito requirements
 */
function generateTemporaryPassword() {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const symbols = '!@#$%^&*';
    let password = '';
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += digits[Math.floor(Math.random() * digits.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    // Add random characters to reach minimum length
    const allChars = uppercase + lowercase + digits + symbols;
    for (let i = password.length; i < 12; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    // Shuffle password
    return password.split('').sort(() => Math.random() - 0.5).join('');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHOzs7QUFHSCxnR0FBb0s7QUFDcEssOERBQTBEO0FBQzFELHdEQUFtRDtBQUNuRCxvREFBa0U7QUFDbEUsdURBQXlFO0FBQ3pFLDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksZ0VBQTZCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUNyRyxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQUMzRixNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQWU1RSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRTtZQUNoRCxhQUFhO1lBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtTQUN6QixDQUFDLENB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Q0FBQyxPQUFPO1NBQzlCLENBQUMsQ0FBQztRQUNILE1BQU0sS0FBSyxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZSxFQUNmLGFBQXFCO0lBRXJCLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFLGtCQUFXO1FBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsYUFBYTthQUN6QjtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBSZWdpc3RlciBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIEhhbmRsZXMgdXNlciByZWdpc3RyYXRpb24gd2l0aCBBV1MgQ29nbml0b1xyXG4gKiBDcmVhdGVzIGEgbmV3IHVzZXIgd2l0aCBTT0ZUV0FSRV9UT0tFTl9NRkEgZW5hYmxlZCBmb3IgVE9UUCBzdXBwb3J0XHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiB7XHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICBcInBhc3N3b3JkXCI6IFwiU2VjdXJlUGFzc3dvcmQxMjMhXCIsXHJcbiAqICAgXCJuYW1lXCI6IFwiSm9obiBEb2VcIlxyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwidXNlcklkXCI6IFwiY29nbml0by11c2VyLWlkXCIsXHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICBcIm1lc3NhZ2VcIjogXCJVc2VyIHJlZ2lzdGVyZWQgc3VjY2Vzc2Z1bGx5LiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwuXCIsXHJcbiAqICAgXCJyZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uXCI6IHRydWVcclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCwgQWRtaW5HZXRVc2VyQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBQdXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgU0VTQ2xpZW50LCBTZW5kRW1haWxDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNlcyc7XHJcbmltcG9ydCB7IHZhbGlkYXRlRW1haWwsIHZhbGlkYXRlUGFzc3dvcmQgfSBmcm9tICcuLi8uLi91dGlscy92YWxpZGF0aW9uJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignUmVnaXN0ZXInKTtcclxuY29uc3QgY29nbml0byA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG5jb25zdCBzZXNDbGllbnQgPSBuZXcgU0VTQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG5cclxuaW50ZXJmYWNlIFJlZ2lzdGVyUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBwYXNzd29yZD86IHN0cmluZzsgLy8gT3B0aW9uYWwgZm9yIHBhc3N3b3JkbGVzcyBmbG93XHJcbiAgbmFtZT86IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFJlZ2lzdGVyUmVzcG9uc2Uge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIHJlcXVpcmVzRW1haWxWZXJpZmljYXRpb246IGJvb2xlYW47XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIHJlZ2lzdHJhdGlvbiByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBSZWdpc3RlclJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gICAgaWYgKCFyZXF1ZXN0LmVtYWlsKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRU1BSUwnLCAnRW1haWwgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBlbWFpbCBmb3JtYXRcclxuICAgIGlmICghdmFsaWRhdGVFbWFpbChyZXF1ZXN0LmVtYWlsKSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX0VNQUlMJywgJ1BsZWFzZSBwcm92aWRlIGEgdmFsaWQgZW1haWwgYWRkcmVzcycsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIHBhc3N3b3JkIGlzIHByb3ZpZGVkLCB2YWxpZGF0ZSBpdFxyXG4gICAgaWYgKHJlcXVlc3QucGFzc3dvcmQpIHtcclxuICAgICAgY29uc3QgcGFzc3dvcmRWYWxpZGF0aW9uID0gdmFsaWRhdGVQYXNzd29yZChyZXF1ZXN0LnBhc3N3b3JkKTtcclxuICAgICAgaWYgKCFwYXNzd29yZFZhbGlkYXRpb24uaXNWYWxpZCkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ1dFQUtfUEFTU1dPUkQnLCBwYXNzd29yZFZhbGlkYXRpb24ubWVzc2FnZSwgY29ycmVsYXRpb25JZCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQ7XHJcbiAgICBpZiAoIXVzZXJQb29sSWQpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdDT0dOSVRPX1VTRVJfUE9PTF9JRCBub3QgY29uZmlndXJlZCcsIHsgY29ycmVsYXRpb25JZCB9IGFzIGFueSk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0NPTkZJR19FUlJPUicsICdBdXRoZW50aWNhdGlvbiBzZXJ2aWNlIGNvbmZpZ3VyYXRpb24gZXJyb3InLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnQXR0ZW1wdGluZyB0byByZWdpc3RlciB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgbmFtZTogcmVxdWVzdC5uYW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiB1c2VyIGFscmVhZHkgZXhpc3RzXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBjb2duaXRvLnNlbmQobmV3IEFkbWluR2V0VXNlckNvbW1hbmQoe1xyXG4gICAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgLy8gVXNlciBleGlzdHNcclxuICAgICAgbG9nZ2VyLndhcm4oJ1VzZXIgYWxyZWFkeSBleGlzdHMnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwOSwgJ1VTRVJfRVhJU1RTJywgJ1VzZXIgd2l0aCB0aGlzIGVtYWlsIGFscmVhZHkgZXhpc3RzJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lICE9PSAnVXNlck5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcbiAgICAgIC8vIFVzZXIgZG9lc24ndCBleGlzdCwgY29udGludWUgd2l0aCByZWdpc3RyYXRpb25cclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgdXNlciB3aXRoIHRlbXBvcmFyeSBwYXNzd29yZFxyXG4gICAgY29uc3QgdGVtcFBhc3N3b3JkID0gZ2VuZXJhdGVUZW1wb3JhcnlQYXNzd29yZCgpO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnQ3JlYXRpbmcgQ29nbml0byB1c2VyJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgcGFzc3dvcmRQcm92aWRlZDogISFyZXF1ZXN0LnBhc3N3b3JkXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVVc2VyUmVzcG9uc2UgPSBhd2FpdCBjb2duaXRvLnNlbmQobmV3IEFkbWluQ3JlYXRlVXNlckNvbW1hbmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgVGVtcG9yYXJ5UGFzc3dvcmQ6IHRlbXBQYXNzd29yZCxcclxuICAgICAgVXNlckF0dHJpYnV0ZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBOYW1lOiAnZW1haWwnLFxyXG4gICAgICAgICAgVmFsdWU6IHJlcXVlc3QuZW1haWxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICdlbWFpbF92ZXJpZmllZCcsXHJcbiAgICAgICAgICBWYWx1ZTogJ2ZhbHNlJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ25hbWUnLFxyXG4gICAgICAgICAgVmFsdWU6IHJlcXVlc3QubmFtZSB8fCByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBOYW1lOiAnY3VzdG9tOm90cEVuYWJsZWQnLFxyXG4gICAgICAgICAgVmFsdWU6ICdmYWxzZSdcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgIE1lc3NhZ2VBY3Rpb246ICdTVVBQUkVTUycgLy8gRG9uJ3Qgc2VuZCB3ZWxjb21lIGVtYWlsIHlldFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbnN0IHVzZXJJZCA9IGNyZWF0ZVVzZXJSZXNwb25zZS5Vc2VyPy5Vc2VybmFtZTtcclxuICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNyZWF0ZSB1c2VyIC0gbm8gdXNlciBJRCByZXR1cm5lZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZXQgcGVybWFuZW50IHBhc3N3b3JkIGlmIHByb3ZpZGVkLCBvdGhlcndpc2UgdXNlIHRlbXBvcmFyeSBwYXNzd29yZFxyXG4gICAgY29uc3QgZmluYWxQYXNzd29yZCA9IHJlcXVlc3QucGFzc3dvcmQgfHwgdGVtcFBhc3N3b3JkO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnU2V0dGluZyBwZXJtYW5lbnQgcGFzc3dvcmQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgaXNDdXN0b21QYXNzd29yZDogISFyZXF1ZXN0LnBhc3N3b3JkXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBjb2duaXRvLnNlbmQobmV3IEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCh7XHJcbiAgICAgIFVzZXJQb29sSWQ6IHVzZXJQb29sSWQsXHJcbiAgICAgIFVzZXJuYW1lOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICBQYXNzd29yZDogZmluYWxQYXNzd29yZCxcclxuICAgICAgUGVybWFuZW50OiB0cnVlXHJcbiAgICB9KSk7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1Blcm1hbmVudCBwYXNzd29yZCBzZXQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgYW5kIHNlbmQgT1RQIHZpYSBlbWFpbFxyXG4gICAgY29uc3Qgb3RwID0gZ2VuZXJhdGVPVFAoKTtcclxuICAgIGNvbnN0IG90cFRhYmxlTmFtZSA9IHByb2Nlc3MuZW52Lk9UUF9UQUJMRV9OQU1FIHx8ICdPVFAnO1xyXG4gICAgY29uc3Qgb3RwRXhwaXJhdGlvblRpbWUgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSArICgxMCAqIDYwKTsgLy8gMTAgbWludXRlcyBmcm9tIG5vd1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIE9UUCBmb3IgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIG90cFRhYmxlTmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgT1RQIGluIER5bmFtb0RCXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBvdHBUYWJsZU5hbWUsXHJcbiAgICAgICAgSXRlbToge1xyXG4gICAgICAgICAgb3RwSWQ6IGAke3JlcXVlc3QuZW1haWx9LSR7RGF0ZS5ub3coKX1gLFxyXG4gICAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgICBvdHA6IG90cCxcclxuICAgICAgICAgIGNyZWF0ZWRBdDogRGF0ZS5ub3coKSxcclxuICAgICAgICAgIHR0bDogb3RwRXhwaXJhdGlvblRpbWUsXHJcbiAgICAgICAgICB1c2VySWQ6IHVzZXJJZFxyXG4gICAgICAgIH1cclxuICAgICAgfSkpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnT1RQIHN0b3JlZCBpbiBEeW5hbW9EQicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZGJFcnJvcikge1xyXG4gICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHN0b3JlIE9UUCBpbiBEeW5hbW9EQicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVycm9yOiAoZGJFcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIENvbnRpbnVlIGFueXdheSAtIHdlJ2xsIHN0aWxsIHNlbmQgdGhlIE9UUCB2aWEgZW1haWxcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZW5kIE9UUCB2aWEgZW1haWxcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHNlbmRPVFBFbWFpbChyZXF1ZXN0LmVtYWlsLCBvdHAsIHJlcXVlc3QubmFtZSB8fCByZXF1ZXN0LmVtYWlsLCBjb3JyZWxhdGlvbklkKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ09UUCBlbWFpbCBzZW50IHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAoZW1haWxFcnJvcikge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBzZW5kIE9UUCBlbWFpbCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIGVycm9yOiAoZW1haWxFcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIERvbid0IGZhaWwgcmVnaXN0cmF0aW9uIGlmIGVtYWlsIGZhaWxzIC0gdXNlciBjYW4gcmVxdWVzdCBPVFAgbGF0ZXJcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdG9yZSB0ZW1wb3JhcnkgcGFzc3dvcmQgaW4gRHluYW1vREIgZm9yIGF1dG8tbG9naW5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVzZXJzVGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuVVNFUlNfVEFCTEVfTkFNRSB8fCAnbWlzcmEtdXNlcnMnO1xyXG4gICAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB1c2Vyc1RhYmxlTmFtZSxcclxuICAgICAgICBJdGVtOiB7XHJcbiAgICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICAgIHVzZXJJZDogdXNlcklkLFxyXG4gICAgICAgICAgdGVtcFBhc3N3b3JkOiBmaW5hbFBhc3N3b3JkLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgbmFtZTogcmVxdWVzdC5uYW1lIHx8IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgICBvdHBWZXJpZmllZDogZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1N0b3JlZCB1c2VyIGNyZWRlbnRpYWxzIGluIER5bmFtb0RCJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChkYkVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gc3RvcmUgY3JlZGVudGlhbHMgaW4gRHluYW1vREInLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlcnJvcjogKGRiRXJyb3IgYXMgYW55KS5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgICAvLyBDb250aW51ZSBhbnl3YXkgLSBEeW5hbW9EQiBzdG9yYWdlIGlzIG9wdGlvbmFsIGZvciBhdXRvLWxvZ2luIGZhbGxiYWNrXHJcbiAgICB9XHJcblxyXG4gICAgLy8gTm90ZTogU09GVFdBUkVfVE9LRU5fTUZBIHdpbGwgYmUgc2V0IHVwIGR1cmluZyB0aGUgbG9naW4vT1RQIHZlcmlmaWNhdGlvbiBmbG93XHJcbiAgICAvLyBUaGUgdXNlciBuZWVkcyB0byBhc3NvY2lhdGUgYSBzb2Z0d2FyZSB0b2tlbiBmaXJzdCBiZWZvcmUgd2UgY2FuIHNldCBNRkEgcHJlZmVyZW5jZVxyXG4gICAgLy8gVGhpcyBpcyBoYW5kbGVkIGluIHRoZSB2ZXJpZnktb3RwIExhbWJkYSBmdW5jdGlvblxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIHJlZ2lzdHJhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogUmVnaXN0ZXJSZXNwb25zZSA9IHtcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgbWVzc2FnZTogJ1VzZXIgcmVnaXN0ZXJlZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbCBhbmQgc2V0IHVwIE1GQS4nLFxyXG4gICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIHJlZ2lzdHJhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDEsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignVXNlciByZWdpc3RyYXRpb24gZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgbmFtZTogZXJyb3IubmFtZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBIYW5kbGUgc3BlY2lmaWMgQ29nbml0byBlcnJvcnNcclxuICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlcm5hbWVFeGlzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwOSwgJ1VTRVJfRVhJU1RTJywgJ1VzZXIgd2l0aCB0aGlzIGVtYWlsIGFscmVhZHkgZXhpc3RzJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yLm5hbWUgPT09ICdJbnZhbGlkUGFzc3dvcmRFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfUEFTU1dPUkQnLCBlcnJvci5tZXNzYWdlLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IubmFtZSA9PT0gJ1Rvb01hbnlSZXF1ZXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDI5LCAnVE9PX01BTllfUkVRVUVTVFMnLCAnVG9vIG1hbnkgcmVnaXN0cmF0aW9uIGF0dGVtcHRzLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ1JFR0lTVFJBVElPTl9GQUlMRUQnLCBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gcmVnaXN0ZXIgdXNlcicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBhIDYtZGlnaXQgT1RQXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5lcmF0ZU9UUCgpOiBzdHJpbmcge1xyXG4gIHJldHVybiBNYXRoLmZsb29yKDEwMDAwMCArIE1hdGgucmFuZG9tKCkgKiA5MDAwMDApLnRvU3RyaW5nKCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBhIHRlbXBvcmFyeSBwYXNzd29yZCB0aGF0IG1lZXRzIENvZ25pdG8gcmVxdWlyZW1lbnRzXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5lcmF0ZVRlbXBvcmFyeVBhc3N3b3JkKCk6IHN0cmluZyB7XHJcbiAgY29uc3QgdXBwZXJjYXNlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaJztcclxuICBjb25zdCBsb3dlcmNhc2UgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonO1xyXG4gIGNvbnN0IGRpZ2l0cyA9ICcwMTIzNDU2Nzg5JztcclxuICBjb25zdCBzeW1ib2xzID0gJyFAIyQlXiYqJztcclxuXHJcbiAgbGV0IHBhc3N3b3JkID0gJyc7XHJcbiAgcGFzc3dvcmQgKz0gdXBwZXJjYXNlW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHVwcGVyY2FzZS5sZW5ndGgpXTtcclxuICBwYXNzd29yZCArPSBsb3dlcmNhc2VbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbG93ZXJjYXNlLmxlbmd0aCldO1xyXG4gIHBhc3N3b3JkICs9IGRpZ2l0c1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkaWdpdHMubGVuZ3RoKV07XHJcbiAgcGFzc3dvcmQgKz0gc3ltYm9sc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBzeW1ib2xzLmxlbmd0aCldO1xyXG5cclxuICAvLyBBZGQgcmFuZG9tIGNoYXJhY3RlcnMgdG8gcmVhY2ggbWluaW11bSBsZW5ndGhcclxuICBjb25zdCBhbGxDaGFycyA9IHVwcGVyY2FzZSArIGxvd2VyY2FzZSArIGRpZ2l0cyArIHN5bWJvbHM7XHJcbiAgZm9yIChsZXQgaSA9IHBhc3N3b3JkLmxlbmd0aDsgaSA8IDEyOyBpKyspIHtcclxuICAgIHBhc3N3b3JkICs9IGFsbENoYXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFsbENoYXJzLmxlbmd0aCldO1xyXG4gIH1cclxuXHJcbiAgLy8gU2h1ZmZsZSBwYXNzd29yZFxyXG4gIHJldHVybiBwYXNzd29yZC5zcGxpdCgnJykuc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KS5qb2luKCcnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNlbmQgT1RQIHZpYSBlbWFpbCB1c2luZyBBV1MgU0VTXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzZW5kT1RQRW1haWwoXHJcbiAgZW1haWw6IHN0cmluZyxcclxuICBvdHA6IHN0cmluZyxcclxuICB1c2VyTmFtZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBodG1sQ29udGVudCA9IGBcclxuICAgIDwhRE9DVFlQRSBodG1sPlxyXG4gICAgPGh0bWw+XHJcbiAgICAgIDxoZWFkPlxyXG4gICAgICAgIDxzdHlsZT5cclxuICAgICAgICAgIGJvZHkgeyBmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IGJhY2tncm91bmQtY29sb3I6ICNmNWY1ZjU7IH1cclxuICAgICAgICAgIC5jb250YWluZXIgeyBtYXgtd2lkdGg6IDYwMHB4OyBtYXJnaW46IDAgYXV0bzsgYmFja2dyb3VuZC1jb2xvcjogd2hpdGU7IHBhZGRpbmc6IDIwcHg7IGJvcmRlci1yYWRpdXM6IDhweDsgfVxyXG4gICAgICAgICAgLmhlYWRlciB7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICM3YjYxZmY7IG1hcmdpbi1ib3R0b206IDIwcHg7IH1cclxuICAgICAgICAgIC5vdHAtYm94IHsgYmFja2dyb3VuZC1jb2xvcjogI2YwZjBmMDsgcGFkZGluZzogMjBweDsgdGV4dC1hbGlnbjogY2VudGVyOyBib3JkZXItcmFkaXVzOiA4cHg7IG1hcmdpbjogMjBweCAwOyB9XHJcbiAgICAgICAgICAub3RwLWNvZGUgeyBmb250LXNpemU6IDMycHg7IGZvbnQtd2VpZ2h0OiBib2xkOyBjb2xvcjogIzdiNjFmZjsgbGV0dGVyLXNwYWNpbmc6IDVweDsgZm9udC1mYW1pbHk6IG1vbm9zcGFjZTsgfVxyXG4gICAgICAgICAgLmZvb3RlciB7IHRleHQtYWxpZ246IGNlbnRlcjsgY29sb3I6ICM5OTk7IGZvbnQtc2l6ZTogMTJweDsgbWFyZ2luLXRvcDogMjBweDsgfVxyXG4gICAgICAgIDwvc3R5bGU+XHJcbiAgICAgIDwvaGVhZD5cclxuICAgICAgPGJvZHk+XHJcbiAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgPGRpdiBjbGFzcz1cImhlYWRlclwiPlxyXG4gICAgICAgICAgICA8aDI+8J+UkCBNSVNSQSBQbGF0Zm9ybSAtIE9UUCBWZXJpZmljYXRpb248L2gyPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxwPkhpICR7dXNlck5hbWV9LDwvcD5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHA+WW91ciBPbmUtVGltZSBQYXNzd29yZCAoT1RQKSBmb3IgTUlTUkEgUGxhdGZvcm0gaXM6PC9wPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwib3RwLWJveFwiPlxyXG4gICAgICAgICAgICA8ZGl2IGNsYXNzPVwib3RwLWNvZGVcIj4ke290cH08L2Rpdj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8cD48c3Ryb25nPuKPsCBUaGlzIGNvZGUgd2lsbCBleHBpcmUgaW4gMTAgbWludXRlcy48L3N0cm9uZz48L3A+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxwPklmIHlvdSBkaWRuJ3QgcmVxdWVzdCB0aGlzIGNvZGUsIHBsZWFzZSBpZ25vcmUgdGhpcyBlbWFpbCBhbmQgeW91ciBhY2NvdW50IHdpbGwgcmVtYWluIHNlY3VyZS48L3A+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxociBzdHlsZT1cImJvcmRlcjogbm9uZTsgYm9yZGVyLXRvcDogMXB4IHNvbGlkICNlZWU7IG1hcmdpbjogMjBweCAwO1wiPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8ZGl2IGNsYXNzPVwiZm9vdGVyXCI+XHJcbiAgICAgICAgICAgIDxwPk1JU1JBIENvbXBsaWFuY2UgUGxhdGZvcm08L3A+XHJcbiAgICAgICAgICAgIDxwPkF1dG9tYXRlZCBDb2RlIEFuYWx5c2lzICYgQ29tcGxpYW5jZSBWZXJpZmljYXRpb248L3A+XHJcbiAgICAgICAgICAgIDxwPsKpIDIwMjYgLSBBbGwgcmlnaHRzIHJlc2VydmVkPC9wPlxyXG4gICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgPC9kaXY+XHJcbiAgICAgIDwvYm9keT5cclxuICAgIDwvaHRtbD5cclxuICBgO1xyXG5cclxuICBjb25zdCB0ZXh0Q29udGVudCA9IGBcclxuTUlTUkEgUGxhdGZvcm0gLSBPVFAgVmVyaWZpY2F0aW9uXHJcblxyXG5IaSAke3VzZXJOYW1lfSxcclxuXHJcbllvdXIgT25lLVRpbWUgUGFzc3dvcmQgKE9UUCkgZm9yIE1JU1JBIFBsYXRmb3JtIGlzOlxyXG5cclxuJHtvdHB9XHJcblxyXG7ij7AgVGhpcyBjb2RlIHdpbGwgZXhwaXJlIGluIDEwIG1pbnV0ZXMuXHJcblxyXG5JZiB5b3UgZGlkbid0IHJlcXVlc3QgdGhpcyBjb2RlLCBwbGVhc2UgaWdub3JlIHRoaXMgZW1haWwgYW5kIHlvdXIgYWNjb3VudCB3aWxsIHJlbWFpbiBzZWN1cmUuXHJcblxyXG4tLS1cclxuTUlTUkEgQ29tcGxpYW5jZSBQbGF0Zm9ybVxyXG5BdXRvbWF0ZWQgQ29kZSBBbmFseXNpcyAmIENvbXBsaWFuY2UgVmVyaWZpY2F0aW9uXHJcbsKpIDIwMjYgLSBBbGwgcmlnaHRzIHJlc2VydmVkXHJcbiAgYDtcclxuXHJcbiAgY29uc3QgcGFyYW1zID0ge1xyXG4gICAgU291cmNlOiBwcm9jZXNzLmVudi5TRVNfRlJPTV9FTUFJTCB8fCAnbm9yZXBseUBtaXNyYS1wbGF0Zm9ybS5jb20nLFxyXG4gICAgRGVzdGluYXRpb246IHtcclxuICAgICAgVG9BZGRyZXNzZXM6IFtlbWFpbF0sXHJcbiAgICB9LFxyXG4gICAgTWVzc2FnZToge1xyXG4gICAgICBTdWJqZWN0OiB7XHJcbiAgICAgICAgRGF0YTogJ1lvdXIgTUlTUkEgUGxhdGZvcm0gT1RQIENvZGUnLFxyXG4gICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIEJvZHk6IHtcclxuICAgICAgICBIdG1sOiB7XHJcbiAgICAgICAgICBEYXRhOiBodG1sQ29udGVudCxcclxuICAgICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBUZXh0OiB7XHJcbiAgICAgICAgICBEYXRhOiB0ZXh0Q29udGVudCxcclxuICAgICAgICAgIENoYXJzZXQ6ICdVVEYtOCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgfTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IHNlc0NsaWVudC5zZW5kKG5ldyBTZW5kRW1haWxDb21tYW5kKHBhcmFtcyBhcyBhbnkpKTtcclxuICAgIGxvZ2dlci5pbmZvKCdPVFAgZW1haWwgc2VudCB2aWEgU0VTJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbFxyXG4gICAgfSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHNlbmQgT1RQIGVtYWlsIHZpYSBTRVMnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsLFxyXG4gICAgICBlcnJvcjogKGVycm9yIGFzIGFueSkubWVzc2FnZVxyXG4gICAgfSk7XHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==