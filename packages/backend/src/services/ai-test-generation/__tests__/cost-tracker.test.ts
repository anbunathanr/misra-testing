import { CostTracker } from '../cost-tracker';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { TokenUsage } from '../../../types/ai-test-generation';

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('CostTracker', () => {
  let costTracker: CostTracker;
  let mockDocClient: DynamoDBDocumentClient;

  beforeEach(() => {
    ddbMock.reset();
    // Create a mock document client
    mockDocClient = {} as DynamoDBDocumentClient;
    mockDocClient.send = ddbMock.send.bind(ddbMock) as any;
    
    costTracker = new CostTracker('AIUsage', undefined, undefined, mockDocClient);
  });

  describe('calculateCost', () => {
    it('should calculate cost for GPT-4', () => {
      const tokens: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = costTracker.calculateCost(tokens, 'gpt-4');

      // GPT-4: $30/1M input + $60/1M output
      // 1000 * 0.00003 + 500 * 0.00006 = 0.03 + 0.03 = 0.06
      expect(cost).toBeCloseTo(0.06, 4);
    });

    it('should calculate cost for GPT-3.5-turbo', () => {
      const tokens: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = costTracker.calculateCost(tokens, 'gpt-3.5-turbo');

      // GPT-3.5: $0.50/1M input + $1.50/1M output
      // 1000 * 0.0000005 + 500 * 0.0000015 = 0.0005 + 0.00075 = 0.00125
      expect(cost).toBeCloseTo(0.00125, 5);
    });

    it('should default to GPT-4 pricing for unknown models', () => {
      const tokens: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = costTracker.calculateCost(tokens, 'unknown-model');

      expect(cost).toBeCloseTo(0.06, 4);
    });

    it('should handle zero tokens', () => {
      const tokens: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      const cost = costTracker.calculateCost(tokens, 'gpt-4');

      expect(cost).toBe(0);
    });
  });

  describe('recordUsage', () => {
    it('should record usage to DynamoDB', async () => {
      ddbMock.on(PutCommand).resolves({});

      const tokens: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      await costTracker.recordUsage(
        'user-123',
        'project-456',
        'generate',
        tokens,
        'gpt-4',
        1,
        5000
      );

      // Verify the PutCommand was called once
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    });

    it('should throw error if DynamoDB put fails', async () => {
      ddbMock.on(PutCommand).rejects(new Error('DynamoDB error'));

      const tokens: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      await expect(
        costTracker.recordUsage('user-123', 'project-456', 'generate', tokens, 'gpt-4')
      ).rejects.toThrow('Failed to record usage');
    });
  });

  describe('checkLimit', () => {
    it('should return true when within limits', async () => {
      // Mock user query - $50 spent this month
      ddbMock.on(QueryCommand).resolvesOnce({
        Items: [
          { cost: 25 },
          { cost: 25 },
        ],
      });

      // Mock project query - $30 spent this month
      ddbMock.on(QueryCommand).resolvesOnce({
        Items: [
          { cost: 15 },
          { cost: 15 },
        ],
      });

      const withinLimit = await costTracker.checkLimit('user-123', 'project-456');

      expect(withinLimit).toBe(true);
    });

    it('should return false when user exceeds monthly limit', async () => {
      // Mock user query - $150 spent this month (exceeds $100 limit)
      ddbMock.on(QueryCommand).resolvesOnce({
        Items: [
          { cost: 75 },
          { cost: 75 },
        ],
      });

      const withinLimit = await costTracker.checkLimit('user-123', 'project-456');

      expect(withinLimit).toBe(false);
    });

    it('should return false when project exceeds monthly limit', async () => {
      // Reset mock to ensure clean state
      ddbMock.reset();
      
      // Recreate cost tracker with fresh mock
      mockDocClient = {} as DynamoDBDocumentClient;
      mockDocClient.send = ddbMock.send.bind(ddbMock) as any;
      costTracker = new CostTracker('AIUsage', undefined, undefined, mockDocClient);
      
      // Set up mock to return different results for user vs project queries
      // First call (user query) - $40 spent (within $100 limit)
      // Second call (project query) - $60 spent (exceeds $50 limit)
      let callCount = 0;
      ddbMock.on(QueryCommand).callsFake(() => {
        callCount++;
        if (callCount === 1) {
          // User query
          return Promise.resolve({
            Items: [{ cost: 40 }],
          });
        } else {
          // Project query
          return Promise.resolve({
            Items: [{ cost: 30 }, { cost: 30 }],
          });
        }
      });

      const withinLimit = await costTracker.checkLimit('user-123', 'project-456');

      expect(withinLimit).toBe(false);
    });

    it('should return true when no usage records exist', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [],
      });

      const withinLimit = await costTracker.checkLimit('user-123', 'project-456');

      expect(withinLimit).toBe(true);
    });

    it('should fail open if limit check fails', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      const withinLimit = await costTracker.checkLimit('user-123', 'project-456');

      // Should allow request even if check fails
      expect(withinLimit).toBe(true);
    });
  });

  describe('getUsageStats', () => {
    it('should aggregate statistics by user', async () => {
      const mockItems = [
        {
          userId: 'user-123',
          projectId: 'project-1',
          timestamp: '2024-01-15T10:00:00Z',
          tokens: { totalTokens: 1000 },
          cost: 0.05,
        },
        {
          userId: 'user-123',
          projectId: 'project-2',
          timestamp: '2024-01-16T10:00:00Z',
          tokens: { totalTokens: 2000 },
          cost: 0.10,
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockItems,
      });

      const stats = await costTracker.getUsageStats('user-123');

      expect(stats.totalCalls).toBe(2);
      expect(stats.totalTokens).toBe(3000);
      expect(stats.estimatedCost).toBeCloseTo(0.15, 2);
      expect(stats.breakdown.byUser.get('user-123')).toBeCloseTo(0.15, 2);
      expect(stats.breakdown.byProject.get('project-1')).toBeCloseTo(0.05, 2);
      expect(stats.breakdown.byProject.get('project-2')).toBeCloseTo(0.10, 2);
      expect(stats.breakdown.byDate.get('2024-01-15')).toBeCloseTo(0.05, 2);
      expect(stats.breakdown.byDate.get('2024-01-16')).toBeCloseTo(0.10, 2);
    });

    it('should aggregate statistics by project', async () => {
      const mockItems = [
        {
          userId: 'user-1',
          projectId: 'project-456',
          timestamp: '2024-01-15T10:00:00Z',
          tokens: { totalTokens: 1500 },
          cost: 0.08,
        },
        {
          userId: 'user-2',
          projectId: 'project-456',
          timestamp: '2024-01-15T11:00:00Z',
          tokens: { totalTokens: 1200 },
          cost: 0.06,
        },
      ];

      ddbMock.on(QueryCommand).resolves({
        Items: mockItems,
      });

      const stats = await costTracker.getUsageStats(undefined, 'project-456');

      expect(stats.totalCalls).toBe(2);
      expect(stats.totalTokens).toBe(2700);
      expect(stats.estimatedCost).toBeCloseTo(0.14, 2);
    });

    it('should return empty stats when no userId or projectId provided', async () => {
      const stats = await costTracker.getUsageStats();

      expect(stats.totalCalls).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.estimatedCost).toBe(0);
    });

    it('should handle date range filtering', async () => {
      ddbMock.on(QueryCommand).resolves({
        Items: [
          {
            userId: 'user-123',
            projectId: 'project-1',
            timestamp: '2024-01-15T10:00:00Z',
            tokens: { totalTokens: 1000 },
            cost: 0.05,
          },
        ],
      });

      const stats = await costTracker.getUsageStats(
        'user-123',
        undefined,
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z'
      );

      expect(stats.totalCalls).toBe(1);
      // Verify QueryCommand was called
      expect(ddbMock.commandCalls(QueryCommand).length).toBeGreaterThan(0);
    });

    it('should throw error if query fails', async () => {
      ddbMock.on(QueryCommand).rejects(new Error('DynamoDB error'));

      await expect(
        costTracker.getUsageStats('user-123')
      ).rejects.toThrow('Failed to get usage stats');
    });
  });
});
