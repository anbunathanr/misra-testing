# AIBTS Platform - Complete Deployment Guide

## 🎯 Overview

This guide covers the complete deployment process for the AI-Based Test System (AIBTS) platform, including all completed features:
- ✅ Test Execution System
- ✅ AI Test Generation
- ✅ Notification System
- ✅ System Integration Testing

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 20.x or higher
- **AWS CLI**: Version 2.x
- **AWS CDK**: Version 2.x (`npm install -g aws-cdk`)
- **Git**: For version control

### AWS Account Requirements
- Active AWS account with appropriate permissions
- AWS credentials configured (`aws configure`)
- Sufficient service limits for:
  - Lambda functions (20+)
  - DynamoDB tables (10+)
  - API Gateway routes (50+)
  - S3 buckets (2+)
  - SNS topics (3+)
  - SQS queues (4+)
  - EventBridge rules (3+)

### Required API Keys
- **OpenAI API Key**: For AI test generation (GPT-4 or GPT-3.5-turbo access)

## 🔐 Pre-Deployment Configuration

### 1. Create AWS Secrets

Create the following secrets in AWS Secrets Manager:

```bash
# JWT Secret for authentication
aws secretsmanager create-secret \
  --name misra-platform/jwt-secret \
  --secret-string "your-secure-jwt-secret-here"

# n8n Webhook URL (optional - for n8n integration)
aws secretsmanager create-secret \
  --name misra-platform/n8n-webhook-url \
  --secret-string "https://your-n8n-instance.com/webhook/test-notifications"

# n8n API Key (optional - for n8n integration)
aws secretsmanager create-secret \
  --name misra-platform/n8n-api-key \
  --secret-string "your-n8n-api-key"
```

### 2. Configure Environment Variables

Create `.env` file in `packages/backend`:

```bash
# OpenAI Configuration (REQUIRED for AI Test Generation)
OPENAI_API_KEY=sk-your-actual-api-key-here

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# AI Test Generation Configuration
AI_MODEL=gpt-4
AI_MAX_TOKENS=2000
AI_TEMPERATURE=0.7

# Usage Limits
USER_MONTHLY_COST_LIMIT=100
USER_DAILY_CALL_LIMIT=100
PROJECT_MONTHLY_COST_LIMIT=50
PROJECT_DAILY_CALL_LIMIT=50

# Notification Configuration
SNS_TOPIC_ARN_EMAIL=arn:aws:sns:region:account:email-topic
SNS_TOPIC_ARN_SMS=arn:aws:sns:region:account:sms-topic
SNS_TOPIC_ARN_WEBHOOK=arn:aws:sns:region:account:webhook-topic

# Test Execution Configuration
BROWSER_TIMEOUT=30000
SCREENSHOT_BUCKET=aibts-screenshots
```

## 🚀 Deployment Steps

### Step 1: Install Dependencies

```bash
# Navigate to project root
cd /path/to/aibts-platform

# Install backend dependencies
cd packages/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ../..
```

### Step 2: Build Backend

```bash
cd packages/backend

# Build TypeScript
npm run build

# Verify build succeeded
ls dist/
```

### Step 3: Bootstrap CDK (First Time Only)

```bash
# Bootstrap CDK in your AWS account
cdk bootstrap

# Verify bootstrap
aws cloudformation describe-stacks --stack-name CDKToolkit
```

### Step 4: Deploy Infrastructure

```bash
# Synthesize CloudFormation template
cdk synth

# Review changes (optional)
cdk diff

# Deploy to AWS
cdk deploy --require-approval never
```

**Expected Deployment Time**: 10-15 minutes

**Resources Created**:
- 20+ Lambda functions
- 10+ DynamoDB tables
- 1 API Gateway
- 2 S3 buckets
- 3 SNS topics
- 4 SQS queues
- 3 EventBridge rules
- IAM roles and policies

### Step 5: Verify Deployment

```bash
# Check Lambda functions
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `aibts`)].FunctionName'

# Check DynamoDB tables
aws dynamodb list-tables --query 'TableNames[?starts_with(@, `aibts`)]'

# Check API Gateway
aws apigatewayv2 get-apis --query 'Items[?Name==`misra-platform-api`]'

# Get API Gateway URL
aws cloudformation describe-stacks \
  --stack-name MisraPlatformStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text
```

### Step 6: Seed Default Data

```bash
# Seed notification templates
aws lambda invoke \
  --function-name aibts-seed-templates \
  --payload '{}' \
  response.json

cat response.json
```

### Step 7: Configure Frontend

