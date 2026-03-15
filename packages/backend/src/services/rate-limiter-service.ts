/**
 * Rate Limiter Service
 * 
 * Implements token bucket algorithm for rate limiting SNS API calls.
 * Tracks API call rates per topic and throttles requests when approaching limits.
 */

export interface RateLimitConfig {
  maxTokens: number; // Maximum tokens in bucket
  refillRate: number; // Tokens added per second
  refillInterval: number; // Interval in ms for refill
}

export interface RateLimitResult {
  allowed: boolean;
  remainingTokens: number;
  retryAfterMs?: number;
}

export class RateLimiterService {
  private buckets: Map<string, TokenBucket>;
  private readonly DEFAULT_CONFIG: RateLimitConfig = {
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
  async checkRateLimit(
    topicArn: string,
    config?: Partial<RateLimitConfig>
  ): Promise<RateLimitResult> {
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
  private getOrCreateBucket(
    topicArn: string,
    config?: Partial<RateLimitConfig>
  ): TokenBucket {
    if (!this.buckets.has(topicArn)) {
      const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
      this.buckets.set(topicArn, new TokenBucket(finalConfig));
    }
    return this.buckets.get(topicArn)!;
  }

  /**
   * Reset rate limiter for topic (useful for testing)
   * 
   * @param topicArn - SNS topic ARN
   */
  reset(topicArn?: string): void {
    if (topicArn) {
      this.buckets.delete(topicArn);
    } else {
      this.buckets.clear();
    }
  }

  /**
   * Get current token count for topic
   * 
   * @param topicArn - SNS topic ARN
   * @returns Current token count
   */
  getTokenCount(topicArn: string): number {
    const bucket = this.buckets.get(topicArn);
    return bucket ? bucket.getTokenCount() : this.DEFAULT_CONFIG.maxTokens;
  }
}

/**
 * Token Bucket implementation for rate limiting
 */
class TokenBucket {
  private tokens: number;
  private lastRefillTime: number;
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.tokens = config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Attempt to consume a token
   * 
   * @returns Rate limit result
   */
  consume(): RateLimitResult {
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
    const retryAfterMs = Math.ceil(
      (tokensNeeded / this.config.refillRate) * this.config.refillInterval
    );

    return {
      allowed: false,
      remainingTokens: 0,
      retryAfterMs,
    };
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
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
  getTokenCount(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// Export singleton instance
export const rateLimiterService = new RateLimiterService();
