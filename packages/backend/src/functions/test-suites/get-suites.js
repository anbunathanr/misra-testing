"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_suite_service_1 = require("../../services/test-suite-service");
const auth_util_1 = require("../../utils/auth-util");
const testSuiteService = new test_suite_service_1.TestSuiteService();
const handler = async (event) => {
    console.log('Get test suites request', { path: event.path });
    try {
        // Extract user from request context (populated by Lambda Authorizer)
        const user = await (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'User context not found',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        const projectId = event.queryStringParameters?.projectId;
        let suites;
        if (projectId) {
            suites = await testSuiteService.getProjectTestSuites(projectId);
        }
        else {
            suites = await testSuiteService.getUserTestSuites(user.userId);
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(suites),
        };
    }
    catch (error) {
        console.error('Error getting test suites', { error });
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to get test suites',
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXN1aXRlcy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1zdWl0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsMEVBQXFFO0FBQ3JFLHFEQUEyRDtBQUUzRCxNQUFNLGdCQUFnQixHQUFHLElBQUkscUNBQWdCLEVBQUUsQ0FBQztBQUV6QyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRTdELElBQUksQ0FBQztRQUNILHFFQUFxRTtRQUNyRSxNQUFNLElBQUksR0FBRyxNQUFNLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFPLEVBQUUsd0JBQXdCO3dCQUNqQyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7cUJBQ3BDO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxTQUFTLENBQUM7UUFFekQsSUFBSSxNQUFNLENBQUM7UUFDWCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2QsTUFBTSxHQUFHLE1BQU0sZ0JBQWdCLENBQUMsb0JBQW9CLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbEUsQ0FBQzthQUFNLENBQUM7WUFDTixNQUFNLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUVELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO1NBQzdCLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3RELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLEtBQUssRUFBRTtvQkFDTCxJQUFJLEVBQUUsZ0JBQWdCO29CQUN0QixPQUFPLEVBQUUsMkJBQTJCO29CQUNwQyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7aUJBQ3BDO2FBQ0YsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBMURXLFFBQUEsT0FBTyxXQTBEbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFRlc3RTdWl0ZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LXN1aXRlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuY29uc3QgdGVzdFN1aXRlU2VydmljZSA9IG5ldyBUZXN0U3VpdGVTZXJ2aWNlKCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHZXQgdGVzdCBzdWl0ZXMgcmVxdWVzdCcsIHsgcGF0aDogZXZlbnQucGF0aCB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIHJlcXVlc3QgY29udGV4dCAocG9wdWxhdGVkIGJ5IExhbWJkYSBBdXRob3JpemVyKVxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcblxyXG4gICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdVTkFVVEhPUklaRUQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnVXNlciBjb250ZXh0IG5vdCBmb3VuZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBwcm9qZWN0SWQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnByb2plY3RJZDtcclxuXHJcbiAgICBsZXQgc3VpdGVzO1xyXG4gICAgaWYgKHByb2plY3RJZCkge1xyXG4gICAgICBzdWl0ZXMgPSBhd2FpdCB0ZXN0U3VpdGVTZXJ2aWNlLmdldFByb2plY3RUZXN0U3VpdGVzKHByb2plY3RJZCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBzdWl0ZXMgPSBhd2FpdCB0ZXN0U3VpdGVTZXJ2aWNlLmdldFVzZXJUZXN0U3VpdGVzKHVzZXIudXNlcklkKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHN1aXRlcyksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHRlc3Qgc3VpdGVzJywgeyBlcnJvciB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5URVJOQUxfRVJST1InLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBnZXQgdGVzdCBzdWl0ZXMnLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19