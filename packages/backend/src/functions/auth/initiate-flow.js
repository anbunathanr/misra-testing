"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const unified_auth_service_1 = require("../../services/auth/unified-auth-service");
const cors_1 = require("../../utils/cors");
const validation_1 = require("../../utils/validation");
const auth_error_handler_1 = require("../../utils/auth-error-handler");
const handler = async (event) => {
    console.log('Initiate authentication flow request:', JSON.stringify(event, null, 2));
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
        // Initialize authentication service
        const authService = new unified_auth_service_1.UnifiedAuthService();
        // Initiate authentication flow
        const result = await authService.initiateAuthenticationFlow(request.email, request.name);
        const response = {
            state: result.state,
            requiresEmailVerification: result.requiresEmailVerification,
            requiresOTPSetup: result.requiresOTPSetup,
            message: result.message
        };
        console.log('Authentication flow initiated successfully:', response);
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        console.error('Authentication flow initiation failed:', error);
        // Use the error handler to transform and log the error
        const authError = auth_error_handler_1.authErrorHandler.handleError(error, {
            operation: 'initiate-flow',
            email: event.body ? JSON.parse(event.body).email : undefined,
            step: 'flow_initiation'
        });
        // Return the transformed error response
        return auth_error_handler_1.authErrorHandler.toAPIResponse(authError);
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdGlhdGUtZmxvdy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRpYXRlLWZsb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUZBQThFO0FBQzlFLDJDQUErQztBQUMvQyx1REFBdUQ7QUFDdkQsdUVBQWtFO0FBYzNELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFckYsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsa0JBQVc7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGNBQWM7d0JBQ3BCLE9BQU8sRUFBRSwwQkFBMEI7cUJBQ3BDO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUF3QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU1RCwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxrQkFBVztnQkFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCxJQUFJLEVBQUUsZUFBZTt3QkFDckIsT0FBTyxFQUFFLG1CQUFtQjtxQkFDN0I7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxJQUFBLDBCQUFhLEVBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsa0JBQVc7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGVBQWU7d0JBQ3JCLE9BQU8sRUFBRSxzQ0FBc0M7cUJBQ2hEO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELG9DQUFvQztRQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLHlDQUFrQixFQUFFLENBQUM7UUFFN0MsK0JBQStCO1FBQy9CLE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRXpGLE1BQU0sUUFBUSxHQUF5QjtZQUNyQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7WUFDbkIseUJBQXlCLEVBQUUsTUFBTSxDQUFDLHlCQUF5QjtZQUMzRCxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsZ0JBQWdCO1lBQ3pDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztTQUN4QixDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsa0JBQVc7WUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFFSixDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRS9ELHVEQUF1RDtRQUN2RCxNQUFNLFNBQVMsR0FBRyxxQ0FBZ0IsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFO1lBQ3BELFNBQVMsRUFBRSxlQUFlO1lBQzFCLEtBQUssRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDNUQsSUFBSSxFQUFFLGlCQUFpQjtTQUN4QixDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsT0FBTyxxQ0FBZ0IsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkQsQ0FBQztBQUNILENBQUMsQ0FBQztBQWxGVyxRQUFBLE9BQU8sV0FrRmxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBVbmlmaWVkQXV0aFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL3VuaWZpZWQtYXV0aC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgdmFsaWRhdGVFbWFpbCB9IGZyb20gJy4uLy4uL3V0aWxzL3ZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyBhdXRoRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC1lcnJvci1oYW5kbGVyJztcclxuXHJcbmludGVyZmFjZSBJbml0aWF0ZUZsb3dSZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIG5hbWU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBJbml0aWF0ZUZsb3dSZXNwb25zZSB7XHJcbiAgc3RhdGU6IHN0cmluZztcclxuICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiBib29sZWFuO1xyXG4gIHJlcXVpcmVzT1RQU2V0dXA6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdJbml0aWF0ZSBhdXRoZW50aWNhdGlvbiBmbG93IHJlcXVlc3Q6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX0JPRFknLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogSW5pdGlhdGVGbG93UmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ01JU1NJTkdfRU1BSUwnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnRW1haWwgaXMgcmVxdWlyZWQnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBlbWFpbCBmb3JtYXRcclxuICAgIGlmICghdmFsaWRhdGVFbWFpbChyZXF1ZXN0LmVtYWlsKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9FTUFJTCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgcHJvdmlkZSBhIHZhbGlkIGVtYWlsIGFkZHJlc3MnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJbml0aWFsaXplIGF1dGhlbnRpY2F0aW9uIHNlcnZpY2VcclxuICAgIGNvbnN0IGF1dGhTZXJ2aWNlID0gbmV3IFVuaWZpZWRBdXRoU2VydmljZSgpO1xyXG5cclxuICAgIC8vIEluaXRpYXRlIGF1dGhlbnRpY2F0aW9uIGZsb3dcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGF1dGhTZXJ2aWNlLmluaXRpYXRlQXV0aGVudGljYXRpb25GbG93KHJlcXVlc3QuZW1haWwsIHJlcXVlc3QubmFtZSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEluaXRpYXRlRmxvd1Jlc3BvbnNlID0ge1xyXG4gICAgICBzdGF0ZTogcmVzdWx0LnN0YXRlLFxyXG4gICAgICByZXF1aXJlc0VtYWlsVmVyaWZpY2F0aW9uOiByZXN1bHQucmVxdWlyZXNFbWFpbFZlcmlmaWNhdGlvbixcclxuICAgICAgcmVxdWlyZXNPVFBTZXR1cDogcmVzdWx0LnJlcXVpcmVzT1RQU2V0dXAsXHJcbiAgICAgIG1lc3NhZ2U6IHJlc3VsdC5tZXNzYWdlXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdBdXRoZW50aWNhdGlvbiBmbG93IGluaXRpYXRlZCBzdWNjZXNzZnVsbHk6JywgcmVzcG9uc2UpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgY29uc29sZS5lcnJvcignQXV0aGVudGljYXRpb24gZmxvdyBpbml0aWF0aW9uIGZhaWxlZDonLCBlcnJvcik7XHJcblxyXG4gICAgLy8gVXNlIHRoZSBlcnJvciBoYW5kbGVyIHRvIHRyYW5zZm9ybSBhbmQgbG9nIHRoZSBlcnJvclxyXG4gICAgY29uc3QgYXV0aEVycm9yID0gYXV0aEVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICBvcGVyYXRpb246ICdpbml0aWF0ZS1mbG93JyxcclxuICAgICAgZW1haWw6IGV2ZW50LmJvZHkgPyBKU09OLnBhcnNlKGV2ZW50LmJvZHkpLmVtYWlsIDogdW5kZWZpbmVkLFxyXG4gICAgICBzdGVwOiAnZmxvd19pbml0aWF0aW9uJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSB0cmFuc2Zvcm1lZCBlcnJvciByZXNwb25zZVxyXG4gICAgcmV0dXJuIGF1dGhFcnJvckhhbmRsZXIudG9BUElSZXNwb25zZShhdXRoRXJyb3IpO1xyXG4gIH1cclxufTsiXX0=