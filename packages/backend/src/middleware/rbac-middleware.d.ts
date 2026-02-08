/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks based on user roles
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { JWTPayload } from '../services/auth/jwt-service';
export type UserRole = 'admin' | 'developer' | 'viewer';
export interface Permission {
    resource: string;
    action: 'create' | 'read' | 'update' | 'delete' | 'execute';
}
/**
 * Check if a role has permission for a specific action on a resource
 */
export declare function hasPermission(role: UserRole, resource: string, action: Permission['action']): boolean;
/**
 * Check if user has permission and return error response if not
 */
export declare function checkPermission(user: JWTPayload, resource: string, action: Permission['action']): APIGatewayProxyResult | null;
/**
 * Check if user owns a resource (for resource-level access control)
 */
export declare function checkOwnership(user: JWTPayload, resourceUserId: string, resourceOrganizationId?: string): APIGatewayProxyResult | null;
/**
 * Check if user belongs to the same organization as the resource
 */
export declare function checkOrganizationAccess(user: JWTPayload, resourceOrganizationId: string): APIGatewayProxyResult | null;
/**
 * Middleware wrapper for Lambda functions with RBAC
 */
export declare function withRBAC(resource: string, action: Permission['action'], handler: (event: APIGatewayProxyEvent, user: JWTPayload) => Promise<APIGatewayProxyResult>): (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
/**
 * Get all permissions for a role
 */
export declare function getRolePermissions(role: UserRole): Permission[];
/**
 * Check if a role can perform any action on a resource
 */
export declare function canAccessResource(role: UserRole, resource: string): boolean;
