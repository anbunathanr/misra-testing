/**
 * Auto-Login Lambda Function
 *
 * Logs in user after OTP verification without requiring password
 * This is used in the automated authentication flow
 *
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "accessToken": "...",
 *   "refreshToken": "...",
 *   "expiresIn": 3600,
 *   "user": {
 *     "userId": "...",
 *     "email": "user@example.com",
 *     "name": "User"
 *   }
 * }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
