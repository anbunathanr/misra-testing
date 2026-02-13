/**
 * Unit tests for Test Executor Lambda function
 * Tests timeout handling and error scenarios
 */

import '@jest/globals';
import { SQSEvent, Context } from 'aws-lambda';
import { handler } from '../executor';
import { testExecutionDBService } from '../../../services/test-execution-db-service';
import { testExecutorService } from '../../../services/test-executor-service';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

// Mock the services
jest.mock('../../../services/test-execution-db-service');
jest.mock('../../../services/test-executor-service');

describe('Test Executor Lambda', () => {
  let mockContext: Context;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Lambda context
    mockContext = {
      getRemainingTimeInMillis: jest.fn().mockReturnValue(900000) as any, // 15 minutes
      functionName: 'test-executor',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-executor',
      memoryLimitInMB: '2048',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-executor',
      logStreamName: '2024/01/01/[$LATEST]test',
      callbackWaitsForEmptyEventLoop: true,
      done: jest.fn() as any,
      fail: jest.fn() as any,
      succeed: jest.fn() as any,
    } as unknown as Context;
  });

  describe('Timeout Handling', () => {
    test('should handle insufficient time remaining', async () => {
      // Mock context with very little time remaining
      mockContext.getRemainingTimeInMillis = jest.fn().mockReturnValue(60000) as any; // Only 1 minute

      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              executionId: 'exec-123',
              testCaseId: 'test-case-123',
              projectId: 'project-123',
              testCase: {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                description: 'Test',
                steps: [],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              metadata: {
                triggeredBy: 'user-123',
              },
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock updateExecutionStatus
      (testExecutionDBService.updateExecutionStatus as any).mockResolvedValue(undefined);

      // Mock getExecution to return an execution
      (testExecutionDBService.getExecution as any).mockResolvedValue({
        executionId: 'exec-123',
        projectId: 'project-123',
        status: 'running',
        startTime: '2024-01-01T00:00:00.000Z',
        steps: [],
        screenshots: [],
        metadata: {
          triggeredBy: 'user-123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // Mock updateExecutionResults
      (testExecutionDBService.updateExecutionResults as any).mockResolvedValue(undefined);

      // Should throw due to insufficient time
      await expect(handler(event, mockContext)).rejects.toThrow('Insufficient time remaining');

      // Verify execution was marked as error
      expect(testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-123',
          status: 'error',
          result: 'error',
          errorMessage: expect.stringContaining('Lambda timeout'),
        })
      );
    });

    test('should record timeout error when execution times out', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              executionId: 'exec-123',
              testCaseId: 'test-case-123',
              projectId: 'project-123',
              testCase: {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                description: 'Test',
                steps: [],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              metadata: {
                triggeredBy: 'user-123',
              },
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock updateExecutionStatus
      (testExecutionDBService.updateExecutionStatus as any).mockResolvedValue(undefined);

      // Mock executeTestCase to throw timeout error
      (testExecutorService.executeTestCase as any).mockRejectedValue(
        new Error('Execution timed out after 15 minutes')
      );

      // Mock getExecution to return an execution
      (testExecutionDBService.getExecution as any).mockResolvedValue({
        executionId: 'exec-123',
        projectId: 'project-123',
        status: 'running',
        startTime: '2024-01-01T00:00:00.000Z',
        steps: [],
        screenshots: [],
        metadata: {
          triggeredBy: 'user-123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // Mock updateExecutionResults
      (testExecutionDBService.updateExecutionResults as any).mockResolvedValue(undefined);

      // Should throw the timeout error
      await expect(handler(event, mockContext)).rejects.toThrow('Execution timed out');

      // Verify execution was marked as error with timeout message
      expect(testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-123',
          status: 'error',
          result: 'error',
          errorMessage: expect.stringContaining('timeout'),
        })
      );
    });

    test('should detect timeout from remaining time', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              executionId: 'exec-123',
              testCaseId: 'test-case-123',
              projectId: 'project-123',
              testCase: {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                description: 'Test',
                steps: [],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              metadata: {
                triggeredBy: 'user-123',
              },
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock context with very little time remaining (simulating near-timeout)
      mockContext.getRemainingTimeInMillis = jest.fn().mockReturnValue(3000) as any; // Only 3 seconds

      // Mock updateExecutionStatus
      (testExecutionDBService.updateExecutionStatus as any).mockResolvedValue(undefined);

      // Mock executeTestCase to throw generic error
      (testExecutorService.executeTestCase as any).mockRejectedValue(
        new Error('Some error occurred')
      );

      // Mock getExecution to return an execution
      (testExecutionDBService.getExecution as any).mockResolvedValue({
        executionId: 'exec-123',
        projectId: 'project-123',
        status: 'running',
        startTime: '2024-01-01T00:00:00.000Z',
        steps: [],
        screenshots: [],
        metadata: {
          triggeredBy: 'user-123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // Mock updateExecutionResults
      (testExecutionDBService.updateExecutionResults as any).mockResolvedValue(undefined);

      // Should throw the error
      await expect(handler(event, mockContext)).rejects.toThrow();

      // Verify execution was marked as error with timeout detection
      expect(testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-123',
          status: 'error',
          result: 'error',
          errorMessage: expect.stringContaining('Lambda timeout'),
        })
      );
    });
  });

  describe('Error Handling', () => {
    test('should handle execution errors gracefully', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              executionId: 'exec-123',
              testCaseId: 'test-case-123',
              projectId: 'project-123',
              testCase: {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                description: 'Test',
                steps: [],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              metadata: {
                triggeredBy: 'user-123',
              },
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock updateExecutionStatus
      (testExecutionDBService.updateExecutionStatus as any).mockResolvedValue(undefined);

      // Mock executeTestCase to throw error
      (testExecutorService.executeTestCase as any).mockRejectedValue(
        new Error('Browser initialization failed')
      );

      // Mock getExecution to return an execution
      (testExecutionDBService.getExecution as any).mockResolvedValue({
        executionId: 'exec-123',
        projectId: 'project-123',
        status: 'running',
        startTime: '2024-01-01T00:00:00.000Z',
        steps: [],
        screenshots: [],
        metadata: {
          triggeredBy: 'user-123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // Mock updateExecutionResults
      (testExecutionDBService.updateExecutionResults as any).mockResolvedValue(undefined);

      // Should throw the error
      await expect(handler(event, mockContext)).rejects.toThrow('Browser initialization failed');

      // Verify execution was marked as error
      expect(testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-123',
          status: 'error',
          result: 'error',
          errorMessage: 'Browser initialization failed',
        })
      );
    });

    test('should handle invalid SQS message format', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: 'invalid json',
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Should throw parsing error
      await expect(handler(event, mockContext)).rejects.toThrow('Invalid SQS message format');
    });

    test('should continue processing even if error update fails', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              executionId: 'exec-123',
              testCaseId: 'test-case-123',
              projectId: 'project-123',
              testCase: {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                description: 'Test',
                steps: [],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              metadata: {
                triggeredBy: 'user-123',
              },
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock updateExecutionStatus
      (testExecutionDBService.updateExecutionStatus as any).mockResolvedValue(undefined);

      // Mock executeTestCase to throw error
      (testExecutorService.executeTestCase as any).mockRejectedValue(
        new Error('Test execution failed')
      );

      // Mock getExecution to return an execution
      (testExecutionDBService.getExecution as any).mockResolvedValue({
        executionId: 'exec-123',
        projectId: 'project-123',
        status: 'running',
        startTime: '2024-01-01T00:00:00.000Z',
        steps: [],
        screenshots: [],
        metadata: {
          triggeredBy: 'user-123',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      });

      // Mock updateExecutionResults to fail
      (testExecutionDBService.updateExecutionResults as any).mockRejectedValue(
        new Error('DynamoDB update failed')
      );

      // Should still throw the original error
      await expect(handler(event, mockContext)).rejects.toThrow('Test execution failed');

      // Verify we attempted to update
      expect(testExecutionDBService.updateExecutionResults).toHaveBeenCalled();
    });
  });

  describe('Successful Execution', () => {
    test('should process successful execution', async () => {
      const event: SQSEvent = {
        Records: [
          {
            messageId: 'test-message-id',
            receiptHandle: 'test-receipt-handle',
            body: JSON.stringify({
              executionId: 'exec-123',
              testCaseId: 'test-case-123',
              projectId: 'project-123',
              testCase: {
                testCaseId: 'test-case-123',
                projectId: 'project-123',
                name: 'Test Case',
                description: 'Test',
                steps: [],
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-01-01T00:00:00.000Z',
              },
              metadata: {
                triggeredBy: 'user-123',
              },
            }),
            attributes: {} as any,
            messageAttributes: {},
            md5OfBody: 'test-md5',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:test-queue',
            awsRegion: 'us-east-1',
          },
        ],
      };

      // Mock updateExecutionStatus
      (testExecutionDBService.updateExecutionStatus as any).mockResolvedValue(undefined);

      // Mock executeTestCase to return success
      (testExecutorService.executeTestCase as any).mockResolvedValue({
        execution: {
          executionId: 'exec-123',
          projectId: 'project-123',
          testCaseId: 'test-case-123',
          status: 'completed',
          result: 'pass',
          startTime: '2024-01-01T00:00:00.000Z',
          endTime: '2024-01-01T00:01:00.000Z',
          duration: 60000,
          steps: [],
          screenshots: [],
          metadata: {
            triggeredBy: 'user-123',
          },
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:01:00.000Z',
        },
        success: true,
      });

      // Mock updateExecutionResults
      (testExecutionDBService.updateExecutionResults as any).mockResolvedValue(undefined);

      // Should complete successfully
      await expect(handler(event, mockContext)).resolves.not.toThrow();

      // Verify status was updated to running
      expect(testExecutionDBService.updateExecutionStatus).toHaveBeenCalledWith('exec-123', 'running');

      // Verify execution was performed
      expect(testExecutorService.executeTestCase).toHaveBeenCalledWith({
        executionId: 'exec-123',
        testCase: expect.any(Object),
        projectId: 'project-123',
        triggeredBy: 'user-123',
        environment: undefined,
      });

      // Verify results were saved
      expect(testExecutionDBService.updateExecutionResults).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'exec-123',
          status: 'completed',
          result: 'pass',
        })
      );
    });
  });
});
