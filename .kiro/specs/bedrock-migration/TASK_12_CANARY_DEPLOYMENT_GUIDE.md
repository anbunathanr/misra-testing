# Task 12: Canary Deployment Guide

## Overview

This guide covers Phase 2 of the Bedrock migration: Canary deployment with traffic percentage routing. The implementation allows gradual rollout of Bedrock to a percentage of users while monitoring metrics and comparing performance against OpenAI.

## Implementation Summary

### 12.1: Traffic Routing Logic

**Files Modified:**
- `packages/backend/src/services/ai-test-generation/ai-engine-factory.ts`
- `packages/backend/src/infrastructure/misra-platform-stack.ts`

**Key Features:**
1. **Traffic Percentage Routing**: Routes a configurable percentage of requests to Bedrock
2. **Random Selection**: Uses `Math.random()` to distribute traffic
3. **Environment Variable**: `BEDROCK_TRAFFIC_PERCENTAGE` (0-100)
4. **Logging**: Detailed logs for canary routing decisions

**How It Works:**
```typescript
// Example: 10% traffic to Bedrock
BEDROCK_TRAFFIC_PERCENTAGE=10

// Random selection
const random = Math.random() * 100; // 0-100
if (random < 10) {
  // Route to Bedrock (10% of requests)
} else {
  // Route to base provider (90% of requests)
}
```

### 12.2: CloudWatch Dashboard

**Dashboard Name**: `AIBTS-Bedrock-Migration`

**Metrics Tracked:**
1. **Latency Comparison**: Bedrock vs OpenAI average latency
2. **Error Rate Comparison**: Bedrock vs OpenAI error counts
3. **Cost Comparison**: 24-hour cost totals
4. **Token Usage**: Total tokens consumed
5. **Request Count**: Number of requests per provider
6. **Traffic Distribution**: Real-time percentage split

**Access Dashboard:**
```bash
# Dashboard URL is output by CDK deployment
# Format: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Bedrock-Migration
```

## Deployment Steps

### Step 1: Deploy Infrastructure

```bash
# Navigate to backend directory
cd packages/backend

# Build Lambda functions
npm run build

# Deploy CDK stack with canary support
cdk deploy

# Verify deployment
aws lambda get-function-configuration --function-name aibts-ai-generate \
  --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE'
```

### Step 2: Enable 10% Canary Traffic

```bash
# Update Lambda environment variables
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    BEDROCK_TRAFFIC_PERCENTAGE=10,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true
  }"

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
    OPENAI_API_KEY=<your-openai-key>
  }"

aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    BEDROCK_TRAFFIC_PERCENTAGE=10,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases,
    OPENAI_API_KEY=<your-openai-key>
  }"
```

### Step 3: Monitor Metrics (48 hours)

**CloudWatch Dashboard:**
1. Open AWS Console → CloudWatch → Dashboards
2. Select `AIBTS-Bedrock-Migration`
3. Monitor for 48 hours

**Key Metrics to Watch:**

| Metric | Expected Behavior | Action if Threshold Exceeded |
|--------|------------------|------------------------------|
| Bedrock Latency | Similar to OpenAI (±10%) | Investigate if >30s average |
| Bedrock Errors | Similar to OpenAI | Rollback if >10 errors/5min |
| Bedrock Cost | ~33% lower than OpenAI | Verify pricing calculation |
| Traffic Split | ~10% Bedrock, ~90% OpenAI | Check random distribution |

**CloudWatch Logs:**
```bash
# View canary routing decisions
aws logs tail /aws/lambda/aibts-ai-generate --follow --filter-pattern "Canary deployment"

# View Bedrock API calls
aws logs tail /aws/lambda/aibts-ai-generate --follow --filter-pattern "BedrockEngine"

# View errors
aws logs tail /aws/lambda/aibts-ai-generate --follow --filter-pattern "ERROR"
```

**CloudWatch Alarms:**
- `AIBTS-Bedrock-HighErrorRate`: Triggers if >10 errors in 5 minutes
- `AIBTS-Bedrock-HighLatency`: Triggers if average latency >30 seconds
- `AIBTS-Bedrock-HighCost`: Triggers if cost >$100/day

### Step 4: Compare Quality

**Test Generation Quality:**
1. Generate 20 tests with Bedrock (10% traffic = ~20 tests out of 200)
2. Generate 20 tests with OpenAI
3. Compare:
   - Test completeness
   - Selector quality
   - Assertion accuracy
   - Code style

**Metrics to Compare:**
```sql
-- Query DynamoDB ai-usage table
SELECT 
  provider,
  AVG(latency) as avg_latency,
  SUM(cost) as total_cost,
  COUNT(*) as request_count,
  SUM(CASE WHEN error IS NOT NULL THEN 1 ELSE 0 END) as error_count
FROM ai_usage
WHERE timestamp > NOW() - INTERVAL '48 hours'
GROUP BY provider;
```

