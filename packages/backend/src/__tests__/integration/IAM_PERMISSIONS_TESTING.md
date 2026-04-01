# IAM Permissions Testing Guide

## Overview

This guide explains how to run IAM permission tests for the Bedrock migration. These tests validate that Lambda functions have the correct IAM permissions to:

1. **Invoke Bedrock Models**: Lambda can call the authorized Claude 3.5 Sonnet model
2. **Access Restrictions**: Lambda cannot invoke unauthorized models
3. **CloudWatch Logs**: Lambda can write logs to CloudWatch

## Prerequisites

### 1. Deploy Infrastructure

The Lambda functions must be deployed to AWS before running these tests:

```bash
cd packages/backend
npm run build
cdk deploy
```

### 2. Configure AWS Credentials

Set up AWS credentials using one of these methods:

**Option A: Environment Variables**
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

**Option B: AWS Profile**
```bash
export AWS_PROFILE=your_profile_name
export AWS_REGION=us-east-1
```

**Option C: AWS CLI Configuration**
```bash
aws configure
# Follow prompts to enter credentials
```

### 3. Verify Bedrock Access

Ensure your AWS account has access to Claude 3.5 Sonnet:

```bash
aws bedrock list-foundation-models --region us-east-1 \
  --query 'modelSummaries[?contains(modelId, `claude-3-5-sonnet`)]'
```

## Running the Tests

### Run All IAM Permission Tests

```bash
cd packages/backend
npm test -- iam-permissions.test.ts
```

### Run Specific Test Suites

**Test Lambda Configuration:**
```bash
npm test -- iam-permissions.test.ts -t "Lambda Function Configuration"
```

**Test Bedrock Permissions:**
```bash
npm test -- iam-permissions.test.ts -t "Bedrock InvokeModel Permissions"
```

**Test CloudWatch Logs:**
```bash
npm test -- iam-permissions.test.ts -t "CloudWatch Logs Permissions"
```

**Test IAM Policy Validation:**
```bash
npm test -- iam-permissions.test.ts -t "IAM Policy Validation"
```

### Skip Tests in CI

To skip IAM tests in CI/CD pipelines:

```bash
export SKIP_IAM_TESTS=true
npm test
```

## Test Coverage

### 1. Lambda Function Configuration

**Tests:**
- ✅ Verify AI Lambda functions exist
- ✅ Verify Lambda functions have execution roles

**What it validates:**
- Lambda functions are deployed correctly
- Each function has an IAM execution role
- Functions are using Node.js runtime

### 2. Bedrock InvokeModel Permissions

**Tests:**
- ✅ Verify Lambda can invoke authorized Bedrock model
- ✅ Verify IAM policy includes bedrock:InvokeModel permission
- ✅ Verify Lambda cannot invoke unauthorized models

**What it validates:**
- Lambda can successfully call Claude 3.5 Sonnet
- IAM policy grants `bedrock:InvokeModel` action
- IAM policy restricts access to specific model ARN
- Unauthorized models are properly denied

### 3. CloudWatch Logs Permissions

**Tests:**
- ✅ Verify Lambda can write to CloudWatch Logs
- ✅ Verify Lambda logs contain execution details
- ✅ Verify all AI Lambda functions have log groups

**What it validates:**
- Lambda can create log groups
- Lambda can create log streams
- Lambda can write log events
- Logs contain START/END execution markers

### 4. IAM Policy Validation

**Tests:**
- ✅ Verify Lambda execution role has required permissions
- ✅ Verify IAM policy follows least privilege principle

**What it validates:**
- Lambda has AWSLambdaBasicExecutionRole or equivalent
- No overly permissive policies (AdministratorAccess, PowerUserAccess)
- Role follows AWS security best practices

## Expected Results

### Successful Test Run

```
🔐 Starting IAM Permissions Tests
⚠️  These tests validate IAM permissions in deployed AWS environment
📍 Region: us-east-1
🔧 Testing functions: aibts-ai-analyze, aibts-ai-generate, aibts-ai-batch

✅ AI_ANALYZE function exists: aibts-ai-analyze
   Role: arn:aws:iam::123456789012:role/MisraPlatformStack-AIAnalyzeFunctionRole...
✅ AI_GENERATE function exists: aibts-ai-generate
   Role: arn:aws:iam::123456789012:role/MisraPlatformStack-AIGenerateTestFunctionRole...
✅ AI_BATCH function exists: aibts-ai-batch
   Role: arn:aws:iam::123456789012:role/MisraPlatformStack-AIBatchGenerateFunctionRole...

✅ Lambda can invoke authorized Bedrock model
   Model: anthropic.claude-3-5-sonnet-20241022-v2:0
✅ Found bedrock:InvokeModel in policy: BedrockInvokeModelPolicy
✅ Lambda correctly denied access to unauthorized model
   Unauthorized model: anthropic.claude-3-opus-20240229-v1:0

✅ Lambda can write to CloudWatch Logs
   Log group: /aws/lambda/aibts-ai-generate
   Latest stream: 2024/01/15/[$LATEST]abc123...
   Last event: 2024-01-15T10:30:45.123Z
✅ Lambda logs contain execution details
   Found 25 log events in last 5 minutes

✅ Lambda role has 3 attached policies
   - AWSLambdaBasicExecutionRole (arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole)
   - BedrockInvokeModelPolicy (arn:aws:iam::123456789012:policy/BedrockInvokeModelPolicy)
   - DynamoDBAccessPolicy (arn:aws:iam::123456789012:policy/DynamoDBAccessPolicy)
✅ Lambda has AWSLambdaBasicExecutionRole (CloudWatch Logs permissions)
✅ Lambda role follows least privilege principle
   No administrator or power user policies attached

📊 IAM Permissions Test Coverage:
✅ Lambda Function Configuration - Verified functions exist
✅ Bedrock InvokeModel Permissions - Verified authorized access
✅ Unauthorized Model Access - Verified access restrictions
✅ CloudWatch Logs Permissions - Verified log writing
✅ IAM Policy Validation - Verified least privilege

🔐 All IAM permissions validated successfully
```

