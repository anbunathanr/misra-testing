/**
 * Lambda function for MISRA file analysis
 * Triggered by Step Functions workflow or direct invocation
 */

import { MisraAnalysisService } from '../../services/misra/misra-analysis-service';
import { ViolationReportService } from '../../services/misra/violation-report-service';
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

const analysisService = new MisraAnalysisService(bucketName, region);
const reportService = new ViolationReportService();
const notificationService = new NotificationService(region);
const dbClient = new DynamoDBClientWrapper(environment);
const metadataService = new FileMetadataService(dbClient);
const resultsService = new AnalysisResultsService(dbClient);

interface AnalyzeFileEvent {
  fileId: string;
  fileName: string;
  s3Key: string;
  fileType: string;
  ruleSet?: MisraRuleSet;
  userId?: string;
  organizationId?: string;
  userEmail?: string;
}

export const handler = async (event: AnalyzeFileEvent) => {
  console.log('Analysis event received:', JSON.stringify(event, null, 2));

  const { fileId, fileName, s3Key, fileType, ruleSet, userId, organizationId, userEmail } = event;

  if (!userId) {
    const error = new Error('userId is required for analysis');
    ErrorHandlerService.handleError(error, { fileId, operation: 'analyze-file' }, ErrorSeverity.HIGH);
    return {
      statusCode: 400,
      status: 'FAILED',
      error: 'userId is required for analysis'
    };
  }

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount <= maxRetries) {
    try {
      // Update status to IN_PROGRESS
      await metadataService.updateAnalysisStatus(fileId, AnalysisStatus.IN_PROGRESS);

      // Perform MISRA analysis
      const result = await analysisService.analyzeFile(
        fileId,
        fileName,
        s3Key,
        fileType as any,
        { ruleSet }
      );

      if (result.success) {
        // Generate violation report
        const report = reportService.generateReport(result, {
          includeSummary: true,
          includeRecommendations: true,
          groupBySeverity: true,
          groupByRule: true
        });

        // Store analysis results in DynamoDB
        const storedResult = await resultsService.storeAnalysisResult(
          result,
          userId,
          organizationId
        );

        // Update metadata with results
        await metadataService.updateFileMetadata(fileId, {
          analysis_status: AnalysisStatus.COMPLETED,
          analysis_results: {
            violations_count: result.violationsCount,
            rules_checked: result.rulesChecked,
            completion_timestamp: result.analysisTimestamp
          },
          updated_at: Date.now()
        });

        console.log(`Analysis completed for ${fileId}: ${result.violationsCount} violations found`);
        console.log(`Report generated with ${report.recommendations.length} recommendations`);
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
          ErrorHandlerService.handleError(
            notifError as Error,
            { userId, fileId, operation: 'send-notification' },
            ErrorSeverity.LOW
          );
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
          violations: result.violations,
          report: {
            summary: report.summary,
            recommendations: report.recommendations,
            violationsByRule: report.violationsByRule.map(r => ({
              ruleId: r.ruleId,
              ruleTitle: r.ruleTitle,
              count: r.count
            }))
          }
        };
      } else {
        // Store failed analysis result
        await resultsService.storeAnalysisResult(result, userId, organizationId);

        // Update status to FAILED
        await metadataService.updateFileMetadata(fileId, {
          analysis_status: AnalysisStatus.FAILED,
          analysis_results: {
            violations_count: 0,
            rules_checked: [],
            completion_timestamp: Date.now(),
            error_message: result.errorMessage
          },
          updated_at: Date.now()
        });

        // Log error
        const error = new Error(result.errorMessage || 'Analysis failed');
        ErrorHandlerService.handleError(
          error,
          { userId, fileId, fileName, operation: 'misra-analysis' },
          ErrorSeverity.HIGH
        );

        // Send failure notification
        try {
          await notificationService.notifyAnalysisFailure(
            userId,
            fileId,
            fileName,
            result.errorMessage || 'Unknown error',
            userEmail
          );
        } catch (notifError) {
          ErrorHandlerService.handleError(
            notifError as Error,
            { userId, fileId, operation: 'send-notification' },
            ErrorSeverity.LOW
          );
        }

        console.error(`Analysis failed for ${fileId}:`, result.errorMessage);

        return {
          statusCode: 500,
          status: 'FAILED',
          fileId,
          analysisId: fileId,
          error: result.errorMessage
        };
      }
    } catch (error) {
      console.error(`Error during analysis (attempt ${retryCount + 1}/${maxRetries + 1}):`, error);

      // Determine if we should retry
      const retryStrategy = ErrorHandlerService.getRetryStrategy(error as Error);
      
      if (retryStrategy.shouldRetry && retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying analysis after ${retryStrategy.retryAfter}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryStrategy.retryAfter));
        continue;
      }

      // Max retries exceeded or non-retryable error
      const errorLog = ErrorHandlerService.handleError(
        error as Error,
        { userId, fileId, fileName, operation: 'analyze-file', retryCount },
        ErrorSeverity.CRITICAL
      );

      // Update status to FAILED
      try {
        await metadataService.updateFileMetadata(fileId, {
          analysis_status: AnalysisStatus.FAILED,
          analysis_results: {
            violations_count: 0,
            rules_checked: [],
            completion_timestamp: Date.now(),
            error_message: error instanceof Error ? error.message : 'Unknown error'
          },
          updated_at: Date.now()
        });

        // Send failure notification
        await notificationService.notifyAnalysisFailure(
          userId,
          fileId,
          fileName,
          error instanceof Error ? error.message : 'Unknown error',
          userEmail
        );

        // Notify system admins of critical error
        if (ErrorHandlerService.shouldNotifyUser(error as Error, ErrorSeverity.CRITICAL)) {
          await notificationService.notifySystemError(
            errorLog.errorId,
            error instanceof Error ? error.message : 'Unknown error',
            { userId, fileId, fileName, retryCount }
          );
        }
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
  }

  // Should never reach here, but just in case
  return {
    statusCode: 500,
    status: 'FAILED',
    fileId,
    error: 'Max retries exceeded'
  };
};
