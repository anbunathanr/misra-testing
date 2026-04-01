# Bedrock Model Update Summary

## Issue Discovered

The original model specified in the migration spec (`anthropic.claude-3-5-sonnet-20241022-v2:0`) has reached **end of life** and is no longer available in AWS Bedrock.

## Investigation

When attempting to invoke the model, we received:
```
ResourceNotFoundException: This model version has reached the end of its life.
```

## Solution

We updated the implementation to use **Claude Sonnet 4.6** via an **inference profile**, which is the current recommended approach for Claude models in Bedrock.

### What Changed

1. **Model ID Updated**: From `anthropic.claude-3-5-sonnet-20241022-v2:0` to `us.anthropic.claude-sonnet-4-6`
2. **Using Inference Profile**: Instead of direct model access, we now use the US inference profile which provides:
   - Cross-region routing (us-east-1, us-east-2, us-west-2)
   - Higher availability
   - Automatic failover
   - No manual model access request needed

### Files Updated

1. **BedrockEngine** (`packages/backend/src/services/ai-test-generation/bedrock-engine.ts`)
   - Updated default model ID to `us.anthropic.claude-sonnet-4-6`
   - Updated comments to reflect Claude Sonnet 4.6

2. **CDK Stack** (`packages/backend/src/infrastructure/misra-platform-stack.ts`)
   - Updated IAM policy to allow inference profile ARN
   - Changed from: `arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`
   - Changed to: `arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-sonnet-4-6`

3. **Deployment Script** (`.kiro/specs/bedrock-migration/deploy-bedrock-phase1.ps1`)
   - Updated model check to verify inference profile availability
   - Updated environment variable to use new model ID

## Benefits of Using Inference Profile

1. **No Manual Access Request**: Inference profiles are automatically available
2. **Cross-Region Routing**: Requests are routed to the best available region
3. **Higher Availability**: Automatic failover if one region is unavailable
4. **Latest Model**: Claude Sonnet 4.6 is the newest and most capable model
5. **Future-Proof**: AWS recommends using inference profiles for all new Claude models

## Pricing

Claude Sonnet 4.6 pricing remains the same:
- **Input tokens**: $3 per 1M tokens
- **Output tokens**: $15 per 1M tokens

This maintains the expected 33% cost savings compared to OpenAI.

## Testing

Successfully tested the inference profile:
```bash
aws bedrock-runtime invoke-model \
  --model-id us.anthropic.claude-sonnet-4-6 \
  --body '{"anthropic_version":"bedrock-2023-05-31","messages":[{"role":"user","content":[{"type":"text","text":"Hello"}]}],"max_tokens":10}' \
  --cli-binary-format raw-in-base64-out \
  --region us-east-1 \
  output.json
```

Response received successfully with model: `claude-sonnet-4-6`

## Next Steps

1. **Run Deployment Script**: `.\.kiro\specs\bedrock-migration\deploy-bedrock-phase1.ps1`
2. **Verify Deployment**: Check that Lambda functions have the updated model ID
3. **Test Bedrock**: Use feature flag to test with internal users
4. **Proceed with Migration**: Follow the 4-phase rollout plan

## Important Notes

- The deployment script will automatically verify inference profile availability
- No manual model access request is needed
- The inference profile is already active in your account
- All existing tests and code remain compatible
- The migration can proceed as planned

## References

- [AWS Bedrock Inference Profiles Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles.html)
- [Claude Sonnet 4.6 Model Card](https://docs.anthropic.com/en/docs/about-claude/models)
- [Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)
