/**
 * Unit tests for Retry Handler Service
 */

import { RetryHandlerService } from '../retry-handler-service';

describe('RetryHandlerService', () => {
  let service: RetryHandlerService;

  beforeEach(() => {
    service = new RetryHandlerService();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const config = {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2,
      };

      const result = await service.executeWithRetry(operation, config);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attemptCount).toBe(1);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient failures', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Transient error 1'))
        .mockRejectedValueOnce(new Error('Transient error 2'))
        .mockResolvedValue('success');

      const config = {
        maxRetries: 3,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      };

      const result = await service.executeWithRetry(operation, config);

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attemptCount).toBe(3);
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should fail after exhausting retries', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Permanent error'));
      const config = {
        maxRetries: 2,
        initialDelayMs: 10,
        maxDelayMs: 100,
        backoffMultiplier: 2,
      };

      const result = await service.executeWithRetry(operation, config);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Permanent error');
      expect(result.attemptCount).toBe(3); // Initial + 2 retries
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const config = {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 16000,
        backoffMultiplier: 2,
      };

      expect(service.calculateBackoffDelay(0, config)).toBe(1000);  // 1000 * 2^0
      expect(service.calculateBackoffDelay(1, config)).toBe(2000);  // 1000 * 2^1
      expect(service.calculateBackoffDelay(2, config)).toBe(4000);  // 1000 * 2^2
      expect(service.calculateBackoffDelay(3, config)).toBe(8000);  // 1000 * 2^3
      expect(service.calculateBackoffDelay(4, config)).toBe(16000); // 1000 * 2^4, capped at maxDelay
    });

    it('should respect maxDelay cap', () => {
      const config = {
        maxRetries: 5,
        initialDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      };

      expect(service.calculateBackoffDelay(5, config)).toBe(5000); // Would be 32000, but capped at 5000
    });
  });
});
