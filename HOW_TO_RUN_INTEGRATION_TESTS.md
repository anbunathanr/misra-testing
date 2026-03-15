# How to Run Integration Tests - Quick Start Guide

## ✅ Project Status

The System Integration Testing framework is **COMPLETE** and ready to run! All 19 tasks have been implemented:

- ✅ Integration test infrastructure
- ✅ Mock services (OpenAI, SNS, Browser)
- ✅ Health check service
- ✅ Data flow validators
- ✅ Event flow validators
- ✅ End-to-end workflow tests
- ✅ Error handling tests
- ✅ Performance tests
- ✅ Infrastructure tests
- ✅ CI/CD setup documentation

## 🚀 Quick Start - Run Tests Now

### Option 1: Run All Integration Tests (Recommended)

```bash
# Navigate to backend directory
cd packages/backend

# Install dependencies (if not already done)
npm install

# Run all integration tests
npm test -- integration
```

### Option 2: Run Specific Test Suites

```bash
# Run end-to-end workflow tests
npm test -- integration/scenarios/end-to-end-workflows.test.ts

# Run error handling tests
npm test -- integration/scenarios/error-handling.test.ts

# Run performance tests
npm test -- integration/scenarios/performance-scalability.test.ts

# Run infrastructure tests
npm test -- integration/scenarios/infrastructure.test.ts

# Run auth and cost monitoring tests
npm test -- integration/scenarios/auth-cost-monitoring.test.ts
```

### Option 3: Run with Detailed Output

```bash
# Run with verbose output
npm test -- integration --verbose

# Run with coverage report
npm test -- integration --coverage

# Run specific test with detailed logs
CAPTURE_DETAILED_LOGS=true npm test -- integration/scenarios/end-to-end-workflows.test.ts
```

## 📊 What Tests Are Available?

### 1. End-to-End Workflow Tests
**File**: `packages/backend/src/__tests__/integration/scenarios/end-to-end-workflows.test.ts`

Tests complete workflows:
- ✅ Generation → Execution → Notification flow
- ✅ Batch generation → Suite execution → Summary reports
- ✅ Learning feedback loop (generate → execute → learn → improve)

**Run**: `npm test -- integration/scenarios/end-to-end-workflows.test.ts`

### 2. Error Handling Tests
**File**: `packages/backend/src/__tests__/integration/scenarios/error-handling.test.ts`

Tests error scenarios:
- ✅ AI generation failure isolation
- ✅ Execution failure with notifications
- ✅ Notification delivery failure isolation

**Run**: `npm test -- integration/scenarios/error-handling.test.ts`

### 3. Performance & Scalability Tests
**File**: `packages/backend/src/__tests__/integration/scenarios/performance-scalability.test.ts`

Tests system under load:
- ✅ Concurrent test generation (10 concurrent requests)
- ✅ Concurrent test execution (20 concurrent executions)
- ✅ High notification volume (100 notifications)

**Run**: `npm test -- integration/scenarios/performance-scalability.test.ts`

### 4. Infrastructure Tests
**File**: `packages/backend/src/__tests__/integration/scenarios/infrastructure.test.ts`

Tests AWS resource integration:
- ✅ DynamoDB cross-table operations
- ✅ S3 screenshot storage and retrieval
- ✅ IAM permissions validation

**Run**: `npm test -- integration/scenarios/infrastructure.test.ts`

### 5. Authentication & Cost Monitoring Tests
**File**: `packages/backend/src/__tests__/integration/scenarios/auth-cost-monitoring.test.ts`

Tests auth and cost tracking:
- ✅ Cross-system authentication
- ✅ Cost tracking across all systems

**Run**: `npm test -- integration/scenarios/auth-cost-monitoring.test.ts`

## 🔍 Understanding Test Output

When you run the tests, you'll see:

```
End-to-End Workflow Integration Tests
  Test 1: Complete Generation to Notification Flow
    ✓ should complete full workflow from generation to notification (2500ms)
    ✓ should handle test execution failure with notification (1800ms)
  Test 2: Batch Generation and Suite Execution Flow
    ✓ should handle batch generation and suite execution (5200ms)
  Test 3: Learning Feedback Loop
    ✓ should complete learning feedback loop (3100ms)

Performance Report:
┌─────────────────────────┬──────────┬──────────┬──────────┬──────────┐
│ Metric                  │ Count    │ Mean     │ P95      │ P99      │
├─────────────────────────┼──────────┼──────────┼──────────┼──────────┤
│ end-to-end-workflow     │ 1        │ 2450ms   │ 2450ms   │ 2450ms   │
│ batch-suite-workflow    │ 1        │ 5180ms   │ 5180ms   │ 5180ms   │
│ learning-feedback-loop  │ 1        │ 3080ms   │ 3080ms   │ 3080ms   │
└─────────────────────────┴──────────┴──────────┴──────────┴──────────┘

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

## 🏗️ Project Structure

```
packages/backend/src/__tests__/integration/
├── README.md                           # Comprehensive documentation
├── CI-CD-SETUP.md                      # CI/CD pipeline setup guide
├── config.ts                           # Test configuration
├── types.ts                            # Type definitions
├── test-harness.ts                     # Test orchestration
├── test-data-manager.ts                # Test data seeding/cleanup
│
├── mocks/                              # Mock services
│   ├── mock-openai-service.ts          # Simulates OpenAI API
│   ├── mock-sns-service.ts             # Simulates AWS SNS
│   └── mock-browser-service.ts         # Simulates browser automation
│
├── services/                           # Validation services
│   ├── health-check-service.ts         # System health validation
│   ├── data-flow-validator.ts          # Schema compatibility validation
│   ├── event-flow-validator.ts         # Event propagation validation
│   ├── performance-metrics-collector.ts # Performance tracking
│   └── __tests__/                      # Service unit tests
│
├── scenarios/                          # Integration test scenarios
│   ├── README.md                       # Scenario documentation
│   ├── end-to-end-workflows.test.ts    # E2E workflow tests
│   ├── error-handling.test.ts          # Error scenario tests
│   ├── performance-scalability.test.ts # Performance tests
│   ├── infrastructure.test.ts          # AWS resource tests
│   └── auth-cost-monitoring.test.ts    # Auth & cost tests
│
└── generators/                         # Test data generators
    └── integration-test-generators.ts  # Property-based test generators
