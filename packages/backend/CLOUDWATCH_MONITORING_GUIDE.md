# CloudWatch Monitoring Guide for MISRA Platform

## Overview

This guide covers the comprehensive CloudWatch monitoring setup for the MISRA Platform, including log groups, custom metrics, dashboards, alarms, and structured logging with correlation IDs.

## Architecture

The monitoring infrastructure consists of:

1. **Log Groups** - Centralized logging for all Lambda functions and system components
2. **Custom Metrics** - Business and performance metrics for workflow tracking
3. **Dashboards** - Visual monitoring for real-time system health
4. **Alarms** - Automated alerting for error conditions and performance degradation
5. **Structured Logging** - JSON-formatted logs with correlation IDs for request tracing

## Log Groups

### Lambda Function Log Groups
- `/aws/lambda/misra-platform-authorizer-{environment}`
- `/aws/lambda/misra-platform-register-{environment}` (when implemented)
- `/aws/lambda/misra-platform-login-{environment}` (when implemented)
- `/aws/lambda/misra-platform-otp-verify-{environment}` (when implemented)
- `/aws/lambda/misra-platform-upload-{environment}` (when implemented)
- `/aws/lambda/misra-platform-analyze-{environment}` (when implemented)

### System Component Log Groups
- `/aws/apigateway/misra-platform-{environment}` - API Gateway access logs
- `/misra-platform/{environment}/workflow` - Autonomous workflow logs
- `/misra-platform/{environment}/analysis` - MISRA analysis engine logs
- `/misra-platform/{environment}/security` - Security events and authentication logs

### Log Retention Policies
- **Production**: 30 days (security logs: 90 days)
- **Staging**: 14 days (security logs: 30 days)
- **Development**: 7 days (security logs: 14 days)

## Custom Metrics

All metrics are published to the `MISRA/Platform` namespace with environment-specific dimensions.

### Workflow Metrics
- `WorkflowStarted` - Count of initiated workflows
- `WorkflowCompleted` - Count of successfully completed workflows
- `WorkflowFailed` - Count of failed workflows
- `WorkflowDuration` - Average workflow completion time (milliseconds)

### Analysis Metrics
- `AnalysisStarted` - Count of initiated MISRA analyses
- `AnalysisCompleted` - Count of completed analyses
- `AnalysisFailed` - Count of failed analyses
- `AnalysisDuration` - Average analysis time (milliseconds)
- `ComplianceScore` - Average compliance percentage
- `ViolationsDetected` - Total violations found
- `RulesProcessed` - Number of MISRA rules evaluated

### Authentication Metrics
- `AuthenticationAttempts` - Total authentication attempts
- `AuthenticationSuccess` - Successful authentications
- `AuthenticationFailure` - Failed authentications
- `OTPVerificationSuccess` - Successful OTP verifications
- `OTPVerificationFailure` - Failed OTP verifications

### File Operation Metrics
- `FileUploads` - Count of file uploads
- `FileUploadSize` - Average file size (bytes)
- `FileUploadDuration` - Average upload time (milliseconds)

### System Health Metrics
- `SystemHealth` - Overall system health score (0-1)
- `ErrorRate` - Percentage of requests resulting in errors
- `OperationDuration` - Performance metrics for various operations
- `SecurityEvents` - Count of security-related events

## Dashboards

### Main Dashboard: `MISRA-Platform-{environment}`

The dashboard includes the following widgets:

1. **Workflow Overview**
   - Workflow starts, completions, and failures
   - Success rate calculation
   - Average workflow duration

2. **Analysis Performance**
   - Analysis metrics and duration
   - Compliance score trends
   - Violations detected over time

3. **Authentication Metrics**
   - Authentication attempts and success rates
   - OTP verification statistics

4. **API Gateway Metrics**
   - Request counts and error rates
   - Latency metrics

5. **Lambda Function Metrics**
   - Invocations, errors, and duration for each function
   - Memory utilization

6. **System Health**
   - Overall health score
   - Error rate trends
   - File operation statistics

