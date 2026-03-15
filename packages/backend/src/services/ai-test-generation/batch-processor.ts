import { ApplicationAnalyzer } from './application-analyzer';
import { TestGenerator } from './test-generator';
import { AIEngine } from './ai-engine';
import { BatchResult, FailedGeneration, AnalysisOptions } from '../../types/ai-test-generation';
import { TestCase } from '../../types/test-case';

/**
 * Batch Processor Configuration
 */
interface BatchProcessorConfig {
  maxConcurrency?: number;  // Maximum number of parallel generations (default: 3)
  continueOnError?: boolean; // Continue processing if individual generations fail (default: true)
}

const DEFAULT_CONFIG: BatchProcessorConfig = {
  maxConcurrency: 3,
  continueOnError: true,
};

/**
 * Batch Processor
 * 
 * Generates multiple test cases in a single operation.
 * Analyzes the application once and reuses the analysis for all scenarios.
 * Processes scenarios in parallel with configurable concurrency.
 */
export class BatchProcessor {
  private analyzer: ApplicationAnalyzer;
  private generator: TestGenerator;
  private aiEngine: AIEngine;
  private config: BatchProcessorConfig;

  constructor(
    analyzer: ApplicationAnalyzer,
    generator: TestGenerator,
    config: BatchProcessorConfig = DEFAULT_CONFIG
  ) {
    this.analyzer = analyzer;
    this.generator = generator;
    this.aiEngine = new AIEngine();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate multiple test cases for different scenarios
   * 
   * @param url - URL of the web application to analyze
   * @param scenarios - Array of scenario descriptions
   * @param projectId - Project ID for the generated tests
   * @param suiteId - Suite ID for the generated tests
   * @param userId - User ID who initiated the generation
   * @param options - Optional analysis options
   * @returns Batch result with successful and failed generations
   */
  async generateBatch(
    url: string,
    scenarios: string[],
    projectId: string,
    suiteId: string,
    userId: string,
    options?: AnalysisOptions
  ): Promise<BatchResult> {
    console.log(`[Batch Processor] Starting batch generation for ${scenarios.length} scenarios`);

    // Validate inputs
    if (!scenarios || scenarios.length === 0) {
      throw new Error('At least one scenario is required for batch generation');
    }

    if (!url || !projectId || !suiteId || !userId) {
      throw new Error('URL, projectId, suiteId, and userId are required');
    }

    // Step 1: Analyze the application once
    console.log(`[Batch Processor] Analyzing application: ${url}`);
    let analysis;
    try {
      analysis = await this.analyzer.analyze(url, options);
    } catch (error) {
      console.error('[Batch Processor] Failed to analyze application:', error);
      // If analysis fails, all scenarios fail
      const failed: FailedGeneration[] = scenarios.map(scenario => ({
        scenario,
        error: `Application analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }));

      return {
        successful: [],
        failed,
        summary: {
          total: scenarios.length,
          succeeded: 0,
          failed: scenarios.length,
        },
      };
    }

    // Step 2: Process scenarios in parallel with concurrency limit
    console.log(`[Batch Processor] Processing ${scenarios.length} scenarios with concurrency ${this.config.maxConcurrency}`);
    const results = await this.processScenarios(
      scenarios,
      analysis,
      projectId,
      suiteId,
      userId
    );

    // Step 3: Separate successful and failed results
    const successful: TestCase[] = [];
    const failed: FailedGeneration[] = [];

    results.forEach(result => {
      if (result.success && result.testCase) {
        successful.push(result.testCase);
      } else {
        failed.push({
          scenario: result.scenario,
          error: result.error || 'Unknown error',
        });
      }
    });

    // Step 4: Build summary
    const summary = {
      total: scenarios.length,
      succeeded: successful.length,
      failed: failed.length,
    };

    console.log(`[Batch Processor] Batch generation complete: ${summary.succeeded} succeeded, ${summary.failed} failed`);

    return {
      successful,
      failed,
      summary,
    };
  }

  /**
   * Process scenarios with concurrency control
   * 
   * @param scenarios - Array of scenario descriptions
   * @param analysis - Application analysis to reuse
   * @param projectId - Project ID
   * @param suiteId - Suite ID
   * @param userId - User ID
   * @returns Array of generation results
   */
  private async processScenarios(
    scenarios: string[],
    analysis: any,
    projectId: string,
    suiteId: string,
    userId: string
  ): Promise<GenerationResult[]> {
    const results: GenerationResult[] = [];
    const maxConcurrency = this.config.maxConcurrency || 3;

    // Process scenarios in batches to control concurrency
    for (let i = 0; i < scenarios.length; i += maxConcurrency) {
      const batch = scenarios.slice(i, i + maxConcurrency);
      const batchPromises = batch.map(scenario =>
        this.generateSingleTest(scenario, analysis, projectId, suiteId, userId)
      );

      // Wait for current batch to complete
      const batchResults = await Promise.allSettled(batchPromises);

      // Process results
      batchResults.forEach((result, index) => {
        const scenario = batch[index];
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Promise rejected
          results.push({
            scenario,
            success: false,
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          });
        }
      });
    }

    return results;
  }

  /**
   * Generate a single test case
   * 
   * @param scenario - Scenario description
   * @param analysis - Application analysis
   * @param projectId - Project ID
   * @param suiteId - Suite ID
   * @param userId - User ID
   * @returns Generation result
   */
  private async generateSingleTest(
    scenario: string,
    analysis: any,
    projectId: string,
    suiteId: string,
    userId: string
  ): Promise<GenerationResult> {
    try {
      console.log(`[Batch Processor] Generating test for scenario: ${scenario.substring(0, 50)}...`);

      // First, generate test specification from AI
      const specification = await this.aiEngine.generateTestSpecification(analysis, scenario);
      
      // Then, generate the test case from the specification
      const testCase = await this.generator.generate(
        specification,
        analysis,
        projectId,
        suiteId,
        userId
      );

      console.log(`[Batch Processor] Successfully generated test: ${testCase.name}`);

      return {
        scenario,
        success: true,
        testCase,
      };
    } catch (error) {
      console.error(`[Batch Processor] Failed to generate test for scenario: ${scenario}`, error);

      return {
        scenario,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

/**
 * Internal type for tracking generation results
 */
interface GenerationResult {
  scenario: string;
  success: boolean;
  testCase?: TestCase;
  error?: string;
}
