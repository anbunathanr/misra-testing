import { api } from '../api';

export interface TestProject {
  projectId: string;
  userId: string;
  name: string;
  description: string;
  targetUrl: string;
  environment: 'dev' | 'staging' | 'production';
  createdAt: number;
  updatedAt: number;
}

export interface CreateProjectInput {
  name: string;
  description: string;
  targetUrl: string;
  environment: 'dev' | 'staging' | 'production';
}

export interface UpdateProjectInput {
  projectId: string;
  name?: string;
  description?: string;
  targetUrl?: string;
  environment?: 'dev' | 'staging' | 'production';
}

export const projectsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query<TestProject[], void>({
      queryFn: async () => {
        // Mock data for demo
        return {
          data: [
            {
              projectId: 'proj-001',
              userId: 'user-123',
              name: 'E-Commerce Platform',
              description: 'Test automation for e-commerce website',
              targetUrl: 'https://example-ecommerce.com',
              environment: 'dev',
              createdAt: Math.floor(Date.now() / 1000) - 86400,
              updatedAt: Math.floor(Date.now() / 1000),
            },
            {
              projectId: 'proj-002',
              userId: 'user-123',
              name: 'Social Media App',
              description: 'Test automation for social platform',
              targetUrl: 'https://example-social.com',
              environment: 'staging',
              createdAt: Math.floor(Date.now() / 1000) - 172800,
              updatedAt: Math.floor(Date.now() / 1000),
            },
            {
              projectId: 'proj-003',
              userId: 'user-123',
              name: 'Banking Portal',
              description: 'Test automation for banking application',
              targetUrl: 'https://example-banking.com',
              environment: 'production',
              createdAt: Math.floor(Date.now() / 1000) - 259200,
              updatedAt: Math.floor(Date.now() / 1000),
            },
          ],
        };
      },
      providesTags: ['Projects'],
    }),
    getProject: builder.query<TestProject, string>({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (_result, _error, projectId) => [{ type: 'Projects', id: projectId }],
    }),
    createProject: builder.mutation<TestProject, CreateProjectInput>({
      query: (body) => ({
        url: '/projects',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Projects'],
    }),
    updateProject: builder.mutation<TestProject, UpdateProjectInput>({
      query: ({ projectId, ...body }) => ({
        url: `/projects/${projectId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { projectId }) => [
        'Projects',
        { type: 'Projects', id: projectId },
      ],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
} = projectsApi;
