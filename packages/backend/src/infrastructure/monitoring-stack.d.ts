import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
export interface MonitoringStackProps {
    environment: string;
    apiGateway: apigateway.RestApi;
    lambdaFunctions: Record<string, lambda.Function>;
    dynamoTables: Record<string, dynamodb.Table>;
    s3Bucket: s3.Bucket;
    alertEmail?: string;
}
/**
 * Comprehensive Monitoring and Alerting Stack for MISRA Production Platform
 *
 * Implements Task 8.2 requirements:
 * - CloudWatch dashboards for API Gateway, Lambda, and DynamoDB metrics
 * - CloudWatch alarms for high error rates and latency
 * - Centralized logging with correlation IDs for request tracing
 * - SNS topics for alert notifications
 * - Custom metrics for business and technical KPIs
 * - Performance monitoring and capacity planning metrics
 * - Security monitoring and anomaly detection
 */
export declare class MonitoringStack extends Construct {
    readonly alertTopic: sns.Topic;
    readonly dashboard: cloudwatch.Dashboard;
    readonly logGroup: logs.LogGroup;
    constructor(scope: Construct, id: string, props: MonitoringStackProps);
    private createDashboard;
    private createAlarms;
    private createCustomMetrics;
    private createLogMetricFilters;
}
