/**
 * Unit tests for Notification Lambda functions
 * Uses mock request context (Lambda Authorizer pattern) instead of JWT tokens
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { APIGatewayProxyEvent } from 'aws-lambda';

// ─── Top-level mocks ─────────────────────────────────────────────────────────

const mockGetPreferences = jest.fn();
const mockUpdatePreferences = jest.fn();
const mockQueryHistory = jest.fn();
const mockGetNotificationById = jest.fn();
const mockCreateTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockDynamoSend = jest.fn();

jest.mock('../../../services/notification-preferences-service', () => ({
  notificationPreferencesService: {
    getPreferences: (...args: any[]) => mockGetPreferences(...args),
    updatePreferences: (...args: any[]) => mockUpdatePreferences(...args),
  },
}));

jest.mock('../../../services/notification-history-service', () => ({
  notificationHistoryService: {
    queryHistory: (...args: any[]) => mockQueryHistory(...args),
    getNotificationById: (...args: any[]) => mockGetNotificationById(...args),
  },
}));

jest.mock('../../../services/notification-template-service', () => ({
  notificationTemplateService: {
    createTemplate: (...args: any[]) => mockCreateTemplate(...args),
    updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
  },
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn().mockReturnValue({ send: (...args: any[]) => mockDynamoSend(...args) }),
  },
  ScanCommand: jest.fn().mockImplementation((params: any) => params),
  QueryCommand: jest.fn().mockImplementation((params: any) => params),
}));

// Import handlers after mocks are set up
import { handler as getPreferencesHandler } from '../get-preferences';
import { handler as updatePreferencesHandler } from '../update-preferences';
import { handler as getHistoryHandler } from '../get-history';
import { handler as getNotificationHandler } from '../get-notification';
import { handler as createTemplateHandler } from '../create-template';
import { handler as updateTemplateHandler } from '../update-template';
import { handler as getTemplatesHandler } from '../get-templates';

// ─── Helper ──────────────────────────────────────────────────────────────────

function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}, userId = 'user-123', role = 'developer'): APIGatewayProxyEvent {
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
        role,
      },
    } as any,
    ...overrides,
  } as APIGatewayProxyEvent;
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── get-preferences ─────────────────────────────────────────────────────────

describe('get-preferences', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({}, '', '');
    const result = await getPreferencesHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns preferences for authenticated user', async () => {
    mockGetPreferences.mockResolvedValue({ userId: 'user-123', emailEnabled: true });
    const event = buildEvent();
    const result = await getPreferencesHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toMatchObject({ userId: 'user-123' });
  });

  test('returns 500 on service error', async () => {
    mockGetPreferences.mockRejectedValue(new Error('DB error'));
    const event = buildEvent();
    const result = await getPreferencesHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── update-preferences ──────────────────────────────────────────────────────

describe('update-preferences', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}' }, '', '');
    const result = await updatePreferencesHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when body is missing', async () => {
    const event = buildEvent({ body: null });
    const result = await updatePreferencesHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('updates preferences for authenticated user', async () => {
    mockUpdatePreferences.mockResolvedValue({ userId: 'user-123', emailEnabled: false });
    const event = buildEvent({ body: JSON.stringify({ emailEnabled: false }) });
    const result = await updatePreferencesHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 500 on service error', async () => {
    mockUpdatePreferences.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({ body: JSON.stringify({ emailEnabled: false }) });
    const result = await updatePreferencesHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── get-history ─────────────────────────────────────────────────────────────

describe('get-history', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({}, '', '');
    const result = await getHistoryHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns history for authenticated user', async () => {
    mockQueryHistory.mockResolvedValue({ items: [], nextToken: null });
    const event = buildEvent();
    const result = await getHistoryHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 500 on service error', async () => {
    mockQueryHistory.mockRejectedValue(new Error('DB error'));
    const event = buildEvent();
    const result = await getHistoryHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── get-notification ────────────────────────────────────────────────────────

describe('get-notification', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({}, '', '');
    const result = await getNotificationHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when notificationId is missing', async () => {
    const event = buildEvent({ pathParameters: null });
    const result = await getNotificationHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 404 when notification not found', async () => {
    mockGetNotificationById.mockResolvedValue(null);
    const event = buildEvent({ pathParameters: { notificationId: 'notif-999' } });
    const result = await getNotificationHandler(event);
    expect(result.statusCode).toBe(404);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns notification when found', async () => {
    mockGetNotificationById.mockResolvedValue({ notificationId: 'notif-123', userId: 'user-123' });
    const event = buildEvent({ pathParameters: { notificationId: 'notif-123' } });
    const result = await getNotificationHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 500 on service error', async () => {
    mockGetNotificationById.mockRejectedValue(new Error('DB error'));
    const event = buildEvent({ pathParameters: { notificationId: 'notif-123' } });
    const result = await getNotificationHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── create-template ─────────────────────────────────────────────────────────

describe('create-template', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}' }, '', '');
    const result = await createTemplateHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 403 when user is not admin', async () => {
    const event = buildEvent({ body: '{}' }, 'user-123', 'developer');
    const result = await createTemplateHandler(event);
    expect(result.statusCode).toBe(403);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when body is missing', async () => {
    const event = buildEvent({ body: null }, 'user-123', 'admin');
    const result = await createTemplateHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when required fields are missing', async () => {
    const event = buildEvent({ body: JSON.stringify({ eventType: 'test' }) }, 'user-123', 'admin');
    const result = await createTemplateHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('creates template for admin user', async () => {
    mockCreateTemplate.mockResolvedValue({ templateId: 'tmpl-1', eventType: 'test.event', channel: 'email', format: 'html', body: 'Hello' });
    const event = buildEvent({
      body: JSON.stringify({ eventType: 'test.event', channel: 'email', format: 'html', body: 'Hello' }),
    }, 'user-123', 'admin');
    const result = await createTemplateHandler(event);
    expect(result.statusCode).toBe(201);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── update-template ─────────────────────────────────────────────────────────

describe('update-template', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({ body: '{}' }, '', '');
    const result = await updateTemplateHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 403 when user is not admin', async () => {
    const event = buildEvent({ body: '{}', pathParameters: { templateId: 'tmpl-1' } }, 'user-123', 'developer');
    const result = await updateTemplateHandler(event);
    expect(result.statusCode).toBe(403);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when templateId is missing', async () => {
    const event = buildEvent({ body: '{}', pathParameters: null }, 'user-123', 'admin');
    const result = await updateTemplateHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns 400 when body is missing', async () => {
    const event = buildEvent({ body: null, pathParameters: { templateId: 'tmpl-1' } }, 'user-123', 'admin');
    const result = await updateTemplateHandler(event);
    expect(result.statusCode).toBe(400);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('updates template for admin user', async () => {
    mockUpdateTemplate.mockResolvedValue({ templateId: 'tmpl-1', body: 'Updated' });
    const event = buildEvent({
      body: JSON.stringify({ body: 'Updated' }),
      pathParameters: { templateId: 'tmpl-1' },
    }, 'user-123', 'admin');
    const result = await updateTemplateHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});

// ─── get-templates ───────────────────────────────────────────────────────────

describe('get-templates', () => {
  test('returns 401 when no user context', async () => {
    const event = buildEvent({}, '', '');
    const result = await getTemplatesHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  test('returns templates for authenticated user', async () => {
    mockDynamoSend.mockResolvedValue({ Items: [{ templateId: 'tmpl-1' }] });
    const event = buildEvent();
    const result = await getTemplatesHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toHaveProperty('templates');
  });

  test('returns 500 on DynamoDB error', async () => {
    mockDynamoSend.mockRejectedValue(new Error('DynamoDB error'));
    const event = buildEvent();
    const result = await getTemplatesHandler(event);
    expect(result.statusCode).toBe(500);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });
});
