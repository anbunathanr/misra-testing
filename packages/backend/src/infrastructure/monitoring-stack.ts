import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Duration } from 'aws-cdk-lib';

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
export class MonitoringStack extends Construct {
  public readonly alertTopic: sns.Topic;
  public readonly dashboard: cloudwatch.Dashboard;
  public readonly logGroup: logs.LogGroup;

  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id);

    // Create SNS topic for alerts
    this.alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: `misra-platform-alerts-${props.environment}`,
      displayName: `MISRA Platform ${props.environment} Alerts`,
    });

    // Add email subscription if provided
    if (props.alertEmail) {
      this.alertTopic.addSubscription(
        new snsSubscriptions.EmailSubscription(props.alertEmail)
      );
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

  private createDashboard(props: MonitoringStackProps): cloudwatch.Dashboard {
    const dashboard = new cloudwatch.Dashboard(this, 'MISRAPlatformDashboard', {
      dashboardName: `MISRA-Platform-${props.environment}`,
    });

    // API Gateway Metrics Section
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# MISRA Platform ${props.environment} - System Overview\n\n## API Gateway Metrics`,
        width: 24,
        height: 2,
      })
    );

    // API Gateway Request Count and Latency
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Request Count',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: {
              ApiName: props.apiGateway.restApiName,
            },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Latency',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: {
              ApiName: props.apiGateway.restApiName,
            },
            statistic: 'Average',
            period: Duration.minutes(5),
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
            period: Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    // API Gateway Error Rates
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Gateway - Error Rates',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '4XXError',
            dimensionsMap: {
              ApiName: props.apiGateway.restApiName,
            },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5XXError',
            dimensionsMap: {
              ApiName: props.apiGateway.restApiName,
            },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        ],
        width: 24,
        height: 6,
      })
    );

    // Lambda Functions Section
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '## Lambda Functions Metrics',
        width: 24,
        height: 1,
      })
    );

    // Lambda Duration and Invocations
    const lambdaMetrics = Object.entries(props.lambdaFunctions).map(([name, func]) => ({
      name,
      duration: func.metricDuration({ period: Duration.minutes(5) }),
      invocations: func.metricInvocations({ period: Duration.minutes(5) }),
      errors: func.metricErrors({ period: Duration.minutes(5) }),
      throttles: func.metricThrottles({ period: Duration.minutes(5) }),
    }));

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Functions - Duration',
        left: lambdaMetrics.map(m => m.duration),
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Functions - Invocations',
        left: lambdaMetrics.map(m => m.invocations),
        width: 12,
        height: 6,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Functions - Errors & Throttles',
        left: lambdaMetrics.map(m => m.errors),
        right: lambdaMetrics.map(m => m.throttles),
        width: 24,
        height: 6,
      })
    );

    // DynamoDB Section
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '## DynamoDB Metrics',
        width: 24,
        height: 1,
      })
    );

    // DynamoDB Read/Write Capacity and Throttles
    const dynamoMetrics = Object.entries(props.dynamoTables).map(([name, table]) => ({
      name,
      readCapacity: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ConsumedReadCapacityUnits',
        dimensionsMap: { TableName: table.tableName },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      writeCapacity: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ConsumedWriteCapacityUnits',
        dimensionsMap: { TableName: table.tableName },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      readThrottles: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ReadThrottledEvents',
        dimensionsMap: { TableName: table.tableName },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
      writeThrottles: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'WriteThrottledEvents',
        dimensionsMap: { TableName: table.tableName },
        statistic: 'Sum',
        period: Duration.minutes(5),
      }),
    }));

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Read Capacity',
        left: dynamoMetrics.map(m => m.readCapacity),
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Write Capacity',
        left: dynamoMetrics.map(m => m.writeCapacity),
        width: 12,
        height: 6,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'DynamoDB - Throttles',
        left: dynamoMetrics.map(m => m.readThrottles),
        right: dynamoMetrics.map(m => m.writeThrottles),
        width: 24,
        height: 6,
      })
    );

    // S3 Section
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '## S3 Storage Metrics',
        width: 24,
        height: 1,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'S3 - Requests',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'AllRequests',
            dimensionsMap: {
              BucketName: props.s3Bucket.bucketName,
            },
            statistic: 'Sum',
            period: Duration.minutes(5),
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
            period: Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: '5xxErrors',
            dimensionsMap: {
              BucketName: props.s3Bucket.bucketName,
            },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        ],
        width: 24,
        height: 6,
      })
    );

    // Business Metrics Section
    dashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: '## Business & Performance KPIs',
        width: 24,
        height: 1,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Analysis Completion Rate',
        left: [
          new cloudwatch.Metric({
            namespace: 'MISRA/Platform',
            metricName: 'AnalysisCompleted',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'MISRA/Platform',
            metricName: 'AnalysisFailed',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'User Journey Metrics',
        left: [
          new cloudwatch.Metric({
            namespace: 'MISRA/Platform',
            metricName: 'UserRegistrations',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'MISRA/Platform',
            metricName: 'FileUploads',
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
      })
    );

    return dashboard;
  }

  private createAlarms(props: MonitoringStackProps): void {
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
            period: Duration.minutes(5),
          }),
          m2: new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: '5XXError',
            dimensionsMap: { ApiName: props.apiGateway.restApiName },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          m3: new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Count',
            dimensionsMap: { ApiName: props.apiGateway.restApiName },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        },
      }),
      threshold: 5,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));

    // API Gateway High Latency Alarm
    new cloudwatch.Alarm(this, 'APIGatewayHighLatency', {
      alarmName: `MISRA-${props.environment}-API-HighLatency`,
      alarmDescription: 'API Gateway latency is above 2 seconds',
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: { ApiName: props.apiGateway.restApiName },
        statistic: 'Average',
        period: Duration.minutes(5),
      }),
      threshold: 2000, // 2 seconds in milliseconds
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));

    // Lambda Function Error Rate Alarms
    Object.entries(props.lambdaFunctions).forEach(([name, func]) => {
      new cloudwatch.Alarm(this, `Lambda${name}ErrorRate`, {
        alarmName: `MISRA-${props.environment}-Lambda-${name}-ErrorRate`,
        alarmDescription: `Lambda function ${name} error rate is above 5%`,
        metric: new cloudwatch.MathExpression({
          expression: 'm1 / m2 * 100',
          usingMetrics: {
            m1: func.metricErrors({ period: Duration.minutes(5) }),
            m2: func.metricInvocations({ period: Duration.minutes(5) }),
          },
        }),
        threshold: 5,
        evaluationPeriods: 2,
        datapointsToAlarm: 2,
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));

      // Lambda Duration Alarm for critical functions
      if (name.includes('analyze-file')) {
        new cloudwatch.Alarm(this, `Lambda${name}Duration`, {
          alarmName: `MISRA-${props.environment}-Lambda-${name}-Duration`,
          alarmDescription: `Lambda function ${name} duration is above 4 minutes`,
          metric: func.metricDuration({ period: Duration.minutes(5) }),
          threshold: 240000, // 4 minutes in milliseconds
          evaluationPeriods: 2,
          datapointsToAlarm: 1,
        }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
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
          period: Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
      }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));

      new cloudwatch.Alarm(this, `DynamoDB${name}WriteThrottles`, {
        alarmName: `MISRA-${props.environment}-DynamoDB-${name}-WriteThrottles`,
        alarmDescription: `DynamoDB table ${name} is experiencing write throttles`,
        metric: new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'WriteThrottledEvents',
          dimensionsMap: { TableName: table.tableName },
          statistic: 'Sum',
          period: Duration.minutes(5),
        }),
        threshold: 1,
        evaluationPeriods: 1,
        datapointsToAlarm: 1,
      }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
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
            period: Duration.minutes(5),
          }),
          m2: new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: '5xxErrors',
            dimensionsMap: { BucketName: props.s3Bucket.bucketName },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
          m3: new cloudwatch.Metric({
            namespace: 'AWS/S3',
            metricName: 'AllRequests',
            dimensionsMap: { BucketName: props.s3Bucket.bucketName },
            statistic: 'Sum',
            period: Duration.minutes(5),
          }),
        },
      }),
      threshold: 10,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));

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
            period: Duration.minutes(15),
          }),
          m2: new cloudwatch.Metric({
            namespace: 'MISRA/Platform',
            metricName: 'AnalysisCompleted',
            statistic: 'Sum',
            period: Duration.minutes(15),
          }),
        },
      }),
      threshold: 10,
      evaluationPeriods: 2,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    }).addAlarmAction(new cloudwatch.SnsAction(this.alertTopic));
  }

  private createCustomMetrics(props: MonitoringStackProps): void {
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

  private createLogMetricFilters(props: MonitoringStackProps): void {
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