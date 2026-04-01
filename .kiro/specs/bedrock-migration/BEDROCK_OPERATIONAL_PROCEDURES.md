# Bedrock Operational Procedures

## Overview

This document provides comprehensive operational procedures for managing Amazon Bedrock as the primary AI provider for the AI test generation system.

**Audience**: DevOps engineers, platform operators, on-call engineers
**Scope**: Daily operations, monitoring, incident response, optimization
**Status**: Production

---

## Table of Contents

1. [Daily Operations](#daily-operations)
2. [Weekly Operations](#weekly-operations)
3. [Monthly Operations](#monthly-operations)
4. [Monitoring and Alerting](#monitoring-and-alerting)
5. [Incident Response](#incident-response)
6. [Performance Optimization](#performance-optimization)
7. [Cost Management](#cost-management)
8. [Capacity Planning](#capacity-planning)
9. [Disaster Recovery](#disaster-recovery)
10. [Maintenance Windows](#maintenance-windows)

---

## Daily Operations

### Morning Health Check (15 minutes)

**Checklist:**

```bash
# 1. Check overnight metrics
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400

# 2. Review alarm status
aws cloudwatch describe-alarms \
  --state-value ALARM \
  --query 'MetricAlarms[*].[AlarmName,StateReason]' \
  --output table

# 3. Check error logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '24 hours ago' +%s)000 \
  --filter-pattern "ERROR" | \
  jq '.events | length'

# 4. Verify configuration
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER' \
  --output text
```

**Expected Results:**
- ✅ Error count: 0-5 (acceptable)
- ✅ Alarms: All in OK state
- ✅ AI_PROVIDER: BEDROCK
- ✅ No critical errors in logs

**Actions if Issues Found:**
- Errors >10: Investigate immediately
- Alarms in ALARM state: Follow incident response procedure
- AI_PROVIDER not BEDROCK: Verify configuration, check for rollback

### End-of-Day Review (10 minutes)

**Checklist:**

```bash
# 1. Review daily metrics
.\monitor-phase4-daily.ps1 -Day 1 -Hours 24

# 2. Check cost trends
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400

# 3. Review request volume
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockRequests \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

**Expected Results:**
- ✅ Daily cost: $30-50 (typical)
- ✅ Request volume: 500-1000 (typical)
- ✅ Latency: <3s average
- ✅ Success rate: >99%

---

## Weekly Operations

### Weekly Report Generation (30 minutes)

**Generate comprehensive weekly report:**

```bash
# Run weekly report script
.\generate-weekly-report.ps1 -StartDate "2024-01-01" -EndDate "2024-01-07"
```

**Report Contents:**
1. Metrics summary (latency, errors, cost, requests)
2. Trend analysis
3. Alarm history
4. Incident summary
5. Cost analysis
6. Recommendations

### Weekly Review Meeting (1 hour)

**Agenda:**
1. Review weekly metrics
2. Discuss any incidents
3. Review cost trends
4. Identify optimization opportunities
5. Plan improvements
6. Update documentation

**Attendees:**
- Platform team
- DevOps engineers
- Product manager
- On-call engineer

### Weekly Optimization Tasks

**Tasks:**

1. **Review Slow Queries**
   ```bash
   # Find requests with high latency
   aws logs filter-log-events \
     --log-group-name /aws/lambda/aibts-ai-generate \
     --start-time $(date -u -d '7 days ago' +%s)000 \
     --filter-pattern "[time, request_id, level=ERROR, latency > 5000]"
   ```

2. **Analyze Error Patterns**
   ```bash
   # Group errors by type
   aws logs filter-log-events \
     --log-group-name /aws/lambda/aibts-ai-generate \
     --start-time $(date -u -d '7 days ago' +%s)000 \
     --filter-pattern "ERROR" | \
     jq '.events[].message' | \
     grep -oP "Error: \w+" | \
     sort | uniq -c | sort -rn
   ```

3. **Review High-Cost Operations**
   ```bash
   # Find expensive operations
   aws dynamodb query \
     --table-name AIUsage \
     --key-condition-expression "provider = :bedrock" \
     --expression-attribute-values '{":bedrock": {"S": "BEDROCK"}}' \
     --projection-expression "operationType, cost" | \
     jq '.Items | sort_by(.cost.N | tonumber) | reverse | .[0:10]'
   ```

---

## Monthly Operations

### Monthly Report Generation (1 hour)

**Generate comprehensive monthly report:**

```bash
# Run monthly report script
.\generate-monthly-report.ps1 -Month "2024-01" -Year "2024"
```

**Report Contents:**
1. Executive summary
2. Monthly metrics (latency, errors, cost, requests)
3. Month-over-month trends
4. Cost analysis and savings
5. Incident summary
6. Quality metrics
7. Capacity planning
8. Recommendations

### Monthly Review Meeting (2 hours)

**Agenda:**
1. Review monthly metrics
2. Discuss major incidents
3. Review cost trends and savings
4. Capacity planning
5. Quality assessment
6. Roadmap planning
7. Team feedback

**Attendees:**
- Platform team
- DevOps engineers
- Product manager
- Engineering manager
- Finance representative (for cost review)

### Monthly Maintenance Tasks

**Tasks:**

1. **Update Documentation**
   - Review and update operational procedures
   - Update troubleshooting guides
   - Document new learnings

2. **Review IAM Permissions**
   ```bash
   # Audit IAM policies
   aws iam get-role-policy \
     --role-name aibts-ai-generate-role \
     --policy-name BedrockAccess
   ```

3. **Backup Configuration**
   ```bash
   # Backup Lambda configuration
   aws lambda get-function-configuration \
     --function-name aibts-ai-generate > lambda-config-backup-$(date +%Y%m).json
   
   # Upload to S3
   aws s3 cp lambda-config-backup-$(date +%Y%m).json \
     s3://aibts-backups/config/
   ```

4. **Review and Optimize Prompts**
   - Analyze prompt effectiveness
   - Test prompt variations
   - Implement improvements

5. **Capacity Planning**
   - Review request volume trends
   - Project next month's usage
   - Request quota increases if needed

---

## Monitoring and Alerting

### Key Metrics to Monitor

**1. Latency**
- **Metric**: `AIBTS/Bedrock/BedrockLatency`
- **Target**: <3s average, <5s P95
- **Alert Threshold**: >5s average for 5 minutes

**2. Error Rate**
- **Metric**: `AIBTS/Bedrock/BedrockErrors`
- **Target**: <1% of requests
- **Alert Threshold**: >10 errors in 5 minutes

**3. Cost**
- **Metric**: `AIBTS/Bedrock/BedrockCost`
- **Target**: $30-50/day
- **Alert Threshold**: >$100/day

**4. Request Volume**
- **Metric**: `AIBTS/Bedrock/BedrockRequests`
- **Target**: 500-1000/day
- **Alert Threshold**: <100/day or >5000/day (anomaly)

**5. Success Rate**
- **Calculated**: (Requests - Errors) / Requests * 100
- **Target**: >99%
- **Alert Threshold**: <95%

### CloudWatch Alarms

**Configured Alarms:**

1. **AIBTS-Bedrock-HighErrorRate**
   - Condition: >10 errors in 5 minutes
   - Action: SNS notification to on-call
   - Severity: P1 - High

2. **AIBTS-Bedrock-HighLatency**
   - Condition: >5s average for 5 minutes
   - Action: SNS notification to on-call
   - Severity: P2 - Medium

3. **AIBTS-Bedrock-HighCost**
   - Condition: >$100/day
   - Action: SNS notification to team
   - Severity: P2 - Medium

### Dashboard Access

**CloudWatch Dashboard:**
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-AI-Monitoring
```

**Widgets:**
- Latency trend (24h)
- Error count (24h)
- Cost trend (7d)
- Request volume (24h)
- Success rate (24h)
- Alarm status

---

## Incident Response

### Severity Levels

**P0 - Critical**
- Service outage
- Data loss
- Security breach
- **Response Time**: Immediate
- **Action**: Emergency rollback to OpenAI
- **Escalation**: Immediate management notification

**P1 - High**
- High error rate (>20 errors/5min)
- Severe performance degradation (>10s latency)
- **Response Time**: <15 minutes
- **Action**: Investigate, consider rollback
- **Escalation**: Notify team lead

**P2 - Medium**
- Elevated error rate (10-20 errors/5min)
- Moderate performance issues (5-10s latency)
- **Response Time**: <1 hour
- **Action**: Investigate, monitor closely
- **Escalation**: Log incident, notify team

**P3 - Low**
- Minor issues
- No user impact
- **Response Time**: <4 hours
- **Action**: Investigate during business hours
- **Escalation**: Log for review

### Incident Response Workflow

```
1. Detect Issue (Alarm or Manual)
   ↓
2. Assess Severity (P0-P3)
   ↓
3. Notify Team (Slack/PagerDuty)
   ↓
4. Investigate Root Cause
   ↓
5. Implement Fix or Rollback
   ↓
6. Verify Resolution
   ↓
7. Monitor for Stability
   ↓
8. Document Incident
   ↓
9. Post-Mortem (P0-P1 only)
   ↓
10. Implement Preventive Measures
```

### Emergency Rollback

**When to Rollback:**
- P0 incidents
- Bedrock service outage
- Critical errors affecting users
- Security incidents

**Rollback Procedure:**
See [Emergency Rollback Runbook](./EMERGENCY_ROLLBACK_RUNBOOK.md)

**Rollback Time:** <2 minutes

---

## Performance Optimization

### Prompt Optimization

**Best Practices:**

1. **Be Concise**
   - Remove unnecessary words
   - Use clear, direct language
   - Avoid repetition

2. **Use Structured Output**
   - Request JSON format
   - Specify exact schema
   - Reduce parsing complexity

3. **Provide Context Efficiently**
   - Include only relevant context
   - Summarize when possible
   - Use examples sparingly

4. **Test Variations**
   - A/B test prompt changes
   - Measure quality impact
   - Measure cost impact

**Example Optimization:**

```typescript
// Before (verbose)
private buildAnalysisPrompt(request: AIRequest): string {
  return `You are an expert QA engineer with years of experience...
  Please analyze this web application carefully and thoroughly...
  Provide a detailed analysis including all the following information...`;
}

// After (concise)
private buildAnalysisPrompt(request: AIRequest): string {
  return `Analyze this web application. Return JSON with:
  {"features": [], "userFlows": [], "elements": [], "authRequired": bool}
  
  URL: ${request.url}
  HTML: ${request.html}`;
}
```

### Caching Strategy

**Implement caching for:**

1. **Application Analysis**
   - Cache by URL hash
   - TTL: 24 hours
   - Invalidate on URL change

2. **Selector Generation**
   - Cache by DOM hash
   - TTL: 1 hour
   - Invalidate on DOM change

3. **Common Patterns**
   - Cache frequently used patterns
   - TTL: 7 days
   - Manual invalidation

**Implementation:**

```typescript
// Example caching layer
class BedrockCache {
  async getOrGenerate(key: string, generator: () => Promise<string>): Promise<string> {
    const cached = await this.redis.get(key);
    if (cached) return cached;
    
    const result = await generator();
    await this.redis.setex(key, 3600, result);
    return result;
  }
}
```

### Batch Optimization

**Batch similar requests:**

```typescript
// Instead of 10 individual requests
for (const element of elements) {
  await bedrock.generate({ element });
}

// Batch into 1 request
await bedrock.generateBatch({ elements });
```

**Benefits:**
- Reduced API calls
- Lower latency
- Lower cost

---

## Cost Management

### Cost Tracking

**Daily Cost Check:**

```bash
# Get daily cost
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

**Monthly Cost Projection:**

```bash
# Calculate monthly projection
DAILY_COST=$(aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Average \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 604800 \
  --query 'Datapoints[0].Average' \
  --output text)

MONTHLY_PROJECTION=$(echo "$DAILY_COST * 30" | bc)
echo "Projected monthly cost: \$$MONTHLY_PROJECTION"
```

### Cost Optimization Strategies

**1. Reduce Token Usage**
- Optimize prompts for conciseness
- Remove unnecessary context
- Use structured output formats

**2. Implement Caching**
- Cache common requests
- Reduce duplicate API calls
- Set appropriate TTLs

**3. Batch Operations**
- Batch similar requests
- Reduce per-request overhead
- Optimize batch sizes

**4. Monitor High-Cost Operations**
- Identify expensive operations
- Optimize or cache them
- Set cost alerts

**5. Use Appropriate Models**
- Use Claude 3.5 Sonnet for complex tasks
- Consider Claude 3 Haiku for simple tasks (if available)
- Match model to task complexity

### Cost Alerts

**Set up cost alerts:**

```bash
# Create cost alarm
aws cloudwatch put-metric-alarm \
  --alarm-name AIBTS-Bedrock-DailyCostLimit \
  --alarm-description "Alert when daily cost exceeds $100" \
  --metric-name BedrockCost \
  --namespace AIBTS/Bedrock \
  --statistic Sum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:cost-alerts
```

---

## Capacity Planning

### Request Volume Monitoring

**Track request trends:**

```bash
# Weekly request volume
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockRequests \
  --statistics Sum \
  --start-time $(date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

**Project future needs:**

```bash
# Calculate growth rate
# Project next month's volume
# Plan for capacity
```

### Bedrock Quotas

**Check current quotas:**

```bash
# Check Bedrock quotas
aws service-quotas get-service-quota \
  --service-code bedrock \
  --quota-code L-12345678
```

**Request quota increases:**

```bash
# Request quota increase
aws service-quotas request-service-quota-increase \
  --service-code bedrock \
  --quota-code L-12345678 \
  --desired-value 10000
```

### Scaling Considerations

**Factors to consider:**

1. **Request Volume Growth**
   - Monitor month-over-month growth
   - Project 3-6 months ahead
   - Request quota increases proactively

2. **Latency Requirements**
   - Monitor P95/P99 latency
   - Optimize for performance
   - Consider regional endpoints

3. **Cost Constraints**
   - Budget for growth
   - Optimize for cost efficiency
   - Balance cost vs performance

---

## Disaster Recovery

### Backup Procedures

**Daily Backups:**

```bash
# Backup Lambda configuration
aws lambda get-function-configuration \
  --function-name aibts-ai-generate > lambda-config-backup.json

# Backup IAM policies
aws iam get-role-policy \
  --role-name aibts-ai-generate-role \
  --policy-name BedrockAccess > iam-policy-backup.json

# Upload to S3
aws s3 cp lambda-config-backup.json s3://aibts-backups/config/$(date +%Y%m%d)/
aws s3 cp iam-policy-backup.json s3://aibts-backups/iam/$(date +%Y%m%d)/
```

### Recovery Procedures

**Configuration Loss:**

```bash
# Restore from S3 backup
aws s3 cp s3://aibts-backups/config/latest/lambda-config-backup.json .

# Apply configuration
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --cli-input-json file://lambda-config-backup.json
```

**IAM Permission Issues:**

```bash
# Restore IAM policies
aws s3 cp s3://aibts-backups/iam/latest/iam-policy-backup.json .

# Apply policy
aws iam put-role-policy \
  --role-name aibts-ai-generate-role \
  --policy-name BedrockAccess \
  --policy-document file://iam-policy-backup.json
```

**Complete Service Failure:**

1. Rollback to OpenAI (< 1 minute)
2. Investigate Bedrock issue
3. Restore Bedrock when ready

---

## Maintenance Windows

### Scheduled Maintenance

**Monthly Maintenance Window:**
- **Schedule**: First Sunday of each month, 2:00 AM - 4:00 AM UTC
- **Duration**: 2 hours
- **Impact**: None (zero-downtime updates)

**Maintenance Tasks:**
- Update Lambda functions
- Update IAM policies
- Update monitoring configuration
- Test rollback procedures
- Backup configuration

### Emergency Maintenance

**Unscheduled maintenance for:**
- Critical security patches
- Critical bug fixes
- Service outages

**Notification:**
- Notify team 1 hour before (if possible)
- Update status page
- Document changes

---

## Appendix: Quick Reference

### Common Commands

**Check AI Provider:**
```bash
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'
```

**Check Errors (Last Hour):**
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --start-time $(date -u -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR" | jq '.events | length'
```

**Check Cost (Today):**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockCost \
  --statistics Sum \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 86400
```

**Emergency Rollback:**
```bash
# See EMERGENCY_ROLLBACK_RUNBOOK.md
```

### Contact Information

**On-Call Engineer**: [Phone/Slack]
**Team Lead**: [Phone/Slack]
**Platform Team**: [Slack channel]
**AWS Support**: [Support case link]

---

**Document Version**: 1.0
**Last Updated**: 2024
**Next Review**: [Date]
**Owner**: Platform Team
