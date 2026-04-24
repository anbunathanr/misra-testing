"use strict";
/**
 * Get File Status Lambda Function
 *
 * Returns the current status of a file and its associated analysis
 * Used by the frontend to poll for analysis completion
 *
 * Request:
 * GET /files/{fileId}/status
 *
 * Response:
 * {
 *   "fileId": "file-123",
 *   "fileName": "sample.c",
 *   "uploadedAt": 1234567890,
 *   "analysisId": "analysis-456",
 *   "analysisStatus": "completed|pending|failed",
 *   "analysisProgress": 75,
 *   "analysisMessage": "Analyzing...",
 *   "errorMessage": null
 * }
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const cors_1 = require("../../utils/cors");
const logger_1 = require("../../utils/logger");
const logger = (0, logger_1.createLogger)('GetFileStatus');
const dynamoClient = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1'
});
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    try {
        logger.info('Get file status request received', {
            correlationId,
            path: event.path,
            method: event.httpMethod
        });
        // Extract fileId from path
        const fileId = event.pathParameters?.fileId;
        if (!fileId) {
            return errorResponse(400, 'MISSING_FILE_ID', 'File ID is required', correlationId);
        }
        logger.info('Fetching file status', {
            correlationId,
            fileId
        });
        // Get file metadata
        const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata';
        const fileMetadata = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
            TableName: fileMetadataTable,
            Key: { fileId }
        }));
        if (!fileMetadata.Item) {
            return errorResponse(404, 'FILE_NOT_FOUND', 'File not found', correlationId);
        }
        const file = fileMetadata.Item;
        logger.info('File metadata retrieved', {
            correlationId,
            fileId,
            fileName: file.fileName
        });
        // Get analysis status if analysisId exists
        let analysisStatus = 'pending';
        let analysisProgress = 0;
        let analysisMessage = 'Waiting for analysis to start...';
        let errorMessage;
        if (file.analysisId) {
            const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults';
            const analysisResult = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: analysisResultsTable,
                Key: { analysisId: file.analysisId }
            }));
            if (analysisResult.Item) {
                const analysis = analysisResult.Item;
                analysisStatus = analysis.status || 'pending';
                analysisProgress = analysis.progress || 0;
                analysisMessage = analysis.message || getDefaultMessage(analysisStatus);
                errorMessage = analysis.error;
                logger.info('Analysis status retrieved', {
                    correlationId,
                    fileId,
                    analysisId: file.analysisId,
                    status: analysisStatus,
                    progress: analysisProgress
                });
            }
        }
        const response = {
            fileId,
            fileName: file.fileName,
            uploadedAt: file.uploadedAt || Date.now(),
            analysisId: file.analysisId,
            analysisStatus: analysisStatus,
            analysisProgress,
            analysisMessage,
            errorMessage
        };
        logger.info('File status retrieved successfully', {
            correlationId,
            fileId,
            analysisStatus
        });
        return {
            statusCode: 200,
            headers: cors_1.corsHeaders,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        logger.error('Get file status failed', {
            correlationId,
            error: error.message,
            stack: error.stack
        });
        return errorResponse(500, 'GET_STATUS_FAILED', error.message || 'Failed to get file status', correlationId);
    }
};
exports.handler = handler;
/**
 * Get default message based on analysis status
 */
function getDefaultMessage(status) {
    const messages = {
        'pending': 'Waiting for analysis to start...',
        'in_progress': 'Analysis in progress...',
        'completed': 'Analysis completed successfully',
        'failed': 'Analysis failed'
    };
    return messages[status] || 'Unknown status';
}
/**
 * Standard error response
 */
