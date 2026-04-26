# Verify Deployment - Quick Reference

## Step 1: Check Backend Deployment Status

### Option A: AWS CLI
```bash
# Check CloudFormation stack status
aws cloudformation describe-stacks \
  --stack-name MisraPlatform-dev \
  --region us-east-1 \
  --query 'Stacks[0].StackStatus'

# Expected output: CREATE_COMPLETE or UPDATE_COMPLETE
```

### Option B: AWS Console
1. Go to AWS CloudFormation console
2. Look for stack: `MisraPlatform-dev`
3. Check Status column
4. Should show: `CREATE_COMPLETE` or `UPDATE_COMPLETE`

### Option C: Check Lambda Functions
```bash
# Get analyze-file function info
aws lambda get-function \
  --function-name AnalyzeFileFunction-dev \
  --region us-east-1 \
  --query 'Configuration.LastModified'

# Get get-analysis-results function info
aws lambda get-function \
  --function-name GetAnalysisResultsFunction-dev \
  --region us-east-1 \
  --query 'Configuration.LastModified'

# Expected: Recent timestamp (within last few minutes)
```

## Step 2: Check Frontend Deployment Status

### Option A: Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Find project: `misra-platform` or similar
3. Check latest deployment
4. Should show: `Ready` with green checkmark

### Option B: Check Environment
```bash
# Verify .env.production is correct
cat packages/frontend/.env.production

# Expected: VITE_API_URL points to correct API Gateway endpoint
```

## Step 3: Quick Functional Test

### Test 1: Check API Endpoint
```bash
# Get API Gateway endpoint
aws apigateway get-rest-apis \
  --region us-east-1 \
  --query 'items[0].id'

# Test endpoint (replace with actual endpoint)
curl -X GET https://[api-id].execute-api.us-east-1.amazonaws.com/prod/files \
  -H "Authorization: Bearer [token]"

# Expected: 200 OK or 401 Unauthorized (if no token)
```

### Test 2: Check Lambda Logs
```bash
# Check analyze-file logs
aws logs tail /aws/lambda/AnalyzeFileFunction-dev \
  --region us-east-1 \
  --max-items 10

# Check get-analysis-results logs
aws logs tail /aws/lambda/GetAnalysisResultsFunction-dev \
  --region us-east-1 \
  --max-items 10

# Expected: Recent log entries (within last few minutes)
```

## Step 4: Run End-to-End Test

### Manual Test
1. Open browser console (F12)
2. Navigate to production URL
3. Click "Start Automated Workflow"
4. Monitor console logs
5. Verify UI displays violations

### Expected Console Output
```
✅ Step 1: Auto-authenticating...
✅ Step 2: Uploading file...
✅ Step 3: Starting MISRA analysis for file [fileId]
📡 Poll attempt 1/120 for fileId: [fileId]
📊 Status response: { analysisProgress: 0%, rulesProcessed: 0, ... }
...
✅ Analysis complete with rule data. Rules: 13/357
📍 Fetching results from: https://[api]/analysis/results/[fileId]
📍 Fetching results attempt 1/30
📊 Results response status: 200
✅ Results received: { violations: [...], summary: { compliancePercentage: 96.4, ... } }
✅ Workflow completed successfully!
```

## Step 5: Verify Key Metrics

### Check Deployment Artifacts
```bash
# Check backend build artifacts
ls -lh packages/backend/dist-lambdas/analysis/

# Expected:
# - analyze-file (directory)
# - get-analysis-results (directory)

# Check frontend build artifacts
ls -lh packages/frontend/dist/

# Expected:
# - index.html
# - assets/ (directory with JS/CSS files)
```

### Check DynamoDB Tables
```bash
# List tables
aws dynamodb list-tables --region us-east-1

# Expected tables:
# - AnalysisResults-dev
# - misra-platform-file-metadata-dev
# - misra-platform-users-dev

# Check table status
aws dynamodb describe-table \
  --table-name AnalysisResults-dev \
  --region us-east-1 \
  --query 'Table.TableStatus'

# Expected: ACTIVE
```

## Step 6: Troubleshooting

### If Backend Deployment Failed
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events \
  --stack-name MisraPlatform-dev \
  --region us-east-1 \
  --query 'StackEvents[0:5]'

# Look for: CREATE_FAILED or UPDATE_FAILED
# Check Reason field for error details
```

### If Lambda Functions Not Updated
```bash
# Check function code
aws lambda get-function-code \
  --function-name AnalyzeFileFunction-dev \
  --region us-east-1

# Should contain: "scanAnalysisResultsByFileId" (new function)
```

### If Frontend Not Deployed
```bash
# Check git status
git status

# Expected: No uncommitted changes (if already pushed)

# Check Vercel deployment
# Go to Vercel dashboard and check deployment status
```

## Step 7: Performance Baseline

### Record These Metrics
```
Upload to analysis start: _____ seconds
Analysis execution: _____ seconds
Analysis complete to results available: _____ seconds
Total end-to-end: _____ seconds
Poll attempts: _____
Results fetch attempts: _____
202 responses: _____
```

### Compare to Expected
| Metric | Expected | Actual |
|--------|----------|--------|
| Upload to analysis start | < 5s | _____ |
| Analysis execution | 30-60s | _____ |
| Analysis complete to results available | < 5s | _____ |
| Total end-to-end | 40-120s | _____ |
| Poll attempts | 3-5 | _____ |
| Results fetch attempts | 1-3 | _____ |
| 202 responses | 0 | _____ |

## Step 8: Sign-Off Checklist

- [ ] Backend deployment completed successfully
- [ ] Frontend deployment completed successfully
- [ ] Lambda functions updated with new code
- [ ] End-to-end test passed
- [ ] UI displays violations correctly
- [ ] No errors in console logs
- [ ] No 202 responses after 30 attempts
- [ ] Performance metrics within expected range
- [ ] CloudWatch logs show no errors

## Quick Commands Reference

```bash
# Check all stacks
aws cloudformation list-stacks --region us-east-1

# Check specific stack
aws cloudformation describe-stacks --stack-name MisraPlatform-dev --region us-east-1

# Check Lambda functions
aws lambda list-functions --region us-east-1 | grep -i misra

# Check DynamoDB tables
aws dynamodb list-tables --region us-east-1

# Check logs
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1
aws logs tail /aws/lambda/GetAnalysisResultsFunction-dev --follow --region us-east-1

# Check API Gateway
aws apigateway get-rest-apis --region us-east-1
```

## Next Steps

1. Run verification steps above
2. Execute end-to-end test
3. Record performance metrics
4. Document any issues
5. Set up monitoring and alerting
6. Plan for production deployment

## Support

If you encounter any issues:
1. Check CloudWatch logs for error details
2. Review console logs for error messages
3. Check AWS CloudFormation events for deployment errors
4. Refer to `VALIDATION_STEPS.md` for detailed troubleshooting
5. Refer to `DYNAMODB_CONSISTENCY_FIX_SUMMARY.md` for technical details
