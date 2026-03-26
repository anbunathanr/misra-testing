"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    try {
        console.log('Event:', JSON.stringify(event));
        // Extract token
        const authHeader = event.headers.Authorization || event.headers.authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing Authorization header' }),
            };
        }
        // For now, just return mock data to test the flow
        const userId = 'test-user-123';
        const input = JSON.parse(event.body || '{}');
        // Create project with mock data
        const project = {
            projectId: `proj-${Date.now()}`,
            userId,
            name: input.name || 'New Project',
            description: input.description || '',
            targetUrl: input.targetUrl || '',
            environment: input.environment || 'dev',
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
        };
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
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2plY3Qtc2ltcGxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY3JlYXRlLXByb2plY3Qtc2ltcGxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVPLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUU3QyxnQkFBZ0I7UUFDaEIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7UUFDOUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtnQkFDbkYsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsOEJBQThCLEVBQUUsQ0FBQzthQUNoRSxDQUFDO1FBQ0osQ0FBQztRQUVELGtEQUFrRDtRQUNsRCxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUM7UUFDL0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBRTdDLGdDQUFnQztRQUNoQyxNQUFNLE9BQU8sR0FBRztZQUNkLFNBQVMsRUFBRSxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMvQixNQUFNO1lBQ04sSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksYUFBYTtZQUNqQyxXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVcsSUFBSSxFQUFFO1lBQ3BDLFNBQVMsRUFBRSxLQUFLLENBQUMsU0FBUyxJQUFJLEVBQUU7WUFDaEMsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksS0FBSztZQUN2QyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQ3hDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7U0FDekMsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7WUFDbkYsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1NBQzlCLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtZQUNuRixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLHVCQUF1QjtnQkFDOUIsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBOUNXLFFBQUEsT0FBTyxXQThDbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zb2xlLmxvZygnRXZlbnQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQpKTtcclxuXHJcbiAgICAvLyBFeHRyYWN0IHRva2VuXHJcbiAgICBjb25zdCBhdXRoSGVhZGVyID0gZXZlbnQuaGVhZGVycy5BdXRob3JpemF0aW9uIHx8IGV2ZW50LmhlYWRlcnMuYXV0aG9yaXphdGlvbjtcclxuICAgIGlmICghYXV0aEhlYWRlcikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBBdXRob3JpemF0aW9uIGhlYWRlcicgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRm9yIG5vdywganVzdCByZXR1cm4gbW9jayBkYXRhIHRvIHRlc3QgdGhlIGZsb3dcclxuICAgIGNvbnN0IHVzZXJJZCA9ICd0ZXN0LXVzZXItMTIzJztcclxuICAgIGNvbnN0IGlucHV0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBwcm9qZWN0IHdpdGggbW9jayBkYXRhXHJcbiAgICBjb25zdCBwcm9qZWN0ID0ge1xyXG4gICAgICBwcm9qZWN0SWQ6IGBwcm9qLSR7RGF0ZS5ub3coKX1gLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIG5hbWU6IGlucHV0Lm5hbWUgfHwgJ05ldyBQcm9qZWN0JyxcclxuICAgICAgZGVzY3JpcHRpb246IGlucHV0LmRlc2NyaXB0aW9uIHx8ICcnLFxyXG4gICAgICB0YXJnZXRVcmw6IGlucHV0LnRhcmdldFVybCB8fCAnJyxcclxuICAgICAgZW52aXJvbm1lbnQ6IGlucHV0LmVudmlyb25tZW50IHx8ICdkZXYnLFxyXG4gICAgICBjcmVhdGVkQXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICB1cGRhdGVkQXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDEsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJywgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwcm9qZWN0KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNyZWF0aW5nIHByb2plY3Q6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19