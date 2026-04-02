import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { TokenUsage, AIUsageRecord, UsageStats } from '../../types/ai-test-generation';

/**
 * AI Provider Types
 */
export type AIProvider = 'OPENAI' | 'BEDROCK' | 'HUGGINGFACE';

/**
 * Pricing Configuration
 * 
 * OpenAI pricing as of 2024 (per 1M tokens):
 * - GPT-4: $30 input / $60 output
 * - GPT-3.5-turbo: $0.50 input / $1.50 output
 * 
 * Bedrock pricing as of 2024 (per 1M tokens):
 * - Claude 3.5 Sonnet: $3 input / $15 output
 */
interface PricingConfig {
  model: string;
  provider: AIProvider;
  promptTokenRate: number;      // Cost per token for input
  completionTokenRate: number;  // Cost per token for output
}

const DEFAULT_PRICING: Record<string, PricingConfig> = {
  'gpt-4': {
    model: 'gpt-4',
    provider: 'OPENAI',
    promptTokenRate: 0.00003,      // $30 / 1M tokens
    completionTokenRate: 0.00006,  // $60 / 1M tokens
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    provider: 'OPENAI',
    promptTokenRate: 0.0000005,    // $0.50 / 1M tokens
    completionTokenRate: 0.0000015, // $1.50 / 1M tokens
  },
  'anthropic.claude-3-5-sonnet-20241022-v2:0': {
    model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    provider: 'BEDROCK',
    promptTokenRate: 0.000003,     // $3 / 1M tokens
    completionTokenRate: 0.000015, // $15 / 1M tokens
  },
};

/**
 * Usage Limits Configuration
 */
interface UsageLimits {
  perUserMonthly?: number;    // Max cost per user per month (USD)
  perProjectMonthly?: number; // Max cost per project per month (USD)
}

const DEFAULT_LIMITS: UsageLimits = {
  perUserMonthly: 100,    // $100 per user per month
  perProjectMonthly: 50,  // $50 per project per month
};

/**
 * Cost Tracker
 * 
 * Monitors OpenAI API usage and costs.
 * Tracks token consumption, calculates costs, enforces limits, and provides statistics.
 */
export class CostTracker {
  private docClient: DynamoDBDocumentClient;
  private tableName: string;
  private pricing: Record<string, PricingConfig>;
  private limits: UsageLimits;

