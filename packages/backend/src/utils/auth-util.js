"use strict";
/**
 * Authentication Utility Functions
 * Helper functions for extracting user context from API Gateway events
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserFromContext = getUserFromContext;
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
 * configured). Falls back to decoding the Bearer JWT directly from the
 * Authorization header so the function works even without an authorizer.
 *
 * @param event - API Gateway proxy event
 * @returns User context object with userId, email, organizationId, and role
 */
function getUserFromContext(event) {
    // Primary: Lambda Authorizer context
    const authorizer = event.requestContext?.authorizer;
    if (authorizer?.userId) {
        return {
            userId: authorizer.userId,
            email: authorizer.email || '',
            organizationId: authorizer.organizationId || '',
            role: authorizer.role || '',
        };
    }
    // Fallback: decode JWT from Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = decodeJwtPayload(token);
        if (payload?.userId) {
            return {
                userId: payload.userId,
                email: payload.email || '',
                organizationId: payload.organizationId || '',
                role: payload.role || '',
            };
        }
        // Cognito JWT: sub is the user ID
        if (payload?.sub) {
            return {
                userId: payload.sub,
                email: payload.email || '',
                organizationId: payload['custom:organizationId'] || 'default-org',
                role: payload['custom:role'] || 'developer',
            };
        }
    }
    return { userId: '', email: '', organizationId: '', role: '' };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0aC11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7O0FBd0NILGdEQXNDQztBQS9ERDs7O0dBR0c7QUFDSCxTQUFTLGdCQUFnQixDQUFDLEtBQWE7SUFDckMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sSUFBSSxDQUFDO1FBQ3BDLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNwRSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUFDLE1BQU0sQ0FBQztRQUNQLE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztBQUNILENBQUM7QUFFRDs7Ozs7Ozs7O0dBU0c7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxLQUEyQjtJQUM1RCxxQ0FBcUM7SUFDckMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUM7SUFDcEQsSUFBSSxVQUFVLEVBQUUsTUFBTSxFQUFFLENBQUM7UUFDdkIsT0FBTztZQUNMLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtZQUN6QixLQUFLLEVBQUUsVUFBVSxDQUFDLEtBQUssSUFBSSxFQUFFO1lBQzdCLGNBQWMsRUFBRSxVQUFVLENBQUMsY0FBYyxJQUFJLEVBQUU7WUFDL0MsSUFBSSxFQUFHLFVBQVUsQ0FBQyxJQUF5QyxJQUFJLEVBQUU7U0FDbEUsQ0FBQztJQUNKLENBQUM7SUFFRCxpREFBaUQ7SUFDakQsTUFBTSxVQUFVLEdBQ2QsS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxhQUFhLENBQUM7SUFDL0QsSUFBSSxVQUFVLEVBQUUsVUFBVSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDdEMsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUN4QyxJQUFJLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUNwQixPQUFPO2dCQUNMLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTTtnQkFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLLElBQUksRUFBRTtnQkFDMUIsY0FBYyxFQUFFLE9BQU8sQ0FBQyxjQUFjLElBQUksRUFBRTtnQkFDNUMsSUFBSSxFQUFHLE9BQU8sQ0FBQyxJQUF5QyxJQUFJLEVBQUU7YUFDL0QsQ0FBQztRQUNKLENBQUM7UUFDRCxrQ0FBa0M7UUFDbEMsSUFBSSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUc7Z0JBQ25CLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxJQUFJLEVBQUU7Z0JBQzFCLGNBQWMsRUFBRSxPQUFPLENBQUMsdUJBQXVCLENBQUMsSUFBSSxhQUFhO2dCQUNqRSxJQUFJLEVBQUcsT0FBTyxDQUFDLGFBQWEsQ0FBc0MsSUFBSSxXQUFXO2FBQ2xGLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztJQUVELE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFDakUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBdXRoZW50aWNhdGlvbiBVdGlsaXR5IEZ1bmN0aW9uc1xyXG4gKiBIZWxwZXIgZnVuY3Rpb25zIGZvciBleHRyYWN0aW5nIHVzZXIgY29udGV4dCBmcm9tIEFQSSBHYXRld2F5IGV2ZW50c1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG4vKipcclxuICogVXNlciBjb250ZXh0IGV4dHJhY3RlZCBmcm9tIEFQSSBHYXRld2F5IHJlcXVlc3QgY29udGV4dFxyXG4gKiBUaGlzIGlzIHBvcHVsYXRlZCBieSB0aGUgTGFtYmRhIEF1dGhvcml6ZXIgYWZ0ZXIgSldUIHZlcmlmaWNhdGlvblxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBVc2VyQ29udGV4dCB7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHJvbGU6ICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInIHwgJyc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWNvZGUgYSBKV1QgcGF5bG9hZCB3aXRob3V0IHZlcmlmeWluZyB0aGUgc2lnbmF0dXJlLlxyXG4gKiBVc2VkIGFzIGEgZmFsbGJhY2sgd2hlbiBubyBMYW1iZGEgYXV0aG9yaXplciBpcyBwcmVzZW50LlxyXG4gKi9cclxuZnVuY3Rpb24gZGVjb2RlSnd0UGF5bG9hZCh0b2tlbjogc3RyaW5nKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB8IG51bGwge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBwYXJ0cyA9IHRva2VuLnNwbGl0KCcuJyk7XHJcbiAgICBpZiAocGFydHMubGVuZ3RoICE9PSAzKSByZXR1cm4gbnVsbDtcclxuICAgIGNvbnN0IHBheWxvYWQgPSBCdWZmZXIuZnJvbShwYXJ0c1sxXSwgJ2Jhc2U2NHVybCcpLnRvU3RyaW5nKCd1dGY4Jyk7XHJcbiAgICByZXR1cm4gSlNPTi5wYXJzZShwYXlsb2FkKTtcclxuICB9IGNhdGNoIHtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgYXV0aGVudGljYXRlZCB1c2VyIGluZm9ybWF0aW9uIGZyb20gQVBJIEdhdGV3YXkgcmVxdWVzdCBjb250ZXh0LlxyXG4gKlxyXG4gKiBGaXJzdCB0cmllcyB0aGUgTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dCAocG9wdWxhdGVkIHdoZW4gYW4gYXV0aG9yaXplciBpc1xyXG4gKiBjb25maWd1cmVkKS4gRmFsbHMgYmFjayB0byBkZWNvZGluZyB0aGUgQmVhcmVyIEpXVCBkaXJlY3RseSBmcm9tIHRoZVxyXG4gKiBBdXRob3JpemF0aW9uIGhlYWRlciBzbyB0aGUgZnVuY3Rpb24gd29ya3MgZXZlbiB3aXRob3V0IGFuIGF1dGhvcml6ZXIuXHJcbiAqXHJcbiAqIEBwYXJhbSBldmVudCAtIEFQSSBHYXRld2F5IHByb3h5IGV2ZW50XHJcbiAqIEByZXR1cm5zIFVzZXIgY29udGV4dCBvYmplY3Qgd2l0aCB1c2VySWQsIGVtYWlsLCBvcmdhbml6YXRpb25JZCwgYW5kIHJvbGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogVXNlckNvbnRleHQge1xyXG4gIC8vIFByaW1hcnk6IExhbWJkYSBBdXRob3JpemVyIGNvbnRleHRcclxuICBjb25zdCBhdXRob3JpemVyID0gZXZlbnQucmVxdWVzdENvbnRleHQ/LmF1dGhvcml6ZXI7XHJcbiAgaWYgKGF1dGhvcml6ZXI/LnVzZXJJZCkge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdXNlcklkOiBhdXRob3JpemVyLnVzZXJJZCxcclxuICAgICAgZW1haWw6IGF1dGhvcml6ZXIuZW1haWwgfHwgJycsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiBhdXRob3JpemVyLm9yZ2FuaXphdGlvbklkIHx8ICcnLFxyXG4gICAgICByb2xlOiAoYXV0aG9yaXplci5yb2xlIGFzICdhZG1pbicgfCAnZGV2ZWxvcGVyJyB8ICd2aWV3ZXInKSB8fCAnJyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvLyBGYWxsYmFjazogZGVjb2RlIEpXVCBmcm9tIEF1dGhvcml6YXRpb24gaGVhZGVyXHJcbiAgY29uc3QgYXV0aEhlYWRlciA9XHJcbiAgICBldmVudC5oZWFkZXJzPy5BdXRob3JpemF0aW9uIHx8IGV2ZW50LmhlYWRlcnM/LmF1dGhvcml6YXRpb247XHJcbiAgaWYgKGF1dGhIZWFkZXI/LnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkge1xyXG4gICAgY29uc3QgdG9rZW4gPSBhdXRoSGVhZGVyLnN1YnN0cmluZyg3KTtcclxuICAgIGNvbnN0IHBheWxvYWQgPSBkZWNvZGVKd3RQYXlsb2FkKHRva2VuKTtcclxuICAgIGlmIChwYXlsb2FkPy51c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB1c2VySWQ6IHBheWxvYWQudXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiBwYXlsb2FkLmVtYWlsIHx8ICcnLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiBwYXlsb2FkLm9yZ2FuaXphdGlvbklkIHx8ICcnLFxyXG4gICAgICAgIHJvbGU6IChwYXlsb2FkLnJvbGUgYXMgJ2FkbWluJyB8ICdkZXZlbG9wZXInIHwgJ3ZpZXdlcicpIHx8ICcnLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gICAgLy8gQ29nbml0byBKV1Q6IHN1YiBpcyB0aGUgdXNlciBJRFxyXG4gICAgaWYgKHBheWxvYWQ/LnN1Yikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHVzZXJJZDogcGF5bG9hZC5zdWIsXHJcbiAgICAgICAgZW1haWw6IHBheWxvYWQuZW1haWwgfHwgJycsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHBheWxvYWRbJ2N1c3RvbTpvcmdhbml6YXRpb25JZCddIHx8ICdkZWZhdWx0LW9yZycsXHJcbiAgICAgICAgcm9sZTogKHBheWxvYWRbJ2N1c3RvbTpyb2xlJ10gYXMgJ2FkbWluJyB8ICdkZXZlbG9wZXInIHwgJ3ZpZXdlcicpIHx8ICdkZXZlbG9wZXInLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHsgdXNlcklkOiAnJywgZW1haWw6ICcnLCBvcmdhbml6YXRpb25JZDogJycsIHJvbGU6ICcnIH07XHJcbn1cclxuIl19