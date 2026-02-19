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
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
            description: 'Navigate to example',
          },
          {
            stepNumber: 2,
            action: 'click',
            target: '#submit-button',
            description: 'Click submit',
          },
        ],
        tags: ['ai-generated'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
            description: 'Navigate',
          },
        ],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
            description: 'Navigate',
          },
        ],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
            description: 'Navigate',
          },
        ],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'ftp://example.com',
            description: 'Navigate',
          },
        ],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
            description: 'Navigate',
          },
          {
            stepNumber: 2,
            action: 'click',
            target: '',
            description: 'Click',
          },
        ],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [
          {
            stepNumber: 1,
            action: 'navigate',
            target: 'https://example.com',
            description: 'Navigate',
          },
          {
            stepNumber: 2,
            action: 'type',
            target: '#input-field',
            description: 'Type',
          },
        ],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        type: 'ui',
        steps: [],
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
