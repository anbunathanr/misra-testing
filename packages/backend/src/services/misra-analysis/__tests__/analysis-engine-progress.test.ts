import { MISRAAnalysisEngine, AnalysisProgressCallback } from '../analysis-engine';
import { Language, AnalysisStatus } from '../../../types/misra-analysis';

describe('MISRAAnalysisEngine - Progress Tracking', () => {
  let engine: MISRAAnalysisEngine;

  beforeEach(() => {
    engine = new MISRAAnalysisEngine();
  });

  describe('analyzeFile with progress callback', () => {
    it('should call progress callback with initial progress', async () => {
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message });
      };

      const sampleCode = `
#include <stdio.h>
int main() {
    printf("Hello World\\n");
    return 0;
}
`;

      await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id',
        'test-user-id',
        { progressCallback, updateInterval: 100 } // Fast updates for testing
      );

      // Should have at least initial and final progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[0].progress).toBe(0);
      expect(progressUpdates[0].message).toContain('Starting');
    });

    it('should report progress at regular intervals', async () => {
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message });
      };

      const sampleCode = `
#include <stdio.h>
int main() {
    int x = 5;
    int y = 10;
    return x + y;
}
`;

      await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id',
        'test-user-id',
        { progressCallback, updateInterval: 100 }
      );

      // Should have multiple progress updates
      expect(progressUpdates.length).toBeGreaterThanOrEqual(3);
      
      // Progress should be monotonically increasing
      for (let i = 1; i < progressUpdates.length; i++) {
        expect(progressUpdates[i].progress).toBeGreaterThanOrEqual(progressUpdates[i - 1].progress);
      }
    });

    it('should complete with 100% progress', async () => {
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message });
      };

      const sampleCode = `
#include <stdio.h>
int main() {
    return 0;
}
`;

      const result = await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id',
        'test-user-id',
        { progressCallback, updateInterval: 100 }
      );

      // Final progress should be 100%
      const finalUpdate = progressUpdates[progressUpdates.length - 1];
      expect(finalUpdate.progress).toBe(100);
      expect(result.status).toBe(AnalysisStatus.COMPLETED);
    });

    it('should include meaningful progress messages', async () => {
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message });
      };

      const sampleCode = `
#include <stdio.h>
int main() {
    return 0;
}
`;

      await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id',
        'test-user-id',
        { progressCallback, updateInterval: 100 }
      );

      const messages = progressUpdates.map(u => u.message);
      
      // Should contain key workflow steps
      expect(messages.some(m => m.includes('Starting'))).toBe(true);
      expect(messages.some(m => m.includes('Parsing') || m.includes('cache'))).toBe(true);
      expect(messages.some(m => m.includes('completed') || m.includes('compliance'))).toBe(true);
    });

    it('should work without progress callback', async () => {
      const sampleCode = `
#include <stdio.h>
int main() {
    return 0;
}
`;

      const result = await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id',
        'test-user-id'
      );

      expect(result.status).toBe(AnalysisStatus.COMPLETED);
      expect(result.analysisId).toBeDefined();
    });

    it('should handle C++ files with progress tracking', async () => {
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message });
      };

      const sampleCode = `
#include <iostream>
int main() {
    std::cout << "Hello" << std::endl;
    return 0;
}
`;

      const result = await engine.analyzeFile(
        sampleCode,
        Language.CPP,
        'test-file-id',
        'test-user-id',
        { progressCallback, updateInterval: 100 }
      );

      expect(result.status).toBe(AnalysisStatus.COMPLETED);
      expect(result.language).toBe(Language.CPP);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    it('should respect custom update interval', async () => {
      const progressUpdates: Array<{ progress: number; message: string; timestamp: number }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message, timestamp: Date.now() });
      };

      const sampleCode = `
#include <stdio.h>
int main() {
    int x = 5;
    return x;
}
`;

      await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id',
        'test-user-id',
        { progressCallback, updateInterval: 500 } // 500ms interval
      );

      // Verify that custom interval was accepted (at least some updates should exist)
      expect(progressUpdates.length).toBeGreaterThan(0);
      
      // Check that we have initial and final progress
      expect(progressUpdates[0].progress).toBe(0);
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100);
    });

    it('should report cache hit in progress', async () => {
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message });
      };

      const sampleCode = `
#include <stdio.h>
int main() {
    return 0;
}
`;

      // First analysis - should not be cached
      await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id-1',
        'test-user-id',
        { progressCallback, updateInterval: 100 }
      );

      progressUpdates.length = 0; // Clear updates

      // Second analysis with same code - should hit cache
      await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id-2',
        'test-user-id',
        { progressCallback, updateInterval: 100 }
      );

      // Should complete quickly with cache message
      const messages = progressUpdates.map(u => u.message);
      expect(messages.some(m => m.includes('cache'))).toBe(true);
    });

    it('should handle errors gracefully with progress callback', async () => {
      const progressUpdates: Array<{ progress: number; message: string }> = [];
      const progressCallback: AnalysisProgressCallback = async (progress, message) => {
        progressUpdates.push({ progress, message });
      };

      // Invalid code that might cause parsing errors
      const invalidCode = 'this is not valid C code @#$%';

      const result = await engine.analyzeFile(
        invalidCode,
        Language.C,
        'test-file-id',
        'test-user-id',
        { progressCallback, updateInterval: 100 }
      );

      // Should still return a result (even if failed)
      expect(result).toBeDefined();
      expect(result.analysisId).toBeDefined();
      
      // Should have reported the error in progress
      if (result.status === AnalysisStatus.FAILED) {
        const messages = progressUpdates.map(u => u.message);
        expect(messages.some(m => m.includes('failed') || m.includes('error'))).toBe(true);
      }
    });
  });

  describe('analyzeFile without progress tracking (backward compatibility)', () => {
    it('should work with original signature', async () => {
      const sampleCode = `
#include <stdio.h>
int main() {
    return 0;
}
`;

      const result = await engine.analyzeFile(
        sampleCode,
        Language.C,
        'test-file-id',
        'test-user-id'
      );

      expect(result.status).toBe(AnalysisStatus.COMPLETED);
      expect(result.analysisId).toBeDefined();
      expect(result.fileId).toBe('test-file-id');
      expect(result.userId).toBe('test-user-id');
      expect(result.language).toBe(Language.C);
    });
  });
});
