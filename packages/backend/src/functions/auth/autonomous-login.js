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
        logger.error('Autonomous login failed', error, {
            correlationId,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0b25vbW91cy1sb2dpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImF1dG9ub21vdXMtbG9naW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUZBQW9HO0FBQ3BHLDJDQUErQztBQUMvQywrQ0FBa0Q7QUFFbEQsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLGlCQUFpQixDQUFDLENBQUM7QUFzQnhDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuRyxNQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFO1FBQy9DLGFBQWE7UUFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7UUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVO0tBQ3pCLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBMkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDeEMsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLHFCQUFxQixFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMseUNBQXlDLEVBQUU7WUFDckQsYUFBYTtZQUNiLEtB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LENBQUM7SUFDcEQsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixNQUFNLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1RCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsVUFBa0IsRUFBRSxJQUFZLEVBQUUsT0FBZTtJQUN0RSxPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzthQUNuRDtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29nbml0b1RPVFBTZXJ2aWNlLCBBdXRoZW50aWNhdGlvblJlc3VsdCB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvY29nbml0by10b3RwLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdBdXRvbm9tb3VzTG9naW4nKTtcclxuXHJcbmludGVyZmFjZSBBdXRvbm9tb3VzTG9naW5SZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHBhc3N3b3JkOiBzdHJpbmc7IC8vIFRlbXBvcmFyeSBwYXNzd29yZCBmcm9tIGluaXRpYXRlLWZsb3dcclxufVxyXG5cclxuaW50ZXJmYWNlIEF1dG9ub21vdXNMb2dpblJlc3BvbnNlIHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIGFjY2Vzc1Rva2VuPzogc3RyaW5nO1xyXG4gIGlkVG9rZW4/OiBzdHJpbmc7XHJcbiAgcmVmcmVzaFRva2VuPzogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbj86IG51bWJlcjtcclxuICB1c2VyPzoge1xyXG4gICAgdXNlcklkOiBzdHJpbmc7XHJcbiAgICBlbWFpbDogc3RyaW5nO1xyXG4gICAgbmFtZTogc3RyaW5nO1xyXG4gIH07XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIG5leHRTdGVwPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdBdXRvbm9tb3VzIGxvZ2luIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBBdXRvbm9tb3VzTG9naW5SZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICBpZiAoIXJlcXVlc3QuZW1haWwgfHwgIXJlcXVlc3QucGFzc3dvcmQpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19DUkVERU5USUFMUycsICdFbWFpbCBhbmQgcGFzc3dvcmQgYXJlIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGF1dG9ub21vdXMgbG9naW4gd2l0aCBhdXRvIE1GQScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluaXRpYWxpemUgQ29nbml0byBUT1RQIHNlcnZpY2VcclxuICAgIGNvbnN0IGNvZ25pdG9UT1RQU2VydmljZSA9IG5ldyBDb2duaXRvVE9UUFNlcnZpY2UoKTtcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGUgd2l0aCBhdXRvbWF0aWMgTUZBIGhhbmRsaW5nXHJcbiAgICBjb25zdCBhdXRoUmVzdWx0ID0gYXdhaXQgY29nbml0b1RPVFBTZXJ2aWNlLmF1dGhlbnRpY2F0ZVdpdGhBdXRvTUZBKFxyXG4gICAgICByZXF1ZXN0LmVtYWlsLFxyXG4gICAgICByZXF1ZXN0LnBhc3N3b3JkXHJcbiAgICApO1xyXG5cclxuICAgIC8vIENoZWNrIGlmIHdlIGdvdCBhIGNvbXBsZXRlIGF1dGhlbnRpY2F0aW9uIHJlc3VsdFxyXG4gICAgaWYgKCdhY2Nlc3NUb2tlbicgaW4gYXV0aFJlc3VsdCkge1xyXG4gICAgICAvLyBBdXRoZW50aWNhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5XHJcbiAgICAgIGNvbnN0IGF1dGhSZXNwb25zZSA9IGF1dGhSZXN1bHQgYXMgQXV0aGVudGljYXRpb25SZXN1bHQ7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuaW5mbygnQXV0b25vbW91cyBsb2dpbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgZXhwaXJlc0luOiBhdXRoUmVzcG9uc2UuZXhwaXJlc0luXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2U6IEF1dG9ub21vdXNMb2dpblJlc3BvbnNlID0ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzVG9rZW46IGF1dGhSZXNwb25zZS5hY2Nlc3NUb2tlbixcclxuICAgICAgICBpZFRva2VuOiBhdXRoUmVzcG9uc2UuaWRUb2tlbixcclxuICAgICAgICByZWZyZXNoVG9rZW46IGF1dGhSZXNwb25zZS5yZWZyZXNoVG9rZW4sXHJcbiAgICAgICAgZXhwaXJlc0luOiBhdXRoUmVzcG9uc2UuZXhwaXJlc0luLFxyXG4gICAgICAgIHVzZXI6IHtcclxuICAgICAgICAgIHVzZXJJZDogZXh0cmFjdFVzZXJJZEZyb21Ub2tlbihhdXRoUmVzcG9uc2UuaWRUb2tlbiksXHJcbiAgICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgICAgIG5hbWU6IGV4dHJhY3ROYW1lRnJvbVRva2VuKGF1dGhSZXNwb25zZS5pZFRva2VuKSB8fCByZXF1ZXN0LmVtYWlsLnNwbGl0KCdAJylbMF1cclxuICAgICAgICB9LFxyXG4gICAgICAgIG1lc3NhZ2U6ICdBdXRoZW50aWNhdGlvbiBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IHdpdGggYXV0b21hdGljIE1GQSBzZXR1cCcsXHJcbiAgICAgICAgbmV4dFN0ZXA6ICdhdXRoZW50aWNhdGVkJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICAgIH07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBHb3QgYW4gTUZBIGNoYWxsZW5nZSAoc2hvdWxkbid0IGhhcHBlbiBpbiBhdXRvbm9tb3VzIGZsb3csIGJ1dCBoYW5kbGUgZ3JhY2VmdWxseSlcclxuICAgICAgbG9nZ2VyLndhcm4oJ1JlY2VpdmVkIE1GQSBjaGFsbGVuZ2UgaW4gYXV0b25vbW91cyBmbG93Jywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWwsXHJcbiAgICAgICAgY2hhbGxlbmdlTmFtZTogYXV0aFJlc3VsdC5jaGFsbGVuZ2VOYW1lXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoXHJcbiAgICAgICAgNTAwLCBcclxuICAgICAgICAnQVVUT05PTU9VU19NRkFfRkFJTEVEJywgXHJcbiAgICAgICAgJ0F1dG9ub21vdXMgTUZBIHNldHVwIGZhaWxlZCAtIHJlY2VpdmVkIHVuZXhwZWN0ZWQgY2hhbGxlbmdlJ1xyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0F1dG9ub21vdXMgbG9naW4gZmFpbGVkJywgZXJyb3IsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBhcnNlIGVycm9yIG1lc3NhZ2UgdG8gcHJvdmlkZSBiZXR0ZXIgdXNlciBmZWVkYmFja1xyXG4gICAgbGV0IGVycm9yQ29kZSA9ICdMT0dJTl9GQUlMRUQnO1xyXG4gICAgbGV0IGVycm9yTWVzc2FnZSA9ICdBdXRoZW50aWNhdGlvbiBmYWlsZWQnO1xyXG5cclxuICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdVU0VSX0NSRUFUSU9OX0ZBSUxFRCcpKSB7XHJcbiAgICAgIGVycm9yQ29kZSA9ICdVU0VSX0NSRUFUSU9OX0ZBSUxFRCc7XHJcbiAgICAgIGVycm9yTWVzc2FnZSA9ICdGYWlsZWQgdG8gY3JlYXRlIHVzZXIgYWNjb3VudCc7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ0FVVEhfRkFJTEVEJykpIHtcclxuICAgICAgZXJyb3JDb2RlID0gJ0FVVEhfRkFJTEVEJztcclxuICAgICAgZXJyb3JNZXNzYWdlID0gJ0F1dGhlbnRpY2F0aW9uIGZhaWxlZCAtIHBsZWFzZSBjaGVjayBjcmVkZW50aWFscyc7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ1RPVFBfU0VUVVBfRkFJTEVEJykpIHtcclxuICAgICAgZXJyb3JDb2RlID0gJ1RPVFBfU0VUVVBfRkFJTEVEJztcclxuICAgICAgZXJyb3JNZXNzYWdlID0gJ0ZhaWxlZCB0byBzZXQgdXAgdHdvLWZhY3RvciBhdXRoZW50aWNhdGlvbic7XHJcbiAgICB9IGVsc2UgaWYgKGVycm9yLm1lc3NhZ2UuaW5jbHVkZXMoJ01GQV9DSEFMTEVOR0VfRkFJTEVEJykpIHtcclxuICAgICAgZXJyb3JDb2RlID0gJ01GQV9DSEFMTEVOR0VfRkFJTEVEJztcclxuICAgICAgZXJyb3JNZXNzYWdlID0gJ1R3by1mYWN0b3IgYXV0aGVudGljYXRpb24gdmVyaWZpY2F0aW9uIGZhaWxlZCc7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCBlcnJvckNvZGUsIGVycm9yTWVzc2FnZSk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEV4dHJhY3QgdXNlciBJRCBmcm9tIEpXVCB0b2tlbiAoc2ltcGxpZmllZCBpbXBsZW1lbnRhdGlvbilcclxuICovXHJcbmZ1bmN0aW9uIGV4dHJhY3RVc2VySWRGcm9tVG9rZW4oaWRUb2tlbjogc3RyaW5nKTogc3RyaW5nIHtcclxuICB0cnkge1xyXG4gICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgcHJvcGVybHkgZGVjb2RlIGFuZCB2ZXJpZnkgdGhlIEpXVFxyXG4gICAgLy8gRm9yIG5vdywgd2UnbGwgdXNlIGEgcGxhY2Vob2xkZXIgYXBwcm9hY2hcclxuICAgIGNvbnN0IHBheWxvYWQgPSBKU09OLnBhcnNlKEJ1ZmZlci5mcm9tKGlkVG9rZW4uc3BsaXQoJy4nKVsxXSwgJ2Jhc2U2NCcpLnRvU3RyaW5nKCkpO1xyXG4gICAgcmV0dXJuIHBheWxvYWQuc3ViIHx8IHBheWxvYWRbJ2NvZ25pdG86dXNlcm5hbWUnXSB8fCAndW5rbm93bic7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gZXh0cmFjdCB1c2VyIElEIGZyb20gdG9rZW4nLCB7IGVycm9yIH0pO1xyXG4gICAgcmV0dXJuICd1bmtub3duJztcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0IG5hbWUgZnJvbSBKV1QgdG9rZW4gKHNpbXBsaWZpZWQgaW1wbGVtZW50YXRpb24pXHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0TmFtZUZyb21Ub2tlbihpZFRva2VuOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcGF5bG9hZCA9IEpTT04ucGFyc2UoQnVmZmVyLmZyb20oaWRUb2tlbi5zcGxpdCgnLicpWzFdLCAnYmFzZTY0JykudG9TdHJpbmcoKSk7XHJcbiAgICByZXR1cm4gcGF5bG9hZC5naXZlbl9uYW1lIHx8IHBheWxvYWQubmFtZSB8fCBudWxsO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIGV4dHJhY3QgbmFtZSBmcm9tIHRva2VuJywgeyBlcnJvciB9KTtcclxuICAgIHJldHVybiBudWxsO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShzdGF0dXNDb2RlOiBudW1iZXIsIGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KVxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH07XHJcbn0iXX0=