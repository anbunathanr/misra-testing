"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
/**
 * Lambda handler for GET /api/executions/suites/{suiteExecutionId}
 * Retrieves detailed results for a test suite execution including aggregate statistics
 * and individual test case results.
 */
const handler = async (event) => {
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
};
exports.handler = handler;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXN1aXRlLXJlc3VsdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtc3VpdGUtcmVzdWx0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSx3RkFBa0Y7QUFPbEY7Ozs7R0FJRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3pGLElBQUksQ0FBQztRQUNILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQztRQUVoRSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLG9DQUFvQztpQkFDNUMsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLDBGQUEwRjtRQUMxRixnRkFBZ0Y7UUFFbEYsZ0RBQWdEO1FBQ2hELE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxrREFBc0IsQ0FBQywrQkFBK0IsQ0FDckYsZ0JBQWdCLENBQ2pCLENBQUM7UUFFRixJQUFJLGtCQUFrQixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLDJCQUEyQjtpQkFDbkMsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsaUNBQWlDO1FBQ2pDLE1BQU0sS0FBSyxHQUFHLG1CQUFtQixDQUFDLGtC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LENBQUMsQ0FBQyxNQUFNLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDaEUsTUFBTSxRQUFRLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUM7SUFDNUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssV0FBVyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLENBQUM7SUFFN0YsSUFBSSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7UUFDNUIsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVELElBQUksUUFBUSxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQzdCLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7SUFFRCxJQUFJLFlBQVksRUFBRSxDQUFDO1FBQ2pCLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxPQUFPLFNBQVMsQ0FBQztBQUNuQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1leGVjdXRpb24tZGItc2VydmljZSc7XHJcbmltcG9ydCB7IFxyXG4gIFN1aXRlRXhlY3V0aW9uUmVzdWx0c1Jlc3BvbnNlLCBcclxuICBTdWl0ZUV4ZWN1dGlvblN0YXRzLFxyXG4gIEV4ZWN1dGlvblN0YXR1cyBcclxufSBmcm9tICcuLi8uLi90eXBlcy90ZXN0LWV4ZWN1dGlvbic7XHJcblxyXG4vKipcclxuICogTGFtYmRhIGhhbmRsZXIgZm9yIEdFVCAvYXBpL2V4ZWN1dGlvbnMvc3VpdGVzL3tzdWl0ZUV4ZWN1dGlvbklkfVxyXG4gKiBSZXRyaWV2ZXMgZGV0YWlsZWQgcmVzdWx0cyBmb3IgYSB0ZXN0IHN1aXRlIGV4ZWN1dGlvbiBpbmNsdWRpbmcgYWdncmVnYXRlIHN0YXRpc3RpY3NcclxuICogYW5kIGluZGl2aWR1YWwgdGVzdCBjYXNlIHJlc3VsdHMuXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgc3VpdGVFeGVjdXRpb25JZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5zdWl0ZUV4ZWN1dGlvbklkO1xyXG5cclxuICAgICAgaWYgKCFzdWl0ZUV4ZWN1dGlvbklkKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGVycm9yOiAnTWlzc2luZyBzdWl0ZUV4ZWN1dGlvbklkIHBhcmFtZXRlcicsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBWZXJpZnkgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSBwcm9qZWN0IChvcmdhbml6YXRpb24tbGV2ZWwgY2hlY2spXHJcbiAgICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGZldGNoIHRoZSBwcm9qZWN0IGFuZCB2ZXJpZnkgb3JnYW5pemF0aW9uSWQgbWF0Y2hlc1xyXG4gICAgICAvLyBGb3Igbm93LCB3ZSB0cnVzdCB0aGF0IHRoZSBzdWl0ZSBleGVjdXRpb24gYmVsb25ncyB0byB0aGUgdXNlcidzIG9yZ2FuaXphdGlvblxyXG5cclxuICAgIC8vIFF1ZXJ5IGFsbCB0ZXN0IGNhc2UgZXhlY3V0aW9ucyBmb3IgdGhpcyBzdWl0ZVxyXG4gICAgY29uc3QgdGVzdENhc2VFeGVjdXRpb25zID0gYXdhaXQgdGVzdEV4ZWN1dGlvbkRCU2VydmljZS5nZXRFeGVjdXRpb25zQnlTdWl0ZUV4ZWN1dGlvbklkKFxyXG4gICAgICBzdWl0ZUV4ZWN1dGlvbklkXHJcbiAgICApO1xyXG5cclxuICAgIGlmICh0ZXN0Q2FzZUV4ZWN1dGlvbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdTdWl0ZSBleGVjdXRpb24gbm90IGZvdW5kJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDYWxjdWxhdGUgYWdncmVnYXRlIHN0YXRpc3RpY3NcclxuICAgIGNvbnN0IHN0YXRzID0gY2FsY3VsYXRlU3VpdGVTdGF0cyh0ZXN0Q2FzZUV4ZWN1dGlvbnMpO1xyXG5cclxuICAgIC8vIERldGVybWluZSBvdmVyYWxsIHN1aXRlIHN0YXR1c1xyXG4gICAgY29uc3Qgc3VpdGVTdGF0dXMgPSBkZXRlcm1pbmVTdWl0ZVN0YXR1cyh0ZXN0Q2FzZUV4ZWN1dGlvbnMpO1xyXG5cclxuICAgIC8vIEdldCBzdWl0ZSBtZXRhZGF0YSBmcm9tIGZpcnN0IGV4ZWN1dGlvblxyXG4gICAgY29uc3QgZmlyc3RFeGVjdXRpb24gPSB0ZXN0Q2FzZUV4ZWN1dGlvbnNbMF07XHJcbiAgICBjb25zdCBzdWl0ZUlkID0gZmlyc3RFeGVjdXRpb24udGVzdFN1aXRlSWQgfHwgJyc7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIHN1aXRlIHRpbWluZ1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lcyA9IHRlc3RDYXNlRXhlY3V0aW9uc1xyXG4gICAgICAubWFwKGUgPT4gbmV3IERhdGUoZS5zdGFydFRpbWUpLmdldFRpbWUoKSlcclxuICAgICAgLmZpbHRlcih0ID0+ICFpc05hTih0KSk7XHJcbiAgICBjb25zdCBlbmRUaW1lcyA9IHRlc3RDYXNlRXhlY3V0aW9uc1xyXG4gICAgICAuZmlsdGVyKGUgPT4gZS5lbmRUaW1lKVxyXG4gICAgICAubWFwKGUgPT4gbmV3IERhdGUoZS5lbmRUaW1lISkuZ2V0VGltZSgpKVxyXG4gICAgICAuZmlsdGVyKHQgPT4gIWlzTmFOKHQpKTtcclxuXHJcbiAgICBjb25zdCBzdWl0ZVN0YXJ0VGltZSA9IHN0YXJ0VGltZXMubGVuZ3RoID4gMCBcclxuICAgICAgPyBuZXcgRGF0ZShNYXRoLm1pbiguLi5zdGFydFRpbWVzKSkudG9JU09TdHJpbmcoKVxyXG4gICAgICA6IGZpcnN0RXhlY3V0aW9uLnN0YXJ0VGltZTtcclxuICAgIFxyXG4gICAgY29uc3Qgc3VpdGVFbmRUaW1lID0gZW5kVGltZXMubGVuZ3RoID4gMFxyXG4gICAgICA/IG5ldyBEYXRlKE1hdGgubWF4KC4uLmVuZFRpbWVzKSkudG9JU09TdHJpbmcoKVxyXG4gICAgICA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICBjb25zdCBzdWl0ZUR1cmF0aW9uID0gc3VpdGVFbmRUaW1lXHJcbiAgICAgID8gbmV3IERhdGUoc3VpdGVFbmRUaW1lKS5nZXRUaW1lKCkgLSBuZXcgRGF0ZShzdWl0ZVN0YXJ0VGltZSkuZ2V0VGltZSgpXHJcbiAgICAgIDogdW5kZWZpbmVkO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBTdWl0ZUV4ZWN1dGlvblJlc3VsdHNSZXNwb25zZSA9IHtcclxuICAgICAgc3VpdGVFeGVjdXRpb25JZCxcclxuICAgICAgc3VpdGVJZCxcclxuICAgICAgc3RhdHVzOiBzdWl0ZVN0YXR1cyxcclxuICAgICAgc3RhdHMsXHJcbiAgICAgIHRlc3RDYXNlRXhlY3V0aW9ucyxcclxuICAgICAgc3RhcnRUaW1lOiBzdWl0ZVN0YXJ0VGltZSxcclxuICAgICAgZW5kVGltZTogc3VpdGVFbmRUaW1lLFxyXG4gICAgICBkdXJhdGlvbjogc3VpdGVEdXJhdGlvbixcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXRyaWV2aW5nIHN1aXRlIGV4ZWN1dGlvbiByZXN1bHRzOicsIGVycm9yKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgYWdncmVnYXRlIHN0YXRpc3RpY3MgZm9yIGEgc3VpdGUgZXhlY3V0aW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBjYWxjdWxhdGVTdWl0ZVN0YXRzKGV4ZWN1dGlvbnM6IGFueVtdKTogU3VpdGVFeGVjdXRpb25TdGF0cyB7XHJcbiAgY29uc3Qgc3RhdHM6IFN1aXRlRXhlY3V0aW9uU3RhdHMgPSB7XHJcbiAgICB0b3RhbDogZXhlY3V0aW9ucy5sZW5ndGgsXHJcbiAgICBwYXNzZWQ6IDAsXHJcbiAgICBmYWlsZWQ6IDAsXHJcbiAgICBlcnJvcnM6IDAsXHJcbiAgICBkdXJhdGlvbjogMCxcclxuICB9O1xyXG5cclxuICBmb3IgKGNvbnN0IGV4ZWN1dGlvbiBvZiBleGVjdXRpb25zKSB7XHJcbiAgICAvLyBDb3VudCBieSByZXN1bHRcclxuICAgIGlmIChleGVjdXRpb24ucmVzdWx0ID09PSAncGFzcycpIHtcclxuICAgICAgc3RhdHMucGFzc2VkKys7XHJcbiAgICB9IGVsc2UgaWYgKGV4ZWN1dGlvbi5yZXN1bHQgPT09ICdmYWlsJykge1xyXG4gICAgICBzdGF0cy5mYWlsZWQrKztcclxuICAgIH0gZWxzZSBpZiAoZXhlY3V0aW9uLnJlc3VsdCA9PT0gJ2Vycm9yJyB8fCBleGVjdXRpb24uc3RhdHVzID09PSAnZXJyb3InKSB7XHJcbiAgICAgIHN0YXRzLmVycm9ycysrO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN1bSBkdXJhdGlvbnNcclxuICAgIGlmIChleGVjdXRpb24uZHVyYXRpb24pIHtcclxuICAgICAgc3RhdHMuZHVyYXRpb24gKz0gZXhlY3V0aW9uLmR1cmF0aW9uO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHN0YXRzO1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIG92ZXJhbGwgc3VpdGUgc3RhdHVzIGJhc2VkIG9uIHRlc3QgY2FzZSBzdGF0dXNlc1xyXG4gKiAtIElmIGFueSB0ZXN0IGlzIHN0aWxsIHF1ZXVlZCBvciBydW5uaW5nLCBzdWl0ZSBpcyBcInJ1bm5pbmdcIlxyXG4gKiAtIElmIGFsbCB0ZXN0cyBhcmUgY29tcGxldGVkLCBzdWl0ZSBpcyBcImNvbXBsZXRlZFwiXHJcbiAqIC0gSWYgYW55IHRlc3QgaGFzIGVycm9yIHN0YXR1cywgc3VpdGUgaXMgXCJlcnJvclwiXHJcbiAqL1xyXG5mdW5jdGlvbiBkZXRlcm1pbmVTdWl0ZVN0YXR1cyhleGVjdXRpb25zOiBhbnlbXSk6IEV4ZWN1dGlvblN0YXR1cyB7XHJcbiAgY29uc3QgaGFzUXVldWVkID0gZXhlY3V0aW9ucy5zb21lKGUgPT4gZS5zdGF0dXMgPT09ICdxdWV1ZWQnKTtcclxuICBjb25zdCBoYXNSdW5uaW5nID0gZXhlY3V0aW9ucy5zb21lKGUgPT4gZS5zdGF0dXMgPT09ICdydW5uaW5nJyk7XHJcbiAgY29uc3QgaGFzRXJyb3IgPSBleGVjdXRpb25zLnNvbWUoZSA9PiBlLnN0YXR1cyA9PT0gJ2Vycm9yJyk7XHJcbiAgY29uc3QgYWxsQ29tcGxldGVkID0gZXhlY3V0aW9ucy5ldmVyeShlID0+IGUuc3RhdHVzID09PSAnY29tcGxldGVkJyB8fCBlLnN0YXR1cyA9PT0gJ2Vycm9yJyk7XHJcblxyXG4gIGlmIChoYXNRdWV1ZWQgfHwgaGFzUnVubmluZykge1xyXG4gICAgcmV0dXJuICdydW5uaW5nJztcclxuICB9XHJcblxyXG4gIGlmIChoYXNFcnJvciAmJiBhbGxDb21wbGV0ZWQpIHtcclxuICAgIHJldHVybiAnZXJyb3InO1xyXG4gIH1cclxuXHJcbiAgaWYgKGFsbENvbXBsZXRlZCkge1xyXG4gICAgcmV0dXJuICdjb21wbGV0ZWQnO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuICdydW5uaW5nJztcclxufVxyXG4iXX0=