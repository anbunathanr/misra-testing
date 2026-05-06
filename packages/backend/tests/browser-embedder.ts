/**
 * Browser Embedder - Proper Implementation using Chrome DevTools Protocol (CDP)
 * Connects Playwright to existing Chrome browser for same-tab navigation
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as net from 'net';

interface BrowserEmbedderConfig {
  cdpPort: number;
  cdpHost: string;
  timeout: number;
  headless: boolean;
}

/**
 * Browser Embedder using Chrome DevTools Protocol
 */
export class BrowserEmbedder {
  private config: BrowserEmbedderConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  constructor(config: Partial<BrowserEmbedderConfig> = {}) {
    this.config = {
      cdpPort: config.cdpPort || 9222,
      cdpHost: config.cdpHost || 'localhost',
      timeout: config.timeout || 30000,
      headless: config.headless || false
    };
  }

  /**
   * Check if Chrome is running with remote debugging enabled
   */
  async checkChromeAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.createConnection(
        this.config.cdpPort,
        this.config.cdpHost,
        () => {
          socket.destroy();
          resolve(true);
        }
      );

      socket.on('error', () => {
        resolve(false);
      });

      setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 2000);
    });
  }

  /**
   * Connect to existing Chrome browser via CDP
   */
  async connectToExistingBrowser(): Promise<boolean> {
    try {
      console.log(`🔌 Attempting to connect to Chrome via CDP...`);
      console.log(`   Host: ${this.config.cdpHost}`);
      console.log(`   Port: ${this.config.cdpPort}`);

      // Check if Chrome is available
      const isAvailable = await this.checkChromeAvailability();
      if (!isAvailable) {
        console.error(`❌ Chrome not found on ${this.config.cdpHost}:${this.config.cdpPort}`);
        console.error(`💡 Make sure Chrome is running with: --remote-debugging-port=${this.config.cdpPort}`);
        return false;
      }

      // Connect to existing browser
      const cdpUrl = `http://${this.config.cdpHost}:${this.config.cdpPort}`;
      this.browser = await chromium.connectOverCDP(cdpUrl);

      console.log(`✅ Successfully connected to Chrome via CDP`);
      console.log(`   Browser: ${this.browser.browserType().name()}`);

      // Get or create context
      const contexts = this.browser.contexts();
      if (contexts.length > 0) {
        this.context = contexts[0];
        console.log(`✅ Using existing browser context`);
      } else {
        this.context = await this.browser.newContext();
        console.log(`✅ Created new browser context`);
      }

      // Get or create page
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
        console.log(`✅ Using existing browser page`);
      } else {
        this.page = await this.context.newPage();
        console.log(`✅ Created new browser page`);
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to Chrome via CDP:`, error);
      return false;
    }
  }

  /**
   * Navigate to URL in the same tab
   */
  async navigateToUrl(url: string): Promise<boolean> {
    try {
      if (!this.page) {
        console.error(`❌ No page available for navigation`);
        return false;
      }

      console.log(`🌐 Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
      console.log(`✅ Successfully navigated to ${url}`);

      return true;
    } catch (error) {
      console.error(`❌ Navigation failed:`, error);
      return false;
    }
  }

  /**
   * Fill form field
   */
  async fillField(selector: string, value: string): Promise<boolean> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return false;
      }

      await this.page.fill(selector, value);
      console.log(`✅ Filled field: ${selector}`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to fill field ${selector}:`, error);
      return false;
    }
  }

  /**
   * Click button
   */
  async clickButton(selector: string): Promise<boolean> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return false;
      }

      await this.page.click(selector);
      console.log(`✅ Clicked button: ${selector}`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to click button ${selector}:`, error);
      return false;
    }
  }

  /**
   * Wait for element
   */
  async waitForElement(selector: string, timeout?: number): Promise<boolean> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return false;
      }

      await this.page.waitForSelector(selector, { timeout: timeout || this.config.timeout });
      console.log(`✅ Element found: ${selector}`);

      return true;
    } catch (error) {
      console.error(`❌ Element not found: ${selector}`);
      return false;
    }
  }

  /**
   * Get page content
   */
  async getPageContent(): Promise<string> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return '';
      }

      return await this.page.content();
    } catch (error) {
      console.error(`❌ Failed to get page content:`, error);
      return '';
    }
  }

  /**
   * Execute JavaScript
   */
  async executeScript(script: string): Promise<any> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return null;
      }

      return await this.page.evaluate(script);
    } catch (error) {
      console.error(`❌ Failed to execute script:`, error);
      return null;
    }
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(filePath: string): Promise<boolean> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return false;
      }

      await this.page.screenshot({ path: filePath, fullPage: true });
      console.log(`✅ Screenshot saved: ${filePath}`);

      return true;
    } catch (error) {
      console.error(`❌ Failed to take screenshot:`, error);
      return false;
    }
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return '';
      }

      return this.page.url();
    } catch (error) {
      console.error(`❌ Failed to get current URL:`, error);
      return '';
    }
  }

  /**
   * Wait for navigation
   */
  async waitForNavigation(timeout?: number): Promise<boolean> {
    try {
      if (!this.page) {
        console.error(`❌ No page available`);
        return false;
      }

      await this.page.waitForNavigation({ timeout: timeout || this.config.timeout });
      console.log(`✅ Navigation completed`);

      return true;
    } catch (error) {
      console.error(`❌ Navigation timeout:`, error);
      return false;
    }
  }

  /**
   * Close browser connection
   */
  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        console.log(`✅ Browser connection closed`);
      }
    } catch (error) {
      console.error(`❌ Error closing browser:`, error);
    }
  }

  /**
   * Get browser instance
   */
  getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Get context instance
   */
  getContext(): BrowserContext | null {
    return this.context;
  }

  /**
   * Get page instance
   */
  getPage(): Page | null {
    return this.page;
  }
}

/**
 * Helper function to setup browser embedding
 */
export async function setupBrowserEmbedding(
  cdpPort: number = 9222,
  cdpHost: string = 'localhost'
): Promise<BrowserEmbedder | null> {
  const embedder = new BrowserEmbedder({ cdpPort, cdpHost });

  // Check if Chrome is available
  const isAvailable = await embedder.checkChromeAvailability();
  if (!isAvailable) {
    console.error(`❌ Chrome not available on ${cdpHost}:${cdpPort}`);
    console.error(`💡 Start Chrome with: --remote-debugging-port=${cdpPort}`);
    return null;
  }

  // Connect to Chrome
  const connected = await embedder.connectToExistingBrowser();
  if (!connected) {
    return null;
  }

  return embedder;
}

/**
 * Print setup instructions
 */
export function printSetupInstructions(): void {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║         🔌 BROWSER EMBEDDING SETUP INSTRUCTIONS               ║
╚════════════════════════════════════════════════════════════════╝

To use browser embedding with Chrome DevTools Protocol (CDP):

1. START CHROME WITH REMOTE DEBUGGING:

   Windows:
   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" \\
   --remote-debugging-port=9222

   Mac:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\
   --remote-debugging-port=9222

   Linux:
   google-chrome --remote-debugging-port=9222

2. RUN THE TEST:
   npm run test:complete

3. WHAT HAPPENS:
   ✅ Playwright connects to your Chrome browser
   ✅ MISRA opens in the SAME tab
   ✅ Same browser session (shared cookies)
   ✅ You see automation happening live

═══════════════════════════════════════════════════════════════════
`);
}
