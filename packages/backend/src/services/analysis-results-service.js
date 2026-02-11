"use strict";
/**
 * Analysis Results Service
 * Manages persistence and retrieval of MISRA analysis results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisResultsService = void 0;
const uuid_1 = require("uuid");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
class AnalysisResultsService {
    docClient;
    tableName = 'misra-platform-analysis-results';
    constructor(dbClient) {
        // Create our own DynamoDB client for analysis results table
        const client = new client_dynamodb_1.DynamoDBClient({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client, {
            marshallOptions: {
                convertEmptyValues: false,
                removeUndefinedValues: true,
                convertClassInstanceToMap: false
            },
            unmarshallOptions: {
                wrapNumbers: false
            }
        });
    }
    /**
     * Store analysis result in DynamoDB
     */
    async storeAnalysisResult(analysisResult, userId, organizationId) {
        const analysisId = (0, uuid_1.v4)();
        const timestamp = Math.floor(Date.now() / 1000); // Use seconds for consistency
        // Convert violations to stored format
        const storedViolations = analysisResult.violations.map(v => ({
            ruleId: v.ruleId,
            ruleSet: v.ruleSet,
            severity: v.severity,
            lineNumber: v.lineNumber,
            columnNumber: v.columnNumber,
            message: v.message,
            codeSnippet: v.codeSnippet,
            recommendation: v.recommendation
        }));
        const storedResult = {
            analysisId,
            fileId: analysisResult.fileId,
            userId,
            organizationId,
            fileName: analysisResult.fileName,
            ruleSet: analysisResult.ruleSet,
            timestamp,
            violationsCount: analysisResult.violationsCount,
            rulesChecked: analysisResult.rulesChecked,
            violations: storedViolations,
            success: analysisResult.success,
            errorMessage: analysisResult.errorMessage,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        const command = new lib_dynamodb_1.PutCommand({
            TableName: this.tableName,
            Item: storedResult
        });
        await this.docClient.send(command);
        return storedResult;
    }
    /**
     * Get analysis result by ID
     */
    async getAnalysisResult(analysisId, timestamp) {
        const command = new lib_dynamodb_1.GetCommand({
            TableName: this.tableName,
            Key: {
                analysisId,
                timestamp
            }
        });
        const result = await this.docClient.send(command);
        return result.Item;
    }
    /**
     * Get all analysis results for a file
     */
    async getFileAnalysisHistory(fileId, pagination) {
        const limit = pagination?.limit || 50;
        const command = new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'fileId-timestamp-index',
            KeyConditionExpression: 'fileId = :fileId',
            ExpressionAttributeValues: {
                ':fileId': fileId
            },
            Limit: limit,
            ExclusiveStartKey: pagination?.exclusiveStartKey,
            ScanIndexForward: false // Most recent first
        });
        const result = await this.docClient.send(command);
        return {
            items: result.Items,
            lastEvaluatedKey: result.LastEvaluatedKey,
            count: result.Count || 0,
            scannedCount: result.ScannedCount || 0
        };
    }
    /**
     * Get all analysis results for a user
     */
    async getUserAnalysisHistory(userId, pagination) {
        const limit = pagination?.limit || 50;
        const command = new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'userId-timestamp-index',
            KeyConditionExpression: 'userId = :userId',
            ExpressionAttributeValues: {
                ':userId': userId
            },
            Limit: limit,
            ExclusiveStartKey: pagination?.exclusiveStartKey,
            ScanIndexForward: false // Most recent first
        });
        const result = await this.docClient.send(command);
        return {
            items: result.Items,
            lastEvaluatedKey: result.LastEvaluatedKey,
            count: result.Count || 0,
            scannedCount: result.ScannedCount || 0
        };
    }
    /**
     * Get analyses by user ID (simplified method for AI insights)
     */
    async getAnalysesByUserId(userId, options) {
        const limit = options?.limit || 100;
        const results = await this.getUserAnalysisHistory(userId, { limit });
        return results.items;
    }
    /**
     * Get analysis statistics for a user
     */
    async getUserAnalysisStats(userId) {
        const results = await this.getUserAnalysisHistory(userId, { limit: 1000 });
        const totalAnalyses = results.items.length;
        const successfulAnalyses = results.items.filter(r => r.success).length;
        const failedAnalyses = results.items.filter(r => !r.success).length;
        const totalViolations = results.items.reduce((sum, r) => sum + r.violationsCount, 0);
        const averageViolationsPerFile = totalAnalyses > 0 ? totalViolations / totalAnalyses : 0;
        return {
            totalAnalyses,
            successfulAnalyses,
            failedAnalyses,
            totalViolations,
            averageViolationsPerFile: Math.round(averageViolationsPerFile * 100) / 100
        };
    }
    /**
     * Query analysis results with filters
     */
    async queryAnalysisResults(filters, pagination) {
        // Determine which index to use based on filters
        if (filters.fileId) {
            return this.getFileAnalysisHistory(filters.fileId, pagination);
        }
        else if (filters.userId) {
            return this.getUserAnalysisHistory(filters.userId, pagination);
        }
        // Default: return empty results
        return {
            items: [],
            lastEvaluatedKey: undefined,
            count: 0,
            scannedCount: 0
        };
    }
}
exports.AnalysisResultsService = AnalysisResultsService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtcmVzdWx0cy1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHlzaXMtcmVzdWx0cy1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILCtCQUFvQztBQUNwQyw4REFBMEQ7QUFDMUQsd0RBQXFHO0FBU3JHLE1BQWEsc0JBQXNCO0lBQ3pCLFNBQVMsQ0FBeUI7SUFDbEMsU0FBUyxHQUFHLGlDQUFpQyxDQUFDO0lBRXRELFlBQVksUUFBYztRQUN4Qiw0REFBNEQ7UUFDNUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO1lBQ2hDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO1NBQzlDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRTtZQUNuRCxlQUFlLEVBQUU7Z0JBQ2Ysa0JBQWtCLEVBQUUsS0FBSztnQkFDekIscUJBQXFCLEVBQUUsSUFBSTtnQkFDM0IseUJBQXlCLEVBQUUsS0FBSzthQUNqQztZQUNELGlCQUFpQixFQUFFO2dCQUNqQixXQUFXLEVBQUUsS0FBSzthQUNuQjtTQUNGLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxtQkFBbUIsQ0FDdkIsY0FBOEIsRUFDOUIsTUFBYyxFQUNkLGNBQXVCO1FBRXZCLE1BQU0sVUFBVSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyw4QkFBOEI7UUFFL0Usc0NBQXNDO1FBQ3RDLE1BQU0sZ0JBQWdCLEdBQXNCLGNBQWMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUM5RSxN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QUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNqRSxDQUFDO1FBRUQsZ0NBQWdDO1FBQ2hDLE9BQU87WUFDTCxLQUFLLEVBQUUsRUFBRTtZQUNULGdCQUFnQixFQUFFLFNBQVM7WUFDM0IsS0FBSyxFQUFFLENBQUM7WUFDUixZQUFZLEVBQUUsQ0FBQztTQUNoQixDQUFDO0lBQ0osQ0FBQztDQUNGO0FBbE5ELHdEQWtOQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBbmFseXNpcyBSZXN1bHRzIFNlcnZpY2VcclxuICogTWFuYWdlcyBwZXJzaXN0ZW5jZSBhbmQgcmV0cmlldmFsIG9mIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHNcclxuICovXHJcblxyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kLCBHZXRDb21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQge1xyXG4gIFN0b3JlZEFuYWx5c2lzUmVzdWx0LFxyXG4gIFN0b3JlZFZpb2xhdGlvbixcclxuICBBbmFseXNpc1BhZ2luYXRpb25PcHRpb25zLFxyXG4gIFBhZ2luYXRlZEFuYWx5c2lzUmVzdWx0c1xyXG59IGZyb20gJy4uL3R5cGVzL2FuYWx5c2lzLXBlcnNpc3RlbmNlJztcclxuaW1wb3J0IHsgQW5hbHlzaXNSZXN1bHQgfSBmcm9tICcuLi90eXBlcy9taXNyYS1ydWxlcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQW5hbHlzaXNSZXN1bHRzU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBkb2NDbGllbnQ6IER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XHJcbiAgcHJpdmF0ZSB0YWJsZU5hbWUgPSAnbWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtcmVzdWx0cyc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGRiQ2xpZW50PzogYW55KSB7XHJcbiAgICAvLyBDcmVhdGUgb3VyIG93biBEeW5hbW9EQiBjbGllbnQgZm9yIGFuYWx5c2lzIHJlc3VsdHMgdGFibGVcclxuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJ1xyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIHRoaXMuZG9jQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCwge1xyXG4gICAgICBtYXJzaGFsbE9wdGlvbnM6IHtcclxuICAgICAgICBjb252ZXJ0RW1wdHlWYWx1ZXM6IGZhbHNlLFxyXG4gICAgICAgIHJlbW92ZVVuZGVmaW5lZFZhbHVlczogdHJ1ZSxcclxuICAgICAgICBjb252ZXJ0Q2xhc3NJbnN0YW5jZVRvTWFwOiBmYWxzZVxyXG4gICAgICB9LFxyXG4gICAgICB1bm1hcnNoYWxsT3B0aW9uczoge1xyXG4gICAgICAgIHdyYXBOdW1iZXJzOiBmYWxzZVxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFN0b3JlIGFuYWx5c2lzIHJlc3VsdCBpbiBEeW5hbW9EQlxyXG4gICAqL1xyXG4gIGFzeW5jIHN0b3JlQW5hbHlzaXNSZXN1bHQoXHJcbiAgICBhbmFseXNpc1Jlc3VsdDogQW5hbHlzaXNSZXN1bHQsXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIG9yZ2FuaXphdGlvbklkPzogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxTdG9yZWRBbmFseXNpc1Jlc3VsdD4ge1xyXG4gICAgY29uc3QgYW5hbHlzaXNJZCA9IHV1aWR2NCgpO1xyXG4gICAgY29uc3QgdGltZXN0YW1wID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7IC8vIFVzZSBzZWNvbmRzIGZvciBjb25zaXN0ZW5jeVxyXG5cclxuICAgIC8vIENvbnZlcnQgdmlvbGF0aW9ucyB0byBzdG9yZWQgZm9ybWF0XHJcbiAgICBjb25zdCBzdG9yZWRWaW9sYXRpb25zOiBTdG9yZWRWaW9sYXRpb25bXSA9IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubWFwKHYgPT4gKHtcclxuICAgICAgcnVsZUlkOiB2LnJ1bGVJZCxcclxuICAgICAgcnVsZVNldDogdi5ydWxlU2V0LFxyXG4gICAgICBzZXZlcml0eTogdi5zZXZlcml0eSxcclxuICAgICAgbGluZU51bWJlcjogdi5saW5lTnVtYmVyLFxyXG4gICAgICBjb2x1bW5OdW1iZXI6IHYuY29sdW1uTnVtYmVyLFxyXG4gICAgICBtZXNzYWdlOiB2Lm1lc3NhZ2UsXHJcbiAgICAgIGNvZGVTbmlwcGV0OiB2LmNvZGVTbmlwcGV0LFxyXG4gICAgICByZWNvbW1lbmRhdGlvbjogdi5yZWNvbW1lbmRhdGlvblxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbnN0IHN0b3JlZFJlc3VsdDogU3RvcmVkQW5hbHlzaXNSZXN1bHQgPSB7XHJcbiAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZDogYW5hbHlzaXNSZXN1bHQuZmlsZUlkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkLFxyXG4gICAgICBmaWxlTmFtZTogYW5hbHlzaXNSZXN1bHQuZmlsZU5hbWUsXHJcbiAgICAgIHJ1bGVTZXQ6IGFuYWx5c2lzUmVzdWx0LnJ1bGVTZXQsXHJcbiAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgdmlvbGF0aW9uc0NvdW50OiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zQ291bnQsXHJcbiAgICAgIHJ1bGVzQ2hlY2tlZDogYW5hbHlzaXNSZXN1bHQucnVsZXNDaGVja2VkLFxyXG4gICAgICB2aW9sYXRpb25zOiBzdG9yZWRWaW9sYXRpb25zLFxyXG4gICAgICBzdWNjZXNzOiBhbmFseXNpc1Jlc3VsdC5zdWNjZXNzLFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IGFuYWx5c2lzUmVzdWx0LmVycm9yTWVzc2FnZSxcclxuICAgICAgY3JlYXRlZEF0OiB0aW1lc3RhbXAsXHJcbiAgICAgIHVwZGF0ZWRBdDogdGltZXN0YW1wXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEl0ZW06IHN0b3JlZFJlc3VsdFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIHJldHVybiBzdG9yZWRSZXN1bHQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgYW5hbHlzaXMgcmVzdWx0IGJ5IElEXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0QW5hbHlzaXNSZXN1bHQoYW5hbHlzaXNJZDogc3RyaW5nLCB0aW1lc3RhbXA6IG51bWJlcik6IFByb21pc2U8U3RvcmVkQW5hbHlzaXNSZXN1bHQgfCBudWxsPiB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICBLZXk6IHtcclxuICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgIHRpbWVzdGFtcFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtIGFzIFN0b3JlZEFuYWx5c2lzUmVzdWx0IHwgbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbGwgYW5hbHlzaXMgcmVzdWx0cyBmb3IgYSBmaWxlXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0RmlsZUFuYWx5c2lzSGlzdG9yeShcclxuICAgIGZpbGVJZDogc3RyaW5nLFxyXG4gICAgcGFnaW5hdGlvbj86IEFuYWx5c2lzUGFnaW5hdGlvbk9wdGlvbnNcclxuICApOiBQcm9taXNlPFBhZ2luYXRlZEFuYWx5c2lzUmVzdWx0cz4ge1xyXG4gICAgY29uc3QgbGltaXQgPSBwYWdpbmF0aW9uPy5saW1pdCB8fCA1MDtcclxuXHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEluZGV4TmFtZTogJ2ZpbGVJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAnZmlsZUlkID0gOmZpbGVJZCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOmZpbGVJZCc6IGZpbGVJZFxyXG4gICAgICB9LFxyXG4gICAgICBMaW1pdDogbGltaXQsXHJcbiAgICAgIEV4Y2x1c2l2ZVN0YXJ0S2V5OiBwYWdpbmF0aW9uPy5leGNsdXNpdmVTdGFydEtleSxcclxuICAgICAgU2NhbkluZGV4Rm9yd2FyZDogZmFsc2UgLy8gTW9zdCByZWNlbnQgZmlyc3RcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaXRlbXM6IHJlc3VsdC5JdGVtcyBhcyBTdG9yZWRBbmFseXNpc1Jlc3VsdFtdLFxyXG4gICAgICBsYXN0RXZhbHVhdGVkS2V5OiByZXN1bHQuTGFzdEV2YWx1YXRlZEtleSxcclxuICAgICAgY291bnQ6IHJlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICBzY2FubmVkQ291bnQ6IHJlc3VsdC5TY2FubmVkQ291bnQgfHwgMFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbGwgYW5hbHlzaXMgcmVzdWx0cyBmb3IgYSB1c2VyXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0VXNlckFuYWx5c2lzSGlzdG9yeShcclxuICAgIHVzZXJJZDogc3RyaW5nLFxyXG4gICAgcGFnaW5hdGlvbj86IEFuYWx5c2lzUGFnaW5hdGlvbk9wdGlvbnNcclxuICApOiBQcm9taXNlPFBhZ2luYXRlZEFuYWx5c2lzUmVzdWx0cz4ge1xyXG4gICAgY29uc3QgbGltaXQgPSBwYWdpbmF0aW9uPy5saW1pdCB8fCA1MDtcclxuXHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEluZGV4TmFtZTogJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndXNlcklkID0gOnVzZXJJZCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnVzZXJJZCc6IHVzZXJJZFxyXG4gICAgICB9LFxyXG4gICAgICBMaW1pdDogbGltaXQsXHJcbiAgICAgIEV4Y2x1c2l2ZVN0YXJ0S2V5OiBwYWdpbmF0aW9uPy5leGNsdXNpdmVTdGFydEtleSxcclxuICAgICAgU2NhbkluZGV4Rm9yd2FyZDogZmFsc2UgLy8gTW9zdCByZWNlbnQgZmlyc3RcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaXRlbXM6IHJlc3VsdC5JdGVtcyBhcyBTdG9yZWRBbmFseXNpc1Jlc3VsdFtdLFxyXG4gICAgICBsYXN0RXZhbHVhdGVkS2V5OiByZXN1bHQuTGFzdEV2YWx1YXRlZEtleSxcclxuICAgICAgY291bnQ6IHJlc3VsdC5Db3VudCB8fCAwLFxyXG4gICAgICBzY2FubmVkQ291bnQ6IHJlc3VsdC5TY2FubmVkQ291bnQgfHwgMFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbmFseXNlcyBieSB1c2VyIElEIChzaW1wbGlmaWVkIG1ldGhvZCBmb3IgQUkgaW5zaWdodHMpXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0QW5hbHlzZXNCeVVzZXJJZChcclxuICAgIHVzZXJJZDogc3RyaW5nLFxyXG4gICAgb3B0aW9ucz86IHsgbGltaXQ/OiBudW1iZXIgfVxyXG4gICk6IFByb21pc2U8U3RvcmVkQW5hbHlzaXNSZXN1bHRbXT4ge1xyXG4gICAgY29uc3QgbGltaXQgPSBvcHRpb25zPy5saW1pdCB8fCAxMDA7XHJcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgdGhpcy5nZXRVc2VyQW5hbHlzaXNIaXN0b3J5KHVzZXJJZCwgeyBsaW1pdCB9KTtcclxuICAgIHJldHVybiByZXN1bHRzLml0ZW1zO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFuYWx5c2lzIHN0YXRpc3RpY3MgZm9yIGEgdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFVzZXJBbmFseXNpc1N0YXRzKHVzZXJJZDogc3RyaW5nKTogUHJvbWlzZTx7XHJcbiAgICB0b3RhbEFuYWx5c2VzOiBudW1iZXI7XHJcbiAgICBzdWNjZXNzZnVsQW5hbHlzZXM6IG51bWJlcjtcclxuICAgIGZhaWxlZEFuYWx5c2VzOiBudW1iZXI7XHJcbiAgICB0b3RhbFZpb2xhdGlvbnM6IG51bWJlcjtcclxuICAgIGF2ZXJhZ2VWaW9sYXRpb25zUGVyRmlsZTogbnVtYmVyO1xyXG4gIH0+IHtcclxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmdldFVzZXJBbmFseXNpc0hpc3RvcnkodXNlcklkLCB7IGxpbWl0OiAxMDAwIH0pO1xyXG4gICAgXHJcbiAgICBjb25zdCB0b3RhbEFuYWx5c2VzID0gcmVzdWx0cy5pdGVtcy5sZW5ndGg7XHJcbiAgICBjb25zdCBzdWNjZXNzZnVsQW5hbHlzZXMgPSByZXN1bHRzLml0ZW1zLmZpbHRlcihyID0+IHIuc3VjY2VzcykubGVuZ3RoO1xyXG4gICAgY29uc3QgZmFpbGVkQW5hbHlzZXMgPSByZXN1bHRzLml0ZW1zLmZpbHRlcihyID0+ICFyLnN1Y2Nlc3MpLmxlbmd0aDtcclxuICAgIGNvbnN0IHRvdGFsVmlvbGF0aW9ucyA9IHJlc3VsdHMuaXRlbXMucmVkdWNlKChzdW0sIHIpID0+IHN1bSArIHIudmlvbGF0aW9uc0NvdW50LCAwKTtcclxuICAgIGNvbnN0IGF2ZXJhZ2VWaW9sYXRpb25zUGVyRmlsZSA9IHRvdGFsQW5hbHlzZXMgPiAwID8gdG90YWxWaW9sYXRpb25zIC8gdG90YWxBbmFseXNlcyA6IDA7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgdG90YWxBbmFseXNlcyxcclxuICAgICAgc3VjY2Vzc2Z1bEFuYWx5c2VzLFxyXG4gICAgICBmYWlsZWRBbmFseXNlcyxcclxuICAgICAgdG90YWxWaW9sYXRpb25zLFxyXG4gICAgICBhdmVyYWdlVmlvbGF0aW9uc1BlckZpbGU6IE1hdGgucm91bmQoYXZlcmFnZVZpb2xhdGlvbnNQZXJGaWxlICogMTAwKSAvIDEwMFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFF1ZXJ5IGFuYWx5c2lzIHJlc3VsdHMgd2l0aCBmaWx0ZXJzXHJcbiAgICovXHJcbiAgYXN5bmMgcXVlcnlBbmFseXNpc1Jlc3VsdHMoXHJcbiAgICBmaWx0ZXJzOiBhbnksXHJcbiAgICBwYWdpbmF0aW9uPzogQW5hbHlzaXNQYWdpbmF0aW9uT3B0aW9uc1xyXG4gICk6IFByb21pc2U8UGFnaW5hdGVkQW5hbHlzaXNSZXN1bHRzPiB7XHJcbiAgICAvLyBEZXRlcm1pbmUgd2hpY2ggaW5kZXggdG8gdXNlIGJhc2VkIG9uIGZpbHRlcnNcclxuICAgIGlmIChmaWx0ZXJzLmZpbGVJZCkge1xyXG4gICAgICByZXR1cm4gdGhpcy5nZXRGaWxlQW5hbHlzaXNIaXN0b3J5KGZpbHRlcnMuZmlsZUlkLCBwYWdpbmF0aW9uKTtcclxuICAgIH0gZWxzZSBpZiAoZmlsdGVycy51c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0VXNlckFuYWx5c2lzSGlzdG9yeShmaWx0ZXJzLnVzZXJJZCwgcGFnaW5hdGlvbik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRGVmYXVsdDogcmV0dXJuIGVtcHR5IHJlc3VsdHNcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGl0ZW1zOiBbXSxcclxuICAgICAgbGFzdEV2YWx1YXRlZEtleTogdW5kZWZpbmVkLFxyXG4gICAgICBjb3VudDogMCxcclxuICAgICAgc2Nhbm5lZENvdW50OiAwXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG4iXX0=