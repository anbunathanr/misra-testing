import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SampleFileService } from '../../services/sample-file-service';
import { FileMetadataService } from '../../services/file-metadata-service';
import { UploadProgressService } from '../../services/upload-progress-service';
import { SampleFileUploadRequest, SampleFileUploadResponse } from '../../types/sample-file';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromContext } from '../../utils/auth-util';

/**
 * Lambda function for automatic sample file upload
 * Randomly selects a sample file and uploads it to S3 for analysis
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };

  try {
    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Request body is required',
        }),
      };
    }

    const request: SampleFileUploadRequest = JSON.parse(event.body);
    
    if (!request.userEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'User email is required',
        }),
      };
    }

    const sampleFileService = new SampleFileService();
    const fileMetadataService = new FileMetadataService();
    
    // Randomly select a sample file based on preferences
    const selectedSample = await sampleFileService.getRandomSampleFile(
      request.preferredLanguage,
      request.difficultyLevel
    );

    if (!selectedSample) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No sample files available matching the criteria',
        }),
      };
    }

    // Get the full sample file with content
    const sampleFile = await sampleFileService.getSampleFileById(selectedSample.id);
    
    if (!sampleFile) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Sample file not found',
        }),
      };
    }

    // Generate unique file ID and S3 key
    const fileId = uuidv4();
    const s3Key = `samples/${fileId}_${sampleFile.filename}`;
    
    // Upload file content to S3
    const s3Client = new S3Client({});
    const bucketName = process.env.FILE_STORAGE_BUCKET || 'misra-file-storage';
    
    const fileContent = Buffer.from(sampleFile.file_content, 'base64');
    
    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: sampleFile.language === 'C' ? 'text/x-c' : 'text/x-c++',
      Metadata: {
        'sample-id': sampleFile.sample_id,
        'user-email': request.userEmail,
        'language': sampleFile.language,
        'expected-violations': sampleFile.expected_violations.toString(),
      },
    });

    await s3Client.send(uploadCommand);

    // Create file metadata record
    await fileMetadataService.createFileMetadata({
      file_id: fileId,
      filename: sampleFile.filename,
      file_type: sampleFile.language.toLowerCase() as 'c' | 'cpp',
      file_size: sampleFile.file_size,
      user_id: request.userEmail, // Using email as user ID for now
      upload_timestamp: Date.now(),
      analysis_status: 'pending',
      s3_key: s3Key,
      is_sample_file: true,
      sample_id: sampleFile.sample_id,
      sample_description: sampleFile.description,
      expected_violations: sampleFile.expected_violations,
    });

    const response: SampleFileUploadResponse = {
      fileId,
      fileName: sampleFile.filename,
      fileSize: sampleFile.file_size,
      language: sampleFile.language,
      description: sampleFile.description,
      expectedViolations: sampleFile.expected_violations,
      uploadStatus: 'completed',
      s3Key,
      sampleId: sampleFile.sample_id,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...response,
      }),
    };
  } catch (error) {
    console.error('Error uploading sample file:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to upload sample file',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * Generate error response
 */
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
      success: false,
      error: {
        code,
        message,
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
      },
    }),
  };
}