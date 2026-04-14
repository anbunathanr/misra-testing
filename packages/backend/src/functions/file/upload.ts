import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { FileUploadService, FileUploadRequest } from '../../services/file/file-upload-service';
import { getUserFromContext } from '../../utils/auth-util';
import { centralizedErrorHandler } from '../../services/error-handling/centralized-error-handler';
import { enhancedRetryService } from '../../services/error-handling/enhanced-retry';
import { cloudWatchMonitoringService } from '../../services/monitoring/cloudwatch-monitoring';
import { createLogger } from '../../utils/logger';

const ALLOWED_EXTENSIONS = ['.c', '.cpp', '.h', '.hpp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const sqsClient = new SQSClient({});
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FILE_METADATA_TABLE = process.env.FILE_METADATA_TABLE || 'FileMetadata-dev';
const fileUploadService = new FileUploadService();
const logger = createLogger('FileUploadFunction');

// Local type definitions
interface UploadRequestBody {
  fileName: string;
  fileSize: number;
  contentType: string;
}

interface UploadResponse {
  fileId: string;
  uploadUrl: string;
  downloadUrl: string;
  expiresIn: number;
}

/**
 * Enhanced file upload handler with comprehensive error handling
 * Requirements: 1.1, 1.2, 6.1, 8.1, 8.2
 */
export const handler = centralizedErrorHandler.wrapLambdaHandler(
  async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const startTime = Date.now();
    
    try {
      logger.info('File upload request started');
      
      // Extract user from Lambda Authorizer context
      const user = getUserFromContext(event);
      if (!user.userId) {
        logger.warn('Unauthorized upload attempt');
        await cloudWatchMonitoringService.recordError('UNAUTHORIZED', 'file-upload-service', 'MISSING_USER');
        throw new Error('User not authenticated');
      }
      
      logger.info('User authenticated for upload', { 
        userId: user.userId, 
        organizationId: user.organizationId 
      });

      // Parse and validate request body
      if (!event.body) {
        logger.warn('Upload request missing body');
        await cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'file-upload-service', 'MISSING_BODY');
        throw new Error('Request body is required');
      }

      const uploadRequest: UploadRequestBody = JSON.parse(event.body);
      logger.info('Upload request parsed', { 
        fileName: uploadRequest.fileName, 
        fileSize: uploadRequest.fileSize 
      });

      // Validate input with enhanced error handling
      await enhancedRetryService.executeWithRetry(
        () => validateUploadRequest(uploadRequest),
        { maxAttempts: 1 } // No retry for validation
      );

      logger.info('Upload request validation passed');

      // Create file upload request
      const fileUploadRequest: FileUploadRequest = {
        fileName: uploadRequest.fileName,
        fileSize: uploadRequest.fileSize,
        contentType: uploadRequest.contentType,
        organizationId: user.organizationId,
        userId: user.userId,
      };

      // Generate presigned upload URL with retry
      logger.info('Generating presigned upload URL');
      const uploadResponse = await enhancedRetryService.executeWithRetry(
        () => fileUploadService.generatePresignedUploadUrl(fileUploadRequest),
        { 
          maxAttempts: 3, 
          initialDelayMs: 500,
          retryableErrors: ['timeout', 'SERVICE_UNAVAILABLE', 'EXTERNAL_SERVICE_ERROR']
        }
      );
      
      logger.info('Presigned URL generated successfully', { 
        fileId: uploadResponse.fileId, 
        expiresIn: uploadResponse.expiresIn 
      });

      // Create FileMetadata record with retry
      await enhancedRetryService.executeWithRetry(
        () => createFileMetadata(uploadResponse, uploadRequest, user),
        { 
          maxAttempts: 3, 
          initialDelayMs: 1000,
          retryableErrors: ['ThrottlingException', 'ProvisionedThroughputExceededException', 'ServiceUnavailable']
        }
      );

      logger.info('FileMetadata record created successfully');

      // Queue analysis with retry (non-critical)
      await queueAnalysisWithRetry(uploadResponse, uploadRequest, user);

      // Record success metrics
      const duration = Date.now() - startTime;
      await cloudWatchMonitoringService.recordPerformance('file-upload', duration, 'file-upload-service', true);
      await cloudWatchMonitoringService.recordUserActivity('file-upload', user.userId, user.organizationId);

      const response: UploadResponse = {
        fileId: uploadResponse.fileId,
        uploadUrl: uploadResponse.uploadUrl,
        downloadUrl: uploadResponse.downloadUrl,
        expiresIn: uploadResponse.expiresIn,
      };

      logger.info('File upload completed successfully', { 
        fileId: uploadResponse.fileId, 
        duration 
      });
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        },
        body: JSON.stringify(response),
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      await cloudWatchMonitoringService.recordPerformance('file-upload', duration, 'file-upload-service', false);
      
      logger.error('File upload failed', error as Error);
      throw error; // Let centralized error handler manage this
    }
  },
  'file-upload-service'
);

function errorResponse(
  statusCode: number,
  code: string,
  message: string
): APIGatewayProxyResult {
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
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
      },
    }),
  };
}

/**
 * Validate upload request with enhanced error messages
 */
