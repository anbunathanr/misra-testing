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
exports.BackupRecoveryConfig = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const backup = __importStar(require("aws-cdk-lib/aws-backup"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const constructs_1 = require("constructs");
/**
 * Backup and Recovery Configuration for MISRA Platform
 *
 * Implements comprehensive backup strategies including:
 * - DynamoDB automated backups with retention policies
 * - S3 cross-region replication for disaster recovery
 * - Lambda function versioning and aliases
 * - Automated backup monitoring and alerting
 */
class BackupRecoveryConfig extends constructs_1.Construct {
    _backupVault;
    _backupPlan;
    _replicationConfiguration;
    lambdaVersions;
    lambdaAliases;
    get backupVault() {
        return this._backupVault;
    }
    get backupPlan() {
        return this._backupPlan;
    }
    get replicationConfiguration() {
        return this._replicationConfiguration;
    }
    constructor(scope, id, props) {
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
    configureDynamoDBBackups(environment, tables) {
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
    getBackupPlanConfig(environment) {
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
        return configs[environment];
    }
    /**
     * Configure S3 cross-region replication
     */
    configureS3Replication(sourceBucket, replicationBucket, replicationRole) {
        // Create replication configuration
        const cfnBucket = sourceBucket.node.defaultChild;
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
    configureLambdaVersioning(environment, lambdaFunctions) {
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
    static getRtoRpoTargets(environment) {
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
        return targets[environment];
    }
}
exports.BackupRecoveryConfig = BackupRecoveryConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwLXJlY292ZXJ5LWNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhY2t1cC1yZWNvdmVyeS1jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBR25DLCtEQUFpRDtBQUVqRCwrREFBaUQ7QUFDakQsK0RBQWlEO0FBRWpELDJDQUF1QztBQW1CdkM7Ozs7Ozs7O0dBUUc7QUFDSCxNQUFhLG9CQUFxQixTQUFRLHNCQUFTO0lBQ3pDLFlBQVksQ0FBcUI7SUFDakMsV0FBVyxDQUFvQjtJQUMvQix5QkFBeUIsQ0FBTTtJQUN2QixjQUFjLENBQThCO0lBQzVDLGFBQWEsQ0FBNEI7SUFFekQsSUFBVyxXQUFXO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQztJQUMzQixDQUFDO0lBRUQsSUFBVyxVQUFVO1FBQ25CLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQztJQUMxQixDQUFDO0lBRUQsSUFBVyx3QkFBd0I7UUFDakMsT0FBTyxJQUFJLENBQUMseUJBQXlCLENBQUM7SUFDeEMsQ0FBQztJQUVELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsaUJBQWlCLEVBQUUsZUFBZSxFQUFFLGVBQWUsRUFBRSxHQUFHLEtBQUssQ0FBQztRQUV4Ryx5QkFBeUI7UUFDekIsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUUvQix3Q0FBd0M7UUFDeEMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVuRCwyQ0FBMkM7UUFDM0MsSUFB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O29CQUNOLEtBQUssRUFBRSxDQUFDLFdBQVcsQ0FBQztpQkFDckI7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxNQUFNO1lBQ2IsV0FBVyxFQUFFLDBCQUEwQjtTQUN4QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsV0FBbUI7UUFDaEQsTUFBTSxPQUFPLEdBQUc7WUFDZCxHQUFHLEVBQUU7Z0JBQ0gsR0FBRyxFQUFFLFVBQVU7Z0JBQ2YsR0FBRyxFQUFFLFVBQVU7Z0JBQ2YsV0FBVyxFQUFFLG9EQUFvRDthQUNsRTtZQUNELE9BQU8sRUFBRTtnQkFDUCxHQUFHLEVBQUUsU0FBUztnQkFDZCxHQUFHLEVBQUUsU0FBUztnQkFDZCxXQUFXLEVBQUUsaURBQWlEO2FBQy9EO1lBQ0QsVUFBVSxFQUFFO2dCQUNWLEdBQUcsRUFBRSxRQUFRO2dCQUNiLEdBQUcsRUFBRSxZQUFZO2dCQUNqQixXQUFXLEVBQUUsa0RBQWtEO2FBQ2hFO1NBQ0YsQ0FBQztRQUVGLE9BQU8sT0FBTyxDQUFDLFdBQW1DLENBQUMsQ0FBQztJQUN0RCxDQUFDO0NBQ0Y7QUFwVkQsb0RBb1ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGJhY2t1cCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYmFja3VwJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCYWNrdXBSZWNvdmVyeUNvbmZpZ1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogJ2RldicgfCAnc3RhZ2luZycgfCAncHJvZHVjdGlvbic7XHJcbiAgdGFibGVzOiB7XHJcbiAgICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICAgIHNhbXBsZUZpbGVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gICAgcHJvZ3Jlc3NUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgfTtcclxuICBmaWxlc0J1Y2tldDogczMuQnVja2V0O1xyXG4gIHJlcGxpY2F0aW9uQnVja2V0PzogczMuQnVja2V0O1xyXG4gIHJlcGxpY2F0aW9uUm9sZT86IGlhbS5Sb2xlO1xyXG4gIGxhbWJkYUZ1bmN0aW9uczoge1xyXG4gICAgW2tleTogc3RyaW5nXTogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCYWNrdXAgYW5kIFJlY292ZXJ5IENvbmZpZ3VyYXRpb24gZm9yIE1JU1JBIFBsYXRmb3JtXHJcbiAqIFxyXG4gKiBJbXBsZW1lbnRzIGNvbXByZWhlbnNpdmUgYmFja3VwIHN0cmF0ZWdpZXMgaW5jbHVkaW5nOlxyXG4gKiAtIER5bmFtb0RCIGF1dG9tYXRlZCBiYWNrdXBzIHdpdGggcmV0ZW50aW9uIHBvbGljaWVzXHJcbiAqIC0gUzMgY3Jvc3MtcmVnaW9uIHJlcGxpY2F0aW9uIGZvciBkaXNhc3RlciByZWNvdmVyeVxyXG4gKiAtIExhbWJkYSBmdW5jdGlvbiB2ZXJzaW9uaW5nIGFuZCBhbGlhc2VzXHJcbiAqIC0gQXV0b21hdGVkIGJhY2t1cCBtb25pdG9yaW5nIGFuZCBhbGVydGluZ1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEJhY2t1cFJlY292ZXJ5Q29uZmlnIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwcml2YXRlIF9iYWNrdXBWYXVsdDogYmFja3VwLkJhY2t1cFZhdWx0O1xyXG4gIHByaXZhdGUgX2JhY2t1cFBsYW46IGJhY2t1cC5CYWNrdXBQbGFuO1xyXG4gIHByaXZhdGUgX3JlcGxpY2F0aW9uQ29uZmlndXJhdGlvbjogYW55O1xyXG4gIHB1YmxpYyByZWFkb25seSBsYW1iZGFWZXJzaW9uczogTWFwPHN0cmluZywgbGFtYmRhLlZlcnNpb24+O1xyXG4gIHB1YmxpYyByZWFkb25seSBsYW1iZGFBbGlhc2VzOiBNYXA8c3RyaW5nLCBsYW1iZGEuQWxpYXM+O1xyXG5cclxuICBwdWJsaWMgZ2V0IGJhY2t1cFZhdWx0KCk6IGJhY2t1cC5CYWNrdXBWYXVsdCB7XHJcbiAgICByZXR1cm4gdGhpcy5fYmFja3VwVmF1bHQ7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0IGJhY2t1cFBsYW4oKTogYmFja3VwLkJhY2t1cFBsYW4ge1xyXG4gICAgcmV0dXJuIHRoaXMuX2JhY2t1cFBsYW47XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ2V0IHJlcGxpY2F0aW9uQ29uZmlndXJhdGlvbigpOiBhbnkge1xyXG4gICAgcmV0dXJuIHRoaXMuX3JlcGxpY2F0aW9uQ29uZmlndXJhdGlvbjtcclxuICB9XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBCYWNrdXBSZWNvdmVyeUNvbmZpZ1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IHsgZW52aXJvbm1lbnQsIHRhYmxlcywgZmlsZXNCdWNrZXQsIHJlcGxpY2F0aW9uQnVja2V0LCByZXBsaWNhdGlvblJvbGUsIGxhbWJkYUZ1bmN0aW9ucyB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBjb2xsZWN0aW9uc1xyXG4gICAgdGhpcy5sYW1iZGFWZXJzaW9ucyA9IG5ldyBNYXAoKTtcclxuICAgIHRoaXMubGFtYmRhQWxpYXNlcyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAvLyAxLiBDb25maWd1cmUgRHluYW1vREIgQmFja3VwIFBvbGljaWVzXHJcbiAgICB0aGlzLmNvbmZpZ3VyZUR5bmFtb0RCQmFja3VwcyhlbnZpcm9ubWVudCwgdGFibGVzKTtcclxuXHJcbiAgICAvLyAyLiBDb25maWd1cmUgUzMgQ3Jvc3MtUmVnaW9uIFJlcGxpY2F0aW9uXHJcbiAgICBpZiAoZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyAmJiByZXBsaWNhdGlvbkJ1Y2tldCAmJiByZXBsaWNhdGlvblJvbGUpIHtcclxuICAgICAgdGhpcy5jb25maWd1cmVTM1JlcGxpY2F0aW9uKGZpbGVzQnVja2V0LCByZXBsaWNhdGlvbkJ1Y2tldCwgcmVwbGljYXRpb25Sb2xlKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyAzLiBDb25maWd1cmUgTGFtYmRhIEZ1bmN0aW9uIFZlcnNpb25pbmdcclxuICAgIHRoaXMuY29uZmlndXJlTGFtYmRhVmVyc2lvbmluZyhlbnZpcm9ubWVudCwgbGFtYmRhRnVuY3Rpb25zKTtcclxuXHJcbiAgICAvLyA0LiBDcmVhdGUgYmFja3VwIG1vbml0b3JpbmdcclxuICAgIHRoaXMuY3JlYXRlQmFja3VwTW9uaXRvcmluZyhlbnZpcm9ubWVudCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb25maWd1cmUgYXV0b21hdGVkIER5bmFtb0RCIGJhY2t1cHMgd2l0aCBBV1MgQmFja3VwXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjb25maWd1cmVEeW5hbW9EQkJhY2t1cHMoXHJcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nLFxyXG4gICAgdGFibGVzOiBCYWNrdXBSZWNvdmVyeUNvbmZpZ1Byb3BzWyd0YWJsZXMnXVxyXG4gICkge1xyXG4gICAgLy8gQ3JlYXRlIGJhY2t1cCB2YXVsdCB3aXRoIGVuY3J5cHRpb25cclxuICAgIHRoaXMuX2JhY2t1cFZhdWx0ID0gbmV3IGJhY2t1cC5CYWNrdXBWYXVsdCh0aGlzLCAnQmFja3VwVmF1bHQnLCB7XHJcbiAgICAgIGJhY2t1cFZhdWx0TmFtZTogYG1pc3JhLXBsYXRmb3JtLWJhY2t1cC12YXVsdC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGVmaW5lIGJhY2t1cCBwbGFuIGJhc2VkIG9uIGVudmlyb25tZW50XHJcbiAgICBjb25zdCBiYWNrdXBQbGFuQ29uZmlnID0gdGhpcy5nZXRCYWNrdXBQbGFuQ29uZmlnKGVudmlyb25tZW50KTtcclxuXHJcbiAgICB0aGlzLl9iYWNrdXBQbGFuID0gbmV3IGJhY2t1cC5CYWNrdXBQbGFuKHRoaXMsICdCYWNrdXBQbGFuJywge1xyXG4gICAgICBiYWNrdXBQbGFuTmFtZTogYG1pc3JhLXBsYXRmb3JtLWJhY2t1cC1wbGFuLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYmFja3VwVmF1bHQ6IHRoaXMuX2JhY2t1cFZhdWx0LFxyXG4gICAgICBiYWNrdXBQbGFuUnVsZXM6IFtcclxuICAgICAgICAvLyBEYWlseSBiYWNrdXBzXHJcbiAgICAgICAgbmV3IGJhY2t1cC5CYWNrdXBQbGFuUnVsZSh7XHJcbiAgICAgICAgICBydWxlTmFtZTogJ0RhaWx5QmFja3VwJyxcclxuICAgICAgICAgIHNjaGVkdWxlRXhwcmVzc2lvbjogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgICAgICBob3VyOiAnMicsXHJcbiAgICAgICAgICAgIG1pbnV0ZTogJzAnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBkZWxldGVBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoYmFja3VwUGxhbkNvbmZpZy5kYWlseVJldGVudGlvbkRheXMpLFxyXG4gICAgICAgICAgbW92ZVRvQ29sZFN0b3JhZ2VBZnRlcjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICAgICAgPyBjZGsuRHVyYXRpb24uZGF5cygzMCkgXHJcbiAgICAgICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIC8vIFdlZWtseSBiYWNrdXBzXHJcbiAgICAgICAgbmV3IGJhY2t1cC5CYWNrdXBQbGFuUnVsZSh7XHJcbiAgICAgICAgICBydWxlTmFtZTogJ1dlZWtseUJhY2t1cCcsXHJcbiAgICAgICAgICBzY2hlZHVsZUV4cHJlc3Npb246IGV2ZW50cy5TY2hlZHVsZS5jcm9uKHtcclxuICAgICAgICAgICAgd2Vla0RheTogJ1NVTicsXHJcbiAgICAgICAgICAgIGhvdXI6ICczJyxcclxuICAgICAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIGRlbGV0ZUFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyhiYWNrdXBQbGFuQ29uZmlnLndlZWtseVJldGVudGlvbkRheXMpLFxyXG4gICAgICAgICAgbW92ZVRvQ29sZFN0b3JhZ2VBZnRlcjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICAgICAgPyBjZGsuRHVyYXRpb24uZGF5cyg2MCkgXHJcbiAgICAgICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIC8vIE1vbnRobHkgYmFja3VwcyAocHJvZHVjdGlvbiBvbmx5KVxyXG4gICAgICAgIC4uLihlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gW1xyXG4gICAgICAgICAgbmV3IGJhY2t1cC5CYWNrdXBQbGFuUnVsZSh7XHJcbiAgICAgICAgICAgIHJ1bGVOYW1lOiAnTW9udGhseUJhY2t1cCcsXHJcbiAgICAgICAgICAgIHNjaGVkdWxlRXhwcmVzc2lvbjogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgICAgICAgIGRheTogJzEnLFxyXG4gICAgICAgICAgICAgIGhvdXI6ICc0JyxcclxuICAgICAgICAgICAgICBtaW51dGU6ICcwJyxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGRlbGV0ZUFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyhiYWNrdXBQbGFuQ29uZmlnLm1vbnRobHlSZXRlbnRpb25EYXlzKSxcclxuICAgICAgICAgICAgbW92ZVRvQ29sZFN0b3JhZ2VBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSA6IFtdKSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhbGwgRHluYW1vREIgdGFibGVzIHRvIGJhY2t1cCBwbGFuXHJcbiAgICBPYmplY3QuZW50cmllcyh0YWJsZXMpLmZvckVhY2goKFtuYW1lLCB0YWJsZV0pID0+IHtcclxuICAgICAgLy8gU2tpcCBwcm9ncmVzcyB0YWJsZSAoZXBoZW1lcmFsIGRhdGEgd2l0aCBUVEwpXHJcbiAgICAgIGlmIChuYW1lID09PSAncHJvZ3Jlc3NUYWJsZScpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIG5ldyBiYWNrdXAuQmFja3VwU2VsZWN0aW9uKHRoaXMsIGAke25hbWV9QmFja3VwU2VsZWN0aW9uYCwge1xyXG4gICAgICAgIGJhY2t1cFBsYW46IHRoaXMuX2JhY2t1cFBsYW4sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICBiYWNrdXAuQmFja3VwUmVzb3VyY2UuZnJvbUFybih0YWJsZS50YWJsZUFybiksXHJcbiAgICAgICAgXSxcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgYmFja3VwIGNvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCYWNrdXBWYXVsdE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLl9iYWNrdXBWYXVsdC5iYWNrdXBWYXVsdE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVdTIEJhY2t1cCBWYXVsdCBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYG1pc3JhLXBsYXRmb3JtLSR7ZW52aXJvbm1lbnR9LUJhY2t1cFZhdWx0YCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCYWNrdXBQbGFuSWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLl9iYWNrdXBQbGFuLmJhY2t1cFBsYW5JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBV1MgQmFja3VwIFBsYW4gSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgbWlzcmEtcGxhdGZvcm0tJHtlbnZpcm9ubWVudH0tQmFja3VwUGxhbmAsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBiYWNrdXAgcGxhbiBjb25maWd1cmF0aW9uIGJhc2VkIG9uIGVudmlyb25tZW50XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRCYWNrdXBQbGFuQ29uZmlnKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIGNvbnN0IGNvbmZpZ3MgPSB7XHJcbiAgICAgIGRldjoge1xyXG4gICAgICAgIGRhaWx5UmV0ZW50aW9uRGF5czogNyxcclxuICAgICAgICB3ZWVrbHlSZXRlbnRpb25EYXlzOiAxNCxcclxuICAgICAgICBtb250aGx5UmV0ZW50aW9uRGF5czogMzAsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YWdpbmc6IHtcclxuICAgICAgICBkYWlseVJldGVudGlvbkRheXM6IDE0LFxyXG4gICAgICAgIHdlZWtseVJldGVudGlvbkRheXM6IDMwLFxyXG4gICAgICAgIG1vbnRobHlSZXRlbnRpb25EYXlzOiA5MCxcclxuICAgICAgfSxcclxuICAgICAgcHJvZHVjdGlvbjoge1xyXG4gICAgICAgIGRhaWx5UmV0ZW50aW9uRGF5czogMzAsXHJcbiAgICAgICAgd2Vla2x5UmV0ZW50aW9uRGF5czogOTAsXHJcbiAgICAgICAgbW9udGhseVJldGVudGlvbkRheXM6IDM2NSxcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIGNvbmZpZ3NbZW52aXJvbm1lbnQgYXMga2V5b2YgdHlwZW9mIGNvbmZpZ3NdO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uZmlndXJlIFMzIGNyb3NzLXJlZ2lvbiByZXBsaWNhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY29uZmlndXJlUzNSZXBsaWNhdGlvbihcclxuICAgIHNvdXJjZUJ1Y2tldDogczMuQnVja2V0LFxyXG4gICAgcmVwbGljYXRpb25CdWNrZXQ6IHMzLkJ1Y2tldCxcclxuICAgIHJlcGxpY2F0aW9uUm9sZTogaWFtLlJvbGVcclxuICApIHtcclxuICAgIC8vIENyZWF0ZSByZXBsaWNhdGlvbiBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBjZm5CdWNrZXQgPSBzb3VyY2VCdWNrZXQubm9kZS5kZWZhdWx0Q2hpbGQgYXMgczMuQ2ZuQnVja2V0O1xyXG4gICAgXHJcbiAgICBjZm5CdWNrZXQucmVwbGljYXRpb25Db25maWd1cmF0aW9uID0ge1xyXG4gICAgICByb2xlOiByZXBsaWNhdGlvblJvbGUucm9sZUFybixcclxuICAgICAgcnVsZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ1JlcGxpY2F0ZUFsbCcsXHJcbiAgICAgICAgICBzdGF0dXM6ICdFbmFibGVkJyxcclxuICAgICAgICAgIHByaW9yaXR5OiAxLFxyXG4gICAgICAgICAgZmlsdGVyOiB7XHJcbiAgICAgICAgICAgIHByZWZpeDogJycsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZGVzdGluYXRpb246IHtcclxuICAgICAgICAgICAgYnVja2V0OiByZXBsaWNhdGlvbkJ1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgICAgICAgIHJlcGxpY2F0aW9uVGltZToge1xyXG4gICAgICAgICAgICAgIHN0YXR1czogJ0VuYWJsZWQnLFxyXG4gICAgICAgICAgICAgIHRpbWU6IHtcclxuICAgICAgICAgICAgICAgIG1pbnV0ZXM6IDE1LFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1ldHJpY3M6IHtcclxuICAgICAgICAgICAgICBzdGF0dXM6ICdFbmFibGVkJyxcclxuICAgICAgICAgICAgICBldmVudFRocmVzaG9sZDoge1xyXG4gICAgICAgICAgICAgICAgbWludXRlczogMTUsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiAnU1RBTkRBUkRfSUEnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGRlbGV0ZU1hcmtlclJlcGxpY2F0aW9uOiB7XHJcbiAgICAgICAgICAgIHN0YXR1czogJ0VuYWJsZWQnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfTtcclxuXHJcbiAgICB0aGlzLl9yZXBsaWNhdGlvbkNvbmZpZ3VyYXRpb24gPSBjZm5CdWNrZXQucmVwbGljYXRpb25Db25maWd1cmF0aW9uO1xyXG5cclxuICAgIC8vIE91dHB1dCByZXBsaWNhdGlvbiBjb25maWd1cmF0aW9uXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVwbGljYXRpb25TdGF0dXMnLCB7XHJcbiAgICAgIHZhbHVlOiAnRW5hYmxlZCcsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgQ3Jvc3MtUmVnaW9uIFJlcGxpY2F0aW9uIFN0YXR1cycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVwbGljYXRpb25EZXN0aW5hdGlvbicsIHtcclxuICAgICAgdmFsdWU6IHJlcGxpY2F0aW9uQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgUmVwbGljYXRpb24gRGVzdGluYXRpb24gQnVja2V0JyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uZmlndXJlIExhbWJkYSBmdW5jdGlvbiB2ZXJzaW9uaW5nIGFuZCBhbGlhc2VzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjb25maWd1cmVMYW1iZGFWZXJzaW9uaW5nKFxyXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcclxuICAgIGxhbWJkYUZ1bmN0aW9uczogeyBba2V5OiBzdHJpbmddOiBsYW1iZGEuRnVuY3Rpb24gfVxyXG4gICkge1xyXG4gICAgT2JqZWN0LmVudHJpZXMobGFtYmRhRnVuY3Rpb25zKS5mb3JFYWNoKChbbmFtZSwgZnVuY10pID0+IHtcclxuICAgICAgLy8gQ3JlYXRlIHZlcnNpb24gZm9yIGVhY2ggTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICAgIGNvbnN0IHZlcnNpb24gPSBmdW5jLmN1cnJlbnRWZXJzaW9uO1xyXG4gICAgICB0aGlzLmxhbWJkYVZlcnNpb25zLnNldChuYW1lLCB2ZXJzaW9uKTtcclxuXHJcbiAgICAgIC8vIENyZWF0ZSBhbGlhc2VzIGZvciBkaWZmZXJlbnQgZW52aXJvbm1lbnRzXHJcbiAgICAgIGNvbnN0IGxpdmVBbGlhcyA9IG5ldyBsYW1iZGEuQWxpYXModGhpcywgYCR7bmFtZX1MaXZlQWxpYXNgLCB7XHJcbiAgICAgICAgYWxpYXNOYW1lOiAnbGl2ZScsXHJcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvbixcclxuICAgICAgICBkZXNjcmlwdGlvbjogYExpdmUgYWxpYXMgZm9yICR7bmFtZX0gZnVuY3Rpb25gLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHN0YWJsZUFsaWFzID0gbmV3IGxhbWJkYS5BbGlhcyh0aGlzLCBgJHtuYW1lfVN0YWJsZUFsaWFzYCwge1xyXG4gICAgICAgIGFsaWFzTmFtZTogJ3N0YWJsZScsXHJcbiAgICAgICAgdmVyc2lvbjogdmVyc2lvbixcclxuICAgICAgICBkZXNjcmlwdGlvbjogYFN0YWJsZSBhbGlhcyBmb3IgJHtuYW1lfSBmdW5jdGlvbmAsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy5sYW1iZGFBbGlhc2VzLnNldChgJHtuYW1lfS1saXZlYCwgbGl2ZUFsaWFzKTtcclxuICAgICAgdGhpcy5sYW1iZGFBbGlhc2VzLnNldChgJHtuYW1lfS1zdGFibGVgLCBzdGFibGVBbGlhcyk7XHJcblxyXG4gICAgICAvLyBGb3IgcHJvZHVjdGlvbiwgY3JlYXRlIGJsdWUvZ3JlZW4gZGVwbG95bWVudCBjb25maWd1cmF0aW9uXHJcbiAgICAgIGlmIChlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAgICAgY29uc3QgYmx1ZUFsaWFzID0gbmV3IGxhbWJkYS5BbGlhcyh0aGlzLCBgJHtuYW1lfUJsdWVBbGlhc2AsIHtcclxuICAgICAgICAgIGFsaWFzTmFtZTogJ2JsdWUnLFxyXG4gICAgICAgICAgdmVyc2lvbjogdmVyc2lvbixcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgQmx1ZSBkZXBsb3ltZW50IGFsaWFzIGZvciAke25hbWV9IGZ1bmN0aW9uYCxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgZ3JlZW5BbGlhcyA9IG5ldyBsYW1iZGEuQWxpYXModGhpcywgYCR7bmFtZX1HcmVlbkFsaWFzYCwge1xyXG4gICAgICAgICAgYWxpYXNOYW1lOiAnZ3JlZW4nLFxyXG4gICAgICAgICAgdmVyc2lvbjogdmVyc2lvbixcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgR3JlZW4gZGVwbG95bWVudCBhbGlhcyBmb3IgJHtuYW1lfSBmdW5jdGlvbmAsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMubGFtYmRhQWxpYXNlcy5zZXQoYCR7bmFtZX0tYmx1ZWAsIGJsdWVBbGlhcyk7XHJcbiAgICAgICAgdGhpcy5sYW1iZGFBbGlhc2VzLnNldChgJHtuYW1lfS1ncmVlbmAsIGdyZWVuQWxpYXMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBPdXRwdXQgdmVyc2lvbiBhbmQgYWxpYXMgaW5mb3JtYXRpb25cclxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgYCR7bmFtZX1WZXJzaW9uQXJuYCwge1xyXG4gICAgICAgIHZhbHVlOiB2ZXJzaW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgJHtuYW1lfSBMYW1iZGEgRnVuY3Rpb24gVmVyc2lvbiBBUk5gLFxyXG4gICAgICAgIGV4cG9ydE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS0ke2Vudmlyb25tZW50fS0ke25hbWV9LVZlcnNpb25Bcm5gLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIGAke25hbWV9TGl2ZUFsaWFzQXJuYCwge1xyXG4gICAgICAgIHZhbHVlOiBsaXZlQWxpYXMuZnVuY3Rpb25Bcm4sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGAke25hbWV9IExhbWJkYSBGdW5jdGlvbiBMaXZlIEFsaWFzIEFSTmAsXHJcbiAgICAgICAgZXhwb3J0TmFtZTogYG1pc3JhLXBsYXRmb3JtLSR7ZW52aXJvbm1lbnR9LSR7bmFtZX0tTGl2ZUFsaWFzYCxcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBiYWNrdXAgbW9uaXRvcmluZyBhbmQgYWxlcnRpbmdcclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUJhY2t1cE1vbml0b3JpbmcoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgLy8gQ3JlYXRlIEV2ZW50QnJpZGdlIHJ1bGUgZm9yIGJhY2t1cCBqb2IgZmFpbHVyZXNcclxuICAgIGNvbnN0IGJhY2t1cEZhaWx1cmVSdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdCYWNrdXBGYWlsdXJlUnVsZScsIHtcclxuICAgICAgcnVsZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1iYWNrdXAtZmFpbHVyZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQWxlcnQgb24gYmFja3VwIGpvYiBmYWlsdXJlcycsXHJcbiAgICAgIGV2ZW50UGF0dGVybjoge1xyXG4gICAgICAgIHNvdXJjZTogWydhd3MuYmFja3VwJ10sXHJcbiAgICAgICAgZGV0YWlsVHlwZTogWydCYWNrdXAgSm9iIFN0YXRlIENoYW5nZSddLFxyXG4gICAgICAgIGRldGFpbDoge1xyXG4gICAgICAgICAgc3RhdGU6IFsnRkFJTEVEJywgJ0FCT1JURUQnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEV2ZW50QnJpZGdlIHJ1bGUgZm9yIGJhY2t1cCBqb2Igc3VjY2Vzc1xyXG4gICAgY29uc3QgYmFja3VwU3VjY2Vzc1J1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0JhY2t1cFN1Y2Nlc3NSdWxlJywge1xyXG4gICAgICBydWxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLWJhY2t1cC1zdWNjZXNzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdUcmFjayBzdWNjZXNzZnVsIGJhY2t1cCBqb2JzJyxcclxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgc291cmNlOiBbJ2F3cy5iYWNrdXAnXSxcclxuICAgICAgICBkZXRhaWxUeXBlOiBbJ0JhY2t1cCBKb2IgU3RhdGUgQ2hhbmdlJ10sXHJcbiAgICAgICAgZGV0YWlsOiB7XHJcbiAgICAgICAgICBzdGF0ZTogWydDT01QTEVURUQnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IG1vbml0b3JpbmcgY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhY2t1cE1vbml0b3JpbmdFbmFibGVkJywge1xyXG4gICAgICB2YWx1ZTogJ3RydWUnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0JhY2t1cCBtb25pdG9yaW5nIHN0YXR1cycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBSVE8vUlBPIHRhcmdldHMgYmFzZWQgb24gZW52aXJvbm1lbnRcclxuICAgKi9cclxuICBwdWJsaWMgc3RhdGljIGdldFJ0b1Jwb1RhcmdldHMoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgY29uc3QgdGFyZ2V0cyA9IHtcclxuICAgICAgZGV2OiB7XHJcbiAgICAgICAgcnRvOiAnMjQgaG91cnMnLFxyXG4gICAgICAgIHJwbzogJzI0IGhvdXJzJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ0RldmVsb3BtZW50IGVudmlyb25tZW50IC0gcmVsYXhlZCByZWNvdmVyeSB0YXJnZXRzJyxcclxuICAgICAgfSxcclxuICAgICAgc3RhZ2luZzoge1xyXG4gICAgICAgIHJ0bzogJzQgaG91cnMnLFxyXG4gICAgICAgIHJwbzogJzQgaG91cnMnLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnU3RhZ2luZyBlbnZpcm9ubWVudCAtIG1vZGVyYXRlIHJlY292ZXJ5IHRhcmdldHMnLFxyXG4gICAgICB9LFxyXG4gICAgICBwcm9kdWN0aW9uOiB7XHJcbiAgICAgICAgcnRvOiAnMSBob3VyJyxcclxuICAgICAgICBycG86ICcxNSBtaW51dGVzJyxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gZW52aXJvbm1lbnQgLSBzdHJpY3QgcmVjb3ZlcnkgdGFyZ2V0cycsXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB0YXJnZXRzW2Vudmlyb25tZW50IGFzIGtleW9mIHR5cGVvZiB0YXJnZXRzXTtcclxuICB9XHJcbn1cclxuIl19