# Integration Test Infrastructure

This directory contains the integration testing framework for the AI-Based Test System (AIBTS). The framework validates cross-system interactions, data flow compatibility, event propagation, and end-to-end workflows.

## Overview

The integration testing framework provides:

- **Test Harness**: Orchestrates test execution with setup, execution, validation, and teardown
- **Health Check Service**: Validates all AWS components are operational before running tests
- **Mock Services**: Test doubles for external dependencies (OpenAI, SNS, Browser)
- **Test Data Manager**: Automated seeding and cleanup of test data
- **Configuration**: Environment-specific test configuration

## Health Checks

The framework includes comprehensive health checks that validate system readiness before running tests:

### Automatic Health Checks

Health checks run automatically before test suite execution:

```typescript
const harness = new IntegrationTestHarness();

// Health checks run automatically in runSuite()
const result = await harness.runSuite(mySuite);
```

### Manual Health Checks

You can also run health checks manually:

```typescript
const harness = new IntegrationTestHarness();

// Run health checks
const healthResult = await harness.runHealthChecks();

console.log('System Status:', healthResult.overall); // 'healthy', 'degraded', or 'unhealthy'

// Check individual components
for (const [name, health] of healthResult.components) {
  console.log(`${name}: ${health.status} (${health.latency}ms)`);
}
```

### Health Check Components

The health check service validates:

1. **DynamoDB Tables**: TestCases, TestSuites, TestExecutions, AIUsage, AILearning, Notification tables
2. **Lambda Functions**: AI generation, test execution, and notification functions
3. **EventBridge Rules**: Test execution completion events, scheduled reports
4. **SQS Queues**: Execution queue, notification queue, dead letter queues
5. **S3 Buckets**: Screenshot storage, file storage
6. **External Dependencies**: OpenAI API, SNS (mocked in test environment)

### Health Check Failure Handling

When health checks fail:

- **Unhealthy System**: Tests are automatically skipped with error status
- **Degraded System**: Tests continue with warnings logged
- **Healthy System**: Tests run normally

```typescript
// Example: Health check failure handling
try {
  await harness.runHealthChecks();
  // Tests will run
} catch (error) {
  // System is unhealthy - tests are skipped
  console.error('Health check failed:', error.message);
}
```

## Data Flow Validation

The framework includes data flow validators to ensure schema compatibility across system boundaries:

### Using Data Flow Validator

```typescript
import { DataFlowValidator } from './services/data-flow-validator';

const validator = new DataFlowValidator();

// Validate test case schema
const testCaseResult = validator.validateTestCaseSchema(testCase);
if (!testCaseResult.valid) {
  console.error('Test case schema errors:', testCaseResult.errors);
}

// Validate execution event schema
const eventResult = validator.validateExecutionEventSchema(event);
if (!eventResult.valid) {
  console.error('Event schema errors:', eventResult.errors);
}

// Validate cross-system data flow
const flowResult = validator.validateCrossSystemDataFlow({
  source: 'ai-generation',
  destination: 'test-execution',
  dataType: 'test-case',
  sampleData: testCase,
});

if (!flowResult.compatible) {
  console.error('Data flow incompatible:', flowResult.issues);
}
```

### Schema Validations

The data flow validator validates:

1. **Test Case Schema**: Validates AI-generated test cases match execution engine expectations
2. **Execution Event Schema**: Validates test execution events contain all required fields
3. **Notification Payload Schema**: Validates notification payloads have correct structure
4. **Learning Data Schema**: Validates learning data format for AI feedback loop
5. **Cross-System Data Flow**: Validates data compatibility between system boundaries

### Schema Mismatch Reporting

When schema mismatches are detected, the validator provides:

- Field-level error details (missing fields, type mismatches)
- Severity classification (error vs warning)
- Actionable recommendations for fixing issues
- Transformation requirements for incompatible schemas

## Directory Structure

```
integration/
├── README.md                    # This file
├── types.ts                     # Core type definitions
├── config.ts                    # Test configuration
├── test-harness.ts              # Test orchestration
├── test-data-manager.ts         # Test data management
├── example.test.ts              # Example integration test
├── mocks/                       # Mock service implementations
│   ├── mock-openai-service.ts
│   ├── mock-sns-service.ts
│   └── mock-browser-service.ts
└── tests/                       # Integration test suites (to be added)
    ├── end-to-end/
    ├── data-flow/
    ├── event-flow/
    ├── error-handling/
    ├── performance/
    └── infrastructure/
```

## Quick Start

### Running Integration Tests

```bash
# Run all integration tests
npm test -- --testPathPattern=integration

# Run specific test suite
npm test -- integration/example.test.ts

# Run with real AWS services (requires AWS credentials)
USE_REAL_AWS=true npm test -- --testPathPattern=integration

# Run with detailed logging
CAPTURE_DETAILED_LOGS=true npm test -- --testPathPattern=integration
```

