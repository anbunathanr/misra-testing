"use strict";
/**
 * n8n Integration Service
 *
 * Handles optional integration with n8n workflow automation platform.
 * Supports webhook delivery with timeout, authentication, and configuration validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.n8nIntegrationService = exports.N8NIntegrationService = void 0;
class N8NIntegrationService {
    WEBHOOK_TIMEOUT_MS = 10000; // 10 seconds
    VERSION = '1.0.0';
    /**
     * Send notification event to n8n webhook
     *
     * @param payload - Webhook payload with event data
     * @returns Delivery result with success status and timing
     */
    async sendToWebhook(payload) {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl) {
            return {
                success: false,
                errorMessage: 'N8N_WEBHOOK_URL not configured',
                duration: 0,
            };
        }
        // Add metadata
        const enrichedPayload = {
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
            const headers = {
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
        }
        catch (error) {
            const duration = Date.now() - startTime;
            if (error instanceof Error) {
                // Check if error is due to timeout
                if (error.name === 'AbortError') {
                    return {
                        success: false,
                        errorMessage: `Webhook request timed out after ${this.WEBHOOK_TIMEOUT_MS}ms`,
                        duration,
                    };
                }
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
    async isEnabled() {
        const enabled = process.env.N8N_ENABLED === 'true';
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        return enabled && !!webhookUrl;
    }
    /**
     * Validate n8n configuration
     *
     * @returns True if configuration is valid
     */
    async validateConfiguration() {
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
        }
        catch (error) {
            console.error('Invalid N8N_WEBHOOK_URL format', { error });
            return false;
        }
    }
    /**
     * Get authentication headers based on configuration
     *
     * @returns Authentication headers object
     */
    getAuthenticationHeaders() {
        const headers = {};
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
exports.N8NIntegrationService = N8NIntegrationService;
// Export singleton instance
exports.n8nIntegrationService = new N8NIntegrationService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibjhuLWludGVncmF0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuOG4taW50ZWdyYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUlILE1BQWEscUJBQXFCO0lBQ2Ysa0JBQWtCLEdBQUcsS0FBSyxDQUFDLENBQUMsYUFBYTtJQUN6QyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBRW5DOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUEwQjtRQUM1QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQztRQUUvQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxPQUFPLEVBQUUsS0FBSztnQkFDZCxZQUFZLEVBQUUsZ0NBQWdDO2dCQUM5QyxRQUFRLEVBQUUsQ0FBQzthQUNaLENBQUM7UUFDSixDQUFDO1FBRUQsZUFBZTtRQUNmLE1BQU0sZUFBZSxHQUFzQjtZQUN6QyxHQUFHLE9BQU87WUFDVixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2FBQ3RCO1NBQ0YsQ0FBQztRQUVGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFJLENBQUM7WUFDSCxzQ0FBc0M7WUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRWhGLDBCQUEwQjtZQUMxQixNQUFNLE9BQU8sR0FBMkI7Z0JBQ3RDLGNBQWMsRUFBRSxrQkFBa0I7YUFDbkMsQ0FBQztZQUVGLDJDQUEyQztZQUMzQyxNQUFNLFdBQVcsR0FBRyxJQUFJ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O1lBRUQsT0FBTyxJQUFJLENBQUM7UUFDZCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQzNELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssd0JBQXdCO1FBQzlCLE1BQU0sT0FBTyxHQUEyQixFQUFFLENBQUM7UUFFM0MsbUNBQW1DO1FBQ25DLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDO1FBQ3ZDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDWCxPQUFPLENBQUMsV0FBVyxDQUFDLEdBQUcsTUFBTSxDQUFDO1lBQzlCLE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFFRCx3Q0FBd0M7UUFDeEMsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQztRQUNqRCxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sQ0FBQyxlQUFlLENBQUMsR0FBRyxVQUFVLFdBQVcsRUFBRSxDQUFDO1lBQ25ELE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQztJQUNqQixDQUFDO0NBQ0Y7QUF6S0Qsc0RBeUtDO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSxxQkFBcUIsR0FBRyxJQUFJLHFCQUFxQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogbjhuIEludGVncmF0aW9uIFNlcnZpY2VcclxuICogXHJcbiAqIEhhbmRsZXMgb3B0aW9uYWwgaW50ZWdyYXRpb24gd2l0aCBuOG4gd29ya2Zsb3cgYXV0b21hdGlvbiBwbGF0Zm9ybS5cclxuICogU3VwcG9ydHMgd2ViaG9vayBkZWxpdmVyeSB3aXRoIHRpbWVvdXQsIGF1dGhlbnRpY2F0aW9uLCBhbmQgY29uZmlndXJhdGlvbiB2YWxpZGF0aW9uLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE44TldlYmhvb2tQYXlsb2FkLCBOOE5EZWxpdmVyeVJlc3VsdCB9IGZyb20gJy4uL3R5cGVzL25vdGlmaWNhdGlvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgTjhOSW50ZWdyYXRpb25TZXJ2aWNlIHtcclxuICBwcml2YXRlIHJlYWRvbmx5IFdFQkhPT0tfVElNRU9VVF9NUyA9IDEwMDAwOyAvLyAxMCBzZWNvbmRzXHJcbiAgcHJpdmF0ZSByZWFkb25seSBWRVJTSU9OID0gJzEuMC4wJztcclxuXHJcbiAgLyoqXHJcbiAgICogU2VuZCBub3RpZmljYXRpb24gZXZlbnQgdG8gbjhuIHdlYmhvb2tcclxuICAgKiBcclxuICAgKiBAcGFyYW0gcGF5bG9hZCAtIFdlYmhvb2sgcGF5bG9hZCB3aXRoIGV2ZW50IGRhdGFcclxuICAgKiBAcmV0dXJucyBEZWxpdmVyeSByZXN1bHQgd2l0aCBzdWNjZXNzIHN0YXR1cyBhbmQgdGltaW5nXHJcbiAgICovXHJcbiAgYXN5bmMgc2VuZFRvV2ViaG9vayhwYXlsb2FkOiBOOE5XZWJob29rUGF5bG9hZCk6IFByb21pc2U8TjhORGVsaXZlcnlSZXN1bHQ+IHtcclxuICAgIGNvbnN0IHdlYmhvb2tVcmwgPSBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkw7XHJcbiAgICBcclxuICAgIGlmICghd2ViaG9va1VybCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogJ044Tl9XRUJIT09LX1VSTCBub3QgY29uZmlndXJlZCcsXHJcbiAgICAgICAgZHVyYXRpb246IDAsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIG1ldGFkYXRhXHJcbiAgICBjb25zdCBlbnJpY2hlZFBheWxvYWQ6IE44TldlYmhvb2tQYXlsb2FkID0ge1xyXG4gICAgICAuLi5wYXlsb2FkLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIHNvdXJjZTogJ2FpYnRzJyxcclxuICAgICAgICB2ZXJzaW9uOiB0aGlzLlZFUlNJT04sXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ3JlYXRlIGFib3J0IGNvbnRyb2xsZXIgZm9yIHRpbWVvdXRcclxuICAgICAgY29uc3QgY29udHJvbGxlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKTtcclxuICAgICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHRoaXMuV0VCSE9PS19USU1FT1VUX01TKTtcclxuXHJcbiAgICAgIC8vIFByZXBhcmUgcmVxdWVzdCBoZWFkZXJzXHJcbiAgICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIEFkZCBhdXRoZW50aWNhdGlvbiBoZWFkZXJzIGlmIGNvbmZpZ3VyZWRcclxuICAgICAgY29uc3QgYXV0aEhlYWRlcnMgPSB0aGlzLmdldEF1dGhlbnRpY2F0aW9uSGVhZGVycygpO1xyXG4gICAgICBPYmplY3QuYXNzaWduKGhlYWRlcnMsIGF1dGhIZWFkZXJzKTtcclxuXHJcbiAgICAgIC8vIFNlbmQgd2ViaG9vayByZXF1ZXN0XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2god2ViaG9va1VybCwge1xyXG4gICAgICAgIG1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGhlYWRlcnMsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZW5yaWNoZWRQYXlsb2FkKSxcclxuICAgICAgICBzaWduYWw6IGNvbnRyb2xsZXIuc2lnbmFsLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xyXG5cclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBhd2FpdCByZXNwb25zZS50ZXh0KCk7XHJcblxyXG4gICAgICBpZiAocmVzcG9uc2Uub2spIHtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZSxcclxuICAgICAgICAgIHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgICAgIHJlc3BvbnNlQm9keSxcclxuICAgICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgc3RhdHVzQ29kZTogcmVzcG9uc2Uuc3RhdHVzLFxyXG4gICAgICAgIHJlc3BvbnNlQm9keSxcclxuICAgICAgICBlcnJvck1lc3NhZ2U6IGBXZWJob29rIHJldHVybmVkIHN0YXR1cyAke3Jlc3BvbnNlLnN0YXR1c31gLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG5cclxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgICAvLyBDaGVjayBpZiBlcnJvciBpcyBkdWUgdG8gdGltZW91dFxyXG4gICAgICAgIGlmIChlcnJvci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHtcclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgICAgICBlcnJvck1lc3NhZ2U6IGBXZWJob29rIHJlcXVlc3QgdGltZWQgb3V0IGFmdGVyICR7dGhpcy5XRUJIT09LX1RJTUVPVVRfTVN9bXNgLFxyXG4gICAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgICBlcnJvck1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIGVycm9yTWVzc2FnZTogJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQnLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgbjhuIGludGVncmF0aW9uIGlzIGVuYWJsZWRcclxuICAgKiBcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIG44biBpcyBlbmFibGVkIGFuZCBjb25maWd1cmVkXHJcbiAgICovXHJcbiAgYXN5bmMgaXNFbmFibGVkKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3QgZW5hYmxlZCA9IHByb2Nlc3MuZW52Lk44Tl9FTkFCTEVEID09PSAndHJ1ZSc7XHJcbiAgICBjb25zdCB3ZWJob29rVXJsID0gcHJvY2Vzcy5lbnYuTjhOX1dFQkhPT0tfVVJMO1xyXG5cclxuICAgIHJldHVybiBlbmFibGVkICYmICEhd2ViaG9va1VybDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIG44biBjb25maWd1cmF0aW9uXHJcbiAgICogXHJcbiAgICogQHJldHVybnMgVHJ1ZSBpZiBjb25maWd1cmF0aW9uIGlzIHZhbGlkXHJcbiAgICovXHJcbiAgYXN5bmMgdmFsaWRhdGVDb25maWd1cmF0aW9uKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgY29uc3Qgd2ViaG9va1VybCA9IHByb2Nlc3MuZW52Lk44Tl9XRUJIT09LX1VSTDtcclxuXHJcbiAgICBpZiAoIXdlYmhvb2tVcmwpIHtcclxuICAgICAgY29uc29sZS53YXJuKCdOOE5fV0VCSE9PS19VUkwgbm90IGNvbmZpZ3VyZWQnKTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIFVSTCBmb3JtYXRcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHVybCA9IG5ldyBVUkwod2ViaG9va1VybCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBFbnN1cmUgSFRUUFMgZm9yIHNlY3VyaXR5XHJcbiAgICAgIGlmICh1cmwucHJvdG9jb2wgIT09ICdodHRwczonICYmIHVybC5wcm90b2NvbCAhPT0gJ2h0dHA6Jykge1xyXG4gICAgICAgIGNvbnNvbGUud2FybignTjhOX1dFQkhPT0tfVVJMIG11c3QgdXNlIEhUVFAgb3IgSFRUUFMgcHJvdG9jb2wnKTtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignSW52YWxpZCBOOE5fV0VCSE9PS19VUkwgZm9ybWF0JywgeyBlcnJvciB9KTtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGF1dGhlbnRpY2F0aW9uIGhlYWRlcnMgYmFzZWQgb24gY29uZmlndXJhdGlvblxyXG4gICAqIFxyXG4gICAqIEByZXR1cm5zIEF1dGhlbnRpY2F0aW9uIGhlYWRlcnMgb2JqZWN0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRBdXRoZW50aWNhdGlvbkhlYWRlcnMoKTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiB7XHJcbiAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge307XHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIEFQSSBrZXkgYXV0aGVudGljYXRpb25cclxuICAgIGNvbnN0IGFwaUtleSA9IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZO1xyXG4gICAgaWYgKGFwaUtleSkge1xyXG4gICAgICBoZWFkZXJzWydYLUFQSS1LZXknXSA9IGFwaUtleTtcclxuICAgICAgcmV0dXJuIGhlYWRlcnM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZm9yIGJlYXJlciB0b2tlbiBhdXRoZW50aWNhdGlvblxyXG4gICAgY29uc3QgYmVhcmVyVG9rZW4gPSBwcm9jZXNzLmVudi5OOE5fQkVBUkVSX1RPS0VOO1xyXG4gICAgaWYgKGJlYXJlclRva2VuKSB7XHJcbiAgICAgIGhlYWRlcnNbJ0F1dGhvcml6YXRpb24nXSA9IGBCZWFyZXIgJHtiZWFyZXJUb2tlbn1gO1xyXG4gICAgICByZXR1cm4gaGVhZGVycztcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gaGVhZGVycztcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IG44bkludGVncmF0aW9uU2VydmljZSA9IG5ldyBOOE5JbnRlZ3JhdGlvblNlcnZpY2UoKTtcclxuIl19