/**
 * AWS CDK infrastructure definition for Upload Progress DynamoDB Table
 * Task 4.2: Build file upload progress monitoring
 */

import { Construct } from 'constructs'
import { 
  Table, 
  AttributeType, 
  BillingMode,
  ProjectionType,
  StreamViewType
} from 'aws-cdk-lib/aws-dynamodb'
import { RemovalPolicy, Duration } from 'aws-cdk-lib'

export class UploadProgressTable extends Construct {
  public readonly table: Table

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id)

    const environment = props?.environment || 'dev'
    const tableName = `UploadProgress-${environment}`

    // Create the DynamoDB table for upload progress tracking
    this.table = new Table(this, 'UploadProgressTable', {
      tableName,
      
      // Primary key: file_id (partition key)
      partitionKey: {
        name: 'file_id',
        type: AttributeType.STRING
      },
      
      // Billing mode - on-demand for variable workloads
      billingMode: BillingMode.ON_DEMAND,
      
      // Enable point-in-time recovery for production
      pointInTimeRecovery: environment === 'prod',
      
      // TTL for automatic cleanup of old progress records
      timeToLiveAttribute: 'ttl',
      
      // DynamoDB Streams for real-time updates (optional)
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      
      // Removal policy
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    })

    // Global Secondary Index for querying by user_id
    this.table.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: {
        name: 'user_id',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'created_at',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL,
    })

    // Global Secondary Index for querying by status
    this.table.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'status',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'updated_at',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL,
    })

    // Add metadata tags
    this.table.node.addMetadata('Purpose', 'Upload progress tracking for MISRA file uploads')
    this.table.node.addMetadata('Environment', environment)
    this.table.node.addMetadata('DataRetention', '7 days (TTL)')
  }

  /**
   * Grant read permissions to a principal
   */
  public grantReadData(grantee: any) {
    return this.table.grantReadData(grantee)
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWriteData(grantee: any) {
    return this.table.grantWriteData(grantee)
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWriteData(grantee: any) {
    return this.table.grantReadWriteData(grantee)
  }
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