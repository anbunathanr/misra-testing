import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * POST /api/ai-test-generation/generate
 *
 * Generates a single test case from application analysis and scenario description.
 *
 * Request Body:
 * {
 *   analysis: ApplicationAnalysis;
 *   scenario: string;
 *   projectId: string;
 *   suiteId: string;
 * }
 *
 * Response:
 * {
 *   testCase: TestCase;
 *   tokensUsed: TokenUsage;
 *   cost: number;
 * }
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
