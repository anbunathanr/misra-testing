import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { SampleFileService } from '../../services/sample-file-service';
import { SampleFileUploadRequest, SampleFileUploadResponse } from '../../types/sample-file';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromContext } from '../../utils/auth-util';

/**
 * Lambda function for automatic sample file upload with progress tracking
 * Task 4.1: Create sample file upload Lambda function
 * 
 * Features:
 * - Automatic sample file selection from predefined library
 * - Secure S3 upload process for selected sample files
 * - Upload progress tracking and real-time feedback
 * - File validation for C/C++ file types and size limits
 * - Error handling for upload failures with retry options
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  };

  try {
    console.log('[SAMPLE-UPLOAD] Starting automatic sample file upload with progress tracking');

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers,
        body: '',
      };
    }

    // Extract user from Lambda Authorizer context
    const user = getUserFromContext(event);
    if (!user.userId) {
      console.warn('[SAMPLE-UPLOAD] ✗ Unauthorized: No user in context');
      return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
    }

    console.log(`[SAMPLE-UPLOAD] User authenticated: ${user.userId}, Organization: ${user.organizationId}`);

    if (!event.body) {
      return errorResponse(400, 'MISSING_BODY', 'Request body is required');
    }

    const request: SampleFileUploadRequest = JSON.parse(event.body);
    
    if (!request.userEmail) {
      return errorResponse(400, 'MISSING_EMAIL', 'User email is required');
    }

    console.log(`[SAMPLE-UPLOAD] Processing request for user: ${request.userEmail}`);
    console.log(`[SAMPLE-UPLOAD] Preferred language: ${request.preferredLanguage || 'any'}`);
    console.log(`[SAMPLE-UPLOAD] Difficulty level: ${request.difficultyLevel || 'any'}`);

    const sampleFileService = new SampleFileService();
    
    // Step 1: Randomly select a sample file based on preferences
    console.log('[SAMPLE-UPLOAD] Step 1: Selecting sample file automatically...');
    const selectedSample = await sampleFileService.getRandomSampleFile(
      request.preferredLanguage,
      request.difficultyLevel
    );

    if (!selectedSample) {
      console.warn('[SAMPLE-UPLOAD] ✗ No sample files available matching criteria');
      return errorResponse(404, 'NO_SAMPLES_AVAILABLE', 'No sample files available matching the criteria');
    }

    console.log(`[SAMPLE-UPLOAD] ✓ Selected sample: ${selectedSample.name}`);
    console.log(`[SAMPLE-UPLOAD] Language: ${selectedSample.language}, Size: ${selectedSample.size} bytes`);
    console.log(`[SAMPLE-UPLOAD] Expected violations: ${selectedSample.expectedViolations}`);

    // Step 2: Get the full sample file with content
    console.log('[SAMPLE-UPLOAD] Step 2: Retrieving sample file content...');
    const sampleFile = await sampleFileService.getSampleFileById(selectedSample.id);
    
    if (!sampleFile) {
      console.error(`[SAMPLE-UPLOAD] ✗ Sample file not found: ${selectedSample.id}`);
      return errorResponse(404, 'SAMPLE_NOT_FOUND', 'Sample file not found');
    }

    console.log(`[SAMPLE-UPLOAD] ✓ Sample file content retrieved: ${sampleFile.filename}`);

    // Step 3: Generate unique file ID and S3 key
    const fileId = uuidv4();
    const timestamp = Date.now();
    const s3Key = `samples/${user.organizationId || 'default'}/${user.userId}/${timestamp}-${fileId}-${sampleFile.filename}`;
    
    console.log(`[SAMPLE-UPLOAD] Step 3: Generated file ID: ${fileId}`);
    console.log(`[SAMPLE-UPLOAD] S3 Key: ${s3Key}`);

    // Step 4: Create upload progress record
    console.log('[SAMPLE-UPLOAD] Step 4: Creating upload progress record...');
    await createUploadProgressRecord(fileId, user.userId, sampleFile.filename, sampleFile.file_size);

    // Step 5: Upload file content to S3 with progress tracking
    console.log('[SAMPLE-UPLOAD] Step 5: Uploading file to S3...');
    const s3Client = new S3Client({});
    const bucketName = process.env.FILE_STORAGE_BUCKET || 'misra-file-storage';
    
    // Update progress to 25% (upload starting)
    await updateUploadProgress(fileId, 25, 'Uploading to S3...');

    const fileContent = Buffer.from(sampleFile.file_content, 'base64');
    
    // Validate file size (Requirements 2.2)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    if (fileContent.length > maxFileSize) {
      console.warn(`[SAMPLE-UPLOAD] ✗ File too large: ${fileContent.length} bytes (max: ${maxFileSize})`);
      await updateUploadProgress(fileId, 0, 'Upload failed: File too large', 'failed');
      return errorResponse(400, 'FILE_TOO_LARGE', `File size must not exceed 10MB`);
    }

    // Validate file type (Requirements 2.1)
    const allowedExtensions = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp'];
    const ext = sampleFile.filename.substring(sampleFile.filename.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      console.warn(`[SAMPLE-UPLOAD] ✗ Invalid file type: ${ext}`);
      await updateUploadProgress(fileId, 0, 'Upload failed: Invalid file type', 'failed');
      return errorResponse(400, 'INVALID_FILE_TYPE', `Only ${allowedExtensions.join(', ')} files are allowed`);
    }

    console.log(`[SAMPLE-UPLOAD] ✓ File validation passed: type=${ext}, size=${fileContent.length} bytes`);

    // Update progress to 50% (validation complete)
    await updateUploadProgress(fileId, 50, 'File validated, uploading...');

    const uploadCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileContent,
      ContentType: sampleFile.language === 'C' ? 'text/x-c' : 'text/x-c++',
      Metadata: {
        'sample-id': sampleFile.sample_id,
        'user-email': request.userEmail,
        'user-id': user.userId,
        'language': sampleFile.language,
        'expected-violations': sampleFile.expected_violations.toString(),
        'file-id': fileId,
      },
    });

    await s3Client.send(uploadCommand);
    console.log(`[SAMPLE-UPLOAD] ✓ File uploaded to S3: ${s3Key}`);

    // Update progress to 75% (upload complete)
    await updateUploadProgress(fileId, 75, 'Upload complete, creating metadata...');

    // Step 6: Create file metadata record
    console.log('[SAMPLE-UPLOAD] Step 6: Creating file metadata record...');
    await createFileMetadataRecord(fileId, sampleFile, user, s3Key, fileContent.length);

    // Update progress to 100% (complete)
    await updateUploadProgress(fileId, 100, 'Upload completed successfully', 'completed');

    console.log(`[SAMPLE-UPLOAD] ✓ Sample file upload completed successfully: ${fileId}`);

    const response: SampleFileUploadResponse = {
      fileId,
      fileName: sampleFile.filename,
      fileSize: fileContent.length,
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
        message: 'Sample file uploaded successfully',
        ...response,
      }),
    };
  } catch (error) {
    console.error('[SAMPLE-UPLOAD] ✗ Error uploading sample file:', error);
    
    // Try to update progress to failed state if we have a fileId
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return errorResponse(500, 'UPLOAD_FAILED', `Failed to upload sample file: ${errorMessage}`);
  }
};

/**
 * Create upload progress record in DynamoDB
 */
