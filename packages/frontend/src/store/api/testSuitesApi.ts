import { api } from '../api';

export interface TestSuite {
  suiteId: string;
  projectId: string;
  userId: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateTestSuiteInput {
  projectId: string;
  name: string;
  description: string;
  tags?: string[];
}

export interface UpdateTestSuiteInput {
  suiteId: string;
  name?: string;
  description?: string;
  tags?: string[];
}

export const testSuitesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTestSuites: builder.query<TestSuite[], string | void>({
      query: (projectId) => projectId ? `/test-suites?projectId=${projectId}` : '/test-suites',
      providesTags: ['TestSuites'],
    }),
    getTestSuite: builder.query<TestSuite, string>({
      query: (suiteId) => `/test-suites/${suiteId}`,
      providesTags: (result, error, suiteId) => [{ type: 'TestSuites', id: suiteId }],
    }),
    createTestSuite: builder.mutation<TestSuite, CreateTestSuiteInput>({
      query: (body) => ({
        url: '/test-suites',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['TestSuites'],
    }),
    updateTestSuite: builder.mutation<TestSuite, UpdateTestSuiteInput>({
      query: ({ suiteId, ...body }) => ({
        url: `/test-suites/${suiteId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { suiteId }) => [
        'TestSuites',
        { type: 'TestSuites', id: suiteId },
      ],
    }),
  }),
});

export const {
  useGetTestSuitesQuery,
  useGetTestSuiteQuery,
  useCreateTestSuiteMutation,
  useUpdateTestSuiteMutation,
} = testSuitesApi;
