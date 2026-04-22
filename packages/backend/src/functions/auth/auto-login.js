"use strict";
/**
 * Auto-Login Lambda Function
 *
 * Logs in user after OTP verification without requiring password
 * This is used in the automated authentication flow
 *
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresIn": 3600,
 *   "user": {
 *     "userId": "...",
 *     "email": "user@example.com",
 *     "name": "User"
 *   }
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_cognito_identity_provider_1 = require("@aws-sdk/client-cognito-identity-provider");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('AutoLogin');
const cognitoClient = new client_cognito_identity_provider_1.CognitoIdentityProviderClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    logger.info('Auto-login request received', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required', correlationId);
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.email) {
            return errorResponse(400, 'MISSING_EMAIL', 'Email is required', correlationId);
        }
        logger.info('Auto-logging in user', {
            correlationId,
            email: request.email
        });
        // Authenticate with Cognito using the fixed test password
        // This password was used during registration and OTP verification
        const tempPassword = 'TestPass123!@#';
        const authResult = await cognitoClient.send(new client_cognito_identity_provider_1.AdminInitiateAuthCommand({
            UserPoolId: process.env.COGNITO_USER_POOL_ID,
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthFlow: client_cognito_identity_provider_1.AuthFlowType.ADMIN_NO_SRP_AUTH,
            AuthParameters: {
                USERNAME: request.email,
                PASSWORD: tempPassword,
            },
        }));
        // Check if authentication was successful
        if (!authResult.AuthenticationResult) {
            throw new Error('Authentication failed - no tokens returned from Cognito');
        }
        logger.info('Auto-login successful', {
            correlationId,
            email: request.email
        });
        // Extract user ID from the access token (sub claim)
        const accessTokenParts = authResult.AuthenticationResult.AccessToken.split('.');
        let userId = request.email.split('@')[0];
        try {
            const payload = JSON.parse(Buffer.from(accessTokenParts[1], 'base64').toString());
            userId = payload.sub || userId;
        }
        catch (e) {
            logger.warn('Could not extract userId from token', { correlationId });
        }
        const response = {
            accessToken: authResult.AuthenticationResult.AccessToken,
            refreshToken: authResult.AuthenticationResult.RefreshToken,
            expiresIn: authResult.AuthenticationResult.ExpiresIn || 3600,
            user: {
                userId,
                email: request.email,
                name: 'User'
            }
        };
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('Auto-login failed', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        return errorResponse(500, 'AUTO_LOGIN_FAILED', error.message || 'Failed to auto-login', correlationId);
    }
};
exports.handler = handler;
/**
 * Standard error response
 */
