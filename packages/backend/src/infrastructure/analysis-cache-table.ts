import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface AnalysisCacheTableProps {
  environment: string;
}

/**
 * DynamoDB table for caching MISRA analysis results
 * 
 * Primary key: fileHash (SHA-256 hash of file content)
 * Stores: analysis results, timestamp, file metadata
 * TTL: configurable expiration (default 30 days)
 * 
 * Requirements: 10.7 - Cache analysis results for identical files
 */
export class AnalysisCacheTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: AnalysisCacheTableProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `misra-platform-analysis-cache-${props.environment}`,
      partitionKey: {
        name: 'fileHash',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      timeToLiveAttribute: 'ttl', // Enable TTL for automatic expiration
    });

    // Add GSI for querying by language
    this.table.addGlobalSecondaryIndex({
      indexName: 'language-timestamp-index',
      partitionKey: {
        name: 'language',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
    });

    // Add GSI for querying by userId (to track cache usage per user)
    this.table.addGlobalSecondaryIndex({
      indexName: 'userId-timestamp-index',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.NUMBER,
      },
    });
  }
}
