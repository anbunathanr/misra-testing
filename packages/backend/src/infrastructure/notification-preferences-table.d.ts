import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export interface NotificationPreferencesTableProps {
    environment: string;
}
export declare class NotificationPreferencesTable extends Construct {
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string, props: NotificationPreferencesTableProps);
    grantReadWriteData(grantee: cdk.aws_iam.IGrantable): cdk.aws_iam.Grant;
    grantReadData(grantee: cdk.aws_iam.IGrantable): cdk.aws_iam.Grant;
}
