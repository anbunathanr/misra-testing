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
const validation_1 = require("../../utils/validation");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('Register');
const cognito = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'us-east-1' });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHOzs7QUFHSCxnR0FBb0s7QUFDcEssdURBQXlFO0FBQ3pFLDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksZ0VBQTZCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFLENBQUMsQ0FBQztBQWU5RixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxvQ0FBb0MsRUFBRTtZQUNoRCxhQUFhO1lBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtTQUN6QixDQUFDLENBQUM7UUFFSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBb0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFeEQsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FB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QUFDO0lBQzFELEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsbUJBQW1CO0lBQ25CLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWUsRUFDZixhQUFxQjtJQUVyQixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLGFBQWE7YUFDekI7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUmVnaXN0ZXIgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFxyXG4gKiBIYW5kbGVzIHVzZXIgcmVnaXN0cmF0aW9uIHdpdGggQVdTIENvZ25pdG9cclxuICogQ3JlYXRlcyBhIG5ldyB1c2VyIHdpdGggU09GVFdBUkVfVE9LRU5fTUZBIGVuYWJsZWQgZm9yIFRPVFAgc3VwcG9ydFxyXG4gKiBcclxuICogUmVxdWVzdDpcclxuICoge1xyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCIsXHJcbiAqICAgXCJwYXNzd29yZFwiOiBcIlNlY3VyZVBhc3N3b3JkMTIzIVwiLFxyXG4gKiAgIFwibmFtZVwiOiBcIkpvaG4gRG9lXCJcclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcInVzZXJJZFwiOiBcImNvZ25pdG8tdXNlci1pZFwiLFxyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCIsXHJcbiAqICAgXCJtZXNzYWdlXCI6IFwiVXNlciByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseS4gUGxlYXNlIHZlcmlmeSB5b3VyIGVtYWlsLlwiLFxyXG4gKiAgIFwicmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvblwiOiB0cnVlXHJcbiAqIH1cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENvZ25pdG9JZGVudGl0eVByb3ZpZGVyQ2xpZW50LCBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kLCBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQsIEFkbWluR2V0VXNlckNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtY29nbml0by1pZGVudGl0eS1wcm92aWRlcic7XHJcbmltcG9ydCB7IHZhbGlkYXRlRW1haWwsIHZhbGlkYXRlUGFzc3dvcmQgfSBmcm9tICcuLi8uLi91dGlscy92YWxpZGF0aW9uJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignUmVnaXN0ZXInKTtcclxuY29uc3QgY29nbml0byA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ/OiBzdHJpbmc7IC8vIE9wdGlvbmFsIGZvciBwYXNzd29yZGxlc3MgZmxvd1xyXG4gIG5hbWU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlc3BvbnNlIHtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciByZWdpc3RyYXRpb24gcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogUmVnaXN0ZXJSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0VNQUlMJywgJ0VtYWlsIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdQbGVhc2UgcHJvdmlkZSBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBwYXNzd29yZCBpcyBwcm92aWRlZCwgdmFsaWRhdGUgaXRcclxuICAgIGlmIChyZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIGNvbnN0IHBhc3N3b3JkVmFsaWRhdGlvbiA9IHZhbGlkYXRlUGFzc3dvcmQocmVxdWVzdC5wYXNzd29yZCk7XHJcbiAgICAgIGlmICghcGFzc3dvcmRWYWxpZGF0aW9uLmlzVmFsaWQpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdXRUFLX1BBU1NXT1JEJywgcGFzc3dvcmRWYWxpZGF0aW9uLm1lc3NhZ2UsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xJZCA9IHByb2Nlc3MuZW52LkNPR05JVE9fVVNFUl9QT09MX0lEO1xyXG4gICAgaWYgKCF1c2VyUG9vbElkKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignQ09HTklUT19VU0VSX1BPT0xfSUQgbm90IGNvbmZpZ3VyZWQnLCB7IGNvcnJlbGF0aW9uSWQgfSBhcyBhbnkpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdDT05GSUdfRVJST1InLCAnQXV0aGVudGljYXRpb24gc2VydmljZSBjb25maWd1cmF0aW9uIGVycm9yJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0F0dGVtcHRpbmcgdG8gcmVnaXN0ZXIgdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIG5hbWU6IHJlcXVlc3QubmFtZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IGV4aXN0c1xyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkdldFVzZXJDb21tYW5kKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIFVzZXIgZXhpc3RzXHJcbiAgICAgIGxvZ2dlci53YXJuKCdVc2VyIGFscmVhZHkgZXhpc3RzJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDksICdVU0VSX0VYSVNUUycsICdVc2VyIHdpdGggdGhpcyBlbWFpbCBhbHJlYWR5IGV4aXN0cycsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IubmFtZSAhPT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgICAvLyBVc2VyIGRvZXNuJ3QgZXhpc3QsIGNvbnRpbnVlIHdpdGggcmVnaXN0cmF0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIHVzZXIgd2l0aCB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQoKTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0NyZWF0aW5nIENvZ25pdG8gdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHBhc3N3b3JkUHJvdmlkZWQ6ICEhcmVxdWVzdC5wYXNzd29yZFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVXNlclJlc3BvbnNlID0gYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pbkNyZWF0ZVVzZXJDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2VtYWlsJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLFxyXG4gICAgICAgICAgVmFsdWU6ICdmYWxzZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICduYW1lJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0Lm5hbWUgfHwgcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpvdHBFbmFibGVkJyxcclxuICAgICAgICAgIFZhbHVlOiAnZmFsc2UnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnIC8vIERvbid0IHNlbmQgd2VsY29tZSBlbWFpbCB5ZXRcclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCB1c2VySWQgPSBjcmVhdGVVc2VyUmVzcG9uc2UuVXNlcj8uVXNlcm5hbWU7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdXNlciAtIG5vIHVzZXIgSUQgcmV0dXJuZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZCBpZiBwcm92aWRlZCwgb3RoZXJ3aXNlIHVzZSB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IGZpbmFsUGFzc3dvcmQgPSByZXF1ZXN0LnBhc3N3b3JkIHx8IHRlbXBQYXNzd29yZDtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1NldHRpbmcgcGVybWFuZW50IHBhc3N3b3JkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGlzQ3VzdG9tUGFzc3dvcmQ6ICEhcmVxdWVzdC5wYXNzd29yZFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgY29nbml0by5zZW5kKG5ldyBBZG1pblNldFVzZXJQYXNzd29yZENvbW1hbmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgUGFzc3dvcmQ6IGZpbmFsUGFzc3dvcmQsXHJcbiAgICAgIFBlcm1hbmVudDogdHJ1ZVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdQZXJtYW5lbnQgcGFzc3dvcmQgc2V0Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGU6IFNPRlRXQVJFX1RPS0VOX01GQSB3aWxsIGJlIHNldCB1cCBkdXJpbmcgdGhlIGxvZ2luL09UUCB2ZXJpZmljYXRpb24gZmxvd1xyXG4gICAgLy8gVGhlIHVzZXIgbmVlZHMgdG8gYXNzb2NpYXRlIGEgc29mdHdhcmUgdG9rZW4gZmlyc3QgYmVmb3JlIHdlIGNhbiBzZXQgTUZBIHByZWZlcmVuY2VcclxuICAgIC8vIFRoaXMgaXMgaGFuZGxlZCBpbiB0aGUgdmVyaWZ5LW90cCBMYW1iZGEgZnVuY3Rpb25cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciByZWdpc3RyYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IFJlZ2lzdGVyUmVzcG9uc2UgPSB7XHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIG1lc3NhZ2U6ICdVc2VyIHJlZ2lzdGVyZWQgc3VjY2Vzc2Z1bGx5LiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwgYW5kIHNldCB1cCBNRkEuJyxcclxuICAgICAgcmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvbjogdHJ1ZVxyXG4gICAgfTtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciByZWdpc3RyYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAxLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ1VzZXIgcmVnaXN0cmF0aW9uIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIG5hbWU6IGVycm9yLm5hbWUsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSGFuZGxlIHNwZWNpZmljIENvZ25pdG8gZXJyb3JzXHJcbiAgICBpZiAoZXJyb3IubmFtZSA9PT0gJ1VzZXJuYW1lRXhpc3RzRXhjZXB0aW9uJykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDksICdVU0VSX0VYSVNUUycsICdVc2VyIHdpdGggdGhpcyBlbWFpbCBhbHJlYWR5IGV4aXN0cycsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfSBlbHNlIGlmIChlcnJvci5uYW1lID09PSAnSW52YWxpZFBhc3N3b3JkRXhjZXB0aW9uJykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX1BBU1NXT1JEJywgZXJyb3IubWVzc2FnZSwgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yLm5hbWUgPT09ICdUb29NYW55UmVxdWVzdHNFeGNlcHRpb24nKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQyOSwgJ1RPT19NQU5ZX1JFUVVFU1RTJywgJ1RvbyBtYW55IHJlZ2lzdHJhdGlvbiBhdHRlbXB0cy4gUGxlYXNlIHRyeSBhZ2FpbiBsYXRlci4nLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdSRUdJU1RSQVRJT05fRkFJTEVEJywgZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIHJlZ2lzdGVyIHVzZXInLCBjb3JyZWxhdGlvbklkKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgYSB0ZW1wb3JhcnkgcGFzc3dvcmQgdGhhdCBtZWV0cyBDb2duaXRvIHJlcXVpcmVtZW50c1xyXG4gKi9cclxuZnVuY3Rpb24gZ2VuZXJhdGVUZW1wb3JhcnlQYXNzd29yZCgpOiBzdHJpbmcge1xyXG4gIGNvbnN0IHVwcGVyY2FzZSA9ICdBQkNERUZHSElKS0xNTk9QUVJTVFVWV1hZWic7XHJcbiAgY29uc3QgbG93ZXJjYXNlID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6JztcclxuICBjb25zdCBkaWdpdHMgPSAnMDEyMzQ1Njc4OSc7XHJcbiAgY29uc3Qgc3ltYm9scyA9ICchQCMkJV4mKic7XHJcblxyXG4gIGxldCBwYXNzd29yZCA9ICcnO1xyXG4gIHBhc3N3b3JkICs9IHVwcGVyY2FzZVtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiB1cHBlcmNhc2UubGVuZ3RoKV07XHJcbiAgcGFzc3dvcmQgKz0gbG93ZXJjYXNlW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGxvd2VyY2FzZS5sZW5ndGgpXTtcclxuICBwYXNzd29yZCArPSBkaWdpdHNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogZGlnaXRzLmxlbmd0aCldO1xyXG4gIHBhc3N3b3JkICs9IHN5bWJvbHNbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogc3ltYm9scy5sZW5ndGgpXTtcclxuXHJcbiAgLy8gQWRkIHJhbmRvbSBjaGFyYWN0ZXJzIHRvIHJlYWNoIG1pbmltdW0gbGVuZ3RoXHJcbiAgY29uc3QgYWxsQ2hhcnMgPSB1cHBlcmNhc2UgKyBsb3dlcmNhc2UgKyBkaWdpdHMgKyBzeW1ib2xzO1xyXG4gIGZvciAobGV0IGkgPSBwYXNzd29yZC5sZW5ndGg7IGkgPCAxMjsgaSsrKSB7XHJcbiAgICBwYXNzd29yZCArPSBhbGxDaGFyc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhbGxDaGFycy5sZW5ndGgpXTtcclxuICB9XHJcblxyXG4gIC8vIFNodWZmbGUgcGFzc3dvcmRcclxuICByZXR1cm4gcGFzc3dvcmQuc3BsaXQoJycpLnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSkuam9pbignJyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==