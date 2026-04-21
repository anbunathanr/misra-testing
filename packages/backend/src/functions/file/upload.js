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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvRTtBQUNwRSw4REFBMEU7QUFDMUUsMERBQWtEO0FBQ2xELGlGQUErRjtBQUMvRixxREFBcUY7QUFDckYsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRiwyRkFBOEY7QUFDOUYsK0NBQWtEO0FBRWxELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87QUFFL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzNGLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQkFBa0IsQ0FBQztBQUNsRixNQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLEVBQUUsQ0FBQztBQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQWdCbEQ7OztHQUdHO0FBQ1UsUUFBQSxPQUFPLEdBQUcsbURBQXVCLENBQUMsaUJBQWlCLENBQzlELEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFM0MsMkRBQTJEO1FBQzNELE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFB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QUUsY0FBYyxDQUFDLENBQUM7UUFFckcsOEVBQThFO0lBQ2hGLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTUVNDbGllbnQsIFNlbmRNZXNzYWdlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zcXMnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBGaWxlVXBsb2FkU2VydmljZSwgRmlsZVVwbG9hZFJlcXVlc3QgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlL2ZpbGUtdXBsb2FkLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQsIGNhblBlcmZvcm1GaWxlT3BlcmF0aW9ucyB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcbmltcG9ydCB7IGNlbnRyYWxpemVkRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZXJyb3ItaGFuZGxpbmcvY2VudHJhbGl6ZWQtZXJyb3ItaGFuZGxlcic7XHJcbmltcG9ydCB7IGVuaGFuY2VkUmV0cnlTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZXJyb3ItaGFuZGxpbmcvZW5oYW5jZWQtcmV0cnknO1xyXG5pbXBvcnQgeyBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9tb25pdG9yaW5nL2Nsb3Vkd2F0Y2gtbW9uaXRvcmluZyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBBTExPV0VEX0VYVEVOU0lPTlMgPSBbJy5jJywgJy5jcHAnLCAnLmgnLCAnLmhwcCddO1xyXG5jb25zdCBNQVhfRklMRV9TSVpFID0gMTAgKiAxMDI0ICogMTAyNDsgLy8gMTBNQlxyXG5cclxuY29uc3Qgc3FzQ2xpZW50ID0gbmV3IFNRU0NsaWVudCh7fSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3QgRklMRV9NRVRBREFUQV9UQUJMRSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YS1kZXYnO1xyXG5jb25zdCBmaWxlVXBsb2FkU2VydmljZSA9IG5ldyBGaWxlVXBsb2FkU2VydmljZSgpO1xyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0ZpbGVVcGxvYWRGdW5jdGlvbicpO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9uc1xyXG5pbnRlcmZhY2UgVXBsb2FkUmVxdWVzdEJvZHkge1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgZmlsZVNpemU6IG51bWJlcjtcclxuICBjb250ZW50VHlwZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVXBsb2FkUmVzcG9uc2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIHVwbG9hZFVybDogc3RyaW5nO1xyXG4gIGRvd25sb2FkVXJsOiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFbmhhbmNlZCBmaWxlIHVwbG9hZCBoYW5kbGVyIHdpdGggY29tcHJlaGVuc2l2ZSBlcnJvciBoYW5kbGluZ1xyXG4gKiBSZXF1aXJlbWVudHM6IDEuMSwgMS4yLCA2LjEsIDguMSwgOC4yXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGNlbnRyYWxpemVkRXJyb3JIYW5kbGVyLndyYXBMYW1iZGFIYW5kbGVyKFxyXG4gIGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgbG9nZ2VyLmluZm8oJ0ZpbGUgdXBsb2FkIHJlcXVlc3Qgc3RhcnRlZCcpO1xyXG4gICAgICBcclxuICAgICAgLy8gRXh0cmFjdCB1c2VyIGZyb20gTGFtYmRhIEF1dGhvcml6ZXIgY29udGV4dCBvciBKV1QgdG9rZW5cclxuICAgICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgICBsb2dnZXIud2FybignVW5hdXRob3JpemVkIHVwbG9hZCBhdHRlbXB0Jyk7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdVTkFVVEhPUklaRUQnLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdNSVNTSU5HX1VTRVInKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgdXNlciBjYW4gcGVyZm9ybSBmaWxlIG9wZXJhdGlvbnMgKHN1cHBvcnRzIHRlbXBvcmFyeSB0b2tlbnMpXHJcbiAgICAgIGlmICghY2FuUGVyZm9ybUZpbGVPcGVyYXRpb25zKHVzZXIpKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VzZXIgY2Fubm90IHBlcmZvcm0gZmlsZSBvcGVyYXRpb25zJywgeyBcclxuICAgICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsIFxyXG4gICAgICAgICAgaXNUZW1wb3Jhcnk6IHVzZXIuaXNUZW1wb3JhcnksXHJcbiAgICAgICAgICBhdXRoU3RhdGU6IHVzZXIuYXV0aFN0YXRlIFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignRk9SQklEREVOJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnSU5TVUZGSUNJRU5UX1BFUk1JU1NJT05TJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdZb3UgbmVlZCB0byBsb2cgaW4gdG8gYWNjZXNzIHRoaXMgcmVzb3VyY2UnKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgbG9nZ2VyLmluZm8oJ1VzZXIgYXV0aGVudGljYXRlZCBmb3IgdXBsb2FkJywgeyBcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLCBcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICBpc1RlbXBvcmFyeTogdXNlci5pc1RlbXBvcmFyeSxcclxuICAgICAgICBhdXRoU3RhdGU6IHVzZXIuYXV0aFN0YXRlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gUGFyc2UgYW5kIHZhbGlkYXRlIHJlcXVlc3QgYm9keVxyXG4gICAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgICBsb2dnZXIud2FybignVXBsb2FkIHJlcXVlc3QgbWlzc2luZyBib2R5Jyk7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdWQUxJREFUSU9OX0VSUk9SJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnTUlTU0lOR19CT0RZJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgdXBsb2FkUmVxdWVzdDogVXBsb2FkUmVxdWVzdEJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnVXBsb2FkIHJlcXVlc3QgcGFyc2VkJywgeyBcclxuICAgICAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSwgXHJcbiAgICAgICAgZmlsZVNpemU6IHVwbG9hZFJlcXVlc3QuZmlsZVNpemUgXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gVmFsaWRhdGUgaW5wdXQgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZ1xyXG4gICAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAgICgpID0+IHZhbGlkYXRlVXBsb2FkUmVxdWVzdCh1cGxvYWRSZXF1ZXN0KSxcclxuICAgICAgICB7IG1heEF0dGVtcHRzOiAxIH0gLy8gTm8gcmV0cnkgZm9yIHZhbGlkYXRpb25cclxuICAgICAgKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVcGxvYWQgcmVxdWVzdCB2YWxpZGF0aW9uIHBhc3NlZCcpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGZpbGUgdXBsb2FkIHJlcXVlc3RcclxuICAgICAgY29uc3QgZmlsZVVwbG9hZFJlcXVlc3Q6IEZpbGVVcGxvYWRSZXF1ZXN0ID0ge1xyXG4gICAgICAgIGZpbGVOYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplLFxyXG4gICAgICAgIGNvbnRlbnRUeXBlOiB1cGxvYWRSZXF1ZXN0LmNvbnRlbnRUeXBlLFxyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgdXBsb2FkIFVSTCB3aXRoIHJldHJ5XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdHZW5lcmF0aW5nIHByZXNpZ25lZCB1cGxvYWQgVVJMJyk7XHJcbiAgICAgIGNvbnN0IHVwbG9hZFJlc3BvbnNlID0gYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgICAoKSA9PiBmaWxlVXBsb2FkU2VydmljZS5nZW5lcmF0ZVByZXNpZ25lZFVwbG9hZFVybChmaWxlVXBsb2FkUmVxdWVzdCksXHJcbiAgICAgICAgeyBcclxuICAgICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICAgIGluaXRpYWxEZWxheU1zOiA1MDAsXHJcbiAgICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICdTRVJWSUNFX1VOQVZBSUxBQkxFJywgJ0VYVEVSTkFMX1NFUlZJQ0VfRVJST1InXVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuICAgICAgXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdQcmVzaWduZWQgVVJMIGdlbmVyYXRlZCBzdWNjZXNzZnVsbHknLCB7IFxyXG4gICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLCBcclxuICAgICAgICBleHBpcmVzSW46IHVwbG9hZFJlc3BvbnNlLmV4cGlyZXNJbiBcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgRmlsZU1ldGFkYXRhIHJlY29yZCB3aXRoIHJldHJ5XHJcbiAgICAgIGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICAgKCkgPT4gY3JlYXRlRmlsZU1ldGFkYXRhKHVwbG9hZFJlc3BvbnNlLCB1cGxvYWRSZXF1ZXN0LCB1c2VyKSxcclxuICAgICAgICB7IFxyXG4gICAgICAgICAgbWF4QXR0ZW1wdHM6IDMsIFxyXG4gICAgICAgICAgaW5pdGlhbERlbGF5TXM6IDEwMDAsXHJcbiAgICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsnVGhyb3R0bGluZ0V4Y2VwdGlvbicsICdQcm92aXNpb25lZFRocm91Z2hwdXRFeGNlZWRlZEV4Y2VwdGlvbicsICdTZXJ2aWNlVW5hdmFpbGFibGUnXVxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdGaWxlTWV0YWRhdGEgcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gICAgICAvLyBRdWV1ZSBhbmFseXNpcyB3aXRoIHJldHJ5IChub24tY3JpdGljYWwpXHJcbiAgICAgIGF3YWl0IHF1ZXVlQW5hbHlzaXNXaXRoUmV0cnkodXBsb2FkUmVzcG9uc2UsIHVwbG9hZFJlcXVlc3QsIHVzZXIpO1xyXG5cclxuICAgICAgLy8gUmVjb3JkIHN1Y2Nlc3MgbWV0cmljc1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRQZXJmb3JtYW5jZSgnZmlsZS11cGxvYWQnLCBkdXJhdGlvbiwgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCB0cnVlKTtcclxuICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZFVzZXJBY3Rpdml0eSgnZmlsZS11cGxvYWQnLCB1c2VyLnVzZXJJZCwgdXNlci5vcmdhbml6YXRpb25JZCk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZTogVXBsb2FkUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgdXBsb2FkVXJsOiB1cGxvYWRSZXNwb25zZS51cGxvYWRVcmwsXHJcbiAgICAgICAgZG93bmxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLmRvd25sb2FkVXJsLFxyXG4gICAgICAgIGV4cGlyZXNJbjogdXBsb2FkUmVzcG9uc2UuZXhwaXJlc0luLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ0ZpbGUgdXBsb2FkIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7IFxyXG4gICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLCBcclxuICAgICAgICBkdXJhdGlvbiBcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgICAgfTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRQZXJmb3JtYW5jZSgnZmlsZS11cGxvYWQnLCBkdXJhdGlvbiwgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCBmYWxzZSk7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuZXJyb3IoJ0ZpbGUgdXBsb2FkIGZhaWxlZCcsIGVycm9yIGFzIEVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7IC8vIExldCBjZW50cmFsaXplZCBlcnJvciBoYW5kbGVyIG1hbmFnZSB0aGlzXHJcbiAgICB9XHJcbiAgfSxcclxuICAnZmlsZS11cGxvYWQtc2VydmljZSdcclxuKTtcclxuXHJcbmZ1bmN0aW9uIGVycm9yUmVzcG9uc2UoXHJcbiAgc3RhdHVzQ29kZTogbnVtYmVyLFxyXG4gIGNvZGU6IHN0cmluZyxcclxuICBtZXNzYWdlOiBzdHJpbmdcclxuKTogQVBJR2F0ZXdheVByb3h5UmVzdWx0IHtcclxuICByZXR1cm4ge1xyXG4gICAgc3RhdHVzQ29kZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgfSxcclxuICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgZXJyb3I6IHtcclxuICAgICAgICBjb2RlLFxyXG4gICAgICAgIG1lc3NhZ2UsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgcmVxdWVzdElkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHJpbmcoNyksXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgdXBsb2FkIHJlcXVlc3Qgd2l0aCBlbmhhbmNlZCBlcnJvciBtZXNzYWdlc1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gdmFsaWRhdGVVcGxvYWRSZXF1ZXN0KHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgQUxMT1dFRF9FWFRFTlNJT05TID0gWycuYycsICcuY3BwJywgJy5oJywgJy5ocHAnXTtcclxuICBjb25zdCBNQVhfRklMRV9TSVpFID0gMTAgKiAxMDI0ICogMTAyNDsgLy8gMTBNQlxyXG5cclxuICBpZiAoIXVwbG9hZFJlcXVlc3QuZmlsZU5hbWUgfHwgIXVwbG9hZFJlcXVlc3QuZmlsZVNpemUgfHwgIXVwbG9hZFJlcXVlc3QuY29udGVudFR5cGUpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcignZmlsZU5hbWUsIGZpbGVTaXplLCBhbmQgY29udGVudFR5cGUgYXJlIHJlcXVpcmVkJyk7XHJcbiAgfVxyXG5cclxuICAvLyBWYWxpZGF0ZSBmaWxlIGV4dGVuc2lvbiAoUmVxdWlyZW1lbnRzIDEuMSlcclxuICBjb25zdCBleHQgPSB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLnN1YnN0cmluZyh1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XHJcbiAgaWYgKCFBTExPV0VEX0VYVEVOU0lPTlMuaW5jbHVkZXMoZXh0KSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBPbmx5ICR7QUxMT1dFRF9FWFRFTlNJT05TLmpvaW4oJywgJyl9IGZpbGVzIGFyZSBhbGxvd2VkYCk7XHJcbiAgfVxyXG5cclxuICAvLyBWYWxpZGF0ZSBmaWxlIHNpemUgKFJlcXVpcmVtZW50cyAxLjIpXHJcbiAgaWYgKHVwbG9hZFJlcXVlc3QuZmlsZVNpemUgPiBNQVhfRklMRV9TSVpFKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgc2l6ZSBtdXN0IG5vdCBleGNlZWQgMTBNQiAoJHtNQVhfRklMRV9TSVpFfSBieXRlcylgKTtcclxuICB9XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdVcGxvYWQgcmVxdWVzdCB2YWxpZGF0aW9uIHBhc3NlZCcsIHsgXHJcbiAgICBmaWxlVHlwZTogZXh0LCBcclxuICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIFxyXG4gIH0pO1xyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlIGZpbGUgbWV0YWRhdGEgcmVjb3JkIHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZUZpbGVNZXRhZGF0YShcclxuICB1cGxvYWRSZXNwb25zZTogYW55LFxyXG4gIHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5LFxyXG4gIHVzZXI6IGFueVxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBleHQgPSB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLnN1YnN0cmluZyh1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XHJcbiAgY29uc3QgZmlsZVR5cGUgPSAoZXh0ID09PSAnLmMnIHx8IGV4dCA9PT0gJy5oJykgPyAnYycgOiAnY3BwJztcclxuICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcclxuXHJcbiAgbG9nZ2VyLmluZm8oJ0NyZWF0aW5nIEZpbGVNZXRhZGF0YSByZWNvcmQnLCB7XHJcbiAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgIGZpbGVOYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgZmlsZVR5cGUsXHJcbiAgICB1c2VySWQ6IHVzZXIudXNlcklkXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IEZJTEVfTUVUQURBVEFfVEFCTEUsXHJcbiAgICAgIEl0ZW06IG1hcnNoYWxsKHtcclxuICAgICAgICBmaWxlX2lkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgZmlsZW5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgICAgZmlsZV90eXBlOiBmaWxlVHlwZSxcclxuICAgICAgICBmaWxlX3NpemU6IHVwbG9hZFJlcXVlc3QuZmlsZVNpemUsXHJcbiAgICAgICAgdXNlcl9pZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgdXBsb2FkX3RpbWVzdGFtcDogbm93LFxyXG4gICAgICAgIGFuYWx5c2lzX3N0YXR1czogJ3BlbmRpbmcnLFxyXG4gICAgICAgIHMzX2tleTogdXBsb2FkUmVzcG9uc2UuczNLZXksXHJcbiAgICAgICAgY3JlYXRlZF9hdDogbm93LFxyXG4gICAgICAgIHVwZGF0ZWRfYXQ6IG5vdyxcclxuICAgICAgfSksXHJcbiAgICB9KSk7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0ZpbGVNZXRhZGF0YSByZWNvcmQgY3JlYXRlZCBzdWNjZXNzZnVsbHknLCB7IFxyXG4gICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCBcclxuICAgIH0pO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIEZpbGVNZXRhZGF0YSByZWNvcmQnLCBlcnJvciBhcyBFcnJvciwge1xyXG4gICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgdGFibGU6IEZJTEVfTUVUQURBVEFfVEFCTEVcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVuaGFuY2VkIGVycm9yIGhhbmRsaW5nIGZvciBEeW5hbW9EQiBlcnJvcnNcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTmFtZSA9IChlcnJvciBhcyBhbnkpLm5hbWUgfHwgJyc7XHJcbiAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgfHwgJyc7XHJcblxyXG4gICAgICBpZiAoZXJyb3JOYW1lID09PSAnQWNjZXNzRGVuaWVkJyB8fCBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0FjY2Vzc0RlbmllZCcpKSB7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdQRVJNSVNTSU9OX0RFTklFRCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX0FDQ0VTUycpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHNhdmUgZmlsZSBtZXRhZGF0YTogUGVybWlzc2lvbiBkZW5pZWQuIEVuc3VyZSBMYW1iZGEgaGFzIER5bmFtb0RCIHBlcm1pc3Npb25zLmApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZXJyb3JOYW1lID09PSAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1JFU09VUkNFX05PVF9GT1VORCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX1RBQkxFJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2F2ZSBmaWxlIG1ldGFkYXRhOiBUYWJsZSAke0ZJTEVfTUVUQURBVEFfVEFCTEV9IG5vdCBmb3VuZC5gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGVycm9yTmFtZSA9PT0gJ1Rocm90dGxpbmdFeGNlcHRpb24nIHx8IGVycm9yTmFtZSA9PT0gJ1Byb3Zpc2lvbmVkVGhyb3VnaHB1dEV4Y2VlZGVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVEhST1RUTElORycsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX1RIUk9UVExFJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2F2ZSBmaWxlIG1ldGFkYXRhOiBTZXJ2aWNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLiBQbGVhc2UgcmV0cnkuYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChlcnJvck5hbWUgPT09ICdWYWxpZGF0aW9uRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVkFMSURBVElPTl9FUlJPUicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX1ZBTElEQVRJT04nKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgbWV0YWRhdGE6IEludmFsaWQgZGF0YSBmb3JtYXQuYCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBHZW5lcmljIGVycm9yXHJcbiAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ0RBVEFCQVNFX0VSUk9SJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnTUVUQURBVEFfQ1JFQVRJT04nKTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBmaWxlIG1ldGFkYXRhOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFF1ZXVlIGFuYWx5c2lzIHdpdGggcmV0cnkgYW5kIGdyYWNlZnVsIGZhaWx1cmVcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHF1ZXVlQW5hbHlzaXNXaXRoUmV0cnkoXHJcbiAgdXBsb2FkUmVzcG9uc2U6IGFueSxcclxuICB1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSxcclxuICB1c2VyOiBhbnlcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgYW5hbHlzaXNRdWV1ZVVybCA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1FVRVVFX1VSTDtcclxuICBcclxuICBpZiAoIWFuYWx5c2lzUXVldWVVcmwpIHtcclxuICAgIGxvZ2dlci53YXJuKCdBTkFMWVNJU19RVUVVRV9VUkwgbm90IGNvbmZpZ3VyZWQgLSBhbmFseXNpcyB3aWxsIG5vdCBiZSB0cmlnZ2VyZWQgYXV0b21hdGljYWxseScpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGNvbnN0IGxhbmd1YWdlID0gKGV4dCA9PT0gJy5jJyB8fCBleHQgPT09ICcuaCcpID8gJ0MnIDogJ0NQUCc7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1F1ZXVpbmcgYW5hbHlzaXMnLCB7IFxyXG4gICAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsIFxyXG4gICAgICAgICAgbGFuZ3VhZ2UgXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGF3YWl0IHNxc0NsaWVudC5zZW5kKG5ldyBTZW5kTWVzc2FnZUNvbW1hbmQoe1xyXG4gICAgICAgICAgUXVldWVVcmw6IGFuYWx5c2lzUXVldWVVcmwsXHJcbiAgICAgICAgICBNZXNzYWdlQm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgICAgICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgICAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleSxcclxuICAgICAgICAgICAgbGFuZ3VhZ2UsXHJcbiAgICAgICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkIHx8ICdkZWZhdWx0LW9yZycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgIGxvZ2dlci5pbmZvKCdBbmFseXNpcyBxdWV1ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkIFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LFxyXG4gICAgICB7IFxyXG4gICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICBpbml0aWFsRGVsYXlNczogNTAwLFxyXG4gICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnVGhyb3R0bGluZ0V4Y2VwdGlvbiddXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAvLyBMb2cgYnV0IGRvbid0IGZhaWwgdGhlIHVwbG9hZCAtIG1ldGFkYXRhIGlzIGFscmVhZHkgc2F2ZWRcclxuICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gcXVldWUgYW5hbHlzaXMgLSBmaWxlIHVwbG9hZCBzdWNjZWVkZWQgYnV0IGFuYWx5c2lzIG5vdCB0cmlnZ2VyZWQnLCB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1FVRVVFX0ZBSUxFRCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ1NRU19BTkFMWVNJUycpO1xyXG4gICAgXHJcbiAgICAvLyBEb24ndCB0aHJvdyAtIHRoZSB1cGxvYWQgd2FzIHN1Y2Nlc3NmdWwsIGFuYWx5c2lzIGNhbiBiZSB0cmlnZ2VyZWQgbWFudWFsbHlcclxuICB9XHJcbn0iXX0=