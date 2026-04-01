# Phase 3: Gradual Rollout Guide

## Overview

This guide covers Phase 3 of the Bedrock migration: Gradual rollout from 10% → 50% → 100% traffic. This phase follows successful completion of Phase 2 (10% canary deployment with 48-hour monitoring).

**Prerequisites:**
- ✅ Phase 2 (10% canary) completed successfully
- ✅ 48-hour monitoring at 10% shows stable metrics
- ✅ No critical issues or user complaints
- ✅ Bedrock error rate ≤ OpenAI baseline
- ✅ Bedrock latency ≤ OpenAI + 10%
- ✅ Cost savings ~33% confirmed

**Timeline:**
- **Task 13.1**: 50% traffic (48-hour monitoring)
- **Task 13.2**: 100% traffic (48-hour monitoring)
- **Total Duration**: ~5 days (1 day deployment + 4 days monitoring)

## Task 13.1: Increase to 50% Traffic

### Step 1: Pre-Deployment Checklist

Before increasing traffic, verify Phase 2 success:

```bash
# Check current traffic distribution (should be ~10%)
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  --filter-pattern "Canary deployment" | \
  jq '.events[].message' | \
  grep -oP "(Bedrock|OpenAI)" | \
  sort | uniq -c

# Expected output:
# ~90 OpenAI
# ~10 Bedrock
```


**Review Phase 2 Metrics:**

| Metric | Target | Status |
|--------|--------|--------|
| Error Rate | ≤ OpenAI baseline | ☐ Check |
| Latency | ≤ OpenAI + 10% | ☐ Check |
| Cost | ~33% lower | ☐ Check |
| User Feedback | No critical issues | ☐ Check |
| Uptime | 99.9%+ | ☐ Check |

```bash
# Review CloudWatch dashboard
# Open: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Bedrock-Migration

# Check error rate (last 48 hours)
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800

# Check average latency (last 48 hours)
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800

# Check total cost (last 48 hours)
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800
```


### Step 2: Deploy 50% Traffic

**Deployment Command:**

```bash
# Update all AI Lambda functions to 50% traffic
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    BEDROCK_TRAFFIC_PERCENTAGE=50,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases,
    OPENAI_API_KEY=<your-openai-key>
  }"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    BEDROCK_TRAFFIC_PERCENTAGE=50,
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
    BEDROCK_TRAFFIC_PERCENTAGE=50,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases,
    OPENAI_API_KEY=<your-openai-key>
  }"
```


**Verify Deployment:**

```bash
# Verify environment variable updated
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE'

# Expected output: "50"

# Watch logs for traffic distribution
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "Canary deployment"

# Expected output (approximately):
# "Canary deployment: routing to Bedrock (random: 45.2 < 50)"
# "Canary deployment: routing to OpenAI (random: 67.8 >= 50)"
# Should see roughly 50/50 split
```

**Deployment Time:** ~30 seconds (environment variable update)

### Step 3: Monitor for 48 Hours

**Monitoring Schedule:**

| Time | Action | Metrics to Check |
|------|--------|------------------|
| Hour 0 | Deploy 50% | Verify deployment |
| Hour 1 | Check logs | Traffic distribution |
| Hour 4 | Review metrics | Error rate, latency |
| Hour 12 | Review metrics | Cost, quality |
| Hour 24 | Review metrics | All metrics |
| Hour 36 | Review metrics | All metrics |
| Hour 48 | Final review | Go/No-go decision |


**Monitoring Commands:**

```bash
# Real-time traffic distribution (run for 5 minutes)
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "Canary deployment" | \
  grep -oP "(Bedrock|OpenAI)" | \
  sort | uniq -c

# Expected output:
# ~50 Bedrock
# ~50 OpenAI

# Error count (last hour)
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR" | \
  jq '.events | length'

# Bedrock vs OpenAI error comparison
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600

aws cloudwatch get-metric-statistics \
  --namespace AIBTS/OpenAI \
  --metric-name OpenAIErrors \
  --statistics Sum \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600

# Average latency comparison
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600

aws cloudwatch get-metric-statistics \
  --namespace AIBTS/OpenAI \
  --metric-name OpenAILatency \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600
```


**CloudWatch Dashboard:**

