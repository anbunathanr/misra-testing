# Integration Test Scenarios

This directory contains end-to-end integration test scenarios that validate cross-system interactions.

## Test Categories

### 1. End-to-End Workflows (`end-to-end-workflows.test.ts`)
Complete user scenarios spanning multiple systems:
- **Test 1**: Generation → Execution → Notification flow
- **Test 2**: Batch generation → Suite execution → Summary report
- **Test 3**: Learning feedback loop (Generate → Execute → Learn → Improve)

**Requirements**: 1.1-1.7, 2.1-2.7, 3.1-3.7, 4.1-4.7

### 2. Error Handling (`error-handling.test.ts`)
Cross-system error scenarios and isolation:
- **Test 10**: AI generation failure isolation
- **Test 11**: Execution failure with notification
- **Test 12**: Notification delivery failure isolation

**Requirements**: 7.1-7.7

### 3. Performance and Scalability (To be implemented)
Load testing and concurrent operations:
- **Test 13**: Concurrent test generation (10 concurrent requests)
- **Test 14**: Concurrent test execution (20 concurrent executions)
- **Test 15**: High notification volume (100 notifications/minute)

**Requirements**: 11.1-11.7

### 4. Infrastructure Integration (To be implemented)
AWS resource integration and permissions:
- **Test 16**: DynamoDB cross-table operations
- **Test 17**: S3 screenshot storage and retrieval
- **Test 18**: IAM permissions validation

**Requirements**: 10.1-10.7, 14.1-14.7

### 5. Authentication and Authorization (To be implemented)
Cross-system authentication flows:
- **Test 11.1**: Cross-system authentication with tokens

**Requirements**: 8.1-8.7

### 6. Cost Tracking (To be implemented)
Cross-system cost tracking:
- **Test 12.1**: Cost tracking across all systems

**Requirements**: 9.1-9.7

### 7. Monitoring and Observability (To be implemented)
Distributed tracing and correlation:
- **Test 16.1**: Distributed tracing with correlation IDs

**Requirements**: 15.1-15.7

## Running Tests

### Run all integration tests:
```bash
npm test -- integration/scenarios
```

### Run specific test suite:
```bash
npm test -- end-to-end-workflows.test.ts
npm test -- error-handling.test.ts
```

### Run with coverage:
```bash
npm test -- integration/scenarios --coverage
```

## Test Environment

Integration tests require:
- Mock services for external dependencies (OpenAI, SNS, Browser)
- Test data seeding and cleanup
- Health checks before execution
- Performance metrics collection

### Configuration

Tests use the integration test configuration from `../config.ts`:
- `timeout`: Test timeout (default: 30000ms)
- `useRealAWS`: Use real AWS services vs mocks (default: false)
- `cleanupOnFailure`: Cleanup test data on failure (default: true)
- `captureDetailedLogs`: Capture detailed logs (default: true)

## Test Data Management

Each test:
1. **Setup**: Creates isolated test context with seeded data
2. **Execute**: Runs test scenario with mocks
3. **Validate**: Verifies expected outcomes
4. **Teardown**: Cleans up test data

Test data is automatically tagged with `integration-test` and test ID for identification.

## Performance Metrics

All tests collect performance metrics:
- End-to-end latency
- Component-level timing
- Resource utilization
- Throughput measurements

Metrics are reported at the end of each test suite.

## Extending Tests

To add new integration test scenarios:

1. Create new test file in this directory
2. Import `IntegrationTestHarness` and `TestContext`
3. Follow the pattern:
```typescript
describe('My Integration Test', () => {
  let harness: IntegrationTestHarness;
  let context: TestContext;

  beforeAll(async () => {
    harness = new IntegrationTestHarness();
  });

  beforeEach(async () => {
    context = await harness.setup();
  });

  afterEach(async () => {
    await harness.teardown(context);
  });

  it('should validate scenario', async () => {
    // Test implementation
  });
});
```

## Mock Services

### MockOpenAIService
Simulates OpenAI API responses:
```typescript
context.mocks.openAI.mockAnalysisResponse(url, analysis);
context.mocks.openAI.mockGenerationResponse(scenario, testSpec);
context.mocks.openAI.mockError('timeout' | 'rate-limit' | 'invalid-response');
```

### MockSNSService
Simulates AWS SNS notifications:
```typescript
context.mocks.sns.mockEmailDelivery(recipient, success);
context.mocks.sns.mockSMSDelivery(phoneNumber, success);
context.mocks.sns.getDeliveredMessages();
context.mocks.sns.getFailedMessages();
```

### MockBrowserService
Simulates browser automation:
```typescript
context.mocks.browser.mockPageLoad(url, success);
context.mocks.browser.mockElementInteraction(selector, success);
context.mocks.browser.mockScreenshot(url);
context.mocks.browser.getExecutedActions();
```

## Troubleshooting

### Tests timing out
- Increase timeout in test configuration
- Check if health checks are passing
- Verify mock services are configured correctly

### Test data not cleaning up
- Check teardown logic in test harness
- Verify cleanup errors are logged
- Manually clean up using test ID tag

### Mock services not working
- Reset mocks between tests: `context.mocks.openAI.reset()`
- Check mock configuration
- Verify mock responses are set before test execution

## CI/CD Integration

Integration tests should run:
- On every pull request (with mocks)
- Nightly against test AWS environment (with real services)
- Before production deployments

Configure CI/CD pipeline to:
1. Run health checks first
2. Execute tests with appropriate timeout
3. Collect and report performance metrics
4. Clean up test data on completion
