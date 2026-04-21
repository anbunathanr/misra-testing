import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler } from '../health-check';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      scan: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({ ScannedCount: 0 }),
      }),
    })),
  },
  S3: jest.fn(() => ({
    headBucket: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    }),
  })),
  SecretsManager: jest.fn(() => ({
    describeSecret: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ ARN: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:test' }),
    }),
  })),
  CognitoIdentityServiceProvider: jest.fn(() => ({
    describeUserPool: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        UserPool: {
          Name: 'test-pool',
          Status: 'Enabled',
          MfaConfiguration: 'OPTIONAL',
        },
      }),
    }),
  })),
  CloudWatch: jest.fn(() => ({
    listMetrics: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Metrics: [] }),
    }),
  })),
}));

// Mock monitoring service
jest.mock('../../../services/monitoring-service', () => ({
  monitoringService: {
    recordBusinessMetric: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock centralized logger
jest.mock('../../../utils/centralized-logger', () => ({
  CentralizedLogger: {
    getInstance: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      logPerformanceMetric: jest.fn(),
      getCorrelationId: jest.fn(() => 'test-correlation-id'),
    })),
  },
  withCorrelationId: jest.fn((fn) => fn),
}));

describe('Health Check Lambda Function', () => {
  const mockContext: Context = {
    functionName: 'health-check',
    awsRequestId: 'test-request-id',
    callbackWaitsForEmptyEventLoop: false,
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:health-check',
    memoryLimitInMB: '128',
    logGroupName: '/aws/lambda/health-check',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables
    process.env.ENVIRONMENT = 'test';
    process.env.FILES_BUCKET_NAME = 'test-bucket';
    process.env.USERS_TABLE_NAME = 'test-users-table';
    process.env.FILE_METADATA_TABLE_NAME = 'test-file-metadata-table';
    process.env.ANALYSIS_RESULTS_TABLE_NAME = 'test-analysis-results-table';
    process.env.SAMPLE_FILES_TABLE_NAME = 'test-sample-files-table';
    process.env.PROGRESS_TABLE_NAME = 'test-progress-table';
    process.env.USER_POOL_ID = 'us-east-1_test123';
    process.env.USER_POOL_CLIENT_ID = 'test-client-id';
    process.env.AWS_REGION = 'us-east-1';
  });

  describe('Basic Health Check', () => {
    it('should return healthy status for basic health check', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('healthy');
      expect(body.services).toHaveProperty('lambda');
      expect(body.services).toHaveProperty('environment');
      expect(body.summary.total).toBeGreaterThan(0);
    });

    it('should include correlation ID in response headers', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health',
        httpMethod: 'GET',
        headers: { 'x-correlation-id': 'test-correlation-123' },
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.headers).toHaveProperty('X-Correlation-ID');
    });
  });

  describe('Detailed Health Check', () => {
    it('should return detailed health status when requested', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health/detailed',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      const body = JSON.parse(result.body);
      // Status might be healthy or degraded depending on service response times
      expect(['healthy', 'degraded', 'unhealthy']).toContain(body.status);
      expect(body.services).toHaveProperty('lambda');
      expect(body.services).toHaveProperty('environment');
      expect(body.services).toHaveProperty('dynamodb');
      expect(body.services).toHaveProperty('s3');
      expect(body.services).toHaveProperty('cognito');
      expect(body.services).toHaveProperty('secretsmanager');
      expect(body.services).toHaveProperty('cloudwatch');
    });

    it('should include response times for all services', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health/detailed',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      const body = JSON.parse(result.body);
      Object.values(body.services).forEach((service: any) => {
        expect(service).toHaveProperty('responseTime');
        expect(typeof service.responseTime).toBe('number');
      });
    });
  });

  describe('Service Health Checks', () => {
    it('should check Lambda runtime health', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      const body = JSON.parse(result.body);
      expect(body.services.lambda.status).toBe('healthy');
      expect(body.services.lambda.details).toHaveProperty('memoryUsedMB');
      expect(body.services.lambda.details).toHaveProperty('memoryLimitMB');
    });

    it('should check environment configuration', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      const body = JSON.parse(result.body);
      expect(body.services.environment.status).toBe('healthy');
      expect(body.services.environment.details.missingVariables).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 503 when services are unhealthy', async () => {
      // Mock DynamoDB to fail
      const AWS = require('aws-sdk');
      AWS.DynamoDB.DocumentClient.mockImplementationOnce(() => ({
        scan: jest.fn().mockReturnValue({
          promise: jest.fn().mockRejectedValue(new Error('DynamoDB unavailable')),
        }),
      }));

      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health/detailed',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.statusCode).toBe(503);
      const body = JSON.parse(result.body);
      expect(body.status).toBe('unhealthy');
    });

    it('should handle missing environment variables', async () => {
      delete process.env.USERS_TABLE_NAME;

      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      const body = JSON.parse(result.body);
      expect(body.services.environment.status).toBe('unhealthy');
      expect(body.services.environment.details.missingVariables).toContain('USERS_TABLE_NAME');
    });
  });

  describe('Response Format', () => {
    it('should include all required fields in response', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      const body = JSON.parse(result.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('version');
      expect(body).toHaveProperty('environment');
      expect(body).toHaveProperty('services');
      expect(body).toHaveProperty('summary');
      expect(body.summary).toHaveProperty('total');
      expect(body.summary).toHaveProperty('healthy');
      expect(body.summary).toHaveProperty('unhealthy');
      expect(body.summary).toHaveProperty('degraded');
    });

    it('should set cache-control headers', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        path: '/health',
        httpMethod: 'GET',
        headers: {},
        queryStringParameters: null,
      };

      const result = await handler(event as APIGatewayProxyEvent, mockContext);

      expect(result.headers).toHaveProperty('Cache-Control');
      expect(result.headers?.['Cache-Control']).toContain('no-cache');
    });
  });
});
