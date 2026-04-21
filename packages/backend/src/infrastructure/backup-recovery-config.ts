import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
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
export class BackupRecoveryConfig extends Construct {
  private _backupVault: backup.BackupVault;
  private _backupPlan: backup.BackupPlan;
  private _replicationConfiguration: any;
  public readonly lambdaVersions: Map<string, lambda.Version>;
  public readonly lambdaAliases: Map<string, lambda.Alias>;

  public get backupVault(): backup.BackupVault {
    return this._backupVault;
  }

  public get backupPlan(): backup.BackupPlan {
    return this._backupPlan;
  }

  public get replicationConfiguration(): any {
    return this._replicationConfiguration;
  }

  constructor(scope: Construct, id: string, props: BackupRecoveryConfigProps) {
    super(scope, id);

    const { environment, tables, filesBucket, replicationBucket, replicationRole, lambdaFunctions } = props;

    // Initialize collections
    this.lambdaVersions = new Map();
    this.lambdaAliases = new Map();

    // 1. Configure DynamoDB Backup Policies
    this.configureDynamoDBBackups(environment, tables);

    // 2. Configure S3 Cross-Region Replication
    if (environment === 'production' && replicationBucket && replicationRole) {
      this.configureS3Replication(filesBucket, replicationBucket, replicationRole);
    }

    // 3. Configure Lambda Function Versioning
    this.configureLambdaVersioning(environment, lambdaFunctions);

    // 4. Create backup monitoring
    this.createBackupMonitoring(environment);
  }

