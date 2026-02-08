/**
 * AWS CDK infrastructure definition for Users DynamoDB table
 */
import { Construct } from 'constructs';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
export declare class UsersTable extends Construct {
    readonly table: Table;
    constructor(scope: Construct, id: string, props?: {
        environment?: string;
    });
    grantReadData(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    grantWriteData(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    grantFullAccess(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
}
