/**
 * CloudWatch Monitoring Service
 * Provides comprehensive monitoring and alerting for production error handling
 */
export interface MetricData {
    metricName: string;
    value: number;
    unit: 'Count' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'Percent' | 'None';
    dimensions?: Record<string, string>;
    timestamp?: Date;
}
export interface AlarmConfig {
    alarmName: string;
    metricName: string;
    threshold: number;
    comparisonOperator: 'GreaterThanThreshold' | 'LessThanThreshold' | 'GreaterThanOrEqualToThreshold' | 'LessThanOrEqualToThreshold';
    evaluationPeriods: number;
    period: number;
    statistic: 'Average' | 'Sum' | 'Maximum' | 'Minimum' | 'SampleCount';
}
/**
 * CloudWatch monitoring service for production error handling
 */
export declare class CloudWatchMonitoringService {
    private cloudWatchClient;
    private logger;
    private namespace;
    constructor(region?: string, namespace?: string);
    /**
     * Put custom metric to CloudWatch
     */
    putMetric(metric: MetricData): Promise<void>;
    /**
     * Put multiple metrics to CloudWatch
     */
    putMetrics(metrics: MetricData[]): Promise<void>;
    /**
     * Record error metrics
     */
    recordError(errorType: string, serviceName: string, errorCode?: string, userId?: string): Promise<void>;
    /**
     * Record performance metrics
     */
    recordPerformance(operationName: string, duration: number, serviceName: string, success?: boolean): Promise<void>;
    /**
     * Record circuit breaker metrics
     */
    recordCircuitBreakerState(serviceName: string, state: 'CLOSED' | 'OPEN' | 'HALF_OPEN', failureCount: number, successCount: number): Promise<void>;
    /**
     * Record retry metrics
     */
    recordRetryAttempt(operationName: string, attemptNumber: number, success: boolean, serviceName: string): Promise<void>;
    /**
     * Record user activity metrics
     */
    recordUserActivity(activityType: string, userId: string, organizationId?: string): Promise<void>;
    /**
     * Record system health metrics
     */
    recordSystemHealth(serviceName: string, isHealthy: boolean, responseTime?: number): Promise<void>;
    /**
     * Create custom dashboard for monitoring
     */
    getDashboardConfig(): any;
    /**
     * Get recommended alarms configuration
     */
    getRecommendedAlarms(): AlarmConfig[];
}
export declare const cloudWatchMonitoringService: CloudWatchMonitoringService;
