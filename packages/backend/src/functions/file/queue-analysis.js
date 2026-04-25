"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const auth_util_1 = require("../../utils/auth-util");
const centralized_error_handler_1 = require("../../services/error-handling/centralized-error-handler");
const enhanced_retry_1 = require("../../services/error-handling/enhanced-retry");
const cloudwatch_monitoring_1 = require("../../services/monitoring/cloudwatch-monitoring");
const logger_1 = require("../../utils/logger");
const sqsClient = new client_sqs_1.SQSClient({});
const logger = (0, logger_1.createLogger)('QueueAnalysisFunction');
/**
 * Queue analysis after S3 upload completes
 * This endpoint is called by the frontend AFTER uploading file to S3
 * This ensures S3 eventual consistency before Lambda tries to download
 *
 * Requirements: 6.1, 6.3, 8.1
 */
exports.handler = centralized_error_handler_1.centralizedErrorHandler.wrapLambdaHandler(async (event) => {
    const startTime = Date.now();
    try {
        logger.info('Queue analysis request started', {
            path: event.path,
            hasBody: !!event.body,
        });
        // Extract user from Lambda Authorizer context
        const user = await (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            logger.warn('Unauthorized queue analysis attempt');
            await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('UNAUTHORIZED', 'queue-analysis-service', 'MISSING_USER');
            throw new Error('User not authenticated');
        }
        logger.info('User authenticated for queue analysis', {
            userId: user.userId,
            organizationId: user.organizationId,
        });
        // Parse and validate request body
        if (!event.body) {
            logger.warn('Queue analysis request missing body');
            await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'queue-analysis-service', 'MISSING_BODY');
            throw new Error('Request body is required');
        }
        const queueRequest = JSON.parse(event.body);
        logger.info('Queue analysis request parsed', {
            fileId: queueRequest.fileId,
            s3Key: queueRequest.s3Key,
            language: queueRequest.language
        });
        // Validate input
        if (!queueRequest.fileId || !queueRequest.s3Key || !queueRequest.language) {
            logger.warn('Queue analysis request missing required fields');
            await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'queue-analysis-service', 'MISSING_FIELDS');
            throw new Error('fileId, s3Key, and language are required');
        }
        // Queue analysis with retry
        await queueAnalysisWithRetry(queueRequest, user);
        // Record success metrics
        const duration = Date.now() - startTime;
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordPerformance('queue-analysis', duration, 'queue-analysis-service', true);
        logger.info('Analysis queued successfully', {
            fileId: queueRequest.fileId,
            duration
        });
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            body: JSON.stringify({
                success: true,
                fileId: queueRequest.fileId,
                message: 'Analysis queued successfully'
            }),
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordPerformance('queue-analysis', duration, 'queue-analysis-service', false);
        logger.error('Queue analysis failed', error);
        throw error; // Let centralized error handler manage this
    }
}, 'queue-analysis-service');
/**
 * Queue analysis with retry and graceful failure
 */
