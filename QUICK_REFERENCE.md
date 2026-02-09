# MISRA Platform - Quick Reference Card

## 🌐 Live URLs

| Service | URL |
|---------|-----|
| **API Gateway** | https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com |
| **Frontend (CloudFront)** | https://dirwx3oa3t2uk.cloudfront.net |
| **Frontend (S3)** | http://misra-platform-frontend-105014798396.s3-website-us-east-1.amazonaws.com |

## 👥 Test Users

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@misra-platform.com | password123 |
| **Developer** | developer@misra-platform.com | password123 |
| **Viewer** | viewer@misra-platform.com | password123 |

## 🔧 Quick Commands

### Deploy Backend
```bash
cd packages/backend
npm run build
cdk deploy --require-approval never
```

### Deploy Frontend
```bash
cd packages/frontend
npm run build
aws s3 sync dist/ s3://misra-platform-frontend-105014798396/ --delete
```

### Create Test Users
```bash
.\create-test-users.ps1
```

### Test API Login
```bash
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@misra-platform.com","password":"password123"}'
```

## 📊 AWS Resources

### DynamoDB Tables
- `misra-platform-users`
- `misra-platform-file-metadata-dev`
- `misra-platform-analysis-results`
- `misra-platform-projects`
- `misra-platform-analyses`
- `misra-platform-test-runs`

### S3 Buckets
- `misra-platform-files-dev` (file storage)
- `misra-platform-frontend-105014798396` (frontend)

### Lambda Functions (12)
- LoginFunction
- RefreshFunction
- GetProfileFunction
- FileUploadFunction
- UploadCompleteFunction
- AnalysisFunction
- QueryResultsFunction
- UserStatsFunction
- ReportFunction
- AIInsightsFunction
- AIFeedbackFunction
- NotificationFunction

### Other Resources
- **Step Functions:** misra-analysis-workflow-MisraPlatformStack
- **SQS Queue:** misra-platform-processing
- **API Gateway:** MisraPlatformApi (HTTP API v2)

## 🔍 Monitoring Commands

### View Lambda Logs
```bash
aws logs tail /aws/lambda/LoginFunction --follow
```

### Check DynamoDB Tables
```bash
aws dynamodb list-tables
aws dynamodb scan --table-name misra-platform-users --limit 10
```

### List S3 Files
```bash
aws s3 ls s3://misra-platform-files-dev/
aws s3 ls s3://misra-platform-frontend-105014798396/
```

### Check Step Functions
```bash
aws stepfunctions list-state-machines
aws stepfunctions list-executions --state-machine-arn arn:aws:states:us-east-1:105014798396:stateMachine:misra-analysis-workflow-MisraPlatformStack
```

## 📝 API Endpoints

### Authentication
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh token
- `GET /auth/profile` - Get user profile

### Files
- `POST /files/upload` - Get presigned upload URL
- `POST /files/upload-complete` - Notify upload complete

### Analysis
- `GET /analysis/query` - Query analysis results
- `GET /analysis/stats/{userId}` - Get user statistics

### Reports
- `GET /reports/{fileId}` - Get violation report

### AI Insights
- `POST /ai/insights` - Generate AI insights
- `POST /ai/feedback` - Submit feedback

## 🚀 Quick Start

1. **Access Frontend:** https://dirwx3oa3t2uk.cloudfront.net
2. **Login:** Use admin@misra-platform.com / password123
3. **Upload File:** Navigate to Files → Upload
4. **Run Analysis:** Click Analyze on uploaded file
5. **View Results:** Check Analysis page for results
6. **Get Insights:** Navigate to Insights page

## 📚 Documentation

- **Deployment Guide:** [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Testing Guide:** [TESTING_GUIDE.md](TESTING_GUIDE.md)
- **Quick Start:** [QUICK_START.md](QUICK_START.md)
- **Project Summary:** [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)

## 🔐 AWS Secrets

Secrets stored in AWS Secrets Manager:
- `misra-platform/jwt-secret`
- `misra-platform/n8n-webhook-url`
- `misra-platform/n8n-api-key`

Update secrets:
```bash
.\setup-secrets.ps1
```

## 🐛 Troubleshooting

### Frontend not loading?
- Check CloudFront distribution status
- Verify S3 bucket has files
- Check browser console for errors

### API returning 401?
- Verify JWT token is valid
- Check user exists in DynamoDB
- Verify AWS Secrets Manager has JWT secret

### File upload failing?
- Check S3 bucket permissions
- Verify CORS configuration
- Check Lambda function logs

### Analysis not starting?
- Check SQS queue for messages
- Verify Step Functions state machine
- Check Lambda function permissions

## 📞 Support

- **GitHub:** https://github.com/anbunathanr/misra-testing
- **Issues:** https://github.com/anbunathanr/misra-testing/issues
- **CloudWatch Logs:** AWS Console → CloudWatch → Log Groups

---

**Last Updated:** February 2026  
**Version:** v0.22.0  
**Status:** ✅ Deployed and Operational
