/**
 * Monitoring Configuration for MISRA Platform
 *
 * Defines monitoring thresholds, alert configurations, and dashboard settings
 * for different environments (dev, staging, production).
 */
export interface MonitoringThresholds {
    errorRate: number;
    workflowFailureRate: number;
    analysisDuration: number;
    apiLatency: number;
    lambdaDuration: number;
    authFailures: number;
}
export interface AlertConfiguration {
    enabled: boolean;
    evaluationPeriods: number;
    period: number;
    treatMissingData: 'breaching' | 'notBreaching' | 'ignore' | 'missing';
}
export interface EnvironmentConfig {
    thresholds: MonitoringThresholds;
    alerts: AlertConfiguration;
    logRetention: number;
    metricsRetention: number;
    enableDetailedMonitoring: boolean;
    enableXRayTracing: boolean;
}
/**
 * Environment-specific monitoring configurations
 */
export declare const MONITORING_CONFIG: Record<string, EnvironmentConfig>;
/**
 * CloudWatch Insights queries for common debugging scenarios
 */
export declare const LOG_INSIGHTS_QUERIES: {
    workflowErrors: {
        name: string;
        description: string;
        query: string;
    };
    analysisPerformance: {
        name: string;
        description: string;
        query: string;
    };
    authenticationIssues: {
        name: string;
        description: string;
        query: string;
    };
    otpVerificationTracking: {
        name: string;
        description: string;
        query: string;
    };
    fileUploadIssues: {
        name: string;
        description: string;
        query: string;
    };
    complianceScoreAnalysis: {
        name: string;
        description: string;
        query: string;
    };
    correlationTracing: {
        name: string;
        description: string;
        query: string;
    };
    securityEvents: {
        name: string;
        description: string;
        query: string;
    };
};
/**
 * Custom metric definitions for the MISRA Platform
 */
export declare const CUSTOM_METRICS: {
    workflow: string[];
    analysis: string[];
    authentication: string[];
    fileOperations: string[];
    system: string[];
};
/**
 * Dashboard widget configurations
 */
export declare const DASHBOARD_WIDGETS: {
    workflowOverview: {
        title: string;
        type: string;
        metrics: string[];
        period: number;
        stat: string;
    };
    workflowSuccessRate: {
        title: string;
        type: string;
        expression: string;
        metrics: {
            started: string;
            completed: string;
        };
    };
    analysisPerformance: {
        title: string;
        type: string;
        metrics: string[];
        period: number;
        stat: string;
    };
    complianceScores: {
        title: string;
        type: string;
        metrics: string[];
        period: number;
        stat: string;
    };
    authenticationMetrics: {
        title: string;
        type: string;
        metrics: string[];
        period: number;
        stat: string;
    };
    systemHealth: {
        title: string;
        type: string;
        metrics: string[];
        period: number;
        stat: string;
    };
};
/**
 * Get monitoring configuration for environment
 */
export declare function getMonitoringConfig(environment: string): EnvironmentConfig;
/**
 * Get log retention days for environment
 */
export declare function getLogRetentionDays(environment: string): number;
/**
 * Check if alerts should be enabled for environment
 */
export declare function shouldEnableAlerts(environment: string): boolean;
/**
 * Get threshold values for environment
 */
export declare function getThresholds(environment: string): MonitoringThresholds;
/**
 * Get alert configuration for environment
 */
export declare function getAlertConfig(environment: string): AlertConfiguration;
