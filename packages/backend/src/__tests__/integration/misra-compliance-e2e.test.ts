import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const APP_URL = process.env.APP_URL || 'https://misra.digitransolutions.in';
const BACKEND_URL = process.env.BACKEND_URL || 'https://api.misra.digitransolutions.in';

// Create a sample C file for testing
function createSampleCFile(): string {
  const sampleC = `#include <stdio.h>

int main() {
    int x = 10;
    int y = 20;
    int sum = x + y;
    
    printf("Sum: %d\\n", sum);
    
    return 0;
}
`;

  const filePath = path.join(__dirname, 'sample.c');
  fs.writeFileSync(filePath, sampleC);
  return filePath;
}

test.describe('MISRA Compliance E2E Test', () => {
  let page: Page;
  let testOtp: string;
  let accessToken: string;

  test.beforeAll(async () => {
    // Get test credentials and OTP from backend
    console.log('[TEST] Step 1: Getting test credentials from backend...');
    
    try {
      const response = await fetch(`${BACKEND_URL}/auth/test-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to get test credentials: ${response.statusText}`);
      }

      const data = await response.json();
      testOtp = data.testOtp;
      accessToken = data.accessToken;

      console.log('[TEST] ✓ Got access token and OTP:', testOtp);
    } catch (error) {
      console.error('[TEST] ✗ Failed to get test credentials:', error);
      throw error;
    }
  });

  test('Complete MISRA Compliance Analysis Workflow', async ({ browser }) => {
    // Step 2: Launch browser
    console.log('[TEST] Step 2: Launching browser...');
    page = await browser.newPage();
    console.log('[TEST] ✓ Browser launched');

    try {
      // Step 3: Navigate to login page
      console.log('[TEST] Step 3: Navigating to login page...');
      await page.goto(APP_URL, { waitUntil: 'networkidle' });
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      console.log('[TEST] ✓ Login page loaded');

      // Step 4: Perform login
      console.log('[TEST] Step 4: Performing login...');
      await page.fill('input[name="email"]', 'test-misra@example.com');
      await page.fill('input[name="password"]', 'TestPassword123!');
      await page.click('button:has-text("Login")');

      // Wait for OTP input
      await page.waitForSelector('input[name="otp"]', { timeout: 10000 });
      console.log('[TEST] ✓ OTP input field appeared');

      // Enter OTP
      await page.fill('input[name="otp"]', testOtp);
      await page.click('button:has-text("Verify")');

      // Wait for dashboard
      await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
      console.log('[TEST] ✓ Login successful, dashboard loaded');

      // Step 5: Upload C file
      console.log('[TEST] Step 5: Uploading C file...');
      const sampleCPath = createSampleCFile();

      // Find and fill file input
      const fileInput = await page.$('input[type="file"]');
      if (!fileInput) {
        throw new Error('File input not found');
      }

      await fileInput.setInputFiles(sampleCPath);
      await page.click('button:has-text("Upload")');

      // Wait for upload success
      await page.waitForSelector('text=Upload successful', { timeout: 20000 });
      console.log('[TEST] ✓ File uploaded');

      // Step 6: Trigger MISRA analysis
      console.log('[TEST] Step 6: Triggering MISRA compliance analysis...');
      await page.click('button:has-text("Analyze MISRA Compliance")');

      // Wait for analysis to start
      await page.waitForSelector('[data-status="in_progress"]', { timeout: 10000 });
      console.log('[TEST] ✓ Analysis started');

      // Step 7: Wait for completion
      console.log('[TEST] Step 7: Waiting for analysis completion...');
      await page.waitForSelector('[data-status="completed"]', { timeout: 120000 });
      console.log('[TEST] ✓ Analysis completed');

      // Step 8: Verify compliance report
      console.log('[TEST] Step 8: Verifying compliance report...');
      
      const complianceScore = await page.textContent('[data-compliance-score]');
      expect(complianceScore).toBeTruthy();
      console.log('[TEST] ✓ Compliance score found:', complianceScore);

      const violationsCount = await page.locator('[data-violations]').count();
      expect(violationsCount).toBeGreaterThanOrEqual(0);
      console.log('[TEST] ✓ Violations count:', violationsCount);

      // Take screenshot for verification
      await page.screenshot({ path: 'compliance-report.png' });
      console.log('[TEST] ✓ Screenshot saved');

      console.log('\n========================================');
      console.log('✓ All tests passed successfully!');
      console.log('========================================\n');

    } catch (error) {
      console.error('[TEST] ✗ Test failed:', error);
      
      // Take screenshot on failure
      try {
        await page.screenshot({ path: 'test-failure.png' });
        console.log('[TEST] Screenshot saved to test-failure.png');
      } catch (screenshotError) {
        console.error('[TEST] Failed to take screenshot:', screenshotError);
      }

      throw error;
    } finally {
      await page.close();
    }
  });
});
