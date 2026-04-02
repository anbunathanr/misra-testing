"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_generator_1 = require("../../services/ai-test-generation/test-generator");
const ai_engine_factory_1 = require("../../services/ai-test-generation/ai-engine-factory");
const selector_generator_1 = require("../../services/ai-test-generation/selector-generator");
const test_case_service_1 = require("../../services/test-case-service");
const cost_tracker_1 = require("../../services/ai-test-generation/cost-tracker");
const startup_validator_1 = require("../../services/ai-test-generation/startup-validator");
// Task 10.2: Validate configuration on Lambda cold start
// This runs once when the Lambda container initializes
try {
    (0, startup_validator_1.validateStartupConfiguration)();
}
catch (error) {
    console.error('[Generate] Failed to initialize Lambda due to invalid configuration:', error);
    // Lambda will fail to initialize, preventing requests from being processed
    throw error;
}
/**
 * POST /api/ai-test-generation/generate
 *
 * Generates a single test case from application analysis and scenario description.
 *
 * Request Body:
 * {
 *   analysis: ApplicationAnalysis;
 *   scenario: string;
 *   projectId: string;
 *   suiteId: string;
 * }
 *
 * Response:
 * {
 *   testCase: TestCase;
 *   tokensUsed: TokenUsage;
 *   cost: number;
 * }
 */
