# Phase 4: Full Migration Guide

## Overview

This guide covers Phase 4 of the Bedrock migration: Full migration with Bedrock as the default provider. This is the final phase where Bedrock becomes the primary AI provider, with OpenAI maintained as an emergency fallback.

**Prerequisites:**
- ✅ Phase 3 (100% traffic) completed successfully
- ✅ 48-hour monitoring at 100% shows stable metrics
- ✅ No critical issues or user complaints
- ✅ Bedrock error rate ≤ OpenAI baseline
- ✅ Bedrock latency ≤ OpenAI + 10%
- ✅ Cost savings ~33% confirmed
- ✅ User satisfaction maintained

**Timeline:**
- **Task 14.1**: Set Bedrock as default (1 day)
- **Task 14.2**: Monitor for stability (1 week)
- **Task 14.3**: Deprecate OpenAI (optional, ongoing)
- **Total Duration**: ~8 days (1 day deployment + 7 days monitoring)

## Task 14.1: Set Bedrock as Default

### Overview

This task makes Bedrock the official default AI provider by updating documentation, configuration defaults, and announcing the migration completion.

### Step 1: Update Default Configuration

**Update CDK Stack Defaults:**

```typescript
// packages/backend/src/infrastructure/misra-platform-stack.ts

const aiEnvironment = {
  // Change default from OPENAI to BEDROCK
  AI_PROVIDER: process.env.AI_PROVIDER || 'BEDROCK',
  BEDROCK_REGION: process.env.BEDROCK_REGION || 'us-east-1',
  BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  BEDROCK_TIMEOUT: process.env.BEDROCK_TIMEOUT || '30000',
  ENABLE_BEDROCK_MONITORING: 'true',
  
  // Keep OpenAI for fallback
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
```

**Update Environment Variable Documentation:**

```bash
# .env.example

# AI Provider Configuration
# Default: BEDROCK (recommended)
# Options: BEDROCK, OPENAI, HUGGINGFACE
AI_PROVIDER=BEDROCK

# Bedrock Configuration (Primary Provider)
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_TIMEOUT=30000
ENABLE_BEDROCK_MONITORING=true

# OpenAI Configuration (Emergency Fallback Only)
# Keep configured for emergency rollback scenarios
OPENAI_API_KEY=sk-...
```

### Step 2: Update Documentation

**Update README.md:**

```markdown
# AI Test Generation System

## AI Provider

This system uses **Amazon Bedrock with Claude 3.5 Sonnet** as the primary AI provider for test generation, selector generation, and application analysis.

### Why Bedrock?

- **AWS Native**: Seamless integration with AWS ecosystem
- **Cost Effective**: ~33% lower costs compared to OpenAI
- **High Quality**: Claude 3.5 Sonnet provides excellent test generation
- **Reliable**: Built-in retry logic and circuit breaker
- **Secure**: IAM role-based authentication, no API keys

### Fallback Provider

OpenAI GPT-4 is maintained as an emergency fallback provider. To switch to OpenAI:

```bash
# Set environment variable
export AI_PROVIDER=OPENAI

# Or update Lambda configuration
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,...}"
```

### Configuration

See [Bedrock Setup Guide](.kiro/specs/bedrock-migration/BEDROCK_SETUP_GUIDE.md) for detailed configuration instructions.
```

**Update Architecture Documentation:**

Update any architecture diagrams or documentation to reflect Bedrock as the primary provider.

### Step 3: Deploy Configuration Changes

**Deployment Command:**

```bash
# Deploy updated CDK stack with Bedrock as default
cd packages/backend
npm run build
cdk deploy --all

# Verify deployment
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'

# Expected output: "BEDROCK"
```

**Deployment Time:** ~5 minutes

### Step 4: Announce Migration Complete

**Internal Announcement Template:**

