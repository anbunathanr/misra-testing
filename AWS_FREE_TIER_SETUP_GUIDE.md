# AWS Free Tier Setup Guide for AIBTS Platform

## Overview

Your AIBTS platform is **already configured to use AWS Free Tier services**. The estimated cost is ~$4-5/month, with most services staying within free tier limits.

---

## Step 1: Create New AWS Account

### 1.1 Sign Up for AWS Free Tier

1. Go to [https://aws.amazon.com/free/](https://aws.amazon.com/free/)
2. Click "Create a Free Account"
3. Provide:
   - Email address (use a new email if your old account used one)
   - Account name (e.g., "AIBTS-Platform")
   - Root user password (strong password)
4. Choose "Personal" account type
5. Provide contact information and payment method
   - **Note**: Credit card required but won't be charged if you stay in free tier
6. Verify phone number
7. Select "Basic Support - Free" plan
8. Complete sign-up

### 1.2 Secure Your Root Account

1. Enable MFA (Multi-Factor Authentication):
   - Go to IAM Console → Security credentials
   - Activate MFA on root account
   - Use Google Authenticator or similar app

2. Create IAM Admin User (don't use root for daily tasks):
   - Go to IAM Console → Users → Add user
   - Username: `admin-user`
   - Enable "Programmatic access" and "AWS Management Console access"
   - Attach policy: `AdministratorAccess`
   - Save access keys securely

---

## Step 2: AWS Free Tier Services Used by AIBTS

### ✅ Services That Stay FREE (12 months)

| Service | Free Tier Limit | AIBTS Usage | Status |
|---------|----------------|-------------|--------|
| **Lambda** | 1M requests/month, 400K GB-seconds | ~100K requests | ✅ FREE |
| **DynamoDB** | 25 GB storage, 25 RCU, 25 WCU | ~1 GB, light usage | ✅ FREE |
| **API Gateway** | 1M requests/month (HTTP API) | ~100K requests | ✅ FREE |
| **Cognito** | 50K MAU (Monthly Active Users) | <1K users | ✅ FREE |
| **SNS** | 1M publishes/month | ~10K messages | ✅ FREE |
| **SQS** | 1M requests/month | ~50K messages | ✅ FREE |
| **CloudWatch** | 10 alarms, 5GB logs | 6 alarms, <1GB logs | ✅ FREE |
| **S3** | 5 GB storage, 20K GET, 2K PUT | ~2 GB, light usage | ✅ FREE |

### 💰 Services With Small Costs

| Service | Cost | Why Not Free |
|---------|------|--------------|
| **EventBridge** | ~$0.50/month | No free tier for rules |
| **Secrets Manager** | ~$0.40/month | $0.40 per secret/month |
| **Step Functions** | ~$0.10/month | Minimal usage |

**Total Monthly Cost: ~$4-5/month** (well within budget)

---

## Step 3: Configure AWS Credentials

### 3.1 Install AWS CLI

**Windows (PowerShell):**
```powershell
# Download and install AWS CLI v2
msiexec.exe /i https://awscli.amazonaws.com/AWSCLIV2.msi
```

**Verify installation:**
```powershell
aws --version
```

### 3.2 Configure Credentials

```powershell
aws configure
```

Provide:
- **AWS Access Key ID**: (from IAM user creation)
- **AWS Secret Access Key**: (from IAM user creation)
- **Default region**: `us-east-1` (recommended for free tier)
- **Default output format**: `json`

### 3.3 Verify Configuration

```powershell
aws sts get-caller-identity
```

Should show your account ID and user ARN.

---

## Step 4: Create Required Secrets

### 4.1 OpenAI API Key (Optional - for AI features)

```powershell
aws secretsmanager create-secret `
  --name aibts/openai-api-key `
  --secret-string "sk-YOUR-OPENAI-KEY-HERE" `
  --region us-east-1
```

**Cost**: $0.40/month per secret

**Alternative (Free)**: Use Hugging Face instead (already configured in code):
```powershell
aws secretsmanager create-secret `
  --name aibts/huggingface-api-key `
  --secret-string "hf_YOUR-HUGGINGFACE-KEY-HERE" `
  --region us-east-1
```

Get free Hugging Face API key: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

---

## Step 5: Deploy AIBTS Platform

### 5.1 Install CDK CLI

```powershell
npm install -g aws-cdk
```

### 5.2 Bootstrap CDK (First Time Only)

```powershell
cd packages/backend
npx cdk bootstrap aws://ACCOUNT-ID/us-east-1
```

Replace `ACCOUNT-ID` with your AWS account ID from Step 3.3.

### 5.3 Deploy Platform Stack

```powershell
# Synthesize CloudFormation template
npx cdk synth

# Deploy (takes ~10-15 minutes)
npx cdk deploy MisraPlatformStack --require-approval never
```

### 5.4 Save Deployment Outputs

The deployment will output important values:
- API Gateway URL
- Cognito User Pool ID
- Cognito Client ID
- DynamoDB table names
- S3 bucket names

**Save these values** - you'll need them for frontend configuration.

---

## Step 6: Configure Frontend

### 6.1 Update Environment Variables

Create `packages/frontend/.env.production`:

```env
VITE_API_URL=https://YOUR-API-ID.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_AWS_REGION=us-east-1
```

Replace values with outputs from Step 5.4.

### 6.2 Deploy to Vercel (Free)

```powershell
cd packages/frontend

# Install Vercel CLI
npm install -g vercel

# Build
npm run build

# Deploy
vercel --prod
```

**Vercel is FREE** for hobby projects!

---

## Step 7: Monitor Free Tier Usage

### 7.1 Set Up Billing Alerts

1. Go to AWS Console → Billing Dashboard
2. Click "Billing preferences"
3. Enable "Receive Free Tier Usage Alerts"
4. Enter your email
5. Set alert threshold: $5

### 7.2 Check Free Tier Usage

- Go to: [https://console.aws.amazon.com/billing/home#/freetier](https://console.aws.amazon.com/billing/home#/freetier)
- Monitor usage monthly
- You'll get alerts if approaching limits

---

## Free Tier Optimization Tips

### ✅ Already Optimized in Your Code

1. **DynamoDB**: Uses `PAY_PER_REQUEST` (on-demand) - only pay for what you use
2. **Lambda**: Right-sized memory allocations (256MB-2048MB based on function needs)
3. **API Gateway**: Uses HTTP API (cheaper than REST API)
4. **S3**: Lifecycle policies to delete old screenshots after 30 days
5. **CloudWatch**: Minimal log retention

### 🎯 Additional Savings

1. **Use Hugging Face instead of OpenAI** (free API tier available)
2. **Delete unused resources** after testing
3. **Set S3 lifecycle rules** to move old data to Glacier
4. **Monitor Lambda execution times** - optimize slow functions

---

## Cost Breakdown (Monthly)

```
FREE TIER SERVICES:
├─ Lambda (100K invocations)           $0.00
├─ DynamoDB (1M reads, 500K writes)    $0.00
├─ API Gateway (100K requests)         $0.00
├─ Cognito (1K users)                  $0.00
├─ SNS/SQS (100K messages)             $0.00
├─ S3 (5GB storage)                    $0.00
└─ CloudWatch (10 alarms, 5GB logs)    $0.00

PAID SERVICES:
├─ Secrets Manager (1 secret)          $0.40
├─ EventBridge (3 rules)               $0.50
├─ Step Functions (minimal)            $0.10
└─ Data transfer (minimal)             $0.20

TOTAL: ~$1.20/month (if using Hugging Face)
TOTAL: ~$4.50/month (if using OpenAI + Hugging Face)
```

---

## Troubleshooting

### Issue: "Access Denied" during deployment

**Solution**: Ensure IAM user has `AdministratorAccess` policy

### Issue: "Bucket name already exists"

**Solution**: S3 bucket names are globally unique. The code uses your account ID to make them unique, so this shouldn't happen.

### Issue: "Rate exceeded" errors

**Solution**: You're hitting free tier limits. Check usage in billing dashboard.

### Issue: CDK bootstrap fails

**Solution**: 
```powershell
# Delete existing bootstrap stack
aws cloudformation delete-stack --stack-name CDKToolkit

# Wait for deletion
aws cloudformation wait stack-delete-complete --stack-name CDKToolkit

# Bootstrap again
npx cdk bootstrap
```

---

## Next Steps After Deployment

1. ✅ Test API endpoints
2. ✅ Create first user via Cognito
3. ✅ Test frontend login
4. ✅ Create first project
5. ✅ Run test execution
6. ✅ Monitor costs in billing dashboard

---

## Important Notes

- **Free tier is valid for 12 months** from account creation
- **After 12 months**: Costs will increase to ~$15-20/month
- **Always monitor billing** to avoid surprises
- **Set up billing alerts** immediately
- **Use Hugging Face** instead of OpenAI to save $3-4/month

---

## Summary

Your AIBTS platform is **optimized for AWS Free Tier**. With a new account:

✅ Most services stay FREE for 12 months
✅ Estimated cost: $1-5/month
✅ All infrastructure code ready
✅ No migration needed
✅ Simple deployment process

**You're ready to create your AWS account and deploy!**
