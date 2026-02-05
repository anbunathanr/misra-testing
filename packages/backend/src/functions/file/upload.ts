import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { FileUploadService, FileUploadRequest } from '../../services/file/file-upload-service';
import { JWTService } from '../../services/auth/jwt-service';

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