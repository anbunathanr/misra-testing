# MISRA Platform - Disaster Recovery Procedures

## Overview

This document provides comprehensive disaster recovery (DR) procedures for the MISRA Compliance Platform. It covers backup strategies, recovery procedures, RTO/RPO targets, and step-by-step recovery instructions for various failure scenarios.

## Table of Contents

1. [RTO/RPO Targets](#rtorpo-targets)
2. [Backup Strategy](#backup-strategy)
3. [Recovery Procedures](#recovery-procedures)
4. [Failure Scenarios](#failure-scenarios)
5. [Testing and Validation](#testing-and-validation)
6. [Contacts and Escalation](#contacts-and-escalation)

## RTO/RPO Targets

### Production Environment

| Component | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) | Backup Frequency |
|-----------|-------------------------------|-------------------------------|------------------|
| DynamoDB Tables | 5 minutes (PITR) | 30 minutes | Continuous + Daily |
| S3 Files Bucket | 15 minutes (Replication) | 1 hour | Continuous + Daily |
| Lambda Functions | 0 (Versioned) | 15 minutes | On deployment |
| API Gateway | 0 (IaC) | 30 minutes | On deployment |
| Cognito User Pool | 24 hours | 2 hours | Daily |
| Secrets Manager | 0 (Replicated) | 15 minutes | Automatic |
| CloudWatch Logs | 24 hours | 1 hour | Continuous |

### Staging Environment

| Component | RPO | RTO | Backup Frequency |
|-----------|-----|-----|------------------|
| DynamoDB Tables | 24 hours | 2 hours | Daily |
| S3 Files Bucket | 24 hours | 2 hours | Daily |
| Lambda Functions | 0 (Versioned) | 30 minutes | On deployment |

### Development Environment

| Component | RPO | RTO | Backup Frequency |
|-----------|-----|-----|------------------|
| DynamoDB Tables | 72 hours | 4 hours | Daily |
| S3 Files Bucket | 72 hours | 4 hours | Daily |
| Lambda Functions | 0 (Versioned) | 1 hour | On deployment |

## Backup Strategy

### 1. DynamoDB Backup Strategy

#### Point-in-Time Recovery (PITR)
- **Enabled for**: All production tables
- **Retention**: 35 days
- **RPO**: 5 minutes
- **Use case**: Recover from accidental data deletion or corruption

#### AWS Backup
- **Daily backups**: Retained for 30 days
- **Weekly backups**: Retained for 90 days
- **Monthly backups**: Retained for 365 days
- **Use case**: Long-term retention and compliance

#### Tables Covered
- `misra-platform-users-production`
- `misra-platform-file-metadata-production`
- `misra-platform-analysis-results-production`
- `misra-platform-sample-files-production`
- `misra-platform-progress-production`

### 2. S3 Backup Strategy

#### Cross-Region Replication (CRR)
- **Primary region**: us-east-1
- **Replica region**: us-west-2
- **Replication time**: 15 minutes (S3 RTC)
- **Versioning**: Enabled on both buckets
- **Use case**: Regional disaster recovery

#### Lifecycle Policies
- **Infrequent Access**: After 30 days
- **Glacier**: After 90 days
- **Deep Archive**: After 365 days
- **Version expiration**: 30 days for non-current versions

#### AWS Backup
- **Daily snapshots**: Retained for 30 days
- **Use case**: Point-in-time recovery

### 3. Lambda Function Versioning Strategy

#### Version Management
- **Automatic versioning**: On every deployment
- **Aliases**: 
  - `production` - Current production version
  - `live` - Active production traffic
  - `canary` - Testing new versions
- **Retention**: Last 10 versions kept for rollback

#### Rollback Strategy
1. Identify last known good version
2. Update alias to point to previous version
3. Verify functionality
4. Monitor for issues

### 4. Infrastructure as Code (IaC) Backup

#### CDK Stack Backup
- **Repository**: GitHub with branch protection
- **Backup frequency**: On every commit
- **Retention**: Unlimited (Git history)
- **Use case**: Complete infrastructure recreation

#### Configuration Backup
- **Secrets Manager**: Automatic replication
- **Parameter Store**: Daily backup
- **Environment variables**: Stored in IaC

## Recovery Procedures

### Procedure 1: DynamoDB Table Recovery

#### Scenario: Accidental data deletion or corruption

**Using Point-in-Time Recovery (PITR)**

```bash
# 1. Identify the recovery point
RECOVERY_TIME="2024-01-15T10:30:00Z"
TABLE_NAME="misra-platform-users-production"
NEW_TABLE_NAME="${TABLE_NAME}-restored-$(date +%Y%m%d-%H%M%S)"

# 2. Restore table to a specific point in time
aws dynamodb restore-table-to-point-in-time \
  --source-table-name $TABLE_NAME \
  --target-table-name $NEW_TABLE_NAME \
  --restore-date-time $RECOVERY_TIME \
  --use-latest-restorable-time

# 3. Wait for restore to complete
aws dynamodb wait table-exists --table-name $NEW_TABLE_NAME

# 4. Verify data integrity
aws dynamodb scan --table-name $NEW_TABLE_NAME --max-items 10

# 5. Update application to use restored table (or rename tables)
# Option A: Update CDK stack to point to new table
# Option B: Rename tables (requires downtime)

# 6. Monitor application health
# Check CloudWatch metrics and logs
```

**Using AWS Backup**

```bash
# 1. List available recovery points
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name misra-platform-backup-vault-production

# 2. Initiate restore job
RECOVERY_POINT_ARN="arn:aws:backup:us-east-1:ACCOUNT:recovery-point:XXXXX"

aws backup start-restore-job \
  --recovery-point-arn $RECOVERY_POINT_ARN \
  --iam-role-arn arn:aws:iam::ACCOUNT:role/misra-platform-backup-role-production \
  --metadata tableName=$NEW_TABLE_NAME

# 3. Monitor restore job
RESTORE_JOB_ID="XXXXX"
aws backup describe-restore-job --restore-job-id $RESTORE_JOB_ID

# 4. Verify and switch to restored table
```

**Estimated Recovery Time**: 30-60 minutes
**Estimated Data Loss**: 0-5 minutes (PITR) or up to 24 hours (AWS Backup)

### Procedure 2: S3 Bucket Recovery

#### Scenario: Accidental file deletion or bucket corruption

**Using S3 Versioning**

```bash
# 1. List deleted objects
BUCKET_NAME="misra-platform-files-production-ACCOUNT"

aws s3api list-object-versions \
  --bucket $BUCKET_NAME \
  --prefix "uploads/" \
  --query 'DeleteMarkers[?IsLatest==`true`]'

# 2. Restore specific file
FILE_KEY="uploads/user123/file.c"
VERSION_ID="XXXXX"

aws s3api delete-object \
  --bucket $BUCKET_NAME \
  --key $FILE_KEY \
  --version-id $VERSION_ID

# 3. Verify file restoration
aws s3api head-object --bucket $BUCKET_NAME --key $FILE_KEY

# 4. Bulk restore (if needed)
# Create script to iterate through deleted objects
```

**Using Cross-Region Replication**

```bash
# 1. Identify missing objects in primary region
PRIMARY_BUCKET="misra-platform-files-production-ACCOUNT"
REPLICA_BUCKET="misra-platform-files-replication-ACCOUNT"

# 2. Sync from replica to primary
aws s3 sync s3://$REPLICA_BUCKET s3://$PRIMARY_BUCKET \
  --source-region us-west-2 \
  --region us-east-1

# 3. Verify sync completion
aws s3 ls s3://$PRIMARY_BUCKET --recursive | wc -l
aws s3 ls s3://$REPLICA_BUCKET --recursive | wc -l

# 4. Re-enable replication if needed
```

**Using AWS Backup**

```bash
# 1. List S3 backup recovery points
aws backup list-recovery-points-by-resource \
  --resource-arn arn:aws:s3:::$BUCKET_NAME

# 2. Restore from backup
RECOVERY_POINT_ARN="arn:aws:backup:us-east-1:ACCOUNT:recovery-point:XXXXX"

aws backup start-restore-job \
  --recovery-point-arn $RECOVERY_POINT_ARN \
  --iam-role-arn arn:aws:iam::ACCOUNT:role/misra-platform-backup-role-production \
  --metadata bucketName=$BUCKET_NAME-restored

# 3. Sync restored bucket to primary
aws s3 sync s3://$BUCKET_NAME-restored s3://$BUCKET_NAME
```

**Estimated Recovery Time**: 1-2 hours (depending on data size)
**Estimated Data Loss**: 0-15 minutes (CRR) or up to 24 hours (AWS Backup)

### Procedure 3: Lambda Function Rollback

#### Scenario: Deployment introduced bugs or errors

**Using Lambda Aliases**

```bash
# 1. Identify current and previous versions
FUNCTION_NAME="misra-platform-analysis-production"
ALIAS_NAME="live"

aws lambda get-alias \
  --function-name $FUNCTION_NAME \
  --name $ALIAS_NAME

# 2. List available versions
aws lambda list-versions-by-function \
  --function-name $FUNCTION_NAME \
  --max-items 10

# 3. Update alias to previous version
PREVIOUS_VERSION="5"

aws lambda update-alias \
  --function-name $FUNCTION_NAME \
  --name $ALIAS_NAME \
  --function-version $PREVIOUS_VERSION

# 4. Verify rollback
aws lambda invoke \
  --function-name $FUNCTION_NAME:$ALIAS_NAME \
  --payload '{"test": true}' \
  response.json

# 5. Monitor CloudWatch metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=$FUNCTION_NAME \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

**Using CDK Rollback**

```bash
# 1. Identify previous CDK deployment
cd packages/backend
git log --oneline -10

# 2. Checkout previous version
PREVIOUS_COMMIT="abc123"
git checkout $PREVIOUS_COMMIT

# 3. Deploy previous version
npm run deploy:production

# 4. Verify deployment
aws cloudformation describe-stacks \
  --stack-name misra-platform-production

# 5. Return to main branch after verification
git checkout main
```

**Estimated Recovery Time**: 15-30 minutes
**Estimated Data Loss**: None (stateless functions)

### Procedure 4: Complete Regional Disaster Recovery

#### Scenario: Complete AWS region failure

**Step 1: Assess Impact**

```bash
# Check AWS Service Health Dashboard
# https://status.aws.amazon.com/

# Verify replica region availability
aws dynamodb list-tables --region us-west-2
aws s3 ls --region us-west-2
```

**Step 2: Activate Replica Region**

```bash
# 1. Deploy CDK stack to replica region
cd packages/backend

# Update cdk.json for replica region
export AWS_REGION=us-west-2
export ENVIRONMENT=production-dr

# 2. Deploy infrastructure
npm run cdk deploy -- \
  --context region=us-west-2 \
  --context environment=production-dr

# 3. Restore DynamoDB tables from backup
# (Use Procedure 1 for each table)

# 4. Verify S3 replication bucket
aws s3 ls s3://misra-platform-files-replication-ACCOUNT --region us-west-2

# 5. Update DNS to point to new region
# Update Route 53 records or CloudFront origin
```

**Step 3: Update Application Configuration**

```bash
# 1. Update frontend environment variables
# Edit packages/frontend/.env.production
VITE_API_URL=https://api-dr.misra.yourdomain.com
VITE_AWS_REGION=us-west-2

# 2. Rebuild and deploy frontend
cd packages/frontend
npm run build
aws s3 sync dist/ s3://misra-platform-frontend-production-dr-ACCOUNT

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id XXXXX \
  --paths "/*"
```

**Step 4: Verify System Health**

```bash
# 1. Run health checks
curl https://api-dr.misra.yourdomain.com/health

# 2. Test authentication
curl -X POST https://api-dr.misra.yourdomain.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPass123"}'

# 3. Test file upload and analysis
# (Use E2E test suite)

# 4. Monitor CloudWatch metrics
aws cloudwatch get-dashboard \
  --dashboard-name misra-platform-production-dr \
  --region us-west-2
```

**Estimated Recovery Time**: 2-4 hours
**Estimated Data Loss**: 15-30 minutes (replication lag)

### Procedure 5: Cognito User Pool Recovery

#### Scenario: User pool corruption or accidental deletion

**Note**: Cognito User Pools cannot be restored from backup. Prevention is key.

**Prevention Measures**:
1. Enable deletion protection on user pool
2. Export user data daily to S3
3. Maintain user backup in DynamoDB Users table

**Recovery Steps**:

```bash
# 1. Create new user pool with same configuration
cd packages/backend
npm run cdk deploy -- --context recreateUserPool=true

# 2. Restore users from DynamoDB backup
# Script to iterate through Users table and recreate in Cognito

# 3. Update application configuration
# Update User Pool ID and Client ID in all environments

# 4. Notify users to reset passwords
# Send email via SES to all users
```

**Estimated Recovery Time**: 4-8 hours
**Estimated Data Loss**: User passwords (require reset)

## Failure Scenarios

### Scenario 1: Database Corruption

**Symptoms**:
- Inconsistent query results
- Application errors related to data integrity
- CloudWatch alarms for DynamoDB errors

**Detection**:
- CloudWatch alarms
- Application error logs
- User reports

**Response**:
1. Identify affected table(s)
2. Determine corruption timeframe
3. Execute Procedure 1 (DynamoDB Recovery)
4. Verify data integrity
5. Resume normal operations

**Prevention**:
- Input validation
- Transaction support
- Regular data integrity checks

### Scenario 2: Accidental Data Deletion

**Symptoms**:
- Missing files or database records
- User reports of lost data
- Sudden drop in data volume metrics

**Detection**:
- CloudWatch metrics (item count, storage size)
- Audit logs (DynamoDB Streams)
- User reports

**Response**:
1. Identify deleted items
2. Determine deletion timeframe
3. Execute appropriate recovery procedure
4. Verify restored data
5. Investigate root cause

**Prevention**:
- Soft delete implementation
- Multi-factor authentication for destructive operations
- Audit logging

### Scenario 3: Regional Outage

**Symptoms**:
- Complete service unavailability
- AWS Service Health Dashboard alerts
- All health checks failing

**Detection**:
- CloudWatch alarms
- Route 53 health checks
- AWS Service Health Dashboard

**Response**:
1. Verify regional outage
2. Execute Procedure 4 (Regional DR)
3. Activate replica region
4. Update DNS routing
5. Monitor recovery

**Prevention**:
- Multi-region architecture
- Regular DR drills
- Automated failover procedures

### Scenario 4: Security Breach

**Symptoms**:
- Unauthorized access attempts
- Unusual API activity
- CloudWatch security alarms

**Detection**:
- WAF logs
- CloudWatch security alarms
- GuardDuty findings
- Audit logs

**Response**:
1. Isolate affected resources
2. Rotate all credentials and secrets
3. Review audit logs
4. Restore from clean backup if needed
5. Implement additional security measures

**Prevention**:
- Regular security audits
- Principle of least privilege
- Multi-factor authentication
- Encryption at rest and in transit

### Scenario 5: Application Bug Causing Data Corruption

**Symptoms**:
- Incorrect data in database
- Failed analysis results
- User reports of incorrect behavior

**Detection**:
- Application error logs
- Data validation checks
- User reports

**Response**:
1. Identify bug and affected data
2. Execute Lambda rollback (Procedure 3)
3. Restore affected data (Procedure 1 or 2)
4. Fix bug and redeploy
5. Verify fix

**Prevention**:
- Comprehensive testing
- Canary deployments
- Feature flags
- Data validation

## Testing and Validation

### Regular DR Testing Schedule

| Test Type | Frequency | Duration | Participants |
|-----------|-----------|----------|--------------|
| DynamoDB PITR | Monthly | 1 hour | DevOps team |
| S3 Versioning | Monthly | 30 minutes | DevOps team |
| Lambda Rollback | Weekly | 15 minutes | DevOps team |
| Full DR Drill | Quarterly | 4 hours | All teams |
| Tabletop Exercise | Bi-annually | 2 hours | All teams |

### DR Test Checklist

#### Pre-Test
- [ ] Schedule test window
- [ ] Notify all stakeholders
- [ ] Prepare test environment
- [ ] Document current state
- [ ] Assign roles and responsibilities

#### During Test
- [ ] Execute recovery procedures
- [ ] Document all steps taken
- [ ] Record timing for each step
- [ ] Note any issues or deviations
- [ ] Verify data integrity

#### Post-Test
- [ ] Restore normal operations
- [ ] Document lessons learned
- [ ] Update procedures if needed
- [ ] Share results with team
- [ ] Schedule next test

### Validation Criteria

**Data Integrity**:
- [ ] All records present
- [ ] No data corruption
- [ ] Relationships intact
- [ ] Checksums match

**Functionality**:
- [ ] Authentication works
- [ ] File upload works
- [ ] Analysis runs successfully
- [ ] Results display correctly

**Performance**:
- [ ] Response times acceptable
- [ ] No errors in logs
- [ ] CloudWatch metrics normal
- [ ] User experience acceptable

## Contacts and Escalation

### Primary Contacts

**DevOps Team**:
- On-call: +1-XXX-XXX-XXXX
- Email: devops@yourdomain.com
- Slack: #devops-oncall

**Development Team**:
- Lead: developer@yourdomain.com
- Slack: #dev-team

**Management**:
- CTO: cto@yourdomain.com
- Phone: +1-XXX-XXX-XXXX

### Escalation Path

**Level 1** (0-30 minutes):
- On-call DevOps engineer
- Assess situation
- Execute standard procedures

**Level 2** (30-60 minutes):
- DevOps team lead
- Development team lead
- Coordinate recovery efforts

**Level 3** (60+ minutes):
- CTO
- All hands on deck
- Consider external support

### External Support

**AWS Support**:
- Enterprise Support: 24/7
- Phone: 1-800-XXX-XXXX
- Case portal: https://console.aws.amazon.com/support

**Third-party Services**:
- Monitoring: support@monitoring-service.com
- Security: security@security-service.com

## Appendix

### A. Backup Verification Script

```bash
#!/bin/bash
# verify-backups.sh

ENVIRONMENT="production"
REGION="us-east-1"

echo "Verifying backups for $ENVIRONMENT environment..."

# Check DynamoDB PITR status
echo "Checking DynamoDB PITR..."
for table in users file-metadata analysis-results sample-files progress; do
  TABLE_NAME="misra-platform-$table-$ENVIRONMENT"
  PITR_STATUS=$(aws dynamodb describe-continuous-backups \
    --table-name $TABLE_NAME \
    --region $REGION \
    --query 'ContinuousBackupsDescription.PointInTimeRecoveryDescription.PointInTimeRecoveryStatus' \
    --output text)
  echo "  $TABLE_NAME: $PITR_STATUS"
done

# Check AWS Backup recovery points
echo "Checking AWS Backup recovery points..."
VAULT_NAME="misra-platform-backup-vault-$ENVIRONMENT"
RECOVERY_POINTS=$(aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name $VAULT_NAME \
  --region $REGION \
  --query 'RecoveryPoints[?Status==`COMPLETED`]' \
  --output json | jq length)
echo "  Recovery points: $RECOVERY_POINTS"

# Check S3 versioning
echo "Checking S3 versioning..."
BUCKET_NAME="misra-platform-files-$ENVIRONMENT-$(aws sts get-caller-identity --query Account --output text)"
VERSIONING=$(aws s3api get-bucket-versioning \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --query 'Status' \
  --output text)
echo "  $BUCKET_NAME: $VERSIONING"

# Check S3 replication
echo "Checking S3 replication..."
REPLICATION=$(aws s3api get-bucket-replication \
  --bucket $BUCKET_NAME \
  --region $REGION \
  --query 'ReplicationConfiguration.Rules[0].Status' \
  --output text 2>/dev/null || echo "NOT_CONFIGURED")
echo "  Replication status: $REPLICATION"

echo "Backup verification complete!"
```

### B. Recovery Time Tracking Template

```markdown
# Recovery Incident Report

**Incident ID**: INC-YYYY-MM-DD-XXX
**Date**: YYYY-MM-DD
**Environment**: Production/Staging/Dev
**Severity**: Critical/High/Medium/Low

## Incident Summary
- **Start Time**: HH:MM UTC
- **Detection Time**: HH:MM UTC
- **Recovery Start**: HH:MM UTC
- **Recovery Complete**: HH:MM UTC
- **Total Downtime**: X hours Y minutes

## Impact
- **Users Affected**: X users
- **Data Loss**: X minutes/hours
- **Services Affected**: List services

## Root Cause
Detailed description of what caused the incident.

## Recovery Steps Taken
1. Step 1 (HH:MM - HH:MM)
2. Step 2 (HH:MM - HH:MM)
3. Step 3 (HH:MM - HH:MM)

## Lessons Learned
- What went well
- What could be improved
- Action items

## Follow-up Actions
- [ ] Action 1 (Owner: Name, Due: Date)
- [ ] Action 2 (Owner: Name, Due: Date)
```

### C. Useful AWS CLI Commands

```bash
# List all backups
aws backup list-recovery-points-by-backup-vault \
  --backup-vault-name misra-platform-backup-vault-production

# Check DynamoDB table status
aws dynamodb describe-table \
  --table-name misra-platform-users-production

# List Lambda versions
aws lambda list-versions-by-function \
  --function-name misra-platform-analysis-production

# Check S3 replication status
aws s3api get-bucket-replication \
  --bucket misra-platform-files-production-ACCOUNT

# View CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-name-prefix misra-platform

# Check stack status
aws cloudformation describe-stacks \
  --stack-name misra-platform-production
```

---

**Document Version**: 1.0
**Last Updated**: 2024-01-15
**Next Review**: 2024-04-15
**Owner**: DevOps Team
