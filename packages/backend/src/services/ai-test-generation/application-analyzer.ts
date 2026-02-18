/**
 * Application Analyzer Service
 * Examines web pages to identify testable elements and user flows
 */

import { Page } from 'playwright-core';
import { browserService, BrowserSession } from '../browser-service';
import {
  ApplicationAnalysis,
  AnalysisOptions,
  IdentifiedElement,
  UIPattern,
  UserFlow,
  PageMetadata,
} from '../../types/ai-test-generation';

export class ApplicationAnalyzer {
  private static instance: ApplicationAnalyzer;

  private constructor() {}

  public static getInstance(): ApplicationAnalyzer {
    if (!ApplicationAnalyzer.instance) {
      ApplicationAnalyzer.instance = new ApplicationAnalyzer();
    }
    return ApplicationAnalyzer.instance;
  }

  /**
   * Analyze a web page to identify testable elements and user flows
   */
  public async analyze(
    url: string,
    options?: AnalysisOptions
  ): Promise<ApplicationAnalysis> {
    let session: BrowserSession | null = null;
    const startTime = Date.now();

    try {
      console.log(`Starting analysis of ${url}`);

      // Initialize browser session
      session = await browserService.initializeBrowser();
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

      const analysis: ApplicationAnalysis = {
        url,
        title,
        elements,
        patterns,
        flows,
        metadata,
      };

      console.log(`Analysis completed successfully`);
      return analysis;
    } catch (error) {
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
    } finally {
      // Clean up browser resources
      if (session) {
        await browserService.forceCleanup();
      }
    }
  }

  /**
   * Identify interactive elements on the page
   */
  private async identifyElements(page: Page): Promise<IdentifiedElement[]> {
    const elements: IdentifiedElement[] = [];

    // Define element selectors for different types
    const elementSelectors = [
      { type: 'button' as const, selector: 'button, input[type="button"], input[type="submit"], input[type="reset"]' },
      { type: 'link' as const, selector: 'a[href]' },
      { type: 'input' as const, selector: 'input:not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="checkbox"]):not([type="radio"])' },
      { type: 'select' as const, selector: 'select' },
      { type: 'textarea' as const, selector: 'textarea' },
      { type: 'checkbox' as const, selector: 'input[type="checkbox"]' },
      { type: 'radio' as const, selector: 'input[type="radio"]' },
    ];

    // Extract elements for each type
    for (const { type, selector } of elementSelectors) {
      const locators = await page.locator(selector).all();

      for (const locator of locators) {
        try {
          // Check if element is visible (skip hidden elements)
          const isVisible = await locator.isVisible().catch(() => false);
          if (!isVisible) continue;

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
          if (!elementHandle) continue;

          const cssPath = await this.generateCSSPath(page, elementHandle);
          const xpath = await this.generateXPath(page, elementHandle);

          // Build attributes object (only include non-null values)
          const attributes: IdentifiedElement['attributes'] = {};
          if (id) attributes.id = id;
          if (className) attributes.class = className;
          if (name) attributes.name = name;
          if (ariaLabel) attributes['aria-label'] = ariaLabel;
          if (dataTestId) attributes['data-testid'] = dataTestId;
          if (placeholder) attributes.placeholder = placeholder;
          if (text?.trim()) attributes.text = text.trim();

          elements.push({
            type,
            attributes,
            xpath,
            cssPath,
          });
        } catch (error) {
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
  private async generateCSSPath(page: Page, element: any): Promise<string> {
    try {
      // @ts-ignore - Browser context has DOM types
      const path = await page.evaluate((el) => {
        const parts: string[] = [];
        let current = el as Element | null;

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
            const classes = current.className.trim().split(/\s+/).filter((c: string) => c);
            if (classes.length > 0) {
              selector += `.${classes.join('.')}`;
            }
          }

          // Add nth-child if needed for uniqueness
          if (current.parentElement) {
            const siblings = Array.from(current.parentElement.children);
            const sameTagSiblings = siblings.filter((s: Element) => s.tagName === current!.tagName);
            if (sameTagSiblings.length > 1) {
              const index = sameTagSiblings.indexOf(current) + 1;
              selector += `:nth-of-type(${index})`;
            }
          }

          parts.unshift(selector);
          current = current.parentElement;

          // Limit depth to avoid overly long selectors
          if (parts.length >= 5) break;
        }

        return parts.join(' > ');
      }, element);

      return path;
    } catch (error) {
      console.warn('Failed to generate CSS path:', error);
      return '';
    }
  }

  /**
   * Generate XPath for an element
   */
  private async generateXPath(page: Page, element: any): Promise<string> {
    try {
      // @ts-ignore - Browser context has DOM types
      const xpath = await page.evaluate((el) => {
        const parts: string[] = [];
        let current = el as Element | null;

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
          if (parts.length >= 5) break;
        }

        return '//' + parts.join('/');
      }, element);

      return xpath;
    } catch (error) {
      console.warn('Failed to generate XPath:', error);
      return '';
    }
  }

  /**
   * Detect common UI patterns
   */
  private async detectUIPatterns(
    page: Page,
    elements: IdentifiedElement[]
  ): Promise<UIPattern[]> {
    const patterns: UIPattern[] = [];

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
    } catch (error) {
      console.warn('Error detecting UI patterns:', error);
    }

    return patterns;
  }

