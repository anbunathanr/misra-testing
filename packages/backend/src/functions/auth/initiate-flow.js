"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const cognito_totp_service_1 = require("../../services/auth/cognito-totp-service");
const cors_1 = require("../../utils/cors");
const validation_1 = require("../../utils/validation");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('InitiateFlow');
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    logger.info('Initiate authentication flow request:', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers: cors_1.corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'MISSING_BODY',
                        message: 'Request body is required'
                    }
                })
            };
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.email) {
            return {
                statusCode: 400,
                headers: cors_1.corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'MISSING_EMAIL',
                        message: 'Email is required'
                    }
                })
            };
        }
        // Validate email format
        if (!(0, validation_1.validateEmail)(request.email)) {
            return {
                statusCode: 400,
                headers: cors_1.corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_EMAIL',
                        message: 'Please provide a valid email address'
                    }
                })
            };
        }
        // Initialize Cognito TOTP service
        const cognitoTOTPService = new cognito_totp_service_1.CognitoTOTPService();
        // Check if user exists
        const userExists = await cognitoTOTPService.userExists(request.email);
        let response;
        if (!userExists) {
            // Create new user with MFA enabled for autonomous workflow
            logger.info('Creating new user with MFA enabled', {
                correlationId,
                email: request.email
            });
            const createResult = await cognitoTOTPService.createUserWithMFA(request.email, request.name);
            response = {
                state: 'user_created',
                requiresRegistration: false, // Already created
                requiresMFASetup: true, // Will need MFA setup
                message: 'User created successfully. MFA setup required.',
                tempPassword: createResult.tempPassword
            };
        }
        else {
            // User exists, they can proceed to login
            logger.info('User exists, ready for authentication', {
                correlationId,
                email: request.email
            });
            response = {
                state: 'user_exists',
                requiresRegistration: false,
                requiresMFASetup: false, // Will be determined during auth
                message: 'User exists. Ready for authentication.'
            };
        }
        logger.info('Authentication flow initiated successfully:', {
            correlationId,
            email: request.email,
            state: response.state
        });
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('Authentication flow initiation failed:', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        return {
            statusCode: 500,
            headers: cors_1.corsHeaders,
            body: JSON.stringify({
                error: {
                    code: 'FLOW_INITIATION_FAILED',
                    message: error.message || 'Failed to initiate authentication flow',
                    timestamp: new Date().toISOString(),
                    requestId: correlationId
                }
            })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdGlhdGUtZmxvdy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRpYXRlLWZsb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUZBQThFO0FBQzlFLDJDQUErQztBQUMvQyx1REFBdUQ7QUFDdkQsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxjQUFjLENBQUMsQ0FBQztBQWVyQyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsTUFBTSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRTtRQUNuRCxhQUFhO1FBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1FBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtLQUN6QixDQUFDLENBQUM7SUFFSCxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxrQkFBVztnQkFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCxJQUFJLEVBQUUsY0FBYzt3QkFDcEIsT0FBTyxFQUFFLDBCQUEwQjtxQkFDcEM7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQXdCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTVELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFD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O29CQUNMLElBQUksRUFBRSx3QkFBd0I7b0JBQzlCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxJQUFJLHdDQUF3QztvQkFDbEUsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO29CQUNuQyxTQUFTLEVBQUUsYUFBYTtpQkFDekI7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFoSVcsUUFBQSxPQUFPLFdBZ0lsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29nbml0b1RPVFBTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXV0aC9jb2duaXRvLXRvdHAtc2VydmljZSc7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IHZhbGlkYXRlRW1haWwgfSBmcm9tICcuLi8uLi91dGlscy92YWxpZGF0aW9uJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignSW5pdGlhdGVGbG93Jyk7XHJcblxyXG5pbnRlcmZhY2UgSW5pdGlhdGVGbG93UmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBuYW1lPzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgSW5pdGlhdGVGbG93UmVzcG9uc2Uge1xyXG4gIHN0YXRlOiBzdHJpbmc7XHJcbiAgcmVxdWlyZXNSZWdpc3RyYXRpb246IGJvb2xlYW47XHJcbiAgcmVxdWlyZXNNRkFTZXR1cDogYm9vbGVhbjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgdGVtcFBhc3N3b3JkPzogc3RyaW5nOyAvLyBGb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdJbml0aWF0ZSBhdXRoZW50aWNhdGlvbiBmbG93IHJlcXVlc3Q6Jywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX0JPRFknLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogSW5pdGlhdGVGbG93UmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ01JU1NJTkdfRU1BSUwnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnRW1haWwgaXMgcmVxdWlyZWQnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBlbWFpbCBmb3JtYXRcclxuICAgIGlmICghdmFsaWRhdGVFbWFpbChyZXF1ZXN0LmVtYWlsKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9FTUFJTCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgcHJvdmlkZSBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJbml0aWFsaXplIENvZ25pdG8gVE9UUCBzZXJ2aWNlXHJcbiAgICBjb25zdCBjb2duaXRvVE9UUFNlcnZpY2UgPSBuZXcgQ29nbml0b1RPVFBTZXJ2aWNlKCk7XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBleGlzdHNcclxuICAgIGNvbnN0IHVzZXJFeGlzdHMgPSBhd2FpdCBjb2duaXRvVE9UUFNlcnZpY2UudXNlckV4aXN0cyhyZXF1ZXN0LmVtYWlsKTtcclxuXHJcbiAgICBsZXQgcmVzcG9uc2U6IEluaXRpYXRlRmxvd1Jlc3BvbnNlO1xyXG5cclxuICAgIGlmICghdXNlckV4aXN0cykge1xyXG4gICAgICAvLyBDcmVhdGUgbmV3IHVzZXIgd2l0aCBNRkEgZW5hYmxlZCBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gICAgICBsb2dnZXIuaW5mbygnQ3JlYXRpbmcgbmV3IHVzZXIgd2l0aCBNRkEgZW5hYmxlZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgY3JlYXRlUmVzdWx0ID0gYXdhaXQgY29nbml0b1RPVFBTZXJ2aWNlLmNyZWF0ZVVzZXJXaXRoTUZBKFxyXG4gICAgICAgIHJlcXVlc3QuZW1haWwsIFxyXG4gICAgICAgIHJlcXVlc3QubmFtZVxyXG4gICAgICApO1xyXG5cclxuICAgICAgcmVzcG9uc2UgPSB7XHJcbiAgICAgICAgc3RhdGU6ICd1c2VyX2NyZWF0ZWQnLFxyXG4gICAgICAgIHJlcXVpcmVzUmVnaXN0cmF0aW9uOiBmYWxzZSwgLy8gQWxyZWFkeSBjcmVhdGVkXHJcbiAgICAgICAgcmVxdWlyZXNNRkFTZXR1cDogdHJ1ZSwgLy8gV2lsbCBuZWVkIE1GQSBzZXR1cFxyXG4gICAgICAgIG1lc3NhZ2U6ICdVc2VyIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5LiBNRkEgc2V0dXAgcmVxdWlyZWQuJyxcclxuICAgICAgICB0ZW1wUGFzc3dvcmQ6IGNyZWF0ZVJlc3VsdC50ZW1wUGFzc3dvcmRcclxuICAgICAgfTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIFVzZXIgZXhpc3RzLCB0aGV5IGNhbiBwcm9jZWVkIHRvIGxvZ2luXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVc2VyIGV4aXN0cywgcmVhZHkgZm9yIGF1dGhlbnRpY2F0aW9uJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXNwb25zZSA9IHtcclxuICAgICAgICBzdGF0ZTogJ3VzZXJfZXhpc3RzJyxcclxuICAgICAgICByZXF1aXJlc1JlZ2lzdHJhdGlvbjogZmFsc2UsXHJcbiAgICAgICAgcmVxdWlyZXNNRkFTZXR1cDogZmFsc2UsIC8vIFdpbGwgYmUgZGV0ZXJtaW5lZCBkdXJpbmcgYXV0aFxyXG4gICAgICAgIG1lc3NhZ2U6ICdVc2VyIGV4aXN0cy4gUmVhZHkgZm9yIGF1dGhlbnRpY2F0aW9uLidcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBsb2dnZXIuaW5mbygnQXV0aGVudGljYXRpb24gZmxvdyBpbml0aWF0ZWQgc3VjY2Vzc2Z1bGx5OicsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHN0YXRlOiByZXNwb25zZS5zdGF0ZVxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0F1dGhlbnRpY2F0aW9uIGZsb3cgaW5pdGlhdGlvbiBmYWlsZWQ6Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdGTE9XX0lOSVRJQVRJT05fRkFJTEVEJyxcclxuICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBpbml0aWF0ZSBhdXRoZW50aWNhdGlvbiBmbG93JyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgcmVxdWVzdElkOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcbn07Il19