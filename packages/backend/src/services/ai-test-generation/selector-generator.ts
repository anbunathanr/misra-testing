/**
 * Selector Generator Service
 * 
 * Creates robust CSS/XPath selectors for UI elements with priority-based selection.
 * Prioritizes selectors in order: data-testid > id > aria-label > name > class > xpath
 * Validates selector uniqueness and refines non-unique selectors.
 */

import {
  IdentifiedElement,
  SelectorStrategy,
} from '../../types/ai-test-generation';

export class SelectorGenerator {
  private static instance: SelectorGenerator;

  private constructor() {}

  public static getInstance(): SelectorGenerator {
    if (!SelectorGenerator.instance) {
      SelectorGenerator.instance = new SelectorGenerator();
    }
    return SelectorGenerator.instance;
  }

  /**
   * Generate a robust selector for an element using priority-based selection
   * Priority order: data-testid > id > aria-label > name > class > xpath
   */
  generateSelector(
    element: IdentifiedElement,
    allElements: IdentifiedElement[]
  ): string {
    // Try each strategy in priority order
    const strategies: SelectorStrategy[] = [
      'data-testid',
      'id',
      'aria-label',
      'name',
      'class',
      'text-content',
      'xpath',
    ];

    for (const strategy of strategies) {
      const selector = this.generateSelectorByStrategy(element, strategy);
      
      if (selector && this.validateSelector(selector, element, allElements)) {
        console.log(`[Selector Generator] Generated ${strategy} selector: ${selector}`);
        return selector;
      }
    }

    // Fallback to xpath if all else fails
    console.warn('[Selector Generator] Using fallback xpath selector');
    return element.xpath;
  }

