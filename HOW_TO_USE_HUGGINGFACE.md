# How to Use Hugging Face Instead of OpenAI

## Why Hugging Face?

- **FREE**: Generous free tier with rate limits
- **No credit card required** for getting started
- **Open source models**: Mistral, Llama 2, Zephyr, and more
- **Easy to switch**: Can migrate to OpenAI later without code changes

## Quick Start (5 minutes)

### Step 1: Get Hugging Face API Key

1. Go to https://huggingface.co
2. Click "Sign Up" (top right)
3. Create account with email or GitHub
4. Go to https://huggingface.co/settings/tokens
5. Click "New token"
6. Name it: "AIBTS Production"
7. Type: "Read"
8. Click "Generate"
9. Copy the token (starts with `hf_`)

### Step 2: Store API Key in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name aibts/huggingface-api-key \
  --secret-string "hf_YOUR_TOKEN_HERE" \
  --region us-east-1
```

### Step 3: Install Dependencies

```bash
cd packages/backend
npm install
```

This installs `@huggingface/inference` package (already added to package.json).

### Step 4: Deploy

```bash
npm run build
cdk deploy MinimalStack
```

The system is already configured to use Hugging Face by default (`USE_HUGGINGFACE=true`).

### Step 5: Test

Your AI test generation will now use Hugging Face! No other changes needed.

## How It Works

The system automatically detects which AI provider to use based on the `USE_HUGGINGFACE` environment variable:

```typescript
// In ai-engine.ts
if (process.env.USE_HUGGINGFACE === 'true') {
  // Use Hugging Face
  const hfEngine = new HuggingFaceEngine();
  return await hfEngine.generateTestSpecification(analysis, scenario, context);
}
// Otherwise use OpenAI
```

## Models Used

**Default**: `mistralai/Mixtral-8x7B-Instruct-v0.1`
- Excellent for code generation
- Good instruction following
- Free tier available

**Alternatives** (you can change in `huggingface-engine.ts`):
- `meta-llama/Llama-2-70b-chat-hf` - Meta's Llama 2
- `HuggingFaceH4/zephyr-7b-beta` - Smaller, faster
- `codellama/CodeLlama-34b-Instruct-hf` - Specialized for code

## Rate Limits

### Free Tier
- **1,000 requests/day** per model
- **10 requests/minute** per model
- Sufficient for development and small production use

### Pro Tier ($9/month)
- **10,000 requests/day**
- **100 requests/minute**
- Priority access

## Cost Comparison

| Provider | Free Tier | Cost per 1K tokens | Cost per test case |
|----------|-----------|-------------------|-------------------|
| **Hugging Face** | 1,000 req/day | FREE | FREE |
| OpenAI GPT-4 | $5 credit | $0.01-0.03 | ~$0.035 |
| OpenAI GPT-3.5 | $5 credit | $0.0005-0.0015 | ~$0.00175 |

**For 100 test cases/month:**
- Hugging Face: **$0** (free)
- OpenAI GPT-4: **$3.50**
- OpenAI GPT-3.5: **$0.18**

## Switching to OpenAI Later

When you're ready to use OpenAI (better quality, faster):

### Option 1: Environment Variable (Easiest)

```bash
# Update Lambda environment variable
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment Variables={USE_HUGGINGFACE=false,...} \
  --region us-east-1
```

### Option 2: CDK Deployment

```bash
# Set environment variable before deploy
export USE_HUGGINGFACE=false

