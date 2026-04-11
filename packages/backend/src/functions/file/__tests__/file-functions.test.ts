import { APIGatewayProxyEvent } from 'aws-lambda';

// Mock dependencies before imports
const mockGeneratePresignedUploadUrl = jest.fn();
const mockSQSSend = jest.fn().mockResolvedValue({});

jest.mock('@aws-sdk/client-sqs', () => ({
  SQSClient: jest.fn().mockImplementation(() => ({
    send: mockSQSSend,
  })),
  SendMessageCommand: jest.fn().mockImplementation((input) => input),
}));

jest.mock('../../../services/file/file-upload-service', () => ({
  FileUploadService: jest.fn().mockImplementation(() => ({
    generatePresignedUploadUrl: mockGeneratePresignedUploadUrl,
  })),
}));

jest.mock('../../../services/file-metadata-service', () => ({
  FileMetadataService: jest.fn().mockImplementation(() => ({
    createFileMetadata: jest.fn().mockResolvedValue({}),
  })),
}));

jest.mock('../../../database/dynamodb-client', () => ({
  DynamoDBClientWrapper: jest.fn().mockImplementation(() => ({})),
}));

import { handler as uploadHandler } from '../upload';
import { handler as getFilesHandler } from '../get-files';

/**
 * Build a mock APIGatewayProxyEvent with request context populated
 * by the Lambda Authorizer (simulating post-auth context).
 */
function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
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
        userId: 'user-123',
        email: 'test@example.com',
        organizationId: 'org-456',
        role: 'developer',
      },
      accountId: '123456789',
      apiId: 'api-id',
      httpMethod: 'GET',
      identity: {} as any,
      path: '/',
      protocol: 'HTTP/1.1',
      requestId: 'req-id',
      requestTimeEpoch: 0,
      resourceId: 'res-id',
      resourcePath: '/',
      stage: 'dev',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

// ─── get-files tests ──────────────────────────────────────────────────────────

