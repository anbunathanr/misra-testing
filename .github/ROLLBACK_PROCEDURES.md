# Rollback Procedures

## Overview

This document describes the procedures for rolling back deployments in case of issues. Rollbacks can be performed automatically via GitHub Actions or manually via AWS Console.

## When to Rollback

Consider rollback when:
- ✅ Critical bugs affecting core functionality
- ✅ Security vulnerabilities discovered
- ✅ Performance degradation (> 50% slower)
- ✅ High error rates (> 10% of requests)
- ✅ Data corruption or loss
- ❌ Minor UI issues (fix forward instead)
- ❌ Non-critical bugs (fix forward instead)

## Rollback Methods

### Method 1: Automated Rollback (Recommended)

Use the GitHub Actions rollback workflow for quick, automated rollback.

**Steps:**

1. **Navigate to GitHub Actions**
   - Go to repository → Actions
   - Select "Emergency Rollback" workflow

2. **Trigger Rollback**
   - Click "Run workflow"
   - Select environment (staging/production)
   - Enter backup timestamp or "previous"
   - Provide reason for rollback
   - Click "Run workflow"

3. **Approve Rollback** (Production only)
   - Workflow will wait for approval
   - Review the rollback details
   - Click "Review deployments"
   - Select "production" environment
   - Click "Approve and deploy"

4. **Monitor Rollback**
   - Watch workflow logs
   - Check Slack notifications
   - Verify health checks pass

5. **Validate Application**
   - Test critical user flows
   - Check error rates in CloudWatch
   - Monitor user reports

**What Gets Rolled Back:**
- ✅ Frontend (S3 + CloudFront)
- ✅ CloudFront cache (invalidated)
- ⚠️ Backend (requires manual intervention)
- ❌ Database schema changes (requires manual intervention)

### Method 2: Manual Frontend Rollback

If GitHub Actions is unavailable, rollback frontend manually.

**Prerequisites:**
- AWS CLI installed and configured
- Access to AWS Console
- Backup timestamp identified

**Steps:**

1. **Identify Backup**
   ```bash
   # List available backups
   aws s3 ls s3://misra-platform-frontend-production-backup-ACCOUNT_ID/
   
   # Example output:
   # PRE 20240115-143022/
   # PRE 20240115-150045/
   # PRE 20240116-091533/
   ```

2. **Create Pre-Rollback Snapshot**
   ```bash
   TIMESTAMP=$(date +%Y%m%d-%H%M%S)
   
   aws s3 sync \
     s3://misra-platform-frontend-production-ACCOUNT_ID \
     s3://misra-platform-frontend-production-backup-ACCOUNT_ID/pre-rollback-${TIMESTAMP}/ \
     --delete
   ```

3. **Restore from Backup**
   ```bash
   BACKUP_TIMESTAMP="20240115-143022"  # Replace with actual timestamp
   
   aws s3 sync \
     s3://misra-platform-frontend-production-backup-ACCOUNT_ID/${BACKUP_TIMESTAMP}/ \
     s3://misra-platform-frontend-production-ACCOUNT_ID \
     --delete
   ```

4. **Invalidate CloudFront Cache**
   ```bash
   DISTRIBUTION_ID="E1234567890ABC"  # Replace with actual ID
   
   aws cloudfront create-invalidation \
     --distribution-id ${DISTRIBUTION_ID} \
     --paths "/*"
   ```

5. **Verify Rollback**
   ```bash
   # Check frontend
   curl -f https://misra-platform.com/health
   
   # Check API
   curl -f https://api.misra-platform.com/health
   ```

### Method 3: Manual Backend Rollback

Backend rollback requires CloudFormation stack operations.

**Steps:**

1. **Access CloudFormation Console**
   - Go to AWS Console → CloudFormation
   - Select region (us-east-1)
   - Find stack: `misra-platform-production`

2. **Check Stack Status**
   - If status is `UPDATE_ROLLBACK_FAILED`:
     - Click "Stack actions" → "Continue update rollback"
     - Select resources to skip (if any)
     - Click "Continue update rollback"
   
   - If status is `UPDATE_COMPLETE` or `UPDATE_FAILED`:
     - Review stack events
     - Identify the last successful deployment
     - Note the change set ID

3. **Rollback Options**

   **Option A: Automatic Rollback**
   - CloudFormation automatically rolls back on failure
   - No action needed if rollback succeeds
   
   **Option B: Manual Rollback via CDK**
   ```bash
   cd packages/backend
   
   # Checkout previous commit
   git log --oneline  # Find previous deployment commit
   git checkout <previous-commit-sha>
   
   # Deploy previous version
   npm run build
   npx cdk deploy --context environment=production
   ```
   
   **Option C: Stack Update Rollback**
   - Use AWS Console to continue rollback
   - Or use AWS CLI:
   ```bash
   aws cloudformation continue-update-rollback \
     --stack-name misra-platform-production
   ```

4. **Monitor Rollback**
   ```bash
   # Watch stack events
   aws cloudformation describe-stack-events \
     --stack-name misra-platform-production \
     --max-items 20
   ```

5. **Verify Services**
   - Check Lambda functions are running
   - Verify API Gateway endpoints
   - Test DynamoDB access
   - Check CloudWatch logs

