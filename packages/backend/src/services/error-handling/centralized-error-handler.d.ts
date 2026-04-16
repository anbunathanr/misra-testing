/**
 * Centralized Error Handler Service
 * Coordinates all error handling components for production error handling
 */
import { APIGatewayProxyResult } from 'aws-lambda';
import { ErrorContext } from './user-friendly-errors';
import { RetryConfig } from './enhanced-retry';
export interface ErrorHandlingConfig {
    enableCircuitBreaker: boolean;
    enableGracefulDegradation: boolean;
    enableUserFriendlyMessages: boolean;
    enableRetry: boolean;
    enableCorrelationIds: boolean;
    enableErrorLogging: boolean;
    retryConfig?: Partial<RetryConfig>;
}
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        userMessage: string;
        suggestion: string;
        recoverable: boolean;
        retryable: boolean;
        contactSupport: boolean;
        correlationId: string;
        timestamp: string;
        requestId?: string;
    };
}
/**
 * Centralized error handler that coordinates all error handling components
 */
export declare class CentralizedErrorHandler {
    private logger;
    private defaultConfig;
    constructor(config?: Partial<ErrorHandlingConfig>);
    /**
     * Execute operation with comprehensive error handling
     */
    executeWithErrorHandling<T>(operation: () => Promise<T>, serviceName: string, context?: ErrorContext, config?: Partial<ErrorHandlingConfig>): Promise<T>;
    /**
     * Handle error and apply transformations
     */
    private handleError;
    /**
     * Convert error to API Gateway response
     */
    handleApiError(error: any, context?: ErrorContext, config?: Partial<ErrorHandlingConfig>): APIGatewayProxyResult;
    /**
     * Wrap Lambda handler with comprehensive error handling
     */
    wrapLambdaHandler<TEvent = any, TResult = any>(handler: (event: TEvent, context: any) => Promise<APIGatewayProxyResult>, serviceName: string, config?: Partial<ErrorHandlingConfig>): (event: TEvent, context: any) => Promise<APIGatewayProxyResult>;
    /**
     * Log error with correlation ID and context
     */
    private logError;
    /**
     * Generate correlation ID for request tracking
     */
    private generateCorrelationId;
    /**
     * Get HTTP status code for error code
     */
    private getHttpStatusCode;
    /**
     * Get system health status
     */
    getSystemHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        services: Record<string, boolean>;
        circuitBreakers: Record<string, any>;
        timestamp: string;
    }>;
    /**
     * Reset all error handling components
     */
    resetAll(): void;
}
export declare const centralizedErrorHandler: CentralizedErrorHandler;