```markdown
# 🎉 Bedrock Migration Complete!

We're excited to announce that our AI test generation system has successfully migrated to **Amazon Bedrock with Claude 3.5 Sonnet**!

## What Changed?

- **AI Provider**: Now using Claude 3.5 Sonnet via Amazon Bedrock
- **Cost Savings**: Achieved ~33% reduction in AI costs
- **Performance**: Maintained or improved test generation quality
- **Reliability**: Enhanced with circuit breaker and retry logic

## What Stayed the Same?

- **API Endpoints**: No changes to API endpoints
- **Request/Response Format**: Same format as before
- **Test Quality**: Same or better quality tests
- **User Experience**: No changes to UI or workflows

## Emergency Rollback

In the unlikely event of issues, we can rollback to OpenAI within 5 minutes. OpenAI is maintained as an emergency fallback.

## Questions?

Contact the platform team or see our [Bedrock Setup Guide](.kiro/specs/bedrock-migration/BEDROCK_SETUP_GUIDE.md).

---

**Migration Timeline**: 4 weeks
**Phases Completed**: 4/4
**Tests Passing**: 111/111
**Cost Savings**: ~33%
**Status**: ✅ COMPLETE
```

**External Announcement Template (if applicable):**

```markdown
# Platform Update: Enhanced AI Test Generation

We've upgraded our AI test generation system to use Amazon Bedrock with Claude 3.5 Sonnet, bringing you:

✅ **Better Performance**: Faster and more reliable test generation
✅ **Cost Efficiency**: Lower operational costs
✅ **AWS Integration**: Seamless integration with AWS services
✅ **Same Great Quality**: Maintained or improved test quality

No action required on your part - the upgrade is transparent and backward compatible.
```

### Step 5: Update Monitoring Dashboards

**Update CloudWatch Dashboard Title:**

```bash
# Update dashboard to reflect Bedrock as primary
aws cloudwatch put-dashboard \
  --dashboard-name AIBTS-AI-Monitoring \
  --dashboard-body file://dashboard-config.json
```

**Dashboard Configuration (dashboard-config.json):**

```json
{
  "widgets": [
    {
      "type": "text",
      "properties": {
        "markdown": "# AI Test Generation Monitoring\n\n**Primary Provider**: Amazon Bedrock (Claude 3.5 Sonnet)\n**Fallback Provider**: OpenAI GPT-4\n**Migration Status**: ✅ Complete"
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Bedrock Latency (Primary)",
        "metrics": [
          ["AIBTS/Bedrock", "BedrockLatency", {"stat": "Average"}]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Bedrock Error Rate (Primary)",
        "metrics": [
          ["AIBTS/Bedrock", "BedrockErrors", {"stat": "Sum"}]
        ]
      }
    },
    {
      "type": "metric",
      "properties": {
        "title": "Bedrock Cost (Primary)",
        "metrics": [
          ["AIBTS/Bedrock", "BedrockCost", {"stat": "Sum"}]
        ]
      }
    }
  ]
}
```

### Step 6: Verification Checklist

After completing Task 14.1, verify:

- [ ] CDK stack updated with BEDROCK as default
- [ ] Environment variables documentation updated
- [ ] README.md updated with Bedrock as primary
- [ ] Architecture documentation updated
- [ ] Configuration deployed successfully
- [ ] Internal announcement sent
- [ ] External announcement sent (if applicable)
- [ ] CloudWatch dashboard updated
- [ ] Team trained on new default configuration
- [ ] Rollback procedure documented and accessible

**Completion Time:** ~1 day

---

## Task 14.2: Monitor for Stability

### Overview

This task involves monitoring the system for 1 week (7 days) to ensure long-term stability with Bedrock as the default provider.

### Monitoring Schedule

| Day | Focus | Actions |
|-----|-------|---------|
| Day 1 | Initial stability | Intensive monitoring, check all metrics |
| Day 2 | Error patterns | Analyze any errors, verify retry logic |
| Day 3 | Cost tracking | Verify cost savings, check for anomalies |
| Day 4 | Performance | Analyze latency trends, check for degradation |
| Day 5 | User feedback | Collect and analyze user feedback |
| Day 6 | Long-term trends | Review week-long trends |
| Day 7 | Final validation | Comprehensive review, prepare report |

### Daily Monitoring Procedures

**Daily Checklist:**

```bash
# Run daily monitoring script
.\monitor-phase4-daily.ps1 -Day [1-7]

# Check CloudWatch dashboard
# Open: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-AI-Monitoring

# Review alarm status
aws cloudwatch describe-alarms \
  --alarm-names AIBTS-Bedrock-HighErrorRate AIBTS-Bedrock-HighLatency AIBTS-Bedrock-HighCost \
  --query 'MetricAlarms[*].[AlarmName,StateValue,StateReason]' \
  --output table

# Check error logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  --filter-pattern "ERROR" | \
  jq '.events | length'

# Review cost trends
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

### Key Metrics to Track

**1. Error Rate**

Target: ≤ OpenAI baseline (from Phase 3)

```bash
# Daily error count
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400

