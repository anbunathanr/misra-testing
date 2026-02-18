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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibjhuLWludGVncmF0aW9uLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJuOG4taW50ZWdyYXRpb24tc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUlILE1BQWEscUJBQXFCO0lBQ2Ysa0JBQWtCLEdBQUcsS0FBSyxDQUFDLENBQUMsYUFBYTtJQUN6QyxPQUFPLEdBQUcsT0FBTyxDQUFDO0lBRW5DOzs7OztPQUtHO0lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUEwQjtRQUM1QyxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQztRQUUvQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxPQUFPLEVBQUUsS0FBSztnQkFDZCxZQUFZLEVBQUUsZ0NBQWdDO2dCQUM5QyxRQUFRLEVBQUUsQ0FBQzthQUNaLENBQUM7UUFDSixDQUFDO1FBRUQsZUFBZTtRQUNmLE1BQU0sZUFBZSxHQUFzQjtZQUN6QyxHQUFHLE9BQU87WUFDVixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2FBQ3RCO1NBQ0YsQ0FBQztRQUVGLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUU3QixJQUFJLENBQUM7WUFDSCxzQ0FBc0M7WUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBRWhGLDBCQUEwQjtZQUMxQixNQUFNLE9BQU8sR0FBMkI7Z0JBQ3RDLGNBQWMsRUFBRSxrQkFBa0I7YUFDbkMsQ0FBQztZQUVGLDJDQUEyQztZQUMzQyxNQUFNLFdBQVcsR0FBRyxJQUFJ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QUFDLGlEQUFpRCxDQUFDLENBQUM7Z0JBQ2hFLE9BQU8sS0FBSyxDQUFDO1lBQ2YsQ0FBQztZQUVELE9BQU8sSUFBSSxDQUFDO1FBQ2QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztZQUMzRCxPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLHdCQUF3QjtRQUM5QixNQUFNLE9BQU8sR0FBMkIsRUFBRSxDQUFDO1FBRTNDLG1DQUFtQztRQUNuQyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUN2QyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1gsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztZQUM5QixPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUM7UUFDakQsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNoQixPQUFPLENBQUMsZUFBZSxDQUFDLEdBQUcsVUFBVSxXQUFXLEVBQUUsQ0FBQztZQUNuRCxPQUFPLE9BQU8sQ0FBQztRQUNqQixDQUFDO1FBRUQsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztDQUNGO0FBektELHNEQXlLQztBQUVELDRCQUE0QjtBQUNmLFFBQUEscUJBQXFCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIG44biBJbnRlZ3JhdGlvbiBTZXJ2aWNlXHJcbiAqIFxyXG4gKiBIYW5kbGVzIG9wdGlvbmFsIGludGVncmF0aW9uIHdpdGggbjhuIHdvcmtmbG93IGF1dG9tYXRpb24gcGxhdGZvcm0uXHJcbiAqIFN1cHBvcnRzIHdlYmhvb2sgZGVsaXZlcnkgd2l0aCB0aW1lb3V0LCBhdXRoZW50aWNhdGlvbiwgYW5kIGNvbmZpZ3VyYXRpb24gdmFsaWRhdGlvbi5cclxuICovXHJcblxyXG5pbXBvcnQgeyBOOE5XZWJob29rUGF5bG9hZCwgTjhORGVsaXZlcnlSZXN1bHQgfSBmcm9tICcuLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIE44TkludGVncmF0aW9uU2VydmljZSB7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBXRUJIT09LX1RJTUVPVVRfTVMgPSAxMDAwMDsgLy8gMTAgc2Vjb25kc1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgVkVSU0lPTiA9ICcxLjAuMCc7XHJcblxyXG4gIC8qKlxyXG4gICAqIFNlbmQgbm90aWZpY2F0aW9uIGV2ZW50IHRvIG44biB3ZWJob29rXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHBheWxvYWQgLSBXZWJob29rIHBheWxvYWQgd2l0aCBldmVudCBkYXRhXHJcbiAgICogQHJldHVybnMgRGVsaXZlcnkgcmVzdWx0IHdpdGggc3VjY2VzcyBzdGF0dXMgYW5kIHRpbWluZ1xyXG4gICAqL1xyXG4gIGFzeW5jIHNlbmRUb1dlYmhvb2socGF5bG9hZDogTjhOV2ViaG9va1BheWxvYWQpOiBQcm9taXNlPE44TkRlbGl2ZXJ5UmVzdWx0PiB7XHJcbiAgICBjb25zdCB3ZWJob29rVXJsID0gcHJvY2Vzcy5lbnYuTjhOX1dFQkhPT0tfVVJMO1xyXG4gICAgXHJcbiAgICBpZiAoIXdlYmhvb2tVcmwpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBlcnJvck1lc3NhZ2U6ICdOOE5fV0VCSE9PS19VUkwgbm90IGNvbmZpZ3VyZWQnLFxyXG4gICAgICAgIGR1cmF0aW9uOiAwLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkZCBtZXRhZGF0YVxyXG4gICAgY29uc3QgZW5yaWNoZWRQYXlsb2FkOiBOOE5XZWJob29rUGF5bG9hZCA9IHtcclxuICAgICAgLi4ucGF5bG9hZCxcclxuICAgICAgbWV0YWRhdGE6IHtcclxuICAgICAgICBzb3VyY2U6ICdhaWJ0cycsXHJcbiAgICAgICAgdmVyc2lvbjogdGhpcy5WRVJTSU9OLFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIENyZWF0ZSBhYm9ydCBjb250cm9sbGVyIGZvciB0aW1lb3V0XHJcbiAgICAgIGNvbnN0IGNvbnRyb2xsZXIgPSBuZXcgQWJvcnRDb250cm9sbGVyKCk7XHJcbiAgICAgIGNvbnN0IHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4gY29udHJvbGxlci5hYm9ydCgpLCB0aGlzLldFQkhPT0tfVElNRU9VVF9NUyk7XHJcblxyXG4gICAgICAvLyBQcmVwYXJlIHJlcXVlc3QgaGVhZGVyc1xyXG4gICAgICBjb25zdCBoZWFkZXJzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBBZGQgYXV0aGVudGljYXRpb24gaGVhZGVycyBpZiBjb25maWd1cmVkXHJcbiAgICAgIGNvbnN0IGF1dGhIZWFkZXJzID0gdGhpcy5nZXRBdXRoZW50aWNhdGlvbkhlYWRlcnMoKTtcclxuICAgICAgT2JqZWN0LmFzc2lnbihoZWFkZXJzLCBhdXRoSGVhZGVycyk7XHJcblxyXG4gICAgICAvLyBTZW5kIHdlYmhvb2sgcmVxdWVzdFxyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKHdlYmhvb2tVcmwsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KGVucmljaGVkUGF5bG9hZCksXHJcbiAgICAgICAgc2lnbmFsOiBjb250cm9sbGVyLnNpZ25hbCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpO1xyXG5cclxuICAgICAgaWYgKHJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgICBzdGF0dXNDb2RlOiByZXNwb25zZS5zdGF0dXMsXHJcbiAgICAgICAgICByZXNwb25zZUJvZHksXHJcbiAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxyXG4gICAgICAgIHN0YXR1c0NvZGU6IHJlc3BvbnNlLnN0YXR1cyxcclxuICAgICAgICByZXNwb25zZUJvZHksXHJcbiAgICAgICAgZXJyb3JNZXNzYWdlOiBgV2ViaG9vayByZXR1cm5lZCBzdGF0dXMgJHtyZXNwb25zZS5zdGF0dXN9YCxcclxuICAgICAgICBkdXJhdGlvbixcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIGVycm9yIGlzIGR1ZSB0byB0aW1lb3V0IChoYW5kbGVzIGJvdGggRXJyb3IgYW5kIERPTUV4Y2VwdGlvbilcclxuICAgICAgaWYgKGVycm9yICYmIHR5cGVvZiBlcnJvciA9PT0gJ29iamVjdCcgJiYgJ25hbWUnIGluIGVycm9yICYmIGVycm9yLm5hbWUgPT09ICdBYm9ydEVycm9yJykge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIGVycm9yTWVzc2FnZTogYFdlYmhvb2sgcmVxdWVzdCB0aW1lZCBvdXQgYWZ0ZXIgJHt0aGlzLldFQkhPT0tfVElNRU9VVF9NU31tc2AsXHJcbiAgICAgICAgICBkdXJhdGlvbixcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoZXJyb3IgaW5zdGFuY2VvZiBFcnJvcikge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIGVycm9yTWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICAgIH07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3JNZXNzYWdlOiAnVW5rbm93biBlcnJvciBvY2N1cnJlZCcsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBuOG4gaW50ZWdyYXRpb24gaXMgZW5hYmxlZFxyXG4gICAqIFxyXG4gICAqIEByZXR1cm5zIFRydWUgaWYgbjhuIGlzIGVuYWJsZWQgYW5kIGNvbmZpZ3VyZWRcclxuICAgKi9cclxuICBhc3luYyBpc0VuYWJsZWQoKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCBlbmFibGVkID0gcHJvY2Vzcy5lbnYuTjhOX0VOQUJMRUQgPT09ICd0cnVlJztcclxuICAgIGNvbnN0IHdlYmhvb2tVcmwgPSBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkw7XHJcblxyXG4gICAgcmV0dXJuIGVuYWJsZWQgJiYgISF3ZWJob29rVXJsO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgbjhuIGNvbmZpZ3VyYXRpb25cclxuICAgKiBcclxuICAgKiBAcmV0dXJucyBUcnVlIGlmIGNvbmZpZ3VyYXRpb24gaXMgdmFsaWRcclxuICAgKi9cclxuICBhc3luYyB2YWxpZGF0ZUNvbmZpZ3VyYXRpb24oKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICBjb25zdCB3ZWJob29rVXJsID0gcHJvY2Vzcy5lbnYuTjhOX1dFQkhPT0tfVVJMO1xyXG5cclxuICAgIGlmICghd2ViaG9va1VybCkge1xyXG4gICAgICBjb25zb2xlLndhcm4oJ044Tl9XRUJIT09LX1VSTCBub3QgY29uZmlndXJlZCcpO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgVVJMIGZvcm1hdFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXJsID0gbmV3IFVSTCh3ZWJob29rVXJsKTtcclxuICAgICAgXHJcbiAgICAgIC8vIEVuc3VyZSBIVFRQUyBmb3Igc2VjdXJpdHlcclxuICAgICAgaWYgKHVybC5wcm90b2NvbCAhPT0gJ2h0dHBzOicgJiYgdXJsLnByb3RvY29sICE9PSAnaHR0cDonKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdOOE5fV0VCSE9PS19VUkwgbXVzdCB1c2UgSFRUUCBvciBIVFRQUyBwcm90b2NvbCcpO1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdJbnZhbGlkIE44Tl9XRUJIT09LX1VSTCBmb3JtYXQnLCB7IGVycm9yIH0pO1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgYXV0aGVudGljYXRpb24gaGVhZGVycyBiYXNlZCBvbiBjb25maWd1cmF0aW9uXHJcbiAgICogXHJcbiAgICogQHJldHVybnMgQXV0aGVudGljYXRpb24gaGVhZGVycyBvYmplY3RcclxuICAgKi9cclxuICBwcml2YXRlIGdldEF1dGhlbnRpY2F0aW9uSGVhZGVycygpOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+IHtcclxuICAgIGNvbnN0IGhlYWRlcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcclxuXHJcbiAgICAvLyBDaGVjayBmb3IgQVBJIGtleSBhdXRoZW50aWNhdGlvblxyXG4gICAgY29uc3QgYXBpS2V5ID0gcHJvY2Vzcy5lbnYuTjhOX0FQSV9LRVk7XHJcbiAgICBpZiAoYXBpS2V5KSB7XHJcbiAgICAgIGhlYWRlcnNbJ1gtQVBJLUtleSddID0gYXBpS2V5O1xyXG4gICAgICByZXR1cm4gaGVhZGVycztcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmb3IgYmVhcmVyIHRva2VuIGF1dGhlbnRpY2F0aW9uXHJcbiAgICBjb25zdCBiZWFyZXJUb2tlbiA9IHByb2Nlc3MuZW52Lk44Tl9CRUFSRVJfVE9LRU47XHJcbiAgICBpZiAoYmVhcmVyVG9rZW4pIHtcclxuICAgICAgaGVhZGVyc1snQXV0aG9yaXphdGlvbiddID0gYEJlYXJlciAke2JlYXJlclRva2VufWA7XHJcbiAgICAgIHJldHVybiBoZWFkZXJzO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBoZWFkZXJzO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgbjhuSW50ZWdyYXRpb25TZXJ2aWNlID0gbmV3IE44TkludGVncmF0aW9uU2VydmljZSgpO1xyXG4iXX0=