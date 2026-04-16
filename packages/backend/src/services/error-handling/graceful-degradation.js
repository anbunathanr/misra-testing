"use strict";
/**
 * Graceful Degradation Service
 * Provides fallback mechanisms when services are unavailable
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gracefulDegradationService = exports.GracefulDegradationService = void 0;
const logger_1 = require("../../utils/logger");
const circuit_breaker_1 = require("./circuit-breaker");
/**
 * Graceful degradation service for production error handling
 */
class GracefulDegradationService {
    logger;
    cache = new Map();
    serviceStatus = new Map();
    defaultConfig = {
        enableCaching: true,
        cacheExpiryMs: 300000, // 5 minutes
        enableMockData: true,
        enableOfflineMode: true,
        maxRetries: 3
    };
    constructor() {
        this.logger = (0, logger_1.createLogger)('GracefulDegradationService');
    }
    /**
     * Execute with graceful degradation
     */
    async executeWithFallback(serviceName, primaryFn, fallbackFn, config) {
        const finalConfig = { ...this.defaultConfig, ...config };
        const cacheKey = `${serviceName}_${JSON.stringify(arguments)}`;
        try {
            // Try primary function with circuit breaker
            const result = await circuit_breaker_1.circuitBreakerManager.executeWithBreaker(serviceName, primaryFn);
            // Cache successful result
            if (finalConfig.enableCaching) {
                this.setCache(cacheKey, result, finalConfig.cacheExpiryMs);
            }
            this.updateServiceStatus(serviceName, true, false);
            return result;
        }
        catch (error) {
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
                }
                catch (fallbackError) {
                    this.logger.error(`Fallback also failed for ${serviceName}`, fallbackError);
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
                    return mockData;
                }
            }
            // All fallbacks failed
            throw new Error(`Service ${serviceName} unavailable and no fallback succeeded`);
        }
    }
    /**
     * Set cache data
     */
    setCache(key, data, expiryMs) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            expiryMs
        });
    }
    /**
     * Get cached data if not expired
     */
    getCache(key) {
        const cached = this.cache.get(key);
        if (!cached)
            return null;
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
    updateServiceStatus(serviceName, isAvailable, fallbackActive) {
        const breaker = circuit_breaker_1.circuitBreakerManager.getBreaker(serviceName);
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
    getMockData(serviceName) {
        const mockDataMap = {
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
    getServiceStatuses() {
        return Array.from(this.serviceStatus.values());
    }
    /**
     * Check if service is degraded
     */
    isServiceDegraded(serviceName) {
        const status = this.serviceStatus.get(serviceName);
        return status ? !status.isAvailable || status.fallbackActive : false;
    }
    /**
     * Clear cache for service
     */
    clearCache(serviceName) {
        if (serviceName) {
            // Clear cache entries for specific service
            for (const key of this.cache.keys()) {
                if (key.startsWith(serviceName)) {
                    this.cache.delete(key);
                }
            }
        }
        else {
            // Clear all cache
            this.cache.clear();
        }
    }
    /**
     * Get cache statistics
     */
    getCacheStats() {
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
    async performHealthCheck() {
        const healthStatus = {};
        const circuitStatus = circuit_breaker_1.circuitBreakerManager.getHealthStatus();
        for (const [serviceName, isHealthy] of Object.entries(circuitStatus)) {
            healthStatus[serviceName] = isHealthy;
        }
        return healthStatus;
    }
}
exports.GracefulDegradationService = GracefulDegradationService;
// Global graceful degradation service instance
exports.gracefulDegradationService = new GracefulDegradationService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhY2VmdWwtZGVncmFkYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJncmFjZWZ1bC1kZWdyYWRhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCwrQ0FBMEQ7QUFDMUQsdURBQXdFO0FBa0J4RTs7R0FFRztBQUNILE1BQWEsMEJBQTBCO0lBQzdCLE1BQU0sQ0FBUztJQUNmLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBOEQsQ0FBQztJQUM5RSxhQUFhLEdBQUcsSUFBSSxHQUFHLEVBQXlCLENBQUM7SUFDakQsYUFBYSxHQUFtQjtRQUN0QyxhQUFhLEVBQUUsSUFBSTtRQUNuQixhQUFhLEVBQUUsTUFBTSxFQUFFLFlBQVk7UUFDbkMsY0FBYyxFQUFFLElBQUk7UUFDcEIsaUJBQWlCLEVBQUUsSUFBSTtRQUN2QixVQUFVLEVBQUUsQ0FBQztLQUNkLENBQUM7SUFFRjtRQUNFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBQSxxQkFBWSxFQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLG1CQUFtQixDQUN2QixXQUFtQixFQUNuQixTQUEyQixFQUMzQixVQUE2QixFQUM3QixNQUFnQztRQUVoQyxNQUFNLFdBQVcsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQ3pELE1BQU0sUUFBUSxHQUFHLEdBQUcsV0FBVyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUUvRCxJQUFJLENBQUM7WUFDSCw0Q0FBNEM7WUFDNUMsTUFBTSxNQUFNLEdBQUcsTUFBTSx1Q0FBcUIsQ0FBQyxrQkFBa0IsQ0FDM0QsV0FBVyxFQUNYLFNBQVMsQ0FDVixDQUFDO1lBRUYsMEJBQTBCO1lBQzFCLElBQUksV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsUUFB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aWNlXHJcbiAqIFByb3ZpZGVzIGZhbGxiYWNrIG1lY2hhbmlzbXMgd2hlbiBzZXJ2aWNlcyBhcmUgdW5hdmFpbGFibGVcclxuICovXHJcblxyXG5pbXBvcnQgeyBMb2dnZXIsIGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcbmltcG9ydCB7IENpcmN1aXRTdGF0ZSwgY2lyY3VpdEJyZWFrZXJNYW5hZ2VyIH0gZnJvbSAnLi9jaXJjdWl0LWJyZWFrZXInO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGYWxsYmFja0NvbmZpZyB7XHJcbiAgZW5hYmxlQ2FjaGluZzogYm9vbGVhbjtcclxuICBjYWNoZUV4cGlyeU1zOiBudW1iZXI7XHJcbiAgZW5hYmxlTW9ja0RhdGE6IGJvb2xlYW47XHJcbiAgZW5hYmxlT2ZmbGluZU1vZGU6IGJvb2xlYW47XHJcbiAgbWF4UmV0cmllczogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZpY2VTdGF0dXMge1xyXG4gIHNlcnZpY2VOYW1lOiBzdHJpbmc7XHJcbiAgaXNBdmFpbGFibGU6IGJvb2xlYW47XHJcbiAgbGFzdENoZWNrOiBudW1iZXI7XHJcbiAgY2lyY3VpdFN0YXRlOiBDaXJjdWl0U3RhdGU7XHJcbiAgZmFsbGJhY2tBY3RpdmU6IGJvb2xlYW47XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHcmFjZWZ1bCBkZWdyYWRhdGlvbiBzZXJ2aWNlIGZvciBwcm9kdWN0aW9uIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgR3JhY2VmdWxEZWdyYWRhdGlvblNlcnZpY2Uge1xyXG4gIHByaXZhdGUgbG9nZ2VyOiBMb2dnZXI7XHJcbiAgcHJpdmF0ZSBjYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCB7IGRhdGE6IGFueTsgdGltZXN0YW1wOiBudW1iZXI7IGV4cGlyeU1zOiBudW1iZXIgfT4oKTtcclxuICBwcml2YXRlIHNlcnZpY2VTdGF0dXMgPSBuZXcgTWFwPHN0cmluZywgU2VydmljZVN0YXR1cz4oKTtcclxuICBwcml2YXRlIGRlZmF1bHRDb25maWc6IEZhbGxiYWNrQ29uZmlnID0ge1xyXG4gICAgZW5hYmxlQ2FjaGluZzogdHJ1ZSxcclxuICAgIGNhY2hlRXhwaXJ5TXM6IDMwMDAwMCwgLy8gNSBtaW51dGVzXHJcbiAgICBlbmFibGVNb2NrRGF0YTogdHJ1ZSxcclxuICAgIGVuYWJsZU9mZmxpbmVNb2RlOiB0cnVlLFxyXG4gICAgbWF4UmV0cmllczogM1xyXG4gIH07XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5sb2dnZXIgPSBjcmVhdGVMb2dnZXIoJ0dyYWNlZnVsRGVncmFkYXRpb25TZXJ2aWNlJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBFeGVjdXRlIHdpdGggZ3JhY2VmdWwgZGVncmFkYXRpb25cclxuICAgKi9cclxuICBhc3luYyBleGVjdXRlV2l0aEZhbGxiYWNrPFQ+KFxyXG4gICAgc2VydmljZU5hbWU6IHN0cmluZyxcclxuICAgIHByaW1hcnlGbjogKCkgPT4gUHJvbWlzZTxUPixcclxuICAgIGZhbGxiYWNrRm4/OiAoKSA9PiBQcm9taXNlPFQ+LFxyXG4gICAgY29uZmlnPzogUGFydGlhbDxGYWxsYmFja0NvbmZpZz5cclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIGNvbnN0IGZpbmFsQ29uZmlnID0geyAuLi50aGlzLmRlZmF1bHRDb25maWcsIC4uLmNvbmZpZyB9O1xyXG4gICAgY29uc3QgY2FjaGVLZXkgPSBgJHtzZXJ2aWNlTmFtZX1fJHtKU09OLnN0cmluZ2lmeShhcmd1bWVudHMpfWA7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVHJ5IHByaW1hcnkgZnVuY3Rpb24gd2l0aCBjaXJjdWl0IGJyZWFrZXJcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2lyY3VpdEJyZWFrZXJNYW5hZ2VyLmV4ZWN1dGVXaXRoQnJlYWtlcihcclxuICAgICAgICBzZXJ2aWNlTmFtZSxcclxuICAgICAgICBwcmltYXJ5Rm5cclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIENhY2hlIHN1Y2Nlc3NmdWwgcmVzdWx0XHJcbiAgICAgIGlmIChmaW5hbENvbmZpZy5lbmFibGVDYWNoaW5nKSB7XHJcbiAgICAgICAgdGhpcy5zZXRDYWNoZShjYWNoZUtleSwgcmVzdWx0LCBmaW5hbENvbmZpZy5jYWNoZUV4cGlyeU1zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgdGhpcy51cGRhdGVTZXJ2aWNlU3RhdHVzKHNlcnZpY2VOYW1lLCB0cnVlLCBmYWxzZSk7XHJcbiAgICAgIHJldHVybiByZXN1bHQ7XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhpcy5sb2dnZXIud2FybihgUHJpbWFyeSBzZXJ2aWNlICR7c2VydmljZU5hbWV9IGZhaWxlZCwgYXR0ZW1wdGluZyBmYWxsYmFja2AsIHtcclxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgdGhpcy51cGRhdGVTZXJ2aWNlU3RhdHVzKHNlcnZpY2VOYW1lLCBmYWxzZSwgdHJ1ZSk7XHJcblxyXG4gICAgICAvLyBUcnkgZmFsbGJhY2sgZnVuY3Rpb25cclxuICAgICAgaWYgKGZhbGxiYWNrRm4pIHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgZmFsbGJhY2tSZXN1bHQgPSBhd2FpdCBmYWxsYmFja0ZuKCk7XHJcbiAgICAgICAgICB0aGlzLmxvZ2dlci5pbmZvKGBGYWxsYmFjayBzdWNjZXNzZnVsIGZvciAke3NlcnZpY2VOYW1lfWApO1xyXG4gICAgICAgICAgcmV0dXJuIGZhbGxiYWNrUmVzdWx0O1xyXG4gICAgICAgIH0gY2F0Y2ggKGZhbGxiYWNrRXJyb3IpIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmVycm9yKGBGYWxsYmFjayBhbHNvIGZhaWxlZCBmb3IgJHtzZXJ2aWNlTmFtZX1gLCBmYWxsYmFja0Vycm9yIGFzIEVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFRyeSBjYWNoZWQgZGF0YVxyXG4gICAgICBpZiAoZmluYWxDb25maWcuZW5hYmxlQ2FjaGluZykge1xyXG4gICAgICAgIGNvbnN0IGNhY2hlZERhdGEgPSB0aGlzLmdldENhY2hlKGNhY2hlS2V5KTtcclxuICAgICAgICBpZiAoY2FjaGVkRGF0YSkge1xyXG4gICAgICAgICAgdGhpcy5sb2dnZXIuaW5mbyhgVXNpbmcgY2FjaGVkIGRhdGEgZm9yICR7c2VydmljZU5hbWV9YCk7XHJcbiAgICAgICAgICByZXR1cm4gY2FjaGVkRGF0YTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFRyeSBtb2NrIGRhdGEgYXMgbGFzdCByZXNvcnRcclxuICAgICAgaWYgKGZpbmFsQ29uZmlnLmVuYWJsZU1vY2tEYXRhKSB7XHJcbiAgICAgICAgY29uc3QgbW9ja0RhdGEgPSB0aGlzLmdldE1vY2tEYXRhKHNlcnZpY2VOYW1lKTtcclxuICAgICAgICBpZiAobW9ja0RhdGEpIHtcclxuICAgICAgICAgIHRoaXMubG9nZ2VyLmluZm8oYFVzaW5nIG1vY2sgZGF0YSBmb3IgJHtzZXJ2aWNlTmFtZX1gKTtcclxuICAgICAgICAgIHJldHVybiBtb2NrRGF0YSBhcyBUO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQWxsIGZhbGxiYWNrcyBmYWlsZWRcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTZXJ2aWNlICR7c2VydmljZU5hbWV9IHVuYXZhaWxhYmxlIGFuZCBubyBmYWxsYmFjayBzdWNjZWVkZWRgKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFNldCBjYWNoZSBkYXRhXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzZXRDYWNoZShrZXk6IHN0cmluZywgZGF0YTogYW55LCBleHBpcnlNczogbnVtYmVyKTogdm9pZCB7XHJcbiAgICB0aGlzLmNhY2hlLnNldChrZXksIHtcclxuICAgICAgZGF0YSxcclxuICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICBleHBpcnlNc1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgY2FjaGVkIGRhdGEgaWYgbm90IGV4cGlyZWRcclxuICAgKi9cclxuICBwcml2YXRlIGdldENhY2hlKGtleTogc3RyaW5nKTogYW55IHwgbnVsbCB7XHJcbiAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmNhY2hlLmdldChrZXkpO1xyXG4gICAgaWYgKCFjYWNoZWQpIHJldHVybiBudWxsO1xyXG5cclxuICAgIGNvbnN0IGlzRXhwaXJlZCA9IERhdGUubm93KCkgLSBjYWNoZWQudGltZXN0YW1wID4gY2FjaGVkLmV4cGlyeU1zO1xyXG4gICAgaWYgKGlzRXhwaXJlZCkge1xyXG4gICAgICB0aGlzLmNhY2hlLmRlbGV0ZShrZXkpO1xyXG4gICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4gY2FjaGVkLmRhdGE7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgc2VydmljZSBzdGF0dXNcclxuICAgKi9cclxuICBwcml2YXRlIHVwZGF0ZVNlcnZpY2VTdGF0dXMoXHJcbiAgICBzZXJ2aWNlTmFtZTogc3RyaW5nLCBcclxuICAgIGlzQXZhaWxhYmxlOiBib29sZWFuLCBcclxuICAgIGZhbGxiYWNrQWN0aXZlOiBib29sZWFuXHJcbiAgKTogdm9pZCB7XHJcbiAgICBjb25zdCBicmVha2VyID0gY2lyY3VpdEJyZWFrZXJNYW5hZ2VyLmdldEJyZWFrZXIoc2VydmljZU5hbWUpO1xyXG4gICAgXHJcbiAgICB0aGlzLnNlcnZpY2VTdGF0dXMuc2V0KHNlcnZpY2VOYW1lLCB7XHJcbiAgICAgIHNlcnZpY2VOYW1lLFxyXG4gICAgICBpc0F2YWlsYWJsZSxcclxuICAgICAgbGFzdENoZWNrOiBEYXRlLm5vdygpLFxyXG4gICAgICBjaXJjdWl0U3RhdGU6IGJyZWFrZXIuZ2V0U3RhdGUoKSxcclxuICAgICAgZmFsbGJhY2tBY3RpdmVcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IG1vY2sgZGF0YSBmb3Igc2VydmljZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2V0TW9ja0RhdGEoc2VydmljZU5hbWU6IHN0cmluZyk6IGFueSB8IG51bGwge1xyXG4gICAgY29uc3QgbW9ja0RhdGFNYXA6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICdhbmFseXNpcy1zZXJ2aWNlJzoge1xyXG4gICAgICAgIGFuYWx5c2lzSWQ6ICdtb2NrLWFuYWx5c2lzLScgKyBEYXRlLm5vdygpLFxyXG4gICAgICAgIGNvbXBsaWFuY2VTY29yZTogODUsXHJcbiAgICAgICAgdmlvbGF0aW9uczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBydWxlSWQ6ICdNSVNSQS1DLTIwMTItMS4xJyxcclxuICAgICAgICAgICAgcnVsZU5hbWU6ICdBbGwgY29kZSBzaGFsbCBjb25mb3JtIHRvIElTTyA5ODk5OjE5OTAnLFxyXG4gICAgICAgICAgICBzZXZlcml0eTogJ2Vycm9yJyxcclxuICAgICAgICAgICAgbGluZTogMTUsXHJcbiAgICAgICAgICAgIGNvbHVtbjogOCxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ01vY2sgdmlvbGF0aW9uIGZvciB0ZXN0aW5nJyxcclxuICAgICAgICAgICAgc3VnZ2VzdGlvbjogJ1RoaXMgaXMgbW9jayBkYXRhIC0gc2VydmljZSB1bmF2YWlsYWJsZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICBdLFxyXG4gICAgICAgIHN1bW1hcnk6IHtcclxuICAgICAgICAgIHRvdGFsVmlvbGF0aW9uczogMSxcclxuICAgICAgICAgIGNyaXRpY2FsQ291bnQ6IDEsXHJcbiAgICAgICAgICBtYWpvckNvdW50OiAwLFxyXG4gICAgICAgICAgbWlub3JDb3VudDogMCxcclxuICAgICAgICAgIGNvbXBsaWFuY2VQZXJjZW50YWdlOiA4NVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc3RhdHVzOiAnQ09NUExFVEVEJyxcclxuICAgICAgICBkdXJhdGlvbjogMjAwMCxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9LFxyXG4gICAgICAnZmlsZS11cGxvYWQtc2VydmljZSc6IHtcclxuICAgICAgICBmaWxlSWQ6ICdtb2NrLWZpbGUtJyArIERhdGUubm93KCksXHJcbiAgICAgICAgdXBsb2FkVXJsOiAnaHR0cHM6Ly9tb2NrLXVwbG9hZC11cmwuY29tJyxcclxuICAgICAgICBkb3dubG9hZFVybDogJ2h0dHBzOi8vbW9jay1kb3dubG9hZC11cmwuY29tJyxcclxuICAgICAgICBleHBpcmVzSW46IDM2MDBcclxuICAgICAgfSxcclxuICAgICAgJ2F1dGgtc2VydmljZSc6IHtcclxuICAgICAgICBhY2Nlc3NUb2tlbjogJ21vY2stdG9rZW4tJyArIERhdGUubm93KCksXHJcbiAgICAgICAgcmVmcmVzaFRva2VuOiAnbW9jay1yZWZyZXNoLXRva2VuJyxcclxuICAgICAgICB1c2VyOiB7XHJcbiAgICAgICAgICB1c2VySWQ6ICdtb2NrLXVzZXItJyArIERhdGUubm93KCksXHJcbiAgICAgICAgICBlbWFpbDogJ21vY2tAZXhhbXBsZS5jb20nLFxyXG4gICAgICAgICAgbmFtZTogJ01vY2sgVXNlcidcclxuICAgICAgICB9LFxyXG4gICAgICAgIGV4cGlyZXNJbjogMzYwMFxyXG4gICAgICB9XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBtb2NrRGF0YU1hcFtzZXJ2aWNlTmFtZV0gfHwgbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbGwgc2VydmljZSBzdGF0dXNlc1xyXG4gICAqL1xyXG4gIGdldFNlcnZpY2VTdGF0dXNlcygpOiBTZXJ2aWNlU3RhdHVzW10ge1xyXG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5zZXJ2aWNlU3RhdHVzLnZhbHVlcygpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHNlcnZpY2UgaXMgZGVncmFkZWRcclxuICAgKi9cclxuICBpc1NlcnZpY2VEZWdyYWRlZChzZXJ2aWNlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBzdGF0dXMgPSB0aGlzLnNlcnZpY2VTdGF0dXMuZ2V0KHNlcnZpY2VOYW1lKTtcclxuICAgIHJldHVybiBzdGF0dXMgPyAhc3RhdHVzLmlzQXZhaWxhYmxlIHx8IHN0YXR1cy5mYWxsYmFja0FjdGl2ZSA6IGZhbHNlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2xlYXIgY2FjaGUgZm9yIHNlcnZpY2VcclxuICAgKi9cclxuICBjbGVhckNhY2hlKHNlcnZpY2VOYW1lPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICBpZiAoc2VydmljZU5hbWUpIHtcclxuICAgICAgLy8gQ2xlYXIgY2FjaGUgZW50cmllcyBmb3Igc3BlY2lmaWMgc2VydmljZVxyXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiB0aGlzLmNhY2hlLmtleXMoKSkge1xyXG4gICAgICAgIGlmIChrZXkuc3RhcnRzV2l0aChzZXJ2aWNlTmFtZSkpIHtcclxuICAgICAgICAgIHRoaXMuY2FjaGUuZGVsZXRlKGtleSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBDbGVhciBhbGwgY2FjaGVcclxuICAgICAgdGhpcy5jYWNoZS5jbGVhcigpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGNhY2hlIHN0YXRpc3RpY3NcclxuICAgKi9cclxuICBnZXRDYWNoZVN0YXRzKCk6IHsgdG90YWxFbnRyaWVzOiBudW1iZXI7IHRvdGFsU2l6ZTogbnVtYmVyIH0ge1xyXG4gICAgbGV0IHRvdGFsU2l6ZSA9IDA7XHJcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHRoaXMuY2FjaGUudmFsdWVzKCkpIHtcclxuICAgICAgdG90YWxTaXplICs9IEpTT04uc3RyaW5naWZ5KGVudHJ5LmRhdGEpLmxlbmd0aDtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB0b3RhbEVudHJpZXM6IHRoaXMuY2FjaGUuc2l6ZSxcclxuICAgICAgdG90YWxTaXplXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGVhbHRoIGNoZWNrIGZvciBhbGwgc2VydmljZXNcclxuICAgKi9cclxuICBhc3luYyBwZXJmb3JtSGVhbHRoQ2hlY2soKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBib29sZWFuPj4ge1xyXG4gICAgY29uc3QgaGVhbHRoU3RhdHVzOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHt9O1xyXG4gICAgY29uc3QgY2lyY3VpdFN0YXR1cyA9IGNpcmN1aXRCcmVha2VyTWFuYWdlci5nZXRIZWFsdGhTdGF0dXMoKTtcclxuXHJcbiAgICBmb3IgKGNvbnN0IFtzZXJ2aWNlTmFtZSwgaXNIZWFsdGh5XSBvZiBPYmplY3QuZW50cmllcyhjaXJjdWl0U3RhdHVzKSkge1xyXG4gICAgICBoZWFsdGhTdGF0dXNbc2VydmljZU5hbWVdID0gaXNIZWFsdGh5O1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBoZWFsdGhTdGF0dXM7XHJcbiAgfVxyXG59XHJcblxyXG4vLyBHbG9iYWwgZ3JhY2VmdWwgZGVncmFkYXRpb24gc2VydmljZSBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgZ3JhY2VmdWxEZWdyYWRhdGlvblNlcnZpY2UgPSBuZXcgR3JhY2VmdWxEZWdyYWRhdGlvblNlcnZpY2UoKTsiXX0=