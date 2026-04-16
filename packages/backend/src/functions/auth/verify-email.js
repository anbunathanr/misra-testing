"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const email_verification_service_1 = require("../../services/auth/email-verification-service");
const emailVerificationService = new email_verification_service_1.EmailVerificationService();
const handler = async (event) => {
    try {
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const { email, confirmationCode } = JSON.parse(event.body);
        if (!email || !confirmationCode) {
            return errorResponse(400, 'INVALID_INPUT', 'Email and confirmation code are required');
        }
        // Verify email and automatically set up OTP
        const result = await emailVerificationService.verifyEmail(email, confirmationCode);
        if (!result.success) {
            return errorResponse(400, 'VERIFICATION_FAILED', result.message);
        }
        const response = {
            success: true,
            message: result.message,
            otpSetup: result.requiresOTP ? {
                secret: result.otpSecret,
                qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(`otpauth://totp/MISRA Platform:${email}?secret=${result.otpSecret}&issuer=MISRA Platform`)}`,
                backupCodes: result.backupCodes
            } : undefined
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        console.error('Email verification error:', error);
        return errorResponse(500, 'INTERNAL_ERROR', 'Email verification failed');
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
                requestId: Math.random().toString(36).substring(7)
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmVyaWZ5LWVtYWlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidmVyaWZ5LWVtYWlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLCtGQUEwRjtBQUUxRixNQUFNLHdCQUF3QixHQUFHLElBQUkscURBQXdCLEVBQUUsQ0FBQztBQWlCekQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsSUFBSSxDQUFDO1FBQ0gsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsR0FBdUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFL0UsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDaEMsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSwwQ0FBMEMsQ0FBQyxDQUFDO1FBQ3pGLENBQUM7UUFFRCw0Q0FBNEM7UUFDNUMsTUFBTSxNQUFNLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFbkYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25FLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBd0I7WUFDcEMsT0FBTyxFQUFFLElBQUk7WUFDYixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsUUFBUSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixNQUFNLEVBQUUsTUFBTSxDQUFDLFNBQVU7Z0JBQ3pCLFNBQVMsRUFBRSxzRUFBc0Usa0JBQWtCLENBQUMsaUNBQWlDLEtBQUssV0FBVyxNQUFNLENBQUMsU0FBUyx3QkFBd0IsQ0FBQyxFQUFFO2dCQUNoTSxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVk7YUFDakMsQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNkLENBQUM7UUFFRixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztnQkFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO2FBQzdEO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFFSixDQUFDO0lBQUMsT0FBTyxLQUFVLEVBQUUsQ0FBQztRQUNwQixPQUFPLENBQUMsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2xELE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO0lBQzNFLENBQUM7QUFDSCxDQUFDLENBQUM7QUEzQ1csUUFBQSxPQUFPLFdBMkNsQjtBQUVGLFNBQVMsYUFBYSxDQUFDLFVBQWtCLEVBQUUsSUFBWSxFQUFFLE9BQWU7SUFDdEUsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUU7WUFDUCxjQUFjLEVBQUUsa0JBQWtCO1lBQ2xDLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO1NBQzdEO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvZW1haWwtdmVyaWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5cclxuY29uc3QgZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlID0gbmV3IEVtYWlsVmVyaWZpY2F0aW9uU2VydmljZSgpO1xyXG5cclxuaW50ZXJmYWNlIFZlcmlmeUVtYWlsUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBjb25maXJtYXRpb25Db2RlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBWZXJpZnlFbWFpbFJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBvdHBTZXR1cD86IHtcclxuICAgIHNlY3JldDogc3RyaW5nO1xyXG4gICAgcXJDb2RlVXJsOiBzdHJpbmc7XHJcbiAgICBiYWNrdXBDb2Rlczogc3RyaW5nW107XHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICB0cnkge1xyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB7IGVtYWlsLCBjb25maXJtYXRpb25Db2RlIH06IFZlcmlmeUVtYWlsUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgaWYgKCFlbWFpbCB8fCAhY29uZmlybWF0aW9uQ29kZSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX0lOUFVUJywgJ0VtYWlsIGFuZCBjb25maXJtYXRpb24gY29kZSBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWZXJpZnkgZW1haWwgYW5kIGF1dG9tYXRpY2FsbHkgc2V0IHVwIE9UUFxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZW1haWxWZXJpZmljYXRpb25TZXJ2aWNlLnZlcmlmeUVtYWlsKGVtYWlsLCBjb25maXJtYXRpb25Db2RlKTtcclxuXHJcbiAgICBpZiAoIXJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ1ZFUklGSUNBVElPTl9GQUlMRUQnLCByZXN1bHQubWVzc2FnZSk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IFZlcmlmeUVtYWlsUmVzcG9uc2UgPSB7XHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIG1lc3NhZ2U6IHJlc3VsdC5tZXNzYWdlLFxyXG4gICAgICBvdHBTZXR1cDogcmVzdWx0LnJlcXVpcmVzT1RQID8ge1xyXG4gICAgICAgIHNlY3JldDogcmVzdWx0Lm90cFNlY3JldCEsXHJcbiAgICAgICAgcXJDb2RlVXJsOiBgaHR0cHM6Ly9jaGFydC5nb29nbGVhcGlzLmNvbS9jaGFydD9jaHM9MjAweDIwMCZjaGxkPU18MCZjaHQ9cXImY2hsPSR7ZW5jb2RlVVJJQ29tcG9uZW50KGBvdHBhdXRoOi8vdG90cC9NSVNSQSBQbGF0Zm9ybToke2VtYWlsfT9zZWNyZXQ9JHtyZXN1bHQub3RwU2VjcmV0fSZpc3N1ZXI9TUlTUkEgUGxhdGZvcm1gKX1gLFxyXG4gICAgICAgIGJhY2t1cENvZGVzOiByZXN1bHQuYmFja3VwQ29kZXMhXHJcbiAgICAgIH0gOiB1bmRlZmluZWRcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFbWFpbCB2ZXJpZmljYXRpb24gZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnSU5URVJOQUxfRVJST1InLCAnRW1haWwgdmVyaWZpY2F0aW9uIGZhaWxlZCcpO1xyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2Uoc3RhdHVzQ29kZTogbnVtYmVyLCBjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZyk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufSJdfQ==