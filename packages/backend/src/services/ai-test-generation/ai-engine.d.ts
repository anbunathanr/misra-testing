/**
 * AI Engine Service
 *
 * Integrates with OpenAI API to generate test specifications from web page analysis.
 * Implements retry logic, circuit breaker pattern, and response validation.
 */
import { TestSpecification, ApplicationAnalysis, LearningContext } from '../../types/ai-test-generation';
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
export declare class AIEngine {
    private client;
    private circuitBreaker;
    private logger;
    constructor();
    /**
     * Get or create OpenAI client with API key from Secrets Manager
     */
    private getClient;
    /**
     * Generate test specification from application analysis
     */
    generateTestSpecification(analysis: ApplicationAnalysis, scenario: string, context?: LearningContext): Promise<TestSpecification>;
    /**
     * Call OpenAI API with retry logic and circuit breaker
     */
    private callOpenAIWithRetry;
    /**
     * Construct prompt from analysis and scenario
     */
    private constructPrompt;
    /**
     * Parse OpenAI response to TestSpecification
     */
    private parseResponse;
    /**
     * Validate response against schema
     */
    validateResponse(response: unknown): TestSpecification;
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
     * Sleep utility for retry delays
     */
    private sleep;
}
export { CircuitState, APILogEntry };
