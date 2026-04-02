/**
 * Unit tests for Test Case Lambda functions
 * Uses mock request context (Lambda Authorizer pattern) instead of JWT tokens
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';

// ─── Top-level mocks ─────────────────────────────────────────────────────────

const mockCreateTestCase = jest.fn();
const mockGetSuiteTestCases = jest.fn();
const mockGetProjectTestCases = jest.fn();
const mockUpdateTestCase = jest.fn();

jest.mock('../../../services/test-case-service', () => ({
  TestCaseService: jest.fn().mockImplementation(() => ({
    createTestCase: (...args: any[]) => mockCreateTestCase(...args),
    getSuiteTestCases: (...args: any[]) => mockGetSuiteTestCases(...args),
    getProjectTestCases: (...args: any[]) => mockGetProjectTestCases(...args),
    updateTestCase: (...args: any[]) => mockUpdateTestCase(...args),
  })),
}));

// Import handlers after mocks
import { handler as createTestCaseHandler } from '../create-test-case';
import { handler as getTestCasesHandler } from '../get-test-cases';
import { handler as updateTestCaseHandler } from '../update-test-case';

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

// ─── create-test-case ─────────────────────────────────────────────────────────

describe('create-test-case', () => {
  const validBody = {
    suiteId: 'suite-1',
    projectId: 'proj-1',
    name: 'My Test',
    description: 'A test case',
    type: 'functional',
    steps: [{ action: 'click', target: '#btn' }],
  };

  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: JSON.stringify(validBody) }, '');
    const result = await createTestCaseHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when required fields are missing', async () => {
    const event = buildEvent({ body: JSON.stringify({ name: 'My Test' }) });
    const result = await createTestCaseHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('creates test case for authenticated user', async () => {
    const testCase = { testCaseId: 'tc-1', ...validBody };
    mockCreateTestCase.mockResolvedValue(testCase);
    const event = buildEvent({ body: JSON.stringify(validBody) });
    const result = await createTestCaseHandler(event);
    expect(result.statusCode).toBe(201);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toMatchObject({ testCaseId: 'tc-1' });
  });

  test('returns 500 on service error', async () => {
    mockCreateTestCase.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({ body: JSON.stringify(validBody) });
    const result = await createTestCaseHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── get-test-cases ───────────────────────────────────────────────────────────

describe('get-test-cases', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({}, '');
    const result = await getTestCasesHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when neither suiteId nor projectId provided', async () => {
    const event = buildEvent();
    const result = await getTestCasesHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns test cases filtered by suiteId', async () => {
    mockGetSuiteTestCases.mockResolvedValue([{ testCaseId: 'tc-1' }]);
    const event = buildEvent({ queryStringParameters: { suiteId: 'suite-1' } });
    const result = await getTestCasesHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns test cases filtered by projectId', async () => {
    mockGetProjectTestCases.mockResolvedValue([{ testCaseId: 'tc-1' }]);
    const event = buildEvent({ queryStringParameters: { projectId: 'proj-1' } });
    const result = await getTestCasesHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 500 on service error', async () => {
    mockGetSuiteTestCases.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({ queryStringParameters: { suiteId: 'suite-1' } });
    const result = await getTestCasesHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── update-test-case ─────────────────────────────────────────────────────────

describe('update-test-case', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}', pathParameters: { testCaseId: 'tc-1' } }, '');
    const result = await updateTestCaseHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when testCaseId is missing', async () => {
    const event = buildEvent({ body: '{}', pathParameters: null });
    const result = await updateTestCaseHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('updates test case for authenticated user', async () => {
    const testCase = { testCaseId: 'tc-1', name: 'Updated Test' };
    mockUpdateTestCase.mockResolvedValue(testCase);
    const event = buildEvent({
      body: JSON.stringify({ name: 'Updated Test' }),
      pathParameters: { testCaseId: 'tc-1' },
    });
    const result = await updateTestCaseHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toMatchObject({ testCaseId: 'tc-1' });
  });

  test('returns 500 on service error', async () => {
    mockUpdateTestCase.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({
      body: JSON.stringify({ name: 'Updated Test' }),
      pathParameters: { testCaseId: 'tc-1' },
    });
    const result = await updateTestCaseHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});
