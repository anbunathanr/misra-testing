/**
 * n8n Integration Service
 *
 * Handles optional integration with n8n workflow automation platform.
 * Supports webhook delivery with timeout, authentication, and configuration validation.
 */
import { N8NWebhookPayload, N8NDeliveryResult } from '../types/notification';
export declare class N8NIntegrationService {
    private readonly WEBHOOK_TIMEOUT_MS;
    private readonly VERSION;
    /**
     * Send notification event to n8n webhook
     *
     * @param payload - Webhook payload with event data
     * @returns Delivery result with success status and timing
     */
    sendToWebhook(payload: N8NWebhookPayload): Promise<N8NDeliveryResult>;
    /**
     * Check if n8n integration is enabled
     *
     * @returns True if n8n is enabled and configured
     */
    isEnabled(): Promise<boolean>;
    /**
     * Validate n8n configuration
     *
     * @returns True if configuration is valid
     */
    validateConfiguration(): Promise<boolean>;
    /**
     * Get authentication headers based on configuration
     *
     * @returns Authentication headers object
     */
    private getAuthenticationHeaders;
}
export declare const n8nIntegrationService: N8NIntegrationService;
