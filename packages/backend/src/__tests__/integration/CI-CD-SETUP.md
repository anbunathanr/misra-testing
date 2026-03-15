# Integration Test CI/CD Setup Guide

This guide explains how to set up and run integration tests in CI/CD pipelines.

## Test Environment Setup

### Option 1: LocalStack (Local Development)

LocalStack provides local AWS service emulation for testing without AWS costs.

#### Installation

```bash
# Install LocalStack
pip install localstack

# Or use Docker
docker pull localstack/localstack
```

#### Configuration

Create `.localstack/config.yml`:

```yaml
services:
  - dynamodb
  - s3
  - sqs
  - sns
  - eventbridge
  - lambda

dynamodb:
  tables:
    - TestCases
    - TestSuites
    - TestExecutions
    - AIUsage
    - AILearning
    - NotificationPreferences
    - NotificationTemplates
    - NotificationHistory

s3:
  buckets:
    - test-screenshots

sqs:
  queues:
    - execution-queue
    - notification-queue
    - execution-dlq
    - notification-dlq
```

#### Running Tests with LocalStack

```bash
# Start LocalStack
localstack start

# Run integration tests
npm test -- integration --testEnvironment=localstack

# Stop LocalStack
localstack stop
```

### Option 2: AWS Test Environment

For testing against real AWS services, set up a dedicated test account or isolated resources.

#### Prerequisites

- AWS account with appropriate permissions
- AWS CLI configured
- CDK deployed to test environment

#### Environment Variables

```bash
export AWS_REGION=us-east-1
export AWS_PROFILE=test-account
export TEST_ENVIRONMENT=aws
export DYNAMODB_TABLE_PREFIX=test-
export S3_BUCKET_PREFIX=test-
```

#### Running Tests Against AWS

```bash
# Deploy test infrastructure
npm run cdk:deploy -- --profile test-account

# Run integration tests
npm test -- integration --testEnvironment=aws

# Cleanup test resources
npm run cleanup:test-data
```

## CI/CD Pipeline Configuration

### GitHub Actions

Create `.github/workflows/integration-tests.yml`:

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 2 * * *' # Nightly at 2 AM

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Start LocalStack
        run: |
          pip install localstack
          localstack start -d
          localstack wait

      - name: Run health checks
        run: npm test -- integration/health-check-example.test.ts

      - name: Run integration tests
        run: npm test -- integration/scenarios --coverage
        env:
          TEST_ENVIRONMENT: localstack
          TEST_TIMEOUT: 60000

      - name: Generate test report
        if: always()
        run: npm run test:report

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: |
            ./test-results/
            ./coverage/

      - name: Cleanup
        if: always()
        run: |
          npm run cleanup:test-data
          localstack stop
```

### GitLab CI

Create `.gitlab-ci.yml`:

```yaml
integration-tests:
  stage: test
  image: node:18
  services:
    - name: localstack/localstack:latest
      alias: localstack
  variables:
    TEST_ENVIRONMENT: localstack
    LOCALSTACK_HOST: localstack
  before_script:
    - npm ci
  script:
    - npm test -- integration/scenarios --coverage
  after_script:
    - npm run cleanup:test-data
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
    paths:
      - coverage/
      - test-results/
  only:
    - merge_requests
    - main