async function createUploadProgressRecord(
  fileId: string,
  userId: string,
  fileName: string,
  fileSize: number
): Promise<void> {
  const dynamoClient = new DynamoDBClient({});
  const progressTable = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';

  const command = new PutItemCommand({
    TableName: progressTable,
    Item: marshall({
      file_id: fileId,
      user_id: userId,
      file_name: fileName,
      file_size: fileSize,
      progress_percentage: 0,
      status: 'starting',
      message: 'Initializing upload...',
      created_at: Date.now(),
      updated_at: Date.now(),
    }),
  });

  await dynamoClient.send(command);
  console.log(`[SAMPLE-UPLOAD] ✓ Upload progress record created: ${fileId}`);
}

/**
 * Update upload progress in DynamoDB
 */
async function updateUploadProgress(
  fileId: string,
  percentage: number,
  message: string,
  status: string = 'uploading'
): Promise<void> {
  const dynamoClient = new DynamoDBClient({});
  const progressTable = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';

  const command = new UpdateItemCommand({
    TableName: progressTable,
    Key: marshall({ file_id: fileId }),
    UpdateExpression: 'SET progress_percentage = :percentage, #status = :status, message = :message, updated_at = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: marshall({
      ':percentage': percentage,
      ':status': status,
      ':message': message,
      ':updatedAt': Date.now(),
    }),
  });

  await dynamoClient.send(command);
  console.log(`[SAMPLE-UPLOAD] Progress updated: ${fileId} - ${percentage}% - ${message}`);
}

/**
 * Create file metadata record in DynamoDB
 */
async function createFileMetadataRecord(
  fileId: string,
  sampleFile: any,
  user: any,
  s3Key: string,
  actualFileSize: number
): Promise<void> {
  const dynamoClient = new DynamoDBClient({});
  const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata';

  const now = Math.floor(Date.now() / 1000);
  const fileType = (sampleFile.language === 'C') ? 'c' : 'cpp';

  const command = new PutItemCommand({
    TableName: fileMetadataTable,
    Item: marshall({
      file_id: fileId,
      filename: sampleFile.filename,
      file_type: fileType,
      file_size: actualFileSize,
      user_id: user.userId,
      upload_timestamp: now,
      analysis_status: 'pending',
      s3_key: s3Key,
      created_at: now,
      updated_at: now,
      // Sample file metadata
      is_sample_file: true,
      sample_id: sampleFile.sample_id,
      sample_description: sampleFile.description,
      expected_violations: sampleFile.expected_violations,
    }),
  });

  await dynamoClient.send(command);
  console.log(`[SAMPLE-UPLOAD] ✓ File metadata record created: ${fileId}`);
}

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