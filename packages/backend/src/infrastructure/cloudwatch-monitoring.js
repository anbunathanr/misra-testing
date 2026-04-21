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
exports.CloudWatchMonitoring = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const subscriptions = __importStar(require("aws-cdk-lib/aws-sns-subscriptions"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
const monitoring_config_1 = require("../config/monitoring-config");
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
class CloudWatchMonitoring extends constructs_1.Construct {
    logGroups;
    dashboard;
    alarmTopic;
    customMetrics;
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, api, lambdaFunctions, alertEmail } = props;
        const config = (0, monitoring_config_1.getMonitoringConfig)(environment);
        const thresholds = (0, monitoring_config_1.getThresholds)(environment);
        const alertConfig = (0, monitoring_config_1.getAlertConfig)(environment);
        // Create SNS topic for alarms
        this.alarmTopic = this.createAlarmTopic(environment, alertEmail);
        // Create log groups for all Lambda functions
        this.logGroups = this.createLogGroups(environment, lambdaFunctions, config);
        // Create custom metrics
        this.customMetrics = this.createCustomMetrics();
        // Create monitoring dashboard
        this.dashboard = this.createMonitoringDashboard(environment, api, lambdaFunctions);
        // Create alarms if enabled for this environment
        if (alertConfig.enabled) {
            this.createAlarms(environment, api, lambdaFunctions, thresholds, alertConfig);
        }
        // Create log insights queries
        this.createLogInsightsQueries(environment);
    }
    createAlarmTopic(environment, alertEmail) {
        const topic = new sns.Topic(this, 'AlarmTopic', {
            topicName: `misra-platform-alarms-${environment}`,
            displayName: `MISRA Platform Alarms - ${environment}`,
        });
        if (alertEmail) {
            topic.addSubscription(new subscriptions.EmailSubscription(alertEmail));
        }
        return topic;
    }
    createLogGroups(environment, lambdaFunctions, config) {
        const logGroups = {};
        // Determine log retention based on environment configuration
        const retention = config.logRetention === 30
            ? logs.RetentionDays.ONE_MONTH
            : config.logRetention === 14
                ? logs.RetentionDays.TWO_WEEKS
                : logs.RetentionDays.ONE_WEEK;
        // Create log groups for each Lambda function
        Object.entries(lambdaFunctions).forEach(([name, lambdaFunction]) => {
            logGroups[name] = new logs.LogGroup(this, `${name}LogGroup`, {
                logGroupName: `/aws/lambda/${lambdaFunction.functionName}`,
                retention,
                removalPolicy: cdk.RemovalPolicy.DESTROY,
            });
            // Grant Lambda permission to write to its log group
            lambdaFunction.addToRolePolicy(new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                ],
                resources: [logGroups[name].logGroupArn],
            }));
        });
        // Create additional log groups for system components
        logGroups.apiGateway = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
            logGroupName: `/aws/apigateway/misra-platform-${environment}`,
            retention,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.workflow = new logs.LogGroup(this, 'WorkflowLogGroup', {
            logGroupName: `/misra-platform/${environment}/workflow`,
            retention,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.analysis = new logs.LogGroup(this, 'AnalysisLogGroup', {
            logGroupName: `/misra-platform/${environment}/analysis`,
            retention,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        logGroups.security = new logs.LogGroup(this, 'SecurityLogGroup', {
            logGroupName: `/misra-platform/${environment}/security`,
            retention: config.logRetention >= 30
                ? logs.RetentionDays.THREE_MONTHS
                : logs.RetentionDays.ONE_MONTH,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        return logGroups;
    }
    createCustomMetrics() {
        const namespace = 'MISRA/Platform';
        return {
            // Workflow metrics
            workflowStarted: new cloudwatch.Metric({
                namespace,
                metricName: 'WorkflowStarted',
                statistic: 'Sum',
            }),
            workflowCompleted: new cloudwatch.Metric({
                namespace,
                metricName: 'WorkflowCompleted',
                statistic: 'Sum',
            }),
            workflowFailed: new cloudwatch.Metric({
                namespace,
                metricName: 'WorkflowFailed',
                statistic: 'Sum',
            }),
            workflowDuration: new cloudwatch.Metric({
                namespace,
                metricName: 'WorkflowDuration',
                statistic: 'Average',
            }),
            // Analysis metrics (enhanced for business logic)
            analysisStarted: new cloudwatch.Metric({
                namespace,
                metricName: 'AnalysisStarted',
                statistic: 'Sum',
            }),
            analysisCompleted: new cloudwatch.Metric({
                namespace,
                metricName: 'AnalysisCompleted',
                statistic: 'Sum',
            }),
            analysisFailed: new cloudwatch.Metric({
                namespace,
                metricName: 'AnalysisFailed',
                statistic: 'Sum',
            }),
            analysisDuration: new cloudwatch.Metric({
                namespace,
                metricName: 'AnalysisDuration',
                statistic: 'Average',
            }),
            complianceScore: new cloudwatch.Metric({
                namespace,
                metricName: 'ComplianceScore',
                statistic: 'Average',
            }),
            violationsDetected: new cloudwatch.Metric({
                namespace,
                metricName: 'ViolationsDetected',
                statistic: 'Sum',
            }),
            rulesProcessed: new cloudwatch.Metric({
                namespace,
                metricName: 'RulesProcessed',
                statistic: 'Sum',
            }),
            cacheHitRate: new cloudwatch.Metric({
                namespace,
                metricName: 'CacheHitRate',
                statistic: 'Average',
            }),
            // Authentication metrics
            authenticationAttempts: new cloudwatch.Metric({
                namespace,
                metricName: 'AuthenticationAttempts',
                statistic: 'Sum',
            }),
            authenticationSuccess: new cloudwatch.Metric({
                namespace,
                metricName: 'AuthenticationSuccess',
                statistic: 'Sum',
            }),
            authenticationFailure: new cloudwatch.Metric({
                namespace,
                metricName: 'AuthenticationFailure',
                statistic: 'Sum',
            }),
            otpVerificationSuccess: new cloudwatch.Metric({
                namespace,
                metricName: 'OTPVerificationSuccess',
                statistic: 'Sum',
            }),
            otpVerificationFailure: new cloudwatch.Metric({
                namespace,
                metricName: 'OTPVerificationFailure',
                statistic: 'Sum',
            }),
            // File operation metrics (enhanced)
            fileUploads: new cloudwatch.Metric({
                namespace,
                metricName: 'FileUploads',
                statistic: 'Sum',
            }),
            fileUploadSize: new cloudwatch.Metric({
                namespace,
                metricName: 'FileUploadSize',
                statistic: 'Average',
            }),
            fileUploadDuration: new cloudwatch.Metric({
                namespace,
                metricName: 'FileUploadDuration',
                statistic: 'Average',
            }),
            fileProcessingErrors: new cloudwatch.Metric({
                namespace,
                metricName: 'FileProcessingErrors',
                statistic: 'Sum',
            }),
            // DynamoDB operation metrics
            dynamodbReadLatency: new cloudwatch.Metric({
                namespace,
                metricName: 'DynamoDBReadLatency',
                statistic: 'Average',
            }),
            dynamodbWriteLatency: new cloudwatch.Metric({
                namespace,
                metricName: 'DynamoDBWriteLatency',
                statistic: 'Average',
            }),
            dynamodbThrottles: new cloudwatch.Metric({
                namespace,
                metricName: 'DynamoDBThrottles',
                statistic: 'Sum',
            }),
            // System health metrics
            systemHealth: new cloudwatch.Metric({
                namespace,
                metricName: 'SystemHealth',
                statistic: 'Average',
            }),
            errorRate: new cloudwatch.Metric({
                namespace,
                metricName: 'ErrorRate',
                statistic: 'Average',
            }),
            coldStarts: new cloudwatch.Metric({
                namespace,
                metricName: 'ColdStarts',
                statistic: 'Sum',
            }),
        };
    }
    createMonitoringDashboard(environment, api, lambdaFunctions) {
        const dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
            dashboardName: `MISRA-Platform-${environment}`,
        });
        // Workflow Overview Row
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Workflow Metrics',
            left: [
                this.customMetrics.workflowStarted,
                this.customMetrics.workflowCompleted,
                this.customMetrics.workflowFailed,
            ],
            width: 12,
            height: 6,
        }), new cloudwatch.SingleValueWidget({
            title: 'Workflow Success Rate',
            metrics: [
                new cloudwatch.MathExpression({
                    expression: '(completed / started) * 100',
                    usingMetrics: {
                        started: this.customMetrics.workflowStarted,
                        completed: this.customMetrics.workflowCompleted,
                    },
                }),
            ],
            width: 6,
            height: 6,
        }), new cloudwatch.SingleValueWidget({
            title: 'Average Workflow Duration',
            metrics: [this.customMetrics.workflowDuration],
            width: 6,
            height: 6,
        }));
        // Analysis Performance Row (Enhanced with business metrics)
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Analysis Performance',
            left: [
                this.customMetrics.analysisStarted,
                this.customMetrics.analysisCompleted,
                this.customMetrics.analysisFailed,
            ],
            right: [this.customMetrics.analysisDuration],
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'Compliance Scores & Violations',
            left: [this.customMetrics.complianceScore],
            right: [this.customMetrics.violationsDetected],
            width: 12,
            height: 6,
        }));
        // MISRA Business Logic Metrics Row (NEW)
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'MISRA Rules Processing',
            left: [this.customMetrics.rulesProcessed],
            right: [this.customMetrics.cacheHitRate],
            width: 12,
            height: 6,
        }), new cloudwatch.SingleValueWidget({
            title: 'Analysis Success Rate',
            metrics: [
                new cloudwatch.MathExpression({
                    expression: '(completed / started) * 100',
                    usingMetrics: {
                        started: this.customMetrics.analysisStarted,
                        completed: this.customMetrics.analysisCompleted,
                    },
                }),
            ],
            width: 6,
            height: 6,
        }), new cloudwatch.SingleValueWidget({
            title: 'Average Compliance Score',
            metrics: [this.customMetrics.complianceScore],
            width: 6,
            height: 6,
        }));
        // Authentication Metrics Row
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Authentication Metrics',
            left: [
                this.customMetrics.authenticationAttempts,
                this.customMetrics.authenticationSuccess,
                this.customMetrics.authenticationFailure,
            ],
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'OTP Verification',
            left: [
                this.customMetrics.otpVerificationSuccess,
                this.customMetrics.otpVerificationFailure,
            ],
            width: 12,
            height: 6,
        }));
        // API Gateway Metrics Row
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'API Gateway Requests',
            left: [
                api.metricCount(),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '4XXError',
                    dimensionsMap: {
                        ApiName: api.restApiName,
                    },
                    statistic: 'Sum',
                }),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: '5XXError',
                    dimensionsMap: {
                        ApiName: api.restApiName,
                    },
                    statistic: 'Sum',
                }),
            ],
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'API Gateway Latency',
            left: [
                api.metricLatency(),
                new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'IntegrationLatency',
                    dimensionsMap: {
                        ApiName: api.restApiName,
                    },
                    statistic: 'Average',
                }),
            ],
            width: 12,
            height: 6,
        }));
        // Lambda Functions Row
        const lambdaWidgets = [];
        Object.entries(lambdaFunctions).forEach(([name, func]) => {
            lambdaWidgets.push(new cloudwatch.GraphWidget({
                title: `${name} Lambda Metrics`,
                left: [
                    func.metricInvocations(),
                    func.metricErrors(),
                    func.metricThrottles(),
                ],
                right: [func.metricDuration()],
                width: 8,
                height: 6,
            }));
        });
        dashboard.addWidgets(...lambdaWidgets);
        // DynamoDB Performance Row (NEW)
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'DynamoDB Operations',
            left: [
                this.customMetrics.dynamodbReadLatency,
                this.customMetrics.dynamodbWriteLatency,
            ],
            right: [this.customMetrics.dynamodbThrottles],
            width: 12,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'File Operations',
            left: [
                this.customMetrics.fileUploads,
                this.customMetrics.fileUploadSize,
            ],
            right: [
                this.customMetrics.fileUploadDuration,
                this.customMetrics.fileProcessingErrors,
            ],
            width: 12,
            height: 6,
        }));
        // System Health Row (Enhanced)
        dashboard.addWidgets(new cloudwatch.SingleValueWidget({
            title: 'System Health Score',
            metrics: [this.customMetrics.systemHealth],
            width: 4,
            height: 6,
        }), new cloudwatch.SingleValueWidget({
            title: 'Error Rate',
            metrics: [this.customMetrics.errorRate],
            width: 4,
            height: 6,
        }), new cloudwatch.SingleValueWidget({
            title: 'Cold Starts',
            metrics: [this.customMetrics.coldStarts],
            width: 4,
            height: 6,
        }), new cloudwatch.GraphWidget({
            title: 'System Performance Trends',
            left: [
                this.customMetrics.errorRate,
                this.customMetrics.coldStarts,
            ],
            right: [this.customMetrics.systemHealth],
            width: 12,
            height: 6,
        }));
        return dashboard;
    }
    createAlarms(environment, api, lambdaFunctions, thresholds, alertConfig) {
        // High error rate alarm
        new cloudwatch.Alarm(this, 'HighErrorRateAlarm', {
            alarmName: `MISRA-Platform-HighErrorRate-${environment}`,
            alarmDescription: 'High error rate detected in the MISRA Platform',
            metric: this.customMetrics.errorRate,
            threshold: thresholds.errorRate,
            evaluationPeriods: alertConfig.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // Workflow failure rate alarm
        new cloudwatch.Alarm(this, 'WorkflowFailureRateAlarm', {
            alarmName: `MISRA-Platform-WorkflowFailureRate-${environment}`,
            alarmDescription: 'High workflow failure rate detected',
            metric: new cloudwatch.MathExpression({
                expression: '(failed / started) * 100',
                usingMetrics: {
                    failed: this.customMetrics.workflowFailed,
                    started: this.customMetrics.workflowStarted,
                },
            }),
            threshold: thresholds.workflowFailureRate,
            evaluationPeriods: alertConfig.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // Analysis duration alarm (should complete within configured time)
        new cloudwatch.Alarm(this, 'AnalysisDurationAlarm', {
            alarmName: `MISRA-Platform-AnalysisDuration-${environment}`,
            alarmDescription: 'Analysis taking too long to complete',
            metric: this.customMetrics.analysisDuration,
            threshold: thresholds.analysisDuration,
            evaluationPeriods: alertConfig.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // API Gateway 5XX errors alarm
        new cloudwatch.Alarm(this, 'ApiGateway5XXAlarm', {
            alarmName: `MISRA-Platform-ApiGateway5XX-${environment}`,
            alarmDescription: 'High number of 5XX errors in API Gateway',
            metric: new cloudwatch.Metric({
                namespace: 'AWS/ApiGateway',
                metricName: '5XXError',
                dimensionsMap: {
                    ApiName: api.restApiName,
                },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: environment === 'production' ? 5 : 10,
            evaluationPeriods: alertConfig.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // API Gateway latency alarm (NEW)
        new cloudwatch.Alarm(this, 'ApiGatewayHighLatencyAlarm', {
            alarmName: `MISRA-Platform-ApiGatewayLatency-${environment}`,
            alarmDescription: 'API Gateway experiencing high latency',
            metric: api.metricLatency({
                period: cdk.Duration.minutes(5),
                statistic: 'Average',
            }),
            threshold: thresholds.apiLatency,
            evaluationPeriods: alertConfig.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // DynamoDB throttling alarm (NEW)
        new cloudwatch.Alarm(this, 'DynamoDBThrottlingAlarm', {
            alarmName: `MISRA-Platform-DynamoDBThrottling-${environment}`,
            alarmDescription: 'DynamoDB operations being throttled',
            metric: this.customMetrics.dynamodbThrottles,
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // File processing errors alarm (NEW)
        new cloudwatch.Alarm(this, 'FileProcessingErrorsAlarm', {
            alarmName: `MISRA-Platform-FileProcessingErrors-${environment}`,
            alarmDescription: 'High number of file processing errors',
            metric: this.customMetrics.fileProcessingErrors,
            threshold: environment === 'production' ? 5 : 10,
            evaluationPeriods: alertConfig.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // Lambda function error alarms
        Object.entries(lambdaFunctions).forEach(([name, func]) => {
            new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
                alarmName: `MISRA-Platform-${name}-Errors-${environment}`,
                alarmDescription: `High error rate in ${name} Lambda function`,
                metric: func.metricErrors({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Sum',
                }),
                threshold: environment === 'production' ? 3 : 5,
                evaluationPeriods: alertConfig.evaluationPeriods,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
            // Lambda duration alarm (functions should complete quickly)
            new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
                alarmName: `MISRA-Platform-${name}-Duration-${environment}`,
                alarmDescription: `${name} Lambda function taking too long`,
                metric: func.metricDuration({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Average',
                }),
                threshold: name.includes('analyze') ? thresholds.analysisDuration : thresholds.lambdaDuration,
                evaluationPeriods: alertConfig.evaluationPeriods + 1, // Give functions a bit more time
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
            // Lambda throttling alarm (NEW)
            new cloudwatch.Alarm(this, `${name}ThrottlingAlarm`, {
                alarmName: `MISRA-Platform-${name}-Throttling-${environment}`,
                alarmDescription: `${name} Lambda function being throttled`,
                metric: func.metricThrottles({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Sum',
                }),
                threshold: 1,
                evaluationPeriods: 1,
                comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        });
        // Authentication failure alarm
        new cloudwatch.Alarm(this, 'AuthFailureAlarm', {
            alarmName: `MISRA-Platform-AuthFailures-${environment}`,
            alarmDescription: 'High number of authentication failures',
            metric: this.customMetrics.authenticationFailure,
            threshold: thresholds.authFailures,
            evaluationPeriods: alertConfig.evaluationPeriods,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // Compliance score degradation alarm (NEW)
        new cloudwatch.Alarm(this, 'ComplianceScoreDegradationAlarm', {
            alarmName: `MISRA-Platform-ComplianceScoreDegradation-${environment}`,
            alarmDescription: 'Average compliance score is degrading',
            metric: this.customMetrics.complianceScore,
            threshold: 50, // Alert if average compliance drops below 50%
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // Health check failure alarm (NEW)
        new cloudwatch.Alarm(this, 'HealthCheckFailureAlarm', {
            alarmName: `MISRA-Platform-HealthCheckFailure-${environment}`,
            alarmDescription: 'Health check endpoint reporting unhealthy status',
            metric: new cloudwatch.Metric({
                namespace: 'MISRA/Platform',
                metricName: 'HealthCheckFailed',
                statistic: 'Sum',
                period: cdk.Duration.minutes(1),
            }),
            threshold: 1,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.BREACHING, // Treat missing data as unhealthy
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // Service degradation alarm (NEW)
        new cloudwatch.Alarm(this, 'ServiceDegradationAlarm', {
            alarmName: `MISRA-Platform-ServiceDegradation-${environment}`,
            alarmDescription: 'One or more services reporting degraded status',
            metric: new cloudwatch.Metric({
                namespace: 'MISRA/Platform',
                metricName: 'ServiceDegraded',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 1,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
        // Health check response time alarm (NEW)
        new cloudwatch.Alarm(this, 'HealthCheckSlowResponseAlarm', {
            alarmName: `MISRA-Platform-HealthCheckSlowResponse-${environment}`,
            alarmDescription: 'Health check endpoint responding slowly',
            metric: new cloudwatch.Metric({
                namespace: 'MISRA/Platform',
                metricName: 'HealthCheckDuration',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5000, // 5 seconds
            evaluationPeriods: 3,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        }).addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(this.alarmTopic));
    }
    createLogInsightsQueries(environment) {
        // Create CloudWatch Insights queries for common debugging scenarios
        const queries = Object.entries(monitoring_config_1.LOG_INSIGHTS_QUERIES).map(([key, config]) => ({
            name: config.name,
            description: config.description,
            query: config.query.trim(),
        }));
        // Note: CloudWatch Insights queries are created through the console or CLI
        // This is for documentation purposes - the queries above can be saved in the console
        new cdk.CfnOutput(this, 'LogInsightsQueries', {
            value: JSON.stringify(queries, null, 2),
            description: 'CloudWatch Insights queries for debugging (save these in the CloudWatch console)',
        });
    }
    /**
     * Create structured logging configuration for Lambda functions
     */
    getStructuredLoggingConfig() {
        return {
            LOG_LEVEL: 'INFO',
            ENABLE_STRUCTURED_LOGGING: 'true',
            CORRELATION_ID_HEADER: 'X-Correlation-ID',
            LOG_FORMAT: 'JSON',
            ENABLE_PERFORMANCE_LOGGING: 'true',
            ENABLE_SECURITY_LOGGING: 'true',
        };
    }
    /**
     * Get CloudWatch metrics configuration for Lambda functions
     */
    getMetricsConfig() {
        return {
            CLOUDWATCH_NAMESPACE: 'MISRA/Platform',
            ENABLE_CUSTOM_METRICS: 'true',
            METRICS_BUFFER_SIZE: '10',
            METRICS_FLUSH_INTERVAL: '30000', // 30 seconds
        };
    }
    /**
     * Get X-Ray tracing configuration for Lambda functions
     */
    getXRayConfig() {
        return {
            AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
            AWS_XRAY_TRACING_NAME: 'MISRA-Platform',
            AWS_XRAY_DEBUG_MODE: 'false',
        };
    }
    /**
     * Add X-Ray tracing permissions to Lambda execution role
     */
    addXRayPermissions(role) {
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'));
    }
}
exports.CloudWatchMonitoring = CloudWatchMonitoring;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xvdWR3YXRjaC1tb25pdG9yaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xvdWR3YXRjaC1tb25pdG9yaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyREFBNkM7QUFDN0MsdUVBQXlEO0FBR3pELHlEQUEyQztBQUMzQyxpRkFBbUU7QUFDbkUseURBQTJDO0FBQzNDLDJDQUF1QztBQUN2QyxtRUFBdUg7QUFTdkg7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSxvQkFBcUIsU0FBUSxzQkFBUztJQUNqQyxTQUFTLENBQW1DO0lBQzVDLFNBQVMsQ0FBdUI7SUFDaEMsVUFBVSxDQUFZO0lBQ3RCLGFBQWEsQ0FBdUM7SUFFcEUsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sRUFBRSxXQUFXLEVBQUUsR0FBRyxFQUFFLGVBQWUsRUFBRSxVQUFVLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDaEUsTUFBTSxNQUFNLEdBQUcsSUFBQSx1Q0FBbUIsRUFBQyxXQUFXLENBQUMsQ0FBQztRQUNoRCxNQUFNLFVBQVUsR0FBRyxJQUFBLGlDQUFhLEVBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUMsTUFBTSxXQUFXLEdBQUcsSUFBQSxrQ0FBYyxFQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRWhELDhCQUE4QjtRQUM5QixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFakUsNkNBQTZDO1FBQzdDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRTVFLHdCQUF3QjtRQUN4QixJQUFJLENBQUMsYUFBYSxH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QUksRUFBRSxDQUFDLENBQUM7WUFDdkMsV0FBVyxFQUFFLGtGQUFrRjtTQUNoRyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSSwwQkFBMEI7UUFDL0IsT0FBTztZQUNMLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLHlCQUF5QixFQUFFLE1BQU07WUFDakMscUJBQXFCLEVBQUUsa0JBQWtCO1lBQ3pDLFVBQVUsRUFBRSxNQUFNO1lBQ2xCLDBCQUEwQixFQUFFLE1BQU07WUFDbEMsdUJBQXVCLEVBQUUsTUFBTTtTQUNoQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ksZ0JBQWdCO1FBQ3JCLE9BQU87WUFDTCxvQkFBb0IsRUFBRSxnQkFBZ0I7WUFDdEMscUJBQXFCLEVBQUUsTUFBTTtZQUM3QixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLHNCQUFzQixFQUFFLE9BQU8sRUFBRSxhQUFhO1NBQy9DLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSSxhQUFhO1FBQ2xCLE9BQU87WUFDTCx3QkFBd0IsRUFBRSxXQUFXO1lBQ3JDLHFCQUFxQixFQUFFLGdCQUFnQjtZQUN2QyxtQkFBbUIsRUFBRSxPQUFPO1NBQzdCLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSSxrQkFBa0IsQ0FBQyxJQUFlO1FBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsQ0FDbkIsR0FBRyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUN2RSxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBbHhCRCxvREFreEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCAqIGFzIHN1YnNjcmlwdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucy1zdWJzY3JpcHRpb25zJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgZ2V0TW9uaXRvcmluZ0NvbmZpZywgZ2V0VGhyZXNob2xkcywgZ2V0QWxlcnRDb25maWcsIExPR19JTlNJR0hUU19RVUVSSUVTIH0gZnJvbSAnLi4vY29uZmlnL21vbml0b3JpbmctY29uZmlnJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2xvdWRXYXRjaE1vbml0b3JpbmdQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6ICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nO1xyXG4gIGFwaTogYXBpZ2F0ZXdheS5SZXN0QXBpO1xyXG4gIGxhbWJkYUZ1bmN0aW9uczogeyBba2V5OiBzdHJpbmddOiBsYW1iZGEuRnVuY3Rpb24gfTtcclxuICBhbGVydEVtYWlsPzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogQ2xvdWRXYXRjaCBNb25pdG9yaW5nIEluZnJhc3RydWN0dXJlXHJcbiAqIFxyXG4gKiBQcm92aWRlcyBjb21wcmVoZW5zaXZlIG1vbml0b3JpbmcgZm9yIHRoZSBNSVNSQSBQbGF0Zm9ybSBpbmNsdWRpbmc6XHJcbiAqIC0gTG9nIGdyb3VwcyBmb3IgYWxsIExhbWJkYSBmdW5jdGlvbnMgd2l0aCBwcm9wZXIgcmV0ZW50aW9uXHJcbiAqIC0gQ3VzdG9tIG1ldHJpY3MgZm9yIGFuYWx5c2lzIHBlcmZvcm1hbmNlIGFuZCB3b3JrZmxvdyB0cmFja2luZ1xyXG4gKiAtIFN0cnVjdHVyZWQgbG9nZ2luZyB3aXRoIGNvcnJlbGF0aW9uIElEc1xyXG4gKiAtIE1vbml0b3JpbmcgZGFzaGJvYXJkcyBmb3IgcHJvZHVjdGlvbiB2aXNpYmlsaXR5XHJcbiAqIC0gQWxhcm1zIGZvciBlcnJvciByYXRlcywgcGVyZm9ybWFuY2UgZGVncmFkYXRpb24sIGFuZCBzeXN0ZW0gaGVhbHRoXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ2xvdWRXYXRjaE1vbml0b3JpbmcgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBsb2dHcm91cHM6IHsgW2tleTogc3RyaW5nXTogbG9ncy5Mb2dHcm91cCB9O1xyXG4gIHB1YmxpYyByZWFkb25seSBkYXNoYm9hcmQ6IGNsb3Vkd2F0Y2guRGFzaGJvYXJkO1xyXG4gIHB1YmxpYyByZWFkb25seSBhbGFybVRvcGljOiBzbnMuVG9waWM7XHJcbiAgcHVibGljIHJlYWRvbmx5IGN1c3RvbU1ldHJpY3M6IHsgW2tleTogc3RyaW5nXTogY2xvdWR3YXRjaC5NZXRyaWMgfTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENsb3VkV2F0Y2hNb25pdG9yaW5nUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgYXBpLCBsYW1iZGFGdW5jdGlvbnMsIGFsZXJ0RW1haWwgfSA9IHByb3BzO1xyXG4gICAgY29uc3QgY29uZmlnID0gZ2V0TW9uaXRvcmluZ0NvbmZpZyhlbnZpcm9ubWVudCk7XHJcbiAgICBjb25zdCB0aHJlc2hvbGRzID0gZ2V0VGhyZXNob2xkcyhlbnZpcm9ubWVudCk7XHJcbiAgICBjb25zdCBhbGVydENvbmZpZyA9IGdldEFsZXJ0Q29uZmlnKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBhbGFybXNcclxuICAgIHRoaXMuYWxhcm1Ub3BpYyA9IHRoaXMuY3JlYXRlQWxhcm1Ub3BpYyhlbnZpcm9ubWVudCwgYWxlcnRFbWFpbCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGxvZyBncm91cHMgZm9yIGFsbCBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICB0aGlzLmxvZ0dyb3VwcyA9IHRoaXMuY3JlYXRlTG9nR3JvdXBzKGVudmlyb25tZW50LCBsYW1iZGFGdW5jdGlvbnMsIGNvbmZpZyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGN1c3RvbSBtZXRyaWNzXHJcbiAgICB0aGlzLmN1c3RvbU1ldHJpY3MgPSB0aGlzLmNyZWF0ZUN1c3RvbU1ldHJpY3MoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbW9uaXRvcmluZyBkYXNoYm9hcmRcclxuICAgIHRoaXMuZGFzaGJvYXJkID0gdGhpcy5jcmVhdGVNb25pdG9yaW5nRGFzaGJvYXJkKGVudmlyb25tZW50LCBhcGksIGxhbWJkYUZ1bmN0aW9ucyk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGFsYXJtcyBpZiBlbmFibGVkIGZvciB0aGlzIGVudmlyb25tZW50XHJcbiAgICBpZiAoYWxlcnRDb25maWcuZW5hYmxlZCkge1xyXG4gICAgICB0aGlzLmNyZWF0ZUFsYXJtcyhlbnZpcm9ubWVudCwgYXBpLCBsYW1iZGFGdW5jdGlvbnMsIHRocmVzaG9sZHMsIGFsZXJ0Q29uZmlnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDcmVhdGUgbG9nIGluc2lnaHRzIHF1ZXJpZXNcclxuICAgIHRoaXMuY3JlYXRlTG9nSW5zaWdodHNRdWVyaWVzKGVudmlyb25tZW50KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQWxhcm1Ub3BpYyhlbnZpcm9ubWVudDogc3RyaW5nLCBhbGVydEVtYWlsPzogc3RyaW5nKTogc25zLlRvcGljIHtcclxuICAgIGNvbnN0IHRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnQWxhcm1Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYWxhcm1zLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGlzcGxheU5hbWU6IGBNSVNSQSBQbGF0Zm9ybSBBbGFybXMgLSAke2Vudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBpZiAoYWxlcnRFbWFpbCkge1xyXG4gICAgICB0b3BpYy5hZGRTdWJzY3JpcHRpb24obmV3IHN1YnNjcmlwdGlvbnMuRW1haWxTdWJzY3JpcHRpb24oYWxlcnRFbWFpbCkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB0b3BpYztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlTG9nR3JvdXBzKFxyXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcclxuICAgIGxhbWJkYUZ1bmN0aW9uczogeyBba2V5OiBzdHJpbmddOiBsYW1iZGEuRnVuY3Rpb24gfSxcclxuICAgIGNvbmZpZzogYW55XHJcbiAgKTogeyBba2V5OiBzdHJpbmddOiBsb2dzLkxvZ0dyb3VwIH0ge1xyXG4gICAgY29uc3QgbG9nR3JvdXBzOiB7IFtrZXk6IHN0cmluZ106IGxvZ3MuTG9nR3JvdXAgfSA9IHt9O1xyXG5cclxuICAgIC8vIERldGVybWluZSBsb2cgcmV0ZW50aW9uIGJhc2VkIG9uIGVudmlyb25tZW50IGNvbmZpZ3VyYXRpb25cclxuICAgIGNvbnN0IHJldGVudGlvbiA9IGNvbmZpZy5sb2dSZXRlbnRpb24gPT09IDMwIFxyXG4gICAgICA/IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEggXHJcbiAgICAgIDogY29uZmlnLmxvZ1JldGVudGlvbiA9PT0gMTRcclxuICAgICAgPyBsb2dzLlJldGVudGlvbkRheXMuVFdPX1dFRUtTXHJcbiAgICAgIDogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLO1xyXG5cclxuICAgIC8vIENyZWF0ZSBsb2cgZ3JvdXBzIGZvciBlYWNoIExhbWJkYSBmdW5jdGlvblxyXG4gICAgT2JqZWN0LmVudHJpZXMobGFtYmRhRnVuY3Rpb25zKS5mb3JFYWNoKChbbmFtZSwgbGFtYmRhRnVuY3Rpb25dKSA9PiB7XHJcbiAgICAgIGxvZ0dyb3Vwc1tuYW1lXSA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsIGAke25hbWV9TG9nR3JvdXBgLCB7XHJcbiAgICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9sYW1iZGEvJHtsYW1iZGFGdW5jdGlvbi5mdW5jdGlvbk5hbWV9YCxcclxuICAgICAgICByZXRlbnRpb24sXHJcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHcmFudCBMYW1iZGEgcGVybWlzc2lvbiB0byB3cml0ZSB0byBpdHMgbG9nIGdyb3VwXHJcbiAgICAgIGxhbWJkYUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXHJcbiAgICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbbG9nR3JvdXBzW25hbWVdLmxvZ0dyb3VwQXJuXSxcclxuICAgICAgfSkpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGFkZGl0aW9uYWwgbG9nIGdyb3VwcyBmb3Igc3lzdGVtIGNvbXBvbmVudHNcclxuICAgIGxvZ0dyb3Vwcy5hcGlHYXRld2F5ID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0FwaUdhdGV3YXlMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9hcGlnYXRld2F5L21pc3JhLXBsYXRmb3JtLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbG9nR3JvdXBzLndvcmtmbG93ID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1dvcmtmbG93TG9nR3JvdXAnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9taXNyYS1wbGF0Zm9ybS8ke2Vudmlyb25tZW50fS93b3JrZmxvd2AsXHJcbiAgICAgIHJldGVudGlvbixcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIGxvZ0dyb3Vwcy5hbmFseXNpcyA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdBbmFseXNpc0xvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvbWlzcmEtcGxhdGZvcm0vJHtlbnZpcm9ubWVudH0vYW5hbHlzaXNgLFxyXG4gICAgICByZXRlbnRpb24sXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICBsb2dHcm91cHMuc2VjdXJpdHkgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnU2VjdXJpdHlMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL21pc3JhLXBsYXRmb3JtLyR7ZW52aXJvbm1lbnR9L3NlY3VyaXR5YCxcclxuICAgICAgcmV0ZW50aW9uOiBjb25maWcubG9nUmV0ZW50aW9uID49IDMwIFxyXG4gICAgICAgID8gbG9ncy5SZXRlbnRpb25EYXlzLlRIUkVFX01PTlRIUyBcclxuICAgICAgICA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEgsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gbG9nR3JvdXBzO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVDdXN0b21NZXRyaWNzKCk6IHsgW2tleTogc3RyaW5nXTogY2xvdWR3YXRjaC5NZXRyaWMgfSB7XHJcbiAgICBjb25zdCBuYW1lc3BhY2UgPSAnTUlTUkEvUGxhdGZvcm0nO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIC8vIFdvcmtmbG93IG1ldHJpY3NcclxuICAgICAgd29ya2Zsb3dTdGFydGVkOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnV29ya2Zsb3dTdGFydGVkJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgd29ya2Zsb3dDb21wbGV0ZWQ6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdXb3JrZmxvd0NvbXBsZXRlZCcsXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgfSksXHJcbiAgICAgIHdvcmtmbG93RmFpbGVkOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnV29ya2Zsb3dGYWlsZWQnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgIH0pLFxyXG4gICAgICB3b3JrZmxvd0R1cmF0aW9uOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnV29ya2Zsb3dEdXJhdGlvbicsXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgIH0pLFxyXG5cclxuICAgICAgLy8gQW5hbHlzaXMgbWV0cmljcyAoZW5oYW5jZWQgZm9yIGJ1c2luZXNzIGxvZ2ljKVxyXG4gICAgICBhbmFseXNpc1N0YXJ0ZWQ6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdBbmFseXNpc1N0YXJ0ZWQnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhbmFseXNpc0NvbXBsZXRlZDogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2UsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0FuYWx5c2lzQ29tcGxldGVkJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgYW5hbHlzaXNGYWlsZWQ6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdBbmFseXNpc0ZhaWxlZCcsXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgfSksXHJcbiAgICAgIGFuYWx5c2lzRHVyYXRpb246IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdBbmFseXNpc0R1cmF0aW9uJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgfSksXHJcbiAgICAgIGNvbXBsaWFuY2VTY29yZTogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2UsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0NvbXBsaWFuY2VTY29yZScsXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgIH0pLFxyXG4gICAgICB2aW9sYXRpb25zRGV0ZWN0ZWQ6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdWaW9sYXRpb25zRGV0ZWN0ZWQnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgIH0pLFxyXG4gICAgICBydWxlc1Byb2Nlc3NlZDogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2UsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ1J1bGVzUHJvY2Vzc2VkJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgY2FjaGVIaXRSYXRlOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQ2FjaGVIaXRSYXRlJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgfSksXHJcblxyXG4gICAgICAvLyBBdXRoZW50aWNhdGlvbiBtZXRyaWNzXHJcbiAgICAgIGF1dGhlbnRpY2F0aW9uQXR0ZW1wdHM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdBdXRoZW50aWNhdGlvbkF0dGVtcHRzJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aGVudGljYXRpb25TdWNjZXNzOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQXV0aGVudGljYXRpb25TdWNjZXNzJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aGVudGljYXRpb25GYWlsdXJlOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQXV0aGVudGljYXRpb25GYWlsdXJlJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgb3RwVmVyaWZpY2F0aW9uU3VjY2VzczogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2UsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ09UUFZlcmlmaWNhdGlvblN1Y2Nlc3MnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgIH0pLFxyXG4gICAgICBvdHBWZXJpZmljYXRpb25GYWlsdXJlOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnT1RQVmVyaWZpY2F0aW9uRmFpbHVyZScsXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgfSksXHJcblxyXG4gICAgICAvLyBGaWxlIG9wZXJhdGlvbiBtZXRyaWNzIChlbmhhbmNlZClcclxuICAgICAgZmlsZVVwbG9hZHM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdGaWxlVXBsb2FkcycsXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgfSksXHJcbiAgICAgIGZpbGVVcGxvYWRTaXplOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRmlsZVVwbG9hZFNpemUnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICB9KSxcclxuICAgICAgZmlsZVVwbG9hZER1cmF0aW9uOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRmlsZVVwbG9hZER1cmF0aW9uJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgfSksXHJcbiAgICAgIGZpbGVQcm9jZXNzaW5nRXJyb3JzOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRmlsZVByb2Nlc3NpbmdFcnJvcnMnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgIH0pLFxyXG5cclxuICAgICAgLy8gRHluYW1vREIgb3BlcmF0aW9uIG1ldHJpY3NcclxuICAgICAgZHluYW1vZGJSZWFkTGF0ZW5jeTogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2UsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0R5bmFtb0RCUmVhZExhdGVuY3knLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICB9KSxcclxuICAgICAgZHluYW1vZGJXcml0ZUxhdGVuY3k6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdEeW5hbW9EQldyaXRlTGF0ZW5jeScsXHJcbiAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgIH0pLFxyXG4gICAgICBkeW5hbW9kYlRocm90dGxlczogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2UsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0R5bmFtb0RCVGhyb3R0bGVzJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuXHJcbiAgICAgIC8vIFN5c3RlbSBoZWFsdGggbWV0cmljc1xyXG4gICAgICBzeXN0ZW1IZWFsdGg6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdTeXN0ZW1IZWFsdGgnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICB9KSxcclxuICAgICAgZXJyb3JSYXRlOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZSxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnRXJyb3JSYXRlJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgfSksXHJcbiAgICAgIGNvbGRTdGFydHM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdDb2xkU3RhcnRzJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZU1vbml0b3JpbmdEYXNoYm9hcmQoXHJcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nLFxyXG4gICAgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGksXHJcbiAgICBsYW1iZGFGdW5jdGlvbnM6IHsgW2tleTogc3RyaW5nXTogbGFtYmRhLkZ1bmN0aW9uIH1cclxuICApOiBjbG91ZHdhdGNoLkRhc2hib2FyZCB7XHJcbiAgICBjb25zdCBkYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ01vbml0b3JpbmdEYXNoYm9hcmQnLCB7XHJcbiAgICAgIGRhc2hib2FyZE5hbWU6IGBNSVNSQS1QbGF0Zm9ybS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBXb3JrZmxvdyBPdmVydmlldyBSb3dcclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdXb3JrZmxvdyBNZXRyaWNzJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICB0aGlzLmN1c3RvbU1ldHJpY3Mud29ya2Zsb3dTdGFydGVkLFxyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLndvcmtmbG93Q29tcGxldGVkLFxyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLndvcmtmbG93RmFpbGVkLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlNpbmdsZVZhbHVlV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1dvcmtmbG93IFN1Y2Nlc3MgUmF0ZScsXHJcbiAgICAgICAgbWV0cmljczogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgICAgICBleHByZXNzaW9uOiAnKGNvbXBsZXRlZCAvIHN0YXJ0ZWQpICogMTAwJyxcclxuICAgICAgICAgICAgdXNpbmdNZXRyaWNzOiB7XHJcbiAgICAgICAgICAgICAgc3RhcnRlZDogdGhpcy5jdXN0b21NZXRyaWNzLndvcmtmbG93U3RhcnRlZCxcclxuICAgICAgICAgICAgICBjb21wbGV0ZWQ6IHRoaXMuY3VzdG9tTWV0cmljcy53b3JrZmxvd0NvbXBsZXRlZCxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDYsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guU2luZ2xlVmFsdWVXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQXZlcmFnZSBXb3JrZmxvdyBEdXJhdGlvbicsXHJcbiAgICAgICAgbWV0cmljczogW3RoaXMuY3VzdG9tTWV0cmljcy53b3JrZmxvd0R1cmF0aW9uXSxcclxuICAgICAgICB3aWR0aDogNixcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIFBlcmZvcm1hbmNlIFJvdyAoRW5oYW5jZWQgd2l0aCBidXNpbmVzcyBtZXRyaWNzKVxyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FuYWx5c2lzIFBlcmZvcm1hbmNlJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICB0aGlzLmN1c3RvbU1ldHJpY3MuYW5hbHlzaXNTdGFydGVkLFxyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLmFuYWx5c2lzQ29tcGxldGVkLFxyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLmFuYWx5c2lzRmFpbGVkLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmlnaHQ6IFt0aGlzLmN1c3RvbU1ldHJpY3MuYW5hbHlzaXNEdXJhdGlvbl0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0NvbXBsaWFuY2UgU2NvcmVzICYgVmlvbGF0aW9ucycsXHJcbiAgICAgICAgbGVmdDogW3RoaXMuY3VzdG9tTWV0cmljcy5jb21wbGlhbmNlU2NvcmVdLFxyXG4gICAgICAgIHJpZ2h0OiBbdGhpcy5jdXN0b21NZXRyaWNzLnZpb2xhdGlvbnNEZXRlY3RlZF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gTUlTUkEgQnVzaW5lc3MgTG9naWMgTWV0cmljcyBSb3cgKE5FVylcclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdNSVNSQSBSdWxlcyBQcm9jZXNzaW5nJyxcclxuICAgICAgICBsZWZ0OiBbdGhpcy5jdXN0b21NZXRyaWNzLnJ1bGVzUHJvY2Vzc2VkXSxcclxuICAgICAgICByaWdodDogW3RoaXMuY3VzdG9tTWV0cmljcy5jYWNoZUhpdFJhdGVdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5TaW5nbGVWYWx1ZVdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBbmFseXNpcyBTdWNjZXNzIFJhdGUnLFxyXG4gICAgICAgIG1ldHJpY3M6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1hdGhFeHByZXNzaW9uKHtcclxuICAgICAgICAgICAgZXhwcmVzc2lvbjogJyhjb21wbGV0ZWQgLyBzdGFydGVkKSAqIDEwMCcsXHJcbiAgICAgICAgICAgIHVzaW5nTWV0cmljczoge1xyXG4gICAgICAgICAgICAgIHN0YXJ0ZWQ6IHRoaXMuY3VzdG9tTWV0cmljcy5hbmFseXNpc1N0YXJ0ZWQsXHJcbiAgICAgICAgICAgICAgY29tcGxldGVkOiB0aGlzLmN1c3RvbU1ldHJpY3MuYW5hbHlzaXNDb21wbGV0ZWQsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiA2LFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlNpbmdsZVZhbHVlV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0F2ZXJhZ2UgQ29tcGxpYW5jZSBTY29yZScsXHJcbiAgICAgICAgbWV0cmljczogW3RoaXMuY3VzdG9tTWV0cmljcy5jb21wbGlhbmNlU2NvcmVdLFxyXG4gICAgICAgIHdpZHRoOiA2LFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gTWV0cmljcyBSb3dcclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBdXRoZW50aWNhdGlvbiBNZXRyaWNzJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICB0aGlzLmN1c3RvbU1ldHJpY3MuYXV0aGVudGljYXRpb25BdHRlbXB0cyxcclxuICAgICAgICAgIHRoaXMuY3VzdG9tTWV0cmljcy5hdXRoZW50aWNhdGlvblN1Y2Nlc3MsXHJcbiAgICAgICAgICB0aGlzLmN1c3RvbU1ldHJpY3MuYXV0aGVudGljYXRpb25GYWlsdXJlLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ09UUCBWZXJpZmljYXRpb24nLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIHRoaXMuY3VzdG9tTWV0cmljcy5vdHBWZXJpZmljYXRpb25TdWNjZXNzLFxyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLm90cFZlcmlmaWNhdGlvbkZhaWx1cmUsXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSBNZXRyaWNzIFJvd1xyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FQSSBHYXRld2F5IFJlcXVlc3RzJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBhcGkubWV0cmljQ291bnQoKSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJzRYWEVycm9yJyxcclxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgIEFwaU5hbWU6IGFwaS5yZXN0QXBpTmFtZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnNVhYRXJyb3InLFxyXG4gICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgQXBpTmFtZTogYXBpLnJlc3RBcGlOYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQVBJIEdhdGV3YXkgTGF0ZW5jeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgYXBpLm1ldHJpY0xhdGVuY3koKSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FXUy9BcGlHYXRld2F5JyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0ludGVncmF0aW9uTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIGRpbWVuc2lvbnNNYXA6IHtcclxuICAgICAgICAgICAgICBBcGlOYW1lOiBhcGkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBMYW1iZGEgRnVuY3Rpb25zIFJvd1xyXG4gICAgY29uc3QgbGFtYmRhV2lkZ2V0czogY2xvdWR3YXRjaC5JV2lkZ2V0W10gPSBbXTtcclxuICAgIE9iamVjdC5lbnRyaWVzKGxhbWJkYUZ1bmN0aW9ucykuZm9yRWFjaCgoW25hbWUsIGZ1bmNdKSA9PiB7XHJcbiAgICAgIGxhbWJkYVdpZGdldHMucHVzaChcclxuICAgICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgICB0aXRsZTogYCR7bmFtZX0gTGFtYmRhIE1ldHJpY3NgLFxyXG4gICAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgICBmdW5jLm1ldHJpY0ludm9jYXRpb25zKCksXHJcbiAgICAgICAgICAgIGZ1bmMubWV0cmljRXJyb3JzKCksXHJcbiAgICAgICAgICAgIGZ1bmMubWV0cmljVGhyb3R0bGVzKCksXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgcmlnaHQ6IFtmdW5jLm1ldHJpY0R1cmF0aW9uKCldLFxyXG4gICAgICAgICAgd2lkdGg6IDgsXHJcbiAgICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoLi4ubGFtYmRhV2lkZ2V0cyk7XHJcblxyXG4gICAgLy8gRHluYW1vREIgUGVyZm9ybWFuY2UgUm93IChORVcpXHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnRHluYW1vREIgT3BlcmF0aW9ucycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLmR5bmFtb2RiUmVhZExhdGVuY3ksXHJcbiAgICAgICAgICB0aGlzLmN1c3RvbU1ldHJpY3MuZHluYW1vZGJXcml0ZUxhdGVuY3ksXHJcbiAgICAgICAgXSxcclxuICAgICAgICByaWdodDogW3RoaXMuY3VzdG9tTWV0cmljcy5keW5hbW9kYlRocm90dGxlc10sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0ZpbGUgT3BlcmF0aW9ucycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLmZpbGVVcGxvYWRzLFxyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLmZpbGVVcGxvYWRTaXplLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmlnaHQ6IFtcclxuICAgICAgICAgIHRoaXMuY3VzdG9tTWV0cmljcy5maWxlVXBsb2FkRHVyYXRpb24sXHJcbiAgICAgICAgICB0aGlzLmN1c3RvbU1ldHJpY3MuZmlsZVByb2Nlc3NpbmdFcnJvcnMsXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgICAgaGVpZ2h0OiA2LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBTeXN0ZW0gSGVhbHRoIFJvdyAoRW5oYW5jZWQpXHJcbiAgICBkYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guU2luZ2xlVmFsdWVXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU3lzdGVtIEhlYWx0aCBTY29yZScsXHJcbiAgICAgICAgbWV0cmljczogW3RoaXMuY3VzdG9tTWV0cmljcy5zeXN0ZW1IZWFsdGhdLFxyXG4gICAgICAgIHdpZHRoOiA0LFxyXG4gICAgICAgIGhlaWdodDogNixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlNpbmdsZVZhbHVlV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0Vycm9yIFJhdGUnLFxyXG4gICAgICAgIG1ldHJpY3M6IFt0aGlzLmN1c3RvbU1ldHJpY3MuZXJyb3JSYXRlXSxcclxuICAgICAgICB3aWR0aDogNCxcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5TaW5nbGVWYWx1ZVdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdDb2xkIFN0YXJ0cycsXHJcbiAgICAgICAgbWV0cmljczogW3RoaXMuY3VzdG9tTWV0cmljcy5jb2xkU3RhcnRzXSxcclxuICAgICAgICB3aWR0aDogNCxcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdTeXN0ZW0gUGVyZm9ybWFuY2UgVHJlbmRzJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICB0aGlzLmN1c3RvbU1ldHJpY3MuZXJyb3JSYXRlLFxyXG4gICAgICAgICAgdGhpcy5jdXN0b21NZXRyaWNzLmNvbGRTdGFydHMsXHJcbiAgICAgICAgXSxcclxuICAgICAgICByaWdodDogW3RoaXMuY3VzdG9tTWV0cmljcy5zeXN0ZW1IZWFsdGhdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgICBoZWlnaHQ6IDYsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIHJldHVybiBkYXNoYm9hcmQ7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUFsYXJtcyhcclxuICAgIGVudmlyb25tZW50OiBzdHJpbmcsXHJcbiAgICBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaSxcclxuICAgIGxhbWJkYUZ1bmN0aW9uczogeyBba2V5OiBzdHJpbmddOiBsYW1iZGEuRnVuY3Rpb24gfSxcclxuICAgIHRocmVzaG9sZHM6IGFueSxcclxuICAgIGFsZXJ0Q29uZmlnOiBhbnlcclxuICApOiB2b2lkIHtcclxuICAgIC8vIEhpZ2ggZXJyb3IgcmF0ZSBhbGFybVxyXG4gICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0hpZ2hFcnJvclJhdGVBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtUGxhdGZvcm0tSGlnaEVycm9yUmF0ZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdIaWdoIGVycm9yIHJhdGUgZGV0ZWN0ZWQgaW4gdGhlIE1JU1JBIFBsYXRmb3JtJyxcclxuICAgICAgbWV0cmljOiB0aGlzLmN1c3RvbU1ldHJpY3MuZXJyb3JSYXRlLFxyXG4gICAgICB0aHJlc2hvbGQ6IHRocmVzaG9sZHMuZXJyb3JSYXRlLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogYWxlcnRDb25maWcuZXZhbHVhdGlvblBlcmlvZHMsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2RrLmF3c19jbG91ZHdhdGNoX2FjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xyXG5cclxuICAgIC8vIFdvcmtmbG93IGZhaWx1cmUgcmF0ZSBhbGFybVxyXG4gICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1dvcmtmbG93RmFpbHVyZVJhdGVBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtUGxhdGZvcm0tV29ya2Zsb3dGYWlsdXJlUmF0ZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdIaWdoIHdvcmtmbG93IGZhaWx1cmUgcmF0ZSBkZXRlY3RlZCcsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgIGV4cHJlc3Npb246ICcoZmFpbGVkIC8gc3RhcnRlZCkgKiAxMDAnLFxyXG4gICAgICAgIHVzaW5nTWV0cmljczoge1xyXG4gICAgICAgICAgZmFpbGVkOiB0aGlzLmN1c3RvbU1ldHJpY3Mud29ya2Zsb3dGYWlsZWQsXHJcbiAgICAgICAgICBzdGFydGVkOiB0aGlzLmN1c3RvbU1ldHJpY3Mud29ya2Zsb3dTdGFydGVkLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IHRocmVzaG9sZHMud29ya2Zsb3dGYWlsdXJlUmF0ZSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IGFsZXJ0Q29uZmlnLmV2YWx1YXRpb25QZXJpb2RzLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNkay5hd3NfY2xvdWR3YXRjaF9hY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyBkdXJhdGlvbiBhbGFybSAoc2hvdWxkIGNvbXBsZXRlIHdpdGhpbiBjb25maWd1cmVkIHRpbWUpXHJcbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQW5hbHlzaXNEdXJhdGlvbkFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBNSVNSQS1QbGF0Zm9ybS1BbmFseXNpc0R1cmF0aW9uLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FuYWx5c2lzIHRha2luZyB0b28gbG9uZyB0byBjb21wbGV0ZScsXHJcbiAgICAgIG1ldHJpYzogdGhpcy5jdXN0b21NZXRyaWNzLmFuYWx5c2lzRHVyYXRpb24sXHJcbiAgICAgIHRocmVzaG9sZDogdGhyZXNob2xkcy5hbmFseXNpc0R1cmF0aW9uLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogYWxlcnRDb25maWcuZXZhbHVhdGlvblBlcmlvZHMsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2RrLmF3c19jbG91ZHdhdGNoX2FjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xyXG5cclxuICAgIC8vIEFQSSBHYXRld2F5IDVYWCBlcnJvcnMgYWxhcm1cclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdBcGlHYXRld2F5NVhYQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYE1JU1JBLVBsYXRmb3JtLUFwaUdhdGV3YXk1WFgtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnSGlnaCBudW1iZXIgb2YgNVhYIGVycm9ycyBpbiBBUEkgR2F0ZXdheScsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBV1MvQXBpR2F0ZXdheScsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJzVYWEVycm9yJyxcclxuICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICBBcGlOYW1lOiBhcGkucmVzdEFwaU5hbWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyA1IDogMTAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiBhbGVydENvbmZpZy5ldmFsdWF0aW9uUGVyaW9kcyxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pLmFkZEFsYXJtQWN0aW9uKG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2hfYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XHJcblxyXG4gICAgLy8gQVBJIEdhdGV3YXkgbGF0ZW5jeSBhbGFybSAoTkVXKVxyXG4gICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FwaUdhdGV3YXlIaWdoTGF0ZW5jeUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBNSVNSQS1QbGF0Zm9ybS1BcGlHYXRld2F5TGF0ZW5jeS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBleHBlcmllbmNpbmcgaGlnaCBsYXRlbmN5JyxcclxuICAgICAgbWV0cmljOiBhcGkubWV0cmljTGF0ZW5jeSh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogdGhyZXNob2xkcy5hcGlMYXRlbmN5LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogYWxlcnRDb25maWcuZXZhbHVhdGlvblBlcmlvZHMsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2RrLmF3c19jbG91ZHdhdGNoX2FjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xyXG5cclxuICAgIC8vIER5bmFtb0RCIHRocm90dGxpbmcgYWxhcm0gKE5FVylcclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdEeW5hbW9EQlRocm90dGxpbmdBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtUGxhdGZvcm0tRHluYW1vREJUaHJvdHRsaW5nLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0R5bmFtb0RCIG9wZXJhdGlvbnMgYmVpbmcgdGhyb3R0bGVkJyxcclxuICAgICAgbWV0cmljOiB0aGlzLmN1c3RvbU1ldHJpY3MuZHluYW1vZGJUaHJvdHRsZXMsXHJcbiAgICAgIHRocmVzaG9sZDogMSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2RrLmF3c19jbG91ZHdhdGNoX2FjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xyXG5cclxuICAgIC8vIEZpbGUgcHJvY2Vzc2luZyBlcnJvcnMgYWxhcm0gKE5FVylcclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdGaWxlUHJvY2Vzc2luZ0Vycm9yc0FsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBNSVNSQS1QbGF0Zm9ybS1GaWxlUHJvY2Vzc2luZ0Vycm9ycy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdIaWdoIG51bWJlciBvZiBmaWxlIHByb2Nlc3NpbmcgZXJyb3JzJyxcclxuICAgICAgbWV0cmljOiB0aGlzLmN1c3RvbU1ldHJpY3MuZmlsZVByb2Nlc3NpbmdFcnJvcnMsXHJcbiAgICAgIHRocmVzaG9sZDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDUgOiAxMCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IGFsZXJ0Q29uZmlnLmV2YWx1YXRpb25QZXJpb2RzLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNkay5hd3NfY2xvdWR3YXRjaF9hY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcclxuXHJcbiAgICAvLyBMYW1iZGEgZnVuY3Rpb24gZXJyb3IgYWxhcm1zXHJcbiAgICBPYmplY3QuZW50cmllcyhsYW1iZGFGdW5jdGlvbnMpLmZvckVhY2goKFtuYW1lLCBmdW5jXSkgPT4ge1xyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgJHtuYW1lfUVycm9yQWxhcm1gLCB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtUGxhdGZvcm0tJHtuYW1lfS1FcnJvcnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBIaWdoIGVycm9yIHJhdGUgaW4gJHtuYW1lfSBMYW1iZGEgZnVuY3Rpb25gLFxyXG4gICAgICAgIG1ldHJpYzogZnVuYy5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdGhyZXNob2xkOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMyA6IDUsXHJcbiAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IGFsZXJ0Q29uZmlnLmV2YWx1YXRpb25QZXJpb2RzLFxyXG4gICAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNkay5hd3NfY2xvdWR3YXRjaF9hY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcclxuXHJcbiAgICAgIC8vIExhbWJkYSBkdXJhdGlvbiBhbGFybSAoZnVuY3Rpb25zIHNob3VsZCBjb21wbGV0ZSBxdWlja2x5KVxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgJHtuYW1lfUR1cmF0aW9uQWxhcm1gLCB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtUGxhdGZvcm0tJHtuYW1lfS1EdXJhdGlvbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogYCR7bmFtZX0gTGFtYmRhIGZ1bmN0aW9uIHRha2luZyB0b28gbG9uZ2AsXHJcbiAgICAgICAgbWV0cmljOiBmdW5jLm1ldHJpY0R1cmF0aW9uKHtcclxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICB9KSxcclxuICAgICAgICB0aHJlc2hvbGQ6IG5hbWUuaW5jbHVkZXMoJ2FuYWx5emUnKSA/IHRocmVzaG9sZHMuYW5hbHlzaXNEdXJhdGlvbiA6IHRocmVzaG9sZHMubGFtYmRhRHVyYXRpb24sXHJcbiAgICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IGFsZXJ0Q29uZmlnLmV2YWx1YXRpb25QZXJpb2RzICsgMSwgLy8gR2l2ZSBmdW5jdGlvbnMgYSBiaXQgbW9yZSB0aW1lXHJcbiAgICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2RrLmF3c19jbG91ZHdhdGNoX2FjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xyXG5cclxuICAgICAgLy8gTGFtYmRhIHRocm90dGxpbmcgYWxhcm0gKE5FVylcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYCR7bmFtZX1UaHJvdHRsaW5nQWxhcm1gLCB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtUGxhdGZvcm0tJHtuYW1lfS1UaHJvdHRsaW5nLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgICBhbGFybURlc2NyaXB0aW9uOiBgJHtuYW1lfSBMYW1iZGEgZnVuY3Rpb24gYmVpbmcgdGhyb3R0bGVkYCxcclxuICAgICAgICBtZXRyaWM6IGZ1bmMubWV0cmljVGhyb3R0bGVzKHtcclxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHRocmVzaG9sZDogMSxcclxuICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICAgIH0pLmFkZEFsYXJtQWN0aW9uKG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2hfYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoZW50aWNhdGlvbiBmYWlsdXJlIGFsYXJtXHJcbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQXV0aEZhaWx1cmVBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgTUlTUkEtUGxhdGZvcm0tQXV0aEZhaWx1cmVzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0hpZ2ggbnVtYmVyIG9mIGF1dGhlbnRpY2F0aW9uIGZhaWx1cmVzJyxcclxuICAgICAgbWV0cmljOiB0aGlzLmN1c3RvbU1ldHJpY3MuYXV0aGVudGljYXRpb25GYWlsdXJlLFxyXG4gICAgICB0aHJlc2hvbGQ6IHRocmVzaG9sZHMuYXV0aEZhaWx1cmVzLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogYWxlcnRDb25maWcuZXZhbHVhdGlvblBlcmlvZHMsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KS5hZGRBbGFybUFjdGlvbihuZXcgY2RrLmF3c19jbG91ZHdhdGNoX2FjdGlvbnMuU25zQWN0aW9uKHRoaXMuYWxhcm1Ub3BpYykpO1xyXG5cclxuICAgIC8vIENvbXBsaWFuY2Ugc2NvcmUgZGVncmFkYXRpb24gYWxhcm0gKE5FVylcclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdDb21wbGlhbmNlU2NvcmVEZWdyYWRhdGlvbkFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBNSVNSQS1QbGF0Zm9ybS1Db21wbGlhbmNlU2NvcmVEZWdyYWRhdGlvbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBdmVyYWdlIGNvbXBsaWFuY2Ugc2NvcmUgaXMgZGVncmFkaW5nJyxcclxuICAgICAgbWV0cmljOiB0aGlzLmN1c3RvbU1ldHJpY3MuY29tcGxpYW5jZVNjb3JlLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUwLCAvLyBBbGVydCBpZiBhdmVyYWdlIGNvbXBsaWFuY2UgZHJvcHMgYmVsb3cgNTAlXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAzLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkxFU1NfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNkay5hd3NfY2xvdWR3YXRjaF9hY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcclxuXHJcbiAgICAvLyBIZWFsdGggY2hlY2sgZmFpbHVyZSBhbGFybSAoTkVXKVxyXG4gICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0hlYWx0aENoZWNrRmFpbHVyZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBNSVNSQS1QbGF0Zm9ybS1IZWFsdGhDaGVja0ZhaWx1cmUtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnSGVhbHRoIGNoZWNrIGVuZHBvaW50IHJlcG9ydGluZyB1bmhlYWx0aHkgc3RhdHVzJyxcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnSGVhbHRoQ2hlY2tGYWlsZWQnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcygxKSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogMSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX09SX0VRVUFMX1RPX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLkJSRUFDSElORywgLy8gVHJlYXQgbWlzc2luZyBkYXRhIGFzIHVuaGVhbHRoeVxyXG4gICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNkay5hd3NfY2xvdWR3YXRjaF9hY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcclxuXHJcbiAgICAvLyBTZXJ2aWNlIGRlZ3JhZGF0aW9uIGFsYXJtIChORVcpXHJcbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU2VydmljZURlZ3JhZGF0aW9uQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYE1JU1JBLVBsYXRmb3JtLVNlcnZpY2VEZWdyYWRhdGlvbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdPbmUgb3IgbW9yZSBzZXJ2aWNlcyByZXBvcnRpbmcgZGVncmFkZWQgc3RhdHVzJyxcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnU2VydmljZURlZ3JhZGVkJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9PUl9FUVVBTF9UT19USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSkuYWRkQWxhcm1BY3Rpb24obmV3IGNkay5hd3NfY2xvdWR3YXRjaF9hY3Rpb25zLlNuc0FjdGlvbih0aGlzLmFsYXJtVG9waWMpKTtcclxuXHJcbiAgICAvLyBIZWFsdGggY2hlY2sgcmVzcG9uc2UgdGltZSBhbGFybSAoTkVXKVxyXG4gICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0hlYWx0aENoZWNrU2xvd1Jlc3BvbnNlQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYE1JU1JBLVBsYXRmb3JtLUhlYWx0aENoZWNrU2xvd1Jlc3BvbnNlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0hlYWx0aCBjaGVjayBlbmRwb2ludCByZXNwb25kaW5nIHNsb3dseScsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0hlYWx0aENoZWNrRHVyYXRpb24nLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUwMDAsIC8vIDUgc2Vjb25kc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMyxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pLmFkZEFsYXJtQWN0aW9uKG5ldyBjZGsuYXdzX2Nsb3Vkd2F0Y2hfYWN0aW9ucy5TbnNBY3Rpb24odGhpcy5hbGFybVRvcGljKSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUxvZ0luc2lnaHRzUXVlcmllcyhlbnZpcm9ubWVudDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBJbnNpZ2h0cyBxdWVyaWVzIGZvciBjb21tb24gZGVidWdnaW5nIHNjZW5hcmlvc1xyXG4gICAgY29uc3QgcXVlcmllcyA9IE9iamVjdC5lbnRyaWVzKExPR19JTlNJR0hUU19RVUVSSUVTKS5tYXAoKFtrZXksIGNvbmZpZ10pID0+ICh7XHJcbiAgICAgIG5hbWU6IGNvbmZpZy5uYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogY29uZmlnLmRlc2NyaXB0aW9uLFxyXG4gICAgICBxdWVyeTogY29uZmlnLnF1ZXJ5LnRyaW0oKSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBOb3RlOiBDbG91ZFdhdGNoIEluc2lnaHRzIHF1ZXJpZXMgYXJlIGNyZWF0ZWQgdGhyb3VnaCB0aGUgY29uc29sZSBvciBDTElcclxuICAgIC8vIFRoaXMgaXMgZm9yIGRvY3VtZW50YXRpb24gcHVycG9zZXMgLSB0aGUgcXVlcmllcyBhYm92ZSBjYW4gYmUgc2F2ZWQgaW4gdGhlIGNvbnNvbGVcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2dJbnNpZ2h0c1F1ZXJpZXMnLCB7XHJcbiAgICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShxdWVyaWVzLCBudWxsLCAyKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIEluc2lnaHRzIHF1ZXJpZXMgZm9yIGRlYnVnZ2luZyAoc2F2ZSB0aGVzZSBpbiB0aGUgQ2xvdWRXYXRjaCBjb25zb2xlKScsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBzdHJ1Y3R1cmVkIGxvZ2dpbmcgY29uZmlndXJhdGlvbiBmb3IgTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRTdHJ1Y3R1cmVkTG9nZ2luZ0NvbmZpZygpOiB7IFtrZXk6IHN0cmluZ106IHN0cmluZyB9IHtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIExPR19MRVZFTDogJ0lORk8nLFxyXG4gICAgICBFTkFCTEVfU1RSVUNUVVJFRF9MT0dHSU5HOiAndHJ1ZScsXHJcbiAgICAgIENPUlJFTEFUSU9OX0lEX0hFQURFUjogJ1gtQ29ycmVsYXRpb24tSUQnLFxyXG4gICAgICBMT0dfRk9STUFUOiAnSlNPTicsXHJcbiAgICAgIEVOQUJMRV9QRVJGT1JNQU5DRV9MT0dHSU5HOiAndHJ1ZScsXHJcbiAgICAgIEVOQUJMRV9TRUNVUklUWV9MT0dHSU5HOiAndHJ1ZScsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IENsb3VkV2F0Y2ggbWV0cmljcyBjb25maWd1cmF0aW9uIGZvciBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICovXHJcbiAgcHVibGljIGdldE1ldHJpY3NDb25maWcoKTogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBDTE9VRFdBVENIX05BTUVTUEFDRTogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgRU5BQkxFX0NVU1RPTV9NRVRSSUNTOiAndHJ1ZScsXHJcbiAgICAgIE1FVFJJQ1NfQlVGRkVSX1NJWkU6ICcxMCcsXHJcbiAgICAgIE1FVFJJQ1NfRkxVU0hfSU5URVJWQUw6ICczMDAwMCcsIC8vIDMwIHNlY29uZHNcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgWC1SYXkgdHJhY2luZyBjb25maWd1cmF0aW9uIGZvciBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICovXHJcbiAgcHVibGljIGdldFhSYXlDb25maWcoKTogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBBV1NfWFJBWV9DT05URVhUX01JU1NJTkc6ICdMT0dfRVJST1InLFxyXG4gICAgICBBV1NfWFJBWV9UUkFDSU5HX05BTUU6ICdNSVNSQS1QbGF0Zm9ybScsXHJcbiAgICAgIEFXU19YUkFZX0RFQlVHX01PREU6ICdmYWxzZScsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQWRkIFgtUmF5IHRyYWNpbmcgcGVybWlzc2lvbnMgdG8gTGFtYmRhIGV4ZWN1dGlvbiByb2xlXHJcbiAgICovXHJcbiAgcHVibGljIGFkZFhSYXlQZXJtaXNzaW9ucyhyb2xlOiBpYW0uSVJvbGUpOiB2b2lkIHtcclxuICAgIHJvbGUuYWRkTWFuYWdlZFBvbGljeShcclxuICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdBV1NYUmF5RGFlbW9uV3JpdGVBY2Nlc3MnKVxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuIl19