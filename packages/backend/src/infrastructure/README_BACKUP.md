# Backup Configuration Module

## Overview

The `BackupConfig` construct provides comprehensive backup and recovery capabilities for the MISRA Platform, including:

- **DynamoDB Backup**: Point-in-time recovery (PITR) and AWS Backup integration
- **S3 Cross-Region Replication**: Disaster recovery for file storage
- **Lambda Versioning**: Immutable versions and aliases for rollback
- **Automated Monitoring**: EventBridge rules for backup job tracking

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Backup Configuration                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  DynamoDB    │  │      S3      │  │   Lambda     │     │
│  │   Backup     │  │ Replication  │  │  Versioning  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │            │
│         ├─ PITR (5 min)    ├─ CRR (15 min)   ├─ Versions  │
│         ├─ Daily Backup    ├─ Versioning     ├─ Aliases   │
│         ├─ Weekly Backup   └─ Lifecycle      └─ Rollback  │
│         └─ Monthly Backup                                  │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AWS Backup Service                      │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │   Vault    │  │    Plan    │  │ Monitoring │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Integration

```typescript
import { BackupConfig } from './backup-config';

// In your stack constructor
const backupConfig = new BackupConfig(this, 'BackupConfig', {
  environment: 'production',
  tables: {
    users: usersTable,
    fileMetadata: fileMetadataTable,
    analysisResults: analysisResultsTable,
    sampleFiles: sampleFilesTable,
    progress: progressTable,
  },
  filesBucket: filesBucket,
  lambdaFunctions: {
    authorizer: authorizerFunction,
    analysis: analysisFunction,
    // ... other functions
  },
  replicationRegion: 'us-west-2', // Optional, for production
});

// Create outputs
backupConfig.createOutputs(this, this.stackName);
```

## Features

### 1. DynamoDB Backup

#### Point-in-Time Recovery (PITR)
- **RPO**: 5 minutes
- **Retention**: 35 days
- **Automatic**: Enabled for all production tables
- **Use Case**: Quick recovery from recent data corruption

#### AWS Backup Integration
- **Daily Backups**: 30-day retention (production)
- **Weekly Backups**: 90-day retention (production)
- **Monthly Backups**: 365-day retention (production)
- **Cold Storage**: Automatic transition after 7-30 days

### 2. S3 Cross-Region Replication

#### Configuration
- **Primary Region**: us-east-1
- **Replica Region**: us-west-2 (configurable)
- **Replication Time**: 15 minutes (S3 RTC)
- **Versioning**: Enabled on both buckets

#### Features
- Delete marker replication
- Encryption replication
- Metrics and monitoring
- Storage class transition

### 3. Lambda Versioning

#### Version Management
- **Automatic Versioning**: On every deployment
- **Retention**: Last 10 versions
- **Immutable**: Versions cannot be changed

#### Aliases
- **production**: Current production version
- **live**: Active production traffic
- **canary**: Testing new versions (production only)

#### Rollback Strategy
```bash
# Quick rollback
aws lambda update-alias \
  --function-name FUNCTION_NAME \
  --name live \
  --function-version PREVIOUS_VERSION
```

### 4. Backup Monitoring

#### EventBridge Rules
- **Backup Job Failures**: Immediate alerts
- **Backup Job Success**: Logging and metrics
- **Recovery Point Age**: Monitoring

#### CloudWatch Metrics
- Backup job duration
- Backup storage size
- Recovery point count
- Restore test results

## Environment-Specific Configuration

### Production
```typescript
{
  environment: 'production',
  backupSchedule: {
    daily: 'cron(0 2 * * ? *)',    // 2 AM daily
    weekly: 'cron(0 3 ? * SUN *)',  // 3 AM Sunday
    monthly: 'cron(0 4 1 * ? *)',   // 4 AM 1st of month
  },
  retention: {
    daily: 30,    // days
    weekly: 90,   // days
    monthly: 365, // days
  },
  pitr: true,
  replication: true,
}
```

### Staging
```typescript
{
  environment: 'staging',
  backupSchedule: {
    daily: 'cron(0 2 * * ? *)',
  },
  retention: {
    daily: 7, // days
  },
  pitr: false,
  replication: false,
}
```

### Development
```typescript
{
  environment: 'dev',
  backupSchedule: {
    daily: 'cron(0 2 * * ? *)',
  },
  retention: {
    daily: 3, // days
  },
  pitr: false,
  replication: false,
}
```

## Recovery Procedures

### DynamoDB Recovery

#### Using PITR
```bash
# Restore to specific point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name SOURCE_TABLE \
  --target-table-name RESTORED_TABLE \
  --restore-date-time 2024-01-15T10:30:00Z

# Restore to latest
aws dynamodb restore-table-to-point-in-time \
  --source-table-name SOURCE_TABLE \
  --target-table-name RESTORED_TABLE \
  --use-latest-restorable-time
```

