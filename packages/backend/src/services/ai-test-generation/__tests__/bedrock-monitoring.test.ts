/**
 * Unit tests for Bedrock Monitoring Service
 * 
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**
 */

import { BedrockMonitoring, getBedrockMonitoring } from '../bedrock-monitoring';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

// Mock CloudWatch client
jest.mock('@aws-sdk/client-cloudwatch');

describe('BedrockMonitoring', () => {
  let monitoring: BedrockMonitoring;
  let mockCloudWatchSend: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Enable monitoring for tests
    process.env.ENABLE_BEDROCK_MONITORING = 'true';
    
    // Mock CloudWatch client send method
    mockCloudWatchSend = jest.fn().mockResolvedValue({});
    (CloudWatchClient as jest.Mock).mockImplementation(() => ({
      send: mockCloudWatchSend,
    }));
    
    monitoring = new BedrockMonitoring('us-east-1');
  });

  afterEach(() => {
    delete process.env.ENABLE_BEDROCK_MONITORING;
  });

  describe('emitMetrics', () => {
    it('should emit CloudWatch metrics for successful operation', async () => {
      await monitoring.emitMetrics({
        operation: 'generate',
        latency: 1500,
        tokens: 1000,
        cost: 0.05,
        success: true,
      });

      // Verify CloudWatch send was called
      expect(mockCloudWatchSend).toHaveBeenCalledTimes(1);
      
      // Verify it was called with a PutMetricDataCommand
      const command = mockCloudWatchSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutMetricDataCommand);
    });

    it('should emit error metric for failed operation', async () => {
      await monitoring.emitMetrics({
        operation: 'analyze',
        latency: 500,
        tokens: 0,
        cost: 0,
        success: false,
        errorType: 'RateLimit',
      });

      // Verify CloudWatch send was called
      expect(mockCloudWatchSend).toHaveBeenCalledTimes(1);
      
      // Verify it was called with a PutMetricDataCommand
      const command = mockCloudWatchSend.mock.calls[0][0];
      expect(command).toBeInstanceOf(PutMetricDataCommand);
    });

    it('should not emit metrics when monitoring is disabled', async () => {
      process.env.ENABLE_BEDROCK_MONITORING = 'false';
      const disabledMonitoring = new BedrockMonitoring('us-east-1');

      await disabledMonitoring.emitMetrics({
        operation: 'generate',
        latency: 1500,
        tokens: 1000,
        cost: 0.05,
        success: true,
      });

      expect(mockCloudWatchSend).not.toHaveBeenCalled();
    });

    it('should handle CloudWatch errors gracefully', async () => {
      mockCloudWatchSend.mockRejectedValueOnce(new Error('CloudWatch error'));

      // Should not throw
      await expect(monitoring.emitMetrics({
        operation: 'generate',
        latency: 1500,
        tokens: 1000,
        cost: 0.05,
        success: true,
      })).resolves.not.toThrow();
    });
  });

  describe('logOperation', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log operation details', () => {
      monitoring.logOperation({
        timestamp: '2024-01-01T00:00:00Z',
        operation: 'generate',
        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        region: 'us-east-1',
        requestTokens: 500,
        responseTokens: 500,
        totalTokens: 1000,
        cost: 0.05,
        latency: 1500,
        status: 'success',
        circuitState: 'CLOSED',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BedrockOperation]',
        expect.stringContaining('"operation":"generate"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BedrockOperation]',
        expect.stringContaining('"status":"success"')
      );
    });

    it('should log error details for failed operations', () => {
      monitoring.logOperation({
        timestamp: '2024-01-01T00:00:00Z',
        operation: 'analyze',
        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        region: 'us-east-1',
        latency: 500,
        status: 'failure',
        error: 'AI_RATE_LIMIT: Bedrock rate limit exceeded',
        circuitState: 'OPEN',
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BedrockOperation]',
        expect.stringContaining('"status":"failure"')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[BedrockOperation]',
        expect.stringContaining('"error":"AI_RATE_LIMIT')
      );
    });

    it('should not log when monitoring is disabled', () => {
      process.env.ENABLE_BEDROCK_MONITORING = 'false';
      
      // Create new instance after setting env var
      const disabledMonitoring = new BedrockMonitoring('us-east-1');
      
      // Clear the spy after the constructor log
      consoleLogSpy.mockClear();

      disabledMonitoring.logOperation({
        timestamp: '2024-01-01T00:00:00Z',
        operation: 'generate',
        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        region: 'us-east-1',
        latency: 1500,
        status: 'success',
      });

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('startXRaySegment', () => {
    it('should return null when X-Ray SDK is not available', () => {
      const segment = monitoring.startXRaySegment('generate');
      expect(segment).toBeNull();
    });

    it('should return null when monitoring is disabled', () => {
      process.env.ENABLE_BEDROCK_MONITORING = 'false';
      const disabledMonitoring = new BedrockMonitoring('us-east-1');

      const segment = disabledMonitoring.startXRaySegment('generate');
      expect(segment).toBeNull();
    });

    // Note: Testing actual X-Ray functionality requires the X-Ray SDK to be installed
    // and properly configured, which is optional for this implementation
  });

  describe('getBedrockMonitoring', () => {
    it('should return singleton instance', () => {
      const instance1 = getBedrockMonitoring('us-east-1');
      const instance2 = getBedrockMonitoring('us-west-2');

      expect(instance1).toBe(instance2); // Same instance
    });
  });
});
