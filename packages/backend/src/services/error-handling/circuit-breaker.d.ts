/**
 * Circuit Breaker Service
 * Implements circuit breaker pattern for external service calls
 * Prevents cascading failures and provides graceful degradation
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeoutMs: number;
    halfOpenMaxAttempts: number;
    monitoringWindowMs?: number;
}
export interface CircuitBreakerMetrics {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: number;
    totalRequests: number;
    failureRate: number;
}
/**
 * Circuit Breaker implementation for production error handling
 */
export declare class CircuitBreaker {
    private state;
    private failureCount;
    private successCount;
    private lastFailureTime?;
    private totalRequests;
    private readonly config;
    constructor(config: CircuitBreakerConfig);
    /**
     * Execute a function with circuit breaker protection
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Handle successful execution
     */
    private onSuccess;
    /**
     * Handle failed execution
     */
    private onFailure;
    /**
     * Check if circuit should attempt reset
     */
    private shouldAttemptReset;
    /**
     * Reset circuit to closed state
     */
    reset(): void;
    /**
     * Get current circuit breaker metrics
     */
    getMetrics(): CircuitBreakerMetrics;
    /**
     * Get current state
     */
    getState(): CircuitState;
    /**
     * Force circuit to open state (for testing/maintenance)
     */
    forceOpen(): void;
    /**
     * Check if circuit is healthy
     */
    isHealthy(): boolean;
}
/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export declare class CircuitBreakerManager {
    private breakers;
    private defaultConfig;
    /**
     * Get or create circuit breaker for a service
     */
    getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
    /**
     * Execute function with circuit breaker for specific service
     */
    executeWithBreaker<T>(serviceName: string, fn: () => Promise<T>, config?: Partial<CircuitBreakerConfig>): Promise<T>;
    /**
     * Get metrics for all circuit breakers
     */
    getAllMetrics(): Record<string, CircuitBreakerMetrics>;
    /**
     * Reset all circuit breakers
     */
    resetAll(): void;
    /**
     * Get health status of all services
     */
    getHealthStatus(): Record<string, boolean>;
}
export declare const circuitBreakerManager: CircuitBreakerManager;
