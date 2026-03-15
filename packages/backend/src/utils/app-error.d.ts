/**
 * Application Error Classes
 * Custom error types with HTTP status codes and error codes
 */
export declare enum ErrorCode {
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    INVALID_TOKEN = "INVALID_TOKEN",
    TOKEN_EXPIRED = "TOKEN_EXPIRED",
    MISSING_AUTH_HEADER = "MISSING_AUTH_HEADER",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    INVALID_INPUT = "INVALID_INPUT",
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD",
    INVALID_FORMAT = "INVALID_FORMAT",
    NOT_FOUND = "NOT_FOUND",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    ALREADY_EXISTS = "ALREADY_EXISTS",
    CONFLICT = "CONFLICT",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    DATABASE_ERROR = "DATABASE_ERROR",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE",
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION",
    INVALID_STATE = "INVALID_STATE",
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
}
/**
 * Base Application Error
 * All custom errors should extend this class
 */
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: ErrorCode;
    readonly isOperational: boolean;
    readonly metadata?: Record<string, any>;
    constructor(message: string, statusCode?: number, code?: ErrorCode, isOperational?: boolean, metadata?: Record<string, any>);
}
/**
 * Authentication Error (401)
 */
export declare class AuthenticationError extends AppError {
    constructor(message?: string, code?: ErrorCode);
}
/**
 * Authorization Error (403)
 */
export declare class AuthorizationError extends AppError {
    constructor(message?: string, code?: ErrorCode);
}
/**
 * Validation Error (400)
 */
export declare class ValidationError extends AppError {
    constructor(message: string, metadata?: Record<string, any>);
}
/**
 * Not Found Error (404)
 */
export declare class NotFoundError extends AppError {
    constructor(resource: string, identifier?: string);
}
/**
 * Conflict Error (409)
 */
export declare class ConflictError extends AppError {
    constructor(message: string);
}
/**
 * Rate Limit Error (429)
 */
export declare class RateLimitError extends AppError {
    constructor(message?: string, retryAfter?: number);
}
/**
 * Internal Server Error (500)
 */
export declare class InternalError extends AppError {
    constructor(message?: string, originalError?: Error);
}
/**
 * Database Error (500)
 */
export declare class DatabaseError extends AppError {
    constructor(message: string, operation?: string);
}
/**
 * External Service Error (503)
 */
export declare class ExternalServiceError extends AppError {
    constructor(service: string, message: string);
}
/**
 * Business Rule Violation (422)
 */
export declare class BusinessRuleError extends AppError {
    constructor(message: string, rule?: string);
}
