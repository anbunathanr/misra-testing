"use strict";
/**
 * Rate Limiter Service
 *
 * Implements token bucket algorithm for rate limiting SNS API calls.
 * Tracks API call rates per topic and throttles requests when approaching limits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiterService = exports.RateLimiterService = void 0;
class RateLimiterService {
    buckets;
    DEFAULT_CONFIG = {
        maxTokens: 100, // SNS default: 100 TPS per topic
        refillRate: 100, // Refill 100 tokens per second
        refillInterval: 1000, // Refill every second
    };
    constructor() {
        this.buckets = new Map();
    }
    /**
     * Check if request is allowed and consume token if available
     *
     * @param topicArn - SNS topic ARN (used as bucket key)
     * @param config - Optional rate limit configuration
     * @returns Rate limit result
     */
    async checkRateLimit(topicArn, config) {
        const bucket = this.getOrCreateBucket(topicArn, config);
        return bucket.consume();
    }
    /**
     * Get or create token bucket for topic
     *
     * @param topicArn - SNS topic ARN
     * @param config - Optional rate limit configuration
     * @returns Token bucket instance
     */
    getOrCreateBucket(topicArn, config) {
        if (!this.buckets.has(topicArn)) {
            const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
            this.buckets.set(topicArn, new TokenBucket(finalConfig));
        }
        return this.buckets.get(topicArn);
    }
    /**
     * Reset rate limiter for topic (useful for testing)
     *
     * @param topicArn - SNS topic ARN
     */
    reset(topicArn) {
        if (topicArn) {
            this.buckets.delete(topicArn);
        }
        else {
            this.buckets.clear();
        }
    }
    /**
     * Get current token count for topic
     *
     * @param topicArn - SNS topic ARN
     * @returns Current token count
     */
    getTokenCount(topicArn) {
        const bucket = this.buckets.get(topicArn);
        return bucket ? bucket.getTokenCount() : this.DEFAULT_CONFIG.maxTokens;
    }
}
exports.RateLimiterService = RateLimiterService;
/**
 * Token Bucket implementation for rate limiting
 */
