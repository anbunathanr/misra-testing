import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface NotificationHistoryTableProps {
  environment: string;
}

export class NotificationHistoryTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: NotificationHistoryTableProps) {
    super(scope, id);

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `misra-platform-notification-history-${props.environment}`,
      partitionKey: { name: 'notificationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl', // Enable TTL for automatic deletion after 90 days
    });

    // Add GSI for querying history by user and time
    this.table.addGlobalSecondaryIndex({
      indexName: 'UserTimeIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sentAt', type: dynamodb.AttributeType.STRING },
    });

    // Add GSI for querying history by event type and time
    this.table.addGlobalSecondaryIndex({
      indexName: 'EventTypeTimeIndex',
      partitionKey: { name: 'eventType', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sentAt', type: dynamodb.AttributeType.STRING },
    });

    // Add CloudFormation output
    new cdk.CfnOutput(this, 'TableName', {
      value: this.table.tableName,
      description: 'DynamoDB table for notification history',
    });
  }

  public grantReadWriteData(grantee: cdk.aws_iam.IGrantable): cdk.aws_iam.Grant {
    return this.table.grantReadWriteData(grantee);
  }

  public grantReadData(grantee: cdk.aws_iam.IGrantable): cdk.aws_iam.Grant {
    return this.table.grantReadData(grantee);
  }
}
