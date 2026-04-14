/**
 * Centralized Error Handler Service
 * Coordinates all error handling components for production error handling
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { Logger, createLogger } from '../../utils/logger';
import { AppError, ErrorCode } from '../../utils/app-error';
import { circuitBreakerManager } from './circuit-breaker';
import { gracefulDegradationService } from './graceful-degradation';
import { userFriendlyErrorService, UserFriendlyError, ErrorContext } from './user-friendly-errors';
import { enhancedRetryService, RetryConfig } from './enhanced-retry';

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
export class CentralizedErrorHandler {
  private logger: Logger;
  private defaultConfig: ErrorHandlingConfig = {
    enableCircuitBreaker: true,
    enableGracefulDegradation: true,
    enableUserFriendlyMessages: true,
    enableRetry: true,
    enableCorrelationIds: true,
    enableErrorLogging: true,
    retryConfig: {
      maxAttempts: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2,
      jitterEnabled: true
    }
  };

  constructor(config?: Partial<ErrorHandlingConfig>) {
    this.logger = createLogger('CentralizedErrorHandler');
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    serviceName: string,
    context?: ErrorContext,
    config?: Partial<ErrorHandlingConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const correlationId = this.generateCorrelationId();
    
    // Add correlation ID to context
    const enhancedContext = {
      ...context,
      requestId: correlationId
    };

    try {
      // Execute with circuit breaker and graceful degradation
      if (finalConfig.enableCircuitBreaker && finalConfig.enableGracefulDegradation) {
        return await gracefulDegradationService.executeWithFallback(
          serviceName,
          () => circuitBreakerManager.executeWithBreaker(serviceName, operation),
          undefined, // No custom fallback function
          { enableCaching: true, enableMockData: true }
        );
      }
      
      // Execute with circuit breaker only
      if (finalConfig.enableCircuitBreaker) {
        return await circuitBreakerManager.executeWithBreaker(serviceName, operation);
      }
      
      // Execute with retry only
      if (finalConfig.enableRetry) {
        return await enhancedRetryService.executeWithRetry(operation, finalConfig.retryConfig);
      }
      
      // Execute without protection
      return await operation();
      
    } catch (error) {
      // Handle and transform error
      return this.handleError(error, enhancedContext, finalConfig);
    }
  }

  /**
   * Handle error and apply transformations
   */
  private async handleError(
    error: any,
    context: ErrorContext,
    config: ErrorHandlingConfig
  ): Promise<never> {
    const correlationId = context.requestId || this.generateCorrelationId();
    
    // Log error if enabled
    if (config.enableErrorLogging) {
      this.logError(error, context, correlationId);
    }

    // Convert to user-friendly error if enabled
    let userFriendlyError: UserFriendlyError;
    if (config.enableUserFriendlyMessages) {
      userFriendlyError = userFriendlyErrorService.getUserFriendlyError(error, context);
    } else {
      // Fallback to basic error
      userFriendlyError = {
        title: 'Error',
        message: error instanceof Error ? error.message : String(error),
        suggestion: 'Please try again or contact support.',
        recoverable: true,
        retryable: false,
        contactSupport: true,
        errorCode: 'UNKNOWN_ERROR'
      };
    }

    // Create enhanced app error
    const appError = new AppError(
      userFriendlyError.message,
      this.getHttpStatusCode(userFriendlyError.errorCode),
      userFriendlyError.errorCode as ErrorCode,
      userFriendlyError.recoverable,
      {
        userFriendlyError,
        correlationId,
        context
      }
    );

    throw appError;
  }

  /**
   * Convert error to API Gateway response
   */
  handleApiError(
    error: any,
    context?: ErrorContext,
    config?: Partial<ErrorHandlingConfig>
  ): APIGatewayProxyResult {
    const finalConfig = { ...this.defaultConfig, ...config };
    const correlationId = context?.requestId || this.generateCorrelationId();
    
    try {
      // Log error
      if (finalConfig.enableErrorLogging) {
        this.logError(error, context, correlationId);
      }

      // Get user-friendly error
      let userFriendlyError: UserFriendlyError;
      if (finalConfig.enableUserFriendlyMessages) {
        userFriendlyError = userFriendlyErrorService.getUserFriendlyError(error, context);
      } else {
        userFriendlyError = {
          title: 'Error',
          message: error instanceof Error ? error.message : String(error),
          suggestion: 'Please try again or contact support.',
          recoverable: true,
          retryable: false,
          contactSupport: true,
          errorCode: 'UNKNOWN_ERROR'
        };
      }

      // Build error response
      const errorResponse: ErrorResponse = {
        error: {
          code: userFriendlyError.errorCode,
          message: error instanceof Error ? error.message : String(error),
          userMessage: userFriendlyError.message,
          suggestion: userFriendlyError.suggestion,
          recoverable: userFriendlyError.recoverable,
          retryable: userFriendlyError.retryable,
          contactSupport: userFriendlyError.contactSupport,
          correlationId,
          timestamp: new Date().toISOString(),
          requestId: process.env.AWS_REQUEST_ID
        }
      };

      const statusCode = this.getHttpStatusCode(userFriendlyError.errorCode);

      return {
        statusCode,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify(errorResponse)
      };

    } catch (handlingError) {
      // Fallback error response if error handling itself fails
      this.logger.error('Error handling failed', handlingError as Error);
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'X-Correlation-ID': correlationId
        },
        body: JSON.stringify({
          error: {
            code: 'ERROR_HANDLING_FAILED',
            message: 'An error occurred while processing the error',
            userMessage: 'We encountered an unexpected issue. Please try again.',
            suggestion: 'Please try again. If the problem persists, contact support.',
            recoverable: true,
            retryable: true,
            contactSupport: true,
            correlationId,
            timestamp: new Date().toISOString(),
            requestId: process.env.AWS_REQUEST_ID
          }
        })
      };
    }
  }

  /**
   * Wrap Lambda handler with comprehensive error handling
   */
  wrapLambdaHandler<TEvent = any, TResult = any>(
    handler: (event: TEvent, context: any) => Promise<APIGatewayProxyResult>,
    serviceName: string,
    config?: Partial<ErrorHandlingConfig>
  ): (event: TEvent, context: any) => Promise<APIGatewayProxyResult> {
    return async (event: TEvent, context: any): Promise<APIGatewayProxyResult> => {
      const correlationId = this.generateCorrelationId();
      const errorContext: ErrorContext = {
        operation: serviceName,
        requestId: correlationId,
        timestamp: new Date().toISOString()
      };

      try {
        // Execute handler with error handling
        return await this.executeWithErrorHandling(
          () => handler(event, context),
          serviceName,
          errorContext,
          config
        );
      } catch (error) {
        // Convert to API response
        return this.handleApiError(error, errorContext, config);
      }
    };
  }

  /**
   * Log error with correlation ID and context
   */
  private logError(error: any, context?: ErrorContext, correlationId?: string): void {
    const errorInfo = {
      correlationId: correlationId || this.generateCorrelationId(),
      context,
      errorType: error?.constructor?.name || 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    if (error instanceof AppError) {
      this.logger.warn('Application error occurred', errorInfo);
    } else {
      this.logger.error('Unexpected error occurred', error as Error, errorInfo);
    }
  }

  /**
   * Generate correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get HTTP status code for error code
   */
  private getHttpStatusCode(errorCode: string): number {
    const statusCodeMap: Record<string, number> = {
      'UNAUTHORIZED': 401,
      'FORBIDDEN': 403,
      'NOT_FOUND': 404,
      'VALIDATION_ERROR': 400,
      'INVALID_INPUT': 400,
      'MISSING_REQUIRED_FIELD': 400,
      'INVALID_FORMAT': 400,
      'FILE_TOO_LARGE': 400,
      'INVALID_FILE_TYPE': 400,
      'CONFLICT': 409,
      'RATE_LIMIT_EXCEEDED': 429,
      'QUOTA_EXCEEDED': 429,
      'INTERNAL_ERROR': 500,
      'DATABASE_ERROR': 500,
      'EXTERNAL_SERVICE_ERROR': 503,
      'SERVICE_UNAVAILABLE': 503,
      'CIRCUIT_BREAKER_OPEN': 503,
      'TIMEOUT_ERROR': 504,
      'NETWORK_ERROR': 502
    };

    return statusCodeMap[errorCode] || 500;
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: Record<string, boolean>;
    circuitBreakers: Record<string, any>;
    timestamp: string;
  }> {
    const circuitBreakerMetrics = circuitBreakerManager.getAllMetrics();
    const serviceHealth = await gracefulDegradationService.performHealthCheck();
    
    const unhealthyServices = Object.values(serviceHealth).filter(healthy => !healthy).length;
    const totalServices = Object.keys(serviceHealth).length;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyServices === 0) {
      status = 'healthy';
    } else if (unhealthyServices < totalServices / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      services: serviceHealth,
      circuitBreakers: circuitBreakerMetrics,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset all error handling components
   */
  resetAll(): void {
    circuitBreakerManager.resetAll();
    gracefulDegradationService.clearCache();
  }
}

// Global centralized error handler instance
export const centralizedErrorHandler = new CentralizedErrorHandler();