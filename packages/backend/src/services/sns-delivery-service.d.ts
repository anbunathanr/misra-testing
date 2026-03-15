/**
 * SNS Delivery Service
 *
 * Handles message delivery through AWS SNS to email, SMS, and webhook channels.
 * Integrates retry handler for failed deliveries and supports Slack Block Kit formatting.
 */
import { SNSDeliveryResult, SlackBlock } from '../types/notification';
export declare class SNSDeliveryService {
    private snsClient;
    private readonly MAX_PAYLOAD_SIZE;
    constructor();
    /**
     * Send email notification via SNS
     *
     * @param recipient - Email address
     * @param subject - Email subject
     * @param body - Email body (HTML or plain text)
     * @returns SNS delivery result
     */
    sendEmail(recipient: string, subject: string, body: string): Promise<SNSDeliveryResult>;
    /**
     * Send SMS notification via SNS
     *
     * @param phoneNumber - Phone number in E.164 format
     * @param message - SMS message (plain text)
     * @returns SNS delivery result
     */
    sendSMS(phoneNumber: string, message: string): Promise<SNSDeliveryResult>;
    /**
     * Send webhook notification via SNS
     *
     * @param webhookUrl - Webhook URL
     * @param payload - JSON payload
     * @returns SNS delivery result
     */
    sendWebhook(webhookUrl: string, payload: object): Promise<SNSDeliveryResult>;
    /**
     * Send notification to Slack with Block Kit formatting and action buttons
     *
     * @param webhookUrl - Slack webhook URL
     * @param blocks - Slack Block Kit blocks
     * @param actionButtons - Optional action buttons (view test, view logs, re-run test)
     * @returns SNS delivery result
     */
    sendToSlack(webhookUrl: string, blocks: SlackBlock[], actionButtons?: Array<{
        text: string;
        url: string;
        value?: string;
    }>): Promise<SNSDeliveryResult>;
    /**
     * Create Slack action buttons for test execution
     *
     * @param executionId - Test execution ID
     * @param testCaseId - Test case ID
     * @param baseUrl - Base URL for the application
     * @returns Array of action buttons
     */
    createSlackActionButtons(executionId: string, testCaseId: string, baseUrl: string): Array<{
        text: string;
        url: string;
        value?: string;
    }>;
    /**
     * Publish message to SNS topic with retry logic and rate limiting
     *
     * @param topicArn - SNS topic ARN
     * @param message - Message content
     * @param attributes - Optional message attributes
     * @returns SNS delivery result
     */
    publishToTopic(topicArn: string, message: string, attributes?: Record<string, string>): Promise<SNSDeliveryResult>;
}
export declare const snsDeliveryService: SNSDeliveryService;
