/**
 * Integration Test Harness
 * 
 * Orchestrates integration test execution with setup, execution, validation, and teardown phases.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  TestContext,
  IntegrationTest,
  TestResult,
  IntegrationTestSuite,
  SuiteResult,
  TestConfig,
  TestDataSet,
  MockServices,
  HealthCheckResult,
} from './types';
import { TestDataManager } from './test-data-manager';
import { MockOpenAIServiceImpl } from './mocks/mock-openai-service';
import { MockSNSServiceImpl } from './mocks/mock-sns-service';
import { MockBrowserServiceImpl } from './mocks/mock-browser-service';
import { SystemHealthCheckService } from './services/health-check-service';

/**
 * Integration Test Harness
 * 
 * Provides infrastructure for running integration tests with proper setup and teardown.
 */
export class IntegrationTestHarness {
  private testDataManager: TestDataManager;
  private healthCheckService: SystemHealthCheckService;
  private defaultConfig: TestConfig;
  private lastHealthCheck?: HealthCheckResult;

  constructor() {
    this.testDataManager = new TestDataManager();
    this.healthCheckService = new SystemHealthCheckService();
    this.defaultConfig = {
      timeout: 60000, // 60 seconds default
      useRealAWS: process.env.USE_REAL_AWS === 'true',
      cleanupOnFailure: true,
      captureDetailedLogs: true,
    };
  }

  /**
   * Run health checks before test execution
   * Returns health check result and throws if system is unhealthy
   */
  async runHealthChecks(): Promise<HealthCheckResult> {
    console.log('[Test Harness] Running system health checks...');
    
    const healthResult = await this.healthCheckService.checkAll();
    this.lastHealthCheck = healthResult;

    if (healthResult.overall === 'unhealthy') {
      const unhealthyComponents = Array.from(healthResult.components.entries())
        .filter(([_, health]) => health.status === 'unhealthy')
        .map(([name, health]) => `${name}: ${health.message}`);

      throw new Error(
        `System health check failed. Unhealthy components:\n${unhealthyComponents.join('\n')}`
      );
    }

    if (healthResult.overall === 'degraded') {
      console.warn('[Test Harness] System is degraded but tests will continue');
      const unhealthyComponents = Array.from(healthResult.components.entries())
        .filter(([_, health]) => health.status === 'unhealthy')
        .map(([name, health]) => `${name}: ${health.message}`);
      console.warn(`Degraded components:\n${unhealthyComponents.join('\n')}`);
    }

    console.log(`[Test Harness] Health check passed: ${healthResult.overall}`);
    return healthResult;
  }

  /**
   * Get the last health check result
   */
  getLastHealthCheck(): HealthCheckResult | undefined {
    return this.lastHealthCheck;
  }

  /**
   * Set up test context with isolated environment
   */
  async setup(config?: Partial<TestConfig>): Promise<TestContext> {
    const testId = uuidv4();
    const userId = `test-user-${testId}`;
    const projectId = `test-project-${testId}`;

    console.log(`[Test Harness] Setting up test context: ${testId}`);

    // Initialize mock services
    const mocks: MockServices = {
      openAI: new MockOpenAIServiceImpl(),
      sns: new MockSNSServiceImpl(),
      browser: new MockBrowserServiceImpl(),
    };

    // Create test context
    const context: TestContext = {
      testId,
      projectId,
      userId,
      testData: {
        projects: [],
        testCases: [],
        testSuites: [],
        executions: [],
        notifications: [],
      },
      mocks,
      startTime: new Date(),
      config: { ...this.defaultConfig, ...config },
    };

    // Seed test data
    try {
      context.testData = await this.testDataManager.seedTestData(context);
      console.log(`[Test Harness] Test data seeded successfully`);
    } catch (error) {
      console.error(`[Test Harness] Failed to seed test data:`, error);
      throw error;
    }

    return context;
  }

