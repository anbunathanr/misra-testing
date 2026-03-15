/**
 * Selector Generator Service
 *
 * Creates robust CSS/XPath selectors for UI elements with priority-based selection.
 * Prioritizes selectors in order: data-testid > id > aria-label > name > class > xpath
 * Validates selector uniqueness and refines non-unique selectors.
 */
import { IdentifiedElement } from '../../types/ai-test-generation';
export declare class SelectorGenerator {
    private static instance;
    private constructor();
    static getInstance(): SelectorGenerator;
    /**
     * Generate a robust selector for an element using priority-based selection
     * Priority order: data-testid > id > aria-label > name > class > xpath
     */
    generateSelector(element: IdentifiedElement, allElements: IdentifiedElement[]): string;
    /**
     * Generate selector using a specific strategy
     */
    private generateSelectorByStrategy;
    /**
     * Validate that a selector uniquely identifies the target element
     */
    validateSelector(selector: string, expectedElement: IdentifiedElement, allElements: IdentifiedElement[]): boolean;
    /**
     * Check if a selector is position-based (should be avoided)
     */
    private isPositionBased;
    /**
     * Find all elements that match a given selector
     */
    private findMatchingElements;
    /**
     * Check if an element matches a CSS selector
     */
    private elementMatchesCSSSelector;
    /**
     * Check if two elements are the same
     */
    private elementsMatch;
    /**
     * Check if two attribute sets match
     */
    private attributesMatch;
    /**
     * Escape special characters in CSS selectors
     */
    private escapeSelector;
    /**
     * Check if an escaped ID selector matches an element
     */
    private matchesEscapedId;
    /**
     * Refine a non-unique selector to make it unique
     * This method attempts to combine multiple strategies to create a unique selector
     */
    refineSelector(element: IdentifiedElement, allElements: IdentifiedElement[]): string;
}
export declare const selectorGenerator: SelectorGenerator;
