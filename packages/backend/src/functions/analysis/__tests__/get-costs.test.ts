import { handler, setCostTracker } from '../get-costs';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { CostTracker } from '../../../services/misra-analysis/cost-tracker';

describe('GET /analysis/costs', () => {
  let mockAggregateByUser: jest.Mock;
  let mockAggregateByOrganization: jest.Mock;
  let mockCostTracker: Partial<CostTracker>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAggregateByUser = jest.fn();
    mockAggregateByOrganization = jest.fn();

    mockCostTracker = {
      aggregateCostsByUser: mockAggregateByUser,
      aggregateCostsByOrganization: mockAggregateByOrganization,
    };

    // Inject mock cost tracker
    setCostTracker(mockCostTracker as CostTracker);
  });

  afterEach(() => {
    // Reset cost tracker after each test
    setCostTracker(null);
  });

  const createEvent = (
    queryParams?: Record<string, string>,
    userId: string = 'user-123',
    organizationId: string = 'org-456'
  ): APIGatewayProxyEvent => ({
    queryStringParameters: queryParams || null,
    requestContext: {
      authorizer: {
        claims: {
          sub: userId,
          'custom:organizationId': organizationId,
        },
      },
    } as any,
  } as any);

  describe('User aggregation', () => {
    it('should aggregate costs by user with default parameters', async () => {
      const mockAggregation = {
        totalCost: 0.005,
        lambdaCost: 0.004,
        s3Cost: 0.0005,
        dynamoDbCost: 0.0005,
        analysisCount: 5,
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T00:00:00Z',
        },
      };

      mockAggregateByUser.mockResolvedValue(mockAggregation);

      const event = createEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockAggregateByUser).toHaveBeenCalledWith(
        'user-123',
        undefined,
        undefined
      );

      const body = JSON.parse(result.body);
      expect(body.aggregateBy).toBe('user');
      expect(body.userId).toBe('user-123');
      expect(body.costs).toEqual(mockAggregation);
    });

    it('should aggregate costs by user with date range', async () => {
      const mockAggregation = {
        totalCost: 0.003,
        lambdaCost: 0.0024,
        s3Cost: 0.0003,
        dynamoDbCost: 0.0003,
        analysisCount: 3,
        period: {
          start: '2024-01-15T00:00:00Z',
          end: '2024-01-20T00:00:00Z',
        },
      };

      mockAggregateByUser.mockResolvedValue(mockAggregation);

      const event = createEvent({
        aggregateBy: 'user',
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-20T00:00:00Z',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockAggregateByUser).toHaveBeenCalledWith(
        'user-123',
        new Date('2024-01-15T00:00:00Z'),
        new Date('2024-01-20T00:00:00Z')
      );

      const body = JSON.parse(result.body);
      expect(body.costs).toEqual(mockAggregation);
    });
  });

  describe('Organization aggregation', () => {
    it('should aggregate costs by organization', async () => {
      const mockAggregation = {
        totalCost: 0.015,
        lambdaCost: 0.012,
        s3Cost: 0.0015,
        dynamoDbCost: 0.0015,
        analysisCount: 15,
        period: {
          start: '2024-01-01T00:00:00Z',
          end: '2024-01-31T00:00:00Z',
        },
      };

      mockAggregateByOrganization.mockResolvedValue(mockAggregation);

      const event = createEvent({ aggregateBy: 'organization' });
      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockAggregateByOrganization).toHaveBeenCalledWith(
        'org-456',
        undefined,
        undefined
      );

      const body = JSON.parse(result.body);
      expect(body.aggregateBy).toBe('organization');
      expect(body.organizationId).toBe('org-456');
      expect(body.costs).toEqual(mockAggregation);
    });

    it('should aggregate costs by organization with date range', async () => {
      const mockAggregation = {
        totalCost: 0.008,
        lambdaCost: 0.0064,
        s3Cost: 0.0008,
        dynamoDbCost: 0.0008,
        analysisCount: 8,
        period: {
          start: '2024-01-10T00:00:00Z',
          end: '2024-01-25T00:00:00Z',
        },
      };

      mockAggregateByOrganization.mockResolvedValue(mockAggregation);

      const event = createEvent({
        aggregateBy: 'organization',
        startDate: '2024-01-10T00:00:00Z',
        endDate: '2024-01-25T00:00:00Z',
      });

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(mockAggregateByOrganization).toHaveBeenCalledWith(
        'org-456',
        new Date('2024-01-10T00:00:00Z'),
        new Date('2024-01-25T00:00:00Z')
      );
    });
  });

  describe('Error handling', () => {
    it('should return 401 if user ID not found', async () => {
      const event = createEvent();
      event.requestContext.authorizer = undefined;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Unauthorized');
    });

    it('should return 400 for invalid aggregateBy parameter', async () => {
      const event = createEvent({ aggregateBy: 'invalid' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid parameter');
      expect(body.message).toContain('aggregateBy');
    });

    it('should return 400 for invalid startDate', async () => {
      const event = createEvent({ startDate: 'invalid-date' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid parameter');
      expect(body.message).toContain('startDate');
    });

    it('should return 400 for invalid endDate', async () => {
      const event = createEvent({ endDate: 'not-a-date' });
      const result = await handler(event);

      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Invalid parameter');
      expect(body.message).toContain('endDate');
    });

    it('should return 500 if cost aggregation fails', async () => {
      mockAggregateByUser.mockRejectedValue(
        new Error('Database error')
      );

      const event = createEvent();
      const result = await handler(event);

      expect(result.statusCode).toBe(500);
      const body = JSON.parse(result.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toBe('Database error');
    });
  });

  describe('CORS headers', () => {
    it('should include CORS headers in successful response', async () => {
      mockAggregateByUser.mockResolvedValue({
        totalCost: 0,
        lambdaCost: 0,
        s3Cost: 0,
        dynamoDbCost: 0,
        analysisCount: 0,
        period: { start: '', end: '' },
      });

      const event = createEvent();
      const result = await handler(event);

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
    });

    it('should include CORS headers in error response', async () => {
      const event = createEvent({ aggregateBy: 'invalid' });
      const result = await handler(event);

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
    });
  });
});
