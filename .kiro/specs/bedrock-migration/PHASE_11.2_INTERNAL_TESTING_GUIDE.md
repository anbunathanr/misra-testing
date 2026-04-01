# Phase 11.2: Internal Testing Guide

## Overview

This guide provides step-by-step instructions for testing Amazon Bedrock with Claude Sonnet 4.6 before broader rollout. You'll enable Bedrock for a single Lambda function, test it thoroughly, and verify it works correctly.

**Status**: Phase 1 deployment complete, ready for internal testing  
**Current State**: OpenAI active, Bedrock deployed but inactive  
**Goal**: Verify Bedrock works correctly with real requests

## Prerequisites

- Phase 1 deployment complete (Task 11.1) ✅
- AWS CLI configured with credentials
- Access to CloudWatch Logs
- Test data ready (URLs, scenarios)

## Testing Strategy

We'll test Bedrock in isolation by:
1. Enabling Bedrock for ONE Lambda function only
2. Testing that function with real requests
3. Monitoring logs and metrics
4. Comparing results with OpenAI
5. Rolling back if issues found

## Step 1: Enable Bedrock for Test Generation Function

Enable Bedrock for the `aibts-ai-generate` function only:

```powershell
# Enable Bedrock for test generation
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=BEDROCK,BEDROCK_REGION=us-east-1,BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6,ENABLE_BEDROCK_MONITORING=true}"
```

Wait 10-15 seconds for the update to complete.


## Step 2: Verify Configuration

Check that the environment variables are set correctly:

```powershell
# Verify configuration
aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables' --output json
```

Expected output:
```json
{
  "AI_PROVIDER": "BEDROCK",
  "BEDROCK_REGION": "us-east-1",
  "BEDROCK_MODEL_ID": "us.anthropic.claude-sonnet-4-6",
  "ENABLE_BEDROCK_MONITORING": "true"
}
```

## Step 3: Test with Simple Request

Create a test payload file `test-bedrock-generate.json`:

```json
{
  "body": "{\"url\":\"https://example.com/login\",\"scenario\":\"User logs in with valid credentials\",\"context\":{\"elements\":[{\"type\":\"input\",\"selector\":\"#email\"},{\"type\":\"input\",\"selector\":\"#password\"},{\"type\":\"button\",\"selector\":\"#login-btn\"}]}}"
}
```

Invoke the function:

```powershell
# Test Bedrock
aws lambda invoke --function-name aibts-ai-generate --payload file://test-bedrock-generate.json response.json

# Check response
Get-Content response.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```


## Step 4: Monitor CloudWatch Logs

Watch the logs in real-time:

```powershell
# Tail logs (watch for Bedrock invocations)
aws logs tail /aws/lambda/aibts-ai-generate --follow --format short
```

Look for:
- "Creating AI engine for provider: BEDROCK"
- "Invoking Bedrock model: us.anthropic.claude-sonnet-4-6"
- Token usage and cost information
- No errors or exceptions

## Step 5: Validate Response Quality

Check the generated test code:

**Expected characteristics:**
- Valid TypeScript/Playwright syntax
- Includes `test()` function
- Has proper assertions with `expect()`
- Uses stable selectors (data-testid, aria-label)
- Includes error handling
- Follows Playwright best practices

**Sample validation:**

```powershell
# Extract the generated code from response
$response = Get-Content response.json | ConvertFrom-Json
$code = $response.body | ConvertFrom-Json | Select-Object -ExpandProperty content

# Display the code
Write-Host "Generated Test Code:"
Write-Host $code
```


## Step 6: Compare with OpenAI

Test the same request with OpenAI for comparison:

```powershell
# Temporarily switch back to OpenAI
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=OPENAI}"

# Wait 10 seconds
Start-Sleep -Seconds 10

# Test with OpenAI
aws lambda invoke --function-name aibts-ai-generate --payload file://test-bedrock-generate.json response-openai.json

# Compare responses
Write-Host "`n=== BEDROCK RESPONSE ==="
Get-Content response.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

