import { TestCase } from './test-case';
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'error';
export type ExecutionResult = 'pass' | 'fail' | 'error';
export type StepStatus = 'pass' | 'fail' | 'error';
export interface APIRequestDetails {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
}
export interface APIResponseDetails {
    statusCode: number;
    headers?: Record<string, string>;
    body?: string;
    duration: number;
}
export interface StepResult {
    stepIndex: number;
    action: string;
    status: StepStatus;
    duration: number;
    errorMessage?: string;
    screenshot?: string;
    details?: {
        url?: string;
        selector?: string;
        value?: string;
        assertion?: string;
        apiRequest?: APIRequestDetails;
        apiResponse?: APIResponseDetails;
    };
}
export interface TestExecution {
    executionId: string;
    projectId: string;
    testCaseId?: string;
    testSuiteId?: string;
    suiteExecutionId?: string;
    status: ExecutionStatus;
    result?: ExecutionResult;
    startTime: string;
    endTime?: string;
    duration?: number;
    steps: StepResult[];
    screenshots: string[];
    errorMessage?: string;
    metadata: {
        triggeredBy: string;
        environment?: string;
        browserVersion?: string;
    };
    createdAt: string;
    updatedAt: string;
}
export interface ExecutionMessage {
    executionId: string;
    testCaseId: string;
    projectId: string;
    suiteExecutionId?: string;
    testCase: TestCase;
    metadata: {
        triggeredBy: string;
        environment?: string;
    };
}
export interface TriggerExecutionRequest {
    testCaseId?: string;
    testSuiteId?: string;
    environment?: string;
}
export interface TriggerExecutionResponse {
    executionId?: string;
    suiteExecutionId?: string;
    testCaseExecutionIds?: string[];
    status: 'queued';
    message: string;
}
export interface ExecutionStatusResponse {
    executionId: string;
    status: ExecutionStatus;
    result?: ExecutionResult;
    currentStep?: number;
    totalSteps: number;
    startTime: string;
    duration?: number;
}
export interface ExecutionResultsResponse {
    execution: TestExecution;
    screenshotUrls: string[];
}
export interface ExecutionHistoryParams {
    projectId: string;
    testCaseId?: string;
    testSuiteId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
}
export interface ExecutionHistoryResponse {
    executions: TestExecution[];
    nextToken?: string;
}
export interface SuiteExecutionStats {
    total: number;
    passed: number;
    failed: number;
    errors: number;
    duration: number;
}
export interface SuiteExecutionResultsResponse {
    suiteExecutionId: string;
    suiteId: string;
    status: ExecutionStatus;
    stats: SuiteExecutionStats;
    testCaseExecutions: TestExecution[];
    startTime: string;
    endTime?: string;
    duration?: number;
}
