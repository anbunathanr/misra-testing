/**
 * Enhanced Structured Logger Utility
 * Provides consistent logging across all Lambda functions with CloudWatch Insights support
 * Enhanced for production deployment with correlation IDs, performance timing, and custom metrics
 */
export declare enum LogLevel {
    DEBUG = "DEBUG",
    INFO = "INFO",
    WARN = "WARN",
    ERROR = "ERROR"
}
export interface LogMetadata {
    [key: string]: any;
}
export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    context: string;
    message: string;
    requestId?: string;
    correlationId?: string;
    userId?: string;
    functionName?: string;
    functionVersion?: string;
    environment?: string;
    duration?: number;
    metadata?: LogMetadata;
    error?: {
        message: string;
        stack?: string;
        name: string;
        code?: string;
    };
    performance?: {
        startTime?: number;
        endTime?: number;
        duration?: number;
        memoryUsed?: number;
    };
}
export declare class Logger {
    private context;
    private defaultMetadata;
    private correlationId?;
    private performanceTimers;
    constructor(context: string, defaultMetadata?: LogMetadata);
    /**
     * Set correlation ID for request tracing
     */
    setCorrelationId(correlationId: string): void;
    /**
     * Get current correlation ID
     */
    getCorrelationId(): string | undefined;
    /**
     * Log a message with the specified level
     */
    private log;
    /**
     * Log debug message (verbose information for development)
     */
    debug(message: string, meta?: LogMetadata): void;
    /**
     * Log info message (general information about application flow)
     */
    info(message: string, meta?: LogMetadata): void;
    /**
     * Log warning message (potentially harmful situations)
     */
    warn(message: string, meta?: LogMetadata): void;
    /**
     * Log error message (error events that might still allow the application to continue)
     */
    error(message: string, error?: Error, meta?: LogMetadata): void;
    /**
     * Create a child logger with additional context
     */
    child(additionalContext: string, additionalMetadata?: LogMetadata): Logger;
    /**
     * Start a performance timer
     */
    startTimer(label: string): void;
    /**
     * End a performance timer and log the duration
     */
    endTimer(label: string, meta?: LogMetadata): number;
    /**
     * Log execution timing (legacy method for backward compatibility)
     */
    time(label: string): () => void;
    /**
     * Log security events
     */
    security(message: string, meta?: LogMetadata): void;
    /**
     * Log business metrics
     */
    metric(metricName: string, value: number, unit?: string, meta?: LogMetadata): void;
    /**
     * Log API request/response
     */
    apiCall(method: string, path: string, statusCode: number, duration: number, meta?: LogMetadata): void;
}
/**
 * Create a logger instance for a specific context
 */
export declare function createLogger(context: string, metadata?: LogMetadata): Logger;
/**
 * Generate a correlation ID for request tracing
 */
export declare function generateCorrelationId(): string;
/**
 * Extract correlation ID from API Gateway event headers
 */
export declare function extractCorrelationId(event: any): string;
/**
 * Create a logger with correlation ID from API Gateway event
 */
export declare function createLoggerWithCorrelation(context: string, event: any, metadata?: LogMetadata): Logger;
/**
 * Utility function to record custom CloudWatch metrics
 */
export declare function recordCustomMetric(namespace: string, metricName: string, value: number, unit?: string, dimensions?: {
    [key: string]: string;
}): Promise<void>;
