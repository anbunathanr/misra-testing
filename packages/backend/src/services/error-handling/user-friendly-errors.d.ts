/**
 * User-Friendly Error Messages Service
 * Converts technical errors into user-friendly messages with recovery suggestions
 */
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
export declare class UserFriendlyErrorService {
    private errorMappings;
    /**
     * Convert technical error to user-friendly message
     */
    getUserFriendlyError(error: Error | string, context?: ErrorContext): UserFriendlyError;
    /**
     * Extract error code from error message
     */
    private extractErrorCode;
    /**
     * Customize error message based on context
     */
    private customizeErrorForContext;
    /**
     * Get error message for specific error code
     */
    getErrorByCode(errorCode: string): UserFriendlyError | null;
    /**
     * Check if error is retryable
     */
    isRetryable(error: Error | string): boolean;
    /**
     * Check if error is recoverable
     */
    isRecoverable(error: Error | string): boolean;
    /**
     * Get retry suggestion for error
     */
    getRetrySuggestion(error: Error | string, attemptCount?: number): string;
    /**
     * Add custom error mapping
     */
    addErrorMapping(errorCode: string, userError: UserFriendlyError): void;
}
export declare const userFriendlyErrorService: UserFriendlyErrorService;
