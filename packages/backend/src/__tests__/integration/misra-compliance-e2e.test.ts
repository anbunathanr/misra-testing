import { chromium, Browser, Page } from 'playwright';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * End-to-End Test: MISRA Compliance Analysis Workflow
 * 
 * This test automates the complete workflow:
 * 1. Login with test credentials (OTP extracted from backend response)
 * 2. Upload a C file
 * 3. Trigger MISRA compliance analysis
 * 4. Wait for analysis completion
 * 5. Verify compliance report
 */

interface TestConfig {
  baseUrl: string;
  testEmail: string;
  testPassword: string;
  backendUrl: string;
  timeout: number;
}

class MisraComplianceE2ETest {
  private config: TestConfig;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private accessToken: string = '';
  private testOtp: string = '';

  constructor(config: Partial<TestConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://misra.digitransolutions.in',
      testEmail: config.testEmail || 'test@example.com',
      testPassword: config.testPassword || 'TestPassword123!',
      backendUrl: config.backendUrl || 'https://api.misra.digitransolutions.in',
      timeout: config.timeout || 60000,
    };
  }

  /**
   * Step 1: Get test credentials and OTP from backend
   */
  async getTestCredentials(): Promise<void> {
    console.log('[TEST] Step 1: Getting test credentials from backend...');
    
    try {
      const response = await axios.post(
        `${this.config.backendUrl}/auth/test-login`,
        {
          email: this.config.testEmail,
          password: this.config.testPassword,
          testMode: true,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 200 && response.data.testOtp) {
        this.accessToken = response.data.accessToken;
        this.testOtp = response.data.testOtp;
        console.log(`[TEST] ✓ Got access token and OTP: ${this.testOtp}`);
      } else {
        throw new Error('Failed to get test credentials');
      }
    } catch (error) {
      console.error('[TEST] ✗ Failed to get test credentials:', error);
      throw error;
    }
  }

  /**
   * Step 2: Launch browser and navigate to app
   */
  async launchBrowser(): Promise<void> {
    console.log('[TEST] Step 2: Launching browser...');
    
    try {
      this.browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false',
      });
      this.page = await this.browser.newPage();
      
      // Set viewport for consistent testing
      await this.page.setViewportSize({ width: 1280, height: 720 });
      
      console.log('[TEST] ✓ Browser launched');
    } catch (error) {
      console.error('[TEST] ✗ Failed to launch browser:', error);
      throw error;
    }
  }

  /**
   * Step 3: Navigate to login page
   */
  async navigateToLogin(): Promise<void> {
    console.log('[TEST] Step 3: Navigating to login page...');
    
    try {
      await this.page!.goto(`${this.config.baseUrl}/login`, {
        waitUntil: 'networkidle',
        timeout: this.config.timeout,
      });
      
      // Wait for login form to be visible
      await this.page!.waitForSelector('input[type="email"]', { timeout: 5000 });
      console.log('[TEST] ✓ Login page loaded');
    } catch (error) {
      console.error('[TEST] ✗ Failed to navigate to login:', error);
      throw error;
    }
  }

  /**
   * Step 4: Perform login with test credentials
   */
  async performLogin(): Promise<void> {
    console.log('[TEST] Step 4: Performing login...');
    
    try {
      // Fill email
      await this.page!.fill('input[type="email"]', this.config.testEmail);
      console.log('[TEST] ✓ Email entered');

      // Fill password
      await this.page!.fill('input[type="password"]', this.config.testPassword);
      console.log('[TEST] ✓ Password entered');

      // Click login button
      await this.page!.click('button:has-text("Login")');
      console.log('[TEST] ✓ Login button clicked');

      // Wait for OTP input or dashboard
      try {
        await this.page!.waitForSelector('input[placeholder*="OTP"]', { timeout: 5000 });
        console.log('[TEST] ✓ OTP input appeared');
        
        // Enter OTP
        await this.page!.fill('input[placeholder*="OTP"]', this.testOtp);
        console.log(`[TEST] ✓ OTP entered: ${this.testOtp}`);

        // Click verify OTP button
        await this.page!.click('button:has-text("Verify")');
        console.log('[TEST] ✓ OTP verified');
      } catch {
        // OTP might not be required in test mode
        console.log('[TEST] ℹ OTP input not found, continuing...');
      }

      // Wait for dashboard to load
      await this.page!.waitForURL('**/dashboard', { timeout: 10000 });
      console.log('[TEST] ✓ Login successful, dashboard loaded');
    } catch (error) {
      console.error('[TEST] ✗ Login failed:', error);
      throw error;
    }
  }

  /**
   * Step 5: Upload C file
   */
  async uploadCFile(): Promise<void> {
    console.log('[TEST] Step 5: Uploading C file...');
    
    try {
      // Create a sample C file for testing
      const sampleCCode = `
#include <stdio.h>

int main(void) {
    int x = 10;
    int y = 20;
    int z = x + y;
    printf("Sum: %d\\n", z);
    return 0;
}
`;
      
      const tempFile = path.join('/tmp', 'test_sample.c');
      fs.writeFileSync(tempFile, sampleCCode);
      console.log('[TEST] ✓ Sample C file created');

      // Find file upload input
      const fileInput = await this.page!.$('input[type="file"]');
      if (!fileInput) {
        throw new Error('File upload input not found');
      }

      // Upload file
      await fileInput.setInputFiles(tempFile);
      console.log('[TEST] ✓ File selected');

      // Wait for upload to complete
      await this.page!.waitForTimeout(2000);
      console.log('[TEST] ✓ File uploaded');

      // Clean up temp file
      fs.unlinkSync(tempFile);
    } catch (error) {
      console.error('[TEST] ✗ File upload failed:', error);
      throw error;
    }
  }

  /**
   * Step 6: Trigger MISRA compliance analysis
   */
  async triggerAnalysis(): Promise<void> {
    console.log('[TEST] Step 6: Triggering MISRA compliance analysis...');
    
    try {
      // Click "Analyze MISRA Compliance" button
      await this.page!.click('button:has-text("Analyze MISRA Compliance")');
      console.log('[TEST] ✓ Analysis button clicked');

      // Wait for analysis to start (look for loading indicator)
      await this.page!.waitForSelector('[data-testid="analysis-loading"]', { timeout: 5000 });
      console.log('[TEST] ✓ Analysis started');
    } catch (error) {
      console.error('[TEST] ✗ Failed to trigger analysis:', error);
      throw error;
    }
  }

  /**
   * Step 7: Wait for analysis completion
   */
  async waitForAnalysisCompletion(): Promise<void> {
    console.log('[TEST] Step 7: Waiting for analysis completion...');
    
    try {
      // Wait for loading to disappear (max 5 minutes)
      await this.page!.waitForSelector('[data-testid="analysis-loading"]', {
        state: 'hidden',
        timeout: 300000,
      });
      console.log('[TEST] ✓ Analysis completed');

      // Wait for results to appear
      await this.page!.waitForSelector('[data-testid="compliance-report"]', { timeout: 10000 });
      console.log('[TEST] ✓ Compliance report loaded');
    } catch (error) {
      console.error('[TEST] ✗ Analysis completion timeout:', error);
      throw error;
    }
  }

  /**
   * Step 8: Verify compliance report
   */
  async verifyComplianceReport(): Promise<void> {
    console.log('[TEST] Step 8: Verifying compliance report...');
    
    try {
      // Check if report contains expected elements
      const reportTitle = await this.page!.$('[data-testid="report-title"]');
      if (!reportTitle) {
        throw new Error('Report title not found');
      }
      console.log('[TEST] ✓ Report title found');

      // Get violation count
      const violationCount = await this.page!.textContent('[data-testid="violation-count"]');
      console.log(`[TEST] ✓ Violations found: ${violationCount}`);

      // Get compliance score
      const complianceScore = await this.page!.textContent('[data-testid="compliance-score"]');
      console.log(`[TEST] ✓ Compliance score: ${complianceScore}`);

      // Verify report has data
      const reportData = await this.page!.textContent('[data-testid="compliance-report"]');
      if (!reportData || reportData.length === 0) {
        throw new Error('Report data is empty');
      }

      console.log('[TEST] ✓ Compliance report verified successfully');
    } catch (error) {
      console.error('[TEST] ✗ Report verification failed:', error);
      throw error;
    }
  }

  /**
   * Take screenshot for debugging
   */
  async takeScreenshot(name: string): Promise<void> {
    if (this.page) {
      const screenshotPath = path.join('/tmp', `${name}-${Date.now()}.png`);
      await this.page.screenshot({ path: screenshotPath });
      console.log(`[TEST] Screenshot saved: ${screenshotPath}`);
    }
  }

  /**
   * Cleanup: Close browser
   */
  async cleanup(): Promise<void> {
    console.log('[TEST] Cleaning up...');
    if (this.browser) {
      await this.browser.close();
      console.log('[TEST] ✓ Browser closed');
    }
  }

  /**
   * Run complete test workflow
   */
  async runCompleteTest(): Promise<void> {
    try {
      console.log('\n========================================');
      console.log('MISRA Compliance E2E Test Started');
      console.log('========================================\n');

      await this.getTestCredentials();
      await this.launchBrowser();
      await this.navigateToLogin();
      await this.performLogin();
      await this.uploadCFile();
      await this.triggerAnalysis();
      await this.waitForAnalysisCompletion();
      await this.verifyComplianceReport();

      console.log('\n========================================');
      console.log('✓ All tests passed successfully!');
      console.log('========================================\n');
    } catch (error) {
      console.error('\n========================================');
      console.error('✗ Test failed:', error);
      console.error('========================================\n');
      
      await this.takeScreenshot('error');
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

// Export for use in test runners
export { MisraComplianceE2ETest };

// Run if executed directly
if (require.main === module) {
  const test = new MisraComplianceE2ETest({
    baseUrl: process.env.APP_URL || 'https://misra.digitransolutions.in',
    testEmail: process.env.TEST_EMAIL || 'test@example.com',
    testPassword: process.env.TEST_PASSWORD || 'TestPassword123!',
    backendUrl: process.env.BACKEND_URL || 'https://api.misra.digitransolutions.in',
  });

  test.runCompleteTest().catch((error) => {
    console.error('Test execution failed:', error);
    process.exit(1);
  });
}
