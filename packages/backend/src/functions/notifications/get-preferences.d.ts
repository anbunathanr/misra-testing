/**
 * Get Notification Preferences Lambda
 *
 * Retrieves user notification preferences.
 * Returns default preferences if none configured.
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
