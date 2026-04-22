/**
 * Get Profile Lambda Function
 *
 * Retrieves the authenticated user's profile information
 * Requires valid JWT token in Authorization header
 *
 * Request:
 * GET /auth/profile
 * Authorization: Bearer <jwt-token>
 *
 * Response:
 * {
 *   "userId": "cognito-user-id",
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "emailVerified": true,
 *   "mfaEnabled": true,
 *   "createdAt": "2024-01-01T00:00:00Z",
 *   "lastModified": "2024-01-15T10:30:00Z"
 * }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
