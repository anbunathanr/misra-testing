"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const user_service_1 = require("../../services/user/user-service");
const userService = new user_service_1.UserService();
const handler = async (event) => {
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const registerRequest = JSON.parse(event.body);
        // Validate input
        if (!registerRequest.email || !registerRequest.password || !registerRequest.name) {
            return errorResponse(400, 'INVALID_INPUT', 'Email, password, and name are required');
        }
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(registerRequest.email)) {
            return errorResponse(400, 'INVALID_EMAIL', 'Please enter a valid email address');
        }
        // Validate password strength
        if (registerRequest.password.length < 8) {
            return errorResponse(400, 'WEAK_PASSWORD', 'Password must be at least 8 characters');
        }
        // Check if user already exists
        const existingUser = await userService.getUserByEmail(registerRequest.email);
        if (existingUser) {
            return errorResponse(409, 'USER_EXISTS', 'An account with this email already exists');
        }
        // Create new user in our system (internal auth - no n8n dependency)
        const user = await userService.createUser({
            email: registerRequest.email,
            organizationId: 'default-org',
            role: 'developer',
            preferences: {
                theme: 'light',
                notifications: {
                    email: true,
                    webhook: false,
                },
                defaultMisraRuleSet: 'MISRA_C_2012',
            },
        });
        const response = {
            message: 'User registered successfully. Please verify your email.',
        };
        return {
            statusCode: 201,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Register error:', error);
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
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
            },
        }),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZWdpc3Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxtRUFBK0Q7QUFhL0QsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxFQUFFLENBQUM7QUFFL0IsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGNBQWMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3hFLENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBb0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFaEUsaUJBQWlCO1FBQ2pCLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqRixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLHdDQUF3QyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELHdCQUF3QjtRQUN4QixNQUFNLFVBQVUsR0FBRyw0QkFBNEIsQ0FBQztRQUNoRCxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFDbkYsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLGVBQWUsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hDLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsd0NBQXdDLENBQUMsQ0FBQztRQUN2RixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sWUFBWSxHQUFHLE1BQU0sV0FBVyxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFN0UsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNqQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsYUFBYSxFQUFFLDJDQUEyQyxDQUFDLENBQUM7UUFDeEYsQ0FBQztRQUVELG9FQUFvRTtRQUNwRSxNQUFNLElBQUksR0FBRyxNQUFNLFdBQVcsQ0FBQyxVQUFVLENBQUM7WUFDeEMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxLQUFLO1lBQzVCLGNBQWMsRUFBRSxhQUFhO1lBQzdCLElBQUksRUFBRSxXQUFXO1lBQ2pCLFdBQVcsRUFBRTtnQkFDWCxLQUFLLEVBQUUsT0FBTztnQkFDZCxhQUFhLEVBQUU7b0JBQ2IsS0FBSyxFQUFFLElBQUk7b0JBQ1gsT0FBTyxFQUFFLEtBQUs7aUJBQ2Y7Z0JBQ0QsbUJBQW1CLEVBQUUsY0FBYzthQUNwQztTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFxQjtZQUNqQyxPQUFPLEVBQUUseURBQXlEO1NBQ25FLENBQUM7UUFFRixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztnQkFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO2FBQzdEO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEMsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDdkUsQ0FBQztBQUNILENBQUMsQ0FBQztBQW5FVyxRQUFBLE9BQU8sV0FtRWxCO0FBRUYsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlO0lBRWYsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUU7WUFDUCxjQUFjLEVBQUUsa0JBQWtCO1lBQ2xDLDZCQUE2QixFQUFFLEdBQUc7WUFDbEMsOEJBQThCLEVBQUUsNEJBQTRCO1NBQzdEO1FBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdXNlci91c2VyLXNlcnZpY2UnO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9uc1xyXG5pbnRlcmZhY2UgUmVnaXN0ZXJSZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHBhc3N3b3JkOiBzdHJpbmc7XHJcbiAgbmFtZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUmVnaXN0ZXJSZXNwb25zZSB7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG59XHJcblxyXG5jb25zdCB1c2VyU2VydmljZSA9IG5ldyBVc2VyU2VydmljZSgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZWdpc3RlclJlcXVlc3Q6IFJlZ2lzdGVyUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgaW5wdXRcclxuICAgIGlmICghcmVnaXN0ZXJSZXF1ZXN0LmVtYWlsIHx8ICFyZWdpc3RlclJlcXVlc3QucGFzc3dvcmQgfHwgIXJlZ2lzdGVyUmVxdWVzdC5uYW1lKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnRW1haWwsIHBhc3N3b3JkLCBhbmQgbmFtZSBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBlbWFpbCBmb3JtYXRcclxuICAgIGNvbnN0IGVtYWlsUmVnZXggPSAvXlteXFxzQF0rQFteXFxzQF0rXFwuW15cXHNAXSskLztcclxuICAgIGlmICghZW1haWxSZWdleC50ZXN0KHJlZ2lzdGVyUmVxdWVzdC5lbWFpbCkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnSU5WQUxJRF9FTUFJTCcsICdQbGVhc2UgZW50ZXIgYSB2YWxpZCBlbWFpbCBhZGRyZXNzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcGFzc3dvcmQgc3RyZW5ndGhcclxuICAgIGlmIChyZWdpc3RlclJlcXVlc3QucGFzc3dvcmQubGVuZ3RoIDwgOCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdXRUFLX1BBU1NXT1JEJywgJ1Bhc3N3b3JkIG11c3QgYmUgYXQgbGVhc3QgOCBjaGFyYWN0ZXJzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgaWYgdXNlciBhbHJlYWR5IGV4aXN0c1xyXG4gICAgY29uc3QgZXhpc3RpbmdVc2VyID0gYXdhaXQgdXNlclNlcnZpY2UuZ2V0VXNlckJ5RW1haWwocmVnaXN0ZXJSZXF1ZXN0LmVtYWlsKTtcclxuICAgIFxyXG4gICAgaWYgKGV4aXN0aW5nVXNlcikge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDksICdVU0VSX0VYSVNUUycsICdBbiBhY2NvdW50IHdpdGggdGhpcyBlbWFpbCBhbHJlYWR5IGV4aXN0cycpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBuZXcgdXNlciBpbiBvdXIgc3lzdGVtIChpbnRlcm5hbCBhdXRoIC0gbm8gbjhuIGRlcGVuZGVuY3kpXHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgdXNlclNlcnZpY2UuY3JlYXRlVXNlcih7XHJcbiAgICAgIGVtYWlsOiByZWdpc3RlclJlcXVlc3QuZW1haWwsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiAnZGVmYXVsdC1vcmcnLFxyXG4gICAgICByb2xlOiAnZGV2ZWxvcGVyJyxcclxuICAgICAgcHJlZmVyZW5jZXM6IHtcclxuICAgICAgICB0aGVtZTogJ2xpZ2h0JyxcclxuICAgICAgICBub3RpZmljYXRpb25zOiB7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIHdlYmhvb2s6IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAxMicsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogUmVnaXN0ZXJSZXNwb25zZSA9IHtcclxuICAgICAgbWVzc2FnZTogJ1VzZXIgcmVnaXN0ZXJlZCBzdWNjZXNzZnVsbHkuIFBsZWFzZSB2ZXJpZnkgeW91ciBlbWFpbC4nLFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDEsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdSZWdpc3RlciBlcnJvcjonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59XHJcbiJdfQ==