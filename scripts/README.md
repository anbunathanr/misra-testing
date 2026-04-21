# MISRA Platform Deployment Scripts

This directory contains comprehensive deployment, migration, configuration management, and rollback scripts for the MISRA Platform.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Scripts](#deployment-scripts)
- [Database Migration Scripts](#database-migration-scripts)
- [Configuration Management](#configuration-management)
- [Rollback Procedures](#rollback-procedures)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The scripts in this directory provide a complete toolkit for managing the MISRA Platform across multiple environments (dev, staging, production).

### Script Categories

1. **Deployment Scripts** - Deploy the platform to AWS environments
2. **Migration Scripts** - Manage DynamoDB schema changes
3. **Configuration Scripts** - Manage environment variables and secrets
4. **Rollback Scripts** - Quickly revert to previous deployments

## Prerequisites

### Required Tools

- **AWS CLI** (v2.x or later)
  ```bash
  aws --version
  ```

- **AWS CDK** (v2.x or later)
  ```bash
  npm install -g aws-cdk
  cdk --version
  ```

- **Node.js** (v18 or later)
  ```bash
  node --version
  ```

- **jq** (for JSON processing)
  ```bash
  # macOS
  brew install jq
  
  # Ubuntu/Debian
  sudo apt-get install jq
  
  # Windows (via Chocolatey)
  choco install jq
  ```

### AWS Configuration

1. Configure AWS credentials:
   ```bash
   aws configure
   ```

2. Set up AWS profiles for different environments (optional):
   ```bash
   aws configure --profile dev
   aws configure --profile staging
   aws configure --profile production
   ```

3. Bootstrap CDK (first time only):
   ```bash
   cd packages/backend
   cdk bootstrap
   ```

### Make Scripts Executable

```bash
chmod +x scripts/*.sh
chmod +x scripts/migrations/*.sh
```

## Deployment Scripts

### Environment-Specific Deployment

Deploy the platform to a specific environment with full control over the deployment process.

#### Bash (Linux/macOS)

```bash
# Deploy to development
./scripts/deploy-env.sh dev

# Deploy to staging (skip tests)
./scripts/deploy-env.sh staging --skip-tests

# Deploy to production (dry run first)
./scripts/deploy-env.sh production --dry-run
./scripts/deploy-env.sh production

# Deploy backend only
./scripts/deploy-env.sh dev --skip-frontend

# Deploy with all options
./scripts/deploy-env.sh staging --skip-tests --skip-build
```

#### PowerShell (Windows)

```powershell
# Deploy to development
.\scripts\deploy-env.ps1 -Environment dev

# Deploy to staging (skip tests)
.\scripts\deploy-env.ps1 -Environment staging -SkipTests

# Deploy to production (dry run first)
.\scripts\deploy-env.ps1 -Environment production -DryRun
.\scripts\deploy-env.ps1 -Environment production

# Deploy backend only
.\scripts\deploy-env.ps1 -Environment dev -SkipFrontend
```

### Deployment Options

| Option | Description |
|--------|-------------|
| `--skip-tests` | Skip running tests before deployment |
| `--skip-build` | Skip building Lambda functions |
| `--skip-frontend` | Skip frontend deployment |
| `--dry-run` | Show what would be deployed without actually deploying |

### Deployment Outputs

After successful deployment, the scripts will:
- Save deployment metadata to `deployments/<environment>-<timestamp>.json`
- Display API Gateway URL, User Pool ID, and other important outputs
- Create CloudWatch logs for monitoring

## Database Migration Scripts

Manage DynamoDB schema changes safely with backup and rollback capabilities.

### Running Migrations

```bash
# Run a migration
./scripts/migrate-database.sh dev add-user-role-attribute

# List available migrations
ls -1 scripts/migrations/*.sh
```

### Creating a New Migration

1. Copy an example migration:
   ```bash
   cp scripts/migrations/example-add-gsi.sh scripts/migrations/my-migration.sh
   ```

2. Edit the migration file:
   ```bash
   nano scripts/migrations/my-migration.sh
   ```

3. Implement the `migrate()` function:
   ```bash
   migrate() {
       local ENVIRONMENT=$1
       local TABLE_NAME="misra-platform-users-$ENVIRONMENT"
       
       # Your migration logic here
       echo "Running migration..."
       
       # Example: Add a new attribute
       aws dynamodb update-table \
           --table-name "$TABLE_NAME" \
           --attribute-definitions AttributeName=newField,AttributeType=S
       
       return 0
   }
   ```

4. Optionally implement the `rollback()` function:
   ```bash
   rollback() {
       local ENVIRONMENT=$1
       # Your rollback logic here
       return 0
   }
   ```

### Migration Examples

#### Example 1: Add Global Secondary Index

```bash
./scripts/migrate-database.sh dev example-add-gsi
```

This migration adds a new GSI to the users table for querying by status.

#### Example 2: Add Attribute to Existing Items

```bash
./scripts/migrate-database.sh dev example-add-attribute
```

This migration adds a default `role` attribute to all existing users.

### Migration Safety Features

- **Automatic Backups**: All tables are backed up before migration
- **Backup Location**: `scripts/backups/<environment>/`
- **Migration History**: Tracked in `scripts/migration-history.json`
- **Rollback Support**: Optional rollback functions for each migration

## Configuration Management

Manage environment variables and secrets across environments.

### Setting Configuration Values

```bash
# Set a configuration value
./scripts/manage-config.sh set dev JWT_SECRET my-secret-key
./scripts/manage-config.sh set production API_URL https://api.misra-platform.com

# Set multiple values
./scripts/manage-config.sh set staging DATABASE_URL dynamodb://...
./scripts/manage-config.sh set staging REGION us-east-1
```

### Getting Configuration Values

```bash
# Get a specific value
./scripts/manage-config.sh get dev JWT_SECRET

# List all configuration
./scripts/manage-config.sh list production
```

### Syncing to AWS Secrets Manager

```bash
# Sync configuration to AWS Secrets Manager
./scripts/manage-config.sh sync production

# This creates/updates a secret named:
# misra-platform/config/<environment>
```

### Exporting Configuration

```bash
# Export to .env file
./scripts/manage-config.sh export dev

# Export to custom file
./scripts/manage-config.sh export staging .env.staging
```

### Importing Configuration

```bash
# Import from .env file
./scripts/manage-config.sh import dev .env.local

# Import from JSON file
./scripts/manage-config.sh import production config.json
```

### Configuration Storage

- **Local Storage**: `scripts/config/<environment>.json`
- **AWS Storage**: Secrets Manager secret `misra-platform/config/<environment>`
- **Format**: JSON key-value pairs

## Rollback Procedures

Quickly revert to a previous deployment in case of issues.

### Rollback to Previous Deployment

```bash
# Rollback to the previous deployment
./scripts/rollback.sh production --to-previous

# Dry run first (recommended)
./scripts/rollback.sh production --to-previous --dry-run
```

### Rollback to Specific Version

```bash
# List available versions
./scripts/rollback.sh production --list-versions

# Rollback to specific version
./scripts/rollback.sh production --to-version v1.2.3
```

### Partial Rollback

```bash
# Rollback backend only
./scripts/rollback.sh production --to-previous --backend-only

# Rollback frontend only
./scripts/rollback.sh production --to-previous --frontend-only
```

### Rollback Options

| Option | Description |
|--------|-------------|
| `--to-previous` | Rollback to the previous deployment |
| `--to-version <version>` | Rollback to a specific version |
| `--list-versions` | List available versions to rollback to |
| `--backend-only` | Rollback backend only |
| `--frontend-only` | Rollback frontend only |
| `--dry-run` | Show what would be rolled back without actually doing it |

### Rollback Safety Features

- **Git-based**: Uses git commits to ensure exact code state
- **Metadata Tracking**: Deployment history stored in `deployments/` directory
- **Confirmation Required**: Production rollbacks require explicit confirmation
- **Rollback History**: Tracked in `scripts/rollback-history.json`

## Best Practices

### Deployment Best Practices

1. **Always test in dev first**
   ```bash
   ./scripts/deploy-env.sh dev
   # Test thoroughly
   ./scripts/deploy-env.sh staging
   # Final validation
   ./scripts/deploy-env.sh production
   ```

2. **Use dry-run for production**
   ```bash
   ./scripts/deploy-env.sh production --dry-run
   # Review output
   ./scripts/deploy-env.sh production
   ```

3. **Keep deployment history**
   - Deployment metadata is automatically saved
   - Review `deployments/` directory regularly
   - Keep at least 10 recent deployments

4. **Monitor after deployment**
   - Check CloudWatch logs
   - Run smoke tests
   - Monitor error rates

### Migration Best Practices

1. **Test migrations in dev first**
   ```bash
   ./scripts/migrate-database.sh dev my-migration
   # Verify results
   ./scripts/migrate-database.sh staging my-migration
   ```

2. **Always implement rollback functions**
   - Makes it easy to revert if needed
   - Test rollback in dev environment

3. **Backup before production migrations**
   - Automatic backups are created
   - Verify backup location before proceeding

4. **Use idempotent migrations**
   - Check if changes already exist
   - Safe to run multiple times

### Configuration Best Practices

1. **Never commit secrets to git**
   - Use `scripts/config/` for local storage
   - Add to `.gitignore`
   - Sync to AWS Secrets Manager

2. **Use environment-specific values**
   ```bash
   # Development
   ./scripts/manage-config.sh set dev DEBUG true
   
   # Production
   ./scripts/manage-config.sh set production DEBUG false
   ```

3. **Sync regularly to AWS**
   ```bash
   ./scripts/manage-config.sh sync production
   ```

4. **Document configuration keys**
   - Keep a list of required keys
   - Document expected values

### Rollback Best Practices

1. **Keep deployment history**
   - Don't delete `deployments/` directory
   - Maintain at least 10 recent deployments

2. **Test rollback in staging**
   ```bash
   ./scripts/rollback.sh staging --to-previous --dry-run
   ./scripts/rollback.sh staging --to-previous
   ```

3. **Have a rollback plan**
   - Know which version to rollback to
   - Understand the changes being reverted

4. **Monitor after rollback**
   - Verify system is working correctly
   - Check for any data inconsistencies

## Troubleshooting

### Common Issues

#### AWS Credentials Not Configured

```bash
Error: AWS credentials not configured
```

**Solution:**
```bash
aws configure
# Or use AWS profiles
export AWS_PROFILE=production
```

#### CDK Bootstrap Required

```bash
Error: This stack uses assets, so the toolkit stack must be deployed
```

**Solution:**
```bash
cd packages/backend
cdk bootstrap
```

#### Permission Denied

```bash
Error: Permission denied
```

**Solution:**
```bash
chmod +x scripts/*.sh
chmod +x scripts/migrations/*.sh
```

#### Table Already Exists

```bash
Error: Table already exists
```

**Solution:**
- Check if migration was already run
- Implement idempotent migrations
- Check migration history

#### Deployment Failed

```bash
Error: Deployment failed
```

**Solution:**
1. Check CloudWatch logs
2. Verify AWS credentials
3. Check CDK outputs for errors
4. Run with `--dry-run` first

### Getting Help

1. **Check logs**
   ```bash
   # CloudWatch logs
   aws logs tail /aws/lambda/misra-platform-<function-name> --follow
   
   # CDK logs
   cd packages/backend
   cdk synth
   ```

2. **Verify AWS resources**
   ```bash
   # List stacks
   aws cloudformation list-stacks
   
   # Describe stack
   aws cloudformation describe-stacks --stack-name misra-platform-production
   ```

3. **Check deployment history**
   ```bash
   # List recent deployments
   ls -lt deployments/
   
   # View deployment details
   cat deployments/production-20240101-120000.json | jq
   ```

## Script Reference

### Deployment Scripts

- `deploy-env.sh` / `deploy-env.ps1` - Environment-specific deployment

### Migration Scripts

- `migrate-database.sh` - Run database migrations
- `migrations/example-add-gsi.sh` - Example: Add GSI
- `migrations/example-add-attribute.sh` - Example: Add attribute

### Configuration Scripts

- `manage-config.sh` - Manage configuration values

### Rollback Scripts

- `rollback.sh` - Rollback to previous deployment

### History Files

- `deployments/` - Deployment history
- `migration-history.json` - Migration history
- `rollback-history.json` - Rollback history
- `backups/` - Database backups

## Security Considerations

1. **Secrets Management**
   - Never commit secrets to git
   - Use AWS Secrets Manager for production
   - Rotate secrets regularly

2. **Access Control**
   - Use IAM roles with least privilege
   - Separate AWS accounts for environments
   - Enable MFA for production access

3. **Audit Trail**
   - All operations are logged
   - Deployment history is tracked
   - Review logs regularly

4. **Backup and Recovery**
   - Automatic backups before migrations
   - Point-in-time recovery enabled
   - Test recovery procedures

## Support

For issues or questions:
1. Check this README
2. Review CloudWatch logs
3. Check deployment history
4. Contact the platform team

## License

Copyright © 2024 MISRA Platform. All rights reserved.
