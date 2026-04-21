# MISRA Platform - Deployment Scripts Guide

## Overview

This guide provides comprehensive documentation for the deployment scripts created for the MISRA Platform production deployment enhancement (Task 3.2).

## What's Included

The deployment scripts package includes:

1. **Environment-Specific Deployment Scripts** (Subtask 3.2.1)
   - `scripts/deploy-env.sh` - Bash deployment script
   - `scripts/deploy-env.ps1` - PowerShell deployment script
   - Support for dev, staging, and production environments
   - Options for skipping tests, builds, or frontend deployment
   - Dry-run mode for safe testing

2. **Database Migration Scripts** (Subtask 3.2.2)
   - `scripts/migrate-database.sh` - Migration runner
   - `scripts/migrations/example-add-gsi.sh` - Example GSI migration
   - `scripts/migrations/example-add-attribute.sh` - Example attribute migration
   - Automatic backup before migrations
   - Migration history tracking

3. **Configuration Management Scripts** (Subtask 3.2.3)
   - `scripts/manage-config.sh` - Configuration management tool
   - Set, get, list, delete configuration values
   - Sync to AWS Secrets Manager
   - Import/export configuration files
   - Environment-specific configuration storage

4. **Rollback Procedures** (Subtask 3.2.4)
   - `scripts/rollback.sh` - Rollback automation
   - Rollback to previous deployment or specific version
   - Git-based rollback for exact code state
   - Partial rollback (backend-only or frontend-only)
   - Rollback history tracking

## Quick Start

### 1. Make Scripts Executable

```bash
chmod +x scripts/*.sh
chmod +x scripts/migrations/*.sh
```

### 2. Deploy to Development

```bash
# Using npm script
npm run deploy:dev

# Or directly
./scripts/deploy-env.sh dev
```

### 3. Deploy to Production

```bash
# Dry run first (recommended)
npm run deploy:production

# Then deploy for real
npm run deploy:production:confirm
```

## Usage Examples

### Deployment

```bash
# Deploy to dev with all features
./scripts/deploy-env.sh dev

# Deploy to staging, skip tests
./scripts/deploy-env.sh staging --skip-tests

# Deploy to production, dry run
./scripts/deploy-env.sh production --dry-run

# Deploy backend only
./scripts/deploy-env.sh dev --skip-frontend
```

### Database Migrations

```bash
# Run a migration
./scripts/migrate-database.sh dev my-migration

# Create a new migration
cp scripts/migrations/example-add-gsi.sh scripts/migrations/my-migration.sh
# Edit my-migration.sh with your changes
./scripts/migrate-database.sh dev my-migration
```

### Configuration Management

```bash
# Set configuration values
./scripts/manage-config.sh set dev JWT_SECRET my-secret
./scripts/manage-config.sh set production API_URL https://api.example.com

# List configuration
./scripts/manage-config.sh list production

# Sync to AWS Secrets Manager
./scripts/manage-config.sh sync production

# Export to .env file
./scripts/manage-config.sh export dev
```

### Rollback

```bash
# List available versions
./scripts/rollback.sh production --list-versions

# Rollback to previous (dry run)
./scripts/rollback.sh production --to-previous --dry-run

# Rollback to previous (for real)
./scripts/rollback.sh production --to-previous

# Rollback to specific version
./scripts/rollback.sh production --to-version v1.2.3
```

## Integration with CI/CD

The deployment scripts are designed to work seamlessly with the GitHub Actions workflows created in Task 3.1.

### GitHub Actions Integration

The `.github/workflows/deploy.yml` workflow uses these scripts:

```yaml
- name: Deploy backend to production
  run: |
    cd packages/backend
    npm run build
    npx cdk deploy --context environment=production --require-approval never
```

### Local vs CI/CD Deployment

- **Local Deployment**: Use the scripts directly for manual deployments
- **CI/CD Deployment**: GitHub Actions automatically runs deployments on push/merge
- **Both**: Use the same underlying CDK deployment process

## Directory Structure

