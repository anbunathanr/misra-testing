"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION }));
const handler = async (event) => {
    try {
        const analysisId = event.pathParameters?.analysisId;
        if (!analysisId) {
            return errorResponse(400, 'MISSING_ANALYSIS_ID', 'Analysis ID is required');
        }
        // Get analysis record from DynamoDB
        const analysisRecord = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
            TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME,
            Key: { analysisId }
        }));
        if (!analysisRecord.Item) {
            return errorResponse(404, 'ANALYSIS_NOT_FOUND', 'Analysis not found');
        }
        const analysis = analysisRecord.Item;
        // Return real analysis status from database
        let currentProgress = analysis.progress || 0;
        let status = analysis.status;
        let estimatedTimeRemaining;
        // Calculate estimated time remaining for running analyses
        if (status === 'running' && currentProgress < 100) {
            const runTime = Date.now() - new Date(analysis.createdAt).getTime();
            const estimatedTotal = analysis.estimatedDuration || 120000; // 2 minutes default
            const progressRate = currentProgress / runTime;
            estimatedTimeRemaining = Math.max(5, Math.floor((100 - currentProgress) / progressRate / 1000));
        }
        // If analysis is completed, ensure we have results
        if (status === 'completed' && !analysis.results) {
            // This shouldn't happen in production, but handle gracefully
            status = 'failed';
            analysis.error = 'Analysis completed but results not found';
        }
        const response = {
            analysisId,
            status,
            progress: currentProgress,
            estimatedTimeRemaining,
            results: analysis.results,
            error: analysis.error,
            createdAt: analysis.createdAt,
            completedAt: analysis.completedAt
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLDhEQUEwRDtBQUMxRCx3REFBMEY7QUFFMUYsTUFBTSxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQztBQXFDbEcsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsSUFBSSxDQUFDO1FBQ0gsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUM7UUFFcEQsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxxQkFBcUIsRUFBRSx5QkFBeUIsQ0FBQyxDQUFDO1FBQzlFLENBQUM7UUFFRCxvQ0FBb0M7UUFDcEMsTUFBTSxjQUFjLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUkseUJBQVUsQ0FBQztZQUM1RCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBNEI7WUFDbkQsR0FBRyxFQUFFLEVBQUUsVUFBVSxFQUFFO1NBQ3BCLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN6QixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN4RSxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQztRQUVyQyw0Q0FBNEM7UUFDNUMsSUFBSSxlQUFlLEdBQUcsUUFBUSxDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUM7UUFDN0MsSUFBSSxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUM3QixJQUFJLHNCQUFzQixDQUFDO1FBRTNCLDBEQUEwRDtRQUMxRCxJQUFJLE1BQU0sS0FBSyxTQUFTLElBQUksZUFBZSxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEUsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixJQUFJLE1BQU0sQ0FBQyxDQUFDLG9CQUFvQjtZQUNqRixNQUFNLFlBQVksR0FBRyxlQUFlLEdBQUcsT0FBTyxDQUFDO1lBQy9DLHNCQUFzQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEdBQUcsZUFBZSxDQUFDLEdBQUcsWUFBWSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEcsQ0FBQztRQUVELG1EQUFtRDtRQUNuRCxJQUFJLE1BQU0sS0FBSyxXQUFXLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEQsNkRBQTZEO1lBQzdELE1BQU0sR0FBRyxRQUFRLENBQUM7WUFDbEIsUUFBUSxDQUFDLEtBQUssR0FBRywwQ0FBMEMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQTJCO1lBQ3ZDLFVBQVU7WUFDVixNQUFNO1lBQ04sUUFBUSxFQUFFLGVBQWU7WUFDekIsc0JBQXNCO1lBQ3RCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztZQUN6QixLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsU0FBUyxFQUFFLFFBQVEsQ0FBQyxTQUFTO1lBQzdCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztTQUNsQyxDQUFDO1FBRUYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjthQUM3RDtZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDO0lBRUosQ0FBQztJQUFDLE9BQU8sS0FBVSxFQUFFLENBQUM7UUFDcEIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMvQyxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsb0RBQW9ELENBQUMsQ0FBQztJQUN4RyxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBakVXLFFBQUEsT0FBTyxXQWlFbEI7QUFFRixTQUFTLGFBQWEsQ0FBQyxVQUFrQixFQUFFLElBQVksRUFBRSxPQUFlO0lBQ3RFLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFO1lBQ1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1lBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtTQUM3RDtRQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3BDO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIEdldENvbW1hbmQsIFVwZGF0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5cclxuY29uc3QgZHluYW1vQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB9KSk7XHJcblxyXG5pbnRlcmZhY2UgQW5hbHlzaXNTdGF0dXNSZXNwb25zZSB7XHJcbiAgYW5hbHlzaXNJZDogc3RyaW5nO1xyXG4gIHN0YXR1czogJ3F1ZXVlZCcgfCAncnVubmluZycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnO1xyXG4gIHByb2dyZXNzOiBudW1iZXI7XHJcbiAgZXN0aW1hdGVkVGltZVJlbWFpbmluZz86IG51bWJlcjtcclxuICByZXN1bHRzPzogQW5hbHlzaXNSZXN1bHRzO1xyXG4gIGVycm9yPzogc3RyaW5nO1xyXG4gIGNyZWF0ZWRBdDogc3RyaW5nO1xyXG4gIGNvbXBsZXRlZEF0Pzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgQW5hbHlzaXNSZXN1bHRzIHtcclxuICBjb21wbGlhbmNlU2NvcmU6IG51bWJlcjtcclxuICB2aW9sYXRpb25zOiBWaW9sYXRpb25EZXRhaWxbXTtcclxuICBzdW1tYXJ5OiB7XHJcbiAgICB0b3RhbFJ1bGVzOiBudW1iZXI7XHJcbiAgICBwYXNzZWRSdWxlczogbnVtYmVyO1xyXG4gICAgZmFpbGVkUnVsZXM6IG51bWJlcjtcclxuICAgIHdhcm5pbmdSdWxlczogbnVtYmVyO1xyXG4gIH07XHJcbiAgcmVwb3J0VXJsPzogc3RyaW5nO1xyXG4gIGR1cmF0aW9uOiBudW1iZXI7XHJcbn1cclxuXHJcbmludGVyZmFjZSBWaW9sYXRpb25EZXRhaWwge1xyXG4gIHJ1bGVJZDogc3RyaW5nO1xyXG4gIHJ1bGVOYW1lOiBzdHJpbmc7XHJcbiAgc2V2ZXJpdHk6ICdlcnJvcicgfCAnd2FybmluZycgfCAnaW5mbyc7XHJcbiAgbGluZTogbnVtYmVyO1xyXG4gIGNvbHVtbjogbnVtYmVyO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICBzdWdnZXN0aW9uPzogc3RyaW5nO1xyXG4gIGNhdGVnb3J5OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGFuYWx5c2lzSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uYW5hbHlzaXNJZDtcclxuXHJcbiAgICBpZiAoIWFuYWx5c2lzSWQpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19BTkFMWVNJU19JRCcsICdBbmFseXNpcyBJRCBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBhbmFseXNpcyByZWNvcmQgZnJvbSBEeW5hbW9EQlxyXG4gICAgY29uc3QgYW5hbHlzaXNSZWNvcmQgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FISxcclxuICAgICAgS2V5OiB7IGFuYWx5c2lzSWQgfVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGlmICghYW5hbHlzaXNSZWNvcmQuSXRlbSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDQsICdBTkFMWVNJU19OT1RfRk9VTkQnLCAnQW5hbHlzaXMgbm90IGZvdW5kJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYW5hbHlzaXMgPSBhbmFseXNpc1JlY29yZC5JdGVtO1xyXG4gICAgXHJcbiAgICAvLyBSZXR1cm4gcmVhbCBhbmFseXNpcyBzdGF0dXMgZnJvbSBkYXRhYmFzZVxyXG4gICAgbGV0IGN1cnJlbnRQcm9ncmVzcyA9IGFuYWx5c2lzLnByb2dyZXNzIHx8IDA7XHJcbiAgICBsZXQgc3RhdHVzID0gYW5hbHlzaXMuc3RhdHVzO1xyXG4gICAgbGV0IGVzdGltYXRlZFRpbWVSZW1haW5pbmc7XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGVzdGltYXRlZCB0aW1lIHJlbWFpbmluZyBmb3IgcnVubmluZyBhbmFseXNlc1xyXG4gICAgaWYgKHN0YXR1cyA9PT0gJ3J1bm5pbmcnICYmIGN1cnJlbnRQcm9ncmVzcyA8IDEwMCkge1xyXG4gICAgICBjb25zdCBydW5UaW1lID0gRGF0ZS5ub3coKSAtIG5ldyBEYXRlKGFuYWx5c2lzLmNyZWF0ZWRBdCkuZ2V0VGltZSgpO1xyXG4gICAgICBjb25zdCBlc3RpbWF0ZWRUb3RhbCA9IGFuYWx5c2lzLmVzdGltYXRlZER1cmF0aW9uIHx8IDEyMDAwMDsgLy8gMiBtaW51dGVzIGRlZmF1bHRcclxuICAgICAgY29uc3QgcHJvZ3Jlc3NSYXRlID0gY3VycmVudFByb2dyZXNzIC8gcnVuVGltZTtcclxuICAgICAgZXN0aW1hdGVkVGltZVJlbWFpbmluZyA9IE1hdGgubWF4KDUsIE1hdGguZmxvb3IoKDEwMCAtIGN1cnJlbnRQcm9ncmVzcykgLyBwcm9ncmVzc1JhdGUgLyAxMDAwKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgYW5hbHlzaXMgaXMgY29tcGxldGVkLCBlbnN1cmUgd2UgaGF2ZSByZXN1bHRzXHJcbiAgICBpZiAoc3RhdHVzID09PSAnY29tcGxldGVkJyAmJiAhYW5hbHlzaXMucmVzdWx0cykge1xyXG4gICAgICAvLyBUaGlzIHNob3VsZG4ndCBoYXBwZW4gaW4gcHJvZHVjdGlvbiwgYnV0IGhhbmRsZSBncmFjZWZ1bGx5XHJcbiAgICAgIHN0YXR1cyA9ICdmYWlsZWQnO1xyXG4gICAgICBhbmFseXNpcy5lcnJvciA9ICdBbmFseXNpcyBjb21wbGV0ZWQgYnV0IHJlc3VsdHMgbm90IGZvdW5kJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogQW5hbHlzaXNTdGF0dXNSZXNwb25zZSA9IHtcclxuICAgICAgYW5hbHlzaXNJZCxcclxuICAgICAgc3RhdHVzLFxyXG4gICAgICBwcm9ncmVzczogY3VycmVudFByb2dyZXNzLFxyXG4gICAgICBlc3RpbWF0ZWRUaW1lUmVtYWluaW5nLFxyXG4gICAgICByZXN1bHRzOiBhbmFseXNpcy5yZXN1bHRzLFxyXG4gICAgICBlcnJvcjogYW5hbHlzaXMuZXJyb3IsXHJcbiAgICAgIGNyZWF0ZWRBdDogYW5hbHlzaXMuY3JlYXRlZEF0LFxyXG4gICAgICBjb21wbGV0ZWRBdDogYW5hbHlzaXMuY29tcGxldGVkQXRcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdBbmFseXNpcyBzdGF0dXMgZXJyb3I6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNTAwLCAnU1RBVFVTX0NIRUNLX0VSUk9SJywgJ0ZhaWxlZCB0byBjaGVjayBhbmFseXNpcyBzdGF0dXMuIFBsZWFzZSB0cnkgYWdhaW4uJyk7XHJcbiAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShzdGF0dXNDb2RlOiBudW1iZXIsIGNvZGU6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59Il19