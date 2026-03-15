# Notification System Integration Testing Guide

This guide provides step-by-step instructions for running the notification system integration tests.

## Prerequisites

Before running the integration tests, ensure you have:

1. **AWS Account** with appropriate credentials configured
2. **Node.js** (v18 or later) and npm installed
3. **AWS CDK** installed globally: `npm install -g aws-cdk`
4. **Backend dependencies** installed: `cd packages/backend && npm install`
5. **Environment variables** configured (see below)

## Environment Setup

### 1. Configure AWS Credentials

```bash
# Set AWS credentials (choose one method)

# Method 1: Environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# Method 2: AWS CLI profile
aws configure --profile aibts-test
export AWS_PROFILE=aibts-test
```

### 2. Set Test Environment Variables

Create a `.env.test` file in `packages/backend/`:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your_account_id

# DynamoDB Tables (will be created by tests)
PROJECTS_TABLE=aibts-test-projects
TEST_CASES_TABLE=aibts-test-test-cases
TEST_SUITES_TABLE=aibts-test-test-suites
TEST_EXECUTIONS_TABLE=aibts-test-test-executions
NOTIFICATION_PREFERENCES_TABLE=aibts-test-notification-preferences
NOTIFICATION_HISTORY_TABLE=aibts-test-notification-history
NOTIFICATION_TEMPLATES_TABLE=aibts-test-notification-templates

# SQS Queues
NOTIFICATION_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/your_account/aibts-test-notifications

# SNS Topics
SNS_EMAIL_TOPIC_ARN=arn:aws:sns:us-east-1:your_account:aibts-test-email
SNS_SMS_TOPIC_ARN=arn:aws:sns:us-east-1:your_account:aibts-test-sms

# S3 Buckets
SCREENSHOTS_BUCKET=aibts-test-screenshots

# EventBridge
EVENT_BUS_NAME=aibts-test-event-bus

# Test Configuration
USE_MOCKS=true  # Set to false for real AWS integration
TEST_TIMEOUT=30000  # 30 seconds per test
```

### 3. Deploy Test Infrastructure (Optional)

If testing against real AWS resources:

```bash
cd packages/backend

# Deploy test stack
cdk deploy AibtsTestStack --profile aibts-test

# Note the outputs (table names, queue URLs, etc.)
```

## Running the Tests

### Option 1: Run All Notification Integration Tests

```bash
cd packages/backend

# Run all notification integration tests
npm test -- notification-integration.test.ts

# Or with verbose output
npm test -- notification-integration.test.ts --verbose
```

### Option 2: Run Specific Test Suites

```bash
# Run only end-to-end notification flow tests
npm test -- notification-integration.test.ts -t "End-to-End Notification Flow"

# Run only scheduled reports tests
npm test -- notification-integration.test.ts -t "Scheduled Reports"

# Run only n8n integration tests
npm test -- notification-integration.test.ts -t "n8n Integration"

# Run only preference management tests
npm test -- notification-integration.test.ts -t "Preference Management"

# Run only notification history tests
npm test -- notification-integration.test.ts -t "Notification History"
```

### Option 3: Run Individual Test Cases

```bash
# Run specific test case
npm test -- notification-integration.test.ts -t "should deliver notification from test execution to SNS"

