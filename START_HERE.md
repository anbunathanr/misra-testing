# 🚀 START HERE - AIBTS Platform Deployment

Welcome! This guide will help you deploy your AIBTS Platform to AWS in under 45 minutes.

---

## 📖 What You're Deploying

The **AIBTS (AI-Based Testing System)** is a complete SaaS platform for automated web application testing with:

- ✅ User authentication (AWS Cognito)
- ✅ AI-powered test generation (Hugging Face)
- ✅ Automated test execution (Playwright)
- ✅ Real-time notifications (Email, SMS, Webhooks)
- ✅ Project and test management
- ✅ Cost tracking and usage limits
- ✅ Comprehensive monitoring

**Monthly Cost**: ~$1.50 (within AWS free tier)

---

## 🎯 Choose Your Deployment Method

### Option 1: Automated Deployment (Recommended)

**Best for**: Quick deployment with minimal manual steps

1. **Run the automated script**:
   ```powershell
   .\deploy-to-aws.ps1
   ```

2. **Follow the prompts** to enter:
   - AWS region (default: us-east-1)
   - Hugging Face API key

3. **Wait for completion** (30-40 minutes)

4. **Done!** Your platform is live.

**Requirements**:
- Fresh AWS account with admin access
- AWS CLI configured
- Node.js 20.x+
- Hugging Face account (free)

---

### Option 2: Manual Step-by-Step Deployment

**Best for**: Understanding each deployment step

Follow the comprehensive guide:

📘 **[FRESH_AWS_DEPLOYMENT_GUIDE.md](./FRESH_AWS_DEPLOYMENT_GUIDE.md)**

This guide includes:
- Detailed explanations for each step
- Troubleshooting tips
- Verification commands
- Screenshots and examples

---

### Option 3: Checklist-Based Deployment

**Best for**: Experienced developers who want a quick reference

Use the checklist:

✅ **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)**

Check off items as you complete them.

---

## 📋 Prerequisites (All Methods)

Before starting, ensure you have:

### 1. AWS Account
- [ ] AWS account created at https://aws.amazon.com
- [ ] Credit card added (required even for free tier)
- [ ] Email verified
- [ ] Account activated (may take a few minutes)

