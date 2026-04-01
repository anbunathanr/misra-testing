# Bedrock Migration - IAM Configuration

## Overview

This document describes the IAM permissions configured for the Amazon Bedrock migration (Tasks 5.1, 5.2, 5.3).

## Task 5.1: Bedrock InvokeModel Permissions

### Implementation

Added IAM policy statement to three AI Lambda functions:
- `aibts-ai-analyze` (aiAnalyzeFunction)
- `aibts-ai-generate` (aiGenerateTestFunction)
- `aibts-ai-batch` (aiBatchGenerateFunction)

### Policy Details

```typescript
const bedrockPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['bedrock:InvokeModel'],
  resources: [
    'arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0',
  ],
});
```

### Security Notes

- **Least Privilege**: Policy is restricted to only the Claude 3.5 Sonnet model
- **Model ARN**: `arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`
- **Region Wildcard**: Uses `*` for region to allow flexibility in deployment regions
- **Action**: Only `bedrock:InvokeModel` is granted (no model management permissions)

## Task 5.2: AWS SDK Default Credential Provider

### Implementation

✅ **No BEDROCK_API_KEY environment variable is used**

The BedrockEngine implementation uses the AWS SDK default credential provider chain:

```typescript
this.client = new BedrockRuntimeClient({
  region: this.region,
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: timeout,
  },
});
```

### Credential Provider Chain

The AWS SDK automatically uses the following credential sources in order:
1. **Lambda Execution Role** (primary for our use case)
2. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
3. EC2 instance metadata service
4. ECS task role

For Lambda functions, the execution role's IAM permissions are automatically used.

### Benefits

- **No Secret Management**: No API keys to rotate or secure
- **Automatic Rotation**: IAM role credentials are automatically rotated by AWS
- **Audit Trail**: All API calls are logged in CloudTrail with the IAM role identity
- **Fine-Grained Control**: Permissions can be managed per Lambda function

## Task 5.3: CloudWatch Logs Permissions

### Implementation

✅ **CloudWatch Logs permissions are automatically granted by AWS CDK**

When CDK creates Lambda functions, it automatically:
1. Creates an IAM execution role for each Lambda function
2. Attaches the `AWSLambdaBasicExecutionRole` managed policy
3. Grants the following permissions:
   - `logs:CreateLogGroup`
   - `logs:CreateLogStream`
   - `logs:PutLogEvents`

### Log Groups

Each Lambda function writes logs to:
- `/aws/lambda/aibts-ai-analyze`
- `/aws/lambda/aibts-ai-generate`
- `/aws/lambda/aibts-ai-batch`

### Verification

To verify CloudWatch Logs permissions after deployment:

```bash
# Check Lambda execution role
aws lambda get-function --function-name aibts-ai-analyze --query 'Configuration.Role'

# Check role policies
aws iam list-attached-role-policies --role-name <role-name>

# View logs
aws logs tail /aws/lambda/aibts-ai-analyze --follow
```

## Deployment

### Prerequisites

1. **Bedrock Model Access**: Ensure your AWS account has access to Claude 3.5 Sonnet
   ```bash
   aws bedrock list-foundation-models --region us-east-1 \
     --query 'modelSummaries[?contains(modelId, `claude-3-5-sonnet`)]'
   ```

2. **IAM Permissions**: The CDK deployment role needs:
   - `iam:CreateRole`
   - `iam:AttachRolePolicy`
   - `iam:PutRolePolicy`
   - `lambda:CreateFunction`
   - `lambda:UpdateFunctionConfiguration`

### Deploy Changes

```bash
cd packages/backend
npm run build
cdk deploy
```

### Verify Permissions

After deployment, test Bedrock access:

```bash
# Test from AWS CLI
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-5-sonnet-20241022-v2:0 \
  --body '{"anthropic_version":"bedrock-2023-05-31","max_tokens":100,"messages":[{"role":"user","content":"Hello"}]}' \
  --region us-east-1 \
  output.json

# Check Lambda function permissions
aws lambda get-policy --function-name aibts-ai-generate
```

## Troubleshooting

### AccessDeniedException

If you see `AccessDeniedException` when invoking Bedrock:

1. **Check Model Access**:
   ```bash
   aws bedrock list-foundation-models --region us-east-1
   ```

2. **Verify IAM Policy**:
   ```bash
   aws iam get-role-policy --role-name <lambda-role> --policy-name <policy-name>
   ```

3. **Check Region**: Ensure Bedrock is available in your deployment region

### Model Not Found

If you see `ResourceNotFoundException`:

1. Verify the model ID is correct: `anthropic.claude-3-5-sonnet-20241022-v2:0`
2. Check if the model is available in your region
3. Ensure your account has access to the model

### CloudWatch Logs Not Appearing

If logs are not appearing:

1. Check Lambda execution role has CloudWatch Logs permissions
2. Verify log group exists: `/aws/lambda/<function-name>`
3. Check Lambda function timeout (logs may not flush if function times out)

## Security Best Practices

1. **Least Privilege**: Only grant `bedrock:InvokeModel` for specific models
2. **No API Keys**: Use IAM roles instead of API keys
3. **Audit Logging**: Enable CloudTrail to log all Bedrock API calls
4. **Cost Monitoring**: Set up CloudWatch alarms for Bedrock usage costs
5. **Resource Tags**: Tag Lambda functions and IAM roles for cost allocation

## Cost Considerations

### Bedrock Pricing (Claude 3.5 Sonnet)
- Input tokens: $3.00 per 1M tokens
- Output tokens: $15.00 per 1M tokens

### CloudWatch Logs Pricing
- Ingestion: $0.50 per GB
- Storage: $0.03 per GB/month
- First 5GB per month is free

### Recommendations
- Set up CloudWatch alarms for daily Bedrock costs
- Use log retention policies to manage CloudWatch Logs costs
- Monitor token usage in the `ai-usage` DynamoDB table

## References

- [Amazon Bedrock IAM Permissions](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html)
- [AWS SDK Credential Provider Chain](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html)
- [Lambda Execution Role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [CloudWatch Logs for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)