class TokenBucket {
    tokens;
    lastRefillTime;
    config;
    constructor(config) {
        this.config = config;
        this.tokens = config.maxTokens;
        this.lastRefillTime = Date.now();
    }
    /**
     * Attempt to consume a token
     *
     * @returns Rate limit result
     */
    consume() {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return {
                allowed: true,
                remainingTokens: Math.floor(this.tokens),
            };
        }
        // Calculate retry after time
        const tokensNeeded = 1 - this.tokens;
        const retryAfterMs = Math.ceil((tokensNeeded / this.config.refillRate) * this.config.refillInterval);
        return {
            allowed: false,
            remainingTokens: 0,
            retryAfterMs,
        };
    }
    /**
     * Refill tokens based on elapsed time
     */
    refill() {
        const now = Date.now();
        const elapsedMs = now - this.lastRefillTime;
        if (elapsedMs >= this.config.refillInterval) {
            const intervalsElapsed = Math.floor(elapsedMs / this.config.refillInterval);
            const tokensToAdd = intervalsElapsed * this.config.refillRate;
            this.tokens = Math.min(this.tokens + tokensToAdd, this.config.maxTokens);
            this.lastRefillTime = now;
        }
    }
    /**
     * Get current token count
     *
     * @returns Current token count
     */
    getTokenCount() {
        this.refill();
        return Math.floor(this.tokens);
    }
}
// Export singleton instance
exports.rateLimiterService = new RateLimiterService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF0ZS1saW1pdGVyLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyYXRlLWxpbWl0ZXItc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQWNILE1BQWEsa0JBQWtCO0lBQ3JCLE9BQU8sQ0FBMkI7SUFDekIsY0FBYyxHQUFvQjtRQUNqRCxTQUFTLEVBQUUsR0FBRyxFQUFFLGlDQUFpQztRQUNqRCxVQUFVLEVBQUUsR0FBRyxFQUFFLCtCQUErQjtRQUNoRCxjQUFjLEVBQUUsSUFBSSxFQUFFLHNCQUFzQjtLQUM3QyxDQUFDO0lBRUY7UUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQ2xCLFFBQWdCLEVBQ2hCLE1BQWlDO1FBRWpDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEQsT0FBTyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDMUIsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNLLGlCQUFpQixDQUN2QixRQUFnQixFQUNoQixNQUFpQztRQUVqQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUNoQyxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO1FBQzNELENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBRSxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsS0FBSyxDQUFDLFFBQWlCO1FBQ3JCLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdkIsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILGFBQWEsQ0FBQyxRQUFnQjtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUMxQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQztJQUN6RSxDQUFDO0NBQ0Y7QUFwRUQsZ0RBb0VDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFdBQVc7SUFDUCxNQUFNLENBQVM7SUFDZixjQUFjLENBQVM7SUFDdkIsTUFBTSxDQUFrQjtJQUVoQyxZQUFZLE1BQXVCO1FBQ2pDLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQztRQUMvQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILE9BQU87UUFDTCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFZCxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLENBQUM7WUFDakIsT0FBTztnQkFDTCxPQUFPLEVBQUUsSUFBSTtnQkFDYixlQUFlLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO2FBQ3pDLENBQUM7UUFDSixDQUFDO1FBRUQsNkJBQTZCO1FBQzdCLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3JDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQzVCLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQ3JFLENBQUM7UUFFRixPQUFPO1lBQ0wsT0FBTyxFQUFFLEtBQUs7WUFDZCxlQUFlLEVBQUUsQ0FBQztZQUNsQixZQUFZO1NBQ2IsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU07UUFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkIsTUFBTSxTQUFTLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUM7UUFFNUMsSUFBSSxTQUFTLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUM1QyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDNUUsTUFBTSxXQUFXLEdBQUcsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUM7WUFFOUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekUsSUFBSSxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUM7UUFDNUIsQ0FBQztJQUNILENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsYUFBYTtRQUNYLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDakMsQ0FBQztDQUNGO0FBRUQsNEJBQTRCO0FBQ2YsUUFBQSxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogUmF0ZSBMaW1pdGVyIFNlcnZpY2VcclxuICogXHJcbiAqIEltcGxlbWVudHMgdG9rZW4gYnVja2V0IGFsZ29yaXRobSBmb3IgcmF0ZSBsaW1pdGluZyBTTlMgQVBJIGNhbGxzLlxyXG4gKiBUcmFja3MgQVBJIGNhbGwgcmF0ZXMgcGVyIHRvcGljIGFuZCB0aHJvdHRsZXMgcmVxdWVzdHMgd2hlbiBhcHByb2FjaGluZyBsaW1pdHMuXHJcbiAqL1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBSYXRlTGltaXRDb25maWcge1xyXG4gIG1heFRva2VuczogbnVtYmVyOyAvLyBNYXhpbXVtIHRva2VucyBpbiBidWNrZXRcclxuICByZWZpbGxSYXRlOiBudW1iZXI7IC8vIFRva2VucyBhZGRlZCBwZXIgc2Vjb25kXHJcbiAgcmVmaWxsSW50ZXJ2YWw6IG51bWJlcjsgLy8gSW50ZXJ2YWwgaW4gbXMgZm9yIHJlZmlsbFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJhdGVMaW1pdFJlc3VsdCB7XHJcbiAgYWxsb3dlZDogYm9vbGVhbjtcclxuICByZW1haW5pbmdUb2tlbnM6IG51bWJlcjtcclxuICByZXRyeUFmdGVyTXM/OiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBSYXRlTGltaXRlclNlcnZpY2Uge1xyXG4gIHByaXZhdGUgYnVja2V0czogTWFwPHN0cmluZywgVG9rZW5CdWNrZXQ+O1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgREVGQVVMVF9DT05GSUc6IFJhdGVMaW1pdENvbmZpZyA9IHtcclxuICAgIG1heFRva2VuczogMTAwLCAvLyBTTlMgZGVmYXVsdDogMTAwIFRQUyBwZXIgdG9waWNcclxuICAgIHJlZmlsbFJhdGU6IDEwMCwgLy8gUmVmaWxsIDEwMCB0b2tlbnMgcGVyIHNlY29uZFxyXG4gICAgcmVmaWxsSW50ZXJ2YWw6IDEwMDAsIC8vIFJlZmlsbCBldmVyeSBzZWNvbmRcclxuICB9O1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuYnVja2V0cyA9IG5ldyBNYXAoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHJlcXVlc3QgaXMgYWxsb3dlZCBhbmQgY29uc3VtZSB0b2tlbiBpZiBhdmFpbGFibGVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdG9waWNBcm4gLSBTTlMgdG9waWMgQVJOICh1c2VkIGFzIGJ1Y2tldCBrZXkpXHJcbiAgICogQHBhcmFtIGNvbmZpZyAtIE9wdGlvbmFsIHJhdGUgbGltaXQgY29uZmlndXJhdGlvblxyXG4gICAqIEByZXR1cm5zIFJhdGUgbGltaXQgcmVzdWx0XHJcbiAgICovXHJcbiAgYXN5bmMgY2hlY2tSYXRlTGltaXQoXHJcbiAgICB0b3BpY0Fybjogc3RyaW5nLFxyXG4gICAgY29uZmlnPzogUGFydGlhbDxSYXRlTGltaXRDb25maWc+XHJcbiAgKTogUHJvbWlzZTxSYXRlTGltaXRSZXN1bHQ+IHtcclxuICAgIGNvbnN0IGJ1Y2tldCA9IHRoaXMuZ2V0T3JDcmVhdGVCdWNrZXQodG9waWNBcm4sIGNvbmZpZyk7XHJcbiAgICByZXR1cm4gYnVja2V0LmNvbnN1bWUoKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBvciBjcmVhdGUgdG9rZW4gYnVja2V0IGZvciB0b3BpY1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0b3BpY0FybiAtIFNOUyB0b3BpYyBBUk5cclxuICAgKiBAcGFyYW0gY29uZmlnIC0gT3B0aW9uYWwgcmF0ZSBsaW1pdCBjb25maWd1cmF0aW9uXHJcbiAgICogQHJldHVybnMgVG9rZW4gYnVja2V0IGluc3RhbmNlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZXRPckNyZWF0ZUJ1Y2tldChcclxuICAgIHRvcGljQXJuOiBzdHJpbmcsXHJcbiAgICBjb25maWc/OiBQYXJ0aWFsPFJhdGVMaW1pdENvbmZpZz5cclxuICApOiBUb2tlbkJ1Y2tldCB7XHJcbiAgICBpZiAoIXRoaXMuYnVja2V0cy5oYXModG9waWNBcm4pKSB7XHJcbiAgICAgIGNvbnN0IGZpbmFsQ29uZmlnID0geyAuLi50aGlzLkRFRkFVTFRfQ09ORklHLCAuLi5jb25maWcgfTtcclxuICAgICAgdGhpcy5idWNrZXRzLnNldCh0b3BpY0FybiwgbmV3IFRva2VuQnVja2V0KGZpbmFsQ29uZmlnKSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXRzLmdldCh0b3BpY0FybikhO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVzZXQgcmF0ZSBsaW1pdGVyIGZvciB0b3BpYyAodXNlZnVsIGZvciB0ZXN0aW5nKVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0b3BpY0FybiAtIFNOUyB0b3BpYyBBUk5cclxuICAgKi9cclxuICByZXNldCh0b3BpY0Fybj86IHN0cmluZyk6IHZvaWQge1xyXG4gICAgaWYgKHRvcGljQXJuKSB7XHJcbiAgICAgIHRoaXMuYnVja2V0cy5kZWxldGUodG9waWNBcm4pO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5idWNrZXRzLmNsZWFyKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgY3VycmVudCB0b2tlbiBjb3VudCBmb3IgdG9waWNcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdG9waWNBcm4gLSBTTlMgdG9waWMgQVJOXHJcbiAgICogQHJldHVybnMgQ3VycmVudCB0b2tlbiBjb3VudFxyXG4gICAqL1xyXG4gIGdldFRva2VuQ291bnQodG9waWNBcm46IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICBjb25zdCBidWNrZXQgPSB0aGlzLmJ1Y2tldHMuZ2V0KHRvcGljQXJuKTtcclxuICAgIHJldHVybiBidWNrZXQgPyBidWNrZXQuZ2V0VG9rZW5Db3VudCgpIDogdGhpcy5ERUZBVUxUX0NPTkZJRy5tYXhUb2tlbnM7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVG9rZW4gQnVja2V0IGltcGxlbWVudGF0aW9uIGZvciByYXRlIGxpbWl0aW5nXHJcbiAqL1xyXG5jbGFzcyBUb2tlbkJ1Y2tldCB7XHJcbiAgcHJpdmF0ZSB0b2tlbnM6IG51bWJlcjtcclxuICBwcml2YXRlIGxhc3RSZWZpbGxUaW1lOiBudW1iZXI7XHJcbiAgcHJpdmF0ZSBjb25maWc6IFJhdGVMaW1pdENvbmZpZztcclxuXHJcbiAgY29uc3RydWN0b3IoY29uZmlnOiBSYXRlTGltaXRDb25maWcpIHtcclxuICAgIHRoaXMuY29uZmlnID0gY29uZmlnO1xyXG4gICAgdGhpcy50b2tlbnMgPSBjb25maWcubWF4VG9rZW5zO1xyXG4gICAgdGhpcy5sYXN0UmVmaWxsVGltZSA9IERhdGUubm93KCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBdHRlbXB0IHRvIGNvbnN1bWUgYSB0b2tlblxyXG4gICAqIFxyXG4gICAqIEByZXR1cm5zIFJhdGUgbGltaXQgcmVzdWx0XHJcbiAgICovXHJcbiAgY29uc3VtZSgpOiBSYXRlTGltaXRSZXN1bHQge1xyXG4gICAgdGhpcy5yZWZpbGwoKTtcclxuXHJcbiAgICBpZiAodGhpcy50b2tlbnMgPj0gMSkge1xyXG4gICAgICB0aGlzLnRva2VucyAtPSAxO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFsbG93ZWQ6IHRydWUsXHJcbiAgICAgICAgcmVtYWluaW5nVG9rZW5zOiBNYXRoLmZsb29yKHRoaXMudG9rZW5zKSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDYWxjdWxhdGUgcmV0cnkgYWZ0ZXIgdGltZVxyXG4gICAgY29uc3QgdG9rZW5zTmVlZGVkID0gMSAtIHRoaXMudG9rZW5zO1xyXG4gICAgY29uc3QgcmV0cnlBZnRlck1zID0gTWF0aC5jZWlsKFxyXG4gICAgICAodG9rZW5zTmVlZGVkIC8gdGhpcy5jb25maWcucmVmaWxsUmF0ZSkgKiB0aGlzLmNvbmZpZy5yZWZpbGxJbnRlcnZhbFxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBhbGxvd2VkOiBmYWxzZSxcclxuICAgICAgcmVtYWluaW5nVG9rZW5zOiAwLFxyXG4gICAgICByZXRyeUFmdGVyTXMsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVmaWxsIHRva2VucyBiYXNlZCBvbiBlbGFwc2VkIHRpbWVcclxuICAgKi9cclxuICBwcml2YXRlIHJlZmlsbCgpOiB2b2lkIHtcclxuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcbiAgICBjb25zdCBlbGFwc2VkTXMgPSBub3cgLSB0aGlzLmxhc3RSZWZpbGxUaW1lO1xyXG5cclxuICAgIGlmIChlbGFwc2VkTXMgPj0gdGhpcy5jb25maWcucmVmaWxsSW50ZXJ2YWwpIHtcclxuICAgICAgY29uc3QgaW50ZXJ2YWxzRWxhcHNlZCA9IE1hdGguZmxvb3IoZWxhcHNlZE1zIC8gdGhpcy5jb25maWcucmVmaWxsSW50ZXJ2YWwpO1xyXG4gICAgICBjb25zdCB0b2tlbnNUb0FkZCA9IGludGVydmFsc0VsYXBzZWQgKiB0aGlzLmNvbmZpZy5yZWZpbGxSYXRlO1xyXG5cclxuICAgICAgdGhpcy50b2tlbnMgPSBNYXRoLm1pbih0aGlzLnRva2VucyArIHRva2Vuc1RvQWRkLCB0aGlzLmNvbmZpZy5tYXhUb2tlbnMpO1xyXG4gICAgICB0aGlzLmxhc3RSZWZpbGxUaW1lID0gbm93O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGN1cnJlbnQgdG9rZW4gY291bnRcclxuICAgKiBcclxuICAgKiBAcmV0dXJucyBDdXJyZW50IHRva2VuIGNvdW50XHJcbiAgICovXHJcbiAgZ2V0VG9rZW5Db3VudCgpOiBudW1iZXIge1xyXG4gICAgdGhpcy5yZWZpbGwoKTtcclxuICAgIHJldHVybiBNYXRoLmZsb29yKHRoaXMudG9rZW5zKTtcclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IHJhdGVMaW1pdGVyU2VydmljZSA9IG5ldyBSYXRlTGltaXRlclNlcnZpY2UoKTtcclxuIl19