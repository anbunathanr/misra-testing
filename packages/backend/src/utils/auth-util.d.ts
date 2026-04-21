/**
 * Authentication Utility Functions
 * Helper functions for extracting user context from API Gateway events
 */
import { APIGatewayProxyEvent } from 'aws-lambda';
/**
 * User context extracted from API Gateway request context
 * This is populated by the Lambda Authorizer after JWT verification
 */
export interface UserContext {
    userId: string;
    email: string;
    organizationId: string;
    role: 'admin' | 'developer' | 'viewer' | '';
    isTemporary?: boolean;
    authState?: string;
}
/**
 * Extract authenticated user information from API Gateway request context.
 *
 * First tries the Lambda Authorizer context (populated when an authorizer is
 * configured). Falls back to decoding and validating JWT directly from the
 * Authorization header, supporting both full and temporary authentication tokens.
 *
 * @param event - API Gateway proxy event
 * @returns User context object with userId, email, organizationId, role, and temporary status
 */
export declare function getUserFromContext(event: APIGatewayProxyEvent): Promise<UserContext>;
/**
 * Check if a user context allows file operations.
 * File operations are allowed for:
 * - Fully authenticated users
 * - Users with temporary authentication tokens (during OTP setup)
 *
 * @param userContext - User context from getUserFromContext
 * @returns true if file operations are allowed
 */
export declare function canPerformFileOperations(userContext: UserContext): boolean;
/**
 * Check if a user context allows sensitive operations.
 * Sensitive operations require full authentication (no temporary tokens).
 *
 * @param userContext - User context from getUserFromContext
 * @returns true if sensitive operations are allowed
 */
export declare function canPerformSensitiveOperations(userContext: UserContext): boolean;
