/**
 * Custom Metrics Utility for Production Lambda Functions
 * Provides CloudWatch custom metrics integration and performance monitoring
 */
export interface MetricData {
    name: string;
    value: number;
    unit: string;
    dimensions?: {
        [key: string]: string;
    };
    timestamp?: Date;
}
export interface PerformanceMetrics {
    functionName: string;
    duration: number;
    memoryUsed: number;
    coldStart: boolean;
    correlationId?: string;
}
export declare class MetricsCollector {
    private cloudWatch;
    private logger;
    private namespace;
    private metricsBuffer;
    private bufferSize;
    private flushInterval;
    private flushTimer?;
    constructor(namespace?: string, bufferSize?: number, flushInterval?: number);
    /**
     * Record a custom metric
     */
    recordMetric(name: string, value: number, unit?: string, dimensions?: {
        [key: string]: string;
    }): Promise<void>;
    /**
     * Record performance metrics for Lambda function
     */
    recordPerformanceMetrics(metrics: PerformanceMetrics): Promise<void>;
    /**
     * Record business metrics
     */
    recordBusinessMetric(operation: string, success: boolean, duration?: number, additionalDimensions?: {
        [key: string]: string;
    }): Promise<void>;
    /**
     * Record API metrics
     */
    recordApiMetrics(method: string, path: string, statusCode: number, duration: number, correlationId?: string): Promise<void>;
    /**
     * Record MISRA analysis specific metrics
     */
    recordAnalysisMetrics(fileType: string, rulesChecked: number, violationsFound: number, complianceScore: number, duration: number, correlationId?: string): Promise<void>;
    /**
     * Record authentication metrics
     */
    recordAuthMetrics(operation: 'login' | 'register' | 'refresh' | 'logout', success: boolean, mfaEnabled?: boolean, correlationId?: string): Promise<void>;
    /**
     * Flush metrics buffer to CloudWatch
     */
    flush(): Promise<void>;
    /**
     * Start auto-flush timer
     */
    private startAutoFlush;
    /**
     * Stop auto-flush timer and flush remaining metrics
     */
    shutdown(): Promise<void>;
}
/**
 * Get or create global metrics collector
 */
export declare function getMetricsCollector(): MetricsCollector;
/**
 * Convenience function to record a metric
 */
export declare function recordMetric(name: string, value: number, unit?: string, dimensions?: {
    [key: string]: string;
}): Promise<void>;
/**
 * Decorator for automatic performance monitoring
 */
export declare function withPerformanceMonitoring(functionName: string): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
