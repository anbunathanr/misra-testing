/**
 * Trigger Lambda function for test execution
 * Handles POST /api/executions/trigger endpoint
 * Creates execution records and queues test cases for execution
 */

import { APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { testExecutionDBService } from '../../services/test-execution-db-service';
import { TestCaseService } from '../../services/test-case-service';
import { TestSuiteService } from '../../services/test-suite-service';
import { ExecutionMessage } from '../../types/test-execution';
import { withAuthAndPermission, AuthenticatedEvent } from '../../middleware/auth-middleware';

const sqsClient = new SQSClient({});
const testCaseService = new TestCaseService();
const testSuiteService = new TestSuiteService();

interface TriggerExecutionRequest {
  testCaseId?: string;
  testSuiteId?: string;
  environment?: string;
}

interface TriggerExecutionResponse {
  executionId?: string;
  suiteExecutionId?: string;
  testCaseExecutionIds?: string[];
  status: 'queued';
  message: string;
}

export const handler = withAuthAndPermission(
  'tests',
  'execute',
  async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
    console.log('Trigger Lambda invoked');
    console.log('Event:', JSON.stringify(event, null, 2));

    try {
      // Parse request body
      if (!event.body) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Request body is required' }),
        };
      }

      const request: TriggerExecutionRequest = JSON.parse(event.body);

      // Validate request
      if (!request.testCaseId && !request.testSuiteId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Either testCaseId or testSuiteId is required',
          }),
        };
      }

      if (request.testCaseId && request.testSuiteId) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            error: 'Cannot specify both testCaseId and testSuiteId',
          }),
        };
      }

      // Get user ID from authenticated event
      const userId = event.user.userId;

      // Check queue URL
      const queueUrl = process.env.TEST_EXECUTION_QUEUE_URL;
      if (!queueUrl) {
        console.error('TEST_EXECUTION_QUEUE_URL environment variable not set');
        return {
          statusCode: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({ error: 'Queue configuration error' }),
        };
      }

      // Handle single test case execution
      if (request.testCaseId) {
        const response = await triggerTestCaseExecution(
          request.testCaseId,
          userId,
          event.user.organizationId,
          queueUrl,
          request.environment
        );

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(response),
        };
      }

      // Handle test suite execution
      if (request.testSuiteId) {
        const response = await triggerTestSuiteExecution(
          request.testSuiteId,
          userId,
          event.user.organizationId,
          queueUrl,
          request.environment
        );

        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify(response),
        };
      }

      // Should never reach here due to validation above
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Invalid request' }),
      };
    } catch (error) {
      console.error('Error triggering execution:', error);

      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Failed to trigger execution',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      };
    }
  }
);

async function triggerTestCaseExecution(
  testCaseId: string,
  userId: string,
  organizationId: string,
  queueUrl: string,
  environment?: string
): Promise<TriggerExecutionResponse> {
  console.log(`Triggering test case execution: ${testCaseId}`);

  // Fetch test case
  const testCase = await testCaseService.getTestCase(testCaseId);
  if (!testCase) {
    throw new Error(`Test case not found: ${testCaseId}`);
  }

  // Verify user has access to the project (organization-level check)
  // In a real implementation, you would fetch the project and verify organizationId matches
  // For now, we trust that the test case belongs to the user's organization

  // Create execution record
  const executionId = uuidv4();
  const now = new Date().toISOString();

  await testExecutionDBService.createExecution({
    executionId,
    projectId: testCase.projectId,
    testCaseId,
    status: 'queued',
    startTime: now,
    steps: [],
    screenshots: [],
    metadata: {
      triggeredBy: userId,
      environment,
    },
    createdAt: now,
    updatedAt: now,
  });

  console.log(`Created execution record: ${executionId}`);

  // Queue execution message
  const message: ExecutionMessage = {
    executionId,
    testCaseId,
    projectId: testCase.projectId,
    testCase,
    metadata: {
      triggeredBy: userId,
      environment,
    },
  };

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(message),
    })
  );

  console.log(`Queued execution message for: ${executionId}`);

  return {
    executionId,
    status: 'queued',
    message: 'Test case execution queued successfully',
  };
}

async function triggerTestSuiteExecution(
  testSuiteId: string,
  userId: string,
  organizationId: string,
  queueUrl: string,
  environment?: string
): Promise<TriggerExecutionResponse> {
  console.log(`Triggering test suite execution: ${testSuiteId}`);

  // Fetch test suite
  const testSuite = await testSuiteService.getTestSuite(testSuiteId);
  if (!testSuite) {
    throw new Error(`Test suite not found: ${testSuiteId}`);
  }

  // Fetch all test cases in suite
  const testCases = await testCaseService.getSuiteTestCases(testSuiteId);
  if (testCases.length === 0) {
    throw new Error(`No test cases found in suite: ${testSuiteId}`);
  }

  // Verify user has access to the project (organization-level check)
  // In a real implementation, you would fetch the project and verify organizationId matches
  // For now, we trust that the test suite belongs to the user's organization

  // Create suite execution record (parent)
  const suiteExecutionId = uuidv4();
  const now = new Date().toISOString();

  // Create individual execution records for each test case
  const testCaseExecutionIds: string[] = [];

  for (const testCase of testCases) {
    const executionId = uuidv4();
    testCaseExecutionIds.push(executionId);

    await testExecutionDBService.createExecution({
      executionId,
      projectId: testCase.projectId,
      testCaseId: testCase.testCaseId,
      testSuiteId,
      suiteExecutionId,
      status: 'queued',
      startTime: now,
      steps: [],
      screenshots: [],
      metadata: {
        triggeredBy: userId,
        environment,
      },
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Created execution record: ${executionId} for test case: ${testCase.testCaseId}`);

    // Queue execution message
    const message: ExecutionMessage = {
      executionId,
      testCaseId: testCase.testCaseId,
      projectId: testCase.projectId,
      suiteExecutionId,
      testCase,
      metadata: {
        triggeredBy: userId,
        environment,
      },
    };

    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
      })
    );

    console.log(`Queued execution message for: ${executionId}`);
  }

  console.log(`Queued ${testCaseExecutionIds.length} test cases for suite: ${testSuiteId}`);

  return {
    suiteExecutionId,
    testCaseExecutionIds,
    status: 'queued',
    message: `Test suite execution queued successfully with ${testCaseExecutionIds.length} test cases`,
  };
}
