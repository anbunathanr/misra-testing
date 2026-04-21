# Task 3.3: Staging Deployment Report

**Date**: 2024-01-XX  
**Task**: Deploy to Staging Using Existing Working Stack  
**Status**: ⚠️ BLOCKED - Resource Name Conflicts  

---

## Executive Summary

Attempted to deploy the MISRA Platform to staging environment using the existing working `misra-platform-stack.ts`. The deployment was blocked due to **hardcoded resource names** that conflict with the existing production deployment.

### Key Findings

✅ **CDK Configuration Updated**: Changed `cdk.json` to use `src/infrastructure/app.ts` (working stack)  
✅ **Stack Compiles Successfully**: No TypeScript errors in `misra-platform-stack.ts`  
✅ **CDK Synthesis Works**: CloudFormation template generates successfully  
❌ **Deployment Blocked**: 50+ resources have hardcoded names that conflict with production  

---

## Root Cause Analysis

### 1. Existing Production Stack
- **Stack Name**: `MisraPlatformProductionStack`
- **Status**: CREATE_COMPLETE
- **Created**: 2026-04-14

### 2. Resource Naming Issues

The `misra-platform-stack.ts` uses **hardcoded resource names** throughout:

#### Lambda Functions (Examples)
```typescript
functionName: 'misra-platform-get-report'
functionName: 'misra-platform-login'
functionName: 'aibts-get-preferences'
```

#### DynamoDB Tables (Examples)
```typescript
tableName: 'misra-platform-users'
tableName: 'misra-platform-analyses'
tableName: 'TestCases'
tableName: 'TestSuites'
```

#### S3 Buckets (Examples)
```typescript
bucketName: `misra-platform-files-${this.account}`
bucketName: `misra-platform-frontend-${this.account}`
bucketName: 'misra-platform-screenshots-dev'
```

#### SQS Queues (Examples)
```typescript
queueName: 'misra-platform-processing'
queueName: 'aibts-notification-queue'
```

#### CloudWatch Alarms (Examples)
```typescript
alarmName: 'aibts-notification-dlq-depth'
alarmName: 'aibts-notification-queue-depth'
```

### 3. Conflict Details

When attempting to deploy with stack name `MisraPlatform-staging-Stack`, CloudFormation validation failed with:

```
Resource of type 'AWS::Lambda::Function' with identifier 'misra-platform-get-report' already exists
Resource of type 'AWS::DynamoDB::Table' with identifier 'misra-platform-users' already exists
Resource of type 'AWS::S3::Bucket' with identifier 'misra-platform-files-982479882798' already exists
... (50+ similar errors)
```

---

## Solution Options

### Option 1: Environment-Specific Resource Names (RECOMMENDED)

**Approach**: Modify `misra-platform-stack.ts` to accept an `environment` parameter and use it in all resource names.

**Changes Required**:
```typescript
export interface MisraPlatformStackProps extends cdk.StackProps {
  environment?: string; // 'dev' | 'staging' | 'production'
}

export class MisraPlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: MisraPlatformStackProps) {
    super(scope, id, props);
    
    const env = props?.environment || 'production';
    
    // Use environment in all resource names
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: `misra-platform-login-${env}`,
      // ...
    });
    
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `misra-platform-users-${env}`,
      // ...
    });
  }
}
```

**Pros**:
- Clean separation between environments
- Can deploy multiple environments simultaneously
- Follows AWS best practices

**Cons**:
- Requires modifying ~200+ resource definitions
- Estimated time: 4-6 hours
- Requires thorough testing

**Implementation Steps**:
1. Add `environment` prop to stack interface
2. Update all Lambda function names (30+ functions)
3. Update all DynamoDB table names (15+ tables)
4. Update all S3 bucket names (3 buckets)
5. Update all SQS queue names (6+ queues)
6. Update all CloudWatch alarm names (10+ alarms)
7. Update all SNS topic names (3 topics)
8. Update environment variables in Lambda functions
9. Test deployment to staging
10. Verify all functionality works

---

### Option 2: Update Existing Production Stack

**Approach**: Deploy changes to the existing `MisraPlatformProductionStack` instead of creating a new staging stack.

**Command**:
```bash
cd packages/backend
npx cdk deploy MisraPlatformStack --require-approval never
```

**Pros**:
- No code changes required
- Immediate deployment possible
- Uses existing working stack

**Cons**:
- Updates production resources (risky)
- No separate staging environment
- Cannot test changes in isolation

**Risk Level**: HIGH - Not recommended for production systems

---

### Option 3: Delete Existing Stack and Redeploy

**Approach**: Delete `MisraPlatformProductionStack`, then deploy fresh staging stack.

**Commands**:
```bash
# Delete existing stack
aws cloudformation delete-stack --stack-name MisraPlatformProductionStack

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name MisraPlatformProductionStack

# Deploy new staging stack
cd packages/backend
npx cdk deploy --context environment=staging --all --require-approval never
```

**Pros**:
- Clean slate for staging deployment
- No resource conflicts

**Cons**:
- **DESTROYS ALL PRODUCTION DATA**
- Deletes all DynamoDB tables, S3 buckets, Lambda functions
- Requires complete redeployment
- Downtime for production users

**Risk Level**: CRITICAL - Only use if production data is not important

---

