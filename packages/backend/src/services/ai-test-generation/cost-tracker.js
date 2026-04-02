"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostTracker = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const DEFAULT_PRICING = {
    'gpt-4': {
        model: 'gpt-4',
        provider: 'OPENAI',
        promptTokenRate: 0.00003, // $30 / 1M tokens
        completionTokenRate: 0.00006, // $60 / 1M tokens
    },
    'gpt-3.5-turbo': {
        model: 'gpt-3.5-turbo',
        provider: 'OPENAI',
        promptTokenRate: 0.0000005, // $0.50 / 1M tokens
        completionTokenRate: 0.0000015, // $1.50 / 1M tokens
    },
    'anthropic.claude-3-5-sonnet-20241022-v2:0': {
        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        provider: 'BEDROCK',
        promptTokenRate: 0.000003, // $3 / 1M tokens
        completionTokenRate: 0.000015, // $15 / 1M tokens
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
     * Calculate cost based on token usage, model, and provider
     *
     * @param tokens - Token usage breakdown
     * @param model - AI model used (e.g., 'gpt-4', 'anthropic.claude-3-5-sonnet-20241022-v2:0')
     * @param provider - AI provider (OPENAI, BEDROCK, HUGGINGFACE)
     * @returns Calculated cost in USD
     */
    calculateCost(tokens, model, provider) {
        // Try to find exact model match first
        let config = this.pricing[model];
        // If not found and provider is specified, use provider default
        if (!config && provider) {
            if (provider === 'BEDROCK') {
                config = this.pricing['anthropic.claude-3-5-sonnet-20241022-v2:0'];
            }
            else if (provider === 'OPENAI') {
                config = this.pricing['gpt-4'];
            }
        }
        // Fallback to GPT-4 pricing if still not found
        if (!config) {
            config = this.pricing['gpt-4'];
        }
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
     * @param model - AI model used
     * @param provider - AI provider (OPENAI, BEDROCK, HUGGINGFACE)
     * @param testCasesGenerated - Number of test cases generated
     * @param duration - Operation duration in milliseconds
     */
    async recordUsage(userId, projectId, operationType, tokens, model, provider, testCasesGenerated = 0, duration = 0) {
        const cost = this.calculateCost(tokens, model, provider);
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
                provider,
                duration,
            },
        };
        try {
            await this.docClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: record,
            }));
            console.log(`[Cost Tracker] Recorded usage: ${operationType}, provider: ${provider}, cost: $${cost.toFixed(4)}, tokens: ${tokens.totalTokens}`);
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
     * @param provider - Optional provider filter (OPENAI, BEDROCK, HUGGINGFACE)
     * @returns Usage statistics
     */
    async getUsageStats(userId, projectId, startDate, endDate, provider) {
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
            // Filter by provider if specified
            if (provider) {
                items = items.filter(item => item.metadata?.provider === provider);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29zdC10cmFja2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY29zdC10cmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDhEQUEwRDtBQUMxRCx3REFBeUY7QUF5QnpGLE1BQU0sZUFBZSxHQUFrQztJQUNyRCxPQUFPLEVBQUU7UUFDUCxLQUFLLEVBQUUsT0FBTztRQUNkLFFBQVEsRUFBRSxRQUFRO1FBQ2xCLGVBQWUsRUFBRSxPQUFPLEVBQU8sa0JBQWtCO1FBQ2pELG1CQUFtQixFQUFFLE9BQU8sRUFBRyxrQkFBa0I7S0FDbEQ7SUFDRCxlQUFlLEVBQUU7UUFDZixLQUFLLEVBQUUsZUFBZTtRQUN0QixRQUFRLEVBQUUsUUFBUTtRQUNsQixlQUFlLEVBQUUsU0FBUyxFQUFLLG9CQUFvQjtRQUNuRCxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsb0JBQW9CO0tBQ3JEO0lBQ0QsMkNBQTJDLEVBQUU7UUFDM0MsS0FBSyxFQUFFLDJDQUEyQztRQUNsRCxRQUFRLEVBQUUsU0FBUztRQUNuQixlQUFlLEVBQUUsUUFBUSxFQUFNLGlCQUFpQjtRQUNoRCxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsa0JBQWtCO0tBQ2xEO0NBQ0YsQ0FBQztBQVVGLE1BQU0sY0FBYyxHQUFnQjtJQUNsQyxjQUFjLEVBQUUsR0FBRyxFQUFLLDBCQUEwQjtJQUNsRCxpQkFBaUIsRUFBRSxFQUFFLEVBQUcsNEJBQTRCO0NBQ3JELENBQUM7QUFFRjs7Ozs7R0FLRztBQUNILE1BQWEsV0FBVztJQUNkLFNBQVMsQ0FBeUI7SUFDbEMsU0FBUyxDQUFTO0lBQ2xCLE9BQU8sQ0FBZ0M7SUFDdkMsTUFBTSxDQUFjO0lBRTVCLFlBQ0UsWUFBb0IsU0FBUyxFQUM3QixVQUF5QyxlQUFlLEVBQ3hELFNBQXNCLGNBQWMsRUFDcEMsU0FBa0M7UUFFbEMsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzdCLENBQUM7YUFB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O1NBQ3JELENBQUM7UUFFRiw0REFBNEQ7UUFDNUQsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JELFdBQVcsQ0FBQyx3QkFBd0IsR0FBRyx3QkFBd0IsQ0FBQztRQUNsRSxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLDJCQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUV4RSxPQUFPLE1BQU0sQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO0lBQzVCLENBQUM7Q0FDRjtBQWhiRCxrQ0FnYkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIFF1ZXJ5Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFRva2VuVXNhZ2UsIEFJVXNhZ2VSZWNvcmQsIFVzYWdlU3RhdHMgfSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5cclxuLyoqXHJcbiAqIEFJIFByb3ZpZGVyIFR5cGVzXHJcbiAqL1xyXG5leHBvcnQgdHlwZSBBSVByb3ZpZGVyID0gJ09QRU5BSScgfCAnQkVEUk9DSycgfCAnSFVHR0lOR0ZBQ0UnO1xyXG5cclxuLyoqXHJcbiAqIFByaWNpbmcgQ29uZmlndXJhdGlvblxyXG4gKiBcclxuICogT3BlbkFJIHByaWNpbmcgYXMgb2YgMjAyNCAocGVyIDFNIHRva2Vucyk6XHJcbiAqIC0gR1BULTQ6ICQzMCBpbnB1dCAvICQ2MCBvdXRwdXRcclxuICogLSBHUFQtMy41LXR1cmJvOiAkMC41MCBpbnB1dCAvICQxLjUwIG91dHB1dFxyXG4gKiBcclxuICogQmVkcm9jayBwcmljaW5nIGFzIG9mIDIwMjQgKHBlciAxTSB0b2tlbnMpOlxyXG4gKiAtIENsYXVkZSAzLjUgU29ubmV0OiAkMyBpbnB1dCAvICQxNSBvdXRwdXRcclxuICovXHJcbmludGVyZmFjZSBQcmljaW5nQ29uZmlnIHtcclxuICBtb2RlbDogc3RyaW5nO1xyXG4gIHByb3ZpZGVyOiBBSVByb3ZpZGVyO1xyXG4gIHByb21wdFRva2VuUmF0ZTogbnVtYmVyOyAgICAgIC8vIENvc3QgcGVyIHRva2VuIGZvciBpbnB1dFxyXG4gIGNvbXBsZXRpb25Ub2tlblJhdGU6IG51bWJlcjsgIC8vIENvc3QgcGVyIHRva2VuIGZvciBvdXRwdXRcclxufVxyXG5cclxuY29uc3QgREVGQVVMVF9QUklDSU5HOiBSZWNvcmQ8c3RyaW5nLCBQcmljaW5nQ29uZmlnPiA9IHtcclxuICAnZ3B0LTQnOiB7XHJcbiAgICBtb2RlbDogJ2dwdC00JyxcclxuICAgIHByb3ZpZGVyOiAnT1BFTkFJJyxcclxuICAgIHByb21wdFRva2VuUmF0ZTogMC4wMDAwMywgICAgICAvLyAkMzAgLyAxTSB0b2tlbnNcclxuICAgIGNvbXBsZXRpb25Ub2tlblJhdGU6IDAuMDAwMDYsICAvLyAkNjAgLyAxTSB0b2tlbnNcclxuICB9LFxyXG4gICdncHQtMy41LXR1cmJvJzoge1xyXG4gICAgbW9kZWw6ICdncHQtMy41LXR1cmJvJyxcclxuICAgIHByb3ZpZGVyOiAnT1BFTkFJJyxcclxuICAgIHByb21wdFRva2VuUmF0ZTogMC4wMDAwMDA1LCAgICAvLyAkMC41MCAvIDFNIHRva2Vuc1xyXG4gICAgY29tcGxldGlvblRva2VuUmF0ZTogMC4wMDAwMDE1LCAvLyAkMS41MCAvIDFNIHRva2Vuc1xyXG4gIH0sXHJcbiAgJ2FudGhyb3BpYy5jbGF1ZGUtMy01LXNvbm5ldC0yMDI0MTAyMi12MjowJzoge1xyXG4gICAgbW9kZWw6ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICBwcm92aWRlcjogJ0JFRFJPQ0snLFxyXG4gICAgcHJvbXB0VG9rZW5SYXRlOiAwLjAwMDAwMywgICAgIC8vICQzIC8gMU0gdG9rZW5zXHJcbiAgICBjb21wbGV0aW9uVG9rZW5SYXRlOiAwLjAwMDAxNSwgLy8gJDE1IC8gMU0gdG9rZW5zXHJcbiAgfSxcclxufTtcclxuXHJcbi8qKlxyXG4gKiBVc2FnZSBMaW1pdHMgQ29uZmlndXJhdGlvblxyXG4gKi9cclxuaW50ZXJmYWNlIFVzYWdlTGltaXRzIHtcclxuICBwZXJVc2VyTW9udGhseT86IG51bWJlcjsgICAgLy8gTWF4IGNvc3QgcGVyIHVzZXIgcGVyIG1vbnRoIChVU0QpXHJcbiAgcGVyUHJvamVjdE1vbnRobHk/OiBudW1iZXI7IC8vIE1heCBjb3N0IHBlciBwcm9qZWN0IHBlciBtb250aCAoVVNEKVxyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX0xJTUlUUzogVXNhZ2VMaW1pdHMgPSB7XHJcbiAgcGVyVXNlck1vbnRobHk6IDEwMCwgICAgLy8gJDEwMCBwZXIgdXNlciBwZXIgbW9udGhcclxuICBwZXJQcm9qZWN0TW9udGhseTogNTAsICAvLyAkNTAgcGVyIHByb2plY3QgcGVyIG1vbnRoXHJcbn07XHJcblxyXG4vKipcclxuICogQ29zdCBUcmFja2VyXHJcbiAqIFxyXG4gKiBNb25pdG9ycyBPcGVuQUkgQVBJIHVzYWdlIGFuZCBjb3N0cy5cclxuICogVHJhY2tzIHRva2VuIGNvbnN1bXB0aW9uLCBjYWxjdWxhdGVzIGNvc3RzLCBlbmZvcmNlcyBsaW1pdHMsIGFuZCBwcm92aWRlcyBzdGF0aXN0aWNzLlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIENvc3RUcmFja2VyIHtcclxuICBwcml2YXRlIGRvY0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudDtcclxuICBwcml2YXRlIHRhYmxlTmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgcHJpY2luZzogUmVjb3JkPHN0cmluZywgUHJpY2luZ0NvbmZpZz47XHJcbiAgcHJpdmF0ZSBsaW1pdHM6IFVzYWdlTGltaXRzO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIHRhYmxlTmFtZTogc3RyaW5nID0gJ0FJVXNhZ2UnLFxyXG4gICAgcHJpY2luZzogUmVjb3JkPHN0cmluZywgUHJpY2luZ0NvbmZpZz4gPSBERUZBVUxUX1BSSUNJTkcsXHJcbiAgICBsaW1pdHM6IFVzYWdlTGltaXRzID0gREVGQVVMVF9MSU1JVFMsXHJcbiAgICBkb2NDbGllbnQ/OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50XHJcbiAgKSB7XHJcbiAgICBpZiAoZG9jQ2xpZW50KSB7XHJcbiAgICAgIHRoaXMuZG9jQ2xpZW50ID0gZG9jQ2xpZW50O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICAgICAgdGhpcy5kb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcclxuICAgIH1cclxuICAgIHRoaXMudGFibGVOYW1lID0gdGFibGVOYW1lO1xyXG4gICAgdGhpcy5wcmljaW5nID0gcHJpY2luZztcclxuICAgIHRoaXMubGltaXRzID0gbGltaXRzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIGNvc3QgYmFzZWQgb24gdG9rZW4gdXNhZ2UsIG1vZGVsLCBhbmQgcHJvdmlkZXJcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdG9rZW5zIC0gVG9rZW4gdXNhZ2UgYnJlYWtkb3duXHJcbiAgICogQHBhcmFtIG1vZGVsIC0gQUkgbW9kZWwgdXNlZCAoZS5nLiwgJ2dwdC00JywgJ2FudGhyb3BpYy5jbGF1ZGUtMy01LXNvbm5ldC0yMDI0MTAyMi12MjowJylcclxuICAgKiBAcGFyYW0gcHJvdmlkZXIgLSBBSSBwcm92aWRlciAoT1BFTkFJLCBCRURST0NLLCBIVUdHSU5HRkFDRSlcclxuICAgKiBAcmV0dXJucyBDYWxjdWxhdGVkIGNvc3QgaW4gVVNEXHJcbiAgICovXHJcbiAgY2FsY3VsYXRlQ29zdCh0b2tlbnM6IFRva2VuVXNhZ2UsIG1vZGVsOiBzdHJpbmcsIHByb3ZpZGVyPzogQUlQcm92aWRlcik6IG51bWJlciB7XHJcbiAgICAvLyBUcnkgdG8gZmluZCBleGFjdCBtb2RlbCBtYXRjaCBmaXJzdFxyXG4gICAgbGV0IGNvbmZpZyA9IHRoaXMucHJpY2luZ1ttb2RlbF07XHJcbiAgICBcclxuICAgIC8vIElmIG5vdCBmb3VuZCBhbmQgcHJvdmlkZXIgaXMgc3BlY2lmaWVkLCB1c2UgcHJvdmlkZXIgZGVmYXVsdFxyXG4gICAgaWYgKCFjb25maWcgJiYgcHJvdmlkZXIpIHtcclxuICAgICAgaWYgKHByb3ZpZGVyID09PSAnQkVEUk9DSycpIHtcclxuICAgICAgICBjb25maWcgPSB0aGlzLnByaWNpbmdbJ2FudGhyb3BpYy5jbGF1ZGUtMy01LXNvbm5ldC0yMDI0MTAyMi12MjowJ107XHJcbiAgICAgIH0gZWxzZSBpZiAocHJvdmlkZXIgPT09ICdPUEVOQUknKSB7XHJcbiAgICAgICAgY29uZmlnID0gdGhpcy5wcmljaW5nWydncHQtNCddO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8vIEZhbGxiYWNrIHRvIEdQVC00IHByaWNpbmcgaWYgc3RpbGwgbm90IGZvdW5kXHJcbiAgICBpZiAoIWNvbmZpZykge1xyXG4gICAgICBjb25maWcgPSB0aGlzLnByaWNpbmdbJ2dwdC00J107XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGNvbnN0IHByb21wdENvc3QgPSB0b2tlbnMucHJvbXB0VG9rZW5zICogY29uZmlnLnByb21wdFRva2VuUmF0ZTtcclxuICAgIGNvbnN0IGNvbXBsZXRpb25Db3N0ID0gdG9rZW5zLmNvbXBsZXRpb25Ub2tlbnMgKiBjb25maWcuY29tcGxldGlvblRva2VuUmF0ZTtcclxuICAgIFxyXG4gICAgcmV0dXJuIHByb21wdENvc3QgKyBjb21wbGV0aW9uQ29zdDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFJlY29yZCBBUEkgdXNhZ2VcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdXNlcklkIC0gVXNlciBJRFxyXG4gICAqIEBwYXJhbSBwcm9qZWN0SWQgLSBQcm9qZWN0IElEXHJcbiAgICogQHBhcmFtIG9wZXJhdGlvblR5cGUgLSBUeXBlIG9mIG9wZXJhdGlvblxyXG4gICAqIEBwYXJhbSB0b2tlbnMgLSBUb2tlbiB1c2FnZVxyXG4gICAqIEBwYXJhbSBtb2RlbCAtIEFJIG1vZGVsIHVzZWRcclxuICAgKiBAcGFyYW0gcHJvdmlkZXIgLSBBSSBwcm92aWRlciAoT1BFTkFJLCBCRURST0NLLCBIVUdHSU5HRkFDRSlcclxuICAgKiBAcGFyYW0gdGVzdENhc2VzR2VuZXJhdGVkIC0gTnVtYmVyIG9mIHRlc3QgY2FzZXMgZ2VuZXJhdGVkXHJcbiAgICogQHBhcmFtIGR1cmF0aW9uIC0gT3BlcmF0aW9uIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kc1xyXG4gICAqL1xyXG4gIGFzeW5jIHJlY29yZFVzYWdlKFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICBwcm9qZWN0SWQ6IHN0cmluZyxcclxuICAgIG9wZXJhdGlvblR5cGU6ICdhbmFseXplJyB8ICdnZW5lcmF0ZScgfCAnYmF0Y2gnLFxyXG4gICAgdG9rZW5zOiBUb2tlblVzYWdlLFxyXG4gICAgbW9kZWw6IHN0cmluZyxcclxuICAgIHByb3ZpZGVyOiBBSVByb3ZpZGVyLFxyXG4gICAgdGVzdENhc2VzR2VuZXJhdGVkOiBudW1iZXIgPSAwLFxyXG4gICAgZHVyYXRpb246IG51bWJlciA9IDBcclxuICApOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IGNvc3QgPSB0aGlzLmNhbGN1bGF0ZUNvc3QodG9rZW5zLCBtb2RlbCwgcHJvdmlkZXIpO1xyXG4gICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTsgLy8gU3RvcmUgYXMgbnVtYmVyIChtaWxsaXNlY29uZHMgc2luY2UgZXBvY2gpXHJcblxyXG4gICAgY29uc3QgcmVjb3JkOiBhbnkgPSB7XHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgdGltZXN0YW1wLFxyXG4gICAgICBwcm9qZWN0SWQsXHJcbiAgICAgIG9wZXJhdGlvblR5cGUsXHJcbiAgICAgIHRva2VucyxcclxuICAgICAgY29zdCxcclxuICAgICAgdGVzdENhc2VzR2VuZXJhdGVkLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIG1vZGVsLFxyXG4gICAgICAgIHByb3ZpZGVyLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKFxyXG4gICAgICAgIG5ldyBQdXRDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJdGVtOiByZWNvcmQsXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQ29zdCBUcmFja2VyXSBSZWNvcmRlZCB1c2FnZTogJHtvcGVyYXRpb25UeXBlfSwgcHJvdmlkZXI6ICR7cHJvdmlkZXJ9LCBjb3N0OiAkJHtjb3N0LnRvRml4ZWQoNCl9LCB0b2tlbnM6ICR7dG9rZW5zLnRvdGFsVG9rZW5zfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0Nvc3QgVHJhY2tlcl0gRmFpbGVkIHRvIHJlY29yZCB1c2FnZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHJlY29yZCB1c2FnZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHVzZXIgb3IgcHJvamVjdCBoYXMgZXhjZWVkZWQgdXNhZ2UgbGltaXRzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRFxyXG4gICAqIEByZXR1cm5zIFRydWUgaWYgd2l0aGluIGxpbWl0cywgZmFsc2UgaWYgbGltaXQgZXhjZWVkZWRcclxuICAgKi9cclxuICBhc3luYyBjaGVja0xpbWl0KHVzZXJJZDogc3RyaW5nLCBwcm9qZWN0SWQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IHN0YXJ0T2ZNb250aCA9IG5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSwgMSkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayB1c2VyIGxpbWl0XHJcbiAgICAgIGlmICh0aGlzLmxpbWl0cy5wZXJVc2VyTW9udGhseSkge1xyXG4gICAgICAgIGNvbnN0IHVzZXJDb3N0ID0gYXdhaXQgdGhpcy5nZXRVc2VyQ29zdFNpbmNlKHVzZXJJZCwgc3RhcnRPZk1vbnRoKTtcclxuICAgICAgICBpZiAodXNlckNvc3QgPj0gdGhpcy5saW1pdHMucGVyVXNlck1vbnRobHkpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybihgW0Nvc3QgVHJhY2tlcl0gVXNlciAke3VzZXJJZH0gZXhjZWVkZWQgbW9udGhseSBsaW1pdDogJCR7dXNlckNvc3QudG9GaXhlZCgyKX0gPj0gJCR7dGhpcy5saW1pdHMucGVyVXNlck1vbnRobHl9YCk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBDaGVjayBwcm9qZWN0IGxpbWl0XHJcbiAgICAgIGlmICh0aGlzLmxpbWl0cy5wZXJQcm9qZWN0TW9udGhseSkge1xyXG4gICAgICAgIGNvbnN0IHByb2plY3RDb3N0ID0gYXdhaXQgdGhpcy5nZXRQcm9qZWN0Q29zdFNpbmNlKHByb2plY3RJZCwgc3RhcnRPZk1vbnRoKTtcclxuICAgICAgICBpZiAocHJvamVjdENvc3QgPj0gdGhpcy5saW1pdHMucGVyUHJvamVjdE1vbnRobHkpIHtcclxuICAgICAgICAgIGNvbnNvbGUud2FybihgW0Nvc3QgVHJhY2tlcl0gUHJvamVjdCAke3Byb2plY3RJZH0gZXhjZWVkZWQgbW9udGhseSBsaW1pdDogJCR7cHJvamVjdENvc3QudG9GaXhlZCgyKX0gPj0gJCR7dGhpcy5saW1pdHMucGVyUHJvamVjdE1vbnRobHl9YCk7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDb3N0IFRyYWNrZXJdIEZhaWxlZCB0byBjaGVjayBsaW1pdHM6JywgZXJyb3IpO1xyXG4gICAgICAvLyBGYWlsIG9wZW4gLSBhbGxvdyByZXF1ZXN0IGlmIGxpbWl0IGNoZWNrIGZhaWxzXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuICAvKipcclxuICAgKiBDaGVjayBpZiB1c2VyIG9yIHByb2plY3QgaGFzIGV4Y2VlZGVkIHVzYWdlIGxpbWl0c1xyXG4gICAqIFRocm93cyBlcnJvciBpZiBsaW1pdCBleGNlZWRlZFxyXG4gICAqXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRFxyXG4gICAqIEB0aHJvd3MgRXJyb3IgaWYgbGltaXQgZXhjZWVkZWRcclxuICAgKi9cclxuICBhc3luYyBjaGVja0xpbWl0cyh1c2VySWQ6IHN0cmluZywgcHJvamVjdElkOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgICBjb25zdCBzdGFydE9mTW9udGggPSBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIDEpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2hlY2sgdXNlciBsaW1pdFxyXG4gICAgICBpZiAodGhpcy5saW1pdHMucGVyVXNlck1vbnRobHkpIHtcclxuICAgICAgICBjb25zdCB1c2VyQ29zdCA9IGF3YWl0IHRoaXMuZ2V0VXNlckNvc3RTaW5jZSh1c2VySWQsIHN0YXJ0T2ZNb250aCk7XHJcbiAgICAgICAgaWYgKHVzZXJDb3N0ID49IHRoaXMubGltaXRzLnBlclVzZXJNb250aGx5KSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXHJcbiAgICAgICAgICAgIGBNb250aGx5IHVzYWdlIGxpbWl0IGV4Y2VlZGVkLiBZb3UgaGF2ZSB1c2VkICQke3VzZXJDb3N0LnRvRml4ZWQoMil9IG9mIHlvdXIgJCR7dGhpcy5saW1pdHMucGVyVXNlck1vbnRobHl9IG1vbnRobHkgbGltaXQuIFBsZWFzZSB1cGdyYWRlIHlvdXIgcGxhbiBvciB3YWl0IHVudGlsIG5leHQgbW9udGguYFxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENoZWNrIHByb2plY3QgbGltaXRcclxuICAgICAgaWYgKHRoaXMubGltaXRzLnBlclByb2plY3RNb250aGx5KSB7XHJcbiAgICAgICAgY29uc3QgcHJvamVjdENvc3QgPSBhd2FpdCB0aGlzLmdldFByb2plY3RDb3N0U2luY2UocHJvamVjdElkLCBzdGFydE9mTW9udGgpO1xyXG4gICAgICAgIGlmIChwcm9qZWN0Q29zdCA+PSB0aGlzLmxpbWl0cy5wZXJQcm9qZWN0TW9udGhseSkge1xyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxyXG4gICAgICAgICAgICBgUHJvamVjdCBtb250aGx5IHVzYWdlIGxpbWl0IGV4Y2VlZGVkLiBUaGlzIHByb2plY3QgaGFzIHVzZWQgJCR7cHJvamVjdENvc3QudG9GaXhlZCgyKX0gb2YgaXRzICQke3RoaXMubGltaXRzLnBlclByb2plY3RNb250aGx5fSBtb250aGx5IGxpbWl0LmBcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAvLyBJZiBpdCdzIGFscmVhZHkgYSBsaW1pdCBleGNlZWRlZCBlcnJvciwgcmUtdGhyb3cgaXRcclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IgJiYgZXJyb3IubWVzc2FnZS5pbmNsdWRlcygnbGltaXQgZXhjZWVkZWQnKSkge1xyXG4gICAgICAgIHRocm93IGVycm9yO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBGb3Igb3RoZXIgZXJyb3JzLCBsb2cgYW5kIGZhaWwgb3BlbiAoYWxsb3cgcmVxdWVzdClcclxuICAgICAgY29uc29sZS5lcnJvcignW0Nvc3QgVHJhY2tlcl0gRmFpbGVkIHRvIGNoZWNrIGxpbWl0czonLCBlcnJvcik7XHJcbiAgICAgIC8vIERvbid0IHRocm93IC0gZmFpbCBvcGVuIHRvIGF2b2lkIGJsb2NraW5nIHVzZXJzIGR1ZSB0byBpbmZyYXN0cnVjdHVyZSBpc3N1ZXNcclxuICAgIH1cclxuICB9XHJcblxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdG90YWwgY29zdCBmb3IgdXNlciBzaW5jZSBhIHNwZWNpZmljIGRhdGVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdXNlcklkIC0gVXNlciBJRFxyXG4gICAqIEBwYXJhbSBzdGFydERhdGUgLSBTdGFydCBkYXRlIChJU08gc3RyaW5nKVxyXG4gICAqIEByZXR1cm5zIFRvdGFsIGNvc3QgaW4gVVNEXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRVc2VyQ29zdFNpbmNlKHVzZXJJZDogc3RyaW5nLCBzdGFydERhdGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzdGFydFRpbWVzdGFtcCA9IG5ldyBEYXRlKHN0YXJ0RGF0ZSkuZ2V0VGltZSgpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXlDb25kaXRpb25FeHByZXNzaW9uOiAndXNlcklkID0gOnVzZXJJZCBBTkQgI3RzID49IDpzdGFydERhdGUnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAgICcjdHMnOiAndGltZXN0YW1wJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6dXNlcklkJzogdXNlcklkLFxyXG4gICAgICAgICAgICAnOnN0YXJ0RGF0ZSc6IHN0YXJ0VGltZXN0YW1wLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgaWYgKCFyZXN1bHQuSXRlbXMgfHwgcmVzdWx0Lkl0ZW1zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiAwO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zLnJlZHVjZSgoc3VtLCBpdGVtKSA9PiBzdW0gKyAoaXRlbS5jb3N0IHx8IDApLCAwKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tDb3N0IFRyYWNrZXJdIEZhaWxlZCB0byBnZXQgdXNlciBjb3N0OicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgdG90YWwgY29zdCBmb3IgcHJvamVjdCBzaW5jZSBhIHNwZWNpZmljIGRhdGVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gcHJvamVjdElkIC0gUHJvamVjdCBJRFxyXG4gICAqIEBwYXJhbSBzdGFydERhdGUgLSBTdGFydCBkYXRlIChJU08gc3RyaW5nKVxyXG4gICAqIEByZXR1cm5zIFRvdGFsIGNvc3QgaW4gVVNEXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRQcm9qZWN0Q29zdFNpbmNlKHByb2plY3RJZDogc3RyaW5nLCBzdGFydERhdGU6IHN0cmluZyk6IFByb21pc2U8bnVtYmVyPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBzdGFydFRpbWVzdGFtcCA9IG5ldyBEYXRlKHN0YXJ0RGF0ZSkuZ2V0VGltZSgpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChcclxuICAgICAgICBuZXcgUXVlcnlDb21tYW5kKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdwcm9qZWN0SWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICdwcm9qZWN0SWQgPSA6cHJvamVjdElkIEFORCAjdHMgPj0gOnN0YXJ0RGF0ZScsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICAgJyN0cyc6ICd0aW1lc3RhbXAnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICAgJzpwcm9qZWN0SWQnOiBwcm9qZWN0SWQsXHJcbiAgICAgICAgICAgICc6c3RhcnREYXRlJzogc3RhcnRUaW1lc3RhbXAsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtcyB8fCByZXN1bHQuSXRlbXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIDA7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiByZXN1bHQuSXRlbXMucmVkdWNlKChzdW0sIGl0ZW0pID0+IHN1bSArIChpdGVtLmNvc3QgfHwgMCksIDApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0Nvc3QgVHJhY2tlcl0gRmFpbGVkIHRvIGdldCBwcm9qZWN0IGNvc3Q6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gMDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB1c2FnZSBzdGF0aXN0aWNzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIE9wdGlvbmFsIHVzZXIgSUQgZmlsdGVyXHJcbiAgICogQHBhcmFtIHByb2plY3RJZCAtIE9wdGlvbmFsIHByb2plY3QgSUQgZmlsdGVyXHJcbiAgICogQHBhcmFtIHN0YXJ0RGF0ZSAtIE9wdGlvbmFsIHN0YXJ0IGRhdGUgZmlsdGVyIChJU08gc3RyaW5nKVxyXG4gICAqIEBwYXJhbSBlbmREYXRlIC0gT3B0aW9uYWwgZW5kIGRhdGUgZmlsdGVyIChJU08gc3RyaW5nKVxyXG4gICAqIEBwYXJhbSBwcm92aWRlciAtIE9wdGlvbmFsIHByb3ZpZGVyIGZpbHRlciAoT1BFTkFJLCBCRURST0NLLCBIVUdHSU5HRkFDRSlcclxuICAgKiBAcmV0dXJucyBVc2FnZSBzdGF0aXN0aWNzXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0VXNhZ2VTdGF0cyhcclxuICAgIHVzZXJJZD86IHN0cmluZyxcclxuICAgIHByb2plY3RJZD86IHN0cmluZyxcclxuICAgIHN0YXJ0RGF0ZT86IHN0cmluZyxcclxuICAgIGVuZERhdGU/OiBzdHJpbmcsXHJcbiAgICBwcm92aWRlcj86IEFJUHJvdmlkZXJcclxuICApOiBQcm9taXNlPFVzYWdlU3RhdHM+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGxldCBpdGVtczogYW55W10gPSBbXTtcclxuXHJcbiAgICAgIGlmICh1c2VySWQpIHtcclxuICAgICAgICAvLyBRdWVyeSBieSB1c2VyXHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5xdWVyeUJ5VXNlcih1c2VySWQsIHN0YXJ0RGF0ZSwgZW5kRGF0ZSk7XHJcbiAgICAgICAgaXRlbXMgPSByZXN1bHQ7XHJcbiAgICAgIH0gZWxzZSBpZiAocHJvamVjdElkKSB7XHJcbiAgICAgICAgLy8gUXVlcnkgYnkgcHJvamVjdFxyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMucXVlcnlCeVByb2plY3QocHJvamVjdElkLCBzdGFydERhdGUsIGVuZERhdGUpO1xyXG4gICAgICAgIGl0ZW1zID0gcmVzdWx0O1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIFRoaXMgd291bGQgcmVxdWlyZSBhIHNjYW4gLSBub3QgcmVjb21tZW5kZWQgZm9yIHByb2R1Y3Rpb25cclxuICAgICAgICBjb25zb2xlLndhcm4oJ1tDb3N0IFRyYWNrZXJdIEdldHRpbmcgc3RhdHMgd2l0aG91dCB1c2VySWQgb3IgcHJvamVjdElkIHJlcXVpcmVzIHRhYmxlIHNjYW4nKTtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgdG90YWxDYWxsczogMCxcclxuICAgICAgICAgIHRvdGFsVG9rZW5zOiAwLFxyXG4gICAgICAgICAgZXN0aW1hdGVkQ29zdDogMCxcclxuICAgICAgICAgIGJyZWFrZG93bjoge1xyXG4gICAgICAgICAgICBieVVzZXI6IG5ldyBNYXAoKSxcclxuICAgICAgICAgICAgYnlQcm9qZWN0OiBuZXcgTWFwKCksXHJcbiAgICAgICAgICAgIGJ5RGF0ZTogbmV3IE1hcCgpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBGaWx0ZXIgYnkgcHJvdmlkZXIgaWYgc3BlY2lmaWVkXHJcbiAgICAgIGlmIChwcm92aWRlcikge1xyXG4gICAgICAgIGl0ZW1zID0gaXRlbXMuZmlsdGVyKGl0ZW0gPT4gaXRlbS5tZXRhZGF0YT8ucHJvdmlkZXIgPT09IHByb3ZpZGVyKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQWdncmVnYXRlIHN0YXRpc3RpY3NcclxuICAgICAgY29uc3Qgc3RhdHM6IFVzYWdlU3RhdHMgPSB7XHJcbiAgICAgICAgdG90YWxDYWxsczogaXRlbXMubGVuZ3RoLFxyXG4gICAgICAgIHRvdGFsVG9rZW5zOiAwLFxyXG4gICAgICAgIGVzdGltYXRlZENvc3Q6IDAsXHJcbiAgICAgICAgYnJlYWtkb3duOiB7XHJcbiAgICAgICAgICBieVVzZXI6IG5ldyBNYXAoKSxcclxuICAgICAgICAgIGJ5UHJvamVjdDogbmV3IE1hcCgpLFxyXG4gICAgICAgICAgYnlEYXRlOiBuZXcgTWFwKCksXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcclxuICAgICAgICBzdGF0cy50b3RhbFRva2VucyArPSBpdGVtLnRva2Vucz8udG90YWxUb2tlbnMgfHwgMDtcclxuICAgICAgICBzdGF0cy5lc3RpbWF0ZWRDb3N0ICs9IGl0ZW0uY29zdCB8fCAwO1xyXG5cclxuICAgICAgICAvLyBCcmVha2Rvd24gYnkgdXNlclxyXG4gICAgICAgIGNvbnN0IHVzZXJDb3N0ID0gc3RhdHMuYnJlYWtkb3duLmJ5VXNlci5nZXQoaXRlbS51c2VySWQpIHx8IDA7XHJcbiAgICAgICAgc3RhdHMuYnJlYWtkb3duLmJ5VXNlci5zZXQoaXRlbS51c2VySWQsIHVzZXJDb3N0ICsgKGl0ZW0uY29zdCB8fCAwKSk7XHJcblxyXG4gICAgICAgIC8vIEJyZWFrZG93biBieSBwcm9qZWN0XHJcbiAgICAgICAgY29uc3QgcHJvamVjdENvc3QgPSBzdGF0cy5icmVha2Rvd24uYnlQcm9qZWN0LmdldChpdGVtLnByb2plY3RJZCkgfHwgMDtcclxuICAgICAgICBzdGF0cy5icmVha2Rvd24uYnlQcm9qZWN0LnNldChpdGVtLnByb2plY3RJZCwgcHJvamVjdENvc3QgKyAoaXRlbS5jb3N0IHx8IDApKTtcclxuXHJcbiAgICAgICAgLy8gQnJlYWtkb3duIGJ5IGRhdGUgKGRheSlcclxuICAgICAgICBjb25zdCBkYXRlID0gaXRlbS50aW1lc3RhbXAuc3BsaXQoJ1QnKVswXTtcclxuICAgICAgICBjb25zdCBkYXRlQ29zdCA9IHN0YXRzLmJyZWFrZG93bi5ieURhdGUuZ2V0KGRhdGUpIHx8IDA7XHJcbiAgICAgICAgc3RhdHMuYnJlYWtkb3duLmJ5RGF0ZS5zZXQoZGF0ZSwgZGF0ZUNvc3QgKyAoaXRlbS5jb3N0IHx8IDApKTtcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gc3RhdHM7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdbQ29zdCBUcmFja2VyXSBGYWlsZWQgdG8gZ2V0IHVzYWdlIHN0YXRzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZ2V0IHVzYWdlIHN0YXRzOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUXVlcnkgdXNhZ2UgcmVjb3JkcyBieSB1c2VyXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBxdWVyeUJ5VXNlcih1c2VySWQ6IHN0cmluZywgc3RhcnREYXRlPzogc3RyaW5nLCBlbmREYXRlPzogc3RyaW5nKTogUHJvbWlzZTxhbnlbXT4ge1xyXG4gICAgbGV0IGtleUNvbmRpdGlvbkV4cHJlc3Npb24gPSAndXNlcklkID0gOnVzZXJJZCc7XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBhbnkgPSB7XHJcbiAgICAgICc6dXNlcklkJzogdXNlcklkLFxyXG4gICAgfTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogYW55ID0ge307XHJcblxyXG4gICAgaWYgKHN0YXJ0RGF0ZSAmJiBlbmREYXRlKSB7XHJcbiAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgI3RzIEJFVFdFRU4gOnN0YXJ0RGF0ZSBBTkQgOmVuZERhdGUnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6c3RhcnREYXRlJ10gPSBzdGFydERhdGU7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplbmREYXRlJ10gPSBlbmREYXRlO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN0cyddID0gJ3RpbWVzdGFtcCc7XHJcbiAgICB9IGVsc2UgaWYgKHN0YXJ0RGF0ZSkge1xyXG4gICAgICBrZXlDb25kaXRpb25FeHByZXNzaW9uICs9ICcgQU5EICN0cyA+PSA6c3RhcnREYXRlJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0RGF0ZSddID0gc3RhcnREYXRlO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN0cyddID0gJ3RpbWVzdGFtcCc7XHJcbiAgICB9IGVsc2UgaWYgKGVuZERhdGUpIHtcclxuICAgICAga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiArPSAnIEFORCAjdHMgPD0gOmVuZERhdGUnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW5kRGF0ZSddID0gZW5kRGF0ZTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdHMnXSA9ICd0aW1lc3RhbXAnO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zOiBhbnkgPSB7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246IGtleUNvbmRpdGlvbkV4cHJlc3Npb24sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXMsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIE9ubHkgYWRkIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcyBpZiB3ZSBoYXZlIGRhdGUgZmlsdGVyc1xyXG4gICAgaWYgKE9iamVjdC5rZXlzKGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcykubGVuZ3RoID4gMCkge1xyXG4gICAgICBxdWVyeVBhcmFtcy5FeHByZXNzaW9uQXR0cmlidXRlTmFtZXMgPSBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5kb2NDbGllbnQuc2VuZChuZXcgUXVlcnlDb21tYW5kKHF1ZXJ5UGFyYW1zKSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtcyB8fCBbXTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFF1ZXJ5IHVzYWdlIHJlY29yZHMgYnkgcHJvamVjdFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgcXVlcnlCeVByb2plY3QocHJvamVjdElkOiBzdHJpbmcsIHN0YXJ0RGF0ZT86IHN0cmluZywgZW5kRGF0ZT86IHN0cmluZyk6IFByb21pc2U8YW55W10+IHtcclxuICAgIGxldCBrZXlDb25kaXRpb25FeHByZXNzaW9uID0gJ3Byb2plY3RJZCA9IDpwcm9qZWN0SWQnO1xyXG4gICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogYW55ID0ge1xyXG4gICAgICAnOnByb2plY3RJZCc6IHByb2plY3RJZCxcclxuICAgIH07XHJcbiAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IGFueSA9IHt9O1xyXG5cclxuICAgIGlmIChzdGFydERhdGUgJiYgZW5kRGF0ZSkge1xyXG4gICAgICBrZXlDb25kaXRpb25FeHByZXNzaW9uICs9ICcgQU5EICN0cyBCRVRXRUVOIDpzdGFydERhdGUgQU5EIDplbmREYXRlJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnN0YXJ0RGF0ZSddID0gc3RhcnREYXRlO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6ZW5kRGF0ZSddID0gZW5kRGF0ZTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdHMnXSA9ICd0aW1lc3RhbXAnO1xyXG4gICAgfSBlbHNlIGlmIChzdGFydERhdGUpIHtcclxuICAgICAga2V5Q29uZGl0aW9uRXhwcmVzc2lvbiArPSAnIEFORCAjdHMgPj0gOnN0YXJ0RGF0ZSc7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpzdGFydERhdGUnXSA9IHN0YXJ0RGF0ZTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdHMnXSA9ICd0aW1lc3RhbXAnO1xyXG4gICAgfSBlbHNlIGlmIChlbmREYXRlKSB7XHJcbiAgICAgIGtleUNvbmRpdGlvbkV4cHJlc3Npb24gKz0gJyBBTkQgI3RzIDw9IDplbmREYXRlJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVuZERhdGUnXSA9IGVuZERhdGU7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3RzJ10gPSAndGltZXN0YW1wJztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBxdWVyeVBhcmFtczogYW55ID0ge1xyXG4gICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICBJbmRleE5hbWU6ICdwcm9qZWN0SWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjoga2V5Q29uZGl0aW9uRXhwcmVzc2lvbixcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgIH07XHJcblxyXG4gICAgLy8gT25seSBhZGQgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzIGlmIHdlIGhhdmUgZGF0ZSBmaWx0ZXJzXHJcbiAgICBpZiAoT2JqZWN0LmtleXMoZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIHF1ZXJ5UGFyYW1zLkV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcyA9IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcztcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmRvY0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQocXVlcnlQYXJhbXMpKTtcclxuXHJcbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW1zIHx8IFtdO1xyXG4gIH1cclxufVxyXG4iXX0=