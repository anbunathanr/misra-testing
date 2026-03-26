"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const project_service_1 = require("../../services/project-service");
const auth_middleware_1 = require("../../middleware/auth-middleware");
const projectService = new project_service_1.ProjectService();
exports.handler = (0, auth_middleware_1.withAuth)(async (event) => {
    try {
        // ✅ Get authenticated user from middleware
        const user = (0, auth_middleware_1.getUser)(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Unauthorized' }),
            };
        }
        console.log("Authenticated user:", user.userId);
        // ✅ Fetch projects for this user
        const projects = await projectService.getUserProjects(user.userId);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ projects }),
        };
    }
    catch (error) {
        console.error('Error getting projects:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXByb2plY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXByb2plY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9FQUFnRTtBQUNoRSxzRUFBeUY7QUFFekYsTUFBTSxjQUFjLEdBQUcsSUFBSSxnQ0FBYyxFQUFFLENBQUM7QUFFL0IsUUFBQSxPQUFPLEdBQUcsSUFBQSwwQkFBUSxFQUFDLEtBQUssRUFBRSxLQUF5QixFQUFrQyxFQUFFO0lBQ2xHLElBQUksQ0FBQztRQUNILDJDQUEyQztRQUMzQyxNQUFNLElBQUksR0FBRyxJQUFBLHlCQUFPLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFFNUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUM7YUFDaEQsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoRCxpQ0FBaUM7UUFDakMsTUFBTSxRQUFRLEdBQUcsTUFBTSxjQUFjLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVuRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxFQUFFLENBQUM7U0FDbkMsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVoRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUM7U0FDekQsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBQcm9qZWN0U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Byb2plY3Qtc2VydmljZSc7XHJcbmltcG9ydCB7IHdpdGhBdXRoLCBBdXRoZW50aWNhdGVkRXZlbnQsIGdldFVzZXIgfSBmcm9tICcuLi8uLi9taWRkbGV3YXJlL2F1dGgtbWlkZGxld2FyZSc7XHJcblxyXG5jb25zdCBwcm9qZWN0U2VydmljZSA9IG5ldyBQcm9qZWN0U2VydmljZSgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSB3aXRoQXV0aChhc3luYyAoZXZlbnQ6IEF1dGhlbnRpY2F0ZWRFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIOKchSBHZXQgYXV0aGVudGljYXRlZCB1c2VyIGZyb20gbWlkZGxld2FyZVxyXG4gICAgY29uc3QgdXNlciA9IGdldFVzZXIoZXZlbnQpO1xyXG5cclxuICAgIGlmICghdXNlcikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7IFxyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdVbmF1dGhvcml6ZWQnIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKFwiQXV0aGVudGljYXRlZCB1c2VyOlwiLCB1c2VyLnVzZXJJZCk7XHJcblxyXG4gICAgLy8g4pyFIEZldGNoIHByb2plY3RzIGZvciB0aGlzIHVzZXJcclxuICAgIGNvbnN0IHByb2plY3RzID0gYXdhaXQgcHJvamVjdFNlcnZpY2UuZ2V0VXNlclByb2plY3RzKHVzZXIudXNlcklkKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgXHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgcHJvamVjdHMgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHByb2plY3RzOicsIGVycm9yKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgXHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn0pOyJdfQ==