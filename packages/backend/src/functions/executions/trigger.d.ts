/**
 * Trigger Lambda function for test execution
 * Handles POST /api/executions/trigger endpoint
 * Creates execution records and queues test cases for execution
 */
import { APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: import("aws-lambda").APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