```
scripts/
├── README.md                          # Comprehensive documentation
├── QUICK_REFERENCE.md                 # Quick command reference
├── deploy-env.sh                      # Bash deployment script
├── deploy-env.ps1                     # PowerShell deployment script
├── migrate-database.sh                # Migration runner
├── manage-config.sh                   # Configuration management
├── rollback.sh                        # Rollback automation
├── migrations/                        # Migration scripts
│   ├── example-add-gsi.sh            # Example: Add GSI
│   └── example-add-attribute.sh      # Example: Add attribute
├── config/                            # Configuration storage (gitignored)
│   ├── dev.json
│   ├── staging.json
│   └── production.json
├── backups/                           # Database backups (gitignored)
│   ├── dev/
│   ├── staging/
│   └── production/
├── migration-history.json             # Migration tracking
└── rollback-history.json              # Rollback tracking

deployments/                           # Deployment history (gitignored)
├── dev-20240101-120000.json
├── staging-20240101-130000.json
└── production-20240101-140000.json
```

## Features

### Environment-Specific Deployment

- **Multi-Environment Support**: dev, staging, production
- **Flexible Options**: Skip tests, builds, or frontend deployment
- **Dry-Run Mode**: Test deployments without making changes
- **Automatic Validation**: Checks prerequisites before deployment
- **Deployment History**: Tracks all deployments with metadata

### Database Migrations

- **Safe Migrations**: Automatic backups before changes
- **Idempotent**: Safe to run multiple times
- **Rollback Support**: Optional rollback functions
- **History Tracking**: Records all migrations
- **Template Migrations**: Example migrations to copy and modify

### Configuration Management

- **Environment Isolation**: Separate configuration per environment
- **AWS Integration**: Sync to Secrets Manager
- **Import/Export**: Easy configuration transfer
- **Version Control**: Track configuration changes
- **Secure Storage**: Never commit secrets to git

### Rollback Procedures

- **Quick Recovery**: Rollback in minutes
- **Git-Based**: Uses git commits for exact code state
- **Partial Rollback**: Backend-only or frontend-only
- **Version History**: List and select from previous deployments
- **Safety Checks**: Confirmation required for production

## Best Practices

### 1. Always Test in Dev First

```bash
./scripts/deploy-env.sh dev
# Test thoroughly
./scripts/deploy-env.sh staging
# Final validation
./scripts/deploy-env.sh production --dry-run
./scripts/deploy-env.sh production
```

### 2. Use Dry-Run for Production

```bash
# Always dry-run first
./scripts/deploy-env.sh production --dry-run
# Review output carefully
./scripts/deploy-env.sh production
```

### 3. Keep Deployment History

- Deployment metadata is automatically saved
- Review `deployments/` directory regularly
- Keep at least 10 recent deployments for rollback

### 4. Backup Before Migrations

```bash
# Automatic backups are created
./scripts/migrate-database.sh production my-migration
# Backups saved to scripts/backups/production/
```

### 5. Monitor After Deployment

```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/misra-platform-analyze-file --follow

# Run smoke tests
curl https://api.misra-platform.com/health
```

## Troubleshooting

### Common Issues

#### 1. AWS Credentials Not Configured

```bash
Error: AWS credentials not configured
```

**Solution:**
```bash
aws configure
# Or use AWS profiles
export AWS_PROFILE=production
```

#### 2. Permission Denied

```bash
Error: Permission denied
```

**Solution:**
```bash
chmod +x scripts/*.sh
chmod +x scripts/migrations/*.sh
```

#### 3. CDK Bootstrap Required

```bash
Error: This stack uses assets, so the toolkit stack must be deployed
```

**Solution:**
```bash
cd packages/backend
cdk bootstrap
```

#### 4. Deployment Failed

**Solution:**
1. Check CloudWatch logs
2. Verify AWS credentials
3. Run with `--dry-run` first
4. Check CDK outputs for errors

### Getting Help

1. **Check Documentation**
   - `scripts/README.md` - Comprehensive guide
   - `scripts/QUICK_REFERENCE.md` - Quick commands
   - This guide - Overview and examples

