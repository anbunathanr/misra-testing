"use strict";
/**
 * Get Execution Status Lambda
 * Returns current status and progress information for a test execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
const handler = async (event) => {
    try {
        console.log('Get execution status request:', JSON.stringify(event));
        // Extract executionId from path parameters
        const executionId = event.pathParameters?.executionId;
        if (!executionId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    message: 'executionId is required',
                }),
            };
        }
        // Get execution from database
        const execution = await test_execution_db_service_1.testExecutionDBService.getExecution(executionId);
        if (!execution) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    message: `Execution not found: ${executionId}`,
                }),
            };
        }
        // Verify user has access to the project (organization-level check)
        // In a real implementation, you would fetch the project and verify organizationId matches
        // For now, we trust that the execution belongs to the user's organization
        // Calculate current step (last completed step + 1, or 0 if none completed)
        let currentStep;
        if (execution.status === 'running') {
            const completedSteps = execution.steps.filter(s => s.status === 'pass' || s.status === 'fail' || s.status === 'error');
            currentStep = completedSteps.length;
        }
        // Calculate duration
        let duration;
        if (execution.endTime) {
            duration = execution.duration;
        }
        else if (execution.startTime) {
            // Calculate current duration for running executions
            duration = Date.now() - new Date(execution.startTime).getTime();
        }
        const response = {
            executionId: execution.executionId,
            status: execution.status,
            result: execution.result,
            currentStep,
            totalSteps: execution.steps.length,
            startTime: execution.startTime,
            duration,
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
        console.error('Error getting execution status:', error);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1zdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBR0gsd0ZBQWtGO0FBWTNFLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3pGLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBFLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztRQUV0RCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSx5QkFBeUI7aUJBQ25DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLFNBQVMsR0FBRyxNQUFNLGtEQUFzQixDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6RSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLHdCQUF3QixXQUFXLEVBQUU7aUJBQy9DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELG1FQUFtRTtRQUNuRSwwRkFBMEY7UUFDMUYsMEVBQTBFO1FBRTFFLDJFQUEyRTtRQUMzRSxJQUFJLFdBQStCLENBQUM7UUFDcEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUMzQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUN4RSxDQUFDO1lBQ0YsV0FBVyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDdEMsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixJQUFJLFFBQTRCLENBQUM7UUFDakMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdEIsUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUM7UUFDaEMsQ0FBQzthQUFNLElBQUksU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLG9EQUFvRDtZQUNwRCxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRSxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQTRCO1lBQ3hDLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVztZQUNsQyxNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU07WUFDeEIsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNO1lBQ3hCLFdBQVc7WUFDWCxVQUFVLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQ2xDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztZQUM5QixRQUFRO1NBQ1QsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0wsQ0FBQyxDQUFDO0FBM0ZXLFFBQUEsT0FBTyxXQTJGbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogR2V0IEV4ZWN1dGlvbiBTdGF0dXMgTGFtYmRhXHJcbiAqIFJldHVybnMgY3VycmVudCBzdGF0dXMgYW5kIHByb2dyZXNzIGluZm9ybWF0aW9uIGZvciBhIHRlc3QgZXhlY3V0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1leGVjdXRpb24tZGItc2VydmljZSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEV4ZWN1dGlvblN0YXR1c1Jlc3BvbnNlIHtcclxuICBleGVjdXRpb25JZDogc3RyaW5nO1xyXG4gIHN0YXR1czogc3RyaW5nO1xyXG4gIHJlc3VsdD86IHN0cmluZztcclxuICBjdXJyZW50U3RlcD86IG51bWJlcjtcclxuICB0b3RhbFN0ZXBzOiBudW1iZXI7XHJcbiAgc3RhcnRUaW1lOiBzdHJpbmc7XHJcbiAgZHVyYXRpb24/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZygnR2V0IGV4ZWN1dGlvbiBzdGF0dXMgcmVxdWVzdDonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xyXG5cclxuICAgICAgLy8gRXh0cmFjdCBleGVjdXRpb25JZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xyXG4gICAgICBjb25zdCBleGVjdXRpb25JZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5leGVjdXRpb25JZDtcclxuXHJcbiAgICAgIGlmICghZXhlY3V0aW9uSWQpIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgbWVzc2FnZTogJ2V4ZWN1dGlvbklkIGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEdldCBleGVjdXRpb24gZnJvbSBkYXRhYmFzZVxyXG4gICAgICBjb25zdCBleGVjdXRpb24gPSBhd2FpdCB0ZXN0RXhlY3V0aW9uREJTZXJ2aWNlLmdldEV4ZWN1dGlvbihleGVjdXRpb25JZCk7XHJcblxyXG4gICAgICBpZiAoIWV4ZWN1dGlvbikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDQsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBtZXNzYWdlOiBgRXhlY3V0aW9uIG5vdCBmb3VuZDogJHtleGVjdXRpb25JZH1gLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gVmVyaWZ5IHVzZXIgaGFzIGFjY2VzcyB0byB0aGUgcHJvamVjdCAob3JnYW5pemF0aW9uLWxldmVsIGNoZWNrKVxyXG4gICAgICAvLyBJbiBhIHJlYWwgaW1wbGVtZW50YXRpb24sIHlvdSB3b3VsZCBmZXRjaCB0aGUgcHJvamVjdCBhbmQgdmVyaWZ5IG9yZ2FuaXphdGlvbklkIG1hdGNoZXNcclxuICAgICAgLy8gRm9yIG5vdywgd2UgdHJ1c3QgdGhhdCB0aGUgZXhlY3V0aW9uIGJlbG9uZ3MgdG8gdGhlIHVzZXIncyBvcmdhbml6YXRpb25cclxuXHJcbiAgICAgIC8vIENhbGN1bGF0ZSBjdXJyZW50IHN0ZXAgKGxhc3QgY29tcGxldGVkIHN0ZXAgKyAxLCBvciAwIGlmIG5vbmUgY29tcGxldGVkKVxyXG4gICAgICBsZXQgY3VycmVudFN0ZXA6IG51bWJlciB8IHVuZGVmaW5lZDtcclxuICAgICAgaWYgKGV4ZWN1dGlvbi5zdGF0dXMgPT09ICdydW5uaW5nJykge1xyXG4gICAgICAgIGNvbnN0IGNvbXBsZXRlZFN0ZXBzID0gZXhlY3V0aW9uLnN0ZXBzLmZpbHRlcihcclxuICAgICAgICAgIHMgPT4gcy5zdGF0dXMgPT09ICdwYXNzJyB8fCBzLnN0YXR1cyA9PT0gJ2ZhaWwnIHx8IHMuc3RhdHVzID09PSAnZXJyb3InXHJcbiAgICAgICAgKTtcclxuICAgICAgICBjdXJyZW50U3RlcCA9IGNvbXBsZXRlZFN0ZXBzLmxlbmd0aDtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2FsY3VsYXRlIGR1cmF0aW9uXHJcbiAgICAgIGxldCBkdXJhdGlvbjogbnVtYmVyIHwgdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoZXhlY3V0aW9uLmVuZFRpbWUpIHtcclxuICAgICAgICBkdXJhdGlvbiA9IGV4ZWN1dGlvbi5kdXJhdGlvbjtcclxuICAgICAgfSBlbHNlIGlmIChleGVjdXRpb24uc3RhcnRUaW1lKSB7XHJcbiAgICAgICAgLy8gQ2FsY3VsYXRlIGN1cnJlbnQgZHVyYXRpb24gZm9yIHJ1bm5pbmcgZXhlY3V0aW9uc1xyXG4gICAgICAgIGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIG5ldyBEYXRlKGV4ZWN1dGlvbi5zdGFydFRpbWUpLmdldFRpbWUoKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2U6IEV4ZWN1dGlvblN0YXR1c1Jlc3BvbnNlID0ge1xyXG4gICAgICAgIGV4ZWN1dGlvbklkOiBleGVjdXRpb24uZXhlY3V0aW9uSWQsXHJcbiAgICAgICAgc3RhdHVzOiBleGVjdXRpb24uc3RhdHVzLFxyXG4gICAgICAgIHJlc3VsdDogZXhlY3V0aW9uLnJlc3VsdCxcclxuICAgICAgICBjdXJyZW50U3RlcCxcclxuICAgICAgICB0b3RhbFN0ZXBzOiBleGVjdXRpb24uc3RlcHMubGVuZ3RoLFxyXG4gICAgICAgIHN0YXJ0VGltZTogZXhlY3V0aW9uLnN0YXJ0VGltZSxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBleGVjdXRpb24gc3RhdHVzOicsIGVycm9yKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXHJcbiAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbn07XHJcbiJdfQ==