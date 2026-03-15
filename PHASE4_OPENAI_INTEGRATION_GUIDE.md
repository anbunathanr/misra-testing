# Phase 4: Real OpenAI Integration Guide

## Overview

Phase 4 replaces the mock AI service with real OpenAI API integration. The AI infrastructure is already built - we just need to configure it properly and add cost tracking.

## Current State

The system already has:
- AI Engine service (`packages/backend/src/services/ai-test-generation/ai-engine.ts`)
- Cost Tracker service (`packages/backend/src/services/ai-test-generation/cost-tracker.ts`)
- AI Usage DynamoDB table
- Lambda functions for AI operations (analyze, generate, batch)

Currently using: Mock AI service for testing

## What Needs to Be Done

### 1. Get OpenAI API Key

Sign up at https://platform.openai.com and create an API key.

### 2. Store API Key in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name aibts/openai-api-key \
  --description "OpenAI API key for AIBTS Platform" \
  --secret-string "sk-YOUR-ACTUAL-OPENAI-API-KEY" \
  --region us-east-1
```

### 3. Update Lambda Functions to Use Secrets Manager

The Lambda functions need to:
- Retrieve the API key from Secrets Manager
- Pass it to the AI Engine
- Use real OpenAI instead of mock

### 4. Configure Cost Tracking

The Cost Tracker already exists but needs to be properly integrated with:
- User limits (daily/monthly)
- Usage monitoring
- Alert thresholds

### 5. Update Frontend to Show Usage

Add a usage dashboard component to display:
- Current usage (tokens, cost)
- Remaining quota
- Usage history

## Implementation Steps

### Step 1: Install OpenAI SDK (if not already installed)

```bash
cd packages/backend
npm install openai
```

### Step 2: Update AI Engine to Use Real OpenAI

The AI Engine already has the structure - just needs to switch from mock to real:

```typescript
// packages/backend/src/services/ai-test-generation/ai-engine.ts
import OpenAI from 'openai';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });
let openaiClient: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (openaiClient) return openaiClient;
  
  // Get API key from Secrets Manager
  const command = new GetSecretValueCommand({
    SecretId: 'aibts/openai-api-key',
  });
  
  const response = await secretsClient.send(command);
  const apiKey = response.SecretString;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found');
  }
  
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}
```

### Step 3: Grant Lambda Functions Access to Secrets Manager

Update the CDK stack to grant permissions:

```typescript
// In minimal-stack.ts
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Reference the secret
const openAiSecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'OpenAISecret',
  'aibts/openai-api-key'
);

// Grant read access to Lambda functions
openAiSecret.grantRead(aiAnalyzeFunction);
openAiSecret.grantRead(aiGenerateFunction);
openAiSecret.grantRead(aiBatchFunction);
```

### Step 4: Update Environment Variables

Remove the mock flag and add secret name:

```typescript
environment: {
  AI_USAGE_TABLE: aiUsageTable.tableName,
  OPENAI_SECRET_NAME: 'aibts/openai-api-key',
  USE_REAL_OPENAI: 'true', // Flag to switch from mock
}
```

### Step 5: Implement Usage Limits

The Cost Tracker service needs user-specific limits:

```typescript
// Add to DynamoDB Users table or create separate limits table
interface UserLimits {
  userId: string;
  dailyCallLimit: number;      // e.g., 100 calls per day
  monthlyCostLimit: number;    // e.g., $50 per month
  tier: 'free' | 'pro' | 'enterprise';
}
```

### Step 6: Create Usage Dashboard Endpoint

Already exists: `GET /ai-test-generation/usage`

Just needs to return:
```json
{
  "userId": "user-123",
  "currentMonth": {
    "totalCalls": 45,
    "totalTokens": 125000,
    "totalCost": 12.50,
    "limit": 50.00,
    "remaining": 37.50
  },
  "today": {
    "calls": 5,
    "tokens": 8000,
    "cost": 1.20
  }
}
```

### Step 7: Update Frontend Usage Display

Add to Dashboard or create dedicated Usage page:

```typescript
// packages/frontend/src/components/UsageCard.tsx
export const UsageCard: React.FC = () => {
  const { data: usage } = useGetUsageQuery();
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">AI Usage</Typography>
        <LinearProgress 
          variant="determinate" 
          value={(usage.currentMonth.totalCost / usage.currentMonth.limit) * 100} 
        />
        <Typography>
          ${usage.currentMonth.totalCost.toFixed(2)} / ${usage.currentMonth.limit.toFixed(2)}
        </Typography>
        <Typography variant="caption">
          {usage.currentMonth.remaining.toFixed(2)} remaining this month
        </Typography>
      </CardContent>
    </Card>
  );
};
```

## Testing

### Test Real OpenAI Integration

1. **Test Analyze Endpoint**:
```bash
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/ai-test-generation/analyze \
  -H "Authorization: Bearer YOUR_COGNITO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "projectId": "project-123"
  }'
