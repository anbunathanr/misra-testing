/**
 * Screenshot Service
 * Handles screenshot capture with Playwright and upload to S3
 */
import { Page } from 'playwright-core';
export declare class ScreenshotService {
    private s3Client;
    private bucketName;
    constructor();
    /**
     * Capture a screenshot from the current page
     * Returns the screenshot as a Buffer
     */
    captureScreenshot(page: Page): Promise<Buffer>;
    /**
     * Upload a screenshot to S3
     * Returns the S3 key for the uploaded screenshot
     */
    uploadScreenshot(screenshot: Buffer, executionId: string, stepIndex: number): Promise<string>;
    /**
     * Capture and upload a screenshot in one operation
     * Returns the S3 key for the uploaded screenshot
     */
    captureAndUpload(page: Page, executionId: string, stepIndex: number): Promise<string>;
    /**
     * Attempt to capture and upload a screenshot, but don't throw on failure
     * Returns the S3 key if successful, undefined if failed
     * Use this when screenshot capture is optional (e.g., on test failures)
     */
    captureAndUploadSafe(page: Page, executionId: string, stepIndex: number): Promise<string | undefined>;
}
export declare const screenshotService: ScreenshotService;
