/**
 * Step Executor Service
 * Executes individual test steps using Playwright or HTTP client
 */
import { Page } from 'playwright-core';
import { TestStep } from '../types/test-case';
import { StepResult } from '../types/test-execution';
export declare class StepExecutorService {
    private executionId;
    /**
     * Set the current execution ID for screenshot naming
     */
    setExecutionId(executionId: string): void;
    /**
     * Execute a navigate action
     * Navigates the browser to the specified URL
     */
    executeNavigate(page: Page, step: TestStep, stepIndex: number): Promise<StepResult>;
    /**
     * Execute a click action
     * Locates an element by selector and clicks it
     */
    executeClick(page: Page, step: TestStep, stepIndex: number): Promise<StepResult>;
    /**
     * Execute a type action
     * Locates an element by selector and inputs text
     */
    executeType(page: Page, step: TestStep, stepIndex: number): Promise<StepResult>;
    /**
     * Execute a wait action
     * Pauses execution for the specified duration
     */
    executeWait(page: Page, step: TestStep, stepIndex: number): Promise<StepResult>;
    /**
     * Execute an assert action
     * Verifies that an element meets the specified condition
     */
    executeAssert(page: Page, step: TestStep, stepIndex: number): Promise<StepResult>;
    /**
     * Execute an API call action
     * Makes an HTTP request and validates the response
     */
    executeAPICall(step: TestStep, stepIndex: number): Promise<StepResult>;
    /**
     * Execute a test step based on its action type
     */
    executeStep(page: Page | null, step: TestStep, stepIndex: number): Promise<StepResult>;
}
export declare const stepExecutorService: StepExecutorService;
