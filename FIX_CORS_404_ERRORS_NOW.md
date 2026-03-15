# Fix CORS and 404 Errors - Quick Guide

**Problem**: Your app shows CORS and 404 errors because MinimalStack only deployed AI endpoints, but your frontend needs ALL endpoints (projects, files, analysis, etc.)

**Solution**: Deploy the full platform stack.

---

## 🚀 Quick Fix (3 Commands)

```powershell
# 1. Run the deployment script
.\deploy-full-stack.ps1

# 2. Update Vercel with new API URL (from script output)

# 3. Redeploy frontend on Vercel
```

That's it!

---

## 📋 What the Script Does

1. ✅ Verifies AWS credentials
2. ✅ Sets environment variables
3. ✅ Builds backend code
4. ✅ Deploys MisraPlatformStack (all 30+ Lambda functions)
5. ✅ Saves deployment info to file
6. ✅ Shows you exactly what to update in Vercel

---

## ⏱️ Timeline

- **Deployment**: 10-15 minutes
- **Vercel update**: 2 minutes
- **Testing**: 5 minutes
- **Total**: ~20 minutes

---

## 📝 What Gets Deployed

### DynamoDB Tables
- Projects
- TestCases
- TestSuites
- TestExecutions
- FileMetadata
- Users
- NotificationPreferences
- NotificationTemplates
- NotificationHistory
- AIUsage
- AILearning

### Lambda Functions (30+)
- Project management (create, get, update, delete)
- Test case management
- Test suite management
- Test execution
- File upload/download
- Analysis
- AI test generation
- Notifications
- And more...

### API Gateway
- Complete REST API with all endpoints
- CORS configured for Vercel
- Cognito JWT authorization

### Other Resources
- S3 buckets for file storage
- SNS topics for notifications
- SQS queues for async processing
- EventBridge rules for scheduled tasks

---

## 🔍 After Deployment

### Step 1: Get New API URL

The script will output something like:
```
API Endpoint: https://abc123xyz.execute-api.us-east-1.amazonaws.com
```

### Step 2: Update Vercel

1. Go to https://vercel.com/dashboard
2. Open your project: `aibts-platform`
3. Settings → Environment Variables
4. Update `VITE_API_URL` to the new API endpoint
5. Click "Save"

### Step 3: Redeploy

1. Go to Deployments tab
2. Click ⋯ on the latest deployment
3. Click "Redeploy"
4. Wait 1-2 minutes

### Step 4: Test

1. Open https://aibts-platform.vercel.app
2. Press F12 → Console
3. Should see NO 404 or CORS errors
4. Try creating a project
5. Try uploading a file
6. Try AI features

---

## ⚠️ Potential Issues

### Issue 1: "Table already exists"

**Cause**: MinimalStack created some tables with the same names

**Solution**:
```powershell
# Delete the old stack first
cd packages/backend
npx cdk destroy MinimalStack
# Then run deploy-full-stack.ps1 again
```

### Issue 2: "Secret not found"

**Cause**: Secrets don't exist in Secrets Manager

**Solution**:
```powershell
# Verify secrets exist
aws secretsmanager list-secrets --region us-east-1

# If missing, create them
aws secretsmanager create-secret --name aibts/huggingface-api-key --secret-string "your-token"
aws secretsmanager create-secret --name aibts/openai-api-key --secret-string "dummy"
```

### Issue 3: Still seeing CORS errors

**Cause**: Browser cache or wrong API URL

**Solution**:
1. Clear browser cache (Ctrl + Shift + Delete)
2. Test in incognito window (Ctrl + Shift + N)
3. Verify `VITE_API_URL` in Vercel matches deployment output
4. Hard refresh (Ctrl + Shift + R)

---

## 💰 Cost Impact

**Before (MinimalStack)**: ~$1.60/month
**After (Full Stack)**: ~$2-5/month

Still within AWS Free Tier for low usage!

---

## ✅ Success Checklist

After deployment and Vercel update:

- [ ] No 404 errors in console
- [ ] No CORS errors in console
- [ ] Can create a project
- [ ] Can upload a file
- [ ] Can view analysis results
- [ ] Can use AI features
- [ ] All pages load correctly

---

## 🎯 Ready to Deploy?

Run this command:

```powershell
.\deploy-full-stack.ps1
```

The script will guide you through everything!

---

**Current Status**: MinimalStack (AI only) ❌  
**Target Status**: MisraPlatformStack (Full platform) ✅  
**Action Required**: Run deployment script  
**Time Needed**: 20 minutes
