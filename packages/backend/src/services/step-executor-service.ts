/**
 * Step Executor Service
 * Executes individual test steps using Playwright or HTTP client
 */

import { Page } from 'playwright-core';
import axios, { AxiosRequestConfig } from 'axios';
import { TestStep } from '../types/test-case';
import { StepResult, APIRequestDetails, APIResponseDetails } from '../types/test-execution';
import { screenshotService } from './screenshot-service';
import { retryWithBackoff } from '../utils/retry-util';

export class StepExecutorService {
  private executionId: string = '';

  /**
   * Set the current execution ID for screenshot naming
   */
  public setExecutionId(executionId: string): void {
    this.executionId = executionId;
  }
  /**
   * Execute a navigate action
   * Navigates the browser to the specified URL
   */
  public async executeNavigate(
    page: Page,
    step: TestStep,
    stepIndex: number
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      if (!step.target) {
        throw new Error('Navigate action requires a target URL');
      }

      console.log(`Navigating to: ${step.target}`);
      
      // Use retry logic for navigation
      await retryWithBackoff(
        async () => {
          await page.goto(step.target!, {
            timeout: 30000,
            waitUntil: 'domcontentloaded',
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          retryableErrors: ['timeout', 'net::ERR', 'Navigation timeout'],
        }
      );

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
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Navigation failed';

      console.error(`Navigate action failed:`, errorMessage);

      // Capture screenshot on failure
      const screenshot = await screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);

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
  public async executeClick(
    page: Page,
    step: TestStep,
    stepIndex: number
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      if (!step.target) {
        throw new Error('Click action requires a target selector');
      }

      console.log(`Clicking element: ${step.target}`);

      // Use retry logic for click action
      await retryWithBackoff(
        async () => {
          await page.click(step.target!, {
            timeout: 10000,
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          retryableErrors: ['timeout', 'not found', 'not visible', 'detached'],
        }
      );

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
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Click action failed';

      console.error(`Click action failed:`, errorMessage);

      // Capture screenshot on failure
      const screenshot = await screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);

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
  public async executeType(
    page: Page,
    step: TestStep,
    stepIndex: number
  ): Promise<StepResult> {
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
      await retryWithBackoff(
        async () => {
          await page.fill(step.target!, step.value!, {
            timeout: 10000,
          });
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          retryableErrors: ['timeout', 'not found', 'not visible', 'detached'],
        }
      );

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
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Type action failed';

      console.error(`Type action failed:`, errorMessage);

      // Capture screenshot on failure
      const screenshot = await screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);

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
  public async executeWait(
    page: Page,
    step: TestStep,
    stepIndex: number
  ): Promise<StepResult> {
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
    } catch (error) {
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
  public async executeAssert(
    page: Page,
    step: TestStep,
    stepIndex: number
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      if (!step.target) {
        throw new Error('Assert action requires a target selector');
      }

      console.log(`Asserting element: ${step.target}`);

      // Determine assertion type from expectedResult or default to 'visible'
      const assertionType = step.expectedResult?.toLowerCase() || 'visible';

      // Use retry logic for assert action
      await retryWithBackoff(
        async () => {
          // Wait for element to be present
          const element = await page.waitForSelector(step.target!, {
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
          } else if (assertionType.includes('text')) {
            const text = await element.textContent();
            const expectedText = step.value || '';
            if (text !== expectedText) {
              throw new Error(`Expected text "${expectedText}", got "${text}"`);
            }
          } else if (assertionType.includes('value')) {
            const value = await element.inputValue();
            const expectedValue = step.value || '';
            if (value !== expectedValue) {
              throw new Error(`Expected value "${expectedValue}", got "${value}"`);
            }
          }
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1000,
          retryableErrors: ['timeout', 'not found', 'not visible', 'detached'],
        }
      );

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
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Assert action failed';

      console.error(`Assert action failed:`, errorMessage);

      // Capture screenshot on failure
      const screenshot = await screenshotService.captureAndUploadSafe(page, this.executionId, stepIndex);

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
  public async executeAPICall(
    step: TestStep,
    stepIndex: number
  ): Promise<StepResult> {
    const startTime = Date.now();

    try {
      if (!step.target) {
        throw new Error('API call action requires a target URL');
      }

      // Parse method from expectedResult or default to GET
      const method = (step.expectedResult?.toUpperCase() || 'GET') as string;

      // Parse headers and body from value if provided (JSON format)
      let headers: Record<string, string> = {};
      let body: any = undefined;

      if (step.value) {
        try {
          const parsed = JSON.parse(step.value);
          headers = parsed.headers || {};
          body = parsed.body;
        } catch {
          // If not JSON, treat value as body
          body = step.value;
        }
      }

      console.log(`Making ${method} request to: ${step.target}`);

      const config: AxiosRequestConfig = {
        method,
        url: step.target,
        headers,
        data: body,
        timeout: 30000,
        validateStatus: () => true, // Don't throw on any status code
      };

      // Use retry logic for API calls
      const response = await retryWithBackoff(
        async () => {
          return await axios(config);
        },
        {
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
        }
      );

      const duration = Date.now() - startTime;

      const apiRequest: APIRequestDetails = {
        method,
        url: step.target,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      };

      const apiResponse: APIResponseDetails = {
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
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
    } catch (error) {
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
  public async executeStep(
    page: Page | null,
    step: TestStep,
    stepIndex: number
  ): Promise<StepResult> {
    console.log(`Executing step ${stepIndex}: ${step.action}`);

    try {
      switch (step.action) {
        case 'navigate':
          if (!page) throw new Error('Page is required for navigate action');
          return await this.executeNavigate(page, step, stepIndex);

        case 'click':
          if (!page) throw new Error('Page is required for click action');
          return await this.executeClick(page, step, stepIndex);

        case 'type':
          if (!page) throw new Error('Page is required for type action');
          return await this.executeType(page, step, stepIndex);

        case 'wait':
          if (!page) throw new Error('Page is required for wait action');
          return await this.executeWait(page, step, stepIndex);

        case 'assert':
          if (!page) throw new Error('Page is required for assert action');
          return await this.executeAssert(page, step, stepIndex);

        case 'api-call':
          return await this.executeAPICall(step, stepIndex);

        default:
          throw new Error(`Unknown action type: ${step.action}`);
      }
    } catch (error) {
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

// Export singleton instance
export const stepExecutorService = new StepExecutorService();
