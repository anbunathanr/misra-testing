/**
 * Unit tests for Test Suite Lambda functions
 * Uses mock request context (Lambda Authorizer pattern) instead of JWT tokens
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';

// ─── Top-level mocks ─────────────────────────────────────────────────────────

const mockCreateTestSuite = jest.fn();
const mockGetProjectTestSuites = jest.fn();
const mockGetUserTestSuites = jest.fn();
const mockUpdateTestSuite = jest.fn();

jest.mock('../../../services/test-suite-service', () => ({
  TestSuiteService: jest.fn().mockImplementation(() => ({
    createTestSuite: (...args: any[]) => mockCreateTestSuite(...args),
    getProjectTestSuites: (...args: any[]) => mockGetProjectTestSuites(...args),
    getUserTestSuites: (...args: any[]) => mockGetUserTestSuites(...args),
    updateTestSuite: (...args: any[]) => mockUpdateTestSuite(...args),
  })),
}));

// Import handlers after mocks
import { handler as createSuiteHandler } from '../create-suite';
import { handler as getSuitesHandler } from '../get-suites';
import { handler as updateSuiteHandler } from '../update-suite';

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}, userId = 'user-123'): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    body: null,
    isBase64Encoded: false,
    resource: '/',
    requestContext: {
      authorizer: {
        userId,
        email: 'user@example.com',
        organizationId: 'org-123',
        role: 'developer',
      },
    } as any,
    ...overrides,
  } as APIGatewayProxyEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── create-suite ─────────────────────────────────────────────────────────────

describe('create-suite', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}' }, '');
    const result = await createSuiteHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when required fields are missing', async () => {
    const event = buildEvent({ body: JSON.stringify({ name: 'My Suite' }) });
    const result = await createSuiteHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('creates suite for authenticated user', async () => {
    const suite = { suiteId: 'suite-1', name: 'My Suite', projectId: 'proj-1', description: 'A suite' };
    mockCreateTestSuite.mockResolvedValue(suite);
    const event = buildEvent({
      body: JSON.stringify({ projectId: 'proj-1', name: 'My Suite', description: 'A suite' }),
    });
    const result = await createSuiteHandler(event);
    expect(result.statusCode).toBe(201);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toMatchObject({ suiteId: 'suite-1' });
  });

  test('returns 500 on service error', async () => {
    mockCreateTestSuite.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({
      body: JSON.stringify({ projectId: 'proj-1', name: 'My Suite', description: 'A suite' }),
    });
    const result = await createSuiteHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── get-suites ───────────────────────────────────────────────────────────────

describe('get-suites', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({}, '');
    const result = await getSuitesHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns suites filtered by projectId', async () => {
    mockGetProjectTestSuites.mockResolvedValue([{ suiteId: 'suite-1' }]);
    const event = buildEvent({ queryStringParameters: { projectId: 'proj-1' } });
    const result = await getSuitesHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns all user suites when no projectId', async () => {
    mockGetUserTestSuites.mockResolvedValue([{ suiteId: 'suite-1' }]);
    const event = buildEvent();
    const result = await getSuitesHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 500 on service error', async () => {
    mockGetUserTestSuites.mockRejectedValue(new Error('DB error'));
    const event = buildEvent();
    const result = await getSuitesHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── update-suite ─────────────────────────────────────────────────────────────

describe('update-suite', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}', pathParameters: { suiteId: 'suite-1' } }, '');
    const result = await updateSuiteHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when suiteId is missing', async () => {
    const event = buildEvent({ body: '{}', pathParameters: null });
    const result = await updateSuiteHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('updates suite for authenticated user', async () => {
    const suite = { suiteId: 'suite-1', name: 'Updated Suite' };
    mockUpdateTestSuite.mockResolvedValue(suite);
    const event = buildEvent({
      body: JSON.stringify({ name: 'Updated Suite' }),
      pathParameters: { suiteId: 'suite-1' },
    });
    const result = await updateSuiteHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toMatchObject({ suiteId: 'suite-1' });
  });

  test('returns 500 on service error', async () => {
    mockUpdateTestSuite.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({
      body: JSON.stringify({ name: 'Updated Suite' }),
      pathParameters: { suiteId: 'suite-1' },
    });
    const result = await updateSuiteHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});
