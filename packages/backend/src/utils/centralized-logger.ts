import { v4 as uuidv4 } from 'uuid';

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
export class CentralizedLogger {
  private context: LogContext;
  private static instance: CentralizedLogger;

  constructor(initialContext?: Partial<LogContext>) {
    this.context = {
      correlationId: initialContext?.correlationId || uuidv4(),
      userId: initialContext?.userId,
      requestId: initialContext?.requestId,
      functionName: initialContext?.functionName || process.env.AWS_LAMBDA_FUNCTION_NAME,
      environment: initialContext?.environment || process.env.ENVIRONMENT || 'dev',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get or create singleton logger instance
   */
  public static getInstance(context?: Partial<LogContext>): CentralizedLogger {
    if (!CentralizedLogger.instance || context) {
      CentralizedLogger.instance = new CentralizedLogger(context);
    }
    return CentralizedLogger.instance;
  }

  /**
   * Create a new logger with updated context
   */
  public withContext(updates: Partial<LogContext>): CentralizedLogger {
    return new CentralizedLogger({
      ...this.context,
      ...updates,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Set correlation ID for request tracing
   */
  public setCorrelationId(correlationId: string): void {
    this.context.correlationId = correlationId;
  }

  /**
   * Get current correlation ID
   */
  public getCorrelationId(): string {
    return this.context.correlationId;
  }

  /**
   * Set user ID for user-specific logging
   */
  public setUserId(userId: string): void {
    this.context.userId = userId;
  }

  /**
   * Log debug message
   */
  public debug(message: string, metadata?: Record<string, any>): void {
    this.log('DEBUG', message, metadata);
  }

  /**
   * Log info message
   */
  public info(message: string, metadata?: Record<string, any>): void {
    this.log('INFO', message, metadata);
  }

  /**
   * Log warning message
   */
  public warn(message: string, metadata?: Record<string, any>): void {
    this.log('WARN', message, metadata);
  }

  /**
   * Log error message
   */
  public error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('ERROR', message, metadata, error);
  }

  /**
   * Log business metrics
   */
  public logBusinessMetric(metricName: string, value: number, unit: string = 'Count', metadata?: Record<string, any>): void {
    this.info(`Business metric: ${metricName}`, {
      metricType: 'business',
      metricName,
      value,
      unit,
      ...metadata,
    });
  }

  /**
   * Log performance metrics
   */
  public logPerformanceMetric(operation: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Performance metric: ${operation}`, {
      metricType: 'performance',
      operation,
      duration,
      unit: 'milliseconds',
      ...metadata,
    });
  }

  /**
   * Log security events
   */
  public logSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', metadata?: Record<string, any>): void {
    this.warn(`Security event: ${event}`, {
      eventType: 'security',
      event,
      severity,
      ...metadata,
    });
  }

  /**
   * Log user journey events
   */
  public logUserJourney(step: string, status: 'started' | 'completed' | 'failed', metadata?: Record<string, any>): void {
    this.info(`User journey: ${step} - ${status}`, {
      eventType: 'userJourney',
      step,
      status,
      ...metadata,
    });
  }

  /**
   * Log analysis events
   */
  public logAnalysisEvent(event: string, fileId?: string, analysisId?: string, metadata?: Record<string, any>): void {
    this.info(`Analysis event: ${event}`, {
      eventType: 'analysis',
      event,
      fileId,
      analysisId,
      ...metadata,
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogEntry['level'], message: string, metadata?: Record<string, any>, error?: Error): void {
    const logEntry: LogEntry = {
      level,
      message,
      context: {
        ...this.context,
        timestamp: new Date().toISOString(),
      },
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as any : undefined,
    };

    // Output structured JSON log
    const logOutput = JSON.stringify(logEntry, null, 0);
    
    // Use appropriate console method based on level
    switch (level) {
      case 'DEBUG':
        console.debug(logOutput);
        break;
      case 'INFO':
        console.info(logOutput);
        break;
      case 'WARN':
        console.warn(logOutput);
        break;
      case 'ERROR':
        console.error(logOutput);
        break;
    }

    // Send to CloudWatch if in AWS environment
    if (process.env.AWS_LAMBDA_FUNCTION_NAME) {
      this.sendToCloudWatch(logEntry);
    }
  }

  /**
   * Send log entry to CloudWatch for centralized logging
   */
  private async sendToCloudWatch(logEntry: LogEntry): Promise<void> {
    try {
      // In Lambda, console.log automatically goes to CloudWatch
      // For additional processing, we could use CloudWatch Logs SDK
      // This is a placeholder for future CloudWatch integration
      
      // Example: Send custom metrics to CloudWatch
      if (logEntry.metadata?.metricType) {
        await this.sendCustomMetric(logEntry);
      }
    } catch (error) {
      // Avoid infinite logging loops
      console.error('Failed to send log to CloudWatch:', error);
    }
  }

  /**
   * Send custom metrics to CloudWatch
   */
  private async sendCustomMetric(logEntry: LogEntry): Promise<void> {
    // This would integrate with CloudWatch Metrics API
    // For now, we'll use structured logging that can be parsed by metric filters
    
    if (logEntry.metadata?.metricType === 'business') {
      console.log(JSON.stringify({
        MetricType: 'Business',
        MetricName: logEntry.metadata.metricName,
        Value: logEntry.metadata.value,
        Unit: logEntry.metadata.unit,
        Timestamp: logEntry.context.timestamp,
        CorrelationId: logEntry.context.correlationId,
      }));
    }
    
    if (logEntry.metadata?.metricType === 'performance') {
      console.log(JSON.stringify({
        MetricType: 'Performance',
        Operation: logEntry.metadata.operation,
        Duration: logEntry.metadata.duration,
        Unit: 'Milliseconds',
        Timestamp: logEntry.context.timestamp,
        CorrelationId: logEntry.context.correlationId,
      }));
    }
  }
}

/**
 * Lambda middleware for automatic correlation ID handling
 */
export function withCorrelationId(handler: any) {
  return async (event: any, context: any) => {
    // Extract correlation ID from headers or generate new one
    const correlationId = event.headers?.['x-correlation-id'] || 
                         event.headers?.['X-Correlation-ID'] || 
                         uuidv4();

    // Extract user ID from JWT token if available
    const userId = event.requestContext?.authorizer?.userId;
    const requestId = context.awsRequestId;

    // Create logger with context
    const logger = new CentralizedLogger({
      correlationId,
      userId,
      requestId,
      functionName: context.functionName,
      environment: process.env.ENVIRONMENT,
    });

    // Add correlation ID to response headers
    const originalHandler = handler;
    const wrappedHandler = async (event: any, context: any) => {
      try {
        logger.info('Lambda function invoked', {
          functionName: context.functionName,
          requestId: context.awsRequestId,
          remainingTimeInMillis: context.getRemainingTimeInMillis(),
        });

        const startTime = Date.now();
        const result = await originalHandler(event, context);
        const duration = Date.now() - startTime;

        logger.logPerformanceMetric('lambda_execution', duration, {
          functionName: context.functionName,
          success: true,
        });

        logger.info('Lambda function completed successfully', {
          duration,
          statusCode: result?.statusCode,
        });

        // Add correlation ID to response headers
        if (result && typeof result === 'object' && result.headers) {
          result.headers['X-Correlation-ID'] = correlationId;
        } else if (result && typeof result === 'object') {
          result.headers = {
            ...result.headers,
            'X-Correlation-ID': correlationId,
          };
        }

        return result;
      } catch (error) {
        const duration = Date.now() - Date.now();
        
        logger.logPerformanceMetric('lambda_execution', duration, {
          functionName: context.functionName,
          success: false,
        });

        logger.error('Lambda function failed', error as Error, {
          functionName: context.functionName,
          requestId: context.awsRequestId,
        });

        throw error;
      }
    };

    return wrappedHandler(event, context);
  };
}

/**
 * Express middleware for correlation ID handling
 */
export function expressCorrelationMiddleware(req: any, res: any, next: any) {
  const correlationId = req.headers['x-correlation-id'] || 
                       req.headers['X-Correlation-ID'] || 
                       uuidv4();

  // Set correlation ID in response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Create logger and attach to request
  req.logger = new CentralizedLogger({
    correlationId,
    userId: req.user?.id,
    requestId: req.id || uuidv4(),
  });

  req.logger.info('HTTP request received', {
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  });

  next();
}

/**
 * Utility functions for common logging patterns
 */
export class LoggingUtils {
  /**
   * Log API request start
   */
  static logApiRequestStart(logger: CentralizedLogger, method: string, path: string, userId?: string): void {
    logger.logUserJourney('api_request_start', 'started', {
      method,
      path,
      userId,
    });
  }

  /**
   * Log API request completion
   */
  static logApiRequestComplete(logger: CentralizedLogger, method: string, path: string, statusCode: number, duration: number): void {
    logger.logUserJourney('api_request_complete', 'completed', {
      method,
      path,
      statusCode,
      duration,
    });

    logger.logPerformanceMetric('api_request', duration, {
      method,
      path,
      statusCode,
    });
  }

  /**
   * Log authentication events
   */
  static logAuthEvent(logger: CentralizedLogger, event: string, userId?: string, success: boolean = true): void {
    if (success) {
      logger.info(`Authentication event: ${event}`, {
        eventType: 'authentication',
        event,
        userId,
        success,
      });
    } else {
      logger.logSecurityEvent(`Authentication failed: ${event}`, 'MEDIUM', {
        event,
        userId,
        success,
      });
    }
  }

  /**
   * Log file operations
   */
  static logFileOperation(logger: CentralizedLogger, operation: string, fileId: string, fileName?: string, fileSize?: number): void {
    logger.logAnalysisEvent(`File ${operation}`, fileId, undefined, {
      operation,
      fileName,
      fileSize,
    });
  }

  /**
   * Log analysis operations
   */
  static logAnalysisOperation(logger: CentralizedLogger, operation: string, analysisId: string, fileId?: string, duration?: number): void {
    logger.logAnalysisEvent(`Analysis ${operation}`, fileId, analysisId, {
      operation,
      duration,
    });

    if (duration) {
      logger.logPerformanceMetric('analysis_operation', duration, {
        operation,
        analysisId,
        fileId,
      });
    }
  }

  /**
   * Log business metrics
   */
  static logComplianceScore(logger: CentralizedLogger, score: number, analysisId: string, violationCount: number): void {
    logger.logBusinessMetric('compliance_score', score, 'Percent', {
      analysisId,
      violationCount,
    });
  }

  /**
   * Log error with context
   */
  static logErrorWithContext(logger: CentralizedLogger, error: Error, operation: string, context?: Record<string, any>): void {
    logger.error(`Error in ${operation}`, error, {
      operation,
      errorName: error.name,
      ...context,
    });
  }
}

// Export singleton instance for convenience
export const logger = CentralizedLogger.getInstance();