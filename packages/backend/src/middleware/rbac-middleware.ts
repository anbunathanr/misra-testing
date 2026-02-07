/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks based on user roles
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda'
import { JWTPayload } from '../services/auth/jwt-service'

export type UserRole = 'admin' | 'developer' | 'viewer'

export interface Permission {
  resource: string
  action: 'create' | 'read' | 'update' | 'delete' | 'execute'
}

/**
 * Role permission matrix
 * Defines what each role can do
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    // Admins can do everything
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'projects', action: 'create' },
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'update' },
    { resource: 'projects', action: 'delete' },
    { resource: 'files', action: 'create' },
    { resource: 'files', action: 'read' },
    { resource: 'files', action: 'update' },
    { resource: 'files', action: 'delete' },
    { resource: 'analyses', action: 'create' },
    { resource: 'analyses', action: 'read' },
    { resource: 'analyses', action: 'delete' },
    { resource: 'tests', action: 'create' },
    { resource: 'tests', action: 'read' },
    { resource: 'tests', action: 'execute' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
  ],
  developer: [
    // Developers can manage their own resources
    { resource: 'users', action: 'read' },
    { resource: 'projects', action: 'create' },
    { resource: 'projects', action: 'read' },
    { resource: 'projects', action: 'update' },
    { resource: 'files', action: 'create' },
    { resource: 'files', action: 'read' },
    { resource: 'files', action: 'update' },
    { resource: 'files', action: 'delete' },
    { resource: 'analyses', action: 'create' },
    { resource: 'analyses', action: 'read' },
    { resource: 'tests', action: 'create' },
    { resource: 'tests', action: 'read' },
    { resource: 'tests', action: 'execute' },
    { resource: 'settings', action: 'read' },
  ],
  viewer: [
    // Viewers can only read
    { resource: 'users', action: 'read' },
    { resource: 'projects', action: 'read' },
    { resource: 'files', action: 'read' },
    { resource: 'analyses', action: 'read' },
    { resource: 'tests', action: 'read' },
    { resource: 'settings', action: 'read' },
  ],
}

/**
 * Check if a role has permission for a specific action on a resource
 */
export function hasPermission(
  role: UserRole,
  resource: string,
  action: Permission['action']
): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.some(
    (p) => p.resource === resource && p.action === action
  )
}

/**
 * Check if user has permission and return error response if not
 */
export function checkPermission(
  user: JWTPayload,
  resource: string,
  action: Permission['action']
): APIGatewayProxyResult | null {
  if (!hasPermission(user.role, resource, action)) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Role '${user.role}' does not have permission to ${action} ${resource}`,
          timestamp: new Date().toISOString(),
        },
      }),
    }
  }
  return null
}

/**
 * Check if user owns a resource (for resource-level access control)
 */
export function checkOwnership(
  user: JWTPayload,
  resourceUserId: string,
  resourceOrganizationId?: string
): APIGatewayProxyResult | null {
  // Admins can access any resource in their organization
  if (user.role === 'admin') {
    if (resourceOrganizationId && resourceOrganizationId !== user.organizationId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'CROSS_ORGANIZATION_ACCESS_DENIED',
            message: 'Cannot access resources from other organizations',
            timestamp: new Date().toISOString(),
          },
        }),
      }
    }
    return null
  }

  // Non-admins can only access their own resources
  if (resourceUserId !== user.userId) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'RESOURCE_ACCESS_DENIED',
          message: 'You can only access your own resources',
          timestamp: new Date().toISOString(),
        },
      }),
    }
  }

  return null
}

/**
 * Check if user belongs to the same organization as the resource
 */
export function checkOrganizationAccess(
  user: JWTPayload,
  resourceOrganizationId: string
): APIGatewayProxyResult | null {
  if (user.organizationId !== resourceOrganizationId) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: {
          code: 'CROSS_ORGANIZATION_ACCESS_DENIED',
          message: 'Cannot access resources from other organizations',
          timestamp: new Date().toISOString(),
        },
      }),
    }
  }
  return null
}

/**
 * Middleware wrapper for Lambda functions with RBAC
 */
export function withRBAC(
  resource: string,
  action: Permission['action'],
  handler: (
    event: APIGatewayProxyEvent,
    user: JWTPayload
  ) => Promise<APIGatewayProxyResult>
) {
  return async (
    event: APIGatewayProxyEvent
  ): Promise<APIGatewayProxyResult> => {
    // User should be attached to event by auth middleware
    const user = (event as any).user as JWTPayload

    if (!user) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        }),
      }
    }

    // Check permission
    const permissionError = checkPermission(user, resource, action)
    if (permissionError) {
      return permissionError
    }

    // Call the actual handler
    return handler(event, user)
  }
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role]
}

/**
 * Check if a role can perform any action on a resource
 */
export function canAccessResource(role: UserRole, resource: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.some((p) => p.resource === resource)
}
