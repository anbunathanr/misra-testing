/**
 * Enhanced Retry Service
 * Advanced retry mechanisms with exponential backoff, jitter, and intelligent retry logic
 */

import { Logger, createLogger } from '../../utils/logger';
import { userFriendlyErrorService } from './user-friendly-errors';

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
export class EnhancedRetryService {
  private logger: Logger;
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitterEnabled: true,
    retryableErrors: [
      'timeout',
      'ETIMEDOUT',
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'network',
      'NetworkError',
      'TimeoutError',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMIT_EXCEEDED',
      'DATABASE_ERROR',
      'EXTERNAL_SERVICE_ERROR'
    ]
  };

  constructor() {
    this.logger = createLogger('EnhancedRetryService');
  }

  /**
   * Execute function with enhanced retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const startTime = Date.now();
    const retryHistory: RetryAttempt[] = [];
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      const attemptStart = Date.now();
      
      try {
        this.logger.debug(`Attempt ${attempt}/${finalConfig.maxAttempts}`);
        
        // Execute with timeout if specified
        const result = finalConfig.timeoutMs 
          ? await this.executeWithTimeout(fn, finalConfig.timeoutMs)
          : await fn();
        
        const attemptDuration = Date.now() - attemptStart;
        
        // Record successful attempt
        retryHistory.push({
          attempt,
          timestamp: attemptStart,
          duration: attemptDuration,
          success: true
        });

        // Call success callback
        finalConfig.onSuccess?.(attempt);
        
        if (attempt > 1) {
          this.logger.info(`Success on attempt ${attempt}`, {
            totalAttempts: attempt,
            totalDuration: Date.now() - startTime
          });
        }
        
        return result;
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const attemptDuration = Date.now() - attemptStart;
        
        // Record failed attempt
        retryHistory.push({
          attempt,
          timestamp: attemptStart,
          duration: attemptDuration,
          error: lastError.message,
          success: false
        });

        this.logger.warn(`Attempt ${attempt} failed`, {
          error: lastError.message,
          duration: attemptDuration
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError, finalConfig.retryableErrors)) {
          this.logger.info('Error is not retryable, throwing immediately');
          finalConfig.onFailure?.(attempt, lastError);
          throw lastError;
        }

        // Call retry callback
        finalConfig.onRetry?.(attempt, lastError);

        // Don't wait after the last attempt
        if (attempt < finalConfig.maxAttempts) {
          const delay = this.calculateDelay(
            attempt,
            finalConfig.initialDelayMs,
            finalConfig.maxDelayMs,
            finalConfig.backoffMultiplier,
            finalConfig.jitterEnabled
          );
          
          this.logger.debug(`Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    // All attempts failed
    const totalDuration = Date.now() - startTime;
    this.logger.error(`All ${finalConfig.maxAttempts} attempts failed`, lastError, {
      totalDuration,
      finalError: lastError?.message
    });

    finalConfig.onFailure?.(finalConfig.maxAttempts, lastError!);
    throw lastError || new Error('All retry attempts failed');
  }

  /**
   * Execute function with retry and return result object instead of throwing
   */
  async executeWithRetrySafe<T>(
    fn: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    
    try {
      const result = await this.executeWithRetry(fn, config);
      return {
        success: true,
        result,
        attempts: 1, // Will be updated by the actual implementation
        totalDuration: Date.now() - startTime,
        retryHistory: []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: config?.maxAttempts || this.defaultConfig.maxAttempts,
        totalDuration: Date.now() - startTime,
        retryHistory: []
      };
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error, retryableErrors: string[]): boolean {
    const errorMessage = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Check against retryable error patterns
    const isRetryable = retryableErrors.some(
      (retryableError) =>
        errorMessage.includes(retryableError.toLowerCase()) ||
        errorName.includes(retryableError.toLowerCase())
    );

    // Use user-friendly error service to check if error is retryable
    const userFriendlyRetryable = userFriendlyErrorService.isRetryable(error);

    return isRetryable || userFriendlyRetryable;
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   */
  private calculateDelay(
    attempt: number,
    initialDelayMs: number,
    maxDelayMs: number,
    backoffMultiplier: number,
    jitterEnabled: boolean
  ): number {
    // Calculate exponential backoff
    let delay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, maxDelayMs);
    
    // Add jitter to prevent thundering herd
    if (jitterEnabled) {
      const jitter = delay * 0.1 * Math.random(); // Up to 10% jitter
      delay += jitter;
    }
    
    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Create a retryable version of a function
   */
  makeRetryable<TArgs extends any[], TResult>(
    fn: (...args: TArgs) => Promise<TResult>,
    config?: Partial<RetryConfig>
  ): (...args: TArgs) => Promise<TResult> {
    return async (...args: TArgs): Promise<TResult> => {
      return this.executeWithRetry(() => fn(...args), config);
    };
  }

  /**
   * Retry with custom condition
   */
  async retryUntil<T>(
    fn: () => Promise<T>,
    condition: (result: T) => boolean,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    return this.executeWithRetry(async () => {
      const result = await fn();
      if (!condition(result)) {
        throw new Error('Condition not met, retrying...');
      }
      return result;
    }, finalConfig);
  }

  /**
   * Batch retry for multiple operations
   */
  async retryBatch<T>(
    operations: (() => Promise<T>)[],
    config?: Partial<RetryConfig>
  ): Promise<RetryResult<T>[]> {
    const results: RetryResult<T>[] = [];
    
    for (const operation of operations) {
      const result = await this.executeWithRetrySafe(operation, config);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Get retry statistics
   */
  getRetryStats(retryHistory: RetryAttempt[]): {
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    averageDuration: number;
    totalDuration: number;
  } {
    const totalAttempts = retryHistory.length;
    const successfulAttempts = retryHistory.filter(a => a.success).length;
    const failedAttempts = totalAttempts - successfulAttempts;
    const totalDuration = retryHistory.reduce((sum, a) => sum + a.duration, 0);
    const averageDuration = totalAttempts > 0 ? totalDuration / totalAttempts : 0;

    return {
      totalAttempts,
      successfulAttempts,
      failedAttempts,
      averageDuration,
      totalDuration
    };
  }
}

// Global enhanced retry service instance
export const enhancedRetryService = new EnhancedRetryService();