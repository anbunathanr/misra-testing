# 🔧 Fix 503 Errors - Quick Solution

## Problem
All Lambda functions are returning 503 (Service Unavailable). This means they're crashing due to:
1. Missing environment variables
2. Missing IAM permissions
3. Missing dependencies

## Solution: Redeploy with Fixes

### Step 1: Clean and Rebuild Backend
```powershell
cd packages/backend

# Clean
Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall
npm install

# Build
npm run build
```

### Step 2: Redeploy CDK Stack
```powershell
# Destroy old stack (optional - only if you want fresh start)
cdk destroy --force

# Deploy fresh
cdk deploy --require-approval never
```

This will:
- Create new Lambda functions with correct environment variables
- Set up proper IAM permissions
- Create DynamoDB tables with correct configuration
- Configure API Gateway correctly

### Step 3: Get New Outputs
After deployment completes, you'll see:
```
Outputs:
  ApiGatewayUrl: https://xxxxx.execute-api.us-east-1.amazonaws.com/
  UserPoolId: us-east-1_xxxxxxx
  UserPoolClientId: xxxxxxxxxxxxxxxxxx
```

### Step 4: Update Frontend Environment
Create `packages/frontend/.env.production`:
```
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
```

### Step 5: Rebuild and Deploy Frontend
```powershell
cd packages/frontend

# Build
npm run build

# Deploy
vercel --prod
```

### Step 6: Test
1. Go to your Vercel URL
2. Register a new user
3. Login
4. Try creating a project

---

## If Still Getting 503 Errors

### Check Lambda Logs
```powershell
# Check create-project function
aws logs tail /aws/lambda/misra-platform-create-project --follow

# Check file upload function
aws logs tail /aws/lambda/misra-platform-file-upload --follow

# Check analysis function
aws logs tail /aws/lambda/misra-platform-analysis --follow
```

### Common Issues

**Issue**: "Cannot find module"
- Solution: Run `npm install` in backend directory

**Issue**: "Missing environment variable"
- Solution: Check CDK stack is deploying with correct env vars

**Issue**: "DynamoDB table not found"
- Solution: Check tables exist in AWS console

---

## Estimated Time: 20 minutes

1. Clean & rebuild: 5 min
2. Deploy CDK: 10 min
3. Update frontend: 3 min
4. Deploy frontend: 2 min

**Total: 20 minutes to working demo**

---

## Alternative: Use Mock Data (Fastest)

If you need a demo in 5 minutes, I can:
1. Create mock API responses
2. Disable backend calls
3. Show UI with hardcoded data

This lets you demo the UI/UX without backend issues.

**Which approach do you prefer?**
- Option A: Fix backend (20 min, fully working)
- Option B: Mock data (5 min, UI only)
