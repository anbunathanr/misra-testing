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
      queryFn: async () => {
        // Mock data for demo - ignoring suiteId parameter for demo purposes
        return {
          data: [
            {
              testCaseId: 'tc-001',
              suiteId: 'suite-001',
              projectId: 'proj-001',
              userId: 'user-123',
              name: 'Valid Login Test',
              description: 'Test successful login with valid credentials',
              type: 'ui',
              steps: [
                {
                  stepNumber: 1,
                  action: 'navigate',
                  target: 'https://example.com/login',
                  expectedResult: 'Login page loaded',
                },
                {
                  stepNumber: 2,
                  action: 'type',
                  target: 'input[name="email"]',
                  value: 'user@example.com',
                  expectedResult: 'Email entered',
                },
                {
                  stepNumber: 3,
                  action: 'type',
                  target: 'input[name="password"]',
                  value: 'password123',
                  expectedResult: 'Password entered',
                },
                {
                  stepNumber: 4,
                  action: 'click',
                  target: 'button[type="submit"]',
                  expectedResult: 'Login successful',
                },
              ],
              priority: 'high',
              tags: ['authentication', 'smoke'],
              createdAt: Math.floor(Date.now() / 1000) - 86400,
              updatedAt: Math.floor(Date.now() / 1000),
            },
            {
              testCaseId: 'tc-002',
              suiteId: 'suite-001',
              projectId: 'proj-001',
              userId: 'user-123',
              name: 'Invalid Login Test',
              description: 'Test login with invalid credentials',
              type: 'ui',
              steps: [
                {
                  stepNumber: 1,
                  action: 'navigate',
                  target: 'https://example.com/login',
                  expectedResult: 'Login page loaded',
                },
                {
                  stepNumber: 2,
                  action: 'type',
                  target: 'input[name="email"]',
                  value: 'invalid@example.com',
                  expectedResult: 'Email entered',
                },
                {
                  stepNumber: 3,
                  action: 'type',
                  target: 'input[name="password"]',
                  value: 'wrongpassword',
                  expectedResult: 'Password entered',
                },
                {
                  stepNumber: 4,
                  action: 'click',
                  target: 'button[type="submit"]',
                  expectedResult: 'Error message displayed',
                },
              ],
              priority: 'high',
              tags: ['authentication', 'negative'],
              createdAt: Math.floor(Date.now() / 1000) - 86400,
              updatedAt: Math.floor(Date.now() / 1000),
            },
          ],
        };
      },
      providesTags: ['TestCases'],
    }),
    getTestCasesByProject: builder.query<TestCase[], string>({
      queryFn: async () => {
        // Mock data for demo - ignoring projectId parameter for demo purposes
        return {
          data: [
            {
              testCaseId: 'tc-001',
              suiteId: 'suite-001',
              projectId: 'proj-001',
              userId: 'user-123',
              name: 'Valid Login Test',
              description: 'Test successful login with valid credentials',
              type: 'ui',
              steps: [],
              priority: 'high',
              tags: ['authentication'],
              createdAt: Math.floor(Date.now() / 1000) - 86400,
              updatedAt: Math.floor(Date.now() / 1000),
            },
          ],
        };
      },
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
