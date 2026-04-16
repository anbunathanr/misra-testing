"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const unified_auth_service_1 = require("../../services/auth/unified-auth-service");
const cors_1 = require("../../utils/cors");
const validation_1 = require("../../utils/validation");
const auth_error_handler_1 = require("../../utils/auth-error-handler");
const handler = async (event) => {
    console.log('Complete OTP setup request:', JSON.stringify(event, null, 2));
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
    try {
        // Validate required fields
        if (!request.email || !request.otpCode) {
            return {
                statusCode: 400,
                headers: cors_1.corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'MISSING_FIELDS',
                        message: 'Email and OTP code are required'
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
        // Validate OTP code format (should be 6 digits)
        if (!/^\d{6}$/.test(request.otpCode.trim())) {
            return {
                statusCode: 400,
                headers: cors_1.corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_OTP_FORMAT',
                        message: 'OTP code must be 6 digits'
                    }
                })
            };
        }
        // Initialize authentication service
        const authService = new unified_auth_service_1.UnifiedAuthService();
        // Complete OTP setup and establish session
        const result = await authService.completeOTPSetup(request.email, request.otpCode.trim());
        const response = {
            success: true,
            message: result.message,
            userSession: result.user,
            tokens: {
                accessToken: result.accessToken,
                refreshToken: result.refreshToken,
                expiresIn: result.expiresIn
            }
        };
        console.log('OTP setup completed successfully for user:', result.user.userId);
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        console.error('OTP setup completion failed:', error);
        // Use the error handler to transform and log the error
        const authError = auth_error_handler_1.authErrorHandler.handleError(error, {
            operation: 'complete-otp-setup',
            email: request.email,
            step: 'otp_setup'
        });
        // Return the transformed error response
        return auth_error_handler_1.authErrorHandler.toAPIResponse(authError);
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGxldGUtb3RwLXNldHVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29tcGxldGUtb3RwLXNldHVwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1GQUE4RTtBQUM5RSwyQ0FBK0M7QUFDL0MsdURBQXVEO0FBQ3ZELHVFQUFrRTtBQXdCM0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUUzRSxxQkFBcUI7SUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoQixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsa0JBQVc7WUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsY0FBYztvQkFDcEIsT0FBTyxFQUFFLDBCQUEwQjtpQkFDcEM7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBNEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFaEUsSUFBSSxDQUFDO1FBQ0gsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3ZDLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLGtCQUFXO2dCQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxnQkFBZ0I7d0JBQ3RCLE9BQU8sRUFBRSxpQ0FBaUM7cUJBQzNDO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELHdCQUF3QjtRQUN4QixJQUFJLENBQUMsSUFBQSwwQkFBYSxFQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xDLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLGtCQUFXO2dCQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxlQUFlO3dCQUNyQixPQUFPLEVBQUUsc0NBQXNDO3FCQUNoRDtpQkFDRixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsa0JBQVc7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLG9CQUFvQjt3QkFDMUIsT0FBTyxFQUFFLDJCQUEyQjtxQkFDckM7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsb0NBQW9DO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUkseUNBQWtCLEVBQUUsQ0FBQztRQUU3QywyQ0FBMkM7UUFDM0MsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFekYsTUFBTSxRQUFRLEdBQTZCO1lBQ3pDLE9BQU8sRUFBRSxJQUFJO1lBQ2IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQ3ZCLFdBQVcsRUFBRSxNQUFNLENBQUMsSUFBSTtZQUN4QixNQUFNLEVBQUU7Z0JBQ04sV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO2dCQUMvQixZQUFZLEVBQUUsTUFBTSxDQUFDLFlBQVk7Z0JBQ2pDLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUzthQUM1QjtTQUNGLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLDRDQUE0QyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFOUUsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLGtCQUFXO1lBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDO0lBRUosQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVyRCx1REFBdUQ7UUFDdkQsTUFBTSxTQUFTLEdBQUcscUNBQWdCLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRTtZQUNwRCxTQUFTLEVBQUUsb0JBQW9CO1lBQy9CLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixJQUFJLEVBQUUsV0FBVztTQUNsQixDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsT0FBTyxxQ0FBZ0IsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkQsQ0FBQztBQUNILENBQUMsQ0FBQztBQXBHVyxRQUFBLE9BQU8sV0FvR2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBVbmlmaWVkQXV0aFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL3VuaWZpZWQtYXV0aC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgdmFsaWRhdGVFbWFpbCB9IGZyb20gJy4uLy4uL3V0aWxzL3ZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyBhdXRoRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC1lcnJvci1oYW5kbGVyJztcclxuXHJcbmludGVyZmFjZSBDb21wbGV0ZU9UUFNldHVwUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBvdHBDb2RlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBDb21wbGV0ZU9UUFNldHVwUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIHVzZXJTZXNzaW9uOiB7XHJcbiAgICB1c2VySWQ6IHN0cmluZztcclxuICAgIGVtYWlsOiBzdHJpbmc7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gICAgcm9sZTogc3RyaW5nO1xyXG4gIH07XHJcbiAgdG9rZW5zOiB7XHJcbiAgICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gICAgcmVmcmVzaFRva2VuOiBzdHJpbmc7XHJcbiAgICBleHBpcmVzSW46IG51bWJlcjtcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdDb21wbGV0ZSBPVFAgc2V0dXAgcmVxdWVzdDonLCBKU09OLnN0cmluZ2lmeShldmVudCwgbnVsbCwgMikpO1xyXG5cclxuICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogJ01JU1NJTkdfQk9EWScsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBjb25zdCByZXF1ZXN0OiBDb21wbGV0ZU9UUFNldHVwUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCB8fCAhcmVxdWVzdC5vdHBDb2RlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX0ZJRUxEUycsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCBhbmQgT1RQIGNvZGUgYXJlIHJlcXVpcmVkJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfRU1BSUwnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgT1RQIGNvZGUgZm9ybWF0IChzaG91bGQgYmUgNiBkaWdpdHMpXHJcbiAgICBpZiAoIS9eXFxkezZ9JC8udGVzdChyZXF1ZXN0Lm90cENvZGUudHJpbSgpKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9PVFBfRk9STUFUJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ09UUCBjb2RlIG11c3QgYmUgNiBkaWdpdHMnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJbml0aWFsaXplIGF1dGhlbnRpY2F0aW9uIHNlcnZpY2VcclxuICAgIGNvbnN0IGF1dGhTZXJ2aWNlID0gbmV3IFVuaWZpZWRBdXRoU2VydmljZSgpO1xyXG5cclxuICAgIC8vIENvbXBsZXRlIE9UUCBzZXR1cCBhbmQgZXN0YWJsaXNoIHNlc3Npb25cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGF1dGhTZXJ2aWNlLmNvbXBsZXRlT1RQU2V0dXAocmVxdWVzdC5lbWFpbCwgcmVxdWVzdC5vdHBDb2RlLnRyaW0oKSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IENvbXBsZXRlT1RQU2V0dXBSZXNwb25zZSA9IHtcclxuICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgbWVzc2FnZTogcmVzdWx0Lm1lc3NhZ2UsXHJcbiAgICAgIHVzZXJTZXNzaW9uOiByZXN1bHQudXNlcixcclxuICAgICAgdG9rZW5zOiB7XHJcbiAgICAgICAgYWNjZXNzVG9rZW46IHJlc3VsdC5hY2Nlc3NUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IHJlc3VsdC5yZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgZXhwaXJlc0luOiByZXN1bHQuZXhwaXJlc0luXHJcbiAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgY29uc29sZS5sb2coJ09UUCBzZXR1cCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IGZvciB1c2VyOicsIHJlc3VsdC51c2VyLnVzZXJJZCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdPVFAgc2V0dXAgY29tcGxldGlvbiBmYWlsZWQ6JywgZXJyb3IpO1xyXG5cclxuICAgIC8vIFVzZSB0aGUgZXJyb3IgaGFuZGxlciB0byB0cmFuc2Zvcm0gYW5kIGxvZyB0aGUgZXJyb3JcclxuICAgIGNvbnN0IGF1dGhFcnJvciA9IGF1dGhFcnJvckhhbmRsZXIuaGFuZGxlRXJyb3IoZXJyb3IsIHtcclxuICAgICAgb3BlcmF0aW9uOiAnY29tcGxldGUtb3RwLXNldHVwJyxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgIHN0ZXA6ICdvdHBfc2V0dXAnXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZXR1cm4gdGhlIHRyYW5zZm9ybWVkIGVycm9yIHJlc3BvbnNlXHJcbiAgICByZXR1cm4gYXV0aEVycm9ySGFuZGxlci50b0FQSVJlc3BvbnNlKGF1dGhFcnJvcik7XHJcbiAgfVxyXG59OyJdfQ==