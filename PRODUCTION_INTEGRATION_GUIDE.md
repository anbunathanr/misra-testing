# 🚀 Production Integration Guide
## Connecting Frontend to Real AWS Backend

This guide walks you through integrating the MISRA Compliance Platform frontend with the real AWS backend infrastructure.

---

## 📋 Prerequisites

Before starting, ensure you have:

✅ **AWS Backend Deployed** - All Lambda functions, DynamoDB tables, S3 buckets, and Cognito User Pool deployed
✅ **AWS Credentials** - AWS CLI configured with appropriate permissions
✅ **Backend Outputs** - CDK deployment outputs available
✅ **Node.js 20+** - For running the frontend
✅ **Git** - For version control

---

## 🔧 Step 1: Get AWS Backend Configuration

### 1.1 Get API Gateway URL

```bash
# Navigate to backend directory
cd packages/backend

# Get API Gateway URL from CDK outputs
aws cloudformation describe-stacks \
  --stack-name MisraPlatformProductionStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

**Expected Output**: `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod`

### 1.2 Get Cognito Configuration

```bash
# Get Cognito User Pool ID
aws cloudformation describe-stacks \
  --stack-name MisraPlatformProductionStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' \
  --output text

# Get Cognito Client ID
aws cloudformation describe-stacks \
  --stack-name MisraPlatformProductionStack \
  --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' \
  --output text

# Get Cognito Region
aws cloudformation describe-stacks \
  --stack-name MisraPlatformProductionStack \
  --query 'Stacks[0].StackId' \
  --output text | cut -d':' -f4
```

### 1.3 Get S3 Bucket Name

```bash
# Get S3 bucket name
aws cloudformation describe-stacks \
  --stack-name MisraPlatformProductionStack \
  --query 'Stacks[0].Outputs[?OutputKey==`FilesBucketName`].OutputValue' \
  --output text
```

---

## 🔐 Step 2: Configure Frontend Environment

### 2.1 Create Production Environment File

```bash
cd packages/frontend

# Create .env.production file
cat > .env.production << 'EOF'
# API Configuration
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
VITE_ENVIRONMENT=production

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1

# Feature Flags
VITE_USE_MOCK_BACKEND=false
VITE_ENABLE_REAL_AUTH=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_ANALYSIS=true

# Optional: Analytics
VITE_ENABLE_ANALYTICS=false
EOF
```

### 2.2 Update Environment Variables

Replace the placeholder values with your actual AWS configuration:

```bash
# Replace API URL
sed -i 's|https://your-api-gateway-url.*|https://YOUR_ACTUAL_API_URL|g' .env.production

# Replace Cognito User Pool ID
sed -i 's|us-east-1_XXXXXXXXX|YOUR_ACTUAL_USER_POOL_ID|g' .env.production

# Replace Cognito Client ID
sed -i 's|xxxxxxxxxxxxxxxxxxxxxxxxxx|YOUR_ACTUAL_CLIENT_ID|g' .env.production

# Replace Region (if different)
sed -i 's|us-east-1|YOUR_ACTUAL_REGION|g' .env.production
```

### 2.3 Create Local Development Environment

```bash
# Create .env.local for local development
cat > .env.local << 'EOF'
# API Configuration (use your deployed backend)
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/prod
VITE_ENVIRONMENT=development

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1

# Feature Flags (enable real backend)
VITE_USE_MOCK_BACKEND=false
VITE_ENABLE_REAL_AUTH=true
VITE_ENABLE_FILE_UPLOAD=true
VITE_ENABLE_ANALYSIS=true

# Debug Mode
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
EOF
```

---

## 🔄 Step 3: Update Frontend Code

### 3.1 Update Workflow Service

The frontend needs to use the production workflow service instead of the mock service.

**File**: `packages/frontend/src/pages/AutomatedAnalysisPage.tsx`

```typescript
// Replace this import:
import { workflowAutomationService } from '../services/workflow-automation';

// With this:
import { productionWorkflowService } from '../services/production-workflow-service';

