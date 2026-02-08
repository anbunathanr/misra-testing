# MISRA Platform - Quick Start Deployment

## 🚀 Deploy in 3 Steps

### Step 1: Setup AWS Secrets (2 minutes)

```powershell
.\setup-secrets.ps1
```

This will create the required secrets in AWS Secrets Manager.

### Step 2: Deploy Backend (5-10 minutes)

```powershell
.\deploy.ps1
```

This will:
- Install dependencies
- Build the backend
- Deploy to AWS
- Build the frontend

### Step 3: Test Locally (1 minute)

```powershell
cd packages/frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## ✅ What Gets Deployed

**Backend (AWS):**
- 12 Lambda functions
- 6 DynamoDB tables
- 1 S3 bucket
- 1 SQS queue
- 1 Step Functions state machine
- 1 API Gateway

**Frontend (Local):**
- React application running on http://localhost:5173

---

## 🧪 Testing the Application

### 1. Create a Test User

Since authentication is integrated with n8n, you'll need to create a test user manually:

```powershell
aws dynamodb put-item `
  --table-name MisraPlatform-Users `
  --item '{
    "userId": {"S": "test-123"},
    "email": {"S": "test@example.com"},
    "name": {"S": "Test User"},
    "role": {"S": "developer"},
    "createdAt": {"N": "1234567890"},
    "updatedAt": {"N": "1234567890"}
  }'
```

### 2. Test Login

- Open http://localhost:5173
- Enter email: `test@example.com`
- Enter any password (authentication is mocked for now)
- Click "Sign In"

### 3. Test Features

**File Upload:**
1. Go to "Files" page
2. Drag and drop a C/C++ file
3. Click "Upload All"

**Analysis:**
1. Go to "Analysis" page
2. View analysis results
3. Click on a result to see violation details

**AI Insights:**
1. Go to "Insights" page
2. View AI-generated insights
3. Check recommendations and trends

---

## 📊 Monitoring

### View Lambda Logs

```powershell
# View login function logs
aws logs tail /aws/lambda/MisraPlatform-login --follow

# View analysis function logs
aws logs tail /aws/lambda/MisraPlatform-analyze-file --follow
```

### Check DynamoDB Tables

```powershell
# List all tables
aws dynamodb list-tables

# Scan Users table
aws dynamodb scan --table-name MisraPlatform-Users
```

### Check S3 Bucket

```powershell
# List files in bucket
aws s3 ls s3://misraplatform-filestoragebucket-xxxxx/
```

---

## 🔧 Troubleshooting

### Issue: "Cannot find module"

**Solution:**
```powershell
cd packages/backend
npm install
npm run build
```

### Issue: "Access Denied" errors

**Solution:**
- Check AWS credentials: `aws sts get-caller-identity`
- Verify IAM permissions
- Check region matches deployment region

### Issue: Frontend can't connect to API

**Solution:**
- Check `.env` file has correct API URL
- Verify API Gateway is deployed
- Check CORS settings

### Issue: Login doesn't work

**Solution:**
- Create test user in DynamoDB (see above)
- Check n8n webhook configuration
- View Lambda logs for errors

---

## 🧹 Cleanup

To remove all AWS resources:

```powershell
cd packages/backend
cdk destroy
```

---

## 📚 Next Steps

1. **Deploy Frontend to S3** - See DEPLOYMENT_GUIDE.md
2. **Add Custom Domain** - Configure Route 53
3. **Enable HTTPS** - Set up SSL certificate
4. **Add Monitoring** - Configure CloudWatch alarms
5. **Set up CI/CD** - Automate deployments

---

## 💰 Cost Estimate

**Development/Testing (low usage):**
- Lambda: ~$0-5/month
- DynamoDB: ~$0-10/month
- S3: ~$0-5/month
- API Gateway: ~$0-5/month
- **Total: ~$0-30/month**

**Production (moderate usage):**
- Lambda: ~$20-50/month
- DynamoDB: ~$20-50/month
- S3: ~$10-20/month
- API Gateway: ~$10-20/month
- **Total: ~$60-140/month**

---

## 🆘 Need Help?

- Check DEPLOYMENT_GUIDE.md for detailed instructions
- View CloudWatch logs for errors
- Check AWS CDK documentation
- Review GitHub issues

---

*Last Updated: February 2026*
