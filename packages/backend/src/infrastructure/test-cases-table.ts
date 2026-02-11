import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

export class TestCasesTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'TestCasesTable', {
      tableName: 'TestCases',
      partitionKey: {
        name: 'testCaseId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI for querying test cases by suite
    this.table.addGlobalSecondaryIndex({
      indexName: 'SuiteIndex',
      partitionKey: {
        name: 'suiteId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI for querying test cases by project
    this.table.addGlobalSecondaryIndex({
      indexName: 'ProjectIndex',
      partitionKey: {
        name: 'projectId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