# Weekly error trend
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

**2. Latency**

Target: ≤ OpenAI baseline + 10%

```bash
# Daily average latency
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average,Maximum,Minimum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400

# P95 latency
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --extended-statistics p95 \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

**3. Cost Savings**

Target: ~33% lower than OpenAI baseline

```bash
# Daily cost
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400

# Weekly cost
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 604800

# Cost per request
# Total cost / Total requests
```

**4. Request Volume**

Track to ensure consistent usage patterns

```bash
# Daily request count
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockRequests \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

**5. Success Rate**

Target: ≥99%

```bash
# Calculate success rate
# Success Rate = (Total Requests - Errors) / Total Requests * 100
```

### Weekly Metrics Report Template

```markdown
# Week 1 Stability Monitoring Report

**Monitoring Period**: [Start Date] - [End Date]
**Status**: [STABLE / ISSUES DETECTED / UNSTABLE]

## Metrics Summary

| Metric | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 | Day 6 | Day 7 | Average | Target | Status |
|--------|-------|-------|-------|-------|-------|-------|-------|---------|--------|--------|
| Avg Latency (ms) | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ≤ baseline+10% | ☐ |
| P95 Latency (ms) | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ≤ baseline+20% | ☐ |
| Error Count | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ≤ baseline | ☐ |
| Error Rate (%) | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ≤ baseline | ☐ |
| Daily Cost ($) | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ___ | -33% | ☐ |
| Request Count | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ___ | Similar | ☐ |
| Success Rate (%) | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ___ | ≥99% | ☐ |

## Trends Analysis

### Latency Trends
- [Describe latency trends over the week]
- [Note any spikes or anomalies]
- [Compare to baseline]

### Error Patterns
- [Describe error patterns]
- [List error types and frequencies]
- [Note any recurring issues]

### Cost Analysis
- **Total Weekly Cost**: $___
- **Projected Monthly Cost**: $___
- **Savings vs OpenAI**: ___% ($___/month)
- **Cost per Request**: $___

### Request Volume
- **Total Requests**: ___
- **Average Daily Requests**: ___
- **Peak Day**: Day ___ (___requests)
- **Low Day**: Day ___ (___ requests)

## Alarms Triggered

| Date | Alarm | Duration | Resolution |
|------|-------|----------|------------|
| ___ | ___ | ___ | ___ |

## Issues Encountered

1. **Issue**: [Description]
   - **Impact**: [High/Medium/Low]
   - **Root Cause**: [Analysis]
   - **Resolution**: [Actions taken]
   - **Status**: [Resolved/Ongoing]

## User Feedback

- **Total Feedback**: ___ responses
- **Satisfaction Rate**: ___%
- **Key Themes**:
  - [Theme 1]
  - [Theme 2]
- **Action Items**: [List any actions needed]

## Stability Assessment

- [ ] Error rate within acceptable range
- [ ] Latency within acceptable range
- [ ] Cost savings achieved
- [ ] No critical alarms
- [ ] User satisfaction maintained
- [ ] No major incidents
- [ ] System performing as expected

**Overall Status**: [STABLE / NEEDS ATTENTION / UNSTABLE]

## Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Next Steps

- [ ] Continue monitoring for Week 2 (if needed)
- [ ] Proceed to Task 14.3 (OpenAI deprecation)
- [ ] Document lessons learned
- [ ] Update operational procedures
```

### Incident Response During Monitoring

**If Issues Arise:**

1. **Minor Issues** (Error rate slightly elevated, latency slightly higher)
   - Continue monitoring
   - Investigate root cause
   - Document findings
   - Implement fixes if needed
   - No rollback required

2. **Moderate Issues** (Error rate 2x baseline, latency >20% higher)
   - Investigate immediately
   - Consider temporary rollback to OpenAI
   - Fix root cause
   - Resume Bedrock after fix
   - Document incident

3. **Critical Issues** (Service outage, data loss, security breach)
   - **Immediate rollback to OpenAI**
   - Investigate root cause
   - Implement comprehensive fix
   - Test thoroughly before resuming Bedrock
   - Document incident and lessons learned

