/**
 * Mock SNS Service
 * 
 * Simulates AWS SNS for notification delivery without sending actual messages.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  MockSNSService,
  MockSNSConfig,
  SNSMessage,
} from '../types';

/**
 * Mock SNS Service Implementation
 */
export class MockSNSServiceImpl implements MockSNSService {
  private config: MockSNSConfig;
  private deliveredMessages: SNSMessage[];
  private failedMessages: SNSMessage[];
  private deliveryRules: Map<string, boolean>;

  constructor() {
    this.config = {
      deliveryLatency: 50, // 50ms default latency
      failureRate: 0, // No failures by default
    };
    this.deliveredMessages = [];
    this.failedMessages = [];
    this.deliveryRules = new Map();
  }

  /**
   * Configure mock behavior
   */
  configure(config: MockSNSConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Mock email delivery behavior
   */
  mockEmailDelivery(recipient: string, success: boolean): void {
    this.deliveryRules.set(`email:${recipient}`, success);
  }

  /**
   * Mock SMS delivery behavior
   */
  mockSMSDelivery(phoneNumber: string, success: boolean): void {
    this.deliveryRules.set(`sms:${phoneNumber}`, success);
  }

  /**
   * Mock webhook delivery behavior
   */
  mockWebhookDelivery(url: string, success: boolean): void {
    this.deliveryRules.set(`webhook:${url}`, success);
  }

  /**
   * Get delivered messages
   */
  getDeliveredMessages(): SNSMessage[] {
    return [...this.deliveredMessages];
  }

  /**
   * Get failed messages
   */
  getFailedMessages(): SNSMessage[] {
    return [...this.failedMessages];
  }

  /**
   * Reset mock state
   */
  reset(): void {
    this.deliveredMessages = [];
    this.failedMessages = [];
    this.deliveryRules.clear();
  }

  /**
   * Simulate message delivery (internal method used by tests)
   */
  async simulateDelivery(
    channel: 'email' | 'sms' | 'webhook',
    recipient: string,
    subject: string | undefined,
    body: string
  ): Promise<void> {
    // Simulate latency
    await new Promise(resolve => setTimeout(resolve, this.config.deliveryLatency));

    const message: SNSMessage = {
      messageId: uuidv4(),
      channel,
      recipient,
      subject,
      body,
      timestamp: new Date().toISOString(),
      delivered: false,
    };

    // Check delivery rules
    const ruleKey = `${channel}:${recipient}`;
    const shouldSucceed = this.deliveryRules.get(ruleKey);

    // Determine success
    let success: boolean;
    if (shouldSucceed !== undefined) {
      success = shouldSucceed;
    } else {
      // Use failure rate
      success = Math.random() >= this.config.failureRate / 100;
    }

    if (success) {
      message.delivered = true;
      this.deliveredMessages.push(message);
    } else {
      message.delivered = false;
      message.error = 'Mock delivery failure';
      this.failedMessages.push(message);
    }
  }
}
