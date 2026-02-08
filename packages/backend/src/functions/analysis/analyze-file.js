"use strict";
/**
 * Lambda function for MISRA file analysis
 * Triggered by Step Functions workflow or direct invocation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const misra_analysis_service_1 = require("../../services/misra/misra-analysis-service");
const violation_report_service_1 = require("../../services/misra/violation-report-service");
const analysis_results_service_1 = require("../../services/analysis-results-service");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const notification_service_1 = require("../../services/notification-service");
const error_handler_service_1 = require("../../services/error-handler-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const file_metadata_1 = require("../../types/file-metadata");
const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || '';
const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';
const analysisService = new misra_analysis_service_1.MisraAnalysisService(bucketName, region);
const reportService = new violation_report_service_1.ViolationReportService();
const notificationService = new notification_service_1.NotificationService(region);
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const metadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const resultsService = new analysis_results_service_1.AnalysisResultsService(dbClient);
const handler = async (event) => {
    console.log('Analysis event received:', JSON.stringify(event, null, 2));
    const { fileId, fileName, s3Key, fileType, ruleSet, userId, organizationId, userEmail } = event;
    if (!userId) {
        const error = new Error('userId is required for analysis');
        error_handler_service_1.ErrorHandlerService.handleError(error, { fileId, operation: 'analyze-file' }, error_handler_service_1.ErrorSeverity.HIGH);
        return {
            statusCode: 400,
            status: 'FAILED',
            error: 'userId is required for analysis'
        };
    }
    let retryCount = 0;
    const maxRetries = 3;
    while (retryCount <= maxRetries) {
        try {
            // Update status to IN_PROGRESS
            await metadataService.updateAnalysisStatus(fileId, file_metadata_1.AnalysisStatus.IN_PROGRESS);
            // Perform MISRA analysis
            const result = await analysisService.analyzeFile(fileId, fileName, s3Key, fileType, { ruleSet });
            if (result.success) {
                // Generate violation report
                const report = reportService.generateReport(result, {
                    includeSummary: true,
                    includeRecommendations: true,
                    groupBySeverity: true,
                    groupByRule: true
                });
                // Store analysis results in DynamoDB
                const storedResult = await resultsService.storeAnalysisResult(result, userId, organizationId);
                // Update metadata with results
                await metadataService.updateFileMetadata(fileId, {
                    analysis_status: file_metadata_1.AnalysisStatus.COMPLETED,
                    analysis_results: {
                        violations_count: result.violationsCount,
                        rules_checked: result.rulesChecked,
                        completion_timestamp: result.analysisTimestamp
                    },
                    updated_at: Date.now()
                });
                console.log(`Analysis completed for ${fileId}: ${result.violationsCount} violations found`);
                console.log(`Report generated with ${report.recommendations.length} recommendations`);
                console.log(`Results stored with ID: ${storedResult.analysisId}`);
                // Send success notification
                try {
                    await notificationService.notifyAnalysisComplete(userId, fileId, fileName, result.violationsCount, userEmail);
                }
                catch (notifError) {
                    // Log notification error but don't fail the analysis
                    error_handler_service_1.ErrorHandlerService.handleError(notifError, { userId, fileId, operation: 'send-notification' }, error_handler_service_1.ErrorSeverity.LOW);
                }
                return {
                    statusCode: 200,
                    status: 'COMPLETED',
                    fileId,
                    analysisId: storedResult.analysisId,
                    results: {
                        violations_count: result.violationsCount,
                        rules_checked: result.rulesChecked,
                        completion_timestamp: result.analysisTimestamp
                    },
                    violations: result.violations,
                    report: {
                        summary: report.summary,
                        recommendations: report.recommendations,
                        violationsByRule: report.violationsByRule.map(r => ({
                            ruleId: r.ruleId,
                            ruleTitle: r.ruleTitle,
                            count: r.count
                        }))
                    }
                };
            }
            else {
                // Store failed analysis result
                await resultsService.storeAnalysisResult(result, userId, organizationId);
                // Update status to FAILED
                await metadataService.updateFileMetadata(fileId, {
                    analysis_status: file_metadata_1.AnalysisStatus.FAILED,
                    analysis_results: {
                        violations_count: 0,
                        rules_checked: [],
                        completion_timestamp: Date.now(),
                        error_message: result.errorMessage
                    },
                    updated_at: Date.now()
                });
                // Log error
                const error = new Error(result.errorMessage || 'Analysis failed');
                error_handler_service_1.ErrorHandlerService.handleError(error, { userId, fileId, fileName, operation: 'misra-analysis' }, error_handler_service_1.ErrorSeverity.HIGH);
                // Send failure notification
                try {
                    await notificationService.notifyAnalysisFailure(userId, fileId, fileName, result.errorMessage || 'Unknown error', userEmail);
                }
                catch (notifError) {
                    error_handler_service_1.ErrorHandlerService.handleError(notifError, { userId, fileId, operation: 'send-notification' }, error_handler_service_1.ErrorSeverity.LOW);
                }
                console.error(`Analysis failed for ${fileId}:`, result.errorMessage);
                return {
                    statusCode: 500,
                    status: 'FAILED',
                    fileId,
                    analysisId: fileId,
                    error: result.errorMessage
                };
            }
        }
        catch (error) {
            console.error(`Error during analysis (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);
            // Determine if we should retry
            const retryStrategy = error_handler_service_1.ErrorHandlerService.getRetryStrategy(error);
            if (retryStrategy.shouldRetry && retryCount < maxRetries) {
                retryCount++;
                console.log(`Retrying analysis after ${retryStrategy.retryAfter}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryStrategy.retryAfter));
                continue;
            }
            // Max retries exceeded or non-retryable error
            const errorLog = error_handler_service_1.ErrorHandlerService.handleError(error, { userId, fileId, fileName, operation: 'analyze-file', retryCount }, error_handler_service_1.ErrorSeverity.CRITICAL);
            // Update status to FAILED
            try {
                await metadataService.updateFileMetadata(fileId, {
                    analysis_status: file_metadata_1.AnalysisStatus.FAILED,
                    analysis_results: {
                        violations_count: 0,
                        rules_checked: [],
                        completion_timestamp: Date.now(),
                        error_message: error instanceof Error ? error.message : 'Unknown error'
                    },
                    updated_at: Date.now()
                });
                // Send failure notification
                await notificationService.notifyAnalysisFailure(userId, fileId, fileName, error instanceof Error ? error.message : 'Unknown error', userEmail);
                // Notify system admins of critical error
                if (error_handler_service_1.ErrorHandlerService.shouldNotifyUser(error, error_handler_service_1.ErrorSeverity.CRITICAL)) {
                    await notificationService.notifySystemError(errorLog.errorId, error instanceof Error ? error.message : 'Unknown error', { userId, fileId, fileName, retryCount });
                }
            }
            catch (updateError) {
                console.error('Failed to update metadata or send notifications:', updateError);
            }
            return {
                statusCode: 500,
                status: 'FAILED',
                fileId,
                analysisId: fileId,
                errorId: errorLog.errorId,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    // Should never reach here, but just in case
    return {
        statusCode: 500,
        status: 'FAILED',
        fileId,
        error: 'Max retries exceeded'
    };
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILHdGQUFtRjtBQUNuRiw0RkFBdUY7QUFDdkYsc0ZBQWlGO0FBQ2pGLGdGQUEyRTtBQUMzRSw4RUFBMEU7QUFDMUUsZ0ZBQTBGO0FBQzFGLG9FQUF1RTtBQUN2RSw2REFBMkQ7QUFHM0QsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSxFQUFFLENBQUM7QUFDOUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDO0FBQ3JELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUVyRCxNQUFNLGVBQWUsR0FBRyxJQUFJLDZDQUFvQixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNyRSxNQUFNLGFBQWEsR0FBRyxJQUFJLGlEQUFzQixFQUFFLENBQUM7QUFDbkQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLDBDQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVELE1BQU0sUUFBUSxHQUFHLElBQUksdUNBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDeEQsTUFBTSxlQUFlLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMxRCxNQUFNLGNBQWMsR0FBRyxJQUFJLGlEQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBYXJELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUF1QixFQUFFLEVBQUU7SUFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV4RSxNQUFNLEVBQUUsTUFBTSxFQUFF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IGZ1bmN0aW9uIGZvciBNSVNSQSBmaWxlIGFuYWx5c2lzXHJcbiAqIFRyaWdnZXJlZCBieSBTdGVwIEZ1bmN0aW9ucyB3b3JrZmxvdyBvciBkaXJlY3QgaW52b2NhdGlvblxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE1pc3JhQW5hbHlzaXNTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEvbWlzcmEtYW5hbHlzaXMtc2VydmljZSc7XHJcbmltcG9ydCB7IFZpb2xhdGlvblJlcG9ydFNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS92aW9sYXRpb24tcmVwb3J0LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBBbmFseXNpc1Jlc3VsdHNTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYW5hbHlzaXMtcmVzdWx0cy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRmlsZU1ldGFkYXRhU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2ZpbGUtbWV0YWRhdGEtc2VydmljZSc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9ub3RpZmljYXRpb24tc2VydmljZSc7XHJcbmltcG9ydCB7IEVycm9ySGFuZGxlclNlcnZpY2UsIEVycm9yU2V2ZXJpdHkgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGVyLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnO1xyXG5pbXBvcnQgeyBBbmFseXNpc1N0YXR1cyB9IGZyb20gJy4uLy4uL3R5cGVzL2ZpbGUtbWV0YWRhdGEnO1xyXG5pbXBvcnQgeyBNaXNyYVJ1bGVTZXQgfSBmcm9tICcuLi8uLi90eXBlcy9taXNyYS1ydWxlcyc7XHJcblxyXG5jb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICcnO1xyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBlbnZpcm9ubWVudCA9IHByb2Nlc3MuZW52LkVOVklST05NRU5UIHx8ICdkZXYnO1xyXG5cclxuY29uc3QgYW5hbHlzaXNTZXJ2aWNlID0gbmV3IE1pc3JhQW5hbHlzaXNTZXJ2aWNlKGJ1Y2tldE5hbWUsIHJlZ2lvbik7XHJcbmNvbnN0IHJlcG9ydFNlcnZpY2UgPSBuZXcgVmlvbGF0aW9uUmVwb3J0U2VydmljZSgpO1xyXG5jb25zdCBub3RpZmljYXRpb25TZXJ2aWNlID0gbmV3IE5vdGlmaWNhdGlvblNlcnZpY2UocmVnaW9uKTtcclxuY29uc3QgZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnRXcmFwcGVyKGVudmlyb25tZW50KTtcclxuY29uc3QgbWV0YWRhdGFTZXJ2aWNlID0gbmV3IEZpbGVNZXRhZGF0YVNlcnZpY2UoZGJDbGllbnQpO1xyXG5jb25zdCByZXN1bHRzU2VydmljZSA9IG5ldyBBbmFseXNpc1Jlc3VsdHNTZXJ2aWNlKGRiQ2xpZW50KTtcclxuXHJcbmludGVyZmFjZSBBbmFseXplRmlsZUV2ZW50IHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIHMzS2V5OiBzdHJpbmc7XHJcbiAgZmlsZVR5cGU6IHN0cmluZztcclxuICBydWxlU2V0PzogTWlzcmFSdWxlU2V0O1xyXG4gIHVzZXJJZD86IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZD86IHN0cmluZztcclxuICB1c2VyRW1haWw/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBbmFseXplRmlsZUV2ZW50KSA9PiB7XHJcbiAgY29uc29sZS5sb2coJ0FuYWx5c2lzIGV2ZW50IHJlY2VpdmVkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIGNvbnN0IHsgZmlsZUlkLCBmaWxlTmFtZSwgczNLZXksIGZpbGVUeXBlLCBydWxlU2V0LCB1c2VySWQsIG9yZ2FuaXphdGlvbklkLCB1c2VyRW1haWwgfSA9IGV2ZW50O1xyXG5cclxuICBpZiAoIXVzZXJJZCkge1xyXG4gICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoJ3VzZXJJZCBpcyByZXF1aXJlZCBmb3IgYW5hbHlzaXMnKTtcclxuICAgIEVycm9ySGFuZGxlclNlcnZpY2UuaGFuZGxlRXJyb3IoZXJyb3IsIHsgZmlsZUlkLCBvcGVyYXRpb246ICdhbmFseXplLWZpbGUnIH0sIEVycm9yU2V2ZXJpdHkuSElHSCk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgIHN0YXR1czogJ0ZBSUxFRCcsXHJcbiAgICAgIGVycm9yOiAndXNlcklkIGlzIHJlcXVpcmVkIGZvciBhbmFseXNpcydcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBsZXQgcmV0cnlDb3VudCA9IDA7XHJcbiAgY29uc3QgbWF4UmV0cmllcyA9IDM7XHJcblxyXG4gIHdoaWxlIChyZXRyeUNvdW50IDw9IG1heFJldHJpZXMpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgdG8gSU5fUFJPR1JFU1NcclxuICAgICAgYXdhaXQgbWV0YWRhdGFTZXJ2aWNlLnVwZGF0ZUFuYWx5c2lzU3RhdHVzKGZpbGVJZCwgQW5hbHlzaXNTdGF0dXMuSU5fUFJPR1JFU1MpO1xyXG5cclxuICAgICAgLy8gUGVyZm9ybSBNSVNSQSBhbmFseXNpc1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBhbmFseXNpc1NlcnZpY2UuYW5hbHl6ZUZpbGUoXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgIHMzS2V5LFxyXG4gICAgICAgIGZpbGVUeXBlIGFzIGFueSxcclxuICAgICAgICB7IHJ1bGVTZXQgfVxyXG4gICAgICApO1xyXG5cclxuICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgICAgLy8gR2VuZXJhdGUgdmlvbGF0aW9uIHJlcG9ydFxyXG4gICAgICAgIGNvbnN0IHJlcG9ydCA9IHJlcG9ydFNlcnZpY2UuZ2VuZXJhdGVSZXBvcnQocmVzdWx0LCB7XHJcbiAgICAgICAgICBpbmNsdWRlU3VtbWFyeTogdHJ1ZSxcclxuICAgICAgICAgIGluY2x1ZGVSZWNvbW1lbmRhdGlvbnM6IHRydWUsXHJcbiAgICAgICAgICBncm91cEJ5U2V2ZXJpdHk6IHRydWUsXHJcbiAgICAgICAgICBncm91cEJ5UnVsZTogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBTdG9yZSBhbmFseXNpcyByZXN1bHRzIGluIER5bmFtb0RCXHJcbiAgICAgICAgY29uc3Qgc3RvcmVkUmVzdWx0ID0gYXdhaXQgcmVzdWx0c1NlcnZpY2Uuc3RvcmVBbmFseXNpc1Jlc3VsdChcclxuICAgICAgICAgIHJlc3VsdCxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIG9yZ2FuaXphdGlvbklkXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8gVXBkYXRlIG1ldGFkYXRhIHdpdGggcmVzdWx0c1xyXG4gICAgICAgIGF3YWl0IG1ldGFkYXRhU2VydmljZS51cGRhdGVGaWxlTWV0YWRhdGEoZmlsZUlkLCB7XHJcbiAgICAgICAgICBhbmFseXNpc19zdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkNPTVBMRVRFRCxcclxuICAgICAgICAgIGFuYWx5c2lzX3Jlc3VsdHM6IHtcclxuICAgICAgICAgICAgdmlvbGF0aW9uc19jb3VudDogcmVzdWx0LnZpb2xhdGlvbnNDb3VudCxcclxuICAgICAgICAgICAgcnVsZXNfY2hlY2tlZDogcmVzdWx0LnJ1bGVzQ2hlY2tlZCxcclxuICAgICAgICAgICAgY29tcGxldGlvbl90aW1lc3RhbXA6IHJlc3VsdC5hbmFseXNpc1RpbWVzdGFtcFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHVwZGF0ZWRfYXQ6IERhdGUubm93KClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc29sZS5sb2coYEFuYWx5c2lzIGNvbXBsZXRlZCBmb3IgJHtmaWxlSWR9OiAke3Jlc3VsdC52aW9sYXRpb25zQ291bnR9IHZpb2xhdGlvbnMgZm91bmRgKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgUmVwb3J0IGdlbmVyYXRlZCB3aXRoICR7cmVwb3J0LnJlY29tbWVuZGF0aW9ucy5sZW5ndGh9IHJlY29tbWVuZGF0aW9uc2ApO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBSZXN1bHRzIHN0b3JlZCB3aXRoIElEOiAke3N0b3JlZFJlc3VsdC5hbmFseXNpc0lkfWApO1xyXG5cclxuICAgICAgICAvLyBTZW5kIHN1Y2Nlc3Mgbm90aWZpY2F0aW9uXHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5QW5hbHlzaXNDb21wbGV0ZShcclxuICAgICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgICAgICByZXN1bHQudmlvbGF0aW9uc0NvdW50LFxyXG4gICAgICAgICAgICB1c2VyRW1haWxcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSBjYXRjaCAobm90aWZFcnJvcikge1xyXG4gICAgICAgICAgLy8gTG9nIG5vdGlmaWNhdGlvbiBlcnJvciBidXQgZG9uJ3QgZmFpbCB0aGUgYW5hbHlzaXNcclxuICAgICAgICAgIEVycm9ySGFuZGxlclNlcnZpY2UuaGFuZGxlRXJyb3IoXHJcbiAgICAgICAgICAgIG5vdGlmRXJyb3IgYXMgRXJyb3IsXHJcbiAgICAgICAgICAgIHsgdXNlcklkLCBmaWxlSWQsIG9wZXJhdGlvbjogJ3NlbmQtbm90aWZpY2F0aW9uJyB9LFxyXG4gICAgICAgICAgICBFcnJvclNldmVyaXR5LkxPV1xyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgICBzdGF0dXM6ICdDT01QTEVURUQnLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgYW5hbHlzaXNJZDogc3RvcmVkUmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgICByZXN1bHRzOiB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnNfY291bnQ6IHJlc3VsdC52aW9sYXRpb25zQ291bnQsXHJcbiAgICAgICAgICAgIHJ1bGVzX2NoZWNrZWQ6IHJlc3VsdC5ydWxlc0NoZWNrZWQsXHJcbiAgICAgICAgICAgIGNvbXBsZXRpb25fdGltZXN0YW1wOiByZXN1bHQuYW5hbHlzaXNUaW1lc3RhbXBcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB2aW9sYXRpb25zOiByZXN1bHQudmlvbGF0aW9ucyxcclxuICAgICAgICAgIHJlcG9ydDoge1xyXG4gICAgICAgICAgICBzdW1tYXJ5OiByZXBvcnQuc3VtbWFyeSxcclxuICAgICAgICAgICAgcmVjb21tZW5kYXRpb25zOiByZXBvcnQucmVjb21tZW5kYXRpb25zLFxyXG4gICAgICAgICAgICB2aW9sYXRpb25zQnlSdWxlOiByZXBvcnQudmlvbGF0aW9uc0J5UnVsZS5tYXAociA9PiAoe1xyXG4gICAgICAgICAgICAgIHJ1bGVJZDogci5ydWxlSWQsXHJcbiAgICAgICAgICAgICAgcnVsZVRpdGxlOiByLnJ1bGVUaXRsZSxcclxuICAgICAgICAgICAgICBjb3VudDogci5jb3VudFxyXG4gICAgICAgICAgICB9KSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIFN0b3JlIGZhaWxlZCBhbmFseXNpcyByZXN1bHRcclxuICAgICAgICBhd2FpdCByZXN1bHRzU2VydmljZS5zdG9yZUFuYWx5c2lzUmVzdWx0KHJlc3VsdCwgdXNlcklkLCBvcmdhbml6YXRpb25JZCk7XHJcblxyXG4gICAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgdG8gRkFJTEVEXHJcbiAgICAgICAgYXdhaXQgbWV0YWRhdGFTZXJ2aWNlLnVwZGF0ZUZpbGVNZXRhZGF0YShmaWxlSWQsIHtcclxuICAgICAgICAgIGFuYWx5c2lzX3N0YXR1czogQW5hbHlzaXNTdGF0dXMuRkFJTEVELFxyXG4gICAgICAgICAgYW5hbHlzaXNfcmVzdWx0czoge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zX2NvdW50OiAwLFxyXG4gICAgICAgICAgICBydWxlc19jaGVja2VkOiBbXSxcclxuICAgICAgICAgICAgY29tcGxldGlvbl90aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgICAgICAgIGVycm9yX21lc3NhZ2U6IHJlc3VsdC5lcnJvck1lc3NhZ2VcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB1cGRhdGVkX2F0OiBEYXRlLm5vdygpXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIExvZyBlcnJvclxyXG4gICAgICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKHJlc3VsdC5lcnJvck1lc3NhZ2UgfHwgJ0FuYWx5c2lzIGZhaWxlZCcpO1xyXG4gICAgICAgIEVycm9ySGFuZGxlclNlcnZpY2UuaGFuZGxlRXJyb3IoXHJcbiAgICAgICAgICBlcnJvcixcclxuICAgICAgICAgIHsgdXNlcklkLCBmaWxlSWQsIGZpbGVOYW1lLCBvcGVyYXRpb246ICdtaXNyYS1hbmFseXNpcycgfSxcclxuICAgICAgICAgIEVycm9yU2V2ZXJpdHkuSElHSFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIFNlbmQgZmFpbHVyZSBub3RpZmljYXRpb25cclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlBbmFseXNpc0ZhaWx1cmUoXHJcbiAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgICBmaWxlTmFtZSxcclxuICAgICAgICAgICAgcmVzdWx0LmVycm9yTWVzc2FnZSB8fCAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgICAgICAgIHVzZXJFbWFpbFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9IGNhdGNoIChub3RpZkVycm9yKSB7XHJcbiAgICAgICAgICBFcnJvckhhbmRsZXJTZXJ2aWNlLmhhbmRsZUVycm9yKFxyXG4gICAgICAgICAgICBub3RpZkVycm9yIGFzIEVycm9yLFxyXG4gICAgICAgICAgICB7IHVzZXJJZCwgZmlsZUlkLCBvcGVyYXRpb246ICdzZW5kLW5vdGlmaWNhdGlvbicgfSxcclxuICAgICAgICAgICAgRXJyb3JTZXZlcml0eS5MT1dcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zb2xlLmVycm9yKGBBbmFseXNpcyBmYWlsZWQgZm9yICR7ZmlsZUlkfTpgLCByZXN1bHQuZXJyb3JNZXNzYWdlKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgICAgIHN0YXR1czogJ0ZBSUxFRCcsXHJcbiAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICBhbmFseXNpc0lkOiBmaWxlSWQsXHJcbiAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yTWVzc2FnZVxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGR1cmluZyBhbmFseXNpcyAoYXR0ZW1wdCAke3JldHJ5Q291bnQgKyAxfS8ke21heFJldHJpZXMgKyAxfSk6YCwgZXJyb3IpO1xyXG5cclxuICAgICAgLy8gRGV0ZXJtaW5lIGlmIHdlIHNob3VsZCByZXRyeVxyXG4gICAgICBjb25zdCByZXRyeVN0cmF0ZWd5ID0gRXJyb3JIYW5kbGVyU2VydmljZS5nZXRSZXRyeVN0cmF0ZWd5KGVycm9yIGFzIEVycm9yKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChyZXRyeVN0cmF0ZWd5LnNob3VsZFJldHJ5ICYmIHJldHJ5Q291bnQgPCBtYXhSZXRyaWVzKSB7XHJcbiAgICAgICAgcmV0cnlDb3VudCsrO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBSZXRyeWluZyBhbmFseXNpcyBhZnRlciAke3JldHJ5U3RyYXRlZ3kucmV0cnlBZnRlcn1tcy4uLmApO1xyXG4gICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCByZXRyeVN0cmF0ZWd5LnJldHJ5QWZ0ZXIpKTtcclxuICAgICAgICBjb250aW51ZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gTWF4IHJldHJpZXMgZXhjZWVkZWQgb3Igbm9uLXJldHJ5YWJsZSBlcnJvclxyXG4gICAgICBjb25zdCBlcnJvckxvZyA9IEVycm9ySGFuZGxlclNlcnZpY2UuaGFuZGxlRXJyb3IoXHJcbiAgICAgICAgZXJyb3IgYXMgRXJyb3IsXHJcbiAgICAgICAgeyB1c2VySWQsIGZpbGVJZCwgZmlsZU5hbWUsIG9wZXJhdGlvbjogJ2FuYWx5emUtZmlsZScsIHJldHJ5Q291bnQgfSxcclxuICAgICAgICBFcnJvclNldmVyaXR5LkNSSVRJQ0FMXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBVcGRhdGUgc3RhdHVzIHRvIEZBSUxFRFxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IG1ldGFkYXRhU2VydmljZS51cGRhdGVGaWxlTWV0YWRhdGEoZmlsZUlkLCB7XHJcbiAgICAgICAgICBhbmFseXNpc19zdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkZBSUxFRCxcclxuICAgICAgICAgIGFuYWx5c2lzX3Jlc3VsdHM6IHtcclxuICAgICAgICAgICAgdmlvbGF0aW9uc19jb3VudDogMCxcclxuICAgICAgICAgICAgcnVsZXNfY2hlY2tlZDogW10sXHJcbiAgICAgICAgICAgIGNvbXBsZXRpb25fdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICAgICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHVwZGF0ZWRfYXQ6IERhdGUubm93KClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gU2VuZCBmYWlsdXJlIG5vdGlmaWNhdGlvblxyXG4gICAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5QW5hbHlzaXNGYWlsdXJlKFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgZmlsZU5hbWUsXHJcbiAgICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICAgIHVzZXJFbWFpbFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIE5vdGlmeSBzeXN0ZW0gYWRtaW5zIG9mIGNyaXRpY2FsIGVycm9yXHJcbiAgICAgICAgaWYgKEVycm9ySGFuZGxlclNlcnZpY2Uuc2hvdWxkTm90aWZ5VXNlcihlcnJvciBhcyBFcnJvciwgRXJyb3JTZXZlcml0eS5DUklUSUNBTCkpIHtcclxuICAgICAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5U3lzdGVtRXJyb3IoXHJcbiAgICAgICAgICAgIGVycm9yTG9nLmVycm9ySWQsXHJcbiAgICAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgICAgICB7IHVzZXJJZCwgZmlsZUlkLCBmaWxlTmFtZSwgcmV0cnlDb3VudCB9XHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAodXBkYXRlRXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIG1ldGFkYXRhIG9yIHNlbmQgbm90aWZpY2F0aW9uczonLCB1cGRhdGVFcnJvcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIHN0YXR1czogJ0ZBSUxFRCcsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGFuYWx5c2lzSWQ6IGZpbGVJZCxcclxuICAgICAgICBlcnJvcklkOiBlcnJvckxvZy5lcnJvcklkLFxyXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gU2hvdWxkIG5ldmVyIHJlYWNoIGhlcmUsIGJ1dCBqdXN0IGluIGNhc2VcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgc3RhdHVzOiAnRkFJTEVEJyxcclxuICAgIGZpbGVJZCxcclxuICAgIGVycm9yOiAnTWF4IHJldHJpZXMgZXhjZWVkZWQnXHJcbiAgfTtcclxufTtcclxuIl19