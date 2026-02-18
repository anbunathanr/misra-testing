/**
 * Unit tests for n8n Integration Service
 */

import { N8NIntegrationService } from '../n8n-integration-service';

// Mock fetch globally
global.fetch = jest.fn();

describe('N8NIntegrationService', () => {
  let service: N8NIntegrationService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    service = new N8NIntegrationService();
    jest.clearAllMocks();
    delete process.env.N8N_WEBHOOK_URL;
    delete process.env.N8N_ENABLED;
    delete process.env.N8N_API_KEY;
    delete process.env.N8N_BEARER_TOKEN;
  });

  describe('sendToWebhook', () => {
    it('should send webhook successfully', async () => {
      process.env.N8N_WEBHOOK_URL = 'https://example.com/webhook';
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'Success',
      } as Response);

      const payload = {
        eventType: 'test_completion',
        eventId: 'test-123',
        timestamp: '2024-01-01T00:00:00Z',
        data: { test: 'data' },
        metadata: { source: 'aibts' as const, version: '1.0.0' },
      };

      const result = await service.sendToWebhook(payload);

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.responseBody).toBe('Success');
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should fail when webhook URL is not configured', async () => {
      const payload = {
        eventType: 'test_completion',
        eventId: 'test-123',
        timestamp: '2024-01-01T00:00:00Z',
        data: { test: 'data' },
        metadata: { source: 'aibts' as const, version: '1.0.0' },
      };

      const result = await service.sendToWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('N8N_WEBHOOK_URL not configured');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle webhook timeout', async () => {
      process.env.N8N_WEBHOOK_URL = 'https://example.com/webhook';
      
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => {
          setTimeout(() => reject(new DOMException('Aborted', 'AbortError')), 100);
        })
      );

      const payload = {
        eventType: 'test_completion',
        eventId: 'test-123',
        timestamp: '2024-01-01T00:00:00Z',
        data: { test: 'data' },
        metadata: { source: 'aibts' as const, version: '1.0.0' },
      };

      const result = await service.sendToWebhook(payload);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('timed out');
    });

    it('should include API key in headers when configured', async () => {
      process.env.N8N_WEBHOOK_URL = 'https://example.com/webhook';
      process.env.N8N_API_KEY = 'test-api-key';
      
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => 'Success',
      } as Response);

      const payload = {
        eventType: 'test_completion',
        eventId: 'test-123',
        timestamp: '2024-01-01T00:00:00Z',
        data: { test: 'data' },
        metadata: { source: 'aibts' as const, version: '1.0.0' },
      };

      await service.sendToWebhook(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/webhook',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled and configured', async () => {
      process.env.N8N_ENABLED = 'true';
      process.env.N8N_WEBHOOK_URL = 'https://example.com/webhook';

      const result = await service.isEnabled();

      expect(result).toBe(true);
    });

    it('should return false when not enabled', async () => {
      process.env.N8N_ENABLED = 'false';
      process.env.N8N_WEBHOOK_URL = 'https://example.com/webhook';

      const result = await service.isEnabled();

      expect(result).toBe(false);
    });

    it('should return false when webhook URL not configured', async () => {
      process.env.N8N_ENABLED = 'true';

      const result = await service.isEnabled();

      expect(result).toBe(false);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate correct HTTPS URL', async () => {
      process.env.N8N_WEBHOOK_URL = 'https://example.com/webhook';

      const result = await service.validateConfiguration();

      expect(result).toBe(true);
    });

    it('should validate correct HTTP URL', async () => {
      process.env.N8N_WEBHOOK_URL = 'http://localhost:5678/webhook';

      const result = await service.validateConfiguration();

      expect(result).toBe(true);
    });

    it('should reject invalid URL', async () => {
      process.env.N8N_WEBHOOK_URL = 'not-a-valid-url';

      const result = await service.validateConfiguration();

      expect(result).toBe(false);
    });

    it('should reject missing URL', async () => {
      const result = await service.validateConfiguration();

      expect(result).toBe(false);
    });
  });
});
