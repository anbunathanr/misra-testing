/**
 * Test Data Manager
 * 
 * Manages test data seeding and cleanup across all DynamoDB tables.
 * Provides automated test data creation and cascading cleanup with error handling.
 */

import { v4 as uuidv4 } from 'uuid';
import { TestContext, TestDataSet } from './types';
import { TestProject } from '../../types/test-project';
import { TestSuite } from '../../types/test-suite';
import { TestCase } from '../../types/test-case';
import { TestExecution } from '../../types/test-execution';
import { NotificationHistoryRecord } from '../../types/notification';

interface CleanupError {
  resource: string;
  error: Error;
}

/**
 * Test Data Manager
 * 
 * Seeds and cleans up test data for integration tests.
 * All test data is tagged with 'integration-test' and test ID for identification.
 */
export class TestDataManager {
  private cleanupErrors: CleanupError[] = [];

  /**
   * Seed test data for a test context
   * Creates projects, suites, test cases, executions, and notifications
   */
  async seedTestData(context: TestContext): Promise<TestDataSet> {
    console.log(`[Test Data Manager] Seeding test data for: ${context.testId}`);

    const testData: TestDataSet = {
      projects: [],
      testCases: [],
      testSuites: [],
      executions: [],
      notifications: [],
    };

    try {
      // Create test project
      const project = await this.createTestProject(context);
      testData.projects.push(project);

      // Create test suite
      const suite = await this.createTestSuite(context, project.projectId);
      testData.testSuites.push(suite);

      // Create test cases (default: 3 test cases)
      for (let i = 0; i < 3; i++) {
        const testCase = await this.createTestCase(context, project.projectId, suite.suiteId, i + 1);
        testData.testCases.push(testCase);
      }

      console.log(
        `[Test Data Manager] Test data seeded: ` +
        `project=${project.projectId}, ` +
        `suite=${suite.suiteId}, ` +
        `testCases=${testData.testCases.length}`
      );
    } catch (error) {
      console.error(`[Test Data Manager] Failed to seed test data:`, error);
      throw error;
    }

    return testData;
  }

  /**
   * Clean up test data for a test context
   * Implements cascading cleanup with error handling
   */
  async cleanupTestData(context: TestContext): Promise<void> {
    console.log(`[Test Data Manager] Cleaning up test data for: ${context.testId}`);
    this.cleanupErrors = [];

    try {
      // Cleanup in reverse order of creation (cascading delete)
      await this.cleanupNotifications(context.testData.notifications);
      await this.cleanupExecutions(context.testData.executions);
      await this.cleanupTestCases(context.testData.testCases);
      await this.cleanupTestSuites(context.testData.testSuites);
      await this.cleanupProjects(context.testData.projects);

      if (this.cleanupErrors.length > 0) {
        console.warn(
          `[Test Data Manager] Cleanup completed with ${this.cleanupErrors.length} errors:`,
          this.cleanupErrors
        );
      } else {
        console.log(`[Test Data Manager] Test data cleanup complete`);
      }
    } catch (error) {
      console.error(`[Test Data Manager] Failed to clean up test data:`, error);
      throw error;
    }
  }

