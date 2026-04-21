/**
 * Enhanced Error Handler Utility for Production Lambda Functions
 * Provides comprehensive error handling, retry logic, and structured error responses
 */
import { APIGatewayProxyResult } from 'aws-lambda';
export declare enum ErrorType {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
    AUTHORIZATION_ERROR = "AUTHORIZATION_ERROR",
    NOT_FOUND_ERROR = "NOT_FOUND_ERROR",
    CONFLICT_ERROR = "CONFLICT_ERROR",
    RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
export declare class AppError extends Error {
    readonly type: ErrorType;
    readonly statusCode: number;
    readonly isOperational: boolean;
    readonly correlationId?: string;
    readonly metadata?: any;
    constructor(message: string, type: ErrorType, statusCode?: number, isOperational?: boolean, correlationId?: string, metadata?: any);
}
export interface RetryConfig {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: ErrorType[];
}
export declare const DEFAULT_RETRY_CONFIG: RetryConfig;
/**
 * Enhanced error handler with retry logic and structured responses
 */
export declare class ErrorHandler {
    private logger;
    private retryConfig;
    constructor(context: string, retryConfig?: RetryConfig);
    /**
     * Execute a function with retry logic
     */
    withRetry<T>(operation: () => Promise<T>, operationName: string, correlationId?: string): Promise<T>;
    /**
     * Handle errors and create structured API Gateway responses
     */
    handleError(error: Error, correlationId?: string): APIGatewayProxyResult;
    /**
     * Create a structured error response
     */
    private createErrorResponse;
    /**
     * Handle AWS SDK specific errors
     */
    private handleAWSError;
    /**
     * Check if error is retryable based on configuration
     */
    private isRetryableError;
    /**
     * Check if error is an AWS SDK error
     */
    private isAWSError;
    /**
     * Check if error is a validation error
     */
    private isValidationError;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
}
/**
 * Create a success response with correlation ID
 */
export declare function createSuccessResponse(data: any, statusCode?: number, correlationId?: string): APIGatewayProxyResult;
/**
 * Validation helper functions
 */
export declare function validateRequired(value: any, fieldName: string): void;
export declare function validateEmail(email: string): void;
export declare function validateFileSize(size: number, maxSize?: number): void;
