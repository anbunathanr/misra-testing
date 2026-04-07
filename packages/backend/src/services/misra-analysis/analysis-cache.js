"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisCache = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const crypto_1 = require("crypto");
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
class AnalysisCache {
    dynamoClient;
    constructor(dynamoClient) {
        this.dynamoClient = dynamoClient || new client_dynamodb_1.DynamoDBClient({ region });
    }
    /**
     * Generate SHA-256 hash of file content for cache key
     *
     * @param fileContent - The source code content to hash
     * @returns SHA-256 hash as hex string
     */
    static hashFileContent(fileContent) {
        return (0, crypto_1.createHash)('sha256')
            .update(fileContent)
            .digest('hex');
    }
    /**
     * Check cache for existing analysis results
     *
     * @param fileHash - SHA-256 hash of file content
     * @returns Cached analysis result or null if not found
     */
    async getCachedResult(fileHash) {
        try {
            console.log(`[AnalysisCache] Checking cache for hash: ${fileHash}`);
            const command = new client_dynamodb_1.GetItemCommand({
                TableName: analysisCacheTable,
                Key: (0, util_dynamodb_1.marshall)({ fileHash }),
            });
            const response = await this.dynamoClient.send(command);
            if (!response.Item) {
                console.log(`[AnalysisCache] Cache miss for hash: ${fileHash}`);
                return null;
            }
            const cachedItem = (0, util_dynamodb_1.unmarshall)(response.Item);
            // Check if cache entry has expired (additional check beyond TTL)
            const now = Math.floor(Date.now() / 1000);
            if (cachedItem.ttl && cachedItem.ttl < now) {
                console.log(`[AnalysisCache] Cache entry expired for hash: ${fileHash}`);
                return null;
            }
            console.log(`[AnalysisCache] Cache hit for hash: ${fileHash}`);
            console.log(`[AnalysisCache] Cached result from: ${new Date(cachedItem.timestamp).toISOString()}`);
            // Return the cached analysis result
            return cachedItem.analysisResult;
        }
        catch (error) {
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
    async setCachedResult(fileHash, analysisResult, userId, language) {
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
            const command = new client_dynamodb_1.PutItemCommand({
                TableName: analysisCacheTable,
                Item: (0, util_dynamodb_1.marshall)(cacheItem),
            });
            await this.dynamoClient.send(command);
            console.log(`[AnalysisCache] Successfully cached result for hash: ${fileHash}`);
            console.log(`[AnalysisCache] Cache will expire at: ${new Date(ttl * 1000).toISOString()}`);
        }
        catch (error) {
            console.error('[AnalysisCache] Error storing in cache:', error);
            // Don't throw - caching failure shouldn't break analysis
        }
    }
    /**
     * Invalidate cache entry for a specific file hash
     *
     * @param fileHash - SHA-256 hash of file content
     */
    async invalidateCache(fileHash) {
        try {
            console.log(`[AnalysisCache] Invalidating cache for hash: ${fileHash}`);
            // Set TTL to current time to expire immediately
            const command = new client_dynamodb_1.PutItemCommand({
                TableName: analysisCacheTable,
                Item: (0, util_dynamodb_1.marshall)({
                    fileHash,
                    ttl: Math.floor(Date.now() / 1000) - 1, // Expire immediately
                }),
            });
            await this.dynamoClient.send(command);
            console.log(`[AnalysisCache] Successfully invalidated cache for hash: ${fileHash}`);
        }
        catch (error) {
            console.error('[AnalysisCache] Error invalidating cache:', error);
            throw error;
        }
    }
}
exports.AnalysisCache = AnalysisCache;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbmFseXNpcy1jYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEY7QUFDMUYsMERBQThEO0FBQzlELG1DQUFvQztBQUdwQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLENBQUM7QUFDckQsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG9CQUFvQixJQUFJLG1DQUFtQyxDQUFDO0FBRW5HLGtDQUFrQztBQUNsQyxNQUFNLGlCQUFpQixHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUU1Qzs7Ozs7OztHQU9HO0FBQ0gsTUFBYSxhQUFhO0lBQ2hCLFlBQVksQ0FBaUI7SUFFckMsWUFBWSxZQUE2QjtRQUN2QyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksSUFBSSxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFDRDs7Ozs7T0FLRztJQUNILE1BQU0sQ0FBQyxlQUFlLENBQUMsV0FBbUI7UUFDeEMsT0FBTyxJQUFBLG1CQUFVLEVBQUMsUUFBUSxDQUFDO2FBQ3hCLE1BQU0sQ0FBQyxXQUFXLENBQUM7YUFDbkIsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25CLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBZ0I7UUFDcEMsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUVwRSxNQUFNLE9BQU8sR0FBRyxJQUFJLGdDQUFjLENBQUM7Z0JBQ2pDLFNBQVMsRUFBRSxrQkFBa0I7Z0JBQzdCLEdBQUcsRUFBRSxJQUFBLHdCQUFRLEVBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQzthQUM1QixDQUFDLENB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QUFJLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLGdEQUFnRCxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBRXhFLGdEQUFnRDtZQUNoRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGdDQUFjLENBQUM7Z0JBQ2pDLFNBQVMsRUFBRSxrQkFBa0I7Z0JBQzdCLElBQUksRUFBRSxJQUFBLHdCQUFRLEVBQUM7b0JBQ2IsUUFBUTtvQkFDUixHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLHFCQUFxQjtpQkFDOUQsQ0FBQzthQUNILENBQUMsQ0FBQztZQUVILE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0REFBNEQsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN0RixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDbEUsTUFBTSxLQUFLLENBQUM7UUFDZCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBcElELHNDQW9JQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBHZXRJdGVtQ29tbWFuZCwgUHV0SXRlbUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBtYXJzaGFsbCwgdW5tYXJzaGFsbCB9IGZyb20gJ0Bhd3Mtc2RrL3V0aWwtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBjcmVhdGVIYXNoIH0gZnJvbSAnY3J5cHRvJztcclxuaW1wb3J0IHsgQW5hbHlzaXNSZXN1bHQgfSBmcm9tICcuLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBhbmFseXNpc0NhY2hlVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19DQUNIRV9UQUJMRSB8fCAnbWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtY2FjaGUtZGV2JztcclxuXHJcbi8vIENhY2hlIFRUTDogMzAgZGF5cyAoaW4gc2Vjb25kcylcclxuY29uc3QgQ0FDSEVfVFRMX1NFQ09ORFMgPSAzMCAqIDI0ICogNjAgKiA2MDtcclxuXHJcbi8qKlxyXG4gKiBBbmFseXNpcyBDYWNoZSBTZXJ2aWNlXHJcbiAqIFxyXG4gKiBQcm92aWRlcyBjYWNoaW5nIGZ1bmN0aW9uYWxpdHkgZm9yIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHMgdG8gYXZvaWRcclxuICogcmUtYW5hbHl6aW5nIGlkZW50aWNhbCBmaWxlcy5cclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogMTAuNyAtIENhY2hlIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGlkZW50aWNhbCBmaWxlc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEFuYWx5c2lzQ2FjaGUge1xyXG4gIHByaXZhdGUgZHluYW1vQ2xpZW50OiBEeW5hbW9EQkNsaWVudDtcclxuXHJcbiAgY29uc3RydWN0b3IoZHluYW1vQ2xpZW50PzogRHluYW1vREJDbGllbnQpIHtcclxuICAgIHRoaXMuZHluYW1vQ2xpZW50ID0gZHluYW1vQ2xpZW50IHx8IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbiB9KTtcclxuICB9XHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgU0hBLTI1NiBoYXNoIG9mIGZpbGUgY29udGVudCBmb3IgY2FjaGUga2V5XHJcbiAgICogXHJcbiAgICogQHBhcmFtIGZpbGVDb250ZW50IC0gVGhlIHNvdXJjZSBjb2RlIGNvbnRlbnQgdG8gaGFzaFxyXG4gICAqIEByZXR1cm5zIFNIQS0yNTYgaGFzaCBhcyBoZXggc3RyaW5nXHJcbiAgICovXHJcbiAgc3RhdGljIGhhc2hGaWxlQ29udGVudChmaWxlQ29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBjcmVhdGVIYXNoKCdzaGEyNTYnKVxyXG4gICAgICAudXBkYXRlKGZpbGVDb250ZW50KVxyXG4gICAgICAuZGlnZXN0KCdoZXgnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGNhY2hlIGZvciBleGlzdGluZyBhbmFseXNpcyByZXN1bHRzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGZpbGVIYXNoIC0gU0hBLTI1NiBoYXNoIG9mIGZpbGUgY29udGVudFxyXG4gICAqIEByZXR1cm5zIENhY2hlZCBhbmFseXNpcyByZXN1bHQgb3IgbnVsbCBpZiBub3QgZm91bmRcclxuICAgKi9cclxuICBhc3luYyBnZXRDYWNoZWRSZXN1bHQoZmlsZUhhc2g6IHN0cmluZyk6IFByb21pc2U8QW5hbHlzaXNSZXN1bHQgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIENoZWNraW5nIGNhY2hlIGZvciBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBhbmFseXNpc0NhY2hlVGFibGUsXHJcbiAgICAgICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVIYXNoIH0pLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5keW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2UuSXRlbSkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNDYWNoZV0gQ2FjaGUgbWlzcyBmb3IgaGFzaDogJHtmaWxlSGFzaH1gKTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgY2FjaGVkSXRlbSA9IHVubWFyc2hhbGwocmVzcG9uc2UuSXRlbSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBDaGVjayBpZiBjYWNoZSBlbnRyeSBoYXMgZXhwaXJlZCAoYWRkaXRpb25hbCBjaGVjayBiZXlvbmQgVFRMKVxyXG4gICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcclxuICAgICAgaWYgKGNhY2hlZEl0ZW0udHRsICYmIGNhY2hlZEl0ZW0udHRsIDwgbm93KSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0NhY2hlXSBDYWNoZSBlbnRyeSBleHBpcmVkIGZvciBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIENhY2hlIGhpdCBmb3IgaGFzaDogJHtmaWxlSGFzaH1gKTtcclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0NhY2hlXSBDYWNoZWQgcmVzdWx0IGZyb206ICR7bmV3IERhdGUoY2FjaGVkSXRlbS50aW1lc3RhbXApLnRvSVNPU3RyaW5nKCl9YCk7XHJcblxyXG4gICAgICAvLyBSZXR1cm4gdGhlIGNhY2hlZCBhbmFseXNpcyByZXN1bHRcclxuICAgICAgcmV0dXJuIGNhY2hlZEl0ZW0uYW5hbHlzaXNSZXN1bHQgYXMgQW5hbHlzaXNSZXN1bHQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbQW5hbHlzaXNDYWNoZV0gRXJyb3IgcmV0cmlldmluZyBmcm9tIGNhY2hlOicsIGVycm9yKTtcclxuICAgICAgLy8gT24gZXJyb3IsIHJldHVybiBudWxsIHRvIHRyaWdnZXIgZnJlc2ggYW5hbHlzaXNcclxuICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdG9yZSBhbmFseXNpcyByZXN1bHQgaW4gY2FjaGVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gZmlsZUhhc2ggLSBTSEEtMjU2IGhhc2ggb2YgZmlsZSBjb250ZW50XHJcbiAgICogQHBhcmFtIGFuYWx5c2lzUmVzdWx0IC0gVGhlIGFuYWx5c2lzIHJlc3VsdCB0byBjYWNoZVxyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEIGZvciB0cmFja2luZ1xyXG4gICAqIEBwYXJhbSBsYW5ndWFnZSAtIFByb2dyYW1taW5nIGxhbmd1YWdlIChDIG9yIENQUClcclxuICAgKi9cclxuICBhc3luYyBzZXRDYWNoZWRSZXN1bHQoXHJcbiAgICBmaWxlSGFzaDogc3RyaW5nLFxyXG4gICAgYW5hbHlzaXNSZXN1bHQ6IEFuYWx5c2lzUmVzdWx0LFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBsYW5ndWFnZTogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIFN0b3JpbmcgcmVzdWx0IGluIGNhY2hlIGZvciBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG5cclxuICAgICAgY29uc3Qgbm93ID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XHJcbiAgICAgIGNvbnN0IHR0bCA9IG5vdyArIENBQ0hFX1RUTF9TRUNPTkRTO1xyXG5cclxuICAgICAgY29uc3QgY2FjaGVJdGVtID0ge1xyXG4gICAgICAgIGZpbGVIYXNoLFxyXG4gICAgICAgIGFuYWx5c2lzUmVzdWx0LFxyXG4gICAgICAgIHVzZXJJZCxcclxuICAgICAgICBsYW5ndWFnZSxcclxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgICAgdHRsLCAvLyBEeW5hbW9EQiBUVEwgYXR0cmlidXRlIChVbml4IHRpbWVzdGFtcCBpbiBzZWNvbmRzKVxyXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiBhbmFseXNpc0NhY2hlVGFibGUsXHJcbiAgICAgICAgSXRlbTogbWFyc2hhbGwoY2FjaGVJdGVtKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0NhY2hlXSBTdWNjZXNzZnVsbHkgY2FjaGVkIHJlc3VsdCBmb3IgaGFzaDogJHtmaWxlSGFzaH1gKTtcclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0NhY2hlXSBDYWNoZSB3aWxsIGV4cGlyZSBhdDogJHtuZXcgRGF0ZSh0dGwgKiAxMDAwKS50b0lTT1N0cmluZygpfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0FuYWx5c2lzQ2FjaGVdIEVycm9yIHN0b3JpbmcgaW4gY2FjaGU6JywgZXJyb3IpO1xyXG4gICAgICAvLyBEb24ndCB0aHJvdyAtIGNhY2hpbmcgZmFpbHVyZSBzaG91bGRuJ3QgYnJlYWsgYW5hbHlzaXNcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEludmFsaWRhdGUgY2FjaGUgZW50cnkgZm9yIGEgc3BlY2lmaWMgZmlsZSBoYXNoXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGZpbGVIYXNoIC0gU0hBLTI1NiBoYXNoIG9mIGZpbGUgY29udGVudFxyXG4gICAqL1xyXG4gIGFzeW5jIGludmFsaWRhdGVDYWNoZShmaWxlSGFzaDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIEludmFsaWRhdGluZyBjYWNoZSBmb3IgaGFzaDogJHtmaWxlSGFzaH1gKTtcclxuXHJcbiAgICAgIC8vIFNldCBUVEwgdG8gY3VycmVudCB0aW1lIHRvIGV4cGlyZSBpbW1lZGlhdGVseVxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzQ2FjaGVUYWJsZSxcclxuICAgICAgICBJdGVtOiBtYXJzaGFsbCh7XHJcbiAgICAgICAgICBmaWxlSGFzaCxcclxuICAgICAgICAgIHR0bDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkgLSAxLCAvLyBFeHBpcmUgaW1tZWRpYXRlbHlcclxuICAgICAgICB9KSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0NhY2hlXSBTdWNjZXNzZnVsbHkgaW52YWxpZGF0ZWQgY2FjaGUgZm9yIGhhc2g6ICR7ZmlsZUhhc2h9YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbQW5hbHlzaXNDYWNoZV0gRXJyb3IgaW52YWxpZGF0aW5nIGNhY2hlOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==