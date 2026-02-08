/**
 * MISRA Analysis Service
 * High-level service for managing MISRA analysis operations
 */
import { AnalysisConfig, AnalysisResult } from '../../types/misra-rules';
import { FileType } from '../../types/file-metadata';
export declare class MisraAnalysisService {
    private s3Client;
    private bucketName;
    constructor(bucketName: string, region?: string);
    /**
     * Analyze a file from S3
     */
    analyzeFile(fileId: string, fileName: string, s3Key: string, fileType: FileType, config?: Partial<AnalysisConfig>): Promise<AnalysisResult>;
    /**
     * Download file content from S3
     */
    private downloadFileFromS3;
    /**
     * Determine appropriate MISRA rule set based on file type
     */
    private determineRuleSet;
    /**
     * Batch analyze multiple files
     */
    analyzeMultipleFiles(files: Array<{
        fileId: string;
        fileName: string;
        s3Key: string;
        fileType: FileType;
    }>, config?: Partial<AnalysisConfig>): Promise<AnalysisResult[]>;
    /**
     * Get analysis summary statistics
     */
    getAnalysisSummary(results: AnalysisResult[]): {
        totalFiles: number;
        successfulAnalyses: number;
        failedAnalyses: number;
        totalViolations: number;
        averageViolationsPerFile: number;
    };
}
