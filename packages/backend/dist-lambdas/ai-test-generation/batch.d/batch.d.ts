import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * POST /api/ai-test-generation/batch
 *
 * Generates multiple test cases for different scenarios in a single operation.
 *
 * Request Body:
 * {
 *   url: string;
 *   scenarios: string[];
 *   projectId: string;
 *   suiteId: string;
 *   options?: AnalysisOptions;
 * }
 *
 * Response:
 * {
 *   results: BatchResult;
 *   tokensUsed: TokenUsage;
 *   cost: number;
 * }
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
