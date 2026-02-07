/**
 * AWS CDK infrastructure definition for Analysis Results DynamoDB table
 * Stores detailed MISRA analysis results and violations
 */

import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode, ProjectionType } from 'aws-cdk-lib/aws-dynamodb';
import { RemovalPolicy } from 'aws-cdk-lib';

export class AnalysisResultsTable extends Construct {
  public readonly table: Table;

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id);

    const environment = props?.environment || 'dev';
    const tableName = `AnalysisResults-${environment}`;

    this.table = new Table(this, 'AnalysisResultsTable', {
      tableName,
      partitionKey: {
        name: 'analysisId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.NUMBER
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      pointInTimeRecovery: environment === 'prod',
    });

    // GSI for querying by file ID
    this.table.addGlobalSecondaryIndex({
      indexName: 'fileId-timestamp-index',
      partitionKey: {
        name: 'fileId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    });

    // GSI for querying by user ID
    this.table.addGlobalSecondaryIndex({
      indexName: 'userId-timestamp-index',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    });

    // GSI for querying by rule set
    this.table.addGlobalSecondaryIndex({
      indexName: 'ruleSet-timestamp-index',
      partitionKey: {
        name: 'ruleSet',
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'timestamp',
        type: AttributeType.NUMBER
      },
      projectionType: ProjectionType.ALL
    });

    this.table.node.addMetadata('Purpose', 'MISRA analysis results and violations');
    this.table.node.addMetadata('Environment', environment);
  }

  public grantReadData(grantee: any) {
    return this.table.grantReadData(grantee);
  }

  public grantWriteData(grantee: any) {
    return this.table.grantWriteData(grantee);
  }

  public grantFullAccess(grantee: any) {
    return this.table.grantFullAccess(grantee);
  }
}
