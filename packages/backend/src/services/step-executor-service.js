"use strict";
/**
 * Step Executor Service
 * Executes individual test steps using Playwright or HTTP client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stepExecutorService = exports.StepExecutorService = void 0;
const axios_1 = __importDefault(require("axios"));
const screenshot_service_1 = require("./screenshot-service");
const retry_util_1 = require("../utils/retry-util");
class StepExecutorService {
    executionId = '';
    /**
     * Set the current execution ID for screenshot naming
     */
    setExecutionId(executionId) {
        this.executionId = executionId;
    }
    /**
     * Execute a navigate action
     * Navigates the browser to the specified URL
     */
    async executeNavigate(page, step, stepIndex) {
        const startTime = Date.now();
        try {
            if (!step.target) {
                throw new Error('Navigate action requires a target URL');
            }
            console.log(`Navigating to: ${step.target}`);
            // Use retry logic for navigation
            await (0, retry_util_1.retryWithBackoff)(async () => {
                await page.goto(step.target, {
                    timeout: 30000,
                    waitUntil: 'domcontentloaded',
                });
            }, {
                maxAttempts: 3,
                initialDelayMs: 1000,
                retryableErrors: ['timeout', 'net::ERR', 'Navigation timeout'],
            });
            const duration = Date.now() - startTime;
            return {
                stepIndex,
                action: 'navigate',
                status: 'pass',
                duration,
                details: {
                    url: step.target,
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Navigation failed';
            console.error(`Navigate action failed:`, errorMessage);
            // Capture screenshot on failure
            const screenshot = await screenshot_service_1.screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);
            return {
                stepIndex,
                action: 'navigate',
                status: 'fail',
                duration,
                errorMessage,
                screenshot,
                details: {
                    url: step.target,
                },
            };
        }
    }
    /**
     * Execute a click action
     * Locates an element by selector and clicks it
     */
    async executeClick(page, step, stepIndex) {
        const startTime = Date.now();
        try {
            if (!step.target) {
                throw new Error('Click action requires a target selector');
            }
            console.log(`Clicking element: ${step.target}`);
            // Use retry logic for click action
            await (0, retry_util_1.retryWithBackoff)(async () => {
                await page.click(step.target, {
                    timeout: 10000,
                });
            }, {
                maxAttempts: 3,
                initialDelayMs: 1000,
                retryableErrors: ['timeout', 'not found', 'not visible', 'detached'],
            });
            const duration = Date.now() - startTime;
            return {
                stepIndex,
                action: 'click',
                status: 'pass',
                duration,
                details: {
                    selector: step.target,
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Click action failed';
            console.error(`Click action failed:`, errorMessage);
            // Capture screenshot on failure
            const screenshot = await screenshot_service_1.screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);
            return {
                stepIndex,
                action: 'click',
                status: 'fail',
                duration,
                errorMessage,
                screenshot,
                details: {
                    selector: step.target,
                },
            };
        }
    }
    /**
     * Execute a type action
     * Locates an element by selector and inputs text
     */
    async executeType(page, step, stepIndex) {
        const startTime = Date.now();
        try {
            if (!step.target) {
                throw new Error('Type action requires a target selector');
            }
            if (step.value === undefined) {
                throw new Error('Type action requires a value to input');
            }
            console.log(`Typing into element: ${step.target}`);
            // Use retry logic for type action
            await (0, retry_util_1.retryWithBackoff)(async () => {
                await page.fill(step.target, step.value, {
                    timeout: 10000,
                });
            }, {
                maxAttempts: 3,
                initialDelayMs: 1000,
                retryableErrors: ['timeout', 'not found', 'not visible', 'detached'],
            });
            const duration = Date.now() - startTime;
            return {
                stepIndex,
                action: 'type',
                status: 'pass',
                duration,
                details: {
                    selector: step.target,
                    value: step.value,
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Type action failed';
            console.error(`Type action failed:`, errorMessage);
            // Capture screenshot on failure
            const screenshot = await screenshot_service_1.screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);
            return {
                stepIndex,
                action: 'type',
                status: 'fail',
                duration,
                errorMessage,
                screenshot,
                details: {
                    selector: step.target,
                    value: step.value,
                },
            };
        }
    }
    /**
     * Execute a wait action
     * Pauses execution for the specified duration
     */
    async executeWait(page, step, stepIndex) {
        const startTime = Date.now();
        try {
            // Parse duration from target or value field
            const durationMs = parseInt(step.value || step.target || '1000', 10);
            if (isNaN(durationMs) || durationMs < 0) {
                throw new Error('Wait action requires a valid duration in milliseconds');
            }
            console.log(`Waiting for ${durationMs}ms`);
            await page.waitForTimeout(durationMs);
            const duration = Date.now() - startTime;
            return {
                stepIndex,
                action: 'wait',
                status: 'pass',
                duration,
                details: {},
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Wait action failed';
            console.error(`Wait action failed:`, errorMessage);
            return {
                stepIndex,
                action: 'wait',
                status: 'fail',
                duration,
                errorMessage,
                details: {},
            };
        }
    }
    /**
     * Execute an assert action
     * Verifies that an element meets the specified condition
     */
    async executeAssert(page, step, stepIndex) {
        const startTime = Date.now();
        try {
            if (!step.target) {
                throw new Error('Assert action requires a target selector');
            }
            console.log(`Asserting element: ${step.target}`);
            // Determine assertion type from expectedResult or default to 'visible'
            const assertionType = step.expectedResult?.toLowerCase() || 'visible';
            // Use retry logic for assert action
            await (0, retry_util_1.retryWithBackoff)(async () => {
                // Wait for element to be present
                const element = await page.waitForSelector(step.target, {
                    timeout: 10000,
                    state: 'attached',
                });
                if (!element) {
                    throw new Error(`Element not found: ${step.target}`);
                }
                if (assertionType.includes('visible')) {
                    const isVisible = await element.isVisible();
                    if (!isVisible) {
                        throw new Error(`Element is not visible: ${step.target}`);
                    }
                }
                else if (assertionType.includes('text')) {
                    const text = await element.textContent();
                    const expectedText = step.value || '';
                    if (text !== expectedText) {
                        throw new Error(`Expected text "${expectedText}", got "${text}"`);
                    }
                }
                else if (assertionType.includes('value')) {
                    const value = await element.inputValue();
                    const expectedValue = step.value || '';
                    if (value !== expectedValue) {
                        throw new Error(`Expected value "${expectedValue}", got "${value}"`);
                    }
                }
            }, {
                maxAttempts: 3,
                initialDelayMs: 1000,
                retryableErrors: ['timeout', 'not found', 'not visible', 'detached'],
            });
            const duration = Date.now() - startTime;
            return {
                stepIndex,
                action: 'assert',
                status: 'pass',
                duration,
                details: {
                    selector: step.target,
                    assertion: assertionType,
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Assert action failed';
            console.error(`Assert action failed:`, errorMessage);
            // Capture screenshot on failure
            const screenshot = await screenshot_service_1.screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);
            return {
                stepIndex,
                action: 'assert',
                status: 'fail',
                duration,
                errorMessage,
                screenshot,
                details: {
                    selector: step.target,
                    assertion: step.expectedResult,
                },
            };
        }
    }
    /**
     * Execute an API call action
     * Makes an HTTP request and validates the response
     */
    async executeAPICall(step, stepIndex) {
        const startTime = Date.now();
        try {
            if (!step.target) {
                throw new Error('API call action requires a target URL');
            }
            // Parse method from expectedResult or default to GET
            const method = (step.expectedResult?.toUpperCase() || 'GET');
            // Parse headers and body from value if provided (JSON format)
            let headers = {};
            let body = undefined;
            if (step.value) {
                try {
                    const parsed = JSON.parse(step.value);
                    headers = parsed.headers || {};
                    body = parsed.body;
                }
                catch {
                    // If not JSON, treat value as body
                    body = step.value;
                }
            }
            console.log(`Making ${method} request to: ${step.target}`);
            const config = {
                method,
                url: step.target,
                headers,
                data: body,
                timeout: 30000,
                validateStatus: () => true, // Don't throw on any status code
            };
            // Use retry logic for API calls
            const response = await (0, retry_util_1.retryWithBackoff)(async () => {
                return await (0, axios_1.default)(config);
            }, {
                maxAttempts: 3,
                initialDelayMs: 1000,
                retryableErrors: [
                    'ETIMEDOUT',
                    'ECONNRESET',
                    'ECONNREFUSED',
                    'ENOTFOUND',
                    'network',
                    'timeout',
                ],
            });
            const duration = Date.now() - startTime;
            const apiRequest = {
                method,
                url: step.target,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            };
            const apiResponse = {
                statusCode: response.status,
                headers: response.headers,
                body: JSON.stringify(response.data),
                duration,
            };
            // Check if response status is acceptable (2xx or 3xx)
            const isSuccess = response.status >= 200 && response.status < 400;
            return {
                stepIndex,
                action: 'api-call',
                status: isSuccess ? 'pass' : 'fail',
                duration,
                errorMessage: isSuccess ? undefined : `HTTP ${response.status}: ${response.statusText}`,
                details: {
                    apiRequest,
                    apiResponse,
                },
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'API call failed';
            console.error(`API call action failed:`, errorMessage);
            return {
                stepIndex,
                action: 'api-call',
                status: 'error',
                duration,
                errorMessage,
                details: {
                    url: step.target,
                },
            };
        }
    }
    /**
     * Execute a test step based on its action type
     */
    async executeStep(page, step, stepIndex) {
        console.log(`Executing step ${stepIndex}: ${step.action}`);
        try {
            switch (step.action) {
                case 'navigate':
                    if (!page)
                        throw new Error('Page is required for navigate action');
                    return await this.executeNavigate(page, step, stepIndex);
                case 'click':
                    if (!page)
                        throw new Error('Page is required for click action');
                    return await this.executeClick(page, step, stepIndex);
                case 'type':
                    if (!page)
                        throw new Error('Page is required for type action');
                    return await this.executeType(page, step, stepIndex);
                case 'wait':
                    if (!page)
                        throw new Error('Page is required for wait action');
                    return await this.executeWait(page, step, stepIndex);
                case 'assert':
                    if (!page)
                        throw new Error('Page is required for assert action');
                    return await this.executeAssert(page, step, stepIndex);
                case 'api-call':
                    return await this.executeAPICall(step, stepIndex);
                default:
                    throw new Error(`Unknown action type: ${step.action}`);
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Step execution failed';
            console.error(`Step ${stepIndex} failed:`, errorMessage);
            return {
                stepIndex,
                action: step.action,
                status: 'error',
                duration: 0,
                errorMessage,
                details: {},
            };
        }
    }
}
exports.StepExecutorService = StepExecutorService;
// Export singleton instance
exports.stepExecutorService = new StepExecutorService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RlcC1leGVjdXRvci1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic3RlcC1leGVjdXRvci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7OztBQUdILGtEQUFrRDtBQUdsRCw2REFBeUQ7QUFDekQsb0RBQXVEO0FBRXZELE1BQWEsbUJBQW1CO0lBQ3RCLFdBQVcsR0FBVyxFQUFFLENBQUM7SUFFakM7O09BRUc7SUFDSSxjQUFjLENBQUMsV0FBbUI7UUFDdkMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7SUFDakMsQ0FBQztJQUNEOzs7T0FHRztJQUNJLEtBQUssQ0FBQyxlQUFlLENBQzFCLElBQVUsRUFDVixJQUFjLEVBQ2QsU0FBaUI7UUFFakIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBRTdCLElBQUksQ0FBQztZQUNILElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUNBQXVDLENBQUMsQ0FBQztZQUMzRCxDQUFDO1lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFFN0MsaUNBQWlDO1lBQ2pDLE1BQU0sSUFBQSw2QkFBZ0IsRUFDcEIsS0FBSyxJQUFJLEVBQUU7Z0JBQ1QsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFPLEVBQUU7b0JBQzVCLE9BQU8sRUFBRSxLQUFLO29CQUNkLFNBQVMsRUFBRSxrQkFBa0I7aUJBQzlCLENBQUMsQ0FBQztZQUNMLENBQUMsRUFDRDtnQkFDRSxXQUFXLEVBQUUsQ0FBQztnQkFDZCxjQUFjLEVBQUUsSUFBSTtnQkFDcEIsZUFBZSxFQUFFLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxvQkFBb0IsQ0FBQzthQUMvRCxDQUNGLENBQUM7WUFFRixNQUFNLFFBQVEs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T0FBTyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFdkQsS0FBSyxRQUFRO29CQUNYLElBQUksQ0FBQyxJQUFJO3dCQUFFLE1BQU0sSUFBSSxLQUFLLENBQUMsb0NBQW9DLENBQUMsQ0FBQztvQkFDakUsT0FBTyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFekQsS0FBSyxVQUFVO29CQUNiLE9BQU8sTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztnQkFFcEQ7b0JBQ0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDM0QsQ0FBQztRQUNILENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxZQUFZLEdBQUcsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUM7WUFDdEYsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLFNBQVMsVUFBVSxFQUFFLFlBQVksQ0FBQyxDQUFDO1lBRXpELE9BQU87Z0JBQ0wsU0FBUztnQkFDVCxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07Z0JBQ25CLE1BQU0sRUFBRSxPQUFPO2dCQUNmLFFBQVEsRUFBRSxDQUFDO2dCQUNYLFlBQVk7Z0JBQ1osT0FBTyxFQUFFLEVBQUU7YUFDWixDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7Q0FDRjtBQTNnQkQsa0RBMmdCQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsbUJBQW1CLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFN0ZXAgRXhlY3V0b3IgU2VydmljZVxyXG4gKiBFeGVjdXRlcyBpbmRpdmlkdWFsIHRlc3Qgc3RlcHMgdXNpbmcgUGxheXdyaWdodCBvciBIVFRQIGNsaWVudFxyXG4gKi9cclxuXHJcbmltcG9ydCB7IFBhZ2UgfSBmcm9tICdwbGF5d3JpZ2h0LWNvcmUnO1xyXG5pbXBvcnQgYXhpb3MsIHsgQXhpb3NSZXF1ZXN0Q29uZmlnIH0gZnJvbSAnYXhpb3MnO1xyXG5pbXBvcnQgeyBUZXN0U3RlcCB9IGZyb20gJy4uL3R5cGVzL3Rlc3QtY2FzZSc7XHJcbmltcG9ydCB7IFN0ZXBSZXN1bHQsIEFQSVJlcXVlc3REZXRhaWxzLCBBUElSZXNwb25zZURldGFpbHMgfSBmcm9tICcuLi90eXBlcy90ZXN0LWV4ZWN1dGlvbic7XHJcbmltcG9ydCB7IHNjcmVlbnNob3RTZXJ2aWNlIH0gZnJvbSAnLi9zY3JlZW5zaG90LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyByZXRyeVdpdGhCYWNrb2ZmIH0gZnJvbSAnLi4vdXRpbHMvcmV0cnktdXRpbCc7XHJcblxyXG5leHBvcnQgY2xhc3MgU3RlcEV4ZWN1dG9yU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBleGVjdXRpb25JZDogc3RyaW5nID0gJyc7XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCB0aGUgY3VycmVudCBleGVjdXRpb24gSUQgZm9yIHNjcmVlbnNob3QgbmFtaW5nXHJcbiAgICovXHJcbiAgcHVibGljIHNldEV4ZWN1dGlvbklkKGV4ZWN1dGlvbklkOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIHRoaXMuZXhlY3V0aW9uSWQgPSBleGVjdXRpb25JZDtcclxuICB9XHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBhIG5hdmlnYXRlIGFjdGlvblxyXG4gICAqIE5hdmlnYXRlcyB0aGUgYnJvd3NlciB0byB0aGUgc3BlY2lmaWVkIFVSTFxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBleGVjdXRlTmF2aWdhdGUoXHJcbiAgICBwYWdlOiBQYWdlLFxyXG4gICAgc3RlcDogVGVzdFN0ZXAsXHJcbiAgICBzdGVwSW5kZXg6IG51bWJlclxyXG4gICk6IFByb21pc2U8U3RlcFJlc3VsdD4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoIXN0ZXAudGFyZ2V0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdOYXZpZ2F0ZSBhY3Rpb24gcmVxdWlyZXMgYSB0YXJnZXQgVVJMJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBOYXZpZ2F0aW5nIHRvOiAke3N0ZXAudGFyZ2V0fWApO1xyXG4gICAgICBcclxuICAgICAgLy8gVXNlIHJldHJ5IGxvZ2ljIGZvciBuYXZpZ2F0aW9uXHJcbiAgICAgIGF3YWl0IHJldHJ5V2l0aEJhY2tvZmYoXHJcbiAgICAgICAgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgYXdhaXQgcGFnZS5nb3RvKHN0ZXAudGFyZ2V0ISwge1xyXG4gICAgICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICAgICAgd2FpdFVudGlsOiAnZG9tY29udGVudGxvYWRlZCcsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG1heEF0dGVtcHRzOiAzLFxyXG4gICAgICAgICAgaW5pdGlhbERlbGF5TXM6IDEwMDAsXHJcbiAgICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICduZXQ6OkVSUicsICdOYXZpZ2F0aW9uIHRpbWVvdXQnXSxcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0ZXBJbmRleCxcclxuICAgICAgICBhY3Rpb246ICduYXZpZ2F0ZScsXHJcbiAgICAgICAgc3RhdHVzOiAncGFzcycsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgdXJsOiBzdGVwLnRhcmdldCxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdOYXZpZ2F0aW9uIGZhaWxlZCc7XHJcblxyXG4gICAgICBjb25zb2xlLmVycm9yKGBOYXZpZ2F0ZSBhY3Rpb24gZmFpbGVkOmAsIGVycm9yTWVzc2FnZSk7XHJcblxyXG4gICAgICAvLyBDYXB0dXJlIHNjcmVlbnNob3Qgb24gZmFpbHVyZVxyXG4gICAgICBjb25zdCBzY3JlZW5zaG90ID0gYXdhaXQgc2NyZWVuc2hvdFNlcnZpY2UuY2FwdHVyZUFuZFVwbG9hZFNhZmUocGFnZSwgdGhpcy5leGVjdXRpb25JZCwgc3RlcEluZGV4KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RlcEluZGV4LFxyXG4gICAgICAgIGFjdGlvbjogJ25hdmlnYXRlJyxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsJyxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgc2NyZWVuc2hvdCxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICB1cmw6IHN0ZXAudGFyZ2V0LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFeGVjdXRlIGEgY2xpY2sgYWN0aW9uXHJcbiAgICogTG9jYXRlcyBhbiBlbGVtZW50IGJ5IHNlbGVjdG9yIGFuZCBjbGlja3MgaXRcclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgZXhlY3V0ZUNsaWNrKFxyXG4gICAgcGFnZTogUGFnZSxcclxuICAgIHN0ZXA6IFRlc3RTdGVwLFxyXG4gICAgc3RlcEluZGV4OiBudW1iZXJcclxuICApOiBQcm9taXNlPFN0ZXBSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKCFzdGVwLnRhcmdldCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2xpY2sgYWN0aW9uIHJlcXVpcmVzIGEgdGFyZ2V0IHNlbGVjdG9yJyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBDbGlja2luZyBlbGVtZW50OiAke3N0ZXAudGFyZ2V0fWApO1xyXG5cclxuICAgICAgLy8gVXNlIHJldHJ5IGxvZ2ljIGZvciBjbGljayBhY3Rpb25cclxuICAgICAgYXdhaXQgcmV0cnlXaXRoQmFja29mZihcclxuICAgICAgICBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICBhd2FpdCBwYWdlLmNsaWNrKHN0ZXAudGFyZ2V0ISwge1xyXG4gICAgICAgICAgICB0aW1lb3V0OiAxMDAwMCxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbWF4QXR0ZW1wdHM6IDMsXHJcbiAgICAgICAgICBpbml0aWFsRGVsYXlNczogMTAwMCxcclxuICAgICAgICAgIHJldHJ5YWJsZUVycm9yczogWyd0aW1lb3V0JywgJ25vdCBmb3VuZCcsICdub3QgdmlzaWJsZScsICdkZXRhY2hlZCddLFxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RlcEluZGV4LFxyXG4gICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICBzdGF0dXM6ICdwYXNzJyxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBzZWxlY3Rvcjogc3RlcC50YXJnZXQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnQ2xpY2sgYWN0aW9uIGZhaWxlZCc7XHJcblxyXG4gICAgICBjb25zb2xlLmVycm9yKGBDbGljayBhY3Rpb24gZmFpbGVkOmAsIGVycm9yTWVzc2FnZSk7XHJcblxyXG4gICAgICAvLyBDYXB0dXJlIHNjcmVlbnNob3Qgb24gZmFpbHVyZVxyXG4gICAgICBjb25zdCBzY3JlZW5zaG90ID0gYXdhaXQgc2NyZWVuc2hvdFNlcnZpY2UuY2FwdHVyZUFuZFVwbG9hZFNhZmUocGFnZSwgdGhpcy5leGVjdXRpb25JZCwgc3RlcEluZGV4KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RlcEluZGV4LFxyXG4gICAgICAgIGFjdGlvbjogJ2NsaWNrJyxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsJyxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgc2NyZWVuc2hvdCxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBzZWxlY3Rvcjogc3RlcC50YXJnZXQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgYSB0eXBlIGFjdGlvblxyXG4gICAqIExvY2F0ZXMgYW4gZWxlbWVudCBieSBzZWxlY3RvciBhbmQgaW5wdXRzIHRleHRcclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgZXhlY3V0ZVR5cGUoXHJcbiAgICBwYWdlOiBQYWdlLFxyXG4gICAgc3RlcDogVGVzdFN0ZXAsXHJcbiAgICBzdGVwSW5kZXg6IG51bWJlclxyXG4gICk6IFByb21pc2U8U3RlcFJlc3VsdD4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBpZiAoIXN0ZXAudGFyZ2V0KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlIGFjdGlvbiByZXF1aXJlcyBhIHRhcmdldCBzZWxlY3RvcicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3RlcC52YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdUeXBlIGFjdGlvbiByZXF1aXJlcyBhIHZhbHVlIHRvIGlucHV0Jyk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBUeXBpbmcgaW50byBlbGVtZW50OiAke3N0ZXAudGFyZ2V0fWApO1xyXG5cclxuICAgICAgLy8gVXNlIHJldHJ5IGxvZ2ljIGZvciB0eXBlIGFjdGlvblxyXG4gICAgICBhd2FpdCByZXRyeVdpdGhCYWNrb2ZmKFxyXG4gICAgICAgIGFzeW5jICgpID0+IHtcclxuICAgICAgICAgIGF3YWl0IHBhZ2UuZmlsbChzdGVwLnRhcmdldCEsIHN0ZXAudmFsdWUhLCB7XHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IDEwMDAwLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBtYXhBdHRlbXB0czogMyxcclxuICAgICAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbJ3RpbWVvdXQnLCAnbm90IGZvdW5kJywgJ25vdCB2aXNpYmxlJywgJ2RldGFjaGVkJ10sXHJcbiAgICAgICAgfVxyXG4gICAgICApO1xyXG5cclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGVwSW5kZXgsXHJcbiAgICAgICAgYWN0aW9uOiAndHlwZScsXHJcbiAgICAgICAgc3RhdHVzOiAncGFzcycsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgZGV0YWlsczoge1xyXG4gICAgICAgICAgc2VsZWN0b3I6IHN0ZXAudGFyZ2V0LFxyXG4gICAgICAgICAgdmFsdWU6IHN0ZXAudmFsdWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVHlwZSBhY3Rpb24gZmFpbGVkJztcclxuXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFR5cGUgYWN0aW9uIGZhaWxlZDpgLCBlcnJvck1lc3NhZ2UpO1xyXG5cclxuICAgICAgLy8gQ2FwdHVyZSBzY3JlZW5zaG90IG9uIGZhaWx1cmVcclxuICAgICAgY29uc3Qgc2NyZWVuc2hvdCA9IGF3YWl0IHNjcmVlbnNob3RTZXJ2aWNlLmNhcHR1cmVBbmRVcGxvYWRTYWZlKHBhZ2UsIHRoaXMuZXhlY3V0aW9uSWQsIHN0ZXBJbmRleCk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0ZXBJbmRleCxcclxuICAgICAgICBhY3Rpb246ICd0eXBlJyxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsJyxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgc2NyZWVuc2hvdCxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBzZWxlY3Rvcjogc3RlcC50YXJnZXQsXHJcbiAgICAgICAgICB2YWx1ZTogc3RlcC52YWx1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBhIHdhaXQgYWN0aW9uXHJcbiAgICogUGF1c2VzIGV4ZWN1dGlvbiBmb3IgdGhlIHNwZWNpZmllZCBkdXJhdGlvblxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBleGVjdXRlV2FpdChcclxuICAgIHBhZ2U6IFBhZ2UsXHJcbiAgICBzdGVwOiBUZXN0U3RlcCxcclxuICAgIHN0ZXBJbmRleDogbnVtYmVyXHJcbiAgKTogUHJvbWlzZTxTdGVwUmVzdWx0PiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFBhcnNlIGR1cmF0aW9uIGZyb20gdGFyZ2V0IG9yIHZhbHVlIGZpZWxkXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uTXMgPSBwYXJzZUludChzdGVwLnZhbHVlIHx8IHN0ZXAudGFyZ2V0IHx8ICcxMDAwJywgMTApO1xyXG5cclxuICAgICAgaWYgKGlzTmFOKGR1cmF0aW9uTXMpIHx8IGR1cmF0aW9uTXMgPCAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdXYWl0IGFjdGlvbiByZXF1aXJlcyBhIHZhbGlkIGR1cmF0aW9uIGluIG1pbGxpc2Vjb25kcycpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgV2FpdGluZyBmb3IgJHtkdXJhdGlvbk1zfW1zYCk7XHJcblxyXG4gICAgICBhd2FpdCBwYWdlLndhaXRGb3JUaW1lb3V0KGR1cmF0aW9uTXMpO1xyXG5cclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGVwSW5kZXgsXHJcbiAgICAgICAgYWN0aW9uOiAnd2FpdCcsXHJcbiAgICAgICAgc3RhdHVzOiAncGFzcycsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgZGV0YWlsczoge30sXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1dhaXQgYWN0aW9uIGZhaWxlZCc7XHJcblxyXG4gICAgICBjb25zb2xlLmVycm9yKGBXYWl0IGFjdGlvbiBmYWlsZWQ6YCwgZXJyb3JNZXNzYWdlKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RlcEluZGV4LFxyXG4gICAgICAgIGFjdGlvbjogJ3dhaXQnLFxyXG4gICAgICAgIHN0YXR1czogJ2ZhaWwnLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZSxcclxuICAgICAgICBkZXRhaWxzOiB7fSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgYW4gYXNzZXJ0IGFjdGlvblxyXG4gICAqIFZlcmlmaWVzIHRoYXQgYW4gZWxlbWVudCBtZWV0cyB0aGUgc3BlY2lmaWVkIGNvbmRpdGlvblxyXG4gICAqL1xyXG4gIHB1YmxpYyBhc3luYyBleGVjdXRlQXNzZXJ0KFxyXG4gICAgcGFnZTogUGFnZSxcclxuICAgIHN0ZXA6IFRlc3RTdGVwLFxyXG4gICAgc3RlcEluZGV4OiBudW1iZXJcclxuICApOiBQcm9taXNlPFN0ZXBSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKCFzdGVwLnRhcmdldCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQXNzZXJ0IGFjdGlvbiByZXF1aXJlcyBhIHRhcmdldCBzZWxlY3RvcicpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgQXNzZXJ0aW5nIGVsZW1lbnQ6ICR7c3RlcC50YXJnZXR9YCk7XHJcblxyXG4gICAgICAvLyBEZXRlcm1pbmUgYXNzZXJ0aW9uIHR5cGUgZnJvbSBleHBlY3RlZFJlc3VsdCBvciBkZWZhdWx0IHRvICd2aXNpYmxlJ1xyXG4gICAgICBjb25zdCBhc3NlcnRpb25UeXBlID0gc3RlcC5leHBlY3RlZFJlc3VsdD8udG9Mb3dlckNhc2UoKSB8fCAndmlzaWJsZSc7XHJcblxyXG4gICAgICAvLyBVc2UgcmV0cnkgbG9naWMgZm9yIGFzc2VydCBhY3Rpb25cclxuICAgICAgYXdhaXQgcmV0cnlXaXRoQmFja29mZihcclxuICAgICAgICBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAvLyBXYWl0IGZvciBlbGVtZW50IHRvIGJlIHByZXNlbnRcclxuICAgICAgICAgIGNvbnN0IGVsZW1lbnQgPSBhd2FpdCBwYWdlLndhaXRGb3JTZWxlY3RvcihzdGVwLnRhcmdldCEsIHtcclxuICAgICAgICAgICAgdGltZW91dDogMTAwMDAsXHJcbiAgICAgICAgICAgIHN0YXRlOiAnYXR0YWNoZWQnLFxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgaWYgKCFlbGVtZW50KSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRWxlbWVudCBub3QgZm91bmQ6ICR7c3RlcC50YXJnZXR9YCk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgaWYgKGFzc2VydGlvblR5cGUuaW5jbHVkZXMoJ3Zpc2libGUnKSkge1xyXG4gICAgICAgICAgICBjb25zdCBpc1Zpc2libGUgPSBhd2FpdCBlbGVtZW50LmlzVmlzaWJsZSgpO1xyXG4gICAgICAgICAgICBpZiAoIWlzVmlzaWJsZSkge1xyXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRWxlbWVudCBpcyBub3QgdmlzaWJsZTogJHtzdGVwLnRhcmdldH1gKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChhc3NlcnRpb25UeXBlLmluY2x1ZGVzKCd0ZXh0JykpIHtcclxuICAgICAgICAgICAgY29uc3QgdGV4dCA9IGF3YWl0IGVsZW1lbnQudGV4dENvbnRlbnQoKTtcclxuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRUZXh0ID0gc3RlcC52YWx1ZSB8fCAnJztcclxuICAgICAgICAgICAgaWYgKHRleHQgIT09IGV4cGVjdGVkVGV4dCkge1xyXG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRXhwZWN0ZWQgdGV4dCBcIiR7ZXhwZWN0ZWRUZXh0fVwiLCBnb3QgXCIke3RleHR9XCJgKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIGlmIChhc3NlcnRpb25UeXBlLmluY2x1ZGVzKCd2YWx1ZScpKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHZhbHVlID0gYXdhaXQgZWxlbWVudC5pbnB1dFZhbHVlKCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGV4cGVjdGVkVmFsdWUgPSBzdGVwLnZhbHVlIHx8ICcnO1xyXG4gICAgICAgICAgICBpZiAodmFsdWUgIT09IGV4cGVjdGVkVmFsdWUpIHtcclxuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEV4cGVjdGVkIHZhbHVlIFwiJHtleHBlY3RlZFZhbHVlfVwiLCBnb3QgXCIke3ZhbHVlfVwiYCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG1heEF0dGVtcHRzOiAzLFxyXG4gICAgICAgICAgaW5pdGlhbERlbGF5TXM6IDEwMDAsXHJcbiAgICAgICAgICByZXRyeWFibGVFcnJvcnM6IFsndGltZW91dCcsICdub3QgZm91bmQnLCAnbm90IHZpc2libGUnLCAnZGV0YWNoZWQnXSxcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0ZXBJbmRleCxcclxuICAgICAgICBhY3Rpb246ICdhc3NlcnQnLFxyXG4gICAgICAgIHN0YXR1czogJ3Bhc3MnLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIHNlbGVjdG9yOiBzdGVwLnRhcmdldCxcclxuICAgICAgICAgIGFzc2VydGlvbjogYXNzZXJ0aW9uVHlwZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdBc3NlcnQgYWN0aW9uIGZhaWxlZCc7XHJcblxyXG4gICAgICBjb25zb2xlLmVycm9yKGBBc3NlcnQgYWN0aW9uIGZhaWxlZDpgLCBlcnJvck1lc3NhZ2UpO1xyXG5cclxuICAgICAgLy8gQ2FwdHVyZSBzY3JlZW5zaG90IG9uIGZhaWx1cmVcclxuICAgICAgY29uc3Qgc2NyZWVuc2hvdCA9IGF3YWl0IHNjcmVlbnNob3RTZXJ2aWNlLmNhcHR1cmVBbmRVcGxvYWRTYWZlKHBhZ2UsIHRoaXMuZXhlY3V0aW9uSWQsIHN0ZXBJbmRleCk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0ZXBJbmRleCxcclxuICAgICAgICBhY3Rpb246ICdhc3NlcnQnLFxyXG4gICAgICAgIHN0YXR1czogJ2ZhaWwnLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZSxcclxuICAgICAgICBzY3JlZW5zaG90LFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIHNlbGVjdG9yOiBzdGVwLnRhcmdldCxcclxuICAgICAgICAgIGFzc2VydGlvbjogc3RlcC5leHBlY3RlZFJlc3VsdCxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBhbiBBUEkgY2FsbCBhY3Rpb25cclxuICAgKiBNYWtlcyBhbiBIVFRQIHJlcXVlc3QgYW5kIHZhbGlkYXRlcyB0aGUgcmVzcG9uc2VcclxuICAgKi9cclxuICBwdWJsaWMgYXN5bmMgZXhlY3V0ZUFQSUNhbGwoXHJcbiAgICBzdGVwOiBUZXN0U3RlcCxcclxuICAgIHN0ZXBJbmRleDogbnVtYmVyXHJcbiAgKTogUHJvbWlzZTxTdGVwUmVzdWx0PiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGlmICghc3RlcC50YXJnZXQpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0FQSSBjYWxsIGFjdGlvbiByZXF1aXJlcyBhIHRhcmdldCBVUkwnKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gUGFyc2UgbWV0aG9kIGZyb20gZXhwZWN0ZWRSZXN1bHQgb3IgZGVmYXVsdCB0byBHRVRcclxuICAgICAgY29uc3QgbWV0aG9kID0gKHN0ZXAuZXhwZWN0ZWRSZXN1bHQ/LnRvVXBwZXJDYXNlKCkgfHwgJ0dFVCcpIGFzIHN0cmluZztcclxuXHJcbiAgICAgIC8vIFBhcnNlIGhlYWRlcnMgYW5kIGJvZHkgZnJvbSB2YWx1ZSBpZiBwcm92aWRlZCAoSlNPTiBmb3JtYXQpXHJcbiAgICAgIGxldCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcbiAgICAgIGxldCBib2R5OiBhbnkgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICBpZiAoc3RlcC52YWx1ZSkge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHN0ZXAudmFsdWUpO1xyXG4gICAgICAgICAgaGVhZGVycyA9IHBhcnNlZC5oZWFkZXJzIHx8IHt9O1xyXG4gICAgICAgICAgYm9keSA9IHBhcnNlZC5ib2R5O1xyXG4gICAgICAgIH0gY2F0Y2gge1xyXG4gICAgICAgICAgLy8gSWYgbm90IEpTT04sIHRyZWF0IHZhbHVlIGFzIGJvZHlcclxuICAgICAgICAgIGJvZHkgPSBzdGVwLnZhbHVlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc29sZS5sb2coYE1ha2luZyAke21ldGhvZH0gcmVxdWVzdCB0bzogJHtzdGVwLnRhcmdldH1gKTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbmZpZzogQXhpb3NSZXF1ZXN0Q29uZmlnID0ge1xyXG4gICAgICAgIG1ldGhvZCxcclxuICAgICAgICB1cmw6IHN0ZXAudGFyZ2V0LFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgZGF0YTogYm9keSxcclxuICAgICAgICB0aW1lb3V0OiAzMDAwMCxcclxuICAgICAgICB2YWxpZGF0ZVN0YXR1czogKCkgPT4gdHJ1ZSwgLy8gRG9uJ3QgdGhyb3cgb24gYW55IHN0YXR1cyBjb2RlXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBVc2UgcmV0cnkgbG9naWMgZm9yIEFQSSBjYWxsc1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHJldHJ5V2l0aEJhY2tvZmYoXHJcbiAgICAgICAgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGF4aW9zKGNvbmZpZyk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBtYXhBdHRlbXB0czogMyxcclxuICAgICAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICAgICAgcmV0cnlhYmxlRXJyb3JzOiBbXHJcbiAgICAgICAgICAgICdFVElNRURPVVQnLFxyXG4gICAgICAgICAgICAnRUNPTk5SRVNFVCcsXHJcbiAgICAgICAgICAgICdFQ09OTlJFRlVTRUQnLFxyXG4gICAgICAgICAgICAnRU5PVEZPVU5EJyxcclxuICAgICAgICAgICAgJ25ldHdvcmsnLFxyXG4gICAgICAgICAgICAndGltZW91dCcsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH1cclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuXHJcbiAgICAgIGNvbnN0IGFwaVJlcXVlc3Q6IEFQSVJlcXVlc3REZXRhaWxzID0ge1xyXG4gICAgICAgIG1ldGhvZCxcclxuICAgICAgICB1cmw6IHN0ZXAudGFyZ2V0LFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogYm9keSA/IEpTT04uc3RyaW5naWZ5KGJvZHkpIDogdW5kZWZpbmVkLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgYXBpUmVzcG9uc2U6IEFQSVJlc3BvbnNlRGV0YWlscyA9IHtcclxuICAgICAgICBzdGF0dXNDb2RlOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgICAgaGVhZGVyczogcmVzcG9uc2UuaGVhZGVycyBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlLmRhdGEpLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2Ugc3RhdHVzIGlzIGFjY2VwdGFibGUgKDJ4eCBvciAzeHgpXHJcbiAgICAgIGNvbnN0IGlzU3VjY2VzcyA9IHJlc3BvbnNlLnN0YXR1cyA+PSAyMDAgJiYgcmVzcG9uc2Uuc3RhdHVzIDwgNDAwO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGVwSW5kZXgsXHJcbiAgICAgICAgYWN0aW9uOiAnYXBpLWNhbGwnLFxyXG4gICAgICAgIHN0YXR1czogaXNTdWNjZXNzID8gJ3Bhc3MnIDogJ2ZhaWwnLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogaXNTdWNjZXNzID8gdW5kZWZpbmVkIDogYEhUVFAgJHtyZXNwb25zZS5zdGF0dXN9OiAke3Jlc3BvbnNlLnN0YXR1c1RleHR9YCxcclxuICAgICAgICBkZXRhaWxzOiB7XHJcbiAgICAgICAgICBhcGlSZXF1ZXN0LFxyXG4gICAgICAgICAgYXBpUmVzcG9uc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnQVBJIGNhbGwgZmFpbGVkJztcclxuXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYEFQSSBjYWxsIGFjdGlvbiBmYWlsZWQ6YCwgZXJyb3JNZXNzYWdlKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RlcEluZGV4LFxyXG4gICAgICAgIGFjdGlvbjogJ2FwaS1jYWxsJyxcclxuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgICAgZXJyb3JNZXNzYWdlLFxyXG4gICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgIHVybDogc3RlcC50YXJnZXQsXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgYSB0ZXN0IHN0ZXAgYmFzZWQgb24gaXRzIGFjdGlvbiB0eXBlXHJcbiAgICovXHJcbiAgcHVibGljIGFzeW5jIGV4ZWN1dGVTdGVwKFxyXG4gICAgcGFnZTogUGFnZSB8IG51bGwsXHJcbiAgICBzdGVwOiBUZXN0U3RlcCxcclxuICAgIHN0ZXBJbmRleDogbnVtYmVyXHJcbiAgKTogUHJvbWlzZTxTdGVwUmVzdWx0PiB7XHJcbiAgICBjb25zb2xlLmxvZyhgRXhlY3V0aW5nIHN0ZXAgJHtzdGVwSW5kZXh9OiAke3N0ZXAuYWN0aW9ufWApO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIHN3aXRjaCAoc3RlcC5hY3Rpb24pIHtcclxuICAgICAgICBjYXNlICduYXZpZ2F0ZSc6XHJcbiAgICAgICAgICBpZiAoIXBhZ2UpIHRocm93IG5ldyBFcnJvcignUGFnZSBpcyByZXF1aXJlZCBmb3IgbmF2aWdhdGUgYWN0aW9uJyk7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlTmF2aWdhdGUocGFnZSwgc3RlcCwgc3RlcEluZGV4KTtcclxuXHJcbiAgICAgICAgY2FzZSAnY2xpY2snOlxyXG4gICAgICAgICAgaWYgKCFwYWdlKSB0aHJvdyBuZXcgRXJyb3IoJ1BhZ2UgaXMgcmVxdWlyZWQgZm9yIGNsaWNrIGFjdGlvbicpO1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZUNsaWNrKHBhZ2UsIHN0ZXAsIHN0ZXBJbmRleCk7XHJcblxyXG4gICAgICAgIGNhc2UgJ3R5cGUnOlxyXG4gICAgICAgICAgaWYgKCFwYWdlKSB0aHJvdyBuZXcgRXJyb3IoJ1BhZ2UgaXMgcmVxdWlyZWQgZm9yIHR5cGUgYWN0aW9uJyk7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlVHlwZShwYWdlLCBzdGVwLCBzdGVwSW5kZXgpO1xyXG5cclxuICAgICAgICBjYXNlICd3YWl0JzpcclxuICAgICAgICAgIGlmICghcGFnZSkgdGhyb3cgbmV3IEVycm9yKCdQYWdlIGlzIHJlcXVpcmVkIGZvciB3YWl0IGFjdGlvbicpO1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuZXhlY3V0ZVdhaXQocGFnZSwgc3RlcCwgc3RlcEluZGV4KTtcclxuXHJcbiAgICAgICAgY2FzZSAnYXNzZXJ0JzpcclxuICAgICAgICAgIGlmICghcGFnZSkgdGhyb3cgbmV3IEVycm9yKCdQYWdlIGlzIHJlcXVpcmVkIGZvciBhc3NlcnQgYWN0aW9uJyk7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5leGVjdXRlQXNzZXJ0KHBhZ2UsIHN0ZXAsIHN0ZXBJbmRleCk7XHJcblxyXG4gICAgICAgIGNhc2UgJ2FwaS1jYWxsJzpcclxuICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmV4ZWN1dGVBUElDYWxsKHN0ZXAsIHN0ZXBJbmRleCk7XHJcblxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gYWN0aW9uIHR5cGU6ICR7c3RlcC5hY3Rpb259YCk7XHJcbiAgICAgIH1cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1N0ZXAgZXhlY3V0aW9uIGZhaWxlZCc7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFN0ZXAgJHtzdGVwSW5kZXh9IGZhaWxlZDpgLCBlcnJvck1lc3NhZ2UpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGVwSW5kZXgsXHJcbiAgICAgICAgYWN0aW9uOiBzdGVwLmFjdGlvbixcclxuICAgICAgICBzdGF0dXM6ICdlcnJvcicsXHJcbiAgICAgICAgZHVyYXRpb246IDAsXHJcbiAgICAgICAgZXJyb3JNZXNzYWdlLFxyXG4gICAgICAgIGRldGFpbHM6IHt9LFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3Qgc3RlcEV4ZWN1dG9yU2VydmljZSA9IG5ldyBTdGVwRXhlY3V0b3JTZXJ2aWNlKCk7XHJcbiJdfQ==