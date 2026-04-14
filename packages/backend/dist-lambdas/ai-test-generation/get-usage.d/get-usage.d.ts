import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
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
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
