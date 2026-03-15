# 🚀 Fresh AWS Account Deployment Guide

Complete step-by-step guide to deploy the AIBTS Platform to your new AWS account.

**Estimated Time**: 30-45 minutes  
**Cost**: ~$1.50/month (within AWS free tier)

---

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- ✅ AWS Account created and verified
- ✅ Credit card added to AWS account
- ✅ Node.js 20.x or higher installed
- ✅ Git installed
- ✅ PowerShell or Bash terminal
- ✅ Code editor (VS Code recommended)

---

## 🎯 Phase 1: AWS Account Setup (10 minutes)

### Step 1.1: Create IAM User with Admin Access

1. **Login to AWS Console**
   - Go to https://console.aws.amazon.com
   - Sign in with your root account credentials

2. **Navigate to IAM**
   - Search for "IAM" in the AWS Console search bar
   - Click on "IAM" service

3. **Create New User**
   - Click "Users" in the left sidebar
   - Click "Create user" button
   - Enter username: `aibts-deployer`
   - Click "Next"

4. **Set Permissions**
   - Select "Attach policies directly"
   - Search and check: `AdministratorAccess`
   - Click "Next"
   - Click "Create user"

5. **Create Access Keys**
   - Click on the newly created user `aibts-deployer`
   - Go to "Security credentials" tab
   - Scroll to "Access keys" section
   - Click "Create access key"
   - Select "Command Line Interface (CLI)"
   - Check the confirmation box
   - Click "Next"
   - Add description: "AIBTS Deployment"
   - Click "Create access key"
   - **IMPORTANT**: Copy both:
     - Access key ID
     - Secret access key
   - Save them securely (you won't see the secret again!)

### Step 1.2: Configure AWS CLI

1. **Install AWS CLI** (if not already installed)
   
   **Windows (PowerShell as Administrator):**
   ```powershell
   msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
   ```

   **macOS:**
   ```bash
   brew install awscli
   ```

   **Linux:**
   ```bash
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   ```

2. **Configure AWS Credentials**
   ```bash
   aws configure
   ```
   
   Enter when prompted:
   - AWS Access Key ID: [paste your access key]
   - AWS Secret Access Key: [paste your secret key]
   - Default region name: `us-east-1`
   - Default output format: `json`

3. **Verify Configuration**
   ```bash
   aws sts get-caller-identity
   ```
   
   You should see your account ID and user ARN.

### Step 1.3: Get Your AWS Account ID

```bash
aws sts get-caller-identity --query Account --output text
```

Save this account ID - you'll need it later!

---

## 🎯 Phase 2: Install Dependencies (5 minutes)

### Step 2.1: Install Node.js (if needed)

**Check current version:**
```bash
node --version
```

If version is below 20.x, install Node.js 20.x:
- Download from: https://nodejs.org/
- Install LTS version (20.x or higher)

### Step 2.2: Install AWS CDK

```bash
npm install -g aws-cdk
```

**Verify installation:**
```bash
cdk --version
```

### Step 2.3: Install Project Dependencies

Navigate to your project directory:

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd packages/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ../..
```

---

## 🎯 Phase 3: Configure Environment (5 minutes)

### Step 3.1: Set AWS Account ID

**Windows PowerShell:**
```powershell
$env:CDK_DEFAULT_ACCOUNT = "YOUR_ACCOUNT_ID_HERE"
$env:CDK_DEFAULT_REGION = "us-east-1"
```

**macOS/Linux:**
```bash
export CDK_DEFAULT_ACCOUNT="YOUR_ACCOUNT_ID_HERE"
export CDK_DEFAULT_REGION="us-east-1"
```

Replace `YOUR_ACCOUNT_ID_HERE` with your actual AWS account ID from Step 1.3.

### Step 3.2: Bootstrap CDK (First Time Only)

This creates the necessary S3 bucket and roles for CDK deployments:

```bash
cd packages/backend
cdk bootstrap aws://YOUR_ACCOUNT_ID_HERE/us-east-1
```

Wait for completion (2-3 minutes). You should see:
```
✅  Environment aws://YOUR_ACCOUNT_ID_HERE/us-east-1 bootstrapped
```

### Step 3.3: Get Hugging Face API Key (Free)

1. Go to https://huggingface.co/
2. Click "Sign Up" (or "Sign In" if you have an account)
3. After signing in, go to https://huggingface.co/settings/tokens
4. Click "New token"
5. Name: `AIBTS Platform`
6. Type: Select "Read"
7. Click "Generate token"
8. **Copy the token** - save it securely!

### Step 3.4: Store Hugging Face API Key in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name aibts/huggingface-api-key \
  --description "Hugging Face API key for AIBTS AI test generation" \
  --secret-string "YOUR_HUGGINGFACE_TOKEN_HERE" \
  --region us-east-1
```

Replace `YOUR_HUGGINGFACE_TOKEN_HERE` with your actual token.

---

## 🎯 Phase 4: Deploy Backend Infrastructure (10 minutes)

### Step 4.1: Build Backend

```bash
cd packages/backend
npm run build
```

Wait for build to complete (1-2 minutes).

### Step 4.2: Deploy CDK Stack

```bash
cdk deploy MinimalStack --require-approval never
```

This will create:
- DynamoDB tables (Projects, TestCases, TestSuites, TestExecutions, etc.)
- Lambda functions (20+ functions)
- API Gateway
- Cognito User Pool
- S3 buckets
- IAM roles and policies
- CloudWatch logs

**Wait for deployment** (5-8 minutes). You'll see progress updates.

### Step 4.3: Save Stack Outputs

After deployment completes, you'll see outputs like:

```
Outputs:
MinimalStack.ApiGatewayUrl = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
MinimalStack.UserPoolId = us-east-1_xxxxxxxxx
MinimalStack.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
```

**IMPORTANT**: Copy these values! You'll need them for frontend configuration.

### Step 4.4: Seed Notification Templates

```bash
aws lambda invoke \
  --function-name aibts-seed-templates \
  --region us-east-1 \
  response.json

cat response.json
```

You should see: `{"statusCode":200,"body":"..."}`

---

## 🎯 Phase 5: Deploy Frontend (10 minutes)

### Step 5.1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 5.2: Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate (email or GitHub).

### Step 5.3: Configure Frontend Environment

Navigate to frontend directory:

```bash
cd packages/frontend
```

Create `.env.production` file:

```bash
# Windows PowerShell
New-Item -Path .env.production -ItemType File

# macOS/Linux
touch .env.production
```

Edit `.env.production` and add:

```env
VITE_API_URL=YOUR_API_GATEWAY_URL_HERE
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=YOUR_USER_POOL_ID_HERE
VITE_USER_POOL_CLIENT_ID=YOUR_USER_POOL_CLIENT_ID_HERE
```

Replace the placeholders with values from Step 4.3.

### Step 5.4: Build Frontend

```bash
npm run build
```

Wait for build to complete (1-2 minutes).

### Step 5.5: Deploy to Vercel

```bash
vercel --prod
```

Follow the prompts:
- Set up and deploy? `Y`
- Which scope? Select your account
- Link to existing project? `N`
- Project name? `aibts-platform` (or your choice)
- Directory? `./` (press Enter)
- Override settings? `N`

Wait for deployment (2-3 minutes).

### Step 5.6: Save Frontend URL

After deployment, you'll see:

```
✅  Production: https://aibts-platform-xxxxx.vercel.app
```

**Copy this URL** - this is your live application!

---

## 🎯 Phase 6: Configure CORS (2 minutes)

### Step 6.1: Update API Gateway CORS

You need to add your Vercel URL to the API Gateway CORS settings.

**Option A: Using AWS Console**

1. Go to AWS Console → API Gateway
2. Find your API (starts with "MinimalStack")
3. Click on the API
4. Go to "CORS" in the left sidebar
5. Click "Configure"
6. Add your Vercel URL to "Access-Control-Allow-Origin"
7. Click "Save"

**Option B: Redeploy with CORS (Recommended)**

Update `packages/backend/src/infrastructure/minimal-stack.ts`:

Find the API Gateway configuration and ensure CORS is configured with your Vercel URL.

Then redeploy:

```bash
cd packages/backend
cdk deploy MinimalStack --require-approval never
```

---

## 🎯 Phase 7: Test Your Deployment (5 minutes)

### Step 7.1: Access Your Application

Open your browser and go to your Vercel URL:
```
https://aibts-platform-xxxxx.vercel.app
```

### Step 7.2: Register a New User

1. Click "Register" or "Sign Up"
2. Enter your email and password
3. Click "Register"
4. Check your email for verification code
5. Enter the verification code
6. Click "Verify"

### Step 7.3: Login

1. Go to login page
2. Enter your email and password
3. Click "Sign In"
4. You should see the dashboard!

### Step 7.4: Create a Test Project

1. Click "Projects" in the sidebar
2. Click "Create Project"
3. Enter project name: "Test Project"
4. Enter description: "My first test project"
5. Click "Create"

### Step 7.5: Verify Backend Connection

Check browser console (F12) for any errors. You should see successful API calls.

---

## 🎯 Phase 8: Verify All Services (5 minutes)

### Step 8.1: Check DynamoDB Tables

```bash
aws dynamodb list-tables --region us-east-1
```

You should see tables like:
- aibts-projects
- aibts-test-cases
- aibts-test-suites
- aibts-test-executions
- aibts-ai-usage
- aibts-ai-learning
- etc.

### Step 8.2: Check Lambda Functions

```bash
aws lambda list-functions --region us-east-1 --query 'Functions[?starts_with(FunctionName, `aibts`)].FunctionName'
```

You should see 20+ Lambda functions.

### Step 8.3: Check Cognito User Pool

```bash
aws cognito-idp list-user-pools --max-results 10 --region us-east-1
```

You should see your user pool.

### Step 8.4: Check CloudWatch Logs

```bash
aws logs describe-log-groups --region us-east-1 --log-group-name-prefix /aws/lambda/aibts
```

You should see log groups for all Lambda functions.

---

## 🎉 Deployment Complete!

Your AIBTS Platform is now fully deployed and operational!

### 📊 What You Have Now

✅ **Frontend**: Live on Vercel  
✅ **Backend**: AWS Lambda + API Gateway  
✅ **Database**: DynamoDB tables  
✅ **Authentication**: AWS Cognito  
✅ **AI Integration**: Hugging Face (1,000 free requests/day)  
✅ **Notifications**: AWS SNS + EventBridge  
✅ **Monitoring**: CloudWatch Logs  

### 💰 Monthly Cost Estimate

- AWS Lambda: $0 (free tier)
- DynamoDB: $0 (free tier)
- API Gateway: $0 (free tier)
- Cognito: $0 (free tier)
- Secrets Manager: ~$0.40
- CloudWatch: $0 (free tier)
- Hugging Face: $0 (free tier)
- Vercel: $0 (hobby plan)

**Total**: ~$0.40-$1.50/month

### 🔗 Important URLs

Save these for future reference:

- **Frontend**: https://aibts-platform-xxxxx.vercel.app
- **API Gateway**: https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
- **AWS Console**: https://console.aws.amazon.com
- **Vercel Dashboard**: https://vercel.com/dashboard

### 📚 Next Steps

1. **Read the User Guide**: `QUICK_START_GUIDE.md`
2. **Explore Features**: Create projects, test cases, and test suites
3. **Try AI Generation**: Use the AI-powered test generation feature
4. **Set Up Notifications**: Configure email/SMS notifications
5. **Monitor Usage**: Check CloudWatch logs and metrics

### 🆘 Troubleshooting

If you encounter issues, check:

1. **CloudWatch Logs**: AWS Console → CloudWatch → Log groups
2. **Browser Console**: F12 → Console tab
3. **API Gateway Logs**: AWS Console → API Gateway → Logs
4. **Deployment Guides**: 
   - `DEPLOYMENT_GUIDE.md`
   - `CDK_DEPLOYMENT_TROUBLESHOOTING.md`
   - `HOW_TO_DEPLOY.md`

### 🔧 Common Issues

**Issue**: "Access Denied" errors
- **Solution**: Verify IAM user has AdministratorAccess policy

**Issue**: Frontend can't connect to backend
- **Solution**: Check CORS configuration and API Gateway URL in `.env.production`

**Issue**: Cognito verification email not received
- **Solution**: Check spam folder, verify email in Cognito console

**Issue**: Lambda function timeout
- **Solution**: Check CloudWatch logs for specific error, may need to increase timeout

### 📞 Support Resources

- **Documentation**: Check all `.md` files in project root
- **AWS Support**: https://console.aws.amazon.com/support/
- **Vercel Support**: https://vercel.com/support
- **Hugging Face Docs**: https://huggingface.co/docs

---

## 🎓 Learning Resources

- **AWS Free Tier**: https://aws.amazon.com/free/
- **AWS CDK Guide**: https://docs.aws.amazon.com/cdk/
- **Cognito Documentation**: https://docs.aws.amazon.com/cognito/
- **Vercel Documentation**: https://vercel.com/docs

---

**Congratulations! Your SaaS platform is live! 🚀**

Start building amazing test automation workflows!
