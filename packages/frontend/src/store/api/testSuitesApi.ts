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
      queryFn: async () => {
        // Mock data for demo - ignoring projectId parameter for demo purposes
        return {
          data: [
            {
              suiteId: 'suite-001',
              projectId: 'proj-001',
              userId: 'user-123',
              name: 'Login Flow Tests',
              description: 'Test suite for user authentication and login',
              tags: ['authentication', 'critical'],
              createdAt: Math.floor(Date.now() / 1000) - 86400,
              updatedAt: Math.floor(Date.now() / 1000),
            },
            {
              suiteId: 'suite-002',
              projectId: 'proj-001',
              userId: 'user-123',
              name: 'Checkout Process Tests',
              description: 'Test suite for e-commerce checkout flow',
              tags: ['checkout', 'payment'],
              createdAt: Math.floor(Date.now() / 1000) - 172800,
              updatedAt: Math.floor(Date.now() / 1000),
            },
          ],
        };
      },
      providesTags: ['TestSuites'],
    }),
    getTestSuite: builder.query<TestSuite, string>({
      query: (suiteId) => `/test-suites/${suiteId}`,
      providesTags: (_result, _error, suiteId) => [{ type: 'TestSuites', id: suiteId }],
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
      invalidatesTags: (_result, _error, { suiteId }) => [
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
