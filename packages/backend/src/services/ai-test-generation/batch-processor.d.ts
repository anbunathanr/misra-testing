import { ApplicationAnalyzer } from './application-analyzer';
import { TestGenerator } from './test-generator';
import { BatchResult, AnalysisOptions } from '../../types/ai-test-generation';
/**
 * Batch Processor Configuration
 */
interface BatchProcessorConfig {
    maxConcurrency?: number;
    continueOnError?: boolean;
}
/**
 * Batch Processor
 *
 * Generates multiple test cases in a single operation.
 * Analyzes the application once and reuses the analysis for all scenarios.
 * Processes scenarios in parallel with configurable concurrency.
 */
export declare class BatchProcessor {
    private analyzer;
    private generator;
    private aiEngine;
    private config;
    constructor(analyzer: ApplicationAnalyzer, generator: TestGenerator, config?: BatchProcessorConfig);
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
    generateBatch(url: string, scenarios: string[], projectId: string, suiteId: string, userId: string, options?: AnalysisOptions): Promise<BatchResult>;
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
    private processScenarios;
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
    private generateSingleTest;
}
export {};