// Then update the service call:
const result = await productionWorkflowService.startAutomatedWorkflow(
  {
    email,
    name,
    // Optional: provide custom file
    // fileName: 'my_code.c',
    // fileContent: '/* your code here */',
    // language: 'c'
  },
  (progress) => {
    console.log('📊 Progress update:', progress);
    setWorkflowProgress(progress);
  }
);
```

### 3.2 Update Auth Service Configuration

**File**: `packages/frontend/src/services/auth-service.ts`

Ensure the auth service is configured to use AWS Cognito:

```typescript
// At the top of the file, add:
const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
  region: import.meta.env.VITE_COGNITO_REGION || 'us-east-1'
};

// Verify configuration on initialization
if (!cognitoConfig.userPoolId || !cognitoConfig.clientId) {
  console.error('❌ Cognito configuration missing. Please set environment variables.');
}
```

---

## 🧪 Step 4: Test the Integration

### 4.1 Start Development Server

```bash
cd packages/frontend

# Install dependencies (if not already done)
npm install

# Start development server with production backend
npm run dev
```

**Expected Output**:
```
VITE v5.0.0  ready in 500 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

### 4.2 Test Authentication Flow

1. **Open Browser**: Navigate to `http://localhost:5173`

2. **Enter Email**: Use a valid email address (you'll receive verification code)

3. **Check Console**: Look for authentication logs:
   ```
   🚀 Starting production workflow for: user@example.com
   📋 Demo mode: false
   📞 Calling productionWorkflowService.startAutomatedWorkflow...
   🔐 Step 1: Authenticating user user@example.com
   ```

4. **Verify Email**: Check your email for verification code from AWS Cognito

5. **Complete MFA Setup**: If required, scan QR code with authenticator app

### 4.3 Test File Upload Flow

1. **After Authentication**: The workflow should proceed to file upload

2. **Check Console**: Look for upload logs:
   ```
   📁 Step 2: Uploading file to S3
   📄 Selected file: medium_compliance.c (3072 bytes)
   🔗 Requesting presigned upload URL
   ✅ Presigned URL obtained: file-abc123
   ☁️ Uploading file to S3...
   ✅ File uploaded successfully to S3
   ```

3. **Verify S3**: Check S3 bucket for uploaded file:
   ```bash
   aws s3 ls s3://misra-platform-files-prod-YOUR_ACCOUNT_ID/
   ```

### 4.4 Test Analysis Flow

1. **After Upload**: Analysis should start automatically

2. **Check Console**: Look for analysis logs:
   ```
   🔍 Step 3: Starting MISRA analysis for file file-abc123
   ⏳ Waiting for analysis to complete...
   🔍 Analysis progress: 20%
   🔍 Analysis progress: 40%
   🔍 Analysis progress: 60%
   🔍 Analysis progress: 80%
   🔍 Analysis progress: 100%
   ✅ Analysis completed: 75% compliance
   📊 Found 8 violations
   ```

3. **Verify DynamoDB**: Check analysis results table:
   ```bash
   aws dynamodb scan \
     --table-name misra-platform-analysis-results-prod \
     --limit 5
   ```

### 4.5 Test Results Display

1. **After Analysis**: Results should display automatically

2. **Verify Display**:
   - ✅ Compliance score shown
   - ✅ Violations count shown
   - ✅ Violations table populated
   - ✅ Download Report button works
   - ✅ Analyze Another File button works

---

## 🐛 Troubleshooting

### Issue 1: "VITE_API_URL not configured"

**Symptom**: Console warning about missing API URL

**Solution**:
```bash
# Verify .env.local exists and has correct values
cat packages/frontend/.env.local

# If missing, create it with correct values
echo "VITE_API_URL=https://your-api-url" > packages/frontend/.env.local
```

### Issue 2: "No authentication token available"

**Symptom**: Authentication fails with token error

**Solution**:
```bash
# Check Cognito configuration
aws cognito-idp describe-user-pool \
  --user-pool-id YOUR_USER_POOL_ID

# Verify user pool client
aws cognito-idp describe-user-pool-client \
  --user-pool-id YOUR_USER_POOL_ID \
  --client-id YOUR_CLIENT_ID
```

### Issue 3: "Failed to get upload URL"

**Symptom**: File upload fails with 403 or 500 error

**Solution**:
```bash
# Check Lambda function logs
aws logs tail /aws/lambda/misra-platform-upload-file-prod --follow

# Verify IAM permissions
aws iam get-role-policy \
  --role-name misra-platform-upload-file-role \
  --policy-name S3AccessPolicy
```

### Issue 4: "Analysis timeout"

**Symptom**: Analysis never completes, times out after 5 minutes

**Solution**:
```bash
# Check analysis Lambda logs
aws logs tail /aws/lambda/misra-platform-analyze-file-prod --follow

# Check SQS queue
aws sqs get-queue-attributes \
  --queue-url YOUR_QUEUE_URL \
  --attribute-names All

# Check DLQ for failed messages
aws sqs receive-message \
  --queue-url YOUR_DLQ_URL
```

### Issue 5: CORS Errors

**Symptom**: Browser console shows CORS errors

**Solution**:
```bash
# Update API Gateway CORS settings
aws apigatewayv2 update-api \
  --api-id YOUR_API_ID \
  --cors-configuration AllowOrigins=http://localhost:5173,AllowMethods=*,AllowHeaders=*
```

---

## 📊 Monitoring and Debugging

### Enable Debug Logging

```bash
# In .env.local, add:
VITE_DEBUG_MODE=true
VITE_LOG_LEVEL=debug
```

### Monitor AWS Resources

```bash
# Watch Lambda logs in real-time
aws logs tail /aws/lambda/misra-platform-upload-file-prod --follow

# Check API Gateway logs
aws logs tail /aws/apigateway/misra-platform-prod --follow

# Monitor DynamoDB operations
aws dynamodb describe-table \
  --table-name misra-platform-file-metadata-prod \
  --query 'Table.TableStatus'
```

### Check CloudWatch Metrics

```bash
# Lambda invocations
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=misra-platform-upload-file-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum

# API Gateway requests
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=misra-platform-api-prod \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

## 🚀 Step 5: Build for Production

### 5.1 Build Frontend

```bash
cd packages/frontend

# Build with production environment
npm run build

# Verify build output
ls -lh dist/
```

### 5.2 Deploy to Hosting

#### Option A: Deploy to S3 + CloudFront

```bash
# Create S3 bucket for frontend
aws s3 mb s3://misra-platform-frontend-prod

# Enable static website hosting
aws s3 website s3://misra-platform-frontend-prod \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://misra-platform-frontend-prod --acl public-read

# Create CloudFront distribution (optional, for HTTPS and CDN)
aws cloudfront create-distribution \
  --origin-domain-name misra-platform-frontend-prod.s3.amazonaws.com \
  --default-root-object index.html
```

#### Option B: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd packages/frontend
vercel --prod

# Set environment variables in Vercel dashboard
# VITE_API_URL
# VITE_COGNITO_USER_POOL_ID
# VITE_COGNITO_CLIENT_ID
# VITE_COGNITO_REGION
```

#### Option C: Deploy to Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd packages/frontend
netlify deploy --prod --dir=dist

# Set environment variables in Netlify dashboard
```

---

## ✅ Production Checklist

Before going live, verify:

- [ ] AWS backend fully deployed and tested
- [ ] Environment variables configured correctly
- [ ] Authentication flow working (email verification + MFA)
- [ ] File upload to S3 working
- [ ] MISRA analysis Lambda executing successfully
- [ ] Results displaying correctly
- [ ] Download Report feature working
- [ ] CORS configured for production domain
- [ ] SSL/TLS certificate configured
- [ ] CloudWatch monitoring enabled
- [ ] Error tracking configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Performance optimized (lazy loading, code splitting)
- [ ] SEO meta tags added
- [ ] Analytics configured (optional)

---

## 📚 Additional Resources

- **AWS Cognito Documentation**: https://docs.aws.amazon.com/cognito/
- **AWS S3 Presigned URLs**: https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html
- **AWS Lambda Best Practices**: https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html
- **MISRA C/C++ Guidelines**: https://www.misra.org.uk/

---

## 🎉 Success!

Your MISRA Compliance Platform is now fully integrated with the real AWS backend!

**Next Steps**:
1. Test with real users
2. Monitor CloudWatch metrics
3. Optimize performance based on usage patterns
4. Add additional features (user management, team collaboration, etc.)
5. Set up CI/CD pipeline for automated deployments

---

**Last Updated**: 2024-01-20
**Version**: 1.0.0
**Status**: Production Ready ✅
