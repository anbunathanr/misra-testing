# MISRA Web Testing Platform - Deployment Guide

## Prerequisites

Before deploying, ensure you have:

### 1. AWS Account Setup
- [ ] AWS Account created
- [ ] AWS CLI installed and configured
- [ ] AWS credentials configured (`aws configure`)
- [ ] Appropriate IAM permissions for:
  - Lambda
  - DynamoDB
  - S3
  - API Gateway
  - CloudFormation
  - IAM
  - Secrets Manager
  - SQS
  - Step Functions

### 2. Development Tools
- [ ] Node.js 20+ installed
- [ ] npm installed
- [ ] AWS CDK CLI installed (`npm install -g aws-cdk`)
- [ ] Git installed

### 3. Environment Configuration
- [ ] AWS region selected (e.g., us-east-1)
- [ ] Domain name (optional, for custom domain)

---

## Deployment Steps

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd packages/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Return to root
cd ../..
```

### Step 2: Configure AWS Secrets

Create secrets in AWS Secrets Manager:

```bash
# JWT Secret
aws secretsmanager create-secret \
  --name misra-platform/jwt-secret \
  --secret-string "your-secure-jwt-secret-key-here" \
  --region us-east-1

# n8n Webhook URL
aws secretsmanager create-secret \
  --name misra-platform/n8n-webhook-url \
  --secret-string "https://your-n8n-instance.com/webhook/auth" \
  --region us-east-1

# n8n API Key
aws secretsmanager create-secret \
  --name misra-platform/n8n-api-key \
  --secret-string "your-n8n-api-key" \
  --region us-east-1
```

### Step 3: Bootstrap CDK (First Time Only)

```bash
cd packages/backend
cdk bootstrap aws://ACCOUNT-ID/REGION
```

Replace `ACCOUNT-ID` with your AWS account ID and `REGION` with your chosen region.

### Step 4: Build Backend

```bash
cd packages/backend
npm run build
```

### Step 5: Deploy Backend Infrastructure

```bash
# Review what will be deployed
cdk diff

# Deploy to AWS
cdk deploy

# Or deploy with auto-approval (no prompts)
cdk deploy --require-approval never
```

This will create:
- 12 Lambda functions
- 6 DynamoDB tables
- 1 S3 bucket
- 1 SQS queue
- 1 Step Functions state machine
- 1 API Gateway
- IAM roles and policies

**Expected deployment time:** 5-10 minutes

### Step 6: Get API Gateway URL

After deployment, CDK will output the API Gateway URL:

```
Outputs:
MisraPlatformStack.ApiEndpoint = https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
```

**Save this URL** - you'll need it for the frontend configuration.

### Step 7: Configure Frontend Environment

Create `.env` file in `packages/frontend`:

```bash
cd packages/frontend
cat > .env << EOF
VITE_API_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com
EOF
```

Replace the URL with your actual API Gateway endpoint.

### Step 8: Build Frontend

```bash
cd packages/frontend
npm run build
```

This creates optimized production files in `packages/frontend/dist/`.

### Step 9: Deploy Frontend

**Option A: Deploy to S3 + CloudFront (Recommended)**

```bash
# Create S3 bucket for frontend
aws s3 mb s3://misra-platform-frontend --region us-east-1

# Enable static website hosting
aws s3 website s3://misra-platform-frontend \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://misra-platform-frontend --delete

# Make bucket public (for static hosting)
aws s3api put-bucket-policy \
  --bucket misra-platform-frontend \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::misra-platform-frontend/*"
    }]
  }'

# Get website URL
aws s3api get-bucket-website --bucket misra-platform-frontend
```

**Option B: Run Locally (For Testing)**

```bash
cd packages/frontend
npm run dev
```

Access at: http://localhost:5173

---

## Post-Deployment Configuration

### 1. Test API Endpoints

```bash
# Test health check
curl https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/health

# Test login endpoint
curl -X POST https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### 2. Create Test User

You'll need to manually create a test user in the DynamoDB Users table:

```bash
aws dynamodb put-item \
  --table-name MisraPlatform-Users \
  --item '{
    "userId": {"S": "test-user-123"},
    "email": {"S": "test@example.com"},
    "name": {"S": "Test User"},
    "role": {"S": "developer"},
    "passwordHash": {"S": "hashed-password-here"},
    "createdAt": {"N": "1234567890"},
    "updatedAt": {"N": "1234567890"}
  }'
```

### 3. Configure CORS (If Needed)

If you encounter CORS issues, update the API Gateway CORS settings in:
`packages/backend/src/infrastructure/misra-platform-stack.ts`

### 4. Set Up Monitoring

Enable CloudWatch logs for Lambda functions:

```bash
# View logs for a specific function
aws logs tail /aws/lambda/MisraPlatform-login --follow
```

---

## Verification Checklist

After deployment, verify:

- [ ] API Gateway is accessible
- [ ] Lambda functions are deployed
- [ ] DynamoDB tables are created
- [ ] S3 bucket is created
- [ ] Frontend loads successfully
- [ ] Login page is accessible
- [ ] Can authenticate with test user
- [ ] File upload works
- [ ] Analysis runs successfully
- [ ] AI insights generate correctly

---

## Troubleshooting

### Issue: CDK Deploy Fails

**Solution:**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM permissions
- Check CDK version: `cdk --version`
- Try: `cdk doctor`

### Issue: Lambda Function Errors

**Solution:**
- Check CloudWatch logs: `aws logs tail /aws/lambda/function-name --follow`
- Verify environment variables
- Check IAM role permissions

### Issue: CORS Errors

**Solution:**
- Update CORS configuration in API Gateway
- Ensure `Access-Control-Allow-Origin` header is set
- Check browser console for specific CORS error

### Issue: DynamoDB Access Denied

**Solution:**
- Verify Lambda execution role has DynamoDB permissions
- Check table names match in code
- Verify region is correct

### Issue: S3 Upload Fails

**Solution:**
- Check S3 bucket permissions
- Verify presigned URL generation
- Check CORS configuration on S3 bucket

---

## Cleanup (To Remove All Resources)

```bash
# Delete CDK stack
cd packages/backend
cdk destroy

# Delete S3 frontend bucket
aws s3 rb s3://misra-platform-frontend --force

# Delete secrets
aws secretsmanager delete-secret --secret-id misra-platform/jwt-secret --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id misra-platform/n8n-webhook-url --force-delete-without-recovery
aws secretsmanager delete-secret --secret-id misra-platform/n8n-api-key --force-delete-without-recovery
```

---

## Cost Estimation

**Monthly costs (estimated for low usage):**
- Lambda: $0-5 (first 1M requests free)
- DynamoDB: $0-10 (on-demand pricing)
- S3: $0-5 (first 5GB free)
- API Gateway: $0-5 (first 1M requests free)
- CloudWatch: $0-5

**Total estimated:** $0-30/month for development/testing

---

## Next Steps After Deployment

1. **Test all features thoroughly**
2. **Set up monitoring and alerts**
3. **Configure backup policies**
4. **Set up CI/CD pipeline**
5. **Add custom domain (optional)**
6. **Enable CloudFront CDN (optional)**
7. **Set up SSL certificate (optional)**

---

## Support

For issues or questions:
- Check CloudWatch logs
- Review AWS CDK documentation
- Check GitHub repository issues
- Contact support team

---

*Last Updated: February 2026*
*Version: 1.0.0*
