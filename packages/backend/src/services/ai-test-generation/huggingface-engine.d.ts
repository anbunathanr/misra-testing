/**
 * Hugging Face AI Engine
 *
 * Alternative to OpenAI using Hugging Face Inference API
 * Free tier available with rate limits
 */
import { TestSpecification, ApplicationAnalysis, LearningContext } from '../../types/ai-test-generation';
export declare class HuggingFaceEngine {
    private client;
    private readonly MODEL;
    private getClient;
    /**
     * Generate test specification from application analysis
     */
    generateTestSpecification(analysis: ApplicationAnalysis, scenario: string, context?: LearningContext): Promise<TestSpecification>;
    /**
     * Construct prompt for Hugging Face model
     */
    private constructPrompt;
    /**
     * Validate response against schema
     */
    private validateResponse;
}
