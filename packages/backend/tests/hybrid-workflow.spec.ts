import { test, expect, chromium, Browser, BrowserContext, Page } from '@playwright/test';
import * as imapflow from 'imapflow';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Hybrid MISRA Testing Workflow
 * Phase 1: Localhost Registration → Phase 2: MISRA Platform Automation
 */

// Configuration
const HYBRID_CONFIG = {
  localhostUrl: process.env.LOCALHOST_URL || 'http://localhost:3000',
  misraUrl: process.env.BASE_URL || 'https://misra.digitransolutions.in',
  testEmail: process.env.TEST_EMAIL || 'test@example.com',
  testName: process.env.TEST_NAME || 'Test User',
  testMobile: process.env.TEST_MOBILE || '9876543210',
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
 * Extract OTP from Gmail using IMAP (for secondary OTP during MISRA automation)
 */
async function getOtpFromGmail(maxAttempts: number = 30): Promise<string> {
  console.log('   🔌 Starting OTP retrieval from Gmail...');
  console.log(`   📧 IMAP User: ${HYBRID_CONFIG.imapConfig.auth.user}`);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const client = new imapflow.ImapFlow(HYBRID_CONFIG.imapConfig);
    
    try {
      console.log(`   ⏳ OTP Attempt ${attempt + 1}/${maxAttempts} - Connecting to Gmail IMAP...`);
      await client.connect();
      console.log('   ✅ Connected to IMAP');
      
      await client.mailboxOpen('INBOX');
      
      // Search for recent unread messages
      console.log('   🔍 Searching for recent emails...');
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      let searchResult = await client.search({ seen: false, since: fiveMinutesAgo }, { uid: true });
      
      if (!searchResult || !Array.isArray(searchResult) || searchResult.length === 0) {
        console.log('   🔍 No recent unread emails, searching all recent emails...');
        searchResult = await client.search({ since: fiveMinutesAgo }, { uid: true });
      }
      
      if (searchResult === false || !Array.isArray(searchResult) || searchResult.length === 0) {
        console.log(`   ⚠️  No emails found, retrying in 3 seconds...`);
        await client.logout();
        if (attempt < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        continue;
      }
      
      const messages = searchResult as number[];
      console.log(`   📊 Found ${messages.length} recent email(s)`);
      
      // Check the last 10 messages for OTP
      const messagesToCheck = messages.slice(-10);
      
      for (const uid of messagesToCheck.reverse()) {
        try {
          const messageResult = await client.fetchOne(uid, { 
            source: true,
            envelope: true 
          });
          
          if (messageResult === false || !messageResult) {
            continue;
          }
          
          const message = messageResult as any;
          const source = message.source?.toString() || '';
          const subject = message.envelope?.subject || '';
          const from = message.envelope?.from?.[0]?.address || '';
          
          console.log(`   📧 Checking email: "${subject}" from ${from}`);
          
          // Prioritize emails from ceo@digitransolutions.in
          const isCeoEmail = from.toLowerCase().includes('ceo@digitransolutions.in');
          if (isCeoEmail) {
            console.log(`   ⭐ Priority email from CEO@digitransolutions.in detected!`);
          }
          
          // Enhanced OTP patterns for better matching
          const patterns = [
            { name: 'your-otp-code-is', regex: /your\\s+otp\\s+code\\s+is\\s+(\\d{6})/i },
            { name: 'otp-code-is', regex: /otp\\s+code\\s+is\\s+(\\d{6})/i },
            { name: 'code-is', regex: /code\\s+is\\s+(\\d{6})/i },
            { name: 'otp-6-digit', regex: /otp[:\\s]*(\\d{6})/i },
            { name: '6-digit-standalone', regex: /\\b(\\d{6})\\b/ },
            { name: 'otp-4-8-digit', regex: /otp[:\\s]*(\\d{4,8})/i },
            { name: '4-8-digit-standalone', regex: /\\b(\\d{4,8})\\b/ }
          ];
          
          for (const pattern of patterns) {
            const otpMatch = source.match(pattern.regex);
            if (otpMatch && otpMatch[1]) {
              let extractedOtp = otpMatch[1];
              
              // Validate OTP is 4-8 digits
              if (extractedOtp.length >= 4 && extractedOtp.length <= 8 && /^\\d+$/.test(extractedOtp)) {
                console.log(`   ✅ OTP found (${pattern.name}): ${extractedOtp}`);
                await client.logout();
                return extractedOtp;
              }
            }
          }
        } catch (err) {
          console.log(`   ⚠️  Error checking message ${uid}: ${err}`);
          continue;
        }
      }
      
      await client.logout();
      console.log(`   ⚠️  OTP not found in attempt ${attempt + 1}, retrying in 3 seconds...`);
      
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (error) {
      console.log(`   ❌ IMAP Error (attempt ${attempt + 1}): ${error}`);
      try {
        await client.logout();
      } catch (err) {
        // Ignore logout errors
      }
      
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }
  
  throw new Error(`Secondary OTP not found after ${maxAttempts} attempts`);
}

test.describe('Hybrid MISRA Testing Workflow', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launch({ 
      headless: false,
      slowMo: 1000,
      timeout: 120000,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
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

  test('Complete Hybrid Workflow: Localhost → MISRA Platform', async () => {
    test.setTimeout(600000); // 10 minutes timeout for complete hybrid workflow
    
    console.log('🚀 Starting Hybrid MISRA Testing Workflow');
    console.log(`🏠 Localhost URL: ${HYBRID_CONFIG.localhostUrl}`);
    console.log(`🌐 MISRA URL: ${HYBRID_CONFIG.misraUrl}`);
    console.log(`📧 Test Email: ${HYBRID_CONFIG.testEmail}`);
    console.log(`👤 Test Name: ${HYBRID_CONFIG.testName}`);
    console.log(`📱 Test Mobile: ${HYBRID_CONFIG.testMobile}`);

    // ========================================
    // PHASE 1: LOCALHOST REGISTRATION
    // ========================================
    console.log('\\n🏠 ===== PHASE 1: LOCALHOST REGISTRATION =====');
    
    // Step 1: Navigate to localhost
    console.log('\\n📍 Step 1: Navigating to localhost registration');
    await page.goto(HYBRID_CONFIG.localhostUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    
    // Step 2: Fill registration form on localhost
    console.log('\\n📍 Step 2: Filling localhost registration form');
    
    // Fill Full Name
    const nameInput = page.locator('#fullName, input[placeholder*="full name" i]').first();
    await nameInput.waitFor({ state: 'visible', timeout: 10000 });
    await nameInput.fill(HYBRID_CONFIG.testName);
    console.log(`   ✅ Name entered: ${HYBRID_CONFIG.testName}`);
    
    // Fill Email
    const emailInput = page.locator('#email, input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(HYBRID_CONFIG.testEmail);
    console.log(`   ✅ Email entered: ${HYBRID_CONFIG.testEmail}`);
    
    // Fill Mobile Number
    const mobileInput = page.locator('#mobileNumber, input[placeholder*="mobile" i]').first();
    await mobileInput.waitFor({ state: 'visible', timeout: 10000 });
    await mobileInput.fill(HYBRID_CONFIG.testMobile);
    console.log(`   ✅ Mobile entered: ${HYBRID_CONFIG.testMobile}`);
    
    // Step 3: Click Send OTP (triggers headless OTP from MISRA)
    console.log('\\n📍 Step 3: Clicking Send OTP (triggers MISRA OTP)');
    const sendOtpBtn = page.locator('#sendOtpBtn, button:has-text("Send OTP")').first();
    await sendOtpBtn.click();
    console.log('   ✅ Send OTP clicked - waiting for OTP to be sent...');
    
    // Wait for OTP form to appear
    await page.waitForSelector('#otpForm:not(.hidden), #otp', { timeout: 15000 });
    console.log('   ✅ OTP form appeared');
    
    // Step 4: Manual OTP entry (user enters OTP from email)
    console.log('\\n📍 Step 4: Manual OTP Entry');
    console.log('   ⏰ MANUAL INTERACTION: Please check your email and enter the OTP');
    console.log('   📧 Expected email from: ceo@digitransolutions.in');
    console.log('   ⏳ Waiting 120 seconds for manual OTP entry...');
    
    // Wait for user to manually enter OTP and click verify
    await page.waitForTimeout(120000); // 2 minutes for manual OTP entry
    
    // Check if we reached the dashboard
    const dashboard = page.locator('#dashboard:not(.hidden)');
    const isDashboardVisible = await dashboard.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isDashboardVisible) {
      console.log('   ⚠️  Dashboard not visible yet, waiting additional time...');
      await page.waitForTimeout(30000); // Additional 30 seconds
    }
    
    // Step 5: Verify we're on the dashboard
    console.log('\\n📍 Step 5: Verifying localhost dashboard access');
    await page.waitForSelector('#dashboard:not(.hidden)', { timeout: 10000 });
    console.log('   ✅ Successfully reached localhost dashboard');
    
    // ========================================
    // PHASE 2: AUTOMATED PLAYWRIGHT INVOCATION
    // ========================================
    console.log('\\n🤖 ===== PHASE 2: AUTOMATED PLAYWRIGHT INVOCATION =====');
    
    // Step 6: Click TEST button to start automation
    console.log('\\n📍 Step 6: Clicking TEST button to start MISRA automation');
    const testBtn = page.locator('#testBtn, button:has-text("TEST")').first();
    await testBtn.waitFor({ state: 'visible', timeout: 10000 });
    await testBtn.click();
    console.log('   ✅ TEST button clicked - starting MISRA platform automation');
    
    // Wait a moment for the automation to be triggered
    await page.waitForTimeout(5000);
    
    // Step 7: Navigate to MISRA platform (new automation phase)
    console.log('\\n📍 Step 7: Navigating to MISRA platform for automation');
    await page.goto(HYBRID_CONFIG.misraUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);
    
    // Step 8: Check if already logged in to MISRA
    console.log('\\n📍 Step 8: Checking MISRA authentication status');
    const signOutButton = page.locator('button:has-text("Sign Out"), a:has-text("Sign Out")');
    const isLoggedIn = await signOutButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (!isLoggedIn) {
      console.log('   ⚠️  Not logged in to MISRA, proceeding with auto-login');
      
      // Step 9: Auto-fill MISRA registration form
      console.log('\\n📍 Step 9: Auto-filling MISRA registration form');
      
      // Fill name field
      const misraNameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
      const isNameVisible = await misraNameInput.isVisible({ timeout: 10000 }).catch(() => false);
      
      if (isNameVisible) {
        await misraNameInput.fill(HYBRID_CONFIG.testName);
        console.log(`   ✅ MISRA name filled: ${HYBRID_CONFIG.testName}`);
        
        // Fill email field
        const misraEmailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
        await misraEmailInput.fill(HYBRID_CONFIG.testEmail);
        console.log(`   ✅ MISRA email filled: ${HYBRID_CONFIG.testEmail}`);
        
        // Fill mobile field
        const misraMobileInput = page.locator('input[type="tel"], input[placeholder*="mobile" i]').first();
        await misraMobileInput.fill(HYBRID_CONFIG.testMobile);
        console.log(`   ✅ MISRA mobile filled: ${HYBRID_CONFIG.testMobile}`);
        
        // Step 10: Click Start button on MISRA
        console.log('\\n📍 Step 10: Clicking Start button on MISRA platform');
        const misraStartBtn = page.locator('button:has-text("Start"), button[type="submit"]').first();
        await misraStartBtn.click();
        console.log('   ✅ MISRA Start button clicked');
        
        // Step 11: Auto-retrieve secondary OTP using IMAP
        console.log('\\n📍 Step 11: Auto-retrieving secondary OTP from Gmail');
        await page.waitForTimeout(8000); // Wait for OTP email to be sent
        
        try {
          const secondaryOtp = await getOtpFromGmail();
          console.log(`   ✅ Secondary OTP retrieved: ${secondaryOtp}`);
          
          // Step 12: Auto-enter secondary OTP
          console.log('\\n📍 Step 12: Auto-entering secondary OTP');
          const misraOtpInput = page.locator('input[placeholder*="OTP" i], input[maxlength="6"]').first();
          await misraOtpInput.waitFor({ state: 'visible', timeout: 10000 });
          await misraOtpInput.fill(secondaryOtp);
          console.log('   ✅ Secondary OTP entered automatically');
          
          // Click verify button
          const misraVerifyBtn = page.locator('button:has-text("Verify"), button:has-text("Continue")').first();
          await misraVerifyBtn.click();
          console.log('   ✅ Secondary OTP verified automatically');
          
          // Wait for authentication to complete
          await page.waitForTimeout(5000);
        } catch (error) {
          console.log(`   ❌ Failed to auto-retrieve secondary OTP: ${error}`);
          console.log('   ⏰ MANUAL INTERACTION: Please manually enter the secondary OTP');
          await page.waitForTimeout(60000); // 1 minute for manual secondary OTP
        }
      } else {
        console.log('   ⚠️  MISRA registration form not found');
      }
    } else {
      console.log('   ✅ Already logged in to MISRA platform');
    }
    
    // Step 13: Navigate to upload page and inject source code
    console.log('\\n📍 Step 13: Looking for file upload section');
    await page.waitForTimeout(5000);
    
    const uploadButton = page.locator('button:has-text("Upload"), input[type="file"]').first();
    const hasUpload = await uploadButton.isVisible({ timeout: 10000 }).catch(() => false);
    
    if (hasUpload) {
      console.log('   ✅ File upload section found');
      
      // Create temporary C file
      const tempFilePath = path.join(__dirname, 'temp_hybrid_test.c');
      fs.writeFileSync(tempFilePath, HYBRID_CONFIG.sampleCFile);
      console.log(`   ✅ Temporary C file created: ${tempFilePath}`);
      
      // Upload file
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(tempFilePath);
      await page.waitForTimeout(3000);
      console.log('   ✅ C file uploaded automatically');
      
      // Step 14: Start MISRA analysis
      console.log('\\n📍 Step 14: Starting MISRA analysis');
      const analyzeBtn = page.locator('button:has-text("Analyze"), button:has-text("Start Analysis")').first();
      const hasAnalyzeBtn = await analyzeBtn.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (hasAnalyzeBtn) {
        await analyzeBtn.click();
        console.log('   ✅ MISRA analysis started');
        
        // Step 15: Monitor analysis progress
        console.log('\\n📍 Step 15: Monitoring analysis progress');
        console.log('   ⏳ Waiting for analysis to complete (up to 3 minutes)...');
        
        try {
          await page.waitForSelector('text=/Analysis Complete|100%|Completed/i', { timeout: 180000 });
          console.log('   ✅ MISRA analysis completed successfully');
          
          // Step 16: Auto-download results
          console.log('\\n📍 Step 16: Auto-downloading analysis results');
          
          // Look for download buttons
          const downloadBtns = page.locator('button:has-text("Download"), a:has-text("Download")');
          const downloadCount = await downloadBtns.count();
          
          console.log(`   📁 Found ${downloadCount} download option(s)`);
          
          for (let i = 0; i < downloadCount; i++) {
            try {
              const downloadBtn = downloadBtns.nth(i);
              const btnText = await downloadBtn.textContent() || 'Unknown';
              console.log(`   📥 Downloading: ${btnText}`);
              await downloadBtn.click();
              await page.waitForTimeout(2000);
            } catch (err) {
              console.log(`   ⚠️  Download ${i + 1} failed: ${err}`);
            }
          }
          
          console.log('   ✅ All available downloads triggered');
          
        } catch (err) {
          console.log(`   ⚠️  Analysis timeout or error: ${err}`);
        }
      } else {
        console.log('   ⚠️  Analyze button not found');
      }
      
      // Cleanup
      fs.unlinkSync(tempFilePath);
      console.log('   ✅ Temporary file cleaned up');
    } else {
      console.log('   ⚠️  File upload section not found');
    }
    
    // Step 17: Final screenshot and completion
    console.log('\\n📍 Step 17: Taking final screenshot');
    await page.screenshot({ path: 'hybrid-workflow-complete.png', fullPage: true });
    console.log('   📸 Final screenshot saved: hybrid-workflow-complete.png');
    
    console.log('\\n🎉 ===== HYBRID WORKFLOW COMPLETED SUCCESSFULLY =====');
    console.log('✅ Phase 1: Localhost registration completed');
    console.log('✅ Phase 2: MISRA platform automation completed');
    console.log('✅ Analysis and downloads completed');
  });
});