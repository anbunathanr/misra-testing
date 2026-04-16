"use strict";
/**
 * User-Friendly Error Messages Service
 * Converts technical errors into user-friendly messages with recovery suggestions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.userFriendlyErrorService = exports.UserFriendlyErrorService = void 0;
/**
 * Service for converting technical errors to user-friendly messages
 */
class UserFriendlyErrorService {
    errorMappings = {
        // Network and Connection Errors
        'NETWORK_ERROR': {
            title: 'Connection Issue',
            message: 'We\'re having trouble connecting to our servers.',
            suggestion: 'Please check your internet connection and try again in a moment.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'NETWORK_ERROR'
        },
        'TIMEOUT_ERROR': {
            title: 'Request Timeout',
            message: 'The operation is taking longer than expected.',
            suggestion: 'Please try again. If the problem persists, try with a smaller file or contact support.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'TIMEOUT_ERROR'
        },
        'SERVICE_UNAVAILABLE': {
            title: 'Service Temporarily Unavailable',
            message: 'Our analysis service is temporarily unavailable.',
            suggestion: 'We\'re working to restore service. Please try again in a few minutes.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'SERVICE_UNAVAILABLE'
        },
        // Authentication Errors
        'UNAUTHORIZED': {
            title: 'Authentication Required',
            message: 'You need to be logged in to perform this action.',
            suggestion: 'Please log in and try again.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'UNAUTHORIZED'
        },
        'TOKEN_EXPIRED': {
            title: 'Session Expired',
            message: 'Your session has expired for security reasons.',
            suggestion: 'Please log in again to continue.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'TOKEN_EXPIRED'
        },
        'FORBIDDEN': {
            title: 'Access Denied',
            message: 'You don\'t have permission to perform this action.',
            suggestion: 'Contact your administrator if you believe this is an error.',
            recoverable: false,
            retryable: false,
            contactSupport: true,
            errorCode: 'FORBIDDEN'
        },
        // File Upload Errors
        'FILE_TOO_LARGE': {
            title: 'File Too Large',
            message: 'The selected file exceeds the maximum size limit of 10MB.',
            suggestion: 'Please select a smaller file or compress your code before uploading.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'FILE_TOO_LARGE'
        },
        'INVALID_FILE_TYPE': {
            title: 'Unsupported File Type',
            message: 'Only C and C++ source files are supported (.c, .cpp, .h, .hpp).',
            suggestion: 'Please select a valid C or C++ source file.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'INVALID_FILE_TYPE'
        },
        'UPLOAD_FAILED': {
            title: 'Upload Failed',
            message: 'We couldn\'t upload your file due to a technical issue.',
            suggestion: 'Please try uploading again. If the problem persists, try a different file.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'UPLOAD_FAILED'
        },
        // Analysis Errors
        'ANALYSIS_FAILED': {
            title: 'Analysis Failed',
            message: 'We encountered an error while analyzing your code.',
            suggestion: 'Please try again with a different file. If the issue continues, contact support.',
            recoverable: true,
            retryable: true,
            contactSupport: true,
            errorCode: 'ANALYSIS_FAILED'
        },
        'ANALYSIS_TIMEOUT': {
            title: 'Analysis Timeout',
            message: 'The code analysis is taking longer than expected.',
            suggestion: 'Try with a smaller file or simpler code. Large files may take several minutes.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'ANALYSIS_TIMEOUT'
        },
        'INVALID_CODE_FORMAT': {
            title: 'Invalid Code Format',
            message: 'The uploaded file doesn\'t appear to contain valid C/C++ code.',
            suggestion: 'Please ensure your file contains properly formatted C or C++ source code.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'INVALID_CODE_FORMAT'
        },
        // Rate Limiting Errors
        'RATE_LIMIT_EXCEEDED': {
            title: 'Too Many Requests',
            message: 'You\'ve exceeded the maximum number of requests allowed.',
            suggestion: 'Please wait a few minutes before trying again.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'RATE_LIMIT_EXCEEDED'
        },
        'QUOTA_EXCEEDED': {
            title: 'Usage Limit Reached',
            message: 'You\'ve reached your monthly analysis limit.',
            suggestion: 'Upgrade your plan or wait until next month to continue analyzing files.',
            recoverable: false,
            retryable: false,
            contactSupport: true,
            errorCode: 'QUOTA_EXCEEDED'
        },
        // Database Errors
        'DATABASE_ERROR': {
            title: 'Data Storage Issue',
            message: 'We\'re experiencing issues with our data storage system.',
            suggestion: 'Please try again in a few minutes. Your data is safe.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'DATABASE_ERROR'
        },
        'NOT_FOUND': {
            title: 'Resource Not Found',
            message: 'The requested file or analysis result could not be found.',
            suggestion: 'The file may have been deleted or the link may be expired. Please try uploading again.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'NOT_FOUND'
        },
        // Validation Errors
        'VALIDATION_ERROR': {
            title: 'Invalid Input',
            message: 'Some of the information you provided is not valid.',
            suggestion: 'Please check your input and try again.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'VALIDATION_ERROR'
        },
        'MISSING_REQUIRED_FIELD': {
            title: 'Missing Information',
            message: 'Some required information is missing.',
            suggestion: 'Please fill in all required fields and try again.',
            recoverable: true,
            retryable: false,
            contactSupport: false,
            errorCode: 'MISSING_REQUIRED_FIELD'
        },
        // Circuit Breaker Errors
        'CIRCUIT_BREAKER_OPEN': {
            title: 'Service Protection Active',
            message: 'Our system is temporarily protecting against service overload.',
            suggestion: 'Please wait a minute and try again. This helps ensure system stability.',
            recoverable: true,
            retryable: true,
            contactSupport: false,
            errorCode: 'CIRCUIT_BREAKER_OPEN'
        },
        // Generic Errors
        'INTERNAL_ERROR': {
            title: 'Something Went Wrong',
            message: 'We encountered an unexpected error while processing your request.',
            suggestion: 'Please try again. If the problem continues, contact our support team.',
            recoverable: true,
            retryable: true,
            contactSupport: true,
            errorCode: 'INTERNAL_ERROR'
        }
    };
    /**
     * Convert technical error to user-friendly message
     */
    getUserFriendlyError(error, context) {
        const errorMessage = typeof error === 'string' ? error : error.message;
        const errorCode = this.extractErrorCode(errorMessage);
        // Get base error mapping
        let userError = this.errorMappings[errorCode] || this.errorMappings['INTERNAL_ERROR'];
        // Customize based on context
        userError = this.customizeErrorForContext(userError, context);
        // Add technical details if available
        if (typeof error === 'object' && error.stack) {
            userError.technicalDetails = error.stack;
        }
        return userError;
    }
    /**
     * Extract error code from error message
     */
    extractErrorCode(errorMessage) {
        // Check for specific error patterns
        if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
            return 'TIMEOUT_ERROR';
        }
        if (errorMessage.includes('network') || errorMessage.includes('NETWORK')) {
            return 'NETWORK_ERROR';
        }
        if (errorMessage.includes('unauthorized') || errorMessage.includes('UNAUTHORIZED')) {
            return 'UNAUTHORIZED';
        }
        if (errorMessage.includes('forbidden') || errorMessage.includes('FORBIDDEN')) {
            return 'FORBIDDEN';
        }
        if (errorMessage.includes('not found') || errorMessage.includes('NOT_FOUND')) {
            return 'NOT_FOUND';
        }
        if (errorMessage.includes('file too large') || errorMessage.includes('FILE_TOO_LARGE')) {
            return 'FILE_TOO_LARGE';
        }
        if (errorMessage.includes('invalid file type') || errorMessage.includes('INVALID_FILE_TYPE')) {
            return 'INVALID_FILE_TYPE';
        }
        if (errorMessage.includes('rate limit') || errorMessage.includes('RATE_LIMIT')) {
            return 'RATE_LIMIT_EXCEEDED';
        }
        if (errorMessage.includes('circuit breaker') || errorMessage.includes('CIRCUIT_BREAKER')) {
            return 'CIRCUIT_BREAKER_OPEN';
        }
        if (errorMessage.includes('service unavailable') || errorMessage.includes('SERVICE_UNAVAILABLE')) {
            return 'SERVICE_UNAVAILABLE';
        }
        if (errorMessage.includes('analysis failed') || errorMessage.includes('ANALYSIS_FAILED')) {
            return 'ANALYSIS_FAILED';
        }
        if (errorMessage.includes('validation') || errorMessage.includes('VALIDATION')) {
            return 'VALIDATION_ERROR';
        }
        return 'INTERNAL_ERROR';
    }
    /**
     * Customize error message based on context
     */
    customizeErrorForContext(userError, context) {
        if (!context)
            return userError;
        const customized = { ...userError };
        // Add operation-specific context
        if (context.operation) {
            switch (context.operation) {
                case 'file-upload':
                    customized.message = customized.message.replace('processing your request', 'uploading your file');
                    break;
                case 'analysis':
                    customized.message = customized.message.replace('processing your request', 'analyzing your code');
                    break;
                case 'authentication':
                    customized.message = customized.message.replace('processing your request', 'authenticating your account');
                    break;
            }
        }
        // Add resource-specific context
        if (context.resource) {
            customized.message += ` (Resource: ${context.resource})`;
        }
        // Add request ID for support
        if (context.requestId && customized.contactSupport) {
            customized.suggestion += ` Please include this reference ID: ${context.requestId}`;
        }
        return customized;
    }
    /**
     * Get error message for specific error code
     */
    getErrorByCode(errorCode) {
        return this.errorMappings[errorCode] || null;
    }
    /**
     * Check if error is retryable
     */
    isRetryable(error) {
        const userError = this.getUserFriendlyError(error);
        return userError.retryable;
    }
    /**
     * Check if error is recoverable
     */
    isRecoverable(error) {
        const userError = this.getUserFriendlyError(error);
        return userError.recoverable;
    }
    /**
     * Get retry suggestion for error
     */
    getRetrySuggestion(error, attemptCount = 1) {
        const userError = this.getUserFriendlyError(error);
        if (!userError.retryable) {
            return userError.suggestion;
        }
        if (attemptCount === 1) {
            return userError.suggestion;
        }
        else if (attemptCount <= 3) {
            return `${userError.suggestion} (Attempt ${attemptCount})`;
        }
        else {
            return `Multiple attempts failed. ${userError.suggestion} If the problem persists, please contact support.`;
        }
    }
    /**
     * Add custom error mapping
     */
    addErrorMapping(errorCode, userError) {
        this.errorMappings[errorCode] = userError;
    }
}
exports.UserFriendlyErrorService = UserFriendlyErrorService;
// Global user-friendly error service instance
exports.userFriendlyErrorService = new UserFriendlyErrorService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlci1mcmllbmRseS1lcnJvcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1c2VyLWZyaWVuZGx5LWVycm9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUF1Qkg7O0dBRUc7QUFDSCxNQUFhLHdCQUF3QjtJQUMzQixhQUFhLEdBQXNDO1FBQ3pELGdDQUFnQztRQUNoQyxlQUFlLEVBQUU7WUFDZixLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLE9BQU8sRUFBRSxrREFBa0Q7WUFDM0QsVUFBVSxFQUFFLGtFQUFrRTtZQUM5RSxXQUFXLEVBQUUsSUFBSTtZQUNqQixTQUFTLEVBQUUsSUFBSTtZQUNmLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRSxlQUFlO1NBQzNCO1FBQ0QsZUFBZSxFQUFFO1lBQ2YsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixPQUFPLEVBQUUsK0NBQStDO1lBQ3hELFVBQVUsRUFBRSx3RkFBd0Y7WUFDcEcsV0FBVyxFQUFFLElBQUk7WUFDakIsU0FBUyxFQUFFLElBQUk7WUFDZixjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUUsZUFBZTtTQUMzQjtRQUNELHFCQUFxQixFQUFFO1lBQ3JCLEtBQUssRUFBRSxpQ0FBaUM7WUFDeEMsT0FBTyxFQUFFLGtEQUFrRDtZQUMzRCxVQUFVLEVBQUUsdUVBQXVFO1lBQ25GLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsY0FBYyxFQUFFLEtBQUs7WUFDckIsU0FBUyxFQUFFLHFCQUFxQjtTQUNqQztRQUVELHdCQUF3QjtRQUN4QixjQUFjLEVBQUU7WUFDZCxLQUFLLEVBQUUseUJBQXlCO1lBQ2hDLE9BQU8sRUFBRSxrREFBa0Q7WUFDM0QsVUFBVSxFQUFFLDhCQUE4QjtZQUMxQyxXQUFXLEVBQUUsSUFBSTtZQUNqQixTQUFTLEVBQUUsS0FBSztZQUNoQixjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUUsY0FBYztTQUMxQjtRQUNELGVBQWUsRUFBRTtZQUNmLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsT0FBTyxFQUFFLGdEQUFnRDtZQUN6RCxVQUFVLEVBQUUsa0NBQWtDO1lBQzlDLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRSxlQUFlO1NBQzNCO1FBQ0QsV0FBVyxFQUFFO1lBQ1gsS0FBSyxFQUFFLGVBQWU7WUFDdEIsT0FBTyxFQUFFLG9EQUFvRDtZQUM3RCxVQUFVLEVBQUUsNkRBQTZEO1lBQ3pFLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGNBQWMsRUFBRSxJQUFJO1lBQ3BCLFNBQVMsRUFBRSxXQUFXO1NBQ3ZCO1FBRUQscUJBQXFCO1FBQ3JCLGdCQUFnQixFQUFFO1lBQ2hCLEtBQUssRUFBRSxnQkFBZ0I7WUFDdkIsT0FBTyxFQUFFLDJEQUEyRDtZQUNwRSxVQUFVLEVBQUUsc0VBQXNFO1lBQ2xGLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRSxnQkFBZ0I7U0FDNUI7UUFDRCxtQkFBbUIsRUFBRTtZQUNuQixLQUFLLEVBQUUsdUJBQXVCO1lBQzlCLE9BQU8sRUFBRSxpRUFBaUU7WUFDMUUsVUFBVSxFQUFFLDZDQUE2QztZQUN6RCxXQUFXLEVBQUUsSUFBSTtZQUNqQixTQUFTLEVBQUUsS0FBSztZQUNoQixjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUUsbUJBQW1CO1NBQy9CO1FBQ0QsZUFBZSxFQUFFO1lBQ2YsS0FBSyxFQUFFLGVBQWU7WUFDdEIsT0FBTyxFQUFFLHlEQUF5RDtZQUNsRSxVQUFVLEVBQUUsNEVBQTRFO1lBQ3hGLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsY0FBYyxFQUFFLEtBQUs7WUFDckIsU0FBUyxFQUFFLGVBQWU7U0FDM0I7UUFFRCxrQkFBa0I7UUFDbEIsaUJBQWlCLEVBQUU7WUFDakIsS0FBSyxFQUFFLGlCQUFpQjtZQUN4QixPQUFPLEVBQUUsb0RBQW9EO1lBQzdELFVBQVUsRUFBRSxrRkFBa0Y7WUFDOUYsV0FBVyxFQUFFLElBQUk7WUFDakIsU0FBUyxFQUFFLElBQUk7WUFDZixjQUFjLEVBQUUsSUFBSTtZQUNwQixTQUFTLEVBQUUsaUJBQWlCO1NBQzdCO1FBQ0Qsa0JBQWtCLEVBQUU7WUFDbEIsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixPQUFPLEVBQUUsbURBQW1EO1lBQzVELFVBQVUsRUFBRSxnRkFBZ0Y7WUFDNUYsV0FBVyxFQUFFLElBQUk7WUFDakIsU0FBUyxFQUFFLElBQUk7WUFDZixjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUUsa0JBQWtCO1NBQzlCO1FBQ0QscUJBQXFCLEVBQUU7WUFDckIsS0FBSyxFQUFFLHFCQUFxQjtZQUM1QixPQUFPLEVBQUUsZ0VBQWdFO1lBQ3pFLFVBQVUsRUFBRSwyRUFBMkU7WUFDdkYsV0FBVyxFQUFFLElBQUk7WUFDakIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsY0FBYyxFQUFFLEtBQUs7WUFDckIsU0FBUyxFQUFFLHFCQUFxQjtTQUNqQztRQUVELHVCQUF1QjtRQUN2QixxQkFBcUIsRUFBRTtZQUNyQixLQUFLLEVBQUUsbUJBQW1CO1lBQzFCLE9BQU8sRUFBRSwwREFBMEQ7WUFDbkUsVUFBVSxFQUFFLGdEQUFnRDtZQUM1RCxXQUFXLEVBQUUsSUFBSTtZQUNqQixTQUFTLEVBQUUsSUFBSTtZQUNmLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRSxxQkFBcUI7U0FDakM7UUFDRCxnQkFBZ0IsRUFBRTtZQUNoQixLQUFLLEVBQUUscUJBQXFCO1lBQzVCLE9BQU8sRUFBRSw4Q0FBOEM7WUFDdkQsVUFBVSxFQUFFLHlFQUF5RTtZQUNyRixXQUFXLEVBQUUsS0FBSztZQUNsQixTQUFTLEVBQUUsS0FBSztZQUNoQixjQUFjLEVBQUUsSUFBSTtZQUNwQixTQUFTLEVBQUUsZ0JBQWdCO1NBQzVCO1FBRUQsa0JBQWtCO1FBQ2xCLGdCQUFnQixFQUFFO1lBQ2hCLEtBQUssRUFBRSxvQkFBb0I7WUFDM0IsT0FBTyxFQUFFLDBEQUEwRDtZQUNuRSxVQUFVLEVBQUUsdURBQXVEO1lBQ25FLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsY0FBYyxFQUFFLEtBQUs7WUFDckIsU0FBUyxFQUFFLGdCQUFnQjtTQUM1QjtRQUNELFdBQVcsRUFBRTtZQUNYLEtBQUssRUFBRSxvQkFBb0I7WUFDM0IsT0FBTyxFQUFFLDJEQUEyRDtZQUNwRSxVQUFVLEVBQUUsd0ZBQXdGO1lBQ3BHLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRSxXQUFXO1NBQ3ZCO1FBRUQsb0JBQW9CO1FBQ3BCLGtCQUFrQixFQUFFO1lBQ2xCLEtBQUssRUFBRSxlQUFlO1lBQ3RCLE9BQU8sRUFBRSxvREFBb0Q7WUFDN0QsVUFBVSxFQUFFLHdDQUF3QztZQUNwRCxXQUFXLEVBQUUsSUFBSTtZQUNqQixTQUFTLEVBQUUsS0FBSztZQUNoQixjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUUsa0JBQWtCO1NBQzlCO1FBQ0Qsd0JBQXdCLEVBQUU7WUFDeEIsS0FBSyxFQUFFLHFCQUFxQjtZQUM1QixPQUFPLEVBQUUsdUNBQXVDO1lBQ2hELFVBQVUsRUFBRSxtREFBbUQ7WUFDL0QsV0FBVyxFQUFFLElBQUk7WUFDakIsU0FBUyxFQUFFLEtBQUs7WUFDaEIsY0FBYyxFQUFFLEtBQUs7WUFDckIsU0FBUyxFQUFFLHdCQUF3QjtTQUNwQztRQUVELHlCQUF5QjtRQUN6QixzQkFBc0IsRUFBRTtZQUN0QixLQUFLLEVBQUUsMkJBQTJCO1lBQ2xDLE9BQU8sRUFBRSxnRUFBZ0U7WUFDekUsVUFBVSxFQUFFLHlFQUF5RTtZQUNyRixXQUFXLEVBQUUsSUFBSTtZQUNqQixTQUFTLEVBQUUsSUFBSTtZQUNmLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRSxzQkFBc0I7U0FDbEM7UUFFRCxpQkFBaUI7UUFDakIsZ0JBQWdCLEVBQUU7WUFDaEIsS0FBSyxFQUFFLHNCQUFzQjtZQUM3QixPQUFPLEVBQUUsbUVBQW1FO1lBQzVFLFVBQVUsRUFBRSx1RUFBdUU7WUFDbkYsV0FBVyxFQUFFLElBQUk7WUFDakIsU0FBUyxFQUFFLElBQUk7WUFDZixjQUFjLEVBQUUsSUFBSTtZQUNwQixTQUFTLEVBQUUsZ0JBQWdCO1NBQzVCO0tBQ0YsQ0FBQztJQUVGOztPQUVHO0lBQ0gsb0JBQW9CLENBQ2xCLEtBQXFCLEVBQ3JCLE9BQXNCO1FBRXRCLE1BQU0sWUFBWSxHQUFHLE9BQU8sS0FBSyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO1FBQ3ZFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUV0RCx5QkFBeUI7UUFDekIsSUFBSSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFdEYsNkJBQTZCO1FBQzdCLFNBQVMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTlELHFDQUFxQztRQUNyQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDN0MsU0FBUyxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUM7UUFDM0MsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7T0FFRztJQUNLLGdCQUFnQixDQUFDLFlBQW9CO1FBQzNDLG9DQUFvQztRQUNwQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3pFLE9BQU8sZUFBZSxDQUFDO1FBQ3pCLENBQUM7UUFDRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3pFLE9BQU8sZUFBZSxDQUFDO1FBQ3pCLENBQUM7UUFDRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ25GLE9BQU8sY0FBYyxDQUFDO1FBQ3hCLENBQUM7UUFDRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzdFLE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFDRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzdFLE9BQU8sV0FBVyxDQUFDO1FBQ3JCLENBQUM7UUFDRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztZQUN2RixPQUFPLGdCQUFnQixDQUFDO1FBQzFCLENBQUM7UUFDRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztZQUM3RixPQUFPLG1CQUFtQixDQUFDO1FBQzdCLENBQUM7UUFDRCxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1lBQy9FLE9BQU8scUJBQXFCLENBQUM7UUFDL0IsQ0FBQztRQUNELElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ3pGLE9BQU8sc0JBQXNCLENBQUM7UUFDaEMsQ0FBQztRQUNELElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO1lBQ2pHLE9BQU8scUJBQXFCLENBQUM7UUFDL0IsQ0FBQztRQUNELElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1lBQ3pGLE9BQU8saUJBQWlCLENBQUM7UUFDM0IsQ0FBQztRQUNELElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUM7WUFDL0UsT0FBTyxrQkFBa0IsQ0FBQztRQUM1QixDQUFDO1FBRUQsT0FBTyxnQkFBZ0IsQ0FBQztJQUMxQixDQUFDO0lBRUQ7O09BRUc7SUFDSyx3QkFBd0IsQ0FDOUIsU0FBNEIsRUFDNUIsT0FBc0I7UUFFdEIsSUFBSSxDQUFDLE9BQU87WUFBRSxPQUFPLFNBQVMsQ0FBQztRQUUvQixNQUFNLFVBQVUsR0FBRyxFQUFFLEdBQUcsU0FBUyxFQUFFLENBQUM7UUFFcEMsaUNBQWlDO1FBQ2pDLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ3RCLFFBQVEsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUMxQixLQUFLLGFBQWE7b0JBQ2hCLFVBQVUsQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMseUJBQXlCLEVBQUUscUJBQXFCLENBQUMsQ0FBQztvQkFDbEcsTUFBTTtnQkFDUixLQUFLLFVBQVU7b0JBQ2IsVUFBVSxDQUFDLE9BQU8sR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx5QkFBeUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO29CQUNsRyxNQUFNO2dCQUNSLEtBQUssZ0JBQWdCO29CQUNuQixVQUFVLENBQUMsT0FBTyxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHlCQUF5QixFQUFFLDZCQUE2QixDQUFDLENBQUM7b0JBQzFHLE1BQU07WUFDVixDQUFDO1FBQ0gsQ0FBQztRQUVELGdDQUFnQztRQUNoQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQixVQUFVLENBQUMsT0FBTyxJQUFJLGVBQWUsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDO1FBQzNELENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxPQUFPLENBQUMsU0FBUyxJQUFJLFVBQVUsQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNuRCxVQUFVLENBQUMsVUFBVSxJQUFJLHNDQUFzQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDckYsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDO0lBQ3BCLENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWMsQ0FBQyxTQUFpQjtRQUM5QixPQUFPLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLElBQUksSUFBSSxDQUFDO0lBQy9DLENBQUM7SUFFRDs7T0FFRztJQUNILFdBQVcsQ0FBQyxLQUFxQjtRQUMvQixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkQsT0FBTyxTQUFTLENBQUMsU0FBUyxDQUFDO0lBQzdCLENBQUM7SUFFRDs7T0FFRztJQUNILGFBQWEsQ0FBQyxLQUFxQjtRQUNqQyxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkQsT0FBTyxTQUFTLENBQUMsV0FBVyxDQUFDO0lBQy9CLENBQUM7SUFFRDs7T0FFRztJQUNILGtCQUFrQixDQUFDLEtBQXFCLEVBQUUsZUFBdUIsQ0FBQztRQUNoRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFbkQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUN6QixPQUFPLFNBQVMsQ0FBQyxVQUFVLENBQUM7UUFDOUIsQ0FBQztRQUVELElBQUksWUFBWSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sU0FBUyxDQUFDLFVBQVUsQ0FBQztRQUM5QixDQUFDO2FBQU0sSUFBSSxZQUFZLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTyxHQUFHLFNBQVMsQ0FBQyxVQUFVLGFBQWEsWUFBWSxHQUFHLENBQUM7UUFDN0QsQ0FBQzthQUFNLENBQUM7WUFDTixPQUFPLDZCQUE2QixTQUFTLENBQUMsVUFBVSxtREFBbUQsQ0FBQztRQUM5RyxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZSxDQUFDLFNBQWlCLEVBQUUsU0FBNEI7UUFDN0QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxTQUFTLENBQUM7SUFDNUMsQ0FBQztDQUNGO0FBcldELDREQXFXQztBQUVELDhDQUE4QztBQUNqQyxRQUFBLHdCQUF3QixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBVc2VyLUZyaWVuZGx5IEVycm9yIE1lc3NhZ2VzIFNlcnZpY2VcclxuICogQ29udmVydHMgdGVjaG5pY2FsIGVycm9ycyBpbnRvIHVzZXItZnJpZW5kbHkgbWVzc2FnZXMgd2l0aCByZWNvdmVyeSBzdWdnZXN0aW9uc1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEVycm9yQ29kZSB9IGZyb20gJy4uLy4uL3V0aWxzL2FwcC1lcnJvcic7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFVzZXJGcmllbmRseUVycm9yIHtcclxuICB0aXRsZTogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBzdWdnZXN0aW9uOiBzdHJpbmc7XHJcbiAgcmVjb3ZlcmFibGU6IGJvb2xlYW47XHJcbiAgcmV0cnlhYmxlOiBib29sZWFuO1xyXG4gIGNvbnRhY3RTdXBwb3J0OiBib29sZWFuO1xyXG4gIGVycm9yQ29kZTogc3RyaW5nO1xyXG4gIHRlY2huaWNhbERldGFpbHM/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JDb250ZXh0IHtcclxuICBvcGVyYXRpb24/OiBzdHJpbmc7XHJcbiAgcmVzb3VyY2U/OiBzdHJpbmc7XHJcbiAgdXNlcklkPzogc3RyaW5nO1xyXG4gIHJlcXVlc3RJZD86IHN0cmluZztcclxuICB0aW1lc3RhbXA/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTZXJ2aWNlIGZvciBjb252ZXJ0aW5nIHRlY2huaWNhbCBlcnJvcnMgdG8gdXNlci1mcmllbmRseSBtZXNzYWdlc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFVzZXJGcmllbmRseUVycm9yU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBlcnJvck1hcHBpbmdzOiBSZWNvcmQ8c3RyaW5nLCBVc2VyRnJpZW5kbHlFcnJvcj4gPSB7XHJcbiAgICAvLyBOZXR3b3JrIGFuZCBDb25uZWN0aW9uIEVycm9yc1xyXG4gICAgJ05FVFdPUktfRVJST1InOiB7XHJcbiAgICAgIHRpdGxlOiAnQ29ubmVjdGlvbiBJc3N1ZScsXHJcbiAgICAgIG1lc3NhZ2U6ICdXZVxcJ3JlIGhhdmluZyB0cm91YmxlIGNvbm5lY3RpbmcgdG8gb3VyIHNlcnZlcnMuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBjaGVjayB5b3VyIGludGVybmV0IGNvbm5lY3Rpb24gYW5kIHRyeSBhZ2FpbiBpbiBhIG1vbWVudC4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICBjb250YWN0U3VwcG9ydDogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogJ05FVFdPUktfRVJST1InXHJcbiAgICB9LFxyXG4gICAgJ1RJTUVPVVRfRVJST1InOiB7XHJcbiAgICAgIHRpdGxlOiAnUmVxdWVzdCBUaW1lb3V0JyxcclxuICAgICAgbWVzc2FnZTogJ1RoZSBvcGVyYXRpb24gaXMgdGFraW5nIGxvbmdlciB0aGFuIGV4cGVjdGVkLicsXHJcbiAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2UgdHJ5IGFnYWluLiBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgdHJ5IHdpdGggYSBzbWFsbGVyIGZpbGUgb3IgY29udGFjdCBzdXBwb3J0LicsXHJcbiAgICAgIHJlY292ZXJhYmxlOiB0cnVlLFxyXG4gICAgICByZXRyeWFibGU6IHRydWUsXHJcbiAgICAgIGNvbnRhY3RTdXBwb3J0OiBmYWxzZSxcclxuICAgICAgZXJyb3JDb2RlOiAnVElNRU9VVF9FUlJPUidcclxuICAgIH0sXHJcbiAgICAnU0VSVklDRV9VTkFWQUlMQUJMRSc6IHtcclxuICAgICAgdGl0bGU6ICdTZXJ2aWNlIFRlbXBvcmFyaWx5IFVuYXZhaWxhYmxlJyxcclxuICAgICAgbWVzc2FnZTogJ091ciBhbmFseXNpcyBzZXJ2aWNlIGlzIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLicsXHJcbiAgICAgIHN1Z2dlc3Rpb246ICdXZVxcJ3JlIHdvcmtpbmcgdG8gcmVzdG9yZSBzZXJ2aWNlLiBQbGVhc2UgdHJ5IGFnYWluIGluIGEgZmV3IG1pbnV0ZXMuJyxcclxuICAgICAgcmVjb3ZlcmFibGU6IHRydWUsXHJcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdTRVJWSUNFX1VOQVZBSUxBQkxFJ1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBFcnJvcnNcclxuICAgICdVTkFVVEhPUklaRUQnOiB7XHJcbiAgICAgIHRpdGxlOiAnQXV0aGVudGljYXRpb24gUmVxdWlyZWQnLFxyXG4gICAgICBtZXNzYWdlOiAnWW91IG5lZWQgdG8gYmUgbG9nZ2VkIGluIHRvIHBlcmZvcm0gdGhpcyBhY3Rpb24uJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBsb2cgaW4gYW5kIHRyeSBhZ2Fpbi4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdVTkFVVEhPUklaRUQnXHJcbiAgICB9LFxyXG4gICAgJ1RPS0VOX0VYUElSRUQnOiB7XHJcbiAgICAgIHRpdGxlOiAnU2Vzc2lvbiBFeHBpcmVkJyxcclxuICAgICAgbWVzc2FnZTogJ1lvdXIgc2Vzc2lvbiBoYXMgZXhwaXJlZCBmb3Igc2VjdXJpdHkgcmVhc29ucy4nLFxyXG4gICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIGxvZyBpbiBhZ2FpbiB0byBjb250aW51ZS4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdUT0tFTl9FWFBJUkVEJ1xyXG4gICAgfSxcclxuICAgICdGT1JCSURERU4nOiB7XHJcbiAgICAgIHRpdGxlOiAnQWNjZXNzIERlbmllZCcsXHJcbiAgICAgIG1lc3NhZ2U6ICdZb3UgZG9uXFwndCBoYXZlIHBlcm1pc3Npb24gdG8gcGVyZm9ybSB0aGlzIGFjdGlvbi4nLFxyXG4gICAgICBzdWdnZXN0aW9uOiAnQ29udGFjdCB5b3VyIGFkbWluaXN0cmF0b3IgaWYgeW91IGJlbGlldmUgdGhpcyBpcyBhbiBlcnJvci4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogZmFsc2UsXHJcbiAgICAgIHJldHJ5YWJsZTogZmFsc2UsXHJcbiAgICAgIGNvbnRhY3RTdXBwb3J0OiB0cnVlLFxyXG4gICAgICBlcnJvckNvZGU6ICdGT1JCSURERU4nXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIEZpbGUgVXBsb2FkIEVycm9yc1xyXG4gICAgJ0ZJTEVfVE9PX0xBUkdFJzoge1xyXG4gICAgICB0aXRsZTogJ0ZpbGUgVG9vIExhcmdlJyxcclxuICAgICAgbWVzc2FnZTogJ1RoZSBzZWxlY3RlZCBmaWxlIGV4Y2VlZHMgdGhlIG1heGltdW0gc2l6ZSBsaW1pdCBvZiAxME1CLicsXHJcbiAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2Ugc2VsZWN0IGEgc21hbGxlciBmaWxlIG9yIGNvbXByZXNzIHlvdXIgY29kZSBiZWZvcmUgdXBsb2FkaW5nLicsXHJcbiAgICAgIHJlY292ZXJhYmxlOiB0cnVlLFxyXG4gICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgICBjb250YWN0U3VwcG9ydDogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogJ0ZJTEVfVE9PX0xBUkdFJ1xyXG4gICAgfSxcclxuICAgICdJTlZBTElEX0ZJTEVfVFlQRSc6IHtcclxuICAgICAgdGl0bGU6ICdVbnN1cHBvcnRlZCBGaWxlIFR5cGUnLFxyXG4gICAgICBtZXNzYWdlOiAnT25seSBDIGFuZCBDKysgc291cmNlIGZpbGVzIGFyZSBzdXBwb3J0ZWQgKC5jLCAuY3BwLCAuaCwgLmhwcCkuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBzZWxlY3QgYSB2YWxpZCBDIG9yIEMrKyBzb3VyY2UgZmlsZS4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdJTlZBTElEX0ZJTEVfVFlQRSdcclxuICAgIH0sXHJcbiAgICAnVVBMT0FEX0ZBSUxFRCc6IHtcclxuICAgICAgdGl0bGU6ICdVcGxvYWQgRmFpbGVkJyxcclxuICAgICAgbWVzc2FnZTogJ1dlIGNvdWxkblxcJ3QgdXBsb2FkIHlvdXIgZmlsZSBkdWUgdG8gYSB0ZWNobmljYWwgaXNzdWUuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSB0cnkgdXBsb2FkaW5nIGFnYWluLiBJZiB0aGUgcHJvYmxlbSBwZXJzaXN0cywgdHJ5IGEgZGlmZmVyZW50IGZpbGUuJyxcclxuICAgICAgcmVjb3ZlcmFibGU6IHRydWUsXHJcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdVUExPQURfRkFJTEVEJ1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBBbmFseXNpcyBFcnJvcnNcclxuICAgICdBTkFMWVNJU19GQUlMRUQnOiB7XHJcbiAgICAgIHRpdGxlOiAnQW5hbHlzaXMgRmFpbGVkJyxcclxuICAgICAgbWVzc2FnZTogJ1dlIGVuY291bnRlcmVkIGFuIGVycm9yIHdoaWxlIGFuYWx5emluZyB5b3VyIGNvZGUuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSB0cnkgYWdhaW4gd2l0aCBhIGRpZmZlcmVudCBmaWxlLiBJZiB0aGUgaXNzdWUgY29udGludWVzLCBjb250YWN0IHN1cHBvcnQuJyxcclxuICAgICAgcmVjb3ZlcmFibGU6IHRydWUsXHJcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IHRydWUsXHJcbiAgICAgIGVycm9yQ29kZTogJ0FOQUxZU0lTX0ZBSUxFRCdcclxuICAgIH0sXHJcbiAgICAnQU5BTFlTSVNfVElNRU9VVCc6IHtcclxuICAgICAgdGl0bGU6ICdBbmFseXNpcyBUaW1lb3V0JyxcclxuICAgICAgbWVzc2FnZTogJ1RoZSBjb2RlIGFuYWx5c2lzIGlzIHRha2luZyBsb25nZXIgdGhhbiBleHBlY3RlZC4nLFxyXG4gICAgICBzdWdnZXN0aW9uOiAnVHJ5IHdpdGggYSBzbWFsbGVyIGZpbGUgb3Igc2ltcGxlciBjb2RlLiBMYXJnZSBmaWxlcyBtYXkgdGFrZSBzZXZlcmFsIG1pbnV0ZXMuJyxcclxuICAgICAgcmVjb3ZlcmFibGU6IHRydWUsXHJcbiAgICAgIHJldHJ5YWJsZTogdHJ1ZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdBTkFMWVNJU19USU1FT1VUJ1xyXG4gICAgfSxcclxuICAgICdJTlZBTElEX0NPREVfRk9STUFUJzoge1xyXG4gICAgICB0aXRsZTogJ0ludmFsaWQgQ29kZSBGb3JtYXQnLFxyXG4gICAgICBtZXNzYWdlOiAnVGhlIHVwbG9hZGVkIGZpbGUgZG9lc25cXCd0IGFwcGVhciB0byBjb250YWluIHZhbGlkIEMvQysrIGNvZGUuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSBlbnN1cmUgeW91ciBmaWxlIGNvbnRhaW5zIHByb3Blcmx5IGZvcm1hdHRlZCBDIG9yIEMrKyBzb3VyY2UgY29kZS4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdJTlZBTElEX0NPREVfRk9STUFUJ1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBSYXRlIExpbWl0aW5nIEVycm9yc1xyXG4gICAgJ1JBVEVfTElNSVRfRVhDRUVERUQnOiB7XHJcbiAgICAgIHRpdGxlOiAnVG9vIE1hbnkgUmVxdWVzdHMnLFxyXG4gICAgICBtZXNzYWdlOiAnWW91XFwndmUgZXhjZWVkZWQgdGhlIG1heGltdW0gbnVtYmVyIG9mIHJlcXVlc3RzIGFsbG93ZWQuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSB3YWl0IGEgZmV3IG1pbnV0ZXMgYmVmb3JlIHRyeWluZyBhZ2Fpbi4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICBjb250YWN0U3VwcG9ydDogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogJ1JBVEVfTElNSVRfRVhDRUVERUQnXHJcbiAgICB9LFxyXG4gICAgJ1FVT1RBX0VYQ0VFREVEJzoge1xyXG4gICAgICB0aXRsZTogJ1VzYWdlIExpbWl0IFJlYWNoZWQnLFxyXG4gICAgICBtZXNzYWdlOiAnWW91XFwndmUgcmVhY2hlZCB5b3VyIG1vbnRobHkgYW5hbHlzaXMgbGltaXQuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1VwZ3JhZGUgeW91ciBwbGFuIG9yIHdhaXQgdW50aWwgbmV4dCBtb250aCB0byBjb250aW51ZSBhbmFseXppbmcgZmlsZXMuJyxcclxuICAgICAgcmVjb3ZlcmFibGU6IGZhbHNlLFxyXG4gICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgICBjb250YWN0U3VwcG9ydDogdHJ1ZSxcclxuICAgICAgZXJyb3JDb2RlOiAnUVVPVEFfRVhDRUVERUQnXHJcbiAgICB9LFxyXG5cclxuICAgIC8vIERhdGFiYXNlIEVycm9yc1xyXG4gICAgJ0RBVEFCQVNFX0VSUk9SJzoge1xyXG4gICAgICB0aXRsZTogJ0RhdGEgU3RvcmFnZSBJc3N1ZScsXHJcbiAgICAgIG1lc3NhZ2U6ICdXZVxcJ3JlIGV4cGVyaWVuY2luZyBpc3N1ZXMgd2l0aCBvdXIgZGF0YSBzdG9yYWdlIHN5c3RlbS4nLFxyXG4gICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtaW51dGVzLiBZb3VyIGRhdGEgaXMgc2FmZS4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICBjb250YWN0U3VwcG9ydDogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogJ0RBVEFCQVNFX0VSUk9SJ1xyXG4gICAgfSxcclxuICAgICdOT1RfRk9VTkQnOiB7XHJcbiAgICAgIHRpdGxlOiAnUmVzb3VyY2UgTm90IEZvdW5kJyxcclxuICAgICAgbWVzc2FnZTogJ1RoZSByZXF1ZXN0ZWQgZmlsZSBvciBhbmFseXNpcyByZXN1bHQgY291bGQgbm90IGJlIGZvdW5kLicsXHJcbiAgICAgIHN1Z2dlc3Rpb246ICdUaGUgZmlsZSBtYXkgaGF2ZSBiZWVuIGRlbGV0ZWQgb3IgdGhlIGxpbmsgbWF5IGJlIGV4cGlyZWQuIFBsZWFzZSB0cnkgdXBsb2FkaW5nIGFnYWluLicsXHJcbiAgICAgIHJlY292ZXJhYmxlOiB0cnVlLFxyXG4gICAgICByZXRyeWFibGU6IGZhbHNlLFxyXG4gICAgICBjb250YWN0U3VwcG9ydDogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogJ05PVF9GT1VORCdcclxuICAgIH0sXHJcblxyXG4gICAgLy8gVmFsaWRhdGlvbiBFcnJvcnNcclxuICAgICdWQUxJREFUSU9OX0VSUk9SJzoge1xyXG4gICAgICB0aXRsZTogJ0ludmFsaWQgSW5wdXQnLFxyXG4gICAgICBtZXNzYWdlOiAnU29tZSBvZiB0aGUgaW5mb3JtYXRpb24geW91IHByb3ZpZGVkIGlzIG5vdCB2YWxpZC4nLFxyXG4gICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIGNoZWNrIHlvdXIgaW5wdXQgYW5kIHRyeSBhZ2Fpbi4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiBmYWxzZSxcclxuICAgICAgY29udGFjdFN1cHBvcnQ6IGZhbHNlLFxyXG4gICAgICBlcnJvckNvZGU6ICdWQUxJREFUSU9OX0VSUk9SJ1xyXG4gICAgfSxcclxuICAgICdNSVNTSU5HX1JFUVVJUkVEX0ZJRUxEJzoge1xyXG4gICAgICB0aXRsZTogJ01pc3NpbmcgSW5mb3JtYXRpb24nLFxyXG4gICAgICBtZXNzYWdlOiAnU29tZSByZXF1aXJlZCBpbmZvcm1hdGlvbiBpcyBtaXNzaW5nLicsXHJcbiAgICAgIHN1Z2dlc3Rpb246ICdQbGVhc2UgZmlsbCBpbiBhbGwgcmVxdWlyZWQgZmllbGRzIGFuZCB0cnkgYWdhaW4uJyxcclxuICAgICAgcmVjb3ZlcmFibGU6IHRydWUsXHJcbiAgICAgIHJldHJ5YWJsZTogZmFsc2UsXHJcbiAgICAgIGNvbnRhY3RTdXBwb3J0OiBmYWxzZSxcclxuICAgICAgZXJyb3JDb2RlOiAnTUlTU0lOR19SRVFVSVJFRF9GSUVMRCdcclxuICAgIH0sXHJcblxyXG4gICAgLy8gQ2lyY3VpdCBCcmVha2VyIEVycm9yc1xyXG4gICAgJ0NJUkNVSVRfQlJFQUtFUl9PUEVOJzoge1xyXG4gICAgICB0aXRsZTogJ1NlcnZpY2UgUHJvdGVjdGlvbiBBY3RpdmUnLFxyXG4gICAgICBtZXNzYWdlOiAnT3VyIHN5c3RlbSBpcyB0ZW1wb3JhcmlseSBwcm90ZWN0aW5nIGFnYWluc3Qgc2VydmljZSBvdmVybG9hZC4nLFxyXG4gICAgICBzdWdnZXN0aW9uOiAnUGxlYXNlIHdhaXQgYSBtaW51dGUgYW5kIHRyeSBhZ2Fpbi4gVGhpcyBoZWxwcyBlbnN1cmUgc3lzdGVtIHN0YWJpbGl0eS4nLFxyXG4gICAgICByZWNvdmVyYWJsZTogdHJ1ZSxcclxuICAgICAgcmV0cnlhYmxlOiB0cnVlLFxyXG4gICAgICBjb250YWN0U3VwcG9ydDogZmFsc2UsXHJcbiAgICAgIGVycm9yQ29kZTogJ0NJUkNVSVRfQlJFQUtFUl9PUEVOJ1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBHZW5lcmljIEVycm9yc1xyXG4gICAgJ0lOVEVSTkFMX0VSUk9SJzoge1xyXG4gICAgICB0aXRsZTogJ1NvbWV0aGluZyBXZW50IFdyb25nJyxcclxuICAgICAgbWVzc2FnZTogJ1dlIGVuY291bnRlcmVkIGFuIHVuZXhwZWN0ZWQgZXJyb3Igd2hpbGUgcHJvY2Vzc2luZyB5b3VyIHJlcXVlc3QuJyxcclxuICAgICAgc3VnZ2VzdGlvbjogJ1BsZWFzZSB0cnkgYWdhaW4uIElmIHRoZSBwcm9ibGVtIGNvbnRpbnVlcywgY29udGFjdCBvdXIgc3VwcG9ydCB0ZWFtLicsXHJcbiAgICAgIHJlY292ZXJhYmxlOiB0cnVlLFxyXG4gICAgICByZXRyeWFibGU6IHRydWUsXHJcbiAgICAgIGNvbnRhY3RTdXBwb3J0OiB0cnVlLFxyXG4gICAgICBlcnJvckNvZGU6ICdJTlRFUk5BTF9FUlJPUidcclxuICAgIH1cclxuICB9O1xyXG5cclxuICAvKipcclxuICAgKiBDb252ZXJ0IHRlY2huaWNhbCBlcnJvciB0byB1c2VyLWZyaWVuZGx5IG1lc3NhZ2VcclxuICAgKi9cclxuICBnZXRVc2VyRnJpZW5kbHlFcnJvcihcclxuICAgIGVycm9yOiBFcnJvciB8IHN0cmluZyxcclxuICAgIGNvbnRleHQ/OiBFcnJvckNvbnRleHRcclxuICApOiBVc2VyRnJpZW5kbHlFcnJvciB7XHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSB0eXBlb2YgZXJyb3IgPT09ICdzdHJpbmcnID8gZXJyb3IgOiBlcnJvci5tZXNzYWdlO1xyXG4gICAgY29uc3QgZXJyb3JDb2RlID0gdGhpcy5leHRyYWN0RXJyb3JDb2RlKGVycm9yTWVzc2FnZSk7XHJcbiAgICBcclxuICAgIC8vIEdldCBiYXNlIGVycm9yIG1hcHBpbmdcclxuICAgIGxldCB1c2VyRXJyb3IgPSB0aGlzLmVycm9yTWFwcGluZ3NbZXJyb3JDb2RlXSB8fCB0aGlzLmVycm9yTWFwcGluZ3NbJ0lOVEVSTkFMX0VSUk9SJ107XHJcbiAgICBcclxuICAgIC8vIEN1c3RvbWl6ZSBiYXNlZCBvbiBjb250ZXh0XHJcbiAgICB1c2VyRXJyb3IgPSB0aGlzLmN1c3RvbWl6ZUVycm9yRm9yQ29udGV4dCh1c2VyRXJyb3IsIGNvbnRleHQpO1xyXG4gICAgXHJcbiAgICAvLyBBZGQgdGVjaG5pY2FsIGRldGFpbHMgaWYgYXZhaWxhYmxlXHJcbiAgICBpZiAodHlwZW9mIGVycm9yID09PSAnb2JqZWN0JyAmJiBlcnJvci5zdGFjaykge1xyXG4gICAgICB1c2VyRXJyb3IudGVjaG5pY2FsRGV0YWlscyA9IGVycm9yLnN0YWNrO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB1c2VyRXJyb3I7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFeHRyYWN0IGVycm9yIGNvZGUgZnJvbSBlcnJvciBtZXNzYWdlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBleHRyYWN0RXJyb3JDb2RlKGVycm9yTWVzc2FnZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIC8vIENoZWNrIGZvciBzcGVjaWZpYyBlcnJvciBwYXR0ZXJuc1xyXG4gICAgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygndGltZW91dCcpIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnVElNRU9VVCcpKSB7XHJcbiAgICAgIHJldHVybiAnVElNRU9VVF9FUlJPUic7XHJcbiAgICB9XHJcbiAgICBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCduZXR3b3JrJykgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdORVRXT1JLJykpIHtcclxuICAgICAgcmV0dXJuICdORVRXT1JLX0VSUk9SJztcclxuICAgIH1cclxuICAgIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ3VuYXV0aG9yaXplZCcpIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnVU5BVVRIT1JJWkVEJykpIHtcclxuICAgICAgcmV0dXJuICdVTkFVVEhPUklaRUQnO1xyXG4gICAgfVxyXG4gICAgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygnZm9yYmlkZGVuJykgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdGT1JCSURERU4nKSkge1xyXG4gICAgICByZXR1cm4gJ0ZPUkJJRERFTic7XHJcbiAgICB9XHJcbiAgICBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdub3QgZm91bmQnKSB8fCBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ05PVF9GT1VORCcpKSB7XHJcbiAgICAgIHJldHVybiAnTk9UX0ZPVU5EJztcclxuICAgIH1cclxuICAgIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ2ZpbGUgdG9vIGxhcmdlJykgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdGSUxFX1RPT19MQVJHRScpKSB7XHJcbiAgICAgIHJldHVybiAnRklMRV9UT09fTEFSR0UnO1xyXG4gICAgfVxyXG4gICAgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygnaW52YWxpZCBmaWxlIHR5cGUnKSB8fCBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfRklMRV9UWVBFJykpIHtcclxuICAgICAgcmV0dXJuICdJTlZBTElEX0ZJTEVfVFlQRSc7XHJcbiAgICB9XHJcbiAgICBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdyYXRlIGxpbWl0JykgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdSQVRFX0xJTUlUJykpIHtcclxuICAgICAgcmV0dXJuICdSQVRFX0xJTUlUX0VYQ0VFREVEJztcclxuICAgIH1cclxuICAgIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ2NpcmN1aXQgYnJlYWtlcicpIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnQ0lSQ1VJVF9CUkVBS0VSJykpIHtcclxuICAgICAgcmV0dXJuICdDSVJDVUlUX0JSRUFLRVJfT1BFTic7XHJcbiAgICB9XHJcbiAgICBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdzZXJ2aWNlIHVuYXZhaWxhYmxlJykgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdTRVJWSUNFX1VOQVZBSUxBQkxFJykpIHtcclxuICAgICAgcmV0dXJuICdTRVJWSUNFX1VOQVZBSUxBQkxFJztcclxuICAgIH1cclxuICAgIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ2FuYWx5c2lzIGZhaWxlZCcpIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnQU5BTFlTSVNfRkFJTEVEJykpIHtcclxuICAgICAgcmV0dXJuICdBTkFMWVNJU19GQUlMRUQnO1xyXG4gICAgfVxyXG4gICAgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygndmFsaWRhdGlvbicpIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnVkFMSURBVElPTicpKSB7XHJcbiAgICAgIHJldHVybiAnVkFMSURBVElPTl9FUlJPUic7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuICdJTlRFUk5BTF9FUlJPUic7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDdXN0b21pemUgZXJyb3IgbWVzc2FnZSBiYXNlZCBvbiBjb250ZXh0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjdXN0b21pemVFcnJvckZvckNvbnRleHQoXHJcbiAgICB1c2VyRXJyb3I6IFVzZXJGcmllbmRseUVycm9yLFxyXG4gICAgY29udGV4dD86IEVycm9yQ29udGV4dFxyXG4gICk6IFVzZXJGcmllbmRseUVycm9yIHtcclxuICAgIGlmICghY29udGV4dCkgcmV0dXJuIHVzZXJFcnJvcjtcclxuXHJcbiAgICBjb25zdCBjdXN0b21pemVkID0geyAuLi51c2VyRXJyb3IgfTtcclxuXHJcbiAgICAvLyBBZGQgb3BlcmF0aW9uLXNwZWNpZmljIGNvbnRleHRcclxuICAgIGlmIChjb250ZXh0Lm9wZXJhdGlvbikge1xyXG4gICAgICBzd2l0Y2ggKGNvbnRleHQub3BlcmF0aW9uKSB7XHJcbiAgICAgICAgY2FzZSAnZmlsZS11cGxvYWQnOlxyXG4gICAgICAgICAgY3VzdG9taXplZC5tZXNzYWdlID0gY3VzdG9taXplZC5tZXNzYWdlLnJlcGxhY2UoJ3Byb2Nlc3NpbmcgeW91ciByZXF1ZXN0JywgJ3VwbG9hZGluZyB5b3VyIGZpbGUnKTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgJ2FuYWx5c2lzJzpcclxuICAgICAgICAgIGN1c3RvbWl6ZWQubWVzc2FnZSA9IGN1c3RvbWl6ZWQubWVzc2FnZS5yZXBsYWNlKCdwcm9jZXNzaW5nIHlvdXIgcmVxdWVzdCcsICdhbmFseXppbmcgeW91ciBjb2RlJyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlICdhdXRoZW50aWNhdGlvbic6XHJcbiAgICAgICAgICBjdXN0b21pemVkLm1lc3NhZ2UgPSBjdXN0b21pemVkLm1lc3NhZ2UucmVwbGFjZSgncHJvY2Vzc2luZyB5b3VyIHJlcXVlc3QnLCAnYXV0aGVudGljYXRpbmcgeW91ciBhY2NvdW50Jyk7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCByZXNvdXJjZS1zcGVjaWZpYyBjb250ZXh0XHJcbiAgICBpZiAoY29udGV4dC5yZXNvdXJjZSkge1xyXG4gICAgICBjdXN0b21pemVkLm1lc3NhZ2UgKz0gYCAoUmVzb3VyY2U6ICR7Y29udGV4dC5yZXNvdXJjZX0pYDtcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZGQgcmVxdWVzdCBJRCBmb3Igc3VwcG9ydFxyXG4gICAgaWYgKGNvbnRleHQucmVxdWVzdElkICYmIGN1c3RvbWl6ZWQuY29udGFjdFN1cHBvcnQpIHtcclxuICAgICAgY3VzdG9taXplZC5zdWdnZXN0aW9uICs9IGAgUGxlYXNlIGluY2x1ZGUgdGhpcyByZWZlcmVuY2UgSUQ6ICR7Y29udGV4dC5yZXF1ZXN0SWR9YDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gY3VzdG9taXplZDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBlcnJvciBtZXNzYWdlIGZvciBzcGVjaWZpYyBlcnJvciBjb2RlXHJcbiAgICovXHJcbiAgZ2V0RXJyb3JCeUNvZGUoZXJyb3JDb2RlOiBzdHJpbmcpOiBVc2VyRnJpZW5kbHlFcnJvciB8IG51bGwge1xyXG4gICAgcmV0dXJuIHRoaXMuZXJyb3JNYXBwaW5nc1tlcnJvckNvZGVdIHx8IG51bGw7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBlcnJvciBpcyByZXRyeWFibGVcclxuICAgKi9cclxuICBpc1JldHJ5YWJsZShlcnJvcjogRXJyb3IgfCBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHVzZXJFcnJvciA9IHRoaXMuZ2V0VXNlckZyaWVuZGx5RXJyb3IoZXJyb3IpO1xyXG4gICAgcmV0dXJuIHVzZXJFcnJvci5yZXRyeWFibGU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBlcnJvciBpcyByZWNvdmVyYWJsZVxyXG4gICAqL1xyXG4gIGlzUmVjb3ZlcmFibGUoZXJyb3I6IEVycm9yIHwgc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCB1c2VyRXJyb3IgPSB0aGlzLmdldFVzZXJGcmllbmRseUVycm9yKGVycm9yKTtcclxuICAgIHJldHVybiB1c2VyRXJyb3IucmVjb3ZlcmFibGU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgcmV0cnkgc3VnZ2VzdGlvbiBmb3IgZXJyb3JcclxuICAgKi9cclxuICBnZXRSZXRyeVN1Z2dlc3Rpb24oZXJyb3I6IEVycm9yIHwgc3RyaW5nLCBhdHRlbXB0Q291bnQ6IG51bWJlciA9IDEpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgdXNlckVycm9yID0gdGhpcy5nZXRVc2VyRnJpZW5kbHlFcnJvcihlcnJvcik7XHJcbiAgICBcclxuICAgIGlmICghdXNlckVycm9yLnJldHJ5YWJsZSkge1xyXG4gICAgICByZXR1cm4gdXNlckVycm9yLnN1Z2dlc3Rpb247XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGF0dGVtcHRDb3VudCA9PT0gMSkge1xyXG4gICAgICByZXR1cm4gdXNlckVycm9yLnN1Z2dlc3Rpb247XHJcbiAgICB9IGVsc2UgaWYgKGF0dGVtcHRDb3VudCA8PSAzKSB7XHJcbiAgICAgIHJldHVybiBgJHt1c2VyRXJyb3Iuc3VnZ2VzdGlvbn0gKEF0dGVtcHQgJHthdHRlbXB0Q291bnR9KWA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gYE11bHRpcGxlIGF0dGVtcHRzIGZhaWxlZC4gJHt1c2VyRXJyb3Iuc3VnZ2VzdGlvbn0gSWYgdGhlIHByb2JsZW0gcGVyc2lzdHMsIHBsZWFzZSBjb250YWN0IHN1cHBvcnQuYDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBjdXN0b20gZXJyb3IgbWFwcGluZ1xyXG4gICAqL1xyXG4gIGFkZEVycm9yTWFwcGluZyhlcnJvckNvZGU6IHN0cmluZywgdXNlckVycm9yOiBVc2VyRnJpZW5kbHlFcnJvcik6IHZvaWQge1xyXG4gICAgdGhpcy5lcnJvck1hcHBpbmdzW2Vycm9yQ29kZV0gPSB1c2VyRXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBHbG9iYWwgdXNlci1mcmllbmRseSBlcnJvciBzZXJ2aWNlIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCB1c2VyRnJpZW5kbHlFcnJvclNlcnZpY2UgPSBuZXcgVXNlckZyaWVuZGx5RXJyb3JTZXJ2aWNlKCk7Il19