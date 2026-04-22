# Production-Ready MISRA Platform - Complete Deployment Guide

## Overview

This guide provides step-by-step instructions to deploy the fully automated MISRA compliance platform with one-click analysis and automatic OTP-based authentication.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (React + Vite)                  │
│  - AutomatedAnalysisPage: One-click MISRA analysis          │
│  - AutoAuthService: Automatic authentication flow           │
│  - ProductionWorkflowService: Workflow orchestration        │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTPS/REST API
                         │
┌────────────────────────▼────────────────────────────────────┐
│              AWS API Gateway (REST API)                     │
│  - /auth/register: User registration                        │
│  - /auth/fetch-otp: Automatic OTP fetching from email       │
│  - /auth/verify-otp: OTP verification                       │
│  - /auth/auto-login: Passwordless login after OTP           │
│  - /files/upload: File upload with presigned URLs           │
│  - /analysis/analyze: Trigger MISRA analysis                │
│  - /analysis/results: Fetch analysis results                │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐    ┌──────────┐    ┌──────────────┐
   │ Cognito │    │ Lambda   │    │ DynamoDB     │
   │ User    │    │ Functions│    │ Tables       │
   │ Pool    │    │          │    │              │
   └─────────┘    └──────────┘    └──────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   ┌─────────┐    ┌──────────┐    ┌──────────────┐
   │ S3       │    │ SQS      │    │ CloudWatch   │
   │ File     │    │ Queue    │    │ Logs         │
   │ Storage  │    │          │    │              │
   └─────────┘    └──────────┘    └──────────────┘
```

## Prerequisites

1. **AWS Account** with appropriate permissions
2. **Node.js 18+** and npm
3. **AWS CLI** configured with credentials
4. **Email Service Credentials** (Gmail, Outlook, etc.) for OTP fetching
5. **Domain Name** (optional, for custom domain)

## Step 1: Environment Setup

### 1.1 Clone and Install Dependencies

```bash
# Clone repository
git clone <repo-url>
cd production-misra-platform

# Install root dependencies
npm install

# Install backend dependencies
cd packages/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ../..
```

### 1.2 Configure Environment Variables

**Backend (.env)**
```bash
cd packages/backend

# Create .env file
cat > .env << 'EOF'
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=<your-account-id>

# Cognito Configuration
COGNITO_USER_POOL_ID=us-east-1_uEQr80iZX
COGNITO_CLIENT_ID=6kf0affa9ig2gbrideo00pjncm
COGNITO_DOMAIN=misra-platform

# DynamoDB Tables
USERS_TABLE=Users
FILES_TABLE=FileMetadata
ANALYSIS_TABLE=AnalysisResults
SAMPLES_TABLE=SampleFiles
PROGRESS_TABLE=AnalysisProgress

# S3 Configuration
S3_BUCKET=misra-platform-files-<account-id>
S3_REGION=us-east-1
S3_KMS_KEY_ID=<kms-key-id>

# JWT Configuration
JWT_SECRET=<generate-random-secret>
JWT_EXPIRY=3600

# Email Configuration (for OTP fetching)
EMAIL_PROVIDER=gmail
EMAIL_HOST=imap.gmail.com
EMAIL_PORT=993
EMAIL_TLS=true

# API Configuration
API_GATEWAY_ID=pkgjbizs63
API_STAGE=dev

# Logging
LOG_LEVEL=info
ENABLE_XRAY=true

# Feature Flags
ENABLE_AUTO_OTP=true
ENABLE_AUTO_LOGIN=true
ENABLE_MOCK_BACKEND=false
EOF
```

**Frontend (.env.local)**
```bash
cd packages/frontend

# Create .env.local file
cat > .env.local << 'EOF'
# API Configuration
VITE_API_URL=https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev
VITE_USE_MOCK_BACKEND=false
VITE_ENABLE_REAL_AUTH=true

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_uEQr80iZX
VITE_COGNITO_CLIENT_ID=6kf0affa9ig2gbrideo00pjncm
VITE_COGNITO_DOMAIN=misra-platform

# Feature Flags
VITE_ENABLE_AUTO_AUTH=true
VITE_ENABLE_AUTO_OTP=true

# Analytics (optional)
VITE_ANALYTICS_ID=<your-analytics-id>
EOF
```

## Step 2: Build Lambda Functions

```bash
cd packages/backend

# Build all Lambda functions
npm run build:lambdas

# Verify build output
ls -la dist-lambdas/
```

## Step 3: Deploy Infrastructure with CDK

```bash
cd packages/backend

# Synthesize CDK template
npm run synth

# Deploy to AWS
npm run deploy

