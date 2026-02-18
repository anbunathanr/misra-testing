"use strict";
/**
 * Authentication Middleware
 * Verifies JWT tokens and attaches user information to the event
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAuth = withAuth;
exports.withAuthAndPermission = withAuthAndPermission;
exports.getUser = getUser;
const jwt_service_1 = require("../services/auth/jwt-service");
const jwtService = new jwt_service_1.JWTService();
/**
 * Authenticate a Lambda function handler
 * Verifies JWT token and attaches user to event
 */
function withAuth(handler) {
    return async (event) => {
        try {
            // Extract token from Authorization header
            const authHeader = event.headers?.Authorization || event.headers?.authorization;
            const token = jwtService.extractTokenFromHeader(authHeader);
            if (!token) {
                return {
                    statusCode: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        error: {
                            code: 'MISSING_TOKEN',
                            message: 'Authorization token is required',
                            timestamp: new Date().toISOString(),
                        },
                    }),
                };
            }
            // Verify token
            let user;
            try {
                user = await jwtService.verifyAccessToken(token);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Token verification failed';
                return {
                    statusCode: 401,
                    headers: {
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*',
                    },
                    body: JSON.stringify({
                        error: {
                            code: 'INVALID_TOKEN',
                            message: errorMessage,
                            timestamp: new Date().toISOString(),
                        },
                    }),
                };
            }
            // Attach user to event
            const authenticatedEvent = event;
            authenticatedEvent.user = user;
            // Call the actual handler
            return handler(authenticatedEvent);
        }
        catch (error) {
            console.error('Authentication error:', error);
            return {
                statusCode: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'AUTHENTICATION_ERROR',
                        message: 'An error occurred during authentication',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
    };
}
/**
 * Authenticate and authorize a Lambda function handler
 * Combines authentication with RBAC permission checking
 */