Open the migration dashboard:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Bedrock-Migration
```

Monitor these widgets:
1. **Latency Comparison**: Bedrock should be similar to OpenAI (±10%)
2. **Error Rate Comparison**: Bedrock should be ≤ OpenAI
3. **Cost Comparison**: Bedrock should be ~33% lower
4. **Traffic Distribution**: Should show ~50% split
5. **Request Count**: Should show equal request volumes

**CloudWatch Alarms:**

Monitor these alarms (should NOT trigger):
- `AIBTS-Bedrock-HighErrorRate`: >10 errors in 5 minutes
- `AIBTS-Bedrock-HighLatency`: >30 seconds average
- `AIBTS-Bedrock-HighCost`: >$100/day

```bash
# Check alarm status
aws cloudwatch describe-alarms \
  --alarm-names AIBTS-Bedrock-HighErrorRate AIBTS-Bedrock-HighLatency AIBTS-Bedrock-HighCost \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table

# Expected output: All alarms in "OK" state
```


### Step 4: Compare Metrics

After 48 hours, compare Bedrock vs OpenAI performance:

**Metrics Comparison Template:**

| Metric | Bedrock | OpenAI | Difference | Status |
|--------|---------|--------|------------|--------|
| Avg Latency | ___ ms | ___ ms | ___% | ☐ |
| P95 Latency | ___ ms | ___ ms | ___% | ☐ |
| Error Count | ___ | ___ | ___% | ☐ |
| Error Rate | ___% | ___% | ___% | ☐ |
| Total Cost | $___ | $___ | ___% | ☐ |
| Request Count | ___ | ___ | ___% | ☐ |
| Avg Tokens | ___ | ___ | ___% | ☐ |

**Success Criteria:**
- ✅ Bedrock latency ≤ OpenAI + 10%
- ✅ Bedrock error rate ≤ OpenAI
- ✅ Bedrock cost ~33% lower
- ✅ No critical user complaints
- ✅ No alarm triggers

**Data Collection Script:**

```bash
# Save this as: collect-50-percent-metrics.sh
#!/bin/bash

echo "=== 50% Traffic Metrics (48 hours) ==="
echo ""

# Bedrock metrics
echo "Bedrock Metrics:"
echo "----------------"
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average,Maximum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0].[Average,Maximum]' \
  --output text | \
  awk '{print "Avg Latency: " $1 " ms\nMax Latency: " $2 " ms"}'

aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0].Sum' \
  --output text | \
  awk '{print "Total Errors: " $1}'

aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0].Sum' \
  --output text | \
  awk '{print "Total Cost: $" $1}'

echo ""
echo "OpenAI Metrics:"
echo "---------------"
# Repeat for OpenAI namespace...
```


### Step 5: Address Issues (if any)

If issues are discovered during 48-hour monitoring:

**Issue Categories:**

1. **High Error Rate**
   - Investigate error types in CloudWatch Logs
   - Check for throttling, validation, or timeout errors
   - Consider adjusting retry logic or timeout values
   - If critical: Rollback to 10% (see Rollback section)

2. **High Latency**
   - Check Bedrock service status
   - Verify region configuration (us-east-1 recommended)
   - Review network connectivity
   - If consistently >30s: Rollback to 10%

3. **High Cost**
   - Verify token usage is as expected
   - Check for unexpected prompt sizes
   - Review cost calculation logic
   - If >50% higher than expected: Investigate before proceeding

4. **Quality Issues**
   - Collect specific examples from users
   - Compare generated tests side-by-side
   - Review prompt engineering
   - If widespread: Rollback and investigate

**Issue Resolution Process:**

```bash
# 1. Identify issue from metrics/logs
# 2. Collect evidence
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  --filter-pattern "ERROR" > errors.json

# 3. Analyze root cause
# 4. Implement fix (if possible)
# 5. Test fix in development
# 6. If fix not possible: Rollback
# 7. Document issue and resolution
```


### Step 6: Go/No-Go Decision

After 48 hours, make a decision to proceed to 100% or rollback:

**Decision Criteria:**

| Criterion | Weight | Pass/Fail |
|-----------|--------|-----------|
| Error rate ≤ OpenAI | Critical | ☐ |
| Latency ≤ OpenAI + 10% | Critical | ☐ |
| No critical alarms | Critical | ☐ |
| Cost ~33% lower | Important | ☐ |
| No critical user issues | Critical | ☐ |
| Traffic split ~50% | Important | ☐ |

**Decision Matrix:**

- **GO (Proceed to 100%)**: All critical criteria pass, important criteria mostly pass
- **HOLD (Continue 50% monitoring)**: Some important criteria fail, investigate further
- **NO-GO (Rollback to 10%)**: Any critical criterion fails

**Documentation:**

Document the decision in a status report:

```markdown
# 50% Traffic Rollout - Status Report

