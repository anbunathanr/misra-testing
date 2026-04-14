import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({ region: process.env.AWS_REGION });
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

interface UploadUrlRequest {
  fileName: string;
  fileSize: number;
  fileType: string;
  userEmail: string;
}

interface UploadUrlResponse {
  uploadUrl: string;
  fileId: string;
  expiresIn: number;
  maxFileSize: number;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const { fileName, fileSize, fileType, userEmail }: UploadUrlRequest = JSON.parse(event.body);

    // Validate input
    if (!fileName || !fileSize || !userEmail) {
      return errorResponse(400, 'INVALID_INPUT', 'fileName, fileSize, and userEmail are required');
    }

    // Validate file type
    const allowedExtensions = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp'];
    const fileExtension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      return errorResponse(400, 'INVALID_FILE_TYPE', 'Only C/C++ source files are allowed (.c, .cpp, .h, .hpp)');
    }

    // Validate file size (max 10MB)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileSize > maxFileSize) {
      return errorResponse(400, 'FILE_TOO_LARGE', `File size must be less than ${maxFileSize / 1024 / 1024}MB`);
    }

    const fileId = uuidv4();
    const bucketName = process.env.FILE_STORAGE_BUCKET_NAME!;
    const s3Key = `uploads/${userEmail}/${fileId}/${fileName}`;

    // Generate presigned URL for upload
    const putObjectCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      ContentType: fileType || 'text/plain',
      ContentLength: fileSize,
      Metadata: {
        'user-email': userEmail,
        'file-id': fileId,
        'original-name': fileName
      }
    });

    const uploadUrl = await getSignedUrl(s3Client, putObjectCommand, { 
      expiresIn: 3600 // 1 hour
    });

    // Store file metadata in DynamoDB
    const fileRecord = {
      fileId,
      userEmail,
      fileName,
      fileSize,
      fileType: fileType || 'text/plain',
      s3Key,
      s3Bucket: bucketName,
      status: 'uploaded', // Mark as uploaded immediately for production
      createdAt: new Date().toISOString(),
      uploadExpiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour from now
    };

    await dynamoClient.send(new PutCommand({
      TableName: process.env.FILE_METADATA_TABLE_NAME!,
      Item: fileRecord
    }));

    const response: UploadUrlResponse = {
      uploadUrl,
      fileId,
      expiresIn: 3600,
      maxFileSize
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
    console.error('Upload URL generation error:', error);
    return errorResponse(500, 'UPLOAD_URL_ERROR', 'Failed to generate upload URL. Please try again.');
  }
};

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