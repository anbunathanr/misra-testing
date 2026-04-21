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
        logger.error('Authentication flow initiation failed:', error, {
            correlationId,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5pdGlhdGUtZmxvdy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImluaXRpYXRlLWZsb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsbUZBQThFO0FBQzlFLDJDQUErQztBQUMvQyx1REFBdUQ7QUFDdkQsK0NBQWtEO0FBRWxELE1BQU0sTUFBTSxHQUFHLElBQUEscUJBQVksRUFBQyxjQUFjLENBQUMsQ0FBQztBQWVyQyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsTUFBTSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRTtRQUNuRCxhQUFhO1FBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1FBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtLQUN6QixDQUFDLENBQUM7SUFFSCxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxrQkFBVztnQkFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCxJQUFJLEVBQUUsY0FBYzt3QkFDcEIsT0FBTyxFQUFFLDBCQUEwQjtxQkFDcEM7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQXdCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTVELDJCQUEyQjtRQUMzQixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFD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QUFPLElBQUksd0NBQXdDO29CQUNsRSxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7b0JBQ25DLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjthQUNGLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTlIVyxRQUFBLE9BQU8sV0E4SGxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBDb2duaXRvVE9UUFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdXRoL2NvZ25pdG8tdG90cC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgdmFsaWRhdGVFbWFpbCB9IGZyb20gJy4uLy4uL3V0aWxzL3ZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdJbml0aWF0ZUZsb3cnKTtcclxuXHJcbmludGVyZmFjZSBJbml0aWF0ZUZsb3dSZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIG5hbWU/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBJbml0aWF0ZUZsb3dSZXNwb25zZSB7XHJcbiAgc3RhdGU6IHN0cmluZztcclxuICByZXF1aXJlc1JlZ2lzdHJhdGlvbjogYm9vbGVhbjtcclxuICByZXF1aXJlc01GQVNldHVwOiBib29sZWFuO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICB0ZW1wUGFzc3dvcmQ/OiBzdHJpbmc7IC8vIEZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ0luaXRpYXRlIGF1dGhlbnRpY2F0aW9uIGZsb3cgcmVxdWVzdDonLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgY29kZTogJ01JU1NJTkdfQk9EWScsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBJbml0aWF0ZUZsb3dSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5lbWFpbCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnTUlTU0lOR19FTUFJTCcsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdFbWFpbCBpcyByZXF1aXJlZCdcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIGVtYWlsIGZvcm1hdFxyXG4gICAgaWYgKCF2YWxpZGF0ZUVtYWlsKHJlcXVlc3QuZW1haWwpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdJTlZBTElEX0VNQUlMJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBwcm92aWRlIGEgdmFsaWQgZW1haWwgYWRkcmVzcydcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEluaXRpYWxpemUgQ29nbml0byBUT1RQIHNlcnZpY2VcclxuICAgIGNvbnN0IGNvZ25pdG9UT1RQU2VydmljZSA9IG5ldyBDb2duaXRvVE9UUFNlcnZpY2UoKTtcclxuXHJcbiAgICAvLyBDaGVjayBpZiB1c2VyIGV4aXN0c1xyXG4gICAgY29uc3QgdXNlckV4aXN0cyA9IGF3YWl0IGNvZ25pdG9UT1RQU2VydmljZS51c2VyRXhpc3RzKHJlcXVlc3QuZW1haWwpO1xyXG5cclxuICAgIGxldCByZXNwb25zZTogSW5pdGlhdGVGbG93UmVzcG9uc2U7XHJcblxyXG4gICAgaWYgKCF1c2VyRXhpc3RzKSB7XHJcbiAgICAgIC8vIENyZWF0ZSBuZXcgdXNlciB3aXRoIE1GQSBlbmFibGVkIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdDcmVhdGluZyBuZXcgdXNlciB3aXRoIE1GQSBlbmFibGVkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZW1haWw6IHJlcXVlc3QuZW1haWxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBjcmVhdGVSZXN1bHQgPSBhd2FpdCBjb2duaXRvVE9UUFNlcnZpY2UuY3JlYXRlVXNlcldpdGhNRkEoXHJcbiAgICAgICAgcmVxdWVzdC5lbWFpbCwgXHJcbiAgICAgICAgcmVxdWVzdC5uYW1lXHJcbiAgICAgICk7XHJcblxyXG4gICAgICByZXNwb25zZSA9IHtcclxuICAgICAgICBzdGF0ZTogJ3VzZXJfY3JlYXRlZCcsXHJcbiAgICAgICAgcmVxdWlyZXNSZWdpc3RyYXRpb246IGZhbHNlLCAvLyBBbHJlYWR5IGNyZWF0ZWRcclxuICAgICAgICByZXF1aXJlc01GQVNldHVwOiB0cnVlLCAvLyBXaWxsIG5lZWQgTUZBIHNldHVwXHJcbiAgICAgICAgbWVzc2FnZTogJ1VzZXIgY3JlYXRlZCBzdWNjZXNzZnVsbHkuIE1GQSBzZXR1cCByZXF1aXJlZC4nLFxyXG4gICAgICAgIHRlbXBQYXNzd29yZDogY3JlYXRlUmVzdWx0LnRlbXBQYXNzd29yZFxyXG4gICAgICB9O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gVXNlciBleGlzdHMsIHRoZXkgY2FuIHByb2NlZWQgdG8gbG9naW5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1VzZXIgZXhpc3RzLCByZWFkeSBmb3IgYXV0aGVudGljYXRpb24nLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJlc3BvbnNlID0ge1xyXG4gICAgICAgIHN0YXRlOiAndXNlcl9leGlzdHMnLFxyXG4gICAgICAgIHJlcXVpcmVzUmVnaXN0cmF0aW9uOiBmYWxzZSxcclxuICAgICAgICByZXF1aXJlc01GQVNldHVwOiBmYWxzZSwgLy8gV2lsbCBiZSBkZXRlcm1pbmVkIGR1cmluZyBhdXRoXHJcbiAgICAgICAgbWVzc2FnZTogJ1VzZXIgZXhpc3RzLiBSZWFkeSBmb3IgYXV0aGVudGljYXRpb24uJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdBdXRoZW50aWNhdGlvbiBmbG93IGluaXRpYXRlZCBzdWNjZXNzZnVsbHk6Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlbWFpbDogcmVxdWVzdC5lbWFpbCxcclxuICAgICAgc3RhdGU6IHJlc3BvbnNlLnN0YXRlXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignQXV0aGVudGljYXRpb24gZmxvdyBpbml0aWF0aW9uIGZhaWxlZDonLCBlcnJvciwge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnRkxPV19JTklUSUFUSU9OX0ZBSUxFRCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gaW5pdGlhdGUgYXV0aGVudGljYXRpb24gZmxvdycsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG59OyJdfQ==