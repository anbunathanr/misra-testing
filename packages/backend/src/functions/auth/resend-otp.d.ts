/**
 * Resend OTP Lambda Function
 *
 * Handles OTP resend for existing users who didn't receive their initial OTP
 * or whose OTP has expired
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
 *   "email": "user@example.com"
 * }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
