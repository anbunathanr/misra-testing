/**
 * Structured Logger Utility
 * Provides consistent logging across all Lambda functions with CloudWatch Insights support
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
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

export class Logger {
  private context: string;
  private defaultMetadata: LogMetadata;

  constructor(context: string, defaultMetadata: LogMetadata = {}) {
    this.context = context;
    this.defaultMetadata = defaultMetadata;
  }

  /**
   * Log a message with the specified level
   */
  private log(level: LogLevel, message: string, meta?: LogMetadata): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      requestId: process.env.AWS_REQUEST_ID,
      ...this.defaultMetadata,
      ...meta,
    };

    // Output as JSON for CloudWatch Insights
    console.log(JSON.stringify(logEntry));
  }

  /**
   * Log debug message (verbose information for development)
   */
  debug(message: string, meta?: LogMetadata): void {
    if (process.env.LOG_LEVEL === 'DEBUG') {
      this.log(LogLevel.DEBUG, message, meta);
    }
  }

  /**
   * Log info message (general information about application flow)
   */
  info(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * Log warning message (potentially harmful situations)
   */
  warn(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * Log error message (error events that might still allow the application to continue)
   */
  error(message: string, error?: Error, meta?: LogMetadata): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      context: this.context,
      message,
      requestId: process.env.AWS_REQUEST_ID,
      ...this.defaultMetadata,
      ...meta,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
          }
        : undefined,
    };

    console.error(JSON.stringify(logEntry));
  }

  /**
   * Create a child logger with additional context
   */
  child(additionalContext: string, additionalMetadata: LogMetadata = {}): Logger {
    return new Logger(
      `${this.context}.${additionalContext}`,
      { ...this.defaultMetadata, ...additionalMetadata }
    );
  }

  /**
   * Log execution timing
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { duration });
    };
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string, metadata?: LogMetadata): Logger {
  return new Logger(context, metadata);
}
