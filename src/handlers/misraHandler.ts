import { APIGatewayProxyHandler } from 'aws-lambda';
import { chromium } from 'playwright-core';
import { ImapProvider } from '../utils/imapProvider';
import { AwsBridge } from '../utils/awsBridge';
import { Logger } from '../utils/logger';

const logger = new Logger('MisraHandler');
const awsBridge = new AwsBridge();

const MISRA_BASE_URL = 'https://misra.digitransolutions.in';
const ANALYSIS_TIMEOUT = 90000; // 90 seconds

interface MisraTestRequest {
  testEmail: string;
  codeContent: string;
  executionId: string;
}

interface MisraTestResult {
  success: boolean;
  complianceScore: number;
  violationCount: number;
  violations: Array<{ rule: string; severity: string; message: string }>;
  reportUrl?: string;
  errorScreenshotUrl?: string;
  timestamp: string;
  executionId: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const executionId = event.requestContext.requestId;
  logger.info(`🚀 Starting MISRA automation for ${MISRA_BASE_URL} | Execution: ${executionId}`);

  try {
    // Parse request
    const body = JSON.parse(event.body || '{}') as MisraTestRequest;
    const { testEmail, codeContent } = body;

    if (!testEmail || !codeContent) {
      logger.error('Missing required fields: testEmail, codeContent');
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields' }),
      };
    }

    // Fetch secrets
    logger.info('📦 Fetching secrets from AWS Secrets Manager...');
    const secrets = await awsBridge.getSecrets(['IMAP_PASS']);
    const imapPass = secrets.IMAP_PASS;

    if (!imapPass) {
      throw new Error('IMAP_PASS not found in Secrets Manager');
    }

    // Launch browser
    logger.info('🌐 Launching Chromium browser...');
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Check session
      logger.info('🔍 Checking for active session...');
      await page.goto(MISRA_BASE_URL, { waitUntil: 'networkidle' });

      const signOutBtn = page.locator('button:has-text("Sign Out")');
      const isLoggedIn = await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (!isLoggedIn) {
        logger.info('❌ No active session. Proceeding with OTP login...');
        await performOtpLogin(page, testEmail, imapPass);
      } else {
        logger.info('✅ Active session detected. Skipping login.');
      }

      // Step 2: Upload C file
      logger.info('📤 Uploading C file for analysis...');
      await uploadCFile(page, codeContent);

      // Step 3: Wait for analysis completion
      logger.info('⏳ Waiting for analysis to complete...');
      await waitForAnalysisCompletion(page);

      // Step 4: Extract compliance data
      logger.info('📊 Extracting compliance report...');
      const complianceData = await extractComplianceData(page);

      // Step 5: Save report to S3
      logger.info('💾 Saving report to S3...');
      const reportUrl = await awsBridge.saveReportToS3(executionId, complianceData);

      logger.info(`✅ Analysis completed successfully | Score: ${complianceData.score}%`);

      const result: MisraTestResult = {
        success: true,
        complianceScore: complianceData.score,
        violationCount: complianceData.violations.length,
        violations: complianceData.violations,
        reportUrl,
        timestamp: new Date().toISOString(),
        executionId,
      };

