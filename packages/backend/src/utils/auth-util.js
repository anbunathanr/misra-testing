"use strict";
/**
 * Authentication Utility Functions
 * Helper functions for extracting user context from API Gateway events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFromContext = getUserFromContext;
exports.canPerformFileOperations = canPerformFileOperations;
exports.canPerformSensitiveOperations = canPerformSensitiveOperations;
exports.extractUserFromToken = extractUserFromToken;
const jwt_service_1 = require("../services/auth/jwt-service");
// Initialize JWT service for token validation
const jwtService = new jwt_service_1.JWTService();
/**
 * Decode a JWT payload without verifying the signature.
 * Used as a fallback when no Lambda authorizer is present.
 */
function decodeJwtPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3)
            return null;
        const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
        return JSON.parse(payload);
    }
    catch {
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
async function getUserFromContext(event) {
    // Primary: Lambda Authorizer context
    const authorizer = event.requestContext?.authorizer;
    if (authorizer?.userId) {
        return {
            userId: authorizer.userId,
            email: authorizer.email || '',
            organizationId: authorizer.organizationId || '',
            role: authorizer.role || '',
            isTemporary: authorizer.scope === 'temp_authenticated',
            authState: authorizer.authState || undefined,
        };
    }
    // Fallback: validate JWT from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
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
            }
            else {
                // Full authentication token
                return {
                    userId: payload.userId,
                    email: payload.email || '',
                    organizationId: payload.organizationId || '',
                    role: payload.role || 'developer',
                    isTemporary: false,
                };
            }
        }
        catch (error) {
            console.warn('JWT validation failed, falling back to decode:', error);
            // Fallback: decode JWT payload without verification (for backward compatibility)
            const payload = decodeJwtPayload(token);
            if (payload?.userId) {
                return {
                    userId: payload.userId,
                    email: payload.email || '',
                    organizationId: payload.organizationId || '',
                    role: payload.role || '',
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
                    role: payload['custom:role'] || 'developer',
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
function canPerformFileOperations(userContext) {
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
function canPerformSensitiveOperations(userContext) {
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
function extractUserFromToken(token) {
    try {
        const payload = decodeJwtPayload(token);
        if (!payload)
            return null;
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
        }
        else if (payload.userId) {
            // Custom JWT format
            return payload;
        }
        return null;
    }
    catch (error) {
        console.error('Failed to extract user from token:', error);
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0aC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7O0FBOENILGdEQXlFQztBQVdELDREQWlCQztBQVNELHNFQUdDO0FBU0Qsb0RBMEJDO0FBL0xELDhEQUEwRDtBQWUxRCw4Q0FBOEM7QUFDOUMsTUFBTSxVQUFVLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7QUFFcEM7OztHQUdHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFhO0lBQ3JDLElBQUksQ0FBQztRQUNILE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0ksS0FBSyxVQUFVLGtCQUFrQixDQUFDLEtBQTJCO0lBQ2xFLHFDQUFxQztJQUNyQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQztJQUNwRCxJQUFJLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUN2QixPQUFPO1lBQ0wsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQ3pCLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDN0IsY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjLElBQUksRUFBRTtZQUMvQyxJQUFJ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TyxDQUFDLElBQUk7Z0JBQ2xCLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQztnQkFDekQsYUFBYSxFQUFFLE9BQU8sQ0FBQyxhQUFhLENBQUM7YUFDdEMsQ0FBQztRQUNKLENBQUM7YUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMxQixvQkFBb0I7WUFDcEIsT0FBTyxPQUFPLENBQUM7UUFDakIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQXV0aGVudGljYXRpb24gVXRpbGl0eSBGdW5jdGlvbnNcclxuICogSGVscGVyIGZ1bmN0aW9ucyBmb3IgZXh0cmFjdGluZyB1c2VyIGNvbnRleHQgZnJvbSBBUEkgR2F0ZXdheSBldmVudHNcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlIH0gZnJvbSAnLi4vc2VydmljZXMvYXV0aC9qd3Qtc2VydmljZSc7XHJcblxyXG4vKipcclxuICogVXNlciBjb250ZXh0IGV4dHJhY3RlZCBmcm9tIEFQSSBHYXRld2F5IHJlcXVlc3QgY29udGV4dFxyXG4gKiBUaGlzIGlzIHBvcHVsYXRlZCBieSB0aGUgTGFtYmRhIEF1dGhvcml6ZXIgYWZ0ZXIgSldUIHZlcmlmaWNhdGlvblxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBVc2VyQ29udGV4dCB7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHJvbGU6ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInIHwgJyc7XHJcbiAgaXNUZW1wb3Jhcnk/OiBib29sZWFuOyAvLyBJbmRpY2F0ZXMgaWYgdGhpcyBpcyBmcm9tIGEgdGVtcG9yYXJ5IHRva2VuXHJcbiAgYXV0aFN0YXRlPzogc3RyaW5nOyAvLyBBdXRoIHN0YXRlIGZvciB0ZW1wb3JhcnkgdG9rZW5zXHJcbn1cclxuXHJcbi8vIEluaXRpYWxpemUgSldUIHNlcnZpY2UgZm9yIHRva2VuIHZhbGlkYXRpb25cclxuY29uc3Qgand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKCk7XHJcblxyXG4vKipcclxuICogRGVjb2RlIGEgSldUIHBheWxvYWQgd2l0aG91dCB2ZXJpZnlpbmcgdGhlIHNpZ25hdHVyZS5cclxuICogVXNlZCBhcyBhIGZhbGxiYWNrIHdoZW4gbm8gTGFtYmRhIGF1dGhvcml6ZXIgaXMgcHJlc2VudC5cclxuICovXHJcbmZ1bmN0aW9uIGRlY29kZUp3dFBheWxvYWQodG9rZW46IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfCBudWxsIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcGFydHMgPSB0b2tlbi5zcGxpdCgnLicpO1xyXG4gICAgaWYgKHBhcnRzLmxlbmd0aCAhPT0gMykgcmV0dXJuIG51bGw7XHJcbiAgICBjb25zdCBwYXlsb2FkID0gQnVmZmVyLmZyb20ocGFydHNbMV0sICdiYXNlNjR1cmwnKS50b1N0cmluZygndXRmOCcpO1xyXG4gICAgcmV0dXJuIEpTT04ucGFyc2UocGF5bG9hZCk7XHJcbiAgfSBjYXRjaCB7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0IGF1dGhlbnRpY2F0ZWQgdXNlciBpbmZvcm1hdGlvbiBmcm9tIEFQSSBHYXRld2F5IHJlcXVlc3QgY29udGV4dC5cclxuICpcclxuICogRmlyc3QgdHJpZXMgdGhlIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgKHBvcHVsYXRlZCB3aGVuIGFuIGF1dGhvcml6ZXIgaXNcclxuICogY29uZmlndXJlZCkuIEZhbGxzIGJhY2sgdG8gZGVjb2RpbmcgYW5kIHZhbGlkYXRpbmcgSldUIGRpcmVjdGx5IGZyb20gdGhlXHJcbiAqIEF1dGhvcml6YXRpb24gaGVhZGVyLCBzdXBwb3J0aW5nIGJvdGggZnVsbCBhbmQgdGVtcG9yYXJ5IGF1dGhlbnRpY2F0aW9uIHRva2Vucy5cclxuICpcclxuICogQHBhcmFtIGV2ZW50IC0gQVBJIEdhdGV3YXkgcHJveHkgZXZlbnRcclxuICogQHJldHVybnMgVXNlciBjb250ZXh0IG9iamVjdCB3aXRoIHVzZXJJZCwgZW1haWwsIG9yZ2FuaXphdGlvbklkLCByb2xlLCBhbmQgdGVtcG9yYXJ5IHN0YXR1c1xyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGdldFVzZXJGcm9tQ29udGV4dChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPFVzZXJDb250ZXh0PiB7XHJcbiAgLy8gUHJpbWFyeTogTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dFxyXG4gIGNvbnN0IGF1dGhvcml6ZXIgPSBldmVudC5yZXF1ZXN0Q29udGV4dD8uYXV0aG9yaXplcjtcclxuICBpZiAoYXV0aG9yaXplcj8udXNlcklkKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB1c2VySWQ6IGF1dGhvcml6ZXIudXNlcklkLFxyXG4gICAgICBlbWFpbDogYXV0aG9yaXplci5lbWFpbCB8fCAnJyxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IGF1dGhvcml6ZXIub3JnYW5pemF0aW9uSWQgfHwgJycsXHJcbiAgICAgIHJvbGU6IChhdXRob3JpemVyLnJvbGUgYXMgJ2FkbWluJyB8ICdkZXZlbG9wZXInIHwgJ3ZpZXdlcicpIHx8ICcnLFxyXG4gICAgICBpc1RlbXBvcmFyeTogYXV0aG9yaXplci5zY29wZSA9PT0gJ3RlbXBfYXV0aGVudGljYXRlZCcsXHJcbiAgICAgIGF1dGhTdGF0ZTogYXV0aG9yaXplci5hdXRoU3RhdGUgfHwgdW5kZWZpbmVkLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8vIEZhbGxiYWNrOiB2YWxpZGF0ZSBKV1QgZnJvbSBBdXRob3JpemF0aW9uIGhlYWRlclxyXG4gIGNvbnN0IGF1dGhIZWFkZXIgPVxyXG4gICAgZXZlbnQuaGVhZGVycz8uQXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzPy5hdXRob3JpemF0aW9uO1xyXG4gIGlmIChhdXRoSGVhZGVyPy5zdGFydHNXaXRoKCdCZWFyZXIgJykpIHtcclxuICAgIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlci5zdWJzdHJpbmcoNyk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFRyeSB0byB2ZXJpZnkgYXMgYW55IHRva2VuIChmdWxsIG9yIHRlbXBvcmFyeSlcclxuICAgICAgY29uc3QgcGF5bG9hZCA9IGF3YWl0IGp3dFNlcnZpY2UudmVyaWZ5QW55VG9rZW4odG9rZW4pO1xyXG4gICAgICBcclxuICAgICAgLy8gQ2hlY2sgaWYgdGhpcyBpcyBhIHRlbXBvcmFyeSB0b2tlblxyXG4gICAgICBpZiAoJ3Njb3BlJyBpbiBwYXlsb2FkICYmIHBheWxvYWQuc2NvcGUgPT09ICd0ZW1wX2F1dGhlbnRpY2F0ZWQnKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHVzZXJJZDogcGF5bG9hZC51c2VySWQsXHJcbiAgICAgICAgICBlbWFpbDogcGF5bG9hZC5lbWFpbCB8fCAnJyxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiBwYXlsb2FkLm9yZ2FuaXphdGlvbklkIHx8ICcnLFxyXG4gICAgICAgICAgcm9sZTogcGF5bG9hZC5yb2xlIHx8ICdkZXZlbG9wZXInLFxyXG4gICAgICAgICAgaXNUZW1wb3Jhcnk6IHRydWUsXHJcbiAgICAgICAgICBhdXRoU3RhdGU6IHBheWxvYWQuYXV0aFN0YXRlIHx8ICdvdHBfc2V0dXBfcmVxdWlyZWQnLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gRnVsbCBhdXRoZW50aWNhdGlvbiB0b2tlblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICAgICAgZW1haWw6IHBheWxvYWQuZW1haWwgfHwgJycsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDogcGF5bG9hZC5vcmdhbml6YXRpb25JZCB8fCAnJyxcclxuICAgICAgICAgIHJvbGU6IHBheWxvYWQucm9sZSB8fCAnZGV2ZWxvcGVyJyxcclxuICAgICAgICAgIGlzVGVtcG9yYXJ5OiBmYWxzZSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0pXVCB2YWxpZGF0aW9uIGZhaWxlZCwgZmFsbGluZyBiYWNrIHRvIGRlY29kZTonLCBlcnJvcik7XHJcbiAgICAgIFxyXG4gICAgICAvLyBGYWxsYmFjazogZGVjb2RlIEpXVCBwYXlsb2FkIHdpdGhvdXQgdmVyaWZpY2F0aW9uIChmb3IgYmFja3dhcmQgY29tcGF0aWJpbGl0eSlcclxuICAgICAgY29uc3QgcGF5bG9hZCA9IGRlY29kZUp3dFBheWxvYWQodG9rZW4pO1xyXG4gICAgICBpZiAocGF5bG9hZD8udXNlcklkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHVzZXJJZDogcGF5bG9hZC51c2VySWQsXHJcbiAgICAgICAgICBlbWFpbDogcGF5bG9hZC5lbWFpbCB8fCAnJyxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiBwYXlsb2FkLm9yZ2FuaXphdGlvbklkIHx8ICcnLFxyXG4gICAgICAgICAgcm9sZTogKHBheWxvYWQucm9sZSBhcyAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJykgfHwgJycsXHJcbiAgICAgICAgICBpc1RlbXBvcmFyeTogcGF5bG9hZC5zY29wZSA9PT0gJ3RlbXBfYXV0aGVudGljYXRlZCcsXHJcbiAgICAgICAgICBhdXRoU3RhdGU6IHBheWxvYWQuYXV0aFN0YXRlIHx8IHVuZGVmaW5lZCxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICAgIC8vIENvZ25pdG8gSldUOiBzdWIgaXMgdGhlIHVzZXIgSURcclxuICAgICAgaWYgKHBheWxvYWQ/LnN1Yikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB1c2VySWQ6IHBheWxvYWQuc3ViLFxyXG4gICAgICAgICAgZW1haWw6IHBheWxvYWQuZW1haWwgfHwgJycsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDogcGF5bG9hZFsnY3VzdG9tOm9yZ2FuaXphdGlvbklkJ10gfHwgJ2RlZmF1bHQtb3JnJyxcclxuICAgICAgICAgIHJvbGU6IChwYXlsb2FkWydjdXN0b206cm9sZSddIGFzICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInKSB8fCAnZGV2ZWxvcGVyJyxcclxuICAgICAgICAgIGlzVGVtcG9yYXJ5OiBmYWxzZSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4geyB1c2VySWQ6ICcnLCBlbWFpbDogJycsIG9yZ2FuaXphdGlvbklkOiAnJywgcm9sZTogJycgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGEgdXNlciBjb250ZXh0IGFsbG93cyBmaWxlIG9wZXJhdGlvbnMuXHJcbiAqIEZpbGUgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZCBmb3I6XHJcbiAqIC0gRnVsbHkgYXV0aGVudGljYXRlZCB1c2Vyc1xyXG4gKiAtIFVzZXJzIHdpdGggdGVtcG9yYXJ5IGF1dGhlbnRpY2F0aW9uIHRva2VucyAoZHVyaW5nIE9UUCBzZXR1cClcclxuICogXHJcbiAqIEBwYXJhbSB1c2VyQ29udGV4dCAtIFVzZXIgY29udGV4dCBmcm9tIGdldFVzZXJGcm9tQ29udGV4dFxyXG4gKiBAcmV0dXJucyB0cnVlIGlmIGZpbGUgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhblBlcmZvcm1GaWxlT3BlcmF0aW9ucyh1c2VyQ29udGV4dDogVXNlckNvbnRleHQpOiBib29sZWFuIHtcclxuICAvLyBNdXN0IGhhdmUgYSB2YWxpZCB1c2VyIElEXHJcbiAgaWYgKCF1c2VyQ29udGV4dC51c2VySWQpIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbiAgXHJcbiAgLy8gRnVsbCBhdXRoZW50aWNhdGlvbiBhbHdheXMgYWxsb3dzIGZpbGUgb3BlcmF0aW9uc1xyXG4gIGlmICghdXNlckNvbnRleHQuaXNUZW1wb3JhcnkpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICBcclxuICAvLyBUZW1wb3JhcnkgYXV0aGVudGljYXRpb24gYWxsb3dzIGZpbGUgb3BlcmF0aW9ucyBkdXJpbmcgT1RQIHNldHVwXHJcbiAgaWYgKHVzZXJDb250ZXh0LmlzVGVtcG9yYXJ5ICYmIHVzZXJDb250ZXh0LmF1dGhTdGF0ZSA9PT0gJ290cF9zZXR1cF9yZXF1aXJlZCcpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gZmFsc2U7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiBhIHVzZXIgY29udGV4dCBhbGxvd3Mgc2Vuc2l0aXZlIG9wZXJhdGlvbnMuXHJcbiAqIFNlbnNpdGl2ZSBvcGVyYXRpb25zIHJlcXVpcmUgZnVsbCBhdXRoZW50aWNhdGlvbiAobm8gdGVtcG9yYXJ5IHRva2VucykuXHJcbiAqIFxyXG4gKiBAcGFyYW0gdXNlckNvbnRleHQgLSBVc2VyIGNvbnRleHQgZnJvbSBnZXRVc2VyRnJvbUNvbnRleHRcclxuICogQHJldHVybnMgdHJ1ZSBpZiBzZW5zaXRpdmUgb3BlcmF0aW9ucyBhcmUgYWxsb3dlZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNhblBlcmZvcm1TZW5zaXRpdmVPcGVyYXRpb25zKHVzZXJDb250ZXh0OiBVc2VyQ29udGV4dCk6IGJvb2xlYW4ge1xyXG4gIC8vIE11c3QgaGF2ZSBhIHZhbGlkIHVzZXIgSUQgYW5kIE5PVCBiZSB0ZW1wb3JhcnlcclxuICByZXR1cm4gISEodXNlckNvbnRleHQudXNlcklkICYmICF1c2VyQ29udGV4dC5pc1RlbXBvcmFyeSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0IHVzZXIgaW5mb3JtYXRpb24gZnJvbSBKV1QgdG9rZW5cclxuICogVXNlZCBmb3IgZGlyZWN0IHRva2VuIHZhbGlkYXRpb24gd2l0aG91dCBMYW1iZGEgQXV0aG9yaXplclxyXG4gKiBcclxuICogQHBhcmFtIHRva2VuIC0gSldUIHRva2VuIHN0cmluZ1xyXG4gKiBAcmV0dXJucyBVc2VyIGluZm8gb2JqZWN0IG9yIG51bGwgaWYgaW52YWxpZFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGV4dHJhY3RVc2VyRnJvbVRva2VuKHRva2VuOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgbnVsbCB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHBheWxvYWQgPSBkZWNvZGVKd3RQYXlsb2FkKHRva2VuKTtcclxuICAgIGlmICghcGF5bG9hZCkgcmV0dXJuIG51bGw7XHJcbiAgICBcclxuICAgIC8vIFN1cHBvcnQgYm90aCBjdXN0b20gSldUIGZvcm1hdCBhbmQgQ29nbml0byBKV1QgZm9ybWF0XHJcbiAgICBpZiAocGF5bG9hZC5zdWIpIHtcclxuICAgICAgLy8gQ29nbml0byBKV1RcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWI6IHBheWxvYWQuc3ViLFxyXG4gICAgICAgIGVtYWlsOiBwYXlsb2FkLmVtYWlsLFxyXG4gICAgICAgIGVtYWlsX3ZlcmlmaWVkOiBwYXlsb2FkLmVtYWlsX3ZlcmlmaWVkLFxyXG4gICAgICAgIG5hbWU6IHBheWxvYWQubmFtZSxcclxuICAgICAgICAnY3VzdG9tOm9yZ2FuaXphdGlvbklkJzogcGF5bG9hZFsnY3VzdG9tOm9yZ2FuaXphdGlvbklkJ10sXHJcbiAgICAgICAgJ2N1c3RvbTpyb2xlJzogcGF5bG9hZFsnY3VzdG9tOnJvbGUnXVxyXG4gICAgICB9O1xyXG4gICAgfSBlbHNlIGlmIChwYXlsb2FkLnVzZXJJZCkge1xyXG4gICAgICAvLyBDdXN0b20gSldUIGZvcm1hdFxyXG4gICAgICByZXR1cm4gcGF5bG9hZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBleHRyYWN0IHVzZXIgZnJvbSB0b2tlbjonLCBlcnJvcik7XHJcbiAgICByZXR1cm4gbnVsbDtcclxuICB9XHJcbn0iXX0=