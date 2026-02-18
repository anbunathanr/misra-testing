/**
 * Get Execution Results Lambda
 * Returns complete execution details with pre-signed screenshot URLs
 */
import { APIGatewayProxyResult } from 'aws-lambda';
import { TestExecution } from '../../types/test-execution';
export interface ExecutionResultsResponse {
    execution: TestExecution;
    screenshotUrls: string[];
}
export declare const handler: (event: import("aws-lambda").APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