```

### Jenkins Pipeline

Create `Jenkinsfile`:

```groovy
pipeline {
    agent any
    
    environment {
        TEST_ENVIRONMENT = 'localstack'
        NODE_VERSION = '18'
    }
    
    stages {
        stage('Setup') {
            steps {
                sh 'npm ci'
                sh 'pip install localstack'
                sh 'localstack start -d'
                sh 'localstack wait'
            }
        }
        
        stage('Health Checks') {
            steps {
                sh 'npm test -- integration/health-check-example.test.ts'
            }
        }
        
        stage('Integration Tests') {
            steps {
                sh 'npm test -- integration/scenarios --coverage'
            }
        }
        
        stage('Generate Reports') {
            steps {
                sh 'npm run test:report'
            }
        }
    }
    
    post {
        always {
            junit 'test-results/**/*.xml'
            publishHTML([
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
            sh 'npm run cleanup:test-data'
            sh 'localstack stop'
        }
    }
}
```

## Test Execution Scripts

### Local Testing Script

Create `scripts/run-integration-tests.sh`:

```bash
#!/bin/bash

set -e

echo "Starting integration tests..."

# Start LocalStack
echo "Starting LocalStack..."
localstack start -d
localstack wait

# Run health checks
echo "Running health checks..."
npm test -- integration/health-check-example.test.ts

# Run integration tests
echo "Running integration tests..."
npm test -- integration/scenarios --coverage

# Generate report
echo "Generating test report..."
npm run test:report

# Cleanup
echo "Cleaning up..."
npm run cleanup:test-data
localstack stop

echo "Integration tests completed!"
```

### AWS Testing Script

Create `scripts/run-integration-tests-aws.sh`:

```bash
#!/bin/bash

set -e

echo "Starting integration tests against AWS..."

# Check AWS credentials
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "Error: AWS credentials not configured"
    exit 1
fi

# Deploy test infrastructure
echo "Deploying test infrastructure..."
npm run cdk:deploy -- --profile test-account

# Run health checks
echo "Running health checks..."
npm test -- integration/health-check-example.test.ts

# Run integration tests
echo "Running integration tests..."
TEST_ENVIRONMENT=aws npm test -- integration/scenarios --coverage

# Generate report
echo "Generating test report..."
npm run test:report

# Cleanup
echo "Cleaning up test data..."
npm run cleanup:test-data

echo "Integration tests completed!"
```

## Test Timeout Configuration

Configure timeouts in `jest.config.js`:

```javascript
module.exports = {
  testTimeout: 30000, // 30 seconds default
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/__tests__/**'
  ]
};
```

For specific test suites with longer timeouts:

```typescript
describe('Long Running Integration Test', () => {
  it('should complete within extended timeout', async () => {
    // Test implementation
  }, 60000); // 60 second timeout
});
```

## Test Reporting

### Generate HTML Report

Add to `package.json`:

```json
{
  "scripts": {
    "test:report": "jest --coverage --coverageReporters=html --coverageReporters=text",
    "test:integration": "jest integration/scenarios",
    "test:integration:watch": "jest integration/scenarios --watch"
  }
}
```

### Performance Metrics Report

Integration tests automatically generate performance reports. View them in test output:

```bash
npm test -- integration/scenarios --verbose
```

## Cleanup Scripts

### Cleanup Test Data

Create `scripts/cleanup-test-data.ts`:

```typescript
import { DynamoDBClient, ScanCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

async function cleanupTestData() {
  const client = new DynamoDBClient({ region: process.env.AWS_REGION });
  
  const tables = [
    'TestCases',
    'TestSuites',
    'TestExecutions',
    'AIUsage',
    'AILearning',
    'NotificationHistory'
  ];
  
  for (const table of tables) {
    console.log(`Cleaning up ${table}...`);
    
    const items = await client.send(new ScanCommand({
      TableName: table,
      FilterExpression: 'contains(tags, :tag)',
      ExpressionAttributeValues: {
        ':tag': { S: 'integration-test' }
      }
    }));
    
    for (const item of items.Items || []) {
      await client.send(new DeleteItemCommand({
        TableName: table,
        Key: { /* primary key from item */ }
      }));
    }
    
    console.log(`Cleaned up ${items.Items?.length || 0} items from ${table}`);
  }
}

cleanupTestData().catch(console.error);
```

Add to `package.json`:

```json
{
  "scripts": {
    "cleanup:test-data": "ts-node scripts/cleanup-test-data.ts"
  }
}
```

## Monitoring and Alerts

### CloudWatch Alarms (AWS Environment)

Set up alarms for integration test failures:

```typescript
import { Alarm } from 'aws-cdk-lib/aws-cloudwatch';

new Alarm(this, 'IntegrationTestFailureAlarm', {
  metric: testFailureMetric,
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'Integration test failure detected',
  actionsEnabled: true
});
```

### Slack Notifications

Add to CI/CD pipeline:

```yaml
- name: Notify Slack on Failure
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "Integration tests failed on ${{ github.ref }}"
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}
```

## Troubleshooting

### Common Issues

1. **Tests timing out**
   - Increase timeout in test configuration
   - Check if LocalStack is running
   - Verify AWS credentials

2. **Health checks failing**
   - Ensure all required services are running
   - Check service configuration
   - Verify network connectivity

3. **Test data not cleaning up**
   - Run cleanup script manually
   - Check IAM permissions
   - Verify table names and tags

4. **Mock services not working**
   - Reset mocks between tests
   - Check mock configuration
   - Verify mock responses are set

### Debug Mode

Run tests with debug output:

```bash
DEBUG=* npm test -- integration/scenarios
```

### Logs

Collect logs from all systems:

```bash
npm test -- integration/scenarios --verbose > test-output.log 2>&1
```

## Best Practices

1. **Run health checks first** - Always validate system readiness
2. **Use appropriate timeouts** - Set realistic timeouts for each test
3. **Clean up test data** - Always clean up after tests
4. **Use tags** - Tag all test data for easy identification
5. **Monitor performance** - Track metrics over time
6. **Run regularly** - Schedule nightly runs against AWS
7. **Isolate tests** - Ensure tests don't depend on each other
8. **Use mocks for external services** - Avoid costs and ensure reliability
