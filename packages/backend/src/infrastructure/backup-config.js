"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupConfig = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const backup = __importStar(require("aws-cdk-lib/aws-backup"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const constructs_1 = require("constructs");
class BackupConfig extends constructs_1.Construct {
    backupVault;
    backupPlan;
    backupRole;
    constructor(scope, id, props) {
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
    createBackupPlan(environment) {
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
        }
        else if (environment === 'staging') {
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
        }
        else {
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
    configureDynamoDBBackups(environment, tables) {
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
    configureS3Replication(environment, filesBucket, replicationRegion) {
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
    configureLambdaVersioning(environment, lambdaFunctions) {
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
    createBackupMonitoring(environment) {
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
    createOutputs(scope, stackName) {
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
exports.BackupConfig = BackupConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwLWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhY2t1cC1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBR25DLCtEQUFpRDtBQUNqRCwrREFBaUQ7QUFDakQseURBQTJDO0FBQzNDLCtEQUFpRDtBQUVqRCwyQ0FBdUM7QUFrQnZDLE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBQ3pCLFdBQVcsQ0FBcUI7SUFDaEMsVUFBVSxDQUFvQjtJQUM5QixVQUFVLENBQVc7SUFFckMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF3QjtRQUNoRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFdkYsMENBQTBDO1FBQzFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDN0QsZUFBZSxFQUFFLCtCQUErQixXQUFXLEVBQUU7WUFDN0QsYUFBYSxFQUFFLFdBQVcsS0FBSyxZQUFZO2dCQUN6QyxDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNO2dCQUMxQixDQUFDLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQzlCLENBQUMsQ0FBQztRQUVILGlDQUFpQztRQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ2pELFFBQVEsRUFBRSw4QkFBOEIsV0FBVyxFQUFFO1lBQ3JELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQztZQUMzRCxXQUFXLEVBQUUsaUNB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UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGdCQUFnQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLGNBQWM7WUFDdEMsV0FBVyxFQUFFLHNCQUFzQjtZQUNuQyxVQUFVLEVBQUUsR0FBRyxTQUFTLGlCQUFpQjtTQUMxQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLGNBQWMsRUFBRTtZQUN2QyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxZQUFZO1lBQ25DLFdBQVcsRUFBRSxvQkFBb0I7WUFDakMsVUFBVSxFQUFFLEdBQUcsU0FBUyxlQUFlO1NBQ3hDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFO1lBQ3hDLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU87WUFDOUIsV0FBVyxFQUFFLHlCQUF5QjtZQUN0QyxVQUFVLEVBQUUsR0FBRyxTQUFTLGdCQUFnQjtTQUN6QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF0WEQsb0NBc1hDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBiYWNrdXAgZnJvbSAnYXdzLWNkay1saWIvYXdzLWJhY2t1cCc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCYWNrdXBDb25maWdQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6ICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nO1xyXG4gIHRhYmxlczoge1xyXG4gICAgdXNlcnM6IGR5bmFtb2RiLlRhYmxlO1xyXG4gICAgZmlsZU1ldGFkYXRhOiBkeW5hbW9kYi5UYWJsZTtcclxuICAgIGFuYWx5c2lzUmVzdWx0czogZHluYW1vZGIuVGFibGU7XHJcbiAgICBzYW1wbGVGaWxlczogZHluYW1vZGIuVGFibGU7XHJcbiAgICBwcm9ncmVzczogZHluYW1vZGIuVGFibGU7XHJcbiAgfTtcclxuICBmaWxlc0J1Y2tldDogczMuQnVja2V0O1xyXG4gIGxhbWJkYUZ1bmN0aW9uczoge1xyXG4gICAgW2tleTogc3RyaW5nXTogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIH07XHJcbiAgcmVwbGljYXRpb25SZWdpb24/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBCYWNrdXBDb25maWcgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBiYWNrdXBWYXVsdDogYmFja3VwLkJhY2t1cFZhdWx0O1xyXG4gIHB1YmxpYyByZWFkb25seSBiYWNrdXBQbGFuOiBiYWNrdXAuQmFja3VwUGxhbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgYmFja3VwUm9sZTogaWFtLlJvbGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBCYWNrdXBDb25maWdQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCB7IGVudmlyb25tZW50LCB0YWJsZXMsIGZpbGVzQnVja2V0LCBsYW1iZGFGdW5jdGlvbnMsIHJlcGxpY2F0aW9uUmVnaW9uIH0gPSBwcm9wcztcclxuXHJcbiAgICAvLyBDcmVhdGUgYmFja3VwIHZhdWx0IHdpdGggS01TIGVuY3J5cHRpb25cclxuICAgIHRoaXMuYmFja3VwVmF1bHQgPSBuZXcgYmFja3VwLkJhY2t1cFZhdWx0KHRoaXMsICdCYWNrdXBWYXVsdCcsIHtcclxuICAgICAgYmFja3VwVmF1bHROYW1lOiBgbWlzcmEtcGxhdGZvcm0tYmFja3VwLXZhdWx0LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSUFNIHJvbGUgZm9yIEFXUyBCYWNrdXBcclxuICAgIHRoaXMuYmFja3VwUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQmFja3VwUm9sZScsIHtcclxuICAgICAgcm9sZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1iYWNrdXAtcm9sZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdiYWNrdXAuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBBV1MgQmFja3VwIHNlcnZpY2UnLFxyXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtcclxuICAgICAgICBpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BV1NCYWNrdXBTZXJ2aWNlUm9sZVBvbGljeUZvckJhY2t1cCcpLFxyXG4gICAgICAgIGlhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FXU0JhY2t1cFNlcnZpY2VSb2xlUG9saWN5Rm9yUmVzdG9yZXMnKSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBiYWNrdXAgcGxhbiB3aXRoIGVudmlyb25tZW50LXNwZWNpZmljIHNjaGVkdWxlc1xyXG4gICAgdGhpcy5iYWNrdXBQbGFuID0gdGhpcy5jcmVhdGVCYWNrdXBQbGFuKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDb25maWd1cmUgRHluYW1vREIgYmFja3VwIHBvbGljaWVzXHJcbiAgICB0aGlzLmNvbmZpZ3VyZUR5bmFtb0RCQmFja3VwcyhlbnZpcm9ubWVudCwgdGFibGVzKTtcclxuXHJcbiAgICAvLyBDb25maWd1cmUgUzMgY3Jvc3MtcmVnaW9uIHJlcGxpY2F0aW9uXHJcbiAgICB0aGlzLmNvbmZpZ3VyZVMzUmVwbGljYXRpb24oZW52aXJvbm1lbnQsIGZpbGVzQnVja2V0LCByZXBsaWNhdGlvblJlZ2lvbik7XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIExhbWJkYSBmdW5jdGlvbiB2ZXJzaW9uaW5nXHJcbiAgICB0aGlzLmNvbmZpZ3VyZUxhbWJkYVZlcnNpb25pbmcoZW52aXJvbm1lbnQsIGxhbWJkYUZ1bmN0aW9ucyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGJhY2t1cCBtb25pdG9yaW5nIGFuZCBhbGVydHNcclxuICAgIHRoaXMuY3JlYXRlQmFja3VwTW9uaXRvcmluZyhlbnZpcm9ubWVudCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUJhY2t1cFBsYW4oZW52aXJvbm1lbnQ6IHN0cmluZyk6IGJhY2t1cC5CYWNrdXBQbGFuIHtcclxuICAgIGNvbnN0IHBsYW4gPSBuZXcgYmFja3VwLkJhY2t1cFBsYW4odGhpcywgJ0JhY2t1cFBsYW4nLCB7XHJcbiAgICAgIGJhY2t1cFBsYW5OYW1lOiBgbWlzcmEtcGxhdGZvcm0tYmFja3VwLXBsYW4tJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBiYWNrdXBWYXVsdDogdGhpcy5iYWNrdXBWYXVsdCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFByb2R1Y3Rpb246IERhaWx5IGJhY2t1cHMgd2l0aCAzMC1kYXkgcmV0ZW50aW9uXHJcbiAgICBpZiAoZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJykge1xyXG4gICAgICBwbGFuLmFkZFJ1bGUobmV3IGJhY2t1cC5CYWNrdXBQbGFuUnVsZSh7XHJcbiAgICAgICAgcnVsZU5hbWU6ICdEYWlseUJhY2t1cCcsXHJcbiAgICAgICAgc2NoZWR1bGVFeHByZXNzaW9uOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7XHJcbiAgICAgICAgICBob3VyOiAnMicsXHJcbiAgICAgICAgICBtaW51dGU6ICcwJyxcclxuICAgICAgICB9KSxcclxuICAgICAgICBkZWxldGVBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgIG1vdmVUb0NvbGRTdG9yYWdlQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICAgIHN0YXJ0V2luZG93OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgY29tcGxldGlvbldpbmRvdzogY2RrLkR1cmF0aW9uLmhvdXJzKDIpLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICAvLyBXZWVrbHkgYmFja3VwcyB3aXRoIDkwLWRheSByZXRlbnRpb25cclxuICAgICAgcGxhbi5hZGRSdWxlKG5ldyBiYWNrdXAuQmFja3VwUGxhblJ1bGUoe1xyXG4gICAgICAgIHJ1bGVOYW1lOiAnV2Vla2x5QmFja3VwJyxcclxuICAgICAgICBzY2hlZHVsZUV4cHJlc3Npb246IGV2ZW50cy5TY2hlZHVsZS5jcm9uKHtcclxuICAgICAgICAgIHdlZWtEYXk6ICdTVU4nLFxyXG4gICAgICAgICAgaG91cjogJzMnLFxyXG4gICAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZGVsZXRlQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcclxuICAgICAgICBtb3ZlVG9Db2xkU3RvcmFnZUFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygxNCksXHJcbiAgICAgICAgc3RhcnRXaW5kb3c6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICBjb21wbGV0aW9uV2luZG93OiBjZGsuRHVyYXRpb24uaG91cnMoMyksXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIC8vIE1vbnRobHkgYmFja3VwcyB3aXRoIDEteWVhciByZXRlbnRpb25cclxuICAgICAgcGxhbi5hZGRSdWxlKG5ldyBiYWNrdXAuQmFja3VwUGxhblJ1bGUoe1xyXG4gICAgICAgIHJ1bGVOYW1lOiAnTW9udGhseUJhY2t1cCcsXHJcbiAgICAgICAgc2NoZWR1bGVFeHByZXNzaW9uOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7XHJcbiAgICAgICAgICBkYXk6ICcxJyxcclxuICAgICAgICAgIGhvdXI6ICc0JyxcclxuICAgICAgICAgIG1pbnV0ZTogJzAnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGRlbGV0ZUFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLFxyXG4gICAgICAgIG1vdmVUb0NvbGRTdG9yYWdlQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICBzdGFydFdpbmRvdzogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICAgIGNvbXBsZXRpb25XaW5kb3c6IGNkay5EdXJhdGlvbi5ob3Vycyg0KSxcclxuICAgICAgfSkpO1xyXG4gICAgfSBlbHNlIGlmIChlbnZpcm9ubWVudCA9PT0gJ3N0YWdpbmcnKSB7XHJcbiAgICAgIC8vIFN0YWdpbmc6IERhaWx5IGJhY2t1cHMgd2l0aCA3LWRheSByZXRlbnRpb25cclxuICAgICAgcGxhbi5hZGRSdWxlKG5ldyBiYWNrdXAuQmFja3VwUGxhblJ1bGUoe1xyXG4gICAgICAgIHJ1bGVOYW1lOiAnRGFpbHlCYWNrdXAnLFxyXG4gICAgICAgIHNjaGVkdWxlRXhwcmVzc2lvbjogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgICAgaG91cjogJzInLFxyXG4gICAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZGVsZXRlQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICAgIHN0YXJ0V2luZG93OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgY29tcGxldGlvbldpbmRvdzogY2RrLkR1cmF0aW9uLmhvdXJzKDIpLFxyXG4gICAgICB9KSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBEZXY6IERhaWx5IGJhY2t1cHMgd2l0aCAzLWRheSByZXRlbnRpb25cclxuICAgICAgcGxhbi5hZGRSdWxlKG5ldyBiYWNrdXAuQmFja3VwUGxhblJ1bGUoe1xyXG4gICAgICAgIHJ1bGVOYW1lOiAnRGFpbHlCYWNrdXAnLFxyXG4gICAgICAgIHNjaGVkdWxlRXhwcmVzc2lvbjogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgICAgaG91cjogJzInLFxyXG4gICAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgZGVsZXRlQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDMpLFxyXG4gICAgICAgIHN0YXJ0V2luZG93OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgY29tcGxldGlvbldpbmRvdzogY2RrLkR1cmF0aW9uLmhvdXJzKDIpLFxyXG4gICAgICB9KSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBsYW47XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbmZpZ3VyZUR5bmFtb0RCQmFja3VwcyhcclxuICAgIGVudmlyb25tZW50OiBzdHJpbmcsXHJcbiAgICB0YWJsZXM6IEJhY2t1cENvbmZpZ1Byb3BzWyd0YWJsZXMnXVxyXG4gICkge1xyXG4gICAgLy8gQWRkIGFsbCBEeW5hbW9EQiB0YWJsZXMgdG8gYmFja3VwIHBsYW5cclxuICAgIE9iamVjdC5lbnRyaWVzKHRhYmxlcykuZm9yRWFjaCgoW25hbWUsIHRhYmxlXSkgPT4ge1xyXG4gICAgICAvLyBBZGQgdGFibGUgdG8gYmFja3VwIHNlbGVjdGlvblxyXG4gICAgICB0aGlzLmJhY2t1cFBsYW4uYWRkU2VsZWN0aW9uKGAke25hbWV9VGFibGVCYWNrdXBgLCB7XHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICBiYWNrdXAuQmFja3VwUmVzb3VyY2UuZnJvbUR5bmFtb0RiVGFibGUodGFibGUpLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcm9sZTogdGhpcy5iYWNrdXBSb2xlLFxyXG4gICAgICAgIGFsbG93UmVzdG9yZXM6IHRydWUsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gRW5hYmxlIHBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZm9yIHByb2R1Y3Rpb25cclxuICAgICAgaWYgKGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicpIHtcclxuICAgICAgICAvLyBOb3RlOiBQSVRSIGlzIGFscmVhZHkgZW5hYmxlZCBpbiB0YWJsZSBjcmVhdGlvblxyXG4gICAgICAgIC8vIFRoaXMgaXMganVzdCBkb2N1bWVudGF0aW9uXHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcy5iYWNrdXBQbGFuLCBgJHtuYW1lfVRhYmxlUElUUmAsIHtcclxuICAgICAgICAgIHZhbHVlOiAnZW5hYmxlZCcsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYFBvaW50LWluLXRpbWUgcmVjb3Zlcnkgc3RhdHVzIGZvciAke25hbWV9IHRhYmxlYCxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGJhY2t1cCB0YWdzIGZvciBvcmdhbml6YXRpb25cclxuICAgIGNkay5UYWdzLm9mKHRoaXMuYmFja3VwUGxhbikuYWRkKCdCYWNrdXBUeXBlJywgJ0R5bmFtb0RCJyk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmJhY2t1cFBsYW4pLmFkZCgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XHJcbiAgICBjZGsuVGFncy5vZih0aGlzLmJhY2t1cFBsYW4pLmFkZCgnTWFuYWdlZEJ5JywgJ0FXUy1CYWNrdXAnKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY29uZmlndXJlUzNSZXBsaWNhdGlvbihcclxuICAgIGVudmlyb25tZW50OiBzdHJpbmcsXHJcbiAgICBmaWxlc0J1Y2tldDogczMuQnVja2V0LFxyXG4gICAgcmVwbGljYXRpb25SZWdpb24/OiBzdHJpbmdcclxuICApIHtcclxuICAgIC8vIFMzIGNyb3NzLXJlZ2lvbiByZXBsaWNhdGlvbiBpcyBjb25maWd1cmVkIGluIHRoZSBtYWluIHN0YWNrXHJcbiAgICAvLyBUaGlzIG1ldGhvZCBhZGRzIGFkZGl0aW9uYWwgYmFja3VwIGNvbmZpZ3VyYXRpb25cclxuXHJcbiAgICAvLyBBZGQgUzMgYnVja2V0IHRvIGJhY2t1cCBwbGFuIChmb3IgdmVyc2lvbmVkIG9iamVjdHMpXHJcbiAgICB0aGlzLmJhY2t1cFBsYW4uYWRkU2VsZWN0aW9uKCdTM0J1Y2tldEJhY2t1cCcsIHtcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYmFja3VwLkJhY2t1cFJlc291cmNlLmZyb21Bcm4oZmlsZXNCdWNrZXQuYnVja2V0QXJuKSxcclxuICAgICAgXSxcclxuICAgICAgcm9sZTogdGhpcy5iYWNrdXBSb2xlLFxyXG4gICAgICBhbGxvd1Jlc3RvcmVzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IHJlcGxpY2F0aW9uIGNvbmZpZ3VyYXRpb24gaW5zdHJ1Y3Rpb25zXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUzNSZXBsaWNhdGlvbkluc3RydWN0aW9ucycsIHtcclxuICAgICAgdmFsdWU6IFtcclxuICAgICAgICAnUzMgQ3Jvc3MtUmVnaW9uIFJlcGxpY2F0aW9uIENvbmZpZ3VyYXRpb246JyxcclxuICAgICAgICAnMS4gUmVwbGljYXRpb24gYnVja2V0IGNyZWF0ZWQgaW4gYWx0ZXJuYXRlIHJlZ2lvbicsXHJcbiAgICAgICAgJzIuIFZlcnNpb25pbmcgZW5hYmxlZCBvbiBib3RoIHNvdXJjZSBhbmQgZGVzdGluYXRpb24nLFxyXG4gICAgICAgICczLiBSZXBsaWNhdGlvbiByb2xlIHdpdGggbmVjZXNzYXJ5IHBlcm1pc3Npb25zIGNyZWF0ZWQnLFxyXG4gICAgICAgICc0LiBDb25maWd1cmUgcmVwbGljYXRpb24gcnVsZXMgdmlhIEFXUyBDb25zb2xlIG9yIENMSTonLFxyXG4gICAgICAgIGAgICBhd3MgczNhcGkgcHV0LWJ1Y2tldC1yZXBsaWNhdGlvbiAtLWJ1Y2tldCAke2ZpbGVzQnVja2V0LmJ1Y2tldE5hbWV9IC0tcmVwbGljYXRpb24tY29uZmlndXJhdGlvbiBmaWxlOi8vcmVwbGljYXRpb24tY29uZmlnLmpzb25gLFxyXG4gICAgICAgICc1LiBNb25pdG9yIHJlcGxpY2F0aW9uIG1ldHJpY3MgaW4gQ2xvdWRXYXRjaCcsXHJcbiAgICAgIF0uam9pbignIHwgJyksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSW5zdHJ1Y3Rpb25zIGZvciBjb21wbGV0aW5nIFMzIGNyb3NzLXJlZ2lvbiByZXBsaWNhdGlvbiBzZXR1cCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgcmVwbGljYXRpb24gY29uZmlndXJhdGlvbiB0ZW1wbGF0ZVxyXG4gICAgY29uc3QgcmVwbGljYXRpb25Db25maWcgPSB7XHJcbiAgICAgIFJvbGU6ICdSRVBMSUNBVElPTl9ST0xFX0FSTicsXHJcbiAgICAgIFJ1bGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgSWQ6ICdSZXBsaWNhdGVBbGwnLFxyXG4gICAgICAgICAgUHJpb3JpdHk6IDEsXHJcbiAgICAgICAgICBGaWx0ZXI6IHtcclxuICAgICAgICAgICAgUHJlZml4OiAnJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBTdGF0dXM6ICdFbmFibGVkJyxcclxuICAgICAgICAgIERlc3RpbmF0aW9uOiB7XHJcbiAgICAgICAgICAgIEJ1Y2tldDogJ1JFUExJQ0FUSU9OX0JVQ0tFVF9BUk4nLFxyXG4gICAgICAgICAgICBSZXBsaWNhdGlvblRpbWU6IHtcclxuICAgICAgICAgICAgICBTdGF0dXM6ICdFbmFibGVkJyxcclxuICAgICAgICAgICAgICBUaW1lOiB7XHJcbiAgICAgICAgICAgICAgICBNaW51dGVzOiAxNSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBNZXRyaWNzOiB7XHJcbiAgICAgICAgICAgICAgU3RhdHVzOiAnRW5hYmxlZCcsXHJcbiAgICAgICAgICAgICAgRXZlbnRUaHJlc2hvbGQ6IHtcclxuICAgICAgICAgICAgICAgIE1pbnV0ZXM6IDE1LFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIFN0b3JhZ2VDbGFzczogJ1NUQU5EQVJEX0lBJyxcclxuICAgICAgICAgICAgRW5jcnlwdGlvbkNvbmZpZ3VyYXRpb246IHtcclxuICAgICAgICAgICAgICBSZXBsaWNhS21zS2V5SUQ6ICdSRVBMSUNBX0tNU19LRVlfQVJOJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBEZWxldGVNYXJrZXJSZXBsaWNhdGlvbjoge1xyXG4gICAgICAgICAgICBTdGF0dXM6ICdFbmFibGVkJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgIH07XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1MzUmVwbGljYXRpb25Db25maWdUZW1wbGF0ZScsIHtcclxuICAgICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KHJlcGxpY2F0aW9uQ29uZmlnLCBudWxsLCAyKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyByZXBsaWNhdGlvbiBjb25maWd1cmF0aW9uIHRlbXBsYXRlJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb25maWd1cmVMYW1iZGFWZXJzaW9uaW5nKFxyXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcclxuICAgIGxhbWJkYUZ1bmN0aW9uczogeyBba2V5OiBzdHJpbmddOiBsYW1iZGEuRnVuY3Rpb24gfVxyXG4gICkge1xyXG4gICAgLy8gQ3JlYXRlIHZlcnNpb25zIGFuZCBhbGlhc2VzIGZvciBhbGwgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAgT2JqZWN0LmVudHJpZXMobGFtYmRhRnVuY3Rpb25zKS5mb3JFYWNoKChbbmFtZSwgZnVuY10pID0+IHtcclxuICAgICAgLy8gQ3JlYXRlIHZlcnNpb25cclxuICAgICAgY29uc3QgdmVyc2lvbiA9IGZ1bmMuY3VycmVudFZlcnNpb247XHJcblxyXG4gICAgICAvLyBDcmVhdGUgYWxpYXMgZm9yIHByb2R1Y3Rpb24gdHJhZmZpY1xyXG4gICAgICBjb25zdCBhbGlhcyA9IG5ldyBsYW1iZGEuQWxpYXModGhpcywgYCR7bmFtZX1BbGlhc2AsIHtcclxuICAgICAgICBhbGlhc05hbWU6IGVudmlyb25tZW50LFxyXG4gICAgICAgIHZlcnNpb246IHZlcnNpb24sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGAke2Vudmlyb25tZW50fSBhbGlhcyBmb3IgJHtuYW1lfSBmdW5jdGlvbmAsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gRm9yIHByb2R1Y3Rpb24sIGNyZWF0ZSBhZGRpdGlvbmFsIGFsaWFzZXMgZm9yIGJsdWUvZ3JlZW4gZGVwbG95bWVudFxyXG4gICAgICBpZiAoZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJykge1xyXG4gICAgICAgIC8vIENyZWF0ZSAnbGl2ZScgYWxpYXMgZm9yIGN1cnJlbnQgcHJvZHVjdGlvbiB2ZXJzaW9uXHJcbiAgICAgICAgY29uc3QgbGl2ZUFsaWFzID0gbmV3IGxhbWJkYS5BbGlhcyh0aGlzLCBgJHtuYW1lfUxpdmVBbGlhc2AsIHtcclxuICAgICAgICAgIGFsaWFzTmFtZTogJ2xpdmUnLFxyXG4gICAgICAgICAgdmVyc2lvbjogdmVyc2lvbixcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgTGl2ZSBwcm9kdWN0aW9uIGFsaWFzIGZvciAke25hbWV9IGZ1bmN0aW9uYCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlICdjYW5hcnknIGFsaWFzIGZvciB0ZXN0aW5nIG5ldyB2ZXJzaW9uc1xyXG4gICAgICAgIGNvbnN0IGNhbmFyeUFsaWFzID0gbmV3IGxhbWJkYS5BbGlhcyh0aGlzLCBgJHtuYW1lfUNhbmFyeUFsaWFzYCwge1xyXG4gICAgICAgICAgYWxpYXNOYW1lOiAnY2FuYXJ5JyxcclxuICAgICAgICAgIHZlcnNpb246IHZlcnNpb24sXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYENhbmFyeSB0ZXN0aW5nIGFsaWFzIGZvciAke25hbWV9IGZ1bmN0aW9uYCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gT3V0cHV0IGFsaWFzIEFSTnNcclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBgJHtuYW1lfUxpdmVBbGlhc0FybmAsIHtcclxuICAgICAgICAgIHZhbHVlOiBsaXZlQWxpYXMuZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYExpdmUgYWxpYXMgQVJOIGZvciAke25hbWV9IGZ1bmN0aW9uYCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYCR7bmFtZX1DYW5hcnlBbGlhc0FybmAsIHtcclxuICAgICAgICAgIHZhbHVlOiBjYW5hcnlBbGlhcy5mdW5jdGlvbkFybixcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgQ2FuYXJ5IGFsaWFzIEFSTiBmb3IgJHtuYW1lfSBmdW5jdGlvbmAsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIE91dHB1dCB2ZXJzaW9uIGFuZCBhbGlhcyBpbmZvcm1hdGlvblxyXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBgJHtuYW1lfVZlcnNpb25Bcm5gLCB7XHJcbiAgICAgICAgdmFsdWU6IHZlcnNpb24uZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBDdXJyZW50IHZlcnNpb24gQVJOIGZvciAke25hbWV9IGZ1bmN0aW9uYCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBgJHtuYW1lfUFsaWFzQXJuYCwge1xyXG4gICAgICAgIHZhbHVlOiBhbGlhcy5mdW5jdGlvbkFybixcclxuICAgICAgICBkZXNjcmlwdGlvbjogYCR7ZW52aXJvbm1lbnR9IGFsaWFzIEFSTiBmb3IgJHtuYW1lfSBmdW5jdGlvbmAsXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIExhbWJkYSB2ZXJzaW9uaW5nIHN0cmF0ZWd5IGRvY3VtZW50YXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMYW1iZGFWZXJzaW9uaW5nU3RyYXRlZ3knLCB7XHJcbiAgICAgIHZhbHVlOiBbXHJcbiAgICAgICAgJ0xhbWJkYSBWZXJzaW9uaW5nIFN0cmF0ZWd5OicsXHJcbiAgICAgICAgJzEuIEVhY2ggZGVwbG95bWVudCBjcmVhdGVzIGEgbmV3IGltbXV0YWJsZSB2ZXJzaW9uJyxcclxuICAgICAgICAnMi4gQWxpYXNlcyBwb2ludCB0byBzcGVjaWZpYyB2ZXJzaW9ucyBmb3IgdHJhZmZpYyByb3V0aW5nJyxcclxuICAgICAgICAnMy4gUHJvZHVjdGlvbiB1c2VzIGxpdmUvY2FuYXJ5IGFsaWFzZXMgZm9yIGJsdWUvZ3JlZW4gZGVwbG95bWVudCcsXHJcbiAgICAgICAgJzQuIFJvbGxiYWNrOiBVcGRhdGUgYWxpYXMgdG8gcG9pbnQgdG8gcHJldmlvdXMgdmVyc2lvbicsXHJcbiAgICAgICAgJzUuIFZlcnNpb24gcmV0ZW50aW9uOiBLZWVwIGxhc3QgMTAgdmVyc2lvbnMgZm9yIHJvbGxiYWNrJyxcclxuICAgICAgICAnNi4gVXNlIEFXUyBMYW1iZGEgdmVyc2lvbiBsaWZlY3ljbGUgcG9saWNpZXMgZm9yIGNsZWFudXAnLFxyXG4gICAgICBdLmpvaW4oJyB8ICcpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBmdW5jdGlvbiB2ZXJzaW9uaW5nIGFuZCByb2xsYmFjayBzdHJhdGVneScsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQmFja3VwTW9uaXRvcmluZyhlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICAvLyBDcmVhdGUgRXZlbnRCcmlkZ2UgcnVsZSBmb3IgYmFja3VwIGpvYiBmYWlsdXJlc1xyXG4gICAgY29uc3QgYmFja3VwRmFpbHVyZVJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0JhY2t1cEZhaWx1cmVSdWxlJywge1xyXG4gICAgICBydWxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLWJhY2t1cC1mYWlsdXJlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBbGVydCBvbiBiYWNrdXAgam9iIGZhaWx1cmVzJyxcclxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgc291cmNlOiBbJ2F3cy5iYWNrdXAnXSxcclxuICAgICAgICBkZXRhaWxUeXBlOiBbJ0JhY2t1cCBKb2IgU3RhdGUgQ2hhbmdlJ10sXHJcbiAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICBzdGF0ZTogWydGQUlMRUQnLCAnQUJPUlRFRCddLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgRXZlbnRCcmlkZ2UgcnVsZSBmb3IgYmFja3VwIGpvYiBzdWNjZXNzXHJcbiAgICBjb25zdCBiYWNrdXBTdWNjZXNzUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnQmFja3VwU3VjY2Vzc1J1bGUnLCB7XHJcbiAgICAgIHJ1bGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYmFja3VwLXN1Y2Nlc3MtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0xvZyBzdWNjZXNzZnVsIGJhY2t1cCBqb2JzJyxcclxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgc291cmNlOiBbJ2F3cy5iYWNrdXAnXSxcclxuICAgICAgICBkZXRhaWxUeXBlOiBbJ0JhY2t1cCBKb2IgU3RhdGUgQ2hhbmdlJ10sXHJcbiAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICBzdGF0ZTogWydDT01QTEVURUQnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IG1vbml0b3JpbmcgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2t1cE1vbml0b3JpbmdSdWxlcycsIHtcclxuICAgICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBmYWlsdXJlUnVsZTogYmFja3VwRmFpbHVyZVJ1bGUucnVsZU5hbWUsXHJcbiAgICAgICAgc3VjY2Vzc1J1bGU6IGJhY2t1cFN1Y2Nlc3NSdWxlLnJ1bGVOYW1lLFxyXG4gICAgICB9KSxcclxuICAgICAgZGVzY3JpcHRpb246ICdFdmVudEJyaWRnZSBydWxlcyBmb3IgYmFja3VwIG1vbml0b3JpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGJhY2t1cCBtZXRyaWNzIGRvY3VtZW50YXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCYWNrdXBNZXRyaWNzJywge1xyXG4gICAgICB2YWx1ZTogW1xyXG4gICAgICAgICdCYWNrdXAgTW9uaXRvcmluZyBNZXRyaWNzOicsXHJcbiAgICAgICAgJzEuIEJhY2t1cCBqb2Igc3VjY2Vzcy9mYWlsdXJlIHJhdGUnLFxyXG4gICAgICAgICcyLiBCYWNrdXAgY29tcGxldGlvbiB0aW1lJyxcclxuICAgICAgICAnMy4gQmFja3VwIHN0b3JhZ2Ugc2l6ZScsXHJcbiAgICAgICAgJzQuIFJlY292ZXJ5IHBvaW50IGFnZScsXHJcbiAgICAgICAgJzUuIFJlc3RvcmUgdGVzdCBzdWNjZXNzIHJhdGUnLFxyXG4gICAgICAgICdWaWV3IGluIENsb3VkV2F0Y2g6IEFXUy9CYWNrdXAgbmFtZXNwYWNlJyxcclxuICAgICAgXS5qb2luKCcgfCAnKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdBdmFpbGFibGUgYmFja3VwIG1vbml0b3JpbmcgbWV0cmljcycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBjcmVhdGVPdXRwdXRzKHNjb3BlOiBDb25zdHJ1Y3QsIHN0YWNrTmFtZTogc3RyaW5nKSB7XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dChzY29wZSwgJ0JhY2t1cFZhdWx0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYmFja3VwVmF1bHQuYmFja3VwVmF1bHROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FXUyBCYWNrdXAgVmF1bHQgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3N0YWNrTmFtZX0tQmFja3VwVmF1bHRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQoc2NvcGUsICdCYWNrdXBWYXVsdEFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYmFja3VwVmF1bHQuYmFja3VwVmF1bHRBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVdTIEJhY2t1cCBWYXVsdCBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtzdGFja05hbWV9LUJhY2t1cFZhdWx0QXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHNjb3BlLCAnQmFja3VwUGxhbklkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5iYWNrdXBQbGFuLmJhY2t1cFBsYW5JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBV1MgQmFja3VwIFBsYW4gSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHtzdGFja05hbWV9LUJhY2t1cFBsYW5JZGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dChzY29wZSwgJ0JhY2t1cFJvbGVBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmJhY2t1cFJvbGUucm9sZUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdBV1MgQmFja3VwIElBTSBSb2xlIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3N0YWNrTmFtZX0tQmFja3VwUm9sZUFybmAsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19