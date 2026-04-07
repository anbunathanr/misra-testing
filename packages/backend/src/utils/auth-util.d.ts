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
}
/**
 * Extract authenticated user information from API Gateway request context.
 *
 * First tries the Lambda Authorizer context (populated when an authorizer is
 * configured). Falls back to decoding the Bearer JWT directly from the
 * Authorization header so the function works even without an authorizer.
 *
 * @param event - API Gateway proxy event
 * @returns User context object with userId, email, organizationId, and role
 */
export declare function getUserFromContext(event: APIGatewayProxyEvent): UserContext;
