import { TestProject, CreateProjectInput, UpdateProjectInput } from '../types/test-project';
export declare class ProjectService {
    createProject(userId: string, input: CreateProjectInput): Promise<TestProject>;
    getProject(projectId: string): Promise<TestProject | null>;
    getUserProjects(userId: string): Promise<TestProject[]>;
    updateProject(input: UpdateProjectInput): Promise<TestProject>;
    deleteProject(projectId: string): Promise<void>;
}