cd packages/backend
cdk deploy MinimalStack
```

### Option 3: Update Code

In `minimal-stack.ts`, change:
```typescript
USE_HUGGINGFACE: 'false', // Switch to OpenAI
```

Then redeploy.

## Configuration

### Change Model

Edit `packages/backend/src/services/ai-test-generation/huggingface-engine.ts`:

```typescript
private readonly MODEL = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
// Change to:
private readonly MODEL = 'meta-llama/Llama-2-70b-chat-hf';
```

### Adjust Parameters

```typescript
parameters: {
  max_new_tokens: 2000,    // Max response length
  temperature: 0.3,        // Lower = more deterministic
  top_p: 0.95,            // Nucleus sampling
  return_full_text: false, // Only return generated text
}
```

## Troubleshooting

### Error: "Model is loading"

**Cause**: Model needs to warm up (first request)

**Solution**: Wait 30-60 seconds and retry. Subsequent requests will be fast.

### Error: "Rate limit exceeded"

**Cause**: Exceeded free tier limits

**Solutions**:
1. Wait until next day (limits reset daily)
2. Upgrade to Pro tier ($9/month)
3. Switch to OpenAI temporarily

### Error: "Invalid API token"

**Cause**: Token is incorrect or expired

**Solution**:
1. Generate new token at https://huggingface.co/settings/tokens
2. Update in Secrets Manager:
```bash
aws secretsmanager update-secret \
  --secret-id aibts/huggingface-api-key \
  --secret-string "hf_NEW_TOKEN"
```

### Poor Quality Results

**Cause**: Model might not be optimal for your use case

**Solutions**:
1. Try different model (Llama 2, CodeLlama)
2. Adjust temperature (lower = more focused)
3. Switch to OpenAI for better quality

## Monitoring

### Check Usage

Go to https://huggingface.co/settings/billing to see:
- Requests made today
- Remaining quota
- Rate limit status

### CloudWatch Logs

```bash
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

Look for:
```
[HuggingFace] Generated test in 2341ms
```

## Comparison: Hugging Face vs OpenAI

| Feature | Hugging Face | OpenAI |
|---------|-------------|--------|
| **Cost** | FREE (1K req/day) | $0.035/test case |
| **Quality** | Good | Excellent |
| **Speed** | 2-5 seconds | 1-3 seconds |
| **Setup** | 5 minutes | 10 minutes |
| **Credit Card** | Not required | Required |
| **Rate Limits** | 10 req/min | 60 req/min |
| **Best For** | Development, MVP | Production, Scale |

## Recommended Strategy

1. **Start with Hugging Face** (now)
   - Free, no credit card
   - Good enough for MVP
   - Test the system

2. **Switch to OpenAI** (when ready)
   - Better quality results
   - Faster response times
   - Higher rate limits
   - When you have budget

## Files Modified

The following files were updated to support Hugging Face:

1. `packages/backend/src/services/ai-test-generation/huggingface-engine.ts` - NEW
2. `packages/backend/src/services/ai-test-generation/ai-engine.ts` - Updated
3. `packages/backend/src/infrastructure/minimal-stack.ts` - Updated
4. `packages/backend/package.json` - Added `@huggingface/inference`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `USE_HUGGINGFACE` | `true` | Use Hugging Face instead of OpenAI |
| `HUGGINGFACE_SECRET_NAME` | `aibts/huggingface-api-key` | Secret name in AWS |
| `HUGGINGFACE_API_KEY` | - | For local development only |

## Local Development

For local testing:

```bash
# Set environment variable
export HUGGINGFACE_API_KEY="hf_YOUR_TOKEN"
export USE_HUGGINGFACE="true"

# Run tests
npm test
```

## Production Checklist

- [ ] Created Hugging Face account
- [ ] Generated API token
- [ ] Stored token in AWS Secrets Manager
- [ ] Installed dependencies (`npm install`)
- [ ] Deployed backend (`cdk deploy MinimalStack`)
- [ ] Tested AI generation endpoint
- [ ] Monitored CloudWatch logs
- [ ] Checked Hugging Face usage dashboard

## Support

- **Hugging Face Docs**: https://huggingface.co/docs/api-inference
- **Community Forum**: https://discuss.huggingface.co
- **Status Page**: https://status.huggingface.co

## Next Steps

1. Get your Hugging Face token (5 minutes)
2. Store it in Secrets Manager
3. Deploy and test
4. Monitor usage
5. Switch to OpenAI when ready for production scale

You're all set! The system will use Hugging Face by default, and you can switch to OpenAI anytime with a single environment variable change. 🚀