async function validateUploadRequest(uploadRequest: UploadRequestBody): Promise<void> {
  const ALLOWED_EXTENSIONS = ['.c', '.cpp', '.h', '.hpp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  if (!uploadRequest.fileName || !uploadRequest.fileSize || !uploadRequest.contentType) {
    throw new Error('fileName, fileSize, and contentType are required');
  }

  // Validate file extension (Requirements 1.1)
  const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`);
  }

  // Validate file size (Requirements 1.2)
  if (uploadRequest.fileSize > MAX_FILE_SIZE) {
    throw new Error(`File size must not exceed 10MB (${MAX_FILE_SIZE} bytes)`);
  }

  logger.info('Upload request validation passed', { 
    fileType: ext, 
    fileSize: uploadRequest.fileSize 
  });
}

/**
 * Create file metadata record with enhanced error handling
 */
async function createFileMetadata(
  uploadResponse: any,
  uploadRequest: UploadRequestBody,
  user: any
): Promise<void> {
  const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
  const fileType = (ext === '.c' || ext === '.h') ? 'c' : 'cpp';
  const now = Math.floor(Date.now() / 1000);

  logger.info('Creating FileMetadata record', {
    fileId: uploadResponse.fileId,
    fileName: uploadRequest.fileName,
    fileType,
    userId: user.userId
  });

  try {
    await dynamoClient.send(new PutItemCommand({
      TableName: FILE_METADATA_TABLE,
      Item: marshall({
        file_id: uploadResponse.fileId,
        filename: uploadRequest.fileName,
        file_type: fileType,
        file_size: uploadRequest.fileSize,
        user_id: user.userId,
        upload_timestamp: now,
        analysis_status: 'pending',
        s3_key: uploadResponse.s3Key,
        created_at: now,
        updated_at: now,
      }),
    }));

    logger.info('FileMetadata record created successfully', { 
      fileId: uploadResponse.fileId 
    });

  } catch (error) {
    logger.error('Failed to create FileMetadata record', error as Error, {
      fileId: uploadResponse.fileId,
      table: FILE_METADATA_TABLE
    });

    // Enhanced error handling for DynamoDB errors
    if (error instanceof Error) {
      const errorName = (error as any).name || '';
      const errorMessage = error.message || '';

      if (errorName === 'AccessDenied' || errorMessage.includes('AccessDenied')) {
        await cloudWatchMonitoringService.recordError('PERMISSION_DENIED', 'file-upload-service', 'DYNAMODB_ACCESS');
        throw new Error(`Failed to save file metadata: Permission denied. Ensure Lambda has DynamoDB permissions.`);
      }

      if (errorName === 'ResourceNotFoundException') {
        await cloudWatchMonitoringService.recordError('RESOURCE_NOT_FOUND', 'file-upload-service', 'DYNAMODB_TABLE');
        throw new Error(`Failed to save file metadata: Table ${FILE_METADATA_TABLE} not found.`);
      }

      if (errorName === 'ThrottlingException' || errorName === 'ProvisionedThroughputExceededException') {
        await cloudWatchMonitoringService.recordError('THROTTLING', 'file-upload-service', 'DYNAMODB_THROTTLE');
        throw new Error(`Failed to save file metadata: Service temporarily unavailable. Please retry.`);
      }

      if (errorName === 'ValidationException') {
        await cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'file-upload-service', 'DYNAMODB_VALIDATION');
        throw new Error(`Failed to save file metadata: Invalid data format.`);
      }
    }

    // Generic error
    await cloudWatchMonitoringService.recordError('DATABASE_ERROR', 'file-upload-service', 'METADATA_CREATION');
    throw new Error(`Failed to create file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Queue analysis with retry and graceful failure
 */
async function queueAnalysisWithRetry(
  uploadResponse: any,
  uploadRequest: UploadRequestBody,
  user: any
): Promise<void> {
  const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
  
  if (!analysisQueueUrl) {
    logger.warn('ANALYSIS_QUEUE_URL not configured - analysis will not be triggered automatically');
    return;
  }

  const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
  const language = (ext === '.c' || ext === '.h') ? 'C' : 'CPP';

  try {
    await enhancedRetryService.executeWithRetry(
      async () => {
        logger.info('Queuing analysis', { 
          fileId: uploadResponse.fileId, 
          language 
        });

        await sqsClient.send(new SendMessageCommand({
          QueueUrl: analysisQueueUrl,
          MessageBody: JSON.stringify({
            fileId: uploadResponse.fileId,
            fileName: uploadRequest.fileName,
            s3Key: uploadResponse.s3Key,
            language,
            userId: user.userId,
            organizationId: user.organizationId || 'default-org',
          }),
        }));

        logger.info('Analysis queued successfully', { 
          fileId: uploadResponse.fileId 
        });
      },
      { 
        maxAttempts: 3, 
        initialDelayMs: 500,
        retryableErrors: ['timeout', 'SERVICE_UNAVAILABLE', 'ThrottlingException']
      }
    );

  } catch (error) {
    // Log but don't fail the upload - metadata is already saved
    logger.warn('Failed to queue analysis - file upload succeeded but analysis not triggered', {
      fileId: uploadResponse.fileId,
      error: (error as Error).message
    });

    await cloudWatchMonitoringService.recordError('QUEUE_FAILED', 'file-upload-service', 'SQS_ANALYSIS');
    
    // Don't throw - the upload was successful, analysis can be triggered manually
  }
}