const handler = async (event) => {
    console.log('[Generate] Received request');
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
        if (!request.analysis || !request.scenario || !request.projectId || !request.suiteId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'analysis, scenario, projectId, and suiteId are required',
                }),
            };
        }
        console.log(`[Generate] Generating test for scenario: ${request.scenario.substring(0, 50)}...`);
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
        const aiEngine = ai_engine_factory_1.AIEngineFactory.create();
        const selectorGenerator = selector_generator_1.SelectorGenerator.getInstance();
        const testCaseService = new test_case_service_1.TestCaseService();
        const generator = new test_generator_1.TestGenerator(aiEngine, selectorGenerator, testCaseService);
        // Generate test specification from AI
        const specification = await aiEngine.generateTestSpecification(request.analysis, request.scenario);
        // Generate test case from specification
        const testCase = await generator.generate(specification, request.analysis, request.projectId, request.suiteId, userId);
        // Record usage (mock token usage for now - in real implementation, get from AI Engine)
        const tokensUsed = {
            promptTokens: 1000,
            completionTokens: 500,
            totalTokens: 1500,
        };
        const cost = costTracker.calculateCost(tokensUsed, 'gpt-4');
        await costTracker.recordUsage(userId, request.projectId, 'generate', tokensUsed, 'gpt-4', 1, 0);
        console.log(`[Generate] Test generated successfully: ${testCase.name}`);
        // Return successful response
        const response = {
            testCase,
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
        console.error('[Generate] Error:', error);
        // Return error response
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to generate test case',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW5lcmF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxRkFBaUY7QUFDakYsMkZBQXNGO0FBQ3RGLDZGQUF5RjtBQUN6Rix3RUFBbUU7QUFDbkUsaUZBQTZFO0FBRTdFLDJGQUFtRztBQUVuRyx5REFBeUQ7QUFDekQsdURBQXVEO0FBQ3ZELElBQUksQ0FBQztJQUNILElBQUEsZ0RBQTRCLEdBQUUsQ0FBQztBQUNqQyxDQUFDO0FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztJQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0VBQXNFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDN0YsMkVBQTJFO0lBQzNFLE1BQU0sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLElBQUksQ0FBQztRQUNILHNDQUFzQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQzVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsY0FBYztpQkFDdEIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUs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RUFDTixPQUFPLENBQUMsU0FBUyxFQUNqQixVQUFVLEVBQ1YsVUFBVSxFQUNWLE9BQU8sRUFDUCxDQUFDLEVBQ0QsQ0FBQyxDQUNGLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUV4RSw2QkFBNkI7UUFDN0IsTUFBTSxRQUFRLEdBQXlCO1lBQ3JDLFFBQVE7WUFDUixVQUFVO1lBQ1YsSUFBSTtTQUNMLENBQUM7UUFFRixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTFDLHdCQUF3QjtRQUN4QixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUsOEJBQThCO2dCQUNyQyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFqSlcsUUFBQSxPQUFPLFdBaUpsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgVGVzdEdlbmVyYXRvciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi90ZXN0LWdlbmVyYXRvcic7XHJcbmltcG9ydCB7IEFJRW5naW5lRmFjdG9yeSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9haS1lbmdpbmUtZmFjdG9yeSc7XHJcbmltcG9ydCB7IFNlbGVjdG9yR2VuZXJhdG9yIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL3NlbGVjdG9yLWdlbmVyYXRvcic7XHJcbmltcG9ydCB7IFRlc3RDYXNlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3QtY2FzZS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgQ29zdFRyYWNrZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vY29zdC10cmFja2VyJztcclxuaW1wb3J0IHsgR2VuZXJhdGVUZXN0UmVxdWVzdCwgR2VuZXJhdGVUZXN0UmVzcG9uc2UsIFRva2VuVXNhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZVN0YXJ0dXBDb25maWd1cmF0aW9uIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL3N0YXJ0dXAtdmFsaWRhdG9yJztcclxuXHJcbi8vIFRhc2sgMTAuMjogVmFsaWRhdGUgY29uZmlndXJhdGlvbiBvbiBMYW1iZGEgY29sZCBzdGFydFxyXG4vLyBUaGlzIHJ1bnMgb25jZSB3aGVuIHRoZSBMYW1iZGEgY29udGFpbmVyIGluaXRpYWxpemVzXHJcbnRyeSB7XHJcbiAgdmFsaWRhdGVTdGFydHVwQ29uZmlndXJhdGlvbigpO1xyXG59IGNhdGNoIChlcnJvcikge1xyXG4gIGNvbnNvbGUuZXJyb3IoJ1tHZW5lcmF0ZV0gRmFpbGVkIHRvIGluaXRpYWxpemUgTGFtYmRhIGR1ZSB0byBpbnZhbGlkIGNvbmZpZ3VyYXRpb246JywgZXJyb3IpO1xyXG4gIC8vIExhbWJkYSB3aWxsIGZhaWwgdG8gaW5pdGlhbGl6ZSwgcHJldmVudGluZyByZXF1ZXN0cyBmcm9tIGJlaW5nIHByb2Nlc3NlZFxyXG4gIHRocm93IGVycm9yO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZW5lcmF0ZVxyXG4gKiBcclxuICogR2VuZXJhdGVzIGEgc2luZ2xlIHRlc3QgY2FzZSBmcm9tIGFwcGxpY2F0aW9uIGFuYWx5c2lzIGFuZCBzY2VuYXJpbyBkZXNjcmlwdGlvbi5cclxuICogXHJcbiAqIFJlcXVlc3QgQm9keTpcclxuICoge1xyXG4gKiAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzO1xyXG4gKiAgIHNjZW5hcmlvOiBzdHJpbmc7XHJcbiAqICAgcHJvamVjdElkOiBzdHJpbmc7XHJcbiAqICAgc3VpdGVJZDogc3RyaW5nO1xyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIHRlc3RDYXNlOiBUZXN0Q2FzZTtcclxuICogICB0b2tlbnNVc2VkOiBUb2tlblVzYWdlO1xyXG4gKiAgIGNvc3Q6IG51bWJlcjtcclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1tHZW5lcmF0ZV0gUmVjZWl2ZWQgcmVxdWVzdCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHVzZXJJZCA9IGV2ZW50LnJlcXVlc3RDb250ZXh0LmF1dGhvcml6ZXI/LmNsYWltcz8uc3ViO1xyXG4gICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1VuYXV0aG9yaXplZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGVUZXN0UmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QuYW5hbHlzaXMgfHwgIXJlcXVlc3Quc2NlbmFyaW8gfHwgIXJlcXVlc3QucHJvamVjdElkIHx8ICFyZXF1ZXN0LnN1aXRlSWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ2FuYWx5c2lzLCBzY2VuYXJpbywgcHJvamVjdElkLCBhbmQgc3VpdGVJZCBhcmUgcmVxdWlyZWQnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbR2VuZXJhdGVdIEdlbmVyYXRpbmcgdGVzdCBmb3Igc2NlbmFyaW86ICR7cmVxdWVzdC5zY2VuYXJpby5zdWJzdHJpbmcoMCwgNTApfS4uLmApO1xyXG5cclxuICAgIC8vIEluaXRpYWxpemUgc2VydmljZXMgd2l0aCB0YWJsZSBuYW1lIGZyb20gZW52aXJvbm1lbnRcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LkFJX1VTQUdFX1RBQkxFIHx8ICdBSVVzYWdlJztcclxuICAgIGNvbnN0IGNvc3RUcmFja2VyID0gbmV3IENvc3RUcmFja2VyKHRhYmxlTmFtZSk7XHJcbiAgICBcclxuICAgIC8vIENoZWNrIHVzYWdlIGxpbWl0cyBiZWZvcmUgcHJvY2VlZGluZ1xyXG4gICAgY29uc3Qgd2l0aGluTGltaXQgPSBhd2FpdCBjb3N0VHJhY2tlci5jaGVja0xpbWl0KHVzZXJJZCwgcmVxdWVzdC5wcm9qZWN0SWQpO1xyXG4gICAgaWYgKCF3aXRoaW5MaW1pdCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQyOSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVXNhZ2UgbGltaXQgZXhjZWVkZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ01vbnRobHkgdXNhZ2UgbGltaXQgaGFzIGJlZW4gcmVhY2hlZC4gUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydCB0byBpbmNyZWFzZSB5b3VyIGxpbWl0LicsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYWlFbmdpbmUgPSBBSUVuZ2luZUZhY3RvcnkuY3JlYXRlKCk7XHJcbiAgICBjb25zdCBzZWxlY3RvckdlbmVyYXRvciA9IFNlbGVjdG9yR2VuZXJhdG9yLmdldEluc3RhbmNlKCk7XHJcbiAgICBjb25zdCB0ZXN0Q2FzZVNlcnZpY2UgPSBuZXcgVGVzdENhc2VTZXJ2aWNlKCk7XHJcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBuZXcgVGVzdEdlbmVyYXRvcihhaUVuZ2luZSwgc2VsZWN0b3JHZW5lcmF0b3IsIHRlc3RDYXNlU2VydmljZSk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdGVzdCBzcGVjaWZpY2F0aW9uIGZyb20gQUlcclxuICAgIGNvbnN0IHNwZWNpZmljYXRpb24gPSBhd2FpdCBhaUVuZ2luZS5nZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uKFxyXG4gICAgICByZXF1ZXN0LmFuYWx5c2lzLFxyXG4gICAgICByZXF1ZXN0LnNjZW5hcmlvXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHRlc3QgY2FzZSBmcm9tIHNwZWNpZmljYXRpb25cclxuICAgIGNvbnN0IHRlc3RDYXNlID0gYXdhaXQgZ2VuZXJhdG9yLmdlbmVyYXRlKFxyXG4gICAgICBzcGVjaWZpY2F0aW9uLFxyXG4gICAgICByZXF1ZXN0LmFuYWx5c2lzLFxyXG4gICAgICByZXF1ZXN0LnByb2plY3RJZCxcclxuICAgICAgcmVxdWVzdC5zdWl0ZUlkLFxyXG4gICAgICB1c2VySWRcclxuICAgICk7XHJcblxyXG4gICAgLy8gUmVjb3JkIHVzYWdlIChtb2NrIHRva2VuIHVzYWdlIGZvciBub3cgLSBpbiByZWFsIGltcGxlbWVudGF0aW9uLCBnZXQgZnJvbSBBSSBFbmdpbmUpXHJcbiAgICBjb25zdCB0b2tlbnNVc2VkOiBUb2tlblVzYWdlID0ge1xyXG4gICAgICBwcm9tcHRUb2tlbnM6IDEwMDAsXHJcbiAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IDUwMCxcclxuICAgICAgdG90YWxUb2tlbnM6IDE1MDAsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGNvc3QgPSBjb3N0VHJhY2tlci5jYWxjdWxhdGVDb3N0KHRva2Vuc1VzZWQsICdncHQtNCcpO1xyXG5cclxuICAgIGF3YWl0IGNvc3RUcmFja2VyLnJlY29yZFVzYWdlKFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHJlcXVlc3QucHJvamVjdElkLFxyXG4gICAgICAnZ2VuZXJhdGUnLFxyXG4gICAgICB0b2tlbnNVc2VkLFxyXG4gICAgICAnZ3B0LTQnLFxyXG4gICAgICAxLFxyXG4gICAgICAwXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbR2VuZXJhdGVdIFRlc3QgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseTogJHt0ZXN0Q2FzZS5uYW1lfWApO1xyXG5cclxuICAgIC8vIFJldHVybiBzdWNjZXNzZnVsIHJlc3BvbnNlXHJcbiAgICBjb25zdCByZXNwb25zZTogR2VuZXJhdGVUZXN0UmVzcG9uc2UgPSB7XHJcbiAgICAgIHRlc3RDYXNlLFxyXG4gICAgICB0b2tlbnNVc2VkLFxyXG4gICAgICBjb3N0LFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tHZW5lcmF0ZV0gRXJyb3I6JywgZXJyb3IpO1xyXG5cclxuICAgIC8vIFJldHVybiBlcnJvciByZXNwb25zZVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZ2VuZXJhdGUgdGVzdCBjYXNlJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19