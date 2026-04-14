import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

interface StartAnalysisRequest {
  fileId: string;
  analysisType: 'misra-compliance' | 'custom';
  userEmail: string;
  options?: {
    ruleSet?: 'MISRA_C_2012' | 'MISRA_CPP_2008';
    severity?: 'all' | 'errors-only' | 'warnings-and-errors';
    customRules?: string[];
  };
}

interface StartAnalysisResponse {
  analysisId: string;
  status: 'queued' | 'running';
  estimatedDuration: number;
  queuePosition?: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const { fileId, analysisType, userEmail, options }: StartAnalysisRequest = JSON.parse(event.body);

    // Validate input
    if (!fileId || !analysisType || !userEmail) {
      return errorResponse(400, 'INVALID_INPUT', 'fileId, analysisType, and userEmail are required');
    }

    // Verify file exists and belongs to user
    const fileRecord = await dynamoClient.send(new GetCommand({
      TableName: process.env.FILE_METADATA_TABLE_NAME!,
      Key: { fileId }
    }));

    if (!fileRecord.Item) {
      return errorResponse(404, 'FILE_NOT_FOUND', 'File not found');
    }

    if (fileRecord.Item.userEmail !== userEmail) {
      return errorResponse(403, 'ACCESS_DENIED', 'Access denied to this file');
    }

    if (fileRecord.Item.status !== 'uploaded') {
      return errorResponse(400, 'FILE_NOT_READY', 'File upload not completed');
    }

    const analysisId = uuidv4();
    const now = new Date().toISOString();

    // Estimate duration based on file size
    const fileSize = fileRecord.Item.fileSize || 0;
    const estimatedDuration = Math.max(30, Math.min(300, Math.floor(fileSize / 1024) * 2)); // 30s to 5min

    // Create analysis record
    const analysisRecord = {
      analysisId,
      fileId,
      userEmail,
      analysisType,
      options: options || {
        ruleSet: 'MISRA_C_2012',
        severity: 'all'
      },
      status: 'queued',
      progress: 0,
      createdAt: now,
      estimatedDuration,
      fileName: fileRecord.Item.fileName,
      fileSize: fileRecord.Item.fileSize,
      s3Key: fileRecord.Item.s3Key,
      s3Bucket: fileRecord.Item.s3Bucket
    };

    await dynamoClient.send(new PutCommand({
      TableName: process.env.ANALYSIS_RESULTS_TABLE_NAME!,
      Item: analysisRecord
    }));

    // Update file status
    await dynamoClient.send(new UpdateCommand({
      TableName: process.env.FILE_METADATA_TABLE_NAME!,
      Key: { fileId },
      UpdateExpression: 'SET #status = :status, analysisId = :analysisId, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'analyzing',
        ':analysisId': analysisId,
        ':updatedAt': now
      }
    }));

    // Queue analysis job
    const queueMessage = {
      analysisId,
      fileId,
      userEmail,
      analysisType,
      options: analysisRecord.options,
      s3Bucket: fileRecord.Item.s3Bucket,
      s3Key: fileRecord.Item.s3Key,
      fileName: fileRecord.Item.fileName,
      priority: 'normal'
    };

    await sqsClient.send(new SendMessageCommand({
      QueueUrl: process.env.ANALYSIS_QUEUE_URL!,
      MessageBody: JSON.stringify(queueMessage),
      MessageAttributes: {
        analysisType: {
          DataType: 'String',
          StringValue: analysisType
        },
        userEmail: {
          DataType: 'String',
          StringValue: userEmail
        }
      }
    }));

    // Get current queue position (simplified)
    const queuePosition = await getQueuePosition();

    const response: StartAnalysisResponse = {
      analysisId,
      status: 'queued',
      estimatedDuration,
      queuePosition
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      },
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('Start analysis error:', error);
    return errorResponse(500, 'ANALYSIS_START_ERROR', 'Failed to start analysis. Please try again.');
  }
};

async function getQueuePosition(): Promise<number> {
  // In a real implementation, you would query the SQS queue or maintain a counter
  // For now, return a random position between 1-5
  return Math.floor(Math.random() * 5) + 1;
}

function errorResponse(statusCode: number, code: string, message: string): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    body: JSON.stringify({
      error: {
        code,
        message,
        timestamp: new Date().toISOString()
      }
    })
  };
}