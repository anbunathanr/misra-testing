import { APIGatewayProxyHandler } from 'aws-lambda';
import { chromium } from 'playwright-core';
import { ImapClient } from '../utils/imap-client';
import { AwsHelper } from '../utils/aws-helper';
import { Logger } from '../utils/logger';

const logger = new Logger('MISRATester');
const awsHelper = new AwsHelper();

interface TestRequest {
  testEmail: string;
  baseUrl: string;
  codeContent: string;
  executionId: string;
}

interface TestResult {
  success: boolean;
  complianceScore: number;
  violations: Array<{ rule: string; severity: string; message: string }>;
  reportUrl?: string;
  errorScreenshotUrl?: string;
  timestamp: string;
  executionId: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const executionId = event.requestContext.requestId;
  logger.info(`Starting MISRA test execution: ${executionId}`);

  try {
    // Parse request
    const body = JSON.parse(event.body || '{}') as TestRequest;
    const { testEmail, baseUrl, codeContent } = body;

    // Validate inputs
    if (!testEmail || !baseUrl || !codeContent) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: testEmail, baseUrl, codeContent' }),
      };
    }

    // Fetch secrets from AWS Secrets Manager
    const secrets = await awsHelper.getSecrets(['IMAP_PASS', 'TEST_EMAIL']);
    const imapPass = secrets.IMAP_PASS;

    // Launch browser
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      // Step 1: Check if already logged in
      logger.info('Checking login status...');
      await page.goto(baseUrl, { waitUntil: 'networkidle' });

      const signOutBtn = page.getByRole('button', { name: /sign out/i });
      const isLoggedIn = await signOutBtn.isVisible({ timeout: 2000 }).catch(() => false);

      if (!isLoggedIn) {
        logger.info('Not logged in, proceeding with OTP authentication...');
        await performOtpLogin(page, baseUrl, testEmail, imapPass);
      } else {
        logger.info('Already logged in, skipping authentication');
      }

      // Step 2: Upload C file
      logger.info('Uploading C file for analysis...');
      await uploadAndAnalyze(page, codeContent);

      // Step 3: Wait for analysis completion
      logger.info('Waiting for analysis to complete...');
      const analysisResult = await waitForAnalysisCompletion(page);

      // Step 4: Extract compliance data
      logger.info('Extracting compliance report...');
      const complianceData = await extractComplianceData(page);

      // Step 5: Save report to S3
      const reportUrl = await awsHelper.saveReportToS3(
        executionId,
        complianceData,
        await page.content()
      );

      logger.info(`Analysis completed successfully. Report: ${reportUrl}`);

      const result: TestResult = {
        success: true,
        complianceScore: complianceData.score,
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
      logger.error(`Test execution failed: ${error}`);

      // Capture error screenshot
      const screenshotUrl = await page
        .screenshot({ path: `/tmp/error-${executionId}.png` })
        .then((buffer) => awsHelper.uploadScreenshotToS3(executionId, buffer, 'error'))
        .catch(() => undefined);

      const result: TestResult = {
        success: false,
        complianceScore: 0,
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
    logger.error(`Handler error: ${error}`);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function performOtpLogin(
  page: any,
  baseUrl: string,
  testEmail: string,
  imapPass: string
): Promise<void> {
  // Navigate to login
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });

  // Enter email
  const emailInput = page.locator('input[type="email"]');
  await emailInput.fill(testEmail);
  logger.info('Email entered');

  // Trigger OTP
  const continueBtn = page.locator(
    'button:has-text("Continue"), button:has-text("Next"), button:has-text("Sign In")'
  );
  await continueBtn.click();
  await page.waitForTimeout(2000);
  logger.info('OTP request triggered');

  // Wait for OTP input
  const otpInput = page.locator('input[placeholder*="OTP"], input[placeholder*="code"]');
  await otpInput.first().waitFor({ state: 'visible', timeout: 10000 });
  logger.info('OTP input detected');

  // Fetch OTP from Gmail
  const imapClient = new ImapClient(testEmail, imapPass);
  const otp = await imapClient.fetchOtp();
  logger.info(`OTP fetched: ${otp}`);

  // Enter OTP
  const otpCount = await otpInput.count();
  if (otpCount > 1) {
    await otpInput.first().pressSequentially(otp, { delay: 100 });
  } else {
    await otpInput.fill(otp);
  }
  logger.info('OTP entered');

  // Click verify
  const verifyBtn = page.locator('button:has-text("Verify"), button:has-text("Confirm")');
  const hasVerify = await verifyBtn.isVisible({ timeout: 1000 }).catch(() => false);

  if (hasVerify) {
    await verifyBtn.click();
  }

  // Wait for authentication (UI-based check)
  const signOutBtn = page.getByRole('button', { name: /sign out/i });
  await signOutBtn.waitFor({ state: 'visible', timeout: 15000 });
  logger.info('Authentication successful');
}

async function uploadAndAnalyze(page: any, codeContent: string): Promise<void> {
  // Create temporary C file
  const fs = require('fs');
  const path = require('path');
  const tempDir = '/tmp';
  const filePath = path.join(tempDir, `test-${Date.now()}.c`);
  fs.writeFileSync(filePath, codeContent);

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);
  logger.info('File uploaded');

  // Click analyze button
  const analyzeBtn = page.getByRole('button', { name: /analyze|start analysis|run misra/i });
  await analyzeBtn.waitFor({ state: 'visible', timeout: 10000 });
  await analyzeBtn.click();
  logger.info('Analysis started');
}

async function waitForAnalysisCompletion(page: any): Promise<void> {
  // Wait for Download Report button or 100% completion indicator
  const downloadBtn = page.locator('button:has-text("Download"), button:has-text("Export")');
  const completionIndicator = page.locator('text=/100%|completed|finished/i');

  await Promise.race([
    downloadBtn.waitFor({ state: 'visible', timeout: 300000 }),
    completionIndicator.waitFor({ state: 'visible', timeout: 300000 }),
  ]);

  logger.info('Analysis completed');
}

async function extractComplianceData(page: any): Promise<any> {
  // Extract compliance score
  const scoreText = await page
    .locator('[class*="score"], [class*="compliance"], text=/\\d+%/')
    .innerText()
    .catch(() => '0%');

  const scoreMatch = scoreText.match(/(\d+)%/);
  const score = scoreMatch ? parseInt(scoreMatch[1]) : 0;

  // Extract violations
  const violationsTable = page.locator('table, [role="table"], [class*="violations"]');
  const violations: Array<{ rule: string; severity: string; message: string }> = [];

  if (await violationsTable.isVisible().catch(() => false)) {
    const rows = await violationsTable.locator('tr, [role="row"]').all();

    for (const row of rows.slice(1)) {
      // Skip header
      const cells = await row.locator('td, [role="cell"]').allTextContents();
      if (cells.length >= 3) {
        violations.push({
          rule: cells[0]?.trim() || '',
          severity: cells[1]?.trim() || '',
          message: cells[2]?.trim() || '',
        });
      }
    }
  }

  logger.info(`Extracted ${violations.length} violations`);

  return { score, violations };
}