### Dashboard URL
Access the dashboard at:
```
https://{region}.console.aws.amazon.com/cloudwatch/home?region={region}#dashboards:name=MISRA-Platform-{environment}
```

## Alarms

### Environment-Specific Thresholds

| Metric | Production | Staging | Development |
|--------|------------|---------|-------------|
| Error Rate | 5% | 10% | 20% |
| Workflow Failure Rate | 10% | 20% | 30% |
| Analysis Duration | 60s | 90s | 120s |
| API Latency | 5s | 10s | 15s |
| Lambda Duration | 30s | 45s | 60s |
| Auth Failures | 10/5min | 20/5min | 50/5min |

### Alarm Actions
- **Production**: SNS notifications to operations team
- **Staging**: SNS notifications to development team
- **Development**: Alarms disabled by default

### Key Alarms
1. **High Error Rate** - Triggers when error rate exceeds threshold
2. **Workflow Failure Rate** - Monitors autonomous workflow success
3. **Analysis Duration** - Ensures analyses complete within SLA
4. **API Gateway 5XX Errors** - Detects server-side issues
5. **Lambda Function Errors** - Per-function error monitoring
6. **Authentication Failures** - Security monitoring

## Structured Logging

### Log Format
All logs use JSON format with the following structure:
```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "INFO",
  "message": "Workflow step completed",
  "environment": "production",
  "correlationId": "1705312200000-abc123def",
  "requestId": "aws-request-id",
  "userId": "user-123",
  "step": "analysis",
  "status": "completed",
  "duration": 25000,
  "analysisId": "analysis-456"
}
```

### Correlation ID Tracing
- Correlation IDs are automatically generated for each request
- IDs are propagated through the entire workflow
- Use correlation IDs to trace complete request flows

### Log Levels
- **DEBUG**: Detailed debugging information (dev only)
- **INFO**: General information and workflow progress
- **WARN**: Warning conditions and recoverable errors
- **ERROR**: Error conditions requiring attention

## CloudWatch Insights Queries

### Pre-configured Queries

1. **Workflow Errors**
   ```sql
   fields @timestamp, @message, correlationId, step, error, userId
   | filter @message like /ERROR/
   | filter step exists
   | sort @timestamp desc
   | limit 100
   ```

2. **Analysis Performance**
   ```sql
   fields @timestamp, @message, analysisId, duration, complianceScore, rulesProcessed
   | filter @message like /Analysis completed/ or @message like /Analysis progress/
   | stats avg(duration), min(duration), max(duration), count() by bin(5m)
   | sort @timestamp desc
   ```

3. **Authentication Issues**
   ```sql
   fields @timestamp, @message, userId, email, correlationId, authEvent, success
   | filter @message like /Authentication/ and success = false
   | sort @timestamp desc
   | limit 50
   ```

4. **Correlation ID Tracing**
   ```sql
   fields @timestamp, @message, correlationId, step, operation, duration
   | filter correlationId = "REPLACE_WITH_CORRELATION_ID"
   | sort @timestamp asc
   ```

5. **Security Events**
   ```sql
   fields @timestamp, @message, securityEvent, severity, userId, sourceIp
   | filter securityEvent exists
   | filter severity in ["HIGH", "CRITICAL"]
   | sort @timestamp desc
   | limit 100
   ```

## Implementation Usage

### Lambda Function Integration

```typescript
import { withCorrelation } from '../middleware/correlation-middleware';
import { structuredLogger } from '../utils/structured-logger';

export const handler = withCorrelation(async (event, context, correlationContext) => {
  const startTime = Date.now();
  
  try {
    // Log workflow step start
    structuredLogger.logWorkflowStep('analysis', 'started', correlationContext);
    
    // Perform analysis
    const result = await performAnalysis(event.fileId);
    
    // Log completion with metrics
    const duration = Date.now() - startTime;
    structuredLogger.logPerformance('analysis', duration, true, correlationContext);
    structuredLogger.logComplianceScore(result.score, result.analysisId, result.violations.length, correlationContext);
    
    return {
      statusCode: 200,
      body: JSON.stringify(result),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    structuredLogger.log('ERROR', 'Analysis failed', {
      ...correlationContext,
      error: error.message,
      duration,
    });
    
    throw error;
  }
});
```

