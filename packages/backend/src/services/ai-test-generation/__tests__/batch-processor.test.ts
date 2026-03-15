import { BatchProcessor } from '../batch-processor';
import { ApplicationAnalyzer } from '../application-analyzer';
import { TestGenerator } from '../test-generator';
import { ApplicationAnalysis, BatchResult } from '../../../types/ai-test-generation';
import { TestCase } from '../../../types/test-case';

// Mock dependencies
jest.mock('../application-analyzer');
jest.mock('../test-generator');

describe('BatchProcessor', () => {
  let batchProcessor: BatchProcessor;
  let mockAnalyzer: jest.Mocked<ApplicationAnalyzer>;
  let mockGenerator: jest.Mocked<TestGenerator>;

  const mockAnalysis: ApplicationAnalysis = {
    url: 'https://example.com',
    title: 'Example App',
    elements: [],
    patterns: [],
    flows: [],
    metadata: {
      viewport: { width: 1920, height: 1080 },
      loadTime: 1000,
      isSPA: false,
    },
  };

  const mockTestCase: TestCase = {
    testCaseId: 'test-123',
    name: 'Test Login',
    description: 'Test user login functionality',
    type: 'ui',
    steps: [],
    projectId: 'project-123',
    suiteId: 'suite-123',
    userId: 'user-123',
    tags: ['ai-generated'],
    priority: 'medium',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  beforeEach(() => {
    // jest.mock() already replaces the constructors, so we can instantiate directly
    mockAnalyzer = new (ApplicationAnalyzer as any)() as jest.Mocked<ApplicationAnalyzer>;
    mockGenerator = new (TestGenerator as any)() as jest.Mocked<TestGenerator>;

    // Create batch processor with mocks
    batchProcessor = new BatchProcessor(mockAnalyzer, mockGenerator);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('generateBatch', () => {
    it('should generate tests for all scenarios successfully', async () => {
      const scenarios = [
        'Test user login',
        'Test user registration',
        'Test password reset',
      ];

      mockAnalyzer.analyze.mockResolvedValue(mockAnalysis);
      mockGenerator.generate.mockResolvedValue(mockTestCase);

      const result = await batchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123'
      );

      // Verify analysis was called once
      expect(mockAnalyzer.analyze).toHaveBeenCalledTimes(1);
      expect(mockAnalyzer.analyze).toHaveBeenCalledWith('https://example.com', undefined);

      // Verify generator was called for each scenario
      expect(mockGenerator.generate).toHaveBeenCalledTimes(3);

      // Verify result structure
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.summary).toEqual({
        total: 3,
        succeeded: 3,
        failed: 0,
      });
    });

    it('should handle individual generation failures', async () => {
      const scenarios = [
        'Test user login',
        'Test user registration',
        'Test password reset',
      ];

      mockAnalyzer.analyze.mockResolvedValue(mockAnalysis);
      
      // First generation succeeds, second fails, third succeeds
      mockGenerator.generate
        .mockResolvedValueOnce(mockTestCase)
        .mockRejectedValueOnce(new Error('Generation failed'))
        .mockResolvedValueOnce(mockTestCase);

      const result = await batchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123'
      );

      // Verify result structure
      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]).toEqual({
        scenario: 'Test user registration',
        error: 'Generation failed',
      });
      expect(result.summary).toEqual({
        total: 3,
        succeeded: 2,
        failed: 1,
      });
    });

    it('should fail all scenarios if analysis fails', async () => {
      const scenarios = [
        'Test user login',
        'Test user registration',
      ];

      mockAnalyzer.analyze.mockRejectedValue(new Error('Analysis failed'));

      const result = await batchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123'
      );

      // Verify generator was not called
      expect(mockGenerator.generate).not.toHaveBeenCalled();

      // Verify all scenarios failed
      expect(result.successful).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].error).toContain('Application analysis failed');
      expect(result.summary).toEqual({
        total: 2,
        succeeded: 0,
        failed: 2,
      });
    });

    it('should throw error if no scenarios provided', async () => {
      await expect(
        batchProcessor.generateBatch(
          'https://example.com',
          [],
          'project-123',
          'suite-123',
          'user-123'
        )
      ).rejects.toThrow('At least one scenario is required');
    });

    it('should throw error if required parameters are missing', async () => {
      await expect(
        batchProcessor.generateBatch(
          '',
          ['Test scenario'],
          'project-123',
          'suite-123',
          'user-123'
        )
      ).rejects.toThrow('URL, projectId, suiteId, and userId are required');
    });

    it('should process scenarios with concurrency limit', async () => {
      const scenarios = [
        'Scenario 1',
        'Scenario 2',
        'Scenario 3',
        'Scenario 4',
        'Scenario 5',
      ];

      mockAnalyzer.analyze.mockResolvedValue(mockAnalysis);
      mockGenerator.generate.mockResolvedValue(mockTestCase);

      // Create batch processor with concurrency limit of 2
      const limitedBatchProcessor = new BatchProcessor(
        mockAnalyzer,
        mockGenerator,
        { maxConcurrency: 2 }
      );

      const result = await limitedBatchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123'
      );

      // Verify all scenarios were processed
      expect(result.successful).toHaveLength(5);
      expect(result.summary.total).toBe(5);
      expect(mockGenerator.generate).toHaveBeenCalledTimes(5);
    });

    it('should pass analysis options to analyzer', async () => {
      const scenarios = ['Test scenario'];
      const options = {
        timeout: 60000,
        viewport: { width: 1280, height: 720 },
      };

      mockAnalyzer.analyze.mockResolvedValue(mockAnalysis);
      mockGenerator.generate.mockResolvedValue(mockTestCase);

      await batchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123',
        options
      );

      expect(mockAnalyzer.analyze).toHaveBeenCalledWith('https://example.com', options);
    });

    it('should include detailed error information for failures', async () => {
      const scenarios = ['Test scenario'];

      mockAnalyzer.analyze.mockResolvedValue(mockAnalysis);
      mockGenerator.generate.mockRejectedValue(new Error('Detailed error message'));

      const result = await batchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123'
      );

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Detailed error message');
      expect(result.failed[0].scenario).toBe('Test scenario');
    });

    it('should handle non-Error exceptions', async () => {
      const scenarios = ['Test scenario'];

      mockAnalyzer.analyze.mockResolvedValue(mockAnalysis);
      mockGenerator.generate.mockRejectedValue('String error');

      const result = await batchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123'
      );

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error).toBe('Unknown error');
    });

    it('should reuse analysis for all scenarios', async () => {
      const scenarios = [
        'Scenario 1',
        'Scenario 2',
        'Scenario 3',
      ];

      mockAnalyzer.analyze.mockResolvedValue(mockAnalysis);
      mockGenerator.generate.mockResolvedValue(mockTestCase);

      const result = await batchProcessor.generateBatch(
        'https://example.com',
        scenarios,
        'project-123',
        'suite-123',
        'user-123'
      );

      // Analysis should be called only once
      expect(mockAnalyzer.analyze).toHaveBeenCalledTimes(1);

      // Generator should be called for each scenario
      expect(mockGenerator.generate).toHaveBeenCalledTimes(3);

      // Verify all scenarios were processed successfully
      expect(result.successful).toHaveLength(3);
      expect(result.failed).toHaveLength(0);
      expect(result.summary.total).toBe(3);
      expect(result.summary.succeeded).toBe(3);
    });
  });
});
