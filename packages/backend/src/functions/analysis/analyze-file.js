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
            // Update status to IN_PROGRESS (use seconds, not milliseconds)
            await metadataService.updateFileMetadata(fileId, {
                analysis_status: file_metadata_1.AnalysisStatus.IN_PROGRESS,
                updated_at: Math.floor(Date.now() / 1000)
            });
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
                // Update metadata with results (use seconds, not milliseconds)
                await metadataService.updateFileMetadata(fileId, {
                    analysis_status: file_metadata_1.AnalysisStatus.COMPLETED,
                    analysis_results: {
                        violations_count: result.violationsCount,
                        rules_checked: result.rulesChecked,
                        completion_timestamp: result.analysisTimestamp
                    },
                    updated_at: Math.floor(Date.now() / 1000)
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
                // Update status to FAILED (use seconds, not milliseconds)
                await metadataService.updateFileMetadata(fileId, {
                    analysis_status: file_metadata_1.AnalysisStatus.FAILED,
                    analysis_results: {
                        violations_count: 0,
                        rules_checked: [],
                        completion_timestamp: Math.floor(Date.now() / 1000),
                        error_message: result.errorMessage
                    },
                    updated_at: Math.floor(Date.now() / 1000)
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
            // Update status to FAILED (use seconds, not milliseconds)
            try {
                await metadataService.updateFileMetadata(fileId, {
                    analysis_status: file_metadata_1.AnalysisStatus.FAILED,
                    analysis_results: {
                        violations_count: 0,
                        rules_checked: [],
                        completion_timestamp: Math.floor(Date.now() / 1000),
                        error_message: error instanceof Error ? error.message : 'Unknown error'
                    },
                    updated_at: Math.floor(Date.now() / 1000)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILHdGQUFtRjtBQUNuRiw0RkFBdUY7QUFDdkYsc0ZBQWlGO0FBQ2pGLGdGQUEyRTtBQUMzRSw4RUFBMEU7QUFDMUUsZ0ZBQTBGO0FBQzFGLG9FQUF1RTtBQUN2RSw2REFBMkQ7QUFHM0QsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSxFQUFFLENBQUM7QUFDOUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDO0FBQ3JELE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUVyRCxNQUFNLGVBQWUsR0FBRyxJQUFJLDZDQUFvQixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUNyRSxNQUFNLGFBQWEsR0FBRyxJQUFJLGlEQUFzQixFQUFFLENBQUM7QUFDbkQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLDBDQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVELE1BQU0sUUFBUSxHQUFHLElBQUksdUNBQXFCLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDeEQsTUFBTSxlQUFlLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUMxRCxNQUFNLGNBQWMsR0FBRyxJQUFJLGlEQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBYXJELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUF1QixFQUFFLEVBQUU7SUFDdkQsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV4RSxNQUFNLEVBQUUsTUFBTSxFQUFF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WSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQsNENBQTRDO0lBQzVDLE9BQU87UUFDTCxVQUFVLEVBQUUsR0FBRztRQUNmLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLE1BQU07UUFDTixLQUFLLEVBQUUsc0JBQXNCO0tBQzlCLENBQUM7QUFDSixDQUFDLENBQUM7QUFwT1csUUFBQSxPQUFPLFdBb09sQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gZm9yIE1JU1JBIGZpbGUgYW5hbHlzaXNcclxuICogVHJpZ2dlcmVkIGJ5IFN0ZXAgRnVuY3Rpb25zIHdvcmtmbG93IG9yIGRpcmVjdCBpbnZvY2F0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTWlzcmFBbmFseXNpc1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS9taXNyYS1hbmFseXNpcy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgVmlvbGF0aW9uUmVwb3J0U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21pc3JhL3Zpb2xhdGlvbi1yZXBvcnQtc2VydmljZSc7XHJcbmltcG9ydCB7IEFuYWx5c2lzUmVzdWx0c1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hbmFseXNpcy1yZXN1bHRzLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS1tZXRhZGF0YS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRXJyb3JIYW5kbGVyU2VydmljZSwgRXJyb3JTZXZlcml0eSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsZXItc2VydmljZSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50V3JhcHBlciB9IGZyb20gJy4uLy4uL2RhdGFiYXNlL2R5bmFtb2RiLWNsaWVudCc7XHJcbmltcG9ydCB7IEFuYWx5c2lzU3RhdHVzIH0gZnJvbSAnLi4vLi4vdHlwZXMvZmlsZS1tZXRhZGF0YSc7XHJcbmltcG9ydCB7IE1pc3JhUnVsZVNldCB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLXJ1bGVzJztcclxuXHJcbmNvbnN0IGJ1Y2tldE5hbWUgPSBwcm9jZXNzLmVudi5GSUxFX1NUT1JBR0VfQlVDS0VUX05BTUUgfHwgJyc7XHJcbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSc7XHJcbmNvbnN0IGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2Rldic7XHJcblxyXG5jb25zdCBhbmFseXNpc1NlcnZpY2UgPSBuZXcgTWlzcmFBbmFseXNpc1NlcnZpY2UoYnVja2V0TmFtZSwgcmVnaW9uKTtcclxuY29uc3QgcmVwb3J0U2VydmljZSA9IG5ldyBWaW9sYXRpb25SZXBvcnRTZXJ2aWNlKCk7XHJcbmNvbnN0IG5vdGlmaWNhdGlvblNlcnZpY2UgPSBuZXcgTm90aWZpY2F0aW9uU2VydmljZShyZWdpb24pO1xyXG5jb25zdCBkYkNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudFdyYXBwZXIoZW52aXJvbm1lbnQpO1xyXG5jb25zdCBtZXRhZGF0YVNlcnZpY2UgPSBuZXcgRmlsZU1ldGFkYXRhU2VydmljZShkYkNsaWVudCk7XHJcbmNvbnN0IHJlc3VsdHNTZXJ2aWNlID0gbmV3IEFuYWx5c2lzUmVzdWx0c1NlcnZpY2UoZGJDbGllbnQpO1xyXG5cclxuaW50ZXJmYWNlIEFuYWx5emVGaWxlRXZlbnQge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICBmaWxlVHlwZTogc3RyaW5nO1xyXG4gIHJ1bGVTZXQ/OiBNaXNyYVJ1bGVTZXQ7XHJcbiAgdXNlcklkPzogc3RyaW5nO1xyXG4gIG9yZ2FuaXphdGlvbklkPzogc3RyaW5nO1xyXG4gIHVzZXJFbWFpbD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFuYWx5emVGaWxlRXZlbnQpID0+IHtcclxuICBjb25zb2xlLmxvZygnQW5hbHlzaXMgZXZlbnQgcmVjZWl2ZWQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgY29uc3QgeyBmaWxlSWQsIGZpbGVOYW1lLCBzM0tleSwgZmlsZVR5cGUsIHJ1bGVTZXQsIHVzZXJJZCwgb3JnYW5pemF0aW9uSWQsIHVzZXJFbWFpbCB9ID0gZXZlbnQ7XHJcblxyXG4gIGlmICghdXNlcklkKSB7XHJcbiAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcigndXNlcklkIGlzIHJlcXVpcmVkIGZvciBhbmFseXNpcycpO1xyXG4gICAgRXJyb3JIYW5kbGVyU2VydmljZS5oYW5kbGVFcnJvcihlcnJvciwgeyBmaWxlSWQsIG9wZXJhdGlvbjogJ2FuYWx5emUtZmlsZScgfSwgRXJyb3JTZXZlcml0eS5ISUdIKTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgc3RhdHVzOiAnRkFJTEVEJyxcclxuICAgICAgZXJyb3I6ICd1c2VySWQgaXMgcmVxdWlyZWQgZm9yIGFuYWx5c2lzJ1xyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIGxldCByZXRyeUNvdW50ID0gMDtcclxuICBjb25zdCBtYXhSZXRyaWVzID0gMztcclxuXHJcbiAgd2hpbGUgKHJldHJ5Q291bnQgPD0gbWF4UmV0cmllcykge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVXBkYXRlIHN0YXR1cyB0byBJTl9QUk9HUkVTUyAodXNlIHNlY29uZHMsIG5vdCBtaWxsaXNlY29uZHMpXHJcbiAgICAgIGF3YWl0IG1ldGFkYXRhU2VydmljZS51cGRhdGVGaWxlTWV0YWRhdGEoZmlsZUlkLCB7XHJcbiAgICAgICAgYW5hbHlzaXNfc3RhdHVzOiBBbmFseXNpc1N0YXR1cy5JTl9QUk9HUkVTUyxcclxuICAgICAgICB1cGRhdGVkX2F0OiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFBlcmZvcm0gTUlTUkEgYW5hbHlzaXNcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgYW5hbHlzaXNTZXJ2aWNlLmFuYWx5emVGaWxlKFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBmaWxlTmFtZSxcclxuICAgICAgICBzM0tleSxcclxuICAgICAgICBmaWxlVHlwZSBhcyBhbnksXHJcbiAgICAgICAgeyBydWxlU2V0IH1cclxuICAgICAgKTtcclxuXHJcbiAgICAgIGlmIChyZXN1bHQuc3VjY2Vzcykge1xyXG4gICAgICAgIC8vIEdlbmVyYXRlIHZpb2xhdGlvbiByZXBvcnRcclxuICAgICAgICBjb25zdCByZXBvcnQgPSByZXBvcnRTZXJ2aWNlLmdlbmVyYXRlUmVwb3J0KHJlc3VsdCwge1xyXG4gICAgICAgICAgaW5jbHVkZVN1bW1hcnk6IHRydWUsXHJcbiAgICAgICAgICBpbmNsdWRlUmVjb21tZW5kYXRpb25zOiB0cnVlLFxyXG4gICAgICAgICAgZ3JvdXBCeVNldmVyaXR5OiB0cnVlLFxyXG4gICAgICAgICAgZ3JvdXBCeVJ1bGU6IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gU3RvcmUgYW5hbHlzaXMgcmVzdWx0cyBpbiBEeW5hbW9EQlxyXG4gICAgICAgIGNvbnN0IHN0b3JlZFJlc3VsdCA9IGF3YWl0IHJlc3VsdHNTZXJ2aWNlLnN0b3JlQW5hbHlzaXNSZXN1bHQoXHJcbiAgICAgICAgICByZXN1bHQsXHJcbiAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIFVwZGF0ZSBtZXRhZGF0YSB3aXRoIHJlc3VsdHMgKHVzZSBzZWNvbmRzLCBub3QgbWlsbGlzZWNvbmRzKVxyXG4gICAgICAgIGF3YWl0IG1ldGFkYXRhU2VydmljZS51cGRhdGVGaWxlTWV0YWRhdGEoZmlsZUlkLCB7XHJcbiAgICAgICAgICBhbmFseXNpc19zdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkNPTVBMRVRFRCxcclxuICAgICAgICAgIGFuYWx5c2lzX3Jlc3VsdHM6IHtcclxuICAgICAgICAgICAgdmlvbGF0aW9uc19jb3VudDogcmVzdWx0LnZpb2xhdGlvbnNDb3VudCxcclxuICAgICAgICAgICAgcnVsZXNfY2hlY2tlZDogcmVzdWx0LnJ1bGVzQ2hlY2tlZCxcclxuICAgICAgICAgICAgY29tcGxldGlvbl90aW1lc3RhbXA6IHJlc3VsdC5hbmFseXNpc1RpbWVzdGFtcFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHVwZGF0ZWRfYXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBBbmFseXNpcyBjb21wbGV0ZWQgZm9yICR7ZmlsZUlkfTogJHtyZXN1bHQudmlvbGF0aW9uc0NvdW50fSB2aW9sYXRpb25zIGZvdW5kYCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFJlcG9ydCBnZW5lcmF0ZWQgd2l0aCAke3JlcG9ydC5yZWNvbW1lbmRhdGlvbnMubGVuZ3RofSByZWNvbW1lbmRhdGlvbnNgKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgUmVzdWx0cyBzdG9yZWQgd2l0aCBJRDogJHtzdG9yZWRSZXN1bHQuYW5hbHlzaXNJZH1gKTtcclxuXHJcbiAgICAgICAgLy8gU2VuZCBzdWNjZXNzIG5vdGlmaWNhdGlvblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLm5vdGlmeUFuYWx5c2lzQ29tcGxldGUoXHJcbiAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgICBmaWxlTmFtZSxcclxuICAgICAgICAgICAgcmVzdWx0LnZpb2xhdGlvbnNDb3VudCxcclxuICAgICAgICAgICAgdXNlckVtYWlsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0gY2F0Y2ggKG5vdGlmRXJyb3IpIHtcclxuICAgICAgICAgIC8vIExvZyBub3RpZmljYXRpb24gZXJyb3IgYnV0IGRvbid0IGZhaWwgdGhlIGFuYWx5c2lzXHJcbiAgICAgICAgICBFcnJvckhhbmRsZXJTZXJ2aWNlLmhhbmRsZUVycm9yKFxyXG4gICAgICAgICAgICBub3RpZkVycm9yIGFzIEVycm9yLFxyXG4gICAgICAgICAgICB7IHVzZXJJZCwgZmlsZUlkLCBvcGVyYXRpb246ICdzZW5kLW5vdGlmaWNhdGlvbicgfSxcclxuICAgICAgICAgICAgRXJyb3JTZXZlcml0eS5MT1dcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgICAgc3RhdHVzOiAnQ09NUExFVEVEJyxcclxuICAgICAgICAgIGZpbGVJZCxcclxuICAgICAgICAgIGFuYWx5c2lzSWQ6IHN0b3JlZFJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICAgICAgcmVzdWx0czoge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zX2NvdW50OiByZXN1bHQudmlvbGF0aW9uc0NvdW50LFxyXG4gICAgICAgICAgICBydWxlc19jaGVja2VkOiByZXN1bHQucnVsZXNDaGVja2VkLFxyXG4gICAgICAgICAgICBjb21wbGV0aW9uX3RpbWVzdGFtcDogcmVzdWx0LmFuYWx5c2lzVGltZXN0YW1wXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdmlvbGF0aW9uczogcmVzdWx0LnZpb2xhdGlvbnMsXHJcbiAgICAgICAgICByZXBvcnQ6IHtcclxuICAgICAgICAgICAgc3VtbWFyeTogcmVwb3J0LnN1bW1hcnksXHJcbiAgICAgICAgICAgIHJlY29tbWVuZGF0aW9uczogcmVwb3J0LnJlY29tbWVuZGF0aW9ucyxcclxuICAgICAgICAgICAgdmlvbGF0aW9uc0J5UnVsZTogcmVwb3J0LnZpb2xhdGlvbnNCeVJ1bGUubWFwKHIgPT4gKHtcclxuICAgICAgICAgICAgICBydWxlSWQ6IHIucnVsZUlkLFxyXG4gICAgICAgICAgICAgIHJ1bGVUaXRsZTogci5ydWxlVGl0bGUsXHJcbiAgICAgICAgICAgICAgY291bnQ6IHIuY291bnRcclxuICAgICAgICAgICAgfSkpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyBTdG9yZSBmYWlsZWQgYW5hbHlzaXMgcmVzdWx0XHJcbiAgICAgICAgYXdhaXQgcmVzdWx0c1NlcnZpY2Uuc3RvcmVBbmFseXNpc1Jlc3VsdChyZXN1bHQsIHVzZXJJZCwgb3JnYW5pemF0aW9uSWQpO1xyXG5cclxuICAgICAgICAvLyBVcGRhdGUgc3RhdHVzIHRvIEZBSUxFRCAodXNlIHNlY29uZHMsIG5vdCBtaWxsaXNlY29uZHMpXHJcbiAgICAgICAgYXdhaXQgbWV0YWRhdGFTZXJ2aWNlLnVwZGF0ZUZpbGVNZXRhZGF0YShmaWxlSWQsIHtcclxuICAgICAgICAgIGFuYWx5c2lzX3N0YXR1czogQW5hbHlzaXNTdGF0dXMuRkFJTEVELFxyXG4gICAgICAgICAgYW5hbHlzaXNfcmVzdWx0czoge1xyXG4gICAgICAgICAgICB2aW9sYXRpb25zX2NvdW50OiAwLFxyXG4gICAgICAgICAgICBydWxlc19jaGVja2VkOiBbXSxcclxuICAgICAgICAgICAgY29tcGxldGlvbl90aW1lc3RhbXA6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICAgICAgICBlcnJvcl9tZXNzYWdlOiByZXN1bHQuZXJyb3JNZXNzYWdlXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdXBkYXRlZF9hdDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gTG9nIGVycm9yXHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IocmVzdWx0LmVycm9yTWVzc2FnZSB8fCAnQW5hbHlzaXMgZmFpbGVkJyk7XHJcbiAgICAgICAgRXJyb3JIYW5kbGVyU2VydmljZS5oYW5kbGVFcnJvcihcclxuICAgICAgICAgIGVycm9yLFxyXG4gICAgICAgICAgeyB1c2VySWQsIGZpbGVJZCwgZmlsZU5hbWUsIG9wZXJhdGlvbjogJ21pc3JhLWFuYWx5c2lzJyB9LFxyXG4gICAgICAgICAgRXJyb3JTZXZlcml0eS5ISUdIXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgLy8gU2VuZCBmYWlsdXJlIG5vdGlmaWNhdGlvblxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLm5vdGlmeUFuYWx5c2lzRmFpbHVyZShcclxuICAgICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgICAgICByZXN1bHQuZXJyb3JNZXNzYWdlIHx8ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICAgICAgdXNlckVtYWlsXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH0gY2F0Y2ggKG5vdGlmRXJyb3IpIHtcclxuICAgICAgICAgIEVycm9ySGFuZGxlclNlcnZpY2UuaGFuZGxlRXJyb3IoXHJcbiAgICAgICAgICAgIG5vdGlmRXJyb3IgYXMgRXJyb3IsXHJcbiAgICAgICAgICAgIHsgdXNlcklkLCBmaWxlSWQsIG9wZXJhdGlvbjogJ3NlbmQtbm90aWZpY2F0aW9uJyB9LFxyXG4gICAgICAgICAgICBFcnJvclNldmVyaXR5LkxPV1xyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEFuYWx5c2lzIGZhaWxlZCBmb3IgJHtmaWxlSWR9OmAsIHJlc3VsdC5lcnJvck1lc3NhZ2UpO1xyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgICAgc3RhdHVzOiAnRkFJTEVEJyxcclxuICAgICAgICAgIGZpbGVJZCxcclxuICAgICAgICAgIGFuYWx5c2lzSWQ6IGZpbGVJZCxcclxuICAgICAgICAgIGVycm9yOiByZXN1bHQuZXJyb3JNZXNzYWdlXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgZHVyaW5nIGFuYWx5c2lzIChhdHRlbXB0ICR7cmV0cnlDb3VudCArIDF9LyR7bWF4UmV0cmllcyArIDF9KTpgLCBlcnJvcik7XHJcblxyXG4gICAgICAvLyBEZXRlcm1pbmUgaWYgd2Ugc2hvdWxkIHJldHJ5XHJcbiAgICAgIGNvbnN0IHJldHJ5U3RyYXRlZ3kgPSBFcnJvckhhbmRsZXJTZXJ2aWNlLmdldFJldHJ5U3RyYXRlZ3koZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgICBcclxuICAgICAgaWYgKHJldHJ5U3RyYXRlZ3kuc2hvdWxkUmV0cnkgJiYgcmV0cnlDb3VudCA8IG1heFJldHJpZXMpIHtcclxuICAgICAgICByZXRyeUNvdW50Kys7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFJldHJ5aW5nIGFuYWx5c2lzIGFmdGVyICR7cmV0cnlTdHJhdGVneS5yZXRyeUFmdGVyfW1zLi4uYCk7XHJcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIHJldHJ5U3RyYXRlZ3kucmV0cnlBZnRlcikpO1xyXG4gICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBNYXggcmV0cmllcyBleGNlZWRlZCBvciBub24tcmV0cnlhYmxlIGVycm9yXHJcbiAgICAgIGNvbnN0IGVycm9yTG9nID0gRXJyb3JIYW5kbGVyU2VydmljZS5oYW5kbGVFcnJvcihcclxuICAgICAgICBlcnJvciBhcyBFcnJvcixcclxuICAgICAgICB7IHVzZXJJZCwgZmlsZUlkLCBmaWxlTmFtZSwgb3BlcmF0aW9uOiAnYW5hbHl6ZS1maWxlJywgcmV0cnlDb3VudCB9LFxyXG4gICAgICAgIEVycm9yU2V2ZXJpdHkuQ1JJVElDQUxcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBzdGF0dXMgdG8gRkFJTEVEICh1c2Ugc2Vjb25kcywgbm90IG1pbGxpc2Vjb25kcylcclxuICAgICAgdHJ5IHtcclxuICAgICAgICBhd2FpdCBtZXRhZGF0YVNlcnZpY2UudXBkYXRlRmlsZU1ldGFkYXRhKGZpbGVJZCwge1xyXG4gICAgICAgICAgYW5hbHlzaXNfc3RhdHVzOiBBbmFseXNpc1N0YXR1cy5GQUlMRUQsXHJcbiAgICAgICAgICBhbmFseXNpc19yZXN1bHRzOiB7XHJcbiAgICAgICAgICAgIHZpb2xhdGlvbnNfY291bnQ6IDAsXHJcbiAgICAgICAgICAgIHJ1bGVzX2NoZWNrZWQ6IFtdLFxyXG4gICAgICAgICAgICBjb21wbGV0aW9uX3RpbWVzdGFtcDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCksXHJcbiAgICAgICAgICAgIGVycm9yX21lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdXBkYXRlZF9hdDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gU2VuZCBmYWlsdXJlIG5vdGlmaWNhdGlvblxyXG4gICAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5QW5hbHlzaXNGYWlsdXJlKFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgZmlsZU5hbWUsXHJcbiAgICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICAgIHVzZXJFbWFpbFxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIE5vdGlmeSBzeXN0ZW0gYWRtaW5zIG9mIGNyaXRpY2FsIGVycm9yXHJcbiAgICAgICAgaWYgKEVycm9ySGFuZGxlclNlcnZpY2Uuc2hvdWxkTm90aWZ5VXNlcihlcnJvciBhcyBFcnJvciwgRXJyb3JTZXZlcml0eS5DUklUSUNBTCkpIHtcclxuICAgICAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5U3lzdGVtRXJyb3IoXHJcbiAgICAgICAgICAgIGVycm9yTG9nLmVycm9ySWQsXHJcbiAgICAgICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgICAgICB7IHVzZXJJZCwgZmlsZUlkLCBmaWxlTmFtZSwgcmV0cnlDb3VudCB9XHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAodXBkYXRlRXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIG1ldGFkYXRhIG9yIHNlbmQgbm90aWZpY2F0aW9uczonLCB1cGRhdGVFcnJvcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICAgIHN0YXR1czogJ0ZBSUxFRCcsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGFuYWx5c2lzSWQ6IGZpbGVJZCxcclxuICAgICAgICBlcnJvcklkOiBlcnJvckxvZy5lcnJvcklkLFxyXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gU2hvdWxkIG5ldmVyIHJlYWNoIGhlcmUsIGJ1dCBqdXN0IGluIGNhc2VcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgc3RhdHVzOiAnRkFJTEVEJyxcclxuICAgIGZpbGVJZCxcclxuICAgIGVycm9yOiAnTWF4IHJldHJpZXMgZXhjZWVkZWQnXHJcbiAgfTtcclxufTtcclxuIl19