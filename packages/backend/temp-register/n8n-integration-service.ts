/**
 * n8n Integration Service
 * 
 * Handles optional integration with n8n workflow automation platform.
 * Supports webhook delivery with timeout, authentication, and configuration validation.
 */

import { N8NWebhookPayload, N8NDeliveryResult } from '../types/notification';

export class N8NIntegrationService {
  private readonly WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds
  private readonly VERSION = '1.0.0';

  /**
   * Send notification event to n8n webhook
   * 
   * @param payload - Webhook payload with event data
   * @returns Delivery result with success status and timing
   */
  async sendToWebhook(payload: N8NWebhookPayload): Promise<N8NDeliveryResult> {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      return {
        success: false,
        errorMessage: 'N8N_WEBHOOK_URL not configured',
        duration: 0,
      };
    }

    // Add metadata
    const enrichedPayload: N8NWebhookPayload = {
      ...payload,
      metadata: {
        source: 'aibts',
        version: this.VERSION,
      },
    };

    const startTime = Date.now();

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.WEBHOOK_TIMEOUT_MS);

      // Prepare request headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add authentication headers if configured
      const authHeaders = this.getAuthenticationHeaders();
      Object.assign(headers, authHeaders);

      // Send webhook request
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(enrichedPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseBody = await response.text();

      if (response.ok) {
        return {
          success: true,
          statusCode: response.status,
          responseBody,
          duration,
        };
      }

      return {
        success: false,
        statusCode: response.status,
        responseBody,
        errorMessage: `Webhook returned status ${response.status}`,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      // Check if error is due to timeout (handles both Error and DOMException)
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
        return {
          success: false,
          errorMessage: `Webhook request timed out after ${this.WEBHOOK_TIMEOUT_MS}ms`,
          duration,
        };
      }

      if (error instanceof Error) {
        return {
          success: false,
          errorMessage: error.message,
          duration,
        };
      }

      return {
        success: false,
        errorMessage: 'Unknown error occurred',
        duration,
      };
    }
  }

  /**
   * Check if n8n integration is enabled
   * 
   * @returns True if n8n is enabled and configured
   */
  async isEnabled(): Promise<boolean> {
    const enabled = process.env.N8N_ENABLED === 'true';
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    return enabled && !!webhookUrl;
  }

  /**
   * Validate n8n configuration
   * 
   * @returns True if configuration is valid
   */
  async validateConfiguration(): Promise<boolean> {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('N8N_WEBHOOK_URL not configured');
      return false;
    }

    // Validate URL format
    try {
      const url = new URL(webhookUrl);
      
      // Ensure HTTPS for security
      if (url.protocol !== 'https:' && url.protocol !== 'http:') {
        console.warn('N8N_WEBHOOK_URL must use HTTP or HTTPS protocol');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Invalid N8N_WEBHOOK_URL format', { error });
      return false;
    }
  }

  /**
   * Get authentication headers based on configuration
   * 
   * @returns Authentication headers object
   */
  private getAuthenticationHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};

    // Check for API key authentication
    const apiKey = process.env.N8N_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
      return headers;
    }

    // Check for bearer token authentication
    const bearerToken = process.env.N8N_BEARER_TOKEN;
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`;
      return headers;
    }

    return headers;
  }
}

// Export singleton instance
export const n8nIntegrationService = new N8NIntegrationService();
