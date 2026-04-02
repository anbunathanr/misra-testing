/**
 * Unit tests for Project Lambda functions
 * Uses mock request context (Lambda Authorizer pattern) instead of JWT tokens
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';

// ─── Top-level mocks ─────────────────────────────────────────────────────────

const mockCreateProject = jest.fn();
const mockGetUserProjects = jest.fn();
const mockUpdateProject = jest.fn();

jest.mock('../../../services/project-service', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    createProject: (...args: any[]) => mockCreateProject(...args),
    getUserProjects: (...args: any[]) => mockGetUserProjects(...args),
    updateProject: (...args: any[]) => mockUpdateProject(...args),
  })),
}));

// Import handlers after mocks
import { handler as createProjectHandler } from '../create-project';
import { handler as getProjectsHandler } from '../get-projects';
import { handler as updateProjectHandler } from '../update-project';

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

// ─── create-project ──────────────────────────────────────────────────────────

describe('create-project', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}' }, '');
    const result = await createProjectHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when required fields are missing', async () => {
    const event = buildEvent({ body: JSON.stringify({ name: 'My Project' }) });
    const result = await createProjectHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('creates project for authenticated user', async () => {
    const project = { projectId: 'proj-1', name: 'My Project', targetUrl: 'https://example.com', environment: 'staging' };
    mockCreateProject.mockResolvedValue(project);
    const event = buildEvent({
      body: JSON.stringify({ name: 'My Project', targetUrl: 'https://example.com', environment: 'staging' }),
    });
    const result = await createProjectHandler(event);
    expect(result.statusCode).toBe(201);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toMatchObject({ projectId: 'proj-1' });
  });

  test('returns 500 on service error', async () => {
    mockCreateProject.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({
      body: JSON.stringify({ name: 'My Project', targetUrl: 'https://example.com', environment: 'staging' }),
    });
    const result = await createProjectHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── get-projects ─────────────────────────────────────────────────────────────

describe('get-projects', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({}, '');
    const result = await getProjectsHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns projects for authenticated user', async () => {
    mockGetUserProjects.mockResolvedValue([{ projectId: 'proj-1', name: 'My Project' }]);
    const event = buildEvent();
    const result = await getProjectsHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toHaveProperty('projects');
  });

  test('returns 500 on service error', async () => {
    mockGetUserProjects.mockRejectedValue(new Error('DB error'));
    const event = buildEvent();
    const result = await getProjectsHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── update-project ───────────────────────────────────────────────────────────

describe('update-project', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}', pathParameters: { projectId: 'proj-1' } }, '');
    const result = await updateProjectHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when projectId is missing', async () => {
    const event = buildEvent({ body: '{}', pathParameters: null });
    const result = await updateProjectHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('updates project for authenticated user', async () => {
    const project = { projectId: 'proj-1', name: 'Updated Project' };
    mockUpdateProject.mockResolvedValue(project);
    const event = buildEvent({
      body: JSON.stringify({ name: 'Updated Project' }),
      pathParameters: { projectId: 'proj-1' },
    });
    const result = await updateProjectHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toMatchObject({ projectId: 'proj-1' });
  });

  test('returns 500 on service error', async () => {
    mockUpdateProject.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({
      body: JSON.stringify({ name: 'Updated Project' }),
      pathParameters: { projectId: 'proj-1' },
    });
    const result = await updateProjectHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});
