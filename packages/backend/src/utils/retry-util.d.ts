/**
 * Retry Utility
 * Provides retry logic with exponential backoff for transient failures
 */
export interface RetryOptions {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
}
export interface RetryResult<T> {
    success: boolean;
    result?: T;
    error?: Error;
    attempts: number;
}
/**
 * Retry a function with exponential backoff
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise with the result of the function
 *
 * @example
 * ```typescript
 * const result = await retryWithBackoff(
 *   async () => await page.click('#button'),
 *   { maxAttempts: 3, initialDelayMs: 1000 }
 * );
 * ```
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Retry a function with exponential backoff, returning a result object instead of throwing
 *
 * @param fn - The async function to retry
 * @param options - Retry configuration options
 * @returns Promise with RetryResult containing success status and result/error
 *
 * @example
 * ```typescript
 * const { success, result, error } = await retryWithBackoffSafe(
 *   async () => await apiCall(),
 *   { maxAttempts: 3 }
 * );
 *
 * if (success) {
 *   console.log('Result:', result);
 * } else {
 *   console.error('Failed after retries:', error);
 * }
 * ```
 */
export declare function retryWithBackoffSafe<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<RetryResult<T>>;
/**
 * Create a retryable version of a function
 *
 * @param fn - The async function to make retryable
 * @param options - Retry configuration options
 * @returns A new function that will retry on failure
 *
 * @example
 * ```typescript
 * const retryableClick = makeRetryable(
 *   async (selector: string) => await page.click(selector),
 *   { maxAttempts: 3 }
 * );
 *
 * await retryableClick('#button');
 * ```
 */
export declare function makeRetryable<TArgs extends any[], TResult>(fn: (...args: TArgs) => Promise<TResult>, options?: RetryOptions): (...args: TArgs) => Promise<TResult>;
