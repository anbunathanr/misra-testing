"use strict";
/**
 * Retry Utility
 * Provides retry logic with exponential backoff for transient failures
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryWithBackoff = retryWithBackoff;
exports.retryWithBackoffSafe = retryWithBackoffSafe;
exports.makeRetryable = makeRetryable;
/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
    retryableErrors: [
        'timeout',
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'ENOTFOUND',
        'network',
        'NetworkError',
        'TimeoutError',
    ],
};
/**
 * Check if an error is retryable based on error message
 */
function isRetryableError(error, retryableErrors) {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();
    return retryableErrors.some((retryableError) => errorMessage.includes(retryableError.toLowerCase()) ||
        errorName.includes(retryableError.toLowerCase()));
}
/**
 * Calculate delay for next retry attempt using exponential backoff
 */
function calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier) {
    const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
    return Math.min(delay, maxDelayMs);
}
/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
async function retryWithBackoff(fn, options = {}) {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError;
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            console.log(`Attempt ${attempt}/${opts.maxAttempts}`);
            const result = await fn();
            if (attempt > 1) {
                console.log(`Success on attempt ${attempt}`);
            }
            return result;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            console.error(`Attempt ${attempt} failed:`, lastError.message);
            // Check if error is retryable
            if (!isRetryableError(lastError, opts.retryableErrors)) {
                console.log('Error is not retryable, throwing immediately');
                throw lastError;
            }
            // Don't wait after the last attempt
            if (attempt < opts.maxAttempts) {
                const delay = calculateDelay(attempt, opts.initialDelayMs, opts.maxDelayMs, opts.backoffMultiplier);
                console.log(`Waiting ${delay}ms before retry...`);
                await sleep(delay);
            }
        }
    }
    // All attempts failed
    console.error(`All ${opts.maxAttempts} attempts failed`);
    throw lastError || new Error('All retry attempts failed');
}
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
async function retryWithBackoffSafe(fn, options = {}) {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError;
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            const result = await fn();
            return {
                success: true,
                result,
                attempts: attempt,
            };
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            // Check if error is retryable
            if (!isRetryableError(lastError, opts.retryableErrors)) {
                return {
                    success: false,
                    error: lastError,
                    attempts: attempt,
                };
            }
            // Don't wait after the last attempt
            if (attempt < opts.maxAttempts) {
                const delay = calculateDelay(attempt, opts.initialDelayMs, opts.maxDelayMs, opts.backoffMultiplier);
                await sleep(delay);
            }
        }
    }
    return {
        success: false,
        error: lastError || new Error('All retry attempts failed'),
        attempts: opts.maxAttempts,
    };
}
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
function makeRetryable(fn, options = {}) {
    return async (...args) => {
        return retryWithBackoff(() => fn(...args), options);
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV0cnktdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInJldHJ5LXV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7QUFzRkgsNENBOENDO0FBdUJELG9EQTZDQztBQW1CRCxzQ0FPQztBQWpORDs7R0FFRztBQUNILE1BQU0scUJBQXFCLEdBQTJCO0lBQ3BELFdBQVcsRUFBRSxDQUFDO0lBQ2QsY0FBYyxFQUFFLElBQUk7SUFDcEIsVUFBVSxFQUFFLElBQUk7SUFDaEIsaUJBQWlCLEVBQUUsQ0FBQztJQUNwQixlQUFlLEVBQUU7UUFDZixTQUFTO1FBQ1QsV0FBVztRQUNYLFlBQVk7UUFDWixjQUFjO1FBQ2QsV0FBVztRQUNYLFNBQVM7UUFDVCxjQUFjO1FBQ2QsY0FBYztLQUNmO0NBQ0YsQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFZLEVBQUUsZUFBeUI7SUFDL0QsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNqRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO0lBRTNDLE9BQU8sZUFBZSxDQUFDLElBQUksQ0FDekIsQ0FBQyxjQUFjLEVBQUUsRUFBRSxDQUNqQixZQUFZLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNuRCxTQUFTLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUNuRCxDQUFDO0FBQ0osQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxjQUFjLENBQ3JCLE9BQWUsRUFDZixjQUFzQixFQUN0QixVQUFrQixFQUNsQixpQkFBeUI7SUFFekIsTUFBTSxLQUFLLEdBQUcsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3hFLE9BQU8sSUFBSSxD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R0FBRyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDdEQsQ0FBQyxDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBSZXRyeSBVdGlsaXR5XHJcbiAqIFByb3ZpZGVzIHJldHJ5IGxvZ2ljIHdpdGggZXhwb25lbnRpYWwgYmFja29mZiBmb3IgdHJhbnNpZW50IGZhaWx1cmVzXHJcbiAqL1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSZXRyeU9wdGlvbnMge1xyXG4gIG1heEF0dGVtcHRzPzogbnVtYmVyO1xyXG4gIGluaXRpYWxEZWxheU1zPzogbnVtYmVyO1xyXG4gIG1heERlbGF5TXM/OiBudW1iZXI7XHJcbiAgYmFja29mZk11bHRpcGxpZXI/OiBudW1iZXI7XHJcbiAgcmV0cnlhYmxlRXJyb3JzPzogc3RyaW5nW107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlSZXN1bHQ8VD4ge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgcmVzdWx0PzogVDtcclxuICBlcnJvcj86IEVycm9yO1xyXG4gIGF0dGVtcHRzOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZWZhdWx0IHJldHJ5IG9wdGlvbnNcclxuICovXHJcbmNvbnN0IERFRkFVTFRfUkVUUllfT1BUSU9OUzogUmVxdWlyZWQ8UmV0cnlPcHRpb25zPiA9IHtcclxuICBtYXhBdHRlbXB0czogMyxcclxuICBpbml0aWFsRGVsYXlNczogMTAwMCxcclxuICBtYXhEZWxheU1zOiA4MDAwLFxyXG4gIGJhY2tvZmZNdWx0aXBsaWVyOiAyLFxyXG4gIHJldHJ5YWJsZUVycm9yczogW1xyXG4gICAgJ3RpbWVvdXQnLFxyXG4gICAgJ0VUSU1FRE9VVCcsXHJcbiAgICAnRUNPTk5SRVNFVCcsXHJcbiAgICAnRUNPTk5SRUZVU0VEJyxcclxuICAgICdFTk9URk9VTkQnLFxyXG4gICAgJ25ldHdvcmsnLFxyXG4gICAgJ05ldHdvcmtFcnJvcicsXHJcbiAgICAnVGltZW91dEVycm9yJyxcclxuICBdLFxyXG59O1xyXG5cclxuLyoqXHJcbiAqIENoZWNrIGlmIGFuIGVycm9yIGlzIHJldHJ5YWJsZSBiYXNlZCBvbiBlcnJvciBtZXNzYWdlXHJcbiAqL1xyXG5mdW5jdGlvbiBpc1JldHJ5YWJsZUVycm9yKGVycm9yOiBFcnJvciwgcmV0cnlhYmxlRXJyb3JzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yLm1lc3NhZ2UudG9Mb3dlckNhc2UoKTtcclxuICBjb25zdCBlcnJvck5hbWUgPSBlcnJvci5uYW1lLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gIHJldHVybiByZXRyeWFibGVFcnJvcnMuc29tZShcclxuICAgIChyZXRyeWFibGVFcnJvcikgPT5cclxuICAgICAgZXJyb3JNZXNzYWdlLmluY2x1ZGVzKHJldHJ5YWJsZUVycm9yLnRvTG93ZXJDYXNlKCkpIHx8XHJcbiAgICAgIGVycm9yTmFtZS5pbmNsdWRlcyhyZXRyeWFibGVFcnJvci50b0xvd2VyQ2FzZSgpKVxyXG4gICk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgZGVsYXkgZm9yIG5leHQgcmV0cnkgYXR0ZW1wdCB1c2luZyBleHBvbmVudGlhbCBiYWNrb2ZmXHJcbiAqL1xyXG5mdW5jdGlvbiBjYWxjdWxhdGVEZWxheShcclxuICBhdHRlbXB0OiBudW1iZXIsXHJcbiAgaW5pdGlhbERlbGF5TXM6IG51bWJlcixcclxuICBtYXhEZWxheU1zOiBudW1iZXIsXHJcbiAgYmFja29mZk11bHRpcGxpZXI6IG51bWJlclxyXG4pOiBudW1iZXIge1xyXG4gIGNvbnN0IGRlbGF5ID0gaW5pdGlhbERlbGF5TXMgKiBNYXRoLnBvdyhiYWNrb2ZmTXVsdGlwbGllciwgYXR0ZW1wdCAtIDEpO1xyXG4gIHJldHVybiBNYXRoLm1pbihkZWxheSwgbWF4RGVsYXlNcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTbGVlcCBmb3Igc3BlY2lmaWVkIG1pbGxpc2Vjb25kc1xyXG4gKi9cclxuZnVuY3Rpb24gc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4gc2V0VGltZW91dChyZXNvbHZlLCBtcykpO1xyXG59XHJcblxyXG4vKipcclxuICogUmV0cnkgYSBmdW5jdGlvbiB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICogXHJcbiAqIEBwYXJhbSBmbiAtIFRoZSBhc3luYyBmdW5jdGlvbiB0byByZXRyeVxyXG4gKiBAcGFyYW0gb3B0aW9ucyAtIFJldHJ5IGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJucyBQcm9taXNlIHdpdGggdGhlIHJlc3VsdCBvZiB0aGUgZnVuY3Rpb25cclxuICogXHJcbiAqIEBleGFtcGxlXHJcbiAqIGBgYHR5cGVzY3JpcHRcclxuICogY29uc3QgcmVzdWx0ID0gYXdhaXQgcmV0cnlXaXRoQmFja29mZihcclxuICogICBhc3luYyAoKSA9PiBhd2FpdCBwYWdlLmNsaWNrKCcjYnV0dG9uJyksXHJcbiAqICAgeyBtYXhBdHRlbXB0czogMywgaW5pdGlhbERlbGF5TXM6IDEwMDAgfVxyXG4gKiApO1xyXG4gKiBgYGBcclxuICovXHJcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByZXRyeVdpdGhCYWNrb2ZmPFQ+KFxyXG4gIGZuOiAoKSA9PiBQcm9taXNlPFQ+LFxyXG4gIG9wdGlvbnM6IFJldHJ5T3B0aW9ucyA9IHt9XHJcbik6IFByb21pc2U8VD4ge1xyXG4gIGNvbnN0IG9wdHMgPSB7IC4uLkRFRkFVTFRfUkVUUllfT1BUSU9OUywgLi4ub3B0aW9ucyB9O1xyXG4gIGxldCBsYXN0RXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xyXG5cclxuICBmb3IgKGxldCBhdHRlbXB0ID0gMTsgYXR0ZW1wdCA8PSBvcHRzLm1heEF0dGVtcHRzOyBhdHRlbXB0KyspIHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBBdHRlbXB0ICR7YXR0ZW1wdH0vJHtvcHRzLm1heEF0dGVtcHRzfWApO1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmbigpO1xyXG4gICAgICBcclxuICAgICAgaWYgKGF0dGVtcHQgPiAxKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFN1Y2Nlc3Mgb24gYXR0ZW1wdCAke2F0dGVtcHR9YCk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBsYXN0RXJyb3IgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zb2xlLmVycm9yKGBBdHRlbXB0ICR7YXR0ZW1wdH0gZmFpbGVkOmAsIGxhc3RFcnJvci5tZXNzYWdlKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIGVycm9yIGlzIHJldHJ5YWJsZVxyXG4gICAgICBpZiAoIWlzUmV0cnlhYmxlRXJyb3IobGFzdEVycm9yLCBvcHRzLnJldHJ5YWJsZUVycm9ycykpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnRXJyb3IgaXMgbm90IHJldHJ5YWJsZSwgdGhyb3dpbmcgaW1tZWRpYXRlbHknKTtcclxuICAgICAgICB0aHJvdyBsYXN0RXJyb3I7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIERvbid0IHdhaXQgYWZ0ZXIgdGhlIGxhc3QgYXR0ZW1wdFxyXG4gICAgICBpZiAoYXR0ZW1wdCA8IG9wdHMubWF4QXR0ZW1wdHMpIHtcclxuICAgICAgICBjb25zdCBkZWxheSA9IGNhbGN1bGF0ZURlbGF5KFxyXG4gICAgICAgICAgYXR0ZW1wdCxcclxuICAgICAgICAgIG9wdHMuaW5pdGlhbERlbGF5TXMsXHJcbiAgICAgICAgICBvcHRzLm1heERlbGF5TXMsXHJcbiAgICAgICAgICBvcHRzLmJhY2tvZmZNdWx0aXBsaWVyXHJcbiAgICAgICAgKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zb2xlLmxvZyhgV2FpdGluZyAke2RlbGF5fW1zIGJlZm9yZSByZXRyeS4uLmApO1xyXG4gICAgICAgIGF3YWl0IHNsZWVwKGRlbGF5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLy8gQWxsIGF0dGVtcHRzIGZhaWxlZFxyXG4gIGNvbnNvbGUuZXJyb3IoYEFsbCAke29wdHMubWF4QXR0ZW1wdHN9IGF0dGVtcHRzIGZhaWxlZGApO1xyXG4gIHRocm93IGxhc3RFcnJvciB8fCBuZXcgRXJyb3IoJ0FsbCByZXRyeSBhdHRlbXB0cyBmYWlsZWQnKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJldHJ5IGEgZnVuY3Rpb24gd2l0aCBleHBvbmVudGlhbCBiYWNrb2ZmLCByZXR1cm5pbmcgYSByZXN1bHQgb2JqZWN0IGluc3RlYWQgb2YgdGhyb3dpbmdcclxuICogXHJcbiAqIEBwYXJhbSBmbiAtIFRoZSBhc3luYyBmdW5jdGlvbiB0byByZXRyeVxyXG4gKiBAcGFyYW0gb3B0aW9ucyAtIFJldHJ5IGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJucyBQcm9taXNlIHdpdGggUmV0cnlSZXN1bHQgY29udGFpbmluZyBzdWNjZXNzIHN0YXR1cyBhbmQgcmVzdWx0L2Vycm9yXHJcbiAqIFxyXG4gKiBAZXhhbXBsZVxyXG4gKiBgYGB0eXBlc2NyaXB0XHJcbiAqIGNvbnN0IHsgc3VjY2VzcywgcmVzdWx0LCBlcnJvciB9ID0gYXdhaXQgcmV0cnlXaXRoQmFja29mZlNhZmUoXHJcbiAqICAgYXN5bmMgKCkgPT4gYXdhaXQgYXBpQ2FsbCgpLFxyXG4gKiAgIHsgbWF4QXR0ZW1wdHM6IDMgfVxyXG4gKiApO1xyXG4gKiBcclxuICogaWYgKHN1Y2Nlc3MpIHtcclxuICogICBjb25zb2xlLmxvZygnUmVzdWx0OicsIHJlc3VsdCk7XHJcbiAqIH0gZWxzZSB7XHJcbiAqICAgY29uc29sZS5lcnJvcignRmFpbGVkIGFmdGVyIHJldHJpZXM6JywgZXJyb3IpO1xyXG4gKiB9XHJcbiAqIGBgYFxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJldHJ5V2l0aEJhY2tvZmZTYWZlPFQ+KFxyXG4gIGZuOiAoKSA9PiBQcm9taXNlPFQ+LFxyXG4gIG9wdGlvbnM6IFJldHJ5T3B0aW9ucyA9IHt9XHJcbik6IFByb21pc2U8UmV0cnlSZXN1bHQ8VD4+IHtcclxuICBjb25zdCBvcHRzID0geyAuLi5ERUZBVUxUX1JFVFJZX09QVElPTlMsIC4uLm9wdGlvbnMgfTtcclxuICBsZXQgbGFzdEVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcclxuXHJcbiAgZm9yIChsZXQgYXR0ZW1wdCA9IDE7IGF0dGVtcHQgPD0gb3B0cy5tYXhBdHRlbXB0czsgYXR0ZW1wdCsrKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmbigpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgIGF0dGVtcHRzOiBhdHRlbXB0LFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgbGFzdEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xyXG5cclxuICAgICAgLy8gQ2hlY2sgaWYgZXJyb3IgaXMgcmV0cnlhYmxlXHJcbiAgICAgIGlmICghaXNSZXRyeWFibGVFcnJvcihsYXN0RXJyb3IsIG9wdHMucmV0cnlhYmxlRXJyb3JzKSkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICAgIGVycm9yOiBsYXN0RXJyb3IsXHJcbiAgICAgICAgICBhdHRlbXB0czogYXR0ZW1wdCxcclxuICAgICAgICB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBEb24ndCB3YWl0IGFmdGVyIHRoZSBsYXN0IGF0dGVtcHRcclxuICAgICAgaWYgKGF0dGVtcHQgPCBvcHRzLm1heEF0dGVtcHRzKSB7XHJcbiAgICAgICAgY29uc3QgZGVsYXkgPSBjYWxjdWxhdGVEZWxheShcclxuICAgICAgICAgIGF0dGVtcHQsXHJcbiAgICAgICAgICBvcHRzLmluaXRpYWxEZWxheU1zLFxyXG4gICAgICAgICAgb3B0cy5tYXhEZWxheU1zLFxyXG4gICAgICAgICAgb3B0cy5iYWNrb2ZmTXVsdGlwbGllclxyXG4gICAgICAgICk7XHJcbiAgICAgICAgYXdhaXQgc2xlZXAoZGVsYXkpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICBlcnJvcjogbGFzdEVycm9yIHx8IG5ldyBFcnJvcignQWxsIHJldHJ5IGF0dGVtcHRzIGZhaWxlZCcpLFxyXG4gICAgYXR0ZW1wdHM6IG9wdHMubWF4QXR0ZW1wdHMsXHJcbiAgfTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhIHJldHJ5YWJsZSB2ZXJzaW9uIG9mIGEgZnVuY3Rpb25cclxuICogXHJcbiAqIEBwYXJhbSBmbiAtIFRoZSBhc3luYyBmdW5jdGlvbiB0byBtYWtlIHJldHJ5YWJsZVxyXG4gKiBAcGFyYW0gb3B0aW9ucyAtIFJldHJ5IGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xyXG4gKiBAcmV0dXJucyBBIG5ldyBmdW5jdGlvbiB0aGF0IHdpbGwgcmV0cnkgb24gZmFpbHVyZVxyXG4gKiBcclxuICogQGV4YW1wbGVcclxuICogYGBgdHlwZXNjcmlwdFxyXG4gKiBjb25zdCByZXRyeWFibGVDbGljayA9IG1ha2VSZXRyeWFibGUoXHJcbiAqICAgYXN5bmMgKHNlbGVjdG9yOiBzdHJpbmcpID0+IGF3YWl0IHBhZ2UuY2xpY2soc2VsZWN0b3IpLFxyXG4gKiAgIHsgbWF4QXR0ZW1wdHM6IDMgfVxyXG4gKiApO1xyXG4gKiBcclxuICogYXdhaXQgcmV0cnlhYmxlQ2xpY2soJyNidXR0b24nKTtcclxuICogYGBgXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gbWFrZVJldHJ5YWJsZTxUQXJncyBleHRlbmRzIGFueVtdLCBUUmVzdWx0PihcclxuICBmbjogKC4uLmFyZ3M6IFRBcmdzKSA9PiBQcm9taXNlPFRSZXN1bHQ+LFxyXG4gIG9wdGlvbnM6IFJldHJ5T3B0aW9ucyA9IHt9XHJcbik6ICguLi5hcmdzOiBUQXJncykgPT4gUHJvbWlzZTxUUmVzdWx0PiB7XHJcbiAgcmV0dXJuIGFzeW5jICguLi5hcmdzOiBUQXJncyk6IFByb21pc2U8VFJlc3VsdD4gPT4ge1xyXG4gICAgcmV0dXJuIHJldHJ5V2l0aEJhY2tvZmYoKCkgPT4gZm4oLi4uYXJncyksIG9wdGlvbnMpO1xyXG4gIH07XHJcbn1cclxuIl19