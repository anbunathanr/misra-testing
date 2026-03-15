/**
 * Property-Based Tests for Test Validator Service
 * 
 * Tests universal correctness properties for test case validation.
 */

import * as fc from 'fast-check';
import { TestValidator } from '../test-validator';
import {
  testCaseArb,
  testStepArb,
  validationResultArb,
} from '../../../__tests__/generators/ai-test-generation-generators';

describe('TestValidator - Property-Based Tests', () => {
  let validator: TestValidator;

  beforeEach(() => {
    validator = new TestValidator();
  });

  describe('Property 21: Test Case Schema Validation', () => {
    it('should validate complete test cases successfully', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result = validator.validate(testCase);
          
          // Property: Valid test cases should pass validation
          expect(result).toBeDefined();
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should reject test cases with missing required fields', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          // Remove required field
          const invalidCase = { ...testCase, name: undefined as any };
          
          const result = validator.validate(invalidCase);
          
          // Property: Missing required fields should fail validation
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);
        }),
        { numRuns: 50 }
      );
    });

    it('should validate all test case fields', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result = validator.validate(testCase);
          
          if (result.valid) {
            // Property: Valid cases should have all required fields
            expect(testCase.testCaseId).toBeDefined();
            expect(testCase.projectId).toBeDefined();
            expect(testCase.name).toBeDefined();
            expect(testCase.steps).toBeDefined();
            expect(Array.isArray(testCase.steps)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 22: Selector Non-Empty Validation', () => {
    it('should reject steps with empty selectors', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          // Create invalid case with empty selector
          const invalidCase = {
            ...testCase,
            steps: [
              {
                ...testCase.steps[0],
                target: '', // Empty selector
              },
            ],
          };
          
          const result = validator.validate(invalidCase);
          
          // Property: Empty selectors should fail validation
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.field.includes('target'))).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should accept steps with non-empty selectors', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          // Ensure all selectors are non-empty
          const validCase = {
            ...testCase,
            steps: testCase.steps.map(step => ({
              ...step,
              target: step.target || 'valid-selector',
            })),
          };
          
          const result = validator.validate(validCase);
          
          // Property: Non-empty selectors should pass
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 23: Navigate URL Validation', () => {
    it('should accept valid HTTP/HTTPS URLs', () => {
      fc.assert(
        fc.property(
          testCaseArb(),
          fc.webUrl({ validSchemes: ['http', 'https'] }),
          (testCase, url) => {
            const validCase = {
              ...testCase,
              steps: [
                {
                  stepNumber: 1,
                  action: 'navigate' as const,
                  target: url,
                },
                ...testCase.steps.slice(1),
              ],
            };
            
            const result = validator.validate(validCase);
            
            // Property: Valid URLs should pass validation
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject invalid URL schemes', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const invalidCase = {
            ...testCase,
            steps: [
              {
                stepNumber: 1,
                action: 'navigate' as const,
                target: 'ftp://invalid-scheme.com',
              },
            ],
          };
          
          const result = validator.validate(invalidCase);
          
          // Property: Invalid URL schemes should fail validation
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.message.toLowerCase().includes('url'))).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should reject malformed URLs', () => {
      fc.assert(
        fc.property(
          testCaseArb(),
          fc.string({ minLength: 1, maxLength: 20 }).filter(s => !s.startsWith('http')),
          (testCase, invalidUrl) => {
            const invalidCase = {
              ...testCase,
              steps: [
                {
                  stepNumber: 1,
                  action: 'navigate' as const,
                  target: invalidUrl,
                },
              ],
            };
            
            const result = validator.validate(invalidCase);
            
            // Property: Malformed URLs should fail validation
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 24: Test Case Name Validation', () => {
    it('should reject empty test case names', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const invalidCase = { ...testCase, name: '' };
          
          const result = validator.validate(invalidCase);
          
          // Property: Empty names should fail validation
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.field === 'name')).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should accept non-empty test case names', () => {
      fc.assert(
        fc.property(
          testCaseArb(),
          fc.string({ minLength: 1, maxLength: 100 }),
          (testCase, name) => {
            const validCase = { ...testCase, name };
            
            const result = validator.validate(validCase);
            
            // Property: Non-empty names should pass validation
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: Project ID Format Validation', () => {
    it('should accept valid UUID format', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result = validator.validate(testCase);
          
          // Property: Valid UUIDs should pass validation
          expect(result.valid).toBe(true);
          
          // Property: Project ID should be UUID format
          expect(testCase.projectId).toMatch(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid UUID format', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const invalidCase = {
            ...testCase,
            projectId: 'not-a-valid-uuid',
          };
          
          const result = validator.validate(invalidCase);
          
          // Property: Invalid UUIDs should fail validation
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.field.includes('projectId'))).toBe(true);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 26: Validation Error Completeness', () => {
    it('should collect all validation errors', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          // Create case with multiple errors
          const invalidCase = {
            ...testCase,
            name: '', // Error 1
            projectId: 'invalid', // Error 2
            steps: [], // Error 3
          };
          
          const result = validator.validate(invalidCase);
          
          // Property: Should collect all errors, not fail fast
          expect(result.valid).toBe(false);
          expect(result.errors.length).toBeGreaterThanOrEqual(2);
        }),
        { numRuns: 50 }
      );
    });

    it('should provide descriptive error messages', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const invalidCase = { ...testCase, name: '' };
          
          const result = validator.validate(invalidCase);
          
          // Property: Error messages should be descriptive
          result.errors.forEach(error => {
            expect(error.field).toBeDefined();
            expect(error.message).toBeDefined();
            expect(error.message.length).toBeGreaterThan(0);
          });
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 27: Valid Test Case Acceptance', () => {
    it('should accept all valid test cases', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result = validator.validate(testCase);
          
          // Property: Valid test cases should always pass
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should be deterministic for same input', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result1 = validator.validate(testCase);
          const result2 = validator.validate(testCase);
          
          // Property: Same input should produce same result
          expect(result1.valid).toBe(result2.valid);
          expect(result1.errors).toEqual(result2.errors);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 28: Step Action Validation', () => {
    it('should validate action types', () => {
      const validActions = ['navigate', 'click', 'type', 'assert', 'wait', 'api-call'];
      
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result = validator.validate(testCase);
          
          if (result.valid) {
            // Property: All actions should be from valid set
            testCase.steps.forEach(step => {
              expect(validActions).toContain(step.action);
            });
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should reject invalid action types', () => {
      fc.assert(
        fc.property(
          testCaseArb(),
          fc.string({ minLength: 1, maxLength: 20 }).filter(
            s => !['navigate', 'click', 'type', 'assert', 'wait', 'api-call'].includes(s)
          ),
          (testCase, invalidAction) => {
            const invalidCase = {
              ...testCase,
              steps: [
                {
                  ...testCase.steps[0],
                  action: invalidAction as any,
                },
              ],
            };
            
            const result = validator.validate(invalidCase);
            
            // Property: Invalid actions should fail validation
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 29: Steps Array Validation', () => {
    it('should reject empty steps array', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const invalidCase = { ...testCase, steps: [] };
          
          const result = validator.validate(invalidCase);
          
          // Property: Empty steps should fail validation
          expect(result.valid).toBe(false);
          expect(result.errors.some(e => e.field.includes('steps'))).toBe(true);
        }),
        { numRuns: 50 }
      );
    });

    it('should accept non-empty steps array', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          // Ensure at least one step
          const validCase = {
            ...testCase,
            steps: testCase.steps.length > 0 ? testCase.steps : [
              {
                stepNumber: 1,
                action: 'navigate' as const,
                target: 'https://example.com',
              },
            ],
          };
          
          const result = validator.validate(validCase);
          
          // Property: Non-empty steps should pass validation
          expect(result.valid).toBe(true);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 30: Validation Result Structure', () => {
    it('should always return valid result structure', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result = validator.validate(testCase);
          
          // Property: Result should have required fields
          expect(result).toHaveProperty('valid');
          expect(result).toHaveProperty('errors');
          expect(typeof result.valid).toBe('boolean');
          expect(Array.isArray(result.errors)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain error array structure', () => {
      fc.assert(
        fc.property(testCaseArb(), (testCase) => {
          const result = validator.validate(testCase);
          
          // Property: Each error should have field and message
          result.errors.forEach(error => {
            expect(error).toHaveProperty('field');
            expect(error).toHaveProperty('message');
            expect(typeof error.field).toBe('string');
            expect(typeof error.message).toBe('string');
          });
        }),
        { numRuns: 100 }
      );
    });
  });
});
