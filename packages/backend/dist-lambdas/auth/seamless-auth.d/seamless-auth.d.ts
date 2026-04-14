import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Seamless authentication endpoint that handles both new registration and existing user login
 * - If password is provided: attempts standard login
 * - If no password: uses quick registration flow (creates user if doesn't exist)
 * - Includes retry capability for authentication failures
 * - Returns session tokens with 1-hour expiration
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
