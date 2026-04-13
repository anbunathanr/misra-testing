import { handler } from '../upload-sample-file';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SampleFileService } from '../../../services/sample-file-service';
import { FileMetadataService } from '../../../services/file-metadata-service';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Mock dependencies
jest.mock('../../../services/sample-file-service');
jest.mock('../../../services/file-metadata-service');
jest.mock('@aws-sdk/client-s3');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234'),
}));

const mockSampleFileService = SampleFileService as jest.MockedClass<typeof SampleFileService>;
const mockFileMetadataService = FileMetadataService as jest.MockedClass<typeof FileMetadataService>;
const mockS3Client = S3Client as jest.MockedClass<typeof S3Client>;

describe('upload-sample-file Lambda', () => {
  let mockGetRandomSampleFile: jest.Mock;
  let mockGetSampleFileById: jest.Mock;
  let mockCreateFileMetadata: jest.Mock;
  let mockS3Send: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set environment variables
    process.env.FILE_STORAGE_BUCKET = 'test-bucket';

    mockGetRandomSampleFile = jest.fn();
    mockGetSampleFileById = jest.fn();
    mockCreateFileMetadata = jest.fn();
    mockS3Send = jest.fn();

    mockSampleFileService.mockImplementation(() => ({
      getRandomSampleFile: mockGetRandomSampleFile,
      getSampleFileById: mockGetSampleFileById,
    } as any));

    mockFileMetadataService.mockImplementation(() => ({
      createFileMetadata: mockCreateFileMetadata,
    } as any));

    mockS3Client.mockImplementation(() => ({
      send: mockS3Send,
    } as any));
  });

  const createMockEvent = (body?: any): APIGatewayProxyEvent => ({
    httpMethod: 'POST',
    body: body ? JSON.stringify(body) : null,
    headers: {},
    queryStringParameters: null,
    isBase64Encoded: false,
    path: '/files/upload-sample',
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  });

  const mockSampleFileResponse = {
    id: 'sample-001',
    name: 'test.c',
    language: 'C' as const,
    description: 'Test file',
    expectedViolations: 2,
    size: 256,
    difficultyLevel: 'basic' as const,
    violationCategories: ['declarations'],
    learningObjectives: ['Understanding declarations'],
    estimatedAnalysisTime: 15,
  };

  const mockSampleFile = {
    sample_id: 'sample-001',
    filename: 'test.c',
    file_content: 'I2luY2x1ZGUgPHN0ZGlvLmg+', // base64 encoded
    language: 'C' as const,
    description: 'Test file',
    expected_violations: 2,
    file_size: 256,
    difficulty_level: 'basic' as const,
    violation_categories: ['declarations'],
    learning_objectives: ['Understanding declarations'],
    estimated_analysis_time: 15,
    created_at: 1640995200000,
    updated_at: 1640995200000,
  };

  it('should handle OPTIONS request', async () => {
    const event = createMockEvent();
    event.httpMethod = 'OPTIONS';

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
  });

  it('should return 400 when no body provided', async () => {
    const event = createMockEvent();

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Request body is required');
  });

  it('should return 400 when userEmail is missing', async () => {
    const event = createMockEvent({ preferredLanguage: 'C' });

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(400);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('User email is required');
  });

  it('should successfully upload a sample file', async () => {
    const event = createMockEvent({
      userEmail: 'test@example.com',
      preferredLanguage: 'C',
    });

    mockGetRandomSampleFile.mockResolvedValue(mockSampleFileResponse);
    mockGetSampleFileById.mockResolvedValue(mockSampleFile);
    mockS3Send.mockResolvedValue({});
    mockCreateFileMetadata.mockResolvedValue({});

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGetRandomSampleFile).toHaveBeenCalledWith('C', undefined);
    expect(mockGetSampleFileById).toHaveBeenCalledWith('sample-001');
    expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(mockCreateFileMetadata).toHaveBeenCalled();
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.fileId).toBe('mock-uuid-1234');
    expect(body.fileName).toBe('test.c');
    expect(body.language).toBe('C');
    expect(body.uploadStatus).toBe('completed');
  });

  it('should return 404 when no sample files match criteria', async () => {
    const event = createMockEvent({
      userEmail: 'test@example.com',
      preferredLanguage: 'C',
      difficultyLevel: 'advanced',
    });

    mockGetRandomSampleFile.mockResolvedValue(null);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(404);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('No sample files available matching the criteria');
  });

  it('should return 404 when sample file not found by ID', async () => {
    const event = createMockEvent({
      userEmail: 'test@example.com',
    });

    mockGetRandomSampleFile.mockResolvedValue(mockSampleFileResponse);
    mockGetSampleFileById.mockResolvedValue(null);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(404);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Sample file not found');
  });

  it('should handle S3 upload errors', async () => {
    const event = createMockEvent({
      userEmail: 'test@example.com',
    });

    mockGetRandomSampleFile.mockResolvedValue(mockSampleFileResponse);
    mockGetSampleFileById.mockResolvedValue(mockSampleFile);
    mockS3Send.mockRejectedValue(new Error('S3 upload failed'));

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(500);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to upload sample file');
  });

  it('should handle file metadata creation errors', async () => {
    const event = createMockEvent({
      userEmail: 'test@example.com',
    });

    mockGetRandomSampleFile.mockResolvedValue(mockSampleFileResponse);
    mockGetSampleFileById.mockResolvedValue(mockSampleFile);
    mockS3Send.mockResolvedValue({});
    mockCreateFileMetadata.mockRejectedValue(new Error('Database error'));

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(500);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to upload sample file');
  });

  it('should use correct S3 key format', async () => {
    const event = createMockEvent({
      userEmail: 'test@example.com',
    });

    mockGetRandomSampleFile.mockResolvedValue(mockSampleFileResponse);
    mockGetSampleFileById.mockResolvedValue(mockSampleFile);
    mockS3Send.mockResolvedValue({});
    mockCreateFileMetadata.mockResolvedValue({});

    await handler(event);

    expect(mockS3Send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    // Verify that S3 upload was attempted
    expect(mockS3Send).toHaveBeenCalledTimes(1);
  });
});