**Date**: [Date]
**Duration**: 48 hours
**Decision**: [GO / HOLD / NO-GO]

## Metrics Summary
- Bedrock Latency: [X] ms (OpenAI: [Y] ms)
- Bedrock Errors: [X] (OpenAI: [Y])
- Bedrock Cost: $[X] (OpenAI: $[Y])
- Traffic Split: [X]% Bedrock, [Y]% OpenAI

## Issues Encountered
- [List any issues]

## Resolution Actions
- [List actions taken]

## Decision Rationale
- [Explain decision]

## Next Steps
- [If GO: Proceed to 100%]
- [If HOLD: Continue monitoring, set review date]
- [If NO-GO: Rollback procedure]
```


## Task 13.2: Increase to 100% Traffic

### Prerequisites

- ✅ Task 13.1 (50% traffic) completed successfully
- ✅ 48-hour monitoring at 50% shows stable metrics
- ✅ Go/No-Go decision: GO
- ✅ All critical criteria met
- ✅ Team approval to proceed

### Step 1: Pre-Deployment Checklist

```bash
# Verify current state (should be 50%)
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE'

# Expected output: "50"

# Review 50% metrics one final time
# Open CloudWatch dashboard
# Verify all metrics are stable
```

**Final Review Checklist:**

- ☐ 50% traffic stable for 48+ hours
- ☐ No critical alarms triggered
- ☐ Error rate acceptable
- ☐ Latency acceptable
- ☐ Cost savings confirmed
- ☐ User feedback positive
- ☐ Team ready for 100% rollout
- ☐ Rollback plan reviewed and ready


### Step 2: Deploy 100% Traffic

**Deployment Command:**

```bash
# Update all AI Lambda functions to 100% Bedrock traffic
# Note: AI_PROVIDER=BEDROCK and BEDROCK_TRAFFIC_PERCENTAGE=100
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={
    AI_PROVIDER=BEDROCK,
    BEDROCK_TRAFFIC_PERCENTAGE=100,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases,
    OPENAI_API_KEY=<your-openai-key>
  }"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={
    AI_PROVIDER=BEDROCK,
    BEDROCK_TRAFFIC_PERCENTAGE=100,
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
    AI_PROVIDER=BEDROCK,
    BEDROCK_TRAFFIC_PERCENTAGE=100,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases,
    OPENAI_API_KEY=<your-openai-key>
  }"
```

**Important Notes:**
- `AI_PROVIDER=BEDROCK`: Sets Bedrock as the base provider
- `BEDROCK_TRAFFIC_PERCENTAGE=100`: Ensures 100% traffic to Bedrock
- `OPENAI_API_KEY` is kept for emergency fallback


**Verify Deployment:**

```bash
# Verify environment variables updated
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.[AI_PROVIDER,BEDROCK_TRAFFIC_PERCENTAGE]' \
  --output table

# Expected output:
# AI_PROVIDER: BEDROCK
# BEDROCK_TRAFFIC_PERCENTAGE: 100

# Watch logs for 100% Bedrock traffic
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "Canary deployment"

# Expected output: All requests routing to Bedrock
# "Canary deployment: routing to Bedrock (random: 45.2 < 100)"
# "Canary deployment: routing to Bedrock (random: 87.3 < 100)"

# Verify no OpenAI calls
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "OpenAI"

# Expected output: No OpenAI logs (unless fallback triggered)
```

**Deployment Time:** ~30 seconds


### Step 3: Monitor for 48 Hours

**Intensive Monitoring Schedule:**

| Time | Action | Focus |
|------|--------|-------|
| Hour 0 | Deploy 100% | Immediate verification |
| Hour 0-1 | Watch logs continuously | Error detection |
| Hour 1 | Check metrics | Error rate, latency |
| Hour 2 | Check metrics | Stability check |
| Hour 4 | Review metrics | Cost, quality |
| Hour 8 | Review metrics | All metrics |
| Hour 12 | Review metrics | All metrics |
| Hour 24 | Comprehensive review | All metrics |
| Hour 36 | Review metrics | All metrics |
| Hour 48 | Final review | Migration success |

**Critical Monitoring (First 4 Hours):**

```bash
# Continuous log monitoring (run in separate terminal)
aws logs tail /aws/lambda/aibts-ai-generate --follow