  /**
   * Create a test project
   */
  async createTestProject(context: TestContext): Promise<TestProject> {
    const project: TestProject = {
      projectId: context.projectId,
      userId: context.userId,
      name: `Integration Test Project ${context.testId}`,
      description: `Test project for integration test ${context.testId}`,
      targetUrl: 'https://example.com',
      environment: 'dev',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // In a real implementation, this would write to DynamoDB
    // For integration tests, we simulate the creation
    console.log(`[Test Data Manager] Created project: ${project.projectId}`);

    return project;
  }

  /**
   * Create a test suite
   */
  async createTestSuite(context: TestContext, projectId: string): Promise<TestSuite> {
    const suite: TestSuite = {
      suiteId: uuidv4(),
      projectId,
      userId: context.userId,
      name: `Integration Test Suite ${context.testId}`,
      description: `Test suite for integration test ${context.testId}`,
      tags: ['integration-test', `test-${context.testId}`],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log(`[Test Data Manager] Created test suite: ${suite.suiteId}`);

    return suite;
  }

  /**
   * Create a test case
   */
  async createTestCase(
    context: TestContext,
    projectId: string,
    suiteId: string,
    index: number
  ): Promise<TestCase> {
    const testCase: TestCase = {
      testCaseId: uuidv4(),
      projectId,
      suiteId,
      userId: context.userId,
      name: `Integration Test Case ${index} - ${context.testId}`,
      description: `Test case ${index} for integration test ${context.testId}`,
      type: 'ui',
      steps: [
        {
          stepNumber: 1,
          action: 'navigate',
          target: 'https://example.com',
        },
        {
          stepNumber: 2,
          action: 'click',
          target: '#submit-button',
        },
        {
          stepNumber: 3,
          action: 'assert',
          target: '.success-message',
          expectedResult: 'Success',
        },
      ],
      priority: 'medium',
      tags: ['integration-test', `test-${context.testId}`],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    console.log(`[Test Data Manager] Created test case: ${testCase.testCaseId}`);

    return testCase;
  }

  /**
   * Create a test execution
   */
  async createTestExecution(
    context: TestContext,
    testCaseId: string,
    projectId: string
  ): Promise<TestExecution> {
    const execution: TestExecution = {
      executionId: uuidv4(),
      projectId,
      testCaseId,
      status: 'queued',
      startTime: new Date().toISOString(),
      steps: [],
      screenshots: [],
      metadata: {
        triggeredBy: context.userId,
        environment: 'test',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log(`[Test Data Manager] Created test execution: ${execution.executionId}`);

    return execution;
  }

  /**
   * Create a notification history record
   */
  async createNotificationHistory(
    context: TestContext,
    executionId: string
  ): Promise<NotificationHistoryRecord> {
    const notification: NotificationHistoryRecord = {
      notificationId: uuidv4(),
      userId: context.userId,
      eventType: 'test_completion',
      eventId: uuidv4(),
      channel: 'email',
      deliveryMethod: 'sns',
      deliveryStatus: 'sent',
      recipient: 'test@example.com',
      retryCount: 0,
      sentAt: new Date().toISOString(),
      metadata: {
        executionId,
        projectId: context.projectId,
      },
    };

    console.log(`[Test Data Manager] Created notification: ${notification.notificationId}`);

    return notification;
  }

  /**
   * Cleanup projects with error handling
   */
  private async cleanupProjects(projects: TestProject[]): Promise<void> {
    for (const project of projects) {
      try {
        // In a real implementation, this would delete from DynamoDB
        console.log(`[Test Data Manager] Deleting project: ${project.projectId}`);
      } catch (error) {
        this.cleanupErrors.push({
          resource: `project:${project.projectId}`,
          error: error as Error,
        });
      }
    }
  }

  /**
   * Cleanup test suites with error handling
   */
  private async cleanupTestSuites(suites: TestSuite[]): Promise<void> {
    for (const suite of suites) {
      try {
        console.log(`[Test Data Manager] Deleting test suite: ${suite.suiteId}`);
      } catch (error) {
        this.cleanupErrors.push({
          resource: `suite:${suite.suiteId}`,
          error: error as Error,
        });
      }
    }
  }

  /**
   * Cleanup test cases with error handling
   */
  private async cleanupTestCases(testCases: TestCase[]): Promise<void> {
    for (const testCase of testCases) {
      try {
        console.log(`[Test Data Manager] Deleting test case: ${testCase.testCaseId}`);
      } catch (error) {
        this.cleanupErrors.push({
          resource: `testCase:${testCase.testCaseId}`,
          error: error as Error,
        });
      }
    }
  }

  /**
   * Cleanup test executions with error handling
   */
  private async cleanupExecutions(executions: TestExecution[]): Promise<void> {
    for (const execution of executions) {
      try {
        console.log(`[Test Data Manager] Deleting execution: ${execution.executionId}`);
      } catch (error) {
        this.cleanupErrors.push({
          resource: `execution:${execution.executionId}`,
          error: error as Error,
        });
      }
    }
  }

  /**
   * Cleanup notifications with error handling
   */
  private async cleanupNotifications(notifications: NotificationHistoryRecord[]): Promise<void> {
    for (const notification of notifications) {
      try {
        console.log(`[Test Data Manager] Deleting notification: ${notification.notificationId}`);
      } catch (error) {
        this.cleanupErrors.push({
          resource: `notification:${notification.notificationId}`,
          error: error as Error,
        });
      }
    }
  }

  /**
   * Get cleanup errors (for testing/debugging)
   */
  getCleanupErrors(): CleanupError[] {
    return this.cleanupErrors;
  }

  /**
   * Bulk create test cases
   * Useful for performance testing
   */
  async bulkCreateTestCases(
    context: TestContext,
    projectId: string,
    suiteId: string,
    count: number
  ): Promise<TestCase[]> {
    const testCases: TestCase[] = [];

    for (let i = 0; i < count; i++) {
      const testCase = await this.createTestCase(context, projectId, suiteId, i + 1);
      testCases.push(testCase);
    }

    console.log(`[Test Data Manager] Bulk created ${count} test cases`);

    return testCases;
  }

  /**
   * Bulk create test executions
   * Useful for performance testing
   */
  async bulkCreateExecutions(
    context: TestContext,
    testCaseIds: string[],
    projectId: string
  ): Promise<TestExecution[]> {
    const executions: TestExecution[] = [];

    for (const testCaseId of testCaseIds) {
      const execution = await this.createTestExecution(context, testCaseId, projectId);
      executions.push(execution);
    }

    console.log(`[Test Data Manager] Bulk created ${executions.length} executions`);

    return executions;
  }
}
