/**
 * Retry Handler Service
 *
 * Implements exponential backoff retry logic for failed operations.
 * Used for notification delivery and other transient failures.
 */
import { RetryConfig, RetryResult } from '../types/notification';
export declare class RetryHandlerService {
    /**
     * Execute an operation with retry logic and exponential backoff
     *
     * @param operation - The async operation to execute
     * @param config - Retry configuration
     * @returns RetryResult with success status, result, and attempt count
     */
    executeWithRetry<T>(operation: () => Promise<T>, config: RetryConfig): Promise<RetryResult<T>>;
    /**
     * Calculate exponential backoff delay
     *
     * Formula: min(initialDelay * (backoffMultiplier ^ attempt), maxDelay)
     *
     * @param attemptNumber - Current attempt number (0-indexed)
     * @param config - Retry configuration
     * @returns Delay in milliseconds
     */
    calculateBackoffDelay(attemptNumber: number, config: RetryConfig): number;
    /**
     * Sleep for specified milliseconds
     *
     * @param ms - Milliseconds to sleep
     */
    private sleep;
}
export declare const retryHandlerService: RetryHandlerService;
