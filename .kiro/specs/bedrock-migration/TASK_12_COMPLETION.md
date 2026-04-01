# Task 12 Completion Report: Canary Deployment

## Summary

Task 12 (Phase 2: Canary Deployment) has been successfully implemented. The system now supports gradual rollout of Bedrock with traffic percentage routing, comprehensive monitoring, and easy rollback capabilities.

## Implementation Details

### 12.1: Traffic Routing Logic ✅

**File**: `packages/backend/src/services/ai-test-generation/ai-engine-factory.ts`

**Changes:**
1. Added `selectProviderWithCanary()` private method
2. Implements random traffic distribution based on `BEDROCK_TRAFFIC_PERCENTAGE`
3. Supports 0-100% traffic routing
4. Logs all routing decisions for monitoring
5. Explicit provider parameter bypasses canary logic

**Key Features:**
- **Environment Variable**: `BEDROCK_TRAFFIC_PERCENTAGE` (default: 0)
- **Random Selection**: `Math.random() * 100 < percentage`
- **Logging**: Detailed logs for debugging and monitoring
- **Validation**: Handles invalid values (negative, >100, non-numeric)

**Example Usage:**
```bash
# 10% traffic to Bedrock
BEDROCK_TRAFFIC_PERCENTAGE=10

# 50% traffic to Bedrock
BEDROCK_TRAFFIC_PERCENTAGE=50

# 100% traffic to Bedrock
BEDROCK_TRAFFIC_PERCENTAGE=100

# Disable canary (use base provider)
BEDROCK_TRAFFIC_PERCENTAGE=0
```

### 12.2: Lambda Environment Variables ✅

**File**: `packages/backend/src/infrastructure/misra-platform-stack.ts`

**Changes:**
Added `BEDROCK_TRAFFIC_PERCENTAGE` to all AI Lambda functions:
- `aibts-ai-analyze`
- `aibts-ai-generate`
- `aibts-ai-batch`

**Configuration:**
```typescript
environment: {
  AI_PROVIDER: process.env.AI_PROVIDER || 'BEDROCK',
  BEDROCK_TRAFFIC_PERCENTAGE: process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0',
  BEDROCK_REGION: process.env.BEDROCK_REGION || 'us-east-1',
  BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  BEDROCK_TIMEOUT: process.env.BEDROCK_TIMEOUT || '30000',
  ENABLE_BEDROCK_MONITORING: process.env.ENABLE_BEDROCK_MONITORING || 'true',
}
```

### 12.3: CloudWatch Dashboard ✅

**File**: `packages/backend/src/infrastructure/misra-platform-stack.ts`

**Dashboard Name**: `AIBTS-Bedrock-Migration`

**Widgets:**
1. **Latency Comparison** (Graph)
   - Bedrock average latency
   - OpenAI average latency
   - 5-minute periods

2. **Error Rate Comparison** (Graph)
   - Bedrock error count
   - OpenAI error count
   - 5-minute periods

3. **Cost Comparison** (Graph)
   - Bedrock 24-hour cost
   - OpenAI 24-hour cost
   - Daily totals

4. **Token Usage** (Graph)
   - Bedrock token consumption
   - OpenAI token consumption
   - 5-minute periods

5. **Request Count** (Graph)
   - Bedrock request count
   - OpenAI request count
   - 5-minute periods

6. **Traffic Distribution** (Single Value)
   - Real-time Bedrock traffic percentage
   - Calculated: `(bedrock / (bedrock + openai)) * 100`

**Access:**
```bash
# Dashboard URL output by CDK
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Bedrock-Migration
```

### 12.4: Comprehensive Testing ✅

**File**: `packages/backend/src/services/ai-test-generation/__tests__/ai-engine-factory.test.ts`

**New Tests:**
1. ✅ Use base provider when `BEDROCK_TRAFFIC_PERCENTAGE=0`
2. ✅ Use base provider when `BEDROCK_TRAFFIC_PERCENTAGE` not set
3. ✅ Always use Bedrock when `BEDROCK_TRAFFIC_PERCENTAGE=100`
4. ✅ Route ~50% traffic when `BEDROCK_TRAFFIC_PERCENTAGE=50`
5. ✅ Route ~10% traffic when `BEDROCK_TRAFFIC_PERCENTAGE=10`
6. ✅ Ignore canary logic when provider explicitly specified
7. ✅ Handle invalid percentage values
8. ✅ Log canary deployment routing decisions

**Test Results:**
```
Test Suites: 1 passed, 1 total
Tests:       24 passed, 24 total
Time:        4.534 s
```

### 12.5: Documentation ✅

**Created Files:**
1. `.kiro/specs/bedrock-migration/TASK_12_CANARY_DEPLOYMENT_GUIDE.md`
   - Deployment steps
   - Monitoring instructions
   - Rollback procedures
   - Troubleshooting guide
   - Success criteria

2. `.kiro/specs/bedrock-migration/TASK_12_COMPLETION.md` (this file)
   - Implementation summary
   - Testing results
   - Next steps

## Deployment Instructions

### Step 1: Build and Deploy

```bash
cd packages/backend
npm run build
cdk deploy
```

### Step 2: Enable 10% Canary

```bash
# Update Lambda environment variables
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    BEDROCK_TRAFFIC_PERCENTAGE=10,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases,
    OPENAI_API_KEY=<your-key>
  }"

# Repeat for aibts-ai-analyze and aibts-ai-batch
```

### Step 3: Monitor for 48 Hours

**CloudWatch Dashboard:**
- Open `AIBTS-Bedrock-Migration` dashboard
- Monitor latency, errors, cost, traffic split

