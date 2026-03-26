/**
 * Centralized Error Handler
 * Handles errors consistently across all Lambda functions
 */
import { APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from './logger';
import { ErrorCode } from './app-error';
export interface ErrorResponse {
    error: string;
    code: string;
    requestId?: string;
    metadata?: Record<string, any>;
}
/**
 * Handle errors and return appropriate API Gateway response
 */
export declare function handleError(error: any, logger: Logger): APIGatewayProxyResult;
/**
 * Wrap async Lambda handler with error handling
 */
export declare function withErrorHandler<T = any>(handler: (...args: any[]) => Promise<APIGatewayProxyResult>, logger: Logger): (...args: any[]) => Promise<APIGatewayProxyResult>;
/**
 * Assert condition and throw error if false
 */
export declare function assert(condition: boolean, message: string, statusCode?: number, code?: ErrorCode): asserts condition;
/**
 * Assert value is not null/undefined
 */
export declare function assertExists<T>(value: T | null | undefined, message: string): asserts value is T;
