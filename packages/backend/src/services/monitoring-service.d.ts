export interface MetricData {
    MetricName: string;
    Value: number;
    Unit: string;
    Timestamp?: Date;
    Dimensions?: Array<{
        Name: string;
        Value: string;
    }>;
}
export interface HealthCheckResult {
    service: string;
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTime: number;
    details?: Record<string, any>;
    timestamp: Date;
}
export interface PerformanceMetrics {
    operation: string;
    duration: number;
    success: boolean;
    errorType?: string;
    metadata?: Record<string, any>;
}
/**
 * Comprehensive Monitoring Service for MISRA Platform
 *
 * Provides centralized monitoring, metrics collection, and health checking
 * for all platform components. Integrates with CloudWatch for alerting
 * and dashboard visualization.
 *
 * Features:
 * - Custom metrics publishing to CloudWatch
 * - Health check monitoring for all services
 * - Performance metrics collection and analysis
 * - Business KPI tracking
 * - Security event monitoring
 * - Anomaly detection and alerting
 */
export declare class MonitoringService {
    private cloudWatch;
    private logger;
    private namespace;
    constructor(region?: string, namespace?: string);
    /**
     * Publish custom metric to CloudWatch
     */
    publishMetric(metricData: MetricData): Promise<void>;
    /**
     * Publish multiple metrics in batch
     */
    publishMetrics(metrics: MetricData[]): Promise<void>;
    /**
     * Record business metrics
     */
    recordBusinessMetric(name: string, value: number, dimensions?: Record<string, string>): Promise<void>;
    /**
     * Record performance metrics
     */
    recordPerformanceMetric(metrics: PerformanceMetrics): Promise<void>;
    /**
     * Record user journey metrics
     */
    recordUserJourney(step: string, status: 'started' | 'completed' | 'failed', userId?: string, duration?: number): Promise<void>;
    /**
     * Record analysis metrics
     */
    recordAnalysisMetrics(analysisId: string, fileId: string, complianceScore: number, violationCount: number, duration: number, success: boolean): Promise<void>;
    /**
     * Record authentication metrics
     */
    recordAuthMetrics(event: string, success: boolean, userId?: string, method?: string): Promise<void>;
    /**
     * Record file operation metrics
     */
    recordFileMetrics(operation: string, fileId: string, fileSize?: number, success?: boolean, duration?: number): Promise<void>;
    /**
     * Record security events
     */
    recordSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', userId?: string, details?: Record<string, any>): Promise<void>;
    /**
     * Perform health check on service
     */
    performHealthCheck(serviceName: string, healthCheckFn: () => Promise<any>): Promise<HealthCheckResult>;
    /**
     * Record health check results
     */
    private recordHealthCheck;
    /**
     * Monitor API Gateway metrics
     */
    monitorApiGateway(apiName: string, method: string, resource: string, statusCode: number, latency: number): Promise<void>;
    /**
     * Monitor Lambda function metrics
     */
    monitorLambdaFunction(functionName: string, duration: number, memoryUsed: number, success: boolean, errorType?: string): Promise<void>;
    /**
     * Monitor DynamoDB operations
     */
    monitorDynamoDBOperation(tableName: string, operation: string, success: boolean, duration: number, itemCount?: number): Promise<void>;
    /**
     * Monitor S3 operations
     */
    monitorS3Operation(bucketName: string, operation: string, success: boolean, duration: number, objectSize?: number): Promise<void>;
    /**
     * Create comprehensive system health report
     */
    createHealthReport(): Promise<{
        overall: 'healthy' | 'degraded' | 'unhealthy';
        services: HealthCheckResult[];
        timestamp: Date;
    }>;
}
export declare const monitoringService: MonitoringService;
