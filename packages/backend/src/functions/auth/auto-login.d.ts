/**
 * Auto-Login Lambda Function
 *
 * Logs in user after OTP verification without requiring password
 * This is used in the automated authentication flow
 *
 * For existing users: Uses the temporary password set during registration
 * For new users: Uses the temporary password generated during registration
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