### Writing an Integration Test

```typescript
import { IntegrationTestHarness } from './test-harness';
import { IntegrationTest, TestContext, ValidationResult } from './types';

describe('My Integration Test Suite', () => {
  let harness: IntegrationTestHarness;

  beforeAll(() => {
    harness = new IntegrationTestHarness();
  });

  it('should test end-to-end workflow', async () => {
    // Define test
    const test: IntegrationTest = {
      name: 'End-to-End Workflow Test',
      category: 'end-to-end',
      timeout: 60000,

      async execute(context: TestContext): Promise<void> {
        // 1. Set up test data
        const testCase = await context.testData.testCases[0];

        // 2. Execute workflow
        // ... your test logic here

        // 3. Verify results
        expect(result).toBeDefined();
      },

      async validate(context: TestContext): Promise<ValidationResult> {
        // Validate test results
        return {
          valid: true,
          errors: [],
          warnings: [],
        };
      },
    };

    // Run test
    const context = await harness.setup();
    const result = await harness.runTest(test, context);
    await harness.teardown(context);

    expect(result.status).toBe('pass');
  });
});
```

## Test Categories

Integration tests are organized into categories:

1. **end-to-end**: Complete user workflows spanning multiple systems
2. **data-flow**: Data format compatibility and transformation
3. **event-flow**: Event propagation through EventBridge and SQS
4. **error-handling**: Cross-system error scenarios and recovery
5. **performance**: Load testing and scalability validation
6. **infrastructure**: AWS resource integration and permissions

## Mock Services

### Mock OpenAI Service

Simulates OpenAI API responses without actual API calls:

```typescript
// Configure mock
context.mocks.openAI.configure({
  latency: 100,
  failureRate: 0,
  tokenUsage: { promptTokens: 100, completionTokens: 50 },
});

// Mock specific response
context.mocks.openAI.mockAnalysisResponse('https://example.com', {
  elements: [...],
  patterns: [...],
});

// Mock error
context.mocks.openAI.mockError('timeout');

// Get call history
const calls = context.mocks.openAI.getCallHistory();
```

### Mock SNS Service

Simulates AWS SNS for notification delivery:

```typescript
// Configure mock
context.mocks.sns.configure({
  deliveryLatency: 50,
  failureRate: 0,
});

// Mock specific delivery
context.mocks.sns.mockEmailDelivery('user@example.com', true);

// Get delivered messages
const delivered = context.mocks.sns.getDeliveredMessages();
const failed = context.mocks.sns.getFailedMessages();
```

### Mock Browser Service

Simulates browser automation:

```typescript
// Configure mock
context.mocks.browser.configure({
  actionLatency: 100,
  failureRate: 0,
});

// Mock specific action
context.mocks.browser.mockPageLoad('https://example.com', true);
context.mocks.browser.mockElementInteraction('#submit-button', true);

// Get executed actions
const actions = context.mocks.browser.getExecutedActions();
```

## Configuration

Configure integration tests via environment variables:

```bash
# Use real AWS services instead of mocks
USE_REAL_AWS=true

# AWS region
AWS_REGION=us-east-1

# Enable detailed logging
CAPTURE_DETAILED_LOGS=true

# Log level
LOG_LEVEL=debug

# CI environment
CI=true
```

## Test Data Management

The Test Data Manager automatically:

- Seeds test data before each test
- Tags all data with `integration-test` and test ID
- Cleans up data after test completion
- Handles cleanup failures gracefully

Test data includes:
- Projects
- Test suites
- Test cases
- Test executions
- Notifications

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data, even on failure
3. **Timeouts**: Set appropriate timeouts for long-running operations
4. **Mocks**: Use mocks for external dependencies to ensure test reliability
5. **Assertions**: Validate both success and failure scenarios
6. **Logging**: Capture detailed logs for debugging failures
7. **Performance**: Monitor test execution time and optimize slow tests

## Troubleshooting

### Tests timing out

- Increase timeout in test definition
- Check if AWS services are accessible
- Verify mock services are configured correctly

### Test data not cleaned up

- Check cleanup configuration in `config.ts`
- Verify DynamoDB permissions
- Review error logs for cleanup failures

### Mock services not working

- Verify mock configuration
- Check if mocks are reset between tests
- Review mock call history for debugging

## Event Flow Validation

The Event Flow Validator verifies event propagation through EventBridge and SQS:

