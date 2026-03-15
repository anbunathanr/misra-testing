"use strict";
/**
 * Application Analyzer Service
 * Examines web pages to identify testable elements and user flows
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.applicationAnalyzer = exports.ApplicationAnalyzer = void 0;
const browser_service_1 = require("../browser-service");
class ApplicationAnalyzer {
    static instance;
    constructor() { }
    static getInstance() {
        if (!ApplicationAnalyzer.instance) {
            ApplicationAnalyzer.instance = new ApplicationAnalyzer();
        }
        return ApplicationAnalyzer.instance;
    }
    /**
     * Analyze a web page to identify testable elements and user flows
     */
    async analyze(url, options) {
        let session = null;
        const startTime = Date.now();
        try {
            console.log(`Starting analysis of ${url}`);
            // Initialize browser session
            session = await browser_service_1.browserService.initializeBrowser();
            const { page } = session;
            // Configure viewport if specified
            if (options?.viewport) {
                await page.setViewportSize(options.viewport);
            }
            // Set timeout if specified
            const timeout = options?.timeout || 30000;
            page.setDefaultTimeout(timeout);
            page.setDefaultNavigationTimeout(timeout);
            // Navigate to the URL
            console.log(`Navigating to ${url}`);
            await page.goto(url, { waitUntil: 'networkidle' });
            // Wait for specific selector if provided
            if (options?.waitForSelector) {
                console.log(`Waiting for selector: ${options.waitForSelector}`);
                await page.waitForSelector(options.waitForSelector, { timeout });
            }
            // Extract page title
            const title = await page.title();
            console.log(`Page title: ${title}`);
            // Identify interactive elements
            const elements = await this.identifyElements(page);
            console.log(`Identified ${elements.length} interactive elements`);
            // Detect UI patterns
            const patterns = await this.detectUIPatterns(page, elements);
            console.log(`Detected ${patterns.length} UI patterns`);
            // Identify user flows
            const flows = await this.identifyUserFlows(page, elements);
            console.log(`Identified ${flows.length} user flows`);
            // Capture page metadata
            const metadata = await this.captureMetadata(page, startTime);
            console.log(`Page metadata captured`);
            const analysis = {
                url,
                title,
                elements,
                patterns,
                flows,
                metadata,
            };
            console.log(`Analysis completed successfully`);
            return analysis;
        }
        catch (error) {
            console.error(`Failed to analyze ${url}:`, error);
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    throw new Error(`Failed to load page: timeout after ${options?.timeout || 30000}ms`);
                }
                if (error.message.includes('net::ERR')) {
                    throw new Error(`Failed to load page: network error - ${error.message}`);
                }
                throw new Error(`Failed to analyze page: ${error.message}`);
            }
            throw new Error('Failed to analyze page: Unknown error');
        }
        finally {
            // Clean up browser resources
            if (session) {
                await browser_service_1.browserService.forceCleanup();
            }
        }
    }
    /**
     * Identify interactive elements on the page
     */
    async identifyElements(page) {
        const elements = [];
        // Define element selectors for different types
        const elementSelectors = [
            { type: 'button', selector: 'button, input[type="button"], input[type="submit"], input[type="reset"]' },
            { type: 'link', selector: 'a[href]' },
            { type: 'input', selector: 'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])' },
            { type: 'select', selector: 'select' },
            { type: 'textarea', selector: 'textarea' },
            { type: 'checkbox', selector: 'input[type="checkbox"]' },
            { type: 'radio', selector: 'input[type="radio"]' },
        ];
        // Extract elements for each type
        for (const { type, selector } of elementSelectors) {
            const locators = await page.locator(selector).all();
            for (const locator of locators) {
                try {
                    // Check if element is visible (skip hidden elements)
                    const isVisible = await locator.isVisible().catch(() => false);
                    if (!isVisible)
                        continue;
                    // Extract attributes
                    const id = await locator.getAttribute('id').catch(() => null);
                    const className = await locator.getAttribute('class').catch(() => null);
                    const name = await locator.getAttribute('name').catch(() => null);
                    const ariaLabel = await locator.getAttribute('aria-label').catch(() => null);
                    const dataTestId = await locator.getAttribute('data-testid').catch(() => null);
                    const placeholder = await locator.getAttribute('placeholder').catch(() => null);
                    const text = await locator.textContent().catch(() => null);
                    // Generate CSS path and XPath
                    const elementHandle = await locator.elementHandle();
                    if (!elementHandle)
                        continue;
                    const cssPath = await this.generateCSSPath(page, elementHandle);
                    const xpath = await this.generateXPath(page, elementHandle);
                    // Build attributes object (only include non-null values)
                    const attributes = {};
                    if (id)
                        attributes.id = id;
                    if (className)
                        attributes.class = className;
                    if (name)
                        attributes.name = name;
                    if (ariaLabel)
                        attributes['aria-label'] = ariaLabel;
                    if (dataTestId)
                        attributes['data-testid'] = dataTestId;
                    if (placeholder)
                        attributes.placeholder = placeholder;
                    if (text?.trim())
                        attributes.text = text.trim();
                    elements.push({
                        type,
                        attributes,
                        xpath,
                        cssPath,
                    });
                }
                catch (error) {
                    // Skip elements that cause errors during extraction
                    console.warn(`Failed to extract element of type ${type}:`, error);
                    continue;
                }
            }
        }
        return elements;
    }
    /**
     * Generate CSS path for an element
     */
    async generateCSSPath(page, element) {
        try {
            // @ts-ignore - Browser context has DOM types
            const path = await page.evaluate((el) => {
                const parts = [];
                // @ts-ignore - Element type exists in browser context
                let current = el;
                while (current && current.nodeType === 1) { // ELEMENT_NODE = 1
                    let selector = current.tagName.toLowerCase();
                    // Use ID if available
                    if (current.id) {
                        selector += `#${current.id}`;
                        parts.unshift(selector);
                        break;
                    }
                    // Add class if available
                    if (current.className && typeof current.className === 'string') {
                        const classes = current.className.trim().split(/\s+/).filter((c) => c);
                        if (classes.length > 0) {
                            selector += `.${classes.join('.')}`;
                        }
                    }
                    // Add nth-child if needed for uniqueness
                    if (current.parentElement) {
                        const siblings = Array.from(current.parentElement.children);
                        // @ts-ignore - Element type exists in browser context
                        const sameTagSiblings = siblings.filter((s) => s.tagName === current.tagName);
                        if (sameTagSiblings.length > 1) {
                            const index = sameTagSiblings.indexOf(current) + 1;
                            selector += `:nth-of-type(${index})`;
                        }
                    }
                    parts.unshift(selector);
                    current = current.parentElement;
                    // Limit depth to avoid overly long selectors
                    if (parts.length >= 5)
                        break;
                }
                return parts.join(' > ');
            }, element);
            return path;
        }
        catch (error) {
            console.warn('Failed to generate CSS path:', error);
            return '';
        }
    }
    /**
     * Generate XPath for an element
     */
    async generateXPath(page, element) {
        try {
            // @ts-ignore - Browser context has DOM types
            const xpath = await page.evaluate((el) => {
                const parts = [];
                // @ts-ignore - Element type exists in browser context
                let current = el;
                while (current && current.nodeType === 1) { // ELEMENT_NODE = 1
                    let index = 1;
                    let sibling = current.previousSibling;
                    while (sibling) {
                        if (sibling.nodeType === 1 && sibling.nodeName === current.nodeName) { // ELEMENT_NODE = 1
                            index++;
                        }
                        sibling = sibling.previousSibling;
                    }
                    const tagName = current.nodeName.toLowerCase();
                    const part = index > 1 ? `${tagName}[${index}]` : tagName;
                    parts.unshift(part);
                    current = current.parentElement;
                    // Limit depth to avoid overly long XPaths
                    if (parts.length >= 5)
                        break;
                }
                return '//' + parts.join('/');
            }, element);
            return xpath;
        }
        catch (error) {
            console.warn('Failed to generate XPath:', error);
            return '';
        }
    }
    /**
     * Detect common UI patterns
     */
    async detectUIPatterns(page, elements) {
        const patterns = [];
        try {
            // Detect forms
            const forms = await this.detectForms(page, elements);
            patterns.push(...forms);
            // Detect navigation menus
            const navigation = await this.detectNavigation(page, elements);
            patterns.push(...navigation);
            // Detect modals
            const modals = await this.detectModals(page, elements);
            patterns.push(...modals);
            // Detect tables
            const tables = await this.detectTables(page, elements);
            patterns.push(...tables);
            console.log(`Detected patterns: ${forms.length} forms, ${navigation.length} navigation, ${modals.length} modals, ${tables.length} tables`);
        }
        catch (error) {
            console.warn('Error detecting UI patterns:', error);
        }
        return patterns;
    }
    /**
     * Detect form patterns
     */
    async detectForms(page, elements) {
        const patterns = [];
        try {
            const forms = await page.locator('form').all();
            for (const form of forms) {
                const isVisible = await form.isVisible().catch(() => false);
                if (!isVisible)
                    continue;
                // Find form elements within this form
                const formElements = await this.getFormElements(form, elements);
                if (formElements.length > 0) {
                    // Get form description from label, legend, or nearby heading
                    const description = await this.getFormDescription(form);
                    patterns.push({
                        type: 'form',
                        elements: formElements,
                        description: description || 'Form',
                    });
                }
            }
        }
        catch (error) {
            console.warn('Error detecting forms:', error);
        }
        return patterns;
    }
    /**
     * Get elements within a form
     */
    async getFormElements(form, allElements) {
        const formElements = [];
        try {
            // Get all input, select, textarea, and button elements within the form
            const inputs = await form.locator('input, select, textarea, button').all();
            for (const input of inputs) {
                const name = await input.getAttribute('name').catch(() => null);
                const id = await input.getAttribute('id').catch(() => null);
                // Match with identified elements
                const matchedElement = allElements.find(el => (name && el.attributes.name === name) ||
                    (id && el.attributes.id === id));
                if (matchedElement) {
                    formElements.push(matchedElement);
                }
            }
        }
        catch (error) {
            console.warn('Error getting form elements:', error);
        }
        return formElements;
    }
    /**
     * Get form description
     */
    async getFormDescription(form) {
        try {
            // Try to find a legend or heading within the form
            const legend = await form.locator('legend').first().textContent().catch(() => null);
            if (legend?.trim())
                return legend.trim();
            const heading = await form.locator('h1, h2, h3, h4, h5, h6').first().textContent().catch(() => null);
            if (heading?.trim())
                return heading.trim();
            // Try to find a label or aria-label
            const ariaLabel = await form.getAttribute('aria-label').catch(() => null);
            if (ariaLabel?.trim())
                return ariaLabel.trim();
            return 'Form';
        }
        catch (error) {
            return 'Form';
        }
    }
    /**
     * Detect navigation patterns
     */
    async detectNavigation(page, elements) {
        const patterns = [];
        try {
            const navs = await page.locator('nav, [role="navigation"]').all();
            for (const nav of navs) {
                const isVisible = await nav.isVisible().catch(() => false);
                if (!isVisible)
                    continue;
                // Find links within this navigation
                const navLinks = await this.getNavigationLinks(nav, elements);
                if (navLinks.length > 0) {
                    const description = await nav.getAttribute('aria-label').catch(() => null) || 'Navigation menu';
                    patterns.push({
                        type: 'navigation',
                        elements: navLinks,
                        description,
                    });
                }
            }
        }
        catch (error) {
            console.warn('Error detecting navigation:', error);
        }
        return patterns;
    }
    /**
     * Get links within a navigation element
     */
    async getNavigationLinks(nav, allElements) {
        const navLinks = [];
        try {
            const links = await nav.locator('a[href]').all();
            for (const link of links) {
                const href = await link.getAttribute('href').catch(() => null);
                const text = await link.textContent().catch(() => null);
                // Match with identified elements
                const matchedElement = allElements.find(el => el.type === 'link' &&
                    ((href && el.attributes.text === text?.trim()) ||
                        (text && el.attributes.text === text.trim())));
                if (matchedElement) {
                    navLinks.push(matchedElement);
                }
            }
        }
        catch (error) {
            console.warn('Error getting navigation links:', error);
        }
        return navLinks;
    }
    /**
     * Detect modal patterns
     */
    async detectModals(page, elements) {
        const patterns = [];
        try {
            const modals = await page.locator('[role="dialog"], .modal, [aria-modal="true"]').all();
            for (const modal of modals) {
                const isVisible = await modal.isVisible().catch(() => false);
                if (!isVisible)
                    continue;
                // Find interactive elements within the modal
                const modalElements = await this.getModalElements(modal, elements);
                if (modalElements.length > 0) {
                    const description = await modal.getAttribute('aria-label').catch(() => null) || 'Modal dialog';
                    patterns.push({
                        type: 'modal',
                        elements: modalElements,
                        description,
                    });
                }
            }
        }
        catch (error) {
            console.warn('Error detecting modals:', error);
        }
        return patterns;
    }
    /**
     * Get elements within a modal
     */
    async getModalElements(modal, allElements) {
        const modalElements = [];
        try {
            const interactiveElements = await modal.locator('button, a, input, select, textarea').all();
            for (const element of interactiveElements) {
                const id = await element.getAttribute('id').catch(() => null);
                const text = await element.textContent().catch(() => null);
                // Match with identified elements
                const matchedElement = allElements.find(el => (id && el.attributes.id === id) ||
                    (text && el.attributes.text === text?.trim()));
                if (matchedElement) {
                    modalElements.push(matchedElement);
                }
            }
        }
        catch (error) {
            console.warn('Error getting modal elements:', error);
        }
        return modalElements;
    }
    /**
     * Detect table patterns
     */
    async detectTables(page, elements) {
        const patterns = [];
        try {
            const tables = await page.locator('table, [role="table"]').all();
            for (const table of tables) {
                const isVisible = await table.isVisible().catch(() => false);
                if (!isVisible)
                    continue;
                // Find interactive elements within the table (buttons, links)
                const tableElements = await this.getTableElements(table, elements);
                // Get table description from caption or aria-label
                const caption = await table.locator('caption').first().textContent().catch(() => null);
                const ariaLabel = await table.getAttribute('aria-label').catch(() => null);
                const description = caption?.trim() || ariaLabel?.trim() || 'Data table';
                patterns.push({
                    type: 'table',
                    elements: tableElements,
                    description,
                });
            }
        }
        catch (error) {
            console.warn('Error detecting tables:', error);
        }
        return patterns;
    }
    /**
     * Get interactive elements within a table
     */
    async getTableElements(table, allElements) {
        const tableElements = [];
        try {
            const interactiveElements = await table.locator('button, a').all();
            for (const element of interactiveElements) {
                const id = await element.getAttribute('id').catch(() => null);
                const text = await element.textContent().catch(() => null);
                // Match with identified elements
                const matchedElement = allElements.find(el => (id && el.attributes.id === id) ||
                    (text && el.attributes.text === text?.trim()));
                if (matchedElement) {
                    tableElements.push(matchedElement);
                }
            }
        }
        catch (error) {
            console.warn('Error getting table elements:', error);
        }
        return tableElements;
    }
    /**
     * Identify potential user flows
     */
    async identifyUserFlows(page, elements) {
        const flows = [];
        try {
            // Identify form submission flows
            const formFlows = await this.identifyFormFlows(page, elements);
            flows.push(...formFlows);
            // Identify navigation flows
            const navigationFlows = await this.identifyNavigationFlows(elements);
            flows.push(...navigationFlows);
            console.log(`Identified ${formFlows.length} form flows and ${navigationFlows.length} navigation flows`);
        }
        catch (error) {
            console.warn('Error identifying user flows:', error);
        }
        return flows;
    }
    /**
     * Identify form submission flows
     */
    async identifyFormFlows(page, elements) {
        const flows = [];
        try {
            const forms = await page.locator('form').all();
            for (const form of forms) {
                const isVisible = await form.isVisible().catch(() => false);
                if (!isVisible)
                    continue;
                // Find the submit button
                const submitButton = await form.locator('button[type="submit"], input[type="submit"]').first();
                const submitButtonVisible = await submitButton.isVisible().catch(() => false);
                if (!submitButtonVisible)
                    continue;
                // Get form inputs
                const inputs = await form.locator('input:not([type="submit"]):not([type="button"]), select, textarea').all();
                const steps = [];
                // Build flow steps
                for (const input of inputs) {
                    const type = await input.getAttribute('type').catch(() => 'text');
                    const name = await input.getAttribute('name').catch(() => null);
                    const placeholder = await input.getAttribute('placeholder').catch(() => null);
                    const label = name || placeholder || 'field';
                    steps.push(`Fill ${label}`);
                }
                // Add submit step
                const submitText = await submitButton.textContent().catch(() => 'Submit');
                steps.push(`Click ${submitText?.trim() || 'Submit'}`);
                // Find the submit button in identified elements as entry point
                const submitId = await submitButton.getAttribute('id').catch(() => null);
                const submitButtonText = await submitButton.textContent().catch(() => null);
                const entryPoint = elements.find(el => el.type === 'button' &&
                    ((submitId && el.attributes.id === submitId) ||
                        (submitButtonText && el.attributes.text === submitButtonText?.trim())));
                if (entryPoint && steps.length > 0) {
                    // Get form description
                    const formDescription = await this.getFormDescription(form);
                    flows.push({
                        name: `${formDescription} submission`,
                        steps,
                        entryPoint,
                    });
                }
            }
        }
        catch (error) {
            console.warn('Error identifying form flows:', error);
        }
        return flows;
    }
    /**
     * Identify navigation flows
     */
    async identifyNavigationFlows(elements) {
        const flows = [];
        try {
            // Group links by common patterns (e.g., navigation menus)
            const links = elements.filter(el => el.type === 'link');
            // Create flows for prominent navigation links
            for (const link of links) {
                const text = link.attributes.text;
                if (!text)
                    continue;
                // Skip footer links, social media links, etc.
                const skipPatterns = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'privacy', 'terms', 'cookie'];
                if (skipPatterns.some(pattern => text.toLowerCase().includes(pattern))) {
                    continue;
                }
                // Create a simple navigation flow
                flows.push({
                    name: `Navigate to ${text}`,
                    steps: [`Click ${text} link`],
                    entryPoint: link,
                });
            }
            // Limit to top 10 navigation flows to avoid overwhelming the AI
            return flows.slice(0, 10);
        }
        catch (error) {
            console.warn('Error identifying navigation flows:', error);
            return [];
        }
    }
    /**
     * Capture page metadata
     */
    async captureMetadata(page, startTime) {
        const viewport = page.viewportSize() || { width: 1280, height: 720 };
        const loadTime = Date.now() - startTime;
        // Detect if the page is a Single Page Application (SPA)
        const isSPA = await this.detectSPA(page);
        return {
            viewport,
            loadTime,
            isSPA,
        };
    }
    /**
     * Detect if the page is a Single Page Application
     */
    async detectSPA(page) {
        try {
            // Check for common SPA frameworks and patterns
            // @ts-ignore - Browser context has window and document
            const spaIndicators = await page.evaluate(() => {
                // @ts-ignore - window exists in browser context
                const win = window;
                // @ts-ignore - document exists in browser context
                const doc = document;
                const indicators = {
                    hasReactRoot: !!win.React || !!doc.querySelector('[data-reactroot], [data-reactid]'),
                    hasVueApp: !!win.Vue || !!doc.querySelector('[data-v-]'),
                    hasAngularApp: !!win.angular || !!win.ng || !!doc.querySelector('[ng-app], [ng-version]'),
                    hasSvelteApp: !!doc.querySelector('[data-svelte]'),
                    hasHistoryAPI: !!(win.history && win.history.pushState),
                    hasHashRouting: win.location.hash.length > 1,
                };
                return indicators;
            });
            // Consider it an SPA if it has framework indicators or uses history API
            return (spaIndicators.hasReactRoot ||
                spaIndicators.hasVueApp ||
                spaIndicators.hasAngularApp ||
                spaIndicators.hasSvelteApp ||
                (spaIndicators.hasHistoryAPI && spaIndicators.hasHashRouting));
        }
        catch (error) {
            console.warn('Error detecting SPA:', error);
            return false;
        }
    }
}
exports.ApplicationAnalyzer = ApplicationAnalyzer;
// Export singleton instance
exports.applicationAnalyzer = ApplicationAnalyzer.getInstance();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbGljYXRpb24tYW5hbHl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhcHBsaWNhdGlvbi1hbmFseXplci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFHSCx3REFBb0U7QUFVcEUsTUFBYSxtQkFBbUI7SUFDdEIsTUFBTSxDQUFDLFFBQVEsQ0FBc0I7SUFFN0MsZ0JBQXVCLENBQUM7SUFFakIsTUFBTSxDQUFDLFdBQVc7UUFDdkIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2xDLG1CQUFtQixDQUFDLFFBQVEsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7UUFDM0QsQ0FBQztRQUNELE9BQU8sbUJBQW1CLENBQUMsUUFBUSxDQUFDO0lBQ3RDLENBQUM7SUFFRDs7T0FFRztJQUNJLEtBQUssQ0FBQyxPQUFPLENBQ2xCLEdBQVcsRUFDWCxPQUF5QjtRQUV6QixJQUFJLE9BQU8sR0FBMEIsSUFBSSxDQUFDO1FBQzFDLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFJLENBQUM7WUFDSCxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBRTNDLDZCQUE2QjtZQUM3QixPQUFPLEdBQUcsTUFBTSxnQ0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDbkQsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQztZQUV6QixrQ0FBa0M7WUFDbEMsSUFBSSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDL0MsQ0FBQztZQUVELDJCQUEyQjtZQUMzQixNQUFNLE9BQU8sR0FBRyxPQUFPLEVBQUUsT0FBTyxJQUFJLEtBQUssQ0FBQztZQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFD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YSxDQUFDLFlBQVk7Z0JBQzFCLGFBQWEsQ0FBQyxTQUFTO2dCQUN2QixhQUFhLENBQUMsYUFBYTtnQkFDM0IsYUFBYSxDQUFDLFlBQVk7Z0JBQzFCLENBQUMsYUFBYSxDQUFDLGFBQWEsSUFBSSxhQUFhLENBQUMsY0FBYyxDQUFDLENBQzlELENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBandCRCxrREFpd0JDO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBcHBsaWNhdGlvbiBBbmFseXplciBTZXJ2aWNlXHJcbiAqIEV4YW1pbmVzIHdlYiBwYWdlcyB0byBpZGVudGlmeSB0ZXN0YWJsZSBlbGVtZW50cyBhbmQgdXNlciBmbG93c1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IFBhZ2UgfSBmcm9tICdwbGF5d3JpZ2h0LWNvcmUnO1xyXG5pbXBvcnQgeyBicm93c2VyU2VydmljZSwgQnJvd3NlclNlc3Npb24gfSBmcm9tICcuLi9icm93c2VyLXNlcnZpY2UnO1xyXG5pbXBvcnQge1xyXG4gIEFwcGxpY2F0aW9uQW5hbHlzaXMsXHJcbiAgQW5hbHlzaXNPcHRpb25zLFxyXG4gIElkZW50aWZpZWRFbGVtZW50LFxyXG4gIFVJUGF0dGVybixcclxuICBVc2VyRmxvdyxcclxuICBQYWdlTWV0YWRhdGEsXHJcbn0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuXHJcbmV4cG9ydCBjbGFzcyBBcHBsaWNhdGlvbkFuYWx5emVyIHtcclxuICBwcml2YXRlIHN0YXRpYyBpbnN0YW5jZTogQXBwbGljYXRpb25BbmFseXplcjtcclxuXHJcbiAgcHJpdmF0ZSBjb25zdHJ1Y3RvcigpIHt9XHJcblxyXG4gIHB1YmxpYyBzdGF0aWMgZ2V0SW5zdGFuY2UoKTogQXBwbGljYXRpb25BbmFseXplciB7XHJcbiAgICBpZiAoIUFwcGxpY2F0aW9uQW5hbHl6ZXIuaW5zdGFuY2UpIHtcclxuICAgICAgQXBwbGljYXRpb25BbmFseXplci5pbnN0YW5jZSA9IG5ldyBBcHBsaWNhdGlvbkFuYWx5emVyKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gQXBwbGljYXRpb25BbmFseXplci5pbnN0YW5jZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFuYWx5emUgYSB3ZWIgcGFnZSB0byBpZGVudGlmeSB0ZXN0YWJsZSBlbGVtZW50cyBhbmQgdXNlciBmbG93c1xyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBhbmFseXplKFxyXG4gICAgdXJsOiBzdHJpbmcsXHJcbiAgICBvcHRpb25zPzogQW5hbHlzaXNPcHRpb25zXHJcbiAgKTogUHJvbWlzZTxBcHBsaWNhdGlvbkFuYWx5c2lzPiB7XHJcbiAgICBsZXQgc2Vzc2lvbjogQnJvd3NlclNlc3Npb24gfCBudWxsID0gbnVsbDtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coYFN0YXJ0aW5nIGFuYWx5c2lzIG9mICR7dXJsfWApO1xyXG5cclxuICAgICAgLy8gSW5pdGlhbGl6ZSBicm93c2VyIHNlc3Npb25cclxuICAgICAgc2Vzc2lvbiA9IGF3YWl0IGJyb3dzZXJTZXJ2aWNlLmluaXRpYWxpemVCcm93c2VyKCk7XHJcbiAgICAgIGNvbnN0IHsgcGFnZSB9ID0gc2Vzc2lvbjtcclxuXHJcbiAgICAgIC8vIENvbmZpZ3VyZSB2aWV3cG9ydCBpZiBzcGVjaWZpZWRcclxuICAgICAgaWYgKG9wdGlvbnM/LnZpZXdwb3J0KSB7XHJcbiAgICAgICAgYXdhaXQgcGFnZS5zZXRWaWV3cG9ydFNpemUob3B0aW9ucy52aWV3cG9ydCk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFNldCB0aW1lb3V0IGlmIHNwZWNpZmllZFxyXG4gICAgICBjb25zdCB0aW1lb3V0ID0gb3B0aW9ucz8udGltZW91dCB8fCAzMDAwMDtcclxuICAgICAgcGFnZS5zZXREZWZhdWx0VGltZW91dCh0aW1lb3V0KTtcclxuICAgICAgcGFnZS5zZXREZWZhdWx0TmF2aWdhdGlvblRpbWVvdXQodGltZW91dCk7XHJcblxyXG4gICAgICAvLyBOYXZpZ2F0ZSB0byB0aGUgVVJMXHJcbiAgICAgIGNvbnNvbGUubG9nKGBOYXZpZ2F0aW5nIHRvICR7dXJsfWApO1xyXG4gICAgICBhd2FpdCBwYWdlLmdvdG8odXJsLCB7IHdhaXRVbnRpbDogJ25ldHdvcmtpZGxlJyB9KTtcclxuXHJcbiAgICAgIC8vIFdhaXQgZm9yIHNwZWNpZmljIHNlbGVjdG9yIGlmIHByb3ZpZGVkXHJcbiAgICAgIGlmIChvcHRpb25zPy53YWl0Rm9yU2VsZWN0b3IpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgV2FpdGluZyBmb3Igc2VsZWN0b3I6ICR7b3B0aW9ucy53YWl0Rm9yU2VsZWN0b3J9YCk7XHJcbiAgICAgICAgYXdhaXQgcGFnZS53YWl0Rm9yU2VsZWN0b3Iob3B0aW9ucy53YWl0Rm9yU2VsZWN0b3IsIHsgdGltZW91dCB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRXh0cmFjdCBwYWdlIHRpdGxlXHJcbiAgICAgIGNvbnN0IHRpdGxlID0gYXdhaXQgcGFnZS50aXRsZSgpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgUGFnZSB0aXRsZTogJHt0aXRsZX1gKTtcclxuXHJcbiAgICAgIC8vIElkZW50aWZ5IGludGVyYWN0aXZlIGVsZW1lbnRzXHJcbiAgICAgIGNvbnN0IGVsZW1lbnRzID0gYXdhaXQgdGhpcy5pZGVudGlmeUVsZW1lbnRzKHBhZ2UpO1xyXG4gICAgICBjb25zb2xlLmxvZyhgSWRlbnRpZmllZCAke2VsZW1lbnRzLmxlbmd0aH0gaW50ZXJhY3RpdmUgZWxlbWVudHNgKTtcclxuXHJcbiAgICAgIC8vIERldGVjdCBVSSBwYXR0ZXJuc1xyXG4gICAgICBjb25zdCBwYXR0ZXJucyA9IGF3YWl0IHRoaXMuZGV0ZWN0VUlQYXR0ZXJucyhwYWdlLCBlbGVtZW50cyk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBEZXRlY3RlZCAke3BhdHRlcm5zLmxlbmd0aH0gVUkgcGF0dGVybnNgKTtcclxuXHJcbiAgICAgIC8vIElkZW50aWZ5IHVzZXIgZmxvd3NcclxuICAgICAgY29uc3QgZmxvd3MgPSBhd2FpdCB0aGlzLmlkZW50aWZ5VXNlckZsb3dzKHBhZ2UsIGVsZW1lbnRzKTtcclxuICAgICAgY29uc29sZS5sb2coYElkZW50aWZpZWQgJHtmbG93cy5sZW5ndGh9IHVzZXIgZmxvd3NgKTtcclxuXHJcbiAgICAgIC8vIENhcHR1cmUgcGFnZSBtZXRhZGF0YVxyXG4gICAgICBjb25zdCBtZXRhZGF0YSA9IGF3YWl0IHRoaXMuY2FwdHVyZU1ldGFkYXRhKHBhZ2UsIHN0YXJ0VGltZSk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBQYWdlIG1ldGFkYXRhIGNhcHR1cmVkYCk7XHJcblxyXG4gICAgICBjb25zdCBhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpcyA9IHtcclxuICAgICAgICB1cmwsXHJcbiAgICAgICAgdGl0bGUsXHJcbiAgICAgICAgZWxlbWVudHMsXHJcbiAgICAgICAgcGF0dGVybnMsXHJcbiAgICAgICAgZmxvd3MsXHJcbiAgICAgICAgbWV0YWRhdGEsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgQW5hbHlzaXMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseWApO1xyXG4gICAgICByZXR1cm4gYW5hbHlzaXM7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBGYWlsZWQgdG8gYW5hbHl6ZSAke3VybH06YCwgZXJyb3IpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICBpZiAoZXJyb3IubWVzc2FnZS5pbmNsdWRlcygndGltZW91dCcpKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBsb2FkIHBhZ2U6IHRpbWVvdXQgYWZ0ZXIgJHtvcHRpb25zPy50aW1lb3V0IHx8IDMwMDAwfW1zYCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCduZXQ6OkVSUicpKSB7XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBsb2FkIHBhZ2U6IG5ldHdvcmsgZXJyb3IgLSAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGFuYWx5emUgcGFnZTogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBhbmFseXplIHBhZ2U6IFVua25vd24gZXJyb3InKTtcclxuICAgIH0gZmluYWxseSB7XHJcbiAgICAgIC8vIENsZWFuIHVwIGJyb3dzZXIgcmVzb3VyY2VzXHJcbiAgICAgIGlmIChzZXNzaW9uKSB7XHJcbiAgICAgICAgYXdhaXQgYnJvd3NlclNlcnZpY2UuZm9yY2VDbGVhbnVwKCk7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIElkZW50aWZ5IGludGVyYWN0aXZlIGVsZW1lbnRzIG9uIHRoZSBwYWdlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBpZGVudGlmeUVsZW1lbnRzKHBhZ2U6IFBhZ2UpOiBQcm9taXNlPElkZW50aWZpZWRFbGVtZW50W10+IHtcclxuICAgIGNvbnN0IGVsZW1lbnRzOiBJZGVudGlmaWVkRWxlbWVudFtdID0gW107XHJcblxyXG4gICAgLy8gRGVmaW5lIGVsZW1lbnQgc2VsZWN0b3JzIGZvciBkaWZmZXJlbnQgdHlwZXNcclxuICAgIGNvbnN0IGVsZW1lbnRTZWxlY3RvcnMgPSBbXHJcbiAgICAgIHsgdHlwZTogJ2J1dHRvbicgYXMgY29uc3QsIHNlbGVjdG9yOiAnYnV0dG9uLCBpbnB1dFt0eXBlPVwiYnV0dG9uXCJdLCBpbnB1dFt0eXBlPVwic3VibWl0XCJdLCBpbnB1dFt0eXBlPVwicmVzZXRcIl0nIH0sXHJcbiAgICAgIHsgdHlwZTogJ2xpbmsnIGFzIGNvbnN0LCBzZWxlY3RvcjogJ2FbaHJlZl0nIH0sXHJcbiAgICAgIHsgdHlwZTogJ2lucHV0JyBhcyBjb25zdCwgc2VsZWN0b3I6ICdpbnB1dDpub3QoW3R5cGU9XCJidXR0b25cIl0pOm5vdChbdHlwZT1cInN1Ym1pdFwiXSk6bm90KFt0eXBlPVwicmVzZXRcIl0pOm5vdChbdHlwZT1cImNoZWNrYm94XCJdKTpub3QoW3R5cGU9XCJyYWRpb1wiXSknIH0sXHJcbiAgICAgIHsgdHlwZTogJ3NlbGVjdCcgYXMgY29uc3QsIHNlbGVjdG9yOiAnc2VsZWN0JyB9LFxyXG4gICAgICB7IHR5cGU6ICd0ZXh0YXJlYScgYXMgY29uc3QsIHNlbGVjdG9yOiAndGV4dGFyZWEnIH0sXHJcbiAgICAgIHsgdHlwZTogJ2NoZWNrYm94JyBhcyBjb25zdCwgc2VsZWN0b3I6ICdpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl0nIH0sXHJcbiAgICAgIHsgdHlwZTogJ3JhZGlvJyBhcyBjb25zdCwgc2VsZWN0b3I6ICdpbnB1dFt0eXBlPVwicmFkaW9cIl0nIH0sXHJcbiAgICBdO1xyXG5cclxuICAgIC8vIEV4dHJhY3QgZWxlbWVudHMgZm9yIGVhY2ggdHlwZVxyXG4gICAgZm9yIChjb25zdCB7IHR5cGUsIHNlbGVjdG9yIH0gb2YgZWxlbWVudFNlbGVjdG9ycykge1xyXG4gICAgICBjb25zdCBsb2NhdG9ycyA9IGF3YWl0IHBhZ2UubG9jYXRvcihzZWxlY3RvcikuYWxsKCk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGxvY2F0b3Igb2YgbG9jYXRvcnMpIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgZWxlbWVudCBpcyB2aXNpYmxlIChza2lwIGhpZGRlbiBlbGVtZW50cylcclxuICAgICAgICAgIGNvbnN0IGlzVmlzaWJsZSA9IGF3YWl0IGxvY2F0b3IuaXNWaXNpYmxlKCkuY2F0Y2goKCkgPT4gZmFsc2UpO1xyXG4gICAgICAgICAgaWYgKCFpc1Zpc2libGUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgIC8vIEV4dHJhY3QgYXR0cmlidXRlc1xyXG4gICAgICAgICAgY29uc3QgaWQgPSBhd2FpdCBsb2NhdG9yLmdldEF0dHJpYnV0ZSgnaWQnKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICAgIGNvbnN0IGNsYXNzTmFtZSA9IGF3YWl0IGxvY2F0b3IuZ2V0QXR0cmlidXRlKCdjbGFzcycpLmNhdGNoKCgpID0+IG51bGwpO1xyXG4gICAgICAgICAgY29uc3QgbmFtZSA9IGF3YWl0IGxvY2F0b3IuZ2V0QXR0cmlidXRlKCduYW1lJykuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgICBjb25zdCBhcmlhTGFiZWwgPSBhd2FpdCBsb2NhdG9yLmdldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpLmNhdGNoKCgpID0+IG51bGwpO1xyXG4gICAgICAgICAgY29uc3QgZGF0YVRlc3RJZCA9IGF3YWl0IGxvY2F0b3IuZ2V0QXR0cmlidXRlKCdkYXRhLXRlc3RpZCcpLmNhdGNoKCgpID0+IG51bGwpO1xyXG4gICAgICAgICAgY29uc3QgcGxhY2Vob2xkZXIgPSBhd2FpdCBsb2NhdG9yLmdldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICAgIGNvbnN0IHRleHQgPSBhd2FpdCBsb2NhdG9yLnRleHRDb250ZW50KCkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgICAgLy8gR2VuZXJhdGUgQ1NTIHBhdGggYW5kIFhQYXRoXHJcbiAgICAgICAgICBjb25zdCBlbGVtZW50SGFuZGxlID0gYXdhaXQgbG9jYXRvci5lbGVtZW50SGFuZGxlKCk7XHJcbiAgICAgICAgICBpZiAoIWVsZW1lbnRIYW5kbGUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGNzc1BhdGggPSBhd2FpdCB0aGlzLmdlbmVyYXRlQ1NTUGF0aChwYWdlLCBlbGVtZW50SGFuZGxlKTtcclxuICAgICAgICAgIGNvbnN0IHhwYXRoID0gYXdhaXQgdGhpcy5nZW5lcmF0ZVhQYXRoKHBhZ2UsIGVsZW1lbnRIYW5kbGUpO1xyXG5cclxuICAgICAgICAgIC8vIEJ1aWxkIGF0dHJpYnV0ZXMgb2JqZWN0IChvbmx5IGluY2x1ZGUgbm9uLW51bGwgdmFsdWVzKVxyXG4gICAgICAgICAgY29uc3QgYXR0cmlidXRlczogSWRlbnRpZmllZEVsZW1lbnRbJ2F0dHJpYnV0ZXMnXSA9IHt9O1xyXG4gICAgICAgICAgaWYgKGlkKSBhdHRyaWJ1dGVzLmlkID0gaWQ7XHJcbiAgICAgICAgICBpZiAoY2xhc3NOYW1lKSBhdHRyaWJ1dGVzLmNsYXNzID0gY2xhc3NOYW1lO1xyXG4gICAgICAgICAgaWYgKG5hbWUpIGF0dHJpYnV0ZXMubmFtZSA9IG5hbWU7XHJcbiAgICAgICAgICBpZiAoYXJpYUxhYmVsKSBhdHRyaWJ1dGVzWydhcmlhLWxhYmVsJ10gPSBhcmlhTGFiZWw7XHJcbiAgICAgICAgICBpZiAoZGF0YVRlc3RJZCkgYXR0cmlidXRlc1snZGF0YS10ZXN0aWQnXSA9IGRhdGFUZXN0SWQ7XHJcbiAgICAgICAgICBpZiAocGxhY2Vob2xkZXIpIGF0dHJpYnV0ZXMucGxhY2Vob2xkZXIgPSBwbGFjZWhvbGRlcjtcclxuICAgICAgICAgIGlmICh0ZXh0Py50cmltKCkpIGF0dHJpYnV0ZXMudGV4dCA9IHRleHQudHJpbSgpO1xyXG5cclxuICAgICAgICAgIGVsZW1lbnRzLnB1c2goe1xyXG4gICAgICAgICAgICB0eXBlLFxyXG4gICAgICAgICAgICBhdHRyaWJ1dGVzLFxyXG4gICAgICAgICAgICB4cGF0aCxcclxuICAgICAgICAgICAgY3NzUGF0aCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAvLyBTa2lwIGVsZW1lbnRzIHRoYXQgY2F1c2UgZXJyb3JzIGR1cmluZyBleHRyYWN0aW9uXHJcbiAgICAgICAgICBjb25zb2xlLndhcm4oYEZhaWxlZCB0byBleHRyYWN0IGVsZW1lbnQgb2YgdHlwZSAke3R5cGV9OmAsIGVycm9yKTtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBlbGVtZW50cztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIENTUyBwYXRoIGZvciBhbiBlbGVtZW50XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZW5lcmF0ZUNTU1BhdGgocGFnZTogUGFnZSwgZWxlbWVudDogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEB0cy1pZ25vcmUgLSBCcm93c2VyIGNvbnRleHQgaGFzIERPTSB0eXBlc1xyXG4gICAgICBjb25zdCBwYXRoID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoZWwpID0+IHtcclxuICAgICAgICBjb25zdCBwYXJ0czogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIC0gRWxlbWVudCB0eXBlIGV4aXN0cyBpbiBicm93c2VyIGNvbnRleHRcclxuICAgICAgICBsZXQgY3VycmVudCA9IGVsIGFzIEVsZW1lbnQgfCBudWxsO1xyXG5cclxuICAgICAgICB3aGlsZSAoY3VycmVudCAmJiBjdXJyZW50Lm5vZGVUeXBlID09PSAxKSB7IC8vIEVMRU1FTlRfTk9ERSA9IDFcclxuICAgICAgICAgIGxldCBzZWxlY3RvciA9IGN1cnJlbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG5cclxuICAgICAgICAgIC8vIFVzZSBJRCBpZiBhdmFpbGFibGVcclxuICAgICAgICAgIGlmIChjdXJyZW50LmlkKSB7XHJcbiAgICAgICAgICAgIHNlbGVjdG9yICs9IGAjJHtjdXJyZW50LmlkfWA7XHJcbiAgICAgICAgICAgIHBhcnRzLnVuc2hpZnQoc2VsZWN0b3IpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBBZGQgY2xhc3MgaWYgYXZhaWxhYmxlXHJcbiAgICAgICAgICBpZiAoY3VycmVudC5jbGFzc05hbWUgJiYgdHlwZW9mIGN1cnJlbnQuY2xhc3NOYW1lID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICBjb25zdCBjbGFzc2VzID0gY3VycmVudC5jbGFzc05hbWUudHJpbSgpLnNwbGl0KC9cXHMrLykuZmlsdGVyKChjOiBzdHJpbmcpID0+IGMpO1xyXG4gICAgICAgICAgICBpZiAoY2xhc3Nlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gYC4ke2NsYXNzZXMuam9pbignLicpfWA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBBZGQgbnRoLWNoaWxkIGlmIG5lZWRlZCBmb3IgdW5pcXVlbmVzc1xyXG4gICAgICAgICAgaWYgKGN1cnJlbnQucGFyZW50RWxlbWVudCkge1xyXG4gICAgICAgICAgICBjb25zdCBzaWJsaW5ncyA9IEFycmF5LmZyb20oY3VycmVudC5wYXJlbnRFbGVtZW50LmNoaWxkcmVuKTtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSAtIEVsZW1lbnQgdHlwZSBleGlzdHMgaW4gYnJvd3NlciBjb250ZXh0XHJcbiAgICAgICAgICAgIGNvbnN0IHNhbWVUYWdTaWJsaW5ncyA9IHNpYmxpbmdzLmZpbHRlcigoczogRWxlbWVudCkgPT4gcy50YWdOYW1lID09PSBjdXJyZW50IS50YWdOYW1lKTtcclxuICAgICAgICAgICAgaWYgKHNhbWVUYWdTaWJsaW5ncy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBzYW1lVGFnU2libGluZ3MuaW5kZXhPZihjdXJyZW50KSArIDE7XHJcbiAgICAgICAgICAgICAgc2VsZWN0b3IgKz0gYDpudGgtb2YtdHlwZSgke2luZGV4fSlgO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgcGFydHMudW5zaGlmdChzZWxlY3Rvcik7XHJcbiAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnRFbGVtZW50O1xyXG5cclxuICAgICAgICAgIC8vIExpbWl0IGRlcHRoIHRvIGF2b2lkIG92ZXJseSBsb25nIHNlbGVjdG9yc1xyXG4gICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSA1KSBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKCcgPiAnKTtcclxuICAgICAgfSwgZWxlbWVudCk7XHJcblxyXG4gICAgICByZXR1cm4gcGF0aDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGdlbmVyYXRlIENTUyBwYXRoOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgWFBhdGggZm9yIGFuIGVsZW1lbnRcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGdlbmVyYXRlWFBhdGgocGFnZTogUGFnZSwgZWxlbWVudDogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEB0cy1pZ25vcmUgLSBCcm93c2VyIGNvbnRleHQgaGFzIERPTSB0eXBlc1xyXG4gICAgICBjb25zdCB4cGF0aCA9IGF3YWl0IHBhZ2UuZXZhbHVhdGUoKGVsKSA9PiB7XHJcbiAgICAgICAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAtIEVsZW1lbnQgdHlwZSBleGlzdHMgaW4gYnJvd3NlciBjb250ZXh0XHJcbiAgICAgICAgbGV0IGN1cnJlbnQgPSBlbCBhcyBFbGVtZW50IHwgbnVsbDtcclxuXHJcbiAgICAgICAgd2hpbGUgKGN1cnJlbnQgJiYgY3VycmVudC5ub2RlVHlwZSA9PT0gMSkgeyAvLyBFTEVNRU5UX05PREUgPSAxXHJcbiAgICAgICAgICBsZXQgaW5kZXggPSAxO1xyXG4gICAgICAgICAgbGV0IHNpYmxpbmcgPSBjdXJyZW50LnByZXZpb3VzU2libGluZztcclxuXHJcbiAgICAgICAgICB3aGlsZSAoc2libGluZykge1xyXG4gICAgICAgICAgICBpZiAoc2libGluZy5ub2RlVHlwZSA9PT0gMSAmJiBzaWJsaW5nLm5vZGVOYW1lID09PSBjdXJyZW50Lm5vZGVOYW1lKSB7IC8vIEVMRU1FTlRfTk9ERSA9IDFcclxuICAgICAgICAgICAgICBpbmRleCsrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNpYmxpbmcgPSBzaWJsaW5nLnByZXZpb3VzU2libGluZztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjb25zdCB0YWdOYW1lID0gY3VycmVudC5ub2RlTmFtZS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgY29uc3QgcGFydCA9IGluZGV4ID4gMSA/IGAke3RhZ05hbWV9WyR7aW5kZXh9XWAgOiB0YWdOYW1lO1xyXG4gICAgICAgICAgcGFydHMudW5zaGlmdChwYXJ0KTtcclxuXHJcbiAgICAgICAgICBjdXJyZW50ID0gY3VycmVudC5wYXJlbnRFbGVtZW50O1xyXG5cclxuICAgICAgICAgIC8vIExpbWl0IGRlcHRoIHRvIGF2b2lkIG92ZXJseSBsb25nIFhQYXRoc1xyXG4gICAgICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSA1KSBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiAnLy8nICsgcGFydHMuam9pbignLycpO1xyXG4gICAgICB9LCBlbGVtZW50KTtcclxuXHJcbiAgICAgIHJldHVybiB4cGF0aDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGdlbmVyYXRlIFhQYXRoOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuICcnO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZWN0IGNvbW1vbiBVSSBwYXR0ZXJuc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZGV0ZWN0VUlQYXR0ZXJucyhcclxuICAgIHBhZ2U6IFBhZ2UsXHJcbiAgICBlbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXVxyXG4gICk6IFByb21pc2U8VUlQYXR0ZXJuW10+IHtcclxuICAgIGNvbnN0IHBhdHRlcm5zOiBVSVBhdHRlcm5bXSA9IFtdO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIERldGVjdCBmb3Jtc1xyXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IHRoaXMuZGV0ZWN0Rm9ybXMocGFnZSwgZWxlbWVudHMpO1xyXG4gICAgICBwYXR0ZXJucy5wdXNoKC4uLmZvcm1zKTtcclxuXHJcbiAgICAgIC8vIERldGVjdCBuYXZpZ2F0aW9uIG1lbnVzXHJcbiAgICAgIGNvbnN0IG5hdmlnYXRpb24gPSBhd2FpdCB0aGlzLmRldGVjdE5hdmlnYXRpb24ocGFnZSwgZWxlbWVudHMpO1xyXG4gICAgICBwYXR0ZXJucy5wdXNoKC4uLm5hdmlnYXRpb24pO1xyXG5cclxuICAgICAgLy8gRGV0ZWN0IG1vZGFsc1xyXG4gICAgICBjb25zdCBtb2RhbHMgPSBhd2FpdCB0aGlzLmRldGVjdE1vZGFscyhwYWdlLCBlbGVtZW50cyk7XHJcbiAgICAgIHBhdHRlcm5zLnB1c2goLi4ubW9kYWxzKTtcclxuXHJcbiAgICAgIC8vIERldGVjdCB0YWJsZXNcclxuICAgICAgY29uc3QgdGFibGVzID0gYXdhaXQgdGhpcy5kZXRlY3RUYWJsZXMocGFnZSwgZWxlbWVudHMpO1xyXG4gICAgICBwYXR0ZXJucy5wdXNoKC4uLnRhYmxlcyk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgRGV0ZWN0ZWQgcGF0dGVybnM6ICR7Zm9ybXMubGVuZ3RofSBmb3JtcywgJHtuYXZpZ2F0aW9uLmxlbmd0aH0gbmF2aWdhdGlvbiwgJHttb2RhbHMubGVuZ3RofSBtb2RhbHMsICR7dGFibGVzLmxlbmd0aH0gdGFibGVzYCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGRldGVjdGluZyBVSSBwYXR0ZXJuczonLCBlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBhdHRlcm5zO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZWN0IGZvcm0gcGF0dGVybnNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGRldGVjdEZvcm1zKHBhZ2U6IFBhZ2UsIGVsZW1lbnRzOiBJZGVudGlmaWVkRWxlbWVudFtdKTogUHJvbWlzZTxVSVBhdHRlcm5bXT4ge1xyXG4gICAgY29uc3QgcGF0dGVybnM6IFVJUGF0dGVybltdID0gW107XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgZm9ybXMgPSBhd2FpdCBwYWdlLmxvY2F0b3IoJ2Zvcm0nKS5hbGwoKTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgZm9ybSBvZiBmb3Jtcykge1xyXG4gICAgICAgIGNvbnN0IGlzVmlzaWJsZSA9IGF3YWl0IGZvcm0uaXNWaXNpYmxlKCkuY2F0Y2goKCkgPT4gZmFsc2UpO1xyXG4gICAgICAgIGlmICghaXNWaXNpYmxlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgLy8gRmluZCBmb3JtIGVsZW1lbnRzIHdpdGhpbiB0aGlzIGZvcm1cclxuICAgICAgICBjb25zdCBmb3JtRWxlbWVudHMgPSBhd2FpdCB0aGlzLmdldEZvcm1FbGVtZW50cyhmb3JtLCBlbGVtZW50cyk7XHJcblxyXG4gICAgICAgIGlmIChmb3JtRWxlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgLy8gR2V0IGZvcm0gZGVzY3JpcHRpb24gZnJvbSBsYWJlbCwgbGVnZW5kLCBvciBuZWFyYnkgaGVhZGluZ1xyXG4gICAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBhd2FpdCB0aGlzLmdldEZvcm1EZXNjcmlwdGlvbihmb3JtKTtcclxuXHJcbiAgICAgICAgICBwYXR0ZXJucy5wdXNoKHtcclxuICAgICAgICAgICAgdHlwZTogJ2Zvcm0nLFxyXG4gICAgICAgICAgICBlbGVtZW50czogZm9ybUVsZW1lbnRzLFxyXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZGVzY3JpcHRpb24gfHwgJ0Zvcm0nLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGRldGVjdGluZyBmb3JtczonLCBlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHBhdHRlcm5zO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGVsZW1lbnRzIHdpdGhpbiBhIGZvcm1cclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGdldEZvcm1FbGVtZW50cyhmb3JtOiBhbnksIGFsbEVsZW1lbnRzOiBJZGVudGlmaWVkRWxlbWVudFtdKTogUHJvbWlzZTxJZGVudGlmaWVkRWxlbWVudFtdPiB7XHJcbiAgICBjb25zdCBmb3JtRWxlbWVudHM6IElkZW50aWZpZWRFbGVtZW50W10gPSBbXTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZXQgYWxsIGlucHV0LCBzZWxlY3QsIHRleHRhcmVhLCBhbmQgYnV0dG9uIGVsZW1lbnRzIHdpdGhpbiB0aGUgZm9ybVxyXG4gICAgICBjb25zdCBpbnB1dHMgPSBhd2FpdCBmb3JtLmxvY2F0b3IoJ2lucHV0LCBzZWxlY3QsIHRleHRhcmVhLCBidXR0b24nKS5hbGwoKTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgaW5wdXQgb2YgaW5wdXRzKSB7XHJcbiAgICAgICAgY29uc3QgbmFtZSA9IGF3YWl0IGlucHV0LmdldEF0dHJpYnV0ZSgnbmFtZScpLmNhdGNoKCgpID0+IG51bGwpO1xyXG4gICAgICAgIGNvbnN0IGlkID0gYXdhaXQgaW5wdXQuZ2V0QXR0cmlidXRlKCdpZCcpLmNhdGNoKCgpID0+IG51bGwpO1xyXG5cclxuICAgICAgICAvLyBNYXRjaCB3aXRoIGlkZW50aWZpZWQgZWxlbWVudHNcclxuICAgICAgICBjb25zdCBtYXRjaGVkRWxlbWVudCA9IGFsbEVsZW1lbnRzLmZpbmQoZWwgPT4gXHJcbiAgICAgICAgICAobmFtZSAmJiBlbC5hdHRyaWJ1dGVzLm5hbWUgPT09IG5hbWUpIHx8XHJcbiAgICAgICAgICAoaWQgJiYgZWwuYXR0cmlidXRlcy5pZCA9PT0gaWQpXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgaWYgKG1hdGNoZWRFbGVtZW50KSB7XHJcbiAgICAgICAgICBmb3JtRWxlbWVudHMucHVzaChtYXRjaGVkRWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGdldHRpbmcgZm9ybSBlbGVtZW50czonLCBlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZvcm1FbGVtZW50cztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBmb3JtIGRlc2NyaXB0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBnZXRGb3JtRGVzY3JpcHRpb24oZm9ybTogYW55KTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFRyeSB0byBmaW5kIGEgbGVnZW5kIG9yIGhlYWRpbmcgd2l0aGluIHRoZSBmb3JtXHJcbiAgICAgIGNvbnN0IGxlZ2VuZCA9IGF3YWl0IGZvcm0ubG9jYXRvcignbGVnZW5kJykuZmlyc3QoKS50ZXh0Q29udGVudCgpLmNhdGNoKCgpID0+IG51bGwpO1xyXG4gICAgICBpZiAobGVnZW5kPy50cmltKCkpIHJldHVybiBsZWdlbmQudHJpbSgpO1xyXG5cclxuICAgICAgY29uc3QgaGVhZGluZyA9IGF3YWl0IGZvcm0ubG9jYXRvcignaDEsIGgyLCBoMywgaDQsIGg1LCBoNicpLmZpcnN0KCkudGV4dENvbnRlbnQoKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgaWYgKGhlYWRpbmc/LnRyaW0oKSkgcmV0dXJuIGhlYWRpbmcudHJpbSgpO1xyXG5cclxuICAgICAgLy8gVHJ5IHRvIGZpbmQgYSBsYWJlbCBvciBhcmlhLWxhYmVsXHJcbiAgICAgIGNvbnN0IGFyaWFMYWJlbCA9IGF3YWl0IGZvcm0uZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJykuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgIGlmIChhcmlhTGFiZWw/LnRyaW0oKSkgcmV0dXJuIGFyaWFMYWJlbC50cmltKCk7XHJcblxyXG4gICAgICByZXR1cm4gJ0Zvcm0nO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuICdGb3JtJztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVjdCBuYXZpZ2F0aW9uIHBhdHRlcm5zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBkZXRlY3ROYXZpZ2F0aW9uKHBhZ2U6IFBhZ2UsIGVsZW1lbnRzOiBJZGVudGlmaWVkRWxlbWVudFtdKTogUHJvbWlzZTxVSVBhdHRlcm5bXT4ge1xyXG4gICAgY29uc3QgcGF0dGVybnM6IFVJUGF0dGVybltdID0gW107XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgbmF2cyA9IGF3YWl0IHBhZ2UubG9jYXRvcignbmF2LCBbcm9sZT1cIm5hdmlnYXRpb25cIl0nKS5hbGwoKTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgbmF2IG9mIG5hdnMpIHtcclxuICAgICAgICBjb25zdCBpc1Zpc2libGUgPSBhd2FpdCBuYXYuaXNWaXNpYmxlKCkuY2F0Y2goKCkgPT4gZmFsc2UpO1xyXG4gICAgICAgIGlmICghaXNWaXNpYmxlKSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgLy8gRmluZCBsaW5rcyB3aXRoaW4gdGhpcyBuYXZpZ2F0aW9uXHJcbiAgICAgICAgY29uc3QgbmF2TGlua3MgPSBhd2FpdCB0aGlzLmdldE5hdmlnYXRpb25MaW5rcyhuYXYsIGVsZW1lbnRzKTtcclxuXHJcbiAgICAgICAgaWYgKG5hdkxpbmtzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGNvbnN0IGRlc2NyaXB0aW9uID0gYXdhaXQgbmF2LmdldEF0dHJpYnV0ZSgnYXJpYS1sYWJlbCcpLmNhdGNoKCgpID0+IG51bGwpIHx8ICdOYXZpZ2F0aW9uIG1lbnUnO1xyXG5cclxuICAgICAgICAgIHBhdHRlcm5zLnB1c2goe1xyXG4gICAgICAgICAgICB0eXBlOiAnbmF2aWdhdGlvbicsXHJcbiAgICAgICAgICAgIGVsZW1lbnRzOiBuYXZMaW5rcyxcclxuICAgICAgICAgICAgZGVzY3JpcHRpb24sXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRXJyb3IgZGV0ZWN0aW5nIG5hdmlnYXRpb246JywgZXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwYXR0ZXJucztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBsaW5rcyB3aXRoaW4gYSBuYXZpZ2F0aW9uIGVsZW1lbnRcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGdldE5hdmlnYXRpb25MaW5rcyhuYXY6IGFueSwgYWxsRWxlbWVudHM6IElkZW50aWZpZWRFbGVtZW50W10pOiBQcm9taXNlPElkZW50aWZpZWRFbGVtZW50W10+IHtcclxuICAgIGNvbnN0IG5hdkxpbmtzOiBJZGVudGlmaWVkRWxlbWVudFtdID0gW107XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgbGlua3MgPSBhd2FpdCBuYXYubG9jYXRvcignYVtocmVmXScpLmFsbCgpO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBsaW5rIG9mIGxpbmtzKSB7XHJcbiAgICAgICAgY29uc3QgaHJlZiA9IGF3YWl0IGxpbmsuZ2V0QXR0cmlidXRlKCdocmVmJykuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGxpbmsudGV4dENvbnRlbnQoKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuXHJcbiAgICAgICAgLy8gTWF0Y2ggd2l0aCBpZGVudGlmaWVkIGVsZW1lbnRzXHJcbiAgICAgICAgY29uc3QgbWF0Y2hlZEVsZW1lbnQgPSBhbGxFbGVtZW50cy5maW5kKGVsID0+IFxyXG4gICAgICAgICAgZWwudHlwZSA9PT0gJ2xpbmsnICYmXHJcbiAgICAgICAgICAoKGhyZWYgJiYgZWwuYXR0cmlidXRlcy50ZXh0ID09PSB0ZXh0Py50cmltKCkpIHx8XHJcbiAgICAgICAgICAgKHRleHQgJiYgZWwuYXR0cmlidXRlcy50ZXh0ID09PSB0ZXh0LnRyaW0oKSkpXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgaWYgKG1hdGNoZWRFbGVtZW50KSB7XHJcbiAgICAgICAgICBuYXZMaW5rcy5wdXNoKG1hdGNoZWRFbGVtZW50KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRXJyb3IgZ2V0dGluZyBuYXZpZ2F0aW9uIGxpbmtzOicsIGVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbmF2TGlua3M7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXRlY3QgbW9kYWwgcGF0dGVybnNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGRldGVjdE1vZGFscyhwYWdlOiBQYWdlLCBlbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXSk6IFByb21pc2U8VUlQYXR0ZXJuW10+IHtcclxuICAgIGNvbnN0IHBhdHRlcm5zOiBVSVBhdHRlcm5bXSA9IFtdO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG1vZGFscyA9IGF3YWl0IHBhZ2UubG9jYXRvcignW3JvbGU9XCJkaWFsb2dcIl0sIC5tb2RhbCwgW2FyaWEtbW9kYWw9XCJ0cnVlXCJdJykuYWxsKCk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IG1vZGFsIG9mIG1vZGFscykge1xyXG4gICAgICAgIGNvbnN0IGlzVmlzaWJsZSA9IGF3YWl0IG1vZGFsLmlzVmlzaWJsZSgpLmNhdGNoKCgpID0+IGZhbHNlKTtcclxuICAgICAgICBpZiAoIWlzVmlzaWJsZSkgY29udGludWU7XHJcblxyXG4gICAgICAgIC8vIEZpbmQgaW50ZXJhY3RpdmUgZWxlbWVudHMgd2l0aGluIHRoZSBtb2RhbFxyXG4gICAgICAgIGNvbnN0IG1vZGFsRWxlbWVudHMgPSBhd2FpdCB0aGlzLmdldE1vZGFsRWxlbWVudHMobW9kYWwsIGVsZW1lbnRzKTtcclxuXHJcbiAgICAgICAgaWYgKG1vZGFsRWxlbWVudHMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBhd2FpdCBtb2RhbC5nZXRBdHRyaWJ1dGUoJ2FyaWEtbGFiZWwnKS5jYXRjaCgoKSA9PiBudWxsKSB8fCAnTW9kYWwgZGlhbG9nJztcclxuXHJcbiAgICAgICAgICBwYXR0ZXJucy5wdXNoKHtcclxuICAgICAgICAgICAgdHlwZTogJ21vZGFsJyxcclxuICAgICAgICAgICAgZWxlbWVudHM6IG1vZGFsRWxlbWVudHMsXHJcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGRldGVjdGluZyBtb2RhbHM6JywgZXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwYXR0ZXJucztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBlbGVtZW50cyB3aXRoaW4gYSBtb2RhbFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZ2V0TW9kYWxFbGVtZW50cyhtb2RhbDogYW55LCBhbGxFbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXSk6IFByb21pc2U8SWRlbnRpZmllZEVsZW1lbnRbXT4ge1xyXG4gICAgY29uc3QgbW9kYWxFbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXSA9IFtdO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGludGVyYWN0aXZlRWxlbWVudHMgPSBhd2FpdCBtb2RhbC5sb2NhdG9yKCdidXR0b24sIGEsIGlucHV0LCBzZWxlY3QsIHRleHRhcmVhJykuYWxsKCk7XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgaW50ZXJhY3RpdmVFbGVtZW50cykge1xyXG4gICAgICAgIGNvbnN0IGlkID0gYXdhaXQgZWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2lkJykuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGVsZW1lbnQudGV4dENvbnRlbnQoKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuXHJcbiAgICAgICAgLy8gTWF0Y2ggd2l0aCBpZGVudGlmaWVkIGVsZW1lbnRzXHJcbiAgICAgICAgY29uc3QgbWF0Y2hlZEVsZW1lbnQgPSBhbGxFbGVtZW50cy5maW5kKGVsID0+IFxyXG4gICAgICAgICAgKGlkICYmIGVsLmF0dHJpYnV0ZXMuaWQgPT09IGlkKSB8fFxyXG4gICAgICAgICAgKHRleHQgJiYgZWwuYXR0cmlidXRlcy50ZXh0ID09PSB0ZXh0Py50cmltKCkpXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgaWYgKG1hdGNoZWRFbGVtZW50KSB7XHJcbiAgICAgICAgICBtb2RhbEVsZW1lbnRzLnB1c2gobWF0Y2hlZEVsZW1lbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdFcnJvciBnZXR0aW5nIG1vZGFsIGVsZW1lbnRzOicsIGVycm9yKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gbW9kYWxFbGVtZW50cztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVjdCB0YWJsZSBwYXR0ZXJuc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZGV0ZWN0VGFibGVzKHBhZ2U6IFBhZ2UsIGVsZW1lbnRzOiBJZGVudGlmaWVkRWxlbWVudFtdKTogUHJvbWlzZTxVSVBhdHRlcm5bXT4ge1xyXG4gICAgY29uc3QgcGF0dGVybnM6IFVJUGF0dGVybltdID0gW107XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdGFibGVzID0gYXdhaXQgcGFnZS5sb2NhdG9yKCd0YWJsZSwgW3JvbGU9XCJ0YWJsZVwiXScpLmFsbCgpO1xyXG5cclxuICAgICAgZm9yIChjb25zdCB0YWJsZSBvZiB0YWJsZXMpIHtcclxuICAgICAgICBjb25zdCBpc1Zpc2libGUgPSBhd2FpdCB0YWJsZS5pc1Zpc2libGUoKS5jYXRjaCgoKSA9PiBmYWxzZSk7XHJcbiAgICAgICAgaWYgKCFpc1Zpc2libGUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAvLyBGaW5kIGludGVyYWN0aXZlIGVsZW1lbnRzIHdpdGhpbiB0aGUgdGFibGUgKGJ1dHRvbnMsIGxpbmtzKVxyXG4gICAgICAgIGNvbnN0IHRhYmxlRWxlbWVudHMgPSBhd2FpdCB0aGlzLmdldFRhYmxlRWxlbWVudHModGFibGUsIGVsZW1lbnRzKTtcclxuXHJcbiAgICAgICAgLy8gR2V0IHRhYmxlIGRlc2NyaXB0aW9uIGZyb20gY2FwdGlvbiBvciBhcmlhLWxhYmVsXHJcbiAgICAgICAgY29uc3QgY2FwdGlvbiA9IGF3YWl0IHRhYmxlLmxvY2F0b3IoJ2NhcHRpb24nKS5maXJzdCgpLnRleHRDb250ZW50KCkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgY29uc3QgYXJpYUxhYmVsID0gYXdhaXQgdGFibGUuZ2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJykuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgY29uc3QgZGVzY3JpcHRpb24gPSBjYXB0aW9uPy50cmltKCkgfHwgYXJpYUxhYmVsPy50cmltKCkgfHwgJ0RhdGEgdGFibGUnO1xyXG5cclxuICAgICAgICBwYXR0ZXJucy5wdXNoKHtcclxuICAgICAgICAgIHR5cGU6ICd0YWJsZScsXHJcbiAgICAgICAgICBlbGVtZW50czogdGFibGVFbGVtZW50cyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGRldGVjdGluZyB0YWJsZXM6JywgZXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBwYXR0ZXJucztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBpbnRlcmFjdGl2ZSBlbGVtZW50cyB3aXRoaW4gYSB0YWJsZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZ2V0VGFibGVFbGVtZW50cyh0YWJsZTogYW55LCBhbGxFbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXSk6IFByb21pc2U8SWRlbnRpZmllZEVsZW1lbnRbXT4ge1xyXG4gICAgY29uc3QgdGFibGVFbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXSA9IFtdO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGludGVyYWN0aXZlRWxlbWVudHMgPSBhd2FpdCB0YWJsZS5sb2NhdG9yKCdidXR0b24sIGEnKS5hbGwoKTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBpbnRlcmFjdGl2ZUVsZW1lbnRzKSB7XHJcbiAgICAgICAgY29uc3QgaWQgPSBhd2FpdCBlbGVtZW50LmdldEF0dHJpYnV0ZSgnaWQnKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICBjb25zdCB0ZXh0ID0gYXdhaXQgZWxlbWVudC50ZXh0Q29udGVudCgpLmNhdGNoKCgpID0+IG51bGwpO1xyXG5cclxuICAgICAgICAvLyBNYXRjaCB3aXRoIGlkZW50aWZpZWQgZWxlbWVudHNcclxuICAgICAgICBjb25zdCBtYXRjaGVkRWxlbWVudCA9IGFsbEVsZW1lbnRzLmZpbmQoZWwgPT4gXHJcbiAgICAgICAgICAoaWQgJiYgZWwuYXR0cmlidXRlcy5pZCA9PT0gaWQpIHx8XHJcbiAgICAgICAgICAodGV4dCAmJiBlbC5hdHRyaWJ1dGVzLnRleHQgPT09IHRleHQ/LnRyaW0oKSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBpZiAobWF0Y2hlZEVsZW1lbnQpIHtcclxuICAgICAgICAgIHRhYmxlRWxlbWVudHMucHVzaChtYXRjaGVkRWxlbWVudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGdldHRpbmcgdGFibGUgZWxlbWVudHM6JywgZXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0YWJsZUVsZW1lbnRzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSWRlbnRpZnkgcG90ZW50aWFsIHVzZXIgZmxvd3NcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGlkZW50aWZ5VXNlckZsb3dzKFxyXG4gICAgcGFnZTogUGFnZSxcclxuICAgIGVsZW1lbnRzOiBJZGVudGlmaWVkRWxlbWVudFtdXHJcbiAgKTogUHJvbWlzZTxVc2VyRmxvd1tdPiB7XHJcbiAgICBjb25zdCBmbG93czogVXNlckZsb3dbXSA9IFtdO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIElkZW50aWZ5IGZvcm0gc3VibWlzc2lvbiBmbG93c1xyXG4gICAgICBjb25zdCBmb3JtRmxvd3MgPSBhd2FpdCB0aGlzLmlkZW50aWZ5Rm9ybUZsb3dzKHBhZ2UsIGVsZW1lbnRzKTtcclxuICAgICAgZmxvd3MucHVzaCguLi5mb3JtRmxvd3MpO1xyXG5cclxuICAgICAgLy8gSWRlbnRpZnkgbmF2aWdhdGlvbiBmbG93c1xyXG4gICAgICBjb25zdCBuYXZpZ2F0aW9uRmxvd3MgPSBhd2FpdCB0aGlzLmlkZW50aWZ5TmF2aWdhdGlvbkZsb3dzKGVsZW1lbnRzKTtcclxuICAgICAgZmxvd3MucHVzaCguLi5uYXZpZ2F0aW9uRmxvd3MpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYElkZW50aWZpZWQgJHtmb3JtRmxvd3MubGVuZ3RofSBmb3JtIGZsb3dzIGFuZCAke25hdmlnYXRpb25GbG93cy5sZW5ndGh9IG5hdmlnYXRpb24gZmxvd3NgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRXJyb3IgaWRlbnRpZnlpbmcgdXNlciBmbG93czonLCBlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZsb3dzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSWRlbnRpZnkgZm9ybSBzdWJtaXNzaW9uIGZsb3dzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBpZGVudGlmeUZvcm1GbG93cyhwYWdlOiBQYWdlLCBlbGVtZW50czogSWRlbnRpZmllZEVsZW1lbnRbXSk6IFByb21pc2U8VXNlckZsb3dbXT4ge1xyXG4gICAgY29uc3QgZmxvd3M6IFVzZXJGbG93W10gPSBbXTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBmb3JtcyA9IGF3YWl0IHBhZ2UubG9jYXRvcignZm9ybScpLmFsbCgpO1xyXG5cclxuICAgICAgZm9yIChjb25zdCBmb3JtIG9mIGZvcm1zKSB7XHJcbiAgICAgICAgY29uc3QgaXNWaXNpYmxlID0gYXdhaXQgZm9ybS5pc1Zpc2libGUoKS5jYXRjaCgoKSA9PiBmYWxzZSk7XHJcbiAgICAgICAgaWYgKCFpc1Zpc2libGUpIGNvbnRpbnVlO1xyXG5cclxuICAgICAgICAvLyBGaW5kIHRoZSBzdWJtaXQgYnV0dG9uXHJcbiAgICAgICAgY29uc3Qgc3VibWl0QnV0dG9uID0gYXdhaXQgZm9ybS5sb2NhdG9yKCdidXR0b25bdHlwZT1cInN1Ym1pdFwiXSwgaW5wdXRbdHlwZT1cInN1Ym1pdFwiXScpLmZpcnN0KCk7XHJcbiAgICAgICAgY29uc3Qgc3VibWl0QnV0dG9uVmlzaWJsZSA9IGF3YWl0IHN1Ym1pdEJ1dHRvbi5pc1Zpc2libGUoKS5jYXRjaCgoKSA9PiBmYWxzZSk7XHJcblxyXG4gICAgICAgIGlmICghc3VibWl0QnV0dG9uVmlzaWJsZSkgY29udGludWU7XHJcblxyXG4gICAgICAgIC8vIEdldCBmb3JtIGlucHV0c1xyXG4gICAgICAgIGNvbnN0IGlucHV0cyA9IGF3YWl0IGZvcm0ubG9jYXRvcignaW5wdXQ6bm90KFt0eXBlPVwic3VibWl0XCJdKTpub3QoW3R5cGU9XCJidXR0b25cIl0pLCBzZWxlY3QsIHRleHRhcmVhJykuYWxsKCk7XHJcbiAgICAgICAgY29uc3Qgc3RlcHM6IHN0cmluZ1tdID0gW107XHJcblxyXG4gICAgICAgIC8vIEJ1aWxkIGZsb3cgc3RlcHNcclxuICAgICAgICBmb3IgKGNvbnN0IGlucHV0IG9mIGlucHV0cykge1xyXG4gICAgICAgICAgY29uc3QgdHlwZSA9IGF3YWl0IGlucHV0LmdldEF0dHJpYnV0ZSgndHlwZScpLmNhdGNoKCgpID0+ICd0ZXh0Jyk7XHJcbiAgICAgICAgICBjb25zdCBuYW1lID0gYXdhaXQgaW5wdXQuZ2V0QXR0cmlidXRlKCduYW1lJykuY2F0Y2goKCkgPT4gbnVsbCk7XHJcbiAgICAgICAgICBjb25zdCBwbGFjZWhvbGRlciA9IGF3YWl0IGlucHV0LmdldEF0dHJpYnV0ZSgncGxhY2Vob2xkZXInKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICAgIGNvbnN0IGxhYmVsID0gbmFtZSB8fCBwbGFjZWhvbGRlciB8fCAnZmllbGQnO1xyXG5cclxuICAgICAgICAgIHN0ZXBzLnB1c2goYEZpbGwgJHtsYWJlbH1gKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEFkZCBzdWJtaXQgc3RlcFxyXG4gICAgICAgIGNvbnN0IHN1Ym1pdFRleHQgPSBhd2FpdCBzdWJtaXRCdXR0b24udGV4dENvbnRlbnQoKS5jYXRjaCgoKSA9PiAnU3VibWl0Jyk7XHJcbiAgICAgICAgc3RlcHMucHVzaChgQ2xpY2sgJHtzdWJtaXRUZXh0Py50cmltKCkgfHwgJ1N1Ym1pdCd9YCk7XHJcblxyXG4gICAgICAgIC8vIEZpbmQgdGhlIHN1Ym1pdCBidXR0b24gaW4gaWRlbnRpZmllZCBlbGVtZW50cyBhcyBlbnRyeSBwb2ludFxyXG4gICAgICAgIGNvbnN0IHN1Ym1pdElkID0gYXdhaXQgc3VibWl0QnV0dG9uLmdldEF0dHJpYnV0ZSgnaWQnKS5jYXRjaCgoKSA9PiBudWxsKTtcclxuICAgICAgICBjb25zdCBzdWJtaXRCdXR0b25UZXh0ID0gYXdhaXQgc3VibWl0QnV0dG9uLnRleHRDb250ZW50KCkuY2F0Y2goKCkgPT4gbnVsbCk7XHJcblxyXG4gICAgICAgIGNvbnN0IGVudHJ5UG9pbnQgPSBlbGVtZW50cy5maW5kKGVsID0+IFxyXG4gICAgICAgICAgZWwudHlwZSA9PT0gJ2J1dHRvbicgJiZcclxuICAgICAgICAgICgoc3VibWl0SWQgJiYgZWwuYXR0cmlidXRlcy5pZCA9PT0gc3VibWl0SWQpIHx8XHJcbiAgICAgICAgICAgKHN1Ym1pdEJ1dHRvblRleHQgJiYgZWwuYXR0cmlidXRlcy50ZXh0ID09PSBzdWJtaXRCdXR0b25UZXh0Py50cmltKCkpKVxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIGlmIChlbnRyeVBvaW50ICYmIHN0ZXBzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIC8vIEdldCBmb3JtIGRlc2NyaXB0aW9uXHJcbiAgICAgICAgICBjb25zdCBmb3JtRGVzY3JpcHRpb24gPSBhd2FpdCB0aGlzLmdldEZvcm1EZXNjcmlwdGlvbihmb3JtKTtcclxuXHJcbiAgICAgICAgICBmbG93cy5wdXNoKHtcclxuICAgICAgICAgICAgbmFtZTogYCR7Zm9ybURlc2NyaXB0aW9ufSBzdWJtaXNzaW9uYCxcclxuICAgICAgICAgICAgc3RlcHMsXHJcbiAgICAgICAgICAgIGVudHJ5UG9pbnQsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRXJyb3IgaWRlbnRpZnlpbmcgZm9ybSBmbG93czonLCBlcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGZsb3dzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSWRlbnRpZnkgbmF2aWdhdGlvbiBmbG93c1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgaWRlbnRpZnlOYXZpZ2F0aW9uRmxvd3MoZWxlbWVudHM6IElkZW50aWZpZWRFbGVtZW50W10pOiBQcm9taXNlPFVzZXJGbG93W10+IHtcclxuICAgIGNvbnN0IGZsb3dzOiBVc2VyRmxvd1tdID0gW107XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR3JvdXAgbGlua3MgYnkgY29tbW9uIHBhdHRlcm5zIChlLmcuLCBuYXZpZ2F0aW9uIG1lbnVzKVxyXG4gICAgICBjb25zdCBsaW5rcyA9IGVsZW1lbnRzLmZpbHRlcihlbCA9PiBlbC50eXBlID09PSAnbGluaycpO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGZsb3dzIGZvciBwcm9taW5lbnQgbmF2aWdhdGlvbiBsaW5rc1xyXG4gICAgICBmb3IgKGNvbnN0IGxpbmsgb2YgbGlua3MpIHtcclxuICAgICAgICBjb25zdCB0ZXh0ID0gbGluay5hdHRyaWJ1dGVzLnRleHQ7XHJcbiAgICAgICAgaWYgKCF0ZXh0KSBjb250aW51ZTtcclxuXHJcbiAgICAgICAgLy8gU2tpcCBmb290ZXIgbGlua3MsIHNvY2lhbCBtZWRpYSBsaW5rcywgZXRjLlxyXG4gICAgICAgIGNvbnN0IHNraXBQYXR0ZXJucyA9IFsnZmFjZWJvb2snLCAndHdpdHRlcicsICdsaW5rZWRpbicsICdpbnN0YWdyYW0nLCAneW91dHViZScsICdwcml2YWN5JywgJ3Rlcm1zJywgJ2Nvb2tpZSddO1xyXG4gICAgICAgIGlmIChza2lwUGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHRleHQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhwYXR0ZXJuKSkpIHtcclxuICAgICAgICAgIGNvbnRpbnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gQ3JlYXRlIGEgc2ltcGxlIG5hdmlnYXRpb24gZmxvd1xyXG4gICAgICAgIGZsb3dzLnB1c2goe1xyXG4gICAgICAgICAgbmFtZTogYE5hdmlnYXRlIHRvICR7dGV4dH1gLFxyXG4gICAgICAgICAgc3RlcHM6IFtgQ2xpY2sgJHt0ZXh0fSBsaW5rYF0sXHJcbiAgICAgICAgICBlbnRyeVBvaW50OiBsaW5rLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBMaW1pdCB0byB0b3AgMTAgbmF2aWdhdGlvbiBmbG93cyB0byBhdm9pZCBvdmVyd2hlbG1pbmcgdGhlIEFJXHJcbiAgICAgIHJldHVybiBmbG93cy5zbGljZSgwLCAxMCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ0Vycm9yIGlkZW50aWZ5aW5nIG5hdmlnYXRpb24gZmxvd3M6JywgZXJyb3IpO1xyXG4gICAgICByZXR1cm4gW107XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYXB0dXJlIHBhZ2UgbWV0YWRhdGFcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNhcHR1cmVNZXRhZGF0YShcclxuICAgIHBhZ2U6IFBhZ2UsXHJcbiAgICBzdGFydFRpbWU6IG51bWJlclxyXG4gICk6IFByb21pc2U8UGFnZU1ldGFkYXRhPiB7XHJcbiAgICBjb25zdCB2aWV3cG9ydCA9IHBhZ2Uudmlld3BvcnRTaXplKCkgfHwgeyB3aWR0aDogMTI4MCwgaGVpZ2h0OiA3MjAgfTtcclxuICAgIGNvbnN0IGxvYWRUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuXHJcbiAgICAvLyBEZXRlY3QgaWYgdGhlIHBhZ2UgaXMgYSBTaW5nbGUgUGFnZSBBcHBsaWNhdGlvbiAoU1BBKVxyXG4gICAgY29uc3QgaXNTUEEgPSBhd2FpdCB0aGlzLmRldGVjdFNQQShwYWdlKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2aWV3cG9ydCxcclxuICAgICAgbG9hZFRpbWUsXHJcbiAgICAgIGlzU1BBLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVjdCBpZiB0aGUgcGFnZSBpcyBhIFNpbmdsZSBQYWdlIEFwcGxpY2F0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBkZXRlY3RTUEEocGFnZTogUGFnZSk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2hlY2sgZm9yIGNvbW1vbiBTUEEgZnJhbWV3b3JrcyBhbmQgcGF0dGVybnNcclxuICAgICAgLy8gQHRzLWlnbm9yZSAtIEJyb3dzZXIgY29udGV4dCBoYXMgd2luZG93IGFuZCBkb2N1bWVudFxyXG4gICAgICBjb25zdCBzcGFJbmRpY2F0b3JzID0gYXdhaXQgcGFnZS5ldmFsdWF0ZSgoKSA9PiB7XHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSAtIHdpbmRvdyBleGlzdHMgaW4gYnJvd3NlciBjb250ZXh0XHJcbiAgICAgICAgY29uc3Qgd2luID0gd2luZG93IGFzIGFueTtcclxuICAgICAgICAvLyBAdHMtaWdub3JlIC0gZG9jdW1lbnQgZXhpc3RzIGluIGJyb3dzZXIgY29udGV4dFxyXG4gICAgICAgIGNvbnN0IGRvYyA9IGRvY3VtZW50O1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGluZGljYXRvcnMgPSB7XHJcbiAgICAgICAgICBoYXNSZWFjdFJvb3Q6ICEhd2luLlJlYWN0IHx8ICEhZG9jLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXJlYWN0cm9vdF0sIFtkYXRhLXJlYWN0aWRdJyksXHJcbiAgICAgICAgICBoYXNWdWVBcHA6ICEhd2luLlZ1ZSB8fCAhIWRvYy5xdWVyeVNlbGVjdG9yKCdbZGF0YS12LV0nKSxcclxuICAgICAgICAgIGhhc0FuZ3VsYXJBcHA6ICEhd2luLmFuZ3VsYXIgfHwgISF3aW4ubmcgfHwgISFkb2MucXVlcnlTZWxlY3RvcignW25nLWFwcF0sIFtuZy12ZXJzaW9uXScpLFxyXG4gICAgICAgICAgaGFzU3ZlbHRlQXBwOiAhIWRvYy5xdWVyeVNlbGVjdG9yKCdbZGF0YS1zdmVsdGVdJyksXHJcbiAgICAgICAgICBoYXNIaXN0b3J5QVBJOiAhISh3aW4uaGlzdG9yeSAmJiB3aW4uaGlzdG9yeS5wdXNoU3RhdGUpLFxyXG4gICAgICAgICAgaGFzSGFzaFJvdXRpbmc6IHdpbi5sb2NhdGlvbi5oYXNoLmxlbmd0aCA+IDEsXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcmV0dXJuIGluZGljYXRvcnM7XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQ29uc2lkZXIgaXQgYW4gU1BBIGlmIGl0IGhhcyBmcmFtZXdvcmsgaW5kaWNhdG9ycyBvciB1c2VzIGhpc3RvcnkgQVBJXHJcbiAgICAgIHJldHVybiAoXHJcbiAgICAgICAgc3BhSW5kaWNhdG9ycy5oYXNSZWFjdFJvb3QgfHxcclxuICAgICAgICBzcGFJbmRpY2F0b3JzLmhhc1Z1ZUFwcCB8fFxyXG4gICAgICAgIHNwYUluZGljYXRvcnMuaGFzQW5ndWxhckFwcCB8fFxyXG4gICAgICAgIHNwYUluZGljYXRvcnMuaGFzU3ZlbHRlQXBwIHx8XHJcbiAgICAgICAgKHNwYUluZGljYXRvcnMuaGFzSGlzdG9yeUFQSSAmJiBzcGFJbmRpY2F0b3JzLmhhc0hhc2hSb3V0aW5nKVxyXG4gICAgICApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdFcnJvciBkZXRlY3RpbmcgU1BBOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgYXBwbGljYXRpb25BbmFseXplciA9IEFwcGxpY2F0aW9uQW5hbHl6ZXIuZ2V0SW5zdGFuY2UoKTtcclxuIl19