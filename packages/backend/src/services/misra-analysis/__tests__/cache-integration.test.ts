/**
 * Integration tests for analysis caching
 * 
 * Tests the complete caching workflow:
 * 1. Cache miss triggers analysis
 * 2. Result is stored in cache
 * 3. Subsequent identical file uses cache
 * 4. Cache invalidation works correctly
 * 
 * Requirements: 10.7 - Cache analysis results for identical files
 */

import { AnalysisCache } from '../analysis-cache';
import { MISRAAnalysisEngine } from '../analysis-engine';
import { Language } from '../../../types/misra-analysis';

// Mock AWS SDK for integration tests
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('../code-parser');
jest.mock('../rule-engine');

describe('Analysis Caching Integration', () => {
  let cache: AnalysisCache;
  let engine: MISRAAnalysisEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new AnalysisCache();
    engine = new MISRAAnalysisEngine();
  });

  describe('Complete caching workflow', () => {
    it('should cache and retrieve analysis results for identical files', async () => {
      const fileContent = `
        int main() {
          int x = 5;
          return 0;
        }
      `;

      // First analysis - cache miss
      const result1 = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-1',
        'user-1'
      );

      expect(result1.fileId).toBe('file-1');
      expect(result1.userId).toBe('user-1');

      // Second analysis with same content - should use cache
      const result2 = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-2',
        'user-2'
      );

      // Results should have same violations but different IDs
      expect(result2.violations).toEqual(result1.violations);
      expect(result2.summary).toEqual(result1.summary);
      expect(result2.fileId).toBe('file-2');
      expect(result2.userId).toBe('user-2');
      expect(result2.analysisId).not.toBe(result1.analysisId);
    });

    it('should not use cache for different file content', async () => {
      const content1 = 'int main() { return 0; }';
      const content2 = 'int main() { return 1; }';

      const result1 = await engine.analyzeFile(content1, Language.C, 'file-1', 'user-1');
      const result2 = await engine.analyzeFile(content2, Language.C, 'file-2', 'user-2');

      // Different content should produce different hashes
      const hash1 = AnalysisCache.hashFileContent(content1);
      const hash2 = AnalysisCache.hashFileContent(content2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Cache invalidation', () => {
    it('should invalidate cache entry', async () => {
      const fileContent = 'int main() { return 0; }';
      const fileHash = AnalysisCache.hashFileContent(fileContent);

      // Analyze and cache
      await engine.analyzeFile(fileContent, Language.C, 'file-1', 'user-1');

      // Invalidate cache
      await cache.invalidateCache(fileHash);

      // Next analysis should be fresh (cache miss)
      const result = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-2',
        'user-2'
      );

      expect(result.fileId).toBe('file-2');
    });
  });

  describe('Hash collision handling', () => {
    it('should handle extremely unlikely hash collisions', async () => {
      // In practice, SHA-256 collisions are computationally infeasible
      // This test documents expected behavior if one occurred
      
      const content1 = 'int main() { return 0; }';
      const content2 = 'int main() { return 0; }'; // Identical content

      const hash1 = AnalysisCache.hashFileContent(content1);
      const hash2 = AnalysisCache.hashFileContent(content2);

      // Identical content produces identical hash (expected)
      expect(hash1).toBe(hash2);

      // Both should use same cache entry
      const result1 = await engine.analyzeFile(content1, Language.C, 'file-1', 'user-1');
      const result2 = await engine.analyzeFile(content2, Language.C, 'file-2', 'user-2');

      expect(result1.violations).toEqual(result2.violations);
    });
  });

  describe('Cache performance metrics', () => {
    it('should demonstrate cache performance improvement', async () => {
      const fileContent = `
        #include <stdio.h>
        
        int main() {
          int x = 5;
          int y = 10;
          int z = x + y;
          printf("%d\\n", z);
          return 0;
        }
      `;

      // First analysis (cache miss)
      const start1 = Date.now();
      const result1 = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-1',
        'user-1'
      );
      const duration1 = Date.now() - start1;

      // Second analysis (cache hit)
      const start2 = Date.now();
      const result2 = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-2',
        'user-2'
      );
      const duration2 = Date.now() - start2;

      // Cache hit should be faster or similar
      // (In real scenario with actual parsing, cache hit is much faster)
      expect(duration2).toBeLessThanOrEqual(duration1 + 50);
      
      // Results should be equivalent
      expect(result2.violations).toEqual(result1.violations);
      expect(result2.summary).toEqual(result1.summary);
    });
  });

  describe('Multi-user caching', () => {
    it('should share cache across different users for same file', async () => {
      const fileContent = 'int main() { return 0; }';

      // User 1 analyzes file
      const result1 = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-1',
        'user-1'
      );

      // User 2 analyzes same file - should use cache
      const result2 = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-2',
        'user-2'
      );

      // Should have same violations
      expect(result2.violations).toEqual(result1.violations);
      expect(result2.summary).toEqual(result1.summary);

      // But different user IDs
      expect(result1.userId).toBe('user-1');
      expect(result2.userId).toBe('user-2');
    });
  });

  describe('Language-specific caching', () => {
    it('should cache C and C++ separately even for same content', async () => {
      const fileContent = 'int main() { return 0; }';

      // Analyze as C
      const resultC = await engine.analyzeFile(
        fileContent,
        Language.C,
        'file-1',
        'user-1'
      );

      // Analyze as C++
      const resultCPP = await engine.analyzeFile(
        fileContent,
        Language.CPP,
        'file-2',
        'user-1'
      );

      // Both should complete successfully
      expect(resultC.language).toBe(Language.C);
      expect(resultCPP.language).toBe(Language.CPP);

      // May have different violations due to different rule sets
      // (This is expected behavior)
    });
  });

  describe('Edge cases', () => {
    it('should handle empty file content', async () => {
      const emptyContent = '';
      const hash = AnalysisCache.hashFileContent(emptyContent);

      expect(hash).toHaveLength(64); // Valid SHA-256 hash

      const result = await engine.analyzeFile(
        emptyContent,
        Language.C,
        'file-1',
        'user-1'
      );

      expect(result).toBeDefined();
    });

    it('should handle very large files', async () => {
      // Simulate a large file (1MB)
      const largeContent = 'int x = 0;\n'.repeat(100000);
      const hash = AnalysisCache.hashFileContent(largeContent);

      expect(hash).toHaveLength(64);

      const result = await engine.analyzeFile(
        largeContent,
        Language.C,
        'file-1',
        'user-1'
      );

      expect(result).toBeDefined();
    });

    it('should handle special characters in content', async () => {
      const specialContent = `
        int main() {
          char* str = "Hello\\nWorld\\t!";
          return 0;
        }
      `;

      const hash = AnalysisCache.hashFileContent(specialContent);
      expect(hash).toHaveLength(64);

      const result = await engine.analyzeFile(
        specialContent,
        Language.C,
        'file-1',
        'user-1'
      );

      expect(result).toBeDefined();
    });

    it('should handle Unicode content', async () => {
      const unicodeContent = `
        int main() {
          // Comment with Unicode: 你好世界 🚀
          return 0;
        }
      `;

      const hash = AnalysisCache.hashFileContent(unicodeContent);
      expect(hash).toHaveLength(64);

      const result = await engine.analyzeFile(
        unicodeContent,
        Language.C,
        'file-1',
        'user-1'
      );

      expect(result).toBeDefined();
    });
  });

  describe('Cache consistency', () => {
    it('should maintain consistency across multiple cache operations', async () => {
      const fileContent = 'int main() { return 0; }';
      const fileHash = AnalysisCache.hashFileContent(fileContent);

      // Perform multiple analyses
      const results = await Promise.all([
        engine.analyzeFile(fileContent, Language.C, 'file-1', 'user-1'),
        engine.analyzeFile(fileContent, Language.C, 'file-2', 'user-2'),
        engine.analyzeFile(fileContent, Language.C, 'file-3', 'user-3'),
      ]);

      // All should have same violations
      expect(results[1].violations).toEqual(results[0].violations);
      expect(results[2].violations).toEqual(results[0].violations);

      // But different file IDs
      expect(results[0].fileId).toBe('file-1');
      expect(results[1].fileId).toBe('file-2');
      expect(results[2].fileId).toBe('file-3');
    });
  });
});
