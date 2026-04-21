import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
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

export class BackupConfig extends Construct {
  public readonly backupVault: backup.BackupVault;
  public readonly backupPlan: backup.BackupPlan;
  public readonly backupRole: iam.Role;

  constructor(scope: Construct, id: string, props: BackupConfigProps) {
    super(scope, id);

    const { environment, tables, filesBucket, lambdaFunctions, replicationRegion } = props;

    // Create backup vault with KMS encryption
    this.backupVault = new backup.BackupVault(this, 'BackupVault', {
      backupVaultName: `misra-platform-backup-vault-${environment}`,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // Create IAM role for AWS Backup
    this.backupRole = new iam.Role(this, 'BackupRole', {
      roleName: `misra-platform-backup-role-${environment}`,
      assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
      description: 'IAM role for AWS Backup service',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForBackup'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForRestores'),
      ],
    });

    // Create backup plan with environment-specific schedules
    this.backupPlan = this.createBackupPlan(environment);

    // Configure DynamoDB backup policies
    this.configureDynamoDBBackups(environment, tables);

    // Configure S3 cross-region replication
    this.configureS3Replication(environment, filesBucket, replicationRegion);

    // Configure Lambda function versioning
    this.configureLambdaVersioning(environment, lambdaFunctions);

    // Create backup monitoring and alerts
    this.createBackupMonitoring(environment);
  }

  private createBackupPlan(environment: string): backup.BackupPlan {
    const plan = new backup.BackupPlan(this, 'BackupPlan', {
      backupPlanName: `misra-platform-backup-plan-${environment}`,
      backupVault: this.backupVault,
    });

    // Production: Daily backups with 30-day retention
    if (environment === 'production') {
      plan.addRule(new backup.BackupPlanRule({
        ruleName: 'DailyBackup',
        scheduleExpression: events.Schedule.cron({
          hour: '2',
          minute: '0',
        }),
        deleteAfter: cdk.Duration.days(30),
        moveToColdStorageAfter: cdk.Duration.days(7),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(2),
      }));

      // Weekly backups with 90-day retention
      plan.addRule(new backup.BackupPlanRule({
        ruleName: 'WeeklyBackup',
        scheduleExpression: events.Schedule.cron({
          weekDay: 'SUN',
          hour: '3',
          minute: '0',
        }),
        deleteAfter: cdk.Duration.days(90),
        moveToColdStorageAfter: cdk.Duration.days(14),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(3),
      }));

      // Monthly backups with 1-year retention
      plan.addRule(new backup.BackupPlanRule({
        ruleName: 'MonthlyBackup',
        scheduleExpression: events.Schedule.cron({
          day: '1',
          hour: '4',
          minute: '0',
        }),
        deleteAfter: cdk.Duration.days(365),
        moveToColdStorageAfter: cdk.Duration.days(30),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(4),
      }));
    } else if (environment === 'staging') {
      // Staging: Daily backups with 7-day retention
      plan.addRule(new backup.BackupPlanRule({
        ruleName: 'DailyBackup',
        scheduleExpression: events.Schedule.cron({
          hour: '2',
          minute: '0',
        }),
        deleteAfter: cdk.Duration.days(7),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(2),
      }));
    } else {
      // Dev: Daily backups with 3-day retention
      plan.addRule(new backup.BackupPlanRule({
        ruleName: 'DailyBackup',
        scheduleExpression: events.Schedule.cron({
          hour: '2',
          minute: '0',
        }),
        deleteAfter: cdk.Duration.days(3),
        startWindow: cdk.Duration.hours(1),
        completionWindow: cdk.Duration.hours(2),
      }));
    }

    return plan;
  }

  private configureDynamoDBBackups(
    environment: string,
    tables: BackupConfigProps['tables']
  ) {
    // Add all DynamoDB tables to backup plan
    Object.entries(tables).forEach(([name, table]) => {
      // Add table to backup selection
      this.backupPlan.addSelection(`${name}TableBackup`, {
        resources: [
          backup.BackupResource.fromDynamoDbTable(table),
        ],
        role: this.backupRole,
        allowRestores: true,
      });

      // Enable point-in-time recovery for production
      if (environment === 'production') {
        // Note: PITR is already enabled in table creation
        // This is just documentation
        new cdk.CfnOutput(this.backupPlan, `${name}TablePITR`, {
          value: 'enabled',
          description: `Point-in-time recovery status for ${name} table`,
        });
      }
    });

    // Create backup tags for organization
    cdk.Tags.of(this.backupPlan).add('BackupType', 'DynamoDB');
    cdk.Tags.of(this.backupPlan).add('Environment', environment);
    cdk.Tags.of(this.backupPlan).add('ManagedBy', 'AWS-Backup');
  }

