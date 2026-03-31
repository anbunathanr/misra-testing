# CloudWatch Logs Monitoring Guide

## 🔍 Monitor New Lambda Functions

### Quick Commands

```powershell
# Monitor test executor (most important)
aws logs tail /aws/lambda/aibts-test-executor --follow

# Monitor trigger execution
aws logs tail /aws/lambda/aibts-trigger-execution --follow

# Monitor profile endpoint
aws logs tail /aws/lambda/aibts-get-profile --follow

# Monitor execution status
aws logs tail /aws/lambda/aibts-get-execution-status --follow

# Monitor execution results
aws logs tail /aws/lambda/aibts-get-execution-results --follow

# Monitor execution history
aws logs tail /aws/lambda/aibts-get-execution-history --follow

# Monitor suite results
aws logs tail /aws/lambda/aibts-get-suite-results --follow

# Monitor AI usage
aws logs tail /aws/lambda/aibts-ai-get-usage --follow

# Monitor analyze file
aws logs tail /aws/lambda/misra-platform-analyze-file --follow

# Monitor user stats
aws logs tail /aws/lambda/misra-platform-get-user-stats --follow

# Monitor insights generation
aws logs tail /aws/lambda/misra-platform-generate-insights --follow
```

---

## 📊 Monitor All Functions Simultaneously

Create a PowerShell script to monitor multiple logs:

```powershell
# monitor-all-logs.ps1
$functions = @(
    "aibts-test-executor",
    "aibts-trigger-execution",
    "aibts-get-execution-status"
)

foreach ($func in $functions) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "aws logs tail /aws/lambda/$func --follow"
}
```

---

## 🎯 What to Look For

### ✅ Good Signs
- `START RequestId:` - Function invocation started
- `END RequestId:` - Function completed successfully
- `REPORT RequestId:` - Execution metrics (duration, memory)
- Status code 200/201 in responses
- No error messages

### ⚠️ Warning Signs
- High duration times (>5 seconds for simple operations)
- High memory usage (>80% of allocated)
- Timeout warnings
- Retry attempts

### ❌ Error Signs
- `ERROR` messages
- Stack traces
- `Task timed out after X seconds`
- `Process exited before completing request`
- 500 status codes
- Database connection errors
- Permission denied errors

---

## 🔧 Common Issues and Solutions

### Issue: "Cannot find module"
**Cause**: Missing dependencies in Lambda deployment package
**Solution**: 
```powershell
cd packages/backend
node esbuild.lambda.js
.\update-all-lambdas.ps1
```

### Issue: "Task timed out"
**Cause**: Function execution exceeds timeout limit
**Solution**:
```powershell
# Increase timeout (example for test-executor)
aws lambda update-function-configuration `
    --function-name aibts-test-executor `
    --timeout 900
```

### Issue: "User is not authorized"
**Cause**: Missing IAM permissions
**Solution**:
```powershell
# Check function role
$roleArn = aws lambda get-function --function-name aibts-test-executor --query 'Configuration.Role' --output text

# Attach necessary policies
aws iam attach-role-policy --role-name [role-name] --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
```

### Issue: "Cannot connect to DynamoDB"
**Cause**: Network or permission issues
**Solution**:
- Verify DynamoDB table exists
- Check IAM role has DynamoDB permissions
- Verify table name in environment variables

---

## 📈 Performance Monitoring

### Check Function Metrics

```powershell
# Get invocation count (last hour)
aws cloudwatch get-metric-statistics `
    --namespace AWS/Lambda `
    --metric-name Invocations `
    --dimensions Name=FunctionName,Value=aibts-test-executor `
    --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
    --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
    --period 3600 `
    --statistics Sum

# Get error count (last hour)
aws cloudwatch get-metric-statistics `
    --namespace AWS/Lambda `
    --metric-name Errors `
    --dimensions Name=FunctionName,Value=aibts-test-executor `
    --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
    --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
    --period 3600 `
    --statistics Sum

# Get average duration (last hour)
aws cloudwatch get-metric-statistics `
    --namespace AWS/Lambda `
    --metric-name Duration `
    --dimensions Name=FunctionName,Value=aibts-test-executor `
    --start-time (Get-Date).AddHours(-1).ToString("yyyy-MM-ddTHH:mm:ss") `
    --end-time (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss") `
    --period 3600 `
    --statistics Average
```

---

## 🚨 Set Up Log Insights Queries

### Query 1: Find All Errors (Last Hour)

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 100
```

### Query 2: Find Slow Executions (>5 seconds)

```
fields @timestamp, @duration, @requestId
| filter @type = "REPORT"
| filter @duration > 5000
| sort @duration desc
| limit 20
```

### Query 3: Find Failed Invocations

```
fields @timestamp, @message, @requestId
| filter @message like /Task timed out/ or @message like /Process exited/
| sort @timestamp desc
| limit 50
```

### Query 4: Track Execution Flow

```
fields @timestamp, @message
| filter @message like /START RequestId/ or @message like /END RequestId/ or @message like /REPORT RequestId/
| sort @timestamp asc
```

---

## 📝 Create Monitoring Dashboard

```powershell
# Create CloudWatch dashboard
aws cloudwatch put-dashboard --dashboard-name "AIBTS-Platform-Monitoring" --dashboard-body '{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum", "label": "Total Invocations"}],
          [".", "Errors", {"stat": "Sum", "label": "Errors"}],
          [".", "Duration", {"stat": "Average", "label": "Avg Duration"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "Lambda Metrics",
        "yAxis": {
          "left": {
            "min": 0
          }
        }
      }
    }
  ]
}'
```

---

## 🎯 Monitoring Best Practices

1. **Monitor During Testing**
   - Keep logs open while testing workflow
   - Watch for errors in real-time
   - Note any performance issues

2. **Check Logs After Failures**
   - Always check logs when something fails
   - Look for error messages and stack traces
   - Check timing of failures

3. **Regular Health Checks**
   - Review logs daily for first week
   - Set up automated alerts
   - Monitor error rates

4. **Performance Optimization**
   - Track average execution times
   - Identify slow functions
   - Optimize based on metrics

---

## 🔔 Recommended Alarms

```powershell
# Alarm for high error rate
aws cloudwatch put-metric-alarm `
    --alarm-name "AIBTS-High-Error-Rate" `
    --alarm-description "Alert when error rate exceeds 5%" `
    --metric-name Errors `
    --namespace AWS/Lambda `
    --statistic Sum `
    --period 300 `
    --evaluation-periods 1 `
    --threshold 5 `
    --comparison-operator GreaterThanThreshold

# Alarm for test executor failures
aws cloudwatch put-metric-alarm `
    --alarm-name "AIBTS-Test-Executor-Failures" `
    --alarm-description "Alert when test executor has errors" `
    --metric-name Errors `
    --namespace AWS/Lambda `
    --dimensions Name=FunctionName,Value=aibts-test-executor `
    --statistic Sum `
    --period 300 `
    --evaluation-periods 1 `
    --threshold 3 `
    --comparison-operator GreaterThanThreshold
```

---

## ✅ Monitoring Checklist

After deployment, verify:

- [ ] All Lambda functions have log groups
- [ ] Logs are being generated on invocation
- [ ] No immediate errors in logs
- [ ] Function durations are reasonable
- [ ] Memory usage is within limits
- [ ] No timeout errors
- [ ] CloudWatch alarms configured
- [ ] Dashboard created for monitoring

---

**Next**: Once monitoring is set up, proceed with complete workflow testing!
