import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
export interface CloudWatchMonitoringProps {
    environment: 'dev' | 'staging' | 'production';
    api: apigateway.RestApi;
    lambdaFunctions: {
        [key: string]: lambda.Function;
    };
    alertEmail?: string;
}
/**
 * CloudWatch Monitoring Infrastructure
 *
 * Provides comprehensive monitoring for the MISRA Platform including:
 * - Log groups for all Lambda functions with proper retention
 * - Custom metrics for analysis performance and workflow tracking
 * - Structured logging with correlation IDs
 * - Monitoring dashboards for production visibility
 * - Alarms for error rates, performance degradation, and system health
 */
export declare class CloudWatchMonitoring extends Construct {
    readonly logGroups: {
        [key: string]: logs.LogGroup;
    };
    readonly dashboard: cloudwatch.Dashboard;
    readonly alarmTopic: sns.Topic;
    readonly customMetrics: {
        [key: string]: cloudwatch.Metric;
    };
    constructor(scope: Construct, id: string, props: CloudWatchMonitoringProps);
    private createAlarmTopic;
    private createLogGroups;
    private createCustomMetrics;
    private createMonitoringDashboard;
    private createAlarms;
    private createLogInsightsQueries;
    /**
     * Create structured logging configuration for Lambda functions
     */
    getStructuredLoggingConfig(): {
        [key: string]: string;
    };
    /**
     * Get CloudWatch metrics configuration for Lambda functions
     */
    getMetricsConfig(): {
        [key: string]: string;
    };
    /**
     * Get X-Ray tracing configuration for Lambda functions
     */
    getXRayConfig(): {
        [key: string]: string;
    };
    /**
     * Add X-Ray tracing permissions to Lambda execution role
     */
    addXRayPermissions(role: iam.IRole): void;
}
