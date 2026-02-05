import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTService, JWTPayload } from '../services/auth/jwt-service';

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user: JWTPayload;
}

export type AuthenticatedHandler = (
  event: AuthenticatedEvent
) => Promise<APIGatewayProxyResult>;

export class AuthMiddleware {
  private jwtService: JWTService;

  constructor() {
    this.jwtService = new JWTService();
  }

  /**
   * Middleware to authenticate JWT tokens from API Gateway requests
   */
  authenticate(handler: AuthenticatedHandler) {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
      try {
        // Extract token from Authorization header
        const authHeader = event.headers.Authorization || event.headers.authorization;
        const token = this.jwtService.extractTokenFromHeader(authHeader);

        if (!token) {
          return this.unauthorizedResponse('Missing or invalid authorization header');
        }

        // Verify the token
        const user = await this.jwtService.verifyAccessToken(token);

        // Add user to event and call the handler
        const authenticatedEvent: AuthenticatedEvent = {
          ...event,
          user,
        };

        return await handler(authenticatedEvent);
      } catch (error) {
        console.error('Authentication error:', error);
        
        if (error instanceof Error) {
          if (error.message === 'Token expired') {
            return this.unauthorizedResponse('Token expired', 'TOKEN_EXPIRED');
          } else if (error.message === 'Invalid token') {
            return this.unauthorizedResponse('Invalid token', 'INVALID_TOKEN');
          }
        }
        
        return this.unauthorizedResponse('Authentication failed');
      }
    };
  }

  /**
   * Middleware to check user roles and permissions
   */
  authorize(requiredRoles: string[] | string) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    return (handler: AuthenticatedHandler) => {
      return this.authenticate(async (event: AuthenticatedEvent) => {
        // Check if user has required role
        if (!roles.includes(event.user.role)) {
          return this.forbiddenResponse(
            `Access denied. Required roles: ${roles.join(', ')}`
          );
        }

        return await handler(event);
      });
    };
  }

  /**
   * Middleware to check organization access
   */
  authorizeOrganization(handler: AuthenticatedHandler) {
    return this.authenticate(async (event: AuthenticatedEvent) => {
      const pathParameters = event.pathParameters || {};
      const organizationId = pathParameters.organizationId;

      // If organizationId is in path, verify user belongs to that organization
      if (organizationId && organizationId !== event.user.organizationId) {
        return this.forbiddenResponse('Access denied to this organization');
      }

      return await handler(event);
    });
  }

  private unauthorizedResponse(message: string, code?: string): APIGatewayProxyResult {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify({
        error: {
          code: code || 'UNAUTHORIZED',
          message,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }

  private forbiddenResponse(message: string): APIGatewayProxyResult {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify({
        error: {
          code: 'FORBIDDEN',
          message,
          timestamp: new Date().toISOString(),
        },
      }),
    };
  }
}

// Export singleton instance
export const authMiddleware = new AuthMiddleware();