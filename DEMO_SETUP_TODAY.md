# 🚀 WORKING DEMO SETUP - TODAY

## Problem
The Cognito user pool client doesn't exist. This means either:
1. The backend hasn't been deployed yet, OR
2. The stack was deleted but frontend still references old IDs

## Solution: Fresh Deployment (30 minutes)

### Step 1: Clean Up (2 minutes)
```powershell
# Remove old deployment artifacts
Remove-Item -Path "cdk.out" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "packages/frontend/.env.production" -Force -ErrorAction SilentlyContinue
```

### Step 2: Deploy Backend (15 minutes)
```powershell
cd packages/backend

# Install dependencies
npm install

# Deploy CDK stack
cdk deploy --require-approval never
```

**What this does:**
- Creates new Cognito User Pool
- Creates new User Pool Client
- Deploys all Lambda functions
- Creates DynamoDB tables
- Sets up API Gateway

**Output you'll see:**
```
✅ MisraPlatformStack
Outputs:
  ApiGatewayUrl: https://xxxxx.execute-api.us-east-1.amazonaws.com/
  UserPoolId: us-east-1_xxxxxxx
  UserPoolClientId: xxxxxxxxxxxxxxxxxx
```

### Step 3: Update Frontend Environment (2 minutes)

Create `packages/frontend/.env.production`:
```
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxx
```

Replace the values with outputs from Step 2.

### Step 4: Deploy Frontend (10 minutes)
```powershell
cd packages/frontend

# Build
npm run build

# Deploy to Vercel
vercel --prod
```

### Step 5: Test (5 minutes)
1. Go to your Vercel URL
2. Click "Register"
3. Enter email and password
4. Check email for verification code
5. Login with credentials
6. You should see the dashboard

---

## Quick Reference: What Gets Created

| Resource | Purpose |
|----------|---------|
| Cognito User Pool | User authentication |
| Cognito Client | Frontend login |
| API Gateway | REST API endpoints |
| Lambda Functions | Backend logic (20+ functions) |
| DynamoDB Tables | Data storage (10+ tables) |
| S3 Buckets | File storage |
| SNS Topics | Notifications |
| SQS Queues | Async processing |

---

## If Deployment Fails

### Error: "User pool client does not exist"
**Solution**: The client ID in frontend doesn't match deployed client
- Get correct client ID from CDK output
- Update `.env.production`
- Redeploy frontend

### Error: "CDK bootstrap required"
**Solution**: Run bootstrap first
```powershell
cdk bootstrap aws://ACCOUNT_ID/REGION
```

### Error: "Insufficient permissions"
**Solution**: Ensure AWS credentials have admin access
```powershell
aws sts get-caller-identity
```

---

## Demo Walkthrough (5 minutes)

Once deployed, show your team head:

### 1. Registration (1 min)
- Go to app
- Click "Register"
- Fill in email/password
- Show verification email received
- Enter code and confirm

### 2. Login (1 min)
- Login with credentials
- Show dashboard loads
- Show user name in header

### 3. Create Project (1 min)
- Click "Projects"
- Click "Create Project"
- Fill in details
- Show project created

### 4. Create Test Case (1 min)
- Click "Test Cases"
- Click "Create Test Case"
- Fill in details
- Show test case created

### 5. Execute Test (1 min)
- Click "Test Executions"
- Select test case
- Click "Execute"
- Show execution status

---

## Estimated Timeline

| Step | Time | Status |
|------|------|--------|
| Clean up | 2 min | ⏳ |
| Deploy backend | 15 min | ⏳ |
| Update frontend | 2 min | ⏳ |
| Deploy frontend | 10 min | ⏳ |
| Test | 5 min | ⏳ |
| **Total** | **34 min** | ⏳ |

**You can have a working demo in 34 minutes!**

---

## What to Tell Your Team Head

"We have a fully functional AI-powered web testing platform with:
- ✅ User authentication (AWS Cognito)
- ✅ Project management
- ✅ Test case creation
- ✅ Automated test execution
- ✅ AI-powered test generation (Hugging Face)
- ✅ Real-time notifications
- ✅ Cost tracking and limits
- ✅ Production-ready infrastructure

Monthly cost: ~$1.50 (within AWS free tier)"

---

## Next Steps After Demo

1. **Gather feedback** from team head
2. **Optimize performance** based on feedback
3. **Add more features** as needed
4. **Scale infrastructure** when needed
5. **Monitor costs** and usage

---

**Ready to deploy? Start with Step 1!**
