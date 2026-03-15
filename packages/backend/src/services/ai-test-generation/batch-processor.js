"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BatchProcessor = void 0;
const ai_engine_1 = require("./ai-engine");
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
        this.aiEngine = new ai_engine_1.AIEngine();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2gtcHJvY2Vzc29yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYmF0Y2gtcHJvY2Vzc29yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLDJDQUF1QztBQVl2QyxNQUFNLGNBQWMsR0FBeUI7SUFDM0MsY0FBYyxFQUFFLENBQUM7SUFDakIsZUFBZSxFQUFFLElBQUk7Q0FDdEIsQ0FBQztBQUVGOzs7Ozs7R0FNRztBQUNILE1BQWEsY0FBYztJQUNqQixRQUFRLENBQXNCO0lBQzlCLFNBQVMsQ0FBZ0I7SUFDekIsUUFBUSxDQUFXO0lBQ25CLE1BQU0sQ0FBdUI7SUFFckMsWUFDRSxRQUE2QixFQUM3QixTQUF3QixFQUN4QixTQUErQixjQUFjO1FBRTdDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFDO1FBQzNCLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxvQkFBUSxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLE1BQU0sR0FBRyxFQUFFLEdBQUcsY0FBYyxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7SUFDakQsQ0FBQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSCxLQUFLLENBQUMsYUFBYSxDQUNqQixHQUFXLEVBQ1gsU0FBbUIsRUFDbkIsU0FBaUIsRUFDakIsT0FBZSxFQUNmLE1BQWMsRUFDZCxPQUF5QjtRQUV6QixPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxTQUFTLENBQUMsTUFBTSxZQUFZLENBQUMsQ0FBQztRQUU3RixrQkFBa0I7UUFDbEIsSUFBSSxDQUFDLFNBQVMsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0RBQXdELENBQUMsQ0FBQztRQUM1RSxDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLE1B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LENBQUMsa0JBQWtCLENBQzlCLFFBQWdCLEVBQ2hCLFFBQWEsRUFDYixTQUFpQixFQUNqQixPQUFlLEVBQ2YsTUFBYztRQUVkLElBQUksQ0FBQztZQUNILE9BQU8sQ0FBQyxHQUFHLENBQUMsbURBQW1ELFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUvRiw2Q0FBNkM7WUFDN0MsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUV4RixzREFBc0Q7WUFDdEQsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FDNUMsYUFBYSxFQUNiLFFBQVEsRUFDUixTQUFTLEVBQ1QsT0FBTyxFQUNQLE1BQU0sQ0FDUCxDQUFDO1lBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrREFBa0QsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7WUFFL0UsT0FBTztnQkFDTCxRQUFRO2dCQUNSLE9BQU8sRUFBRSxJQUFJO2dCQUNiLFFBQVE7YUFDVCxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDJEQUEyRCxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUU1RixPQUFPO2dCQUNMLFFBQVE7Z0JBQ1IsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFsTkQsd0NBa05DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQXBwbGljYXRpb25BbmFseXplciB9IGZyb20gJy4vYXBwbGljYXRpb24tYW5hbHl6ZXInO1xyXG5pbXBvcnQgeyBUZXN0R2VuZXJhdG9yIH0gZnJvbSAnLi90ZXN0LWdlbmVyYXRvcic7XHJcbmltcG9ydCB7IEFJRW5naW5lIH0gZnJvbSAnLi9haS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBCYXRjaFJlc3VsdCwgRmFpbGVkR2VuZXJhdGlvbiwgQW5hbHlzaXNPcHRpb25zIH0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuaW1wb3J0IHsgVGVzdENhc2UgfSBmcm9tICcuLi8uLi90eXBlcy90ZXN0LWNhc2UnO1xyXG5cclxuLyoqXHJcbiAqIEJhdGNoIFByb2Nlc3NvciBDb25maWd1cmF0aW9uXHJcbiAqL1xyXG5pbnRlcmZhY2UgQmF0Y2hQcm9jZXNzb3JDb25maWcge1xyXG4gIG1heENvbmN1cnJlbmN5PzogbnVtYmVyOyAgLy8gTWF4aW11bSBudW1iZXIgb2YgcGFyYWxsZWwgZ2VuZXJhdGlvbnMgKGRlZmF1bHQ6IDMpXHJcbiAgY29udGludWVPbkVycm9yPzogYm9vbGVhbjsgLy8gQ29udGludWUgcHJvY2Vzc2luZyBpZiBpbmRpdmlkdWFsIGdlbmVyYXRpb25zIGZhaWwgKGRlZmF1bHQ6IHRydWUpXHJcbn1cclxuXHJcbmNvbnN0IERFRkFVTFRfQ09ORklHOiBCYXRjaFByb2Nlc3NvckNvbmZpZyA9IHtcclxuICBtYXhDb25jdXJyZW5jeTogMyxcclxuICBjb250aW51ZU9uRXJyb3I6IHRydWUsXHJcbn07XHJcblxyXG4vKipcclxuICogQmF0Y2ggUHJvY2Vzc29yXHJcbiAqIFxyXG4gKiBHZW5lcmF0ZXMgbXVsdGlwbGUgdGVzdCBjYXNlcyBpbiBhIHNpbmdsZSBvcGVyYXRpb24uXHJcbiAqIEFuYWx5emVzIHRoZSBhcHBsaWNhdGlvbiBvbmNlIGFuZCByZXVzZXMgdGhlIGFuYWx5c2lzIGZvciBhbGwgc2NlbmFyaW9zLlxyXG4gKiBQcm9jZXNzZXMgc2NlbmFyaW9zIGluIHBhcmFsbGVsIHdpdGggY29uZmlndXJhYmxlIGNvbmN1cnJlbmN5LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEJhdGNoUHJvY2Vzc29yIHtcclxuICBwcml2YXRlIGFuYWx5emVyOiBBcHBsaWNhdGlvbkFuYWx5emVyO1xyXG4gIHByaXZhdGUgZ2VuZXJhdG9yOiBUZXN0R2VuZXJhdG9yO1xyXG4gIHByaXZhdGUgYWlFbmdpbmU6IEFJRW5naW5lO1xyXG4gIHByaXZhdGUgY29uZmlnOiBCYXRjaFByb2Nlc3NvckNvbmZpZztcclxuXHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBhbmFseXplcjogQXBwbGljYXRpb25BbmFseXplcixcclxuICAgIGdlbmVyYXRvcjogVGVzdEdlbmVyYXRvcixcclxuICAgIGNvbmZpZzogQmF0Y2hQcm9jZXNzb3JDb25maWcgPSBERUZBVUxUX0NPTkZJR1xyXG4gICkge1xyXG4gICAgdGhpcy5hbmFseXplciA9IGFuYWx5emVyO1xyXG4gICAgdGhpcy5nZW5lcmF0b3IgPSBnZW5lcmF0b3I7XHJcbiAgICB0aGlzLmFpRW5naW5lID0gbmV3IEFJRW5naW5lKCk7XHJcbiAgICB0aGlzLmNvbmZpZyA9IHsgLi4uREVGQVVMVF9DT05GSUcsIC4uLmNvbmZpZyB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgbXVsdGlwbGUgdGVzdCBjYXNlcyBmb3IgZGlmZmVyZW50IHNjZW5hcmlvc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB1cmwgLSBVUkwgb2YgdGhlIHdlYiBhcHBsaWNhdGlvbiB0byBhbmFseXplXHJcbiAgICogQHBhcmFtIHNjZW5hcmlvcyAtIEFycmF5IG9mIHNjZW5hcmlvIGRlc2NyaXB0aW9uc1xyXG4gICAqIEBwYXJhbSBwcm9qZWN0SWQgLSBQcm9qZWN0IElEIGZvciB0aGUgZ2VuZXJhdGVkIHRlc3RzXHJcbiAgICogQHBhcmFtIHN1aXRlSWQgLSBTdWl0ZSBJRCBmb3IgdGhlIGdlbmVyYXRlZCB0ZXN0c1xyXG4gICAqIEBwYXJhbSB1c2VySWQgLSBVc2VyIElEIHdobyBpbml0aWF0ZWQgdGhlIGdlbmVyYXRpb25cclxuICAgKiBAcGFyYW0gb3B0aW9ucyAtIE9wdGlvbmFsIGFuYWx5c2lzIG9wdGlvbnNcclxuICAgKiBAcmV0dXJucyBCYXRjaCByZXN1bHQgd2l0aCBzdWNjZXNzZnVsIGFuZCBmYWlsZWQgZ2VuZXJhdGlvbnNcclxuICAgKi9cclxuICBhc3luYyBnZW5lcmF0ZUJhdGNoKFxyXG4gICAgdXJsOiBzdHJpbmcsXHJcbiAgICBzY2VuYXJpb3M6IHN0cmluZ1tdLFxyXG4gICAgcHJvamVjdElkOiBzdHJpbmcsXHJcbiAgICBzdWl0ZUlkOiBzdHJpbmcsXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIG9wdGlvbnM/OiBBbmFseXNpc09wdGlvbnNcclxuICApOiBQcm9taXNlPEJhdGNoUmVzdWx0PiB7XHJcbiAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gU3RhcnRpbmcgYmF0Y2ggZ2VuZXJhdGlvbiBmb3IgJHtzY2VuYXJpb3MubGVuZ3RofSBzY2VuYXJpb3NgKTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dHNcclxuICAgIGlmICghc2NlbmFyaW9zIHx8IHNjZW5hcmlvcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdBdCBsZWFzdCBvbmUgc2NlbmFyaW8gaXMgcmVxdWlyZWQgZm9yIGJhdGNoIGdlbmVyYXRpb24nKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXVybCB8fCAhcHJvamVjdElkIHx8ICFzdWl0ZUlkIHx8ICF1c2VySWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdVUkwsIHByb2plY3RJZCwgc3VpdGVJZCwgYW5kIHVzZXJJZCBhcmUgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTdGVwIDE6IEFuYWx5emUgdGhlIGFwcGxpY2F0aW9uIG9uY2VcclxuICAgIGNvbnNvbGUubG9nKGBbQmF0Y2ggUHJvY2Vzc29yXSBBbmFseXppbmcgYXBwbGljYXRpb246ICR7dXJsfWApO1xyXG4gICAgbGV0IGFuYWx5c2lzO1xyXG4gICAgdHJ5IHtcclxuICAgICAgYW5hbHlzaXMgPSBhd2FpdCB0aGlzLmFuYWx5emVyLmFuYWx5emUodXJsLCBvcHRpb25zKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tCYXRjaCBQcm9jZXNzb3JdIEZhaWxlZCB0byBhbmFseXplIGFwcGxpY2F0aW9uOicsIGVycm9yKTtcclxuICAgICAgLy8gSWYgYW5hbHlzaXMgZmFpbHMsIGFsbCBzY2VuYXJpb3MgZmFpbFxyXG4gICAgICBjb25zdCBmYWlsZWQ6IEZhaWxlZEdlbmVyYXRpb25bXSA9IHNjZW5hcmlvcy5tYXAoc2NlbmFyaW8gPT4gKHtcclxuICAgICAgICBzY2VuYXJpbyxcclxuICAgICAgICBlcnJvcjogYEFwcGxpY2F0aW9uIGFuYWx5c2lzIGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gLFxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3NmdWw6IFtdLFxyXG4gICAgICAgIGZhaWxlZCxcclxuICAgICAgICBzdW1tYXJ5OiB7XHJcbiAgICAgICAgICB0b3RhbDogc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgICAgIHN1Y2NlZWRlZDogMCxcclxuICAgICAgICAgIGZhaWxlZDogc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFN0ZXAgMjogUHJvY2VzcyBzY2VuYXJpb3MgaW4gcGFyYWxsZWwgd2l0aCBjb25jdXJyZW5jeSBsaW1pdFxyXG4gICAgY29uc29sZS5sb2coYFtCYXRjaCBQcm9jZXNzb3JdIFByb2Nlc3NpbmcgJHtzY2VuYXJpb3MubGVuZ3RofSBzY2VuYXJpb3Mgd2l0aCBjb25jdXJyZW5jeSAke3RoaXMuY29uZmlnLm1heENvbmN1cnJlbmN5fWApO1xyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHRoaXMucHJvY2Vzc1NjZW5hcmlvcyhcclxuICAgICAgc2NlbmFyaW9zLFxyXG4gICAgICBhbmFseXNpcyxcclxuICAgICAgcHJvamVjdElkLFxyXG4gICAgICBzdWl0ZUlkLFxyXG4gICAgICB1c2VySWRcclxuICAgICk7XHJcblxyXG4gICAgLy8gU3RlcCAzOiBTZXBhcmF0ZSBzdWNjZXNzZnVsIGFuZCBmYWlsZWQgcmVzdWx0c1xyXG4gICAgY29uc3Qgc3VjY2Vzc2Z1bDogVGVzdENhc2VbXSA9IFtdO1xyXG4gICAgY29uc3QgZmFpbGVkOiBGYWlsZWRHZW5lcmF0aW9uW10gPSBbXTtcclxuXHJcbiAgICByZXN1bHRzLmZvckVhY2gocmVzdWx0ID0+IHtcclxuICAgICAgaWYgKHJlc3VsdC5zdWNjZXNzICYmIHJlc3VsdC50ZXN0Q2FzZSkge1xyXG4gICAgICAgIHN1Y2Nlc3NmdWwucHVzaChyZXN1bHQudGVzdENhc2UpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZhaWxlZC5wdXNoKHtcclxuICAgICAgICAgIHNjZW5hcmlvOiByZXN1bHQuc2NlbmFyaW8sXHJcbiAgICAgICAgICBlcnJvcjogcmVzdWx0LmVycm9yIHx8ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RlcCA0OiBCdWlsZCBzdW1tYXJ5XHJcbiAgICBjb25zdCBzdW1tYXJ5ID0ge1xyXG4gICAgICB0b3RhbDogc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgc3VjY2VlZGVkOiBzdWNjZXNzZnVsLmxlbmd0aCxcclxuICAgICAgZmFpbGVkOiBmYWlsZWQubGVuZ3RoLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gQmF0Y2ggZ2VuZXJhdGlvbiBjb21wbGV0ZTogJHtzdW1tYXJ5LnN1Y2NlZWRlZH0gc3VjY2VlZGVkLCAke3N1bW1hcnkuZmFpbGVkfSBmYWlsZWRgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdWNjZXNzZnVsLFxyXG4gICAgICBmYWlsZWQsXHJcbiAgICAgIHN1bW1hcnksXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHJvY2VzcyBzY2VuYXJpb3Mgd2l0aCBjb25jdXJyZW5jeSBjb250cm9sXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHNjZW5hcmlvcyAtIEFycmF5IG9mIHNjZW5hcmlvIGRlc2NyaXB0aW9uc1xyXG4gICAqIEBwYXJhbSBhbmFseXNpcyAtIEFwcGxpY2F0aW9uIGFuYWx5c2lzIHRvIHJldXNlXHJcbiAgICogQHBhcmFtIHByb2plY3RJZCAtIFByb2plY3QgSURcclxuICAgKiBAcGFyYW0gc3VpdGVJZCAtIFN1aXRlIElEXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBnZW5lcmF0aW9uIHJlc3VsdHNcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHByb2Nlc3NTY2VuYXJpb3MoXHJcbiAgICBzY2VuYXJpb3M6IHN0cmluZ1tdLFxyXG4gICAgYW5hbHlzaXM6IGFueSxcclxuICAgIHByb2plY3RJZDogc3RyaW5nLFxyXG4gICAgc3VpdGVJZDogc3RyaW5nLFxyXG4gICAgdXNlcklkOiBzdHJpbmdcclxuICApOiBQcm9taXNlPEdlbmVyYXRpb25SZXN1bHRbXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogR2VuZXJhdGlvblJlc3VsdFtdID0gW107XHJcbiAgICBjb25zdCBtYXhDb25jdXJyZW5jeSA9IHRoaXMuY29uZmlnLm1heENvbmN1cnJlbmN5IHx8IDM7XHJcblxyXG4gICAgLy8gUHJvY2VzcyBzY2VuYXJpb3MgaW4gYmF0Y2hlcyB0byBjb250cm9sIGNvbmN1cnJlbmN5XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNjZW5hcmlvcy5sZW5ndGg7IGkgKz0gbWF4Q29uY3VycmVuY3kpIHtcclxuICAgICAgY29uc3QgYmF0Y2ggPSBzY2VuYXJpb3Muc2xpY2UoaSwgaSArIG1heENvbmN1cnJlbmN5KTtcclxuICAgICAgY29uc3QgYmF0Y2hQcm9taXNlcyA9IGJhdGNoLm1hcChzY2VuYXJpbyA9PlxyXG4gICAgICAgIHRoaXMuZ2VuZXJhdGVTaW5nbGVUZXN0KHNjZW5hcmlvLCBhbmFseXNpcywgcHJvamVjdElkLCBzdWl0ZUlkLCB1c2VySWQpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBXYWl0IGZvciBjdXJyZW50IGJhdGNoIHRvIGNvbXBsZXRlXHJcbiAgICAgIGNvbnN0IGJhdGNoUmVzdWx0cyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChiYXRjaFByb21pc2VzKTtcclxuXHJcbiAgICAgIC8vIFByb2Nlc3MgcmVzdWx0c1xyXG4gICAgICBiYXRjaFJlc3VsdHMuZm9yRWFjaCgocmVzdWx0LCBpbmRleCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IHNjZW5hcmlvID0gYmF0Y2hbaW5kZXhdO1xyXG4gICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJykge1xyXG4gICAgICAgICAgcmVzdWx0cy5wdXNoKHJlc3VsdC52YWx1ZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIFByb21pc2UgcmVqZWN0ZWRcclxuICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHNjZW5hcmlvLFxyXG4gICAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgICAgZXJyb3I6IHJlc3VsdC5yZWFzb24gaW5zdGFuY2VvZiBFcnJvciA/IHJlc3VsdC5yZWFzb24ubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIHNpbmdsZSB0ZXN0IGNhc2VcclxuICAgKiBcclxuICAgKiBAcGFyYW0gc2NlbmFyaW8gLSBTY2VuYXJpbyBkZXNjcmlwdGlvblxyXG4gICAqIEBwYXJhbSBhbmFseXNpcyAtIEFwcGxpY2F0aW9uIGFuYWx5c2lzXHJcbiAgICogQHBhcmFtIHByb2plY3RJZCAtIFByb2plY3QgSURcclxuICAgKiBAcGFyYW0gc3VpdGVJZCAtIFN1aXRlIElEXHJcbiAgICogQHBhcmFtIHVzZXJJZCAtIFVzZXIgSURcclxuICAgKiBAcmV0dXJucyBHZW5lcmF0aW9uIHJlc3VsdFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZ2VuZXJhdGVTaW5nbGVUZXN0KFxyXG4gICAgc2NlbmFyaW86IHN0cmluZyxcclxuICAgIGFuYWx5c2lzOiBhbnksXHJcbiAgICBwcm9qZWN0SWQ6IHN0cmluZyxcclxuICAgIHN1aXRlSWQ6IHN0cmluZyxcclxuICAgIHVzZXJJZDogc3RyaW5nXHJcbiAgKTogUHJvbWlzZTxHZW5lcmF0aW9uUmVzdWx0PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gR2VuZXJhdGluZyB0ZXN0IGZvciBzY2VuYXJpbzogJHtzY2VuYXJpby5zdWJzdHJpbmcoMCwgNTApfS4uLmApO1xyXG5cclxuICAgICAgLy8gRmlyc3QsIGdlbmVyYXRlIHRlc3Qgc3BlY2lmaWNhdGlvbiBmcm9tIEFJXHJcbiAgICAgIGNvbnN0IHNwZWNpZmljYXRpb24gPSBhd2FpdCB0aGlzLmFpRW5naW5lLmdlbmVyYXRlVGVzdFNwZWNpZmljYXRpb24oYW5hbHlzaXMsIHNjZW5hcmlvKTtcclxuICAgICAgXHJcbiAgICAgIC8vIFRoZW4sIGdlbmVyYXRlIHRoZSB0ZXN0IGNhc2UgZnJvbSB0aGUgc3BlY2lmaWNhdGlvblxyXG4gICAgICBjb25zdCB0ZXN0Q2FzZSA9IGF3YWl0IHRoaXMuZ2VuZXJhdG9yLmdlbmVyYXRlKFxyXG4gICAgICAgIHNwZWNpZmljYXRpb24sXHJcbiAgICAgICAgYW5hbHlzaXMsXHJcbiAgICAgICAgcHJvamVjdElkLFxyXG4gICAgICAgIHN1aXRlSWQsXHJcbiAgICAgICAgdXNlcklkXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgW0JhdGNoIFByb2Nlc3Nvcl0gU3VjY2Vzc2Z1bGx5IGdlbmVyYXRlZCB0ZXN0OiAke3Rlc3RDYXNlLm5hbWV9YCk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHNjZW5hcmlvLFxyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgdGVzdENhc2UsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBbQmF0Y2ggUHJvY2Vzc29yXSBGYWlsZWQgdG8gZ2VuZXJhdGUgdGVzdCBmb3Igc2NlbmFyaW86ICR7c2NlbmFyaW99YCwgZXJyb3IpO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzY2VuYXJpbyxcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogSW50ZXJuYWwgdHlwZSBmb3IgdHJhY2tpbmcgZ2VuZXJhdGlvbiByZXN1bHRzXHJcbiAqL1xyXG5pbnRlcmZhY2UgR2VuZXJhdGlvblJlc3VsdCB7XHJcbiAgc2NlbmFyaW86IHN0cmluZztcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIHRlc3RDYXNlPzogVGVzdENhc2U7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbn1cclxuIl19