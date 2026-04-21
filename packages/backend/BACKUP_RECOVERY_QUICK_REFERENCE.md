# Backup & Recovery - Quick Reference Guide

## Overview

This guide provides quick reference commands and procedures for backup and recovery operations in the MISRA Platform.

## Quick Commands

### Check Backup Status

```bash
# Check DynamoDB PITR status
aws dynamodb describe-continuous-backups \
  --table-name misra-platform-users-production \
  --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus'

# List AWS Backup recovery points
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name misra-platform-backup-vault-production

# Check S3 versioning
aws s3api get-bucket-versioning \
  --bucket misra-platform-files-production-ACCOUNT

# Check S3 replication status
aws s3api get-bucket-replication \
  --bucket misra-platform-files-production-ACCOUNT
```

### Quick Recovery Commands

#### Restore DynamoDB Table (PITR)

```bash
# Restore to latest point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name misra-platform-users-production \
  --target-table-name misra-platform-users-production-restored \
  --use-latest-restorable-time
```

#### Restore S3 Object

```bash
# Restore deleted file
aws s3api delete-object \
  --bucket misra-platform-files-production-ACCOUNT \
  --key uploads/file.c \
  --version-id DELETE_MARKER_VERSION_ID
```

#### Rollback Lambda Function

```bash
# Update alias to previous version
aws lambda update-alias \
  --function-name misra-platform-analysis-production \
  --name live \
  --function-version PREVIOUS_VERSION
```

## Backup Configuration Summary

### DynamoDB Tables

| Table | PITR | AWS Backup | Retention |
|-------|------|------------|-----------|
| Users | ✅ | ✅ | 30 days |
| File Metadata | ✅ | ✅ | 30 days |
| Analysis Results | ✅ | ✅ | 30 days |
| Sample Files | ✅ | ✅ | 30 days |
| Progress | ✅ | ✅ | 30 days |

### S3 Buckets

| Bucket | Versioning | Replication | Backup |
|--------|-----------|-------------|--------|
| Files Bucket | ✅ | ✅ (us-west-2) | ✅ |
| Frontend Bucket | ✅ | ❌ | ✅ |

### Lambda Functions

| Function | Versioning | Aliases | Retention |
|----------|-----------|---------|-----------|
| All Functions | ✅ | production, live, canary | Last 10 versions |

## RTO/RPO Quick Reference

| Component | RPO | RTO |
|-----------|-----|-----|
| DynamoDB | 5 min | 30 min |
| S3 Files | 15 min | 1 hour |
| Lambda | 0 min | 15 min |
| API Gateway | 0 min | 30 min |

## Common Recovery Scenarios

### 1. Accidental Data Deletion (< 5 minutes ago)

```bash
# Use PITR to restore
aws dynamodb restore-table-to-point-in-time \
  --source-table-name TABLE_NAME \
  --target-table-name TABLE_NAME-restored \
  --restore-date-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S)
```

### 2. Accidental File Deletion

```bash
# List deleted objects
aws s3api list-object-versions \
  --bucket BUCKET_NAME \
  --prefix uploads/ \
  --query 'DeleteMarkers[?IsLatest==`true`]'

# Restore by removing delete marker
aws s3api delete-object \
  --bucket BUCKET_NAME \
  --key FILE_KEY \
  --version-id DELETE_MARKER_ID
```

### 3. Bad Deployment

```bash
# Rollback Lambda function
aws lambda update-alias \
  --function-name FUNCTION_NAME \
  --name live \
  --function-version PREVIOUS_VERSION

# Or rollback entire stack
cd packages/backend
git checkout PREVIOUS_COMMIT
npm run deploy:production
```

### 4. Regional Outage

```bash
# Deploy to replica region
export AWS_REGION=us-west-2
npm run cdk deploy -- --context region=us-west-2

# Update DNS to point to new region
# (Manual step in Route 53 or CloudFront)
```

## Monitoring and Alerts

### CloudWatch Alarms

- **Backup Job Failures**: Alerts when backup jobs fail
- **Backup Job Success**: Logs successful backup completions
- **Recovery Point Age**: Alerts if recovery points are too old

### EventBridge Rules

- **Backup State Changes**: Monitors all backup job state changes
- **Restore Job Status**: Tracks restore job progress

## Testing Schedule

| Test Type | Frequency | Next Test |
|-----------|-----------|-----------|
| DynamoDB PITR | Monthly | 1st of month |
| S3 Versioning | Monthly | 1st of month |
| Lambda Rollback | Weekly | Every Monday |
| Full DR Drill | Quarterly | Q1, Q2, Q3, Q4 |

## Emergency Contacts

- **DevOps On-Call**: +1-XXX-XXX-XXXX
- **AWS Support**: 1-800-XXX-XXXX
- **Slack**: #devops-oncall

## Useful Links

- [Full DR Procedures](./DISASTER_RECOVERY_PROCEDURES.md)
- [AWS Backup Console](https://console.aws.amazon.com/backup)
- [CloudWatch Dashboard](https://console.aws.amazon.com/cloudwatch)
- [DynamoDB Console](https://console.aws.amazon.com/dynamodb)

## Verification Script

Run this script to verify all backups are configured correctly:

```bash
#!/bin/bash
# Run from packages/backend directory
./scripts/verify-backups.sh production
```

## Notes

- Always test recovery procedures in staging first
- Document all recovery actions in incident reports
- Update this guide after any DR tests or actual recoveries
- Keep AWS CLI and CDK tools up to date

---

**Last Updated**: 2024-01-15
**Version**: 1.0
