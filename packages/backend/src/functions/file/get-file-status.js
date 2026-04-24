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
// Default table names for development
const DEFAULT_FILE_METADATA_TABLE = 'FileMetadata';
const DEFAULT_ANALYSIS_RESULTS_TABLE = 'AnalysisResults';
const handler = async (event) => {
    const correlationId = event.headers['X-Correlation-ID'] || Math.random().toString(36).substring(7);
    try {
        logger.info('Get file status request received', {
            correlationId,
            path: event.path,
            method: event.httpMethod,
            pathParameters: event.pathParameters
        });
        // Extract fileId from path
        const fileId = event.pathParameters?.fileId;
        if (!fileId) {
            return errorResponse(400, 'MISSING_FILE_ID', 'File ID is required', correlationId);
        }
        // Extract userId from authorizer context
        const userId = event.requestContext?.authorizer?.claims?.sub || event.requestContext?.authorizer?.principalId;
        if (!userId) {
            logger.warn('Missing userId in authorizer context', { correlationId, fileId });
            return errorResponse(401, 'UNAUTHORIZED', 'User authentication required', correlationId);
        }
        logger.info('Fetching file status', {
            correlationId,
            fileId,
            userId
        });
        // Get file metadata - need both fileId (partition key) and userId (sort key)
        const fileMetadataTable = process.env.FILE_METADATA_TABLE || DEFAULT_FILE_METADATA_TABLE;
        const fileMetadata = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
            TableName: fileMetadataTable,
            Key: { fileId, userId }
        }));
        if (!fileMetadata.Item) {
            logger.warn('File not found', { correlationId, fileId, userId });
            return errorResponse(404, 'FILE_NOT_FOUND', 'File not found', correlationId);
        }
        const file = fileMetadata.Item;
        logger.info('File metadata retrieved', {
            correlationId,
            fileId,
            userId,
            fileName: file.fileName,
            hasAnalysisId: !!file.analysisId
        });
        // Get analysis status if analysisId exists
        let analysisStatus = 'pending';
        let analysisProgress = 0;
        let analysisMessage = 'Waiting for analysis to start...';
        let errorMessage;
        if (file.analysisId) {
            const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || DEFAULT_ANALYSIS_RESULTS_TABLE;
            logger.info('Checking analysis results', {
                correlationId,
                fileId,
                analysisId: file.analysisId,
                analysisResultsTable
            });
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
        // Return proper CORS headers even on error
        return {
            statusCode: 500,
            headers: cors_1.corsHeaders,
            body: JSON.stringify({
                error: {
                    code: 'GET_STATUS_FAILED',
                    message: error.message || 'Failed to get file status',
                    timestamp: new Date().toISOString(),
                    requestId: correlationId
                }
            })
        };
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZpbGUtc3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWZpbGUtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7OztBQUdILDhEQUEwRDtBQUMxRCx3REFBaUU7QUFDakUsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUVsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsZUFBZSxDQUFDLENBQUM7QUFDN0MsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUVILHNDQUFzQztBQUN0QyxNQUFNLDJCQUEyQixHQUFHLGNBQWMsQ0FBQztBQUNuRCxNQUFNLDhCQUE4QixHQUFHLGlCQUFpQixDQUFDO0FBYWxELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE1BQU0sYUFBYSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUVuRyxJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxFQUFFO1lBQzlDLGFBQWE7WUFDYixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDaEIsTUFBTSxFQUFFLEtBQUssQ0FBQyxVQUFVO1lBQ3hCLGNBQWMsRUFBRSxLQUFLLENBQUMsY0FBYztTQUNyQyxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTyxhQUFhLENBQUMs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Q0FBQztnQkFDbkIsS0FBSyxFQUFFO29CQUNMLElBQUksRUFBRSxtQkFBbUI7b0JBQ3pCLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTyxJQUFJLDJCQUEyQjtvQkFDckQsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO29CQUNuQyxTQUFTLEVBQUUsYUFBYTtpQkFDekI7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFwSVcsUUFBQSxPQUFPLFdBb0lsQjtBQUVGOztHQUVHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxNQUFjO0lBQ3ZDLE1BQU0sUUFBUSxHQUEyQjtRQUN2QyxTQUFTLEVBQUUsa0NBQWtDO1FBQzdDLGFBQWEsRUFBRSx5QkFBeUI7UUFDeEMsV0FBVyxFQUFFLGlDQUFpQztRQUM5QyxRQUFRLEVBQUUsaUJBQWlCO0tBQzVCLENBQUM7SUFDRixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQztBQUM5QyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWUsRUFDZixhQUFxQjtJQUVyQixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLGFBQWE7YUFDekI7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogR2V0IEZpbGUgU3RhdHVzIExhbWJkYSBGdW5jdGlvblxyXG4gKiBcclxuICogUmV0dXJucyB0aGUgY3VycmVudCBzdGF0dXMgb2YgYSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZCBhbmFseXNpc1xyXG4gKiBVc2VkIGJ5IHRoZSBmcm9udGVuZCB0byBwb2xsIGZvciBhbmFseXNpcyBjb21wbGV0aW9uXHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiBHRVQgL2ZpbGVzL3tmaWxlSWR9L3N0YXR1c1xyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcImZpbGVJZFwiOiBcImZpbGUtMTIzXCIsXHJcbiAqICAgXCJmaWxlTmFtZVwiOiBcInNhbXBsZS5jXCIsXHJcbiAqICAgXCJ1cGxvYWRlZEF0XCI6IDEyMzQ1Njc4OTAsXHJcbiAqICAgXCJhbmFseXNpc0lkXCI6IFwiYW5hbHlzaXMtNDU2XCIsXHJcbiAqICAgXCJhbmFseXNpc1N0YXR1c1wiOiBcImNvbXBsZXRlZHxwZW5kaW5nfGZhaWxlZFwiLFxyXG4gKiAgIFwiYW5hbHlzaXNQcm9ncmVzc1wiOiA3NSxcclxuICogICBcImFuYWx5c2lzTWVzc2FnZVwiOiBcIkFuYWx5emluZy4uLlwiLFxyXG4gKiAgIFwiZXJyb3JNZXNzYWdlXCI6IG51bGxcclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBHZXRDb21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdHZXRGaWxlU3RhdHVzJyk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxufSk7XHJcblxyXG4vLyBEZWZhdWx0IHRhYmxlIG5hbWVzIGZvciBkZXZlbG9wbWVudFxyXG5jb25zdCBERUZBVUxUX0ZJTEVfTUVUQURBVEFfVEFCTEUgPSAnRmlsZU1ldGFkYXRhJztcclxuY29uc3QgREVGQVVMVF9BTkFMWVNJU19SRVNVTFRTX1RBQkxFID0gJ0FuYWx5c2lzUmVzdWx0cyc7XHJcblxyXG5pbnRlcmZhY2UgRmlsZVN0YXR1c1Jlc3BvbnNlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIHVwbG9hZGVkQXQ6IG51bWJlcjtcclxuICBhbmFseXNpc0lkPzogc3RyaW5nO1xyXG4gIGFuYWx5c2lzU3RhdHVzOiAncGVuZGluZycgfCAnaW5fcHJvZ3Jlc3MnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJztcclxuICBhbmFseXNpc1Byb2dyZXNzOiBudW1iZXI7XHJcbiAgYW5hbHlzaXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgZXJyb3JNZXNzYWdlPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnR2V0IGZpbGUgc3RhdHVzIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZCxcclxuICAgICAgcGF0aFBhcmFtZXRlcnM6IGV2ZW50LnBhdGhQYXJhbWV0ZXJzXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFeHRyYWN0IGZpbGVJZCBmcm9tIHBhdGhcclxuICAgIGNvbnN0IGZpbGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5maWxlSWQ7XHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0ZJTEVfSUQnLCAnRmlsZSBJRCBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlcklkIGZyb20gYXV0aG9yaXplciBjb250ZXh0XHJcbiAgICBjb25zdCB1c2VySWQgPSBldmVudC5yZXF1ZXN0Q29udGV4dD8uYXV0aG9yaXplcj8uY2xhaW1zPy5zdWIgfHwgZXZlbnQucmVxdWVzdENvbnRleHQ/LmF1dGhvcml6ZXI/LnByaW5jaXBhbElkO1xyXG4gICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ01pc3NpbmcgdXNlcklkIGluIGF1dGhvcml6ZXIgY29udGV4dCcsIHsgY29ycmVsYXRpb25JZCwgZmlsZUlkIH0pO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdVTkFVVEhPUklaRUQnLCAnVXNlciBhdXRoZW50aWNhdGlvbiByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBmaWxlIHN0YXR1cycsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBmaWxlIG1ldGFkYXRhIC0gbmVlZCBib3RoIGZpbGVJZCAocGFydGl0aW9uIGtleSkgYW5kIHVzZXJJZCAoc29ydCBrZXkpXHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgREVGQVVMVF9GSUxFX01FVEFEQVRBX1RBQkxFO1xyXG4gICAgY29uc3QgZmlsZU1ldGFkYXRhID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBLZXk6IHsgZmlsZUlkLCB1c2VySWQgfVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGlmICghZmlsZU1ldGFkYXRhLkl0ZW0pIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0ZpbGUgbm90IGZvdW5kJywgeyBjb3JyZWxhdGlvbklkLCBmaWxlSWQsIHVzZXJJZCB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA0LCAnRklMRV9OT1RfRk9VTkQnLCAnRmlsZSBub3QgZm91bmQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlID0gZmlsZU1ldGFkYXRhLkl0ZW07XHJcbiAgICBsb2dnZXIuaW5mbygnRmlsZSBtZXRhZGF0YSByZXRyaWV2ZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBmaWxlTmFtZTogZmlsZS5maWxlTmFtZSxcclxuICAgICAgaGFzQW5hbHlzaXNJZDogISFmaWxlLmFuYWx5c2lzSWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBhbmFseXNpcyBzdGF0dXMgaWYgYW5hbHlzaXNJZCBleGlzdHNcclxuICAgIGxldCBhbmFseXNpc1N0YXR1cyA9ICdwZW5kaW5nJztcclxuICAgIGxldCBhbmFseXNpc1Byb2dyZXNzID0gMDtcclxuICAgIGxldCBhbmFseXNpc01lc3NhZ2UgPSAnV2FpdGluZyBmb3IgYW5hbHlzaXMgdG8gc3RhcnQuLi4nO1xyXG4gICAgbGV0IGVycm9yTWVzc2FnZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cclxuICAgIGlmIChmaWxlLmFuYWx5c2lzSWQpIHtcclxuICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFIHx8IERFRkFVTFRfQU5BTFlTSVNfUkVTVUxUU19UQUJMRTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ0NoZWNraW5nIGFuYWx5c2lzIHJlc3VsdHMnLCB7XHJcbiAgICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgYW5hbHlzaXNJZDogZmlsZS5hbmFseXNpc0lkLFxyXG4gICAgICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHQgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBhbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgICBLZXk6IHsgYW5hbHlzaXNJZDogZmlsZS5hbmFseXNpc0lkIH1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgaWYgKGFuYWx5c2lzUmVzdWx0Lkl0ZW0pIHtcclxuICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFuYWx5c2lzUmVzdWx0Lkl0ZW07XHJcbiAgICAgICAgYW5hbHlzaXNTdGF0dXMgPSBhbmFseXNpcy5zdGF0dXMgfHwgJ3BlbmRpbmcnO1xyXG4gICAgICAgIGFuYWx5c2lzUHJvZ3Jlc3MgPSBhbmFseXNpcy5wcm9ncmVzcyB8fCAwO1xyXG4gICAgICAgIGFuYWx5c2lzTWVzc2FnZSA9IGFuYWx5c2lzLm1lc3NhZ2UgfHwgZ2V0RGVmYXVsdE1lc3NhZ2UoYW5hbHlzaXNTdGF0dXMpO1xyXG4gICAgICAgIGVycm9yTWVzc2FnZSA9IGFuYWx5c2lzLmVycm9yO1xyXG5cclxuICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgc3RhdHVzIHJldHJpZXZlZCcsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICBhbmFseXNpc0lkOiBmaWxlLmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICBzdGF0dXM6IGFuYWx5c2lzU3RhdHVzLFxyXG4gICAgICAgICAgcHJvZ3Jlc3M6IGFuYWx5c2lzUHJvZ3Jlc3NcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlOiBGaWxlU3RhdHVzUmVzcG9uc2UgPSB7XHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZmlsZU5hbWU6IGZpbGUuZmlsZU5hbWUsXHJcbiAgICAgIHVwbG9hZGVkQXQ6IGZpbGUudXBsb2FkZWRBdCB8fCBEYXRlLm5vdygpLFxyXG4gICAgICBhbmFseXNpc0lkOiBmaWxlLmFuYWx5c2lzSWQsXHJcbiAgICAgIGFuYWx5c2lzU3RhdHVzOiBhbmFseXNpc1N0YXR1cyBhcyBhbnksXHJcbiAgICAgIGFuYWx5c2lzUHJvZ3Jlc3MsXHJcbiAgICAgIGFuYWx5c2lzTWVzc2FnZSxcclxuICAgICAgZXJyb3JNZXNzYWdlXHJcbiAgICB9O1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGaWxlIHN0YXR1cyByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGFuYWx5c2lzU3RhdHVzXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignR2V0IGZpbGUgc3RhdHVzIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHByb3BlciBDT1JTIGhlYWRlcnMgZXZlbiBvbiBlcnJvclxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnR0VUX1NUQVRVU19GQUlMRUQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGdldCBmaWxlIHN0YXR1cycsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldCBkZWZhdWx0IG1lc3NhZ2UgYmFzZWQgb24gYW5hbHlzaXMgc3RhdHVzXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXREZWZhdWx0TWVzc2FnZShzdGF0dXM6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgbWVzc2FnZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAncGVuZGluZyc6ICdXYWl0aW5nIGZvciBhbmFseXNpcyB0byBzdGFydC4uLicsXHJcbiAgICAnaW5fcHJvZ3Jlc3MnOiAnQW5hbHlzaXMgaW4gcHJvZ3Jlc3MuLi4nLFxyXG4gICAgJ2NvbXBsZXRlZCc6ICdBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICdmYWlsZWQnOiAnQW5hbHlzaXMgZmFpbGVkJ1xyXG4gIH07XHJcbiAgcmV0dXJuIG1lc3NhZ2VzW3N0YXR1c10gfHwgJ1Vua25vd24gc3RhdHVzJztcclxufVxyXG5cclxuLyoqXHJcbiAqIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH07XHJcbn1cclxuIl19