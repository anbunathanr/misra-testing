import { TestSuite, CreateTestSuiteInput, UpdateTestSuiteInput } from '../types/test-suite';
export declare class TestSuiteService {
    createTestSuite(userId: string, input: CreateTestSuiteInput): Promise<TestSuite>;
    getTestSuite(suiteId: string): Promise<TestSuite | null>;
    getProjectTestSuites(projectId: string): Promise<TestSuite[]>;
    getUserTestSuites(userId: string): Promise<TestSuite[]>;
    updateTestSuite(input: UpdateTestSuiteInput): Promise<TestSuite>;
    deleteTestSuite(suiteId: string): Promise<void>;
}
