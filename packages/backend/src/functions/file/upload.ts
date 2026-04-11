import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { FileUploadService, FileUploadRequest } from '../../services/file/file-upload-service';
import { getUserFromContext } from '../../utils/auth-util';

const ALLOWED_EXTENSIONS = ['.c', '.cpp', '.h', '.hpp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const sqsClient = new SQSClient({});
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FILE_METADATA_TABLE = process.env.FILE_METADATA_TABLE || 'FileMetadata-dev';

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

const fileUploadService = new FileUploadService();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    console.log(`[UPLOAD] Starting file upload handler`);
    
    // Extract user from Lambda Authorizer context
    const user = getUserFromContext(event);
    if (!user.userId) {
      console.warn(`[UPLOAD] ✗ Unauthorized: No user in context`);
      return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
    }
    
    console.log(`[UPLOAD] User authenticated: ${user.userId}, Organization: ${user.organizationId}`);

    // Parse request body
    if (!event.body) {
      console.warn(`[UPLOAD] ✗ Missing request body`);
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const uploadRequest: UploadRequestBody = JSON.parse(event.body);
    console.log(`[UPLOAD] Request parsed: fileName=${uploadRequest.fileName}, fileSize=${uploadRequest.fileSize}, contentType=${uploadRequest.contentType}`);

    // Validate input
    if (!uploadRequest.fileName || !uploadRequest.fileSize || !uploadRequest.contentType) {
      console.warn(`[UPLOAD] ✗ Invalid input: missing required fields`);
      return errorResponse(400, 'INVALID_INPUT', 'fileName, fileSize, and contentType are required');
    }

    // Validate file extension (Requirements 1.1)
    const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      console.warn(`[UPLOAD] ✗ Invalid file type: ${ext}`);
      return errorResponse(400, 'INVALID_FILE_TYPE', `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`);
    }

    // Validate file size (Requirements 1.2)
    if (uploadRequest.fileSize > MAX_FILE_SIZE) {
      console.warn(`[UPLOAD] ✗ File too large: ${uploadRequest.fileSize} bytes (max: ${MAX_FILE_SIZE})`);
      return errorResponse(400, 'FILE_TOO_LARGE', `File size must not exceed 10MB (${MAX_FILE_SIZE} bytes)`);
    }

    console.log(`[UPLOAD] ✓ Validation passed: file type=${ext}, size=${uploadRequest.fileSize} bytes`);

    // Create file upload request
    const fileUploadRequest: FileUploadRequest = {
      fileName: uploadRequest.fileName,
      fileSize: uploadRequest.fileSize,
      contentType: uploadRequest.contentType,
      organizationId: user.organizationId,
      userId: user.userId,
    };

    // Generate presigned upload URL
    console.log(`[UPLOAD] Generating presigned upload URL...`);
    const uploadResponse = await fileUploadService.generatePresignedUploadUrl(fileUploadRequest);
    console.log(`[UPLOAD] ✓ Presigned URL generated: fileId=${uploadResponse.fileId}, expiresIn=${uploadResponse.expiresIn}s`);

    // Build the s3Key once so it's consistent between metadata and SQS message
    const s3Key = uploadResponse.s3Key;
    const language = (ext === '.c' || ext === '.h') ? 'C' : 'CPP';

    // Create FileMetadata record directly (bypass validator to avoid UUID length issues)
    // CRITICAL: This must succeed or the upload fails - no silent catches!
    console.log(`[UPLOAD] Creating FileMetadata for file ${uploadResponse.fileId}, user ${user.userId}, table: ${FILE_METADATA_TABLE}`);
    try {
      const now = Math.floor(Date.now() / 1000);
      const fileType = (ext === '.c' || ext === '.h') ? 'c' : 'cpp';
      
      console.log(`[UPLOAD] Preparing metadata: fileId=${uploadResponse.fileId}, filename=${uploadRequest.fileName}, fileType=${fileType}, fileSize=${uploadRequest.fileSize}`);
      
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
          s3_key: s3Key,
          created_at: now,
          updated_at: now,
        }),
      }));
      
      console.log(`[UPLOAD] ✓ FileMetadata record created successfully for file ${uploadResponse.fileId}`);
    } catch (metadataError) {
      console.error(`[UPLOAD] ✗ CRITICAL: Failed to create FileMetadata for file ${uploadResponse.fileId}:`, metadataError);
      
      // Determine error type and return appropriate status code
      if (metadataError instanceof Error) {
        const errorName = (metadataError as any).name || '';
        const errorMessage = metadataError.message || '';
        
        if (errorName === 'AccessDenied' || errorMessage.includes('AccessDenied') || errorMessage.includes('not authorized')) {
          console.error(`[UPLOAD] ✗ IAM Permission Error: Lambda does not have permission to write to DynamoDB table ${FILE_METADATA_TABLE}`);
          return errorResponse(500, 'METADATA_PERMISSION_ERROR', 
            `Failed to save file metadata: Permission denied. FileId: ${uploadResponse.fileId}. Ensure Lambda has dynamodb:PutItem permission.`);
        }
        
        if (errorName === 'ResourceNotFoundException' || errorMessage.includes('ResourceNotFoundException')) {
          console.error(`[UPLOAD] ✗ Table Not Found: DynamoDB table ${FILE_METADATA_TABLE} does not exist`);
          return errorResponse(500, 'METADATA_TABLE_ERROR', 
            `Failed to save file metadata: Table not found. FileId: ${uploadResponse.fileId}. Table: ${FILE_METADATA_TABLE}`);
        }
        
        if (errorName === 'ThrottlingException' || errorName === 'ProvisionedThroughputExceededException') {
          console.error(`[UPLOAD] ✗ Throttling: DynamoDB is temporarily unavailable`);
          return errorResponse(503, 'METADATA_THROTTLED', 
            `Failed to save file metadata: Service temporarily unavailable. FileId: ${uploadResponse.fileId}. Please retry.`);
        }
        
        if (errorName === 'ValidationException') {
          console.error(`[UPLOAD] ✗ Validation Error: ${errorMessage}`);
          return errorResponse(400, 'METADATA_VALIDATION_ERROR', 
            `Failed to save file metadata: Invalid data. FileId: ${uploadResponse.fileId}. Error: ${errorMessage}`);
        }
      }
      
      // Generic error
      console.error(`[UPLOAD] ✗ Unknown error creating metadata:`, metadataError);
      return errorResponse(500, 'METADATA_CREATION_FAILED', 
        `Failed to create file metadata. FileId: ${uploadResponse.fileId}. Error: ${metadataError instanceof Error ? metadataError.message : 'Unknown error'}`);
    }

    // Trigger MISRA analysis via SQS (Requirement 6.1)
    // Only send SQS message if metadata was successfully created
    const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
    if (analysisQueueUrl) {
      try {
        console.log(`[UPLOAD] Queuing analysis for file ${uploadResponse.fileId}, language: ${language}`);
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: analysisQueueUrl,
          MessageBody: JSON.stringify({
            fileId: uploadResponse.fileId,
            fileName: uploadRequest.fileName,
            s3Key,
            language,
            userId: user.userId,
            organizationId: user.organizationId || 'default-org',
          }),
        }));
        console.log(`[UPLOAD] ✓ Analysis queued successfully for file ${uploadResponse.fileId}`);
      } catch (sqsError) {
        console.error(`[UPLOAD] ✗ Failed to queue analysis for file ${uploadResponse.fileId}:`, sqsError);
        // Log but don't fail - metadata is already saved, analysis can be triggered manually or via retry
        console.warn(`[UPLOAD] ⚠ Analysis not queued for file ${uploadResponse.fileId}, but metadata was saved. File will be available in UI.`);
      }
    } else {
      console.warn('[UPLOAD] ⚠ ANALYSIS_QUEUE_URL is not set - analysis will not be triggered automatically');
    }

    const response: UploadResponse = {
      fileId: uploadResponse.fileId,
      uploadUrl: uploadResponse.uploadUrl,
      downloadUrl: uploadResponse.downloadUrl,
      expiresIn: uploadResponse.expiresIn,
    };

    console.log(`[UPLOAD] ✓ Upload complete for file ${uploadResponse.fileId}, user ${user.userId}`);
    
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
    console.error('[UPLOAD] ✗ Unhandled error in upload handler:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('validation failed')) {
        console.error('[UPLOAD] ✗ File validation error:', error.message);
        return errorResponse(400, 'FILE_VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('Failed to generate upload URL')) {
        console.error('[UPLOAD] ✗ Upload service unavailable:', error.message);
        return errorResponse(503, 'UPLOAD_SERVICE_UNAVAILABLE', 'File upload service temporarily unavailable');
      }
    }
    
    console.error('[UPLOAD] ✗ Internal server error:', error);
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error');
  }
};

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