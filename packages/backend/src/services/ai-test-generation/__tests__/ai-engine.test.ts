/**
 * Unit tests for AI Engine Service
 */

import { AIEngine, CircuitState } from '../ai-engine';
import { ApplicationAnalysis, TestSpecification } from '../../../types/ai-test-generation';

// Mock OpenAI API key for tests
process.env.OPENAI_API_KEY = 'test-api-key';

describe('AIEngine', () => {
  let aiEngine: AIEngine;

  beforeEach(() => {
    aiEngine = new AIEngine();
    aiEngine.resetCircuit();
    aiEngine.clearLogs();
  });

  describe('validateResponse', () => {
    it('should validate a valid test specification', () => {
      const validSpec = {
        testName: 'Login Test',
        description: 'Test user login functionality',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate to login page',
          },
          {
            action: 'type',
            description: 'Enter username',
            elementDescription: 'username input field',
            value: 'testuser',
          },
          {
            action: 'click',
            description: 'Click login button',
            elementDescription: 'login button',
          },
          {
            action: 'assert',
            description: 'Verify successful login',
            elementDescription: 'welcome message',
            assertion: {
              type: 'visible',
              expected: 'Welcome',
            },
          },
        ],
        tags: ['login', 'authentication'],
      };

      const result = aiEngine.validateResponse(validSpec);

      expect(result).toEqual(validSpec);
      expect(result.testName).toBe('Login Test');
      expect(result.steps).toHaveLength(4);
      expect(result.tags).toContain('login');
    });

    it('should reject specification with missing testName', () => {
      const invalidSpec = {
        testName: '',
        description: 'Test description',
        steps: [
          {
            action: 'navigate',
            description: 'Navigate',
          },
        ],
        tags: [],
      };

      expect(() => aiEngine.validateResponse(invalidSpec)).toThrow(
        /AI generated invalid test specification/
      );
    });

    it('should reject specification with empty steps array', () => {
      const invalidSpec = {
        testName: 'Test',
        description: 'Test description',
        steps: [],
        tags: [],
      };

      expect(() => aiEngine.validateResponse(invalidSpec)).toThrow(
        /AI generated invalid test specification/
      );
    });

    it('should reject specification with invalid action type', () => {
      const invalidSpec = {
        testName: 'Test',
        description: 'Test description',
        steps: [
          {
            action: 'invalid-action',
            description: 'Invalid step',
          },
        ],
        tags: [],
      };

      expect(() => aiEngine.validateResponse(invalidSpec)).toThrow(
        /AI generated invalid test specification/
      );
    });

    it('should accept all valid action types', () => {
      const validActions = ['navigate', 'click', 'type', 'assert', 'wait'];

      validActions.forEach((action) => {
        const spec = {
          testName: `Test ${action}`,
          description: 'Test description',
          steps: [
            {
              action,
              description: `${action} step`,
            },
          ],
          tags: [],
        };

        expect(() => aiEngine.validateResponse(spec)).not.toThrow();
      });
    });

    it('should accept specification with optional fields', () => {
      const specWithOptionals = {
        testName: 'Test',
        description: 'Test description',
        steps: [
          {
            action: 'type',
            description: 'Type text',
            elementDescription: 'input field',
            value: 'test value',
          },
          {
            action: 'assert',
            description: 'Assert text',
            elementDescription: 'result element',
            assertion: {
              type: 'text',
              expected: 'expected text',
            },
          },
        ],
        tags: ['tag1', 'tag2'],
      };

      const result = aiEngine.validateResponse(specWithOptionals);

      expect(result.steps[0].elementDescription).toBe('input field');
      expect(result.steps[0].value).toBe('test value');
      expect(result.steps[1].assertion).toEqual({
        type: 'text',
        expected: 'expected text',
      });
    });

    it('should accept all valid assertion types', () => {
      const validAssertionTypes = ['exists', 'visible', 'text', 'value', 'attribute'];

      validAssertionTypes.forEach((assertionType) => {
        const spec = {
          testName: 'Test',
          description: 'Test description',
          steps: [
            {
              action: 'assert',
              description: 'Assert step',
              assertion: {
                type: assertionType,
                expected: 'expected value',
              },
            },
          ],
          tags: [],
        };

        expect(() => aiEngine.validateResponse(spec)).not.toThrow();
      });
    });
  });

  describe('Circuit Breaker', () => {
    it('should start in CLOSED state', () => {
      expect(aiEngine.getCircuitState()).toBe(CircuitState.CLOSED);
    });

    it('should reset circuit breaker', () => {
      aiEngine.resetCircuit();
      expect(aiEngine.getCircuitState()).toBe(CircuitState.CLOSED);
    });
  });

  describe('API Logging', () => {
    it('should start with empty logs', () => {
      const logs = aiEngine.getLogs();
      expect(logs).toEqual([]);
    });

    it('should clear logs', () => {
      aiEngine.clearLogs();
      const logs = aiEngine.getLogs();
      expect(logs).toEqual([]);
    });
  });
});
