/**
 * Error Handler Service
 * Centralized error handling and logging for the application
 */

import { MetadataError, ErrorCodes } from '../types/validation';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
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

export class ErrorHandlerService {
  /**
   * Handle and log errors with appropriate severity
   */
  static handleError(
    error: Error | MetadataError,
    context?: ErrorContext,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM
  ): ErrorLog {
    const errorLog: ErrorLog = {
      errorId: this.generateErrorId(),
      timestamp: Date.now(),
      severity,
      errorCode: error instanceof MetadataError ? error.code : ErrorCodes.UNKNOWN_ERROR,
      message: error.message,
      stack: error.stack,
      context
    };

    // Log to console (in production, this would go to CloudWatch)
    this.logError(errorLog);

    return errorLog;
  }

  /**
   * Log error to console with formatting
   */
  private static logError(errorLog: ErrorLog): void {
    const logLevel = this.getSeverityLogLevel(errorLog.severity);
    const logMessage = `[${errorLog.severity.toUpperCase()}] ${errorLog.errorCode}: ${errorLog.message}`;
    
    console[logLevel](logMessage, {
      errorId: errorLog.errorId,
      timestamp: new Date(errorLog.timestamp).toISOString(),
      context: errorLog.context,
      stack: errorLog.stack
    });
  }

  /**
   * Get console log level based on severity
   */
  private static getSeverityLogLevel(severity: ErrorSeverity): 'log' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'log';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'error';
      default:
        return 'error';
    }
  }

  /**
   * Generate unique error ID
   */
  private static generateErrorId(): string {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create standardized error response for API
   */
  static createErrorResponse(
    error: Error | MetadataError,
    context?: ErrorContext
  ): {
    statusCode: number;
    body: string;
  } {
    const errorLog = this.handleError(error, context);
    
    const statusCode = error instanceof MetadataError ? error.statusCode : 500;
    
    const response = {
      error: true,
      errorId: errorLog.errorId,
      errorCode: errorLog.errorCode,
      message: error.message,
      timestamp: errorLog.timestamp
    };

    return {
      statusCode,
      body: JSON.stringify(response)
    };
  }

  /**
   * Determine if error should trigger user notification
   */
  static shouldNotifyUser(error: Error | MetadataError, severity: ErrorSeverity): boolean {
    // Notify on high and critical errors
    if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
      return true;
    }

    // Notify on specific error codes
    if (error instanceof MetadataError) {
      const notifiableErrors = [
        ErrorCodes.ANALYSIS_FAILED,
        ErrorCodes.FILE_UPLOAD_FAILED,
        ErrorCodes.DATABASE_ERROR
      ];
      return notifiableErrors.includes(error.code as any);
    }

    return false;
  }

  /**
   * Create retry strategy based on error type
   */
  static getRetryStrategy(error: Error | MetadataError): {
    shouldRetry: boolean;
    retryAfter: number; // milliseconds
    maxRetries: number;
  } {
    if (error instanceof MetadataError) {
      switch (error.code) {
        case ErrorCodes.DATABASE_ERROR:
          return { shouldRetry: true, retryAfter: 1000, maxRetries: 3 };
        
        case ErrorCodes.NETWORK_ERROR:
          return { shouldRetry: true, retryAfter: 2000, maxRetries: 5 };
        
        case ErrorCodes.VALIDATION_ERROR:
        case ErrorCodes.UNAUTHORIZED:
        case ErrorCodes.NOT_FOUND:
          return { shouldRetry: false, retryAfter: 0, maxRetries: 0 };
        
        default:
          return { shouldRetry: true, retryAfter: 1000, maxRetries: 2 };
      }
    }

    // Default retry strategy for unknown errors
    return { shouldRetry: true, retryAfter: 1000, maxRetries: 2 };
  }
}