## Troubleshooting

### Error: Lambda function not found

**Problem:** `ResourceNotFoundException: Function not found`

**Solution:**
1. Verify CDK stack is deployed: `cdk list`
2. Check function names match: `aws lambda list-functions`
3. Set correct function names:
   ```bash
   export AI_ANALYZE_FUNCTION=your-analyze-function-name
   export AI_GENERATE_FUNCTION=your-generate-function-name
   export AI_BATCH_FUNCTION=your-batch-function-name
   ```

### Error: AccessDeniedException

**Problem:** `AccessDeniedException: User is not authorized to perform: lambda:GetFunction`

**Solution:**
1. Verify AWS credentials are configured
2. Ensure IAM user/role has permissions to:
   - `lambda:GetFunction`
   - `lambda:InvokeFunction`
   - `iam:GetRole`
   - `iam:ListAttachedRolePolicies`
   - `logs:DescribeLogStreams`
   - `logs:FilterLogEvents`

### Error: Log group not found

**Problem:** `ResourceNotFoundException: Log group does not exist`

**Solution:**
1. Invoke Lambda function at least once to create log group
2. Wait a few seconds for logs to propagate
3. Verify log group exists:
   ```bash
   aws logs describe-log-groups --log-group-name-prefix /aws/lambda/aibts-ai
   ```

### Warning: Could not verify bedrock:InvokeModel

**Problem:** Test shows warning about not finding Bedrock permission

**Solution:**
This is usually not a problem. The permission may be in:
- An inline policy (not readable via API)
- An AWS managed policy (not readable via API)
- A custom policy with restricted read access

To verify manually:
```bash
# Get Lambda role
ROLE_ARN=$(aws lambda get-function --function-name aibts-ai-generate --query 'Configuration.Role' --output text)
ROLE_NAME=$(echo $ROLE_ARN | cut -d'/' -f2)

# List attached policies
aws iam list-attached-role-policies --role-name $ROLE_NAME

# Get inline policies
aws iam list-role-policies --role-name $ROLE_NAME
```

### Warning: Lambda can invoke unauthorized models

**Problem:** Test shows Lambda can access models it shouldn't

**Solution:**
This indicates the IAM policy is too permissive. Update the CDK stack:

```typescript
const bedrockPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['bedrock:InvokeModel'],
  resources: [
    // Restrict to specific model ARN
    `arn:aws:bedrock:${this.region}::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
  ],
});
```

Then redeploy:
```bash
cdk deploy
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: IAM Permissions Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  iam-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: |
          cd packages/backend
          npm install
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Run IAM permission tests
        run: |
          cd packages/backend
          npm test -- iam-permissions.test.ts
        env:
          AWS_REGION: us-east-1
          SKIP_IAM_TESTS: false
```

### Skip Tests in CI

If you want to skip IAM tests in CI but run them locally:

```yaml
- name: Run IAM permission tests
  run: |
    cd packages/backend
    npm test -- iam-permissions.test.ts
  env:
    SKIP_IAM_TESTS: true  # Skip in CI
```

## Security Considerations

### 1. Least Privilege

The tests verify that Lambda functions have only the permissions they need:
- ✅ `bedrock:InvokeModel` for specific model only
- ✅ `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- ✅ `dynamodb:PutItem`, `dynamodb:Query` for usage tracking
- ❌ No `bedrock:*` wildcard permissions
- ❌ No administrator access

### 2. Resource Restrictions

IAM policies should restrict resources:
```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

Not:
```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "*"  // Too permissive!
}
```

### 3. Audit Logging

All Bedrock API calls are logged in CloudTrail. Enable CloudTrail if not already:
```bash
aws cloudtrail create-trail --name bedrock-audit --s3-bucket-name your-audit-bucket
aws cloudtrail start-logging --name bedrock-audit
```

## Cost Considerations

### Test Costs

Running IAM permission tests incurs minimal costs:
- **Lambda Invocations**: ~$0.0000002 per invocation
- **CloudWatch Logs**: ~$0.50 per GB ingested (first 5GB free)
- **Bedrock API Calls**: ~$0.01 per test run (if Bedrock is invoked)

**Total estimated cost per test run: < $0.02**

### Optimization

To minimize costs:
1. Run tests only when IAM policies change
2. Skip tests in CI for non-infrastructure changes
3. Use `SKIP_IAM_TESTS=true` for unit test runs

## References

- [AWS Lambda Execution Role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [Amazon Bedrock IAM Permissions](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html)
- [CloudWatch Logs for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)

## Support

If you encounter issues with IAM permission tests:

1. Check the troubleshooting section above
2. Verify AWS credentials and permissions
3. Review CloudWatch Logs for Lambda execution errors
4. Check IAM policies in AWS Console
5. Contact the platform team for assistance
