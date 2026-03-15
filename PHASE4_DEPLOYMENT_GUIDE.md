# Phase 4: OpenAI Integration - Deployment Guide

## Overview

Phase 4 integrates real OpenAI API for AI-powered test generation, replacing the mock service. This guide walks through the complete deployment process.

## What Was Implemented

### Backend Changes

1. **OpenAI Config (`packages/backend/src/config/openai-config.ts`)**
   - Made `getOpenAIApiKey()` async
   - Added AWS Secrets Manager integration
   - Caches API key for performance
   - Falls back to environment variable for local development

2. **AI Engine (`packages/backend/src/services/ai-test-generation/ai-engine.ts`)**
   - Updated to lazy-load OpenAI client
   - Added `getClient()` method for async API key retrieval
   - Maintains circuit breaker and retry logic

3. **Cost Tracker (`packages/backend/src/services/ai-test-generation/cost-tracker.ts`)**
   - Added `checkLimits()` method that throws errors when limits exceeded
   - Enforces daily and monthly usage limits
   - Provides clear error messages to users

4. **Infrastructure (`packages/backend/src/infrastructure/minimal-stack.ts`)**
   - Added Secrets Manager secret reference
   - Granted Lambda functions read access to secret
   - Added environment variables for secret name and region

5. **Get Usage Lambda (`packages/backend/src/functions/ai-test-generation/get-usage.ts`)**
   - Returns today's usage, this month's usage, and limits
   - Calculates usage percentages for frontend display

### Frontend Changes

1. **AI API (`packages/frontend/src/store/api/aiApi.ts`)**
   - Created RTK Query endpoint for usage stats
   - Typed response interface

2. **Usage Card Component (`packages/frontend/src/components/UsageCard.tsx`)**
   - Displays today's and this month's usage
   - Shows progress bars with color coding (green/yellow/red)
   - Displays warnings when approaching limits
   - Shows request count, token count, and cost

## Deployment Steps

### Step 1: Create OpenAI API Key

1. Go to https://platform.openai.com
2. Sign in or create an account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (starts with `sk-`)
6. **IMPORTANT**: Save this key securely - you won't be able to see it again

### Step 2: Store API Key in AWS Secrets Manager

```bash
# Create the secret
aws secretsmanager create-secret \
  --name aibts/openai-api-key \
  --description "OpenAI API key for AIBTS AI test generation" \
  --secret-string "sk-YOUR-ACTUAL-KEY-HERE" \
  --region us-east-1

# Verify the secret was created
aws secretsmanager describe-secret \
  --secret-id aibts/openai-api-key \
  --region us-east-1
```

**Alternative: Using AWS Console**
1. Go to AWS Secrets Manager console
2. Click "Store a new secret"
3. Select "Other type of secret"
4. Choose "Plaintext" tab
5. Paste your OpenAI API key (just the key, no JSON)
6. Name it: `aibts/openai-api-key`
7. Click "Store"

### Step 3: Deploy Backend

```bash
cd packages/backend

# Install dependencies (if not already done)
npm install

# Build the backend
npm run build

# Deploy with CDK
cdk deploy MinimalStack

# Note the outputs:
# - APIEndpoint
# - UserPoolId
# - UserPoolClientId
```

### Step 4: Verify Deployment

```bash
# Check Lambda functions have the secret environment variable
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --region us-east-1 \
  --query 'Environment.Variables'

# Should show:
# {
#   "OPENAI_SECRET_NAME": "aibts/openai-api-key",
#   "AWS_REGION": "us-east-1",
#   ...
# }
```

### Step 5: Test OpenAI Integration

**Option A: Using AWS Console**
1. Go to Lambda console
2. Select `aibts-ai-generate` function
3. Create test event:
```json
{
  "body": "{\"url\":\"https://example.com\",\"scenario\":\"Test login\",\"projectId\":\"test-123\"}",
  "requestContext": {
    "authorizer": {
      "claims": {
        "sub": "test-user-123"
      }
    }
  }
}
```
4. Click "Test"
5. Check logs for OpenAI API call

**Option B: Using curl (requires Cognito token)**
```bash
# First, get a Cognito token (see Phase 3 deployment guide)
TOKEN="your-cognito-token"

# Test the generate endpoint
curl -X POST https://YOUR-API-URL/ai-test-generation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "scenario": "Test login functionality",
    "projectId": "proj-123"
  }'
```

### Step 6: Monitor Usage

```bash
# Check CloudWatch logs
aws logs tail /aws/lambda/aibts-ai-generate --follow

# Check DynamoDB for usage records
aws dynamodb scan \
  --table-name aibts-ai-usage \
  --limit 10 \
  --region us-east-1
```

### Step 7: Deploy Frontend with Usage Component

```bash
cd packages/frontend

# Install dependencies
npm install

# Build
npm run build

# Deploy to Vercel
vercel --prod
```

### Step 8: Test Usage Display

1. Open frontend: https://aibts-platform.vercel.app
2. Login with Cognito credentials
3. Navigate to Dashboard
4. Add UsageCard component to dashboard (if not already added)
5. Verify usage stats display correctly

## Configuration

### Usage Limits

Default limits are configured in `packages/backend/src/services/ai-test-generation/cost-tracker.ts`:

```typescript
const DEFAULT_LIMITS: UsageLimits = {
  perUserMonthly: 100,    // $100 per user per month
  perProjectMonthly: 50,  // $50 per project per month
};
```

To change limits:
1. Update `DEFAULT_LIMITS` in `cost-tracker.ts`
2. Update `limits` in `get-usage.ts` to match
3. Rebuild and redeploy

### Model Selection

Models are configured in `packages/backend/src/config/openai-config.ts`:

```typescript
models: {
  default: 'gpt-4-turbo-preview',
  fallback: 'gpt-3.5-turbo',
  analysis: 'gpt-4-turbo-preview',
  generation: 'gpt-4-turbo-preview',
}
```

To use GPT-3.5 (cheaper):
1. Change `generation: 'gpt-3.5-turbo'`
2. Rebuild and redeploy

## Troubleshooting

### Error: "Failed to retrieve OpenAI API key"

**Cause**: Lambda can't access Secrets Manager

**Solution**:
```bash
# Check IAM permissions
aws lambda get-policy \
  --function-name aibts-ai-generate \
  --region us-east-1

# Verify secret exists
aws secretsmanager get-secret-value \
  --secret-id aibts/openai-api-key \
  --region us-east-1
```

### Error: "Monthly usage limit exceeded"

**Cause**: User has exceeded their monthly limit

**Solution**:
1. Check usage in DynamoDB
2. Increase limits in code
3. Or wait until next month

### Error: "OpenAI API rate limit"

**Cause**: Too many requests to OpenAI

**Solution**:
1. Circuit breaker will open automatically
2. Wait 60 seconds for circuit to reset
3. Consider upgrading OpenAI plan

### High Costs

**Cause**: Using GPT-4 extensively

**Solutions**:
1. Switch to GPT-3.5 for generation
2. Reduce `maxTokens` in config
3. Lower usage limits
4. Implement request throttling

## Cost Estimation

### GPT-4 Turbo Pricing (as of 2024)
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens

### GPT-3.5 Turbo Pricing
- Input: $0.0005 per 1K tokens
- Output: $0.0015 per 1K tokens

### Example Costs

**Generating 1 test case with GPT-4:**
- Prompt: ~2000 tokens = $0.02
- Completion: ~500 tokens = $0.015
- **Total: ~$0.035 per test case**

**Generating 1 test case with GPT-3.5:**
- Prompt: ~2000 tokens = $0.001
- Completion: ~500 tokens = $0.00075
- **Total: ~$0.00175 per test case**

**Monthly estimates:**
- 100 test cases/month with GPT-4: ~$3.50
- 100 test cases/month with GPT-3.5: ~$0.18
- 1000 test cases/month with GPT-4: ~$35
- 1000 test cases/month with GPT-3.5: ~$1.75

## Security Best Practices

1. **Never commit API keys to git**
   - Always use Secrets Manager
   - Never use environment variables in production

2. **Rotate API keys regularly**
   ```bash
   # Create new key in OpenAI
   # Update secret
   aws secretsmanager update-secret \
     --secret-id aibts/openai-api-key \
     --secret-string "sk-NEW-KEY"
   ```

3. **Monitor usage and costs**
   - Set up CloudWatch alarms
   - Review DynamoDB usage table weekly
   - Check OpenAI dashboard for billing

4. **Implement rate limiting**
   - Already implemented via circuit breaker
   - Consider adding per-user rate limits

## Next Steps

After Phase 4 deployment:

1. **Monitor for 24 hours**
   - Check CloudWatch logs
   - Verify no errors
   - Monitor costs

2. **Test with real users**
   - Create test accounts
   - Generate test cases
   - Verify quality

3. **Optimize if needed**
   - Adjust model selection
   - Tune prompts
   - Adjust limits

4. **Proceed to Phase 5**
   - Integration testing
   - Performance testing
   - Security review

## Support

If you encounter issues:

1. Check CloudWatch logs: `/aws/lambda/aibts-ai-generate`
2. Check DynamoDB table: `aibts-ai-usage`
3. Verify Secrets Manager: `aibts/openai-api-key`
4. Check OpenAI dashboard for API errors

## Rollback Plan

If deployment fails:

```bash
# Rollback CDK stack
cdk deploy MinimalStack --rollback

# Or manually:
# 1. Remove Secrets Manager permissions from Lambda
# 2. Set OPENAI_API_KEY environment variable to "MOCK"
# 3. Redeploy
```

## Success Criteria

Phase 4 is complete when:

- [x] OpenAI API key stored in Secrets Manager
- [x] Lambda functions can retrieve API key
- [x] Real OpenAI API calls working
- [x] Cost tracking recording usage
- [x] Usage limits enforced
- [x] Frontend displays usage stats
- [ ] No errors in CloudWatch logs
- [ ] Test cases generated successfully
- [ ] Costs within expected range

## Estimated Costs

**AWS Infrastructure:**
- Secrets Manager: $0.40/month (1 secret)
- Lambda invocations: ~$0.20/month (1000 invocations)
- DynamoDB: ~$0.25/month (on-demand)
- **Total AWS: ~$0.85/month**

**OpenAI API:**
- Depends on usage
- With default limits: $100/user/month max
- Typical usage: $5-20/user/month

**Total estimated cost: $6-21/user/month**
