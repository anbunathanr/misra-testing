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
const handler = async (event) => {
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
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7Ozs7OztHQVlHOzs7QUFHSCx3RkFBa0Y7QUFFM0UsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDekYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQ0FBZ0MsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1FBQzNELHFCQUFxQixFQUFFLEtBQUssQ0FBQyxxQkFBcUI7S0FDbkQsQ0FBQyxDQUFDLENBQUM7SUFFSixJQUFJLENBQUM7UUFDSCx5QkFBeUI7UUFDekIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQztRQUN6RCxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDO1FBQzNELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxXQUFXLENBQUM7UUFDN0QsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsQ0FBQztRQUN6RCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsT0FBTyxDQUFDO1FBQ3JELE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFeEcsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixPQUFPLEVBQUUsdUJBQXVCO2lCQUNqQyxDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCxtRUFBbUU7UUFDbkUsMEZBQTBGO1FBQzFGLHdFQUF3RTtRQUV4RSwwQkFBMEI7UUFDMUIsTUFBTSxNQUFNLEdBQUcsTUFBTSxrREFBc0IsQ0FBQyxxQkFBcUIsQ0FBQztZQUNoRSxTQUFTO1lBQ1QsVUFBVTtZQUNWLFdBQVc7WUFDWCxTQUFTO1lBQ1QsT0FBTztZQUNQLEtBQUs7U0FDTixDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixVQUFVLEVBQUUsTUFBTSxDQUFDLFVBQVU7Z0JBQzdCLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSztnQkFDbkIsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLGdCQUFnQjthQUMxQyxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQ0FBa0MsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV6RCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsdUJBQXVCO2dCQUNoQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNoRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDTCxDQUFDLENBQUM7QUFyRVcsUUFBQSxPQUFPLFdBcUVsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBHZXQgRXhlY3V0aW9uIEhpc3RvcnkgTGFtYmRhXHJcbiAqIFxyXG4gKiBFbmRwb2ludDogR0VUIC9hcGkvZXhlY3V0aW9ucy9oaXN0b3J5XHJcbiAqIFxyXG4gKiBRdWVyeSBQYXJhbWV0ZXJzOlxyXG4gKiAtIHByb2plY3RJZCAocmVxdWlyZWQpXHJcbiAqIC0gdGVzdENhc2VJZCAob3B0aW9uYWwpXHJcbiAqIC0gdGVzdFN1aXRlSWQgKG9wdGlvbmFsKVxyXG4gKiAtIHN0YXJ0RGF0ZSAob3B0aW9uYWwpXHJcbiAqIC0gZW5kRGF0ZSAob3B0aW9uYWwpXHJcbiAqIC0gbGltaXQgKG9wdGlvbmFsLCBkZWZhdWx0IDUwKVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgdGVzdEV4ZWN1dGlvbkRCU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3QtZXhlY3V0aW9uLWRiLXNlcnZpY2UnO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIGNvbnNvbGUubG9nKCdHZXQgZXhlY3V0aW9uIGhpc3RvcnkgcmVxdWVzdDonLCBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFBhcnNlIHF1ZXJ5IHBhcmFtZXRlcnNcclxuICAgICAgY29uc3QgcHJvamVjdElkID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5wcm9qZWN0SWQ7XHJcbiAgICAgIGNvbnN0IHRlc3RDYXNlSWQgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnRlc3RDYXNlSWQ7XHJcbiAgICAgIGNvbnN0IHRlc3RTdWl0ZUlkID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy50ZXN0U3VpdGVJZDtcclxuICAgICAgY29uc3Qgc3RhcnREYXRlID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5zdGFydERhdGU7XHJcbiAgICAgIGNvbnN0IGVuZERhdGUgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LmVuZERhdGU7XHJcbiAgICAgIGNvbnN0IGxpbWl0ID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5saW1pdCA/IHBhcnNlSW50KGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycy5saW1pdCwgMTApIDogNTA7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBwYXJhbWV0ZXJzXHJcbiAgICAgIGlmICghcHJvamVjdElkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdwcm9qZWN0SWQgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVmVyaWZ5IHVzZXIgaGFzIGFjY2VzcyB0byB0aGUgcHJvamVjdCAob3JnYW5pemF0aW9uLWxldmVsIGNoZWNrKVxyXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBmZXRjaCB0aGUgcHJvamVjdCBhbmQgdmVyaWZ5IG9yZ2FuaXphdGlvbklkIG1hdGNoZXNcclxuICAgICAgLy8gRm9yIG5vdywgd2UgdHJ1c3QgdGhhdCB0aGUgcHJvamVjdCBiZWxvbmdzIHRvIHRoZSB1c2VyJ3Mgb3JnYW5pemF0aW9uXHJcblxyXG4gICAgICAvLyBRdWVyeSBleGVjdXRpb24gaGlzdG9yeVxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLnF1ZXJ5RXhlY3V0aW9uSGlzdG9yeSh7XHJcbiAgICAgICAgcHJvamVjdElkLFxyXG4gICAgICAgIHRlc3RDYXNlSWQsXHJcbiAgICAgICAgdGVzdFN1aXRlSWQsXHJcbiAgICAgICAgc3RhcnREYXRlLFxyXG4gICAgICAgIGVuZERhdGUsXHJcbiAgICAgICAgbGltaXQsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBleGVjdXRpb25zOiByZXN1bHQuZXhlY3V0aW9ucyxcclxuICAgICAgICAgIGNvdW50OiByZXN1bHQuY291bnQsXHJcbiAgICAgICAgICBsYXN0RXZhbHVhdGVkS2V5OiByZXN1bHQubGFzdEV2YWx1YXRlZEtleSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdldHRpbmcgZXhlY3V0aW9uIGhpc3Rvcnk6JywgZXJyb3IpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBtZXNzYWdlOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcclxuICAgICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxufTtcclxuIl19