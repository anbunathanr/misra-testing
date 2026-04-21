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
        logger.info('File upload request started');
        // Extract user from Lambda Authorizer context or JWT token
        const user = await (0, auth_util_1.getUserFromContext)(event);
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
            organizationId: user.organizationId,
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
        userId: user.userId
    });
    try {
        await dynamoClient.send(new client_dynamodb_1.PutItemCommand({
            TableName: FILE_METADATA_TABLE,
            Item: (0, util_dynamodb_1.marshall)({
                file_id: uploadResponse.fileId,
                filename: uploadRequest.fileName,
                file_type: fileType,
                file_size: uploadRequest.fileSize,
                user_id: user.userId,
                upload_timestamp: now,
                analysis_status: 'pending',
                s3_key: uploadResponse.s3Key,
                created_at: now,
                updated_at: now,
            }),
        }));
        logger.info('FileMetadata record created successfully', {
            fileId: uploadResponse.fileId
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
                language
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
                fileId: uploadResponse.fileId
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvRTtBQUNwRSw4REFBMEU7QUFDMUUsMERBQWtEO0FBQ2xELGlGQUErRjtBQUMvRixxREFBcUY7QUFDckYsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRiwyRkFBOEY7QUFDOUYsK0NBQWtEO0FBRWxELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87QUFFL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzNGLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQkFBa0IsQ0FBQztBQUNsRixNQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLEVBQUUsQ0FBQztBQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQWdCbEQ7OztHQUdHO0FBQ1UsUUFBQSxPQUFPLEdBQUcsbURBQXVCLENBQUMsaUJBQWlCLENBQzlELEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFM0MsMkRBQTJEO1FBQzNELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFB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QyxXQUFXLENBQUMsY0FBYyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBRXJHLDhFQUE4RTtJQUNoRixDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgU1FTQ2xpZW50LCBTZW5kTWVzc2FnZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc3FzJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFB1dEl0ZW1Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRmlsZVVwbG9hZFNlcnZpY2UsIEZpbGVVcGxvYWRSZXF1ZXN0IH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZmlsZS9maWxlLXVwbG9hZC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0LCBjYW5QZXJmb3JtRmlsZU9wZXJhdGlvbnMgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5pbXBvcnQgeyBjZW50cmFsaXplZEVycm9ySGFuZGxlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2NlbnRyYWxpemVkLWVycm9yLWhhbmRsZXInO1xyXG5pbXBvcnQgeyBlbmhhbmNlZFJldHJ5U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2Vycm9yLWhhbmRsaW5nL2VuaGFuY2VkLXJldHJ5JztcclxuaW1wb3J0IHsgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbW9uaXRvcmluZy9jbG91ZHdhdGNoLW1vbml0b3JpbmcnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuY29uc3QgQUxMT1dFRF9FWFRFTlNJT05TID0gWycuYycsICcuY3BwJywgJy5oJywgJy5ocHAnXTtcclxuY29uc3QgTUFYX0ZJTEVfU0laRSA9IDEwICogMTAyNCAqIDEwMjQ7IC8vIDEwTUJcclxuXHJcbmNvbnN0IHNxc0NsaWVudCA9IG5ldyBTUVNDbGllbnQoe30pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbmNvbnN0IEZJTEVfTUVUQURBVEFfVEFCTEUgPSBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFIHx8ICdGaWxlTWV0YWRhdGEtZGV2JztcclxuY29uc3QgZmlsZVVwbG9hZFNlcnZpY2UgPSBuZXcgRmlsZVVwbG9hZFNlcnZpY2UoKTtcclxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdGaWxlVXBsb2FkRnVuY3Rpb24nKTtcclxuXHJcbi8vIExvY2FsIHR5cGUgZGVmaW5pdGlvbnNcclxuaW50ZXJmYWNlIFVwbG9hZFJlcXVlc3RCb2R5IHtcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgY29udGVudFR5cGU6IHN0cmluZztcclxufVxyXG5cclxuaW50ZXJmYWNlIFVwbG9hZFJlc3BvbnNlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICB1cGxvYWRVcmw6IHN0cmluZztcclxuICBkb3dubG9hZFVybDogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogRW5oYW5jZWQgZmlsZSB1cGxvYWQgaGFuZGxlciB3aXRoIGNvbXByZWhlbnNpdmUgZXJyb3IgaGFuZGxpbmdcclxuICogUmVxdWlyZW1lbnRzOiAxLjEsIDEuMiwgNi4xLCA4LjEsIDguMlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBjZW50cmFsaXplZEVycm9ySGFuZGxlci53cmFwTGFtYmRhSGFuZGxlcihcclxuICBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdGaWxlIHVwbG9hZCByZXF1ZXN0IHN0YXJ0ZWQnKTtcclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgb3IgSldUIHRva2VuXHJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VuYXV0aG9yaXplZCB1cGxvYWQgYXR0ZW1wdCcpO1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVU5BVVRIT1JJWkVEJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnTUlTU0lOR19VU0VSJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHVzZXIgY2FuIHBlcmZvcm0gZmlsZSBvcGVyYXRpb25zIChzdXBwb3J0cyB0ZW1wb3JhcnkgdG9rZW5zKVxyXG4gICAgICBpZiAoIWNhblBlcmZvcm1GaWxlT3BlcmF0aW9ucyh1c2VyKSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdVc2VyIGNhbm5vdCBwZXJmb3JtIGZpbGUgb3BlcmF0aW9ucycsIHsgXHJcbiAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLCBcclxuICAgICAgICAgIGlzVGVtcG9yYXJ5OiB1c2VyLmlzVGVtcG9yYXJ5LFxyXG4gICAgICAgICAgYXV0aFN0YXRlOiB1c2VyLmF1dGhTdGF0ZSBcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ0ZPUkJJRERFTicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0lOU1VGRklDSUVOVF9QRVJNSVNTSU9OUycpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG5lZWQgdG8gbG9nIGluIHRvIGFjY2VzcyB0aGlzIHJlc291cmNlJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVc2VyIGF1dGhlbnRpY2F0ZWQgZm9yIHVwbG9hZCcsIHsgXHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCwgXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgaXNUZW1wb3Jhcnk6IHVzZXIuaXNUZW1wb3JhcnksXHJcbiAgICAgICAgYXV0aFN0YXRlOiB1c2VyLmF1dGhTdGF0ZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFBhcnNlIGFuZCB2YWxpZGF0ZSByZXF1ZXN0IGJvZHlcclxuICAgICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VwbG9hZCByZXF1ZXN0IG1pc3NpbmcgYm9keScpO1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVkFMSURBVElPTl9FUlJPUicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ01JU1NJTkdfQk9EWScpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1VwbG9hZCByZXF1ZXN0IHBhcnNlZCcsIHsgXHJcbiAgICAgICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsIFxyXG4gICAgICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIGlucHV0IHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcclxuICAgICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgICAoKSA9PiB2YWxpZGF0ZVVwbG9hZFJlcXVlc3QodXBsb2FkUmVxdWVzdCksXHJcbiAgICAgICAgeyBtYXhBdHRlbXB0czogMSB9IC8vIE5vIHJldHJ5IGZvciB2YWxpZGF0aW9uXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVXBsb2FkIHJlcXVlc3QgdmFsaWRhdGlvbiBwYXNzZWQnKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBmaWxlIHVwbG9hZCByZXF1ZXN0XHJcbiAgICAgIGNvbnN0IGZpbGVVcGxvYWRSZXF1ZXN0OiBGaWxlVXBsb2FkUmVxdWVzdCA9IHtcclxuICAgICAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICBmaWxlU2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSxcclxuICAgICAgICBjb250ZW50VHlwZTogdXBsb2FkUmVxdWVzdC5jb250ZW50VHlwZSxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIHVwbG9hZCBVUkwgd2l0aCByZXRyeVxyXG4gICAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGluZyBwcmVzaWduZWQgdXBsb2FkIFVSTCcpO1xyXG4gICAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICAgKCkgPT4gZmlsZVVwbG9hZFNlcnZpY2UuZ2VuZXJhdGVQcmVzaWduZWRVcGxvYWRVcmwoZmlsZVVwbG9hZFJlcXVlc3QpLFxyXG4gICAgICAgIHsgXHJcbiAgICAgICAgICBtYXhBdHRlbXB0czogMywgXHJcbiAgICAgICAgICBpbml0aWFsRGVsYXlNczogNTAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ3RpbWVvdXQnLCAnU0VSVklDRV9VTkFWQUlMQUJMRScsICdFWFRFUk5BTF9TRVJWSUNFX0VSUk9SJ11cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuaW5mbygnUHJlc2lnbmVkIFVSTCBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgZXhwaXJlc0luOiB1cGxvYWRSZXNwb25zZS5leHBpcmVzSW4gXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIEZpbGVNZXRhZGF0YSByZWNvcmQgd2l0aCByZXRyeVxyXG4gICAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAgICgpID0+IGNyZWF0ZUZpbGVNZXRhZGF0YSh1cGxvYWRSZXNwb25zZSwgdXBsb2FkUmVxdWVzdCwgdXNlciksXHJcbiAgICAgICAgeyBcclxuICAgICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ1Rocm90dGxpbmdFeGNlcHRpb24nLCAnUHJvdmlzaW9uZWRUaHJvdWdocHV0RXhjZWVkZWRFeGNlcHRpb24nLCAnU2VydmljZVVuYXZhaWxhYmxlJ11cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnRmlsZU1ldGFkYXRhIHJlY29yZCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgICAgLy8gUXVldWUgYW5hbHlzaXMgd2l0aCByZXRyeSAobm9uLWNyaXRpY2FsKVxyXG4gICAgICBhd2FpdCBxdWV1ZUFuYWx5c2lzV2l0aFJldHJ5KHVwbG9hZFJlc3BvbnNlLCB1cGxvYWRSZXF1ZXN0LCB1c2VyKTtcclxuXHJcbiAgICAgIC8vIFJlY29yZCBzdWNjZXNzIG1ldHJpY3NcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2UoJ2ZpbGUtdXBsb2FkJywgZHVyYXRpb24sICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgdHJ1ZSk7XHJcbiAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRVc2VyQWN0aXZpdHkoJ2ZpbGUtdXBsb2FkJywgdXNlci51c2VySWQsIHVzZXIub3JnYW5pemF0aW9uSWQpO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2U6IFVwbG9hZFJlc3BvbnNlID0ge1xyXG4gICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICAgIHVwbG9hZFVybDogdXBsb2FkUmVzcG9uc2UudXBsb2FkVXJsLFxyXG4gICAgICAgIGRvd25sb2FkVXJsOiB1cGxvYWRSZXNwb25zZS5kb3dubG9hZFVybCxcclxuICAgICAgICBleHBpcmVzSW46IHVwbG9hZFJlc3BvbnNlLmV4cGlyZXNJbixcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdGaWxlIHVwbG9hZCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgZHVyYXRpb24gXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2UoJ2ZpbGUtdXBsb2FkJywgZHVyYXRpb24sICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgZmFsc2UpO1xyXG4gICAgICBcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGaWxlIHVwbG9hZCBmYWlsZWQnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yOyAvLyBMZXQgY2VudHJhbGl6ZWQgZXJyb3IgaGFuZGxlciBtYW5hZ2UgdGhpc1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnXHJcbik7XHJcblxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIHVwbG9hZCByZXF1ZXN0IHdpdGggZW5oYW5jZWQgZXJyb3IgbWVzc2FnZXNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlVXBsb2FkUmVxdWVzdCh1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IEFMTE9XRURfRVhURU5TSU9OUyA9IFsnLmMnLCAnLmNwcCcsICcuaCcsICcuaHBwJ107XHJcbiAgY29uc3QgTUFYX0ZJTEVfU0laRSA9IDEwICogMTAyNCAqIDEwMjQ7IC8vIDEwTUJcclxuXHJcbiAgaWYgKCF1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lIHx8ICF1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIHx8ICF1cGxvYWRSZXF1ZXN0LmNvbnRlbnRUeXBlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ZpbGVOYW1lLCBmaWxlU2l6ZSwgYW5kIGNvbnRlbnRUeXBlIGFyZSByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gVmFsaWRhdGUgZmlsZSBleHRlbnNpb24gKFJlcXVpcmVtZW50cyAxLjEpXHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGlmICghQUxMT1dFRF9FWFRFTlNJT05TLmluY2x1ZGVzKGV4dCkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgT25seSAke0FMTE9XRURfRVhURU5TSU9OUy5qb2luKCcsICcpfSBmaWxlcyBhcmUgYWxsb3dlZGApO1xyXG4gIH1cclxuXHJcbiAgLy8gVmFsaWRhdGUgZmlsZSBzaXplIChSZXF1aXJlbWVudHMgMS4yKVxyXG4gIGlmICh1cGxvYWRSZXF1ZXN0LmZpbGVTaXplID4gTUFYX0ZJTEVfU0laRSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHNpemUgbXVzdCBub3QgZXhjZWVkIDEwTUIgKCR7TUFYX0ZJTEVfU0laRX0gYnl0ZXMpYCk7XHJcbiAgfVxyXG5cclxuICBsb2dnZXIuaW5mbygnVXBsb2FkIHJlcXVlc3QgdmFsaWRhdGlvbiBwYXNzZWQnLCB7IFxyXG4gICAgZmlsZVR5cGU6IGV4dCwgXHJcbiAgICBmaWxlU2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSBcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBmaWxlIG1ldGFkYXRhIHJlY29yZCB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVGaWxlTWV0YWRhdGEoXHJcbiAgdXBsb2FkUmVzcG9uc2U6IGFueSxcclxuICB1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSxcclxuICB1c2VyOiBhbnlcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGNvbnN0IGZpbGVUeXBlID0gKGV4dCA9PT0gJy5jJyB8fCBleHQgPT09ICcuaCcpID8gJ2MnIDogJ2NwcCc7XHJcbiAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdDcmVhdGluZyBGaWxlTWV0YWRhdGEgcmVjb3JkJywge1xyXG4gICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgIGZpbGVUeXBlLFxyXG4gICAgdXNlcklkOiB1c2VyLnVzZXJJZFxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBGSUxFX01FVEFEQVRBX1RBQkxFLFxyXG4gICAgICBJdGVtOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgZmlsZV9pZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICAgIGZpbGVuYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgIGZpbGVfdHlwZTogZmlsZVR5cGUsXHJcbiAgICAgICAgZmlsZV9zaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplLFxyXG4gICAgICAgIHVzZXJfaWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgIHVwbG9hZF90aW1lc3RhbXA6IG5vdyxcclxuICAgICAgICBhbmFseXNpc19zdGF0dXM6ICdwZW5kaW5nJyxcclxuICAgICAgICBzM19rZXk6IHVwbG9hZFJlc3BvbnNlLnMzS2V5LFxyXG4gICAgICAgIGNyZWF0ZWRfYXQ6IG5vdyxcclxuICAgICAgICB1cGRhdGVkX2F0OiBub3csXHJcbiAgICAgIH0pLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGaWxlTWV0YWRhdGEgcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQgXHJcbiAgICB9KTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGNyZWF0ZSBGaWxlTWV0YWRhdGEgcmVjb3JkJywgZXJyb3IgYXMgRXJyb3IsIHtcclxuICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgIHRhYmxlOiBGSUxFX01FVEFEQVRBX1RBQkxFXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbmhhbmNlZCBlcnJvciBoYW5kbGluZyBmb3IgRHluYW1vREIgZXJyb3JzXHJcbiAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICBjb25zdCBlcnJvck5hbWUgPSAoZXJyb3IgYXMgYW55KS5uYW1lIHx8ICcnO1xyXG4gICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlIHx8ICcnO1xyXG5cclxuICAgICAgaWYgKGVycm9yTmFtZSA9PT0gJ0FjY2Vzc0RlbmllZCcgfHwgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKCdBY2Nlc3NEZW5pZWQnKSkge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignUEVSTUlTU0lPTl9ERU5JRUQnLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdEWU5BTU9EQl9BQ0NFU1MnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgbWV0YWRhdGE6IFBlcm1pc3Npb24gZGVuaWVkLiBFbnN1cmUgTGFtYmRhIGhhcyBEeW5hbW9EQiBwZXJtaXNzaW9ucy5gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGVycm9yTmFtZSA9PT0gJ1Jlc291cmNlTm90Rm91bmRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdSRVNPVVJDRV9OT1RfRk9VTkQnLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdEWU5BTU9EQl9UQUJMRScpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHNhdmUgZmlsZSBtZXRhZGF0YTogVGFibGUgJHtGSUxFX01FVEFEQVRBX1RBQkxFfSBub3QgZm91bmQuYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChlcnJvck5hbWUgPT09ICdUaHJvdHRsaW5nRXhjZXB0aW9uJyB8fCBlcnJvck5hbWUgPT09ICdQcm92aXNpb25lZFRocm91Z2hwdXRFeGNlZWRlZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1RIUk9UVExJTkcnLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdEWU5BTU9EQl9USFJPVFRMRScpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHNhdmUgZmlsZSBtZXRhZGF0YTogU2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4gUGxlYXNlIHJldHJ5LmApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZXJyb3JOYW1lID09PSAnVmFsaWRhdGlvbkV4Y2VwdGlvbicpIHtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1ZBTElEQVRJT05fRVJST1InLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdEWU5BTU9EQl9WQUxJREFUSU9OJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2F2ZSBmaWxlIG1ldGFkYXRhOiBJbnZhbGlkIGRhdGEgZm9ybWF0LmApO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJpYyBlcnJvclxyXG4gICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdEQVRBQkFTRV9FUlJPUicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ01FVEFEQVRBX0NSRUFUSU9OJyk7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBjcmVhdGUgZmlsZSBtZXRhZGF0YTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBRdWV1ZSBhbmFseXNpcyB3aXRoIHJldHJ5IGFuZCBncmFjZWZ1bCBmYWlsdXJlXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBxdWV1ZUFuYWx5c2lzV2l0aFJldHJ5KFxyXG4gIHVwbG9hZFJlc3BvbnNlOiBhbnksXHJcbiAgdXBsb2FkUmVxdWVzdDogVXBsb2FkUmVxdWVzdEJvZHksXHJcbiAgdXNlcjogYW55XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGFuYWx5c2lzUXVldWVVcmwgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19RVUVVRV9VUkw7XHJcbiAgXHJcbiAgaWYgKCFhbmFseXNpc1F1ZXVlVXJsKSB7XHJcbiAgICBsb2dnZXIud2FybignQU5BTFlTSVNfUVVFVUVfVVJMIG5vdCBjb25maWd1cmVkIC0gYW5hbHlzaXMgd2lsbCBub3QgYmUgdHJpZ2dlcmVkIGF1dG9tYXRpY2FsbHknKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcblxyXG4gIGNvbnN0IGV4dCA9IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUuc3Vic3RyaW5nKHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKSkudG9Mb3dlckNhc2UoKTtcclxuICBjb25zdCBsYW5ndWFnZSA9IChleHQgPT09ICcuYycgfHwgZXh0ID09PSAnLmgnKSA/ICdDJyA6ICdDUFAnO1xyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdRdWV1aW5nIGFuYWx5c2lzJywgeyBcclxuICAgICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLCBcclxuICAgICAgICAgIGxhbmd1YWdlIFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhd2FpdCBzcXNDbGllbnQuc2VuZChuZXcgU2VuZE1lc3NhZ2VDb21tYW5kKHtcclxuICAgICAgICAgIFF1ZXVlVXJsOiBhbmFseXNpc1F1ZXVlVXJsLFxyXG4gICAgICAgICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgICAgIGZpbGVOYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXksXHJcbiAgICAgICAgICAgIGxhbmd1YWdlLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCB8fCAnZGVmYXVsdC1vcmcnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcXVldWVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCBcclxuICAgICAgICB9KTtcclxuICAgICAgfSxcclxuICAgICAgeyBcclxuICAgICAgICBtYXhBdHRlbXB0czogMywgXHJcbiAgICAgICAgaW5pdGlhbERlbGF5TXM6IDUwMCxcclxuICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICdTRVJWSUNFX1VOQVZBSUxBQkxFJywgJ1Rocm90dGxpbmdFeGNlcHRpb24nXVxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gTG9nIGJ1dCBkb24ndCBmYWlsIHRoZSB1cGxvYWQgLSBtZXRhZGF0YSBpcyBhbHJlYWR5IHNhdmVkXHJcbiAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHF1ZXVlIGFuYWx5c2lzIC0gZmlsZSB1cGxvYWQgc3VjY2VlZGVkIGJ1dCBhbmFseXNpcyBub3QgdHJpZ2dlcmVkJywge1xyXG4gICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZVxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdRVUVVRV9GQUlMRUQnLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdTUVNfQU5BTFlTSVMnKTtcclxuICAgIFxyXG4gICAgLy8gRG9uJ3QgdGhyb3cgLSB0aGUgdXBsb2FkIHdhcyBzdWNjZXNzZnVsLCBhbmFseXNpcyBjYW4gYmUgdHJpZ2dlcmVkIG1hbnVhbGx5XHJcbiAgfVxyXG59Il19