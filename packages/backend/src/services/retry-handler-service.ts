/**
 * Retry Handler Service
 * 
 * Implements exponential backoff retry logic for failed operations.
 * Used for notification delivery and other transient failures.
 */

import { RetryConfig, RetryResult } from '../types/notification';

export class RetryHandlerService {
  /**
   * Execute an operation with retry logic and exponential backoff
   * 
   * @param operation - The async operation to execute
   * @param config - Retry configuration
   * @returns RetryResult with success status, result, and attempt count
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: RetryConfig
  ): Promise<RetryResult<T>> {
    let lastError: Error | undefined;
    let attemptCount = 0;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      attemptCount = attempt + 1;

      try {
        // Execute the operation
        const result = await operation();
        
        return {
          success: true,
          result,
          attemptCount,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // If this was the last attempt, don't delay
        if (attempt === config.maxRetries) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateBackoffDelay(attempt, config);
        
        // Log retry attempt
        console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} failed. Retrying in ${delay}ms...`, {
          error: lastError.message,
          attempt: attempt + 1,
          maxRetries: config.maxRetries,
          delay,
        });

        // Wait before next attempt
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError,
      attemptCount,
    };
  }

  /**
   * Calculate exponential backoff delay
   * 
   * Formula: min(initialDelay * (backoffMultiplier ^ attempt), maxDelay)
   * 
   * @param attemptNumber - Current attempt number (0-indexed)
   * @param config - Retry configuration
   * @returns Delay in milliseconds
   */
  calculateBackoffDelay(attemptNumber: number, config: RetryConfig): number {
    const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
    return Math.min(exponentialDelay, config.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const retryHandlerService = new RetryHandlerService();
