"use strict";
/**
 * Screenshot Service
 * Handles screenshot capture with Playwright and upload to S3
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.screenshotService = exports.ScreenshotService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
class ScreenshotService {
    s3Client;
    bucketName;
    constructor() {
        this.s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        this.bucketName = process.env.SCREENSHOTS_BUCKET_NAME || '';
        if (!this.bucketName) {
            console.warn('SCREENSHOTS_BUCKET_NAME environment variable not set');
        }
    }
    /**
     * Capture a screenshot from the current page
     * Returns the screenshot as a Buffer
     */
    async captureScreenshot(page) {
        try {
            console.log('Capturing screenshot...');
            const screenshot = await page.screenshot({
                type: 'png',
                fullPage: true,
            });
            console.log(`Screenshot captured: ${screenshot.length} bytes`);
            return screenshot;
        }
        catch (error) {
            console.error('Failed to capture screenshot:', error);
            throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Upload a screenshot to S3
     * Returns the S3 key for the uploaded screenshot
     */
    async uploadScreenshot(screenshot, executionId, stepIndex) {
        try {
            const timestamp = Date.now();
            const uniqueId = (0, uuid_1.v4)();
            const key = `screenshots/${executionId}/step-${stepIndex}-${timestamp}-${uniqueId}.png`;
            console.log(`Uploading screenshot to S3: ${key}`);
            await this.s3Client.send(new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: screenshot,
                ContentType: 'image/png',
                Metadata: {
                    executionId,
                    stepIndex: stepIndex.toString(),
                    timestamp: timestamp.toString(),
                },
            }));
            console.log(`Screenshot uploaded successfully: ${key}`);
            return key;
        }
        catch (error) {
            console.error('Failed to upload screenshot to S3:', error);
            throw new Error(`Screenshot upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Capture and upload a screenshot in one operation
     * Returns the S3 key for the uploaded screenshot
     */
    async captureAndUpload(page, executionId, stepIndex) {
        const screenshot = await this.captureScreenshot(page);
        const key = await this.uploadScreenshot(screenshot, executionId, stepIndex);
        return key;
    }
    /**
     * Attempt to capture and upload a screenshot, but don't throw on failure
     * Returns the S3 key if successful, undefined if failed
     * Use this when screenshot capture is optional (e.g., on test failures)
     */
    async captureAndUploadSafe(page, executionId, stepIndex) {
        try {
            return await this.captureAndUpload(page, executionId, stepIndex);
        }
        catch (error) {
            console.error('Screenshot capture/upload failed (non-fatal):', error);
            return undefined;
        }
    }
}
exports.ScreenshotService = ScreenshotService;
// Export singleton instance
exports.screenshotService = new ScreenshotService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdC1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NyZWVuc2hvdC1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUdILGtEQUFnRTtBQUNoRSwrQkFBb0M7QUFFcEMsTUFBYSxpQkFBaUI7SUFDcEIsUUFBUSxDQUFXO0lBQ25CLFVBQVUsQ0FBUztJQUUzQjtRQUNFLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHVCQUF1QixJQUFJLEVBQUUsQ0FBQztRQUU1RCxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxJQUFJLENBQUMsc0RBQXNELENBQUMsQ0FBQztRQUN2RSxDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFVO1FBQ3ZDLElBQUksQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUV2QyxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ3ZDLElBQUksRUFBRSxLQUFLO2dCQUNYLFFBQVEsRUFBRSxJQUFJO2FBQ2YsQ0FBQyxDQUFDO1lBRUgsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsVUFBVSxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7WUFFL0QsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3RELE1BQU0sSUFBSSxLQUFLLENBQUMsOEJBQThCLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDNUcsQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsVUFBa0IsRUFBRSxXQUFtQixFQUFFLFNBQWlCO1FBQ3RGLElBQUksQ0FBQztZQUNILE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFBLFNBQU0sR0FBRSxDQUFDO1lBQzFCLE1BQU0sR0FBRyxHQUFHLGVBQWUsV0FBVyxTQUFTLFNBQVMsSUFBSSxTQUFTLElBQUksUUFBUSxNQUFNLENBQUM7WUFFeEYsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUVsRCxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUN0QixJQUFJLDRCQUFnQixDQUFDO2dCQUNuQixNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVU7Z0JBQ3ZCLEdBQUcsRUFBRSxHQUFHO2dCQUNSLElBQUksRUFBRSxVQUFVO2dCQUNoQixXQUFXLEVBQUUsV0FBVztnQkFDeEIsUUFBUSxFQUFFO29CQUNSLFdBQVc7b0JBQ1gsU0FBUyxFQUFFLFNBQVMsQ0FBQyxRQUFRLEVBQUU7b0JBQy9CLFNBQVMsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFO2lCQUNoQzthQUNGLENBQUMsQ0FDSCxDQUFDO1lBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUV4RCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMzRCxNQUFNLElBQUksS0FBSyxDQUFDLDZCQUE2QixLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQzNHLENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQVUsRUFBRSxXQUFtQixFQUFFLFNBQWlCO1FBQzlFLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUUsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxJQUFVLEVBQUUsV0FBbUIsRUFBRSxTQUFpQjtRQUNsRixJQUFJLENBQUM7WUFDSCxPQUFPLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtDQUErQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3RFLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUE3RkQsOENBNkZDO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU2NyZWVuc2hvdCBTZXJ2aWNlXHJcbiAqIEhhbmRsZXMgc2NyZWVuc2hvdCBjYXB0dXJlIHdpdGggUGxheXdyaWdodCBhbmQgdXBsb2FkIHRvIFMzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgUGFnZSB9IGZyb20gJ3BsYXl3cmlnaHQtY29yZSc7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBQdXRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcblxyXG5leHBvcnQgY2xhc3MgU2NyZWVuc2hvdFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgczNDbGllbnQ6IFMzQ2xpZW50O1xyXG4gIHByaXZhdGUgYnVja2V0TmFtZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuczNDbGllbnQgPSBuZXcgUzNDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbiAgICB0aGlzLmJ1Y2tldE5hbWUgPSBwcm9jZXNzLmVudi5TQ1JFRU5TSE9UU19CVUNLRVRfTkFNRSB8fCAnJztcclxuXHJcbiAgICBpZiAoIXRoaXMuYnVja2V0TmFtZSkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ1NDUkVFTlNIT1RTX0JVQ0tFVF9OQU1FIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhcHR1cmUgYSBzY3JlZW5zaG90IGZyb20gdGhlIGN1cnJlbnQgcGFnZVxyXG4gICAqIFJldHVybnMgdGhlIHNjcmVlbnNob3QgYXMgYSBCdWZmZXJcclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgY2FwdHVyZVNjcmVlbnNob3QocGFnZTogUGFnZSk6IFByb21pc2U8QnVmZmVyPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZygnQ2FwdHVyaW5nIHNjcmVlbnNob3QuLi4nKTtcclxuXHJcbiAgICAgIGNvbnN0IHNjcmVlbnNob3QgPSBhd2FpdCBwYWdlLnNjcmVlbnNob3Qoe1xyXG4gICAgICAgIHR5cGU6ICdwbmcnLFxyXG4gICAgICAgIGZ1bGxQYWdlOiB0cnVlLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBTY3JlZW5zaG90IGNhcHR1cmVkOiAke3NjcmVlbnNob3QubGVuZ3RofSBieXRlc2ApO1xyXG5cclxuICAgICAgcmV0dXJuIHNjcmVlbnNob3Q7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gY2FwdHVyZSBzY3JlZW5zaG90OicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTY3JlZW5zaG90IGNhcHR1cmUgZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBsb2FkIGEgc2NyZWVuc2hvdCB0byBTM1xyXG4gICAqIFJldHVybnMgdGhlIFMzIGtleSBmb3IgdGhlIHVwbG9hZGVkIHNjcmVlbnNob3RcclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgdXBsb2FkU2NyZWVuc2hvdChzY3JlZW5zaG90OiBCdWZmZXIsIGV4ZWN1dGlvbklkOiBzdHJpbmcsIHN0ZXBJbmRleDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IERhdGUubm93KCk7XHJcbiAgICAgIGNvbnN0IHVuaXF1ZUlkID0gdXVpZHY0KCk7XHJcbiAgICAgIGNvbnN0IGtleSA9IGBzY3JlZW5zaG90cy8ke2V4ZWN1dGlvbklkfS9zdGVwLSR7c3RlcEluZGV4fS0ke3RpbWVzdGFtcH0tJHt1bmlxdWVJZH0ucG5nYDtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBVcGxvYWRpbmcgc2NyZWVuc2hvdCB0byBTMzogJHtrZXl9YCk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLnMzQ2xpZW50LnNlbmQoXHJcbiAgICAgICAgbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICBLZXk6IGtleSxcclxuICAgICAgICAgIEJvZHk6IHNjcmVlbnNob3QsXHJcbiAgICAgICAgICBDb250ZW50VHlwZTogJ2ltYWdlL3BuZycsXHJcbiAgICAgICAgICBNZXRhZGF0YToge1xyXG4gICAgICAgICAgICBleGVjdXRpb25JZCxcclxuICAgICAgICAgICAgc3RlcEluZGV4OiBzdGVwSW5kZXgudG9TdHJpbmcoKSxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiB0aW1lc3RhbXAudG9TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBTY3JlZW5zaG90IHVwbG9hZGVkIHN1Y2Nlc3NmdWxseTogJHtrZXl9YCk7XHJcblxyXG4gICAgICByZXR1cm4ga2V5O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwbG9hZCBzY3JlZW5zaG90IHRvIFMzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTY3JlZW5zaG90IHVwbG9hZCBmYWlsZWQ6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYXB0dXJlIGFuZCB1cGxvYWQgYSBzY3JlZW5zaG90IGluIG9uZSBvcGVyYXRpb25cclxuICAgKiBSZXR1cm5zIHRoZSBTMyBrZXkgZm9yIHRoZSB1cGxvYWRlZCBzY3JlZW5zaG90XHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIGNhcHR1cmVBbmRVcGxvYWQocGFnZTogUGFnZSwgZXhlY3V0aW9uSWQ6IHN0cmluZywgc3RlcEluZGV4OiBudW1iZXIpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgY29uc3Qgc2NyZWVuc2hvdCA9IGF3YWl0IHRoaXMuY2FwdHVyZVNjcmVlbnNob3QocGFnZSk7XHJcbiAgICBjb25zdCBrZXkgPSBhd2FpdCB0aGlzLnVwbG9hZFNjcmVlbnNob3Qoc2NyZWVuc2hvdCwgZXhlY3V0aW9uSWQsIHN0ZXBJbmRleCk7XHJcbiAgICByZXR1cm4ga2V5O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQXR0ZW1wdCB0byBjYXB0dXJlIGFuZCB1cGxvYWQgYSBzY3JlZW5zaG90LCBidXQgZG9uJ3QgdGhyb3cgb24gZmFpbHVyZVxyXG4gICAqIFJldHVybnMgdGhlIFMzIGtleSBpZiBzdWNjZXNzZnVsLCB1bmRlZmluZWQgaWYgZmFpbGVkXHJcbiAgICogVXNlIHRoaXMgd2hlbiBzY3JlZW5zaG90IGNhcHR1cmUgaXMgb3B0aW9uYWwgKGUuZy4sIG9uIHRlc3QgZmFpbHVyZXMpXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIGNhcHR1cmVBbmRVcGxvYWRTYWZlKHBhZ2U6IFBhZ2UsIGV4ZWN1dGlvbklkOiBzdHJpbmcsIHN0ZXBJbmRleDogbnVtYmVyKTogUHJvbWlzZTxzdHJpbmcgfCB1bmRlZmluZWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIHJldHVybiBhd2FpdCB0aGlzLmNhcHR1cmVBbmRVcGxvYWQocGFnZSwgZXhlY3V0aW9uSWQsIHN0ZXBJbmRleCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdTY3JlZW5zaG90IGNhcHR1cmUvdXBsb2FkIGZhaWxlZCAobm9uLWZhdGFsKTonLCBlcnJvcik7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vLyBFeHBvcnQgc2luZ2xldG9uIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBzY3JlZW5zaG90U2VydmljZSA9IG5ldyBTY3JlZW5zaG90U2VydmljZSgpO1xyXG4iXX0=