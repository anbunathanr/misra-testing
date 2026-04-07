"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const application_analyzer_1 = require("../../services/ai-test-generation/application-analyzer");
const test_generator_1 = require("../../services/ai-test-generation/test-generator");
const ai_engine_factory_1 = require("../../services/ai-test-generation/ai-engine-factory");
const selector_generator_1 = require("../../services/ai-test-generation/selector-generator");
const test_case_service_1 = require("../../services/test-case-service");
const batch_processor_1 = require("../../services/ai-test-generation/batch-processor");
const cost_tracker_1 = require("../../services/ai-test-generation/cost-tracker");
const startup_validator_1 = require("../../services/ai-test-generation/startup-validator");
const auth_util_1 = require("../../utils/auth-util");
// Task 10.2: Validate configuration on Lambda cold start
// This runs once when the Lambda container initializes
try {
    (0, startup_validator_1.validateStartupConfiguration)();
}
catch (error) {
    console.error('[Batch] Failed to initialize Lambda due to invalid configuration:', error);
    // Lambda will fail to initialize, preventing requests from being processed
    throw error;
}
/**
 * POST /api/ai-test-generation/batch
 *
 * Generates multiple test cases for different scenarios in a single operation.
 *
 * Request Body:
 * {
 *   url: string;
 *   scenarios: string[];
 *   projectId: string;
 *   suiteId: string;
 *   options?: AnalysisOptions;
 * }
 *
 * Response:
 * {
 *   results: BatchResult;
 *   tokensUsed: TokenUsage;
 *   cost: number;
 * }
 */
