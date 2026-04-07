import { CostTracker, CostBreakdown } from '../cost-tracker';
import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/util-dynamodb');

describe('CostTracker', () => {
  let costTracker: CostTracker;
  let mockDynamoClient: jest.Mocked<DynamoDBClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDynamoClient = {
      send: jest.fn(),
    } as any;

    costTracker = new CostTracker(mockDynamoClient, 'TestCostsTable');
  });

  describe('calculateCosts', () => {
    it('should calculate costs correctly for a typical analysis', () => {
      // 30 seconds execution, 5MB file, 2 DynamoDB writes
      const executionTimeMs = 30000;
      const fileSizeBytes = 5 * 1024 * 1024;
      const dynamoDbWrites = 2;

      const costs = costTracker.calculateCosts(executionTimeMs, fileSizeBytes, dynamoDbWrites);

      // Lambda: 30s * 2GB * $0.0000166667/GB-s = $0.001
      expect(costs.lambdaCost).toBeCloseTo(0.001, 6);

      // S3: 5MB * $0.023/GB/month = ~$0.00011
      expect(costs.s3StorageCost).toBeGreaterThan(0);
      expect(costs.s3StorageCost).toBeLessThan(0.001);

      // DynamoDB: 2 writes * $0.00000125 = $0.0000025
      expect(costs.dynamoDbWriteCost).toBeCloseTo(0.0000025, 6);

      // Total should be sum of all costs
      expect(costs.totalCost).toBeCloseTo(
        costs.lambdaCost + costs.s3StorageCost + costs.dynamoDbWriteCost,
        6
      );

      // Execution time should match input
      expect(costs.lambdaExecutionTime).toBe(executionTimeMs);
    });

    it('should calculate costs for a fast analysis', () => {
      // 5 seconds execution, 1MB file
      const executionTimeMs = 5000;
      const fileSizeBytes = 1024 * 1024;

      const costs = costTracker.calculateCosts(executionTimeMs, fileSizeBytes);

      // Lambda cost should be lower for shorter execution
      expect(costs.lambdaCost).toBeLessThan(0.0002);

      // S3 cost should be lower for smaller file
      expect(costs.s3StorageCost).toBeLessThan(0.00003);

      // Total should be positive
      expect(costs.totalCost).toBeGreaterThan(0);
    });

    it('should calculate costs for a large file analysis', () => {
      // 60 seconds execution, 10MB file
      const executionTimeMs = 60000;
      const fileSizeBytes = 10 * 1024 * 1024;

      const costs = costTracker.calculateCosts(executionTimeMs, fileSizeBytes);

      // Lambda cost should be higher for longer execution
      expect(costs.lambdaCost).toBeGreaterThan(0.001);

      // S3 cost should be higher for larger file
      expect(costs.s3StorageCost).toBeGreaterThan(0.0001);

      // Total should be positive
      expect(costs.totalCost).toBeGreaterThan(0);
    });

    it('should round costs to 6 decimal places', () => {
      const costs = costTracker.calculateCosts(10000, 1024 * 1024);

      // Check that all costs are rounded to 6 decimal places
      expect(costs.lambdaCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(costs.s3StorageCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(costs.dynamoDbWriteCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
      expect(costs.totalCost.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(6);
    });
  });

  describe('recordCost', () => {
    it('should record cost data to DynamoDB', async () => {
      const userId = 'user-123';
      const organizationId = 'org-456';
      const analysisId = 'analysis-789';
      const fileId = 'file-abc';
      const costs: CostBreakdown = {
        lambdaExecutionTime: 30000,
        lambdaCost: 0.001,
        s3StorageCost: 0.0001,
        dynamoDbWriteCost: 0.0000025,
        totalCost: 0.0011025,
      };
      const metadata = {
        fileSize: 5 * 1024 * 1024,
        duration: 30000,
      };

      (marshall as jest.Mock).mockReturnValue({});
      mockDynamoClient.send.mockResolvedValue({});

      await costTracker.recordCost(
        userId,
        organizationId,
        analysisId,
        fileId,
        costs,
        metadata
      );

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.any(PutItemCommand)
      );

      // Verify marshall was called with correct data structure
      expect(marshall).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          organizationId,
          analysisId,
          fileId,
          costs,
          metadata,
          timestamp: expect.any(String),
        })
      );
    });

    it('should throw error if DynamoDB write fails', async () => {
      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

      await expect(
        costTracker.recordCost(
          'user-123',
          'org-456',
          'analysis-789',
          'file-abc',
          {} as CostBreakdown,
          { fileSize: 1024, duration: 1000 }
        )
      ).rejects.toThrow('DynamoDB error');
    });
  });

  describe('aggregateCostsByUser', () => {
    it('should aggregate costs for a user', async () => {
      const userId = 'user-123';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockRecords = [
        {
          userId,
          timestamp: '2024-01-15T10:00:00Z',
          costs: {
            totalCost: 0.001,
            lambdaCost: 0.0008,
            s3StorageCost: 0.0001,
            dynamoDbWriteCost: 0.0001,
          },
        },
        {
          userId,
          timestamp: '2024-01-20T10:00:00Z',
          costs: {
            totalCost: 0.002,
            lambdaCost: 0.0016,
            s3StorageCost: 0.0002,
            dynamoDbWriteCost: 0.0002,
          },
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: mockRecords.map(() => ({})),
      });

      // Mock unmarshall to return our test records
      const { unmarshall } = require('@aws-sdk/util-dynamodb');
      mockRecords.forEach((record, index) => {
        unmarshall.mockReturnValueOnce(record);
      });

      const aggregation = await costTracker.aggregateCostsByUser(
        userId,
        startDate,
        endDate
      );

      expect(aggregation.totalCost).toBeCloseTo(0.003, 6);
      expect(aggregation.lambdaCost).toBeCloseTo(0.0024, 6);
      expect(aggregation.s3Cost).toBeCloseTo(0.0003, 6);
      expect(aggregation.dynamoDbCost).toBeCloseTo(0.0003, 6);
      expect(aggregation.analysisCount).toBe(2);
      expect(aggregation.period.start).toBe(startDate.toISOString());
      expect(aggregation.period.end).toBe(endDate.toISOString());
    });

    it('should use default date range if not provided', async () => {
      const userId = 'user-123';

      mockDynamoClient.send.mockResolvedValue({ Items: [] });

      await costTracker.aggregateCostsByUser(userId);

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.any(QueryCommand)
      );
    });

    it('should return zero costs if no records found', async () => {
      const userId = 'user-123';

      mockDynamoClient.send.mockResolvedValue({ Items: [] });

      const aggregation = await costTracker.aggregateCostsByUser(userId);

      expect(aggregation.totalCost).toBe(0);
      expect(aggregation.lambdaCost).toBe(0);
      expect(aggregation.s3Cost).toBe(0);
      expect(aggregation.dynamoDbCost).toBe(0);
      expect(aggregation.analysisCount).toBe(0);
    });
  });

  describe('aggregateCostsByOrganization', () => {
    it('should aggregate costs for an organization', async () => {
      const organizationId = 'org-456';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const mockRecords = [
        {
          organizationId,
          timestamp: '2024-01-15T10:00:00Z',
          costs: {
            totalCost: 0.005,
            lambdaCost: 0.004,
            s3StorageCost: 0.0005,
            dynamoDbWriteCost: 0.0005,
          },
        },
        {
          organizationId,
          timestamp: '2024-01-20T10:00:00Z',
          costs: {
            totalCost: 0.003,
            lambdaCost: 0.0024,
            s3StorageCost: 0.0003,
            dynamoDbWriteCost: 0.0003,
          },
        },
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: mockRecords.map(() => ({})),
      });

      // Mock unmarshall to return our test records
      const { unmarshall } = require('@aws-sdk/util-dynamodb');
      mockRecords.forEach((record, index) => {
        unmarshall.mockReturnValueOnce(record);
      });

      const aggregation = await costTracker.aggregateCostsByOrganization(
        organizationId,
        startDate,
        endDate
      );

      expect(aggregation.totalCost).toBeCloseTo(0.008, 6);
      expect(aggregation.lambdaCost).toBeCloseTo(0.0064, 6);
      expect(aggregation.s3Cost).toBeCloseTo(0.0008, 6);
      expect(aggregation.dynamoDbCost).toBeCloseTo(0.0008, 6);
      expect(aggregation.analysisCount).toBe(2);
    });

    it('should query using OrganizationIndex', async () => {
      const organizationId = 'org-456';

      mockDynamoClient.send.mockResolvedValue({ Items: [] });

      await costTracker.aggregateCostsByOrganization(organizationId);

      // Verify that send was called with a QueryCommand
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(1);
      const callArg = mockDynamoClient.send.mock.calls[0][0];
      expect(callArg.constructor.name).toBe('QueryCommand');
    });
  });
});
