/**
 * Circuit Breaker Service
 * Implements circuit breaker pattern for external service calls
 * Prevents cascading failures and provides graceful degradation
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxAttempts: number;
  monitoringWindowMs?: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  totalRequests: number;
  failureRate: number;
}

/**
 * Circuit Breaker implementation for production error handling
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private totalRequests: number = 0;
  private readonly config: Required<CircuitBreakerConfig>;

  constructor(config: CircuitBreakerConfig) {
    this.config = {
      monitoringWindowMs: 60000, // 1 minute default
      ...config
    };
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successCount++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      if (this.successCount >= this.config.halfOpenMaxAttempts) {
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.OPEN;
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
    }
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs;
  }

  /**
   * Reset circuit to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }

  /**
   * Get current circuit breaker metrics
   */
  getMetrics(): CircuitBreakerMetrics {
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
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Force circuit to open state (for testing/maintenance)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.lastFailureTime = Date.now();
  }

  /**
   * Check if circuit is healthy
   */
  isHealthy(): boolean {
    return this.state === CircuitState.CLOSED || 
           (this.state === CircuitState.HALF_OPEN && this.successCount > 0);
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
export class CircuitBreakerManager {
  private breakers = new Map<string, CircuitBreaker>();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 60000,
    halfOpenMaxAttempts: 3,
    monitoringWindowMs: 60000
  };

  /**
   * Get or create circuit breaker for a service
   */
  getBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(serviceName)) {
      const breakerConfig = { ...this.defaultConfig, ...config };
      this.breakers.set(serviceName, new CircuitBreaker(breakerConfig));
    }
    return this.breakers.get(serviceName)!;
  }

  /**
   * Execute function with circuit breaker for specific service
   */
  async executeWithBreaker<T>(
    serviceName: string, 
    fn: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const breaker = this.getBreaker(serviceName, config);
    return breaker.execute(fn);
  }

  /**
   * Get metrics for all circuit breakers
   */
  getAllMetrics(): Record<string, CircuitBreakerMetrics> {
    const metrics: Record<string, CircuitBreakerMetrics> = {};
    for (const [serviceName, breaker] of this.breakers) {
      metrics[serviceName] = breaker.getMetrics();
    }
    return metrics;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): Record<string, boolean> {
    const status: Record<string, boolean> = {};
    for (const [serviceName, breaker] of this.breakers) {
      status[serviceName] = breaker.isHealthy();
    }
    return status;
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();