Write-Host "`n=== OPENAI RESPONSE ==="
Get-Content response-openai.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Comparison criteria:**
- Code quality (similar or better)
- Response time (should be similar)
- Cost (Bedrock should be ~33% lower)
- Error rate (should be similar or lower)


## Step 7: Test Multiple Scenarios

Test various scenarios to ensure robustness:

### Test 1: Simple Login Test
```json
{
  "body": "{\"url\":\"https://example.com/login\",\"scenario\":\"User logs in with valid credentials\"}"
}
```

### Test 2: Form Submission
```json
{
  "body": "{\"url\":\"https://example.com/contact\",\"scenario\":\"User submits contact form with name, email, and message\"}"
}
```

### Test 3: Navigation Test
```json
{
  "body": "{\"url\":\"https://example.com\",\"scenario\":\"User navigates from homepage to products page\"}"
}
```

### Test 4: Error Handling
```json
{
  "body": "{\"url\":\"https://example.com/login\",\"scenario\":\"User attempts login with invalid credentials and sees error message\"}"
}
```

Run each test:

```powershell
# Switch back to Bedrock
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=BEDROCK,BEDROCK_REGION=us-east-1,BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6}"

Start-Sleep -Seconds 10

# Test each scenario
aws lambda invoke --function-name aibts-ai-generate --payload file://test1.json response1.json
aws lambda invoke --function-name aibts-ai-generate --payload file://test2.json response2.json
aws lambda invoke --function-name aibts-ai-generate --payload file://test3.json response3.json
aws lambda invoke --function-name aibts-ai-generate --payload file://test4.json response4.json
```


## Step 8: Check CloudWatch Metrics

View Bedrock metrics in CloudWatch:

```powershell
# Get Bedrock latency metrics
aws cloudwatch get-metric-statistics `
  --namespace "MISRA/AI" `
  --metric-name "BedrockLatency" `
  --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
  --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
  --period 300 `
  --statistics Average,Maximum,Minimum

# Get Bedrock token usage
aws cloudwatch get-metric-statistics `
  --namespace "MISRA/AI" `
  --metric-name "BedrockTokens" `
  --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
  --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
  --period 300 `
  --statistics Sum

# Get Bedrock cost
aws cloudwatch get-metric-statistics `
  --namespace "MISRA/AI" `
  --metric-name "BedrockCost" `
  --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
  --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
  --period 300 `
  --statistics Sum

# Check for errors
aws cloudwatch get-metric-statistics `
  --namespace "MISRA/AI" `
  --metric-name "BedrockErrors" `
  --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
  --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
  --period 300 `
  --statistics Sum
```


## Step 9: Test Error Scenarios

Test how Bedrock handles errors:

### Test Rate Limiting
```powershell
# Send multiple rapid requests to trigger throttling
for ($i=1; $i -le 20; $i++) {
    Write-Host "Request $i"
    aws lambda invoke --function-name aibts-ai-generate --payload file://test-bedrock-generate.json response-$i.json
}

# Check logs for retry behavior
aws logs tail /aws/lambda/aibts-ai-generate --since 5m --filter-pattern "ThrottlingException"
```

### Test Invalid Input
```json
{
  "body": "{\"url\":\"\",\"scenario\":\"\"}"
}
```

```powershell
aws lambda invoke --function-name aibts-ai-generate --payload file://test-invalid.json response-invalid.json

# Should see validation error
Get-Content response-invalid.json | ConvertFrom-Json
```

### Test Timeout Handling
```json
{
  "body": "{\"url\":\"https://example.com\",\"scenario\":\"Generate an extremely complex test with 50 steps and detailed assertions for every possible edge case\"}"
}
```

```powershell
aws lambda invoke --function-name aibts-ai-generate --payload file://test-timeout.json response-timeout.json
```


## Step 10: Collect Feedback

Document your findings:

### Performance Metrics
- Average latency: _____ ms
- Token usage per request: _____ tokens
- Cost per request: $_____ 
- Error rate: _____ %

### Quality Assessment
- Code quality (1-5): _____
- Test coverage (1-5): _____
- Selector stability (1-5): _____
- Error handling (1-5): _____

