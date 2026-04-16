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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBNkY7QUFDN0YsMERBQWtEO0FBQ2xELG1GQUFvRjtBQUVwRiw2RUFBeUU7QUFDekUsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRix1RUFBb0c7QUFDcEcsMEVBQXNFO0FBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDO0FBQzlELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksa0JBQWtCLENBQUM7QUFDaEYsTUFBTSxvQkFBb0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixJQUFJLHFCQUFxQixDQUFDO0FBRXpGLE1BQU0sUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDMUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNwRCxNQUFNLGNBQWMsR0FBRyxJQUFJLHFDQUFtQixFQUFFLENBQUM7QUFDakQsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBV2xEOzs7Ozs7R0FNRztBQUNILEtBQUssVUFBVSxrQkFBa0IsQ0FBQyxLQUFlLEVBQUUsT0FBZ0I7SUFDakUsTUFBTSxNQUFNLEdBQUcsc0NBQWlCLENBQUMsV0FBVyxDQUFDO1FBQzNDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtRQUNsQyxTQUFTLEVBQUUsT0FBTyxDQUFDLFlBQVk7S0FDaEMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLElB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LEVBQUUseUZBQXlGO1lBQzNHLHlCQUF5QixFQUFFO2dCQUN6QixXQUFXLEVBQUUsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUN2QyxVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFO2dCQUMxQixZQUFZLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7YUFDOUQ7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFELGtEQUFrRDtJQUNwRCxDQUFDO0FBQ0gsQ0FBQztBQUNELG9EQUFvRDtBQUN2QyxRQUFBLE9BQU8sR0FBRyxJQUFBLHNDQUFpQixFQUFDLGtCQUFrQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTUVNFdmVudCwgU1FTUmVjb3JkLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBHZXRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFB1dEl0ZW1Db21tYW5kLCBVcGRhdGVJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcbmltcG9ydCB7IE1JU1JBQW5hbHlzaXNFbmdpbmUgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS1hbmFseXNpcy9hbmFseXNpcy1lbmdpbmUnO1xyXG5pbXBvcnQgeyBMYW5ndWFnZSB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuaW1wb3J0IHsgQ29zdFRyYWNrZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS1hbmFseXNpcy9jb3N0LXRyYWNrZXInO1xyXG5pbXBvcnQgeyBjZW50cmFsaXplZEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2NlbnRyYWxpemVkLWVycm9yLWhhbmRsZXInO1xyXG5pbXBvcnQgeyBlbmhhbmNlZFJldHJ5U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2VuaGFuY2VkLXJldHJ5JztcclxuaW1wb3J0IHsgQ2VudHJhbGl6ZWRMb2dnZXIsIHdpdGhDb3JyZWxhdGlvbklkLCBMb2dnaW5nVXRpbHMgfSBmcm9tICcuLi8uLi91dGlscy9jZW50cmFsaXplZC1sb2dnZXInO1xyXG5pbXBvcnQgeyBtb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21vbml0b3Jpbmctc2VydmljZSc7XHJcblxyXG5jb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICcnO1xyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YS1kZXYnO1xyXG5jb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEUgfHwgJ0FuYWx5c2lzUmVzdWx0cy1kZXYnO1xyXG5cclxuY29uc3QgczNDbGllbnQgPSBuZXcgUzNDbGllbnQoeyByZWdpb24gfSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbiB9KTtcclxuY29uc3QgYW5hbHlzaXNFbmdpbmUgPSBuZXcgTUlTUkFBbmFseXNpc0VuZ2luZSgpO1xyXG5jb25zdCBjb3N0VHJhY2tlciA9IG5ldyBDb3N0VHJhY2tlcihkeW5hbW9DbGllbnQpO1xyXG5cclxuaW50ZXJmYWNlIEFuYWx5c2lzTWVzc2FnZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBzM0tleTogc3RyaW5nO1xyXG4gIGxhbmd1YWdlOiBMYW5ndWFnZTtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZD86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciBNSVNSQSBmaWxlIGFuYWx5c2lzIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmcgYW5kIG1vbml0b3JpbmdcclxuICogUHJvY2Vzc2VzIFNRUyBtZXNzYWdlcyBjb250YWluaW5nIGFuYWx5c2lzIHJlcXVlc3RzXHJcbiAqIFxyXG4gKiBSZXF1aXJlbWVudHM6IDYuMiwgNi4zLCA2LjQsIDYuNSwgOC4xLCA4LjJcclxuICogVGFzayA4LjI6IEVuaGFuY2VkIHdpdGggY2VudHJhbGl6ZWQgbG9nZ2luZyBhbmQgY29ycmVsYXRpb24gSURzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBhbmFseXplRmlsZUhhbmRsZXIoZXZlbnQ6IFNRU0V2ZW50LCBjb250ZXh0OiBDb250ZXh0KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgbG9nZ2VyID0gQ2VudHJhbGl6ZWRMb2dnZXIuZ2V0SW5zdGFuY2Uoe1xyXG4gICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgIHJlcXVlc3RJZDogY29udGV4dC5hd3NSZXF1ZXN0SWQsXHJcbiAgfSk7XHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ0FuYWx5c2lzIExhbWJkYSBpbnZva2VkJywge1xyXG4gICAgbWVzc2FnZUNvdW50OiBldmVudC5SZWNvcmRzLmxlbmd0aCxcclxuICAgIHJlbWFpbmluZ1RpbWU6IGNvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKClcclxuICB9KTtcclxuXHJcbiAgLy8gUHJvY2VzcyBlYWNoIFNRUyBtZXNzYWdlIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcclxuICBmb3IgKGNvbnN0IHJlY29yZCBvZiBldmVudC5SZWNvcmRzKSB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgbGV0IGFuYWx5c2lzSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuICAgIGxldCBmaWxlSWQ6IHN0cmluZyB8IHVuZGVmaW5lZDtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2VudHJhbGl6ZWRFcnJvckhhbmRsZXIuZXhlY3V0ZVdpdGhFcnJvckhhbmRsaW5nKFxyXG4gICAgICAgICgpID0+IHByb2Nlc3NBbmFseXNpc01lc3NhZ2UocmVjb3JkLCBjb250ZXh0LCBsb2dnZXIpLFxyXG4gICAgICAgICdhbmFseXNpcy1zZXJ2aWNlJyxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBvcGVyYXRpb246ICdwcm9jZXNzLWFuYWx5c2lzLW1lc3NhZ2UnLFxyXG4gICAgICAgICAgcmVzb3VyY2U6IHJlY29yZC5tZXNzYWdlSWRcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBFeHRyYWN0IGFuYWx5c2lzIGRldGFpbHMgZm9yIG1vbml0b3JpbmdcclxuICAgICAgaWYgKHJlc3VsdCAmJiB0eXBlb2YgcmVzdWx0ID09PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIGFuYWx5c2lzSWQgPSAocmVzdWx0IGFzIGFueSkuYW5hbHlzaXNJZDtcclxuICAgICAgICBmaWxlSWQgPSAocmVzdWx0IGFzIGFueSkuZmlsZUlkO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIFxyXG4gICAgICAvLyBSZWNvcmQgc3VjY2Vzc2Z1bCBhbmFseXNpcyBtZXRyaWNzXHJcbiAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEFuYWx5c2lzTWV0cmljcyhcclxuICAgICAgICBhbmFseXNpc0lkIHx8ICd1bmtub3duJyxcclxuICAgICAgICBmaWxlSWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgIChyZXN1bHQgYXMgYW55KT8uY29tcGxpYW5jZVNjb3JlIHx8IDAsXHJcbiAgICAgICAgKHJlc3VsdCBhcyBhbnkpPy52aW9sYXRpb25Db3VudCB8fCAwLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIHRydWVcclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIExvZ2dpbmdVdGlscy5sb2dBbmFseXNpc09wZXJhdGlvbihsb2dnZXIsICdjb21wbGV0ZWQnLCBhbmFseXNpc0lkIHx8ICd1bmtub3duJywgZmlsZUlkLCBkdXJhdGlvbik7XHJcbiAgICAgIFxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVjb3JkIGZhaWxlZCBhbmFseXNpcyBtZXRyaWNzXHJcbiAgICAgIGlmIChhbmFseXNpc0lkICYmIGZpbGVJZCkge1xyXG4gICAgICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEFuYWx5c2lzTWV0cmljcyhcclxuICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAwLFxyXG4gICAgICAgICAgMCxcclxuICAgICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgICAgZmFsc2VcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBMb2dnaW5nVXRpbHMubG9nRXJyb3JXaXRoQ29udGV4dChsb2dnZXIsIGVycm9yIGFzIEVycm9yLCAncHJvY2Vzcy1hbmFseXNpcy1tZXNzYWdlJywge1xyXG4gICAgICAgIG1lc3NhZ2VJZDogcmVjb3JkLm1lc3NhZ2VJZCxcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgYW5hbHlzaXNJZCxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBMZXQgU1FTIGhhbmRsZSByZXRyeS9ETFFcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBsb2dnZXIuaW5mbygnQWxsIG1lc3NhZ2VzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFByb2Nlc3MgYSBzaW5nbGUgYW5hbHlzaXMgbWVzc2FnZSBmcm9tIFNRUyB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nIGFuZCBtb25pdG9yaW5nXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQW5hbHlzaXNNZXNzYWdlKFxyXG4gIHJlY29yZDogU1FTUmVjb3JkLFxyXG4gIGNvbnRleHQ6IENvbnRleHQsXHJcbiAgbG9nZ2VyOiBDZW50cmFsaXplZExvZ2dlclxyXG4pOiBQcm9taXNlPHsgYW5hbHlzaXNJZDogc3RyaW5nOyBmaWxlSWQ6IHN0cmluZzsgY29tcGxpYW5jZVNjb3JlOiBudW1iZXI7IHZpb2xhdGlvbkNvdW50OiBudW1iZXIgfT4ge1xyXG4gIGxldCBtZXNzYWdlOiBBbmFseXNpc01lc3NhZ2U7XHJcbiAgXHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIFNRUyBtZXNzYWdlIHdpdGggdmFsaWRhdGlvblxyXG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyZWNvcmQuYm9keSkgYXMgQW5hbHlzaXNNZXNzYWdlO1xyXG4gICAgaWYgKCFwYXJzZWQuZmlsZUlkIHx8ICFwYXJzZWQuczNLZXkgfHwgIXBhcnNlZC5sYW5ndWFnZSB8fCAhcGFyc2VkLnVzZXJJZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgU1FTIG1lc3NhZ2U6IG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzJyk7XHJcbiAgICB9XHJcbiAgICBtZXNzYWdlID0gcGFyc2VkO1xyXG4gICAgXHJcbiAgICAvLyBTZXQgdXNlciBjb250ZXh0IGZvciBsb2dnaW5nXHJcbiAgICBsb2dnZXIuc2V0VXNlcklkKG1lc3NhZ2UudXNlcklkKTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgYW5hbHlzaXMgbWVzc2FnZScsIHtcclxuICAgICAgZmlsZUlkOiBtZXNzYWdlLmZpbGVJZCxcclxuICAgICAgZmlsZU5hbWU6IG1lc3NhZ2UuZmlsZU5hbWUsXHJcbiAgICAgIGxhbmd1YWdlOiBtZXNzYWdlLmxhbmd1YWdlLFxyXG4gICAgICB1c2VySWQ6IG1lc3NhZ2UudXNlcklkXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgTG9nZ2luZ1V0aWxzLmxvZ0FuYWx5c2lzT3BlcmF0aW9uKGxvZ2dlciwgJ3N0YXJ0ZWQnLCAncGVuZGluZycsIG1lc3NhZ2UuZmlsZUlkKTtcclxuICAgIFxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBMb2dnaW5nVXRpbHMubG9nRXJyb3JXaXRoQ29udGV4dChsb2dnZXIsIGVycm9yIGFzIEVycm9yLCAncGFyc2Utc3FzLW1lc3NhZ2UnLCB7XHJcbiAgICAgIG1lc3NhZ2VCb2R5OiByZWNvcmQuYm9keSxcclxuICAgICAgbWVzc2FnZUlkOiByZWNvcmQubWVzc2FnZUlkXHJcbiAgICB9KTtcclxuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBTUVMgbWVzc2FnZSBmb3JtYXQnKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHsgZmlsZUlkLCBzM0tleSwgbGFuZ3VhZ2UsIHVzZXJJZCwgb3JnYW5pemF0aW9uSWQgfSA9IG1lc3NhZ2U7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBsZXQgZmlsZVNpemUgPSAwO1xyXG4gIGxldCBhbmFseXNpc0lkID0gJyc7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgdG8gSU5fUFJPR1JFU1MgKFJlcXVpcmVtZW50IDYuMilcclxuICAgIGxvZ2dlci5pbmZvKCdVcGRhdGluZyBmaWxlIHN0YXR1cyB0byBJTl9QUk9HUkVTUycsIHsgZmlsZUlkIH0pO1xyXG4gICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgKCkgPT4gdXBkYXRlRmlsZU1ldGFkYXRhU3RhdHVzKGZpbGVJZCwgJ2luX3Byb2dyZXNzJyksXHJcbiAgICAgIHsgbWF4QXR0ZW1wdHM6IDMsIGluaXRpYWxEZWxheU1zOiA1MDAgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBDaGVjayByZW1haW5pbmcgdGltZSBiZWZvcmUgc3RhcnRpbmcgYW5hbHlzaXNcclxuICAgIGNvbnN0IHJlbWFpbmluZ1RpbWUgPSBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpO1xyXG4gICAgbG9nZ2VyLmRlYnVnKCdMYW1iZGEgZXhlY3V0aW9uIHRpbWUgY2hlY2snLCB7IHJlbWFpbmluZ1RpbWUgfSk7XHJcblxyXG4gICAgLy8gUmVzZXJ2ZSAzMCBzZWNvbmRzIGZvciBjbGVhbnVwIGFuZCByZXN1bHQgc2F2aW5nXHJcbiAgICBjb25zdCB0aW1lb3V0QnVmZmVyID0gMzAwMDA7XHJcbiAgICBpZiAocmVtYWluaW5nVGltZSA8IHRpbWVvdXRCdWZmZXIgKyA2MDAwMCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluc3VmZmljaWVudCB0aW1lIHJlbWFpbmluZzogJHtyZW1haW5pbmdUaW1lfW1zYCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRG93bmxvYWQgZmlsZSBmcm9tIFMzIHdpdGggcmV0cnkgKFJlcXVpcmVtZW50IDYuMywgOC4xKVxyXG4gICAgbG9nZ2VyLmluZm8oJ0Rvd25sb2FkaW5nIGZpbGUgZnJvbSBTMycsIHsgczNLZXkgfSk7XHJcbiAgICBjb25zdCBkb3dubG9hZFN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIGNvbnN0IGZpbGVDb250ZW50ID0gYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgKCkgPT4gZG93bmxvYWRGaWxlRnJvbVMzKHMzS2V5KSxcclxuICAgICAgeyBcclxuICAgICAgICBtYXhBdHRlbXB0czogMywgXHJcbiAgICAgICAgaW5pdGlhbERlbGF5TXM6IDEwMDAsXHJcbiAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ3RpbWVvdXQnLCAnRVRJTUVET1VUJywgJ0VDT05OUkVTRVQnLCAnTmV0d29ya0Vycm9yJywgJ1NlcnZpY2VVbmF2YWlsYWJsZSddXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBcclxuICAgIGZpbGVTaXplID0gZmlsZUNvbnRlbnQubGVuZ3RoO1xyXG4gICAgY29uc3QgZG93bmxvYWREdXJhdGlvbiA9IERhdGUubm93KCkgLSBkb3dubG9hZFN0YXJ0VGltZTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0ZpbGUgZG93bmxvYWRlZCBzdWNjZXNzZnVsbHknLCB7IGZpbGVTaXplLCBkb3dubG9hZER1cmF0aW9uIH0pO1xyXG4gICAgTG9nZ2luZ1V0aWxzLmxvZ0ZpbGVPcGVyYXRpb24obG9nZ2VyLCAnZG93bmxvYWRlZCcsIGZpbGVJZCwgbWVzc2FnZS5maWxlTmFtZSwgZmlsZVNpemUpO1xyXG4gICAgXHJcbiAgICAvLyBSZWNvcmQgUzMgb3BlcmF0aW9uIG1ldHJpY3NcclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLm1vbml0b3JTM09wZXJhdGlvbihidWNrZXROYW1lLCAnR2V0T2JqZWN0JywgdHJ1ZSwgZG93bmxvYWREdXJhdGlvbiwgZmlsZVNpemUpO1xyXG5cclxuICAgIC8vIEludm9rZSBNSVNSQSBBbmFseXNpcyBFbmdpbmUgd2l0aCBwcm9ncmVzcyB0cmFja2luZyAoUmVxdWlyZW1lbnQgNi40LCAzLjMsIDguMSlcclxuICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBNSVNSQSBhbmFseXNpcycsIHsgbGFuZ3VhZ2UsIGZpbGVJZCB9KTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHByb2dyZXNzIGNhbGxiYWNrIHRvIHVwZGF0ZSBEeW5hbW9EQiBldmVyeSAyIHNlY29uZHNcclxuICAgIGNvbnN0IHByb2dyZXNzQ2FsbGJhY2sgPSBhc3luYyAocHJvZ3Jlc3M6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgdXBkYXRlQW5hbHlzaXNQcm9ncmVzcyhmaWxlSWQsIHByb2dyZXNzLCBtZXNzYWdlKTtcclxuICAgICAgICBsb2dnZXIuZGVidWcoJ1Byb2dyZXNzIHVwZGF0ZWQnLCB7IGZpbGVJZCwgcHJvZ3Jlc3MsIG1lc3NhZ2UgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgcHJvZ3Jlc3MnLCB7IGZpbGVJZCwgcHJvZ3Jlc3MsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgLy8gRG9uJ3QgdGhyb3cgLSBwcm9ncmVzcyB1cGRhdGVzIGFyZSBub24tY3JpdGljYWxcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgY29uc3QgYW5hbHlzaXNSZXN1bHQgPSBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiBhbmFseXNpc0VuZ2luZS5hbmFseXplRmlsZShcclxuICAgICAgICBmaWxlQ29udGVudCxcclxuICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIHsgcHJvZ3Jlc3NDYWxsYmFjaywgdXBkYXRlSW50ZXJ2YWw6IDIwMDAgfSAvLyAyLXNlY29uZCB1cGRhdGVzIChSZXF1aXJlbWVudCAzLjMpXHJcbiAgICAgICksXHJcbiAgICAgIHsgXHJcbiAgICAgICAgbWF4QXR0ZW1wdHM6IDIsIC8vIExpbWl0ZWQgcmV0cmllcyBmb3IgYW5hbHlzaXNcclxuICAgICAgICBpbml0aWFsRGVsYXlNczogMjAwMCxcclxuICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICdBTkFMWVNJU19USU1FT1VUJywgJ1NFUlZJQ0VfVU5BVkFJTEFCTEUnXVxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIGxvZ2dlci5pbmZvKCdBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB2aW9sYXRpb25zQ291bnQ6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICBjb21wbGlhbmNlU2NvcmU6IGFuYWx5c2lzUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIHJlc3VsdHMgaW4gRHluYW1vREIgd2l0aCByZXRyeSAoUmVxdWlyZW1lbnQgNi41LCA4LjEpXHJcbiAgICBsb2dnZXIuaW5mbygnU3RvcmluZyBhbmFseXNpcyByZXN1bHRzJywgeyBhbmFseXNpc0lkOiBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkIH0pO1xyXG4gICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgKCkgPT4gc3RvcmVBbmFseXNpc1Jlc3VsdHMoYW5hbHlzaXNSZXN1bHQsIG9yZ2FuaXphdGlvbklkKSxcclxuICAgICAgeyBtYXhBdHRlbXB0czogMywgaW5pdGlhbERlbGF5TXM6IDEwMDAgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBUcmFjayBhbmFseXNpcyBjb3N0cyAoUmVxdWlyZW1lbnQgMTQuMSlcclxuICAgIGNvbnNvbGUubG9nKGBUcmFja2luZyBhbmFseXNpcyBjb3N0c2ApO1xyXG4gICAgY29uc3QgY29zdHMgPSBjb3N0VHJhY2tlci5jYWxjdWxhdGVDb3N0cyhkdXJhdGlvbiwgZmlsZVNpemUsIDIpO1xyXG4gICAgYXdhaXQgY29zdFRyYWNrZXIucmVjb3JkQ29zdChcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBvcmdhbml6YXRpb25JZCB8fCAnZGVmYXVsdCcsXHJcbiAgICAgIGFuYWx5c2lzUmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgY29zdHMsXHJcbiAgICAgIHtcclxuICAgICAgICBmaWxlU2l6ZSxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgfVxyXG4gICAgKTtcclxuICAgIGNvbnNvbGUubG9nKGBDb3N0IHRyYWNraW5nIGNvbXBsZXRlZDogJCR7Y29zdHMudG90YWxDb3N0LnRvRml4ZWQoNil9YCk7XHJcblxyXG4gICAgLy8gVXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzIHRvIENPTVBMRVRFRFxyXG4gICAgY29uc29sZS5sb2coYFVwZGF0aW5nIGZpbGUgJHtmaWxlSWR9IHN0YXR1cyB0byBDT01QTEVURURgKTtcclxuICAgIGF3YWl0IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdjb21wbGV0ZWQnLCB7XHJcbiAgICAgIHZpb2xhdGlvbnNfY291bnQ6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICBjb21wbGlhbmNlX3BlcmNlbnRhZ2U6IGFuYWx5c2lzUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2UsXHJcbiAgICAgIGFuYWx5c2lzX2R1cmF0aW9uOiBkdXJhdGlvbixcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IGZvciBmaWxlICR7ZmlsZUlkfWApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBkdXJpbmcgYW5hbHlzaXMgZm9yIGZpbGUgJHtmaWxlSWR9OmAsIGVycm9yKTtcclxuXHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcclxuICAgIFxyXG4gICAgLy8gVXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzIHRvIEZBSUxFRCAoUmVxdWlyZW1lbnQgMTEuMSwgMTEuMiwgMTEuMywgMTEuNClcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdmYWlsZWQnLCB7XHJcbiAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3JNZXNzYWdlLFxyXG4gICAgICAgIGVycm9yX3RpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuICAgICAgfSk7XHJcbiAgICB9IGNhdGNoICh1cGRhdGVFcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gdXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzOicsIHVwZGF0ZUVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBSZS10aHJvdyB0byB0cmlnZ2VyIFNRUyByZXRyeS9ETFFcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIERvd25sb2FkIGZpbGUgY29udGVudCBmcm9tIFMzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBkb3dubG9hZEZpbGVGcm9tUzMoczNLZXk6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgS2V5OiBzM0tleSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgczNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIFxyXG4gICAgaWYgKCFyZXNwb25zZS5Cb2R5KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRW1wdHkgcmVzcG9uc2UgYm9keSBmcm9tIFMzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29udmVydCBzdHJlYW0gdG8gc3RyaW5nXHJcbiAgICBjb25zdCBjaHVua3M6IFVpbnQ4QXJyYXlbXSA9IFtdO1xyXG4gICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiByZXNwb25zZS5Cb2R5IGFzIGFueSkge1xyXG4gICAgICBjaHVua3MucHVzaChjaHVuayk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5jb25jYXQoY2h1bmtzKTtcclxuICAgIHJldHVybiBidWZmZXIudG9TdHJpbmcoJ3V0Zi04Jyk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRvd25sb2FkaW5nIGZpbGUgZnJvbSBTMzonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBkb3dubG9hZCBmaWxlIGZyb20gUzM6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogU3RvcmUgYW5hbHlzaXMgcmVzdWx0cyBpbiBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gc3RvcmVBbmFseXNpc1Jlc3VsdHMoXHJcbiAgcmVzdWx0OiBhbnksXHJcbiAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmdcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGl0ZW0gPSB7XHJcbiAgICAgIGFuYWx5c2lzSWQ6IHJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICBmaWxlSWQ6IHJlc3VsdC5maWxlSWQsXHJcbiAgICAgIHVzZXJJZDogcmVzdWx0LnVzZXJJZCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQ6IG9yZ2FuaXphdGlvbklkIHx8ICdkZWZhdWx0JyxcclxuICAgICAgbGFuZ3VhZ2U6IHJlc3VsdC5sYW5ndWFnZSxcclxuICAgICAgdmlvbGF0aW9uczogcmVzdWx0LnZpb2xhdGlvbnMsXHJcbiAgICAgIHN1bW1hcnk6IHJlc3VsdC5zdW1tYXJ5LFxyXG4gICAgICBzdGF0dXM6IHJlc3VsdC5zdGF0dXMsXHJcbiAgICAgIGNyZWF0ZWRBdDogcmVzdWx0LmNyZWF0ZWRBdCxcclxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBhbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgSXRlbTogbWFyc2hhbGwoaXRlbSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIGNvbnNvbGUubG9nKGBBbmFseXNpcyByZXN1bHRzIHN0b3JlZCB3aXRoIElEOiAke3Jlc3VsdC5hbmFseXNpc0lkfWApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzdG9yaW5nIGFuYWx5c2lzIHJlc3VsdHM6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc3RvcmUgYW5hbHlzaXMgcmVzdWx0czogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgaW4gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBzdGF0dXM6IHN0cmluZyxcclxuICBhZGRpdGlvbmFsRGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT5cclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb24gPSBbJ1NFVCBhbmFseXNpc19zdGF0dXMgPSA6c3RhdHVzJywgJ3VwZGF0ZWRfYXQgPSA6dXBkYXRlZEF0J107XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAnOnN0YXR1cyc6IHsgUzogc3RhdHVzIH0sXHJcbiAgICAgICc6dXBkYXRlZEF0JzogeyBOOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKS50b1N0cmluZygpIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChhZGRpdGlvbmFsRGF0YSkge1xyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEudmlvbGF0aW9uc19jb3VudCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCd2aW9sYXRpb25zX2NvdW50ID0gOnZpb2xhdGlvbnNDb3VudCcpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp2aW9sYXRpb25zQ291bnQnXSA9IHsgTjogYWRkaXRpb25hbERhdGEudmlvbGF0aW9uc19jb3VudC50b1N0cmluZygpIH07XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGFkZGl0aW9uYWxEYXRhLmNvbXBsaWFuY2VfcGVyY2VudGFnZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdjb21wbGlhbmNlX3BlcmNlbnRhZ2UgPSA6Y29tcGxpYW5jZVBlcmNlbnRhZ2UnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6Y29tcGxpYW5jZVBlcmNlbnRhZ2UnXSA9IHsgTjogYWRkaXRpb25hbERhdGEuY29tcGxpYW5jZV9wZXJjZW50YWdlLnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuYW5hbHlzaXNfZHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnYW5hbHlzaXNfZHVyYXRpb24gPSA6YW5hbHlzaXNEdXJhdGlvbicpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzphbmFseXNpc0R1cmF0aW9uJ10gPSB7IE46IGFkZGl0aW9uYWxEYXRhLmFuYWx5c2lzX2R1cmF0aW9uLnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuZXJyb3JfbWVzc2FnZSkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnZXJyb3JfbWVzc2FnZSA9IDplcnJvck1lc3NhZ2UnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZXJyb3JNZXNzYWdlJ10gPSB7IFM6IGFkZGl0aW9uYWxEYXRhLmVycm9yX21lc3NhZ2UgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuZXJyb3JfdGltZXN0YW1wKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdlcnJvcl90aW1lc3RhbXAgPSA6ZXJyb3JUaW1lc3RhbXAnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZXJyb3JUaW1lc3RhbXAnXSA9IHsgTjogYWRkaXRpb25hbERhdGEuZXJyb3JfdGltZXN0YW1wLnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlSXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBLZXk6IG1hcnNoYWxsKHsgZmlsZV9pZDogZmlsZUlkIH0pLFxyXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiB1cGRhdGVFeHByZXNzaW9uLmpvaW4oJywgJyksXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIGNvbnNvbGUubG9nKGBGaWxlIG1ldGFkYXRhIHVwZGF0ZWQgZm9yICR7ZmlsZUlkfTogc3RhdHVzPSR7c3RhdHVzfWApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBmaWxlIG1ldGFkYXRhOicsIGVycm9yKTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSBmaWxlIG1ldGFkYXRhOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBhbmFseXNpcyBwcm9ncmVzcyBpbiBEeW5hbW9EQlxyXG4gKiBSZXF1aXJlbWVudHM6IDMuMyAoMi1zZWNvbmQgcHJvZ3Jlc3MgdXBkYXRlcylcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUFuYWx5c2lzUHJvZ3Jlc3MoXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgcHJvZ3Jlc3M6IG51bWJlcixcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlSXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBLZXk6IG1hcnNoYWxsKHsgZmlsZV9pZDogZmlsZUlkIH0pLFxyXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGFuYWx5c2lzX3Byb2dyZXNzID0gOnByb2dyZXNzLCBhbmFseXNpc19tZXNzYWdlID0gOm1lc3NhZ2UsIHVwZGF0ZWRfYXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICc6cHJvZ3Jlc3MnOiB7IE46IHByb2dyZXNzLnRvU3RyaW5nKCkgfSxcclxuICAgICAgICAnOm1lc3NhZ2UnOiB7IFM6IG1lc3NhZ2UgfSxcclxuICAgICAgICAnOnVwZGF0ZWRBdCc6IHsgTjogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkudG9TdHJpbmcoKSB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGFuYWx5c2lzIHByb2dyZXNzOicsIGVycm9yKTtcclxuICAgIC8vIERvbid0IHRocm93IC0gcHJvZ3Jlc3MgdXBkYXRlcyBhcmUgbm9uLWNyaXRpY2FsXHJcbiAgfVxyXG59XHJcbi8vIEV4cG9ydCB0aGUgaGFuZGxlciB3aXRoIGNvcnJlbGF0aW9uIElEIG1pZGRsZXdhcmVcclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSB3aXRoQ29ycmVsYXRpb25JZChhbmFseXplRmlsZUhhbmRsZXIpOyJdfQ==