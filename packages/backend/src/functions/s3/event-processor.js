"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const audit_logging_service_1 = require("../../services/audit-logging-service");
const logger_1 = require("../../utils/logger");
/**
 * Lambda function to process S3 events for audit logging
 * Triggered by S3 object creation and deletion events
 */
const handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    const logger = (0, logger_1.createLogger)({
        correlationId,
        functionName: 's3-event-processor'
    });
    logger.info('Processing S3 event', {
        recordCount: event.Records.length,
        functionName: context.functionName,
        remainingTimeMs: context.getRemainingTimeInMillis()
    });
    try {
        // Initialize audit logging service
        const auditService = new audit_logging_service_1.AuditLoggingService(process.env.AUDIT_LOG_GROUP_NAME || '/aws/lambda/misra-platform-audit', correlationId);
        // Process all S3 records
        for (const record of event.Records) {
            await processS3Record(record, auditService, logger);
        }
        logger.info('S3 event processing completed successfully', {
            recordCount: event.Records.length
        });
    }
    catch (error) {
        logger.error('S3 event processing failed', {
            error: error.message,
            stack: error.stack,
            recordCount: event.Records.length
        });
        // Re-throw error to trigger Lambda retry mechanism
        throw error;
    }
};
exports.handler = handler;
/**
 * Process individual S3 record
 */
async function processS3Record(record, auditService, logger) {
    try {
        const eventName = record.eventName;
        const bucketName = record.s3.bucket.name;
        const objectKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        const objectSize = record.s3.object.size;
        const eventTime = record.eventTime;
        const sourceIPAddress = record.requestParameters?.sourceIPAddress;
        const userAgent = record.requestParameters?.userAgent;
        logger.info('Processing S3 record', {
            eventName,
            bucketName,
            objectKey,
            objectSize,
            eventTime
        });
        // Extract user ID from object key if possible (assuming format: uploads/{userId}/...)
        const userId = extractUserIdFromKey(objectKey);
        // Log security event for file operations
        if (eventName.startsWith('ObjectCreated')) {
            await auditService.logSecurityEvent({
                action: 'FILE_UPLOADED',
                userId,
                resourceId: objectKey,
                sourceIp: sourceIPAddress,
                userAgent,
                success: true,
                details: {
                    bucketName,
                    objectKey,
                    objectSize,
                    eventTime,
                    eventName
                }
            });
            // Log compliance event for data retention
            await auditService.logComplianceEvent({
                regulation: 'DATA_RETENTION',
                action: 'FILE_STORED',
                userId,
                dataType: getFileType(objectKey),
                retention: '7_YEARS',
                details: {
                    bucketName,
                    objectKey,
                    objectSize,
                    eventTime,
                    storageClass: 'STANDARD'
                }
            });
        }
        else if (eventName.startsWith('ObjectRemoved')) {
            await auditService.logSecurityEvent({
                action: 'FILE_DELETED',
                userId,
                resourceId: objectKey,
                sourceIp: sourceIPAddress,
                userAgent,
                success: true,
                details: {
                    bucketName,
                    objectKey,
                    eventTime,
                    eventName
                }
            });
            // Log compliance event for data deletion
            await auditService.logComplianceEvent({
                regulation: 'DATA_RETENTION',
                action: 'FILE_DELETED',
                userId,
                dataType: getFileType(objectKey),
                retention: '7_YEARS',
                details: {
                    bucketName,
                    objectKey,
                    eventTime,
                    deletionReason: 'USER_INITIATED'
                }
            });
        }
        // Log additional events for specific file types
        if (isSourceCodeFile(objectKey)) {
            await auditService.logComplianceEvent({
                regulation: 'MISRA_COMPLIANCE',
                action: eventName.startsWith('ObjectCreated') ? 'SOURCE_CODE_UPLOADED' : 'SOURCE_CODE_DELETED',
                userId,
                dataType: 'SOURCE_CODE',
                retention: '10_YEARS',
                details: {
                    bucketName,
                    objectKey,
                    fileExtension: getFileExtension(objectKey),
                    eventTime
                }
            });
        }
    }
    catch (error) {
        logger.error('Failed to process S3 record', {
            error: error.message,
            eventName: record.eventName,
            bucketName: record.s3?.bucket?.name,
            objectKey: record.s3?.object?.key
        });
        // Don't throw error here to avoid failing the entire batch
    }
}
/**
 * Extract user ID from S3 object key
 */