**Rollback Command (Emergency):**

```bash
# Emergency rollback to OpenAI
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={AI_PROVIDER=OPENAI,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={AI_PROVIDER=OPENAI,...}"

# Verify rollback
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'

# Expected: "OPENAI"
```

**Rollback Time:** <1 minute

### Success Criteria - Task 14.2

After 1 week of monitoring, validate:

- [ ] Error rate ≤ OpenAI baseline for 7 consecutive days
- [ ] Latency ≤ OpenAI + 10% for 7 consecutive days
- [ ] Cost savings ~33% achieved
- [ ] No critical alarms triggered
- [ ] Success rate ≥99% for 7 consecutive days
- [ ] User satisfaction maintained (≥80%)
- [ ] No major incidents
- [ ] System stable and reliable

**If all criteria met**: Proceed to Task 14.3 (OpenAI deprecation)
**If criteria not met**: Continue monitoring, investigate issues, implement fixes

---

## Task 14.3: Deprecate OpenAI (Optional)

### Overview

This task involves optionally deprecating OpenAI as the fallback provider. This is **OPTIONAL** and should only be done after extended stable operation (recommended: 1 month minimum).

**⚠️ WARNING**: This task is optional and should be approached cautiously. Keeping OpenAI as a fallback is recommended for at least 1 month after migration completion.

### Decision Framework

**Proceed with OpenAI Deprecation IF:**

- ✅ Bedrock has been stable for 1+ month
- ✅ Zero critical incidents with Bedrock
- ✅ Error rate consistently ≤ baseline
- ✅ Latency consistently ≤ baseline + 10%
- ✅ Cost savings consistently ~33%
- ✅ User satisfaction consistently ≥80%
- ✅ Team confident in Bedrock reliability
- ✅ Rollback procedure documented and tested
- ✅ Management approval obtained

**Keep OpenAI as Fallback IF:**

- ❌ Bedrock has had any critical incidents
- ❌ Less than 1 month of stable operation
- ❌ Any concerns about Bedrock reliability
- ❌ Regulatory or compliance requirements for fallback
- ❌ Team not fully confident in Bedrock
- ❌ Cost of maintaining OpenAI is negligible

### Step 1: Document Rollback Procedure

Before deprecating OpenAI, ensure rollback procedure is well-documented and tested.

**Create Rollback Runbook:**

```markdown
# Emergency Rollback to OpenAI Runbook

## When to Use

Use this runbook if:
- Bedrock service outage
- Critical Bedrock errors
- Bedrock performance degradation
- Security incident with Bedrock
- Any emergency requiring immediate fallback

## Prerequisites

- OpenAI API key available
- AWS CLI access
- Lambda function names known

## Rollback Steps

### Step 1: Update Lambda Configuration (< 1 minute)

```bash
# Update all AI Lambda functions
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={AI_PROVIDER=OPENAI,OPENAI_API_KEY=sk-...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,OPENAI_API_KEY=sk-...}"

aws lambda update-function-configuration \
  --function-name aibts-ai-batch \
  --environment "Variables={AI_PROVIDER=OPENAI,OPENAI_API_KEY=sk-...}"
```

### Step 2: Verify Rollback (< 1 minute)

```bash
# Verify configuration
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'

# Expected: "OPENAI"

# Test function
aws lambda invoke \
  --function-name aibts-ai-generate \
  --payload '{"test": true}' \
  response.json

# Check logs
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

### Step 3: Monitor OpenAI Usage (ongoing)

```bash
# Monitor OpenAI metrics
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/OpenAI \
  --metric-name OpenAILatency \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600
```

### Step 4: Communicate Rollback

- Notify team via Slack/email
- Update status page
- Document incident
- Plan Bedrock fix

## Rollback Time

**Total Time**: < 2 minutes
**Downtime**: None (seamless switch)

## Post-Rollback Actions