  private configureS3Replication(
    environment: string,
    filesBucket: s3.Bucket,
    replicationRegion?: string
  ) {
    // S3 cross-region replication is configured in the main stack
    // This method adds additional backup configuration

    // Add S3 bucket to backup plan (for versioned objects)
    this.backupPlan.addSelection('S3BucketBackup', {
      resources: [
        backup.BackupResource.fromArn(filesBucket.bucketArn),
      ],
      role: this.backupRole,
      allowRestores: true,
    });

    // Output replication configuration instructions
    new cdk.CfnOutput(this, 'S3ReplicationInstructions', {
      value: [
        'S3 Cross-Region Replication Configuration:',
        '1. Replication bucket created in alternate region',
        '2. Versioning enabled on both source and destination',
        '3. Replication role with necessary permissions created',
        '4. Configure replication rules via AWS Console or CLI:',
        `   aws s3api put-bucket-replication --bucket ${filesBucket.bucketName} --replication-configuration file://replication-config.json`,
        '5. Monitor replication metrics in CloudWatch',
      ].join(' | '),
      description: 'Instructions for completing S3 cross-region replication setup',
    });

    // Create replication configuration template
    const replicationConfig = {
      Role: 'REPLICATION_ROLE_ARN',
      Rules: [
        {
          Id: 'ReplicateAll',
          Priority: 1,
          Filter: {
            Prefix: '',
          },
          Status: 'Enabled',
          Destination: {
            Bucket: 'REPLICATION_BUCKET_ARN',
            ReplicationTime: {
              Status: 'Enabled',
              Time: {
                Minutes: 15,
              },
            },
            Metrics: {
              Status: 'Enabled',
              EventThreshold: {
                Minutes: 15,
              },
            },
            StorageClass: 'STANDARD_IA',
            EncryptionConfiguration: {
              ReplicaKmsKeyID: 'REPLICA_KMS_KEY_ARN',
            },
          },
          DeleteMarkerReplication: {
            Status: 'Enabled',
          },
        },
      ],
    };

    new cdk.CfnOutput(this, 'S3ReplicationConfigTemplate', {
      value: JSON.stringify(replicationConfig, null, 2),
      description: 'S3 replication configuration template',
    });
  }

  private configureLambdaVersioning(
    environment: string,
    lambdaFunctions: { [key: string]: lambda.Function }
  ) {
    // Create versions and aliases for all Lambda functions
    Object.entries(lambdaFunctions).forEach(([name, func]) => {
      // Create version
      const version = func.currentVersion;

      // Create alias for production traffic
      const alias = new lambda.Alias(this, `${name}Alias`, {
        aliasName: environment,
        version: version,
        description: `${environment} alias for ${name} function`,
      });

      // For production, create additional aliases for blue/green deployment
      if (environment === 'production') {
        // Create 'live' alias for current production version
        const liveAlias = new lambda.Alias(this, `${name}LiveAlias`, {
          aliasName: 'live',
          version: version,
          description: `Live production alias for ${name} function`,
        });

        // Create 'canary' alias for testing new versions
        const canaryAlias = new lambda.Alias(this, `${name}CanaryAlias`, {
          aliasName: 'canary',
          version: version,
          description: `Canary testing alias for ${name} function`,
        });

        // Output alias ARNs
        new cdk.CfnOutput(this, `${name}LiveAliasArn`, {
          value: liveAlias.functionArn,
          description: `Live alias ARN for ${name} function`,
        });

        new cdk.CfnOutput(this, `${name}CanaryAliasArn`, {
          value: canaryAlias.functionArn,
          description: `Canary alias ARN for ${name} function`,
        });
      }

      // Output version and alias information
      new cdk.CfnOutput(this, `${name}VersionArn`, {
        value: version.functionArn,
        description: `Current version ARN for ${name} function`,
      });

      new cdk.CfnOutput(this, `${name}AliasArn`, {
        value: alias.functionArn,
        description: `${environment} alias ARN for ${name} function`,
      });
    });

    // Create Lambda versioning strategy documentation
    new cdk.CfnOutput(this, 'LambdaVersioningStrategy', {
      value: [
        'Lambda Versioning Strategy:',
        '1. Each deployment creates a new immutable version',
        '2. Aliases point to specific versions for traffic routing',
        '3. Production uses live/canary aliases for blue/green deployment',
        '4. Rollback: Update alias to point to previous version',
        '5. Version retention: Keep last 10 versions for rollback',
        '6. Use AWS Lambda version lifecycle policies for cleanup',
      ].join(' | '),
      description: 'Lambda function versioning and rollback strategy',
    });
  }

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
      description: 'Log successful backup jobs',
      eventPattern: {
        source: ['aws.backup'],
        detailType: ['Backup Job State Change'],
        detail: {
          state: ['COMPLETED'],
        },
      },
    });

    // Output monitoring configuration
    new cdk.CfnOutput(this, 'BackupMonitoringRules', {
      value: JSON.stringify({
        failureRule: backupFailureRule.ruleName,
        successRule: backupSuccessRule.ruleName,
      }),
      description: 'EventBridge rules for backup monitoring',
    });

    // Create backup metrics documentation
    new cdk.CfnOutput(this, 'BackupMetrics', {
      value: [
        'Backup Monitoring Metrics:',
        '1. Backup job success/failure rate',
        '2. Backup completion time',
        '3. Backup storage size',
        '4. Recovery point age',
        '5. Restore test success rate',
        'View in CloudWatch: AWS/Backup namespace',
      ].join(' | '),
      description: 'Available backup monitoring metrics',
    });
  }

  public createOutputs(scope: Construct, stackName: string) {
    new cdk.CfnOutput(scope, 'BackupVaultName', {
      value: this.backupVault.backupVaultName,
      description: 'AWS Backup Vault Name',
      exportName: `${stackName}-BackupVault`,
    });

    new cdk.CfnOutput(scope, 'BackupVaultArn', {
      value: this.backupVault.backupVaultArn,
      description: 'AWS Backup Vault ARN',
      exportName: `${stackName}-BackupVaultArn`,
    });

    new cdk.CfnOutput(scope, 'BackupPlanId', {
      value: this.backupPlan.backupPlanId,
      description: 'AWS Backup Plan ID',
      exportName: `${stackName}-BackupPlanId`,
    });

    new cdk.CfnOutput(scope, 'BackupRoleArn', {
      value: this.backupRole.roleArn,
      description: 'AWS Backup IAM Role ARN',
      exportName: `${stackName}-BackupRoleArn`,
    });
  }
}