# Check error rate every 15 minutes
watch -n 900 'aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d "15 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 900'

# Check latency every 15 minutes
watch -n 900 'aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average,Maximum \
  --start-time $(date -u -d "15 minutes ago" +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 900'
```


**CloudWatch Dashboard Monitoring:**

Open dashboard and monitor continuously for first 4 hours:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Bedrock-Migration
```

**Key Metrics to Watch:**

1. **Error Rate**: Should remain ≤ baseline
   - If >10 errors in 5 minutes: Investigate immediately
   - If >20 errors in 5 minutes: Consider rollback

2. **Latency**: Should remain ≤ baseline + 10%
   - If >30s average: Investigate
   - If >60s average: Consider rollback

3. **Cost**: Should be ~33% lower than OpenAI baseline
   - Track hourly cost
   - Compare to historical OpenAI costs

4. **Request Success Rate**: Should be ≥99%
   - Calculate: (total requests - errors) / total requests
   - If <95%: Investigate immediately

**Alarm Monitoring:**

```bash
# Check alarm status every hour
aws cloudwatch describe-alarms \
  --alarm-names AIBTS-Bedrock-HighErrorRate AIBTS-Bedrock-HighLatency AIBTS-Bedrock-HighCost \
  --query 'MetricAlarms[*].[AlarmName,StateValue,StateReason]' \
  --output table

# If any alarm in ALARM state:
# 1. Investigate immediately
# 2. Review logs for root cause
# 3. Consider rollback if critical
```


### Step 4: Verify OpenAI Fallback

Even at 100% Bedrock, OpenAI should remain available as emergency fallback:

**Test Fallback Mechanism:**

```bash
# Temporarily set AI_PROVIDER=OPENAI to test fallback
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,...}"

# Generate a test
# Verify it uses OpenAI

# Restore to Bedrock
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=BEDROCK,...}"
```

**Fallback Scenarios:**

1. **Bedrock Service Outage**: Manually switch to OpenAI
2. **High Error Rate**: Automatically fallback (if circuit breaker implemented)
3. **Cost Spike**: Manually switch to OpenAI temporarily
4. **Quality Issues**: Manually switch to OpenAI for investigation

**Fallback Readiness:**
- ☐ OpenAI API key still configured
- ☐ OpenAI code still deployed
- ☐ Fallback procedure documented
- ☐ Team trained on fallback process
- ☐ Fallback tested and verified


### Step 5: Collect Final Metrics

After 48 hours at 100%, collect comprehensive metrics:

**Final Metrics Report:**

```bash
# Save as: collect-100-percent-metrics.sh
#!/bin/bash

echo "=== 100% Bedrock Traffic - Final Metrics (48 hours) ==="
echo ""

# Bedrock metrics
echo "Bedrock Performance:"
echo "--------------------"

# Latency
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average,Maximum,Minimum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0]' \
  --output json

# Errors
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0].Sum' \
  --output text

# Cost
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0].Sum' \
  --output text

# Requests
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockRequests \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0].Sum' \
  --output text

# Tokens
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockTokens \
  --statistics Sum \
  --start-time $(date -u -d '48 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 172800 \
  --query 'Datapoints[0].Sum' \
  --output text

echo ""
echo "Historical OpenAI Baseline (for comparison):"
echo "---------------------------------------------"
# Query historical OpenAI metrics from before migration
```


**Comparison Metrics Template:**