function extractUserIdFromKey(objectKey) {
    // Assuming format: uploads/{userId}/... or users/{userId}/...
    const parts = objectKey.split('/');
    if (parts.length >= 2 && (parts[0] === 'uploads' || parts[0] === 'users')) {
        return parts[1];
    }
    return undefined;
}
/**
 * Determine file type from object key
 */
function getFileType(objectKey) {
    const extension = getFileExtension(objectKey).toLowerCase();
    if (['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].includes(extension)) {
        return 'SOURCE_CODE';
    }
    else if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(extension)) {
        return 'DOCUMENT';
    }
    else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(extension)) {
        return 'IMAGE';
    }
    else if (['.zip', '.tar', '.gz', '.rar'].includes(extension)) {
        return 'ARCHIVE';
    }
    else {
        return 'OTHER';
    }
}
/**
 * Check if file is source code
 */
function isSourceCodeFile(objectKey) {
    const extension = getFileExtension(objectKey).toLowerCase();
    return ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].includes(extension);
}
/**
 * Get file extension from object key
 */
function getFileExtension(objectKey) {
    const lastDot = objectKey.lastIndexOf('.');
    return lastDot !== -1 ? objectKey.substring(lastDot) : '';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnQtcHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGdGQUEyRTtBQUMzRSwrQ0FBa0Q7QUFFbEQ7OztHQUdHO0FBQ0ksTUFBTSxPQUFPLEdBQWMsS0FBSyxFQUNyQyxLQUFjLEVBQ2QsT0FBZ0IsRUFDRCxFQUFFO0lBQ2pCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7SUFDM0MsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDO1FBQzFCLGFBQWE7UUFDYixZQUFZLEVBQUUsb0JBQW9CO0tBQ25DLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDakMsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTTtRQUNqQyxZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDbEMsZUFBZSxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRTtLQUNwRCxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUM7UUFDSCxtQ0FBbUM7UUFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQ0FBbUIsQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxrQ0FBa0MsRUFDdEUsYUFBYSxDQUNkLENBQUM7UUFFRix5QkFBeUI7UUFDekIsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRTtZQUN4RCxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1NBQ2xDLENBQUMsQ0FBQztJQUVMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsTUFBTSxDQUFD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UyxDQUFDO0lBQ25CLENBQUM7U0FBTSxDQUFDO1FBQ04sT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztBQUNILENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsZ0JBQWdCLENBQUMsU0FBaUI7SUFDekMsTUFBTSxTQUFTLEdBQUcsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDNUQsT0FBTyxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNqRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLFNBQWlCO0lBQ3pDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDM0MsT0FBTyxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM1RCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUzNFdmVudCwgUzNIYW5kbGVyLCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEF1ZGl0TG9nZ2luZ1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hdWRpdC1sb2dnaW5nLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBmdW5jdGlvbiB0byBwcm9jZXNzIFMzIGV2ZW50cyBmb3IgYXVkaXQgbG9nZ2luZ1xyXG4gKiBUcmlnZ2VyZWQgYnkgUzMgb2JqZWN0IGNyZWF0aW9uIGFuZCBkZWxldGlvbiBldmVudHNcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBTM0hhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IFMzRXZlbnQsXHJcbiAgY29udGV4dDogQ29udGV4dFxyXG4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcclxuICBjb25zdCBjb3JyZWxhdGlvbklkID0gY29udGV4dC5hd3NSZXF1ZXN0SWQ7XHJcbiAgY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKHtcclxuICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICBmdW5jdGlvbk5hbWU6ICdzMy1ldmVudC1wcm9jZXNzb3InXHJcbiAgfSk7XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdQcm9jZXNzaW5nIFMzIGV2ZW50Jywge1xyXG4gICAgcmVjb3JkQ291bnQ6IGV2ZW50LlJlY29yZHMubGVuZ3RoLFxyXG4gICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgIHJlbWFpbmluZ1RpbWVNczogY29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMoKVxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gSW5pdGlhbGl6ZSBhdWRpdCBsb2dnaW5nIHNlcnZpY2VcclxuICAgIGNvbnN0IGF1ZGl0U2VydmljZSA9IG5ldyBBdWRpdExvZ2dpbmdTZXJ2aWNlKFxyXG4gICAgICBwcm9jZXNzLmVudi5BVURJVF9MT0dfR1JPVVBfTkFNRSB8fCAnL2F3cy9sYW1iZGEvbWlzcmEtcGxhdGZvcm0tYXVkaXQnLFxyXG4gICAgICBjb3JyZWxhdGlvbklkXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFByb2Nlc3MgYWxsIFMzIHJlY29yZHNcclxuICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgICAgYXdhaXQgcHJvY2Vzc1MzUmVjb3JkKHJlY29yZCwgYXVkaXRTZXJ2aWNlLCBsb2dnZXIpO1xyXG4gICAgfVxyXG5cclxuICAgIGxvZ2dlci5pbmZvKCdTMyBldmVudCBwcm9jZXNzaW5nIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIHJlY29yZENvdW50OiBldmVudC5SZWNvcmRzLmxlbmd0aFxyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ1MzIGV2ZW50IHByb2Nlc3NpbmcgZmFpbGVkJywge1xyXG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZSxcclxuICAgICAgc3RhY2s6IGVycm9yLnN0YWNrLFxyXG4gICAgICByZWNvcmRDb3VudDogZXZlbnQuUmVjb3Jkcy5sZW5ndGhcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlLXRocm93IGVycm9yIHRvIHRyaWdnZXIgTGFtYmRhIHJldHJ5IG1lY2hhbmlzbVxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFByb2Nlc3MgaW5kaXZpZHVhbCBTMyByZWNvcmRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NTM1JlY29yZChcclxuICByZWNvcmQ6IGFueSxcclxuICBhdWRpdFNlcnZpY2U6IEF1ZGl0TG9nZ2luZ1NlcnZpY2UsXHJcbiAgbG9nZ2VyOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVMb2dnZXI+XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBldmVudE5hbWUgPSByZWNvcmQuZXZlbnROYW1lO1xyXG4gICAgY29uc3QgYnVja2V0TmFtZSA9IHJlY29yZC5zMy5idWNrZXQubmFtZTtcclxuICAgIGNvbnN0IG9iamVjdEtleSA9IGRlY29kZVVSSUNvbXBvbmVudChyZWNvcmQuczMub2JqZWN0LmtleS5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XHJcbiAgICBjb25zdCBvYmplY3RTaXplID0gcmVjb3JkLnMzLm9iamVjdC5zaXplO1xyXG4gICAgY29uc3QgZXZlbnRUaW1lID0gcmVjb3JkLmV2ZW50VGltZTtcclxuICAgIGNvbnN0IHNvdXJjZUlQQWRkcmVzcyA9IHJlY29yZC5yZXF1ZXN0UGFyYW1ldGVycz8uc291cmNlSVBBZGRyZXNzO1xyXG4gICAgY29uc3QgdXNlckFnZW50ID0gcmVjb3JkLnJlcXVlc3RQYXJhbWV0ZXJzPy51c2VyQWdlbnQ7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgUzMgcmVjb3JkJywge1xyXG4gICAgICBldmVudE5hbWUsXHJcbiAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgIG9iamVjdEtleSxcclxuICAgICAgb2JqZWN0U2l6ZSxcclxuICAgICAgZXZlbnRUaW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgSUQgZnJvbSBvYmplY3Qga2V5IGlmIHBvc3NpYmxlIChhc3N1bWluZyBmb3JtYXQ6IHVwbG9hZHMve3VzZXJJZH0vLi4uKVxyXG4gICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZEZyb21LZXkob2JqZWN0S2V5KTtcclxuXHJcbiAgICAvLyBMb2cgc2VjdXJpdHkgZXZlbnQgZm9yIGZpbGUgb3BlcmF0aW9uc1xyXG4gICAgaWYgKGV2ZW50TmFtZS5zdGFydHNXaXRoKCdPYmplY3RDcmVhdGVkJykpIHtcclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ1NlY3VyaXR5RXZlbnQoe1xyXG4gICAgICAgIGFjdGlvbjogJ0ZJTEVfVVBMT0FERUQnLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICByZXNvdXJjZUlkOiBvYmplY3RLZXksXHJcbiAgICAgICAgc291cmNlSXA6IHNvdXJjZUlQQWRkcmVzcyxcclxuICAgICAgICB1c2VyQWdlbnQsXHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBidWNrZXROYW1lLFxyXG4gICAgICAgICAgb2JqZWN0S2V5LFxyXG4gICAgICAgICAgb2JqZWN0U2l6ZSxcclxuICAgICAgICAgIGV2ZW50VGltZSxcclxuICAgICAgICAgIGV2ZW50TmFtZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgY29tcGxpYW5jZSBldmVudCBmb3IgZGF0YSByZXRlbnRpb25cclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ0NvbXBsaWFuY2VFdmVudCh7XHJcbiAgICAgICAgcmVndWxhdGlvbjogJ0RBVEFfUkVURU5USU9OJyxcclxuICAgICAgICBhY3Rpb246ICdGSUxFX1NUT1JFRCcsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGRhdGFUeXBlOiBnZXRGaWxlVHlwZShvYmplY3RLZXkpLFxyXG4gICAgICAgIHJldGVudGlvbjogJzdfWUVBUlMnLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBvYmplY3RLZXksXHJcbiAgICAgICAgICBvYmplY3RTaXplLFxyXG4gICAgICAgICAgZXZlbnRUaW1lLFxyXG4gICAgICAgICAgc3RvcmFnZUNsYXNzOiAnU1RBTkRBUkQnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICB9IGVsc2UgaWYgKGV2ZW50TmFtZS5zdGFydHNXaXRoKCdPYmplY3RSZW1vdmVkJykpIHtcclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ1NlY3VyaXR5RXZlbnQoe1xyXG4gICAgICAgIGFjdGlvbjogJ0ZJTEVfREVMRVRFRCcsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIHJlc291cmNlSWQ6IG9iamVjdEtleSxcclxuICAgICAgICBzb3VyY2VJcDogc291cmNlSVBBZGRyZXNzLFxyXG4gICAgICAgIHVzZXJBZ2VudCxcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBvYmplY3RLZXksXHJcbiAgICAgICAgICBldmVudFRpbWUsXHJcbiAgICAgICAgICBldmVudE5hbWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTG9nIGNvbXBsaWFuY2UgZXZlbnQgZm9yIGRhdGEgZGVsZXRpb25cclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ0NvbXBsaWFuY2VFdmVudCh7XHJcbiAgICAgICAgcmVndWxhdGlvbjogJ0RBVEFfUkVURU5USU9OJyxcclxuICAgICAgICBhY3Rpb246ICdGSUxFX0RFTEVURUQnLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBkYXRhVHlwZTogZ2V0RmlsZVR5cGUob2JqZWN0S2V5KSxcclxuICAgICAgICByZXRlbnRpb246ICc3X1lFQVJTJyxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBidWNrZXROYW1lLFxyXG4gICAgICAgICAgb2JqZWN0S2V5LFxyXG4gICAgICAgICAgZXZlbnRUaW1lLFxyXG4gICAgICAgICAgZGVsZXRpb25SZWFzb246ICdVU0VSX0lOSVRJQVRFRCdcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIExvZyBhZGRpdGlvbmFsIGV2ZW50cyBmb3Igc3BlY2lmaWMgZmlsZSB0eXBlc1xyXG4gICAgaWYgKGlzU291cmNlQ29kZUZpbGUob2JqZWN0S2V5KSkge1xyXG4gICAgICBhd2FpdCBhdWRpdFNlcnZpY2UubG9nQ29tcGxpYW5jZUV2ZW50KHtcclxuICAgICAgICByZWd1bGF0aW9uOiAnTUlTUkFfQ09NUExJQU5DRScsXHJcbiAgICAgICAgYWN0aW9uOiBldmVudE5hbWUuc3RhcnRzV2l0aCgnT2JqZWN0Q3JlYXRlZCcpID8gJ1NPVVJDRV9DT0RFX1VQTE9BREVEJyA6ICdTT1VSQ0VfQ09ERV9ERUxFVEVEJyxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgZGF0YVR5cGU6ICdTT1VSQ0VfQ09ERScsXHJcbiAgICAgICAgcmV0ZW50aW9uOiAnMTBfWUVBUlMnLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBvYmplY3RLZXksXHJcbiAgICAgICAgICBmaWxlRXh0ZW5zaW9uOiBnZXRGaWxlRXh0ZW5zaW9uKG9iamVjdEtleSksXHJcbiAgICAgICAgICBldmVudFRpbWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgbG9nZ2VyLmVycm9yKCdGYWlsZWQgdG8gcHJvY2VzcyBTMyByZWNvcmQnLCB7XHJcbiAgICAgIGVycm9yOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICBldmVudE5hbWU6IHJlY29yZC5ldmVudE5hbWUsXHJcbiAgICAgIGJ1Y2tldE5hbWU6IHJlY29yZC5zMz8uYnVja2V0Py5uYW1lLFxyXG4gICAgICBvYmplY3RLZXk6IHJlY29yZC5zMz8ub2JqZWN0Py5rZXlcclxuICAgIH0pO1xyXG4gICAgLy8gRG9uJ3QgdGhyb3cgZXJyb3IgaGVyZSB0byBhdm9pZCBmYWlsaW5nIHRoZSBlbnRpcmUgYmF0Y2hcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0IHVzZXIgSUQgZnJvbSBTMyBvYmplY3Qga2V5XHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0VXNlcklkRnJvbUtleShvYmplY3RLZXk6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgLy8gQXNzdW1pbmcgZm9ybWF0OiB1cGxvYWRzL3t1c2VySWR9Ly4uLiBvciB1c2Vycy97dXNlcklkfS8uLi5cclxuICBjb25zdCBwYXJ0cyA9IG9iamVjdEtleS5zcGxpdCgnLycpO1xyXG4gIGlmIChwYXJ0cy5sZW5ndGggPj0gMiAmJiAocGFydHNbMF0gPT09ICd1cGxvYWRzJyB8fCBwYXJ0c1swXSA9PT0gJ3VzZXJzJykpIHtcclxuICAgIHJldHVybiBwYXJ0c1sxXTtcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBmaWxlIHR5cGUgZnJvbSBvYmplY3Qga2V5XHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRGaWxlVHlwZShvYmplY3RLZXk6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihvYmplY3RLZXkpLnRvTG93ZXJDYXNlKCk7XHJcbiAgXHJcbiAgaWYgKFsnLmMnLCAnLmNwcCcsICcuY2MnLCAnLmN4eCcsICcuaCcsICcuaHBwJywgJy5oeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICByZXR1cm4gJ1NPVVJDRV9DT0RFJztcclxuICB9IGVsc2UgaWYgKFsnLnR4dCcsICcubWQnLCAnLmRvYycsICcuZG9jeCcsICcucGRmJ10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgcmV0dXJuICdET0NVTUVOVCc7XHJcbiAgfSBlbHNlIGlmIChbJy5qcGcnLCAnLmpwZWcnLCAnLnBuZycsICcuZ2lmJywgJy5ibXAnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICByZXR1cm4gJ0lNQUdFJztcclxuICB9IGVsc2UgaWYgKFsnLnppcCcsICcudGFyJywgJy5neicsICcucmFyJ10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgcmV0dXJuICdBUkNISVZFJztcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuICdPVEhFUic7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgZmlsZSBpcyBzb3VyY2UgY29kZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNTb3VyY2VDb2RlRmlsZShvYmplY3RLZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGdldEZpbGVFeHRlbnNpb24ob2JqZWN0S2V5KS50b0xvd2VyQ2FzZSgpO1xyXG4gIHJldHVybiBbJy5jJywgJy5jcHAnLCAnLmNjJywgJy5jeHgnLCAnLmgnLCAnLmhwcCcsICcuaHh4J10uaW5jbHVkZXMoZXh0ZW5zaW9uKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBmaWxlIGV4dGVuc2lvbiBmcm9tIG9iamVjdCBrZXlcclxuICovXHJcbmZ1bmN0aW9uIGdldEZpbGVFeHRlbnNpb24ob2JqZWN0S2V5OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGxhc3REb3QgPSBvYmplY3RLZXkubGFzdEluZGV4T2YoJy4nKTtcclxuICByZXR1cm4gbGFzdERvdCAhPT0gLTEgPyBvYmplY3RLZXkuc3Vic3RyaW5nKGxhc3REb3QpIDogJyc7XHJcbn0iXX0=