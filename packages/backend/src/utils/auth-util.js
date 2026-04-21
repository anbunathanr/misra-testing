"use strict";
/**
 * Authentication Utility Functions
 * Helper functions for extracting user context from API Gateway events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFromContext = getUserFromContext;
exports.canPerformFileOperations = canPerformFileOperations;
exports.canPerformSensitiveOperations = canPerformSensitiveOperations;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0aC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7O0FBOENILGdEQXlFQztBQVdELDREQWlCQztBQVNELHNFQUdDO0FBNUpELDhEQUEwRDtBQWUxRCw4Q0FBOEM7QUFDOUMsTUFBTSxVQUFVLEdBQUcsSUFBSSx3QkFBVSxFQUFFLENBQUM7QUFFcEM7OztHQUdHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFhO0lBQ3JDLElBQUksQ0FBQztRQUNILE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDL0IsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEUsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDO0FBRUQ7Ozs7Ozs7OztHQVNHO0FBQ0ksS0FBSyxVQUFVLGtCQUFrQixDQUFDLEtBQTJCO0lBQ2xFLHFDQUFxQztJQUNyQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQztJQUNwRCxJQUFJLFVBQVUsRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUN2QixPQUFPO1lBQ0wsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNO1lBQ3pCLEtBQUssRUFBRSxVQUFVLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDN0IsY0FBYyxFQUFFLFVBQVUsQ0FBQyxjQUFjLElBQUksRUFBRTtZQUMvQyxJQUFJLEVBQUcsVUFBVSxD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Y0FBYyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFDakUsQ0FBQztBQUVEOzs7Ozs7OztHQVFHO0FBQ0gsU0FBZ0Isd0JBQXdCLENBQUMsV0FBd0I7SUFDL0QsNEJBQTRCO0lBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDeEIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDO0lBRUQsb0RBQW9EO0lBQ3BELElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDN0IsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsbUVBQW1FO0lBQ25FLElBQUksV0FBVyxDQUFDLFdBQVcsSUFBSSxXQUFXLENBQUMsU0FBUyxLQUFLLG9CQUFvQixFQUFFLENBQUM7UUFDOUUsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxLQUFLLENBQUM7QUFDZixDQUFDO0FBRUQ7Ozs7OztHQU1HO0FBQ0gsU0FBZ0IsNkJBQTZCLENBQUMsV0FBd0I7SUFDcEUsaURBQWlEO0lBQ2pELE9BQU8sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUM1RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEF1dGhlbnRpY2F0aW9uIFV0aWxpdHkgRnVuY3Rpb25zXHJcbiAqIEhlbHBlciBmdW5jdGlvbnMgZm9yIGV4dHJhY3RpbmcgdXNlciBjb250ZXh0IGZyb20gQVBJIEdhdGV3YXkgZXZlbnRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgSldUU2VydmljZSB9IGZyb20gJy4uL3NlcnZpY2VzL2F1dGgvand0LXNlcnZpY2UnO1xyXG5cclxuLyoqXHJcbiAqIFVzZXIgY29udGV4dCBleHRyYWN0ZWQgZnJvbSBBUEkgR2F0ZXdheSByZXF1ZXN0IGNvbnRleHRcclxuICogVGhpcyBpcyBwb3B1bGF0ZWQgYnkgdGhlIExhbWJkYSBBdXRob3JpemVyIGFmdGVyIEpXVCB2ZXJpZmljYXRpb25cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgVXNlckNvbnRleHQge1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICByb2xlOiAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJyB8ICcnO1xyXG4gIGlzVGVtcG9yYXJ5PzogYm9vbGVhbjsgLy8gSW5kaWNhdGVzIGlmIHRoaXMgaXMgZnJvbSBhIHRlbXBvcmFyeSB0b2tlblxyXG4gIGF1dGhTdGF0ZT86IHN0cmluZzsgLy8gQXV0aCBzdGF0ZSBmb3IgdGVtcG9yYXJ5IHRva2Vuc1xyXG59XHJcblxyXG4vLyBJbml0aWFsaXplIEpXVCBzZXJ2aWNlIGZvciB0b2tlbiB2YWxpZGF0aW9uXHJcbmNvbnN0IGp3dFNlcnZpY2UgPSBuZXcgSldUU2VydmljZSgpO1xyXG5cclxuLyoqXHJcbiAqIERlY29kZSBhIEpXVCBwYXlsb2FkIHdpdGhvdXQgdmVyaWZ5aW5nIHRoZSBzaWduYXR1cmUuXHJcbiAqIFVzZWQgYXMgYSBmYWxsYmFjayB3aGVuIG5vIExhbWJkYSBhdXRob3JpemVyIGlzIHByZXNlbnQuXHJcbiAqL1xyXG5mdW5jdGlvbiBkZWNvZGVKd3RQYXlsb2FkKHRva2VuOiBzdHJpbmcpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHwgbnVsbCB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHBhcnRzID0gdG9rZW4uc3BsaXQoJy4nKTtcclxuICAgIGlmIChwYXJ0cy5sZW5ndGggIT09IDMpIHJldHVybiBudWxsO1xyXG4gICAgY29uc3QgcGF5bG9hZCA9IEJ1ZmZlci5mcm9tKHBhcnRzWzFdLCAnYmFzZTY0dXJsJykudG9TdHJpbmcoJ3V0ZjgnKTtcclxuICAgIHJldHVybiBKU09OLnBhcnNlKHBheWxvYWQpO1xyXG4gIH0gY2F0Y2gge1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdCBhdXRoZW50aWNhdGVkIHVzZXIgaW5mb3JtYXRpb24gZnJvbSBBUEkgR2F0ZXdheSByZXF1ZXN0IGNvbnRleHQuXHJcbiAqXHJcbiAqIEZpcnN0IHRyaWVzIHRoZSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IChwb3B1bGF0ZWQgd2hlbiBhbiBhdXRob3JpemVyIGlzXHJcbiAqIGNvbmZpZ3VyZWQpLiBGYWxscyBiYWNrIHRvIGRlY29kaW5nIGFuZCB2YWxpZGF0aW5nIEpXVCBkaXJlY3RseSBmcm9tIHRoZVxyXG4gKiBBdXRob3JpemF0aW9uIGhlYWRlciwgc3VwcG9ydGluZyBib3RoIGZ1bGwgYW5kIHRlbXBvcmFyeSBhdXRoZW50aWNhdGlvbiB0b2tlbnMuXHJcbiAqXHJcbiAqIEBwYXJhbSBldmVudCAtIEFQSSBHYXRld2F5IHByb3h5IGV2ZW50XHJcbiAqIEByZXR1cm5zIFVzZXIgY29udGV4dCBvYmplY3Qgd2l0aCB1c2VySWQsIGVtYWlsLCBvcmdhbml6YXRpb25JZCwgcm9sZSwgYW5kIHRlbXBvcmFyeSBzdGF0dXNcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxVc2VyQ29udGV4dD4ge1xyXG4gIC8vIFByaW1hcnk6IExhbWJkYSBBdXRob3JpemVyIGNvbnRleHRcclxuICBjb25zdCBhdXRob3JpemVyID0gZXZlbnQucmVxdWVzdENvbnRleHQ/LmF1dGhvcml6ZXI7XHJcbiAgaWYgKGF1dGhvcml6ZXI/LnVzZXJJZCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdXNlcklkOiBhdXRob3JpemVyLnVzZXJJZCxcclxuICAgICAgZW1haWw6IGF1dGhvcml6ZXIuZW1haWwgfHwgJycsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiBhdXRob3JpemVyLm9yZ2FuaXphdGlvbklkIHx8ICcnLFxyXG4gICAgICByb2xlOiAoYXV0aG9yaXplci5yb2xlIGFzICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInKSB8fCAnJyxcclxuICAgICAgaXNUZW1wb3Jhcnk6IGF1dGhvcml6ZXIuc2NvcGUgPT09ICd0ZW1wX2F1dGhlbnRpY2F0ZWQnLFxyXG4gICAgICBhdXRoU3RhdGU6IGF1dGhvcml6ZXIuYXV0aFN0YXRlIHx8IHVuZGVmaW5lZCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBGYWxsYmFjazogdmFsaWRhdGUgSldUIGZyb20gQXV0aG9yaXphdGlvbiBoZWFkZXJcclxuICBjb25zdCBhdXRoSGVhZGVyID1cclxuICAgIGV2ZW50LmhlYWRlcnM/LkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycz8uYXV0aG9yaXphdGlvbjtcclxuICBpZiAoYXV0aEhlYWRlcj8uc3RhcnRzV2l0aCgnQmVhcmVyICcpKSB7XHJcbiAgICBjb25zdCB0b2tlbiA9IGF1dGhIZWFkZXIuc3Vic3RyaW5nKDcpO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBUcnkgdG8gdmVyaWZ5IGFzIGFueSB0b2tlbiAoZnVsbCBvciB0ZW1wb3JhcnkpXHJcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBqd3RTZXJ2aWNlLnZlcmlmeUFueVRva2VuKHRva2VuKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGlmIHRoaXMgaXMgYSB0ZW1wb3JhcnkgdG9rZW5cclxuICAgICAgaWYgKCdzY29wZScgaW4gcGF5bG9hZCAmJiBwYXlsb2FkLnNjb3BlID09PSAndGVtcF9hdXRoZW50aWNhdGVkJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICAgICAgZW1haWw6IHBheWxvYWQuZW1haWwgfHwgJycsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDogcGF5bG9hZC5vcmdhbml6YXRpb25JZCB8fCAnJyxcclxuICAgICAgICAgIHJvbGU6IHBheWxvYWQucm9sZSB8fCAnZGV2ZWxvcGVyJyxcclxuICAgICAgICAgIGlzVGVtcG9yYXJ5OiB0cnVlLFxyXG4gICAgICAgICAgYXV0aFN0YXRlOiBwYXlsb2FkLmF1dGhTdGF0ZSB8fCAnb3RwX3NldHVwX3JlcXVpcmVkJyxcclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEZ1bGwgYXV0aGVudGljYXRpb24gdG9rZW5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdXNlcklkOiBwYXlsb2FkLnVzZXJJZCxcclxuICAgICAgICAgIGVtYWlsOiBwYXlsb2FkLmVtYWlsIHx8ICcnLFxyXG4gICAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHBheWxvYWQub3JnYW5pemF0aW9uSWQgfHwgJycsXHJcbiAgICAgICAgICByb2xlOiBwYXlsb2FkLnJvbGUgfHwgJ2RldmVsb3BlcicsXHJcbiAgICAgICAgICBpc1RlbXBvcmFyeTogZmFsc2UsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdKV1QgdmFsaWRhdGlvbiBmYWlsZWQsIGZhbGxpbmcgYmFjayB0byBkZWNvZGU6JywgZXJyb3IpO1xyXG4gICAgICBcclxuICAgICAgLy8gRmFsbGJhY2s6IGRlY29kZSBKV1QgcGF5bG9hZCB3aXRob3V0IHZlcmlmaWNhdGlvbiAoZm9yIGJhY2t3YXJkIGNvbXBhdGliaWxpdHkpXHJcbiAgICAgIGNvbnN0IHBheWxvYWQgPSBkZWNvZGVKd3RQYXlsb2FkKHRva2VuKTtcclxuICAgICAgaWYgKHBheWxvYWQ/LnVzZXJJZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICAgICAgZW1haWw6IHBheWxvYWQuZW1haWwgfHwgJycsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDogcGF5bG9hZC5vcmdhbml6YXRpb25JZCB8fCAnJyxcclxuICAgICAgICAgIHJvbGU6IChwYXlsb2FkLnJvbGUgYXMgJ2FkbWluJyB8ICdkZXZlbG9wZXInIHwgJ3ZpZXdlcicpIHx8ICcnLFxyXG4gICAgICAgICAgaXNUZW1wb3Jhcnk6IHBheWxvYWQuc2NvcGUgPT09ICd0ZW1wX2F1dGhlbnRpY2F0ZWQnLFxyXG4gICAgICAgICAgYXV0aFN0YXRlOiBwYXlsb2FkLmF1dGhTdGF0ZSB8fCB1bmRlZmluZWQsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICAvLyBDb2duaXRvIEpXVDogc3ViIGlzIHRoZSB1c2VyIElEXHJcbiAgICAgIGlmIChwYXlsb2FkPy5zdWIpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdXNlcklkOiBwYXlsb2FkLnN1YixcclxuICAgICAgICAgIGVtYWlsOiBwYXlsb2FkLmVtYWlsIHx8ICcnLFxyXG4gICAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHBheWxvYWRbJ2N1c3RvbTpvcmdhbml6YXRpb25JZCddIHx8ICdkZWZhdWx0LW9yZycsXHJcbiAgICAgICAgICByb2xlOiAocGF5bG9hZFsnY3VzdG9tOnJvbGUnXSBhcyAnYWRtaW4nIHwgJ2RldmVsb3BlcicgfCAndmlld2VyJykgfHwgJ2RldmVsb3BlcicsXHJcbiAgICAgICAgICBpc1RlbXBvcmFyeTogZmFsc2UsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHsgdXNlcklkOiAnJywgZW1haWw6ICcnLCBvcmdhbml6YXRpb25JZDogJycsIHJvbGU6ICcnIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaGVjayBpZiBhIHVzZXIgY29udGV4dCBhbGxvd3MgZmlsZSBvcGVyYXRpb25zLlxyXG4gKiBGaWxlIG9wZXJhdGlvbnMgYXJlIGFsbG93ZWQgZm9yOlxyXG4gKiAtIEZ1bGx5IGF1dGhlbnRpY2F0ZWQgdXNlcnNcclxuICogLSBVc2VycyB3aXRoIHRlbXBvcmFyeSBhdXRoZW50aWNhdGlvbiB0b2tlbnMgKGR1cmluZyBPVFAgc2V0dXApXHJcbiAqIFxyXG4gKiBAcGFyYW0gdXNlckNvbnRleHQgLSBVc2VyIGNvbnRleHQgZnJvbSBnZXRVc2VyRnJvbUNvbnRleHRcclxuICogQHJldHVybnMgdHJ1ZSBpZiBmaWxlIG9wZXJhdGlvbnMgYXJlIGFsbG93ZWRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjYW5QZXJmb3JtRmlsZU9wZXJhdGlvbnModXNlckNvbnRleHQ6IFVzZXJDb250ZXh0KTogYm9vbGVhbiB7XHJcbiAgLy8gTXVzdCBoYXZlIGEgdmFsaWQgdXNlciBJRFxyXG4gIGlmICghdXNlckNvbnRleHQudXNlcklkKSB7XHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG4gIFxyXG4gIC8vIEZ1bGwgYXV0aGVudGljYXRpb24gYWx3YXlzIGFsbG93cyBmaWxlIG9wZXJhdGlvbnNcclxuICBpZiAoIXVzZXJDb250ZXh0LmlzVGVtcG9yYXJ5KSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgXHJcbiAgLy8gVGVtcG9yYXJ5IGF1dGhlbnRpY2F0aW9uIGFsbG93cyBmaWxlIG9wZXJhdGlvbnMgZHVyaW5nIE9UUCBzZXR1cFxyXG4gIGlmICh1c2VyQ29udGV4dC5pc1RlbXBvcmFyeSAmJiB1c2VyQ29udGV4dC5hdXRoU3RhdGUgPT09ICdvdHBfc2V0dXBfcmVxdWlyZWQnKSB7XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgYSB1c2VyIGNvbnRleHQgYWxsb3dzIHNlbnNpdGl2ZSBvcGVyYXRpb25zLlxyXG4gKiBTZW5zaXRpdmUgb3BlcmF0aW9ucyByZXF1aXJlIGZ1bGwgYXV0aGVudGljYXRpb24gKG5vIHRlbXBvcmFyeSB0b2tlbnMpLlxyXG4gKiBcclxuICogQHBhcmFtIHVzZXJDb250ZXh0IC0gVXNlciBjb250ZXh0IGZyb20gZ2V0VXNlckZyb21Db250ZXh0XHJcbiAqIEByZXR1cm5zIHRydWUgaWYgc2Vuc2l0aXZlIG9wZXJhdGlvbnMgYXJlIGFsbG93ZWRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBjYW5QZXJmb3JtU2Vuc2l0aXZlT3BlcmF0aW9ucyh1c2VyQ29udGV4dDogVXNlckNvbnRleHQpOiBib29sZWFuIHtcclxuICAvLyBNdXN0IGhhdmUgYSB2YWxpZCB1c2VyIElEIGFuZCBOT1QgYmUgdGVtcG9yYXJ5XHJcbiAgcmV0dXJuICEhKHVzZXJDb250ZXh0LnVzZXJJZCAmJiAhdXNlckNvbnRleHQuaXNUZW1wb3JhcnkpO1xyXG59Il19