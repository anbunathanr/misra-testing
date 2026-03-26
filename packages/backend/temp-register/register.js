"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const n8n_service_1 = require("../../services/auth/n8n-service");
const user_service_1 = require("../../services/user/user-service");
const n8nService = new n8n_service_1.N8nService();
const userService = new user_service_1.UserService();
const handler = async (event) => {
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const registerRequest = JSON.parse(event.body);
        // Validate input
        if (!registerRequest.email || !registerRequest.password || !registerRequest.name) {
            return errorResponse(400, 'INVALID_INPUT', 'Email, password, and name are required');
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(registerRequest.email)) {
            return errorResponse(400, 'INVALID_EMAIL', 'Please enter a valid email address');
        }
        // Validate password strength
        if (registerRequest.password.length < 8) {
            return errorResponse(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters');
        }
        // Validate credentials with n8n
        const n8nUser = await n8nService.validateCredentials(registerRequest.email, registerRequest.password);
        if (!n8nUser) {
            return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        // Check if user already exists
        const existingUser = await userService.getUserByEmail(registerRequest.email);
        if (existingUser) {
            return errorResponse(409, 'USER_EXISTS', 'An account with this email already exists');
        }
        // Create new user in our system
        const user = await userService.createUser({
            email: n8nUser.email,
            organizationId: n8nUser.organizationId,
            role: n8nUser.role || 'developer',
            preferences: {
                theme: 'light',
                notifications: {
                    email: true,
                    webhook: false,
                },
                defaultMisraRuleSet: 'MISRA_C_2012',
            },
        });
        const response = {
            message: 'User registered successfully. Please verify your email.',
        };
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Register error:', error);
        if (error instanceof Error) {
            if (error.message.includes('n8n')) {
                return errorResponse(503, 'AUTH_SERVICE_UNAVAILABLE', 'Authentication service temporarily unavailable');
            }
        }
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
    }
};
exports.handler = handler;
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: Math.random().toString(36).substring(7),
            },
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpRUFBNkQ7QUFDN0QsbUVBQStEO0FBYS9ELE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQVcsRUFBRSxDQUFDO0FBRS9CLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQW9CLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWhFLGlCQUFpQjtRQUNqQixJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDakYsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSx3Q0FBd0MsQ0FBQyxDQUFDO1FBQ3ZGLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxVQUFVLEdBQUcsNEJBQTRCLENBQUM7UUFDaEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO1FBQ25GLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxlQUFlLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN4QyxPQUFPLGFBQWEs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dmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IE44blNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL244bi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVXNlclNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy91c2VyL3VzZXItc2VydmljZSc7XHJcblxyXG4vLyBMb2NhbCB0eXBlIGRlZmluaXRpb25zXHJcbmludGVyZmFjZSBSZWdpc3RlclJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgcGFzc3dvcmQ6IHN0cmluZztcclxuICBuYW1lOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBSZWdpc3RlclJlc3BvbnNlIHtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmNvbnN0IG44blNlcnZpY2UgPSBuZXcgTjhuU2VydmljZSgpO1xyXG5jb25zdCB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZWdpc3RlclJlcXVlc3Q6IFJlZ2lzdGVyUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgaW5wdXRcclxuICAgIGlmICghcmVnaXN0ZXJSZXF1ZXN0LmVtYWlsIHx8ICFyZWdpc3RlclJlcXVlc3QucGFzc3dvcmQgfHwgIXJlZ2lzdGVyUmVxdWVzdC5uYW1lKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnRW1haWwsIHBhc3N3b3JkLCBhbmQgbmFtZSBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBlbWFpbCBmb3JtYXRcclxuICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICAgIGlmICghZW1haWxSZWdleC50ZXN0KHJlZ2lzdGVyUmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgc3RyZW5ndGhcclxuICAgIGlmIChyZWdpc3RlclJlcXVlc3QucGFzc3dvcmQubGVuZ3RoIDwgOCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdXRUFLX1BBU1NXT1JEJywgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgY3JlZGVudGlhbHMgd2l0aCBuOG5cclxuICAgIGNvbnN0IG44blVzZXIgPSBhd2FpdCBuOG5TZXJ2aWNlLnZhbGlkYXRlQ3JlZGVudGlhbHMoXHJcbiAgICAgIHJlZ2lzdGVyUmVxdWVzdC5lbWFpbCxcclxuICAgICAgcmVnaXN0ZXJSZXF1ZXN0LnBhc3N3b3JkXHJcbiAgICApO1xyXG5cclxuICAgIGlmICghbjhuVXNlcikge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdJTlZBTElEX0NSRURFTlRJQUxTJywgJ0ludmFsaWQgZW1haWwgb3IgcGFzc3dvcmQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBpZiB1c2VyIGFscmVhZHkgZXhpc3RzXHJcbiAgICBjb25zdCBleGlzdGluZ1VzZXIgPSBhd2FpdCB1c2VyU2VydmljZS5nZXRVc2VyQnlFbWFpbChyZWdpc3RlclJlcXVlc3QuZW1haWwpO1xyXG4gICAgXHJcbiAgICBpZiAoZXhpc3RpbmdVc2VyKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwOSwgJ1VTRVJfRVhJU1RTJywgJ0FuIGFjY291bnQgd2l0aCB0aGlzIGVtYWlsIGFscmVhZHkgZXhpc3RzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ3JlYXRlIG5ldyB1c2VyIGluIG91ciBzeXN0ZW1cclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCB1c2VyU2VydmljZS5jcmVhdGVVc2VyKHtcclxuICAgICAgZW1haWw6IG44blVzZXIuZW1haWwsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiBuOG5Vc2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICByb2xlOiBuOG5Vc2VyLnJvbGUgfHwgJ2RldmVsb3BlcicsXHJcbiAgICAgIHByZWZlcmVuY2VzOiB7XHJcbiAgICAgICAgdGhlbWU6ICdsaWdodCcsXHJcbiAgICAgICAgbm90aWZpY2F0aW9uczoge1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICB3ZWJob29rOiBmYWxzZSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGRlZmF1bHRNaXNyYVJ1bGVTZXQ6ICdNSVNSQV9DXzIwMTInLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IFJlZ2lzdGVyUmVzcG9uc2UgPSB7XHJcbiAgICAgIG1lc3NhZ2U6ICdVc2VyIHJlZ2lzdGVyZWQgc3VjY2Vzc2Z1bGx5LiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwuJyxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAxLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignUmVnaXN0ZXIgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnbjhuJykpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDMsICdBVVRIX1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnQXV0aGVudGljYXRpb24gc2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZScpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59XHJcbiJdfQ==