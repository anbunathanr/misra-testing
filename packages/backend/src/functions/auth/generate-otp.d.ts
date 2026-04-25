/**
 * Generate OTP Lambda Function
 *
 * Generates and sends a new OTP to the user's email
 * Used for passwordless authentication flow
 *
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "OTP sent to your email",
 *   "email": "user@example.com",
 *   "expiresIn": 600
 * }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
