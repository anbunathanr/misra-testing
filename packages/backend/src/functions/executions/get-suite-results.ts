import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { testExecutionDBService } from '../../services/test-execution-db-service';
import { 
  SuiteExecutionResultsResponse, 
  SuiteExecutionStats,
  ExecutionStatus 
} from '../../types/test-execution';

/**
 * Lambda handler for GET /api/executions/suites/{suiteExecutionId}
 * Retrieves detailed results for a test suite execution including aggregate statistics
 * and individual test case results.
 */
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const suiteExecutionId = event.pathParameters?.suiteExecutionId;

    if (!suiteExecutionId) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Missing suiteExecutionId parameter',
        }),
      };
    }

    // Query all test case executions for this suite
    const testCaseExecutions = await testExecutionDBService.getExecutionsBySuiteExecutionId(
      suiteExecutionId
    );

    if (testCaseExecutions.length === 0) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Suite execution not found',
        }),
      };
    }

    // Calculate aggregate statistics
    const stats = calculateSuiteStats(testCaseExecutions);

    // Determine overall suite status
    const suiteStatus = determineSuiteStatus(testCaseExecutions);

    // Get suite metadata from first execution
    const firstExecution = testCaseExecutions[0];
    const suiteId = firstExecution.testSuiteId || '';

    // Calculate suite timing
    const startTimes = testCaseExecutions
      .map(e => new Date(e.startTime).getTime())
      .filter(t => !isNaN(t));
    const endTimes = testCaseExecutions
      .filter(e => e.endTime)
      .map(e => new Date(e.endTime!).getTime())
      .filter(t => !isNaN(t));

    const suiteStartTime = startTimes.length > 0 
      ? new Date(Math.min(...startTimes)).toISOString()
      : firstExecution.startTime;
    
    const suiteEndTime = endTimes.length > 0
      ? new Date(Math.max(...endTimes)).toISOString()
      : undefined;

    const suiteDuration = suiteEndTime
      ? new Date(suiteEndTime).getTime() - new Date(suiteStartTime).getTime()
      : undefined;

    const response: SuiteExecutionResultsResponse = {
      suiteExecutionId,
      suiteId,
      status: suiteStatus,
      stats,
      testCaseExecutions,
      startTime: suiteStartTime,
      endTime: suiteEndTime,
      duration: suiteDuration,
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
    console.error('Error retrieving suite execution results:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * Calculate aggregate statistics for a suite execution
 */
function calculateSuiteStats(executions: any[]): SuiteExecutionStats {
  const stats: SuiteExecutionStats = {
    total: executions.length,
    passed: 0,
    failed: 0,
    errors: 0,
    duration: 0,
  };

  for (const execution of executions) {
    // Count by result
    if (execution.result === 'pass') {
      stats.passed++;
    } else if (execution.result === 'fail') {
      stats.failed++;
    } else if (execution.result === 'error' || execution.status === 'error') {
      stats.errors++;
    }

    // Sum durations
    if (execution.duration) {
      stats.duration += execution.duration;
    }
  }

  return stats;
}

/**
 * Determine overall suite status based on test case statuses
 * - If any test is still queued or running, suite is "running"
 * - If all tests are completed, suite is "completed"
 * - If any test has error status, suite is "error"
 */
function determineSuiteStatus(executions: any[]): ExecutionStatus {
  const hasQueued = executions.some(e => e.status === 'queued');
  const hasRunning = executions.some(e => e.status === 'running');
  const hasError = executions.some(e => e.status === 'error');
  const allCompleted = executions.every(e => e.status === 'completed' || e.status === 'error');

  if (hasQueued || hasRunning) {
    return 'running';
  }

  if (hasError && allCompleted) {
    return 'error';
  }

  if (allCompleted) {
    return 'completed';
  }

  return 'running';
}
