/**
 * OpenAI API configuration for AI test generation
 */
export declare const OPENAI_CONFIG: {
    readonly apiKey: string;
    readonly organization: string | undefined;
    readonly models: {
        readonly default: "gpt-4-turbo-preview";
        readonly fallback: "gpt-3.5-turbo";
        readonly analysis: "gpt-4-turbo-preview";
        readonly generation: "gpt-4-turbo-preview";
    };
    readonly parameters: {
        readonly temperature: 0.3;
        readonly maxTokens: 4000;
        readonly topP: 1;
        readonly frequencyPenalty: 0;
        readonly presencePenalty: 0;
    };
    readonly retry: {
        readonly maxAttempts: 3;
        readonly initialDelayMs: 1000;
        readonly maxDelayMs: 4000;
        readonly backoffMultiplier: 2;
    };
    readonly circuitBreaker: {
        readonly failureThreshold: 5;
        readonly resetTimeoutMs: 60000;
        readonly halfOpenMaxAttempts: 1;
    };
    readonly rateLimit: {
        readonly requestsPerMinute: 60;
        readonly tokensPerMinute: 90000;
    };
    readonly timeout: {
        readonly requestTimeoutMs: 30000;
        readonly analysisTimeoutMs: 45000;
        readonly generationTimeoutMs: 30000;
    };
    readonly pricing: {
        readonly 'gpt-4-turbo-preview': {
            readonly prompt: 0.01;
            readonly completion: 0.03;
        };
        readonly 'gpt-3.5-turbo': {
            readonly prompt: 0.0005;
            readonly completion: 0.0015;
        };
    };
    readonly limits: {
        readonly perUser: {
            readonly dailyRequests: 100;
            readonly dailyTokens: 100000;
            readonly dailyCost: 10;
        };
        readonly perProject: {
            readonly dailyRequests: 500;
            readonly dailyTokens: 500000;
            readonly dailyCost: 50;
        };
    };
    readonly prompts: {
        readonly systemRole: "You are an expert QA engineer specializing in web application testing. Your task is to analyze web pages and generate comprehensive, maintainable test cases.";
        readonly maxContextLength: 8000;
        readonly includeExamples: true;
        readonly outputFormat: "json";
    };
};
/**
 * Get OpenAI API key from environment
 * @throws Error if API key is not configured
 */
export declare function getOpenAIApiKey(): string;
/**
 * Get model name for a specific operation
 */
export declare function getModelForOperation(operation: 'analysis' | 'generation'): string;
/**
 * Calculate cost for token usage
 */
export declare function calculateCost(model: string, promptTokens: number, completionTokens: number): number;
/**
 * Check if API key is configured
 */
export declare function isOpenAIConfigured(): boolean;
/**
 * Get retry delay for attempt number
 */
export declare function getRetryDelay(attemptNumber: number): number;
/**
 * Validate model name
 */
export declare function isValidModel(model: string): boolean;
/**
 * Get timeout for operation type
 */
export declare function getTimeout(operation: 'request' | 'analysis' | 'generation'): number;
