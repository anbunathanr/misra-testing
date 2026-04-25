# Production SaaS Deployment Guide

## Overview

This guide walks through deploying the complete production MISRA Platform SaaS system with real OTP email authentication, real MISRA analysis, and real-time progress tracking.

## Prerequisites

- AWS Account with appropriate permissions
- Node.js 20.x installed
- AWS CLI configured with credentials
- CDK CLI installed (`npm install -g aws-cdk`)

## Step 1: Backend Deployment

### 1.1 Build Backend

```bash
cd packages/backend
npm install
npm run build
```

Expected output:
- TypeScript compilation successful
- All Lambda functions built and zipped
- No errors or warnings

### 1.2 Deploy Infrastructure

```bash
npm run deploy
```

This will:
1. Create CloudFormation stack
2. Deploy all Lambda functions
3. Create DynamoDB tables (Users, FileMetadata, AnalysisResults, OTP, etc.)
4. Create S3 bucket for file storage
5. Create SQS queue for analysis
6. Configure API Gateway with routes
7. Set up Cognito User Pool

**Expected output:**
```
✓ Stack deployed successfully
✓ API Endpoint: https://xxxxx.execute-api.us-east-1.amazonaws.com
✓ Cognito User Pool ID: us-east-1_xxxxx
✓ Cognito Client ID: xxxxx
✓ S3 Bucket: misra-files-xxxxx-us-east-1
```

### 1.3 Configure AWS SES

1. Go to AWS SES Console
2. Select region (us-east-1 recommended)
3. Add verified email:
   - Click "Verified identities"
   - Click "Create identity"
   - Select "Email address"
   - Enter: `noreply@misra-platform.com`
   - Confirm verification email

4. (Optional) Request production access:
   - If you need to send to any email address
   - Go to "Account dashboard"
   - Click "Request production access"
   - Fill out form and submit

### 1.4 Update Environment Variables

Create `.env` file in `packages/backend`:

```env
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=<from deployment output>
COGNITO_CLIENT_ID=<from deployment output>
SES_FROM_EMAIL=noreply@misra-platform.com
OTP_TABLE_NAME=OTP
USERS_TABLE_NAME=Users
FILE_METADATA_TABLE=FileMetadata
ANALYSIS_RESULTS_TABLE=AnalysisResults
```

## Step 2: Frontend Deployment

### 2.1 Update Frontend Configuration

Create `.env.production` file in `packages/frontend`:

```env
VITE_API_URL=https://xxxxx.execute-api.us-east-1.amazonaws.com
VITE_USE_MOCK_BACKEND=false
```

Replace `xxxxx` with your API Gateway endpoint from backend deployment.

### 2.2 Build Frontend

```bash
cd packages/frontend
npm install
npm run build
```

Expected output:
- Build successful
- `dist/` folder created with optimized assets

### 2.3 Deploy Frontend

```bash
npm run deploy
```

This will deploy to your configured hosting (Vercel, AWS S3, etc.)

## Step 3: Verification

### 3.1 Test Registration with OTP

1. Open frontend URL
2. Go to Register page
3. Enter:
   - Email: `test@example.com`
   - Password: `TestPassword123!`
   - Name: `Test User`
4. Click Register
5. **Verify:** Check email for OTP
   - Should receive email from `noreply@misra-platform.com`
   - OTP should be 6 digits
   - Subject: "Your MISRA Platform OTP Code"

### 3.2 Test OTP Verification

1. Copy OTP from email
2. Enter OTP on verification page
3. Click Verify
4. **Verify:** Should authenticate successfully
   - Should see dashboard
   - Should have JWT tokens in localStorage

### 3.3 Test File Upload & Analysis

1. Upload a C/C++ file
2. **Verify:** See green ticks as steps complete
   - Step 1: Authentication ✓
   - Step 2: File Upload ✓
   - Step 3: MISRA Analysis ✓
   - Step 4: Results ✓

3. **Verify:** Real progress tracking
   - Should see "15/50", "25/50", "50/50" rules processed
   - Progress bar should fill smoothly
   - Should see real MISRA violations

