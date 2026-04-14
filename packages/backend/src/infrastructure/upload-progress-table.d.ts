/**
 * AWS CDK infrastructure definition for Upload Progress DynamoDB Table
 * Task 4.2: Build file upload progress monitoring
 */
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
export declare class UploadProgressTable extends Construct {
    readonly table: Table;
    constructor(scope: Construct, id: string, props?: {
        environment?: string;
    });
    /**
     * Grant read permissions to a principal
     */
    grantReadData(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    /**
     * Grant write permissions to a principal
     */
    grantWriteData(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWriteData(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
}
/**
 * Upload Progress Record Schema
 *
 * {
 *   file_id: string,              // Primary key - unique file identifier
 *   user_id: string,              // User who initiated the upload
 *   file_name: string,            // Original filename
 *   file_size: number,            // File size in bytes
 *   progress_percentage: number,  // Upload progress (0-100)
 *   status: string,               // 'starting' | 'uploading' | 'completed' | 'failed'
 *   message: string,              // Current status message
 *   created_at: number,           // Upload start timestamp
 *   updated_at: number,           // Last update timestamp
 *   ttl: number,                  // TTL for automatic cleanup (7 days)
 *   error_message?: string,       // Error details if status is 'failed'
 *   bytes_uploaded?: number,      // Actual bytes uploaded (for detailed progress)
 *   upload_speed?: number,        // Upload speed in bytes/second
 * }
 */ 
