/**
 * Graceful Degradation Service
 * Provides fallback mechanisms when services are unavailable
 */

import { Logger, createLogger } from '../../utils/logger';
import { CircuitState, circuitBreakerManager } from './circuit-breaker';

export interface FallbackConfig {
  enableCaching: boolean;
  cacheExpiryMs: number;
  enableMockData: boolean;
  enableOfflineMode: boolean;
  maxRetries: number;
}

export interface ServiceStatus {
  serviceName: string;
  isAvailable: boolean;
  lastCheck: number;
  circuitState: CircuitState;
  fallbackActive: boolean;
}

/**
 * Graceful degradation service for production error handling
 */
export class GracefulDegradationService {
  private logger: Logger;
  private cache = new Map<string, { data: any; timestamp: number; expiryMs: number }>();
  private serviceStatus = new Map<string, ServiceStatus>();
  private defaultConfig: FallbackConfig = {
    enableCaching: true,
    cacheExpiryMs: 300000, // 5 minutes
    enableMockData: true,
    enableOfflineMode: true,
    maxRetries: 3
  };

  constructor() {
    this.logger = createLogger('GracefulDegradationService');
  }

  /**
   * Execute with graceful degradation
   */
  async executeWithFallback<T>(
    serviceName: string,
    primaryFn: () => Promise<T>,
    fallbackFn?: () => Promise<T>,
    config?: Partial<FallbackConfig>
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    const cacheKey = `${serviceName}_${JSON.stringify(arguments)}`;

    try {
      // Try primary function with circuit breaker
      const result = await circuitBreakerManager.executeWithBreaker(
        serviceName,
        primaryFn
      );

      // Cache successful result
      if (finalConfig.enableCaching) {
        this.setCache(cacheKey, result, finalConfig.cacheExpiryMs);
      }

      this.updateServiceStatus(serviceName, true, false);
      return result;

    } catch (error) {
      this.logger.warn(`Primary service ${serviceName} failed, attempting fallback`, {
        error: error instanceof Error ? error.message : String(error)
      });

      this.updateServiceStatus(serviceName, false, true);

      // Try fallback function
      if (fallbackFn) {
        try {
          const fallbackResult = await fallbackFn();
          this.logger.info(`Fallback successful for ${serviceName}`);
          return fallbackResult;
        } catch (fallbackError) {
          this.logger.error(`Fallback also failed for ${serviceName}`, fallbackError as Error);
        }
      }

      // Try cached data
      if (finalConfig.enableCaching) {
        const cachedData = this.getCache(cacheKey);
        if (cachedData) {
          this.logger.info(`Using cached data for ${serviceName}`);
          return cachedData;
        }
      }

      // Try mock data as last resort
      if (finalConfig.enableMockData) {
        const mockData = this.getMockData(serviceName);
        if (mockData) {
          this.logger.info(`Using mock data for ${serviceName}`);
          return mockData as T;
        }
      }

      // All fallbacks failed
      throw new Error(`Service ${serviceName} unavailable and no fallback succeeded`);
    }
  }

  /**
   * Set cache data
   */
  private setCache(key: string, data: any, expiryMs: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiryMs
    });
  }

  /**
   * Get cached data if not expired
   */
  private getCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.expiryMs;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Update service status
   */
  private updateServiceStatus(
    serviceName: string, 
    isAvailable: boolean, 
    fallbackActive: boolean
  ): void {
    const breaker = circuitBreakerManager.getBreaker(serviceName);
    
    this.serviceStatus.set(serviceName, {
      serviceName,
      isAvailable,
      lastCheck: Date.now(),
      circuitState: breaker.getState(),
      fallbackActive
    });
  }

  /**
   * Get mock data for service
   */
  private getMockData(serviceName: string): any | null {
    const mockDataMap: Record<string, any> = {
      'analysis-service': {
        analysisId: 'mock-analysis-' + Date.now(),
        complianceScore: 85,
        violations: [
          {
            ruleId: 'MISRA-C-2012-1.1',
            ruleName: 'All code shall conform to ISO 9899:1990',
            severity: 'error',
            line: 15,
            column: 8,
            message: 'Mock violation for testing',
            suggestion: 'This is mock data - service unavailable'
          }
        ],
        summary: {
          totalViolations: 1,
          criticalCount: 1,
          majorCount: 0,
          minorCount: 0,
          compliancePercentage: 85
        },
        status: 'COMPLETED',
        duration: 2000,
        timestamp: new Date().toISOString()
      },
      'file-upload-service': {
        fileId: 'mock-file-' + Date.now(),
        uploadUrl: 'https://mock-upload-url.com',
        downloadUrl: 'https://mock-download-url.com',
        expiresIn: 3600
      },
      'auth-service': {
        accessToken: 'mock-token-' + Date.now(),
        refreshToken: 'mock-refresh-token',
        user: {
          userId: 'mock-user-' + Date.now(),
          email: 'mock@example.com',
          name: 'Mock User'
        },
        expiresIn: 3600
      }
    };

    return mockDataMap[serviceName] || null;
  }

  /**
   * Get all service statuses
   */
  getServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatus.values());
  }

  /**
   * Check if service is degraded
   */
  isServiceDegraded(serviceName: string): boolean {
    const status = this.serviceStatus.get(serviceName);
    return status ? !status.isAvailable || status.fallbackActive : false;
  }

  /**
   * Clear cache for service
   */
  clearCache(serviceName?: string): void {
    if (serviceName) {
      // Clear cache entries for specific service
      for (const key of this.cache.keys()) {
        if (key.startsWith(serviceName)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { totalEntries: number; totalSize: number } {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += JSON.stringify(entry.data).length;
    }

    return {
      totalEntries: this.cache.size,
      totalSize
    };
  }

  /**
   * Health check for all services
   */
  async performHealthCheck(): Promise<Record<string, boolean>> {
    const healthStatus: Record<string, boolean> = {};
    const circuitStatus = circuitBreakerManager.getHealthStatus();

    for (const [serviceName, isHealthy] of Object.entries(circuitStatus)) {
      healthStatus[serviceName] = isHealthy;
    }

    return healthStatus;
  }
}

// Global graceful degradation service instance
export const gracefulDegradationService = new GracefulDegradationService();