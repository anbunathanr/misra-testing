import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { RemovalPolicy } from 'aws-cdk-lib';

export class ProjectsTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'ProjectsTable', {
      tableName: 'TestProjects',
      partitionKey: {
        name: 'projectId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // GSI for querying projects by user
    this.table.addGlobalSecondaryIndex({
      indexName: 'UserIndex',
      partitionKey: {
        name: 'userId',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }
}
