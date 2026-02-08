"use strict";
/**
 * Analysis Results Service
 * Manages persistence and retrieval of MISRA analysis results
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisResultsService = void 0;
const uuid_1 = require("uuid");
class AnalysisResultsService {
    dbClient;
    constructor(dbClient) {
        this.dbClient = dbClient;
    }
    /**
     * Store analysis result in DynamoDB
     */
    async storeAnalysisResult(analysisResult, userId, organizationId) {
        const analysisId = (0, uuid_1.v4)();
        const timestamp = Date.now();
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
        await this.dbClient.putItem(storedResult);
        return storedResult;
    }
    /**
     * Get analysis result by ID
     */
    async getAnalysisResult(analysisId, timestamp) {
        const result = await this.dbClient.getItem({
            analysisId,
            timestamp
        });
        return result;
    }
    /**
     * Get all analysis results for a file
     */
    async getFileAnalysisHistory(fileId, pagination) {
        const limit = pagination?.limit || 50;
        const results = await this.dbClient.queryByIndex('fileId-timestamp-index', 'fileId', fileId, {
            limit,
            exclusiveStartKey: pagination?.exclusiveStartKey,
            scanIndexForward: false // Most recent first
        });
        return {
            items: results.items,
            lastEvaluatedKey: results.lastEvaluatedKey,
            count: results.count,
            scannedCount: results.scannedCount
        };
    }
    /**
     * Get all analysis results for a user
     */
    async getUserAnalysisHistory(userId, pagination) {
        const limit = pagination?.limit || 50;
        const results = await this.dbClient.queryByIndex('userId-timestamp-index', 'userId', userId, {
            limit,
            exclusiveStartKey: pagination?.exclusiveStartKey,
            scanIndexForward: false // Most recent first
        });
        return {
            items: results.items,
            lastEvaluatedKey: results.lastEvaluatedKey,
            count: results.count,
            scannedCount: results.scannedCount
        };
    }
    /**
     * Get analysis results by rule set
     */
    async getAnalysisByRuleSet(ruleSet, pagination) {
        const limit = pagination?.limit || 50;
        const results = await this.dbClient.queryByIndex('ruleSet-timestamp-index', 'ruleSet', ruleSet, {
            limit,
            exclusiveStartKey: pagination?.exclusiveStartKey,
            scanIndexForward: false // Most recent first
        });
        return {
            items: results.items,
            lastEvaluatedKey: results.lastEvaluatedKey,
            count: results.count,
            scannedCount: results.scannedCount
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
        else if (filters.ruleSet) {
            return this.getAnalysisByRuleSet(filters.ruleSet, pagination);
        }
        // If no specific index filter, scan with filters (less efficient)
        return this.scanWithFilters(filters, pagination);
    }
    /**
     * Scan table with filters (fallback for complex queries)
     */
    async scanWithFilters(filters, pagination) {
        const limit = pagination?.limit || 50;
        // Build filter expression
        const filterParts = [];
        const expressionAttributeNames = {};
        const expressionAttributeValues = {};
        if (filters.startDate) {
            filterParts.push('#timestamp >= :startDate');
            expressionAttributeNames['#timestamp'] = 'timestamp';
            expressionAttributeValues[':startDate'] = filters.startDate;
        }
        if (filters.endDate) {
            filterParts.push('#timestamp <= :endDate');
            expressionAttributeNames['#timestamp'] = 'timestamp';
            expressionAttributeValues[':endDate'] = filters.endDate;
        }
        if (filters.minViolations !== undefined) {
            filterParts.push('#violationsCount >= :minViolations');
            expressionAttributeNames['#violationsCount'] = 'violationsCount';
            expressionAttributeValues[':minViolations'] = filters.minViolations;
        }
        if (filters.maxViolations !== undefined) {
            filterParts.push('#violationsCount <= :maxViolations');
            expressionAttributeNames['#violationsCount'] = 'violationsCount';
            expressionAttributeValues[':maxViolations'] = filters.maxViolations;
        }
        if (filters.successOnly) {
            filterParts.push('#success = :success');
            expressionAttributeNames['#success'] = 'success';
            expressionAttributeValues[':success'] = true;
        }
        const filterExpression = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;
        const results = await this.dbClient.scan({
            limit,
            exclusiveStartKey: pagination?.exclusiveStartKey,
            filterExpression,
            expressionAttributeNames: Object.keys(expressionAttributeNames).length > 0
                ? expressionAttributeNames
                : undefined,
            expressionAttributeValues: Object.keys(expressionAttributeValues).length > 0
                ? expressionAttributeValues
                : undefined
        });
        return {
            items: results.items,
            lastEvaluatedKey: results.lastEvaluatedKey,
            count: results.count,
            scannedCount: results.scannedCount
        };
    }
    /**
     * Delete analysis result
     */
    async deleteAnalysisResult(analysisId, timestamp) {
        await this.dbClient.deleteItem({
            analysisId,
            timestamp
        });
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
}
exports.AnalysisResultsService = AnalysisResultsService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtcmVzdWx0cy1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHlzaXMtcmVzdWx0cy1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILCtCQUFvQztBQVdwQyxNQUFhLHNCQUFzQjtJQUNKO0lBQTdCLFlBQTZCLFFBQStCO1FBQS9CLGFBQVEsR0FBUixRQUFRLENBQXVCO0lBQUcsQ0FBQztJQUVoRTs7T0FFRztJQUNILEtBQUssQ0FBQyxtQkFBbUIsQ0FDdkIsY0FBOEIsRUFDOUIsTUFBYyxFQUNkLGNBQXVCO1FBRXZCLE1BQU0sVUFBVSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFDNUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTdCLHNDQUFzQztRQUN0QyxNQUFNLGdCQUFnQixHQUFzQixjQUFjLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDOUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNO1lBQ2hCLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTztZQUNsQixRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVE7WUFDcEIsVUFBVSxFQUFFLENBQUMsQ0FBQyxVQUFVO1lBQ3hCLFlBQVksRUFBRSxDQUFDLENBQUMsWUFBWTtZQUM1QixPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU87WUFDbEIsV0FBVyxFQUFFLENBQUMsQ0FBQyxXQUFXO1lBQzFCLGNBQWMsRUFBRSxDQUFDLENBQUMsY0FBYztTQUNqQyxDQUFDLENBQUMsQ0FBQztRQUVKLE1BQU0sWUFBWSxHQUF5QjtZQUN6QyxVQUFVO1lBQ1YsTUFBTSxFQUFFLGNBQWMsQ0FBQyxNQUFNO1lBQzdCLE1BQU07WUFDTixjQUFjO1lBQ2QsUUFBUSxFQUFFLGNBQWMsQ0FBQyxRQUFRO1lBQ2pDLE9BQU8sRUFBRSxjQUFjLENBQUMsT0FBTztZQUMv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O0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUFDLE1BQWM7UUFPdkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFM0UsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7UUFDM0MsTUFBTSxrQkFBa0IsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDdkUsTUFBTSxjQUFjLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDcEUsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyRixNQUFNLHdCQUF3QixHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6RixPQUFPO1lBQ0wsYUFBYTtZQUNiLGtCQUFrQjtZQUNsQixjQUFjO1lBQ2QsZUFBZTtZQUNmLHdCQUF3QixFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRztTQUMzRSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBclJELHdEQXFSQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBbmFseXNpcyBSZXN1bHRzIFNlcnZpY2VcclxuICogTWFuYWdlcyBwZXJzaXN0ZW5jZSBhbmQgcmV0cmlldmFsIG9mIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHNcclxuICovXHJcblxyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnRXcmFwcGVyIH0gZnJvbSAnLi4vZGF0YWJhc2UvZHluYW1vZGItY2xpZW50JztcclxuaW1wb3J0IHtcclxuICBTdG9yZWRBbmFseXNpc1Jlc3VsdCxcclxuICBTdG9yZWRWaW9sYXRpb24sXHJcbiAgQW5hbHlzaXNRdWVyeUZpbHRlcnMsXHJcbiAgQW5hbHlzaXNQYWdpbmF0aW9uT3B0aW9ucyxcclxuICBQYWdpbmF0ZWRBbmFseXNpc1Jlc3VsdHNcclxufSBmcm9tICcuLi90eXBlcy9hbmFseXNpcy1wZXJzaXN0ZW5jZSc7XHJcbmltcG9ydCB7IEFuYWx5c2lzUmVzdWx0LCBSdWxlVmlvbGF0aW9uIH0gZnJvbSAnLi4vdHlwZXMvbWlzcmEtcnVsZXMnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEFuYWx5c2lzUmVzdWx0c1NlcnZpY2Uge1xyXG4gIGNvbnN0cnVjdG9yKHByaXZhdGUgcmVhZG9ubHkgZGJDbGllbnQ6IER5bmFtb0RCQ2xpZW50V3JhcHBlcikge31cclxuXHJcbiAgLyoqXHJcbiAgICogU3RvcmUgYW5hbHlzaXMgcmVzdWx0IGluIER5bmFtb0RCXHJcbiAgICovXHJcbiAgYXN5bmMgc3RvcmVBbmFseXNpc1Jlc3VsdChcclxuICAgIGFuYWx5c2lzUmVzdWx0OiBBbmFseXNpc1Jlc3VsdCxcclxuICAgIHVzZXJJZDogc3RyaW5nLFxyXG4gICAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmdcclxuICApOiBQcm9taXNlPFN0b3JlZEFuYWx5c2lzUmVzdWx0PiB7XHJcbiAgICBjb25zdCBhbmFseXNpc0lkID0gdXVpZHY0KCk7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIC8vIENvbnZlcnQgdmlvbGF0aW9ucyB0byBzdG9yZWQgZm9ybWF0XHJcbiAgICBjb25zdCBzdG9yZWRWaW9sYXRpb25zOiBTdG9yZWRWaW9sYXRpb25bXSA9IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubWFwKHYgPT4gKHtcclxuICAgICAgcnVsZUlkOiB2LnJ1bGVJZCxcclxuICAgICAgcnVsZVNldDogdi5ydWxlU2V0LFxyXG4gICAgICBzZXZlcml0eTogdi5zZXZlcml0eSxcclxuICAgICAgbGluZU51bWJlcjogdi5saW5lTnVtYmVyLFxyXG4gICAgICBjb2x1bW5OdW1iZXI6IHYuY29sdW1uTnVtYmVyLFxyXG4gICAgICBtZXNzYWdlOiB2Lm1lc3NhZ2UsXHJcbiAgICAgIGNvZGVTbmlwcGV0OiB2LmNvZGVTbmlwcGV0LFxyXG4gICAgICByZWNvbW1lbmRhdGlvbjogdi5yZWNvbW1lbmRhdGlvblxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbnN0IHN0b3JlZFJlc3VsdDogU3RvcmVkQW5hbHlzaXNSZXN1bHQgPSB7XHJcbiAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZDogYW5hbHlzaXNSZXN1bHQuZmlsZUlkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkLFxyXG4gICAgICBmaWxlTmFtZTogYW5hbHlzaXNSZXN1bHQuZmlsZU5hbWUsXHJcbiAgICAgIHJ1bGVTZXQ6IGFuYWx5c2lzUmVzdWx0LnJ1bGVTZXQsXHJcbiAgICAgIHRpbWVzdGFtcCxcclxuICAgICAgdmlvbGF0aW9uc0NvdW50OiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zQ291bnQsXHJcbiAgICAgIHJ1bGVzQ2hlY2tlZDogYW5hbHlzaXNSZXN1bHQucnVsZXNDaGVja2VkLFxyXG4gICAgICB2aW9sYXRpb25zOiBzdG9yZWRWaW9sYXRpb25zLFxyXG4gICAgICBzdWNjZXNzOiBhbmFseXNpc1Jlc3VsdC5zdWNjZXNzLFxyXG4gICAgICBlcnJvck1lc3NhZ2U6IGFuYWx5c2lzUmVzdWx0LmVycm9yTWVzc2FnZSxcclxuICAgICAgY3JlYXRlZEF0OiB0aW1lc3RhbXAsXHJcbiAgICAgIHVwZGF0ZWRBdDogdGltZXN0YW1wXHJcbiAgICB9O1xyXG5cclxuICAgIGF3YWl0IHRoaXMuZGJDbGllbnQucHV0SXRlbShzdG9yZWRSZXN1bHQgYXMgUmVjb3JkPHN0cmluZywgYW55Pik7XHJcbiAgICByZXR1cm4gc3RvcmVkUmVzdWx0O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFuYWx5c2lzIHJlc3VsdCBieSBJRFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldEFuYWx5c2lzUmVzdWx0KGFuYWx5c2lzSWQ6IHN0cmluZywgdGltZXN0YW1wOiBudW1iZXIpOiBQcm9taXNlPFN0b3JlZEFuYWx5c2lzUmVzdWx0IHwgbnVsbD4ge1xyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kYkNsaWVudC5nZXRJdGVtKHtcclxuICAgICAgYW5hbHlzaXNJZCxcclxuICAgICAgdGltZXN0YW1wXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0IGFzIFN0b3JlZEFuYWx5c2lzUmVzdWx0IHwgbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbGwgYW5hbHlzaXMgcmVzdWx0cyBmb3IgYSBmaWxlXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0RmlsZUFuYWx5c2lzSGlzdG9yeShcclxuICAgIGZpbGVJZDogc3RyaW5nLFxyXG4gICAgcGFnaW5hdGlvbj86IEFuYWx5c2lzUGFnaW5hdGlvbk9wdGlvbnNcclxuICApOiBQcm9taXNlPFBhZ2luYXRlZEFuYWx5c2lzUmVzdWx0cz4ge1xyXG4gICAgY29uc3QgbGltaXQgPSBwYWdpbmF0aW9uPy5saW1pdCB8fCA1MDtcclxuXHJcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgdGhpcy5kYkNsaWVudC5xdWVyeUJ5SW5kZXgoXHJcbiAgICAgICdmaWxlSWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgJ2ZpbGVJZCcsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAge1xyXG4gICAgICAgIGxpbWl0LFxyXG4gICAgICAgIGV4Y2x1c2l2ZVN0YXJ0S2V5OiBwYWdpbmF0aW9uPy5leGNsdXNpdmVTdGFydEtleSxcclxuICAgICAgICBzY2FuSW5kZXhGb3J3YXJkOiBmYWxzZSAvLyBNb3N0IHJlY2VudCBmaXJzdFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGl0ZW1zOiByZXN1bHRzLml0ZW1zIGFzIFN0b3JlZEFuYWx5c2lzUmVzdWx0W10sXHJcbiAgICAgIGxhc3RFdmFsdWF0ZWRLZXk6IHJlc3VsdHMubGFzdEV2YWx1YXRlZEtleSxcclxuICAgICAgY291bnQ6IHJlc3VsdHMuY291bnQsXHJcbiAgICAgIHNjYW5uZWRDb3VudDogcmVzdWx0cy5zY2FubmVkQ291bnRcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgYWxsIGFuYWx5c2lzIHJlc3VsdHMgZm9yIGEgdXNlclxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFVzZXJBbmFseXNpc0hpc3RvcnkoXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIHBhZ2luYXRpb24/OiBBbmFseXNpc1BhZ2luYXRpb25PcHRpb25zXHJcbiAgKTogUHJvbWlzZTxQYWdpbmF0ZWRBbmFseXNpc1Jlc3VsdHM+IHtcclxuICAgIGNvbnN0IGxpbWl0ID0gcGFnaW5hdGlvbj8ubGltaXQgfHwgNTA7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMuZGJDbGllbnQucXVlcnlCeUluZGV4KFxyXG4gICAgICAndXNlcklkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgICd1c2VySWQnLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHtcclxuICAgICAgICBsaW1pdCxcclxuICAgICAgICBleGNsdXNpdmVTdGFydEtleTogcGFnaW5hdGlvbj8uZXhjbHVzaXZlU3RhcnRLZXksXHJcbiAgICAgICAgc2NhbkluZGV4Rm9yd2FyZDogZmFsc2UgLy8gTW9zdCByZWNlbnQgZmlyc3RcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpdGVtczogcmVzdWx0cy5pdGVtcyBhcyBTdG9yZWRBbmFseXNpc1Jlc3VsdFtdLFxyXG4gICAgICBsYXN0RXZhbHVhdGVkS2V5OiByZXN1bHRzLmxhc3RFdmFsdWF0ZWRLZXksXHJcbiAgICAgIGNvdW50OiByZXN1bHRzLmNvdW50LFxyXG4gICAgICBzY2FubmVkQ291bnQ6IHJlc3VsdHMuc2Nhbm5lZENvdW50XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFuYWx5c2lzIHJlc3VsdHMgYnkgcnVsZSBzZXRcclxuICAgKi9cclxuICBhc3luYyBnZXRBbmFseXNpc0J5UnVsZVNldChcclxuICAgIHJ1bGVTZXQ6IHN0cmluZyxcclxuICAgIHBhZ2luYXRpb24/OiBBbmFseXNpc1BhZ2luYXRpb25PcHRpb25zXHJcbiAgKTogUHJvbWlzZTxQYWdpbmF0ZWRBbmFseXNpc1Jlc3VsdHM+IHtcclxuICAgIGNvbnN0IGxpbWl0ID0gcGFnaW5hdGlvbj8ubGltaXQgfHwgNTA7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMuZGJDbGllbnQucXVlcnlCeUluZGV4KFxyXG4gICAgICAncnVsZVNldC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICAncnVsZVNldCcsXHJcbiAgICAgIHJ1bGVTZXQsXHJcbiAgICAgIHtcclxuICAgICAgICBsaW1pdCxcclxuICAgICAgICBleGNsdXNpdmVTdGFydEtleTogcGFnaW5hdGlvbj8uZXhjbHVzaXZlU3RhcnRLZXksXHJcbiAgICAgICAgc2NhbkluZGV4Rm9yd2FyZDogZmFsc2UgLy8gTW9zdCByZWNlbnQgZmlyc3RcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpdGVtczogcmVzdWx0cy5pdGVtcyBhcyBTdG9yZWRBbmFseXNpc1Jlc3VsdFtdLFxyXG4gICAgICBsYXN0RXZhbHVhdGVkS2V5OiByZXN1bHRzLmxhc3RFdmFsdWF0ZWRLZXksXHJcbiAgICAgIGNvdW50OiByZXN1bHRzLmNvdW50LFxyXG4gICAgICBzY2FubmVkQ291bnQ6IHJlc3VsdHMuc2Nhbm5lZENvdW50XHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUXVlcnkgYW5hbHlzaXMgcmVzdWx0cyB3aXRoIGZpbHRlcnNcclxuICAgKi9cclxuICBhc3luYyBxdWVyeUFuYWx5c2lzUmVzdWx0cyhcclxuICAgIGZpbHRlcnM6IEFuYWx5c2lzUXVlcnlGaWx0ZXJzLFxyXG4gICAgcGFnaW5hdGlvbj86IEFuYWx5c2lzUGFnaW5hdGlvbk9wdGlvbnNcclxuICApOiBQcm9taXNlPFBhZ2luYXRlZEFuYWx5c2lzUmVzdWx0cz4ge1xyXG4gICAgLy8gRGV0ZXJtaW5lIHdoaWNoIGluZGV4IHRvIHVzZSBiYXNlZCBvbiBmaWx0ZXJzXHJcbiAgICBpZiAoZmlsdGVycy5maWxlSWQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0RmlsZUFuYWx5c2lzSGlzdG9yeShmaWx0ZXJzLmZpbGVJZCwgcGFnaW5hdGlvbik7XHJcbiAgICB9IGVsc2UgaWYgKGZpbHRlcnMudXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB0aGlzLmdldFVzZXJBbmFseXNpc0hpc3RvcnkoZmlsdGVycy51c2VySWQsIHBhZ2luYXRpb24pO1xyXG4gICAgfSBlbHNlIGlmIChmaWx0ZXJzLnJ1bGVTZXQpIHtcclxuICAgICAgcmV0dXJuIHRoaXMuZ2V0QW5hbHlzaXNCeVJ1bGVTZXQoZmlsdGVycy5ydWxlU2V0LCBwYWdpbmF0aW9uKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBubyBzcGVjaWZpYyBpbmRleCBmaWx0ZXIsIHNjYW4gd2l0aCBmaWx0ZXJzIChsZXNzIGVmZmljaWVudClcclxuICAgIHJldHVybiB0aGlzLnNjYW5XaXRoRmlsdGVycyhmaWx0ZXJzLCBwYWdpbmF0aW9uKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNjYW4gdGFibGUgd2l0aCBmaWx0ZXJzIChmYWxsYmFjayBmb3IgY29tcGxleCBxdWVyaWVzKVxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgc2NhbldpdGhGaWx0ZXJzKFxyXG4gICAgZmlsdGVyczogQW5hbHlzaXNRdWVyeUZpbHRlcnMsXHJcbiAgICBwYWdpbmF0aW9uPzogQW5hbHlzaXNQYWdpbmF0aW9uT3B0aW9uc1xyXG4gICk6IFByb21pc2U8UGFnaW5hdGVkQW5hbHlzaXNSZXN1bHRzPiB7XHJcbiAgICBjb25zdCBsaW1pdCA9IHBhZ2luYXRpb24/LmxpbWl0IHx8IDUwO1xyXG5cclxuICAgIC8vIEJ1aWxkIGZpbHRlciBleHByZXNzaW9uXHJcbiAgICBjb25zdCBmaWx0ZXJQYXJ0czogc3RyaW5nW10gPSBbXTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG4gICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG5cclxuICAgIGlmIChmaWx0ZXJzLnN0YXJ0RGF0ZSkge1xyXG4gICAgICBmaWx0ZXJQYXJ0cy5wdXNoKCcjdGltZXN0YW1wID49IDpzdGFydERhdGUnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdGltZXN0YW1wJ10gPSAndGltZXN0YW1wJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0RGF0ZSddID0gZmlsdGVycy5zdGFydERhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbHRlcnMuZW5kRGF0ZSkge1xyXG4gICAgICBmaWx0ZXJQYXJ0cy5wdXNoKCcjdGltZXN0YW1wIDw9IDplbmREYXRlJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3RpbWVzdGFtcCddID0gJ3RpbWVzdGFtcCc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplbmREYXRlJ10gPSBmaWx0ZXJzLmVuZERhdGU7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbHRlcnMubWluVmlvbGF0aW9ucyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIGZpbHRlclBhcnRzLnB1c2goJyN2aW9sYXRpb25zQ291bnQgPj0gOm1pblZpb2xhdGlvbnMnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdmlvbGF0aW9uc0NvdW50J10gPSAndmlvbGF0aW9uc0NvdW50JztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOm1pblZpb2xhdGlvbnMnXSA9IGZpbHRlcnMubWluVmlvbGF0aW9ucztcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZmlsdGVycy5tYXhWaW9sYXRpb25zICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgZmlsdGVyUGFydHMucHVzaCgnI3Zpb2xhdGlvbnNDb3VudCA8PSA6bWF4VmlvbGF0aW9ucycpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN2aW9sYXRpb25zQ291bnQnXSA9ICd2aW9sYXRpb25zQ291bnQnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6bWF4VmlvbGF0aW9ucyddID0gZmlsdGVycy5tYXhWaW9sYXRpb25zO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChmaWx0ZXJzLnN1Y2Nlc3NPbmx5KSB7XHJcbiAgICAgIGZpbHRlclBhcnRzLnB1c2goJyNzdWNjZXNzID0gOnN1Y2Nlc3MnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjc3VjY2VzcyddID0gJ3N1Y2Nlc3MnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6c3VjY2VzcyddID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBmaWx0ZXJFeHByZXNzaW9uID0gZmlsdGVyUGFydHMubGVuZ3RoID4gMCA/IGZpbHRlclBhcnRzLmpvaW4oJyBBTkQgJykgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMuZGJDbGllbnQuc2Nhbih7XHJcbiAgICAgIGxpbWl0LFxyXG4gICAgICBleGNsdXNpdmVTdGFydEtleTogcGFnaW5hdGlvbj8uZXhjbHVzaXZlU3RhcnRLZXksXHJcbiAgICAgIGZpbHRlckV4cHJlc3Npb24sXHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogT2JqZWN0LmtleXMoZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzKS5sZW5ndGggPiAwIFxyXG4gICAgICAgID8gZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzIFxyXG4gICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBPYmplY3Qua2V5cyhleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzKS5sZW5ndGggPiAwIFxyXG4gICAgICAgID8gZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyBcclxuICAgICAgICA6IHVuZGVmaW5lZFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaXRlbXM6IHJlc3VsdHMuaXRlbXMgYXMgU3RvcmVkQW5hbHlzaXNSZXN1bHRbXSxcclxuICAgICAgbGFzdEV2YWx1YXRlZEtleTogcmVzdWx0cy5sYXN0RXZhbHVhdGVkS2V5LFxyXG4gICAgICBjb3VudDogcmVzdWx0cy5jb3VudCxcclxuICAgICAgc2Nhbm5lZENvdW50OiByZXN1bHRzLnNjYW5uZWRDb3VudFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERlbGV0ZSBhbmFseXNpcyByZXN1bHRcclxuICAgKi9cclxuICBhc3luYyBkZWxldGVBbmFseXNpc1Jlc3VsdChhbmFseXNpc0lkOiBzdHJpbmcsIHRpbWVzdGFtcDogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBhd2FpdCB0aGlzLmRiQ2xpZW50LmRlbGV0ZUl0ZW0oe1xyXG4gICAgICBhbmFseXNpc0lkLFxyXG4gICAgICB0aW1lc3RhbXBcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGFuYWx5c2VzIGJ5IHVzZXIgSUQgKHNpbXBsaWZpZWQgbWV0aG9kIGZvciBBSSBpbnNpZ2h0cylcclxuICAgKi9cclxuICBhc3luYyBnZXRBbmFseXNlc0J5VXNlcklkKFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBvcHRpb25zPzogeyBsaW1pdD86IG51bWJlciB9XHJcbiAgKTogUHJvbWlzZTxTdG9yZWRBbmFseXNpc1Jlc3VsdFtdPiB7XHJcbiAgICBjb25zdCBsaW1pdCA9IG9wdGlvbnM/LmxpbWl0IHx8IDEwMDtcclxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCB0aGlzLmdldFVzZXJBbmFseXNpc0hpc3RvcnkodXNlcklkLCB7IGxpbWl0IH0pO1xyXG4gICAgcmV0dXJuIHJlc3VsdHMuaXRlbXM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgYW5hbHlzaXMgc3RhdGlzdGljcyBmb3IgYSB1c2VyXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0VXNlckFuYWx5c2lzU3RhdHModXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPHtcclxuICAgIHRvdGFsQW5hbHlzZXM6IG51bWJlcjtcclxuICAgIHN1Y2Nlc3NmdWxBbmFseXNlczogbnVtYmVyO1xyXG4gICAgZmFpbGVkQW5hbHlzZXM6IG51bWJlcjtcclxuICAgIHRvdGFsVmlvbGF0aW9uczogbnVtYmVyO1xyXG4gICAgYXZlcmFnZVZpb2xhdGlvbnNQZXJGaWxlOiBudW1iZXI7XHJcbiAgfT4ge1xyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMuZ2V0VXNlckFuYWx5c2lzSGlzdG9yeSh1c2VySWQsIHsgbGltaXQ6IDEwMDAgfSk7XHJcbiAgICBcclxuICAgIGNvbnN0IHRvdGFsQW5hbHlzZXMgPSByZXN1bHRzLml0ZW1zLmxlbmd0aDtcclxuICAgIGNvbnN0IHN1Y2Nlc3NmdWxBbmFseXNlcyA9IHJlc3VsdHMuaXRlbXMuZmlsdGVyKHIgPT4gci5zdWNjZXNzKS5sZW5ndGg7XHJcbiAgICBjb25zdCBmYWlsZWRBbmFseXNlcyA9IHJlc3VsdHMuaXRlbXMuZmlsdGVyKHIgPT4gIXIuc3VjY2VzcykubGVuZ3RoO1xyXG4gICAgY29uc3QgdG90YWxWaW9sYXRpb25zID0gcmVzdWx0cy5pdGVtcy5yZWR1Y2UoKHN1bSwgcikgPT4gc3VtICsgci52aW9sYXRpb25zQ291bnQsIDApO1xyXG4gICAgY29uc3QgYXZlcmFnZVZpb2xhdGlvbnNQZXJGaWxlID0gdG90YWxBbmFseXNlcyA+IDAgPyB0b3RhbFZpb2xhdGlvbnMgLyB0b3RhbEFuYWx5c2VzIDogMDtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0b3RhbEFuYWx5c2VzLFxyXG4gICAgICBzdWNjZXNzZnVsQW5hbHlzZXMsXHJcbiAgICAgIGZhaWxlZEFuYWx5c2VzLFxyXG4gICAgICB0b3RhbFZpb2xhdGlvbnMsXHJcbiAgICAgIGF2ZXJhZ2VWaW9sYXRpb25zUGVyRmlsZTogTWF0aC5yb3VuZChhdmVyYWdlVmlvbGF0aW9uc1BlckZpbGUgKiAxMDApIC8gMTAwXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG4iXX0=