function errorResponse(statusCode, code, message, correlationId) {
    return {
        statusCode,
        headers: cors_1.corsHeaders,
        body: JSON.stringify({
            error: {
                code,
                message,
                timestamp: new Date().toISOString(),
                requestId: correlationId
            }
        })
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZpbGUtc3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWZpbGUtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7OztBQUdILDhEQUEwRDtBQUMxRCx3REFBaUU7QUFDakUsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsZUFBZSxDQUFDLENBQUM7QUFDN0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQWFJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuRyxJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO1lBQzlDLGFBQWE7WUFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVO1NBQ3pCLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztRQUM1QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsaUJBQWlCLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUU7WUFDbEMsYUFBYTtZQUNi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LEtBQUssQ0FBQyx3QkFBd0IsRUFBRTtZQUNyQyxhQUFhO1lBQ2IsS0FBSyxFQUFFLEtBQUssQ0FBQyxPQUFPO1lBQ3BCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztTQUNuQixDQUFDLENBQUM7UUFFSCxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLE9BQU8sSUFBSSwyQkFBMkIsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUM5RyxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBckdXLFFBQUEsT0FBTyxXQXFHbEI7QUFFRjs7R0FFRztBQUNILFNBQVMsaUJBQWlCLENBQUMsTUFBYztJQUN2QyxNQUFNLFFBQVEsR0FBMkI7UUFDdkMsU0FBUyxFQUFFLGtDQUFrQztRQUM3QyxhQUFhLEVBQUUseUJBQXlCO1FBQ3hDLFdBQVcsRUFBRSxpQ0FBaUM7UUFDOUMsUUFBUSxFQUFFLGlCQUFpQjtLQUM1QixDQUFDO0lBQ0YsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksZ0JBQWdCLENBQUM7QUFDOUMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxhQUFhLENBQ3BCLFVBQWtCLEVBQ2xCLElBQVksRUFDWixPQUFlLEVBQ2YsYUFBcUI7SUFFckIsT0FBTztRQUNMLFVBQVU7UUFDVixPQUFPLEVBQUUsa0JBQVc7UUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbkIsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxhQUFhO2FBQ3pCO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEdldCBGaWxlIFN0YXR1cyBMYW1iZGEgRnVuY3Rpb25cclxuICogXHJcbiAqIFJldHVybnMgdGhlIGN1cnJlbnQgc3RhdHVzIG9mIGEgZmlsZSBhbmQgaXRzIGFzc29jaWF0ZWQgYW5hbHlzaXNcclxuICogVXNlZCBieSB0aGUgZnJvbnRlbmQgdG8gcG9sbCBmb3IgYW5hbHlzaXMgY29tcGxldGlvblxyXG4gKiBcclxuICogUmVxdWVzdDpcclxuICogR0VUIC9maWxlcy97ZmlsZUlkfS9zdGF0dXNcclxuICogXHJcbiAqIFJlc3BvbnNlOlxyXG4gKiB7XHJcbiAqICAgXCJmaWxlSWRcIjogXCJmaWxlLTEyM1wiLFxyXG4gKiAgIFwiZmlsZU5hbWVcIjogXCJzYW1wbGUuY1wiLFxyXG4gKiAgIFwidXBsb2FkZWRBdFwiOiAxMjM0NTY3ODkwLFxyXG4gKiAgIFwiYW5hbHlzaXNJZFwiOiBcImFuYWx5c2lzLTQ1NlwiLFxyXG4gKiAgIFwiYW5hbHlzaXNTdGF0dXNcIjogXCJjb21wbGV0ZWR8cGVuZGluZ3xmYWlsZWRcIixcclxuICogICBcImFuYWx5c2lzUHJvZ3Jlc3NcIjogNzUsXHJcbiAqICAgXCJhbmFseXNpc01lc3NhZ2VcIjogXCJBbmFseXppbmcuLi5cIixcclxuICogICBcImVycm9yTWVzc2FnZVwiOiBudWxsXHJcbiAqIH1cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgR2V0Q29tbWFuZCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgY29yc0hlYWRlcnMgfSBmcm9tICcuLi8uLi91dGlscy9jb3JzJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignR2V0RmlsZVN0YXR1cycpO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyBcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgXHJcbn0pO1xyXG5cclxuaW50ZXJmYWNlIEZpbGVTdGF0dXNSZXNwb25zZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICB1cGxvYWRlZEF0OiBudW1iZXI7XHJcbiAgYW5hbHlzaXNJZD86IHN0cmluZztcclxuICBhbmFseXNpc1N0YXR1czogJ3BlbmRpbmcnIHwgJ2luX3Byb2dyZXNzJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCc7XHJcbiAgYW5hbHlzaXNQcm9ncmVzczogbnVtYmVyO1xyXG4gIGFuYWx5c2lzTWVzc2FnZTogc3RyaW5nO1xyXG4gIGVycm9yTWVzc2FnZT86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICBcclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ0dldCBmaWxlIHN0YXR1cyByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2RcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgZmlsZUlkIGZyb20gcGF0aFxyXG4gICAgY29uc3QgZmlsZUlkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmZpbGVJZDtcclxuICAgIGlmICghZmlsZUlkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRklMRV9JRCcsICdGaWxlIElEIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0ZldGNoaW5nIGZpbGUgc3RhdHVzJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBmaWxlSWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBmaWxlIG1ldGFkYXRhXHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YSc7XHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGEgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogeyBmaWxlSWQgfVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGlmICghZmlsZU1ldGFkYXRhLkl0ZW0pIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA0LCAnRklMRV9OT1RfRk9VTkQnLCAnRmlsZSBub3QgZm91bmQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlID0gZmlsZU1ldGFkYXRhLkl0ZW07XHJcbiAgICBsb2dnZXIuaW5mbygnRmlsZSBtZXRhZGF0YSByZXRyaWV2ZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZmlsZU5hbWU6IGZpbGUuZmlsZU5hbWVcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBhbmFseXNpcyBzdGF0dXMgaWYgYW5hbHlzaXNJZCBleGlzdHNcclxuICAgIGxldCBhbmFseXNpc1N0YXR1cyA9ICdwZW5kaW5nJztcclxuICAgIGxldCBhbmFseXNpc1Byb2dyZXNzID0gMDtcclxuICAgIGxldCBhbmFseXNpc01lc3NhZ2UgPSAnV2FpdGluZyBmb3IgYW5hbHlzaXMgdG8gc3RhcnQuLi4nO1xyXG4gICAgbGV0IGVycm9yTWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cclxuICAgIGlmIChmaWxlLmFuYWx5c2lzSWQpIHtcclxuICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFIHx8ICdBbmFseXNpc1Jlc3VsdHMnO1xyXG4gICAgICBjb25zdCBhbmFseXNpc1Jlc3VsdCA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICAgIEtleTogeyBhbmFseXNpc0lkOiBmaWxlLmFuYWx5c2lzSWQgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoYW5hbHlzaXNSZXN1bHQuSXRlbSkge1xyXG4gICAgICAgIGNvbnN0IGFuYWx5c2lzID0gYW5hbHlzaXNSZXN1bHQuSXRlbTtcclxuICAgICAgICBhbmFseXNpc1N0YXR1cyA9IGFuYWx5c2lzLnN0YXR1cyB8fCAncGVuZGluZyc7XHJcbiAgICAgICAgYW5hbHlzaXNQcm9ncmVzcyA9IGFuYWx5c2lzLnByb2dyZXNzIHx8IDA7XHJcbiAgICAgICAgYW5hbHlzaXNNZXNzYWdlID0gYW5hbHlzaXMubWVzc2FnZSB8fCBnZXREZWZhdWx0TWVzc2FnZShhbmFseXNpc1N0YXR1cyk7XHJcbiAgICAgICAgZXJyb3JNZXNzYWdlID0gYW5hbHlzaXMuZXJyb3I7XHJcblxyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdBbmFseXNpcyBzdGF0dXMgcmV0cmlldmVkJywge1xyXG4gICAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICAgIGZpbGVJZCxcclxuICAgICAgICAgIGFuYWx5c2lzSWQ6IGZpbGUuYW5hbHlzaXNJZCxcclxuICAgICAgICAgIHN0YXR1czogYW5hbHlzaXNTdGF0dXMsXHJcbiAgICAgICAgICBwcm9ncmVzczogYW5hbHlzaXNQcm9ncmVzc1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEZpbGVTdGF0dXNSZXNwb25zZSA9IHtcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBmaWxlTmFtZTogZmlsZS5maWxlTmFtZSxcclxuICAgICAgdXBsb2FkZWRBdDogZmlsZS51cGxvYWRlZEF0IHx8IERhdGUubm93KCksXHJcbiAgICAgIGFuYWx5c2lzSWQ6IGZpbGUuYW5hbHlzaXNJZCxcclxuICAgICAgYW5hbHlzaXNTdGF0dXM6IGFuYWx5c2lzU3RhdHVzIGFzIGFueSxcclxuICAgICAgYW5hbHlzaXNQcm9ncmVzcyxcclxuICAgICAgYW5hbHlzaXNNZXNzYWdlLFxyXG4gICAgICBlcnJvck1lc3NhZ2VcclxuICAgIH07XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0ZpbGUgc3RhdHVzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgYW5hbHlzaXNTdGF0dXNcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdHZXQgZmlsZSBzdGF0dXMgZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdHRVRfU1RBVFVTX0ZBSUxFRCcsIGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBnZXQgZmlsZSBzdGF0dXMnLCBjb3JyZWxhdGlvbklkKTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IGRlZmF1bHQgbWVzc2FnZSBiYXNlZCBvbiBhbmFseXNpcyBzdGF0dXNcclxuICovXHJcbmZ1bmN0aW9uIGdldERlZmF1bHRNZXNzYWdlKHN0YXR1czogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBtZXNzYWdlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICdwZW5kaW5nJzogJ1dhaXRpbmcgZm9yIGFuYWx5c2lzIHRvIHN0YXJ0Li4uJyxcclxuICAgICdpbl9wcm9ncmVzcyc6ICdBbmFseXNpcyBpbiBwcm9ncmVzcy4uLicsXHJcbiAgICAnY29tcGxldGVkJzogJ0FuYWx5c2lzIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgJ2ZhaWxlZCc6ICdBbmFseXNpcyBmYWlsZWQnXHJcbiAgfTtcclxuICByZXR1cm4gbWVzc2FnZXNbc3RhdHVzXSB8fCAnVW5rbm93biBzdGF0dXMnO1xyXG59XHJcblxyXG4vKipcclxuICogU3RhbmRhcmQgZXJyb3IgcmVzcG9uc2VcclxuICovXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufVxyXG4iXX0=