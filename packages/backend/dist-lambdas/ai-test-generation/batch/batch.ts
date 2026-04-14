import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApplicationAnalyzer } from '../../services/ai-test-generation/application-analyzer';
import { TestGenerator } from '../../services/ai-test-generation/test-generator';
import { AIEngineFactory } from '../../services/ai-test-generation/ai-engine-factory';
import { SelectorGenerator } from '../../services/ai-test-generation/selector-generator';
import { TestCaseService } from '../../services/test-case-service';
import { BatchProcessor } from '../../services/ai-test-generation/batch-processor';
import { CostTracker } from '../../services/ai-test-generation/cost-tracker';
import { BatchGenerateRequest, BatchGenerateResponse, TokenUsage } from '../../types/ai-test-generation';
import { validateStartupConfiguration } from '../../services/ai-test-generation/startup-validator';
import { getUserFromContext } from '../../utils/auth-util';

// Task 10.2: Validate configuration on Lambda cold start
// This runs once when the Lambda container initializes
try {
  validateStartupConfiguration();
} catch (error) {
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
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[Batch] Received request');

  try {
    // Get user ID from authorizer context
    const user = getUserFromContext(event);
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

    const request: BatchGenerateRequest = JSON.parse(event.body);

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

    const analyzer = ApplicationAnalyzer.getInstance();
    const aiEngine = AIEngineFactory.create();
    const selectorGenerator = SelectorGenerator.getInstance();
    const testCaseService = new TestCaseService();
    const generator = new TestGenerator(aiEngine, selectorGenerator, testCaseService);
    const batchProcessor = new BatchProcessor(analyzer, generator);

    // Generate tests in batch
    const results = await batchProcessor.generateBatch(
      request.url,
      request.scenarios,
      request.projectId,
      request.suiteId,
      userId,
      request.options
    );

    // Record usage (mock token usage - in real implementation, accumulate from all generations)
    const tokensUsed: TokenUsage = {
      promptTokens: 1000 * request.scenarios.length,
      completionTokens: 500 * request.scenarios.length,
      totalTokens: 1500 * request.scenarios.length,
    };

    const cost = costTracker.calculateCost(tokensUsed, 'gpt-4');

    await costTracker.recordUsage(
      userId,
      request.projectId,
      'batch',
      tokensUsed,
      'gpt-4',
      'OPENAI',
      results.summary.succeeded,
      0
    );

    console.log(`[Batch] Batch generation complete: ${results.summary.succeeded} succeeded, ${results.summary.failed} failed`);

    // Return successful response
    const response: BatchGenerateResponse = {
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
  } catch (error) {
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
