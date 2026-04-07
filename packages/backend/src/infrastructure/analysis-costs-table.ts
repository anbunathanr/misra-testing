import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

/**
 * Analysis Costs Table
 * 
 * Stores cost tracking data for MISRA analysis operations.
 * Tracks Lambda execution time, S3 storage, and DynamoDB operations.
 * 
 * Schema:
 * - PK: userId (Partition Key)
 * - SK: timestamp (Sort Key) - ISO timestamp for chronological ordering
 * - GSI1: organizationId (Partition Key) + timestamp (Sort Key) - Query by organization
 * 
 * Attributes:
 * - analysisId: string - Reference to analysis result
 * - fileId: string - Reference to analyzed file
 * - costs: {
 *     lambdaExecutionTime: number (milliseconds)
 *     lambdaCost: number (USD)
 *     s3StorageCost: number (USD)
 *     dynamoDbWriteCost: number (USD)
 *     totalCost: number (USD)
 *   }
 * - metadata: {
 *     fileSize: number (bytes)
 *     duration: number (milliseconds)
 *   }
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
export class AnalysisCostsTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'AnalysisCostsTable', {
      tableName: 'AnalysisCosts',
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

    // GSI1: Query costs by organization
    this.table.addGlobalSecondaryIndex({
      indexName: 'OrganizationIndex',
      partitionKey: {
        name: 'organizationId',
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