| Metric | Bedrock (100%) | OpenAI Baseline | Difference | Target | Status |
|--------|----------------|-----------------|------------|--------|--------|
| Avg Latency | ___ ms | ___ ms | ___% | ≤ +10% | ☐ |
| P95 Latency | ___ ms | ___ ms | ___% | ≤ +10% | ☐ |
| P99 Latency | ___ ms | ___ ms | ___% | ≤ +20% | ☐ |
| Error Count | ___ | ___ | ___% | ≤ 0% | ☐ |
| Error Rate | ___% | ___% | ___% | ≤ 0% | ☐ |
| Total Cost | $___ | $___ | ___% | -33% | ☐ |
| Cost per Request | $___ | $___ | ___% | -33% | ☐ |
| Request Count | ___ | ___ | ___% | Similar | ☐ |
| Success Rate | ___% | ___% | ___% | ≥99% | ☐ |
| Avg Tokens | ___ | ___ | ___% | Similar | ☐ |

### Step 6: User Feedback Collection

**Survey Questions:**

1. **Quality**: Have you noticed any changes in test generation quality since the migration?
   - [ ] Better
   - [ ] Same
   - [ ] Worse
   - [ ] Not sure

2. **Performance**: Is test generation speed acceptable?
   - [ ] Faster than before
   - [ ] Same as before
   - [ ] Slower than before
   - [ ] Not sure

3. **Issues**: Have you experienced any errors or issues?
   - [ ] No issues
   - [ ] Minor issues (please describe)
   - [ ] Major issues (please describe)

4. **Overall**: Overall satisfaction with AI test generation?
   - [ ] Very satisfied
   - [ ] Satisfied
   - [ ] Neutral
   - [ ] Dissatisfied
   - [ ] Very dissatisfied

**Feedback Collection Methods:**
- Internal Slack channel
- Email survey
- Support ticket analysis
- Direct user interviews


### Step 7: Migration Success Validation

After 48 hours at 100%, validate migration success:

**Success Criteria Checklist:**

| Criterion | Target | Actual | Status |
|-----------|--------|--------|--------|
| Error rate | ≤ OpenAI baseline | ___ | ☐ |
| Latency | ≤ OpenAI + 10% | ___ | ☐ |
| Cost savings | ~33% | ___% | ☐ |
| Success rate | ≥99% | ___% | ☐ |
| No critical alarms | 0 alarms | ___ | ☐ |
| User satisfaction | ≥80% satisfied | ___% | ☐ |
| Uptime | ≥99.9% | ___% | ☐ |
| Fallback tested | Yes | ___ | ☐ |

**Migration Status:**

- **SUCCESS**: All critical criteria met, proceed to Phase 4
- **PARTIAL SUCCESS**: Most criteria met, continue monitoring
- **FAILURE**: Critical criteria not met, rollback required

**Documentation:**

Create final Phase 3 report:

```markdown
# Phase 3: Gradual Rollout - Completion Report

**Date**: [Date]
**Duration**: [X] days
**Status**: [SUCCESS / PARTIAL SUCCESS / FAILURE]

## Executive Summary
[Brief summary of Phase 3 results]

## Metrics Summary

### 50% Traffic (48 hours)
- Latency: [X] ms (vs OpenAI: [Y] ms)
- Errors: [X] (vs OpenAI: [Y])
- Cost: $[X] (vs OpenAI: $[Y])
- Status: [GO / NO-GO]

### 100% Traffic (48 hours)
- Latency: [X] ms (vs OpenAI: [Y] ms)
- Errors: [X] (vs OpenAI: [Y])
- Cost: $[X] (vs OpenAI: $[Y])
- Status: [SUCCESS / FAILURE]

## Issues Encountered
1. [Issue 1]
   - Impact: [High/Medium/Low]
   - Resolution: [Description]
   - Status: [Resolved/Ongoing]

## User Feedback
- Total responses: [X]
- Satisfaction rate: [X]%
- Key feedback: [Summary]

## Lessons Learned
1. [Lesson 1]
2. [Lesson 2]

## Next Steps
- [ ] Proceed to Phase 4 (Full Migration)
- [ ] Update documentation
- [ ] Announce migration success
- [ ] Plan OpenAI deprecation
```


## Rollback Procedures

### Rollback from 50% to 10%

**When to Rollback:**
- Critical error rate increase (>2x baseline)
- Critical latency increase (>50% baseline)
- Multiple alarm triggers
- Critical user complaints
- Service instability

**Rollback Command:**

```bash
# Rollback to 10% traffic
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=10,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=10,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={BEDROCK_TRAFFIC_PERCENTAGE=10,...}"

# Verify rollback
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "Canary deployment"

# Expected: ~10% Bedrock, ~90% OpenAI
```

