import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../get-suite-results';
import { testExecutionDBService } from '../../../services/test-execution-db-service';

// Mock the database service
jest.mock('../../../services/test-execution-db-service');

describe('Get Suite Results Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockEvent = (suiteExecutionId?: string): APIGatewayProxyEvent => ({
    pathParameters: suiteExecutionId ? { suiteExecutionId } : null,
    body: null,
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'GET',
    isBase64Encoded: false,
    path: `/api/executions/suites/${suiteExecutionId}`,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: '',
  });

  const createMockExecution = (overrides: any = {}) => ({
    executionId: 'exec-123',
    projectId: 'proj-123',
    testCaseId: 'test-123',
    testSuiteId: 'suite-123',
    suiteExecutionId: 'suite-exec-123',
    status: 'completed',
    result: 'pass',
    startTime: '2024-01-01T10:00:00Z',
    endTime: '2024-01-01T10:01:00Z',
    duration: 60000,
    steps: [],
    screenshots: [],
    metadata: {
      triggeredBy: 'user-123',
    },
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:01:00Z',
    ...overrides,
  });

  describe('Success Cases', () => {
    it('should return suite execution results with aggregate statistics', async () => {
      const suiteExecutionId = 'suite-exec-123';
      const mockExecutions = [
        createMockExecution({ executionId: 'exec-1', result: 'pass', duration: 30000 }),
        createMockExecution({ executionId: 'exec-2', result: 'pass', duration: 40000 }),
        createMockExecution({ executionId: 'exec-3', result: 'fail', duration: 20000 }),
      ];

      (testExecutionDBService.getExecutionsBySuiteExecutionId as jest.Mock).mockResolvedValue(mockExecutions);

      const event = createMockEvent(suiteExecutionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.suiteExecutionId).toBe(suiteExecutionId);
      expect(body.stats).toEqual({
        total: 3,
        passed: 2,
        failed: 1,
        errors: 0,
        duration: 90000,
      });
      expect(body.testCaseExecutions).toHaveLength(3);
      expect(body.status).toBe('completed');
    });

    it('should calculate suite status as running when tests are in progress', async () => {
      const suiteExecutionId = 'suite-exec-123';
      const mockExecutions = [
        createMockExecution({ executionId: 'exec-1', status: 'completed', result: 'pass' }),
        createMockExecution({ executionId: 'exec-2', status: 'running', result: undefined }),
        createMockExecution({ executionId: 'exec-3', status: 'queued', result: undefined }),
      ];

      (testExecutionDBService.getExecutionsBySuiteExecutionId as jest.Mock).mockResolvedValue(mockExecutions);

      const event = createMockEvent(suiteExecutionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.status).toBe('running');
    });

    it('should calculate suite status as error when tests have errors', async () => {
      const suiteExecutionId = 'suite-exec-123';
      const mockExecutions = [
        createMockExecution({ executionId: 'exec-1', status: 'completed', result: 'pass' }),
        createMockExecution({ executionId: 'exec-2', status: 'error', result: 'error' }),
      ];

      (testExecutionDBService.getExecutionsBySuiteExecutionId as jest.Mock).mockResolvedValue(mockExecutions);

      const event = createMockEvent(suiteExecutionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.status).toBe('error');
      expect(body.stats.errors).toBe(1);
    });

    it('should include suite timing information', async () => {
      const suiteExecutionId = 'suite-exec-123';
      const mockExecutions = [
        createMockExecution({ 
          executionId: 'exec-1', 
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T10:01:00Z',
        }),
        createMockExecution({ 
          executionId: 'exec-2', 
          startTime: '2024-01-01T10:00:30Z',
          endTime: '2024-01-01T10:02:00Z',
        }),
      ];

      (testExecutionDBService.getExecutionsBySuiteExecutionId as jest.Mock).mockResolvedValue(mockExecutions);

      const event = createMockEvent(suiteExecutionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      
      const body = JSON.parse(result.body);
      expect(body.startTime).toBe('2024-01-01T10:00:00.000Z'); // Earliest start
      expect(body.endTime).toBe('2024-01-01T10:02:00.000Z'); // Latest end
      expect(body.duration).toBeGreaterThan(0);
    });
  });

  describe('Error Cases', () => {
    it('should return 400 when suiteExecutionId is missing', async () => {
      const event = createMockEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Missing suiteExecutionId parameter');
    });

    it('should return 404 when suite execution not found', async () => {
      const suiteExecutionId = 'non-existent';
      (testExecutionDBService.getExecutionsBySuiteExecutionId as jest.Mock).mockResolvedValue([]);

      const event = createMockEvent(suiteExecutionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(404);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Suite execution not found');
    });

    it('should return 500 on database error', async () => {
      const suiteExecutionId = 'suite-exec-123';
      (testExecutionDBService.getExecutionsBySuiteExecutionId as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const event = createMockEvent(suiteExecutionId);
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toBe('Database connection failed');
    });
  });

  describe('CORS Headers', () => {
    it('should include CORS headers in all responses', async () => {
      const event = createMockEvent();
      const result = await handler(event);

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
    });
  });
});
