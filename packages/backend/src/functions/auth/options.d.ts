/**
 * OPTIONS Handler Lambda Function
 *
 * Handles CORS preflight requests for all API endpoints
 * Returns appropriate CORS headers for browser preflight checks
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
