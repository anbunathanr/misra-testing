export interface LogContext {
    correlationId?: string;
    userId?: string;
    analysisId?: string;
    fileId?: string;
    step?: string;
    operation?: string;
    [key: string]: any;
}
export interface MetricData {
    metricName: string;
    value: number;
    unit: 'Count' | 'Seconds' | 'Milliseconds' | 'Bytes' | 'Percent' | 'None';
    dimensions?: Record<string, string>;
}
/**
 * Structured Logger with CloudWatch Integration
 *
 * Provides structured logging with correlation IDs and automatic CloudWatch metrics
 * for the MISRA Platform autonomous workflow monitoring.
 */
export declare class StructuredLogger {
    private cloudWatch;
    private namespace;
    private environment;
    private enableMetrics;
    constructor(region?: string, namespace?: string, environment?: string);
    /**
     * Generate correlation ID for request tracing
     */
    static generateCorrelationId(): string;
    /**
     * Log structured message with context
     */
    log(level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', message: string, context?: LogContext): void;
    /**
     * Log workflow step with progress tracking
     */
    logWorkflowStep(step: string, status: 'started' | 'completed' | 'failed', context?: LogContext): void;
    /**
     * Log analysis progress with performance metrics
     */
    logAnalysisProgress(analysisId: string, progress: number, rulesProcessed: number, totalRules: number, context?: LogContext): void;
    /**
     * Log authentication events with security context
     */
    logAuthEvent(event: string, success: boolean, context?: LogContext): void;
    /**
     * Log file operations with size and duration
     */
    logFileOperation(operation: string, fileId: string, fileName?: string, fileSize?: number, duration?: number, context?: LogContext): void;
    /**
     * Log performance metrics
     */
    logPerformance(operation: string, duration: number, success: boolean, context?: LogContext): void;
    /**
     * Log security events
     */
    logSecurityEvent(event: string, severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', context?: LogContext): void;
    /**
     * Log compliance score with analysis details
     */
    logComplianceScore(complianceScore: number, analysisId: string, violationCount: number, context?: LogContext): void;
    /**
     * Record custom metric to CloudWatch
     */
    recordMetric(metricData: MetricData): Promise<void>;
    private recordLogMetric;
    private recordWorkflowMetric;
    private recordAnalysisProgressMetric;
    private recordAuthMetric;
    private recordFileMetric;
    private recordPerformanceMetric;
    private recordSecurityMetric;
    private recordComplianceMetric;
}
export declare const structuredLogger: StructuredLogger;
export declare const LoggingUtils: {
    generateCorrelationId: typeof StructuredLogger.generateCorrelationId;
    logWorkflowStep: (step: string, status: "started" | "completed" | "failed", context?: LogContext) => void;
    logAnalysisProgress: (analysisId: string, progress: number, rulesProcessed: number, totalRules: number, context?: LogContext) => void;
    logAuthEvent: (event: string, success: boolean, context?: LogContext) => void;
    logFileOperation: (operation: string, fileId: string, fileName?: string, fileSize?: number, duration?: number, context?: LogContext) => void;
    logPerformance: (operation: string, duration: number, success: boolean, context?: LogContext) => void;
    logSecurityEvent: (event: string, severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", context?: LogContext) => void;
    logComplianceScore: (complianceScore: number, analysisId: string, violationCount: number, context?: LogContext) => void;
};