  /**
   * Generate selector using a specific strategy
   */
  private generateSelectorByStrategy(
    element: IdentifiedElement,
    strategy: SelectorStrategy
  ): string | null {
    const { attributes } = element;

    switch (strategy) {
      case 'data-testid':
        return attributes['data-testid']
          ? `[data-testid="${attributes['data-testid']}"]`
          : null;

      case 'id':
        return attributes.id ? `#${this.escapeSelector(attributes.id)}` : null;

      case 'aria-label':
        return attributes['aria-label']
          ? `[aria-label="${attributes['aria-label']}"]`
          : null;

      case 'name':
        return attributes.name ? `[name="${attributes.name}"]` : null;

      case 'class':
        if (!attributes.class) return null;
        
        // Split classes and use the first one (most specific)
        const classes = attributes.class.trim().split(/\s+/);
        if (classes.length === 0) return null;
        
        // Try single class first
        const singleClass = `.${this.escapeSelector(classes[0])}`;
        return singleClass;

      case 'text-content':
        if (!attributes.text) return null;
        
        // Use text content for buttons and links
        if (element.type === 'button' || element.type === 'link') {
          const escapedText = attributes.text.replace(/"/g, '\\"');
          return `//*[text()="${escapedText}"]`;
        }
        return null;

      case 'xpath':
        return element.xpath;

      default:
        return null;
    }
  }

  /**
   * Validate that a selector uniquely identifies the target element
   */
  validateSelector(
    selector: string,
    expectedElement: IdentifiedElement,
    allElements: IdentifiedElement[]
  ): boolean {
    // Check if selector is non-empty
    if (!selector || selector.trim() === '') {
      return false;
    }

    // Check if selector contains position-based patterns
    if (this.isPositionBased(selector)) {
      console.warn(`[Selector Generator] Rejecting position-based selector: ${selector}`);
      return false;
    }

    // Count how many elements match this selector
    const matchingElements = this.findMatchingElements(selector, allElements);

    // Selector must match exactly one element
    if (matchingElements.length !== 1) {
      console.warn(
        `[Selector Generator] Selector "${selector}" matches ${matchingElements.length} elements (expected 1)`
      );
      return false;
    }

    // Verify the matched element is the expected one
    const matchedElement = matchingElements[0];
    return this.elementsMatch(matchedElement, expectedElement);
  }

  /**
   * Check if a selector is position-based (should be avoided)
   */
  private isPositionBased(selector: string): boolean {
    const positionPatterns = [
      /nth-child\(/i,
      /nth-of-type\(/i,
      /first-child/i,
      /last-child/i,
      /\[\d+\]/, // XPath numeric index like [1], [2]
    ];

    return positionPatterns.some((pattern) => pattern.test(selector));
  }

  /**
   * Find all elements that match a given selector
   */
  private findMatchingElements(
    selector: string,
    allElements: IdentifiedElement[]
  ): IdentifiedElement[] {
    const isXPath = selector.startsWith('//') || selector.startsWith('/');

    return allElements.filter((element) => {
      if (isXPath) {
        // For XPath, check if the element's xpath matches or if it's a text-based xpath
        if (selector.includes('[text()=')) {
          // Extract text from xpath like //*[text()="Submit"]
          const textMatch = selector.match(/\[text\(\)="([^"]+)"\]/);
          if (textMatch) {
            const expectedText = textMatch[1];
            return element.attributes.text === expectedText;
          }
        }
        return element.xpath === selector;
      } else {
        // For CSS selectors, check if any attribute matches
        return this.elementMatchesCSSSelector(element, selector);
      }
    });
  }

  /**
   * Check if an element matches a CSS selector
   */
  private elementMatchesCSSSelector(
    element: IdentifiedElement,
    selector: string
  ): boolean {
    const { attributes } = element;

    // Handle complex selectors with multiple parts
    // e.g., "button.btn", "button[name="submit"]", ".btn.primary"
    
    // Check for element type + class (e.g., "button.btn")
    const typeClassMatch = selector.match(/^([a-z]+)\.([a-z0-9_-]+)/i);
    if (typeClassMatch) {
      const [, type, className] = typeClassMatch;
      return (
        element.type === type &&
        (attributes.class?.split(/\s+/).includes(className) || false)
      );
    }

    // Check for multiple classes (e.g., ".btn.primary")
    if (selector.startsWith('.') && selector.includes('.', 1)) {
      const classes = selector.split('.').filter(c => c);
      const elementClasses = attributes.class?.split(/\s+/) || [];
      return classes.every(c => elementClasses.includes(c));
    }

    // Check for element type + attribute (e.g., "button[name="submit"]")
    const typeAttrMatch = selector.match(/^([a-z]+)\[([^=\]]+)="([^"]+)"\]/i);
    if (typeAttrMatch) {
      const [, type, attrName, attrValue] = typeAttrMatch;
      return (
        element.type === type &&
        attributes[attrName as keyof typeof attributes] === attrValue
      );
    }

    // Check for element type + multiple attributes (e.g., "input[name="email"][placeholder="Enter email"]")
    if (selector.includes('[') && selector.includes(']')) {
      const typeMatch = selector.match(/^([a-z]+)/i);
      const type = typeMatch ? typeMatch[1] : null;
      
      if (type && element.type !== type) {
        return false;
      }

      // Extract all attribute selectors
      const attrMatches = selector.matchAll(/\[([^=\]]+)="([^"]+)"\]/g);
      for (const match of attrMatches) {
        const [, attrName, attrValue] = match;
        if (attributes[attrName as keyof typeof attributes] !== attrValue) {
          return false;
        }
      }
      return true;
    }

    // ID selector (#id)
    if (selector.startsWith('#')) {
      const id = selector.substring(1).replace(/\\(.)/g, '$1'); // Unescape
      return attributes.id === id;
    }

    // Class selector (.class)
    if (selector.startsWith('.')) {
      const className = selector.substring(1);
      return attributes.class?.split(/\s+/).includes(className) || false;
    }

    // Simple attribute selector
    const attrMatch = selector.match(/^\[([^=\]]+)="([^"]+)"\]$/);
    if (attrMatch) {
      const [, attrName, attrValue] = attrMatch;
      return attributes[attrName as keyof typeof attributes] === attrValue;
    }

    // Element type selector (button, input, etc.)
    if (/^[a-z]+$/i.test(selector)) {
      return element.type === selector;
    }

    return false;
  }

