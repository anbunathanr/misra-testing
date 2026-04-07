/**
 * Lambda handler for generating and retrieving MISRA analysis PDF reports
 * GET /reports/:fileId
 *
 * Requirements: 8.6, 8.7
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Handler for GET /reports/:fileId
 * Generates PDF report and returns presigned download URL
 *
 * Requirements:
 * - 8.6: Generate PDF report using ReportGenerator
 * - 8.6: Store PDF in S3 bucket
 * - 8.7: Return presigned download URL (expires in 1 hour)
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