### Comparison with OpenAI
- Latency: [ ] Better [ ] Similar [ ] Worse
- Cost: [ ] Better [ ] Similar [ ] Worse
- Quality: [ ] Better [ ] Similar [ ] Worse
- Reliability: [ ] Better [ ] Similar [ ] Worse

### Issues Found
- [ ] No issues
- [ ] Minor issues (list below)
- [ ] Major issues (list below)

**Issue details:**
_____________________________________
_____________________________________
_____________________________________


## Step 11: Decision Point

Based on your testing, decide next steps:

### ✅ If Testing Successful (Recommended Path)
- Mark Task 11.2 as complete
- Proceed to Phase 2 (Canary Deployment - Task 12)
- Keep Bedrock enabled for this function
- Monitor for 24 hours before broader rollout

```powershell
# Keep Bedrock enabled
Write-Host "Testing successful! Keeping Bedrock enabled for aibts-ai-generate"
Write-Host "Monitor for 24 hours before proceeding to Phase 2"
```

### ⚠️ If Minor Issues Found
- Document issues
- Fix issues in Bedrock implementation
- Re-test
- Proceed when resolved

```powershell
# Rollback to OpenAI while fixing
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=OPENAI}"
```

### ❌ If Major Issues Found
- Rollback to OpenAI immediately
- Investigate root cause
- Update Bedrock implementation
- Re-deploy and re-test

```powershell
# Immediate rollback
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=OPENAI}"

Write-Host "Rolled back to OpenAI. Investigate issues before retrying."
```


## Rollback Procedure

If you need to rollback at any time:

```powershell
# Immediate rollback to OpenAI
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=OPENAI}"

# Verify rollback
aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables.AI_PROVIDER'

# Test that OpenAI works
aws lambda invoke --function-name aibts-ai-generate --payload file://test-bedrock-generate.json response-rollback.json

Get-Content response-rollback.json | ConvertFrom-Json
```

Rollback time: **< 1 minute**

## Success Criteria

Task 11.2 is complete when:

- ✅ Bedrock successfully generates valid test code
- ✅ Response quality is similar to or better than OpenAI
- ✅ Latency is acceptable (< 30 seconds average)
- ✅ Cost is ~33% lower than OpenAI
- ✅ Error rate is acceptable (< 5%)
- ✅ No critical issues found
- ✅ CloudWatch metrics show healthy operation
- ✅ Logs show no unexpected errors

## Next Steps

After successful testing:

1. **Mark Task 11.2 complete** in tasks.md
2. **Monitor for 24 hours** with Bedrock enabled
3. **Prepare for Phase 2** (Canary Deployment)
4. **Document lessons learned**

## Troubleshooting

### Issue: Function returns error
**Solution**: Check CloudWatch Logs for detailed error message

```powershell
aws logs tail /aws/lambda/aibts-ai-generate --since 10m
```

### Issue: Bedrock not being used (still using OpenAI)
**Solution**: Verify environment variables are set correctly

```powershell
aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables'
```

### Issue: High latency
**Solution**: Check Bedrock region and model configuration

```powershell
# Verify region is us-east-1 (closest to your deployment)
aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables.BEDROCK_REGION'
```

### Issue: Rate limiting errors
**Solution**: Implement exponential backoff (already in code) or request quota increase

```powershell
# Check for throttling in logs
aws logs tail /aws/lambda/aibts-ai-generate --since 10m --filter-pattern "ThrottlingException"
```

## References

- [Bedrock Setup Guide](./BEDROCK_SETUP_GUIDE.md)
- [Troubleshooting Guide](./BEDROCK_TROUBLESHOOTING_GUIDE.md)
- [Migration Process](./BEDROCK_MIGRATION_PROCESS.md)
- [Phase 1 Deployment Complete](./PHASE1_DEPLOYMENT_COMPLETE.md)

---

**Status**: Ready for internal testing  
**Estimated Time**: 2-4 hours  
**Risk Level**: Low (single function, easy rollback)
