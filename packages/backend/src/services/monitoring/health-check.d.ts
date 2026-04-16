/**
 * Health Check Service
 * Provides comprehensive health monitoring for all system components
 */
export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime: number;
    details?: string;
    lastChecked: string;
}
export interface SystemHealthStatus {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: HealthCheckResult[];
    timestamp: string;
    uptime: number;
}
/**
 * Health check service for monitoring system components
 */
export declare class HealthCheckService {
    private logger;
    private dynamoClient;
    private s3Client;
    private startTime;
    constructor();
    /**
     * Perform comprehensive system health check
     */
    performHealthCheck(): Promise<SystemHealthStatus>;
    /**
     * Check DynamoDB health
     */
    private checkDynamoDBHealth;
    /**
     * Check S3 health
     */
    private checkS3Health;
    /**
     * Check circuit breaker health
     */
    private checkCircuitBreakerHealth;
    /**
     * Check memory health
     */
    private checkMemoryHealth;
    /**
     * Check disk health (Lambda has limited disk space)
     */
    private checkDiskHealth;
    /**
     * Record health metrics to CloudWatch
     */
    private recordHealthMetrics;
    /**
     * Get simple health status for load balancer
     */
    getSimpleHealthStatus(): Promise<{
        status: 'OK' | 'ERROR';
        timestamp: string;
    }>;
    /**
     * Check if system is ready to serve requests
     */
    isReady(): Promise<boolean>;
    /**
     * Check if system is alive (basic liveness check)
     */
    isAlive(): boolean;
}
export declare const healthCheckService: HealthCheckService;
