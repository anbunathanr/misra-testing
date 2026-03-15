import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * POST /api/ai-test-generation/analyze
 *
 * Analyzes a web application to identify testable elements and UI patterns.
 *
 * Request Body:
 * {
 *   url: string;
 *   options?: {
 *     waitForSelector?: string;
 *     timeout?: number;
 *     viewport?: { width: number; height: number };
 *   }
 * }
 *
 * Response:
 * {
 *   analysis: ApplicationAnalysis
 * }
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
