import { chromium, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Browser Connection Manager - Handles connectOverCDP for same browser automation
 */

export class BrowserConnectionManager {
  private browser: Browser | null = null;
  private debugPort: number = 9222;
  private isConnected: boolean = false;

  /**
   * Connect to existing browser via CDP (Chrome DevTools Protocol)
   */
  async connectToExistingBrowser(): Promise<Browser | null> {
    try {
      console.log('   🔌 Attempting to connect to existing browser via CDP...');
      console.log(`   📍 Debug port: ${this.debugPort}`);

      // Try to connect to browser on debug port
      this.browser = await chromium.connectOverCDP(`http://localhost:${this.debugPort}`);

      this.isConnected = true;
      console.log('   ✅ Successfully connected to existing browser via CDP');
      return this.browser;
    } catch (error) {
      console.log(`   ⚠️  Failed to connect via CDP: ${error}`);
      console.log('   💡 Make sure browser is running with --remote-debugging-port=9222');
      return null;
    }
  }

  /**
   * Launch browser with CDP enabled
   */
  async launchBrowserWithCDP(): Promise<Browser> {
    try {
      console.log('   🚀 Launching browser with CDP enabled...');

      this.browser = await chromium.launch({
        headless: false,
        args: [`--remote-debugging-port=${this.debugPort}`],
        slowMo: 1000,
        timeout: 120000
      });

      this.isConnected = true;
      console.log(`   ✅ Browser launched with CDP on port ${this.debugPort}`);
      return this.browser;
    } catch (error) {
      console.log(`   ❌ Failed to launch browser: ${error}`);
      throw error;
    }
  }

  /**
   * Get existing browser context or create new one
   */
  async getOrCreateContext(browser: Browser): Promise<BrowserContext> {
    try {
      const contexts = browser.contexts();

      if (contexts.length > 0) {
        console.log(`   ✅ Using existing browser context (${contexts.length} context(s) found)`);
        return contexts[0];
      } else {
        console.log('   📍 Creating new browser context...');
        const context = await browser.newContext();
        console.log('   ✅ New browser context created');
        return context;
      }
    } catch (error) {
      console.log(`   ⚠️  Error getting context: ${error}`);
      console.log('   📍 Creating new browser context...');
      return await browser.newContext();
    }
  }

  /**
   * Navigate to URL in existing page or create new page
   */
  async navigateToPage(context: BrowserContext, url: string): Promise<Page> {
    try {
      const pages = context.pages();

      if (pages.length > 0) {
        console.log(`   ✅ Using existing page (${pages.length} page(s) found)`);
        const page = pages[0];
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log(`   ✅ Navigated to: ${url}`);
        return page;
      } else {
        console.log('   📍 Creating new page...');
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        console.log(`   ✅ New page created and navigated to: ${url}`);
        return page;
      }
    } catch (error) {
      console.log(`   ⚠️  Error navigating: ${error}`);
      console.log('   📍 Creating new page...');
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return page;
    }
  }

  /**
   * Check if browser is connected
   */
  isConnectedToBrowser(): boolean {
    return this.isConnected;
  }

  /**
   * Get browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Close connection
   */
  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        this.isConnected = false;
        console.log('   ✅ Browser connection closed');
      } catch (error) {
        console.log(`   ⚠️  Error closing browser: ${error}`);
      }
    }
  }
}
