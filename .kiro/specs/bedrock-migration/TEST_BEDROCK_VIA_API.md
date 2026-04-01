# Testing Bedrock via API - Quick Guide

**Date**: April 1, 2026  
**Function**: `aibts-ai-generate`  
**Status**: Bedrock ENABLED and ready to test

## Overview

Since the AI test generation feature doesn't have a UI yet, you'll test Bedrock by calling the API directly. The `aibts-ai-generate` Lambda function is now configured to use Claude Sonnet 4.6 via Bedrock.

## Prerequisites

- AWS CLI configured
- API Gateway URL: `https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com`
- Authentication token (JWT)

## Option 1: Direct Lambda Invocation (Recommended)

Wait 10-15 minutes for the rate limit to clear, then:

```powershell
# Create the payload inline (avoids file encoding issues)
$json = @'
{"body":"{\"url\":\"https://example.com/login\",\"scenario\":\"User logs in with valid credentials\",\"context\":{\"elements\":[{\"type\":\"input\",\"selector\":\"#email\"},{\"type\":\"input\",\"selector\":\"#password\"},{\"type\":\"button\",\"selector\":\"#login-btn\"}]}}"}
'@

# Convert to base64
$bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$base64 = [Convert]::ToBase64String($bytes)

# Invoke Lambda
aws lambda invoke --function-name aibts-ai-generate --payload $base64 response.json

# View response
Get-Content response.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

## Option 2: Via API Gateway (If you have auth token)

```powershell
# Set your auth token
$token = "YOUR_JWT_TOKEN_HERE"

# Call the API
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    url = "https://example.com/login"
    scenario = "User logs in with valid credentials"
    context = @{
        elements = @(
            @{ type = "input"; selector = "#email" }
            @{ type = "input"; selector = "#password" }
            @{ type = "button"; selector = "#login-btn" }
        )
    }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate" `
    -Method POST `
    -Headers $headers `
    -Body $body
```

## Option 3: Using curl (Cross-platform)

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com/login",
    "scenario": "User logs in with valid credentials",
    "context": {
      "elements": [
        {"type": "input", "selector": "#email"},
        {"type": "input", "selector": "#password"},
        {"type": "button", "selector": "#login-btn"}
      ]
    }
  }'
```

## What to Look For

### Success Indicators

1. **Response contains generated test code**:
   ```json
   {
     "testCode": "import { test, expect } from '@playwright/test';\n\ntest('User logs in with valid credentials', async ({ page }) => {\n  ...",
     "confidence": 0.95,
     "provider": "BEDROCK",
     "model": "us.anthropic.claude-sonnet-4-6"
   }
   ```

2. **CloudWatch logs show Bedrock usage**:
   ```powershell
   # Monitor logs in real-time
   aws logs tail /aws/lambda/aibts-ai-generate --follow
   ```

   Look for:
   - `"Creating AI engine for provider: BEDROCK"`
   - `"Invoking Bedrock model: us.anthropic.claude-sonnet-4-6"`
   - Token usage and cost information

3. **Cost tracking shows Bedrock usage**:
   ```powershell
   # Check AI usage
   curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/usage?userId=user-001" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

## Monitoring Commands

### Watch CloudWatch Logs

```powershell
# Start watching logs (will create log group on first invocation)
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

### Check Function Configuration

```powershell
# Verify Bedrock is still enabled
aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables'
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

### Check CloudWatch Metrics

```powershell
# View Bedrock metrics (after first invocation)
aws cloudwatch get-metric-statistics `
  --namespace "AIBTS/Bedrock" `
  --metric-name "BedrockLatency" `
  --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
  --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
  --period 300 `
  --statistics Average
```

## Troubleshooting

### Rate Limit Error

If you see `TooManyRequestsException: Rate Exceeded`:
- Wait 10-15 minutes
- Avoid rapid successive invocations
- This is temporary AWS throttling

### No Response

If the function doesn't respond:
- Check CloudWatch logs for errors
- Verify IAM permissions are correct
- Ensure Bedrock is available in us-east-1

### Wrong Provider Used

If logs show OpenAI instead of Bedrock:
- Re-check environment variables
- Verify configuration wasn't overwritten
- Redeploy if needed

## Rollback (If Needed)

If you need to switch back to OpenAI:

```powershell
aws lambda update-function-configuration `
  --function-name aibts-ai-generate `
  --environment "Variables={AI_PROVIDER=OPENAI}"
```

## Success Criteria

- [ ] Lambda invocation succeeds (no errors)
- [ ] Response contains generated Playwright test code
- [ ] CloudWatch logs show "BEDROCK" provider
- [ ] Logs show Claude Sonnet 4.6 model ID
- [ ] Token usage and cost are tracked
- [ ] Response quality is good (test code is valid)

## Next Steps After Testing

Once you've confirmed Bedrock works:

1. Compare response quality with OpenAI (if you have historical data)
2. Check response latency (should be similar to OpenAI)
3. Verify cost is lower (~33% savings expected)
4. Collect feedback on test generation quality
5. Proceed to Phase 12 (Canary deployment) if satisfied

## Notes

- The log group `/aws/lambda/aibts-ai-generate` will be created automatically on first invocation
- First invocation may be slower due to cold start
- Bedrock pricing: $3/1M input tokens, $15/1M output tokens
- Expected cost per test generation: ~$0.08 (vs $0.12 with OpenAI)

---

**Bedrock is ready to test!** The function will use Claude Sonnet 4.6 on its next invocation.
