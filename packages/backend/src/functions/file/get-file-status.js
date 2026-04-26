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
                logger.info('Query result received', {
                    correlationId,
                    fileId,
                    itemsFound: analysisResults.Items?.length || 0
                });
                if (analysisResults.Items && analysisResults.Items.length > 0) {
                    const analysis = analysisResults.Items[0];
                    analysisId = analysis.analysisId;
                    analysisProgress = 100;
                    analysisMessage = 'Analysis completed successfully';
                    // CRITICAL FIX: Extract violation count from analysis object
                    if (analysis.violations && Array.isArray(analysis.violations)) {
                        rulesProcessed = analysis.violations.length;
                        logger.info('Extracted rule count from analysis', {
                            correlationId,
                            fileId,
                            analysisId,
                            rulesProcessed,
                            violationsLength: analysis.violations.length
                        });
                    }
                    else {
                        logger.warn('Violations array not found or not an array', {
                            correlationId,
                            fileId,
                            analysisId,
                            violationsType: typeof analysis.violations,
                            violationsExists: !!analysis.violations
                        });
                    }
                    // Extract total rules from analysis result
                    if (analysis.totalRules) {
                        totalRules = analysis.totalRules;
                        logger.info('Extracted total rules from analysis', {
                            correlationId,
                            fileId,
                            analysisId,
                            totalRules: analysis.totalRules
                        });
                    }
                    logger.info('Analysis result found', {
                        correlationId,
                        fileId,
                        analysisId,
                        status: analysisStatus,
                        rulesProcessed,
                        totalRules
                    });
                }
                else {
                    logger.warn('No analysis results found in AnalysisResults table', {
                        correlationId,
                        fileId,
                        analysisResultsTable
                    });
                }
            }
            catch (queryError) {
                logger.warn('Failed to query analysis results', {
                    correlationId,
                    fileId,
                    error: queryError instanceof Error ? queryError.message : 'Unknown error',
                    errorCode: queryError?.Code
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWZpbGUtc3RhdHVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWZpbGUtc3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7OztBQUdILDhEQUEwRDtBQUMxRCx3REFBaUU7QUFDakUsMkNBQStDO0FBQy9DLCtDQUFrRDtBQUNsRCxxREFBMkQ7QUFFM0QsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQztJQUN0QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztDQUM5QyxDQUFDLENBQUM7QUFFSCxzQ0FBc0M7QUFDdEMsTUFBTSwyQkFBMkIsR0FBRyxjQUFjLENBQUM7QUFDbkQsTUFBTSw4QkFBOEIsR0FBRyxpQkFBaUIsQ0FBQztBQWVsRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbkcsSUFBSSxDQUFDO1FBQ0gsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRTtZQUM5QyxhQUFhO1lBQ2IsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLE1BQU0sRUFBRSxLQUFLLENBQUMsVUFBVTtZQUN4QixjQUFjLEVBQUUsS0FBSyxDQUFDLGNBQWM7U0FDckMsQ0FBQyxDQUFDO1FBRUgsMkJBQTJCO1FBQzNCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9B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QUU7b0JBQ0wsSUFBSSxFQUFFLG1CQUFtQjtvQkFDekIsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPLElBQUksMkJBQTJCO29CQUNyRCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7b0JBQ25DLFNBQVMsRUFBRSxhQUFhO2lCQUN6QjthQUNGLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTNNVyxRQUFBLE9BQU8sV0EyTWxCO0FBRUY7O0dBRUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLE1BQWM7SUFDdkMsTUFBTSxRQUFRLEdBQTJCO1FBQ3ZDLFNBQVMsRUFBRSxrQ0FBa0M7UUFDN0MsYUFBYSxFQUFFLHlCQUF5QjtRQUN4QyxXQUFXLEVBQUUsaUNBQWlDO1FBQzlDLFFBQVEsRUFBRSxpQkFBaUI7S0FDNUIsQ0FBQztJQUNGLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFnQixDQUFDO0FBQzlDLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsYUFBYSxDQUNwQixVQUFrQixFQUNsQixJQUFZLEVBQ1osT0FBZSxFQUNmLGFBQXFCO0lBRXJCLE9BQU87UUFDTCxVQUFVO1FBQ1YsT0FBTyxFQUFFLGtCQUFXO1FBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsYUFBYTthQUN6QjtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBHZXQgRmlsZSBTdGF0dXMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIFxyXG4gKiBSZXR1cm5zIHRoZSBjdXJyZW50IHN0YXR1cyBvZiBhIGZpbGUgYW5kIGl0cyBhc3NvY2lhdGVkIGFuYWx5c2lzXHJcbiAqIFVzZWQgYnkgdGhlIGZyb250ZW5kIHRvIHBvbGwgZm9yIGFuYWx5c2lzIGNvbXBsZXRpb25cclxuICogXHJcbiAqIFJlcXVlc3Q6XHJcbiAqIEdFVCAvZmlsZXMve2ZpbGVJZH0vc3RhdHVzXHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIFwiZmlsZUlkXCI6IFwiZmlsZS0xMjNcIixcclxuICogICBcImZpbGVOYW1lXCI6IFwic2FtcGxlLmNcIixcclxuICogICBcInVwbG9hZGVkQXRcIjogMTIzNDU2Nzg5MCxcclxuICogICBcImFuYWx5c2lzSWRcIjogXCJhbmFseXNpcy00NTZcIixcclxuICogICBcImFuYWx5c2lzU3RhdHVzXCI6IFwiY29tcGxldGVkfHBlbmRpbmd8ZmFpbGVkXCIsXHJcbiAqICAgXCJhbmFseXNpc1Byb2dyZXNzXCI6IDc1LFxyXG4gKiAgIFwiYW5hbHlzaXNNZXNzYWdlXCI6IFwiQW5hbHl6aW5nLi4uXCIsXHJcbiAqICAgXCJlcnJvck1lc3NhZ2VcIjogbnVsbFxyXG4gKiB9XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IEdldENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IGNvcnNIZWFkZXJzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY29ycyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0dldEZpbGVTdGF0dXMnKTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIFxyXG59KTtcclxuXHJcbi8vIERlZmF1bHQgdGFibGUgbmFtZXMgZm9yIGRldmVsb3BtZW50XHJcbmNvbnN0IERFRkFVTFRfRklMRV9NRVRBREFUQV9UQUJMRSA9ICdGaWxlTWV0YWRhdGEnO1xyXG5jb25zdCBERUZBVUxUX0FOQUxZU0lTX1JFU1VMVFNfVEFCTEUgPSAnQW5hbHlzaXNSZXN1bHRzJztcclxuXHJcbmludGVyZmFjZSBGaWxlU3RhdHVzUmVzcG9uc2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgdXBsb2FkZWRBdDogbnVtYmVyO1xyXG4gIGFuYWx5c2lzSWQ/OiBzdHJpbmc7XHJcbiAgYW5hbHlzaXNTdGF0dXM6ICdwZW5kaW5nJyB8ICdpbl9wcm9ncmVzcycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnO1xyXG4gIGFuYWx5c2lzUHJvZ3Jlc3M6IG51bWJlcjtcclxuICBhbmFseXNpc01lc3NhZ2U6IHN0cmluZztcclxuICBlcnJvck1lc3NhZ2U/OiBzdHJpbmc7XHJcbiAgcnVsZXNQcm9jZXNzZWQ/OiBudW1iZXI7XHJcbiAgdG90YWxSdWxlcz86IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gZXZlbnQuaGVhZGVyc1snWC1Db3JyZWxhdGlvbi1JRCddIHx8IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KTtcclxuICBcclxuICB0cnkge1xyXG4gICAgbG9nZ2VyLmluZm8oJ0dldCBmaWxlIHN0YXR1cyByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICBtZXRob2Q6IGV2ZW50Lmh0dHBNZXRob2QsXHJcbiAgICAgIHBhdGhQYXJhbWV0ZXJzOiBldmVudC5wYXRoUGFyYW1ldGVyc1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXh0cmFjdCBmaWxlSWQgZnJvbSBwYXRoXHJcbiAgICBjb25zdCBmaWxlSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uZmlsZUlkO1xyXG4gICAgaWYgKCFmaWxlSWQpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19GSUxFX0lEJywgJ0ZpbGUgSUQgaXMgcmVxdWlyZWQnLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBFeHRyYWN0IHVzZXJJZCBmcm9tIGF1dGhvcml6ZXIgY29udGV4dCB1c2luZyB0aGUgc2FtZSB1dGlsaXR5IGFzIHVwbG9hZFxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBcclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgbG9nZ2VyLmVycm9yKCdNaXNzaW5nIHVzZXJJZCBpbiB1c2VyIGNvbnRleHQnLCB7IFxyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsIFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBhdXRob3JpemVyQ29udGV4dDogSlNPTi5zdHJpbmdpZnkoZXZlbnQucmVxdWVzdENvbnRleHQ/LmF1dGhvcml6ZXIgfHwge30pXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdVTkFVVEhPUklaRUQnLCAnVXNlciBhdXRoZW50aWNhdGlvbiByZXF1aXJlZCcsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCB1c2VySWQgPSB1c2VyLnVzZXJJZDtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnRmV0Y2hpbmcgZmlsZSBzdGF0dXMnLCB7XHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgdXNlcklkXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHZXQgZmlsZSBtZXRhZGF0YSAtIG5lZWQgYm90aCBmaWxlSWQgKHBhcnRpdGlvbiBrZXkpIGFuZCB1c2VySWQgKHNvcnQga2V5KVxyXG4gICAgY29uc3QgZmlsZU1ldGFkYXRhVGFibGUgPSBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFIHx8IERFRkFVTFRfRklMRV9NRVRBREFUQV9UQUJMRTtcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YSA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiB7IGZpbGVJZCwgdXNlcklkIH1cclxuICAgIH0pKTtcclxuXHJcbiAgICBpZiAoIWZpbGVNZXRhZGF0YS5JdGVtKSB7XHJcbiAgICAgIGxvZ2dlci53YXJuKCdGaWxlIG5vdCBmb3VuZCcsIHsgY29ycmVsYXRpb25JZCwgZmlsZUlkLCB1c2VySWQgfSk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ0ZJTEVfTk9UX0ZPVU5EJywgJ0ZpbGUgbm90IGZvdW5kJywgY29ycmVsYXRpb25JZCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgZmlsZSA9IGZpbGVNZXRhZGF0YS5JdGVtO1xyXG4gICAgbG9nZ2VyLmluZm8oJ0ZpbGUgbWV0YWRhdGEgcmV0cmlldmVkJywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgZmlsZU5hbWU6IGZpbGUuZmlsZW5hbWUgfHwgZmlsZS5maWxlTmFtZSxcclxuICAgICAgYW5hbHlzaXNTdGF0dXM6IGZpbGUuYW5hbHlzaXNfc3RhdHVzIHx8IGZpbGUuYW5hbHlzaXNTdGF0dXNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBhbmFseXNpcyBzdGF0dXMgZnJvbSBmaWxlIG1ldGFkYXRhXHJcbiAgICBsZXQgYW5hbHlzaXNTdGF0dXMgPSBmaWxlLmFuYWx5c2lzX3N0YXR1cyB8fCBmaWxlLmFuYWx5c2lzU3RhdHVzIHx8ICdwZW5kaW5nJztcclxuICAgIGxldCBhbmFseXNpc1Byb2dyZXNzID0gZmlsZS5hbmFseXNpc19wcm9ncmVzcyB8fCBmaWxlLmFuYWx5c2lzUHJvZ3Jlc3MgfHwgMDtcclxuICAgIGxldCBhbmFseXNpc01lc3NhZ2UgPSBmaWxlLmFuYWx5c2lzX21lc3NhZ2UgfHwgZmlsZS5hbmFseXNpc01lc3NhZ2UgfHwgZ2V0RGVmYXVsdE1lc3NhZ2UoYW5hbHlzaXNTdGF0dXMpO1xyXG4gICAgbGV0IGVycm9yTWVzc2FnZSA9IGZpbGUuZXJyb3JfbWVzc2FnZSB8fCBmaWxlLmVycm9yTWVzc2FnZTtcclxuICAgIGxldCBhbmFseXNpc0lkID0gZmlsZS5hbmFseXNpc0lkO1xyXG4gICAgbGV0IHJ1bGVzUHJvY2Vzc2VkID0gZmlsZS5ydWxlc19wcm9jZXNzZWQgfHwgZmlsZS5ydWxlc1Byb2Nlc3NlZCB8fCAwO1xyXG4gICAgbGV0IHRvdGFsUnVsZXMgPSBmaWxlLnRvdGFsX3J1bGVzIHx8IGZpbGUudG90YWxSdWxlcyB8fCAzNTc7IC8vIERlZmF1bHQgdG8gYWN0dWFsIE1JU1JBIHJ1bGUgY291bnRcclxuXHJcbiAgICAvLyBJZiBhbmFseXNpcyBpcyBjb21wbGV0ZWQsIHRyeSB0byBnZXQgZnVsbCByZXN1bHRzIGZyb20gQW5hbHlzaXNSZXN1bHRzIHRhYmxlXHJcbiAgICBpZiAoYW5hbHlzaXNTdGF0dXMgPT09ICdjb21wbGV0ZWQnICYmICFhbmFseXNpc0lkKSB7XHJcbiAgICAgIC8vIFF1ZXJ5IEFuYWx5c2lzUmVzdWx0cyB0YWJsZSBieSBmaWxlSWQgdG8gZmluZCB0aGUgYW5hbHlzaXNcclxuICAgICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFIHx8IERFRkFVTFRfQU5BTFlTSVNfUkVTVUxUU19UQUJMRTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1F1ZXJ5aW5nIGFuYWx5c2lzIHJlc3VsdHMgYnkgZmlsZUlkJywge1xyXG4gICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBjb25zdCBhbmFseXNpc1Jlc3VsdHMgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdGaWxlSW5kZXgnLFxyXG4gICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2ZpbGVJZCA9IDpmaWxlSWQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgICAnOmZpbGVJZCc6IGZpbGVJZFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIFNjYW5JbmRleEZvcndhcmQ6IGZhbHNlLFxyXG4gICAgICAgICAgTGltaXQ6IDFcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdRdWVyeSByZXN1bHQgcmVjZWl2ZWQnLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgaXRlbXNGb3VuZDogYW5hbHlzaXNSZXN1bHRzLkl0ZW1zPy5sZW5ndGggfHwgMFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBpZiAoYW5hbHlzaXNSZXN1bHRzLkl0ZW1zICYmIGFuYWx5c2lzUmVzdWx0cy5JdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBjb25zdCBhbmFseXNpcyA9IGFuYWx5c2lzUmVzdWx0cy5JdGVtc1swXTtcclxuICAgICAgICAgIGFuYWx5c2lzSWQgPSBhbmFseXNpcy5hbmFseXNpc0lkO1xyXG4gICAgICAgICAgYW5hbHlzaXNQcm9ncmVzcyA9IDEwMDtcclxuICAgICAgICAgIGFuYWx5c2lzTWVzc2FnZSA9ICdBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JztcclxuXHJcbiAgICAgICAgICAvLyBDUklUSUNBTCBGSVg6IEV4dHJhY3QgdmlvbGF0aW9uIGNvdW50IGZyb20gYW5hbHlzaXMgb2JqZWN0XHJcbiAgICAgICAgICBpZiAoYW5hbHlzaXMudmlvbGF0aW9ucyAmJiBBcnJheS5pc0FycmF5KGFuYWx5c2lzLnZpb2xhdGlvbnMpKSB7XHJcbiAgICAgICAgICAgIHJ1bGVzUHJvY2Vzc2VkID0gYW5hbHlzaXMudmlvbGF0aW9ucy5sZW5ndGg7XHJcbiAgICAgICAgICAgIGxvZ2dlci5pbmZvKCdFeHRyYWN0ZWQgcnVsZSBjb3VudCBmcm9tIGFuYWx5c2lzJywge1xyXG4gICAgICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgICAgcnVsZXNQcm9jZXNzZWQsXHJcbiAgICAgICAgICAgICAgdmlvbGF0aW9uc0xlbmd0aDogYW5hbHlzaXMudmlvbGF0aW9ucy5sZW5ndGhcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBsb2dnZXIud2FybignVmlvbGF0aW9ucyBhcnJheSBub3QgZm91bmQgb3Igbm90IGFuIGFycmF5Jywge1xyXG4gICAgICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgICAgdmlvbGF0aW9uc1R5cGU6IHR5cGVvZiBhbmFseXNpcy52aW9sYXRpb25zLFxyXG4gICAgICAgICAgICAgIHZpb2xhdGlvbnNFeGlzdHM6ICEhYW5hbHlzaXMudmlvbGF0aW9uc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBFeHRyYWN0IHRvdGFsIHJ1bGVzIGZyb20gYW5hbHlzaXMgcmVzdWx0XHJcbiAgICAgICAgICBpZiAoYW5hbHlzaXMudG90YWxSdWxlcykge1xyXG4gICAgICAgICAgICB0b3RhbFJ1bGVzID0gYW5hbHlzaXMudG90YWxSdWxlcztcclxuICAgICAgICAgICAgbG9nZ2VyLmluZm8oJ0V4dHJhY3RlZCB0b3RhbCBydWxlcyBmcm9tIGFuYWx5c2lzJywge1xyXG4gICAgICAgICAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICAgICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgICAgdG90YWxSdWxlczogYW5hbHlzaXMudG90YWxSdWxlc1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcmVzdWx0IGZvdW5kJywge1xyXG4gICAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgIHN0YXR1czogYW5hbHlzaXNTdGF0dXMsXHJcbiAgICAgICAgICAgIHJ1bGVzUHJvY2Vzc2VkLFxyXG4gICAgICAgICAgICB0b3RhbFJ1bGVzXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgbG9nZ2VyLndhcm4oJ05vIGFuYWx5c2lzIHJlc3VsdHMgZm91bmQgaW4gQW5hbHlzaXNSZXN1bHRzIHRhYmxlJywge1xyXG4gICAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gY2F0Y2ggKHF1ZXJ5RXJyb3IpIHtcclxuICAgICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHF1ZXJ5IGFuYWx5c2lzIHJlc3VsdHMnLCB7XHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgZXJyb3I6IHF1ZXJ5RXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IHF1ZXJ5RXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICAgIGVycm9yQ29kZTogKHF1ZXJ5RXJyb3IgYXMgYW55KT8uQ29kZVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEZpbGVTdGF0dXNSZXNwb25zZSA9IHtcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBmaWxlTmFtZTogZmlsZS5maWxlbmFtZSB8fCBmaWxlLmZpbGVOYW1lLFxyXG4gICAgICB1cGxvYWRlZEF0OiBmaWxlLnVwbG9hZGVkQXQgfHwgZmlsZS51cGxvYWRUaW1lc3RhbXAgfHwgRGF0ZS5ub3coKSxcclxuICAgICAgYW5hbHlzaXNJZDogYW5hbHlzaXNJZCxcclxuICAgICAgYW5hbHlzaXNTdGF0dXM6IGFuYWx5c2lzU3RhdHVzIGFzIGFueSxcclxuICAgICAgYW5hbHlzaXNQcm9ncmVzcyxcclxuICAgICAgYW5hbHlzaXNNZXNzYWdlLFxyXG4gICAgICBlcnJvck1lc3NhZ2UsXHJcbiAgICAgIHJ1bGVzUHJvY2Vzc2VkLFxyXG4gICAgICB0b3RhbFJ1bGVzXHJcbiAgICB9O1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGaWxlIHN0YXR1cyByZXRyaWV2ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGFuYWx5c2lzU3RhdHVzXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IGNvcnNIZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSlcclxuICAgIH07XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcclxuICAgIGxvZ2dlci5lcnJvcignR2V0IGZpbGUgc3RhdHVzIGZhaWxlZCcsIHtcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFja1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHByb3BlciBDT1JTIGhlYWRlcnMgZXZlbiBvbiBlcnJvclxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiBjb3JzSGVhZGVycyxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnR0VUX1NUQVRVU19GQUlMRUQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSB8fCAnRmFpbGVkIHRvIGdldCBmaWxlIHN0YXR1cycsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEdldCBkZWZhdWx0IG1lc3NhZ2UgYmFzZWQgb24gYW5hbHlzaXMgc3RhdHVzXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXREZWZhdWx0TWVzc2FnZShzdGF0dXM6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgbWVzc2FnZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAncGVuZGluZyc6ICdXYWl0aW5nIGZvciBhbmFseXNpcyB0byBzdGFydC4uLicsXHJcbiAgICAnaW5fcHJvZ3Jlc3MnOiAnQW5hbHlzaXMgaW4gcHJvZ3Jlc3MuLi4nLFxyXG4gICAgJ2NvbXBsZXRlZCc6ICdBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICdmYWlsZWQnOiAnQW5hbHlzaXMgZmFpbGVkJ1xyXG4gIH07XHJcbiAgcmV0dXJuIG1lc3NhZ2VzW3N0YXR1c10gfHwgJ1Vua25vd24gc3RhdHVzJztcclxufVxyXG5cclxuLyoqXHJcbiAqIFN0YW5kYXJkIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczogY29yc0hlYWRlcnMsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogY29ycmVsYXRpb25JZFxyXG4gICAgICB9XHJcbiAgICB9KVxyXG4gIH07XHJcbn1cclxuIl19