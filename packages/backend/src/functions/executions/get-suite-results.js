"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
const auth_middleware_1 = require("../../middleware/auth-middleware");
/**
 * Lambda handler for GET /api/executions/suites/{suiteExecutionId}
 * Retrieves detailed results for a test suite execution including aggregate statistics
 * and individual test case results.
 */
exports.handler = (0, auth_middleware_1.withAuthAndPermission)('tests', 'read', async (event) => {
    try {
        const suiteExecutionId = event.pathParameters?.suiteExecutionId;
        if (!suiteExecutionId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Missing suiteExecutionId parameter',
                }),
            };
        }
        // Verify user has access to the project (organization-level check)
        // In a real implementation, you would fetch the project and verify organizationId matches
        // For now, we trust that the suite execution belongs to the user's organization
        // Query all test case executions for this suite
        const testCaseExecutions = await test_execution_db_service_1.testExecutionDBService.getExecutionsBySuiteExecutionId(suiteExecutionId);
        if (testCaseExecutions.length === 0) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Suite execution not found',
                }),
            };
        }
        // Calculate aggregate statistics
        const stats = calculateSuiteStats(testCaseExecutions);
        // Determine overall suite status
        const suiteStatus = determineSuiteStatus(testCaseExecutions);
        // Get suite metadata from first execution
        const firstExecution = testCaseExecutions[0];
        const suiteId = firstExecution.testSuiteId || '';
        // Calculate suite timing
        const startTimes = testCaseExecutions
            .map(e => new Date(e.startTime).getTime())
            .filter(t => !isNaN(t));
        const endTimes = testCaseExecutions
            .filter(e => e.endTime)
            .map(e => new Date(e.endTime).getTime())
            .filter(t => !isNaN(t));
        const suiteStartTime = startTimes.length > 0
            ? new Date(Math.min(...startTimes)).toISOString()
            : firstExecution.startTime;
        const suiteEndTime = endTimes.length > 0
            ? new Date(Math.max(...endTimes)).toISOString()
            : undefined;
        const suiteDuration = suiteEndTime
            ? new Date(suiteEndTime).getTime() - new Date(suiteStartTime).getTime()
            : undefined;
        const response = {
            suiteExecutionId,
            suiteId,
            status: suiteStatus,
            stats,
            testCaseExecutions,
            startTime: suiteStartTime,
            endTime: suiteEndTime,
            duration: suiteDuration,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('Error retrieving suite execution results:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
});
/**
 * Calculate aggregate statistics for a suite execution
 */
function calculateSuiteStats(executions) {
    const stats = {
        total: executions.length,
        passed: 0,
        failed: 0,
        errors: 0,
        duration: 0,
    };
    for (const execution of executions) {
        // Count by result
        if (execution.result === 'pass') {
            stats.passed++;
        }
        else if (execution.result === 'fail') {
            stats.failed++;
        }
        else if (execution.result === 'error' || execution.status === 'error') {
            stats.errors++;
        }
        // Sum durations
        if (execution.duration) {
            stats.duration += execution.duration;
        }
    }
    return stats;
}
/**
 * Determine overall suite status based on test case statuses
 * - If any test is still queued or running, suite is "running"
 * - If all tests are completed, suite is "completed"
 * - If any test has error status, suite is "error"
 */
