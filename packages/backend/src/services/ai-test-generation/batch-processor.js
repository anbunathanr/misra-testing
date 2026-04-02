"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessor = void 0;
const ai_engine_factory_1 = require("./ai-engine-factory");
const DEFAULT_CONFIG = {
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
class BatchProcessor {
    analyzer;
    generator;
    aiEngine;
    config;
    constructor(analyzer, generator, config = DEFAULT_CONFIG) {
        this.analyzer = analyzer;
        this.generator = generator;
        this.aiEngine = ai_engine_factory_1.AIEngineFactory.create();
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
    async generateBatch(url, scenarios, projectId, suiteId, userId, options) {
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
        }
        catch (error) {
            console.error('[Batch Processor] Failed to analyze application:', error);
            // If analysis fails, all scenarios fail
            const failed = scenarios.map(scenario => ({
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
        const results = await this.processScenarios(scenarios, analysis, projectId, suiteId, userId);
        // Step 3: Separate successful and failed results
        const successful = [];
        const failed = [];
        results.forEach(result => {
            if (result.success && result.testCase) {
                successful.push(result.testCase);
            }
            else {
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
    async processScenarios(scenarios, analysis, projectId, suiteId, userId) {
        const results = [];
        const maxConcurrency = this.config.maxConcurrency || 3;
        // Process scenarios in batches to control concurrency
        for (let i = 0; i < scenarios.length; i += maxConcurrency) {
            const batch = scenarios.slice(i, i + maxConcurrency);
            const batchPromises = batch.map(scenario => this.generateSingleTest(scenario, analysis, projectId, suiteId, userId));
            // Wait for current batch to complete
            const batchResults = await Promise.allSettled(batchPromises);
            // Process results
            batchResults.forEach((result, index) => {
                const scenario = batch[index];
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
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
    async generateSingleTest(scenario, analysis, projectId, suiteId, userId) {
        try {
            console.log(`[Batch Processor] Generating test for scenario: ${scenario.substring(0, 50)}...`);
            // First, generate test specification from AI
            const specification = await this.aiEngine.generateTestSpecification(analysis, scenario);
            // Then, generate the test case from the specification
            const testCase = await this.generator.generate(specification, analysis, projectId, suiteId, userId);
            console.log(`[Batch Processor] Successfully generated test: ${testCase.name}`);
            return {
                scenario,
                success: true,
                testCase,
            };
        }
        catch (error) {
            console.error(`[Batch Processor] Failed to generate test for scenario: ${scenario}`, error);
            return {
                scenario,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.BatchProcessor = BatchProcessor;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2gtcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmF0Y2gtcHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDJEQUFpRTtBQVlqRSxNQUFNLGNBQWMsR0FBeUI7SUFDM0MsY0FBYyxFQUFFLENBQUM7SUFDakIsZUFBZSxFQUFFLElBQUk7Q0FDdEIsQ0FBQztBQUVGOzs7Ozs7R0FNRztBQUNILE1BQWEsY0FBYztJQUNqQixRQUFRLENBQXNCO0lBQzlCLFNBQVMsQ0FBZ0I7SUFDekIsUUFBUSxDQUFZO0lBQ3BCLE1BQU0sQ0FBdUI7SUFFckMsWUFDRSxRQUE2QixFQUM3QixTQUF3QixFQUN4QixTQUErQixjQUFjO1FBRTdDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsbUNBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxjQUFjLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQ2pCLEdBQVcsRUFDWCxTQUFtQixFQUNuQixTQUFpQixFQUNqQixPQUFlLEVBQ2YsTUFBYyxFQUNkLE9BQXlCO1FBRXpCLE9BQU8sQ0FBQyxHQUFHLENBQUMsbURBQW1ELFNBQVMsQ0FBQyxNQUFNLFlBQVksQ0FBQyxDQUFDO1FBRTdGLGtCQUFrQjtRQUNsQixJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDekMsTUFBTSxJQUFJLEtBQUssQ0FBQyx3REFBd0QsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsU0FBUyxJQUFJLENBQUMsT0FBTyxJQUFJLENB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LEtBQUssQ0FBQyxrQkFBa0IsQ0FDOUIsUUFBZ0IsRUFDaEIsUUFBYSxFQUNiLFNBQWlCLEVBQ2pCLE9BQWUsRUFDZixNQUFjO1FBRWQsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtREFBbUQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRS9GLDZDQUE2QztZQUM3QyxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1lBRXhGLHNEQUFzRDtZQUN0RCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUM1QyxhQUFhLEVBQ2IsUUFBUSxFQUNSLFNBQVMsRUFDVCxPQUFPLEVBQ1AsTUFBTSxDQUNQLENBQUM7WUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLGtEQUFrRCxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUUvRSxPQUFPO2dCQUNMLFFBQVE7Z0JBQ1IsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsUUFBUTthQUNULENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkRBQTJELFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBRTVGLE9BQU87Z0JBQ0wsUUFBUTtnQkFDUixPQUFPLEVBQUUsS0FBSztnQkFDZCxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNoRSxDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7Q0FDRjtBQWxORCx3Q0FrTkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBsaWNhdGlvbkFuYWx5emVyIH0gZnJvbSAnLi9hcHBsaWNhdGlvbi1hbmFseXplcic7XHJcbmltcG9ydCB7IFRlc3RHZW5lcmF0b3IgfSBmcm9tICcuL3Rlc3QtZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgQUlFbmdpbmVGYWN0b3J5LCBJQUlFbmdpbmUgfSBmcm9tICcuL2FpLWVuZ2luZS1mYWN0b3J5JztcclxuaW1wb3J0IHsgQmF0Y2hSZXN1bHQsIEZhaWxlZEdlbmVyYXRpb24sIEFuYWx5c2lzT3B0aW9ucyB9IGZyb20gJy4uLy4uL3R5cGVzL2FpLXRlc3QtZ2VuZXJhdGlvbic7XHJcbmltcG9ydCB7IFRlc3RDYXNlIH0gZnJvbSAnLi4vLi4vdHlwZXMvdGVzdC1jYXNlJztcclxuXHJcbi8qKlxyXG4gKiBCYXRjaCBQcm9jZXNzb3IgQ29uZmlndXJhdGlvblxyXG4gKi9cclxuaW50ZXJmYWNlIEJhdGNoUHJvY2Vzc29yQ29uZmlnIHtcclxuICBtYXhDb25jdXJyZW5jeT86IG51bWJlcjsgIC8vIE1heGltdW0gbnVtYmVyIG9mIHBhcmFsbGVsIGdlbmVyYXRpb25zIChkZWZhdWx0OiAzKVxyXG4gIGNvbnRpbnVlT25FcnJvcj86IGJvb2xlYW47IC8vIENvbnRpbnVlIHByb2Nlc3NpbmcgaWYgaW5kaXZpZHVhbCBnZW5lcmF0aW9ucyBmYWlsIChkZWZhdWx0OiB0cnVlKVxyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX0NPTkZJRzogQmF0Y2hQcm9jZXNzb3JDb25maWcgPSB7XHJcbiAgbWF4Q29uY3VycmVuY3k6IDMsXHJcbiAgY29udGludWVPbkVycm9yOiB0cnVlLFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEJhdGNoIFByb2Nlc3NvclxyXG4gKiBcclxuICogR2VuZXJhdGVzIG11bHRpcGxlIHRlc3QgY2FzZXMgaW4gYSBzaW5nbGUgb3BlcmF0aW9uLlxyXG4gKiBBbmFseXplcyB0aGUgYXBwbGljYXRpb24gb25jZSBhbmQgcmV1c2VzIHRoZSBhbmFseXNpcyBmb3IgYWxsIHNjZW5hcmlvcy5cclxuICogUHJvY2Vzc2VzIHNjZW5hcmlvcyBpbiBwYXJhbGxlbCB3aXRoIGNvbmZpZ3VyYWJsZSBjb25jdXJyZW5jeS5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBCYXRjaFByb2Nlc3NvciB7XHJcbiAgcHJpdmF0ZSBhbmFseXplcjogQXBwbGljYXRpb25BbmFseXplcjtcclxuICBwcml2YXRlIGdlbmVyYXRvcjogVGVzdEdlbmVyYXRvcjtcclxuICBwcml2YXRlIGFpRW5naW5lOiBJQUlFbmdpbmU7XHJcbiAgcHJpdmF0ZSBjb25maWc6IEJhdGNoUHJvY2Vzc29yQ29uZmlnO1xyXG5cclxuICBjb25zdHJ1Y3RvcihcclxuICAgIGFuYWx5emVyOiBBcHBsaWNhdGlvbkFuYWx5emVyLFxyXG4gICAgZ2VuZXJhdG9yOiBUZXN0R2VuZXJhdG9yLFxyXG4gICAgY29uZmlnOiBCYXRjaFByb2Nlc3NvckNvbmZpZyA9IERFRkFVTFRfQ09ORklHXHJcbiAgKSB7XHJcbiAgICB0aGlzLmFuYWx5emVyID0gYW5hbHl6ZXI7XHJcbiAgICB0aGlzLmdlbmVyYXRvciA9IGdlbmVyYXRvcjtcclxuICAgIHRoaXMuYWlFbmdpbmUgPSBBSUVuZ2luZUZhY3RvcnkuY3JlYXRlKCk7XHJcbiAgICB0aGlzLmNvbmZpZyA9IHsgLi4uREVGQVVMVF9DT05GSUcsIC4uLmNvbmZpZyB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgbXVsdGlwbGUgdGVzdCBjYXNlcyBmb3IgZGlmZmVyZW50IHNjZW5hcmlvc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1cmwgLSBVUkwgb2YgdGhlIHdlYiBhcHBsaWNhdGlvbiB0byBhbmFseXplXHJcbiAgICogQHBhcmFtIHNjZW5hcmlvcyAtIEFycmF5IG9mIHNjZW5hcmlvIGRlc2NyaXB0aW9uc1xyXG4gICAqIEBwYXJhbSBwcm9qZWN0SWQgLSBQcm9qZWN0IElEIGZvciB0aGUgZ2VuZXJhdGVkIHRlc3RzXHJcbiAgICogQHBhcmFtIHN1aXRlSWQgLSBTdWl0ZSBJRCBmb3IgdGhlIGdlbmVyYXRlZCB0ZXN0c1xyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEIHdobyBpbml0aWF0ZWQgdGhlIGdlbmVyYXRpb25cclxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGFuYWx5c2lzIG9wdGlvbnNcclxuICAgKiBAcmV0dXJucyBCYXRjaCByZXN1bHQgd2l0aCBzdWNjZXNzZnVsIGFuZCBmYWlsZWQgZ2VuZXJhdGlvbnNcclxuICAgKi9cclxuICBhc3luYyBnZW5lcmF0ZUJhdGNoKFxyXG4gICAgdXJsOiBzdHJpbmcsXHJcbiAgICBzY2VuYXJpb3M6IHN0cmluZ1tdLFxyXG4gICAgcHJvamVjdElkOiBzdHJpbmcsXHJcbiAgICBzdWl0ZUlkOiBzdHJpbmcsXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIG9wdGlvbnM/OiBBbmFseXNpc09wdGlvbnNcclxuICApOiBQcm9taXNlPEJhdGNoUmVzdWx0PiB7XHJcbiAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gU3RhcnRpbmcgYmF0Y2ggZ2VuZXJhdGlvbiBmb3IgJHtzY2VuYXJpb3MubGVuZ3RofSBzY2VuYXJpb3NgKTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dHNcclxuICAgIGlmICghc2NlbmFyaW9zIHx8IHNjZW5hcmlvcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdCBsZWFzdCBvbmUgc2NlbmFyaW8gaXMgcmVxdWlyZWQgZm9yIGJhdGNoIGdlbmVyYXRpb24nKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXVybCB8fCAhcHJvamVjdElkIHx8ICFzdWl0ZUlkIHx8ICF1c2VySWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVUkwsIHByb2plY3RJZCwgc3VpdGVJZCwgYW5kIHVzZXJJZCBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdGVwIDE6IEFuYWx5emUgdGhlIGFwcGxpY2F0aW9uIG9uY2VcclxuICAgIGNvbnNvbGUubG9nKGBbQmF0Y2ggUHJvY2Vzc29yXSBBbmFseXppbmcgYXBwbGljYXRpb246ICR7dXJsfWApO1xyXG4gICAgbGV0IGFuYWx5c2lzO1xyXG4gICAgdHJ5IHtcclxuICAgICAgYW5hbHlzaXMgPSBhd2FpdCB0aGlzLmFuYWx5emVyLmFuYWx5emUodXJsLCBvcHRpb25zKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tCYXRjaCBQcm9jZXNzb3JdIEZhaWxlZCB0byBhbmFseXplIGFwcGxpY2F0aW9uOicsIGVycm9yKTtcclxuICAgICAgLy8gSWYgYW5hbHlzaXMgZmFpbHMsIGFsbCBzY2VuYXJpb3MgZmFpbFxyXG4gICAgICBjb25zdCBmYWlsZWQ6IEZhaWxlZEdlbmVyYXRpb25bXSA9IHNjZW5hcmlvcy5tYXAoc2NlbmFyaW8gPT4gKHtcclxuICAgICAgICBzY2VuYXJpbyxcclxuICAgICAgICBlcnJvcjogYEFwcGxpY2F0aW9uIGFuYWx5c2lzIGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3NmdWw6IFtdLFxyXG4gICAgICAgIGZhaWxlZCxcclxuICAgICAgICBzdW1tYXJ5OiB7XHJcbiAgICAgICAgICB0b3RhbDogc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgICAgIHN1Y2NlZWRlZDogMCxcclxuICAgICAgICAgIGZhaWxlZDogc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgMjogUHJvY2VzcyBzY2VuYXJpb3MgaW4gcGFyYWxsZWwgd2l0aCBjb25jdXJyZW5jeSBsaW1pdFxyXG4gICAgY29uc29sZS5sb2coYFtCYXRjaCBQcm9jZXNzb3JdIFByb2Nlc3NpbmcgJHtzY2VuYXJpb3MubGVuZ3RofSBzY2VuYXJpb3Mgd2l0aCBjb25jdXJyZW5jeSAke3RoaXMuY29uZmlnLm1heENvbmN1cnJlbmN5fWApO1xyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMucHJvY2Vzc1NjZW5hcmlvcyhcclxuICAgICAgc2NlbmFyaW9zLFxyXG4gICAgICBhbmFseXNpcyxcclxuICAgICAgcHJvamVjdElkLFxyXG4gICAgICBzdWl0ZUlkLFxyXG4gICAgICB1c2VySWRcclxuICAgICk7XHJcblxyXG4gICAgLy8gU3RlcCAzOiBTZXBhcmF0ZSBzdWNjZXNzZnVsIGFuZCBmYWlsZWQgcmVzdWx0c1xyXG4gICAgY29uc3Qgc3VjY2Vzc2Z1bDogVGVzdENhc2VbXSA9IFtdO1xyXG4gICAgY29uc3QgZmFpbGVkOiBGYWlsZWRHZW5lcmF0aW9uW10gPSBbXTtcclxuXHJcbiAgICByZXN1bHRzLmZvckVhY2gocmVzdWx0ID0+IHtcclxuICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC50ZXN0Q2FzZSkge1xyXG4gICAgICAgIHN1Y2Nlc3NmdWwucHVzaChyZXN1bHQudGVzdENhc2UpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZhaWxlZC5wdXNoKHtcclxuICAgICAgICAgIHNjZW5hcmlvOiByZXN1bHQuc2NlbmFyaW8sXHJcbiAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yIHx8ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RlcCA0OiBCdWlsZCBzdW1tYXJ5XHJcbiAgICBjb25zdCBzdW1tYXJ5ID0ge1xyXG4gICAgICB0b3RhbDogc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgc3VjY2VlZGVkOiBzdWNjZXNzZnVsLmxlbmd0aCxcclxuICAgICAgZmFpbGVkOiBmYWlsZWQubGVuZ3RoLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gQmF0Y2ggZ2VuZXJhdGlvbiBjb21wbGV0ZTogJHtzdW1tYXJ5LnN1Y2NlZWRlZH0gc3VjY2VlZGVkLCAke3N1bW1hcnkuZmFpbGVkfSBmYWlsZWRgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzZnVsLFxyXG4gICAgICBmYWlsZWQsXHJcbiAgICAgIHN1bW1hcnksXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHJvY2VzcyBzY2VuYXJpb3Mgd2l0aCBjb25jdXJyZW5jeSBjb250cm9sXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHNjZW5hcmlvcyAtIEFycmF5IG9mIHNjZW5hcmlvIGRlc2NyaXB0aW9uc1xyXG4gICAqIEBwYXJhbSBhbmFseXNpcyAtIEFwcGxpY2F0aW9uIGFuYWx5c2lzIHRvIHJldXNlXHJcbiAgICogQHBhcmFtIHByb2plY3RJZCAtIFByb2plY3QgSURcclxuICAgKiBAcGFyYW0gc3VpdGVJZCAtIFN1aXRlIElEXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBnZW5lcmF0aW9uIHJlc3VsdHNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHByb2Nlc3NTY2VuYXJpb3MoXHJcbiAgICBzY2VuYXJpb3M6IHN0cmluZ1tdLFxyXG4gICAgYW5hbHlzaXM6IGFueSxcclxuICAgIHByb2plY3RJZDogc3RyaW5nLFxyXG4gICAgc3VpdGVJZDogc3RyaW5nLFxyXG4gICAgdXNlcklkOiBzdHJpbmdcclxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXN1bHRbXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogR2VuZXJhdGlvblJlc3VsdFtdID0gW107XHJcbiAgICBjb25zdCBtYXhDb25jdXJyZW5jeSA9IHRoaXMuY29uZmlnLm1heENvbmN1cnJlbmN5IHx8IDM7XHJcblxyXG4gICAgLy8gUHJvY2VzcyBzY2VuYXJpb3MgaW4gYmF0Y2hlcyB0byBjb250cm9sIGNvbmN1cnJlbmN5XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjZW5hcmlvcy5sZW5ndGg7IGkgKz0gbWF4Q29uY3VycmVuY3kpIHtcclxuICAgICAgY29uc3QgYmF0Y2ggPSBzY2VuYXJpb3Muc2xpY2UoaSwgaSArIG1heENvbmN1cnJlbmN5KTtcclxuICAgICAgY29uc3QgYmF0Y2hQcm9taXNlcyA9IGJhdGNoLm1hcChzY2VuYXJpbyA9PlxyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVTaW5nbGVUZXN0KHNjZW5hcmlvLCBhbmFseXNpcywgcHJvamVjdElkLCBzdWl0ZUlkLCB1c2VySWQpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBXYWl0IGZvciBjdXJyZW50IGJhdGNoIHRvIGNvbXBsZXRlXHJcbiAgICAgIGNvbnN0IGJhdGNoUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChiYXRjaFByb21pc2VzKTtcclxuXHJcbiAgICAgIC8vIFByb2Nlc3MgcmVzdWx0c1xyXG4gICAgICBiYXRjaFJlc3VsdHMuZm9yRWFjaCgocmVzdWx0LCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHNjZW5hcmlvID0gYmF0Y2hbaW5kZXhdO1xyXG4gICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJykge1xyXG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdC52YWx1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIFByb21pc2UgcmVqZWN0ZWRcclxuICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHNjZW5hcmlvLFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgZXJyb3I6IHJlc3VsdC5yZWFzb24gaW5zdGFuY2VvZiBFcnJvciA/IHJlc3VsdC5yZWFzb24ubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIHNpbmdsZSB0ZXN0IGNhc2VcclxuICAgKiBcclxuICAgKiBAcGFyYW0gc2NlbmFyaW8gLSBTY2VuYXJpbyBkZXNjcmlwdGlvblxyXG4gICAqIEBwYXJhbSBhbmFseXNpcyAtIEFwcGxpY2F0aW9uIGFuYWx5c2lzXHJcbiAgICogQHBhcmFtIHByb2plY3RJZCAtIFByb2plY3QgSURcclxuICAgKiBAcGFyYW0gc3VpdGVJZCAtIFN1aXRlIElEXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBHZW5lcmF0aW9uIHJlc3VsdFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVTaW5nbGVUZXN0KFxyXG4gICAgc2NlbmFyaW86IHN0cmluZyxcclxuICAgIGFuYWx5c2lzOiBhbnksXHJcbiAgICBwcm9qZWN0SWQ6IHN0cmluZyxcclxuICAgIHN1aXRlSWQ6IHN0cmluZyxcclxuICAgIHVzZXJJZDogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzdWx0PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gR2VuZXJhdGluZyB0ZXN0IGZvciBzY2VuYXJpbzogJHtzY2VuYXJpby5zdWJzdHJpbmcoMCwgNTApfS4uLmApO1xyXG5cclxuICAgICAgLy8gRmlyc3QsIGdlbmVyYXRlIHRlc3Qgc3BlY2lmaWNhdGlvbiBmcm9tIEFJXHJcbiAgICAgIGNvbnN0IHNwZWNpZmljYXRpb24gPSBhd2FpdCB0aGlzLmFpRW5naW5lLmdlbmVyYXRlVGVzdFNwZWNpZmljYXRpb24oYW5hbHlzaXMsIHNjZW5hcmlvKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFRoZW4sIGdlbmVyYXRlIHRoZSB0ZXN0IGNhc2UgZnJvbSB0aGUgc3BlY2lmaWNhdGlvblxyXG4gICAgICBjb25zdCB0ZXN0Q2FzZSA9IGF3YWl0IHRoaXMuZ2VuZXJhdG9yLmdlbmVyYXRlKFxyXG4gICAgICAgIHNwZWNpZmljYXRpb24sXHJcbiAgICAgICAgYW5hbHlzaXMsXHJcbiAgICAgICAgcHJvamVjdElkLFxyXG4gICAgICAgIHN1aXRlSWQsXHJcbiAgICAgICAgdXNlcklkXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gU3VjY2Vzc2Z1bGx5IGdlbmVyYXRlZCB0ZXN0OiAke3Rlc3RDYXNlLm5hbWV9YCk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHNjZW5hcmlvLFxyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgdGVzdENhc2UsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBbQmF0Y2ggUHJvY2Vzc29yXSBGYWlsZWQgdG8gZ2VuZXJhdGUgdGVzdCBmb3Igc2NlbmFyaW86ICR7c2NlbmFyaW99YCwgZXJyb3IpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzY2VuYXJpbyxcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSW50ZXJuYWwgdHlwZSBmb3IgdHJhY2tpbmcgZ2VuZXJhdGlvbiByZXN1bHRzXHJcbiAqL1xyXG5pbnRlcmZhY2UgR2VuZXJhdGlvblJlc3VsdCB7XHJcbiAgc2NlbmFyaW86IHN0cmluZztcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIHRlc3RDYXNlPzogVGVzdENhc2U7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbn1cclxuIl19