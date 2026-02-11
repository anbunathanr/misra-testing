import { api } from '../api';

export interface TestStep {
  stepNumber: number;
  action: 'navigate' | 'click' | 'type' | 'assert' | 'wait' | 'api-call';
  target: string;
  value?: string;
  expectedResult?: string;
}

export interface TestCase {
  testCaseId: string;
  suiteId: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  type: 'functional' | 'ui' | 'api' | 'performance';
  steps: TestStep[];
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateTestCaseInput {
  suiteId: string;
  projectId: string;
  name: string;
  description: string;
  type: 'functional' | 'ui' | 'api' | 'performance';
  steps: TestStep[];
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

export interface UpdateTestCaseInput {
  testCaseId: string;
  name?: string;
  description?: string;
  type?: 'functional' | 'ui' | 'api' | 'performance';
  steps?: TestStep[];
  priority?: 'high' | 'medium' | 'low';
  tags?: string[];
}

export const testCasesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTestCasesBySuite: builder.query<TestCase[], string>({
      query: (suiteId) => `/test-cases?suiteId=${suiteId}`,
      providesTags: ['TestCases'],
    }),
    getTestCasesByProject: builder.query<TestCase[], string>({
      query: (projectId) => `/test-cases?projectId=${projectId}`,
      providesTags: ['TestCases'],
    }),
    getTestCase: builder.query<TestCase, string>({
      query: (testCaseId) => `/test-cases/${testCaseId}`,
      providesTags: (_result, _error, testCaseId) => [{ type: 'TestCases', id: testCaseId }],
    }),
    createTestCase: builder.mutation<TestCase, CreateTestCaseInput>({
      query: (body) => ({
        url: '/test-cases',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TestCases'],
    }),
    updateTestCase: builder.mutation<TestCase, UpdateTestCaseInput>({
      query: ({ testCaseId, ...body }) => ({
        url: `/test-cases/${testCaseId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { testCaseId }) => [
        'TestCases',
        { type: 'TestCases', id: testCaseId },
      ],
    }),
  }),
});

export const {
  useGetTestCasesBySuiteQuery,
  useGetTestCasesByProjectQuery,
  useGetTestCaseQuery,
  useCreateTestCaseMutation,
  useUpdateTestCaseMutation,
} = testCasesApi;
