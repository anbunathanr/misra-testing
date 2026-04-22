# Quick Deployment Guide

**Status**: ✅ Ready to Deploy  
**Time to Deploy**: ~15-20 minutes  
**Prerequisites**: AWS account, Node.js 20.x, AWS CLI

---

## One-Command Deployment

```bash
cd packages/backend && npm install && npm run build:lambdas && npm run deploy
```

---

## Step-by-Step Deployment

### 1. Verify Prerequisites
```bash
# Check Node.js
node --version  # Should be v20.x or higher

# Check AWS CLI
aws --version

# Verify AWS credentials
aws sts get-caller-identity
```

### 2. Install Dependencies
```bash
# From root directory
npm install

# Backend dependencies
cd packages/backend
npm install
```

### 3. Build Lambda Functions
```bash
npm run build:lambdas
```

### 4. Deploy Infrastructure
```bash
npm run deploy
```

### 5. Get API Endpoint
```bash
aws cloudformation describe-stacks \
  --stack-name MisraPlatformMVPStack \
  --query 'Stacks[0].Outputs[?OutputKey==`APIEndpoint`].OutputValue' \
  --output text
```

---

## What Gets Deployed

### AWS Resources
- ✅ Cognito User Pool (authentication)
- ✅ 3 DynamoDB tables (Users, FileMetadata, AnalysisResults)
- ✅ S3 bucket (file storage)
- ✅ API Gateway (HTTP API with JWT)
- ✅ 9 Lambda functions (auth, file, analysis)

### API Endpoints
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/verify-otp` - Verify OTP
- `GET /auth/profile` - Get user profile (protected)
- `POST /files/upload` - Upload file (protected)
- `GET /files` - Get files (protected)
- `POST /analysis/analyze` - Analyze file (protected)
- `GET /analysis/results` - Get results (protected)

---

## Deployment Output

After successful deployment, you'll see:

```
✅ MisraPlatformMVPStack
   APIEndpoint: https://xxxxx.execute-api.us-east-1.amazonaws.com/
   CognitoUserPoolId: us-east-1_xxxxx
   CognitoClientId: xxxxx
   FileStorageBucket: misra-files-123456789-us-east-1
```

---

## Testing After Deployment

### 1. Register User
```bash
curl -X POST https://xxxxx.execute-api.us-east-1.amazonaws.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User"
  }'
```

### 2. Login
```bash
curl -X POST https://xxxxx.execute-api.us-east-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!"
  }'
```

### 3. Verify OTP
```bash
curl -X POST https://xxxxx.execute-api.us-east-1.amazonaws.com/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'
```

---

## Troubleshooting

### Issue: AWS credentials not found
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
export AWS_DEFAULT_REGION=us-east-1
```

### Issue: Node.js version mismatch
```bash
# Install Node.js 20.x
# Using nvm:
nvm install 20
nvm use 20

# Or download from https://nodejs.org/
```

### Issue: CDK not installed
```bash
npm install -g aws-cdk
```

### Issue: Build fails
```bash
# Clean and rebuild
rm -rf node_modules dist dist-lambdas
npm install
npm run build:lambdas
```

### Issue: Deployment fails
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name MisraPlatformMVPStack

# Check Lambda logs
aws logs tail /aws/lambda/misra-* --follow

# Rollback if needed
aws cloudformation cancel-update-stack \
  --stack-name MisraPlatformMVPStack
```

---

## Cleanup (if needed)

```bash
# Delete the entire stack
aws cloudformation delete-stack \
  --stack-name MisraPlatformMVPStack

# Wait for deletion
aws cloudformation wait stack-delete-complete \
  --stack-name MisraPlatformMVPStack
```

---

## Cost Estimation

**Monthly Cost** (approximate):
- Cognito: $0 (free tier)
- DynamoDB: $1-5 (on-demand pricing)
- Lambda: $0.20 (free tier covers most usage)
- S3: $0.50 (storage + requests)
- API Gateway: $3.50 (1M requests)

**Total**: ~$5-10/month for low usage

---

## Next Steps

1. ✅ Deploy infrastructure
2. ✅ Test API endpoints
3. ✅ Deploy frontend
4. ✅ Test end-to-end workflow
5. ✅ Monitor CloudWatch logs

---

## Support

For issues or questions:
1. Check CloudWatch logs: `aws logs tail /aws/lambda/misra-* --follow`
2. Check CloudFormation events: `aws cloudformation describe-stack-events --stack-name MisraPlatformMVPStack`
3. Review deployment checklist: `DEPLOYMENT_VERIFICATION_CHECKLIST.md`

---

**Ready to deploy? Run:**
```bash
cd packages/backend && npm run deploy
```

🚀 **Let's go!**