```typescript
import { EventFlowValidator } from './services/event-flow-validator';

const validator = new EventFlowValidator();

// Simulate event flow (for testing)
const event = {
  eventId: 'evt-123',
  eventType: 'test.execution.completed',
  source: 'test-execution',
  detail: { executionId: 'exec-123', status: 'completed' },
};

validator.simulateEventPublication(event);
validator.simulateEventRouting('evt-123', 'notification-queue-sqs');
validator.simulateEventDelivery('evt-123', 1);

// Validate event publication
const publication = await validator.validateEventPublication(event);
expect(publication.published).toBe(true);

// Validate event routing
const routing = await validator.validateEventRouting(event);
expect(routing.routed).toBe(true);
expect(routing.targetQueue).toBe('notification-queue-sqs');

// Validate event delivery
const delivery = await validator.validateEventDelivery(event);
expect(delivery.delivered).toBe(true);
expect(delivery.deliveryAttempts).toBe(1);

// Trace complete event flow
const trace = await validator.traceEventFlow('evt-123');
expect(trace.timeline).toHaveLength(3); // publish, route, deliver
```

### Event Ordering Validation

Validate that events are processed in the expected order:

```typescript
const events = [
  { eventId: 'evt-1', eventType: 'test.started', source: 'test', detail: {} },
  { eventId: 'evt-2', eventType: 'test.running', source: 'test', detail: {} },
  { eventId: 'evt-3', eventType: 'test.completed', source: 'test', detail: {} },
];

// Simulate delivery in order
for (const event of events) {
  validator.simulateEventDelivery(event.eventId, 1);
}

// Validate ordering
const ordering = await validator.validateEventOrdering(events);
expect(ordering.ordered).toBe(true);
expect(ordering.violations).toHaveLength(0);
```

### Distributed Tracing

Track events through all systems with detailed timeline:

```typescript
const trace = await validator.traceEventFlow('evt-123');

console.log(`Event ${trace.eventId} took ${trace.totalDuration}ms`);
trace.timeline.forEach((step) => {
  console.log(`${step.component} - ${step.action}: ${step.duration}ms`);
});
```

## Next Steps

1. ~~Implement health check service (Task 2)~~ ✅ Complete
2. ~~Create mock services for external dependencies (Task 3)~~ ✅ Complete
3. ~~Create data flow validators (Task 4)~~ ✅ Complete
4. ~~Create event flow validators (Task 5)~~ ✅ Complete
5. Implement end-to-end workflow tests (Task 9)
6. Add performance tests (Task 14)

## Resources

- [Requirements](.kiro/specs/system-integration-testing/requirements.md)
- [Design](.kiro/specs/system-integration-testing/design.md)
- [Tasks](.kiro/specs/system-integration-testing/tasks.md)


## Integration Test Scenarios

The framework includes comprehensive integration test scenarios in the `scenarios/` directory:

### End-to-End Workflows
- Complete generation → execution → notification flow
- Batch generation → suite execution → summary reports
- Learning feedback loop (generate → execute → learn → improve)

### Error Handling
- AI generation failure isolation
- Execution failure with notifications
- Notification delivery failure isolation

### Performance Metrics

All integration tests collect performance metrics using the `PerformanceMetricsCollector`:

```typescript
import { PerformanceMetricsCollector } from './services/performance-metrics-collector';

const collector = new PerformanceMetricsCollector();

// Start measurement
collector.startMeasurement('operation-name', { tag1: 'value1' });

// ... perform operation ...

// End measurement
collector.endMeasurement('operation-name');

// Get statistics
const stats = collector.getStatistics();
console.log(`P95 latency: ${stats.summary.p95}ms`);

// Generate report
const report = collector.generateReport();
console.log(report);
```

The collector tracks:
- Min, max, mean, median values
- P95 and P99 percentiles
- Standard deviation
- Per-metric and overall statistics

## Running Integration Tests

### Run all integration tests:
```bash
npm test -- integration
```

### Run specific test suite:
```bash
npm test -- integration/scenarios/end-to-end-workflows.test.ts
```

### Run with detailed output:
```bash
npm test -- integration --verbose
```

## Directory Structure

```
integration/
├── config.ts                           # Test configuration
├── types.ts                            # Type definitions
├── test-harness.ts                     # Test orchestration
├── test-data-manager.ts                # Test data seeding/cleanup
├── README.md                           # This file
├── mocks/                              # Mock services
│   ├── mock-openai-service.ts
│   ├── mock-sns-service.ts
│   └── mock-browser-service.ts
├── services/                           # Validation and utility services
│   ├── health-check-service.ts
│   ├── data-flow-validator.ts
│   ├── event-flow-validator.ts
│   ├── performance-metrics-collector.ts
│   └── __tests__/                      # Service unit tests
└── scenarios/                          # Integration test scenarios
    ├── end-to-end-workflows.test.ts
    ├── error-handling.test.ts
    └── README.md                       # Scenario documentation
```

## Next Steps

To extend the integration test framework:

1. **Add new test scenarios**: Create test files in `scenarios/` directory
2. **Add new validators**: Create validator services in `services/` directory
3. **Enhance mock services**: Add new mock methods as needed
4. **Add performance tests**: Use `PerformanceMetricsCollector` to track metrics
5. **Add infrastructure tests**: Validate AWS resource integration

See `scenarios/README.md` for detailed information on creating new test scenarios.
