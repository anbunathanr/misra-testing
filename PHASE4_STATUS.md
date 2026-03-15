# Phase 4: Real OpenAI Integration - Status

## Current Implementation Status

### ✅ Already Implemented

1. **AI Engine Service** (`packages/backend/src/services/ai-test-generation/ai-engine.ts`)
   - Complete OpenAI integration
   - Circuit breaker pattern
   - Retry logic with exponential backoff
   - Response validation with Zod schemas
   - API logging
   - Mock mode support

2. **OpenAI Configuration** (`packages/backend/src/config/openai-config.ts`)
   - Model selection (GPT-4, GPT-3.5)
   - Pricing configuration
   - Usage limits
   - Timeout configuration
   - Cost calculation functions

3. **Cost Tracker Service** (`packages/backend/src/services/ai-test-generation/cost-tracker.ts`)
   - Token usage tracking
   - Cost calculation
   - DynamoDB integration

4. **AI Usage Table** (DynamoDB)
   - Stores usage data
   - GSI for project and operation queries

5. **Lambda Functions**
   - `/ai-test-generation/analyze` - Analyze web pages
   - `/ai-test-generation/generate` - Generate test cases
   - `/ai-test-generation/batch` - Batch generation
   - `/ai-test-generation/usage` - Get usage stats

### 🔄 Needs Update

1. **API Key Management**
   - Currently: Uses `process.env.OPENAI_API_KEY`
   - Needed: Retrieve from AWS Secrets Manager
   - File to update: `packages/backend/src/config/openai-config.ts`

2. **Lambda IAM Permissions**
   - Currently: No Secrets Manager permissions
   - Needed: Grant `secretsmanager:GetSecretValue` permission
   - File to update: `packages/backend/src/infrastructure/minimal-stack.ts`

3. **Usage Limits Enforcement**
   - Currently: Limits defined but not enforced
   - Needed: Check limits before API calls
   - File to update: `packages/backend/src/services/ai-test-generation/cost-tracker.ts`

4. **Frontend Usage Display**
   - Currently: No usage UI
   - Needed: Dashboard component showing usage
   - Files to create: `packages/frontend/src/components/UsageCard.tsx`

## Implementation Plan

### Step 1: Update OpenAI Config to Use Secrets Manager

```typescript
// packages/backend/src/config/openai-config.ts
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });
let cachedApiKey: string | null = null;

export async function getOpenAIApiKey(): Promise<string> {
  // Return cached key if available
  if (cachedApiKey) {
    return cachedApiKey;
  }
  
  // Check if using environment variable (for local development)
  if (process.env.OPENAI_API_KEY) {
    cachedApiKey = process.env.OPENAI_API_KEY;
    return cachedApiKey;
  }
  
  // Retrieve from Secrets Manager
  try {
    const command = new GetSecretValueCommand({
      SecretId: process.env.OPENAI_SECRET_NAME || 'aibts/openai-api-key',
    });
    
    const response = await secretsClient.send(command);
    
    if (!response.SecretString) {
      throw new Error('OpenAI API key not found in Secrets Manager');
    }
    
    cachedApiKey = response.SecretString;
    return cachedApiKey;
  } catch (error) {
    throw new Error(`Failed to retrieve OpenAI API key: ${error instanceof Error ? error.message : String(error)}`);
  }
}
```

### Step 2: Update AI Engine Constructor

```typescript
// packages/backend/src/services/ai-test-generation/ai-engine.ts
export class AIEngine {
  private client: OpenAI | null = null;
  
  private async getClient(): Promise<OpenAI> {
    if (this.client) return this.client;
    
    const apiKey = await getOpenAIApiKey();
    
    this.client = new OpenAI({
      apiKey,
      organization: OPENAI_CONFIG.organization,
      timeout: getTimeout('request'),
    });
    
    return this.client;
  }
  
  async generateTestSpecification(...) {
    const client = await this.getClient();
    // ... rest of the method
  }
}
```

### Step 3: Grant Secrets Manager Permissions

```typescript
// packages/backend/src/infrastructure/minimal-stack.ts
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

// Reference the secret
const openAiSecret = secretsmanager.Secret.fromSecretNameV2(
  this,
  'OpenAISecret',
  'aibts/openai-api-key'
);

// Grant read access
openAiSecret.grantRead(aiAnalyzeFunction);
openAiSecret.grantRead(aiGenerateFunction);
openAiSecret.grantRead(aiBatchFunction);

// Add environment variable
aiAnalyzeFunction.addEnvironment('OPENAI_SECRET_NAME', 'aibts/openai-api-key');
aiGenerateFunction.addEnvironment('OPENAI_SECRET_NAME', 'aibts/openai-api-key');
aiBatchFunction.addEnvironment('OPENAI_SECRET_NAME', 'aibts/openai-api-key');
```

### Step 4: Enforce Usage Limits