  /**
   * Detect form patterns
   */
  private async detectForms(page: Page, elements: IdentifiedElement[]): Promise<UIPattern[]> {
    const patterns: UIPattern[] = [];

    try {
      const forms = await page.locator('form').all();

      for (const form of forms) {
        const isVisible = await form.isVisible().catch(() => false);
        if (!isVisible) continue;

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
    } catch (error) {
      console.warn('Error detecting forms:', error);
    }

    return patterns;
  }

  /**
   * Get elements within a form
   */
  private async getFormElements(form: any, allElements: IdentifiedElement[]): Promise<IdentifiedElement[]> {
    const formElements: IdentifiedElement[] = [];

    try {
      // Get all input, select, textarea, and button elements within the form
      const inputs = await form.locator('input, select, textarea, button').all();

      for (const input of inputs) {
        const name = await input.getAttribute('name').catch(() => null);
        const id = await input.getAttribute('id').catch(() => null);

        // Match with identified elements
        const matchedElement = allElements.find(el => 
          (name && el.attributes.name === name) ||
          (id && el.attributes.id === id)
        );

        if (matchedElement) {
          formElements.push(matchedElement);
        }
      }
    } catch (error) {
      console.warn('Error getting form elements:', error);
    }

    return formElements;
  }

  /**
   * Get form description
   */
  private async getFormDescription(form: any): Promise<string> {
    try {
      // Try to find a legend or heading within the form
      const legend = await form.locator('legend').first().textContent().catch(() => null);
      if (legend?.trim()) return legend.trim();

      const heading = await form.locator('h1, h2, h3, h4, h5, h6').first().textContent().catch(() => null);
      if (heading?.trim()) return heading.trim();

      // Try to find a label or aria-label
      const ariaLabel = await form.getAttribute('aria-label').catch(() => null);
      if (ariaLabel?.trim()) return ariaLabel.trim();

      return 'Form';
    } catch (error) {
      return 'Form';
    }
  }

  /**
   * Detect navigation patterns
   */
  private async detectNavigation(page: Page, elements: IdentifiedElement[]): Promise<UIPattern[]> {
    const patterns: UIPattern[] = [];

    try {
      const navs = await page.locator('nav, [role="navigation"]').all();

      for (const nav of navs) {
        const isVisible = await nav.isVisible().catch(() => false);
        if (!isVisible) continue;

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
    } catch (error) {
      console.warn('Error detecting navigation:', error);
    }

    return patterns;
  }

  /**
   * Get links within a navigation element
   */
  private async getNavigationLinks(nav: any, allElements: IdentifiedElement[]): Promise<IdentifiedElement[]> {
    const navLinks: IdentifiedElement[] = [];

    try {
      const links = await nav.locator('a[href]').all();

      for (const link of links) {
        const href = await link.getAttribute('href').catch(() => null);
        const text = await link.textContent().catch(() => null);

        // Match with identified elements
        const matchedElement = allElements.find(el => 
          el.type === 'link' &&
          ((href && el.attributes.text === text?.trim()) ||
           (text && el.attributes.text === text.trim()))
        );

        if (matchedElement) {
          navLinks.push(matchedElement);
        }
      }
    } catch (error) {
      console.warn('Error getting navigation links:', error);
    }

    return navLinks;
  }

  /**
   * Detect modal patterns
   */
  private async detectModals(page: Page, elements: IdentifiedElement[]): Promise<UIPattern[]> {
    const patterns: UIPattern[] = [];

    try {
      const modals = await page.locator('[role="dialog"], .modal, [aria-modal="true"]').all();

      for (const modal of modals) {
        const isVisible = await modal.isVisible().catch(() => false);
        if (!isVisible) continue;

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
    } catch (error) {
      console.warn('Error detecting modals:', error);
    }

    return patterns;
  }

  /**
   * Get elements within a modal
   */
  private async getModalElements(modal: any, allElements: IdentifiedElement[]): Promise<IdentifiedElement[]> {
    const modalElements: IdentifiedElement[] = [];

    try {
      const interactiveElements = await modal.locator('button, a, input, select, textarea').all();

      for (const element of interactiveElements) {
        const id = await element.getAttribute('id').catch(() => null);
        const text = await element.textContent().catch(() => null);

        // Match with identified elements
        const matchedElement = allElements.find(el => 
          (id && el.attributes.id === id) ||
          (text && el.attributes.text === text?.trim())
        );

        if (matchedElement) {
          modalElements.push(matchedElement);
        }
      }
    } catch (error) {
      console.warn('Error getting modal elements:', error);
    }

    return modalElements;
  }

  /**
   * Detect table patterns
   */
  private async detectTables(page: Page, elements: IdentifiedElement[]): Promise<UIPattern[]> {
    const patterns: UIPattern[] = [];

    try {
      const tables = await page.locator('table, [role="table"]').all();

      for (const table of tables) {
        const isVisible = await table.isVisible().catch(() => false);
        if (!isVisible) continue;

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
    } catch (error) {
      console.warn('Error detecting tables:', error);
    }

    return patterns;
  }

  /**
   * Get interactive elements within a table
   */
  private async getTableElements(table: any, allElements: IdentifiedElement[]): Promise<IdentifiedElement[]> {
    const tableElements: IdentifiedElement[] = [];

    try {
      const interactiveElements = await table.locator('button, a').all();

      for (const element of interactiveElements) {
        const id = await element.getAttribute('id').catch(() => null);
        const text = await element.textContent().catch(() => null);

        // Match with identified elements
        const matchedElement = allElements.find(el => 
          (id && el.attributes.id === id) ||
          (text && el.attributes.text === text?.trim())
        );

        if (matchedElement) {
          tableElements.push(matchedElement);
        }
      }
    } catch (error) {
      console.warn('Error getting table elements:', error);
    }

    return tableElements;
  }

  /**
   * Identify potential user flows
   */
  private async identifyUserFlows(
    page: Page,
    elements: IdentifiedElement[]
  ): Promise<UserFlow[]> {
    const flows: UserFlow[] = [];

    try {
      // Identify form submission flows
      const formFlows = await this.identifyFormFlows(page, elements);
      flows.push(...formFlows);

      // Identify navigation flows
      const navigationFlows = await this.identifyNavigationFlows(elements);
      flows.push(...navigationFlows);

      console.log(`Identified ${formFlows.length} form flows and ${navigationFlows.length} navigation flows`);
    } catch (error) {
      console.warn('Error identifying user flows:', error);
    }

    return flows;
  }

  /**
   * Identify form submission flows
   */
  private async identifyFormFlows(page: Page, elements: IdentifiedElement[]): Promise<UserFlow[]> {
    const flows: UserFlow[] = [];

    try {
      const forms = await page.locator('form').all();

      for (const form of forms) {
        const isVisible = await form.isVisible().catch(() => false);
        if (!isVisible) continue;

        // Find the submit button
        const submitButton = await form.locator('button[type="submit"], input[type="submit"]').first();
        const submitButtonVisible = await submitButton.isVisible().catch(() => false);

        if (!submitButtonVisible) continue;

        // Get form inputs
        const inputs = await form.locator('input:not([type="submit"]):not([type="button"]), select, textarea').all();
        const steps: string[] = [];

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

        const entryPoint = elements.find(el => 
          el.type === 'button' &&
          ((submitId && el.attributes.id === submitId) ||
           (submitButtonText && el.attributes.text === submitButtonText?.trim()))
        );

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
    } catch (error) {
      console.warn('Error identifying form flows:', error);
    }

    return flows;
  }

  /**
   * Identify navigation flows
   */
  private async identifyNavigationFlows(elements: IdentifiedElement[]): Promise<UserFlow[]> {
    const flows: UserFlow[] = [];

    try {
      // Group links by common patterns (e.g., navigation menus)
      const links = elements.filter(el => el.type === 'link');

      // Create flows for prominent navigation links
      for (const link of links) {
        const text = link.attributes.text;
        if (!text) continue;

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
    } catch (error) {
      console.warn('Error identifying navigation flows:', error);
      return [];
    }
  }

  /**
   * Capture page metadata
   */
  private async captureMetadata(
    page: Page,
    startTime: number
  ): Promise<PageMetadata> {
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
  private async detectSPA(page: Page): Promise<boolean> {
    try {
      // Check for common SPA frameworks and patterns
      // @ts-ignore - Browser context has window and document
      const spaIndicators = await page.evaluate(() => {
        const win = window as any;
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
      return (
        spaIndicators.hasReactRoot ||
        spaIndicators.hasVueApp ||
        spaIndicators.hasAngularApp ||
        spaIndicators.hasSvelteApp ||
        (spaIndicators.hasHistoryAPI && spaIndicators.hasHashRouting)
      );
    } catch (error) {
      console.warn('Error detecting SPA:', error);
      return false;
    }
  }
}

// Export singleton instance
export const applicationAnalyzer = ApplicationAnalyzer.getInstance();