#### Using AWS Backup
```bash
# List recovery points
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name VAULT_NAME

# Start restore job
aws backup start-restore-job \
  --recovery-point-arn RECOVERY_POINT_ARN \
  --iam-role-arn BACKUP_ROLE_ARN \
  --metadata tableName=RESTORED_TABLE
```

### S3 Recovery

#### Restore Deleted Object
```bash
# Remove delete marker
aws s3api delete-object \
  --bucket BUCKET_NAME \
  --key OBJECT_KEY \
  --version-id DELETE_MARKER_VERSION_ID
```

#### Sync from Replica
```bash
# Sync from replica region
aws s3 sync s3://REPLICA_BUCKET s3://PRIMARY_BUCKET \
  --source-region us-west-2 \
  --region us-east-1
```

### Lambda Rollback

```bash
# Update alias to previous version
aws lambda update-alias \
  --function-name FUNCTION_NAME \
  --name live \
  --function-version PREVIOUS_VERSION
```

## Cost Optimization

### DynamoDB
- **PITR**: ~$0.20 per GB-month
- **AWS Backup**: ~$0.10 per GB-month (standard)
- **Cold Storage**: ~$0.03 per GB-month (after transition)

### S3
- **Versioning**: Storage cost for all versions
- **Replication**: Data transfer + storage in replica region
- **Lifecycle**: Automatic transition to cheaper storage classes

### Lambda
- **Versioning**: No additional cost (versions use same storage)
- **Aliases**: No additional cost

### Optimization Tips
1. Use lifecycle policies to transition old backups to cold storage
2. Set appropriate retention periods for each environment
3. Clean up old Lambda versions (keep last 10)
4. Use S3 Intelligent-Tiering for automatic cost optimization

## Testing

### Verification Script
```bash
# Run backup verification
cd packages/backend
chmod +x scripts/verify-backups.sh
./scripts/verify-backups.sh production
```

### Manual Testing
```bash
# Test DynamoDB restore
aws dynamodb restore-table-to-point-in-time \
  --source-table-name SOURCE_TABLE \
  --target-table-name TEST_RESTORE \
  --use-latest-restorable-time

# Test S3 restore
aws s3api delete-object \
  --bucket BUCKET_NAME \
  --key test-file.txt \
  --version-id DELETE_MARKER_ID

# Test Lambda rollback
aws lambda update-alias \
  --function-name FUNCTION_NAME \
  --name canary \
  --function-version PREVIOUS_VERSION
```

## Monitoring

### CloudWatch Dashboards
- Backup job success/failure rates
- Recovery point age
- Backup storage size
- Restore test results

### Alarms
- Backup job failures
- Missing recovery points
- Replication lag
- Old recovery points

### Metrics
```typescript
// Custom metrics
namespace: 'MISRA/Backup'
metrics: [
  'BackupJobSuccess',
  'BackupJobFailure',
  'RestoreJobSuccess',
  'RestoreJobFailure',
  'RecoveryPointAge',
]
```

## Troubleshooting

### Common Issues

#### 1. PITR Not Enabled
```bash
# Enable PITR
aws dynamodb update-continuous-backups \
  --table-name TABLE_NAME \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true
```

#### 2. Replication Not Working
```bash
# Check replication status
aws s3api get-bucket-replication \
  --bucket BUCKET_NAME

# Check replication metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name ReplicationLatency \
  --dimensions Name=SourceBucket,Value=BUCKET_NAME
```

#### 3. Backup Job Failures
```bash
# Check backup job status
aws backup describe-backup-job \
  --backup-job-id JOB_ID

# Check IAM permissions
aws iam get-role-policy \
  --role-name BACKUP_ROLE_NAME \
  --policy-name BackupPolicy
```

## Best Practices

1. **Test Regularly**: Run DR drills quarterly
2. **Monitor Continuously**: Set up CloudWatch alarms
3. **Document Everything**: Keep recovery procedures updated
4. **Automate**: Use scripts for common recovery tasks
5. **Verify Backups**: Run verification script weekly
6. **Optimize Costs**: Review retention policies monthly
7. **Train Team**: Ensure team knows recovery procedures

## References

- [Full DR Procedures](../../DISASTER_RECOVERY_PROCEDURES.md)
- [Quick Reference Guide](../../BACKUP_RECOVERY_QUICK_REFERENCE.md)
- [AWS Backup Documentation](https://docs.aws.amazon.com/aws-backup/)
- [DynamoDB PITR Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html)
- [S3 Replication Documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication.html)

## Support

For issues or questions:
- **DevOps Team**: devops@yourdomain.com
- **Slack**: #devops-oncall
- **AWS Support**: Enterprise Support Portal

---

**Version**: 1.0
**Last Updated**: 2024-01-15
**Maintained By**: DevOps Team