### Method 4: Database Rollback

Database rollback is complex and should be avoided. Use point-in-time recovery if necessary.

**DynamoDB Point-in-Time Recovery:**

1. **Access DynamoDB Console**
   - Go to AWS Console → DynamoDB
   - Select table to restore

2. **Restore to Point in Time**
   - Click "Backups" tab
   - Click "Restore to point-in-time"
   - Select restore date/time
   - Enter new table name (e.g., `misra-platform-users-production-restored`)
   - Click "Restore"

3. **Verify Restored Data**
   - Check item count matches expected
   - Verify recent records exist
   - Test data integrity

4. **Switch to Restored Table**
   - Update Lambda environment variables
   - Point to restored table
   - Or rename tables (requires downtime)

5. **Clean Up**
   - Keep old table for 7 days
   - Delete after verification

## Rollback Validation Checklist

After rollback, verify:

### Frontend
- [ ] Website loads correctly
- [ ] All pages accessible
- [ ] No console errors
- [ ] Assets loading (images, CSS, JS)
- [ ] Authentication works
- [ ] File upload works

### Backend
- [ ] API endpoints responding
- [ ] Authentication working
- [ ] Database queries successful
- [ ] File storage accessible
- [ ] Lambda functions executing

### Monitoring
- [ ] Error rates normal (< 1%)
- [ ] Response times acceptable (< 2s)
- [ ] No CloudWatch alarms firing
- [ ] Health checks passing

### User Experience
- [ ] Critical user flows working
- [ ] No user reports of issues
- [ ] Performance acceptable

## Post-Rollback Actions

1. **Notify Stakeholders**
   - Send email to team
   - Post in Slack
   - Update status page (if applicable)

2. **Document Incident**
   - Create incident report
   - Document root cause
   - List affected users/features
   - Timeline of events

3. **Root Cause Analysis**
   - Identify what went wrong
   - Why wasn't it caught in testing?
   - What can prevent this in future?

4. **Fix Forward**
   - Create fix in development
   - Add tests to prevent regression
   - Deploy fix through normal pipeline

5. **Update Procedures**
   - Update deployment checklist
   - Add new test cases
   - Improve monitoring/alerts

## Rollback Scenarios

### Scenario 1: Frontend Bug

**Symptoms:**
- UI not rendering correctly
- JavaScript errors in console
- Broken user flows

**Rollback:**
- Use automated rollback workflow
- Frontend only (backend unchanged)
- Quick rollback (< 5 minutes)

**Example:**
```bash
# Via GitHub Actions
1. Go to Actions → Emergency Rollback
2. Select "production"
3. Enter "previous"
4. Reason: "Critical UI bug in file upload"
5. Run workflow
```

### Scenario 2: API Breaking Change

**Symptoms:**
- API returning errors
- Frontend can't communicate with backend
- Authentication failing

**Rollback:**
- Rollback both frontend and backend
- May require database rollback
- Longer rollback time (15-30 minutes)

**Example:**
```bash
# Frontend rollback via GitHub Actions
# Backend rollback via CloudFormation Console
# Verify API compatibility
```

### Scenario 3: Database Migration Issue

**Symptoms:**
- Data corruption
- Missing records
- Schema incompatibility

**Rollback:**
- Restore database from backup
- Rollback backend to previous version
- May require downtime
- Longest rollback time (30-60 minutes)

**Example:**
```bash
# 1. Restore DynamoDB table
# 2. Rollback backend via CDK
# 3. Update environment variables
# 4. Verify data integrity
```

### Scenario 4: Performance Degradation

**Symptoms:**
- Slow response times
- Timeouts
- High CPU/memory usage

**Rollback:**
- Rollback backend first
- Monitor performance metrics
- May not need frontend rollback

**Example:**
```bash
# 1. Rollback backend via CloudFormation
# 2. Monitor CloudWatch metrics
# 3. Verify performance improved
# 4. Keep frontend if unaffected
```

## Emergency Contacts

In case of critical issues:

- **DevOps Lead:** [Contact Info]
- **Backend Lead:** [Contact Info]
- **Frontend Lead:** [Contact Info]
- **AWS Support:** [Support Plan Details]

## Rollback Testing

Test rollback procedures quarterly:

1. **Schedule Test**
   - Pick low-traffic time
   - Notify team in advance
   - Prepare test plan

2. **Execute Test Rollback**
   - Deploy test change to staging
   - Perform rollback
   - Measure rollback time
   - Document issues

3. **Review Results**
   - What worked well?
   - What needs improvement?
   - Update procedures

4. **Update Documentation**
   - Incorporate lessons learned
   - Update rollback times
   - Add new scenarios

## Backup Retention Policy

- **Development:** 7 days
- **Staging:** 14 days
- **Production:** 30 days

Backups are automatically created:
- Before each production deployment
- Daily at 2 AM UTC
- After major changes

## Additional Resources

- [AWS CloudFormation Rollback](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html)
- [DynamoDB Point-in-Time Recovery](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/PointInTimeRecovery.html)
- [S3 Versioning](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html)
- [CI/CD Guide](./CI_CD_GUIDE.md)
