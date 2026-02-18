/**
 * SNS Delivery Service
 * 
 * Handles message delivery through AWS SNS to email, SMS, and webhook channels.
 * Integrates retry handler for failed deliveries and supports Slack Block Kit formatting.
 */

import { SNSClient, PublishCommand, PublishCommandInput } from '@aws-sdk/client-sns';
import { SNSDeliveryOptions, SNSDeliveryResult, NotificationChannel, SlackBlock } from '../types/notification';
import { retryHandlerService } from './retry-handler-service';

export class SNSDeliveryService {
  private snsClient: SNSClient;
  private readonly MAX_PAYLOAD_SIZE = 256 * 1024; // 256 KB

  constructor() {
    this.snsClient = new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Send email notification via SNS
   * 
   * @param recipient - Email address
   * @param subject - Email subject
   * @param body - Email body (HTML or plain text)
   * @returns SNS delivery result
   */
  async sendEmail(recipient: string, subject: string, body: string): Promise<SNSDeliveryResult> {
    const topicArn = process.env.SNS_TOPIC_ARN_EMAIL;
    if (!topicArn) {
      throw new Error('SNS_TOPIC_ARN_EMAIL environment variable not set');
    }

    const message = JSON.stringify({
      default: body,
      email: body,
      subject,
    });

    return this.publishToTopic(topicArn, message, {
      recipient,
      channel: 'email',
      subject,
    });
  }

  /**
   * Send SMS notification via SNS
   * 
   * @param phoneNumber - Phone number in E.164 format
   * @param message - SMS message (plain text)
   * @returns SNS delivery result
   */
  async sendSMS(phoneNumber: string, message: string): Promise<SNSDeliveryResult> {
    const topicArn = process.env.SNS_TOPIC_ARN_SMS;
    if (!topicArn) {
      throw new Error('SNS_TOPIC_ARN_SMS environment variable not set');
    }

    return this.publishToTopic(topicArn, message, {
      recipient: phoneNumber,
      channel: 'sms',
    });
  }

  /**
   * Send webhook notification via SNS
   * 
   * @param webhookUrl - Webhook URL
   * @param payload - JSON payload
   * @returns SNS delivery result
   */
  async sendWebhook(webhookUrl: string, payload: object): Promise<SNSDeliveryResult> {
    const topicArn = process.env.SNS_TOPIC_ARN_WEBHOOK;
    if (!topicArn) {
      throw new Error('SNS_TOPIC_ARN_WEBHOOK environment variable not set');
    }

    const message = JSON.stringify(payload);

    return this.publishToTopic(topicArn, message, {
      recipient: webhookUrl,
      channel: 'webhook',
    });
  }

  /**
   * Send notification to Slack with Block Kit formatting
   * 
   * @param webhookUrl - Slack webhook URL
   * @param blocks - Slack Block Kit blocks
   * @returns SNS delivery result
   */
  async sendToSlack(webhookUrl: string, blocks: SlackBlock[]): Promise<SNSDeliveryResult> {
    const payload = {
      blocks,
    };

    return this.sendWebhook(webhookUrl, payload);
  }

  /**
   * Publish message to SNS topic with retry logic
   * 
   * @param topicArn - SNS topic ARN
   * @param message - Message content
   * @param attributes - Optional message attributes
   * @returns SNS delivery result
   */
  async publishToTopic(
    topicArn: string,
    message: string,
    attributes?: Record<string, string>
  ): Promise<SNSDeliveryResult> {
    // Validate payload size
    const payloadSize = Buffer.byteLength(message, 'utf8');
    if (payloadSize > this.MAX_PAYLOAD_SIZE) {
      return {
        messageId: '',
        channel: (attributes?.channel as NotificationChannel) || 'email',
        status: 'failed',
        errorMessage: `Payload size ${payloadSize} bytes exceeds limit of ${this.MAX_PAYLOAD_SIZE} bytes`,
      };
    }

    // Prepare SNS publish command
    const input: PublishCommandInput = {
      TopicArn: topicArn,
      Message: message,
    };

    // Add message attributes if provided
    if (attributes) {
      input.MessageAttributes = {};
      for (const [key, value] of Object.entries(attributes)) {
        input.MessageAttributes[key] = {
          DataType: 'String',
          StringValue: value,
        };
      }
    }

    // Execute with retry logic
    const retryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 16000,
      backoffMultiplier: 2,
    };

    const retryResult = await retryHandlerService.executeWithRetry(
      async () => {
        const command = new PublishCommand(input);
        return await this.snsClient.send(command);
      },
      retryConfig
    );

    if (retryResult.success && retryResult.result) {
      return {
        messageId: retryResult.result.MessageId || '',
        channel: (attributes?.channel as NotificationChannel) || 'email',
        status: 'sent',
      };
    }

    return {
      messageId: '',
      channel: (attributes?.channel as NotificationChannel) || 'email',
      status: 'failed',
      errorMessage: retryResult.error?.message || 'Unknown error',
    };
  }
}

// Export singleton instance
export const snsDeliveryService = new SNSDeliveryService();
