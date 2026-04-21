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
    const logger = (0, logger_1.createLogger)({
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
        logger.error('Stream processing failed', {
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
        logger.error('Failed to log security event', {
            error: error.message,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtLXByb2Nlc3Nvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInN0cmVhbS1wcm9jZXNzb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsZ0ZBQTJFO0FBQzNFLCtDQUFrRDtBQUVsRDs7O0dBR0c7QUFDSSxNQUFNLE9BQU8sR0FBMEIsS0FBSyxFQUNqRCxLQUEwQixFQUMxQixPQUFnQixFQUNELEVBQUU7SUFDakIsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQztJQUMzQyxNQUFNLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUM7UUFDMUIsYUFBYTtRQUNiLFlBQVksRUFBRSx3QkFBd0I7S0FDdkMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxDQUFDLElBQUksQ0FBQyxrQ0FBa0MsRUFBRTtRQUM5QyxXQUFXLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNO1FBQ2pDLFlBQVksRUFBRSxPQUFPLENBQUMsWUFBWTtRQUNsQyxlQUFlLEVBQUUsT0FBTyxDQUFDLHdCQUF3QixFQUFFO0tBQ3BELENBQUMsQ0FBQztJQUVILElBQUksQ0FBQztRQUNILG1DQUFtQztRQUNuQyxNQUFNLFlBQVksR0FBRyxJQUFJLDJDQUFtQixDQUMxQyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixJQUFJLGtDQUFrQyxFQUN0RSxhQUFhLENBQ2QsQ0FBQztRQUVGLG9DQUFvQztRQUNwQyxNQUFNLFlBQVksQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7UUFFdkQsMERBQTBEO1FBQzFELEtBQUssTUFBTSxNQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25DLE1BQU0saUJBQWlCLENBQUMsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksQ0FBQywwQ0FBMEMsRUFBRTtZQUN0RCxXQUFXLEVBQUUsS0FBSyxDQUFDLE9B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Z0JBQWdCLENBQUMsY0FBdUI7SUFDL0MsSUFBSSxDQUFDLGNBQWM7UUFBRSxPQUFPLFNBQVMsQ0FBQztJQUN0QyxNQUFNLEtBQUssR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3hDLE9BQU8sS0FBSyxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ2xELENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFVO0lBQy9CLElBQUksQ0FBQyxJQUFJO1FBQUUsT0FBTyxTQUFTLENBQUM7SUFDNUIsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQztBQUNsRSxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsSUFBVTtJQUMvQixJQUFJLENBQUMsSUFBSTtRQUFFLE9BQU8sU0FBUyxDQUFDO0lBQzVCLE9BQU8sSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7QUFDeEIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBVTtJQUNuQyxJQUFJLENBQUMsSUFBSTtRQUFFLE9BQU8sU0FBUyxDQUFDO0lBQzVCLE9BQU8sSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7QUFDNUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCU3RyZWFtRXZlbnQsIER5bmFtb0RCU3RyZWFtSGFuZGxlciwgQ29udGV4dCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBBdWRpdExvZ2dpbmdTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYXVkaXQtbG9nZ2luZy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gdG8gcHJvY2VzcyBEeW5hbW9EQiBzdHJlYW1zIGZvciBhdWRpdCBsb2dnaW5nXHJcbiAqIFRyaWdnZXJlZCBieSBjaGFuZ2VzIHRvIFVzZXJzLCBGaWxlTWV0YWRhdGEsIGFuZCBBbmFseXNpc1Jlc3VsdHMgdGFibGVzXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlcjogRHluYW1vREJTdHJlYW1IYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBEeW5hbW9EQlN0cmVhbUV2ZW50LFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTx2b2lkPiA9PiB7XHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGNvbnRleHQuYXdzUmVxdWVzdElkO1xyXG4gIGNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcih7XHJcbiAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgZnVuY3Rpb25OYW1lOiAnYXVkaXQtc3RyZWFtLXByb2Nlc3NvcidcclxuICB9KTtcclxuXHJcbiAgbG9nZ2VyLmluZm8oJ1Byb2Nlc3NpbmcgRHluYW1vREIgc3RyZWFtIGV2ZW50Jywge1xyXG4gICAgcmVjb3JkQ291bnQ6IGV2ZW50LlJlY29yZHMubGVuZ3RoLFxyXG4gICAgZnVuY3Rpb25OYW1lOiBjb250ZXh0LmZ1bmN0aW9uTmFtZSxcclxuICAgIHJlbWFpbmluZ1RpbWVNczogY29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMoKVxyXG4gIH0pO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gSW5pdGlhbGl6ZSBhdWRpdCBsb2dnaW5nIHNlcnZpY2VcclxuICAgIGNvbnN0IGF1ZGl0U2VydmljZSA9IG5ldyBBdWRpdExvZ2dpbmdTZXJ2aWNlKFxyXG4gICAgICBwcm9jZXNzLmVudi5BVURJVF9MT0dfR1JPVVBfTkFNRSB8fCAnL2F3cy9sYW1iZGEvbWlzcmEtcGxhdGZvcm0tYXVkaXQnLFxyXG4gICAgICBjb3JyZWxhdGlvbklkXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFByb2Nlc3MgYWxsIHJlY29yZHMgaW4gdGhlIHN0cmVhbVxyXG4gICAgYXdhaXQgYXVkaXRTZXJ2aWNlLnByb2Nlc3NTdHJlYW1SZWNvcmRzKGV2ZW50LlJlY29yZHMpO1xyXG5cclxuICAgIC8vIExvZyBhZGRpdGlvbmFsIHNlY3VyaXR5IGV2ZW50cyBmb3Igc2Vuc2l0aXZlIG9wZXJhdGlvbnNcclxuICAgIGZvciAoY29uc3QgcmVjb3JkIG9mIGV2ZW50LlJlY29yZHMpIHtcclxuICAgICAgYXdhaXQgbG9nU2VjdXJpdHlFdmVudHMocmVjb3JkLCBhdWRpdFNlcnZpY2UsIGxvZ2dlcik7XHJcbiAgICB9XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ1N0cmVhbSBwcm9jZXNzaW5nIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIHJlY29yZENvdW50OiBldmVudC5SZWNvcmRzLmxlbmd0aFxyXG4gICAgfSk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBsb2dnZXIuZXJyb3IoJ1N0cmVhbSBwcm9jZXNzaW5nIGZhaWxlZCcsIHtcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcclxuICAgICAgcmVjb3JkQ291bnQ6IGV2ZW50LlJlY29yZHMubGVuZ3RoXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZS10aHJvdyBlcnJvciB0byB0cmlnZ2VyIExhbWJkYSByZXRyeSBtZWNoYW5pc21cclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBMb2cgYWRkaXRpb25hbCBzZWN1cml0eSBldmVudHMgZm9yIHNlbnNpdGl2ZSBvcGVyYXRpb25zXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBsb2dTZWN1cml0eUV2ZW50cyhcclxuICByZWNvcmQ6IGFueSxcclxuICBhdWRpdFNlcnZpY2U6IEF1ZGl0TG9nZ2luZ1NlcnZpY2UsXHJcbiAgbG9nZ2VyOiBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVMb2dnZXI+XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB0YWJsZU5hbWUgPSBleHRyYWN0VGFibGVOYW1lKHJlY29yZC5ldmVudFNvdXJjZUFSTik7XHJcbiAgICBjb25zdCBldmVudE5hbWUgPSByZWNvcmQuZXZlbnROYW1lO1xyXG5cclxuICAgIC8vIExvZyBzZWN1cml0eSBldmVudHMgZm9yIHVzZXIgdGFibGUgY2hhbmdlc1xyXG4gICAgaWYgKHRhYmxlTmFtZS5pbmNsdWRlcygndXNlcnMnKSAmJiByZWNvcmQuZHluYW1vZGIpIHtcclxuICAgICAgY29uc3QgdXNlcklkID0gZXh0cmFjdFVzZXJJZChyZWNvcmQuZHluYW1vZGIuTmV3SW1hZ2UgfHwgcmVjb3JkLmR5bmFtb2RiLk9sZEltYWdlKTtcclxuICAgICAgXHJcbiAgICAgIGlmIChldmVudE5hbWUgPT09ICdJTlNFUlQnKSB7XHJcbiAgICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ1NlY3VyaXR5RXZlbnQoe1xyXG4gICAgICAgICAgYWN0aW9uOiAnVVNFUl9DUkVBVEVEJyxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIGlmIChldmVudE5hbWUgPT09ICdNT0RJRlknKSB7XHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgc2Vuc2l0aXZlIGZpZWxkcyB3ZXJlIG1vZGlmaWVkXHJcbiAgICAgICAgY29uc3Qgb2xkSW1hZ2UgPSByZWNvcmQuZHluYW1vZGIuT2xkSW1hZ2U7XHJcbiAgICAgICAgY29uc3QgbmV3SW1hZ2UgPSByZWNvcmQuZHluYW1vZGIuTmV3SW1hZ2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKG9sZEltYWdlICYmIG5ld0ltYWdlKSB7XHJcbiAgICAgICAgICBjb25zdCBzZW5zaXRpdmVGaWVsZHMgPSBbJ2VtYWlsJywgJ3JvbGUnLCAnbWZhU2V0dXBDb21wbGV0ZScsICdvcmdhbml6YXRpb25JZCddO1xyXG4gICAgICAgICAgY29uc3QgY2hhbmdlZEZpZWxkcyA9IFtdO1xyXG5cclxuICAgICAgICAgIGZvciAoY29uc3QgZmllbGQgb2Ygc2Vuc2l0aXZlRmllbGRzKSB7XHJcbiAgICAgICAgICAgIGlmIChvbGRJbWFnZVtmaWVsZF0/LlMgIT09IG5ld0ltYWdlW2ZpZWxkXT8uUykge1xyXG4gICAgICAgICAgICAgIGNoYW5nZWRGaWVsZHMucHVzaChmaWVsZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoY2hhbmdlZEZpZWxkcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGF3YWl0IGF1ZGl0U2VydmljZS5sb2dTZWN1cml0eUV2ZW50KHtcclxuICAgICAgICAgICAgICBhY3Rpb246ICdVU0VSX1NFTlNJVElWRV9EQVRBX01PRElGSUVEJyxcclxuICAgICAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICAgICAgICBjaGFuZ2VkRmllbGRzLFxyXG4gICAgICAgICAgICAgICAgdGFibGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSBlbHNlIGlmIChldmVudE5hbWUgPT09ICdSRU1PVkUnKSB7XHJcbiAgICAgICAgYXdhaXQgYXVkaXRTZXJ2aWNlLmxvZ1NlY3VyaXR5RXZlbnQoe1xyXG4gICAgICAgICAgYWN0aW9uOiAnVVNFUl9ERUxFVEVEJyxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIExvZyBjb21wbGlhbmNlIGV2ZW50cyBmb3IgZmlsZSBvcGVyYXRpb25zXHJcbiAgICBpZiAodGFibGVOYW1lLmluY2x1ZGVzKCdmaWxlLW1ldGFkYXRhJykgJiYgcmVjb3JkLmR5bmFtb2RiKSB7XHJcbiAgICAgIGNvbnN0IGZpbGVJZCA9IGV4dHJhY3RGaWxlSWQocmVjb3JkLmR5bmFtb2RiLk5ld0ltYWdlIHx8IHJlY29yZC5keW5hbW9kYi5PbGRJbWFnZSk7XHJcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dHJhY3RVc2VySWQocmVjb3JkLmR5bmFtb2RiLk5ld0ltYWdlIHx8IHJlY29yZC5keW5hbW9kYi5PbGRJbWFnZSk7XHJcblxyXG4gICAgICBpZiAoZXZlbnROYW1lID09PSAnSU5TRVJUJykge1xyXG4gICAgICAgIGF3YWl0IGF1ZGl0U2VydmljZS5sb2dDb21wbGlhbmNlRXZlbnQoe1xyXG4gICAgICAgICAgcmVndWxhdGlvbjogJ0RBVEFfUkVURU5USU9OJyxcclxuICAgICAgICAgIGFjdGlvbjogJ0ZJTEVfVVBMT0FERUQnLFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgZGF0YVR5cGU6ICdTT1VSQ0VfQ09ERScsXHJcbiAgICAgICAgICByZXRlbnRpb246ICc3X1lFQVJTJyxcclxuICAgICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgICB0YWJsZU5hbWUsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSBpZiAoZXZlbnROYW1lID09PSAnUkVNT1ZFJykge1xyXG4gICAgICAgIGF3YWl0IGF1ZGl0U2VydmljZS5sb2dDb21wbGlhbmNlRXZlbnQoe1xyXG4gICAgICAgICAgcmVndWxhdGlvbjogJ0RBVEFfUkVURU5USU9OJyxcclxuICAgICAgICAgIGFjdGlvbjogJ0ZJTEVfREVMRVRFRCcsXHJcbiAgICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgICBkYXRhVHlwZTogJ1NPVVJDRV9DT0RFJyxcclxuICAgICAgICAgIHJldGVudGlvbjogJzdfWUVBUlMnLFxyXG4gICAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIExvZyBjb21wbGlhbmNlIGV2ZW50cyBmb3IgYW5hbHlzaXMgcmVzdWx0c1xyXG4gICAgaWYgKHRhYmxlTmFtZS5pbmNsdWRlcygnYW5hbHlzaXMtcmVzdWx0cycpICYmIHJlY29yZC5keW5hbW9kYikge1xyXG4gICAgICBjb25zdCBhbmFseXNpc0lkID0gZXh0cmFjdEFuYWx5c2lzSWQocmVjb3JkLmR5bmFtb2RiLk5ld0ltYWdlIHx8IHJlY29yZC5keW5hbW9kYi5PbGRJbWFnZSk7XHJcbiAgICAgIGNvbnN0IHVzZXJJZCA9IGV4dHJhY3RVc2VySWQocmVjb3JkLmR5bmFtb2RiLk5ld0ltYWdlIHx8IHJlY29yZC5keW5hbW9kYi5PbGRJbWFnZSk7XHJcblxyXG4gICAgICBpZiAoZXZlbnROYW1lID09PSAnSU5TRVJUJykge1xyXG4gICAgICAgIGF3YWl0IGF1ZGl0U2VydmljZS5sb2dDb21wbGlhbmNlRXZlbnQoe1xyXG4gICAgICAgICAgcmVndWxhdGlvbjogJ01JU1JBX0NPTVBMSUFOQ0UnLFxyXG4gICAgICAgICAgYWN0aW9uOiAnQU5BTFlTSVNfQ09NUExFVEVEJyxcclxuICAgICAgICAgIHVzZXJJZCxcclxuICAgICAgICAgIGRhdGFUeXBlOiAnQ09NUExJQU5DRV9SRVBPUlQnLFxyXG4gICAgICAgICAgcmV0ZW50aW9uOiAnMTBfWUVBUlMnLFxyXG4gICAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgICAgICB0YWJsZU5hbWUsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGxvZ2dlci5lcnJvcignRmFpbGVkIHRvIGxvZyBzZWN1cml0eSBldmVudCcsIHtcclxuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHJlY29yZEV2ZW50TmFtZTogcmVjb3JkLmV2ZW50TmFtZSxcclxuICAgICAgdGFibGVOYW1lOiBleHRyYWN0VGFibGVOYW1lKHJlY29yZC5ldmVudFNvdXJjZUFSTilcclxuICAgIH0pO1xyXG4gICAgLy8gRG9uJ3QgdGhyb3cgZXJyb3IgaGVyZSB0byBhdm9pZCBmYWlsaW5nIHRoZSBlbnRpcmUgc3RyZWFtIHByb2Nlc3NpbmdcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWxwZXIgZnVuY3Rpb25zIHRvIGV4dHJhY3QgZGF0YSBmcm9tIER5bmFtb0RCIHJlY29yZHNcclxuICovXHJcbmZ1bmN0aW9uIGV4dHJhY3RUYWJsZU5hbWUoZXZlbnRTb3VyY2VBUk4/OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghZXZlbnRTb3VyY2VBUk4pIHJldHVybiAndW5rbm93bic7XHJcbiAgY29uc3QgcGFydHMgPSBldmVudFNvdXJjZUFSTi5zcGxpdCgnLycpO1xyXG4gIHJldHVybiBwYXJ0cy5sZW5ndGggPj0gMiA/IHBhcnRzWzFdIDogJ3Vua25vd24nO1xyXG59XHJcblxyXG5mdW5jdGlvbiBleHRyYWN0VXNlcklkKGl0ZW0/OiBhbnkpOiBzdHJpbmcgfCB1bmRlZmluZWQge1xyXG4gIGlmICghaXRlbSkgcmV0dXJuIHVuZGVmaW5lZDtcclxuICByZXR1cm4gaXRlbS51c2VySWQ/LlMgfHwgaXRlbS5jcmVhdGVkQnk/LlMgfHwgaXRlbS51cGRhdGVkQnk/LlM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGV4dHJhY3RGaWxlSWQoaXRlbT86IGFueSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgaWYgKCFpdGVtKSByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIHJldHVybiBpdGVtLmZpbGVJZD8uUztcclxufVxyXG5cclxuZnVuY3Rpb24gZXh0cmFjdEFuYWx5c2lzSWQoaXRlbT86IGFueSk6IHN0cmluZyB8IHVuZGVmaW5lZCB7XHJcbiAgaWYgKCFpdGVtKSByZXR1cm4gdW5kZWZpbmVkO1xyXG4gIHJldHVybiBpdGVtLmFuYWx5c2lzSWQ/LlM7XHJcbn0iXX0=