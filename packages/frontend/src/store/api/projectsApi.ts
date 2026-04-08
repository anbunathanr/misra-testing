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
      query: () => '/projects',
      transformResponse: (response: any): TestProject[] => {
        // Backend returns { projects: [] } or an array directly
        if (Array.isArray(response)) return response
        if (response?.projects && Array.isArray(response.projects)) return response.projects
        return []
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
