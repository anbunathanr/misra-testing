import { TestCase, CreateTestCaseInput, UpdateTestCaseInput } from '../types/test-case';
export declare class TestCaseService {
    createTestCase(userId: string, input: CreateTestCaseInput): Promise<TestCase>;
    getTestCase(testCaseId: string): Promise<TestCase | null>;
    getSuiteTestCases(suiteId: string): Promise<TestCase[]>;
    getProjectTestCases(projectId: string): Promise<TestCase[]>;
    updateTestCase(input: UpdateTestCaseInput): Promise<TestCase>;
    deleteTestCase(testCaseId: string): Promise<void>;
}
