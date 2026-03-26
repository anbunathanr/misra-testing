/**
 * Centralized Error Handler
 * Handles errors consistently across all Lambda functions
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from './logger';
import { AppError, ErrorCode } from './app-error';

export interface ErrorResponse {
  error: string;
  code: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * Handle errors and return appropriate API Gateway response
 */
export function handleError(error: any, logger: Logger): APIGatewayProxyResult {
  // Log the error
  if (error instanceof AppError) {
    // Operational errors - log as warning
    logger.warn('Application error occurred', {
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
      metadata: error.metadata,
    });
  } else {
    // Unexpected errors - log as error with full stack
    logger.error('Unexpected error occurred', error, {
      type: error.constructor?.name,
    });
  }

  // Build error response
  const errorResponse = buildErrorResponse(error);

  return {
    statusCode: errorResponse.statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(errorResponse.body),
  };
}

/**
 * Build error response object
 */
function buildErrorResponse(error: any): {
  statusCode: number;
  body: ErrorResponse;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: {
        error: sanitizeErrorMessage(error.message),
        code: error.code,
        requestId: process.env.AWS_REQUEST_ID,
        metadata: error.metadata,
      },
    };
  }

  // Handle AWS SDK errors
  if (error.name === 'ResourceNotFoundException') {
    return {
      statusCode: 404,
      body: {
        error: 'Resource not found',
        code: ErrorCode.NOT_FOUND,
        requestId: process.env.AWS_REQUEST_ID,
      },
    };
  }

  if (error.name === 'ConditionalCheckFailedException') {
    return {
      statusCode: 409,
      body: {
        error: 'Resource already exists or condition not met',
        code: ErrorCode.CONFLICT,
        requestId: process.env.AWS_REQUEST_ID,
      },
    };
  }

  if (error.name === 'ValidationException') {
    return {
      statusCode: 400,
      body: {
        error: 'Invalid request parameters',
        code: ErrorCode.VALIDATION_ERROR,
        requestId: process.env.AWS_REQUEST_ID,
      },
    };
  }

  // Default to 500 for unknown errors
  return {
    statusCode: 500,
    body: {
      error: 'Internal server error',
      code: ErrorCode.INTERNAL_ERROR,
      requestId: process.env.AWS_REQUEST_ID,
    },
  };
}

/**
 * Sanitize error messages to prevent leaking sensitive information
 */
function sanitizeErrorMessage(message: string): string {
  // Remove potential sensitive patterns
  const sanitized = message
    .replace(/password[=:]\s*\S+/gi, 'password=***')
    .replace(/token[=:]\s*\S+/gi, 'token=***')
    .replace(/key[=:]\s*\S+/gi, 'key=***')
    .replace(/secret[=:]\s*\S+/gi, 'secret=***');

  return sanitized;
}

/**
 * Wrap async Lambda handler with error handling
 */
export function withErrorHandler<T = any>(
  handler: (...args: any[]) => Promise<APIGatewayProxyResult>,
  logger: Logger
): (...args: any[]) => Promise<APIGatewayProxyResult> {
  return async (...args: any[]): Promise<APIGatewayProxyResult> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleError(error, logger);
    }
  };
}

/**
 * Assert condition and throw error if false
 */
export function assert(
  condition: boolean,
  message: string,
  statusCode: number = 400,
  code: ErrorCode = ErrorCode.VALIDATION_ERROR
): asserts condition {
  if (!condition) {
    throw new AppError(message, statusCode, code);
  }
}

/**
 * Assert value is not null/undefined
 */
export function assertExists<T>(
  value: T | null | undefined,
  message: string
): asserts value is T {
  if (value === null || value === undefined) {
    throw new AppError(message, 404, ErrorCode.NOT_FOUND);
  }
}
