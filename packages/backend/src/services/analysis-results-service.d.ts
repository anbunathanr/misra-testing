/**
 * Analysis Results Service
 * Manages persistence and retrieval of MISRA analysis results
 */
import { StoredAnalysisResult, AnalysisPaginationOptions, PaginatedAnalysisResults } from '../types/analysis-persistence';
import { AnalysisResult } from '../types/misra-rules';
export declare class AnalysisResultsService {
    private docClient;
    private tableName;
    constructor(dbClient?: any);
    /**
     * Store analysis result in DynamoDB
     */
    storeAnalysisResult(analysisResult: AnalysisResult, userId: string, organizationId?: string): Promise<StoredAnalysisResult>;
    /**
     * Get analysis result by ID
     */
    getAnalysisResult(analysisId: string, timestamp: number): Promise<StoredAnalysisResult | null>;
    /**
     * Get all analysis results for a file
     */
    getFileAnalysisHistory(fileId: string, pagination?: AnalysisPaginationOptions): Promise<PaginatedAnalysisResults>;
    /**
     * Get all analysis results for a user
     */
    getUserAnalysisHistory(userId: string, pagination?: AnalysisPaginationOptions): Promise<PaginatedAnalysisResults>;
    /**
     * Get analyses by user ID (simplified method for AI insights)
     */
    getAnalysesByUserId(userId: string, options?: {
        limit?: number;
    }): Promise<StoredAnalysisResult[]>;
    /**
     * Get analysis statistics for a user
     */
    getUserAnalysisStats(userId: string): Promise<{
        totalAnalyses: number;
        successfulAnalyses: number;
        failedAnalyses: number;
        totalViolations: number;
        averageViolationsPerFile: number;
    }>;
    /**
     * Query analysis results with filters
     */
    queryAnalysisResults(filters: any, pagination?: AnalysisPaginationOptions): Promise<PaginatedAnalysisResults>;
}
