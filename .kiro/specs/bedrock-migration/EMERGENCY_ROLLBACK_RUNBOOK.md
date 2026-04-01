# Emergency Rollback to OpenAI Runbook

## Purpose

This runbook provides step-by-step instructions for emergency rollback from Amazon Bedrock to OpenAI. Use this runbook when immediate fallback is required due to critical issues with Bedrock.

## When to Use

Use this runbook if:
- ✅ Bedrock service outage
- ✅ Critical Bedrock errors (>20 errors in 5 minutes)
- ✅ Severe Bedrock performance degradation (>60s latency)
- ✅ Security incident with Bedrock
- ✅ Data integrity issues
- ✅ Any emergency requiring immediate fallback

## Prerequisites

- AWS CLI installed and configured
- Access to AWS Lambda configuration
- OpenAI API key available (from Secrets Manager or secure storage)
- Lambda function names known

## Rollback Time

**Total Time**: < 2 minutes
**Downtime**: None (seamless switch)

---

## Step 1: Retrieve OpenAI API Key

**If stored in Secrets Manager:**

```bash
# Retrieve OpenAI API key
OPENAI_KEY=$(aws secretsmanager get-secret-value \
  --secret-id aibts/openai-api-key-emergency \
  --query SecretString \
  --output text)

echo "OpenAI key retrieved: ${OPENAI_KEY:0:10}..."
```

**If stored elsewhere:**
- Retrieve from secure password manager
- Retrieve from encrypted file
- Contact team lead for key

**Time**: < 30 seconds

---

## Step 2: Update Lambda Configuration

**Update all AI Lambda functions to use OpenAI:**

```bash
# Function 1: aibts-ai-analyze
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    OPENAI_API_KEY=$OPENAI_KEY,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases
  }"

# Function 2: aibts-ai-generate
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    OPENAI_API_KEY=$OPENAI_KEY,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases
  }"

# Function 3: aibts-ai-batch
aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={
    AI_PROVIDER=OPENAI,
    OPENAI_API_KEY=$OPENAI_KEY,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    ENABLE_BEDROCK_MONITORING=true,
    AI_USAGE_TABLE=AIUsage,
    TEST_CASES_TABLE_NAME=TestCases
  }"

echo "All Lambda functions updated to use OpenAI"
```

**Time**: < 1 minute

---

## Step 3: Verify Rollback

**Verify configuration:**

```bash
# Check AI_PROVIDER is set to OPENAI
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER' \
  --output text

# Expected output: OPENAI
```

**Test function invocation:**

```bash
# Invoke test
aws lambda invoke \
  --function-name aibts-ai-generate \
  --payload '{"scenario": "Test rollback", "context": {}}' \
  response.json

# Check response
cat response.json
```

**Monitor logs:**

```bash
# Watch logs for OpenAI usage
aws logs tail /aws/lambda/aibts-ai-generate --follow --filter-pattern "OpenAI"

# Expected: Logs showing OpenAI API calls
```

**Time**: < 30 seconds

---

## Step 4: Monitor OpenAI Usage

**Check OpenAI metrics:**

```bash
# Monitor OpenAI latency
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/OpenAI \
  --metric-name OpenAILatency \
  --statistics Average \
  --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 900

# Monitor OpenAI errors
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/OpenAI \
  --metric-name OpenAIErrors \
  --statistics Sum \
  --start-time $(date -u -d '15 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 900
```

**Verify system health:**

```bash
# Check error rate (should be low)
# Check latency (should be acceptable)
# Check request success rate (should be >99%)
```

**Time**: Ongoing (first 15 minutes critical)

---

## Step 5: Communicate Rollback

**Notify team immediately:**

```
Subject: URGENT: Rolled back to OpenAI

We have performed an emergency rollback from Bedrock to OpenAI due to [REASON].

Status: OpenAI is now active
Impact: No user-facing impact expected
Next Steps: Investigating Bedrock issue

Timeline:
- [TIME]: Issue detected
- [TIME]: Rollback initiated
- [TIME]: Rollback complete
- [TIME]: OpenAI verified working

Team: Please monitor OpenAI metrics for next hour.
```

**Update status page (if applicable):**

```
We are currently using OpenAI for AI test generation due to a temporary issue with our primary provider. Service is operating normally.
```

**Time**: < 5 minutes

---

## Step 6: Investigate Bedrock Issue

**Collect diagnostic information:**

