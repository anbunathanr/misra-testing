import { S3Event, S3Handler, Context } from 'aws-lambda';
import { AuditLoggingService } from '../../services/audit-logging-service';
import { createLogger } from '../../utils/logger';

/**
 * Lambda function to process S3 events for audit logging
 * Triggered by S3 object creation and deletion events
 */
export const handler: S3Handler = async (
  event: S3Event,
  context: Context
): Promise<void> => {
  const correlationId = context.awsRequestId;
  const logger = createLogger('s3-event-processor', {
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
    const auditService = new AuditLoggingService(
      process.env.AUDIT_LOG_GROUP_NAME || '/aws/lambda/misra-platform-audit',
      correlationId
    );

    // Process all S3 records
    for (const record of event.Records) {
      await processS3Record(record, auditService, logger);
    }

    logger.info('S3 event processing completed successfully', {
      recordCount: event.Records.length
    });

  } catch (error) {
    const err = error as Error;
    logger.error('S3 event processing failed', err, {
      recordCount: event.Records.length
    });

    // Re-throw error to trigger Lambda retry mechanism
    throw error;
  }
};

/**
 * Process individual S3 record
 */
async function processS3Record(
  record: any,
  auditService: AuditLoggingService,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
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

    } else if (eventName.startsWith('ObjectRemoved')) {
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

  } catch (error) {
    const err = error as Error;
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
function extractUserIdFromKey(objectKey: string): string | undefined {
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
function getFileType(objectKey: string): string {
  const extension = getFileExtension(objectKey).toLowerCase();
  
  if (['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].includes(extension)) {
    return 'SOURCE_CODE';
  } else if (['.txt', '.md', '.doc', '.docx', '.pdf'].includes(extension)) {
    return 'DOCUMENT';
  } else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(extension)) {
    return 'IMAGE';
  } else if (['.zip', '.tar', '.gz', '.rar'].includes(extension)) {
    return 'ARCHIVE';
  } else {
    return 'OTHER';
  }
}

/**
 * Check if file is source code
 */
function isSourceCodeFile(objectKey: string): boolean {
  const extension = getFileExtension(objectKey).toLowerCase();
  return ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'].includes(extension);
}

/**
 * Get file extension from object key
 */
function getFileExtension(objectKey: string): string {
  const lastDot = objectKey.lastIndexOf('.');
  return lastDot !== -1 ? objectKey.substring(lastDot) : '';
}