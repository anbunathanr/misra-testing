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
 * Decode a JWT payload without verifying the signature.
 * Used as a fallback when no Lambda authorizer is present.
 */
function decodeJwtPayload(token: string): Record<string, string> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return null;
  }
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
export function getUserFromContext(event: APIGatewayProxyEvent): UserContext {
  // Primary: Lambda Authorizer context
  const authorizer = event.requestContext?.authorizer;
  if (authorizer?.userId) {
    return {
      userId: authorizer.userId,
      email: authorizer.email || '',
      organizationId: authorizer.organizationId || '',
      role: (authorizer.role as 'admin' | 'developer' | 'viewer') || '',
    };
  }

  // Fallback: decode JWT from Authorization header
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const payload = decodeJwtPayload(token);
    if (payload?.userId) {
      return {
        userId: payload.userId,
        email: payload.email || '',
        organizationId: payload.organizationId || '',
        role: (payload.role as 'admin' | 'developer' | 'viewer') || '',
      };
    }
    // Cognito JWT: sub is the user ID
    if (payload?.sub) {
      return {
        userId: payload.sub,
        email: payload.email || '',
        organizationId: payload['custom:organizationId'] || 'default-org',
        role: (payload['custom:role'] as 'admin' | 'developer' | 'viewer') || 'developer',
      };
    }
  }

  return { userId: '', email: '', organizationId: '', role: '' };
}
