/**
 * Enhanced Error Handler Utility for Production Lambda Functions
 * Provides comprehensive error handling, retry logic, and structured error responses
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { Logger, createLogger } from './logger';

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly correlationId?: string;
  public readonly metadata?: any;

  constructor(
    message: string,
    type: ErrorType,
    statusCode: number = 500,
    isOperational: boolean = true,
    correlationId?: string,
    metadata?: any
  ) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.correlationId = correlationId;
    this.metadata = metadata;
    this.name = 'AppError';

    Error.captureStackTrace(this, this.constructor);
  }
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: ErrorType[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    ErrorType.EXTERNAL_SERVICE_ERROR,
    ErrorType.DATABASE_ERROR,
    ErrorType.RATE_LIMIT_ERROR,
  ],
};

/**
 * Enhanced error handler with retry logic and structured responses
 */
export class ErrorHandler {
  private logger: Logger;
  private retryConfig: RetryConfig;

  constructor(context: string, retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG) {
    this.logger = createLogger(`error-handler.${context}`);
    this.retryConfig = retryConfig;
  }

  /**
   * Execute a function with retry logic
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    correlationId?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Executing ${operationName} - attempt ${attempt}`, {
          correlationId,
          attempt,
          maxAttempts: this.retryConfig.maxAttempts,
        });

        const result = await operation();
        
        if (attempt > 1) {
          this.logger.info(`${operationName} succeeded after ${attempt} attempts`, {
            correlationId,
            attempt,
          });
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        this.logger.warn(`${operationName} failed - attempt ${attempt}`, {
          correlationId,
          attempt,
          error: lastError.message,
          errorType: (lastError as AppError).type,
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError) || attempt === this.retryConfig.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1),
          this.retryConfig.maxDelay
        );

        this.logger.debug(`Retrying ${operationName} in ${delay}ms`, {
          correlationId,
          delay,
          nextAttempt: attempt + 1,
        });

        await this.sleep(delay);
      }
    }

    this.logger.error(`${operationName} failed after ${this.retryConfig.maxAttempts} attempts`, lastError!, {
      correlationId,
      maxAttempts: this.retryConfig.maxAttempts,
    });

    throw lastError!;
  }

  /**
   * Handle errors and create structured API Gateway responses
   */
  handleError(error: Error, correlationId?: string): APIGatewayProxyResult {
    this.logger.error('Handling error', error, { correlationId });

    if (error instanceof AppError) {
      return this.createErrorResponse(
        error.statusCode,
        error.message,
        error.type,
        correlationId,
        error.metadata
      );
    }

    // Handle known AWS SDK errors
    if (this.isAWSError(error)) {
      return this.handleAWSError(error, correlationId);
    }

    // Handle validation errors
    if (this.isValidationError(error)) {
      return this.createErrorResponse(
        400,
        'Validation failed',
        ErrorType.VALIDATION_ERROR,
        correlationId,
        { validationErrors: error.message }
      );
    }

    // Default to internal server error
    return this.createErrorResponse(
      500,
      'Internal server error',
      ErrorType.INTERNAL_ERROR,
      correlationId,
      { originalError: error.message }
    );
  }

  /**
   * Create a structured error response
   */
  private createErrorResponse(
    statusCode: number,
    message: string,
    type: ErrorType,
    correlationId?: string,
    metadata?: any
  ): APIGatewayProxyResult {
    const errorResponse = {
      error: {
        message,
        type,
        correlationId,
        timestamp: new Date().toISOString(),
        ...(metadata && { metadata }),
      },
    };

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-ID',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        ...(correlationId && { 'X-Correlation-ID': correlationId }),
      },
      body: JSON.stringify(errorResponse),
    };
  }

  /**
   * Handle AWS SDK specific errors
   */
  private handleAWSError(error: any, correlationId?: string): APIGatewayProxyResult {
    const awsErrorCode = error.code || error.name;
    
    switch (awsErrorCode) {
      case 'ValidationException':
      case 'InvalidParameterException':
        return this.createErrorResponse(
          400,
          'Invalid request parameters',
          ErrorType.VALIDATION_ERROR,
          correlationId,
          { awsError: awsErrorCode }
        );
        
      case 'ResourceNotFoundException':
      case 'ItemNotFoundException':
        return this.createErrorResponse(
          404,
          'Resource not found',
          ErrorType.NOT_FOUND_ERROR,
          correlationId,
          { awsError: awsErrorCode }
        );
        
      case 'ConditionalCheckFailedException':
        return this.createErrorResponse(
          409,
          'Resource conflict',
          ErrorType.CONFLICT_ERROR,
          correlationId,
          { awsError: awsErrorCode }
        );
        
      case 'ThrottlingException':
      case 'ProvisionedThroughputExceededException':
        return this.createErrorResponse(
          429,
          'Rate limit exceeded',
          ErrorType.RATE_LIMIT_ERROR,
          correlationId,
          { awsError: awsErrorCode }
        );
        
      case 'AccessDeniedException':
      case 'UnauthorizedException':
        return this.createErrorResponse(
          403,
          'Access denied',
          ErrorType.AUTHORIZATION_ERROR,
          correlationId,
          { awsError: awsErrorCode }
        );
        
      default:
        return this.createErrorResponse(
          500,
          'AWS service error',
          ErrorType.EXTERNAL_SERVICE_ERROR,
          correlationId,
          { awsError: awsErrorCode }
        );
    }
  }

  /**
   * Check if error is retryable based on configuration
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof AppError) {
      return this.retryConfig.retryableErrors.includes(error.type);
    }

    // Check for AWS retryable errors
    if (this.isAWSError(error)) {
      const retryableAWSErrors = [
        'ThrottlingException',
        'ProvisionedThroughputExceededException',
        'ServiceUnavailableException',
        'InternalServerError',
      ];
      return retryableAWSErrors.includes((error as any).code);
    }

    return false;
  }

  /**
   * Check if error is an AWS SDK error
   */
  private isAWSError(error: any): boolean {
    return error.code && (error.statusCode || error.retryable !== undefined);
  }

  /**
   * Check if error is a validation error
   */
  private isValidationError(error: Error): boolean {
    return error.name === 'ValidationError' || error.message.includes('validation');
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a success response with correlation ID
 */
export function createSuccessResponse(
  data: any,
  statusCode: number = 200,
  correlationId?: string
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Correlation-ID',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...(correlationId && { 'X-Correlation-ID': correlationId }),
    },
    body: JSON.stringify({
      data,
      correlationId,
      timestamp: new Date().toISOString(),
    }),
  };
}

/**
 * Validation helper functions
 */
export function validateRequired(value: any, fieldName: string): void {
  if (value === undefined || value === null || value === '') {
    throw new AppError(
      `${fieldName} is required`,
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
}

export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new AppError(
      'Invalid email format',
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
}

export function validateFileSize(size: number, maxSize: number = 10 * 1024 * 1024): void {
  if (size > maxSize) {
    throw new AppError(
      `File size exceeds maximum allowed size of ${maxSize} bytes`,
      ErrorType.VALIDATION_ERROR,
      400
    );
  }
}