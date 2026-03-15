/**
 * Mock AI Service
 *
 * Simulates OpenAI API responses for testing without actual API calls.
 * Useful for development, testing, and CI/CD pipelines.
 */
import { TestSpecification, TokenUsage } from '../../types/ai-test-generation';
export declare class MockAIService {
    /**
     * Generate a mock test specification
     */
    generateTestSpecification(url: string, scenario: string): Promise<{
        specification: TestSpecification;
        tokens: TokenUsage;
    }>;
    /**
     * Simulate API delay
     */
    private delay;
    /**
     * Check if mock mode is enabled
     */
    static isMockMode(): boolean;
}
