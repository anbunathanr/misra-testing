/**
 * Unit tests for Get Execution Results Lambda
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../get-results';
import { testExecutionDBService } from '../../../services/test-execution-db-service';
import { TestExecution } from '../../../types/test-execution';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Mock the database service
jest.mock('../../../services/test-execution-db-service');

// Mock AWS S3 getSignedUrl
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('Get Execution Results Lambda', () => {
  const mockGetExecution = testExecutionDBService.getExecution as jest.MockedFunction<
    typeof testExecutionDBService.getExecution
  >;
  const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<typeof getSignedUrl>;

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