describe('get-files handler', () => {
  it('returns 200 with empty array when user is authenticated', async () => {
    const event = buildEvent();
    const result = await getFilesHandler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    expect(JSON.parse(result.body)).toEqual([]);
  });

  it('returns 401 when no user context is present', async () => {
    const event = buildEvent({
      requestContext: {
        authorizer: undefined,
        accountId: '123456789',
        apiId: 'api-id',
        httpMethod: 'GET',
        identity: {} as any,
        path: '/',
        protocol: 'HTTP/1.1',
        requestId: 'req-id',
        requestTimeEpoch: 0,
        resourceId: 'res-id',
        resourcePath: '/',
        stage: 'dev',
      },
    });

    const result = await getFilesHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  it('does NOT check Authorization header (auth is handled by Lambda Authorizer)', async () => {
    // No Authorization header, but valid context - should succeed
    const event = buildEvent({ headers: {} });
    const result = await getFilesHandler(event);
    expect(result.statusCode).toBe(200);
  });
});

// ─── upload tests ─────────────────────────────────────────────────────────────

describe('upload handler', () => {
  beforeEach(() => {
    mockGeneratePresignedUploadUrl.mockResolvedValue({
      fileId: 'file-789',
      uploadUrl: 'https://s3.example.com/upload',
      downloadUrl: 'https://s3.example.com/download',
      expiresIn: 3600,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns 200 with upload URL when user is authenticated and body is valid', async () => {
    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({
        fileName: 'test.cpp',
        fileSize: 1024,
        contentType: 'text/plain',
      }),
    });

    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(200);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
    const body = JSON.parse(result.body);
    expect(body.fileId).toBe('file-789');
    expect(body.uploadUrl).toBeDefined();
  });

  it('returns 401 when no user context is present', async () => {
    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ fileName: 'test.cpp', fileSize: 1024, contentType: 'text/plain' }),
      requestContext: {
        authorizer: undefined,
        accountId: '123456789',
        apiId: 'api-id',
        httpMethod: 'POST',
        identity: {} as any,
        path: '/',
        protocol: 'HTTP/1.1',
        requestId: 'req-id',
        requestTimeEpoch: 0,
        resourceId: 'res-id',
        resourcePath: '/',
        stage: 'dev',
      },
    });

    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(401);
    expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
  });

  it('returns 400 when request body is missing', async () => {
    const event = buildEvent({ httpMethod: 'POST', body: null });
    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 when required fields are missing from body', async () => {
    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ fileName: 'test.cpp' }), // missing fileSize and contentType
    });
    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(400);
  });

  it('does NOT check Authorization header (auth is handled by Lambda Authorizer)', async () => {
    // No Authorization header, but valid context - should succeed
    const event = buildEvent({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ fileName: 'test.cpp', fileSize: 1024, contentType: 'text/plain' }),
    });
    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(200);
  });

  it('returns 400 when file extension is not allowed', async () => {
    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ fileName: 'script.js', fileSize: 1024, contentType: 'text/plain' }),
    });
    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('returns 400 when file size exceeds 10MB', async () => {
    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ fileName: 'large.c', fileSize: 11 * 1024 * 1024, contentType: 'text/plain' }),
    });
    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(400);
    const body = JSON.parse(result.body);
    expect(body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('accepts all valid C/C++ extensions', async () => {
    for (const ext of ['.c', '.cpp', '.h', '.hpp']) {
      const event = buildEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ fileName: `file${ext}`, fileSize: 1024, contentType: 'text/plain' }),
      });
      const result = await uploadHandler(event);
      expect(result.statusCode).toBe(200);
    }
  });

  it('queues analysis message when ANALYSIS_QUEUE_URL is set', async () => {
    process.env.ANALYSIS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123/misra-analysis-queue';
    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ fileName: 'main.cpp', fileSize: 1024, contentType: 'text/plain' }),
    });
    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(200);
    expect(mockSQSSend).toHaveBeenCalled();
    delete process.env.ANALYSIS_QUEUE_URL;
  });

  it('includes all required fields in SQS message (Requirement 2.3)', async () => {
    process.env.ANALYSIS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123/misra-analysis-queue';
    
    mockGeneratePresignedUploadUrl.mockResolvedValue({
      fileId: 'file-123',
      s3Key: 'uploads/org-456/user-123/1234567890-file-123-main.cpp',
      uploadUrl: 'https://s3.example.com/upload',
      downloadUrl: 'https://s3.example.com/download',
      expiresIn: 3600,
    });

    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ fileName: 'main.cpp', fileSize: 1024, contentType: 'text/plain' }),
    });

    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(200);

    // Verify SQS message was sent with all required fields
    expect(mockSQSSend).toHaveBeenCalled();
    
    // Get the SendMessageCommand that was passed to SQS
    const sendMessageCall = mockSQSSend.mock.calls[0][0];
    const messageBody = JSON.parse(sendMessageCall.MessageBody);

    // Verify all required fields are present
    expect(messageBody).toHaveProperty('fileId', 'file-123');
    expect(messageBody).toHaveProperty('fileName', 'main.cpp');
    expect(messageBody).toHaveProperty('s3Key', 'uploads/org-456/user-123/1234567890-file-123-main.cpp');
    expect(messageBody).toHaveProperty('language', 'CPP');
    expect(messageBody).toHaveProperty('userId', 'user-123');
    expect(messageBody).toHaveProperty('organizationId', 'org-456');

    delete process.env.ANALYSIS_QUEUE_URL;
  });

  it('derives language correctly from file extension', async () => {
    process.env.ANALYSIS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123/misra-analysis-queue';
    
    const testCases = [
      { fileName: 'test.c', expectedLanguage: 'C' },
      { fileName: 'test.h', expectedLanguage: 'C' },
      { fileName: 'test.cpp', expectedLanguage: 'CPP' },
      { fileName: 'test.hpp', expectedLanguage: 'CPP' },
    ];

    for (const testCase of testCases) {
      mockGeneratePresignedUploadUrl.mockResolvedValue({
        fileId: 'file-123',
        s3Key: `uploads/org-456/user-123/1234567890-file-123-${testCase.fileName}`,
        uploadUrl: 'https://s3.example.com/upload',
        downloadUrl: 'https://s3.example.com/download',
        expiresIn: 3600,
      });

      const event = buildEvent({
        httpMethod: 'POST',
        body: JSON.stringify({ fileName: testCase.fileName, fileSize: 1024, contentType: 'text/plain' }),
      });

      const result = await uploadHandler(event);
      expect(result.statusCode).toBe(200);

      const sendMessageCall = mockSQSSend.mock.calls[mockSQSSend.mock.calls.length - 1][0];
      const messageBody = JSON.parse(sendMessageCall.MessageBody);
      expect(messageBody.language).toBe(testCase.expectedLanguage);
    }

    delete process.env.ANALYSIS_QUEUE_URL;
  });

  it('uses consistent s3Key between FileMetadata and SQS message', async () => {
    process.env.ANALYSIS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/123/misra-analysis-queue';
    
    const expectedS3Key = 'uploads/org-456/user-123/1234567890-file-123-main.cpp';
    mockGeneratePresignedUploadUrl.mockResolvedValue({
      fileId: 'file-123',
      s3Key: expectedS3Key,
      uploadUrl: 'https://s3.example.com/upload',
      downloadUrl: 'https://s3.example.com/download',
      expiresIn: 3600,
    });

    const event = buildEvent({
      httpMethod: 'POST',
      body: JSON.stringify({ fileName: 'main.cpp', fileSize: 1024, contentType: 'text/plain' }),
    });

    const result = await uploadHandler(event);
    expect(result.statusCode).toBe(200);

    // Verify SQS message has the same s3Key
    const sendMessageCall = mockSQSSend.mock.calls[0][0];
    const messageBody = JSON.parse(sendMessageCall.MessageBody);
    expect(messageBody.s3Key).toBe(expectedS3Key);

    delete process.env.ANALYSIS_QUEUE_URL;
  });
});
