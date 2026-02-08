"use strict";
/**
 * Get User Profile Lambda Function
 * Demonstrates RBAC middleware usage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const jwt_service_1 = require("../../services/auth/jwt-service");
const user_service_1 = require("../../services/user/user-service");
const rbac_middleware_1 = require("../../middleware/rbac-middleware");
const jwtService = new jwt_service_1.JWTService();
const userService = new user_service_1.UserService();
const handler = async (event) => {
    try {
        // Extract and verify JWT token
        const authHeader = event.headers.Authorization || event.headers.authorization;
        const token = jwtService.extractTokenFromHeader(authHeader);
        if (!token) {
            return errorResponse(401, 'MISSING_TOKEN', 'Authorization token required');
        }
        // Verify token
        let user;
        try {
            user = await jwtService.verifyAccessToken(token);
        }
        catch (error) {
            return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token');
        }
        // Check permission to read users
        const permissionError = (0, rbac_middleware_1.checkPermission)(user, 'users', 'read');
        if (permissionError) {
            return permissionError;
        }
        // Get userId from path parameters
        const userId = event.pathParameters?.userId || user.userId;
        // If requesting another user's profile, check ownership
        if (userId !== user.userId) {
            const ownershipError = (0, rbac_middleware_1.checkOwnership)(user, userId);
            if (ownershipError) {
                return ownershipError;
            }
        }
        // Get user profile
        const userProfile = await userService.getUserById(userId);
        if (!userProfile) {
            return errorResponse(404, 'USER_NOT_FOUND', 'User not found');
        }
        // Remove sensitive data before returning
        const safeProfile = {
            userId: userProfile.userId,
            email: userProfile.email,
            organizationId: userProfile.organizationId,
            role: userProfile.role,
            preferences: userProfile.preferences,
            createdAt: userProfile.createdAt,
            lastLoginAt: userProfile.lastLoginAt,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(safeProfile),
        };
    }
    catch (error) {
        console.error('Get profile error:', error);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXByb2ZpbGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcHJvZmlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFHSCxpRUFBd0U7QUFDeEUsbUVBQThEO0FBQzlELHNFQUFrRjtBQUVsRixNQUFNLFVBQVUsR0FBRyxJQUFJLHdCQUFVLEVBQUUsQ0FBQTtBQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLEVBQUUsQ0FBQTtBQUU5QixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCwrQkFBK0I7UUFDL0IsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUE7UUFDN0UsTUFBTSxLQUFLLEdBQUcsVUFBVSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTNELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNYLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxlQUFlLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtRQUM1RSxDQUFDO1FBRUQsZUFBZTtRQUNmLElBQUksSUFBZ0IsQ0FBQTtRQUNwQixJQUFJLENBQUM7WUFDSCxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZUFBZSxFQUFFLDBCQUEwQixDQUFDLENBQUE7UUFDeEUsQ0FBQztRQUVELGlDQUFpQztRQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFBLGlDQUFlLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5RCxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3BCLE9BQU8sZUFBZSxDQUFBO1FBQ3hCLENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUUxRCx3REFBd0Q7UUFDeEQsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzNCLE1BQU0sY0FBYyxHQUFHLElBQUEsZ0NBQWMsRUFBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDbkQsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxjQUFjLENBQUE7WUFDdkIsQ0FBQztRQUNILENBQUM7UUFFRCxtQkFBbUI7UUFDbkIsTUFBTSxXQUFXLEdBQUcsTUFBTSxXQUFXLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRXpELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUMvRCxDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHO1lBQ2xCLE1BQU0sRUFBRSxXQUFXLENBQUMsTUFBTTtZQUMxQixLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUs7WUFDeEIsY0FBYyxFQUFFLFdBQVcsQ0FBQyxjQUFjO1lBQzFDLElBQUksRUFBRSxXQUFXLENBQUMsSUFBSTtZQUN0QixXQUFXLEVBQUUsV0FBVyxDQUFDLFdBQVc7WUFDcEMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxTQUFTO1lBQ2hDLFdBQVcsRUFBRSxXQUFXLENBQUMsV0FBVztTQUNyQyxDQUFBO1FBRUQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjthQUM3RDtZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQztTQUNsQyxDQUFBO0lBQ0gsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzFDLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxnQkFBZ0IsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3RFLENBQUM7QUFDSCxDQUFDLENBQUE7QUFwRVksUUFBQSxPQUFPLFdBb0VuQjtBQUVELFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZTtJQUVmLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1lBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtTQUM3RDtRQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUE7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEdldCBVc2VyIFByb2ZpbGUgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIERlbW9uc3RyYXRlcyBSQkFDIG1pZGRsZXdhcmUgdXNhZ2VcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSdcclxuaW1wb3J0IHsgSldUU2VydmljZSwgSldUUGF5bG9hZCB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1dGgvand0LXNlcnZpY2UnXHJcbmltcG9ydCB7IFVzZXJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdXNlci91c2VyLXNlcnZpY2UnXHJcbmltcG9ydCB7IGNoZWNrUGVybWlzc2lvbiwgY2hlY2tPd25lcnNoaXAgfSBmcm9tICcuLi8uLi9taWRkbGV3YXJlL3JiYWMtbWlkZGxld2FyZSdcclxuXHJcbmNvbnN0IGp3dFNlcnZpY2UgPSBuZXcgSldUU2VydmljZSgpXHJcbmNvbnN0IHVzZXJTZXJ2aWNlID0gbmV3IFVzZXJTZXJ2aWNlKClcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IGFuZCB2ZXJpZnkgSldUIHRva2VuXHJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gZXZlbnQuaGVhZGVycy5BdXRob3JpemF0aW9uIHx8IGV2ZW50LmhlYWRlcnMuYXV0aG9yaXphdGlvblxyXG4gICAgY29uc3QgdG9rZW4gPSBqd3RTZXJ2aWNlLmV4dHJhY3RUb2tlbkZyb21IZWFkZXIoYXV0aEhlYWRlcilcclxuXHJcbiAgICBpZiAoIXRva2VuKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ01JU1NJTkdfVE9LRU4nLCAnQXV0aG9yaXphdGlvbiB0b2tlbiByZXF1aXJlZCcpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmVyaWZ5IHRva2VuXHJcbiAgICBsZXQgdXNlcjogSldUUGF5bG9hZFxyXG4gICAgdHJ5IHtcclxuICAgICAgdXNlciA9IGF3YWl0IGp3dFNlcnZpY2UudmVyaWZ5QWNjZXNzVG9rZW4odG9rZW4pXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdJTlZBTElEX1RPS0VOJywgJ0ludmFsaWQgb3IgZXhwaXJlZCB0b2tlbicpXHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgcGVybWlzc2lvbiB0byByZWFkIHVzZXJzXHJcbiAgICBjb25zdCBwZXJtaXNzaW9uRXJyb3IgPSBjaGVja1Blcm1pc3Npb24odXNlciwgJ3VzZXJzJywgJ3JlYWQnKVxyXG4gICAgaWYgKHBlcm1pc3Npb25FcnJvcikge1xyXG4gICAgICByZXR1cm4gcGVybWlzc2lvbkVycm9yXHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IHVzZXJJZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xyXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnVzZXJJZCB8fCB1c2VyLnVzZXJJZFxyXG5cclxuICAgIC8vIElmIHJlcXVlc3RpbmcgYW5vdGhlciB1c2VyJ3MgcHJvZmlsZSwgY2hlY2sgb3duZXJzaGlwXHJcbiAgICBpZiAodXNlcklkICE9PSB1c2VyLnVzZXJJZCkge1xyXG4gICAgICBjb25zdCBvd25lcnNoaXBFcnJvciA9IGNoZWNrT3duZXJzaGlwKHVzZXIsIHVzZXJJZClcclxuICAgICAgaWYgKG93bmVyc2hpcEVycm9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG93bmVyc2hpcEVycm9yXHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgdXNlciBwcm9maWxlXHJcbiAgICBjb25zdCB1c2VyUHJvZmlsZSA9IGF3YWl0IHVzZXJTZXJ2aWNlLmdldFVzZXJCeUlkKHVzZXJJZClcclxuXHJcbiAgICBpZiAoIXVzZXJQcm9maWxlKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ1VTRVJfTk9UX0ZPVU5EJywgJ1VzZXIgbm90IGZvdW5kJylcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZW1vdmUgc2Vuc2l0aXZlIGRhdGEgYmVmb3JlIHJldHVybmluZ1xyXG4gICAgY29uc3Qgc2FmZVByb2ZpbGUgPSB7XHJcbiAgICAgIHVzZXJJZDogdXNlclByb2ZpbGUudXNlcklkLFxyXG4gICAgICBlbWFpbDogdXNlclByb2ZpbGUuZW1haWwsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyUHJvZmlsZS5vcmdhbml6YXRpb25JZCxcclxuICAgICAgcm9sZTogdXNlclByb2ZpbGUucm9sZSxcclxuICAgICAgcHJlZmVyZW5jZXM6IHVzZXJQcm9maWxlLnByZWZlcmVuY2VzLFxyXG4gICAgICBjcmVhdGVkQXQ6IHVzZXJQcm9maWxlLmNyZWF0ZWRBdCxcclxuICAgICAgbGFzdExvZ2luQXQ6IHVzZXJQcm9maWxlLmxhc3RMb2dpbkF0LFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHNhZmVQcm9maWxlKSxcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignR2V0IHByb2ZpbGUgZXJyb3I6JywgZXJyb3IpXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdJTlRFUk5BTF9FUlJPUicsICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InKVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIH1cclxufVxyXG4iXX0=