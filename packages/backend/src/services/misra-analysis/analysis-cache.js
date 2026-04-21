"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisCache = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_dynamodb_2 = require("@aws-sdk/client-dynamodb");
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
            const command = new client_dynamodb_2.GetItemCommand({
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
            const command = new client_dynamodb_2.PutItemCommand({
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
            const command = new client_dynamodb_2.PutItemCommand({
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtY2FjaGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbmFseXNpcy1jYWNoZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEQ7QUFDMUQsOERBQTBFO0FBQzFFLDBEQUE4RDtBQUM5RCxtQ0FBb0M7QUFHcEMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDO0FBQ3JELE1BQU0sa0JBQWtCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsSUFBSSxtQ0FBbUMsQ0FBQztBQUVuRyxrQ0FBa0M7QUFDbEMsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUM7QUFFNUM7Ozs7Ozs7R0FPRztBQUNILE1BQWEsYUFBYTtJQUNoQixZQUFZLENBQWlCO0lBRXJDLFlBQVksWUFBNkI7UUFDdkMsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLElBQUksSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUNyRSxDQUFDO0lBQ0Q7Ozs7O09BS0c7SUFDSCxNQUFNLENBQUMsZUFBZSxDQUFDLFdBQW1CO1FBQ3hDLE9BQU8sSUFBQSxtQkFBVSxFQUFDLFFBQVEsQ0FBQzthQUN4QixNQUFNLENBQUMsV0FBVyxDQUFDO2FBQ25CLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsZUFBZSxDQUFDLFFBQWdCO1FBQ3BDLElBQUksQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLFFBQVEsRUFBRSxDQUFDLENBQUM7WUFFcEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO2dCQUNqQyxTQUFTLEVBQUUsa0JBQWtCO2dCQUM3QixHQUFHLEVBQUUsSUFBQSx3QkFBUSxFQUFDLEVBQUUsUUFBUSxFQUFFLENBQUM7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UUFBZ0I7UUFDcEMsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsUUFBUSxFQUFFLENBQUMsQ0FBQztZQUV4RSxnREFBZ0Q7WUFDaEQsTUFBTSxPQUFPLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO2dCQUNqQyxTQUFTLEVBQUUsa0JBQWtCO2dCQUM3QixJQUFJLEVBQUUsSUFBQSx3QkFBUSxFQUFDO29CQUNiLFFBQVE7b0JBQ1IsR0FBRyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxxQkFBcUI7aUJBQzlELENBQUM7YUFDSCxDQUFDLENBQUM7WUFFSCxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXRDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNERBQTRELFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xFLE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7Q0FDRjtBQXBJRCxzQ0FvSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IEdldEl0ZW1Db21tYW5kLCBQdXRJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1hcnNoYWxsLCB1bm1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcbmltcG9ydCB7IGNyZWF0ZUhhc2ggfSBmcm9tICdjcnlwdG8nO1xyXG5pbXBvcnQgeyBBbmFseXNpc1Jlc3VsdCB9IGZyb20gJy4uLy4uL3R5cGVzL21pc3JhLWFuYWx5c2lzJztcclxuXHJcbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSc7XHJcbmNvbnN0IGFuYWx5c2lzQ2FjaGVUYWJsZSA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX0NBQ0hFX1RBQkxFIHx8ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1jYWNoZS1kZXYnO1xyXG5cclxuLy8gQ2FjaGUgVFRMOiAzMCBkYXlzIChpbiBzZWNvbmRzKVxyXG5jb25zdCBDQUNIRV9UVExfU0VDT05EUyA9IDMwICogMjQgKiA2MCAqIDYwO1xyXG5cclxuLyoqXHJcbiAqIEFuYWx5c2lzIENhY2hlIFNlcnZpY2VcclxuICogXHJcbiAqIFByb3ZpZGVzIGNhY2hpbmcgZnVuY3Rpb25hbGl0eSBmb3IgTUlTUkEgYW5hbHlzaXMgcmVzdWx0cyB0byBhdm9pZFxyXG4gKiByZS1hbmFseXppbmcgaWRlbnRpY2FsIGZpbGVzLlxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiAxMC43IC0gQ2FjaGUgYW5hbHlzaXMgcmVzdWx0cyBmb3IgaWRlbnRpY2FsIGZpbGVzXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQW5hbHlzaXNDYWNoZSB7XHJcbiAgcHJpdmF0ZSBkeW5hbW9DbGllbnQ6IER5bmFtb0RCQ2xpZW50O1xyXG5cclxuICBjb25zdHJ1Y3RvcihkeW5hbW9DbGllbnQ/OiBEeW5hbW9EQkNsaWVudCkge1xyXG4gICAgdGhpcy5keW5hbW9DbGllbnQgPSBkeW5hbW9DbGllbnQgfHwgbmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG4gIH1cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBTSEEtMjU2IGhhc2ggb2YgZmlsZSBjb250ZW50IGZvciBjYWNoZSBrZXlcclxuICAgKiBcclxuICAgKiBAcGFyYW0gZmlsZUNvbnRlbnQgLSBUaGUgc291cmNlIGNvZGUgY29udGVudCB0byBoYXNoXHJcbiAgICogQHJldHVybnMgU0hBLTI1NiBoYXNoIGFzIGhleCBzdHJpbmdcclxuICAgKi9cclxuICBzdGF0aWMgaGFzaEZpbGVDb250ZW50KGZpbGVDb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGNyZWF0ZUhhc2goJ3NoYTI1NicpXHJcbiAgICAgIC51cGRhdGUoZmlsZUNvbnRlbnQpXHJcbiAgICAgIC5kaWdlc3QoJ2hleCcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgY2FjaGUgZm9yIGV4aXN0aW5nIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gZmlsZUhhc2ggLSBTSEEtMjU2IGhhc2ggb2YgZmlsZSBjb250ZW50XHJcbiAgICogQHJldHVybnMgQ2FjaGVkIGFuYWx5c2lzIHJlc3VsdCBvciBudWxsIGlmIG5vdCBmb3VuZFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldENhY2hlZFJlc3VsdChmaWxlSGFzaDogc3RyaW5nKTogUHJvbWlzZTxBbmFseXNpc1Jlc3VsdCB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNDYWNoZV0gQ2hlY2tpbmcgY2FjaGUgZm9yIGhhc2g6ICR7ZmlsZUhhc2h9YCk7XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldEl0ZW1Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzQ2FjaGVUYWJsZSxcclxuICAgICAgICBLZXk6IG1hcnNoYWxsKHsgZmlsZUhhc2ggfSksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG5cclxuICAgICAgaWYgKCFyZXNwb25zZS5JdGVtKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc0NhY2hlXSBDYWNoZSBtaXNzIGZvciBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBjYWNoZWRJdGVtID0gdW5tYXJzaGFsbChyZXNwb25zZS5JdGVtKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENoZWNrIGlmIGNhY2hlIGVudHJ5IGhhcyBleHBpcmVkIChhZGRpdGlvbmFsIGNoZWNrIGJleW9uZCBUVEwpXHJcbiAgICAgIGNvbnN0IG5vdyA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xyXG4gICAgICBpZiAoY2FjaGVkSXRlbS50dGwgJiYgY2FjaGVkSXRlbS50dGwgPCBub3cpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIENhY2hlIGVudHJ5IGV4cGlyZWQgZm9yIGhhc2g6ICR7ZmlsZUhhc2h9YCk7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNDYWNoZV0gQ2FjaGUgaGl0IGZvciBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIENhY2hlZCByZXN1bHQgZnJvbTogJHtuZXcgRGF0ZShjYWNoZWRJdGVtLnRpbWVzdGFtcCkudG9JU09TdHJpbmcoKX1gKTtcclxuXHJcbiAgICAgIC8vIFJldHVybiB0aGUgY2FjaGVkIGFuYWx5c2lzIHJlc3VsdFxyXG4gICAgICByZXR1cm4gY2FjaGVkSXRlbS5hbmFseXNpc1Jlc3VsdCBhcyBBbmFseXNpc1Jlc3VsdDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tBbmFseXNpc0NhY2hlXSBFcnJvciByZXRyaWV2aW5nIGZyb20gY2FjaGU6JywgZXJyb3IpO1xyXG4gICAgICAvLyBPbiBlcnJvciwgcmV0dXJuIG51bGwgdG8gdHJpZ2dlciBmcmVzaCBhbmFseXNpc1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFN0b3JlIGFuYWx5c2lzIHJlc3VsdCBpbiBjYWNoZVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBmaWxlSGFzaCAtIFNIQS0yNTYgaGFzaCBvZiBmaWxlIGNvbnRlbnRcclxuICAgKiBAcGFyYW0gYW5hbHlzaXNSZXN1bHQgLSBUaGUgYW5hbHlzaXMgcmVzdWx0IHRvIGNhY2hlXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSUQgZm9yIHRyYWNraW5nXHJcbiAgICogQHBhcmFtIGxhbmd1YWdlIC0gUHJvZ3JhbW1pbmcgbGFuZ3VhZ2UgKEMgb3IgQ1BQKVxyXG4gICAqL1xyXG4gIGFzeW5jIHNldENhY2hlZFJlc3VsdChcclxuICAgIGZpbGVIYXNoOiBzdHJpbmcsXHJcbiAgICBhbmFseXNpc1Jlc3VsdDogQW5hbHlzaXNSZXN1bHQsXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIGxhbmd1YWdlOiBzdHJpbmdcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNDYWNoZV0gU3RvcmluZyByZXN1bHQgaW4gY2FjaGUgZm9yIGhhc2g6ICR7ZmlsZUhhc2h9YCk7XHJcblxyXG4gICAgICBjb25zdCBub3cgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcclxuICAgICAgY29uc3QgdHRsID0gbm93ICsgQ0FDSEVfVFRMX1NFQ09ORFM7XHJcblxyXG4gICAgICBjb25zdCBjYWNoZUl0ZW0gPSB7XHJcbiAgICAgICAgZmlsZUhhc2gsXHJcbiAgICAgICAgYW5hbHlzaXNSZXN1bHQsXHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIGxhbmd1YWdlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuICAgICAgICB0dGwsIC8vIER5bmFtb0RCIFRUTCBhdHRyaWJ1dGUgKFVuaXggdGltZXN0YW1wIGluIHNlY29uZHMpXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dEl0ZW1Db21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzQ2FjaGVUYWJsZSxcclxuICAgICAgICBJdGVtOiBtYXJzaGFsbChjYWNoZUl0ZW0pLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIFN1Y2Nlc3NmdWxseSBjYWNoZWQgcmVzdWx0IGZvciBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIENhY2hlIHdpbGwgZXhwaXJlIGF0OiAke25ldyBEYXRlKHR0bCAqIDEwMDApLnRvSVNPU3RyaW5nKCl9YCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbQW5hbHlzaXNDYWNoZV0gRXJyb3Igc3RvcmluZyBpbiBjYWNoZTonLCBlcnJvcik7XHJcbiAgICAgIC8vIERvbid0IHRocm93IC0gY2FjaGluZyBmYWlsdXJlIHNob3VsZG4ndCBicmVhayBhbmFseXNpc1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSW52YWxpZGF0ZSBjYWNoZSBlbnRyeSBmb3IgYSBzcGVjaWZpYyBmaWxlIGhhc2hcclxuICAgKiBcclxuICAgKiBAcGFyYW0gZmlsZUhhc2ggLSBTSEEtMjU2IGhhc2ggb2YgZmlsZSBjb250ZW50XHJcbiAgICovXHJcbiAgYXN5bmMgaW52YWxpZGF0ZUNhY2hlKGZpbGVIYXNoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNDYWNoZV0gSW52YWxpZGF0aW5nIGNhY2hlIGZvciBoYXNoOiAke2ZpbGVIYXNofWApO1xyXG5cclxuICAgICAgLy8gU2V0IFRUTCB0byBjdXJyZW50IHRpbWUgdG8gZXhwaXJlIGltbWVkaWF0ZWx5XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogYW5hbHlzaXNDYWNoZVRhYmxlLFxyXG4gICAgICAgIEl0ZW06IG1hcnNoYWxsKHtcclxuICAgICAgICAgIGZpbGVIYXNoLFxyXG4gICAgICAgICAgdHRsOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKSAtIDEsIC8vIEV4cGlyZSBpbW1lZGlhdGVseVxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzQ2FjaGVdIFN1Y2Nlc3NmdWxseSBpbnZhbGlkYXRlZCBjYWNoZSBmb3IgaGFzaDogJHtmaWxlSGFzaH1gKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tBbmFseXNpc0NhY2hlXSBFcnJvciBpbnZhbGlkYXRpbmcgY2FjaGU6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcbn1cclxuIl19