```bash
# Check Bedrock service status
aws health describe-events \
  --filter eventTypeCategories=issue \
  --query 'events[?service==`BEDROCK`]'

# Review Bedrock error logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "Bedrock" | \
  jq '.events[].message'

# Check CloudWatch alarms
aws cloudwatch describe-alarm-history \
  --alarm-name AIBTS-Bedrock-HighErrorRate \
  --start-date $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --history-item-type StateUpdate
```

**Document incident:**

```markdown
# Incident Report: Bedrock Rollback

**Date**: [Date and Time]
**Severity**: P0 - Critical
**Duration**: [Duration]

## Summary
[Brief description of issue]

## Timeline
- [TIME]: Issue detected
- [TIME]: Rollback initiated
- [TIME]: Rollback complete
- [TIME]: OpenAI verified

## Root Cause
[Analysis of what caused the issue]

## Impact
- Users affected: [Number or percentage]
- Duration: [Minutes]
- Services impacted: [List]

## Resolution
- Immediate: Rolled back to OpenAI
- Long-term: [Plan to fix Bedrock issue]

## Action Items
- [ ] Fix Bedrock issue
- [ ] Test fix in development
- [ ] Resume Bedrock when ready
- [ ] Post-mortem meeting
```

---

## Step 7: Plan Bedrock Restoration

**After fixing Bedrock issue:**

1. **Test fix in development**
   - Deploy fix to dev environment
   - Run comprehensive tests
   - Verify issue resolved

2. **Test in staging**
   - Deploy to staging
   - Run integration tests
   - Monitor for 1 hour

3. **Resume Bedrock in production**
   - Start with 10% traffic (canary)
   - Monitor for 1 hour
   - Gradually increase to 100%
   - Document lessons learned

---

## Rollback Verification Checklist

After completing rollback:

- [ ] All Lambda functions using OpenAI (AI_PROVIDER=OPENAI)
- [ ] OpenAI API key configured correctly
- [ ] Test invocation successful
- [ ] Logs showing OpenAI usage
- [ ] OpenAI metrics being collected
- [ ] Error rate acceptable (<1%)
- [ ] Latency acceptable (<5s average)
- [ ] Team notified
- [ ] Status page updated (if applicable)
- [ ] Incident documented
- [ ] Investigation started

---

## Common Issues During Rollback

### Issue: OpenAI API key not found

**Solution:**
```bash
# Retrieve from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id aibts/openai-api-key-emergency

# Or contact team lead for key
```

### Issue: Lambda update fails

**Solution:**
```bash
# Check Lambda function exists
aws lambda get-function --function-name aibts-ai-generate

# Check IAM permissions
aws iam get-role-policy \
  --role-name aibts-ai-generate-role \
  --policy-name LambdaUpdatePolicy

# Retry update
```

### Issue: OpenAI rate limit

**Solution:**
```bash
# OpenAI has rate limits
# Monitor rate limit errors
# Request rate limit increase if needed
# Consider implementing request queuing
```

### Issue: Configuration not taking effect

**Solution:**
```bash
# Wait 30 seconds for Lambda to pick up new config
# Invoke function to force reload
aws lambda invoke \
  --function-name aibts-ai-generate \
  --payload '{"test": true}' \
  response.json
```

---

## Contact Information

**On-Call Engineer**: [Phone/Slack]
**Team Lead**: [Phone/Slack]
**Platform Team**: [Slack channel]
**AWS Support**: [Support case link]

---

## Post-Rollback Actions

### Immediate (First Hour)
- [ ] Monitor OpenAI metrics continuously
- [ ] Check error logs every 15 minutes
- [ ] Verify user-facing functionality
- [ ] Update stakeholders

### Short-term (First Day)
- [ ] Investigate Bedrock root cause
- [ ] Implement fix
- [ ] Test fix thoroughly
- [ ] Document incident

### Long-term (First Week)
- [ ] Post-mortem meeting
- [ ] Update runbook based on learnings
- [ ] Improve monitoring/alerting
- [ ] Plan Bedrock restoration

---

## Appendix: Quick Reference Commands

**Rollback (one-liner):**
```bash
for func in aibts-ai-analyze aibts-ai-generate aibts-ai-batch; do
  aws lambda update-function-configuration \
    --function-name $func \
    --environment "Variables={AI_PROVIDER=OPENAI,OPENAI_API_KEY=$OPENAI_KEY}"
done
```

**Verify (one-liner):**
```bash
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'
```

**Monitor (one-liner):**
```bash
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

---

**Document Version**: 1.0
**Last Updated**: 2024
**Last Tested**: [Date]
**Next Review**: [Date]
