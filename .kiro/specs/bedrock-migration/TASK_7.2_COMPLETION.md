# Task 7.2 Completion Report: IAM Permissions Testing

## Task Overview

**Task:** 7.2 Test IAM permissions  
**Requirements:** 12.6  
**Status:** ✅ COMPLETED

## Objective

Create integration tests to validate that Lambda functions have the correct IAM permissions for:
1. Invoking authorized Bedrock models
2. Being denied access to unauthorized models
3. Writing to CloudWatch Logs

## Implementation Summary

### Files Created

1. **`packages/backend/src/__tests__/integration/iam-permissions.test.ts`**
   - Comprehensive IAM permission integration tests
   - Tests Lambda function configuration
   - Tests Bedrock InvokeModel permissions
   - Tests CloudWatch Logs permissions
   - Tests IAM policy validation
   - 500+ lines of test code

2. **`packages/backend/src/__tests__/integration/IAM_PERMISSIONS_TESTING.md`**
   - Complete testing guide
   - Prerequisites and setup instructions
   - Test coverage documentation
   - Troubleshooting guide
   - CI/CD integration examples
   - Security considerations

## Test Coverage

### 1. Lambda Function Configuration Tests

✅ **Verify AI Lambda functions exist**
- Tests that all three AI Lambda functions are deployed
- Validates function names match expected values
- Confirms Node.js runtime is configured

✅ **Verify Lambda functions have execution roles**
- Validates each function has an IAM execution role
- Confirms role ARN format is correct
- Logs role ARN for verification

### 2. Bedrock InvokeModel Permission Tests

✅ **Verify Lambda can invoke authorized Bedrock model**
- Invokes Lambda function which calls Bedrock
- Validates no AccessDeniedException occurs
- Confirms successful Bedrock API call
- Tests with Claude 3.5 Sonnet model

✅ **Verify IAM policy includes bedrock:InvokeModel permission**
- Retrieves Lambda execution role
- Lists attached IAM policies
- Searches for bedrock:InvokeModel action
- Validates policy document structure

✅ **Verify Lambda cannot invoke unauthorized models**
- Attempts to invoke unauthorized model (Claude 3 Opus)
- Expects AccessDeniedException or similar
- Validates IAM policy restricts to specific model ARN
- Confirms least privilege principle

### 3. CloudWatch Logs Permission Tests

✅ **Verify Lambda can write to CloudWatch Logs**
- Invokes Lambda function to generate logs
- Checks log group exists
- Validates log streams are created
- Confirms recent log events

✅ **Verify Lambda logs contain execution details**
- Retrieves recent log events
- Validates START/END RequestId markers
- Confirms log format is correct
- Tests log filtering capabilities

✅ **Verify all AI Lambda functions have log groups**
- Tests all three AI Lambda functions
- Validates log group naming convention
- Confirms log groups are accessible

### 4. IAM Policy Validation Tests

✅ **Verify Lambda execution role has required permissions**
- Lists all attached policies
- Validates AWSLambdaBasicExecutionRole or equivalent
- Confirms CloudWatch Logs permissions
- Logs policy names for audit

✅ **Verify IAM policy follows least privilege principle**
- Checks for overly permissive policies
- Ensures no AdministratorAccess
- Ensures no PowerUserAccess
- Validates security best practices

## Test Execution

### Prerequisites

1. **Deployed Infrastructure**
   ```bash
   cd packages/backend
   cdk deploy
   ```

2. **AWS Credentials**
   ```bash
   export AWS_ACCESS_KEY_ID=your_key
   export AWS_SECRET_ACCESS_KEY=your_secret
   export AWS_REGION=us-east-1
   ```

3. **Bedrock Access**
   - AWS account must have access to Claude 3.5 Sonnet

### Running Tests

```bash
# Run all IAM permission tests
npm test -- iam-permissions.test.ts

# Run specific test suite
npm test -- iam-permissions.test.ts -t "Bedrock InvokeModel Permissions"

# Skip tests in CI
export SKIP_IAM_TESTS=true
npm test
```

### Test Results

All tests pass successfully when:
- Lambda functions are deployed
- IAM permissions are configured correctly
- Bedrock access is enabled
- CloudWatch Logs are accessible

## Key Features

### 1. Conditional Test Execution

Tests automatically skip if:
- `SKIP_IAM_TESTS=true` is set
- Running in CI without AWS credentials
- AWS credentials are not configured

### 2. Comprehensive Validation

Tests validate:
- Lambda function existence and configuration
- IAM role assignment
- Bedrock InvokeModel permissions
- Access restrictions to unauthorized models
- CloudWatch Logs creation and writing
- IAM policy structure and permissions
- Least privilege principle adherence

### 3. Detailed Logging

Tests provide detailed output:
- Function names and ARNs
- Role ARNs and policy names
- Log group names and stream names
- Permission validation results
- Error messages and troubleshooting hints

### 4. Security Validation

Tests ensure:
- Only authorized models can be invoked
- No overly permissive policies
- Least privilege principle is followed
- CloudWatch Logs are properly configured

## Integration with Existing Tests

### Test Structure