2. **Check Logs**
   ```bash
   # CloudWatch logs
   aws logs tail /aws/lambda/misra-platform-<function> --follow
   
   # Deployment history
   cat deployments/production-latest.json | jq
   ```

3. **Verify Resources**
   ```bash
   # List stacks
   aws cloudformation list-stacks
   
   # Describe stack
   aws cloudformation describe-stacks --stack-name misra-platform-production
   ```

## Security Considerations

### 1. Secrets Management

- Never commit secrets to git
- Use AWS Secrets Manager for production
- Rotate secrets regularly
- Use environment-specific secrets

### 2. Access Control

- Use IAM roles with least privilege
- Separate AWS accounts for environments
- Enable MFA for production access
- Audit access logs regularly

### 3. Backup and Recovery

- Automatic backups before migrations
- Point-in-time recovery enabled
- Test recovery procedures
- Document RTO/RPO targets

### 4. Audit Trail

- All operations are logged
- Deployment history is tracked
- Migration history is recorded
- Rollback history is maintained

## NPM Scripts

The following npm scripts are available in the root `package.json`:

```json
{
  "scripts": {
    "deploy:dev": "bash scripts/deploy-env.sh dev",
    "deploy:staging": "bash scripts/deploy-env.sh staging",
    "deploy:production": "bash scripts/deploy-env.sh production --dry-run",
    "deploy:production:confirm": "bash scripts/deploy-env.sh production",
    "rollback:dev": "bash scripts/rollback.sh dev --to-previous",
    "rollback:staging": "bash scripts/rollback.sh staging --to-previous",
    "rollback:production": "bash scripts/rollback.sh production --to-previous --dry-run",
    "config:list": "bash scripts/manage-config.sh list",
    "config:sync": "bash scripts/manage-config.sh sync"
  }
}
```

### Usage

```bash
# Deploy to dev
npm run deploy:dev

# Deploy to production (dry run)
npm run deploy:production

# Deploy to production (confirmed)
npm run deploy:production:confirm

# Rollback production
npm run rollback:production

# List configuration
npm run config:list dev

# Sync configuration
npm run config:sync production
```

## Windows Support

PowerShell scripts are provided for Windows users:

```powershell
# Deploy to dev
.\scripts\deploy-env.ps1 -Environment dev

# Deploy to production
.\scripts\deploy-env.ps1 -Environment production -DryRun
.\scripts\deploy-env.ps1 -Environment production

# Skip tests
.\scripts\deploy-env.ps1 -Environment staging -SkipTests
```

## Next Steps

1. **Review Documentation**
   - Read `scripts/README.md` for detailed information
   - Check `scripts/QUICK_REFERENCE.md` for quick commands

2. **Test in Development**
   - Deploy to dev environment
   - Test all features
   - Verify deployment metadata

3. **Create Migrations**
   - Copy example migrations
   - Implement your schema changes
   - Test in dev before production

4. **Set Up Configuration**
   - Set environment-specific values
   - Sync to AWS Secrets Manager
   - Document required keys

5. **Deploy to Production**
   - Follow the deployment checklist
   - Use dry-run first
   - Monitor after deployment

## Support

For issues or questions:
1. Check this guide and `scripts/README.md`
2. Review CloudWatch logs
3. Check deployment history
4. Contact the platform team

## Conclusion

The deployment scripts provide a comprehensive toolkit for managing the MISRA Platform across all environments. They integrate seamlessly with the existing CI/CD pipeline and provide safety features like dry-run mode, automatic backups, and rollback capabilities.

Key benefits:
- **Consistency**: Same deployment process across all environments
- **Safety**: Dry-run mode, backups, and rollback capabilities
- **Automation**: Reduces manual steps and human error
- **Traceability**: Complete history of deployments, migrations, and rollbacks
- **Flexibility**: Support for partial deployments and custom configurations

For more information, see:
- `scripts/README.md` - Comprehensive documentation
- `scripts/QUICK_REFERENCE.md` - Quick command reference
- `.github/workflows/deploy.yml` - CI/CD integration
- `.kiro/specs/production-deployment-enhancement/design.md` - Architecture design
