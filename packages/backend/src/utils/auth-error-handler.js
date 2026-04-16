"use strict";
/**
 * Authentication Error Handler
 * Specialized error handling for authentication services with correlation IDs,
 * error transformation, and comprehensive logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.authErrorHandler = exports.AuthErrorHandler = void 0;
const uuid_1 = require("uuid");
const logger_1 = require("./logger");
class AuthErrorHandler {
    logger;
    constructor(context = 'AuthErrorHandler') {
        this.logger = (0, logger_1.createLogger)(context);
    }
    /**
     * Handle authentication errors with correlation ID and proper logging
     */
    handleError(error, context) {
        const correlationId = (0, uuid_1.v4)();
        const timestamp = new Date();
        // Log the error with correlation ID
        this.logger.error('Authentication error occurred', error, {
            correlationId,
            operation: context.operation,
            email: context.email,
            userId: context.userId,
            step: context.step,
            metadata: context.metadata,
            errorName: error.name,
            errorMessage: error.message
        });
        // Transform error to user-friendly format
        const authError = this.transformError(error, correlationId, timestamp, context);
        // Log the transformed error for monitoring
        this.logger.warn('Authentication error transformed for user', {
            correlationId,
            code: authError.code,
            userMessage: authError.userMessage,
            retryable: authError.retryable,
            step: authError.step
        });
        return authError;
    }
    /**
     * Transform technical errors into user-friendly errors
     */
    transformError(error, correlationId, timestamp, context) {
        const message = error.message;
        // Handle wrapped errors (e.g., EMAIL_VERIFICATION_ERROR: EMAIL_VERIFICATION_FAILED: ...)
        const cleanMessage = message.replace(/^EMAIL_VERIFICATION_ERROR:\s*/, '')
            .replace(/^OTP_VERIFICATION_ERROR:\s*/, '')
            .replace(/^OTP_SETUP_ERROR:\s*/, '')
            .replace(/^AUTH_FLOW_ERROR:\s*/, '');
        // Email verification errors
        if (message.includes('INVALID_EMAIL')) {
            return {
                code: 'INVALID_EMAIL',
                message: message,
                userMessage: 'Please provide a valid email address.',
                retryable: false,
                suggestion: 'Check your email address format and try again.',
                correlationId,
                timestamp,
                step: context.step,
                statusCode: 400
            };
        }
        if (message.includes('EMAIL_VERIFICATION_FAILED') || message.includes('EMAIL_VERIFICATION_ERROR')) {
            const details = cleanMessage.split(': ')[1] || '';
            if (details.includes('Invalid verification code')) {
                return {
                    code: 'INVALID_VERIFICATION_CODE',
                    message: message,
                    userMessage: 'The verification code you entered is incorrect.',
                    retryable: true,
                    suggestion: 'Please check the code in your email and try again. The code is case-sensitive.',
                    correlationId,
                    timestamp,
                    step: context.step || 'email_verification',
                    statusCode: 400
                };
            }
            if (details.includes('expired')) {
                return {
                    code: 'CODE_EXPIRED',
                    message: message,
                    userMessage: 'Your verification code has expired.',
                    retryable: true,
                    suggestion: 'Please request a new verification code and try again.',
                    correlationId,
                    timestamp,
                    step: context.step || 'email_verification',
                    statusCode: 400
                };
            }
            if (details.includes('already verified')) {
                return {
                    code: 'ALREADY_VERIFIED',
                    message: message,
                    userMessage: 'This email address is already verified.',
                    retryable: false,
                    suggestion: 'You can proceed to the next step.',
                    correlationId,
                    timestamp,
                    step: context.step || 'email_verification',
                    statusCode: 400
                };
            }
        }
        // OTP errors
        if (message.includes('OTP_VERIFICATION_FAILED') || message.includes('OTP_VERIFICATION_ERROR')) {
            const details = cleanMessage.split(': ')[1] || '';
            if (details.includes('Invalid OTP code')) {
                return {
                    code: 'INVALID_OTP_CODE',
                    message: message,
                    userMessage: 'The OTP code you entered is incorrect.',
                    retryable: true,
                    suggestion: 'Please check your authenticator app and enter the current 6-digit code. You can also use a backup code.',
                    correlationId,
                    timestamp,
                    step: context.step || 'otp_verification',
                    statusCode: 400
                };
            }
            if (details.includes('OTP not configured')) {
                return {
                    code: 'OTP_NOT_CONFIGURED',
                    message: message,
                    userMessage: 'OTP is not set up for your account.',
                    retryable: false,
                    suggestion: 'Please complete email verification first to set up OTP.',
                    correlationId,
                    timestamp,
                    step: context.step || 'otp_setup',
                    statusCode: 400
                };
            }
        }
        if (message.includes('OTP_SETUP_FAILED')) {
            return {
                code: 'OTP_SETUP_FAILED',
                message: message,
                userMessage: 'Failed to set up two-factor authentication.',
                retryable: true,
                suggestion: 'Please try again. If the problem persists, contact support with reference: ' + correlationId,
                correlationId,
                timestamp,
                step: context.step || 'otp_setup',
                statusCode: 500
            };
        }
        // Authentication flow errors
        if (message.includes('AUTH_FLOW_ERROR')) {
            return {
                code: 'AUTH_FLOW_ERROR',
                message: message,
                userMessage: 'Unable to start the authentication process.',
                retryable: true,
                suggestion: 'Please try again in a few moments. If the problem persists, contact support.',
                correlationId,
                timestamp,
                step: context.step || 'initiation',
                statusCode: 500
            };
        }
        if (message.includes('USER_NOT_CONFIRMED')) {
            return {
                code: 'USER_NOT_CONFIRMED',
                message: message,
                userMessage: 'Your email address has not been verified.',
                retryable: false,
                suggestion: 'Please check your email for the verification code.',
                correlationId,
                timestamp,
                step: context.step || 'authentication',
                statusCode: 403
            };
        }
        if (message.includes('INVALID_CREDENTIALS')) {
            return {
                code: 'INVALID_CREDENTIALS',
                message: message,
                userMessage: 'Invalid email or password.',
                retryable: true,
                suggestion: 'Please check your credentials and try again.',
                correlationId,
                timestamp,
                step: context.step || 'login',
                statusCode: 401
            };
        }
        // User management errors
        if (message.includes('USER_CREATION_FAILED')) {
            return {
                code: 'USER_CREATION_FAILED',
                message: message,
                userMessage: 'Unable to create your account.',
                retryable: true,
                suggestion: 'Please try again. If the problem persists, contact support with reference: ' + correlationId,
                correlationId,
                timestamp,
                step: context.step || 'registration',
                statusCode: 500
            };
        }
        // Token errors
        if (message.includes('TOKEN_GENERATION_FAILED')) {
            return {
                code: 'TOKEN_GENERATION_FAILED',
                message: message,
                userMessage: 'Authentication successful but unable to create your session.',
                retryable: true,
                suggestion: 'Please try logging in again.',
                correlationId,
                timestamp,
                step: context.step || 'session_creation',
                statusCode: 500
            };
        }
        // Network and service errors
        if (message.includes('COGNITO_ERROR') || error.name === 'ServiceException') {
            return {
                code: 'SERVICE_ERROR',
                message: message,
                userMessage: 'Our authentication service is temporarily unavailable.',
                retryable: true,
                suggestion: 'Please try again in a few moments.',
                correlationId,
                timestamp,
                step: context.step,
                statusCode: 503
            };
        }
        if (error.name === 'TimeoutError' || message.includes('timeout')) {
            return {
                code: 'TIMEOUT_ERROR',
                message: message,
                userMessage: 'The request took too long to complete.',
                retryable: true,
                suggestion: 'Please check your internet connection and try again.',
                correlationId,
                timestamp,
                step: context.step,
                statusCode: 504
            };
        }
        // Generic error
        return {
            code: 'UNKNOWN_ERROR',
            message: message,
            userMessage: 'An unexpected error occurred.',
            retryable: true,
            suggestion: 'Please try again. If the problem persists, contact support with reference: ' + correlationId,
            correlationId,
            timestamp,
            step: context.step,
            statusCode: 500
        };
    }
    /**
     * Convert AuthError to API Gateway response
     */
    toAPIResponse(authError) {
        return {
            statusCode: authError.statusCode,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'X-Correlation-ID': authError.correlationId
            },
            body: JSON.stringify({
                error: {
                    code: authError.code,
                    message: authError.userMessage,
                    retryable: authError.retryable,
                    suggestion: authError.suggestion,
                    correlationId: authError.correlationId,
                    timestamp: authError.timestamp.toISOString(),
                    step: authError.step
                }
            })
        };
    }
    /**
     * Log authentication event for monitoring
     */
    logAuthEvent(event, context, success, metadata) {
        const correlationId = (0, uuid_1.v4)();
        if (success) {
            this.logger.info(`Authentication event: ${event}`, {
                correlationId,
                event,
                operation: context.operation,
                email: context.email,
                userId: context.userId,
                step: context.step,
                success: true,
                ...metadata
            });
        }
        else {
            this.logger.warn(`Authentication event failed: ${event}`, {
                correlationId,
                event,
                operation: context.operation,
                email: context.email,
                userId: context.userId,
                step: context.step,
                success: false,
                ...metadata
            });
        }
    }
    /**
     * Check if error is retryable
     */
    isRetryable(error) {
        const message = error.message;
        // Non-retryable errors
        if (message.includes('INVALID_EMAIL') ||
            message.includes('INVALID_CREDENTIALS') ||
            message.includes('ALREADY_VERIFIED') ||
            message.includes('OTP_NOT_CONFIGURED')) {
            return false;
        }
        // Most other errors are retryable
        return true;
    }
    /**
     * Get retry delay based on attempt count (exponential backoff)
     */
    getRetryDelay(attemptCount, baseDelay = 1000) {
        const maxDelay = 30000; // 30 seconds
        const delay = Math.min(baseDelay * Math.pow(2, attemptCount), maxDelay);
        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 0.3 * delay;
        return Math.floor(delay + jitter);
    }
}
exports.AuthErrorHandler = AuthErrorHandler;
/**
 * Create a singleton instance for the application
 */
