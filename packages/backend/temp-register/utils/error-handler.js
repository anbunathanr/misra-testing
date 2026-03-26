"use strict";
/**
 * Centralized Error Handler
 * Handles errors consistently across all Lambda functions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = handleError;
exports.withErrorHandler = withErrorHandler;
exports.assert = assert;
exports.assertExists = assertExists;
const app_error_1 = require("./app-error");
/**
 * Handle errors and return appropriate API Gateway response
 */
function handleError(error, logger) {
    // Log the error
    if (error instanceof app_error_1.AppError) {
        // Operational errors - log as warning
        logger.warn('Application error occurred', {
            code: error.code,
            statusCode: error.statusCode,
            message: error.message,
            metadata: error.metadata,
        });
    }
    else {
        // Unexpected errors - log as error with full stack
        logger.error('Unexpected error occurred', error, {
            type: error.constructor?.name,
        });
    }
    // Build error response
    const errorResponse = buildErrorResponse(error);
    return {
        statusCode: errorResponse.statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify(errorResponse.body),
    };
}
/**
 * Build error response object
 */
function buildErrorResponse(error) {
    if (error instanceof app_error_1.AppError) {
        return {
            statusCode: error.statusCode,
            body: {
                error: sanitizeErrorMessage(error.message),
                code: error.code,
                requestId: process.env.AWS_REQUEST_ID,
                metadata: error.metadata,
            },
        };
    }
    // Handle AWS SDK errors
    if (error.name === 'ResourceNotFoundException') {
        return {
            statusCode: 404,
            body: {
                error: 'Resource not found',
                code: app_error_1.ErrorCode.NOT_FOUND,
                requestId: process.env.AWS_REQUEST_ID,
            },
        };
    }
    if (error.name === 'ConditionalCheckFailedException') {
        return {
            statusCode: 409,
            body: {
                error: 'Resource already exists or condition not met',
                code: app_error_1.ErrorCode.CONFLICT,
                requestId: process.env.AWS_REQUEST_ID,
            },
        };
    }
    if (error.name === 'ValidationException') {
        return {
            statusCode: 400,
            body: {
                error: 'Invalid request parameters',
                code: app_error_1.ErrorCode.VALIDATION_ERROR,
                requestId: process.env.AWS_REQUEST_ID,
            },
        };
    }
    // Default to 500 for unknown errors
    return {
        statusCode: 500,
        body: {
            error: 'Internal server error',
            code: app_error_1.ErrorCode.INTERNAL_ERROR,
            requestId: process.env.AWS_REQUEST_ID,
        },
    };
}
/**
 * Sanitize error messages to prevent leaking sensitive information
 */
function sanitizeErrorMessage(message) {
    // Remove potential sensitive patterns
    const sanitized = message
        .replace(/password[=:]\s*\S+/gi, 'password=***')
        .replace(/token[=:]\s*\S+/gi, 'token=***')
        .replace(/key[=:]\s*\S+/gi, 'key=***')
        .replace(/secret[=:]\s*\S+/gi, 'secret=***');
    return sanitized;
}
/**
 * Wrap async Lambda handler with error handling
 */
function withErrorHandler(handler, logger) {
    return async (...args) => {
        try {
            return await handler(...args);
        }
        catch (error) {
            return handleError(error, logger);
        }
    };
}
/**
 * Assert condition and throw error if false
 */
function assert(condition, message, statusCode = 400, code = app_error_1.ErrorCode.VALIDATION_ERROR) {
    if (!condition) {
        throw new app_error_1.AppError(message, statusCode, code);
    }
}
/**
 * Assert value is not null/undefined
 */
