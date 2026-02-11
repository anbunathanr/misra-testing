/**
 * AWS CDK infrastructure definition for File Metadata DynamoDB table
 */

import { Construct } from 'constructs'
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb'
import { RemovalPolicy } from 'aws-cdk-lib'
import { FILE_METADATA_TABLE_CONFIG } from '../config/dynamodb-config'

export class FileMetadataTable extends Construct {
  public readonly table: Table

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id)

    const environment = props?.environment || 'dev'
    const tableName = `${FILE_METADATA_TABLE_CONFIG.tableName}-${environment}`

    this.table = new Table(this, 'FileMetadataTable', {
      tableName,
      partitionKey: {
        name: 'file_id',
        type: AttributeType.STRING
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod'
    })

    // Add Global Secondary Indexes
    this.table.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: {
        name: 'user_id',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'upload_timestamp',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    })

    this.table.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: {
        name: 'analysis_status',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'upload_timestamp',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    })

    this.table.addGlobalSecondaryIndex({
      indexName: 'UserStatusIndex',
      partitionKey: {
        name: 'user_id',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'analysis_status',
        type: AttributeType.STRING
      },
      projectionType: ProjectionType.ALL
    })

    this.table.node.addMetadata('Purpose', 'File metadata storage for MISRA testing')
    this.table.node.addMetadata('Environment', environment)
  }

  public grantReadData(grantee: any) {
    return this.table.grantReadData(grantee)
  }

  public grantWriteData(grantee: any) {
    return this.table.grantWriteData(grantee)
  }

  public grantReadWriteData(grantee: any) {
    return this.table.grantReadWriteData(grantee)
  }

  public grantFullAccess(grantee: any) {
    return this.table.grantFullAccess(grantee)
  }
}
