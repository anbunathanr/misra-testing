"use strict";
/**
 * Retry Handler Service
 *
 * Implements exponential backoff retry logic for failed operations.
 * Used for notification delivery and other transient failures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryHandlerService = exports.RetryHandlerService = void 0;
class RetryHandlerService {
    /**
     * Execute an operation with retry logic and exponential backoff
     *
     * @param operation - The async operation to execute
     * @param config - Retry configuration
     * @returns RetryResult with success status, result, and attempt count
     */
    async executeWithRetry(operation, config) {
        let lastError;
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
            }
            catch (error) {
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
    calculateBackoffDelay(attemptNumber, config) {
        const exponentialDelay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attemptNumber);
        return Math.min(exponentialDelay, config.maxDelayMs);
    }
    /**
     * Sleep for specified milliseconds
     *
     * @param ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RetryHandlerService = RetryHandlerService;
// Export singleton instance
exports.retryHandlerService = new RetryHandlerService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV0cnktaGFuZGxlci1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicmV0cnktaGFuZGxlci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBSUgsTUFBYSxtQkFBbUI7SUFDOUI7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLGdCQUFnQixDQUNwQixTQUEyQixFQUMzQixNQUFtQjtRQUVuQixJQUFJLFNBQTRCLENBQUM7UUFDakMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDO1FBRXJCLEtBQUssSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDOUQsWUFBWSxHQUFHLE9BQU8sR0FBRyxDQUFDLENBQUM7WUFFM0IsSUFBSSxDQUFDO2dCQUNILHdCQUF3QjtnQkFDeEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLEVBQUUsQ0FBQztnQkFFakMsT0FBTztvQkFDTCxPQUFPLEVBQUUsSUFBSTtvQkFDYixNQUFNO29CQUNOLFlBQVk7aUJBQ2IsQ0FBQztZQUNKLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNmLFNBQVMsR0FBRyxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUV0RSw0Q0FBNEM7Z0JBQzVDLElBQUksT0FBTyxLQUFLLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDbEMsTUFBTTtnQkFDUixDQUFDO2dCQUVELG1DQUFtQztnQkFDbkMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFFMUQsb0JBQW9CO2dCQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLGlCQUFpQixPQUFPLEdBQUcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxVQUFVLHdCQUF3QixLQUFLLE9BQU8sRUFBRTtvQkFDakcsS0FBSyxFQUFFLFNBQVMsQ0FBQyxPQUFPO29CQUN4QixPQUFPLEVBQUUsT0FBTyxHQUFHLENBQUM7b0JBQ3BCLFVBQVUsRUFBRSxNQUFNLENBQUMsVUFBVTtvQkFDN0IsS0FBSztpQkFDTixDQUFDLENBQUM7Z0JBRUgsMkJBQTJCO2dCQUMzQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDMUIsQ0FBQztRQUNILENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsT0FBTztZQUNMLE9BQU8sRUFBRSxLQUFLO1lBQ2QsS0FBSyxFQUFFLFNBQVM7WUFDaEIsWUFBWTtTQUNiLENBQUM7SUFDSixDQUFDO0lBRUQ7Ozs7Ozs7O09BUUc7SUFDSCxxQkFBcUIsQ0FBQyxhQUFxQixFQUFFLE1BQW1CO1FBQzlELE1BQU0sZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUNuRyxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFRDs7OztPQUlHO0lBQ0ssS0FBSyxDQUFDLEVBQVU7UUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0NBQ0Y7QUFqRkQsa0RBaUZDO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUmV0cnkgSGFuZGxlciBTZXJ2aWNlXHJcbiAqIFxyXG4gKiBJbXBsZW1lbnRzIGV4cG9uZW50aWFsIGJhY2tvZmYgcmV0cnkgbG9naWMgZm9yIGZhaWxlZCBvcGVyYXRpb25zLlxyXG4gKiBVc2VkIGZvciBub3RpZmljYXRpb24gZGVsaXZlcnkgYW5kIG90aGVyIHRyYW5zaWVudCBmYWlsdXJlcy5cclxuICovXHJcblxyXG5pbXBvcnQgeyBSZXRyeUNvbmZpZywgUmV0cnlSZXN1bHQgfSBmcm9tICcuLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuZXhwb3J0IGNsYXNzIFJldHJ5SGFuZGxlclNlcnZpY2Uge1xyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgYW4gb3BlcmF0aW9uIHdpdGggcmV0cnkgbG9naWMgYW5kIGV4cG9uZW50aWFsIGJhY2tvZmZcclxuICAgKiBcclxuICAgKiBAcGFyYW0gb3BlcmF0aW9uIC0gVGhlIGFzeW5jIG9wZXJhdGlvbiB0byBleGVjdXRlXHJcbiAgICogQHBhcmFtIGNvbmZpZyAtIFJldHJ5IGNvbmZpZ3VyYXRpb25cclxuICAgKiBAcmV0dXJucyBSZXRyeVJlc3VsdCB3aXRoIHN1Y2Nlc3Mgc3RhdHVzLCByZXN1bHQsIGFuZCBhdHRlbXB0IGNvdW50XHJcbiAgICovXHJcbiAgYXN5bmMgZXhlY3V0ZVdpdGhSZXRyeTxUPihcclxuICAgIG9wZXJhdGlvbjogKCkgPT4gUHJvbWlzZTxUPixcclxuICAgIGNvbmZpZzogUmV0cnlDb25maWdcclxuICApOiBQcm9taXNlPFJldHJ5UmVzdWx0PFQ+PiB7XHJcbiAgICBsZXQgbGFzdEVycm9yOiBFcnJvciB8IHVuZGVmaW5lZDtcclxuICAgIGxldCBhdHRlbXB0Q291bnQgPSAwO1xyXG5cclxuICAgIGZvciAobGV0IGF0dGVtcHQgPSAwOyBhdHRlbXB0IDw9IGNvbmZpZy5tYXhSZXRyaWVzOyBhdHRlbXB0KyspIHtcclxuICAgICAgYXR0ZW1wdENvdW50ID0gYXR0ZW1wdCArIDE7XHJcblxyXG4gICAgICB0cnkge1xyXG4gICAgICAgIC8vIEV4ZWN1dGUgdGhlIG9wZXJhdGlvblxyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG9wZXJhdGlvbigpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgICAgcmVzdWx0LFxyXG4gICAgICAgICAgYXR0ZW1wdENvdW50LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgbGFzdEVycm9yID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yIDogbmV3IEVycm9yKFN0cmluZyhlcnJvcikpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIElmIHRoaXMgd2FzIHRoZSBsYXN0IGF0dGVtcHQsIGRvbid0IGRlbGF5XHJcbiAgICAgICAgaWYgKGF0dGVtcHQgPT09IGNvbmZpZy5tYXhSZXRyaWVzKSB7XHJcbiAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIENhbGN1bGF0ZSBkZWxheSBmb3IgbmV4dCBhdHRlbXB0XHJcbiAgICAgICAgY29uc3QgZGVsYXkgPSB0aGlzLmNhbGN1bGF0ZUJhY2tvZmZEZWxheShhdHRlbXB0LCBjb25maWcpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIExvZyByZXRyeSBhdHRlbXB0XHJcbiAgICAgICAgY29uc29sZS5sb2coYFJldHJ5IGF0dGVtcHQgJHthdHRlbXB0ICsgMX0vJHtjb25maWcubWF4UmV0cmllc30gZmFpbGVkLiBSZXRyeWluZyBpbiAke2RlbGF5fW1zLi4uYCwge1xyXG4gICAgICAgICAgZXJyb3I6IGxhc3RFcnJvci5tZXNzYWdlLFxyXG4gICAgICAgICAgYXR0ZW1wdDogYXR0ZW1wdCArIDEsXHJcbiAgICAgICAgICBtYXhSZXRyaWVzOiBjb25maWcubWF4UmV0cmllcyxcclxuICAgICAgICAgIGRlbGF5LFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBXYWl0IGJlZm9yZSBuZXh0IGF0dGVtcHRcclxuICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKGRlbGF5KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFsbCByZXRyaWVzIGV4aGF1c3RlZFxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIGVycm9yOiBsYXN0RXJyb3IsXHJcbiAgICAgIGF0dGVtcHRDb3VudCxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgZXhwb25lbnRpYWwgYmFja29mZiBkZWxheVxyXG4gICAqIFxyXG4gICAqIEZvcm11bGE6IG1pbihpbml0aWFsRGVsYXkgKiAoYmFja29mZk11bHRpcGxpZXIgXiBhdHRlbXB0KSwgbWF4RGVsYXkpXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGF0dGVtcHROdW1iZXIgLSBDdXJyZW50IGF0dGVtcHQgbnVtYmVyICgwLWluZGV4ZWQpXHJcbiAgICogQHBhcmFtIGNvbmZpZyAtIFJldHJ5IGNvbmZpZ3VyYXRpb25cclxuICAgKiBAcmV0dXJucyBEZWxheSBpbiBtaWxsaXNlY29uZHNcclxuICAgKi9cclxuICBjYWxjdWxhdGVCYWNrb2ZmRGVsYXkoYXR0ZW1wdE51bWJlcjogbnVtYmVyLCBjb25maWc6IFJldHJ5Q29uZmlnKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGV4cG9uZW50aWFsRGVsYXkgPSBjb25maWcuaW5pdGlhbERlbGF5TXMgKiBNYXRoLnBvdyhjb25maWcuYmFja29mZk11bHRpcGxpZXIsIGF0dGVtcHROdW1iZXIpO1xyXG4gICAgcmV0dXJuIE1hdGgubWluKGV4cG9uZW50aWFsRGVsYXksIGNvbmZpZy5tYXhEZWxheU1zKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNsZWVwIGZvciBzcGVjaWZpZWQgbWlsbGlzZWNvbmRzXHJcbiAgICogXHJcbiAgICogQHBhcmFtIG1zIC0gTWlsbGlzZWNvbmRzIHRvIHNsZWVwXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzbGVlcChtczogbnVtYmVyKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICByZXR1cm4gbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBFeHBvcnQgc2luZ2xldG9uIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCByZXRyeUhhbmRsZXJTZXJ2aWNlID0gbmV3IFJldHJ5SGFuZGxlclNlcnZpY2UoKTtcclxuIl19