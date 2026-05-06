/**
 * Proper Browser Embedding - Downloads Visible in Your Browser
 * Uses Chrome DevTools Protocol to embed MISRA in your browser
 * Downloads stay visible in your browser's download manager
 */

import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

interface BrowserEmbeddingConfig {
  cdpPort: number;
  cdpHost: string;
  downloadPath: string;
  timeout: number;
}

/**
 * Proper Browser Embedding - Keeps Downloads Visible
 */
export class ProperBrowserEmbedding {
  private config: BrowserEmbeddingConfig;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private downloadedFiles: string[] = [];

  constructor(config: Partial<BrowserEmbeddingConfig> = {}) {
    this.config = {
      cdpPort: config.cdpPort || 9222,
      cdpHost: config.cdpHost || 'localhost',
      downloadPath: config.downloadPath || './downloads',
      timeout: config.timeout || 30000
    };

    // Create download directory
    if (!fs.existsSync(this.config.downloadPath)) {
      fs.mkdirSync(this.config.downloadPath, { recursive: true });
    }
  }

  /**
   * Connect to your existing Chrome browser
   */
  async connectToYourBrowser(): Promise<boolean> {
    try {
      console.log(`🔌 Connecting to your Chrome browser...`);
      console.log(`   Host: ${this.config.cdpHost}`);
      console.log(`   Port: ${this.config.cdpPort}`);
      console.log(`   Downloads: ${this.config.downloadPath}`);

      // Connect to existing browser via CDP
      const cdpUrl = `http://${this.config.cdpHost}:${this.config.cdpPort}`;
      this.browser = await chromium.connectOverCDP(cdpUrl);

      console.log(`✅ Connected to your Chrome browser`);

      // Get or create context with download path
      const contexts = this.browser.contexts();
      if (contexts.length > 0) {
        this.context = contexts[0];
        console.log(`✅ Using existing browser context`);
      } else {
        this.context = await this.browser.newContext({
          acceptDownloads: true
        });
        console.log(`✅ Created new browser context with download support`);
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

      // Set up download handler
      this.setupDownloadHandler();

      return true;
    } catch (error) {
      console.error(`❌ Failed to connect to your browser:`, error);
      console.error(`💡 Make sure Chrome is running with: --remote-debugging-port=${this.config.cdpPort}`);
      return false;
    }
  }

  /**
   * Set up download handler to track downloads
   */
  private setupDownloadHandler(): void {
    if (!this.page) return;

    this.page.on('download', async (download) => {
      try {
        const fileName = download.suggestedFilename();
        const filePath = path.join(this.config.downloadPath, fileName);

        console.log(`📥 Download started: ${fileName}`);

        // Save download to our directory
        await download.saveAs(filePath);

        this.downloadedFiles.push(filePath);
        console.log(`✅ Downloaded: ${fileName} → ${filePath}`);
      } catch (error) {
        console.error(`❌ Download error:`, error);
      }
    });
  }

  /**
   * Navigate to MISRA in your browser
   */
  async navigateToMISRA(): Promise<boolean> {
    if (!this.page) {
      console.error(`❌ No page available`);
      return false;
    }

    try {
      console.log(`🌐 Navigating to MISRA in your browser...`);
      await this.page.goto('https://misra.digitransolutions.in', {
        waitUntil: 'domcontentloaded',
        timeout: this.config.timeout
      });

      console.log(`✅ MISRA loaded in your browser`);
      console.log(`💡 You can now see MISRA in your browser tab`);
      console.log(`💡 Downloads will appear in your browser's download manager`);

      return true;
    } catch (error) {
      console.error(`❌ Navigation failed:`, error);
      return false;
    }
  }

  /**
   * Auto-fill registration form
   */
  async autoFillRegistration(fullName: string, email: string, mobile: string): Promise<boolean> {
    if (!this.page) {
      console.error(`❌ No page available`);
      return false;
    }

    try {
      console.log(`📝 Auto-filling registration form...`);

      // Try multiple selectors for name field
      const nameSelectors = [
        'input[placeholder*="Full Name" i]',
        'input[placeholder*="Name" i]',
        'input[name*="name" i]',
        'input[id*="name" i]',
        'input[type="text"]'
      ];

      for (const selector of nameSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            await element.fill(fullName);
            console.log(`✅ Name filled: ${fullName}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Try multiple selectors for email field
      const emailSelectors = [
        'input[type="email"]',
        'input[placeholder*="email" i]',
        'input[name*="email" i]'
      ];

      for (const selector of emailSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            await element.fill(email);
            console.log(`✅ Email filled: ${email}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // Try multiple selectors for mobile field
      const mobileSelectors = [
        'input[type="tel"]',
        'input[placeholder*="mobile" i]',
        'input[placeholder*="phone" i]',
        'input[name*="mobile" i]'
      ];

      for (const selector of mobileSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
            await element.fill(mobile);
            console.log(`✅ Mobile filled: ${mobile}`);
            break;
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ Failed to fill registration:`, error);
      return false;
    }
  }

  /**
   * Click button
   */
  async clickButton(buttonText: string): Promise<boolean> {
    if (!this.page) {
      console.error(`❌ No page available`);
      return false;
    }

    try {
      const button = this.page.locator(`button:has-text("${buttonText}")`).first();
      if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
        await button.click();
        console.log(`✅ Clicked button: ${buttonText}`);
        return true;
      }

      console.error(`❌ Button not found: ${buttonText}`);
      return false;
    } catch (error) {
      console.error(`❌ Failed to click button:`, error);
      return false;
    }
  }

  /**
   * Wait for downloads
   */
  async waitForDownloads(expectedCount: number = 3, timeout: number = 120000): Promise<boolean> {
    console.log(`⏳ Waiting for ${expectedCount} files to download...`);
    console.log(`💡 Check your browser's download manager`);

    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (this.downloadedFiles.length >= expectedCount) {
        console.log(`✅ All ${expectedCount} files downloaded`);
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.warn(`⚠️  Timeout waiting for downloads. Got ${this.downloadedFiles.length}/${expectedCount}`);
    return false;
  }

  /**
   * Get downloaded files
   */
  getDownloadedFiles(): string[] {
    return this.downloadedFiles;
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(filePath: string): Promise<boolean> {
    if (!this.page) {
      console.error(`❌ No page available`);
      return false;
    }

    try {
      await this.page.screenshot({ path: filePath, fullPage: true });
      console.log(`📸 Screenshot saved: ${filePath}`);
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
    if (!this.page) {
      console.error(`❌ No page available`);
      return '';
    }

    return this.page.url();
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
   * Get page instance
   */
  getPage(): Page | null {
    return this.page;
  }

  /**
   * Print setup instructions
   */
  static printSetupInstructions(): void {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║    🔌 PROPER BROWSER EMBEDDING - DOWNLOADS VISIBLE            ║
╚════════════════════════════════════════════════════════════════╝

TO USE PROPER BROWSER EMBEDDING:

1. START CHROME WITH REMOTE DEBUGGING:

   Windows:
   "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" \\
   --remote-debugging-port=9222

   Mac:
   /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\
   --remote-debugging-port=9222

   Linux:
   google-chrome --remote-debugging-port=9222

2. WHAT HAPPENS:
   ✅ Playwright connects to YOUR Chrome browser
   ✅ MISRA opens in YOUR browser tab
   ✅ Downloads appear in YOUR browser's download manager
   ✅ You see everything happening in real-time
   ✅ Downloads stay visible and accessible

3. KEY FEATURES:
   ✅ Same browser session
   ✅ Same browser tab
   ✅ Downloads visible in browser
   ✅ No separate Playwright window
   ✅ Professional appearance

═══════════════════════════════════════════════════════════════════
`);
  }
}

/**
 * Setup proper browser embedding
 */
export async function setupProperBrowserEmbedding(
  cdpPort: number = 9222,
  downloadPath: string = './downloads'
): Promise<ProperBrowserEmbedding | null> {
  const embedder = new ProperBrowserEmbedding({ cdpPort, downloadPath });

  const connected = await embedder.connectToYourBrowser();
  if (!connected) {
    ProperBrowserEmbedding.printSetupInstructions();
    return null;
  }

  return embedder;
}
