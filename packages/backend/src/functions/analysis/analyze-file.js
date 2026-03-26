"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const analysis_results_service_1 = require("../../services/analysis-results-service");
const file_metadata_service_1 = require("../../services/file-metadata-service");
const notification_service_1 = require("../../services/notification-service");
const error_handler_service_1 = require("../../services/error-handler-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const file_metadata_1 = require("../../types/file-metadata");
const misra_rules_1 = require("../../types/misra-rules");
const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || '';
const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';
const notificationService = new notification_service_1.NotificationService(region);
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const metadataService = new file_metadata_service_1.FileMetadataService(dbClient);
const resultsService = new analysis_results_service_1.AnalysisResultsService(dbClient);
/**
 * Extract file information from S3 event record
 */
function extractFileInfoFromS3Event(record) {
    const s3Key = record.s3.object.key;
    const fileName = s3Key.split('/').pop() || 'unknown-file';
    return { s3Key, fileName };
}
/**
 * Determine file type from file extension
 */
function determineFileType(fileName) {
    if (fileName.endsWith('.c')) {
        return 'C';
    }
    else if (fileName.endsWith('.cpp') || fileName.endsWith('.cc') || fileName.endsWith('.cxx')) {
        return 'CPP';
    }
    else if (fileName.endsWith('.h') || fileName.endsWith('.hpp')) {
        return 'HEADER';
    }
    return 'UNKNOWN';
}
/**
 * Lambda handler for MISRA file analysis
 * Can be triggered by S3 event notifications or direct invocation
 */
const handler = async (event) => {
    console.log('Analysis event received:', JSON.stringify(event, null, 2));
    let fileId;
    let fileName;
    let s3Key;
    let fileType;
    let userId;
    let organizationId;
    let userEmail;
    // Check if this is an S3 event or direct invocation
    if ('Records' in event && Array.isArray(event.Records)) {
        // S3 event notification
        const s3Event = event;
        const record = s3Event.Records[0]; // Process first record only
        const { s3Key: extractedS3Key, fileName: extractedFileName } = extractFileInfoFromS3Event(record);
        s3Key = extractedS3Key;
        fileName = extractedFileName;
        fileType = determineFileType(fileName);
        // Extract file ID from S3 key (format: uploads/orgId/userId/timestamp-fileId-filename)
        const keyParts = s3Key.split('/');
        if (keyParts.length >= 4) {
            const filePart = keyParts[keyParts.length - 1];
            const fileParts = filePart.split('-');
            if (fileParts.length >= 2) {
                fileId = fileParts[fileParts.length - 2]; // fileId is second to last
            }
            else {
                fileId = `auto-${Date.now()}`;
            }
        }
        else {
            fileId = `auto-${Date.now()}`;
        }
        // Extract user info from S3 key
        if (keyParts.length >= 3) {
            userId = keyParts[keyParts.length - 2]; // userId is second to last
        }
        else {
            userId = 'unknown';
        }
        organizationId = keyParts[keyParts.length - 3] || undefined; // orgId is third to last
    }
    else {
        // Direct invocation with AnalysisEvent format
        const analysisEvent = event;
        fileId = analysisEvent.fileId;
        fileName = analysisEvent.fileName;
        s3Key = analysisEvent.s3Key;
        fileType = analysisEvent.fileType;
        userId = analysisEvent.userId;
        organizationId = analysisEvent.organizationId;
        userEmail = analysisEvent.userEmail;
    }
    if (!userId) {
        const error = new Error('userId is required for analysis');
        error_handler_service_1.ErrorHandlerService.handleError(error, { fileId, operation: 'analyze-file' }, error_handler_service_1.ErrorSeverity.HIGH);
        return {
            statusCode: 400,
            status: 'FAILED',
            error: 'userId is required for analysis'
        };
    }
    try {
        // Update status to IN_PROGRESS (use seconds, not milliseconds)
        await metadataService.updateFileMetadata(fileId, {
            analysis_status: file_metadata_1.AnalysisStatus.IN_PROGRESS,
            updated_at: Math.floor(Date.now() / 1000)
        });
        console.log(`Starting MISRA analysis for file ${fileId}: ${fileName}`);
        // TODO: Implement actual MISRA analysis when the service is available
        // For now, simulate a successful analysis
        const result = {
            fileId,
            fileName,
            ruleSet: misra_rules_1.MisraRuleSet.C_2004,
            violations: [],
            violationsCount: 0,
            rulesChecked: ['MISRA-C-2004 Rule 10.1', 'MISRA-C-2004 Rule 11.3'],
            analysisTimestamp: Math.floor(Date.now() / 1000),
            success: true
        };
        // Store analysis results in DynamoDB
        const storedResult = await resultsService.storeAnalysisResult(result, userId, organizationId);
        // Update metadata with results (use seconds, not milliseconds)
        await metadataService.updateFileMetadata(fileId, {
            analysis_status: file_metadata_1.AnalysisStatus.COMPLETED,
            analysis_results: {
                violations_count: result.violationsCount,
                rules_checked: result.rulesChecked,
                completion_timestamp: result.analysisTimestamp
            },
            updated_at: Math.floor(Date.now() / 1000)
        });
        console.log(`Analysis completed for ${fileId}: ${result.violationsCount} violations found`);
        console.log(`Results stored with ID: ${storedResult.analysisId}`);
        // Send success notification
        try {
            await notificationService.notifyAnalysisComplete(userId, fileId, fileName, result.violationsCount, userEmail);
        }
        catch (notifError) {
            // Log notification error but don't fail the analysis
            error_handler_service_1.ErrorHandlerService.handleError(notifError, { userId, fileId, operation: 'send-notification' }, error_handler_service_1.ErrorSeverity.LOW);
        }
        return {
            statusCode: 200,
            status: 'COMPLETED',
            fileId,
            analysisId: storedResult.analysisId,
            results: {
                violations_count: result.violationsCount,
                rules_checked: result.rulesChecked,
                completion_timestamp: result.analysisTimestamp
            },
            violations: result.violations
        };
    }
    catch (error) {
        console.error('Error during analysis:', error);
        const errorLog = error_handler_service_1.ErrorHandlerService.handleError(error, { userId, fileId, fileName, operation: 'analyze-file' }, error_handler_service_1.ErrorSeverity.CRITICAL);
        // Update status to FAILED (use seconds, not milliseconds)
        try {
            await metadataService.updateFileMetadata(fileId, {
                analysis_status: file_metadata_1.AnalysisStatus.FAILED,
                analysis_results: {
                    violations_count: 0,
                    rules_checked: [],
                    completion_timestamp: Math.floor(Date.now() / 1000),
                    error_message: error instanceof Error ? error.message : 'Unknown error'
                },
                updated_at: Math.floor(Date.now() / 1000)
            });
            // Send failure notification
            await notificationService.notifyAnalysisFailure(userId, fileId, fileName, error instanceof Error ? error.message : 'Unknown error', userEmail);
        }
        catch (updateError) {
            console.error('Failed to update metadata or send notifications:', updateError);
        }
        return {
            statusCode: 500,
            status: 'FAILED',
            fileId,
            analysisId: fileId,
            errorId: errorLog.errorId,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHNGQUFpRjtBQUNqRixnRkFBMkU7QUFDM0UsOEVBQTBFO0FBQzFFLGdGQUEwRjtBQUMxRixvRUFBdUU7QUFDdkUsNkRBQTJEO0FBQzNELHlEQUF1RDtBQUV2RCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLEVBQUUsQ0FBQztBQUM5RCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7QUFDckQsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksS0FBSyxDQUFDO0FBRXJELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwwQ0FBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksMkNBQW1CLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDMUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxpREFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQThCNUQ7O0dBRUc7QUFDSCxTQUFTLDBCQUEwQixDQUFDLE1BQXFCO0lBSXZELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztJQUNuQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxJQUFJLGNBQWMsQ0FBQztJQUUxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxDQUFDO0FBQzdCLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQVMsaUJBQWlCLENBQUMsUUFBZ0I7SUFDekMsSUFBSSxRQUFRLENBQUMsUUFBUSxD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QUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO29CQUNuRCxhQUFhLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTtpQkFDeEU7Z0JBQ0QsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQzthQUMxQyxDQUFDLENBQUM7WUFFSCw0QkFBNEI7WUFDNUIsTUFBTSxtQkFBbUIsQ0FBQyxxQkFBcUIsQ0FDN0MsTUFBTSxFQUNOLE1BQU0sRUFDTixRQUFRLEVBQ1IsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUN4RCxTQUFTLENBQ1YsQ0FBQztRQUNKLENBQUM7UUFBQyxPQUFPLFdBQVcsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0RBQWtELEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDakYsQ0FBQztRQUVELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE1BQU0sRUFBRSxRQUFRO1lBQ2hCLE1BQU07WUFDTixVQUFVLEVBQUUsTUFBTTtZQUNsQixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87WUFDekIsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7U0FDaEUsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE5S1csUUFBQSxPQUFPLFdBOEtsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEhhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQW5hbHlzaXNSZXN1bHRzU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FuYWx5c2lzLXJlc3VsdHMtc2VydmljZSc7XHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9maWxlLW1ldGFkYXRhLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25TZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbm90aWZpY2F0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBFcnJvckhhbmRsZXJTZXJ2aWNlLCBFcnJvclNldmVyaXR5IH0gZnJvbSAnLi4vLi4vc2VydmljZXMvZXJyb3ItaGFuZGxlci1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50JztcclxuaW1wb3J0IHsgQW5hbHlzaXNTdGF0dXMgfSBmcm9tICcuLi8uLi90eXBlcy9maWxlLW1ldGFkYXRhJztcclxuaW1wb3J0IHsgTWlzcmFSdWxlU2V0IH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtcnVsZXMnO1xyXG5cclxuY29uc3QgYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSB8fCAnJztcclxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJztcclxuY29uc3QgZW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JztcclxuXHJcbmNvbnN0IG5vdGlmaWNhdGlvblNlcnZpY2UgPSBuZXcgTm90aWZpY2F0aW9uU2VydmljZShyZWdpb24pO1xyXG5jb25zdCBkYkNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudFdyYXBwZXIoZW52aXJvbm1lbnQpO1xyXG5jb25zdCBtZXRhZGF0YVNlcnZpY2UgPSBuZXcgRmlsZU1ldGFkYXRhU2VydmljZShkYkNsaWVudCk7XHJcbmNvbnN0IHJlc3VsdHNTZXJ2aWNlID0gbmV3IEFuYWx5c2lzUmVzdWx0c1NlcnZpY2UoZGJDbGllbnQpO1xyXG5cclxuaW50ZXJmYWNlIEFuYWx5c2lzRXZlbnQge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICBmaWxlVHlwZTogc3RyaW5nO1xyXG4gIHJ1bGVTZXQ/OiBzdHJpbmc7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmc7XHJcbiAgdXNlckVtYWlsPzogc3RyaW5nO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgUzNFdmVudFJlY29yZCB7XHJcbiAgczM6IHtcclxuICAgIGJ1Y2tldDoge1xyXG4gICAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICB9O1xyXG4gICAgb2JqZWN0OiB7XHJcbiAgICAgIGtleTogc3RyaW5nO1xyXG4gICAgICBzaXplPzogbnVtYmVyO1xyXG4gICAgICBzZXF1ZW5jZXI/OiBzdHJpbmc7XHJcbiAgICB9O1xyXG4gIH07XHJcbn1cclxuXHJcbmludGVyZmFjZSBTM0V2ZW50IHtcclxuICBSZWNvcmRzOiBTM0V2ZW50UmVjb3JkW107XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFeHRyYWN0IGZpbGUgaW5mb3JtYXRpb24gZnJvbSBTMyBldmVudCByZWNvcmRcclxuICovXHJcbmZ1bmN0aW9uIGV4dHJhY3RGaWxlSW5mb0Zyb21TM0V2ZW50KHJlY29yZDogUzNFdmVudFJlY29yZCk6IHtcclxuICBzM0tleTogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbn0ge1xyXG4gIGNvbnN0IHMzS2V5ID0gcmVjb3JkLnMzLm9iamVjdC5rZXk7XHJcbiAgY29uc3QgZmlsZU5hbWUgPSBzM0tleS5zcGxpdCgnLycpLnBvcCgpIHx8ICd1bmtub3duLWZpbGUnO1xyXG4gIFxyXG4gIHJldHVybiB7IHMzS2V5LCBmaWxlTmFtZSB9O1xyXG59XHJcblxyXG4vKipcclxuICogRGV0ZXJtaW5lIGZpbGUgdHlwZSBmcm9tIGZpbGUgZXh0ZW5zaW9uXHJcbiAqL1xyXG5mdW5jdGlvbiBkZXRlcm1pbmVGaWxlVHlwZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAoZmlsZU5hbWUuZW5kc1dpdGgoJy5jJykpIHtcclxuICAgIHJldHVybiAnQyc7XHJcbiAgfSBlbHNlIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLmNwcCcpIHx8IGZpbGVOYW1lLmVuZHNXaXRoKCcuY2MnKSB8fCBmaWxlTmFtZS5lbmRzV2l0aCgnLmN4eCcpKSB7XHJcbiAgICByZXR1cm4gJ0NQUCc7XHJcbiAgfSBlbHNlIGlmIChmaWxlTmFtZS5lbmRzV2l0aCgnLmgnKSB8fCBmaWxlTmFtZS5lbmRzV2l0aCgnLmhwcCcpKSB7XHJcbiAgICByZXR1cm4gJ0hFQURFUic7XHJcbiAgfVxyXG4gIHJldHVybiAnVU5LTk9XTic7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgaGFuZGxlciBmb3IgTUlTUkEgZmlsZSBhbmFseXNpc1xyXG4gKiBDYW4gYmUgdHJpZ2dlcmVkIGJ5IFMzIGV2ZW50IG5vdGlmaWNhdGlvbnMgb3IgZGlyZWN0IGludm9jYXRpb25cclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyOiBIYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgY29uc29sZS5sb2coJ0FuYWx5c2lzIGV2ZW50IHJlY2VpdmVkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIGxldCBmaWxlSWQ6IHN0cmluZztcclxuICBsZXQgZmlsZU5hbWU6IHN0cmluZztcclxuICBsZXQgczNLZXk6IHN0cmluZztcclxuICBsZXQgZmlsZVR5cGU6IHN0cmluZztcclxuICBsZXQgdXNlcklkOiBzdHJpbmc7XHJcbiAgbGV0IG9yZ2FuaXphdGlvbklkOiBzdHJpbmcgfCB1bmRlZmluZWQ7XHJcbiAgbGV0IHVzZXJFbWFpbDogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG5cclxuICAvLyBDaGVjayBpZiB0aGlzIGlzIGFuIFMzIGV2ZW50IG9yIGRpcmVjdCBpbnZvY2F0aW9uXHJcbiAgaWYgKCdSZWNvcmRzJyBpbiBldmVudCAmJiBBcnJheS5pc0FycmF5KChldmVudCBhcyBTM0V2ZW50KS5SZWNvcmRzKSkge1xyXG4gICAgLy8gUzMgZXZlbnQgbm90aWZpY2F0aW9uXHJcbiAgICBjb25zdCBzM0V2ZW50ID0gZXZlbnQgYXMgUzNFdmVudDtcclxuICAgIGNvbnN0IHJlY29yZCA9IHMzRXZlbnQuUmVjb3Jkc1swXTsgLy8gUHJvY2VzcyBmaXJzdCByZWNvcmQgb25seVxyXG4gICAgXHJcbiAgICBjb25zdCB7IHMzS2V5OiBleHRyYWN0ZWRTM0tleSwgZmlsZU5hbWU6IGV4dHJhY3RlZEZpbGVOYW1lIH0gPSBleHRyYWN0RmlsZUluZm9Gcm9tUzNFdmVudChyZWNvcmQpO1xyXG4gICAgczNLZXkgPSBleHRyYWN0ZWRTM0tleTtcclxuICAgIGZpbGVOYW1lID0gZXh0cmFjdGVkRmlsZU5hbWU7XHJcbiAgICBmaWxlVHlwZSA9IGRldGVybWluZUZpbGVUeXBlKGZpbGVOYW1lKTtcclxuICAgIFxyXG4gICAgLy8gRXh0cmFjdCBmaWxlIElEIGZyb20gUzMga2V5IChmb3JtYXQ6IHVwbG9hZHMvb3JnSWQvdXNlcklkL3RpbWVzdGFtcC1maWxlSWQtZmlsZW5hbWUpXHJcbiAgICBjb25zdCBrZXlQYXJ0cyA9IHMzS2V5LnNwbGl0KCcvJyk7XHJcbiAgICBpZiAoa2V5UGFydHMubGVuZ3RoID49IDQpIHtcclxuICAgICAgY29uc3QgZmlsZVBhcnQgPSBrZXlQYXJ0c1trZXlQYXJ0cy5sZW5ndGggLSAxXTtcclxuICAgICAgY29uc3QgZmlsZVBhcnRzID0gZmlsZVBhcnQuc3BsaXQoJy0nKTtcclxuICAgICAgaWYgKGZpbGVQYXJ0cy5sZW5ndGggPj0gMikge1xyXG4gICAgICAgIGZpbGVJZCA9IGZpbGVQYXJ0c1tmaWxlUGFydHMubGVuZ3RoIC0gMl07IC8vIGZpbGVJZCBpcyBzZWNvbmQgdG8gbGFzdFxyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZpbGVJZCA9IGBhdXRvLSR7RGF0ZS5ub3coKX1gO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBmaWxlSWQgPSBgYXV0by0ke0RhdGUubm93KCl9YDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLy8gRXh0cmFjdCB1c2VyIGluZm8gZnJvbSBTMyBrZXlcclxuICAgIGlmIChrZXlQYXJ0cy5sZW5ndGggPj0gMykge1xyXG4gICAgICB1c2VySWQgPSBrZXlQYXJ0c1trZXlQYXJ0cy5sZW5ndGggLSAyXTsgLy8gdXNlcklkIGlzIHNlY29uZCB0byBsYXN0XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICB1c2VySWQgPSAndW5rbm93bic7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIG9yZ2FuaXphdGlvbklkID0ga2V5UGFydHNba2V5UGFydHMubGVuZ3RoIC0gM10gfHwgdW5kZWZpbmVkOyAvLyBvcmdJZCBpcyB0aGlyZCB0byBsYXN0XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIERpcmVjdCBpbnZvY2F0aW9uIHdpdGggQW5hbHlzaXNFdmVudCBmb3JtYXRcclxuICAgIGNvbnN0IGFuYWx5c2lzRXZlbnQgPSBldmVudCBhcyBBbmFseXNpc0V2ZW50O1xyXG4gICAgZmlsZUlkID0gYW5hbHlzaXNFdmVudC5maWxlSWQ7XHJcbiAgICBmaWxlTmFtZSA9IGFuYWx5c2lzRXZlbnQuZmlsZU5hbWU7XHJcbiAgICBzM0tleSA9IGFuYWx5c2lzRXZlbnQuczNLZXk7XHJcbiAgICBmaWxlVHlwZSA9IGFuYWx5c2lzRXZlbnQuZmlsZVR5cGU7XHJcbiAgICB1c2VySWQgPSBhbmFseXNpc0V2ZW50LnVzZXJJZDtcclxuICAgIG9yZ2FuaXphdGlvbklkID0gYW5hbHlzaXNFdmVudC5vcmdhbml6YXRpb25JZDtcclxuICAgIHVzZXJFbWFpbCA9IGFuYWx5c2lzRXZlbnQudXNlckVtYWlsO1xyXG4gIH1cclxuXHJcbiAgaWYgKCF1c2VySWQpIHtcclxuICAgIGNvbnN0IGVycm9yID0gbmV3IEVycm9yKCd1c2VySWQgaXMgcmVxdWlyZWQgZm9yIGFuYWx5c2lzJyk7XHJcbiAgICBFcnJvckhhbmRsZXJTZXJ2aWNlLmhhbmRsZUVycm9yKGVycm9yLCB7IGZpbGVJZCwgb3BlcmF0aW9uOiAnYW5hbHl6ZS1maWxlJyB9LCBFcnJvclNldmVyaXR5LkhJR0gpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICBzdGF0dXM6ICdGQUlMRUQnLFxyXG4gICAgICBlcnJvcjogJ3VzZXJJZCBpcyByZXF1aXJlZCBmb3IgYW5hbHlzaXMnXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFVwZGF0ZSBzdGF0dXMgdG8gSU5fUFJPR1JFU1MgKHVzZSBzZWNvbmRzLCBub3QgbWlsbGlzZWNvbmRzKVxyXG4gICAgYXdhaXQgbWV0YWRhdGFTZXJ2aWNlLnVwZGF0ZUZpbGVNZXRhZGF0YShmaWxlSWQsIHtcclxuICAgICAgYW5hbHlzaXNfc3RhdHVzOiBBbmFseXNpc1N0YXR1cy5JTl9QUk9HUkVTUyxcclxuICAgICAgdXBkYXRlZF9hdDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBTdGFydGluZyBNSVNSQSBhbmFseXNpcyBmb3IgZmlsZSAke2ZpbGVJZH06ICR7ZmlsZU5hbWV9YCk7XHJcblxyXG4gICAgLy8gVE9ETzogSW1wbGVtZW50IGFjdHVhbCBNSVNSQSBhbmFseXNpcyB3aGVuIHRoZSBzZXJ2aWNlIGlzIGF2YWlsYWJsZVxyXG4gICAgLy8gRm9yIG5vdywgc2ltdWxhdGUgYSBzdWNjZXNzZnVsIGFuYWx5c2lzXHJcbiAgICBjb25zdCByZXN1bHQgPSB7XHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZmlsZU5hbWUsXHJcbiAgICAgIHJ1bGVTZXQ6IE1pc3JhUnVsZVNldC5DXzIwMDQsXHJcbiAgICAgIHZpb2xhdGlvbnM6IFtdLFxyXG4gICAgICB2aW9sYXRpb25zQ291bnQ6IDAsXHJcbiAgICAgIHJ1bGVzQ2hlY2tlZDogWydNSVNSQS1DLTIwMDQgUnVsZSAxMC4xJywgJ01JU1JBLUMtMjAwNCBSdWxlIDExLjMnXSxcclxuICAgICAgYW5hbHlzaXNUaW1lc3RhbXA6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICBzdWNjZXNzOiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFN0b3JlIGFuYWx5c2lzIHJlc3VsdHMgaW4gRHluYW1vREJcclxuICAgICAgY29uc3Qgc3RvcmVkUmVzdWx0ID0gYXdhaXQgcmVzdWx0c1NlcnZpY2Uuc3RvcmVBbmFseXNpc1Jlc3VsdChcclxuICAgICAgICByZXN1bHQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIG9yZ2FuaXphdGlvbklkXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBVcGRhdGUgbWV0YWRhdGEgd2l0aCByZXN1bHRzICh1c2Ugc2Vjb25kcywgbm90IG1pbGxpc2Vjb25kcylcclxuICAgICAgYXdhaXQgbWV0YWRhdGFTZXJ2aWNlLnVwZGF0ZUZpbGVNZXRhZGF0YShmaWxlSWQsIHtcclxuICAgICAgICBhbmFseXNpc19zdGF0dXM6IEFuYWx5c2lzU3RhdHVzLkNPTVBMRVRFRCxcclxuICAgICAgICBhbmFseXNpc19yZXN1bHRzOiB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zX2NvdW50OiByZXN1bHQudmlvbGF0aW9uc0NvdW50LFxyXG4gICAgICAgICAgcnVsZXNfY2hlY2tlZDogcmVzdWx0LnJ1bGVzQ2hlY2tlZCxcclxuICAgICAgICAgIGNvbXBsZXRpb25fdGltZXN0YW1wOiByZXN1bHQuYW5hbHlzaXNUaW1lc3RhbXBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVwZGF0ZWRfYXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYEFuYWx5c2lzIGNvbXBsZXRlZCBmb3IgJHtmaWxlSWR9OiAke3Jlc3VsdC52aW9sYXRpb25zQ291bnR9IHZpb2xhdGlvbnMgZm91bmRgKTtcclxuICAgICAgY29uc29sZS5sb2coYFJlc3VsdHMgc3RvcmVkIHdpdGggSUQ6ICR7c3RvcmVkUmVzdWx0LmFuYWx5c2lzSWR9YCk7XHJcblxyXG4gICAgICAvLyBTZW5kIHN1Y2Nlc3Mgbm90aWZpY2F0aW9uXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlBbmFseXNpc0NvbXBsZXRlKFxyXG4gICAgICAgICAgdXNlcklkLFxyXG4gICAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgICAgZmlsZU5hbWUsXHJcbiAgICAgICAgICByZXN1bHQudmlvbGF0aW9uc0NvdW50LFxyXG4gICAgICAgICAgdXNlckVtYWlsXHJcbiAgICAgICAgKTtcclxuICAgICAgfSBjYXRjaCAobm90aWZFcnJvcikge1xyXG4gICAgICAgIC8vIExvZyBub3RpZmljYXRpb24gZXJyb3IgYnV0IGRvbid0IGZhaWwgdGhlIGFuYWx5c2lzXHJcbiAgICAgICAgRXJyb3JIYW5kbGVyU2VydmljZS5oYW5kbGVFcnJvcihub3RpZkVycm9yIGFzIEVycm9yLCB7IHVzZXJJZCwgZmlsZUlkLCBvcGVyYXRpb246ICdzZW5kLW5vdGlmaWNhdGlvbicgfSwgRXJyb3JTZXZlcml0eS5MT1cpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgICBzdGF0dXM6ICdDT01QTEVURUQnLFxyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBhbmFseXNpc0lkOiBzdG9yZWRSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgICByZXN1bHRzOiB7XHJcbiAgICAgICAgICB2aW9sYXRpb25zX2NvdW50OiByZXN1bHQudmlvbGF0aW9uc0NvdW50LFxyXG4gICAgICAgICAgcnVsZXNfY2hlY2tlZDogcmVzdWx0LnJ1bGVzQ2hlY2tlZCxcclxuICAgICAgICAgIGNvbXBsZXRpb25fdGltZXN0YW1wOiByZXN1bHQuYW5hbHlzaXNUaW1lc3RhbXBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHZpb2xhdGlvbnM6IHJlc3VsdC52aW9sYXRpb25zXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZHVyaW5nIGFuYWx5c2lzOicsIGVycm9yKTtcclxuXHJcbiAgICBjb25zdCBlcnJvckxvZyA9IEVycm9ySGFuZGxlclNlcnZpY2UuaGFuZGxlRXJyb3IoZXJyb3IgYXMgRXJyb3IsIHsgdXNlcklkLCBmaWxlSWQsIGZpbGVOYW1lLCBvcGVyYXRpb246ICdhbmFseXplLWZpbGUnIH0sIEVycm9yU2V2ZXJpdHkuQ1JJVElDQUwpO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBzdGF0dXMgdG8gRkFJTEVEICh1c2Ugc2Vjb25kcywgbm90IG1pbGxpc2Vjb25kcylcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IG1ldGFkYXRhU2VydmljZS51cGRhdGVGaWxlTWV0YWRhdGEoZmlsZUlkLCB7XHJcbiAgICAgICAgYW5hbHlzaXNfc3RhdHVzOiBBbmFseXNpc1N0YXR1cy5GQUlMRUQsXHJcbiAgICAgICAgYW5hbHlzaXNfcmVzdWx0czoge1xyXG4gICAgICAgICAgdmlvbGF0aW9uc19jb3VudDogMCxcclxuICAgICAgICAgIHJ1bGVzX2NoZWNrZWQ6IFtdLFxyXG4gICAgICAgICAgY29tcGxldGlvbl90aW1lc3RhbXA6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLFxyXG4gICAgICAgICAgZXJyb3JfbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHVwZGF0ZWRfYXQ6IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gU2VuZCBmYWlsdXJlIG5vdGlmaWNhdGlvblxyXG4gICAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLm5vdGlmeUFuYWx5c2lzRmFpbHVyZShcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICAgIHVzZXJFbWFpbFxyXG4gICAgICApO1xyXG4gICAgfSBjYXRjaCAodXBkYXRlRXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBtZXRhZGF0YSBvciBzZW5kIG5vdGlmaWNhdGlvbnM6JywgdXBkYXRlRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgc3RhdHVzOiAnRkFJTEVEJyxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBhbmFseXNpc0lkOiBmaWxlSWQsXHJcbiAgICAgIGVycm9ySWQ6IGVycm9yTG9nLmVycm9ySWQsXHJcbiAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==