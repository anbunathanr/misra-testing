"use strict";
/**
 * Browser Service for Playwright automation in AWS Lambda
 * Handles browser initialization, configuration, and cleanup
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserService = exports.BrowserService = void 0;
const playwright_core_1 = require("playwright-core");
const chromium_1 = __importDefault(require("@sparticuz/chromium"));
class BrowserService {
    static instance;
    currentSession = null;
    constructor() { }
    static getInstance() {
        if (!BrowserService.instance) {
            BrowserService.instance = new BrowserService();
        }
        return BrowserService.instance;
    }
    /**
     * Initialize a new browser session with Playwright
     * Configured for AWS Lambda environment with headless Chromium
     */
    async initializeBrowser() {
        try {
            console.log('Initializing browser for Lambda environment...');
            // Launch Chromium with Lambda-compatible configuration
            const browser = await playwright_core_1.chromium.launch({
                args: chromium_1.default.args,
                executablePath: await chromium_1.default.executablePath(),
                headless: chromium_1.default.headless === true || chromium_1.default.headless === 'shell',
            });
            console.log('Browser launched successfully');
            // Create browser context with standard viewport
            const context = await browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ignoreHTTPSErrors: true, // Allow self-signed certificates in test environments
            });
            console.log('Browser context created');
            // Create a new page
            const page = await context.newPage();
            console.log('Page created successfully');
            // Set default timeouts
            page.setDefaultTimeout(30000); // 30 seconds
            page.setDefaultNavigationTimeout(30000);
            this.currentSession = { browser, context, page };
            return this.currentSession;
        }
        catch (error) {
            console.error('Failed to initialize browser:', error);
            throw new Error(`Browser initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get the current browser session
     * Throws error if no session is active
     */
    getCurrentSession() {
        if (!this.currentSession) {
            throw new Error('No active browser session. Call initializeBrowser() first.');
        }
        return this.currentSession;
    }
    /**
     * Check if a browser session is currently active
     */
    hasActiveSession() {
        return this.currentSession !== null;
    }
    /**
     * Clean up browser resources
     * Closes page, context, and browser in proper order
     */
    async cleanup() {
        if (!this.currentSession) {
            console.log('No active browser session to clean up');
            return;
        }
        try {
            console.log('Starting browser cleanup...');
            const { page, context, browser } = this.currentSession;
            // Close page first
            if (page && !page.isClosed()) {
                await page.close();
                console.log('Page closed');
            }
            // Close context
            if (context) {
                await context.close();
                console.log('Context closed');
            }
            // Close browser
            if (browser && browser.isConnected()) {
                await browser.close();
                console.log('Browser closed');
            }
            this.currentSession = null;
            console.log('Browser cleanup completed successfully');
        }
        catch (error) {
            console.error('Error during browser cleanup:', error);
            // Still set session to null even if cleanup fails
            this.currentSession = null;
            throw new Error(`Browser cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Force cleanup - attempts cleanup without throwing errors
     * Use in finally blocks or error handlers
     */
    async forceCleanup() {
        try {
            await this.cleanup();
        }
        catch (error) {
            console.error('Force cleanup encountered error (suppressed):', error);
            this.currentSession = null;
        }
    }
    /**
     * Get browser version information
     */
    async getBrowserVersion() {
        if (!this.currentSession) {
            return 'No active session';
        }
        try {
            return this.currentSession.browser.version();
        }
        catch (error) {
            console.error('Failed to get browser version:', error);
            return 'Unknown';
        }
    }
}
exports.BrowserService = BrowserService;
// Export singleton instance
exports.browserService = BrowserService.getInstance();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3Nlci1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYnJvd3Nlci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7OztBQUVILHFEQUEwRTtBQUMxRSxtRUFBOEM7QUFROUMsTUFBYSxjQUFjO0lBQ2pCLE1BQU0sQ0FBQyxRQUFRLENBQWlCO0lBQ2hDLGNBQWMsR0FBMEIsSUFBSSxDQUFDO0lBRXJELGdCQUF1QixDQUFDO0lBRWpCLE1BQU0sQ0FBQyxXQUFXO1FBQ3ZCLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDN0IsY0FBYyxDQUFDLFFBQVEsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ2pELENBQUM7UUFDRCxPQUFPLGNBQWMsQ0FBQyxRQUFRLENBQUM7SUFDakMsQ0FBQztJQUVEOzs7T0FHRztJQUNJLEtBQUssQ0FBQyxpQkFBaUI7UUFDNUIsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnREFBZ0QsQ0FBQyxDQUFDO1lBRTlELHVEQUF1RDtZQUN2RCxNQUFNLE9BQU8sR0FBRyxNQUFNLDBCQUFRLENBQUMsTUFBTSxDQUFDO2dCQUNwQyxJQUFJLEVBQUUsa0JBQVcsQ0FBQyxJQUFJO2dCQUN0QixjQUFjLEVBQUUsTUFBTSxrQkFBVyxDQUFDLGNBQWMsRUFBRTtnQkFDbEQsUUFBUSxFQUFFLGtCQUFXLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxrQkFBVyxDQUFDLFFBQVEsS0FBSyxPQUFPO2FBQzVFLENBQUMsQ0FBQztZQUVILE9BQU8sQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQztZQUU3QyxnREFBZ0Q7WUFDaEQsTUFBTSxPQUFPLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDO2dCQUN2QyxRQUFRLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUU7Z0JBQ3RDLFNBQVMsRUFB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QixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDO1FBQ3pHLENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksS0FBSyxDQUFDLFlBQVk7UUFDdkIsSUFBSSxDQUFDO1lBQ0gsTUFBTSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtDQUErQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3RFLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzdCLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsaUJBQWlCO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsT0FBTyxtQkFBbUIsQ0FBQztRQUM3QixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMvQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDdkQsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztJQUNILENBQUM7Q0FDRjtBQWxKRCx3Q0FrSkM7QUFFRCw0QkFBNEI7QUFDZixRQUFBLGNBQWMsR0FBRyxjQUFjLENBQUMsV0FBVyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQnJvd3NlciBTZXJ2aWNlIGZvciBQbGF5d3JpZ2h0IGF1dG9tYXRpb24gaW4gQVdTIExhbWJkYVxyXG4gKiBIYW5kbGVzIGJyb3dzZXIgaW5pdGlhbGl6YXRpb24sIGNvbmZpZ3VyYXRpb24sIGFuZCBjbGVhbnVwXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgY2hyb21pdW0sIEJyb3dzZXIsIEJyb3dzZXJDb250ZXh0LCBQYWdlIH0gZnJvbSAncGxheXdyaWdodC1jb3JlJztcclxuaW1wb3J0IGNocm9taXVtUGtnIGZyb20gJ0BzcGFydGljdXovY2hyb21pdW0nO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBCcm93c2VyU2Vzc2lvbiB7XHJcbiAgYnJvd3NlcjogQnJvd3NlcjtcclxuICBjb250ZXh0OiBCcm93c2VyQ29udGV4dDtcclxuICBwYWdlOiBQYWdlO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQnJvd3NlclNlcnZpY2Uge1xyXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBCcm93c2VyU2VydmljZTtcclxuICBwcml2YXRlIGN1cnJlbnRTZXNzaW9uOiBCcm93c2VyU2Vzc2lvbiB8IG51bGwgPSBudWxsO1xyXG5cclxuICBwcml2YXRlIGNvbnN0cnVjdG9yKCkge31cclxuXHJcbiAgcHVibGljIHN0YXRpYyBnZXRJbnN0YW5jZSgpOiBCcm93c2VyU2VydmljZSB7XHJcbiAgICBpZiAoIUJyb3dzZXJTZXJ2aWNlLmluc3RhbmNlKSB7XHJcbiAgICAgIEJyb3dzZXJTZXJ2aWNlLmluc3RhbmNlID0gbmV3IEJyb3dzZXJTZXJ2aWNlKCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gQnJvd3NlclNlcnZpY2UuaW5zdGFuY2U7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBJbml0aWFsaXplIGEgbmV3IGJyb3dzZXIgc2Vzc2lvbiB3aXRoIFBsYXl3cmlnaHRcclxuICAgKiBDb25maWd1cmVkIGZvciBBV1MgTGFtYmRhIGVudmlyb25tZW50IHdpdGggaGVhZGxlc3MgQ2hyb21pdW1cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgaW5pdGlhbGl6ZUJyb3dzZXIoKTogUHJvbWlzZTxCcm93c2VyU2Vzc2lvbj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc29sZS5sb2coJ0luaXRpYWxpemluZyBicm93c2VyIGZvciBMYW1iZGEgZW52aXJvbm1lbnQuLi4nKTtcclxuXHJcbiAgICAgIC8vIExhdW5jaCBDaHJvbWl1bSB3aXRoIExhbWJkYS1jb21wYXRpYmxlIGNvbmZpZ3VyYXRpb25cclxuICAgICAgY29uc3QgYnJvd3NlciA9IGF3YWl0IGNocm9taXVtLmxhdW5jaCh7XHJcbiAgICAgICAgYXJnczogY2hyb21pdW1Qa2cuYXJncyxcclxuICAgICAgICBleGVjdXRhYmxlUGF0aDogYXdhaXQgY2hyb21pdW1Qa2cuZXhlY3V0YWJsZVBhdGgoKSxcclxuICAgICAgICBoZWFkbGVzczogY2hyb21pdW1Qa2cuaGVhZGxlc3MgPT09IHRydWUgfHwgY2hyb21pdW1Qa2cuaGVhZGxlc3MgPT09ICdzaGVsbCcsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ0Jyb3dzZXIgbGF1bmNoZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgYnJvd3NlciBjb250ZXh0IHdpdGggc3RhbmRhcmQgdmlld3BvcnRcclxuICAgICAgY29uc3QgY29udGV4dCA9IGF3YWl0IGJyb3dzZXIubmV3Q29udGV4dCh7XHJcbiAgICAgICAgdmlld3BvcnQ6IHsgd2lkdGg6IDEyODAsIGhlaWdodDogNzIwIH0sXHJcbiAgICAgICAgdXNlckFnZW50OiAnTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzEyMC4wLjAuMCBTYWZhcmkvNTM3LjM2JyxcclxuICAgICAgICBpZ25vcmVIVFRQU0Vycm9yczogdHJ1ZSwgLy8gQWxsb3cgc2VsZi1zaWduZWQgY2VydGlmaWNhdGVzIGluIHRlc3QgZW52aXJvbm1lbnRzXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coJ0Jyb3dzZXIgY29udGV4dCBjcmVhdGVkJyk7XHJcblxyXG4gICAgICAvLyBDcmVhdGUgYSBuZXcgcGFnZVxyXG4gICAgICBjb25zdCBwYWdlID0gYXdhaXQgY29udGV4dC5uZXdQYWdlKCk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnUGFnZSBjcmVhdGVkIHN1Y2Nlc3NmdWxseScpO1xyXG5cclxuICAgICAgLy8gU2V0IGRlZmF1bHQgdGltZW91dHNcclxuICAgICAgcGFnZS5zZXREZWZhdWx0VGltZW91dCgzMDAwMCk7IC8vIDMwIHNlY29uZHNcclxuICAgICAgcGFnZS5zZXREZWZhdWx0TmF2aWdhdGlvblRpbWVvdXQoMzAwMDApO1xyXG5cclxuICAgICAgdGhpcy5jdXJyZW50U2Vzc2lvbiA9IHsgYnJvd3NlciwgY29udGV4dCwgcGFnZSB9O1xyXG5cclxuICAgICAgcmV0dXJuIHRoaXMuY3VycmVudFNlc3Npb247XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gaW5pdGlhbGl6ZSBicm93c2VyOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBCcm93c2VyIGluaXRpYWxpemF0aW9uIGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB0aGUgY3VycmVudCBicm93c2VyIHNlc3Npb25cclxuICAgKiBUaHJvd3MgZXJyb3IgaWYgbm8gc2Vzc2lvbiBpcyBhY3RpdmVcclxuICAgKi9cclxuICBwdWJsaWMgZ2V0Q3VycmVudFNlc3Npb24oKTogQnJvd3NlclNlc3Npb24ge1xyXG4gICAgaWYgKCF0aGlzLmN1cnJlbnRTZXNzaW9uKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignTm8gYWN0aXZlIGJyb3dzZXIgc2Vzc2lvbi4gQ2FsbCBpbml0aWFsaXplQnJvd3NlcigpIGZpcnN0LicpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXMuY3VycmVudFNlc3Npb247XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBhIGJyb3dzZXIgc2Vzc2lvbiBpcyBjdXJyZW50bHkgYWN0aXZlXHJcbiAgICovXHJcbiAgcHVibGljIGhhc0FjdGl2ZVNlc3Npb24oKTogYm9vbGVhbiB7XHJcbiAgICByZXR1cm4gdGhpcy5jdXJyZW50U2Vzc2lvbiAhPT0gbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENsZWFuIHVwIGJyb3dzZXIgcmVzb3VyY2VzXHJcbiAgICogQ2xvc2VzIHBhZ2UsIGNvbnRleHQsIGFuZCBicm93c2VyIGluIHByb3BlciBvcmRlclxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBjbGVhbnVwKCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKCF0aGlzLmN1cnJlbnRTZXNzaW9uKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdObyBhY3RpdmUgYnJvd3NlciBzZXNzaW9uIHRvIGNsZWFuIHVwJyk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZygnU3RhcnRpbmcgYnJvd3NlciBjbGVhbnVwLi4uJyk7XHJcblxyXG4gICAgICBjb25zdCB7IHBhZ2UsIGNvbnRleHQsIGJyb3dzZXIgfSA9IHRoaXMuY3VycmVudFNlc3Npb247XHJcblxyXG4gICAgICAvLyBDbG9zZSBwYWdlIGZpcnN0XHJcbiAgICAgIGlmIChwYWdlICYmICFwYWdlLmlzQ2xvc2VkKCkpIHtcclxuICAgICAgICBhd2FpdCBwYWdlLmNsb3NlKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1BhZ2UgY2xvc2VkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENsb3NlIGNvbnRleHRcclxuICAgICAgaWYgKGNvbnRleHQpIHtcclxuICAgICAgICBhd2FpdCBjb250ZXh0LmNsb3NlKCk7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0NvbnRleHQgY2xvc2VkJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIENsb3NlIGJyb3dzZXJcclxuICAgICAgaWYgKGJyb3dzZXIgJiYgYnJvd3Nlci5pc0Nvbm5lY3RlZCgpKSB7XHJcbiAgICAgICAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdCcm93c2VyIGNsb3NlZCcpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICB0aGlzLmN1cnJlbnRTZXNzaW9uID0gbnVsbDtcclxuICAgICAgY29uc29sZS5sb2coJ0Jyb3dzZXIgY2xlYW51cCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkdXJpbmcgYnJvd3NlciBjbGVhbnVwOicsIGVycm9yKTtcclxuICAgICAgLy8gU3RpbGwgc2V0IHNlc3Npb24gdG8gbnVsbCBldmVuIGlmIGNsZWFudXAgZmFpbHNcclxuICAgICAgdGhpcy5jdXJyZW50U2Vzc2lvbiA9IG51bGw7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgQnJvd3NlciBjbGVhbnVwIGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEZvcmNlIGNsZWFudXAgLSBhdHRlbXB0cyBjbGVhbnVwIHdpdGhvdXQgdGhyb3dpbmcgZXJyb3JzXHJcbiAgICogVXNlIGluIGZpbmFsbHkgYmxvY2tzIG9yIGVycm9yIGhhbmRsZXJzXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIGZvcmNlQ2xlYW51cCgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuY2xlYW51cCgpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRm9yY2UgY2xlYW51cCBlbmNvdW50ZXJlZCBlcnJvciAoc3VwcHJlc3NlZCk6JywgZXJyb3IpO1xyXG4gICAgICB0aGlzLmN1cnJlbnRTZXNzaW9uID0gbnVsbDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBicm93c2VyIHZlcnNpb24gaW5mb3JtYXRpb25cclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgZ2V0QnJvd3NlclZlcnNpb24oKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICAgIGlmICghdGhpcy5jdXJyZW50U2Vzc2lvbikge1xyXG4gICAgICByZXR1cm4gJ05vIGFjdGl2ZSBzZXNzaW9uJztcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICByZXR1cm4gdGhpcy5jdXJyZW50U2Vzc2lvbi5icm93c2VyLnZlcnNpb24oKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBnZXQgYnJvd3NlciB2ZXJzaW9uOicsIGVycm9yKTtcclxuICAgICAgcmV0dXJuICdVbmtub3duJztcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IGJyb3dzZXJTZXJ2aWNlID0gQnJvd3NlclNlcnZpY2UuZ2V0SW5zdGFuY2UoKTtcclxuIl19