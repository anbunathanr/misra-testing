# CORS and 404 Errors - Issue Resolution

**Date**: March 10, 2026  
**Status**: ⚠️ PARTIAL DEPLOYMENT - ACTION REQUIRED

---

## 🔍 Problem Analysis

Your application is showing CORS and 404 errors because:

### What You Deployed
- **MinimalStack** - Only AI test generation endpoints:
  - `/ai-test-generation/analyze`
  - `/ai-test-generation/generate`
  - `/ai-test-generation/batch`
  - `/ai-test-generation/usage`

### What Frontend Needs
- `/projects` - Project management ❌ NOT DEPLOYED
- `/files/upload` - File uploads ❌ NOT DEPLOYED
- `/analysis/query` - Analysis results ❌ NOT DEPLOYED
- `/ai/insights` - AI insights ❌ NOT DEPLOYED
- Plus many more endpoints...

---

## 🎯 Solution: Deploy Full Platform Stack

You need to deploy the **MisraPlatformStack** which includes ALL endpoints your frontend needs.

---

## 📋 Pre-Deployment Checklist

Before deploying, verify these are still configured:

1. ✅ AWS CLI configured (Account: 982479882798, Region: us-east-1)
2. ✅ CDK bootstrapped
3. ✅ Secrets created:
   - `aibts/huggingface-api-key` ✅
   - `aibts/openai-api-key` ✅
4. ✅ Environment variables set:
   - `CDK_DEFAULT_ACCOUNT=982479882798`
   - `CDK_DEFAULT_REGION=us-east-1`

---

## 🚀 Deployment Steps

### Step 1: Update app.ts to Use Full Stack

The app.ts file needs to be updated to deploy MisraPlatformStack instead of MinimalStack.

**Current (MinimalStack)**:
```typescript
import { MinimalStack } from './infrastructure/minimal-stack';

const app = new cdk.App();
new MinimalStack(app, 'MinimalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

**Change to (MisraPlatformStack)**:
```typescript
import { MisraPlatformStack } from './infrastructure/misra-platform-stack';

const app = new cdk.App();
new MisraPlatformStack(app, 'MisraPlatformStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
```

### Step 2: Build Backend

```powershell
cd packages/backend
npm run build
```

### Step 3: Deploy Full Stack

```powershell
npx cdk deploy MisraPlatformStack --require-approval never
```

This will deploy:
- All DynamoDB tables (Projects, TestCases, TestSuites, TestExecutions, Files, etc.)
- All Lambda functions (30+ functions)
- Complete API Gateway with all routes
- S3 buckets for file storage
- SNS topics for notifications
- SQS queues for async processing
- EventBridge rules for scheduled tasks

**Deployment time**: ~10-15 minutes

---

## ⚠️ Important Notes

### 1. Stack Name Change
- Old stack: `MinimalStack`
- New stack: `MisraPlatformStack`
- Both can coexist, but you'll use the new API endpoint

### 2. New API Endpoint
After deployment, you'll get a new API Gateway URL. You'll need to:
1. Update `VITE_API_URL` in Vercel environment variables
2. Redeploy frontend on Vercel

### 3. Cognito Configuration
The full stack also creates a Cognito User Pool. You may need to:
- Use the new User Pool ID and Client ID
- OR: Modify the stack to reuse your existing Cognito setup

### 4. Cost Implications
The full stack creates more resources:
- Still within AWS Free Tier for low usage
- Estimated cost: ~$2-5/month (mostly Secrets Manager)

---

## 🔄 Alternative: Quick Fix (Limited Features)

If you want to test ONLY AI features without deploying the full stack:

### Option A: Update Frontend to Hide Non-AI Features

Temporarily disable these pages in your frontend:
- Projects page
- Files page
- Analysis page
- Insights page (non-AI)

Keep only:
- Dashboard
- AI Test Generation features

### Option B: Mock the Missing Endpoints

Create mock Lambda functions for the missing endpoints that return empty arrays.

**Not recommended** - Better to deploy the full stack.

---

## 📝 Recommended Action Plan

### Immediate (Next 20 minutes)

1. **Update app.ts** to use MisraPlatformStack
2. **Build backend**: `npm run build`
3. **Deploy full stack**: `npx cdk deploy MisraPlatformStack`
4. **Get new API URL** from deployment outputs
5. **Update Vercel** environment variable `VITE_API_URL`
6. **Redeploy frontend** on Vercel

### After Deployment

1. Test user registration and login
2. Test project creation
3. Test file upload
4. Test AI test generation
5. Verify all pages load without errors

---

## 🐛 Troubleshooting

### If Deployment Fails

**Error: Table already exists**
- Solution: The MinimalStack created some tables. Either:
  - Delete MinimalStack first: `npx cdk destroy MinimalStack`
  - OR: Modify MisraPlatformStack to use different table names

**Error: Secret not found**
- Solution: Verify secrets exist:
  ```powershell
  aws secretsmanager list-secrets --region us-east-1
  ```

**Error: CDK version mismatch**
- Solution: Ensure CDK 2.150.0:
  ```powershell
  npm list aws-cdk-lib
  ```

### If CORS Errors Persist

1. Check API Gateway CORS configuration includes your Vercel URL
2. Verify `VITE_API_URL` in Vercel matches the new API endpoint
3. Clear browser cache and test in incognito mode

---

## ✅ Success Criteria

Deployment is successful when:

- [ ] CDK deployment completes without errors
- [ ] New API Gateway URL obtained
- [ ] Vercel environment variable updated
- [ ] Frontend redeployed
- [ ] Application loads without 404 errors
- [ ] Application loads without CORS errors
- [ ] Can create a project
- [ ] Can upload a file
- [ ] Can use AI features

---

## 📞 Need Help?

If you encounter issues:

1. Check CloudWatch logs for Lambda errors
2. Verify API Gateway routes are created
3. Test API endpoints directly with curl/Postman
4. Check DynamoDB tables are created

---

**Current Status**: MinimalStack deployed (AI endpoints only)  
**Required Action**: Deploy MisraPlatformStack (all endpoints)  
**Estimated Time**: 20 minutes  
**Complexity**: Medium

