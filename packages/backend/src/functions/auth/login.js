"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const jwt_service_1 = require("../../services/auth/jwt-service");
const user_service_1 = require("../../services/user/user-service");
const n8n_service_1 = require("../../services/auth/n8n-service");
const jwtService = new jwt_service_1.JWTService();
const userService = new user_service_1.UserService();
const n8nService = new n8n_service_1.N8nService();
const handler = async (event) => {
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const loginRequest = JSON.parse(event.body);
        // Validate input
        if (!loginRequest.email || !loginRequest.password) {
            return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
        }
        // Validate credentials with n8n
        const n8nUser = await n8nService.validateCredentials(loginRequest.email, loginRequest.password);
        if (!n8nUser) {
            return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        // Get or create user in our system
        let user = await userService.getUserByEmail(loginRequest.email);
        if (!user) {
            // Create new user from n8n data
            user = await userService.createUser({
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
        }
        else {
            // Update last login time
            await userService.updateLastLogin(user.userId);
        }
        // Generate JWT tokens
        const tokenPair = await jwtService.generateTokenPair({
            userId: user.userId,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        });
        const response = {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            user,
            expiresIn: tokenPair.expiresIn,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Login error:', error);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpRUFBNkQ7QUFDN0QsbUVBQStEO0FBQy9ELGlFQUE2RDtBQWU3RCxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztBQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztBQUN0QyxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztBQUU3QixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sWUFBWSxHQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxRCxpQkFBaUI7UUFDakIsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbEQsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsTUFBTSxPQUFPLEdBQUcsTUFBTSxVQUFVLENBQUMsbUJBQW1CLENBQ2xELFlBQVksQ0FBQyxLQUFLLEVBQ2xCLFlBQVksQ0FBQyxRQUFRLENBQ3RCLENBQUM7UUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDYixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUNoRixDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLElBQUksSUFBSSxHQUFH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dCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgSldUU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvand0LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBVc2VyU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3VzZXIvdXNlci1zZXJ2aWNlJztcclxuaW1wb3J0IHsgTjhuU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvbjhuLXNlcnZpY2UnO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9ucyAoYXZvaWRpbmcgc2hhcmVkIHBhY2thZ2UgaW1wb3J0IGlzc3VlcylcclxuaW50ZXJmYWNlIExvZ2luUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBwYXNzd29yZDogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgTG9naW5SZXNwb25zZSB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICB1c2VyOiBhbnk7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbmNvbnN0IGp3dFNlcnZpY2UgPSBuZXcgSldUU2VydmljZSgpO1xyXG5jb25zdCB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xyXG5jb25zdCBuOG5TZXJ2aWNlID0gbmV3IE44blNlcnZpY2UoKTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgbG9naW5SZXF1ZXN0OiBMb2dpblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIGlucHV0XHJcbiAgICBpZiAoIWxvZ2luUmVxdWVzdC5lbWFpbCB8fCAhbG9naW5SZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnRW1haWwgYW5kIHBhc3N3b3JkIGFyZSByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIGNyZWRlbnRpYWxzIHdpdGggbjhuXHJcbiAgICBjb25zdCBuOG5Vc2VyID0gYXdhaXQgbjhuU2VydmljZS52YWxpZGF0ZUNyZWRlbnRpYWxzKFxyXG4gICAgICBsb2dpblJlcXVlc3QuZW1haWwsXHJcbiAgICAgIGxvZ2luUmVxdWVzdC5wYXNzd29yZFxyXG4gICAgKTtcclxuXHJcbiAgICBpZiAoIW44blVzZXIpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnSU5WQUxJRF9DUkVERU5USUFMUycsICdJbnZhbGlkIGVtYWlsIG9yIHBhc3N3b3JkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IG9yIGNyZWF0ZSB1c2VyIGluIG91ciBzeXN0ZW1cclxuICAgIGxldCB1c2VyID0gYXdhaXQgdXNlclNlcnZpY2UuZ2V0VXNlckJ5RW1haWwobG9naW5SZXF1ZXN0LmVtYWlsKTtcclxuICAgIFxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgdXNlciBmcm9tIG44biBkYXRhXHJcbiAgICAgIHVzZXIgPSBhd2FpdCB1c2VyU2VydmljZS5jcmVhdGVVc2VyKHtcclxuICAgICAgICBlbWFpbDogbjhuVXNlci5lbWFpbCxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogbjhuVXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICByb2xlOiBuOG5Vc2VyLnJvbGUgfHwgJ2RldmVsb3BlcicsXHJcbiAgICAgICAgcHJlZmVyZW5jZXM6IHtcclxuICAgICAgICAgIHRoZW1lOiAnbGlnaHQnLFxyXG4gICAgICAgICAgbm90aWZpY2F0aW9uczoge1xyXG4gICAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgICAgd2ViaG9vazogZmFsc2UsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAxMicsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBVcGRhdGUgbGFzdCBsb2dpbiB0aW1lXHJcbiAgICAgIGF3YWl0IHVzZXJTZXJ2aWNlLnVwZGF0ZUxhc3RMb2dpbih1c2VyLnVzZXJJZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgSldUIHRva2Vuc1xyXG4gICAgY29uc3QgdG9rZW5QYWlyID0gYXdhaXQgand0U2VydmljZS5nZW5lcmF0ZVRva2VuUGFpcih7XHJcbiAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgIGVtYWlsOiB1c2VyLmVtYWlsLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgcm9sZTogdXNlci5yb2xlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IExvZ2luUmVzcG9uc2UgPSB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuOiB0b2tlblBhaXIuYWNjZXNzVG9rZW4sXHJcbiAgICAgIHJlZnJlc2hUb2tlbjogdG9rZW5QYWlyLnJlZnJlc2hUb2tlbixcclxuICAgICAgdXNlcixcclxuICAgICAgZXhwaXJlc0luOiB0b2tlblBhaXIuZXhwaXJlc0luLFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdMb2dpbiBlcnJvcjonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCduOG4nKSkge1xyXG4gICAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMywgJ0FVVEhfU0VSVklDRV9VTkFWQUlMQUJMRScsICdBdXRoZW50aWNhdGlvbiBzZXJ2aWNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlJyk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnSU5URVJOQUxfRVJST1InLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIH07XHJcbn0iXX0=