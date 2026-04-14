"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const analysis_monitor_1 = require("../../services/misra-analysis/analysis-monitor");
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION }));
const handler = async (event) => {
    try {
        const analysisId = event.pathParameters?.analysisId;
        if (!analysisId) {
            return errorResponse(400, 'MISSING_ANALYSIS_ID', 'Analysis ID is required');
        }
        // Use analysis monitor to get comprehensive progress information
        // Requirements: 3.3 (2-second polling), 3.4 (estimated time remaining)
        const progress = await analysis_monitor_1.analysisMonitor.getAnalysisProgress(analysisId);
        if (!progress) {
            return errorResponse(404, 'ANALYSIS_NOT_FOUND', 'Analysis not found');
        }
        // Get full analysis record for results if completed
        let results;
        let error;
        let completedAt;
        if (progress.status === 'completed' || progress.status === 'failed') {
            try {
                const analysisRecord = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
                    TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME,
                    Key: { analysisId }
                }));
                if (analysisRecord && analysisRecord.Item) {
                    results = analysisRecord.Item.results;
                    error = analysisRecord.Item.error;
                    completedAt = analysisRecord.Item.completedAt;
                }
            }
            catch (dbError) {
                // Log error but don't fail the request - progress data is sufficient
                console.warn('Failed to fetch additional analysis data from DynamoDB:', dbError);
            }
        }
        const response = {
            analysisId,
            status: progress.status,
            progress: progress.progress,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
            rulesProcessed: progress.rulesProcessed,
            totalRules: progress.totalRules,
            currentStep: progress.currentStep,
            results,
            error,
            createdAt: new Date(progress.startTime).toISOString(),
            completedAt
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        console.error('Analysis status error:', error);
        return errorResponse(500, 'STATUS_CHECK_ERROR', 'Failed to check analysis status. Please try again.');
    }
};
exports.handler = handler;
function errorResponse(statusCode, code, message) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString()
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhEQUEwRDtBQUMxRCx3REFBMEY7QUFDMUYscUZBQWlGO0FBRWpGLE1BQU0sWUFBWSxHQUFHLHFDQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUF3Q2xHLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLElBQUksQ0FBQztRQUNILE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDO1FBRXBELElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUscUJBQXFCLEVBQUUseUJBQXlCLENBQUMsQ0FBQztRQUM5RSxDQUFDO1FBRUQsaUVBQWlFO1FBQ2pFLHVFQUF1RTtRQUN2RSxNQUFNLFFBQVEsR0FBRyxNQUFNLGtDQUFlLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFdkUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDeEUsQ0FBQztRQUVELG9EQUFvRDtRQUNwRCxJQUFJLE9BQW9DLENBQUM7UUFDekMsSUFBSSxLQUF5QixDQUFDO1FBQzlCLElBQUksV0FBK0IsQ0FBQztRQUVwQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssV0FBVyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDcEUsSUFBSSxDQUFDO2dCQUNILE1BQU0sY0FBYyxHQUFHLE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLHlCQUFVLENBQUM7b0JBQzVELFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUE0QjtvQkFDbkQsR0FBRyxFQUFFLEVBQUUsVUFBVSxFQUFFO2lCQUNwQixDQUFDLENBQUMsQ0FBQztnQkFFSixJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzFDLE9BQU8sR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQztvQkFDdEMsS0FBSyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUNsQyxXQUFXLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUM7Z0JBQ2hELENBQUM7WUFDSCxDQUFDO1lBQUMsT0FBTyxPQUFPLEVBQUUsQ0FBQztnQkFDakIscUVBQXFFO2dCQUNyRSxPQUFPLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ25GLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQTJCO1lBQ3ZDLFVBQVU7WUFDVixNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU07WUFDdkIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxRQUFRO1lBQzNCLHNCQUFzQixFQUFFLFFBQVEsQ0FBQyxzQkFBc0I7WUFDdkQsY0FBYyxFQUFFLFFBQVEsQ0FBQyxjQUFjO1lBQ3ZDLFVBQVUsRUFBRSxRQUFRLENBQUMsVUFBVTtZQUMvQixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7WUFDakMsT0FBTztZQUNQLEtBQUs7WUFDTCxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRTtZQUNyRCxXQUFXO1NBQ1osQ0FBQztRQUVGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2dCQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7YUFDN0Q7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUVKLENBQUM7SUFBQyxPQUFPLEtBQVUsRUFBRSxDQUFDO1FBQ3BCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0MsT0FBTyxhQUFhLENBQUMsR0FBRyxFQUFFLG9CQUFvQixFQUFFLG9EQUFvRCxDQUFDLENBQUM7SUFDeEcsQ0FBQztBQUNILENBQUMsQ0FBQztBQW5FVyxRQUFBLE9BQU8sV0FtRWxCO0FBRUYsU0FBUyxhQUFhLENBQUMsVUFBa0IsRUFBRSxJQUFZLEVBQUUsT0FBZTtJQUN0RSxPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRTtZQUNQLGNBQWMsRUFBRSxrQkFBa0I7WUFDbEMsNkJBQTZCLEVBQUUsR0FBRztZQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7U0FDN0Q7UUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTthQUNwQztTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kLCBVcGRhdGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgYW5hbHlzaXNNb25pdG9yIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvYW5hbHlzaXMtbW9uaXRvcic7XHJcblxyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20obmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIH0pKTtcclxuXHJcbmludGVyZmFjZSBBbmFseXNpc1N0YXR1c1Jlc3BvbnNlIHtcclxuICBhbmFseXNpc0lkOiBzdHJpbmc7XHJcbiAgc3RhdHVzOiAncXVldWVkJyB8ICdydW5uaW5nJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCc7XHJcbiAgcHJvZ3Jlc3M6IG51bWJlcjtcclxuICBlc3RpbWF0ZWRUaW1lUmVtYWluaW5nPzogbnVtYmVyO1xyXG4gIHJ1bGVzUHJvY2Vzc2VkPzogbnVtYmVyO1xyXG4gIHRvdGFsUnVsZXM/OiBudW1iZXI7XHJcbiAgY3VycmVudFN0ZXA/OiBzdHJpbmc7XHJcbiAgcmVzdWx0cz86IEFuYWx5c2lzUmVzdWx0cztcclxuICBlcnJvcj86IHN0cmluZztcclxuICBjcmVhdGVkQXQ6IHN0cmluZztcclxuICBjb21wbGV0ZWRBdD86IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIEFuYWx5c2lzUmVzdWx0cyB7XHJcbiAgY29tcGxpYW5jZVNjb3JlOiBudW1iZXI7XHJcbiAgdmlvbGF0aW9uczogVmlvbGF0aW9uRGV0YWlsW107XHJcbiAgc3VtbWFyeToge1xyXG4gICAgdG90YWxSdWxlczogbnVtYmVyO1xyXG4gICAgcGFzc2VkUnVsZXM6IG51bWJlcjtcclxuICAgIGZhaWxlZFJ1bGVzOiBudW1iZXI7XHJcbiAgICB3YXJuaW5nUnVsZXM6IG51bWJlcjtcclxuICB9O1xyXG4gIHJlcG9ydFVybD86IHN0cmluZztcclxuICBkdXJhdGlvbjogbnVtYmVyO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVmlvbGF0aW9uRGV0YWlsIHtcclxuICBydWxlSWQ6IHN0cmluZztcclxuICBydWxlTmFtZTogc3RyaW5nO1xyXG4gIHNldmVyaXR5OiAnZXJyb3InIHwgJ3dhcm5pbmcnIHwgJ2luZm8nO1xyXG4gIGxpbmU6IG51bWJlcjtcclxuICBjb2x1bW46IG51bWJlcjtcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgc3VnZ2VzdGlvbj86IHN0cmluZztcclxuICBjYXRlZ29yeTogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBhbmFseXNpc0lkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmFuYWx5c2lzSWQ7XHJcblxyXG4gICAgaWYgKCFhbmFseXNpc0lkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQU5BTFlTSVNfSUQnLCAnQW5hbHlzaXMgSUQgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBVc2UgYW5hbHlzaXMgbW9uaXRvciB0byBnZXQgY29tcHJlaGVuc2l2ZSBwcm9ncmVzcyBpbmZvcm1hdGlvblxyXG4gICAgLy8gUmVxdWlyZW1lbnRzOiAzLjMgKDItc2Vjb25kIHBvbGxpbmcpLCAzLjQgKGVzdGltYXRlZCB0aW1lIHJlbWFpbmluZylcclxuICAgIGNvbnN0IHByb2dyZXNzID0gYXdhaXQgYW5hbHlzaXNNb25pdG9yLmdldEFuYWx5c2lzUHJvZ3Jlc3MoYW5hbHlzaXNJZCk7XHJcblxyXG4gICAgaWYgKCFwcm9ncmVzcykge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDQsICdBTkFMWVNJU19OT1RfRk9VTkQnLCAnQW5hbHlzaXMgbm90IGZvdW5kJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2V0IGZ1bGwgYW5hbHlzaXMgcmVjb3JkIGZvciByZXN1bHRzIGlmIGNvbXBsZXRlZFxyXG4gICAgbGV0IHJlc3VsdHM6IEFuYWx5c2lzUmVzdWx0cyB8IHVuZGVmaW5lZDtcclxuICAgIGxldCBlcnJvcjogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgbGV0IGNvbXBsZXRlZEF0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcblxyXG4gICAgaWYgKHByb2dyZXNzLnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcgfHwgcHJvZ3Jlc3Muc3RhdHVzID09PSAnZmFpbGVkJykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGNvbnN0IGFuYWx5c2lzUmVjb3JkID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUUhLFxyXG4gICAgICAgICAgS2V5OiB7IGFuYWx5c2lzSWQgfVxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgaWYgKGFuYWx5c2lzUmVjb3JkICYmIGFuYWx5c2lzUmVjb3JkLkl0ZW0pIHtcclxuICAgICAgICAgIHJlc3VsdHMgPSBhbmFseXNpc1JlY29yZC5JdGVtLnJlc3VsdHM7XHJcbiAgICAgICAgICBlcnJvciA9IGFuYWx5c2lzUmVjb3JkLkl0ZW0uZXJyb3I7XHJcbiAgICAgICAgICBjb21wbGV0ZWRBdCA9IGFuYWx5c2lzUmVjb3JkLkl0ZW0uY29tcGxldGVkQXQ7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoIChkYkVycm9yKSB7XHJcbiAgICAgICAgLy8gTG9nIGVycm9yIGJ1dCBkb24ndCBmYWlsIHRoZSByZXF1ZXN0IC0gcHJvZ3Jlc3MgZGF0YSBpcyBzdWZmaWNpZW50XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdGYWlsZWQgdG8gZmV0Y2ggYWRkaXRpb25hbCBhbmFseXNpcyBkYXRhIGZyb20gRHluYW1vREI6JywgZGJFcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogQW5hbHlzaXNTdGF0dXNSZXNwb25zZSA9IHtcclxuICAgICAgYW5hbHlzaXNJZCxcclxuICAgICAgc3RhdHVzOiBwcm9ncmVzcy5zdGF0dXMsXHJcbiAgICAgIHByb2dyZXNzOiBwcm9ncmVzcy5wcm9ncmVzcyxcclxuICAgICAgZXN0aW1hdGVkVGltZVJlbWFpbmluZzogcHJvZ3Jlc3MuZXN0aW1hdGVkVGltZVJlbWFpbmluZyxcclxuICAgICAgcnVsZXNQcm9jZXNzZWQ6IHByb2dyZXNzLnJ1bGVzUHJvY2Vzc2VkLFxyXG4gICAgICB0b3RhbFJ1bGVzOiBwcm9ncmVzcy50b3RhbFJ1bGVzLFxyXG4gICAgICBjdXJyZW50U3RlcDogcHJvZ3Jlc3MuY3VycmVudFN0ZXAsXHJcbiAgICAgIHJlc3VsdHMsXHJcbiAgICAgIGVycm9yLFxyXG4gICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKHByb2dyZXNzLnN0YXJ0VGltZSkudG9JU09TdHJpbmcoKSxcclxuICAgICAgY29tcGxldGVkQXRcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdBbmFseXNpcyBzdGF0dXMgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnU1RBVFVTX0NIRUNLX0VSUk9SJywgJ0ZhaWxlZCB0byBjaGVjayBhbmFseXNpcyBzdGF0dXMuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShzdGF0dXNDb2RlOiBudW1iZXIsIGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59Il19