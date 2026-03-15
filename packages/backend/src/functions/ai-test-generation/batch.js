"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const application_analyzer_1 = require("../../services/ai-test-generation/application-analyzer");
const test_generator_1 = require("../../services/ai-test-generation/test-generator");
const ai_engine_1 = require("../../services/ai-test-generation/ai-engine");
const selector_generator_1 = require("../../services/ai-test-generation/selector-generator");
const test_case_service_1 = require("../../services/test-case-service");
const batch_processor_1 = require("../../services/ai-test-generation/batch-processor");
const cost_tracker_1 = require("../../services/ai-test-generation/cost-tracker");
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
        const userId = event.requestContext.authorizer?.claims?.sub;
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
        const aiEngine = new ai_engine_1.AIEngine();
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
        await costTracker.recordUsage(userId, request.projectId, 'batch', tokensUsed, 'gpt-4', results.summary.succeeded, 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJiYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpR0FBNkY7QUFDN0YscUZBQWlGO0FBQ2pGLDJFQUF1RTtBQUN2RSw2RkFBeUY7QUFDekYsd0VBQW1FO0FBQ25FLHVGQUFtRjtBQUNuRixpRkFBNkU7QUFHN0U7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0lBRXhDLElBQUksQ0FBQztRQUNILHNDQUFzQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQzVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsY0FBYztpQkFDdEIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSwwQkFBMEI7aUJBQ2xDLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUF5QixJQUFJ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SyxFQUFFLGdDQUFnQztnQkFDdkMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBM0pXLFFBQUEsT0FBTyxXQTJKbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEFwcGxpY2F0aW9uQW5hbHl6ZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vYXBwbGljYXRpb24tYW5hbHl6ZXInO1xyXG5pbXBvcnQgeyBUZXN0R2VuZXJhdG9yIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL3Rlc3QtZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgQUlFbmdpbmUgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vYWktZW5naW5lJztcclxuaW1wb3J0IHsgU2VsZWN0b3JHZW5lcmF0b3IgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vc2VsZWN0b3ItZ2VuZXJhdG9yJztcclxuaW1wb3J0IHsgVGVzdENhc2VTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvdGVzdC1jYXNlLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBCYXRjaFByb2Nlc3NvciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9iYXRjaC1wcm9jZXNzb3InO1xyXG5pbXBvcnQgeyBDb3N0VHJhY2tlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9jb3N0LXRyYWNrZXInO1xyXG5pbXBvcnQgeyBCYXRjaEdlbmVyYXRlUmVxdWVzdCwgQmF0Y2hHZW5lcmF0ZVJlc3BvbnNlLCBUb2tlblVzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuXHJcbi8qKlxyXG4gKiBQT1NUIC9hcGkvYWktdGVzdC1nZW5lcmF0aW9uL2JhdGNoXHJcbiAqIFxyXG4gKiBHZW5lcmF0ZXMgbXVsdGlwbGUgdGVzdCBjYXNlcyBmb3IgZGlmZmVyZW50IHNjZW5hcmlvcyBpbiBhIHNpbmdsZSBvcGVyYXRpb24uXHJcbiAqIFxyXG4gKiBSZXF1ZXN0IEJvZHk6XHJcbiAqIHtcclxuICogICB1cmw6IHN0cmluZztcclxuICogICBzY2VuYXJpb3M6IHN0cmluZ1tdO1xyXG4gKiAgIHByb2plY3RJZDogc3RyaW5nO1xyXG4gKiAgIHN1aXRlSWQ6IHN0cmluZztcclxuICogICBvcHRpb25zPzogQW5hbHlzaXNPcHRpb25zO1xyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIHJlc3VsdHM6IEJhdGNoUmVzdWx0O1xyXG4gKiAgIHRva2Vuc1VzZWQ6IFRva2VuVXNhZ2U7XHJcbiAqICAgY29zdDogbnVtYmVyO1xyXG4gKiB9XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnW0JhdGNoXSBSZWNlaXZlZCByZXF1ZXN0Jyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBHZXQgdXNlciBJRCBmcm9tIGF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVW5hdXRob3JpemVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBCYXRjaEdlbmVyYXRlUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QudXJsIHx8ICFyZXF1ZXN0LnNjZW5hcmlvcyB8fCAhcmVxdWVzdC5wcm9qZWN0SWQgfHwgIXJlcXVlc3Quc3VpdGVJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAndXJsLCBzY2VuYXJpb3MsIHByb2plY3RJZCwgYW5kIHN1aXRlSWQgYXJlIHJlcXVpcmVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVxdWVzdC5zY2VuYXJpb3MpIHx8IHJlcXVlc3Quc2NlbmFyaW9zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnc2NlbmFyaW9zIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXknLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbQmF0Y2hdIEdlbmVyYXRpbmcgJHtyZXF1ZXN0LnNjZW5hcmlvcy5sZW5ndGh9IHRlc3RzIGZvciBVUkw6ICR7cmVxdWVzdC51cmx9YCk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBzZXJ2aWNlcyB3aXRoIHRhYmxlIG5hbWUgZnJvbSBlbnZpcm9ubWVudFxyXG4gICAgY29uc3QgdGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuQUlfVVNBR0VfVEFCTEUgfHwgJ0FJVXNhZ2UnO1xyXG4gICAgY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIodGFibGVOYW1lKTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgdXNhZ2UgbGltaXRzIGJlZm9yZSBwcm9jZWVkaW5nXHJcbiAgICBjb25zdCB3aXRoaW5MaW1pdCA9IGF3YWl0IGNvc3RUcmFja2VyLmNoZWNrTGltaXQodXNlcklkLCByZXF1ZXN0LnByb2plY3RJZCk7XHJcbiAgICBpZiAoIXdpdGhpbkxpbWl0KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDI5LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdVc2FnZSBsaW1pdCBleGNlZWRlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnTW9udGhseSB1c2FnZSBsaW1pdCBoYXMgYmVlbiByZWFjaGVkLiBQbGVhc2UgY29udGFjdCBzdXBwb3J0IHRvIGluY3JlYXNlIHlvdXIgbGltaXQuJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhbmFseXplciA9IEFwcGxpY2F0aW9uQW5hbHl6ZXIuZ2V0SW5zdGFuY2UoKTtcclxuICAgIGNvbnN0IGFpRW5naW5lID0gbmV3IEFJRW5naW5lKCk7XHJcbiAgICBjb25zdCBzZWxlY3RvckdlbmVyYXRvciA9IFNlbGVjdG9yR2VuZXJhdG9yLmdldEluc3RhbmNlKCk7XHJcbiAgICBjb25zdCB0ZXN0Q2FzZVNlcnZpY2UgPSBuZXcgVGVzdENhc2VTZXJ2aWNlKCk7XHJcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBuZXcgVGVzdEdlbmVyYXRvcihhaUVuZ2luZSwgc2VsZWN0b3JHZW5lcmF0b3IsIHRlc3RDYXNlU2VydmljZSk7XHJcbiAgICBjb25zdCBiYXRjaFByb2Nlc3NvciA9IG5ldyBCYXRjaFByb2Nlc3NvcihhbmFseXplciwgZ2VuZXJhdG9yKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSB0ZXN0cyBpbiBiYXRjaFxyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IGJhdGNoUHJvY2Vzc29yLmdlbmVyYXRlQmF0Y2goXHJcbiAgICAgIHJlcXVlc3QudXJsLFxyXG4gICAgICByZXF1ZXN0LnNjZW5hcmlvcyxcclxuICAgICAgcmVxdWVzdC5wcm9qZWN0SWQsXHJcbiAgICAgIHJlcXVlc3Quc3VpdGVJZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICByZXF1ZXN0Lm9wdGlvbnNcclxuICAgICk7XHJcblxyXG4gICAgLy8gUmVjb3JkIHVzYWdlIChtb2NrIHRva2VuIHVzYWdlIC0gaW4gcmVhbCBpbXBsZW1lbnRhdGlvbiwgYWNjdW11bGF0ZSBmcm9tIGFsbCBnZW5lcmF0aW9ucylcclxuICAgIGNvbnN0IHRva2Vuc1VzZWQ6IFRva2VuVXNhZ2UgPSB7XHJcbiAgICAgIHByb21wdFRva2VuczogMTAwMCAqIHJlcXVlc3Quc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgY29tcGxldGlvblRva2VuczogNTAwICogcmVxdWVzdC5zY2VuYXJpb3MubGVuZ3RoLFxyXG4gICAgICB0b3RhbFRva2VuczogMTUwMCAqIHJlcXVlc3Quc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgY29zdCA9IGNvc3RUcmFja2VyLmNhbGN1bGF0ZUNvc3QodG9rZW5zVXNlZCwgJ2dwdC00Jyk7XHJcblxyXG4gICAgYXdhaXQgY29zdFRyYWNrZXIucmVjb3JkVXNhZ2UoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgcmVxdWVzdC5wcm9qZWN0SWQsXHJcbiAgICAgICdiYXRjaCcsXHJcbiAgICAgIHRva2Vuc1VzZWQsXHJcbiAgICAgICdncHQtNCcsXHJcbiAgICAgIHJlc3VsdHMuc3VtbWFyeS5zdWNjZWVkZWQsXHJcbiAgICAgIDBcclxuICAgICk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtCYXRjaF0gQmF0Y2ggZ2VuZXJhdGlvbiBjb21wbGV0ZTogJHtyZXN1bHRzLnN1bW1hcnkuc3VjY2VlZGVkfSBzdWNjZWVkZWQsICR7cmVzdWx0cy5zdW1tYXJ5LmZhaWxlZH0gZmFpbGVkYCk7XHJcblxyXG4gICAgLy8gUmV0dXJuIHN1Y2Nlc3NmdWwgcmVzcG9uc2VcclxuICAgIGNvbnN0IHJlc3BvbnNlOiBCYXRjaEdlbmVyYXRlUmVzcG9uc2UgPSB7XHJcbiAgICAgIHJlc3VsdHMsXHJcbiAgICAgIHRva2Vuc1VzZWQsXHJcbiAgICAgIGNvc3QsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW0JhdGNoXSBFcnJvcjonLCBlcnJvcik7XHJcblxyXG4gICAgLy8gUmV0dXJuIGVycm9yIHJlc3BvbnNlXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBnZW5lcmF0ZSBiYXRjaCB0ZXN0cycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==