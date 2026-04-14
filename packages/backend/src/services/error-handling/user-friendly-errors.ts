/**
 * User-Friendly Error Messages Service
 * Converts technical errors into user-friendly messages with recovery suggestions
 */

import { ErrorCode } from '../../utils/app-error';

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion: string;
  recoverable: boolean;
  retryable: boolean;
  contactSupport: boolean;
  errorCode: string;
  technicalDetails?: string;
}

export interface ErrorContext {
  operation?: string;
  resource?: string;
  userId?: string;
  requestId?: string;
  timestamp?: string;
}

/**
 * Service for converting technical errors to user-friendly messages
 */
export class UserFriendlyErrorService {
  private errorMappings: Record<string, UserFriendlyError> = {
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
  getUserFriendlyError(
    error: Error | string,
    context?: ErrorContext
  ): UserFriendlyError {
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
  private extractErrorCode(errorMessage: string): string {
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
  private customizeErrorForContext(
    userError: UserFriendlyError,
    context?: ErrorContext
  ): UserFriendlyError {
    if (!context) return userError;

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
  getErrorByCode(errorCode: string): UserFriendlyError | null {
    return this.errorMappings[errorCode] || null;
  }

  /**
   * Check if error is retryable
   */
  isRetryable(error: Error | string): boolean {
    const userError = this.getUserFriendlyError(error);
    return userError.retryable;
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(error: Error | string): boolean {
    const userError = this.getUserFriendlyError(error);
    return userError.recoverable;
  }

  /**
   * Get retry suggestion for error
   */
  getRetrySuggestion(error: Error | string, attemptCount: number = 1): string {
    const userError = this.getUserFriendlyError(error);
    
    if (!userError.retryable) {
      return userError.suggestion;
    }

    if (attemptCount === 1) {
      return userError.suggestion;
    } else if (attemptCount <= 3) {
      return `${userError.suggestion} (Attempt ${attemptCount})`;
    } else {
      return `Multiple attempts failed. ${userError.suggestion} If the problem persists, please contact support.`;
    }
  }

  /**
   * Add custom error mapping
   */
  addErrorMapping(errorCode: string, userError: UserFriendlyError): void {
    this.errorMappings[errorCode] = userError;
  }
}

// Global user-friendly error service instance
export const userFriendlyErrorService = new UserFriendlyErrorService();