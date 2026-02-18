/**
 * Test Executor Service
 * Orchestrates the execution of complete test cases with all steps
 */
import { TestCase } from '../types/test-case';
import { TestExecution, ExecutionStatus } from '../types/test-execution';
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
export declare class TestExecutorService {
    /**
     * Execute a complete test case with all steps
     * Returns the execution record with results
     */
    executeTestCase(options: ExecuteTestCaseOptions): Promise<ExecuteTestCaseResult>;
    /**
     * Determine the overall execution result based on step results
     *
     * Rules:
     * - If all steps pass → result is 'pass'
     * - If any step fails → result is 'fail'
     * - If any step has error → result is 'error'
     */
    private determineExecutionResult;
    /**
     * Validate execution status transitions
     * Ensures status follows valid state machine: queued → running → completed/error
     */
    isValidStatusTransition(currentStatus: ExecutionStatus, newStatus: ExecutionStatus): boolean;
    /**
     * Check if a status is terminal (no further transitions allowed)
     */
    isTerminalStatus(status: ExecutionStatus): boolean;
}
export declare const testExecutorService: TestExecutorService;
