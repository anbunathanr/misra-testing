/**
 * MISRA Analysis Service
 * High-level service for managing MISRA analysis operations
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { MisraRuleEngine } from './misra-rule-engine';
import { AnalysisConfig, AnalysisResult, MisraRuleSet } from '../../types/misra-rules';
import { FileType } from '../../types/file-metadata';

export class MisraAnalysisService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(bucketName: string, region: string = 'us-east-1') {
    this.bucketName = bucketName;
    this.s3Client = new S3Client({ region });
  }

  /**
   * Analyze a file from S3
   */
  async analyzeFile(
    fileId: string,
    fileName: string,
    s3Key: string,
    fileType: FileType,
    config?: Partial<AnalysisConfig>
  ): Promise<AnalysisResult> {
    try {
      // Download file from S3
      const sourceCode = await this.downloadFileFromS3(s3Key);

      // Determine appropriate rule set based on file type
      const ruleSet = this.determineRuleSet(fileType, config?.ruleSet);

      // Create analysis configuration
      const analysisConfig: AnalysisConfig = {
        ruleSet,
        enabledRules: config?.enabledRules,
        disabledRules: config?.disabledRules,
        severityFilter: config?.severityFilter,
        maxViolations: config?.maxViolations || 0
      };

      // Create rule engine and analyze
      const engine = new MisraRuleEngine(analysisConfig);
      const result = await engine.analyzeCode(fileId, fileName, sourceCode);

      return result;
    } catch (error) {
      console.error('Error analyzing file:', error);
      return {
        fileId,
        fileName,
        ruleSet: config?.ruleSet || MisraRuleSet.C_2012,
        violations: [],
        violationsCount: 0,
        rulesChecked: [],
        analysisTimestamp: Date.now(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Download file content from S3
   */
  private async downloadFileFromS3(s3Key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key
    });

    const response = await this.s3Client.send(command);
    
    if (!response.Body) {
      throw new Error('Empty file content');
    }

    // Convert stream to string
    const bodyContents = await response.Body.transformToString();
    return bodyContents;
  }

  /**
   * Determine appropriate MISRA rule set based on file type
   */
  private determineRuleSet(fileType: FileType, preferredRuleSet?: MisraRuleSet): MisraRuleSet {
    // If user specified a rule set, use it
    if (preferredRuleSet) {
      return preferredRuleSet;
    }

    // Default rule set selection based on file type
    switch (fileType) {
      case FileType.C:
      case FileType.H:
        return MisraRuleSet.C_2012; // Default to latest C standard
      case FileType.CPP:
      case FileType.HPP:
        return MisraRuleSet.CPP_2008; // Use C++ standard for C++ files
      default:
        return MisraRuleSet.C_2012; // Fallback to C 2012
    }
  }

  /**
   * Batch analyze multiple files
   */
  async analyzeMultipleFiles(
    files: Array<{
      fileId: string;
      fileName: string;
      s3Key: string;
      fileType: FileType;
    }>,
    config?: Partial<AnalysisConfig>
  ): Promise<AnalysisResult[]> {
    const results: AnalysisResult[] = [];

    for (const file of files) {
      const result = await this.analyzeFile(
        file.fileId,
        file.fileName,
        file.s3Key,
        file.fileType,
        config
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Get analysis summary statistics
   */
  getAnalysisSummary(results: AnalysisResult[]): {
    totalFiles: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    totalViolations: number;
    averageViolationsPerFile: number;
  } {
    const totalFiles = results.length;
    const successfulAnalyses = results.filter(r => r.success).length;
    const failedAnalyses = results.filter(r => !r.success).length;
    const totalViolations = results.reduce((sum, r) => sum + r.violationsCount, 0);
    const averageViolationsPerFile = totalFiles > 0 ? totalViolations / totalFiles : 0;

    return {
      totalFiles,
      successfulAnalyses,
      failedAnalyses,
      totalViolations,
      averageViolationsPerFile
    };
  }
}
