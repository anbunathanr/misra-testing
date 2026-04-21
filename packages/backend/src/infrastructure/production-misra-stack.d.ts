import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { CloudWatchMonitoring } from './cloudwatch-monitoring';
import { IAMRoles } from './iam-roles';
import { VpcConfig } from './vpc-config';
import { WafConfig } from './waf-config';
import { SecurityHeaders } from './security-headers';
import { BackupConfig } from './backup-config';
export interface ProductionMisraStackProps extends cdk.StackProps {
    environment: 'dev' | 'staging' | 'production';
    domainName?: string;
    certificateArn?: string;
    alertEmail?: string;
}
export declare class ProductionMisraStack extends cdk.Stack {
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
    api: apigateway.RestApi;
    filesBucket: s3.Bucket;
    kmsKey: kms.Key;
    usersTable: dynamodb.Table;
    fileMetadataTable: dynamodb.Table;
    analysisResultsTable: dynamodb.Table;
    sampleFilesTable: dynamodb.Table;
    progressTable: dynamodb.Table;
    authorizerFunction: lambda.Function;
    jwtSecret: secretsmanager.Secret;
    iamRoles: IAMRoles;
    monitoring: CloudWatchMonitoring;
    vpcConfig: VpcConfig;
    wafConfig: WafConfig;
    securityHeaders: SecurityHeaders;
    backupConfig: BackupConfig;
    constructor(scope: Construct, id: string, props: ProductionMisraStackProps);
    private createDynamoDBTables;
    /**
     * Configure auto-scaling for DynamoDB tables in production
     */
    private configureAutoScaling;
    private createS3Bucket;
    private createCognitoUserPool;
    private createApiGateway;
    /**
     * Create API models for request/response validation
     */
    private createApiModels;
    /**
     * Configure custom domain and SSL certificate
     */
    private configureCustomDomain;
    private createApiEndpoints;
    /**
     * Configure per-method throttling and caching
     */
    private configureMethodThrottling;
    /**
     * Create Security Headers configuration
     */
    private createSecurityHeaders;
    /**
     * Apply security headers to API Gateway
     */
    private applySecurityHeaders;
    /**
     * Create WAF configuration for API Gateway and CloudFront
     */
    private createWafConfiguration;
    private createCloudWatchMonitoring;
    private createSecrets;
    /**
     * Generate a secure random key for secrets
     */
    private generateSecureKey;
    /**
     * Create IAM roles with least privilege access
     */
    private createIAMRoles;
    private createLambdaFunctions;
    /**
     * Connect DynamoDB streams to audit processor Lambda function
     */
    private connectStreamsToAuditProcessor;
    /**
     * Configure cross-region replication for production environment
     */
    private configureCrossRegionReplication;
    /**
     * Configure S3 event notifications for audit logging
     */
    private configureS3EventNotifications;
    /**
     * Configure Lambda function alarms for production monitoring
     */
    private configureLambdaAlarms;
    /**
     * Create CloudFront distribution for frontend
     */
    private createCloudFrontDistribution;
    /**
     * Create backup and recovery configuration
     */
    private createBackupConfiguration;
    private createOutputs;
}
