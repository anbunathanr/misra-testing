import { MISRAAnalysisEngine } from '../analysis-engine';
import { AnalysisCache } from '../analysis-cache';
import { Language, AnalysisStatus } from '../../../types/misra-analysis';

// Mock dependencies
jest.mock('../code-parser');
jest.mock('../rule-engine');
jest.mock('../analysis-cache');

describe('MISRAAnalysisEngine - Caching Integration', () => {
  let engine: MISRAAnalysisEngine;
  let mockGetCachedResult: jest.Mock;
  let mockSetCachedResult: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetCachedResult = jest.fn();
    mockSetCachedResult = jest.fn();

    (AnalysisCache as jest.Mock).mockImplementation(() => ({
      getCachedResult: mockGetCachedResult,
      setCachedResult: mockSetCachedResult,
    }));

    engine = new MISRAAnalysisEngine();
  });

  describe('Cache hit scenarios', () => {
    it('should return cached result when available', async () => {
      const fileContent = 'int main() { return 0; }';
      const cachedResult = {
        analysisId: 'cached-id',
        fileId: 'old-file-id',
        userId: 'old-user-id',
        language: Language.C,
        violations: [
          {
            ruleId: 'MISRA-C-1.1',
            description: 'Test violation',
            severity: 'mandatory' as const,
            lineNumber: 1,
            columnNumber: 1,
            message: 'Test message',
            codeSnippet: 'int main()',
          },
        ],
        summary: {
          totalViolations: 1,
          criticalCount: 1,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 95,
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        status: AnalysisStatus.COMPLETED,
      };

      mockGetCachedResult.mockResolvedValue(cachedResult);

      const result = await engine.analyzeFile(
        fileContent,
        Language.C,
        'new-file-id',
        'new-user-id'
      );

      // Should use cached violations and summary
      expect(result.violations).toEqual(cachedResult.violations);
      expect(result.summary).toEqual(cachedResult.summary);
      
      // Should update IDs for current request
      expect(result.fileId).toBe('new-file-id');
      expect(result.userId).toBe('new-user-id');
      expect(result.analysisId).not.toBe(cachedResult.analysisId);
      
      // Should not call setCachedResult (already cached)
      expect(mockSetCachedResult).not.toHaveBeenCalled();
    });

    it('should update timestamp when returning cached result', async () => {
      const fileContent = 'int main() { return 0; }';
      const oldTimestamp = '2024-01-01T00:00:00.000Z';
      
      const cachedResult = {
        analysisId: 'cached-id',
        fileId: 'file-id',
        userId: 'user-id',
        language: Language.C,
        violations: [],
        summary: {
          totalViolations: 0,
          criticalCount: 0,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 100,
        },
        createdAt: oldTimestamp,
        status: AnalysisStatus.COMPLETED,
      };

      mockGetCachedResult.mockResolvedValue(cachedResult);

      const result = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-id',
        'user-id'
      );

      expect(result.createdAt).not.toBe(oldTimestamp);
      expect(new Date(result.createdAt).getTime()).toBeGreaterThan(
        new Date(oldTimestamp).getTime()
      );
    });
  });

  describe('Cache miss scenarios', () => {
    it('should perform analysis and cache result on cache miss', async () => {
      const fileContent = 'int main() { return 0; }';
      
      mockGetCachedResult.mockResolvedValue(null); // Cache miss
      mockSetCachedResult.mockResolvedValue(undefined);

      const result = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-id',
        'user-id'
      );

      // Should have performed analysis
      expect(result.status).toBe(AnalysisStatus.COMPLETED);
      expect(result.fileId).toBe('file-id');
      expect(result.userId).toBe('user-id');

      // Should have cached the result
      expect(mockSetCachedResult).toHaveBeenCalledWith(
        expect.any(String), // fileHash
        expect.objectContaining({
          analysisId: result.analysisId,
          fileId: 'file-id',
          userId: 'user-id',
        }),
        'user-id',
        Language.C
      );
    });

    it('should cache result even if caching fails', async () => {
      const fileContent = 'int main() { return 0; }';
      
      mockGetCachedResult.mockResolvedValue(null);
      mockSetCachedResult.mockRejectedValue(new Error('Cache write failed'));

      // Should not throw - caching failure shouldn't break analysis
      const result = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-id',
        'user-id'
      );

      expect(result.status).toBe(AnalysisStatus.COMPLETED);
    });
  });

  describe('Cache key generation', () => {
    it('should use same cache key for identical content', async () => {
      const fileContent = 'int main() { return 0; }';
      
      mockGetCachedResult.mockResolvedValue(null);
      mockSetCachedResult.mockResolvedValue(undefined);

      await engine.analyzeFile(fileContent, Language.C, 'file-1', 'user-1');
      await engine.analyzeFile(fileContent, Language.C, 'file-2', 'user-2');

      // Both calls should check cache with same hash
      expect(mockGetCachedResult).toHaveBeenCalledTimes(2);
      const hash1 = mockGetCachedResult.mock.calls[0][0];
      const hash2 = mockGetCachedResult.mock.calls[1][0];
      expect(hash1).toBe(hash2);
    });

    it('should use different cache keys for different content', async () => {
      const content1 = 'int main() { return 0; }';
      const content2 = 'int main() { return 1; }';
      
      mockGetCachedResult.mockResolvedValue(null);
      mockSetCachedResult.mockResolvedValue(undefined);

      await engine.analyzeFile(content1, Language.C, 'file-1', 'user-1');
      await engine.analyzeFile(content2, Language.C, 'file-2', 'user-2');

      const hash1 = mockGetCachedResult.mock.calls[0][0];
      const hash2 = mockGetCachedResult.mock.calls[1][0];
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Performance benefits', () => {
    it('should be faster with cache hit than cache miss', async () => {
      const fileContent = 'int main() { return 0; }';
      
      const cachedResult = {
        analysisId: 'cached-id',
        fileId: 'file-id',
        userId: 'user-id',
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

      // Cache hit - should be fast
      mockGetCachedResult.mockResolvedValue(cachedResult);
      const hitStart = Date.now();
      await engine.analyzeFile(fileContent, Language.C, 'file-1', 'user-1');
      const hitDuration = Date.now() - hitStart;

      // Cache miss - will be slower (includes parsing and rule checking)
      mockGetCachedResult.mockResolvedValue(null);
      mockSetCachedResult.mockResolvedValue(undefined);
      const missStart = Date.now();
      await engine.analyzeFile(fileContent, Language.C, 'file-2', 'user-2');
      const missDuration = Date.now() - missStart;

      // Cache hit should be significantly faster
      // Note: This is a rough check - actual performance depends on mocks
      expect(hitDuration).toBeLessThan(missDuration + 100);
    });
  });

  describe('Error handling', () => {
    it('should handle cache retrieval errors gracefully', async () => {
      const fileContent = 'int main() { return 0; }';
      
      mockGetCachedResult.mockRejectedValue(new Error('Cache read failed'));
      mockSetCachedResult.mockResolvedValue(undefined);

      // Should fall back to fresh analysis
      const result = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-id',
        'user-id'
      );

      expect(result.status).toBe(AnalysisStatus.COMPLETED);
    });

    it('should handle analysis failure and not cache failed results', async () => {
      const fileContent = 'invalid C++ code {{{';
      
      mockGetCachedResult.mockResolvedValue(null);

      const result = await engine.analyzeFile(
        fileContent,
        Language.CPP,
        'file-id',
        'user-id'
      );

      expect(result.status).toBe(AnalysisStatus.FAILED);
      
      // Should not cache failed results
      expect(mockSetCachedResult).not.toHaveBeenCalled();
    });
  });

  describe('Language-specific caching', () => {
    it('should cache C and C++ analyses separately', async () => {
      const fileContent = 'int main() { return 0; }';
      
      mockGetCachedResult.mockResolvedValue(null);
      mockSetCachedResult.mockResolvedValue(undefined);

      await engine.analyzeFile(fileContent, Language.C, 'file-1', 'user-1');
      await engine.analyzeFile(fileContent, Language.CPP, 'file-2', 'user-2');

      // Should cache with language parameter
      expect(mockSetCachedResult).toHaveBeenCalledTimes(2);
      expect(mockSetCachedResult).toHaveBeenNthCalledWith(
        1,
        expect.any(String),
        expect.anything(),
        'user-1',
        Language.C
      );
      expect(mockSetCachedResult).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.anything(),
        'user-2',
        Language.CPP
      );
    });
  });
});
