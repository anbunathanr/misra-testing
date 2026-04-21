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
            temporaryTokens: result.temporaryTokens,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LWVtYWlsLXdpdGgtb3RwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyaWZ5LWVtYWlsLXdpdGgtb3RwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG1GQUE4RTtBQUM5RSwyQ0FBK0M7QUFDL0MsdURBQXVEO0FBQ3ZELHVFQUFrRTtBQTBCM0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUU5RSxxQkFBcUI7SUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNoQixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsa0JBQVc7WUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsY0FBYztvQkFDcEIsT0FBTyxFQUFFLDBCQUEwQjtpQkFDcEM7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBOEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFbEUsSUFBSSxDQUFDO1FBQ0gsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDaEQsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsa0JBQVc7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGdCQUFnQjt3QkFDdEIsT0FBTyxFQUFFLDBDQUEwQztxQkFDcEQ7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxJQUFBLDBCQUFhLEVBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDbEMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsa0JBQVc7Z0JBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUU7d0JBQ0wsSUFBSSxFQUFFLGVBQWU7d0JBQ3JCLE9BQU8sRUFBRSxzQ0FBc0M7cUJBQ2hEO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELHlEQUF5RDtRQUN6RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ3JELE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLGtCQUFXO2dCQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxxQkFBcUI7d0JBQzNCLE9BQU8sRUFBRSxvQ0FBb0M7cUJBQzlDO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELG9DQUFvQztRQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLHlDQUFrQixFQUFFLENBQUM7UUFFN0MsMkNBQTJDO1FBQzNDLE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLCtCQUErQixDQUM5RCxPQUFPLENBQUMsS0FBSyxFQUNiLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FDaEMsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUErQjtZQUMzQyxPQUFPLEVBQUUsSUFBSTtZQUNiLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztZQUN2QixRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDekIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlO1lBQ3ZDLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtTQUMxQixDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQywwREFBMEQsQ0FBQyxDQUFDO1FBRXhFLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxrQkFBVztZQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUVKLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFbEUsdURBQXVEO1FBQ3ZELE1BQU0sU0FBUyxHQUFHLHFDQUFnQixDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUU7WUFDcEQsU0FBUyxFQUFFLHVCQUF1QjtZQUNsQyxLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7WUFDcEIsSUFBSSxFQUFFLG9CQUFvQjtTQUMzQixDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsT0FBTyxxQ0FBZ0IsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbkQsQ0FBQztBQUNILENBQUMsQ0FBQztBQXBHVyxRQUFBLE9BQU8sV0FvR2xCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBVbmlmaWVkQXV0aFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL3VuaWZpZWQtYXV0aC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgdmFsaWRhdGVFbWFpbCB9IGZyb20gJy4uLy4uL3V0aWxzL3ZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyBhdXRoRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC1lcnJvci1oYW5kbGVyJztcclxuXHJcbmludGVyZmFjZSBWZXJpZnlFbWFpbFdpdGhPVFBSZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIGNvbmZpcm1hdGlvbkNvZGU6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFZlcmlmeUVtYWlsV2l0aE9UUFJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBvdHBTZXR1cDoge1xyXG4gICAgc2VjcmV0OiBzdHJpbmc7XHJcbiAgICBxckNvZGVVcmw6IHN0cmluZztcclxuICAgIGJhY2t1cENvZGVzOiBzdHJpbmdbXTtcclxuICAgIGlzc3Vlcjogc3RyaW5nO1xyXG4gICAgYWNjb3VudE5hbWU6IHN0cmluZztcclxuICB9O1xyXG4gIHRlbXBvcmFyeVRva2Vucz86IHtcclxuICAgIGFjY2Vzc1Rva2VuOiBzdHJpbmc7XHJcbiAgICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICAgIGV4cGlyZXNJbjogbnVtYmVyO1xyXG4gICAgc2NvcGU6ICd0ZW1wX2F1dGhlbnRpY2F0ZWQnO1xyXG4gIH07XHJcbiAgbmV4dFN0ZXA6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnVmVyaWZ5IGVtYWlsIHdpdGggT1RQIHJlcXVlc3Q6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX0JPRFknLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCdcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgY29uc3QgcmVxdWVzdDogVmVyaWZ5RW1haWxXaXRoT1RQUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCB8fCAhcmVxdWVzdC5jb25maXJtYXRpb25Db2RlKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdNSVNTSU5HX0ZJRUxEUycsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCBhbmQgY29uZmlybWF0aW9uIGNvZGUgYXJlIHJlcXVpcmVkJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZW1haWwgZm9ybWF0XHJcbiAgICBpZiAoIXZhbGlkYXRlRW1haWwocmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ0lOVkFMSURfRU1BSUwnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIHByb3ZpZGUgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgY29uZmlybWF0aW9uIGNvZGUgZm9ybWF0IChzaG91bGQgYmUgNiBkaWdpdHMpXHJcbiAgICBpZiAoIS9eXFxkezZ9JC8udGVzdChyZXF1ZXN0LmNvbmZpcm1hdGlvbkNvZGUudHJpbSgpKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnSU5WQUxJRF9DT0RFX0ZPUk1BVCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdDb25maXJtYXRpb24gY29kZSBtdXN0IGJlIDYgZGlnaXRzJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBhdXRoZW50aWNhdGlvbiBzZXJ2aWNlXHJcbiAgICBjb25zdCBhdXRoU2VydmljZSA9IG5ldyBVbmlmaWVkQXV0aFNlcnZpY2UoKTtcclxuXHJcbiAgICAvLyBIYW5kbGUgZW1haWwgdmVyaWZpY2F0aW9uIHdpdGggT1RQIHNldHVwXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhdXRoU2VydmljZS5oYW5kbGVFbWFpbFZlcmlmaWNhdGlvbkNvbXBsZXRlKFxyXG4gICAgICByZXF1ZXN0LmVtYWlsLCBcclxuICAgICAgcmVxdWVzdC5jb25maXJtYXRpb25Db2RlLnRyaW0oKVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogVmVyaWZ5RW1haWxXaXRoT1RQUmVzcG9uc2UgPSB7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIG1lc3NhZ2U6IHJlc3VsdC5tZXNzYWdlLFxyXG4gICAgICBvdHBTZXR1cDogcmVzdWx0Lm90cFNldHVwLFxyXG4gICAgICB0ZW1wb3JhcnlUb2tlbnM6IHJlc3VsdC50ZW1wb3JhcnlUb2tlbnMsXHJcbiAgICAgIG5leHRTdGVwOiByZXN1bHQubmV4dFN0ZXBcclxuICAgIH07XHJcblxyXG4gICAgY29uc29sZS5sb2coJ0VtYWlsIHZlcmlmaWNhdGlvbiB3aXRoIE9UUCBzZXR1cCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFbWFpbCB2ZXJpZmljYXRpb24gd2l0aCBPVFAgc2V0dXAgZmFpbGVkOicsIGVycm9yKTtcclxuXHJcbiAgICAvLyBVc2UgdGhlIGVycm9yIGhhbmRsZXIgdG8gdHJhbnNmb3JtIGFuZCBsb2cgdGhlIGVycm9yXHJcbiAgICBjb25zdCBhdXRoRXJyb3IgPSBhdXRoRXJyb3JIYW5kbGVyLmhhbmRsZUVycm9yKGVycm9yLCB7XHJcbiAgICAgIG9wZXJhdGlvbjogJ3ZlcmlmeS1lbWFpbC13aXRoLW90cCcsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICBzdGVwOiAnZW1haWxfdmVyaWZpY2F0aW9uJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHRoZSB0cmFuc2Zvcm1lZCBlcnJvciByZXNwb25zZVxyXG4gICAgcmV0dXJuIGF1dGhFcnJvckhhbmRsZXIudG9BUElSZXNwb25zZShhdXRoRXJyb3IpO1xyXG4gIH1cclxufTsiXX0=