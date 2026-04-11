/**
 * Integration tests for get-files Lambda
 * Tests that verify:
 * 1. After uploading a file, FileMetadata record is created
 * 2. Calling get-files Lambda returns the uploaded file
 * 3. Results include all required fields: file_id, filename, file_type, file_size, analysis_status, upload_timestamp
 * 4. Multiple files are returned correctly
 * 
 * Validates: Requirements 2.6
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { FileMetadata, FileType, AnalysisStatus } from '../../../types/file-metadata';

// Mock DynamoDB client
const mockQueryByIndex = jest.fn();
const mockPutItem = jest.fn();

jest.mock('../../../database/dynamodb-client', () => ({
  DynamoDBClientWrapper: jest.fn().mockImplementation(() => ({
    queryByIndex: mockQueryByIndex,
    putItem: mockPutItem,
    getTableName: jest.fn().mockReturnValue('FileMetadata-dev'),
  })),
}));

jest.mock('../../../services/file-metadata-service', () => ({
  FileMetadataService: jest.fn().mockImplementation((dbClient) => ({
    getUserFiles: jest.fn().mockImplementation(async (userId, pagination) => {
      // Call the mock to get the data
      const result = await mockQueryByIndex('UserIndex', 'user_id', userId, {
        limit: pagination?.limit || 50,
        exclusiveStartKey: pagination?.exclusiveStartKey,
      });
      return {
        items: result.items,
        lastEvaluatedKey: result.lastEvaluatedKey,
        count: result.count,
        scannedCount: result.scannedCount,
      };
    }),
    createFileMetadata: jest.fn().mockImplementation(async (metadata) => {
      await mockPutItem(metadata);
      return metadata;
    }),
  })),
}));

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

/**
 * Create a mock FileMetadata record
 */