1. Investigate Bedrock issue
2. Implement fix
3. Test fix in development
4. Resume Bedrock when ready
5. Document lessons learned
```

### Step 2: Remove OpenAI API Key (Optional)

**⚠️ CAUTION**: Only proceed if you're certain you won't need OpenAI fallback.

**Option A: Remove from Environment Variables**

```bash
# Remove OPENAI_API_KEY from Lambda functions
aws lambda update-function-configuration \
  --function-name aibts-ai-analyze \
  --environment "Variables={AI_PROVIDER=BEDROCK,BEDROCK_REGION=us-east-1,...}"
  # Note: OPENAI_API_KEY not included

# Repeat for all AI functions
```

**Option B: Keep in Secrets Manager (Recommended)**

```bash
# Store OpenAI API key in AWS Secrets Manager for emergency use
aws secretsmanager create-secret \
  --name aibts/openai-api-key-emergency \
  --description "OpenAI API key for emergency fallback only" \
  --secret-string "sk-..."

# Document retrieval procedure
echo "To retrieve OpenAI key in emergency:"
echo "aws secretsmanager get-secret-value --secret-id aibts/openai-api-key-emergency --query SecretString --output text"
```

**Recommendation**: Use Option B (Secrets Manager) to maintain emergency access without exposing the key in environment variables.

### Step 3: Keep OpenAI Code for Emergency Fallback

**DO NOT DELETE OpenAI Code:**

```typescript
// packages/backend/src/services/ai-test-generation/openai-engine.ts
// KEEP THIS FILE - Emergency fallback only

export class OpenAIEngine implements AIEngine {
  // Keep implementation intact
  // Mark as deprecated but functional
}
```

**Add Deprecation Notice:**

```typescript
/**
 * OpenAI Engine - DEPRECATED
 * 
 * This engine is maintained for emergency fallback only.
 * Primary provider: Amazon Bedrock (BedrockEngine)
 * 
 * To use OpenAI in emergency:
 * 1. Set AI_PROVIDER=OPENAI
 * 2. Retrieve API key from Secrets Manager
 * 3. Update Lambda configuration
 * 
 * @deprecated Use BedrockEngine instead
 */
export class OpenAIEngine implements AIEngine {
  // Implementation
}
```

### Step 4: Update Documentation

**Update README.md:**

```markdown
## AI Provider

**Primary Provider**: Amazon Bedrock with Claude 3.5 Sonnet
**Status**: Production (default)

**Emergency Fallback**: OpenAI GPT-4
**Status**: Deprecated (emergency use only)

### Using OpenAI in Emergency

OpenAI is maintained as an emergency fallback but is deprecated for normal use.

To activate OpenAI fallback:

1. Retrieve API key from Secrets Manager:
   ```bash
   aws secretsmanager get-secret-value \
     --secret-id aibts/openai-api-key-emergency \
     --query SecretString --output text
   ```

2. Update Lambda configuration:
   ```bash
   aws lambda update-function-configuration \
     --function-name aibts-ai-generate \
     --environment "Variables={AI_PROVIDER=OPENAI,OPENAI_API_KEY=sk-...}"
   ```

3. Verify rollback:
   ```bash
   aws logs tail /aws/lambda/aibts-ai-generate --follow
   ```

See [Emergency Rollback Runbook](.kiro/specs/bedrock-migration/EMERGENCY_ROLLBACK_RUNBOOK.md) for detailed procedures.
```

### Step 5: Archive OpenAI Metrics

**Archive Historical OpenAI Data:**

```bash
# Export OpenAI metrics for historical reference
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/OpenAI \
  --metric-name OpenAILatency \
  --statistics Average,Maximum,Minimum \
  --start-time 2024-01-01T00:00:00 \
  --end-time 2024-12-31T23:59:59 \
  --period 86400 > openai-metrics-archive.json

# Store in S3 for long-term retention
aws s3 cp openai-metrics-archive.json s3://aibts-archives/metrics/openai/
```

**Update CloudWatch Dashboard:**

```json
{
  "widgets": [
    {
      "type": "text",
      "properties": {
        "markdown": "# AI Test Generation Monitoring\n\n**Primary Provider**: Amazon Bedrock (Claude 3.5 Sonnet)\n**Status**: Production\n\n**Emergency Fallback**: OpenAI GPT-4 (Deprecated)\n**Status**: Available for emergency use only"
      }
    }
  ]
}
```

### Step 6: Monitor Cost Savings

**Calculate Final Cost Savings:**

```bash
# Compare costs before and after migration
# Bedrock cost (last 30 days)
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '30 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 2592000