  constructor(
    tableName: string = 'AIUsage',
    pricing: Record<string, PricingConfig> = DEFAULT_PRICING,
    limits: UsageLimits = DEFAULT_LIMITS,
    docClient?: DynamoDBDocumentClient
  ) {
    if (docClient) {
      this.docClient = docClient;
    } else {
      const client = new DynamoDBClient({});
      this.docClient = DynamoDBDocumentClient.from(client);
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
  calculateCost(tokens: TokenUsage, model: string, provider?: AIProvider): number {
    // Try to find exact model match first
    let config = this.pricing[model];
    
    // If not found and provider is specified, use provider default
    if (!config && provider) {
      if (provider === 'BEDROCK') {
        config = this.pricing['anthropic.claude-3-5-sonnet-20241022-v2:0'];
      } else if (provider === 'OPENAI') {
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
  async recordUsage(
    userId: string,
    projectId: string,
    operationType: 'analyze' | 'generate' | 'batch',
    tokens: TokenUsage,
    model: string,
    provider: AIProvider,
    testCasesGenerated: number = 0,
    duration: number = 0
  ): Promise<void> {
    const cost = this.calculateCost(tokens, model, provider);
    const timestamp = Date.now(); // Store as number (milliseconds since epoch)

    const record: any = {
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
      await this.docClient.send(
        new PutCommand({
          TableName: this.tableName,
          Item: record,
        })
      );

      console.log(`[Cost Tracker] Recorded usage: ${operationType}, provider: ${provider}, cost: $${cost.toFixed(4)}, tokens: ${tokens.totalTokens}`);
    } catch (error) {
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
  async checkLimit(userId: string, projectId: string): Promise<boolean> {
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
    } catch (error) {
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
  async checkLimits(userId: string, projectId: string): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    try {
      // Check user limit
      if (this.limits.perUserMonthly) {
        const userCost = await this.getUserCostSince(userId, startOfMonth);
        if (userCost >= this.limits.perUserMonthly) {
          throw new Error(
            `Monthly usage limit exceeded. You have used $${userCost.toFixed(2)} of your $${this.limits.perUserMonthly} monthly limit. Please upgrade your plan or wait until next month.`
          );
        }
      }

      // Check project limit
      if (this.limits.perProjectMonthly) {
        const projectCost = await this.getProjectCostSince(projectId, startOfMonth);
        if (projectCost >= this.limits.perProjectMonthly) {
          throw new Error(
            `Project monthly usage limit exceeded. This project has used $${projectCost.toFixed(2)} of its $${this.limits.perProjectMonthly} monthly limit.`
          );
        }
      }
    } catch (error) {
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
  private async getUserCostSince(userId: string, startDate: string): Promise<number> {
    try {
      const startTimestamp = new Date(startDate).getTime();
      
      const result = await this.docClient.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'userId = :userId AND #ts >= :startDate',
          ExpressionAttributeNames: {
            '#ts': 'timestamp',
          },
          ExpressionAttributeValues: {
            ':userId': userId,
            ':startDate': startTimestamp,
          },
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return 0;
      }

      return result.Items.reduce((sum, item) => sum + (item.cost || 0), 0);
    } catch (error) {
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
  private async getProjectCostSince(projectId: string, startDate: string): Promise<number> {
    try {
      const startTimestamp = new Date(startDate).getTime();
      
      const result = await this.docClient.send(
        new QueryCommand({
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
        })
      );

      if (!result.Items || result.Items.length === 0) {
        return 0;
      }

      return result.Items.reduce((sum, item) => sum + (item.cost || 0), 0);
    } catch (error) {
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
  async getUsageStats(
    userId?: string,
    projectId?: string,
    startDate?: string,
    endDate?: string,
    provider?: AIProvider
  ): Promise<UsageStats> {
    try {
      let items: any[] = [];

      if (userId) {
        // Query by user
        const result = await this.queryByUser(userId, startDate, endDate);
        items = result;
      } else if (projectId) {
        // Query by project
        const result = await this.queryByProject(projectId, startDate, endDate);
        items = result;
      } else {
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
      const stats: UsageStats = {
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
    } catch (error) {
      console.error('[Cost Tracker] Failed to get usage stats:', error);
      throw new Error(`Failed to get usage stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query usage records by user
   */
  private async queryByUser(userId: string, startDate?: string, endDate?: string): Promise<any[]> {
    let keyConditionExpression = 'userId = :userId';
    const expressionAttributeValues: any = {
      ':userId': userId,
    };
    const expressionAttributeNames: any = {};

    if (startDate && endDate) {
      keyConditionExpression += ' AND #ts BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
      expressionAttributeNames['#ts'] = 'timestamp';
    } else if (startDate) {
      keyConditionExpression += ' AND #ts >= :startDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeNames['#ts'] = 'timestamp';
    } else if (endDate) {
      keyConditionExpression += ' AND #ts <= :endDate';
      expressionAttributeValues[':endDate'] = endDate;
      expressionAttributeNames['#ts'] = 'timestamp';
    }

    const queryParams: any = {
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    // Only add ExpressionAttributeNames if we have date filters
    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await this.docClient.send(new QueryCommand(queryParams));

    return result.Items || [];
  }

  /**
   * Query usage records by project
   */
  private async queryByProject(projectId: string, startDate?: string, endDate?: string): Promise<any[]> {
    let keyConditionExpression = 'projectId = :projectId';
    const expressionAttributeValues: any = {
      ':projectId': projectId,
    };
    const expressionAttributeNames: any = {};

    if (startDate && endDate) {
      keyConditionExpression += ' AND #ts BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeValues[':endDate'] = endDate;
      expressionAttributeNames['#ts'] = 'timestamp';
    } else if (startDate) {
      keyConditionExpression += ' AND #ts >= :startDate';
      expressionAttributeValues[':startDate'] = startDate;
      expressionAttributeNames['#ts'] = 'timestamp';
    } else if (endDate) {
      keyConditionExpression += ' AND #ts <= :endDate';
      expressionAttributeValues[':endDate'] = endDate;
      expressionAttributeNames['#ts'] = 'timestamp';
    }

    const queryParams: any = {
      TableName: this.tableName,
      IndexName: 'projectId-timestamp-index',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    // Only add ExpressionAttributeNames if we have date filters
    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await this.docClient.send(new QueryCommand(queryParams));

    return result.Items || [];
  }
}