**Rollback Time:** <1 minute


### Rollback from 100% to 50%

**When to Rollback:**
- Moderate error rate increase
- Moderate latency increase
- Cost concerns
- User feedback concerns
- Need more monitoring time

**Rollback Command:**

```bash
# Rollback to 50% traffic
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=50,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=50,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=50,...}"

# Verify rollback
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.[AI_PROVIDER,BEDROCK_TRAFFIC_PERCENTAGE]'

# Expected: AI_PROVIDER=OPENAI, BEDROCK_TRAFFIC_PERCENTAGE=50
```

**Rollback Time:** <1 minute


### Emergency Rollback to 0% (All OpenAI)

**When to Use:**
- Critical Bedrock service outage
- Critical security issue
- Data loss or corruption
- Complete system failure
- Emergency situation

**Emergency Rollback Command:**

```bash
# EMERGENCY: Rollback to 0% Bedrock (100% OpenAI)
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=0,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=0,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=0,...}"

# Verify emergency rollback
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "OpenAI"

# Expected: All requests using OpenAI
```

**Rollback Time:** <1 minute

**Post-Rollback Actions:**
1. Verify all services operational with OpenAI
2. Investigate root cause of emergency
3. Document incident
4. Plan remediation
5. Test fix in development
6. Resume migration when ready


## Troubleshooting

### Issue: Traffic not splitting correctly at 50%

**Symptoms:**
- Logs show >60% or <40% Bedrock traffic
- Inconsistent traffic distribution

**Diagnosis:**
```bash
# Check traffic distribution over 1000 requests
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "Canary deployment" | \
  jq '.events[].message' | \
  grep -oP "(Bedrock|OpenAI)" | \
  sort | uniq -c
```

**Solution:**
- Random distribution may vary in small samples
- Check over larger sample size (1000+ requests)
- If consistently off: Verify BEDROCK_TRAFFIC_PERCENTAGE=50
- If still off: Check for caching issues

### Issue: High error rate at 100%

**Symptoms:**
- Error rate >2x baseline
- AIBTS-Bedrock-HighErrorRate alarm triggered

**Diagnosis:**
```bash
# Analyze error types
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR" | \
  jq '.events[].message' | \
  grep -oP "Error: \w+" | \
  sort | uniq -c
```

**Common Errors:**
- **ThrottlingException**: Bedrock rate limit hit
  - Solution: Implement better retry logic, request quota increase
- **ValidationException**: Invalid request format
  - Solution: Review request format, check prompt size
- **ModelTimeoutException**: Requests timing out
  - Solution: Increase timeout, optimize prompts
- **ServiceUnavailableException**: Bedrock service issue
  - Solution: Check AWS status, consider temporary rollback


### Issue: High latency at 100%

**Symptoms:**
- Average latency >30s
- AIBTS-Bedrock-HighLatency alarm triggered

**Diagnosis:**
```bash
# Check latency distribution
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average,Maximum,Minimum \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600
```

**Solutions:**
1. **Check Bedrock service status**: https://status.aws.amazon.com/
2. **Verify region**: Use us-east-1 for lowest latency
3. **Review prompt sizes**: Large prompts = higher latency
4. **Check network**: Verify Lambda VPC configuration
5. **Optimize prompts**: Reduce unnecessary context

### Issue: Cost higher than expected

**Symptoms:**
- Cost not 33% lower than OpenAI
- AIBTS-Bedrock-HighCost alarm triggered

**Diagnosis:**
```bash
# Compare token usage
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockTokens \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400

# Check cost calculation
aws dynamodb query \
  --table-name AIUsage \
  --key-condition-expression "provider = :provider" \
  --expression-attribute-values '{":provider":{"S":"BEDROCK"}}' \
  --limit 10
```

**Common Causes:**
- Incorrect pricing calculation
- Higher token usage than expected
- More output tokens (15x more expensive than input)
- Inefficient prompts

**Solutions:**
- Verify pricing: $3/1M input, $15/1M output
- Optimize prompts to reduce output tokens
- Review cost calculation in cost-tracker.ts


### Issue: Quality degradation

**Symptoms:**
- User complaints about test quality
- Generated tests not working
- Selectors not finding elements

**Diagnosis:**
1. Compare generated tests side-by-side (Bedrock vs OpenAI)
2. Review specific failing examples
3. Check prompt engineering
4. Verify model configuration

