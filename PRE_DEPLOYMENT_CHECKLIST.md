# Pre-Deployment Checklist

Complete these tasks while waiting for AWS account registration to finish.

## ✅ Local Environment Setup

### 1. Install Required Software

- [ ] **Node.js 20.x or later**
  ```bash
  node --version  # Should be v20.x or higher
  ```
  Download from: https://nodejs.org/

- [ ] **AWS CLI v2**
  ```bash
  aws --version  # Should be aws-cli/2.x.x
  ```
  Download from: https://aws.amazon.com/cli/

- [ ] **AWS CDK CLI**
  ```bash
  npm install -g aws-cdk
  cdk --version  # Should be 2.x.x
  ```

- [ ] **Vercel CLI** (for frontend deployment)
  ```bash
  npm install -g vercel
  vercel --version
  ```

### 2. Install Project Dependencies

- [ ] **Backend dependencies**
  ```bash
  cd packages/backend
  npm install
  ```

- [ ] **Frontend dependencies**
  ```bash
  cd packages/frontend
  npm install
  ```

### 3. Verify Infrastructure Code

- [ ] **Check CDK synthesis works**
  ```bash
  cd packages/backend
  npx cdk synth
  ```
  This should generate CloudFormation templates without errors.

- [ ] **Review the generated template**
  ```bash
  # Check the cdk.out directory
  ls cdk.out/
  ```

## 📝 Prepare API Keys (Optional)

While waiting for AWS, you can prepare these API keys:

### Option 1: OpenAI (Paid - $3-4/month)
- [ ] Go to https://platform.openai.com/api-keys
- [ ] Create new API key
- [ ] Save it securely (you'll need it later)
- [ ] Note: Costs about $3-4/month for AI features

### Option 2: Hugging Face (FREE)
- [ ] Go to https://huggingface.co/settings/tokens
- [ ] Create new token with "Read" access
- [ ] Save it securely (you'll need it later)
- [ ] Note: Free tier available!

### Option 3: N8N (Optional - for advanced workflows)
- [ ] Set up N8N instance if you want workflow automation
- [ ] Get webhook URL and API key
- [ ] Save them securely

## 📚 Review Documentation

- [ ] Read `AWS_FREE_TIER_SETUP_GUIDE.md` - Understand the deployment process
- [ ] Read `DEPLOYMENT_SPEC_UPDATED.md` - Understand what changed
- [ ] Review `.kiro/specs/full-platform-deployment/tasks.md` - See all deployment tasks
- [ ] Review `.kiro/specs/full-platform-deployment/design.md` - Understand the architecture

## 🔍 Understand the Architecture

Review these key files to understand what will be deployed:

- [ ] `packages/backend/src/infrastructure/app.ts` - Entry point
- [ ] `packages/backend/src/infrastructure/misra-platform-stack.ts` - Complete stack definition
- [ ] Review the stack components:
  - DynamoDB tables (Users, Projects, TestSuites, TestCases, TestExecutions, etc.)
  - Lambda functions (50+ functions for all features)
  - API Gateway (HTTP API with all endpoints)
  - S3 buckets (file storage, screenshots)
  - SNS/SQS (notifications, test execution)
  - CloudWatch (monitoring, alarms)
  - EventBridge (scheduled reports)

## 🧪 Run Tests Locally

Make sure everything works before deploying:

- [ ] **Run backend unit tests**
  ```bash
  cd packages/backend
  npm test
  ```

- [ ] **Run backend integration tests** (optional)
  ```bash
  npm run test:integration
  ```

- [ ] **Build frontend**
  ```bash
  cd packages/frontend
  npm run build
  ```

## 📋 Prepare Deployment Information

Create a file to track your deployment details:

- [ ] Create `deployment-info.txt` with:
  ```
  AWS Account ID: [Will fill after account creation]
  AWS Region: us-east-1
  IAM Admin User: admin-user
  Access Key ID: [Will fill after IAM user creation]
  Secret Access Key: [Will fill after IAM user creation - KEEP SECURE]
  
  API Keys:
  - OpenAI: [If using]
  - Hugging Face: [If using]
  - N8N Webhook: [If using]
  - N8N API Key: [If using]
  
  Deployment Outputs (fill after deployment):
  - API Gateway URL: 
  - CloudWatch Dashboard URL:
  - Vercel Frontend URL:
  ```

## 🎯 Quick Reference Commands

Save these for later:

### AWS Account Setup
```bash
# Configure AWS CLI (after account creation)
aws configure

# Verify configuration
aws sts get-caller-identity
```

### CDK Deployment
```bash
# Bootstrap CDK (first time only)
cd packages/backend
npx cdk bootstrap aws://ACCOUNT-ID/us-east-1

# Deploy stack
npx cdk deploy MisraPlatformStack --require-approval never

# Capture outputs
aws cloudformation describe-stacks \
  --stack-name MisraPlatformStack \
  --query 'Stacks[0].Outputs' \
  --output json > platform-stack-outputs.json
```

### Frontend Deployment
```bash
# Build and deploy
cd packages/frontend
npm run build
vercel --prod
```

## 🚨 Common Issues to Avoid

- [ ] **Don't commit AWS credentials to git** - Keep them secure
- [ ] **Don't skip CDK bootstrap** - Required before first deployment
- [ ] **Don't use root account for daily tasks** - Create IAM admin user
- [ ] **Don't forget to enable MFA** - Security best practice
- [ ] **Don't skip billing alerts** - Set up immediately after account creation

## ⏱️ Estimated Time

Once your AWS account is ready:
- AWS setup: 30 minutes
- CDK bootstrap: 5 minutes
- Stack deployment: 10-15 minutes
- Frontend deployment: 10 minutes
- Testing and validation: 30 minutes

**Total: ~1.5-2 hours**

## 📞 Troubleshooting Resources

If you encounter issues:
1. Check `.kiro/specs/full-platform-deployment/design.md` - Error handling section
2. Check CloudWatch logs in AWS Console
3. Review CDK deployment errors in terminal
4. Check `CDK_DEPLOYMENT_TROUBLESHOOTING.md` for common issues

## ✨ What's Already Done

Good news! These are already complete:
- ✅ All infrastructure code written and tested
- ✅ All Lambda functions implemented
- ✅ Frontend application built and ready
- ✅ CDK stack configured for AWS Free Tier
- ✅ Deployment spec updated for fresh account
- ✅ Documentation complete

You just need to:
1. Create AWS account
2. Run deployment commands
3. Configure frontend
4. Test everything

## 🎉 Next Steps

Once your AWS account registration is complete:
1. Come back to this checklist
2. Start with Task 1 in `.kiro/specs/full-platform-deployment/tasks.md`
3. Follow the tasks in order
4. Document your progress

---

**Current Status**: Waiting for AWS account registration ⏳

**Ready to Deploy**: Once AWS account is active ✅
