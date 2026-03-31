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
 * Extract authenticated user information from API Gateway request context
 * 
 * The Lambda Authorizer verifies JWT tokens and populates the request context
 * with user information. This helper function extracts that information for
 * use in backend Lambda functions.
 * 
 * @param event - API Gateway proxy event
 * @returns User context object with userId, email, organizationId, and role
 * 
 * @example
 * ```typescript
 * export const handler = async (event: APIGatewayProxyEvent) => {
 *   const user = getUserFromContext(event);
 *   console.log('User ID:', user.userId);
 *   // Business logic using user context
 * };
 * ```
 */
export function getUserFromContext(event: APIGatewayProxyEvent): UserContext {
  // Extract user fields from request context authorizer
  // API Gateway Lambda Authorizer populates these fields after JWT verification
  const authorizer = event.requestContext?.authorizer;

  return {
    userId: authorizer?.userId || '',
    email: authorizer?.email || '',
    organizationId: authorizer?.organizationId || '',
    role: (authorizer?.role as 'admin' | 'developer' | 'viewer') || '',
  };
}
