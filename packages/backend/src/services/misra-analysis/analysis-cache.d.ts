import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { AnalysisResult } from '../../types/misra-analysis';
/**
 * Analysis Cache Service
 *
 * Provides caching functionality for MISRA analysis results to avoid
 * re-analyzing identical files.
 *
 * Requirements: 10.7 - Cache analysis results for identical files
 */
export declare class AnalysisCache {
    private dynamoClient;
    constructor(dynamoClient?: DynamoDBClient);
    /**
     * Generate SHA-256 hash of file content for cache key
     *
     * @param fileContent - The source code content to hash
     * @returns SHA-256 hash as hex string
     */
    static hashFileContent(fileContent: string): string;
    /**
     * Check cache for existing analysis results
     *
     * @param fileHash - SHA-256 hash of file content
     * @returns Cached analysis result or null if not found
     */
    getCachedResult(fileHash: string): Promise<AnalysisResult | null>;
    /**
     * Store analysis result in cache
     *
     * @param fileHash - SHA-256 hash of file content
     * @param analysisResult - The analysis result to cache
     * @param userId - User ID for tracking
     * @param language - Programming language (C or CPP)
     */
    setCachedResult(fileHash: string, analysisResult: AnalysisResult, userId: string, language: string): Promise<void>;
    /**
     * Invalidate cache entry for a specific file hash
     *
     * @param fileHash - SHA-256 hash of file content
     */
    invalidateCache(fileHash: string): Promise<void>;
}
