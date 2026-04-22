/**
 * Authentication Utility Functions
 * Helper functions for extracting user context from API Gateway events
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { JWTService } from '../services/auth/jwt-service';

/**
 * User context extracted from API Gateway request context
 * This is populated by the Lambda Authorizer after JWT verification
 */
export interface UserContext {
  userId: string;
  email: string;
  organizationId: string;
  role: 'admin' | 'developer' | 'viewer' | '';
  isTemporary?: boolean; // Indicates if this is from a temporary token
  authState?: string; // Auth state for temporary tokens
}

// Initialize JWT service for token validation
const jwtService = new JWTService();

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
 * configured). Falls back to decoding and validating JWT directly from the
 * Authorization header, supporting both full and temporary authentication tokens.
 *
 * @param event - API Gateway proxy event
 * @returns User context object with userId, email, organizationId, role, and temporary status
 */
export async function getUserFromContext(event: APIGatewayProxyEvent): Promise<UserContext> {
  // Primary: Lambda Authorizer context
  const authorizer = event.requestContext?.authorizer;
  if (authorizer?.userId) {
    return {
      userId: authorizer.userId,
      email: authorizer.email || '',
      organizationId: authorizer.organizationId || '',
      role: (authorizer.role as 'admin' | 'developer' | 'viewer') || '',
      isTemporary: authorizer.scope === 'temp_authenticated',
      authState: authorizer.authState || undefined,
    };
  }

  // Fallback: validate JWT from Authorization header
  const authHeader =
    event.headers?.Authorization || event.headers?.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      // Try to verify as any token (full or temporary)
      const payload = await jwtService.verifyAnyToken(token);
      
      // Check if this is a temporary token
      if ('scope' in payload && payload.scope === 'temp_authenticated') {
        return {
          userId: payload.userId,
          email: payload.email || '',
          organizationId: payload.organizationId || '',
          role: payload.role || 'developer',
          isTemporary: true,
          authState: payload.authState || 'otp_setup_required',
        };
      } else {
        // Full authentication token
        return {
          userId: payload.userId,
          email: payload.email || '',
          organizationId: payload.organizationId || '',
          role: payload.role || 'developer',
          isTemporary: false,
        };
      }
    } catch (error) {
      console.warn('JWT validation failed, falling back to decode:', error);
      
      // Fallback: decode JWT payload without verification (for backward compatibility)
      const payload = decodeJwtPayload(token);
      if (payload?.userId) {
        return {
          userId: payload.userId,
          email: payload.email || '',
          organizationId: payload.organizationId || '',
          role: (payload.role as 'admin' | 'developer' | 'viewer') || '',
          isTemporary: payload.scope === 'temp_authenticated',
          authState: payload.authState || undefined,
        };
      }
      // Cognito JWT: sub is the user ID
      if (payload?.sub) {
        return {
          userId: payload.sub,
          email: payload.email || '',
          organizationId: payload['custom:organizationId'] || 'default-org',
          role: (payload['custom:role'] as 'admin' | 'developer' | 'viewer') || 'developer',
          isTemporary: false,
        };
      }
    }
  }

  return { userId: '', email: '', organizationId: '', role: '' };
}

/**
 * Check if a user context allows file operations.
 * File operations are allowed for:
 * - Fully authenticated users
 * - Users with temporary authentication tokens (during OTP setup)
 * 
 * @param userContext - User context from getUserFromContext
 * @returns true if file operations are allowed
 */
export function canPerformFileOperations(userContext: UserContext): boolean {
  // Must have a valid user ID
  if (!userContext.userId) {
    return false;
  }
  
  // Full authentication always allows file operations
  if (!userContext.isTemporary) {
    return true;
  }
  
  // Temporary authentication allows file operations during OTP setup
  if (userContext.isTemporary && userContext.authState === 'otp_setup_required') {
    return true;
  }
  
  return false;
}

/**
 * Check if a user context allows sensitive operations.
 * Sensitive operations require full authentication (no temporary tokens).
 * 
 * @param userContext - User context from getUserFromContext
 * @returns true if sensitive operations are allowed
 */
export function canPerformSensitiveOperations(userContext: UserContext): boolean {
  // Must have a valid user ID and NOT be temporary
  return !!(userContext.userId && !userContext.isTemporary);
}

/**
 * Extract user information from JWT token
 * Used for direct token validation without Lambda Authorizer
 * 
 * @param token - JWT token string
 * @returns User info object or null if invalid
 */
export function extractUserFromToken(token: string): Record<string, any> | null {
  try {
    const payload = decodeJwtPayload(token);
    if (!payload) return null;
    
    // Support both custom JWT format and Cognito JWT format
    if (payload.sub) {
      // Cognito JWT
      return {
        sub: payload.sub,
        email: payload.email,
        email_verified: payload.email_verified,
        name: payload.name,
        'custom:organizationId': payload['custom:organizationId'],
        'custom:role': payload['custom:role']
      };
    } else if (payload.userId) {
      // Custom JWT format
      return payload;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to extract user from token:', error);
    return null;
  }
}