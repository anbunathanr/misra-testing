# CI/CD Pipeline Guide

## Overview

The MISRA Platform uses GitHub Actions for automated CI/CD across three environments: development, staging, and production. This guide covers the complete deployment pipeline, from code commit to production release.

## Pipeline Architecture

```
┌─────────────┐
│   Commit    │
│   to Git    │
└──────┬──────┘
       │
       v
┌─────────────────────────────────────┐
│     Automated Testing               │
│  - Linting                          │
│  - Unit Tests                       │
│  - Security Scanning                │
└──────┬──────────────────────────────┘
       │
       v
┌─────────────────────────────────────┐
│     Build & Package                 │
│  - Backend (Lambda functions)       │
│  - Frontend (React app)             │
└──────┬──────────────────────────────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       v              v              v              v
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   Dev    │   │ Staging  │   │Production│   │ Rollback │
│  (auto)  │   │  (auto)  │   │ (manual) │   │ (manual) │
└──────────┘   └──────────┘   └──────────┘   └──────────┘
```

## Workflows

### 1. Production Deployment Pipeline (`deploy.yml`)

**Triggers:**
- Push to `develop` branch → Deploy to Development
- Push to `staging` branch → Deploy to Staging
- Push to `main` branch → Deploy to Production (requires approval)
- Manual trigger via workflow_dispatch

**Jobs:**
1. **Test** - Run linting, unit tests, and build
2. **Security Scan** - Run npm audit and Snyk scanning
3. **Deploy Dev** - Deploy to development environment
4. **Deploy Staging** - Deploy to staging environment
5. **Deploy Production** - Deploy to production (with approval)
6. **Post-Deployment Validation** - Health checks and monitoring

**Key Features:**
- Automated testing before deployment
- Security scanning with Snyk
- Environment-specific configurations
- Backup creation before production deployment
- Slack and email notifications
- CloudFront cache invalidation
- Health checks after deployment

### 2. Deployment Notifications (`notifications.yml`)

**Triggers:**
- Completion of Production Deployment Pipeline

**Features:**
- Rich Slack notifications with deployment details
- Email notifications for production deployments
- GitHub deployment status updates
- Optional Microsoft Teams notifications
- Color-coded status indicators

### 3. Emergency Rollback (`rollback.yml`)

**Triggers:**
- Manual trigger only (workflow_dispatch)

**Features:**
- Rollback to previous backup
- Pre-rollback snapshot creation
- Health checks after rollback
- Notifications to team
- Support for staging and production

## Environment Configuration

### Development
- **Branch:** `develop`
- **URL:** https://dev.misra-platform.com
- **Auto-deploy:** Yes
- **Approval required:** No
- **Tests:** Integration tests

### Staging
- **Branch:** `staging`
- **URL:** https://staging.misra-platform.com
- **Auto-deploy:** Yes
- **Approval required:** No (optional: 1 reviewer)
- **Tests:** Full E2E test suite

### Production
- **Branch:** `main`
- **URL:** https://misra-platform.com
- **Auto-deploy:** Yes (after approval)
- **Approval required:** Yes (1-2 reviewers)
- **Tests:** Smoke tests
- **Backup:** Automatic before deployment

## Deployment Process

### Standard Deployment Flow

1. **Developer commits code**
   ```bash
   git checkout develop
   git add .
   git commit -m "feat: add new feature"
   git push origin develop
   ```

2. **Automated testing runs**
   - Linting checks code quality
   - Unit tests verify functionality
   - Security scan checks for vulnerabilities
   - Build process validates compilation

3. **Deployment to Dev**
   - Backend CDK stack deploys
   - Frontend uploads to S3
   - CloudFront cache invalidates
   - Integration tests run
   - Slack notification sent

4. **Promote to Staging**
   ```bash
   git checkout staging
   git merge develop
   git push origin staging
   ```
   - Same process as Dev
   - Full E2E tests run
   - More comprehensive validation

