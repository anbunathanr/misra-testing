import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { MISRAAnalysisEngine } from '../../services/misra-analysis/analysis-engine';
import { Language } from '../../types/misra-analysis';
import { CostTracker } from '../../services/misra-analysis/cost-tracker';

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
 * Lambda handler for MISRA file analysis
 * Processes SQS messages containing analysis requests
 * 
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  console.log('Analysis Lambda invoked');
  console.log(`Processing ${event.Records.length} message(s)`);
  console.log(`Remaining time: ${context.getRemainingTimeInMillis()}ms`);

  // Process each SQS message
  for (const record of event.Records) {
    await processAnalysisMessage(record, context);
  }

  console.log('All messages processed successfully');
};

/**
 * Process a single analysis message from SQS
 */
async function processAnalysisMessage(
  record: SQSRecord,
  context: Context
): Promise<void> {
  let message: AnalysisMessage;
  
  try {
    // Parse SQS message
    message = JSON.parse(record.body) as AnalysisMessage;
    console.log(`Processing analysis for file: ${message.fileId}`);
    console.log(`File name: ${message.fileName}`);
    console.log(`Language: ${message.language}`);
  } catch (error) {
    console.error('Failed to parse SQS message:', error);
    console.error('Message body:', record.body);
    throw new Error('Invalid SQS message format');
  }

  const { fileId, s3Key, language, userId, organizationId } = message;
  const startTime = Date.now();
  let fileSize = 0;

  try {
    // Update file metadata status to IN_PROGRESS (Requirement 6.2)
    console.log(`Updating file ${fileId} status to IN_PROGRESS`);
    await updateFileMetadataStatus(fileId, 'in_progress');

    // Check remaining time before starting analysis
    const remainingTime = context.getRemainingTimeInMillis();
    console.log(`Remaining Lambda time: ${remainingTime}ms`);

    // Reserve 30 seconds for cleanup and result saving
    const timeoutBuffer = 30000;
    if (remainingTime < timeoutBuffer + 60000) {
      throw new Error(`Insufficient time remaining: ${remainingTime}ms`);
    }

    // Download file from S3 (Requirement 6.3)
    console.log(`Downloading file from S3: ${s3Key}`);
    const fileContent = await downloadFileFromS3(s3Key);
    fileSize = fileContent.length;
    console.log(`File downloaded successfully, size: ${fileSize} bytes`);

    // Invoke MISRA Analysis Engine (Requirement 6.4)
    console.log(`Starting MISRA analysis for ${language} file`);
    const analysisResult = await analysisEngine.analyzeFile(
      fileContent,
      language,
      fileId,
      userId
    );

    const duration = Date.now() - startTime;
    console.log(`Analysis completed in ${duration}ms`);
    console.log(`Found ${analysisResult.violations.length} violations`);
    console.log(`Compliance: ${analysisResult.summary.compliancePercentage.toFixed(2)}%`);

    // Store results in DynamoDB (Requirement 6.5)
    console.log(`Storing analysis results in DynamoDB`);
    await storeAnalysisResults(analysisResult, organizationId);

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
