import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ApplicationAnalyzer } from '../../services/ai-test-generation/application-analyzer';
import { AnalyzeRequest, AnalyzeResponse } from '../../types/ai-test-generation';

/**
 * POST /api/ai-test-generation/analyze
 * 
 * Analyzes a web application to identify testable elements and UI patterns.
 * 
 * Request Body:
 * {
 *   url: string;
 *   options?: {
 *     waitForSelector?: string;
 *     timeout?: number;
 *     viewport?: { width: number; height: number };
 *   }
 * }
 * 
 * Response:
 * {
 *   analysis: ApplicationAnalysis
 * }
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('[Analyze] Received request');

  try {
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

    const request: AnalyzeRequest = JSON.parse(event.body);

    // Validate required fields
    if (!request.url) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'URL is required',
        }),
      };
    }

    // Validate URL format
    try {
      new URL(request.url);
    } catch (error) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid URL format',
        }),
      };
    }

    console.log(`[Analyze] Analyzing URL: ${request.url}`);

    // Create analyzer and perform analysis
    const analyzer = ApplicationAnalyzer.getInstance();
    const analysis = await analyzer.analyze(request.url, request.options);

    console.log(`[Analyze] Analysis complete: ${analysis.elements.length} elements found`);

    // Return successful response
    const response: AnalyzeResponse = {
      analysis,
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
    console.error('[Analyze] Error:', error);

    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Failed to analyze application',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
