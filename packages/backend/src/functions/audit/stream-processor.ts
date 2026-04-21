import { DynamoDBStreamEvent, DynamoDBStreamHandler, Context } from 'aws-lambda';
import { AuditLoggingService } from '../../services/audit-logging-service';
import { createLogger } from '../../utils/logger';

/**
 * Lambda function to process DynamoDB streams for audit logging
 * Triggered by changes to Users, FileMetadata, and AnalysisResults tables
 */
export const handler: DynamoDBStreamHandler = async (
  event: DynamoDBStreamEvent,
  context: Context
): Promise<void> => {
  const correlationId = context.awsRequestId;
  const logger = createLogger('audit-stream-processor', {
    correlationId,
    functionName: 'audit-stream-processor'
  });

  logger.info('Processing DynamoDB stream event', {
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

    // Process all records in the stream
    await auditService.processStreamRecords(event.Records);

    // Log additional security events for sensitive operations
    for (const record of event.Records) {
      await logSecurityEvents(record, auditService, logger);
    }

    logger.info('Stream processing completed successfully', {
      recordCount: event.Records.length
    });

  } catch (error) {
    logger.error('Stream processing failed', error instanceof Error ? error : new Error(String(error)), {
      recordCount: event.Records.length
    });

    // Re-throw error to trigger Lambda retry mechanism
    throw error;
  }
};

/**
 * Log additional security events for sensitive operations
 */
async function logSecurityEvents(
  record: any,
  auditService: AuditLoggingService,
  logger: ReturnType<typeof createLogger>
): Promise<void> {
  try {
    const tableName = extractTableName(record.eventSourceARN);
    const eventName = record.eventName;

    // Log security events for user table changes
    if (tableName.includes('users') && record.dynamodb) {
      const userId = extractUserId(record.dynamodb.NewImage || record.dynamodb.OldImage);
      
      if (eventName === 'INSERT') {
        await auditService.logSecurityEvent({
          action: 'USER_CREATED',
          userId,
          success: true,
          details: {
            tableName,
            timestamp: new Date().toISOString()
          }
        });
      } else if (eventName === 'MODIFY') {
        // Check if sensitive fields were modified
        const oldImage = record.dynamodb.OldImage;
        const newImage = record.dynamodb.NewImage;
        
        if (oldImage && newImage) {
          const sensitiveFields = ['email', 'role', 'mfaSetupComplete', 'organizationId'];
          const changedFields = [];

          for (const field of sensitiveFields) {
            if (oldImage[field]?.S !== newImage[field]?.S) {
              changedFields.push(field);
            }
          }

          if (changedFields.length > 0) {
            await auditService.logSecurityEvent({
              action: 'USER_SENSITIVE_DATA_MODIFIED',
              userId,
              success: true,
              details: {
                changedFields,
                tableName,
                timestamp: new Date().toISOString()
              }
            });
          }
        }
      } else if (eventName === 'REMOVE') {
        await auditService.logSecurityEvent({
          action: 'USER_DELETED',
          userId,
          success: true,
          details: {
            tableName,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Log compliance events for file operations
    if (tableName.includes('file-metadata') && record.dynamodb) {
      const fileId = extractFileId(record.dynamodb.NewImage || record.dynamodb.OldImage);
      const userId = extractUserId(record.dynamodb.NewImage || record.dynamodb.OldImage);

      if (eventName === 'INSERT') {
        await auditService.logComplianceEvent({
          regulation: 'DATA_RETENTION',
          action: 'FILE_UPLOADED',
          userId,
          dataType: 'SOURCE_CODE',
          retention: '7_YEARS',
          details: {
            fileId,
            tableName,
            timestamp: new Date().toISOString()
          }
        });
      } else if (eventName === 'REMOVE') {
        await auditService.logComplianceEvent({
          regulation: 'DATA_RETENTION',
          action: 'FILE_DELETED',
          userId,
          dataType: 'SOURCE_CODE',
          retention: '7_YEARS',
          details: {
            fileId,
            tableName,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Log compliance events for analysis results
    if (tableName.includes('analysis-results') && record.dynamodb) {
      const analysisId = extractAnalysisId(record.dynamodb.NewImage || record.dynamodb.OldImage);
      const userId = extractUserId(record.dynamodb.NewImage || record.dynamodb.OldImage);

      if (eventName === 'INSERT') {
        await auditService.logComplianceEvent({
          regulation: 'MISRA_COMPLIANCE',
          action: 'ANALYSIS_COMPLETED',
          userId,
          dataType: 'COMPLIANCE_REPORT',
          retention: '10_YEARS',
          details: {
            analysisId,
            tableName,
            timestamp: new Date().toISOString()
          }
        });
      }
    }

  } catch (error) {
    const err = error as Error;
    logger.error('Failed to log security event', err, {
      recordEventName: record.eventName,
      tableName: extractTableName(record.eventSourceARN)
    });
    // Don't throw error here to avoid failing the entire stream processing
  }
}

/**
 * Helper functions to extract data from DynamoDB records
 */
function extractTableName(eventSourceARN?: string): string {
  if (!eventSourceARN) return 'unknown';
  const parts = eventSourceARN.split('/');
  return parts.length >= 2 ? parts[1] : 'unknown';
}

function extractUserId(item?: any): string | undefined {
  if (!item) return undefined;
  return item.userId?.S || item.createdBy?.S || item.updatedBy?.S;
}

function extractFileId(item?: any): string | undefined {
  if (!item) return undefined;
  return item.fileId?.S;
}

function extractAnalysisId(item?: any): string | undefined {
  if (!item) return undefined;
  return item.analysisId?.S;
}