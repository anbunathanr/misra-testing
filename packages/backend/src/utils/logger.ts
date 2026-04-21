/**
 * Enhanced Structured Logger Utility
 * Provides consistent logging across all Lambda functions with CloudWatch Insights support
 * Enhanced for production deployment with correlation IDs, performance timing, and custom metrics
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

export class Logger {
  private context: string;
  private defaultMetadata: LogMetadata;
  private correlationId?: string;
  private performanceTimers: Map<string, number> = new Map();

  constructor(context: string, defaultMetadata: LogMetadata = {}) {
    this.context = context;
    this.defaultMetadata = {
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      environment: process.env.ENVIRONMENT || 'unknown',
      ...defaultMetadata,
    };
    this.correlationId = defaultMetadata.correlationId;
  }

  /**
   * Set correlation ID for request tracing
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  getCorrelationId(): string | undefined {
    return this.correlationId;
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
      correlationId: this.correlationId,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      environment: process.env.ENVIRONMENT,
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
      correlationId: this.correlationId,
      functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
      functionVersion: process.env.AWS_LAMBDA_FUNCTION_VERSION,
      environment: process.env.ENVIRONMENT,
      ...this.defaultMetadata,
      ...meta,
      error: error
        ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
            code: (error as any).code,
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
      { 
        ...this.defaultMetadata, 
        ...additionalMetadata,
        correlationId: this.correlationId,
      }
    );
  }

  /**
   * Start a performance timer
   */
  startTimer(label: string): void {
    this.performanceTimers.set(label, Date.now());
    this.debug(`Timer started: ${label}`);
  }

  /**
   * End a performance timer and log the duration
   */
  endTimer(label: string, meta?: LogMetadata): number {
    const startTime = this.performanceTimers.get(label);
    if (!startTime) {
      this.warn(`Timer not found: ${label}`);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    this.performanceTimers.delete(label);

    this.info(`Timer completed: ${label}`, {
      ...meta,
      performance: {
        startTime,
        endTime,
        duration,
        memoryUsed: process.memoryUsage().heapUsed,
      },
    });

    return duration;
  }

  /**
   * Log execution timing (legacy method for backward compatibility)
   */
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`${label} completed`, { 
        duration,
        performance: {
          startTime: start,
          endTime: Date.now(),
          duration,
          memoryUsed: process.memoryUsage().heapUsed,
        },
      });
    };
  }

  /**
   * Log security events
   */
  security(message: string, meta?: LogMetadata): void {
    this.log(LogLevel.WARN, `[SECURITY] ${message}`, {
      ...meta,
      securityEvent: true,
    });
  }

  /**
   * Log business metrics
   */
  metric(metricName: string, value: number, unit: string = 'Count', meta?: LogMetadata): void {
    this.info(`[METRIC] ${metricName}`, {
      ...meta,
      metric: {
        name: metricName,
        value,
        unit,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Log API request/response
   */
  apiCall(method: string, path: string, statusCode: number, duration: number, meta?: LogMetadata): void {
    this.info(`[API] ${method} ${path} - ${statusCode}`, {
      ...meta,
      api: {
        method,
        path,
        statusCode,
        duration,
        success: statusCode >= 200 && statusCode < 400,
      },
    });
  }
}

/**
 * Create a logger instance for a specific context
 */
export function createLogger(context: string, metadata?: LogMetadata): Logger {
  return new Logger(context, metadata);
}

/**
 * Generate a correlation ID for request tracing
 */
export function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract correlation ID from API Gateway event headers
 */
export function extractCorrelationId(event: any): string {
  // Try to get from headers (case insensitive)
  const headers = event.headers || {};
  const correlationId = 
    headers['X-Correlation-ID'] ||
    headers['x-correlation-id'] ||
    headers['X-CORRELATION-ID'] ||
    headers['correlation-id'] ||
    generateCorrelationId();
  
  return correlationId;
}

/**
 * Create a logger with correlation ID from API Gateway event
 */
export function createLoggerWithCorrelation(context: string, event: any, metadata?: LogMetadata): Logger {
  const correlationId = extractCorrelationId(event);
  return new Logger(context, {
    ...metadata,
    correlationId,
  });
}

/**
 * Utility function to record custom CloudWatch metrics
 */
export async function recordCustomMetric(
  namespace: string,
  metricName: string,
  value: number,
  unit: string = 'Count',
  dimensions?: { [key: string]: string }
): Promise<void> {
  try {
    // In a real implementation, this would use AWS SDK CloudWatch
    // For now, we'll log it in a structured way that can be picked up by CloudWatch Insights
    const logger = createLogger('metrics');
    logger.metric(metricName, value, unit, {
      namespace,
      dimensions,
      cloudwatchMetric: true,
    });
  } catch (error) {
    console.error('Failed to record custom metric:', error);
  }
}
