import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as backup from 'aws-cdk-lib/aws-backup';
import { Construct } from 'constructs';
export interface BackupRecoveryConfigProps {
    environment: 'dev' | 'staging' | 'production';
    tables: {
        usersTable: dynamodb.Table;
        fileMetadataTable: dynamodb.Table;
        analysisResultsTable: dynamodb.Table;
        sampleFilesTable: dynamodb.Table;
        progressTable: dynamodb.Table;
    };
    filesBucket: s3.Bucket;
    replicationBucket?: s3.Bucket;
    replicationRole?: iam.Role;
    lambdaFunctions: {
        [key: string]: lambda.Function;
    };
}
/**
 * Backup and Recovery Configuration for MISRA Platform
 *
 * Implements comprehensive backup strategies including:
 * - DynamoDB automated backups with retention policies
 * - S3 cross-region replication for disaster recovery
 * - Lambda function versioning and aliases
 * - Automated backup monitoring and alerting
 */
export declare class BackupRecoveryConfig extends Construct {
    private _backupVault;
    private _backupPlan;
    private _replicationConfiguration;
    readonly lambdaVersions: Map<string, lambda.Version>;
    readonly lambdaAliases: Map<string, lambda.Alias>;
    get backupVault(): backup.BackupVault;
    get backupPlan(): backup.BackupPlan;
    get replicationConfiguration(): any;
    constructor(scope: Construct, id: string, props: BackupRecoveryConfigProps);
    /**
     * Configure automated DynamoDB backups with AWS Backup
     */
    private configureDynamoDBBackups;
    /**
     * Get backup plan configuration based on environment
     */
    private getBackupPlanConfig;
    /**
     * Configure S3 cross-region replication
     */
    private configureS3Replication;
    /**
     * Configure Lambda function versioning and aliases
     */
    private configureLambdaVersioning;
    /**
     * Create backup monitoring and alerting
     */
    private createBackupMonitoring;
    /**
     * Get RTO/RPO targets based on environment
     */
    static getRtoRpoTargets(environment: string): {
        rto: string;
        rpo: string;
        description: string;
    } | {
        rto: string;
        rpo: string;
        description: string;
    } | {
        rto: string;
        rpo: string;
        description: string;
    };
}
