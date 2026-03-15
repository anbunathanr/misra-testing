"use strict";
/**
 * SNS Delivery Service
 *
 * Handles message delivery through AWS SNS to email, SMS, and webhook channels.
 * Integrates retry handler for failed deliveries and supports Slack Block Kit formatting.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.snsDeliveryService = exports.SNSDeliveryService = void 0;
const client_sns_1 = require("@aws-sdk/client-sns");
const retry_handler_service_1 = require("./retry-handler-service");
const rate_limiter_service_1 = require("./rate-limiter-service");
class SNSDeliveryService {
    snsClient;
    MAX_PAYLOAD_SIZE = 256 * 1024; // 256 KB
    constructor() {
        this.snsClient = new client_sns_1.SNSClient({
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
    async sendEmail(recipient, subject, body) {
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
    async sendSMS(phoneNumber, message) {
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
    async sendWebhook(webhookUrl, payload) {
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
     * Send notification to Slack with Block Kit formatting and action buttons
     *
     * @param webhookUrl - Slack webhook URL
     * @param blocks - Slack Block Kit blocks
     * @param actionButtons - Optional action buttons (view test, view logs, re-run test)
     * @returns SNS delivery result
     */
    async sendToSlack(webhookUrl, blocks, actionButtons) {
        // Add action buttons if provided
        if (actionButtons && actionButtons.length > 0) {
            const actionsBlock = {
                type: 'actions',
                elements: actionButtons.map((button) => ({
                    type: 'button',
                    text: {
                        type: 'plain_text',
                        text: button.text,
                    },
                    url: button.url,
                    value: button.value || button.text,
                })),
            };
            blocks.push(actionsBlock);
        }
        const payload = {
            blocks,
        };
        return this.sendWebhook(webhookUrl, payload);
    }
    /**
     * Create Slack action buttons for test execution
     *
     * @param executionId - Test execution ID
     * @param testCaseId - Test case ID
     * @param baseUrl - Base URL for the application
     * @returns Array of action buttons
     */
    createSlackActionButtons(executionId, testCaseId, baseUrl) {
        return [
            {
                text: '📊 View Test',
                url: `${baseUrl}/executions/${executionId}`,
                value: 'view_test',
            },
            {
                text: '📝 View Logs',
                url: `${baseUrl}/executions/${executionId}/logs`,
                value: 'view_logs',
            },
            {
                text: '🔄 Re-run Test',
                url: `${baseUrl}/test-cases/${testCaseId}/execute`,
                value: 'rerun_test',
            },
        ];
    }
    /**
     * Publish message to SNS topic with retry logic and rate limiting
     *
     * @param topicArn - SNS topic ARN
     * @param message - Message content
     * @param attributes - Optional message attributes
     * @returns SNS delivery result
     */
    async publishToTopic(topicArn, message, attributes) {
        // Validate payload size
        const payloadSize = Buffer.byteLength(message, 'utf8');
        if (payloadSize > this.MAX_PAYLOAD_SIZE) {
            return {
                messageId: '',
                channel: attributes?.channel || 'email',
                status: 'failed',
                errorMessage: `Payload size ${payloadSize} bytes exceeds limit of ${this.MAX_PAYLOAD_SIZE} bytes`,
            };
        }
        // Check rate limit before attempting to publish
        const rateLimitResult = await rate_limiter_service_1.rateLimiterService.checkRateLimit(topicArn);
        if (!rateLimitResult.allowed) {
            return {
                messageId: '',
                channel: attributes?.channel || 'email',
                status: 'failed',
                errorMessage: `Rate limit exceeded. Retry after ${rateLimitResult.retryAfterMs}ms`,
            };
        }
        // Prepare SNS publish command
        const input = {
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
        const retryResult = await retry_handler_service_1.retryHandlerService.executeWithRetry(async () => {
            const command = new client_sns_1.PublishCommand(input);
            return await this.snsClient.send(command);
        }, retryConfig);
        if (retryResult.success && retryResult.result) {
            return {
                messageId: retryResult.result.MessageId || '',
                channel: attributes?.channel || 'email',
                status: 'sent',
            };
        }
        return {
            messageId: '',
            channel: attributes?.channel || 'email',
            status: 'failed',
            errorMessage: retryResult.error?.message || 'Unknown error',
        };
    }
}
exports.SNSDeliveryService = SNSDeliveryService;
// Export singleton instance
exports.snsDeliveryService = new SNSDeliveryService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25zLWRlbGl2ZXJ5LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzbnMtZGVsaXZlcnktc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILG9EQUFxRjtBQUVyRixtRUFBOEQ7QUFDOUQsaUVBQTREO0FBRTVELE1BQWEsa0JBQWtCO0lBQ3JCLFNBQVMsQ0FBWTtJQUNaLGdCQUFnQixHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQyxTQUFTO0lBRXpEO1FBQ0UsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLHNCQUFTLENBQUM7WUFDN0IsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVc7U0FDOUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxLQUFLLENBQUMsU0FBUyxDQUFDLFNBQWlCLEVBQUUsT0FBZSxFQUFFLElBQVk7UUFDOUQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQztRQUNqRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZCxNQUFNLElBQUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDN0IsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLEVBQUUsSUFBSTtZQUNYLE9BQU87U0FDUixDQUFDLENBQUM7UUFFSCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRTtZQUM1QyxTQUFTO1lBQ1QsT0FBTyxFQUFFLE9BQU87WUFDaEIsT0FBTztTQUNSLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQW1CLEVBQUUsT0FBZTtRQUNoRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FB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LGlCQUFpQixFQUFFLENBQUM7U0FDckIsQ0FBQztRQUVGLE1BQU0sV0FBVyxHQUFHLE1BQU0sMkNBQW1CLENBQUMsZ0JBQWdCLENBQzVELEtBQUssSUFBSSxFQUFFO1lBQ1QsTUFBTSxPQUFPLEdBQUcsSUFBSSwyQkFBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFDLE9BQU8sTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDLEVBQ0QsV0FBVyxDQUNaLENBQUM7UUFFRixJQUFJLFdBQVcsQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlDLE9BQU87Z0JBQ0wsU0FBUyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLEVBQUU7Z0JBQzdDLE9BQU8sRUFBRyxVQUFVLEVBQUUsT0FBK0IsSUFBSSxPQUFPO2dCQUNoRSxNQUFNLEVBQUUsTUFBTTthQUNmLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTztZQUNMLFNBQVMsRUFBRSxFQUFFO1lBQ2IsT0FBTyxFQUFHLFVBQVUsRUFBRSxPQUErQixJQUFJLE9BQU87WUFDaEUsTUFBTSxFQUFFLFFBQVE7WUFDaEIsWUFBWSxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxJQUFJLGVBQWU7U0FDNUQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXJPRCxnREFxT0M7QUFFRCw0QkFBNEI7QUFDZixRQUFBLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBTTlMgRGVsaXZlcnkgU2VydmljZVxyXG4gKiBcclxuICogSGFuZGxlcyBtZXNzYWdlIGRlbGl2ZXJ5IHRocm91Z2ggQVdTIFNOUyB0byBlbWFpbCwgU01TLCBhbmQgd2ViaG9vayBjaGFubmVscy5cclxuICogSW50ZWdyYXRlcyByZXRyeSBoYW5kbGVyIGZvciBmYWlsZWQgZGVsaXZlcmllcyBhbmQgc3VwcG9ydHMgU2xhY2sgQmxvY2sgS2l0IGZvcm1hdHRpbmcuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCwgUHVibGlzaENvbW1hbmRJbnB1dCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBTTlNEZWxpdmVyeVJlc3VsdCwgTm90aWZpY2F0aW9uQ2hhbm5lbCwgU2xhY2tCbG9jayB9IGZyb20gJy4uL3R5cGVzL25vdGlmaWNhdGlvbic7XHJcbmltcG9ydCB7IHJldHJ5SGFuZGxlclNlcnZpY2UgfSBmcm9tICcuL3JldHJ5LWhhbmRsZXItc2VydmljZSc7XHJcbmltcG9ydCB7IHJhdGVMaW1pdGVyU2VydmljZSB9IGZyb20gJy4vcmF0ZS1saW1pdGVyLXNlcnZpY2UnO1xyXG5cclxuZXhwb3J0IGNsYXNzIFNOU0RlbGl2ZXJ5U2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzbnNDbGllbnQ6IFNOU0NsaWVudDtcclxuICBwcml2YXRlIHJlYWRvbmx5IE1BWF9QQVlMT0FEX1NJWkUgPSAyNTYgKiAxMDI0OyAvLyAyNTYgS0JcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLnNuc0NsaWVudCA9IG5ldyBTTlNDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgZW1haWwgbm90aWZpY2F0aW9uIHZpYSBTTlNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gcmVjaXBpZW50IC0gRW1haWwgYWRkcmVzc1xyXG4gICAqIEBwYXJhbSBzdWJqZWN0IC0gRW1haWwgc3ViamVjdFxyXG4gICAqIEBwYXJhbSBib2R5IC0gRW1haWwgYm9keSAoSFRNTCBvciBwbGFpbiB0ZXh0KVxyXG4gICAqIEByZXR1cm5zIFNOUyBkZWxpdmVyeSByZXN1bHRcclxuICAgKi9cclxuICBhc3luYyBzZW5kRW1haWwocmVjaXBpZW50OiBzdHJpbmcsIHN1YmplY3Q6IHN0cmluZywgYm9keTogc3RyaW5nKTogUHJvbWlzZTxTTlNEZWxpdmVyeVJlc3VsdD4ge1xyXG4gICAgY29uc3QgdG9waWNBcm4gPSBwcm9jZXNzLmVudi5TTlNfVE9QSUNfQVJOX0VNQUlMO1xyXG4gICAgaWYgKCF0b3BpY0Fybikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NOU19UT1BJQ19BUk5fRU1BSUwgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgIGRlZmF1bHQ6IGJvZHksXHJcbiAgICAgIGVtYWlsOiBib2R5LFxyXG4gICAgICBzdWJqZWN0LFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMucHVibGlzaFRvVG9waWModG9waWNBcm4sIG1lc3NhZ2UsIHtcclxuICAgICAgcmVjaXBpZW50LFxyXG4gICAgICBjaGFubmVsOiAnZW1haWwnLFxyXG4gICAgICBzdWJqZWN0LFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIFNNUyBub3RpZmljYXRpb24gdmlhIFNOU1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBwaG9uZU51bWJlciAtIFBob25lIG51bWJlciBpbiBFLjE2NCBmb3JtYXRcclxuICAgKiBAcGFyYW0gbWVzc2FnZSAtIFNNUyBtZXNzYWdlIChwbGFpbiB0ZXh0KVxyXG4gICAqIEByZXR1cm5zIFNOUyBkZWxpdmVyeSByZXN1bHRcclxuICAgKi9cclxuICBhc3luYyBzZW5kU01TKHBob25lTnVtYmVyOiBzdHJpbmcsIG1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8U05TRGVsaXZlcnlSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHRvcGljQXJuID0gcHJvY2Vzcy5lbnYuU05TX1RPUElDX0FSTl9TTVM7XHJcbiAgICBpZiAoIXRvcGljQXJuKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignU05TX1RPUElDX0FSTl9TTVMgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0aGlzLnB1Ymxpc2hUb1RvcGljKHRvcGljQXJuLCBtZXNzYWdlLCB7XHJcbiAgICAgIHJlY2lwaWVudDogcGhvbmVOdW1iZXIsXHJcbiAgICAgIGNoYW5uZWw6ICdzbXMnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIHdlYmhvb2sgbm90aWZpY2F0aW9uIHZpYSBTTlNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gd2ViaG9va1VybCAtIFdlYmhvb2sgVVJMXHJcbiAgICogQHBhcmFtIHBheWxvYWQgLSBKU09OIHBheWxvYWRcclxuICAgKiBAcmV0dXJucyBTTlMgZGVsaXZlcnkgcmVzdWx0XHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZFdlYmhvb2sod2ViaG9va1VybDogc3RyaW5nLCBwYXlsb2FkOiBvYmplY3QpOiBQcm9taXNlPFNOU0RlbGl2ZXJ5UmVzdWx0PiB7XHJcbiAgICBjb25zdCB0b3BpY0FybiA9IHByb2Nlc3MuZW52LlNOU19UT1BJQ19BUk5fV0VCSE9PSztcclxuICAgIGlmICghdG9waWNBcm4pIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTTlNfVE9QSUNfQVJOX1dFQkhPT0sgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IG1lc3NhZ2UgPSBKU09OLnN0cmluZ2lmeShwYXlsb2FkKTtcclxuXHJcbiAgICByZXR1cm4gdGhpcy5wdWJsaXNoVG9Ub3BpYyh0b3BpY0FybiwgbWVzc2FnZSwge1xyXG4gICAgICByZWNpcGllbnQ6IHdlYmhvb2tVcmwsXHJcbiAgICAgIGNoYW5uZWw6ICd3ZWJob29rJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBub3RpZmljYXRpb24gdG8gU2xhY2sgd2l0aCBCbG9jayBLaXQgZm9ybWF0dGluZyBhbmQgYWN0aW9uIGJ1dHRvbnNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gd2ViaG9va1VybCAtIFNsYWNrIHdlYmhvb2sgVVJMXHJcbiAgICogQHBhcmFtIGJsb2NrcyAtIFNsYWNrIEJsb2NrIEtpdCBibG9ja3NcclxuICAgKiBAcGFyYW0gYWN0aW9uQnV0dG9ucyAtIE9wdGlvbmFsIGFjdGlvbiBidXR0b25zICh2aWV3IHRlc3QsIHZpZXcgbG9ncywgcmUtcnVuIHRlc3QpXHJcbiAgICogQHJldHVybnMgU05TIGRlbGl2ZXJ5IHJlc3VsdFxyXG4gICAqL1xyXG4gIGFzeW5jIHNlbmRUb1NsYWNrKFxyXG4gICAgd2ViaG9va1VybDogc3RyaW5nLFxyXG4gICAgYmxvY2tzOiBTbGFja0Jsb2NrW10sXHJcbiAgICBhY3Rpb25CdXR0b25zPzogQXJyYXk8eyB0ZXh0OiBzdHJpbmc7IHVybDogc3RyaW5nOyB2YWx1ZT86IHN0cmluZyB9PlxyXG4gICk6IFByb21pc2U8U05TRGVsaXZlcnlSZXN1bHQ+IHtcclxuICAgIC8vIEFkZCBhY3Rpb24gYnV0dG9ucyBpZiBwcm92aWRlZFxyXG4gICAgaWYgKGFjdGlvbkJ1dHRvbnMgJiYgYWN0aW9uQnV0dG9ucy5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IGFjdGlvbnNCbG9jazogU2xhY2tCbG9jayA9IHtcclxuICAgICAgICB0eXBlOiAnYWN0aW9ucycsXHJcbiAgICAgICAgZWxlbWVudHM6IGFjdGlvbkJ1dHRvbnMubWFwKChidXR0b24pID0+ICh7XHJcbiAgICAgICAgICB0eXBlOiAnYnV0dG9uJyxcclxuICAgICAgICAgIHRleHQ6IHtcclxuICAgICAgICAgICAgdHlwZTogJ3BsYWluX3RleHQnLFxyXG4gICAgICAgICAgICB0ZXh0OiBidXR0b24udGV4dCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB1cmw6IGJ1dHRvbi51cmwsXHJcbiAgICAgICAgICB2YWx1ZTogYnV0dG9uLnZhbHVlIHx8IGJ1dHRvbi50ZXh0LFxyXG4gICAgICAgIH0pKSxcclxuICAgICAgfTtcclxuICAgICAgYmxvY2tzLnB1c2goYWN0aW9uc0Jsb2NrKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBwYXlsb2FkID0ge1xyXG4gICAgICBibG9ja3MsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB0aGlzLnNlbmRXZWJob29rKHdlYmhvb2tVcmwsIHBheWxvYWQpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIFNsYWNrIGFjdGlvbiBidXR0b25zIGZvciB0ZXN0IGV4ZWN1dGlvblxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBleGVjdXRpb25JZCAtIFRlc3QgZXhlY3V0aW9uIElEXHJcbiAgICogQHBhcmFtIHRlc3RDYXNlSWQgLSBUZXN0IGNhc2UgSURcclxuICAgKiBAcGFyYW0gYmFzZVVybCAtIEJhc2UgVVJMIGZvciB0aGUgYXBwbGljYXRpb25cclxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBhY3Rpb24gYnV0dG9uc1xyXG4gICAqL1xyXG4gIGNyZWF0ZVNsYWNrQWN0aW9uQnV0dG9ucyhcclxuICAgIGV4ZWN1dGlvbklkOiBzdHJpbmcsXHJcbiAgICB0ZXN0Q2FzZUlkOiBzdHJpbmcsXHJcbiAgICBiYXNlVXJsOiBzdHJpbmdcclxuICApOiBBcnJheTx7IHRleHQ6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHZhbHVlPzogc3RyaW5nIH0+IHtcclxuICAgIHJldHVybiBbXHJcbiAgICAgIHtcclxuICAgICAgICB0ZXh0OiAn8J+TiiBWaWV3IFRlc3QnLFxyXG4gICAgICAgIHVybDogYCR7YmFzZVVybH0vZXhlY3V0aW9ucy8ke2V4ZWN1dGlvbklkfWAsXHJcbiAgICAgICAgdmFsdWU6ICd2aWV3X3Rlc3QnLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgdGV4dDogJ/Cfk50gVmlldyBMb2dzJyxcclxuICAgICAgICB1cmw6IGAke2Jhc2VVcmx9L2V4ZWN1dGlvbnMvJHtleGVjdXRpb25JZH0vbG9nc2AsXHJcbiAgICAgICAgdmFsdWU6ICd2aWV3X2xvZ3MnLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgdGV4dDogJ/CflIQgUmUtcnVuIFRlc3QnLFxyXG4gICAgICAgIHVybDogYCR7YmFzZVVybH0vdGVzdC1jYXNlcy8ke3Rlc3RDYXNlSWR9L2V4ZWN1dGVgLFxyXG4gICAgICAgIHZhbHVlOiAncmVydW5fdGVzdCcsXHJcbiAgICAgIH0sXHJcbiAgICBdO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHVibGlzaCBtZXNzYWdlIHRvIFNOUyB0b3BpYyB3aXRoIHJldHJ5IGxvZ2ljIGFuZCByYXRlIGxpbWl0aW5nXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHRvcGljQXJuIC0gU05TIHRvcGljIEFSTlxyXG4gICAqIEBwYXJhbSBtZXNzYWdlIC0gTWVzc2FnZSBjb250ZW50XHJcbiAgICogQHBhcmFtIGF0dHJpYnV0ZXMgLSBPcHRpb25hbCBtZXNzYWdlIGF0dHJpYnV0ZXNcclxuICAgKiBAcmV0dXJucyBTTlMgZGVsaXZlcnkgcmVzdWx0XHJcbiAgICovXHJcbiAgYXN5bmMgcHVibGlzaFRvVG9waWMoXHJcbiAgICB0b3BpY0Fybjogc3RyaW5nLFxyXG4gICAgbWVzc2FnZTogc3RyaW5nLFxyXG4gICAgYXR0cmlidXRlcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cclxuICApOiBQcm9taXNlPFNOU0RlbGl2ZXJ5UmVzdWx0PiB7XHJcbiAgICAvLyBWYWxpZGF0ZSBwYXlsb2FkIHNpemVcclxuICAgIGNvbnN0IHBheWxvYWRTaXplID0gQnVmZmVyLmJ5dGVMZW5ndGgobWVzc2FnZSwgJ3V0ZjgnKTtcclxuICAgIGlmIChwYXlsb2FkU2l6ZSA+IHRoaXMuTUFYX1BBWUxPQURfU0laRSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIG1lc3NhZ2VJZDogJycsXHJcbiAgICAgICAgY2hhbm5lbDogKGF0dHJpYnV0ZXM/LmNoYW5uZWwgYXMgTm90aWZpY2F0aW9uQ2hhbm5lbCkgfHwgJ2VtYWlsJyxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsZWQnLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogYFBheWxvYWQgc2l6ZSAke3BheWxvYWRTaXplfSBieXRlcyBleGNlZWRzIGxpbWl0IG9mICR7dGhpcy5NQVhfUEFZTE9BRF9TSVpFfSBieXRlc2AsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgcmF0ZSBsaW1pdCBiZWZvcmUgYXR0ZW1wdGluZyB0byBwdWJsaXNoXHJcbiAgICBjb25zdCByYXRlTGltaXRSZXN1bHQgPSBhd2FpdCByYXRlTGltaXRlclNlcnZpY2UuY2hlY2tSYXRlTGltaXQodG9waWNBcm4pO1xyXG4gICAgaWYgKCFyYXRlTGltaXRSZXN1bHQuYWxsb3dlZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIG1lc3NhZ2VJZDogJycsXHJcbiAgICAgICAgY2hhbm5lbDogKGF0dHJpYnV0ZXM/LmNoYW5uZWwgYXMgTm90aWZpY2F0aW9uQ2hhbm5lbCkgfHwgJ2VtYWlsJyxcclxuICAgICAgICBzdGF0dXM6ICdmYWlsZWQnLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogYFJhdGUgbGltaXQgZXhjZWVkZWQuIFJldHJ5IGFmdGVyICR7cmF0ZUxpbWl0UmVzdWx0LnJldHJ5QWZ0ZXJNc31tc2AsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUHJlcGFyZSBTTlMgcHVibGlzaCBjb21tYW5kXHJcbiAgICBjb25zdCBpbnB1dDogUHVibGlzaENvbW1hbmRJbnB1dCA9IHtcclxuICAgICAgVG9waWNBcm46IHRvcGljQXJuLFxyXG4gICAgICBNZXNzYWdlOiBtZXNzYWdlLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBZGQgbWVzc2FnZSBhdHRyaWJ1dGVzIGlmIHByb3ZpZGVkXHJcbiAgICBpZiAoYXR0cmlidXRlcykge1xyXG4gICAgICBpbnB1dC5NZXNzYWdlQXR0cmlidXRlcyA9IHt9O1xyXG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhhdHRyaWJ1dGVzKSkge1xyXG4gICAgICAgIGlucHV0Lk1lc3NhZ2VBdHRyaWJ1dGVzW2tleV0gPSB7XHJcbiAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICBTdHJpbmdWYWx1ZTogdmFsdWUsXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEV4ZWN1dGUgd2l0aCByZXRyeSBsb2dpY1xyXG4gICAgY29uc3QgcmV0cnlDb25maWcgPSB7XHJcbiAgICAgIG1heFJldHJpZXM6IDMsXHJcbiAgICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgICBtYXhEZWxheU1zOiAxNjAwMCxcclxuICAgICAgYmFja29mZk11bHRpcGxpZXI6IDIsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHJldHJ5UmVzdWx0ID0gYXdhaXQgcmV0cnlIYW5kbGVyU2VydmljZS5leGVjdXRlV2l0aFJldHJ5KFxyXG4gICAgICBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdWJsaXNoQ29tbWFuZChpbnB1dCk7XHJcbiAgICAgICAgcmV0dXJuIGF3YWl0IHRoaXMuc25zQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIH0sXHJcbiAgICAgIHJldHJ5Q29uZmlnXHJcbiAgICApO1xyXG5cclxuICAgIGlmIChyZXRyeVJlc3VsdC5zdWNjZXNzICYmIHJldHJ5UmVzdWx0LnJlc3VsdCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIG1lc3NhZ2VJZDogcmV0cnlSZXN1bHQucmVzdWx0Lk1lc3NhZ2VJZCB8fCAnJyxcclxuICAgICAgICBjaGFubmVsOiAoYXR0cmlidXRlcz8uY2hhbm5lbCBhcyBOb3RpZmljYXRpb25DaGFubmVsKSB8fCAnZW1haWwnLFxyXG4gICAgICAgIHN0YXR1czogJ3NlbnQnLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIG1lc3NhZ2VJZDogJycsXHJcbiAgICAgIGNoYW5uZWw6IChhdHRyaWJ1dGVzPy5jaGFubmVsIGFzIE5vdGlmaWNhdGlvbkNoYW5uZWwpIHx8ICdlbWFpbCcsXHJcbiAgICAgIHN0YXR1czogJ2ZhaWxlZCcsXHJcbiAgICAgIGVycm9yTWVzc2FnZTogcmV0cnlSZXN1bHQuZXJyb3I/Lm1lc3NhZ2UgfHwgJ1Vua25vd24gZXJyb3InLFxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IHNuc0RlbGl2ZXJ5U2VydmljZSA9IG5ldyBTTlNEZWxpdmVyeVNlcnZpY2UoKTtcclxuIl19