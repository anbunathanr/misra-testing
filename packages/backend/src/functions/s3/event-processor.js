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
    const logger = (0, logger_1.createLogger)('s3-event-processor', {
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
        const err = error;
        logger.error('S3 event processing failed', err, {
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
        const err = error;
        logger.error('Failed to process S3 record', err, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXZlbnQtcHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGdGQUEyRTtBQUMzRSwrQ0FBa0Q7QUFFbEQ7OztHQUdHO0FBQ0ksTUFBTSxPQUFPLEdBQWMsS0FBSyxFQUNyQyxLQUFjLEVBQ2QsT0FBZ0IsRUFDRCxFQUFFO0lBQ2pCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxZQUFZLENBQUM7SUFDM0MsTUFBTSxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLG9CQUFvQixFQUFFO1FBQ2hELGFBQWE7UUFDYixZQUFZLEVBQUUsb0JBQW9CO0tBQ25DLENBQUMsQ0FBQztJQUVILE1BQU0sQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUU7UUFDakMsV0FBVyxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTTtRQUNqQyxZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7UUFDbEMsZUFBZSxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRTtLQUNwRCxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUM7UUFDSCxtQ0FBbUM7UUFDbkMsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQ0FBbUIsQ0FDMUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxrQ0FBa0MsRUFDdEUsYUFBYSxDQUNkLENBQUM7UUFFRix5QkFBeUI7UUFDekIsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkMsTUFBTSxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN0RCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsRUFBRTtZQUN4RCxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1NBQ2xDLENBQUMsQ0FBQztJQUVMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FB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QVMsQ0FBQztJQUNuQixDQUFDO1NBQU0sQ0FBQztRQUNOLE9BQU8sT0FBTyxDQUFDO0lBQ2pCLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLFNBQWlCO0lBQ3pDLE1BQU0sU0FBUyxHQUFHLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBQzVELE9BQU8sQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakYsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxTQUFpQjtJQUN6QyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDNUQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFMzRXZlbnQsIFMzSGFuZGxlciwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBBdWRpdExvZ2dpbmdTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXVkaXQtbG9nZ2luZy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gdG8gcHJvY2VzcyBTMyBldmVudHMgZm9yIGF1ZGl0IGxvZ2dpbmdcclxuICogVHJpZ2dlcmVkIGJ5IFMzIG9iamVjdCBjcmVhdGlvbiBhbmQgZGVsZXRpb24gZXZlbnRzXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogUzNIYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBTM0V2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTx2b2lkPiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGNvbnRleHQuYXdzUmVxdWVzdElkO1xyXG4gIGNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignczMtZXZlbnQtcHJvY2Vzc29yJywge1xyXG4gICAgY29ycmVsYXRpb25JZCxcclxuICAgIGZ1bmN0aW9uTmFtZTogJ3MzLWV2ZW50LXByb2Nlc3NvcidcclxuICB9KTtcclxuXHJcbiAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgUzMgZXZlbnQnLCB7XHJcbiAgICByZWNvcmRDb3VudDogZXZlbnQuUmVjb3Jkcy5sZW5ndGgsXHJcbiAgICBmdW5jdGlvbk5hbWU6IGNvbnRleHQuZnVuY3Rpb25OYW1lLFxyXG4gICAgcmVtYWluaW5nVGltZU1zOiBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpXHJcbiAgfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBJbml0aWFsaXplIGF1ZGl0IGxvZ2dpbmcgc2VydmljZVxyXG4gICAgY29uc3QgYXVkaXRTZXJ2aWNlID0gbmV3IEF1ZGl0TG9nZ2luZ1NlcnZpY2UoXHJcbiAgICAgIHByb2Nlc3MuZW52LkFVRElUX0xPR19HUk9VUF9OQU1FIHx8ICcvYXdzL2xhbWJkYS9taXNyYS1wbGF0Zm9ybS1hdWRpdCcsXHJcbiAgICAgIGNvcnJlbGF0aW9uSWRcclxuICAgICk7XHJcblxyXG4gICAgLy8gUHJvY2VzcyBhbGwgUzMgcmVjb3Jkc1xyXG4gICAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xyXG4gICAgICBhd2FpdCBwcm9jZXNzUzNSZWNvcmQocmVjb3JkLCBhdWRpdFNlcnZpY2UsIGxvZ2dlcik7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1MzIGV2ZW50IHByb2Nlc3NpbmcgY29tcGxldGVkIHN1Y2Nlc3NmdWxseScsIHtcclxuICAgICAgcmVjb3JkQ291bnQ6IGV2ZW50LlJlY29yZHMubGVuZ3RoXHJcbiAgICB9KTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnN0IGVyciA9IGVycm9yIGFzIEVycm9yO1xyXG4gICAgbG9nZ2VyLmVycm9yKCdTMyBldmVudCBwcm9jZXNzaW5nIGZhaWxlZCcsIGVyciwge1xyXG4gICAgICByZWNvcmRDb3VudDogZXZlbnQuUmVjb3Jkcy5sZW5ndGhcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlLXRocm93IGVycm9yIHRvIHRyaWdnZXIgTGFtYmRhIHJldHJ5IG1lY2hhbmlzbVxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFByb2Nlc3MgaW5kaXZpZHVhbCBTMyByZWNvcmRcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NTM1JlY29yZChcclxuICByZWNvcmQ6IGFueSxcclxuICBhdWRpdFNlcnZpY2U6IEF1ZGl0TG9nZ2luZ1NlcnZpY2UsXHJcbiAgbG9nZ2VyOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVMb2dnZXI+XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBldmVudE5hbWUgPSByZWNvcmQuZXZlbnROYW1lO1xyXG4gICAgY29uc3QgYnVja2V0TmFtZSA9IHJlY29yZC5zMy5idWNrZXQubmFtZTtcclxuICAgIGNvbnN0IG9iamVjdEtleSA9IGRlY29kZVVSSUNvbXBvbmVudChyZWNvcmQuczMub2JqZWN0LmtleS5yZXBsYWNlKC9cXCsvZywgJyAnKSk7XHJcbiAgICBjb25zdCBvYmplY3RTaXplID0gcmVjb3JkLnMzLm9iamVjdC5zaXplO1xyXG4gICAgY29uc3QgZXZlbnRUaW1lID0gcmVjb3JkLmV2ZW50VGltZTtcclxuICAgIGNvbnN0IHNvdXJjZUlQQWRkcmVzcyA9IHJlY29yZC5yZXF1ZXN0UGFyYW1ldGVycz8uc291cmNlSVBBZGRyZXNzO1xyXG4gICAgY29uc3QgdXNlckFnZW50ID0gcmVjb3JkLnJlcXVlc3RQYXJhbWV0ZXJzPy51c2VyQWdlbnQ7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgUzMgcmVjb3JkJywge1xyXG4gICAgICBldmVudE5hbWUsXHJcbiAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgIG9iamVjdEtleSxcclxuICAgICAgb2JqZWN0U2l6ZSxcclxuICAgICAgZXZlbnRUaW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgSUQgZnJvbSBvYmplY3Qga2V5IGlmIHBvc3NpYmxlIChhc3N1bWluZyBmb3JtYXQ6IHVwbG9hZHMve3VzZXJJZH0vLi4uKVxyXG4gICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZEZyb21LZXkob2JqZWN0S2V5KTtcclxuXHJcbiAgICAvLyBMb2cgc2VjdXJpdHkgZXZlbnQgZm9yIGZpbGUgb3BlcmF0aW9uc1xyXG4gICAgaWYgKGV2ZW50TmFtZS5zdGFydHNXaXRoKCdPYmplY3RDcmVhdGVkJykpIHtcclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ1NlY3VyaXR5RXZlbnQoe1xyXG4gICAgICAgIGFjdGlvbjogJ0ZJTEVfVVBMT0FERUQnLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICByZXNvdXJjZUlkOiBvYmplY3RLZXksXHJcbiAgICAgICAgc291cmNlSXA6IHNvdXJjZUlQQWRkcmVzcyxcclxuICAgICAgICB1c2VyQWdlbnQsXHJcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBidWNrZXROYW1lLFxyXG4gICAgICAgICAgb2JqZWN0S2V5LFxyXG4gICAgICAgICAgb2JqZWN0U2l6ZSxcclxuICAgICAgICAgIGV2ZW50VGltZSxcclxuICAgICAgICAgIGV2ZW50TmFtZVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBMb2cgY29tcGxpYW5jZSBldmVudCBmb3IgZGF0YSByZXRlbnRpb25cclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ0NvbXBsaWFuY2VFdmVudCh7XHJcbiAgICAgICAgcmVndWxhdGlvbjogJ0RBVEFfUkVURU5USU9OJyxcclxuICAgICAgICBhY3Rpb246ICdGSUxFX1NUT1JFRCcsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGRhdGFUeXBlOiBnZXRGaWxlVHlwZShvYmplY3RLZXkpLFxyXG4gICAgICAgIHJldGVudGlvbjogJzdfWUVBUlMnLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBvYmplY3RLZXksXHJcbiAgICAgICAgICBvYmplY3RTaXplLFxyXG4gICAgICAgICAgZXZlbnRUaW1lLFxyXG4gICAgICAgICAgc3RvcmFnZUNsYXNzOiAnU1RBTkRBUkQnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICB9IGVsc2UgaWYgKGV2ZW50TmFtZS5zdGFydHNXaXRoKCdPYmplY3RSZW1vdmVkJykpIHtcclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ1NlY3VyaXR5RXZlbnQoe1xyXG4gICAgICAgIGFjdGlvbjogJ0ZJTEVfREVMRVRFRCcsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIHJlc291cmNlSWQ6IG9iamVjdEtleSxcclxuICAgICAgICBzb3VyY2VJcDogc291cmNlSVBBZGRyZXNzLFxyXG4gICAgICAgIHVzZXJBZ2VudCxcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBvYmplY3RLZXksXHJcbiAgICAgICAgICBldmVudFRpbWUsXHJcbiAgICAgICAgICBldmVudE5hbWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTG9nIGNvbXBsaWFuY2UgZXZlbnQgZm9yIGRhdGEgZGVsZXRpb25cclxuICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ0NvbXBsaWFuY2VFdmVudCh7XHJcbiAgICAgICAgcmVndWxhdGlvbjogJ0RBVEFfUkVURU5USU9OJyxcclxuICAgICAgICBhY3Rpb246ICdGSUxFX0RFTEVURUQnLFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBkYXRhVHlwZTogZ2V0RmlsZVR5cGUob2JqZWN0S2V5KSxcclxuICAgICAgICByZXRlbnRpb246ICc3X1lFQVJTJyxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBidWNrZXROYW1lLFxyXG4gICAgICAgICAgb2JqZWN0S2V5LFxyXG4gICAgICAgICAgZXZlbnRUaW1lLFxyXG4gICAgICAgICAgZGVsZXRpb25SZWFzb246ICdVU0VSX0lOSVRJQVRFRCdcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIExvZyBhZGRpdGlvbmFsIGV2ZW50cyBmb3Igc3BlY2lmaWMgZmlsZSB0eXBlc1xyXG4gICAgaWYgKGlzU291cmNlQ29kZUZpbGUob2JqZWN0S2V5KSkge1xyXG4gICAgICBhd2FpdCBhdWRpdFNlcnZpY2UubG9nQ29tcGxpYW5jZUV2ZW50KHtcclxuICAgICAgICByZWd1bGF0aW9uOiAnTUlTUkFfQ09NUExJQU5DRScsXHJcbiAgICAgICAgYWN0aW9uOiBldmVudE5hbWUuc3RhcnRzV2l0aCgnT2JqZWN0Q3JlYXRlZCcpID8gJ1NPVVJDRV9DT0RFX1VQTE9BREVEJyA6ICdTT1VSQ0VfQ09ERV9ERUxFVEVEJyxcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgZGF0YVR5cGU6ICdTT1VSQ0VfQ09ERScsXHJcbiAgICAgICAgcmV0ZW50aW9uOiAnMTBfWUVBUlMnLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBvYmplY3RLZXksXHJcbiAgICAgICAgICBmaWxlRXh0ZW5zaW9uOiBnZXRGaWxlRXh0ZW5zaW9uKG9iamVjdEtleSksXHJcbiAgICAgICAgICBldmVudFRpbWVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc3QgZXJyID0gZXJyb3IgYXMgRXJyb3I7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBwcm9jZXNzIFMzIHJlY29yZCcsIGVyciwge1xyXG4gICAgICBldmVudE5hbWU6IHJlY29yZC5ldmVudE5hbWUsXHJcbiAgICAgIGJ1Y2tldE5hbWU6IHJlY29yZC5zMz8uYnVja2V0Py5uYW1lLFxyXG4gICAgICBvYmplY3RLZXk6IHJlY29yZC5zMz8ub2JqZWN0Py5rZXlcclxuICAgIH0pO1xyXG4gICAgLy8gRG9uJ3QgdGhyb3cgZXJyb3IgaGVyZSB0byBhdm9pZCBmYWlsaW5nIHRoZSBlbnRpcmUgYmF0Y2hcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0IHVzZXIgSUQgZnJvbSBTMyBvYmplY3Qga2V5XHJcbiAqL1xyXG5mdW5jdGlvbiBleHRyYWN0VXNlcklkRnJvbUtleShvYmplY3RLZXk6IHN0cmluZyk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgLy8gQXNzdW1pbmcgZm9ybWF0OiB1cGxvYWRzL3t1c2VySWR9Ly4uLiBvciB1c2Vycy97dXNlcklkfS8uLi5cclxuICBjb25zdCBwYXJ0cyA9IG9iamVjdEtleS5zcGxpdCgnLycpO1xyXG4gIGlmIChwYXJ0cy5sZW5ndGggPj0gMiAmJiAocGFydHNbMF0gPT09ICd1cGxvYWRzJyB8fCBwYXJ0c1swXSA9PT0gJ3VzZXJzJykpIHtcclxuICAgIHJldHVybiBwYXJ0c1sxXTtcclxuICB9XHJcbiAgcmV0dXJuIHVuZGVmaW5lZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIERldGVybWluZSBmaWxlIHR5cGUgZnJvbSBvYmplY3Qga2V5XHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRGaWxlVHlwZShvYmplY3RLZXk6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZ2V0RmlsZUV4dGVuc2lvbihvYmplY3RLZXkpLnRvTG93ZXJDYXNlKCk7XHJcbiAgXHJcbiAgaWYgKFsnLmMnLCAnLmNwcCcsICcuY2MnLCAnLmN4eCcsICcuaCcsICcuaHBwJywgJy5oeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICByZXR1cm4gJ1NPVVJDRV9DT0RFJztcclxuICB9IGVsc2UgaWYgKFsnLnR4dCcsICcubWQnLCAnLmRvYycsICcuZG9jeCcsICcucGRmJ10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgcmV0dXJuICdET0NVTUVOVCc7XHJcbiAgfSBlbHNlIGlmIChbJy5qcGcnLCAnLmpwZWcnLCAnLnBuZycsICcuZ2lmJywgJy5ibXAnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICByZXR1cm4gJ0lNQUdFJztcclxuICB9IGVsc2UgaWYgKFsnLnppcCcsICcudGFyJywgJy5neicsICcucmFyJ10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgcmV0dXJuICdBUkNISVZFJztcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuICdPVEhFUic7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgZmlsZSBpcyBzb3VyY2UgY29kZVxyXG4gKi9cclxuZnVuY3Rpb24gaXNTb3VyY2VDb2RlRmlsZShvYmplY3RLZXk6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGdldEZpbGVFeHRlbnNpb24ob2JqZWN0S2V5KS50b0xvd2VyQ2FzZSgpO1xyXG4gIHJldHVybiBbJy5jJywgJy5jcHAnLCAnLmNjJywgJy5jeHgnLCAnLmgnLCAnLmhwcCcsICcuaHh4J10uaW5jbHVkZXMoZXh0ZW5zaW9uKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBmaWxlIGV4dGVuc2lvbiBmcm9tIG9iamVjdCBrZXlcclxuICovXHJcbmZ1bmN0aW9uIGdldEZpbGVFeHRlbnNpb24ob2JqZWN0S2V5OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGNvbnN0IGxhc3REb3QgPSBvYmplY3RLZXkubGFzdEluZGV4T2YoJy4nKTtcclxuICByZXR1cm4gbGFzdERvdCAhPT0gLTEgPyBvYmplY3RLZXkuc3Vic3RyaW5nKGxhc3REb3QpIDogJyc7XHJcbn0iXX0=