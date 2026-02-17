/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user information to the event
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTService, JWTPayload } from '../services/auth/jwt-service';

const jwtService = new JWTService();

/**
 * Extended event type with user information
 */
export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user: JWTPayload;
}

/**
 * Authenticate a Lambda function handler
 * Verifies JWT token and attaches user to event
 */
export function withAuth(
  handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>
) {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      // Extract token from Authorization header
      const authHeader = event.headers?.Authorization || event.headers?.authorization;
      const token = jwtService.extractTokenFromHeader(authHeader);

      if (!token) {
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: {
              code: 'MISSING_TOKEN',
              message: 'Authorization token is required',
              timestamp: new Date().toISOString(),
            },
          }),
        };
      }

      // Verify token
      let user: JWTPayload;
      try {
        user = await jwtService.verifyAccessToken(token);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
        
        return {
          statusCode: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: {
              code: 'INVALID_TOKEN',
              message: errorMessage,
              timestamp: new Date().toISOString(),
            },
          }),
        };
      }

      // Attach user to event
      const authenticatedEvent = event as AuthenticatedEvent;
      authenticatedEvent.user = user;

      // Call the actual handler
      return handler(authenticatedEvent);
    } catch (error) {
      console.error('Authentication error:', error);
      
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'AUTHENTICATION_ERROR',
            message: 'An error occurred during authentication',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }
  };
}

/**
 * Authenticate and authorize a Lambda function handler
 * Combines authentication with RBAC permission checking
 */
export function withAuthAndPermission(
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete' | 'execute',
  handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>
) {
  return withAuth(async (event: AuthenticatedEvent) => {
    const { hasPermission } = await import('./rbac-middleware');
    
    // Check if user has permission
    if (!hasPermission(event.user.role, resource, action)) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Role '${event.user.role}' does not have permission to ${action} ${resource}`,
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    // Call the actual handler
    return handler(event);
  });
}

/**
 * Extract user from authenticated event
 * Helper function for handlers
 */
export function getUser(event: APIGatewayProxyEvent): JWTPayload | null {
  return (event as any).user || null;
}
