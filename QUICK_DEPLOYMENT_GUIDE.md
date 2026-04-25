# Quick Deployment Guide - Production MISRA Platform

**Time to Deploy**: ~15 minutes  
**Prerequisites**: AWS credentials, Node.js 20.x, npm

---

## Step 1: Verify Backend Deployment (Already Done ✅)

The backend is already deployed to AWS. Verify it's running:

```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks \
  --stack-name MisraPlatform-dev \
  --region us-east-1 \
  --query 'Stacks[0].StackStatus'

# Expected output: UPDATE_COMPLETE
```

Get the API endpoint:

```bash
aws cloudformation describe-stacks \
  --stack-name MisraPlatform-dev \
  --region us-east-1 \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text
```

---

## Step 2: Configure Frontend Environment

Update frontend environment variables:

```bash
cd packages/frontend

# Create or update .env.local
cat > .env.local << 'EOF'
VITE_API_URL=https://YOUR_API_ENDPOINT_HERE
VITE_USE_MOCK_BACKEND=false
EOF
```

Replace `YOUR_API_ENDPOINT_HERE` with the actual API endpoint from Step 1.

---

## Step 3: Build Frontend

```bash
cd packages/frontend

# Install dependencies (if not already done)
npm install

# Build for production
npm run build

# Expected output: dist/ directory with optimized files
```

---

## Step 4: Deploy Frontend to Vercel

### Option A: Using Vercel CLI

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Deploy
vercel --prod

# Follow prompts to connect to your Vercel account
```

### Option B: Using GitHub Integration

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard
4. Vercel will auto-deploy on push

### Option C: Manual Deployment

```bash
# Build the frontend
npm run build

# Deploy dist/ folder to your hosting provider
# (AWS S3 + CloudFront, Netlify, etc.)
```

---

## Step 5: Verify Deployment

### Test Frontend Access

```bash
# Open the frontend URL in browser
# Should see the MISRA Platform landing page
```

### Test API Connectivity

```bash
# Check if frontend can reach backend
curl -X GET https://YOUR_API_ENDPOINT/health

# Expected: 200 OK or similar
```

### Test Complete Workflow

1. Open frontend in browser
2. Enter email address
3. Click "Start MISRA Analysis"
4. Watch progress tracker
5. See results when complete

---

## Step 6: Monitor Deployment

### View Frontend Logs

```bash
# If deployed to Vercel
vercel logs

# If deployed to AWS S3 + CloudFront
aws s3 ls s3://your-bucket/
```

### View Backend Logs

```bash
# Watch Lambda logs in real-time
aws logs tail /aws/lambda/misra-* --follow

# View specific function logs
aws logs tail /aws/lambda/misra-analysis-analyze-file --follow
```

### Check DynamoDB

```bash
# View table items
aws dynamodb scan --table-name FileMetadata-dev --region us-east-1

# View analysis results
aws dynamodb scan --table-name AnalysisResults-dev --region us-east-1
```

---

## Troubleshooting

### Issue: "Cannot reach API"

**Solution**:
1. Verify API endpoint is correct in `.env.local`
2. Check CORS is enabled in API Gateway
3. Verify Lambda functions are running: `aws lambda list-functions`

### Issue: "Authentication failed"

**Solution**:
1. Check Cognito User Pool is created: `aws cognito-idp list-user-pools --max-results 10`
2. Verify JWT authorizer is configured
3. Check CloudWatch logs for auth errors

### Issue: "File upload failed"

**Solution**:
1. Verify S3 bucket exists: `aws s3 ls`
2. Check S3 bucket permissions
3. Verify presigned URL generation works

### Issue: "Analysis timeout"

**Solution**:
1. Check Lambda timeout setting (should be 300 seconds)
2. Try with smaller file
3. Check CloudWatch logs for analysis errors

### Issue: "Results not showing"

**Solution**:
1. Check DynamoDB table has FileIndex GSI
2. Verify analysis results are stored: `aws dynamodb scan --table-name AnalysisResults-dev`
3. Check get-analysis-results Lambda logs

---

## Performance Optimization

### Frontend Optimization

```bash
# Check bundle size
npm run build
ls -lh dist/

# Expected: < 500KB total
```

### Lambda Optimization

```bash
# Increase Lambda memory for faster execution
aws lambda update-function-configuration \
  --function-name misra-analysis-analyze-file \
  --memory-size 1024 \
  --timeout 300
```

### DynamoDB Optimization

```bash
# Switch to provisioned capacity if needed
aws dynamodb update-table \
  --table-name AnalysisResults-dev \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=10
```

---

## Security Checklist

- [ ] API endpoint is HTTPS only
- [ ] CORS is configured for your domain only
- [ ] JWT tokens are stored securely (httpOnly cookies)
- [ ] Environment variables don't contain secrets
- [ ] S3 bucket is private (not public)
- [ ] DynamoDB encryption is enabled
- [ ] CloudTrail logging is enabled

---

## Monitoring Setup

### CloudWatch Alarms

```bash
# Create alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name misra-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### CloudWatch Dashboard

```bash
# Create dashboard for monitoring
aws cloudwatch put-dashboard \
  --dashboard-name MisraPlatform \
  --dashboard-body file://dashboard.json
```

---

## Rollback Procedure

If something goes wrong:

```bash
# Rollback CloudFormation stack
aws cloudformation cancel-update-stack \
  --stack-name MisraPlatform-dev

# Or revert to previous version
aws cloudformation update-stack \
  --stack-name MisraPlatform-dev \
  --use-previous-template
```

---

## Post-Deployment Checklist

- [ ] Frontend is accessible
- [ ] API endpoint is reachable
- [ ] Authentication works
- [ ] File upload works
- [ ] Analysis completes
- [ ] Results display correctly
- [ ] Error handling works
- [ ] Monitoring is active
- [ ] Logs are being collected
- [ ] Performance is acceptable

---

## Support

For issues:

1. Check CloudWatch logs: `aws logs tail /aws/lambda/misra-* --follow`
2. Check DynamoDB tables: `aws dynamodb scan --table-name AnalysisResults-dev`
3. Check API Gateway: `aws apigatewayv2 get-apis`
4. Review error messages in browser console

---

**Deployment Status**: ✅ READY  
**Estimated Time**: 15 minutes  
**Risk Level**: LOW  
**Rollback Time**: 5 minutes

🚀 **Ready to Deploy!**
