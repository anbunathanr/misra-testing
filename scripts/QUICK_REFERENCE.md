# Deployment Scripts - Quick Reference

## Common Commands

### Deploy to Environment

```bash
# Development
./scripts/deploy-env.sh dev

# Staging
./scripts/deploy-env.sh staging

# Production (with dry-run first)
./scripts/deploy-env.sh production --dry-run
./scripts/deploy-env.sh production
```

### Rollback

```bash
# List available versions
./scripts/rollback.sh production --list-versions

# Rollback to previous
./scripts/rollback.sh production --to-previous --dry-run
./scripts/rollback.sh production --to-previous
```

### Configuration Management

```bash
# Set configuration
./scripts/manage-config.sh set dev API_KEY abc123

# List configuration
./scripts/manage-config.sh list production

# Sync to AWS
./scripts/manage-config.sh sync production
```

### Database Migrations

```bash
# Run migration
./scripts/migrate-database.sh dev my-migration

# List migrations
ls -1 scripts/migrations/*.sh
```

## Emergency Procedures

### Production Deployment Failed

1. Check CloudWatch logs:
   ```bash
   aws logs tail /aws/lambda/misra-platform-analyze-file --follow
   ```

2. Rollback immediately:
   ```bash
   ./scripts/rollback.sh production --to-previous
   ```

3. Investigate issue in staging

### Database Migration Failed

1. Check backup location:
   ```bash
   ls -lt scripts/backups/production/
   ```

2. Review migration history:
   ```bash
   cat scripts/migration-history.json | jq
   ```

3. Contact team for manual recovery if needed

### Configuration Issues

1. Export current configuration:
   ```bash
   ./scripts/manage-config.sh export production
   ```

2. Compare with expected values

3. Update and sync:
   ```bash
   ./scripts/manage-config.sh set production KEY value
   ./scripts/manage-config.sh sync production
   ```

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and approved
- [ ] Tests passing locally
- [ ] Deployed to dev and tested
- [ ] Deployed to staging and tested
- [ ] Backup verification completed
- [ ] Rollback plan documented

### Deployment

- [ ] Run dry-run first
- [ ] Deploy to production
- [ ] Verify health checks
- [ ] Run smoke tests
- [ ] Monitor CloudWatch logs

### Post-Deployment

- [ ] Verify all features working
- [ ] Check error rates
- [ ] Monitor performance metrics
- [ ] Update documentation
- [ ] Notify team of deployment

## Useful AWS Commands

```bash
# List CloudFormation stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Describe stack
aws cloudformation describe-stacks --stack-name misra-platform-production

# List Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `misra-platform`)].FunctionName'

# Tail Lambda logs
aws logs tail /aws/lambda/misra-platform-analyze-file --follow

# List DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?starts_with(@, `misra-platform`)]'

# List S3 buckets
aws s3 ls | grep misra-platform

# CloudFront distributions
aws cloudfront list-distributions --query 'DistributionList.Items[].{Id:Id,DomainName:DomainName}'
```

## Monitoring Commands

```bash
# Check API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=misra-platform-api-production \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# Check Lambda errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=misra-platform-analyze-file \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

## Contact Information

- **Platform Team**: platform-team@example.com
- **On-Call**: oncall@example.com
- **Slack Channel**: #misra-platform
- **Documentation**: https://docs.misra-platform.com
