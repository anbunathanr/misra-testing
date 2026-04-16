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
        this.logger.error(`All ${finalConfig.maxAttempts} attempts failed`, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5oYW5jZWQtcmV0cnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlbmhhbmNlZC1yZXRyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwrQ0FBMEQ7QUFDMUQsaUVBQWtFO0FBZ0NsRTs7R0FFRztBQUNILE1BQWEsb0JBQW9CO0lBQ3ZCLE1BQU0sQ0FBUztJQUNmLGFBQWEsR0FBZ0I7UUFDbkMsV0FBVyxFQUFFLENBQUM7UUFDZCxjQUFjLEVBQUUsSUFBSTtRQUNwQixVQUFVLEVBQUUsS0FBSztRQUNqQixpQkFBaUIsRUFBRSxDQUFDO1FBQ3BCLGFBQWEsRUFBRSxJQUFJO1FBQ25CLGVBQWUsRUFBRTtZQUNmLFNBQVM7WUFDVCxXQUFXO1lBQ1gsWUFBWTtZQUNaLGNBQWM7WUFDZCxXQUFXO1lBQ1gsU0FBUztZQUNULGNBQWM7WUFDZCxjQUFjO1lBQ2QscUJBQXFCO1lBQ3JCLHFCQUFxQjtZQUNyQixnQkFBZ0I7WUFDaEIsd0JBQXdCO1NBQ3pCO0tBQ0YsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsc0JBQXNCLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZ0JBQWdCLENBQ3BCLEVBQW9CLEVBQ3BCLE1BQTZCO1FBRTdCLE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsTUFBTSxFQUFFLENBQUM7UUFDekQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLE1BQU0sWUFBWSxHQUFtQixFQUFFLENBQUM7UUFDeEMsSUFBSSxTQUE0QixDQUFDO1FBRWpDLEtBQUssSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxXQUFXLENBQUMsV0FBVyxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDcEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFD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WUFBWSxDQUFDLE1BQU0sQ0FBQztRQUMxQyxNQUFNLGtCQUFrQixHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3RFLE1BQU0sY0FBYyxHQUFHLGFBQWEsR0FBRyxrQkFBa0IsQ0FBQztRQUMxRCxNQUFNLGFBQWEsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDM0UsTUFBTSxlQUFlLEdBQUcsYUFBYSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTlFLE9BQU87WUFDTCxhQUFhO1lBQ2Isa0JBQWtCO1lBQ2xCLGNBQWM7WUFDZCxlQUFlO1lBQ2YsYUFBYTtTQUNkLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFqVEQsb0RBaVRDO0FBRUQseUNBQXlDO0FBQzVCLFFBQUEsb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVuaGFuY2VkIFJldHJ5IFNlcnZpY2VcclxuICogQWR2YW5jZWQgcmV0cnkgbWVjaGFuaXNtcyB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmYsIGppdHRlciwgYW5kIGludGVsbGlnZW50IHJldHJ5IGxvZ2ljXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTG9nZ2VyLCBjcmVhdGVMb2dnZXIgfSBmcm9tICcuLi8uLi91dGlscy9sb2dnZXInO1xyXG5pbXBvcnQgeyB1c2VyRnJpZW5kbHlFcnJvclNlcnZpY2UgfSBmcm9tICcuL3VzZXItZnJpZW5kbHktZXJyb3JzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlDb25maWcge1xyXG4gIG1heEF0dGVtcHRzOiBudW1iZXI7XHJcbiAgaW5pdGlhbERlbGF5TXM6IG51bWJlcjtcclxuICBtYXhEZWxheU1zOiBudW1iZXI7XHJcbiAgYmFja29mZk11bHRpcGxpZXI6IG51bWJlcjtcclxuICBqaXR0ZXJFbmFibGVkOiBib29sZWFuO1xyXG4gIHJldHJ5YWJsZUVycm9yczogc3RyaW5nW107XHJcbiAgdGltZW91dE1zPzogbnVtYmVyO1xyXG4gIG9uUmV0cnk/OiAoYXR0ZW1wdDogbnVtYmVyLCBlcnJvcjogRXJyb3IpID0+IHZvaWQ7XHJcbiAgb25TdWNjZXNzPzogKGF0dGVtcHQ6IG51bWJlcikgPT4gdm9pZDtcclxuICBvbkZhaWx1cmU/OiAoYXR0ZW1wdHM6IG51bWJlciwgZmluYWxFcnJvcjogRXJyb3IpID0+IHZvaWQ7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlSZXN1bHQ8VD4ge1xyXG4gIHN1Y2Nlc3M6IGJvb2xlYW47XHJcbiAgcmVzdWx0PzogVDtcclxuICBlcnJvcj86IEVycm9yO1xyXG4gIGF0dGVtcHRzOiBudW1iZXI7XHJcbiAgdG90YWxEdXJhdGlvbjogbnVtYmVyO1xyXG4gIHJldHJ5SGlzdG9yeTogUmV0cnlBdHRlbXB0W107XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUmV0cnlBdHRlbXB0IHtcclxuICBhdHRlbXB0OiBudW1iZXI7XHJcbiAgdGltZXN0YW1wOiBudW1iZXI7XHJcbiAgZHVyYXRpb246IG51bWJlcjtcclxuICBlcnJvcj86IHN0cmluZztcclxuICBzdWNjZXNzOiBib29sZWFuO1xyXG59XHJcblxyXG4vKipcclxuICogRW5oYW5jZWQgcmV0cnkgc2VydmljZSB3aXRoIGludGVsbGlnZW50IHJldHJ5IGxvZ2ljXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRW5oYW5jZWRSZXRyeVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXI7XHJcbiAgcHJpdmF0ZSBkZWZhdWx0Q29uZmlnOiBSZXRyeUNvbmZpZyA9IHtcclxuICAgIG1heEF0dGVtcHRzOiAzLFxyXG4gICAgaW5pdGlhbERlbGF5TXM6IDEwMDAsXHJcbiAgICBtYXhEZWxheU1zOiAzMDAwMCxcclxuICAgIGJhY2tvZmZNdWx0aXBsaWVyOiAyLFxyXG4gICAgaml0dGVyRW5hYmxlZDogdHJ1ZSxcclxuICAgIHJldHJ5YWJsZUVycm9yczogW1xyXG4gICAgICAndGltZW91dCcsXHJcbiAgICAgICdFVElNRURPVVQnLFxyXG4gICAgICAnRUNPTk5SRVNFVCcsXHJcbiAgICAgICdFQ09OTlJFRlVTRUQnLFxyXG4gICAgICAnRU5PVEZPVU5EJyxcclxuICAgICAgJ25ldHdvcmsnLFxyXG4gICAgICAnTmV0d29ya0Vycm9yJyxcclxuICAgICAgJ1RpbWVvdXRFcnJvcicsXHJcbiAgICAgICdTRVJWSUNFX1VOQVZBSUxBQkxFJyxcclxuICAgICAgJ1JBVEVfTElNSVRfRVhDRUVERUQnLFxyXG4gICAgICAnREFUQUJBU0VfRVJST1InLFxyXG4gICAgICAnRVhURVJOQUxfU0VSVklDRV9FUlJPUidcclxuICAgIF1cclxuICB9O1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMubG9nZ2VyID0gY3JlYXRlTG9nZ2VyKCdFbmhhbmNlZFJldHJ5U2VydmljZScpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBmdW5jdGlvbiB3aXRoIGVuaGFuY2VkIHJldHJ5IGxvZ2ljXHJcbiAgICovXHJcbiAgYXN5bmMgZXhlY3V0ZVdpdGhSZXRyeTxUPihcclxuICAgIGZuOiAoKSA9PiBQcm9taXNlPFQ+LFxyXG4gICAgY29uZmlnPzogUGFydGlhbDxSZXRyeUNvbmZpZz5cclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IGZpbmFsQ29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRDb25maWcsIC4uLmNvbmZpZyB9O1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IHJldHJ5SGlzdG9yeTogUmV0cnlBdHRlbXB0W10gPSBbXTtcclxuICAgIGxldCBsYXN0RXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xyXG5cclxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAxOyBhdHRlbXB0IDw9IGZpbmFsQ29uZmlnLm1heEF0dGVtcHRzOyBhdHRlbXB0KyspIHtcclxuICAgICAgY29uc3QgYXR0ZW1wdFN0YXJ0ID0gRGF0ZS5ub3coKTtcclxuICAgICAgXHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgdGhpcy5sb2dnZXIuZGVidWcoYEF0dGVtcHQgJHthdHRlbXB0fS8ke2ZpbmFsQ29uZmlnLm1heEF0dGVtcHRzfWApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEV4ZWN1dGUgd2l0aCB0aW1lb3V0IGlmIHNwZWNpZmllZFxyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGZpbmFsQ29uZmlnLnRpbWVvdXRNcyBcclxuICAgICAgICAgID8gYXdhaXQgdGhpcy5leGVjdXRlV2l0aFRpbWVvdXQoZm4sIGZpbmFsQ29uZmlnLnRpbWVvdXRNcylcclxuICAgICAgICAgIDogYXdhaXQgZm4oKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBhdHRlbXB0RHVyYXRpb24gPSBEYXRlLm5vdygpIC0gYXR0ZW1wdFN0YXJ0O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFJlY29yZCBzdWNjZXNzZnVsIGF0dGVtcHRcclxuICAgICAgICByZXRyeUhpc3RvcnkucHVzaCh7XHJcbiAgICAgICAgICBhdHRlbXB0LFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBhdHRlbXB0U3RhcnQsXHJcbiAgICAgICAgICBkdXJhdGlvbjogYXR0ZW1wdER1cmF0aW9uLFxyXG4gICAgICAgICAgc3VjY2VzczogdHJ1ZVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBDYWxsIHN1Y2Nlc3MgY2FsbGJhY2tcclxuICAgICAgICBmaW5hbENvbmZpZy5vblN1Y2Nlc3M/LihhdHRlbXB0KTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoYXR0ZW1wdCA+IDEpIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYFN1Y2Nlc3Mgb24gYXR0ZW1wdCAke2F0dGVtcHR9YCwge1xyXG4gICAgICAgICAgICB0b3RhbEF0dGVtcHRzOiBhdHRlbXB0LFxyXG4gICAgICAgICAgICB0b3RhbER1cmF0aW9uOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICBcclxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICBsYXN0RXJyb3IgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IgOiBuZXcgRXJyb3IoU3RyaW5nKGVycm9yKSk7XHJcbiAgICAgICAgY29uc3QgYXR0ZW1wdER1cmF0aW9uID0gRGF0ZS5ub3coKSAtIGF0dGVtcHRTdGFydDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBSZWNvcmQgZmFpbGVkIGF0dGVtcHRcclxuICAgICAgICByZXRyeUhpc3RvcnkucHVzaCh7XHJcbiAgICAgICAgICBhdHRlbXB0LFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBhdHRlbXB0U3RhcnQsXHJcbiAgICAgICAgICBkdXJhdGlvbjogYXR0ZW1wdER1cmF0aW9uLFxyXG4gICAgICAgICAgZXJyb3I6IGxhc3RFcnJvci5tZXNzYWdlLFxyXG4gICAgICAgICAgc3VjY2VzczogZmFsc2VcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgdGhpcy5sb2dnZXIud2FybihgQXR0ZW1wdCAke2F0dGVtcHR9IGZhaWxlZGAsIHtcclxuICAgICAgICAgIGVycm9yOiBsYXN0RXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgIGR1cmF0aW9uOiBhdHRlbXB0RHVyYXRpb25cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gQ2hlY2sgaWYgZXJyb3IgaXMgcmV0cnlhYmxlXHJcbiAgICAgICAgaWYgKCF0aGlzLmlzUmV0cnlhYmxlRXJyb3IobGFzdEVycm9yLCBmaW5hbENvbmZpZy5yZXRyeWFibGVFcnJvcnMpKSB7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKCdFcnJvciBpcyBub3QgcmV0cnlhYmxlLCB0aHJvd2luZyBpbW1lZGlhdGVseScpO1xyXG4gICAgICAgICAgZmluYWxDb25maWcub25GYWlsdXJlPy4oYXR0ZW1wdCwgbGFzdEVycm9yKTtcclxuICAgICAgICAgIHRocm93IGxhc3RFcnJvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENhbGwgcmV0cnkgY2FsbGJhY2tcclxuICAgICAgICBmaW5hbENvbmZpZy5vblJldHJ5Py4oYXR0ZW1wdCwgbGFzdEVycm9yKTtcclxuXHJcbiAgICAgICAgLy8gRG9uJ3Qgd2FpdCBhZnRlciB0aGUgbGFzdCBhdHRlbXB0XHJcbiAgICAgICAgaWYgKGF0dGVtcHQgPCBmaW5hbENvbmZpZy5tYXhBdHRlbXB0cykge1xyXG4gICAgICAgICAgY29uc3QgZGVsYXkgPSB0aGlzLmNhbGN1bGF0ZURlbGF5KFxyXG4gICAgICAgICAgICBhdHRlbXB0LFxyXG4gICAgICAgICAgICBmaW5hbENvbmZpZy5pbml0aWFsRGVsYXlNcyxcclxuICAgICAgICAgICAgZmluYWxDb25maWcubWF4RGVsYXlNcyxcclxuICAgICAgICAgICAgZmluYWxDb25maWcuYmFja29mZk11bHRpcGxpZXIsXHJcbiAgICAgICAgICAgIGZpbmFsQ29uZmlnLmppdHRlckVuYWJsZWRcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmRlYnVnKGBXYWl0aW5nICR7ZGVsYXl9bXMgYmVmb3JlIHJldHJ5Li4uYCk7XHJcbiAgICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKGRlbGF5KTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBBbGwgYXR0ZW1wdHMgZmFpbGVkXHJcbiAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIHRoaXMubG9nZ2VyLmVycm9yKGBBbGwgJHtmaW5hbENvbmZpZy5tYXhBdHRlbXB0c30gYXR0ZW1wdHMgZmFpbGVkYCwge1xyXG4gICAgICB0b3RhbER1cmF0aW9uLFxyXG4gICAgICBmaW5hbEVycm9yOiBsYXN0RXJyb3I/Lm1lc3NhZ2VcclxuICAgIH0pO1xyXG5cclxuICAgIGZpbmFsQ29uZmlnLm9uRmFpbHVyZT8uKGZpbmFsQ29uZmlnLm1heEF0dGVtcHRzLCBsYXN0RXJyb3IhKTtcclxuICAgIHRocm93IGxhc3RFcnJvciB8fCBuZXcgRXJyb3IoJ0FsbCByZXRyeSBhdHRlbXB0cyBmYWlsZWQnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aCByZXRyeSBhbmQgcmV0dXJuIHJlc3VsdCBvYmplY3QgaW5zdGVhZCBvZiB0aHJvd2luZ1xyXG4gICAqL1xyXG4gIGFzeW5jIGV4ZWN1dGVXaXRoUmV0cnlTYWZlPFQ+KFxyXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPlxyXG4gICk6IFByb21pc2U8UmV0cnlSZXN1bHQ8VD4+IHtcclxuICAgIGNvbnN0IHN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICBcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVdpdGhSZXRyeShmbiwgY29uZmlnKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIHJlc3VsdCxcclxuICAgICAgICBhdHRlbXB0czogMSwgLy8gV2lsbCBiZSB1cGRhdGVkIGJ5IHRoZSBhY3R1YWwgaW1wbGVtZW50YXRpb25cclxuICAgICAgICB0b3RhbER1cmF0aW9uOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgIHJldHJ5SGlzdG9yeTogW11cclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvciA6IG5ldyBFcnJvcihTdHJpbmcoZXJyb3IpKSxcclxuICAgICAgICBhdHRlbXB0czogY29uZmlnPy5tYXhBdHRlbXB0cyB8fCB0aGlzLmRlZmF1bHRDb25maWcubWF4QXR0ZW1wdHMsXHJcbiAgICAgICAgdG90YWxEdXJhdGlvbjogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgICByZXRyeUhpc3Rvcnk6IFtdXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFeGVjdXRlIHdpdGggdGltZW91dFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgZXhlY3V0ZVdpdGhUaW1lb3V0PFQ+KFxyXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICB0aW1lb3V0TXM6IG51bWJlclxyXG4gICk6IFByb21pc2U8VD4ge1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgcmVqZWN0KG5ldyBFcnJvcihgT3BlcmF0aW9uIHRpbWVkIG91dCBhZnRlciAke3RpbWVvdXRNc31tc2ApKTtcclxuICAgICAgfSwgdGltZW91dE1zKTtcclxuXHJcbiAgICAgIGZuKClcclxuICAgICAgICAudGhlbihyZXN1bHQgPT4ge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XHJcbiAgICAgICAgICByZWplY3QoZXJyb3IpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBhbiBlcnJvciBpcyByZXRyeWFibGVcclxuICAgKi9cclxuICBwcml2YXRlIGlzUmV0cnlhYmxlRXJyb3IoZXJyb3I6IEVycm9yLCByZXRyeWFibGVFcnJvcnM6IHN0cmluZ1tdKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvci5tZXNzYWdlLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBjb25zdCBlcnJvck5hbWUgPSBlcnJvci5uYW1lLnRvTG93ZXJDYXNlKCk7XHJcblxyXG4gICAgLy8gQ2hlY2sgYWdhaW5zdCByZXRyeWFibGUgZXJyb3IgcGF0dGVybnNcclxuICAgIGNvbnN0IGlzUmV0cnlhYmxlID0gcmV0cnlhYmxlRXJyb3JzLnNvbWUoXHJcbiAgICAgIChyZXRyeWFibGVFcnJvcikgPT5cclxuICAgICAgICBlcnJvck1lc3NhZ2UuaW5jbHVkZXMocmV0cnlhYmxlRXJyb3IudG9Mb3dlckNhc2UoKSkgfHxcclxuICAgICAgICBlcnJvck5hbWUuaW5jbHVkZXMocmV0cnlhYmxlRXJyb3IudG9Mb3dlckNhc2UoKSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gVXNlIHVzZXItZnJpZW5kbHkgZXJyb3Igc2VydmljZSB0byBjaGVjayBpZiBlcnJvciBpcyByZXRyeWFibGVcclxuICAgIGNvbnN0IHVzZXJGcmllbmRseVJldHJ5YWJsZSA9IHVzZXJGcmllbmRseUVycm9yU2VydmljZS5pc1JldHJ5YWJsZShlcnJvcik7XHJcblxyXG4gICAgcmV0dXJuIGlzUmV0cnlhYmxlIHx8IHVzZXJGcmllbmRseVJldHJ5YWJsZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBkZWxheSB3aXRoIGV4cG9uZW50aWFsIGJhY2tvZmYgYW5kIG9wdGlvbmFsIGppdHRlclxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlRGVsYXkoXHJcbiAgICBhdHRlbXB0OiBudW1iZXIsXHJcbiAgICBpbml0aWFsRGVsYXlNczogbnVtYmVyLFxyXG4gICAgbWF4RGVsYXlNczogbnVtYmVyLFxyXG4gICAgYmFja29mZk11bHRpcGxpZXI6IG51bWJlcixcclxuICAgIGppdHRlckVuYWJsZWQ6IGJvb2xlYW5cclxuICApOiBudW1iZXIge1xyXG4gICAgLy8gQ2FsY3VsYXRlIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICAgIGxldCBkZWxheSA9IGluaXRpYWxEZWxheU1zICogTWF0aC5wb3coYmFja29mZk11bHRpcGxpZXIsIGF0dGVtcHQgLSAxKTtcclxuICAgIFxyXG4gICAgLy8gQXBwbHkgbWF4aW11bSBkZWxheSBsaW1pdFxyXG4gICAgZGVsYXkgPSBNYXRoLm1pbihkZWxheSwgbWF4RGVsYXlNcyk7XHJcbiAgICBcclxuICAgIC8vIEFkZCBqaXR0ZXIgdG8gcHJldmVudCB0aHVuZGVyaW5nIGhlcmRcclxuICAgIGlmIChqaXR0ZXJFbmFibGVkKSB7XHJcbiAgICAgIGNvbnN0IGppdHRlciA9IGRlbGF5ICogMC4xICogTWF0aC5yYW5kb20oKTsgLy8gVXAgdG8gMTAlIGppdHRlclxyXG4gICAgICBkZWxheSArPSBqaXR0ZXI7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJldHVybiBNYXRoLmZsb29yKGRlbGF5KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNsZWVwIGZvciBzcGVjaWZpZWQgbWlsbGlzZWNvbmRzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIHJldHJ5YWJsZSB2ZXJzaW9uIG9mIGEgZnVuY3Rpb25cclxuICAgKi9cclxuICBtYWtlUmV0cnlhYmxlPFRBcmdzIGV4dGVuZHMgYW55W10sIFRSZXN1bHQ+KFxyXG4gICAgZm46ICguLi5hcmdzOiBUQXJncykgPT4gUHJvbWlzZTxUUmVzdWx0PixcclxuICAgIGNvbmZpZz86IFBhcnRpYWw8UmV0cnlDb25maWc+XHJcbiAgKTogKC4uLmFyZ3M6IFRBcmdzKSA9PiBQcm9taXNlPFRSZXN1bHQ+IHtcclxuICAgIHJldHVybiBhc3luYyAoLi4uYXJnczogVEFyZ3MpOiBQcm9taXNlPFRSZXN1bHQ+ID0+IHtcclxuICAgICAgcmV0dXJuIHRoaXMuZXhlY3V0ZVdpdGhSZXRyeSgoKSA9PiBmbiguLi5hcmdzKSwgY29uZmlnKTtcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXRyeSB3aXRoIGN1c3RvbSBjb25kaXRpb25cclxuICAgKi9cclxuICBhc3luYyByZXRyeVVudGlsPFQ+KFxyXG4gICAgZm46ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBjb25kaXRpb246IChyZXN1bHQ6IFQpID0+IGJvb2xlYW4sXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPlxyXG4gICk6IFByb21pc2U8VD4ge1xyXG4gICAgY29uc3QgZmluYWxDb25maWcgPSB7IC4uLnRoaXMuZGVmYXVsdENvbmZpZywgLi4uY29uZmlnIH07XHJcbiAgICBcclxuICAgIHJldHVybiB0aGlzLmV4ZWN1dGVXaXRoUmV0cnkoYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBmbigpO1xyXG4gICAgICBpZiAoIWNvbmRpdGlvbihyZXN1bHQpKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDb25kaXRpb24gbm90IG1ldCwgcmV0cnlpbmcuLi4nKTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfSwgZmluYWxDb25maWcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQmF0Y2ggcmV0cnkgZm9yIG11bHRpcGxlIG9wZXJhdGlvbnNcclxuICAgKi9cclxuICBhc3luYyByZXRyeUJhdGNoPFQ+KFxyXG4gICAgb3BlcmF0aW9uczogKCgpID0+IFByb21pc2U8VD4pW10sXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPFJldHJ5Q29uZmlnPlxyXG4gICk6IFByb21pc2U8UmV0cnlSZXN1bHQ8VD5bXT4ge1xyXG4gICAgY29uc3QgcmVzdWx0czogUmV0cnlSZXN1bHQ8VD5bXSA9IFtdO1xyXG4gICAgXHJcbiAgICBmb3IgKGNvbnN0IG9wZXJhdGlvbiBvZiBvcGVyYXRpb25zKSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZXhlY3V0ZVdpdGhSZXRyeVNhZmUob3BlcmF0aW9uLCBjb25maWcpO1xyXG4gICAgICByZXN1bHRzLnB1c2gocmVzdWx0KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHJlc3VsdHM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgcmV0cnkgc3RhdGlzdGljc1xyXG4gICAqL1xyXG4gIGdldFJldHJ5U3RhdHMocmV0cnlIaXN0b3J5OiBSZXRyeUF0dGVtcHRbXSk6IHtcclxuICAgIHRvdGFsQXR0ZW1wdHM6IG51bWJlcjtcclxuICAgIHN1Y2Nlc3NmdWxBdHRlbXB0czogbnVtYmVyO1xyXG4gICAgZmFpbGVkQXR0ZW1wdHM6IG51bWJlcjtcclxuICAgIGF2ZXJhZ2VEdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgdG90YWxEdXJhdGlvbjogbnVtYmVyO1xyXG4gIH0ge1xyXG4gICAgY29uc3QgdG90YWxBdHRlbXB0cyA9IHJldHJ5SGlzdG9yeS5sZW5ndGg7XHJcbiAgICBjb25zdCBzdWNjZXNzZnVsQXR0ZW1wdHMgPSByZXRyeUhpc3RvcnkuZmlsdGVyKGEgPT4gYS5zdWNjZXNzKS5sZW5ndGg7XHJcbiAgICBjb25zdCBmYWlsZWRBdHRlbXB0cyA9IHRvdGFsQXR0ZW1wdHMgLSBzdWNjZXNzZnVsQXR0ZW1wdHM7XHJcbiAgICBjb25zdCB0b3RhbER1cmF0aW9uID0gcmV0cnlIaXN0b3J5LnJlZHVjZSgoc3VtLCBhKSA9PiBzdW0gKyBhLmR1cmF0aW9uLCAwKTtcclxuICAgIGNvbnN0IGF2ZXJhZ2VEdXJhdGlvbiA9IHRvdGFsQXR0ZW1wdHMgPiAwID8gdG90YWxEdXJhdGlvbiAvIHRvdGFsQXR0ZW1wdHMgOiAwO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHRvdGFsQXR0ZW1wdHMsXHJcbiAgICAgIHN1Y2Nlc3NmdWxBdHRlbXB0cyxcclxuICAgICAgZmFpbGVkQXR0ZW1wdHMsXHJcbiAgICAgIGF2ZXJhZ2VEdXJhdGlvbixcclxuICAgICAgdG90YWxEdXJhdGlvblxyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEdsb2JhbCBlbmhhbmNlZCByZXRyeSBzZXJ2aWNlIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBlbmhhbmNlZFJldHJ5U2VydmljZSA9IG5ldyBFbmhhbmNlZFJldHJ5U2VydmljZSgpOyJdfQ==