/**
 * AI Engine Factory
 *
 * Provides a centralized factory for creating AI engine instances based on
 * the configured provider. Supports multiple AI providers (Bedrock, OpenAI, HuggingFace)
 * with runtime provider selection via environment variables.
 */
import { ApplicationAnalysis, LearningContext, TestSpecification } from '../../types/ai-test-generation';
/**
 * Supported AI providers
 */
export type AIProvider = 'BEDROCK' | 'OPENAI' | 'HUGGINGFACE';
/**
 * Common interface for all AI engines
 * This ensures all engines can be used interchangeably
 */
export interface IAIEngine {
    generateTestSpecification(analysis: ApplicationAnalysis, scenario: string, context?: LearningContext): Promise<TestSpecification>;
}
/**
 * AI Engine Factory
 *
 * Creates AI engine instances based on the AI_PROVIDER environment variable.
 * Defaults to BEDROCK if not specified.
 *
 * Supports canary deployment with BEDROCK_TRAFFIC_PERCENTAGE for gradual rollout.
 */
export declare class AIEngineFactory {
    /**
     * Create an AI engine instance for the specified provider
     *
     * @param provider - Optional provider override. If not specified, reads from AI_PROVIDER env var
     * @returns AI engine instance
     * @throws Error if provider is unknown
     */
    static create(provider?: AIProvider): IAIEngine;
    /**
     * Select provider with canary deployment support
     *
     * Implements traffic percentage routing for gradual Bedrock rollout.
     * When BEDROCK_TRAFFIC_PERCENTAGE is set, routes that percentage of traffic to Bedrock
     * regardless of the AI_PROVIDER setting.
     *
     * @param provider - Optional provider override
     * @returns Selected provider based on canary logic
     */
    private static selectProviderWithCanary;
    /**
     * Get the currently configured provider
     *
     * @returns Current AI provider
     */
    static getCurrentProvider(): AIProvider;
    /**
     * Check if a provider is supported
     *
     * @param provider - Provider to check
     * @returns True if provider is supported
     */
    static isProviderSupported(provider: string): boolean;
}