# Or with specific stack name
cdk deploy MisraPlatform-dev --require-approval never
```

**Expected Output:**
```
✓ MisraPlatform-dev
  CognitoUserPool: us-east-1_uEQr80iZX
  CognitoClientId: 6kf0affa9ig2gbrideo00pjncm
  ApiGatewayId: pkgjbizs63
  ApiEndpoint: https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev
  S3Bucket: misra-platform-files-<account-id>
  DynamoDBTables: Users, FileMetadata, AnalysisResults, SampleFiles, AnalysisProgress
```

## Step 4: Configure Email Credentials for OTP Fetching

### 4.1 Store Email Credentials in AWS Secrets Manager

```bash
# For Gmail (with App Password)
aws secretsmanager create-secret \
  --name misra/email/gmail \
  --secret-string '{
    "email": "your-email@gmail.com",
    "password": "your-app-password",
    "host": "imap.gmail.com",
    "port": 993,
    "tls": true,
    "provider": "gmail"
  }' \
  --region us-east-1

# For Outlook
aws secretsmanager create-secret \
  --name misra/email/outlook \
  --secret-string '{
    "email": "your-email@outlook.com",
    "password": "your-password",
    "host": "imap-mail.outlook.com",
    "port": 993,
    "tls": true,
    "provider": "outlook"
  }' \
  --region us-east-1
```

### 4.2 Update Lambda IAM Role

Add permission to read secrets:

```bash
aws iam put-role-policy \
  --role-name MisraPlatform-LambdaExecutionRole \
  --policy-name SecretsManagerAccess \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "secretsmanager:GetSecretValue"
        ],
        "Resource": "arn:aws:secretsmanager:us-east-1:*:secret:misra/email/*"
      }
    ]
  }'
```

## Step 5: Deploy Frontend

```bash
cd packages/frontend

# Build frontend
npm run build

# Deploy to Vercel (recommended)
npm install -g vercel
vercel --prod

# Or deploy to S3 + CloudFront
aws s3 sync dist/ s3://misra-platform-frontend-<account-id>/ --delete
```

## Step 6: Verify Deployment

### 6.1 Test Authentication Flow

```bash
# Test user registration
curl -X POST https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TempPassword123!",
    "name": "Test User"
  }'

# Test OTP fetching
curl -X POST https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/auth/fetch-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Test OTP verification
curl -X POST https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "otp": "123456"
  }'

# Test auto-login
curl -X POST https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/auth/auto-login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

### 6.2 Test File Upload

```bash
# Get presigned URL
curl -X POST https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/files/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "fileName": "test.c",
    "fileSize": 1024,
    "contentType": "text/plain"
  }'

# Upload file using presigned URL
curl -X PUT <presigned-url> \
  -H "Content-Type: text/plain" \
  --data-binary @test.c
```

### 6.3 Test MISRA Analysis

```bash
# Trigger analysis
curl -X POST https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/analysis/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access-token>" \
  -d '{
    "fileId": "<file-id>",
    "language": "c"
  }'

# Get analysis results
curl -X GET https://pkgjbizs63.execute-api.us-east-1.amazonaws.com/dev/analysis/results/<analysis-id> \
  -H "Authorization: Bearer <access-token>"
```

## Step 7: Configure Monitoring and Logging

### 7.1 CloudWatch Dashboards

```bash
# Create dashboard
aws cloudwatch put-dashboard \
  --dashboard-name MisraPlatform-Dashboard \
  --dashboard-body file://dashboard-config.json
```

### 7.2 Set Up Alarms

```bash
# Lambda error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name MisraPlatform-LambdaErrors \
  --alarm-description "Alert on Lambda function errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Step 8: Production Hardening

### 8.1 Enable X-Ray Tracing

```bash
# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name MisraPlatform-AnalyzeFile \
  --tracing-config Mode=Active
```

### 8.2 Configure WAF (Web Application Firewall)

```bash
# Create WAF rules
aws wafv2 create-web-acl \
  --name MisraPlatform-WAF \
  --scope REGIONAL \
  --default-action Block={} \
  --rules file://waf-rules.json
```

### 8.3 Enable API Gateway Logging

```bash
# Create CloudWatch log group
aws logs create-log-group --log-group-name /aws/apigateway/MisraPlatform

# Update API Gateway stage
aws apigateway update-stage \
  --rest-api-id pkgjbizs63 \
  --stage-name dev \
  --patch-operations \
    op=replace,path=/*/loggingLevel,value=INFO \
    op=replace,path=/*/dataTraceEnabled,value=true
