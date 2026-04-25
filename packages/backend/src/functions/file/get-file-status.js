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
const auth_util_1 = require("../../utils/auth-util");
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
        // Extract userId from authorizer context using the same utility as upload
        const user = await (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            logger.error('Missing userId in user context', {
                correlationId,
                fileId,
                authorizerContext: JSON.stringify(event.requestContext?.authorizer || {})
            });
            return errorResponse(401, 'UNAUTHORIZED', 'User authentication required', correlationId);
        }
        const userId = user.userId;
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
            fileName: file.filename || file.fileName,
            analysisStatus: file.analysis_status || file.analysisStatus
        });
        // Get analysis status from file metadata
        let analysisStatus = file.analysis_status || file.analysisStatus || 'pending';
        let analysisProgress = file.analysis_progress || file.analysisProgress || 0;
        let analysisMessage = file.analysis_message || file.analysisMessage || getDefaultMessage(analysisStatus);
        let errorMessage = file.error_message || file.errorMessage;
        let analysisId = file.analysisId;
        // If analysis is completed, try to get full results from AnalysisResults table
        if (analysisStatus === 'completed' && !analysisId) {
            // Query AnalysisResults table by fileId to find the analysis
            const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || DEFAULT_ANALYSIS_RESULTS_TABLE;
            logger.info('Querying analysis results by fileId', {
                correlationId,
                fileId,
                analysisResultsTable
            });
            try {
                const analysisResults = await dynamoClient.send(new lib_dynamodb_1.QueryCommand({
                    TableName: analysisResultsTable,
                    IndexName: 'FileIndex',
                    KeyConditionExpression: 'fileId = :fileId',
                    ExpressionAttributeValues: {
                        ':fileId': fileId
                    },
                    ScanIndexForward: false,
                    Limit: 1
                }));
                if (analysisResults.Items && analysisResults.Items.length > 0) {
                    const analysis = analysisResults.Items[0];
                    analysisId = analysis.analysisId;
                    analysisProgress = 100;
                    analysisMessage = 'Analysis completed successfully';
                    logger.info('Analysis result found', {
                        correlationId,
                        fileId,
                        analysisId,
                        status: analysisStatus
                    });
                }
            }
            catch (queryError) {
                logger.warn('Failed to query analysis results', {
                    correlationId,
                    fileId,
                    error: queryError instanceof Error ? queryError.message : 'Unknown error'
                });
            }
        }
        const response = {
            fileId,
            fileName: file.filename || file.fileName,
            uploadedAt: file.uploadedAt || file.uploadTimestamp || Date.now(),
            analysisId: analysisId,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZpbGUtc3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWZpbGUtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7OztBQUdILDhEQUEwRDtBQUMxRCx3REFBaUU7QUFDakUsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUNsRCxxREFBMkQ7QUFFM0QsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQztJQUN0QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztDQUM5QyxDQUFDLENBQUM7QUFFSCxzQ0FBc0M7QUFDdEMsTUFBTSwyQkFBMkIsR0FBRyxjQUFjLENBQUM7QUFDbkQsTUFBTSw4QkFBOEIsR0FBRyxpQkFBaUIsQ0FBQztBQWFsRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRTtZQUM5QyxhQUFhO1lBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtZQUN4QixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWM7U0FDckMsQ0FBQyxDQUFDO1FBRUgsMkJBQTJCO1FBQzNCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9B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QyxTQUFTLEVBQUUsa0NBQWtDO1FBQzdDLGFBQWEsRUFBRSx5QkFBeUI7UUFDeEMsV0FBVyxFQUFFLGlDQUFpQztRQUM5QyxRQUFRLEVBQUUsaUJBQWlCO0tBQzVCLENBQUM7SUFDRixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQztBQUM5QyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWUsRUFDZixhQUFxQjtJQUVyQixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLGFBQWE7YUFDekI7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogR2V0IEZpbGUgU3RhdHVzIExhbWJkYSBGdW5jdGlvblxyXG4gKiBcclxuICogUmV0dXJucyB0aGUgY3VycmVudCBzdGF0dXMgb2YgYSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZCBhbmFseXNpc1xyXG4gKiBVc2VkIGJ5IHRoZSBmcm9udGVuZCB0byBwb2xsIGZvciBhbmFseXNpcyBjb21wbGV0aW9uXHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiBHRVQgL2ZpbGVzL3tmaWxlSWR9L3N0YXR1c1xyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcImZpbGVJZFwiOiBcImZpbGUtMTIzXCIsXHJcbiAqICAgXCJmaWxlTmFtZVwiOiBcInNhbXBsZS5jXCIsXHJcbiAqICAgXCJ1cGxvYWRlZEF0XCI6IDEyMzQ1Njc4OTAsXHJcbiAqICAgXCJhbmFseXNpc0lkXCI6IFwiYW5hbHlzaXMtNDU2XCIsXHJcbiAqICAgXCJhbmFseXNpc1N0YXR1c1wiOiBcImNvbXBsZXRlZHxwZW5kaW5nfGZhaWxlZFwiLFxyXG4gKiAgIFwiYW5hbHlzaXNQcm9ncmVzc1wiOiA3NSxcclxuICogICBcImFuYWx5c2lzTWVzc2FnZVwiOiBcIkFuYWx5emluZy4uLlwiLFxyXG4gKiAgIFwiZXJyb3JNZXNzYWdlXCI6IG51bGxcclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBHZXRDb21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdHZXRGaWxlU3RhdHVzJyk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxufSk7XHJcblxyXG4vLyBEZWZhdWx0IHRhYmxlIG5hbWVzIGZvciBkZXZlbG9wbWVudFxyXG5jb25zdCBERUZBVUxUX0ZJTEVfTUVUQURBVEFfVEFCTEUgPSAnRmlsZU1ldGFkYXRhJztcclxuY29uc3QgREVGQVVMVF9BTkFMWVNJU19SRVNVTFRTX1RBQkxFID0gJ0FuYWx5c2lzUmVzdWx0cyc7XHJcblxyXG5pbnRlcmZhY2UgRmlsZVN0YXR1c1Jlc3BvbnNlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIHVwbG9hZGVkQXQ6IG51bWJlcjtcclxuICBhbmFseXNpc0lkPzogc3RyaW5nO1xyXG4gIGFuYWx5c2lzU3RhdHVzOiAncGVuZGluZycgfCAnaW5fcHJvZ3Jlc3MnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJztcclxuICBhbmFseXNpc1Byb2dyZXNzOiBudW1iZXI7XHJcbiAgYW5hbHlzaXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgZXJyb3JNZXNzYWdlPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBldmVudC5oZWFkZXJzWydYLUNvcnJlbGF0aW9uLUlEJ10gfHwgTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICBsb2dnZXIuaW5mbygnR2V0IGZpbGUgc3RhdHVzIHJlcXVlc3QgcmVjZWl2ZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgIG1ldGhvZDogZXZlbnQuaHR0cE1ldGhvZCxcclxuICAgICAgcGF0aFBhcmFtZXRlcnM6IGV2ZW50LnBhdGhQYXJhbWV0ZXJzXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFeHRyYWN0IGZpbGVJZCBmcm9tIHBhdGhcclxuICAgIGNvbnN0IGZpbGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5maWxlSWQ7XHJcbiAgICBpZiAoIWZpbGVJZCkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0ZJTEVfSUQnLCAnRmlsZSBJRCBpcyByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlcklkIGZyb20gYXV0aG9yaXplciBjb250ZXh0IHVzaW5nIHRoZSBzYW1lIHV0aWxpdHkgYXMgdXBsb2FkXHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIFxyXG4gICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICBsb2dnZXIuZXJyb3IoJ01pc3NpbmcgdXNlcklkIGluIHVzZXIgY29udGV4dCcsIHsgXHJcbiAgICAgICAgY29ycmVsYXRpb25JZCwgXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGF1dGhvcml6ZXJDb250ZXh0OiBKU09OLnN0cmluZ2lmeShldmVudC5yZXF1ZXN0Q29udGV4dD8uYXV0aG9yaXplciB8fCB7fSlcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMSwgJ1VOQVVUSE9SSVpFRCcsICdVc2VyIGF1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIudXNlcklkO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGZXRjaGluZyBmaWxlIHN0YXR1cycsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICB1c2VySWRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBmaWxlIG1ldGFkYXRhIC0gbmVlZCBib3RoIGZpbGVJZCAocGFydGl0aW9uIGtleSkgYW5kIHVzZXJJZCAoc29ydCBrZXkpXHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgREVGQVVMVF9GSUxFX01FVEFEQVRBX1RBQkxFO1xyXG4gICAgY29uc3QgZmlsZU1ldGFkYXRhID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBLZXk6IHsgZmlsZUlkLCB1c2VySWQgfVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGlmICghZmlsZU1ldGFkYXRhLkl0ZW0pIHtcclxuICAgICAgbG9nZ2VyLndhcm4oJ0ZpbGUgbm90IGZvdW5kJywgeyBjb3JyZWxhdGlvbklkLCBmaWxlSWQsIHVzZXJJZCB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA0LCAnRklMRV9OT1RfRk9VTkQnLCAnRmlsZSBub3QgZm91bmQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWxlID0gZmlsZU1ldGFkYXRhLkl0ZW07XHJcbiAgICBsb2dnZXIuaW5mbygnRmlsZSBtZXRhZGF0YSByZXRyaWV2ZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBmaWxlTmFtZTogZmlsZS5maWxlbmFtZSB8fCBmaWxlLmZpbGVOYW1lLFxyXG4gICAgICBhbmFseXNpc1N0YXR1czogZmlsZS5hbmFseXNpc19zdGF0dXMgfHwgZmlsZS5hbmFseXNpc1N0YXR1c1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IGFuYWx5c2lzIHN0YXR1cyBmcm9tIGZpbGUgbWV0YWRhdGFcclxuICAgIGxldCBhbmFseXNpc1N0YXR1cyA9IGZpbGUuYW5hbHlzaXNfc3RhdHVzIHx8IGZpbGUuYW5hbHlzaXNTdGF0dXMgfHwgJ3BlbmRpbmcnO1xyXG4gICAgbGV0IGFuYWx5c2lzUHJvZ3Jlc3MgPSBmaWxlLmFuYWx5c2lzX3Byb2dyZXNzIHx8IGZpbGUuYW5hbHlzaXNQcm9ncmVzcyB8fCAwO1xyXG4gICAgbGV0IGFuYWx5c2lzTWVzc2FnZSA9IGZpbGUuYW5hbHlzaXNfbWVzc2FnZSB8fCBmaWxlLmFuYWx5c2lzTWVzc2FnZSB8fCBnZXREZWZhdWx0TWVzc2FnZShhbmFseXNpc1N0YXR1cyk7XHJcbiAgICBsZXQgZXJyb3JNZXNzYWdlID0gZmlsZS5lcnJvcl9tZXNzYWdlIHx8IGZpbGUuZXJyb3JNZXNzYWdlO1xyXG4gICAgbGV0IGFuYWx5c2lzSWQgPSBmaWxlLmFuYWx5c2lzSWQ7XHJcblxyXG4gICAgLy8gSWYgYW5hbHlzaXMgaXMgY29tcGxldGVkLCB0cnkgdG8gZ2V0IGZ1bGwgcmVzdWx0cyBmcm9tIEFuYWx5c2lzUmVzdWx0cyB0YWJsZVxyXG4gICAgaWYgKGFuYWx5c2lzU3RhdHVzID09PSAnY29tcGxldGVkJyAmJiAhYW5hbHlzaXNJZCkge1xyXG4gICAgICAvLyBRdWVyeSBBbmFseXNpc1Jlc3VsdHMgdGFibGUgYnkgZmlsZUlkIHRvIGZpbmQgdGhlIGFuYWx5c2lzXHJcbiAgICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0c1RhYmxlID0gcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRSB8fCBERUZBVUxUX0FOQUxZU0lTX1JFU1VMVFNfVEFCTEU7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdRdWVyeWluZyBhbmFseXNpcyByZXN1bHRzIGJ5IGZpbGVJZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZVxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICAgICAgSW5kZXhOYW1lOiAnRmlsZUluZGV4JyxcclxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdmaWxlSWQgPSA6ZmlsZUlkJyxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICAgJzpmaWxlSWQnOiBmaWxlSWRcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSxcclxuICAgICAgICAgIExpbWl0OiAxXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBpZiAoYW5hbHlzaXNSZXN1bHRzLkl0ZW1zICYmIGFuYWx5c2lzUmVzdWx0cy5JdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFuYWx5c2lzUmVzdWx0cy5JdGVtc1swXTtcclxuICAgICAgICAgIGFuYWx5c2lzSWQgPSBhbmFseXNpcy5hbmFseXNpc0lkO1xyXG4gICAgICAgICAgYW5hbHlzaXNQcm9ncmVzcyA9IDEwMDtcclxuICAgICAgICAgIGFuYWx5c2lzTWVzc2FnZSA9ICdBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JztcclxuXHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcmVzdWx0IGZvdW5kJywge1xyXG4gICAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgIHN0YXR1czogYW5hbHlzaXNTdGF0dXNcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAocXVlcnlFcnJvcikge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gcXVlcnkgYW5hbHlzaXMgcmVzdWx0cycsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICBlcnJvcjogcXVlcnlFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gcXVlcnlFcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogRmlsZVN0YXR1c1Jlc3BvbnNlID0ge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiBmaWxlLmZpbGVuYW1lIHx8IGZpbGUuZmlsZU5hbWUsXHJcbiAgICAgIHVwbG9hZGVkQXQ6IGZpbGUudXBsb2FkZWRBdCB8fCBmaWxlLnVwbG9hZFRpbWVzdGFtcCB8fCBEYXRlLm5vdygpLFxyXG4gICAgICBhbmFseXNpc0lkOiBhbmFseXNpc0lkLFxyXG4gICAgICBhbmFseXNpc1N0YXR1czogYW5hbHlzaXNTdGF0dXMgYXMgYW55LFxyXG4gICAgICBhbmFseXNpc1Byb2dyZXNzLFxyXG4gICAgICBhbmFseXNpc01lc3NhZ2UsXHJcbiAgICAgIGVycm9yTWVzc2FnZVxyXG4gICAgfTtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnRmlsZSBzdGF0dXMgcmV0cmlldmVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBhbmFseXNpc1N0YXR1c1xyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcjogYW55KSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0dldCBmaWxlIHN0YXR1cyBmYWlsZWQnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBzdGFjazogZXJyb3Iuc3RhY2tcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJldHVybiBwcm9wZXIgQ09SUyBoZWFkZXJzIGV2ZW4gb24gZXJyb3JcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgY29kZTogJ0dFVF9TVEFUVVNfRkFJTEVEJyxcclxuICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgfHwgJ0ZhaWxlZCB0byBnZXQgZmlsZSBzdGF0dXMnLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBHZXQgZGVmYXVsdCBtZXNzYWdlIGJhc2VkIG9uIGFuYWx5c2lzIHN0YXR1c1xyXG4gKi9cclxuZnVuY3Rpb24gZ2V0RGVmYXVsdE1lc3NhZ2Uoc3RhdHVzOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IG1lc3NhZ2VzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgJ3BlbmRpbmcnOiAnV2FpdGluZyBmb3IgYW5hbHlzaXMgdG8gc3RhcnQuLi4nLFxyXG4gICAgJ2luX3Byb2dyZXNzJzogJ0FuYWx5c2lzIGluIHByb2dyZXNzLi4uJyxcclxuICAgICdjb21wbGV0ZWQnOiAnQW5hbHlzaXMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsXHJcbiAgICAnZmFpbGVkJzogJ0FuYWx5c2lzIGZhaWxlZCdcclxuICB9O1xyXG4gIHJldHVybiBtZXNzYWdlc1tzdGF0dXNdIHx8ICdVbmtub3duIHN0YXR1cyc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdGFuZGFyZCBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZyxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IGNvcnJlbGF0aW9uSWRcclxuICAgICAgfVxyXG4gICAgfSlcclxuICB9O1xyXG59XHJcbiJdfQ==