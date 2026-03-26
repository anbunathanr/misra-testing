/**
 * Application Error Classes
 * Custom error types with HTTP status codes and error codes
 */

export enum ErrorCode {
  // Authentication & Authorization (401, 403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  MISSING_AUTH_HEADER = 'MISSING_AUTH_HEADER',

  // Validation Errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Resource Errors (404, 409)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',

  // Server Errors (500, 503)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Business Logic Errors (400, 422)
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
}

/**
 * Base Application Error
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: ErrorCode = ErrorCode.INTERNAL_ERROR,
    isOperational: boolean = true,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.metadata = metadata;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication Error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', code: ErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

/**
 * Authorization Error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access forbidden', code: ErrorCode = ErrorCode.FORBIDDEN) {
    super(message, 403, code);
  }
}

/**
 * Validation Error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, ErrorCode.VALIDATION_ERROR, true, metadata);
  }
}

/**
 * Not Found Error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, 404, ErrorCode.NOT_FOUND);
  }
}

/**
 * Conflict Error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, ErrorCode.CONFLICT);
  }
}

/**
 * Rate Limit Error (429)
 */
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message, 429, ErrorCode.RATE_LIMIT_EXCEEDED, true, { retryAfter });
  }
}

/**
 * Internal Server Error (500)
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', originalError?: Error) {
    super(
      message,
      500,
      ErrorCode.INTERNAL_ERROR,
      false,
      originalError ? { originalError: originalError.message } : undefined
    );
  }
}

/**
 * Database Error (500)
 */
export class DatabaseError extends AppError {
  constructor(message: string, operation?: string) {
    super(message, 500, ErrorCode.DATABASE_ERROR, true, { operation });
  }
}

/**
 * External Service Error (503)
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(`${service}: ${message}`, 503, ErrorCode.EXTERNAL_SERVICE_ERROR, true, { service });
  }
}

/**
 * Business Rule Violation (422)
 */
export class BusinessRuleError extends AppError {
  constructor(message: string, rule?: string) {
    super(message, 422, ErrorCode.BUSINESS_RULE_VIOLATION, true, { rule });
  }
}
