export interface LogContext {
    correlationId: string;
    userId?: string;
    requestId?: string;
    functionName?: string;
    environment?: string;
    timestamp: string;
}
export interface LogEntry {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    message: string;
    context: LogContext;
    metadata?: Record<string, any>;
    error?: Error;
}
/**
 * Centralized Logger with Correlation ID Support
 *
 * Implements structured logging for request tracing across the MISRA Platform.
 * All logs include correlation IDs for end-to-end request tracking.
 *
 * Features:
 * - Correlation ID generation and propagation
 * - Structured JSON logging
 * - CloudWatch integration
 * - Performance metrics tracking
 * - Security event logging
 * - Business metrics collection
 */
export declare class CentralizedLogger {
    private context;
    private static instance;
    constructor(initialContext?: Partial<LogContext>);
    /**
     * Get or create singleton logger instance
     */
    static getInstance(context?: Partial<LogContext>): CentralizedLogger;
    /**
     * Create a new logger with updated context
     */
    withContext(updates: Partial<LogContext>): CentralizedLogger;
    /**
     * Set correlation ID for request tracing
     */
    setCorrelationId(correlationId: string): void;
    /**
     * Get current correlation ID
     */
    getCorrelationId(): string;
    /**
     * Set user ID for user-specific logging
     */
    setUserId(userId: string): void;
    /**
     * Log debug message
     */
    debug(message: string, metadata?: Record<string, any>): void;
    /**
     * Log info message
     */
    info(message: string, metadata?: Record<string, any>): void;
    /**
     * Log warning message
     */
    warn(message: string, metadata?: Record<string, any>): void;
    /**
     * Log error message
     */
    error(message: string, error?: Error, metadata?: Record<string, any>): void;
    /**
     * Log business metrics
     */
    logBusinessMetric(metricName: string, value: number, unit?: string, metadata?: Record<string, any>): void;
    /**
     * Log performance metrics
     */
    logPerformanceMetric(operation: string, duration: number, metadata?: Record<string, any>): void;
    /**
     * Log security events
     */
    logSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', metadata?: Record<string, any>): void;
    /**
     * Log user journey events
     */
    logUserJourney(step: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, any>): void;
    /**
     * Log analysis events
     */
    logAnalysisEvent(event: string, fileId?: string, analysisId?: string, metadata?: Record<string, any>): void;
    /**
     * Core logging method
     */
    private log;
    /**
     * Send log entry to CloudWatch for centralized logging
     */
    private sendToCloudWatch;
    /**
     * Send custom metrics to CloudWatch
     */
    private sendCustomMetric;
}
/**
 * Lambda middleware for automatic correlation ID handling
 */
export declare function withCorrelationId(handler: any): (event: any, context: any) => Promise<any>;
/**
 * Express middleware for correlation ID handling
 */
export declare function expressCorrelationMiddleware(req: any, res: any, next: any): void;
/**
 * Utility functions for common logging patterns
 */
export declare class LoggingUtils {
    /**
     * Log API request start
     */
    static logApiRequestStart(logger: CentralizedLogger, method: string, path: string, userId?: string): void;
    /**
     * Log API request completion
     */
    static logApiRequestComplete(logger: CentralizedLogger, method: string, path: string, statusCode: number, duration: number): void;
    /**
     * Log authentication events
     */
    static logAuthEvent(logger: CentralizedLogger, event: string, userId?: string, success?: boolean): void;
    /**
     * Log file operations
     */
    static logFileOperation(logger: CentralizedLogger, operation: string, fileId: string, fileName?: string, fileSize?: number): void;
    /**
     * Log analysis operations
     */
    static logAnalysisOperation(logger: CentralizedLogger, operation: string, analysisId: string, fileId?: string, duration?: number): void;
    /**
     * Log business metrics
     */
    static logComplianceScore(logger: CentralizedLogger, score: number, analysisId: string, violationCount: number): void;
    /**
     * Log error with context
     */
    static logErrorWithContext(logger: CentralizedLogger, error: Error, operation: string, context?: Record<string, any>): void;
}
export declare const logger: CentralizedLogger;