# Run test with coverage
npm test -- notification-integration.test.ts --coverage
```

## Test Execution Steps

### Step 1: Initialize Test Environment

The test harness automatically:
- Sets up mock services (SNS, EventBridge, SQS)
- Creates test data manager
- Initializes event flow validator
- Configures test isolation

### Step 2: Run Test Scenarios

Each test scenario follows this pattern:

1. **Setup**: Create test data (projects, test cases, preferences)
2. **Execute**: Trigger the notification flow
3. **Validate**: Verify events, deliveries, and history
4. **Cleanup**: Remove test data

### Step 3: Review Results

Test output includes:
- Pass/fail status for each test
- Execution time
- Error messages (if any)
- Coverage report (if enabled)

## Test Scenarios Explained

### 1. End-to-End Notification Flow

**What it tests:**
- Test execution completion triggers notification
- Event published to EventBridge
- Event routed to SQS notification queue
- Notification processor consumes message
- Notification delivered via SNS
- Notification recorded in history

**Steps:**
```bash
npm test -- notification-integration.test.ts -t "End-to-End"
```

**Expected outcome:**
- All events propagate correctly
- Notification delivered to configured channel
- History record created with "delivered" status

### 2. Scheduled Reports

**What it tests:**
- Daily/weekly report generation
- Summary statistics calculation
- Report delivery via email
- Handling of empty reports

**Steps:**
```bash
npm test -- notification-integration.test.ts -t "Scheduled Reports"
```

**Expected outcome:**
- Report generated with correct statistics
- Report delivered to users with appropriate frequency
- Empty reports handled gracefully

### 3. n8n Integration

**What it tests:**
- Webhook delivery to n8n
- Fallback to SNS when webhook fails
- Authentication header inclusion

**Steps:**
```bash
npm test -- notification-integration.test.ts -t "n8n Integration"
```

**Expected outcome:**
- Webhook called successfully
- Fallback triggered on failure
- Email delivered as backup

### 4. Preference Management

**What it tests:**
- User preference filtering
- Immediate application of preference updates
- Event type filtering
- Channel selection

**Steps:**
```bash
npm test -- notification-integration.test.ts -t "Preference Management"
```

**Expected outcome:**
- Only configured event types trigger notifications
- Preference updates apply immediately
- Disabled notifications are suppressed

### 5. Notification History

**What it tests:**
- History query with filters
- Pagination
- Single notification retrieval
- Ordering (most recent first)

**Steps:**
```bash
npm test -- notification-integration.test.ts -t "Notification History"
```

**Expected outcome:**
- Filters work correctly
- Pagination returns correct pages
- Records ordered by timestamp descending

## Troubleshooting

### Common Issues

#### 1. AWS Credentials Not Found

**Error:** `Unable to locate credentials`

**Solution:**
```bash
# Verify credentials
aws sts get-caller-identity

# Or set explicitly
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret
```

#### 2. DynamoDB Table Not Found

**Error:** `ResourceNotFoundException: Requested resource not found`

**Solution:**
```bash
# Deploy test infrastructure
cd packages/backend
cdk deploy AibtsTestStack

# Or enable mocks
export USE_MOCKS=true
```

#### 3. Test Timeout

**Error:** `Timeout - Async callback was not invoked within the 5000 ms timeout`

**Solution:**
```bash
# Increase timeout in .env.test
TEST_TIMEOUT=60000

# Or in test command
npm test -- notification-integration.test.ts --testTimeout=60000
```

#### 4. EventBridge Events Not Routing

**Error:** `Event not routed to notification queue`

**Solution:**
- Verify EventBridge rule exists
- Check rule event pattern matches
- Verify SQS queue permissions
- Check CloudWatch Logs for errors

#### 5. Mock Services Not Working

**Error:** `Mock service not initialized`

**Solution:**
```bash
# Ensure USE_MOCKS=true in .env.test
# Restart test with clean state
npm test -- notification-integration.test.ts --clearCache
```

## Cleanup

### After Running Tests

```bash
# Clean up test data (automatic in tests)
# But verify manually if needed

# List test tables
aws dynamodb list-tables --query 'TableNames[?contains(@, `aibts-test`)]'

# Delete test tables (if needed)
aws dynamodb delete-table --table-name aibts-test-projects

# Empty and delete test buckets
aws s3 rm s3://aibts-test-screenshots --recursive
aws s3 rb s3://aibts-test-screenshots

# Delete test stack
cdk destroy AibtsTestStack
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Notification Integration Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd packages/backend
          npm ci
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Run integration tests
        run: |
          cd packages/backend
          npm test -- notification-integration.test.ts --coverage
        env:
          USE_MOCKS: true
          TEST_TIMEOUT: 30000
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/backend/coverage/lcov.info
```

## Performance Benchmarks

Expected test execution times:

- End-to-End Flow: ~5-10 seconds
- Scheduled Reports: ~3-5 seconds
- n8n Integration: ~4-6 seconds
- Preference Management: ~3-5 seconds
- Notification History: ~2-4 seconds

**Total suite time:** ~20-30 seconds

## Next Steps

After successful integration testing:

1. Review test coverage report
2. Address any failing tests
3. Deploy to staging environment
4. Run manual smoke tests
5. Deploy to production

## Additional Resources

- [Integration Test README](packages/backend/src/__tests__/integration/README.md)
- [Test Harness Documentation](packages/backend/src/__tests__/integration/test-harness.ts)
- [Mock Services Guide](packages/backend/src/__tests__/integration/mocks/)
- [Notification System Design](.kiro/specs/notification-system/design.md)
- [Notification System Requirements](.kiro/specs/notification-system/requirements.md)

## Support

If you encounter issues:

1. Check CloudWatch Logs for Lambda errors
2. Review EventBridge metrics
3. Verify SQS queue metrics
4. Check DynamoDB table status
5. Review test output for specific error messages

For additional help, refer to the troubleshooting section or contact the development team.