async function queueAnalysisWithRetry(queueRequest, user) {
    const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
    if (!analysisQueueUrl) {
        logger.warn('ANALYSIS_QUEUE_URL not configured - analysis will not be triggered');
        throw new Error('Analysis queue not configured');
    }
    try {
        await enhanced_retry_1.enhancedRetryService.executeWithRetry(async () => {
            logger.info('Queuing analysis', {
                fileId: queueRequest.fileId,
                language: queueRequest.language,
                s3Key: queueRequest.s3Key
            });
            await sqsClient.send(new client_sqs_1.SendMessageCommand({
                QueueUrl: analysisQueueUrl,
                MessageBody: JSON.stringify({
                    fileId: queueRequest.fileId,
                    fileName: queueRequest.fileName,
                    s3Key: queueRequest.s3Key,
                    language: queueRequest.language,
                    userId: user.userId,
                    organizationId: user.organizationId || 'default-org',
                }),
            }));
            logger.info('Analysis queued successfully', {
                fileId: queueRequest.fileId,
                s3Key: queueRequest.s3Key
            });
        }, {
            maxAttempts: 3,
            initialDelayMs: 500,
            retryableErrors: ['timeout', 'SERVICE_UNAVAILABLE', 'ThrottlingException']
        });
    }
    catch (error) {
        logger.error('Failed to queue analysis', {
            fileId: queueRequest.fileId,
            error: error.message
        });
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('QUEUE_FAILED', 'queue-analysis-service', 'SQS_ANALYSIS');
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVldWUtYW5hbHlzaXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJxdWV1ZS1hbmFseXNpcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxvREFBb0U7QUFDcEUscURBQTJEO0FBQzNELHVHQUFrRztBQUNsRyxpRkFBb0Y7QUFDcEYsMkZBQThGO0FBQzlGLCtDQUFrRDtBQUVsRCxNQUFNLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDcEMsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLHVCQUF1QixDQUFDLENBQUM7QUFTckQ7Ozs7OztHQU1HO0FBQ1UsUUFBQSxPQUFPLEdBQUcsbURBQXVCLENBQUMsaUJBQWlCLENBQzlELEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFO1lBQzVDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJO1NBQ3RCLENBQUMsQ0FBQztRQUVILDhDQUE4QztRQUM5QyxNQUFNLElBQUksR0FBRyxNQUFNLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLENBQUM7WUFDbkQsTUFBTSxtREFBMkIsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLHdCQUF3QixFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3hHLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyx1Q0FBdUMsRUFBRTtZQUNuRCxNQUFNLEVB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TyxLQUFLLEVBQUUsQ0FBQztRQUNmLE1BQU0sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUU7WUFDdkMsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO1lBQzNCLEtBQUssRUFBRyxLQUFlLENBQUMsT0FBTztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLG1EQUEyQixDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFeEcsTUFBTSxLQUFLLENBQUM7SUFDZCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgU1FTQ2xpZW50LCBTZW5kTWVzc2FnZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3FzJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuaW1wb3J0IHsgY2VudHJhbGl6ZWRFcnJvckhhbmRsZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9jZW50cmFsaXplZC1lcnJvci1oYW5kbGVyJztcclxuaW1wb3J0IHsgZW5oYW5jZWRSZXRyeVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9lbmhhbmNlZC1yZXRyeSc7XHJcbmltcG9ydCB7IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21vbml0b3JpbmcvY2xvdWR3YXRjaC1tb25pdG9yaW5nJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IHNxc0NsaWVudCA9IG5ldyBTUVNDbGllbnQoe30pO1xyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ1F1ZXVlQW5hbHlzaXNGdW5jdGlvbicpO1xyXG5cclxuaW50ZXJmYWNlIFF1ZXVlQW5hbHlzaXNSZXF1ZXN0IHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIHMzS2V5OiBzdHJpbmc7XHJcbiAgbGFuZ3VhZ2U6ICdDJyB8ICdDUFAnO1xyXG59XHJcblxyXG4vKipcclxuICogUXVldWUgYW5hbHlzaXMgYWZ0ZXIgUzMgdXBsb2FkIGNvbXBsZXRlc1xyXG4gKiBUaGlzIGVuZHBvaW50IGlzIGNhbGxlZCBieSB0aGUgZnJvbnRlbmQgQUZURVIgdXBsb2FkaW5nIGZpbGUgdG8gUzNcclxuICogVGhpcyBlbnN1cmVzIFMzIGV2ZW50dWFsIGNvbnNpc3RlbmN5IGJlZm9yZSBMYW1iZGEgdHJpZXMgdG8gZG93bmxvYWRcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogNi4xLCA2LjMsIDguMVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBjZW50cmFsaXplZEVycm9ySGFuZGxlci53cmFwTGFtYmRhSGFuZGxlcihcclxuICBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdRdWV1ZSBhbmFseXNpcyByZXF1ZXN0IHN0YXJ0ZWQnLCB7IFxyXG4gICAgICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgICAgaGFzQm9keTogISFldmVudC5ib2R5LFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHRcclxuICAgICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VuYXV0aG9yaXplZCBxdWV1ZSBhbmFseXNpcyBhdHRlbXB0Jyk7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdVTkFVVEhPUklaRUQnLCAncXVldWUtYW5hbHlzaXMtc2VydmljZScsICdNSVNTSU5HX1VTRVInKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1VzZXIgYXV0aGVudGljYXRlZCBmb3IgcXVldWUgYW5hbHlzaXMnLCB7IFxyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsIFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFBhcnNlIGFuZCB2YWxpZGF0ZSByZXF1ZXN0IGJvZHlcclxuICAgICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1F1ZXVlIGFuYWx5c2lzIHJlcXVlc3QgbWlzc2luZyBib2R5Jyk7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdWQUxJREFUSU9OX0VSUk9SJywgJ3F1ZXVlLWFuYWx5c2lzLXNlcnZpY2UnLCAnTUlTU0lOR19CT0RZJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcXVldWVSZXF1ZXN0OiBRdWV1ZUFuYWx5c2lzUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdRdWV1ZSBhbmFseXNpcyByZXF1ZXN0IHBhcnNlZCcsIHsgXHJcbiAgICAgICAgZmlsZUlkOiBxdWV1ZVJlcXVlc3QuZmlsZUlkLCBcclxuICAgICAgICBzM0tleTogcXVldWVSZXF1ZXN0LnMzS2V5LFxyXG4gICAgICAgIGxhbmd1YWdlOiBxdWV1ZVJlcXVlc3QubGFuZ3VhZ2VcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSBpbnB1dFxyXG4gICAgICBpZiAoIXF1ZXVlUmVxdWVzdC5maWxlSWQgfHwgIXF1ZXVlUmVxdWVzdC5zM0tleSB8fCAhcXVldWVSZXF1ZXN0Lmxhbmd1YWdlKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1F1ZXVlIGFuYWx5c2lzIHJlcXVlc3QgbWlzc2luZyByZXF1aXJlZCBmaWVsZHMnKTtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1ZBTElEQVRJT05fRVJST1InLCAncXVldWUtYW5hbHlzaXMtc2VydmljZScsICdNSVNTSU5HX0ZJRUxEUycpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZmlsZUlkLCBzM0tleSwgYW5kIGxhbmd1YWdlIGFyZSByZXF1aXJlZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBRdWV1ZSBhbmFseXNpcyB3aXRoIHJldHJ5XHJcbiAgICAgIGF3YWl0IHF1ZXVlQW5hbHlzaXNXaXRoUmV0cnkocXVldWVSZXF1ZXN0LCB1c2VyKTtcclxuXHJcbiAgICAgIC8vIFJlY29yZCBzdWNjZXNzIG1ldHJpY3NcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2UoJ3F1ZXVlLWFuYWx5c2lzJywgZHVyYXRpb24sICdxdWV1ZS1hbmFseXNpcy1zZXJ2aWNlJywgdHJ1ZSk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcXVldWVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgICAgZmlsZUlkOiBxdWV1ZVJlcXVlc3QuZmlsZUlkLCBcclxuICAgICAgICBkdXJhdGlvbiBcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICBmaWxlSWQ6IHF1ZXVlUmVxdWVzdC5maWxlSWQsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnQW5hbHlzaXMgcXVldWVkIHN1Y2Nlc3NmdWxseSdcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRQZXJmb3JtYW5jZSgncXVldWUtYW5hbHlzaXMnLCBkdXJhdGlvbiwgJ3F1ZXVlLWFuYWx5c2lzLXNlcnZpY2UnLCBmYWxzZSk7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuZXJyb3IoJ1F1ZXVlIGFuYWx5c2lzIGZhaWxlZCcsIGVycm9yIGFzIEVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7IC8vIExldCBjZW50cmFsaXplZCBlcnJvciBoYW5kbGVyIG1hbmFnZSB0aGlzXHJcbiAgICB9XHJcbiAgfSxcclxuICAncXVldWUtYW5hbHlzaXMtc2VydmljZSdcclxuKTtcclxuXHJcbi8qKlxyXG4gKiBRdWV1ZSBhbmFseXNpcyB3aXRoIHJldHJ5IGFuZCBncmFjZWZ1bCBmYWlsdXJlXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBxdWV1ZUFuYWx5c2lzV2l0aFJldHJ5KFxyXG4gIHF1ZXVlUmVxdWVzdDogUXVldWVBbmFseXNpc1JlcXVlc3QsXHJcbiAgdXNlcjogYW55XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGFuYWx5c2lzUXVldWVVcmwgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19RVUVVRV9VUkw7XHJcbiAgXHJcbiAgaWYgKCFhbmFseXNpc1F1ZXVlVXJsKSB7XHJcbiAgICBsb2dnZXIud2FybignQU5BTFlTSVNfUVVFVUVfVVJMIG5vdCBjb25maWd1cmVkIC0gYW5hbHlzaXMgd2lsbCBub3QgYmUgdHJpZ2dlcmVkJyk7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0FuYWx5c2lzIHF1ZXVlIG5vdCBjb25maWd1cmVkJyk7XHJcbiAgfVxyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdRdWV1aW5nIGFuYWx5c2lzJywgeyBcclxuICAgICAgICAgIGZpbGVJZDogcXVldWVSZXF1ZXN0LmZpbGVJZCwgXHJcbiAgICAgICAgICBsYW5ndWFnZTogcXVldWVSZXF1ZXN0Lmxhbmd1YWdlLFxyXG4gICAgICAgICAgczNLZXk6IHF1ZXVlUmVxdWVzdC5zM0tleVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhd2FpdCBzcXNDbGllbnQuc2VuZChuZXcgU2VuZE1lc3NhZ2VDb21tYW5kKHtcclxuICAgICAgICAgIFF1ZXVlVXJsOiBhbmFseXNpc1F1ZXVlVXJsLFxyXG4gICAgICAgICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZmlsZUlkOiBxdWV1ZVJlcXVlc3QuZmlsZUlkLFxyXG4gICAgICAgICAgICBmaWxlTmFtZTogcXVldWVSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgICAgICBzM0tleTogcXVldWVSZXF1ZXN0LnMzS2V5LFxyXG4gICAgICAgICAgICBsYW5ndWFnZTogcXVldWVSZXF1ZXN0Lmxhbmd1YWdlLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCB8fCAnZGVmYXVsdC1vcmcnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcXVldWVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgICAgICBmaWxlSWQ6IHF1ZXVlUmVxdWVzdC5maWxlSWQsXHJcbiAgICAgICAgICBzM0tleTogcXVldWVSZXF1ZXN0LnMzS2V5XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0sXHJcbiAgICAgIHsgXHJcbiAgICAgICAgbWF4QXR0ZW1wdHM6IDMsIFxyXG4gICAgICAgIGluaXRpYWxEZWxheU1zOiA1MDAsXHJcbiAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ3RpbWVvdXQnLCAnU0VSVklDRV9VTkFWQUlMQUJMRScsICdUaHJvdHRsaW5nRXhjZXB0aW9uJ11cclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIHF1ZXVlIGFuYWx5c2lzJywge1xyXG4gICAgICBmaWxlSWQ6IHF1ZXVlUmVxdWVzdC5maWxlSWQsXHJcbiAgICAgIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2VcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignUVVFVUVfRkFJTEVEJywgJ3F1ZXVlLWFuYWx5c2lzLXNlcnZpY2UnLCAnU1FTX0FOQUxZU0lTJyk7XHJcbiAgICBcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG4iXX0=