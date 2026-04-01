# Testing Bedrock via Application UI

**Date**: April 1, 2026  
**Status**: Ready to Execute  
**Method**: Application UI Trigger (Bypasses Lambda Rate Limit)

## Why This Approach Works

- **Avoids Lambda Rate Limit**: Goes through API Gateway instead of direct Lambda invocation
- **Real-World Test**: Tests the actual user workflow
- **Immediate Results**: No waiting for rate limit to clear
- **Validates Full Stack**: Tests API Gateway → Lambda → Bedrock integration

## Step-by-Step Instructions

### Step 1: Access Your Application

1. Open your browser
2. Navigate to your application URL (e.g., `https://your-app.vercel.app` or local dev server)
3. Log in with your credentials

### Step 2: Navigate to AI Test Generation

1. Look for "AI Test Generation" or "Generate Tests" section in the navigation
2. This is typically in:
   - Dashboard → AI Test Generation
   - Projects → [Select Project] → Generate Tests
   - Or a dedicated "Test Generation" page

### Step 3: Trigger Test Generation

1. Find the test generation form/button
2. Enter test parameters:
   - **URL**: `https://example.com/login` (or any test URL)
   - **Scenario**: `User logs in with valid credentials`
   - Any other required fields
3. Click "Generate" or "Submit"

### Step 4: Monitor the Request

**While the request is processing:**

Open a new terminal and monitor CloudWatch logs in real-time:

```powershell
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

This will show you live logs as the function executes.

### Step 5: Verify Bedrock is Being Used

**Look for these log messages:**

```
Creating AI engine for provider: BEDROCK
Invoking Bedrock model: us.anthropic.claude-sonnet-4-6
```

**If you see these, Bedrock is working!**

### Step 6: Check the Response

1. The application should display generated test code
2. Verify it looks like valid Playwright/test code
3. Compare with previous OpenAI-generated tests if available

## Expected Results

### Success Indicators ✅

- Application returns test code within 30 seconds
- CloudWatch logs show "BEDROCK" provider
- Test code is syntactically valid
- No errors in the response

### What to Look For in Logs

```
[INFO] Creating AI engine for provider: BEDROCK
[INFO] Bedrock region: us-east-1
[INFO] Bedrock model ID: us.anthropic.claude-sonnet-4-6
[INFO] Invoking Bedrock model...
[INFO] Bedrock response received
[INFO] Generated test code: [test code here]
[INFO] Cost: $0.XX
```

## Troubleshooting

### If You See OpenAI in Logs

**Problem**: Logs show `Creating AI engine for provider: OPENAI`

**Solution**: 
- Configuration may not have persisted
- Run this to verify:
  ```powershell
  aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables.AI_PROVIDER'
  ```
- Should return: `BEDROCK`
- If not, re-apply the configuration

### If You See Errors

**Common Errors:**

1. **"Model not found"**
   - Bedrock model not enabled in your region
   - Check: `aws bedrock list-foundation-models --region us-east-1`

2. **"Access Denied"**
   - IAM permissions issue
   - Verify Lambda role has `bedrock:InvokeModel` permission

3. **"Rate Limit"**
   - Still hitting Lambda rate limit
   - Wait 5-10 minutes and try again

4. **"Timeout"**
   - Bedrock taking too long
   - Check Bedrock service status in AWS console

### If Application Hangs

- Check CloudWatch logs for errors
- Verify API Gateway is responding
- Check Lambda function timeout (should be 60+ seconds)

## Monitoring CloudWatch Logs

### Real-Time Monitoring

```powershell
# Follow logs in real-time
aws logs tail /aws/lambda/aibts-ai-generate --follow

# Follow with grep filter for Bedrock
aws logs tail /aws/lambda/aibts-ai-generate --follow | Select-String "BEDROCK"
```

### View Recent Logs

```powershell
# Get last 50 log lines
aws logs tail /aws/lambda/aibts-ai-generate --max-items 50

# Get logs from last 5 minutes
aws logs tail /aws/lambda/aibts-ai-generate --since 5m
```

## Success Checklist

- [ ] Application loads without errors
- [ ] Can navigate to AI Test Generation section
- [ ] Can submit test generation request
- [ ] Request completes within 30 seconds
- [ ] CloudWatch logs show "BEDROCK" provider
- [ ] Response contains generated test code
- [ ] Test code is syntactically valid
- [ ] No errors in application or logs

## Next Steps After Successful Test

1. **Document Results**
   - Note response quality
   - Compare with OpenAI if available
   - Record any differences

2. **Test Multiple Scenarios**
   - Try different URLs
   - Try different scenarios
   - Verify consistency

3. **Monitor Costs**
   - Check CloudWatch metrics for Bedrock costs
   - Compare with OpenAI costs
   - Verify 33% savings

4. **Proceed to Phase 2**
   - Once validated, move to canary deployment
   - Enable Bedrock for 10% of traffic
   - Monitor error rates and latency

## Important Notes

- **No Rate Limit**: Application requests bypass the Lambda rate limit
- **Real Traffic**: This is actual user traffic, not a test invocation
- **Persistent Configuration**: Bedrock configuration is persistent
- **Fallback Available**: Can rollback to OpenAI in < 1 minute if needed

## Rollback (If Needed)

If something goes wrong:

```powershell
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=OPENAI}"
```

This switches back to OpenAI immediately.

---

**Ready to test?** Open your application and trigger AI test generation now!

