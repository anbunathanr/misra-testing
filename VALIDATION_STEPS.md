# Validation Steps - DynamoDB Consistency Fix

## Prerequisites
- Backend deployment completed
- Frontend built and deployed to Vercel
- Test file ready (complex_violations.c or similar with MISRA violations)
- Browser console open (F12)

## Step 1: Verify Backend Deployment

### Check AWS CloudFormation Stack
```bash
# List stacks
aws cloudformation list-stacks --region us-east-1 --query "StackSummaries[?StackName=='MisraPlatform-dev']"

# Check stack status
aws cloudformation describe-stacks --stack-name MisraPlatform-dev --region us-east-1
```

Expected: Stack status should be `CREATE_COMPLETE` or `UPDATE_COMPLETE`

### Check Lambda Functions Updated
```bash
# Get analyze-file function code
aws lambda get-function --function-name AnalyzeFileFunction-dev --region us-east-1

# Get get-analysis-results function code
aws lambda get-function --function-name GetAnalysisResultsFunction-dev --region us-east-1
```

Expected: Functions should have recent LastModified timestamp

## Step 2: Verify Frontend Deployment

### Check Vercel Deployment
1. Go to Vercel dashboard
2. Check latest deployment status
3. Verify production URL is accessible

Expected: Deployment should be `Ready` with green checkmark

### Verify Frontend Environment
```bash
# Check .env.production
cat packages/frontend/.env.production
```

Expected: `VITE_API_URL` should point to correct API Gateway endpoint

## Step 3: Run End-to-End Test

### Test Scenario: Upload and Analyze File

**Step 3.1: Open Application**
1. Navigate to production URL
2. Open browser console (F12)
3. Go to Network tab
4. Filter by "analysis" or "results"

**Step 3.2: Start Automated Workflow**
1. Click "Start Automated Workflow" button
2. Watch console logs
3. Monitor Network tab for API calls

**Step 3.3: Monitor Console Logs**

Watch for this sequence:

```
✅ Step 1: Auto-authenticating...
✅ Step 2: Uploading file...
✅ Step 3: Starting MISRA analysis for file [fileId]
⏳ Waiting for analysis to complete...

📡 Poll attempt 1/120 for fileId: [fileId]
📊 Status response: { analysisProgress: 0%, rulesProcessed: 0, ... }
🔍 Analysis progress: 0%

📡 Poll attempt 2/120 for fileId: [fileId]
📊 Status response: { analysisProgress: 50%, rulesProcessed: 0, ... }
🔍 Analysis progress: 50%

📡 Poll attempt 3/120 for fileId: [fileId]
📊 Status response: { analysisProgress: 100%, rulesProcessed: 13, analysisStatus: 'completed', ... }
✅ Analysis complete with rule data. Rules: 13/357
✅ Marked Step 3 as complete

📍 Fetching results from: https://[api]/analysis/results/[fileId]
📍 Fetching results attempt 1/30
📊 Results response status: 200
✅ Results received: { violations: [...], summary: { compliancePercentage: 96.4, ... } }

✅ Step 4: Processing results...
✅ Workflow completed successfully!
```

### Expected Behavior

**Timing:**
- Poll attempts: 3-5 (should complete quickly)
- Results fetch attempts: 1-3 (should get 200 on first or second try)
- Total time: 40-120 seconds

**Console Logs:**
- No errors or exceptions
- Clear progression through steps
- Gate logic: "Analysis complete with rule data"
- Results fetch succeeds with 200 status

**Network Tab:**
- GET /files/[fileId]/status: 200 OK (multiple calls)
- GET /analysis/results/[fileId]: 200 OK (1-3 calls)
- No 202 responses after 30 attempts

## Step 4: Verify UI Display

### Check Analysis Results Page
1. Wait for workflow to complete
2. Check that UI displays:
   - [ ] "13 rules processed" (or actual count)
   - [ ] "96.4% compliance" (or actual percentage)
   - [ ] Violations table with violations
   - [ ] Each violation shows: Rule ID, Severity, Line, Description

### Check Violations Table
1. Click on a violation row
2. Verify details are displayed:
   - [ ] Rule ID (e.g., "MISRA-C-1-1")
   - [ ] Severity (Mandatory, Required, or Advisory)
   - [ ] Line number
   - [ ] Description
   - [ ] Code snippet (if available)

## Step 5: Check CloudWatch Logs

### Backend Logs

**analyze-file Lambda:**
```bash
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1
```

Look for:
- "Verification attempt X/30"
- "Results verified successfully"
- "Marking analysis as completed"
- No errors or exceptions