      return {
        statusCode: 200,
        body: JSON.stringify(result),
      };
    } catch (error) {
      logger.error(`❌ Test execution failed: ${error}`);

      // Capture error screenshot
      const screenshotUrl = await page
        .screenshot({ path: `/tmp/error-${executionId}.png` })
        .then((buffer) => awsBridge.uploadScreenshotToS3(executionId, buffer, 'error'))
        .catch(() => undefined);

      const result: MisraTestResult = {
        success: false,
        complianceScore: 0,
        violationCount: 0,
        violations: [],
        errorScreenshotUrl: screenshotUrl,
        timestamp: new Date().toISOString(),
        executionId,
      };

      return {
        statusCode: 500,
        body: JSON.stringify(result),
      };
    } finally {
      await context.close();
      await browser.close();
    }
  } catch (error) {
    logger.error(`💥 Handler error: ${error}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: String(error) }),
    };
  }
};

async function performOtpLogin(page: any, testEmail: string, imapPass: string): Promise<void> {
  logger.info(`🔐 Starting OTP login for ${testEmail}...`);

  // Navigate to login
  await page.goto(`${MISRA_BASE_URL}/login`, { waitUntil: 'networkidle' });
  logger.info('📍 Navigated to login page');

  // Enter email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.waitFor({ state: 'visible', timeout: 10000 });
  await emailInput.fill(testEmail);
  logger.info('✉️ Email entered');

  // Trigger OTP - listen for API call
  page.on('response', async (response: any) => {
    if (response.url().includes('generate-otp')) {
      const status = response.status();
      logger.info(`📡 generate-otp API response: ${status}`);
    }
  });

  const continueBtn = page.locator(
    'button:has-text("Continue"), button:has-text("Next"), button:has-text("Sign In"), button:has-text("Login")'
  );
  await continueBtn.click();
  logger.info('🔘 Continue button clicked');

  // Wait for OTP input
  await page.waitForTimeout(2000);
  const otpInput = page.locator('input[placeholder*="OTP"], input[placeholder*="code"], input[maxlength="1"]');
  await otpInput.first().waitFor({ state: 'visible', timeout: 10000 });
  logger.info('📝 OTP input field detected');

  // Fetch OTP from Gmail
  logger.info('📧 Fetching OTP from Gmail IMAP...');
  const imapProvider = new ImapProvider(testEmail, imapPass);
  const otp = await imapProvider.fetchOtp();
  logger.info(`🔑 OTP retrieved: ${otp}`);

  // Enter OTP
  const otpCount = await otpInput.count();
  if (otpCount > 1) {
    logger.info(`📌 Multi-digit OTP input detected (${otpCount} fields)`);
    await otpInput.first().click();
    await otpInput.first().pressSequentially(otp, { delay: 100 });
  } else {
    logger.info('📌 Single OTP input field');
    await otpInput.fill(otp);
  }
  logger.info('✅ OTP entered');

  // Click verify
  const verifyBtn = page.locator('button:has-text("Verify"), button:has-text("Confirm"), button:has-text("Submit")');
  const hasVerify = await verifyBtn.isVisible({ timeout: 1000 }).catch(() => false);

  if (hasVerify) {
    logger.info('🔘 Clicking Verify button');
    await verifyBtn.click();
  } else {
    logger.info('⚡ OTP auto-submitted');
  }

  // Wait for authentication - UI-based check
  logger.info('⏳ Waiting for authentication to complete...');
  const signOutBtn = page.getByRole('button', { name: /sign out/i });
  await signOutBtn.waitFor({ state: 'visible', timeout: 15000 });
  logger.info('✅ Authentication successful - Sign Out button visible');
}

async function uploadCFile(page: any, codeContent: string): Promise<void> {
  // Create temporary C file
  const fs = require('fs');
  const path = require('path');
  const tempDir = '/tmp';
  const filePath = path.join(tempDir, `misra-test-${Date.now()}.c`);
  fs.writeFileSync(filePath, codeContent);
  logger.info(`📄 Temporary C file created: ${filePath}`);

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.waitFor({ state: 'visible', timeout: 10000 });
  await fileInput.setInputFiles(filePath);
  logger.info('✅ File uploaded');

  // Click analyze button
  const analyzeBtn = page.getByRole('button', {
    name: /analyze|start analysis|run misra|analyze misra/i,
  });
  await analyzeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await analyzeBtn.click();
  logger.info('🚀 Analysis started');
}

async function waitForAnalysisCompletion(page: any): Promise<void> {
  // Method 1: Wait for completion indicator
  const completionIndicator = page.locator('text=/100%|completed|finished|analysis complete/i');

  // Method 2: Wait for Download/Export button
  const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Export"), button:has-text("PDF")');

  // Method 3: Wait for specific class
  const analysisCompleted = page.locator('.analysis-completed, [class*="completed"], [class*="success"]');

  try {
    await Promise.race([
      completionIndicator.waitFor({ state: 'visible', timeout: ANALYSIS_TIMEOUT }),
      downloadBtn.waitFor({ state: 'visible', timeout: ANALYSIS_TIMEOUT }),
      analysisCompleted.waitFor({ state: 'visible', timeout: ANALYSIS_TIMEOUT }),
    ]);

    logger.info('✅ Analysis completion detected');
  } catch (error) {
    logger.warn(`⚠️ Completion indicator not found, checking page content...`);

    // Fallback: Check page content for completion
    const pageContent = await page.locator('body').innerText();
    if (pageContent.includes('100%') || pageContent.includes('completed')) {
      logger.info('✅ Analysis completed (detected via page content)');
    } else {
      throw new Error('Analysis did not complete within timeout');
    }
  }
}

async function extractComplianceData(page: any): Promise<any> {
  logger.info('📊 Extracting compliance data...');

  // Extract compliance score
  const scoreText = await page
    .locator('[class*="score"], [class*="compliance"], text=/\\d+%/')
    .innerText()
    .catch(() => '0%');

  const scoreMatch = scoreText.match(/(\d+)%/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;
  logger.info(`📈 Compliance Score: ${score}%`);

  // Extract violations
  const violationsTable = page.locator('table, [role="table"], [class*="violations"]');
  const violations: Array<{ rule: string; severity: string; message: string }> = [];

  try {
    if (await violationsTable.isVisible().catch(() => false)) {
      const rows = await violationsTable.locator('tr, [role="row"]').all();
      logger.info(`📋 Found ${rows.length} rows in violations table`);

      for (const row of rows.slice(1)) {
        // Skip header
        const cells = await row.locator('td, [role="cell"]').allTextContents();
        if (cells.length >= 2) {
          violations.push({
            rule: cells[0]?.trim() || '',
            severity: cells[1]?.trim() || '',
            message: cells[2]?.trim() || '',
          });
        }
      }
    }
  } catch (error) {
    logger.warn(`⚠️ Error extracting violations table: ${error}`);
  }

  logger.info(`🔍 Extracted ${violations.length} violations`);

  return { score, violations };
}
