# Project Creation Issue - Root Cause and Fix

## Problem
When clicking "Create" on the Projects page, you get the error: "Failed to create project. Please try again."

## Root Cause
The **DynamoDB tables for Projects, Test Suites, and Test Cases are NOT deployed** to AWS.

Your current deployment (`minimal-stack.ts`) only includes:
- AI Usage Table
- AI Learning Table  
- Lambda functions for AI test generation
- Cognito authentication

It does NOT include:
- Projects table
- Test Suites table
- Test Cases table
- Test Executions table
- Lambda functions for CRUD operations on these tables

## Why This Happened
You deployed using `packages/backend/src/infrastructure/minimal-stack.ts` which was created specifically for AI test generation features only. The full platform infrastructure is in `misra-platform-stack.ts` but was never deployed.

## Solution Options

### Option 1: Deploy the Full Stack (Recommended)
This will deploy ALL the tables and Lambda functions needed for the complete platform.

**Steps:**
1. Check if `misra-platform-stack.ts` includes all necessary resources
2. Update your CDK app to use the full stack instead of minimal stack
3. Deploy to AWS

**Command:**
```powershell
cd packages/backend
cdk deploy MisraPlatformStack
```

### Option 2: Create Missing Tables Manually
Create the DynamoDB tables manually in AWS Console:

**Tables Needed:**
1. **aibts-projects**
   - Partition Key: `projectId` (String)
   - GSI: `userId-index` with partition key `userId`

2. **aibts-test-suites**
   - Partition Key: `suiteId` (String)
   - GSI: `projectId-index` with partition key `projectId`

3. **aibts-test-cases**
   - Partition Key: `testCaseId` (String)
   - GSI: `suiteId-index` with partition key `suiteId`

4. **aibts-test-executions**
   - Partition Key: `executionId` (String)
   - GSI: `projectId-index` with partition key `projectId`

### Option 3: Use the Test Script (Temporary Workaround)
The `test-projects.ps1` script can create projects directly in DynamoDB if the table exists.

## Current Status

Your deployed infrastructure:
- ✅ Cognito User Pool (authentication works)
- ✅ AI Lambda Functions (backend for AI features)
- ✅ AI DynamoDB Tables (usage tracking)
- ❌ Projects Lambda Functions (NOT deployed)
- ❌ Projects DynamoDB Table (NOT deployed)
- ❌ Test Suites/Cases Tables (NOT deployed)

## Recommended Action

**Deploy the full stack** to get all features working:

```powershell
# Navigate to backend
cd D:\Code\misra-testing\packages\backend

# Check what stacks are available
cdk list

# Deploy the full platform stack
cdk deploy MisraPlatformStack
```

This will create all missing tables and Lambda functions, making the entire platform functional.

## After Deployment

Once the full stack is deployed:
1. Refresh your browser
2. Try creating a project again
3. It should work without errors

## Alternative: Minimal Fix

If you only want Projects to work (not Test Suites/Cases/Executions), you could:
1. Create just the `aibts-projects` table manually
2. Deploy Lambda functions for project CRUD operations
3. Update API Gateway to route `/projects` endpoints

But this is more work than just deploying the full stack.

---

**Bottom Line**: Your app needs the full infrastructure deployed, not just the minimal AI stack. Deploy `MisraPlatformStack` to fix this issue.
