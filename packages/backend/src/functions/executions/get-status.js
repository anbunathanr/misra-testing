"use strict";
/**
 * Get Execution Status Lambda
 * Returns current status and progress information for a test execution
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_execution_db_service_1 = require("../../services/test-execution-db-service");
const auth_middleware_1 = require("../../middleware/auth-middleware");
exports.handler = (0, auth_middleware_1.withAuthAndPermission)('tests', 'read', async (event) => {
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
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXN0YXR1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdldC1zdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBR0gsd0ZBQWtGO0FBQ2xGLHNFQUE2RjtBQVloRixRQUFBLE9BQU8sR0FBRyxJQUFBLHVDQUFxQixFQUMxQyxPQUFPLEVBQ1AsTUFBTSxFQUNOLEtBQUssRUFBRSxLQUF5QixFQUFrQyxFQUFFO0lBQ2xFLElBQUksQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBFLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQztRQUV0RCxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSx5QkFBeUI7aUJBQ25DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDhCQUE4QjtRQUM5QixNQUFNLFNBQVMsR0FBRyxNQUFNLGtEQUFzQixDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUV6RSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLHdCQUF3QixXQUFXLEVBQUU7aUJBQy9DLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELG1FQUFtRTtRQUNuRSwwRkFBMEY7UUFDMUYsMEVBQTBFO1FBRTFFLDJFQUEyRTtRQUMzRSxJQUFJLFdBQStCLENBQUM7UUFDcEMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUMzQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUN4RSxDQUFDO1lBQ0YsV0FBVyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUM7UUFDdEMsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixJQUFJLFFBQTRCLENBQUM7UUFDakMsSUFBSSxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDdEIsUUFBUSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQUM7UUFDaEMsQ0FBQzthQUFNLElBQUksU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQy9CLG9EQUFvRDtZQUNwRCxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsRSxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQTRCO1lBQ3hDLFdBQVcsRUFBRSxTQUFTLENBQUMsV0FBVztZQUNsQyxNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU07WUFDeEIsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNO1lBQ3hCLFdBQVc7WUFDWCxVQUFVLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQ2xDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztZQUM5QixRQUFRO1NBQ1QsQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogR2V0IEV4ZWN1dGlvbiBTdGF0dXMgTGFtYmRhXHJcbiAqIFJldHVybnMgY3VycmVudCBzdGF0dXMgYW5kIHByb2dyZXNzIGluZm9ybWF0aW9uIGZvciBhIHRlc3QgZXhlY3V0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWV4ZWN1dGlvbi1kYi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgd2l0aEF1dGhBbmRQZXJtaXNzaW9uLCBBdXRoZW50aWNhdGVkRXZlbnQgfSBmcm9tICcuLi8uLi9taWRkbGV3YXJlL2F1dGgtbWlkZGxld2FyZSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEV4ZWN1dGlvblN0YXR1c1Jlc3BvbnNlIHtcclxuICBleGVjdXRpb25JZDogc3RyaW5nO1xyXG4gIHN0YXR1czogc3RyaW5nO1xyXG4gIHJlc3VsdD86IHN0cmluZztcclxuICBjdXJyZW50U3RlcD86IG51bWJlcjtcclxuICB0b3RhbFN0ZXBzOiBudW1iZXI7XHJcbiAgc3RhcnRUaW1lOiBzdHJpbmc7XHJcbiAgZHVyYXRpb24/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gd2l0aEF1dGhBbmRQZXJtaXNzaW9uKFxyXG4gICd0ZXN0cycsXHJcbiAgJ3JlYWQnLFxyXG4gIGFzeW5jIChldmVudDogQXV0aGVudGljYXRlZEV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdHZXQgZXhlY3V0aW9uIHN0YXR1cyByZXF1ZXN0OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50KSk7XHJcblxyXG4gICAgICAvLyBFeHRyYWN0IGV4ZWN1dGlvbklkIGZyb20gcGF0aCBwYXJhbWV0ZXJzXHJcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbklkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmV4ZWN1dGlvbklkO1xyXG5cclxuICAgICAgaWYgKCFleGVjdXRpb25JZCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBtZXNzYWdlOiAnZXhlY3V0aW9uSWQgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gR2V0IGV4ZWN1dGlvbiBmcm9tIGRhdGFiYXNlXHJcbiAgICAgIGNvbnN0IGV4ZWN1dGlvbiA9IGF3YWl0IHRlc3RFeGVjdXRpb25EQlNlcnZpY2UuZ2V0RXhlY3V0aW9uKGV4ZWN1dGlvbklkKTtcclxuXHJcbiAgICAgIGlmICghZXhlY3V0aW9uKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcclxuICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBFeGVjdXRpb24gbm90IGZvdW5kOiAke2V4ZWN1dGlvbklkfWAsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBWZXJpZnkgdXNlciBoYXMgYWNjZXNzIHRvIHRoZSBwcm9qZWN0IChvcmdhbml6YXRpb24tbGV2ZWwgY2hlY2spXHJcbiAgICAgIC8vIEluIGEgcmVhbCBpbXBsZW1lbnRhdGlvbiwgeW91IHdvdWxkIGZldGNoIHRoZSBwcm9qZWN0IGFuZCB2ZXJpZnkgb3JnYW5pemF0aW9uSWQgbWF0Y2hlc1xyXG4gICAgICAvLyBGb3Igbm93LCB3ZSB0cnVzdCB0aGF0IHRoZSBleGVjdXRpb24gYmVsb25ncyB0byB0aGUgdXNlcidzIG9yZ2FuaXphdGlvblxyXG5cclxuICAgICAgLy8gQ2FsY3VsYXRlIGN1cnJlbnQgc3RlcCAobGFzdCBjb21wbGV0ZWQgc3RlcCArIDEsIG9yIDAgaWYgbm9uZSBjb21wbGV0ZWQpXHJcbiAgICAgIGxldCBjdXJyZW50U3RlcDogbnVtYmVyIHwgdW5kZWZpbmVkO1xyXG4gICAgICBpZiAoZXhlY3V0aW9uLnN0YXR1cyA9PT0gJ3J1bm5pbmcnKSB7XHJcbiAgICAgICAgY29uc3QgY29tcGxldGVkU3RlcHMgPSBleGVjdXRpb24uc3RlcHMuZmlsdGVyKFxyXG4gICAgICAgICAgcyA9PiBzLnN0YXR1cyA9PT0gJ3Bhc3MnIHx8IHMuc3RhdHVzID09PSAnZmFpbCcgfHwgcy5zdGF0dXMgPT09ICdlcnJvcidcclxuICAgICAgICApO1xyXG4gICAgICAgIGN1cnJlbnRTdGVwID0gY29tcGxldGVkU3RlcHMubGVuZ3RoO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDYWxjdWxhdGUgZHVyYXRpb25cclxuICAgICAgbGV0IGR1cmF0aW9uOiBudW1iZXIgfCB1bmRlZmluZWQ7XHJcbiAgICAgIGlmIChleGVjdXRpb24uZW5kVGltZSkge1xyXG4gICAgICAgIGR1cmF0aW9uID0gZXhlY3V0aW9uLmR1cmF0aW9uO1xyXG4gICAgICB9IGVsc2UgaWYgKGV4ZWN1dGlvbi5zdGFydFRpbWUpIHtcclxuICAgICAgICAvLyBDYWxjdWxhdGUgY3VycmVudCBkdXJhdGlvbiBmb3IgcnVubmluZyBleGVjdXRpb25zXHJcbiAgICAgICAgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gbmV3IERhdGUoZXhlY3V0aW9uLnN0YXJ0VGltZSkuZ2V0VGltZSgpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZTogRXhlY3V0aW9uU3RhdHVzUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgZXhlY3V0aW9uSWQ6IGV4ZWN1dGlvbi5leGVjdXRpb25JZCxcclxuICAgICAgICBzdGF0dXM6IGV4ZWN1dGlvbi5zdGF0dXMsXHJcbiAgICAgICAgcmVzdWx0OiBleGVjdXRpb24ucmVzdWx0LFxyXG4gICAgICAgIGN1cnJlbnRTdGVwLFxyXG4gICAgICAgIHRvdGFsU3RlcHM6IGV4ZWN1dGlvbi5zdGVwcy5sZW5ndGgsXHJcbiAgICAgICAgc3RhcnRUaW1lOiBleGVjdXRpb24uc3RhcnRUaW1lLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGV4ZWN1dGlvbiBzdGF0dXM6JywgZXJyb3IpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBtZXNzYWdlOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcclxuICAgICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcbik7XHJcbiJdfQ==