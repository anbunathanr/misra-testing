import { TestCase } from './test-case';

// Execution Status Types
export type ExecutionStatus = 'queued' | 'running' | 'completed' | 'error';
export type ExecutionResult = 'pass' | 'fail' | 'error';
export type StepStatus = 'pass' | 'fail' | 'error';

// API Request/Response Details for API Testing
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

// Step Result - Records the outcome of executing a single test step
export interface StepResult {
  stepIndex: number;
  action: string;
  status: StepStatus;
  duration: number; // Milliseconds
  errorMessage?: string;
  screenshot?: string; // S3 key if captured
  details?: {
    url?: string; // For navigate actions
    selector?: string; // For click/type/assert actions
    value?: string; // For type actions
    assertion?: string; // For assert actions
    apiRequest?: APIRequestDetails;
    apiResponse?: APIResponseDetails;
  };
}

// Test Execution - Main execution record stored in DynamoDB
export interface TestExecution {
  executionId: string; // Partition Key: UUID
  projectId: string; // GSI1 Partition Key
  testCaseId?: string; // For individual test case executions
  testSuiteId?: string; // For test suite executions
  suiteExecutionId?: string; // Links test cases to suite execution
  status: ExecutionStatus;
  result?: ExecutionResult;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  duration?: number; // Milliseconds
  steps: StepResult[];
  screenshots: string[]; // S3 keys for screenshots
  errorMessage?: string; // Error details if status is error
  metadata: {
    triggeredBy: string; // User ID
    environment?: string; // test | staging | production
    browserVersion?: string; // For UI tests
  };
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// SQS Message Format for Test Execution Queue
export interface ExecutionMessage {
  executionId: string;
  testCaseId: string;
  projectId: string;
  suiteExecutionId?: string; // If part of suite execution
  testCase: TestCase; // Full test case definition
  metadata: {
    triggeredBy: string;
    environment?: string;
  };
}

// API Request/Response Types

// Trigger Execution Request
export interface TriggerExecutionRequest {
  testCaseId?: string; // For single test case
  testSuiteId?: string; // For test suite
  environment?: string; // Optional environment tag
}

// Trigger Execution Response
export interface TriggerExecutionResponse {
  executionId?: string; // For single test case
  suiteExecutionId?: string; // For test suite
  testCaseExecutionIds?: string[]; // For test suite
  status: 'queued';
  message: string;
}

// Execution Status Response
export interface ExecutionStatusResponse {
  executionId: string;
  status: ExecutionStatus;
  result?: ExecutionResult;
  currentStep?: number;
  totalSteps: number;
  startTime: string;
  duration?: number;
}

// Execution Results Response
export interface ExecutionResultsResponse {
  execution: TestExecution;
  screenshotUrls: string[]; // Pre-signed S3 URLs
}

// Execution History Query Parameters
export interface ExecutionHistoryParams {
  projectId: string;
  testCaseId?: string;
  testSuiteId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

// Execution History Response
export interface ExecutionHistoryResponse {
  executions: TestExecution[];
  nextToken?: string; // For pagination
}

// Suite Execution Aggregate Statistics
export interface SuiteExecutionStats {
  total: number;
  passed: number;
  failed: number;
  errors: number;
  duration: number;
}

// Suite Execution Results Response
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