  /**
   * Check if two elements are the same
   */
  private elementsMatch(
    element1: IdentifiedElement,
    element2: IdentifiedElement
  ): boolean {
    // Compare by xpath as unique identifier
    if (element1.xpath && element2.xpath) {
      return element1.xpath === element2.xpath;
    }

    // Fallback: compare by attributes
    return (
      element1.type === element2.type &&
      this.attributesMatch(element1.attributes, element2.attributes)
    );
  }

  /**
   * Check if two attribute sets match
   */
  private attributesMatch(
    attrs1: IdentifiedElement['attributes'],
    attrs2: IdentifiedElement['attributes']
  ): boolean {
    // Compare key attributes
    const keyAttrs: (keyof IdentifiedElement['attributes'])[] = [
      'id',
      'name',
      'data-testid',
      'aria-label',
    ];

    for (const attr of keyAttrs) {
      if (attrs1[attr] && attrs2[attr] && attrs1[attr] === attrs2[attr]) {
        return true;
      }
    }

    // If no key attributes match, compare text content
    if (attrs1.text && attrs2.text && attrs1.text === attrs2.text) {
      return true;
    }

    return false;
  }

  /**
   * Escape special characters in CSS selectors
   */
  private escapeSelector(value: string): string {
    // Escape special CSS characters
    // For IDs with special chars, we need to escape them properly
    return value.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
  }

  /**
   * Check if an escaped ID selector matches an element
   */
  private matchesEscapedId(element: IdentifiedElement, escapedId: string): boolean {
    // Unescape the ID for comparison
    const unescapedId = escapedId.replace(/\\(.)/g, '$1');
    return element.attributes.id === unescapedId;
  }

  /**
   * Refine a non-unique selector to make it unique
   * This method attempts to combine multiple strategies to create a unique selector
   */
  refineSelector(
    element: IdentifiedElement,
    allElements: IdentifiedElement[]
  ): string {
    const { attributes } = element;

    // Try combining element type with attributes
    const refinementStrategies = [
      // Type + data-testid
      () =>
        attributes['data-testid']
          ? `${element.type}[data-testid="${attributes['data-testid']}"]`
          : null,
      
      // Type + id
      () =>
        attributes.id
          ? `${element.type}#${this.escapeSelector(attributes.id)}`
          : null,
      
      // Type + name
      () =>
        attributes.name
          ? `${element.type}[name="${attributes.name}"]`
          : null,
      
      // Type + aria-label
      () =>
        attributes['aria-label']
          ? `${element.type}[aria-label="${attributes['aria-label']}"]`
          : null,
      
      // Type + class
      () => {
        if (!attributes.class) return null;
        const classes = attributes.class.trim().split(/\s+/);
        return classes.length > 0
          ? `${element.type}.${this.escapeSelector(classes[0])}`
          : null;
      },
      
      // Multiple classes
      () => {
        if (!attributes.class) return null;
        const classes = attributes.class.trim().split(/\s+/);
        return classes.length > 1
          ? `.${classes.map((c) => this.escapeSelector(c)).join('.')}`
          : null;
      },
      
      // Type + multiple attributes
      () => {
        const parts: string[] = [element.type];
        if (attributes.name) parts.push(`[name="${attributes.name}"]`);
        if (attributes.placeholder) parts.push(`[placeholder="${attributes.placeholder}"]`);
        return parts.length > 1 ? parts.join('') : null;
      },
    ];

    // Try each refinement strategy
    for (const strategy of refinementStrategies) {
      const selector = strategy();
      if (selector && this.validateSelector(selector, element, allElements)) {
        console.log(`[Selector Generator] Refined selector: ${selector}`);
        return selector;
      }
    }

    // If all refinement strategies fail, use xpath as last resort
    console.warn('[Selector Generator] Refinement failed, using xpath');
    return element.xpath;
  }
}

// Export singleton instance
export const selectorGenerator = SelectorGenerator.getInstance();
