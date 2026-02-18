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
     * Send notification to Slack with Block Kit formatting
     *
     * @param webhookUrl - Slack webhook URL
     * @param blocks - Slack Block Kit blocks
     * @returns SNS delivery result
     */
    async sendToSlack(webhookUrl, blocks) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic25zLWRlbGl2ZXJ5LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzbnMtZGVsaXZlcnktc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILG9EQUFxRjtBQUVyRixtRUFBOEQ7QUFFOUQsTUFBYSxrQkFBa0I7SUFDckIsU0FBUyxDQUFZO0lBQ1osZ0JBQWdCLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLFNBQVM7SUFFekQ7UUFDRSxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksc0JBQVMsQ0FBQztZQUM3QixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7Ozs7T0FPRztJQUNILEtBQUssQ0FBQyxTQUFTLENBQUMsU0FBaUIsRUFBRSxPQUFlLEVBQUUsSUFBWTtRQUM5RCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDO1FBQ2pELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNkLE1BQU0sSUFBSSxLQUFLLENBQUMsa0RBQWtELENBQUMsQ0FBQztRQUN0RSxDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUM3QixPQUFPLEVBQUUsSUFBSTtZQUNiLEtBQUssRUFBRSxJQUFJO1lBQ1gsT0FBTztTQUNSLENBQUMsQ0FBQztRQUVILE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFO1lBQzVDLFNBQVM7WUFDVCxPQUFPLEVBQUUsT0FBTztZQUNoQixPQUFPO1NBQ1IsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBbUIsRUFBRSxPQUFlO1FBQ2hELE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlC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V0FBVyxDQUNaLENBQUM7UUFFRixJQUFJLFdBQVcsQ0FBQyxPQUFPLElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlDLE9BQU87Z0JBQ0wsU0FBUyxFQUFFLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJLEVBQUU7Z0JBQzdDLE9BQU8sRUFBRyxVQUFVLEVBQUUsT0FBK0IsSUFBSSxPQUFPO2dCQUNoRSxNQUFNLEVBQUUsTUFBTTthQUNmLENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTztZQUNMLFNBQVMsRUFBRSxFQUFFO1lBQ2IsT0FBTyxFQUFHLFVBQVUsRUFBRSxPQUErQixJQUFJLE9BQU87WUFDaEUsTUFBTSxFQUFFLFFBQVE7WUFDaEIsWUFBWSxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsT0FBTyxJQUFJLGVBQWU7U0FDNUQsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXBLRCxnREFvS0M7QUFFRCw0QkFBNEI7QUFDZixRQUFBLGtCQUFrQixHQUFHLElBQUksa0JBQWtCLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBTTlMgRGVsaXZlcnkgU2VydmljZVxyXG4gKiBcclxuICogSGFuZGxlcyBtZXNzYWdlIGRlbGl2ZXJ5IHRocm91Z2ggQVdTIFNOUyB0byBlbWFpbCwgU01TLCBhbmQgd2ViaG9vayBjaGFubmVscy5cclxuICogSW50ZWdyYXRlcyByZXRyeSBoYW5kbGVyIGZvciBmYWlsZWQgZGVsaXZlcmllcyBhbmQgc3VwcG9ydHMgU2xhY2sgQmxvY2sgS2l0IGZvcm1hdHRpbmcuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgU05TQ2xpZW50LCBQdWJsaXNoQ29tbWFuZCwgUHVibGlzaENvbW1hbmRJbnB1dCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBTTlNEZWxpdmVyeU9wdGlvbnMsIFNOU0RlbGl2ZXJ5UmVzdWx0LCBOb3RpZmljYXRpb25DaGFubmVsLCBTbGFja0Jsb2NrIH0gZnJvbSAnLi4vdHlwZXMvbm90aWZpY2F0aW9uJztcclxuaW1wb3J0IHsgcmV0cnlIYW5kbGVyU2VydmljZSB9IGZyb20gJy4vcmV0cnktaGFuZGxlci1zZXJ2aWNlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTTlNEZWxpdmVyeVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgc25zQ2xpZW50OiBTTlNDbGllbnQ7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBNQVhfUEFZTE9BRF9TSVpFID0gMjU2ICogMTAyNDsgLy8gMjU2IEtCXHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5zbnNDbGllbnQgPSBuZXcgU05TQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTZW5kIGVtYWlsIG5vdGlmaWNhdGlvbiB2aWEgU05TXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHJlY2lwaWVudCAtIEVtYWlsIGFkZHJlc3NcclxuICAgKiBAcGFyYW0gc3ViamVjdCAtIEVtYWlsIHN1YmplY3RcclxuICAgKiBAcGFyYW0gYm9keSAtIEVtYWlsIGJvZHkgKEhUTUwgb3IgcGxhaW4gdGV4dClcclxuICAgKiBAcmV0dXJucyBTTlMgZGVsaXZlcnkgcmVzdWx0XHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZEVtYWlsKHJlY2lwaWVudDogc3RyaW5nLCBzdWJqZWN0OiBzdHJpbmcsIGJvZHk6IHN0cmluZyk6IFByb21pc2U8U05TRGVsaXZlcnlSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHRvcGljQXJuID0gcHJvY2Vzcy5lbnYuU05TX1RPUElDX0FSTl9FTUFJTDtcclxuICAgIGlmICghdG9waWNBcm4pIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdTTlNfVE9QSUNfQVJOX0VNQUlMIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtZXNzYWdlID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICBkZWZhdWx0OiBib2R5LFxyXG4gICAgICBlbWFpbDogYm9keSxcclxuICAgICAgc3ViamVjdCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiB0aGlzLnB1Ymxpc2hUb1RvcGljKHRvcGljQXJuLCBtZXNzYWdlLCB7XHJcbiAgICAgIHJlY2lwaWVudCxcclxuICAgICAgY2hhbm5lbDogJ2VtYWlsJyxcclxuICAgICAgc3ViamVjdCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBTTVMgbm90aWZpY2F0aW9uIHZpYSBTTlNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gcGhvbmVOdW1iZXIgLSBQaG9uZSBudW1iZXIgaW4gRS4xNjQgZm9ybWF0XHJcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBTTVMgbWVzc2FnZSAocGxhaW4gdGV4dClcclxuICAgKiBAcmV0dXJucyBTTlMgZGVsaXZlcnkgcmVzdWx0XHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZFNNUyhwaG9uZU51bWJlcjogc3RyaW5nLCBtZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPFNOU0RlbGl2ZXJ5UmVzdWx0PiB7XHJcbiAgICBjb25zdCB0b3BpY0FybiA9IHByb2Nlc3MuZW52LlNOU19UT1BJQ19BUk5fU01TO1xyXG4gICAgaWYgKCF0b3BpY0Fybikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ1NOU19UT1BJQ19BUk5fU01TIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQnKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gdGhpcy5wdWJsaXNoVG9Ub3BpYyh0b3BpY0FybiwgbWVzc2FnZSwge1xyXG4gICAgICByZWNpcGllbnQ6IHBob25lTnVtYmVyLFxyXG4gICAgICBjaGFubmVsOiAnc21zJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCB3ZWJob29rIG5vdGlmaWNhdGlvbiB2aWEgU05TXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHdlYmhvb2tVcmwgLSBXZWJob29rIFVSTFxyXG4gICAqIEBwYXJhbSBwYXlsb2FkIC0gSlNPTiBwYXlsb2FkXHJcbiAgICogQHJldHVybnMgU05TIGRlbGl2ZXJ5IHJlc3VsdFxyXG4gICAqL1xyXG4gIGFzeW5jIHNlbmRXZWJob29rKHdlYmhvb2tVcmw6IHN0cmluZywgcGF5bG9hZDogb2JqZWN0KTogUHJvbWlzZTxTTlNEZWxpdmVyeVJlc3VsdD4ge1xyXG4gICAgY29uc3QgdG9waWNBcm4gPSBwcm9jZXNzLmVudi5TTlNfVE9QSUNfQVJOX1dFQkhPT0s7XHJcbiAgICBpZiAoIXRvcGljQXJuKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignU05TX1RPUElDX0FSTl9XRUJIT09LIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBtZXNzYWdlID0gSlNPTi5zdHJpbmdpZnkocGF5bG9hZCk7XHJcblxyXG4gICAgcmV0dXJuIHRoaXMucHVibGlzaFRvVG9waWModG9waWNBcm4sIG1lc3NhZ2UsIHtcclxuICAgICAgcmVjaXBpZW50OiB3ZWJob29rVXJsLFxyXG4gICAgICBjaGFubmVsOiAnd2ViaG9vaycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgbm90aWZpY2F0aW9uIHRvIFNsYWNrIHdpdGggQmxvY2sgS2l0IGZvcm1hdHRpbmdcclxuICAgKiBcclxuICAgKiBAcGFyYW0gd2ViaG9va1VybCAtIFNsYWNrIHdlYmhvb2sgVVJMXHJcbiAgICogQHBhcmFtIGJsb2NrcyAtIFNsYWNrIEJsb2NrIEtpdCBibG9ja3NcclxuICAgKiBAcmV0dXJucyBTTlMgZGVsaXZlcnkgcmVzdWx0XHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZFRvU2xhY2sod2ViaG9va1VybDogc3RyaW5nLCBibG9ja3M6IFNsYWNrQmxvY2tbXSk6IFByb21pc2U8U05TRGVsaXZlcnlSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHBheWxvYWQgPSB7XHJcbiAgICAgIGJsb2NrcyxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHRoaXMuc2VuZFdlYmhvb2sod2ViaG9va1VybCwgcGF5bG9hZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBQdWJsaXNoIG1lc3NhZ2UgdG8gU05TIHRvcGljIHdpdGggcmV0cnkgbG9naWNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdG9waWNBcm4gLSBTTlMgdG9waWMgQVJOXHJcbiAgICogQHBhcmFtIG1lc3NhZ2UgLSBNZXNzYWdlIGNvbnRlbnRcclxuICAgKiBAcGFyYW0gYXR0cmlidXRlcyAtIE9wdGlvbmFsIG1lc3NhZ2UgYXR0cmlidXRlc1xyXG4gICAqIEByZXR1cm5zIFNOUyBkZWxpdmVyeSByZXN1bHRcclxuICAgKi9cclxuICBhc3luYyBwdWJsaXNoVG9Ub3BpYyhcclxuICAgIHRvcGljQXJuOiBzdHJpbmcsXHJcbiAgICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgICBhdHRyaWJ1dGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxyXG4gICk6IFByb21pc2U8U05TRGVsaXZlcnlSZXN1bHQ+IHtcclxuICAgIC8vIFZhbGlkYXRlIHBheWxvYWQgc2l6ZVxyXG4gICAgY29uc3QgcGF5bG9hZFNpemUgPSBCdWZmZXIuYnl0ZUxlbmd0aChtZXNzYWdlLCAndXRmOCcpO1xyXG4gICAgaWYgKHBheWxvYWRTaXplID4gdGhpcy5NQVhfUEFZTE9BRF9TSVpFKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbWVzc2FnZUlkOiAnJyxcclxuICAgICAgICBjaGFubmVsOiAoYXR0cmlidXRlcz8uY2hhbm5lbCBhcyBOb3RpZmljYXRpb25DaGFubmVsKSB8fCAnZW1haWwnLFxyXG4gICAgICAgIHN0YXR1czogJ2ZhaWxlZCcsXHJcbiAgICAgICAgZXJyb3JNZXNzYWdlOiBgUGF5bG9hZCBzaXplICR7cGF5bG9hZFNpemV9IGJ5dGVzIGV4Y2VlZHMgbGltaXQgb2YgJHt0aGlzLk1BWF9QQVlMT0FEX1NJWkV9IGJ5dGVzYCxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQcmVwYXJlIFNOUyBwdWJsaXNoIGNvbW1hbmRcclxuICAgIGNvbnN0IGlucHV0OiBQdWJsaXNoQ29tbWFuZElucHV0ID0ge1xyXG4gICAgICBUb3BpY0FybjogdG9waWNBcm4sXHJcbiAgICAgIE1lc3NhZ2U6IG1lc3NhZ2UsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEFkZCBtZXNzYWdlIGF0dHJpYnV0ZXMgaWYgcHJvdmlkZWRcclxuICAgIGlmIChhdHRyaWJ1dGVzKSB7XHJcbiAgICAgIGlucHV0Lk1lc3NhZ2VBdHRyaWJ1dGVzID0ge307XHJcbiAgICAgIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKGF0dHJpYnV0ZXMpKSB7XHJcbiAgICAgICAgaW5wdXQuTWVzc2FnZUF0dHJpYnV0ZXNba2V5XSA9IHtcclxuICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgIFN0cmluZ1ZhbHVlOiB2YWx1ZSxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXhlY3V0ZSB3aXRoIHJldHJ5IGxvZ2ljXHJcbiAgICBjb25zdCByZXRyeUNvbmZpZyA9IHtcclxuICAgICAgbWF4UmV0cmllczogMyxcclxuICAgICAgaW5pdGlhbERlbGF5TXM6IDEwMDAsXHJcbiAgICAgIG1heERlbGF5TXM6IDE2MDAwLFxyXG4gICAgICBiYWNrb2ZmTXVsdGlwbGllcjogMixcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgcmV0cnlSZXN1bHQgPSBhd2FpdCByZXRyeUhhbmRsZXJTZXJ2aWNlLmV4ZWN1dGVXaXRoUmV0cnkoXHJcbiAgICAgIGFzeW5jICgpID0+IHtcclxuICAgICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1Ymxpc2hDb21tYW5kKGlucHV0KTtcclxuICAgICAgICByZXR1cm4gYXdhaXQgdGhpcy5zbnNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgfSxcclxuICAgICAgcmV0cnlDb25maWdcclxuICAgICk7XHJcblxyXG4gICAgaWYgKHJldHJ5UmVzdWx0LnN1Y2Nlc3MgJiYgcmV0cnlSZXN1bHQucmVzdWx0KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgbWVzc2FnZUlkOiByZXRyeVJlc3VsdC5yZXN1bHQuTWVzc2FnZUlkIHx8ICcnLFxyXG4gICAgICAgIGNoYW5uZWw6IChhdHRyaWJ1dGVzPy5jaGFubmVsIGFzIE5vdGlmaWNhdGlvbkNoYW5uZWwpIHx8ICdlbWFpbCcsXHJcbiAgICAgICAgc3RhdHVzOiAnc2VudCcsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgbWVzc2FnZUlkOiAnJyxcclxuICAgICAgY2hhbm5lbDogKGF0dHJpYnV0ZXM/LmNoYW5uZWwgYXMgTm90aWZpY2F0aW9uQ2hhbm5lbCkgfHwgJ2VtYWlsJyxcclxuICAgICAgc3RhdHVzOiAnZmFpbGVkJyxcclxuICAgICAgZXJyb3JNZXNzYWdlOiByZXRyeVJlc3VsdC5lcnJvcj8ubWVzc2FnZSB8fCAnVW5rbm93biBlcnJvcicsXHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3Qgc25zRGVsaXZlcnlTZXJ2aWNlID0gbmV3IFNOU0RlbGl2ZXJ5U2VydmljZSgpO1xyXG4iXX0=