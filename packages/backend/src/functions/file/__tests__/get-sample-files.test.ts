import { handler } from '../get-sample-files';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SampleFileService } from '../../../services/sample-file-service';

// Mock the SampleFileService
jest.mock('../../../services/sample-file-service');

const mockSampleFileService = SampleFileService as jest.MockedClass<typeof SampleFileService>;

describe('get-sample-files Lambda', () => {
  let mockGetAllSampleFiles: jest.Mock;
  let mockGetSampleFilesByLanguage: jest.Mock;
  let mockGetSampleFilesByDifficulty: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetAllSampleFiles = jest.fn();
    mockGetSampleFilesByLanguage = jest.fn();
    mockGetSampleFilesByDifficulty = jest.fn();

    mockSampleFileService.mockImplementation(() => ({
      getAllSampleFiles: mockGetAllSampleFiles,
      getSampleFilesByLanguage: mockGetSampleFilesByLanguage,
      getSampleFilesByDifficulty: mockGetSampleFilesByDifficulty,
    } as any));
  });

  const createMockEvent = (queryParams?: Record<string, string>): APIGatewayProxyEvent => ({
    httpMethod: 'GET',
    queryStringParameters: queryParams || null,
    headers: {},
    body: null,
    isBase64Encoded: false,
    path: '/files/samples',
    pathParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  });

  const mockSampleFiles = [
    {
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
    },
  ];

  it('should handle OPTIONS request', async () => {
    const event = createMockEvent();
    event.httpMethod = 'OPTIONS';

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
  });

  it('should return all sample files when no filters provided', async () => {
    const event = createMockEvent();
    mockGetAllSampleFiles.mockResolvedValue(mockSampleFiles);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGetAllSampleFiles).toHaveBeenCalled();
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.samples).toEqual(mockSampleFiles);
    expect(body.count).toBe(1);
  });

  it('should filter by language only', async () => {
    const event = createMockEvent({ language: 'C' });
    mockGetSampleFilesByLanguage.mockResolvedValue(mockSampleFiles);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGetSampleFilesByLanguage).toHaveBeenCalledWith('C');
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.samples).toEqual(mockSampleFiles);
  });

  it('should filter by difficulty only', async () => {
    const event = createMockEvent({ difficulty: 'basic' });
    mockGetSampleFilesByDifficulty.mockResolvedValue(mockSampleFiles);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGetSampleFilesByDifficulty).toHaveBeenCalledWith('basic');
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.samples).toEqual(mockSampleFiles);
  });

  it('should filter by both language and difficulty', async () => {
    const event = createMockEvent({ language: 'CPP', difficulty: 'advanced' });
    mockGetSampleFilesByLanguage.mockResolvedValue(mockSampleFiles);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(mockGetSampleFilesByLanguage).toHaveBeenCalledWith('CPP');
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
  });

  it('should handle service errors', async () => {
    const event = createMockEvent();
    mockGetAllSampleFiles.mockRejectedValue(new Error('Database error'));

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(500);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to retrieve sample files');
  });

  it('should return empty array when no files found', async () => {
    const event = createMockEvent();
    mockGetAllSampleFiles.mockResolvedValue([]);

    const result: APIGatewayProxyResult = await handler(event);

    expect(result.statusCode).toBe(200);
    
    const body = JSON.parse(result.body);
    expect(body.success).toBe(true);
    expect(body.samples).toEqual([]);
    expect(body.count).toBe(0);
  });
});