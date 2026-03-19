"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
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
        const input = JSON.parse(event.body || '{}');
        // Validation
        if (!input.name || !input.targetUrl || !input.environment) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                body: JSON.stringify({ error: 'Missing required fields: name, targetUrl, environment' }),
            };
        }
        // Return success with created project
        const project = {
            projectId: `proj-${Date.now()}`,
            name: input.name,
            description: input.description || '',
            targetUrl: input.targetUrl,
            environment: input.environment,
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
            body: JSON.stringify({ error: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlLXByb2plY3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjcmVhdGUtcHJvamVjdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFTyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixJQUFJLENBQUM7UUFDSCwwQ0FBMEM7UUFDMUMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUM7UUFDOUUsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtnQkFDbkYsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsOEJBQThCLEVBQUUsQ0FBQzthQUNoRSxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUU3QyxhQUFhO1FBQ2IsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzFELE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtnQkFDbkYsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsdURBQXVELEVBQUUsQ0FBQzthQUN6RixDQUFDO1FBQ0osQ0FBQztRQUVELHNDQUFzQztRQUN0QyxNQUFNLE9BQU8sR0FBRztZQUNkLFNBQVMsRUFBRSxRQUFRLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMvQixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXLElBQUksRUFBRTtZQUNwQyxTQUFTLEVBQUUsS0FBSyxDQUFDLFNBQVM7WUFDMUIsV0FBVyxFQUFFLEtBQUssQ0FBQyxXQUFXO1lBQzlCLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7WUFDeEMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztTQUN6QyxDQUFDO1FBRUYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtZQUNuRixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUM7U0FDOUIsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1lBQ25GLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHVCQUF1QixFQUFFLENBQUM7U0FDekQsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUEvQ1csUUFBQSxPQUFPLFdBK0NsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgdG9rZW4gZnJvbSBBdXRob3JpemF0aW9uIGhlYWRlclxyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnMuQXV0aG9yaXphdGlvbiB8fCBldmVudC5oZWFkZXJzLmF1dGhvcml6YXRpb247XHJcbiAgICBpZiAoIWF1dGhIZWFkZXIpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLCAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ01pc3NpbmcgQXV0aG9yaXphdGlvbiBoZWFkZXInIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGlucHV0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRpb25cclxuICAgIGlmICghaW5wdXQubmFtZSB8fCAhaW5wdXQudGFyZ2V0VXJsIHx8ICFpbnB1dC5lbnZpcm9ubWVudCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyByZXF1aXJlZCBmaWVsZHM6IG5hbWUsIHRhcmdldFVybCwgZW52aXJvbm1lbnQnIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJldHVybiBzdWNjZXNzIHdpdGggY3JlYXRlZCBwcm9qZWN0XHJcbiAgICBjb25zdCBwcm9qZWN0ID0ge1xyXG4gICAgICBwcm9qZWN0SWQ6IGBwcm9qLSR7RGF0ZS5ub3coKX1gLFxyXG4gICAgICBuYW1lOiBpbnB1dC5uYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogaW5wdXQuZGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgIHRhcmdldFVybDogaW5wdXQudGFyZ2V0VXJsLFxyXG4gICAgICBlbnZpcm9ubWVudDogaW5wdXQuZW52aXJvbm1lbnQsXHJcbiAgICAgIGNyZWF0ZWRBdDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgIHVwZGF0ZWRBdDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMSxcclxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLCAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHByb2plY3QpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY3JlYXRpbmcgcHJvamVjdDonLCBlcnJvcik7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJywgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=