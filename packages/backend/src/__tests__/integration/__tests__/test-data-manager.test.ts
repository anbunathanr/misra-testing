/**
 * Test Data Manager Tests
 * 
 * Unit tests for the TestDataManager service.
 */

import { TestDataManager } from '../test-data-manager';
import { TestContext } from '../types';

describe('TestDataManager', () => {
  let manager: TestDataManager;
  let context: TestContext;

  beforeEach(() => {
    manager = new TestDataManager();
    context = {
      testId: 'test-123',
      projectId: 'proj-123',
      userId: 'user-123',
      testData: {
        projects: [],
        testCases: [],
        testSuites: [],
        executions: [],
        notifications: [],
      },
      mocks: {
        openAI: {} as any,
        sns: {} as any,
        browser: {} as any,
      },
      startTime: new Date(),
      config: {
        timeout: 60000,
        useRealAWS: false,
        cleanupOnFailure: true,
        captureDetailedLogs: false,
      },
    };
  });

  describe('seedTestData', () => {
    it('should seed test data with project, suite, and test cases', async () => {
      // Act
      const testData = await manager.seedTestData(context);

      // Assert
      expect(testData.projects).toHaveLength(1);
      expect(testData.testSuites).toHaveLength(1);
      expect(testData.testCases).toHaveLength(3); // Default: 3 test cases

      // Verify project
      const project = testData.projects[0];
      expect(project.projectId).toBe('proj-123');
      expect(project.userId).toBe('user-123');
      expect(project.name).toContain('Integration Test Project');
      expect(project.targetUrl).toBe('https://example.com');
      expect(project.environment).toBe('dev');

      // Verify suite
      const suite = testData.testSuites[0];
      expect(suite.projectId).toBe('proj-123');
      expect(suite.userId).toBe('user-123');
      expect(suite.name).toContain('Integration Test Suite');
      expect(suite.tags).toContain('integration-test');

      // Verify test cases
      testData.testCases.forEach((testCase, index) => {
        expect(testCase.projectId).toBe('proj-123');
        expect(testCase.suiteId).toBe(suite.suiteId);
        expect(testCase.userId).toBe('user-123');
        expect(testCase.name).toContain(`Integration Test Case ${index + 1}`);
        expect(testCase.type).toBe('ui');
        expect(testCase.steps).toHaveLength(3);
        expect(testCase.tags).toContain('integration-test');
      });
    });

    it('should tag all test data with integration-test tag', async () => {
      // Act
      const testData = await manager.seedTestData(context);

      // Assert
      expect(testData.testSuites[0].tags).toContain('integration-test');
      testData.testCases.forEach((testCase) => {
        expect(testCase.tags).toContain('integration-test');
      });
    });

    it('should tag all test data with test ID', async () => {
      // Act
      const testData = await manager.seedTestData(context);

      // Assert
      expect(testData.testSuites[0].tags).toContain('test-test-123');
      testData.testCases.forEach((testCase) => {
        expect(testCase.tags).toContain('test-test-123');
      });
    });
  });

  describe('cleanupTestData', () => {
    it('should cleanup test data without errors', async () => {
      // Arrange
      const testData = await manager.seedTestData(context);
      context.testData = testData;

      // Act
      await manager.cleanupTestData(context);

      // Assert
      expect(manager.getCleanupErrors()).toHaveLength(0);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      const testData = await manager.seedTestData(context);
      context.testData = testData;

      // Act - cleanup should not throw even if there are errors
      await expect(manager.cleanupTestData(context)).resolves.not.toThrow();
    });
  });

  describe('createTestProject', () => {
    it('should create a test project with correct properties', async () => {
      // Act
      const project = await manager.createTestProject(context);

      // Assert
      expect(project.projectId).toBe('proj-123');
      expect(project.userId).toBe('user-123');
      expect(project.name).toContain('Integration Test Project');
      expect(project.description).toContain('Test project for integration test');
      expect(project.targetUrl).toBe('https://example.com');
      expect(project.environment).toBe('dev');
      expect(project.createdAt).toBeDefined();
      expect(project.updatedAt).toBeDefined();
    });
  });

  describe('createTestSuite', () => {
    it('should create a test suite with correct properties', async () => {
      // Act
      const suite = await manager.createTestSuite(context, 'proj-123');

      // Assert
      expect(suite.suiteId).toBeDefined();
      expect(suite.projectId).toBe('proj-123');
      expect(suite.userId).toBe('user-123');
      expect(suite.name).toContain('Integration Test Suite');
      expect(suite.description).toContain('Test suite for integration test');
      expect(suite.tags).toContain('integration-test');
      expect(suite.tags).toContain('test-test-123');
      expect(suite.createdAt).toBeDefined();
      expect(suite.updatedAt).toBeDefined();
    });
  });

  describe('createTestCase', () => {
    it('should create a test case with correct properties', async () => {
      // Act
      const testCase = await manager.createTestCase(context, 'proj-123', 'suite-123', 1);

      // Assert
      expect(testCase.testCaseId).toBeDefined();
      expect(testCase.projectId).toBe('proj-123');
      expect(testCase.suiteId).toBe('suite-123');
      expect(testCase.userId).toBe('user-123');
      expect(testCase.name).toContain('Integration Test Case 1');
      expect(testCase.description).toContain('Test case 1 for integration test');
      expect(testCase.type).toBe('ui');
      expect(testCase.priority).toBe('medium');
      expect(testCase.tags).toContain('integration-test');
      expect(testCase.createdAt).toBeDefined();
      expect(testCase.updatedAt).toBeDefined();
    });

    it('should create test case with valid steps', async () => {
      // Act
      const testCase = await manager.createTestCase(context, 'proj-123', 'suite-123', 1);

      // Assert
      expect(testCase.steps).toHaveLength(3);
      
      // Verify navigate step
      expect(testCase.steps[0].stepNumber).toBe(1);
      expect(testCase.steps[0].action).toBe('navigate');
      expect(testCase.steps[0].target).toBe('https://example.com');

      // Verify click step
      expect(testCase.steps[1].stepNumber).toBe(2);
      expect(testCase.steps[1].action).toBe('click');
      expect(testCase.steps[1].target).toBe('#submit-button');

      // Verify assert step
      expect(testCase.steps[2].stepNumber).toBe(3);
      expect(testCase.steps[2].action).toBe('assert');
      expect(testCase.steps[2].target).toBe('.success-message');
      expect(testCase.steps[2].expectedResult).toBe('Success');
    });
  });

  describe('createTestExecution', () => {
    it('should create a test execution with correct properties', async () => {
      // Act
      const execution = await manager.createTestExecution(context, 'test-case-123', 'proj-123');

      // Assert
      expect(execution.executionId).toBeDefined();
      expect(execution.projectId).toBe('proj-123');
      expect(execution.testCaseId).toBe('test-case-123');
      expect(execution.status).toBe('queued');
      expect(execution.startTime).toBeDefined();
      expect(execution.steps).toEqual([]);
      expect(execution.screenshots).toEqual([]);
      expect(execution.metadata.triggeredBy).toBe('user-123');
      expect(execution.metadata.environment).toBe('test');
      expect(execution.createdAt).toBeDefined();
      expect(execution.updatedAt).toBeDefined();
    });
  });

  describe('createNotificationHistory', () => {
    it('should create a notification history record with correct properties', async () => {
      // Act
      const notification = await manager.createNotificationHistory(context, 'exec-123');

      // Assert
      expect(notification.notificationId).toBeDefined();
      expect(notification.userId).toBe('user-123');
      expect(notification.eventType).toBe('test_completion');
      expect(notification.eventId).toBeDefined();
      expect(notification.channel).toBe('email');
      expect(notification.deliveryMethod).toBe('sns');
      expect(notification.deliveryStatus).toBe('sent');
      expect(notification.recipient).toBe('test@example.com');
      expect(notification.retryCount).toBe(0);
      expect(notification.sentAt).toBeDefined();
      expect(notification.metadata.executionId).toBe('exec-123');
      expect(notification.metadata.projectId).toBe('proj-123');
    });
  });

  describe('bulkCreateTestCases', () => {
    it('should create multiple test cases', async () => {
      // Act
      const testCases = await manager.bulkCreateTestCases(context, 'proj-123', 'suite-123', 10);

      // Assert
      expect(testCases).toHaveLength(10);
      testCases.forEach((testCase, index) => {
        expect(testCase.projectId).toBe('proj-123');
        expect(testCase.suiteId).toBe('suite-123');
        expect(testCase.name).toContain(`Integration Test Case ${index + 1}`);
      });
    });

    it('should create test cases with unique IDs', async () => {
      // Act
      const testCases = await manager.bulkCreateTestCases(context, 'proj-123', 'suite-123', 5);

      // Assert
      const ids = testCases.map((tc) => tc.testCaseId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('bulkCreateExecutions', () => {
    it('should create multiple test executions', async () => {
      // Arrange
      const testCaseIds = ['tc-1', 'tc-2', 'tc-3'];

      // Act
      const executions = await manager.bulkCreateExecutions(context, testCaseIds, 'proj-123');

      // Assert
      expect(executions).toHaveLength(3);
      executions.forEach((execution, index) => {
        expect(execution.projectId).toBe('proj-123');
        expect(execution.testCaseId).toBe(testCaseIds[index]);
        expect(execution.status).toBe('queued');
      });
    });

    it('should create executions with unique IDs', async () => {
      // Arrange
      const testCaseIds = ['tc-1', 'tc-2', 'tc-3', 'tc-4', 'tc-5'];

      // Act
      const executions = await manager.bulkCreateExecutions(context, testCaseIds, 'proj-123');

      // Assert
      const ids = executions.map((ex) => ex.executionId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });
  });

  describe('data isolation', () => {
    it('should create isolated test data for different contexts', async () => {
      // Arrange
      const context1 = { ...context, testId: 'test-1', projectId: 'proj-1' };
      const context2 = { ...context, testId: 'test-2', projectId: 'proj-2' };

      // Act
      const testData1 = await manager.seedTestData(context1);
      const testData2 = await manager.seedTestData(context2);

      // Assert
      expect(testData1.projects[0].projectId).toBe('proj-1');
      expect(testData2.projects[0].projectId).toBe('proj-2');
      expect(testData1.testSuites[0].tags).toContain('test-test-1');
      expect(testData2.testSuites[0].tags).toContain('test-test-2');
    });
  });
});
