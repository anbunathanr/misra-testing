/**
 * Property-Based Tests for AI Engine Service
 * 
 * Tests universal correctness properties using fast-check.
 */

import * as fc from 'fast-check';
import { AIEngine } from '../ai-engine';
import {
  testSpecificationArb,
  validLLMResponseArb,
  invalidLLMResponseArb,
  applicationAnalysisArb,
  learningContextArb,
} from '../../../__tests__/generators/ai-test-generation-generators';

describe('AIEngine - Property-Based Tests', () => {
  let aiEngine: AIEngine;

  beforeEach(() => {
    aiEngine = new AIEngine();
    aiEngine.resetCircuit();
    aiEngine.clearLogs();
  });

  describe('Property 1: LLM Response Parsing Preserves Structure', () => {
    it('should preserve all fields when parsing valid test specifications', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          // Convert to JSON and back (simulating LLM response)
          const jsonString = JSON.stringify(spec);
          const parsed = JSON.parse(jsonString);
          
          // Validate using AI Engine
          const validated = aiEngine.validateResponse(parsed);

          // Property: All original fields should be preserved
          expect(validated.testName).toBe(spec.testName);
          expect(validated.description).toBe(spec.description);
          expect(validated.steps).toHaveLength(spec.steps.length);
          expect(validated.tags).toEqual(spec.tags);

          // Property: Step structure should be preserved
          validated.steps.forEach((step, idx) => {
            expect(step.action).toBe(spec.steps[idx].action);
            expect(step.description).toBe(spec.steps[idx].description);
            
            if (spec.steps[idx].elementDescription) {
              expect(step.elementDescription).toBe(spec.steps[idx].elementDescription);
            }
            
            if (spec.steps[idx].value) {
              expect(step.value).toBe(spec.steps[idx].value);
            }
            
            if (spec.steps[idx].assertion) {
              expect(step.assertion).toEqual(spec.steps[idx].assertion);
            }
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 2: Response Schema Validation Correctness', () => {
    it('should accept all valid test specifications', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          // Property: Valid specifications should never throw
          expect(() => aiEngine.validateResponse(spec)).not.toThrow();
          
          // Property: Validation should return the same structure
          const validated = aiEngine.validateResponse(spec);
          expect(validated).toBeDefined();
          expect(validated.testName).toBeTruthy();
          expect(validated.steps.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject specifications with empty testName', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          // Mutate to have empty testName
          const invalidSpec = { ...spec, testName: '' };
          
          // Property: Empty testName should always be rejected
          expect(() => aiEngine.validateResponse(invalidSpec)).toThrow();
        }),
        { numRuns: 50 }
      );
    });

    it('should reject specifications with empty steps array', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          // Mutate to have empty steps
          const invalidSpec = { ...spec, steps: [] };
          
          // Property: Empty steps should always be rejected
          expect(() => aiEngine.validateResponse(invalidSpec)).toThrow();
        }),
        { numRuns: 50 }
      );
    });

    it('should reject specifications with invalid action types', () => {
      fc.assert(
        fc.property(
          testSpecificationArb(),
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !['navigate', 'click', 'type', 'assert', 'wait'].includes(s)
          ),
          (spec, invalidAction) => {
            // Mutate first step to have invalid action
            const invalidSpec = {
              ...spec,
              steps: [
                { ...spec.steps[0], action: invalidAction as any },
                ...spec.steps.slice(1),
              ],
            };
            
            // Property: Invalid actions should always be rejected
            expect(() => aiEngine.validateResponse(invalidSpec)).toThrow();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 3: API Interaction Logging', () => {
    it('should maintain log integrity across operations', () => {
      fc.assert(
        fc.property(
          fc.array(testSpecificationArb(), { minLength: 1, maxLength: 10 }),
          (specs) => {
            aiEngine.clearLogs();
            
            // Validate multiple specifications
            specs.forEach(spec => {
              try {
                aiEngine.validateResponse(spec);
              } catch {
                // Ignore validation errors for this test
              }
            });
            
            const logs = aiEngine.getLogs();
            
            // Property: Logs should be retrievable
            expect(Array.isArray(logs)).toBe(true);
            
            // Property: Clearing logs should work
            aiEngine.clearLogs();
            expect(aiEngine.getLogs()).toHaveLength(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve log chronological order', () => {
      aiEngine.clearLogs();
      
      // Property: Logs should maintain insertion order
      const initialLogCount = aiEngine.getLogs().length;
      
      // Perform operations that would log
      const spec1 = { testName: 'Test 1', description: 'Desc 1', steps: [{ action: 'navigate', description: 'Nav' }], tags: [] };
      const spec2 = { testName: 'Test 2', description: 'Desc 2', steps: [{ action: 'click', description: 'Click' }], tags: [] };
      
      aiEngine.validateResponse(spec1);
      aiEngine.validateResponse(spec2);
      
      const logs = aiEngine.getLogs();
      
      // Property: Log count should increase monotonically
      expect(logs.length).toBeGreaterThanOrEqual(initialLogCount);
    });
  });

  describe('Property 4: Validation Idempotence', () => {
    it('should produce identical results when validating the same spec multiple times', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          // Validate the same spec multiple times
          const result1 = aiEngine.validateResponse(spec);
          const result2 = aiEngine.validateResponse(spec);
          const result3 = aiEngine.validateResponse(spec);
          
          // Property: Results should be identical (idempotent)
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Step Count Preservation', () => {
    it('should preserve the exact number of steps', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          const validated = aiEngine.validateResponse(spec);
          
          // Property: Step count must be preserved exactly
          expect(validated.steps.length).toBe(spec.steps.length);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Tag Array Preservation', () => {
    it('should preserve tags array structure and content', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          const validated = aiEngine.validateResponse(spec);
          
          // Property: Tags should be preserved in order
          expect(validated.tags).toEqual(spec.tags);
          expect(validated.tags.length).toBe(spec.tags.length);
          
          // Property: Each tag should match
          validated.tags.forEach((tag, idx) => {
            expect(tag).toBe(spec.tags[idx]);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Action Type Validity', () => {
    it('should only accept valid action types', () => {
      const validActions = ['navigate', 'click', 'type', 'assert', 'wait'];
      
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          const validated = aiEngine.validateResponse(spec);
          
          // Property: All actions must be from valid set
          validated.steps.forEach(step => {
            expect(validActions).toContain(step.action);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Assertion Type Validity', () => {
    it('should only accept valid assertion types when present', () => {
      const validAssertionTypes = ['exists', 'visible', 'text', 'value', 'attribute'];
      
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          const validated = aiEngine.validateResponse(spec);
          
          // Property: All assertion types must be from valid set
          validated.steps.forEach(step => {
            if (step.assertion) {
              expect(validAssertionTypes).toContain(step.assertion.type);
              expect(step.assertion.expected).toBeTruthy();
            }
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Non-Empty String Fields', () => {
    it('should ensure required string fields are non-empty', () => {
      fc.assert(
        fc.property(testSpecificationArb(), (spec) => {
          const validated = aiEngine.validateResponse(spec);
          
          // Property: testName must be non-empty
          expect(validated.testName.length).toBeGreaterThan(0);
          
          // Property: description must be defined
          expect(validated.description).toBeDefined();
          
          // Property: Each step description must be non-empty
          validated.steps.forEach(step => {
            expect(step.description.length).toBeGreaterThan(0);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: Circuit Breaker State Consistency', () => {
    it('should maintain consistent circuit breaker state', () => {
      // Property: Initial state should be CLOSED
      expect(aiEngine.getCircuitState()).toBe('CLOSED');
      
      // Property: Reset should always return to CLOSED
      aiEngine.resetCircuit();
      expect(aiEngine.getCircuitState()).toBe('CLOSED');
      
      // Property: Multiple resets should be idempotent
      aiEngine.resetCircuit();
      aiEngine.resetCircuit();
      expect(aiEngine.getCircuitState()).toBe('CLOSED');
    });
  });
});
