"use strict";
/**
 * AWS CDK infrastructure definition for Upload Progress DynamoDB Table
 * Task 4.2: Build file upload progress monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadProgressTable = void 0;
const constructs_1 = require("constructs");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class UploadProgressTable extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const tableName = `UploadProgress-${environment}`;
        // Create the DynamoDB table for upload progress tracking
        this.table = new aws_dynamodb_1.Table(this, 'UploadProgressTable', {
            tableName,
            // Primary key: file_id (partition key)
            partitionKey: {
                name: 'file_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            // Billing mode - on-demand for variable workloads
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            // Enable point-in-time recovery for production
            pointInTimeRecovery: environment === 'prod',
            // TTL for automatic cleanup of old progress records
            timeToLiveAttribute: 'ttl',
            // DynamoDB Streams for real-time updates (optional)
            stream: aws_dynamodb_1.StreamViewType.NEW_AND_OLD_IMAGES,
            // Removal policy
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Global Secondary Index for querying by user_id
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: {
                name: 'user_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'created_at',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        // Global Secondary Index for querying by status
        this.table.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: {
                name: 'status',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'updated_at',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        // Add metadata tags
        this.table.node.addMetadata('Purpose', 'Upload progress tracking for MISRA file uploads');
        this.table.node.addMetadata('Environment', environment);
        this.table.node.addMetadata('DataRetention', '7 days (TTL)');
    }
    /**
     * Grant read permissions to a principal
     */
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
    /**
     * Grant write permissions to a principal
     */
    grantWriteData(grantee) {
        return this.table.grantWriteData(grantee);
    }
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
}
exports.UploadProgressTable = UploadProgressTable;
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
