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
const validation_1 = require("../../utils/validation");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('Register');
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
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
                    name: request.name || request.email
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHOzs7QUFHSCxnR0FBb0s7QUFDcEssOERBQTBEO0FBQzFELHdEQUFtRDtBQUNuRCx1REFBeUU7QUFDekUsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFDeEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQ3JHLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBZXBGLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuRyxJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFO1lBQ2hELGFBQWE7WUFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVO1NBQ3pCLENBQUMsQ0FBQztRQUVILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsMEJBQTBCLEVBQUUsYUFBYSxD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LEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUVELG1CQUFtQjtJQUNuQixPQUFPLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDckUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlLEVBQ2YsYUFBcUI7SUFFckIsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUUsa0JBQVc7UUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxhQUFhO2FBQ3pCO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFJlZ2lzdGVyIExhbWJkYSBGdW5jdGlvblxyXG4gKiBcclxuICogSGFuZGxlcyB1c2VyIHJlZ2lzdHJhdGlvbiB3aXRoIEFXUyBDb2duaXRvXHJcbiAqIENyZWF0ZXMgYSBuZXcgdXNlciB3aXRoIFNPRlRXQVJFX1RPS0VOX01GQSBlbmFibGVkIGZvciBUT1RQIHN1cHBvcnRcclxuICogXHJcbiAqIFJlcXVlc3Q6XHJcbiAqIHtcclxuICogICBcImVtYWlsXCI6IFwidXNlckBleGFtcGxlLmNvbVwiLFxyXG4gKiAgIFwicGFzc3dvcmRcIjogXCJTZWN1cmVQYXNzd29yZDEyMyFcIixcclxuICogICBcIm5hbWVcIjogXCJKb2huIERvZVwiXHJcbiAqIH1cclxuICogXHJcbiAqIFJlc3BvbnNlOlxyXG4gKiB7XHJcbiAqICAgXCJ1c2VySWRcIjogXCJjb2duaXRvLXVzZXItaWRcIixcclxuICogICBcImVtYWlsXCI6IFwidXNlckBleGFtcGxlLmNvbVwiLFxyXG4gKiAgIFwibWVzc2FnZVwiOiBcIlVzZXIgcmVnaXN0ZXJlZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbC5cIixcclxuICogICBcInJlcXVpcmVzRW1haWxWZXJpZmljYXRpb25cIjogdHJ1ZVxyXG4gKiB9XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCwgQWRtaW5DcmVhdGVVc2VyQ29tbWFuZCwgQWRtaW5TZXRVc2VyUGFzc3dvcmRDb21tYW5kLCBBZG1pbkdldFVzZXJDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFB1dENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZUVtYWlsLCB2YWxpZGF0ZVBhc3N3b3JkIH0gZnJvbSAnLi4vLi4vdXRpbHMvdmFsaWRhdGlvbic7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ1JlZ2lzdGVyJyk7XHJcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGZvciBwYXNzd29yZGxlc3MgZmxvd1xyXG4gIG5hbWU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlc3BvbnNlIHtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciByZWdpc3RyYXRpb24gcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogUmVnaXN0ZXJSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0VNQUlMJywgJ0VtYWlsIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdQbGVhc2UgcHJvdmlkZSBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBwYXNzd29yZCBpcyBwcm92aWRlZCwgdmFsaWRhdGUgaXRcclxuICAgIGlmIChyZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIGNvbnN0IHBhc3N3b3JkVmFsaWRhdGlvbiA9IHZhbGlkYXRlUGFzc3dvcmQocmVxdWVzdC5wYXNzd29yZCk7XHJcbiAgICAgIGlmICghcGFzc3dvcmRWYWxpZGF0aW9uLmlzVmFsaWQpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdXRUFLX1BBU1NXT1JEJywgcGFzc3dvcmRWYWxpZGF0aW9uLm1lc3NhZ2UsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEO1xyXG4gICAgaWYgKCF1c2VyUG9vbElkKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignQ09HTklUT19VU0VSX1BPT0xfSUQgbm90IGNvbmZpZ3VyZWQnLCB7IGNvcnJlbGF0aW9uSWQgfSBhcyBhbnkpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdDT05GSUdfRVJST1InLCAnQXV0aGVudGljYXRpb24gc2VydmljZSBjb25maWd1cmF0aW9uIGVycm9yJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0F0dGVtcHRpbmcgdG8gcmVnaXN0ZXIgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIG5hbWU6IHJlcXVlc3QubmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IGV4aXN0c1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIFVzZXIgZXhpc3RzXHJcbiAgICAgIGxvZ2dlci53YXJuKCdVc2VyIGFscmVhZHkgZXhpc3RzJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDksICdVU0VSX0VYSVNUUycsICdVc2VyIHdpdGggdGhpcyBlbWFpbCBhbHJlYWR5IGV4aXN0cycsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgICAvLyBVc2VyIGRvZXNuJ3QgZXhpc3QsIGNvbnRpbnVlIHdpdGggcmVnaXN0cmF0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIHVzZXIgd2l0aCB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQoKTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0NyZWF0aW5nIENvZ25pdG8gdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHBhc3N3b3JkUHJvdmlkZWQ6ICEhcmVxdWVzdC5wYXNzd29yZFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVXNlclJlc3BvbnNlID0gYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2VtYWlsJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLFxyXG4gICAgICAgICAgVmFsdWU6ICdmYWxzZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICduYW1lJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0Lm5hbWUgfHwgcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpvdHBFbmFibGVkJyxcclxuICAgICAgICAgIFZhbHVlOiAnZmFsc2UnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnIC8vIERvbid0IHNlbmQgd2VsY29tZSBlbWFpbCB5ZXRcclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCB1c2VySWQgPSBjcmVhdGVVc2VyUmVzcG9uc2UuVXNlcj8uVXNlcm5hbWU7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdXNlciAtIG5vIHVzZXIgSUQgcmV0dXJuZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IGZpbmFsUGFzc3dvcmQgPSByZXF1ZXN0LnBhc3N3b3JkIHx8IHRlbXBQYXNzd29yZDtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1NldHRpbmcgcGVybWFuZW50IHBhc3N3b3JkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGlzQ3VzdG9tUGFzc3dvcmQ6ICEhcmVxdWVzdC5wYXNzd29yZFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgUGFzc3dvcmQ6IGZpbmFsUGFzc3dvcmQsXHJcbiAgICAgIFBlcm1hbmVudDogdHJ1ZVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdQZXJtYW5lbnQgcGFzc3dvcmQgc2V0Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIHRlbXBvcmFyeSBwYXNzd29yZCBpbiBEeW5hbW9EQiBmb3IgYXV0by1sb2dpblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlcnNUYWJsZU5hbWUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FIHx8ICdtaXNyYS11c2Vycyc7XHJcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHVzZXJzVGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IHtcclxuICAgICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgICAgdXNlcklkOiB1c2VySWQsXHJcbiAgICAgICAgICB0ZW1wUGFzc3dvcmQ6IGZpbmFsUGFzc3dvcmQsXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXHJcbiAgICAgICAgICBuYW1lOiByZXF1ZXN0Lm5hbWUgfHwgcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH1cclxuICAgICAgfSkpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnU3RvcmVkIHVzZXIgY3JlZGVudGlhbHMgaW4gRHluYW1vREInLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKGRiRXJyb3IpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBzdG9yZSBjcmVkZW50aWFscyBpbiBEeW5hbW9EQicsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVycm9yOiAoZGJFcnJvciBhcyBhbnkpLm1lc3NhZ2VcclxuICAgICAgfSk7XHJcbiAgICAgIC8vIENvbnRpbnVlIGFueXdheSAtIER5bmFtb0RCIHN0b3JhZ2UgaXMgb3B0aW9uYWwgZm9yIGF1dG8tbG9naW4gZmFsbGJhY2tcclxuICAgIH1cclxuXHJcbiAgICAvLyBOb3RlOiBTT0ZUV0FSRV9UT0tFTl9NRkEgd2lsbCBiZSBzZXQgdXAgZHVyaW5nIHRoZSBsb2dpbi9PVFAgdmVyaWZpY2F0aW9uIGZsb3dcclxuICAgIC8vIFRoZSB1c2VyIG5lZWRzIHRvIGFzc29jaWF0ZSBhIHNvZnR3YXJlIHRva2VuIGZpcnN0IGJlZm9yZSB3ZSBjYW4gc2V0IE1GQSBwcmVmZXJlbmNlXHJcbiAgICAvLyBUaGlzIGlzIGhhbmRsZWQgaW4gdGhlIHZlcmlmeS1vdHAgTGFtYmRhIGZ1bmN0aW9uXHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1VzZXIgcmVnaXN0cmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBSZWdpc3RlclJlc3BvbnNlID0ge1xyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICBtZXNzYWdlOiAnVXNlciByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseS4gUGxlYXNlIHZlcmlmeSB5b3VyIGVtYWlsIGFuZCBzZXQgdXAgTUZBLicsXHJcbiAgICAgIHJlcXVpcmVzRW1haWxWZXJpZmljYXRpb246IHRydWVcclxuICAgIH07XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1VzZXIgcmVnaXN0cmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMSxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdVc2VyIHJlZ2lzdHJhdGlvbiBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBuYW1lOiBlcnJvci5uYW1lLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhhbmRsZSBzcGVjaWZpYyBDb2duaXRvIGVycm9yc1xyXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdVc2VybmFtZUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA5LCAnVVNFUl9FWElTVFMnLCAnVXNlciB3aXRoIHRoaXMgZW1haWwgYWxyZWFkeSBleGlzdHMnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IubmFtZSA9PT0gJ0ludmFsaWRQYXNzd29yZEV4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9QQVNTV09SRCcsIGVycm9yLm1lc3NhZ2UsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfSBlbHNlIGlmIChlcnJvci5uYW1lID09PSAnVG9vTWFueVJlcXVlc3RzRXhjZXB0aW9uJykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MjksICdUT09fTUFOWV9SRVFVRVNUUycsICdUb28gbWFueSByZWdpc3RyYXRpb24gYXR0ZW1wdHMuIFBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnUkVHSVNUUkFUSU9OX0ZBSUxFRCcsIGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byByZWdpc3RlciB1c2VyJywgY29ycmVsYXRpb25JZCk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIGEgdGVtcG9yYXJ5IHBhc3N3b3JkIHRoYXQgbWVldHMgQ29nbml0byByZXF1aXJlbWVudHNcclxuICovXHJcbmZ1bmN0aW9uIGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQoKTogc3RyaW5nIHtcclxuICBjb25zdCB1cHBlcmNhc2UgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVonO1xyXG4gIGNvbnN0IGxvd2VyY2FzZSA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eic7XHJcbiAgY29uc3QgZGlnaXRzID0gJzAxMjM0NTY3ODknO1xyXG4gIGNvbnN0IHN5bWJvbHMgPSAnIUAjJCVeJionO1xyXG5cclxuICBsZXQgcGFzc3dvcmQgPSAnJztcclxuICBwYXNzd29yZCArPSB1cHBlcmNhc2VbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdXBwZXJjYXNlLmxlbmd0aCldO1xyXG4gIHBhc3N3b3JkICs9IGxvd2VyY2FzZVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBsb3dlcmNhc2UubGVuZ3RoKV07XHJcbiAgcGFzc3dvcmQgKz0gZGlnaXRzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGRpZ2l0cy5sZW5ndGgpXTtcclxuICBwYXNzd29yZCArPSBzeW1ib2xzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHN5bWJvbHMubGVuZ3RoKV07XHJcblxyXG4gIC8vIEFkZCByYW5kb20gY2hhcmFjdGVycyB0byByZWFjaCBtaW5pbXVtIGxlbmd0aFxyXG4gIGNvbnN0IGFsbENoYXJzID0gdXBwZXJjYXNlICsgbG93ZXJjYXNlICsgZGlnaXRzICsgc3ltYm9scztcclxuICBmb3IgKGxldCBpID0gcGFzc3dvcmQubGVuZ3RoOyBpIDwgMTI7IGkrKykge1xyXG4gICAgcGFzc3dvcmQgKz0gYWxsQ2hhcnNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYWxsQ2hhcnMubGVuZ3RoKV07XHJcbiAgfVxyXG5cclxuICAvLyBTaHVmZmxlIHBhc3N3b3JkXHJcbiAgcmV0dXJuIHBhc3N3b3JkLnNwbGl0KCcnKS5zb3J0KCgpID0+IE1hdGgucmFuZG9tKCkgLSAwLjUpLmpvaW4oJycpO1xyXG59XHJcblxyXG4vKipcclxuICogU3RhbmRhcmQgZXJyb3IgcmVzcG9uc2VcclxuICovXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufVxyXG4iXX0=