const handler = async (event) => {
    console.log('[Batch] Received request');
    try {
        // Get user ID from authorizer context
        const user = (0, auth_util_1.getUserFromContext)(event);
        const userId = user.userId;
        if (!userId) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Unauthorized',
                }),
            };
        }
        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Request body is required',
                }),
            };
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.url || !request.scenarios || !request.projectId || !request.suiteId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'url, scenarios, projectId, and suiteId are required',
                }),
            };
        }
        if (!Array.isArray(request.scenarios) || request.scenarios.length === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'scenarios must be a non-empty array',
                }),
            };
        }
        console.log(`[Batch] Generating ${request.scenarios.length} tests for URL: ${request.url}`);
        // Initialize services with table name from environment
        const tableName = process.env.AI_USAGE_TABLE || 'AIUsage';
        const costTracker = new cost_tracker_1.CostTracker(tableName);
        // Check usage limits before proceeding
        const withinLimit = await costTracker.checkLimit(userId, request.projectId);
        if (!withinLimit) {
            return {
                statusCode: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Usage limit exceeded',
                    message: 'Monthly usage limit has been reached. Please contact support to increase your limit.',
                }),
            };
        }
        const analyzer = application_analyzer_1.ApplicationAnalyzer.getInstance();
        const aiEngine = ai_engine_factory_1.AIEngineFactory.create();
        const selectorGenerator = selector_generator_1.SelectorGenerator.getInstance();
        const testCaseService = new test_case_service_1.TestCaseService();
        const generator = new test_generator_1.TestGenerator(aiEngine, selectorGenerator, testCaseService);
        const batchProcessor = new batch_processor_1.BatchProcessor(analyzer, generator);
        // Generate tests in batch
        const results = await batchProcessor.generateBatch(request.url, request.scenarios, request.projectId, request.suiteId, userId, request.options);
        // Record usage (mock token usage - in real implementation, accumulate from all generations)
        const tokensUsed = {
            promptTokens: 1000 * request.scenarios.length,
            completionTokens: 500 * request.scenarios.length,
            totalTokens: 1500 * request.scenarios.length,
        };
        const cost = costTracker.calculateCost(tokensUsed, 'gpt-4');
        await costTracker.recordUsage(userId, request.projectId, 'batch', tokensUsed, 'gpt-4', 'OPENAI', results.summary.succeeded, 0);
        console.log(`[Batch] Batch generation complete: ${results.summary.succeeded} succeeded, ${results.summary.failed} failed`);
        // Return successful response
        const response = {
            results,
            tokensUsed,
            cost,
        };
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('[Batch] Error:', error);
        // Return error response
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to generate batch tests',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJiYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpR0FBNkY7QUFDN0YscUZBQWlGO0FBQ2pGLDJGQUFzRjtBQUN0Riw2RkFBeUY7QUFDekYsd0VBQW1FO0FBQ25FLHVGQUFtRjtBQUNuRixpRkFBNkU7QUFFN0UsMkZBQW1HO0FBQ25HLHFEQUEyRDtBQUUzRCx5REFBeUQ7QUFDekQsdURBQXVEO0FBQ3ZELElBQUksQ0FBQztJQUNILElBQUEsZ0RBQTRCLEdBQUUsQ0FBQztBQUNqQyxDQUFDO0FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztJQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUVBQW1FLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUYsMkVBQTJFO0lBQzNFLE1BQU0sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUV4QyxJQUFJLENBQUM7UUFDSCxzQ0FBc0M7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzNCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsY0FBYztpQkFDdEIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUks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QUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV2Qyx3QkFBd0I7UUFDeEIsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLGdDQUFnQztnQkFDdkMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBN0pXLFFBQUEsT0FBTyxXQTZKbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEFwcGxpY2F0aW9uQW5hbHl6ZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vYXBwbGljYXRpb24tYW5hbHl6ZXInO1xyXG5pbXBvcnQgeyBUZXN0R2VuZXJhdG9yIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL3Rlc3QtZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgQUlFbmdpbmVGYWN0b3J5IH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL2FpLWVuZ2luZS1mYWN0b3J5JztcclxuaW1wb3J0IHsgU2VsZWN0b3JHZW5lcmF0b3IgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vc2VsZWN0b3ItZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgVGVzdENhc2VTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1jYXNlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBCYXRjaFByb2Nlc3NvciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9iYXRjaC1wcm9jZXNzb3InO1xyXG5pbXBvcnQgeyBDb3N0VHJhY2tlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9jb3N0LXRyYWNrZXInO1xyXG5pbXBvcnQgeyBCYXRjaEdlbmVyYXRlUmVxdWVzdCwgQmF0Y2hHZW5lcmF0ZVJlc3BvbnNlLCBUb2tlblVzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuaW1wb3J0IHsgdmFsaWRhdGVTdGFydHVwQ29uZmlndXJhdGlvbiB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9zdGFydHVwLXZhbGlkYXRvcic7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG4vLyBUYXNrIDEwLjI6IFZhbGlkYXRlIGNvbmZpZ3VyYXRpb24gb24gTGFtYmRhIGNvbGQgc3RhcnRcclxuLy8gVGhpcyBydW5zIG9uY2Ugd2hlbiB0aGUgTGFtYmRhIGNvbnRhaW5lciBpbml0aWFsaXplc1xyXG50cnkge1xyXG4gIHZhbGlkYXRlU3RhcnR1cENvbmZpZ3VyYXRpb24oKTtcclxufSBjYXRjaCAoZXJyb3IpIHtcclxuICBjb25zb2xlLmVycm9yKCdbQmF0Y2hdIEZhaWxlZCB0byBpbml0aWFsaXplIExhbWJkYSBkdWUgdG8gaW52YWxpZCBjb25maWd1cmF0aW9uOicsIGVycm9yKTtcclxuICAvLyBMYW1iZGEgd2lsbCBmYWlsIHRvIGluaXRpYWxpemUsIHByZXZlbnRpbmcgcmVxdWVzdHMgZnJvbSBiZWluZyBwcm9jZXNzZWRcclxuICB0aHJvdyBlcnJvcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBPU1QgL2FwaS9haS10ZXN0LWdlbmVyYXRpb24vYmF0Y2hcclxuICogXHJcbiAqIEdlbmVyYXRlcyBtdWx0aXBsZSB0ZXN0IGNhc2VzIGZvciBkaWZmZXJlbnQgc2NlbmFyaW9zIGluIGEgc2luZ2xlIG9wZXJhdGlvbi5cclxuICogXHJcbiAqIFJlcXVlc3QgQm9keTpcclxuICoge1xyXG4gKiAgIHVybDogc3RyaW5nO1xyXG4gKiAgIHNjZW5hcmlvczogc3RyaW5nW107XHJcbiAqICAgcHJvamVjdElkOiBzdHJpbmc7XHJcbiAqICAgc3VpdGVJZDogc3RyaW5nO1xyXG4gKiAgIG9wdGlvbnM/OiBBbmFseXNpc09wdGlvbnM7XHJcbiAqIH1cclxuICogXHJcbiAqIFJlc3BvbnNlOlxyXG4gKiB7XHJcbiAqICAgcmVzdWx0czogQmF0Y2hSZXN1bHQ7XHJcbiAqICAgdG9rZW5zVXNlZDogVG9rZW5Vc2FnZTtcclxuICogICBjb3N0OiBudW1iZXI7XHJcbiAqIH1cclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdbQmF0Y2hdIFJlY2VpdmVkIHJlcXVlc3QnKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEdldCB1c2VyIElEIGZyb20gYXV0aG9yaXplciBjb250ZXh0XHJcbiAgICBjb25zdCB1c2VyID0gZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIudXNlcklkO1xyXG4gICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1VuYXV0aG9yaXplZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogQmF0Y2hHZW5lcmF0ZVJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gICAgaWYgKCFyZXF1ZXN0LnVybCB8fCAhcmVxdWVzdC5zY2VuYXJpb3MgfHwgIXJlcXVlc3QucHJvamVjdElkIHx8ICFyZXF1ZXN0LnN1aXRlSWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ3VybCwgc2NlbmFyaW9zLCBwcm9qZWN0SWQsIGFuZCBzdWl0ZUlkIGFyZSByZXF1aXJlZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHJlcXVlc3Quc2NlbmFyaW9zKSB8fCByZXF1ZXN0LnNjZW5hcmlvcy5sZW5ndGggPT09IDApIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ3NjZW5hcmlvcyBtdXN0IGJlIGEgbm9uLWVtcHR5IGFycmF5JyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0JhdGNoXSBHZW5lcmF0aW5nICR7cmVxdWVzdC5zY2VuYXJpb3MubGVuZ3RofSB0ZXN0cyBmb3IgVVJMOiAke3JlcXVlc3QudXJsfWApO1xyXG5cclxuICAgIC8vIEluaXRpYWxpemUgc2VydmljZXMgd2l0aCB0YWJsZSBuYW1lIGZyb20gZW52aXJvbm1lbnRcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LkFJX1VTQUdFX1RBQkxFIHx8ICdBSVVzYWdlJztcclxuICAgIGNvbnN0IGNvc3RUcmFja2VyID0gbmV3IENvc3RUcmFja2VyKHRhYmxlTmFtZSk7XHJcbiAgICBcclxuICAgIC8vIENoZWNrIHVzYWdlIGxpbWl0cyBiZWZvcmUgcHJvY2VlZGluZ1xyXG4gICAgY29uc3Qgd2l0aGluTGltaXQgPSBhd2FpdCBjb3N0VHJhY2tlci5jaGVja0xpbWl0KHVzZXJJZCwgcmVxdWVzdC5wcm9qZWN0SWQpO1xyXG4gICAgaWYgKCF3aXRoaW5MaW1pdCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQyOSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVXNhZ2UgbGltaXQgZXhjZWVkZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ01vbnRobHkgdXNhZ2UgbGltaXQgaGFzIGJlZW4gcmVhY2hlZC4gUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydCB0byBpbmNyZWFzZSB5b3VyIGxpbWl0LicsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYW5hbHl6ZXIgPSBBcHBsaWNhdGlvbkFuYWx5emVyLmdldEluc3RhbmNlKCk7XHJcbiAgICBjb25zdCBhaUVuZ2luZSA9IEFJRW5naW5lRmFjdG9yeS5jcmVhdGUoKTtcclxuICAgIGNvbnN0IHNlbGVjdG9yR2VuZXJhdG9yID0gU2VsZWN0b3JHZW5lcmF0b3IuZ2V0SW5zdGFuY2UoKTtcclxuICAgIGNvbnN0IHRlc3RDYXNlU2VydmljZSA9IG5ldyBUZXN0Q2FzZVNlcnZpY2UoKTtcclxuICAgIGNvbnN0IGdlbmVyYXRvciA9IG5ldyBUZXN0R2VuZXJhdG9yKGFpRW5naW5lLCBzZWxlY3RvckdlbmVyYXRvciwgdGVzdENhc2VTZXJ2aWNlKTtcclxuICAgIGNvbnN0IGJhdGNoUHJvY2Vzc29yID0gbmV3IEJhdGNoUHJvY2Vzc29yKGFuYWx5emVyLCBnZW5lcmF0b3IpO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHRlc3RzIGluIGJhdGNoXHJcbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgYmF0Y2hQcm9jZXNzb3IuZ2VuZXJhdGVCYXRjaChcclxuICAgICAgcmVxdWVzdC51cmwsXHJcbiAgICAgIHJlcXVlc3Quc2NlbmFyaW9zLFxyXG4gICAgICByZXF1ZXN0LnByb2plY3RJZCxcclxuICAgICAgcmVxdWVzdC5zdWl0ZUlkLFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHJlcXVlc3Qub3B0aW9uc1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBSZWNvcmQgdXNhZ2UgKG1vY2sgdG9rZW4gdXNhZ2UgLSBpbiByZWFsIGltcGxlbWVudGF0aW9uLCBhY2N1bXVsYXRlIGZyb20gYWxsIGdlbmVyYXRpb25zKVxyXG4gICAgY29uc3QgdG9rZW5zVXNlZDogVG9rZW5Vc2FnZSA9IHtcclxuICAgICAgcHJvbXB0VG9rZW5zOiAxMDAwICogcmVxdWVzdC5zY2VuYXJpb3MubGVuZ3RoLFxyXG4gICAgICBjb21wbGV0aW9uVG9rZW5zOiA1MDAgKiByZXF1ZXN0LnNjZW5hcmlvcy5sZW5ndGgsXHJcbiAgICAgIHRvdGFsVG9rZW5zOiAxNTAwICogcmVxdWVzdC5zY2VuYXJpb3MubGVuZ3RoLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjb3N0ID0gY29zdFRyYWNrZXIuY2FsY3VsYXRlQ29zdCh0b2tlbnNVc2VkLCAnZ3B0LTQnKTtcclxuXHJcbiAgICBhd2FpdCBjb3N0VHJhY2tlci5yZWNvcmRVc2FnZShcclxuICAgICAgdXNlcklkLFxyXG4gICAgICByZXF1ZXN0LnByb2plY3RJZCxcclxuICAgICAgJ2JhdGNoJyxcclxuICAgICAgdG9rZW5zVXNlZCxcclxuICAgICAgJ2dwdC00JyxcclxuICAgICAgJ09QRU5BSScsXHJcbiAgICAgIHJlc3VsdHMuc3VtbWFyeS5zdWNjZWVkZWQsXHJcbiAgICAgIDBcclxuICAgICk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtCYXRjaF0gQmF0Y2ggZ2VuZXJhdGlvbiBjb21wbGV0ZTogJHtyZXN1bHRzLnN1bW1hcnkuc3VjY2VlZGVkfSBzdWNjZWVkZWQsICR7cmVzdWx0cy5zdW1tYXJ5LmZhaWxlZH0gZmFpbGVkYCk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHN1Y2Nlc3NmdWwgcmVzcG9uc2VcclxuICAgIGNvbnN0IHJlc3BvbnNlOiBCYXRjaEdlbmVyYXRlUmVzcG9uc2UgPSB7XHJcbiAgICAgIHJlc3VsdHMsXHJcbiAgICAgIHRva2Vuc1VzZWQsXHJcbiAgICAgIGNvc3QsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW0JhdGNoXSBFcnJvcjonLCBlcnJvcik7XHJcblxyXG4gICAgLy8gUmV0dXJuIGVycm9yIHJlc3BvbnNlXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBnZW5lcmF0ZSBiYXRjaCB0ZXN0cycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==