**CloudWatch Logs:**
```bash
aws logs tail /aws/lambda/aibts-ai-generate --follow --filter-pattern "Canary deployment"
```

**CloudWatch Alarms:**
- `AIBTS-Bedrock-HighErrorRate`
- `AIBTS-Bedrock-HighLatency`
- `AIBTS-Bedrock-HighCost`

### Step 4: Compare Metrics

| Metric | Bedrock | OpenAI | Status |
|--------|---------|--------|--------|
| Latency | TBD | TBD | Monitor |
| Error Rate | TBD | TBD | Monitor |
| Cost | TBD | TBD | Should be ~33% lower |
| Quality | TBD | TBD | User feedback |

### Step 5: Rollback (if needed)

```bash
# Set traffic to 0 (all OpenAI)
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=0,...}"
```

## Success Criteria

- [x] Traffic routing logic implemented
- [x] Environment variables added to Lambda functions
- [x] CloudWatch dashboard created
- [x] All tests passing (24/24)
- [x] Documentation complete
- [ ] 10% canary deployed (requires AWS deployment)
- [ ] 48-hour monitoring complete
- [ ] Metrics comparison complete
- [ ] User feedback collected

## Next Steps

### Task 13.1: Increase to 50% Traffic

After successful 48-hour monitoring at 10%:

```bash
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=50,...}"
```

Monitor for another 48 hours.

### Task 13.2: Increase to 100% Traffic

After successful 48-hour monitoring at 50%:

```bash
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=BEDROCK,BEDROCK_TRAFFIC_PERCENTAGE=100,...}"
```

Monitor for another 48 hours.

### Task 14: Full Migration

After successful 100% traffic:
1. Set Bedrock as default provider
2. Update documentation
3. Announce migration complete
4. Optional: Deprecate OpenAI

## Monitoring Commands

```bash
# Real-time traffic distribution
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "Canary deployment"

# Error count (last hour)
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR" | jq '.events | length'

# Average latency (last hour)
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600

# Cost (last 24 hours)
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

## Technical Details

### Traffic Routing Algorithm

```typescript
private static selectProviderWithCanary(provider?: AIProvider): AIProvider {
  // If provider explicitly specified, use it (no canary)
  if (provider) {
    return provider;
  }

  // Get base provider (default: BEDROCK)
  const baseProvider = (process.env.AI_PROVIDER as AIProvider) || 'BEDROCK';

  // Get traffic percentage (default: 0)
  const trafficPercentage = parseInt(process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0', 10);

  // Validate percentage
  if (trafficPercentage <= 0 || trafficPercentage > 100) {
    return baseProvider;
  }

  // 100% = always Bedrock
  if (trafficPercentage >= 100) {
    return 'BEDROCK';
  }

  // Random selection
  const random = Math.random() * 100;
  return random < trafficPercentage ? 'BEDROCK' : baseProvider;
}
```

### CloudWatch Metrics

**Bedrock Metrics:**
- `AIBTS/Bedrock/BedrockLatency` (milliseconds)
- `AIBTS/Bedrock/BedrockErrors` (count)
- `AIBTS/Bedrock/BedrockCost` (dollars)
- `AIBTS/Bedrock/BedrockTokens` (count)
- `AIBTS/Bedrock/BedrockRequests` (count)

**OpenAI Metrics:**
- `AIBTS/OpenAI/OpenAILatency` (milliseconds)
- `AIBTS/OpenAI/OpenAIErrors` (count)
- `AIBTS/OpenAI/OpenAICost` (dollars)
- `AIBTS/OpenAI/OpenAITokens` (count)
- `AIBTS/OpenAI/OpenAIRequests` (count)

## Files Modified

1. `packages/backend/src/services/ai-test-generation/ai-engine-factory.ts`
   - Added `selectProviderWithCanary()` method
   - Updated `create()` to use canary logic

2. `packages/backend/src/infrastructure/misra-platform-stack.ts`
   - Added `BEDROCK_TRAFFIC_PERCENTAGE` to Lambda environment
   - Created CloudWatch dashboard
   - Added dashboard URL output

3. `packages/backend/src/services/ai-test-generation/__tests__/ai-engine-factory.test.ts`
   - Added 7 new canary deployment tests
   - Updated test setup to handle traffic percentage env var

## Files Created

1. `.kiro/specs/bedrock-migration/TASK_12_CANARY_DEPLOYMENT_GUIDE.md`
2. `.kiro/specs/bedrock-migration/TASK_12_COMPLETION.md`

## Verification

### Unit Tests
```bash
cd packages/backend
npm test -- ai-engine-factory.test.ts --run
```

**Result**: ✅ All 24 tests passing

### TypeScript Compilation
```bash
cd packages/backend
npm run build
```

**Result**: ✅ No errors

### CDK Synthesis
```bash
cd packages/backend
cdk synth
```

**Result**: ✅ Stack synthesizes successfully

## Conclusion

Task 12 is **COMPLETE** from a code implementation perspective. The canary deployment infrastructure is ready for AWS deployment and testing.

**Ready for:**
- AWS deployment
- 10% canary rollout
- 48-hour monitoring
- Metrics comparison
- User feedback collection

**Blocked by:**
- AWS deployment (requires `cdk deploy`)
- Production environment access
- OpenAI API key configuration

## References

- [Task 12 Canary Deployment Guide](.kiro/specs/bedrock-migration/TASK_12_CANARY_DEPLOYMENT_GUIDE.md)
- [Bedrock Migration Design](.kiro/specs/bedrock-migration/design.md)
- [Bedrock Migration Tasks](.kiro/specs/bedrock-migration/tasks.md)
- [Bedrock Setup Guide](.kiro/specs/bedrock-migration/BEDROCK_SETUP_GUIDE.md)
