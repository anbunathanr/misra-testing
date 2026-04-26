# Debugging 202 Responses - Root Cause Analysis

## Current Situation
- Frontend is getting 202 responses for 120 attempts (~2 minutes)
- This means `/analysis/results` endpoint is never returning 200 with actual results
- Both query AND scan fallback are returning empty

## Root Cause Possibilities

### 1. Analysis Results Not Being Stored in DynamoDB
**Symptoms:**
- Both query and scan return empty
- No items in AnalysisResults table for the fileId

**How to Check:**
```bash
# Query DynamoDB directly
aws dynamodb scan --table-name AnalysisResults-dev \
  --filter-expression "fileId = :fileId" \
  --expression-attribute-values '{":fileId":{"S":"[YOUR_FILE_ID]"}}' \
  --region us-east-1

# If empty, results are not being stored
```

**Possible Causes:**
- analyze-file Lambda is failing silently
- storeAnalysisResults function is throwing an error
- DynamoDB write is failing

**Solution:**
Check CloudWatch logs for analyze-file Lambda:
```bash
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1
```

Look for:
- "✅ [STORE] Starting to store analysis results"
- "✅ [STORE] ✓ Analysis results stored successfully"
- Any error messages

### 2. Analysis Engine Not Finding Violations
**Symptoms:**
- Results are stored but with 0 violations
- Compliance percentage is 100%

**How to Check:**
```bash
# Query results and check violations
aws dynamodb query --table-name AnalysisResults-dev \
  --index-name FileIndex \
  --key-condition-expression "fileId = :fileId" \
  --expression-attribute-values '{":fileId":{"S":"[YOUR_FILE_ID]"}}' \
  --region us-east-1
```

Look at the `violations` field - should have items if file has violations.

**Possible Causes:**
- MISRA rules not loading correctly
- Code parser not extracting AST
- Rule engine not detecting violations

**Solution:**
Check CloudWatch logs for analyze-file Lambda:
```bash
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1
```

Look for:
- "[AnalysisEngine] Got X rules for language"
- "[AnalysisEngine] Found X violations"
- Any parsing errors

### 3. Query/Scan Not Finding Results (GSI Issue)
**Symptoms:**
- Results are in DynamoDB
- Query returns empty
- Scan also returns empty

**How to Check:**
```bash
# Check if FileIndex GSI exists and is active
aws dynamodb describe-table --table-name AnalysisResults-dev \
  --region us-east-1 | grep -A 20 "GlobalSecondaryIndexes"

# Should show FileIndex with status ACTIVE
```

**Possible Causes:**
- FileIndex GSI not properly configured
- GSI is in CREATING state
- Query is using wrong key condition

**Solution:**
1. Check GSI status - should be ACTIVE
2. Verify FileIndex has fileId as partition key
3. Check if query is using correct index name

### 4. Lambda Timeout or Memory Issues
**Symptoms:**
- analyze-file Lambda times out
- Results partially written or not written at all

**How to Check:**
```bash
# Check Lambda configuration
aws lambda get-function-configuration \
  --function-name AnalyzeFileFunction-dev \
  --region us-east-1 | grep -E "Timeout|MemorySize"

# Check CloudWatch logs for timeout errors
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1 | grep -i timeout
```

**Possible Causes:**
- Lambda timeout too short (default 60 seconds)
- Lambda memory too low (default 128 MB)
- Analysis taking longer than timeout

**Solution:**
Increase Lambda timeout and memory:
```bash
aws lambda update-function-configuration \
  --function-name AnalyzeFileFunction-dev \
  --timeout 300 \
  --memory-size 512 \
  --region us-east-1
```

## Step-by-Step Debugging Process

### Step 1: Check if Results Exist in DynamoDB
```bash
# Scan the table for any results
aws dynamodb scan --table-name AnalysisResults-dev \
  --region us-east-1 \
  --limit 10

# If empty, results are not being stored
# If has items, check if your fileId is there
```

### Step 2: Check analyze-file Lambda Logs
```bash
# Get recent logs
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1

# Look for:
# - "✅ [STORE] Starting to store analysis results"
# - "✅ [STORE] ✓ Analysis results stored successfully"
# - "[AnalysisEngine] Found X violations"
# - Any ERROR or FAILED messages
```