**Investigation Steps:**
```bash
# Generate test with Bedrock
# Save output

# Temporarily switch to OpenAI
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,...}"

# Generate same test with OpenAI
# Compare outputs

# Restore to Bedrock
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=BEDROCK,...}"
```

**Solutions:**
- Adjust temperature settings
- Improve prompt engineering
- Add more context to prompts
- Review Claude-specific best practices
- Consider model fine-tuning


## Success Criteria Summary

### Task 13.1 Success Criteria (50% Traffic)

- ✅ Traffic distribution: 50% ± 5%
- ✅ Error rate: ≤ OpenAI baseline
- ✅ Latency: ≤ OpenAI + 10%
- ✅ Cost: ~33% lower than OpenAI
- ✅ No critical alarms for 48 hours
- ✅ User feedback: No critical issues
- ✅ Uptime: ≥99.9%

### Task 13.2 Success Criteria (100% Traffic)

- ✅ Traffic distribution: 100% Bedrock
- ✅ Error rate: ≤ OpenAI baseline
- ✅ Latency: ≤ OpenAI + 10%
- ✅ Cost: ~33% lower than OpenAI
- ✅ No critical alarms for 48 hours
- ✅ User feedback: ≥80% satisfied
- ✅ Uptime: ≥99.9%
- ✅ Fallback tested and working

### Phase 3 Overall Success

Phase 3 is considered successful when:

1. ✅ Both 50% and 100% rollouts completed
2. ✅ All success criteria met
3. ✅ No critical issues encountered
4. ✅ User satisfaction maintained
5. ✅ Cost savings confirmed (~33%)
6. ✅ Performance maintained or improved
7. ✅ Fallback mechanism verified
8. ✅ Documentation complete


## Next Steps After Phase 3

Once Phase 3 is successfully completed:

### Immediate Actions (Day 1)

1. **Document Results**
   - Create Phase 3 completion report
   - Update migration status document
   - Share results with stakeholders

2. **Announce Success**
   - Internal announcement
   - Update documentation
   - Celebrate milestone

3. **Continue Monitoring**
   - Keep 100% traffic for 1 week
   - Monitor for any delayed issues
   - Collect ongoing user feedback

### Short-term Actions (Week 1-2)

4. **Proceed to Phase 4**
   - Task 14.1: Set Bedrock as default
   - Task 14.2: Monitor for stability
   - Task 14.3: Plan OpenAI deprecation

5. **Update Documentation**
   - Update setup guides
   - Update troubleshooting guides
   - Document lessons learned

6. **Team Training**
   - Train team on Bedrock operations
   - Document operational procedures
   - Update runbooks

### Long-term Actions (Month 1+)

7. **Optimize Performance**
   - Fine-tune prompts
   - Optimize token usage
   - Reduce costs further

8. **Consider OpenAI Deprecation**
   - Evaluate if OpenAI still needed
   - Plan removal timeline
   - Keep as emergency fallback

9. **Continuous Improvement**
   - Monitor cost trends
   - Track quality metrics
   - Gather user feedback


## Quick Reference

### Deployment Commands

```bash
# 50% Traffic
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=50,...}"

# 100% Traffic
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=BEDROCK,BEDROCK_TRAFFIC_PERCENTAGE=100,...}"

# Rollback to 10%
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=10,...}"

# Emergency Rollback (0%)
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=0,...}"
```

### Monitoring Commands

```bash
# Traffic distribution
aws logs tail /aws/lambda/aibts-ai-generate --follow \
  --filter-pattern "Canary deployment"

# Error count
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600

# Average latency
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600

# Alarm status
aws cloudwatch describe-alarms \
  --alarm-names AIBTS-Bedrock-HighErrorRate AIBTS-Bedrock-HighLatency \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

### Dashboard URL

```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Bedrock-Migration
```

## References

- [Bedrock Migration Design](./design.md)
- [Bedrock Migration Tasks](./tasks.md)
- [Task 12: Canary Deployment Guide](./TASK_12_CANARY_DEPLOYMENT_GUIDE.md)
- [Bedrock Setup Guide](./BEDROCK_SETUP_GUIDE.md)
- [Bedrock Troubleshooting Guide](./BEDROCK_TROUBLESHOOTING_GUIDE.md)

