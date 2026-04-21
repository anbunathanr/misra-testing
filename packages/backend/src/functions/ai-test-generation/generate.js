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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW5lcmF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxRkFBaUY7QUFDakYsMkZBQXNGO0FBQ3RGLDZGQUF5RjtBQUN6Rix3RUFBbUU7QUFDbkUsaUZBQTZFO0FBRTdFLDJGQUFtRztBQUNuRyxxREFBMkQ7QUFFM0QseURBQXlEO0FBQ3pELHVEQUF1RDtBQUN2RCxJQUFJLENBQUM7SUFDSCxJQUFBLGdEQUE0QixHQUFFLENBQUM7QUFDakMsQ0FBQztBQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7SUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNFQUFzRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdGLDJFQUEyRTtJQUMzRSxNQUFNLEtBQUssQ0FBQztBQUNkLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQW1CRztBQUNJLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkJBQTZCLENBQUMsQ0FBQztJQUUzQyxJQUFJLENBQUM7UUFDSCxzQ0FBc0M7UUFDdEMsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzdDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDM0IsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSxjQUFjO2lCQUN0QixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJ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QUFDO1FBRTVELE1BQU0sV0FBVyxDQUFDLFdBQVcsQ0FDM0IsTUFBTSxFQUNOLE9BQU8sQ0FBQyxTQUFTLEVBQ2pCLFVBQVUsRUFDVixVQUFVLEVBQ1YsT0FBTyxFQUNQLFFBQVEsRUFDUixDQUFDLEVBQ0QsQ0FBQyxDQUNGLENBQUM7UUFFRixPQUFPLENBQUMsR0FBRyxDQUFDLDJDQUEyQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUV4RSw2QkFBNkI7UUFDN0IsTUFBTSxRQUFRLEdBQXlCO1lBQ3JDLFFBQVE7WUFDUixVQUFVO1lBQ1YsSUFBSTtTQUNMLENBQUM7UUFFRixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztTQUMvQixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTFDLHdCQUF3QjtRQUN4QixPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUsOEJBQThCO2dCQUNyQyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFuSlcsUUFBQSxPQUFPLFdBbUpsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgVGVzdEdlbmVyYXRvciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi90ZXN0LWdlbmVyYXRvcic7XHJcbmltcG9ydCB7IEFJRW5naW5lRmFjdG9yeSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9haS1lbmdpbmUtZmFjdG9yeSc7XHJcbmltcG9ydCB7IFNlbGVjdG9yR2VuZXJhdG9yIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL3NlbGVjdG9yLWdlbmVyYXRvcic7XHJcbmltcG9ydCB7IFRlc3RDYXNlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL3Rlc3QtY2FzZS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgQ29zdFRyYWNrZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vY29zdC10cmFja2VyJztcclxuaW1wb3J0IHsgR2VuZXJhdGVUZXN0UmVxdWVzdCwgR2VuZXJhdGVUZXN0UmVzcG9uc2UsIFRva2VuVXNhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9haS10ZXN0LWdlbmVyYXRpb24nO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZVN0YXJ0dXBDb25maWd1cmF0aW9uIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL3N0YXJ0dXAtdmFsaWRhdG9yJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbi8vIFRhc2sgMTAuMjogVmFsaWRhdGUgY29uZmlndXJhdGlvbiBvbiBMYW1iZGEgY29sZCBzdGFydFxyXG4vLyBUaGlzIHJ1bnMgb25jZSB3aGVuIHRoZSBMYW1iZGEgY29udGFpbmVyIGluaXRpYWxpemVzXHJcbnRyeSB7XHJcbiAgdmFsaWRhdGVTdGFydHVwQ29uZmlndXJhdGlvbigpO1xyXG59IGNhdGNoIChlcnJvcikge1xyXG4gIGNvbnNvbGUuZXJyb3IoJ1tHZW5lcmF0ZV0gRmFpbGVkIHRvIGluaXRpYWxpemUgTGFtYmRhIGR1ZSB0byBpbnZhbGlkIGNvbmZpZ3VyYXRpb246JywgZXJyb3IpO1xyXG4gIC8vIExhbWJkYSB3aWxsIGZhaWwgdG8gaW5pdGlhbGl6ZSwgcHJldmVudGluZyByZXF1ZXN0cyBmcm9tIGJlaW5nIHByb2Nlc3NlZFxyXG4gIHRocm93IGVycm9yO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZW5lcmF0ZVxyXG4gKiBcclxuICogR2VuZXJhdGVzIGEgc2luZ2xlIHRlc3QgY2FzZSBmcm9tIGFwcGxpY2F0aW9uIGFuYWx5c2lzIGFuZCBzY2VuYXJpbyBkZXNjcmlwdGlvbi5cclxuICogXHJcbiAqIFJlcXVlc3QgQm9keTpcclxuICoge1xyXG4gKiAgIGFuYWx5c2lzOiBBcHBsaWNhdGlvbkFuYWx5c2lzO1xyXG4gKiAgIHNjZW5hcmlvOiBzdHJpbmc7XHJcbiAqICAgcHJvamVjdElkOiBzdHJpbmc7XHJcbiAqICAgc3VpdGVJZDogc3RyaW5nO1xyXG4gKiB9XHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIHRlc3RDYXNlOiBUZXN0Q2FzZTtcclxuICogICB0b2tlbnNVc2VkOiBUb2tlblVzYWdlO1xyXG4gKiAgIGNvc3Q6IG51bWJlcjtcclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1tHZW5lcmF0ZV0gUmVjZWl2ZWQgcmVxdWVzdCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgY29uc3QgdXNlcklkID0gdXNlci51c2VySWQ7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVW5hdXRob3JpemVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBHZW5lcmF0ZVRlc3RSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5hbmFseXNpcyB8fCAhcmVxdWVzdC5zY2VuYXJpbyB8fCAhcmVxdWVzdC5wcm9qZWN0SWQgfHwgIXJlcXVlc3Quc3VpdGVJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnYW5hbHlzaXMsIHNjZW5hcmlvLCBwcm9qZWN0SWQsIGFuZCBzdWl0ZUlkIGFyZSByZXF1aXJlZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtHZW5lcmF0ZV0gR2VuZXJhdGluZyB0ZXN0IGZvciBzY2VuYXJpbzogJHtyZXF1ZXN0LnNjZW5hcmlvLnN1YnN0cmluZygwLCA1MCl9Li4uYCk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBzZXJ2aWNlcyB3aXRoIHRhYmxlIG5hbWUgZnJvbSBlbnZpcm9ubWVudFxyXG4gICAgY29uc3QgdGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuQUlfVVNBR0VfVEFCTEUgfHwgJ0FJVXNhZ2UnO1xyXG4gICAgY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIodGFibGVOYW1lKTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgdXNhZ2UgbGltaXRzIGJlZm9yZSBwcm9jZWVkaW5nXHJcbiAgICBjb25zdCB3aXRoaW5MaW1pdCA9IGF3YWl0IGNvc3RUcmFja2VyLmNoZWNrTGltaXQodXNlcklkLCByZXF1ZXN0LnByb2plY3RJZCk7XHJcbiAgICBpZiAoIXdpdGhpbkxpbWl0KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDI5LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdVc2FnZSBsaW1pdCBleGNlZWRlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnTW9udGhseSB1c2FnZSBsaW1pdCBoYXMgYmVlbiByZWFjaGVkLiBQbGVhc2UgY29udGFjdCBzdXBwb3J0IHRvIGluY3JlYXNlIHlvdXIgbGltaXQuJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhaUVuZ2luZSA9IEFJRW5naW5lRmFjdG9yeS5jcmVhdGUoKTtcclxuICAgIGNvbnN0IHNlbGVjdG9yR2VuZXJhdG9yID0gU2VsZWN0b3JHZW5lcmF0b3IuZ2V0SW5zdGFuY2UoKTtcclxuICAgIGNvbnN0IHRlc3RDYXNlU2VydmljZSA9IG5ldyBUZXN0Q2FzZVNlcnZpY2UoKTtcclxuICAgIGNvbnN0IGdlbmVyYXRvciA9IG5ldyBUZXN0R2VuZXJhdG9yKGFpRW5naW5lLCBzZWxlY3RvckdlbmVyYXRvciwgdGVzdENhc2VTZXJ2aWNlKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSB0ZXN0IHNwZWNpZmljYXRpb24gZnJvbSBBSVxyXG4gICAgY29uc3Qgc3BlY2lmaWNhdGlvbiA9IGF3YWl0IGFpRW5naW5lLmdlbmVyYXRlVGVzdFNwZWNpZmljYXRpb24oXHJcbiAgICAgIHJlcXVlc3QuYW5hbHlzaXMsXHJcbiAgICAgIHJlcXVlc3Quc2NlbmFyaW9cclxuICAgICk7XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdGVzdCBjYXNlIGZyb20gc3BlY2lmaWNhdGlvblxyXG4gICAgY29uc3QgdGVzdENhc2UgPSBhd2FpdCBnZW5lcmF0b3IuZ2VuZXJhdGUoXHJcbiAgICAgIHNwZWNpZmljYXRpb24sXHJcbiAgICAgIHJlcXVlc3QuYW5hbHlzaXMsXHJcbiAgICAgIHJlcXVlc3QucHJvamVjdElkLFxyXG4gICAgICByZXF1ZXN0LnN1aXRlSWQsXHJcbiAgICAgIHVzZXJJZFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBSZWNvcmQgdXNhZ2UgKG1vY2sgdG9rZW4gdXNhZ2UgZm9yIG5vdyAtIGluIHJlYWwgaW1wbGVtZW50YXRpb24sIGdldCBmcm9tIEFJIEVuZ2luZSlcclxuICAgIGNvbnN0IHRva2Vuc1VzZWQ6IFRva2VuVXNhZ2UgPSB7XHJcbiAgICAgIHByb21wdFRva2VuczogMTAwMCxcclxuICAgICAgY29tcGxldGlvblRva2VuczogNTAwLFxyXG4gICAgICB0b3RhbFRva2VuczogMTUwMCxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgY29zdCA9IGNvc3RUcmFja2VyLmNhbGN1bGF0ZUNvc3QodG9rZW5zVXNlZCwgJ2dwdC00Jyk7XHJcblxyXG4gICAgYXdhaXQgY29zdFRyYWNrZXIucmVjb3JkVXNhZ2UoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgcmVxdWVzdC5wcm9qZWN0SWQsXHJcbiAgICAgICdnZW5lcmF0ZScsXHJcbiAgICAgIHRva2Vuc1VzZWQsXHJcbiAgICAgICdncHQtNCcsXHJcbiAgICAgICdPUEVOQUknLFxyXG4gICAgICAxLFxyXG4gICAgICAwXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbR2VuZXJhdGVdIFRlc3QgZ2VuZXJhdGVkIHN1Y2Nlc3NmdWxseTogJHt0ZXN0Q2FzZS5uYW1lfWApO1xyXG5cclxuICAgIC8vIFJldHVybiBzdWNjZXNzZnVsIHJlc3BvbnNlXHJcbiAgICBjb25zdCByZXNwb25zZTogR2VuZXJhdGVUZXN0UmVzcG9uc2UgPSB7XHJcbiAgICAgIHRlc3RDYXNlLFxyXG4gICAgICB0b2tlbnNVc2VkLFxyXG4gICAgICBjb3N0LFxyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tHZW5lcmF0ZV0gRXJyb3I6JywgZXJyb3IpO1xyXG5cclxuICAgIC8vIFJldHVybiBlcnJvciByZXNwb25zZVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZ2VuZXJhdGUgdGVzdCBjYXNlJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19