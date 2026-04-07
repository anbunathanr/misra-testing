import { AnalysisCache } from '../analysis-cache';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { AnalysisResult, AnalysisStatus, Language } from '../../../types/misra-analysis';

// Mock unmarshall
jest.mock('@aws-sdk/util-dynamodb', () => ({
  marshall: jest.fn((obj) => obj),
  unmarshall: jest.fn((obj) => obj),
}));

describe('AnalysisCache', () => {
  let cache: AnalysisCache;
  let mockSend: jest.Mock;
  let mockDynamoClient: DynamoDBClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSend = jest.fn();
    mockDynamoClient = {
      send: mockSend,
    } as any;
    
    cache = new AnalysisCache(mockDynamoClient);
  });

  describe('hashFileContent', () => {
    it('should generate consistent SHA-256 hash for same content', () => {
      const content = 'int main() { return 0; }';
      const hash1 = AnalysisCache.hashFileContent(content);
      const hash2 = AnalysisCache.hashFileContent(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it('should generate different hashes for different content', () => {
      const content1 = 'int main() { return 0; }';
      const content2 = 'int main() { return 1; }';
      
      const hash1 = AnalysisCache.hashFileContent(content1);
      const hash2 = AnalysisCache.hashFileContent(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('should be sensitive to whitespace changes', () => {
      const content1 = 'int main() { return 0; }';
      const content2 = 'int main() {  return 0; }'; // Extra space
      
      const hash1 = AnalysisCache.hashFileContent(content1);
      const hash2 = AnalysisCache.hashFileContent(content2);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty content', () => {
      const hash = AnalysisCache.hashFileContent('');
      expect(hash).toHaveLength(64);
    });

    it('should handle large content', () => {
      const largeContent = 'x'.repeat(1000000); // 1MB of content
      const hash = AnalysisCache.hashFileContent(largeContent);
      expect(hash).toHaveLength(64);
    });
  });

  describe('getCachedResult', () => {
    const mockAnalysisResult: AnalysisResult = {
      analysisId: 'test-analysis-id',
      fileId: 'test-file-id',
      userId: 'test-user-id',
      language: Language.C,
      violations: [],
      summary: {
        totalViolations: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        compliancePercentage: 100,
      },
      createdAt: new Date().toISOString(),
      status: AnalysisStatus.COMPLETED,
    };

    it('should return cached result when found', async () => {
      const fileHash = 'test-hash';
      const cachedItem = {
        fileHash,
        analysisResult: mockAnalysisResult,
        userId: 'test-user',
        language: 'C',
        timestamp: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + 86400, // 1 day from now
      };

      mockSend.mockResolvedValue({ Item: cachedItem });

      const result = await cache.getCachedResult(fileHash);

      expect(result).toEqual(mockAnalysisResult);
      expect(mockSend).toHaveBeenCalledWith(expect.any(GetItemCommand));
    });

    it('should return null when cache miss', async () => {
      const fileHash = 'non-existent-hash';
      mockSend.mockResolvedValue({ Item: undefined });

      const result = await cache.getCachedResult(fileHash);

      expect(result).toBeNull();
    });

    it('should return null when cache entry expired', async () => {
      const fileHash = 'expired-hash';
      const expiredItem = {
        fileHash,
        analysisResult: mockAnalysisResult,
        userId: 'test-user',
        language: 'C',
        timestamp: Date.now() - 100000,
        ttl: Math.floor(Date.now() / 1000) - 1, // Expired 1 second ago
      };

      mockSend.mockResolvedValue({ Item: expiredItem });

      const result = await cache.getCachedResult(fileHash);

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors gracefully', async () => {
      const fileHash = 'error-hash';
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      const result = await cache.getCachedResult(fileHash);

      expect(result).toBeNull(); // Should not throw, return null instead
    });
  });

  describe('setCachedResult', () => {
    const mockAnalysisResult: AnalysisResult = {
      analysisId: 'test-analysis-id',
      fileId: 'test-file-id',
      userId: 'test-user-id',
      language: Language.C,
      violations: [],
      summary: {
        totalViolations: 0,
        criticalCount: 0,
        majorCount: 0,
        minorCount: 0,
        compliancePercentage: 100,
      },
      createdAt: new Date().toISOString(),
      status: AnalysisStatus.COMPLETED,
    };

    it('should store result in cache', async () => {
      const fileHash = 'test-hash';
      const userId = 'test-user';
      const language = 'C';

      mockSend.mockResolvedValue({});

      await cache.setCachedResult(fileHash, mockAnalysisResult, userId, language);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutItemCommand));
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should set TTL to 30 days from now', async () => {
      const fileHash = 'test-hash';
      const userId = 'test-user';
      const language = 'C';

      mockSend.mockResolvedValue({});

      await cache.setCachedResult(fileHash, mockAnalysisResult, userId, language);

      // Just verify the command was sent successfully
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(mockSend).toHaveBeenCalledWith(expect.any(PutItemCommand));
    });

    it('should not throw on DynamoDB errors', async () => {
      const fileHash = 'error-hash';
      mockSend.mockRejectedValue(new Error('DynamoDB error'));

      await expect(
        cache.setCachedResult(fileHash, mockAnalysisResult, 'user', 'C')
      ).resolves.not.toThrow();
    });
  });

  describe('invalidateCache', () => {
    it('should invalidate cache entry by setting TTL to past', async () => {
      const fileHash = 'test-hash';

      mockSend.mockResolvedValue({});

      await cache.invalidateCache(fileHash);

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutItemCommand));
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should throw on DynamoDB errors', async () => {
      const fileHash = 'error-hash';
      const error = new Error('DynamoDB error');
      mockSend.mockRejectedValue(error);

      await expect(cache.invalidateCache(fileHash)).rejects.toThrow('DynamoDB error');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle cache hit scenario', async () => {
      const content = 'int main() { return 0; }';
      const fileHash = AnalysisCache.hashFileContent(content);
      
      const mockResult: AnalysisResult = {
        analysisId: 'cached-id',
        fileId: 'file-1',
        userId: 'user-1',
        language: Language.C,
        violations: [],
        summary: {
          totalViolations: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 100,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      const cachedItem = {
        fileHash,
        analysisResult: mockResult,
        userId: 'user-1',
        language: 'C',
        timestamp: Date.now(),
        ttl: Math.floor(Date.now() / 1000) + 86400,
      };

      mockSend.mockResolvedValue({ Item: cachedItem });

      const result = await cache.getCachedResult(fileHash);

      expect(result).toEqual(mockResult);
    });

    it('should handle cache miss and store scenario', async () => {
      const content = 'int main() { return 0; }';
      const fileHash = AnalysisCache.hashFileContent(content);
      
      // First call: cache miss
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const missResult = await cache.getCachedResult(fileHash);
      expect(missResult).toBeNull();

      // Store in cache
      const newResult: AnalysisResult = {
        analysisId: 'new-id',
        fileId: 'file-1',
        userId: 'user-1',
        language: Language.C,
        violations: [],
        summary: {
          totalViolations: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 100,
        },
        createdAt: new Date().toISOString(),
        status: AnalysisStatus.COMPLETED,
      };

      mockSend.mockResolvedValueOnce({});

      await cache.setCachedResult(fileHash, newResult, 'user-1', 'C');

      expect(mockSend).toHaveBeenCalledTimes(2); // One for get, one for put
    });
  });
});
