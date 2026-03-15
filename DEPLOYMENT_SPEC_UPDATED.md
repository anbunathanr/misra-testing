# Deployment Spec Updated for Fresh AWS Account

## Summary

The full platform deployment spec has been updated to reflect the simplified deployment approach for a fresh AWS account. Since you closed your old AWS account and will create a new one, the complex blue-green migration strategy is no longer needed.

## What Changed

### Before (Original Spec)
- **Strategy**: Blue-green migration from MinimalStack to MisraPlatformStack
- **Complexity**: High - required data migration, user migration, resource conflict resolution
- **Phases**: 10 phases including preparation, migration, cutover, cleanup
- **Tasks**: 28 tasks with heavy focus on migration scripts and data preservation
- **Timeline**: ~3 days including 24-48 hour monitoring period
- **Risk**: Medium - data loss, migration failures, resource conflicts

### After (Updated Spec)
- **Strategy**: Direct deployment to fresh AWS account
- **Complexity**: Low - clean deployment with no existing resources
- **Phases**: 10 phases focused on setup, deployment, and validation
- **Tasks**: 28 tasks focused on AWS setup, deployment, and testing
- **Timeline**: ~3 hours total
- **Risk**: Low - no data to lose, simple rollback

## Key Improvements

### 1. Simplified Requirements (requirements.md)
- ✅ Removed all migration-related requirements
- ✅ Removed MinimalStack references
- ✅ Added AWS Free Tier optimization requirement
- ✅ Added CDK bootstrap requirement
- ✅ Added secrets creation requirement
- ✅ Updated glossary to reflect fresh deployment

### 2. Simplified Design (design.md)
- ✅ Removed blue-green migration strategy
- ✅ Removed data migration data models
- ✅ Updated correctness properties (no migration validation needed)
- ✅ Simplified error handling (no migration failures)
- ✅ Updated deployment procedures (5 simple phases instead of 7 complex ones)
- ✅ Simplified rollback procedures
- ✅ Updated timeline from 3 days to 3 hours
- ✅ Reduced risk profile significantly

### 3. Completely Rewritten Tasks (tasks.md)
- ✅ Phase 1: AWS Account Setup (new)
- ✅ Phase 2: Create Secrets (simplified)
- ✅ Phase 3: CDK Bootstrap (new)
- ✅ Phase 4: Deploy Stack (simplified, no migration)
- ✅ Phase 5: Seed Data (simplified)
- ✅ Phase 6: Frontend Deployment (simplified)
- ✅ Phase 7: Validation (no migration validation)
- ✅ Phase 8: Property Tests (updated properties)
- ✅ Phase 9: Documentation (simplified)
- ✅ Phase 10: Rollback Procedures (simplified)

## What Was Removed

### Migration-Related Tasks (No Longer Needed)
- ❌ Export Cognito users from MinimalStack
- ❌ Backup AI Usage table
- ❌ Migrate Cognito users to new pool
- ❌ Migrate DynamoDB data
- ❌ Verify data migration
- ❌ Handle resource conflicts
- ❌ Cutover from old to new API
- ❌ Monitoring period (24-48 hours)
- ❌ Cleanup MinimalStack
- ❌ Delete backups

### Migration Scripts (No Longer Needed)
- ❌ `scripts/export-cognito-users.ts`
- ❌ `scripts/migrate-cognito-users.ts`
- ❌ `scripts/migrate-dynamodb-data.ts`
- ❌ `scripts/verify-migration.ts`
- ❌ `scripts/backup-dynamodb-table.ts`

## What You Need to Do

### Step 1: Create AWS Account
Follow the AWS Free Tier setup guide: `AWS_FREE_TIER_SETUP_GUIDE.md`

### Step 2: Follow the Deployment Spec
Execute tasks in order from `tasks.md`:
1. AWS Account Setup (Tasks 1-4)
2. Create Secrets (Tasks 5-7) - Optional
3. CDK Bootstrap (Tasks 8-9)
4. Deploy Stack (Tasks 10-13)
5. Seed Data (Task 14)
6. Deploy Frontend (Tasks 15-17)
7. Validate (Tasks 18-21)

### Step 3: Monitor Costs
- Set up billing alerts immediately
- Monitor free tier usage
- Expected cost: $1-5/month

## Benefits of Fresh Deployment

### 1. Simplicity
- No data migration complexity
- No resource conflicts
- No backward compatibility concerns
- Clean slate to test everything

### 2. Speed
- 3 hours instead of 3 days
- No waiting for migration to complete
- No monitoring period needed
- Immediate validation

### 3. Lower Risk
- No data to lose
- Simple rollback (just delete stack)
- No user impact (no existing users)
- Easy to retry if issues arise

### 4. Cost Optimization
- Already configured for AWS Free Tier
- No duplicate resources during migration
- Estimated $1-5/month (vs $5-15/month with migration overhead)

## Next Steps

1. **Review the updated spec files**:
   - `.kiro/specs/full-platform-deployment/requirements.md`
   - `.kiro/specs/full-platform-deployment/design.md`
   - `.kiro/specs/full-platform-deployment/tasks.md`

2. **Create your AWS account**:
   - Follow `AWS_FREE_TIER_SETUP_GUIDE.md`
   - Set up IAM admin user
   - Configure AWS CLI

3. **Start deployment**:
   - Begin with Task 1 in `tasks.md`
   - Follow tasks in order
   - Document outputs as you go

4. **Monitor and validate**:
   - Test all features after deployment
   - Set up billing alerts
   - Monitor CloudWatch for errors

## Questions?

If you encounter any issues during deployment:
1. Check the error handling section in `design.md`
2. Review rollback procedures if needed
3. Check CloudWatch logs for detailed error messages
4. Verify AWS credentials and permissions

## Summary

The deployment spec is now much simpler and faster. You can deploy the complete AIBTS platform in about 3 hours with minimal risk. The infrastructure code is already complete and optimized for AWS Free Tier, so you just need to follow the tasks in order.

Good luck with your deployment! 🚀
