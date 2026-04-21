"use strict";
/**
 * Enhanced Retry Service
 * Advanced retry mechanisms with exponential backoff, jitter, and intelligent retry logic
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enhancedRetryService = exports.EnhancedRetryService = void 0;
const logger_1 = require("../../utils/logger");
const user_friendly_errors_1 = require("./user-friendly-errors");
/**
 * Enhanced retry service with intelligent retry logic
 */
class EnhancedRetryService {
    logger;
    defaultConfig = {
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
        this.logger = (0, logger_1.createLogger)('EnhancedRetryService');
    }
    /**
     * Execute function with enhanced retry logic
     */
    async executeWithRetry(fn, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const startTime = Date.now();
        const retryHistory = [];
        let lastError;
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
            }
            catch (error) {
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
                    const delay = this.calculateDelay(attempt, finalConfig.initialDelayMs, finalConfig.maxDelayMs, finalConfig.backoffMultiplier, finalConfig.jitterEnabled);
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
        finalConfig.onFailure?.(finalConfig.maxAttempts, lastError);
        throw lastError || new Error('All retry attempts failed');
    }
    /**
     * Execute function with retry and return result object instead of throwing
     */
    async executeWithRetrySafe(fn, config) {
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
        }
        catch (error) {
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
    async executeWithTimeout(fn, timeoutMs) {
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
    isRetryableError(error, retryableErrors) {
        const errorMessage = error.message.toLowerCase();
        const errorName = error.name.toLowerCase();
        // Check against retryable error patterns
        const isRetryable = retryableErrors.some((retryableError) => errorMessage.includes(retryableError.toLowerCase()) ||
            errorName.includes(retryableError.toLowerCase()));
        // Use user-friendly error service to check if error is retryable
        const userFriendlyRetryable = user_friendly_errors_1.userFriendlyErrorService.isRetryable(error);
        return isRetryable || userFriendlyRetryable;
    }
    /**
     * Calculate delay with exponential backoff and optional jitter
     */
    calculateDelay(attempt, initialDelayMs, maxDelayMs, backoffMultiplier, jitterEnabled) {
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
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    /**
     * Create a retryable version of a function
     */
    makeRetryable(fn, config) {
        return async (...args) => {
            return this.executeWithRetry(() => fn(...args), config);
        };
    }
    /**
     * Retry with custom condition
     */
    async retryUntil(fn, condition, config) {
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
    async retryBatch(operations, config) {
        const results = [];
        for (const operation of operations) {
            const result = await this.executeWithRetrySafe(operation, config);
            results.push(result);
        }
        return results;
    }
    /**
     * Get retry statistics
     */
    getRetryStats(retryHistory) {
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
exports.EnhancedRetryService = EnhancedRetryService;
// Global enhanced retry service instance
exports.enhancedRetryService = new EnhancedRetryService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5oYW5jZWQtcmV0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbmhhbmNlZC1yZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwrQ0FBMEQ7QUFDMUQsaUVBQWtFO0FBZ0NsRTs7R0FFRztBQUNILE1BQWEsb0JBQW9CO0lBQ3ZCLE1BQU0sQ0FBUztJQUNmLGFBQWEsR0FBZ0I7UUFDbkMsV0FBVyxFQUFFLENBQUM7UUFDZCxjQUFjLEVBQUUsSUFBSTtRQUNwQixVQUFVLEVBQUUsS0FBSztRQUNqQixpQkFBaUIsRUFBRSxDQUFDO1FBQ3BCLGFBQWEsRUFBRSxJQUFJO1FBQ25CLGVBQWUsRUFBRTtZQUNmLFNBQVM7WUFDVCxXQUFXO1lBQ1gsWUFBWTtZQUNaLGNBQWM7WUFDZCxXQUFXO1lBQ1gsU0FBUztZQUNULGNBQWM7WUFDZCxjQUFjO1lBQ2QscUJBQXFCO1lBQ3JCLHFCQUFxQjtZQUNyQixnQkFBZ0I7WUFDaEIsd0JBQXdCO1NBQ3pCO0tBQ0YsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZ0JBQWdCLENBQ3BCLEVBQW9CLEVBQ3BCLE1BQTZCO1FBRTdCLE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFtQixFQUFFLENBQUM7UUFDeEMsSUFBSSxTQUE0QixDQUFDO1FBRWpDLEtBQUssSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDcEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFD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YUFBYSxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUM7UUFDMUMsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN0RSxNQUFNLGNBQWMsR0FBRyxhQUFhLEdBQUcsa0JBQWtCLENBQUM7UUFDMUQsTUFBTSxhQUFhLEdBQUcsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzNFLE1BQU0sZUFBZSxHQUFHLGFBQWEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUU5RSxPQUFPO1lBQ0wsYUFBYTtZQUNiLGtCQUFrQjtZQUNsQixjQUFjO1lBQ2QsZUFBZTtZQUNmLGFBQWE7U0FDZCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBalRELG9EQWlUQztBQUVELHlDQUF5QztBQUM1QixRQUFBLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBFbmhhbmNlZCBSZXRyeSBTZXJ2aWNlXHJcbiAqIEFkdmFuY2VkIHJldHJ5IG1lY2hhbmlzbXMgd2l0aCBleHBvbmVudGlhbCBiYWNrb2ZmLCBqaXR0ZXIsIGFuZCBpbnRlbGxpZ2VudCByZXRyeSBsb2dpY1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IExvZ2dlciwgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuaW1wb3J0IHsgdXNlckZyaWVuZGx5RXJyb3JTZXJ2aWNlIH0gZnJvbSAnLi91c2VyLWZyaWVuZGx5LWVycm9ycyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHJ5Q29uZmlnIHtcclxuICBtYXhBdHRlbXB0czogbnVtYmVyO1xyXG4gIGluaXRpYWxEZWxheU1zOiBudW1iZXI7XHJcbiAgbWF4RGVsYXlNczogbnVtYmVyO1xyXG4gIGJhY2tvZmZNdWx0aXBsaWVyOiBudW1iZXI7XHJcbiAgaml0dGVyRW5hYmxlZDogYm9vbGVhbjtcclxuICByZXRyeWFibGVFcnJvcnM6IHN0cmluZ1tdO1xyXG4gIHRpbWVvdXRNcz86IG51bWJlcjtcclxuICBvblJldHJ5PzogKGF0dGVtcHQ6IG51bWJlciwgZXJyb3I6IEVycm9yKSA9PiB2b2lkO1xyXG4gIG9uU3VjY2Vzcz86IChhdHRlbXB0OiBudW1iZXIpID0+IHZvaWQ7XHJcbiAgb25GYWlsdXJlPzogKGF0dGVtcHRzOiBudW1iZXIsIGZpbmFsRXJyb3I6IEVycm9yKSA9PiB2b2lkO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHJ5UmVzdWx0PFQ+IHtcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG4gIHJlc3VsdD86IFQ7XHJcbiAgZXJyb3I/OiBFcnJvcjtcclxuICBhdHRlbXB0czogbnVtYmVyO1xyXG4gIHRvdGFsRHVyYXRpb246IG51bWJlcjtcclxuICByZXRyeUhpc3Rvcnk6IFJldHJ5QXR0ZW1wdFtdO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJldHJ5QXR0ZW1wdCB7XHJcbiAgYXR0ZW1wdDogbnVtYmVyO1xyXG4gIHRpbWVzdGFtcDogbnVtYmVyO1xyXG4gIGR1cmF0aW9uOiBudW1iZXI7XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbiAgc3VjY2VzczogYm9vbGVhbjtcclxufVxyXG5cclxuLyoqXHJcbiAqIEVuaGFuY2VkIHJldHJ5IHNlcnZpY2Ugd2l0aCBpbnRlbGxpZ2VudCByZXRyeSBsb2dpY1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEVuaGFuY2VkUmV0cnlTZXJ2aWNlIHtcclxuICBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyO1xyXG4gIHByaXZhdGUgZGVmYXVsdENvbmZpZzogUmV0cnlDb25maWcgPSB7XHJcbiAgICBtYXhBdHRlbXB0czogMyxcclxuICAgIGluaXRpYWxEZWxheU1zOiAxMDAwLFxyXG4gICAgbWF4RGVsYXlNczogMzAwMDAsXHJcbiAgICBiYWNrb2ZmTXVsdGlwbGllcjogMixcclxuICAgIGppdHRlckVuYWJsZWQ6IHRydWUsXHJcbiAgICByZXRyeWFibGVFcnJvcnM6IFtcclxuICAgICAgJ3RpbWVvdXQnLFxyXG4gICAgICAnRVRJTUVET1VUJyxcclxuICAgICAgJ0VDT05OUkVTRVQnLFxyXG4gICAgICAnRUNPTk5SRUZVU0VEJyxcclxuICAgICAgJ0VOT1RGT1VORCcsXHJcbiAgICAgICduZXR3b3JrJyxcclxuICAgICAgJ05ldHdvcmtFcnJvcicsXHJcbiAgICAgICdUaW1lb3V0RXJyb3InLFxyXG4gICAgICAnU0VSVklDRV9VTkFWQUlMQUJMRScsXHJcbiAgICAgICdSQVRFX0xJTUlUX0VYQ0VFREVEJyxcclxuICAgICAgJ0RBVEFCQVNFX0VSUk9SJyxcclxuICAgICAgJ0VYVEVSTkFMX1NFUlZJQ0VfRVJST1InXHJcbiAgICBdXHJcbiAgfTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignRW5oYW5jZWRSZXRyeVNlcnZpY2UnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aCBlbmhhbmNlZCByZXRyeSBsb2dpY1xyXG4gICAqL1xyXG4gIGFzeW5jIGV4ZWN1dGVXaXRoUmV0cnk8VD4oXHJcbiAgICBmbjogKCkgPT4gUHJvbWlzZTxUPixcclxuICAgIGNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+XHJcbiAgKTogUHJvbWlzZTxUPiB7XHJcbiAgICBjb25zdCBmaW5hbENvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0Q29uZmlnLCAuLi5jb25maWcgfTtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCByZXRyeUhpc3Rvcnk6IFJldHJ5QXR0ZW1wdFtdID0gW107XHJcbiAgICBsZXQgbGFzdEVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICBmb3IgKGxldCBhdHRlbXB0ID0gMTsgYXR0ZW1wdCA8PSBmaW5hbENvbmZpZy5tYXhBdHRlbXB0czsgYXR0ZW1wdCsrKSB7XHJcbiAgICAgIGNvbnN0IGF0dGVtcHRTdGFydCA9IERhdGUubm93KCk7XHJcbiAgICAgIFxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBBdHRlbXB0ICR7YXR0ZW1wdH0vJHtmaW5hbENvbmZpZy5tYXhBdHRlbXB0c31gKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBFeGVjdXRlIHdpdGggdGltZW91dCBpZiBzcGVjaWZpZWRcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBmaW5hbENvbmZpZy50aW1lb3V0TXMgXHJcbiAgICAgICAgICA/IGF3YWl0IHRoaXMuZXhlY3V0ZVdpdGhUaW1lb3V0KGZuLCBmaW5hbENvbmZpZy50aW1lb3V0TXMpXHJcbiAgICAgICAgICA6IGF3YWl0IGZuKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgYXR0ZW1wdER1cmF0aW9uID0gRGF0ZS5ub3coKSAtIGF0dGVtcHRTdGFydDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBSZWNvcmQgc3VjY2Vzc2Z1bCBhdHRlbXB0XHJcbiAgICAgICAgcmV0cnlIaXN0b3J5LnB1c2goe1xyXG4gICAgICAgICAgYXR0ZW1wdCxcclxuICAgICAgICAgIHRpbWVzdGFtcDogYXR0ZW1wdFN0YXJ0LFxyXG4gICAgICAgICAgZHVyYXRpb246IGF0dGVtcHREdXJhdGlvbixcclxuICAgICAgICAgIHN1Y2Nlc3M6IHRydWVcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQ2FsbCBzdWNjZXNzIGNhbGxiYWNrXHJcbiAgICAgICAgZmluYWxDb25maWcub25TdWNjZXNzPy4oYXR0ZW1wdCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGF0dGVtcHQgPiAxKSB7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGBTdWNjZXNzIG9uIGF0dGVtcHQgJHthdHRlbXB0fWAsIHtcclxuICAgICAgICAgICAgdG90YWxBdHRlbXB0czogYXR0ZW1wdCxcclxuICAgICAgICAgICAgdG90YWxEdXJhdGlvbjogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgXHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgbGFzdEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xyXG4gICAgICAgIGNvbnN0IGF0dGVtcHREdXJhdGlvbiA9IERhdGUubm93KCkgLSBhdHRlbXB0U3RhcnQ7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gUmVjb3JkIGZhaWxlZCBhdHRlbXB0XHJcbiAgICAgICAgcmV0cnlIaXN0b3J5LnB1c2goe1xyXG4gICAgICAgICAgYXR0ZW1wdCxcclxuICAgICAgICAgIHRpbWVzdGFtcDogYXR0ZW1wdFN0YXJ0LFxyXG4gICAgICAgICAgZHVyYXRpb246IGF0dGVtcHREdXJhdGlvbixcclxuICAgICAgICAgIGVycm9yOiBsYXN0RXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIHRoaXMubG9nZ2VyLndhcm4oYEF0dGVtcHQgJHthdHRlbXB0fSBmYWlsZWRgLCB7XHJcbiAgICAgICAgICBlcnJvcjogbGFzdEVycm9yLm1lc3NhZ2UsXHJcbiAgICAgICAgICBkdXJhdGlvbjogYXR0ZW1wdER1cmF0aW9uXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIENoZWNrIGlmIGVycm9yIGlzIHJldHJ5YWJsZVxyXG4gICAgICAgIGlmICghdGhpcy5pc1JldHJ5YWJsZUVycm9yKGxhc3RFcnJvciwgZmluYWxDb25maWcucmV0cnlhYmxlRXJyb3JzKSkge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbygnRXJyb3IgaXMgbm90IHJldHJ5YWJsZSwgdGhyb3dpbmcgaW1tZWRpYXRlbHknKTtcclxuICAgICAgICAgIGZpbmFsQ29uZmlnLm9uRmFpbHVyZT8uKGF0dGVtcHQsIGxhc3RFcnJvcik7XHJcbiAgICAgICAgICB0aHJvdyBsYXN0RXJyb3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBDYWxsIHJldHJ5IGNhbGxiYWNrXHJcbiAgICAgICAgZmluYWxDb25maWcub25SZXRyeT8uKGF0dGVtcHQsIGxhc3RFcnJvcik7XHJcblxyXG4gICAgICAgIC8vIERvbid0IHdhaXQgYWZ0ZXIgdGhlIGxhc3QgYXR0ZW1wdFxyXG4gICAgICAgIGlmIChhdHRlbXB0IDwgZmluYWxDb25maWcubWF4QXR0ZW1wdHMpIHtcclxuICAgICAgICAgIGNvbnN0IGRlbGF5ID0gdGhpcy5jYWxjdWxhdGVEZWxheShcclxuICAgICAgICAgICAgYXR0ZW1wdCxcclxuICAgICAgICAgICAgZmluYWxDb25maWcuaW5pdGlhbERlbGF5TXMsXHJcbiAgICAgICAgICAgIGZpbmFsQ29uZmlnLm1heERlbGF5TXMsXHJcbiAgICAgICAgICAgIGZpbmFsQ29uZmlnLmJhY2tvZmZNdWx0aXBsaWVyLFxyXG4gICAgICAgICAgICBmaW5hbENvbmZpZy5qaXR0ZXJFbmFibGVkXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5kZWJ1ZyhgV2FpdGluZyAke2RlbGF5fW1zIGJlZm9yZSByZXRyeS4uLmApO1xyXG4gICAgICAgICAgYXdhaXQgdGhpcy5zbGVlcChkZWxheSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWxsIGF0dGVtcHRzIGZhaWxlZFxyXG4gICAgY29uc3QgdG90YWxEdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICB0aGlzLmxvZ2dlci5lcnJvcihgQWxsICR7ZmluYWxDb25maWcubWF4QXR0ZW1wdHN9IGF0dGVtcHRzIGZhaWxlZGAsIGxhc3RFcnJvciwge1xyXG4gICAgICB0b3RhbER1cmF0aW9uLFxyXG4gICAgICBmaW5hbEVycm9yOiBsYXN0RXJyb3I/Lm1lc3NhZ2VcclxuICAgIH0pO1xyXG5cclxuICAgIGZpbmFsQ29uZmlnLm9uRmFpbHVyZT8uKGZpbmFsQ29uZmlnLm1heEF0dGVtcHRzLCBsYXN0RXJyb3IhKTtcclxuICAgIHRocm93IGxhc3RFcnJvciB8fCBuZXcgRXJyb3IoJ0FsbCByZXRyeSBhdHRlbXB0cyBmYWlsZWQnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aCByZXRyeSBhbmQgcmV0dXJuIHJlc3VsdCBvYmplY3QgaW5zdGVhZCBvZiB0aHJvd2luZ1xyXG4gICAqL1xyXG4gIGFzeW5jIGV4ZWN1dGVXaXRoUmV0cnlTYWZlPFQ+KFxyXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPlxyXG4gICk6IFByb21pc2U8UmV0cnlSZXN1bHQ8VD4+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVdpdGhSZXRyeShmbiwgY29uZmlnKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIHJlc3VsdCxcclxuICAgICAgICBhdHRlbXB0czogMSwgLy8gV2lsbCBiZSB1cGRhdGVkIGJ5IHRoZSBhY3R1YWwgaW1wbGVtZW50YXRpb25cclxuICAgICAgICB0b3RhbER1cmF0aW9uOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgIHJldHJ5SGlzdG9yeTogW11cclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKSxcclxuICAgICAgICBhdHRlbXB0czogY29uZmlnPy5tYXhBdHRlbXB0cyB8fCB0aGlzLmRlZmF1bHRDb25maWcubWF4QXR0ZW1wdHMsXHJcbiAgICAgICAgdG90YWxEdXJhdGlvbjogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgICByZXRyeUhpc3Rvcnk6IFtdXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFeGVjdXRlIHdpdGggdGltZW91dFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVdpdGhUaW1lb3V0PFQ+KFxyXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICB0aW1lb3V0TXM6IG51bWJlclxyXG4gICk6IFByb21pc2U8VD4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgT3BlcmF0aW9uIHRpbWVkIG91dCBhZnRlciAke3RpbWVvdXRNc31tc2ApKTtcclxuICAgICAgfSwgdGltZW91dE1zKTtcclxuXHJcbiAgICAgIGZuKClcclxuICAgICAgICAudGhlbihyZXN1bHQgPT4ge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBhbiBlcnJvciBpcyByZXRyeWFibGVcclxuICAgKi9cclxuICBwcml2YXRlIGlzUmV0cnlhYmxlRXJyb3IoZXJyb3I6IEVycm9yLCByZXRyeWFibGVFcnJvcnM6IHN0cmluZ1tdKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBjb25zdCBlcnJvck5hbWUgPSBlcnJvci5uYW1lLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgLy8gQ2hlY2sgYWdhaW5zdCByZXRyeWFibGUgZXJyb3IgcGF0dGVybnNcclxuICAgIGNvbnN0IGlzUmV0cnlhYmxlID0gcmV0cnlhYmxlRXJyb3JzLnNvbWUoXHJcbiAgICAgIChyZXRyeWFibGVFcnJvcikgPT5cclxuICAgICAgICBlcnJvck1lc3NhZ2UuaW5jbHVkZXMocmV0cnlhYmxlRXJyb3IudG9Mb3dlckNhc2UoKSkgfHxcclxuICAgICAgICBlcnJvck5hbWUuaW5jbHVkZXMocmV0cnlhYmxlRXJyb3IudG9Mb3dlckNhc2UoKSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gVXNlIHVzZXItZnJpZW5kbHkgZXJyb3Igc2VydmljZSB0byBjaGVjayBpZiBlcnJvciBpcyByZXRyeWFibGVcclxuICAgIGNvbnN0IHVzZXJGcmllbmRseVJldHJ5YWJsZSA9IHVzZXJGcmllbmRseUVycm9yU2VydmljZS5pc1JldHJ5YWJsZShlcnJvcik7XHJcblxyXG4gICAgcmV0dXJuIGlzUmV0cnlhYmxlIHx8IHVzZXJGcmllbmRseVJldHJ5YWJsZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBkZWxheSB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmYgYW5kIG9wdGlvbmFsIGppdHRlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlRGVsYXkoXHJcbiAgICBhdHRlbXB0OiBudW1iZXIsXHJcbiAgICBpbml0aWFsRGVsYXlNczogbnVtYmVyLFxyXG4gICAgbWF4RGVsYXlNczogbnVtYmVyLFxyXG4gICAgYmFja29mZk11bHRpcGxpZXI6IG51bWJlcixcclxuICAgIGppdHRlckVuYWJsZWQ6IGJvb2xlYW5cclxuICApOiBudW1iZXIge1xyXG4gICAgLy8gQ2FsY3VsYXRlIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICAgIGxldCBkZWxheSA9IGluaXRpYWxEZWxheU1zICogTWF0aC5wb3coYmFja29mZk11bHRpcGxpZXIsIGF0dGVtcHQgLSAxKTtcclxuICAgIFxyXG4gICAgLy8gQXBwbHkgbWF4aW11bSBkZWxheSBsaW1pdFxyXG4gICAgZGVsYXkgPSBNYXRoLm1pbihkZWxheSwgbWF4RGVsYXlNcyk7XHJcbiAgICBcclxuICAgIC8vIEFkZCBqaXR0ZXIgdG8gcHJldmVudCB0aHVuZGVyaW5nIGhlcmRcclxuICAgIGlmIChqaXR0ZXJFbmFibGVkKSB7XHJcbiAgICAgIGNvbnN0IGppdHRlciA9IGRlbGF5ICogMC4xICogTWF0aC5yYW5kb20oKTsgLy8gVXAgdG8gMTAlIGppdHRlclxyXG4gICAgICBkZWxheSArPSBqaXR0ZXI7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBNYXRoLmZsb29yKGRlbGF5KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNsZWVwIGZvciBzcGVjaWZpZWQgbWlsbGlzZWNvbmRzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIHJldHJ5YWJsZSB2ZXJzaW9uIG9mIGEgZnVuY3Rpb25cclxuICAgKi9cclxuICBtYWtlUmV0cnlhYmxlPFRBcmdzIGV4dGVuZHMgYW55W10sIFRSZXN1bHQ+KFxyXG4gICAgZm46ICguLi5hcmdzOiBUQXJncykgPT4gUHJvbWlzZTxUUmVzdWx0PixcclxuICAgIGNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+XHJcbiAgKTogKC4uLmFyZ3M6IFRBcmdzKSA9PiBQcm9taXNlPFRSZXN1bHQ+IHtcclxuICAgIHJldHVybiBhc3luYyAoLi4uYXJnczogVEFyZ3MpOiBQcm9taXNlPFRSZXN1bHQ+ID0+IHtcclxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVdpdGhSZXRyeSgoKSA9PiBmbiguLi5hcmdzKSwgY29uZmlnKTtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXRyeSB3aXRoIGN1c3RvbSBjb25kaXRpb25cclxuICAgKi9cclxuICBhc3luYyByZXRyeVVudGlsPFQ+KFxyXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBjb25kaXRpb246IChyZXN1bHQ6IFQpID0+IGJvb2xlYW4sXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPlxyXG4gICk6IFByb21pc2U8VD4ge1xyXG4gICAgY29uc3QgZmluYWxDb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdENvbmZpZywgLi4uY29uZmlnIH07XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmbigpO1xyXG4gICAgICBpZiAoIWNvbmRpdGlvbihyZXN1bHQpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbm90IG1ldCwgcmV0cnlpbmcuLi4nKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSwgZmluYWxDb25maWcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQmF0Y2ggcmV0cnkgZm9yIG11bHRpcGxlIG9wZXJhdGlvbnNcclxuICAgKi9cclxuICBhc3luYyByZXRyeUJhdGNoPFQ+KFxyXG4gICAgb3BlcmF0aW9uczogKCgpID0+IFByb21pc2U8VD4pW10sXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPlxyXG4gICk6IFByb21pc2U8UmV0cnlSZXN1bHQ8VD5bXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogUmV0cnlSZXN1bHQ8VD5bXSA9IFtdO1xyXG4gICAgXHJcbiAgICBmb3IgKGNvbnN0IG9wZXJhdGlvbiBvZiBvcGVyYXRpb25zKSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVdpdGhSZXRyeVNhZmUob3BlcmF0aW9uLCBjb25maWcpO1xyXG4gICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgcmV0cnkgc3RhdGlzdGljc1xyXG4gICAqL1xyXG4gIGdldFJldHJ5U3RhdHMocmV0cnlIaXN0b3J5OiBSZXRyeUF0dGVtcHRbXSk6IHtcclxuICAgIHRvdGFsQXR0ZW1wdHM6IG51bWJlcjtcclxuICAgIHN1Y2Nlc3NmdWxBdHRlbXB0czogbnVtYmVyO1xyXG4gICAgZmFpbGVkQXR0ZW1wdHM6IG51bWJlcjtcclxuICAgIGF2ZXJhZ2VEdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgdG90YWxEdXJhdGlvbjogbnVtYmVyO1xyXG4gIH0ge1xyXG4gICAgY29uc3QgdG90YWxBdHRlbXB0cyA9IHJldHJ5SGlzdG9yeS5sZW5ndGg7XHJcbiAgICBjb25zdCBzdWNjZXNzZnVsQXR0ZW1wdHMgPSByZXRyeUhpc3RvcnkuZmlsdGVyKGEgPT4gYS5zdWNjZXNzKS5sZW5ndGg7XHJcbiAgICBjb25zdCBmYWlsZWRBdHRlbXB0cyA9IHRvdGFsQXR0ZW1wdHMgLSBzdWNjZXNzZnVsQXR0ZW1wdHM7XHJcbiAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gcmV0cnlIaXN0b3J5LnJlZHVjZSgoc3VtLCBhKSA9PiBzdW0gKyBhLmR1cmF0aW9uLCAwKTtcclxuICAgIGNvbnN0IGF2ZXJhZ2VEdXJhdGlvbiA9IHRvdGFsQXR0ZW1wdHMgPiAwID8gdG90YWxEdXJhdGlvbiAvIHRvdGFsQXR0ZW1wdHMgOiAwO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRvdGFsQXR0ZW1wdHMsXHJcbiAgICAgIHN1Y2Nlc3NmdWxBdHRlbXB0cyxcclxuICAgICAgZmFpbGVkQXR0ZW1wdHMsXHJcbiAgICAgIGF2ZXJhZ2VEdXJhdGlvbixcclxuICAgICAgdG90YWxEdXJhdGlvblxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEdsb2JhbCBlbmhhbmNlZCByZXRyeSBzZXJ2aWNlIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBlbmhhbmNlZFJldHJ5U2VydmljZSA9IG5ldyBFbmhhbmNlZFJldHJ5U2VydmljZSgpOyJdfQ==