/**
 * Unit tests for Analysis Monitor Service
 * Task 5.2: Create real-time analysis monitoring
 */

import { AnalysisMonitor, AnalysisProgress } from '../analysis-monitor';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('AnalysisMonitor', () => {
  let monitor: AnalysisMonitor;

  beforeEach(() => {
    monitor = new AnalysisMonitor();
    ddbMock.reset();
    jest.clearAllMocks();
  });

  describe('getAnalysisProgress', () => {
    it('should retrieve analysis progress from DynamoDB', async () => {
      const mockAnalysisData = {
        analysisId: 'test-analysis-123',
        status: 'PROCESSING',
        progress: 50,
        currentStep: 'Evaluating MISRA rules',
        startTime: Date.now() - 60000, // Started 1 minute ago
        totalRules: 50,
        estimatedDuration: 120000
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockAnalysisData
      });

      const progress = await monitor.getAnalysisProgress('test-analysis-123');

      expect(progress).toBeDefined();
      expect(progress?.analysisId).toBe('test-analysis-123');
      expect(progress?.status).toBe('running');
      expect(progress?.progress).toBe(50);
      expect(progress?.rulesProcessed).toBe(25); // 50% of 50 rules
      expect(progress?.totalRules).toBe(50);
      expect(progress?.estimatedTimeRemaining).toBeGreaterThan(0);
    });

    it('should return null for non-existent analysis', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: undefined
      });

      const progress = await monitor.getAnalysisProgress('non-existent');

      expect(progress).toBeNull();
    });

    it('should calculate rules processed based on progress', async () => {
      const mockAnalysisData = {
        analysisId: 'test-analysis-123',
        status: 'PROCESSING',
        progress: 75,
        currentStep: 'Evaluating MISRA rules',
        startTime: Date.now(),
        totalRules: 40
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockAnalysisData
      });

      const progress = await monitor.getAnalysisProgress('test-analysis-123');

      expect(progress?.rulesProcessed).toBe(30); // 75% of 40 rules
      expect(progress?.totalRules).toBe(40);
    });

    it('should handle completed analysis', async () => {
      const mockAnalysisData = {
        analysisId: 'test-analysis-123',
        status: 'COMPLETED',
        progress: 100,
        currentStep: 'Analysis complete',
        startTime: Date.now() - 120000,
        totalRules: 50
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockAnalysisData
      });

      const progress = await monitor.getAnalysisProgress('test-analysis-123');

      expect(progress?.status).toBe('completed');
      expect(progress?.progress).toBe(100);
      expect(progress?.estimatedTimeRemaining).toBe(0);
      expect(progress?.rulesProcessed).toBe(50);
    });

    it('should handle failed analysis', async () => {
      const mockAnalysisData = {
        analysisId: 'test-analysis-123',
        status: 'FAILED',
        progress: 30,
        currentStep: 'Analysis failed',
        startTime: Date.now()
      };

      ddbMock.on(GetCommand).resolves({
        Item: mockAnalysisData
      });

      const progress = await monitor.getAnalysisProgress('test-analysis-123');

      expect(progress?.status).toBe('failed');
    });
  });

  describe('updateAnalysisProgress', () => {
    it('should update analysis progress in DynamoDB', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await monitor.updateAnalysisProgress(
        'test-analysis-123',
        50,
        'Evaluating MISRA rules',
        'running'
      );

      expect(ddbMock.commandCalls(UpdateCommand).length).toBe(1);
      const call = ddbMock.commandCalls(UpdateCommand)[0];
      expect(call.args[0].input.Key).toEqual({ analysisId: 'test-analysis-123' });
      expect(call.args[0].input.ExpressionAttributeValues).toMatchObject({
        ':progress': 50,
        ':currentStep': 'Evaluating MISRA rules',
        ':status': 'running'
      });
    });

    it('should update progress without status change', async () => {
      ddbMock.on(UpdateCommand).resolves({});

      await monitor.updateAnalysisProgress(
        'test-analysis-123',
        75,
        'Processing violations'
      );

      expect(ddbMock.commandCalls(UpdateCommand).length).toBe(1);
      const call = ddbMock.commandCalls(UpdateCommand)[0];
      expect(call.args[0].input.ExpressionAttributeValues).toMatchObject({
        ':progress': 75,
        ':currentStep': 'Processing violations'
      });
      expect(call.args[0].input.ExpressionAttributeValues).not.toHaveProperty(':status');
    });
  });

  describe('pollAnalysisStatus', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should poll until analysis completes', async () => {
      let callCount = 0;
      const progressUpdates: AnalysisProgress[] = [];

      ddbMock.on(GetCommand).callsFake(() => {
        callCount++;
        const progress = Math.min(callCount * 25, 100);
        const status = progress === 100 ? 'COMPLETED' : 'PROCESSING';
        
        return Promise.resolve({
          Item: {
            analysisId: 'test-analysis-123',
            status,
            progress,
            currentStep: `Step ${callCount}`,
            startTime: Date.now() - 10000,
            totalRules: 50
          }
        });
      });

      const pollPromise = monitor.pollAnalysisStatus(
        'test-analysis-123',
        (progress) => progressUpdates.push(progress),
        { pollInterval: 100, timeout: 10000 }
      );

      // Advance timers to trigger polling
      for (let i = 0; i < 5; i++) {
        await jest.advanceTimersByTimeAsync(100);
      }

      const result = await pollPromise;

      expect(result.status).toBe('completed');
      expect(result.progress).toBe(100);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed');
    });

    it('should reject on analysis failure', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          analysisId: 'test-analysis-123',
          status: 'FAILED',
          progress: 30,
          currentStep: 'Analysis failed',
          startTime: Date.now()
        }
      });

      const pollPromise = monitor.pollAnalysisStatus(
        'test-analysis-123',
        () => {},
        { pollInterval: 100, timeout: 10000 }
      );

      await jest.advanceTimersByTimeAsync(100);

      await expect(pollPromise).rejects.toThrow('Analysis failed');
    });

    it('should reject on timeout', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          analysisId: 'test-analysis-123',
          status: 'PROCESSING',
          progress: 50,
          currentStep: 'Still processing',
          startTime: Date.now()
        }
      });

      const pollPromise = monitor.pollAnalysisStatus(
        'test-analysis-123',
        () => {},
        { pollInterval: 100, timeout: 500 }
      );

      await jest.advanceTimersByTimeAsync(600);

      await expect(pollPromise).rejects.toThrow('Analysis timeout');
    });

    it('should reject when analysis not found', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: undefined
      });

      const pollPromise = monitor.pollAnalysisStatus(
        'non-existent',
        () => {},
        { pollInterval: 100, timeout: 10000 }
      );

      await jest.advanceTimersByTimeAsync(100);

      await expect(pollPromise).rejects.toThrow('Analysis not found');
    });
  });

  describe('startMonitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start monitoring and return completed analysis', async () => {
      const progressUpdates: AnalysisProgress[] = [];

      ddbMock.on(GetCommand).resolves({
        Item: {
          analysisId: 'test-analysis-123',
          status: 'COMPLETED',
          progress: 100,
          currentStep: 'Complete',
          startTime: Date.now() - 120000,
          totalRules: 50
        }
      });

      const monitorPromise = monitor.startMonitoring(
        'test-analysis-123',
        (progress) => progressUpdates.push(progress),
        { pollInterval: 100 }
      );

      await jest.advanceTimersByTimeAsync(100);

      const result = await monitorPromise;

      expect(result.status).toBe('completed');
      expect(progressUpdates.length).toBeGreaterThan(0);
    });

    it('should handle monitoring errors', async () => {
      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

      const monitorPromise = monitor.startMonitoring(
        'test-analysis-123',
        () => {},
        { pollInterval: 100 }
      );

      await jest.advanceTimersByTimeAsync(100);

      await expect(monitorPromise).rejects.toThrow('DynamoDB error');
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring without errors', () => {
      expect(() => {
        monitor.stopMonitoring('test-analysis-123');
      }).not.toThrow();
    });
  });

  describe('estimated time remaining calculation', () => {
    it('should calculate accurate time remaining at 50% progress', async () => {
      const startTime = Date.now() - 60000; // Started 1 minute ago
      
      ddbMock.on(GetCommand).resolves({
        Item: {
          analysisId: 'test-analysis-123',
          status: 'PROCESSING',
          progress: 50,
          currentStep: 'Halfway through',
          startTime,
          totalRules: 50,
          estimatedDuration: 120000
        }
      });

      const progress = await monitor.getAnalysisProgress('test-analysis-123');

      // At 50% progress after 60 seconds, should estimate ~60 seconds remaining
      expect(progress?.estimatedTimeRemaining).toBeGreaterThan(50);
      expect(progress?.estimatedTimeRemaining).toBeLessThan(70);
    });

    it('should return minimum 5 seconds for near-complete analysis', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          analysisId: 'test-analysis-123',
          status: 'PROCESSING',
          progress: 99,
          currentStep: 'Almost done',
          startTime: Date.now() - 120000,
          totalRules: 50
        }
      });

      const progress = await monitor.getAnalysisProgress('test-analysis-123');

      expect(progress?.estimatedTimeRemaining).toBeGreaterThanOrEqual(5);
    });

    it('should return 0 for completed analysis', async () => {
      ddbMock.on(GetCommand).resolves({
        Item: {
          analysisId: 'test-analysis-123',
          status: 'COMPLETED',
          progress: 100,
          currentStep: 'Complete',
          startTime: Date.now() - 120000,
          totalRules: 50
        }
      });

      const progress = await monitor.getAnalysisProgress('test-analysis-123');

      expect(progress?.estimatedTimeRemaining).toBe(0);
    });
  });
});
