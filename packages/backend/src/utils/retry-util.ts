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
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
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
function isRetryableError(error: Error, retryableErrors: string[]): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorName = error.name.toLowerCase();

  return retryableErrors.some(
    (retryableError) =>
      errorMessage.includes(retryableError.toLowerCase()) ||
      errorName.includes(retryableError.toLowerCase())
  );
}

/**
 * Calculate delay for next retry attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
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
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${opts.maxAttempts}`);
      const result = await fn();
      
      if (attempt > 1) {
        console.log(`Success on attempt ${attempt}`);
      }
      
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      console.error(`Attempt ${attempt} failed:`, lastError.message);

      // Check if error is retryable
      if (!isRetryableError(lastError, opts.retryableErrors)) {
        console.log('Error is not retryable, throwing immediately');
        throw lastError;
      }

      // Don't wait after the last attempt
      if (attempt < opts.maxAttempts) {
        const delay = calculateDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier
        );
        
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
export async function retryWithBackoffSafe<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
      };
    } catch (error) {
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
        const delay = calculateDelay(
          attempt,
          opts.initialDelayMs,
          opts.maxDelayMs,
          opts.backoffMultiplier
        );
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
export function makeRetryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return retryWithBackoff(() => fn(...args), options);
  };
}
