"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.AuthMiddleware = void 0;
const jwt_service_1 = require("../services/auth/jwt-service");
class AuthMiddleware {
    jwtService;
    constructor() {
        this.jwtService = new jwt_service_1.JWTService();
    }
    /**
     * Middleware to authenticate JWT tokens from API Gateway requests
     */
    authenticate(handler) {
        return async (event) => {
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
                const authenticatedEvent = {
                    ...event,
                    user,
                };
                return await handler(authenticatedEvent);
            }
            catch (error) {
                console.error('Authentication error:', error);
                if (error instanceof Error) {
                    if (error.message === 'Token expired') {
                        return this.unauthorizedResponse('Token expired', 'TOKEN_EXPIRED');
                    }
                    else if (error.message === 'Invalid token') {
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
    authorize(requiredRoles) {
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        return (handler) => {
            return this.authenticate(async (event) => {
                // Check if user has required role
                if (!roles.includes(event.user.role)) {
                    return this.forbiddenResponse(`Access denied. Required roles: ${roles.join(', ')}`);
                }
                return await handler(event);
            });
        };
    }
    /**
     * Middleware to check organization access
     */
    authorizeOrganization(handler) {
        return this.authenticate(async (event) => {
            const pathParameters = event.pathParameters || {};
            const organizationId = pathParameters.organizationId;
            // If organizationId is in path, verify user belongs to that organization
            if (organizationId && organizationId !== event.user.organizationId) {
                return this.forbiddenResponse('Access denied to this organization');
            }
            return await handler(event);
        });
    }
    unauthorizedResponse(message, code) {
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
    forbiddenResponse(message) {
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
exports.AuthMiddleware = AuthMiddleware;
// Export singleton instance
exports.authMiddleware = new AuthMiddleware();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0aC1taWRkbGV3YXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhEQUFzRTtBQVV0RSxNQUFhLGNBQWM7SUFDakIsVUFBVSxDQUFhO0lBRS9CO1FBQ0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZLENBQUMsT0FBNkI7UUFDeEMsT0FBTyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtZQUMzRSxJQUFJLENBQUM7Z0JBQ0gsMENBQTBDO2dCQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztnQkFDOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFFakUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUNYLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLHlDQUF5QyxDQUFDLENBQUM7Z0JBQzlFLENBQUM7Z0JBRUQsbUJBQW1CO2dCQUNuQixNQUFNLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBRTVELHlDQUF5QztnQkFDekMsTUFBTSxrQkFBa0IsR0FBdUI7b0JBQzdDLEdBQUcsS0FBSztvQkFDUixJQUFJO2lCQUNMLENBQUM7Z0JBRUYsT0FBTyxNQUFNLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQzNDLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBRTlDLElBQUksS0FBSyxZQUFZLEtBQUssRUFBRSxDQUFD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QkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0YsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF2SEQsd0NBdUhDO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSxjQUFjLEdBQUcsSUFBSSxjQUFjLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgSldUU2VydmljZSwgSldUUGF5bG9hZCB9IGZyb20gJy4uL3NlcnZpY2VzL2F1dGgvand0LXNlcnZpY2UnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBBdXRoZW50aWNhdGVkRXZlbnQgZXh0ZW5kcyBBUElHYXRld2F5UHJveHlFdmVudCB7XHJcbiAgdXNlcjogSldUUGF5bG9hZDtcclxufVxyXG5cclxuZXhwb3J0IHR5cGUgQXV0aGVudGljYXRlZEhhbmRsZXIgPSAoXHJcbiAgZXZlbnQ6IEF1dGhlbnRpY2F0ZWRFdmVudFxyXG4pID0+IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PjtcclxuXHJcbmV4cG9ydCBjbGFzcyBBdXRoTWlkZGxld2FyZSB7XHJcbiAgcHJpdmF0ZSBqd3RTZXJ2aWNlOiBKV1RTZXJ2aWNlO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNaWRkbGV3YXJlIHRvIGF1dGhlbnRpY2F0ZSBKV1QgdG9rZW5zIGZyb20gQVBJIEdhdGV3YXkgcmVxdWVzdHNcclxuICAgKi9cclxuICBhdXRoZW50aWNhdGUoaGFuZGxlcjogQXV0aGVudGljYXRlZEhhbmRsZXIpIHtcclxuICAgIHJldHVybiBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBFeHRyYWN0IHRva2VuIGZyb20gQXV0aG9yaXphdGlvbiBoZWFkZXJcclxuICAgICAgICBjb25zdCBhdXRoSGVhZGVyID0gZXZlbnQuaGVhZGVycy5BdXRob3JpemF0aW9uIHx8IGV2ZW50LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcclxuICAgICAgICBjb25zdCB0b2tlbiA9IHRoaXMuand0U2VydmljZS5leHRyYWN0VG9rZW5Gcm9tSGVhZGVyKGF1dGhIZWFkZXIpO1xyXG5cclxuICAgICAgICBpZiAoIXRva2VuKSB7XHJcbiAgICAgICAgICByZXR1cm4gdGhpcy51bmF1dGhvcml6ZWRSZXNwb25zZSgnTWlzc2luZyBvciBpbnZhbGlkIGF1dGhvcml6YXRpb24gaGVhZGVyJyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBWZXJpZnkgdGhlIHRva2VuXHJcbiAgICAgICAgY29uc3QgdXNlciA9IGF3YWl0IHRoaXMuand0U2VydmljZS52ZXJpZnlBY2Nlc3NUb2tlbih0b2tlbik7XHJcblxyXG4gICAgICAgIC8vIEFkZCB1c2VyIHRvIGV2ZW50IGFuZCBjYWxsIHRoZSBoYW5kbGVyXHJcbiAgICAgICAgY29uc3QgYXV0aGVudGljYXRlZEV2ZW50OiBBdXRoZW50aWNhdGVkRXZlbnQgPSB7XHJcbiAgICAgICAgICAuLi5ldmVudCxcclxuICAgICAgICAgIHVzZXIsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoYXV0aGVudGljYXRlZEV2ZW50KTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdBdXRoZW50aWNhdGlvbiBlcnJvcjonLCBlcnJvcik7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICAgIGlmIChlcnJvci5tZXNzYWdlID09PSAnVG9rZW4gZXhwaXJlZCcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudW5hdXRob3JpemVkUmVzcG9uc2UoJ1Rva2VuIGV4cGlyZWQnLCAnVE9LRU5fRVhQSVJFRCcpO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChlcnJvci5tZXNzYWdlID09PSAnSW52YWxpZCB0b2tlbicpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMudW5hdXRob3JpemVkUmVzcG9uc2UoJ0ludmFsaWQgdG9rZW4nLCAnSU5WQUxJRF9UT0tFTicpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy51bmF1dGhvcml6ZWRSZXNwb25zZSgnQXV0aGVudGljYXRpb24gZmFpbGVkJyk7XHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNaWRkbGV3YXJlIHRvIGNoZWNrIHVzZXIgcm9sZXMgYW5kIHBlcm1pc3Npb25zXHJcbiAgICovXHJcbiAgYXV0aG9yaXplKHJlcXVpcmVkUm9sZXM6IHN0cmluZ1tdIHwgc3RyaW5nKSB7XHJcbiAgICBjb25zdCByb2xlcyA9IEFycmF5LmlzQXJyYXkocmVxdWlyZWRSb2xlcykgPyByZXF1aXJlZFJvbGVzIDogW3JlcXVpcmVkUm9sZXNdO1xyXG4gICAgXHJcbiAgICByZXR1cm4gKGhhbmRsZXI6IEF1dGhlbnRpY2F0ZWRIYW5kbGVyKSA9PiB7XHJcbiAgICAgIHJldHVybiB0aGlzLmF1dGhlbnRpY2F0ZShhc3luYyAoZXZlbnQ6IEF1dGhlbnRpY2F0ZWRFdmVudCkgPT4ge1xyXG4gICAgICAgIC8vIENoZWNrIGlmIHVzZXIgaGFzIHJlcXVpcmVkIHJvbGVcclxuICAgICAgICBpZiAoIXJvbGVzLmluY2x1ZGVzKGV2ZW50LnVzZXIucm9sZSkpIHtcclxuICAgICAgICAgIHJldHVybiB0aGlzLmZvcmJpZGRlblJlc3BvbnNlKFxyXG4gICAgICAgICAgICBgQWNjZXNzIGRlbmllZC4gUmVxdWlyZWQgcm9sZXM6ICR7cm9sZXMuam9pbignLCAnKX1gXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG4gICAgICB9KTtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBNaWRkbGV3YXJlIHRvIGNoZWNrIG9yZ2FuaXphdGlvbiBhY2Nlc3NcclxuICAgKi9cclxuICBhdXRob3JpemVPcmdhbml6YXRpb24oaGFuZGxlcjogQXV0aGVudGljYXRlZEhhbmRsZXIpIHtcclxuICAgIHJldHVybiB0aGlzLmF1dGhlbnRpY2F0ZShhc3luYyAoZXZlbnQ6IEF1dGhlbnRpY2F0ZWRFdmVudCkgPT4ge1xyXG4gICAgICBjb25zdCBwYXRoUGFyYW1ldGVycyA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzIHx8IHt9O1xyXG4gICAgICBjb25zdCBvcmdhbml6YXRpb25JZCA9IHBhdGhQYXJhbWV0ZXJzLm9yZ2FuaXphdGlvbklkO1xyXG5cclxuICAgICAgLy8gSWYgb3JnYW5pemF0aW9uSWQgaXMgaW4gcGF0aCwgdmVyaWZ5IHVzZXIgYmVsb25ncyB0byB0aGF0IG9yZ2FuaXphdGlvblxyXG4gICAgICBpZiAob3JnYW5pemF0aW9uSWQgJiYgb3JnYW5pemF0aW9uSWQgIT09IGV2ZW50LnVzZXIub3JnYW5pemF0aW9uSWQpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5mb3JiaWRkZW5SZXNwb25zZSgnQWNjZXNzIGRlbmllZCB0byB0aGlzIG9yZ2FuaXphdGlvbicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgdW5hdXRob3JpemVkUmVzcG9uc2UobWVzc2FnZTogc3RyaW5nLCBjb2RlPzogc3RyaW5nKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogY29kZSB8fCAnVU5BVVRIT1JJWkVEJyxcclxuICAgICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGZvcmJpZGRlblJlc3BvbnNlKG1lc3NhZ2U6IHN0cmluZyk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdGT1JCSURERU4nLFxyXG4gICAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IGF1dGhNaWRkbGV3YXJlID0gbmV3IEF1dGhNaWRkbGV3YXJlKCk7Il19