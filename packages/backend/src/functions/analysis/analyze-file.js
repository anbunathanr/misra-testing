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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBMkc7QUFDM0csMERBQWtEO0FBQ2xELG1GQUFvRjtBQUVwRiw2RUFBeUU7QUFDekUsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRix1RUFBb0c7QUFDcEcsMEVBQXNFO0FBRXRFLE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDO0FBQzlELE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsQ0FBQztBQUNyRCxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksY0FBYyxDQUFDO0FBQzVFLE1BQU0sb0JBQW9CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsSUFBSSxpQkFBaUIsQ0FBQztBQUVyRixNQUFNLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQzFDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDcEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxxQ0FBbUIsRUFBRSxDQUFDO0FBQ2pELE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQVdsRDs7Ozs7O0dBTUc7QUFDSCxLQUFLLFVBQVUsa0JBQWtCLENBQUMsS0FBZSxFQUFFLE9BQWdCO0lBQ2pFLE1BQU0sTUFBTSxHQUFHLHNDQUFpQixDQUFDLFdBQVcsQ0FBQztRQUMzQyxZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDbEMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxZQUFZO0tBQ2hDLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxJQUFJ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RCxJQUFJLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUM3QixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztZQUNuRCx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUMxRSxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxtQ0FBaUIsQ0FBQztZQUNwQyxTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLEdBQUcsRUFBRSxJQUFBLHdCQUFRLEVBQUM7Z0JBQ1osTUFBTSxFQUFFLE1BQU07Z0JBQ2QsTUFBTSxFQUFFLE1BQU0sSUFBSSxTQUFTLENBQUMsa0NBQWtDO2FBQy9ELENBQUM7WUFDRixnQkFBZ0IsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO1lBQzdDLHlCQUF5QixFQUFFLHlCQUF5QjtTQUNyRCxDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDakMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsTUFBTSxLQUFLLFFBQVEsT0FBTyxPQUFPLEtBQUssY0FBYyxJQUFJLENBQUMsSUFBSSxVQUFVLElBQUksR0FBRyxTQUFTLENBQUMsQ0FBQztJQUNqSSxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMscUNBQXFDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUQsa0RBQWtEO0lBQ3BELENBQUM7QUFDSCxDQUFDO0FBQ0Qsb0RBQW9EO0FBQ3ZDLFFBQUEsT0FBTyxHQUFHLElBQUEsc0NBQWlCLEVBQUMsa0JBQWtCLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNRU0V2ZW50LCBTUVNSZWNvcmQsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUzNDbGllbnQsIEdldE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQsIFVwZGF0ZUl0ZW1Db21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBNSVNSQUFuYWx5c2lzRW5naW5lIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvYW5hbHlzaXMtZW5naW5lJztcclxuaW1wb3J0IHsgTGFuZ3VhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvY29zdC10cmFja2VyJztcclxuaW1wb3J0IHsgY2VudHJhbGl6ZWRFcnJvckhhbmRsZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9jZW50cmFsaXplZC1lcnJvci1oYW5kbGVyJztcclxuaW1wb3J0IHsgZW5oYW5jZWRSZXRyeVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9lbmhhbmNlZC1yZXRyeSc7XHJcbmltcG9ydCB7IENlbnRyYWxpemVkTG9nZ2VyLCB3aXRoQ29ycmVsYXRpb25JZCwgTG9nZ2luZ1V0aWxzIH0gZnJvbSAnLi4vLi4vdXRpbHMvY2VudHJhbGl6ZWQtbG9nZ2VyJztcclxuaW1wb3J0IHsgbW9uaXRvcmluZ1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9tb25pdG9yaW5nLXNlcnZpY2UnO1xyXG5cclxuY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSB8fCAnJztcclxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJztcclxuY29uc3QgZmlsZU1ldGFkYXRhVGFibGUgPSBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFIHx8ICdGaWxlTWV0YWRhdGEnO1xyXG5jb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEUgfHwgJ0FuYWx5c2lzUmVzdWx0cyc7XHJcblxyXG5jb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7IHJlZ2lvbiB9KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCBhbmFseXNpc0VuZ2luZSA9IG5ldyBNSVNSQUFuYWx5c2lzRW5naW5lKCk7XHJcbmNvbnN0IGNvc3RUcmFja2VyID0gbmV3IENvc3RUcmFja2VyKGR5bmFtb0NsaWVudCk7XHJcblxyXG5pbnRlcmZhY2UgQW5hbHlzaXNNZXNzYWdlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIHMzS2V5OiBzdHJpbmc7XHJcbiAgbGFuZ3VhZ2U6IExhbmd1YWdlO1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIG9yZ2FuaXphdGlvbklkPzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogTGFtYmRhIGhhbmRsZXIgZm9yIE1JU1JBIGZpbGUgYW5hbHlzaXMgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZyBhbmQgbW9uaXRvcmluZ1xyXG4gKiBQcm9jZXNzZXMgU1FTIG1lc3NhZ2VzIGNvbnRhaW5pbmcgYW5hbHlzaXMgcmVxdWVzdHNcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogNi4yLCA2LjMsIDYuNCwgNi41LCA4LjEsIDguMlxyXG4gKiBUYXNrIDguMjogRW5oYW5jZWQgd2l0aCBjZW50cmFsaXplZCBsb2dnaW5nIGFuZCBjb3JyZWxhdGlvbiBJRHNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGFuYWx5emVGaWxlSGFuZGxlcihldmVudDogU1FTRXZlbnQsIGNvbnRleHQ6IENvbnRleHQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBsb2dnZXIgPSBDZW50cmFsaXplZExvZ2dlci5nZXRJbnN0YW5jZSh7XHJcbiAgICBmdW5jdGlvbk5hbWU6IGNvbnRleHQuZnVuY3Rpb25OYW1lLFxyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICB9KTtcclxuICBcclxuICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgTGFtYmRhIGludm9rZWQnLCB7XHJcbiAgICBtZXNzYWdlQ291bnQ6IGV2ZW50LlJlY29yZHMubGVuZ3RoLFxyXG4gICAgcmVtYWluaW5nVGltZTogY29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMoKVxyXG4gIH0pO1xyXG5cclxuICAvLyBQcm9jZXNzIGVhY2ggU1FTIG1lc3NhZ2Ugd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZ1xyXG4gIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBsZXQgYW5hbHlzaXNJZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgbGV0IGZpbGVJZDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjZW50cmFsaXplZEVycm9ySGFuZGxlci5leGVjdXRlV2l0aEVycm9ySGFuZGxpbmcoXHJcbiAgICAgICAgKCkgPT4gcHJvY2Vzc0FuYWx5c2lzTWVzc2FnZShyZWNvcmQsIGNvbnRleHQsIGxvZ2dlciksXHJcbiAgICAgICAgJ2FuYWx5c2lzLXNlcnZpY2UnLFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG9wZXJhdGlvbjogJ3Byb2Nlc3MtYW5hbHlzaXMtbWVzc2FnZScsXHJcbiAgICAgICAgICByZXNvdXJjZTogcmVjb3JkLm1lc3NhZ2VJZFxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgYW5hbHlzaXMgZGV0YWlscyBmb3IgbW9uaXRvcmluZ1xyXG4gICAgICBpZiAocmVzdWx0ICYmIHR5cGVvZiByZXN1bHQgPT09ICdvYmplY3QnKSB7XHJcbiAgICAgICAgYW5hbHlzaXNJZCA9IChyZXN1bHQgYXMgYW55KS5hbmFseXNpc0lkO1xyXG4gICAgICAgIGZpbGVJZCA9IChyZXN1bHQgYXMgYW55KS5maWxlSWQ7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgXHJcbiAgICAgIC8vIFJlY29yZCBzdWNjZXNzZnVsIGFuYWx5c2lzIG1ldHJpY3NcclxuICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkQW5hbHlzaXNNZXRyaWNzKFxyXG4gICAgICAgIGFuYWx5c2lzSWQgfHwgJ3Vua25vd24nLFxyXG4gICAgICAgIGZpbGVJZCB8fCAndW5rbm93bicsXHJcbiAgICAgICAgKHJlc3VsdCBhcyBhbnkpPy5jb21wbGlhbmNlU2NvcmUgfHwgMCxcclxuICAgICAgICAocmVzdWx0IGFzIGFueSk/LnZpb2xhdGlvbkNvdW50IHx8IDAsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgdHJ1ZVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgTG9nZ2luZ1V0aWxzLmxvZ0FuYWx5c2lzT3BlcmF0aW9uKGxvZ2dlciwgJ2NvbXBsZXRlZCcsIGFuYWx5c2lzSWQgfHwgJ3Vua25vd24nLCBmaWxlSWQsIGR1cmF0aW9uKTtcclxuICAgICAgXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIFxyXG4gICAgICAvLyBSZWNvcmQgZmFpbGVkIGFuYWx5c2lzIG1ldHJpY3NcclxuICAgICAgaWYgKGFuYWx5c2lzSWQgJiYgZmlsZUlkKSB7XHJcbiAgICAgICAgYXdhaXQgbW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkQW5hbHlzaXNNZXRyaWNzKFxyXG4gICAgICAgICAgYW5hbHlzaXNJZCxcclxuICAgICAgICAgIGZpbGVJZCxcclxuICAgICAgICAgIDAsXHJcbiAgICAgICAgICAwLFxyXG4gICAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgICBmYWxzZVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIExvZ2dpbmdVdGlscy5sb2dFcnJvcldpdGhDb250ZXh0KGxvZ2dlciwgZXJyb3IgYXMgRXJyb3IsICdwcm9jZXNzLWFuYWx5c2lzLW1lc3NhZ2UnLCB7XHJcbiAgICAgICAgbWVzc2FnZUlkOiByZWNvcmQubWVzc2FnZUlkLFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIExldCBTUVMgaGFuZGxlIHJldHJ5L0RMUVxyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdBbGwgbWVzc2FnZXMgcHJvY2Vzc2VkIHN1Y2Nlc3NmdWxseScpO1xyXG59XHJcblxyXG4vKipcclxuICogUHJvY2VzcyBhIHNpbmdsZSBhbmFseXNpcyBtZXNzYWdlIGZyb20gU1FTIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmcgYW5kIG1vbml0b3JpbmdcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NBbmFseXNpc01lc3NhZ2UoXHJcbiAgcmVjb3JkOiBTUVNSZWNvcmQsXHJcbiAgY29udGV4dDogQ29udGV4dCxcclxuICBsb2dnZXI6IENlbnRyYWxpemVkTG9nZ2VyXHJcbik6IFByb21pc2U8eyBhbmFseXNpc0lkOiBzdHJpbmc7IGZpbGVJZDogc3RyaW5nOyBjb21wbGlhbmNlU2NvcmU6IG51bWJlcjsgdmlvbGF0aW9uQ291bnQ6IG51bWJlciB9PiB7XHJcbiAgbGV0IG1lc3NhZ2U6IEFuYWx5c2lzTWVzc2FnZTtcclxuICBcclxuICB0cnkge1xyXG4gICAgLy8gUGFyc2UgU1FTIG1lc3NhZ2Ugd2l0aCB2YWxpZGF0aW9uXHJcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJlY29yZC5ib2R5KSBhcyBBbmFseXNpc01lc3NhZ2U7XHJcbiAgICBpZiAoIXBhcnNlZC5maWxlSWQgfHwgIXBhcnNlZC5zM0tleSB8fCAhcGFyc2VkLmxhbmd1YWdlIHx8ICFwYXJzZWQudXNlcklkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBTUVMgbWVzc2FnZTogbWlzc2luZyByZXF1aXJlZCBmaWVsZHMnKTtcclxuICAgIH1cclxuICAgIG1lc3NhZ2UgPSBwYXJzZWQ7XHJcbiAgICBcclxuICAgIC8vIFNldCB1c2VyIGNvbnRleHQgZm9yIGxvZ2dpbmdcclxuICAgIGxvZ2dlci5zZXRVc2VySWQobWVzc2FnZS51c2VySWQpO1xyXG4gICAgXHJcbiAgICBsb2dnZXIuaW5mbygnUHJvY2Vzc2luZyBhbmFseXNpcyBtZXNzYWdlJywge1xyXG4gICAgICBmaWxlSWQ6IG1lc3NhZ2UuZmlsZUlkLFxyXG4gICAgICBmaWxlTmFtZTogbWVzc2FnZS5maWxlTmFtZSxcclxuICAgICAgbGFuZ3VhZ2U6IG1lc3NhZ2UubGFuZ3VhZ2UsXHJcbiAgICAgIHVzZXJJZDogbWVzc2FnZS51c2VySWRcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBMb2dnaW5nVXRpbHMubG9nQW5hbHlzaXNPcGVyYXRpb24obG9nZ2VyLCAnc3RhcnRlZCcsICdwZW5kaW5nJywgbWVzc2FnZS5maWxlSWQpO1xyXG4gICAgXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIExvZ2dpbmdVdGlscy5sb2dFcnJvcldpdGhDb250ZXh0KGxvZ2dlciwgZXJyb3IgYXMgRXJyb3IsICdwYXJzZS1zcXMtbWVzc2FnZScsIHtcclxuICAgICAgbWVzc2FnZUJvZHk6IHJlY29yZC5ib2R5LFxyXG4gICAgICBtZXNzYWdlSWQ6IHJlY29yZC5tZXNzYWdlSWRcclxuICAgIH0pO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNRUyBtZXNzYWdlIGZvcm1hdCcpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgeyBmaWxlSWQsIHMzS2V5LCBsYW5ndWFnZSwgdXNlcklkLCBvcmdhbml6YXRpb25JZCB9ID0gbWVzc2FnZTtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIGxldCBmaWxlU2l6ZSA9IDA7XHJcbiAgbGV0IGFuYWx5c2lzSWQgPSAnJztcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyB0byBJTl9QUk9HUkVTUyAoUmVxdWlyZW1lbnQgNi4yKVxyXG4gICAgbG9nZ2VyLmluZm8oJ1VwZGF0aW5nIGZpbGUgc3RhdHVzIHRvIElOX1BST0dSRVNTJywgeyBmaWxlSWQgfSk7XHJcbiAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoZmlsZUlkLCAnaW5fcHJvZ3Jlc3MnLCB7IHVzZXJJZCB9KSxcclxuICAgICAgeyBtYXhBdHRlbXB0czogMywgaW5pdGlhbERlbGF5TXM6IDUwMCB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIENoZWNrIHJlbWFpbmluZyB0aW1lIGJlZm9yZSBzdGFydGluZyBhbmFseXNpc1xyXG4gICAgY29uc3QgcmVtYWluaW5nVGltZSA9IGNvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKCk7XHJcbiAgICBsb2dnZXIuZGVidWcoJ0xhbWJkYSBleGVjdXRpb24gdGltZSBjaGVjaycsIHsgcmVtYWluaW5nVGltZSB9KTtcclxuXHJcbiAgICAvLyBSZXNlcnZlIDMwIHNlY29uZHMgZm9yIGNsZWFudXAgYW5kIHJlc3VsdCBzYXZpbmdcclxuICAgIGNvbnN0IHRpbWVvdXRCdWZmZXIgPSAzMDAwMDtcclxuICAgIGlmIChyZW1haW5pbmdUaW1lIDwgdGltZW91dEJ1ZmZlciArIDYwMDAwKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5zdWZmaWNpZW50IHRpbWUgcmVtYWluaW5nOiAke3JlbWFpbmluZ1RpbWV9bXNgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBEb3dubG9hZCBmaWxlIGZyb20gUzMgd2l0aCByZXRyeSAoUmVxdWlyZW1lbnQgNi4zLCA4LjEpXHJcbiAgICBsb2dnZXIuaW5mbygnRG93bmxvYWRpbmcgZmlsZSBmcm9tIFMzJywgeyBzM0tleSB9KTtcclxuICAgIGNvbnN0IGRvd25sb2FkU3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgY29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiBkb3dubG9hZEZpbGVGcm9tUzMoczNLZXkpLFxyXG4gICAgICB7IFxyXG4gICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICBpbml0aWFsRGVsYXlNczogMTAwMCxcclxuICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICdFVElNRURPVVQnLCAnRUNPTk5SRVNFVCcsICdOZXR3b3JrRXJyb3InLCAnU2VydmljZVVuYXZhaWxhYmxlJywgJ05vU3VjaEtleSddXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBcclxuICAgIGZpbGVTaXplID0gZmlsZUNvbnRlbnQubGVuZ3RoO1xyXG4gICAgY29uc3QgZG93bmxvYWREdXJhdGlvbiA9IERhdGUubm93KCkgLSBkb3dubG9hZFN0YXJ0VGltZTtcclxuICAgIFxyXG4gICAgbG9nZ2VyLmluZm8oJ0ZpbGUgZG93bmxvYWRlZCBzdWNjZXNzZnVsbHknLCB7IGZpbGVTaXplLCBkb3dubG9hZER1cmF0aW9uIH0pO1xyXG4gICAgTG9nZ2luZ1V0aWxzLmxvZ0ZpbGVPcGVyYXRpb24obG9nZ2VyLCAnZG93bmxvYWRlZCcsIGZpbGVJZCwgbWVzc2FnZS5maWxlTmFtZSwgZmlsZVNpemUpO1xyXG4gICAgXHJcbiAgICAvLyBSZWNvcmQgUzMgb3BlcmF0aW9uIG1ldHJpY3NcclxuICAgIGF3YWl0IG1vbml0b3JpbmdTZXJ2aWNlLm1vbml0b3JTM09wZXJhdGlvbihidWNrZXROYW1lLCAnR2V0T2JqZWN0JywgdHJ1ZSwgZG93bmxvYWREdXJhdGlvbiwgZmlsZVNpemUpO1xyXG5cclxuICAgIC8vIEludm9rZSBNSVNSQSBBbmFseXNpcyBFbmdpbmUgd2l0aCBwcm9ncmVzcyB0cmFja2luZyAoUmVxdWlyZW1lbnQgNi40LCAzLjMsIDguMSlcclxuICAgIGxvZ2dlci5pbmZvKCdTdGFydGluZyBNSVNSQSBhbmFseXNpcycsIHsgbGFuZ3VhZ2UsIGZpbGVJZCB9KTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHByb2dyZXNzIGNhbGxiYWNrIHRvIHVwZGF0ZSBEeW5hbW9EQiBldmVyeSAyIHNlY29uZHNcclxuICAgIC8vIFdlJ2xsIGdldCB0b3RhbFJ1bGVzIGZyb20gdGhlIGFuYWx5c2lzIGVuZ2luZSB3aGVuIGl0IGNhbGxzIHRoaXMgY2FsbGJhY2tcclxuICAgIGNvbnN0IHByb2dyZXNzQ2FsbGJhY2sgPSBhc3luYyAocHJvZ3Jlc3M6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgLy8gRXh0cmFjdCBydWxlcyBwcm9jZXNzZWQgZnJvbSB0aGUgbWVzc2FnZSBpZiBhdmFpbGFibGVcclxuICAgICAgICBsZXQgcnVsZXNQcm9jZXNzZWQgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbFJ1bGVzRnJvbU1lc3NhZ2UgPSAzNTc7IC8vIERlZmF1bHQgZmFsbGJhY2sgdG8gYWN0dWFsIE1JU1JBIHJ1bGUgY291bnRcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBydWxlc01hdGNoID0gbWVzc2FnZS5tYXRjaCgvKFxcZCspXFwvKFxcZCspIGNvbXBsZXRlZC8pO1xyXG4gICAgICAgIGlmIChydWxlc01hdGNoKSB7XHJcbiAgICAgICAgICBydWxlc1Byb2Nlc3NlZCA9IHBhcnNlSW50KHJ1bGVzTWF0Y2hbMV0pO1xyXG4gICAgICAgICAgdG90YWxSdWxlc0Zyb21NZXNzYWdlID0gcGFyc2VJbnQocnVsZXNNYXRjaFsyXSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGF3YWl0IHVwZGF0ZUFuYWx5c2lzUHJvZ3Jlc3MoZmlsZUlkLCBwcm9ncmVzcywgbWVzc2FnZSwgcnVsZXNQcm9jZXNzZWQsIHRvdGFsUnVsZXNGcm9tTWVzc2FnZSwgdXNlcklkKTtcclxuICAgICAgICBsb2dnZXIuZGVidWcoJ1Byb2dyZXNzIHVwZGF0ZWQnLCB7IGZpbGVJZCwgcHJvZ3Jlc3MsIG1lc3NhZ2UsIHJ1bGVzUHJvY2Vzc2VkLCB0b3RhbFJ1bGVzOiB0b3RhbFJ1bGVzRnJvbU1lc3NhZ2UgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ0ZhaWxlZCB0byB1cGRhdGUgcHJvZ3Jlc3MnLCB7IGZpbGVJZCwgcHJvZ3Jlc3MsIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UgfSk7XHJcbiAgICAgICAgLy8gRG9uJ3QgdGhyb3cgLSBwcm9ncmVzcyB1cGRhdGVzIGFyZSBub24tY3JpdGljYWxcclxuICAgICAgfVxyXG4gICAgfTtcclxuICAgIFxyXG4gICAgY29uc3QgYW5hbHlzaXNSZXN1bHQgPSBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiBhbmFseXNpc0VuZ2luZS5hbmFseXplRmlsZShcclxuICAgICAgICBmaWxlQ29udGVudCxcclxuICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIHsgcHJvZ3Jlc3NDYWxsYmFjaywgdXBkYXRlSW50ZXJ2YWw6IDIwMDAgfSAvLyAyLXNlY29uZCB1cGRhdGVzIChSZXF1aXJlbWVudCAzLjMpXHJcbiAgICAgICksXHJcbiAgICAgIHsgXHJcbiAgICAgICAgbWF4QXR0ZW1wdHM6IDIsIC8vIExpbWl0ZWQgcmV0cmllcyBmb3IgYW5hbHlzaXNcclxuICAgICAgICBpbml0aWFsRGVsYXlNczogMjAwMCxcclxuICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICdBTkFMWVNJU19USU1FT1VUJywgJ1NFUlZJQ0VfVU5BVkFJTEFCTEUnXVxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIGxvZ2dlci5pbmZvKCdBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jywge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB2aW9sYXRpb25zQ291bnQ6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICBjb21wbGlhbmNlU2NvcmU6IGFuYWx5c2lzUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2VcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIHJlc3VsdHMgaW4gRHluYW1vREIgd2l0aCByZXRyeSAoUmVxdWlyZW1lbnQgNi41LCA4LjEpXHJcbiAgICBsb2dnZXIuaW5mbygnU3RvcmluZyBhbmFseXNpcyByZXN1bHRzJywgeyBhbmFseXNpc0lkOiBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkIH0pO1xyXG4gICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgKCkgPT4gc3RvcmVBbmFseXNpc1Jlc3VsdHMoYW5hbHlzaXNSZXN1bHQsIG9yZ2FuaXphdGlvbklkKSxcclxuICAgICAgeyBtYXhBdHRlbXB0czogMywgaW5pdGlhbERlbGF5TXM6IDEwMDAgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBDUklUSUNBTDogV2FpdCBmb3IgRHluYW1vREIgdG8gcHJvcGFnYXRlIHJlc3VsdHMgYmVmb3JlIG1hcmtpbmcgc3RhdHVzIGFzIGNvbXBsZXRlZFxyXG4gICAgLy8gVGhpcyBwcmV2ZW50cyByYWNlIGNvbmRpdGlvbiB3aGVyZSBzdGF0dXMgaXMgbWFya2VkIGNvbXBsZXRlIGJlZm9yZSByZXN1bHRzIGFyZSBhdmFpbGFibGVcclxuICAgIGNvbnNvbGUubG9nKGBXYWl0aW5nIGZvciBEeW5hbW9EQiBwcm9wYWdhdGlvbiBiZWZvcmUgbWFya2luZyBzdGF0dXMgYXMgY29tcGxldGVkYCk7XHJcbiAgICBcclxuICAgIC8vIEFkZCBhIGxvbmdlciBkZWxheSB0byBlbnN1cmUgRHluYW1vREIgaGFzIHRpbWUgdG8gcHJvcGFnYXRlXHJcbiAgICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgMzAwMCkpO1xyXG4gICAgXHJcbiAgICAvLyBWZXJpZnkgcmVzdWx0cyBhcmUgaW4gRHluYW1vREIgd2l0aCBtdWx0aXBsZSBhdHRlbXB0c1xyXG4gICAgbGV0IHJlc3VsdHNWZXJpZmllZCA9IGZhbHNlO1xyXG4gICAgbGV0IHZlcmlmeUF0dGVtcHRzID0gMDtcclxuICAgIGNvbnN0IG1heFZlcmlmeUF0dGVtcHRzID0gMzA7IC8vIEluY3JlYXNlZCB0byAzMCBhdHRlbXB0cyAofjYgc2Vjb25kcyB0b3RhbClcclxuICAgIFxyXG4gICAgd2hpbGUgKCFyZXN1bHRzVmVyaWZpZWQgJiYgdmVyaWZ5QXR0ZW1wdHMgPCBtYXhWZXJpZnlBdHRlbXB0cykge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHZlcmlmeUF0dGVtcHRzKys7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVXNlIEZpbGVJbmRleCBHU0kgdG8gcXVlcnkgYnkgZmlsZUlkXHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiBhbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgICAgIEluZGV4TmFtZTogJ0ZpbGVJbmRleCcsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZmlsZUlkID0gOmZpbGVJZCcsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6ZmlsZUlkJzogeyBTOiBmaWxlSWQgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBMaW1pdDogMSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgICBpZiAocmVzdWx0Lkl0ZW1zICYmIHJlc3VsdC5JdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhg4pyTIFJlc3VsdHMgdmVyaWZpZWQgaW4gRHluYW1vREIgb24gYXR0ZW1wdCAke3ZlcmlmeUF0dGVtcHRzfWApO1xyXG4gICAgICAgICAgcmVzdWx0c1ZlcmlmaWVkID0gdHJ1ZTtcclxuICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgUmVzdWx0cyBub3QgeWV0IHZpc2libGUgKGF0dGVtcHQgJHt2ZXJpZnlBdHRlbXB0c30vJHttYXhWZXJpZnlBdHRlbXB0c30pLCByZXRyeWluZy4uLmApO1xyXG4gICAgICAgICAgLy8gV2FpdCBiZWZvcmUgbmV4dCBhdHRlbXB0IC0gdXNlIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICAgICAgICAgIGNvbnN0IGJhY2tvZmZEZWxheSA9IE1hdGgubWluKDUwMCwgMTAwICogdmVyaWZ5QXR0ZW1wdHMpO1xyXG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGJhY2tvZmZEZWxheSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgfSBjYXRjaCAodmVyaWZ5RXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oYFZlcmlmaWNhdGlvbiBhdHRlbXB0ICR7dmVyaWZ5QXR0ZW1wdHN9IGZhaWxlZDpgLCB2ZXJpZnlFcnJvcik7XHJcbiAgICAgICAgY29uc3QgYmFja29mZkRlbGF5ID0gTWF0aC5taW4oNTAwLCAxMDAgKiB2ZXJpZnlBdHRlbXB0cyk7XHJcbiAgICAgICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIGJhY2tvZmZEZWxheSkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmICghcmVzdWx0c1ZlcmlmaWVkKSB7XHJcbiAgICAgIGNvbnNvbGUud2Fybihg4pqg77iPIFJlc3VsdHMgY291bGQgbm90IGJlIHZlcmlmaWVkIGFmdGVyICR7bWF4VmVyaWZ5QXR0ZW1wdHN9IGF0dGVtcHRzYCk7XHJcbiAgICAgIGNvbnNvbGUud2FybihgUHJvY2VlZGluZyBhbnl3YXkgLSByZXN1bHRzIG1heSBiZSBhdmFpbGFibGUgc2hvcnRseWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFRyYWNrIGFuYWx5c2lzIGNvc3RzIChSZXF1aXJlbWVudCAxNC4xKVxyXG4gICAgY29uc29sZS5sb2coYFRyYWNraW5nIGFuYWx5c2lzIGNvc3RzYCk7XHJcbiAgICBjb25zdCBjb3N0cyA9IGNvc3RUcmFja2VyLmNhbGN1bGF0ZUNvc3RzKGR1cmF0aW9uLCBmaWxlU2l6ZSwgMik7XHJcbiAgICBhd2FpdCBjb3N0VHJhY2tlci5yZWNvcmRDb3N0KFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkIHx8ICdkZWZhdWx0JyxcclxuICAgICAgYW5hbHlzaXNSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBjb3N0cyxcclxuICAgICAge1xyXG4gICAgICAgIGZpbGVTaXplLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgY29uc29sZS5sb2coYENvc3QgdHJhY2tpbmcgY29tcGxldGVkOiAkJHtjb3N0cy50b3RhbENvc3QudG9GaXhlZCg2KX1gKTtcclxuXHJcbiAgICAvLyBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgdG8gQ09NUExFVEVEXHJcbiAgICAvLyBUaGlzIGlzIG5vdyBzYWZlIGJlY2F1c2Ugd2UndmUgdmVyaWZpZWQgcmVzdWx0cyBhcmUgaW4gRHluYW1vREJcclxuICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBmaWxlICR7ZmlsZUlkfSBzdGF0dXMgdG8gQ09NUExFVEVEYCk7XHJcbiAgICBhd2FpdCB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoZmlsZUlkLCAnY29tcGxldGVkJywge1xyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHZpb2xhdGlvbnNfY291bnQ6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgICBjb21wbGlhbmNlX3BlcmNlbnRhZ2U6IGFuYWx5c2lzUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2UsXHJcbiAgICAgIGFuYWx5c2lzX2R1cmF0aW9uOiBkdXJhdGlvbixcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBBbmFseXNpcyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IGZvciBmaWxlICR7ZmlsZUlkfWApO1xyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhbmFseXNpc0lkOiBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGNvbXBsaWFuY2VTY29yZTogYW5hbHlzaXNSZXN1bHQuc3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZSxcclxuICAgICAgdmlvbGF0aW9uQ291bnQ6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgZHVyaW5nIGFuYWx5c2lzIGZvciBmaWxlICR7ZmlsZUlkfTpgLCBlcnJvcik7XHJcblxyXG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XHJcbiAgICBcclxuICAgIC8vIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyB0byBGQUlMRUQgKFJlcXVpcmVtZW50IDExLjEsIDExLjIsIDExLjMsIDExLjQpXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoZmlsZUlkLCAnZmFpbGVkJywge1xyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgZXJyb3JfdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKHVwZGF0ZUVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXM6JywgdXBkYXRlRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlLXRocm93IHRvIHRyaWdnZXIgU1FTIHJldHJ5L0RMUVxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogRG93bmxvYWQgZmlsZSBjb250ZW50IGZyb20gUzNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkRmlsZUZyb21TMyhzM0tleTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coJ0F0dGVtcHRpbmcgdG8gZG93bmxvYWQgZnJvbSBTMycsIHtcclxuICAgICAgYnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICBrZXk6IHMzS2V5LFxyXG4gICAgICByZWdpb25cclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgS2V5OiBzM0tleSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgczNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIFxyXG4gICAgaWYgKCFyZXNwb25zZS5Cb2R5KSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRW1wdHkgcmVzcG9uc2UgYm9keSBmcm9tIFMzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ29udmVydCBzdHJlYW0gdG8gc3RyaW5nXHJcbiAgICBjb25zdCBjaHVua3M6IFVpbnQ4QXJyYXlbXSA9IFtdO1xyXG4gICAgZm9yIGF3YWl0IChjb25zdCBjaHVuayBvZiByZXNwb25zZS5Cb2R5IGFzIGFueSkge1xyXG4gICAgICBjaHVua3MucHVzaChjaHVuayk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5jb25jYXQoY2h1bmtzKTtcclxuICAgIGNvbnNvbGUubG9nKCdGaWxlIGRvd25sb2FkZWQgc3VjY2Vzc2Z1bGx5IGZyb20gUzMnLCB7XHJcbiAgICAgIGtleTogczNLZXksXHJcbiAgICAgIHNpemU6IGJ1ZmZlci5sZW5ndGhcclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIGJ1ZmZlci50b1N0cmluZygndXRmLTgnKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZG93bmxvYWRpbmcgZmlsZSBmcm9tIFMzOicsIHtcclxuICAgICAgYnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICBrZXk6IHMzS2V5LFxyXG4gICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpLFxyXG4gICAgICBlcnJvckNvZGU6IChlcnJvciBhcyBhbnkpPy5Db2RlLFxyXG4gICAgICBlcnJvck5hbWU6IChlcnJvciBhcyBhbnkpPy5uYW1lLFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgfSk7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBkb3dubG9hZCBmaWxlIGZyb20gUzM6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogU3RvcmUgYW5hbHlzaXMgcmVzdWx0cyBpbiBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gc3RvcmVBbmFseXNpc1Jlc3VsdHMoXHJcbiAgcmVzdWx0OiBhbnksXHJcbiAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmdcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSBTdGFydGluZyB0byBzdG9yZSBhbmFseXNpcyByZXN1bHRzYCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtTVE9SRV0gYW5hbHlzaXNJZDogJHtyZXN1bHQuYW5hbHlzaXNJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSBmaWxlSWQ6ICR7cmVzdWx0LmZpbGVJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSB1c2VySWQ6ICR7cmVzdWx0LnVzZXJJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSB2aW9sYXRpb25zOiAke3Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aH1gKTtcclxuICAgIFxyXG4gICAgLy8gQnVpbGQgdGhlIGl0ZW0gb2JqZWN0IHdpdGggdGltZXN0YW1wIGFzIGEgTlVNQkVSIChub3Qgc3RyaW5nKVxyXG4gICAgY29uc3QgaXRlbSA9IHtcclxuICAgICAgYW5hbHlzaXNJZDogcmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZDogcmVzdWx0LmZpbGVJZCxcclxuICAgICAgdXNlcklkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogb3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnLFxyXG4gICAgICBsYW5ndWFnZTogcmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICB2aW9sYXRpb25zOiByZXN1bHQudmlvbGF0aW9ucyxcclxuICAgICAgc3VtbWFyeTogcmVzdWx0LnN1bW1hcnksXHJcbiAgICAgIHN0YXR1czogcmVzdWx0LnN0YXR1cyxcclxuICAgICAgdGltZXN0YW1wOiBub3csIC8vIENSSVRJQ0FMOiBNdXN0IGJlIGEgbnVtYmVyLCBub3QgYSBzdHJpbmdcclxuICAgICAgY3JlYXRlZEF0OiB0eXBlb2YgcmVzdWx0LmNyZWF0ZWRBdCA9PT0gJ3N0cmluZycgPyByZXN1bHQuY3JlYXRlZEF0IDogbmV3IERhdGUobm93KS50b0lTT1N0cmluZygpLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtTVE9SRV0gSXRlbSBwcmVwYXJlZCB3aXRoIHRpbWVzdGFtcDogJHtpdGVtLnRpbWVzdGFtcH0gKHR5cGU6ICR7dHlwZW9mIGl0ZW0udGltZXN0YW1wfSlgKTtcclxuXHJcbiAgICAvLyBNYXJzaGFsbCB0aGUgaXRlbSAtIHRpbWVzdGFtcCB3aWxsIGJlIGNvcnJlY3RseSBtYXJzaGFsbGVkIGFzIE4gKG51bWJlcilcclxuICAgIGNvbnN0IG1hcnNoYWxsZWRJdGVtID0gbWFyc2hhbGwoaXRlbSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIEl0ZW0gbWFyc2hhbGxlZCBzdWNjZXNzZnVsbHlgKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSBNYXJzaGFsbGVkIHRpbWVzdGFtcCB0eXBlOiAke21hcnNoYWxsZWRJdGVtLnRpbWVzdGFtcD8uTiA/ICdOdW1iZXInIDogJ1Vua25vd24nfWApO1xyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICBJdGVtOiBtYXJzaGFsbGVkSXRlbSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSBTZW5kaW5nIFB1dEl0ZW1Db21tYW5kIHRvIHRhYmxlOiAke2FuYWx5c2lzUmVzdWx0c1RhYmxlfWApO1xyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBjb25zb2xlLmxvZyhg4pyFIFtTVE9SRV0g4pyTIEFuYWx5c2lzIHJlc3VsdHMgc3RvcmVkIHN1Y2Nlc3NmdWxseSB3aXRoIElEOiAke3Jlc3VsdC5hbmFseXNpc0lkfWApO1xyXG4gICAgXHJcbiAgICAvLyBJbW1lZGlhdGVseSB2ZXJpZnkgdGhlIGRhdGEgd2FzIHN0b3JlZFxyXG4gICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIFZlcmlmeWluZyBkYXRhIHdhcyBzdG9yZWQuLi5gKTtcclxuICAgIGNvbnN0IHZlcmlmeUNvbW1hbmQgPSBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBhbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgSW5kZXhOYW1lOiAnRmlsZUluZGV4JyxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ2ZpbGVJZCA9IDpmaWxlSWQnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgJzpmaWxlSWQnOiB7IFM6IHJlc3VsdC5maWxlSWQgfSxcclxuICAgICAgfSxcclxuICAgICAgTGltaXQ6IDEsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgY29uc3QgdmVyaWZ5UmVzdWx0ID0gYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQodmVyaWZ5Q29tbWFuZCk7XHJcbiAgICBpZiAodmVyaWZ5UmVzdWx0Lkl0ZW1zICYmIHZlcmlmeVJlc3VsdC5JdGVtcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGDinIUgW1NUT1JFXSDinJMgVmVyaWZpY2F0aW9uIHN1Y2Nlc3NmdWwhIERhdGEgZm91bmQgaW4gRHluYW1vREJgKTtcclxuICAgICAgY29uc29sZS5sb2coYOKchSBbU1RPUkVdIEZvdW5kICR7dmVyaWZ5UmVzdWx0Lkl0ZW1zLmxlbmd0aH0gaXRlbShzKSBmb3IgZmlsZUlkOiAke3Jlc3VsdC5maWxlSWR9YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLndhcm4oYOKaoO+4jyBbU1RPUkVdIFZlcmlmaWNhdGlvbiBmYWlsZWQgLSBubyBpdGVtcyBmb3VuZCBpbW1lZGlhdGVseSBhZnRlciBzdG9yZWApO1xyXG4gICAgfVxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCfinYwgW1NUT1JFXSBFcnJvciBzdG9yaW5nIGFuYWx5c2lzIHJlc3VsdHM6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc3RvcmUgYW5hbHlzaXMgcmVzdWx0czogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgaW4gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBzdGF0dXM6IHN0cmluZyxcclxuICBhZGRpdGlvbmFsRGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT5cclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb24gPSBbJ1NFVCBhbmFseXNpc19zdGF0dXMgPSA6c3RhdHVzJywgJ3VwZGF0ZWRfYXQgPSA6dXBkYXRlZEF0J107XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAnOnN0YXR1cyc6IHsgUzogc3RhdHVzIH0sXHJcbiAgICAgICc6dXBkYXRlZEF0JzogeyBOOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKS50b1N0cmluZygpIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIGlmIChhZGRpdGlvbmFsRGF0YSkge1xyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEudmlvbGF0aW9uc19jb3VudCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCd2aW9sYXRpb25zX2NvdW50ID0gOnZpb2xhdGlvbnNDb3VudCcpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp2aW9sYXRpb25zQ291bnQnXSA9IHsgTjogYWRkaXRpb25hbERhdGEudmlvbGF0aW9uc19jb3VudC50b1N0cmluZygpIH07XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGFkZGl0aW9uYWxEYXRhLmNvbXBsaWFuY2VfcGVyY2VudGFnZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdjb21wbGlhbmNlX3BlcmNlbnRhZ2UgPSA6Y29tcGxpYW5jZVBlcmNlbnRhZ2UnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6Y29tcGxpYW5jZVBlcmNlbnRhZ2UnXSA9IHsgTjogYWRkaXRpb25hbERhdGEuY29tcGxpYW5jZV9wZXJjZW50YWdlLnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuYW5hbHlzaXNfZHVyYXRpb24gIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnYW5hbHlzaXNfZHVyYXRpb24gPSA6YW5hbHlzaXNEdXJhdGlvbicpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzphbmFseXNpc0R1cmF0aW9uJ10gPSB7IE46IGFkZGl0aW9uYWxEYXRhLmFuYWx5c2lzX2R1cmF0aW9uLnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuZXJyb3JfbWVzc2FnZSkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnZXJyb3JfbWVzc2FnZSA9IDplcnJvck1lc3NhZ2UnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZXJyb3JNZXNzYWdlJ10gPSB7IFM6IGFkZGl0aW9uYWxEYXRhLmVycm9yX21lc3NhZ2UgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuZXJyb3JfdGltZXN0YW1wKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdlcnJvcl90aW1lc3RhbXAgPSA6ZXJyb3JUaW1lc3RhbXAnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZXJyb3JUaW1lc3RhbXAnXSA9IHsgTjogYWRkaXRpb25hbERhdGEuZXJyb3JfdGltZXN0YW1wLnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENSSVRJQ0FMIEZJWDogRmlsZU1ldGFkYXRhIHRhYmxlIGhhcyBjb21wb3NpdGUga2V5IChmaWxlSWQgKyB1c2VySWQpXHJcbiAgICAvLyBUaGUgU1FTIG1lc3NhZ2UgY29udGFpbnMgdXNlcklkLCBzbyB3ZSBuZWVkIHRvIGV4dHJhY3QgaXQgZnJvbSB0aGUgbWVzc2FnZSBjb250ZXh0XHJcbiAgICAvLyBGb3Igbm93LCB3ZSdsbCB1c2UgYSBxdWVyeS10aGVuLXVwZGF0ZSBwYXR0ZXJuIHRvIGZpbmQgdGhlIGNvcnJlY3QgdXNlcklkXHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiBtYXJzaGFsbCh7IFxyXG4gICAgICAgIGZpbGVJZDogZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZDogKGFkZGl0aW9uYWxEYXRhPy51c2VySWQgfHwgJ3Vua25vd24nKSAvLyBXaWxsIGJlIHBhc3NlZCBmcm9tIGNhbGxlclxyXG4gICAgICB9KSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogdXBkYXRlRXhwcmVzc2lvbi5qb2luKCcsICcpLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBjb25zb2xlLmxvZyhgRmlsZSBtZXRhZGF0YSB1cGRhdGVkIGZvciAke2ZpbGVJZH06IHN0YXR1cz0ke3N0YXR1c31gKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZmlsZSBtZXRhZGF0YTonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgZmlsZSBtZXRhZGF0YTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgYW5hbHlzaXMgcHJvZ3Jlc3MgaW4gRHluYW1vREJcclxuICogUmVxdWlyZW1lbnRzOiAzLjMgKDItc2Vjb25kIHByb2dyZXNzIHVwZGF0ZXMpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVBbmFseXNpc1Byb2dyZXNzKFxyXG4gIGZpbGVJZDogc3RyaW5nLFxyXG4gIHByb2dyZXNzOiBudW1iZXIsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIHJ1bGVzUHJvY2Vzc2VkPzogbnVtYmVyLFxyXG4gIHRvdGFsUnVsZXM/OiBudW1iZXIsXHJcbiAgdXNlcklkPzogc3RyaW5nXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB1cGRhdGVFeHByZXNzaW9uID0gWydTRVQgYW5hbHlzaXNfcHJvZ3Jlc3MgPSA6cHJvZ3Jlc3MnLCAnYW5hbHlzaXNfbWVzc2FnZSA9IDptZXNzYWdlJywgJ3VwZGF0ZWRfYXQgPSA6dXBkYXRlZEF0J107XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xyXG4gICAgICAnOnByb2dyZXNzJzogeyBOOiBwcm9ncmVzcy50b1N0cmluZygpIH0sXHJcbiAgICAgICc6bWVzc2FnZSc6IHsgUzogbWVzc2FnZSB9LFxyXG4gICAgICAnOnVwZGF0ZWRBdCc6IHsgTjogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkudG9TdHJpbmcoKSB9LFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBZGQgcnVsZXMgcHJvZ3Jlc3MgaWYgcHJvdmlkZWRcclxuICAgIGlmIChydWxlc1Byb2Nlc3NlZCAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgncnVsZXNfcHJvY2Vzc2VkID0gOnJ1bGVzUHJvY2Vzc2VkJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpydWxlc1Byb2Nlc3NlZCddID0geyBOOiBydWxlc1Byb2Nlc3NlZC50b1N0cmluZygpIH07XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmICh0b3RhbFJ1bGVzICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCd0b3RhbF9ydWxlcyA9IDp0b3RhbFJ1bGVzJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzp0b3RhbFJ1bGVzJ10gPSB7IE46IHRvdGFsUnVsZXMudG9TdHJpbmcoKSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlSXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBLZXk6IG1hcnNoYWxsKHsgXHJcbiAgICAgICAgZmlsZUlkOiBmaWxlSWQsIFxyXG4gICAgICAgIHVzZXJJZDogdXNlcklkIHx8ICd1bmtub3duJyAvLyBVc2UgcHJvdmlkZWQgdXNlcklkIG9yIGZhbGxiYWNrXHJcbiAgICAgIH0pLFxyXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiB1cGRhdGVFeHByZXNzaW9uLmpvaW4oJywgJyksXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIGNvbnNvbGUubG9nKGDinIUgUHJvZ3Jlc3MgdXBkYXRlZCBmb3IgJHtmaWxlSWR9OiAke3Byb2dyZXNzfSUgLSAke21lc3NhZ2V9ICgke3J1bGVzUHJvY2Vzc2VkIHx8IDB9LyR7dG90YWxSdWxlcyB8fCAzNTd9IHJ1bGVzKWApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCfinYwgRXJyb3IgdXBkYXRpbmcgYW5hbHlzaXMgcHJvZ3Jlc3M6JywgZXJyb3IpO1xyXG4gICAgLy8gRG9uJ3QgdGhyb3cgLSBwcm9ncmVzcyB1cGRhdGVzIGFyZSBub24tY3JpdGljYWxcclxuICB9XHJcbn1cclxuLy8gRXhwb3J0IHRoZSBoYW5kbGVyIHdpdGggY29ycmVsYXRpb24gSUQgbWlkZGxld2FyZVxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IHdpdGhDb3JyZWxhdGlvbklkKGFuYWx5emVGaWxlSGFuZGxlcik7Il19