### Step 3: Check get-analysis-results Lambda Logs
```bash
# Get recent logs
aws logs tail /aws/lambda/GetAnalysisResultsFunction-dev --follow --region us-east-1

# Look for:
# - "[QUERY] Querying analysis results"
# - "[SCAN] Scanning analysis results"
# - "Found X results via scan"
# - Any ERROR messages
```

### Step 4: Check SQS Queue
```bash
# Check if messages are in DLQ (Dead Letter Queue)
aws sqs get-queue-attributes \
  --queue-url [YOUR_DLQ_URL] \
  --attribute-names ApproximateNumberOfMessages \
  --region us-east-1

# If messages in DLQ, analysis is failing
```

### Step 5: Check Lambda Configuration
```bash
# Check timeout and memory
aws lambda get-function-configuration \
  --function-name AnalyzeFileFunction-dev \
  --region us-east-1

# Check if timeout is sufficient (should be 300+ seconds)
# Check if memory is sufficient (should be 512+ MB)
```

## Common Issues and Solutions

### Issue: "Failed to fetch results after 120 attempts"
**Root Cause:** Backend never returns 200 with results

**Solution:**
1. Check if results are in DynamoDB (Step 1)
2. Check analyze-file logs (Step 2)
3. Check get-analysis-results logs (Step 3)
4. Increase Lambda timeout/memory (Step 5)

### Issue: Results show 0 violations
**Root Cause:** Analysis engine not detecting violations

**Solution:**
1. Check if MISRA rules are loading (look for "[AnalysisEngine] Got X rules")
2. Check if code parser is working (look for "AST parsed successfully")
3. Verify sample file has actual violations
4. Check rule engine logs for detection errors

### Issue: Query returns empty but scan finds results
**Root Cause:** FileIndex GSI is delayed or misconfigured

**Solution:**
1. Verify FileIndex GSI is ACTIVE
2. Check if fileId is partition key
3. Wait for GSI to catch up (usually < 1 second)
4. Use scan as fallback (already implemented)

### Issue: Lambda times out
**Root Cause:** Analysis taking longer than timeout

**Solution:**
1. Increase Lambda timeout to 300 seconds
2. Increase Lambda memory to 512 MB
3. Check if file is very large
4. Check if rules are loading slowly

## Quick Diagnostic Commands

```bash
# 1. Check if results exist
aws dynamodb scan --table-name AnalysisResults-dev --region us-east-1 --limit 5

# 2. Check analyze-file logs
aws logs tail /aws/lambda/AnalyzeFileFunction-dev --follow --region us-east-1 --max-items 50

# 3. Check get-analysis-results logs
aws logs tail /aws/lambda/GetAnalysisResultsFunction-dev --follow --region us-east-1 --max-items 50

# 4. Check Lambda configuration
aws lambda get-function-configuration --function-name AnalyzeFileFunction-dev --region us-east-1

# 5. Check SQS DLQ
aws sqs get-queue-attributes --queue-url [DLQ_URL] --attribute-names ApproximateNumberOfMessages --region us-east-1

# 6. Check FileIndex GSI
aws dynamodb describe-table --table-name AnalysisResults-dev --region us-east-1 | grep -A 20 "GlobalSecondaryIndexes"
```

## Next Steps

1. **Run diagnostic commands above** to identify root cause
2. **Check CloudWatch logs** for error messages
3. **Verify DynamoDB table** has results
4. **Check Lambda configuration** for timeout/memory
5. **Apply appropriate fix** based on findings

## Expected Behavior After Fix

- analyze-file Lambda completes successfully
- Results stored in DynamoDB within 5-10 seconds
- Query finds results via FileIndex GSI
- get-analysis-results returns 200 with results
- Frontend displays violations correctly

---

**Key Insight:** The 202 response means the backend is working but results are not available. This is either because:
1. Results are not being stored (analyze-file failure)
2. Results are stored but query/scan can't find them (GSI issue)
3. Lambda is timing out (timeout/memory issue)

Check the logs to determine which one it is.
