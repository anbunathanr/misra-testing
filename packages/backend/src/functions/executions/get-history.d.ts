/**
 * Get Execution History Lambda
 *
 * Endpoint: GET /api/executions/history
 *
 * Query Parameters:
 * - projectId (required)
 * - testCaseId (optional)
 * - testSuiteId (optional)
 * - startDate (optional)
 * - endDate (optional)
 * - limit (optional, default 50)
 */
import { APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: import("aws-lambda").APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
