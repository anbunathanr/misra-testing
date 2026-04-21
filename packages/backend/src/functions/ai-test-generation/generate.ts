import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { TestGenerator } from '../../services/ai-test-generation/test-generator';
import { AIEngineFactory } from '../../services/ai-test-generation/ai-engine-factory';
import { SelectorGenerator } from '../../services/ai-test-generation/selector-generator';
import { TestCaseService } from '../../services/test-case-service';
import { CostTracker } from '../../services/ai-test-generation/cost-tracker';
import { GenerateTestRequest, GenerateTestResponse, TokenUsage } from '../../types/ai-test-generation';
import { validateStartupConfiguration } from '../../services/ai-test-generation/startup-validator';
import { getUserFromContext } from '../../utils/auth-util';

// Task 10.2: Validate configuration on Lambda cold start
// This runs once when the Lambda container initializes
try {
  validateStartupConfiguration();
} catch (error) {
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
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[Generate] Received request');

  try {
    // Get user ID from authorizer context
    const user = await getUserFromContext(event);
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

    const request: GenerateTestRequest = JSON.parse(event.body);

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
    const costTracker = new CostTracker(tableName);
    
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

    const aiEngine = AIEngineFactory.create();
    const selectorGenerator = SelectorGenerator.getInstance();
    const testCaseService = new TestCaseService();
    const generator = new TestGenerator(aiEngine, selectorGenerator, testCaseService);

    // Generate test specification from AI
    const specification = await aiEngine.generateTestSpecification(
      request.analysis,
      request.scenario
    );

    // Generate test case from specification
    const testCase = await generator.generate(
      specification,
      request.analysis,
      request.projectId,
      request.suiteId,
      userId
    );

    // Record usage (mock token usage for now - in real implementation, get from AI Engine)
    const tokensUsed: TokenUsage = {
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
    };

    const cost = costTracker.calculateCost(tokensUsed, 'gpt-4');

    await costTracker.recordUsage(
      userId,
      request.projectId,
      'generate',
      tokensUsed,
      'gpt-4',
      'OPENAI',
      1,
      0
    );

    console.log(`[Generate] Test generated successfully: ${testCase.name}`);

    // Return successful response
    const response: GenerateTestResponse = {
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
  } catch (error) {
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
