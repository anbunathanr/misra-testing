/**
 * Error Handler Service
 * Centralized error handling and logging for the application
 */
import { MetadataError } from '../types/validation';
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface ErrorContext {
    userId?: string;
    fileId?: string;
    fileName?: string;
    analysisId?: string;
    operation?: string;
    retryCount?: number;
    metadata?: Record<string, any>;
}
export interface ErrorLog {
    errorId: string;
    timestamp: number;
    severity: ErrorSeverity;
    errorCode: string;
    message: string;
    stack?: string;
    context?: ErrorContext;
}
export declare class ErrorHandlerService {
    /**
     * Handle and log errors with appropriate severity
     */
    static handleError(error: Error | MetadataError, context?: ErrorContext, severity?: ErrorSeverity): ErrorLog;
    /**
     * Log error to console with formatting
     */
    private static logError;
    /**
     * Get console log level based on severity
     */
    private static getSeverityLogLevel;
    /**
     * Generate unique error ID
     */
    private static generateErrorId;
    /**
     * Create standardized error response for API
     */
    static createErrorResponse(error: Error | MetadataError, context?: ErrorContext): {
        statusCode: number;
        body: string;
    };
    /**
     * Determine if error should trigger user notification
     */
    static shouldNotifyUser(error: Error | MetadataError, severity: ErrorSeverity): boolean;
    /**
     * Create retry strategy based on error type
     */
    static getRetryStrategy(error: Error | MetadataError): {
        shouldRetry: boolean;
        retryAfter: number;
        maxRetries: number;
    };
}
