import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FileUploadService, FileUploadRequest } from '../../services/file/file-upload-service';
import { JWTService } from '../../services/auth/jwt-service';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { AnalysisStatus, FileType } from '../../types/file-metadata';

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
const jwtService = new JWTService();
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new DynamoDBClientWrapper(environment);
const fileMetadataService = new FileMetadataService(dbClient);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract and validate JWT token
    const authHeader = event.headers.Authorization || event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(401, 'MISSING_TOKEN', 'Authorization token is required');
    }

    const token = authHeader.substring(7);
    let tokenPayload;
    
    try {
      tokenPayload = await jwtService.verifyAccessToken(token);
    } catch (error) {
      return errorResponse(401, 'INVALID_TOKEN', 'Invalid or expired token');
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

    // Create file upload request
    const fileUploadRequest: FileUploadRequest = {
      fileName: uploadRequest.fileName,
      fileSize: uploadRequest.fileSize,
      contentType: uploadRequest.contentType,
      organizationId: tokenPayload.organizationId,
      userId: tokenPayload.userId,
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
        user_id: tokenPayload.userId, // Use user ID as-is from JWT
        upload_timestamp: now,
        analysis_status: AnalysisStatus.PENDING,
        s3_key: `uploads/${tokenPayload.organizationId}/${tokenPayload.userId}/${Date.now()}-${uploadResponse.fileId}-${uploadRequest.fileName}`,
        created_at: now,
        updated_at: now
      });
      console.log(`FileMetadata record created for file ${uploadResponse.fileId}`);
    } catch (metadataError) {
      console.error('Error creating FileMetadata record:', metadataError);
      // Don't fail the upload if metadata creation fails
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