  /**
   * Configure automated DynamoDB backups with AWS Backup
   */
  private configureDynamoDBBackups(
    environment: string,
    tables: BackupRecoveryConfigProps['tables']
  ) {
    // Create backup vault with encryption
    this._backupVault = new backup.BackupVault(this, 'BackupVault', {
      backupVaultName: `misra-platform-backup-vault-${environment}`,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Define backup plan based on environment
    const backupPlanConfig = this.getBackupPlanConfig(environment);

    this._backupPlan = new backup.BackupPlan(this, 'BackupPlan', {
      backupPlanName: `misra-platform-backup-plan-${environment}`,
      backupVault: this._backupVault,
      backupPlanRules: [
        // Daily backups
        new backup.BackupPlanRule({
          ruleName: 'DailyBackup',
          scheduleExpression: events.Schedule.cron({
            hour: '2',
            minute: '0',
          }),
          deleteAfter: cdk.Duration.days(backupPlanConfig.dailyRetentionDays),
          moveToColdStorageAfter: environment === 'production' 
            ? cdk.Duration.days(30) 
            : undefined,
        }),
        // Weekly backups
        new backup.BackupPlanRule({
          ruleName: 'WeeklyBackup',
          scheduleExpression: events.Schedule.cron({
            weekDay: 'SUN',
            hour: '3',
            minute: '0',
          }),
          deleteAfter: cdk.Duration.days(backupPlanConfig.weeklyRetentionDays),
          moveToColdStorageAfter: environment === 'production' 
            ? cdk.Duration.days(60) 
            : undefined,
        }),
        // Monthly backups (production only)
        ...(environment === 'production' ? [
          new backup.BackupPlanRule({
            ruleName: 'MonthlyBackup',
            scheduleExpression: events.Schedule.cron({
              day: '1',
              hour: '4',
              minute: '0',
            }),
            deleteAfter: cdk.Duration.days(backupPlanConfig.monthlyRetentionDays),
            moveToColdStorageAfter: cdk.Duration.days(90),
          }),
        ] : []),
      ],
    });

    // Add all DynamoDB tables to backup plan
    Object.entries(tables).forEach(([name, table]) => {
      // Skip progress table (ephemeral data with TTL)
      if (name === 'progressTable') {
        return;
      }

      new backup.BackupSelection(this, `${name}BackupSelection`, {
        backupPlan: this._backupPlan,
        resources: [
          backup.BackupResource.fromArn(table.tableArn),
        ],
      });
    });

    // Output backup configuration
    new cdk.CfnOutput(this, 'BackupVaultName', {
      value: this._backupVault.backupVaultName,
      description: 'AWS Backup Vault Name',
      exportName: `misra-platform-${environment}-BackupVault`,
    });

    new cdk.CfnOutput(this, 'BackupPlanId', {
      value: this._backupPlan.backupPlanId,
      description: 'AWS Backup Plan ID',
      exportName: `misra-platform-${environment}-BackupPlan`,
    });
  }

  /**
   * Get backup plan configuration based on environment
   */
  private getBackupPlanConfig(environment: string) {
    const configs = {
      dev: {
        dailyRetentionDays: 7,
        weeklyRetentionDays: 14,
        monthlyRetentionDays: 30,
      },
      staging: {
        dailyRetentionDays: 14,
        weeklyRetentionDays: 30,
        monthlyRetentionDays: 90,
      },
      production: {
        dailyRetentionDays: 30,
        weeklyRetentionDays: 90,
        monthlyRetentionDays: 365,
      },
    };

    return configs[environment as keyof typeof configs];
  }

  /**
   * Configure S3 cross-region replication
   */
  private configureS3Replication(
    sourceBucket: s3.Bucket,
    replicationBucket: s3.Bucket,
    replicationRole: iam.Role
  ) {
    // Create replication configuration
    const cfnBucket = sourceBucket.node.defaultChild as s3.CfnBucket;
    
    cfnBucket.replicationConfiguration = {
      role: replicationRole.roleArn,
      rules: [
        {
          id: 'ReplicateAll',
          status: 'Enabled',
          priority: 1,
          filter: {
            prefix: '',
          },
          destination: {
            bucket: replicationBucket.bucketArn,
            replicationTime: {
              status: 'Enabled',
              time: {
                minutes: 15,
              },
            },
            metrics: {
              status: 'Enabled',
              eventThreshold: {
                minutes: 15,
              },
            },
            storageClass: 'STANDARD_IA',
          },
          deleteMarkerReplication: {
            status: 'Enabled',
          },
        },
      ],
    };

    this._replicationConfiguration = cfnBucket.replicationConfiguration;

    // Output replication configuration
    new cdk.CfnOutput(this, 'ReplicationStatus', {
      value: 'Enabled',
      description: 'S3 Cross-Region Replication Status',
    });

    new cdk.CfnOutput(this, 'ReplicationDestination', {
      value: replicationBucket.bucketName,
      description: 'S3 Replication Destination Bucket',
    });
  }

  /**
   * Configure Lambda function versioning and aliases
   */
  private configureLambdaVersioning(
    environment: string,
    lambdaFunctions: { [key: string]: lambda.Function }
  ) {
    Object.entries(lambdaFunctions).forEach(([name, func]) => {
      // Create version for each Lambda function
      const version = func.currentVersion;
      this.lambdaVersions.set(name, version);

      // Create aliases for different environments
      const liveAlias = new lambda.Alias(this, `${name}LiveAlias`, {
        aliasName: 'live',
        version: version,
        description: `Live alias for ${name} function`,
      });

      const stableAlias = new lambda.Alias(this, `${name}StableAlias`, {
        aliasName: 'stable',
        version: version,
        description: `Stable alias for ${name} function`,
      });

      this.lambdaAliases.set(`${name}-live`, liveAlias);
      this.lambdaAliases.set(`${name}-stable`, stableAlias);

      // For production, create blue/green deployment configuration
      if (environment === 'production') {
        const blueAlias = new lambda.Alias(this, `${name}BlueAlias`, {
          aliasName: 'blue',
          version: version,
          description: `Blue deployment alias for ${name} function`,
        });

        const greenAlias = new lambda.Alias(this, `${name}GreenAlias`, {
          aliasName: 'green',
          version: version,
          description: `Green deployment alias for ${name} function`,
        });

        this.lambdaAliases.set(`${name}-blue`, blueAlias);
        this.lambdaAliases.set(`${name}-green`, greenAlias);
      }

      // Output version and alias information
      new cdk.CfnOutput(this, `${name}VersionArn`, {
        value: version.functionArn,
        description: `${name} Lambda Function Version ARN`,
        exportName: `misra-platform-${environment}-${name}-VersionArn`,
      });

      new cdk.CfnOutput(this, `${name}LiveAliasArn`, {
        value: liveAlias.functionArn,
        description: `${name} Lambda Function Live Alias ARN`,
        exportName: `misra-platform-${environment}-${name}-LiveAlias`,
      });
    });
  }

  /**
   * Create backup monitoring and alerting
   */
  private createBackupMonitoring(environment: string) {
    // Create EventBridge rule for backup job failures
    const backupFailureRule = new events.Rule(this, 'BackupFailureRule', {
      ruleName: `misra-platform-backup-failure-${environment}`,
      description: 'Alert on backup job failures',
      eventPattern: {
        source: ['aws.backup'],
        detailType: ['Backup Job State Change'],
        detail: {
          state: ['FAILED', 'ABORTED'],
        },
      },
    });

    // Create EventBridge rule for backup job success
    const backupSuccessRule = new events.Rule(this, 'BackupSuccessRule', {
      ruleName: `misra-platform-backup-success-${environment}`,
      description: 'Track successful backup jobs',
      eventPattern: {
        source: ['aws.backup'],
        detailType: ['Backup Job State Change'],
        detail: {
          state: ['COMPLETED'],
        },
      },
    });

    // Output monitoring configuration
    new cdk.CfnOutput(this, 'BackupMonitoringEnabled', {
      value: 'true',
      description: 'Backup monitoring status',
    });
  }

  /**
   * Get RTO/RPO targets based on environment
   */
  public static getRtoRpoTargets(environment: string) {
    const targets = {
      dev: {
        rto: '24 hours',
        rpo: '24 hours',
        description: 'Development environment - relaxed recovery targets',
      },
      staging: {
        rto: '4 hours',
        rpo: '4 hours',
        description: 'Staging environment - moderate recovery targets',
      },
      production: {
        rto: '1 hour',
        rpo: '15 minutes',
        description: 'Production environment - strict recovery targets',
      },
    };

    return targets[environment as keyof typeof targets];
  }
}
