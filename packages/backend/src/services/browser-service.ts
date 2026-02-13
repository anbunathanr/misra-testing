/**
 * Browser Service for Playwright automation in AWS Lambda
 * Handles browser initialization, configuration, and cleanup
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright-core';
import chromiumPkg from '@sparticuz/chromium';

export interface BrowserSession {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

export class BrowserService {
  private static instance: BrowserService;
  private currentSession: BrowserSession | null = null;

  private constructor() {}

  public static getInstance(): BrowserService {
    if (!BrowserService.instance) {
      BrowserService.instance = new BrowserService();
    }
    return BrowserService.instance;
  }

  /**
   * Initialize a new browser session with Playwright
   * Configured for AWS Lambda environment with headless Chromium
   */
  public async initializeBrowser(): Promise<BrowserSession> {
    try {
      console.log('Initializing browser for Lambda environment...');

      // Launch Chromium with Lambda-compatible configuration
      const browser = await chromium.launch({
        args: chromiumPkg.args,
        executablePath: await chromiumPkg.executablePath(),
        headless: chromiumPkg.headless === true || chromiumPkg.headless === 'shell',
      });

      console.log('Browser launched successfully');

      // Create browser context with standard viewport
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true, // Allow self-signed certificates in test environments
      });

      console.log('Browser context created');

      // Create a new page
      const page = await context.newPage();

      console.log('Page created successfully');

      // Set default timeouts
      page.setDefaultTimeout(30000); // 30 seconds
      page.setDefaultNavigationTimeout(30000);

      this.currentSession = { browser, context, page };

      return this.currentSession;
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      throw new Error(`Browser initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get the current browser session
   * Throws error if no session is active
   */
  public getCurrentSession(): BrowserSession {
    if (!this.currentSession) {
      throw new Error('No active browser session. Call initializeBrowser() first.');
    }
    return this.currentSession;
  }

  /**
   * Check if a browser session is currently active
   */
  public hasActiveSession(): boolean {
    return this.currentSession !== null;
  }

  /**
   * Clean up browser resources
   * Closes page, context, and browser in proper order
   */
  public async cleanup(): Promise<void> {
    if (!this.currentSession) {
      console.log('No active browser session to clean up');
      return;
    }

    try {
      console.log('Starting browser cleanup...');

      const { page, context, browser } = this.currentSession;

      // Close page first
      if (page && !page.isClosed()) {
        await page.close();
        console.log('Page closed');
      }

      // Close context
      if (context) {
        await context.close();
        console.log('Context closed');
      }

      // Close browser
      if (browser && browser.isConnected()) {
        await browser.close();
        console.log('Browser closed');
      }

      this.currentSession = null;
      console.log('Browser cleanup completed successfully');
    } catch (error) {
      console.error('Error during browser cleanup:', error);
      // Still set session to null even if cleanup fails
      this.currentSession = null;
      throw new Error(`Browser cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Force cleanup - attempts cleanup without throwing errors
   * Use in finally blocks or error handlers
   */
  public async forceCleanup(): Promise<void> {
    try {
      await this.cleanup();
    } catch (error) {
      console.error('Force cleanup encountered error (suppressed):', error);
      this.currentSession = null;
    }
  }

  /**
   * Get browser version information
   */
  public async getBrowserVersion(): Promise<string> {
    if (!this.currentSession) {
      return 'No active session';
    }

    try {
      return this.currentSession.browser.version();
    } catch (error) {
      console.error('Failed to get browser version:', error);
      return 'Unknown';
    }
  }
}

// Export singleton instance
export const browserService = BrowserService.getInstance();
