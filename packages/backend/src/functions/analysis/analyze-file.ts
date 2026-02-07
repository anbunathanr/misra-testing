/**
 * Lambda function for MISRA file analysis
 * Triggered by Step Functions workflow or direct invocation
 */

import { MisraAnalysisService } from '../../services/misra/misra-analysis-service';
import { FileMetadataService } from '../../services/file-metadata-service';
import { DynamoDBClientWrapper } from '../../database/dynamodb-client';
import { AnalysisStatus } from '../../types/file-metadata';
import { MisraRuleSet } from '../../types/misra-rules';

const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || '';
const region = process.env.AWS_REGION || 'us-east-1';
const environment = process.env.ENVIRONMENT || 'dev';

const analysisService = new MisraAnalysisService(bucketName, region);
const dbClient = new DynamoDBClientWrapper(environment);
const metadataService = new FileMetadataService(dbClient);

interface AnalyzeFileEvent {
  fileId: string;
  fileName: string;
  s3Key: string;
  fileType: string;
  ruleSet?: MisraRuleSet;
  userId?: string;
  organizationId?: string;
}

export const handler = async (event: AnalyzeFileEvent) => {
  console.log('Analysis event received:', JSON.stringify(event, null, 2));

  const { fileId, fileName, s3Key, fileType, ruleSet } = event;

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

      return {
        statusCode: 200,
        status: 'COMPLETED',
        fileId,
        analysisId: fileId,
        results: {
          violations_count: result.violationsCount,
          rules_checked: result.rulesChecked,
          completion_timestamp: result.analysisTimestamp
        },
        violations: result.violations
      };
    } else {
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
    console.error('Error during analysis:', error);

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
    } catch (updateError) {
      console.error('Failed to update metadata:', updateError);
    }

    return {
      statusCode: 500,
      status: 'FAILED',
      fileId,
      analysisId: fileId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};