function assertExists(value, message) {
    if (value === null || value === undefined) {
        throw new app_error_1.AppError(message, 404, app_error_1.ErrorCode.NOT_FOUND);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3ItaGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImVycm9yLWhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFnQkgsa0NBNEJDO0FBbUZELDRDQVdDO0FBS0Qsd0JBU0M7QUFLRCxvQ0FPQztBQWhLRCwyQ0FBa0Q7QUFTbEQ7O0dBRUc7QUFDSCxTQUFnQixXQUFXLENBQUMsS0FBVSxFQUFFLE1BQWM7SUFDcEQsZ0JBQWdCO0lBQ2hCLElBQUksS0FBSyxZQUFZLG9CQUFRLEVBQUUsQ0FBQztRQUM5QixzQ0FBc0M7UUFDdEMsTUFBTSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRTtZQUN4QyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQzVCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztZQUN0QixRQUFRLEVBQUUsS0FBSyxDQUFDLFFBQVE7U0FDekIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztTQUFNLENBQUM7UUFDTixtREFBbUQ7UUFDbkQsTUFBTSxDQUFDLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxLQUFLLEVBQUU7WUFDL0MsSUFBSSxFQUFFLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSTtTQUM5QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsdUJBQXVCO0lBQ3ZCLE1BQU0sYUFBYSxHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0lBRWhELE9BQU87UUFDTCxVQUFVLEVBQUUsYUFBYSxDQUFDLFVBQVU7UUFDcEMsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1NBQ25DO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQztLQUN6QyxDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxLQUFV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QkFBUSxDQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDaEQsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLFlBQVksQ0FDMUIsS0FBMkIsRUFDM0IsT0FBZTtJQUVmLElBQUksS0FBSyxLQUFLLElBQUksSUFBSSxLQUFLLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDMUMsTUFBTSxJQUFJLG9CQUFRLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRSxxQkFBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENlbnRyYWxpemVkIEVycm9yIEhhbmRsZXJcclxuICogSGFuZGxlcyBlcnJvcnMgY29uc2lzdGVudGx5IGFjcm9zcyBhbGwgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBMb2dnZXIgfSBmcm9tICcuL2xvZ2dlcic7XHJcbmltcG9ydCB7IEFwcEVycm9yLCBFcnJvckNvZGUgfSBmcm9tICcuL2FwcC1lcnJvcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEVycm9yUmVzcG9uc2Uge1xyXG4gIGVycm9yOiBzdHJpbmc7XHJcbiAgY29kZTogc3RyaW5nO1xyXG4gIHJlcXVlc3RJZD86IHN0cmluZztcclxuICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIYW5kbGUgZXJyb3JzIGFuZCByZXR1cm4gYXBwcm9wcmlhdGUgQVBJIEdhdGV3YXkgcmVzcG9uc2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBoYW5kbGVFcnJvcihlcnJvcjogYW55LCBsb2dnZXI6IExvZ2dlcik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgLy8gTG9nIHRoZSBlcnJvclxyXG4gIGlmIChlcnJvciBpbnN0YW5jZW9mIEFwcEVycm9yKSB7XHJcbiAgICAvLyBPcGVyYXRpb25hbCBlcnJvcnMgLSBsb2cgYXMgd2FybmluZ1xyXG4gICAgbG9nZ2VyLndhcm4oJ0FwcGxpY2F0aW9uIGVycm9yIG9jY3VycmVkJywge1xyXG4gICAgICBjb2RlOiBlcnJvci5jb2RlLFxyXG4gICAgICBzdGF0dXNDb2RlOiBlcnJvci5zdGF0dXNDb2RlLFxyXG4gICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBtZXRhZGF0YTogZXJyb3IubWV0YWRhdGEsXHJcbiAgICB9KTtcclxuICB9IGVsc2Uge1xyXG4gICAgLy8gVW5leHBlY3RlZCBlcnJvcnMgLSBsb2cgYXMgZXJyb3Igd2l0aCBmdWxsIHN0YWNrXHJcbiAgICBsb2dnZXIuZXJyb3IoJ1VuZXhwZWN0ZWQgZXJyb3Igb2NjdXJyZWQnLCBlcnJvciwge1xyXG4gICAgICB0eXBlOiBlcnJvci5jb25zdHJ1Y3Rvcj8ubmFtZSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLy8gQnVpbGQgZXJyb3IgcmVzcG9uc2VcclxuICBjb25zdCBlcnJvclJlc3BvbnNlID0gYnVpbGRFcnJvclJlc3BvbnNlKGVycm9yKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGU6IGVycm9yUmVzcG9uc2Uuc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShlcnJvclJlc3BvbnNlLmJvZHkpLFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdWlsZCBlcnJvciByZXNwb25zZSBvYmplY3RcclxuICovXHJcbmZ1bmN0aW9uIGJ1aWxkRXJyb3JSZXNwb25zZShlcnJvcjogYW55KToge1xyXG4gIHN0YXR1c0NvZGU6IG51bWJlcjtcclxuICBib2R5OiBFcnJvclJlc3BvbnNlO1xyXG59IHtcclxuICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBBcHBFcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogZXJyb3Iuc3RhdHVzQ29kZSxcclxuICAgICAgYm9keToge1xyXG4gICAgICAgIGVycm9yOiBzYW5pdGl6ZUVycm9yTWVzc2FnZShlcnJvci5tZXNzYWdlKSxcclxuICAgICAgICBjb2RlOiBlcnJvci5jb2RlLFxyXG4gICAgICAgIHJlcXVlc3RJZDogcHJvY2Vzcy5lbnYuQVdTX1JFUVVFU1RfSUQsXHJcbiAgICAgICAgbWV0YWRhdGE6IGVycm9yLm1ldGFkYXRhLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vIEhhbmRsZSBBV1MgU0RLIGVycm9yc1xyXG4gIGlmIChlcnJvci5uYW1lID09PSAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgYm9keToge1xyXG4gICAgICAgIGVycm9yOiAnUmVzb3VyY2Ugbm90IGZvdW5kJyxcclxuICAgICAgICBjb2RlOiBFcnJvckNvZGUuTk9UX0ZPVU5ELFxyXG4gICAgICAgIHJlcXVlc3RJZDogcHJvY2Vzcy5lbnYuQVdTX1JFUVVFU1RfSUQsXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKGVycm9yLm5hbWUgPT09ICdDb25kaXRpb25hbENoZWNrRmFpbGVkRXhjZXB0aW9uJykge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNDA5LFxyXG4gICAgICBib2R5OiB7XHJcbiAgICAgICAgZXJyb3I6ICdSZXNvdXJjZSBhbHJlYWR5IGV4aXN0cyBvciBjb25kaXRpb24gbm90IG1ldCcsXHJcbiAgICAgICAgY29kZTogRXJyb3JDb2RlLkNPTkZMSUNULFxyXG4gICAgICAgIHJlcXVlc3RJZDogcHJvY2Vzcy5lbnYuQVdTX1JFUVVFU1RfSUQsXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgaWYgKGVycm9yLm5hbWUgPT09ICdWYWxpZGF0aW9uRXhjZXB0aW9uJykge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICBib2R5OiB7XHJcbiAgICAgICAgZXJyb3I6ICdJbnZhbGlkIHJlcXVlc3QgcGFyYW1ldGVycycsXHJcbiAgICAgICAgY29kZTogRXJyb3JDb2RlLlZBTElEQVRJT05fRVJST1IsXHJcbiAgICAgICAgcmVxdWVzdElkOiBwcm9jZXNzLmVudi5BV1NfUkVRVUVTVF9JRCxcclxuICAgICAgfSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBEZWZhdWx0IHRvIDUwMCBmb3IgdW5rbm93biBlcnJvcnNcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgYm9keToge1xyXG4gICAgICBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXHJcbiAgICAgIGNvZGU6IEVycm9yQ29kZS5JTlRFUk5BTF9FUlJPUixcclxuICAgICAgcmVxdWVzdElkOiBwcm9jZXNzLmVudi5BV1NfUkVRVUVTVF9JRCxcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFNhbml0aXplIGVycm9yIG1lc3NhZ2VzIHRvIHByZXZlbnQgbGVha2luZyBzZW5zaXRpdmUgaW5mb3JtYXRpb25cclxuICovXHJcbmZ1bmN0aW9uIHNhbml0aXplRXJyb3JNZXNzYWdlKG1lc3NhZ2U6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgLy8gUmVtb3ZlIHBvdGVudGlhbCBzZW5zaXRpdmUgcGF0dGVybnNcclxuICBjb25zdCBzYW5pdGl6ZWQgPSBtZXNzYWdlXHJcbiAgICAucmVwbGFjZSgvcGFzc3dvcmRbPTpdXFxzKlxcUysvZ2ksICdwYXNzd29yZD0qKionKVxyXG4gICAgLnJlcGxhY2UoL3Rva2VuWz06XVxccypcXFMrL2dpLCAndG9rZW49KioqJylcclxuICAgIC5yZXBsYWNlKC9rZXlbPTpdXFxzKlxcUysvZ2ksICdrZXk9KioqJylcclxuICAgIC5yZXBsYWNlKC9zZWNyZXRbPTpdXFxzKlxcUysvZ2ksICdzZWNyZXQ9KioqJyk7XHJcblxyXG4gIHJldHVybiBzYW5pdGl6ZWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcmFwIGFzeW5jIExhbWJkYSBoYW5kbGVyIHdpdGggZXJyb3IgaGFuZGxpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3aXRoRXJyb3JIYW5kbGVyPFQgPSBhbnk+KFxyXG4gIGhhbmRsZXI6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+LFxyXG4gIGxvZ2dlcjogTG9nZ2VyXHJcbik6ICguLi5hcmdzOiBhbnlbXSkgPT4gUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICByZXR1cm4gYXN5bmMgKC4uLmFyZ3M6IGFueVtdKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVyKC4uLmFyZ3MpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGhhbmRsZUVycm9yKGVycm9yLCBsb2dnZXIpO1xyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBc3NlcnQgY29uZGl0aW9uIGFuZCB0aHJvdyBlcnJvciBpZiBmYWxzZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGFzc2VydChcclxuICBjb25kaXRpb246IGJvb2xlYW4sXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlciA9IDQwMCxcclxuICBjb2RlOiBFcnJvckNvZGUgPSBFcnJvckNvZGUuVkFMSURBVElPTl9FUlJPUlxyXG4pOiBhc3NlcnRzIGNvbmRpdGlvbiB7XHJcbiAgaWYgKCFjb25kaXRpb24pIHtcclxuICAgIHRocm93IG5ldyBBcHBFcnJvcihtZXNzYWdlLCBzdGF0dXNDb2RlLCBjb2RlKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBBc3NlcnQgdmFsdWUgaXMgbm90IG51bGwvdW5kZWZpbmVkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gYXNzZXJ0RXhpc3RzPFQ+KFxyXG4gIHZhbHVlOiBUIHwgbnVsbCB8IHVuZGVmaW5lZCxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogYXNzZXJ0cyB2YWx1ZSBpcyBUIHtcclxuICBpZiAodmFsdWUgPT09IG51bGwgfHwgdmFsdWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgdGhyb3cgbmV3IEFwcEVycm9yKG1lc3NhZ2UsIDQwNCwgRXJyb3JDb2RlLk5PVF9GT1VORCk7XHJcbiAgfVxyXG59XHJcbiJdfQ==