# Historical OpenAI cost (from archive)
# Calculate savings percentage
```

**Cost Savings Report Template:**

```markdown
# OpenAI Deprecation - Cost Savings Report

**Reporting Period**: [Start Date] - [End Date]
**Duration**: 30 days

## Cost Comparison

| Provider | Total Cost | Avg Daily Cost | Cost per Request |
|----------|------------|----------------|------------------|
| OpenAI (Historical) | $1,500 | $50 | $0.12 |
| Bedrock (Current) | $1,000 | $33.33 | $0.08 |
| **Savings** | **$500** | **$16.67** | **$0.04** |
| **Savings %** | **33%** | **33%** | **33%** |

## Projected Annual Savings

- **Monthly Savings**: $500
- **Annual Savings**: $6,000
- **3-Year Savings**: $18,000

## ROI Analysis

- **Migration Cost**: [Development time, testing, deployment]
- **Payback Period**: [Months to recover migration cost]
- **Net Benefit**: [Annual savings - migration cost]

## Conclusion

The migration to Amazon Bedrock has achieved the target cost savings of ~33%, resulting in $6,000 annual savings. The migration has paid for itself in [X] months.
```

### Step 7: Final Deprecation Checklist

Before considering OpenAI fully deprecated:

- [ ] Bedrock stable for 1+ month
- [ ] Zero critical incidents
- [ ] Rollback procedure documented and tested
- [ ] OpenAI API key stored in Secrets Manager
- [ ] OpenAI code kept for emergency use
- [ ] Documentation updated
- [ ] Team trained on emergency rollback
- [ ] Management approval obtained
- [ ] Cost savings validated
- [ ] Historical metrics archived

**If all items checked**: OpenAI can be considered deprecated (but still available for emergency use)

---

## Operational Procedures for Bedrock

### Daily Operations

**Morning Checklist:**

```bash
# Check overnight metrics
.\check-bedrock-health.ps1

# Review any alarms
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query 'MetricAlarms[*].[AlarmName,StateReason]'

# Check error logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  --filter-pattern "ERROR" | \
  jq '.events | length'
```

**Weekly Checklist:**

```bash
# Generate weekly report
.\generate-weekly-report.ps1

# Review cost trends
.\analyze-cost-trends.ps1

# Check for any anomalies
.\detect-anomalies.ps1

# Update stakeholders
# Send weekly report via email
```

**Monthly Checklist:**

```bash
# Generate monthly report
.\generate-monthly-report.ps1

# Review and optimize prompts
# Analyze test quality metrics
# Identify cost optimization opportunities

# Update documentation if needed
# Review and update operational procedures
```

### Incident Response Procedures

**Severity Levels:**

1. **P0 - Critical**: Service outage, data loss, security breach
   - Response time: Immediate
   - Action: Emergency rollback to OpenAI
   - Escalation: Immediate management notification

2. **P1 - High**: High error rate, severe performance degradation
   - Response time: < 15 minutes
   - Action: Investigate, consider rollback
   - Escalation: Notify team lead

3. **P2 - Medium**: Elevated error rate, moderate performance issues
   - Response time: < 1 hour
   - Action: Investigate, monitor closely
   - Escalation: Log incident, notify team

4. **P3 - Low**: Minor issues, no user impact
   - Response time: < 4 hours
   - Action: Investigate during business hours
   - Escalation: Log for review

**Incident Response Workflow:**

```
1. Detect Issue
   ↓
2. Assess Severity (P0-P3)
   ↓
3. Notify Team
   ↓
4. Investigate Root Cause
   ↓
5. Implement Fix or Rollback
   ↓
6. Verify Resolution
   ↓
7. Document Incident
   ↓
8. Post-Mortem (P0-P1 only)
```

### Performance Optimization

**Prompt Optimization:**

```typescript
// Regularly review and optimize prompts for better quality and lower cost

