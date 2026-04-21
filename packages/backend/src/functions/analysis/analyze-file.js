"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const analysis_engine_1 = require("../../services/misra-analysis/analysis-engine");
const cost_tracker_1 = require("../../services/misra-analysis/cost-tracker");
const centralized_error_handler_1 = require("../../services/error-handling/centralized-error-handler");
const enhanced_retry_1 = require("../../services/error-handling/enhanced-retry");
const centralized_logger_1 = require("../../utils/centralized-logger");
const monitoring_service_1 = require("../../services/monitoring-service");
const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || '';
const region = process.env.AWS_REGION || 'us-east-1';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata-dev';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev';
const s3Client = new client_s3_1.S3Client({ region });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region });
const analysisEngine = new analysis_engine_1.MISRAAnalysisEngine();
const costTracker = new cost_tracker_1.CostTracker(dynamoClient);
/**
 * Lambda handler for MISRA file analysis with enhanced error handling and monitoring
 * Processes SQS messages containing analysis requests
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5, 8.1, 8.2
 * Task 8.2: Enhanced with centralized logging and correlation IDs
 */
async function analyzeFileHandler(event, context) {
    const logger = centralized_logger_1.CentralizedLogger.getInstance({
        functionName: context.functionName,
        requestId: context.awsRequestId,
    });
    logger.info('Analysis Lambda invoked', {
        messageCount: event.Records.length,
        remainingTime: context.getRemainingTimeInMillis()
    });
    // Process each SQS message with enhanced error handling
    for (const record of event.Records) {
        const startTime = Date.now();
        let analysisId;
        let fileId;
        try {
            const result = await centralized_error_handler_1.centralizedErrorHandler.executeWithErrorHandling(() => processAnalysisMessage(record, context, logger), 'analysis-service', {
                operation: 'process-analysis-message',
                resource: record.messageId
            });
            // Extract analysis details for monitoring
            if (result && typeof result === 'object') {
                analysisId = result.analysisId;
                fileId = result.fileId;
            }
            const duration = Date.now() - startTime;
            // Record successful analysis metrics
            await monitoring_service_1.monitoringService.recordAnalysisMetrics(analysisId || 'unknown', fileId || 'unknown', result?.complianceScore || 0, result?.violationCount || 0, duration, true);
            centralized_logger_1.LoggingUtils.logAnalysisOperation(logger, 'completed', analysisId || 'unknown', fileId, duration);
        }
        catch (error) {
            const duration = Date.now() - startTime;
            // Record failed analysis metrics
            if (analysisId && fileId) {
                await monitoring_service_1.monitoringService.recordAnalysisMetrics(analysisId, fileId, 0, 0, duration, false);
            }
            centralized_logger_1.LoggingUtils.logErrorWithContext(logger, error, 'process-analysis-message', {
                messageId: record.messageId,
                fileId,
                analysisId,
                duration,
            });
            // Let SQS handle retry/DLQ
            throw error;
        }
    }
    logger.info('All messages processed successfully');
}
/**
 * Process a single analysis message from SQS with enhanced error handling and monitoring
 */
