/**
 * Authentication Error Handler
 * Specialized error handling for authentication services with correlation IDs,
 * error transformation, and comprehensive logging
 */
import { APIGatewayProxyResult } from 'aws-lambda';
export interface AuthError {
    code: string;
    message: string;
    userMessage: string;
    retryable: boolean;
    suggestion: string;
    correlationId: string;
    timestamp: Date;
    step?: string;
    statusCode: number;
}
export interface AuthErrorContext {
    operation: string;
    email?: string;
    userId?: string;
    step?: string;
    metadata?: Record<string, any>;
}
export declare class AuthErrorHandler {
    private logger;
    constructor(context?: string);
    /**
     * Handle authentication errors with correlation ID and proper logging
     */
    handleError(error: Error, context: AuthErrorContext): AuthError;
    /**
     * Transform technical errors into user-friendly errors
     */
    private transformError;
    /**
     * Convert AuthError to API Gateway response
     */
    toAPIResponse(authError: AuthError): APIGatewayProxyResult;
    /**
     * Log authentication event for monitoring
     */
    logAuthEvent(event: string, context: AuthErrorContext, success: boolean, metadata?: Record<string, any>): void;
    /**
     * Check if error is retryable
     */
    isRetryable(error: Error): boolean;
    /**
     * Get retry delay based on attempt count (exponential backoff)
     */
    getRetryDelay(attemptCount: number, baseDelay?: number): number;
}
/**
 * Create a singleton instance for the application
 */
export declare const authErrorHandler: AuthErrorHandler;
