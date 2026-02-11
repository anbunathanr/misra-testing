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