```bash
cd packages/frontend

# Get API Gateway URL from deployment output
API_URL=$(aws cloudformation describe-stacks \
  --stack-name MisraPlatformStack \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiUrl`].OutputValue' \
  --output text)

# Create .env file
echo "VITE_API_URL=$API_URL" > .env

# Build frontend
npm run build
```

### Step 8: Deploy Frontend (Optional)

#### Option A: Deploy to S3 + CloudFront

```bash
# Create S3 bucket
aws s3 mb s3://aibts-frontend-$(date +%s)

# Enable static website hosting
aws s3 website s3://aibts-frontend-$(date +%s) \
  --index-document index.html \
  --error-document index.html

# Upload build files
aws s3 sync dist/ s3://aibts-frontend-$(date +%s) --acl public-read

# Get website URL
aws s3api get-bucket-website \
  --bucket aibts-frontend-$(date +%s) \
  --query 'WebsiteURL' \
  --output text
```

#### Option B: Run Locally

```bash
cd packages/frontend
npm run dev
```

Access at: http://localhost:5173

## 🧪 Post-Deployment Testing

### 1. Health Check

```bash
# Test API health
curl https://your-api-gateway-url/health

# Expected response:
# {"status":"healthy","timestamp":"2024-01-20T10:00:00.000Z"}
```

### 2. Test Authentication

```bash
# Create test user (manual DynamoDB entry or via API)
aws dynamodb put-item \
  --table-name aibts-users \
  --item '{
    "userId": {"S": "test-user-123"},
    "email": {"S": "test@example.com"},
    "name": {"S": "Test User"},
    "createdAt": {"N": "'$(date +%s)'"}
  }'
```

### 3. Test AI Test Generation

```bash
# Test analyze endpoint
curl -X POST https://your-api-gateway-url/ai-test-generation/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com",
    "options": {
      "timeout": 30000
    }
  }'
```

### 4. Test Test Execution

```bash
# Create test project
curl -X POST https://your-api-gateway-url/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Project",
    "targetUrl": "https://example.com"
  }'

# Create test case
curl -X POST https://your-api-gateway-url/test-cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "PROJECT_ID",
    "name": "Test Case 1",
    "steps": [
      {"action": "navigate", "target": "https://example.com"},
      {"action": "click", "target": "#button"}
    ]
  }'

# Trigger execution
curl -X POST https://your-api-gateway-url/executions/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "testCaseId": "TEST_CASE_ID"
  }'
```

### 5. Test Notifications

```bash
# Update notification preferences
curl -X PUT https://your-api-gateway-url/notifications/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "email": "test@example.com",
    "channels": ["email"],
    "events": ["test_completion", "test_failure"]
  }'
```

### 6. Run Integration Tests

```bash
cd packages/backend

# Run all integration tests
npm test -- --testPathPattern=scenarios --no-coverage

# Expected output:
# PASS src/__tests__/integration/scenarios/error-handling.test.ts
# PASS src/__tests__/integration/scenarios/infrastructure.test.ts
# PASS src/__tests__/integration/scenarios/auth-cost-monitoring.test.ts
# PASS src/__tests__/integration/scenarios/end-to-end-workflows.test.ts
# PASS src/__tests__/integration/scenarios/performance-scalability.test.ts
```

## 📊 Monitoring Setup

### CloudWatch Dashboards

Create a dashboard to monitor key metrics:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name AIBTS-Platform \
  --dashboard-body file://cloudwatch-dashboard.json
```

### CloudWatch Alarms

Set up alarms for critical metrics:

```bash
# Lambda error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name aibts-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold

# DynamoDB throttle alarm
aws cloudwatch put-metric-alarm \
  --alarm-name aibts-dynamodb-throttles \
  --alarm-description "Alert on DynamoDB throttles" \
  --metric-name UserErrors \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold
```

### Cost Monitoring

```bash
# Enable cost allocation tags
aws ce update-cost-allocation-tags-status \
  --cost-allocation-tags-status TagKey=Project,Status=Active

# Create budget
aws budgets create-budget \
  --account-id YOUR_ACCOUNT_ID \
  --budget file://budget.json
```

## 🔧 Configuration Management

### Environment-Specific Configuration

Create separate configurations for different environments:

```bash
# Development
export ENVIRONMENT=dev
export LOG_LEVEL=debug

# Staging
export ENVIRONMENT=staging
export LOG_LEVEL=info

# Production
export ENVIRONMENT=prod
export LOG_LEVEL=warn
```

### Feature Flags

Enable/disable features using environment variables:

```bash
# Enable AI test generation
export ENABLE_AI_GENERATION=true

# Enable notifications
export ENABLE_NOTIFICATIONS=true

# Enable learning engine
export ENABLE_LEARNING=false
```

