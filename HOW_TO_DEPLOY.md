# How to Deploy the AIBTS Platform

## 🎉 Current Deployment Status

Your website is **ALREADY DEPLOYED AND LIVE**!

- **Frontend URL:** https://aibts-platform.vercel.app
- **Backend API:** https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/
- **Status:** ✅ Fully Operational

---

## 📋 What's Already Deployed

### Backend (AWS)
- ✅ 4 Lambda Functions (AI generation endpoints)
- ✅ API Gateway with Cognito JWT authorization
- ✅ DynamoDB tables (usage tracking, learning data)
- ✅ Cognito User Pool (authentication)
- ✅ Secrets Manager (Hugging Face API key)

### Frontend (Vercel)
- ✅ React application with all pages
- ✅ Authentication flow (register, login, logout)
- ✅ AI test generation UI
- ✅ Test execution interface
- ✅ User profile management

---

## 🔄 How to Redeploy (If Needed)

### Option 1: Automated Deployment (Recommended)

Run the automated deployment script:

```powershell
.\deploy-phase5.ps1
```

This script will:
1. Build the backend
2. Deploy to AWS using CDK
3. Build the frontend
4. Deploy to Vercel
5. Update environment variables

### Option 2: Manual Backend Deployment

```powershell
# Navigate to backend
cd packages/backend

# Install dependencies
npm install

# Build the backend
npm run build

# Deploy to AWS
cdk deploy AITestGenerationStack --require-approval never

# Go back to root
cd ../..
```

### Option 3: Manual Frontend Deployment

```powershell
# Navigate to frontend
cd packages/frontend

# Install dependencies
npm install

# Build the frontend
npm run build

# Deploy to Vercel
vercel --prod

# Go back to root
cd ../..
```

---

## 🔧 Prerequisites for Deployment

### AWS Credentials
You need AWS credentials configured:

```powershell
# Check if credentials are configured
aws sts get-caller-identity

# If not configured, set them up
aws configure
```

Required information:
- AWS Access Key ID
- AWS Secret Access Key
- Default region: us-east-1

### Vercel Account
You need a Vercel account and CLI:

```powershell
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login to Vercel
vercel login
```

### Hugging Face API Key
Already stored in AWS Secrets Manager:
- Secret name: `aibts/huggingface-api-key`
- Status: ✅ Configured

---

## 🌐 Access Your Deployed Website

### 1. Open the Website
Visit: https://aibts-platform.vercel.app

### 2. Register a New Account
- Click "Register" on the login page
- Enter your email and password
- Check your email for verification code
- Enter the verification code
- Click "Verify"

### 3. Login
- Enter your email and password
- Click "Login"
- You'll be redirected to the dashboard

### 4. Start Using the Platform
- Create a project
- Generate AI test cases
- Create test suites
- Execute tests
- View results

---

## 🔍 Verify Deployment

### Check Backend Health
```powershell
curl https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-03-03T..."
}
```

### Check Frontend
Open https://aibts-platform.vercel.app in your browser. You should see the login page.

### Check AWS Resources
```powershell
# List Lambda functions
aws lambda list-functions --query "Functions[?contains(FunctionName, 'aibts')].FunctionName"

# List DynamoDB tables
aws dynamodb list-tables --query "TableNames[?contains(@, 'aibts')]"

# Check Cognito User Pool
aws cognito-idp describe-user-pool --user-pool-id us-east-1_fOSFFEZBd
```

---

## 🚨 Troubleshooting

### Frontend Not Loading
1. Check Vercel deployment status: https://vercel.com/dashboard
2. Check browser console for errors (F12)
3. Verify environment variables in Vercel dashboard

### Backend API Errors
1. Check CloudWatch logs:
   ```powershell
   aws logs tail /aws/lambda/aibts-ai-generate --follow
   ```
2. Verify API Gateway configuration
3. Check Lambda function permissions

### Authentication Issues
1. Verify Cognito User Pool ID in frontend `.env.production`
2. Check Cognito User Pool Client ID
3. Verify API Gateway authorizer configuration

### AI Generation Not Working
1. Check Hugging Face API key in Secrets Manager
2. Verify Lambda function has permission to access secret
3. Check CloudWatch logs for API errors

---

## 💰 Deployment Costs

Your current deployment costs approximately **$1.50/month**:

- Lambda: ~$0.50 (within free tier)
- DynamoDB: ~$0.25 (within free tier)
- API Gateway: ~$0.35 (within free tier)
- Secrets Manager: ~$0.40
- Cognito: $0.00 (within free tier)
- Hugging Face: $0.00 (FREE tier)
- Vercel: $0.00 (Hobby plan)

---

## 📚 Additional Resources

- **Deployment Guide:** DEPLOYMENT_GUIDE.md
- **Testing Guide:** PHASE5_TESTING_GUIDE.md
- **User Guide:** HOW_TO_USE_AIBTS.md
- **Quick Start:** QUICK_START_GUIDE.md
- **Complete Status:** PROJECT_100_PERCENT_COMPLETE.md

---

## 🎯 Next Steps

Your website is already live! You can:

1. **Access it now:** https://aibts-platform.vercel.app
2. **Register an account** and start using it
3. **Share the URL** with others
4. **Monitor usage** in AWS CloudWatch and Vercel dashboard

No deployment needed - everything is ready to use! 🚀
