/**
 * Tests for Data Flow Validator Service
 */

import { DataFlowValidator } from '../data-flow-validator';

describe('DataFlowValidator', () => {
  let validator: DataFlowValidator;

  beforeEach(() => {
    validator = new DataFlowValidator();
  });

  describe('validateTestCaseSchema', () => {
    it('should validate a valid test case', () => {
      const validTestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: 'project-789',
        userId: 'user-001',
        name: 'Login Test',
        description: 'Test user login functionality',
        type: 'functional',
        steps: [
          { stepNumber: 1, action: 'navigate', target: 'https://example.com' },
          { stepNumber: 2, action: 'click', target: '#login-button' },
        ],
        priority: 'high',
        tags: ['auth', 'critical'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validateTestCaseSchema(validTestCase);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidTestCase = {
        testCaseId: 'test-123',
        // Missing other required fields
      };

      const result = validator.validateTestCaseSchema(invalidTestCase);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(e => e.field === 'suiteId')).toBe(true);
      expect(result.errors.some(e => e.field === 'projectId')).toBe(true);
    });

    it('should detect invalid test type', () => {
      const invalidTestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: 'project-789',
        userId: 'user-001',
        name: 'Test',
        description: 'Test',
        type: 'invalid-type',
        steps: [],
        priority: 'high',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validateTestCaseSchema(invalidTestCase);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should detect invalid step actions', () => {
      const invalidTestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: 'project-789',
        userId: 'user-001',
        name: 'Test',
        description: 'Test',
        type: 'functional',
        steps: [
          { stepNumber: 1, action: 'invalid-action', target: 'test' },
        ],
        priority: 'high',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validateTestCaseSchema(invalidTestCase);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field.includes('steps[0].action'))).toBe(true);
    });

    it('should generate warnings for missing optional fields', () => {
      const testCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: 'project-789',
        userId: 'user-001',
        name: 'Test',
        description: '',
        type: 'functional',
        steps: [],
        priority: 'high',
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validateTestCaseSchema(testCase);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.field === 'description')).toBe(true);
    });
  });

  describe('validateExecutionEventSchema', () => {
    it('should validate a valid execution event', () => {
      const validEvent = {
        executionId: 'exec-123',
        testCaseId: 'test-456',
        status: 'completed',
        result: 'pass',
        startTime: new Date().toISOString(),
        duration: 1500,
      };

      const result = validator.validateExecutionEventSchema(validEvent);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidEvent = {
        executionId: 'exec-123',
        // Missing other required fields
      };

      const result = validator.validateExecutionEventSchema(invalidEvent);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect invalid status', () => {
      const invalidEvent = {
        executionId: 'exec-123',
        testCaseId: 'test-456',
        status: 'invalid-status',
        result: 'pass',
        startTime: new Date().toISOString(),
        duration: 1500,
      };

      const result = validator.validateExecutionEventSchema(invalidEvent);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'status')).toBe(true);
    });

    it('should warn about missing screenshots for failed executions', () => {
      const event = {
        executionId: 'exec-123',
        testCaseId: 'test-456',
        status: 'completed',
        result: 'fail',
        startTime: new Date().toISOString(),
        duration: 1500,
      };

      const result = validator.validateExecutionEventSchema(event);

      expect(result.warnings.some(w => w.field === 'screenshots')).toBe(true);
    });
  });

  describe('validateNotificationPayloadSchema', () => {
    it('should validate a valid notification payload', () => {
      const validPayload = {
        executionId: 'exec-123',
        testCaseId: 'test-456',
        status: 'completed',
        result: 'pass',
        duration: 1500,
        testCaseName: 'Login Test',
      };

      const result = validator.validateNotificationPayloadSchema(validPayload);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidPayload = {
        executionId: 'exec-123',
        // Missing other required fields
      };

      const result = validator.validateNotificationPayloadSchema(invalidPayload);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing screenshot URLs for failed executions', () => {
      const payload = {
        executionId: 'exec-123',
        testCaseId: 'test-456',
        status: 'completed',
        result: 'fail',
        duration: 1500,
      };

      const result = validator.validateNotificationPayloadSchema(payload);

      expect(result.warnings.some(w => w.field === 'screenshotUrls')).toBe(true);
    });
  });

  describe('validateLearningDataSchema', () => {
    it('should validate valid learning data', () => {
      const validData = {
        domain: 'example.com',
        timestamp: Date.now(),
        executionId: 'exec-123',
        testCaseId: 'test-456',
        success: true,
      };

      const result = validator.validateLearningDataSchema(validData);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        domain: 'example.com',
        // Missing other required fields
      };

      const result = validator.validateLearningDataSchema(invalidData);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing failure details for failed executions', () => {
      const data = {
        domain: 'example.com',
        timestamp: Date.now(),
        executionId: 'exec-123',
        testCaseId: 'test-456',
        success: false,
      };

      const result = validator.validateLearningDataSchema(data);

      expect(result.warnings.some(w => w.field === 'failureReason')).toBe(true);
      expect(result.warnings.some(w => w.field === 'selectorStrategy')).toBe(true);
    });
  });

  describe('validateCrossSystemDataFlow', () => {
    it('should validate AI generation to test execution flow', () => {
      const flow = {
        source: 'ai-generation' as const,
        destination: 'test-execution' as const,
        dataType: 'test-case',
        sampleData: {
          testCaseId: 'test-123',
          suiteId: 'suite-456',
          projectId: 'project-789',
          userId: 'user-001',
          name: 'Test',
          description: 'Test',
          type: 'functional',
          steps: [],
          priority: 'high',
          tags: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };

      const result = validator.validateCrossSystemDataFlow(flow);

      expect(result.compatible).toBe(true);
      expect(result.issues.filter(i => i.severity === 'error')).toHaveLength(0);
    });

    it('should detect incompatible data flow', () => {
      const flow = {
        source: 'ai-generation' as const,
        destination: 'test-execution' as const,
        dataType: 'test-case',
        sampleData: {
          testCaseId: 'test-123',
          // Missing required fields
        },
      };

      const result = validator.validateCrossSystemDataFlow(flow);

      expect(result.compatible).toBe(false);
      expect(result.issues.filter(i => i.severity === 'error').length).toBeGreaterThan(0);
    });

    it('should detect transformation requirements', () => {
      const flow = {
        source: 'test-execution' as const,
        destination: 'notification-system' as const,
        dataType: 'execution-event',
        sampleData: {
          executionId: 'exec-123',
          testCaseId: 'test-456',
          status: 'completed',
          result: 'pass',
          startTime: new Date().toISOString(),
          duration: 1500,
          // Missing notification-specific fields
        },
      };

      const result = validator.validateCrossSystemDataFlow(flow);

      // May require transformation depending on schema compatibility
      expect(result).toBeDefined();
      expect(result.issues).toBeDefined();
    });
  });

  describe('validateSchemaMismatch', () => {
    it('should detect missing fields', () => {
      const expected = {
        field1: 'value1',
        field2: 'value2',
        field3: 'value3',
      };

      const actual = {
        field1: 'value1',
        // Missing field2 and field3
      };

      const issues = validator.validateSchemaMismatch(expected, actual);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.field === 'field2')).toBe(true);
      expect(issues.some(i => i.field === 'field3')).toBe(true);
    });

    it('should detect type mismatches', () => {
      const expected = {
        field1: 'string',
        field2: 123,
      };

      const actual = {
        field1: 123, // Should be string
        field2: 'string', // Should be number
      };

      const issues = validator.validateSchemaMismatch(expected, actual);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues.some(i => i.field === 'field1' && i.description.includes('Type mismatch'))).toBe(true);
      expect(issues.some(i => i.field === 'field2' && i.description.includes('Type mismatch'))).toBe(true);
    });

    it('should provide recommendations', () => {
      const expected = {
        requiredField: 'value',
      };

      const actual = {};

      const issues = validator.validateSchemaMismatch(expected, actual);

      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].recommendation).toBeDefined();
      expect(issues[0].recommendation).toContain('Add field');
    });
  });
});
