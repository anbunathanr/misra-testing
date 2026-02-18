/**
 * Get Notification Templates Lambda
 *
 * List all templates with optional filtering by event type or channel.
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
