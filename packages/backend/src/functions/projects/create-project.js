"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const project_service_1 = require("../../services/project-service");
const jwt_service_1 = require("../../services/auth/jwt-service");
const projectService = new project_service_1.ProjectService();
const jwtService = new jwt_service_1.JWTService();
const handler = async (event) => {
    try {
        // Extract token from Authorization header
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing Authorization header' }),
            };
        }
        // Verify JWT token
        const token = authHeader.substring(7);
        let tokenPayload;
        try {
            tokenPayload = await jwtService.verifyAccessToken(token);
        }
        catch (error) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Invalid or expired token' }),
            };
        }
        const input = JSON.parse(event.body || '{}');
        // Validation
        if (!input.name || !input.targetUrl || !input.environment) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing required fields: name, targetUrl, environment' }),
            };
        }
        // Create project input
        const createInput = {
            name: input.name,
            description: input.description || '',
            targetUrl: input.targetUrl,
            environment: input.environment,
        };
        // Create project using service
        const project = await projectService.createProject(tokenPayload.userId, createInput);
        return {
            statusCode: 201,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(project),
        };
    }
    catch (error) {
        console.error('Error creating project:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmVhdGUtcHJvamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvRUFBZ0U7QUFDaEUsaUVBQTZEO0FBRzdELE1BQU0sY0FBYyxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO0FBQzVDLE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsRUFBRSxDQUFDO0FBRTdCLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILDBDQUEwQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO2dCQUNuRixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSw4QkFBOEIsRUFBRSxDQUFDO2FBQ2hFLENBQUM7UUFDSixDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLE1BQU0sS0FBSyxHQUFHLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEMsSUFBSSxZQUFZLENBQUM7UUFFakIsSUFBSSxDQUFDO1lBQ0gsWUFBWSxHQUFHLE1BQU0sVUFBVSxDQUFDLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO2dCQUNuRixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSwwQkFBMEIsRUFBRSxDQUFDO2FBQzVELENBQUM7UUFDSixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBRTdDLGFBQWE7UUFDYixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDMUQsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO2dCQUNuRixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSx1REFBdUQsRUFBRSxDQUFDO2FBQ3pGLENBQUM7UUFDSixDQUFDO1FBRUQsdUJBQXVCO1FBQ3ZCLE1BQU0sV0FBVyxHQUF1QjtZQUN0QyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksRUFBRTtZQUNwQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1NBQy9CLENBQUM7UUFFRiwrQkFBK0I7UUFDL0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxjQUFjLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFckYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtZQUNuRixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7U0FDOUIsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1lBQ25GLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUM7U0FDekQsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE3RFcsUUFBQSxPQUFPLFdBNkRsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUHJvamVjdFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9wcm9qZWN0LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBKV1RTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXV0aC9qd3Qtc2VydmljZSc7XHJcbmltcG9ydCB7IENyZWF0ZVByb2plY3RJbnB1dCB9IGZyb20gJy4uLy4uL3R5cGVzL3Rlc3QtcHJvamVjdCc7XHJcblxyXG5jb25zdCBwcm9qZWN0U2VydmljZSA9IG5ldyBQcm9qZWN0U2VydmljZSgpO1xyXG5jb25zdCBqd3RTZXJ2aWNlID0gbmV3IEpXVFNlcnZpY2UoKTtcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgdG9rZW4gZnJvbSBBdXRob3JpemF0aW9uIGhlYWRlclxyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzLmF1dGhvcml6YXRpb247XHJcbiAgICBpZiAoIWF1dGhIZWFkZXIpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLCAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgQXV0aG9yaXphdGlvbiBoZWFkZXInIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZlcmlmeSBKV1QgdG9rZW5cclxuICAgIGNvbnN0IHRva2VuID0gYXV0aEhlYWRlci5zdWJzdHJpbmcoNyk7XHJcbiAgICBsZXQgdG9rZW5QYXlsb2FkO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICB0b2tlblBheWxvYWQgPSBhd2FpdCBqd3RTZXJ2aWNlLnZlcmlmeUFjY2Vzc1Rva2VuKHRva2VuKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJywgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIG9yIGV4cGlyZWQgdG9rZW4nIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGlucHV0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRpb25cclxuICAgIGlmICghaW5wdXQubmFtZSB8fCAhaW5wdXQudGFyZ2V0VXJsIHx8ICFpbnB1dC5lbnZpcm9ubWVudCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBmaWVsZHM6IG5hbWUsIHRhcmdldFVybCwgZW52aXJvbm1lbnQnIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBwcm9qZWN0IGlucHV0XHJcbiAgICBjb25zdCBjcmVhdGVJbnB1dDogQ3JlYXRlUHJvamVjdElucHV0ID0ge1xyXG4gICAgICBuYW1lOiBpbnB1dC5uYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogaW5wdXQuZGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgIHRhcmdldFVybDogaW5wdXQudGFyZ2V0VXJsLFxyXG4gICAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIENyZWF0ZSBwcm9qZWN0IHVzaW5nIHNlcnZpY2VcclxuICAgIGNvbnN0IHByb2plY3QgPSBhd2FpdCBwcm9qZWN0U2VydmljZS5jcmVhdGVQcm9qZWN0KHRva2VuUGF5bG9hZC51c2VySWQsIGNyZWF0ZUlucHV0KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDEsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJywgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwcm9qZWN0KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIHByb2plY3Q6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19