/**
 * Test Executor Service
 * Orchestrates the execution of complete test cases with all steps
 */

import { TestCase } from '../types/test-case';
import { 
  TestExecution, 
  ExecutionStatus, 
  ExecutionResult, 
  StepResult 
} from '../types/test-execution';
import { browserService } from './browser-service';
import { stepExecutorService } from './step-executor-service';

export interface ExecuteTestCaseOptions {
  executionId: string;
  testCase: TestCase;
  projectId: string;
  triggeredBy: string;
  environment?: string;
}

export interface ExecuteTestCaseResult {
  execution: TestExecution;
  success: boolean;
}

export class TestExecutorService {
  /**
   * Execute a complete test case with all steps
   * Returns the execution record with results
   */
  public async executeTestCase(options: ExecuteTestCaseOptions): Promise<ExecuteTestCaseResult> {
    const { executionId, testCase, projectId, triggeredBy, environment } = options;
    
    const startTime = new Date().toISOString();
    const startTimeMs = Date.now();
    
    let status: ExecutionStatus = 'running';
    let result: ExecutionResult | undefined;
    let stepResults: StepResult[] = [];
    let screenshots: string[] = [];
    let errorMessage: string | undefined;
    let browserVersion: string | undefined;

    // Set execution ID in step executor for screenshot naming
    stepExecutorService.setExecutionId(executionId);

    // Determine if this test case requires a browser (has UI actions)
    const requiresBrowser = testCase.steps.some(step =>
      ['navigate', 'click', 'type', 'assert', 'wait'].includes(step.action)
    );

    try {
      console.log(`Starting execution ${executionId} for test case ${testCase.testCaseId}`);
      console.log(`Test case has ${testCase.steps.length} steps`);

      // Initialize browser if needed
      let browserSession = null;
      if (requiresBrowser) {
        console.log('Initializing browser for UI test...');
        browserSession = await browserService.initializeBrowser();
        browserVersion = await browserService.getBrowserVersion();
        console.log(`Browser initialized: ${browserVersion}`);
      }

      // Execute each step sequentially
      for (let i = 0; i < testCase.steps.length; i++) {
        const step = testCase.steps[i];
        console.log(`Executing step ${i + 1}/${testCase.steps.length}: ${step.action}`);

        try {
          const stepResult = await stepExecutorService.executeStep(
            browserSession?.page || null,
            step,
            i
          );

          stepResults.push(stepResult);

          // Collect screenshot if captured
          if (stepResult.screenshot) {
            screenshots.push(stepResult.screenshot);
          }

          // If step failed or errored, stop execution
          if (stepResult.status === 'fail' || stepResult.status === 'error') {
            console.log(`Step ${i + 1} ${stepResult.status}, stopping execution`);
            break;
          }

          console.log(`Step ${i + 1} completed successfully`);
        } catch (error) {
          // Unexpected error during step execution
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Unexpected error in step ${i + 1}:`, errorMsg);

          stepResults.push({
            stepIndex: i,
            action: step.action,
            status: 'error',
            duration: 0,
            errorMessage: errorMsg,
            details: {},
          });

          break;
        }
      }

      // Determine overall result based on step results
      result = this.determineExecutionResult(stepResults);
      status = 'completed';

      console.log(`Execution completed with result: ${result}`);
    } catch (error) {
      // Unexpected error during execution setup or teardown
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Execution failed with error:', errorMsg);

      status = 'error';
      result = 'error';
      errorMessage = errorMsg;
    } finally {
      // Always clean up browser resources
      if (requiresBrowser && browserService.hasActiveSession()) {
        console.log('Cleaning up browser resources...');
        await browserService.forceCleanup();
      }
    }

    const endTime = new Date().toISOString();
    const duration = Date.now() - startTimeMs;

    // Build execution record
    const execution: TestExecution = {
      executionId,
      projectId,
      testCaseId: testCase.testCaseId,
      testSuiteId: testCase.suiteId,
      status,
      result,
      startTime,
      endTime,
      duration,
      steps: stepResults,
      screenshots,
      errorMessage,
      metadata: {
        triggeredBy,
        environment,
        browserVersion,
      },
      createdAt: startTime,
      updatedAt: endTime,
    };

    return {
      execution,
      success: result === 'pass',
    };
  }

  /**
   * Determine the overall execution result based on step results
   * 
   * Rules:
   * - If all steps pass → result is 'pass'
   * - If any step fails → result is 'fail'
   * - If any step has error → result is 'error'
   */
  private determineExecutionResult(stepResults: StepResult[]): ExecutionResult {
    if (stepResults.length === 0) {
      return 'error'; // No steps executed
    }

    // Check for errors first (highest priority)
    const hasError = stepResults.some(step => step.status === 'error');
    if (hasError) {
      return 'error';
    }

    // Check for failures
    const hasFailed = stepResults.some(step => step.status === 'fail');
    if (hasFailed) {
      return 'fail';
    }

    // All steps passed
    return 'pass';
  }

  /**
   * Validate execution status transitions
   * Ensures status follows valid state machine: queued → running → completed/error
   */
  public isValidStatusTransition(
    currentStatus: ExecutionStatus,
    newStatus: ExecutionStatus
  ): boolean {
    const validTransitions: Record<ExecutionStatus, ExecutionStatus[]> = {
      queued: ['running', 'error'],
      running: ['completed', 'error'],
      completed: [], // Terminal state
      error: [], // Terminal state
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Check if a status is terminal (no further transitions allowed)
   */
  public isTerminalStatus(status: ExecutionStatus): boolean {
    return status === 'completed' || status === 'error';
  }
}

// Export singleton instance
export const testExecutorService = new TestExecutorService();
