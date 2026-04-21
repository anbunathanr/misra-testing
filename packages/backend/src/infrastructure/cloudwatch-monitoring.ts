import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { getMonitoringConfig, getThresholds, getAlertConfig, LOG_INSIGHTS_QUERIES } from '../config/monitoring-config';

export interface CloudWatchMonitoringProps {
  environment: 'dev' | 'staging' | 'production';
  api: apigateway.RestApi;
  lambdaFunctions: { [key: string]: lambda.Function };
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
export class CloudWatchMonitoring extends Construct {
  public readonly logGroups: { [key: string]: logs.LogGroup };
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly alarmTopic: sns.Topic;
  public readonly customMetrics: { [key: string]: cloudwatch.Metric };

  constructor(scope: Construct, id: string, props: CloudWatchMonitoringProps) {
    super(scope, id);

    const { environment, api, lambdaFunctions, alertEmail } = props;
    const config = getMonitoringConfig(environment);
    const thresholds = getThresholds(environment);
    const alertConfig = getAlertConfig(environment);

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

  private createAlarmTopic(environment: string, alertEmail?: string): sns.Topic {
    const topic = new sns.Topic(this, 'AlarmTopic', {
      topicName: `misra-platform-alarms-${environment}`,
      displayName: `MISRA Platform Alarms - ${environment}`,
    });

    if (alertEmail) {
      topic.addSubscription(new subscriptions.EmailSubscription(alertEmail));
    }

    return topic;
  }

  private createLogGroups(
    environment: string,
    lambdaFunctions: { [key: string]: lambda.Function },
    config: any
  ): { [key: string]: logs.LogGroup } {
    const logGroups: { [key: string]: logs.LogGroup } = {};

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

  private createCustomMetrics(): { [key: string]: cloudwatch.Metric } {
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

  private createMonitoringDashboard(
    environment: string,
    api: apigateway.RestApi,
    lambdaFunctions: { [key: string]: lambda.Function }
  ): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, 'MonitoringDashboard', {
      dashboardName: `MISRA-Platform-${environment}`,
    });

    // Workflow Overview Row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Workflow Metrics',
        left: [
          this.customMetrics.workflowStarted,
          this.customMetrics.workflowCompleted,
          this.customMetrics.workflowFailed,
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.SingleValueWidget({
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
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Average Workflow Duration',
        metrics: [this.customMetrics.workflowDuration],
        width: 6,
        height: 6,
      })
    );

    // Analysis Performance Row (Enhanced with business metrics)
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Analysis Performance',
        left: [
          this.customMetrics.analysisStarted,
          this.customMetrics.analysisCompleted,
          this.customMetrics.analysisFailed,
        ],
        right: [this.customMetrics.analysisDuration],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Compliance Scores & Violations',
        left: [this.customMetrics.complianceScore],
        right: [this.customMetrics.violationsDetected],
        width: 12,
        height: 6,
      })
    );

    // MISRA Business Logic Metrics Row (NEW)
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'MISRA Rules Processing',
        left: [this.customMetrics.rulesProcessed],
        right: [this.customMetrics.cacheHitRate],
        width: 12,
        height: 6,
      }),
      new cloudwatch.SingleValueWidget({
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
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Average Compliance Score',
        metrics: [this.customMetrics.complianceScore],
        width: 6,
        height: 6,
      })
    );

    // Authentication Metrics Row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Authentication Metrics',
        left: [
          this.customMetrics.authenticationAttempts,
          this.customMetrics.authenticationSuccess,
          this.customMetrics.authenticationFailure,
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'OTP Verification',
        left: [
          this.customMetrics.otpVerificationSuccess,
          this.customMetrics.otpVerificationFailure,
        ],
        width: 12,
        height: 6,
      })
    );

    // API Gateway Metrics Row
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
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
      }),
      new cloudwatch.GraphWidget({
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
      })
    );

    // Lambda Functions Row
    const lambdaWidgets: cloudwatch.IWidget[] = [];
    Object.entries(lambdaFunctions).forEach(([name, func]) => {
      lambdaWidgets.push(
        new cloudwatch.GraphWidget({
          title: `${name} Lambda Metrics`,
          left: [
            func.metricInvocations(),
            func.metricErrors(),
            func.metricThrottles(),
          ],
          right: [func.metricDuration()],
          width: 8,
          height: 6,
        })
      );
    });
    dashboard.addWidgets(...lambdaWidgets);

    // DynamoDB Performance Row (NEW)
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB Operations',
        left: [
          this.customMetrics.dynamodbReadLatency,
          this.customMetrics.dynamodbWriteLatency,
        ],
        right: [this.customMetrics.dynamodbThrottles],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
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
      })
    );

    // System Health Row (Enhanced)
    dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'System Health Score',
        metrics: [this.customMetrics.systemHealth],
        width: 4,
        height: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Error Rate',
        metrics: [this.customMetrics.errorRate],
        width: 4,
        height: 6,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Cold Starts',
        metrics: [this.customMetrics.coldStarts],
        width: 4,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'System Performance Trends',
        left: [
          this.customMetrics.errorRate,
          this.customMetrics.coldStarts,
        ],
        right: [this.customMetrics.systemHealth],
        width: 12,
        height: 6,
      })
    );

    return dashboard;
  }

  private createAlarms(
    environment: string,
    api: apigateway.RestApi,
    lambdaFunctions: { [key: string]: lambda.Function },
    thresholds: any,
    alertConfig: any
  ): void {
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

  private createLogInsightsQueries(environment: string): void {
    // Create CloudWatch Insights queries for common debugging scenarios
    const queries = Object.entries(LOG_INSIGHTS_QUERIES).map(([key, config]) => ({
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
  public getStructuredLoggingConfig(): { [key: string]: string } {
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
  public getMetricsConfig(): { [key: string]: string } {
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
  public getXRayConfig(): { [key: string]: string } {
    return {
      AWS_XRAY_CONTEXT_MISSING: 'LOG_ERROR',
      AWS_XRAY_TRACING_NAME: 'MISRA-Platform',
      AWS_XRAY_DEBUG_MODE: 'false',
    };
  }

  /**
   * Add X-Ray tracing permissions to Lambda execution role
   */
  public addXRayPermissions(role: iam.IRole): void {
    role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess')
    );
  }
}