```typescript
// packages/backend/src/services/ai-test-generation/cost-tracker.ts
export class CostTracker {
  async checkLimits(userId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    // Get today's usage
    const usage = await this.getUsageForDate(userId, today);
    
    // Get user limits (from config or database)
    const limits = OPENAI_CONFIG.limits.perUser;
    
    // Check daily request limit
    if (usage.requestCount >= limits.dailyRequests) {
      throw new Error(`Daily request limit exceeded (${limits.dailyRequests} requests/day)`);
    }
    
    // Check daily cost limit
    if (usage.totalCost >= limits.dailyCost) {
      throw new Error(`Daily cost limit exceeded ($${limits.dailyCost}/day)`);
    }
    
    // Check daily token limit
    if (usage.totalTokens >= limits.dailyTokens) {
      throw new Error(`Daily token limit exceeded (${limits.dailyTokens} tokens/day)`);
    }
  }
  
  async trackUsage(params: {
    userId: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    operation: string;
  }): Promise<void> {
    // Check limits BEFORE making the API call
    await this.checkLimits(params.userId);
    
    // Calculate cost
    const cost = calculateCost(params.model, params.promptTokens, params.completionTokens);
    
    // Save to DynamoDB
    await this.saveUsage({
      userId: params.userId,
      timestamp: Date.now(),
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.promptTokens + params.completionTokens,
      cost,
      operation: params.operation,
    });
  }
}
```

### Step 5: Create Frontend Usage Component

```typescript
// packages/frontend/src/components/UsageCard.tsx
import { Card, CardContent, Typography, LinearProgress, Box } from '@mui/material';
import { useGetUsageQuery } from '../store/api/aiApi';

export const UsageCard: React.FC = () => {
  const { data: usage, isLoading } = useGetUsageQuery();
  
  if (isLoading || !usage) {
    return <Card><CardContent>Loading usage...</CardContent></Card>;
  }
  
  const percentUsed = (usage.today.cost / usage.limits.dailyCost) * 100;
  
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          AI Usage Today
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Cost</Typography>
            <Typography variant="body2">
              ${usage.today.cost.toFixed(2)} / ${usage.limits.dailyCost.toFixed(2)}
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(percentUsed, 100)}
            color={percentUsed > 80 ? 'error' : 'primary'}
          />
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Requests: {usage.today.requests} / {usage.limits.dailyRequests}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Tokens: {usage.today.tokens.toLocaleString()}
          </Typography>
        </Box>
        
        {percentUsed > 80 && (
          <Typography variant="caption" color="error">
            Warning: Approaching daily limit
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
```

## Deployment Steps

1. **Create OpenAI API Key**:
   - Go to https://platform.openai.com
   - Create API key
   - Copy the key

2. **Store in Secrets Manager**:
```bash
aws secretsmanager create-secret \
  --name aibts/openai-api-key \
  --description "OpenAI API key for AIBTS" \
  --secret-string "sk-YOUR-ACTUAL-KEY" \
  --region us-east-1
```

3. **Update Code** (as described above)

4. **Deploy Backend**:
```bash
cd packages/backend
npm run build
cdk deploy MinimalStack
```

5. **Test API**:
```bash
# Test with real OpenAI
curl -X POST https://your-api.com/ai-test-generation/generate \
  -H "Authorization: Bearer YOUR_COGNITO_TOKEN" \
  -d '{"prompt": "Test login", "projectId": "proj-123"}'
```

6. **Monitor Usage**:
   - Check CloudWatch logs
   - Check DynamoDB AI Usage table
   - Verify cost tracking

## Testing Checklist

- [ ] API key retrieved from Secrets Manager
- [ ] OpenAI API calls successful
- [ ] Cost tracking working
- [ ] Usage limits enforced
- [ ] Frontend displays usage
- [ ] Error handling working
- [ ] No API key in logs
- [ ] Circuit breaker working
- [ ] Retry logic working

## Current Mode

The system currently supports both modes:
- **Mock Mode**: Uses `MockAIService` for testing (no OpenAI API calls)
- **Real Mode**: Uses real OpenAI API

To switch modes, the `MockAIService.isMockMode()` check in `ai-engine.ts` determines which to use.

## Next Actions

1. Update `openai-config.ts` to use Secrets Manager
2. Update `ai-engine.ts` to make `getClient()` async
3. Update `minimal-stack.ts` to grant Secrets Manager permissions
4. Implement usage limit enforcement in `cost-tracker.ts`
5. Create frontend usage component
6. Test end-to-end with real OpenAI
7. Deploy to production

## Estimated Time

- Code updates: 2-3 hours
- Testing: 1-2 hours
- Deployment: 1 hour
- **Total**: 4-6 hours (half day)

## Notes

- The infrastructure is already 90% complete
- Main work is switching from env vars to Secrets Manager
- Usage tracking is already implemented
- Just needs limit enforcement and frontend display
