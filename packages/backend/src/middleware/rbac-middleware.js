"use strict";
/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces permission checks based on user roles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasPermission = hasPermission;
exports.checkPermission = checkPermission;
exports.checkOwnership = checkOwnership;
exports.checkOrganizationAccess = checkOrganizationAccess;
exports.withRBAC = withRBAC;
exports.getRolePermissions = getRolePermissions;
exports.canAccessResource = canAccessResource;
/**
 * Role permission matrix
 * Defines what each role can do
 */
const ROLE_PERMISSIONS = {
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
};
/**
 * Check if a role has permission for a specific action on a resource
 */
function hasPermission(role, resource, action) {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.some((p) => p.resource === resource && p.action === action);
}
/**
 * Check if user has permission and return error response if not
 */
function checkPermission(user, resource, action) {
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
        };
    }
    return null;
}
/**
 * Check if user owns a resource (for resource-level access control)
 */
function checkOwnership(user, resourceUserId, resourceOrganizationId) {
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
            };
        }
        return null;
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
        };
    }
    return null;
}
/**
 * Check if user belongs to the same organization as the resource
 */
function checkOrganizationAccess(user, resourceOrganizationId) {
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
        };
    }
    return null;
}
/**
 * Middleware wrapper for Lambda functions with RBAC
 */
function withRBAC(resource, action, handler) {
    return async (event) => {
        // User should be attached to event by auth middleware
        const user = event.user;
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
            };
        }
        // Check permission
        const permissionError = checkPermission(user, resource, action);
        if (permissionError) {
            return permissionError;
        }
        // Call the actual handler
        return handler(event, user);
    };
}
/**
 * Get all permissions for a role
 */
function getRolePermissions(role) {
    return ROLE_PERMISSIONS[role];
}
/**
 * Check if a role can perform any action on a resource
 */
