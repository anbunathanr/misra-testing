import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';
export interface IAMRolesProps {
    environment: 'dev' | 'staging' | 'production';
    region: string;
    accountId: string;
    kmsKey: kms.Key;
    userPool: cognito.UserPool;
    filesBucket: s3.Bucket;
    usersTable: dynamodb.Table;
    fileMetadataTable: dynamodb.Table;
    analysisResultsTable: dynamodb.Table;
    sampleFilesTable: dynamodb.Table;
    progressTable: dynamodb.Table;
    jwtSecret: secretsmanager.Secret;
    otpSecret: secretsmanager.Secret;
    apiKeysSecret: secretsmanager.Secret;
    dbSecret: secretsmanager.Secret;
}
/**
 * IAM Roles with Least Privilege Access
 *
 * This construct creates IAM roles for different Lambda function types with minimal required permissions.
 * Each role follows the principle of least privilege, granting only the specific permissions needed
 * for that function type to operate correctly.
 */
export declare class IAMRoles extends Construct {
    readonly authorizerRole: iam.Role;
    readonly authFunctionRole: iam.Role;
    readonly fileFunctionRole: iam.Role;
    readonly analysisFunctionRole: iam.Role;
    readonly monitoringRole: iam.Role;
    readonly auditRole: iam.Role;
    constructor(scope: Construct, id: string, props: IAMRolesProps);
    /**
     * Create base Lambda execution role with minimal CloudWatch permissions
     */
    private createBaseLambdaRole;
    /**
     * Create IAM role for Lambda Authorizer with minimal JWT validation permissions
     */
    private createAuthorizerRole;
    /**
     * Create IAM role for Authentication Lambda functions
     */
    private createAuthFunctionRole;
    /**
     * Create IAM role for File Management Lambda functions
     */
    private createFileFunctionRole;
    /**
     * Create IAM role for Analysis Lambda functions
     */
    private createAnalysisFunctionRole;
    /**
     * Create IAM role for Monitoring Lambda functions
     */
    private createMonitoringRole;
    /**
     * Create IAM role for Audit Stream Processor Lambda function
     */
    private createAuditRole;
    /**
     * Helper method to inherit base Lambda permissions
     */
    private inheritBaseLambdaPermissions;
    /**
     * Create environment-specific permission boundaries
     */
    createPermissionBoundaries(environment: string, region: string, accountId: string): iam.ManagedPolicy;
}