## 🐛 Troubleshooting

### Common Issues

#### 1. CDK Deployment Fails

**Error**: `statement.freeze is not a function`

**Solution**:
```bash
# Clean install
cd packages/backend
rm -rf node_modules package-lock.json
npm install
npm run build
cdk deploy
```

#### 2. Lambda Timeout

**Error**: "Task timed out after 30.00 seconds"

**Solution**: Increase Lambda timeout in CDK stack:
```typescript
timeout: cdk.Duration.minutes(5)
```

#### 3. OpenAI API Key Not Set

**Error**: "OpenAI API key is not configured"

**Solution**: Set environment variable in Lambda:
```bash
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={OPENAI_API_KEY=sk-your-key}"
```

#### 4. DynamoDB Throttling

**Error**: "ProvisionedThroughputExceededException"

**Solution**: Switch to on-demand billing or increase provisioned capacity

#### 5. Integration Tests Failing

**Error**: "System health check failed"

**Solution**: Ensure all AWS resources are deployed and accessible

### Debug Mode

Enable detailed logging:

```bash
# Set log level
export LOG_LEVEL=debug

# Enable X-Ray tracing
export AWS_XRAY_TRACING_ENABLED=true

# View Lambda logs
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

## 🔄 Updates and Rollback

### Deploying Updates

```bash
# Pull latest changes
git pull origin main

# Install dependencies
npm install

# Build
npm run build

# Deploy
cdk deploy
```

### Rollback

```bash
# Rollback to previous version
cdk deploy --rollback

# Or destroy and redeploy
cdk destroy
cdk deploy
```

## 📈 Performance Optimization

### Lambda Optimization

- Use provisioned concurrency for frequently called functions
- Optimize memory allocation based on CloudWatch metrics
- Enable Lambda SnapStart for faster cold starts

### DynamoDB Optimization

- Use on-demand billing for variable workloads
- Create appropriate GSIs for query patterns
- Enable DynamoDB Accelerator (DAX) for read-heavy workloads

### API Gateway Optimization

- Enable caching for GET requests
- Use throttling to prevent abuse
- Implement request validation

## 🔒 Security Best Practices

1. **Secrets Management**: Store all secrets in AWS Secrets Manager
2. **IAM Least Privilege**: Grant minimum required permissions
3. **API Authentication**: Require JWT tokens for all endpoints
4. **Encryption**: Enable encryption at rest and in transit
5. **VPC**: Deploy Lambda functions in VPC for sensitive operations
6. **WAF**: Enable AWS WAF for API Gateway
7. **Audit Logging**: Enable CloudTrail for all API calls

## 📚 Additional Resources

- **Integration Tests**: See `HOW_TO_RUN_INTEGRATION_TESTS.md`
- **AI Test Generation**: See `AI_TEST_GENERATION_DEPLOYMENT.md`
- **Notification System**: See `NOTIFICATION_SYSTEM_COMPLETION.md`
- **CI/CD Setup**: See `packages/backend/src/__tests__/integration/CI-CD-SETUP.md`
- **Troubleshooting**: See `CDK_DEPLOYMENT_TROUBLESHOOTING.md`

## ✅ Deployment Checklist

- [ ] AWS credentials configured
- [ ] AWS Secrets created (JWT, n8n)
- [ ] OpenAI API key obtained
- [ ] Environment variables set
- [ ] Dependencies installed
- [ ] Backend built successfully
- [ ] CDK bootstrapped
- [ ] Infrastructure deployed
- [ ] Default data seeded
- [ ] Frontend configured and built
- [ ] Health checks passing
- [ ] Integration tests passing
- [ ] Monitoring configured
- [ ] Alarms set up
- [ ] Documentation reviewed

## 🎉 Next Steps

After successful deployment:

1. **Create Test Users**: Add users to DynamoDB Users table
2. **Configure Notification Preferences**: Set up email/SMS/webhook preferences
3. **Create Test Projects**: Set up initial test projects
4. **Generate AI Tests**: Use AI test generation to create test cases
5. **Execute Tests**: Run test executions and verify results
6. **Monitor System**: Review CloudWatch dashboards and logs
7. **Optimize Performance**: Adjust Lambda memory and timeouts based on metrics

## 📞 Support

For issues or questions:
- Check CloudWatch Logs for error details
- Review integration test results
- Consult troubleshooting guides
- Check AWS service health dashboard

---

**Deployment Status**: Ready for Production ✅
**Last Updated**: 2024-01-20
**Version**: 1.0.0
