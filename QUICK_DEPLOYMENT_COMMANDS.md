# Quick Deployment Commands

## One-Command Deployment

### Full Deployment (Backend + Frontend)
```bash
# Backend
cd packages/backend && npm install && npm run build && npm run deploy

# Frontend
cd packages/frontend && npm install && npm run build && npm run deploy
```

## Step-by-Step Deployment

### Step 1: Backend Build & Deploy
```bash
cd packages/backend

# Install dependencies
npm install

# Build TypeScript and Lambda functions
npm run build

# Deploy to AWS
npm run deploy
```

**Expected Output:**
```
✓ Stack deployed successfully
✓ API Endpoint: https://xxxxx.execute-api.us-east-1.amazonaws.com
✓ Cognito User Pool ID: us-east-1_xxxxx
✓ Cognito Client ID: xxxxx
```

### Step 2: Configure AWS SES

```bash
# Open AWS SES Console
# https://console.aws.amazon.com/ses/

# 1. Select region: us-east-1
# 2. Click "Verified identities"
# 3. Click "Create identity"
# 4. Select "Email address"
# 5. Enter: noreply@misra-platform.com
# 6. Confirm verification email
```

### Step 3: Frontend Build & Deploy
```bash
cd packages/frontend

# Install dependencies
npm install

# Update .env.production with API endpoint from Step 1
# VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com

# Build
npm run build

# Deploy
npm run deploy
```

## Testing Commands

### Test Registration with OTP
```bash
# 1. Open frontend URL
# 2. Go to Register page
# 3. Enter email: test@example.com
# 4. Enter password: TestPassword123!
# 5. Click Register
# 6. Check email for OTP
# 7. Enter OTP on verification page
# 8. Click Verify
```

### Test File Upload & Analysis
```bash
# 1. Login with verified account
# 2. Go to Automated Analysis page
# 3. Enter email and name
# 4. Click "Start MISRA Analysis"
# 5. Wait for analysis to complete
# 6. Verify green ticks show as steps complete
# 7. Verify real MISRA violations are detected
# 8. Download report
```

### Test Error Recovery
```bash
# 1. Disable internet connection
# 2. Try to upload file
# 3. See error message
# 4. Re-enable internet
# 5. Click Retry
# 6. Verify retry succeeds
```

## Monitoring Commands

### View Lambda Logs
```bash
# Register function
aws logs tail /aws/lambda/misra-platform-auth-register --follow

# Generate OTP function
aws logs tail /aws/lambda/misra-platform-auth-generate-otp --follow

# Verify OTP function
aws logs tail /aws/lambda/misra-platform-auth-verify-otp-email --follow

# Analysis function
aws logs tail /aws/lambda/misra-platform-analysis-analyze-file --follow
```

### Check DynamoDB Tables
```bash
# List all items in OTP table
aws dynamodb scan --table-name OTP --region us-east-1

# List all items in Users table
aws dynamodb scan --table-name Users --region us-east-1

# Query OTP by email
aws dynamodb query \
  --table-name OTP \
  --index-name EmailIndex \
  --key-condition-expression "email = :email" \
  --expression-attribute-values '{":email":{"S":"test@example.com"}}' \
  --region us-east-1
```

### Check SES Sending Statistics
```bash
aws ses get-account-sending-enabled --region us-east-1

aws ses get-send-statistics --region us-east-1
```

### View API Gateway Logs
```bash
aws logs tail /aws/apigateway/misra-platform-api --follow
```

## Troubleshooting Commands

### Check Stack Status
```bash
aws cloudformation describe-stacks \
  --stack-name misra-platform-stack \
  --region us-east-1
```

### View Stack Events
```bash
aws cloudformation describe-stack-events \
  --stack-name misra-platform-stack \
  --region us-east-1
```

### Check Lambda Function Details
```bash
aws lambda get-function \
  --function-name misra-platform-auth-register \
  --region us-east-1
```

### Test Lambda Function
```bash
aws lambda invoke \
  --function-name misra-platform-auth-generate-otp \
  --payload '{"body":"{\"email\":\"test@example.com\"}"}' \
  --region us-east-1 \
  response.json

cat response.json
```

### Check S3 Bucket
```bash
# List files in bucket
aws s3 ls s3://misra-files-xxxxx-us-east-1/

# Check bucket size
aws s3 ls s3://misra-files-xxxxx-us-east-1/ --recursive --summarize
```

### Check SQS Queue
```bash
# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/xxxxx/misra-analysis-queue \
  --attribute-names All \
  --region us-east-1

# Receive messages
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/xxxxx/misra-analysis-queue \
  --region us-east-1
```

## Rollback Commands

### Rollback Stack
```bash
# Cancel update
aws cloudformation cancel-update-stack \
  --stack-name misra-platform-stack \
  --region us-east-1

# Or delete and redeploy
aws cloudformation delete-stack \
  --stack-name misra-platform-stack \
  --region us-east-1
```

### Delete DynamoDB Table
```bash
aws dynamodb delete-table \
  --table-name OTP \
  --region us-east-1
```

### Delete S3 Bucket
```bash
# Empty bucket first
aws s3 rm s3://misra-files-xxxxx-us-east-1/ --recursive

# Then delete
aws s3 rb s3://misra-files-xxxxx-us-east-1/
```

## Environment Variables

### Backend (.env)
```
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_xxxxx
COGNITO_CLIENT_ID=xxxxx
SES_FROM_EMAIL=noreply@misra-platform.com
OTP_TABLE_NAME=OTP
USERS_TABLE_NAME=Users
FILE_METADATA_TABLE=FileMetadata
ANALYSIS_RESULTS_TABLE=AnalysisResults
```

### Frontend (.env.production)
```
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com
VITE_USE_MOCK_BACKEND=false
```

## Useful Links

- AWS Console: https://console.aws.amazon.com/
- CloudFormation: https://console.aws.amazon.com/cloudformation/
- Lambda: https://console.aws.amazon.com/lambda/
- DynamoDB: https://console.aws.amazon.com/dynamodb/
- S3: https://console.aws.amazon.com/s3/
- SES: https://console.aws.amazon.com/ses/
- Cognito: https://console.aws.amazon.com/cognito/
- CloudWatch: https://console.aws.amazon.com/cloudwatch/

## Quick Checklist

- [ ] Backend built successfully
- [ ] Backend deployed successfully
- [ ] SES email verified
- [ ] Frontend built successfully
- [ ] Frontend deployed successfully
- [ ] Registration with OTP works
- [ ] OTP email received
- [ ] File upload succeeds
- [ ] Analysis completes
- [ ] Real results displayed
- [ ] Error recovery works

**Ready to deploy!** 🚀
