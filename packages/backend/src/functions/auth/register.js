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
            await dynamoClient.send(new client_dynamodb_1.PutCommand({
                TableName: usersTableName,
                Item: {
                    email: { S: request.email },
                    userId: { S: userId },
                    tempPassword: { S: finalPassword },
                    createdAt: { N: Date.now().toString() },
                    name: { S: request.name || request.email }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHOzs7QUFHSCxnR0FBb0s7QUFDcEssOERBQXNFO0FBQ3RFLHVEQUF5RTtBQUN6RSwyQ0FBK0M7QUFDL0MsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxVQUFVLENBQUMsQ0FBQztBQUN4QyxNQUFNLE9BQU8sR0FBRyxJQUFJLGdFQUE2QixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFDckcsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFlcEYsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLElBQUksQ0FBQztRQUNILE1BQU0sQ0FBQyxJQUFJLENBQUMsb0NBQW9DLEVBQUU7WUFDaEQsYUFBYTtZQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7U0FDekIsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2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QUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUMxQyxRQUFRLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3BFLENBQUM7SUFFRCxtQkFBbUI7SUFDbkIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3JFLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZSxFQUNmLGFBQXFCO0lBRXJCLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFLGtCQUFXO1FBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsYUFBYTthQUN6QjtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBSZWdpc3RlciBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIEhhbmRsZXMgdXNlciByZWdpc3RyYXRpb24gd2l0aCBBV1MgQ29nbml0b1xyXG4gKiBDcmVhdGVzIGEgbmV3IHVzZXIgd2l0aCBTT0ZUV0FSRV9UT0tFTl9NRkEgZW5hYmxlZCBmb3IgVE9UUCBzdXBwb3J0XHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiB7XHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICBcInBhc3N3b3JkXCI6IFwiU2VjdXJlUGFzc3dvcmQxMjMhXCIsXHJcbiAqICAgXCJuYW1lXCI6IFwiSm9obiBEb2VcIlxyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwidXNlcklkXCI6IFwiY29nbml0by11c2VyLWlkXCIsXHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIixcclxuICogICBcIm1lc3NhZ2VcIjogXCJVc2VyIHJlZ2lzdGVyZWQgc3VjY2Vzc2Z1bGx5LiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwuXCIsXHJcbiAqICAgXCJyZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uXCI6IHRydWVcclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQsIEFkbWluQ3JlYXRlVXNlckNvbW1hbmQsIEFkbWluU2V0VXNlclBhc3N3b3JkQ29tbWFuZCwgQWRtaW5HZXRVc2VyQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1jb2duaXRvLWlkZW50aXR5LXByb3ZpZGVyJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFB1dENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZUVtYWlsLCB2YWxpZGF0ZVBhc3N3b3JkIH0gZnJvbSAnLi4vLi4vdXRpbHMvdmFsaWRhdGlvbic7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ1JlZ2lzdGVyJyk7XHJcbmNvbnN0IGNvZ25pdG8gPSBuZXcgQ29nbml0b0lkZW50aXR5UHJvdmlkZXJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGZvciBwYXNzd29yZGxlc3MgZmxvd1xyXG4gIG5hbWU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlc3BvbnNlIHtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciByZWdpc3RyYXRpb24gcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogUmVnaXN0ZXJSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0VNQUlMJywgJ0VtYWlsIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdQbGVhc2UgcHJvdmlkZSBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBwYXNzd29yZCBpcyBwcm92aWRlZCwgdmFsaWRhdGUgaXRcclxuICAgIGlmIChyZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIGNvbnN0IHBhc3N3b3JkVmFsaWRhdGlvbiA9IHZhbGlkYXRlUGFzc3dvcmQocmVxdWVzdC5wYXNzd29yZCk7XHJcbiAgICAgIGlmICghcGFzc3dvcmRWYWxpZGF0aW9uLmlzVmFsaWQpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdXRUFLX1BBU1NXT1JEJywgcGFzc3dvcmRWYWxpZGF0aW9uLm1lc3NhZ2UsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEO1xyXG4gICAgaWYgKCF1c2VyUG9vbElkKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignQ09HTklUT19VU0VSX1BPT0xfSUQgbm90IGNvbmZpZ3VyZWQnLCB7IGNvcnJlbGF0aW9uSWQgfSBhcyBhbnkpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdDT05GSUdfRVJST1InLCAnQXV0aGVudGljYXRpb24gc2VydmljZSBjb25maWd1cmF0aW9uIGVycm9yJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0F0dGVtcHRpbmcgdG8gcmVnaXN0ZXIgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIG5hbWU6IHJlcXVlc3QubmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IGV4aXN0c1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIFVzZXIgZXhpc3RzXHJcbiAgICAgIGxvZ2dlci53YXJuKCdVc2VyIGFscmVhZHkgZXhpc3RzJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDksICdVU0VSX0VYSVNUUycsICdVc2VyIHdpdGggdGhpcyBlbWFpbCBhbHJlYWR5IGV4aXN0cycsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgICAvLyBVc2VyIGRvZXNuJ3QgZXhpc3QsIGNvbnRpbnVlIHdpdGggcmVnaXN0cmF0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIHVzZXIgd2l0aCB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQoKTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0NyZWF0aW5nIENvZ25pdG8gdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHBhc3N3b3JkUHJvdmlkZWQ6ICEhcmVxdWVzdC5wYXNzd29yZFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVXNlclJlc3BvbnNlID0gYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2VtYWlsJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLFxyXG4gICAgICAgICAgVmFsdWU6ICdmYWxzZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICduYW1lJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0Lm5hbWUgfHwgcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpvdHBFbmFibGVkJyxcclxuICAgICAgICAgIFZhbHVlOiAnZmFsc2UnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnIC8vIERvbid0IHNlbmQgd2VsY29tZSBlbWFpbCB5ZXRcclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCB1c2VySWQgPSBjcmVhdGVVc2VyUmVzcG9uc2UuVXNlcj8uVXNlcm5hbWU7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdXNlciAtIG5vIHVzZXIgSUQgcmV0dXJuZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IGZpbmFsUGFzc3dvcmQgPSByZXF1ZXN0LnBhc3N3b3JkIHx8IHRlbXBQYXNzd29yZDtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1NldHRpbmcgcGVybWFuZW50IHBhc3N3b3JkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGlzQ3VzdG9tUGFzc3dvcmQ6ICEhcmVxdWVzdC5wYXNzd29yZFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgUGFzc3dvcmQ6IGZpbmFsUGFzc3dvcmQsXHJcbiAgICAgIFBlcm1hbmVudDogdHJ1ZVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdQZXJtYW5lbnQgcGFzc3dvcmQgc2V0Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIHRlbXBvcmFyeSBwYXNzd29yZCBpbiBEeW5hbW9EQiBmb3IgYXV0by1sb2dpblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXNlcnNUYWJsZU5hbWUgPSBwcm9jZXNzLmVudi5VU0VSU19UQUJMRV9OQU1FIHx8ICdtaXNyYS11c2Vycyc7XHJcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHVzZXJzVGFibGVOYW1lLFxyXG4gICAgICAgIEl0ZW06IHtcclxuICAgICAgICAgIGVtYWlsOiB7IFM6IHJlcXVlc3QuZW1haWwgfSxcclxuICAgICAgICAgIHVzZXJJZDogeyBTOiB1c2VySWQgfSxcclxuICAgICAgICAgIHRlbXBQYXNzd29yZDogeyBTOiBmaW5hbFBhc3N3b3JkIH0sXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IHsgTjogRGF0ZS5ub3coKS50b1N0cmluZygpIH0sXHJcbiAgICAgICAgICBuYW1lOiB7IFM6IHJlcXVlc3QubmFtZSB8fCByZXF1ZXN0LmVtYWlsIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1N0b3JlZCB1c2VyIGNyZWRlbnRpYWxzIGluIER5bmFtb0RCJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoIChkYkVycm9yKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gc3RvcmUgY3JlZGVudGlhbHMgaW4gRHluYW1vREInLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlcnJvcjogKGRiRXJyb3IgYXMgYW55KS5tZXNzYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgICAvLyBDb250aW51ZSBhbnl3YXkgLSBEeW5hbW9EQiBzdG9yYWdlIGlzIG9wdGlvbmFsIGZvciBhdXRvLWxvZ2luIGZhbGxiYWNrXHJcbiAgICB9XHJcblxyXG4gICAgLy8gTm90ZTogU09GVFdBUkVfVE9LRU5fTUZBIHdpbGwgYmUgc2V0IHVwIGR1cmluZyB0aGUgbG9naW4vT1RQIHZlcmlmaWNhdGlvbiBmbG93XHJcbiAgICAvLyBUaGUgdXNlciBuZWVkcyB0byBhc3NvY2lhdGUgYSBzb2Z0d2FyZSB0b2tlbiBmaXJzdCBiZWZvcmUgd2UgY2FuIHNldCBNRkEgcHJlZmVyZW5jZVxyXG4gICAgLy8gVGhpcyBpcyBoYW5kbGVkIGluIHRoZSB2ZXJpZnktb3RwIExhbWJkYSBmdW5jdGlvblxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIHJlZ2lzdHJhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogUmVnaXN0ZXJSZXNwb25zZSA9IHtcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgbWVzc2FnZTogJ1VzZXIgcmVnaXN0ZXJlZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbCBhbmQgc2V0IHVwIE1GQS4nLFxyXG4gICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdVc2VyIHJlZ2lzdHJhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDEsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignVXNlciByZWdpc3RyYXRpb24gZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgbmFtZTogZXJyb3IubmFtZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBIYW5kbGUgc3BlY2lmaWMgQ29nbml0byBlcnJvcnNcclxuICAgIGlmIChlcnJvci5uYW1lID09PSAnVXNlcm5hbWVFeGlzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwOSwgJ1VTRVJfRVhJU1RTJywgJ1VzZXIgd2l0aCB0aGlzIGVtYWlsIGFscmVhZHkgZXhpc3RzJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yLm5hbWUgPT09ICdJbnZhbGlkUGFzc3dvcmRFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfUEFTU1dPUkQnLCBlcnJvci5tZXNzYWdlLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IubmFtZSA9PT0gJ1Rvb01hbnlSZXF1ZXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDI5LCAnVE9PX01BTllfUkVRVUVTVFMnLCAnVG9vIG1hbnkgcmVnaXN0cmF0aW9uIGF0dGVtcHRzLiBQbGVhc2UgdHJ5IGFnYWluIGxhdGVyLicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ1JFR0lTVFJBVElPTl9GQUlMRUQnLCBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gcmVnaXN0ZXIgdXNlcicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBhIHRlbXBvcmFyeSBwYXNzd29yZCB0aGF0IG1lZXRzIENvZ25pdG8gcmVxdWlyZW1lbnRzXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5lcmF0ZVRlbXBvcmFyeVBhc3N3b3JkKCk6IHN0cmluZyB7XHJcbiAgY29uc3QgdXBwZXJjYXNlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaJztcclxuICBjb25zdCBsb3dlcmNhc2UgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonO1xyXG4gIGNvbnN0IGRpZ2l0cyA9ICcwMTIzNDU2Nzg5JztcclxuICBjb25zdCBzeW1ib2xzID0gJyFAIyQlXiYqJztcclxuXHJcbiAgbGV0IHBhc3N3b3JkID0gJyc7XHJcbiAgcGFzc3dvcmQgKz0gdXBwZXJjYXNlW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHVwcGVyY2FzZS5sZW5ndGgpXTtcclxuICBwYXNzd29yZCArPSBsb3dlcmNhc2VbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbG93ZXJjYXNlLmxlbmd0aCldO1xyXG4gIHBhc3N3b3JkICs9IGRpZ2l0c1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkaWdpdHMubGVuZ3RoKV07XHJcbiAgcGFzc3dvcmQgKz0gc3ltYm9sc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBzeW1ib2xzLmxlbmd0aCldO1xyXG5cclxuICAvLyBBZGQgcmFuZG9tIGNoYXJhY3RlcnMgdG8gcmVhY2ggbWluaW11bSBsZW5ndGhcclxuICBjb25zdCBhbGxDaGFycyA9IHVwcGVyY2FzZSArIGxvd2VyY2FzZSArIGRpZ2l0cyArIHN5bWJvbHM7XHJcbiAgZm9yIChsZXQgaSA9IHBhc3N3b3JkLmxlbmd0aDsgaSA8IDEyOyBpKyspIHtcclxuICAgIHBhc3N3b3JkICs9IGFsbENoYXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFsbENoYXJzLmxlbmd0aCldO1xyXG4gIH1cclxuXHJcbiAgLy8gU2h1ZmZsZSBwYXNzd29yZFxyXG4gIHJldHVybiBwYXNzd29yZC5zcGxpdCgnJykuc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KS5qb2luKCcnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH07XHJcbn1cclxuIl19