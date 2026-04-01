# Amazon Bedrock Setup Guide

## Overview

This guide provides step-by-step instructions for setting up and configuring Amazon Bedrock with Claude 3.5 Sonnet for AI-powered test generation in the AIBTS platform.

**Last Updated**: Current Session  
**Target Audience**: DevOps Engineers, System Administrators, Developers

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [IAM Permissions](#iam-permissions)
3. [Environment Variables](#environment-variables)
4. [Bedrock Region Selection](#bedrock-region-selection)
5. [Model Configuration](#model-configuration)
6. [Monitoring Setup](#monitoring-setup)
7. [Testing the Setup](#testing-the-setup)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before setting up Bedrock, ensure you have:

- **AWS Account** with Bedrock access enabled
- **AWS CLI** installed and configured
- **IAM Permissions** to create and manage Lambda functions, IAM roles, and CloudWatch resources
- **CDK** (AWS Cloud Development Kit) installed for infrastructure deployment
- **Node.js 20.x** or later
- **Access to Claude 3.5 Sonnet** model in your AWS region

### Enable Bedrock Access

1. Log in to AWS Console
2. Navigate to Amazon Bedrock service
3. Request access to Claude 3.5 Sonnet model (if not already enabled)
4. Wait for approval (usually instant for most regions)

---

## IAM Permissions

### Required IAM Policy for Lambda Functions

The AI Lambda functions require the following IAM permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

### CDK Automatic Configuration

The CDK stack automatically configures these permissions for the following Lambda functions:

- `aibts-ai-analyze` - Application analysis
- `aibts-ai-generate` - Test generation
- `aibts-ai-batch` - Batch test generation

**File**: `packages/backend/src/infrastructure/misra-platform-stack.ts`

```typescript
// Bedrock permissions are automatically added by CDK
const bedrockPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['bedrock:InvokeModel'],
  resources: [
    'arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0',
  ],
});

aiAnalyzeFunction.addToRolePolicy(bedrockPolicy);
aiGenerateTestFunction.addToRolePolicy(bedrockPolicy);
aiBatchGenerateFunction.addToRolePolicy(bedrockPolicy);
```

### Manual IAM Role Configuration (if needed)

If you're not using CDK, manually attach the policy to your Lambda execution roles:

```bash
# Create policy
aws iam create-policy \
  --policy-name BedrockInvokeModelPolicy \
  --policy-document file://bedrock-policy.json

# Attach to Lambda role
aws iam attach-role-policy \
  --role-name your-lambda-execution-role \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/BedrockInvokeModelPolicy
```

---

## Environment Variables

### Required Environment Variables

Configure the following environment variables for your Lambda functions:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `AI_PROVIDER` | AI provider to use | `BEDROCK` | Yes |
| `BEDROCK_REGION` | AWS region for Bedrock | `us-east-1` | Yes |
| `BEDROCK_MODEL_ID` | Claude model identifier | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Yes |
| `BEDROCK_TIMEOUT` | Request timeout in milliseconds | `30000` | No |
| `ENABLE_BEDROCK_MONITORING` | Enable CloudWatch metrics | `true` | No |

### Setting Environment Variables in CDK

The CDK stack automatically sets these variables:

```typescript
environment: {
  AI_PROVIDER: process.env.AI_PROVIDER || 'BEDROCK',
  BEDROCK_REGION: process.env.BEDROCK_REGION || 'us-east-1',
  BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  BEDROCK_TIMEOUT: process.env.BEDROCK_TIMEOUT || '30000',
  ENABLE_BEDROCK_MONITORING: process.env.ENABLE_BEDROCK_MONITORING || 'true',
}
```

### Setting Environment Variables Manually

If deploying manually, set environment variables via AWS Console or CLI:

```bash
# Update Lambda function environment variables
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={
    AI_PROVIDER=BEDROCK,
    BEDROCK_REGION=us-east-1,
    BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0,
    BEDROCK_TIMEOUT=30000,
    ENABLE_BEDROCK_MONITORING=true
  }"
```

### Local Development

For local development, create a `.env` file:

```bash
# .env file
AI_PROVIDER=BEDROCK
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_TIMEOUT=30000
ENABLE_BEDROCK_MONITORING=true

# AWS credentials (for local testing)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

---

## Bedrock Region Selection

### Supported Regions

Claude 3.5 Sonnet is available in the following AWS regions:

- `us-east-1` (US East - N. Virginia) ✅ **Recommended**
- `us-west-2` (US West - Oregon)
- `ap-southeast-1` (Asia Pacific - Singapore)
- `ap-southeast-2` (Asia Pacific - Sydney)
- `ap-northeast-1` (Asia Pacific - Tokyo)
- `eu-central-1` (Europe - Frankfurt)
- `eu-west-1` (Europe - Ireland)
- `eu-west-2` (Europe - London)
- `eu-west-3` (Europe - Paris)

### Region Selection Criteria

Choose a region based on:

1. **Latency**: Select the region closest to your users
2. **Cost**: Pricing may vary slightly by region
3. **Availability**: Ensure Claude 3.5 Sonnet is available
4. **Compliance**: Consider data residency requirements

### Checking Model Availability

Verify Claude 3.5 Sonnet availability in your region:

```bash
# List available models in a region
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query "modelSummaries[?contains(modelId, 'claude-3-5-sonnet')]"
```

---

## Model Configuration

### Supported Claude Models

The platform supports the following Claude models:

| Model ID | Description | Use Case |
|----------|-------------|----------|
| `anthropic.claude-3-5-sonnet-20241022-v2:0` | Latest Claude 3.5 Sonnet | **Recommended** - Best balance of performance and cost |
| `anthropic.claude-3-5-sonnet-20240620-v1:0` | Previous Claude 3.5 Sonnet | Fallback option |
| `anthropic.claude-3-opus-20240229-v1:0` | Claude 3 Opus | Highest quality, higher cost |
| `anthropic.claude-3-sonnet-20240229-v1:0` | Claude 3 Sonnet | Good balance |
| `anthropic.claude-3-haiku-20240307-v1:0` | Claude 3 Haiku | Fastest, lowest cost |

### Model Parameters

The BedrockEngine uses different parameters for different operations:

| Operation | Temperature | Max Tokens | Use Case |
|-----------|-------------|------------|----------|
| `analyze()` | 0.3 | 2048 | Application analysis (deterministic) |
| `generate()` | 0.7 | 4096 | Test generation (creative) |
| `complete()` | 0.5 | 1024 | Code completion (balanced) |
| `generateTestSpecification()` | 0.7 | 4096 | Test specification (creative) |

### Changing the Model

To use a different Claude model:

1. Update the `BEDROCK_MODEL_ID` environment variable
2. Ensure the model is available in your region
3. Update IAM policy to allow access to the new model ARN
4. Redeploy Lambda functions

```bash
# Update model ID
export BEDROCK_MODEL_ID=anthropic.claude-3-opus-20240229-v1:0

# Redeploy
cdk deploy
```

---

## Monitoring Setup

### CloudWatch Metrics

The platform automatically emits the following CloudWatch metrics:

| Metric Name | Description | Unit | Dimensions |
|-------------|-------------|------|------------|
| `BedrockLatency` | Operation duration | Milliseconds | Operation, Status |
| `BedrockTokens` | Token usage | Count | Operation |
| `BedrockCost` | Operation cost | None (dollars) | Operation |
| `BedrockErrors` | Error count | Count | Operation, ErrorType |

**Namespace**: `AIBTS/Bedrock`

### CloudWatch Alarms

Three alarms are automatically created:

1. **High Error Rate**: Triggers when >10 errors occur in 5 minutes
2. **High Latency**: Triggers when average latency >30 seconds
3. **High Cost**: Triggers when daily cost >$100

### Viewing Metrics

Access metrics via AWS Console:

1. Navigate to CloudWatch → Metrics
2. Select namespace: `AIBTS/Bedrock`
3. View metrics by operation

Or use AWS CLI:

```bash
# Get Bedrock latency metrics
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --dimensions Name=Operation,Value=generate \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average,Maximum
```

### X-Ray Tracing

X-Ray tracing is automatically enabled for all AI Lambda functions. View traces:

1. Navigate to AWS X-Ray → Traces
2. Filter by service: `aibts-ai-generate`
3. View detailed trace maps and timelines

### CloudWatch Logs

All operations are logged to CloudWatch Logs with structured JSON:

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "BedrockEngine",
  "operation": "generate",
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "region": "us-east-1",
  "metrics": {
    "requestTokens": 1500,
    "responseTokens": 2000,
    "totalTokens": 3500,
    "cost": 0.0345,
    "latency": 2500
  },
  "status": "success",
  "circuitState": "CLOSED"
}
```

Query logs using CloudWatch Logs Insights:

```sql
fields @timestamp, operation, metrics.cost, metrics.latency
| filter service = "BedrockEngine"
| stats sum(metrics.cost) as totalCost, avg(metrics.latency) as avgLatency by operation
```

---

## Testing the Setup

### 1. Verify IAM Permissions

Test that Lambda can invoke Bedrock:

```bash
# Invoke test Lambda function
aws lambda invoke \
  --function-name aibts-ai-generate \
  --payload '{"scenario":"Test IAM permissions","context":{"url":"https://example.com"}}' \
  response.json

# Check response
cat response.json
```

### 2. Check CloudWatch Metrics

After invoking Lambda, verify metrics are being emitted:

```bash
# List metrics
aws cloudwatch list-metrics \
  --namespace AIBTS/Bedrock

# Get recent metric data
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockLatency \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

### 3. Verify X-Ray Traces

Check that X-Ray traces are being created:

```bash
# Get trace summaries
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'service("aibts-ai-generate")'
```

### 4. Check CloudWatch Logs

Verify structured logs are being written:

```bash
# Get recent log events
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

### 5. Run Integration Tests

Execute integration tests to verify end-to-end functionality:

```bash
cd packages/backend
npm test -- bedrock-integration.test.ts
```

---

## Troubleshooting

### Common Issues

#### 1. AccessDeniedException: Not authorized to invoke model

**Cause**: IAM role lacks `bedrock:InvokeModel` permission

**Solution**:
```bash
# Verify IAM policy is attached
aws iam list-attached-role-policies --role-name your-lambda-role

# Add Bedrock policy if missing
aws iam attach-role-policy \
  --role-name your-lambda-role \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/BedrockInvokeModelPolicy
```

#### 2. ValidationException: Model not found

**Cause**: Model ID is incorrect or not available in the region

**Solution**:
```bash
# List available models
aws bedrock list-foundation-models --region us-east-1

# Update model ID
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0}"
```

#### 3. ThrottlingException: Rate limit exceeded

**Cause**: Too many requests to Bedrock API

**Solution**:
- Reduce request rate
- Implement exponential backoff (already built-in)
- Request quota increase from AWS Support
- Check circuit breaker state

#### 4. ModelTimeoutException: Request timeout

**Cause**: Request took longer than configured timeout

**Solution**:
```bash
# Increase timeout
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={BEDROCK_TIMEOUT=60000}"
```

#### 5. No metrics appearing in CloudWatch

**Cause**: Missing `cloudwatch:PutMetricData` permission

**Solution**:
```bash
# Add CloudWatch metrics permission
aws iam put-role-policy \
  --role-name your-lambda-role \
  --policy-name CloudWatchMetrics \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": "cloudwatch:PutMetricData",
      "Resource": "*"
    }]
  }'
```

#### 6. Circuit breaker is OPEN

**Cause**: Too many consecutive failures (5+)

**Solution**:
- Wait 60 seconds for circuit to reset to HALF_OPEN
- Check CloudWatch Logs for error details
- Fix underlying issue (IAM, model availability, etc.)
- Circuit will automatically close after successful requests

### Debugging Commands

```bash
# Check Lambda function configuration
aws lambda get-function-configuration --function-name aibts-ai-generate

# View recent errors in CloudWatch Logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --filter-pattern "ERROR"

# Check CloudWatch alarms
aws cloudwatch describe-alarms \
  --alarm-names AIBTS-Bedrock-HighErrorRate

# View X-Ray service map
aws xray get-service-graph \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)
```

### Getting Help

- **AWS Support**: For Bedrock-specific issues
- **GitHub Issues**: For platform-specific issues
- **CloudWatch Logs**: Check `/aws/lambda/aibts-ai-*` log groups
- **X-Ray Console**: View detailed trace information

---

## Next Steps

After completing the setup:

1. Review the [Migration Process Documentation](BEDROCK_MIGRATION_PROCESS.md)
2. Read the [Troubleshooting Guide](BEDROCK_TROUBLESHOOTING_GUIDE.md)
3. Explore [Code Examples](BEDROCK_CODE_EXAMPLES.md)
4. Plan your [Phased Rollout](../design.md#deployment-strategy)

---

## References

- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3.5 Sonnet Model Card](https://www.anthropic.com/claude)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [CloudWatch Metrics Documentation](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/)
- [AWS X-Ray Documentation](https://docs.aws.amazon.com/xray/)
