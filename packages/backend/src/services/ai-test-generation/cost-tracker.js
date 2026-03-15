"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostTracker = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const DEFAULT_PRICING = {
    'gpt-4': {
        model: 'gpt-4',
        promptTokenRate: 0.00003, // $30 / 1M tokens
        completionTokenRate: 0.00006, // $60 / 1M tokens
    },
    'gpt-3.5-turbo': {
        model: 'gpt-3.5-turbo',
        promptTokenRate: 0.0000005, // $0.50 / 1M tokens
        completionTokenRate: 0.0000015, // $1.50 / 1M tokens
    },
};
const DEFAULT_LIMITS = {
    perUserMonthly: 100, // $100 per user per month
    perProjectMonthly: 50, // $50 per project per month
};
/**
 * Cost Tracker
 *
 * Monitors OpenAI API usage and costs.
 * Tracks token consumption, calculates costs, enforces limits, and provides statistics.
 */
class CostTracker {
    docClient;
    tableName;
    pricing;
    limits;
    constructor(tableName = 'AIUsage', pricing = DEFAULT_PRICING, limits = DEFAULT_LIMITS, docClient) {
        if (docClient) {
            this.docClient = docClient;
        }
        else {
            const client = new client_dynamodb_1.DynamoDBClient({});
            this.docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        }
        this.tableName = tableName;
        this.pricing = pricing;
        this.limits = limits;
    }
    /**
     * Calculate cost based on token usage and model
     *
     * @param tokens - Token usage breakdown
     * @param model - OpenAI model used
     * @returns Calculated cost in USD
     */
    calculateCost(tokens, model) {
        const config = this.pricing[model] || this.pricing['gpt-4'];
        const promptCost = tokens.promptTokens * config.promptTokenRate;
        const completionCost = tokens.completionTokens * config.completionTokenRate;
        return promptCost + completionCost;
    }
    /**
     * Record API usage
     *
     * @param userId - User ID
     * @param projectId - Project ID
     * @param operationType - Type of operation
     * @param tokens - Token usage
     * @param model - OpenAI model used
     * @param testCasesGenerated - Number of test cases generated
     * @param duration - Operation duration in milliseconds
     */
    async recordUsage(userId, projectId, operationType, tokens, model, testCasesGenerated = 0, duration = 0) {
        const cost = this.calculateCost(tokens, model);
        const timestamp = Date.now(); // Store as number (milliseconds since epoch)
        const record = {
            userId,
            timestamp,
            projectId,
            operationType,
            tokens,
            cost,
            testCasesGenerated,
            metadata: {
                model,
                duration,
            },
        };
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: record,
            }));
            console.log(`[Cost Tracker] Recorded usage: ${operationType}, cost: $${cost.toFixed(4)}, tokens: ${tokens.totalTokens}`);
        }
        catch (error) {
            console.error('[Cost Tracker] Failed to record usage:', error);
            throw new Error(`Failed to record usage: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Check if user or project has exceeded usage limits
     *
     * @param userId - User ID
     * @param projectId - Project ID
     * @returns True if within limits, false if limit exceeded
     */
    async checkLimit(userId, projectId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        try {
            // Check user limit
            if (this.limits.perUserMonthly) {
                const userCost = await this.getUserCostSince(userId, startOfMonth);
                if (userCost >= this.limits.perUserMonthly) {
                    console.warn(`[Cost Tracker] User ${userId} exceeded monthly limit: $${userCost.toFixed(2)} >= $${this.limits.perUserMonthly}`);
                    return false;
                }
            }
            // Check project limit
            if (this.limits.perProjectMonthly) {
                const projectCost = await this.getProjectCostSince(projectId, startOfMonth);
                if (projectCost >= this.limits.perProjectMonthly) {
                    console.warn(`[Cost Tracker] Project ${projectId} exceeded monthly limit: $${projectCost.toFixed(2)} >= $${this.limits.perProjectMonthly}`);
                    return false;
                }
            }
            return true;
        }
        catch (error) {
            console.error('[Cost Tracker] Failed to check limits:', error);
            // Fail open - allow request if limit check fails
            return true;
        }
    }
    /**
     * Check if user or project has exceeded usage limits
     * Throws error if limit exceeded
     *
     * @param userId - User ID
     * @param projectId - Project ID
     * @throws Error if limit exceeded
     */
    async checkLimits(userId, projectId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        try {
            // Check user limit
            if (this.limits.perUserMonthly) {
                const userCost = await this.getUserCostSince(userId, startOfMonth);
                if (userCost >= this.limits.perUserMonthly) {
                    throw new Error(`Monthly usage limit exceeded. You have used $${userCost.toFixed(2)} of your $${this.limits.perUserMonthly} monthly limit. Please upgrade your plan or wait until next month.`);
                }
            }
            // Check project limit
            if (this.limits.perProjectMonthly) {
                const projectCost = await this.getProjectCostSince(projectId, startOfMonth);
                if (projectCost >= this.limits.perProjectMonthly) {
                    throw new Error(`Project monthly usage limit exceeded. This project has used $${projectCost.toFixed(2)} of its $${this.limits.perProjectMonthly} monthly limit.`);
                }
            }
        }
        catch (error) {
            // If it's already a limit exceeded error, re-throw it
            if (error instanceof Error && error.message.includes('limit exceeded')) {
                throw error;
            }
            // For other errors, log and fail open (allow request)
            console.error('[Cost Tracker] Failed to check limits:', error);
            // Don't throw - fail open to avoid blocking users due to infrastructure issues
        }
    }
    /**
     * Get total cost for user since a specific date
     *
     * @param userId - User ID
     * @param startDate - Start date (ISO string)
     * @returns Total cost in USD
     */
    async getUserCostSince(userId, startDate) {
        try {
            const startTimestamp = new Date(startDate).getTime();
            const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                KeyConditionExpression: 'userId = :userId AND #ts >= :startDate',
                ExpressionAttributeNames: {
                    '#ts': 'timestamp',
                },
                ExpressionAttributeValues: {
                    ':userId': userId,
                    ':startDate': startTimestamp,
                },
            }));
            if (!result.Items || result.Items.length === 0) {
                return 0;
            }
            return result.Items.reduce((sum, item) => sum + (item.cost || 0), 0);
        }
        catch (error) {
            console.error('[Cost Tracker] Failed to get user cost:', error);
            return 0;
        }
    }
    /**
     * Get total cost for project since a specific date
     *
     * @param projectId - Project ID
     * @param startDate - Start date (ISO string)
     * @returns Total cost in USD
     */
    async getProjectCostSince(projectId, startDate) {
        try {
            const startTimestamp = new Date(startDate).getTime();
            const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: 'projectId-timestamp-index',
                KeyConditionExpression: 'projectId = :projectId AND #ts >= :startDate',
                ExpressionAttributeNames: {
                    '#ts': 'timestamp',
                },
                ExpressionAttributeValues: {
                    ':projectId': projectId,
                    ':startDate': startTimestamp,
                },
            }));
            if (!result.Items || result.Items.length === 0) {
                return 0;
            }
            return result.Items.reduce((sum, item) => sum + (item.cost || 0), 0);
        }
        catch (error) {
            console.error('[Cost Tracker] Failed to get project cost:', error);
            return 0;
        }
    }
    /**
     * Get usage statistics
     *
     * @param userId - Optional user ID filter
     * @param projectId - Optional project ID filter
     * @param startDate - Optional start date filter (ISO string)
     * @param endDate - Optional end date filter (ISO string)
     * @returns Usage statistics
     */
    async getUsageStats(userId, projectId, startDate, endDate) {
        try {
            let items = [];
            if (userId) {
                // Query by user
                const result = await this.queryByUser(userId, startDate, endDate);
                items = result;
            }
            else if (projectId) {
                // Query by project
                const result = await this.queryByProject(projectId, startDate, endDate);
                items = result;
            }
            else {
                // This would require a scan - not recommended for production
                console.warn('[Cost Tracker] Getting stats without userId or projectId requires table scan');
                return {
                    totalCalls: 0,
                    totalTokens: 0,
                    estimatedCost: 0,
                    breakdown: {
                        byUser: new Map(),
                        byProject: new Map(),
                        byDate: new Map(),
                    },
                };
            }
            // Aggregate statistics
            const stats = {
                totalCalls: items.length,
                totalTokens: 0,
                estimatedCost: 0,
                breakdown: {
                    byUser: new Map(),
                    byProject: new Map(),
                    byDate: new Map(),
                },
            };
            items.forEach((item) => {
                stats.totalTokens += item.tokens?.totalTokens || 0;
                stats.estimatedCost += item.cost || 0;
                // Breakdown by user
                const userCost = stats.breakdown.byUser.get(item.userId) || 0;
                stats.breakdown.byUser.set(item.userId, userCost + (item.cost || 0));
                // Breakdown by project
                const projectCost = stats.breakdown.byProject.get(item.projectId) || 0;
                stats.breakdown.byProject.set(item.projectId, projectCost + (item.cost || 0));
                // Breakdown by date (day)
                const date = item.timestamp.split('T')[0];
                const dateCost = stats.breakdown.byDate.get(date) || 0;
                stats.breakdown.byDate.set(date, dateCost + (item.cost || 0));
            });
            return stats;
        }
        catch (error) {
            console.error('[Cost Tracker] Failed to get usage stats:', error);
            throw new Error(`Failed to get usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Query usage records by user
     */
    async queryByUser(userId, startDate, endDate) {
        let keyConditionExpression = 'userId = :userId';
        const expressionAttributeValues = {
            ':userId': userId,
        };
        const expressionAttributeNames = {};
        if (startDate && endDate) {
            keyConditionExpression += ' AND #ts BETWEEN :startDate AND :endDate';
            expressionAttributeValues[':startDate'] = startDate;
            expressionAttributeValues[':endDate'] = endDate;
            expressionAttributeNames['#ts'] = 'timestamp';
        }
        else if (startDate) {
            keyConditionExpression += ' AND #ts >= :startDate';
            expressionAttributeValues[':startDate'] = startDate;
            expressionAttributeNames['#ts'] = 'timestamp';
        }
        else if (endDate) {
            keyConditionExpression += ' AND #ts <= :endDate';
            expressionAttributeValues[':endDate'] = endDate;
            expressionAttributeNames['#ts'] = 'timestamp';
        }
        const queryParams = {
            TableName: this.tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
        };
        // Only add ExpressionAttributeNames if we have date filters
        if (Object.keys(expressionAttributeNames).length > 0) {
            queryParams.ExpressionAttributeNames = expressionAttributeNames;
        }
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand(queryParams));
        return result.Items || [];
    }
    /**
     * Query usage records by project
     */
    async queryByProject(projectId, startDate, endDate) {
        let keyConditionExpression = 'projectId = :projectId';
        const expressionAttributeValues = {
            ':projectId': projectId,
        };
        const expressionAttributeNames = {};
        if (startDate && endDate) {
            keyConditionExpression += ' AND #ts BETWEEN :startDate AND :endDate';
            expressionAttributeValues[':startDate'] = startDate;
            expressionAttributeValues[':endDate'] = endDate;
            expressionAttributeNames['#ts'] = 'timestamp';
        }
        else if (startDate) {
            keyConditionExpression += ' AND #ts >= :startDate';
            expressionAttributeValues[':startDate'] = startDate;
            expressionAttributeNames['#ts'] = 'timestamp';
        }
        else if (endDate) {
            keyConditionExpression += ' AND #ts <= :endDate';
            expressionAttributeValues[':endDate'] = endDate;
            expressionAttributeNames['#ts'] = 'timestamp';
        }
        const queryParams = {
            TableName: this.tableName,
            IndexName: 'projectId-timestamp-index',
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
        };
        // Only add ExpressionAttributeNames if we have date filters
        if (Object.keys(expressionAttributeNames).length > 0) {
            queryParams.ExpressionAttributeNames = expressionAttributeNames;
        }
        const result = await this.docClient.send(new lib_dynamodb_1.QueryCommand(queryParams));
        return result.Items || [];
    }
}
exports.CostTracker = CostTracker;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29zdC10cmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29zdC10cmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUEwRDtBQUMxRCx3REFBeUY7QUFnQnpGLE1BQU0sZUFBZSxHQUFrQztJQUNyRCxPQUFPLEVBQUU7UUFDUCxLQUFLLEVBQUUsT0FBTztRQUNkLGVBQWUsRUFBRSxPQUFPLEVBQU8sa0JBQWtCO1FBQ2pELG1CQUFtQixFQUFFLE9BQU8sRUFBRyxrQkFBa0I7S0FDbEQ7SUFDRCxlQUFlLEVBQUU7UUFDZixLQUFLLEVBQUUsZUFBZTtRQUN0QixlQUFlLEVBQUUsU0FBUyxFQUFLLG9CQUFvQjtRQUNuRCxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsb0JBQW9CO0tBQ3JEO0NBQ0YsQ0FBQztBQVVGLE1BQU0sY0FBYyxHQUFnQjtJQUNsQyxjQUFjLEVBQUUsR0FBRyxFQUFLLDBCQUEwQjtJQUNsRCxpQkFBaUIsRUFBRSxFQUFFLEVBQUcsNEJBQTRCO0NBQ3JELENBQUM7QUFFRjs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUNkLFNBQVMsQ0FBeUI7SUFDbEMsU0FBUyxDQUFTO0lBQ2xCLE9BQU8sQ0FBZ0M7SUFDdkMsTUFBTSxDQUFjO0lBRTVCLFlBQ0UsWUFBb0IsU0FBUyxFQUM3QixVQUF5QyxlQUFlLEVBQ3hELFNBQXNCLGNBQWMsRUFDcEMsU0FBa0M7UUFFbEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzdCLENBQUM7YUFBTSxDQUFDO1lBQ04sTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJ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S0FBSyxDQUFDLEdBQUcsV0FBVyxDQUFDO1FBQ2hELENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBUTtZQUN2QixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsU0FBUyxFQUFFLDJCQUEyQjtZQUN0QyxzQkFBc0IsRUFBRSxzQkFBc0I7WUFDOUMseUJBQXlCLEVBQUUseUJBQXlCO1NBQ3JELENBQUM7UUFFRiw0REFBNEQ7UUFDNUQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JELFdBQVcsQ0FBQyx3QkFBd0IsR0FBRyx3QkFBd0IsQ0FBQztRQUNsRSxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLDJCQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUV4RSxPQUFPLE1BQU0sQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO0lBQzVCLENBQUM7Q0FDRjtBQXRaRCxrQ0FzWkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFRva2VuVXNhZ2UsIEFJVXNhZ2VSZWNvcmQsIFVzYWdlU3RhdHMgfSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5cclxuLyoqXHJcbiAqIFByaWNpbmcgQ29uZmlndXJhdGlvblxyXG4gKiBcclxuICogT3BlbkFJIHByaWNpbmcgYXMgb2YgMjAyNCAocGVyIDFNIHRva2Vucyk6XHJcbiAqIC0gR1BULTQ6ICQzMCBpbnB1dCAvICQ2MCBvdXRwdXRcclxuICogLSBHUFQtMy41LXR1cmJvOiAkMC41MCBpbnB1dCAvICQxLjUwIG91dHB1dFxyXG4gKi9cclxuaW50ZXJmYWNlIFByaWNpbmdDb25maWcge1xyXG4gIG1vZGVsOiBzdHJpbmc7XHJcbiAgcHJvbXB0VG9rZW5SYXRlOiBudW1iZXI7ICAgICAgLy8gQ29zdCBwZXIgdG9rZW4gZm9yIGlucHV0XHJcbiAgY29tcGxldGlvblRva2VuUmF0ZTogbnVtYmVyOyAgLy8gQ29zdCBwZXIgdG9rZW4gZm9yIG91dHB1dFxyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX1BSSUNJTkc6IFJlY29yZDxzdHJpbmcsIFByaWNpbmdDb25maWc+ID0ge1xyXG4gICdncHQtNCc6IHtcclxuICAgIG1vZGVsOiAnZ3B0LTQnLFxyXG4gICAgcHJvbXB0VG9rZW5SYXRlOiAwLjAwMDAzLCAgICAgIC8vICQzMCAvIDFNIHRva2Vuc1xyXG4gICAgY29tcGxldGlvblRva2VuUmF0ZTogMC4wMDAwNiwgIC8vICQ2MCAvIDFNIHRva2Vuc1xyXG4gIH0sXHJcbiAgJ2dwdC0zLjUtdHVyYm8nOiB7XHJcbiAgICBtb2RlbDogJ2dwdC0zLjUtdHVyYm8nLFxyXG4gICAgcHJvbXB0VG9rZW5SYXRlOiAwLjAwMDAwMDUsICAgIC8vICQwLjUwIC8gMU0gdG9rZW5zXHJcbiAgICBjb21wbGV0aW9uVG9rZW5SYXRlOiAwLjAwMDAwMTUsIC8vICQxLjUwIC8gMU0gdG9rZW5zXHJcbiAgfSxcclxufTtcclxuXHJcbi8qKlxyXG4gKiBVc2FnZSBMaW1pdHMgQ29uZmlndXJhdGlvblxyXG4gKi9cclxuaW50ZXJmYWNlIFVzYWdlTGltaXRzIHtcclxuICBwZXJVc2VyTW9udGhseT86IG51bWJlcjsgICAgLy8gTWF4IGNvc3QgcGVyIHVzZXIgcGVyIG1vbnRoIChVU0QpXHJcbiAgcGVyUHJvamVjdE1vbnRobHk/OiBudW1iZXI7IC8vIE1heCBjb3N0IHBlciBwcm9qZWN0IHBlciBtb250aCAoVVNEKVxyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX0xJTUlUUzogVXNhZ2VMaW1pdHMgPSB7XHJcbiAgcGVyVXNlck1vbnRobHk6IDEwMCwgICAgLy8gJDEwMCBwZXIgdXNlciBwZXIgbW9udGhcclxuICBwZXJQcm9qZWN0TW9udGhseTogNTAsICAvLyAkNTAgcGVyIHByb2plY3QgcGVyIG1vbnRoXHJcbn07XHJcblxyXG4vKipcclxuICogQ29zdCBUcmFja2VyXHJcbiAqIFxyXG4gKiBNb25pdG9ycyBPcGVuQUkgQVBJIHVzYWdlIGFuZCBjb3N0cy5cclxuICogVHJhY2tzIHRva2VuIGNvbnN1bXB0aW9uLCBjYWxjdWxhdGVzIGNvc3RzLCBlbmZvcmNlcyBsaW1pdHMsIGFuZCBwcm92aWRlcyBzdGF0aXN0aWNzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvc3RUcmFja2VyIHtcclxuICBwcml2YXRlIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudDtcclxuICBwcml2YXRlIHRhYmxlTmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgcHJpY2luZzogUmVjb3JkPHN0cmluZywgUHJpY2luZ0NvbmZpZz47XHJcbiAgcHJpdmF0ZSBsaW1pdHM6IFVzYWdlTGltaXRzO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHRhYmxlTmFtZTogc3RyaW5nID0gJ0FJVXNhZ2UnLFxyXG4gICAgcHJpY2luZzogUmVjb3JkPHN0cmluZywgUHJpY2luZ0NvbmZpZz4gPSBERUZBVUxUX1BSSUNJTkcsXHJcbiAgICBsaW1pdHM6IFVzYWdlTGltaXRzID0gREVGQVVMVF9MSU1JVFMsXHJcbiAgICBkb2NDbGllbnQ/OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50XHJcbiAgKSB7XHJcbiAgICBpZiAoZG9jQ2xpZW50KSB7XHJcbiAgICAgIHRoaXMuZG9jQ2xpZW50ID0gZG9jQ2xpZW50O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICAgICAgdGhpcy5kb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcclxuICAgIH1cclxuICAgIHRoaXMudGFibGVOYW1lID0gdGFibGVOYW1lO1xyXG4gICAgdGhpcy5wcmljaW5nID0gcHJpY2luZztcclxuICAgIHRoaXMubGltaXRzID0gbGltaXRzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIGNvc3QgYmFzZWQgb24gdG9rZW4gdXNhZ2UgYW5kIG1vZGVsXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHRva2VucyAtIFRva2VuIHVzYWdlIGJyZWFrZG93blxyXG4gICAqIEBwYXJhbSBtb2RlbCAtIE9wZW5BSSBtb2RlbCB1c2VkXHJcbiAgICogQHJldHVybnMgQ2FsY3VsYXRlZCBjb3N0IGluIFVTRFxyXG4gICAqL1xyXG4gIGNhbGN1bGF0ZUNvc3QodG9rZW5zOiBUb2tlblVzYWdlLCBtb2RlbDogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGNvbmZpZyA9IHRoaXMucHJpY2luZ1ttb2RlbF0gfHwgdGhpcy5wcmljaW5nWydncHQtNCddO1xyXG4gICAgXHJcbiAgICBjb25zdCBwcm9tcHRDb3N0ID0gdG9rZW5zLnByb21wdFRva2VucyAqIGNvbmZpZy5wcm9tcHRUb2tlblJhdGU7XHJcbiAgICBjb25zdCBjb21wbGV0aW9uQ29zdCA9IHRva2Vucy5jb21wbGV0aW9uVG9rZW5zICogY29uZmlnLmNvbXBsZXRpb25Ub2tlblJhdGU7XHJcbiAgICBcclxuICAgIHJldHVybiBwcm9tcHRDb3N0ICsgY29tcGxldGlvbkNvc3Q7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgQVBJIHVzYWdlXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRFxyXG4gICAqIEBwYXJhbSBvcGVyYXRpb25UeXBlIC0gVHlwZSBvZiBvcGVyYXRpb25cclxuICAgKiBAcGFyYW0gdG9rZW5zIC0gVG9rZW4gdXNhZ2VcclxuICAgKiBAcGFyYW0gbW9kZWwgLSBPcGVuQUkgbW9kZWwgdXNlZFxyXG4gICAqIEBwYXJhbSB0ZXN0Q2FzZXNHZW5lcmF0ZWQgLSBOdW1iZXIgb2YgdGVzdCBjYXNlcyBnZW5lcmF0ZWRcclxuICAgKiBAcGFyYW0gZHVyYXRpb24gLSBPcGVyYXRpb24gZHVyYXRpb24gaW4gbWlsbGlzZWNvbmRzXHJcbiAgICovXHJcbiAgYXN5bmMgcmVjb3JkVXNhZ2UoXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIHByb2plY3RJZDogc3RyaW5nLFxyXG4gICAgb3BlcmF0aW9uVHlwZTogJ2FuYWx5emUnIHwgJ2dlbmVyYXRlJyB8ICdiYXRjaCcsXHJcbiAgICB0b2tlbnM6IFRva2VuVXNhZ2UsXHJcbiAgICBtb2RlbDogc3RyaW5nLFxyXG4gICAgdGVzdENhc2VzR2VuZXJhdGVkOiBudW1iZXIgPSAwLFxyXG4gICAgZHVyYXRpb246IG51bWJlciA9IDBcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGNvc3QgPSB0aGlzLmNhbGN1bGF0ZUNvc3QodG9rZW5zLCBtb2RlbCk7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpOyAvLyBTdG9yZSBhcyBudW1iZXIgKG1pbGxpc2Vjb25kcyBzaW5jZSBlcG9jaClcclxuXHJcbiAgICBjb25zdCByZWNvcmQ6IGFueSA9IHtcclxuICAgICAgdXNlcklkLFxyXG4gICAgICB0aW1lc3RhbXAsXHJcbiAgICAgIHByb2plY3RJZCxcclxuICAgICAgb3BlcmF0aW9uVHlwZSxcclxuICAgICAgdG9rZW5zLFxyXG4gICAgICBjb3N0LFxyXG4gICAgICB0ZXN0Q2FzZXNHZW5lcmF0ZWQsXHJcbiAgICAgIG1ldGFkYXRhOiB7XHJcbiAgICAgICAgbW9kZWwsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICAgIEl0ZW06IHJlY29yZCxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYFtDb3N0IFRyYWNrZXJdIFJlY29yZGVkIHVzYWdlOiAke29wZXJhdGlvblR5cGV9LCBjb3N0OiAkJHtjb3N0LnRvRml4ZWQoNCl9LCB0b2tlbnM6ICR7dG9rZW5zLnRvdGFsVG9rZW5zfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0Nvc3QgVHJhY2tlcl0gRmFpbGVkIHRvIHJlY29yZCB1c2FnZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlY29yZCB1c2FnZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgb3IgcHJvamVjdCBoYXMgZXhjZWVkZWQgdXNhZ2UgbGltaXRzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRFxyXG4gICAqIEByZXR1cm5zIFRydWUgaWYgd2l0aGluIGxpbWl0cywgZmFsc2UgaWYgbGltaXQgZXhjZWVkZWRcclxuICAgKi9cclxuICBhc3luYyBjaGVja0xpbWl0KHVzZXJJZDogc3RyaW5nLCBwcm9qZWN0SWQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IHN0YXJ0T2ZNb250aCA9IG5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSwgMSkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayB1c2VyIGxpbWl0XHJcbiAgICAgIGlmICh0aGlzLmxpbWl0cy5wZXJVc2VyTW9udGhseSkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJDb3N0ID0gYXdhaXQgdGhpcy5nZXRVc2VyQ29zdFNpbmNlKHVzZXJJZCwgc3RhcnRPZk1vbnRoKTtcclxuICAgICAgICBpZiAodXNlckNvc3QgPj0gdGhpcy5saW1pdHMucGVyVXNlck1vbnRobHkpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybihgW0Nvc3QgVHJhY2tlcl0gVXNlciAke3VzZXJJZH0gZXhjZWVkZWQgbW9udGhseSBsaW1pdDogJCR7dXNlckNvc3QudG9GaXhlZCgyKX0gPj0gJCR7dGhpcy5saW1pdHMucGVyVXNlck1vbnRobHl9YCk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBwcm9qZWN0IGxpbWl0XHJcbiAgICAgIGlmICh0aGlzLmxpbWl0cy5wZXJQcm9qZWN0TW9udGhseSkge1xyXG4gICAgICAgIGNvbnN0IHByb2plY3RDb3N0ID0gYXdhaXQgdGhpcy5nZXRQcm9qZWN0Q29zdFNpbmNlKHByb2plY3RJZCwgc3RhcnRPZk1vbnRoKTtcclxuICAgICAgICBpZiAocHJvamVjdENvc3QgPj0gdGhpcy5saW1pdHMucGVyUHJvamVjdE1vbnRobHkpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybihgW0Nvc3QgVHJhY2tlcl0gUHJvamVjdCAke3Byb2plY3RJZH0gZXhjZWVkZWQgbW9udGhseSBsaW1pdDogJCR7cHJvamVjdENvc3QudG9GaXhlZCgyKX0gPj0gJCR7dGhpcy5saW1pdHMucGVyUHJvamVjdE1vbnRobHl9YCk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDb3N0IFRyYWNrZXJdIEZhaWxlZCB0byBjaGVjayBsaW1pdHM6JywgZXJyb3IpO1xyXG4gICAgICAvLyBGYWlsIG9wZW4gLSBhbGxvdyByZXF1ZXN0IGlmIGxpbWl0IGNoZWNrIGZhaWxzXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB1c2VyIG9yIHByb2plY3QgaGFzIGV4Y2VlZGVkIHVzYWdlIGxpbWl0c1xyXG4gICAqIFRocm93cyBlcnJvciBpZiBsaW1pdCBleGNlZWRlZFxyXG4gICAqXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRFxyXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgbGltaXQgZXhjZWVkZWRcclxuICAgKi9cclxuICBhc3luYyBjaGVja0xpbWl0cyh1c2VySWQ6IHN0cmluZywgcHJvamVjdElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgICBjb25zdCBzdGFydE9mTW9udGggPSBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIDEpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2hlY2sgdXNlciBsaW1pdFxyXG4gICAgICBpZiAodGhpcy5saW1pdHMucGVyVXNlck1vbnRobHkpIHtcclxuICAgICAgICBjb25zdCB1c2VyQ29zdCA9IGF3YWl0IHRoaXMuZ2V0VXNlckNvc3RTaW5jZSh1c2VySWQsIHN0YXJ0T2ZNb250aCk7XHJcbiAgICAgICAgaWYgKHVzZXJDb3N0ID49IHRoaXMubGltaXRzLnBlclVzZXJNb250aGx5KSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgIGBNb250aGx5IHVzYWdlIGxpbWl0IGV4Y2VlZGVkLiBZb3UgaGF2ZSB1c2VkICQke3VzZXJDb3N0LnRvRml4ZWQoMil9IG9mIHlvdXIgJCR7dGhpcy5saW1pdHMucGVyVXNlck1vbnRobHl9IG1vbnRobHkgbGltaXQuIFBsZWFzZSB1cGdyYWRlIHlvdXIgcGxhbiBvciB3YWl0IHVudGlsIG5leHQgbW9udGguYFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIHByb2plY3QgbGltaXRcclxuICAgICAgaWYgKHRoaXMubGltaXRzLnBlclByb2plY3RNb250aGx5KSB7XHJcbiAgICAgICAgY29uc3QgcHJvamVjdENvc3QgPSBhd2FpdCB0aGlzLmdldFByb2plY3RDb3N0U2luY2UocHJvamVjdElkLCBzdGFydE9mTW9udGgpO1xyXG4gICAgICAgIGlmIChwcm9qZWN0Q29zdCA+PSB0aGlzLmxpbWl0cy5wZXJQcm9qZWN0TW9udGhseSkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICBgUHJvamVjdCBtb250aGx5IHVzYWdlIGxpbWl0IGV4Y2VlZGVkLiBUaGlzIHByb2plY3QgaGFzIHVzZWQgJCR7cHJvamVjdENvc3QudG9GaXhlZCgyKX0gb2YgaXRzICQke3RoaXMubGltaXRzLnBlclByb2plY3RNb250aGx5fSBtb250aGx5IGxpbWl0LmBcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAvLyBJZiBpdCdzIGFscmVhZHkgYSBsaW1pdCBleGNlZWRlZCBlcnJvciwgcmUtdGhyb3cgaXRcclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnbGltaXQgZXhjZWVkZWQnKSkge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBGb3Igb3RoZXIgZXJyb3JzLCBsb2cgYW5kIGZhaWwgb3BlbiAoYWxsb3cgcmVxdWVzdClcclxuICAgICAgY29uc29sZS5lcnJvcignW0Nvc3QgVHJhY2tlcl0gRmFpbGVkIHRvIGNoZWNrIGxpbWl0czonLCBlcnJvcik7XHJcbiAgICAgIC8vIERvbid0IHRocm93IC0gZmFpbCBvcGVuIHRvIGF2b2lkIGJsb2NraW5nIHVzZXJzIGR1ZSB0byBpbmZyYXN0cnVjdHVyZSBpc3N1ZXNcclxuICAgIH1cclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdG90YWwgY29zdCBmb3IgdXNlciBzaW5jZSBhIHNwZWNpZmljIGRhdGVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdXNlcklkIC0gVXNlciBJRFxyXG4gICAqIEBwYXJhbSBzdGFydERhdGUgLSBTdGFydCBkYXRlIChJU08gc3RyaW5nKVxyXG4gICAqIEByZXR1cm5zIFRvdGFsIGNvc3QgaW4gVVNEXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRVc2VyQ29zdFNpbmNlKHVzZXJJZDogc3RyaW5nLCBzdGFydERhdGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzdGFydFRpbWVzdGFtcCA9IG5ldyBEYXRlKHN0YXJ0RGF0ZSkuZ2V0VGltZSgpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndXNlcklkID0gOnVzZXJJZCBBTkQgI3RzID49IDpzdGFydERhdGUnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAgICcjdHMnOiAndGltZXN0YW1wJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6dXNlcklkJzogdXNlcklkLFxyXG4gICAgICAgICAgICAnOnN0YXJ0RGF0ZSc6IHN0YXJ0VGltZXN0YW1wLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgaWYgKCFyZXN1bHQuSXRlbXMgfHwgcmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLnJlZHVjZSgoc3VtLCBpdGVtKSA9PiBzdW0gKyAoaXRlbS5jb3N0IHx8IDApLCAwKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDb3N0IFRyYWNrZXJdIEZhaWxlZCB0byBnZXQgdXNlciBjb3N0OicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdG90YWwgY29zdCBmb3IgcHJvamVjdCBzaW5jZSBhIHNwZWNpZmljIGRhdGVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRFxyXG4gICAqIEBwYXJhbSBzdGFydERhdGUgLSBTdGFydCBkYXRlIChJU08gc3RyaW5nKVxyXG4gICAqIEByZXR1cm5zIFRvdGFsIGNvc3QgaW4gVVNEXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRQcm9qZWN0Q29zdFNpbmNlKHByb2plY3RJZDogc3RyaW5nLCBzdGFydERhdGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzdGFydFRpbWVzdGFtcCA9IG5ldyBEYXRlKHN0YXJ0RGF0ZSkuZ2V0VGltZSgpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdwcm9qZWN0SWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdwcm9qZWN0SWQgPSA6cHJvamVjdElkIEFORCAjdHMgPj0gOnN0YXJ0RGF0ZScsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICAgJyN0cyc6ICd0aW1lc3RhbXAnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICAgJzpwcm9qZWN0SWQnOiBwcm9qZWN0SWQsXHJcbiAgICAgICAgICAgICc6c3RhcnREYXRlJzogc3RhcnRUaW1lc3RhbXAsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbXMucmVkdWNlKChzdW0sIGl0ZW0pID0+IHN1bSArIChpdGVtLmNvc3QgfHwgMCksIDApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0Nvc3QgVHJhY2tlcl0gRmFpbGVkIHRvIGdldCBwcm9qZWN0IGNvc3Q6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gMDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB1c2FnZSBzdGF0aXN0aWNzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIE9wdGlvbmFsIHVzZXIgSUQgZmlsdGVyXHJcbiAgICogQHBhcmFtIHByb2plY3RJZCAtIE9wdGlvbmFsIHByb2plY3QgSUQgZmlsdGVyXHJcbiAgICogQHBhcmFtIHN0YXJ0RGF0ZSAtIE9wdGlvbmFsIHN0YXJ0IGRhdGUgZmlsdGVyIChJU08gc3RyaW5nKVxyXG4gICAqIEBwYXJhbSBlbmREYXRlIC0gT3B0aW9uYWwgZW5kIGRhdGUgZmlsdGVyIChJU08gc3RyaW5nKVxyXG4gICAqIEByZXR1cm5zIFVzYWdlIHN0YXRpc3RpY3NcclxuICAgKi9cclxuICBhc3luYyBnZXRVc2FnZVN0YXRzKFxyXG4gICAgdXNlcklkPzogc3RyaW5nLFxyXG4gICAgcHJvamVjdElkPzogc3RyaW5nLFxyXG4gICAgc3RhcnREYXRlPzogc3RyaW5nLFxyXG4gICAgZW5kRGF0ZT86IHN0cmluZ1xyXG4gICk6IFByb21pc2U8VXNhZ2VTdGF0cz4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgbGV0IGl0ZW1zOiBhbnlbXSA9IFtdO1xyXG5cclxuICAgICAgaWYgKHVzZXJJZCkge1xyXG4gICAgICAgIC8vIFF1ZXJ5IGJ5IHVzZXJcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLnF1ZXJ5QnlVc2VyKHVzZXJJZCwgc3RhcnREYXRlLCBlbmREYXRlKTtcclxuICAgICAgICBpdGVtcyA9IHJlc3VsdDtcclxuICAgICAgfSBlbHNlIGlmIChwcm9qZWN0SWQpIHtcclxuICAgICAgICAvLyBRdWVyeSBieSBwcm9qZWN0XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5xdWVyeUJ5UHJvamVjdChwcm9qZWN0SWQsIHN0YXJ0RGF0ZSwgZW5kRGF0ZSk7XHJcbiAgICAgICAgaXRlbXMgPSByZXN1bHQ7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gVGhpcyB3b3VsZCByZXF1aXJlIGEgc2NhbiAtIG5vdCByZWNvbW1lbmRlZCBmb3IgcHJvZHVjdGlvblxyXG4gICAgICAgIGNvbnNvbGUud2FybignW0Nvc3QgVHJhY2tlcl0gR2V0dGluZyBzdGF0cyB3aXRob3V0IHVzZXJJZCBvciBwcm9qZWN0SWQgcmVxdWlyZXMgdGFibGUgc2NhbicpO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB0b3RhbENhbGxzOiAwLFxyXG4gICAgICAgICAgdG90YWxUb2tlbnM6IDAsXHJcbiAgICAgICAgICBlc3RpbWF0ZWRDb3N0OiAwLFxyXG4gICAgICAgICAgYnJlYWtkb3duOiB7XHJcbiAgICAgICAgICAgIGJ5VXNlcjogbmV3IE1hcCgpLFxyXG4gICAgICAgICAgICBieVByb2plY3Q6IG5ldyBNYXAoKSxcclxuICAgICAgICAgICAgYnlEYXRlOiBuZXcgTWFwKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEFnZ3JlZ2F0ZSBzdGF0aXN0aWNzXHJcbiAgICAgIGNvbnN0IHN0YXRzOiBVc2FnZVN0YXRzID0ge1xyXG4gICAgICAgIHRvdGFsQ2FsbHM6IGl0ZW1zLmxlbmd0aCxcclxuICAgICAgICB0b3RhbFRva2VuczogMCxcclxuICAgICAgICBlc3RpbWF0ZWRDb3N0OiAwLFxyXG4gICAgICAgIGJyZWFrZG93bjoge1xyXG4gICAgICAgICAgYnlVc2VyOiBuZXcgTWFwKCksXHJcbiAgICAgICAgICBieVByb2plY3Q6IG5ldyBNYXAoKSxcclxuICAgICAgICAgIGJ5RGF0ZTogbmV3IE1hcCgpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XHJcbiAgICAgICAgc3RhdHMudG90YWxUb2tlbnMgKz0gaXRlbS50b2tlbnM/LnRvdGFsVG9rZW5zIHx8IDA7XHJcbiAgICAgICAgc3RhdHMuZXN0aW1hdGVkQ29zdCArPSBpdGVtLmNvc3QgfHwgMDtcclxuXHJcbiAgICAgICAgLy8gQnJlYWtkb3duIGJ5IHVzZXJcclxuICAgICAgICBjb25zdCB1c2VyQ29zdCA9IHN0YXRzLmJyZWFrZG93bi5ieVVzZXIuZ2V0KGl0ZW0udXNlcklkKSB8fCAwO1xyXG4gICAgICAgIHN0YXRzLmJyZWFrZG93bi5ieVVzZXIuc2V0KGl0ZW0udXNlcklkLCB1c2VyQ29zdCArIChpdGVtLmNvc3QgfHwgMCkpO1xyXG5cclxuICAgICAgICAvLyBCcmVha2Rvd24gYnkgcHJvamVjdFxyXG4gICAgICAgIGNvbnN0IHByb2plY3RDb3N0ID0gc3RhdHMuYnJlYWtkb3duLmJ5UHJvamVjdC5nZXQoaXRlbS5wcm9qZWN0SWQpIHx8IDA7XHJcbiAgICAgICAgc3RhdHMuYnJlYWtkb3duLmJ5UHJvamVjdC5zZXQoaXRlbS5wcm9qZWN0SWQsIHByb2plY3RDb3N0ICsgKGl0ZW0uY29zdCB8fCAwKSk7XHJcblxyXG4gICAgICAgIC8vIEJyZWFrZG93biBieSBkYXRlIChkYXkpXHJcbiAgICAgICAgY29uc3QgZGF0ZSA9IGl0ZW0udGltZXN0YW1wLnNwbGl0KCdUJylbMF07XHJcbiAgICAgICAgY29uc3QgZGF0ZUNvc3QgPSBzdGF0cy5icmVha2Rvd24uYnlEYXRlLmdldChkYXRlKSB8fCAwO1xyXG4gICAgICAgIHN0YXRzLmJyZWFrZG93bi5ieURhdGUuc2V0KGRhdGUsIGRhdGVDb3N0ICsgKGl0ZW0uY29zdCB8fCAwKSk7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHN0YXRzO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0Nvc3QgVHJhY2tlcl0gRmFpbGVkIHRvIGdldCB1c2FnZSBzdGF0czonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGdldCB1c2FnZSBzdGF0czogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFF1ZXJ5IHVzYWdlIHJlY29yZHMgYnkgdXNlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgcXVlcnlCeVVzZXIodXNlcklkOiBzdHJpbmcsIHN0YXJ0RGF0ZT86IHN0cmluZywgZW5kRGF0ZT86IHN0cmluZyk6IFByb21pc2U8YW55W10+IHtcclxuICAgIGxldCBrZXlDb25kaXRpb25FeHByZXNzaW9uID0gJ3VzZXJJZCA9IDp1c2VySWQnO1xyXG4gICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogYW55ID0ge1xyXG4gICAgICAnOnVzZXJJZCc6IHVzZXJJZCxcclxuICAgIH07XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IGFueSA9IHt9O1xyXG5cclxuICAgIGlmIChzdGFydERhdGUgJiYgZW5kRGF0ZSkge1xyXG4gICAgICBrZXlDb25kaXRpb25FeHByZXNzaW9uICs9ICcgQU5EICN0cyBCRVRXRUVOIDpzdGFydERhdGUgQU5EIDplbmREYXRlJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0RGF0ZSddID0gc3RhcnREYXRlO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW5kRGF0ZSddID0gZW5kRGF0ZTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdHMnXSA9ICd0aW1lc3RhbXAnO1xyXG4gICAgfSBlbHNlIGlmIChzdGFydERhdGUpIHtcclxuICAgICAga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiArPSAnIEFORCAjdHMgPj0gOnN0YXJ0RGF0ZSc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpzdGFydERhdGUnXSA9IHN0YXJ0RGF0ZTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdHMnXSA9ICd0aW1lc3RhbXAnO1xyXG4gICAgfSBlbHNlIGlmIChlbmREYXRlKSB7XHJcbiAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgI3RzIDw9IDplbmREYXRlJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVuZERhdGUnXSA9IGVuZERhdGU7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3RzJ10gPSAndGltZXN0YW1wJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBxdWVyeVBhcmFtczogYW55ID0ge1xyXG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiBrZXlDb25kaXRpb25FeHByZXNzaW9uLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBPbmx5IGFkZCBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXMgaWYgd2UgaGF2ZSBkYXRlIGZpbHRlcnNcclxuICAgIGlmIChPYmplY3Qua2V5cyhleHByZXNzaW9uQXR0cmlidXRlTmFtZXMpLmxlbmd0aCA+IDApIHtcclxuICAgICAgcXVlcnlQYXJhbXMuRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzID0gZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZG9jQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZChxdWVyeVBhcmFtcykpO1xyXG5cclxuICAgIHJldHVybiByZXN1bHQuSXRlbXMgfHwgW107XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBRdWVyeSB1c2FnZSByZWNvcmRzIGJ5IHByb2plY3RcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHF1ZXJ5QnlQcm9qZWN0KHByb2plY3RJZDogc3RyaW5nLCBzdGFydERhdGU/OiBzdHJpbmcsIGVuZERhdGU/OiBzdHJpbmcpOiBQcm9taXNlPGFueVtdPiB7XHJcbiAgICBsZXQga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiA9ICdwcm9qZWN0SWQgPSA6cHJvamVjdElkJztcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGFueSA9IHtcclxuICAgICAgJzpwcm9qZWN0SWQnOiBwcm9qZWN0SWQsXHJcbiAgICB9O1xyXG4gICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiBhbnkgPSB7fTtcclxuXHJcbiAgICBpZiAoc3RhcnREYXRlICYmIGVuZERhdGUpIHtcclxuICAgICAga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiArPSAnIEFORCAjdHMgQkVUV0VFTiA6c3RhcnREYXRlIEFORCA6ZW5kRGF0ZSc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpzdGFydERhdGUnXSA9IHN0YXJ0RGF0ZTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVuZERhdGUnXSA9IGVuZERhdGU7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3RzJ10gPSAndGltZXN0YW1wJztcclxuICAgIH0gZWxzZSBpZiAoc3RhcnREYXRlKSB7XHJcbiAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgI3RzID49IDpzdGFydERhdGUnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6c3RhcnREYXRlJ10gPSBzdGFydERhdGU7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3RzJ10gPSAndGltZXN0YW1wJztcclxuICAgIH0gZWxzZSBpZiAoZW5kRGF0ZSkge1xyXG4gICAgICBrZXlDb25kaXRpb25FeHByZXNzaW9uICs9ICcgQU5EICN0cyA8PSA6ZW5kRGF0ZSc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplbmREYXRlJ10gPSBlbmREYXRlO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN0cyddID0gJ3RpbWVzdGFtcCc7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcXVlcnlQYXJhbXM6IGFueSA9IHtcclxuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgSW5kZXhOYW1lOiAncHJvamVjdElkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246IGtleUNvbmRpdGlvbkV4cHJlc3Npb24sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIE9ubHkgYWRkIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcyBpZiB3ZSBoYXZlIGRhdGUgZmlsdGVyc1xyXG4gICAgaWYgKE9iamVjdC5rZXlzKGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcykubGVuZ3RoID4gMCkge1xyXG4gICAgICBxdWVyeVBhcmFtcy5FeHByZXNzaW9uQXR0cmlidXRlTmFtZXMgPSBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgUXVlcnlDb21tYW5kKHF1ZXJ5UGFyYW1zKSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtcyB8fCBbXTtcclxuICB9XHJcbn1cclxuIl19