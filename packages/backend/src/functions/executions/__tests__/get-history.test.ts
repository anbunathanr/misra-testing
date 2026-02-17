/**
 * Unit tests for Get Execution History Lambda
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../get-history';
import { testExecutionDBService } from '../../../services/test-execution-db-service';
import { TestExecution } from '../../../types/test-execution';
import { describe, test, expect, beforeEach, jest } from '@jest/globals';

describe('Get Execution History Lambda', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('should return 400 if projectId is missing', async () => {
    const event = {
      queryStringParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      message: 'projectId is required',
    });
  });

  test('should return execution history for projectId only', async () => {
    const mockExecutions: TestExecution[] = [
      {
        executionId: 'exec-1',
        projectId: 'proj-1',
        testCaseId: 'tc-1',
        status: 'completed',
        result: 'pass',
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-01-01T00:00:05.000Z',
        duration: 5000,
        steps: [],
        screenshots: [],
        metadata: {
          triggeredBy: 'user-1',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:05.000Z',
      },
    ];

    const mockResult = {
      executions: mockExecutions,
      count: mockExecutions.length,
    };

    // Spy on the method
    const spy = jest.spyOn(testExecutionDBService, 'queryExecutionHistory').mockResolvedValue(mockResult);

    const event = {
      queryStringParameters: {
        projectId: 'proj-1',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    
    expect(body).toHaveProperty('executions');
    expect(body).toHaveProperty('count');
    expect(body.executions).toEqual(mockExecutions);
    expect(body.count).toBe(1);
    expect(spy).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testCaseId: undefined,
      testSuiteId: undefined,
      startDate: undefined,
      endDate: undefined,
      limit: 50,
    });
  });

  test('should return execution history with testCaseId filter', async () => {
    const mockExecutions: TestExecution[] = [];
    const spy = jest.spyOn(testExecutionDBService, 'queryExecutionHistory').mockResolvedValue({
      executions: mockExecutions,
      count: 0,
    });

    const event = {
      queryStringParameters: {
        projectId: 'proj-1',
        testCaseId: 'tc-1',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testCaseId: 'tc-1',
      testSuiteId: undefined,
      startDate: undefined,
      endDate: undefined,
      limit: 50,
    });
  });

  test('should return execution history with date range filter', async () => {
    const mockExecutions: TestExecution[] = [];
    const spy = jest.spyOn(testExecutionDBService, 'queryExecutionHistory').mockResolvedValue({
      executions: mockExecutions,
      count: 0,
    });

    const event = {
      queryStringParameters: {
        projectId: 'proj-1',
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testCaseId: undefined,
      testSuiteId: undefined,
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-31T23:59:59.999Z',
      limit: 50,
    });
  });

  test('should return execution history with custom limit', async () => {
    const mockExecutions: TestExecution[] = [];
    const spy = jest.spyOn(testExecutionDBService, 'queryExecutionHistory').mockResolvedValue({
      executions: mockExecutions,
      count: 0,
    });

    const event = {
      queryStringParameters: {
        projectId: 'proj-1',
        limit: '100',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(spy).toHaveBeenCalledWith({
      projectId: 'proj-1',
      testCaseId: undefined,
      testSuiteId: undefined,
      startDate: undefined,
      endDate: undefined,
      limit: 100,
    });
  });

  test('should return 500 on database error', async () => {
    const spy = jest.spyOn(testExecutionDBService, 'queryExecutionHistory').mockRejectedValue(new Error('Database connection failed'));

    const event = {
      queryStringParameters: {
        projectId: 'proj-1',
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
