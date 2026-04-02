import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { FileUploadService, FileUploadRequest } from '../../services/file/file-upload-service';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { AnalysisStatus, FileType } from '../../types/file-metadata';
import { getUserFromContext } from '../../utils/auth-util';

const ALLOWED_EXTENSIONS = ['.c', '.cpp', '.h', '.hpp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const sqsClient = new SQSClient({});

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
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new DynamoDBClientWrapper(environment);
const fileMetadataService = new FileMetadataService(dbClient);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user from Lambda Authorizer context
    const user = getUserFromContext(event);
    if (!user.userId) {
      return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    // Parse request body
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const uploadRequest: UploadRequestBody = JSON.parse(event.body);

    // Validate input
    if (!uploadRequest.fileName || !uploadRequest.fileSize || !uploadRequest.contentType) {
      return errorResponse(400, 'INVALID_INPUT', 'fileName, fileSize, and contentType are required');
    }

    // Validate file extension (Requirements 1.1)
    const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return errorResponse(400, 'INVALID_FILE_TYPE', `Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed`);
    }

    // Validate file size (Requirements 1.2)
    if (uploadRequest.fileSize > MAX_FILE_SIZE) {
      return errorResponse(400, 'FILE_TOO_LARGE', `File size must not exceed 10MB (${MAX_FILE_SIZE} bytes)`);
    }

    // Create file upload request
    const fileUploadRequest: FileUploadRequest = {
      fileName: uploadRequest.fileName,
      fileSize: uploadRequest.fileSize,
      contentType: uploadRequest.contentType,
      organizationId: user.organizationId,
      userId: user.userId,
    };

    // Generate presigned upload URL
    const uploadResponse = await fileUploadService.generatePresignedUploadUrl(fileUploadRequest);

    // Create FileMetadata record
    try {
      const now = Math.floor(Date.now() / 1000); // Convert to seconds
      await fileMetadataService.createFileMetadata({
        file_id: uploadResponse.fileId,
        filename: uploadRequest.fileName,
        file_type: uploadRequest.fileName.endsWith('.c') ? FileType.C : FileType.CPP,
        file_size: uploadRequest.fileSize,
        user_id: user.userId, // Use user ID as-is from context
        upload_timestamp: now,
        analysis_status: AnalysisStatus.PENDING,
        s3_key: `uploads/${user.organizationId}/${user.userId}/${Date.now()}-${uploadResponse.fileId}-${uploadRequest.fileName}`,
        created_at: now,
        updated_at: now
      });
      console.log(`FileMetadata record created for file ${uploadResponse.fileId}`);
    } catch (metadataError) {
      console.error('Error creating FileMetadata record:', metadataError);
      // Don't fail the upload if metadata creation fails
    }

    // Trigger MISRA analysis via SQS (Requirement 6.1)
    const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
    if (analysisQueueUrl) {
      const language = (ext === '.c' || ext === '.h') ? 'C' : 'CPP';
      try {
        await sqsClient.send(new SendMessageCommand({
          QueueUrl: analysisQueueUrl,
          MessageBody: JSON.stringify({
            fileId: uploadResponse.fileId,
            userId: user.userId,
            language,
          }),
        }));
        console.log(`Analysis queued for file ${uploadResponse.fileId}, language: ${language}`);
      } catch (sqsError) {
        console.error('Failed to queue analysis job:', sqsError);
        // Don't fail the upload if SQS send fails
      }
    } else {
      console.warn('ANALYSIS_QUEUE_URL is not set - analysis will not be triggered automatically');
    }

    const response: UploadResponse = {
      fileId: uploadResponse.fileId,
      uploadUrl: uploadResponse.uploadUrl,
      downloadUrl: uploadResponse.downloadUrl,
      expiresIn: uploadResponse.expiresIn,
    };

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
    console.error('File upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('validation failed')) {
        return errorResponse(400, 'FILE_VALIDATION_ERROR', error.message);
      }
      if (error.message.includes('Failed to generate upload URL')) {
        return errorResponse(503, 'UPLOAD_SERVICE_UNAVAILABLE', 'File upload service temporarily unavailable');
      }
    }
    
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