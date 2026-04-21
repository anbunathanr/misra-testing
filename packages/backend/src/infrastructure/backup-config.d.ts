import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
export interface BackupConfigProps {
    environment: 'dev' | 'staging' | 'production';
    tables: {
        users: dynamodb.Table;
        fileMetadata: dynamodb.Table;
        analysisResults: dynamodb.Table;
        sampleFiles: dynamodb.Table;
        progress: dynamodb.Table;
    };
    filesBucket: s3.Bucket;
    lambdaFunctions: {
        [key: string]: lambda.Function;
    };
    replicationRegion?: string;
}
export declare class BackupConfig extends Construct {
    readonly backupVault: backup.BackupVault;
    readonly backupPlan: backup.BackupPlan;
    readonly backupRole: iam.Role;
    constructor(scope: Construct, id: string, props: BackupConfigProps);
    private createBackupPlan;
    private configureDynamoDBBackups;
    private configureS3Replication;
    private configureLambdaVersioning;
    private createBackupMonitoring;
    createOutputs(scope: Construct, stackName: string): void;
}
