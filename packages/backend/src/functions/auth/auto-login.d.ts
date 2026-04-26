/**
 * Auto-login endpoint for automated workflows
 * Handles user creation and authentication internally
 * Returns a valid JWT token for any email address
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
