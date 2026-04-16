"use strict";
/**
 * Circuit Breaker Service
 * Implements circuit breaker pattern for external service calls
 * Prevents cascading failures and provides graceful degradation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.circuitBreakerManager = exports.CircuitBreakerManager = exports.CircuitBreaker = exports.CircuitState = void 0;
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
/**
 * Circuit Breaker implementation for production error handling
 */
class CircuitBreaker {
    state = CircuitState.CLOSED;
    failureCount = 0;
    successCount = 0;
    lastFailureTime;
    totalRequests = 0;
    config;
    constructor(config) {
        this.config = {
            monitoringWindowMs: 60000, // 1 minute default
            ...config
        };
    }
    /**
     * Execute a function with circuit breaker protection
     */
    async execute(fn) {
        this.totalRequests++;
        if (this.state === CircuitState.OPEN) {
            if (this.shouldAttemptReset()) {
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            }
            else {
                throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    /**
     * Handle successful execution
     */
    onSuccess() {
        this.successCount++;
        if (this.state === CircuitState.HALF_OPEN) {
            if (this.successCount >= this.config.halfOpenMaxAttempts) {
                this.reset();
            }
        }
        else {
            this.failureCount = 0;
        }
    }
    /**
     * Handle failed execution
     */
    onFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.state === CircuitState.HALF_OPEN) {
            this.state = CircuitState.OPEN;
        }
        else if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
        }
    }
    /**
     * Check if circuit should attempt reset
     */
    shouldAttemptReset() {
        if (!this.lastFailureTime)
            return false;
        return Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs;
    }
    /**
     * Reset circuit to closed state
     */
    reset() {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = undefined;
    }
    /**
     * Get current circuit breaker metrics
     */
    getMetrics() {
        const failureRate = this.totalRequests > 0
            ? this.failureCount / this.totalRequests
            : 0;
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailureTime: this.lastFailureTime,
            totalRequests: this.totalRequests,
            failureRate
        };
    }
    /**
     * Get current state
     */
    getState() {
        return this.state;
    }
    /**
     * Force circuit to open state (for testing/maintenance)
     */
    forceOpen() {
        this.state = CircuitState.OPEN;
        this.lastFailureTime = Date.now();
    }
    /**
     * Check if circuit is healthy
     */
    isHealthy() {
        return this.state === CircuitState.CLOSED ||
            (this.state === CircuitState.HALF_OPEN && this.successCount > 0);
    }
}
exports.CircuitBreaker = CircuitBreaker;
/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
class CircuitBreakerManager {
    breakers = new Map();
    defaultConfig = {
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        halfOpenMaxAttempts: 3,
        monitoringWindowMs: 60000
    };
    /**
     * Get or create circuit breaker for a service
     */
    getBreaker(serviceName, config) {
        if (!this.breakers.has(serviceName)) {
            const breakerConfig = { ...this.defaultConfig, ...config };
            this.breakers.set(serviceName, new CircuitBreaker(breakerConfig));
        }
        return this.breakers.get(serviceName);
    }
    /**
     * Execute function with circuit breaker for specific service
     */
    async executeWithBreaker(serviceName, fn, config) {
        const breaker = this.getBreaker(serviceName, config);
        return breaker.execute(fn);
    }
    /**
     * Get metrics for all circuit breakers
     */
    getAllMetrics() {
        const metrics = {};
        for (const [serviceName, breaker] of this.breakers) {
            metrics[serviceName] = breaker.getMetrics();
        }
        return metrics;
    }
    /**
     * Reset all circuit breakers
     */
    resetAll() {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
    /**
     * Get health status of all services
     */
    getHealthStatus() {
        const status = {};
        for (const [serviceName, breaker] of this.breakers) {
            status[serviceName] = breaker.isHealthy();
        }
        return status;
    }
}
exports.CircuitBreakerManager = CircuitBreakerManager;
// Global circuit breaker manager instance
exports.circuitBreakerManager = new CircuitBreakerManager();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2lyY3VpdC1icmVha2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2lyY3VpdC1icmVha2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFFSCxJQUFZLFlBSVg7QUFKRCxXQUFZLFlBQVk7SUFDdEIsaUNBQWlCLENBQUE7SUFDakIsNkJBQWEsQ0FBQTtJQUNiLHVDQUF1QixDQUFBO0FBQ3pCLENBQUMsRUFKVyxZQUFZLDRCQUFaLFlBQVksUUFJdkI7QUFrQkQ7O0dBRUc7QUFDSCxNQUFhLGNBQWM7SUFDakIsS0FBSyxHQUFpQixZQUFZLENBQUMsTUFBTSxDQUFDO0lBQzFDLFlBQVksR0FBVyxDQUFDLENBQUM7SUFDekIsWUFBWSxHQUFXLENBQUMsQ0FBQztJQUN6QixlQUFlLENBQVU7SUFDekIsYUFBYSxHQUFXLENBQUMsQ0FBQztJQUNqQixNQUFNLENBQWlDO0lBRXhELFlBQVksTUFBNEI7UUFDdEMsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLGtCQUFrQixFQUFFLEtBQUssRUFBRSxtQkFBbUI7WUFDOUMsR0FBRyxNQUFNO1NBQ1YsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUksRUFBb0I7UUFDbkMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBRXJCLElBQUksSUFBSSxDQUFDLEtBQUssS0FBSyxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDckMsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsS0FBSyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLENBQUM7aUJBQU0sQ0FBQztnQkFDTixNQUFNLElBQUksS0FBSyxDQUFDLDJEQUEyRCxDQUFDLENBQUM7WUFDL0UsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSCxN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LENBQUMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkQsT0FBTyxDQUFDLFdBQVcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUM5QyxDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUM7SUFDakIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsUUFBUTtRQUNOLEtBQUssTUFBTSxPQUFPLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQzdDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZTtRQUNiLE1BQU0sTUFBTSxHQUE0QixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuRCxNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzVDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0NBQ0Y7QUE5REQsc0RBOERDO0FBRUQsMENBQTBDO0FBQzdCLFFBQUEscUJBQXFCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIENpcmN1aXQgQnJlYWtlciBTZXJ2aWNlXHJcbiAqIEltcGxlbWVudHMgY2lyY3VpdCBicmVha2VyIHBhdHRlcm4gZm9yIGV4dGVybmFsIHNlcnZpY2UgY2FsbHNcclxuICogUHJldmVudHMgY2FzY2FkaW5nIGZhaWx1cmVzIGFuZCBwcm92aWRlcyBncmFjZWZ1bCBkZWdyYWRhdGlvblxyXG4gKi9cclxuXHJcbmV4cG9ydCBlbnVtIENpcmN1aXRTdGF0ZSB7XHJcbiAgQ0xPU0VEID0gJ0NMT1NFRCcsXHJcbiAgT1BFTiA9ICdPUEVOJyxcclxuICBIQUxGX09QRU4gPSAnSEFMRl9PUEVOJ1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENpcmN1aXRCcmVha2VyQ29uZmlnIHtcclxuICBmYWlsdXJlVGhyZXNob2xkOiBudW1iZXI7XHJcbiAgcmVzZXRUaW1lb3V0TXM6IG51bWJlcjtcclxuICBoYWxmT3Blbk1heEF0dGVtcHRzOiBudW1iZXI7XHJcbiAgbW9uaXRvcmluZ1dpbmRvd01zPzogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENpcmN1aXRCcmVha2VyTWV0cmljcyB7XHJcbiAgc3RhdGU6IENpcmN1aXRTdGF0ZTtcclxuICBmYWlsdXJlQ291bnQ6IG51bWJlcjtcclxuICBzdWNjZXNzQ291bnQ6IG51bWJlcjtcclxuICBsYXN0RmFpbHVyZVRpbWU/OiBudW1iZXI7XHJcbiAgdG90YWxSZXF1ZXN0czogbnVtYmVyO1xyXG4gIGZhaWx1cmVSYXRlOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDaXJjdWl0IEJyZWFrZXIgaW1wbGVtZW50YXRpb24gZm9yIHByb2R1Y3Rpb24gZXJyb3IgaGFuZGxpbmdcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDaXJjdWl0QnJlYWtlciB7XHJcbiAgcHJpdmF0ZSBzdGF0ZTogQ2lyY3VpdFN0YXRlID0gQ2lyY3VpdFN0YXRlLkNMT1NFRDtcclxuICBwcml2YXRlIGZhaWx1cmVDb3VudDogbnVtYmVyID0gMDtcclxuICBwcml2YXRlIHN1Y2Nlc3NDb3VudDogbnVtYmVyID0gMDtcclxuICBwcml2YXRlIGxhc3RGYWlsdXJlVGltZT86IG51bWJlcjtcclxuICBwcml2YXRlIHRvdGFsUmVxdWVzdHM6IG51bWJlciA9IDA7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBjb25maWc6IFJlcXVpcmVkPENpcmN1aXRCcmVha2VyQ29uZmlnPjtcclxuXHJcbiAgY29uc3RydWN0b3IoY29uZmlnOiBDaXJjdWl0QnJlYWtlckNvbmZpZykge1xyXG4gICAgdGhpcy5jb25maWcgPSB7XHJcbiAgICAgIG1vbml0b3JpbmdXaW5kb3dNczogNjAwMDAsIC8vIDEgbWludXRlIGRlZmF1bHRcclxuICAgICAgLi4uY29uZmlnXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRXhlY3V0ZSBhIGZ1bmN0aW9uIHdpdGggY2lyY3VpdCBicmVha2VyIHByb3RlY3Rpb25cclxuICAgKi9cclxuICBhc3luYyBleGVjdXRlPFQ+KGZuOiAoKSA9PiBQcm9taXNlPFQ+KTogUHJvbWlzZTxUPiB7XHJcbiAgICB0aGlzLnRvdGFsUmVxdWVzdHMrKztcclxuXHJcbiAgICBpZiAodGhpcy5zdGF0ZSA9PT0gQ2lyY3VpdFN0YXRlLk9QRU4pIHtcclxuICAgICAgaWYgKHRoaXMuc2hvdWxkQXR0ZW1wdFJlc2V0KCkpIHtcclxuICAgICAgICB0aGlzLnN0YXRlID0gQ2lyY3VpdFN0YXRlLkhBTEZfT1BFTjtcclxuICAgICAgICB0aGlzLnN1Y2Nlc3NDb3VudCA9IDA7XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdDaXJjdWl0IGJyZWFrZXIgaXMgT1BFTi4gU2VydmljZSB0ZW1wb3JhcmlseSB1bmF2YWlsYWJsZS4nKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGZuKCk7XHJcbiAgICAgIHRoaXMub25TdWNjZXNzKCk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0aGlzLm9uRmFpbHVyZSgpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZSBzdWNjZXNzZnVsIGV4ZWN1dGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgb25TdWNjZXNzKCk6IHZvaWQge1xyXG4gICAgdGhpcy5zdWNjZXNzQ291bnQrKztcclxuICAgIFxyXG4gICAgaWYgKHRoaXMuc3RhdGUgPT09IENpcmN1aXRTdGF0ZS5IQUxGX09QRU4pIHtcclxuICAgICAgaWYgKHRoaXMuc3VjY2Vzc0NvdW50ID49IHRoaXMuY29uZmlnLmhhbGZPcGVuTWF4QXR0ZW1wdHMpIHtcclxuICAgICAgICB0aGlzLnJlc2V0KCk7XHJcbiAgICAgIH1cclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHRoaXMuZmFpbHVyZUNvdW50ID0gMDtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZSBmYWlsZWQgZXhlY3V0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBvbkZhaWx1cmUoKTogdm9pZCB7XHJcbiAgICB0aGlzLmZhaWx1cmVDb3VudCsrO1xyXG4gICAgdGhpcy5sYXN0RmFpbHVyZVRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIGlmICh0aGlzLnN0YXRlID09PSBDaXJjdWl0U3RhdGUuSEFMRl9PUEVOKSB7XHJcbiAgICAgIHRoaXMuc3RhdGUgPSBDaXJjdWl0U3RhdGUuT1BFTjtcclxuICAgIH0gZWxzZSBpZiAodGhpcy5mYWlsdXJlQ291bnQgPj0gdGhpcy5jb25maWcuZmFpbHVyZVRocmVzaG9sZCkge1xyXG4gICAgICB0aGlzLnN0YXRlID0gQ2lyY3VpdFN0YXRlLk9QRU47XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBjaXJjdWl0IHNob3VsZCBhdHRlbXB0IHJlc2V0XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzaG91bGRBdHRlbXB0UmVzZXQoKTogYm9vbGVhbiB7XHJcbiAgICBpZiAoIXRoaXMubGFzdEZhaWx1cmVUaW1lKSByZXR1cm4gZmFsc2U7XHJcbiAgICByZXR1cm4gRGF0ZS5ub3coKSAtIHRoaXMubGFzdEZhaWx1cmVUaW1lID49IHRoaXMuY29uZmlnLnJlc2V0VGltZW91dE1zO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzZXQgY2lyY3VpdCB0byBjbG9zZWQgc3RhdGVcclxuICAgKi9cclxuICByZXNldCgpOiB2b2lkIHtcclxuICAgIHRoaXMuc3RhdGUgPSBDaXJjdWl0U3RhdGUuQ0xPU0VEO1xyXG4gICAgdGhpcy5mYWlsdXJlQ291bnQgPSAwO1xyXG4gICAgdGhpcy5zdWNjZXNzQ291bnQgPSAwO1xyXG4gICAgdGhpcy5sYXN0RmFpbHVyZVRpbWUgPSB1bmRlZmluZWQ7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgY3VycmVudCBjaXJjdWl0IGJyZWFrZXIgbWV0cmljc1xyXG4gICAqL1xyXG4gIGdldE1ldHJpY3MoKTogQ2lyY3VpdEJyZWFrZXJNZXRyaWNzIHtcclxuICAgIGNvbnN0IGZhaWx1cmVSYXRlID0gdGhpcy50b3RhbFJlcXVlc3RzID4gMCBcclxuICAgICAgPyB0aGlzLmZhaWx1cmVDb3VudCAvIHRoaXMudG90YWxSZXF1ZXN0cyBcclxuICAgICAgOiAwO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXRlOiB0aGlzLnN0YXRlLFxyXG4gICAgICBmYWlsdXJlQ291bnQ6IHRoaXMuZmFpbHVyZUNvdW50LFxyXG4gICAgICBzdWNjZXNzQ291bnQ6IHRoaXMuc3VjY2Vzc0NvdW50LFxyXG4gICAgICBsYXN0RmFpbHVyZVRpbWU6IHRoaXMubGFzdEZhaWx1cmVUaW1lLFxyXG4gICAgICB0b3RhbFJlcXVlc3RzOiB0aGlzLnRvdGFsUmVxdWVzdHMsXHJcbiAgICAgIGZhaWx1cmVSYXRlXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGN1cnJlbnQgc3RhdGVcclxuICAgKi9cclxuICBnZXRTdGF0ZSgpOiBDaXJjdWl0U3RhdGUge1xyXG4gICAgcmV0dXJuIHRoaXMuc3RhdGU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBGb3JjZSBjaXJjdWl0IHRvIG9wZW4gc3RhdGUgKGZvciB0ZXN0aW5nL21haW50ZW5hbmNlKVxyXG4gICAqL1xyXG4gIGZvcmNlT3BlbigpOiB2b2lkIHtcclxuICAgIHRoaXMuc3RhdGUgPSBDaXJjdWl0U3RhdGUuT1BFTjtcclxuICAgIHRoaXMubGFzdEZhaWx1cmVUaW1lID0gRGF0ZS5ub3coKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGNpcmN1aXQgaXMgaGVhbHRoeVxyXG4gICAqL1xyXG4gIGlzSGVhbHRoeSgpOiBib29sZWFuIHtcclxuICAgIHJldHVybiB0aGlzLnN0YXRlID09PSBDaXJjdWl0U3RhdGUuQ0xPU0VEIHx8IFxyXG4gICAgICAgICAgICh0aGlzLnN0YXRlID09PSBDaXJjdWl0U3RhdGUuSEFMRl9PUEVOICYmIHRoaXMuc3VjY2Vzc0NvdW50ID4gMCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2lyY3VpdCBCcmVha2VyIE1hbmFnZXIgZm9yIG1hbmFnaW5nIG11bHRpcGxlIGNpcmN1aXQgYnJlYWtlcnNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBDaXJjdWl0QnJlYWtlck1hbmFnZXIge1xyXG4gIHByaXZhdGUgYnJlYWtlcnMgPSBuZXcgTWFwPHN0cmluZywgQ2lyY3VpdEJyZWFrZXI+KCk7XHJcbiAgcHJpdmF0ZSBkZWZhdWx0Q29uZmlnOiBDaXJjdWl0QnJlYWtlckNvbmZpZyA9IHtcclxuICAgIGZhaWx1cmVUaHJlc2hvbGQ6IDUsXHJcbiAgICByZXNldFRpbWVvdXRNczogNjAwMDAsXHJcbiAgICBoYWxmT3Blbk1heEF0dGVtcHRzOiAzLFxyXG4gICAgbW9uaXRvcmluZ1dpbmRvd01zOiA2MDAwMFxyXG4gIH07XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBvciBjcmVhdGUgY2lyY3VpdCBicmVha2VyIGZvciBhIHNlcnZpY2VcclxuICAgKi9cclxuICBnZXRCcmVha2VyKHNlcnZpY2VOYW1lOiBzdHJpbmcsIGNvbmZpZz86IFBhcnRpYWw8Q2lyY3VpdEJyZWFrZXJDb25maWc+KTogQ2lyY3VpdEJyZWFrZXIge1xyXG4gICAgaWYgKCF0aGlzLmJyZWFrZXJzLmhhcyhzZXJ2aWNlTmFtZSkpIHtcclxuICAgICAgY29uc3QgYnJlYWtlckNvbmZpZyA9IHsgLi4udGhpcy5kZWZhdWx0Q29uZmlnLCAuLi5jb25maWcgfTtcclxuICAgICAgdGhpcy5icmVha2Vycy5zZXQoc2VydmljZU5hbWUsIG5ldyBDaXJjdWl0QnJlYWtlcihicmVha2VyQ29uZmlnKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5icmVha2Vycy5nZXQoc2VydmljZU5hbWUpITtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEV4ZWN1dGUgZnVuY3Rpb24gd2l0aCBjaXJjdWl0IGJyZWFrZXIgZm9yIHNwZWNpZmljIHNlcnZpY2VcclxuICAgKi9cclxuICBhc3luYyBleGVjdXRlV2l0aEJyZWFrZXI8VD4oXHJcbiAgICBzZXJ2aWNlTmFtZTogc3RyaW5nLCBcclxuICAgIGZuOiAoKSA9PiBQcm9taXNlPFQ+LFxyXG4gICAgY29uZmlnPzogUGFydGlhbDxDaXJjdWl0QnJlYWtlckNvbmZpZz5cclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IGJyZWFrZXIgPSB0aGlzLmdldEJyZWFrZXIoc2VydmljZU5hbWUsIGNvbmZpZyk7XHJcbiAgICByZXR1cm4gYnJlYWtlci5leGVjdXRlKGZuKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBtZXRyaWNzIGZvciBhbGwgY2lyY3VpdCBicmVha2Vyc1xyXG4gICAqL1xyXG4gIGdldEFsbE1ldHJpY3MoKTogUmVjb3JkPHN0cmluZywgQ2lyY3VpdEJyZWFrZXJNZXRyaWNzPiB7XHJcbiAgICBjb25zdCBtZXRyaWNzOiBSZWNvcmQ8c3RyaW5nLCBDaXJjdWl0QnJlYWtlck1ldHJpY3M+ID0ge307XHJcbiAgICBmb3IgKGNvbnN0IFtzZXJ2aWNlTmFtZSwgYnJlYWtlcl0gb2YgdGhpcy5icmVha2Vycykge1xyXG4gICAgICBtZXRyaWNzW3NlcnZpY2VOYW1lXSA9IGJyZWFrZXIuZ2V0TWV0cmljcygpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG1ldHJpY3M7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZXNldCBhbGwgY2lyY3VpdCBicmVha2Vyc1xyXG4gICAqL1xyXG4gIHJlc2V0QWxsKCk6IHZvaWQge1xyXG4gICAgZm9yIChjb25zdCBicmVha2VyIG9mIHRoaXMuYnJlYWtlcnMudmFsdWVzKCkpIHtcclxuICAgICAgYnJlYWtlci5yZXNldCgpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGhlYWx0aCBzdGF0dXMgb2YgYWxsIHNlcnZpY2VzXHJcbiAgICovXHJcbiAgZ2V0SGVhbHRoU3RhdHVzKCk6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+IHtcclxuICAgIGNvbnN0IHN0YXR1czogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcclxuICAgIGZvciAoY29uc3QgW3NlcnZpY2VOYW1lLCBicmVha2VyXSBvZiB0aGlzLmJyZWFrZXJzKSB7XHJcbiAgICAgIHN0YXR1c1tzZXJ2aWNlTmFtZV0gPSBicmVha2VyLmlzSGVhbHRoeSgpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHN0YXR1cztcclxuICB9XHJcbn1cclxuXHJcbi8vIEdsb2JhbCBjaXJjdWl0IGJyZWFrZXIgbWFuYWdlciBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgY2lyY3VpdEJyZWFrZXJNYW5hZ2VyID0gbmV3IENpcmN1aXRCcmVha2VyTWFuYWdlcigpOyJdfQ==