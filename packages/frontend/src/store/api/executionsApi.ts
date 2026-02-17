import { api } from '../api';

export interface StepResult {
  stepIndex: number;
  action: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  errorMessage?: string;
  screenshot?: string;
  details?: {
    url?: string;
    selector?: string;
    value?: string;
    assertion?: string;
  };
}

export interface TestExecution {
  executionId: string;
  projectId: string;
  testCaseId?: string;
  testSuiteId?: string;
  suiteExecutionId?: string;
  status: 'queued' | 'running' | 'completed' | 'error';
  result?: 'pass' | 'fail' | 'error';
  startTime: string;
  endTime?: string;
  duration?: number;
  steps: StepResult[];
  screenshots: string[];
  errorMessage?: string;
  metadata: {
    triggeredBy: string;
    environment?: string;
  };
  createdAt: string;
  updatedAt: string;
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
  status: string;
  result?: string;
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
  projectId?: string;
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
  status: string;
  stats: SuiteExecutionStats;
  testCaseExecutions: TestExecution[];
  startTime: string;
  endTime?: string;
  duration?: number;
}

export const executionsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Trigger test execution
    triggerExecution: builder.mutation<TriggerExecutionResponse, TriggerExecutionRequest>({
      query: (body) => ({
        url: '/executions/trigger',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Executions'],
    }),

    // Get execution status (with polling support)
    getExecutionStatus: builder.query<ExecutionStatusResponse, string>({
      query: (executionId) => `/executions/${executionId}/status`,
      providesTags: (_result, _error, executionId) => [
        { type: 'Executions', id: `${executionId}-status` },
      ],
      // Enable polling for status updates
      // Polling will be controlled by the component using pollingInterval option
    }),

    // Get execution results
    getExecutionResults: builder.query<ExecutionResultsResponse, string>({
      query: (executionId) => `/executions/${executionId}`,
      providesTags: (_result, _error, executionId) => [
        { type: 'Executions', id: executionId },
      ],
    }),

    // Get execution history
    getExecutionHistory: builder.query<ExecutionHistoryResponse, ExecutionHistoryParams>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.projectId) queryParams.append('projectId', params.projectId);
        if (params.testCaseId) queryParams.append('testCaseId', params.testCaseId);
        if (params.testSuiteId) queryParams.append('testSuiteId', params.testSuiteId);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.limit) queryParams.append('limit', params.limit.toString());
        
        return `/executions/history?${queryParams.toString()}`;
      },
      providesTags: ['Executions'],
    }),

    // Get suite execution results
    getSuiteExecutionResults: builder.query<SuiteExecutionResultsResponse, string>({
      query: (suiteExecutionId) => `/executions/suites/${suiteExecutionId}`,
      providesTags: (_result, _error, suiteExecutionId) => [
        { type: 'Executions', id: `suite-${suiteExecutionId}` },
      ],
    }),
  }),
});

export const {
  useTriggerExecutionMutation,
  useGetExecutionStatusQuery,
  useGetExecutionResultsQuery,
  useGetExecutionHistoryQuery,
  useGetSuiteExecutionResultsQuery,
} = executionsApi;
