/**
 * Unit tests for Trigger Lambda function
 * Tests endpoint validation and execution triggering
 */

import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { testExecutionDBService } from '../../../services/test-execution-db-service';
import { TestCaseService } from '../../../services/test-case-service';
import { TestSuiteService } from '../../../services/test-suite-service';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

// Mock the services and AWS SDK
jest.mock('../../../services/test-execution-db-service');
jest.mock('../../../services/test-case-service');
jest.mock('../../../services/test-suite-service');

// Mock SQS client with proper send method
const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sqs', () => {
  return {
    SQSClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    SendMessageCommand: jest.fn().mockImplementation((params: any) => params),
  };
});

// Import handler after mocks are set up
import { handler } from '../trigger';

describe('Trigger Lambda', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set environment variable
    process.env.TEST_EXECUTION_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

    // Reset mock
    (mockSend as any).mockResolvedValue({});

    // Create base event
    mockEvent = {
      body: null,
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
          },
        },
      } as any,
    };
  });

  afterEach(() => {
    delete process.env.TEST_EXECUTION_QUEUE_URL;
  });

  describe('Request Validation', () => {
    test('should return 400 if request body is missing', async () => {
      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Request body is required',
      });
    });

    test('should return 400 if neither testCaseId nor testSuiteId is provided', async () => {
      mockEvent.body = JSON.stringify({});

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Either testCaseId or testSuiteId is required',
      });
    });

    test('should return 400 if both testCaseId and testSuiteId are provided', async () => {
      mockEvent.body = JSON.stringify({
        testCaseId: 'test-case-123',
        testSuiteId: 'test-suite-123',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Cannot specify both testCaseId and testSuiteId',
      });
    });

    test('should return 500 if queue URL is not configured', async () => {
      delete process.env.TEST_EXECUTION_QUEUE_URL;

      mockEvent.body = JSON.stringify({
        testCaseId: 'test-case-123',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toEqual({
        error: 'Queue configuration error',
      });
    });
  });

  describe('Single Test Case Execution', () => {
    test('should trigger test case execution successfully', async () => {
      const mockTestCase = {
        testCaseId: 'test-case-123',
        projectId: 'project-123',
        name: 'Test Case',
        description: 'Test',
        steps: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      (TestCaseService.prototype.getTestCase as any).mockResolvedValue(mockTestCase);
      (testExecutionDBService.createExecution as any).mockResolvedValue(undefined);

      mockEvent.body = JSON.stringify({
        testCaseId: 'test-case-123',
        environment: 'test',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body);
      expect(response).toMatchObject({
        status: 'queued',
        message: 'Test case execution queued successfully',
      });
      expect(response.executionId).toBeDefined();

      // Verify execution record was created
      expect(testExecutionDBService.createExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-123',
          testCaseId: 'test-case-123',
          status: 'queued',
          metadata: {
            triggeredBy: 'user-123',
            environment: 'test',
          },
        })
      );

      // Verify SQS message was sent
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
          MessageBody: expect.any(String),
        })
      );
    });

    test('should return 500 if test case not found', async () => {
      (TestCaseService.prototype.getTestCase as any).mockResolvedValue(null);

      mockEvent.body = JSON.stringify({
        testCaseId: 'nonexistent',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Failed to trigger execution',
      });
    });

    test('should handle database errors gracefully', async () => {
      const mockTestCase = {
        testCaseId: 'test-case-123',
        projectId: 'project-123',
        name: 'Test Case',
        steps: [],
      };

      (TestCaseService.prototype.getTestCase as any).mockResolvedValue(mockTestCase);
      (testExecutionDBService.createExecution as any).mockRejectedValue(
        new Error('DynamoDB error')
      );

      mockEvent.body = JSON.stringify({
        testCaseId: 'test-case-123',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Failed to trigger execution',
      });
    });
  });

  describe('Test Suite Execution', () => {
    test('should trigger test suite execution successfully', async () => {
      const mockTestSuite = {
        suiteId: 'test-suite-123',
        projectId: 'project-123',
        name: 'Test Suite',
        description: 'Test',
      };

      const mockTestCases = [
        {
          testCaseId: 'test-case-1',
          projectId: 'project-123',
          name: 'Test Case 1',
          steps: [],
        },
        {
          testCaseId: 'test-case-2',
          projectId: 'project-123',
          name: 'Test Case 2',
          steps: [],
        },
      ];

      (TestSuiteService.prototype.getTestSuite as any).mockResolvedValue(mockTestSuite);
      (TestCaseService.prototype.getSuiteTestCases as any).mockResolvedValue(mockTestCases);
      (testExecutionDBService.createExecution as any).mockResolvedValue(undefined);

      mockEvent.body = JSON.stringify({
        testSuiteId: 'test-suite-123',
        environment: 'staging',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const response = JSON.parse(result.body);
      expect(response).toMatchObject({
        status: 'queued',
        message: 'Test suite execution queued successfully with 2 test cases',
      });
      expect(response.suiteExecutionId).toBeDefined();
      expect(response.testCaseExecutionIds).toHaveLength(2);

      // Verify execution records were created for each test case
      expect(testExecutionDBService.createExecution).toHaveBeenCalledTimes(2);

      // Verify SQS messages were sent for each test case
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    test('should return 500 if test suite not found', async () => {
      (TestSuiteService.prototype.getTestSuite as any).mockResolvedValue(null);

      mockEvent.body = JSON.stringify({
        testSuiteId: 'nonexistent',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Failed to trigger execution',
      });
    });

    test('should return 500 if test suite has no test cases', async () => {
      const mockTestSuite = {
        suiteId: 'test-suite-123',
        projectId: 'project-123',
        name: 'Empty Suite',
      };

      (TestSuiteService.prototype.getTestSuite as any).mockResolvedValue(mockTestSuite);
      (TestCaseService.prototype.getSuiteTestCases as any).mockResolvedValue([]);

      mockEvent.body = JSON.stringify({
        testSuiteId: 'test-suite-123',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      expect(JSON.parse(result.body)).toMatchObject({
        error: 'Failed to trigger execution',
      });
    });
  });

  describe('User Context', () => {
    test('should use anonymous user if no authorizer context', async () => {
      const mockTestCase = {
        testCaseId: 'test-case-123',
        projectId: 'project-123',
        name: 'Test Case',
        steps: [],
      };

      (TestCaseService.prototype.getTestCase as any).mockResolvedValue(mockTestCase);
      (testExecutionDBService.createExecution as any).mockResolvedValue(undefined);

      mockEvent.requestContext = {} as any;
      mockEvent.body = JSON.stringify({
        testCaseId: 'test-case-123',
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);

      // Verify anonymous user was used
      expect(testExecutionDBService.createExecution).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            triggeredBy: 'anonymous',
          }),
        })
      );
    });
  });
});
