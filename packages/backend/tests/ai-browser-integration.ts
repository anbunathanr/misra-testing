/**
 * AI + Browser Embedding Integration
 * Combines AI-powered file verification with proper browser embedding
 */

import { BrowserEmbedder, setupBrowserEmbedding, printSetupInstructions } from './browser-embedder';
import { AIFileVerifier, generateVerificationReport } from './ai-file-verifier';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Complete workflow with AI verification and browser embedding
 */
export class AIBrowserWorkflow {
  private embedder: BrowserEmbedder | null = null;
  private verifier: AIFileVerifier;
  private downloadDir: string;

  constructor(downloadDir: string = './downloads') {
    this.downloadDir = downloadDir;
    this.verifier = new AIFileVerifier();
  }

  /**
   * Initialize browser embedding
   */
  async initializeBrowserEmbedding(cdpPort: number = 9222): Promise<boolean> {
    console.log('🔌 Initializing browser embedding...');

    this.embedder = await setupBrowserEmbedding(cdpPort);
    if (!this.embedder) {
      console.error('❌ Failed to initialize browser embedding');
      printSetupInstructions();
      return false;
    }

    console.log('✅ Browser embedding initialized successfully');
    return true;
  }

  /**
   * Navigate to MISRA in the same tab
   */
  async navigateToMISRA(): Promise<boolean> {
    if (!this.embedder) {
      console.error('❌ Browser embedder not initialized');
      return false;
    }

    console.log('🌐 Navigating to MISRA platform in the same tab...');
    const success = await this.embedder.navigateToUrl('https://misra.digitransolutions.in');

    if (success) {
      console.log('✅ MISRA platform loaded in the same tab');
      // Take screenshot to verify
      await this.embedder.takeScreenshot('misra-loaded.png');
    }

    return success;
  }

  /**
   * Auto-fill registration form
   */
  async autoFillRegistration(fullName: string, email: string, mobile: string): Promise<boolean> {
    if (!this.embedder) {
      console.error('❌ Browser embedder not initialized');
      return false;
    }

    console.log('📝 Auto-filling registration form...');

    try {
      // Fill name
      const nameSelectors = [
        'input[placeholder*="Full Name" i]',
        'input[name*="name" i]',
        'input[id*="name" i]',
        'input[type="text"]'
      ];

      for (const selector of nameSelectors) {
        const filled = await this.embedder.fillField(selector, fullName);
        if (filled) {
          console.log(`✅ Name filled: ${fullName}`);
          break;
        }
      }

      // Fill email
      const emailSelectors = [
        'input[type="email"]',
        'input[placeholder*="email" i]',
        'input[name*="email" i]'
      ];

      for (const selector of emailSelectors) {
        const filled = await this.embedder.fillField(selector, email);
        if (filled) {
          console.log(`✅ Email filled: ${email}`);
          break;
        }
      }

      // Fill mobile
      const mobileSelectors = [
        'input[type="tel"]',
        'input[placeholder*="mobile" i]',
        'input[name*="mobile" i]'
      ];

      for (const selector of mobileSelectors) {
        const filled = await this.embedder.fillField(selector, mobile);
        if (filled) {
          console.log(`✅ Mobile filled: ${mobile}`);
          break;
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to fill registration form:', error);
      return false;
    }
  }

  /**
   * Click start button
   */
  async clickStartButton(): Promise<boolean> {
    if (!this.embedder) {
      console.error('❌ Browser embedder not initialized');
      return false;
    }

    console.log('🚀 Clicking start button...');

    const buttonSelectors = [
      'button:has-text("Start")',
      'button:has-text("Submit")',
      'button[type="submit"]',
      'button'
    ];

    for (const selector of buttonSelectors) {
      const clicked = await this.embedder.clickButton(selector);
      if (clicked) {
        console.log('✅ Start button clicked');
        return true;
      }
    }

    console.error('❌ Could not find start button');
    return false;
  }

  /**
   * Verify downloaded files using AI
   */
  async verifyDownloadedFiles(
    reportPath: string,
    fixesPath: string,
    fixedCodePath: string,
    uploadedCodePath: string
  ): Promise<boolean> {
    console.log('🤖 Starting AI-powered file verification...');

    const result = await this.verifier.verifyFiles(
      reportPath,
      fixesPath,
      fixedCodePath,
      uploadedCodePath
    );

    // Print verification report
    const report = generateVerificationReport(result);
    console.log(report);

    // Save report to file
    const reportPath_file = path.join(this.downloadDir, 'ai-verification-report.txt');
    fs.writeFileSync(reportPath_file, report);
    console.log(`📄 Verification report saved: ${reportPath_file}`);

    return result.isValid;
  }

  /**
   * Get current page URL
   */
  async getCurrentUrl(): Promise<string> {
    if (!this.embedder) {
      console.error('❌ Browser embedder not initialized');
      return '';
    }

    return await this.embedder.getCurrentUrl();
  }

  /**
   * Take screenshot
   */
  async takeScreenshot(filePath: string): Promise<boolean> {
    if (!this.embedder) {
      console.error('❌ Browser embedder not initialized');
      return false;
    }

    return await this.embedder.takeScreenshot(filePath);
  }

  /**
   * Close browser connection
   */
  async close(): Promise<void> {
    if (this.embedder) {
      await this.embedder.close();
    }
  }

  /**
   * Get embedder instance
   */
  getEmbedder(): BrowserEmbedder | null {
    return this.embedder;
  }

  /**
   * Get verifier instance
   */
  getVerifier(): AIFileVerifier {
    return this.verifier;
  }
}

/**
 * Example usage
 */
export async function exampleUsage(): Promise<void> {
  const workflow = new AIBrowserWorkflow('./downloads');

  try {
    // Step 1: Initialize browser embedding
    console.log('📍 Step 1: Initializing browser embedding');
    const initialized = await workflow.initializeBrowserEmbedding(9222);
    if (!initialized) {
      console.error('❌ Failed to initialize browser embedding');
      return;
    }

    // Step 2: Navigate to MISRA
    console.log('\n📍 Step 2: Navigating to MISRA');
    const navigated = await workflow.navigateToMISRA();
    if (!navigated) {
      console.error('❌ Failed to navigate to MISRA');
      return;
    }

    // Step 3: Auto-fill registration
    console.log('\n📍 Step 3: Auto-filling registration');
    const filled = await workflow.autoFillRegistration(
      'John Doe',
      'john@example.com',
      '1234567890'
    );
    if (!filled) {
      console.error('❌ Failed to fill registration');
      return;
    }

    // Step 4: Click start button
    console.log('\n📍 Step 4: Clicking start button');
    const clicked = await workflow.clickStartButton();
    if (!clicked) {
      console.error('❌ Failed to click start button');
      return;
    }

    // Step 5: Verify files (after they're downloaded)
    console.log('\n📍 Step 5: Verifying downloaded files');
    const verified = await workflow.verifyDownloadedFiles(
      './downloads/report.pdf',
      './downloads/fixes.txt',
      './downloads/fixed_code.c',
      './uploads/example.c'
    );

    if (verified) {
      console.log('✅ All files verified successfully');
    } else {
      console.log('⚠️  Some files failed verification');
    }

    // Step 6: Close browser
    console.log('\n📍 Step 6: Closing browser connection');
    await workflow.close();
    console.log('✅ Browser connection closed');

  } catch (error) {
    console.error('❌ Workflow error:', error);
    await workflow.close();
  }
}
