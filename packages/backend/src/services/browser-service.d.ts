/**
 * Browser Service for Playwright automation in AWS Lambda
 * Handles browser initialization, configuration, and cleanup
 */
import { Browser, BrowserContext, Page } from 'playwright-core';
export interface BrowserSession {
    browser: Browser;
    context: BrowserContext;
    page: Page;
}
export declare class BrowserService {
    private static instance;
    private currentSession;
    private constructor();
    static getInstance(): BrowserService;
    /**
     * Initialize a new browser session with Playwright
     * Configured for AWS Lambda environment with headless Chromium
     */
    initializeBrowser(): Promise<BrowserSession>;
    /**
     * Get the current browser session
     * Throws error if no session is active
     */
    getCurrentSession(): BrowserSession;
    /**
     * Check if a browser session is currently active
     */
    hasActiveSession(): boolean;
    /**
     * Clean up browser resources
     * Closes page, context, and browser in proper order
     */
    cleanup(): Promise<void>;
    /**
     * Force cleanup - attempts cleanup without throwing errors
     * Use in finally blocks or error handlers
     */
    forceCleanup(): Promise<void>;
    /**
     * Get browser version information
     */
    getBrowserVersion(): Promise<string>;
}
export declare const browserService: BrowserService;
