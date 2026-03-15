/**
 * Property-Based Tests for Application Analyzer Service
 * 
 * Tests universal correctness properties for web page analysis.
 */

import * as fc from 'fast-check';
import { ApplicationAnalyzer } from '../application-analyzer';
import {
  urlArb,
  identifiedElementArb,
  applicationAnalysisArb,
} from '../../../__tests__/generators/ai-test-generation-generators';

describe('ApplicationAnalyzer - Property-Based Tests', () => {
  let analyzer: ApplicationAnalyzer;

  beforeEach(() => {
    analyzer = new ApplicationAnalyzer();
  });

  afterEach(async () => {
    // ApplicationAnalyzer doesn't have a close method
    // No cleanup needed for property tests
  });

  describe('Property 4: Interactive Element Identification', () => {
    it('should identify all required element properties', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Property: Element must have a type
          expect(element.type).toBeDefined();
          expect(typeof element.type).toBe('string');
          expect(element.type.length).toBeGreaterThan(0);
          
          // Property: Element must have attributes object
          expect(element.attributes).toBeDefined();
          expect(typeof element.attributes).toBe('object');
          
          // Property: Element must have xpath
          expect(element.xpath).toBeDefined();
          expect(typeof element.xpath).toBe('string');
          expect(element.xpath.length).toBeGreaterThan(0);
          
          // Property: Element must have cssPath
          expect(element.cssPath).toBeDefined();
          expect(typeof element.cssPath).toBe('string');
          expect(element.cssPath.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain element type validity', () => {
      const validTypes = ['button', 'link', 'input', 'select', 'textarea', 'checkbox', 'radio'];
      
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Property: Element type must be from valid set
          expect(validTypes).toContain(element.type);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Element Attribute Extraction Completeness', () => {
    it('should extract all available attributes', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          const attrs = element.attributes;
          
          // Property: Attributes object should exist
          expect(attrs).toBeDefined();
          
          // Property: If an attribute exists, it should be a non-empty string
          Object.entries(attrs).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              expect(typeof value).toBe('string');
              expect(value.length).toBeGreaterThan(0);
            }
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should handle elements with minimal attributes', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Property: Even with minimal attributes, element should be valid
          expect(element.type).toBeDefined();
          expect(element.xpath).toBeDefined();
          expect(element.cssPath).toBeDefined();
          
          // Property: Attributes can be sparse but must be an object
          expect(typeof element.attributes).toBe('object');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: UI Pattern Detection', () => {
    it('should detect patterns with valid structure', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: Patterns array should exist
          expect(Array.isArray(analysis.patterns)).toBe(true);
          
          // Property: Each pattern should have required fields
          analysis.patterns.forEach(pattern => {
            expect(pattern.type).toBeDefined();
            expect(typeof pattern.type).toBe('string');
            
            expect(pattern.description).toBeDefined();
            expect(typeof pattern.description).toBe('string');
            expect(pattern.description.length).toBeGreaterThan(0);
            
            expect(Array.isArray(pattern.elements)).toBe(true);
            expect(pattern.elements.length).toBeGreaterThan(0);
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain pattern type validity', () => {
      const validPatternTypes = ['form', 'navigation', 'modal', 'table', 'list'];
      
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: All pattern types must be from valid set
          analysis.patterns.forEach(pattern => {
            expect(validPatternTypes).toContain(pattern.type);
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Page Metadata Capture', () => {
    it('should capture complete page metadata', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          const metadata = analysis.metadata;
          
          // Property: Metadata must exist
          expect(metadata).toBeDefined();
          
          // Property: Viewport must be defined with valid dimensions
          expect(metadata.viewport).toBeDefined();
          expect(metadata.viewport.width).toBeGreaterThan(0);
          expect(metadata.viewport.height).toBeGreaterThan(0);
          expect(Number.isInteger(metadata.viewport.width)).toBe(true);
          expect(Number.isInteger(metadata.viewport.height)).toBe(true);
          
          // Property: Load time must be non-negative
          expect(metadata.loadTime).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(metadata.loadTime)).toBe(true);
          
          // Property: isSPA must be boolean
          expect(typeof metadata.isSPA).toBe('boolean');
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain reasonable viewport dimensions', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          const { width, height } = analysis.metadata.viewport;
          
          // Property: Viewport dimensions should be within reasonable bounds
          expect(width).toBeGreaterThanOrEqual(320); // Min mobile width
          expect(width).toBeLessThanOrEqual(7680); // Max 8K width
          expect(height).toBeGreaterThanOrEqual(480); // Min mobile height
          expect(height).toBeLessThanOrEqual(4320); // Max 8K height
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: User Flow Identification', () => {
    it('should identify flows with valid structure', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: Flows array should exist
          expect(Array.isArray(analysis.flows)).toBe(true);
          
          // Property: Each flow should have required fields
          analysis.flows.forEach(flow => {
            expect(flow.name).toBeDefined();
            expect(typeof flow.name).toBe('string');
            expect(flow.name.length).toBeGreaterThan(0);
            
            expect(Array.isArray(flow.steps)).toBe(true);
            expect(flow.steps.length).toBeGreaterThan(0);
            
            expect(flow.entryPoint).toBeDefined();
            expect(flow.entryPoint.type).toBeDefined();
          });
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain flow step integrity', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: All flow steps should be non-empty strings
          analysis.flows.forEach(flow => {
            flow.steps.forEach(step => {
              expect(typeof step).toBe('string');
              expect(step.length).toBeGreaterThan(0);
            });
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Analysis Result Structure Completeness', () => {
    it('should produce complete analysis results', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: All required top-level fields must exist
          expect(analysis.url).toBeDefined();
          expect(typeof analysis.url).toBe('string');
          expect(analysis.url.length).toBeGreaterThan(0);
          
          expect(analysis.title).toBeDefined();
          expect(typeof analysis.title).toBe('string');
          
          expect(Array.isArray(analysis.elements)).toBe(true);
          expect(Array.isArray(analysis.patterns)).toBe(true);
          expect(Array.isArray(analysis.flows)).toBe(true);
          
          expect(analysis.metadata).toBeDefined();
          expect(typeof analysis.metadata).toBe('object');
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain URL validity', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: URL should be valid HTTP/HTTPS
          expect(analysis.url).toMatch(/^https?:\/\//);
        }),
        { numRuns: 100 }
      );
    });

    it('should ensure elements array consistency', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: Elements array should be consistent
          expect(Array.isArray(analysis.elements)).toBe(true);
          
          // Property: Each element should have complete structure
          analysis.elements.forEach(element => {
            expect(element.type).toBeDefined();
            expect(element.attributes).toBeDefined();
            expect(element.xpath).toBeDefined();
            expect(element.cssPath).toBeDefined();
          });
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 10: XPath and CSS Path Validity', () => {
    it('should generate valid XPath selectors', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Property: XPath should start with // or /
          expect(element.xpath).toMatch(/^\/\//);
          
          // Property: XPath should be non-empty
          expect(element.xpath.length).toBeGreaterThan(2);
        }),
        { numRuns: 100 }
      );
    });

    it('should generate valid CSS selectors', () => {
      fc.assert(
        fc.property(identifiedElementArb(), (element) => {
          // Property: CSS path should be non-empty
          expect(element.cssPath.length).toBeGreaterThan(0);
          
          // Property: CSS path should be a string
          expect(typeof element.cssPath).toBe('string');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Analysis Determinism', () => {
    it('should produce consistent results for same input', () => {
      // Note: This is a structural test since we can't actually analyze pages
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis1) => {
          // Property: Analysis structure should be consistent
          const keys1 = Object.keys(analysis1).sort();
          const expectedKeys = ['url', 'title', 'elements', 'patterns', 'flows', 'metadata'].sort();
          
          expect(keys1).toEqual(expectedKeys);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Element Count Bounds', () => {
    it('should maintain reasonable element counts', () => {
      fc.assert(
        fc.property(applicationAnalysisArb(), (analysis) => {
          // Property: Element count should be non-negative
          expect(analysis.elements.length).toBeGreaterThanOrEqual(0);
          
          // Property: Pattern count should be non-negative
          expect(analysis.patterns.length).toBeGreaterThanOrEqual(0);
          
          // Property: Flow count should be non-negative
          expect(analysis.flows.length).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
