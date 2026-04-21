"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringStack = void 0;
const constructs_1 = require("constructs");
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cloudwatchActions = __importStar(require("aws-cdk-lib/aws-cloudwatch-actions"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const snsSubscriptions = __importStar(require("aws-cdk-lib/aws-sns-subscriptions"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cdk = __importStar(require("aws-cdk-lib"));
const aws_cdk_lib_1 = require("aws-cdk-lib");
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
class MonitoringStack extends constructs_1.Construct {
    alertTopic;
    dashboard;
    logGroup;
    constructor(scope, id, props) {
        super(scope, id);
        // Create SNS topic for alerts
        this.alertTopic = new sns.Topic(this, 'AlertTopic', {
            topicName: `misra-platform-alerts-${props.environment}`,
            displayName: `MISRA Platform ${props.environment} Alerts`,
        });
        // Add email subscription if provided
        if (props.alertEmail) {
            this.alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(props.alertEmail));
        }
        // Create centralized log group for correlation IDs
        this.logGroup = new logs.LogGroup(this, 'CentralizedLogGroup', {
            logGroupName: `/misra-platform/${props.environment}/centralized`,
            retention: logs.RetentionDays.ONE_MONTH,
        });
        // Create CloudWatch Dashboard
        this.dashboard = this.createDashboard(props);
        // Create CloudWatch Alarms
        this.createAlarms(props);
        // Create custom metrics
        this.createCustomMetrics(props);
        // Output monitoring resources
        new cdk.CfnOutput(this, 'DashboardURL', {
            value: `https://${cdk.Stack.of(this).region}.console.aws.amazon.com/cloudwatch/home?region=${cdk.Stack.of(this).region}#dashboards:name=${this.dashboard.dashboardName}`,
            description: 'CloudWatch Dashboard URL',
        });
        new cdk.CfnOutput(this, 'AlertTopicArn', {
            value: this.alertTopic.topicArn,
            description: 'SNS Topic ARN for alerts',
        });
    }
    createDashboard(props) {
        const dashboard = new cloudwatch.Dashboard(this, 'MISRAPlatformDashboard', {
            dashboardName: `MISRA-Platform-${props.environment}`,
        });
        // API Gateway Metrics Section
        dashboard.addWidgets(new cloudwatch.TextWidget({
            markdown: `# MISRA Platform ${props.environment} - System Overview\n\n## API Gateway Metrics`,
            width: 24,
            height: 2,
        }));
        // API Gateway Request Count and Latency
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'API Gateway - Request Count',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'Count',
                    dimensionsMap: {
                        ApiName: props.apiGateway.restApiName,
                    },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'API Gateway - Latency',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'Latency',
                    dimensionsMap: {
                        ApiName: props.apiGateway.restApiName,
                    },
                    statistic: 'Average',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'IntegrationLatency',
                    dimensionsMap: {
                        ApiName: props.apiGateway.restApiName,
                    },
                    statistic: 'Average',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            width: 12,
            height: 6,
        }));
        // API Gateway Error Rates
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'API Gateway - Error Rates',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '4XXError',
                    dimensionsMap: {
                        ApiName: props.apiGateway.restApiName,
                    },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '5XXError',
                    dimensionsMap: {
                        ApiName: props.apiGateway.restApiName,
                    },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            width: 24,
            height: 6,
        }));
        // Lambda Functions Section
        dashboard.addWidgets(new cloudwatch.TextWidget({
            markdown: '## Lambda Functions Metrics',
            width: 24,
            height: 1,
        }));
        // Lambda Duration and Invocations
        const lambdaMetrics = Object.entries(props.lambdaFunctions).map(([name, func]) => ({
            name,
            duration: func.metricDuration({ period: aws_cdk_lib_1.Duration.minutes(5) }),
            invocations: func.metricInvocations({ period: aws_cdk_lib_1.Duration.minutes(5) }),
            errors: func.metricErrors({ period: aws_cdk_lib_1.Duration.minutes(5) }),
            throttles: func.metricThrottles({ period: aws_cdk_lib_1.Duration.minutes(5) }),
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Lambda Functions - Duration',
            left: lambdaMetrics.map(m => m.duration),
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'Lambda Functions - Invocations',
            left: lambdaMetrics.map(m => m.invocations),
            width: 12,
            height: 6,
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Lambda Functions - Errors & Throttles',
            left: lambdaMetrics.map(m => m.errors),
            right: lambdaMetrics.map(m => m.throttles),
            width: 24,
            height: 6,
        }));
        // DynamoDB Section
        dashboard.addWidgets(new cloudwatch.TextWidget({
            markdown: '## DynamoDB Metrics',
            width: 24,
            height: 1,
        }));
        // DynamoDB Read/Write Capacity and Throttles
        const dynamoMetrics = Object.entries(props.dynamoTables).map(([name, table]) => ({
            name,
            readCapacity: new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedReadCapacityUnits',
                dimensionsMap: { TableName: table.tableName },
                statistic: 'Sum',
                period: aws_cdk_lib_1.Duration.minutes(5),
            }),
            writeCapacity: new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ConsumedWriteCapacityUnits',
                dimensionsMap: { TableName: table.tableName },
                statistic: 'Sum',
                period: aws_cdk_lib_1.Duration.minutes(5),
            }),
            readThrottles: new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'ReadThrottledEvents',
                dimensionsMap: { TableName: table.tableName },
                statistic: 'Sum',
                period: aws_cdk_lib_1.Duration.minutes(5),
            }),
            writeThrottles: new cloudwatch.Metric({
                namespace: 'AWS/DynamoDB',
                metricName: 'WriteThrottledEvents',
                dimensionsMap: { TableName: table.tableName },
                statistic: 'Sum',
                period: aws_cdk_lib_1.Duration.minutes(5),
            }),
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'DynamoDB - Read Capacity',
            left: dynamoMetrics.map(m => m.readCapacity),
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'DynamoDB - Write Capacity',
            left: dynamoMetrics.map(m => m.writeCapacity),
            width: 12,
            height: 6,
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'DynamoDB - Throttles',
            left: dynamoMetrics.map(m => m.readThrottles),
            right: dynamoMetrics.map(m => m.writeThrottles),
            width: 24,
            height: 6,
        }));
        // S3 Section
        dashboard.addWidgets(new cloudwatch.TextWidget({
            markdown: '## S3 Storage Metrics',
            width: 24,
            height: 1,
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'S3 - Requests',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AWS/S3',
                    metricName: 'AllRequests',
                    dimensionsMap: {
                        BucketName: props.s3Bucket.bucketName,
                    },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            right: [
                new cloudwatch.Metric({
                    namespace: 'AWS/S3',
                    metricName: '4xxErrors',
                    dimensionsMap: {
                        BucketName: props.s3Bucket.bucketName,
                    },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/S3',
                    metricName: '5xxErrors',
                    dimensionsMap: {
                        BucketName: props.s3Bucket.bucketName,
                    },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            width: 24,
            height: 6,
        }));
        // Business Metrics Section
        dashboard.addWidgets(new cloudwatch.TextWidget({
            markdown: '## Business & Performance KPIs',
            width: 24,
            height: 1,
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Analysis Completion Rate',
            left: [
                new cloudwatch.Metric({
                    namespace: 'MISRA/Platform',
                    metricName: 'AnalysisCompleted',
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'MISRA/Platform',
                    metricName: 'AnalysisFailed',
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'User Journey Metrics',
            left: [
                new cloudwatch.Metric({
                    namespace: 'MISRA/Platform',
                    metricName: 'UserRegistrations',
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
                new cloudwatch.Metric({
                    namespace: 'MISRA/Platform',
                    metricName: 'FileUploads',
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
            ],
            width: 12,
            height: 6,
        }));
        return dashboard;
    }
    createAlarms(props) {
        // API Gateway High Error Rate Alarm
        new cloudwatch.Alarm(this, 'APIGatewayHighErrorRate', {
            alarmName: `MISRA-${props.environment}-API-HighErrorRate`,
            alarmDescription: 'API Gateway error rate is above 5%',
            metric: new cloudwatch.MathExpression({
                expression: '(m1 + m2) / m3 * 100',
                usingMetrics: {
                    m1: new cloudwatch.Metric({
                        namespace: 'AWS/ApiGateway',
                        metricName: '4XXError',
                        dimensionsMap: { ApiName: props.apiGateway.restApiName },
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(5),
                    }),
                    m2: new cloudwatch.Metric({
                        namespace: 'AWS/ApiGateway',
                        metricName: '5XXError',
                        dimensionsMap: { ApiName: props.apiGateway.restApiName },
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(5),
                    }),
                    m3: new cloudwatch.Metric({
                        namespace: 'AWS/ApiGateway',
                        metricName: 'Count',
                        dimensionsMap: { ApiName: props.apiGateway.restApiName },
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(5),
                    }),
                },
            }),
            threshold: 5,
            evaluationPeriods: 2,
            datapointsToAlarm: 2,
        }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        // API Gateway High Latency Alarm
        new cloudwatch.Alarm(this, 'APIGatewayHighLatency', {
            alarmName: `MISRA-${props.environment}-API-HighLatency`,
            alarmDescription: 'API Gateway latency is above 2 seconds',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: 'Latency',
                dimensionsMap: { ApiName: props.apiGateway.restApiName },
                statistic: 'Average',
                period: aws_cdk_lib_1.Duration.minutes(5),
            }),
            threshold: 2000, // 2 seconds in milliseconds
            evaluationPeriods: 3,
            datapointsToAlarm: 2,
        }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        // Lambda Function Error Rate Alarms
        Object.entries(props.lambdaFunctions).forEach(([name, func]) => {
            new cloudwatch.Alarm(this, `Lambda${name}ErrorRate`, {
                alarmName: `MISRA-${props.environment}-Lambda-${name}-ErrorRate`,
                alarmDescription: `Lambda function ${name} error rate is above 5%`,
                metric: new cloudwatch.MathExpression({
                    expression: 'm1 / m2 * 100',
                    usingMetrics: {
                        m1: func.metricErrors({ period: aws_cdk_lib_1.Duration.minutes(5) }),
                        m2: func.metricInvocations({ period: aws_cdk_lib_1.Duration.minutes(5) }),
                    },
                }),
                threshold: 5,
                evaluationPeriods: 2,
                datapointsToAlarm: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
            // Lambda Duration Alarm for critical functions
            if (name.includes('analyze-file')) {
                new cloudwatch.Alarm(this, `Lambda${name}Duration`, {
                    alarmName: `MISRA-${props.environment}-Lambda-${name}-Duration`,
                    alarmDescription: `Lambda function ${name} duration is above 4 minutes`,
                    metric: func.metricDuration({ period: aws_cdk_lib_1.Duration.minutes(5) }),
                    threshold: 240000, // 4 minutes in milliseconds
                    evaluationPeriods: 2,
                    datapointsToAlarm: 1,
                }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
            }
        });
        // DynamoDB Throttling Alarms
        Object.entries(props.dynamoTables).forEach(([name, table]) => {
            new cloudwatch.Alarm(this, `DynamoDB${name}ReadThrottles`, {
                alarmName: `MISRA-${props.environment}-DynamoDB-${name}-ReadThrottles`,
                alarmDescription: `DynamoDB table ${name} is experiencing read throttles`,
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'ReadThrottledEvents',
                    dimensionsMap: { TableName: table.tableName },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
                threshold: 1,
                evaluationPeriods: 1,
                datapointsToAlarm: 1,
            }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
            new cloudwatch.Alarm(this, `DynamoDB${name}WriteThrottles`, {
                alarmName: `MISRA-${props.environment}-DynamoDB-${name}-WriteThrottles`,
                alarmDescription: `DynamoDB table ${name} is experiencing write throttles`,
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/DynamoDB',
                    metricName: 'WriteThrottledEvents',
                    dimensionsMap: { TableName: table.tableName },
                    statistic: 'Sum',
                    period: aws_cdk_lib_1.Duration.minutes(5),
                }),
                threshold: 1,
                evaluationPeriods: 1,
                datapointsToAlarm: 1,
            }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        });
        // S3 Error Rate Alarm
        new cloudwatch.Alarm(this, 'S3HighErrorRate', {
            alarmName: `MISRA-${props.environment}-S3-HighErrorRate`,
            alarmDescription: 'S3 bucket is experiencing high error rates',
            metric: new cloudwatch.MathExpression({
                expression: '(m1 + m2) / m3 * 100',
                usingMetrics: {
                    m1: new cloudwatch.Metric({
                        namespace: 'AWS/S3',
                        metricName: '4xxErrors',
                        dimensionsMap: { BucketName: props.s3Bucket.bucketName },
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(5),
                    }),
                    m2: new cloudwatch.Metric({
                        namespace: 'AWS/S3',
                        metricName: '5xxErrors',
                        dimensionsMap: { BucketName: props.s3Bucket.bucketName },
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(5),
                    }),
                    m3: new cloudwatch.Metric({
                        namespace: 'AWS/S3',
                        metricName: 'AllRequests',
                        dimensionsMap: { BucketName: props.s3Bucket.bucketName },
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(5),
                    }),
                },
            }),
            threshold: 10,
            evaluationPeriods: 2,
            datapointsToAlarm: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
        // Business Metrics Alarms
        new cloudwatch.Alarm(this, 'AnalysisFailureRate', {
            alarmName: `MISRA-${props.environment}-AnalysisFailureRate`,
            alarmDescription: 'Analysis failure rate is above 10%',
            metric: new cloudwatch.MathExpression({
                expression: 'm1 / (m1 + m2) * 100',
                usingMetrics: {
                    m1: new cloudwatch.Metric({
                        namespace: 'MISRA/Platform',
                        metricName: 'AnalysisFailed',
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(15),
                    }),
                    m2: new cloudwatch.Metric({
                        namespace: 'MISRA/Platform',
                        metricName: 'AnalysisCompleted',
                        statistic: 'Sum',
                        period: aws_cdk_lib_1.Duration.minutes(15),
                    }),
                },
            }),
            threshold: 10,
            evaluationPeriods: 2,
            datapointsToAlarm: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cloudwatchActions.SnsAction(this.alertTopic));
    }
    createCustomMetrics(props) {
        // Custom metrics will be published by Lambda functions
        // This method creates the metric definitions for reference
        // Business KPIs
        const businessMetrics = [
            'AnalysisCompleted',
            'AnalysisFailed',
            'UserRegistrations',
            'FileUploads',
            'ReportDownloads',
            'ComplianceScoreAverage',
            'ViolationsDetected',
        ];
        // Technical KPIs
        const technicalMetrics = [
            'AnalysisDuration',
            'FileProcessingTime',
            'CacheHitRate',
            'DatabaseResponseTime',
            'S3UploadTime',
        ];
        // Security Metrics
        const securityMetrics = [
            'AuthenticationFailures',
            'UnauthorizedAccess',
            'SuspiciousActivity',
            'DataAccessViolations',
        ];
        // Create metric filters for log-based metrics
        this.createLogMetricFilters(props);
    }
    createLogMetricFilters(props) {
        // Create metric filters for centralized logging
        // Authentication failures
        new logs.MetricFilter(this, 'AuthFailuresMetricFilter', {
            logGroup: this.logGroup,
            metricNamespace: 'MISRA/Platform/Security',
            metricName: 'AuthenticationFailures',
            filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level="ERROR", message="Authentication failed"]'),
            metricValue: '1',
        });
        // Analysis completion
        new logs.MetricFilter(this, 'AnalysisCompletedMetricFilter', {
            logGroup: this.logGroup,
            metricNamespace: 'MISRA/Platform',
            metricName: 'AnalysisCompleted',
            filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level="INFO", message="Analysis completed"]'),
            metricValue: '1',
        });
        // Analysis failures
        new logs.MetricFilter(this, 'AnalysisFailedMetricFilter', {
            logGroup: this.logGroup,
            metricNamespace: 'MISRA/Platform',
            metricName: 'AnalysisFailed',
            filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level="ERROR", message="Analysis failed"]'),
            metricValue: '1',
        });
        // User registrations
        new logs.MetricFilter(this, 'UserRegistrationsMetricFilter', {
            logGroup: this.logGroup,
            metricNamespace: 'MISRA/Platform',
            metricName: 'UserRegistrations',
            filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level="INFO", message="User registered"]'),
            metricValue: '1',
        });
        // File uploads
        new logs.MetricFilter(this, 'FileUploadsMetricFilter', {
            logGroup: this.logGroup,
            metricNamespace: 'MISRA/Platform',
            metricName: 'FileUploads',
            filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level="INFO", message="File uploaded"]'),
            metricValue: '1',
        });
        // Suspicious activity
        new logs.MetricFilter(this, 'SuspiciousActivityMetricFilter', {
            logGroup: this.logGroup,
            metricNamespace: 'MISRA/Platform/Security',
            metricName: 'SuspiciousActivity',
            filterPattern: logs.FilterPattern.literal('[timestamp, requestId, level="WARN", message="Suspicious activity detected"]'),
            metricValue: '1',
        });
    }
}
exports.MonitoringStack = MonitoringStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9uaXRvcmluZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1vbml0b3Jpbmctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQXVDO0FBQ3ZDLHVFQUF5RDtBQUN6RCxzRkFBd0U7QUFDeEUseURBQTJDO0FBQzNDLG9GQUFzRTtBQUN0RSwyREFBNkM7QUFLN0MsaURBQW1DO0FBQ25DLDZDQUF1QztBQVd2Qzs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQWEsZUFBZ0IsU0FBUSxzQkFBUztJQUM1QixVQUFVLENBQVk7SUFDdEIsU0FBUyxDQUF1QjtJQUNoQyxRQUFRLENBQWdCO0lBRXhDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMkI7UUFDbkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFlBQVksRUFBRTtZQUNsRCxTQUFTLEVBQUUseUJBQXlCLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDdkQsV0FBVyxFQUFFLGtCQUFrQixLQUFLLENBQUMsV0FBVyxTQUFTO1NBQzFELENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxJQUFJLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsVUFBVSxDQUFDLGVBQWUsQ0FDN0IsSUFBSSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQ3pELENBQUM7UUFDSixDQUFDO1FBRUQsbURBQW1EO1FBQ25ELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3RCxZQUFZLEVBQUUsbUJBQW1CLEtBQUssQ0FBQyxXQUFXLGNBQWM7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QUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNyRCxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVE7WUFDdkIsZUFBZSxFQUFFLGdCQUFnQjtZQUNqQyxVQUFVLEVBQUUsYUFBYTtZQUN6QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsK0RBQStELENBQUM7WUFDMUcsV0FBVyxFQUFFLEdBQUc7U0FDakIsQ0FBQyxDQUFDO1FBRUgsc0JBQXNCO1FBQ3RCLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsZ0NBQWdDLEVBQUU7WUFDNUQsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO1lBQ3ZCLGVBQWUsRUFBRSx5QkFBeUI7WUFDMUMsVUFBVSxFQUFFLG9CQUFvQjtZQUNoQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsOEVBQThFLENBQUM7WUFDekgsV0FBVyxFQUFFLEdBQUc7U0FDakIsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBOW1CRCwwQ0E4bUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoQWN0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaC1hY3Rpb25zJztcclxuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xyXG5pbXBvcnQgKiBhcyBzbnNTdWJzY3JpcHRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMtc3Vic2NyaXB0aW9ucyc7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBEdXJhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTW9uaXRvcmluZ1N0YWNrUHJvcHMge1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbiAgYXBpR2F0ZXdheTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG4gIGxhbWJkYUZ1bmN0aW9uczogUmVjb3JkPHN0cmluZywgbGFtYmRhLkZ1bmN0aW9uPjtcclxuICBkeW5hbW9UYWJsZXM6IFJlY29yZDxzdHJpbmcsIGR5bmFtb2RiLlRhYmxlPjtcclxuICBzM0J1Y2tldDogczMuQnVja2V0O1xyXG4gIGFsZXJ0RW1haWw/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb21wcmVoZW5zaXZlIE1vbml0b3JpbmcgYW5kIEFsZXJ0aW5nIFN0YWNrIGZvciBNSVNSQSBQcm9kdWN0aW9uIFBsYXRmb3JtXHJcbiAqIFxyXG4gKiBJbXBsZW1lbnRzIFRhc2sgOC4yIHJlcXVpcmVtZW50czpcclxuICogLSBDbG91ZFdhdGNoIGRhc2hib2FyZHMgZm9yIEFQSSBHYXRld2F5LCBMYW1iZGEsIGFuZCBEeW5hbW9EQiBtZXRyaWNzXHJcbiAqIC0gQ2xvdWRXYXRjaCBhbGFybXMgZm9yIGhpZ2ggZXJyb3IgcmF0ZXMgYW5kIGxhdGVuY3lcclxuICogLSBDZW50cmFsaXplZCBsb2dnaW5nIHdpdGggY29ycmVsYXRpb24gSURzIGZvciByZXF1ZXN0IHRyYWNpbmdcclxuICogLSBTTlMgdG9waWNzIGZvciBhbGVydCBub3RpZmljYXRpb25zXHJcbiAqIC0gQ3VzdG9tIG1ldHJpY3MgZm9yIGJ1c2luZXNzIGFuZCB0ZWNobmljYWwgS1BJc1xyXG4gKiAtIFBlcmZvcm1hbmNlIG1vbml0b3JpbmcgYW5kIGNhcGFjaXR5IHBsYW5uaW5nIG1ldHJpY3NcclxuICogLSBTZWN1cml0eSBtb25pdG9yaW5nIGFuZCBhbm9tYWx5IGRldGVjdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIE1vbml0b3JpbmdTdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGFsZXJ0VG9waWM6IHNucy5Ub3BpYztcclxuICBwdWJsaWMgcmVhZG9ubHkgZGFzaGJvYXJkOiBjbG91ZHdhdGNoLkRhc2hib2FyZDtcclxuICBwdWJsaWMgcmVhZG9ubHkgbG9nR3JvdXA6IGxvZ3MuTG9nR3JvdXA7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBhbGVydHNcclxuICAgIHRoaXMuYWxlcnRUb3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ0FsZXJ0VG9waWMnLCB7XHJcbiAgICAgIHRvcGljTmFtZTogYG1pc3JhLXBsYXRmb3JtLWFsZXJ0cy0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiBgTUlTUkEgUGxhdGZvcm0gJHtwcm9wcy5lbnZpcm9ubWVudH0gQWxlcnRzYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBlbWFpbCBzdWJzY3JpcHRpb24gaWYgcHJvdmlkZWRcclxuICAgIGlmIChwcm9wcy5hbGVydEVtYWlsKSB7XHJcbiAgICAgIHRoaXMuYWxlcnRUb3BpYy5hZGRTdWJzY3JpcHRpb24oXHJcbiAgICAgICAgbmV3IHNuc1N1YnNjcmlwdGlvbnMuRW1haWxTdWJzY3JpcHRpb24ocHJvcHMuYWxlcnRFbWFpbClcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgY2VudHJhbGl6ZWQgbG9nIGdyb3VwIGZvciBjb3JyZWxhdGlvbiBJRHNcclxuICAgIHRoaXMubG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQ2VudHJhbGl6ZWRMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL21pc3JhLXBsYXRmb3JtLyR7cHJvcHMuZW52aXJvbm1lbnR9L2NlbnRyYWxpemVkYCxcclxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggRGFzaGJvYXJkXHJcbiAgICB0aGlzLmRhc2hib2FyZCA9IHRoaXMuY3JlYXRlRGFzaGJvYXJkKHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBBbGFybXNcclxuICAgIHRoaXMuY3JlYXRlQWxhcm1zKHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgY3VzdG9tIG1ldHJpY3NcclxuICAgIHRoaXMuY3JlYXRlQ3VzdG9tTWV0cmljcyhwcm9wcyk7XHJcblxyXG4gICAgLy8gT3V0cHV0IG1vbml0b3JpbmcgcmVzb3VyY2VzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGFzaGJvYXJkVVJMJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufS5jb25zb2xlLmF3cy5hbWF6b24uY29tL2Nsb3Vkd2F0Y2gvaG9tZT9yZWdpb249JHtjZGsuU3RhY2sub2YodGhpcykucmVnaW9ufSNkYXNoYm9hcmRzOm5hbWU9JHt0aGlzLmRhc2hib2FyZC5kYXNoYm9hcmROYW1lfWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBEYXNoYm9hcmQgVVJMJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbGVydFRvcGljQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hbGVydFRvcGljLnRvcGljQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyBUb3BpYyBBUk4gZm9yIGFsZXJ0cycsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlRGFzaGJvYXJkKHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcyk6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkIHtcclxuICAgIGNvbnN0IGRhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnTUlTUkFQbGF0Zm9ybURhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogYE1JU1JBLVBsYXRmb3JtLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBHYXRld2F5IE1ldHJpY3MgU2VjdGlvblxyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlRleHRXaWRnZXQoe1xyXG4gICAgICAgIG1hcmtkb3duOiBgIyBNSVNSQSBQbGF0Zm9ybSAke3Byb3BzLmVudmlyb25tZW50fSAtIFN5c3RlbSBPdmVydmlld1xcblxcbiMjIEFQSSBHYXRld2F5IE1ldHJpY3NgLFxyXG4gICAgICAgIHdpZHRoOiAyNCxcclxuICAgICAgICBoZWlnaHQ6IDIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFQSSBHYXRld2F5IFJlcXVlc3QgQ291bnQgYW5kIExhdGVuY3lcclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBUEkgR2F0ZXdheSAtIFJlcXVlc3QgQ291bnQnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0NvdW50JyxcclxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgIEFwaU5hbWU6IHByb3BzLmFwaUdhdGV3YXkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FQSSBHYXRld2F5IC0gTGF0ZW5jeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICBBcGlOYW1lOiBwcm9wcy5hcGlHYXRld2F5LnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICByaWdodDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnSW50ZWdyYXRpb25MYXRlbmN5JyxcclxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgIEFwaU5hbWU6IHByb3BzLmFwaUdhdGV3YXkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFQSSBHYXRld2F5IEVycm9yIFJhdGVzXHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQVBJIEdhdGV3YXkgLSBFcnJvciBSYXRlcycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnNFhYRXJyb3InLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgQXBpTmFtZTogcHJvcHMuYXBpR2F0ZXdheS5yZXN0QXBpTmFtZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICc1WFhFcnJvcicsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICBBcGlOYW1lOiBwcm9wcy5hcGlHYXRld2F5LnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAyNCxcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIExhbWJkYSBGdW5jdGlvbnMgU2VjdGlvblxyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlRleHRXaWRnZXQoe1xyXG4gICAgICAgIG1hcmtkb3duOiAnIyMgTGFtYmRhIEZ1bmN0aW9ucyBNZXRyaWNzJyxcclxuICAgICAgICB3aWR0aDogMjQsXHJcbiAgICAgICAgaGVpZ2h0OiAxLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBMYW1iZGEgRHVyYXRpb24gYW5kIEludm9jYXRpb25zXHJcbiAgICBjb25zdCBsYW1iZGFNZXRyaWNzID0gT2JqZWN0LmVudHJpZXMocHJvcHMubGFtYmRhRnVuY3Rpb25zKS5tYXAoKFtuYW1lLCBmdW5jXSkgPT4gKHtcclxuICAgICAgbmFtZSxcclxuICAgICAgZHVyYXRpb246IGZ1bmMubWV0cmljRHVyYXRpb24oeyBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSkgfSksXHJcbiAgICAgIGludm9jYXRpb25zOiBmdW5jLm1ldHJpY0ludm9jYXRpb25zKHsgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpIH0pLFxyXG4gICAgICBlcnJvcnM6IGZ1bmMubWV0cmljRXJyb3JzKHsgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpIH0pLFxyXG4gICAgICB0aHJvdHRsZXM6IGZ1bmMubWV0cmljVGhyb3R0bGVzKHsgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpIH0pLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdMYW1iZGEgRnVuY3Rpb25zIC0gRHVyYXRpb24nLFxyXG4gICAgICAgIGxlZnQ6IGxhbWJkYU1ldHJpY3MubWFwKG0gPT4gbS5kdXJhdGlvbiksXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0xhbWJkYSBGdW5jdGlvbnMgLSBJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgbGVmdDogbGFtYmRhTWV0cmljcy5tYXAobSA9PiBtLmludm9jYXRpb25zKSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnTGFtYmRhIEZ1bmN0aW9ucyAtIEVycm9ycyAmIFRocm90dGxlcycsXHJcbiAgICAgICAgbGVmdDogbGFtYmRhTWV0cmljcy5tYXAobSA9PiBtLmVycm9ycyksXHJcbiAgICAgICAgcmlnaHQ6IGxhbWJkYU1ldHJpY3MubWFwKG0gPT4gbS50aHJvdHRsZXMpLFxyXG4gICAgICAgIHdpZHRoOiAyNCxcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIER5bmFtb0RCIFNlY3Rpb25cclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5UZXh0V2lkZ2V0KHtcclxuICAgICAgICBtYXJrZG93bjogJyMjIER5bmFtb0RCIE1ldHJpY3MnLFxyXG4gICAgICAgIHdpZHRoOiAyNCxcclxuICAgICAgICBoZWlnaHQ6IDEsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIER5bmFtb0RCIFJlYWQvV3JpdGUgQ2FwYWNpdHkgYW5kIFRocm90dGxlc1xyXG4gICAgY29uc3QgZHluYW1vTWV0cmljcyA9IE9iamVjdC5lbnRyaWVzKHByb3BzLmR5bmFtb1RhYmxlcykubWFwKChbbmFtZSwgdGFibGVdKSA9PiAoe1xyXG4gICAgICBuYW1lLFxyXG4gICAgICByZWFkQ2FwYWNpdHk6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQ29uc3VtZWRSZWFkQ2FwYWNpdHlVbml0cycsXHJcbiAgICAgICAgZGltZW5zaW9uc01hcDogeyBUYWJsZU5hbWU6IHRhYmxlLnRhYmxlTmFtZSB9LFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgd3JpdGVDYXBhY2l0eTogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdDb25zdW1lZFdyaXRlQ2FwYWNpdHlVbml0cycsXHJcbiAgICAgICAgZGltZW5zaW9uc01hcDogeyBUYWJsZU5hbWU6IHRhYmxlLnRhYmxlTmFtZSB9LFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgcmVhZFRocm90dGxlczogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdSZWFkVGhyb3R0bGVkRXZlbnRzJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7IFRhYmxlTmFtZTogdGFibGUudGFibGVOYW1lIH0sXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB3cml0ZVRocm90dGxlczogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvRHluYW1vREInLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdXcml0ZVRocm90dGxlZEV2ZW50cycsXHJcbiAgICAgICAgZGltZW5zaW9uc01hcDogeyBUYWJsZU5hbWU6IHRhYmxlLnRhYmxlTmFtZSB9LFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgIH0pKTtcclxuXHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnRHluYW1vREIgLSBSZWFkIENhcGFjaXR5JyxcclxuICAgICAgICBsZWZ0OiBkeW5hbW9NZXRyaWNzLm1hcChtID0+IG0ucmVhZENhcGFjaXR5KSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnRHluYW1vREIgLSBXcml0ZSBDYXBhY2l0eScsXHJcbiAgICAgICAgbGVmdDogZHluYW1vTWV0cmljcy5tYXAobSA9PiBtLndyaXRlQ2FwYWNpdHkpLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdEeW5hbW9EQiAtIFRocm90dGxlcycsXHJcbiAgICAgICAgbGVmdDogZHluYW1vTWV0cmljcy5tYXAobSA9PiBtLnJlYWRUaHJvdHRsZXMpLFxyXG4gICAgICAgIHJpZ2h0OiBkeW5hbW9NZXRyaWNzLm1hcChtID0+IG0ud3JpdGVUaHJvdHRsZXMpLFxyXG4gICAgICAgIHdpZHRoOiAyNCxcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFMzIFNlY3Rpb25cclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5UZXh0V2lkZ2V0KHtcclxuICAgICAgICBtYXJrZG93bjogJyMjIFMzIFN0b3JhZ2UgTWV0cmljcycsXHJcbiAgICAgICAgd2lkdGg6IDI0LFxyXG4gICAgICAgIGhlaWdodDogMSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1MzIC0gUmVxdWVzdHMnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9TMycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBbGxSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICBCdWNrZXROYW1lOiBwcm9wcy5zM0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvUzMnLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnNHh4RXJyb3JzJyxcclxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgIEJ1Y2tldE5hbWU6IHByb3BzLnMzQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL1MzJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJzV4eEVycm9ycycsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICBCdWNrZXROYW1lOiBwcm9wcy5zM0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAyNCxcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEJ1c2luZXNzIE1ldHJpY3MgU2VjdGlvblxyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlRleHRXaWRnZXQoe1xyXG4gICAgICAgIG1hcmtkb3duOiAnIyMgQnVzaW5lc3MgJiBQZXJmb3JtYW5jZSBLUElzJyxcclxuICAgICAgICB3aWR0aDogMjQsXHJcbiAgICAgICAgaGVpZ2h0OiAxLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQW5hbHlzaXMgQ29tcGxldGlvbiBSYXRlJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBbmFseXNpc0NvbXBsZXRlZCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnTUlTUkEvUGxhdGZvcm0nLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQW5hbHlzaXNGYWlsZWQnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdVc2VyIEpvdXJuZXkgTWV0cmljcycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnTUlTUkEvUGxhdGZvcm0nLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnVXNlclJlZ2lzdHJhdGlvbnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0ZpbGVVcGxvYWRzJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICByZXR1cm4gZGFzaGJvYXJkO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVBbGFybXMocHJvcHM6IE1vbml0b3JpbmdTdGFja1Byb3BzKTogdm9pZCB7XHJcbiAgICAvLyBBUEkgR2F0ZXdheSBIaWdoIEVycm9yIFJhdGUgQWxhcm1cclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBUElHYXRld2F5SGlnaEVycm9yUmF0ZScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtJHtwcm9wcy5lbnZpcm9ubWVudH0tQVBJLUhpZ2hFcnJvclJhdGVgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgZXJyb3IgcmF0ZSBpcyBhYm92ZSA1JScsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgIGV4cHJlc3Npb246ICcobTEgKyBtMikgLyBtMyAqIDEwMCcsXHJcbiAgICAgICAgdXNpbmdNZXRyaWNzOiB7XHJcbiAgICAgICAgICBtMTogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnNFhYRXJyb3InLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7IEFwaU5hbWU6IHByb3BzLmFwaUdhdGV3YXkucmVzdEFwaU5hbWUgfSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBtMjogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7IEFwaU5hbWU6IHByb3BzLmFwaUdhdGV3YXkucmVzdEFwaU5hbWUgfSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBtMzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQ291bnQnLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7IEFwaU5hbWU6IHByb3BzLmFwaUdhdGV3YXkucmVzdEFwaU5hbWUgfSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGRhdGFwb2ludHNUb0FsYXJtOiAyLFxyXG4gICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsZXJ0VG9waWMpKTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSBIaWdoIExhdGVuY3kgQWxhcm1cclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBUElHYXRld2F5SGlnaExhdGVuY3knLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYE1JU1JBLSR7cHJvcHMuZW52aXJvbm1lbnR9LUFQSS1IaWdoTGF0ZW5jeWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBsYXRlbmN5IGlzIGFib3ZlIDIgc2Vjb25kcycsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0xhdGVuY3knLFxyXG4gICAgICAgIGRpbWVuc2lvbnNNYXA6IHsgQXBpTmFtZTogcHJvcHMuYXBpR2F0ZXdheS5yZXN0QXBpTmFtZSB9LFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogMjAwMCwgLy8gMiBzZWNvbmRzIGluIG1pbGxpc2Vjb25kc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMyxcclxuICAgICAgZGF0YXBvaW50c1RvQWxhcm06IDIsXHJcbiAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxlcnRUb3BpYykpO1xyXG5cclxuICAgIC8vIExhbWJkYSBGdW5jdGlvbiBFcnJvciBSYXRlIEFsYXJtc1xyXG4gICAgT2JqZWN0LmVudHJpZXMocHJvcHMubGFtYmRhRnVuY3Rpb25zKS5mb3JFYWNoKChbbmFtZSwgZnVuY10pID0+IHtcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYExhbWJkYSR7bmFtZX1FcnJvclJhdGVgLCB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtJHtwcm9wcy5lbnZpcm9ubWVudH0tTGFtYmRhLSR7bmFtZX0tRXJyb3JSYXRlYCxcclxuICAgICAgICBhbGFybURlc2NyaXB0aW9uOiBgTGFtYmRhIGZ1bmN0aW9uICR7bmFtZX0gZXJyb3IgcmF0ZSBpcyBhYm92ZSA1JWAsXHJcbiAgICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NYXRoRXhwcmVzc2lvbih7XHJcbiAgICAgICAgICBleHByZXNzaW9uOiAnbTEgLyBtMiAqIDEwMCcsXHJcbiAgICAgICAgICB1c2luZ01ldHJpY3M6IHtcclxuICAgICAgICAgICAgbTE6IGZ1bmMubWV0cmljRXJyb3JzKHsgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpIH0pLFxyXG4gICAgICAgICAgICBtMjogZnVuYy5tZXRyaWNJbnZvY2F0aW9ucyh7IHBlcmlvZDogRHVyYXRpb24ubWludXRlcyg1KSB9KSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICAgIGRhdGFwb2ludHNUb0FsYXJtOiAyLFxyXG4gICAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxlcnRUb3BpYykpO1xyXG5cclxuICAgICAgLy8gTGFtYmRhIER1cmF0aW9uIEFsYXJtIGZvciBjcml0aWNhbCBmdW5jdGlvbnNcclxuICAgICAgaWYgKG5hbWUuaW5jbHVkZXMoJ2FuYWx5emUtZmlsZScpKSB7XHJcbiAgICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYExhbWJkYSR7bmFtZX1EdXJhdGlvbmAsIHtcclxuICAgICAgICAgIGFsYXJtTmFtZTogYE1JU1JBLSR7cHJvcHMuZW52aXJvbm1lbnR9LUxhbWJkYS0ke25hbWV9LUR1cmF0aW9uYCxcclxuICAgICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBMYW1iZGEgZnVuY3Rpb24gJHtuYW1lfSBkdXJhdGlvbiBpcyBhYm92ZSA0IG1pbnV0ZXNgLFxyXG4gICAgICAgICAgbWV0cmljOiBmdW5jLm1ldHJpY0R1cmF0aW9uKHsgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDUpIH0pLFxyXG4gICAgICAgICAgdGhyZXNob2xkOiAyNDAwMDAsIC8vIDQgbWludXRlcyBpbiBtaWxsaXNlY29uZHNcclxuICAgICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICAgICAgZGF0YXBvaW50c1RvQWxhcm06IDEsXHJcbiAgICAgICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsZXJ0VG9waWMpKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRHluYW1vREIgVGhyb3R0bGluZyBBbGFybXNcclxuICAgIE9iamVjdC5lbnRyaWVzKHByb3BzLmR5bmFtb1RhYmxlcykuZm9yRWFjaCgoW25hbWUsIHRhYmxlXSkgPT4ge1xyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgRHluYW1vREIke25hbWV9UmVhZFRocm90dGxlc2AsIHtcclxuICAgICAgICBhbGFybU5hbWU6IGBNSVNSQS0ke3Byb3BzLmVudmlyb25tZW50fS1EeW5hbW9EQi0ke25hbWV9LVJlYWRUaHJvdHRsZXNgLFxyXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBEeW5hbW9EQiB0YWJsZSAke25hbWV9IGlzIGV4cGVyaWVuY2luZyByZWFkIHRocm90dGxlc2AsXHJcbiAgICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0R5bmFtb0RCJyxcclxuICAgICAgICAgIG1ldHJpY05hbWU6ICdSZWFkVGhyb3R0bGVkRXZlbnRzJyxcclxuICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHsgVGFibGVOYW1lOiB0YWJsZS50YWJsZU5hbWUgfSxcclxuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdGhyZXNob2xkOiAxLFxyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICAgIGRhdGFwb2ludHNUb0FsYXJtOiAxLFxyXG4gICAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2xvdWR3YXRjaEFjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxlcnRUb3BpYykpO1xyXG5cclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYER5bmFtb0RCJHtuYW1lfVdyaXRlVGhyb3R0bGVzYCwge1xyXG4gICAgICAgIGFsYXJtTmFtZTogYE1JU1JBLSR7cHJvcHMuZW52aXJvbm1lbnR9LUR5bmFtb0RCLSR7bmFtZX0tV3JpdGVUaHJvdHRsZXNgLFxyXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBEeW5hbW9EQiB0YWJsZSAke25hbWV9IGlzIGV4cGVyaWVuY2luZyB3cml0ZSB0aHJvdHRsZXNgLFxyXG4gICAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9EeW5hbW9EQicsXHJcbiAgICAgICAgICBtZXRyaWNOYW1lOiAnV3JpdGVUaHJvdHRsZWRFdmVudHMnLFxyXG4gICAgICAgICAgZGltZW5zaW9uc01hcDogeyBUYWJsZU5hbWU6IHRhYmxlLnRhYmxlTmFtZSB9LFxyXG4gICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgIHBlcmlvZDogRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9KSxcclxuICAgICAgICB0aHJlc2hvbGQ6IDEsXHJcbiAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgICAgZGF0YXBvaW50c1RvQWxhcm06IDEsXHJcbiAgICAgIH0pLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTMyBFcnJvciBSYXRlIEFsYXJtXHJcbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnUzNIaWdoRXJyb3JSYXRlJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBNSVNSQS0ke3Byb3BzLmVudmlyb25tZW50fS1TMy1IaWdoRXJyb3JSYXRlYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBpcyBleHBlcmllbmNpbmcgaGlnaCBlcnJvciByYXRlcycsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgIGV4cHJlc3Npb246ICcobTEgKyBtMikgLyBtMyAqIDEwMCcsXHJcbiAgICAgICAgdXNpbmdNZXRyaWNzOiB7XHJcbiAgICAgICAgICBtMTogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL1MzJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJzR4eEVycm9ycycsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHsgQnVja2V0TmFtZTogcHJvcHMuczNCdWNrZXQuYnVja2V0TmFtZSB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG0yOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBV1MvUzMnLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnNXh4RXJyb3JzJyxcclxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDogeyBCdWNrZXROYW1lOiBwcm9wcy5zM0J1Y2tldC5idWNrZXROYW1lIH0sXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbTM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9TMycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdBbGxSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHsgQnVja2V0TmFtZTogcHJvcHMuczNCdWNrZXQuYnVja2V0TmFtZSB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGRhdGFwb2ludHNUb0FsYXJtOiAyLFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pLmFkZEFsYXJtQWN0aW9uKG5ldyBjbG91ZHdhdGNoQWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGVydFRvcGljKSk7XHJcblxyXG4gICAgLy8gQnVzaW5lc3MgTWV0cmljcyBBbGFybXNcclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBbmFseXNpc0ZhaWx1cmVSYXRlJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBNSVNSQS0ke3Byb3BzLmVudmlyb25tZW50fS1BbmFseXNpc0ZhaWx1cmVSYXRlYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FuYWx5c2lzIGZhaWx1cmUgcmF0ZSBpcyBhYm92ZSAxMCUnLFxyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1hdGhFeHByZXNzaW9uKHtcclxuICAgICAgICBleHByZXNzaW9uOiAnbTEgLyAobTEgKyBtMikgKiAxMDAnLFxyXG4gICAgICAgIHVzaW5nTWV0cmljczoge1xyXG4gICAgICAgICAgbTE6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FuYWx5c2lzRmFpbGVkJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbTI6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0FuYWx5c2lzQ29tcGxldGVkJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBEdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgZGF0YXBvaW50c1RvQWxhcm06IDIsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNsb3Vkd2F0Y2hBY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsZXJ0VG9waWMpKTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQ3VzdG9tTWV0cmljcyhwcm9wczogTW9uaXRvcmluZ1N0YWNrUHJvcHMpOiB2b2lkIHtcclxuICAgIC8vIEN1c3RvbSBtZXRyaWNzIHdpbGwgYmUgcHVibGlzaGVkIGJ5IExhbWJkYSBmdW5jdGlvbnNcclxuICAgIC8vIFRoaXMgbWV0aG9kIGNyZWF0ZXMgdGhlIG1ldHJpYyBkZWZpbml0aW9ucyBmb3IgcmVmZXJlbmNlXHJcbiAgICBcclxuICAgIC8vIEJ1c2luZXNzIEtQSXNcclxuICAgIGNvbnN0IGJ1c2luZXNzTWV0cmljcyA9IFtcclxuICAgICAgJ0FuYWx5c2lzQ29tcGxldGVkJyxcclxuICAgICAgJ0FuYWx5c2lzRmFpbGVkJywgXHJcbiAgICAgICdVc2VyUmVnaXN0cmF0aW9ucycsXHJcbiAgICAgICdGaWxlVXBsb2FkcycsXHJcbiAgICAgICdSZXBvcnREb3dubG9hZHMnLFxyXG4gICAgICAnQ29tcGxpYW5jZVNjb3JlQXZlcmFnZScsXHJcbiAgICAgICdWaW9sYXRpb25zRGV0ZWN0ZWQnLFxyXG4gICAgXTtcclxuXHJcbiAgICAvLyBUZWNobmljYWwgS1BJc1xyXG4gICAgY29uc3QgdGVjaG5pY2FsTWV0cmljcyA9IFtcclxuICAgICAgJ0FuYWx5c2lzRHVyYXRpb24nLFxyXG4gICAgICAnRmlsZVByb2Nlc3NpbmdUaW1lJyxcclxuICAgICAgJ0NhY2hlSGl0UmF0ZScsXHJcbiAgICAgICdEYXRhYmFzZVJlc3BvbnNlVGltZScsXHJcbiAgICAgICdTM1VwbG9hZFRpbWUnLFxyXG4gICAgXTtcclxuXHJcbiAgICAvLyBTZWN1cml0eSBNZXRyaWNzXHJcbiAgICBjb25zdCBzZWN1cml0eU1ldHJpY3MgPSBbXHJcbiAgICAgICdBdXRoZW50aWNhdGlvbkZhaWx1cmVzJyxcclxuICAgICAgJ1VuYXV0aG9yaXplZEFjY2VzcycsXHJcbiAgICAgICdTdXNwaWNpb3VzQWN0aXZpdHknLFxyXG4gICAgICAnRGF0YUFjY2Vzc1Zpb2xhdGlvbnMnLFxyXG4gICAgXTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbWV0cmljIGZpbHRlcnMgZm9yIGxvZy1iYXNlZCBtZXRyaWNzXHJcbiAgICB0aGlzLmNyZWF0ZUxvZ01ldHJpY0ZpbHRlcnMocHJvcHMpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVMb2dNZXRyaWNGaWx0ZXJzKHByb3BzOiBNb25pdG9yaW5nU3RhY2tQcm9wcyk6IHZvaWQge1xyXG4gICAgLy8gQ3JlYXRlIG1ldHJpYyBmaWx0ZXJzIGZvciBjZW50cmFsaXplZCBsb2dnaW5nXHJcbiAgICBcclxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIGZhaWx1cmVzXHJcbiAgICBuZXcgbG9ncy5NZXRyaWNGaWx0ZXIodGhpcywgJ0F1dGhGYWlsdXJlc01ldHJpY0ZpbHRlcicsIHtcclxuICAgICAgbG9nR3JvdXA6IHRoaXMubG9nR3JvdXAsXHJcbiAgICAgIG1ldHJpY05hbWVzcGFjZTogJ01JU1JBL1BsYXRmb3JtL1NlY3VyaXR5JyxcclxuICAgICAgbWV0cmljTmFtZTogJ0F1dGhlbnRpY2F0aW9uRmFpbHVyZXMnLFxyXG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4ubGl0ZXJhbCgnW3RpbWVzdGFtcCwgcmVxdWVzdElkLCBsZXZlbD1cIkVSUk9SXCIsIG1lc3NhZ2U9XCJBdXRoZW50aWNhdGlvbiBmYWlsZWRcIl0nKSxcclxuICAgICAgbWV0cmljVmFsdWU6ICcxJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIGNvbXBsZXRpb25cclxuICAgIG5ldyBsb2dzLk1ldHJpY0ZpbHRlcih0aGlzLCAnQW5hbHlzaXNDb21wbGV0ZWRNZXRyaWNGaWx0ZXInLCB7XHJcbiAgICAgIGxvZ0dyb3VwOiB0aGlzLmxvZ0dyb3VwLFxyXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgIG1ldHJpY05hbWU6ICdBbmFseXNpc0NvbXBsZXRlZCcsXHJcbiAgICAgIGZpbHRlclBhdHRlcm46IGxvZ3MuRmlsdGVyUGF0dGVybi5saXRlcmFsKCdbdGltZXN0YW1wLCByZXF1ZXN0SWQsIGxldmVsPVwiSU5GT1wiLCBtZXNzYWdlPVwiQW5hbHlzaXMgY29tcGxldGVkXCJdJyksXHJcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyBmYWlsdXJlc1xyXG4gICAgbmV3IGxvZ3MuTWV0cmljRmlsdGVyKHRoaXMsICdBbmFseXNpc0ZhaWxlZE1ldHJpY0ZpbHRlcicsIHtcclxuICAgICAgbG9nR3JvdXA6IHRoaXMubG9nR3JvdXAsXHJcbiAgICAgIG1ldHJpY05hbWVzcGFjZTogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgbWV0cmljTmFtZTogJ0FuYWx5c2lzRmFpbGVkJyxcclxuICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmxpdGVyYWwoJ1t0aW1lc3RhbXAsIHJlcXVlc3RJZCwgbGV2ZWw9XCJFUlJPUlwiLCBtZXNzYWdlPVwiQW5hbHlzaXMgZmFpbGVkXCJdJyksXHJcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVc2VyIHJlZ2lzdHJhdGlvbnNcclxuICAgIG5ldyBsb2dzLk1ldHJpY0ZpbHRlcih0aGlzLCAnVXNlclJlZ2lzdHJhdGlvbnNNZXRyaWNGaWx0ZXInLCB7XHJcbiAgICAgIGxvZ0dyb3VwOiB0aGlzLmxvZ0dyb3VwLFxyXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgIG1ldHJpY05hbWU6ICdVc2VyUmVnaXN0cmF0aW9ucycsXHJcbiAgICAgIGZpbHRlclBhdHRlcm46IGxvZ3MuRmlsdGVyUGF0dGVybi5saXRlcmFsKCdbdGltZXN0YW1wLCByZXF1ZXN0SWQsIGxldmVsPVwiSU5GT1wiLCBtZXNzYWdlPVwiVXNlciByZWdpc3RlcmVkXCJdJyksXHJcbiAgICAgIG1ldHJpY1ZhbHVlOiAnMScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGaWxlIHVwbG9hZHNcclxuICAgIG5ldyBsb2dzLk1ldHJpY0ZpbHRlcih0aGlzLCAnRmlsZVVwbG9hZHNNZXRyaWNGaWx0ZXInLCB7XHJcbiAgICAgIGxvZ0dyb3VwOiB0aGlzLmxvZ0dyb3VwLFxyXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgIG1ldHJpY05hbWU6ICdGaWxlVXBsb2FkcycsXHJcbiAgICAgIGZpbHRlclBhdHRlcm46IGxvZ3MuRmlsdGVyUGF0dGVybi5saXRlcmFsKCdbdGltZXN0YW1wLCByZXF1ZXN0SWQsIGxldmVsPVwiSU5GT1wiLCBtZXNzYWdlPVwiRmlsZSB1cGxvYWRlZFwiXScpLFxyXG4gICAgICBtZXRyaWNWYWx1ZTogJzEnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3VzcGljaW91cyBhY3Rpdml0eVxyXG4gICAgbmV3IGxvZ3MuTWV0cmljRmlsdGVyKHRoaXMsICdTdXNwaWNpb3VzQWN0aXZpdHlNZXRyaWNGaWx0ZXInLCB7XHJcbiAgICAgIGxvZ0dyb3VwOiB0aGlzLmxvZ0dyb3VwLFxyXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdNSVNSQS9QbGF0Zm9ybS9TZWN1cml0eScsXHJcbiAgICAgIG1ldHJpY05hbWU6ICdTdXNwaWNpb3VzQWN0aXZpdHknLFxyXG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4ubGl0ZXJhbCgnW3RpbWVzdGFtcCwgcmVxdWVzdElkLCBsZXZlbD1cIldBUk5cIiwgbWVzc2FnZT1cIlN1c3BpY2lvdXMgYWN0aXZpdHkgZGV0ZWN0ZWRcIl0nKSxcclxuICAgICAgbWV0cmljVmFsdWU6ICcxJyxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==