```

## Step 9: Testing the Complete Workflow

### 9.1 Manual End-to-End Test

1. Open frontend: `https://your-domain.com`
2. Enter email address
3. Click "Start MISRA Analysis"
4. Watch automatic authentication progress:
   - User registration
   - OTP fetching from email
   - OTP verification
   - Auto-login
5. Watch workflow progress:
   - File selection
   - File upload
   - MISRA analysis
   - Results processing
6. Download analysis report

### 9.2 Automated Testing

```bash
cd packages/backend

# Run integration tests
npm run test:integration

# Run end-to-end tests
npm run test:e2e

# Check test coverage
npm run test:coverage
```

## Step 10: Deployment Verification Checklist

- [ ] AWS CDK stack deployed successfully
- [ ] All Lambda functions deployed and accessible
- [ ] DynamoDB tables created and accessible
- [ ] S3 bucket created with KMS encryption
- [ ] Cognito User Pool configured with MFA
- [ ] Email credentials stored in Secrets Manager
- [ ] API Gateway endpoints responding correctly
- [ ] Frontend deployed and accessible
- [ ] Authentication flow working end-to-end
- [ ] File upload working with presigned URLs
- [ ] MISRA analysis triggering and completing
- [ ] Results displaying correctly
- [ ] CloudWatch logs showing activity
- [ ] Monitoring and alarms configured
- [ ] WAF rules applied to API Gateway

## Troubleshooting

### Issue: OTP not fetching from email

**Solution:**
1. Verify email credentials in Secrets Manager
2. Check Lambda logs: `aws logs tail /aws/lambda/MisraPlatform-FetchOTP --follow`
3. Ensure email account allows IMAP access
4. For Gmail, use App Password instead of regular password

### Issue: File upload failing

**Solution:**
1. Check S3 bucket permissions
2. Verify presigned URL generation
3. Check CORS configuration on S3
4. Verify KMS key permissions

### Issue: MISRA analysis not completing

**Solution:**
1. Check Lambda timeout settings (increase if needed)
2. Review Lambda logs for errors
3. Verify DynamoDB table capacity
4. Check SQS queue for stuck messages

### Issue: High latency

**Solution:**
1. Enable Lambda provisioned concurrency
2. Add DynamoDB DAX caching
3. Enable CloudFront for static assets
4. Optimize Lambda memory allocation

## Performance Optimization

### Lambda Optimization
```bash
# Increase memory (faster CPU)
aws lambda update-function-configuration \
  --function-name MisraPlatform-AnalyzeFile \
  --memory-size 3008 \
  --timeout 900
```

### DynamoDB Optimization
```bash
# Enable auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/AnalysisResults \
  --scalable-dimension dynamodb:table:WriteCapacityUnits \
  --min-capacity 10 \
  --max-capacity 1000
```

## Cost Optimization

1. **Use DynamoDB On-Demand** for variable workloads
2. **Enable S3 Intelligent-Tiering** for old files
3. **Set Lambda memory to optimal level** (usually 1024-1536 MB)
4. **Use CloudFront** for static assets
5. **Enable VPC endpoints** to reduce data transfer costs

## Security Best Practices

1. ✅ Enable MFA for all users
2. ✅ Use KMS encryption for data at rest
3. ✅ Enable TLS for data in transit
4. ✅ Implement rate limiting on API endpoints
5. ✅ Use IAM roles with least privilege
6. ✅ Enable CloudTrail for audit logging
7. ✅ Regularly rotate credentials
8. ✅ Enable WAF on API Gateway
9. ✅ Use VPC for Lambda functions
10. ✅ Enable S3 bucket versioning

## Maintenance

### Weekly Tasks
- [ ] Review CloudWatch logs for errors
- [ ] Check Lambda error rates
- [ ] Monitor DynamoDB capacity usage
- [ ] Review cost reports

### Monthly Tasks
- [ ] Update dependencies
- [ ] Review security patches
- [ ] Analyze performance metrics
- [ ] Backup DynamoDB tables

### Quarterly Tasks
- [ ] Conduct security audit
- [ ] Review and optimize costs
- [ ] Update documentation
- [ ] Plan capacity upgrades

## Support and Documentation

- **API Documentation**: `packages/backend/API_DOCUMENTATION.md`
- **Architecture Guide**: `packages/backend/ARCHITECTURE.md`
- **Troubleshooting Guide**: `packages/backend/TROUBLESHOOTING.md`
- **Security Guide**: `packages/backend/SECURITY.md`

## Next Steps

1. Deploy to production environment
2. Set up CI/CD pipeline
3. Configure custom domain
4. Enable analytics and monitoring
5. Plan for scaling and optimization
