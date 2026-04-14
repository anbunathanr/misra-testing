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
        const user = (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLXNhbXBsZS13aXRoLXByb2dyZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLXNhbXBsZS13aXRoLXByb2dyZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBNkY7QUFDN0YsMERBQWtEO0FBQ2xELDRFQUF1RTtBQUV2RSwrQkFBb0M7QUFDcEMscURBQTJEO0FBRTNEOzs7Ozs7Ozs7O0dBVUc7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixNQUFNLE9BQU8sR0FBRztRQUNkLGNBQWMsRUFBRSxrQkFBa0I7UUFDbEMsNkJBQTZCLEVBQUUsR0FBRztRQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7UUFDNUQsOEJBQThCLEVBQUUsY0FBYztLQUMvQyxDQUFDO0lBRUYsSUFBSSxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw4RUFBOEUsQ0FBQyxDQUFDO1FBRTVGLDRCQUE0QjtRQUM1QixJQUFJLEtBQUssQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPO2dCQUNQLElBQUksRUFBRSxFQUFFO2FBQ1QsQ0FBQztRQUNKLENBQUM7UUFFRCw4Q0FBOEM7UUFDOUMsTUFBTSxJQUFJLEdBQUcsSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsb0RBQW9ELENBQUMsQ0FBQztZQUNuRSxPQUFPLGFBQWEsQ0FBQyxHQUFHLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMsdUNBQXVDLElBQUksQ0FBQyxNQUFNLG1CQUFtQixJQUFJLENBQUMsY0FBYyxFQUFF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QWMsRUFBRSxrQkFBa0I7WUFDbEMsNkJBQTZCLEVBQUUsR0FBRztZQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7U0FDN0Q7UUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixPQUFPLEVBQUUsS0FBSztZQUNkLEtBQUssRUFBRTtnQkFDTCxJQUFJO2dCQUNKLE9BQU87Z0JBQ1AsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2dCQUNuQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2FBQ25EO1NBQ0YsQ0FBQztLQUNILENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTM0NsaWVudCwgUHV0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBQdXRJdGVtQ29tbWFuZCwgVXBkYXRlSXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBTYW1wbGVGaWxlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3NhbXBsZS1maWxlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBTYW1wbGVGaWxlVXBsb2FkUmVxdWVzdCwgU2FtcGxlRmlsZVVwbG9hZFJlc3BvbnNlIH0gZnJvbSAnLi4vLi4vdHlwZXMvc2FtcGxlLWZpbGUnO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gZm9yIGF1dG9tYXRpYyBzYW1wbGUgZmlsZSB1cGxvYWQgd2l0aCBwcm9ncmVzcyB0cmFja2luZ1xyXG4gKiBUYXNrIDQuMTogQ3JlYXRlIHNhbXBsZSBmaWxlIHVwbG9hZCBMYW1iZGEgZnVuY3Rpb25cclxuICogXHJcbiAqIEZlYXR1cmVzOlxyXG4gKiAtIEF1dG9tYXRpYyBzYW1wbGUgZmlsZSBzZWxlY3Rpb24gZnJvbSBwcmVkZWZpbmVkIGxpYnJhcnlcclxuICogLSBTZWN1cmUgUzMgdXBsb2FkIHByb2Nlc3MgZm9yIHNlbGVjdGVkIHNhbXBsZSBmaWxlc1xyXG4gKiAtIFVwbG9hZCBwcm9ncmVzcyB0cmFja2luZyBhbmQgcmVhbC10aW1lIGZlZWRiYWNrXHJcbiAqIC0gRmlsZSB2YWxpZGF0aW9uIGZvciBDL0MrKyBmaWxlIHR5cGVzIGFuZCBzaXplIGxpbWl0c1xyXG4gKiAtIEVycm9yIGhhbmRsaW5nIGZvciB1cGxvYWQgZmFpbHVyZXMgd2l0aCByZXRyeSBvcHRpb25zXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnN0IGhlYWRlcnMgPSB7XHJcbiAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogJ1BPU1QsT1BUSU9OUycsXHJcbiAgfTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnNvbGUubG9nKCdbU0FNUExFLVVQTE9BRF0gU3RhcnRpbmcgYXV0b21hdGljIHNhbXBsZSBmaWxlIHVwbG9hZCB3aXRoIHByb2dyZXNzIHRyYWNraW5nJyk7XHJcblxyXG4gICAgLy8gSGFuZGxlIHByZWZsaWdodCByZXF1ZXN0c1xyXG4gICAgaWYgKGV2ZW50Lmh0dHBNZXRob2QgPT09ICdPUFRJT05TJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6ICcnLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHVzZXIgPSBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1tTQU1QTEUtVVBMT0FEXSDinJcgVW5hdXRob3JpemVkOiBObyB1c2VyIGluIGNvbnRleHQnKTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAxLCAnVU5BVVRIT1JJWkVEJywgJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIFVzZXIgYXV0aGVudGljYXRlZDogJHt1c2VyLnVzZXJJZH0sIE9yZ2FuaXphdGlvbjogJHt1c2VyLm9yZ2FuaXphdGlvbklkfWApO1xyXG5cclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdNSVNTSU5HX0JPRFknLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogU2FtcGxlRmlsZVVwbG9hZFJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG4gICAgXHJcbiAgICBpZiAoIXJlcXVlc3QudXNlckVtYWlsKSB7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwMCwgJ01JU1NJTkdfRU1BSUwnLCAnVXNlciBlbWFpbCBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0gUHJvY2Vzc2luZyByZXF1ZXN0IGZvciB1c2VyOiAke3JlcXVlc3QudXNlckVtYWlsfWApO1xyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBQcmVmZXJyZWQgbGFuZ3VhZ2U6ICR7cmVxdWVzdC5wcmVmZXJyZWRMYW5ndWFnZSB8fCAnYW55J31gKTtcclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0gRGlmZmljdWx0eSBsZXZlbDogJHtyZXF1ZXN0LmRpZmZpY3VsdHlMZXZlbCB8fCAnYW55J31gKTtcclxuXHJcbiAgICBjb25zdCBzYW1wbGVGaWxlU2VydmljZSA9IG5ldyBTYW1wbGVGaWxlU2VydmljZSgpO1xyXG4gICAgXHJcbiAgICAvLyBTdGVwIDE6IFJhbmRvbWx5IHNlbGVjdCBhIHNhbXBsZSBmaWxlIGJhc2VkIG9uIHByZWZlcmVuY2VzXHJcbiAgICBjb25zb2xlLmxvZygnW1NBTVBMRS1VUExPQURdIFN0ZXAgMTogU2VsZWN0aW5nIHNhbXBsZSBmaWxlIGF1dG9tYXRpY2FsbHkuLi4nKTtcclxuICAgIGNvbnN0IHNlbGVjdGVkU2FtcGxlID0gYXdhaXQgc2FtcGxlRmlsZVNlcnZpY2UuZ2V0UmFuZG9tU2FtcGxlRmlsZShcclxuICAgICAgcmVxdWVzdC5wcmVmZXJyZWRMYW5ndWFnZSxcclxuICAgICAgcmVxdWVzdC5kaWZmaWN1bHR5TGV2ZWxcclxuICAgICk7XHJcblxyXG4gICAgaWYgKCFzZWxlY3RlZFNhbXBsZSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1tTQU1QTEUtVVBMT0FEXSDinJcgTm8gc2FtcGxlIGZpbGVzIGF2YWlsYWJsZSBtYXRjaGluZyBjcml0ZXJpYScpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDQsICdOT19TQU1QTEVTX0FWQUlMQUJMRScsICdObyBzYW1wbGUgZmlsZXMgYXZhaWxhYmxlIG1hdGNoaW5nIHRoZSBjcml0ZXJpYScpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0g4pyTIFNlbGVjdGVkIHNhbXBsZTogJHtzZWxlY3RlZFNhbXBsZS5uYW1lfWApO1xyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBMYW5ndWFnZTogJHtzZWxlY3RlZFNhbXBsZS5sYW5ndWFnZX0sIFNpemU6ICR7c2VsZWN0ZWRTYW1wbGUuc2l6ZX0gYnl0ZXNgKTtcclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0gRXhwZWN0ZWQgdmlvbGF0aW9uczogJHtzZWxlY3RlZFNhbXBsZS5leHBlY3RlZFZpb2xhdGlvbnN9YCk7XHJcblxyXG4gICAgLy8gU3RlcCAyOiBHZXQgdGhlIGZ1bGwgc2FtcGxlIGZpbGUgd2l0aCBjb250ZW50XHJcbiAgICBjb25zb2xlLmxvZygnW1NBTVBMRS1VUExPQURdIFN0ZXAgMjogUmV0cmlldmluZyBzYW1wbGUgZmlsZSBjb250ZW50Li4uJyk7XHJcbiAgICBjb25zdCBzYW1wbGVGaWxlID0gYXdhaXQgc2FtcGxlRmlsZVNlcnZpY2UuZ2V0U2FtcGxlRmlsZUJ5SWQoc2VsZWN0ZWRTYW1wbGUuaWQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXNhbXBsZUZpbGUpIHtcclxuICAgICAgY29uc29sZS5lcnJvcihgW1NBTVBMRS1VUExPQURdIOKclyBTYW1wbGUgZmlsZSBub3QgZm91bmQ6ICR7c2VsZWN0ZWRTYW1wbGUuaWR9YCk7XHJcbiAgICAgIHJldHVybiBlcnJvclJlc3BvbnNlKDQwNCwgJ1NBTVBMRV9OT1RfRk9VTkQnLCAnU2FtcGxlIGZpbGUgbm90IGZvdW5kJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSDinJMgU2FtcGxlIGZpbGUgY29udGVudCByZXRyaWV2ZWQ6ICR7c2FtcGxlRmlsZS5maWxlbmFtZX1gKTtcclxuXHJcbiAgICAvLyBTdGVwIDM6IEdlbmVyYXRlIHVuaXF1ZSBmaWxlIElEIGFuZCBTMyBrZXlcclxuICAgIGNvbnN0IGZpbGVJZCA9IHV1aWR2NCgpO1xyXG4gICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IHMzS2V5ID0gYHNhbXBsZXMvJHt1c2VyLm9yZ2FuaXphdGlvbklkIHx8ICdkZWZhdWx0J30vJHt1c2VyLnVzZXJJZH0vJHt0aW1lc3RhbXB9LSR7ZmlsZUlkfS0ke3NhbXBsZUZpbGUuZmlsZW5hbWV9YDtcclxuICAgIFxyXG4gICAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBTdGVwIDM6IEdlbmVyYXRlZCBmaWxlIElEOiAke2ZpbGVJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0gUzMgS2V5OiAke3MzS2V5fWApO1xyXG5cclxuICAgIC8vIFN0ZXAgNDogQ3JlYXRlIHVwbG9hZCBwcm9ncmVzcyByZWNvcmRcclxuICAgIGNvbnNvbGUubG9nKCdbU0FNUExFLVVQTE9BRF0gU3RlcCA0OiBDcmVhdGluZyB1cGxvYWQgcHJvZ3Jlc3MgcmVjb3JkLi4uJyk7XHJcbiAgICBhd2FpdCBjcmVhdGVVcGxvYWRQcm9ncmVzc1JlY29yZChmaWxlSWQsIHVzZXIudXNlcklkLCBzYW1wbGVGaWxlLmZpbGVuYW1lLCBzYW1wbGVGaWxlLmZpbGVfc2l6ZSk7XHJcblxyXG4gICAgLy8gU3RlcCA1OiBVcGxvYWQgZmlsZSBjb250ZW50IHRvIFMzIHdpdGggcHJvZ3Jlc3MgdHJhY2tpbmdcclxuICAgIGNvbnNvbGUubG9nKCdbU0FNUExFLVVQTE9BRF0gU3RlcCA1OiBVcGxvYWRpbmcgZmlsZSB0byBTMy4uLicpO1xyXG4gICAgY29uc3QgczNDbGllbnQgPSBuZXcgUzNDbGllbnQoe30pO1xyXG4gICAgY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVQgfHwgJ21pc3JhLWZpbGUtc3RvcmFnZSc7XHJcbiAgICBcclxuICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyB0byAyNSUgKHVwbG9hZCBzdGFydGluZylcclxuICAgIGF3YWl0IHVwZGF0ZVVwbG9hZFByb2dyZXNzKGZpbGVJZCwgMjUsICdVcGxvYWRpbmcgdG8gUzMuLi4nKTtcclxuXHJcbiAgICBjb25zdCBmaWxlQ29udGVudCA9IEJ1ZmZlci5mcm9tKHNhbXBsZUZpbGUuZmlsZV9jb250ZW50LCAnYmFzZTY0Jyk7XHJcbiAgICBcclxuICAgIC8vIFZhbGlkYXRlIGZpbGUgc2l6ZSAoUmVxdWlyZW1lbnRzIDIuMilcclxuICAgIGNvbnN0IG1heEZpbGVTaXplID0gMTAgKiAxMDI0ICogMTAyNDsgLy8gMTBNQlxyXG4gICAgaWYgKGZpbGVDb250ZW50Lmxlbmd0aCA+IG1heEZpbGVTaXplKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgW1NBTVBMRS1VUExPQURdIOKclyBGaWxlIHRvbyBsYXJnZTogJHtmaWxlQ29udGVudC5sZW5ndGh9IGJ5dGVzIChtYXg6ICR7bWF4RmlsZVNpemV9KWApO1xyXG4gICAgICBhd2FpdCB1cGRhdGVVcGxvYWRQcm9ncmVzcyhmaWxlSWQsIDAsICdVcGxvYWQgZmFpbGVkOiBGaWxlIHRvbyBsYXJnZScsICdmYWlsZWQnKTtcclxuICAgICAgcmV0dXJuIGVycm9yUmVzcG9uc2UoNDAwLCAnRklMRV9UT09fTEFSR0UnLCBgRmlsZSBzaXplIG11c3Qgbm90IGV4Y2VlZCAxME1CYCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZmlsZSB0eXBlIChSZXF1aXJlbWVudHMgMi4xKVxyXG4gICAgY29uc3QgYWxsb3dlZEV4dGVuc2lvbnMgPSBbJy5jJywgJy5jcHAnLCAnLmNjJywgJy5jeHgnLCAnLmgnLCAnLmhwcCddO1xyXG4gICAgY29uc3QgZXh0ID0gc2FtcGxlRmlsZS5maWxlbmFtZS5zdWJzdHJpbmcoc2FtcGxlRmlsZS5maWxlbmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgaWYgKCFhbGxvd2VkRXh0ZW5zaW9ucy5pbmNsdWRlcyhleHQpKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgW1NBTVBMRS1VUExPQURdIOKclyBJbnZhbGlkIGZpbGUgdHlwZTogJHtleHR9YCk7XHJcbiAgICAgIGF3YWl0IHVwZGF0ZVVwbG9hZFByb2dyZXNzKGZpbGVJZCwgMCwgJ1VwbG9hZCBmYWlsZWQ6IEludmFsaWQgZmlsZSB0eXBlJywgJ2ZhaWxlZCcpO1xyXG4gICAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg0MDAsICdJTlZBTElEX0ZJTEVfVFlQRScsIGBPbmx5ICR7YWxsb3dlZEV4dGVuc2lvbnMuam9pbignLCAnKX0gZmlsZXMgYXJlIGFsbG93ZWRgKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIOKckyBGaWxlIHZhbGlkYXRpb24gcGFzc2VkOiB0eXBlPSR7ZXh0fSwgc2l6ZT0ke2ZpbGVDb250ZW50Lmxlbmd0aH0gYnl0ZXNgKTtcclxuXHJcbiAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgdG8gNTAlICh2YWxpZGF0aW9uIGNvbXBsZXRlKVxyXG4gICAgYXdhaXQgdXBkYXRlVXBsb2FkUHJvZ3Jlc3MoZmlsZUlkLCA1MCwgJ0ZpbGUgdmFsaWRhdGVkLCB1cGxvYWRpbmcuLi4nKTtcclxuXHJcbiAgICBjb25zdCB1cGxvYWRDb21tYW5kID0gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICBCdWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgIEtleTogczNLZXksXHJcbiAgICAgIEJvZHk6IGZpbGVDb250ZW50LFxyXG4gICAgICBDb250ZW50VHlwZTogc2FtcGxlRmlsZS5sYW5ndWFnZSA9PT0gJ0MnID8gJ3RleHQveC1jJyA6ICd0ZXh0L3gtYysrJyxcclxuICAgICAgTWV0YWRhdGE6IHtcclxuICAgICAgICAnc2FtcGxlLWlkJzogc2FtcGxlRmlsZS5zYW1wbGVfaWQsXHJcbiAgICAgICAgJ3VzZXItZW1haWwnOiByZXF1ZXN0LnVzZXJFbWFpbCxcclxuICAgICAgICAndXNlci1pZCc6IHVzZXIudXNlcklkLFxyXG4gICAgICAgICdsYW5ndWFnZSc6IHNhbXBsZUZpbGUubGFuZ3VhZ2UsXHJcbiAgICAgICAgJ2V4cGVjdGVkLXZpb2xhdGlvbnMnOiBzYW1wbGVGaWxlLmV4cGVjdGVkX3Zpb2xhdGlvbnMudG9TdHJpbmcoKSxcclxuICAgICAgICAnZmlsZS1pZCc6IGZpbGVJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IHMzQ2xpZW50LnNlbmQodXBsb2FkQ29tbWFuZCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIOKckyBGaWxlIHVwbG9hZGVkIHRvIFMzOiAke3MzS2V5fWApO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyB0byA3NSUgKHVwbG9hZCBjb21wbGV0ZSlcclxuICAgIGF3YWl0IHVwZGF0ZVVwbG9hZFByb2dyZXNzKGZpbGVJZCwgNzUsICdVcGxvYWQgY29tcGxldGUsIGNyZWF0aW5nIG1ldGFkYXRhLi4uJyk7XHJcblxyXG4gICAgLy8gU3RlcCA2OiBDcmVhdGUgZmlsZSBtZXRhZGF0YSByZWNvcmRcclxuICAgIGNvbnNvbGUubG9nKCdbU0FNUExFLVVQTE9BRF0gU3RlcCA2OiBDcmVhdGluZyBmaWxlIG1ldGFkYXRhIHJlY29yZC4uLicpO1xyXG4gICAgYXdhaXQgY3JlYXRlRmlsZU1ldGFkYXRhUmVjb3JkKGZpbGVJZCwgc2FtcGxlRmlsZSwgdXNlciwgczNLZXksIGZpbGVDb250ZW50Lmxlbmd0aCk7XHJcblxyXG4gICAgLy8gVXBkYXRlIHByb2dyZXNzIHRvIDEwMCUgKGNvbXBsZXRlKVxyXG4gICAgYXdhaXQgdXBkYXRlVXBsb2FkUHJvZ3Jlc3MoZmlsZUlkLCAxMDAsICdVcGxvYWQgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsICdjb21wbGV0ZWQnKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW1NBTVBMRS1VUExPQURdIOKckyBTYW1wbGUgZmlsZSB1cGxvYWQgY29tcGxldGVkIHN1Y2Nlc3NmdWxseTogJHtmaWxlSWR9YCk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2U6IFNhbXBsZUZpbGVVcGxvYWRSZXNwb25zZSA9IHtcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBmaWxlTmFtZTogc2FtcGxlRmlsZS5maWxlbmFtZSxcclxuICAgICAgZmlsZVNpemU6IGZpbGVDb250ZW50Lmxlbmd0aCxcclxuICAgICAgbGFuZ3VhZ2U6IHNhbXBsZUZpbGUubGFuZ3VhZ2UsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBzYW1wbGVGaWxlLmRlc2NyaXB0aW9uLFxyXG4gICAgICBleHBlY3RlZFZpb2xhdGlvbnM6IHNhbXBsZUZpbGUuZXhwZWN0ZWRfdmlvbGF0aW9ucyxcclxuICAgICAgdXBsb2FkU3RhdHVzOiAnY29tcGxldGVkJyxcclxuICAgICAgczNLZXksXHJcbiAgICAgIHNhbXBsZUlkOiBzYW1wbGVGaWxlLnNhbXBsZV9pZCxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzLFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBtZXNzYWdlOiAnU2FtcGxlIGZpbGUgdXBsb2FkZWQgc3VjY2Vzc2Z1bGx5JyxcclxuICAgICAgICAuLi5yZXNwb25zZSxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdbU0FNUExFLVVQTE9BRF0g4pyXIEVycm9yIHVwbG9hZGluZyBzYW1wbGUgZmlsZTonLCBlcnJvcik7XHJcbiAgICBcclxuICAgIC8vIFRyeSB0byB1cGRhdGUgcHJvZ3Jlc3MgdG8gZmFpbGVkIHN0YXRlIGlmIHdlIGhhdmUgYSBmaWxlSWRcclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xyXG4gICAgXHJcbiAgICByZXR1cm4gZXJyb3JSZXNwb25zZSg1MDAsICdVUExPQURfRkFJTEVEJywgYEZhaWxlZCB0byB1cGxvYWQgc2FtcGxlIGZpbGU6ICR7ZXJyb3JNZXNzYWdlfWApO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgdXBsb2FkIHByb2dyZXNzIHJlY29yZCBpbiBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlVXBsb2FkUHJvZ3Jlc3NSZWNvcmQoXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgdXNlcklkOiBzdHJpbmcsXHJcbiAgZmlsZU5hbWU6IHN0cmluZyxcclxuICBmaWxlU2l6ZTogbnVtYmVyXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XHJcbiAgY29uc3QgcHJvZ3Jlc3NUYWJsZSA9IHByb2Nlc3MuZW52LlVQTE9BRF9QUk9HUkVTU19UQUJMRSB8fCAnVXBsb2FkUHJvZ3Jlc3MnO1xyXG5cclxuICBjb25zdCBjb21tYW5kID0gbmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgIFRhYmxlTmFtZTogcHJvZ3Jlc3NUYWJsZSxcclxuICAgIEl0ZW06IG1hcnNoYWxsKHtcclxuICAgICAgZmlsZV9pZDogZmlsZUlkLFxyXG4gICAgICB1c2VyX2lkOiB1c2VySWQsXHJcbiAgICAgIGZpbGVfbmFtZTogZmlsZU5hbWUsXHJcbiAgICAgIGZpbGVfc2l6ZTogZmlsZVNpemUsXHJcbiAgICAgIHByb2dyZXNzX3BlcmNlbnRhZ2U6IDAsXHJcbiAgICAgIHN0YXR1czogJ3N0YXJ0aW5nJyxcclxuICAgICAgbWVzc2FnZTogJ0luaXRpYWxpemluZyB1cGxvYWQuLi4nLFxyXG4gICAgICBjcmVhdGVkX2F0OiBEYXRlLm5vdygpLFxyXG4gICAgICB1cGRhdGVkX2F0OiBEYXRlLm5vdygpLFxyXG4gICAgfSksXHJcbiAgfSk7XHJcblxyXG4gIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gIGNvbnNvbGUubG9nKGBbU0FNUExFLVVQTE9BRF0g4pyTIFVwbG9hZCBwcm9ncmVzcyByZWNvcmQgY3JlYXRlZDogJHtmaWxlSWR9YCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgdXBsb2FkIHByb2dyZXNzIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVVcGxvYWRQcm9ncmVzcyhcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBwZXJjZW50YWdlOiBudW1iZXIsXHJcbiAgbWVzc2FnZTogc3RyaW5nLFxyXG4gIHN0YXR1czogc3RyaW5nID0gJ3VwbG9hZGluZydcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICBjb25zdCBwcm9ncmVzc1RhYmxlID0gcHJvY2Vzcy5lbnYuVVBMT0FEX1BST0dSRVNTX1RBQkxFIHx8ICdVcGxvYWRQcm9ncmVzcyc7XHJcblxyXG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlSXRlbUNvbW1hbmQoe1xyXG4gICAgVGFibGVOYW1lOiBwcm9ncmVzc1RhYmxlLFxyXG4gICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVfaWQ6IGZpbGVJZCB9KSxcclxuICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgcHJvZ3Jlc3NfcGVyY2VudGFnZSA9IDpwZXJjZW50YWdlLCAjc3RhdHVzID0gOnN0YXR1cywgbWVzc2FnZSA9IDptZXNzYWdlLCB1cGRhdGVkX2F0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgJyNzdGF0dXMnOiAnc3RhdHVzJyxcclxuICAgIH0sXHJcbiAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBtYXJzaGFsbCh7XHJcbiAgICAgICc6cGVyY2VudGFnZSc6IHBlcmNlbnRhZ2UsXHJcbiAgICAgICc6c3RhdHVzJzogc3RhdHVzLFxyXG4gICAgICAnOm1lc3NhZ2UnOiBtZXNzYWdlLFxyXG4gICAgICAnOnVwZGF0ZWRBdCc6IERhdGUubm93KCksXHJcbiAgICB9KSxcclxuICB9KTtcclxuXHJcbiAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSBQcm9ncmVzcyB1cGRhdGVkOiAke2ZpbGVJZH0gLSAke3BlcmNlbnRhZ2V9JSAtICR7bWVzc2FnZX1gKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBmaWxlIG1ldGFkYXRhIHJlY29yZCBpbiBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlRmlsZU1ldGFkYXRhUmVjb3JkKFxyXG4gIGZpbGVJZDogc3RyaW5nLFxyXG4gIHNhbXBsZUZpbGU6IGFueSxcclxuICB1c2VyOiBhbnksXHJcbiAgczNLZXk6IHN0cmluZyxcclxuICBhY3R1YWxGaWxlU2l6ZTogbnVtYmVyXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XHJcbiAgY29uc3QgZmlsZU1ldGFkYXRhVGFibGUgPSBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFIHx8ICdGaWxlTWV0YWRhdGEnO1xyXG5cclxuICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcclxuICBjb25zdCBmaWxlVHlwZSA9IChzYW1wbGVGaWxlLmxhbmd1YWdlID09PSAnQycpID8gJ2MnIDogJ2NwcCc7XHJcblxyXG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgIEl0ZW06IG1hcnNoYWxsKHtcclxuICAgICAgZmlsZV9pZDogZmlsZUlkLFxyXG4gICAgICBmaWxlbmFtZTogc2FtcGxlRmlsZS5maWxlbmFtZSxcclxuICAgICAgZmlsZV90eXBlOiBmaWxlVHlwZSxcclxuICAgICAgZmlsZV9zaXplOiBhY3R1YWxGaWxlU2l6ZSxcclxuICAgICAgdXNlcl9pZDogdXNlci51c2VySWQsXHJcbiAgICAgIHVwbG9hZF90aW1lc3RhbXA6IG5vdyxcclxuICAgICAgYW5hbHlzaXNfc3RhdHVzOiAncGVuZGluZycsXHJcbiAgICAgIHMzX2tleTogczNLZXksXHJcbiAgICAgIGNyZWF0ZWRfYXQ6IG5vdyxcclxuICAgICAgdXBkYXRlZF9hdDogbm93LFxyXG4gICAgICAvLyBTYW1wbGUgZmlsZSBtZXRhZGF0YVxyXG4gICAgICBpc19zYW1wbGVfZmlsZTogdHJ1ZSxcclxuICAgICAgc2FtcGxlX2lkOiBzYW1wbGVGaWxlLnNhbXBsZV9pZCxcclxuICAgICAgc2FtcGxlX2Rlc2NyaXB0aW9uOiBzYW1wbGVGaWxlLmRlc2NyaXB0aW9uLFxyXG4gICAgICBleHBlY3RlZF92aW9sYXRpb25zOiBzYW1wbGVGaWxlLmV4cGVjdGVkX3Zpb2xhdGlvbnMsXHJcbiAgICB9KSxcclxuICB9KTtcclxuXHJcbiAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgY29uc29sZS5sb2coYFtTQU1QTEUtVVBMT0FEXSDinJMgRmlsZSBtZXRhZGF0YSByZWNvcmQgY3JlYXRlZDogJHtmaWxlSWR9YCk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBlcnJvciByZXNwb25zZVxyXG4gKi9cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59Il19