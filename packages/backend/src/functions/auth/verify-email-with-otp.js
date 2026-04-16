"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const unified_auth_service_1 = require("../../services/auth/unified-auth-service");
const cors_1 = require("../../utils/cors");
const validation_1 = require("../../utils/validation");
const auth_error_handler_1 = require("../../utils/auth-error-handler");
const handler = async (event) => {
    console.log('Verify email with OTP request:', JSON.stringify(event, null, 2));
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
        if (!request.email || !request.confirmationCode) {
            return {
                statusCode: 400,
                headers: cors_1.corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'MISSING_FIELDS',
                        message: 'Email and confirmation code are required'
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
        // Validate confirmation code format (should be 6 digits)
        if (!/^\d{6}$/.test(request.confirmationCode.trim())) {
            return {
                statusCode: 400,
                headers: cors_1.corsHeaders,
                body: JSON.stringify({
                    error: {
                        code: 'INVALID_CODE_FORMAT',
                        message: 'Confirmation code must be 6 digits'
                    }
                })
            };
        }
        // Initialize authentication service
        const authService = new unified_auth_service_1.UnifiedAuthService();
        // Handle email verification with OTP setup
        const result = await authService.handleEmailVerificationComplete(request.email, request.confirmationCode.trim());
        const response = {
            success: true,
            message: result.message,
            otpSetup: result.otpSetup,
            nextStep: result.nextStep
        };
        console.log('Email verification with OTP setup completed successfully');
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        console.error('Email verification with OTP setup failed:', error);
        // Use the error handler to transform and log the error
        const authError = auth_error_handler_1.authErrorHandler.handleError(error, {
            operation: 'verify-email-with-otp',
            email: request.email,
            step: 'email_verification'
        });
        // Return the transformed error response
        return auth_error_handler_1.authErrorHandler.toAPIResponse(authError);
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LWVtYWlsLXdpdGgtb3RwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyaWZ5LWVtYWlsLXdpdGgtb3RwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1GQUE4RTtBQUM5RSwyQ0FBK0M7QUFDL0MsdURBQXVEO0FBQ3ZELHVFQUFrRTtBQW9CM0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU5RSxxQkFBcUI7SUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoQixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsa0JBQVc7WUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsY0FBYztvQkFDcEIsT0FBTyxFQUFFLDBCQUEwQjtpQkFDcEM7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBOEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbEUsSUFBSSxDQUFDO1FBQ0gsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDaEQsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsa0JBQVc7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGdCQUFnQjt3QkFDdEIsT0FBTyxFQUFFLDBDQUEwQztxQkFDcEQ7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxJQUFBLDBCQUFhLEVBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsa0JBQVc7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGVBQWU7d0JBQ3JCLE9BQU8sRUFBRSxzQ0FBc0M7cUJBQ2hEO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLGtCQUFXO2dCQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxxQkFBcUI7d0JBQzNCLE9BQU8sRUFBRSxvQ0FBb0M7cUJBQzlDO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELG9DQUFvQztRQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLHlDQUFrQixFQUFFLENBQUM7UUFFN0MsMkNBQTJDO1FBQzNDLE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLCtCQUErQixDQUM5RCxPQUFPLENBQUMsS0FBSyxFQUNiLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FDaEMsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUErQjtZQUMzQyxPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztZQUN2QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDekIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRO1NBQzFCLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLDBEQUEwRCxDQUFDLENBQUM7UUFFeEUsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLGtCQUFXO1lBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDO0lBRUosQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVsRSx1REFBdUQ7UUFDdkQsTUFBTSxTQUFTLEdBQUcscUNBQWdCLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRTtZQUNwRCxTQUFTLEVBQUUsdUJBQXVCO1lBQ2xDLEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSztZQUNwQixJQUFJLEVBQUUsb0JBQW9CO1NBQzNCLENBQUMsQ0FBQztRQUVILHdDQUF3QztRQUN4QyxPQUFPLHFDQUFnQixDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUNuRCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBbkdXLFFBQUEsT0FBTyxXQW1HbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFVuaWZpZWRBdXRoU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvdW5pZmllZC1hdXRoLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZUVtYWlsIH0gZnJvbSAnLi4vLi4vdXRpbHMvdmFsaWRhdGlvbic7XHJcbmltcG9ydCB7IGF1dGhFcnJvckhhbmRsZXIgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLWVycm9yLWhhbmRsZXInO1xyXG5cclxuaW50ZXJmYWNlIFZlcmlmeUVtYWlsV2l0aE9UUFJlcXVlc3Qge1xyXG4gIGVtYWlsOiBzdHJpbmc7XHJcbiAgY29uZmlybWF0aW9uQ29kZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVmVyaWZ5RW1haWxXaXRoT1RQUmVzcG9uc2Uge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIG90cFNldHVwOiB7XHJcbiAgICBzZWNyZXQ6IHN0cmluZztcclxuICAgIHFyQ29kZVVybDogc3RyaW5nO1xyXG4gICAgYmFja3VwQ29kZXM6IHN0cmluZ1tdO1xyXG4gICAgaXNzdWVyOiBzdHJpbmc7XHJcbiAgICBhY2NvdW50TmFtZTogc3RyaW5nO1xyXG4gIH07XHJcbiAgbmV4dFN0ZXA6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnVmVyaWZ5IGVtYWlsIHdpdGggT1RQIHJlcXVlc3Q6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX0JPRFknLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCdcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVxdWVzdDogVmVyaWZ5RW1haWxXaXRoT1RQUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCB8fCAhcmVxdWVzdC5jb25maXJtYXRpb25Db2RlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX0ZJRUxEUycsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCBhbmQgY29uZmlybWF0aW9uIGNvZGUgYXJlIHJlcXVpcmVkJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfRU1BSUwnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgY29uZmlybWF0aW9uIGNvZGUgZm9ybWF0IChzaG91bGQgYmUgNiBkaWdpdHMpXHJcbiAgICBpZiAoIS9eXFxkezZ9JC8udGVzdChyZXF1ZXN0LmNvbmZpcm1hdGlvbkNvZGUudHJpbSgpKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9DT0RFX0ZPUk1BVCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdDb25maXJtYXRpb24gY29kZSBtdXN0IGJlIDYgZGlnaXRzJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBhdXRoZW50aWNhdGlvbiBzZXJ2aWNlXHJcbiAgICBjb25zdCBhdXRoU2VydmljZSA9IG5ldyBVbmlmaWVkQXV0aFNlcnZpY2UoKTtcclxuXHJcbiAgICAvLyBIYW5kbGUgZW1haWwgdmVyaWZpY2F0aW9uIHdpdGggT1RQIHNldHVwXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS5oYW5kbGVFbWFpbFZlcmlmaWNhdGlvbkNvbXBsZXRlKFxyXG4gICAgICByZXF1ZXN0LmVtYWlsLCBcclxuICAgICAgcmVxdWVzdC5jb25maXJtYXRpb25Db2RlLnRyaW0oKVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogVmVyaWZ5RW1haWxXaXRoT1RQUmVzcG9uc2UgPSB7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIG1lc3NhZ2U6IHJlc3VsdC5tZXNzYWdlLFxyXG4gICAgICBvdHBTZXR1cDogcmVzdWx0Lm90cFNldHVwLFxyXG4gICAgICBuZXh0U3RlcDogcmVzdWx0Lm5leHRTdGVwXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUubG9nKCdFbWFpbCB2ZXJpZmljYXRpb24gd2l0aCBPVFAgc2V0dXAgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgY29uc29sZS5lcnJvcignRW1haWwgdmVyaWZpY2F0aW9uIHdpdGggT1RQIHNldHVwIGZhaWxlZDonLCBlcnJvcik7XHJcblxyXG4gICAgLy8gVXNlIHRoZSBlcnJvciBoYW5kbGVyIHRvIHRyYW5zZm9ybSBhbmQgbG9nIHRoZSBlcnJvclxyXG4gICAgY29uc3QgYXV0aEVycm9yID0gYXV0aEVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciwge1xyXG4gICAgICBvcGVyYXRpb246ICd2ZXJpZnktZW1haWwtd2l0aC1vdHAnLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgc3RlcDogJ2VtYWlsX3ZlcmlmaWNhdGlvbidcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJldHVybiB0aGUgdHJhbnNmb3JtZWQgZXJyb3IgcmVzcG9uc2VcclxuICAgIHJldHVybiBhdXRoRXJyb3JIYW5kbGVyLnRvQVBJUmVzcG9uc2UoYXV0aEVycm9yKTtcclxuICB9XHJcbn07Il19