**get-analysis-results Lambda:**
```bash
aws logs tail /aws/lambda/GetAnalysisResultsFunction-dev --follow --region us-east-1
```

Look for:
- "[QUERY] Querying analysis results"
- "[SCAN] Scanning analysis results" (if GSI delayed)
- "Found X results via scan" (if fallback triggered)
- No errors or exceptions

### Expected Log Patterns

**Normal Path (GSI Indexed Quickly):**
```
[QUERY] Querying analysis results for fileId: [fileId]
[QUERY] Query response received
[QUERY] Items count: 1
✅ [QUERY] Successfully retrieved 1 valid analysis results
```

**Fallback Path (GSI Delayed):**
```
[QUERY] Querying analysis results for fileId: [fileId]
[QUERY] Query response received
[QUERY] Items count: 0
⚠️ [QUERY] No analysis results found for fileId: [fileId]
✅ [SCAN] Scanning analysis results for fileId: [fileId]
✅ [SCAN] Successfully retrieved 1 results via scan
```

## Step 6: Performance Metrics

Record these timings:

| Metric | Expected | Actual |
|--------|----------|--------|
| Upload to analysis start | < 5s | _____ |
| Analysis execution | 30-60s | _____ |
| Analysis complete to results available | < 5s | _____ |
| Total end-to-end | 40-120s | _____ |
| Poll attempts | 3-5 | _____ |
| Results fetch attempts | 1-3 | _____ |
| 202 responses | 0 | _____ |

## Step 7: Troubleshooting

### Issue: Stuck at "Analysis complete but rules are 0"

**Diagnosis:**
```
⏳ Waiting for DB sync: attempt 1/30
⏳ Backend says "completed" but rules are 0. Waiting for DB sync...
```

**Solution:**
1. Check analyze-file logs for errors
2. Verify violations are being written to DynamoDB
3. Check if FileIndex GSI is properly configured
4. Increase Lambda memory/timeout if needed

**Command to check DynamoDB:**
```bash
aws dynamodb scan --table-name AnalysisResults-dev \
  --filter-expression "fileId = :fileId" \
  --expression-attribute-values '{":fileId":{"S":"[fileId]"}}' \
  --region us-east-1
```

### Issue: Continuous 202 Responses

**Diagnosis:**
```
📍 Fetching results attempt 1/30
📊 Results response status: 202
⏳ Results still processing (202), retrying in 1 second...
📍 Fetching results attempt 2/30
📊 Results response status: 202
```

**Solution:**
1. Check if results are in DynamoDB (see command above)
2. Verify query is using correct GSI
3. Check if scan fallback is being triggered
4. Review get-analysis-results logs

**Command to check GSI:**
```bash
aws dynamodb describe-table --table-name AnalysisResults-dev \
  --region us-east-1 | grep -A 20 "GlobalSecondaryIndexes"
```

### Issue: Results Show 0 Violations

**Diagnosis:**
```
✅ Results received: { violations: [], summary: { compliancePercentage: 100, ... } }
```

**Solution:**
1. Check if MISRA rules are loading correctly
2. Verify code parser is extracting AST
3. Check rule engine logs for violations
4. Verify violations are being stored

**Command to check rules:**
```bash
# Check if rules are loaded in analyze-file logs
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1 | grep -i "rules"
```

## Step 8: Success Validation

### Checklist
- [ ] Backend deployment completed successfully
- [ ] Frontend deployed to Vercel
- [ ] Workflow completes without errors
- [ ] Console logs show expected sequence
- [ ] UI displays violations correctly
- [ ] No 202 responses after 30 attempts
- [ ] CloudWatch logs show no errors
- [ ] Performance metrics within expected range

### Sign-Off
If all checks pass:
1. Document actual performance metrics
2. Note any issues encountered and solutions
3. Mark as production-ready
4. Plan for monitoring and alerting

## Rollback Procedure

If critical issues occur:

1. **Revert Backend:**
```bash
cd packages/backend
git checkout HEAD~1 src/functions/analysis/get-analysis-results.ts
git checkout HEAD~1 src/functions/analysis/analyze-file.ts
npm run deploy
```

2. **Revert Frontend:**
```bash
cd packages/frontend
git checkout HEAD~1 src/services/production-workflow-service.ts
npm run build
# Push to Vercel
git push
```

3. **Verify Rollback:**
- Check CloudFormation stack status
- Check Vercel deployment status
- Run test again to confirm rollback

## Next Steps

After successful validation:
1. Set up CloudWatch alarms for Lambda errors
2. Set up monitoring for 202 response rates
3. Set up alerts for analysis timeout
4. Document performance baseline
5. Plan for future optimizations
