"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const unified_auth_service_1 = require("../../services/auth/unified-auth-service");
const unifiedAuthService = new unified_auth_service_1.UnifiedAuthService();
const handler = async (event) => {
    try {
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const loginRequest = JSON.parse(event.body);
        if (!loginRequest.email || !loginRequest.password) {
            return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
        }
        // Use unified authentication service with retry capability
        const authResult = await unifiedAuthService.login(loginRequest.email, loginRequest.password, {
            maxRetries: 2, // Allow 2 retries for login attempts
            baseDelay: 1000, // 1 second base delay
            maxDelay: 3000 // Max 3 seconds delay
        });
        const response = {
            accessToken: authResult.accessToken,
            refreshToken: authResult.refreshToken,
            user: authResult.user,
            expiresIn: authResult.expiresIn,
            message: authResult.message
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
        // Parse error message for better user experience
        const errorMessage = error.message || 'Internal server error';
        if (errorMessage.includes('INVALID_CREDENTIALS')) {
            return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        else if (errorMessage.includes('USER_NOT_CONFIRMED')) {
            return errorResponse(401, 'USER_NOT_CONFIRMED', 'User is not confirmed. Please verify your email.');
        }
        else if (errorMessage.includes('RETRY_EXHAUSTED')) {
            return errorResponse(503, 'SERVICE_TEMPORARILY_UNAVAILABLE', 'Authentication service is temporarily unavailable. Please try again in a few moments.');
        }
        else if (errorMessage.includes('CONFIG_ERROR')) {
            return errorResponse(500, 'CONFIG_ERROR', 'Authentication service configuration error');
        }
        else {
            return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
        }
    }
};
exports.handler = handler;
// ✅ Standard error response
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtRkFBOEU7QUFnQjlFLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSx5Q0FBa0IsRUFBRSxDQUFDO0FBRTdDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBaUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFMUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbEQsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGVBQWUsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCwyREFBMkQ7UUFDM0QsTUFBTSxVQUFVLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxLQUFLLENBQy9DLFlBQVksQ0FBQyxLQUFLLEVBQ2xCLFlBQVksQ0FBQyxRQUFRLEVBQ3JCO1lBQ0UsVUFBVSxFQUFFLENBQUMsRUFBRSxxQ0FBcUM7WUFDcEQsU0FBUyxFQUFFLElBQUksRUFBRSxzQkFBc0I7WUFDdkMsUUFBUSxFQUFFLElBQUksQ0FBRyxzQkFBc0I7U0FDeEMsQ0FDRixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQWtCO1lBQzlCLFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVztZQUNuQyxZQUFZLEVBQUUsVUFBVSxDQUFDLFlBQVk7WUFDckMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxJQUFJO1lBQ3JCLFNBQVMsRUFBRSxVQUFVLENBQUMsU0FBUztZQUMvQixPQUFPLEVBQUUsVUFBVSxDQUFDLE9BQU87U0FDNUIsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2dCQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7YUFDN0Q7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUVKLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXJDLGlEQUFpRDtRQUNqRCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsT0FBTyxJQUFJLHVCQUF1QixDQUFDO1FBRTlELElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7WUFDakQsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLHFCQUFxQixFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDaEYsQ0FBQzthQUFNLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLENBQUM7WUFDdkQsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLG9CQUFvQixFQUFFLGtEQUFrRCxDQUFDLENBQUM7UUFDdEcsQ0FBQzthQUFNLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDcEQsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGlDQUFpQyxFQUFFLHVGQUF1RixDQUFDLENBQUM7UUFDeEosQ0FBQzthQUFNLElBQUksWUFBWSxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ2pELE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsNENBQTRDLENBQUMsQ0FBQztRQUMxRixDQUFDO2FBQU0sQ0FBQztZQUNOLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3ZFLENBQUM7SUFDSCxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBN0RXLFFBQUEsT0FBTyxXQTZEbEI7QUFFRiw0QkFBNEI7QUFDNUIsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlO0lBRWYsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUU7WUFDUCxjQUFjLEVBQUUsa0JBQWtCO1lBQ2xDLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO1NBQzdEO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFVuaWZpZWRBdXRoU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvdW5pZmllZC1hdXRoLXNlcnZpY2UnO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9uc1xyXG5pbnRlcmZhY2UgTG9naW5SZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHBhc3N3b3JkOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBMb2dpblJlc3BvbnNlIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIHVzZXI6IGFueTtcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmNvbnN0IHVuaWZpZWRBdXRoU2VydmljZSA9IG5ldyBVbmlmaWVkQXV0aFNlcnZpY2UoKTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGxvZ2luUmVxdWVzdDogTG9naW5SZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICBpZiAoIWxvZ2luUmVxdWVzdC5lbWFpbCB8fCAhbG9naW5SZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnRW1haWwgYW5kIHBhc3N3b3JkIGFyZSByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVzZSB1bmlmaWVkIGF1dGhlbnRpY2F0aW9uIHNlcnZpY2Ugd2l0aCByZXRyeSBjYXBhYmlsaXR5XHJcbiAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgdW5pZmllZEF1dGhTZXJ2aWNlLmxvZ2luKFxyXG4gICAgICBsb2dpblJlcXVlc3QuZW1haWwsIFxyXG4gICAgICBsb2dpblJlcXVlc3QucGFzc3dvcmQsXHJcbiAgICAgIHtcclxuICAgICAgICBtYXhSZXRyaWVzOiAyLCAvLyBBbGxvdyAyIHJldHJpZXMgZm9yIGxvZ2luIGF0dGVtcHRzXHJcbiAgICAgICAgYmFzZURlbGF5OiAxMDAwLCAvLyAxIHNlY29uZCBiYXNlIGRlbGF5XHJcbiAgICAgICAgbWF4RGVsYXk6IDMwMDAgICAvLyBNYXggMyBzZWNvbmRzIGRlbGF5XHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IExvZ2luUmVzcG9uc2UgPSB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuOiBhdXRoUmVzdWx0LmFjY2Vzc1Rva2VuLFxyXG4gICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXN1bHQucmVmcmVzaFRva2VuLFxyXG4gICAgICB1c2VyOiBhdXRoUmVzdWx0LnVzZXIsXHJcbiAgICAgIGV4cGlyZXNJbjogYXV0aFJlc3VsdC5leHBpcmVzSW4sXHJcbiAgICAgIG1lc3NhZ2U6IGF1dGhSZXN1bHQubWVzc2FnZVxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdMb2dpbiBlcnJvcjonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIC8vIFBhcnNlIGVycm9yIG1lc3NhZ2UgZm9yIGJldHRlciB1c2VyIGV4cGVyaWVuY2VcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgfHwgJ0ludGVybmFsIHNlcnZlciBlcnJvcic7XHJcbiAgICBcclxuICAgIGlmIChlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0lOVkFMSURfQ1JFREVOVElBTFMnKSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdJTlZBTElEX0NSRURFTlRJQUxTJywgJ0ludmFsaWQgZW1haWwgb3IgcGFzc3dvcmQnKTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdVU0VSX05PVF9DT05GSVJNRUQnKSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdVU0VSX05PVF9DT05GSVJNRUQnLCAnVXNlciBpcyBub3QgY29uZmlybWVkLiBQbGVhc2UgdmVyaWZ5IHlvdXIgZW1haWwuJyk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygnUkVUUllfRVhIQVVTVEVEJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAzLCAnU0VSVklDRV9URU1QT1JBUklMWV9VTkFWQUlMQUJMRScsICdBdXRoZW50aWNhdGlvbiBzZXJ2aWNlIGlzIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLiBQbGVhc2UgdHJ5IGFnYWluIGluIGEgZmV3IG1vbWVudHMuJyk7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yTWVzc2FnZS5pbmNsdWRlcygnQ09ORklHX0VSUk9SJykpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnQ09ORklHX0VSUk9SJywgJ0F1dGhlbnRpY2F0aW9uIHNlcnZpY2UgY29uZmlndXJhdGlvbiBlcnJvcicpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnSU5URVJOQUxfRVJST1InLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyk7XHJcbiAgICB9XHJcbiAgfVxyXG59O1xyXG5cclxuLy8g4pyFIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19