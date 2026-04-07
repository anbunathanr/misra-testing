"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_generator_1 = require("../../services/ai-test-generation/test-generator");
const ai_engine_factory_1 = require("../../services/ai-test-generation/ai-engine-factory");
const selector_generator_1 = require("../../services/ai-test-generation/selector-generator");
const test_case_service_1 = require("../../services/test-case-service");
const cost_tracker_1 = require("../../services/ai-test-generation/cost-tracker");
const startup_validator_1 = require("../../services/ai-test-generation/startup-validator");
const auth_util_1 = require("../../utils/auth-util");
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
        await costTracker.recordUsage(userId, request.projectId, 'generate', tokensUsed, 'gpt-4', 'OPENAI', 1, 0);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW5lcmF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxRkFBaUY7QUFDakYsMkZBQXNGO0FBQ3RGLDZGQUF5RjtBQUN6Rix3RUFBbUU7QUFDbkUsaUZBQTZFO0FBRTdFLDJGQUFtRztBQUNuRyxxREFBMkQ7QUFFM0QseURBQXlEO0FBQ3pELHVEQUF1RDtBQUN2RCxJQUFJLENBQUM7SUFDSCxJQUFBLGdEQUE0QixHQUFFLENBQUM7QUFDakMsQ0FBQztBQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7SUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNFQUFzRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdGLDJFQUEyRTtJQUMzRSxNQUFNLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUUzQyxJQUFJLENBQUM7UUFDSCxzQ0FBc0M7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzNCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsY0FBYztpQkFDdEIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxF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QUU1RCxNQUFNLFdBQVcsQ0FBQyxXQUFXLENBQzNCLE1BQU0sRUFDTixPQUFPLENBQUMsU0FBUyxFQUNqQixVQUFVLEVBQ1YsVUFBVSxFQUNWLE9BQU8sRUFDUCxRQUFRLEVBQ1IsQ0FBQyxFQUNELENBQUMsQ0FDRixDQUFDO1FBRUYsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQ0FBMkMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7UUFFeEUsNkJBQTZCO1FBQzdCLE1BQU0sUUFBUSxHQUF5QjtZQUNyQyxRQUFRO1lBQ1IsVUFBVTtZQUNWLElBQUk7U0FDTCxDQUFDO1FBRUYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxQyx3QkFBd0I7UUFDeEIsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLDhCQUE4QjtnQkFDckMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBbkpXLFFBQUEsT0FBTyxXQW1KbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFRlc3RHZW5lcmF0b3IgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vdGVzdC1nZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBBSUVuZ2luZUZhY3RvcnkgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vYWktZW5naW5lLWZhY3RvcnknO1xyXG5pbXBvcnQgeyBTZWxlY3RvckdlbmVyYXRvciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9zZWxlY3Rvci1nZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBUZXN0Q2FzZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWNhc2Utc2VydmljZSc7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL2Nvc3QtdHJhY2tlcic7XHJcbmltcG9ydCB7IEdlbmVyYXRlVGVzdFJlcXVlc3QsIEdlbmVyYXRlVGVzdFJlc3BvbnNlLCBUb2tlblVzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuaW1wb3J0IHsgdmFsaWRhdGVTdGFydHVwQ29uZmlndXJhdGlvbiB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9zdGFydHVwLXZhbGlkYXRvcic7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG4vLyBUYXNrIDEwLjI6IFZhbGlkYXRlIGNvbmZpZ3VyYXRpb24gb24gTGFtYmRhIGNvbGQgc3RhcnRcclxuLy8gVGhpcyBydW5zIG9uY2Ugd2hlbiB0aGUgTGFtYmRhIGNvbnRhaW5lciBpbml0aWFsaXplc1xyXG50cnkge1xyXG4gIHZhbGlkYXRlU3RhcnR1cENvbmZpZ3VyYXRpb24oKTtcclxufSBjYXRjaCAoZXJyb3IpIHtcclxuICBjb25zb2xlLmVycm9yKCdbR2VuZXJhdGVdIEZhaWxlZCB0byBpbml0aWFsaXplIExhbWJkYSBkdWUgdG8gaW52YWxpZCBjb25maWd1cmF0aW9uOicsIGVycm9yKTtcclxuICAvLyBMYW1iZGEgd2lsbCBmYWlsIHRvIGluaXRpYWxpemUsIHByZXZlbnRpbmcgcmVxdWVzdHMgZnJvbSBiZWluZyBwcm9jZXNzZWRcclxuICB0aHJvdyBlcnJvcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFBPU1QgL2FwaS9haS10ZXN0LWdlbmVyYXRpb24vZ2VuZXJhdGVcclxuICogXHJcbiAqIEdlbmVyYXRlcyBhIHNpbmdsZSB0ZXN0IGNhc2UgZnJvbSBhcHBsaWNhdGlvbiBhbmFseXNpcyBhbmQgc2NlbmFyaW8gZGVzY3JpcHRpb24uXHJcbiAqIFxyXG4gKiBSZXF1ZXN0IEJvZHk6XHJcbiAqIHtcclxuICogICBhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpcztcclxuICogICBzY2VuYXJpbzogc3RyaW5nO1xyXG4gKiAgIHByb2plY3RJZDogc3RyaW5nO1xyXG4gKiAgIHN1aXRlSWQ6IHN0cmluZztcclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICB0ZXN0Q2FzZTogVGVzdENhc2U7XHJcbiAqICAgdG9rZW5zVXNlZDogVG9rZW5Vc2FnZTtcclxuICogICBjb3N0OiBudW1iZXI7XHJcbiAqIH1cclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxyXG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdbR2VuZXJhdGVdIFJlY2VpdmVkIHJlcXVlc3QnKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEdldCB1c2VyIElEIGZyb20gYXV0aG9yaXplciBjb250ZXh0XHJcbiAgICBjb25zdCB1c2VyID0gZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIudXNlcklkO1xyXG4gICAgaWYgKCF1c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1VuYXV0aG9yaXplZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcmVxdWVzdDogR2VuZXJhdGVUZXN0UmVxdWVzdCA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXJlcXVlc3QuYW5hbHlzaXMgfHwgIXJlcXVlc3Quc2NlbmFyaW8gfHwgIXJlcXVlc3QucHJvamVjdElkIHx8ICFyZXF1ZXN0LnN1aXRlSWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ2FuYWx5c2lzLCBzY2VuYXJpbywgcHJvamVjdElkLCBhbmQgc3VpdGVJZCBhcmUgcmVxdWlyZWQnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbR2VuZXJhdGVdIEdlbmVyYXRpbmcgdGVzdCBmb3Igc2NlbmFyaW86ICR7cmVxdWVzdC5zY2VuYXJpby5zdWJzdHJpbmcoMCwgNTApfS4uLmApO1xyXG5cclxuICAgIC8vIEluaXRpYWxpemUgc2VydmljZXMgd2l0aCB0YWJsZSBuYW1lIGZyb20gZW52aXJvbm1lbnRcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LkFJX1VTQUdFX1RBQkxFIHx8ICdBSVVzYWdlJztcclxuICAgIGNvbnN0IGNvc3RUcmFja2VyID0gbmV3IENvc3RUcmFja2VyKHRhYmxlTmFtZSk7XHJcbiAgICBcclxuICAgIC8vIENoZWNrIHVzYWdlIGxpbWl0cyBiZWZvcmUgcHJvY2VlZGluZ1xyXG4gICAgY29uc3Qgd2l0aGluTGltaXQgPSBhd2FpdCBjb3N0VHJhY2tlci5jaGVja0xpbWl0KHVzZXJJZCwgcmVxdWVzdC5wcm9qZWN0SWQpO1xyXG4gICAgaWYgKCF3aXRoaW5MaW1pdCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQyOSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVXNhZ2UgbGltaXQgZXhjZWVkZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ01vbnRobHkgdXNhZ2UgbGltaXQgaGFzIGJlZW4gcmVhY2hlZC4gUGxlYXNlIGNvbnRhY3Qgc3VwcG9ydCB0byBpbmNyZWFzZSB5b3VyIGxpbWl0LicsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgYWlFbmdpbmUgPSBBSUVuZ2luZUZhY3RvcnkuY3JlYXRlKCk7XHJcbiAgICBjb25zdCBzZWxlY3RvckdlbmVyYXRvciA9IFNlbGVjdG9yR2VuZXJhdG9yLmdldEluc3RhbmNlKCk7XHJcbiAgICBjb25zdCB0ZXN0Q2FzZVNlcnZpY2UgPSBuZXcgVGVzdENhc2VTZXJ2aWNlKCk7XHJcbiAgICBjb25zdCBnZW5lcmF0b3IgPSBuZXcgVGVzdEdlbmVyYXRvcihhaUVuZ2luZSwgc2VsZWN0b3JHZW5lcmF0b3IsIHRlc3RDYXNlU2VydmljZSk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdGVzdCBzcGVjaWZpY2F0aW9uIGZyb20gQUlcclxuICAgIGNvbnN0IHNwZWNpZmljYXRpb24gPSBhd2FpdCBhaUVuZ2luZS5nZW5lcmF0ZVRlc3RTcGVjaWZpY2F0aW9uKFxyXG4gICAgICByZXF1ZXN0LmFuYWx5c2lzLFxyXG4gICAgICByZXF1ZXN0LnNjZW5hcmlvXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHRlc3QgY2FzZSBmcm9tIHNwZWNpZmljYXRpb25cclxuICAgIGNvbnN0IHRlc3RDYXNlID0gYXdhaXQgZ2VuZXJhdG9yLmdlbmVyYXRlKFxyXG4gICAgICBzcGVjaWZpY2F0aW9uLFxyXG4gICAgICByZXF1ZXN0LmFuYWx5c2lzLFxyXG4gICAgICByZXF1ZXN0LnByb2plY3RJZCxcclxuICAgICAgcmVxdWVzdC5zdWl0ZUlkLFxyXG4gICAgICB1c2VySWRcclxuICAgICk7XHJcblxyXG4gICAgLy8gUmVjb3JkIHVzYWdlIChtb2NrIHRva2VuIHVzYWdlIGZvciBub3cgLSBpbiByZWFsIGltcGxlbWVudGF0aW9uLCBnZXQgZnJvbSBBSSBFbmdpbmUpXHJcbiAgICBjb25zdCB0b2tlbnNVc2VkOiBUb2tlblVzYWdlID0ge1xyXG4gICAgICBwcm9tcHRUb2tlbnM6IDEwMDAsXHJcbiAgICAgIGNvbXBsZXRpb25Ub2tlbnM6IDUwMCxcclxuICAgICAgdG90YWxUb2tlbnM6IDE1MDAsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGNvc3QgPSBjb3N0VHJhY2tlci5jYWxjdWxhdGVDb3N0KHRva2Vuc1VzZWQsICdncHQtNCcpO1xyXG5cclxuICAgIGF3YWl0IGNvc3RUcmFja2VyLnJlY29yZFVzYWdlKFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHJlcXVlc3QucHJvamVjdElkLFxyXG4gICAgICAnZ2VuZXJhdGUnLFxyXG4gICAgICB0b2tlbnNVc2VkLFxyXG4gICAgICAnZ3B0LTQnLFxyXG4gICAgICAnT1BFTkFJJyxcclxuICAgICAgMSxcclxuICAgICAgMFxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0dlbmVyYXRlXSBUZXN0IGdlbmVyYXRlZCBzdWNjZXNzZnVsbHk6ICR7dGVzdENhc2UubmFtZX1gKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gc3VjY2Vzc2Z1bCByZXNwb25zZVxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEdlbmVyYXRlVGVzdFJlc3BvbnNlID0ge1xyXG4gICAgICB0ZXN0Q2FzZSxcclxuICAgICAgdG9rZW5zVXNlZCxcclxuICAgICAgY29zdCxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdbR2VuZXJhdGVdIEVycm9yOicsIGVycm9yKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gZXJyb3IgcmVzcG9uc2VcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIGdlbmVyYXRlIHRlc3QgY2FzZScsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==