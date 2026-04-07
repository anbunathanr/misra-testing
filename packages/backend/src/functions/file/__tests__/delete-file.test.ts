/**
 * Unit tests for DELETE /files/:fileId endpoint
 */

import { APIGatewayProxyEvent } from 'aws-lambda';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { FileType, AnalysisStatus } from '../../../types/file-metadata';

// Mock the S3 client
const s3Mock = mockClient(S3Client);

// Set up mocks before imports
const mockGetFileMetadata = jest.fn();
const mockDeleteFileMetadata = jest.fn();
const mockGetUserFromContext = jest.fn();

jest.mock('../../../services/file-metadata-service', () => ({
  FileMetadataService: jest.fn().mockImplementation(() => ({
    getFileMetadata: mockGetFileMetadata,
    deleteFileMetadata: mockDeleteFileMetadata,
  })),
}));

jest.mock('../../../utils/auth-util', () => ({
  getUserFromContext: mockGetUserFromContext,
}));

jest.mock('../../../database/dynamodb-client', () => ({
  DynamoDBClientWrapper: jest.fn().mockImplementation(() => ({})),
}));

import { handler } from '../delete-file';

describe('DELETE /files/:fileId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    s3Mock.reset();
  });

  const createMockEvent = (fileId: string, userId: string, role: string = 'user'): Partial<APIGatewayProxyEvent> => ({
    pathParameters: { fileId },
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
          'custom:organizationId': 'org-123',
          'custom:role': role,
        },
      },
    } as any,
  });

  it('should delete file successfully when user owns the file', async () => {
    const fileId = 'file-123';
    const userId = 'user-123';
    const s3Key = 'uploads/org-123/user-123/file.c';

    // Mock user context
    mockGetUserFromContext.mockReturnValue({
      userId,
      organizationId: 'org-123',
      role: 'user',
    });

    // Mock file metadata
    const mockFileMetadata = {
      file_id: fileId,
      user_id: userId,
      organization_id: 'org-123',
      filename: 'test.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: Date.now(),
      analysis_status: AnalysisStatus.COMPLETED,
      s3_key: s3Key,
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    mockGetFileMetadata.mockResolvedValue(mockFileMetadata);
    mockDeleteFileMetadata.mockResolvedValue(undefined);

    // Mock S3 delete
    s3Mock.on(DeleteObjectCommand).resolves({});

    const event = createMockEvent(fileId, userId);
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      message: 'File deleted successfully',
      fileId,
      timestamp: expect.any(String),
    });

    expect(mockGetFileMetadata).toHaveBeenCalledWith(fileId);
    expect(mockDeleteFileMetadata).toHaveBeenCalledWith(fileId, userId);
    expect(s3Mock.calls()).toHaveLength(1);
  });

  it('should return 401 when user is not authenticated', async () => {
    mockGetUserFromContext.mockReturnValue({ userId: null });

    const event = createMockEvent('file-123', '');
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body).error.code).toBe('UNAUTHORIZED');
  });

  it('should return 400 when fileId is missing', async () => {
    mockGetUserFromContext.mockReturnValue({
      userId: 'user-123',
      organizationId: 'org-123',
      role: 'user',
    });

    const event = {
      pathParameters: {},
      requestContext: {
        authorizer: {
          claims: {
            sub: 'user-123',
          },
        },
      } as any,
    };

    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).error.code).toBe('INVALID_REQUEST');
  });

  it('should return 404 when file does not exist', async () => {
    const fileId = 'nonexistent-file';
    const userId = 'user-123';

    mockGetUserFromContext.mockReturnValue({
      userId,
      organizationId: 'org-123',
      role: 'user',
    });

    mockGetFileMetadata.mockResolvedValue(null);

    const event = createMockEvent(fileId, userId);
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body).error.code).toBe('FILE_NOT_FOUND');
  });

  it('should return 403 when user does not own the file', async () => {
    const fileId = 'file-123';
    const userId = 'user-123';
    const fileOwnerId = 'user-456';

    mockGetUserFromContext.mockReturnValue({
      userId,
      organizationId: 'org-123',
      role: 'user',
    });

    const mockFileMetadata = {
      file_id: fileId,
      user_id: fileOwnerId, // Different owner
      organization_id: 'org-123',
      filename: 'test.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: Date.now(),
      analysis_status: AnalysisStatus.COMPLETED,
      s3_key: 'uploads/org-123/user-456/file.c',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    mockGetFileMetadata.mockResolvedValue(mockFileMetadata);

    const event = createMockEvent(fileId, userId);
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error.code).toBe('FORBIDDEN');
  });

  it('should allow admin to delete files in their organization', async () => {
    const fileId = 'file-123';
    const adminUserId = 'admin-123';
    const fileOwnerId = 'user-456';
    const organizationId = 'org-123';

    mockGetUserFromContext.mockReturnValue({
      userId: adminUserId,
      organizationId,
      role: 'admin',
    });

    const mockFileMetadata = {
      file_id: fileId,
      user_id: fileOwnerId,
      organization_id: organizationId,
      filename: 'test.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: Date.now(),
      analysis_status: AnalysisStatus.COMPLETED,
      s3_key: 'uploads/org-123/user-456/file.c',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    mockGetFileMetadata.mockResolvedValue(mockFileMetadata);
    mockDeleteFileMetadata.mockResolvedValue(undefined);

    s3Mock.on(DeleteObjectCommand).resolves({});

    const event = createMockEvent(fileId, adminUserId, 'admin');
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe('File deleted successfully');
  });

  it('should not allow admin to delete files from other organizations', async () => {
    const fileId = 'file-123';
    const adminUserId = 'admin-123';
    const fileOwnerId = 'user-456';

    mockGetUserFromContext.mockReturnValue({
      userId: adminUserId,
      organizationId: 'org-123',
      role: 'admin',
    });

    const mockFileMetadata = {
      file_id: fileId,
      user_id: fileOwnerId,
      organization_id: 'org-456', // Different organization
      filename: 'test.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: Date.now(),
      analysis_status: AnalysisStatus.COMPLETED,
      s3_key: 'uploads/org-456/user-456/file.c',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    mockGetFileMetadata.mockResolvedValue(mockFileMetadata);

    const event = createMockEvent(fileId, adminUserId, 'admin');
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(403);
    expect(JSON.parse(result.body).error.code).toBe('FORBIDDEN');
  });

  it('should continue with DynamoDB deletion even if S3 deletion fails', async () => {
    const fileId = 'file-123';
    const userId = 'user-123';

    mockGetUserFromContext.mockReturnValue({
      userId,
      organizationId: 'org-123',
      role: 'user',
    });

    const mockFileMetadata = {
      file_id: fileId,
      user_id: userId,
      organization_id: 'org-123',
      filename: 'test.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: Date.now(),
      analysis_status: AnalysisStatus.COMPLETED,
      s3_key: 'uploads/org-123/user-123/file.c',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    mockGetFileMetadata.mockResolvedValue(mockFileMetadata);
    mockDeleteFileMetadata.mockResolvedValue(undefined);

    // Mock S3 delete to fail
    s3Mock.on(DeleteObjectCommand).rejects(new Error('S3 error'));

    const event = createMockEvent(fileId, userId);
    const result = await handler(event as APIGatewayProxyEvent);

    // Should still succeed because DynamoDB deletion succeeded
    expect(result.statusCode).toBe(200);
    expect(mockDeleteFileMetadata).toHaveBeenCalledWith(fileId, userId);
  });

  it('should return 500 when DynamoDB deletion fails', async () => {
    const fileId = 'file-123';
    const userId = 'user-123';

    mockGetUserFromContext.mockReturnValue({
      userId,
      organizationId: 'org-123',
      role: 'user',
    });

    const mockFileMetadata = {
      file_id: fileId,
      user_id: userId,
      organization_id: 'org-123',
      filename: 'test.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: Date.now(),
      analysis_status: AnalysisStatus.COMPLETED,
      s3_key: 'uploads/org-123/user-123/file.c',
      created_at: Date.now(),
      updated_at: Date.now(),
    };

    mockGetFileMetadata.mockResolvedValue(mockFileMetadata);
    mockDeleteFileMetadata.mockRejectedValue(new Error('DynamoDB error'));

    s3Mock.on(DeleteObjectCommand).resolves({});

    const event = createMockEvent(fileId, userId);
    const result = await handler(event as APIGatewayProxyEvent);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