function withAuthAndPermission(resource, action, handler) {
    return withAuth(async (event) => {
        const { hasPermission } = await Promise.resolve().then(() => __importStar(require('./rbac-middleware')));
        // Check if user has permission
        if (!hasPermission(event.user.role, resource, action)) {
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'INSUFFICIENT_PERMISSIONS',
                        message: `Role '${event.user.role}' does not have permission to ${action} ${resource}`,
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Call the actual handler
        return handler(event);
    });
}
/**
 * Extract user from authenticated event
 * Helper function for handlers
 */
function getUser(event) {
    return event.user || null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC1taWRkbGV3YXJlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXV0aC1taWRkbGV3YXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBa0JILDRCQTBFQztBQU1ELHNEQTZCQztBQU1ELDBCQUVDO0FBcElELDhEQUFzRTtBQUV0RSxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztBQVNwQzs7O0dBR0c7QUFDSCxTQUFnQixRQUFRLENBQ3RCLE9BQXNFO0lBRXRFLE9BQU8sS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7UUFDM0UsSUFBSSxDQUFDO1lBQ0gsMENBQTBDO1lBQzFDLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxPQUFPLEVBQUUsYUFBYSxJQUFJLEtBQUssQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDO1lBQ2hGLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUU1RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1gsT0FBTztvQkFDTCxVQUFVLEVBQUUsR0FBRztvQkFDZixPQUFPLEVBQUU7d0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjt3QkFDbEMsNkJBQTZCLEVBQUUsR0FBRztxQkFDbkM7b0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7d0JBQ25CLEtBQUssRUFBRTs0QkFDTCxJQUFJLEVBQUUsZUFBZTs0QkFDckIsT0FBTyxFQUFFLGlDQUFpQzs0QkFDMUMsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO3lCQUNwQztxQkFDRixDQUFDO2lCQUNILENBQUM7WUFDSixDQUFDO1lBRUQsZUFBZTtZQUNmLElBQUksSUFBZ0IsQ0FBQztZQUNyQixJQUFJLENBQUM7Z0JBQ0gsSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLGlCQUFpQixD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ICogVmVyaWZpZXMgSldUIHRva2VucyBhbmQgYXR0YWNoZXMgdXNlciBpbmZvcm1hdGlvbiB0byB0aGUgZXZlbnRcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEpXVFNlcnZpY2UsIEpXVFBheWxvYWQgfSBmcm9tICcuLi9zZXJ2aWNlcy9hdXRoL2p3dC1zZXJ2aWNlJztcclxuXHJcbmNvbnN0IGp3dFNlcnZpY2UgPSBuZXcgSldUU2VydmljZSgpO1xyXG5cclxuLyoqXHJcbiAqIEV4dGVuZGVkIGV2ZW50IHR5cGUgd2l0aCB1c2VyIGluZm9ybWF0aW9uXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEF1dGhlbnRpY2F0ZWRFdmVudCBleHRlbmRzIEFQSUdhdGV3YXlQcm94eUV2ZW50IHtcclxuICB1c2VyOiBKV1RQYXlsb2FkO1xyXG59XHJcblxyXG4vKipcclxuICogQXV0aGVudGljYXRlIGEgTGFtYmRhIGZ1bmN0aW9uIGhhbmRsZXJcclxuICogVmVyaWZpZXMgSldUIHRva2VuIGFuZCBhdHRhY2hlcyB1c2VyIHRvIGV2ZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gd2l0aEF1dGgoXHJcbiAgaGFuZGxlcjogKGV2ZW50OiBBdXRoZW50aWNhdGVkRXZlbnQpID0+IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PlxyXG4pIHtcclxuICByZXR1cm4gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBFeHRyYWN0IHRva2VuIGZyb20gQXV0aG9yaXphdGlvbiBoZWFkZXJcclxuICAgICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnM/LkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycz8uYXV0aG9yaXphdGlvbjtcclxuICAgICAgY29uc3QgdG9rZW4gPSBqd3RTZXJ2aWNlLmV4dHJhY3RUb2tlbkZyb21IZWFkZXIoYXV0aEhlYWRlcik7XHJcblxyXG4gICAgICBpZiAoIXRva2VuKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgICAgY29kZTogJ01JU1NJTkdfVE9LRU4nLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6ICdBdXRob3JpemF0aW9uIHRva2VuIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFZlcmlmeSB0b2tlblxyXG4gICAgICBsZXQgdXNlcjogSldUUGF5bG9hZDtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICB1c2VyID0gYXdhaXQgand0U2VydmljZS52ZXJpZnlBY2Nlc3NUb2tlbih0b2tlbik7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVG9rZW4gdmVyaWZpY2F0aW9uIGZhaWxlZCc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfVE9LRU4nLFxyXG4gICAgICAgICAgICAgIG1lc3NhZ2U6IGVycm9yTWVzc2FnZSxcclxuICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEF0dGFjaCB1c2VyIHRvIGV2ZW50XHJcbiAgICAgIGNvbnN0IGF1dGhlbnRpY2F0ZWRFdmVudCA9IGV2ZW50IGFzIEF1dGhlbnRpY2F0ZWRFdmVudDtcclxuICAgICAgYXV0aGVudGljYXRlZEV2ZW50LnVzZXIgPSB1c2VyO1xyXG5cclxuICAgICAgLy8gQ2FsbCB0aGUgYWN0dWFsIGhhbmRsZXJcclxuICAgICAgcmV0dXJuIGhhbmRsZXIoYXV0aGVudGljYXRlZEV2ZW50KTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0FVVEhFTlRJQ0FUSU9OX0VSUk9SJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0FuIGVycm9yIG9jY3VycmVkIGR1cmluZyBhdXRoZW50aWNhdGlvbicsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQXV0aGVudGljYXRlIGFuZCBhdXRob3JpemUgYSBMYW1iZGEgZnVuY3Rpb24gaGFuZGxlclxyXG4gKiBDb21iaW5lcyBhdXRoZW50aWNhdGlvbiB3aXRoIFJCQUMgcGVybWlzc2lvbiBjaGVja2luZ1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHdpdGhBdXRoQW5kUGVybWlzc2lvbihcclxuICByZXNvdXJjZTogc3RyaW5nLFxyXG4gIGFjdGlvbjogJ2NyZWF0ZScgfCAncmVhZCcgfCAndXBkYXRlJyB8ICdkZWxldGUnIHwgJ2V4ZWN1dGUnLFxyXG4gIGhhbmRsZXI6IChldmVudDogQXV0aGVudGljYXRlZEV2ZW50KSA9PiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD5cclxuKSB7XHJcbiAgcmV0dXJuIHdpdGhBdXRoKGFzeW5jIChldmVudDogQXV0aGVudGljYXRlZEV2ZW50KSA9PiB7XHJcbiAgICBjb25zdCB7IGhhc1Blcm1pc3Npb24gfSA9IGF3YWl0IGltcG9ydCgnLi9yYmFjLW1pZGRsZXdhcmUnKTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBoYXMgcGVybWlzc2lvblxyXG4gICAgaWYgKCFoYXNQZXJtaXNzaW9uKGV2ZW50LnVzZXIucm9sZSwgcmVzb3VyY2UsIGFjdGlvbikpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5TVUZGSUNJRU5UX1BFUk1JU1NJT05TJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogYFJvbGUgJyR7ZXZlbnQudXNlci5yb2xlfScgZG9lcyBub3QgaGF2ZSBwZXJtaXNzaW9uIHRvICR7YWN0aW9ufSAke3Jlc291cmNlfWAsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDYWxsIHRoZSBhY3R1YWwgaGFuZGxlclxyXG4gICAgcmV0dXJuIGhhbmRsZXIoZXZlbnQpO1xyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogRXh0cmFjdCB1c2VyIGZyb20gYXV0aGVudGljYXRlZCBldmVudFxyXG4gKiBIZWxwZXIgZnVuY3Rpb24gZm9yIGhhbmRsZXJzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VXNlcihldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBKV1RQYXlsb2FkIHwgbnVsbCB7XHJcbiAgcmV0dXJuIChldmVudCBhcyBhbnkpLnVzZXIgfHwgbnVsbDtcclxufVxyXG4iXX0=