exports.authErrorHandler = new AuthErrorHandler();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1lcnJvci1oYW5kbGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0aC1lcnJvci1oYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFFSCwrQkFBb0M7QUFDcEMscUNBQWdEO0FBdUJoRCxNQUFhLGdCQUFnQjtJQUNuQixNQUFNLENBQVM7SUFFdkIsWUFBWSxVQUFrQixrQkFBa0I7UUFDOUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLEtBQVksRUFBRSxPQUF5QjtRQUNqRCxNQUFNLGFBQWEsR0FBRyxJQUFBLFNBQU0sR0FBRSxDQUFDO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFFN0Isb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssRUFBRTtZQUN4RCxhQUFhO1lBQ2IsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1lBQzVCLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU07WUFDdEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO1lBQ2xCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtZQUMxQixTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDckIsWUFBWSxFQUFFLEtBQUssQ0FBQyxPQUFPO1NBQzVCLENBQUMsQ0FBQztRQUVILDBDQUEwQztRQUMxQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRWhGLDJDQUEyQztRQUMzQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQywyQ0FBMkMsRUFBRTtZQUM1RCxhQUFhO1lBQ2Is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QixPQUFPLEVBQUUsS0FBSztnQkFDZCxHQUFHLFFBQVE7YUFDWixDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVyxDQUFDLEtBQVk7UUFDdEIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQztRQUU5Qix1QkFBdUI7UUFDdkIsSUFDRSxPQUFPLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQztZQUNqQyxPQUFPLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDO1lBQ3ZDLE9BQU8sQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUM7WUFDcEMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUN0QyxDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsa0NBQWtDO1FBQ2xDLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYSxDQUFDLFlBQW9CLEVBQUUsWUFBb0IsSUFBSTtRQUMxRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsQ0FBQyxhQUFhO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFlBQVksQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXhFLHdDQUF3QztRQUN4QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsR0FBRyxHQUFHLEtBQUssQ0FBQztRQUMzQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDO0lBQ3BDLENBQUM7Q0FDRjtBQXRYRCw0Q0FzWEM7QUFFRDs7R0FFRztBQUNVLFFBQUEsZ0JBQWdCLEdBQUcsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEF1dGhlbnRpY2F0aW9uIEVycm9yIEhhbmRsZXJcclxuICogU3BlY2lhbGl6ZWQgZXJyb3IgaGFuZGxpbmcgZm9yIGF1dGhlbnRpY2F0aW9uIHNlcnZpY2VzIHdpdGggY29ycmVsYXRpb24gSURzLFxyXG4gKiBlcnJvciB0cmFuc2Zvcm1hdGlvbiwgYW5kIGNvbXByZWhlbnNpdmUgbG9nZ2luZ1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5pbXBvcnQgeyBMb2dnZXIsIGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhFcnJvciB7XHJcbiAgY29kZTogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICB1c2VyTWVzc2FnZTogc3RyaW5nO1xyXG4gIHJldHJ5YWJsZTogYm9vbGVhbjtcclxuICBzdWdnZXN0aW9uOiBzdHJpbmc7XHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nO1xyXG4gIHRpbWVzdGFtcDogRGF0ZTtcclxuICBzdGVwPzogc3RyaW5nO1xyXG4gIHN0YXR1c0NvZGU6IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdXRoRXJyb3JDb250ZXh0IHtcclxuICBvcGVyYXRpb246IHN0cmluZztcclxuICBlbWFpbD86IHN0cmluZztcclxuICB1c2VySWQ/OiBzdHJpbmc7XHJcbiAgc3RlcD86IHN0cmluZztcclxuICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBBdXRoRXJyb3JIYW5kbGVyIHtcclxuICBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihjb250ZXh0OiBzdHJpbmcgPSAnQXV0aEVycm9ySGFuZGxlcicpIHtcclxuICAgIHRoaXMubG9nZ2VyID0gY3JlYXRlTG9nZ2VyKGNvbnRleHQpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGFuZGxlIGF1dGhlbnRpY2F0aW9uIGVycm9ycyB3aXRoIGNvcnJlbGF0aW9uIElEIGFuZCBwcm9wZXIgbG9nZ2luZ1xyXG4gICAqL1xyXG4gIGhhbmRsZUVycm9yKGVycm9yOiBFcnJvciwgY29udGV4dDogQXV0aEVycm9yQ29udGV4dCk6IEF1dGhFcnJvciB7XHJcbiAgICBjb25zdCBjb3JyZWxhdGlvbklkID0gdXVpZHY0KCk7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpO1xyXG5cclxuICAgIC8vIExvZyB0aGUgZXJyb3Igd2l0aCBjb3JyZWxhdGlvbiBJRFxyXG4gICAgdGhpcy5sb2dnZXIuZXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGVycm9yIG9jY3VycmVkJywgZXJyb3IsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgb3BlcmF0aW9uOiBjb250ZXh0Lm9wZXJhdGlvbixcclxuICAgICAgZW1haWw6IGNvbnRleHQuZW1haWwsXHJcbiAgICAgIHVzZXJJZDogY29udGV4dC51c2VySWQsXHJcbiAgICAgIHN0ZXA6IGNvbnRleHQuc3RlcCxcclxuICAgICAgbWV0YWRhdGE6IGNvbnRleHQubWV0YWRhdGEsXHJcbiAgICAgIGVycm9yTmFtZTogZXJyb3IubmFtZSxcclxuICAgICAgZXJyb3JNZXNzYWdlOiBlcnJvci5tZXNzYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUcmFuc2Zvcm0gZXJyb3IgdG8gdXNlci1mcmllbmRseSBmb3JtYXRcclxuICAgIGNvbnN0IGF1dGhFcnJvciA9IHRoaXMudHJhbnNmb3JtRXJyb3IoZXJyb3IsIGNvcnJlbGF0aW9uSWQsIHRpbWVzdGFtcCwgY29udGV4dCk7XHJcblxyXG4gICAgLy8gTG9nIHRoZSB0cmFuc2Zvcm1lZCBlcnJvciBmb3IgbW9uaXRvcmluZ1xyXG4gICAgdGhpcy5sb2dnZXIud2FybignQXV0aGVudGljYXRpb24gZXJyb3IgdHJhbnNmb3JtZWQgZm9yIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGNvZGU6IGF1dGhFcnJvci5jb2RlLFxyXG4gICAgICB1c2VyTWVzc2FnZTogYXV0aEVycm9yLnVzZXJNZXNzYWdlLFxyXG4gICAgICByZXRyeWFibGU6IGF1dGhFcnJvci5yZXRyeWFibGUsXHJcbiAgICAgIHN0ZXA6IGF1dGhFcnJvci5zdGVwXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gYXV0aEVycm9yO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVHJhbnNmb3JtIHRlY2huaWNhbCBlcnJvcnMgaW50byB1c2VyLWZyaWVuZGx5IGVycm9yc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgdHJhbnNmb3JtRXJyb3IoXHJcbiAgICBlcnJvcjogRXJyb3IsXHJcbiAgICBjb3JyZWxhdGlvbklkOiBzdHJpbmcsXHJcbiAgICB0aW1lc3RhbXA6IERhdGUsXHJcbiAgICBjb250ZXh0OiBBdXRoRXJyb3JDb250ZXh0XHJcbiAgKTogQXV0aEVycm9yIHtcclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlO1xyXG5cclxuICAgIC8vIEhhbmRsZSB3cmFwcGVkIGVycm9ycyAoZS5nLiwgRU1BSUxfVkVSSUZJQ0FUSU9OX0VSUk9SOiBFTUFJTF9WRVJJRklDQVRJT05fRkFJTEVEOiAuLi4pXHJcbiAgICBjb25zdCBjbGVhbk1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UoL15FTUFJTF9WRVJJRklDQVRJT05fRVJST1I6XFxzKi8sICcnKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoL15PVFBfVkVSSUZJQ0FUSU9OX0VSUk9SOlxccyovLCAnJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eT1RQX1NFVFVQX0VSUk9SOlxccyovLCAnJylcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9eQVVUSF9GTE9XX0VSUk9SOlxccyovLCAnJyk7XHJcblxyXG4gICAgLy8gRW1haWwgdmVyaWZpY2F0aW9uIGVycm9yc1xyXG4gICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfRU1BSUwnKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGNvZGU6ICdJTlZBTElEX0VNQUlMJyxcclxuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgICAgIHVzZXJNZXNzYWdlOiAnUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBlbWFpbCBhZGRyZXNzLicsXHJcbiAgICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgICBzdWdnZXN0aW9uOiAnQ2hlY2sgeW91ciBlbWFpbCBhZGRyZXNzIGZvcm1hdCBhbmQgdHJ5IGFnYWluLicsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB0aW1lc3RhbXAsXHJcbiAgICAgICAgc3RlcDogY29udGV4dC5zdGVwLFxyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChtZXNzYWdlLmluY2x1ZGVzKCdFTUFJTF9WRVJJRklDQVRJT05fRkFJTEVEJykgfHwgbWVzc2FnZS5pbmNsdWRlcygnRU1BSUxfVkVSSUZJQ0FUSU9OX0VSUk9SJykpIHtcclxuICAgICAgY29uc3QgZGV0YWlscyA9IGNsZWFuTWVzc2FnZS5zcGxpdCgnOiAnKVsxXSB8fCAnJztcclxuICAgICAgXHJcbiAgICAgIGlmIChkZXRhaWxzLmluY2x1ZGVzKCdJbnZhbGlkIHZlcmlmaWNhdGlvbiBjb2RlJykpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgY29kZTogJ0lOVkFMSURfVkVSSUZJQ0FUSU9OX0NPREUnLFxyXG4gICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcclxuICAgICAgICAgIHVzZXJNZXNzYWdlOiAnVGhlIHZlcmlmaWNhdGlvbiBjb2RlIHlvdSBlbnRlcmVkIGlzIGluY29ycmVjdC4nLFxyXG4gICAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBjaGVjayB0aGUgY29kZSBpbiB5b3VyIGVtYWlsIGFuZCB0cnkgYWdhaW4uIFRoZSBjb2RlIGlzIGNhc2Utc2Vuc2l0aXZlLicsXHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgdGltZXN0YW1wLFxyXG4gICAgICAgICAgc3RlcDogY29udGV4dC5zdGVwIHx8ICdlbWFpbF92ZXJpZmljYXRpb24nLFxyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGRldGFpbHMuaW5jbHVkZXMoJ2V4cGlyZWQnKSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBjb2RlOiAnQ09ERV9FWFBJUkVEJyxcclxuICAgICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICAgICAgICB1c2VyTWVzc2FnZTogJ1lvdXIgdmVyaWZpY2F0aW9uIGNvZGUgaGFzIGV4cGlyZWQuJyxcclxuICAgICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2UgcmVxdWVzdCBhIG5ldyB2ZXJpZmljYXRpb24gY29kZSBhbmQgdHJ5IGFnYWluLicsXHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgdGltZXN0YW1wLFxyXG4gICAgICAgICAgc3RlcDogY29udGV4dC5zdGVwIHx8ICdlbWFpbF92ZXJpZmljYXRpb24nLFxyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGRldGFpbHMuaW5jbHVkZXMoJ2FscmVhZHkgdmVyaWZpZWQnKSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBjb2RlOiAnQUxSRUFEWV9WRVJJRklFRCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgICAgICAgdXNlck1lc3NhZ2U6ICdUaGlzIGVtYWlsIGFkZHJlc3MgaXMgYWxyZWFkeSB2ZXJpZmllZC4nLFxyXG4gICAgICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgICAgIHN1Z2dlc3Rpb246ICdZb3UgY2FuIHByb2NlZWQgdG8gdGhlIG5leHQgc3RlcC4nLFxyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgICAgIHN0ZXA6IGNvbnRleHQuc3RlcCB8fCAnZW1haWxfdmVyaWZpY2F0aW9uJyxcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBPVFAgZXJyb3JzXHJcbiAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnT1RQX1ZFUklGSUNBVElPTl9GQUlMRUQnKSB8fCBtZXNzYWdlLmluY2x1ZGVzKCdPVFBfVkVSSUZJQ0FUSU9OX0VSUk9SJykpIHtcclxuICAgICAgY29uc3QgZGV0YWlscyA9IGNsZWFuTWVzc2FnZS5zcGxpdCgnOiAnKVsxXSB8fCAnJztcclxuICAgICAgXHJcbiAgICAgIGlmIChkZXRhaWxzLmluY2x1ZGVzKCdJbnZhbGlkIE9UUCBjb2RlJykpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgY29kZTogJ0lOVkFMSURfT1RQX0NPREUnLFxyXG4gICAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcclxuICAgICAgICAgIHVzZXJNZXNzYWdlOiAnVGhlIE9UUCBjb2RlIHlvdSBlbnRlcmVkIGlzIGluY29ycmVjdC4nLFxyXG4gICAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBjaGVjayB5b3VyIGF1dGhlbnRpY2F0b3IgYXBwIGFuZCBlbnRlciB0aGUgY3VycmVudCA2LWRpZ2l0IGNvZGUuIFlvdSBjYW4gYWxzbyB1c2UgYSBiYWNrdXAgY29kZS4nLFxyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgICAgIHN0ZXA6IGNvbnRleHQuc3RlcCB8fCAnb3RwX3ZlcmlmaWNhdGlvbicsXHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDBcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZGV0YWlscy5pbmNsdWRlcygnT1RQIG5vdCBjb25maWd1cmVkJykpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgY29kZTogJ09UUF9OT1RfQ09ORklHVVJFRCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgICAgICAgdXNlck1lc3NhZ2U6ICdPVFAgaXMgbm90IHNldCB1cCBmb3IgeW91ciBhY2NvdW50LicsXHJcbiAgICAgICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBjb21wbGV0ZSBlbWFpbCB2ZXJpZmljYXRpb24gZmlyc3QgdG8gc2V0IHVwIE9UUC4nLFxyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgICAgIHN0ZXA6IGNvbnRleHQuc3RlcCB8fCAnb3RwX3NldHVwJyxcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnT1RQX1NFVFVQX0ZBSUxFRCcpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgY29kZTogJ09UUF9TRVRVUF9GQUlMRUQnLFxyXG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICAgICAgdXNlck1lc3NhZ2U6ICdGYWlsZWQgdG8gc2V0IHVwIHR3by1mYWN0b3IgYXV0aGVudGljYXRpb24uJyxcclxuICAgICAgICByZXRyeWFibGU6IHRydWUsXHJcbiAgICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSB0cnkgYWdhaW4uIElmIHRoZSBwcm9ibGVtIHBlcnNpc3RzLCBjb250YWN0IHN1cHBvcnQgd2l0aCByZWZlcmVuY2U6ICcgKyBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgdGltZXN0YW1wLFxyXG4gICAgICAgIHN0ZXA6IGNvbnRleHQuc3RlcCB8fCAnb3RwX3NldHVwJyxcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDBcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBmbG93IGVycm9yc1xyXG4gICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ0FVVEhfRkxPV19FUlJPUicpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgY29kZTogJ0FVVEhfRkxPV19FUlJPUicsXHJcbiAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcclxuICAgICAgICB1c2VyTWVzc2FnZTogJ1VuYWJsZSB0byBzdGFydCB0aGUgYXV0aGVudGljYXRpb24gcHJvY2Vzcy4nLFxyXG4gICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLiBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgY29udGFjdCBzdXBwb3J0LicsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB0aW1lc3RhbXAsXHJcbiAgICAgICAgc3RlcDogY29udGV4dC5zdGVwIHx8ICdpbml0aWF0aW9uJyxcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDBcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnVVNFUl9OT1RfQ09ORklSTUVEJykpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBjb2RlOiAnVVNFUl9OT1RfQ09ORklSTUVEJyxcclxuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgICAgIHVzZXJNZXNzYWdlOiAnWW91ciBlbWFpbCBhZGRyZXNzIGhhcyBub3QgYmVlbiB2ZXJpZmllZC4nLFxyXG4gICAgICAgIHJldHJ5YWJsZTogZmFsc2UsXHJcbiAgICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBjaGVjayB5b3VyIGVtYWlsIGZvciB0aGUgdmVyaWZpY2F0aW9uIGNvZGUuJyxcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgICBzdGVwOiBjb250ZXh0LnN0ZXAgfHwgJ2F1dGhlbnRpY2F0aW9uJyxcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDNcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAobWVzc2FnZS5pbmNsdWRlcygnSU5WQUxJRF9DUkVERU5USUFMUycpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgY29kZTogJ0lOVkFMSURfQ1JFREVOVElBTFMnLFxyXG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICAgICAgdXNlck1lc3NhZ2U6ICdJbnZhbGlkIGVtYWlsIG9yIHBhc3N3b3JkLicsXHJcbiAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFscyBhbmQgdHJ5IGFnYWluLicsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB0aW1lc3RhbXAsXHJcbiAgICAgICAgc3RlcDogY29udGV4dC5zdGVwIHx8ICdsb2dpbicsXHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXNlciBtYW5hZ2VtZW50IGVycm9yc1xyXG4gICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ1VTRVJfQ1JFQVRJT05fRkFJTEVEJykpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBjb2RlOiAnVVNFUl9DUkVBVElPTl9GQUlMRUQnLFxyXG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICAgICAgdXNlck1lc3NhZ2U6ICdVbmFibGUgdG8gY3JlYXRlIHlvdXIgYWNjb3VudC4nLFxyXG4gICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIHRyeSBhZ2Fpbi4gSWYgdGhlIHByb2JsZW0gcGVyc2lzdHMsIGNvbnRhY3Qgc3VwcG9ydCB3aXRoIHJlZmVyZW5jZTogJyArIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB0aW1lc3RhbXAsXHJcbiAgICAgICAgc3RlcDogY29udGV4dC5zdGVwIHx8ICdyZWdpc3RyYXRpb24nLFxyXG4gICAgICAgIHN0YXR1c0NvZGU6IDUwMFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRva2VuIGVycm9yc1xyXG4gICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ1RPS0VOX0dFTkVSQVRJT05fRkFJTEVEJykpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBjb2RlOiAnVE9LRU5fR0VORVJBVElPTl9GQUlMRUQnLFxyXG4gICAgICAgIG1lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICAgICAgdXNlck1lc3NhZ2U6ICdBdXRoZW50aWNhdGlvbiBzdWNjZXNzZnVsIGJ1dCB1bmFibGUgdG8gY3JlYXRlIHlvdXIgc2Vzc2lvbi4nLFxyXG4gICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIHRyeSBsb2dnaW5nIGluIGFnYWluLicsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB0aW1lc3RhbXAsXHJcbiAgICAgICAgc3RlcDogY29udGV4dC5zdGVwIHx8ICdzZXNzaW9uX2NyZWF0aW9uJyxcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDBcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBOZXR3b3JrIGFuZCBzZXJ2aWNlIGVycm9yc1xyXG4gICAgaWYgKG1lc3NhZ2UuaW5jbHVkZXMoJ0NPR05JVE9fRVJST1InKSB8fCBlcnJvci5uYW1lID09PSAnU2VydmljZUV4Y2VwdGlvbicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBjb2RlOiAnU0VSVklDRV9FUlJPUicsXHJcbiAgICAgICAgbWVzc2FnZTogbWVzc2FnZSxcclxuICAgICAgICB1c2VyTWVzc2FnZTogJ091ciBhdXRoZW50aWNhdGlvbiBzZXJ2aWNlIGlzIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLicsXHJcbiAgICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2UgdHJ5IGFnYWluIGluIGEgZmV3IG1vbWVudHMuJyxcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgICBzdGVwOiBjb250ZXh0LnN0ZXAsXHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAzXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVycm9yLm5hbWUgPT09ICdUaW1lb3V0RXJyb3InIHx8IG1lc3NhZ2UuaW5jbHVkZXMoJ3RpbWVvdXQnKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGNvZGU6ICdUSU1FT1VUX0VSUk9SJyxcclxuICAgICAgICBtZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgICAgIHVzZXJNZXNzYWdlOiAnVGhlIHJlcXVlc3QgdG9vayB0b28gbG9uZyB0byBjb21wbGV0ZS4nLFxyXG4gICAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIGNoZWNrIHlvdXIgaW50ZXJuZXQgY29ubmVjdGlvbiBhbmQgdHJ5IGFnYWluLicsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICB0aW1lc3RhbXAsXHJcbiAgICAgICAgc3RlcDogY29udGV4dC5zdGVwLFxyXG4gICAgICAgIHN0YXR1c0NvZGU6IDUwNFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyaWMgZXJyb3JcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGNvZGU6ICdVTktOT1dOX0VSUk9SJyxcclxuICAgICAgbWVzc2FnZTogbWVzc2FnZSxcclxuICAgICAgdXNlck1lc3NhZ2U6ICdBbiB1bmV4cGVjdGVkIGVycm9yIG9jY3VycmVkLicsXHJcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSB0cnkgYWdhaW4uIElmIHRoZSBwcm9ibGVtIHBlcnNpc3RzLCBjb250YWN0IHN1cHBvcnQgd2l0aCByZWZlcmVuY2U6ICcgKyBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB0aW1lc3RhbXAsXHJcbiAgICAgIHN0ZXA6IGNvbnRleHQuc3RlcCxcclxuICAgICAgc3RhdHVzQ29kZTogNTAwXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29udmVydCBBdXRoRXJyb3IgdG8gQVBJIEdhdGV3YXkgcmVzcG9uc2VcclxuICAgKi9cclxuICB0b0FQSVJlc3BvbnNlKGF1dGhFcnJvcjogQXV0aEVycm9yKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IGF1dGhFcnJvci5zdGF0dXNDb2RlLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJzogYXV0aEVycm9yLmNvcnJlbGF0aW9uSWRcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiBhdXRoRXJyb3IuY29kZSxcclxuICAgICAgICAgIG1lc3NhZ2U6IGF1dGhFcnJvci51c2VyTWVzc2FnZSxcclxuICAgICAgICAgIHJldHJ5YWJsZTogYXV0aEVycm9yLnJldHJ5YWJsZSxcclxuICAgICAgICAgIHN1Z2dlc3Rpb246IGF1dGhFcnJvci5zdWdnZXN0aW9uLFxyXG4gICAgICAgICAgY29ycmVsYXRpb25JZDogYXV0aEVycm9yLmNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IGF1dGhFcnJvci50aW1lc3RhbXAudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHN0ZXA6IGF1dGhFcnJvci5zdGVwXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBhdXRoZW50aWNhdGlvbiBldmVudCBmb3IgbW9uaXRvcmluZ1xyXG4gICAqL1xyXG4gIGxvZ0F1dGhFdmVudChcclxuICAgIGV2ZW50OiBzdHJpbmcsXHJcbiAgICBjb250ZXh0OiBBdXRoRXJyb3JDb250ZXh0LFxyXG4gICAgc3VjY2VzczogYm9vbGVhbixcclxuICAgIG1ldGFkYXRhPzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3QgY29ycmVsYXRpb25JZCA9IHV1aWR2NCgpO1xyXG5cclxuICAgIGlmIChzdWNjZXNzKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oYEF1dGhlbnRpY2F0aW9uIGV2ZW50OiAke2V2ZW50fWAsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGV2ZW50LFxyXG4gICAgICAgIG9wZXJhdGlvbjogY29udGV4dC5vcGVyYXRpb24sXHJcbiAgICAgICAgZW1haWw6IGNvbnRleHQuZW1haWwsXHJcbiAgICAgICAgdXNlcklkOiBjb250ZXh0LnVzZXJJZCxcclxuICAgICAgICBzdGVwOiBjb250ZXh0LnN0ZXAsXHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAuLi5tZXRhZGF0YVxyXG4gICAgICB9KTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oYEF1dGhlbnRpY2F0aW9uIGV2ZW50IGZhaWxlZDogJHtldmVudH1gLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBldmVudCxcclxuICAgICAgICBvcGVyYXRpb246IGNvbnRleHQub3BlcmF0aW9uLFxyXG4gICAgICAgIGVtYWlsOiBjb250ZXh0LmVtYWlsLFxyXG4gICAgICAgIHVzZXJJZDogY29udGV4dC51c2VySWQsXHJcbiAgICAgICAgc3RlcDogY29udGV4dC5zdGVwLFxyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIC4uLm1ldGFkYXRhXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgZXJyb3IgaXMgcmV0cnlhYmxlXHJcbiAgICovXHJcbiAgaXNSZXRyeWFibGUoZXJyb3I6IEVycm9yKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBtZXNzYWdlID0gZXJyb3IubWVzc2FnZTtcclxuICAgIFxyXG4gICAgLy8gTm9uLXJldHJ5YWJsZSBlcnJvcnNcclxuICAgIGlmIChcclxuICAgICAgbWVzc2FnZS5pbmNsdWRlcygnSU5WQUxJRF9FTUFJTCcpIHx8XHJcbiAgICAgIG1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfQ1JFREVOVElBTFMnKSB8fFxyXG4gICAgICBtZXNzYWdlLmluY2x1ZGVzKCdBTFJFQURZX1ZFUklGSUVEJykgfHxcclxuICAgICAgbWVzc2FnZS5pbmNsdWRlcygnT1RQX05PVF9DT05GSUdVUkVEJylcclxuICAgICkge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTW9zdCBvdGhlciBlcnJvcnMgYXJlIHJldHJ5YWJsZVxyXG4gICAgcmV0dXJuIHRydWU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgcmV0cnkgZGVsYXkgYmFzZWQgb24gYXR0ZW1wdCBjb3VudCAoZXhwb25lbnRpYWwgYmFja29mZilcclxuICAgKi9cclxuICBnZXRSZXRyeURlbGF5KGF0dGVtcHRDb3VudDogbnVtYmVyLCBiYXNlRGVsYXk6IG51bWJlciA9IDEwMDApOiBudW1iZXIge1xyXG4gICAgY29uc3QgbWF4RGVsYXkgPSAzMDAwMDsgLy8gMzAgc2Vjb25kc1xyXG4gICAgY29uc3QgZGVsYXkgPSBNYXRoLm1pbihiYXNlRGVsYXkgKiBNYXRoLnBvdygyLCBhdHRlbXB0Q291bnQpLCBtYXhEZWxheSk7XHJcbiAgICBcclxuICAgIC8vIEFkZCBqaXR0ZXIgdG8gcHJldmVudCB0aHVuZGVyaW5nIGhlcmRcclxuICAgIGNvbnN0IGppdHRlciA9IE1hdGgucmFuZG9tKCkgKiAwLjMgKiBkZWxheTtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKGRlbGF5ICsgaml0dGVyKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSBzaW5nbGV0b24gaW5zdGFuY2UgZm9yIHRoZSBhcHBsaWNhdGlvblxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGF1dGhFcnJvckhhbmRsZXIgPSBuZXcgQXV0aEVycm9ySGFuZGxlcigpO1xyXG4iXX0=