// Example: Optimize analysis prompt
private buildAnalysisPrompt(request: AIRequest): string {
  // Use concise, clear instructions
  // Avoid unnecessary verbosity
  // Request structured output (JSON)
  // Specify exact requirements
  
  return `Analyze this web application and provide a JSON response with:
1. Key features (array of strings)
2. User flows (array of strings)
3. Interactive elements (array of objects)
4. Authentication requirements (boolean)
5. Test recommendations (array of strings)

Application URL: ${request.url}
Page HTML: ${request.html}

Respond with only the JSON, no explanations.`;
}
```

**Cost Optimization Strategies:**

1. **Reduce Token Usage**
   - Optimize prompts for conciseness
   - Remove unnecessary context
   - Use structured output formats

2. **Cache Responses**
   - Cache common analysis results
   - Reuse selector generations
   - Implement response caching layer

3. **Batch Operations**
   - Batch multiple requests when possible
   - Reduce per-request overhead
   - Optimize batch sizes

4. **Monitor and Alert**
   - Set cost thresholds
   - Alert on unusual spending
   - Review high-cost operations

### Quality Assurance

**Test Quality Metrics:**

```bash
# Track test generation quality
# Metrics to monitor:
# - Test pass rate
# - Test coverage
# - Selector stability
# - False positive rate
# - User satisfaction

# Example: Query test pass rate
aws dynamodb query \
  --table-name TestExecutions \
  --key-condition-expression "generatedBy = :bedrock" \
  --expression-attribute-values '{":bedrock": {"S": "BEDROCK"}}' \
  --projection-expression "testId, passed, failed"
```

**Quality Improvement Process:**

1. **Collect Feedback**
   - User surveys
   - Test execution results
   - Error reports

2. **Analyze Patterns**
   - Common failure modes
   - Quality issues
   - User complaints

3. **Improve Prompts**
   - Refine instructions
   - Add examples
   - Clarify requirements

4. **Test Changes**
   - A/B test prompt changes
   - Measure quality impact
   - Roll out improvements

5. **Monitor Results**
   - Track quality metrics
   - Validate improvements
   - Iterate as needed

### Capacity Planning

**Bedrock Quotas:**

```bash
# Check current Bedrock quotas
aws service-quotas get-service-quota \
  --service-code bedrock \
  --quota-code L-12345678

# Monitor usage against quotas
# Request quota increases if needed
```

**Scaling Considerations:**

1. **Request Volume**
   - Monitor daily request volume
   - Plan for growth
   - Request quota increases proactively

2. **Latency**
   - Monitor P95/P99 latency
   - Optimize for performance
   - Consider regional endpoints

3. **Cost**
   - Project monthly costs
   - Budget for growth
   - Optimize for cost efficiency

### Disaster Recovery

**Backup Procedures:**

```bash
# Backup configuration
aws lambda get-function-configuration \
  --function-name aibts-ai-generate > lambda-config-backup.json

# Backup IAM policies
aws iam get-role-policy \
  --role-name aibts-ai-generate-role \
  --policy-name BedrockAccess > iam-policy-backup.json

# Store backups in S3
aws s3 cp lambda-config-backup.json s3://aibts-backups/config/
aws s3 cp iam-policy-backup.json s3://aibts-backups/iam/
```

**Recovery Procedures:**

1. **Configuration Loss**
   - Restore from S3 backup
   - Redeploy Lambda configuration
   - Verify functionality

2. **IAM Permission Issues**
   - Restore IAM policies from backup
   - Verify Bedrock access
   - Test functionality

3. **Complete Service Failure**
   - Rollback to OpenAI (< 1 minute)
   - Investigate Bedrock issue
   - Restore Bedrock when ready

---

## Lessons Learned Documentation

### Template for Lessons Learned

```markdown
# Bedrock Migration - Lessons Learned

**Migration Period**: [Start Date] - [End Date]
**Duration**: [X] weeks
**Team**: [Team members]

## Executive Summary

[Brief summary of migration, outcomes, and key learnings]

## What Went Well

1. **[Success 1]**
   - Description: [What happened]
   - Impact: [Positive outcome]
   - Why it worked: [Analysis]

2. **[Success 2]**
   - Description: [What happened]
   - Impact: [Positive outcome]
   - Why it worked: [Analysis]

## What Could Be Improved

1. **[Challenge 1]**
   - Description: [What happened]
   - Impact: [Negative outcome]
   - Root cause: [Analysis]
   - How to improve: [Recommendations]

2. **[Challenge 2]**
   - Description: [What happened]
   - Impact: [Negative outcome]
   - Root cause: [Analysis]
   - How to improve: [Recommendations]