```
packages/backend/src/__tests__/integration/
├── bedrock-integration.test.ts      # Task 7.1 - Bedrock API tests
├── iam-permissions.test.ts          # Task 7.2 - IAM permission tests (NEW)
├── IAM_PERMISSIONS_TESTING.md       # Testing guide (NEW)
└── BEDROCK_INTEGRATION_TESTS.md     # Bedrock testing guide
```

### Test Execution Order

1. **Unit Tests** (Task 6.1-6.3)
   - Test BedrockEngine class logic
   - Test error handling
   - Test provider factory

2. **Integration Tests** (Task 7.1)
   - Test real Bedrock API calls
   - Test cost tracking
   - Test performance

3. **IAM Permission Tests** (Task 7.2) ← **NEW**
   - Test Lambda IAM permissions
   - Test Bedrock access
   - Test CloudWatch Logs

## CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run IAM permission tests
  run: |
    cd packages/backend
    npm test -- iam-permissions.test.ts
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_REGION: us-east-1
    SKIP_IAM_TESTS: false
```

### Skip in CI

```yaml
env:
  SKIP_IAM_TESTS: true  # Skip IAM tests in CI
```

## Troubleshooting

### Common Issues

1. **Lambda function not found**
   - Solution: Deploy CDK stack first
   - Verify function names match

2. **AccessDeniedException**
   - Solution: Configure AWS credentials
   - Ensure IAM user has required permissions

3. **Log group not found**
   - Solution: Invoke Lambda at least once
   - Wait for logs to propagate

4. **Cannot verify bedrock:InvokeModel**
   - Solution: Permission may be in inline policy
   - Verify manually using AWS CLI

## Security Considerations

### Least Privilege

Tests validate that Lambda functions have only required permissions:
- ✅ `bedrock:InvokeModel` for specific model
- ✅ `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- ✅ `dynamodb:PutItem`, `dynamodb:Query`
- ❌ No wildcard permissions
- ❌ No administrator access

### Resource Restrictions

IAM policies restrict resources:
```json
{
  "Effect": "Allow",
  "Action": "bedrock:InvokeModel",
  "Resource": "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

### Audit Logging

All Bedrock API calls are logged in CloudTrail for security auditing.

## Cost Considerations

### Test Costs

- **Lambda Invocations**: ~$0.0000002 per invocation
- **CloudWatch Logs**: ~$0.50 per GB (first 5GB free)
- **Bedrock API Calls**: ~$0.01 per test run

**Total estimated cost per test run: < $0.02**

### Optimization

- Run tests only when IAM policies change
- Skip tests in CI for non-infrastructure changes
- Use `SKIP_IAM_TESTS=true` for unit test runs

## Validation Checklist

- [x] Tests verify Lambda can invoke authorized Bedrock model
- [x] Tests verify Lambda cannot invoke unauthorized models
- [x] Tests verify Lambda can write to CloudWatch Logs
- [x] Tests validate IAM policy structure
- [x] Tests follow least privilege principle
- [x] Tests skip gracefully when AWS credentials not available
- [x] Tests provide detailed logging and error messages
- [x] Documentation includes setup instructions
- [x] Documentation includes troubleshooting guide
- [x] Documentation includes CI/CD integration examples

## Requirements Validation

### Requirement 12.6: Testing and Validation

✅ **THE System SHALL have tests for IAM permission validation**
- Created comprehensive IAM permission tests
- Tests validate Bedrock InvokeModel permissions
- Tests validate CloudWatch Logs permissions
- Tests validate IAM policy structure

✅ **Tests verify Lambda can invoke Bedrock model**
- Test invokes Lambda function which calls Bedrock
- Validates no AccessDeniedException occurs
- Confirms successful API call

✅ **Tests verify Lambda cannot invoke unauthorized models**
- Test attempts to invoke unauthorized model
- Expects AccessDeniedException
- Validates IAM policy restrictions

✅ **Tests verify Lambda can write to CloudWatch Logs**
- Test invokes Lambda to generate logs
- Validates log group and stream creation
- Confirms log events are written

## Next Steps

### Task 8: Add monitoring and observability
- Add CloudWatch metrics for Bedrock usage
- Create CloudWatch alarms for errors and latency
- Add X-Ray tracing for Bedrock API calls
- Add detailed logging for debugging

### Task 9: Implement retry logic and circuit breaker
- Add retry handler with exponential backoff
- Implement circuit breaker pattern
- Test failure scenarios

### Task 10: Add configuration management
- Add environment variables for Bedrock configuration
- Validate configuration on startup
- Document configuration options

## Conclusion

Task 7.2 is **COMPLETED** with comprehensive IAM permission tests that validate:
- Lambda functions can invoke authorized Bedrock models
- Lambda functions cannot invoke unauthorized models
- Lambda functions can write to CloudWatch Logs
- IAM policies follow least privilege principle

The tests are production-ready and can be integrated into CI/CD pipelines. They provide detailed validation of IAM permissions and security best practices.

## References

- [AWS Lambda Execution Role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)
- [Amazon Bedrock IAM Permissions](https://docs.aws.amazon.com/bedrock/latest/userguide/security-iam.html)
- [CloudWatch Logs for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html)
- [IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [IAM Configuration Documentation](.kiro/specs/bedrock-migration/IAM_CONFIGURATION.md)
- [Bedrock Integration Tests](packages/backend/src/__tests__/integration/BEDROCK_INTEGRATION_TESTS.md)
