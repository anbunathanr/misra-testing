/**
 * Get Execution History Lambda
 * 
 * Endpoint: GET /api/executions/history
 * 
 * Query Parameters:
 * - projectId (required)
 * - testCaseId (optional)
 * - testSuiteId (optional)
 * - startDate (optional)
 * - endDate (optional)
 * - limit (optional, default 50)
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { testExecutionDBService } from '../../services/test-execution-db-service';
import { withAuthAndPermission, AuthenticatedEvent } from '../../middleware/auth-middleware';

export const handler = withAuthAndPermission(
  'tests',
  'read',
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
    console.log('Get execution history request:', JSON.stringify({
      queryStringParameters: event.queryStringParameters,
    }));

    try {
      // Parse query parameters
      const projectId = event.queryStringParameters?.projectId;
      const testCaseId = event.queryStringParameters?.testCaseId;
      const testSuiteId = event.queryStringParameters?.testSuiteId;
      const startDate = event.queryStringParameters?.startDate;
      const endDate = event.queryStringParameters?.endDate;
      const limit = event.queryStringParameters?.limit ? parseInt(event.queryStringParameters.limit, 10) : 50;

      // Validate required parameters
      if (!projectId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            message: 'projectId is required',
          }),
        };
      }

      // Verify user has access to the project (organization-level check)
      // In a real implementation, you would fetch the project and verify organizationId matches
      // For now, we trust that the project belongs to the user's organization

      // Query execution history
      const result = await testExecutionDBService.queryExecutionHistory({
        projectId,
        testCaseId,
        testSuiteId,
        startDate,
        endDate,
        limit,
      });

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          executions: result.executions,
          count: result.count,
          lastEvaluatedKey: result.lastEvaluatedKey,
        }),
      };
    } catch (error) {
      console.error('Error getting execution history:', error);

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          message: 'Internal server error',
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      };
    }
  }
);
