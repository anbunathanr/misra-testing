/**
 * Unit tests for Get Execution Status Lambda
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../get-status';
import { testExecutionDBService } from '../../../services/test-execution-db-service';
import { TestExecution } from '../../../types/test-execution';

// Mock the database service
jest.mock('../../../services/test-execution-db-service');

describe('Get Execution Status Lambda', () => {
  const mockGetExecution = testExecutionDBService.getExecution as jest.MockedFunction<
    typeof testExecutionDBService.getExecution
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 400 if executionId is missing', async () => {
    const event = {
      pathParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: 'executionId is required',
    });
  });

  test('should return 404 if execution not found', async () => {
    mockGetExecution.mockResolvedValue(null);

    const event = {
      pathParameters: {
        executionId: 'non-existent-id',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Execution not found: non-existent-id',
    });
  });

  test('should return execution status for queued execution', async () => {
    const mockExecution: TestExecution = {
      executionId: 'exec-123',
      projectId: 'proj-1',
      testCaseId: 'tc-1',
      status: 'queued',
      startTime: '2024-01-01T00:00:00.000Z',
      steps: [
        {
          stepIndex: 0,
          action: 'navigate',
          status: 'pass',
          duration: 0,
        },
        {
          stepIndex: 1,
          action: 'click',
          status: 'pass',
          duration: 0,
        },
      ],
      screenshots: [],
      metadata: {
        triggeredBy: 'user-1',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    mockGetExecution.mockResolvedValue(mockExecution);

    const event = {
      pathParameters: {
        executionId: 'exec-123',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toMatchObject({
      executionId: 'exec-123',
      status: 'queued',
      totalSteps: 2,
      startTime: '2024-01-01T00:00:00.000Z',
    });
    expect(body.currentStep).toBeUndefined();
  });

  test('should return execution status with current step for running execution', async () => {
    const mockExecution: TestExecution = {
      executionId: 'exec-123',
      projectId: 'proj-1',
      testCaseId: 'tc-1',
      status: 'running',
      startTime: '2024-01-01T00:00:00.000Z',
      steps: [
        {
          stepIndex: 0,
          action: 'navigate',
          status: 'pass',
          duration: 100,
        },
        {
          stepIndex: 1,
          action: 'click',
          status: 'pass',
          duration: 50,
        },
        {
          stepIndex: 2,
          action: 'type',
          status: 'pass',
          duration: 0,
        },
      ],
      screenshots: [],
      metadata: {
        triggeredBy: 'user-1',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:01.000Z',
    };

    mockGetExecution.mockResolvedValue(mockExecution);

    const event = {
      pathParameters: {
        executionId: 'exec-123',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toMatchObject({
      executionId: 'exec-123',
      status: 'running',
      currentStep: 3, // 3 steps completed
      totalSteps: 3,
      startTime: '2024-01-01T00:00:00.000Z',
    });
    expect(body.duration).toBeGreaterThan(0);
  });

  test('should return execution status with result for completed execution', async () => {
    const mockExecution: TestExecution = {
      executionId: 'exec-123',
      projectId: 'proj-1',
      testCaseId: 'tc-1',
      status: 'completed',
      result: 'pass',
      startTime: '2024-01-01T00:00:00.000Z',
      endTime: '2024-01-01T00:00:05.000Z',
      duration: 5000,
      steps: [
        {
          stepIndex: 0,
          action: 'navigate',
          status: 'pass',
          duration: 2000,
        },
        {
          stepIndex: 1,
          action: 'click',
          status: 'pass',
          duration: 1000,
        },
        {
          stepIndex: 2,
          action: 'assert',
          status: 'pass',
          duration: 2000,
        },
      ],
      screenshots: [],
      metadata: {
        triggeredBy: 'user-1',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:05.000Z',
    };

    mockGetExecution.mockResolvedValue(mockExecution);

    const event = {
      pathParameters: {
        executionId: 'exec-123',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toEqual({
      executionId: 'exec-123',
      status: 'completed',
      result: 'pass',
      totalSteps: 3,
      startTime: '2024-01-01T00:00:00.000Z',
      duration: 5000,
    });
  });

  test('should return execution status for failed execution', async () => {
    const mockExecution: TestExecution = {
      executionId: 'exec-123',
      projectId: 'proj-1',
      testCaseId: 'tc-1',
      status: 'completed',
      result: 'fail',
      startTime: '2024-01-01T00:00:00.000Z',
      endTime: '2024-01-01T00:00:03.000Z',
      duration: 3000,
      steps: [
        {
          stepIndex: 0,
          action: 'navigate',
          status: 'pass',
          duration: 1000,
        },
        {
          stepIndex: 1,
          action: 'click',
          status: 'fail',
          duration: 2000,
          errorMessage: 'Element not found',
        },
      ],
      screenshots: ['screenshot-1.png'],
      metadata: {
        triggeredBy: 'user-1',
      },
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:03.000Z',
    };

    mockGetExecution.mockResolvedValue(mockExecution);

    const event = {
      pathParameters: {
        executionId: 'exec-123',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body).toEqual({
      executionId: 'exec-123',
      status: 'completed',
      result: 'fail',
      totalSteps: 2,
      startTime: '2024-01-01T00:00:00.000Z',
      duration: 3000,
    });
  });

  test('should return 500 on database error', async () => {
    mockGetExecution.mockRejectedValue(new Error('Database connection failed'));

    const event = {
      pathParameters: {
        executionId: 'exec-123',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: 'Internal server error',
      error: 'Database connection failed',
    });
  });
});
