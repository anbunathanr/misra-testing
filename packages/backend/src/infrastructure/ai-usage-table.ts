import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

/**
 * AI Usage Table
 * 
 * Stores OpenAI API usage records for cost tracking and limit enforcement.
 * 
 * Schema:
 * - PK: userId (Partition Key)
 * - SK: timestamp (Sort Key) - ISO timestamp for chronological ordering
 * - GSI1: projectId (Partition Key) + timestamp (Sort Key) - Query by project
 * 
 * Attributes:
 * - operationType: 'analyze' | 'generate' | 'batch'
 * - tokens: { promptTokens, completionTokens, totalTokens }
 * - cost: number (calculated cost in USD)
 * - testCasesGenerated: number
 * - metadata: { model, duration }
 */
export class AIUsageTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'AIUsageTable', {
      tableName: 'AIUsage',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI1: Query usage by project
    this.table.addGlobalSecondaryIndex({
      indexName: 'ProjectIndex',
      partitionKey: {
        name: 'projectId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
