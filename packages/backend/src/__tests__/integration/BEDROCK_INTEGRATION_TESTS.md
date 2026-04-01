# Bedrock Integration Tests

## Overview

The Bedrock integration tests (`bedrock-integration.test.ts`) validate the BedrockEngine implementation by making **REAL API calls** to Amazon Bedrock with Claude 3.5 Sonnet. These tests verify:

- ✅ Test generation with real Bedrock API
- ✅ Selector generation with real Bedrock API  
- ✅ Application analysis with real Bedrock API
- ✅ Cost tracking accuracy
- ✅ Error handling
- ✅ Performance benchmarks
- ✅ API logging

## Prerequisites

### 1. AWS Account Setup

You need an AWS account with Bedrock access enabled:

1. Sign up for AWS account at https://aws.amazon.com
2. Enable Amazon Bedrock in your account
3. Request access to Claude 3.5 Sonnet model (if not already enabled)
4. Ensure your account has the necessary IAM permissions

### 2. AWS Credentials

Configure AWS credentials using one of these methods:

#### Option A: Environment Variables

```bash
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_REGION=us-east-1
```

#### Option B: AWS Profile

```bash
export AWS_PROFILE=your_profile_name
```

#### Option C: AWS CLI Configuration

```bash
aws configure
```

### 3. IAM Permissions

Your AWS credentials must have the following permissions:

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
        "arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    }
  ]
}
```

## Running the Tests

### Run All Bedrock Integration Tests

```bash
cd packages/backend
npm test -- bedrock-integration.test.ts
```

### Run Specific Test Suite

```bash
# Test generation only
npm test -- bedrock-integration.test.ts -t "Test Generation"

# Selector generation only
npm test -- bedrock-integration.test.ts -t "Selector Generation"

# Application analysis only
npm test -- bedrock-integration.test.ts -t "Application Analysis"

# Cost tracking only
npm test -- bedrock-integration.test.ts -t "Cost Tracking"
```

### Run with Custom Configuration

```bash
# Use different region
BEDROCK_REGION=us-west-2 npm test -- bedrock-integration.test.ts

# Use different model
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0 npm test -- bedrock-integration.test.ts

# Increase timeout
npm test -- bedrock-integration.test.ts --testTimeout=180000
```

## Skipping Tests

### Skip in CI/CD

The tests automatically skip if:
- `SKIP_BEDROCK_INTEGRATION=true` is set
- Running in CI (`CI=true`) without AWS credentials

```bash
# Explicitly skip tests
SKIP_BEDROCK_INTEGRATION=true npm test -- bedrock-integration.test.ts
```

### Skip Locally

If you don't have AWS credentials configured, the tests will automatically skip with a helpful message:

```
⏭️  Bedrock integration tests were skipped
ℹ️  To run these tests:
   1. Configure AWS credentials
   2. Ensure Bedrock access is enabled
   3. Set SKIP_BEDROCK_INTEGRATION=false