```

## 🎯 What Each Component Does

### Test Harness
Orchestrates test execution with automatic:
- Setup (creates test data)
- Execution (runs tests)
- Validation (checks results)
- Teardown (cleans up data)

### Mock Services
Simulate external dependencies without costs:
- **MockOpenAIService**: Simulates AI test generation
- **MockSNSService**: Simulates notification delivery
- **MockBrowserService**: Simulates browser automation

### Validators
Ensure system correctness:
- **DataFlowValidator**: Validates schema compatibility
- **EventFlowValidator**: Validates event propagation
- **HealthCheckService**: Validates system readiness

### Performance Metrics
Tracks and reports:
- Latency (min, max, mean, median, P95, P99)
- Throughput (operations per second)
- Resource utilization

## 🔧 Configuration Options

### Environment Variables

```bash
# Use real AWS services (requires AWS credentials)
USE_REAL_AWS=true npm test -- integration

# Enable detailed logging
CAPTURE_DETAILED_LOGS=true npm test -- integration

# Set log level
LOG_LEVEL=debug npm test -- integration

# Set AWS region
AWS_REGION=us-east-1 npm test -- integration
```

### Test Timeouts

Default timeout is 30 seconds. Some tests have custom timeouts:
- End-to-end workflow: 65 seconds
- Batch suite execution: 310 seconds (5+ minutes)
- Learning feedback loop: 30 seconds

## 📈 Viewing Test Results

### Console Output
Tests print results directly to console with:
- Test names and status (✓ pass, ✗ fail)
- Execution time for each test
- Performance metrics summary
- Error details (if any)

### Coverage Report
Generate HTML coverage report:

```bash
npm test -- integration --coverage --coverageReporters=html
```

View report: `packages/backend/coverage/index.html`

### Performance Report
Performance metrics are automatically collected and displayed after tests complete.

## 🐛 Troubleshooting

### Tests Failing?

1. **Check dependencies are installed**:
   ```bash
   cd packages/backend
   npm install
   ```

2. **Check TypeScript compiles**:
   ```bash
   npm run build
   ```

3. **Run with verbose output**:
   ```bash
   npm test -- integration --verbose
   ```

4. **Check specific test file**:
   ```bash
   npm test -- integration/scenarios/end-to-end-workflows.test.ts --verbose
   ```

### Common Issues

**Issue**: Tests timeout
- **Solution**: Increase timeout or check if mock services are configured correctly

**Issue**: TypeScript errors
- **Solution**: Run `npm run build` to check for compilation errors

**Issue**: Module not found
- **Solution**: Run `npm install` to ensure all dependencies are installed

## 📚 Additional Documentation

- **Integration Test README**: `packages/backend/src/__tests__/integration/README.md`
- **CI/CD Setup Guide**: `packages/backend/src/__tests__/integration/CI-CD-SETUP.md`
- **Scenario Documentation**: `packages/backend/src/__tests__/integration/scenarios/README.md`
- **Requirements**: `.kiro/specs/system-integration-testing/requirements.md`
- **Design**: `.kiro/specs/system-integration-testing/design.md`
- **Tasks**: `.kiro/specs/system-integration-testing/tasks.md`

## 🎉 Next Steps

Now that integration tests are complete, you can:

1. **Run the tests** to verify everything works
2. **Review test results** to understand system behavior
3. **Add new test scenarios** as needed
4. **Set up CI/CD pipeline** using the CI-CD-SETUP.md guide
5. **Deploy to AWS** and run tests against real infrastructure

## 💡 Pro Tips

1. **Start with end-to-end tests** - They give you the best overview
2. **Use verbose mode** when debugging - `--verbose` flag shows detailed output
3. **Check performance metrics** - They help identify bottlenecks
4. **Run tests regularly** - Catch integration issues early
5. **Read the README files** - They contain detailed documentation

## 🚀 Ready to Run?

Execute this command to run all integration tests:

```bash
cd packages/backend && npm test -- integration
```

That's it! The tests will run and show you the results. 🎊
