import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { handler } from '../upload-sample-with-progress';
import { SampleFileService } from '../../../services/sample-file-service';
import { UploadProgressService } from '../../../services/upload-progress-service';
import { getUserFromContext } from '../../../utils/auth-util';

// Mock dependencies
jest.mock('../../../services/sample-file-service');
jest.mock('../../../services/upload-progress-service');
jest.mock('../../../utils/auth-util');
jest.mock('@aws-sdk/client-s3');
jest.mock('@aws-sdk/client-dynamodb');

const mockSampleFileService = SampleFileService as jest.MockedClass<typeof SampleFileService>;
const mockUploadProgressService = UploadProgressService as jest.MockedClass<typeof UploadProgressService>;
const mockGetUserFromContext = getUserFromContext as jest.MockedFunction<typeof getUserFromContext>;

describe('upload-sample-with-progress Lambda', () => {
  const mockUser = {
    userId: 'test-user-123',
    organizationId: 'test-org-456',
    role: 'developer',
  };

  const mockSampleFile = {
    sample_id: 'sample-c-basic',
    filename: 'basic_violations.c',
    file_content: Buffer.from('test content').toString('base64'),
    language: 'C' as const,
    description: 'Basic C file with MISRA violations',
    expected_violations: 3,
    file_size: 456,
    difficulty_level: 'basic' as const,
    created_at: Date.now(),
    updated_at: Date.now(),
    violation_categories: ['declarations'],
    learning_objectives: ['Learn basic MISRA rules'],
    estimated_analysis_time: 30,
  };

  const mockSelectedSample = {
    id: 'sample-c-basic',
    name: 'basic_violations.c',
    language: 'C' as const,
    description: 'Basic C file with MISRA violations',
    expectedViolations: 3,
    size: 456,
    difficultyLevel: 'basic' as const,
    violationCategories: ['declarations'],
    learningObjectives: ['Learn basic MISRA rules'],
    estimatedAnalysisTime: 30,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockGetUserFromContext.mockReturnValue(mockUser);
    
    const mockSampleFileServiceInstance = {
      getRandomSampleFile: jest.fn().mockResolvedValue(mockSelectedSample),
      getSampleFileById: jest.fn().mockResolvedValue(mockSampleFile),
    };
    mockSampleFileService.mockImplementation(() => mockSampleFileServiceInstance as any);

    const mockUploadProgressServiceInstance = {
      createUploadProgress: jest.fn().mockResolvedValue(undefined),
      updateUploadProgress: jest.fn().mockResolvedValue(undefined),
      markUploadCompleted: jest.fn().mockResolvedValue(undefined),
      markUploadFailed: jest.fn().mockResolvedValue(undefined),
    };
    mockUploadProgressService.mockImplementation(() => mockUploadProgressServiceInstance as any);

    // Mock S3 client
    const mockS3Client = {
      send: jest.fn().mockResolvedValue({}),
    };
    require('@aws-sdk/client-s3').S3Client.mockImplementation(() => mockS3Client);

    // Mock DynamoDB client
    const mockDynamoClient = {
      send: jest.fn().mockResolvedValue({}),
    };
    require('@aws-sdk/client-dynamodb').DynamoDBClient.mockImplementation(() => mockDynamoClient);
  });

  const createEvent = (body: any): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    body: JSON.stringify(body),
    pathParameters: null,
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

  describe('Successful upload', () => {
    it('should upload sample file with progress tracking', async () => {
      const event = createEvent({
        userEmail: 'test@example.com',
        preferredLanguage: 'C',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(true);
      expect(responseBody.message).toBe('Sample file uploaded successfully');
      expect(responseBody.fileId).toBeDefined();
      expect(responseBody.fileName).toBe('basic_violations.c');
      expect(responseBody.language).toBe('C');
      expect(responseBody.uploadStatus).toBe('completed');

      // Verify progress tracking was called
      const uploadProgressService = new UploadProgressService();
      expect(uploadProgressService.createUploadProgress).toHaveBeenCalledWith(
        expect.any(String),
        mockUser.userId,
        'basic_violations.c',
        456
      );
      expect(uploadProgressService.updateUploadProgress).toHaveBeenCalledTimes(3); // 25%, 50%, 75%
      expect(uploadProgressService.markUploadCompleted).toHaveBeenCalledWith(
        expect.any(String),
        'Sample file uploaded successfully'
      );
    });

    it('should handle OPTIONS request', async () => {
      const event = {
        ...createEvent({}),
        httpMethod: 'OPTIONS',
      };

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(result.body).toBe('');
    });
  });

  describe('Error handling', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetUserFromContext.mockReturnValue({ userId: '', organizationId: '', role: '' });

      const event = createEvent({
        userEmail: 'test@example.com',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(401);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 400 when request body is missing', async () => {
      const event = {
        ...createEvent({}),
        body: null,
      };

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('MISSING_BODY');
    });

    it('should return 400 when userEmail is missing', async () => {
      const event = createEvent({
        preferredLanguage: 'C',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('MISSING_EMAIL');
    });

    it('should return 404 when no sample files are available', async () => {
      const mockSampleFileServiceInstance = {
        getRandomSampleFile: jest.fn().mockResolvedValue(null),
        getSampleFileById: jest.fn().mockResolvedValue(mockSampleFile),
      };
      mockSampleFileService.mockImplementation(() => mockSampleFileServiceInstance as any);

      const event = createEvent({
        userEmail: 'test@example.com',
        preferredLanguage: 'CPP',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('NO_SAMPLES_AVAILABLE');
    });

    it('should return 404 when sample file content is not found', async () => {
      const mockSampleFileServiceInstance = {
        getRandomSampleFile: jest.fn().mockResolvedValue(mockSelectedSample),
        getSampleFileById: jest.fn().mockResolvedValue(null),
      };
      mockSampleFileService.mockImplementation(() => mockSampleFileServiceInstance as any);

      const event = createEvent({
        userEmail: 'test@example.com',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('SAMPLE_NOT_FOUND');
    });

    it('should handle file size validation', async () => {
      // Create a large file that exceeds 10MB limit
      const largeSampleFile = {
        ...mockSampleFile,
        file_content: Buffer.alloc(11 * 1024 * 1024).toString('base64'), // 11MB
        file_size: 11 * 1024 * 1024,
      };

      const mockSampleFileServiceInstance = {
        getRandomSampleFile: jest.fn().mockResolvedValue(mockSelectedSample),
        getSampleFileById: jest.fn().mockResolvedValue(largeSampleFile),
      };
      mockSampleFileService.mockImplementation(() => mockSampleFileServiceInstance as any);

      const event = createEvent({
        userEmail: 'test@example.com',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('FILE_TOO_LARGE');

      // Verify upload was marked as failed
      const uploadProgressService = new UploadProgressService();
      expect(uploadProgressService.markUploadFailed).toHaveBeenCalledWith(
        expect.any(String),
        'File too large (max 10MB)'
      );
    });

    it('should handle invalid file type validation', async () => {
      const invalidSampleFile = {
        ...mockSampleFile,
        filename: 'test.txt', // Invalid extension
      };

      const mockSampleFileServiceInstance = {
        getRandomSampleFile: jest.fn().mockResolvedValue({
          ...mockSelectedSample,
          name: 'test.txt',
        }),
        getSampleFileById: jest.fn().mockResolvedValue(invalidSampleFile),
      };
      mockSampleFileService.mockImplementation(() => mockSampleFileServiceInstance as any);

      const event = createEvent({
        userEmail: 'test@example.com',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('INVALID_FILE_TYPE');

      // Verify upload was marked as failed
      const uploadProgressService = new UploadProgressService();
      expect(uploadProgressService.markUploadFailed).toHaveBeenCalledWith(
        expect.any(String),
        'Invalid file type: .txt'
      );
    });

    it('should handle S3 upload errors', async () => {
      // Mock S3 client to throw error
      const mockS3Client = {
        send: jest.fn().mockRejectedValue(new Error('S3 upload failed')),
      };
      require('@aws-sdk/client-s3').S3Client.mockImplementation(() => mockS3Client);

      const event = createEvent({
        userEmail: 'test@example.com',
      });

      const result: APIGatewayProxyResult = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const responseBody = JSON.parse(result.body);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('UPLOAD_FAILED');
      expect(responseBody.error.message).toContain('S3 upload failed');
    });
  });

  describe('Progress tracking', () => {
    it('should track progress through all stages', async () => {
      const event = createEvent({
        userEmail: 'test@example.com',
      });

      await handler(event);

      const uploadProgressService = new UploadProgressService();
      
      // Verify progress was tracked at each stage
      expect(uploadProgressService.updateUploadProgress).toHaveBeenCalledWith(
        expect.any(String),
        {
          progress_percentage: 25,
          status: 'uploading',
          message: 'Uploading to S3...',
        }
      );

      expect(uploadProgressService.updateUploadProgress).toHaveBeenCalledWith(
        expect.any(String),
        {
          progress_percentage: 50,
          status: 'uploading',
          message: 'File validated, uploading...',
        }
      );

      expect(uploadProgressService.updateUploadProgress).toHaveBeenCalledWith(
        expect.any(String),
        {
          progress_percentage: 75,
          status: 'uploading',
          message: 'Upload complete, creating metadata...',
        }
      );

      expect(uploadProgressService.markUploadCompleted).toHaveBeenCalledWith(
        expect.any(String),
        'Sample file uploaded successfully'
      );
    });
  });
});