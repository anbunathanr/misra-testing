"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const jwt_service_1 = require("../../services/auth/jwt-service");
const user_service_1 = require("../../services/user/user-service");
const jwtService = new jwt_service_1.JWTService();
const userService = new user_service_1.UserService();
const handler = async (event) => {
    try {
        // ✅ Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const loginRequest = JSON.parse(event.body);
        // ✅ Validate input
        if (!loginRequest.email || !loginRequest.password) {
            return errorResponse(400, 'INVALID_INPUT', 'Email and password are required');
        }
        // ✅ Mock authentication (bypass n8n)
        // For demo purposes, accept any email with password "123456"
        if (loginRequest.password !== "123456") {
            return errorResponse(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
        }
        // Create mock user object
        const mockUser = {
            email: loginRequest.email,
            organizationId: "test-org",
            role: "developer"
        };
        // ✅ Get or create user in DynamoDB
        let user = await userService.getUserByEmail(loginRequest.email);
        if (!user) {
            user = await userService.createUser({
                email: mockUser.email,
                organizationId: mockUser.organizationId,
                role: mockUser.role,
                preferences: {
                    theme: 'light',
                    notifications: {
                        email: true,
                        webhook: false,
                    },
                    defaultMisraRuleSet: 'MISRA_C_2012',
                },
            });
        }
        else {
            await userService.updateLastLogin(user.userId);
        }
        // ✅ Generate JWT tokens
        const tokenPair = await jwtService.generateTokenPair({
            userId: user.userId,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        });
        const response = {
            accessToken: tokenPair.accessToken,
            refreshToken: tokenPair.refreshToken,
            user,
            expiresIn: tokenPair.expiresIn,
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
        return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpRUFBNkQ7QUFDN0QsbUVBQStEO0FBZS9ELE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO0FBQ3BDLE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQVcsRUFBRSxDQUFDO0FBRS9CLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILHVCQUF1QjtRQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRTFELG1CQUFtQjtRQUNuQixJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsRCxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLGlDQUFpQyxDQUFDLENBQUM7UUFDaEYsQ0FBQztRQUVELHFDQUFxQztRQUNyQyw2REFBNkQ7UUFDN0QsSUFBSSxZQUFZLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxRQUFRLEdBQUc7WUFDZixLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7WUFDekIsY0FBYyxFQUFFLFVBQVU7WUFDMUIsSUFBSSxFQUFFLFdBQW9CO1NBQzNCLENBQUM7UUFFRixtQ0FBbUM7UUFDbkMsSUFBSSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVoRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsVUFBVSxDQUFDO2dCQUNsQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7Z0JBQ3JCLGNBQWMsRUFBRSxRQUFRLENBQUMsY0FBYztnQkFDdkMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxJQUFJO2dCQUNuQixXQUFXLEVBQUU7b0JBQ1gsS0FBSyxFQUFFLE9BQU87b0JBQ2QsYUFBYSxFQUFFO3dCQUNiLEtBQUssRUFBRSxJQUFJO3dCQUNYLE9BQU8sRUFBRSxLQUFLO3FCQUNmO29CQUNELG1CQUFtQixFQUFFLGNBQWM7aUJBQ3BDO2FBQ0YsQ0FBQyxDQUFDO1FBQ0wsQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLFdBQVcsQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsTUFBTSxTQUFTLEdBQUcsTUFBTSxVQUFVLENBQUMsaUJBQWlCLENBQUM7WUFDbkQsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDbkMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO1NBQ2hCLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFrQjtZQUM5QixXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVc7WUFDbEMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO1lBQ3BDLElBQUk7WUFDSixTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVM7U0FDL0IsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2dCQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7YUFDN0Q7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUVKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFckMsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDdkUsQ0FBQztBQUNILENBQUMsQ0FBQztBQWhGVyxRQUFBLE9BQU8sV0FnRmxCO0FBRUYsNEJBQTRCO0FBQzVCLFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZTtJQUVmLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1lBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtTQUM3RDtRQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXV0aC9qd3Qtc2VydmljZSc7XHJcbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdXNlci91c2VyLXNlcnZpY2UnO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9uc1xyXG5pbnRlcmZhY2UgTG9naW5SZXF1ZXN0IHtcclxuICBlbWFpbDogc3RyaW5nO1xyXG4gIHBhc3N3b3JkOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBMb2dpblJlc3BvbnNlIHtcclxuICBhY2Nlc3NUb2tlbjogc3RyaW5nO1xyXG4gIHJlZnJlc2hUb2tlbjogc3RyaW5nO1xyXG4gIHVzZXI6IGFueTtcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuY29uc3Qgand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKCk7XHJcbmNvbnN0IHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICB0cnkge1xyXG4gICAgLy8g4pyFIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBsb2dpblJlcXVlc3Q6IExvZ2luUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8g4pyFIFZhbGlkYXRlIGlucHV0XHJcbiAgICBpZiAoIWxvZ2luUmVxdWVzdC5lbWFpbCB8fCAhbG9naW5SZXF1ZXN0LnBhc3N3b3JkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnRW1haWwgYW5kIHBhc3N3b3JkIGFyZSByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKchSBNb2NrIGF1dGhlbnRpY2F0aW9uIChieXBhc3MgbjhuKVxyXG4gICAgLy8gRm9yIGRlbW8gcHVycG9zZXMsIGFjY2VwdCBhbnkgZW1haWwgd2l0aCBwYXNzd29yZCBcIjEyMzQ1NlwiXHJcbiAgICBpZiAobG9naW5SZXF1ZXN0LnBhc3N3b3JkICE9PSBcIjEyMzQ1NlwiKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ0lOVkFMSURfQ1JFREVOVElBTFMnLCAnSW52YWxpZCBlbWFpbCBvciBwYXNzd29yZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBtb2NrIHVzZXIgb2JqZWN0XHJcbiAgICBjb25zdCBtb2NrVXNlciA9IHtcclxuICAgICAgZW1haWw6IGxvZ2luUmVxdWVzdC5lbWFpbCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IFwidGVzdC1vcmdcIixcclxuICAgICAgcm9sZTogXCJkZXZlbG9wZXJcIiBhcyBjb25zdFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyDinIUgR2V0IG9yIGNyZWF0ZSB1c2VyIGluIER5bmFtb0RCXHJcbiAgICBsZXQgdXNlciA9IGF3YWl0IHVzZXJTZXJ2aWNlLmdldFVzZXJCeUVtYWlsKGxvZ2luUmVxdWVzdC5lbWFpbCk7XHJcblxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIHVzZXIgPSBhd2FpdCB1c2VyU2VydmljZS5jcmVhdGVVc2VyKHtcclxuICAgICAgICBlbWFpbDogbW9ja1VzZXIuZW1haWwsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IG1vY2tVc2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIHJvbGU6IG1vY2tVc2VyLnJvbGUsXHJcbiAgICAgICAgcHJlZmVyZW5jZXM6IHtcclxuICAgICAgICAgIHRoZW1lOiAnbGlnaHQnLFxyXG4gICAgICAgICAgbm90aWZpY2F0aW9uczoge1xyXG4gICAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgICAgd2ViaG9vazogZmFsc2UsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZGVmYXVsdE1pc3JhUnVsZVNldDogJ01JU1JBX0NfMjAxMicsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBhd2FpdCB1c2VyU2VydmljZS51cGRhdGVMYXN0TG9naW4odXNlci51c2VySWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIOKchSBHZW5lcmF0ZSBKV1QgdG9rZW5zXHJcbiAgICBjb25zdCB0b2tlblBhaXIgPSBhd2FpdCBqd3RTZXJ2aWNlLmdlbmVyYXRlVG9rZW5QYWlyKHtcclxuICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgZW1haWw6IHVzZXIuZW1haWwsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICByb2xlOiB1c2VyLnJvbGUsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogTG9naW5SZXNwb25zZSA9IHtcclxuICAgICAgYWNjZXNzVG9rZW46IHRva2VuUGFpci5hY2Nlc3NUb2tlbixcclxuICAgICAgcmVmcmVzaFRva2VuOiB0b2tlblBhaXIucmVmcmVzaFRva2VuLFxyXG4gICAgICB1c2VyLFxyXG4gICAgICBleHBpcmVzSW46IHRva2VuUGFpci5leHBpcmVzSW4sXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdMb2dpbiBlcnJvcjonLCBlcnJvcik7XHJcblxyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnSU5URVJOQUxfRVJST1InLCAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuLy8g4pyFIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19