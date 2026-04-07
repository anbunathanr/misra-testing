/**
 * Lambda handler for deleting files
 * DELETE /files/:fileId
 *
 * Requirements: 15.7
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Handler for DELETE /files/:fileId
 * Deletes file from S3 and DynamoDB
 *
 * Requirements:
 * - 15.7: Support file deletion by users
 * - 15.3: Enforce user isolation (users can only delete their own files)
 * - 15.4: Enforce organization isolation
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
