/**
 * Enhanced Retry Service
 * Advanced retry mechanisms with exponential backoff, jitter, and intelligent retry logic
 */
export interface RetryConfig {
    maxAttempts: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    jitterEnabled: boolean;
    retryableErrors: string[];
    timeoutMs?: number;
    onRetry?: (attempt: number, error: Error) => void;
    onSuccess?: (attempt: number) => void;
    onFailure?: (attempts: number, finalError: Error) => void;
}
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
    totalDuration: number;
    retryHistory: RetryAttempt[];
}
export interface RetryAttempt {
    attempt: number;
    timestamp: number;
    duration: number;
    error?: string;
    success: boolean;
}
/**
 * Enhanced retry service with intelligent retry logic
 */
export declare class EnhancedRetryService {
    private logger;
    private defaultConfig;
    constructor();
    /**
     * Execute function with enhanced retry logic
     */
    executeWithRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
    /**
     * Execute function with retry and return result object instead of throwing
     */
    executeWithRetrySafe<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>): Promise<RetryResult<T>>;
    /**
     * Execute with timeout
     */
    private executeWithTimeout;
    /**
     * Check if an error is retryable
     */
    private isRetryableError;
    /**
     * Calculate delay with exponential backoff and optional jitter
     */
    private calculateDelay;
    /**
     * Sleep for specified milliseconds
     */
    private sleep;
    /**
     * Create a retryable version of a function
     */
    makeRetryable<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>, config?: Partial<RetryConfig>): (...args: TArgs) => Promise<TResult>;
    /**
     * Retry with custom condition
     */
    retryUntil<T>(fn: () => Promise<T>, condition: (result: T) => boolean, config?: Partial<RetryConfig>): Promise<T>;
    /**
     * Batch retry for multiple operations
     */
    retryBatch<T>(operations: (() => Promise<T>)[], config?: Partial<RetryConfig>): Promise<RetryResult<T>[]>;
    /**
     * Get retry statistics
     */
    getRetryStats(retryHistory: RetryAttempt[]): {
        totalAttempts: number;
        successfulAttempts: number;
        failedAttempts: number;
        averageDuration: number;
        totalDuration: number;
    };
}
export declare const enhancedRetryService: EnhancedRetryService;