4. **Verify:** Real results
   - Compliance score should be real (not always 100%)
   - Violations should match actual code issues
   - Should be able to download report

### 3.4 Test Error Recovery

1. Simulate network error (disable internet)
2. Try to upload file
3. **Verify:** Error message appears
4. Re-enable internet
5. Click Retry
6. **Verify:** Should retry with exponential backoff
7. Should succeed on retry

## Step 4: Production Hardening

### 4.1 Security

- [ ] Enable CloudFront for frontend
- [ ] Enable WAF on API Gateway
- [ ] Enable VPC endpoints for DynamoDB/S3
- [ ] Enable encryption at rest for all services
- [ ] Enable CloudTrail for audit logging
- [ ] Set up CloudWatch alarms

### 4.2 Monitoring

- [ ] Set up CloudWatch dashboards
- [ ] Configure Lambda error alarms
- [ ] Monitor DynamoDB throttling
- [ ] Monitor S3 bucket size
- [ ] Monitor SES sending limits

### 4.3 Scaling

- [ ] Configure Lambda concurrency limits
- [ ] Set up DynamoDB auto-scaling
- [ ] Configure S3 lifecycle policies
- [ ] Set up CloudFront caching

### 4.4 Backup & Disaster Recovery

- [ ] Enable DynamoDB point-in-time recovery
- [ ] Set up S3 versioning
- [ ] Configure S3 cross-region replication
- [ ] Document recovery procedures

## Step 5: Troubleshooting

### Issue: OTP not received

**Solution:**
1. Check SES verified email address
2. Check SES sending limits (sandbox mode = 1 email/second)
3. Check CloudWatch logs for Lambda errors
4. Verify email address is not in SES suppression list

### Issue: Analysis stuck at 66%

**Solution:**
1. Check Lambda logs for errors
2. Verify S3 file was uploaded
3. Check SQS queue for messages
4. Verify DynamoDB tables have data

### Issue: Green ticks not showing

**Solution:**
1. Check browser console for errors
2. Verify API responses are correct
3. Check React state management
4. Clear browser cache and reload

### Issue: Slow analysis

**Solution:**
1. Increase Lambda memory (1024 MB recommended)
2. Check file size (large files take longer)
3. Monitor Lambda duration in CloudWatch
4. Consider parallel processing for large files

## Step 6: Monitoring & Maintenance

### Daily Checks

- [ ] Monitor CloudWatch dashboards
- [ ] Check error rates
- [ ] Verify SES sending limits
- [ ] Check DynamoDB capacity

### Weekly Checks

- [ ] Review CloudTrail logs
- [ ] Check backup status
- [ ] Monitor cost trends
- [ ] Review user feedback

### Monthly Checks

- [ ] Update dependencies
- [ ] Review security patches
- [ ] Optimize database queries
- [ ] Plan capacity upgrades

## Rollback Procedure

If deployment fails:

```bash
# Rollback CloudFormation stack
aws cloudformation cancel-update-stack \
  --stack-name misra-platform-stack \
  --region us-east-1

# Or delete and redeploy
aws cloudformation delete-stack \
  --stack-name misra-platform-stack \
  --region us-east-1
```

## Support & Documentation

- AWS Lambda: https://docs.aws.amazon.com/lambda/
- AWS Cognito: https://docs.aws.amazon.com/cognito/
- AWS SES: https://docs.aws.amazon.com/ses/
- AWS DynamoDB: https://docs.aws.amazon.com/dynamodb/
- AWS S3: https://docs.aws.amazon.com/s3/

## Success Criteria

✅ System is production-ready when:
- [ ] Registration with OTP works
- [ ] OTP emails are received
- [ ] File upload succeeds
- [ ] Analysis completes with real results
- [ ] Green ticks show as steps complete
- [ ] Progress tracking shows real progress
- [ ] Error recovery works
- [ ] No mock data is used
- [ ] System works for any user, any time
- [ ] All monitoring is in place

**Congratulations! Your production SaaS is deployed!** 🚀
