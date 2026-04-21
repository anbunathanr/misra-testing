import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { MISRAAnalysisEngine } from '../../services/misra-analysis/analysis-engine';
import { Language } from '../../types/misra-analysis';
import { CostTracker } from '../../services/misra-analysis/cost-tracker';
import { centralizedErrorHandler } from '../../services/error-handling/centralized-error-handler';
import { enhancedRetryService } from '../../services/error-handling/enhanced-retry';
import { CentralizedLogger, withCorrelationId, LoggingUtils } from '../../utils/centralized-logger';
import { monitoringService } from '../../services/monitoring-service';

const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || '';
const region = process.env.AWS_REGION || 'us-east-1';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata-dev';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev';

const s3Client = new S3Client({ region });
const dynamoClient = new DynamoDBClient({ region });
const analysisEngine = new MISRAAnalysisEngine();
const costTracker = new CostTracker(dynamoClient);

interface AnalysisMessage {
  fileId: string;
  fileName: string;
  s3Key: string;
  language: Language;
  userId: string;
  organizationId?: string;
}

/**
 * Lambda handler for MISRA file analysis with enhanced error handling and monitoring
 * Processes SQS messages containing analysis requests
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.5, 8.1, 8.2
 * Task 8.2: Enhanced with centralized logging and correlation IDs
 */