function determineSuiteStatus(executions) {
    const hasQueued = executions.some(e => e.status === 'queued');
    const hasRunning = executions.some(e => e.status === 'running');
    const hasError = executions.some(e => e.status === 'error');
    const allCompleted = executions.every(e => e.status === 'completed' || e.status === 'error');
    if (hasQueued || hasRunning) {
        return 'running';
    }
    if (hasError && allCompleted) {
        return 'error';
    }
    if (allCompleted) {
        return 'completed';
    }
    return 'running';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXN1aXRlLXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtc3VpdGUtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx3RkFBa0Y7QUFNbEYsc0VBQTZGO0FBRTdGOzs7O0dBSUc7QUFDVSxRQUFBLE9BQU8sR0FBRyxJQUFBLHVDQUFxQixFQUMxQyxPQUFPLEVBQ1AsTUFBTSxFQUNOLEtBQUssRUFBRSxLQUF5QixFQUFrQyxFQUFFO0lBQ2xFLElBQUksQ0FBQztRQUNILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQztRQUVoRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLG9DQUFvQztpQkFDNUMsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLDBGQUEwRjtRQUMxRixnRkFBZ0Y7UUFFbEYsZ0RBQWdEO1FBQ2hELE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxrREFBc0IsQ0FBQywrQkFBK0IsQ0FDckYsZ0JBQWdCLENBQ2pCLENBQUM7UUFFRixJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLDJCQUEyQjtpQkFDbkMsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsaUNBQWlDO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFdEQsaUNBQWlDO1FBQ2pDLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFN0QsMENBQTBDO1FBQzFDLE1BQU0sY0FBYyxHQUFHLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdDLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxXQUFXLElBQUksRUFBRSxDQUFDO1FBRWpELHlCQUF5QjtRQUN6QixNQUFNLFVBQVUsR0FBRyxrQkFBa0I7YUFDbEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ3pDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsTUFBTSxRQUFRLEdBQUcsa0JBQWtCO2FBQ2hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7YUFDdEIsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQVEsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2FBQ3hDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFMUIsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQzFDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUU7WUFDakQsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUM7UUFFN0IsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUU7WUFDL0MsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVkLE1BQU0sYUFBYSxHQUFHLFlBQVk7WUFDaEMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sRUFBRTtZQUN2RSxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRWQsTUFBTSxRQUFRLEdBQWtDO1lBQzlDLGdCQUFnQjtZQUNoQixPQUFPO1lBQ1AsTUFBTSxFQUFFLFdBQVc7WUFDbkIsS0FBSztZQUNMLGtCQUFrQjtZQUNsQixTQUFTLEVBQUUsY0FBYztZQUN6QixPQUFPLEVBQUUsWUFBWTtZQUNyQixRQUFRLEVBQUUsYUFBYTtTQUN4QixDQUFDO1FBRUYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUsdUJBQXVCO2dCQUM5QixPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQztBQUVIOztHQUVHO0FBQ0gsU0FBUyxtQkFBbUIsQ0FBQyxVQUFpQjtJQUM1QyxNQUFNLEtBQUssR0FBd0I7UUFDakMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxNQUFNO1FBQ3hCLE1BQU0sRUFBRSxDQUFDO1FBQ1QsTUFBTSxFQUFFLENBQUM7UUFDVCxNQUFNLEVBQUUsQ0FBQztRQUNULFFBQVEsRUFBRSxDQUFDO0tBQ1osQ0FBQztJQUVGLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7UUFDbkMsa0JBQWtCO1FBQ2xCLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNoQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDakIsQ0FBQzthQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUN2QyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDakIsQ0FBQzthQUFNLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxPQUFPLElBQUksU0FBUyxDQUFDLE1BQU0sS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN4RSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDakIsQ0FBQztRQUVELGdCQUFnQjtRQUNoQixJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUN2QixLQUFLLENBQUMsUUFBUSxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUM7UUFDdkMsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQztBQUNmLENBQUM7QUFFRDs7Ozs7R0FLRztBQUNILFNBQVMsb0JBQW9CLENBQUMsVUFBaUI7SUFDN0MsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUM7SUFDOUQsTUFBTSxVQUFVLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDaEUsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUM7SUFDNUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUM7SUFFN0YsSUFBSSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7UUFDNUIsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksUUFBUSxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQzdCLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2pCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgXHJcbiAgU3VpdGVFeGVjdXRpb25SZXN1bHRzUmVzcG9uc2UsIFxyXG4gIFN1aXRlRXhlY3V0aW9uU3RhdHMsXHJcbiAgRXhlY3V0aW9uU3RhdHVzIFxyXG59IGZyb20gJy4uLy4uL3R5cGVzL3Rlc3QtZXhlY3V0aW9uJztcclxuaW1wb3J0IHsgd2l0aEF1dGhBbmRQZXJtaXNzaW9uLCBBdXRoZW50aWNhdGVkRXZlbnQgfSBmcm9tICcuLi8uLi9taWRkbGV3YXJlL2F1dGgtbWlkZGxld2FyZSc7XHJcblxyXG4vKipcclxuICogTGFtYmRhIGhhbmRsZXIgZm9yIEdFVCAvYXBpL2V4ZWN1dGlvbnMvc3VpdGVzL3tzdWl0ZUV4ZWN1dGlvbklkfVxyXG4gKiBSZXRyaWV2ZXMgZGV0YWlsZWQgcmVzdWx0cyBmb3IgYSB0ZXN0IHN1aXRlIGV4ZWN1dGlvbiBpbmNsdWRpbmcgYWdncmVnYXRlIHN0YXRpc3RpY3NcclxuICogYW5kIGluZGl2aWR1YWwgdGVzdCBjYXNlIHJlc3VsdHMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IHdpdGhBdXRoQW5kUGVybWlzc2lvbihcclxuICAndGVzdHMnLFxyXG4gICdyZWFkJyxcclxuICBhc3luYyAoZXZlbnQ6IEF1dGhlbnRpY2F0ZWRFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzdWl0ZUV4ZWN1dGlvbklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LnN1aXRlRXhlY3V0aW9uSWQ7XHJcblxyXG4gICAgICBpZiAoIXN1aXRlRXhlY3V0aW9uSWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZXJyb3I6ICdNaXNzaW5nIHN1aXRlRXhlY3V0aW9uSWQgcGFyYW1ldGVyJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFZlcmlmeSB1c2VyIGhhcyBhY2Nlc3MgdG8gdGhlIHByb2plY3QgKG9yZ2FuaXphdGlvbi1sZXZlbCBjaGVjaylcclxuICAgICAgLy8gSW4gYSByZWFsIGltcGxlbWVudGF0aW9uLCB5b3Ugd291bGQgZmV0Y2ggdGhlIHByb2plY3QgYW5kIHZlcmlmeSBvcmdhbml6YXRpb25JZCBtYXRjaGVzXHJcbiAgICAgIC8vIEZvciBub3csIHdlIHRydXN0IHRoYXQgdGhlIHN1aXRlIGV4ZWN1dGlvbiBiZWxvbmdzIHRvIHRoZSB1c2VyJ3Mgb3JnYW5pemF0aW9uXHJcblxyXG4gICAgLy8gUXVlcnkgYWxsIHRlc3QgY2FzZSBleGVjdXRpb25zIGZvciB0aGlzIHN1aXRlXHJcbiAgICBjb25zdCB0ZXN0Q2FzZUV4ZWN1dGlvbnMgPSBhd2FpdCB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmdldEV4ZWN1dGlvbnNCeVN1aXRlRXhlY3V0aW9uSWQoXHJcbiAgICAgIHN1aXRlRXhlY3V0aW9uSWRcclxuICAgICk7XHJcblxyXG4gICAgaWYgKHRlc3RDYXNlRXhlY3V0aW9ucy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1N1aXRlIGV4ZWN1dGlvbiBub3QgZm91bmQnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENhbGN1bGF0ZSBhZ2dyZWdhdGUgc3RhdGlzdGljc1xyXG4gICAgY29uc3Qgc3RhdHMgPSBjYWxjdWxhdGVTdWl0ZVN0YXRzKHRlc3RDYXNlRXhlY3V0aW9ucyk7XHJcblxyXG4gICAgLy8gRGV0ZXJtaW5lIG92ZXJhbGwgc3VpdGUgc3RhdHVzXHJcbiAgICBjb25zdCBzdWl0ZVN0YXR1cyA9IGRldGVybWluZVN1aXRlU3RhdHVzKHRlc3RDYXNlRXhlY3V0aW9ucyk7XHJcblxyXG4gICAgLy8gR2V0IHN1aXRlIG1ldGFkYXRhIGZyb20gZmlyc3QgZXhlY3V0aW9uXHJcbiAgICBjb25zdCBmaXJzdEV4ZWN1dGlvbiA9IHRlc3RDYXNlRXhlY3V0aW9uc1swXTtcclxuICAgIGNvbnN0IHN1aXRlSWQgPSBmaXJzdEV4ZWN1dGlvbi50ZXN0U3VpdGVJZCB8fCAnJztcclxuXHJcbiAgICAvLyBDYWxjdWxhdGUgc3VpdGUgdGltaW5nXHJcbiAgICBjb25zdCBzdGFydFRpbWVzID0gdGVzdENhc2VFeGVjdXRpb25zXHJcbiAgICAgIC5tYXAoZSA9PiBuZXcgRGF0ZShlLnN0YXJ0VGltZSkuZ2V0VGltZSgpKVxyXG4gICAgICAuZmlsdGVyKHQgPT4gIWlzTmFOKHQpKTtcclxuICAgIGNvbnN0IGVuZFRpbWVzID0gdGVzdENhc2VFeGVjdXRpb25zXHJcbiAgICAgIC5maWx0ZXIoZSA9PiBlLmVuZFRpbWUpXHJcbiAgICAgIC5tYXAoZSA9PiBuZXcgRGF0ZShlLmVuZFRpbWUhKS5nZXRUaW1lKCkpXHJcbiAgICAgIC5maWx0ZXIodCA9PiAhaXNOYU4odCkpO1xyXG5cclxuICAgIGNvbnN0IHN1aXRlU3RhcnRUaW1lID0gc3RhcnRUaW1lcy5sZW5ndGggPiAwIFxyXG4gICAgICA/IG5ldyBEYXRlKE1hdGgubWluKC4uLnN0YXJ0VGltZXMpKS50b0lTT1N0cmluZygpXHJcbiAgICAgIDogZmlyc3RFeGVjdXRpb24uc3RhcnRUaW1lO1xyXG4gICAgXHJcbiAgICBjb25zdCBzdWl0ZUVuZFRpbWUgPSBlbmRUaW1lcy5sZW5ndGggPiAwXHJcbiAgICAgID8gbmV3IERhdGUoTWF0aC5tYXgoLi4uZW5kVGltZXMpKS50b0lTT1N0cmluZygpXHJcbiAgICAgIDogdW5kZWZpbmVkO1xyXG5cclxuICAgIGNvbnN0IHN1aXRlRHVyYXRpb24gPSBzdWl0ZUVuZFRpbWVcclxuICAgICAgPyBuZXcgRGF0ZShzdWl0ZUVuZFRpbWUpLmdldFRpbWUoKSAtIG5ldyBEYXRlKHN1aXRlU3RhcnRUaW1lKS5nZXRUaW1lKClcclxuICAgICAgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IFN1aXRlRXhlY3V0aW9uUmVzdWx0c1Jlc3BvbnNlID0ge1xyXG4gICAgICBzdWl0ZUV4ZWN1dGlvbklkLFxyXG4gICAgICBzdWl0ZUlkLFxyXG4gICAgICBzdGF0dXM6IHN1aXRlU3RhdHVzLFxyXG4gICAgICBzdGF0cyxcclxuICAgICAgdGVzdENhc2VFeGVjdXRpb25zLFxyXG4gICAgICBzdGFydFRpbWU6IHN1aXRlU3RhcnRUaW1lLFxyXG4gICAgICBlbmRUaW1lOiBzdWl0ZUVuZFRpbWUsXHJcbiAgICAgIGR1cmF0aW9uOiBzdWl0ZUR1cmF0aW9uLFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJldHJpZXZpbmcgc3VpdGUgZXhlY3V0aW9uIHJlc3VsdHM6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59KTtcclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYWdncmVnYXRlIHN0YXRpc3RpY3MgZm9yIGEgc3VpdGUgZXhlY3V0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBjYWxjdWxhdGVTdWl0ZVN0YXRzKGV4ZWN1dGlvbnM6IGFueVtdKTogU3VpdGVFeGVjdXRpb25TdGF0cyB7XHJcbiAgY29uc3Qgc3RhdHM6IFN1aXRlRXhlY3V0aW9uU3RhdHMgPSB7XHJcbiAgICB0b3RhbDogZXhlY3V0aW9ucy5sZW5ndGgsXHJcbiAgICBwYXNzZWQ6IDAsXHJcbiAgICBmYWlsZWQ6IDAsXHJcbiAgICBlcnJvcnM6IDAsXHJcbiAgICBkdXJhdGlvbjogMCxcclxuICB9O1xyXG5cclxuICBmb3IgKGNvbnN0IGV4ZWN1dGlvbiBvZiBleGVjdXRpb25zKSB7XHJcbiAgICAvLyBDb3VudCBieSByZXN1bHRcclxuICAgIGlmIChleGVjdXRpb24ucmVzdWx0ID09PSAncGFzcycpIHtcclxuICAgICAgc3RhdHMucGFzc2VkKys7XHJcbiAgICB9IGVsc2UgaWYgKGV4ZWN1dGlvbi5yZXN1bHQgPT09ICdmYWlsJykge1xyXG4gICAgICBzdGF0cy5mYWlsZWQrKztcclxuICAgIH0gZWxzZSBpZiAoZXhlY3V0aW9uLnJlc3VsdCA9PT0gJ2Vycm9yJyB8fCBleGVjdXRpb24uc3RhdHVzID09PSAnZXJyb3InKSB7XHJcbiAgICAgIHN0YXRzLmVycm9ycysrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN1bSBkdXJhdGlvbnNcclxuICAgIGlmIChleGVjdXRpb24uZHVyYXRpb24pIHtcclxuICAgICAgc3RhdHMuZHVyYXRpb24gKz0gZXhlY3V0aW9uLmR1cmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHN0YXRzO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIG92ZXJhbGwgc3VpdGUgc3RhdHVzIGJhc2VkIG9uIHRlc3QgY2FzZSBzdGF0dXNlc1xyXG4gKiAtIElmIGFueSB0ZXN0IGlzIHN0aWxsIHF1ZXVlZCBvciBydW5uaW5nLCBzdWl0ZSBpcyBcInJ1bm5pbmdcIlxyXG4gKiAtIElmIGFsbCB0ZXN0cyBhcmUgY29tcGxldGVkLCBzdWl0ZSBpcyBcImNvbXBsZXRlZFwiXHJcbiAqIC0gSWYgYW55IHRlc3QgaGFzIGVycm9yIHN0YXR1cywgc3VpdGUgaXMgXCJlcnJvclwiXHJcbiAqL1xyXG5mdW5jdGlvbiBkZXRlcm1pbmVTdWl0ZVN0YXR1cyhleGVjdXRpb25zOiBhbnlbXSk6IEV4ZWN1dGlvblN0YXR1cyB7XHJcbiAgY29uc3QgaGFzUXVldWVkID0gZXhlY3V0aW9ucy5zb21lKGUgPT4gZS5zdGF0dXMgPT09ICdxdWV1ZWQnKTtcclxuICBjb25zdCBoYXNSdW5uaW5nID0gZXhlY3V0aW9ucy5zb21lKGUgPT4gZS5zdGF0dXMgPT09ICdydW5uaW5nJyk7XHJcbiAgY29uc3QgaGFzRXJyb3IgPSBleGVjdXRpb25zLnNvbWUoZSA9PiBlLnN0YXR1cyA9PT0gJ2Vycm9yJyk7XHJcbiAgY29uc3QgYWxsQ29tcGxldGVkID0gZXhlY3V0aW9ucy5ldmVyeShlID0+IGUuc3RhdHVzID09PSAnY29tcGxldGVkJyB8fCBlLnN0YXR1cyA9PT0gJ2Vycm9yJyk7XHJcblxyXG4gIGlmIChoYXNRdWV1ZWQgfHwgaGFzUnVubmluZykge1xyXG4gICAgcmV0dXJuICdydW5uaW5nJztcclxuICB9XHJcblxyXG4gIGlmIChoYXNFcnJvciAmJiBhbGxDb21wbGV0ZWQpIHtcclxuICAgIHJldHVybiAnZXJyb3InO1xyXG4gIH1cclxuXHJcbiAgaWYgKGFsbENvbXBsZXRlZCkge1xyXG4gICAgcmV0dXJuICdjb21wbGV0ZWQnO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICdydW5uaW5nJztcclxufVxyXG4iXX0=