5. **Promote to Production**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```
   - **Manual approval required**
   - Backup created automatically
   - Deployment proceeds after approval
   - Smoke tests run
   - Email + Slack notifications sent

### Manual Deployment

Trigger deployment manually via GitHub Actions UI:

1. Go to Actions → Production Deployment Pipeline
2. Click "Run workflow"
3. Select environment (dev/staging/production)
4. Click "Run workflow"

### Emergency Rollback

If a deployment causes issues:

1. Go to Actions → Emergency Rollback
2. Click "Run workflow"
3. Select environment
4. Enter backup timestamp or use "previous"
5. Provide reason for rollback
6. Click "Run workflow"
7. **Approve the rollback** (for production)

## Secrets Management

All secrets are stored in GitHub Secrets. See [SECRETS_SETUP.md](./SECRETS_SETUP.md) for complete list.

### Required Secrets per Environment

**AWS Credentials:**
- `AWS_ACCESS_KEY_ID_[ENV]`
- `AWS_SECRET_ACCESS_KEY_[ENV]`
- `AWS_ROLE_ARN_[ENV]` (optional)

**CloudFront:**
- `CLOUDFRONT_DISTRIBUTION_ID_[ENV]`

**Cognito:**
- `USER_POOL_ID_[ENV]`
- `USER_POOL_CLIENT_ID_[ENV]`

**API:**
- `API_URL_[ENV]`

**Notifications:**
- `SLACK_WEBHOOK_URL`
- `EMAIL_USERNAME`
- `EMAIL_PASSWORD`
- `ALERT_EMAIL`

## Monitoring & Notifications

### Slack Notifications

Notifications are sent for:
- ✅ Successful deployments
- ❌ Failed deployments
- 🔄 Rollback operations
- 🚨 Critical errors

**Notification includes:**
- Environment
- Status
- Commit SHA and message
- Author
- Link to workflow logs

### Email Notifications

Production deployments trigger email notifications to `ALERT_EMAIL` with:
- Deployment status
- Environment details
- Commit information
- Link to workflow logs

### GitHub Deployment Status

Deployment status is tracked in GitHub:
- View in repository → Environments
- Shows deployment history
- Links to workflow runs

## Best Practices

### 1. Branch Strategy

```
develop → staging → main
   ↓         ↓        ↓
  Dev    Staging   Prod
```

- **Never commit directly to `main`**
- Always merge through `develop` → `staging` → `main`
- Use feature branches for development
- Squash commits when merging to keep history clean

### 2. Testing Strategy

- **Unit tests:** Run on every commit
- **Integration tests:** Run on dev deployment
- **E2E tests:** Run on staging deployment
- **Smoke tests:** Run on production deployment

### 3. Deployment Timing

- **Dev:** Deploy anytime
- **Staging:** Deploy during business hours
- **Production:** Deploy during maintenance windows
  - Recommended: Tuesday-Thursday, 10 AM - 2 PM
  - Avoid: Fridays, weekends, holidays

### 4. Rollback Strategy

- **Always have a rollback plan**
- Test rollback procedure in staging
- Keep backups for at least 30 days
- Document rollback reasons

### 5. Security

- **Rotate secrets every 90 days**
- Use IAM roles instead of access keys when possible
- Enable MFA for production approvals
- Review security scan results before deployment

## Troubleshooting

### Deployment Fails with "Access Denied"

**Cause:** AWS credentials are invalid or insufficient permissions

**Solution:**
1. Verify secrets are set correctly
2. Check IAM permissions
3. Ensure role trust policy allows GitHub Actions

### CloudFront Invalidation Fails

**Cause:** Invalid distribution ID or insufficient permissions

**Solution:**
1. Verify `CLOUDFRONT_DISTRIBUTION_ID` is correct
2. Check IAM permissions include `cloudfront:CreateInvalidation`
3. Ensure distribution exists in the correct region

### Tests Fail in CI but Pass Locally

**Cause:** Environment differences or missing dependencies

**Solution:**
1. Check Node.js version matches (18.x)
2. Verify all dependencies are in package.json
3. Check for environment-specific code
4. Review test logs for specific errors

### Slack Notifications Not Received

**Cause:** Invalid webhook URL or Slack app permissions

**Solution:**
1. Verify `SLACK_WEBHOOK_URL` is correct
2. Test webhook manually with curl
3. Check Slack app is installed in workspace
4. Verify channel permissions

### Deployment Succeeds but Site is Down

**Cause:** Application error or configuration issue

**Solution:**
1. Check CloudWatch logs for errors
2. Verify environment variables are set
3. Check API Gateway and Lambda function status
4. Review CloudFront distribution settings
5. Consider rollback if issue persists

## Monitoring Deployment Health

### CloudWatch Dashboards

View metrics at:
- AWS Console → CloudWatch → Dashboards
- Dashboard name: `misra-platform-[environment]`

**Key Metrics:**
- API Gateway request count and latency
- Lambda invocations and errors
- DynamoDB read/write capacity
- CloudFront cache hit ratio

### CloudWatch Alarms

Alarms are configured for:
- High error rates (> 5%)
- High latency (> 2 seconds)
- DynamoDB throttling
- Lambda concurrent executions

### Health Check Endpoints

- Frontend: `https://[domain]/health`
- API: `https://api.[domain]/health`

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] Code reviewed and approved
- [ ] Security scan passed
- [ ] Documentation updated
- [ ] Database migrations prepared (if any)
- [ ] Rollback plan documented

### During Deployment

- [ ] Monitor deployment logs
- [ ] Watch for errors in CloudWatch
- [ ] Verify health checks pass
- [ ] Check Slack notifications

### Post-Deployment

- [ ] Verify application functionality
- [ ] Check error rates in CloudWatch
- [ ] Monitor user reports
- [ ] Update deployment log
- [ ] Notify stakeholders

## Support

For issues with CI/CD pipeline:
1. Check workflow logs in GitHub Actions
2. Review CloudWatch logs in AWS Console
3. Check Slack notifications for details
4. Contact DevOps team

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Secrets Setup Guide](./SECRETS_SETUP.md)
- [Rollback Procedures](./ROLLBACK_PROCEDURES.md)
