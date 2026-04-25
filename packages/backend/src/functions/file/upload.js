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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLG9EQUFvRTtBQUNwRSw4REFBMEU7QUFDMUUsMERBQWtEO0FBQ2xELGlGQUErRjtBQUMvRixxREFBcUY7QUFDckYsdUdBQWtHO0FBQ2xHLGlGQUFvRjtBQUNwRiwyRkFBOEY7QUFDOUYsK0NBQWtEO0FBRWxELE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztBQUN4RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87QUFFL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxzQkFBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3BDLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO0FBQzNGLE1BQU0sbUJBQW1CLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQkFBa0IsQ0FBQztBQUNsRixNQUFNLGlCQUFpQixHQUFHLElBQUksdUNBQWlCLEVBQUUsQ0FBQztBQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztBQWlCbEQ7OztHQUdHO0FBQ1UsUUFBQSxPQUFPLEdBQUcsbURBQXVCLENBQUMsaUJBQWlCLENBQzlELEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLENBQUM7UUFDSCxNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1lBQ3pDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNoQixPQUFPLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJO1lBQ3JCLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QjtZQUNoRCxpQkFBaUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtTQUNuRCxDQUFDLENBQUM7UUFFSCwyREFBMkQ7UUFDM0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFbEYsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixNQUFNLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDM0MsTUFBTSxtREFBMkIsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1lBQ3JHLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsd0VBQXdFO1FBQ3hFLElBQUksQ0FBQyxJQUFBLG9DQUF3QixFQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDcEMsTUFBTSxDQUFDLElBQUksQ0FBQyxxQ0FBcUMsRUFBRTtnQkFDakQsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUNuQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7Z0JBQzdCLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUzthQUMxQixDQUFDLENBQUM7WUFDSCxNQUFNLG1EQUEyQixDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztZQUM5RyxNQUFNLElBQUksS0FBSyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7UUFDaEUsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUU7WUFDM0MsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztZQUNuQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1NBQzFCLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsNkJBQTZCLENBQUMsQ0FBQztZQUMzQyxNQUFNLG1EQUEyQixDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUN6RyxNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFzQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFO1lBQ25DLFFBQVEsRUFBRSxhQUFhLENBQUMsUUFBUTtZQUNoQyxRQUFRLEVBQUUsYUFBYSxDQUFDLFFBQVE7U0FDakMsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLE1BQU0scUNBQW9CLENBQUMsZ0JBQWdCLENBQ3pDLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxFQUMxQyxFQUFFLFdBQVcsRUFBRSxDQUFDLEVBQUUsQ0FBQywwQkFBMEI7U0FDOUMsQ0FBQztRQUVGLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0NBQWtDLENBQUMsQ0FBQztRQUVoRCw2QkFBNkI7UUFDN0IsTUFBTSxpQkFBaUIsR0FBc0I7WUFDM0MsUUFBUSxFQUFFLGFBQWEsQ0FBQyxRQUFRO1lBQ2hDLFFBQVEsRUFBRSxhQUFhLENBQUMsUUFBUTtZQUNoQyxXQUFXLEVBQUUsYUFBYSxDQUFDLFdBQVc7WUFDdEMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQ3BCLENBQUM7UUFFRiwyQ0FBMkM7UUFDM0MsTUFBTSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sY0FBYyxHQUFHLE1BQU0scUNBQW9CLENBQUMsZ0JBQWdCLENBQ2hFLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLEVBQ3JFO1lBQ0UsV0FBVyxFQUFFLENBQUM7WUFDZCxjQUFjLEVBQUUsR0FBRztZQUNuQixlQUFlLEVBQUUsQ0FBQyxTQUFTLEVBQUUscUJBQXFCLEVBQUUsd0JBQXdCLENBQUM7U0FDOUUsQ0FDRixDQUFDO1FBRUYsTUFBTSxDQUFDLElBQUksQ0FBQyxzQ0FBc0MsRUFBRTtZQUNsRCxNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU07WUFDN0IsU0FBUyxFQUFFLGNBQWMsQ0FBQyxTQUFTO1NBQ3BDLENBQUMsQ0FBQztRQUVILHdDQUF3QztRQUN4QyxNQUFNLHFDQUFvQixDQUFDLGdCQUFnQixDQUN6QyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxFQUM3RDtZQUNFLFdBQVcsRUFBRSxDQUFDO1lBQ2QsY0FBYyxFQUFFLElBQUk7WUFDcEIsZUFBZSxFQUFFLENBQUMscUJBQXFCLEVBQUUsd0NBQXdDLEVBQUUsb0JBQW9CLENBQUM7U0FDekcsQ0FDRixDQUFDO1FBRUYsTUFBTSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO1FBRXhELDJDQUEyQztRQUMzQyxNQUFNLHNCQUFzQixDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFbEUseUJBQXlCO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFDeEMsTUFBTSxtREFBMkIsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLHFCQUFxQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFHLE1BQU0sbURBQTJCLENBQUMsa0JBQWtCLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBRXRHLE1BQU0sUUFBUSxHQUFtQjtZQUMvQixNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU07WUFDN0IsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO1lBQzNCLFNBQVMsRUFBRSxjQUFjLENBQUMsU0FBUztZQUNuQyxXQUFXLEVBQUUsY0FBYyxDQUFDLFdBQVc7WUFDdkMsU0FBUyxFQUFFLGNBQWMsQ0FBQyxTQUFTO1NBQ3BDLENBQUM7UUFFRixNQUFNLENBQUMsSUFBSSxDQUFDLG9DQUFvQyxFQUFFO1lBQ2hELE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTTtZQUM3QixRQUFRO1NBQ1QsQ0FBQyxDQUFDO1FBRUgsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7Z0JBQ2xDLDhCQUE4QixFQUFFLDRCQUE0QjthQUM3RDtZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDO0lBRUosQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDO1FBQ3hDLE1BQU0sbURBQTJCLENBQUMsaUJBQWlCLENBQUMsYUFBYSxFQUFFLFFBQVEsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUzRyxNQUFNLENBQUMsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEtBQWMsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sS0FBSyxDQUFDLENBQUMsNENBQTRDO0lBQzNELENBQUM7QUFDSCxDQUFDLEVBQ0QscUJBQXFCLENBQ3RCLENBQUM7QUFFRixTQUFTLGFBQWEsQ0FDcEIsVUFBa0IsRUFDbEIsSUFBWSxFQUNaLE9BQWU7SUFFZixPQUFPO1FBQ0wsVUFBVTtRQUNWLE9BQU8sRUFBRTtZQUNQLGNBQWMsRUFBRSxrQkFBa0I7WUFDbEMsNkJBQTZCLEVBQUUsR0FBRztZQUNsQyw4QkFBOEIsRUFBRSw0QkFBNEI7U0FDN0Q7UUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNuQixLQUFLLEVBQUU7Z0JBQ0wsSUFBSTtnQkFDSixPQUFPO2dCQUNQLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtnQkFDbkMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQzthQUNuRDtTQUNGLENBQUM7S0FDSCxDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsS0FBSyxVQUFVLHFCQUFxQixDQUFDLGFBQWdDO0lBQ25FLE1BQU0sa0JBQWtCLEdBQUcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN4RCxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87SUFFL0MsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JGLE1BQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRUQsNkNBQTZDO0lBQzdDLE1BQU0sR0FBRyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDcEcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3RDLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDN0UsQ0FBQztJQUVELHdDQUF3QztJQUN4QyxJQUFJLGFBQWEsQ0FBQyxRQUFRLEdBQUcsYUFBYSxFQUFFLENBQUM7UUFDM0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsYUFBYSxTQUFTLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRTtRQUM5QyxRQUFRLEVBQUUsR0FBRztRQUNiLFFBQVEsRUFBRSxhQUFhLENBQUMsUUFBUTtLQUNqQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsa0JBQWtCLENBQy9CLGNBQW1CLEVBQ25CLGFBQWdDLEVBQ2hDLElBQVM7SUFFVCxNQUFNLEdBQUcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQ3BHLE1BQU0sUUFBUSxHQUFHLENBQUMsR0FBRyxLQUFLLElBQUksSUFBSSxHQUFHLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0lBQzlELE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBRTFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLEVBQUU7UUFDMUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxNQUFNO1FBQzdCLFFBQVEsRUFBRSxhQUFhLENBQUMsUUFBUTtRQUNoQyxRQUFRO1FBQ1IsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1FBQ25CLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSztLQUM1QixDQUFDLENBQUM7SUFFSCxJQUFJLENBQUM7UUFDSCxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsSUFBSSxnQ0FBYyxDQUFDO1lBQ3pDLFNBQVMsRUFBRSxtQkFBbUI7WUFDOUIsSUFBSSxFQUFFLElBQUEsd0JBQVEsRUFBQztnQkFDYixNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU07Z0JBQzdCLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtnQkFDbkIsUUFBUSxFQUFFLGFBQWEsQ0FBQyxRQUFRO2dCQUNoQyxRQUFRLEVBQUUsUUFBUTtnQkFDbEIsUUFBUSxFQUFFLGFBQWEsQ0FBQyxRQUFRO2dCQUNoQyxlQUFlLEVBQUUsR0FBRztnQkFDcEIsY0FBYyxFQUFFLFNBQVM7Z0JBQ3pCLEtBQUssRUFBRSxjQUFjLENBQUMsS0FBSztnQkFDM0IsU0FBUyxFQUFFLEdBQUc7Z0JBQ2QsU0FBUyxFQUFFLEdBQUc7YUFDZixDQUFDO1NBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSixNQUFNLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxFQUFFO1lBQ3RELE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTTtZQUM3QixLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7U0FDNUIsQ0FBQyxDQUFDO0lBRUwsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixNQUFNLENBQUMsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEtBQWMsRUFBRTtZQUNuRSxNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU07WUFDN0IsS0FBSyxFQUFFLG1CQUFtQjtTQUMzQixDQUFDLENBQUM7UUFFSCw4Q0FBOEM7UUFDOUMsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFLENBQUM7WUFDM0IsTUFBTSxTQUFTLEdBQUksS0FBYSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDNUMsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFFekMsSUFBSSxTQUFTLEtBQUssY0FBYyxJQUFJLFlBQVksQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztnQkFDMUUsTUFBTSxtREFBMkIsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztnQkFDN0csTUFBTSxJQUFJLEtBQUssQ0FBQywwRkFBMEYsQ0FBQyxDQUFDO1lBQzlHLENBQUM7WUFFRCxJQUFJLFNBQVMsS0FBSywyQkFBMkIsRUFBRSxDQUFDO2dCQUM5QyxNQUFNLG1EQUEyQixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO2dCQUM3RyxNQUFNLElBQUksS0FBSyxDQUFDLHVDQUF1QyxtQkFBbUIsYUFBYSxDQUFDLENBQUM7WUFDM0YsQ0FBQztZQUVELElBQUksU0FBUyxLQUFLLHFCQUFxQixJQUFJLFNBQVMsS0FBSyx3Q0FBd0MsRUFBRSxDQUFDO2dCQUNsRyxNQUFNLG1EQUEyQixDQUFDLFdBQVcsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztnQkFDeEcsTUFBTSxJQUFJLEtBQUssQ0FBQyw4RUFBOEUsQ0FBQyxDQUFDO1lBQ2xHLENBQUM7WUFFRCxJQUFJLFNBQVMsS0FBSyxxQkFBcUIsRUFBRSxDQUFDO2dCQUN4QyxNQUFNLG1EQUEyQixDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO2dCQUNoSCxNQUFNLElBQUksS0FBSyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7WUFDeEUsQ0FBQztRQUNILENBQUM7UUFFRCxnQkFBZ0I7UUFDaEIsTUFBTSxtREFBMkIsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUM1RyxNQUFNLElBQUksS0FBSyxDQUFDLG1DQUFtQyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO0lBQ2pILENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsc0JBQXNCLENBQ25DLGNBQW1CLEVBQ25CLGFBQWdDLEVBQ2hDLElBQVM7SUFFVCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUM7SUFFeEQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxrRkFBa0YsQ0FBQyxDQUFDO1FBQ2hHLE9BQU87SUFDVCxDQUFDO0lBRUQsTUFBTSxHQUFHLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNwRyxNQUFNLFFBQVEsR0FBRyxDQUFDLEdBQUcsS0FBSyxJQUFJLElBQUksR0FBRyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUU5RCxJQUFJLENBQUM7UUFDSCxNQUFNLHFDQUFvQixDQUFDLGdCQUFnQixDQUN6QyxLQUFLLElBQUksRUFBRTtZQUNULE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUU7Z0JBQzlCLE1BQU0sRUFBRSxjQUFjLENBQUMsTUFBTTtnQkFDN0IsUUFBUTtnQkFDUixLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7YUFDNUIsQ0FBQyxDQUFDO1lBRUgsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksK0JBQWtCLENBQUM7Z0JBQzFDLFFBQVEsRUFBRSxnQkFBZ0I7Z0JBQzFCLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUMxQixNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU07b0JBQzdCLFFBQVEsRUFBRSxhQUFhLENBQUMsUUFBUTtvQkFDaEMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxLQUFLO29CQUMzQixRQUFRO29CQUNSLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtvQkFDbkIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjLElBQUksYUFBYTtpQkFDckQsQ0FBQzthQUNILENBQUMsQ0FBQyxDQUFDO1lBRUosTUFBTSxDQUFDLElBQUksQ0FBQyw4QkFBOEIsRUFBRTtnQkFDMUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxNQUFNO2dCQUM3QixLQUFLLEVBQUUsY0FBYyxDQUFDLEtBQUs7YUFDNUIsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxFQUNEO1lBQ0UsV0FBVyxFQUFFLENBQUM7WUFDZCxjQUFjLEVBQUUsR0FBRztZQUNuQixlQUFlLEVBQUUsQ0FBQyxTQUFTLEVBQUUscUJBQXFCLEVBQUUscUJBQXFCLENBQUM7U0FDM0UsQ0FDRixDQUFDO0lBRUosQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZiw0REFBNEQ7UUFDNUQsTUFBTSxDQUFDLElBQUksQ0FBQyw2RUFBNkUsRUFBRTtZQUN6RixNQUFNLEVBQUUsY0FBYyxDQUFDLE1BQU07WUFDN0IsS0FBSyxFQUFHLEtBQWUsQ0FBQyxPQUFPO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sbURBQTJCLENBQUMsV0FBVyxDQUFDLGNBQWMsRUFBRSxxQkFBcUIsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUVyRyw4RUFBOEU7SUFDaEYsQ0FBQztBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFNRU0NsaWVudCwgU2VuZE1lc3NhZ2VDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNxcyc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBQdXRJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcbmltcG9ydCB7IEZpbGVVcGxvYWRTZXJ2aWNlLCBGaWxlVXBsb2FkUmVxdWVzdCB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2ZpbGUvZmlsZS11cGxvYWQtc2VydmljZSc7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCwgY2FuUGVyZm9ybUZpbGVPcGVyYXRpb25zIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuaW1wb3J0IHsgY2VudHJhbGl6ZWRFcnJvckhhbmRsZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9jZW50cmFsaXplZC1lcnJvci1oYW5kbGVyJztcclxuaW1wb3J0IHsgZW5oYW5jZWRSZXRyeVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9lcnJvci1oYW5kbGluZy9lbmhhbmNlZC1yZXRyeSc7XHJcbmltcG9ydCB7IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21vbml0b3JpbmcvY2xvdWR3YXRjaC1tb25pdG9yaW5nJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbmNvbnN0IEFMTE9XRURfRVhURU5TSU9OUyA9IFsnLmMnLCAnLmNwcCcsICcuaCcsICcuaHBwJ107XHJcbmNvbnN0IE1BWF9GSUxFX1NJWkUgPSAxMCAqIDEwMjQgKiAxMDI0OyAvLyAxME1CXHJcblxyXG5jb25zdCBzcXNDbGllbnQgPSBuZXcgU1FTQ2xpZW50KHt9KTtcclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnIH0pO1xyXG5jb25zdCBGSUxFX01FVEFEQVRBX1RBQkxFID0gcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRSB8fCAnRmlsZU1ldGFkYXRhLWRldic7XHJcbmNvbnN0IGZpbGVVcGxvYWRTZXJ2aWNlID0gbmV3IEZpbGVVcGxvYWRTZXJ2aWNlKCk7XHJcbmNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignRmlsZVVwbG9hZEZ1bmN0aW9uJyk7XHJcblxyXG4vLyBMb2NhbCB0eXBlIGRlZmluaXRpb25zXHJcbmludGVyZmFjZSBVcGxvYWRSZXF1ZXN0Qm9keSB7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlU2l6ZTogbnVtYmVyO1xyXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmc7XHJcbn1cclxuXHJcbmludGVyZmFjZSBVcGxvYWRSZXNwb25zZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICB1cGxvYWRVcmw6IHN0cmluZztcclxuICBkb3dubG9hZFVybDogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG4vKipcclxuICogRW5oYW5jZWQgZmlsZSB1cGxvYWQgaGFuZGxlciB3aXRoIGNvbXByZWhlbnNpdmUgZXJyb3IgaGFuZGxpbmdcclxuICogUmVxdWlyZW1lbnRzOiAxLjEsIDEuMiwgNi4xLCA4LjEsIDguMlxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBjZW50cmFsaXplZEVycm9ySGFuZGxlci53cmFwTGFtYmRhSGFuZGxlcihcclxuICBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGxvZ2dlci5pbmZvKCdGaWxlIHVwbG9hZCByZXF1ZXN0IHN0YXJ0ZWQnLCB7IFxyXG4gICAgICAgIHBhdGg6IGV2ZW50LnBhdGgsXHJcbiAgICAgICAgaGFzQm9keTogISFldmVudC5ib2R5LFxyXG4gICAgICAgIGJ1Y2tldE5hbWU6IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSxcclxuICAgICAgICBmaWxlTWV0YWRhdGFUYWJsZTogcHJvY2Vzcy5lbnYuRklMRV9NRVRBREFUQV9UQUJMRVxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgb3IgSldUIHRva2VuXHJcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgICBsb2dnZXIuaW5mbygnVXNlciBleHRyYWN0aW9uIHJlc3VsdCcsIHsgdXNlcklkOiB1c2VyLnVzZXJJZCwgZW1haWw6IHVzZXIuZW1haWwgfSk7XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VuYXV0aG9yaXplZCB1cGxvYWQgYXR0ZW1wdCcpO1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVU5BVVRIT1JJWkVEJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnTUlTU0lOR19VU0VSJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdVc2VyIG5vdCBhdXRoZW50aWNhdGVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIHVzZXIgY2FuIHBlcmZvcm0gZmlsZSBvcGVyYXRpb25zIChzdXBwb3J0cyB0ZW1wb3JhcnkgdG9rZW5zKVxyXG4gICAgICBpZiAoIWNhblBlcmZvcm1GaWxlT3BlcmF0aW9ucyh1c2VyKSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKCdVc2VyIGNhbm5vdCBwZXJmb3JtIGZpbGUgb3BlcmF0aW9ucycsIHsgXHJcbiAgICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLCBcclxuICAgICAgICAgIGlzVGVtcG9yYXJ5OiB1c2VyLmlzVGVtcG9yYXJ5LFxyXG4gICAgICAgICAgYXV0aFN0YXRlOiB1c2VyLmF1dGhTdGF0ZSBcclxuICAgICAgICB9KTtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ0ZPUkJJRERFTicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0lOU1VGRklDSUVOVF9QRVJNSVNTSU9OUycpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignWW91IG5lZWQgdG8gbG9nIGluIHRvIGFjY2VzcyB0aGlzIHJlc291cmNlJyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIGxvZ2dlci5pbmZvKCdVc2VyIGF1dGhlbnRpY2F0ZWQgZm9yIHVwbG9hZCcsIHsgXHJcbiAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCwgXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgaXNUZW1wb3Jhcnk6IHVzZXIuaXNUZW1wb3JhcnksXHJcbiAgICAgICAgYXV0aFN0YXRlOiB1c2VyLmF1dGhTdGF0ZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFBhcnNlIGFuZCB2YWxpZGF0ZSByZXF1ZXN0IGJvZHlcclxuICAgICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgICAgbG9nZ2VyLndhcm4oJ1VwbG9hZCByZXF1ZXN0IG1pc3NpbmcgYm9keScpO1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVkFMSURBVElPTl9FUlJPUicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ01JU1NJTkdfQk9EWScpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHVwbG9hZFJlcXVlc3Q6IFVwbG9hZFJlcXVlc3RCb2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuICAgICAgbG9nZ2VyLmluZm8oJ1VwbG9hZCByZXF1ZXN0IHBhcnNlZCcsIHsgXHJcbiAgICAgICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsIFxyXG4gICAgICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplIFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFZhbGlkYXRlIGlucHV0IHdpdGggZW5oYW5jZWQgZXJyb3IgaGFuZGxpbmdcclxuICAgICAgYXdhaXQgZW5oYW5jZWRSZXRyeVNlcnZpY2UuZXhlY3V0ZVdpdGhSZXRyeShcclxuICAgICAgICAoKSA9PiB2YWxpZGF0ZVVwbG9hZFJlcXVlc3QodXBsb2FkUmVxdWVzdCksXHJcbiAgICAgICAgeyBtYXhBdHRlbXB0czogMSB9IC8vIE5vIHJldHJ5IGZvciB2YWxpZGF0aW9uXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnVXBsb2FkIHJlcXVlc3QgdmFsaWRhdGlvbiBwYXNzZWQnKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBmaWxlIHVwbG9hZCByZXF1ZXN0XHJcbiAgICAgIGNvbnN0IGZpbGVVcGxvYWRSZXF1ZXN0OiBGaWxlVXBsb2FkUmVxdWVzdCA9IHtcclxuICAgICAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICBmaWxlU2l6ZTogdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSxcclxuICAgICAgICBjb250ZW50VHlwZTogdXBsb2FkUmVxdWVzdC5jb250ZW50VHlwZSxcclxuICAgICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIHVwbG9hZCBVUkwgd2l0aCByZXRyeVxyXG4gICAgICBsb2dnZXIuaW5mbygnR2VuZXJhdGluZyBwcmVzaWduZWQgdXBsb2FkIFVSTCcpO1xyXG4gICAgICBjb25zdCB1cGxvYWRSZXNwb25zZSA9IGF3YWl0IGVuaGFuY2VkUmV0cnlTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgICAgKCkgPT4gZmlsZVVwbG9hZFNlcnZpY2UuZ2VuZXJhdGVQcmVzaWduZWRVcGxvYWRVcmwoZmlsZVVwbG9hZFJlcXVlc3QpLFxyXG4gICAgICAgIHsgXHJcbiAgICAgICAgICBtYXhBdHRlbXB0czogMywgXHJcbiAgICAgICAgICBpbml0aWFsRGVsYXlNczogNTAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ3RpbWVvdXQnLCAnU0VSVklDRV9VTkFWQUlMQUJMRScsICdFWFRFUk5BTF9TRVJWSUNFX0VSUk9SJ11cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICAgIFxyXG4gICAgICBsb2dnZXIuaW5mbygnUHJlc2lnbmVkIFVSTCBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5JywgeyBcclxuICAgICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCwgXHJcbiAgICAgICAgZXhwaXJlc0luOiB1cGxvYWRSZXNwb25zZS5leHBpcmVzSW4gXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIEZpbGVNZXRhZGF0YSByZWNvcmQgd2l0aCByZXRyeVxyXG4gICAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICAgICgpID0+IGNyZWF0ZUZpbGVNZXRhZGF0YSh1cGxvYWRSZXNwb25zZSwgdXBsb2FkUmVxdWVzdCwgdXNlciksXHJcbiAgICAgICAgeyBcclxuICAgICAgICAgIG1heEF0dGVtcHRzOiAzLCBcclxuICAgICAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ1Rocm90dGxpbmdFeGNlcHRpb24nLCAnUHJvdmlzaW9uZWRUaHJvdWdocHV0RXhjZWVkZWRFeGNlcHRpb24nLCAnU2VydmljZVVuYXZhaWxhYmxlJ11cclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnRmlsZU1ldGFkYXRhIHJlY29yZCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgICAgLy8gUXVldWUgYW5hbHlzaXMgd2l0aCByZXRyeSAobm9uLWNyaXRpY2FsKVxyXG4gICAgICBhd2FpdCBxdWV1ZUFuYWx5c2lzV2l0aFJldHJ5KHVwbG9hZFJlc3BvbnNlLCB1cGxvYWRSZXF1ZXN0LCB1c2VyKTtcclxuXHJcbiAgICAgIC8vIFJlY29yZCBzdWNjZXNzIG1ldHJpY3NcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkUGVyZm9ybWFuY2UoJ2ZpbGUtdXBsb2FkJywgZHVyYXRpb24sICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgdHJ1ZSk7XHJcbiAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRVc2VyQWN0aXZpdHkoJ2ZpbGUtdXBsb2FkJywgdXNlci51c2VySWQsIHVzZXIub3JnYW5pemF0aW9uSWQpO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2U6IFVwbG9hZFJlc3BvbnNlID0ge1xyXG4gICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICAgIHMzS2V5OiB1cGxvYWRSZXNwb25zZS5zM0tleSxcclxuICAgICAgICB1cGxvYWRVcmw6IHVwbG9hZFJlc3BvbnNlLnVwbG9hZFVybCxcclxuICAgICAgICBkb3dubG9hZFVybDogdXBsb2FkUmVzcG9uc2UuZG93bmxvYWRVcmwsXHJcbiAgICAgICAgZXhwaXJlc0luOiB1cGxvYWRSZXNwb25zZS5leHBpcmVzSW4sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBsb2dnZXIuaW5mbygnRmlsZSB1cGxvYWQgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsIFxyXG4gICAgICAgIGR1cmF0aW9uIFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiAnQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgICB9O1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZFBlcmZvcm1hbmNlKCdmaWxlLXVwbG9hZCcsIGR1cmF0aW9uLCAnZmlsZS11cGxvYWQtc2VydmljZScsIGZhbHNlKTtcclxuICAgICAgXHJcbiAgICAgIGxvZ2dlci5lcnJvcignRmlsZSB1cGxvYWQgZmFpbGVkJywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjsgLy8gTGV0IGNlbnRyYWxpemVkIGVycm9yIGhhbmRsZXIgbWFuYWdlIHRoaXNcclxuICAgIH1cclxuICB9LFxyXG4gICdmaWxlLXVwbG9hZC1zZXJ2aWNlJ1xyXG4pO1xyXG5cclxuZnVuY3Rpb24gZXJyb3JSZXNwb25zZShcclxuICBzdGF0dXNDb2RlOiBudW1iZXIsXHJcbiAgY29kZTogc3RyaW5nLFxyXG4gIG1lc3NhZ2U6IHN0cmluZ1xyXG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQge1xyXG4gIHJldHVybiB7XHJcbiAgICBzdGF0dXNDb2RlLFxyXG4gICAgaGVhZGVyczoge1xyXG4gICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsQXV0aG9yaXphdGlvbicsXHJcbiAgICB9LFxyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBlcnJvcjoge1xyXG4gICAgICAgIGNvZGUsXHJcbiAgICAgICAgbWVzc2FnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICByZXF1ZXN0SWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZyg3KSxcclxuICAgICAgfSxcclxuICAgIH0pLFxyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSB1cGxvYWQgcmVxdWVzdCB3aXRoIGVuaGFuY2VkIGVycm9yIG1lc3NhZ2VzXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB2YWxpZGF0ZVVwbG9hZFJlcXVlc3QodXBsb2FkUmVxdWVzdDogVXBsb2FkUmVxdWVzdEJvZHkpOiBQcm9taXNlPHZvaWQ+IHtcclxuICBjb25zdCBBTExPV0VEX0VYVEVOU0lPTlMgPSBbJy5jJywgJy5jcHAnLCAnLmgnLCAnLmhwcCddO1xyXG4gIGNvbnN0IE1BWF9GSUxFX1NJWkUgPSAxMCAqIDEwMjQgKiAxMDI0OyAvLyAxME1CXHJcblxyXG4gIGlmICghdXBsb2FkUmVxdWVzdC5maWxlTmFtZSB8fCAhdXBsb2FkUmVxdWVzdC5maWxlU2l6ZSB8fCAhdXBsb2FkUmVxdWVzdC5jb250ZW50VHlwZSkge1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdmaWxlTmFtZSwgZmlsZVNpemUsIGFuZCBjb250ZW50VHlwZSBhcmUgcmVxdWlyZWQnKTtcclxuICB9XHJcblxyXG4gIC8vIFZhbGlkYXRlIGZpbGUgZXh0ZW5zaW9uIChSZXF1aXJlbWVudHMgMS4xKVxyXG4gIGNvbnN0IGV4dCA9IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUuc3Vic3RyaW5nKHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKSkudG9Mb3dlckNhc2UoKTtcclxuICBpZiAoIUFMTE9XRURfRVhURU5TSU9OUy5pbmNsdWRlcyhleHQpKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYE9ubHkgJHtBTExPV0VEX0VYVEVOU0lPTlMuam9pbignLCAnKX0gZmlsZXMgYXJlIGFsbG93ZWRgKTtcclxuICB9XHJcblxyXG4gIC8vIFZhbGlkYXRlIGZpbGUgc2l6ZSAoUmVxdWlyZW1lbnRzIDEuMilcclxuICBpZiAodXBsb2FkUmVxdWVzdC5maWxlU2l6ZSA+IE1BWF9GSUxFX1NJWkUpIHtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSBzaXplIG11c3Qgbm90IGV4Y2VlZCAxME1CICgke01BWF9GSUxFX1NJWkV9IGJ5dGVzKWApO1xyXG4gIH1cclxuXHJcbiAgbG9nZ2VyLmluZm8oJ1VwbG9hZCByZXF1ZXN0IHZhbGlkYXRpb24gcGFzc2VkJywgeyBcclxuICAgIGZpbGVUeXBlOiBleHQsIFxyXG4gICAgZmlsZVNpemU6IHVwbG9hZFJlcXVlc3QuZmlsZVNpemUgXHJcbiAgfSk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgZmlsZSBtZXRhZGF0YSByZWNvcmQgd2l0aCBlbmhhbmNlZCBlcnJvciBoYW5kbGluZ1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlRmlsZU1ldGFkYXRhKFxyXG4gIHVwbG9hZFJlc3BvbnNlOiBhbnksXHJcbiAgdXBsb2FkUmVxdWVzdDogVXBsb2FkUmVxdWVzdEJvZHksXHJcbiAgdXNlcjogYW55XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIGNvbnN0IGV4dCA9IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUuc3Vic3RyaW5nKHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKSkudG9Mb3dlckNhc2UoKTtcclxuICBjb25zdCBmaWxlVHlwZSA9IChleHQgPT09ICcuYycgfHwgZXh0ID09PSAnLmgnKSA/ICdjJyA6ICdjcHAnO1xyXG4gIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xyXG5cclxuICBsb2dnZXIuaW5mbygnQ3JlYXRpbmcgRmlsZU1ldGFkYXRhIHJlY29yZCcsIHtcclxuICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgZmlsZU5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICBmaWxlVHlwZSxcclxuICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXlcclxuICB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBQdXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogRklMRV9NRVRBREFUQV9UQUJMRSxcclxuICAgICAgSXRlbTogbWFyc2hhbGwoe1xyXG4gICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZDogdXNlci51c2VySWQsXHJcbiAgICAgICAgZmlsZW5hbWU6IHVwbG9hZFJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgICAgZmlsZVR5cGU6IGZpbGVUeXBlLFxyXG4gICAgICAgIGZpbGVTaXplOiB1cGxvYWRSZXF1ZXN0LmZpbGVTaXplLFxyXG4gICAgICAgIHVwbG9hZFRpbWVzdGFtcDogbm93LFxyXG4gICAgICAgIGFuYWx5c2lzU3RhdHVzOiAncGVuZGluZycsXHJcbiAgICAgICAgczNLZXk6IHVwbG9hZFJlc3BvbnNlLnMzS2V5LFxyXG4gICAgICAgIGNyZWF0ZWRBdDogbm93LFxyXG4gICAgICAgIHVwZGF0ZWRBdDogbm93LFxyXG4gICAgICB9KSxcclxuICAgIH0pKTtcclxuXHJcbiAgICBsb2dnZXIuaW5mbygnRmlsZU1ldGFkYXRhIHJlY29yZCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScsIHsgXHJcbiAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXlcclxuICAgIH0pO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gY3JlYXRlIEZpbGVNZXRhZGF0YSByZWNvcmQnLCBlcnJvciBhcyBFcnJvciwge1xyXG4gICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgdGFibGU6IEZJTEVfTUVUQURBVEFfVEFCTEVcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEVuaGFuY2VkIGVycm9yIGhhbmRsaW5nIGZvciBEeW5hbW9EQiBlcnJvcnNcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTmFtZSA9IChlcnJvciBhcyBhbnkpLm5hbWUgfHwgJyc7XHJcbiAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UgfHwgJyc7XHJcblxyXG4gICAgICBpZiAoZXJyb3JOYW1lID09PSAnQWNjZXNzRGVuaWVkJyB8fCBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0FjY2Vzc0RlbmllZCcpKSB7XHJcbiAgICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdQRVJNSVNTSU9OX0RFTklFRCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX0FDQ0VTUycpO1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHNhdmUgZmlsZSBtZXRhZGF0YTogUGVybWlzc2lvbiBkZW5pZWQuIEVuc3VyZSBMYW1iZGEgaGFzIER5bmFtb0RCIHBlcm1pc3Npb25zLmApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZXJyb3JOYW1lID09PSAnUmVzb3VyY2VOb3RGb3VuZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ1JFU09VUkNFX05PVF9GT1VORCcsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX1RBQkxFJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2F2ZSBmaWxlIG1ldGFkYXRhOiBUYWJsZSAke0ZJTEVfTUVUQURBVEFfVEFCTEV9IG5vdCBmb3VuZC5gKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGVycm9yTmFtZSA9PT0gJ1Rocm90dGxpbmdFeGNlcHRpb24nIHx8IGVycm9yTmFtZSA9PT0gJ1Byb3Zpc2lvbmVkVGhyb3VnaHB1dEV4Y2VlZGVkRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVEhST1RUTElORycsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX1RIUk9UVExFJyk7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gc2F2ZSBmaWxlIG1ldGFkYXRhOiBTZXJ2aWNlIHRlbXBvcmFyaWx5IHVuYXZhaWxhYmxlLiBQbGVhc2UgcmV0cnkuYCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChlcnJvck5hbWUgPT09ICdWYWxpZGF0aW9uRXhjZXB0aW9uJykge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRFcnJvcignVkFMSURBVElPTl9FUlJPUicsICdmaWxlLXVwbG9hZC1zZXJ2aWNlJywgJ0RZTkFNT0RCX1ZBTElEQVRJT04nKTtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzYXZlIGZpbGUgbWV0YWRhdGE6IEludmFsaWQgZGF0YSBmb3JtYXQuYCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBHZW5lcmljIGVycm9yXHJcbiAgICBhd2FpdCBjbG91ZFdhdGNoTW9uaXRvcmluZ1NlcnZpY2UucmVjb3JkRXJyb3IoJ0RBVEFCQVNFX0VSUk9SJywgJ2ZpbGUtdXBsb2FkLXNlcnZpY2UnLCAnTUVUQURBVEFfQ1JFQVRJT04nKTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGNyZWF0ZSBmaWxlIG1ldGFkYXRhOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFF1ZXVlIGFuYWx5c2lzIHdpdGggcmV0cnkgYW5kIGdyYWNlZnVsIGZhaWx1cmVcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHF1ZXVlQW5hbHlzaXNXaXRoUmV0cnkoXHJcbiAgdXBsb2FkUmVzcG9uc2U6IGFueSxcclxuICB1cGxvYWRSZXF1ZXN0OiBVcGxvYWRSZXF1ZXN0Qm9keSxcclxuICB1c2VyOiBhbnlcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgY29uc3QgYW5hbHlzaXNRdWV1ZVVybCA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1FVRVVFX1VSTDtcclxuICBcclxuICBpZiAoIWFuYWx5c2lzUXVldWVVcmwpIHtcclxuICAgIGxvZ2dlci53YXJuKCdBTkFMWVNJU19RVUVVRV9VUkwgbm90IGNvbmZpZ3VyZWQgLSBhbmFseXNpcyB3aWxsIG5vdCBiZSB0cmlnZ2VyZWQgYXV0b21hdGljYWxseScpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgZXh0ID0gdXBsb2FkUmVxdWVzdC5maWxlTmFtZS5zdWJzdHJpbmcodXBsb2FkUmVxdWVzdC5maWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gIGNvbnN0IGxhbmd1YWdlID0gKGV4dCA9PT0gJy5jJyB8fCBleHQgPT09ICcuaCcpID8gJ0MnIDogJ0NQUCc7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBhd2FpdCBlbmhhbmNlZFJldHJ5U2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ1F1ZXVpbmcgYW5hbHlzaXMnLCB7IFxyXG4gICAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsIFxyXG4gICAgICAgICAgbGFuZ3VhZ2UsXHJcbiAgICAgICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXlcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgYXdhaXQgc3FzQ2xpZW50LnNlbmQobmV3IFNlbmRNZXNzYWdlQ29tbWFuZCh7XHJcbiAgICAgICAgICBRdWV1ZVVybDogYW5hbHlzaXNRdWV1ZVVybCxcclxuICAgICAgICAgIE1lc3NhZ2VCb2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIGZpbGVJZDogdXBsb2FkUmVzcG9uc2UuZmlsZUlkLFxyXG4gICAgICAgICAgICBmaWxlTmFtZTogdXBsb2FkUmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICAgICAgczNLZXk6IHVwbG9hZFJlc3BvbnNlLnMzS2V5LFxyXG4gICAgICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgICAgICAgb3JnYW5pemF0aW9uSWQ6IHVzZXIub3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQtb3JnJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgbG9nZ2VyLmluZm8oJ0FuYWx5c2lzIHF1ZXVlZCBzdWNjZXNzZnVsbHknLCB7IFxyXG4gICAgICAgICAgZmlsZUlkOiB1cGxvYWRSZXNwb25zZS5maWxlSWQsXHJcbiAgICAgICAgICBzM0tleTogdXBsb2FkUmVzcG9uc2UuczNLZXlcclxuICAgICAgICB9KTtcclxuICAgICAgfSxcclxuICAgICAgeyBcclxuICAgICAgICBtYXhBdHRlbXB0czogMywgXHJcbiAgICAgICAgaW5pdGlhbERlbGF5TXM6IDUwMCxcclxuICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICdTRVJWSUNFX1VOQVZBSUxBQkxFJywgJ1Rocm90dGxpbmdFeGNlcHRpb24nXVxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgLy8gTG9nIGJ1dCBkb24ndCBmYWlsIHRoZSB1cGxvYWQgLSBtZXRhZGF0YSBpcyBhbHJlYWR5IHNhdmVkXHJcbiAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHF1ZXVlIGFuYWx5c2lzIC0gZmlsZSB1cGxvYWQgc3VjY2VlZGVkIGJ1dCBhbmFseXNpcyBub3QgdHJpZ2dlcmVkJywge1xyXG4gICAgICBmaWxlSWQ6IHVwbG9hZFJlc3BvbnNlLmZpbGVJZCxcclxuICAgICAgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZVxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZEVycm9yKCdRVUVVRV9GQUlMRUQnLCAnZmlsZS11cGxvYWQtc2VydmljZScsICdTUVNfQU5BTFlTSVMnKTtcclxuICAgIFxyXG4gICAgLy8gRG9uJ3QgdGhyb3cgLSB0aGUgdXBsb2FkIHdhcyBzdWNjZXNzZnVsLCBhbmFseXNpcyBjYW4gYmUgdHJpZ2dlcmVkIG1hbnVhbGx5XHJcbiAgfVxyXG59Il19