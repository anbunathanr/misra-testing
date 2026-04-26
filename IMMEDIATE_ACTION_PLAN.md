# Immediate Action Plan - Fix 202 Response Issue

## Current Status
- Frontend timeout increased to 2 minutes (120 attempts)
- Backend has scan fallback logic
- Still getting 202 responses indefinitely

## Root Cause
The backend is returning 202 because **results are not being found in DynamoDB**. This means either:
1. analyze-file Lambda is not storing results
2. Results are stored but query/scan can't find them
3. Lambda is timing out

## Immediate Actions (Do These Now)

### Action 1: Check CloudWatch Logs (5 minutes)
```bash
# Check analyze-file Lambda logs
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1 --max-items 100

# Look for:
# ✅ "[STORE] Starting to store analysis results" - means it's trying to store
# ✅ "[STORE] ✓ Analysis results stored successfully" - means it succeeded
# ❌ Any ERROR or FAILED messages - means it failed
```

**What to do:**
- If you see "✅ Analysis results stored successfully" → Go to Action 2
- If you see ERROR messages → Go to Action 3
- If you see nothing recent → Lambda might not be running

### Action 2: Check if Results Are in DynamoDB (5 minutes)
```bash
# Scan the AnalysisResults table
aws dynamodb scan --table-name AnalysisResults-dev \
  --region us-east-1 \
  --limit 10

# Look for items with your fileId
```

**What to do:**
- If you see items → Results ARE being stored, go to Action 4
- If table is empty → Results are NOT being stored, go to Action 3

### Action 3: Check Lambda Configuration (5 minutes)
```bash
# Check timeout and memory
aws lambda get-function-configuration \
  --function-name AnalyzeFileFunction-dev \
  --region us-east-1 | grep -E "Timeout|MemorySize"

# Expected: Timeout >= 300, MemorySize >= 512
```

**What to do:**
- If Timeout < 300 or MemorySize < 512 → Increase them:
```bash
aws lambda update-function-configuration \
  --function-name AnalyzeFileFunction-dev \
  --timeout 300 \
  --memory-size 512 \
  --region us-east-1
```

### Action 4: Check get-analysis-results Logs (5 minutes)
```bash
# Check get-analysis-results Lambda logs
aws logs tail /aws/lambda/GetAnalysisResultsFunction-dev --follow --region us-east-1 --max-items 100

# Look for:
# ✅ "[QUERY] Querying analysis results" - query attempt
# ✅ "[SCAN] Scanning analysis results" - scan fallback
# ✅ "Found X results via scan" - scan succeeded
# ❌ Any ERROR messages
```

**What to do:**
- If you see "[SCAN] Scanning analysis results" → Scan fallback is working
- If you see "Found X results via scan" → Results were found via scan
- If you see ERROR messages → There's a query/scan error

## Detailed Troubleshooting

### Scenario A: Results ARE in DynamoDB but query/scan returns empty
**Problem:** FileIndex GSI issue or query/scan error

**Solution:**
1. Check FileIndex GSI status:
```bash
aws dynamodb describe-table --table-name AnalysisResults-dev \
  --region us-east-1 | grep -A 20 "GlobalSecondaryIndexes"
```

2. Verify FileIndex is ACTIVE (not CREATING)
3. If CREATING, wait for it to complete
4. If ACTIVE, check query/scan logs for errors

### Scenario B: Results NOT in DynamoDB
**Problem:** analyze-file Lambda is not storing results

**Solution:**
1. Check analyze-file logs for errors
2. Check if Lambda is timing out
3. Check if Lambda has permission to write to DynamoDB
4. Increase Lambda timeout/memory

### Scenario C: Lambda Timing Out
**Problem:** Analysis takes longer than Lambda timeout

**Solution:**
1. Increase Lambda timeout to 300 seconds
2. Increase Lambda memory to 512 MB
3. Check if file is very large
4. Check if rules are loading slowly

## Quick Fix (Try This First)

### Step 1: Increase Lambda Timeout and Memory
```bash
aws lambda update-function-configuration \
  --function-name AnalyzeFileFunction-dev \
  --timeout 300 \
  --memory-size 512 \
  --region us-east-1
```

### Step 2: Redeploy Backend
```bash
cd packages/backend
npm run deploy
```

### Step 3: Test Again
1. Open browser console
2. Click "Start Automated Workflow"
3. Monitor console logs
4. Check if results appear within 2 minutes

## If Quick Fix Doesn't Work

### Check Logs in This Order:
1. **analyze-file logs** - Is analysis completing?
2. **get-analysis-results logs** - Is query/scan working?
3. **DynamoDB table** - Are results being stored?
4. **Lambda configuration** - Is timeout/memory sufficient?

### Common Fixes:
- Increase Lambda timeout to 300 seconds
- Increase Lambda memory to 512 MB
- Check if FileIndex GSI is ACTIVE
- Check if results are being stored in DynamoDB
- Check if query/scan is using correct table/index

## Expected Timeline

- **Immediate:** Increase Lambda timeout/memory (1 minute)
- **Short term:** Redeploy backend (5 minutes)
- **Testing:** Run end-to-end test (5 minutes)
- **Verification:** Check logs and DynamoDB (5 minutes)

**Total time: ~15-20 minutes**

## Success Criteria

✅ analyze-file Lambda completes successfully
✅ Results stored in DynamoDB
✅ Query/scan finds results
✅ get-analysis-results returns 200
✅ Frontend displays violations
✅ No more 202 responses

## If Still Not Working

1. Check CloudWatch logs for specific error messages
2. Verify DynamoDB table permissions
3. Check if FileIndex GSI is properly configured
4. Verify Lambda has correct IAM role
5. Check if SQS queue has messages in DLQ

## Support

If you get stuck:
1. Check `DEBUGGING_202_RESPONSES.md` for detailed troubleshooting
2. Run diagnostic commands to identify root cause
3. Apply appropriate fix based on findings
4. Test and verify

---

**Key Point:** The 202 response means the backend is working but results are not available. This is almost always due to:
1. Lambda timeout (most common)
2. Results not being stored
3. Query/scan not finding results

Start with increasing Lambda timeout/memory - that fixes 80% of these issues.
