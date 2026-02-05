"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const jwt_service_1 = require("../../services/auth/jwt-service");
const user_service_1 = require("../../services/user/user-service");
const jwtService = new jwt_service_1.JWTService();
const userService = new user_service_1.UserService();
const handler = async (event) => {
    try {
        // Parse request body
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const refreshRequest = JSON.parse(event.body);
        // Validate input
        if (!refreshRequest.refreshToken) {
            return errorResponse(400, 'INVALID_INPUT', 'Refresh token is required');
        }
        // Verify refresh token
        const tokenData = await jwtService.verifyRefreshToken(refreshRequest.refreshToken);
        // Get user data
        const user = await userService.getUserById(tokenData.userId);
        if (!user) {
            return errorResponse(401, 'USER_NOT_FOUND', 'User not found');
        }
        // Generate new access token
        const newTokens = await jwtService.refreshAccessToken(refreshRequest.refreshToken, {
            userId: user.userId,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
        });
        const response = {
            accessToken: newTokens.accessToken,
            expiresIn: newTokens.expiresIn,
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
        console.error('Token refresh error:', error);
        if (error instanceof Error) {
            if (error.message.includes('expired')) {
                return errorResponse(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token expired');
            }
            else if (error.message.includes('Invalid')) {
                return errorResponse(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
            }
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVmcmVzaC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJlZnJlc2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsaUVBQTZEO0FBQzdELG1FQUErRDtBQVkvRCxNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQztBQUNwQyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQztBQUUvQixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLDBCQUEwQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELE1BQU0sY0FBYyxHQUFtQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUU5RCxpQkFBaUI7UUFDakIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUNqQyxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLDJCQUEyQixDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUVELHVCQUF1QjtRQUN2QixNQUFNLFNBQVMsR0FBRyxNQUFNLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFbkYsZ0JBQWdCO1FBQ2hCLE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0QsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLGdCQUFnQixFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixNQUFNLFNBQVMsR0FBRyxNQUFNLFVBQVUsQ0FBQyxrQkFBa0IsQ0FDbkQsY0FBYyxDQUFDLFlBQVksRUFDM0I7WUFDRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07WUFDbkIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLO1lBQ2pCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNuQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7U0FDaEIsQ0FDRixDQUFDO1FBRUYsTUFBTSxRQUFRLEdBQW9CO1lBQ2hDLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVztZQUNsQyxTQUFTLEVBQUUsU0FBUyxDQUFDLFNBQVM7U0FDL0IsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2dCQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7YUFDN0Q7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUU3QyxJQUFJLEtBQUssWUFBWSxLQUFLLEVBQUUsQ0FBQztZQUMzQixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO1lBQzlFLENBQUM7aUJBQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQztZQUM5RSxDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7QUFDSCxDQUFDLENBQUM7QUFoRVcsUUFBQSxPQUFPLFdBZ0VsQjtBQUVGLFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZTtJQUVmLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1lBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtTQUM3RDtRQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXV0aC9qd3Qtc2VydmljZSc7XHJcbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdXNlci91c2VyLXNlcnZpY2UnO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9ucyAoYXZvaWRpbmcgc2hhcmVkIHBhY2thZ2UgaW1wb3J0IGlzc3VlcylcclxuaW50ZXJmYWNlIFJlZnJlc2hSZXF1ZXN0IHtcclxuICByZWZyZXNoVG9rZW46IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFJlZnJlc2hSZXNwb25zZSB7XHJcbiAgYWNjZXNzVG9rZW46IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuY29uc3Qgand0U2VydmljZSA9IG5ldyBKV1RTZXJ2aWNlKCk7XHJcbmNvbnN0IHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICB0cnkge1xyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19CT0RZJywgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hSZXF1ZXN0OiBSZWZyZXNoUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgaW5wdXRcclxuICAgIGlmICghcmVmcmVzaFJlcXVlc3QucmVmcmVzaFRva2VuKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfSU5QVVQnLCAnUmVmcmVzaCB0b2tlbiBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZlcmlmeSByZWZyZXNoIHRva2VuXHJcbiAgICBjb25zdCB0b2tlbkRhdGEgPSBhd2FpdCBqd3RTZXJ2aWNlLnZlcmlmeVJlZnJlc2hUb2tlbihyZWZyZXNoUmVxdWVzdC5yZWZyZXNoVG9rZW4pO1xyXG5cclxuICAgIC8vIEdldCB1c2VyIGRhdGFcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCB1c2VyU2VydmljZS5nZXRVc2VyQnlJZCh0b2tlbkRhdGEudXNlcklkKTtcclxuICAgIFxyXG4gICAgaWYgKCF1c2VyKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ1VTRVJfTk9UX0ZPVU5EJywgJ1VzZXIgbm90IGZvdW5kJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgbmV3IGFjY2VzcyB0b2tlblxyXG4gICAgY29uc3QgbmV3VG9rZW5zID0gYXdhaXQgand0U2VydmljZS5yZWZyZXNoQWNjZXNzVG9rZW4oXHJcbiAgICAgIHJlZnJlc2hSZXF1ZXN0LnJlZnJlc2hUb2tlbixcclxuICAgICAge1xyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgZW1haWw6IHVzZXIuZW1haWwsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgcm9sZTogdXNlci5yb2xlLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBSZWZyZXNoUmVzcG9uc2UgPSB7XHJcbiAgICAgIGFjY2Vzc1Rva2VuOiBuZXdUb2tlbnMuYWNjZXNzVG9rZW4sXHJcbiAgICAgIGV4cGlyZXNJbjogbmV3VG9rZW5zLmV4cGlyZXNJbixcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignVG9rZW4gcmVmcmVzaCBlcnJvcjonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdleHBpcmVkJykpIHtcclxuICAgICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdSRUZSRVNIX1RPS0VOX0VYUElSRUQnLCAnUmVmcmVzaCB0b2tlbiBleHBpcmVkJyk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnSW52YWxpZCcpKSB7XHJcbiAgICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnSU5WQUxJRF9SRUZSRVNIX1RPS0VOJywgJ0ludmFsaWQgcmVmcmVzaCB0b2tlbicpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ0lOVEVSTkFMX0VSUk9SJywgJ0ludGVybmFsIHNlcnZlciBlcnJvcicpO1xyXG4gIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19