import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Lambda function for automatic sample file upload with progress tracking
 * Task 4.1: Create sample file upload Lambda function
 *
 * Features:
 * - Automatic sample file selection from predefined library
 * - Secure S3 upload process for selected sample files
 * - Upload progress tracking and real-time feedback
 * - File validation for C/C++ file types and size limits
 * - Error handling for upload failures with retry options
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