  /**
   * Tear down test context and clean up resources
   */
  async teardown(context: TestContext): Promise<void> {
    console.log(`[Test Harness] Tearing down test context: ${context.testId}`);

    try {
      // Clean up test data
      await this.testDataManager.cleanupTestData(context);
      console.log(`[Test Harness] Test data cleaned up successfully`);

      // Reset mock services
      context.mocks.openAI.reset();
      context.mocks.sns.reset();
      context.mocks.browser.reset();
      console.log(`[Test Harness] Mock services reset`);
    } catch (error) {
      console.error(`[Test Harness] Failed to tear down test context:`, error);
      if (!context.config.cleanupOnFailure) {
        console.warn(`[Test Harness] Skipping cleanup due to configuration`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Run a single integration test
   */
  async runTest(test: IntegrationTest, context: TestContext): Promise<TestResult> {
    console.log(`[Test Harness] Running test: ${test.name}`);
    const startTime = Date.now();

    try {
      // Execute test with timeout
      const executePromise = test.execute(context);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Test timeout')), test.timeout)
      );

      await Promise.race([executePromise, timeoutPromise]);

      // Validate results
      const validationResult = await test.validate(context);

      const duration = Date.now() - startTime;

      if (!validationResult.valid) {
        return {
          testName: test.name,
          status: 'fail',
          duration,
          metrics: {},
          errors: validationResult.errors.map(e => e.message),
          logs: context.config.captureDetailedLogs ? this.captureLogs(context) : [],
        };
      }

      return {
        testName: test.name,
        status: 'pass',
        duration,
        metrics: {},
        errors: [],
        logs: context.config.captureDetailedLogs ? this.captureLogs(context) : [],
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      return {
        testName: test.name,
        status: 'error',
        duration,
        metrics: {},
        errors: [errorMessage],
        logs: context.config.captureDetailedLogs ? this.captureLogs(context) : [],
      };
    }
  }

  /**
   * Run an integration test suite
   */
  async runSuite(suite: IntegrationTestSuite): Promise<SuiteResult> {
    console.log(`[Test Harness] Running test suite: ${suite.name}`);
    const startTime = Date.now();

    // Run health checks before suite execution
    try {
      await this.runHealthChecks();
    } catch (error) {
      console.error('[Test Harness] Health check failed, skipping suite execution');
      return {
        suiteName: suite.name,
        totalTests: suite.tests.length,
        passed: 0,
        failed: 0,
        errors: suite.tests.length,
        duration: Date.now() - startTime,
        testResults: suite.tests.map(test => ({
          testName: test.name,
          status: 'error' as const,
          duration: 0,
          metrics: {},
          errors: ['Skipped due to failed health check: ' + (error instanceof Error ? error.message : String(error))],
          logs: [],
        })),
      };
    }

    // Run suite setup
    if (suite.setup) {
      try {
        await suite.setup();
      } catch (error) {
        console.error(`[Test Harness] Suite setup failed:`, error);
        throw error;
      }
    }

    const testResults: TestResult[] = [];
    let passed = 0;
    let failed = 0;
    let errors = 0;

    // Run each test
    for (const test of suite.tests) {
      const context = await this.setup();

      try {
        const result = await this.runTest(test, context);
        testResults.push(result);

        if (result.status === 'pass') passed++;
        else if (result.status === 'fail') failed++;
        else if (result.status === 'error') errors++;
      } finally {
        await this.teardown(context);
      }
    }

    // Run suite teardown
    if (suite.teardown) {
      try {
        await suite.teardown();
      } catch (error) {
        console.error(`[Test Harness] Suite teardown failed:`, error);
      }
    }

    const duration = Date.now() - startTime;

    return {
      suiteName: suite.name,
      totalTests: suite.tests.length,
      passed,
      failed,
      errors,
      duration,
      testResults,
    };
  }

  /**
   * Capture logs from test context
   */
  private captureLogs(context: TestContext): string[] {
    const logs: string[] = [];

    // Capture mock service call history
    logs.push(`OpenAI calls: ${context.mocks.openAI.getCallHistory().length}`);
    logs.push(`SNS delivered: ${context.mocks.sns.getDeliveredMessages().length}`);
    logs.push(`SNS failed: ${context.mocks.sns.getFailedMessages().length}`);
    logs.push(`Browser actions: ${context.mocks.browser.getExecutedActions().length}`);

    return logs;
  }
}
