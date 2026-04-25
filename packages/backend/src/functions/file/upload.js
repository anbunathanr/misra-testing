"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_sqs_1 = require("@aws-sdk/client-sqs");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const file_upload_service_1 = require("../../services/file/file-upload-service");
const auth_util_1 = require("../../utils/auth-util");
const centralized_error_handler_1 = require("../../services/error-handling/centralized-error-handler");
const enhanced_retry_1 = require("../../services/error-handling/enhanced-retry");
const cloudwatch_monitoring_1 = require("../../services/monitoring/cloudwatch-monitoring");
const logger_1 = require("../../utils/logger");
const ALLOWED_EXTENSIONS = ['.c', '.cpp', '.h', '.hpp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const sqsClient = new client_sqs_1.SQSClient({});
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const FILE_METADATA_TABLE = process.env.FILE_METADATA_TABLE || 'FileMetadata-dev';
const fileUploadService = new file_upload_service_1.FileUploadService();
const logger = (0, logger_1.createLogger)('FileUploadFunction');
/**
 * Enhanced file upload handler with comprehensive error handling
 * Requirements: 1.1, 1.2, 6.1, 8.1, 8.2
 */
exports.handler = centralized_error_handler_1.centralizedErrorHandler.wrapLambdaHandler(async (event) => {
    const startTime = Date.now();
    try {
        logger.info('File upload request started', {
            path: event.path,
            hasBody: !!event.body,
            bucketName: process.env.FILE_STORAGE_BUCKET_NAME,
            fileMetadataTable: process.env.FILE_METADATA_TABLE
        });
        // Extract user from Lambda Authorizer context or JWT token
        const user = await (0, auth_util_1.getUserFromContext)(event);
        logger.info('User extraction result', { userId: user.userId, email: user.email });
        if (!user.userId) {
            logger.warn('Unauthorized upload attempt');
            await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('UNAUTHORIZED', 'file-upload-service', 'MISSING_USER');
            throw new Error('User not authenticated');
        }
        // Check if user can perform file operations (supports temporary tokens)
        if (!(0, auth_util_1.canPerformFileOperations)(user)) {
            logger.warn('User cannot perform file operations', {
                userId: user.userId,
                isTemporary: user.isTemporary,
                authState: user.authState
            });
            await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('FORBIDDEN', 'file-upload-service', 'INSUFFICIENT_PERMISSIONS');
            throw new Error('You need to log in to access this resource');
        }
        logger.info('User authenticated for upload', {
            userId: user.userId,
            organizationId: user.organizationId,
            isTemporary: user.isTemporary,
            authState: user.authState
        });
        // Parse and validate request body
        if (!event.body) {
            logger.warn('Upload request missing body');
            await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'file-upload-service', 'MISSING_BODY');
            throw new Error('Request body is required');
        }
        const uploadRequest = JSON.parse(event.body);
        logger.info('Upload request parsed', {
            fileName: uploadRequest.fileName,
            fileSize: uploadRequest.fileSize
        });
        // Validate input with enhanced error handling
        await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => validateUploadRequest(uploadRequest), { maxAttempts: 1 } // No retry for validation
        );
        logger.info('Upload request validation passed');
        // Create file upload request
        const fileUploadRequest = {
            fileName: uploadRequest.fileName,
            fileSize: uploadRequest.fileSize,
            contentType: uploadRequest.contentType,
            userId: user.userId,
        };
        // Generate presigned upload URL with retry
        logger.info('Generating presigned upload URL');
        const uploadResponse = await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => fileUploadService.generatePresignedUploadUrl(fileUploadRequest), {
            maxAttempts: 3,
            initialDelayMs: 500,
            retryableErrors: ['timeout', 'SERVICE_UNAVAILABLE', 'EXTERNAL_SERVICE_ERROR']
        });
        logger.info('Presigned URL generated successfully', {
            fileId: uploadResponse.fileId,
            expiresIn: uploadResponse.expiresIn
        });
        // Create FileMetadata record with retry
        await enhanced_retry_1.enhancedRetryService.executeWithRetry(() => createFileMetadata(uploadResponse, uploadRequest, user), {
            maxAttempts: 3,
            initialDelayMs: 1000,
            retryableErrors: ['ThrottlingException', 'ProvisionedThroughputExceededException', 'ServiceUnavailable']
        });
        logger.info('FileMetadata record created successfully');
        // Queue analysis with retry (non-critical)
        await queueAnalysisWithRetry(uploadResponse, uploadRequest, user);
        // Record success metrics
        const duration = Date.now() - startTime;
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordPerformance('file-upload', duration, 'file-upload-service', true);
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordUserActivity('file-upload', user.userId, user.organizationId);
        const response = {
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
    }
    catch (error) {
        const duration = Date.now() - startTime;
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordPerformance('file-upload', duration, 'file-upload-service', false);
        logger.error('File upload failed', error);
        throw error; // Let centralized error handler manage this
    }
}, 'file-upload-service');
function errorResponse(statusCode, code, message) {
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
async function validateUploadRequest(uploadRequest) {
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
async function createFileMetadata(uploadResponse, uploadRequest, user) {
    const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
    const fileType = (ext === '.c' || ext === '.h') ? 'c' : 'cpp';
    const now = Math.floor(Date.now() / 1000);
    logger.info('Creating FileMetadata record', {
        fileId: uploadResponse.fileId,
        fileName: uploadRequest.fileName,
        fileType,
        userId: user.userId,
        s3Key: uploadResponse.s3Key
    });
    try {
        await dynamoClient.send(new client_dynamodb_1.PutItemCommand({
            TableName: FILE_METADATA_TABLE,
            Item: (0, util_dynamodb_1.marshall)({
                fileId: uploadResponse.fileId,
                userId: user.userId,
                filename: uploadRequest.fileName,
                fileType: fileType,
                fileSize: uploadRequest.fileSize,
                uploadTimestamp: now,
                analysisStatus: 'pending',
                s3Key: uploadResponse.s3Key,
                createdAt: now,
                updatedAt: now,
            }),
        }));
        logger.info('FileMetadata record created successfully', {
            fileId: uploadResponse.fileId,
            s3Key: uploadResponse.s3Key
        });
    }
    catch (error) {
        logger.error('Failed to create FileMetadata record', error, {
            fileId: uploadResponse.fileId,
            table: FILE_METADATA_TABLE
        });
        // Enhanced error handling for DynamoDB errors
        if (error instanceof Error) {
            const errorName = error.name || '';
            const errorMessage = error.message || '';
            if (errorName === 'AccessDenied' || errorMessage.includes('AccessDenied')) {
                await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('PERMISSION_DENIED', 'file-upload-service', 'DYNAMODB_ACCESS');
                throw new Error(`Failed to save file metadata: Permission denied. Ensure Lambda has DynamoDB permissions.`);
            }
            if (errorName === 'ResourceNotFoundException') {
                await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('RESOURCE_NOT_FOUND', 'file-upload-service', 'DYNAMODB_TABLE');
                throw new Error(`Failed to save file metadata: Table ${FILE_METADATA_TABLE} not found.`);
            }
            if (errorName === 'ThrottlingException' || errorName === 'ProvisionedThroughputExceededException') {
                await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('THROTTLING', 'file-upload-service', 'DYNAMODB_THROTTLE');
                throw new Error(`Failed to save file metadata: Service temporarily unavailable. Please retry.`);
            }
            if (errorName === 'ValidationException') {
                await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('VALIDATION_ERROR', 'file-upload-service', 'DYNAMODB_VALIDATION');
                throw new Error(`Failed to save file metadata: Invalid data format.`);
            }
        }
        // Generic error
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('DATABASE_ERROR', 'file-upload-service', 'METADATA_CREATION');
        throw new Error(`Failed to create file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Queue analysis with retry and graceful failure
 */
async function queueAnalysisWithRetry(uploadResponse, uploadRequest, user) {
    const analysisQueueUrl = process.env.ANALYSIS_QUEUE_URL;
    if (!analysisQueueUrl) {
        logger.warn('ANALYSIS_QUEUE_URL not configured - analysis will not be triggered automatically');
        return;
    }
    const ext = uploadRequest.fileName.substring(uploadRequest.fileName.lastIndexOf('.')).toLowerCase();
    const language = (ext === '.c' || ext === '.h') ? 'C' : 'CPP';
    try {
        await enhanced_retry_1.enhancedRetryService.executeWithRetry(async () => {
            logger.info('Queuing analysis', {
                fileId: uploadResponse.fileId,
                language,
                s3Key: uploadResponse.s3Key
            });
            await sqsClient.send(new client_sqs_1.SendMessageCommand({
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
                fileId: uploadResponse.fileId,
                s3Key: uploadResponse.s3Key
            });
        }, {
            maxAttempts: 3,
            initialDelayMs: 500,
            retryableErrors: ['timeout', 'SERVICE_UNAVAILABLE', 'ThrottlingException']
        });
    }
    catch (error) {
        // Log but don't fail the upload - metadata is already saved
        logger.warn('Failed to queue analysis - file upload succeeded but analysis not triggered', {
            fileId: uploadResponse.fileId,
            error: error.message
        });
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordError('QUEUE_FAILED', 'file-upload-service', 'SQS_ANALYSIS');
        // Don't throw - the upload was successful, analysis can be triggered manually
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvRTtBQUNwRSw4REFBMEU7QUFDMUUsMERBQWtEO0FBQ2xELGlGQUErRjtBQUMvRixxREFBcUY7QUFDckYsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRiwyRkFBOEY7QUFDOUYsK0NBQWtEO0FBRWxELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87QUFFL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzNGLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQkFBa0IsQ0FBQztBQUNsRixNQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLEVBQUUsQ0FBQztBQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQWdCbEQ7OztHQUdHO0FBQ1UsUUFBQSxPQUFPLEdBQUcsbURBQXVCLENBQUMsaUJBQWlCLENBQzlELEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1lBQ3pDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixPQUFPLEVBQUUs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QUUsY0FBYyxDQUFDLE1BQU07Z0JBQzdCLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSzthQUM1QixDQUFDLENBQUM7UUFDTCxDQUFDLEVBQ0Q7WUFDRSxXQUFXLEVBQUUsQ0FBQztZQUNkLGNBQWMsRUFBRSxHQUFHO1lBQ25CLGVBQWUsRUFBRSxDQUFDLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsQ0FBQztTQUMzRSxDQUNGLENBQUM7SUFFSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLDREQUE0RDtRQUM1RCxNQUFNLENBQUMsSUFBSSxDQUFDLDZFQUE2RSxFQUFFO1lBQ3pGLE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTTtZQUM3QixLQUFLLEVBQUcsS0FBZSxDQUFDLE9BQU87U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtREFBMkIsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRXJHLDhFQUE4RTtJQUNoRixDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgU1FTQ2xpZW50LCBTZW5kTWVzc2FnZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3FzJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFB1dEl0ZW1Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRmlsZVVwbG9hZFNlcnZpY2UsIEZpbGVVcGxvYWRSZXF1ZXN0IH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS9maWxlLXVwbG9hZC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0LCBjYW5QZXJmb3JtRmlsZU9wZXJhdGlvbnMgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5pbXBvcnQgeyBjZW50cmFsaXplZEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2NlbnRyYWxpemVkLWVycm9yLWhhbmRsZXInO1xyXG5pbXBvcnQgeyBlbmhhbmNlZFJldHJ5U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2VuaGFuY2VkLXJldHJ5JztcclxuaW1wb3J0IHsgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbW9uaXRvcmluZy9jbG91ZHdhdGNoLW1vbml0b3JpbmcnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgQUxMT1dFRF9FWFRFTlNJT05TID0gWycuYycsICcuY3BwJywgJy5oJywgJy5ocHAnXTtcclxuY29uc3QgTUFYX0ZJTEVfU0laRSA9IDEwICogMTAyNCAqIDEwMjQ7IC8vIDEwTUJcclxuXHJcbmNvbnN0IHNxc0NsaWVudCA9IG5ldyBTUVNDbGllbnQoe30pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmNvbnN0IEZJTEVfTUVUQURBVEFfVEFCTEUgPSBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFIHx8ICdGaWxlTWV0YWRhdGEtZGV2JztcclxuY29uc3QgZmlsZVVwbG9hZFNlcnZpY2UgPSBuZXcgRmlsZVVwbG9hZFNlcnZpY2UoKTtcclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdGaWxlVXBsb2FkRnVuY3Rpb24nKTtcclxuXHJcbi8vIExvY2FsIHR5cGUgZGVmaW5pdGlvbnNcclxuaW50ZXJmYWNlIFVwbG9hZFJlcXVlc3RCb2R5IHtcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgY29udGVudFR5cGU6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFVwbG9hZFJlc3BvbnNlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICB1cGxvYWRVcmw6IHN0cmluZztcclxuICBkb3dubG9hZFVybDogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogRW5oYW5jZWQgZmlsZSB1cGxvYWQgaGFuZGxlciB3aXRoIGNvbXByZWhlbnNpdmUgZXJyb3IgaGFuZGxpbmdcclxuICogUmVxdWlyZW1lbnRzOiAxLjEsIDEuMiwgNi4xLCA4LjEsIDguMlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBjZW50cmFsaXplZEVycm9ySGFuZGxlci53cmFwTGFtYmRhSGFuZGxlcihcclxuICBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdGaWxlIHVwbG9hZCByZXF1ZXN0IHN0YXJ0ZWQnLCB7IFxyXG4gICAgICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgICAgaGFzQm9keTogISFldmVudC5ib2R5LFxyXG4gICAgICAgIGJ1Y2tldE5hbWU6IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSxcclxuICAgICAgICBmaWxlTWV0YWRhdGFUYWJsZTogcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRVxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgb3IgSldUIHRva2VuXHJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnVXNlciBleHRyYWN0aW9uIHJlc3VsdCcsIHsgdXNlcklkOiB1c2VyLnVzZXJJZCwgZW1haWw6IHVzZXIuZW1haWwgfSk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VuYXV0aG9yaXplZCB1cGxvYWQgYXR0ZW1wdCcpO1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVU5BVVRIT1JJWkVEJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnTUlTU0lOR19VU0VSJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHVzZXIgY2FuIHBlcmZvcm0gZmlsZSBvcGVyYXRpb25zIChzdXBwb3J0cyB0ZW1wb3JhcnkgdG9rZW5zKVxyXG4gICAgICBpZiAoIWNhblBlcmZvcm1GaWxlT3BlcmF0aW9ucyh1c2VyKSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdVc2VyIGNhbm5vdCBwZXJmb3JtIGZpbGUgb3BlcmF0aW9ucycsIHsgXHJcbiAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLCBcclxuICAgICAgICAgIGlzVGVtcG9yYXJ5OiB1c2VyLmlzVGVtcG9yYXJ5LFxyXG4gICAgICAgICAgYXV0aFN0YXRlOiB1c2VyLmF1dGhTdGF0ZSBcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ0ZPUkJJRERFTicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0lOU1VGRklDSUVOVF9QRVJNSVNTSU9OUycpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG5lZWQgdG8gbG9nIGluIHRvIGFjY2VzcyB0aGlzIHJlc291cmNlJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVc2VyIGF1dGhlbnRpY2F0ZWQgZm9yIHVwbG9hZCcsIHsgXHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCwgXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgaXNUZW1wb3Jhcnk6IHVzZXIuaXNUZW1wb3JhcnksXHJcbiAgICAgICAgYXV0aFN0YXRlOiB1c2VyLmF1dGhTdGF0ZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFBhcnNlIGFuZCB2YWxpZGF0ZSByZXF1ZXN0IGJvZHlcclxuICAgICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VwbG9hZCByZXF1ZXN0IG1pc3NpbmcgYm9keScpO1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVkFMSURBVElPTl9FUlJPUicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ01JU1NJTkdfQk9EWScpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1VwbG9hZCByZXF1ZXN0IHBhcnNlZCcsIHsgXHJcbiAgICAgICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsIFxyXG4gICAgICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIGlucHV0IHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcclxuICAgICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgICAoKSA9PiB2YWxpZGF0ZVVwbG9hZFJlcXVlc3QodXBsb2FkUmVxdWVzdCksXHJcbiAgICAgICAgeyBtYXhBdHRlbXB0czogMSB9IC8vIE5vIHJldHJ5IGZvciB2YWxpZGF0aW9uXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVXBsb2FkIHJlcXVlc3QgdmFsaWRhdGlvbiBwYXNzZWQnKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBmaWxlIHVwbG9hZCByZXF1ZXN0XHJcbiAgICAgIGNvbnN0IGZpbGVVcGxvYWRSZXF1ZXN0OiBGaWxlVXBsb2FkUmVxdWVzdCA9IHtcclxuICAgICAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICBmaWxlU2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSxcclxuICAgICAgICBjb250ZW50VHlwZTogdXBsb2FkUmVxdWVzdC5jb250ZW50VHlwZSxcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIHVwbG9hZCBVUkwgd2l0aCByZXRyeVxyXG4gICAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGluZyBwcmVzaWduZWQgdXBsb2FkIFVSTCcpO1xyXG4gICAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICAgKCkgPT4gZmlsZVVwbG9hZFNlcnZpY2UuZ2VuZXJhdGVQcmVzaWduZWRVcGxvYWRVcmwoZmlsZVVwbG9hZFJlcXVlc3QpLFxyXG4gICAgICAgIHsgXHJcbiAgICAgICAgICBtYXhBdHRlbXB0czogMywgXHJcbiAgICAgICAgICBpbml0aWFsRGVsYXlNczogNTAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ3RpbWVvdXQnLCAnU0VSVklDRV9VTkFWQUlMQUJMRScsICdFWFRFUk5BTF9TRVJWSUNFX0VSUk9SJ11cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuaW5mbygnUHJlc2lnbmVkIFVSTCBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgZXhwaXJlc0luOiB1cGxvYWRSZXNwb25zZS5leHBpcmVzSW4gXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIEZpbGVNZXRhZGF0YSByZWNvcmQgd2l0aCByZXRyeVxyXG4gICAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAgICgpID0+IGNyZWF0ZUZpbGVNZXRhZGF0YSh1cGxvYWRSZXNwb25zZSwgdXBsb2FkUmVxdWVzdCwgdXNlciksXHJcbiAgICAgICAgeyBcclxuICAgICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ1Rocm90dGxpbmdFeGNlcHRpb24nLCAnUHJvdmlzaW9uZWRUaHJvdWdocHV0RXhjZWVkZWRFeGNlcHRpb24nLCAnU2VydmljZVVuYXZhaWxhYmxlJ11cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnRmlsZU1ldGFkYXRhIHJlY29yZCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgICAgLy8gUXVldWUgYW5hbHlzaXMgd2l0aCByZXRyeSAobm9uLWNyaXRpY2FsKVxyXG4gICAgICBhd2FpdCBxdWV1ZUFuYWx5c2lzV2l0aFJldHJ5KHVwbG9hZFJlc3BvbnNlLCB1cGxvYWRSZXF1ZXN0LCB1c2VyKTtcclxuXHJcbiAgICAgIC8vIFJlY29yZCBzdWNjZXNzIG1ldHJpY3NcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2UoJ2ZpbGUtdXBsb2FkJywgZHVyYXRpb24sICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgdHJ1ZSk7XHJcbiAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRVc2VyQWN0aXZpdHkoJ2ZpbGUtdXBsb2FkJywgdXNlci51c2VySWQsIHVzZXIub3JnYW5pemF0aW9uSWQpO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2U6IFVwbG9hZFJlc3BvbnNlID0ge1xyXG4gICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICAgIHVwbG9hZFVybDogdXBsb2FkUmVzcG9uc2UudXBsb2FkVXJsLFxyXG4gICAgICAgIGRvd25sb2FkVXJsOiB1cGxvYWRSZXNwb25zZS5kb3dubG9hZFVybCxcclxuICAgICAgICBleHBpcmVzSW46IHVwbG9hZFJlc3BvbnNlLmV4cGlyZXNJbixcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdGaWxlIHVwbG9hZCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgZHVyYXRpb24gXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2UoJ2ZpbGUtdXBsb2FkJywgZHVyYXRpb24sICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgZmFsc2UpO1xyXG4gICAgICBcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGaWxlIHVwbG9hZCBmYWlsZWQnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yOyAvLyBMZXQgY2VudHJhbGl6ZWQgZXJyb3IgaGFuZGxlciBtYW5hZ2UgdGhpc1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnXHJcbik7XHJcblxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIHVwbG9hZCByZXF1ZXN0IHdpdGggZW5oYW5jZWQgZXJyb3IgbWVzc2FnZXNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlVXBsb2FkUmVxdWVzdCh1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IEFMTE9XRURfRVhURU5TSU9OUyA9IFsnLmMnLCAnLmNwcCcsICcuaCcsICcuaHBwJ107XHJcbiAgY29uc3QgTUFYX0ZJTEVfU0laRSA9IDEwICogMTAyNCAqIDEwMjQ7IC8vIDEwTUJcclxuXHJcbiAgaWYgKCF1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lIHx8ICF1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIHx8ICF1cGxvYWRSZXF1ZXN0LmNvbnRlbnRUeXBlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ZpbGVOYW1lLCBmaWxlU2l6ZSwgYW5kIGNvbnRlbnRUeXBlIGFyZSByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gVmFsaWRhdGUgZmlsZSBleHRlbnNpb24gKFJlcXVpcmVtZW50cyAxLjEpXHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGlmICghQUxMT1dFRF9FWFRFTlNJT05TLmluY2x1ZGVzKGV4dCkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgT25seSAke0FMTE9XRURfRVhURU5TSU9OUy5qb2luKCcsICcpfSBmaWxlcyBhcmUgYWxsb3dlZGApO1xyXG4gIH1cclxuXHJcbiAgLy8gVmFsaWRhdGUgZmlsZSBzaXplIChSZXF1aXJlbWVudHMgMS4yKVxyXG4gIGlmICh1cGxvYWRSZXF1ZXN0LmZpbGVTaXplID4gTUFYX0ZJTEVfU0laRSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHNpemUgbXVzdCBub3QgZXhjZWVkIDEwTUIgKCR7TUFYX0ZJTEVfU0laRX0gYnl0ZXMpYCk7XHJcbiAgfVxyXG5cclxuICBsb2dnZXIuaW5mbygnVXBsb2FkIHJlcXVlc3QgdmFsaWRhdGlvbiBwYXNzZWQnLCB7IFxyXG4gICAgZmlsZVR5cGU6IGV4dCwgXHJcbiAgICBmaWxlU2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSBcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBmaWxlIG1ldGFkYXRhIHJlY29yZCB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVGaWxlTWV0YWRhdGEoXHJcbiAgdXBsb2FkUmVzcG9uc2U6IGFueSxcclxuICB1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSxcclxuICB1c2VyOiBhbnlcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGNvbnN0IGZpbGVUeXBlID0gKGV4dCA9PT0gJy5jJyB8fCBleHQgPT09ICcuaCcpID8gJ2MnIDogJ2NwcCc7XHJcbiAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdDcmVhdGluZyBGaWxlTWV0YWRhdGEgcmVjb3JkJywge1xyXG4gICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgIGZpbGVUeXBlLFxyXG4gICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBGSUxFX01FVEFEQVRBX1RBQkxFLFxyXG4gICAgICBJdGVtOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICBmaWxlbmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICBmaWxlVHlwZTogZmlsZVR5cGUsXHJcbiAgICAgICAgZmlsZVNpemU6IHVwbG9hZFJlcXVlc3QuZmlsZVNpemUsXHJcbiAgICAgICAgdXBsb2FkVGltZXN0YW1wOiBub3csXHJcbiAgICAgICAgYW5hbHlzaXNTdGF0dXM6ICdwZW5kaW5nJyxcclxuICAgICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXksXHJcbiAgICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgICAgdXBkYXRlZEF0OiBub3csXHJcbiAgICAgIH0pLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGaWxlTWV0YWRhdGEgcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgRmlsZU1ldGFkYXRhIHJlY29yZCcsIGVycm9yIGFzIEVycm9yLCB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICB0YWJsZTogRklMRV9NRVRBREFUQV9UQUJMRVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRW5oYW5jZWQgZXJyb3IgaGFuZGxpbmcgZm9yIER5bmFtb0RCIGVycm9yc1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgY29uc3QgZXJyb3JOYW1lID0gKGVycm9yIGFzIGFueSkubmFtZSB8fCAnJztcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IubWVzc2FnZSB8fCAnJztcclxuXHJcbiAgICAgIGlmIChlcnJvck5hbWUgPT09ICdBY2Nlc3NEZW5pZWQnIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnQWNjZXNzRGVuaWVkJykpIHtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1BFUk1JU1NJT05fREVOSUVEJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfQUNDRVNTJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2F2ZSBmaWxlIG1ldGFkYXRhOiBQZXJtaXNzaW9uIGRlbmllZC4gRW5zdXJlIExhbWJkYSBoYXMgRHluYW1vREIgcGVybWlzc2lvbnMuYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChlcnJvck5hbWUgPT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignUkVTT1VSQ0VfTk9UX0ZPVU5EJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfVEFCTEUnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgbWV0YWRhdGE6IFRhYmxlICR7RklMRV9NRVRBREFUQV9UQUJMRX0gbm90IGZvdW5kLmApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZXJyb3JOYW1lID09PSAnVGhyb3R0bGluZ0V4Y2VwdGlvbicgfHwgZXJyb3JOYW1lID09PSAnUHJvdmlzaW9uZWRUaHJvdWdocHV0RXhjZWVkZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdUSFJPVFRMSU5HJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfVEhST1RUTEUnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgbWV0YWRhdGE6IFNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSByZXRyeS5gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGVycm9yTmFtZSA9PT0gJ1ZhbGlkYXRpb25FeGNlcHRpb24nKSB7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdWQUxJREFUSU9OX0VSUk9SJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfVkFMSURBVElPTicpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHNhdmUgZmlsZSBtZXRhZGF0YTogSW52YWxpZCBkYXRhIGZvcm1hdC5gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyaWMgZXJyb3JcclxuICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignREFUQUJBU0VfRVJST1InLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdNRVRBREFUQV9DUkVBVElPTicpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIGZpbGUgbWV0YWRhdGE6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUXVldWUgYW5hbHlzaXMgd2l0aCByZXRyeSBhbmQgZ3JhY2VmdWwgZmFpbHVyZVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcXVldWVBbmFseXNpc1dpdGhSZXRyeShcclxuICB1cGxvYWRSZXNwb25zZTogYW55LFxyXG4gIHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5LFxyXG4gIHVzZXI6IGFueVxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBhbmFseXNpc1F1ZXVlVXJsID0gcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUVVFVUVfVVJMO1xyXG4gIFxyXG4gIGlmICghYW5hbHlzaXNRdWV1ZVVybCkge1xyXG4gICAgbG9nZ2VyLndhcm4oJ0FOQUxZU0lTX1FVRVVFX1VSTCBub3QgY29uZmlndXJlZCAtIGFuYWx5c2lzIHdpbGwgbm90IGJlIHRyaWdnZXJlZCBhdXRvbWF0aWNhbGx5Jyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBjb25zdCBleHQgPSB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLnN1YnN0cmluZyh1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XHJcbiAgY29uc3QgbGFuZ3VhZ2UgPSAoZXh0ID09PSAnLmMnIHx8IGV4dCA9PT0gJy5oJykgPyAnQycgOiAnQ1BQJztcclxuXHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgIGFzeW5jICgpID0+IHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnUXVldWluZyBhbmFseXNpcycsIHsgXHJcbiAgICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhd2FpdCBzcXNDbGllbnQuc2VuZChuZXcgU2VuZE1lc3NhZ2VDb21tYW5kKHtcclxuICAgICAgICAgIFF1ZXVlVXJsOiBhbmFseXNpc1F1ZXVlVXJsLFxyXG4gICAgICAgICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgICAgIGZpbGVOYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXksXHJcbiAgICAgICAgICAgIGxhbmd1YWdlLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCB8fCAnZGVmYXVsdC1vcmcnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcXVldWVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LFxyXG4gICAgICB7IFxyXG4gICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICBpbml0aWFsRGVsYXlNczogNTAwLFxyXG4gICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnVGhyb3R0bGluZ0V4Y2VwdGlvbiddXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAvLyBMb2cgYnV0IGRvbid0IGZhaWwgdGhlIHVwbG9hZCAtIG1ldGFkYXRhIGlzIGFscmVhZHkgc2F2ZWRcclxuICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gcXVldWUgYW5hbHlzaXMgLSBmaWxlIHVwbG9hZCBzdWNjZWVkZWQgYnV0IGFuYWx5c2lzIG5vdCB0cmlnZ2VyZWQnLCB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1FVRVVFX0ZBSUxFRCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ1NRU19BTkFMWVNJUycpO1xyXG4gICAgXHJcbiAgICAvLyBEb24ndCB0aHJvdyAtIHRoZSB1cGxvYWQgd2FzIHN1Y2Nlc3NmdWwsIGFuYWx5c2lzIGNhbiBiZSB0cmlnZ2VyZWQgbWFudWFsbHlcclxuICB9XHJcbn0iXX0=