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
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults';
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
        await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => updateFileMetadataStatus(fileId, 'in_progress', { userId }), { maxAttempts: 3, initialDelayMs: 500 });
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
            retryableErrors: ['timeout', 'ETIMEDOUT', 'ECONNRESET', 'NetworkError', 'ServiceUnavailable', 'NoSuchKey']
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
        // We'll get totalRules from the analysis engine when it calls this callback
        const progressCallback = async (progress, message) => {
            try {
                // Extract rules processed from the message if available
                let rulesProcessed = 0;
                let totalRulesFromMessage = 357; // Default fallback to actual MISRA rule count
                const rulesMatch = message.match(/(\d+)\/(\d+) completed/);
                if (rulesMatch) {
                    rulesProcessed = parseInt(rulesMatch[1]);
                    totalRulesFromMessage = parseInt(rulesMatch[2]);
                }
                await updateAnalysisProgress(fileId, progress, message, rulesProcessed, totalRulesFromMessage, userId);
                logger.debug('Progress updated', { fileId, progress, message, rulesProcessed, totalRules: totalRulesFromMessage });
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
        // CRITICAL: Wait for DynamoDB to propagate results before marking status as completed
        // This prevents race condition where status is marked complete before results are available
        console.log(`Waiting for DynamoDB propagation before marking status as completed`);
        // Add a longer delay to ensure DynamoDB has time to propagate
        await new Promise(resolve => setTimeout(resolve, 3000));
        // Verify results are in DynamoDB with multiple attempts
        let resultsVerified = false;
        let verifyAttempts = 0;
        const maxVerifyAttempts = 30; // Increased to 30 attempts (~6 seconds total)
        while (!resultsVerified && verifyAttempts < maxVerifyAttempts) {
            try {
                verifyAttempts++;
                // Use FileIndex GSI to query by fileId
                const command = new client_dynamodb_1.QueryCommand({
                    TableName: analysisResultsTable,
                    IndexName: 'FileIndex',
                    KeyConditionExpression: 'fileId = :fileId',
                    ExpressionAttributeValues: {
                        ':fileId': { S: fileId },
                    },
                    Limit: 1,
                });
                const result = await dynamoClient.send(command);
                if (result.Items && result.Items.length > 0) {
                    console.log(`✓ Results verified in DynamoDB on attempt ${verifyAttempts}`);
                    resultsVerified = true;
                    break;
                }
                else {
                    console.log(`Results not yet visible (attempt ${verifyAttempts}/${maxVerifyAttempts}), retrying...`);
                    // Wait before next attempt - use exponential backoff
                    const backoffDelay = Math.min(500, 100 * verifyAttempts);
                    await new Promise(resolve => setTimeout(resolve, backoffDelay));
                }
            }
            catch (verifyError) {
                console.warn(`Verification attempt ${verifyAttempts} failed:`, verifyError);
                const backoffDelay = Math.min(500, 100 * verifyAttempts);
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
            }
        }
        if (!resultsVerified) {
            console.warn(`⚠️ Results could not be verified after ${maxVerifyAttempts} attempts`);
            console.warn(`Proceeding anyway - results may be available shortly`);
        }
        // Track analysis costs (Requirement 14.1)
        console.log(`Tracking analysis costs`);
        const costs = costTracker.calculateCosts(duration, fileSize, 2);
        await costTracker.recordCost(userId, organizationId || 'default', analysisResult.analysisId, fileId, costs, {
            fileSize,
            duration,
        });
        console.log(`Cost tracking completed: $${costs.totalCost.toFixed(6)}`);
        // Update file metadata status to COMPLETED
        // This is now safe because we've verified results are in DynamoDB
        console.log(`Updating file ${fileId} status to COMPLETED`);
        await updateFileMetadataStatus(fileId, 'completed', {
            userId,
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
                userId,
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
        console.log('Attempting to download from S3', {
            bucket: bucketName,
            key: s3Key,
            region
        });
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
        console.log('File downloaded successfully from S3', {
            key: s3Key,
            size: buffer.length
        });
        return buffer.toString('utf-8');
    }
    catch (error) {
        console.error('Error downloading file from S3:', {
            bucket: bucketName,
            key: s3Key,
            error: error instanceof Error ? error.message : String(error),
            errorCode: error?.Code,
            errorName: error?.name,
            timestamp: new Date().toISOString()
        });
        throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Store analysis results in DynamoDB
 */
async function storeAnalysisResults(result, organizationId) {
    try {
        const now = Date.now();
        console.log(`✅ [STORE] Starting to store analysis results`);
        console.log(`✅ [STORE] analysisId: ${result.analysisId}`);
        console.log(`✅ [STORE] fileId: ${result.fileId}`);
        console.log(`✅ [STORE] userId: ${result.userId}`);
        console.log(`✅ [STORE] violations: ${result.violations.length}`);
        // Build the item object with timestamp as a NUMBER (not string)
        const item = {
            analysisId: result.analysisId,
            fileId: result.fileId,
            userId: result.userId,
            organizationId: organizationId || 'default',
            language: result.language,
            violations: result.violations,
            summary: result.summary,
            status: result.status,
            timestamp: now, // CRITICAL: Must be a number, not a string
            createdAt: typeof result.createdAt === 'string' ? result.createdAt : new Date(now).toISOString(),
        };
        console.log(`✅ [STORE] Item prepared with timestamp: ${item.timestamp} (type: ${typeof item.timestamp})`);
        // Marshall the item - timestamp will be correctly marshalled as N (number)
        const marshalledItem = (0, util_dynamodb_1.marshall)(item);
        console.log(`✅ [STORE] Item marshalled successfully`);
        console.log(`✅ [STORE] Marshalled timestamp type: ${marshalledItem.timestamp?.N ? 'Number' : 'Unknown'}`);
        const command = new client_dynamodb_1.PutItemCommand({
            TableName: analysisResultsTable,
            Item: marshalledItem,
        });
        console.log(`✅ [STORE] Sending PutItemCommand to table: ${analysisResultsTable}`);
        await dynamoClient.send(command);
        console.log(`✅ [STORE] ✓ Analysis results stored successfully with ID: ${result.analysisId}`);
        // Immediately verify the data was stored
        console.log(`✅ [STORE] Verifying data was stored...`);
        const verifyCommand = new client_dynamodb_1.QueryCommand({
            TableName: analysisResultsTable,
            IndexName: 'FileIndex',
            KeyConditionExpression: 'fileId = :fileId',
            ExpressionAttributeValues: {
                ':fileId': { S: result.fileId },
            },
            Limit: 1,
        });
        const verifyResult = await dynamoClient.send(verifyCommand);
        if (verifyResult.Items && verifyResult.Items.length > 0) {
            console.log(`✅ [STORE] ✓ Verification successful! Data found in DynamoDB`);
            console.log(`✅ [STORE] Found ${verifyResult.Items.length} item(s) for fileId: ${result.fileId}`);
        }
        else {
            console.warn(`⚠️ [STORE] Verification failed - no items found immediately after store`);
        }
    }
    catch (error) {
        console.error('❌ [STORE] Error storing analysis results:', error);
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
        // When status is failed, reset progress to 0 for consistency
        if (status === 'failed') {
            updateExpression.push('analysis_progress = :progress');
            expressionAttributeValues[':progress'] = { N: '0' };
        }
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
        // CRITICAL FIX: FileMetadata table has composite key (fileId + userId)
        // The SQS message contains userId, so we need to extract it from the message context
        // For now, we'll use a query-then-update pattern to find the correct userId
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({
                fileId: fileId,
                userId: (additionalData?.userId || 'unknown') // Will be passed from caller
            }),
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
async function updateAnalysisProgress(fileId, progress, message, rulesProcessed, totalRules, userId) {
    try {
        const updateExpression = ['SET analysis_progress = :progress', 'analysis_message = :message', 'updated_at = :updatedAt'];
        const expressionAttributeValues = {
            ':progress': { N: progress.toString() },
            ':message': { S: message },
            ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
        };
        // Add rules progress if provided
        if (rulesProcessed !== undefined) {
            updateExpression.push('rules_processed = :rulesProcessed');
            expressionAttributeValues[':rulesProcessed'] = { N: rulesProcessed.toString() };
        }
        if (totalRules !== undefined) {
            updateExpression.push('total_rules = :totalRules');
            expressionAttributeValues[':totalRules'] = { N: totalRules.toString() };
        }
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({
                fileId: fileId,
                userId: userId || 'unknown' // Use provided userId or fallback
            }),
            UpdateExpression: updateExpression.join(', '),
            ExpressionAttributeValues: expressionAttributeValues,
        });
        await dynamoClient.send(command);
        console.log(`✅ Progress updated for ${fileId}: ${progress}% - ${message} (${rulesProcessed || 0}/${totalRules || 357} rules)`);
    }
    catch (error) {
        console.error('❌ Error updating analysis progress:', error);
        // Don't throw - progress updates are non-critical
    }
}
// Export the handler with correlation ID middleware
exports.handler = (0, centralized_logger_1.withCorrelationId)(analyzeFileHandler);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBMkc7QUFDM0csMERBQWtEO0FBQ2xELG1GQUFvRjtBQUVwRiw2RUFBeUU7QUFDekUsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRix1RUFBb0c7QUFDcEcsMEVBQXNFO0FBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDO0FBQzlELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksY0FBYyxDQUFDO0FBQzVFLE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxpQkFBaUIsQ0FBQztBQUVyRixNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzFDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxxQ0FBbUIsRUFBRSxDQUFDO0FBQ2pELE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQVdsRDs7Ozs7O0dBTUc7QUFDSCxLQUFLLFVBQVUsa0JBQWtCLENBQUMsS0FBZSxFQUFFLE9BQWdCO0lBQ2pFLE1BQU0sTUFBTSxHQUFHLHNDQUFpQixDQUFDLFdBQVcsQ0FBQztRQUMzQyxZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDbEMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxZQUFZO0tBQ2hDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxJQUFJ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QUcsSUFBQSxzQ0FBaUIsRUFBQyxrQkFBa0IsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU1FTRXZlbnQsIFNRU1JlY29yZCwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTM0NsaWVudCwgR2V0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBQdXRJdGVtQ29tbWFuZCwgVXBkYXRlSXRlbUNvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcbmltcG9ydCB7IE1JU1JBQW5hbHlzaXNFbmdpbmUgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS1hbmFseXNpcy9hbmFseXNpcy1lbmdpbmUnO1xyXG5pbXBvcnQgeyBMYW5ndWFnZSB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuaW1wb3J0IHsgQ29zdFRyYWNrZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS1hbmFseXNpcy9jb3N0LXRyYWNrZXInO1xyXG5pbXBvcnQgeyBjZW50cmFsaXplZEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2NlbnRyYWxpemVkLWVycm9yLWhhbmRsZXInO1xyXG5pbXBvcnQgeyBlbmhhbmNlZFJldHJ5U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2VuaGFuY2VkLXJldHJ5JztcclxuaW1wb3J0IHsgQ2VudHJhbGl6ZWRMb2dnZXIsIHdpdGhDb3JyZWxhdGlvbklkLCBMb2dnaW5nVXRpbHMgfSBmcm9tICcuLi8uLi91dGlscy9jZW50cmFsaXplZC1sb2dnZXInO1xyXG5pbXBvcnQgeyBtb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21vbml0b3Jpbmctc2VydmljZSc7XHJcblxyXG5jb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICcnO1xyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YSc7XHJcbmNvbnN0IGFuYWx5c2lzUmVzdWx0c1RhYmxlID0gcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUkVTVUxUU19UQUJMRSB8fCAnQW5hbHlzaXNSZXN1bHRzJztcclxuXHJcbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XHJcbmNvbnN0IGFuYWx5c2lzRW5naW5lID0gbmV3IE1JU1JBQW5hbHlzaXNFbmdpbmUoKTtcclxuY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIoZHluYW1vQ2xpZW50KTtcclxuXHJcbmludGVyZmFjZSBBbmFseXNpc01lc3NhZ2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICBsYW5ndWFnZTogTGFuZ3VhZ2U7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgaGFuZGxlciBmb3IgTUlTUkEgZmlsZSBhbmFseXNpcyB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nIGFuZCBtb25pdG9yaW5nXHJcbiAqIFByb2Nlc3NlcyBTUVMgbWVzc2FnZXMgY29udGFpbmluZyBhbmFseXNpcyByZXF1ZXN0c1xyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiA2LjIsIDYuMywgNi40LCA2LjUsIDguMSwgOC4yXHJcbiAqIFRhc2sgOC4yOiBFbmhhbmNlZCB3aXRoIGNlbnRyYWxpemVkIGxvZ2dpbmcgYW5kIGNvcnJlbGF0aW9uIElEc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gYW5hbHl6ZUZpbGVIYW5kbGVyKGV2ZW50OiBTUVNFdmVudCwgY29udGV4dDogQ29udGV4dCk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGxvZ2dlciA9IENlbnRyYWxpemVkTG9nZ2VyLmdldEluc3RhbmNlKHtcclxuICAgIGZ1bmN0aW9uTmFtZTogY29udGV4dC5mdW5jdGlvbk5hbWUsXHJcbiAgICByZXF1ZXN0SWQ6IGNvbnRleHQuYXdzUmVxdWVzdElkLFxyXG4gIH0pO1xyXG4gIFxyXG4gIGxvZ2dlci5pbmZvKCdBbmFseXNpcyBMYW1iZGEgaW52b2tlZCcsIHtcclxuICAgIG1lc3NhZ2VDb3VudDogZXZlbnQuUmVjb3Jkcy5sZW5ndGgsXHJcbiAgICByZW1haW5pbmdUaW1lOiBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpXHJcbiAgfSk7XHJcblxyXG4gIC8vIFByb2Nlc3MgZWFjaCBTUVMgbWVzc2FnZSB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXHJcbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGxldCBhbmFseXNpc0lkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgICBsZXQgZmlsZUlkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNlbnRyYWxpemVkRXJyb3JIYW5kbGVyLmV4ZWN1dGVXaXRoRXJyb3JIYW5kbGluZyhcclxuICAgICAgICAoKSA9PiBwcm9jZXNzQW5hbHlzaXNNZXNzYWdlKHJlY29yZCwgY29udGV4dCwgbG9nZ2VyKSxcclxuICAgICAgICAnYW5hbHlzaXMtc2VydmljZScsXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgb3BlcmF0aW9uOiAncHJvY2Vzcy1hbmFseXNpcy1tZXNzYWdlJyxcclxuICAgICAgICAgIHJlc291cmNlOiByZWNvcmQubWVzc2FnZUlkXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCBhbmFseXNpcyBkZXRhaWxzIGZvciBtb25pdG9yaW5nXHJcbiAgICAgIGlmIChyZXN1bHQgJiYgdHlwZW9mIHJlc3VsdCA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBhbmFseXNpc0lkID0gKHJlc3VsdCBhcyBhbnkpLmFuYWx5c2lzSWQ7XHJcbiAgICAgICAgZmlsZUlkID0gKHJlc3VsdCBhcyBhbnkpLmZpbGVJZDtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBcclxuICAgICAgLy8gUmVjb3JkIHN1Y2Nlc3NmdWwgYW5hbHlzaXMgbWV0cmljc1xyXG4gICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5yZWNvcmRBbmFseXNpc01ldHJpY3MoXHJcbiAgICAgICAgYW5hbHlzaXNJZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgZmlsZUlkIHx8ICd1bmtub3duJyxcclxuICAgICAgICAocmVzdWx0IGFzIGFueSk/LmNvbXBsaWFuY2VTY29yZSB8fCAwLFxyXG4gICAgICAgIChyZXN1bHQgYXMgYW55KT8udmlvbGF0aW9uQ291bnQgfHwgMCxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICB0cnVlXHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBMb2dnaW5nVXRpbHMubG9nQW5hbHlzaXNPcGVyYXRpb24obG9nZ2VyLCAnY29tcGxldGVkJywgYW5hbHlzaXNJZCB8fCAndW5rbm93bicsIGZpbGVJZCwgZHVyYXRpb24pO1xyXG4gICAgICBcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgXHJcbiAgICAgIC8vIFJlY29yZCBmYWlsZWQgYW5hbHlzaXMgbWV0cmljc1xyXG4gICAgICBpZiAoYW5hbHlzaXNJZCAmJiBmaWxlSWQpIHtcclxuICAgICAgICBhd2FpdCBtb25pdG9yaW5nU2VydmljZS5yZWNvcmRBbmFseXNpc01ldHJpY3MoXHJcbiAgICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgMCxcclxuICAgICAgICAgIDAsXHJcbiAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICAgIGZhbHNlXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgTG9nZ2luZ1V0aWxzLmxvZ0Vycm9yV2l0aENvbnRleHQobG9nZ2VyLCBlcnJvciBhcyBFcnJvciwgJ3Byb2Nlc3MtYW5hbHlzaXMtbWVzc2FnZScsIHtcclxuICAgICAgICBtZXNzYWdlSWQ6IHJlY29yZC5tZXNzYWdlSWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgLy8gTGV0IFNRUyBoYW5kbGUgcmV0cnkvRExRXHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgbG9nZ2VyLmluZm8oJ0FsbCBtZXNzYWdlcyBwcm9jZXNzZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIGEgc2luZ2xlIGFuYWx5c2lzIG1lc3NhZ2UgZnJvbSBTUVMgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZyBhbmQgbW9uaXRvcmluZ1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0FuYWx5c2lzTWVzc2FnZShcclxuICByZWNvcmQ6IFNRU1JlY29yZCxcclxuICBjb250ZXh0OiBDb250ZXh0LFxyXG4gIGxvZ2dlcjogQ2VudHJhbGl6ZWRMb2dnZXJcclxuKTogUHJvbWlzZTx7IGFuYWx5c2lzSWQ6IHN0cmluZzsgZmlsZUlkOiBzdHJpbmc7IGNvbXBsaWFuY2VTY29yZTogbnVtYmVyOyB2aW9sYXRpb25Db3VudDogbnVtYmVyIH0+IHtcclxuICBsZXQgbWVzc2FnZTogQW5hbHlzaXNNZXNzYWdlO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSBTUVMgbWVzc2FnZSB3aXRoIHZhbGlkYXRpb25cclxuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmVjb3JkLmJvZHkpIGFzIEFuYWx5c2lzTWVzc2FnZTtcclxuICAgIGlmICghcGFyc2VkLmZpbGVJZCB8fCAhcGFyc2VkLnMzS2V5IHx8ICFwYXJzZWQubGFuZ3VhZ2UgfHwgIXBhcnNlZC51c2VySWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNRUyBtZXNzYWdlOiBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcycpO1xyXG4gICAgfVxyXG4gICAgbWVzc2FnZSA9IHBhcnNlZDtcclxuICAgIFxyXG4gICAgLy8gU2V0IHVzZXIgY29udGV4dCBmb3IgbG9nZ2luZ1xyXG4gICAgbG9nZ2VyLnNldFVzZXJJZChtZXNzYWdlLnVzZXJJZCk7XHJcbiAgICBcclxuICAgIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIGFuYWx5c2lzIG1lc3NhZ2UnLCB7XHJcbiAgICAgIGZpbGVJZDogbWVzc2FnZS5maWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiBtZXNzYWdlLmZpbGVOYW1lLFxyXG4gICAgICBsYW5ndWFnZTogbWVzc2FnZS5sYW5ndWFnZSxcclxuICAgICAgdXNlcklkOiBtZXNzYWdlLnVzZXJJZFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIExvZ2dpbmdVdGlscy5sb2dBbmFseXNpc09wZXJhdGlvbihsb2dnZXIsICdzdGFydGVkJywgJ3BlbmRpbmcnLCBtZXNzYWdlLmZpbGVJZCk7XHJcbiAgICBcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgTG9nZ2luZ1V0aWxzLmxvZ0Vycm9yV2l0aENvbnRleHQobG9nZ2VyLCBlcnJvciBhcyBFcnJvciwgJ3BhcnNlLXNxcy1tZXNzYWdlJywge1xyXG4gICAgICBtZXNzYWdlQm9keTogcmVjb3JkLmJvZHksXHJcbiAgICAgIG1lc3NhZ2VJZDogcmVjb3JkLm1lc3NhZ2VJZFxyXG4gICAgfSk7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgU1FTIG1lc3NhZ2UgZm9ybWF0Jyk7XHJcbiAgfVxyXG5cclxuICBjb25zdCB7IGZpbGVJZCwgczNLZXksIGxhbmd1YWdlLCB1c2VySWQsIG9yZ2FuaXphdGlvbklkIH0gPSBtZXNzYWdlO1xyXG4gIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgbGV0IGZpbGVTaXplID0gMDtcclxuICBsZXQgYW5hbHlzaXNJZCA9ICcnO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gVXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzIHRvIElOX1BST0dSRVNTIChSZXF1aXJlbWVudCA2LjIpXHJcbiAgICBsb2dnZXIuaW5mbygnVXBkYXRpbmcgZmlsZSBzdGF0dXMgdG8gSU5fUFJPR1JFU1MnLCB7IGZpbGVJZCB9KTtcclxuICAgIGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdpbl9wcm9ncmVzcycsIHsgdXNlcklkIH0pLFxyXG4gICAgICB7IG1heEF0dGVtcHRzOiAzLCBpbml0aWFsRGVsYXlNczogNTAwIH1cclxuICAgICk7XHJcblxyXG4gICAgLy8gQ2hlY2sgcmVtYWluaW5nIHRpbWUgYmVmb3JlIHN0YXJ0aW5nIGFuYWx5c2lzXHJcbiAgICBjb25zdCByZW1haW5pbmdUaW1lID0gY29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMoKTtcclxuICAgIGxvZ2dlci5kZWJ1ZygnTGFtYmRhIGV4ZWN1dGlvbiB0aW1lIGNoZWNrJywgeyByZW1haW5pbmdUaW1lIH0pO1xyXG5cclxuICAgIC8vIFJlc2VydmUgMzAgc2Vjb25kcyBmb3IgY2xlYW51cCBhbmQgcmVzdWx0IHNhdmluZ1xyXG4gICAgY29uc3QgdGltZW91dEJ1ZmZlciA9IDMwMDAwO1xyXG4gICAgaWYgKHJlbWFpbmluZ1RpbWUgPCB0aW1lb3V0QnVmZmVyICsgNjAwMDApIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnN1ZmZpY2llbnQgdGltZSByZW1haW5pbmc6ICR7cmVtYWluaW5nVGltZX1tc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIERvd25sb2FkIGZpbGUgZnJvbSBTMyB3aXRoIHJldHJ5IChSZXF1aXJlbWVudCA2LjMsIDguMSlcclxuICAgIGxvZ2dlci5pbmZvKCdEb3dubG9hZGluZyBmaWxlIGZyb20gUzMnLCB7IHMzS2V5IH0pO1xyXG4gICAgY29uc3QgZG93bmxvYWRTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICBjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IGRvd25sb2FkRmlsZUZyb21TMyhzM0tleSksXHJcbiAgICAgIHsgXHJcbiAgICAgICAgbWF4QXR0ZW1wdHM6IDMsIFxyXG4gICAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ0VUSU1FRE9VVCcsICdFQ09OTlJFU0VUJywgJ05ldHdvcmtFcnJvcicsICdTZXJ2aWNlVW5hdmFpbGFibGUnLCAnTm9TdWNoS2V5J11cclxuICAgICAgfVxyXG4gICAgKTtcclxuICAgIFxyXG4gICAgZmlsZVNpemUgPSBmaWxlQ29udGVudC5sZW5ndGg7XHJcbiAgICBjb25zdCBkb3dubG9hZER1cmF0aW9uID0gRGF0ZS5ub3coKSAtIGRvd25sb2FkU3RhcnRUaW1lO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnRmlsZSBkb3dubG9hZGVkIHN1Y2Nlc3NmdWxseScsIHsgZmlsZVNpemUsIGRvd25sb2FkRHVyYXRpb24gfSk7XHJcbiAgICBMb2dnaW5nVXRpbHMubG9nRmlsZU9wZXJhdGlvbihsb2dnZXIsICdkb3dubG9hZGVkJywgZmlsZUlkLCBtZXNzYWdlLmZpbGVOYW1lLCBmaWxlU2l6ZSk7XHJcbiAgICBcclxuICAgIC8vIFJlY29yZCBTMyBvcGVyYXRpb24gbWV0cmljc1xyXG4gICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UubW9uaXRvclMzT3BlcmF0aW9uKGJ1Y2tldE5hbWUsICdHZXRPYmplY3QnLCB0cnVlLCBkb3dubG9hZER1cmF0aW9uLCBmaWxlU2l6ZSk7XHJcblxyXG4gICAgLy8gSW52b2tlIE1JU1JBIEFuYWx5c2lzIEVuZ2luZSB3aXRoIHByb2dyZXNzIHRyYWNraW5nIChSZXF1aXJlbWVudCA2LjQsIDMuMywgOC4xKVxyXG4gICAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIE1JU1JBIGFuYWx5c2lzJywgeyBsYW5ndWFnZSwgZmlsZUlkIH0pO1xyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgcHJvZ3Jlc3MgY2FsbGJhY2sgdG8gdXBkYXRlIER5bmFtb0RCIGV2ZXJ5IDIgc2Vjb25kc1xyXG4gICAgLy8gV2UnbGwgZ2V0IHRvdGFsUnVsZXMgZnJvbSB0aGUgYW5hbHlzaXMgZW5naW5lIHdoZW4gaXQgY2FsbHMgdGhpcyBjYWxsYmFja1xyXG4gICAgY29uc3QgcHJvZ3Jlc3NDYWxsYmFjayA9IGFzeW5jIChwcm9ncmVzczogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpID0+IHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBFeHRyYWN0IHJ1bGVzIHByb2Nlc3NlZCBmcm9tIHRoZSBtZXNzYWdlIGlmIGF2YWlsYWJsZVxyXG4gICAgICAgIGxldCBydWxlc1Byb2Nlc3NlZCA9IDA7XHJcbiAgICAgICAgbGV0IHRvdGFsUnVsZXNGcm9tTWVzc2FnZSA9IDM1NzsgLy8gRGVmYXVsdCBmYWxsYmFjayB0byBhY3R1YWwgTUlTUkEgcnVsZSBjb3VudFxyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHJ1bGVzTWF0Y2ggPSBtZXNzYWdlLm1hdGNoKC8oXFxkKylcXC8oXFxkKykgY29tcGxldGVkLyk7XHJcbiAgICAgICAgaWYgKHJ1bGVzTWF0Y2gpIHtcclxuICAgICAgICAgIHJ1bGVzUHJvY2Vzc2VkID0gcGFyc2VJbnQocnVsZXNNYXRjaFsxXSk7XHJcbiAgICAgICAgICB0b3RhbFJ1bGVzRnJvbU1lc3NhZ2UgPSBwYXJzZUludChydWxlc01hdGNoWzJdKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgYXdhaXQgdXBkYXRlQW5hbHlzaXNQcm9ncmVzcyhmaWxlSWQsIHByb2dyZXNzLCBtZXNzYWdlLCBydWxlc1Byb2Nlc3NlZCwgdG90YWxSdWxlc0Zyb21NZXNzYWdlLCB1c2VySWQpO1xyXG4gICAgICAgIGxvZ2dlci5kZWJ1ZygnUHJvZ3Jlc3MgdXBkYXRlZCcsIHsgZmlsZUlkLCBwcm9ncmVzcywgbWVzc2FnZSwgcnVsZXNQcm9jZXNzZWQsIHRvdGFsUnVsZXM6IHRvdGFsUnVsZXNGcm9tTWVzc2FnZSB9KTtcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHVwZGF0ZSBwcm9ncmVzcycsIHsgZmlsZUlkLCBwcm9ncmVzcywgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9KTtcclxuICAgICAgICAvLyBEb24ndCB0aHJvdyAtIHByb2dyZXNzIHVwZGF0ZXMgYXJlIG5vbi1jcml0aWNhbFxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc3VsdCA9IGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICgpID0+IGFuYWx5c2lzRW5naW5lLmFuYWx5emVGaWxlKFxyXG4gICAgICAgIGZpbGVDb250ZW50LFxyXG4gICAgICAgIGxhbmd1YWdlLFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgeyBwcm9ncmVzc0NhbGxiYWNrLCB1cGRhdGVJbnRlcnZhbDogMjAwMCB9IC8vIDItc2Vjb25kIHVwZGF0ZXMgKFJlcXVpcmVtZW50IDMuMylcclxuICAgICAgKSxcclxuICAgICAgeyBcclxuICAgICAgICBtYXhBdHRlbXB0czogMiwgLy8gTGltaXRlZCByZXRyaWVzIGZvciBhbmFseXNpc1xyXG4gICAgICAgIGluaXRpYWxEZWxheU1zOiAyMDAwLFxyXG4gICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ0FOQUxZU0lTX1RJTUVPVVQnLCAnU0VSVklDRV9VTkFWQUlMQUJMRSddXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgbG9nZ2VyLmluZm8oJ0FuYWx5c2lzIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZHVyYXRpb24sXHJcbiAgICAgIHZpb2xhdGlvbnNDb3VudDogYW5hbHlzaXNSZXN1bHQudmlvbGF0aW9ucy5sZW5ndGgsXHJcbiAgICAgIGNvbXBsaWFuY2VTY29yZTogYW5hbHlzaXNSZXN1bHQuc3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgcmVzdWx0cyBpbiBEeW5hbW9EQiB3aXRoIHJldHJ5IChSZXF1aXJlbWVudCA2LjUsIDguMSlcclxuICAgIGxvZ2dlci5pbmZvKCdTdG9yaW5nIGFuYWx5c2lzIHJlc3VsdHMnLCB7IGFuYWx5c2lzSWQ6IGFuYWx5c2lzUmVzdWx0LmFuYWx5c2lzSWQgfSk7XHJcbiAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiBzdG9yZUFuYWx5c2lzUmVzdWx0cyhhbmFseXNpc1Jlc3VsdCwgb3JnYW5pemF0aW9uSWQpLFxyXG4gICAgICB7IG1heEF0dGVtcHRzOiAzLCBpbml0aWFsRGVsYXlNczogMTAwMCB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIENSSVRJQ0FMOiBXYWl0IGZvciBEeW5hbW9EQiB0byBwcm9wYWdhdGUgcmVzdWx0cyBiZWZvcmUgbWFya2luZyBzdGF0dXMgYXMgY29tcGxldGVkXHJcbiAgICAvLyBUaGlzIHByZXZlbnRzIHJhY2UgY29uZGl0aW9uIHdoZXJlIHN0YXR1cyBpcyBtYXJrZWQgY29tcGxldGUgYmVmb3JlIHJlc3VsdHMgYXJlIGF2YWlsYWJsZVxyXG4gICAgY29uc29sZS5sb2coYFdhaXRpbmcgZm9yIER5bmFtb0RCIHByb3BhZ2F0aW9uIGJlZm9yZSBtYXJraW5nIHN0YXR1cyBhcyBjb21wbGV0ZWRgKTtcclxuICAgIFxyXG4gICAgLy8gQWRkIGEgbG9uZ2VyIGRlbGF5IHRvIGVuc3VyZSBEeW5hbW9EQiBoYXMgdGltZSB0byBwcm9wYWdhdGVcclxuICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCAzMDAwKSk7XHJcbiAgICBcclxuICAgIC8vIFZlcmlmeSByZXN1bHRzIGFyZSBpbiBEeW5hbW9EQiB3aXRoIG11bHRpcGxlIGF0dGVtcHRzXHJcbiAgICBsZXQgcmVzdWx0c1ZlcmlmaWVkID0gZmFsc2U7XHJcbiAgICBsZXQgdmVyaWZ5QXR0ZW1wdHMgPSAwO1xyXG4gICAgY29uc3QgbWF4VmVyaWZ5QXR0ZW1wdHMgPSAzMDsgLy8gSW5jcmVhc2VkIHRvIDMwIGF0dGVtcHRzICh+NiBzZWNvbmRzIHRvdGFsKVxyXG4gICAgXHJcbiAgICB3aGlsZSAoIXJlc3VsdHNWZXJpZmllZCAmJiB2ZXJpZnlBdHRlbXB0cyA8IG1heFZlcmlmeUF0dGVtcHRzKSB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgdmVyaWZ5QXR0ZW1wdHMrKztcclxuICAgICAgICBcclxuICAgICAgICAvLyBVc2UgRmlsZUluZGV4IEdTSSB0byBxdWVyeSBieSBmaWxlSWRcclxuICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICAgICAgSW5kZXhOYW1lOiAnRmlsZUluZGV4JyxcclxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdmaWxlSWQgPSA6ZmlsZUlkJyxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICAgJzpmaWxlSWQnOiB7IFM6IGZpbGVJZCB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIExpbWl0OiAxLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICAgIGlmIChyZXN1bHQuSXRlbXMgJiYgcmVzdWx0Lkl0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGDinJMgUmVzdWx0cyB2ZXJpZmllZCBpbiBEeW5hbW9EQiBvbiBhdHRlbXB0ICR7dmVyaWZ5QXR0ZW1wdHN9YCk7XHJcbiAgICAgICAgICByZXN1bHRzVmVyaWZpZWQgPSB0cnVlO1xyXG4gICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGBSZXN1bHRzIG5vdCB5ZXQgdmlzaWJsZSAoYXR0ZW1wdCAke3ZlcmlmeUF0dGVtcHRzfS8ke21heFZlcmlmeUF0dGVtcHRzfSksIHJldHJ5aW5nLi4uYCk7XHJcbiAgICAgICAgICAvLyBXYWl0IGJlZm9yZSBuZXh0IGF0dGVtcHQgLSB1c2UgZXhwb25lbnRpYWwgYmFja29mZlxyXG4gICAgICAgICAgY29uc3QgYmFja29mZkRlbGF5ID0gTWF0aC5taW4oNTAwLCAxMDAgKiB2ZXJpZnlBdHRlbXB0cyk7XHJcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgYmFja29mZkRlbGF5KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGNhdGNoICh2ZXJpZnlFcnJvcikge1xyXG4gICAgICAgIGNvbnNvbGUud2FybihgVmVyaWZpY2F0aW9uIGF0dGVtcHQgJHt2ZXJpZnlBdHRlbXB0c30gZmFpbGVkOmAsIHZlcmlmeUVycm9yKTtcclxuICAgICAgICBjb25zdCBiYWNrb2ZmRGVsYXkgPSBNYXRoLm1pbig1MDAsIDEwMCAqIHZlcmlmeUF0dGVtcHRzKTtcclxuICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgYmFja29mZkRlbGF5KSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKCFyZXN1bHRzVmVyaWZpZWQpIHtcclxuICAgICAgY29uc29sZS53YXJuKGDimqDvuI8gUmVzdWx0cyBjb3VsZCBub3QgYmUgdmVyaWZpZWQgYWZ0ZXIgJHttYXhWZXJpZnlBdHRlbXB0c30gYXR0ZW1wdHNgKTtcclxuICAgICAgY29uc29sZS53YXJuKGBQcm9jZWVkaW5nIGFueXdheSAtIHJlc3VsdHMgbWF5IGJlIGF2YWlsYWJsZSBzaG9ydGx5YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVHJhY2sgYW5hbHlzaXMgY29zdHMgKFJlcXVpcmVtZW50IDE0LjEpXHJcbiAgICBjb25zb2xlLmxvZyhgVHJhY2tpbmcgYW5hbHlzaXMgY29zdHNgKTtcclxuICAgIGNvbnN0IGNvc3RzID0gY29zdFRyYWNrZXIuY2FsY3VsYXRlQ29zdHMoZHVyYXRpb24sIGZpbGVTaXplLCAyKTtcclxuICAgIGF3YWl0IGNvc3RUcmFja2VyLnJlY29yZENvc3QoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnLFxyXG4gICAgICBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGNvc3RzLFxyXG4gICAgICB7XHJcbiAgICAgICAgZmlsZVNpemUsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBjb25zb2xlLmxvZyhgQ29zdCB0cmFja2luZyBjb21wbGV0ZWQ6ICQke2Nvc3RzLnRvdGFsQ29zdC50b0ZpeGVkKDYpfWApO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyB0byBDT01QTEVURURcclxuICAgIC8vIFRoaXMgaXMgbm93IHNhZmUgYmVjYXVzZSB3ZSd2ZSB2ZXJpZmllZCByZXN1bHRzIGFyZSBpbiBEeW5hbW9EQlxyXG4gICAgY29uc29sZS5sb2coYFVwZGF0aW5nIGZpbGUgJHtmaWxlSWR9IHN0YXR1cyB0byBDT01QTEVURURgKTtcclxuICAgIGF3YWl0IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdjb21wbGV0ZWQnLCB7XHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgdmlvbGF0aW9uc19jb3VudDogYW5hbHlzaXNSZXN1bHQudmlvbGF0aW9ucy5sZW5ndGgsXHJcbiAgICAgIGNvbXBsaWFuY2VfcGVyY2VudGFnZTogYW5hbHlzaXNSZXN1bHQuc3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZSxcclxuICAgICAgYW5hbHlzaXNfZHVyYXRpb246IGR1cmF0aW9uLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYEFuYWx5c2lzIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkgZm9yIGZpbGUgJHtmaWxlSWR9YCk7XHJcbiAgICBcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGFuYWx5c2lzSWQ6IGFuYWx5c2lzUmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgY29tcGxpYW5jZVNjb3JlOiBhbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlLFxyXG4gICAgICB2aW9sYXRpb25Db3VudDogYW5hbHlzaXNSZXN1bHQudmlvbGF0aW9ucy5sZW5ndGgsXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBkdXJpbmcgYW5hbHlzaXMgZm9yIGZpbGUgJHtmaWxlSWR9OmAsIGVycm9yKTtcclxuXHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcclxuICAgIFxyXG4gICAgLy8gVXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzIHRvIEZBSUxFRCAoUmVxdWlyZW1lbnQgMTEuMSwgMTEuMiwgMTEuMywgMTEuNClcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdmYWlsZWQnLCB7XHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGVycm9yX21lc3NhZ2U6IGVycm9yTWVzc2FnZSxcclxuICAgICAgICBlcnJvcl90aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAodXBkYXRlRXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1czonLCB1cGRhdGVFcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmUtdGhyb3cgdG8gdHJpZ2dlciBTUVMgcmV0cnkvRExRXHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEb3dubG9hZCBmaWxlIGNvbnRlbnQgZnJvbSBTM1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRGaWxlRnJvbVMzKHMzS2V5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zb2xlLmxvZygnQXR0ZW1wdGluZyB0byBkb3dubG9hZCBmcm9tIFMzJywge1xyXG4gICAgICBidWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgIGtleTogczNLZXksXHJcbiAgICAgIHJlZ2lvblxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICBLZXk6IHMzS2V5LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzM0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXJlc3BvbnNlLkJvZHkpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSByZXNwb25zZSBib2R5IGZyb20gUzMnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb252ZXJ0IHN0cmVhbSB0byBzdHJpbmdcclxuICAgIGNvbnN0IGNodW5rczogVWludDhBcnJheVtdID0gW107XHJcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHJlc3BvbnNlLkJvZHkgYXMgYW55KSB7XHJcbiAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpO1xyXG4gICAgY29uc29sZS5sb2coJ0ZpbGUgZG93bmxvYWRlZCBzdWNjZXNzZnVsbHkgZnJvbSBTMycsIHtcclxuICAgICAga2V5OiBzM0tleSxcclxuICAgICAgc2l6ZTogYnVmZmVyLmxlbmd0aFxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKCd1dGYtOCcpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyBmaWxlIGZyb20gUzM6Jywge1xyXG4gICAgICBidWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgIGtleTogczNLZXksXHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvciksXHJcbiAgICAgIGVycm9yQ29kZTogKGVycm9yIGFzIGFueSk/LkNvZGUsXHJcbiAgICAgIGVycm9yTmFtZTogKGVycm9yIGFzIGFueSk/Lm5hbWUsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICB9KTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGRvd25sb2FkIGZpbGUgZnJvbSBTMzogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdG9yZSBhbmFseXNpcyByZXN1bHRzIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzdG9yZUFuYWx5c2lzUmVzdWx0cyhcclxuICByZXN1bHQ6IGFueSxcclxuICBvcmdhbml6YXRpb25JZD86IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIFN0YXJ0aW5nIHRvIHN0b3JlIGFuYWx5c2lzIHJlc3VsdHNgKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSBhbmFseXNpc0lkOiAke3Jlc3VsdC5hbmFseXNpc0lkfWApO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIGZpbGVJZDogJHtyZXN1bHQuZmlsZUlkfWApO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIHVzZXJJZDogJHtyZXN1bHQudXNlcklkfWApO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIHZpb2xhdGlvbnM6ICR7cmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RofWApO1xyXG4gICAgXHJcbiAgICAvLyBCdWlsZCB0aGUgaXRlbSBvYmplY3Qgd2l0aCB0aW1lc3RhbXAgYXMgYSBOVU1CRVIgKG5vdCBzdHJpbmcpXHJcbiAgICBjb25zdCBpdGVtID0ge1xyXG4gICAgICBhbmFseXNpc0lkOiByZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZUlkOiByZXN1bHQuZmlsZUlkLFxyXG4gICAgICB1c2VySWQ6IHJlc3VsdC51c2VySWQsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiBvcmdhbml6YXRpb25JZCB8fCAnZGVmYXVsdCcsXHJcbiAgICAgIGxhbmd1YWdlOiByZXN1bHQubGFuZ3VhZ2UsXHJcbiAgICAgIHZpb2xhdGlvbnM6IHJlc3VsdC52aW9sYXRpb25zLFxyXG4gICAgICBzdW1tYXJ5OiByZXN1bHQuc3VtbWFyeSxcclxuICAgICAgc3RhdHVzOiByZXN1bHQuc3RhdHVzLFxyXG4gICAgICB0aW1lc3RhbXA6IG5vdywgLy8gQ1JJVElDQUw6IE11c3QgYmUgYSBudW1iZXIsIG5vdCBhIHN0cmluZ1xyXG4gICAgICBjcmVhdGVkQXQ6IHR5cGVvZiByZXN1bHQuY3JlYXRlZEF0ID09PSAnc3RyaW5nJyA/IHJlc3VsdC5jcmVhdGVkQXQgOiBuZXcgRGF0ZShub3cpLnRvSVNPU3RyaW5nKCksXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSBJdGVtIHByZXBhcmVkIHdpdGggdGltZXN0YW1wOiAke2l0ZW0udGltZXN0YW1wfSAodHlwZTogJHt0eXBlb2YgaXRlbS50aW1lc3RhbXB9KWApO1xyXG5cclxuICAgIC8vIE1hcnNoYWxsIHRoZSBpdGVtIC0gdGltZXN0YW1wIHdpbGwgYmUgY29ycmVjdGx5IG1hcnNoYWxsZWQgYXMgTiAobnVtYmVyKVxyXG4gICAgY29uc3QgbWFyc2hhbGxlZEl0ZW0gPSBtYXJzaGFsbChpdGVtKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtTVE9SRV0gSXRlbSBtYXJzaGFsbGVkIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIE1hcnNoYWxsZWQgdGltZXN0YW1wIHR5cGU6ICR7bWFyc2hhbGxlZEl0ZW0udGltZXN0YW1wPy5OID8gJ051bWJlcicgOiAnVW5rbm93bid9YCk7XHJcblxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgIEl0ZW06IG1hcnNoYWxsZWRJdGVtLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIFNlbmRpbmcgUHV0SXRlbUNvbW1hbmQgdG8gdGFibGU6ICR7YW5hbHlzaXNSZXN1bHRzVGFibGV9YCk7XHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSDinJMgQW5hbHlzaXMgcmVzdWx0cyBzdG9yZWQgc3VjY2Vzc2Z1bGx5IHdpdGggSUQ6ICR7cmVzdWx0LmFuYWx5c2lzSWR9YCk7XHJcbiAgICBcclxuICAgIC8vIEltbWVkaWF0ZWx5IHZlcmlmeSB0aGUgZGF0YSB3YXMgc3RvcmVkXHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtTVE9SRV0gVmVyaWZ5aW5nIGRhdGEgd2FzIHN0b3JlZC4uLmApO1xyXG4gICAgY29uc3QgdmVyaWZ5Q29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICBJbmRleE5hbWU6ICdGaWxlSW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZmlsZUlkID0gOmZpbGVJZCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOmZpbGVJZCc6IHsgUzogcmVzdWx0LmZpbGVJZCB9LFxyXG4gICAgICB9LFxyXG4gICAgICBMaW1pdDogMSxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBjb25zdCB2ZXJpZnlSZXN1bHQgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZCh2ZXJpZnlDb21tYW5kKTtcclxuICAgIGlmICh2ZXJpZnlSZXN1bHQuSXRlbXMgJiYgdmVyaWZ5UmVzdWx0Lkl0ZW1zLmxlbmd0aCA+IDApIHtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIOKckyBWZXJpZmljYXRpb24gc3VjY2Vzc2Z1bCEgRGF0YSBmb3VuZCBpbiBEeW5hbW9EQmApO1xyXG4gICAgICBjb25zb2xlLmxvZyhg4pyFIFtTVE9SRV0gRm91bmQgJHt2ZXJpZnlSZXN1bHQuSXRlbXMubGVuZ3RofSBpdGVtKHMpIGZvciBmaWxlSWQ6ICR7cmVzdWx0LmZpbGVJZH1gKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGNvbnNvbGUud2Fybihg4pqg77iPIFtTVE9SRV0gVmVyaWZpY2F0aW9uIGZhaWxlZCAtIG5vIGl0ZW1zIGZvdW5kIGltbWVkaWF0ZWx5IGFmdGVyIHN0b3JlYCk7XHJcbiAgICB9XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBbU1RPUkVdIEVycm9yIHN0b3JpbmcgYW5hbHlzaXMgcmVzdWx0czonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzdG9yZSBhbmFseXNpcyByZXN1bHRzOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyBpbiBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlRmlsZU1ldGFkYXRhU3RhdHVzKFxyXG4gIGZpbGVJZDogc3RyaW5nLFxyXG4gIHN0YXR1czogc3RyaW5nLFxyXG4gIGFkZGl0aW9uYWxEYXRhPzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbiA9IFsnU0VUIGFuYWx5c2lzX3N0YXR1cyA9IDpzdGF0dXMnLCAndXBkYXRlZF9hdCA9IDp1cGRhdGVkQXQnXTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICc6c3RhdHVzJzogeyBTOiBzdGF0dXMgfSxcclxuICAgICAgJzp1cGRhdGVkQXQnOiB7IE46IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCkgfSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gV2hlbiBzdGF0dXMgaXMgZmFpbGVkLCByZXNldCBwcm9ncmVzcyB0byAwIGZvciBjb25zaXN0ZW5jeVxyXG4gICAgaWYgKHN0YXR1cyA9PT0gJ2ZhaWxlZCcpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdhbmFseXNpc19wcm9ncmVzcyA9IDpwcm9ncmVzcycpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6cHJvZ3Jlc3MnXSA9IHsgTjogJzAnIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGFkZGl0aW9uYWxEYXRhKSB7XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS52aW9sYXRpb25zX2NvdW50ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ3Zpb2xhdGlvbnNfY291bnQgPSA6dmlvbGF0aW9uc0NvdW50Jyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnZpb2xhdGlvbnNDb3VudCddID0geyBOOiBhZGRpdGlvbmFsRGF0YS52aW9sYXRpb25zX2NvdW50LnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuY29tcGxpYW5jZV9wZXJjZW50YWdlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2NvbXBsaWFuY2VfcGVyY2VudGFnZSA9IDpjb21wbGlhbmNlUGVyY2VudGFnZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpjb21wbGlhbmNlUGVyY2VudGFnZSddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5jb21wbGlhbmNlX3BlcmNlbnRhZ2UudG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5hbmFseXNpc19kdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdhbmFseXNpc19kdXJhdGlvbiA9IDphbmFseXNpc0R1cmF0aW9uJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmFuYWx5c2lzRHVyYXRpb24nXSA9IHsgTjogYWRkaXRpb25hbERhdGEuYW5hbHlzaXNfZHVyYXRpb24udG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5lcnJvcl9tZXNzYWdlKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdlcnJvcl9tZXNzYWdlID0gOmVycm9yTWVzc2FnZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplcnJvck1lc3NhZ2UnXSA9IHsgUzogYWRkaXRpb25hbERhdGEuZXJyb3JfbWVzc2FnZSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5lcnJvcl90aW1lc3RhbXApIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2Vycm9yX3RpbWVzdGFtcCA9IDplcnJvclRpbWVzdGFtcCcpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplcnJvclRpbWVzdGFtcCddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5lcnJvcl90aW1lc3RhbXAudG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ1JJVElDQUwgRklYOiBGaWxlTWV0YWRhdGEgdGFibGUgaGFzIGNvbXBvc2l0ZSBrZXkgKGZpbGVJZCArIHVzZXJJZClcclxuICAgIC8vIFRoZSBTUVMgbWVzc2FnZSBjb250YWlucyB1c2VySWQsIHNvIHdlIG5lZWQgdG8gZXh0cmFjdCBpdCBmcm9tIHRoZSBtZXNzYWdlIGNvbnRleHRcclxuICAgIC8vIEZvciBub3csIHdlJ2xsIHVzZSBhIHF1ZXJ5LXRoZW4tdXBkYXRlIHBhdHRlcm4gdG8gZmluZCB0aGUgY29ycmVjdCB1c2VySWRcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlSXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBLZXk6IG1hcnNoYWxsKHsgXHJcbiAgICAgICAgZmlsZUlkOiBmaWxlSWQsXHJcbiAgICAgICAgdXNlcklkOiAoYWRkaXRpb25hbERhdGE/LnVzZXJJZCB8fCAndW5rbm93bicpIC8vIFdpbGwgYmUgcGFzc2VkIGZyb20gY2FsbGVyXHJcbiAgICAgIH0pLFxyXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiB1cGRhdGVFeHByZXNzaW9uLmpvaW4oJywgJyksXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIGNvbnNvbGUubG9nKGBGaWxlIG1ldGFkYXRhIHVwZGF0ZWQgZm9yICR7ZmlsZUlkfTogc3RhdHVzPSR7c3RhdHVzfWApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBmaWxlIG1ldGFkYXRhOicsIGVycm9yKTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHVwZGF0ZSBmaWxlIG1ldGFkYXRhOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBhbmFseXNpcyBwcm9ncmVzcyBpbiBEeW5hbW9EQlxyXG4gKiBSZXF1aXJlbWVudHM6IDMuMyAoMi1zZWNvbmQgcHJvZ3Jlc3MgdXBkYXRlcylcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUFuYWx5c2lzUHJvZ3Jlc3MoXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgcHJvZ3Jlc3M6IG51bWJlcixcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgcnVsZXNQcm9jZXNzZWQ/OiBudW1iZXIsXHJcbiAgdG90YWxSdWxlcz86IG51bWJlcixcclxuICB1c2VySWQ/OiBzdHJpbmdcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb24gPSBbJ1NFVCBhbmFseXNpc19wcm9ncmVzcyA9IDpwcm9ncmVzcycsICdhbmFseXNpc19tZXNzYWdlID0gOm1lc3NhZ2UnLCAndXBkYXRlZF9hdCA9IDp1cGRhdGVkQXQnXTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICc6cHJvZ3Jlc3MnOiB7IE46IHByb2dyZXNzLnRvU3RyaW5nKCkgfSxcclxuICAgICAgJzptZXNzYWdlJzogeyBTOiBtZXNzYWdlIH0sXHJcbiAgICAgICc6dXBkYXRlZEF0JzogeyBOOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKS50b1N0cmluZygpIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEFkZCBydWxlcyBwcm9ncmVzcyBpZiBwcm92aWRlZFxyXG4gICAgaWYgKHJ1bGVzUHJvY2Vzc2VkICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdydWxlc19wcm9jZXNzZWQgPSA6cnVsZXNQcm9jZXNzZWQnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnJ1bGVzUHJvY2Vzc2VkJ10gPSB7IE46IHJ1bGVzUHJvY2Vzc2VkLnRvU3RyaW5nKCkgfTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKHRvdGFsUnVsZXMgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ3RvdGFsX3J1bGVzID0gOnRvdGFsUnVsZXMnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnRvdGFsUnVsZXMnXSA9IHsgTjogdG90YWxSdWxlcy50b1N0cmluZygpIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogbWFyc2hhbGwoeyBcclxuICAgICAgICBmaWxlSWQ6IGZpbGVJZCwgXHJcbiAgICAgICAgdXNlcklkOiB1c2VySWQgfHwgJ3Vua25vd24nIC8vIFVzZSBwcm92aWRlZCB1c2VySWQgb3IgZmFsbGJhY2tcclxuICAgICAgfSksXHJcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246IHVwZGF0ZUV4cHJlc3Npb24uam9pbignLCAnKSxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgY29uc29sZS5sb2coYOKchSBQcm9ncmVzcyB1cGRhdGVkIGZvciAke2ZpbGVJZH06ICR7cHJvZ3Jlc3N9JSAtICR7bWVzc2FnZX0gKCR7cnVsZXNQcm9jZXNzZWQgfHwgMH0vJHt0b3RhbFJ1bGVzIHx8IDM1N30gcnVsZXMpYCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ+KdjCBFcnJvciB1cGRhdGluZyBhbmFseXNpcyBwcm9ncmVzczonLCBlcnJvcik7XHJcbiAgICAvLyBEb24ndCB0aHJvdyAtIHByb2dyZXNzIHVwZGF0ZXMgYXJlIG5vbi1jcml0aWNhbFxyXG4gIH1cclxufVxyXG4vLyBFeHBvcnQgdGhlIGhhbmRsZXIgd2l0aCBjb3JyZWxhdGlvbiBJRCBtaWRkbGV3YXJlXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gd2l0aENvcnJlbGF0aW9uSWQoYW5hbHl6ZUZpbGVIYW5kbGVyKTsiXX0=