async function analyzeFileHandler(event: SQSEvent, context: Context): Promise<void> {
  const logger = CentralizedLogger.getInstance({
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
    let analysisId: string | undefined;
    let fileId: string | undefined;
    
    try {
      const result = await centralizedErrorHandler.executeWithErrorHandling(
        () => processAnalysisMessage(record, context, logger),
        'analysis-service',
        {
          operation: 'process-analysis-message',
          resource: record.messageId
        }
      );
      
      // Extract analysis details for monitoring
      if (result && typeof result === 'object') {
        analysisId = (result as any).analysisId;
        fileId = (result as any).fileId;
      }
      
      const duration = Date.now() - startTime;
      
      // Record successful analysis metrics
      await monitoringService.recordAnalysisMetrics(
        analysisId || 'unknown',
        fileId || 'unknown',
        (result as any)?.complianceScore || 0,
        (result as any)?.violationCount || 0,
        duration,
        true
      );
      
      LoggingUtils.logAnalysisOperation(logger, 'completed', analysisId || 'unknown', fileId, duration);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Record failed analysis metrics
      if (analysisId && fileId) {
        await monitoringService.recordAnalysisMetrics(
          analysisId,
          fileId,
          0,
          0,
          duration,
          false
        );
      }
      
      LoggingUtils.logErrorWithContext(logger, error as Error, 'process-analysis-message', {
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
async function processAnalysisMessage(
  record: SQSRecord,
  context: Context,
  logger: CentralizedLogger
): Promise<{ analysisId: string; fileId: string; complianceScore: number; violationCount: number }> {
  let message: AnalysisMessage;
  
  try {
    // Parse SQS message with validation
    const parsed = JSON.parse(record.body) as AnalysisMessage;
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
    
    LoggingUtils.logAnalysisOperation(logger, 'started', 'pending', message.fileId);
    
  } catch (error) {
    LoggingUtils.logErrorWithContext(logger, error as Error, 'parse-sqs-message', {
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
    await enhancedRetryService.executeWithRetry(
      () => updateFileMetadataStatus(fileId, 'in_progress'),
      { maxAttempts: 3, initialDelayMs: 500 }
    );

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
    
    const fileContent = await enhancedRetryService.executeWithRetry(
      () => downloadFileFromS3(s3Key),
      { 
        maxAttempts: 3, 
        initialDelayMs: 1000,
        retryableErrors: ['timeout', 'ETIMEDOUT', 'ECONNRESET', 'NetworkError', 'ServiceUnavailable']
      }
    );
    
    fileSize = fileContent.length;
    const downloadDuration = Date.now() - downloadStartTime;
    
    logger.info('File downloaded successfully', { fileSize, downloadDuration });
    LoggingUtils.logFileOperation(logger, 'downloaded', fileId, message.fileName, fileSize);
    
    // Record S3 operation metrics
    await monitoringService.monitorS3Operation(bucketName, 'GetObject', true, downloadDuration, fileSize);

    // Invoke MISRA Analysis Engine with progress tracking (Requirement 6.4, 3.3, 8.1)
    logger.info('Starting MISRA analysis', { language, fileId });
    
    // Create progress callback to update DynamoDB every 2 seconds
    const progressCallback = async (progress: number, message: string) => {
      try {
        await updateAnalysisProgress(fileId, progress, message);
        logger.debug('Progress updated', { fileId, progress, message });
      } catch (error) {
        logger.warn('Failed to update progress', { fileId, progress, error: (error as Error).message });
        // Don't throw - progress updates are non-critical
      }
    };
    
    const analysisResult = await enhancedRetryService.executeWithRetry(
      () => analysisEngine.analyzeFile(
        fileContent,
        language,
        fileId,
        userId,
        { progressCallback, updateInterval: 2000 } // 2-second updates (Requirement 3.3)
      ),
      { 
        maxAttempts: 2, // Limited retries for analysis
        initialDelayMs: 2000,
        retryableErrors: ['timeout', 'ANALYSIS_TIMEOUT', 'SERVICE_UNAVAILABLE']
      }
    );

    const duration = Date.now() - startTime;
    logger.info('Analysis completed successfully', {
      fileId,
      duration,
      violationsCount: analysisResult.violations.length,
      complianceScore: analysisResult.summary.compliancePercentage
    });

    // Store results in DynamoDB with retry (Requirement 6.5, 8.1)
    logger.info('Storing analysis results', { analysisId: analysisResult.analysisId });
    await enhancedRetryService.executeWithRetry(
      () => storeAnalysisResults(analysisResult, organizationId),
      { maxAttempts: 3, initialDelayMs: 1000 }
    );

    // Track analysis costs (Requirement 14.1)
    console.log(`Tracking analysis costs`);
    const costs = costTracker.calculateCosts(duration, fileSize, 2);
    await costTracker.recordCost(
      userId,
      organizationId || 'default',
      analysisResult.analysisId,
      fileId,
      costs,
      {
        fileSize,
        duration,
      }
    );
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
  } catch (error) {
    console.error(`Error during analysis for file ${fileId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update file metadata status to FAILED (Requirement 11.1, 11.2, 11.3, 11.4)
    try {
      await updateFileMetadataStatus(fileId, 'failed', {
        error_message: errorMessage,
        error_timestamp: Date.now(),
      });
    } catch (updateError) {
      console.error('Failed to update file metadata status:', updateError);
    }

    // Re-throw to trigger SQS retry/DLQ
    throw error;
  }
}

/**
 * Download file content from S3
 */
async function downloadFileFromS3(s3Key: string): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('Empty response body from S3');
    }

    // Convert stream to string
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Error downloading file from S3:', error);
    throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Store analysis results in DynamoDB
 */
async function storeAnalysisResults(
  result: any,
  organizationId?: string
): Promise<void> {
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

    const command = new PutItemCommand({
      TableName: analysisResultsTable,
      Item: marshall(item),
    });

    await dynamoClient.send(command);
    console.log(`Analysis results stored with ID: ${result.analysisId}`);
  } catch (error) {
    console.error('Error storing analysis results:', error);
    throw new Error(`Failed to store analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update file metadata status in DynamoDB
 */
async function updateFileMetadataStatus(
  fileId: string,
  status: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const updateExpression = ['SET analysis_status = :status', 'updated_at = :updatedAt'];
    const expressionAttributeValues: Record<string, any> = {
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

    const command = new UpdateItemCommand({
      TableName: fileMetadataTable,
      Key: marshall({ file_id: fileId }),
      UpdateExpression: updateExpression.join(', '),
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await dynamoClient.send(command);
    console.log(`File metadata updated for ${fileId}: status=${status}`);
  } catch (error) {
    console.error('Error updating file metadata:', error);
    throw new Error(`Failed to update file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update analysis progress in DynamoDB
 * Requirements: 3.3 (2-second progress updates)
 */
async function updateAnalysisProgress(
  fileId: string,
  progress: number,
  message: string
): Promise<void> {
  try {
    const command = new UpdateItemCommand({
      TableName: fileMetadataTable,
      Key: marshall({ file_id: fileId }),
      UpdateExpression: 'SET analysis_progress = :progress, analysis_message = :message, updated_at = :updatedAt',
      ExpressionAttributeValues: {
        ':progress': { N: progress.toString() },
        ':message': { S: message },
        ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
      },
    });

    await dynamoClient.send(command);
  } catch (error) {
    console.error('Error updating analysis progress:', error);
    // Don't throw - progress updates are non-critical
  }
}
// Export the handler with correlation ID middleware
export const handler = withCorrelationId(analyzeFileHandler);