```

## Cost Considerations

### Estimated Costs

Running the full test suite typically costs **less than $0.10**:

| Test Category | Estimated Cost |
|--------------|----------------|
| Test Generation (2 tests) | ~$0.02 |
| Selector Generation (2 tests) | ~$0.01 |
| Application Analysis (2 tests) | ~$0.03 |
| Cost Tracking (2 tests) | ~$0.02 |
| Error Handling (2 tests) | ~$0.01 |
| Performance (3 tests) | ~$0.02 |
| API Logging (2 tests) | ~$0.01 |
| **Total** | **~$0.12** |

### Claude 3.5 Sonnet Pricing

- Input tokens: **$3.00 per 1M tokens**
- Output tokens: **$15.00 per 1M tokens**

### Cost Tracking

Each test logs its token usage and cost:

```
📊 API Usage: 450 input + 320 output = 770 total tokens
⏱️  Duration: 2341ms
💰 Cost: $0.006150
```

## Test Coverage

### Test Generation

Tests that Bedrock can generate valid Playwright test code:

```typescript
✅ Generate test code from scenario description
✅ Follow Playwright best practices
✅ Include proper assertions and error handling
✅ Use stable selectors
```

### Selector Generation

Tests that Bedrock can generate robust CSS/XPath selectors:

```typescript
✅ Generate selector from element description
✅ Handle complex DOM structures
✅ Prioritize stable selectors (data-testid, aria-label)
✅ Return valid selector syntax
```

### Application Analysis

Tests that Bedrock can analyze web applications:

```typescript
✅ Identify key features and user flows
✅ Detect interactive elements
✅ Determine authentication requirements
✅ Provide test recommendations
```

### Cost Tracking

Tests that token usage and costs are accurately tracked:

```typescript
✅ Calculate costs based on Claude 3.5 Sonnet pricing
✅ Track input and output tokens separately
✅ Aggregate costs across multiple calls
✅ Log all API interactions
```

### Error Handling

Tests that errors are handled gracefully:

```typescript
✅ Handle invalid requests
✅ Handle large contexts
✅ Retry on transient failures
✅ Log failures with details
```

### Performance

Tests that operations complete within acceptable time:

```typescript
✅ Test generation < 45 seconds
✅ Selector generation < 10 seconds
✅ Application analysis < 60 seconds
```

### API Logging

Tests that all API interactions are logged:

```typescript
✅ Log successful operations
✅ Log failures with error details
✅ Track operation duration
✅ Record token usage
```

## Troubleshooting

### Tests Are Skipped

**Problem**: Tests show as skipped

**Solution**: 
1. Verify AWS credentials are configured
2. Check `SKIP_BEDROCK_INTEGRATION` is not set to `true`
3. Ensure you're not in CI without credentials

### Authentication Errors

**Problem**: `AccessDeniedException` or `UnauthorizedException`

**Solution**:
1. Verify AWS credentials are valid
2. Check IAM permissions include `bedrock:InvokeModel`
3. Ensure Bedrock is enabled in your AWS account

### Model Not Found

**Problem**: `ResourceNotFoundException` for model

**Solution**:
1. Verify model ID is correct: `anthropic.claude-3-5-sonnet-20241022-v2:0`
2. Check model is available in your region
3. Request access to Claude models in Bedrock console

### Throttling Errors

**Problem**: `ThrottlingException` errors

**Solution**:
1. Tests automatically retry with exponential backoff
2. If persistent, wait a few minutes and retry
3. Consider requesting higher rate limits from AWS

### Timeout Errors

**Problem**: Tests timeout before completing

**Solution**:
1. Increase test timeout: `--testTimeout=180000`
2. Check network connectivity to AWS
3. Verify Bedrock service is operational

### High Costs

**Problem**: Unexpected high costs

**Solution**:
1. Review test logs for token usage
2. Run specific test suites instead of all tests
3. Set `SKIP_BEDROCK_INTEGRATION=true` when not needed

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Bedrock Integration Tests

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch: # Manual trigger

jobs:
  bedrock-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
        working-directory: packages/backend
      
      - name: Run Bedrock Integration Tests
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
        run: npm test -- bedrock-integration.test.ts
        working-directory: packages/backend
```

### Skip in Regular CI

```yaml
# In your regular CI workflow
- name: Run Unit Tests
  env:
    SKIP_BEDROCK_INTEGRATION: true
  run: npm test
  working-directory: packages/backend
```

## Best Practices

### 1. Run Locally Before Committing

Always run integration tests locally to catch issues early:

```bash
npm test -- bedrock-integration.test.ts
```

### 2. Monitor Costs

Check AWS billing dashboard regularly to monitor Bedrock costs.

### 3. Use Separate AWS Account for Testing

Consider using a separate AWS account for integration testing to:
- Isolate costs
- Prevent accidental production impact
- Simplify billing tracking

### 4. Run Tests Periodically

Run integration tests:
- Before major releases
- After Bedrock configuration changes
- Weekly to catch service issues early

### 5. Review Test Logs

Always review test logs for:
- Token usage patterns
- Performance metrics
- Error messages
- Cost trends

## Support

For issues or questions:

1. Check AWS Bedrock documentation: https://docs.aws.amazon.com/bedrock/
2. Review Claude model documentation: https://docs.anthropic.com/claude/
3. Check AWS service health: https://status.aws.amazon.com/
4. Contact AWS support for account-specific issues

## Related Documentation

- [Bedrock Migration Design](../../../.kiro/specs/bedrock-migration/design.md)
- [Bedrock Migration Requirements](../../../.kiro/specs/bedrock-migration/requirements.md)
- [BedrockEngine Implementation](../../services/ai-test-generation/bedrock-engine.ts)
- [BedrockEngine Unit Tests](../../services/ai-test-generation/__tests__/bedrock-engine.test.ts)