### 2. Development Tools
- [ ] Node.js 20.x or higher ([Download](https://nodejs.org/))
- [ ] Git ([Download](https://git-scm.com/))
- [ ] Code editor (VS Code recommended)
- [ ] Terminal (PowerShell, Bash, or Terminal)

### 3. AWS CLI
- [ ] AWS CLI installed ([Guide](https://aws.amazon.com/cli/))
- [ ] AWS CLI configured with credentials

### 4. Hugging Face Account (Free)
- [ ] Account created at https://huggingface.co
- [ ] API token generated (Settings → Access Tokens)

---

## ⚡ Quick Start (5 Steps)

### Step 1: Configure AWS CLI

```bash
aws configure
```

Enter your AWS credentials when prompted.

### Step 2: Get Hugging Face API Key

1. Go to https://huggingface.co/settings/tokens
2. Click "New token"
3. Select "Read" access
4. Copy the token

### Step 3: Run Deployment Script

```powershell
.\deploy-to-aws.ps1
```

### Step 4: Deploy Frontend

After backend deployment completes:

```bash
cd packages/frontend
vercel --prod
```

### Step 5: Test Your Platform

Open your Vercel URL and register a new user!

---

## 📚 Documentation Index

### Deployment Guides
- **[FRESH_AWS_DEPLOYMENT_GUIDE.md](./FRESH_AWS_DEPLOYMENT_GUIDE.md)** - Complete step-by-step guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Quick reference checklist
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Original deployment guide
- **[HOW_TO_DEPLOY.md](./HOW_TO_DEPLOY.md)** - Alternative deployment instructions

### Setup Guides
- **[AWS_FREE_TIER_SETUP_GUIDE.md](./AWS_FREE_TIER_SETUP_GUIDE.md)** - AWS account setup
- **[HOW_TO_GET_AWS_CREDENTIALS.md](./HOW_TO_GET_AWS_CREDENTIALS.md)** - Getting AWS keys
- **[HOW_TO_USE_HUGGINGFACE.md](./HOW_TO_USE_HUGGINGFACE.md)** - Hugging Face setup

### User Guides
- **[QUICK_START_GUIDE.md](./QUICK_START_GUIDE.md)** - Using the platform
- **[HOW_TO_ACCESS_APP.md](./HOW_TO_ACCESS_APP.md)** - Accessing your app
- **[HOW_TO_USE_AIBTS.md](./HOW_TO_USE_AIBTS.md)** - Platform features

### Troubleshooting
- **[CDK_DEPLOYMENT_TROUBLESHOOTING.md](./CDK_DEPLOYMENT_TROUBLESHOOTING.md)** - CDK issues
- **[AWS_REGISTRATION_TROUBLESHOOTING.md](./AWS_REGISTRATION_TROUBLESHOOTING.md)** - AWS account issues

### Technical Documentation
- **[README.md](./README.md)** - Project overview
- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - Developer guide
- **[NOTIFICATION_SYSTEM_GUIDE.md](./NOTIFICATION_SYSTEM_GUIDE.md)** - Notifications setup

---

## 🎓 What Happens During Deployment

### Backend Deployment (15-20 minutes)
1. **CDK Bootstrap**: Creates S3 bucket for CDK assets
2. **DynamoDB Tables**: Creates 10+ tables for data storage
3. **Lambda Functions**: Deploys 20+ serverless functions
4. **API Gateway**: Creates REST API with authentication
5. **Cognito**: Sets up user authentication
6. **Secrets Manager**: Stores Hugging Face API key
7. **CloudWatch**: Configures logging and monitoring

### Frontend Deployment (5-10 minutes)
1. **Build**: Compiles React application
2. **Vercel**: Deploys to global CDN
3. **Environment**: Configures API endpoints
4. **CORS**: Connects frontend to backend

---

## 💰 Cost Breakdown

### Free Tier (First 12 Months)
- AWS Lambda: 1M requests/month FREE
- DynamoDB: 25GB storage FREE
- API Gateway: 1M requests/month FREE
- Cognito: 50,000 MAU FREE
- CloudWatch: 5GB logs FREE
- Hugging Face: 1,000 requests/day FREE
- Vercel: Unlimited bandwidth FREE (hobby)

### Paid Services
- AWS Secrets Manager: $0.40/month (1 secret)
- Additional usage: ~$0.10-$1.10/month

**Total**: ~$0.50-$1.50/month

---

## ✅ Success Criteria

Your deployment is successful when:

- [ ] Frontend loads without errors
- [ ] User can register with email
- [ ] Verification email received
- [ ] User can login successfully
- [ ] Dashboard displays correctly
- [ ] Can create a project
- [ ] API calls succeed (check browser console)
- [ ] No errors in CloudWatch logs

---

## 🆘 Getting Help

### Common Issues

**Issue**: AWS CLI not configured
```bash
# Solution
aws configure
```

**Issue**: CDK bootstrap fails
```bash
# Solution
cdk bootstrap aws://ACCOUNT_ID/REGION --force
```

**Issue**: Frontend can't connect to backend
- Check CORS configuration
- Verify API Gateway URL in `.env.production`
- Check browser console for errors

**Issue**: Cognito verification email not received
- Check spam folder
- Verify email in Cognito console
- Resend verification code

### Support Resources

- **CloudWatch Logs**: Check for backend errors
- **Browser Console**: Check for frontend errors
- **Documentation**: Read relevant guides above
- **AWS Support**: https://console.aws.amazon.com/support/

---

## 🎉 After Deployment

### Immediate Next Steps
1. **Register a user account**
2. **Create your first project**
3. **Create a test case**
4. **Try AI test generation**
5. **Execute a test**

### Optional Enhancements
1. **Configure notifications** (Email, SMS)
2. **Set up monitoring dashboards**
3. **Configure cost alerts**
4. **Add team members**
5. **Customize templates**

### Learning Resources
- **Platform Features**: Read QUICK_START_GUIDE.md
- **AI Generation**: Read HOW_TO_USE_HUGGINGFACE.md
- **Notifications**: Read NOTIFICATION_SYSTEM_GUIDE.md
- **AWS Services**: Read AWS documentation

---

## 📊 Project Status

✅ **Core MVP**: 100% Complete  
✅ **Backend**: Fully deployed  
✅ **Frontend**: Fully deployed  
✅ **Authentication**: Working  
✅ **AI Integration**: Configured  
✅ **Notifications**: Operational  
✅ **Documentation**: Complete  

**Total Tasks Completed**: 45/45 (100%)

---

## 🚀 Ready to Deploy?

Choose your deployment method above and get started!

**Estimated Time**: 30-45 minutes  
**Difficulty**: Beginner-friendly  
**Cost**: ~$1.50/month  

---

## 📞 Quick Links

- **AWS Console**: https://console.aws.amazon.com
- **Hugging Face**: https://huggingface.co
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Node.js Download**: https://nodejs.org
- **AWS CLI Install**: https://aws.amazon.com/cli/

---

**Let's build something amazing! 🎯**

Start with Option 1 (Automated Deployment) for the fastest path to production.
