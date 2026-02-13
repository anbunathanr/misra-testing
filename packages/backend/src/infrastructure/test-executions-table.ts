import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

export class TestExecutionsTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'TestExecutionsTable', {
      tableName: 'TestExecutions',
      partitionKey: {
        name: 'executionId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI1: Query executions by project
    this.table.addGlobalSecondaryIndex({
      indexName: 'ProjectIndex',
      partitionKey: {
        name: 'projectId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI2: Query executions by test case
    this.table.addGlobalSecondaryIndex({
      indexName: 'TestCaseIndex',
      partitionKey: {
        name: 'testCaseId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI3: Query executions by test suite
    this.table.addGlobalSecondaryIndex({
      indexName: 'TestSuiteIndex',
      partitionKey: {
        name: 'testSuiteId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // GSI4: Query test cases within a suite execution
    this.table.addGlobalSecondaryIndex({
      indexName: 'SuiteExecutionIndex',
      partitionKey: {
        name: 'suiteExecutionId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
