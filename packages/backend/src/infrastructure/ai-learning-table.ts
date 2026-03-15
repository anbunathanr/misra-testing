import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * AI Learning Table
 * 
 * Stores learning data from test execution results to improve future test generation.
 * Uses domain-based partitioning to group learning by application domain.
 */
export class AILearningTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: 'AILearning',
      partitionKey: { name: 'domain', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      pointInTimeRecovery: true,
    });

    // GSI for querying by selector strategy
    this.table.addGlobalSecondaryIndex({
      indexName: 'selectorStrategy-timestamp-index',
      partitionKey: { name: 'selectorStrategy', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    // GSI for querying by test pattern
    this.table.addGlobalSecondaryIndex({
      indexName: 'testPattern-timestamp-index',
      partitionKey: { name: 'testPattern', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });
  }
}
