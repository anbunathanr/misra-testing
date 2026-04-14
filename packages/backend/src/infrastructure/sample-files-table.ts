import { Table, AttributeType, BillingMode, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

export class SampleFilesTable extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new Table(this, 'SampleFilesTable', {
      tableName: 'SampleFiles',
      partitionKey: {
        name: 'sample_id',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      encryption: TableEncryption.AWS_MANAGED,
    });

    // Global Secondary Index for querying by language
    this.table.addGlobalSecondaryIndex({
      indexName: 'LanguageIndex',
      partitionKey: {
        name: 'language',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'difficulty_level',
        type: AttributeType.STRING,
      },
    });

    // Global Secondary Index for querying by difficulty level
    this.table.addGlobalSecondaryIndex({
      indexName: 'DifficultyIndex',
      partitionKey: {
        name: 'difficulty_level',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'expected_violations',
        type: AttributeType.NUMBER,
      },
    });
  }
}