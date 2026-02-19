import { TestValidator } from '../test-validator';
import { TestCase } from '../../../types/test-case';

describe('TestValidator', () => {
  let validator: TestValidator;

  beforeEach(() => {
    validator = new TestValidator();
  });

  describe('validate', () => {
    it('should validate a valid test case', () => {
      const testCase: TestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-789',
        name: 'Valid Test Case',
        description: 'A valid test case',
        type: 'ui',
        priority: 'medium',
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
        ],
        tags: ['ai-generated'],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when testCaseId is missing', () => {
      const testCase: TestCase = {
        testCaseId: '',
        suiteId: 'suite-456',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-789',
        name: 'Test Case',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
          },
        ],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'testCaseId',
        message: 'Test case ID is required',
      });
    });

    it('should fail validation when name is empty', () => {
      const testCase: TestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-789',
        name: '   ',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
          },
        ],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Test case name cannot be empty',
      });
    });

    it('should fail validation when projectId format is invalid', () => {
      const testCase: TestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: 'invalid-uuid',
        userId: 'user-789',
        name: 'Test Case',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
          },
        ],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'projectId',
        message: 'Project ID must be a valid UUID',
      });
    });

    it('should fail validation when steps array is empty', () => {
      const testCase: TestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-789',
        name: 'Test Case',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'steps',
        message: 'Test case must have at least one step',
      });
    });

    it('should fail validation when navigate URL is invalid', () => {
      const testCase: TestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-789',
        name: 'Test Case',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'ftp://example.com',
          },
        ],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'steps[0].target',
        message: 'Navigate URL must use HTTP or HTTPS protocol',
      });
    });

    it('should fail validation when click selector is empty', () => {
      const testCase: TestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-789',
        name: 'Test Case',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
          },
          {
            stepNumber: 2,
            action: 'click',
            target: '',
          },
        ],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'steps[1].target',
        message: 'Click step must have a target selector',
      });
    });

    it('should fail validation when type step has no value', () => {
      const testCase: TestCase = {
        testCaseId: 'test-123',
        suiteId: 'suite-456',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-789',
        name: 'Test Case',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
          },
          {
            stepNumber: 2,
            action: 'type',
            target: '#input-field',
          },
        ],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual({
        field: 'steps[1].value',
        message: 'Type step must have a value',
      });
    });

    it('should collect multiple validation errors', () => {
      const testCase: TestCase = {
        testCaseId: '',
        suiteId: 'suite-456',
        projectId: 'invalid-uuid',
        userId: 'user-789',
        name: '',
        description: 'Test description',
        type: 'ui',
        priority: 'medium',
        steps: [],
        tags: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const result = validator.validate(testCase);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContainEqual({
        field: 'testCaseId',
        message: 'Test case ID is required',
      });
      expect(result.errors).toContainEqual({
        field: 'name',
        message: 'Test case name cannot be empty',
      });
      expect(result.errors).toContainEqual({
        field: 'projectId',
        message: 'Project ID must be a valid UUID',
      });
      expect(result.errors).toContainEqual({
        field: 'steps',
        message: 'Test case must have at least one step',
      });
    });
  });
});
