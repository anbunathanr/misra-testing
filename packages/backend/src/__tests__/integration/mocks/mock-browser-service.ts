/**
 * Mock Browser Service
 * 
 * Simulates browser automation for test execution without launching actual browsers.
 */

import {
  MockBrowserService,
  MockBrowserConfig,
  BrowserAction,
} from '../types';

/**
 * Mock Browser Service Implementation
 */
export class MockBrowserServiceImpl implements MockBrowserService {
  private config: MockBrowserConfig;
  private executedActions: BrowserAction[];
  private actionRules: Map<string, boolean>;
  private screenshots: Map<string, string>;

  constructor() {
    this.config = {
      actionLatency: 100, // 100ms default latency
      failureRate: 0, // No failures by default
    };
    this.executedActions = [];
    this.actionRules = new Map();
    this.screenshots = new Map();
  }

  /**
   * Configure mock behavior
   */
  configure(config: MockBrowserConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Mock page load behavior
   */
  mockPageLoad(url: string, success: boolean): void {
    this.actionRules.set(`navigate:${url}`, success);
  }

  /**
   * Mock element interaction behavior
   */
  mockElementInteraction(selector: string, success: boolean): void {
    this.actionRules.set(`interact:${selector}`, success);
  }

  /**
   * Mock screenshot capture
   */
  mockScreenshot(url: string): void {
    this.screenshots.set(url, `mock-screenshot-${url}-${Date.now()}.png`);
  }

  /**
   * Get executed actions
   */
  getExecutedActions(): BrowserAction[] {
    return [...this.executedActions];
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.executedActions = [];
    this.actionRules.clear();
    this.screenshots.clear();
  }

  /**
   * Simulate browser action (internal method used by tests)
   */
  async simulateAction(
    action: 'navigate' | 'click' | 'type' | 'assert' | 'screenshot',
    target: string
  ): Promise<void> {
    const startTime = Date.now();

    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, this.config.actionLatency));

    // Check action rules
    const ruleKey = action === 'navigate' ? `navigate:${target}` : `interact:${target}`;
    const shouldSucceed = this.actionRules.get(ruleKey);

    // Determine success
    let success: boolean;
    if (shouldSucceed !== undefined) {
      success = shouldSucceed;
    } else {
      // Use failure rate
      success = Math.random() >= this.config.failureRate / 100;
    }

    const browserAction: BrowserAction = {
      action,
      target,
      timestamp: new Date().toISOString(),
      success,
      duration: Date.now() - startTime,
    };

    if (!success) {
      browserAction.error = 'Mock browser action failure';
    }

    this.executedActions.push(browserAction);

    if (!success) {
      throw new Error(`Mock browser action failed: ${action} on ${target}`);
    }
  }
}