```

2. **Test Generate Endpoint**:
```bash
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate \
  -H "Authorization: Bearer YOUR_COGNITO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Generate a test for login functionality",
    "projectId": "project-123"
  }'
```

3. **Check Usage**:
```bash
curl https://your-api.execute-api.us-east-1.amazonaws.com/ai-test-generation/usage \
  -H "Authorization: Bearer YOUR_COGNITO_TOKEN"
```

### Verify Cost Tracking

1. Check DynamoDB AI Usage table for new records
2. Verify token counts are accurate
3. Verify cost calculations match OpenAI pricing
4. Test usage limits enforcement

## Cost Considerations

### OpenAI Pricing (as of 2024)

- **GPT-4**: $0.03/1K prompt tokens, $0.06/1K completion tokens
- **GPT-3.5-turbo**: $0.0015/1K prompt tokens, $0.002/1K completion tokens

### Recommended Limits

**Free Tier**:
- 50 calls/day
- $10/month

**Pro Tier**:
- 500 calls/day
- $100/month

**Enterprise**:
- Unlimited calls
- Custom pricing

### Cost Optimization

1. Use GPT-3.5-turbo for simple tasks
2. Use GPT-4 only for complex analysis
3. Cache common responses
4. Implement prompt optimization
5. Set reasonable token limits

## Monitoring

### CloudWatch Metrics

Create custom metrics for:
- API call count
- Token usage
- Cost per user
- Error rate
- Response time

### Alerts

Set up CloudWatch alarms for:
- Daily cost exceeds threshold
- Error rate > 5%
- Individual user exceeds limit
- Total monthly cost approaching budget

## Rollback Plan

If issues occur:

1. **Switch back to mock**:
```typescript
environment: {
  USE_REAL_OPENAI: 'false',
}
```

2. **Disable AI features temporarily**:
- Show maintenance message in UI
- Queue requests for later processing

3. **Investigate issues**:
- Check CloudWatch logs
- Verify API key is valid
- Check Secrets Manager permissions
- Review cost tracking logic

## Security Notes

- API key stored in Secrets Manager (encrypted)
- Never log API key
- Rotate API key periodically
- Use least-privilege IAM permissions
- Monitor for unusual usage patterns

## Success Criteria

- [ ] OpenAI API key stored in Secrets Manager
- [ ] Lambda functions can retrieve API key
- [ ] Real OpenAI API calls working
- [ ] Cost tracking accurate
- [ ] Usage limits enforced
- [ ] Frontend displays usage
- [ ] No API key leaks in logs
- [ ] Error handling working
- [ ] Monitoring and alerts configured

## Next Steps

After Phase 4:
- Phase 5: Integration and Testing
- End-to-end testing
- Performance optimization
- Security review
- Documentation updates
- Production deployment

## Estimated Time

- Setup: 1-2 hours
- Implementation: 4-6 hours
- Testing: 2-3 hours
- Documentation: 1 hour

**Total**: 1-2 days
