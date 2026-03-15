"use strict";
/**
 * Selector Generator Service
 *
 * Creates robust CSS/XPath selectors for UI elements with priority-based selection.
 * Prioritizes selectors in order: data-testid > id > aria-label > name > class > xpath
 * Validates selector uniqueness and refines non-unique selectors.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectorGenerator = exports.SelectorGenerator = void 0;
class SelectorGenerator {
    static instance;
    constructor() { }
    static getInstance() {
        if (!SelectorGenerator.instance) {
            SelectorGenerator.instance = new SelectorGenerator();
        }
        return SelectorGenerator.instance;
    }
    /**
     * Generate a robust selector for an element using priority-based selection
     * Priority order: data-testid > id > aria-label > name > class > xpath
     */
    generateSelector(element, allElements) {
        // Try each strategy in priority order
        const strategies = [
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
    generateSelectorByStrategy(element, strategy) {
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
                if (!attributes.class)
                    return null;
                // Split classes and use the first one (most specific)
                const classes = attributes.class.trim().split(/\s+/);
                if (classes.length === 0)
                    return null;
                // Try single class first
                const singleClass = `.${this.escapeSelector(classes[0])}`;
                return singleClass;
            case 'text-content':
                if (!attributes.text)
                    return null;
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
    validateSelector(selector, expectedElement, allElements) {
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
            console.warn(`[Selector Generator] Selector "${selector}" matches ${matchingElements.length} elements (expected 1)`);
            return false;
        }
        // Verify the matched element is the expected one
        const matchedElement = matchingElements[0];
        return this.elementsMatch(matchedElement, expectedElement);
    }
    /**
     * Check if a selector is position-based (should be avoided)
     */
    isPositionBased(selector) {
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
    findMatchingElements(selector, allElements) {
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
            }
            else {
                // For CSS selectors, check if any attribute matches
                return this.elementMatchesCSSSelector(element, selector);
            }
        });
    }
    /**
     * Check if an element matches a CSS selector
     */
    elementMatchesCSSSelector(element, selector) {
        const { attributes } = element;
        // Handle complex selectors with multiple parts
        // e.g., "button.btn", "button[name="submit"]", ".btn.primary"
        // Check for element type + class (e.g., "button.btn")
        const typeClassMatch = selector.match(/^([a-z]+)\.([a-z0-9_-]+)/i);
        if (typeClassMatch) {
            const [, type, className] = typeClassMatch;
            return (element.type === type &&
                (attributes.class?.split(/\s+/).includes(className) || false));
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
            return (element.type === type &&
                attributes[attrName] === attrValue);
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
                if (attributes[attrName] !== attrValue) {
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
            return attributes[attrName] === attrValue;
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
    elementsMatch(element1, element2) {
        // Compare by xpath as unique identifier
        if (element1.xpath && element2.xpath) {
            return element1.xpath === element2.xpath;
        }
        // Fallback: compare by attributes
        return (element1.type === element2.type &&
            this.attributesMatch(element1.attributes, element2.attributes));
    }
    /**
     * Check if two attribute sets match
     */
    attributesMatch(attrs1, attrs2) {
        // Compare key attributes
        const keyAttrs = [
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
    escapeSelector(value) {
        // Escape special CSS characters
        // For IDs with special chars, we need to escape them properly
        return value.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    }
    /**
     * Check if an escaped ID selector matches an element
     */
    matchesEscapedId(element, escapedId) {
        // Unescape the ID for comparison
        const unescapedId = escapedId.replace(/\\(.)/g, '$1');
        return element.attributes.id === unescapedId;
    }
    /**
     * Refine a non-unique selector to make it unique
     * This method attempts to combine multiple strategies to create a unique selector
     */
    refineSelector(element, allElements) {
        const { attributes } = element;
        // Try combining element type with attributes
        const refinementStrategies = [
            // Type + data-testid
            () => attributes['data-testid']
                ? `${element.type}[data-testid="${attributes['data-testid']}"]`
                : null,
            // Type + id
            () => attributes.id
                ? `${element.type}#${this.escapeSelector(attributes.id)}`
                : null,
            // Type + name
            () => attributes.name
                ? `${element.type}[name="${attributes.name}"]`
                : null,
            // Type + aria-label
            () => attributes['aria-label']
                ? `${element.type}[aria-label="${attributes['aria-label']}"]`
                : null,
            // Type + class
            () => {
                if (!attributes.class)
                    return null;
                const classes = attributes.class.trim().split(/\s+/);
                return classes.length > 0
                    ? `${element.type}.${this.escapeSelector(classes[0])}`
                    : null;
            },
            // Multiple classes
            () => {
                if (!attributes.class)
                    return null;
                const classes = attributes.class.trim().split(/\s+/);
                return classes.length > 1
                    ? `.${classes.map((c) => this.escapeSelector(c)).join('.')}`
                    : null;
            },
            // Type + multiple attributes
            () => {
                const parts = [element.type];
                if (attributes.name)
                    parts.push(`[name="${attributes.name}"]`);
                if (attributes.placeholder)
                    parts.push(`[placeholder="${attributes.placeholder}"]`);
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
exports.SelectorGenerator = SelectorGenerator;
// Export singleton instance
exports.selectorGenerator = SelectorGenerator.getInstance();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0b3ItZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VsZWN0b3ItZ2VuZXJhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQU9ILE1BQWEsaUJBQWlCO0lBQ3BCLE1BQU0sQ0FBQyxRQUFRLENBQW9CO0lBRTNDLGdCQUF1QixDQUFDO0lBRWpCLE1BQU0sQ0FBQyxXQUFXO1FBQ3ZCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNoQyxpQkFBaUIsQ0FBQyxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZELENBQUM7UUFDRCxPQUFPLGlCQUFpQixDQUFDLFFBQVEsQ0FBQztJQUNwQyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsZ0JBQWdCLENBQ2QsT0FBMEIsRUFDMUIsV0FBZ0M7UUFFaEMsc0NBQXNDO1FBQ3RDLE1BQU0sVUFBVSxHQUF1QjtZQUNyQyxhQUFhO1lBQ2IsSUFBSTtZQUNKLFlBQVk7WUFDWixNQUFNO1lBQ04sT0FBTztZQUNQLGNBQWM7WUFDZCxPQUFPO1NBQ1IsQ0FBQztRQUVGLEtBQUssTUFBTSxRQUFRLElBQUksVUFBVSxFQUFFLENBQUM7WUFDbEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVwRSxJQUFJLFFBQVEsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDO2dCQUN0RSxPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxRQUFRLGNBQWMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDaEYsT0FBTyxRQUFRLENBQUM7WUFDbEIsQ0FBQztRQUNILENBQUM7UUFFRCxzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLElBQUksQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO1FBQ25FLE9BQU8sT0FBTyxD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Q0FBQyxVQUFVLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDO2dCQUMvRCxJQUFJLFVBQVUsQ0FBQyxXQUFXO29CQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLFVBQVUsQ0FBQyxXQUFXLElBQUksQ0FBQyxDQUFDO2dCQUNwRixPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDbEQsQ0FBQztTQUNGLENBQUM7UUFFRiwrQkFBK0I7UUFDL0IsS0FBSyxNQUFNLFFBQVEsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO1lBQzVDLE1BQU0sUUFBUSxHQUFHLFFBQVEsRUFBRSxDQUFDO1lBQzVCLElBQUksUUFBUSxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMENBQTBDLFFBQVEsRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLE9BQU8sUUFBUSxDQUFDO1lBQ2xCLENBQUM7UUFDSCxDQUFDO1FBRUQsOERBQThEO1FBQzlELE9BQU8sQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztRQUNwRSxPQUFPLE9BQU8sQ0FBQyxLQUFLLENBQUM7SUFDdkIsQ0FBQztDQUNGO0FBdFpELDhDQXNaQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsV0FBVyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU2VsZWN0b3IgR2VuZXJhdG9yIFNlcnZpY2VcclxuICogXHJcbiAqIENyZWF0ZXMgcm9idXN0IENTUy9YUGF0aCBzZWxlY3RvcnMgZm9yIFVJIGVsZW1lbnRzIHdpdGggcHJpb3JpdHktYmFzZWQgc2VsZWN0aW9uLlxyXG4gKiBQcmlvcml0aXplcyBzZWxlY3RvcnMgaW4gb3JkZXI6IGRhdGEtdGVzdGlkID4gaWQgPiBhcmlhLWxhYmVsID4gbmFtZSA+IGNsYXNzID4geHBhdGhcclxuICogVmFsaWRhdGVzIHNlbGVjdG9yIHVuaXF1ZW5lc3MgYW5kIHJlZmluZXMgbm9uLXVuaXF1ZSBzZWxlY3RvcnMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHtcclxuICBJZGVudGlmaWVkRWxlbWVudCxcclxuICBTZWxlY3RvclN0cmF0ZWd5LFxyXG59IGZyb20gJy4uLy4uL3R5cGVzL2FpLXRlc3QtZ2VuZXJhdGlvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgU2VsZWN0b3JHZW5lcmF0b3Ige1xyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBTZWxlY3RvckdlbmVyYXRvcjtcclxuXHJcbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHt9XHJcblxyXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogU2VsZWN0b3JHZW5lcmF0b3Ige1xyXG4gICAgaWYgKCFTZWxlY3RvckdlbmVyYXRvci5pbnN0YW5jZSkge1xyXG4gICAgICBTZWxlY3RvckdlbmVyYXRvci5pbnN0YW5jZSA9IG5ldyBTZWxlY3RvckdlbmVyYXRvcigpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFNlbGVjdG9yR2VuZXJhdG9yLmluc3RhbmNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYSByb2J1c3Qgc2VsZWN0b3IgZm9yIGFuIGVsZW1lbnQgdXNpbmcgcHJpb3JpdHktYmFzZWQgc2VsZWN0aW9uXHJcbiAgICogUHJpb3JpdHkgb3JkZXI6IGRhdGEtdGVzdGlkID4gaWQgPiBhcmlhLWxhYmVsID4gbmFtZSA+IGNsYXNzID4geHBhdGhcclxuICAgKi9cclxuICBnZW5lcmF0ZVNlbGVjdG9yKFxyXG4gICAgZWxlbWVudDogSWRlbnRpZmllZEVsZW1lbnQsXHJcbiAgICBhbGxFbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXVxyXG4gICk6IHN0cmluZyB7XHJcbiAgICAvLyBUcnkgZWFjaCBzdHJhdGVneSBpbiBwcmlvcml0eSBvcmRlclxyXG4gICAgY29uc3Qgc3RyYXRlZ2llczogU2VsZWN0b3JTdHJhdGVneVtdID0gW1xyXG4gICAgICAnZGF0YS10ZXN0aWQnLFxyXG4gICAgICAnaWQnLFxyXG4gICAgICAnYXJpYS1sYWJlbCcsXHJcbiAgICAgICduYW1lJyxcclxuICAgICAgJ2NsYXNzJyxcclxuICAgICAgJ3RleHQtY29udGVudCcsXHJcbiAgICAgICd4cGF0aCcsXHJcbiAgICBdO1xyXG5cclxuICAgIGZvciAoY29uc3Qgc3RyYXRlZ3kgb2Ygc3RyYXRlZ2llcykge1xyXG4gICAgICBjb25zdCBzZWxlY3RvciA9IHRoaXMuZ2VuZXJhdGVTZWxlY3RvckJ5U3RyYXRlZ3koZWxlbWVudCwgc3RyYXRlZ3kpO1xyXG4gICAgICBcclxuICAgICAgaWYgKHNlbGVjdG9yICYmIHRoaXMudmFsaWRhdGVTZWxlY3RvcihzZWxlY3RvciwgZWxlbWVudCwgYWxsRWxlbWVudHMpKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFtTZWxlY3RvciBHZW5lcmF0b3JdIEdlbmVyYXRlZCAke3N0cmF0ZWd5fSBzZWxlY3RvcjogJHtzZWxlY3Rvcn1gKTtcclxuICAgICAgICByZXR1cm4gc2VsZWN0b3I7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBGYWxsYmFjayB0byB4cGF0aCBpZiBhbGwgZWxzZSBmYWlsc1xyXG4gICAgY29uc29sZS53YXJuKCdbU2VsZWN0b3IgR2VuZXJhdG9yXSBVc2luZyBmYWxsYmFjayB4cGF0aCBzZWxlY3RvcicpO1xyXG4gICAgcmV0dXJuIGVsZW1lbnQueHBhdGg7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBzZWxlY3RvciB1c2luZyBhIHNwZWNpZmljIHN0cmF0ZWd5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZVNlbGVjdG9yQnlTdHJhdGVneShcclxuICAgIGVsZW1lbnQ6IElkZW50aWZpZWRFbGVtZW50LFxyXG4gICAgc3RyYXRlZ3k6IFNlbGVjdG9yU3RyYXRlZ3lcclxuICApOiBzdHJpbmcgfCBudWxsIHtcclxuICAgIGNvbnN0IHsgYXR0cmlidXRlcyB9ID0gZWxlbWVudDtcclxuXHJcbiAgICBzd2l0Y2ggKHN0cmF0ZWd5KSB7XHJcbiAgICAgIGNhc2UgJ2RhdGEtdGVzdGlkJzpcclxuICAgICAgICByZXR1cm4gYXR0cmlidXRlc1snZGF0YS10ZXN0aWQnXVxyXG4gICAgICAgICAgPyBgW2RhdGEtdGVzdGlkPVwiJHthdHRyaWJ1dGVzWydkYXRhLXRlc3RpZCddfVwiXWBcclxuICAgICAgICAgIDogbnVsbDtcclxuXHJcbiAgICAgIGNhc2UgJ2lkJzpcclxuICAgICAgICByZXR1cm4gYXR0cmlidXRlcy5pZCA/IGAjJHt0aGlzLmVzY2FwZVNlbGVjdG9yKGF0dHJpYnV0ZXMuaWQpfWAgOiBudWxsO1xyXG5cclxuICAgICAgY2FzZSAnYXJpYS1sYWJlbCc6XHJcbiAgICAgICAgcmV0dXJuIGF0dHJpYnV0ZXNbJ2FyaWEtbGFiZWwnXVxyXG4gICAgICAgICAgPyBgW2FyaWEtbGFiZWw9XCIke2F0dHJpYnV0ZXNbJ2FyaWEtbGFiZWwnXX1cIl1gXHJcbiAgICAgICAgICA6IG51bGw7XHJcblxyXG4gICAgICBjYXNlICduYW1lJzpcclxuICAgICAgICByZXR1cm4gYXR0cmlidXRlcy5uYW1lID8gYFtuYW1lPVwiJHthdHRyaWJ1dGVzLm5hbWV9XCJdYCA6IG51bGw7XHJcblxyXG4gICAgICBjYXNlICdjbGFzcyc6XHJcbiAgICAgICAgaWYgKCFhdHRyaWJ1dGVzLmNsYXNzKSByZXR1cm4gbnVsbDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBTcGxpdCBjbGFzc2VzIGFuZCB1c2UgdGhlIGZpcnN0IG9uZSAobW9zdCBzcGVjaWZpYylcclxuICAgICAgICBjb25zdCBjbGFzc2VzID0gYXR0cmlidXRlcy5jbGFzcy50cmltKCkuc3BsaXQoL1xccysvKTtcclxuICAgICAgICBpZiAoY2xhc3Nlcy5sZW5ndGggPT09IDApIHJldHVybiBudWxsO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFRyeSBzaW5nbGUgY2xhc3MgZmlyc3RcclxuICAgICAgICBjb25zdCBzaW5nbGVDbGFzcyA9IGAuJHt0aGlzLmVzY2FwZVNlbGVjdG9yKGNsYXNzZXNbMF0pfWA7XHJcbiAgICAgICAgcmV0dXJuIHNpbmdsZUNsYXNzO1xyXG5cclxuICAgICAgY2FzZSAndGV4dC1jb250ZW50JzpcclxuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMudGV4dCkgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVXNlIHRleHQgY29udGVudCBmb3IgYnV0dG9ucyBhbmQgbGlua3NcclxuICAgICAgICBpZiAoZWxlbWVudC50eXBlID09PSAnYnV0dG9uJyB8fCBlbGVtZW50LnR5cGUgPT09ICdsaW5rJykge1xyXG4gICAgICAgICAgY29uc3QgZXNjYXBlZFRleHQgPSBhdHRyaWJ1dGVzLnRleHQucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpO1xyXG4gICAgICAgICAgcmV0dXJuIGAvLypbdGV4dCgpPVwiJHtlc2NhcGVkVGV4dH1cIl1gO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgIGNhc2UgJ3hwYXRoJzpcclxuICAgICAgICByZXR1cm4gZWxlbWVudC54cGF0aDtcclxuXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSB0aGF0IGEgc2VsZWN0b3IgdW5pcXVlbHkgaWRlbnRpZmllcyB0aGUgdGFyZ2V0IGVsZW1lbnRcclxuICAgKi9cclxuICB2YWxpZGF0ZVNlbGVjdG9yKFxyXG4gICAgc2VsZWN0b3I6IHN0cmluZyxcclxuICAgIGV4cGVjdGVkRWxlbWVudDogSWRlbnRpZmllZEVsZW1lbnQsXHJcbiAgICBhbGxFbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXVxyXG4gICk6IGJvb2xlYW4ge1xyXG4gICAgLy8gQ2hlY2sgaWYgc2VsZWN0b3IgaXMgbm9uLWVtcHR5XHJcbiAgICBpZiAoIXNlbGVjdG9yIHx8IHNlbGVjdG9yLnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGlmIHNlbGVjdG9yIGNvbnRhaW5zIHBvc2l0aW9uLWJhc2VkIHBhdHRlcm5zXHJcbiAgICBpZiAodGhpcy5pc1Bvc2l0aW9uQmFzZWQoc2VsZWN0b3IpKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgW1NlbGVjdG9yIEdlbmVyYXRvcl0gUmVqZWN0aW5nIHBvc2l0aW9uLWJhc2VkIHNlbGVjdG9yOiAke3NlbGVjdG9yfWApO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ291bnQgaG93IG1hbnkgZWxlbWVudHMgbWF0Y2ggdGhpcyBzZWxlY3RvclxyXG4gICAgY29uc3QgbWF0Y2hpbmdFbGVtZW50cyA9IHRoaXMuZmluZE1hdGNoaW5nRWxlbWVudHMoc2VsZWN0b3IsIGFsbEVsZW1lbnRzKTtcclxuXHJcbiAgICAvLyBTZWxlY3RvciBtdXN0IG1hdGNoIGV4YWN0bHkgb25lIGVsZW1lbnRcclxuICAgIGlmIChtYXRjaGluZ0VsZW1lbnRzLmxlbmd0aCAhPT0gMSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oXHJcbiAgICAgICAgYFtTZWxlY3RvciBHZW5lcmF0b3JdIFNlbGVjdG9yIFwiJHtzZWxlY3Rvcn1cIiBtYXRjaGVzICR7bWF0Y2hpbmdFbGVtZW50cy5sZW5ndGh9IGVsZW1lbnRzIChleHBlY3RlZCAxKWBcclxuICAgICAgKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZlcmlmeSB0aGUgbWF0Y2hlZCBlbGVtZW50IGlzIHRoZSBleHBlY3RlZCBvbmVcclxuICAgIGNvbnN0IG1hdGNoZWRFbGVtZW50ID0gbWF0Y2hpbmdFbGVtZW50c1swXTtcclxuICAgIHJldHVybiB0aGlzLmVsZW1lbnRzTWF0Y2gobWF0Y2hlZEVsZW1lbnQsIGV4cGVjdGVkRWxlbWVudCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBhIHNlbGVjdG9yIGlzIHBvc2l0aW9uLWJhc2VkIChzaG91bGQgYmUgYXZvaWRlZClcclxuICAgKi9cclxuICBwcml2YXRlIGlzUG9zaXRpb25CYXNlZChzZWxlY3Rvcjogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBwb3NpdGlvblBhdHRlcm5zID0gW1xyXG4gICAgICAvbnRoLWNoaWxkXFwoL2ksXHJcbiAgICAgIC9udGgtb2YtdHlwZVxcKC9pLFxyXG4gICAgICAvZmlyc3QtY2hpbGQvaSxcclxuICAgICAgL2xhc3QtY2hpbGQvaSxcclxuICAgICAgL1xcW1xcZCtcXF0vLCAvLyBYUGF0aCBudW1lcmljIGluZGV4IGxpa2UgWzFdLCBbMl1cclxuICAgIF07XHJcblxyXG4gICAgcmV0dXJuIHBvc2l0aW9uUGF0dGVybnMuc29tZSgocGF0dGVybikgPT4gcGF0dGVybi50ZXN0KHNlbGVjdG9yKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGaW5kIGFsbCBlbGVtZW50cyB0aGF0IG1hdGNoIGEgZ2l2ZW4gc2VsZWN0b3JcclxuICAgKi9cclxuICBwcml2YXRlIGZpbmRNYXRjaGluZ0VsZW1lbnRzKFxyXG4gICAgc2VsZWN0b3I6IHN0cmluZyxcclxuICAgIGFsbEVsZW1lbnRzOiBJZGVudGlmaWVkRWxlbWVudFtdXHJcbiAgKTogSWRlbnRpZmllZEVsZW1lbnRbXSB7XHJcbiAgICBjb25zdCBpc1hQYXRoID0gc2VsZWN0b3Iuc3RhcnRzV2l0aCgnLy8nKSB8fCBzZWxlY3Rvci5zdGFydHNXaXRoKCcvJyk7XHJcblxyXG4gICAgcmV0dXJuIGFsbEVsZW1lbnRzLmZpbHRlcigoZWxlbWVudCkgPT4ge1xyXG4gICAgICBpZiAoaXNYUGF0aCkge1xyXG4gICAgICAgIC8vIEZvciBYUGF0aCwgY2hlY2sgaWYgdGhlIGVsZW1lbnQncyB4cGF0aCBtYXRjaGVzIG9yIGlmIGl0J3MgYSB0ZXh0LWJhc2VkIHhwYXRoXHJcbiAgICAgICAgaWYgKHNlbGVjdG9yLmluY2x1ZGVzKCdbdGV4dCgpPScpKSB7XHJcbiAgICAgICAgICAvLyBFeHRyYWN0IHRleHQgZnJvbSB4cGF0aCBsaWtlIC8vKlt0ZXh0KCk9XCJTdWJtaXRcIl1cclxuICAgICAgICAgIGNvbnN0IHRleHRNYXRjaCA9IHNlbGVjdG9yLm1hdGNoKC9cXFt0ZXh0XFwoXFwpPVwiKFteXCJdKylcIlxcXS8pO1xyXG4gICAgICAgICAgaWYgKHRleHRNYXRjaCkge1xyXG4gICAgICAgICAgICBjb25zdCBleHBlY3RlZFRleHQgPSB0ZXh0TWF0Y2hbMV07XHJcbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50LmF0dHJpYnV0ZXMudGV4dCA9PT0gZXhwZWN0ZWRUZXh0O1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZWxlbWVudC54cGF0aCA9PT0gc2VsZWN0b3I7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgLy8gRm9yIENTUyBzZWxlY3RvcnMsIGNoZWNrIGlmIGFueSBhdHRyaWJ1dGUgbWF0Y2hlc1xyXG4gICAgICAgIHJldHVybiB0aGlzLmVsZW1lbnRNYXRjaGVzQ1NTU2VsZWN0b3IoZWxlbWVudCwgc2VsZWN0b3IpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGFuIGVsZW1lbnQgbWF0Y2hlcyBhIENTUyBzZWxlY3RvclxyXG4gICAqL1xyXG4gIHByaXZhdGUgZWxlbWVudE1hdGNoZXNDU1NTZWxlY3RvcihcclxuICAgIGVsZW1lbnQ6IElkZW50aWZpZWRFbGVtZW50LFxyXG4gICAgc2VsZWN0b3I6IHN0cmluZ1xyXG4gICk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgeyBhdHRyaWJ1dGVzIH0gPSBlbGVtZW50O1xyXG5cclxuICAgIC8vIEhhbmRsZSBjb21wbGV4IHNlbGVjdG9ycyB3aXRoIG11bHRpcGxlIHBhcnRzXHJcbiAgICAvLyBlLmcuLCBcImJ1dHRvbi5idG5cIiwgXCJidXR0b25bbmFtZT1cInN1Ym1pdFwiXVwiLCBcIi5idG4ucHJpbWFyeVwiXHJcbiAgICBcclxuICAgIC8vIENoZWNrIGZvciBlbGVtZW50IHR5cGUgKyBjbGFzcyAoZS5nLiwgXCJidXR0b24uYnRuXCIpXHJcbiAgICBjb25zdCB0eXBlQ2xhc3NNYXRjaCA9IHNlbGVjdG9yLm1hdGNoKC9eKFthLXpdKylcXC4oW2EtejAtOV8tXSspL2kpO1xyXG4gICAgaWYgKHR5cGVDbGFzc01hdGNoKSB7XHJcbiAgICAgIGNvbnN0IFssIHR5cGUsIGNsYXNzTmFtZV0gPSB0eXBlQ2xhc3NNYXRjaDtcclxuICAgICAgcmV0dXJuIChcclxuICAgICAgICBlbGVtZW50LnR5cGUgPT09IHR5cGUgJiZcclxuICAgICAgICAoYXR0cmlidXRlcy5jbGFzcz8uc3BsaXQoL1xccysvKS5pbmNsdWRlcyhjbGFzc05hbWUpIHx8IGZhbHNlKVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZvciBtdWx0aXBsZSBjbGFzc2VzIChlLmcuLCBcIi5idG4ucHJpbWFyeVwiKVxyXG4gICAgaWYgKHNlbGVjdG9yLnN0YXJ0c1dpdGgoJy4nKSAmJiBzZWxlY3Rvci5pbmNsdWRlcygnLicsIDEpKSB7XHJcbiAgICAgIGNvbnN0IGNsYXNzZXMgPSBzZWxlY3Rvci5zcGxpdCgnLicpLmZpbHRlcihjID0+IGMpO1xyXG4gICAgICBjb25zdCBlbGVtZW50Q2xhc3NlcyA9IGF0dHJpYnV0ZXMuY2xhc3M/LnNwbGl0KC9cXHMrLykgfHwgW107XHJcbiAgICAgIHJldHVybiBjbGFzc2VzLmV2ZXJ5KGMgPT4gZWxlbWVudENsYXNzZXMuaW5jbHVkZXMoYykpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZvciBlbGVtZW50IHR5cGUgKyBhdHRyaWJ1dGUgKGUuZy4sIFwiYnV0dG9uW25hbWU9XCJzdWJtaXRcIl1cIilcclxuICAgIGNvbnN0IHR5cGVBdHRyTWF0Y2ggPSBzZWxlY3Rvci5tYXRjaCgvXihbYS16XSspXFxbKFtePVxcXV0rKT1cIihbXlwiXSspXCJcXF0vaSk7XHJcbiAgICBpZiAodHlwZUF0dHJNYXRjaCkge1xyXG4gICAgICBjb25zdCBbLCB0eXBlLCBhdHRyTmFtZSwgYXR0clZhbHVlXSA9IHR5cGVBdHRyTWF0Y2g7XHJcbiAgICAgIHJldHVybiAoXHJcbiAgICAgICAgZWxlbWVudC50eXBlID09PSB0eXBlICYmXHJcbiAgICAgICAgYXR0cmlidXRlc1thdHRyTmFtZSBhcyBrZXlvZiB0eXBlb2YgYXR0cmlidXRlc10gPT09IGF0dHJWYWx1ZVxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZvciBlbGVtZW50IHR5cGUgKyBtdWx0aXBsZSBhdHRyaWJ1dGVzIChlLmcuLCBcImlucHV0W25hbWU9XCJlbWFpbFwiXVtwbGFjZWhvbGRlcj1cIkVudGVyIGVtYWlsXCJdXCIpXHJcbiAgICBpZiAoc2VsZWN0b3IuaW5jbHVkZXMoJ1snKSAmJiBzZWxlY3Rvci5pbmNsdWRlcygnXScpKSB7XHJcbiAgICAgIGNvbnN0IHR5cGVNYXRjaCA9IHNlbGVjdG9yLm1hdGNoKC9eKFthLXpdKykvaSk7XHJcbiAgICAgIGNvbnN0IHR5cGUgPSB0eXBlTWF0Y2ggPyB0eXBlTWF0Y2hbMV0gOiBudWxsO1xyXG4gICAgICBcclxuICAgICAgaWYgKHR5cGUgJiYgZWxlbWVudC50eXBlICE9PSB0eXBlKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBFeHRyYWN0IGFsbCBhdHRyaWJ1dGUgc2VsZWN0b3JzXHJcbiAgICAgIGNvbnN0IGF0dHJNYXRjaGVzID0gc2VsZWN0b3IubWF0Y2hBbGwoL1xcWyhbXj1cXF1dKyk9XCIoW15cIl0rKVwiXFxdL2cpO1xyXG4gICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGF0dHJNYXRjaGVzKSB7XHJcbiAgICAgICAgY29uc3QgWywgYXR0ck5hbWUsIGF0dHJWYWx1ZV0gPSBtYXRjaDtcclxuICAgICAgICBpZiAoYXR0cmlidXRlc1thdHRyTmFtZSBhcyBrZXlvZiB0eXBlb2YgYXR0cmlidXRlc10gIT09IGF0dHJWYWx1ZSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBJRCBzZWxlY3RvciAoI2lkKVxyXG4gICAgaWYgKHNlbGVjdG9yLnN0YXJ0c1dpdGgoJyMnKSkge1xyXG4gICAgICBjb25zdCBpZCA9IHNlbGVjdG9yLnN1YnN0cmluZygxKS5yZXBsYWNlKC9cXFxcKC4pL2csICckMScpOyAvLyBVbmVzY2FwZVxyXG4gICAgICByZXR1cm4gYXR0cmlidXRlcy5pZCA9PT0gaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2xhc3Mgc2VsZWN0b3IgKC5jbGFzcylcclxuICAgIGlmIChzZWxlY3Rvci5zdGFydHNXaXRoKCcuJykpIHtcclxuICAgICAgY29uc3QgY2xhc3NOYW1lID0gc2VsZWN0b3Iuc3Vic3RyaW5nKDEpO1xyXG4gICAgICByZXR1cm4gYXR0cmlidXRlcy5jbGFzcz8uc3BsaXQoL1xccysvKS5pbmNsdWRlcyhjbGFzc05hbWUpIHx8IGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNpbXBsZSBhdHRyaWJ1dGUgc2VsZWN0b3JcclxuICAgIGNvbnN0IGF0dHJNYXRjaCA9IHNlbGVjdG9yLm1hdGNoKC9eXFxbKFtePVxcXV0rKT1cIihbXlwiXSspXCJcXF0kLyk7XHJcbiAgICBpZiAoYXR0ck1hdGNoKSB7XHJcbiAgICAgIGNvbnN0IFssIGF0dHJOYW1lLCBhdHRyVmFsdWVdID0gYXR0ck1hdGNoO1xyXG4gICAgICByZXR1cm4gYXR0cmlidXRlc1thdHRyTmFtZSBhcyBrZXlvZiB0eXBlb2YgYXR0cmlidXRlc10gPT09IGF0dHJWYWx1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBFbGVtZW50IHR5cGUgc2VsZWN0b3IgKGJ1dHRvbiwgaW5wdXQsIGV0Yy4pXHJcbiAgICBpZiAoL15bYS16XSskL2kudGVzdChzZWxlY3RvcikpIHtcclxuICAgICAgcmV0dXJuIGVsZW1lbnQudHlwZSA9PT0gc2VsZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgdHdvIGVsZW1lbnRzIGFyZSB0aGUgc2FtZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZWxlbWVudHNNYXRjaChcclxuICAgIGVsZW1lbnQxOiBJZGVudGlmaWVkRWxlbWVudCxcclxuICAgIGVsZW1lbnQyOiBJZGVudGlmaWVkRWxlbWVudFxyXG4gICk6IGJvb2xlYW4ge1xyXG4gICAgLy8gQ29tcGFyZSBieSB4cGF0aCBhcyB1bmlxdWUgaWRlbnRpZmllclxyXG4gICAgaWYgKGVsZW1lbnQxLnhwYXRoICYmIGVsZW1lbnQyLnhwYXRoKSB7XHJcbiAgICAgIHJldHVybiBlbGVtZW50MS54cGF0aCA9PT0gZWxlbWVudDIueHBhdGg7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRmFsbGJhY2s6IGNvbXBhcmUgYnkgYXR0cmlidXRlc1xyXG4gICAgcmV0dXJuIChcclxuICAgICAgZWxlbWVudDEudHlwZSA9PT0gZWxlbWVudDIudHlwZSAmJlxyXG4gICAgICB0aGlzLmF0dHJpYnV0ZXNNYXRjaChlbGVtZW50MS5hdHRyaWJ1dGVzLCBlbGVtZW50Mi5hdHRyaWJ1dGVzKVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHR3byBhdHRyaWJ1dGUgc2V0cyBtYXRjaFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXR0cmlidXRlc01hdGNoKFxyXG4gICAgYXR0cnMxOiBJZGVudGlmaWVkRWxlbWVudFsnYXR0cmlidXRlcyddLFxyXG4gICAgYXR0cnMyOiBJZGVudGlmaWVkRWxlbWVudFsnYXR0cmlidXRlcyddXHJcbiAgKTogYm9vbGVhbiB7XHJcbiAgICAvLyBDb21wYXJlIGtleSBhdHRyaWJ1dGVzXHJcbiAgICBjb25zdCBrZXlBdHRyczogKGtleW9mIElkZW50aWZpZWRFbGVtZW50WydhdHRyaWJ1dGVzJ10pW10gPSBbXHJcbiAgICAgICdpZCcsXHJcbiAgICAgICduYW1lJyxcclxuICAgICAgJ2RhdGEtdGVzdGlkJyxcclxuICAgICAgJ2FyaWEtbGFiZWwnLFxyXG4gICAgXTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IGF0dHIgb2Yga2V5QXR0cnMpIHtcclxuICAgICAgaWYgKGF0dHJzMVthdHRyXSAmJiBhdHRyczJbYXR0cl0gJiYgYXR0cnMxW2F0dHJdID09PSBhdHRyczJbYXR0cl0pIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIElmIG5vIGtleSBhdHRyaWJ1dGVzIG1hdGNoLCBjb21wYXJlIHRleHQgY29udGVudFxyXG4gICAgaWYgKGF0dHJzMS50ZXh0ICYmIGF0dHJzMi50ZXh0ICYmIGF0dHJzMS50ZXh0ID09PSBhdHRyczIudGV4dCkge1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gZmFsc2U7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFc2NhcGUgc3BlY2lhbCBjaGFyYWN0ZXJzIGluIENTUyBzZWxlY3RvcnNcclxuICAgKi9cclxuICBwcml2YXRlIGVzY2FwZVNlbGVjdG9yKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgLy8gRXNjYXBlIHNwZWNpYWwgQ1NTIGNoYXJhY3RlcnNcclxuICAgIC8vIEZvciBJRHMgd2l0aCBzcGVjaWFsIGNoYXJzLCB3ZSBuZWVkIHRvIGVzY2FwZSB0aGVtIHByb3Blcmx5XHJcbiAgICByZXR1cm4gdmFsdWUucmVwbGFjZSgvKFshXCIjJCUmJygpKissLlxcLzo7PD0+P0BbXFxcXFxcXV5ge3x9fl0pL2csICdcXFxcJDEnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGFuIGVzY2FwZWQgSUQgc2VsZWN0b3IgbWF0Y2hlcyBhbiBlbGVtZW50XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBtYXRjaGVzRXNjYXBlZElkKGVsZW1lbnQ6IElkZW50aWZpZWRFbGVtZW50LCBlc2NhcGVkSWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gVW5lc2NhcGUgdGhlIElEIGZvciBjb21wYXJpc29uXHJcbiAgICBjb25zdCB1bmVzY2FwZWRJZCA9IGVzY2FwZWRJZC5yZXBsYWNlKC9cXFxcKC4pL2csICckMScpO1xyXG4gICAgcmV0dXJuIGVsZW1lbnQuYXR0cmlidXRlcy5pZCA9PT0gdW5lc2NhcGVkSWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWZpbmUgYSBub24tdW5pcXVlIHNlbGVjdG9yIHRvIG1ha2UgaXQgdW5pcXVlXHJcbiAgICogVGhpcyBtZXRob2QgYXR0ZW1wdHMgdG8gY29tYmluZSBtdWx0aXBsZSBzdHJhdGVnaWVzIHRvIGNyZWF0ZSBhIHVuaXF1ZSBzZWxlY3RvclxyXG4gICAqL1xyXG4gIHJlZmluZVNlbGVjdG9yKFxyXG4gICAgZWxlbWVudDogSWRlbnRpZmllZEVsZW1lbnQsXHJcbiAgICBhbGxFbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXVxyXG4gICk6IHN0cmluZyB7XHJcbiAgICBjb25zdCB7IGF0dHJpYnV0ZXMgfSA9IGVsZW1lbnQ7XHJcblxyXG4gICAgLy8gVHJ5IGNvbWJpbmluZyBlbGVtZW50IHR5cGUgd2l0aCBhdHRyaWJ1dGVzXHJcbiAgICBjb25zdCByZWZpbmVtZW50U3RyYXRlZ2llcyA9IFtcclxuICAgICAgLy8gVHlwZSArIGRhdGEtdGVzdGlkXHJcbiAgICAgICgpID0+XHJcbiAgICAgICAgYXR0cmlidXRlc1snZGF0YS10ZXN0aWQnXVxyXG4gICAgICAgICAgPyBgJHtlbGVtZW50LnR5cGV9W2RhdGEtdGVzdGlkPVwiJHthdHRyaWJ1dGVzWydkYXRhLXRlc3RpZCddfVwiXWBcclxuICAgICAgICAgIDogbnVsbCxcclxuICAgICAgXHJcbiAgICAgIC8vIFR5cGUgKyBpZFxyXG4gICAgICAoKSA9PlxyXG4gICAgICAgIGF0dHJpYnV0ZXMuaWRcclxuICAgICAgICAgID8gYCR7ZWxlbWVudC50eXBlfSMke3RoaXMuZXNjYXBlU2VsZWN0b3IoYXR0cmlidXRlcy5pZCl9YFxyXG4gICAgICAgICAgOiBudWxsLFxyXG4gICAgICBcclxuICAgICAgLy8gVHlwZSArIG5hbWVcclxuICAgICAgKCkgPT5cclxuICAgICAgICBhdHRyaWJ1dGVzLm5hbWVcclxuICAgICAgICAgID8gYCR7ZWxlbWVudC50eXBlfVtuYW1lPVwiJHthdHRyaWJ1dGVzLm5hbWV9XCJdYFxyXG4gICAgICAgICAgOiBudWxsLFxyXG4gICAgICBcclxuICAgICAgLy8gVHlwZSArIGFyaWEtbGFiZWxcclxuICAgICAgKCkgPT5cclxuICAgICAgICBhdHRyaWJ1dGVzWydhcmlhLWxhYmVsJ11cclxuICAgICAgICAgID8gYCR7ZWxlbWVudC50eXBlfVthcmlhLWxhYmVsPVwiJHthdHRyaWJ1dGVzWydhcmlhLWxhYmVsJ119XCJdYFxyXG4gICAgICAgICAgOiBudWxsLFxyXG4gICAgICBcclxuICAgICAgLy8gVHlwZSArIGNsYXNzXHJcbiAgICAgICgpID0+IHtcclxuICAgICAgICBpZiAoIWF0dHJpYnV0ZXMuY2xhc3MpIHJldHVybiBudWxsO1xyXG4gICAgICAgIGNvbnN0IGNsYXNzZXMgPSBhdHRyaWJ1dGVzLmNsYXNzLnRyaW0oKS5zcGxpdCgvXFxzKy8pO1xyXG4gICAgICAgIHJldHVybiBjbGFzc2VzLmxlbmd0aCA+IDBcclxuICAgICAgICAgID8gYCR7ZWxlbWVudC50eXBlfS4ke3RoaXMuZXNjYXBlU2VsZWN0b3IoY2xhc3Nlc1swXSl9YFxyXG4gICAgICAgICAgOiBudWxsO1xyXG4gICAgICB9LFxyXG4gICAgICBcclxuICAgICAgLy8gTXVsdGlwbGUgY2xhc3Nlc1xyXG4gICAgICAoKSA9PiB7XHJcbiAgICAgICAgaWYgKCFhdHRyaWJ1dGVzLmNsYXNzKSByZXR1cm4gbnVsbDtcclxuICAgICAgICBjb25zdCBjbGFzc2VzID0gYXR0cmlidXRlcy5jbGFzcy50cmltKCkuc3BsaXQoL1xccysvKTtcclxuICAgICAgICByZXR1cm4gY2xhc3Nlcy5sZW5ndGggPiAxXHJcbiAgICAgICAgICA/IGAuJHtjbGFzc2VzLm1hcCgoYykgPT4gdGhpcy5lc2NhcGVTZWxlY3RvcihjKSkuam9pbignLicpfWBcclxuICAgICAgICAgIDogbnVsbDtcclxuICAgICAgfSxcclxuICAgICAgXHJcbiAgICAgIC8vIFR5cGUgKyBtdWx0aXBsZSBhdHRyaWJ1dGVzXHJcbiAgICAgICgpID0+IHtcclxuICAgICAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbZWxlbWVudC50eXBlXTtcclxuICAgICAgICBpZiAoYXR0cmlidXRlcy5uYW1lKSBwYXJ0cy5wdXNoKGBbbmFtZT1cIiR7YXR0cmlidXRlcy5uYW1lfVwiXWApO1xyXG4gICAgICAgIGlmIChhdHRyaWJ1dGVzLnBsYWNlaG9sZGVyKSBwYXJ0cy5wdXNoKGBbcGxhY2Vob2xkZXI9XCIke2F0dHJpYnV0ZXMucGxhY2Vob2xkZXJ9XCJdYCk7XHJcbiAgICAgICAgcmV0dXJuIHBhcnRzLmxlbmd0aCA+IDEgPyBwYXJ0cy5qb2luKCcnKSA6IG51bGw7XHJcbiAgICAgIH0sXHJcbiAgICBdO1xyXG5cclxuICAgIC8vIFRyeSBlYWNoIHJlZmluZW1lbnQgc3RyYXRlZ3lcclxuICAgIGZvciAoY29uc3Qgc3RyYXRlZ3kgb2YgcmVmaW5lbWVudFN0cmF0ZWdpZXMpIHtcclxuICAgICAgY29uc3Qgc2VsZWN0b3IgPSBzdHJhdGVneSgpO1xyXG4gICAgICBpZiAoc2VsZWN0b3IgJiYgdGhpcy52YWxpZGF0ZVNlbGVjdG9yKHNlbGVjdG9yLCBlbGVtZW50LCBhbGxFbGVtZW50cykpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW1NlbGVjdG9yIEdlbmVyYXRvcl0gUmVmaW5lZCBzZWxlY3RvcjogJHtzZWxlY3Rvcn1gKTtcclxuICAgICAgICByZXR1cm4gc2VsZWN0b3I7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBJZiBhbGwgcmVmaW5lbWVudCBzdHJhdGVnaWVzIGZhaWwsIHVzZSB4cGF0aCBhcyBsYXN0IHJlc29ydFxyXG4gICAgY29uc29sZS53YXJuKCdbU2VsZWN0b3IgR2VuZXJhdG9yXSBSZWZpbmVtZW50IGZhaWxlZCwgdXNpbmcgeHBhdGgnKTtcclxuICAgIHJldHVybiBlbGVtZW50LnhwYXRoO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3Qgc2VsZWN0b3JHZW5lcmF0b3IgPSBTZWxlY3RvckdlbmVyYXRvci5nZXRJbnN0YW5jZSgpO1xyXG4iXX0=