# Phase 3: Quick Reference Card

## Deployment Commands

### 50% Traffic
```powershell
.\deploy-phase3-50-percent.ps1 -OpenAIApiKey "sk-..."
```

### 100% Traffic
```powershell
.\deploy-phase3-100-percent.ps1 -OpenAIApiKey "sk-..."
```

### Rollback to 50%
```powershell
.\rollback-phase3.ps1 -TargetPercentage 50 -OpenAIApiKey "sk-..."
```

### Rollback to 10%
```powershell
.\rollback-phase3.ps1 -TargetPercentage 10 -OpenAIApiKey "sk-..."
```

### Emergency Rollback (0%)
```powershell
.\rollback-phase3.ps1 -TargetPercentage 0 -OpenAIApiKey "sk-..."
```

## Monitoring Commands

### Real-time Monitoring
```powershell
.\monitor-phase3.ps1 -Hours 1
```

### Watch Logs
```bash
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

### Traffic Distribution
```bash
aws logs tail /aws/lambda/aibts-ai-generate --follow --filter-pattern "Canary deployment"
```

### Error Count (Last Hour)
```bash
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --statistics Sum \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600
```

### Average Latency (Last Hour)
```bash
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --statistics Average \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600
```

### Alarm Status
```bash
aws cloudwatch describe-alarms \
  --alarm-names AIBTS-Bedrock-HighErrorRate AIBTS-Bedrock-HighLatency \
  --query 'MetricAlarms[*].[AlarmName,StateValue]' \
  --output table
```

## Success Criteria

### 50% Traffic
- ✅ Traffic: 50% ± 5%
- ✅ Error rate: ≤ OpenAI
- ✅ Latency: ≤ OpenAI + 10%
- ✅ Cost: ~33% lower
- ✅ No alarms: 48 hours
- ✅ No critical issues

### 100% Traffic
- ✅ Traffic: 100% Bedrock
- ✅ Error rate: ≤ OpenAI
- ✅ Latency: ≤ OpenAI + 10%
- ✅ Cost: ~33% lower
- ✅ No alarms: 48 hours
- ✅ User satisfaction: ≥80%
- ✅ Fallback tested

## Rollback Triggers

### Immediate Rollback (Critical)
- Error rate >2x baseline
- Latency >50% baseline
- Multiple alarms
- Service outage
- Data loss

### Planned Rollback (Non-Critical)
- Error rate increase <2x
- Latency increase <50%
- Cost concerns
- User feedback concerns

## Key Metrics Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | >5 errors/5min | >10 errors/5min |
| Latency | >20s avg | >30s avg |
| Cost | >$75/day | >$100/day |
| Success Rate | <99% | <95% |

## CloudWatch Dashboard

```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Bedrock-Migration
```

## Timeline

| Phase | Duration | Action |
|-------|----------|--------|
| 50% Deploy | 30 sec | Deploy |
| 50% Monitor | 48 hours | Monitor |
| 50% Review | 1 hour | Decision |
| 100% Deploy | 30 sec | Deploy |
| 100% Monitor | 48 hours | Monitor |
| 100% Review | 1 hour | Decision |

## Contact Information

**On-Call Engineer**: ___________
**Escalation**: ___________
**Slack Channel**: #bedrock-migration

## Emergency Procedures

1. **Detect Issue**: Monitor alarms/logs
2. **Assess Severity**: Critical vs Non-Critical
3. **Execute Rollback**: Use rollback script
4. **Verify Rollback**: Check logs
5. **Investigate**: Root cause analysis
6. **Document**: Log incident
7. **Fix**: Implement solution
8. **Test**: Verify fix
9. **Re-deploy**: Resume migration

## Files Reference

- **Guide**: `PHASE3_GRADUAL_ROLLOUT_GUIDE.md`
- **Deploy 50%**: `deploy-phase3-50-percent.ps1`
- **Deploy 100%**: `deploy-phase3-100-percent.ps1`
- **Rollback**: `rollback-phase3.ps1`
- **Monitor**: `monitor-phase3.ps1`
- **Template**: `TASK_13_COMPLETION_TEMPLATE.md`
