import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CostTracker } from '../../services/ai-test-generation/cost-tracker';
import { getUserFromContext } from '../../utils/auth-util';

/**
 * GET /api/ai-test-generation/usage
 * 
 * Retrieves usage statistics and cost estimates.
 * 
 * Query Parameters:
 * - userId?: string
 * - projectId?: string
 * - startDate?: string (ISO format)
 * - endDate?: string (ISO format)
 * - provider?: string (OPENAI, BEDROCK, HUGGINGFACE)
 * 
 * Response:
 * {
 *   today: { requests, tokens, cost },
 *   thisMonth: { requests, tokens, cost },
 *   limits: { dailyRequests, dailyTokens, dailyCost, monthlyRequests, monthlyTokens, monthlyCost },
 *   stats: UsageStats,
 *   provider?: string (if filtered)
 * }
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[GetUsage] Received request');

  try {
    // Get user ID from authorizer context
    const user = getUserFromContext(event);
    const requestingUserId = user.userId;
    if (!requestingUserId) {
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Unauthorized',
        }),
      };
    }

    // Parse query parameters
    const queryParams = event.queryStringParameters || {};
    const userId = queryParams.userId || requestingUserId; // Default to requesting user
    const projectId = queryParams.projectId;
    const startDate = queryParams.startDate;
    const endDate = queryParams.endDate;
    const provider = queryParams.provider as 'OPENAI' | 'BEDROCK' | 'HUGGINGFACE' | undefined;

    // Authorization check: users can only view their own stats unless they're admin
    if (userId !== requestingUserId) {
      return {
        statusCode: 403,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Forbidden',
          message: 'You can only view your own usage statistics',
        }),
      };
    }

    console.log(`[GetUsage] Retrieving stats for user: ${userId}`);

    // Initialize cost tracker
    const tableName = process.env.AI_USAGE_TABLE || 'AIUsage';
    const costTracker = new CostTracker(tableName);

    // Get today's date range
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();

    // Get this month's date range
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();

    // Get usage statistics for today
    const todayStats = await costTracker.getUsageStats(
      userId,
      projectId,
      startOfToday,
      endOfToday,
      provider
    );

    // Get usage statistics for this month
    const monthStats = await costTracker.getUsageStats(
      userId,
      projectId,
      startOfMonth,
      endOfMonth,
      provider
    );

    // Get overall stats if date range provided
    const overallStats = startDate || endDate
      ? await costTracker.getUsageStats(userId, projectId, startDate, endDate, provider)
      : monthStats;

    console.log(`[GetUsage] Today: ${todayStats.totalCalls} calls, $${todayStats.estimatedCost.toFixed(2)}, provider: ${provider || 'all'}`);
    console.log(`[GetUsage] Month: ${monthStats.totalCalls} calls, $${monthStats.estimatedCost.toFixed(2)}, provider: ${provider || 'all'}`);

    // Get limits from config (these should match the limits in cost-tracker.ts)
    const limits = {
      dailyRequests: 100,
      dailyTokens: 100000,
      dailyCost: 10.0,
      monthlyRequests: 3000,
      monthlyTokens: 3000000,
      monthlyCost: 100.0,
    };

    // Build response
    const response: any = {
      today: {
        requests: todayStats.totalCalls,
        tokens: todayStats.totalTokens,
        cost: todayStats.estimatedCost,
      },
      thisMonth: {
        requests: monthStats.totalCalls,
        tokens: monthStats.totalTokens,
        cost: monthStats.estimatedCost,
      },
      limits,
      stats: {
        totalCalls: overallStats.totalCalls,
        totalTokens: overallStats.totalTokens,
        estimatedCost: overallStats.estimatedCost,
        breakdown: {
          byUser: Object.fromEntries(overallStats.breakdown.byUser),
          byProject: Object.fromEntries(overallStats.breakdown.byProject),
          byDate: Object.fromEntries(overallStats.breakdown.byDate),
        },
      },
    };

    // Add provider filter info if specified
    if (provider) {
      response.provider = provider;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('[GetUsage] Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to retrieve usage statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
