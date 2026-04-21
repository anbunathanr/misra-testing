"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const cognito_totp_service_1 = require("../../services/auth/cognito-totp-service");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('AutonomousLogin');
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    logger.info('Autonomous login request received', {
        correlationId,
        path: event.path,
        method: event.httpMethod
    });
    try {
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const request = JSON.parse(event.body);
        if (!request.email || !request.password) {
            return errorResponse(400, 'MISSING_CREDENTIALS', 'Email and password are required');
        }
        logger.info('Starting autonomous login with auto MFA', {
            correlationId,
            email: request.email
        });
        // Initialize Cognito TOTP service
        const cognitoTOTPService = new cognito_totp_service_1.CognitoTOTPService();
        // Authenticate with automatic MFA handling
        const authResult = await cognitoTOTPService.authenticateWithAutoMFA(request.email, request.password);
        // Check if we got a complete authentication result
        if ('accessToken' in authResult) {
            // Authentication completed successfully
            const authResponse = authResult;
            logger.info('Autonomous login completed successfully', {
                correlationId,
                email: request.email,
                expiresIn: authResponse.expiresIn
            });
            const response = {
                success: true,
                accessToken: authResponse.accessToken,
                idToken: authResponse.idToken,
                refreshToken: authResponse.refreshToken,
                expiresIn: authResponse.expiresIn,
                user: {
                    userId: extractUserIdFromToken(authResponse.idToken),
                    email: request.email,
                    name: extractNameFromToken(authResponse.idToken) || request.email.split('@')[0]
                },
                message: 'Authentication completed successfully with automatic MFA setup',
                nextStep: 'authenticated'
            };
            return {
                statusCode: 200,
                headers: cors_1.corsHeaders,
                body: JSON.stringify(response)
            };
        }
        else {
            // Got an MFA challenge (shouldn't happen in autonomous flow, but handle gracefully)
            logger.warn('Received MFA challenge in autonomous flow', {
                correlationId,
                email: request.email,
                challengeName: authResult.challengeName
            });
            return errorResponse(500, 'AUTONOMOUS_MFA_FAILED', 'Autonomous MFA setup failed - received unexpected challenge');
        }
    }
    catch (error) {
        logger.error('Autonomous login failed', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        // Parse error message to provide better user feedback
        let errorCode = 'LOGIN_FAILED';
        let errorMessage = 'Authentication failed';
        if (error.message.includes('USER_CREATION_FAILED')) {
            errorCode = 'USER_CREATION_FAILED';
            errorMessage = 'Failed to create user account';
        }
        else if (error.message.includes('AUTH_FAILED')) {
            errorCode = 'AUTH_FAILED';
            errorMessage = 'Authentication failed - please check credentials';
        }
        else if (error.message.includes('TOTP_SETUP_FAILED')) {
            errorCode = 'TOTP_SETUP_FAILED';
            errorMessage = 'Failed to set up two-factor authentication';
        }
        else if (error.message.includes('MFA_CHALLENGE_FAILED')) {
            errorCode = 'MFA_CHALLENGE_FAILED';
            errorMessage = 'Two-factor authentication verification failed';
        }
        return errorResponse(500, errorCode, errorMessage);
    }
};
exports.handler = handler;
/**
 * Extract user ID from JWT token (simplified implementation)
 */
function extractUserIdFromToken(idToken) {
    try {
        // In a real implementation, you would properly decode and verify the JWT
        // For now, we'll use a placeholder approach
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        return payload.sub || payload['cognito:username'] || 'unknown';
    }
    catch (error) {
        logger.warn('Failed to extract user ID from token', { error });
        return 'unknown';
    }
}
/**
 * Extract name from JWT token (simplified implementation)
 */