function canAccessResource(role, resource) {
    const permissions = ROLE_PERMISSIONS[role];
    return permissions.some((p) => p.resource === resource);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmJhYy1taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmJhYy1taWRkbGV3YXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7O0FBdUVILHNDQVNDO0FBS0QsMENBc0JDO0FBS0Qsd0NBNkNDO0FBS0QsMERBcUJDO0FBS0QsNEJBd0NDO0FBS0QsZ0RBRUM7QUFLRCw4Q0FHQztBQXZPRDs7O0dBR0c7QUFDSCxNQUFNLGdCQUFnQixHQUFtQztJQUN2RCxLQUFLLEVBQUU7UUFDTCwyQkFBMkI7UUFDM0IsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDckMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDeEMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDckMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDeEMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDckMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7UUFDeEMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDeEMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7S0FDM0M7SUFDRCxTQUFTLEVBQUU7UUFDVCw0Q0FBNEM7UUFDNUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDckMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDeEMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7UUFDckMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDdkMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUU7UUFDMUMsRUFBRSxRQUFR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b250ZW50IjpbIi8qKlxyXG4gKiBSb2xlLUJhc2VkIEFjY2VzcyBDb250cm9sIChSQkFDKSBNaWRkbGV3YXJlXHJcbiAqIEVuZm9yY2VzIHBlcm1pc3Npb24gY2hlY2tzIGJhc2VkIG9uIHVzZXIgcm9sZXNcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSdcclxuaW1wb3J0IHsgSldUUGF5bG9hZCB9IGZyb20gJy4uL3NlcnZpY2VzL2F1dGgvand0LXNlcnZpY2UnXHJcblxyXG5leHBvcnQgdHlwZSBVc2VyUm9sZSA9ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFBlcm1pc3Npb24ge1xyXG4gIHJlc291cmNlOiBzdHJpbmdcclxuICBhY3Rpb246ICdjcmVhdGUnIHwgJ3JlYWQnIHwgJ3VwZGF0ZScgfCAnZGVsZXRlJyB8ICdleGVjdXRlJ1xyXG59XHJcblxyXG4vKipcclxuICogUm9sZSBwZXJtaXNzaW9uIG1hdHJpeFxyXG4gKiBEZWZpbmVzIHdoYXQgZWFjaCByb2xlIGNhbiBkb1xyXG4gKi9cclxuY29uc3QgUk9MRV9QRVJNSVNTSU9OUzogUmVjb3JkPFVzZXJSb2xlLCBQZXJtaXNzaW9uW10+ID0ge1xyXG4gIGFkbWluOiBbXHJcbiAgICAvLyBBZG1pbnMgY2FuIGRvIGV2ZXJ5dGhpbmdcclxuICAgIHsgcmVzb3VyY2U6ICd1c2VycycsIGFjdGlvbjogJ2NyZWF0ZScgfSxcclxuICAgIHsgcmVzb3VyY2U6ICd1c2VycycsIGFjdGlvbjogJ3JlYWQnIH0sXHJcbiAgICB7IHJlc291cmNlOiAndXNlcnMnLCBhY3Rpb246ICd1cGRhdGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAndXNlcnMnLCBhY3Rpb246ICdkZWxldGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAncHJvamVjdHMnLCBhY3Rpb246ICdjcmVhdGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAncHJvamVjdHMnLCBhY3Rpb246ICdyZWFkJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3Byb2plY3RzJywgYWN0aW9uOiAndXBkYXRlJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3Byb2plY3RzJywgYWN0aW9uOiAnZGVsZXRlJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ2ZpbGVzJywgYWN0aW9uOiAnY3JlYXRlJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ2ZpbGVzJywgYWN0aW9uOiAncmVhZCcgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdmaWxlcycsIGFjdGlvbjogJ3VwZGF0ZScgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdmaWxlcycsIGFjdGlvbjogJ2RlbGV0ZScgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdhbmFseXNlcycsIGFjdGlvbjogJ2NyZWF0ZScgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdhbmFseXNlcycsIGFjdGlvbjogJ3JlYWQnIH0sXHJcbiAgICB7IHJlc291cmNlOiAnYW5hbHlzZXMnLCBhY3Rpb246ICdkZWxldGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAndGVzdHMnLCBhY3Rpb246ICdjcmVhdGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAndGVzdHMnLCBhY3Rpb246ICdyZWFkJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3Rlc3RzJywgYWN0aW9uOiAnZXhlY3V0ZScgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdzZXR0aW5ncycsIGFjdGlvbjogJ3JlYWQnIH0sXHJcbiAgICB7IHJlc291cmNlOiAnc2V0dGluZ3MnLCBhY3Rpb246ICd1cGRhdGUnIH0sXHJcbiAgXSxcclxuICBkZXZlbG9wZXI6IFtcclxuICAgIC8vIERldmVsb3BlcnMgY2FuIG1hbmFnZSB0aGVpciBvd24gcmVzb3VyY2VzXHJcbiAgICB7IHJlc291cmNlOiAndXNlcnMnLCBhY3Rpb246ICdyZWFkJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3Byb2plY3RzJywgYWN0aW9uOiAnY3JlYXRlJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3Byb2plY3RzJywgYWN0aW9uOiAncmVhZCcgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdwcm9qZWN0cycsIGFjdGlvbjogJ3VwZGF0ZScgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdmaWxlcycsIGFjdGlvbjogJ2NyZWF0ZScgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdmaWxlcycsIGFjdGlvbjogJ3JlYWQnIH0sXHJcbiAgICB7IHJlc291cmNlOiAnZmlsZXMnLCBhY3Rpb246ICd1cGRhdGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAnZmlsZXMnLCBhY3Rpb246ICdkZWxldGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAnYW5hbHlzZXMnLCBhY3Rpb246ICdjcmVhdGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAnYW5hbHlzZXMnLCBhY3Rpb246ICdyZWFkJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3Rlc3RzJywgYWN0aW9uOiAnY3JlYXRlJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3Rlc3RzJywgYWN0aW9uOiAncmVhZCcgfSxcclxuICAgIHsgcmVzb3VyY2U6ICd0ZXN0cycsIGFjdGlvbjogJ2V4ZWN1dGUnIH0sXHJcbiAgICB7IHJlc291cmNlOiAnc2V0dGluZ3MnLCBhY3Rpb246ICdyZWFkJyB9LFxyXG4gIF0sXHJcbiAgdmlld2VyOiBbXHJcbiAgICAvLyBWaWV3ZXJzIGNhbiBvbmx5IHJlYWRcclxuICAgIHsgcmVzb3VyY2U6ICd1c2VycycsIGFjdGlvbjogJ3JlYWQnIH0sXHJcbiAgICB7IHJlc291cmNlOiAncHJvamVjdHMnLCBhY3Rpb246ICdyZWFkJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ2ZpbGVzJywgYWN0aW9uOiAncmVhZCcgfSxcclxuICAgIHsgcmVzb3VyY2U6ICdhbmFseXNlcycsIGFjdGlvbjogJ3JlYWQnIH0sXHJcbiAgICB7IHJlc291cmNlOiAndGVzdHMnLCBhY3Rpb246ICdyZWFkJyB9LFxyXG4gICAgeyByZXNvdXJjZTogJ3NldHRpbmdzJywgYWN0aW9uOiAncmVhZCcgfSxcclxuICBdLFxyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgYSByb2xlIGhhcyBwZXJtaXNzaW9uIGZvciBhIHNwZWNpZmljIGFjdGlvbiBvbiBhIHJlc291cmNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaGFzUGVybWlzc2lvbihcclxuICByb2xlOiBVc2VyUm9sZSxcclxuICByZXNvdXJjZTogc3RyaW5nLFxyXG4gIGFjdGlvbjogUGVybWlzc2lvblsnYWN0aW9uJ11cclxuKTogYm9vbGVhbiB7XHJcbiAgY29uc3QgcGVybWlzc2lvbnMgPSBST0xFX1BFUk1JU1NJT05TW3JvbGVdXHJcbiAgcmV0dXJuIHBlcm1pc3Npb25zLnNvbWUoXHJcbiAgICAocCkgPT4gcC5yZXNvdXJjZSA9PT0gcmVzb3VyY2UgJiYgcC5hY3Rpb24gPT09IGFjdGlvblxyXG4gIClcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIHVzZXIgaGFzIHBlcm1pc3Npb24gYW5kIHJldHVybiBlcnJvciByZXNwb25zZSBpZiBub3RcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjaGVja1Blcm1pc3Npb24oXHJcbiAgdXNlcjogSldUUGF5bG9hZCxcclxuICByZXNvdXJjZTogc3RyaW5nLFxyXG4gIGFjdGlvbjogUGVybWlzc2lvblsnYWN0aW9uJ11cclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHwgbnVsbCB7XHJcbiAgaWYgKCFoYXNQZXJtaXNzaW9uKHVzZXIucm9sZSwgcmVzb3VyY2UsIGFjdGlvbikpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMyxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5TVUZGSUNJRU5UX1BFUk1JU1NJT05TJyxcclxuICAgICAgICAgIG1lc3NhZ2U6IGBSb2xlICcke3VzZXIucm9sZX0nIGRvZXMgbm90IGhhdmUgcGVybWlzc2lvbiB0byAke2FjdGlvbn0gJHtyZXNvdXJjZX1gLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9XHJcbiAgfVxyXG4gIHJldHVybiBudWxsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiB1c2VyIG93bnMgYSByZXNvdXJjZSAoZm9yIHJlc291cmNlLWxldmVsIGFjY2VzcyBjb250cm9sKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNoZWNrT3duZXJzaGlwKFxyXG4gIHVzZXI6IEpXVFBheWxvYWQsXHJcbiAgcmVzb3VyY2VVc2VySWQ6IHN0cmluZyxcclxuICByZXNvdXJjZU9yZ2FuaXphdGlvbklkPzogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB8IG51bGwge1xyXG4gIC8vIEFkbWlucyBjYW4gYWNjZXNzIGFueSByZXNvdXJjZSBpbiB0aGVpciBvcmdhbml6YXRpb25cclxuICBpZiAodXNlci5yb2xlID09PSAnYWRtaW4nKSB7XHJcbiAgICBpZiAocmVzb3VyY2VPcmdhbml6YXRpb25JZCAmJiByZXNvdXJjZU9yZ2FuaXphdGlvbklkICE9PSB1c2VyLm9yZ2FuaXphdGlvbklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAzLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0NST1NTX09SR0FOSVpBVElPTl9BQ0NFU1NfREVOSUVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0Nhbm5vdCBhY2Nlc3MgcmVzb3VyY2VzIGZyb20gb3RoZXIgb3JnYW5pemF0aW9ucycsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG4gIC8vIE5vbi1hZG1pbnMgY2FuIG9ubHkgYWNjZXNzIHRoZWlyIG93biByZXNvdXJjZXNcclxuICBpZiAocmVzb3VyY2VVc2VySWQgIT09IHVzZXIudXNlcklkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogJ1JFU09VUkNFX0FDQ0VTU19ERU5JRUQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1lvdSBjYW4gb25seSBhY2Nlc3MgeW91ciBvd24gcmVzb3VyY2VzJyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIHVzZXIgYmVsb25ncyB0byB0aGUgc2FtZSBvcmdhbml6YXRpb24gYXMgdGhlIHJlc291cmNlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY2hlY2tPcmdhbml6YXRpb25BY2Nlc3MoXHJcbiAgdXNlcjogSldUUGF5bG9hZCxcclxuICByZXNvdXJjZU9yZ2FuaXphdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHwgbnVsbCB7XHJcbiAgaWYgKHVzZXIub3JnYW5pemF0aW9uSWQgIT09IHJlc291cmNlT3JnYW5pemF0aW9uSWQpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMyxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnQ1JPU1NfT1JHQU5JWkFUSU9OX0FDQ0VTU19ERU5JRUQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ0Nhbm5vdCBhY2Nlc3MgcmVzb3VyY2VzIGZyb20gb3RoZXIgb3JnYW5pemF0aW9ucycsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuLyoqXHJcbiAqIE1pZGRsZXdhcmUgd3JhcHBlciBmb3IgTGFtYmRhIGZ1bmN0aW9ucyB3aXRoIFJCQUNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3aXRoUkJBQyhcclxuICByZXNvdXJjZTogc3RyaW5nLFxyXG4gIGFjdGlvbjogUGVybWlzc2lvblsnYWN0aW9uJ10sXHJcbiAgaGFuZGxlcjogKFxyXG4gICAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50LFxyXG4gICAgdXNlcjogSldUUGF5bG9hZFxyXG4gICkgPT4gUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+XHJcbikge1xyXG4gIHJldHVybiBhc3luYyAoXHJcbiAgICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuICApOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gICAgLy8gVXNlciBzaG91bGQgYmUgYXR0YWNoZWQgdG8gZXZlbnQgYnkgYXV0aCBtaWRkbGV3YXJlXHJcbiAgICBjb25zdCB1c2VyID0gKGV2ZW50IGFzIGFueSkudXNlciBhcyBKV1RQYXlsb2FkXHJcblxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ1VOQVVUSE9SSVpFRCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdBdXRoZW50aWNhdGlvbiByZXF1aXJlZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIHBlcm1pc3Npb25cclxuICAgIGNvbnN0IHBlcm1pc3Npb25FcnJvciA9IGNoZWNrUGVybWlzc2lvbih1c2VyLCByZXNvdXJjZSwgYWN0aW9uKVxyXG4gICAgaWYgKHBlcm1pc3Npb25FcnJvcikge1xyXG4gICAgICByZXR1cm4gcGVybWlzc2lvbkVycm9yXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsbCB0aGUgYWN0dWFsIGhhbmRsZXJcclxuICAgIHJldHVybiBoYW5kbGVyKGV2ZW50LCB1c2VyKVxyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBhbGwgcGVybWlzc2lvbnMgZm9yIGEgcm9sZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFJvbGVQZXJtaXNzaW9ucyhyb2xlOiBVc2VyUm9sZSk6IFBlcm1pc3Npb25bXSB7XHJcbiAgcmV0dXJuIFJPTEVfUEVSTUlTU0lPTlNbcm9sZV1cclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgcm9sZSBjYW4gcGVyZm9ybSBhbnkgYWN0aW9uIG9uIGEgcmVzb3VyY2VcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjYW5BY2Nlc3NSZXNvdXJjZShyb2xlOiBVc2VyUm9sZSwgcmVzb3VyY2U6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IHBlcm1pc3Npb25zID0gUk9MRV9QRVJNSVNTSU9OU1tyb2xlXVxyXG4gIHJldHVybiBwZXJtaXNzaW9ucy5zb21lKChwKSA9PiBwLnJlc291cmNlID09PSByZXNvdXJjZSlcclxufVxyXG4iXX0=