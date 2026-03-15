# Phase 5: Deployment Checklist

## Pre-Deployment Checklist

### 1. Hugging Face Setup
- [ ] Created Hugging Face account (https://huggingface.co)
- [ ] Generated API token (https://huggingface.co/settings/tokens)
- [ ] Token starts with `hf_`
- [ ] Token has Read access

### 2. AWS Secrets Manager
- [ ] Stored Hugging Face token in Secrets Manager:
  ```bash
  aws secretsmanager create-secret \
    --name aibts/huggingface-api-key \
    --secret-string "hf_YOUR_TOKEN" \
    --region us-east-1
  ```
- [ ] Verified secret exists:
  ```bash
  aws secretsmanager describe-secret \
    --secret-id aibts/huggingface-api-key \
    --region us-east-1
  ```

### 3. Backend Preparation
- [ ] Installed dependencies: `cd packages/backend && npm install`
- [ ] Built successfully: `npm run build`
- [ ] No TypeScript errors
- [ ] All tests passing: `npm test`

### 4. Frontend Preparation
- [ ] Installed dependencies: `cd packages/frontend && npm install`
- [ ] No dependency conflicts
- [ ] `amazon-cognito-identity-js` installed

### 5. Environment Configuration
- [ ] `.env.production` exists in frontend
- [ ] API URL configured
- [ ] Cognito placeholders ready

## Deployment Steps

### Step 1: Deploy Backend (30-45 minutes)

#### 1.1 Deploy Infrastructure
```bash
cd packages/backend
npm run build
cdk deploy MinimalStack --require-approval never
```

**Expected outputs**:
- ApiUrl
- UserPoolId
- UserPoolClientId

#### 1.2 Verify Deployment
- [ ] CloudFormation stack created successfully
- [ ] All Lambda functions deployed
- [ ] API Gateway created
- [ ] Cognito User Pool created
- [ ] DynamoDB tables created

#### 1.3 Test Backend
```bash
# Test health endpoint
curl https://YOUR_API_URL/health

# Expected: {"status":"healthy"}
```

### Step 2: Configure Frontend (10 minutes)

#### 2.1 Update Environment Variables
```bash
cd packages/frontend
```

Edit `.env.production`:
```env
VITE_API_URL=https://YOUR_API_URL
VITE_COGNITO_USER_POOL_ID=YOUR_USER_POOL_ID
VITE_COGNITO_CLIENT_ID=YOUR_CLIENT_ID
VITE_COGNITO_REGION=us-east-1
```

#### 2.2 Verify Configuration
- [ ] All environment variables set
- [ ] No placeholder values
- [ ] URLs are HTTPS

### Step 3: Deploy Frontend (10-15 minutes)

#### 3.1 Build Frontend
```bash
npm run build
```

**Expected**:
- Build completes successfully
- dist/ folder created
- Bundle size <1MB

#### 3.2 Deploy to Vercel
```bash
vercel --prod --yes
```

**Expected**:
- Deployment successful
- URL: https://aibts-platform.vercel.app

#### 3.3 Verify Deployment
- [ ] Frontend accessible
- [ ] No console errors
- [ ] Login page loads
- [ ] Register page loads

### Step 4: Update CORS (5 minutes)

#### 4.1 Verify CORS Configuration
Check `packages/backend/src/infrastructure/minimal-stack.ts`:
```typescript
allowOrigins: [
  'http://localhost:3000',
  'https://aibts-platform.vercel.app'
]
```

#### 4.2 Redeploy if Needed
If CORS not configured:
```bash
cd packages/backend
cdk deploy MinimalStack
```

## Post-Deployment Verification

### 1. Automated Tests (5 minutes)
```powershell
.\test-phase5.ps1
```

**Expected**: All tests pass

### 2. Manual Smoke Test (10 minutes)

#### 2.1 User Registration
- [ ] Navigate to /register
- [ ] Fill in form
- [ ] Submit
- [ ] Success message appears
- [ ] Redirected to login

#### 2.2 User Login
- [ ] Navigate to /login
- [ ] Enter credentials
- [ ] Submit
- [ ] Redirected to dashboard
- [ ] User info displayed

#### 2.3 Create Project
- [ ] Navigate to Projects
- [ ] Click Create
- [ ] Fill in form
- [ ] Submit
- [ ] Project appears in list

#### 2.4 AI Generation (Optional - requires Hugging Face quota)
- [ ] Navigate to Test Cases
- [ ] Click Generate with AI
- [ ] Fill in form
- [ ] Submit
- [ ] Test case generated (may take 10-30s)

### 3. CloudWatch Logs (5 minutes)

#### 3.1 Check Lambda Logs
```bash
# AI Generation logs
aws logs tail /aws/lambda/aibts-ai-generate --follow

# Projects logs
aws logs tail /aws/lambda/aibts-projects-create --follow
```

**Expected**:
- Structured JSON logs
- No errors
- Request IDs present

#### 3.2 Check for Errors
```bash
aws logs filter-pattern "ERROR" \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000
```

**Expected**: No errors (or only expected errors)

### 4. DynamoDB Tables (5 minutes)

#### 4.1 Verify Tables Created
```bash
aws dynamodb list-tables --region us-east-1
```

**Expected tables**:
- aibts-projects
- aibts-test-cases
- aibts-test-suites
- aibts-test-executions
- aibts-ai-usage
- aibts-ai-learning

#### 4.2 Check Data
```bash
# Check projects table
aws dynamodb scan --table-name aibts-projects --limit 5

# Check AI usage table
aws dynamodb scan --table-name aibts-ai-usage --limit 5
```

### 5. Cognito User Pool (5 minutes)

#### 5.1 Verify User Pool
```bash
aws cognito-idp describe-user-pool \
  --user-pool-id YOUR_USER_POOL_ID \
  --region us-east-1
```

**Expected**:
- User Pool exists
- Email verification enabled
- Password policy configured

#### 5.2 Check Users
```bash
aws cognito-idp list-users \
  --user-pool-id YOUR_USER_POOL_ID \
  --region us-east-1
```

**Expected**: Test user(s) created

## Monitoring Setup

### 1. CloudWatch Dashboard (10 minutes)

#### 1.1 Create Dashboard
```bash
aws cloudwatch put-dashboard \
  --dashboard-name AIBTS-Production \
  --dashboard-body file://cloudwatch-dashboard.json
```

#### 1.2 Add Widgets
- [ ] Lambda invocations
- [ ] Lambda errors
- [ ] Lambda duration
- [ ] API Gateway requests
- [ ] API Gateway 4xx/5xx errors
- [ ] DynamoDB read/write capacity

### 2. CloudWatch Alarms (10 minutes)

#### 2.1 Create Error Alarm
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name AIBTS-Lambda-Errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

#### 2.2 Create Cost Alarm
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name AIBTS-High-Cost \
  --alarm-description "Alert on high AI usage cost" \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 86400 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

### 3. Log Retention (5 minutes)

#### 3.1 Set Retention Policy
```bash
# Set to 7 days for cost savings
aws logs put-retention-policy \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --retention-in-days 7
```

## Rollback Plan

### If Deployment Fails

#### Option 1: Rollback Backend
```bash
# Rollback to previous stack version
aws cloudformation rollback-stack \
  --stack-name MinimalStack \
  --region us-east-1
```

#### Option 2: Rollback Frontend
```bash
# Rollback to previous Vercel deployment
vercel rollback
```

#### Option 3: Full Rollback
1. Rollback frontend to previous deployment
2. Rollback backend to previous stack
3. Verify system working
4. Investigate issues
5. Fix and redeploy

### Emergency Contacts

- **AWS Support**: [Your AWS support plan]
- **Vercel Support**: https://vercel.com/support
- **Hugging Face Support**: https://discuss.huggingface.co
- **Team Lead**: [Contact info]

## Success Criteria

Deployment is successful when:

- [ ] Backend deployed without errors
- [ ] Frontend deployed without errors
- [ ] All automated tests pass
- [ ] Manual smoke test passes
- [ ] No errors in CloudWatch logs
- [ ] Users can register and login
- [ ] Users can create projects
- [ ] AI generation works (if quota available)
- [ ] Monitoring configured
- [ ] Alarms configured
- [ ] Documentation updated

## Post-Deployment Tasks

### Immediate (Day 1)
- [ ] Monitor CloudWatch logs for errors
- [ ] Test all critical workflows
- [ ] Verify AI generation working
- [ ] Check Hugging Face usage dashboard
- [ ] Update documentation with actual URLs

### Short Term (Week 1)
- [ ] Monitor user feedback
- [ ] Track performance metrics
- [ ] Review CloudWatch alarms
- [ ] Optimize slow endpoints
- [ ] Fix any bugs found

### Medium Term (Month 1)
- [ ] Review usage patterns
- [ ] Optimize costs
- [ ] Consider switching to OpenAI if needed
- [ ] Implement additional features
- [ ] Security audit

## Cost Monitoring

### Daily Checks
- [ ] Check Hugging Face usage dashboard
- [ ] Review AWS billing dashboard
- [ ] Check CloudWatch metrics

### Weekly Checks
- [ ] Review total costs
- [ ] Check for cost anomalies
- [ ] Optimize if needed

### Monthly Checks
- [ ] Full cost analysis
- [ ] Compare to budget
- [ ] Adjust limits if needed
- [ ] Consider cost optimizations

## Documentation Updates

After deployment, update:

- [ ] README.md with production URLs
- [ ] HOW_TO_ACCESS_APP.md with new instructions
- [ ] API documentation with actual endpoints
- [ ] User guide with screenshots
- [ ] Troubleshooting guide with common issues

## Next Steps

After successful deployment:

1. **Monitor for 24 hours**: Watch for any issues
2. **Gather feedback**: Get user feedback on the system
3. **Optimize**: Improve performance based on metrics
4. **Iterate**: Add new features based on feedback
5. **Scale**: Prepare for increased usage

## Notes

- Hugging Face free tier: 1,000 requests/day, 10 requests/minute
- Cognito free tier: 50,000 MAUs
- Lambda free tier: 1M requests/month
- DynamoDB free tier: 25 GB storage, 25 WCU, 25 RCU
- API Gateway free tier: 1M requests/month (first 12 months)

## Support Resources

- **AWS Documentation**: https://docs.aws.amazon.com
- **Vercel Documentation**: https://vercel.com/docs
- **Hugging Face Documentation**: https://huggingface.co/docs
- **Cognito Documentation**: https://docs.aws.amazon.com/cognito
- **Project Documentation**: See README.md

---

**Deployment Date**: [Date]
**Deployed By**: [Name]
**Version**: 1.0.0
**Status**: ✅ Ready for deployment

