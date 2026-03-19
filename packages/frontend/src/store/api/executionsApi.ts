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
      queryFn: async (executionId) => {
        // Mock data for demo
        return {
          data: {
            executionId,
            status: 'completed',
            result: 'pass',
            currentStep: 4,
            totalSteps: 4,
            startTime: new Date(Date.now() - 60000).toISOString(),
            duration: 60,
          },
        };
      },
      providesTags: (_result, _error, executionId) => [
        { type: 'Executions', id: `${executionId}-status` },
      ],
    }),

    // Get execution results
    getExecutionResults: builder.query<ExecutionResultsResponse, string>({
      queryFn: async (executionId) => {
        // Mock data for demo
        return {
          data: {
            execution: {
              executionId,
              projectId: 'proj-001',
              testCaseId: 'tc-001',
              status: 'completed',
              result: 'pass',
              startTime: new Date(Date.now() - 60000).toISOString(),
              endTime: new Date().toISOString(),
              duration: 60,
              steps: [
                {
                  stepIndex: 0,
                  action: 'navigate',
                  status: 'pass',
                  duration: 2,
                  details: { url: 'https://example.com/login' },
                },
                {
                  stepIndex: 1,
                  action: 'type',
                  status: 'pass',
                  duration: 1,
                  details: { selector: 'input[name="email"]', value: 'user@example.com' },
                },
                {
                  stepIndex: 2,
                  action: 'type',
                  status: 'pass',
                  duration: 1,
                  details: { selector: 'input[name="password"]', value: 'password123' },
                },
                {
                  stepIndex: 3,
                  action: 'click',
                  status: 'pass',
                  duration: 56,
                  details: { selector: 'button[type="submit"]' },
                },
              ],
              screenshots: [],
              metadata: {
                triggeredBy: 'user-123',
                environment: 'staging',
              },
              createdAt: new Date(Date.now() - 60000).toISOString(),
              updatedAt: new Date().toISOString(),
            },
            screenshotUrls: [],
          },
        };
      },
      providesTags: (_result, _error, executionId) => [
        { type: 'Executions', id: executionId },
      ],
    }),

    // Get execution history
    getExecutionHistory: builder.query<ExecutionHistoryResponse, ExecutionHistoryParams>({
      queryFn: async () => {
        // Mock data for demo
        return {
          data: {
            executions: [
              {
                executionId: 'exec-001',
                projectId: 'proj-001',
                testCaseId: 'tc-001',
                status: 'completed',
                result: 'pass',
                startTime: new Date(Date.now() - 3600000).toISOString(),
                endTime: new Date(Date.now() - 3540000).toISOString(),
                duration: 60,
                steps: [],
                screenshots: [],
                metadata: {
                  triggeredBy: 'user-123',
                  environment: 'staging',
                },
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                updatedAt: new Date(Date.now() - 3540000).toISOString(),
              },
              {
                executionId: 'exec-002',
                projectId: 'proj-001',
                testCaseId: 'tc-002',
                status: 'completed',
                result: 'fail',
                startTime: new Date(Date.now() - 7200000).toISOString(),
                endTime: new Date(Date.now() - 7140000).toISOString(),
                duration: 60,
                steps: [],
                screenshots: [],
                errorMessage: 'Assertion failed: Expected element not found',
                metadata: {
                  triggeredBy: 'user-123',
                  environment: 'staging',
                },
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                updatedAt: new Date(Date.now() - 7140000).toISOString(),
              },
            ],
          },
        };
      },
      providesTags: ['Executions'],
    }),

    // Get suite execution results
    getSuiteExecutionResults: builder.query<SuiteExecutionResultsResponse, string>({
      queryFn: async (suiteExecutionId) => {
        // Mock data for demo
        return {
          data: {
            suiteExecutionId,
            suiteId: 'suite-001',
            status: 'completed',
            stats: {
              total: 2,
              passed: 1,
              failed: 1,
              errors: 0,
              duration: 120,
            },
            testCaseExecutions: [
              {
                executionId: 'exec-001',
                projectId: 'proj-001',
                testCaseId: 'tc-001',
                status: 'completed',
                result: 'pass',
                startTime: new Date(Date.now() - 120000).toISOString(),
                endTime: new Date(Date.now() - 60000).toISOString(),
                duration: 60,
                steps: [],
                screenshots: [],
                metadata: {
                  triggeredBy: 'user-123',
                  environment: 'staging',
                },
                createdAt: new Date(Date.now() - 120000).toISOString(),
                updatedAt: new Date(Date.now() - 60000).toISOString(),
              },
              {
                executionId: 'exec-002',
                projectId: 'proj-001',
                testCaseId: 'tc-002',
                status: 'completed',
                result: 'fail',
                startTime: new Date(Date.now() - 60000).toISOString(),
                endTime: new Date().toISOString(),
                duration: 60,
                steps: [],
                screenshots: [],
                errorMessage: 'Assertion failed',
                metadata: {
                  triggeredBy: 'user-123',
                  environment: 'staging',
                },
                createdAt: new Date(Date.now() - 60000).toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
            startTime: new Date(Date.now() - 120000).toISOString(),
            endTime: new Date().toISOString(),
            duration: 120,
          },
        };
      },
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
