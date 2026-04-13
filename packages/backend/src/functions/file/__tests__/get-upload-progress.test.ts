import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../get-upload-progress';
import { getUserFromContext } from '../../../utils/auth-util';

// Mock dependencies
jest.mock('../../../utils/auth-util');
jest.mock('@aws-sdk/client-dynamodb');

const mockGetUserFromContext = getUserFromContext as jest.MockedFunction<typeof getUserFromContext>;

describe('get-upload-progress Lambda', () => {
  const mockUser = {
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    role: 'developer',
  };

  const mockProgressData = {
    file_id: 'test-file-123',
    user_id: 'test-user-123',
    file_name: 'basic_violations.c',
    file_size: 456,
    progress_percentage: 75,
    status: 'uploading' as const,
    message: 'Upload in progress...',
    created_at: Date.now() - 30000, // 30 seconds ago
    updated_at: Date.now() - 5000,  // 5 seconds ago
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetUserFromContext.mockReturnValue(mockUser);

    // Mock DynamoDB client
    const mockDynamoClient = {
      send: jest.fn().mockResolvedValue({
        Item: {
          file_id: { S: mockProgressData.file_id },
          user_id: { S: mockProgressData.user_id },
          file_name: { S: mockProgressData.file_name },
          file_size: { N: mockProgressData.file_size.toString() },
          progress_percentage: { N: mockProgressData.progress_percentage.toString() },
          status: { S: mockProgressData.status },
          message: { S: mockProgressData.message },
          created_at: { N: mockProgressData.created_at.toString() },
          updated_at: { N: mockProgressData.updated_at.toString() },
        },
      }),
    };
    require('@aws-sdk/client-dynamodb').DynamoDBClient.mockImplementation(() => mockDynamoClient);
    
    // Mock unmarshall function
    require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(mockProgressData);
    require('@aws-sdk/util-dynamodb').marshall = jest.fn().mockImplementation((obj) => obj);
  });

  const createEvent = (fileId: string): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    body: null,
    pathParameters: { fileId },
    queryStringParameters: null,
    headers: {},
    multiValueHeaders: {},
    requestContext: {} as any,
    resource: '',
    path: '',
    isBase64Encoded: false,
    stageVariables: null,
    multiValueQueryStringParameters: null,
  });

  describe('Successful requests', () => {
    it('should return upload progress for valid file ID', async () => {
      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.fileId).toBe('test-file-123');
      expect(responseBody.fileName).toBe('basic_violations.c');
      expect(responseBody.fileSize).toBe(456);
      expect(responseBody.progress.percentage).toBe(75);
      expect(responseBody.progress.status).toBe('uploading');
      expect(responseBody.progress.message).toBe('Upload in progress...');
      expect(responseBody.progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(0);
      expect(responseBody.timestamps.createdAt).toBe(mockProgressData.created_at);
      expect(responseBody.timestamps.updatedAt).toBe(mockProgressData.updated_at);
    });

    it('should handle OPTIONS request', async () => {
      const event = {
        ...createEvent('test-file-123'),
        httpMethod: 'OPTIONS',
      };

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('');
    });

    it('should return progress with error message when upload failed', async () => {
      const failedProgressData = {
        ...mockProgressData,
        status: 'failed' as const,
        progress_percentage: 0,
        message: 'Upload failed',
        error_message: 'File too large',
      };

      require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(failedProgressData);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.progress.status).toBe('failed');
      expect(responseBody.progress.percentage).toBe(0);
      expect(responseBody.error.message).toBe('File too large');
    });

    it('should calculate estimated time remaining correctly', async () => {
      const progressData = {
        ...mockProgressData,
        progress_percentage: 50,
        created_at: Date.now() - 60000, // 1 minute ago
        updated_at: Date.now() - 5000,  // 5 seconds ago
      };

      require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(progressData);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.progress.estimatedTimeRemaining).toBeGreaterThan(0);
      expect(responseBody.progress.estimatedTimeRemaining).toBeLessThanOrEqual(300); // Max 5 minutes
    });

    it('should return 0 estimated time for completed uploads', async () => {
      const completedProgressData = {
        ...mockProgressData,
        status: 'completed' as const,
        progress_percentage: 100,
        message: 'Upload completed successfully',
      };

      require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(completedProgressData);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.progress.status).toBe('completed');
      expect(responseBody.progress.estimatedTimeRemaining).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUserFromContext.mockReturnValue({ userId: '', organizationId: '', role: '' });

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when fileId parameter is missing', async () => {
      const event = createEvent('');
      event.pathParameters = null;

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('MISSING_FILE_ID');
    });

    it('should return 404 when upload progress is not found', async () => {
      // Mock DynamoDB to return no item
      const mockDynamoClient = {
        send: jest.fn().mockResolvedValue({ Item: null }),
      };
      require('@aws-sdk/client-dynamodb').DynamoDBClient.mockImplementation(() => mockDynamoClient);

      const event = createEvent('nonexistent-file');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('PROGRESS_NOT_FOUND');
    });

    it('should return 403 when user does not own the upload', async () => {
      const otherUserProgressData = {
        ...mockProgressData,
        user_id: 'other-user-456',
      };

      require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(otherUserProgressData);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(403);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin to access uploads in their organization', async () => {
      const adminUser = {
        ...mockUser,
        role: 'admin',
      };
      mockGetUserFromContext.mockReturnValue(adminUser);

      const otherUserProgressData = {
        ...mockProgressData,
        user_id: 'other-user-456',
      };

      require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(otherUserProgressData);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
    });

    it('should handle DynamoDB errors', async () => {
      // Mock DynamoDB to throw error
      const mockDynamoClient = {
        send: jest.fn().mockRejectedValue(new Error('DynamoDB error')),
      };
      require('@aws-sdk/client-dynamodb').DynamoDBClient.mockImplementation(() => mockDynamoClient);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Time estimation', () => {
    it('should estimate time based on file size when no progress yet', async () => {
      const noProgressData = {
        ...mockProgressData,
        progress_percentage: 0,
        status: 'starting' as const,
        file_size: 5 * 1024 * 1024, // 5MB file
      };

      require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(noProgressData);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.progress.estimatedTimeRemaining).toBeGreaterThanOrEqual(5);
      expect(responseBody.progress.estimatedTimeRemaining).toBeLessThanOrEqual(60);
    });

    it('should cap estimated time at reasonable limits', async () => {
      const slowProgressData = {
        ...mockProgressData,
        progress_percentage: 1, // Very slow progress
        created_at: Date.now() - 300000, // 5 minutes ago
        updated_at: Date.now() - 5000,
      };

      require('@aws-sdk/util-dynamodb').unmarshall = jest.fn().mockReturnValue(slowProgressData);

      const event = createEvent('test-file-123');

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.progress.estimatedTimeRemaining).toBeLessThanOrEqual(300); // Max 5 minutes
    });
  });
});