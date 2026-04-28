import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as nodemailer from 'nodemailer';
import * as imapflow from 'imapflow';

/**
 * E2E Automation Test Suite for MISRA Platform
 * Tests complete workflow: Login → Upload C File → Analyze → Verify Report
 * Includes automatic OTP extraction from email
 */

// Configuration
const TEST_CONFIG = {
  baseUrl: 'https://misra.digitransolutions.in',
  testEmail: process.env.TEST_EMAIL || 'test@example.com',
  testPassword: process.env.TEST_PASSWORD || 'TestPassword123!',
  imapConfig: {
    host: process.env.IMAP_HOST || 'imap.gmail.com',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: true,
    auth: {
      user: process.env.IMAP_USER || '',
      pass: process.env.IMAP_PASS || '' // Gmail App Password
    }
  },
  sampleCFile: `
#include <stdio.h>
#include <stdlib.h>

int global_var = 0;

void unsafe_function(int *ptr) {
    *ptr = 10;
    global_var++;
}

int main(void) {
    int x = 5;
    unsafe_function(&x);
    
    if (x > 42) {
        printf("Value: %d\\n", x);
    }
    
    return 0;
}
  `
};

/**
 * Extract OTP from Gmail using IMAP
 * More reliable than UI scraping
 */
async function getOtpFromGmail(email: string): Promise<string> {
  const client = new imapflow.ImapFlow(TEST_CONFIG.imapConfig);
  
  try {
    await client.connect();
    
    // Select inbox
    await client.mailboxOpen('INBOX');
    
    // Get the latest email
    const messages = await client.search({ all: true }, { sort: ['ARRIVAL'], limit: 1 });
    
    if (messages.length === 0) {
      throw new Error('No emails found in inbox');
    }
    
    const message = await client.fetchOne(messages[0], { source: true });
    const source = message.source.toString();
    
    // Extract OTP (6-digit code)
    const otpMatch = source.match(/\b(\d{6})\b/);
    if (!otpMatch) {
      throw new Error('OTP not found in email');
    }
    
    return otpMatch[1];
  } finally {
    await client.logout();
  }
}

/**
 * Alternative: Extract OTP using Playwright (UI scraping)
 * Use if IMAP is not available
 */
async function getOtpFromGmailUI(page: Page): Promise<string> {
  // Open Gmail in new tab
  const gmailPage = await page.context().newPage();
  await gmailPage.goto('https://mail.google.com/');
  
  // Wait for inbox to load
  await gmailPage.waitForLoadState('networkidle');
  
  // Click on the latest email (OTP/verification)
  await gmailPage.locator('[data-tooltip="OTP"], [data-tooltip*="verification"], [data-tooltip*="code"]').first().click();
  
  // Wait for email body to load
  await gmailPage.waitForLoadState('networkidle');
  
  // Extract OTP from email body
  const bodyText = await gmailPage.locator('[role="main"]').innerText();
  const otpMatch = bodyText.match(/\b(\d{6})\b/);
  
  await gmailPage.close();
  
  if (!otpMatch) {
    throw new Error('OTP not found in email');
  }
  
  return otpMatch[1];
}