### Step 5: Collect User Feedback

**Survey Questions:**
1. Have you noticed any changes in test generation quality?
2. Are generated tests working as expected?
3. Have you experienced any errors or issues?
4. Is test generation speed acceptable?

**Feedback Collection:**
- Internal Slack channel
- Email survey
- Support tickets

## Rollback Procedure

If issues arise, rollback immediately:

```bash
# Set traffic percentage to 0 (all traffic to OpenAI)
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=0,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=0,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=0,...}"

# Verify rollback
aws logs tail /aws/lambda/aibts-ai-generate --follow --filter-pattern "OpenAI"
```

**Rollback Time:** < 1 minute (environment variable update)

## Success Criteria

The canary deployment is successful when:

1. ✅ **Traffic Distribution**: 10% Bedrock, 90% OpenAI (±2%)
2. ✅ **Error Rate**: Bedrock errors ≤ OpenAI errors
3. ✅ **Latency**: Bedrock latency ≤ OpenAI latency + 10%
4. ✅ **Cost**: Bedrock cost ~33% lower than OpenAI
5. ✅ **Quality**: No user complaints about test quality
6. ✅ **Stability**: No alarms triggered for 48 hours

## Next Steps

After successful 48-hour monitoring:

1. **Task 13.1**: Increase to 50% traffic
2. **Task 13.2**: Increase to 100% traffic
3. **Task 14**: Full migration and OpenAI deprecation

## Troubleshooting

### Issue: Traffic not splitting correctly

**Symptoms:**
- All traffic going to one provider
- Logs show 0% or 100% split

**Solution:**
```bash
# Check environment variable
aws lambda get-function-configuration --function-name aibts-ai-generate \
  --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE'

# Verify it's a number between 1-99
# If 0 or 100, no canary routing occurs
```

### Issue: High Bedrock error rate

**Symptoms:**
- `AIBTS-Bedrock-HighErrorRate` alarm triggered
- Errors in CloudWatch Logs

**Solution:**
```bash
# Check error types
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --filter-pattern "BedrockEngine.*ERROR"

# Common errors:
# - ThrottlingException: Increase retry delay
# - ValidationException: Check request format
# - ModelTimeoutException: Increase timeout
# - ServiceUnavailableException: AWS service issue
```

### Issue: High Bedrock latency

**Symptoms:**
- `AIBTS-Bedrock-HighLatency` alarm triggered
- Slow test generation

**Solution:**
```bash
# Check latency distribution
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --dimensions Name=Operation,Value=generate \
  --statistics Average,Maximum,Minimum \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 300

# If consistently high:
# - Check AWS region (use us-east-1 for lowest latency)
# - Verify network connectivity
# - Check Bedrock service status
```

### Issue: Cost higher than expected

**Symptoms:**
- `AIBTS-Bedrock-HighCost` alarm triggered
- Cost not 33% lower than OpenAI

**Solution:**
```bash
# Check token usage
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockTokens \
  --statistics Sum \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 86400

# Verify pricing calculation in cost-tracker.ts
# Claude 3.5 Sonnet: $3/1M input, $15/1M output
```

## Testing

Run unit tests to verify canary logic:

```bash
cd packages/backend
npm test -- ai-engine-factory.test.ts --run
```

Expected output:
```
✓ should use base provider when BEDROCK_TRAFFIC_PERCENTAGE is 0
✓ should always use Bedrock when BEDROCK_TRAFFIC_PERCENTAGE is 100
✓ should route approximately 50% traffic to Bedrock when BEDROCK_TRAFFIC_PERCENTAGE is 50
✓ should route approximately 10% traffic to Bedrock when BEDROCK_TRAFFIC_PERCENTAGE is 10
✓ should ignore canary logic when provider is explicitly specified
✓ should handle invalid BEDROCK_TRAFFIC_PERCENTAGE values
✓ should log canary deployment routing decisions
```

## Monitoring Commands

```bash
# Real-time traffic distribution
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "Canary deployment" | \
  grep -oP "(Bedrock|OpenAI)" | \
  sort | uniq -c

# Error rate (last hour)
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR" | \
  jq '.events | length'

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

## References

- [Bedrock Migration Design](.kiro/specs/bedrock-migration/design.md)
- [Bedrock Migration Tasks](.kiro/specs/bedrock-migration/tasks.md)
- [Bedrock Setup Guide](.kiro/specs/bedrock-migration/BEDROCK_SETUP_GUIDE.md)
- [Bedrock Troubleshooting](.kiro/specs/bedrock-migration/BEDROCK_TROUBLESHOOTING_GUIDE.md)
