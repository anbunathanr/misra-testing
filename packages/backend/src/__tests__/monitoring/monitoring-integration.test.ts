import { CentralizedLogger } from '../../utils/centralized-logger';
import { monitoringService } from '../../services/monitoring-service';

describe('Monitoring Integration Tests', () => {
  let logger: CentralizedLogger;

  beforeEach(() => {
    logger = new CentralizedLogger({
      correlationId: 'test-correlation-id',
      userId: 'test-user-id',
      functionName: 'test-function',
      environment: 'test',
    });
  });

  describe('CentralizedLogger', () => {
    it('should create logger with correlation ID', () => {
      expect(logger.getCorrelationId()).toBe('test-correlation-id');
    });

    it('should log structured messages', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.info('Test message', { key: 'value' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"INFO"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test message"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"correlationId":"test-correlation-id"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log business metrics', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.logBusinessMetric('test_metric', 100, 'Count', { source: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"metricType":"business"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"metricName":"test_metric"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log performance metrics', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.logPerformanceMetric('test_operation', 1500, { success: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"metricType":"performance"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"test_operation"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"duration":1500')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log security events', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      logger.logSecurityEvent('unauthorized_access', 'HIGH', { ip: '192.168.1.1' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"security"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"event":"unauthorized_access"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"severity":"HIGH"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log user journey events', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.logUserJourney('file_upload', 'completed', { fileSize: 1024 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"userJourney"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"step":"file_upload"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"status":"completed"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should log analysis events', () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      
      logger.logAnalysisEvent('analysis_started', 'file-123', 'analysis-456', { language: 'C' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"eventType":"analysis"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"fileId":"file-123"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"analysisId":"analysis-456"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should create new logger with updated context', () => {
      const newLogger = logger.withContext({ userId: 'new-user-id' });
      
      expect(newLogger.getCorrelationId()).toBe('test-correlation-id');
      expect(newLogger).not.toBe(logger); // Should be a new instance
    });
  });

  describe('MonitoringService', () => {
    it('should be available as singleton', () => {
      expect(monitoringService).toBeDefined();
      expect(typeof monitoringService.publishMetric).toBe('function');
      expect(typeof monitoringService.recordBusinessMetric).toBe('function');
      expect(typeof monitoringService.recordPerformanceMetric).toBe('function');
    });

    it('should handle metric publishing gracefully', async () => {
      // Mock CloudWatch to avoid actual AWS calls in tests
      const mockPutMetricData = jest.fn().mockResolvedValue({});
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      await expect(
        monitoringService.recordBusinessMetric('test_metric', 1)
      ).resolves.not.toThrow();
    });

    it('should handle performance metrics', async () => {
      const mockPutMetricData = jest.fn().mockResolvedValue({});
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      await expect(
        monitoringService.recordPerformanceMetric({
          operation: 'test_operation',
          duration: 1000,
          success: true,
        })
      ).resolves.not.toThrow();
    });

    it('should handle user journey metrics', async () => {
      const mockPutMetricData = jest.fn().mockResolvedValue({});
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      await expect(
        monitoringService.recordUserJourney('login', 'completed', 'user-123', 500)
      ).resolves.not.toThrow();
    });

    it('should handle analysis metrics', async () => {
      const mockPutMetricData = jest.fn().mockResolvedValue({});
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      await expect(
        monitoringService.recordAnalysisMetrics(
          'analysis-123',
          'file-456',
          85.5,
          3,
          2500,
          true
        )
      ).resolves.not.toThrow();
    });

    it('should handle authentication metrics', async () => {
      const mockPutMetricData = jest.fn().mockResolvedValue({});
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      await expect(
        monitoringService.recordAuthMetrics('login', true, 'user-123', 'jwt')
      ).resolves.not.toThrow();
    });

    it('should handle file operation metrics', async () => {
      const mockPutMetricData = jest.fn().mockResolvedValue({});
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      await expect(
        monitoringService.recordFileMetrics('upload', 'file-123', 1024, true, 1500)
      ).resolves.not.toThrow();
    });

    it('should handle security events', async () => {
      const mockPutMetricData = jest.fn().mockResolvedValue({});
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      await expect(
        monitoringService.recordSecurityEvent('failed_login', 'MEDIUM', 'user-123', { ip: '192.168.1.1' })
      ).resolves.not.toThrow();
    });
  });

  describe('Correlation ID Propagation', () => {
    it('should maintain correlation ID across logger instances', () => {
      const correlationId = 'test-correlation-123';
      const logger1 = new CentralizedLogger({ correlationId });
      const logger2 = logger1.withContext({ userId: 'user-456' });
      
      expect(logger1.getCorrelationId()).toBe(correlationId);
      expect(logger2.getCorrelationId()).toBe(correlationId);
    });

    it('should generate unique correlation IDs when not provided', () => {
      const logger1 = new CentralizedLogger();
      const logger2 = new CentralizedLogger();
      
      expect(logger1.getCorrelationId()).toBeDefined();
      expect(logger2.getCorrelationId()).toBeDefined();
      expect(logger1.getCorrelationId()).not.toBe(logger2.getCorrelationId());
    });
  });

  describe('Error Handling', () => {
    it('should handle logging errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logger.error('Test error', new Error('Test error message'), { context: 'test' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"ERROR"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test error"')
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle CloudWatch errors gracefully', async () => {
      const mockPutMetricData = jest.fn().mockRejectedValue(new Error('CloudWatch error'));
      (monitoringService as any).cloudWatch = {
        putMetricData: () => ({ promise: mockPutMetricData })
      };

      // Should not throw even if CloudWatch fails
      await expect(
        monitoringService.recordBusinessMetric('test_metric', 1)
      ).resolves.not.toThrow();
    });
  });
});