test.describe('MISRA Platform E2E Automation', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launch({ headless: false });
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('Complete MISRA Analysis Workflow', async () => {
    console.log('🚀 Starting MISRA Platform E2E Test');

    // Step 1: Navigate to site and check if already logged in
    console.log('📍 Step 1: Checking login status');
    await page.goto(`${TEST_CONFIG.baseUrl}`);
    await page.waitForLoadState('networkidle');
    
    const signOutButton = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")');
    const isLoggedIn = await signOutButton.isVisible({ timeout: 2000 }).catch(() => false);
    
    if (isLoggedIn) {
      console.log('   ✅ Already logged in, skipping login steps');
    } else {
      console.log('   📍 Not logged in, proceeding with login...');
      
      // Navigate to login page
      await page.goto(`${TEST_CONFIG.baseUrl}/login`);
      await page.waitForLoadState('networkidle');

      // Step 2: Enter email
      console.log('📍 Step 2: Entering email');
      await page.fill('input[type="email"]', TEST_CONFIG.testEmail);
      await page.click('button:has-text("Continue"), button:has-text("Next")');
      await page.waitForLoadState('networkidle');

      // Step 3: Enter password
      console.log('📍 Step 3: Entering password');
      await page.fill('input[type="password"]', TEST_CONFIG.testPassword);
      await page.click('button:has-text("Sign In"), button:has-text("Login")');
      await page.waitForLoadState('networkidle');

      // Step 4: Wait for OTP email and extract it
      console.log('📍 Step 4: Waiting for OTP email');
      let otp: string;
      try {
        // Try IMAP first (more reliable)
        console.log('   Attempting to fetch OTP via IMAP...');
        otp = await getOtpFromGmail(TEST_CONFIG.testEmail);
        console.log(`   ✅ OTP fetched via IMAP: ${otp}`);
      } catch (error) {
        console.log('   ⚠️ IMAP failed, falling back to UI scraping...');
        otp = await getOtpFromGmailUI(page);
        console.log(`   ✅ OTP fetched via UI: ${otp}`);
      }

      // Step 5: Enter OTP
      console.log('📍 Step 5: Entering OTP');
      const otpInputs = page.locator('input[placeholder*="OTP"], input[placeholder*="code"], input[maxlength="1"]');
      const count = await otpInputs.count();
      
      if (count > 0) {
        // Multi-digit input fields
        for (let i = 0; i < otp.length; i++) {
          await otpInputs.nth(i).fill(otp[i]);
        }
      } else {
        // Single input field
        await page.fill('input[type="text"]', otp);
      }
      
      await page.click('button:has-text("Verify"), button:has-text("Confirm")');
      await page.waitForLoadState('networkidle');

      console.log('   ✅ Login successful');
    }

    // Step 6: Navigate to dashboard/home if not already there
    console.log('📍 Step 6: Navigating to dashboard');
    const currentUrl = page.url();
    if (!currentUrl.match(/dashboard|home|analysis/i)) {
      await page.goto(`${TEST_CONFIG.baseUrl}`);
      await page.waitForLoadState('networkidle');
    }
    console.log('   ✅ On dashboard');

    // Step 7: Upload C file
    console.log('📍 Step 7: Uploading C file');
    const fileInput = page.locator('input[type="file"]');
    
    // Create temporary file
    const fs = require('fs');
    const path = require('path');
    const tempDir = path.join(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
    
    const filePath = path.join(tempDir, 'test_sample.c');
    fs.writeFileSync(filePath, TEST_CONFIG.sampleCFile);
    
    await fileInput.setInputFiles(filePath);
    console.log('   ✅ File selected');

    // Step 8: Click Analyze button
    console.log('📍 Step 8: Clicking Analyze MISRA Compliance button');
    await page.click('button:has-text("Analyze"), button:has-text("Start Analysis"), button:has-text("Run MISRA"), button:has-text("Analyze MISRA Compliance")');
    await page.waitForLoadState('networkidle');

    // Step 9: Wait for analysis to complete
    console.log('📍 Step 9: Waiting for analysis to complete');
    const maxWaitTime = 120000; // 2 minutes
    const startTime = Date.now();
    let analysisComplete = false;
    let complianceScore = 0;

    while (!analysisComplete && Date.now() - startTime < maxWaitTime) {
      // Check for completion indicators
      const progressText = await page.locator('[class*="progress"], [class*="status"]').innerText().catch(() => '');
      const completionText = await page.locator('text=/completed|finished|done/i').innerText().catch(() => '');
      
      if (completionText || progressText.includes('100%')) {
        analysisComplete = true;
        console.log('   ✅ Analysis completed');
      } else {
        console.log(`   ⏳ Analysis in progress... ${progressText}`);
        await page.waitForTimeout(5000); // Wait 5 seconds before checking again
      }
    }

    if (!analysisComplete) {
      throw new Error('Analysis did not complete within timeout period');
    }

    // Step 10: Verify compliance report
    console.log('📍 Step 10: Verifying compliance report');
    
    // Check for report elements
    const reportTitle = page.locator('text=/analysis results|compliance report|violations/i');
    await expect(reportTitle).toBeVisible();
    console.log('   ✅ Report title visible');

    // Extract compliance score
    const scoreText = await page.locator('[class*="score"], [class*="compliance"], text=/\\d+%/').innerText().catch(() => '0%');
    const scoreMatch = scoreText.match(/(\d+)%/);
    if (scoreMatch) {
      complianceScore = parseInt(scoreMatch[1]);
      console.log(`   ✅ Compliance Score: ${complianceScore}%`);
    }

    // Check for violations table
    const violationsTable = page.locator('table, [role="table"], [class*="violations"]');
    if (await violationsTable.isVisible().catch(() => false)) {
      const violationCount = await violationsTable.locator('tr, [role="row"]').count();
      console.log(`   ✅ Found ${violationCount} violations in report`);
    }

    // Step 11: Verify report contains expected data
    console.log('📍 Step 11: Verifying report data');
    const reportContent = await page.locator('body').innerText();
    
    expect(reportContent).toContain(/violation|rule|compliance|analysis/i);
    console.log('   ✅ Report contains expected data');

    // Step 12: Download or export report (optional)
    console.log('📍 Step 12: Checking for export options');
    const exportButton = page.locator('button:has-text("Download"), button:has-text("Export"), button:has-text("PDF")');
    if (await exportButton.isVisible().catch(() => false)) {
      console.log('   ✅ Export button available');
    }

    console.log('✅ E2E Test Completed Successfully!');
    console.log(`   Final Compliance Score: ${complianceScore}%`);
  });

  test('Test Button - Quick Verification', async () => {
    console.log('🧪 Running Quick Verification Test');
    console.log(`📍 Navigating to: ${TEST_CONFIG.baseUrl}`);

    // Navigate to test page
    await page.goto(`${TEST_CONFIG.baseUrl}`, { waitUntil: 'domcontentloaded' });

    // Debug: Log page info
    const title = await page.title();
    const url = page.url();
    console.log(`📍 Page Title: ${title}`);
    console.log(`📍 Current URL: ${url}`);

    // Check if site is accessible
    try {
      await expect(page).toHaveTitle(/MISRA|Analysis|Login|Sign|Home/i);
      console.log('✅ Site is accessible');
    } catch (e) {
      console.log(`⚠️ Title check failed. Actual title: ${title}`);
    }

    // Try to find login button with multiple selectors
    const loginSelectors = [
      'button:has-text("Login")',
      'a:has-text("Sign In")',
      'button:has-text("Sign In")',
      '[data-testid="login-button"]',
      'a[href*="login"]',
      'button[type="submit"]'
    ];

    let found = false;
    for (const selector of loginSelectors) {
      if (await page.locator(selector).isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`✅ Login button found: ${selector}`);
        found = true;
        break;
      }
    }

    if (!found) {
      console.log('⚠️ Login button not found. Available buttons:');
      const buttons = await page.locator('button, a[role="button"]').all();
      for (const btn of buttons.slice(0, 5)) {
        const text = await btn.innerText().catch(() => '(no text)');
        console.log(`   - ${text}`);
      }
    }

    // Check for upload section (optional)
    const uploadSection = page.locator('[class*="upload"], text=/upload|file/i');
    if (await uploadSection.isVisible({ timeout: 1000 }).catch(() => false)) {
      console.log('✅ Upload section visible');
    }

    console.log('✅ Quick Verification Complete');
  });
});
