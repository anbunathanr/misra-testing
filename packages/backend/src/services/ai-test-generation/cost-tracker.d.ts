import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { TokenUsage, UsageStats } from '../../types/ai-test-generation';
/**
 * Pricing Configuration
 *
 * OpenAI pricing as of 2024 (per 1M tokens):
 * - GPT-4: $30 input / $60 output
 * - GPT-3.5-turbo: $0.50 input / $1.50 output
 */
interface PricingConfig {
    model: string;
    promptTokenRate: number;
    completionTokenRate: number;
}
/**
 * Usage Limits Configuration
 */
interface UsageLimits {
    perUserMonthly?: number;
    perProjectMonthly?: number;
}
/**
 * Cost Tracker
 *
 * Monitors OpenAI API usage and costs.
 * Tracks token consumption, calculates costs, enforces limits, and provides statistics.
 */
export declare class CostTracker {
    private docClient;
    private tableName;
    private pricing;
    private limits;
    constructor(tableName?: string, pricing?: Record<string, PricingConfig>, limits?: UsageLimits, docClient?: DynamoDBDocumentClient);
    /**
     * Calculate cost based on token usage and model
     *
     * @param tokens - Token usage breakdown
     * @param model - OpenAI model used
     * @returns Calculated cost in USD
     */
    calculateCost(tokens: TokenUsage, model: string): number;
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
    recordUsage(userId: string, projectId: string, operationType: 'analyze' | 'generate' | 'batch', tokens: TokenUsage, model: string, testCasesGenerated?: number, duration?: number): Promise<void>;
    /**
     * Check if user or project has exceeded usage limits
     *
     * @param userId - User ID
     * @param projectId - Project ID
     * @returns True if within limits, false if limit exceeded
     */
    checkLimit(userId: string, projectId: string): Promise<boolean>;
    /**
     * Check if user or project has exceeded usage limits
     * Throws error if limit exceeded
     *
     * @param userId - User ID
     * @param projectId - Project ID
     * @throws Error if limit exceeded
     */
    checkLimits(userId: string, projectId: string): Promise<void>;
    /**
     * Get total cost for user since a specific date
     *
     * @param userId - User ID
     * @param startDate - Start date (ISO string)
     * @returns Total cost in USD
     */
    private getUserCostSince;
    /**
     * Get total cost for project since a specific date
     *
     * @param projectId - Project ID
     * @param startDate - Start date (ISO string)
     * @returns Total cost in USD
     */
    private getProjectCostSince;
    /**
     * Get usage statistics
     *
     * @param userId - Optional user ID filter
     * @param projectId - Optional project ID filter
     * @param startDate - Optional start date filter (ISO string)
     * @param endDate - Optional end date filter (ISO string)
     * @returns Usage statistics
     */
    getUsageStats(userId?: string, projectId?: string, startDate?: string, endDate?: string): Promise<UsageStats>;
    /**
     * Query usage records by user
     */
    private queryByUser;
    /**
     * Query usage records by project
     */
    private queryByProject;
}
export {};