## Key Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Migration Duration | 4 weeks | ___ weeks | ☐ |
| Cost Savings | 33% | ___% | ☐ |
| Error Rate | ≤ baseline | ___ | ☐ |
| Latency | ≤ baseline+10% | ___ | ☐ |
| User Satisfaction | ≥80% | ___% | ☐ |
| Downtime | 0 minutes | ___ minutes | ☐ |

## Technical Insights

### Architecture
- [Insights about architecture decisions]
- [What worked well]
- [What could be improved]

### Implementation
- [Insights about implementation approach]
- [Challenges encountered]
- [Solutions found]

### Testing
- [Insights about testing strategy]
- [Test coverage]
- [Issues discovered]

### Deployment
- [Insights about deployment process]
- [Phased rollout effectiveness]
- [Rollback procedures]

## Process Insights

### Planning
- [Insights about planning process]
- [Estimation accuracy]
- [Risk assessment]

### Communication
- [Insights about team communication]
- [Stakeholder updates]
- [Documentation]

### Collaboration
- [Insights about team collaboration]
- [Cross-functional coordination]
- [Knowledge sharing]

## Recommendations for Future Migrations

1. **[Recommendation 1]**
   - Context: [When to apply]
   - Benefit: [Expected outcome]
   - Implementation: [How to do it]

2. **[Recommendation 2]**
   - Context: [When to apply]
   - Benefit: [Expected outcome]
   - Implementation: [How to do it]

## Action Items

- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [Action item 3]

## Conclusion

[Final thoughts and summary]

---

**Document Version**: 1.0
**Last Updated**: [Date]
**Author**: [Name]
**Reviewed By**: [Names]
```

---

## Final Validation Checklist

### Phase 4 Completion Criteria

**Task 14.1: Set Bedrock as Default**
- [ ] CDK stack updated with BEDROCK as default
- [ ] Documentation updated
- [ ] Migration announced internally
- [ ] Migration announced externally (if applicable)
- [ ] CloudWatch dashboard updated
- [ ] Team trained on new configuration

**Task 14.2: Monitor for Stability**
- [ ] 7 days of monitoring completed
- [ ] Error rate ≤ baseline for 7 days
- [ ] Latency ≤ baseline+10% for 7 days
- [ ] Cost savings ~33% achieved
- [ ] No critical alarms triggered
- [ ] Success rate ≥99% for 7 days
- [ ] User satisfaction ≥80%
- [ ] Weekly report completed

**Task 14.3: Deprecate OpenAI (Optional)**
- [ ] Decision made (deprecate or keep)
- [ ] Rollback procedure documented
- [ ] OpenAI API key stored securely
- [ ] OpenAI code kept for emergency
- [ ] Documentation updated
- [ ] Metrics archived
- [ ] Cost savings validated

**Overall Migration Success**
- [ ] All 16 tasks completed
- [ ] All tests passing (111/111)
- [ ] Cost savings achieved (~33%)
- [ ] Performance maintained or improved
- [ ] User satisfaction maintained
- [ ] Zero downtime migration
- [ ] Rollback procedure tested
- [ ] Documentation complete
- [ ] Team trained
- [ ] Lessons learned documented

---

## Next Steps After Phase 4

### Immediate (Week 1)
1. Complete final validation
2. Document lessons learned
3. Share results with stakeholders
4. Celebrate migration success! 🎉

### Short-term (Month 1)
5. Continue monitoring Bedrock stability
6. Optimize prompts for quality and cost
7. Collect ongoing user feedback
8. Refine operational procedures

### Long-term (Ongoing)
9. Monitor cost trends
10. Improve test quality
11. Explore new Bedrock features
12. Share best practices with team

---

## Conclusion

Phase 4 represents the completion of the Bedrock migration. By following this guide, you will:

✅ Set Bedrock as the default AI provider
✅ Monitor for long-term stability (1 week)
✅ Optionally deprecate OpenAI (while keeping as fallback)
✅ Establish operational procedures for Bedrock
✅ Document lessons learned
✅ Achieve ~33% cost savings
✅ Maintain or improve test quality
✅ Complete a zero-downtime migration

**Congratulations on completing the Bedrock migration!**

---

**Document Version**: 1.0
**Last Updated**: 2024
**Author**: Kiro AI Assistant
**Status**: Ready for Execution
