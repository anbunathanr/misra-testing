/**
 * Structured Logger Utility
 * Provides consistent logging across all Lambda functions with CloudWatch Insights support
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
    userId?: string;
    metadata?: LogMetadata;
    error?: {
        message: string;
        stack?: string;
        name: string;
    };
}
export declare class Logger {
    private context;
    private defaultMetadata;
    constructor(context: string, defaultMetadata?: LogMetadata);
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
     * Log execution timing
     */
    time(label: string): () => void;
}
/**
 * Create a logger instance for a specific context
 */
export declare function createLogger(context: string, metadata?: LogMetadata): Logger;
