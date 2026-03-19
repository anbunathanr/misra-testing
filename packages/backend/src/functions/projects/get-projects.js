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
        // Return demo projects for working demo
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                projects: [
                    {
                        projectId: 'demo-proj-1',
                        name: 'E-Commerce Platform',
                        description: 'Test automation for e-commerce site',
                        targetUrl: 'https://example-ecommerce.com',
                        environment: 'dev',
                        createdAt: Math.floor(Date.now() / 1000),
                        updatedAt: Math.floor(Date.now() / 1000),
                    },
                    {
                        projectId: 'demo-proj-2',
                        name: 'Social Media App',
                        description: 'Test automation for social platform',
                        targetUrl: 'https://example-social.com',
                        environment: 'staging',
                        createdAt: Math.floor(Date.now() / 1000),
                        updatedAt: Math.floor(Date.now() / 1000),
                    },
                ]
            }),
        };
    }
    catch (error) {
        console.error('Error getting projects:', error);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ projects: [] }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXByb2plY3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXByb2plY3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVPLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILDBDQUEwQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUM5RSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO2dCQUNuRixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSw4QkFBOEIsRUFBRSxDQUFDO2FBQ2hFLENBQUM7UUFDSixDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLFFBQVEsRUFBRTtvQkFDUjt3QkFDRSxTQUFTLEVBQUUsYUFBYTt3QkFDeEIsSUFBSSxFQUFFLHFCQUFxQjt3QkFDM0IsV0FBVyxFQUFFLHFDQUFxQzt3QkFDbEQsU0FBUyxFQUFFLCtCQUErQjt3QkFDMUMsV0FBVyxFQUFFLEtBQUs7d0JBQ2xCLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7d0JBQ3hDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7cUJBQ3pDO29CQUNEO3dCQUNFLFNBQVMsRUFBRSxhQUFhO3dCQUN4QixJQUFJLEVBQUUsa0JBQWtCO3dCQUN4QixXQUFXLEVBQUUscUNBQXFDO3dCQUNsRCxTQUFTLEVBQUUsNEJBQTRCO3dCQUN2QyxXQUFXLEVBQUUsU0FBUzt3QkFDdEIsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQzt3QkFDeEMsU0FBUyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztxQkFDekM7aUJBQ0Y7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNoRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDO1NBQ3ZDLENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBckRXLFFBQUEsT0FBTyxXQXFEbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHRva2VuIGZyb20gQXV0aG9yaXphdGlvbiBoZWFkZXJcclxuICAgIGNvbnN0IGF1dGhIZWFkZXIgPSBldmVudC5oZWFkZXJzLkF1dGhvcml6YXRpb24gfHwgZXZlbnQuaGVhZGVycy5hdXRob3JpemF0aW9uO1xyXG4gICAgaWYgKCFhdXRoSGVhZGVyKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJywgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNaXNzaW5nIEF1dGhvcml6YXRpb24gaGVhZGVyJyB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZXR1cm4gZGVtbyBwcm9qZWN0cyBmb3Igd29ya2luZyBkZW1vXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgXHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXHJcbiAgICAgICAgcHJvamVjdHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgcHJvamVjdElkOiAnZGVtby1wcm9qLTEnLFxyXG4gICAgICAgICAgICBuYW1lOiAnRS1Db21tZXJjZSBQbGF0Zm9ybScsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiAnVGVzdCBhdXRvbWF0aW9uIGZvciBlLWNvbW1lcmNlIHNpdGUnLFxyXG4gICAgICAgICAgICB0YXJnZXRVcmw6ICdodHRwczovL2V4YW1wbGUtZWNvbW1lcmNlLmNvbScsXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiAnZGV2JyxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSxcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHByb2plY3RJZDogJ2RlbW8tcHJvai0yJyxcclxuICAgICAgICAgICAgbmFtZTogJ1NvY2lhbCBNZWRpYSBBcHAnLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ1Rlc3QgYXV0b21hdGlvbiBmb3Igc29jaWFsIHBsYXRmb3JtJyxcclxuICAgICAgICAgICAgdGFyZ2V0VXJsOiAnaHR0cHM6Ly9leGFtcGxlLXNvY2lhbC5jb20nLFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDogJ3N0YWdpbmcnLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdIFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgcHJvamVjdHM6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7IFxyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJ1xyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHByb2plY3RzOiBbXSB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=