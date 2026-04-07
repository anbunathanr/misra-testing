import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { createHash } from 'crypto';
import { AnalysisResult } from '../../types/misra-analysis';

const region = process.env.AWS_REGION || 'us-east-1';
const analysisCacheTable = process.env.ANALYSIS_CACHE_TABLE || 'misra-platform-analysis-cache-dev';

// Cache TTL: 30 days (in seconds)
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Analysis Cache Service
 * 
 * Provides caching functionality for MISRA analysis results to avoid
 * re-analyzing identical files.
 * 
 * Requirements: 10.7 - Cache analysis results for identical files
 */
export class AnalysisCache {
  private dynamoClient: DynamoDBClient;

  constructor(dynamoClient?: DynamoDBClient) {
    this.dynamoClient = dynamoClient || new DynamoDBClient({ region });
  }
  /**
   * Generate SHA-256 hash of file content for cache key
   * 
   * @param fileContent - The source code content to hash
   * @returns SHA-256 hash as hex string
   */
  static hashFileContent(fileContent: string): string {
    return createHash('sha256')
      .update(fileContent)
      .digest('hex');
  }

  /**
   * Check cache for existing analysis results
   * 
   * @param fileHash - SHA-256 hash of file content
   * @returns Cached analysis result or null if not found
   */
  async getCachedResult(fileHash: string): Promise<AnalysisResult | null> {
    try {
      console.log(`[AnalysisCache] Checking cache for hash: ${fileHash}`);

      const command = new GetItemCommand({
        TableName: analysisCacheTable,
        Key: marshall({ fileHash }),
      });

      const response = await this.dynamoClient.send(command);

      if (!response.Item) {
        console.log(`[AnalysisCache] Cache miss for hash: ${fileHash}`);
        return null;
      }

      const cachedItem = unmarshall(response.Item);
      
      // Check if cache entry has expired (additional check beyond TTL)
      const now = Math.floor(Date.now() / 1000);
      if (cachedItem.ttl && cachedItem.ttl < now) {
        console.log(`[AnalysisCache] Cache entry expired for hash: ${fileHash}`);
        return null;
      }

      console.log(`[AnalysisCache] Cache hit for hash: ${fileHash}`);
      console.log(`[AnalysisCache] Cached result from: ${new Date(cachedItem.timestamp).toISOString()}`);

      // Return the cached analysis result
      return cachedItem.analysisResult as AnalysisResult;
    } catch (error) {
      console.error('[AnalysisCache] Error retrieving from cache:', error);
      // On error, return null to trigger fresh analysis
      return null;
    }
  }

  /**
   * Store analysis result in cache
   * 
   * @param fileHash - SHA-256 hash of file content
   * @param analysisResult - The analysis result to cache
   * @param userId - User ID for tracking
   * @param language - Programming language (C or CPP)
   */
  async setCachedResult(
    fileHash: string,
    analysisResult: AnalysisResult,
    userId: string,
    language: string
  ): Promise<void> {
    try {
      console.log(`[AnalysisCache] Storing result in cache for hash: ${fileHash}`);

      const now = Math.floor(Date.now() / 1000);
      const ttl = now + CACHE_TTL_SECONDS;

      const cacheItem = {
        fileHash,
        analysisResult,
        userId,
        language,
        timestamp: Date.now(),
        ttl, // DynamoDB TTL attribute (Unix timestamp in seconds)
        createdAt: new Date().toISOString(),
      };

      const command = new PutItemCommand({
        TableName: analysisCacheTable,
        Item: marshall(cacheItem),
      });

      await this.dynamoClient.send(command);

      console.log(`[AnalysisCache] Successfully cached result for hash: ${fileHash}`);
      console.log(`[AnalysisCache] Cache will expire at: ${new Date(ttl * 1000).toISOString()}`);
    } catch (error) {
      console.error('[AnalysisCache] Error storing in cache:', error);
      // Don't throw - caching failure shouldn't break analysis
    }
  }

  /**
   * Invalidate cache entry for a specific file hash
   * 
   * @param fileHash - SHA-256 hash of file content
   */
  async invalidateCache(fileHash: string): Promise<void> {
    try {
      console.log(`[AnalysisCache] Invalidating cache for hash: ${fileHash}`);

      // Set TTL to current time to expire immediately
      const command = new PutItemCommand({
        TableName: analysisCacheTable,
        Item: marshall({
          fileHash,
          ttl: Math.floor(Date.now() / 1000) - 1, // Expire immediately
        }),
      });

      await this.dynamoClient.send(command);

      console.log(`[AnalysisCache] Successfully invalidated cache for hash: ${fileHash}`);
    } catch (error) {
      console.error('[AnalysisCache] Error invalidating cache:', error);
      throw error;
    }
  }
}