async function processAnalysisMessage(record, context, logger) {
    let message;
    try {
        // Parse SQS message with validation
        const parsed = JSON.parse(record.body);
        if (!parsed.fileId || !parsed.s3Key || !parsed.language || !parsed.userId) {
            throw new Error('Invalid SQS message: missing required fields');
        }
        message = parsed;
        // Set user context for logging
        logger.setUserId(message.userId);
        logger.info('Processing analysis message', {
            fileId: message.fileId,
            fileName: message.fileName,
            language: message.language,
            userId: message.userId
        });
        centralized_logger_1.LoggingUtils.logAnalysisOperation(logger, 'started', 'pending', message.fileId);
    }
    catch (error) {
        centralized_logger_1.LoggingUtils.logErrorWithContext(logger, error, 'parse-sqs-message', {
            messageBody: record.body,
            messageId: record.messageId
        });
        throw new Error('Invalid SQS message format');
    }
    const { fileId, s3Key, language, userId, organizationId } = message;
    const startTime = Date.now();
    let fileSize = 0;
    let analysisId = '';
    try {
        // Update file metadata status to IN_PROGRESS (Requirement 6.2)
        logger.info('Updating file status to IN_PROGRESS', { fileId });
        await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => updateFileMetadataStatus(fileId, 'in_progress'), { maxAttempts: 3, initialDelayMs: 500 });
        // Check remaining time before starting analysis
        const remainingTime = context.getRemainingTimeInMillis();
        logger.debug('Lambda execution time check', { remainingTime });
        // Reserve 30 seconds for cleanup and result saving
        const timeoutBuffer = 30000;
        if (remainingTime < timeoutBuffer + 60000) {
            throw new Error(`Insufficient time remaining: ${remainingTime}ms`);
        }
        // Download file from S3 with retry (Requirement 6.3, 8.1)
        logger.info('Downloading file from S3', { s3Key });
        const downloadStartTime = Date.now();
        const fileContent = await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => downloadFileFromS3(s3Key), {
            maxAttempts: 3,
            initialDelayMs: 1000,
            retryableErrors: ['timeout', 'ETIMEDOUT', 'ECONNRESET', 'NetworkError', 'ServiceUnavailable']
        });
        fileSize = fileContent.length;
        const downloadDuration = Date.now() - downloadStartTime;
        logger.info('File downloaded successfully', { fileSize, downloadDuration });
        centralized_logger_1.LoggingUtils.logFileOperation(logger, 'downloaded', fileId, message.fileName, fileSize);
        // Record S3 operation metrics
        await monitoring_service_1.monitoringService.monitorS3Operation(bucketName, 'GetObject', true, downloadDuration, fileSize);
        // Invoke MISRA Analysis Engine with progress tracking (Requirement 6.4, 3.3, 8.1)
        logger.info('Starting MISRA analysis', { language, fileId });
        // Create progress callback to update DynamoDB every 2 seconds
        const progressCallback = async (progress, message) => {
            try {
                await updateAnalysisProgress(fileId, progress, message);
                logger.debug('Progress updated', { fileId, progress, message });
            }
            catch (error) {
                logger.warn('Failed to update progress', { fileId, progress, error: error.message });
                // Don't throw - progress updates are non-critical
            }
        };
        const analysisResult = await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => analysisEngine.analyzeFile(fileContent, language, fileId, userId, { progressCallback, updateInterval: 2000 } // 2-second updates (Requirement 3.3)
        ), {
            maxAttempts: 2, // Limited retries for analysis
            initialDelayMs: 2000,
            retryableErrors: ['timeout', 'ANALYSIS_TIMEOUT', 'SERVICE_UNAVAILABLE']
        });
        const duration = Date.now() - startTime;
        logger.info('Analysis completed successfully', {
            fileId,
            duration,
            violationsCount: analysisResult.violations.length,
            complianceScore: analysisResult.summary.compliancePercentage
        });
        // Store results in DynamoDB with retry (Requirement 6.5, 8.1)
        logger.info('Storing analysis results', { analysisId: analysisResult.analysisId });
        await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => storeAnalysisResults(analysisResult, organizationId), { maxAttempts: 3, initialDelayMs: 1000 });
        // Track analysis costs (Requirement 14.1)
        console.log(`Tracking analysis costs`);
        const costs = costTracker.calculateCosts(duration, fileSize, 2);
        await costTracker.recordCost(userId, organizationId || 'default', analysisResult.analysisId, fileId, costs, {
            fileSize,
            duration,
        });
        console.log(`Cost tracking completed: $${costs.totalCost.toFixed(6)}`);
        // Update file metadata status to COMPLETED
        console.log(`Updating file ${fileId} status to COMPLETED`);
        await updateFileMetadataStatus(fileId, 'completed', {
            violations_count: analysisResult.violations.length,
            compliance_percentage: analysisResult.summary.compliancePercentage,
            analysis_duration: duration,
        });
        console.log(`Analysis completed successfully for file ${fileId}`);
        return {
            analysisId: analysisResult.analysisId,
            fileId,
            complianceScore: analysisResult.summary.compliancePercentage,
            violationCount: analysisResult.violations.length,
        };
    }
    catch (error) {
        console.error(`Error during analysis for file ${fileId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Update file metadata status to FAILED (Requirement 11.1, 11.2, 11.3, 11.4)
        try {
            await updateFileMetadataStatus(fileId, 'failed', {
                error_message: errorMessage,
                error_timestamp: Date.now(),
            });
        }
        catch (updateError) {
            console.error('Failed to update file metadata status:', updateError);
        }
        // Re-throw to trigger SQS retry/DLQ
        throw error;
    }
}
/**
 * Download file content from S3
 */
async function downloadFileFromS3(s3Key) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
        });
        const response = await s3Client.send(command);
        if (!response.Body) {
            throw new Error('Empty response body from S3');
        }
        // Convert stream to string
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return buffer.toString('utf-8');
    }
    catch (error) {
        console.error('Error downloading file from S3:', error);
        throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Store analysis results in DynamoDB
 */
async function storeAnalysisResults(result, organizationId) {
    try {
        const item = {
            analysisId: result.analysisId,
            fileId: result.fileId,
            userId: result.userId,
            organizationId: organizationId || 'default',
            language: result.language,
            violations: result.violations,
            summary: result.summary,
            status: result.status,
            createdAt: result.createdAt,
            timestamp: Date.now(),
        };
        const command = new client_dynamodb_1.PutItemCommand({
            TableName: analysisResultsTable,
            Item: (0, util_dynamodb_1.marshall)(item),
        });
        await dynamoClient.send(command);
        console.log(`Analysis results stored with ID: ${result.analysisId}`);
    }
    catch (error) {
        console.error('Error storing analysis results:', error);
        throw new Error(`Failed to store analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Update file metadata status in DynamoDB
 */
async function updateFileMetadataStatus(fileId, status, additionalData) {
    try {
        const updateExpression = ['SET analysis_status = :status', 'updated_at = :updatedAt'];
        const expressionAttributeValues = {
            ':status': { S: status },
            ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
        };
        if (additionalData) {
            if (additionalData.violations_count !== undefined) {
                updateExpression.push('violations_count = :violationsCount');
                expressionAttributeValues[':violationsCount'] = { N: additionalData.violations_count.toString() };
            }
            if (additionalData.compliance_percentage !== undefined) {
                updateExpression.push('compliance_percentage = :compliancePercentage');
                expressionAttributeValues[':compliancePercentage'] = { N: additionalData.compliance_percentage.toString() };
            }
            if (additionalData.analysis_duration !== undefined) {
                updateExpression.push('analysis_duration = :analysisDuration');
                expressionAttributeValues[':analysisDuration'] = { N: additionalData.analysis_duration.toString() };
            }
            if (additionalData.error_message) {
                updateExpression.push('error_message = :errorMessage');
                expressionAttributeValues[':errorMessage'] = { S: additionalData.error_message };
            }
            if (additionalData.error_timestamp) {
                updateExpression.push('error_timestamp = :errorTimestamp');
                expressionAttributeValues[':errorTimestamp'] = { N: additionalData.error_timestamp.toString() };
            }
        }
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
            UpdateExpression: updateExpression.join(', '),
            ExpressionAttributeValues: expressionAttributeValues,
        });
        await dynamoClient.send(command);
        console.log(`File metadata updated for ${fileId}: status=${status}`);
    }
    catch (error) {
        console.error('Error updating file metadata:', error);
        throw new Error(`Failed to update file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Update analysis progress in DynamoDB
 * Requirements: 3.3 (2-second progress updates)
 */
async function updateAnalysisProgress(fileId, progress, message) {
    try {
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
            UpdateExpression: 'SET analysis_progress = :progress, analysis_message = :message, updated_at = :updatedAt',
            ExpressionAttributeValues: {
                ':progress': { N: progress.toString() },
                ':message': { S: message },
                ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
            },
        });
        await dynamoClient.send(command);
    }
    catch (error) {
        console.error('Error updating analysis progress:', error);
        // Don't throw - progress updates are non-critical
    }
}
// Export the handler with correlation ID middleware
exports.handler = (0, centralized_logger_1.withCorrelationId)(analyzeFileHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBNkY7QUFDN0YsMERBQWtEO0FBQ2xELG1GQUFvRjtBQUVwRiw2RUFBeUU7QUFDekUsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRix1RUFBb0c7QUFDcEcsMEVBQXNFO0FBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDO0FBQzlELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksa0JBQWtCLENBQUM7QUFDaEYsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLHFCQUFxQixDQUFDO0FBRXpGLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDMUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNwRCxNQUFNLGNBQWMsR0FBRyxJQUFJLHFDQUFtQixFQUFFLENBQUM7QUFDakQsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBV2xEOzs7Ozs7R0FNRztBQUNILEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxLQUFlLEVBQUUsT0FBZ0I7SUFDakUsTUFBTSxNQUFNLEdBQUcsc0NBQWlCLENBQUMsV0FBVyxDQUFDO1FBQzNDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtRQUNsQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFlBQVk7S0FDaEMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLElB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LElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLElBQUksbUNBQWlCLENBQUM7WUFDcEMsU0FBUyxFQUFFLGlCQUFpQjtZQUM1QixHQUFHLEVBQUUsSUFBQSx3QkFBUSxFQUFDLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDO1lBQ2xDLGdCQUFnQixFQUFFLHlGQUF5RjtZQUMzRyx5QkFBeUIsRUFBRTtnQkFDekIsV0FBVyxFQUFFLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDdkMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRTtnQkFDMUIsWUFBWSxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO2FBQzlEO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxRCxrREFBa0Q7SUFDcEQsQ0FBQztBQUNILENBQUM7QUFDRCxvREFBb0Q7QUFDdkMsUUFBQSxPQUFPLEdBQUcsSUFBQSxzQ0FBaUIsRUFBQyxrQkFBa0IsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU1FTRXZlbnQsIFNRU1JlY29yZCwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTM0NsaWVudCwgR2V0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBQdXRJdGVtQ29tbWFuZCwgVXBkYXRlSXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBNSVNSQUFuYWx5c2lzRW5naW5lIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvYW5hbHlzaXMtZW5naW5lJztcclxuaW1wb3J0IHsgTGFuZ3VhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvY29zdC10cmFja2VyJztcclxuaW1wb3J0IHsgY2VudHJhbGl6ZWRFcnJvckhhbmRsZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9jZW50cmFsaXplZC1lcnJvci1oYW5kbGVyJztcclxuaW1wb3J0IHsgZW5oYW5jZWRSZXRyeVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9lbmhhbmNlZC1yZXRyeSc7XHJcbmltcG9ydCB7IENlbnRyYWxpemVkTG9nZ2VyLCB3aXRoQ29ycmVsYXRpb25JZCwgTG9nZ2luZ1V0aWxzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY2VudHJhbGl6ZWQtbG9nZ2VyJztcclxuaW1wb3J0IHsgbW9uaXRvcmluZ1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9tb25pdG9yaW5nLXNlcnZpY2UnO1xyXG5cclxuY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSB8fCAnJztcclxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJztcclxuY29uc3QgZmlsZU1ldGFkYXRhVGFibGUgPSBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFIHx8ICdGaWxlTWV0YWRhdGEtZGV2JztcclxuY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFIHx8ICdBbmFseXNpc1Jlc3VsdHMtZGV2JztcclxuXHJcbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XHJcbmNvbnN0IGFuYWx5c2lzRW5naW5lID0gbmV3IE1JU1JBQW5hbHlzaXNFbmdpbmUoKTtcclxuY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIoZHluYW1vQ2xpZW50KTtcclxuXHJcbmludGVyZmFjZSBBbmFseXNpc01lc3NhZ2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICBsYW5ndWFnZTogTGFuZ3VhZ2U7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgaGFuZGxlciBmb3IgTUlTUkEgZmlsZSBhbmFseXNpcyB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nIGFuZCBtb25pdG9yaW5nXHJcbiAqIFByb2Nlc3NlcyBTUVMgbWVzc2FnZXMgY29udGFpbmluZyBhbmFseXNpcyByZXF1ZXN0c1xyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiA2LjIsIDYuMywgNi40LCA2LjUsIDguMSwgOC4yXHJcbiAqIFRhc2sgOC4yOiBFbmhhbmNlZCB3aXRoIGNlbnRyYWxpemVkIGxvZ2dpbmcgYW5kIGNvcnJlbGF0aW9uIElEc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZUZpbGVIYW5kbGVyKGV2ZW50OiBTUVNFdmVudCwgY29udGV4dDogQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGxvZ2dlciA9IENlbnRyYWxpemVkTG9nZ2VyLmdldEluc3RhbmNlKHtcclxuICAgIGZ1bmN0aW9uTmFtZTogY29udGV4dC5mdW5jdGlvbk5hbWUsXHJcbiAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gIH0pO1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdBbmFseXNpcyBMYW1iZGEgaW52b2tlZCcsIHtcclxuICAgIG1lc3NhZ2VDb3VudDogZXZlbnQuUmVjb3Jkcy5sZW5ndGgsXHJcbiAgICByZW1haW5pbmdUaW1lOiBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpXHJcbiAgfSk7XHJcblxyXG4gIC8vIFByb2Nlc3MgZWFjaCBTUVMgbWVzc2FnZSB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXHJcbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGxldCBhbmFseXNpc0lkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgICBsZXQgZmlsZUlkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNlbnRyYWxpemVkRXJyb3JIYW5kbGVyLmV4ZWN1dGVXaXRoRXJyb3JIYW5kbGluZyhcclxuICAgICAgICAoKSA9PiBwcm9jZXNzQW5hbHlzaXNNZXNzYWdlKHJlY29yZCwgY29udGV4dCwgbG9nZ2VyKSxcclxuICAgICAgICAnYW5hbHlzaXMtc2VydmljZScsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgb3BlcmF0aW9uOiAncHJvY2Vzcy1hbmFseXNpcy1tZXNzYWdlJyxcclxuICAgICAgICAgIHJlc291cmNlOiByZWNvcmQubWVzc2FnZUlkXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCBhbmFseXNpcyBkZXRhaWxzIGZvciBtb25pdG9yaW5nXHJcbiAgICAgIGlmIChyZXN1bHQgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBhbmFseXNpc0lkID0gKHJlc3VsdCBhcyBhbnkpLmFuYWx5c2lzSWQ7XHJcbiAgICAgICAgZmlsZUlkID0gKHJlc3VsdCBhcyBhbnkpLmZpbGVJZDtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVjb3JkIHN1Y2Nlc3NmdWwgYW5hbHlzaXMgbWV0cmljc1xyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5yZWNvcmRBbmFseXNpc01ldHJpY3MoXHJcbiAgICAgICAgYW5hbHlzaXNJZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgZmlsZUlkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAocmVzdWx0IGFzIGFueSk/LmNvbXBsaWFuY2VTY29yZSB8fCAwLFxyXG4gICAgICAgIChyZXN1bHQgYXMgYW55KT8udmlvbGF0aW9uQ291bnQgfHwgMCxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICB0cnVlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBMb2dnaW5nVXRpbHMubG9nQW5hbHlzaXNPcGVyYXRpb24obG9nZ2VyLCAnY29tcGxldGVkJywgYW5hbHlzaXNJZCB8fCAndW5rbm93bicsIGZpbGVJZCwgZHVyYXRpb24pO1xyXG4gICAgICBcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgXHJcbiAgICAgIC8vIFJlY29yZCBmYWlsZWQgYW5hbHlzaXMgbWV0cmljc1xyXG4gICAgICBpZiAoYW5hbHlzaXNJZCAmJiBmaWxlSWQpIHtcclxuICAgICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5yZWNvcmRBbmFseXNpc01ldHJpY3MoXHJcbiAgICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgMCxcclxuICAgICAgICAgIDAsXHJcbiAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICAgIGZhbHNlXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgTG9nZ2luZ1V0aWxzLmxvZ0Vycm9yV2l0aENvbnRleHQobG9nZ2VyLCBlcnJvciBhcyBFcnJvciwgJ3Byb2Nlc3MtYW5hbHlzaXMtbWVzc2FnZScsIHtcclxuICAgICAgICBtZXNzYWdlSWQ6IHJlY29yZC5tZXNzYWdlSWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgLy8gTGV0IFNRUyBoYW5kbGUgcmV0cnkvRExRXHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbG9nZ2VyLmluZm8oJ0FsbCBtZXNzYWdlcyBwcm9jZXNzZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIGEgc2luZ2xlIGFuYWx5c2lzIG1lc3NhZ2UgZnJvbSBTUVMgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZyBhbmQgbW9uaXRvcmluZ1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0FuYWx5c2lzTWVzc2FnZShcclxuICByZWNvcmQ6IFNRU1JlY29yZCxcclxuICBjb250ZXh0OiBDb250ZXh0LFxyXG4gIGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXJcclxuKTogUHJvbWlzZTx7IGFuYWx5c2lzSWQ6IHN0cmluZzsgZmlsZUlkOiBzdHJpbmc7IGNvbXBsaWFuY2VTY29yZTogbnVtYmVyOyB2aW9sYXRpb25Db3VudDogbnVtYmVyIH0+IHtcclxuICBsZXQgbWVzc2FnZTogQW5hbHlzaXNNZXNzYWdlO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSBTUVMgbWVzc2FnZSB3aXRoIHZhbGlkYXRpb25cclxuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVjb3JkLmJvZHkpIGFzIEFuYWx5c2lzTWVzc2FnZTtcclxuICAgIGlmICghcGFyc2VkLmZpbGVJZCB8fCAhcGFyc2VkLnMzS2V5IHx8ICFwYXJzZWQubGFuZ3VhZ2UgfHwgIXBhcnNlZC51c2VySWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNRUyBtZXNzYWdlOiBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcycpO1xyXG4gICAgfVxyXG4gICAgbWVzc2FnZSA9IHBhcnNlZDtcclxuICAgIFxyXG4gICAgLy8gU2V0IHVzZXIgY29udGV4dCBmb3IgbG9nZ2luZ1xyXG4gICAgbG9nZ2VyLnNldFVzZXJJZChtZXNzYWdlLnVzZXJJZCk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIGFuYWx5c2lzIG1lc3NhZ2UnLCB7XHJcbiAgICAgIGZpbGVJZDogbWVzc2FnZS5maWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiBtZXNzYWdlLmZpbGVOYW1lLFxyXG4gICAgICBsYW5ndWFnZTogbWVzc2FnZS5sYW5ndWFnZSxcclxuICAgICAgdXNlcklkOiBtZXNzYWdlLnVzZXJJZFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIExvZ2dpbmdVdGlscy5sb2dBbmFseXNpc09wZXJhdGlvbihsb2dnZXIsICdzdGFydGVkJywgJ3BlbmRpbmcnLCBtZXNzYWdlLmZpbGVJZCk7XHJcbiAgICBcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgTG9nZ2luZ1V0aWxzLmxvZ0Vycm9yV2l0aENvbnRleHQobG9nZ2VyLCBlcnJvciBhcyBFcnJvciwgJ3BhcnNlLXNxcy1tZXNzYWdlJywge1xyXG4gICAgICBtZXNzYWdlQm9keTogcmVjb3JkLmJvZHksXHJcbiAgICAgIG1lc3NhZ2VJZDogcmVjb3JkLm1lc3NhZ2VJZFxyXG4gICAgfSk7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgU1FTIG1lc3NhZ2UgZm9ybWF0Jyk7XHJcbiAgfVxyXG5cclxuICBjb25zdCB7IGZpbGVJZCwgczNLZXksIGxhbmd1YWdlLCB1c2VySWQsIG9yZ2FuaXphdGlvbklkIH0gPSBtZXNzYWdlO1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgbGV0IGZpbGVTaXplID0gMDtcclxuICBsZXQgYW5hbHlzaXNJZCA9ICcnO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gVXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzIHRvIElOX1BST0dSRVNTIChSZXF1aXJlbWVudCA2LjIpXHJcbiAgICBsb2dnZXIuaW5mbygnVXBkYXRpbmcgZmlsZSBzdGF0dXMgdG8gSU5fUFJPR1JFU1MnLCB7IGZpbGVJZCB9KTtcclxuICAgIGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdpbl9wcm9ncmVzcycpLFxyXG4gICAgICB7IG1heEF0dGVtcHRzOiAzLCBpbml0aWFsRGVsYXlNczogNTAwIH1cclxuICAgICk7XHJcblxyXG4gICAgLy8gQ2hlY2sgcmVtYWluaW5nIHRpbWUgYmVmb3JlIHN0YXJ0aW5nIGFuYWx5c2lzXHJcbiAgICBjb25zdCByZW1haW5pbmdUaW1lID0gY29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMoKTtcclxuICAgIGxvZ2dlci5kZWJ1ZygnTGFtYmRhIGV4ZWN1dGlvbiB0aW1lIGNoZWNrJywgeyByZW1haW5pbmdUaW1lIH0pO1xyXG5cclxuICAgIC8vIFJlc2VydmUgMzAgc2Vjb25kcyBmb3IgY2xlYW51cCBhbmQgcmVzdWx0IHNhdmluZ1xyXG4gICAgY29uc3QgdGltZW91dEJ1ZmZlciA9IDMwMDAwO1xyXG4gICAgaWYgKHJlbWFpbmluZ1RpbWUgPCB0aW1lb3V0QnVmZmVyICsgNjAwMDApIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnN1ZmZpY2llbnQgdGltZSByZW1haW5pbmc6ICR7cmVtYWluaW5nVGltZX1tc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERvd25sb2FkIGZpbGUgZnJvbSBTMyB3aXRoIHJldHJ5IChSZXF1aXJlbWVudCA2LjMsIDguMSlcclxuICAgIGxvZ2dlci5pbmZvKCdEb3dubG9hZGluZyBmaWxlIGZyb20gUzMnLCB7IHMzS2V5IH0pO1xyXG4gICAgY29uc3QgZG93bmxvYWRTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICBjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IGRvd25sb2FkRmlsZUZyb21TMyhzM0tleSksXHJcbiAgICAgIHsgXHJcbiAgICAgICAgbWF4QXR0ZW1wdHM6IDMsIFxyXG4gICAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ0VUSU1FRE9VVCcsICdFQ09OTlJFU0VUJywgJ05ldHdvcmtFcnJvcicsICdTZXJ2aWNlVW5hdmFpbGFibGUnXVxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgXHJcbiAgICBmaWxlU2l6ZSA9IGZpbGVDb250ZW50Lmxlbmd0aDtcclxuICAgIGNvbnN0IGRvd25sb2FkRHVyYXRpb24gPSBEYXRlLm5vdygpIC0gZG93bmxvYWRTdGFydFRpbWU7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdGaWxlIGRvd25sb2FkZWQgc3VjY2Vzc2Z1bGx5JywgeyBmaWxlU2l6ZSwgZG93bmxvYWREdXJhdGlvbiB9KTtcclxuICAgIExvZ2dpbmdVdGlscy5sb2dGaWxlT3BlcmF0aW9uKGxvZ2dlciwgJ2Rvd25sb2FkZWQnLCBmaWxlSWQsIG1lc3NhZ2UuZmlsZU5hbWUsIGZpbGVTaXplKTtcclxuICAgIFxyXG4gICAgLy8gUmVjb3JkIFMzIG9wZXJhdGlvbiBtZXRyaWNzXHJcbiAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5tb25pdG9yUzNPcGVyYXRpb24oYnVja2V0TmFtZSwgJ0dldE9iamVjdCcsIHRydWUsIGRvd25sb2FkRHVyYXRpb24sIGZpbGVTaXplKTtcclxuXHJcbiAgICAvLyBJbnZva2UgTUlTUkEgQW5hbHlzaXMgRW5naW5lIHdpdGggcHJvZ3Jlc3MgdHJhY2tpbmcgKFJlcXVpcmVtZW50IDYuNCwgMy4zLCA4LjEpXHJcbiAgICBsb2dnZXIuaW5mbygnU3RhcnRpbmcgTUlTUkEgYW5hbHlzaXMnLCB7IGxhbmd1YWdlLCBmaWxlSWQgfSk7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSBwcm9ncmVzcyBjYWxsYmFjayB0byB1cGRhdGUgRHluYW1vREIgZXZlcnkgMiBzZWNvbmRzXHJcbiAgICBjb25zdCBwcm9ncmVzc0NhbGxiYWNrID0gYXN5bmMgKHByb2dyZXNzOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZykgPT4ge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIGF3YWl0IHVwZGF0ZUFuYWx5c2lzUHJvZ3Jlc3MoZmlsZUlkLCBwcm9ncmVzcywgbWVzc2FnZSk7XHJcbiAgICAgICAgbG9nZ2VyLmRlYnVnKCdQcm9ncmVzcyB1cGRhdGVkJywgeyBmaWxlSWQsIHByb2dyZXNzLCBtZXNzYWdlIH0pO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gdXBkYXRlIHByb2dyZXNzJywgeyBmaWxlSWQsIHByb2dyZXNzLCBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pO1xyXG4gICAgICAgIC8vIERvbid0IHRocm93IC0gcHJvZ3Jlc3MgdXBkYXRlcyBhcmUgbm9uLWNyaXRpY2FsXHJcbiAgICAgIH1cclxuICAgIH07XHJcbiAgICBcclxuICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0ID0gYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgKCkgPT4gYW5hbHlzaXNFbmdpbmUuYW5hbHl6ZUZpbGUoXHJcbiAgICAgICAgZmlsZUNvbnRlbnQsXHJcbiAgICAgICAgbGFuZ3VhZ2UsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICB7IHByb2dyZXNzQ2FsbGJhY2ssIHVwZGF0ZUludGVydmFsOiAyMDAwIH0gLy8gMi1zZWNvbmQgdXBkYXRlcyAoUmVxdWlyZW1lbnQgMy4zKVxyXG4gICAgICApLFxyXG4gICAgICB7IFxyXG4gICAgICAgIG1heEF0dGVtcHRzOiAyLCAvLyBMaW1pdGVkIHJldHJpZXMgZm9yIGFuYWx5c2lzXHJcbiAgICAgICAgaW5pdGlhbERlbGF5TXM6IDIwMDAsXHJcbiAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ3RpbWVvdXQnLCAnQU5BTFlTSVNfVElNRU9VVCcsICdTRVJWSUNFX1VOQVZBSUxBQkxFJ11cclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBkdXJhdGlvbixcclxuICAgICAgdmlvbGF0aW9uc0NvdW50OiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aCxcclxuICAgICAgY29tcGxpYW5jZVNjb3JlOiBhbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9yZSByZXN1bHRzIGluIER5bmFtb0RCIHdpdGggcmV0cnkgKFJlcXVpcmVtZW50IDYuNSwgOC4xKVxyXG4gICAgbG9nZ2VyLmluZm8oJ1N0b3JpbmcgYW5hbHlzaXMgcmVzdWx0cycsIHsgYW5hbHlzaXNJZDogYW5hbHlzaXNSZXN1bHQuYW5hbHlzaXNJZCB9KTtcclxuICAgIGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IHN0b3JlQW5hbHlzaXNSZXN1bHRzKGFuYWx5c2lzUmVzdWx0LCBvcmdhbml6YXRpb25JZCksXHJcbiAgICAgIHsgbWF4QXR0ZW1wdHM6IDMsIGluaXRpYWxEZWxheU1zOiAxMDAwIH1cclxuICAgICk7XHJcblxyXG4gICAgLy8gVHJhY2sgYW5hbHlzaXMgY29zdHMgKFJlcXVpcmVtZW50IDE0LjEpXHJcbiAgICBjb25zb2xlLmxvZyhgVHJhY2tpbmcgYW5hbHlzaXMgY29zdHNgKTtcclxuICAgIGNvbnN0IGNvc3RzID0gY29zdFRyYWNrZXIuY2FsY3VsYXRlQ29zdHMoZHVyYXRpb24sIGZpbGVTaXplLCAyKTtcclxuICAgIGF3YWl0IGNvc3RUcmFja2VyLnJlY29yZENvc3QoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnLFxyXG4gICAgICBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGNvc3RzLFxyXG4gICAgICB7XHJcbiAgICAgICAgZmlsZVNpemUsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBjb25zb2xlLmxvZyhgQ29zdCB0cmFja2luZyBjb21wbGV0ZWQ6ICQke2Nvc3RzLnRvdGFsQ29zdC50b0ZpeGVkKDYpfWApO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyB0byBDT01QTEVURURcclxuICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBmaWxlICR7ZmlsZUlkfSBzdGF0dXMgdG8gQ09NUExFVEVEYCk7XHJcbiAgICBhd2FpdCB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoZmlsZUlkLCAnY29tcGxldGVkJywge1xyXG4gICAgICB2aW9sYXRpb25zX2NvdW50OiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aCxcclxuICAgICAgY29tcGxpYW5jZV9wZXJjZW50YWdlOiBhbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlLFxyXG4gICAgICBhbmFseXNpc19kdXJhdGlvbjogZHVyYXRpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQW5hbHlzaXMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSBmb3IgZmlsZSAke2ZpbGVJZH1gKTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgYW5hbHlzaXNJZDogYW5hbHlzaXNSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBjb21wbGlhbmNlU2NvcmU6IGFuYWx5c2lzUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2UsXHJcbiAgICAgIHZpb2xhdGlvbkNvdW50OiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aCxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGR1cmluZyBhbmFseXNpcyBmb3IgZmlsZSAke2ZpbGVJZH06YCwgZXJyb3IpO1xyXG5cclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xyXG4gICAgXHJcbiAgICAvLyBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgdG8gRkFJTEVEIChSZXF1aXJlbWVudCAxMS4xLCAxMS4yLCAxMS4zLCAxMS40KVxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdXBkYXRlRmlsZU1ldGFkYXRhU3RhdHVzKGZpbGVJZCwgJ2ZhaWxlZCcsIHtcclxuICAgICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgZXJyb3JfdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKHVwZGF0ZUVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXM6JywgdXBkYXRlRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlLXRocm93IHRvIHRyaWdnZXIgU1FTIHJldHJ5L0RMUVxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogRG93bmxvYWQgZmlsZSBjb250ZW50IGZyb20gUzNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkRmlsZUZyb21TMyhzM0tleTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICBLZXk6IHMzS2V5LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzM0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXJlc3BvbnNlLkJvZHkpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSByZXNwb25zZSBib2R5IGZyb20gUzMnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb252ZXJ0IHN0cmVhbSB0byBzdHJpbmdcclxuICAgIGNvbnN0IGNodW5rczogVWludDhBcnJheVtdID0gW107XHJcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHJlc3BvbnNlLkJvZHkgYXMgYW55KSB7XHJcbiAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpO1xyXG4gICAgcmV0dXJuIGJ1ZmZlci50b1N0cmluZygndXRmLTgnKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZG93bmxvYWRpbmcgZmlsZSBmcm9tIFMzOicsIGVycm9yKTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGRvd25sb2FkIGZpbGUgZnJvbSBTMzogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdG9yZSBhbmFseXNpcyByZXN1bHRzIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzdG9yZUFuYWx5c2lzUmVzdWx0cyhcclxuICByZXN1bHQ6IGFueSxcclxuICBvcmdhbml6YXRpb25JZD86IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgaXRlbSA9IHtcclxuICAgICAgYW5hbHlzaXNJZDogcmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZDogcmVzdWx0LmZpbGVJZCxcclxuICAgICAgdXNlcklkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogb3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnLFxyXG4gICAgICBsYW5ndWFnZTogcmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICB2aW9sYXRpb25zOiByZXN1bHQudmlvbGF0aW9ucyxcclxuICAgICAgc3VtbWFyeTogcmVzdWx0LnN1bW1hcnksXHJcbiAgICAgIHN0YXR1czogcmVzdWx0LnN0YXR1cyxcclxuICAgICAgY3JlYXRlZEF0OiByZXN1bHQuY3JlYXRlZEF0LFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICBJdGVtOiBtYXJzaGFsbChpdGVtKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgY29uc29sZS5sb2coYEFuYWx5c2lzIHJlc3VsdHMgc3RvcmVkIHdpdGggSUQ6ICR7cmVzdWx0LmFuYWx5c2lzSWR9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0b3JpbmcgYW5hbHlzaXMgcmVzdWx0czonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzdG9yZSBhbmFseXNpcyByZXN1bHRzOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyBpbiBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlRmlsZU1ldGFkYXRhU3RhdHVzKFxyXG4gIGZpbGVJZDogc3RyaW5nLFxyXG4gIHN0YXR1czogc3RyaW5nLFxyXG4gIGFkZGl0aW9uYWxEYXRhPzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbiA9IFsnU0VUIGFuYWx5c2lzX3N0YXR1cyA9IDpzdGF0dXMnLCAndXBkYXRlZF9hdCA9IDp1cGRhdGVkQXQnXTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICc6c3RhdHVzJzogeyBTOiBzdGF0dXMgfSxcclxuICAgICAgJzp1cGRhdGVkQXQnOiB7IE46IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCkgfSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGFkZGl0aW9uYWxEYXRhKSB7XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS52aW9sYXRpb25zX2NvdW50ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ3Zpb2xhdGlvbnNfY291bnQgPSA6dmlvbGF0aW9uc0NvdW50Jyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnZpb2xhdGlvbnNDb3VudCddID0geyBOOiBhZGRpdGlvbmFsRGF0YS52aW9sYXRpb25zX2NvdW50LnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuY29tcGxpYW5jZV9wZXJjZW50YWdlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2NvbXBsaWFuY2VfcGVyY2VudGFnZSA9IDpjb21wbGlhbmNlUGVyY2VudGFnZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpjb21wbGlhbmNlUGVyY2VudGFnZSddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5jb21wbGlhbmNlX3BlcmNlbnRhZ2UudG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5hbmFseXNpc19kdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdhbmFseXNpc19kdXJhdGlvbiA9IDphbmFseXNpc0R1cmF0aW9uJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmFuYWx5c2lzRHVyYXRpb24nXSA9IHsgTjogYWRkaXRpb25hbERhdGEuYW5hbHlzaXNfZHVyYXRpb24udG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5lcnJvcl9tZXNzYWdlKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdlcnJvcl9tZXNzYWdlID0gOmVycm9yTWVzc2FnZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplcnJvck1lc3NhZ2UnXSA9IHsgUzogYWRkaXRpb25hbERhdGEuZXJyb3JfbWVzc2FnZSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5lcnJvcl90aW1lc3RhbXApIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2Vycm9yX3RpbWVzdGFtcCA9IDplcnJvclRpbWVzdGFtcCcpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplcnJvclRpbWVzdGFtcCddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5lcnJvcl90aW1lc3RhbXAudG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogbWFyc2hhbGwoeyBmaWxlX2lkOiBmaWxlSWQgfSksXHJcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246IHVwZGF0ZUV4cHJlc3Npb24uam9pbignLCAnKSxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgY29uc29sZS5sb2coYEZpbGUgbWV0YWRhdGEgdXBkYXRlZCBmb3IgJHtmaWxlSWR9OiBzdGF0dXM9JHtzdGF0dXN9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGZpbGUgbWV0YWRhdGE6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIGZpbGUgbWV0YWRhdGE6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIGFuYWx5c2lzIHByb2dyZXNzIGluIER5bmFtb0RCXHJcbiAqIFJlcXVpcmVtZW50czogMy4zICgyLXNlY29uZCBwcm9ncmVzcyB1cGRhdGVzKVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlQW5hbHlzaXNQcm9ncmVzcyhcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBwcm9ncmVzczogbnVtYmVyLFxyXG4gIG1lc3NhZ2U6IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogbWFyc2hhbGwoeyBmaWxlX2lkOiBmaWxlSWQgfSksXHJcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgYW5hbHlzaXNfcHJvZ3Jlc3MgPSA6cHJvZ3Jlc3MsIGFuYWx5c2lzX21lc3NhZ2UgPSA6bWVzc2FnZSwgdXBkYXRlZF9hdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgJzpwcm9ncmVzcyc6IHsgTjogcHJvZ3Jlc3MudG9TdHJpbmcoKSB9LFxyXG4gICAgICAgICc6bWVzc2FnZSc6IHsgUzogbWVzc2FnZSB9LFxyXG4gICAgICAgICc6dXBkYXRlZEF0JzogeyBOOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKS50b1N0cmluZygpIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgYW5hbHlzaXMgcHJvZ3Jlc3M6JywgZXJyb3IpO1xyXG4gICAgLy8gRG9uJ3QgdGhyb3cgLSBwcm9ncmVzcyB1cGRhdGVzIGFyZSBub24tY3JpdGljYWxcclxuICB9XHJcbn1cclxuLy8gRXhwb3J0IHRoZSBoYW5kbGVyIHdpdGggY29ycmVsYXRpb24gSUQgbWlkZGxld2FyZVxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IHdpdGhDb3JyZWxhdGlvbklkKGFuYWx5emVGaWxlSGFuZGxlcik7Il19