function extractNameFromToken(idToken) {
    try {
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        return payload.given_name || payload.name || null;
    }
    catch (error) {
        logger.warn('Failed to extract name from token', { error });
        return null;
    }
}
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: cors_1.corsHeaders,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b25vbW91cy1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG9ub21vdXMtbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUZBQW9HO0FBQ3BHLDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLGlCQUFpQixDQUFDLENBQUM7QUFzQnhDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuRyxNQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO1FBQy9DLGFBQWE7UUFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7UUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVO0tBQ3pCLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBMkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDeEMsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLHFCQUFxQixFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMseUNBQXlDLEVBQUU7WUFDckQsYUFBYTtZQUNiLEtB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cEYsT0FBTyxPQUFPLENBQUMsVUFBVSxJQUFJLE9BQU8sQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO0lBQ3BELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsTUFBTSxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDNUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLFVBQWtCLEVBQUUsSUFBWSxFQUFFLE9BQWU7SUFDdEUsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUUsa0JBQVc7UUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENvZ25pdG9UT1RQU2VydmljZSwgQXV0aGVudGljYXRpb25SZXN1bHQgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL2NvZ25pdG8tdG90cC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignQXV0b25vbW91c0xvZ2luJyk7XHJcblxyXG5pbnRlcmZhY2UgQXV0b25vbW91c0xvZ2luUmVxdWVzdCB7XHJcbiAgZW1haWw6IHN0cmluZztcclxuICBwYXNzd29yZDogc3RyaW5nOyAvLyBUZW1wb3JhcnkgcGFzc3dvcmQgZnJvbSBpbml0aWF0ZS1mbG93XHJcbn1cclxuXHJcbmludGVyZmFjZSBBdXRvbm9tb3VzTG9naW5SZXNwb25zZSB7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxuICBhY2Nlc3NUb2tlbj86IHN0cmluZztcclxuICBpZFRva2VuPzogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbj86IHN0cmluZztcclxuICBleHBpcmVzSW4/OiBudW1iZXI7XHJcbiAgdXNlcj86IHtcclxuICAgIHVzZXJJZDogc3RyaW5nO1xyXG4gICAgZW1haWw6IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICB9O1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBuZXh0U3RlcD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICBcclxuICBsb2dnZXIuaW5mbygnQXV0b25vbW91cyBsb2dpbiByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogQXV0b25vbW91c0xvZ2luUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgaWYgKCFyZXF1ZXN0LmVtYWlsIHx8ICFyZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQ1JFREVOVElBTFMnLCAnRW1haWwgYW5kIHBhc3N3b3JkIGFyZSByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBhdXRvbm9tb3VzIGxvZ2luIHdpdGggYXV0byBNRkEnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJbml0aWFsaXplIENvZ25pdG8gVE9UUCBzZXJ2aWNlXHJcbiAgICBjb25zdCBjb2duaXRvVE9UUFNlcnZpY2UgPSBuZXcgQ29nbml0b1RPVFBTZXJ2aWNlKCk7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRlIHdpdGggYXV0b21hdGljIE1GQSBoYW5kbGluZ1xyXG4gICAgY29uc3QgYXV0aFJlc3VsdCA9IGF3YWl0IGNvZ25pdG9UT1RQU2VydmljZS5hdXRoZW50aWNhdGVXaXRoQXV0b01GQShcclxuICAgICAgcmVxdWVzdC5lbWFpbCxcclxuICAgICAgcmVxdWVzdC5wYXNzd29yZFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiB3ZSBnb3QgYSBjb21wbGV0ZSBhdXRoZW50aWNhdGlvbiByZXN1bHRcclxuICAgIGlmICgnYWNjZXNzVG9rZW4nIGluIGF1dGhSZXN1bHQpIHtcclxuICAgICAgLy8gQXV0aGVudGljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseVxyXG4gICAgICBjb25zdCBhdXRoUmVzcG9uc2UgPSBhdXRoUmVzdWx0IGFzIEF1dGhlbnRpY2F0aW9uUmVzdWx0O1xyXG4gICAgICBcclxuICAgICAgbG9nZ2VyLmluZm8oJ0F1dG9ub21vdXMgbG9naW4gY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIGV4cGlyZXNJbjogYXV0aFJlc3BvbnNlLmV4cGlyZXNJblxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlOiBBdXRvbm9tb3VzTG9naW5SZXNwb25zZSA9IHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc1Rva2VuOiBhdXRoUmVzcG9uc2UuYWNjZXNzVG9rZW4sXHJcbiAgICAgICAgaWRUb2tlbjogYXV0aFJlc3BvbnNlLmlkVG9rZW4sXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiBhdXRoUmVzcG9uc2UucmVmcmVzaFRva2VuLFxyXG4gICAgICAgIGV4cGlyZXNJbjogYXV0aFJlc3BvbnNlLmV4cGlyZXNJbixcclxuICAgICAgICB1c2VyOiB7XHJcbiAgICAgICAgICB1c2VySWQ6IGV4dHJhY3RVc2VySWRGcm9tVG9rZW4oYXV0aFJlc3BvbnNlLmlkVG9rZW4pLFxyXG4gICAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgICBuYW1lOiBleHRyYWN0TmFtZUZyb21Ub2tlbihhdXRoUmVzcG9uc2UuaWRUb2tlbikgfHwgcmVxdWVzdC5lbWFpbC5zcGxpdCgnQCcpWzBdXHJcbiAgICAgICAgfSxcclxuICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSB3aXRoIGF1dG9tYXRpYyBNRkEgc2V0dXAnLFxyXG4gICAgICAgIG5leHRTdGVwOiAnYXV0aGVudGljYXRlZCdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgICB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gR290IGFuIE1GQSBjaGFsbGVuZ2UgKHNob3VsZG4ndCBoYXBwZW4gaW4gYXV0b25vbW91cyBmbG93LCBidXQgaGFuZGxlIGdyYWNlZnVsbHkpXHJcbiAgICAgIGxvZ2dlci53YXJuKCdSZWNlaXZlZCBNRkEgY2hhbGxlbmdlIGluIGF1dG9ub21vdXMgZmxvdycsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGVtYWlsOiByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICAgIGNoYWxsZW5nZU5hbWU6IGF1dGhSZXN1bHQuY2hhbGxlbmdlTmFtZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKFxyXG4gICAgICAgIDUwMCwgXHJcbiAgICAgICAgJ0FVVE9OT01PVVNfTUZBX0ZBSUxFRCcsIFxyXG4gICAgICAgICdBdXRvbm9tb3VzIE1GQSBzZXR1cCBmYWlsZWQgLSByZWNlaXZlZCB1bmV4cGVjdGVkIGNoYWxsZW5nZSdcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdBdXRvbm9tb3VzIGxvZ2luIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUGFyc2UgZXJyb3IgbWVzc2FnZSB0byBwcm92aWRlIGJldHRlciB1c2VyIGZlZWRiYWNrXHJcbiAgICBsZXQgZXJyb3JDb2RlID0gJ0xPR0lOX0ZBSUxFRCc7XHJcbiAgICBsZXQgZXJyb3JNZXNzYWdlID0gJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCc7XHJcblxyXG4gICAgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ1VTRVJfQ1JFQVRJT05fRkFJTEVEJykpIHtcclxuICAgICAgZXJyb3JDb2RlID0gJ1VTRVJfQ1JFQVRJT05fRkFJTEVEJztcclxuICAgICAgZXJyb3JNZXNzYWdlID0gJ0ZhaWxlZCB0byBjcmVhdGUgdXNlciBhY2NvdW50JztcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnQVVUSF9GQUlMRUQnKSkge1xyXG4gICAgICBlcnJvckNvZGUgPSAnQVVUSF9GQUlMRUQnO1xyXG4gICAgICBlcnJvck1lc3NhZ2UgPSAnQXV0aGVudGljYXRpb24gZmFpbGVkIC0gcGxlYXNlIGNoZWNrIGNyZWRlbnRpYWxzJztcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnVE9UUF9TRVRVUF9GQUlMRUQnKSkge1xyXG4gICAgICBlcnJvckNvZGUgPSAnVE9UUF9TRVRVUF9GQUlMRUQnO1xyXG4gICAgICBlcnJvck1lc3NhZ2UgPSAnRmFpbGVkIHRvIHNldCB1cCB0d28tZmFjdG9yIGF1dGhlbnRpY2F0aW9uJztcclxuICAgIH0gZWxzZSBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnTUZBX0NIQUxMRU5HRV9GQUlMRUQnKSkge1xyXG4gICAgICBlcnJvckNvZGUgPSAnTUZBX0NIQUxMRU5HRV9GQUlMRUQnO1xyXG4gICAgICBlcnJvck1lc3NhZ2UgPSAnVHdvLWZhY3RvciBhdXRoZW50aWNhdGlvbiB2ZXJpZmljYXRpb24gZmFpbGVkJztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsIGVycm9yQ29kZSwgZXJyb3JNZXNzYWdlKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogRXh0cmFjdCB1c2VyIElEIGZyb20gSldUIHRva2VuIChzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uKVxyXG4gKi9cclxuZnVuY3Rpb24gZXh0cmFjdFVzZXJJZEZyb21Ub2tlbihpZFRva2VuOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBwcm9wZXJseSBkZWNvZGUgYW5kIHZlcmlmeSB0aGUgSldUXHJcbiAgICAvLyBGb3Igbm93LCB3ZSdsbCB1c2UgYSBwbGFjZWhvbGRlciBhcHByb2FjaFxyXG4gICAgY29uc3QgcGF5bG9hZCA9IEpTT04ucGFyc2UoQnVmZmVyLmZyb20oaWRUb2tlbi5zcGxpdCgnLicpWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XHJcbiAgICByZXR1cm4gcGF5bG9hZC5zdWIgfHwgcGF5bG9hZFsnY29nbml0bzp1c2VybmFtZSddIHx8ICd1bmtub3duJztcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byBleHRyYWN0IHVzZXIgSUQgZnJvbSB0b2tlbicsIHsgZXJyb3IgfSk7XHJcbiAgICByZXR1cm4gJ3Vua25vd24nO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgbmFtZSBmcm9tIEpXVCB0b2tlbiAoc2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbilcclxuICovXHJcbmZ1bmN0aW9uIGV4dHJhY3ROYW1lRnJvbVRva2VuKGlkVG9rZW46IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBwYXlsb2FkID0gSlNPTi5wYXJzZShCdWZmZXIuZnJvbShpZFRva2VuLnNwbGl0KCcuJylbMV0sICdiYXNlNjQnKS50b1N0cmluZygpKTtcclxuICAgIHJldHVybiBwYXlsb2FkLmdpdmVuX25hbWUgfHwgcGF5bG9hZC5uYW1lIHx8IG51bGw7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gZXh0cmFjdCBuYW1lIGZyb20gdG9rZW4nLCB7IGVycm9yIH0pO1xyXG4gICAgcmV0dXJuIG51bGw7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKHN0YXR1c0NvZGU6IG51bWJlciwgY29kZTogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufSJdfQ==