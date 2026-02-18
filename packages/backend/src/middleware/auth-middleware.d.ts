/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user information to the event
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTPayload } from '../services/auth/jwt-service';
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
export declare function withAuth(handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
/**
 * Authenticate and authorize a Lambda function handler
 * Combines authentication with RBAC permission checking
 */
export declare function withAuthAndPermission(resource: string, action: 'create' | 'read' | 'update' | 'delete' | 'execute', handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
/**
 * Extract user from authenticated event
 * Helper function for handlers
 */
export declare function getUser(event: APIGatewayProxyEvent): JWTPayload | null;
