"use strict";
/**
 * Get Execution History Lambda
 *
 * Endpoint: GET /api/executions/history
 *
 * Query Parameters:
 * - projectId (required)
 * - testCaseId (optional)
 * - testSuiteId (optional)
 * - startDate (optional)
 * - endDate (optional)
 * - limit (optional, default 50)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
const auth_middleware_1 = require("../../middleware/auth-middleware");
exports.handler = (0, auth_middleware_1.withAuthAndPermission)('tests', 'read', async (event) => {
    console.log('Get execution history request:', JSON.stringify({
        queryStringParameters: event.queryStringParameters,
    }));
    try {
        // Parse query parameters
        const projectId = event.queryStringParameters?.projectId;
        const testCaseId = event.queryStringParameters?.testCaseId;
        const testSuiteId = event.queryStringParameters?.testSuiteId;
        const startDate = event.queryStringParameters?.startDate;
        const endDate = event.queryStringParameters?.endDate;
        const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 50;
        // Validate required parameters
        if (!projectId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    message: 'projectId is required',
                }),
            };
        }
        // Verify user has access to the project (organization-level check)
        // In a real implementation, you would fetch the project and verify organizationId matches
        // For now, we trust that the project belongs to the user's organization
        // Query execution history
        const result = await test_execution_db_service_1.testExecutionDBService.queryExecutionHistory({
            projectId,
            testCaseId,
            testSuiteId,
            startDate,
            endDate,
            limit,
        });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                executions: result.executions,
                count: result.count,
                lastEvaluatedKey: result.lastEvaluatedKey,
            }),
        };
    }
    catch (error) {
        console.error('Error getting execution history:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7OztHQVlHOzs7QUFHSCx3RkFBa0Y7QUFDbEYsc0VBQTZGO0FBRWhGLFFBQUEsT0FBTyxHQUFHLElBQUEsdUNBQXFCLEVBQzFDLE9BQU8sRUFDUCxNQUFNLEVBQ04sS0FBSyxFQUFFLEtBQXlCLEVBQWtDLEVBQUU7SUFDbEUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQzNELHFCQUFxQixFQUFFLEtBQUssQ0FBQyxxQkFBcUI7S0FDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSixJQUFJLENBQUM7UUFDSCx5QkFBeUI7UUFDekIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQztRQUN6RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDO1FBQzNELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLENBQUM7UUFDN0QsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQztRQUN6RCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDO1FBQ3JELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFeEcsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixPQUFPLEVBQUUsdUJBQXVCO2lCQUNqQyxDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCxtRUFBbUU7UUFDbkUsMEZBQTBGO1FBQzFGLHdFQUF3RTtRQUV4RSwwQkFBMEI7UUFDMUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxrREFBc0IsQ0FBQyxxQkFBcUIsQ0FBQztZQUNoRSxTQUFTO1lBQ1QsVUFBVTtZQUNWLFdBQVc7WUFDWCxTQUFTO1lBQ1QsT0FBTztZQUNQLEtBQUs7U0FDTixDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7Z0JBQzdCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztnQkFDbkIsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjthQUMxQyxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV6RCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsdUJBQXVCO2dCQUNoQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNoRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBHZXQgRXhlY3V0aW9uIEhpc3RvcnkgTGFtYmRhXHJcbiAqIFxyXG4gKiBFbmRwb2ludDogR0VUIC9hcGkvZXhlY3V0aW9ucy9oaXN0b3J5XHJcbiAqIFxyXG4gKiBRdWVyeSBQYXJhbWV0ZXJzOlxyXG4gKiAtIHByb2plY3RJZCAocmVxdWlyZWQpXHJcbiAqIC0gdGVzdENhc2VJZCAob3B0aW9uYWwpXHJcbiAqIC0gdGVzdFN1aXRlSWQgKG9wdGlvbmFsKVxyXG4gKiAtIHN0YXJ0RGF0ZSAob3B0aW9uYWwpXHJcbiAqIC0gZW5kRGF0ZSAob3B0aW9uYWwpXHJcbiAqIC0gbGltaXQgKG9wdGlvbmFsLCBkZWZhdWx0IDUwKVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1leGVjdXRpb24tZGItc2VydmljZSc7XHJcbmltcG9ydCB7IHdpdGhBdXRoQW5kUGVybWlzc2lvbiwgQXV0aGVudGljYXRlZEV2ZW50IH0gZnJvbSAnLi4vLi4vbWlkZGxld2FyZS9hdXRoLW1pZGRsZXdhcmUnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSB3aXRoQXV0aEFuZFBlcm1pc3Npb24oXHJcbiAgJ3Rlc3RzJyxcclxuICAncmVhZCcsXHJcbiAgYXN5bmMgKGV2ZW50OiBBdXRoZW50aWNhdGVkRXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gICAgY29uc29sZS5sb2coJ0dldCBleGVjdXRpb24gaGlzdG9yeSByZXF1ZXN0OicsIEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnMsXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gUGFyc2UgcXVlcnkgcGFyYW1ldGVyc1xyXG4gICAgICBjb25zdCBwcm9qZWN0SWQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnByb2plY3RJZDtcclxuICAgICAgY29uc3QgdGVzdENhc2VJZCA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8udGVzdENhc2VJZDtcclxuICAgICAgY29uc3QgdGVzdFN1aXRlSWQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnRlc3RTdWl0ZUlkO1xyXG4gICAgICBjb25zdCBzdGFydERhdGUgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnN0YXJ0RGF0ZTtcclxuICAgICAgY29uc3QgZW5kRGF0ZSA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uZW5kRGF0ZTtcclxuICAgICAgY29uc3QgbGltaXQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LmxpbWl0ID8gcGFyc2VJbnQoZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzLmxpbWl0LCAxMCkgOiA1MDtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIHBhcmFtZXRlcnNcclxuICAgICAgaWYgKCFwcm9qZWN0SWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgbWVzc2FnZTogJ3Byb2plY3RJZCBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBWZXJpZnkgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSBwcm9qZWN0IChvcmdhbml6YXRpb24tbGV2ZWwgY2hlY2spXHJcbiAgICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGZldGNoIHRoZSBwcm9qZWN0IGFuZCB2ZXJpZnkgb3JnYW5pemF0aW9uSWQgbWF0Y2hlc1xyXG4gICAgICAvLyBGb3Igbm93LCB3ZSB0cnVzdCB0aGF0IHRoZSBwcm9qZWN0IGJlbG9uZ3MgdG8gdGhlIHVzZXIncyBvcmdhbml6YXRpb25cclxuXHJcbiAgICAgIC8vIFF1ZXJ5IGV4ZWN1dGlvbiBoaXN0b3J5XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UucXVlcnlFeGVjdXRpb25IaXN0b3J5KHtcclxuICAgICAgICBwcm9qZWN0SWQsXHJcbiAgICAgICAgdGVzdENhc2VJZCxcclxuICAgICAgICB0ZXN0U3VpdGVJZCxcclxuICAgICAgICBzdGFydERhdGUsXHJcbiAgICAgICAgZW5kRGF0ZSxcclxuICAgICAgICBsaW1pdCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGV4ZWN1dGlvbnM6IHJlc3VsdC5leGVjdXRpb25zLFxyXG4gICAgICAgICAgY291bnQ6IHJlc3VsdC5jb3VudCxcclxuICAgICAgICAgIGxhc3RFdmFsdWF0ZWRLZXk6IHJlc3VsdC5sYXN0RXZhbHVhdGVkS2V5LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBleGVjdXRpb24gaGlzdG9yeTonLCBlcnJvcik7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxyXG4gICAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuKTtcclxuIl19