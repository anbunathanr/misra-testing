"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const unified_auth_service_1 = require("../../services/auth/unified-auth-service");
const unifiedAuthService = new unified_auth_service_1.UnifiedAuthService();
/**
 * Seamless authentication endpoint that handles both new registration and existing user login
 * - If password is provided: attempts standard login
 * - If no password: uses quick registration flow (creates user if doesn't exist)
 * - Includes retry capability for authentication failures
 * - Returns session tokens with 1-hour expiration
 */
const handler = async (event) => {
    try {
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const authRequest = JSON.parse(event.body);
        if (!authRequest.email) {
            return errorResponse(400, 'INVALID_EMAIL', 'Valid email address is required');
        }
        // Use unified authentication service with enhanced retry capability
        const authResult = await unifiedAuthService.authenticate({
            email: authRequest.email,
            password: authRequest.password,
            name: authRequest.name
        }, {
            maxRetries: 3, // Allow 3 retries for seamless auth
            baseDelay: 1000, // 1 second base delay
            maxDelay: 5000 // Max 5 seconds delay
        });
        const response = {
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            user: authResult.user,
            expiresIn: authResult.expiresIn,
            isNewUser: authResult.isNewUser,
            message: authResult.message
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
        console.error('Seamless auth error:', error);
        // Parse error message for better user experience with retry guidance
        const errorMessage = error.message || 'Authentication failed';
        if (errorMessage.includes('INVALID_EMAIL')) {
            return errorResponse(400, 'INVALID_EMAIL', 'Valid email address is required');
        }
        else if (errorMessage.includes('INVALID_CREDENTIALS')) {
            return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password. Please check your credentials and try again.');
        }
        else if (errorMessage.includes('USER_NOT_CONFIRMED')) {
            return errorResponse(401, 'USER_NOT_CONFIRMED', 'User is not confirmed. Please verify your email and try again.');
        }
        else if (errorMessage.includes('USER_CREATION_FAILED')) {
            return errorResponse(500, 'USER_CREATION_FAILED', 'Failed to create user account. Please try again in a few moments.');
        }
        else if (errorMessage.includes('RETRY_EXHAUSTED')) {
            return errorResponse(503, 'SERVICE_TEMPORARILY_UNAVAILABLE', 'Authentication service is temporarily unavailable. Please wait a moment and try again.');
        }
        else if (errorMessage.includes('CONFIG_ERROR')) {
            return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error. Please contact support if this persists.');
        }
        else if (errorMessage.includes('COGNITO_ERROR')) {
            return errorResponse(500, 'AUTH_SERVICE_ERROR', 'Authentication service error. Please try again in a few moments.');
        }
        else {
            return errorResponse(500, 'AUTHENTICATION_ERROR', 'Authentication failed. Please try again.');
        }
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
                retryable: statusCode >= 500 || code === 'SERVICE_TEMPORARILY_UNAVAILABLE'
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhbWxlc3MtYXV0aC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlYW1sZXNzLWF1dGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUZBQThFO0FBRTlFLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx5Q0FBa0IsRUFBRSxDQUFDO0FBdUJwRDs7Ozs7O0dBTUc7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQXdCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRWhFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDdkIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCxvRUFBb0U7UUFDcEUsTUFBTSxVQUFVLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxZQUFZLENBQ3REO1lBQ0UsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLO1lBQ3hCLFFBQVEsRUFBRSxXQUFXLENBQUMsUUFBUTtZQUM5QixJQUFJLEVBQUUsV0FBVyxDQUFDLElBQUk7U0FDdkIsRUFDRDtZQUNFLFVBQVUsRUFBRSxDQUFDLEVBQUUsb0NBQW9DO1lBQ25ELFNBQVMsRUFBRSxJQUFJLEVBQUUsc0JBQXNCO1lBQ3ZDLFFBQVEsRUFBRSxJQUFJLENBQUcsc0JBQXNCO1NBQ3hDLENBQ0YsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUF5QjtZQUNyQyxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVc7WUFDbkMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxZQUFZO1lBQ3JD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QUMsQ0FBQztnQkFDbEQsU0FBUyxFQUFFLFVBQVUsSUFBSSxHQUFHLElBQUksSUFBSSxLQUFLLGlDQUFpQzthQUMzRTtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgVW5pZmllZEF1dGhTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXV0aC91bmlmaWVkLWF1dGgtc2VydmljZSc7XHJcblxyXG5jb25zdCB1bmlmaWVkQXV0aFNlcnZpY2UgPSBuZXcgVW5pZmllZEF1dGhTZXJ2aWNlKCk7XHJcblxyXG5pbnRlcmZhY2UgU2VhbWxlc3NBdXRoUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBwYXNzd29yZD86IHN0cmluZzsgLy8gT3B0aW9uYWwgLSBpZiBub3QgcHJvdmlkZWQsIHVzZXMgcXVpY2sgcmVnaXN0cmF0aW9uXHJcbiAgbmFtZT86IHN0cmluZzsgICAgIC8vIE9wdGlvbmFsIC0gdXNlZCBmb3IgcXVpY2sgcmVnaXN0cmF0aW9uXHJcbn1cclxuXHJcbmludGVyZmFjZSBTZWFtbGVzc0F1dGhSZXNwb25zZSB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxuICB1c2VyOiB7XHJcbiAgICB1c2VySWQ6IHN0cmluZztcclxuICAgIGVtYWlsOiBzdHJpbmc7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gICAgcm9sZTogc3RyaW5nO1xyXG4gIH07XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbiAgaXNOZXdVc2VyOiBib29sZWFuO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIFNlYW1sZXNzIGF1dGhlbnRpY2F0aW9uIGVuZHBvaW50IHRoYXQgaGFuZGxlcyBib3RoIG5ldyByZWdpc3RyYXRpb24gYW5kIGV4aXN0aW5nIHVzZXIgbG9naW5cclxuICogLSBJZiBwYXNzd29yZCBpcyBwcm92aWRlZDogYXR0ZW1wdHMgc3RhbmRhcmQgbG9naW5cclxuICogLSBJZiBubyBwYXNzd29yZDogdXNlcyBxdWljayByZWdpc3RyYXRpb24gZmxvdyAoY3JlYXRlcyB1c2VyIGlmIGRvZXNuJ3QgZXhpc3QpXHJcbiAqIC0gSW5jbHVkZXMgcmV0cnkgY2FwYWJpbGl0eSBmb3IgYXV0aGVudGljYXRpb24gZmFpbHVyZXNcclxuICogLSBSZXR1cm5zIHNlc3Npb24gdG9rZW5zIHdpdGggMS1ob3VyIGV4cGlyYXRpb25cclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYXV0aFJlcXVlc3Q6IFNlYW1sZXNzQXV0aFJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIGlmICghYXV0aFJlcXVlc3QuZW1haWwpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdWYWxpZCBlbWFpbCBhZGRyZXNzIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVXNlIHVuaWZpZWQgYXV0aGVudGljYXRpb24gc2VydmljZSB3aXRoIGVuaGFuY2VkIHJldHJ5IGNhcGFiaWxpdHlcclxuICAgIGNvbnN0IGF1dGhSZXN1bHQgPSBhd2FpdCB1bmlmaWVkQXV0aFNlcnZpY2UuYXV0aGVudGljYXRlKFxyXG4gICAgICB7XHJcbiAgICAgICAgZW1haWw6IGF1dGhSZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIHBhc3N3b3JkOiBhdXRoUmVxdWVzdC5wYXNzd29yZCxcclxuICAgICAgICBuYW1lOiBhdXRoUmVxdWVzdC5uYW1lXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBtYXhSZXRyaWVzOiAzLCAvLyBBbGxvdyAzIHJldHJpZXMgZm9yIHNlYW1sZXNzIGF1dGhcclxuICAgICAgICBiYXNlRGVsYXk6IDEwMDAsIC8vIDEgc2Vjb25kIGJhc2UgZGVsYXlcclxuICAgICAgICBtYXhEZWxheTogNTAwMCAgIC8vIE1heCA1IHNlY29uZHMgZGVsYXlcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogU2VhbWxlc3NBdXRoUmVzcG9uc2UgPSB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuOiBhdXRoUmVzdWx0LmFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXN1bHQucmVmcmVzaFRva2VuLFxyXG4gICAgICB1c2VyOiBhdXRoUmVzdWx0LnVzZXIsXHJcbiAgICAgIGV4cGlyZXNJbjogYXV0aFJlc3VsdC5leHBpcmVzSW4sXHJcbiAgICAgIGlzTmV3VXNlcjogYXV0aFJlc3VsdC5pc05ld1VzZXIsXHJcbiAgICAgIG1lc3NhZ2U6IGF1dGhSZXN1bHQubWVzc2FnZVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1NlYW1sZXNzIGF1dGggZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICAvLyBQYXJzZSBlcnJvciBtZXNzYWdlIGZvciBiZXR0ZXIgdXNlciBleHBlcmllbmNlIHdpdGggcmV0cnkgZ3VpZGFuY2VcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgfHwgJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCc7XHJcbiAgICBcclxuICAgIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfRU1BSUwnKSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX0VNQUlMJywgJ1ZhbGlkIGVtYWlsIGFkZHJlc3MgaXMgcmVxdWlyZWQnKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdJTlZBTElEX0NSRURFTlRJQUxTJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnSU5WQUxJRF9DUkVERU5USUFMUycsICdJbnZhbGlkIGVtYWlsIG9yIHBhc3N3b3JkLiBQbGVhc2UgY2hlY2sgeW91ciBjcmVkZW50aWFscyBhbmQgdHJ5IGFnYWluLicpO1xyXG4gICAgfSBlbHNlIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ1VTRVJfTk9UX0NPTkZJUk1FRCcpKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ1VTRVJfTk9UX0NPTkZJUk1FRCcsICdVc2VyIGlzIG5vdCBjb25maXJtZWQuIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbCBhbmQgdHJ5IGFnYWluLicpO1xyXG4gICAgfSBlbHNlIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ1VTRVJfQ1JFQVRJT05fRkFJTEVEJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnVVNFUl9DUkVBVElPTl9GQUlMRUQnLCAnRmFpbGVkIHRvIGNyZWF0ZSB1c2VyIGFjY291bnQuIFBsZWFzZSB0cnkgYWdhaW4gaW4gYSBmZXcgbW9tZW50cy4nKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdSRVRSWV9FWEhBVVNURUQnKSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDMsICdTRVJWSUNFX1RFTVBPUkFSSUxZX1VOQVZBSUxBQkxFJywgJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgaXMgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSB3YWl0IGEgbW9tZW50IGFuZCB0cnkgYWdhaW4uJyk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygnQ09ORklHX0VSUk9SJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQ09ORklHX0VSUk9SJywgJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgY29uZmlndXJhdGlvbiBlcnJvci4gUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydCBpZiB0aGlzIHBlcnNpc3RzLicpO1xyXG4gICAgfSBlbHNlIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0NPR05JVE9fRVJST1InKSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdBVVRIX1NFUlZJQ0VfRVJST1InLCAnQXV0aGVudGljYXRpb24gc2VydmljZSBlcnJvci4gUGxlYXNlIHRyeSBhZ2FpbiBpbiBhIGZldyBtb21lbnRzLicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQVVUSEVOVElDQVRJT05fRVJST1InLCAnQXV0aGVudGljYXRpb24gZmFpbGVkLiBQbGVhc2UgdHJ5IGFnYWluLicpO1xyXG4gICAgfVxyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2Uoc3RhdHVzQ29kZTogbnVtYmVyLCBjb2RlOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZyk6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpLFxyXG4gICAgICAgIHJldHJ5YWJsZTogc3RhdHVzQ29kZSA+PSA1MDAgfHwgY29kZSA9PT0gJ1NFUlZJQ0VfVEVNUE9SQVJJTFlfVU5BVkFJTEFCTEUnXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufSJdfQ==