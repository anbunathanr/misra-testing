/**
 * Fetch OTP Lambda Function
 *
 * Retrieves OTP from DynamoDB (stored by webhook)
 * This enables automatic OTP extraction from user's email
 *
 * Request:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "otp": "123456",
 *   "message": "OTP fetched successfully"
 * }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
