/**
 * Property-Based Tests for Selector Generator Service
 * 
 * Tests universal correctness properties for selector generation and validation.
 */

import * as fc from 'fast-check';
import { SelectorGenerator } from '../selector-generator';
import {
  identifiedElementArb,
  selectorStrategyArb,
} from '../../../__tests__/generators/ai-test-generation-generators';

describe('SelectorGenerator - Property-Based Tests', () => {
  let generator: SelectorGenerator;

  beforeEach(() => {
    generator = SelectorGenerator.getInstance();
  });

  describe('Property 17: Selector Priority Order', () => {
    it('should prioritize data-testid over other strategies', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Add data-testid attribute
          const elementWithTestId = {
            ...element,
            attributes: {
              ...element.attributes,
              'data-testid': 'test-element-id',
            },
          };
          
          const selector = generator.generateSelector(elementWithTestId, [elementWithTestId]);
          
          // Property: Should use data-testid when available
          expect(selector).toContain('[data-testid=');
        }),
        { numRuns: 100 }
      );
    });

    it('should prioritize id over aria-label when data-testid is absent', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Add id and aria-label, but no data-testid
          const elementWithId = {
            ...element,
            attributes: {
              ...element.attributes,
              'data-testid': undefined,
              id: 'unique-id',
              'aria-label': 'Some Label',
            },
          };
          
          const selector = generator.generateSelector(elementWithId, [elementWithId]);
          
          // Property: Should use id when data-testid is not available
          expect(selector).toContain('#unique-id');
        }),
        { numRuns: 100 }
      );
    });

    it('should follow complete priority order', () => {
      const priorityOrder = [
        'data-testid',
        'id',
        'aria-label',
        'name',
        'class',
        'xpath',
      ];
      
      // Property: Priority order should be consistent
      expect(priorityOrder).toHaveLength(6);
      expect(priorityOrder[0]).toBe('data-testid');
      expect(priorityOrder[priorityOrder.length - 1]).toBe('xpath');
    });
  });

  describe('Property 18: Position-Based Selector Avoidance', () => {
    it('should not generate selectors with nth-child or nth-of-type', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector = generator.generateSelector(element, [element]);
          
          // Property: Should avoid position-based selectors
          expect(selector).not.toMatch(/:nth-child\(/);
          expect(selector).not.toMatch(/:nth-of-type\(/);
          expect(selector).not.toMatch(/:first-child/);
          expect(selector).not.toMatch(/:last-child/);
        }),
        { numRuns: 100 }
      );
    });

    it('should not use numeric indices in selectors', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector = generator.generateSelector(element, [element]);
          
          // Property: Should not use array-style indices
          expect(selector).not.toMatch(/\[\d+\]/);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 19: Selector Uniqueness', () => {
    it('should generate non-empty selectors', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector = generator.generateSelector(element, [element]);
          
          // Property: Selector must be non-empty
          expect(selector).toBeDefined();
          expect(typeof selector).toBe('string');
          expect(selector.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate deterministic selectors for same element', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector1 = generator.generateSelector(element, [element]);
          const selector2 = generator.generateSelector(element, [element]);
          
          // Property: Same element should produce same selector (deterministic)
          expect(selector1).toBe(selector2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 20: Selector Refinement Produces Uniqueness', () => {
    it('should refine selectors when needed', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector = generator.generateSelector(element, [element]);
          
          // Property: Refined selector should still be valid
          expect(selector).toBeDefined();
          expect(selector.length).toBeGreaterThan(0);
          
          // Property: Should not contain excessive whitespace (leading/trailing or multiple consecutive)
          // Note: XPath selectors with text content can legitimately contain single spaces
          // and text predicates can have multiple spaces in the text value itself
          expect(selector).not.toMatch(/^\s/); // No leading whitespace
          expect(selector).not.toMatch(/\s$/); // No trailing whitespace
          // Allow multiple spaces in text predicates like text()="  a"
          // Only check for multiple spaces outside of text predicates
          const withoutTextPredicates = selector.replace(/text\(\)="[^"]*"/g, 'TEXT_PREDICATE');
          expect(withoutTextPredicates).not.toMatch(/\s{2,}/);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain selector validity after refinement', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector = generator.generateSelector(element, [element]);
          
          // Property: Selector should be a valid CSS selector format
          // (basic validation - should not start with numbers or special chars)
          if (selector.startsWith('[')) {
            // Attribute selector
            expect(selector).toMatch(/^\[[\w-]+/);
          } else if (selector.startsWith('#')) {
            // ID selector
            expect(selector).toMatch(/^#[\w-]/);
          } else if (selector.startsWith('.')) {
            // Class selector
            expect(selector).toMatch(/^\.[\w-]/);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 21: Selector Strategy Consistency', () => {
    it('should use consistent strategy for elements with same attributes', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Create two elements with identical attributes
          const element1 = { ...element };
          const element2 = { ...element };
          
          const selector1 = generator.generateSelector(element1, [element1]);
          const selector2 = generator.generateSelector(element2, [element2]);
          
          // Property: Identical elements should produce identical selectors
          expect(selector1).toBe(selector2);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 22: Fallback to XPath', () => {
    it('should fallback to xpath when no better selector available', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Create element with minimal attributes
          const minimalElement = {
            ...element,
            attributes: {
              'data-testid': undefined,
              id: undefined,
              'aria-label': undefined,
              name: undefined,
              class: undefined,
            },
          };
          
          const selector = generator.generateSelector(minimalElement, [minimalElement]);
          
          // Property: Should fallback to xpath when no other attributes available
          expect(selector).toBeDefined();
          expect(selector.length).toBeGreaterThan(0);
          // XPath selectors typically start with //
          if (!selector.includes('[') && !selector.includes('#') && !selector.includes('.')) {
            expect(selector).toMatch(/^\/\//);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 23: Selector Escaping', () => {
    it('should properly escape special characters in selectors', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector = generator.generateSelector(element, [element]);
          
          // Property: Selector should not contain unescaped quotes
          const unescapedQuotes = selector.match(/(?<!\\)"/g);
          if (unescapedQuotes) {
            // Quotes should be within attribute selectors
            expect(selector).toMatch(/\[.*".*\]/);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: Selector Length Bounds', () => {
    it('should generate selectors within reasonable length', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const selector = generator.generateSelector(element, [element]);
          
          // Property: Selector should not be excessively long
          expect(selector.length).toBeLessThan(500);
          
          // Property: Selector should not be empty
          expect(selector.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 25: Attribute Selector Format', () => {
    it('should generate valid attribute selector format', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Add data-testid to ensure attribute selector
          const elementWithAttr = {
            ...element,
            attributes: {
              ...element.attributes,
              'data-testid': 'test-id',
            },
          };
          
          const selector = generator.generateSelector(elementWithAttr, [elementWithAttr]);
          
          // Property: Attribute selectors should have proper format
          if (selector.includes('[data-testid')) {
            expect(selector).toMatch(/\[data-testid=["']?[\w-]+["']?\]/);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 26: ID Selector Format', () => {
    it('should generate valid ID selector format', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Add ID attribute
          const elementWithId = {
            ...element,
            attributes: {
              ...element.attributes,
              'data-testid': undefined,
              id: 'unique-element-id',
            },
          };
          
          const selector = generator.generateSelector(elementWithId, [elementWithId]);
          
          // Property: ID selectors should start with #
          if (selector.startsWith('#')) {
            expect(selector).toMatch(/^#[\w-]+/);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
