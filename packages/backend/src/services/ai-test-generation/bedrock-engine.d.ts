/**
 * Bedrock Engine Service
 *
 * Integrates with Amazon Bedrock (Claude Sonnet 4.6) for AI-powered test generation.
 * Uses inference profile for cross-region routing and high availability.
 * Implements the same interface as AIEngine for provider abstraction.
 */
import { TestSpecification, ApplicationAnalysis, LearningContext, TokenUsage } from '../../types/ai-test-generation';
/**
 * General AI request for various generation tasks
 */
export interface AIRequest {
    scenario?: string;
    context?: any;
    url?: string;
    html?: string;
    partialCode?: string;
    elementDescription?: string;
    domContext?: string;
}
/**
 * General AI response with content and usage metrics
 */
export interface AIResponse {
    content: string;
    usage: TokenUsage;
    cost: number;
    model: string;
    provider: string;
}
declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
interface APILogEntry {
    timestamp: string;
    operation: string;
    model: string;
    requestTokens?: number;
    responseTokens?: number;
    totalTokens?: number;
    status: 'success' | 'failure';
    error?: string;
    duration: number;
}
interface BedrockConfig {
    region?: string;
    modelId?: string;
    timeout?: number;
}
export declare class BedrockEngine {
    private client;
    private circuitBreaker;
    private logger;
    private modelId;
    private region;
    private monitoring;
    constructor(config?: BedrockConfig);
    /**
     * Analyze application structure and provide insights
     */
    analyze(analysis: ApplicationAnalysis): Promise<{
        features: string[];
        userFlows: string[];
        interactiveElements: Array<{
            type: string;
            selector: string;
            action: string;
        }>;
        authRequired: boolean;
        testRecommendations: string[];
    }>;
    /**
     * Generate test code, selectors, or other AI-generated content
     * This is a general-purpose generation method for various AI tasks
     */
    generate(request: AIRequest): Promise<AIResponse>;
    /**
     * Complete partial code using AI
     * Specialized method for code completion with optimized parameters
     */
    complete(request: AIRequest): Promise<AIResponse>;
    /**
     * Generate test specification from application analysis
     */
    generateTestSpecification(analysis: ApplicationAnalysis, scenario: string, context?: LearningContext): Promise<TestSpecification>;
    /**
     * Invoke Bedrock model with retry logic and circuit breaker
     */
    private invokeModelWithRetry;
    /**
     * Build analysis prompt from application context
     */
    private buildAnalysisPrompt;
    /**
     * Build generation prompt for test code, selectors, or completions
     */
    private buildGenerationPrompt;
    /**
     * Build completion prompt for partial code
     */
    private buildCompletionPrompt;
    /**
     * Validate that generated content contains valid Playwright syntax
     */
    private validatePlaywrightSyntax;
    /**
     * Calculate cost based on token usage
     * Claude Sonnet 4.6 pricing: $3/1M input tokens, $15/1M output tokens
     * Note: Pricing may vary - verify current rates at https://aws.amazon.com/bedrock/pricing/
     */
    private calculateCost;
    /**
     * Construct prompt from analysis and scenario
     */
    private constructPrompt;
    /**
     * Parse Bedrock response to TestSpecification
     */
    private parseResponse;
    /**
     * Validate response against schema
     */
    validateResponse(response: unknown): TestSpecification;
    /**
     * Handle Bedrock errors and convert to standard error types
     */
    private handleError;
    /**
     * Get API interaction logs
     */
    getLogs(): APILogEntry[];
    /**
     * Clear API interaction logs
     */
    clearLogs(): void;
    /**
     * Get circuit breaker state
     */
    getCircuitState(): CircuitState;
    /**
     * Reset circuit breaker (for testing)
     */
    resetCircuit(): void;
    /**
     * Extract error type from error object
     */
    private extractErrorType;
    /**
     * Sleep utility for retry delays
     */
    private sleep;
}
export { CircuitState, APILogEntry };