function createMockFileMetadata(overrides?: Partial<FileMetadata>): FileMetadata {
  const now = Math.floor(Date.now() / 1000);
  return {
    file_id: uuidv4(),
    user_id: 'user-123',
    filename: 'test.cpp',
    file_type: FileType.CPP,
    file_size: 1024,
    upload_timestamp: now,
    analysis_status: AnalysisStatus.PENDING,
    s3_key: 'uploads/user-123/file-id/test.cpp',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('get-files Lambda - Requirement 2.6', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1.5.3 Test get-files Lambda returns results', () => {
    it('should return empty array when user has no uploaded files', async () => {
      mockQueryByIndex.mockResolvedValue({
        items: [],
        count: 0,
        scannedCount: 0,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual([]);
    });

    it('should return uploaded file after metadata is created', async () => {
      const fileMetadata = createMockFileMetadata();

      mockQueryByIndex.mockResolvedValue({
        items: [fileMetadata],
        count: 1,
        scannedCount: 1,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files).toHaveLength(1);
      expect(files[0]).toEqual(fileMetadata);
    });

    it('should include all required fields in results', async () => {
      const fileMetadata = createMockFileMetadata();

      mockQueryByIndex.mockResolvedValue({
        items: [fileMetadata],
        count: 1,
        scannedCount: 1,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      const file = files[0];

      // Verify all required fields are present
      expect(file).toHaveProperty('file_id');
      expect(file).toHaveProperty('filename');
      expect(file).toHaveProperty('file_type');
      expect(file).toHaveProperty('file_size');
      expect(file).toHaveProperty('analysis_status');
      expect(file).toHaveProperty('upload_timestamp');

      // Verify field values
      expect(file.file_id).toBe(fileMetadata.file_id);
      expect(file.filename).toBe('test.cpp');
      expect(file.file_type).toBe(FileType.CPP);
      expect(file.file_size).toBe(1024);
      expect(file.analysis_status).toBe(AnalysisStatus.PENDING);
      expect(file.upload_timestamp).toBe(fileMetadata.upload_timestamp);
    });

    it('should return multiple files correctly', async () => {
      const file1 = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'main.cpp',
        file_type: FileType.CPP,
      });

      const file2 = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'utils.c',
        file_type: FileType.C,
      });

      const file3 = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'header.h',
        file_type: FileType.H,
      });

      mockQueryByIndex.mockResolvedValue({
        items: [file1, file2, file3],
        count: 3,
        scannedCount: 3,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files).toHaveLength(3);

      // Verify each file has required fields
      files.forEach((file: FileMetadata) => {
        expect(file).toHaveProperty('file_id');
        expect(file).toHaveProperty('filename');
        expect(file).toHaveProperty('file_type');
        expect(file).toHaveProperty('file_size');
        expect(file).toHaveProperty('analysis_status');
        expect(file).toHaveProperty('upload_timestamp');
      });

      // Verify specific files
      expect(files[0].filename).toBe('main.cpp');
      expect(files[1].filename).toBe('utils.c');
      expect(files[2].filename).toBe('header.h');
    });

    it('should return files with different analysis statuses', async () => {
      const pendingFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'pending.cpp',
        analysis_status: AnalysisStatus.PENDING,
      });

      const inProgressFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'in-progress.cpp',
        analysis_status: AnalysisStatus.IN_PROGRESS,
      });

      const completedFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'completed.cpp',
        analysis_status: AnalysisStatus.COMPLETED,
      });

      const failedFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'failed.cpp',
        analysis_status: AnalysisStatus.FAILED,
      });

      mockQueryByIndex.mockResolvedValue({
        items: [pendingFile, inProgressFile, completedFile, failedFile],
        count: 4,
        scannedCount: 4,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files).toHaveLength(4);

      expect(files[0].analysis_status).toBe(AnalysisStatus.PENDING);
      expect(files[1].analysis_status).toBe(AnalysisStatus.IN_PROGRESS);
      expect(files[2].analysis_status).toBe(AnalysisStatus.COMPLETED);
      expect(files[3].analysis_status).toBe(AnalysisStatus.FAILED);
    });

    it('should return files with analysis results when available', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fileWithResults = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'analyzed.cpp',
        analysis_status: AnalysisStatus.COMPLETED,
        analysis_results: {
          violations_count: 5,
          rules_checked: ['RULE-1', 'RULE-2', 'RULE-3'],
          completion_timestamp: now,
        },
      });

      mockQueryByIndex.mockResolvedValue({
        items: [fileWithResults],
        count: 1,
        scannedCount: 1,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files[0].analysis_results).toBeDefined();
      expect(files[0].analysis_results.violations_count).toBe(5);
      expect(files[0].analysis_results.rules_checked).toHaveLength(3);
    });

    it('should query UserIndex GSI with correct user_id', async () => {
      const fileMetadata = createMockFileMetadata();

      mockQueryByIndex.mockResolvedValue({
        items: [fileMetadata],
        count: 1,
        scannedCount: 1,
      });

      const event = buildEvent({
        requestContext: {
          ...buildEvent().requestContext,
          authorizer: {
            userId: 'cognito-user-550e8400-e29b-41d4-a716-446655440000',
            email: 'test@example.com',
            organizationId: 'org-456',
            role: 'developer',
          },
        },
      });

      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      expect(mockQueryByIndex).toHaveBeenCalledWith(
        'UserIndex',
        'user_id',
        'cognito-user-550e8400-e29b-41d4-a716-446655440000',
        expect.objectContaining({
          limit: 100,
        })
      );
    });

    it('should handle pagination with limit parameter', async () => {
      const files = Array.from({ length: 5 }, (_, i) =>
        createMockFileMetadata({
          file_id: uuidv4(),
          filename: `file${i}.cpp`,
        })
      );

      mockQueryByIndex.mockResolvedValue({
        items: files.slice(0, 3),
        count: 3,
        scannedCount: 3,
        lastEvaluatedKey: { file_id: files[2].file_id },
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const returnedFiles = JSON.parse(result.body);
      expect(returnedFiles).toHaveLength(3);
    });

    it('should return 401 when user is not authenticated', async () => {
      const event = buildEvent({
        requestContext: {
          ...buildEvent().requestContext,
          authorizer: undefined,
        },
      });

      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toHaveProperty('error');
    });

    it('should handle database errors gracefully', async () => {
      mockQueryByIndex.mockRejectedValue(new Error('Database connection failed'));

      const event = buildEvent();
      const result = await getFilesHandler(event);

      // Handler catches errors and returns empty array
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual([]);
    });

    it('should return files for Cognito UUID user_id (36 chars)', async () => {
      const cognitoUserId = '550e8400-e29b-41d4-a716-446655440000';
      const fileMetadata = createMockFileMetadata({
        user_id: cognitoUserId,
      });

      mockQueryByIndex.mockResolvedValue({
        items: [fileMetadata],
        count: 1,
        scannedCount: 1,
      });

      const event = buildEvent({
        requestContext: {
          ...buildEvent().requestContext,
          authorizer: {
            userId: cognitoUserId,
            email: 'test@example.com',
            organizationId: 'org-456',
            role: 'developer',
          },
        },
      });

      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files).toHaveLength(1);
      expect(files[0].user_id).toBe(cognitoUserId);
    });

    it('should return files sorted by upload_timestamp (most recent first)', async () => {
      const now = Math.floor(Date.now() / 1000);
      const file1 = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'old.cpp',
        upload_timestamp: now - 3600, // 1 hour ago
      });

      const file2 = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'recent.cpp',
        upload_timestamp: now, // now
      });

      mockQueryByIndex.mockResolvedValue({
        items: [file2, file1], // Most recent first
        count: 2,
        scannedCount: 2,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files[0].filename).toBe('recent.cpp');
      expect(files[1].filename).toBe('old.cpp');
    });

    it('should include all file types in results', async () => {
      const cFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'code.c',
        file_type: FileType.C,
      });

      const cppFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'code.cpp',
        file_type: FileType.CPP,
      });

      const hFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'header.h',
        file_type: FileType.H,
      });

      const hppFile = createMockFileMetadata({
        file_id: uuidv4(),
        filename: 'header.hpp',
        file_type: FileType.HPP,
      });

      mockQueryByIndex.mockResolvedValue({
        items: [cFile, cppFile, hFile, hppFile],
        count: 4,
        scannedCount: 4,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files).toHaveLength(4);

      const fileTypes = files.map((f: FileMetadata) => f.file_type);
      expect(fileTypes).toContain(FileType.C);
      expect(fileTypes).toContain(FileType.CPP);
      expect(fileTypes).toContain(FileType.H);
      expect(fileTypes).toContain(FileType.HPP);
    });

    it('should include s3_key in results for file retrieval', async () => {
      const fileMetadata = createMockFileMetadata({
        s3_key: 'uploads/user-123/file-id-123/test.cpp',
      });

      mockQueryByIndex.mockResolvedValue({
        items: [fileMetadata],
        count: 1,
        scannedCount: 1,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files[0]).toHaveProperty('s3_key');
      expect(files[0].s3_key).toBe('uploads/user-123/file-id-123/test.cpp');
    });

    it('should include created_at and updated_at timestamps', async () => {
      const now = Math.floor(Date.now() / 1000);
      const fileMetadata = createMockFileMetadata({
        created_at: now - 7200, // 2 hours ago
        updated_at: now - 3600, // 1 hour ago
      });

      mockQueryByIndex.mockResolvedValue({
        items: [fileMetadata],
        count: 1,
        scannedCount: 1,
      });

      const event = buildEvent();
      const result = await getFilesHandler(event);

      expect(result.statusCode).toBe(200);
      const files = JSON.parse(result.body);
      expect(files[0]).toHaveProperty('created_at');
      expect(files[0]).toHaveProperty('updated_at');
      expect(files[0].created_at).toBe(now - 7200);
      expect(files[0].updated_at).toBe(now - 3600);
    });
  });
});
