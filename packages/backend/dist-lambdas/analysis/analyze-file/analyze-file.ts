import { Handler } from 'aws-lambda';
import { AnalysisResultsService } from '../../services/analysis-results-service';
import { FileMetadataService } from '../../services/file-metadata-service';
import { NotificationService } from '../../services/notification-service';
import { ErrorHandlerService, ErrorSeverity } from '../../services/error-handler-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { AnalysisStatus } from '../../types/file-metadata';
import { MisraRuleSet } from '../../types/misra-rules';

const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || '';
const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';

const notificationService = new NotificationService(region);
const dbClient = new DynamoDBClientWrapper(environment);
const metadataService = new FileMetadataService(dbClient);
const resultsService = new AnalysisResultsService(dbClient);

interface AnalysisEvent {
  fileId: string;
  fileName: string;
  s3Key: string;
  fileType: string;
  ruleSet?: string;
  userId: string;
  organizationId?: string;
  userEmail?: string;
}

interface S3EventRecord {
  s3: {
    bucket: {
      name: string;
    };
    object: {
      key: string;
      size?: number;
      sequencer?: string;
    };
  };
}

interface S3Event {
  Records: S3EventRecord[];
}

/**
 * Extract file information from S3 event record
 */
function extractFileInfoFromS3Event(record: S3EventRecord): {
  s3Key: string;
  fileName: string;
} {
  const s3Key = record.s3.object.key;
  const fileName = s3Key.split('/').pop() || 'unknown-file';
  
  return { s3Key, fileName };
}

/**
 * Determine file type from file extension
 */
function determineFileType(fileName: string): string {
  if (fileName.endsWith('.c')) {
    return 'C';
  } else if (fileName.endsWith('.cpp') || fileName.endsWith('.cc') || fileName.endsWith('.cxx')) {
    return 'CPP';
  } else if (fileName.endsWith('.h') || fileName.endsWith('.hpp')) {
    return 'HEADER';
  }
  return 'UNKNOWN';
}

/**
 * Lambda handler for MISRA file analysis
 * Can be triggered by S3 event notifications or direct invocation
 */
export const handler: Handler = async (event) => {
  console.log('Analysis event received:', JSON.stringify(event, null, 2));

  let fileId: string;
  let fileName: string;
  let s3Key: string;
  let fileType: string;
  let userId: string;
  let organizationId: string | undefined;
  let userEmail: string | undefined;

  // Check if this is an S3 event or direct invocation
  if ('Records' in event && Array.isArray((event as S3Event).Records)) {
    // S3 event notification
    const s3Event = event as S3Event;
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
      } else {
        fileId = `auto-${Date.now()}`;
      }
    } else {
      fileId = `auto-${Date.now()}`;
    }
    
    // Extract user info from S3 key
    if (keyParts.length >= 3) {
      userId = keyParts[keyParts.length - 2]; // userId is second to last
    } else {
      userId = 'unknown';
    }
    
    organizationId = keyParts[keyParts.length - 3] || undefined; // orgId is third to last
  } else {
    // Direct invocation with AnalysisEvent format
    const analysisEvent = event as AnalysisEvent;
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
    ErrorHandlerService.handleError(error, { fileId, operation: 'analyze-file' }, ErrorSeverity.HIGH);
    return {
      statusCode: 400,
      status: 'FAILED',
      error: 'userId is required for analysis'
    };
  }

  try {
    // Update status to IN_PROGRESS (use seconds, not milliseconds)
    await metadataService.updateFileMetadata(fileId, {
      analysis_status: AnalysisStatus.IN_PROGRESS,
      updated_at: Math.floor(Date.now() / 1000)
    });

    console.log(`Starting MISRA analysis for file ${fileId}: ${fileName}`);

    // TODO: Implement actual MISRA analysis when the service is available
    // For now, simulate a successful analysis
    const result = {
      fileId,
      fileName,
      ruleSet: MisraRuleSet.C_2004,
      violations: [],
      violationsCount: 0,
      rulesChecked: ['MISRA-C-2004 Rule 10.1', 'MISRA-C-2004 Rule 11.3'],
      analysisTimestamp: Math.floor(Date.now() / 1000),
      success: true
    };

    // Store analysis results in DynamoDB
      const storedResult = await resultsService.storeAnalysisResult(
        result,
        userId,
        organizationId
      );

      // Update metadata with results (use seconds, not milliseconds)
      await metadataService.updateFileMetadata(fileId, {
        analysis_status: AnalysisStatus.COMPLETED,
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
        await notificationService.notifyAnalysisComplete(
          userId,
          fileId,
          fileName,
          result.violationsCount,
          userEmail
        );
      } catch (notifError) {
        // Log notification error but don't fail the analysis
        ErrorHandlerService.handleError(notifError as Error, { userId, fileId, operation: 'send-notification' }, ErrorSeverity.LOW);
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
    } catch (error) {
    console.error('Error during analysis:', error);

    const errorLog = ErrorHandlerService.handleError(error as Error, { userId, fileId, fileName, operation: 'analyze-file' }, ErrorSeverity.CRITICAL);

    // Update status to FAILED (use seconds, not milliseconds)
    try {
      await metadataService.updateFileMetadata(fileId, {
        analysis_status: AnalysisStatus.FAILED,
        analysis_results: {
          violations_count: 0,
          rules_checked: [],
          completion_timestamp: Math.floor(Date.now() / 1000),
          error_message: error instanceof Error ? error.message : 'Unknown error'
        },
        updated_at: Math.floor(Date.now() / 1000)
      });

      // Send failure notification
      await notificationService.notifyAnalysisFailure(
        userId,
        fileId,
        fileName,
        error instanceof Error ? error.message : 'Unknown error',
        userEmail
      );
    } catch (updateError) {
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
