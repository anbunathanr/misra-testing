# Workflow Validation Test Plan

## Pre-Test Checklist
- [ ] Backend deployment completed successfully
- [ ] Frontend built and ready
- [ ] AWS credentials configured
- [ ] Test file prepared (complex_violations.c or similar)

## Test Scenario: Upload and Analyze File

### Step 1: Start Automated Workflow
```
1. Open browser console (F12)
2. Navigate to production URL
3. Click "Start Automated Workflow"
4. Monitor console logs
```

### Step 2: Monitor Analysis Progress
Watch for these console log patterns:

**Expected Sequence:**
```
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
```

### Step 3: Verify UI Display
Check that the UI shows:
- [ ] "13 rules processed" (or actual count)
- [ ] "96.4% compliance" (or actual percentage)
- [ ] Violations table with detected violations
- [ ] Each violation shows: Rule ID, Severity, Line Number, Description

### Step 4: Check for Issues

**If you see 202 responses:**
```
⏳ Results still processing (202), retrying in 1 second...
📍 Fetching results attempt 2/30
📊 Results response status: 202
```
- This is expected initially
- Should resolve within 30 attempts (~30 seconds)
- If it continues beyond 30 attempts, check:
  - Are results being written to DynamoDB?
  - Is the FileIndex GSI properly configured?

**If gate blocks indefinitely:**
```
⏳ Waiting for DB sync: attempt 1/30
⏳ Backend says "completed" but rules are 0. Waiting for DB sync...
```
- This means backend marked analysis complete but hasn't written rule data yet
- Should resolve within 30 attempts (~60 seconds)
- If it times out, check:
  - Is analyze-file Lambda completing successfully?
  - Are violations being stored in AnalysisResults table?

**If you see errors:**
```
❌ Status check failed: 401
❌ Failed to fetch analysis results: 403
```
- 401: Authentication token expired or invalid
- 403: User doesn't have permission to access file
- 404: File not found in database

### Step 5: Performance Metrics
Record these timings:
- Time from upload to "Analysis complete": _____ seconds
- Time from "Analysis complete" to results received: _____ seconds
- Total time from upload to results: _____ seconds
- Number of 202 responses: _____
- Number of DB sync retries: _____

## Success Criteria
✅ Analysis completes within 2 minutes
✅ Results available within 60 seconds of analysis completion
✅ UI displays correct violation count and compliance percentage
✅ No errors in console logs
✅ Violations table shows detected violations with details

## Troubleshooting

### Issue: Stuck at "Analysis complete but rules are 0"
**Solution:**
1. Check CloudWatch logs for analyze-file Lambda
2. Verify violations are being written to AnalysisResults table
3. Check if FileIndex GSI is properly indexed
4. Increase Lambda memory/timeout if needed

### Issue: Continuous 202 responses
**Solution:**
1. Check if results are in DynamoDB
2. Verify query is using correct GSI
3. Check if scan fallback is being triggered
4. Review DynamoDB table configuration

### Issue: Results show 0 violations but file has violations
**Solution:**
1. Check if MISRA rules are loading correctly
2. Verify code parser is extracting AST correctly
3. Check rule engine logs for violations detected
4. Verify violations are being stored in results

## Next Steps After Validation
1. If all tests pass: Mark as production-ready
2. If issues found: Review logs and apply fixes
3. Document any performance improvements needed
4. Plan for monitoring and alerting
