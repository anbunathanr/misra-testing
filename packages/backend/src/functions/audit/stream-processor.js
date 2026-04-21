"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const audit_logging_service_1 = require("../../services/audit-logging-service");
const logger_1 = require("../../utils/logger");
/**
 * Lambda function to process DynamoDB streams for audit logging
 * Triggered by changes to Users, FileMetadata, and AnalysisResults tables
 */
const handler = async (event, context) => {
    const correlationId = context.awsRequestId;
    const logger = (0, logger_1.createLogger)('audit-stream-processor', {
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
        const auditService = new audit_logging_service_1.AuditLoggingService(process.env.AUDIT_LOG_GROUP_NAME || '/aws/lambda/misra-platform-audit', correlationId);
        // Process all records in the stream
        await auditService.processStreamRecords(event.Records);
        // Log additional security events for sensitive operations
        for (const record of event.Records) {
            await logSecurityEvents(record, auditService, logger);
        }
        logger.info('Stream processing completed successfully', {
            recordCount: event.Records.length
        });
    }
    catch (error) {
        logger.error('Stream processing failed', error instanceof Error ? error : new Error(String(error)), {
            recordCount: event.Records.length
        });
        // Re-throw error to trigger Lambda retry mechanism
        throw error;
    }
};
exports.handler = handler;
/**
 * Log additional security events for sensitive operations
 */
async function logSecurityEvents(record, auditService, logger) {
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
            }
            else if (eventName === 'MODIFY') {
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
            }
            else if (eventName === 'REMOVE') {
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
            }
            else if (eventName === 'REMOVE') {
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
    }
    catch (error) {
        const err = error;
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
function extractTableName(eventSourceARN) {
    if (!eventSourceARN)
        return 'unknown';
    const parts = eventSourceARN.split('/');
    return parts.length >= 2 ? parts[1] : 'unknown';
}
function extractUserId(item) {
    if (!item)
        return undefined;
    return item.userId?.S || item.createdBy?.S || item.updatedBy?.S;
}
function extractFileId(item) {
    if (!item)
        return undefined;
    return item.fileId?.S;
}
function extractAnalysisId(item) {
    if (!item)
        return undefined;
    return item.analysisId?.S;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLXByb2Nlc3Nvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN0cmVhbS1wcm9jZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsZ0ZBQTJFO0FBQzNFLCtDQUFrRDtBQUVsRDs7O0dBR0c7QUFDSSxNQUFNLE9BQU8sR0FBMEIsS0FBSyxFQUNqRCxLQUEwQixFQUMxQixPQUFnQixFQUNELEVBQUU7SUFDakIsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsd0JBQXdCLEVBQUU7UUFDcEQsYUFBYTtRQUNiLFlBQVksRUFBRSx3QkFBd0I7S0FDdkMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRTtRQUM5QyxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1FBQ2pDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtRQUNsQyxlQUFlLEVBQUUsT0FBTyxDQUFDLHdCQUF3QixFQUFFO0tBQ3BELENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILG1DQUFtQztRQUNuQyxNQUFNLFlBQVksR0FBRyxJQUFJLDJDQUFtQixDQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixJQUFJLGtDQUFrQyxFQUN0RSxhQUFhLENBQ2QsQ0FBQztRQUVGLG9DQUFvQztRQUNwQyxNQUFNLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFdkQsMERBQTBEO1FBQzFELEtBQUssTUFBTSxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0saUJBQWlCLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsRUFBRTtZQUN0RCxXQUFXLEVBQUUs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O1FBQ0gsdUVBQXVFO0lBQ3pFLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFTLGdCQUFnQixDQUFDLGNBQXVCO0lBQy9DLElBQUksQ0FBQyxjQUFjO1FBQUUsT0FBTyxTQUFTLENBQUM7SUFDdEMsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN4QyxPQUFPLEtBQUssQ0FBQyxNQUFNLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUNsRCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBVTtJQUMvQixJQUFJLENBQUMsSUFBSTtRQUFFLE9BQU8sU0FBUyxDQUFDO0lBQzVCLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7QUFDbEUsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQVU7SUFDL0IsSUFBSSxDQUFDLElBQUk7UUFBRSxPQUFPLFNBQVMsQ0FBQztJQUM1QixPQUFPLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFTLGlCQUFpQixDQUFDLElBQVU7SUFDbkMsSUFBSSxDQUFDLElBQUk7UUFBRSxPQUFPLFNBQVMsQ0FBQztJQUM1QixPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQzVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQlN0cmVhbUV2ZW50LCBEeW5hbW9EQlN0cmVhbUhhbmRsZXIsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQXVkaXRMb2dnaW5nU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2F1ZGl0LWxvZ2dpbmctc2VydmljZSc7XHJcbmltcG9ydCB7IGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcblxyXG4vKipcclxuICogTGFtYmRhIGZ1bmN0aW9uIHRvIHByb2Nlc3MgRHluYW1vREIgc3RyZWFtcyBmb3IgYXVkaXQgbG9nZ2luZ1xyXG4gKiBUcmlnZ2VyZWQgYnkgY2hhbmdlcyB0byBVc2VycywgRmlsZU1ldGFkYXRhLCBhbmQgQW5hbHlzaXNSZXN1bHRzIHRhYmxlc1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IER5bmFtb0RCU3RyZWFtSGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogRHluYW1vREJTdHJlYW1FdmVudCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gIGNvbnN0IGNvcnJlbGF0aW9uSWQgPSBjb250ZXh0LmF3c1JlcXVlc3RJZDtcclxuICBjb25zdCBsb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ2F1ZGl0LXN0cmVhbS1wcm9jZXNzb3InLCB7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgZnVuY3Rpb25OYW1lOiAnYXVkaXQtc3RyZWFtLXByb2Nlc3NvcidcclxuICB9KTtcclxuXHJcbiAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgRHluYW1vREIgc3RyZWFtIGV2ZW50Jywge1xyXG4gICAgcmVjb3JkQ291bnQ6IGV2ZW50LlJlY29yZHMubGVuZ3RoLFxyXG4gICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgIHJlbWFpbmluZ1RpbWVNczogY29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMoKVxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gSW5pdGlhbGl6ZSBhdWRpdCBsb2dnaW5nIHNlcnZpY2VcclxuICAgIGNvbnN0IGF1ZGl0U2VydmljZSA9IG5ldyBBdWRpdExvZ2dpbmdTZXJ2aWNlKFxyXG4gICAgICBwcm9jZXNzLmVudi5BVURJVF9MT0dfR1JPVVBfTkFNRSB8fCAnL2F3cy9sYW1iZGEvbWlzcmEtcGxhdGZvcm0tYXVkaXQnLFxyXG4gICAgICBjb3JyZWxhdGlvbklkXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFByb2Nlc3MgYWxsIHJlY29yZHMgaW4gdGhlIHN0cmVhbVxyXG4gICAgYXdhaXQgYXVkaXRTZXJ2aWNlLnByb2Nlc3NTdHJlYW1SZWNvcmRzKGV2ZW50LlJlY29yZHMpO1xyXG5cclxuICAgIC8vIExvZyBhZGRpdGlvbmFsIHNlY3VyaXR5IGV2ZW50cyBmb3Igc2Vuc2l0aXZlIG9wZXJhdGlvbnNcclxuICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgICAgYXdhaXQgbG9nU2VjdXJpdHlFdmVudHMocmVjb3JkLCBhdWRpdFNlcnZpY2UsIGxvZ2dlcik7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1N0cmVhbSBwcm9jZXNzaW5nIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIHJlY29yZENvdW50OiBldmVudC5SZWNvcmRzLmxlbmd0aFxyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ1N0cmVhbSBwcm9jZXNzaW5nIGZhaWxlZCcsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKSwge1xyXG4gICAgICByZWNvcmRDb3VudDogZXZlbnQuUmVjb3Jkcy5sZW5ndGhcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlLXRocm93IGVycm9yIHRvIHRyaWdnZXIgTGFtYmRhIHJldHJ5IG1lY2hhbmlzbVxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIExvZyBhZGRpdGlvbmFsIHNlY3VyaXR5IGV2ZW50cyBmb3Igc2Vuc2l0aXZlIG9wZXJhdGlvbnNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGxvZ1NlY3VyaXR5RXZlbnRzKFxyXG4gIHJlY29yZDogYW55LFxyXG4gIGF1ZGl0U2VydmljZTogQXVkaXRMb2dnaW5nU2VydmljZSxcclxuICBsb2dnZXI6IFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZUxvZ2dlcj5cclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IGV4dHJhY3RUYWJsZU5hbWUocmVjb3JkLmV2ZW50U291cmNlQVJOKTtcclxuICAgIGNvbnN0IGV2ZW50TmFtZSA9IHJlY29yZC5ldmVudE5hbWU7XHJcblxyXG4gICAgLy8gTG9nIHNlY3VyaXR5IGV2ZW50cyBmb3IgdXNlciB0YWJsZSBjaGFuZ2VzXHJcbiAgICBpZiAodGFibGVOYW1lLmluY2x1ZGVzKCd1c2VycycpICYmIHJlY29yZC5keW5hbW9kYikge1xyXG4gICAgICBjb25zdCB1c2VySWQgPSBleHRyYWN0VXNlcklkKHJlY29yZC5keW5hbW9kYi5OZXdJbWFnZSB8fCByZWNvcmQuZHluYW1vZGIuT2xkSW1hZ2UpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGV2ZW50TmFtZSA9PT0gJ0lOU0VSVCcpIHtcclxuICAgICAgICBhd2FpdCBhdWRpdFNlcnZpY2UubG9nU2VjdXJpdHlFdmVudCh7XHJcbiAgICAgICAgICBhY3Rpb246ICdVU0VSX0NSRUFURUQnLFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgICAgdGFibGVOYW1lLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2UgaWYgKGV2ZW50TmFtZSA9PT0gJ01PRElGWScpIHtcclxuICAgICAgICAvLyBDaGVjayBpZiBzZW5zaXRpdmUgZmllbGRzIHdlcmUgbW9kaWZpZWRcclxuICAgICAgICBjb25zdCBvbGRJbWFnZSA9IHJlY29yZC5keW5hbW9kYi5PbGRJbWFnZTtcclxuICAgICAgICBjb25zdCBuZXdJbWFnZSA9IHJlY29yZC5keW5hbW9kYi5OZXdJbWFnZTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAob2xkSW1hZ2UgJiYgbmV3SW1hZ2UpIHtcclxuICAgICAgICAgIGNvbnN0IHNlbnNpdGl2ZUZpZWxkcyA9IFsnZW1haWwnLCAncm9sZScsICdtZmFTZXR1cENvbXBsZXRlJywgJ29yZ2FuaXphdGlvbklkJ107XHJcbiAgICAgICAgICBjb25zdCBjaGFuZ2VkRmllbGRzID0gW107XHJcblxyXG4gICAgICAgICAgZm9yIChjb25zdCBmaWVsZCBvZiBzZW5zaXRpdmVGaWVsZHMpIHtcclxuICAgICAgICAgICAgaWYgKG9sZEltYWdlW2ZpZWxkXT8uUyAhPT0gbmV3SW1hZ2VbZmllbGRdPy5TKSB7XHJcbiAgICAgICAgICAgICAgY2hhbmdlZEZpZWxkcy5wdXNoKGZpZWxkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmIChjaGFuZ2VkRmllbGRzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ1NlY3VyaXR5RXZlbnQoe1xyXG4gICAgICAgICAgICAgIGFjdGlvbjogJ1VTRVJfU0VOU0lUSVZFX0RBVEFfTU9ESUZJRUQnLFxyXG4gICAgICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHMsXHJcbiAgICAgICAgICAgICAgICB0YWJsZU5hbWUsXHJcbiAgICAgICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9IGVsc2UgaWYgKGV2ZW50TmFtZSA9PT0gJ1JFTU9WRScpIHtcclxuICAgICAgICBhd2FpdCBhdWRpdFNlcnZpY2UubG9nU2VjdXJpdHlFdmVudCh7XHJcbiAgICAgICAgICBhY3Rpb246ICdVU0VSX0RFTEVURUQnLFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgICAgdGFibGVOYW1lLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTG9nIGNvbXBsaWFuY2UgZXZlbnRzIGZvciBmaWxlIG9wZXJhdGlvbnNcclxuICAgIGlmICh0YWJsZU5hbWUuaW5jbHVkZXMoJ2ZpbGUtbWV0YWRhdGEnKSAmJiByZWNvcmQuZHluYW1vZGIpIHtcclxuICAgICAgY29uc3QgZmlsZUlkID0gZXh0cmFjdEZpbGVJZChyZWNvcmQuZHluYW1vZGIuTmV3SW1hZ2UgfHwgcmVjb3JkLmR5bmFtb2RiLk9sZEltYWdlKTtcclxuICAgICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZChyZWNvcmQuZHluYW1vZGIuTmV3SW1hZ2UgfHwgcmVjb3JkLmR5bmFtb2RiLk9sZEltYWdlKTtcclxuXHJcbiAgICAgIGlmIChldmVudE5hbWUgPT09ICdJTlNFUlQnKSB7XHJcbiAgICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ0NvbXBsaWFuY2VFdmVudCh7XHJcbiAgICAgICAgICByZWd1bGF0aW9uOiAnREFUQV9SRVRFTlRJT04nLFxyXG4gICAgICAgICAgYWN0aW9uOiAnRklMRV9VUExPQURFRCcsXHJcbiAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICBkYXRhVHlwZTogJ1NPVVJDRV9DT0RFJyxcclxuICAgICAgICAgIHJldGVudGlvbjogJzdfWUVBUlMnLFxyXG4gICAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIGlmIChldmVudE5hbWUgPT09ICdSRU1PVkUnKSB7XHJcbiAgICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ0NvbXBsaWFuY2VFdmVudCh7XHJcbiAgICAgICAgICByZWd1bGF0aW9uOiAnREFUQV9SRVRFTlRJT04nLFxyXG4gICAgICAgICAgYWN0aW9uOiAnRklMRV9ERUxFVEVEJyxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIGRhdGFUeXBlOiAnU09VUkNFX0NPREUnLFxyXG4gICAgICAgICAgcmV0ZW50aW9uOiAnN19ZRUFSUycsXHJcbiAgICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICAgIGZpbGVJZCxcclxuICAgICAgICAgICAgdGFibGVOYW1lLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gTG9nIGNvbXBsaWFuY2UgZXZlbnRzIGZvciBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBpZiAodGFibGVOYW1lLmluY2x1ZGVzKCdhbmFseXNpcy1yZXN1bHRzJykgJiYgcmVjb3JkLmR5bmFtb2RiKSB7XHJcbiAgICAgIGNvbnN0IGFuYWx5c2lzSWQgPSBleHRyYWN0QW5hbHlzaXNJZChyZWNvcmQuZHluYW1vZGIuTmV3SW1hZ2UgfHwgcmVjb3JkLmR5bmFtb2RiLk9sZEltYWdlKTtcclxuICAgICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZChyZWNvcmQuZHluYW1vZGIuTmV3SW1hZ2UgfHwgcmVjb3JkLmR5bmFtb2RiLk9sZEltYWdlKTtcclxuXHJcbiAgICAgIGlmIChldmVudE5hbWUgPT09ICdJTlNFUlQnKSB7XHJcbiAgICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ0NvbXBsaWFuY2VFdmVudCh7XHJcbiAgICAgICAgICByZWd1bGF0aW9uOiAnTUlTUkFfQ09NUExJQU5DRScsXHJcbiAgICAgICAgICBhY3Rpb246ICdBTkFMWVNJU19DT01QTEVURUQnLFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgZGF0YVR5cGU6ICdDT01QTElBTkNFX1JFUE9SVCcsXHJcbiAgICAgICAgICByZXRlbnRpb246ICcxMF9ZRUFSUycsXHJcbiAgICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc3QgZXJyID0gZXJyb3IgYXMgRXJyb3I7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ0ZhaWxlZCB0byBsb2cgc2VjdXJpdHkgZXZlbnQnLCBlcnIsIHtcclxuICAgICAgcmVjb3JkRXZlbnROYW1lOiByZWNvcmQuZXZlbnROYW1lLFxyXG4gICAgICB0YWJsZU5hbWU6IGV4dHJhY3RUYWJsZU5hbWUocmVjb3JkLmV2ZW50U291cmNlQVJOKVxyXG4gICAgfSk7XHJcbiAgICAvLyBEb24ndCB0aHJvdyBlcnJvciBoZXJlIHRvIGF2b2lkIGZhaWxpbmcgdGhlIGVudGlyZSBzdHJlYW0gcHJvY2Vzc2luZ1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEhlbHBlciBmdW5jdGlvbnMgdG8gZXh0cmFjdCBkYXRhIGZyb20gRHluYW1vREIgcmVjb3Jkc1xyXG4gKi9cclxuZnVuY3Rpb24gZXh0cmFjdFRhYmxlTmFtZShldmVudFNvdXJjZUFSTj86IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgaWYgKCFldmVudFNvdXJjZUFSTikgcmV0dXJuICd1bmtub3duJztcclxuICBjb25zdCBwYXJ0cyA9IGV2ZW50U291cmNlQVJOLnNwbGl0KCcvJyk7XHJcbiAgcmV0dXJuIHBhcnRzLmxlbmd0aCA+PSAyID8gcGFydHNbMV0gOiAndW5rbm93bic7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RVc2VySWQoaXRlbT86IGFueSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgaWYgKCFpdGVtKSByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIHJldHVybiBpdGVtLnVzZXJJZD8uUyB8fCBpdGVtLmNyZWF0ZWRCeT8uUyB8fCBpdGVtLnVwZGF0ZWRCeT8uUztcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEZpbGVJZChpdGVtPzogYW55KTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICBpZiAoIWl0ZW0pIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgcmV0dXJuIGl0ZW0uZmlsZUlkPy5TO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0QW5hbHlzaXNJZChpdGVtPzogYW55KTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICBpZiAoIWl0ZW0pIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgcmV0dXJuIGl0ZW0uYW5hbHlzaXNJZD8uUztcclxufSJdfQ==