function errorResponse(statusCode, code, message, correlationId) {
    return {
        statusCode,
        headers: cors_1.corsHeaders,
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: correlationId
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG8tbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBc0JHOzs7QUFHSCxnR0FJbUQ7QUFDbkQsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsV0FBVyxDQUFDLENBQUM7QUFDekMsTUFBTSxhQUFhLEdBQUcsSUFBSSxnRUFBNkIsQ0FBQztJQUN0RCxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztDQUM5QyxDQUFDLENBQUM7QUFpQkksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRW5HLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLEVBQUU7UUFDekMsYUFBYTtRQUNiLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtRQUNoQixNQUFNLEVBQUUsS0FBSyxDQUFDLFVBQVU7S0FDekIsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQXFCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFB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Q3pHLENBQUM7QUFDSCxDQUFDLENBQUM7QUF4RlcsUUFBQSxPQUFPLFdBd0ZsQjtBQUVGOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlLEVBQ2YsYUFBcUI7SUFFckIsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUUsa0JBQVc7UUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxhQUFhO2FBQ3pCO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEF1dG8tTG9naW4gTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFxyXG4gKiBMb2dzIGluIHVzZXIgYWZ0ZXIgT1RQIHZlcmlmaWNhdGlvbiB3aXRob3V0IHJlcXVpcmluZyBwYXNzd29yZFxyXG4gKiBUaGlzIGlzIHVzZWQgaW4gdGhlIGF1dG9tYXRlZCBhdXRoZW50aWNhdGlvbiBmbG93XHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiB7XHJcbiAqICAgXCJlbWFpbFwiOiBcInVzZXJAZXhhbXBsZS5jb21cIlxyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwiYWNjZXNzVG9rZW5cIjogXCIuLi5cIixcclxuICogICBcInJlZnJlc2hUb2tlblwiOiBcIi4uLlwiLFxyXG4gKiAgIFwiZXhwaXJlc0luXCI6IDM2MDAsXHJcbiAqICAgXCJ1c2VyXCI6IHtcclxuICogICAgIFwidXNlcklkXCI6IFwiLi4uXCIsXHJcbiAqICAgICBcImVtYWlsXCI6IFwidXNlckBleGFtcGxlLmNvbVwiLFxyXG4gKiAgICAgXCJuYW1lXCI6IFwiVXNlclwiXHJcbiAqICAgfVxyXG4gKiB9XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBcclxuICBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCxcclxuICBBZG1pbkluaXRpYXRlQXV0aENvbW1hbmQsXHJcbiAgQXV0aEZsb3dUeXBlXHJcbn0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWNvZ25pdG8taWRlbnRpdHktcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdBdXRvTG9naW4nKTtcclxuY29uc3QgY29nbml0b0NsaWVudCA9IG5ldyBDb2duaXRvSWRlbnRpdHlQcm92aWRlckNsaWVudCh7IFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxufSk7XHJcblxyXG5pbnRlcmZhY2UgQXV0b0xvZ2luUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIEF1dG9Mb2dpblJlc3BvbnNlIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gIHVzZXI6IHtcclxuICAgIHVzZXJJZDogc3RyaW5nO1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdBdXRvLWxvZ2luIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IEF1dG9Mb2dpblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gICAgaWYgKCFyZXF1ZXN0LmVtYWlsKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRU1BSUwnLCAnRW1haWwgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnQXV0by1sb2dnaW5nIGluIHVzZXInLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgd2l0aCBDb2duaXRvIHVzaW5nIHRoZSBmaXhlZCB0ZXN0IHBhc3N3b3JkXHJcbiAgICAvLyBUaGlzIHBhc3N3b3JkIHdhcyB1c2VkIGR1cmluZyByZWdpc3RyYXRpb24gYW5kIE9UUCB2ZXJpZmljYXRpb25cclxuICAgIGNvbnN0IHRlbXBQYXNzd29yZCA9ICdUZXN0UGFzczEyMyFAIyc7XHJcblxyXG4gICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNvZ25pdG9DbGllbnQuc2VuZChuZXcgQWRtaW5Jbml0aWF0ZUF1dGhDb21tYW5kKHtcclxuICAgICAgVXNlclBvb2xJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19VU0VSX1BPT0xfSUQhLFxyXG4gICAgICBDbGllbnRJZDogcHJvY2Vzcy5lbnYuQ09HTklUT19DTElFTlRfSUQhLFxyXG4gICAgICBBdXRoRmxvdzogQXV0aEZsb3dUeXBlLkFETUlOX05PX1NSUF9BVVRILFxyXG4gICAgICBBdXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgIFVTRVJOQU1FOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIFBBU1NXT1JEOiB0ZW1wUGFzc3dvcmQsXHJcbiAgICAgIH0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgYXV0aGVudGljYXRpb24gd2FzIHN1Y2Nlc3NmdWxcclxuICAgIGlmICghYXV0aFJlc3VsdC5BdXRoZW50aWNhdGlvblJlc3VsdCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCAtIG5vIHRva2VucyByZXR1cm5lZCBmcm9tIENvZ25pdG8nKTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnQXV0by1sb2dpbiBzdWNjZXNzZnVsJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXh0cmFjdCB1c2VyIElEIGZyb20gdGhlIGFjY2VzcyB0b2tlbiAoc3ViIGNsYWltKVxyXG4gICAgY29uc3QgYWNjZXNzVG9rZW5QYXJ0cyA9IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLnNwbGl0KCcuJyk7XHJcbiAgICBsZXQgdXNlcklkID0gcmVxdWVzdC5lbWFpbC5zcGxpdCgnQCcpWzBdO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShhY2Nlc3NUb2tlblBhcnRzWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XHJcbiAgICAgIHVzZXJJZCA9IHBheWxvYWQuc3ViIHx8IHVzZXJJZDtcclxuICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0NvdWxkIG5vdCBleHRyYWN0IHVzZXJJZCBmcm9tIHRva2VuJywgeyBjb3JyZWxhdGlvbklkIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBBdXRvTG9naW5SZXNwb25zZSA9IHtcclxuICAgICAgYWNjZXNzVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuQWNjZXNzVG9rZW4hLFxyXG4gICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXN1bHQuQXV0aGVudGljYXRpb25SZXN1bHQuUmVmcmVzaFRva2VuISxcclxuICAgICAgZXhwaXJlc0luOiBhdXRoUmVzdWx0LkF1dGhlbnRpY2F0aW9uUmVzdWx0LkV4cGlyZXNJbiB8fCAzNjAwLFxyXG4gICAgICB1c2VyOiB7XHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIG5hbWU6ICdVc2VyJ1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdBdXRvLWxvZ2luIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUT19MT0dJTl9GQUlMRUQnLCBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gYXV0by1sb2dpbicsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==