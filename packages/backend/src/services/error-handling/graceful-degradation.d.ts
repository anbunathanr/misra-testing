/**
 * Graceful Degradation Service
 * Provides fallback mechanisms when services are unavailable
 */
import { CircuitState } from './circuit-breaker';
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
export declare class GracefulDegradationService {
    private logger;
    private cache;
    private serviceStatus;
    private defaultConfig;
    constructor();
    /**
     * Execute with graceful degradation
     */
    executeWithFallback<T>(serviceName: string, primaryFn: () => Promise<T>, fallbackFn?: () => Promise<T>, config?: Partial<FallbackConfig>): Promise<T>;
    /**
     * Set cache data
     */
    private setCache;
    /**
     * Get cached data if not expired
     */
    private getCache;
    /**
     * Update service status
     */
    private updateServiceStatus;
    /**
     * Get mock data for service
     */
    private getMockData;
    /**
     * Get all service statuses
     */
    getServiceStatuses(): ServiceStatus[];
    /**
     * Check if service is degraded
     */
    isServiceDegraded(serviceName: string): boolean;
    /**
     * Clear cache for service
     */
    clearCache(serviceName?: string): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        totalEntries: number;
        totalSize: number;
    };
    /**
     * Health check for all services
     */
    performHealthCheck(): Promise<Record<string, boolean>>;
}
export declare const gracefulDegradationService: GracefulDegradationService;
