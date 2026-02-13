/**
 * Screenshot Service
 * Handles screenshot capture with Playwright and upload to S3
 */

import { Page } from 'playwright-core';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

export class ScreenshotService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    this.bucketName = process.env.SCREENSHOTS_BUCKET_NAME || '';

    if (!this.bucketName) {
      console.warn('SCREENSHOTS_BUCKET_NAME environment variable not set');
    }
  }

  /**
   * Capture a screenshot from the current page
   * Returns the screenshot as a Buffer
   */
  public async captureScreenshot(page: Page): Promise<Buffer> {
    try {
      console.log('Capturing screenshot...');

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: true,
      });

      console.log(`Screenshot captured: ${screenshot.length} bytes`);

      return screenshot;
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload a screenshot to S3
   * Returns the S3 key for the uploaded screenshot
   */
  public async uploadScreenshot(screenshot: Buffer, executionId: string, stepIndex: number): Promise<string> {
    try {
      const timestamp = Date.now();
      const uniqueId = uuidv4();
      const key = `screenshots/${executionId}/step-${stepIndex}-${timestamp}-${uniqueId}.png`;

      console.log(`Uploading screenshot to S3: ${key}`);

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: screenshot,
          ContentType: 'image/png',
          Metadata: {
            executionId,
            stepIndex: stepIndex.toString(),
            timestamp: timestamp.toString(),
          },
        })
      );

      console.log(`Screenshot uploaded successfully: ${key}`);

      return key;
    } catch (error) {
      console.error('Failed to upload screenshot to S3:', error);
      throw new Error(`Screenshot upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Capture and upload a screenshot in one operation
   * Returns the S3 key for the uploaded screenshot
   */
  public async captureAndUpload(page: Page, executionId: string, stepIndex: number): Promise<string> {
    const screenshot = await this.captureScreenshot(page);
    const key = await this.uploadScreenshot(screenshot, executionId, stepIndex);
    return key;
  }

  /**
   * Attempt to capture and upload a screenshot, but don't throw on failure
   * Returns the S3 key if successful, undefined if failed
   * Use this when screenshot capture is optional (e.g., on test failures)
   */
  public async captureAndUploadSafe(page: Page, executionId: string, stepIndex: number): Promise<string | undefined> {
    try {
      return await this.captureAndUpload(page, executionId, stepIndex);
    } catch (error) {
      console.error('Screenshot capture/upload failed (non-fatal):', error);
      return undefined;
    }
  }
}

// Export singleton instance
export const screenshotService = new ScreenshotService();
