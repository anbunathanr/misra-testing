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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const AWS = __importStar(require("aws-sdk"));
const validation_1 = require("../../utils/validation");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('Register');
const cognito = new AWS.CognitoIdentityServiceProvider();
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    logger.info('User registration request received', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.email || !request.password) {
            return errorResponse(400, 'MISSING_FIELDS', 'Email and password are required', correlationId);
        }
        // Validate email format
        if (!(0, validation_1.validateEmail)(request.email)) {
            return errorResponse(400, 'INVALID_EMAIL', 'Please provide a valid email address', correlationId);
        }
        // Validate password strength
        const passwordValidation = (0, validation_1.validatePassword)(request.password);
        if (!passwordValidation.isValid) {
            return errorResponse(400, 'WEAK_PASSWORD', passwordValidation.message, correlationId);
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
            await cognito.adminGetUser({
                UserPoolId: userPoolId,
                Username: request.email
            }).promise();
            // User exists
            logger.warn('User already exists', {
                correlationId,
                email: request.email
            });
            return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
        }
        catch (error) {
            if (error.code !== 'UserNotFoundException') {
                throw error;
            }
            // User doesn't exist, continue with registration
        }
        // Create user with temporary password
        const tempPassword = generateTemporaryPassword();
        logger.info('Creating Cognito user', {
            correlationId,
            email: request.email
        });
        const createUserResponse = await cognito.adminCreateUser({
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
        }).promise();
        const userId = createUserResponse.User?.Username;
        if (!userId) {
            throw new Error('Failed to create user - no user ID returned');
        }
        logger.info('User created successfully', {
            correlationId,
            userId,
            email: request.email
        });
        // Set permanent password
        logger.info('Setting permanent password', {
            correlationId,
            userId
        });
        await cognito.adminSetUserPassword({
            UserPoolId: userPoolId,
            Username: request.email,
            Password: request.password,
            Permanent: true
        }).promise();
        logger.info('Permanent password set', {
            correlationId,
            userId
        });
        // Enable SOFTWARE_TOKEN_MFA for TOTP support
        logger.info('Enabling SOFTWARE_TOKEN_MFA', {
            correlationId,
            userId
        });
        await cognito.adminSetUserMFAPreference({
            UserPoolId: userPoolId,
            Username: request.email,
            SoftwareTokenMfaSettings: {
                Enabled: true,
                PreferredMfa: false // Not preferred yet, will be set after setup
            }
        }).promise();
        logger.info('SOFTWARE_TOKEN_MFA enabled', {
            correlationId,
            userId
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
            code: error.code,
            stack: error.stack
        });
        // Handle specific Cognito errors
        if (error.code === 'UsernameExistsException') {
            return errorResponse(409, 'USER_EXISTS', 'User with this email already exists', correlationId);
        }
        else if (error.code === 'InvalidPasswordException') {
            return errorResponse(400, 'INVALID_PASSWORD', error.message, correlationId);
        }
        else if (error.code === 'TooManyRequestsException') {
            return errorResponse(429, 'TOO_MANY_REQUESTS', 'Too many registration attempts. Please try again later.', correlationId);
        }
        return errorResponse(500, 'REGISTRATION_FAILED', 'Failed to register user', correlationId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHSCw2Q0FBK0I7QUFDL0IsdURBQXlFO0FBQ3pFLDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLDhCQUE4QixFQUFFLENBQUM7QUFlbEQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLE1BQU0sQ0FBQyxJQUFJLENBQUMsb0NBQW9DLEVBQUU7UUFDaEQsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQW9CLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXhELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssSUFBSSxDQUFDLE9BQU8s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T0FBTyxDQUFDO0lBQzFELEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDMUMsUUFBUSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRUQsbUJBQW1CO0lBQ25CLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNyRSxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWUsRUFDZixhQUFxQjtJQUVyQixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLGFBQWE7YUFDekI7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUmVnaXN0ZXIgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFxyXG4gKiBIYW5kbGVzIHVzZXIgcmVnaXN0cmF0aW9uIHdpdGggQVdTIENvZ25pdG9cclxuICogQ3JlYXRlcyBhIG5ldyB1c2VyIHdpdGggU09GVFdBUkVfVE9LRU5fTUZBIGVuYWJsZWQgZm9yIFRPVFAgc3VwcG9ydFxyXG4gKiBcclxuICogUmVxdWVzdDpcclxuICoge1xyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCIsXHJcbiAqICAgXCJwYXNzd29yZFwiOiBcIlNlY3VyZVBhc3N3b3JkMTIzIVwiLFxyXG4gKiAgIFwibmFtZVwiOiBcIkpvaG4gRG9lXCJcclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcInVzZXJJZFwiOiBcImNvZ25pdG8tdXNlci1pZFwiLFxyXG4gKiAgIFwiZW1haWxcIjogXCJ1c2VyQGV4YW1wbGUuY29tXCIsXHJcbiAqICAgXCJtZXNzYWdlXCI6IFwiVXNlciByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseS4gUGxlYXNlIHZlcmlmeSB5b3VyIGVtYWlsLlwiLFxyXG4gKiAgIFwicmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvblwiOiB0cnVlXHJcbiAqIH1cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIEFXUyBmcm9tICdhd3Mtc2RrJztcclxuaW1wb3J0IHsgdmFsaWRhdGVFbWFpbCwgdmFsaWRhdGVQYXNzd29yZCB9IGZyb20gJy4uLy4uL3V0aWxzL3ZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdSZWdpc3RlcicpO1xyXG5jb25zdCBjb2duaXRvID0gbmV3IEFXUy5Db2duaXRvSWRlbnRpdHlTZXJ2aWNlUHJvdmlkZXIoKTtcclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ6IHN0cmluZztcclxuICBuYW1lPzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVnaXN0ZXJSZXNwb25zZSB7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgcmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvbjogYm9vbGVhbjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICBcclxuICBsb2dnZXIuaW5mbygnVXNlciByZWdpc3RyYXRpb24gcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogUmVnaXN0ZXJSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCB8fCAhcmVxdWVzdC5wYXNzd29yZCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0ZJRUxEUycsICdFbWFpbCBhbmQgcGFzc3dvcmQgYXJlIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdQbGVhc2UgcHJvdmlkZSBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBwYXNzd29yZCBzdHJlbmd0aFxyXG4gICAgY29uc3QgcGFzc3dvcmRWYWxpZGF0aW9uID0gdmFsaWRhdGVQYXNzd29yZChyZXF1ZXN0LnBhc3N3b3JkKTtcclxuICAgIGlmICghcGFzc3dvcmRWYWxpZGF0aW9uLmlzVmFsaWQpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnV0VBS19QQVNTV09SRCcsIHBhc3N3b3JkVmFsaWRhdGlvbi5tZXNzYWdlLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbElkID0gcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQ7XHJcbiAgICBpZiAoIXVzZXJQb29sSWQpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdDT0dOSVRPX1VTRVJfUE9PTF9JRCBub3QgY29uZmlndXJlZCcsIHsgY29ycmVsYXRpb25JZCB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQ09ORklHX0VSUk9SJywgJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgY29uZmlndXJhdGlvbiBlcnJvcicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdBdHRlbXB0aW5nIHRvIHJlZ2lzdGVyIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICBuYW1lOiByZXF1ZXN0Lm5hbWVcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIHVzZXIgYWxyZWFkeSBleGlzdHNcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IGNvZ25pdG8uYWRtaW5HZXRVc2VyKHtcclxuICAgICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICAgIFVzZXJuYW1lOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICAgIC8vIFVzZXIgZXhpc3RzXHJcbiAgICAgIGxvZ2dlci53YXJuKCdVc2VyIGFscmVhZHkgZXhpc3RzJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDksICdVU0VSX0VYSVNUUycsICdVc2VyIHdpdGggdGhpcyBlbWFpbCBhbHJlYWR5IGV4aXN0cycsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBpZiAoZXJyb3IuY29kZSAhPT0gJ1VzZXJOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBlcnJvcjtcclxuICAgICAgfVxyXG4gICAgICAvLyBVc2VyIGRvZXNuJ3QgZXhpc3QsIGNvbnRpbnVlIHdpdGggcmVnaXN0cmF0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIHVzZXIgd2l0aCB0ZW1wb3JhcnkgcGFzc3dvcmRcclxuICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9IGdlbmVyYXRlVGVtcG9yYXJ5UGFzc3dvcmQoKTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0NyZWF0aW5nIENvZ25pdG8gdXNlcicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVVzZXJSZXNwb25zZSA9IGF3YWl0IGNvZ25pdG8uYWRtaW5DcmVhdGVVc2VyKHtcclxuICAgICAgVXNlclBvb2xJZDogdXNlclBvb2xJZCxcclxuICAgICAgVXNlcm5hbWU6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIFRlbXBvcmFyeVBhc3N3b3JkOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgIFVzZXJBdHRyaWJ1dGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2VtYWlsJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBOYW1lOiAnZW1haWxfdmVyaWZpZWQnLFxyXG4gICAgICAgICAgVmFsdWU6ICdmYWxzZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIE5hbWU6ICduYW1lJyxcclxuICAgICAgICAgIFZhbHVlOiByZXF1ZXN0Lm5hbWUgfHwgcmVxdWVzdC5lbWFpbFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgTmFtZTogJ2N1c3RvbTpvdHBFbmFibGVkJyxcclxuICAgICAgICAgIFZhbHVlOiAnZmFsc2UnXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBNZXNzYWdlQWN0aW9uOiAnU1VQUFJFU1MnIC8vIERvbid0IHNlbmQgd2VsY29tZSBlbWFpbCB5ZXRcclxuICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICBjb25zdCB1c2VySWQgPSBjcmVhdGVVc2VyUmVzcG9uc2UuVXNlcj8uVXNlcm5hbWU7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgdXNlciAtIG5vIHVzZXIgSUQgcmV0dXJuZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnVXNlciBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2V0IHBlcm1hbmVudCBwYXNzd29yZFxyXG4gICAgbG9nZ2VyLmluZm8oJ1NldHRpbmcgcGVybWFuZW50IHBhc3N3b3JkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGNvZ25pdG8uYWRtaW5TZXRVc2VyUGFzc3dvcmQoe1xyXG4gICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgUGFzc3dvcmQ6IHJlcXVlc3QucGFzc3dvcmQsXHJcbiAgICAgIFBlcm1hbmVudDogdHJ1ZVxyXG4gICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdQZXJtYW5lbnQgcGFzc3dvcmQgc2V0Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVuYWJsZSBTT0ZUV0FSRV9UT0tFTl9NRkEgZm9yIFRPVFAgc3VwcG9ydFxyXG4gICAgbG9nZ2VyLmluZm8oJ0VuYWJsaW5nIFNPRlRXQVJFX1RPS0VOX01GQScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgdXNlcklkXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBjb2duaXRvLmFkbWluU2V0VXNlck1GQVByZWZlcmVuY2Uoe1xyXG4gICAgICBVc2VyUG9vbElkOiB1c2VyUG9vbElkLFxyXG4gICAgICBVc2VybmFtZTogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgU29mdHdhcmVUb2tlbk1mYVNldHRpbmdzOiB7XHJcbiAgICAgICAgRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBQcmVmZXJyZWRNZmE6IGZhbHNlIC8vIE5vdCBwcmVmZXJyZWQgeWV0LCB3aWxsIGJlIHNldCBhZnRlciBzZXR1cFxyXG4gICAgICB9XHJcbiAgICB9KS5wcm9taXNlKCk7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1NPRlRXQVJFX1RPS0VOX01GQSBlbmFibGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBSZWdpc3RlclJlc3BvbnNlID0ge1xyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICBtZXNzYWdlOiAnVXNlciByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseS4gUGxlYXNlIHZlcmlmeSB5b3VyIGVtYWlsIGFuZCBzZXQgdXAgTUZBLicsXHJcbiAgICAgIHJlcXVpcmVzRW1haWxWZXJpZmljYXRpb246IHRydWVcclxuICAgIH07XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1VzZXIgcmVnaXN0cmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMSxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdVc2VyIHJlZ2lzdHJhdGlvbiBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBjb2RlOiBlcnJvci5jb2RlLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhhbmRsZSBzcGVjaWZpYyBDb2duaXRvIGVycm9yc1xyXG4gICAgaWYgKGVycm9yLmNvZGUgPT09ICdVc2VybmFtZUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA5LCAnVVNFUl9FWElTVFMnLCAnVXNlciB3aXRoIHRoaXMgZW1haWwgYWxyZWFkeSBleGlzdHMnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IuY29kZSA9PT0gJ0ludmFsaWRQYXNzd29yZEV4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9QQVNTV09SRCcsIGVycm9yLm1lc3NhZ2UsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfSBlbHNlIGlmIChlcnJvci5jb2RlID09PSAnVG9vTWFueVJlcXVlc3RzRXhjZXB0aW9uJykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MjksICdUT09fTUFOWV9SRVFVRVNUUycsICdUb28gbWFueSByZWdpc3RyYXRpb24gYXR0ZW1wdHMuIFBsZWFzZSB0cnkgYWdhaW4gbGF0ZXIuJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnUkVHSVNUUkFUSU9OX0ZBSUxFRCcsICdGYWlsZWQgdG8gcmVnaXN0ZXIgdXNlcicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBhIHRlbXBvcmFyeSBwYXNzd29yZCB0aGF0IG1lZXRzIENvZ25pdG8gcmVxdWlyZW1lbnRzXHJcbiAqL1xyXG5mdW5jdGlvbiBnZW5lcmF0ZVRlbXBvcmFyeVBhc3N3b3JkKCk6IHN0cmluZyB7XHJcbiAgY29uc3QgdXBwZXJjYXNlID0gJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaJztcclxuICBjb25zdCBsb3dlcmNhc2UgPSAnYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXonO1xyXG4gIGNvbnN0IGRpZ2l0cyA9ICcwMTIzNDU2Nzg5JztcclxuICBjb25zdCBzeW1ib2xzID0gJyFAIyQlXiYqJztcclxuXHJcbiAgbGV0IHBhc3N3b3JkID0gJyc7XHJcbiAgcGFzc3dvcmQgKz0gdXBwZXJjYXNlW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHVwcGVyY2FzZS5sZW5ndGgpXTtcclxuICBwYXNzd29yZCArPSBsb3dlcmNhc2VbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbG93ZXJjYXNlLmxlbmd0aCldO1xyXG4gIHBhc3N3b3JkICs9IGRpZ2l0c1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBkaWdpdHMubGVuZ3RoKV07XHJcbiAgcGFzc3dvcmQgKz0gc3ltYm9sc1tNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBzeW1ib2xzLmxlbmd0aCldO1xyXG5cclxuICAvLyBBZGQgcmFuZG9tIGNoYXJhY3RlcnMgdG8gcmVhY2ggbWluaW11bSBsZW5ndGhcclxuICBjb25zdCBhbGxDaGFycyA9IHVwcGVyY2FzZSArIGxvd2VyY2FzZSArIGRpZ2l0cyArIHN5bWJvbHM7XHJcbiAgZm9yIChsZXQgaSA9IHBhc3N3b3JkLmxlbmd0aDsgaSA8IDEyOyBpKyspIHtcclxuICAgIHBhc3N3b3JkICs9IGFsbENoYXJzW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFsbENoYXJzLmxlbmd0aCldO1xyXG4gIH1cclxuXHJcbiAgLy8gU2h1ZmZsZSBwYXNzd29yZFxyXG4gIHJldHVybiBwYXNzd29yZC5zcGxpdCgnJykuc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KS5qb2luKCcnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH07XHJcbn1cclxuIl19