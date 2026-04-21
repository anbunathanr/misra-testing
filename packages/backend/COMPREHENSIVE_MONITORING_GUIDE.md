# Comprehensive Monitoring Guide - MISRA Platform

## Overview

This guide documents the comprehensive monitoring setup for the MISRA Platform production deployment, including CloudWatch dashboards, custom metrics, alarms, and X-Ray tracing.

## Table of Contents

1. [CloudWatch Dashboard](#cloudwatch-dashboard)
2. [Custom Metrics](#custom-metrics)
3. [Alarms Configuration](#alarms-configuration)
4. [X-Ray Tracing](#x-ray-tracing)
5. [Log Insights Queries](#log-insights-queries)
6. [Integration Guide](#integration-guide)

## CloudWatch Dashboard

### Dashboard Structure

The MISRA Platform dashboard (`MISRA-Platform-{environment}`) provides comprehensive visibility into:

#### 1. Workflow Metrics
- **Workflow Started/Completed/Failed**: Track end-to-end workflow execution
- **Workflow Success Rate**: Calculated metric showing percentage of successful workflows
- **Average Workflow Duration**: Performance tracking for complete workflows

#### 2. Analysis Performance
- **Analysis Operations**: Started, completed, and failed analysis operations
- **Analysis Duration**: Average time to complete MISRA analysis
- **Compliance Scores**: Average compliance scores across all analyses
- **Violations Detected**: Total number of MISRA violations found

#### 3. MISRA Business Logic Metrics
- **Rules Processed**: Number of MISRA rules evaluated
- **Cache Hit Rate**: Efficiency of analysis result caching
- **Analysis Success Rate**: Percentage of successful analyses
- **Average Compliance Score**: Overall code quality metric

#### 4. Authentication Metrics
- **Authentication Attempts/Success/Failure**: Track login activity
- **OTP Verification**: Success and failure rates for OTP verification

#### 5. API Gateway Metrics
- **Request Count**: Total API requests
- **4XX/5XX Errors**: Client and server error rates
- **Latency**: API response times
- **Integration Latency**: Backend processing time

#### 6. Lambda Function Metrics
Individual widgets for each Lambda function showing:
- **Invocations**: Number of function calls
- **Errors**: Function execution errors
- **Throttles**: Concurrency limit hits
- **Duration**: Execution time

#### 7. DynamoDB Performance
- **Read/Write Latency**: Database operation performance
- **Throttles**: Capacity limit hits

#### 8. File Operations
- **File Uploads**: Number of files uploaded
- **Upload Size**: Average file size
- **Upload Duration**: Time to upload files
- **Processing Errors**: File processing failures

#### 9. System Health
- **System Health Score**: Overall system health (0-100)
- **Error Rate**: Percentage of failed operations
- **Cold Starts**: Lambda cold start occurrences
- **Performance Trends**: Historical system performance

## Custom Metrics

### Namespace: `MISRA/Platform`

All custom metrics are published to the `MISRA/Platform` namespace for easy filtering and organization.

### Workflow Metrics

```typescript
// Record workflow start
await recordMetric('WorkflowStarted', 1, 'Count', {
  Environment: 'production',
  UserId: userId
});

// Record workflow completion
await recordMetric('WorkflowCompleted', 1, 'Count', {
  Environment: 'production',
  UserId: userId
});

// Record workflow duration
await recordMetric('WorkflowDuration', durationMs, 'Milliseconds', {
  Environment: 'production'
});
```

### Analysis Metrics

```typescript
// Record analysis completion with business metrics
await metricsCollector.recordAnalysisMetrics(
  fileType,        // 'C' or 'C++'
  rulesChecked,    // Number of rules evaluated
  violationsFound, // Number of violations detected
  complianceScore, // Percentage (0-100)
  duration,        // Milliseconds
  correlationId    // For tracing
);
```

### Authentication Metrics

```typescript
// Record authentication attempt
await metricsCollector.recordAuthMetrics(
  'login',         // Operation type
  true,            // Success
  true,            // MFA enabled
  correlationId    // For tracing
);
```

### File Operation Metrics

```typescript
// Record file upload
await recordMetric('FileUploads', 1, 'Count', {
  Environment: 'production',
  FileType: fileExtension
});

await recordMetric('FileUploadSize', fileSizeBytes, 'Bytes');
await recordMetric('FileUploadDuration', durationMs, 'Milliseconds');
```

### DynamoDB Operation Metrics

```typescript
// Record DynamoDB operation
await recordMetric('DynamoDBReadLatency', latencyMs, 'Milliseconds', {
  TableName: 'misra-platform-users-production',
  Operation: 'GetItem'
});

// Record throttling
await recordMetric('DynamoDBThrottles', 1, 'Count', {
  TableName: tableName
});
```

### System Health Metrics

```typescript
// Record system health score (0-100)
await recordMetric('SystemHealth', healthScore, 'None');

// Record error rate (percentage)
await recordMetric('ErrorRate', errorPercentage, 'Percent');

// Record cold starts
await recordMetric('ColdStarts', 1, 'Count', {
  FunctionName: functionName
});
```

## Alarms Configuration

### Environment-Specific Thresholds

#### Production
- Error Rate: 5%
- Workflow Failure Rate: 10%
- Analysis Duration: 60 seconds
- API Latency: 5 seconds
- Lambda Duration: 30 seconds
- Auth Failures: 10 per 5 minutes

#### Staging
- Error Rate: 10%
- Workflow Failure Rate: 20%
- Analysis Duration: 90 seconds
- API Latency: 10 seconds
- Lambda Duration: 45 seconds
- Auth Failures: 20 per 5 minutes

#### Development
- Alarms disabled (monitoring only)

### Critical Alarms

#### 1. High Error Rate
- **Metric**: `ErrorRate`
- **Threshold**: 5% (production)
- **Action**: SNS notification to operations team

#### 2. Workflow Failure Rate
- **Metric**: `(WorkflowFailed / WorkflowStarted) * 100`
- **Threshold**: 10% (production)
- **Action**: SNS notification

#### 3. Analysis Duration
- **Metric**: `AnalysisDuration`
- **Threshold**: 60 seconds (production)
- **Action**: SNS notification

#### 4. API Gateway 5XX Errors
- **Metric**: `AWS/ApiGateway 5XXError`
- **Threshold**: 5 errors in 5 minutes (production)
- **Action**: SNS notification

#### 5. API Gateway High Latency
- **Metric**: `AWS/ApiGateway Latency`
- **Threshold**: 5 seconds (production)
- **Action**: SNS notification

#### 6. DynamoDB Throttling
- **Metric**: `DynamoDBThrottles`
- **Threshold**: 1 occurrence
- **Action**: Immediate SNS notification

#### 7. File Processing Errors
- **Metric**: `FileProcessingErrors`
- **Threshold**: 5 errors in 5 minutes (production)
- **Action**: SNS notification

#### 8. Lambda Function Errors
- **Per-function metric**: `AWS/Lambda Errors`
- **Threshold**: 3 errors in 5 minutes (production)
- **Action**: SNS notification

#### 9. Lambda Throttling
- **Per-function metric**: `AWS/Lambda Throttles`
- **Threshold**: 1 occurrence
- **Action**: Immediate SNS notification

#### 10. Authentication Failures
- **Metric**: `AuthenticationFailure`
- **Threshold**: 10 failures in 5 minutes (production)
- **Action**: SNS notification (potential security issue)

#### 11. Compliance Score Degradation
- **Metric**: `ComplianceScore`
- **Threshold**: < 50% average
- **Action**: SNS notification (code quality concern)

## X-Ray Tracing

### Overview

X-Ray tracing is enabled for all Lambda functions in production to provide distributed tracing across the entire request flow.

### Configuration

```typescript
// Lambda function configuration
{
  tracing: lambda.Tracing.ACTIVE,
  environment: {
    AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
    AWS_XRAY_TRACING_NAME: 'MISRA-Platform',
    AWS_XRAY_DEBUG_MODE: 'false',
    ENABLE_XRAY_TRACING: 'true'
  }
}
```

### Usage in Lambda Functions

#### Basic Tracing

```typescript
import { getXRayTracer } from '../utils/xray-util';

const tracer = getXRayTracer();

// Trace an operation
await tracer.traceOperation(
  'ProcessAnalysis',
  async () => {
    // Your operation code
    return await processAnalysis(fileId);
  },
  { fileId, userId },  // Metadata
  { fileId, service: 'analysis' }  // Annotations
);
```

#### Trace MISRA Analysis

```typescript
await tracer.traceAnalysis(
  analysisId,
  fileType,
  async () => {
    return await performMisraAnalysis(fileContent);
  }
);
```

#### Trace File Upload

```typescript
await tracer.traceFileUpload(
  fileId,
  fileName,
  fileSize,
  async () => {
    return await uploadToS3(file);
  }
);
```

#### Trace DynamoDB Operations

```typescript
await tracer.traceDynamoDBOperation(
  'misra-platform-users-production',
  'GetItem',
  async () => {
    return await dynamodb.get(params).promise();
  }
);
```

#### Trace Authentication

```typescript
await tracer.traceAuth(
  userId,
  'login',
  async () => {
    return await authenticateUser(credentials);
  }
);
```

#### Using Decorators

```typescript
import { withXRayTracing } from '../utils/xray-util';

class AnalysisService {
  @withXRayTracing('AnalyzeFile')
  async analyzeFile(fileId: string): Promise<AnalysisResult> {
    // Method automatically traced
    return await this.performAnalysis(fileId);
  }
}
```

### X-Ray Service Map

The X-Ray service map shows:
- API Gateway → Lambda functions
- Lambda → DynamoDB tables
- Lambda → S3 buckets
- Lambda → Other AWS services
- Request flow with latency at each hop
- Error rates per service

### Trace Analysis

Use X-Ray console to:
1. View end-to-end request traces
2. Identify performance bottlenecks
3. Analyze error patterns
4. Track service dependencies
5. Monitor distributed transactions

## Log Insights Queries

### Pre-configured Queries

#### 1. Workflow Errors
```
fields @timestamp, @message, correlationId, step, error, userId
| filter @message like /ERROR/
| filter step exists
| sort @timestamp desc
| limit 100
```

#### 2. Analysis Performance
```
fields @timestamp, @message, analysisId, duration, complianceScore, rulesProcessed
| filter @message like /Analysis completed/ or @message like /Analysis progress/
| stats avg(duration), min(duration), max(duration), count() by bin(5m)
| sort @timestamp desc
```

#### 3. Authentication Issues
```
fields @timestamp, @message, userId, email, correlationId, authEvent, success
| filter @message like /Authentication/ and success = false
| sort @timestamp desc
| limit 50
```

#### 4. OTP Verification Tracking
```
fields @timestamp, @message, userId, correlationId, success, step
| filter @message like /OTP/ or step like /otp/
| sort @timestamp desc
| limit 100
```

#### 5. File Upload Issues
```
fields @timestamp, @message, fileId, fileName, fileSize, duration, error
| filter @message like /upload/ and (@message like /error/ or @message like /failed/ or duration > 10000)
| sort @timestamp desc
| limit 50
```

#### 6. Compliance Score Analysis
```
fields @timestamp, complianceScore, violationCount, analysisId
| filter complianceScore exists
| stats avg(complianceScore), min(complianceScore), max(complianceScore), count() by bin(1h)
| sort @timestamp desc
```

#### 7. Correlation ID Tracing
```
fields @timestamp, @message, correlationId, step, operation, duration
| filter correlationId = "REPLACE_WITH_CORRELATION_ID"
| sort @timestamp asc
```

#### 8. Security Events
```
fields @timestamp, @message, securityEvent, severity, userId, sourceIp
| filter securityEvent exists
| filter severity in ["HIGH", "CRITICAL"]
| sort @timestamp desc
| limit 100
```

## Integration Guide

### Step 1: Import Utilities

```typescript
import { getMetricsCollector } from '../utils/metrics-util';
import { getXRayTracer } from '../utils/xray-util';
import { createLogger } from '../utils/logger';
```

### Step 2: Initialize in Lambda Handler

```typescript
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const correlationId = event.headers['X-Correlation-ID'] || generateCorrelationId();
  const logger = createLogger('analyze-file', { correlationId });
  const metrics = getMetricsCollector();
  const tracer = getXRayTracer();

  // Add correlation ID to X-Ray
  tracer.addAnnotation('correlationId', correlationId);

  try {
    // Your business logic with tracing
    const result = await tracer.traceAnalysis(
      analysisId,
      fileType,
      async () => {
        // Record start metric
        await metrics.recordMetric('AnalysisStarted', 1, 'Count');
        
        // Perform analysis
        const analysisResult = await performAnalysis(fileContent);
        
        // Record completion metrics
        await metrics.recordAnalysisMetrics(
          fileType,
          analysisResult.rulesChecked,
          analysisResult.violations.length,
          analysisResult.complianceScore,
          analysisResult.duration,
          correlationId
        );
        
        return analysisResult;
      }
    );

    logger.info('Analysis completed successfully', {
      analysisId,
      complianceScore: result.complianceScore
    });

    return {
      statusCode: 200,
      headers: { 'X-Correlation-ID': correlationId },
      body: JSON.stringify(result)
    };

  } catch (error) {
    logger.error('Analysis failed', error as Error);
    tracer.recordError(error as Error);
    await metrics.recordMetric('AnalysisFailed', 1, 'Count');

    return {
      statusCode: 500,
      headers: { 'X-Correlation-ID': correlationId },
      body: JSON.stringify({ error: 'Analysis failed', correlationId })
    };
  }
};
```

### Step 3: Configure Environment Variables

Ensure Lambda functions have these environment variables:

```typescript
{
  // Logging
  LOG_LEVEL: 'INFO',
  ENABLE_STRUCTURED_LOGGING: 'true',
  CORRELATION_ID_HEADER: 'X-Correlation-ID',
  
  // Metrics
  CLOUDWATCH_NAMESPACE: 'MISRA/Platform',
  ENABLE_CUSTOM_METRICS: 'true',
  METRICS_BUFFER_SIZE: '10',
  METRICS_FLUSH_INTERVAL: '30000',
  
  // X-Ray
  ENABLE_XRAY_TRACING: 'true',
  AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
  AWS_XRAY_TRACING_NAME: 'MISRA-Platform',
  
  // Environment
  ENVIRONMENT: 'production'
}
```

## Best Practices

### 1. Correlation IDs
- Always propagate correlation IDs across service boundaries
- Include correlation ID in all logs and metrics
- Use correlation ID for end-to-end request tracing

### 2. Metric Dimensions
- Use consistent dimension names across metrics
- Include environment in all metrics
- Add operation-specific dimensions for filtering

### 3. Error Handling
- Always record errors in both logs and metrics
- Include error details in X-Ray traces
- Set appropriate alarm thresholds

### 4. Performance Monitoring
- Track duration for all critical operations
- Monitor cold starts and optimize as needed
- Set realistic performance thresholds

### 5. Cost Optimization
- Use metric buffering to reduce API calls
- Set appropriate log retention periods
- Monitor CloudWatch costs regularly

## Troubleshooting

### High Error Rates
1. Check CloudWatch Logs for error details
2. Use correlation ID to trace failed requests
3. Review X-Ray service map for bottlenecks
4. Check alarm history for patterns

### Performance Issues
1. Review Lambda duration metrics
2. Check DynamoDB throttling
3. Analyze X-Ray traces for slow operations
4. Review API Gateway latency metrics

### Missing Metrics
1. Verify environment variables are set
2. Check IAM permissions for CloudWatch
3. Review Lambda logs for metric errors
4. Ensure metrics are being flushed

### X-Ray Traces Not Appearing
1. Verify X-Ray is enabled on Lambda
2. Check IAM permissions for X-Ray
3. Ensure X-Ray SDK is properly initialized
4. Review Lambda logs for X-Ray errors

## Monitoring Checklist

- [ ] CloudWatch dashboard created and accessible
- [ ] All custom metrics publishing successfully
- [ ] Alarms configured and tested
- [ ] SNS topic subscribed for alerts
- [ ] X-Ray tracing enabled on all Lambda functions
- [ ] Log Insights queries saved in console
- [ ] Correlation IDs propagating correctly
- [ ] Performance baselines established
- [ ] Alert thresholds validated
- [ ] Team trained on monitoring tools

## Additional Resources

- [AWS CloudWatch Documentation](https://docs.aws.amazon.com/cloudwatch/)
- [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/)
- [CloudWatch Logs Insights Query Syntax](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html)
- [X-Ray SDK for Node.js](https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-nodejs.html)
