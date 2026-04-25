/**
 * Verify OTP Email Lambda Function
 *
 * Verifies the OTP provided by the user and authenticates them
 * Returns JWT tokens for authenticated session
 *
 * Request:
 * {
 *   "email": "user@example.com",
 *   "otp": "123456"
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "accessToken": "jwt-token",
 *   "refreshToken": "refresh-token",
 *   "user": {
 *     "email": "user@example.com",
 *     "userId": "cognito-user-id"
 *   },
 *   "expiresIn": 3600
 * }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
