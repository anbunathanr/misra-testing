# MISRA Platform Testing Guide

This guide provides instructions for testing the deployed MISRA Platform.

## Deployment Information

**Backend API:** https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com  
**Frontend (CloudFront):** https://dirwx3oa3t2uk.cloudfront.net  
**Frontend (S3):** http://misra-platform-frontend-105014798396.s3-website-us-east-1.amazonaws.com

## Test Users

Three test users have been created in DynamoDB:

### 1. Admin User
- **Email:** admin@misra-platform.com
- **Password:** password123
- **Role:** admin
- **Permissions:** Full access to all features

### 2. Developer User
- **Email:** developer@misra-platform.com
- **Password:** password123
- **Role:** developer
- **Permissions:** Upload files, run analysis, view results

### 3. Viewer User
- **Email:** viewer@misra-platform.com
- **Password:** password123
- **Role:** viewer
- **Permissions:** View analysis results only

## API Endpoints Testing

### 1. Authentication Endpoints

#### Login
```bash
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@misra-platform.com",
    "password": "password123"
  }'
```

Expected Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": {
    "userId": "admin-001",
    "email": "admin@misra-platform.com",
    "role": "admin"
  }
}
```

#### Get Profile
```bash
curl -X GET https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Refresh Token
```bash
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN_HERE"
  }'
```

### 2. File Upload Endpoints

#### Get Upload URL
```bash
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/files/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "fileName": "test.c",
    "fileSize": 1024,
    "contentType": "text/x-c"
  }'
```

Expected Response:
```json
{
  "uploadUrl": "https://s3.amazonaws.com/...",
  "fileId": "file-123",
  "expiresIn": 3600
}
```

#### Upload Complete Notification
```bash
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/files/upload-complete \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file-123"
  }'
```

### 3. Analysis Endpoints

#### Query Analysis Results
```bash
curl -X GET "https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/analysis/query?userId=admin-001&status=completed" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### Get User Statistics
```bash
curl -X GET https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/analysis/stats/admin-001 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected Response:
```json
{
  "totalFiles": 10,
  "totalViolations": 45,
  "criticalViolations": 5,
  "averageCompliance": 85.5,
  "recentAnalyses": []
}
```

### 4. Report Endpoints

#### Get Violation Report
```bash
curl -X GET https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/reports/file-123 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 5. AI Insights Endpoints

#### Generate Insights
```bash
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/ai/insights \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "fileId": "file-123",
    "analysisId": "analysis-456"
  }'
```

#### Submit Feedback
```bash
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/ai/feedback \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "insightId": "insight-789",
    "rating": 5,
    "comment": "Very helpful!"
  }'
```

## Frontend Testing

### Access the Application

1. Open your browser and navigate to:
   - CloudFront: https://dirwx3oa3t2uk.cloudfront.net
   - Or S3 Direct: http://misra-platform-frontend-105014798396.s3-website-us-east-1.amazonaws.com

2. You should see the login page

### Test Login Flow

1. Enter credentials for one of the test users
2. Click "Login"
3. You should be redirected to the dashboard

### Test File Upload

1. Navigate to the "Files" page
2. Click "Upload File"
3. Select a C/C++ file
4. Wait for upload to complete
5. File should appear in the file list

### Test Analysis

1. After uploading a file, click "Analyze"
2. Wait for analysis to complete
3. View the analysis results
4. Check violation details

### Test AI Insights

1. Navigate to the "Insights" page
2. Select a completed analysis
3. Click "Generate Insights"
4. View AI-generated recommendations

### Test Dashboard

1. Navigate to the "Dashboard" page
2. Verify statistics are displayed
3. Check charts and graphs
4. Verify recent activity

## AWS Resources Verification

### Check DynamoDB Tables

```bash
# List all tables
aws dynamodb list-tables

# Scan users table
aws dynamodb scan --table-name misra-platform-users --limit 10

