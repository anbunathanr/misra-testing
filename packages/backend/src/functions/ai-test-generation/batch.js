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
        const user = await (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmF0Y2guanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJiYXRjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxpR0FBNkY7QUFDN0YscUZBQWlGO0FBQ2pGLDJGQUFzRjtBQUN0Riw2RkFBeUY7QUFDekYsd0VBQW1FO0FBQ25FLHVGQUFtRjtBQUNuRixpRkFBNkU7QUFFN0UsMkZBQW1HO0FBQ25HLHFEQUEyRDtBQUUzRCx5REFBeUQ7QUFDekQsdURBQXVEO0FBQ3ZELElBQUksQ0FBQztJQUNILElBQUEsZ0RBQTRCLEdBQUUsQ0FBQztBQUNqQyxDQUFDO0FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztJQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUVBQW1FLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUYsMkVBQTJFO0lBQzNFLE1BQU0sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW9CRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUV4QyxJQUFJLENBQUM7UUFDSCxzQ0FBc0M7UUFDdEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSxjQUFjO2lCQUN0QixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCxxQkFBcUI7UUFDckIs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QUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXZDLHdCQUF3QjtRQUN4QixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUsZ0NBQWdDO2dCQUN2QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE3SlcsUUFBQSxPQUFPLFdBNkpsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQXBwbGljYXRpb25BbmFseXplciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9hcHBsaWNhdGlvbi1hbmFseXplcic7XHJcbmltcG9ydCB7IFRlc3RHZW5lcmF0b3IgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vdGVzdC1nZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBBSUVuZ2luZUZhY3RvcnkgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vYWktZW5naW5lLWZhY3RvcnknO1xyXG5pbXBvcnQgeyBTZWxlY3RvckdlbmVyYXRvciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9zZWxlY3Rvci1nZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBUZXN0Q2FzZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWNhc2Utc2VydmljZSc7XHJcbmltcG9ydCB7IEJhdGNoUHJvY2Vzc29yIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL2JhdGNoLXByb2Nlc3Nvcic7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL2Nvc3QtdHJhY2tlcic7XHJcbmltcG9ydCB7IEJhdGNoR2VuZXJhdGVSZXF1ZXN0LCBCYXRjaEdlbmVyYXRlUmVzcG9uc2UsIFRva2VuVXNhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZVN0YXJ0dXBDb25maWd1cmF0aW9uIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL3N0YXJ0dXAtdmFsaWRhdG9yJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbi8vIFRhc2sgMTAuMjogVmFsaWRhdGUgY29uZmlndXJhdGlvbiBvbiBMYW1iZGEgY29sZCBzdGFydFxyXG4vLyBUaGlzIHJ1bnMgb25jZSB3aGVuIHRoZSBMYW1iZGEgY29udGFpbmVyIGluaXRpYWxpemVzXHJcbnRyeSB7XHJcbiAgdmFsaWRhdGVTdGFydHVwQ29uZmlndXJhdGlvbigpO1xyXG59IGNhdGNoIChlcnJvcikge1xyXG4gIGNvbnNvbGUuZXJyb3IoJ1tCYXRjaF0gRmFpbGVkIHRvIGluaXRpYWxpemUgTGFtYmRhIGR1ZSB0byBpbnZhbGlkIGNvbmZpZ3VyYXRpb246JywgZXJyb3IpO1xyXG4gIC8vIExhbWJkYSB3aWxsIGZhaWwgdG8gaW5pdGlhbGl6ZSwgcHJldmVudGluZyByZXF1ZXN0cyBmcm9tIGJlaW5nIHByb2Nlc3NlZFxyXG4gIHRocm93IGVycm9yO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2FpLXRlc3QtZ2VuZXJhdGlvbi9iYXRjaFxyXG4gKiBcclxuICogR2VuZXJhdGVzIG11bHRpcGxlIHRlc3QgY2FzZXMgZm9yIGRpZmZlcmVudCBzY2VuYXJpb3MgaW4gYSBzaW5nbGUgb3BlcmF0aW9uLlxyXG4gKiBcclxuICogUmVxdWVzdCBCb2R5OlxyXG4gKiB7XHJcbiAqICAgdXJsOiBzdHJpbmc7XHJcbiAqICAgc2NlbmFyaW9zOiBzdHJpbmdbXTtcclxuICogICBwcm9qZWN0SWQ6IHN0cmluZztcclxuICogICBzdWl0ZUlkOiBzdHJpbmc7XHJcbiAqICAgb3B0aW9ucz86IEFuYWx5c2lzT3B0aW9ucztcclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICByZXN1bHRzOiBCYXRjaFJlc3VsdDtcclxuICogICB0b2tlbnNVc2VkOiBUb2tlblVzYWdlO1xyXG4gKiAgIGNvc3Q6IG51bWJlcjtcclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1tCYXRjaF0gUmVjZWl2ZWQgcmVxdWVzdCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgY29uc3QgdXNlcklkID0gdXNlci51c2VySWQ7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVW5hdXRob3JpemVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBCYXRjaEdlbmVyYXRlUmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QudXJsIHx8ICFyZXF1ZXN0LnNjZW5hcmlvcyB8fCAhcmVxdWVzdC5wcm9qZWN0SWQgfHwgIXJlcXVlc3Quc3VpdGVJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAndXJsLCBzY2VuYXJpb3MsIHByb2plY3RJZCwgYW5kIHN1aXRlSWQgYXJlIHJlcXVpcmVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocmVxdWVzdC5zY2VuYXJpb3MpIHx8IHJlcXVlc3Quc2NlbmFyaW9zLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnc2NlbmFyaW9zIG11c3QgYmUgYSBub24tZW1wdHkgYXJyYXknLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbQmF0Y2hdIEdlbmVyYXRpbmcgJHtyZXF1ZXN0LnNjZW5hcmlvcy5sZW5ndGh9IHRlc3RzIGZvciBVUkw6ICR7cmVxdWVzdC51cmx9YCk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBzZXJ2aWNlcyB3aXRoIHRhYmxlIG5hbWUgZnJvbSBlbnZpcm9ubWVudFxyXG4gICAgY29uc3QgdGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuQUlfVVNBR0VfVEFCTEUgfHwgJ0FJVXNhZ2UnO1xyXG4gICAgY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIodGFibGVOYW1lKTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgdXNhZ2UgbGltaXRzIGJlZm9yZSBwcm9jZWVkaW5nXHJcbiAgICBjb25zdCB3aXRoaW5MaW1pdCA9IGF3YWl0IGNvc3RUcmFja2VyLmNoZWNrTGltaXQodXNlcklkLCByZXF1ZXN0LnByb2plY3RJZCk7XHJcbiAgICBpZiAoIXdpdGhpbkxpbWl0KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDI5LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdVc2FnZSBsaW1pdCBleGNlZWRlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnTW9udGhseSB1c2FnZSBsaW1pdCBoYXMgYmVlbiByZWFjaGVkLiBQbGVhc2UgY29udGFjdCBzdXBwb3J0IHRvIGluY3JlYXNlIHlvdXIgbGltaXQuJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhbmFseXplciA9IEFwcGxpY2F0aW9uQW5hbHl6ZXIuZ2V0SW5zdGFuY2UoKTtcclxuICAgIGNvbnN0IGFpRW5naW5lID0gQUlFbmdpbmVGYWN0b3J5LmNyZWF0ZSgpO1xyXG4gICAgY29uc3Qgc2VsZWN0b3JHZW5lcmF0b3IgPSBTZWxlY3RvckdlbmVyYXRvci5nZXRJbnN0YW5jZSgpO1xyXG4gICAgY29uc3QgdGVzdENhc2VTZXJ2aWNlID0gbmV3IFRlc3RDYXNlU2VydmljZSgpO1xyXG4gICAgY29uc3QgZ2VuZXJhdG9yID0gbmV3IFRlc3RHZW5lcmF0b3IoYWlFbmdpbmUsIHNlbGVjdG9yR2VuZXJhdG9yLCB0ZXN0Q2FzZVNlcnZpY2UpO1xyXG4gICAgY29uc3QgYmF0Y2hQcm9jZXNzb3IgPSBuZXcgQmF0Y2hQcm9jZXNzb3IoYW5hbHl6ZXIsIGdlbmVyYXRvcik7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdGVzdHMgaW4gYmF0Y2hcclxuICAgIGNvbnN0IHJlc3VsdHMgPSBhd2FpdCBiYXRjaFByb2Nlc3Nvci5nZW5lcmF0ZUJhdGNoKFxyXG4gICAgICByZXF1ZXN0LnVybCxcclxuICAgICAgcmVxdWVzdC5zY2VuYXJpb3MsXHJcbiAgICAgIHJlcXVlc3QucHJvamVjdElkLFxyXG4gICAgICByZXF1ZXN0LnN1aXRlSWQsXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgcmVxdWVzdC5vcHRpb25zXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFJlY29yZCB1c2FnZSAobW9jayB0b2tlbiB1c2FnZSAtIGluIHJlYWwgaW1wbGVtZW50YXRpb24sIGFjY3VtdWxhdGUgZnJvbSBhbGwgZ2VuZXJhdGlvbnMpXHJcbiAgICBjb25zdCB0b2tlbnNVc2VkOiBUb2tlblVzYWdlID0ge1xyXG4gICAgICBwcm9tcHRUb2tlbnM6IDEwMDAgKiByZXF1ZXN0LnNjZW5hcmlvcy5sZW5ndGgsXHJcbiAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IDUwMCAqIHJlcXVlc3Quc2NlbmFyaW9zLmxlbmd0aCxcclxuICAgICAgdG90YWxUb2tlbnM6IDE1MDAgKiByZXF1ZXN0LnNjZW5hcmlvcy5sZW5ndGgsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGNvc3QgPSBjb3N0VHJhY2tlci5jYWxjdWxhdGVDb3N0KHRva2Vuc1VzZWQsICdncHQtNCcpO1xyXG5cclxuICAgIGF3YWl0IGNvc3RUcmFja2VyLnJlY29yZFVzYWdlKFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHJlcXVlc3QucHJvamVjdElkLFxyXG4gICAgICAnYmF0Y2gnLFxyXG4gICAgICB0b2tlbnNVc2VkLFxyXG4gICAgICAnZ3B0LTQnLFxyXG4gICAgICAnT1BFTkFJJyxcclxuICAgICAgcmVzdWx0cy5zdW1tYXJ5LnN1Y2NlZWRlZCxcclxuICAgICAgMFxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0JhdGNoXSBCYXRjaCBnZW5lcmF0aW9uIGNvbXBsZXRlOiAke3Jlc3VsdHMuc3VtbWFyeS5zdWNjZWVkZWR9IHN1Y2NlZWRlZCwgJHtyZXN1bHRzLnN1bW1hcnkuZmFpbGVkfSBmYWlsZWRgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gc3VjY2Vzc2Z1bCByZXNwb25zZVxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEJhdGNoR2VuZXJhdGVSZXNwb25zZSA9IHtcclxuICAgICAgcmVzdWx0cyxcclxuICAgICAgdG9rZW5zVXNlZCxcclxuICAgICAgY29zdCxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdbQmF0Y2hdIEVycm9yOicsIGVycm9yKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gZXJyb3IgcmVzcG9uc2VcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIGdlbmVyYXRlIGJhdGNoIHRlc3RzJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19