/**
 * Test Executor Lambda Function
 * Processes SQS messages to execute test cases with Playwright/HTTP client
 * 
 * This Lambda is triggered by SQS messages containing test execution requests.
 * It orchestrates the complete test execution lifecycle:
 * 1. Update execution status to "running"
 * 2. Execute test case using TestExecutorService
 * 3. Update execution record with final results
 * 4. Handle timeouts and errors gracefully
 */

import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { ExecutionMessage } from '../../types/test-execution';
import { testExecutorService } from '../../services/test-executor-service';
import { testExecutionDBService } from '../../services/test-execution-db-service';

/**
 * Lambda handler for test execution
 * Processes SQS messages containing test execution requests
 */
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  console.log('Test Executor Lambda invoked');
  console.log(`Processing ${event.Records.length} message(s)`);
  console.log(`Remaining time: ${context.getRemainingTimeInMillis()}ms`);

  // Process each SQS message
  for (const record of event.Records) {
    await processExecutionMessage(record, context);
  }

  console.log('All messages processed successfully');
};

/**
 * Process a single execution message from SQS
 */
async function processExecutionMessage(
  record: SQSRecord,
  context: Context
): Promise<void> {
  let message: ExecutionMessage;
  
  try {
    // Parse SQS message
    message = JSON.parse(record.body) as ExecutionMessage;
    console.log(`Processing execution: ${message.executionId}`);
    console.log(`Test case: ${message.testCaseId}`);
    console.log(`Project: ${message.projectId}`);
  } catch (error) {
    console.error('Failed to parse SQS message:', error);
    console.error('Message body:', record.body);
    throw new Error('Invalid SQS message format');
  }

  const { executionId, testCase, projectId, metadata } = message;

  try {
    // Update execution status to "running"
    console.log(`Updating execution ${executionId} status to "running"`);
    await testExecutionDBService.updateExecutionStatus(executionId, 'running');

    // Check remaining time before starting execution
    const remainingTime = context.getRemainingTimeInMillis();
    console.log(`Remaining Lambda time: ${remainingTime}ms`);

    // Reserve 30 seconds for cleanup and result saving
    const timeoutBuffer = 30000;
    if (remainingTime < timeoutBuffer + 60000) {
      // Less than 90 seconds remaining - not enough time
      throw new Error(`Insufficient time remaining: ${remainingTime}ms`);
    }

    // Execute the test case
    console.log(`Starting test execution for ${testCase.steps.length} steps`);
    const result = await testExecutorService.executeTestCase({
      executionId,
      testCase,
      projectId,
      triggeredBy: metadata.triggeredBy,
      environment: metadata.environment,
    });

    console.log(`Test execution completed with result: ${result.execution.result}`);
    console.log(`Status: ${result.execution.status}`);
    console.log(`Duration: ${result.execution.duration}ms`);
    console.log(`Steps executed: ${result.execution.steps.length}`);
    console.log(`Screenshots captured: ${result.execution.screenshots.length}`);

    // Update execution record with final results
    console.log(`Saving execution results to DynamoDB`);
    await testExecutionDBService.updateExecutionResults(result.execution);

    // If this execution is part of a suite, update suite status
    if (message.suiteExecutionId) {
      console.log(`Updating suite execution ${message.suiteExecutionId}`);
      try {
        await testExecutionDBService.updateSuiteExecution(message.suiteExecutionId);
        console.log(`Suite execution ${message.suiteExecutionId} updated successfully`);
      } catch (suiteError) {
        console.error(`Failed to update suite execution ${message.suiteExecutionId}:`, suiteError);
        // Don't fail the test case execution if suite update fails
      }
    }

    console.log(`Execution ${executionId} completed successfully`);
  } catch (error) {
    // Handle execution errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Execution ${executionId} failed:`, errorMessage);
    console.error('Error details:', error);

    try {
      // Check if this is a timeout error
      const isTimeout = errorMessage.toLowerCase().includes('time remaining') || 
                       errorMessage.toLowerCase().includes('timeout') ||
                       errorMessage.toLowerCase().includes('timed out') ||
                       context.getRemainingTimeInMillis() < 5000;

      // Update execution record with error status
      const execution = await testExecutionDBService.getExecution(executionId);
      
      if (execution) {
        execution.status = 'error';
        execution.result = 'error';
        execution.endTime = new Date().toISOString();
        execution.duration = execution.startTime 
          ? Date.now() - new Date(execution.startTime).getTime()
          : 0;
        execution.errorMessage = isTimeout 
          ? `Lambda timeout: ${errorMessage}`
          : errorMessage;
        execution.updatedAt = new Date().toISOString();

        await testExecutionDBService.updateExecutionResults(execution);
        console.log(`Execution ${executionId} marked as error`);

        // If this execution is part of a suite, update suite status
        if (message.suiteExecutionId) {
          console.log(`Updating suite execution ${message.suiteExecutionId} after error`);
          try {
            await testExecutionDBService.updateSuiteExecution(message.suiteExecutionId);
            console.log(`Suite execution ${message.suiteExecutionId} updated successfully`);
          } catch (suiteError) {
            console.error(`Failed to update suite execution ${message.suiteExecutionId}:`, suiteError);
            // Don't fail the test case execution if suite update fails
          }
        }
      } else {
        console.error(`Could not find execution ${executionId} to update error status`);
      }
    } catch (updateError) {
      console.error('Failed to update execution with error status:', updateError);
      // Don't throw - we want to acknowledge the SQS message even if update fails
    }

    // Re-throw the error to mark SQS message as failed (will retry or go to DLQ)
    throw error;
  }
}
