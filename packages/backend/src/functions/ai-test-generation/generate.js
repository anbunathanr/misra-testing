"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const test_generator_1 = require("../../services/ai-test-generation/test-generator");
const ai_engine_1 = require("../../services/ai-test-generation/ai-engine");
const selector_generator_1 = require("../../services/ai-test-generation/selector-generator");
const test_case_service_1 = require("../../services/test-case-service");
const cost_tracker_1 = require("../../services/ai-test-generation/cost-tracker");
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
        const aiEngine = new ai_engine_1.AIEngine();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZW5lcmF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxRkFBaUY7QUFDakYsMkVBQXVFO0FBQ3ZFLDZGQUF5RjtBQUN6Rix3RUFBbUU7QUFDbkUsaUZBQTZFO0FBRzdFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLElBQUksQ0FBQztRQUNILHNDQUFzQztRQUN0QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDO1FBQzVELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsY0FBYztpQkFDdEIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSwwQkFBMEI7aUJBQ2xDLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUF3QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUss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O1FBRUYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxQyx3QkFBd0I7UUFDeEIsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLDhCQUE4QjtnQkFDckMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBakpXLFFBQUEsT0FBTyxXQWlKbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFRlc3RHZW5lcmF0b3IgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vdGVzdC1nZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBBSUVuZ2luZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9haS1lbmdpbmUnO1xyXG5pbXBvcnQgeyBTZWxlY3RvckdlbmVyYXRvciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9zZWxlY3Rvci1nZW5lcmF0b3InO1xyXG5pbXBvcnQgeyBUZXN0Q2FzZVNlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy90ZXN0LWNhc2Utc2VydmljZSc7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL2Nvc3QtdHJhY2tlcic7XHJcbmltcG9ydCB7IEdlbmVyYXRlVGVzdFJlcXVlc3QsIEdlbmVyYXRlVGVzdFJlc3BvbnNlLCBUb2tlblVzYWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuXHJcbi8qKlxyXG4gKiBQT1NUIC9hcGkvYWktdGVzdC1nZW5lcmF0aW9uL2dlbmVyYXRlXHJcbiAqIFxyXG4gKiBHZW5lcmF0ZXMgYSBzaW5nbGUgdGVzdCBjYXNlIGZyb20gYXBwbGljYXRpb24gYW5hbHlzaXMgYW5kIHNjZW5hcmlvIGRlc2NyaXB0aW9uLlxyXG4gKiBcclxuICogUmVxdWVzdCBCb2R5OlxyXG4gKiB7XHJcbiAqICAgYW5hbHlzaXM6IEFwcGxpY2F0aW9uQW5hbHlzaXM7XHJcbiAqICAgc2NlbmFyaW86IHN0cmluZztcclxuICogICBwcm9qZWN0SWQ6IHN0cmluZztcclxuICogICBzdWl0ZUlkOiBzdHJpbmc7XHJcbiAqIH1cclxuICogXHJcbiAqIFJlc3BvbnNlOlxyXG4gKiB7XHJcbiAqICAgdGVzdENhc2U6IFRlc3RDYXNlO1xyXG4gKiAgIHRva2Vuc1VzZWQ6IFRva2VuVXNhZ2U7XHJcbiAqICAgY29zdDogbnVtYmVyO1xyXG4gKiB9XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnW0dlbmVyYXRlXSBSZWNlaXZlZCByZXF1ZXN0Jyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBHZXQgdXNlciBJRCBmcm9tIGF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlcklkID0gZXZlbnQucmVxdWVzdENvbnRleHQuYXV0aG9yaXplcj8uY2xhaW1zPy5zdWI7XHJcbiAgICBpZiAoIXVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVW5hdXRob3JpemVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCByZXF1ZXN0OiBHZW5lcmF0ZVRlc3RSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC5hbmFseXNpcyB8fCAhcmVxdWVzdC5zY2VuYXJpbyB8fCAhcmVxdWVzdC5wcm9qZWN0SWQgfHwgIXJlcXVlc3Quc3VpdGVJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnYW5hbHlzaXMsIHNjZW5hcmlvLCBwcm9qZWN0SWQsIGFuZCBzdWl0ZUlkIGFyZSByZXF1aXJlZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtHZW5lcmF0ZV0gR2VuZXJhdGluZyB0ZXN0IGZvciBzY2VuYXJpbzogJHtyZXF1ZXN0LnNjZW5hcmlvLnN1YnN0cmluZygwLCA1MCl9Li4uYCk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBzZXJ2aWNlcyB3aXRoIHRhYmxlIG5hbWUgZnJvbSBlbnZpcm9ubWVudFxyXG4gICAgY29uc3QgdGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuQUlfVVNBR0VfVEFCTEUgfHwgJ0FJVXNhZ2UnO1xyXG4gICAgY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIodGFibGVOYW1lKTtcclxuICAgIFxyXG4gICAgLy8gQ2hlY2sgdXNhZ2UgbGltaXRzIGJlZm9yZSBwcm9jZWVkaW5nXHJcbiAgICBjb25zdCB3aXRoaW5MaW1pdCA9IGF3YWl0IGNvc3RUcmFja2VyLmNoZWNrTGltaXQodXNlcklkLCByZXF1ZXN0LnByb2plY3RJZCk7XHJcbiAgICBpZiAoIXdpdGhpbkxpbWl0KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDI5LFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdVc2FnZSBsaW1pdCBleGNlZWRlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnTW9udGhseSB1c2FnZSBsaW1pdCBoYXMgYmVlbiByZWFjaGVkLiBQbGVhc2UgY29udGFjdCBzdXBwb3J0IHRvIGluY3JlYXNlIHlvdXIgbGltaXQuJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhaUVuZ2luZSA9IG5ldyBBSUVuZ2luZSgpO1xyXG4gICAgY29uc3Qgc2VsZWN0b3JHZW5lcmF0b3IgPSBTZWxlY3RvckdlbmVyYXRvci5nZXRJbnN0YW5jZSgpO1xyXG4gICAgY29uc3QgdGVzdENhc2VTZXJ2aWNlID0gbmV3IFRlc3RDYXNlU2VydmljZSgpO1xyXG4gICAgY29uc3QgZ2VuZXJhdG9yID0gbmV3IFRlc3RHZW5lcmF0b3IoYWlFbmdpbmUsIHNlbGVjdG9yR2VuZXJhdG9yLCB0ZXN0Q2FzZVNlcnZpY2UpO1xyXG5cclxuICAgIC8vIEdlbmVyYXRlIHRlc3Qgc3BlY2lmaWNhdGlvbiBmcm9tIEFJXHJcbiAgICBjb25zdCBzcGVjaWZpY2F0aW9uID0gYXdhaXQgYWlFbmdpbmUuZ2VuZXJhdGVUZXN0U3BlY2lmaWNhdGlvbihcclxuICAgICAgcmVxdWVzdC5hbmFseXNpcyxcclxuICAgICAgcmVxdWVzdC5zY2VuYXJpb1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBHZW5lcmF0ZSB0ZXN0IGNhc2UgZnJvbSBzcGVjaWZpY2F0aW9uXHJcbiAgICBjb25zdCB0ZXN0Q2FzZSA9IGF3YWl0IGdlbmVyYXRvci5nZW5lcmF0ZShcclxuICAgICAgc3BlY2lmaWNhdGlvbixcclxuICAgICAgcmVxdWVzdC5hbmFseXNpcyxcclxuICAgICAgcmVxdWVzdC5wcm9qZWN0SWQsXHJcbiAgICAgIHJlcXVlc3Quc3VpdGVJZCxcclxuICAgICAgdXNlcklkXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFJlY29yZCB1c2FnZSAobW9jayB0b2tlbiB1c2FnZSBmb3Igbm93IC0gaW4gcmVhbCBpbXBsZW1lbnRhdGlvbiwgZ2V0IGZyb20gQUkgRW5naW5lKVxyXG4gICAgY29uc3QgdG9rZW5zVXNlZDogVG9rZW5Vc2FnZSA9IHtcclxuICAgICAgcHJvbXB0VG9rZW5zOiAxMDAwLFxyXG4gICAgICBjb21wbGV0aW9uVG9rZW5zOiA1MDAsXHJcbiAgICAgIHRvdGFsVG9rZW5zOiAxNTAwLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCBjb3N0ID0gY29zdFRyYWNrZXIuY2FsY3VsYXRlQ29zdCh0b2tlbnNVc2VkLCAnZ3B0LTQnKTtcclxuXHJcbiAgICBhd2FpdCBjb3N0VHJhY2tlci5yZWNvcmRVc2FnZShcclxuICAgICAgdXNlcklkLFxyXG4gICAgICByZXF1ZXN0LnByb2plY3RJZCxcclxuICAgICAgJ2dlbmVyYXRlJyxcclxuICAgICAgdG9rZW5zVXNlZCxcclxuICAgICAgJ2dwdC00JyxcclxuICAgICAgMSxcclxuICAgICAgMFxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0dlbmVyYXRlXSBUZXN0IGdlbmVyYXRlZCBzdWNjZXNzZnVsbHk6ICR7dGVzdENhc2UubmFtZX1gKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gc3VjY2Vzc2Z1bCByZXNwb25zZVxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEdlbmVyYXRlVGVzdFJlc3BvbnNlID0ge1xyXG4gICAgICB0ZXN0Q2FzZSxcclxuICAgICAgdG9rZW5zVXNlZCxcclxuICAgICAgY29zdCxcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdbR2VuZXJhdGVdIEVycm9yOicsIGVycm9yKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gZXJyb3IgcmVzcG9uc2VcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIGdlbmVyYXRlIHRlc3QgY2FzZScsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==