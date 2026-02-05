import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTPayload } from '../services/auth/jwt-service';
export interface AuthenticatedEvent extends APIGatewayProxyEvent {
    user: JWTPayload;
}
export type AuthenticatedHandler = (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>;
export declare class AuthMiddleware {
    private jwtService;
    constructor();
    /**
     * Middleware to authenticate JWT tokens from API Gateway requests
     */
    authenticate(handler: AuthenticatedHandler): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
    /**
     * Middleware to check user roles and permissions
     */
    authorize(requiredRoles: string[] | string): (handler: AuthenticatedHandler) => (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
    /**
     * Middleware to check organization access
     */
    authorizeOrganization(handler: AuthenticatedHandler): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
    private unauthorizedResponse;
    private forbiddenResponse;
}
export declare const authMiddleware: AuthMiddleware;
