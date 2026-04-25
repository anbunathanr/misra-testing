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
        let rulesProcessed = file.rules_processed || file.rulesProcessed || 0;
        let totalRules = file.total_rules || file.totalRules || 357; // Default to actual MISRA rule count
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
            errorMessage,
            rulesProcessed,
            totalRules
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZpbGUtc3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWZpbGUtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7OztBQUdILDhEQUEwRDtBQUMxRCx3REFBaUU7QUFDakUsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUNsRCxxREFBMkQ7QUFFM0QsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQztJQUN0QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztDQUM5QyxDQUFDLENBQUM7QUFFSCxzQ0FBc0M7QUFDdEMsTUFBTSwyQkFBMkIsR0FBRyxjQUFjLENBQUM7QUFDbkQsTUFBTSw4QkFBOEIsR0FBRyxpQkFBaUIsQ0FBQztBQWVsRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRTtZQUM5QyxhQUFhO1lBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtZQUN4QixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWM7U0FDckMsQ0FBQyxDQUFDO1FBRUgsMkJBQTJCO1FBQzNCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9B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QUMsV0FBVyxFQUFFO29CQUNuQyxTQUFTLEVBQUUsYUFBYTtpQkFDekI7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE3SlcsUUFBQSxPQUFPLFdBNkpsQjtBQUVGOztHQUVHO0FBQ0gsU0FBUyxpQkFBaUIsQ0FBQyxNQUFjO0lBQ3ZDLE1BQU0sUUFBUSxHQUEyQjtRQUN2QyxTQUFTLEVBQUUsa0NBQWtDO1FBQzdDLGFBQWEsRUFBRSx5QkFBeUI7UUFDeEMsV0FBVyxFQUFFLGlDQUFpQztRQUM5QyxRQUFRLEVBQUUsaUJBQWlCO0tBQzVCLENBQUM7SUFDRixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQztBQUM5QyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWUsRUFDZixhQUFxQjtJQUVyQixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRSxrQkFBVztRQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLGFBQWE7YUFDekI7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogR2V0IEZpbGUgU3RhdHVzIExhbWJkYSBGdW5jdGlvblxyXG4gKiBcclxuICogUmV0dXJucyB0aGUgY3VycmVudCBzdGF0dXMgb2YgYSBmaWxlIGFuZCBpdHMgYXNzb2NpYXRlZCBhbmFseXNpc1xyXG4gKiBVc2VkIGJ5IHRoZSBmcm9udGVuZCB0byBwb2xsIGZvciBhbmFseXNpcyBjb21wbGV0aW9uXHJcbiAqIFxyXG4gKiBSZXF1ZXN0OlxyXG4gKiBHRVQgL2ZpbGVzL3tmaWxlSWR9L3N0YXR1c1xyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBcImZpbGVJZFwiOiBcImZpbGUtMTIzXCIsXHJcbiAqICAgXCJmaWxlTmFtZVwiOiBcInNhbXBsZS5jXCIsXHJcbiAqICAgXCJ1cGxvYWRlZEF0XCI6IDEyMzQ1Njc4OTAsXHJcbiAqICAgXCJhbmFseXNpc0lkXCI6IFwiYW5hbHlzaXMtNDU2XCIsXHJcbiAqICAgXCJhbmFseXNpc1N0YXR1c1wiOiBcImNvbXBsZXRlZHxwZW5kaW5nfGZhaWxlZFwiLFxyXG4gKiAgIFwiYW5hbHlzaXNQcm9ncmVzc1wiOiA3NSxcclxuICogICBcImFuYWx5c2lzTWVzc2FnZVwiOiBcIkFuYWx5emluZy4uLlwiLFxyXG4gKiAgIFwiZXJyb3JNZXNzYWdlXCI6IG51bGxcclxuICogfVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBHZXRDb21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBjb3JzSGVhZGVycyB9IGZyb20gJy4uLy4uL3V0aWxzL2NvcnMnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdHZXRGaWxlU3RhdHVzJyk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyBcclxufSk7XHJcblxyXG4vLyBEZWZhdWx0IHRhYmxlIG5hbWVzIGZvciBkZXZlbG9wbWVudFxyXG5jb25zdCBERUZBVUxUX0ZJTEVfTUVUQURBVEFfVEFCTEUgPSAnRmlsZU1ldGFkYXRhJztcclxuY29uc3QgREVGQVVMVF9BTkFMWVNJU19SRVNVTFRTX1RBQkxFID0gJ0FuYWx5c2lzUmVzdWx0cyc7XHJcblxyXG5pbnRlcmZhY2UgRmlsZVN0YXR1c1Jlc3BvbnNlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIHVwbG9hZGVkQXQ6IG51bWJlcjtcclxuICBhbmFseXNpc0lkPzogc3RyaW5nO1xyXG4gIGFuYWx5c2lzU3RhdHVzOiAncGVuZGluZycgfCAnaW5fcHJvZ3Jlc3MnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJztcclxuICBhbmFseXNpc1Byb2dyZXNzOiBudW1iZXI7XHJcbiAgYW5hbHlzaXNNZXNzYWdlOiBzdHJpbmc7XHJcbiAgZXJyb3JNZXNzYWdlPzogc3RyaW5nO1xyXG4gIHJ1bGVzUHJvY2Vzc2VkPzogbnVtYmVyO1xyXG4gIHRvdGFsUnVsZXM/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGV2ZW50LmhlYWRlcnNbJ1gtQ29ycmVsYXRpb24tSUQnXSB8fCBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyk7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIGxvZ2dlci5pbmZvKCdHZXQgZmlsZSBzdGF0dXMgcmVxdWVzdCByZWNlaXZlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgcGF0aDogZXZlbnQucGF0aCxcclxuICAgICAgbWV0aG9kOiBldmVudC5odHRwTWV0aG9kLFxyXG4gICAgICBwYXRoUGFyYW1ldGVyczogZXZlbnQucGF0aFBhcmFtZXRlcnNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgZmlsZUlkIGZyb20gcGF0aFxyXG4gICAgY29uc3QgZmlsZUlkID0gZXZlbnQucGF0aFBhcmFtZXRlcnM/LmZpbGVJZDtcclxuICAgIGlmICghZmlsZUlkKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRklMRV9JRCcsICdGaWxlIElEIGlzIHJlcXVpcmVkJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCB1c2VySWQgZnJvbSBhdXRob3JpemVyIGNvbnRleHQgdXNpbmcgdGhlIHNhbWUgdXRpbGl0eSBhcyB1cGxvYWRcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIGxvZ2dlci5lcnJvcignTWlzc2luZyB1c2VySWQgaW4gdXNlciBjb250ZXh0JywgeyBcclxuICAgICAgICBjb3JyZWxhdGlvbklkLCBcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgYXV0aG9yaXplckNvbnRleHQ6IEpTT04uc3RyaW5naWZ5KGV2ZW50LnJlcXVlc3RDb250ZXh0Py5hdXRob3JpemVyIHx8IHt9KVxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnVU5BVVRIT1JJWkVEJywgJ1VzZXIgYXV0aGVudGljYXRpb24gcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgdXNlcklkID0gdXNlci51c2VySWQ7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0ZldGNoaW5nIGZpbGUgc3RhdHVzJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR2V0IGZpbGUgbWV0YWRhdGEgLSBuZWVkIGJvdGggZmlsZUlkIChwYXJ0aXRpb24ga2V5KSBhbmQgdXNlcklkIChzb3J0IGtleSlcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YVRhYmxlID0gcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRSB8fCBERUZBVUxUX0ZJTEVfTUVUQURBVEFfVEFCTEU7XHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGEgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogeyBmaWxlSWQsIHVzZXJJZCB9XHJcbiAgICB9KSk7XHJcblxyXG4gICAgaWYgKCFmaWxlTWV0YWRhdGEuSXRlbSkge1xyXG4gICAgICBsb2dnZXIud2FybignRmlsZSBub3QgZm91bmQnLCB7IGNvcnJlbGF0aW9uSWQsIGZpbGVJZCwgdXNlcklkIH0pO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDQsICdGSUxFX05PVF9GT1VORCcsICdGaWxlIG5vdCBmb3VuZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGZpbGUgPSBmaWxlTWV0YWRhdGEuSXRlbTtcclxuICAgIGxvZ2dlci5pbmZvKCdGaWxlIG1ldGFkYXRhIHJldHJpZXZlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIGZpbGVOYW1lOiBmaWxlLmZpbGVuYW1lIHx8IGZpbGUuZmlsZU5hbWUsXHJcbiAgICAgIGFuYWx5c2lzU3RhdHVzOiBmaWxlLmFuYWx5c2lzX3N0YXR1cyB8fCBmaWxlLmFuYWx5c2lzU3RhdHVzXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZXQgYW5hbHlzaXMgc3RhdHVzIGZyb20gZmlsZSBtZXRhZGF0YVxyXG4gICAgbGV0IGFuYWx5c2lzU3RhdHVzID0gZmlsZS5hbmFseXNpc19zdGF0dXMgfHwgZmlsZS5hbmFseXNpc1N0YXR1cyB8fCAncGVuZGluZyc7XHJcbiAgICBsZXQgYW5hbHlzaXNQcm9ncmVzcyA9IGZpbGUuYW5hbHlzaXNfcHJvZ3Jlc3MgfHwgZmlsZS5hbmFseXNpc1Byb2dyZXNzIHx8IDA7XHJcbiAgICBsZXQgYW5hbHlzaXNNZXNzYWdlID0gZmlsZS5hbmFseXNpc19tZXNzYWdlIHx8IGZpbGUuYW5hbHlzaXNNZXNzYWdlIHx8IGdldERlZmF1bHRNZXNzYWdlKGFuYWx5c2lzU3RhdHVzKTtcclxuICAgIGxldCBlcnJvck1lc3NhZ2UgPSBmaWxlLmVycm9yX21lc3NhZ2UgfHwgZmlsZS5lcnJvck1lc3NhZ2U7XHJcbiAgICBsZXQgYW5hbHlzaXNJZCA9IGZpbGUuYW5hbHlzaXNJZDtcclxuICAgIGxldCBydWxlc1Byb2Nlc3NlZCA9IGZpbGUucnVsZXNfcHJvY2Vzc2VkIHx8IGZpbGUucnVsZXNQcm9jZXNzZWQgfHwgMDtcclxuICAgIGxldCB0b3RhbFJ1bGVzID0gZmlsZS50b3RhbF9ydWxlcyB8fCBmaWxlLnRvdGFsUnVsZXMgfHwgMzU3OyAvLyBEZWZhdWx0IHRvIGFjdHVhbCBNSVNSQSBydWxlIGNvdW50XHJcblxyXG4gICAgLy8gSWYgYW5hbHlzaXMgaXMgY29tcGxldGVkLCB0cnkgdG8gZ2V0IGZ1bGwgcmVzdWx0cyBmcm9tIEFuYWx5c2lzUmVzdWx0cyB0YWJsZVxyXG4gICAgaWYgKGFuYWx5c2lzU3RhdHVzID09PSAnY29tcGxldGVkJyAmJiAhYW5hbHlzaXNJZCkge1xyXG4gICAgICAvLyBRdWVyeSBBbmFseXNpc1Jlc3VsdHMgdGFibGUgYnkgZmlsZUlkIHRvIGZpbmQgdGhlIGFuYWx5c2lzXHJcbiAgICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0c1RhYmxlID0gcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRSB8fCBERUZBVUxUX0FOQUxZU0lTX1JFU1VMVFNfVEFCTEU7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdRdWVyeWluZyBhbmFseXNpcyByZXN1bHRzIGJ5IGZpbGVJZCcsIHtcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZVxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICAgICAgSW5kZXhOYW1lOiAnRmlsZUluZGV4JyxcclxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdmaWxlSWQgPSA6ZmlsZUlkJyxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICAgJzpmaWxlSWQnOiBmaWxlSWRcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBTY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSxcclxuICAgICAgICAgIExpbWl0OiAxXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBpZiAoYW5hbHlzaXNSZXN1bHRzLkl0ZW1zICYmIGFuYWx5c2lzUmVzdWx0cy5JdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFuYWx5c2lzUmVzdWx0cy5JdGVtc1swXTtcclxuICAgICAgICAgIGFuYWx5c2lzSWQgPSBhbmFseXNpcy5hbmFseXNpc0lkO1xyXG4gICAgICAgICAgYW5hbHlzaXNQcm9ncmVzcyA9IDEwMDtcclxuICAgICAgICAgIGFuYWx5c2lzTWVzc2FnZSA9ICdBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JztcclxuXHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcmVzdWx0IGZvdW5kJywge1xyXG4gICAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgIHN0YXR1czogYW5hbHlzaXNTdGF0dXNcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAocXVlcnlFcnJvcikge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gcXVlcnkgYW5hbHlzaXMgcmVzdWx0cycsIHtcclxuICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICBlcnJvcjogcXVlcnlFcnJvciBpbnN0YW5jZW9mIEVycm9yID8gcXVlcnlFcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogRmlsZVN0YXR1c1Jlc3BvbnNlID0ge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiBmaWxlLmZpbGVuYW1lIHx8IGZpbGUuZmlsZU5hbWUsXHJcbiAgICAgIHVwbG9hZGVkQXQ6IGZpbGUudXBsb2FkZWRBdCB8fCBmaWxlLnVwbG9hZFRpbWVzdGFtcCB8fCBEYXRlLm5vdygpLFxyXG4gICAgICBhbmFseXNpc0lkOiBhbmFseXNpc0lkLFxyXG4gICAgICBhbmFseXNpc1N0YXR1czogYW5hbHlzaXNTdGF0dXMgYXMgYW55LFxyXG4gICAgICBhbmFseXNpc1Byb2dyZXNzLFxyXG4gICAgICBhbmFseXNpc01lc3NhZ2UsXHJcbiAgICAgIGVycm9yTWVzc2FnZSxcclxuICAgICAgcnVsZXNQcm9jZXNzZWQsXHJcbiAgICAgIHRvdGFsUnVsZXNcclxuICAgIH07XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0ZpbGUgc3RhdHVzIHJldHJpZXZlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgYW5hbHlzaXNTdGF0dXNcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdHZXQgZmlsZSBzdGF0dXMgZmFpbGVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZXR1cm4gcHJvcGVyIENPUlMgaGVhZGVycyBldmVuIG9uIGVycm9yXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdHRVRfU1RBVFVTX0ZBSUxFRCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIHx8ICdGYWlsZWQgdG8gZ2V0IGZpbGUgc3RhdHVzJyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgcmVxdWVzdElkOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcblxyXG4vKipcclxuICogR2V0IGRlZmF1bHQgbWVzc2FnZSBiYXNlZCBvbiBhbmFseXNpcyBzdGF0dXNcclxuICovXHJcbmZ1bmN0aW9uIGdldERlZmF1bHRNZXNzYWdlKHN0YXR1czogc3RyaW5nKTogc3RyaW5nIHtcclxuICBjb25zdCBtZXNzYWdlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcclxuICAgICdwZW5kaW5nJzogJ1dhaXRpbmcgZm9yIGFuYWx5c2lzIHRvIHN0YXJ0Li4uJyxcclxuICAgICdpbl9wcm9ncmVzcyc6ICdBbmFseXNpcyBpbiBwcm9ncmVzcy4uLicsXHJcbiAgICAnY29tcGxldGVkJzogJ0FuYWx5c2lzIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgJ2ZhaWxlZCc6ICdBbmFseXNpcyBmYWlsZWQnXHJcbiAgfTtcclxuICByZXR1cm4gbWVzc2FnZXNbc3RhdHVzXSB8fCAnVW5rbm93biBzdGF0dXMnO1xyXG59XHJcblxyXG4vKipcclxuICogU3RhbmRhcmQgZXJyb3IgcmVzcG9uc2VcclxuICovXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBjb3JyZWxhdGlvbklkXHJcbiAgICAgIH1cclxuICAgIH0pXHJcbiAgfTtcclxufVxyXG4iXX0=