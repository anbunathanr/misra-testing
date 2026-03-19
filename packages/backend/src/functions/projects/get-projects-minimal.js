"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const handler = async (event) => {
    try {
        const authHeader = event.headers?.authorization || event.headers?.Authorization;
        if (!authHeader) {
            return {
                statusCode: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Unauthorized' }),
            };
        }
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                projects: [
                    {
                        projectId: 'demo-1',
                        name: 'E-Commerce Platform',
                        description: 'Test automation for e-commerce',
                        targetUrl: 'https://example.com',
                        environment: 'dev',
                        createdAt: Math.floor(Date.now() / 1000),
                        updatedAt: Math.floor(Date.now() / 1000),
                    },
                ],
            }),
        };
    }
    catch (error) {
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projects: [] }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXByb2plY3RzLW1pbmltYWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtcHJvamVjdHMtbWluaW1hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFFTyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBNkIsRUFBb0MsRUFBRTtJQUMvRixJQUFJLENBQUM7UUFDSCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLGFBQWEsQ0FBQztRQUNoRixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGNBQWMsRUFBRSxDQUFDO2FBQ2hELENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO1lBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixRQUFRLEVBQUU7b0JBQ1I7d0JBQ0UsU0FBUyxFQUFFLFFBQVE7d0JBQ25CLElBQUksRUFBRSxxQkFBcUI7d0JBQzNCLFdBQVcsRUFBRSxnQ0FBZ0M7d0JBQzdDLFNBQVMsRUFBRSxxQkFBcUI7d0JBQ2hDLFdBQVcsRUFBRSxLQUFLO3dCQUNsQixTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO3dCQUN4QyxTQUFTLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO3FCQUN6QztpQkFDRjthQUNGLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLENBQUM7U0FDdkMsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFuQ1csUUFBQSxPQUFPLFdBbUNsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50VjIsIEFQSUdhdGV3YXlQcm94eVJlc3VsdFYyIH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRWMik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0VjI+ID0+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgYXV0aEhlYWRlciA9IGV2ZW50LmhlYWRlcnM/LmF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycz8uQXV0aG9yaXphdGlvbjtcclxuICAgIGlmICghYXV0aEhlYWRlcikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVW5hdXRob3JpemVkJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgcHJvamVjdHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgcHJvamVjdElkOiAnZGVtby0xJyxcclxuICAgICAgICAgICAgbmFtZTogJ0UtQ29tbWVyY2UgUGxhdGZvcm0nLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Rlc3QgYXV0b21hdGlvbiBmb3IgZS1jb21tZXJjZScsXHJcbiAgICAgICAgICAgIHRhcmdldFVybDogJ2h0dHBzOi8vZXhhbXBsZS5jb20nLFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDogJ2RldicsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBwcm9qZWN0czogW10gfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19