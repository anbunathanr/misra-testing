/**
 * AI Test Generation Configuration
 *
 * Centralized configuration for AI test generation feature including:
 * - OpenAI model selection
 * - Usage limits (per-user and per-project)
 * - Pricing rates for cost calculation
 * - Retry and timeout settings
 */
export interface AITestGenerationConfig {
    openai: {
        model: 'gpt-4' | 'gpt-3.5-turbo';
        maxTokens: number;
        temperature: number;
    };
    limits: {
        perUser: {
            monthlyCostLimit: number;
            dailyCallLimit: number;
        };
        perProject: {
            monthlyCostLimit: number;
            dailyCallLimit: number;
        };
    };
    pricing: {
        'gpt-4': {
            promptRate: number;
            completionRate: number;
        };
        'gpt-3.5-turbo': {
            promptRate: number;
            completionRate: number;
        };
    };
    retry: {
        maxAttempts: number;
        initialDelayMs: number;
        maxDelayMs: number;
        backoffMultiplier: number;
    };
    timeout: {
        analysisTimeoutMs: number;
        generationTimeoutMs: number;
        batchGenerationTimeoutMs: number;
    };
    batch: {
        maxConcurrency: number;
        maxScenariosPerBatch: number;
    };
}
/**
 * Default configuration for AI test generation
 */
export declare const defaultConfig: AITestGenerationConfig;
/**
 * Get configuration from environment variables or use defaults
 */
export declare function getConfig(): AITestGenerationConfig;
/**
 * Validate configuration values
 */
export declare function validateConfig(config: AITestGenerationConfig): string[];
