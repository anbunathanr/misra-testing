/**
 * Unit tests for Selector Generator Service
 */

import { SelectorGenerator } from '../selector-generator';
import { IdentifiedElement } from '../../../types/ai-test-generation';

describe('SelectorGenerator', () => {
  let selectorGenerator: SelectorGenerator;

  beforeEach(() => {
    selectorGenerator = SelectorGenerator.getInstance();
  });

  describe('generateSelector', () => {
    it('should prioritize data-testid selector', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          'data-testid': 'submit-btn',
          id: 'submit',
          class: 'btn btn-primary',
        },
        xpath: '//button[1]',
        cssPath: 'button.btn',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      expect(selector).toBe('[data-testid="submit-btn"]');
    });

    it('should use id selector when data-testid is not available', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          id: 'submit',
          class: 'btn btn-primary',
        },
        xpath: '//button[1]',
        cssPath: 'button#submit',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      expect(selector).toBe('#submit');
    });

    it('should use aria-label selector when data-testid and id are not available', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          'aria-label': 'Submit form',
          class: 'btn',
        },
        xpath: '//button[1]',
        cssPath: 'button.btn',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      expect(selector).toBe('[aria-label="Submit form"]');
    });

    it('should use name selector when higher priority selectors are not available', () => {
      const element: IdentifiedElement = {
        type: 'input',
        attributes: {
          name: 'email',
          class: 'form-control',
        },
        xpath: '//input[1]',
        cssPath: 'input.form-control',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      expect(selector).toBe('[name="email"]');
    });

    it('should use class selector when higher priority selectors are not available', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'unique-button-class',
        },
        xpath: '//button[1]',
        cssPath: 'button.unique-button-class',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      expect(selector).toBe('.unique-button-class');
    });

    it('should use text content for buttons when other selectors are not unique', () => {
      const element1: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
          text: 'Submit',
        },
        xpath: '//button[1]',
        cssPath: 'button.btn',
      };

      const element2: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
          text: 'Cancel',
        },
        xpath: '//button[2]',
        cssPath: 'button.btn',
      };

      const allElements = [element1, element2];
      const selector = selectorGenerator.generateSelector(element1, allElements);

      expect(selector).toBe('//*[text()="Submit"]');
    });

    it('should fallback to xpath when no unique selector can be generated', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {},
        xpath: '//div/section/button',
        cssPath: 'div > section > button',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      expect(selector).toBe('//div/section/button');
    });

    it('should avoid position-based selectors', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
        },
        xpath: '//button[1]', // Position-based xpath
        cssPath: 'button:nth-child(1)', // Position-based css
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      // Should use class selector instead of position-based
      expect(selector).toBe('.btn');
    });
  });

  describe('validateSelector', () => {
    it('should return true for unique selector', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          id: 'unique-btn',
        },
        xpath: '//button[@id="unique-btn"]',
        cssPath: 'button#unique-btn',
      };

      const allElements = [element];
      const selector = '#unique-btn';

      const isValid = selectorGenerator.validateSelector(selector, element, allElements);

      expect(isValid).toBe(true);
    });

    it('should return false for non-unique selector', () => {
      const element1: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
        },
        xpath: '//button[1]',
        cssPath: 'button.btn',
      };

      const element2: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
        },
        xpath: '//button[2]',
        cssPath: 'button.btn',
      };

      const allElements = [element1, element2];
      const selector = '.btn';

      const isValid = selectorGenerator.validateSelector(selector, element1, allElements);

      expect(isValid).toBe(false);
    });

    it('should return false for empty selector', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          id: 'btn',
        },
        xpath: '//button',
        cssPath: 'button',
      };

      const allElements = [element];
      const selector = '';

      const isValid = selectorGenerator.validateSelector(selector, element, allElements);

      expect(isValid).toBe(false);
    });

    it('should return false for position-based selector with nth-child', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          id: 'btn',
        },
        xpath: '//button',
        cssPath: 'button',
      };

      const allElements = [element];
      const selector = 'button:nth-child(1)';

      const isValid = selectorGenerator.validateSelector(selector, element, allElements);

      expect(isValid).toBe(false);
    });

    it('should return false for position-based selector with nth-of-type', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          id: 'btn',
        },
        xpath: '//button',
        cssPath: 'button',
      };

      const allElements = [element];
      const selector = 'button:nth-of-type(2)';

      const isValid = selectorGenerator.validateSelector(selector, element, allElements);

      expect(isValid).toBe(false);
    });

    it('should return false for position-based XPath with numeric index', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          id: 'btn',
        },
        xpath: '//button',
        cssPath: 'button',
      };

      const allElements = [element];
      const selector = '//button[1]';

      const isValid = selectorGenerator.validateSelector(selector, element, allElements);

      expect(isValid).toBe(false);
    });
  });

  describe('refineSelector', () => {
    it('should refine non-unique class selector by combining with element type', () => {
      const element1: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
          name: 'submit',
        },
        xpath: '//button[1]',
        cssPath: 'button.btn',
      };

      const element2: IdentifiedElement = {
        type: 'input',
        attributes: {
          class: 'btn',
        },
        xpath: '//input[1]',
        cssPath: 'input.btn',
      };

      const allElements = [element1, element2];
      const selector = selectorGenerator.refineSelector(element1, allElements);

      // Should combine type with name attribute
      expect(selector).toBe('button[name="submit"]');
    });

    it('should refine by combining multiple classes', () => {
      const element1: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn primary',
        },
        xpath: '//button[1]',
        cssPath: 'button.btn.primary',
      };

      const element2: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn secondary',
        },
        xpath: '//button[2]',
        cssPath: 'button.btn.secondary',
      };

      const allElements = [element1, element2];
      const selector = selectorGenerator.refineSelector(element1, allElements);

      // Should use multiple classes
      expect(selector).toBe('.btn.primary');
    });

    it('should refine by combining type with multiple attributes', () => {
      const element1: IdentifiedElement = {
        type: 'input',
        attributes: {
          name: 'username',
          placeholder: 'Enter username',
        },
        xpath: '//input[1]',
        cssPath: 'input',
      };

      const element2: IdentifiedElement = {
        type: 'input',
        attributes: {
          name: 'email',
          placeholder: 'Enter email',
        },
        xpath: '//input[2]',
        cssPath: 'input',
      };

      const allElements = [element1, element2];
      const selector = selectorGenerator.refineSelector(element1, allElements);

      // Should use name attribute to distinguish
      expect(selector).toBe('input[name="username"]');
    });

    it('should fallback to xpath when refinement fails', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {},
        xpath: '//div/section/button',
        cssPath: 'div > section > button',
      };

      const allElements = [element];
      const selector = selectorGenerator.refineSelector(element, allElements);

      expect(selector).toBe('//div/section/button');
    });
  });

  describe('edge cases', () => {
    it('should handle elements with special characters in id', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          id: 'submit:btn.test',
        },
        xpath: '//button',
        cssPath: 'button',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      // Should escape special characters
      expect(selector).toContain('submit');
    });

    it('should handle elements with no attributes', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {},
        xpath: '//button',
        cssPath: 'button',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      // Should fallback to xpath
      expect(selector).toBe('//button');
    });

    it('should handle elements with whitespace in class names', () => {
      const element: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: '  btn   primary  ',
        },
        xpath: '//button',
        cssPath: 'button',
      };

      const allElements = [element];
      const selector = selectorGenerator.generateSelector(element, allElements);

      // Should handle whitespace correctly
      expect(selector).toBe('.btn');
    });

    it('should handle multiple elements with same attributes', () => {
      const element1: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
          text: 'Click me',
        },
        xpath: '//button[1]',
        cssPath: 'button.btn',
      };

      const element2: IdentifiedElement = {
        type: 'button',
        attributes: {
          class: 'btn',
          text: 'Click me',
        },
        xpath: '//button[2]',
        cssPath: 'button.btn',
      };

      const allElements = [element1, element2];
      const selector = selectorGenerator.generateSelector(element1, allElements);

      // Should fallback to xpath when no unique selector can be found
      expect(selector).toBe('//button[1]');
    });
  });
});
