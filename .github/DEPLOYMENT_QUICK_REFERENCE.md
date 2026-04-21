# Deployment Quick Reference

## Quick Commands

### Deploy to Development
```bash
git checkout develop
git pull origin develop
# Make changes
git add .
git commit -m "feat: your feature"
git push origin develop
# Automatic deployment triggered
```

### Deploy to Staging
```bash
git checkout staging
git merge develop
git push origin staging
# Automatic deployment triggered
```

### Deploy to Production
```bash
git checkout main
git merge staging
git push origin main
# Deployment requires manual approval in GitHub
```

### Manual Deployment
```bash
# Via GitHub Actions UI
Actions → Production Deployment Pipeline → Run workflow
Select environment → Run workflow
```

### Emergency Rollback
```bash
# Via GitHub Actions UI
Actions → Emergency Rollback → Run workflow
Select environment → Enter backup timestamp → Run workflow
```

## Environment URLs

| Environment | Frontend | API | Status |
|-------------|----------|-----|--------|
| Development | https://dev.misra-platform.com | https://api-dev.misra-platform.com | Auto-deploy |
| Staging | https://staging.misra-platform.com | https://api-staging.misra-platform.com | Auto-deploy |
| Production | https://misra-platform.com | https://api.misra-platform.com | Manual approval |

## Deployment Status

Check deployment status:
- GitHub: Repository → Actions
- Slack: #deployments channel
- Email: Check ALERT_EMAIL inbox

## Health Checks

```bash
# Frontend
curl https://misra-platform.com/health

# API
curl https://api.misra-platform.com/health

# All services
npm run health-check
```

## Common Issues

### "Access Denied" Error
```bash
# Check AWS credentials
aws sts get-caller-identity

# Verify IAM permissions
aws iam get-user
```

### Tests Failing
```bash
# Run tests locally
npm test

# Check specific test
npm test -- --testNamePattern="test name"

# Update snapshots
npm test -- -u
```

### CloudFront Not Updating
```bash
# Invalidate cache manually
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Monitoring

### CloudWatch Dashboards
- AWS Console → CloudWatch → Dashboards
- Dashboard: `misra-platform-production`

### Key Metrics
- API Gateway: Request count, latency, errors
- Lambda: Invocations, duration, errors
- DynamoDB: Read/write capacity, throttles

### Alarms
- High error rate (> 5%)
- High latency (> 2s)
- DynamoDB throttling
- Lambda concurrent executions

## Secrets

### View Secrets
- GitHub: Repository → Settings → Secrets and variables → Actions

### Required Secrets
- AWS credentials (per environment)
- CloudFront distribution IDs
- Cognito User Pool IDs
- API URLs
- Notification credentials (Slack, email)

## Approval Process

### Production Deployment
1. Push to `main` branch
2. Workflow starts automatically
3. Tests run
4. Deployment waits for approval
5. Reviewer approves in GitHub
6. Deployment proceeds

### Reviewers
- Add reviewers in: Repository → Settings → Environments → production

## Rollback

### Quick Rollback
```bash
# Via GitHub Actions
Actions → Emergency Rollback → Run workflow
Environment: production
Backup: previous
Reason: [describe issue]
```

### Manual Rollback
```bash
# Frontend
aws s3 sync \
  s3://backup-bucket/TIMESTAMP/ \
  s3://production-bucket/ \
  --delete

# Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

## Notifications

### Slack
- Channel: #deployments
- Webhook: Set in SLACK_WEBHOOK_URL secret

### Email
- Recipients: Set in ALERT_EMAIL secret
- SMTP: Gmail (requires app password)

## Support

### Documentation
- [CI/CD Guide](./CI_CD_GUIDE.md)
- [Secrets Setup](./SECRETS_SETUP.md)
- [Rollback Procedures](./ROLLBACK_PROCEDURES.md)

### Contacts
- DevOps Lead: [Contact]
- Backend Lead: [Contact]
- Frontend Lead: [Contact]

## Checklists

### Pre-Deployment
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Security scan passed
- [ ] Documentation updated

### Post-Deployment
- [ ] Health checks passing
- [ ] No errors in CloudWatch
- [ ] User flows working
- [ ] Stakeholders notified

### Rollback
- [ ] Backup identified
- [ ] Reason documented
- [ ] Approval obtained
- [ ] Rollback executed
- [ ] Validation completed
- [ ] Incident report created
