"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const sample_file_service_1 = require("../../services/sample-file-service");
const uuid_1 = require("uuid");
const auth_util_1 = require("../../utils/auth-util");
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
const handler = async (event) => {
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
        const user = await (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            console.warn('[SAMPLE-UPLOAD] ✗ Unauthorized: No user in context');
            return errorResponse(401, 'UNAUTHORIZED', 'User not authenticated');
        }
        console.log(`[SAMPLE-UPLOAD] User authenticated: ${user.userId}, Organization: ${user.organizationId}`);
        if (!event.body) {
            return errorResponse(400, 'MISSING_BODY', 'Request body is required');
        }
        const request = JSON.parse(event.body);
        if (!request.userEmail) {
            return errorResponse(400, 'MISSING_EMAIL', 'User email is required');
        }
        console.log(`[SAMPLE-UPLOAD] Processing request for user: ${request.userEmail}`);
        console.log(`[SAMPLE-UPLOAD] Preferred language: ${request.preferredLanguage || 'any'}`);
        console.log(`[SAMPLE-UPLOAD] Difficulty level: ${request.difficultyLevel || 'any'}`);
        const sampleFileService = new sample_file_service_1.SampleFileService();
        // Step 1: Randomly select a sample file based on preferences
        console.log('[SAMPLE-UPLOAD] Step 1: Selecting sample file automatically...');
        const selectedSample = await sampleFileService.getRandomSampleFile(request.preferredLanguage, request.difficultyLevel);
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
        const fileId = (0, uuid_1.v4)();
        const timestamp = Date.now();
        const s3Key = `samples/${user.organizationId || 'default'}/${user.userId}/${timestamp}-${fileId}-${sampleFile.filename}`;
        console.log(`[SAMPLE-UPLOAD] Step 3: Generated file ID: ${fileId}`);
        console.log(`[SAMPLE-UPLOAD] S3 Key: ${s3Key}`);
        // Step 4: Create upload progress record
        console.log('[SAMPLE-UPLOAD] Step 4: Creating upload progress record...');
        await createUploadProgressRecord(fileId, user.userId, sampleFile.filename, sampleFile.file_size);
        // Step 5: Upload file content to S3 with progress tracking
        console.log('[SAMPLE-UPLOAD] Step 5: Uploading file to S3...');
        const s3Client = new client_s3_1.S3Client({});
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
        const uploadCommand = new client_s3_1.PutObjectCommand({
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
        const response = {
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
    }
    catch (error) {
        console.error('[SAMPLE-UPLOAD] ✗ Error uploading sample file:', error);
        // Try to update progress to failed state if we have a fileId
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return errorResponse(500, 'UPLOAD_FAILED', `Failed to upload sample file: ${errorMessage}`);
    }
};
exports.handler = handler;
/**
 * Create upload progress record in DynamoDB
 */
async function createUploadProgressRecord(fileId, userId, fileName, fileSize) {
    const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
    const progressTable = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';
    const command = new client_dynamodb_1.PutItemCommand({
        TableName: progressTable,
        Item: (0, util_dynamodb_1.marshall)({
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
async function updateUploadProgress(fileId, percentage, message, status = 'uploading') {
    const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
    const progressTable = process.env.UPLOAD_PROGRESS_TABLE || 'UploadProgress';
    const command = new client_dynamodb_1.UpdateItemCommand({
        TableName: progressTable,
        Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
        UpdateExpression: 'SET progress_percentage = :percentage, #status = :status, message = :message, updated_at = :updatedAt',
        ExpressionAttributeNames: {
            '#status': 'status',
        },
        ExpressionAttributeValues: (0, util_dynamodb_1.marshall)({
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
async function createFileMetadataRecord(fileId, sampleFile, user, s3Key, actualFileSize) {
    const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
    const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata';
    const now = Math.floor(Date.now() / 1000);
    const fileType = (sampleFile.language === 'C') ? 'c' : 'cpp';
    const command = new client_dynamodb_1.PutItemCommand({
        TableName: fileMetadataTable,
        Item: (0, util_dynamodb_1.marshall)({
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
function errorResponse(statusCode, code, message) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLXNhbXBsZS13aXRoLXByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLXNhbXBsZS13aXRoLXByb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBNkY7QUFDN0YsMERBQWtEO0FBQ2xELDRFQUF1RTtBQUV2RSwrQkFBb0M7QUFDcEMscURBQTJEO0FBRTNEOzs7Ozs7Ozs7O0dBVUc7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLE9BQU8sR0FBRztRQUNkLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsNkJBQTZCLEVBQUUsR0FBRztRQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7UUFDNUQsOEJBQThCLEVBQUUsY0FBYztLQUMvQyxDQUFDO0lBRUYsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4RUFBOEUsQ0FBQyxDQUFDO1FBRTVGLDRCQUE0QjtRQUM1QixJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPO2dCQUNQLElBQUksRUFBRSxFQUFFO2FBQ1QsQ0FBQztRQUNKLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1lBQ25FLE9BQU8sYUFBYSxDQUFDLEdBQUcsRUFBRSxjQUFjLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsSUFBSSxDQUFDLE1BQU0sbUJBQW1CLElBQUksQ0FBQyxjQUFj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Q1AsY0FBYyxFQUFFLGtCQUFrQjtZQUNsQyw2QkFBNkIsRUFBRSxHQUFHO1lBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjtTQUM3RDtRQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO1lBQ25CLE9BQU8sRUFBRSxLQUFLO1lBQ2QsS0FBSyxFQUFFO2dCQUNMLElBQUk7Z0JBQ0osT0FBTztnQkFDUCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7YUFDbkQ7U0FDRixDQUFDO0tBQ0gsQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBQdXRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFB1dEl0ZW1Db21tYW5kLCBVcGRhdGVJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFNhbXBsZUZpbGVTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvc2FtcGxlLWZpbGUtc2VydmljZSc7XHJcbmltcG9ydCB7IFNhbXBsZUZpbGVVcGxvYWRSZXF1ZXN0LCBTYW1wbGVGaWxlVXBsb2FkUmVzcG9uc2UgfSBmcm9tICcuLi8uLi90eXBlcy9zYW1wbGUtZmlsZSc7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBmdW5jdGlvbiBmb3IgYXV0b21hdGljIHNhbXBsZSBmaWxlIHVwbG9hZCB3aXRoIHByb2dyZXNzIHRyYWNraW5nXHJcbiAqIFRhc2sgNC4xOiBDcmVhdGUgc2FtcGxlIGZpbGUgdXBsb2FkIExhbWJkYSBmdW5jdGlvblxyXG4gKiBcclxuICogRmVhdHVyZXM6XHJcbiAqIC0gQXV0b21hdGljIHNhbXBsZSBmaWxlIHNlbGVjdGlvbiBmcm9tIHByZWRlZmluZWQgbGlicmFyeVxyXG4gKiAtIFNlY3VyZSBTMyB1cGxvYWQgcHJvY2VzcyBmb3Igc2VsZWN0ZWQgc2FtcGxlIGZpbGVzXHJcbiAqIC0gVXBsb2FkIHByb2dyZXNzIHRyYWNraW5nIGFuZCByZWFsLXRpbWUgZmVlZGJhY2tcclxuICogLSBGaWxlIHZhbGlkYXRpb24gZm9yIEMvQysrIGZpbGUgdHlwZXMgYW5kIHNpemUgbGltaXRzXHJcbiAqIC0gRXJyb3IgaGFuZGxpbmcgZm9yIHVwbG9hZCBmYWlsdXJlcyB3aXRoIHJldHJ5IG9wdGlvbnNcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc3QgaGVhZGVycyA9IHtcclxuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCxPUFRJT05TJyxcclxuICB9O1xyXG5cclxuICB0cnkge1xyXG4gICAgY29uc29sZS5sb2coJ1tTQU1QTEUtVVBMT0FEXSBTdGFydGluZyBhdXRvbWF0aWMgc2FtcGxlIGZpbGUgdXBsb2FkIHdpdGggcHJvZ3Jlc3MgdHJhY2tpbmcnKTtcclxuXHJcbiAgICAvLyBIYW5kbGUgcHJlZmxpZ2h0IHJlcXVlc3RzXHJcbiAgICBpZiAoZXZlbnQuaHR0cE1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogJycsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignW1NBTVBMRS1VUExPQURdIOKclyBVbmF1dGhvcml6ZWQ6IE5vIHVzZXIgaW4gY29udGV4dCcpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDEsICdVTkFVVEhPUklaRUQnLCAnVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0gVXNlciBhdXRoZW50aWNhdGVkOiAke3VzZXIudXNlcklkfSwgT3JnYW5pemF0aW9uOiAke3VzZXIub3JnYW5pemF0aW9uSWR9YCk7XHJcblxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfQk9EWScsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBTYW1wbGVGaWxlVXBsb2FkUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcbiAgICBcclxuICAgIGlmICghcmVxdWVzdC51c2VyRW1haWwpIHtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnTUlTU0lOR19FTUFJTCcsICdVc2VyIGVtYWlsIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBQcm9jZXNzaW5nIHJlcXVlc3QgZm9yIHVzZXI6ICR7cmVxdWVzdC51c2VyRW1haWx9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIFByZWZlcnJlZCBsYW5ndWFnZTogJHtyZXF1ZXN0LnByZWZlcnJlZExhbmd1YWdlIHx8ICdhbnknfWApO1xyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBEaWZmaWN1bHR5IGxldmVsOiAke3JlcXVlc3QuZGlmZmljdWx0eUxldmVsIHx8ICdhbnknfWApO1xyXG5cclxuICAgIGNvbnN0IHNhbXBsZUZpbGVTZXJ2aWNlID0gbmV3IFNhbXBsZUZpbGVTZXJ2aWNlKCk7XHJcbiAgICBcclxuICAgIC8vIFN0ZXAgMTogUmFuZG9tbHkgc2VsZWN0IGEgc2FtcGxlIGZpbGUgYmFzZWQgb24gcHJlZmVyZW5jZXNcclxuICAgIGNvbnNvbGUubG9nKCdbU0FNUExFLVVQTE9BRF0gU3RlcCAxOiBTZWxlY3Rpbmcgc2FtcGxlIGZpbGUgYXV0b21hdGljYWxseS4uLicpO1xyXG4gICAgY29uc3Qgc2VsZWN0ZWRTYW1wbGUgPSBhd2FpdCBzYW1wbGVGaWxlU2VydmljZS5nZXRSYW5kb21TYW1wbGVGaWxlKFxyXG4gICAgICByZXF1ZXN0LnByZWZlcnJlZExhbmd1YWdlLFxyXG4gICAgICByZXF1ZXN0LmRpZmZpY3VsdHlMZXZlbFxyXG4gICAgKTtcclxuXHJcbiAgICBpZiAoIXNlbGVjdGVkU2FtcGxlKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignW1NBTVBMRS1VUExPQURdIOKclyBObyBzYW1wbGUgZmlsZXMgYXZhaWxhYmxlIG1hdGNoaW5nIGNyaXRlcmlhJyk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ05PX1NBTVBMRVNfQVZBSUxBQkxFJywgJ05vIHNhbXBsZSBmaWxlcyBhdmFpbGFibGUgbWF0Y2hpbmcgdGhlIGNyaXRlcmlhJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSDinJMgU2VsZWN0ZWQgc2FtcGxlOiAke3NlbGVjdGVkU2FtcGxlLm5hbWV9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIExhbmd1YWdlOiAke3NlbGVjdGVkU2FtcGxlLmxhbmd1YWdlfSwgU2l6ZTogJHtzZWxlY3RlZFNhbXBsZS5zaXplfSBieXRlc2ApO1xyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBFeHBlY3RlZCB2aW9sYXRpb25zOiAke3NlbGVjdGVkU2FtcGxlLmV4cGVjdGVkVmlvbGF0aW9uc31gKTtcclxuXHJcbiAgICAvLyBTdGVwIDI6IEdldCB0aGUgZnVsbCBzYW1wbGUgZmlsZSB3aXRoIGNvbnRlbnRcclxuICAgIGNvbnNvbGUubG9nKCdbU0FNUExFLVVQTE9BRF0gU3RlcCAyOiBSZXRyaWV2aW5nIHNhbXBsZSBmaWxlIGNvbnRlbnQuLi4nKTtcclxuICAgIGNvbnN0IHNhbXBsZUZpbGUgPSBhd2FpdCBzYW1wbGVGaWxlU2VydmljZS5nZXRTYW1wbGVGaWxlQnlJZChzZWxlY3RlZFNhbXBsZS5pZCk7XHJcbiAgICBcclxuICAgIGlmICghc2FtcGxlRmlsZSkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBbU0FNUExFLVVQTE9BRF0g4pyXIFNhbXBsZSBmaWxlIG5vdCBmb3VuZDogJHtzZWxlY3RlZFNhbXBsZS5pZH1gKTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDA0LCAnU0FNUExFX05PVF9GT1VORCcsICdTYW1wbGUgZmlsZSBub3QgZm91bmQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIOKckyBTYW1wbGUgZmlsZSBjb250ZW50IHJldHJpZXZlZDogJHtzYW1wbGVGaWxlLmZpbGVuYW1lfWApO1xyXG5cclxuICAgIC8vIFN0ZXAgMzogR2VuZXJhdGUgdW5pcXVlIGZpbGUgSUQgYW5kIFMzIGtleVxyXG4gICAgY29uc3QgZmlsZUlkID0gdXVpZHY0KCk7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3QgczNLZXkgPSBgc2FtcGxlcy8ke3VzZXIub3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnfS8ke3VzZXIudXNlcklkfS8ke3RpbWVzdGFtcH0tJHtmaWxlSWR9LSR7c2FtcGxlRmlsZS5maWxlbmFtZX1gO1xyXG4gICAgXHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIFN0ZXAgMzogR2VuZXJhdGVkIGZpbGUgSUQ6ICR7ZmlsZUlkfWApO1xyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBTMyBLZXk6ICR7czNLZXl9YCk7XHJcblxyXG4gICAgLy8gU3RlcCA0OiBDcmVhdGUgdXBsb2FkIHByb2dyZXNzIHJlY29yZFxyXG4gICAgY29uc29sZS5sb2coJ1tTQU1QTEUtVVBMT0FEXSBTdGVwIDQ6IENyZWF0aW5nIHVwbG9hZCBwcm9ncmVzcyByZWNvcmQuLi4nKTtcclxuICAgIGF3YWl0IGNyZWF0ZVVwbG9hZFByb2dyZXNzUmVjb3JkKGZpbGVJZCwgdXNlci51c2VySWQsIHNhbXBsZUZpbGUuZmlsZW5hbWUsIHNhbXBsZUZpbGUuZmlsZV9zaXplKTtcclxuXHJcbiAgICAvLyBTdGVwIDU6IFVwbG9hZCBmaWxlIGNvbnRlbnQgdG8gUzMgd2l0aCBwcm9ncmVzcyB0cmFja2luZ1xyXG4gICAgY29uc29sZS5sb2coJ1tTQU1QTEUtVVBMT0FEXSBTdGVwIDU6IFVwbG9hZGluZyBmaWxlIHRvIFMzLi4uJyk7XHJcbiAgICBjb25zdCBzM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7fSk7XHJcbiAgICBjb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVCB8fCAnbWlzcmEtZmlsZS1zdG9yYWdlJztcclxuICAgIFxyXG4gICAgLy8gVXBkYXRlIHByb2dyZXNzIHRvIDI1JSAodXBsb2FkIHN0YXJ0aW5nKVxyXG4gICAgYXdhaXQgdXBkYXRlVXBsb2FkUHJvZ3Jlc3MoZmlsZUlkLCAyNSwgJ1VwbG9hZGluZyB0byBTMy4uLicpO1xyXG5cclxuICAgIGNvbnN0IGZpbGVDb250ZW50ID0gQnVmZmVyLmZyb20oc2FtcGxlRmlsZS5maWxlX2NvbnRlbnQsICdiYXNlNjQnKTtcclxuICAgIFxyXG4gICAgLy8gVmFsaWRhdGUgZmlsZSBzaXplIChSZXF1aXJlbWVudHMgMi4yKVxyXG4gICAgY29uc3QgbWF4RmlsZVNpemUgPSAxMCAqIDEwMjQgKiAxMDI0OyAvLyAxME1CXHJcbiAgICBpZiAoZmlsZUNvbnRlbnQubGVuZ3RoID4gbWF4RmlsZVNpemUpIHtcclxuICAgICAgY29uc29sZS53YXJuKGBbU0FNUExFLVVQTE9BRF0g4pyXIEZpbGUgdG9vIGxhcmdlOiAke2ZpbGVDb250ZW50Lmxlbmd0aH0gYnl0ZXMgKG1heDogJHttYXhGaWxlU2l6ZX0pYCk7XHJcbiAgICAgIGF3YWl0IHVwZGF0ZVVwbG9hZFByb2dyZXNzKGZpbGVJZCwgMCwgJ1VwbG9hZCBmYWlsZWQ6IEZpbGUgdG9vIGxhcmdlJywgJ2ZhaWxlZCcpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdGSUxFX1RPT19MQVJHRScsIGBGaWxlIHNpemUgbXVzdCBub3QgZXhjZWVkIDEwTUJgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBmaWxlIHR5cGUgKFJlcXVpcmVtZW50cyAyLjEpXHJcbiAgICBjb25zdCBhbGxvd2VkRXh0ZW5zaW9ucyA9IFsnLmMnLCAnLmNwcCcsICcuY2MnLCAnLmN4eCcsICcuaCcsICcuaHBwJ107XHJcbiAgICBjb25zdCBleHQgPSBzYW1wbGVGaWxlLmZpbGVuYW1lLnN1YnN0cmluZyhzYW1wbGVGaWxlLmZpbGVuYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAoIWFsbG93ZWRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dCkpIHtcclxuICAgICAgY29uc29sZS53YXJuKGBbU0FNUExFLVVQTE9BRF0g4pyXIEludmFsaWQgZmlsZSB0eXBlOiAke2V4dH1gKTtcclxuICAgICAgYXdhaXQgdXBkYXRlVXBsb2FkUHJvZ3Jlc3MoZmlsZUlkLCAwLCAnVXBsb2FkIGZhaWxlZDogSW52YWxpZCBmaWxlIHR5cGUnLCAnZmFpbGVkJyk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ0lOVkFMSURfRklMRV9UWVBFJywgYE9ubHkgJHthbGxvd2VkRXh0ZW5zaW9ucy5qb2luKCcsICcpfSBmaWxlcyBhcmUgYWxsb3dlZGApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0g4pyTIEZpbGUgdmFsaWRhdGlvbiBwYXNzZWQ6IHR5cGU9JHtleHR9LCBzaXplPSR7ZmlsZUNvbnRlbnQubGVuZ3RofSBieXRlc2ApO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyB0byA1MCUgKHZhbGlkYXRpb24gY29tcGxldGUpXHJcbiAgICBhd2FpdCB1cGRhdGVVcGxvYWRQcm9ncmVzcyhmaWxlSWQsIDUwLCAnRmlsZSB2YWxpZGF0ZWQsIHVwbG9hZGluZy4uLicpO1xyXG5cclxuICAgIGNvbnN0IHVwbG9hZENvbW1hbmQgPSBuZXcgUHV0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgIEJ1Y2tldDogYnVja2V0TmFtZSxcclxuICAgICAgS2V5OiBzM0tleSxcclxuICAgICAgQm9keTogZmlsZUNvbnRlbnQsXHJcbiAgICAgIENvbnRlbnRUeXBlOiBzYW1wbGVGaWxlLmxhbmd1YWdlID09PSAnQycgPyAndGV4dC94LWMnIDogJ3RleHQveC1jKysnLFxyXG4gICAgICBNZXRhZGF0YToge1xyXG4gICAgICAgICdzYW1wbGUtaWQnOiBzYW1wbGVGaWxlLnNhbXBsZV9pZCxcclxuICAgICAgICAndXNlci1lbWFpbCc6IHJlcXVlc3QudXNlckVtYWlsLFxyXG4gICAgICAgICd1c2VyLWlkJzogdXNlci51c2VySWQsXHJcbiAgICAgICAgJ2xhbmd1YWdlJzogc2FtcGxlRmlsZS5sYW5ndWFnZSxcclxuICAgICAgICAnZXhwZWN0ZWQtdmlvbGF0aW9ucyc6IHNhbXBsZUZpbGUuZXhwZWN0ZWRfdmlvbGF0aW9ucy50b1N0cmluZygpLFxyXG4gICAgICAgICdmaWxlLWlkJzogZmlsZUlkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgczNDbGllbnQuc2VuZCh1cGxvYWRDb21tYW5kKTtcclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0g4pyTIEZpbGUgdXBsb2FkZWQgdG8gUzM6ICR7czNLZXl9YCk7XHJcblxyXG4gICAgLy8gVXBkYXRlIHByb2dyZXNzIHRvIDc1JSAodXBsb2FkIGNvbXBsZXRlKVxyXG4gICAgYXdhaXQgdXBkYXRlVXBsb2FkUHJvZ3Jlc3MoZmlsZUlkLCA3NSwgJ1VwbG9hZCBjb21wbGV0ZSwgY3JlYXRpbmcgbWV0YWRhdGEuLi4nKTtcclxuXHJcbiAgICAvLyBTdGVwIDY6IENyZWF0ZSBmaWxlIG1ldGFkYXRhIHJlY29yZFxyXG4gICAgY29uc29sZS5sb2coJ1tTQU1QTEUtVVBMT0FEXSBTdGVwIDY6IENyZWF0aW5nIGZpbGUgbWV0YWRhdGEgcmVjb3JkLi4uJyk7XHJcbiAgICBhd2FpdCBjcmVhdGVGaWxlTWV0YWRhdGFSZWNvcmQoZmlsZUlkLCBzYW1wbGVGaWxlLCB1c2VyLCBzM0tleSwgZmlsZUNvbnRlbnQubGVuZ3RoKTtcclxuXHJcbiAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgdG8gMTAwJSAoY29tcGxldGUpXHJcbiAgICBhd2FpdCB1cGRhdGVVcGxvYWRQcm9ncmVzcyhmaWxlSWQsIDEwMCwgJ1VwbG9hZCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JywgJ2NvbXBsZXRlZCcpO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0g4pyTIFNhbXBsZSBmaWxlIHVwbG9hZCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5OiAke2ZpbGVJZH1gKTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZTogU2FtcGxlRmlsZVVwbG9hZFJlc3BvbnNlID0ge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiBzYW1wbGVGaWxlLmZpbGVuYW1lLFxyXG4gICAgICBmaWxlU2l6ZTogZmlsZUNvbnRlbnQubGVuZ3RoLFxyXG4gICAgICBsYW5ndWFnZTogc2FtcGxlRmlsZS5sYW5ndWFnZSxcclxuICAgICAgZGVzY3JpcHRpb246IHNhbXBsZUZpbGUuZGVzY3JpcHRpb24sXHJcbiAgICAgIGV4cGVjdGVkVmlvbGF0aW9uczogc2FtcGxlRmlsZS5leHBlY3RlZF92aW9sYXRpb25zLFxyXG4gICAgICB1cGxvYWRTdGF0dXM6ICdjb21wbGV0ZWQnLFxyXG4gICAgICBzM0tleSxcclxuICAgICAgc2FtcGxlSWQ6IHNhbXBsZUZpbGUuc2FtcGxlX2lkLFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnMsXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdTYW1wbGUgZmlsZSB1cGxvYWRlZCBzdWNjZXNzZnVsbHknLFxyXG4gICAgICAgIC4uLnJlc3BvbnNlLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tTQU1QTEUtVVBMT0FEXSDinJcgRXJyb3IgdXBsb2FkaW5nIHNhbXBsZSBmaWxlOicsIGVycm9yKTtcclxuICAgIFxyXG4gICAgLy8gVHJ5IHRvIHVwZGF0ZSBwcm9ncmVzcyB0byBmYWlsZWQgc3RhdGUgaWYgd2UgaGF2ZSBhIGZpbGVJZFxyXG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XHJcbiAgICBcclxuICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDUwMCwgJ1VQTE9BRF9GQUlMRUQnLCBgRmFpbGVkIHRvIHVwbG9hZCBzYW1wbGUgZmlsZTogJHtlcnJvck1lc3NhZ2V9YCk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSB1cGxvYWQgcHJvZ3Jlc3MgcmVjb3JkIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVVcGxvYWRQcm9ncmVzc1JlY29yZChcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICB1c2VySWQ6IHN0cmluZyxcclxuICBmaWxlTmFtZTogc3RyaW5nLFxyXG4gIGZpbGVTaXplOiBudW1iZXJcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICBjb25zdCBwcm9ncmVzc1RhYmxlID0gcHJvY2Vzcy5lbnYuVVBMT0FEX1BST0dSRVNTX1RBQkxFIHx8ICdVcGxvYWRQcm9ncmVzcyc7XHJcblxyXG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgVGFibGVOYW1lOiBwcm9ncmVzc1RhYmxlLFxyXG4gICAgSXRlbTogbWFyc2hhbGwoe1xyXG4gICAgICBmaWxlX2lkOiBmaWxlSWQsXHJcbiAgICAgIHVzZXJfaWQ6IHVzZXJJZCxcclxuICAgICAgZmlsZV9uYW1lOiBmaWxlTmFtZSxcclxuICAgICAgZmlsZV9zaXplOiBmaWxlU2l6ZSxcclxuICAgICAgcHJvZ3Jlc3NfcGVyY2VudGFnZTogMCxcclxuICAgICAgc3RhdHVzOiAnc3RhcnRpbmcnLFxyXG4gICAgICBtZXNzYWdlOiAnSW5pdGlhbGl6aW5nIHVwbG9hZC4uLicsXHJcbiAgICAgIGNyZWF0ZWRfYXQ6IERhdGUubm93KCksXHJcbiAgICAgIHVwZGF0ZWRfYXQ6IERhdGUubm93KCksXHJcbiAgICB9KSxcclxuICB9KTtcclxuXHJcbiAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSDinJMgVXBsb2FkIHByb2dyZXNzIHJlY29yZCBjcmVhdGVkOiAke2ZpbGVJZH1gKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSB1cGxvYWQgcHJvZ3Jlc3MgaW4gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZVVwbG9hZFByb2dyZXNzKFxyXG4gIGZpbGVJZDogc3RyaW5nLFxyXG4gIHBlcmNlbnRhZ2U6IG51bWJlcixcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgc3RhdHVzOiBzdHJpbmcgPSAndXBsb2FkaW5nJ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoe30pO1xyXG4gIGNvbnN0IHByb2dyZXNzVGFibGUgPSBwcm9jZXNzLmVudi5VUExPQURfUFJPR1JFU1NfVEFCTEUgfHwgJ1VwbG9hZFByb2dyZXNzJztcclxuXHJcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVJdGVtQ29tbWFuZCh7XHJcbiAgICBUYWJsZU5hbWU6IHByb2dyZXNzVGFibGUsXHJcbiAgICBLZXk6IG1hcnNoYWxsKHsgZmlsZV9pZDogZmlsZUlkIH0pLFxyXG4gICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBwcm9ncmVzc19wZXJjZW50YWdlID0gOnBlcmNlbnRhZ2UsICNzdGF0dXMgPSA6c3RhdHVzLCBtZXNzYWdlID0gOm1lc3NhZ2UsIHVwZGF0ZWRfYXQgPSA6dXBkYXRlZEF0JyxcclxuICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAnI3N0YXR1cyc6ICdzdGF0dXMnLFxyXG4gICAgfSxcclxuICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IG1hcnNoYWxsKHtcclxuICAgICAgJzpwZXJjZW50YWdlJzogcGVyY2VudGFnZSxcclxuICAgICAgJzpzdGF0dXMnOiBzdGF0dXMsXHJcbiAgICAgICc6bWVzc2FnZSc6IG1lc3NhZ2UsXHJcbiAgICAgICc6dXBkYXRlZEF0JzogRGF0ZS5ub3coKSxcclxuICAgIH0pLFxyXG4gIH0pO1xyXG5cclxuICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIFByb2dyZXNzIHVwZGF0ZWQ6ICR7ZmlsZUlkfSAtICR7cGVyY2VudGFnZX0lIC0gJHttZXNzYWdlfWApO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGZpbGUgbWV0YWRhdGEgcmVjb3JkIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVGaWxlTWV0YWRhdGFSZWNvcmQoXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgc2FtcGxlRmlsZTogYW55LFxyXG4gIHVzZXI6IGFueSxcclxuICBzM0tleTogc3RyaW5nLFxyXG4gIGFjdHVhbEZpbGVTaXplOiBudW1iZXJcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICBjb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YSc7XHJcblxyXG4gIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xyXG4gIGNvbnN0IGZpbGVUeXBlID0gKHNhbXBsZUZpbGUubGFuZ3VhZ2UgPT09ICdDJykgPyAnYycgOiAnY3BwJztcclxuXHJcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRJdGVtQ29tbWFuZCh7XHJcbiAgICBUYWJsZU5hbWU6IGZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgSXRlbTogbWFyc2hhbGwoe1xyXG4gICAgICBmaWxlX2lkOiBmaWxlSWQsXHJcbiAgICAgIGZpbGVuYW1lOiBzYW1wbGVGaWxlLmZpbGVuYW1lLFxyXG4gICAgICBmaWxlX3R5cGU6IGZpbGVUeXBlLFxyXG4gICAgICBmaWxlX3NpemU6IGFjdHVhbEZpbGVTaXplLFxyXG4gICAgICB1c2VyX2lkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgdXBsb2FkX3RpbWVzdGFtcDogbm93LFxyXG4gICAgICBhbmFseXNpc19zdGF0dXM6ICdwZW5kaW5nJyxcclxuICAgICAgczNfa2V5OiBzM0tleSxcclxuICAgICAgY3JlYXRlZF9hdDogbm93LFxyXG4gICAgICB1cGRhdGVkX2F0OiBub3csXHJcbiAgICAgIC8vIFNhbXBsZSBmaWxlIG1ldGFkYXRhXHJcbiAgICAgIGlzX3NhbXBsZV9maWxlOiB0cnVlLFxyXG4gICAgICBzYW1wbGVfaWQ6IHNhbXBsZUZpbGUuc2FtcGxlX2lkLFxyXG4gICAgICBzYW1wbGVfZGVzY3JpcHRpb246IHNhbXBsZUZpbGUuZGVzY3JpcHRpb24sXHJcbiAgICAgIGV4cGVjdGVkX3Zpb2xhdGlvbnM6IHNhbXBsZUZpbGUuZXhwZWN0ZWRfdmlvbGF0aW9ucyxcclxuICAgIH0pLFxyXG4gIH0pO1xyXG5cclxuICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIOKckyBGaWxlIG1ldGFkYXRhIHJlY29yZCBjcmVhdGVkOiAke2ZpbGVJZH1gKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIGVycm9yIHJlc3BvbnNlXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIH07XHJcbn0iXX0=