/**
 * Rate Limiter Service
 *
 * Implements token bucket algorithm for rate limiting SNS API calls.
 * Tracks API call rates per topic and throttles requests when approaching limits.
 */
export interface RateLimitConfig {
    maxTokens: number;
    refillRate: number;
    refillInterval: number;
}
export interface RateLimitResult {
    allowed: boolean;
    remainingTokens: number;
    retryAfterMs?: number;
}
export declare class RateLimiterService {
    private buckets;
    private readonly DEFAULT_CONFIG;
    constructor();
    /**
     * Check if request is allowed and consume token if available
     *
     * @param topicArn - SNS topic ARN (used as bucket key)
     * @param config - Optional rate limit configuration
     * @returns Rate limit result
     */
    checkRateLimit(topicArn: string, config?: Partial<RateLimitConfig>): Promise<RateLimitResult>;
    /**
     * Get or create token bucket for topic
     *
     * @param topicArn - SNS topic ARN
     * @param config - Optional rate limit configuration
     * @returns Token bucket instance
     */
    private getOrCreateBucket;
    /**
     * Reset rate limiter for topic (useful for testing)
     *
     * @param topicArn - SNS topic ARN
     */
    reset(topicArn?: string): void;
    /**
     * Get current token count for topic
     *
     * @param topicArn - SNS topic ARN
     * @returns Current token count
     */
    getTokenCount(topicArn: string): number;
}
export declare const rateLimiterService: RateLimiterService;