### Custom Metrics Recording

```typescript
import { structuredLogger } from '../utils/structured-logger';

// Record workflow metrics
await structuredLogger.recordMetric({
  metricName: 'WorkflowCompleted',
  value: 1,
  unit: 'Count',
  dimensions: {
    Environment: process.env.ENVIRONMENT,
    WorkflowType: 'autonomous',
  },
});

// Record performance metrics
structuredLogger.logPerformance('file-upload', uploadDuration, true, {
  correlationId,
  fileId,
  fileSize,
});
```

## Monitoring Best Practices

### 1. Correlation ID Usage
- Always include correlation IDs in logs
- Use correlation IDs to trace complete workflows
- Include correlation IDs in error responses

### 2. Metric Dimensions
- Use consistent dimension names across metrics
- Include environment in all custom metrics
- Add relevant business dimensions (user type, operation type)

### 3. Log Structured Data
- Use JSON format for all application logs
- Include relevant context in log entries
- Avoid logging sensitive information

### 4. Alert Tuning
- Set appropriate thresholds for each environment
- Use multiple evaluation periods to reduce false positives
- Include runbooks in alarm descriptions

### 5. Dashboard Organization
- Group related metrics together
- Use consistent time ranges across widgets
- Include both technical and business metrics

## Troubleshooting

### Common Issues

1. **Missing Metrics**
   - Check Lambda function permissions for CloudWatch
   - Verify environment variables are set correctly
   - Ensure metrics are being published with correct namespace

2. **Log Group Access Issues**
   - Verify IAM permissions for log group creation
   - Check log retention policies
   - Ensure log groups exist before Lambda execution

3. **Alarm False Positives**
   - Adjust evaluation periods and thresholds
   - Check for missing data handling
   - Review alarm history for patterns

4. **Dashboard Loading Issues**
   - Verify metric names and dimensions
   - Check time range settings
   - Ensure proper IAM permissions for CloudWatch

### Debugging Steps

1. **Check CloudWatch Logs**
   - Use CloudWatch Insights queries
   - Filter by correlation ID for request tracing
   - Look for ERROR level messages

2. **Verify Metrics**
   - Check CloudWatch Metrics console
   - Verify metric dimensions and values
   - Look for gaps in metric data

3. **Test Alarms**
   - Use CloudWatch alarm testing
   - Check SNS topic subscriptions
   - Verify alarm actions are configured

## Cost Optimization

### Log Management
- Set appropriate retention periods
- Use log filtering to reduce volume
- Archive old logs to S3 if needed

### Metrics Optimization
- Batch metric publishing when possible
- Use appropriate metric resolution
- Avoid high-cardinality dimensions

### Dashboard Efficiency
- Limit number of widgets per dashboard
- Use appropriate time ranges
- Cache dashboard data when possible

## Security Considerations

### Log Security
- Never log sensitive data (passwords, tokens, PII)
- Use log encryption at rest
- Implement proper access controls

### Metric Security
- Use IAM policies to control metric access
- Encrypt metric data in transit
- Monitor for unusual metric patterns

### Alarm Security
- Secure SNS topics with proper permissions
- Use encrypted SNS messages
- Monitor alarm configuration changes

## Maintenance

### Regular Tasks
- Review and update alarm thresholds
- Clean up old log groups and metrics
- Update dashboard widgets as needed
- Review CloudWatch costs monthly

### Monitoring Health
- Monitor CloudWatch service health
- Check for failed metric publications
- Verify alarm notification delivery
- Test dashboard functionality

## Support and Documentation

### Additional Resources
- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [CloudWatch Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [CloudWatch Metrics and Dimensions](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html)

### Team Contacts
- **Operations Team**: ops@company.com (production alerts)
- **Development Team**: dev@company.com (staging/dev alerts)
- **Platform Team**: platform@company.com (infrastructure issues)