# Scan file metadata table
aws dynamodb scan --table-name misra-platform-file-metadata-dev --limit 10

# Scan analysis results table
aws dynamodb scan --table-name misra-platform-analysis-results --limit 10
```

### Check S3 Buckets

```bash
# List files in storage bucket
aws s3 ls s3://misra-platform-files-dev/

# List frontend files
aws s3 ls s3://misra-platform-frontend-105014798396/
```

### Check Lambda Functions

```bash
# List all Lambda functions
aws lambda list-functions --query 'Functions[?contains(FunctionName, `misra`)].FunctionName'

# Get function details
aws lambda get-function --function-name LoginFunction

# View recent logs
aws logs tail /aws/lambda/LoginFunction --follow
```

### Check Step Functions

```bash
# List state machines
aws stepfunctions list-state-machines

# Get execution history
aws stepfunctions list-executions --state-machine-arn arn:aws:states:us-east-1:105014798396:stateMachine:misra-analysis-workflow-MisraPlatformStack
```

### Check SQS Queue

```bash
# Get queue URL
aws sqs get-queue-url --queue-name misra-platform-processing

# Check queue attributes
aws sqs get-queue-attributes --queue-url https://sqs.us-east-1.amazonaws.com/105014798396/misra-platform-processing --attribute-names All
```

## Common Issues and Troubleshooting

### Issue: Login fails with 401 Unauthorized

**Solution:**
- Verify test users exist in DynamoDB
- Check JWT secret in AWS Secrets Manager
- Verify n8n webhook is configured (if using external auth)

### Issue: File upload fails

**Solution:**
- Check S3 bucket permissions
- Verify CORS configuration on S3 bucket
- Check Lambda function logs for errors

### Issue: Analysis doesn't start

**Solution:**
- Check SQS queue for messages
- Verify Step Functions state machine is running
- Check Lambda function permissions

### Issue: Frontend shows CORS errors

**Solution:**
- Verify API Gateway CORS configuration
- Check S3 bucket CORS settings
- Ensure frontend .env has correct API URL

### Issue: AI insights not generating

**Solution:**
- Verify OpenAI API key in environment variables
- Check Lambda function timeout settings
- Review CloudWatch logs for errors

## Performance Testing

### Load Testing with Apache Bench

```bash
# Test login endpoint
ab -n 100 -c 10 -p login.json -T application/json https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/auth/login

# Test file upload
ab -n 50 -c 5 -H "Authorization: Bearer TOKEN" https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/files/upload
```

### Monitor CloudWatch Metrics

1. Go to AWS CloudWatch Console
2. Select "Metrics" → "Lambda"
3. Monitor:
   - Invocations
   - Duration
   - Errors
   - Throttles

## Security Testing

### Test Authentication

1. Try accessing protected endpoints without token
2. Try using expired token
3. Try using token with wrong role

### Test Authorization

1. Login as viewer user
2. Try to upload file (should fail)
3. Try to delete file (should fail)

### Test Input Validation

1. Try uploading invalid file types
2. Try SQL injection in search fields
3. Try XSS in text inputs

## Next Steps

1. **Configure n8n Integration**
   - Update n8n webhook URL in AWS Secrets Manager
   - Update n8n API key in AWS Secrets Manager
   - Test webhook notifications

2. **Set up Monitoring**
   - Configure CloudWatch alarms
   - Set up SNS notifications
   - Create custom dashboards

3. **Production Deployment**
   - Update environment to 'prod'
   - Enable point-in-time recovery on DynamoDB
   - Enable versioning on S3 buckets
   - Configure custom domain
   - Set up SSL certificate

4. **Continuous Integration**
   - Set up GitHub Actions
   - Configure automated testing
   - Set up automated deployments

## Support

For issues or questions:
- Check CloudWatch Logs
- Review DEPLOYMENT_GUIDE.md
- Check GitHub Issues: https://github.com/anbunathanr/misra-testing/issues
