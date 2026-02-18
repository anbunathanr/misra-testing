/**
 * Get Execution Status Lambda
 * Returns current status and progress information for a test execution
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { testExecutionDBService } from '../../services/test-execution-db-service';
import { withAuthAndPermission, AuthenticatedEvent } from '../../middleware/auth-middleware';

export interface ExecutionStatusResponse {
  executionId: string;
  status: string;
  result?: string;
  currentStep?: number;
  totalSteps: number;
  startTime: string;
  duration?: number;
}

export const handler = withAuthAndPermission(
  'tests',
  'read',
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
    try {
      console.log('Get execution status request:', JSON.stringify(event));

      // Extract executionId from path parameters
      const executionId = event.pathParameters?.executionId;

      if (!executionId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            message: 'executionId is required',
          }),
        };
      }

      // Get execution from database
      const execution = await testExecutionDBService.getExecution(executionId);

      if (!execution) {
        return {
          statusCode: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            message: `Execution not found: ${executionId}`,
          }),
        };
      }

      // Verify user has access to the project (organization-level check)
      // In a real implementation, you would fetch the project and verify organizationId matches
      // For now, we trust that the execution belongs to the user's organization

      // Calculate current step (last completed step + 1, or 0 if none completed)
      let currentStep: number | undefined;
      if (execution.status === 'running') {
        const completedSteps = execution.steps.filter(
          s => s.status === 'pass' || s.status === 'fail' || s.status === 'error'
        );
        currentStep = completedSteps.length;
      }

      // Calculate duration
      let duration: number | undefined;
      if (execution.endTime) {
        duration = execution.duration;
      } else if (execution.startTime) {
        // Calculate current duration for running executions
        duration = Date.now() - new Date(execution.startTime).getTime();
      }

      const response: ExecutionStatusResponse = {
        executionId: execution.executionId,
        status: execution.status,
        result: execution.result,
        currentStep,
        totalSteps: execution.steps.length,
        startTime: execution.startTime,
        duration,
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
      console.error('Error getting execution status:', error);

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