### Option 4: Use Minimal Stack for Staging

**Approach**: Deploy using the simpler `minimal-stack.ts` which has fewer resources and may not have naming conflicts.

**Command**:
```bash
cd packages/backend
# Update cdk.json to use minimal-stack
npx cdk deploy MinimalMisraStack --context environment=staging
```

**Pros**:
- Fewer resources = fewer conflicts
- Faster deployment
- Good for initial testing

**Cons**:
- Missing many features (notifications, AI, monitoring)
- Not representative of full production stack
- Still may have some naming conflicts

---

## Recommended Path Forward

### Immediate Action (Next 30 minutes)

**Decision Point**: Choose one of the following:

1. **If production data is NOT important**: Use Option 3 (delete and redeploy)
2. **If production data IS important**: Use Option 1 (environment-specific names)
3. **If quick staging test needed**: Use Option 4 (minimal stack)

### Long-Term Solution (Next Sprint)

Implement **Option 1** (environment-specific resource names) properly:

1. Create a new branch: `feature/environment-specific-resources`
2. Modify `misra-platform-stack.ts` to accept environment parameter
3. Update all resource names to include environment suffix
4. Update `app.ts` to pass environment from context
5. Test deployment to dev environment
6. Test deployment to staging environment
7. Document deployment process
8. Merge to main branch

---

## Current Stack Configuration

### Updated Files

**File**: `packages/backend/cdk.json`
```json
{
  "app": "npx ts-node --prefer-ts-exts src/infrastructure/app.ts",
  // ... rest of config
}
```

**File**: `packages/backend/src/infrastructure/app.ts`
```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MisraPlatformStack } from './misra-platform-stack';

const app = new cdk.App();

// Get environment from context or default to production
const environment = app.node.tryGetContext('environment') || 'production';

// Deploy Full Platform Stack with authentication functions
new MisraPlatformStack(app, `MisraPlatform-${environment}-Stack`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: environment,
    Project: 'MISRA-Platform',
  },
});

app.synth();
```

### Verification Commands

```bash
# Check existing stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Synthesize CloudFormation template
cd packages/backend
npx cdk synth --context environment=staging

# Show diff (what would change)
npx cdk diff --context environment=staging

# Deploy (when ready)
npx cdk deploy --context environment=staging --all --require-approval never
```

---

## Next Steps

### If Proceeding with Option 1 (Environment-Specific Names)

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/environment-specific-resources
   ```

2. **Modify Stack Interface**
   - Add `environment` prop to `MisraPlatformStackProps`
   - Update constructor to use environment in resource names

3. **Update Resource Names** (Priority Order)
   - Lambda functions (highest priority)
   - DynamoDB tables
   - S3 buckets
   - SQS queues
   - SNS topics
   - CloudWatch alarms

4. **Test Deployment**
   ```bash
   npx cdk deploy --context environment=dev --all
   ```

5. **Deploy to Staging**
   ```bash
   npx cdk deploy --context environment=staging --all
   ```

### If Proceeding with Option 3 (Delete and Redeploy)

⚠️ **WARNING**: This will delete all production data!

1. **Backup Data** (if needed)
   ```bash
   # Backup DynamoDB tables
   aws dynamodb create-backup --table-name misra-platform-users --backup-name users-backup-$(date +%Y%m%d)
   
   # Backup S3 buckets
   aws s3 sync s3://misra-platform-files-982479882798 ./backup/files/
   ```

2. **Delete Stack**
   ```bash
   aws cloudformation delete-stack --stack-name MisraPlatformProductionStack
   aws cloudformation wait stack-delete-complete --stack-name MisraPlatformProductionStack
   ```

3. **Deploy Fresh Stack**
   ```bash
   cd packages/backend
   npx cdk deploy --context environment=staging --all --require-approval never
   ```

---

## Deployment Checklist (When Ready)

### Pre-Deployment
- [ ] Choose deployment option (1, 3, or 4)
- [ ] Backup production data (if applicable)
- [ ] Review resource naming strategy
- [ ] Update environment variables
- [ ] Test CDK synthesis
- [ ] Review CloudFormation diff

### Deployment
- [ ] Execute deployment command
- [ ] Monitor CloudFormation events
- [ ] Check for errors
- [ ] Verify stack creation

### Post-Deployment
- [ ] Run health checks
- [ ] Test authentication flow
- [ ] Test file upload
- [ ] Test MISRA analysis
- [ ] Verify API endpoints
- [ ] Check CloudWatch logs
- [ ] Update frontend environment variables
- [ ] Deploy frontend to staging

---

## Conclusion

The staging deployment is **BLOCKED** due to hardcoded resource names in `misra-platform-stack.ts` that conflict with the existing production deployment. 

**Recommended Action**: Implement **Option 1** (environment-specific resource names) for a proper multi-environment setup.

**Alternative**: If production data is not critical, use **Option 3** (delete and redeploy) for immediate staging deployment.

**Estimated Time**:
- Option 1: 4-6 hours (proper solution)
- Option 3: 30 minutes (destructive solution)
- Option 4: 1 hour (limited functionality)

---

**Report Generated**: 2024-01-XX  
**Task**: 3.3 Deploy to Staging Environment  
**Status**: BLOCKED - Awaiting Decision on Deployment Strategy
