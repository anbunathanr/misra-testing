/**
 * Test Execution Database Service
 * Handles DynamoDB operations for test executions
 */
import { TestExecution, ExecutionStatus } from '../types/test-execution';
export interface QueryExecutionHistoryOptions {
    projectId?: string;
    testCaseId?: string;
    testSuiteId?: string;
    suiteExecutionId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    exclusiveStartKey?: Record<string, any>;
}
export interface ExecutionHistoryResult {
    executions: TestExecution[];
    lastEvaluatedKey?: Record<string, any>;
    count: number;
}
export declare class TestExecutionDBService {
    private docClient;
    private tableName;
    constructor();
    /**
     * Create a new execution record with status "queued"
     */
    createExecution(execution: TestExecution): Promise<void>;
    /**
     * Get execution by ID
     */
    getExecution(executionId: string): Promise<TestExecution | null>;
    /**
     * Update execution status
     */
    updateExecutionStatus(executionId: string, status: ExecutionStatus): Promise<void>;
    /**
     * Update execution with final results
     */
    updateExecutionResults(execution: TestExecution): Promise<void>;
    /**
     * Query execution history with filters
     */
    queryExecutionHistory(options: QueryExecutionHistoryOptions): Promise<ExecutionHistoryResult>;
    /**
     * Get all executions for a suite execution
     */
    getSuiteExecutions(suiteExecutionId: string): Promise<TestExecution[]>;
    /**
     * Alias for getSuiteExecutions - Get all executions by suite execution ID
     */
    getExecutionsBySuiteExecutionId(suiteExecutionId: string): Promise<TestExecution[]>;
    /**
     * Calculate suite aggregate results from test case results
     * Returns total, passed, failed, and error counts
     */
    calculateSuiteAggregateResults(testCaseExecutions: TestExecution[]): {
        total: number;
        passed: number;
        failed: number;
        errors: number;
    };
    /**
     * Determine suite status based on test case statuses
     * Suite is "running" if any test case is queued or running
     * Suite is "completed" if all test cases are completed or error
     * Suite is "error" if all test cases are error
     */
    determineSuiteStatus(testCaseExecutions: TestExecution[]): ExecutionStatus;
    /**
     * Update suite execution with aggregate results and status
     */
    updateSuiteExecution(suiteExecutionId: string): Promise<void>;
}
export declare const testExecutionDBService: TestExecutionDBService;
