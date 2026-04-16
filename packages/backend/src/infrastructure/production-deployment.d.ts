import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Duration } from 'aws-cdk-lib';
import { MonitoringStack } from './monitoring-stack';
/**
 * Production S3 Bucket Configuration
 *
 * Enhances the base FileStorageBucket with production-specific settings:
 * - Versioning enabled (always)
 * - Server-side encryption with KMS
 * - Access logging for audit trail
 * - Bucket policy for secure access
 * - Lifecycle rules for cost optimization
 */
export declare class ProductionS3Bucket extends Construct {
    readonly bucket: s3.Bucket;
    constructor(scope: Construct, id: string, props?: {
        environment?: string;
    });
    grantRead(grantee: any): iam.Grant;
    grantWrite(grantee: any): iam.Grant;
    grantReadWrite(grantee: any): iam.Grant;
    grantPresignedUrl(grantee: any): iam.Grant;
}
/**
 * Production DynamoDB Table Configuration
 *
 * Enhances DynamoDB tables with production-specific settings:
 * - Point-in-time recovery enabled
 * - Encryption at rest with KMS
 * - Continuous backups
 */
export declare class ProductionDynamoDBTable extends Construct {
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string, props: {
        partitionKey: {
            name: string;
            type: dynamodb.AttributeType;
        };
        sortKey?: {
            name: string;
            type: dynamodb.AttributeType;
        };
        environment?: string;
        tableName?: string;
    });
    grantReadData(grantee: any): iam.Grant;
    grantWriteData(grantee: any): iam.Grant;
    grantReadWriteData(grantee: any): iam.Grant;
    addGlobalSecondaryIndex(props: {
        indexName: string;
        partitionKey: {
            name: string;
            type: dynamodb.AttributeType;
        };
        sortKey?: {
            name: string;
            type: dynamodb.AttributeType;
        };
        projectionType?: dynamodb.ProjectionType;
    }): void;
}
/**
 * Production Lambda Function Configuration
 *
 * Enhances Lambda functions with production-specific settings:
 * - Reserved concurrency for critical functions
 * - Environment variables from Secrets Manager
 * - CloudWatch logging with encryption
 * - X-Ray tracing enabled
 */
export declare class ProductionLambdaFunction extends Construct {
    readonly function: lambda.Function;
    constructor(scope: Construct, id: string, props: {
        entry: string;
        handler: string;
        runtime: lambda.Runtime;
        environment?: Record<string, string>;
        timeout?: Duration;
        memorySize?: number;
        reservedConcurrentExecutions?: number;
        environmentSecrets?: Record<string, secretsmanager.ISecret>;
    });
    grantInvoke(grantee: any): iam.Grant;
}
/**
 * Production Deployment Stack
 *
 * Deploys production-specific infrastructure enhancements for Task 7.2
 * Fixes duplicate table issues and provides comprehensive production deployment
 *
 * Task 8.2 Enhancement: Adds comprehensive monitoring and alerting
 */
export declare class ProductionDeploymentStack extends Construct {
    readonly monitoringStack: MonitoringStack;
    readonly apiGateway: apigateway.RestApi;
    constructor(scope: Construct, id: string);
}
