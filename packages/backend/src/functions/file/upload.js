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
        // NOTE: Analysis is NOT queued here anymore
        // Frontend will call /files/queue-analysis after S3 upload completes
        // This ensures S3 eventual consistency before Lambda tries to download
        // Record success metrics
        const duration = Date.now() - startTime;
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordPerformance('file-upload', duration, 'file-upload-service', true);
        await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordUserActivity('file-upload', user.userId, user.organizationId);
        const response = {
            fileId: uploadResponse.fileId,
            s3Key: uploadResponse.s3Key,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvRTtBQUNwRSw4REFBMEU7QUFDMUUsMERBQWtEO0FBQ2xELGlGQUErRjtBQUMvRixxREFBcUY7QUFDckYsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRiwyRkFBOEY7QUFDOUYsK0NBQWtEO0FBRWxELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87QUFFL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzNGLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQkFBa0IsQ0FBQztBQUNsRixNQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLEVBQUUsQ0FBQztBQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQWlCbEQ7OztHQUdHO0FBQ1UsUUFBQSxPQUFPLEdBQUcsbURBQXVCLENBQUMsaUJBQWlCLENBQzlELEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1lBQ3pDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixPQUFPLEVBQUUs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RSxjQUFjLENBQUMsTUFBTTtnQkFDN0IsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO2FBQzVCLENBQUMsQ0FBQztRQUNMLENBQUMsRUFDRDtZQUNFLFdBQVcsRUFBRSxDQUFDO1lBQ2QsY0FBYyxFQUFFLEdBQUc7WUFDbkIsZUFBZSxFQUFFLENBQUMsU0FBUyxFQUFFLHFCQUFxQixFQUFFLHFCQUFxQixDQUFDO1NBQzNFLENBQ0YsQ0FBQztJQUVKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsNERBQTREO1FBQzVELE1BQU0sQ0FBQyxJQUFJLENBQUMsNkVBQTZFLEVBQUU7WUFDekYsTUFBTSxFQUFFLGNBQWMsQ0FBQyxNQUFNO1lBQzdCLEtBQUssRUFBRyxLQUFlLENBQUMsT0FBTztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLG1EQUEyQixDQUFDLFdBQVcsQ0FBQyxjQUFjLEVBQUUscUJBQXFCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFckcsOEVBQThFO0lBQ2hGLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBTUVNDbGllbnQsIFNlbmRNZXNzYWdlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zcXMnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBGaWxlVXBsb2FkU2VydmljZSwgRmlsZVVwbG9hZFJlcXVlc3QgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlL2ZpbGUtdXBsb2FkLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQsIGNhblBlcmZvcm1GaWxlT3BlcmF0aW9ucyB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcbmltcG9ydCB7IGNlbnRyYWxpemVkRXJyb3JIYW5kbGVyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZXJyb3ItaGFuZGxpbmcvY2VudHJhbGl6ZWQtZXJyb3ItaGFuZGxlcic7XHJcbmltcG9ydCB7IGVuaGFuY2VkUmV0cnlTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZXJyb3ItaGFuZGxpbmcvZW5oYW5jZWQtcmV0cnknO1xyXG5pbXBvcnQgeyBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9tb25pdG9yaW5nL2Nsb3Vkd2F0Y2gtbW9uaXRvcmluZyc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG5jb25zdCBBTExPV0VEX0VYVEVOU0lPTlMgPSBbJy5jJywgJy5jcHAnLCAnLmgnLCAnLmhwcCddO1xyXG5jb25zdCBNQVhfRklMRV9TSVpFID0gMTAgKiAxMDI0ICogMTAyNDsgLy8gMTBNQlxyXG5cclxuY29uc3Qgc3FzQ2xpZW50ID0gbmV3IFNRU0NsaWVudCh7fSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuY29uc3QgRklMRV9NRVRBREFUQV9UQUJMRSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YS1kZXYnO1xyXG5jb25zdCBmaWxlVXBsb2FkU2VydmljZSA9IG5ldyBGaWxlVXBsb2FkU2VydmljZSgpO1xyXG5jb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0ZpbGVVcGxvYWRGdW5jdGlvbicpO1xyXG5cclxuLy8gTG9jYWwgdHlwZSBkZWZpbml0aW9uc1xyXG5pbnRlcmZhY2UgVXBsb2FkUmVxdWVzdEJvZHkge1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgZmlsZVNpemU6IG51bWJlcjtcclxuICBjb250ZW50VHlwZTogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgVXBsb2FkUmVzcG9uc2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIHMzS2V5OiBzdHJpbmc7XHJcbiAgdXBsb2FkVXJsOiBzdHJpbmc7XHJcbiAgZG93bmxvYWRVcmw6IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEVuaGFuY2VkIGZpbGUgdXBsb2FkIGhhbmRsZXIgd2l0aCBjb21wcmVoZW5zaXZlIGVycm9yIGhhbmRsaW5nXHJcbiAqIFJlcXVpcmVtZW50czogMS4xLCAxLjIsIDYuMSwgOC4xLCA4LjJcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gY2VudHJhbGl6ZWRFcnJvckhhbmRsZXIud3JhcExhbWJkYUhhbmRsZXIoXHJcbiAgYXN5bmMgKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnRmlsZSB1cGxvYWQgcmVxdWVzdCBzdGFydGVkJywgeyBcclxuICAgICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICAgIGhhc0JvZHk6ICEhZXZlbnQuYm9keSxcclxuICAgICAgICBidWNrZXROYW1lOiBwcm9jZXNzLmVudi5GSUxFX1NUT1JBR0VfQlVDS0VUX05BTUUsXHJcbiAgICAgICAgZmlsZU1ldGFkYXRhVGFibGU6IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEVcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IG9yIEpXVCB0b2tlblxyXG4gICAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1VzZXIgZXh0cmFjdGlvbiByZXN1bHQnLCB7IHVzZXJJZDogdXNlci51c2VySWQsIGVtYWlsOiB1c2VyLmVtYWlsIH0pO1xyXG4gICAgICBcclxuICAgICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdVbmF1dGhvcml6ZWQgdXBsb2FkIGF0dGVtcHQnKTtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1VOQVVUSE9SSVpFRCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ01JU1NJTkdfVVNFUicpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBpZiB1c2VyIGNhbiBwZXJmb3JtIGZpbGUgb3BlcmF0aW9ucyAoc3VwcG9ydHMgdGVtcG9yYXJ5IHRva2VucylcclxuICAgICAgaWYgKCFjYW5QZXJmb3JtRmlsZU9wZXJhdGlvbnModXNlcikpIHtcclxuICAgICAgICBsb2dnZXIud2FybignVXNlciBjYW5ub3QgcGVyZm9ybSBmaWxlIG9wZXJhdGlvbnMnLCB7IFxyXG4gICAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCwgXHJcbiAgICAgICAgICBpc1RlbXBvcmFyeTogdXNlci5pc1RlbXBvcmFyeSxcclxuICAgICAgICAgIGF1dGhTdGF0ZTogdXNlci5hdXRoU3RhdGUgXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdGT1JCSURERU4nLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdJTlNVRkZJQ0lFTlRfUEVSTUlTU0lPTlMnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBuZWVkIHRvIGxvZyBpbiB0byBhY2Nlc3MgdGhpcyByZXNvdXJjZScpO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuaW5mbygnVXNlciBhdXRoZW50aWNhdGVkIGZvciB1cGxvYWQnLCB7IFxyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsIFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkOiB1c2VyLm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgIGlzVGVtcG9yYXJ5OiB1c2VyLmlzVGVtcG9yYXJ5LFxyXG4gICAgICAgIGF1dGhTdGF0ZTogdXNlci5hdXRoU3RhdGVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBQYXJzZSBhbmQgdmFsaWRhdGUgcmVxdWVzdCBib2R5XHJcbiAgICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdVcGxvYWQgcmVxdWVzdCBtaXNzaW5nIGJvZHknKTtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1ZBTElEQVRJT05fRVJST1InLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdNSVNTSU5HX0JPRFknKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCB1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVcGxvYWQgcmVxdWVzdCBwYXJzZWQnLCB7IFxyXG4gICAgICAgIGZpbGVOYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLCBcclxuICAgICAgICBmaWxlU2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSBcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBWYWxpZGF0ZSBpbnB1dCB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXHJcbiAgICAgIGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICAgKCkgPT4gdmFsaWRhdGVVcGxvYWRSZXF1ZXN0KHVwbG9hZFJlcXVlc3QpLFxyXG4gICAgICAgIHsgbWF4QXR0ZW1wdHM6IDEgfSAvLyBObyByZXRyeSBmb3IgdmFsaWRhdGlvblxyXG4gICAgICApO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ1VwbG9hZCByZXF1ZXN0IHZhbGlkYXRpb24gcGFzc2VkJyk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgZmlsZSB1cGxvYWQgcmVxdWVzdFxyXG4gICAgICBjb25zdCBmaWxlVXBsb2FkUmVxdWVzdDogRmlsZVVwbG9hZFJlcXVlc3QgPSB7XHJcbiAgICAgICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgICAgZmlsZVNpemU6IHVwbG9hZFJlcXVlc3QuZmlsZVNpemUsXHJcbiAgICAgICAgY29udGVudFR5cGU6IHVwbG9hZFJlcXVlc3QuY29udGVudFR5cGUsXHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIHByZXNpZ25lZCB1cGxvYWQgVVJMIHdpdGggcmV0cnlcclxuICAgICAgbG9nZ2VyLmluZm8oJ0dlbmVyYXRpbmcgcHJlc2lnbmVkIHVwbG9hZCBVUkwnKTtcclxuICAgICAgY29uc3QgdXBsb2FkUmVzcG9uc2UgPSBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAgICgpID0+IGZpbGVVcGxvYWRTZXJ2aWNlLmdlbmVyYXRlUHJlc2lnbmVkVXBsb2FkVXJsKGZpbGVVcGxvYWRSZXF1ZXN0KSxcclxuICAgICAgICB7IFxyXG4gICAgICAgICAgbWF4QXR0ZW1wdHM6IDMsIFxyXG4gICAgICAgICAgaW5pdGlhbERlbGF5TXM6IDUwMCxcclxuICAgICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnRVhURVJOQUxfU0VSVklDRV9FUlJPUiddXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG4gICAgICBcclxuICAgICAgbG9nZ2VyLmluZm8oJ1ByZXNpZ25lZCBVUkwgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsIFxyXG4gICAgICAgIGV4cGlyZXNJbjogdXBsb2FkUmVzcG9uc2UuZXhwaXJlc0luIFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBGaWxlTWV0YWRhdGEgcmVjb3JkIHdpdGggcmV0cnlcclxuICAgICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgICAoKSA9PiBjcmVhdGVGaWxlTWV0YWRhdGEodXBsb2FkUmVzcG9uc2UsIHVwbG9hZFJlcXVlc3QsIHVzZXIpLFxyXG4gICAgICAgIHsgXHJcbiAgICAgICAgICBtYXhBdHRlbXB0czogMywgXHJcbiAgICAgICAgICBpbml0aWFsRGVsYXlNczogMTAwMCxcclxuICAgICAgICAgIHJldHJ5YWJsZUVycm9yczogWydUaHJvdHRsaW5nRXhjZXB0aW9uJywgJ1Byb3Zpc2lvbmVkVGhyb3VnaHB1dEV4Y2VlZGVkRXhjZXB0aW9uJywgJ1NlcnZpY2VVbmF2YWlsYWJsZSddXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG5cclxuICAgICAgbG9nZ2VyLmluZm8oJ0ZpbGVNZXRhZGF0YSByZWNvcmQgY3JlYXRlZCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAgIC8vIE5PVEU6IEFuYWx5c2lzIGlzIE5PVCBxdWV1ZWQgaGVyZSBhbnltb3JlXHJcbiAgICAgIC8vIEZyb250ZW5kIHdpbGwgY2FsbCAvZmlsZXMvcXVldWUtYW5hbHlzaXMgYWZ0ZXIgUzMgdXBsb2FkIGNvbXBsZXRlc1xyXG4gICAgICAvLyBUaGlzIGVuc3VyZXMgUzMgZXZlbnR1YWwgY29uc2lzdGVuY3kgYmVmb3JlIExhbWJkYSB0cmllcyB0byBkb3dubG9hZFxyXG5cclxuICAgICAgLy8gUmVjb3JkIHN1Y2Nlc3MgbWV0cmljc1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRQZXJmb3JtYW5jZSgnZmlsZS11cGxvYWQnLCBkdXJhdGlvbiwgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCB0cnVlKTtcclxuICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZFVzZXJBY3Rpdml0eSgnZmlsZS11cGxvYWQnLCB1c2VyLnVzZXJJZCwgdXNlci5vcmdhbml6YXRpb25JZCk7XHJcblxyXG4gICAgICBjb25zdCByZXNwb25zZTogVXBsb2FkUmVzcG9uc2UgPSB7XHJcbiAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgczNLZXk6IHVwbG9hZFJlc3BvbnNlLnMzS2V5LFxyXG4gICAgICAgIHVwbG9hZFVybDogdXBsb2FkUmVzcG9uc2UudXBsb2FkVXJsLFxyXG4gICAgICAgIGRvd25sb2FkVXJsOiB1cGxvYWRSZXNwb25zZS5kb3dubG9hZFVybCxcclxuICAgICAgICBleHBpcmVzSW46IHVwbG9hZFJlc3BvbnNlLmV4cGlyZXNJbixcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdGaWxlIHVwbG9hZCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgZHVyYXRpb24gXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2UoJ2ZpbGUtdXBsb2FkJywgZHVyYXRpb24sICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgZmFsc2UpO1xyXG4gICAgICBcclxuICAgICAgbG9nZ2VyLmVycm9yKCdGaWxlIHVwbG9hZCBmYWlsZWQnLCBlcnJvciBhcyBFcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yOyAvLyBMZXQgY2VudHJhbGl6ZWQgZXJyb3IgaGFuZGxlciBtYW5hZ2UgdGhpc1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnXHJcbik7XHJcblxyXG5mdW5jdGlvbiBlcnJvclJlc3BvbnNlKFxyXG4gIHN0YXR1c0NvZGU6IG51bWJlcixcclxuICBjb2RlOiBzdHJpbmcsXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbik6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCB7XHJcbiAgcmV0dXJuIHtcclxuICAgIHN0YXR1c0NvZGUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJyxcclxuICAgIH0sXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgY29kZSxcclxuICAgICAgICBtZXNzYWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHJlcXVlc3RJZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDcpLFxyXG4gICAgICB9LFxyXG4gICAgfSksXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIHVwbG9hZCByZXF1ZXN0IHdpdGggZW5oYW5jZWQgZXJyb3IgbWVzc2FnZXNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHZhbGlkYXRlVXBsb2FkUmVxdWVzdCh1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSk6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IEFMTE9XRURfRVhURU5TSU9OUyA9IFsnLmMnLCAnLmNwcCcsICcuaCcsICcuaHBwJ107XHJcbiAgY29uc3QgTUFYX0ZJTEVfU0laRSA9IDEwICogMTAyNCAqIDEwMjQ7IC8vIDEwTUJcclxuXHJcbiAgaWYgKCF1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lIHx8ICF1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIHx8ICF1cGxvYWRSZXF1ZXN0LmNvbnRlbnRUeXBlKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2ZpbGVOYW1lLCBmaWxlU2l6ZSwgYW5kIGNvbnRlbnRUeXBlIGFyZSByZXF1aXJlZCcpO1xyXG4gIH1cclxuXHJcbiAgLy8gVmFsaWRhdGUgZmlsZSBleHRlbnNpb24gKFJlcXVpcmVtZW50cyAxLjEpXHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGlmICghQUxMT1dFRF9FWFRFTlNJT05TLmluY2x1ZGVzKGV4dCkpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgT25seSAke0FMTE9XRURfRVhURU5TSU9OUy5qb2luKCcsICcpfSBmaWxlcyBhcmUgYWxsb3dlZGApO1xyXG4gIH1cclxuXHJcbiAgLy8gVmFsaWRhdGUgZmlsZSBzaXplIChSZXF1aXJlbWVudHMgMS4yKVxyXG4gIGlmICh1cGxvYWRSZXF1ZXN0LmZpbGVTaXplID4gTUFYX0ZJTEVfU0laRSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHNpemUgbXVzdCBub3QgZXhjZWVkIDEwTUIgKCR7TUFYX0ZJTEVfU0laRX0gYnl0ZXMpYCk7XHJcbiAgfVxyXG5cclxuICBsb2dnZXIuaW5mbygnVXBsb2FkIHJlcXVlc3QgdmFsaWRhdGlvbiBwYXNzZWQnLCB7IFxyXG4gICAgZmlsZVR5cGU6IGV4dCwgXHJcbiAgICBmaWxlU2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSBcclxuICB9KTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBmaWxlIG1ldGFkYXRhIHJlY29yZCB3aXRoIGVuaGFuY2VkIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVGaWxlTWV0YWRhdGEoXHJcbiAgdXBsb2FkUmVzcG9uc2U6IGFueSxcclxuICB1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSxcclxuICB1c2VyOiBhbnlcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGNvbnN0IGZpbGVUeXBlID0gKGV4dCA9PT0gJy5jJyB8fCBleHQgPT09ICcuaCcpID8gJ2MnIDogJ2NwcCc7XHJcbiAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdDcmVhdGluZyBGaWxlTWV0YWRhdGEgcmVjb3JkJywge1xyXG4gICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgIGZpbGVUeXBlLFxyXG4gICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQobmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBGSUxFX01FVEFEQVRBX1RBQkxFLFxyXG4gICAgICBJdGVtOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICBmaWxlbmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICBmaWxlVHlwZTogZmlsZVR5cGUsXHJcbiAgICAgICAgZmlsZVNpemU6IHVwbG9hZFJlcXVlc3QuZmlsZVNpemUsXHJcbiAgICAgICAgdXBsb2FkVGltZXN0YW1wOiBub3csXHJcbiAgICAgICAgYW5hbHlzaXNTdGF0dXM6ICdwZW5kaW5nJyxcclxuICAgICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXksXHJcbiAgICAgICAgY3JlYXRlZEF0OiBub3csXHJcbiAgICAgICAgdXBkYXRlZEF0OiBub3csXHJcbiAgICAgIH0pLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdGaWxlTWV0YWRhdGEgcmVjb3JkIGNyZWF0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBjcmVhdGUgRmlsZU1ldGFkYXRhIHJlY29yZCcsIGVycm9yIGFzIEVycm9yLCB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICB0YWJsZTogRklMRV9NRVRBREFUQV9UQUJMRVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRW5oYW5jZWQgZXJyb3IgaGFuZGxpbmcgZm9yIER5bmFtb0RCIGVycm9yc1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgY29uc3QgZXJyb3JOYW1lID0gKGVycm9yIGFzIGFueSkubmFtZSB8fCAnJztcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IubWVzc2FnZSB8fCAnJztcclxuXHJcbiAgICAgIGlmIChlcnJvck5hbWUgPT09ICdBY2Nlc3NEZW5pZWQnIHx8IGVycm9yTWVzc2FnZS5pbmNsdWRlcygnQWNjZXNzRGVuaWVkJykpIHtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1BFUk1JU1NJT05fREVOSUVEJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfQUNDRVNTJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2F2ZSBmaWxlIG1ldGFkYXRhOiBQZXJtaXNzaW9uIGRlbmllZC4gRW5zdXJlIExhbWJkYSBoYXMgRHluYW1vREIgcGVybWlzc2lvbnMuYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChlcnJvck5hbWUgPT09ICdSZXNvdXJjZU5vdEZvdW5kRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignUkVTT1VSQ0VfTk9UX0ZPVU5EJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfVEFCTEUnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgbWV0YWRhdGE6IFRhYmxlICR7RklMRV9NRVRBREFUQV9UQUJMRX0gbm90IGZvdW5kLmApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZXJyb3JOYW1lID09PSAnVGhyb3R0bGluZ0V4Y2VwdGlvbicgfHwgZXJyb3JOYW1lID09PSAnUHJvdmlzaW9uZWRUaHJvdWdocHV0RXhjZWVkZWRFeGNlcHRpb24nKSB7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdUSFJPVFRMSU5HJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfVEhST1RUTEUnKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgbWV0YWRhdGE6IFNlcnZpY2UgdGVtcG9yYXJpbHkgdW5hdmFpbGFibGUuIFBsZWFzZSByZXRyeS5gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGVycm9yTmFtZSA9PT0gJ1ZhbGlkYXRpb25FeGNlcHRpb24nKSB7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdWQUxJREFUSU9OX0VSUk9SJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnRFlOQU1PREJfVkFMSURBVElPTicpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHNhdmUgZmlsZSBtZXRhZGF0YTogSW52YWxpZCBkYXRhIGZvcm1hdC5gKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyaWMgZXJyb3JcclxuICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignREFUQUJBU0VfRVJST1InLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdNRVRBREFUQV9DUkVBVElPTicpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gY3JlYXRlIGZpbGUgbWV0YWRhdGE6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUXVldWUgYW5hbHlzaXMgd2l0aCByZXRyeSBhbmQgZ3JhY2VmdWwgZmFpbHVyZVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gcXVldWVBbmFseXNpc1dpdGhSZXRyeShcclxuICB1cGxvYWRSZXNwb25zZTogYW55LFxyXG4gIHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5LFxyXG4gIHVzZXI6IGFueVxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBhbmFseXNpc1F1ZXVlVXJsID0gcHJvY2Vzcy5lbnYuQU5BTFlTSVNfUVVFVUVfVVJMO1xyXG4gIFxyXG4gIGlmICghYW5hbHlzaXNRdWV1ZVVybCkge1xyXG4gICAgbG9nZ2VyLndhcm4oJ0FOQUxZU0lTX1FVRVVFX1VSTCBub3QgY29uZmlndXJlZCAtIGFuYWx5c2lzIHdpbGwgbm90IGJlIHRyaWdnZXJlZCBhdXRvbWF0aWNhbGx5Jyk7XHJcbiAgICByZXR1cm47XHJcbiAgfVxyXG5cclxuICBjb25zdCBleHQgPSB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLnN1YnN0cmluZyh1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XHJcbiAgY29uc3QgbGFuZ3VhZ2UgPSAoZXh0ID09PSAnLmMnIHx8IGV4dCA9PT0gJy5oJykgPyAnQycgOiAnQ1BQJztcclxuXHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgIGFzeW5jICgpID0+IHtcclxuICAgICAgICBsb2dnZXIuaW5mbygnUXVldWluZyBhbmFseXNpcycsIHsgXHJcbiAgICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBhd2FpdCBzcXNDbGllbnQuc2VuZChuZXcgU2VuZE1lc3NhZ2VDb21tYW5kKHtcclxuICAgICAgICAgIFF1ZXVlVXJsOiBhbmFseXNpc1F1ZXVlVXJsLFxyXG4gICAgICAgICAgTWVzc2FnZUJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgICAgIGZpbGVOYW1lOiB1cGxvYWRSZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXksXHJcbiAgICAgICAgICAgIGxhbmd1YWdlLFxyXG4gICAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICAgICAgICBvcmdhbml6YXRpb25JZDogdXNlci5vcmdhbml6YXRpb25JZCB8fCAnZGVmYXVsdC1vcmcnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICBsb2dnZXIuaW5mbygnQW5hbHlzaXMgcXVldWVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9LFxyXG4gICAgICB7IFxyXG4gICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICBpbml0aWFsRGVsYXlNczogNTAwLFxyXG4gICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ1NFUlZJQ0VfVU5BVkFJTEFCTEUnLCAnVGhyb3R0bGluZ0V4Y2VwdGlvbiddXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAvLyBMb2cgYnV0IGRvbid0IGZhaWwgdGhlIHVwbG9hZCAtIG1ldGFkYXRhIGlzIGFscmVhZHkgc2F2ZWRcclxuICAgIGxvZ2dlci53YXJuKCdGYWlsZWQgdG8gcXVldWUgYW5hbHlzaXMgLSBmaWxlIHVwbG9hZCBzdWNjZWVkZWQgYnV0IGFuYWx5c2lzIG5vdCB0cmlnZ2VyZWQnLCB7XHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1FVRVVFX0ZBSUxFRCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ1NRU19BTkFMWVNJUycpO1xyXG4gICAgXHJcbiAgICAvLyBEb24ndCB0aHJvdyAtIHRoZSB1cGxvYWQgd2FzIHN1Y2Nlc3NmdWwsIGFuYWx5c2lzIGNhbiBiZSB0cmlnZ2VyZWQgbWFudWFsbHlcclxuICB9XHJcbn0iXX0=