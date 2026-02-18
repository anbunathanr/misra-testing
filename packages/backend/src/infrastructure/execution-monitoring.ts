/**
 * Test Execution Monitoring Infrastructure
 * CloudWatch log groups, alarms, and dashboards for test execution
 */

import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface ExecutionMonitoringProps {
  testExecutorFunction: lambda.Function;
  triggerExecutionFunction: lambda.Function;
  getExecutionStatusFunction: lambda.Function;
  getExecutionResultsFunction: lambda.Function;
  getExecutionHistoryFunction: lambda.Function;
  getSuiteResultsFunction: lambda.Function;
  testExecutionQueue: sqs.Queue;
  testExecutionDLQ: sqs.Queue;
  environment: string;
}

export class ExecutionMonitoring extends Construct {
  public readonly logGroups: Map<string, logs.LogGroup>;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: ExecutionMonitoringProps) {
    super(scope, id);

    this.logGroups = new Map();

    // Create SNS topic for alarms
    this.alarmTopic = new sns.Topic(this, 'ExecutionAlarmTopic', {
      topicName: `${props.environment}-test-execution-alarms`,
      displayName: 'Test Execution Alarms',
    });

    // Create CloudWatch log groups for all Lambda functions
    this.createLogGroup('TestExecutor', props.testExecutorFunction);
    this.createLogGroup('TriggerExecution', props.triggerExecutionFunction);
    this.createLogGroup('GetExecutionStatus', props.getExecutionStatusFunction);
    this.createLogGroup('GetExecutionResults', props.getExecutionResultsFunction);
    this.createLogGroup('GetExecutionHistory', props.getExecutionHistoryFunction);
    this.createLogGroup('GetSuiteResults', props.getSuiteResultsFunction);

    // Create CloudWatch alarms
    this.createLambdaAlarms(props);
    this.createQueueAlarms(props);

    // Create CloudWatch dashboard
    this.createDashboard(props);
  }

  /**
   * Create a CloudWatch log group for a Lambda function
   */
  private createLogGroup(name: string, lambdaFunction: lambda.Function): void {
    const logGroup = new logs.LogGroup(this, `${name}LogGroup`, {
      logGroupName: `/aws/lambda/${lambdaFunction.functionName}`,
      retention: logs.RetentionDays.ONE_MONTH, // 30 days retention
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    this.logGroups.set(name, logGroup);

    // Create metric filters for error tracking
    logGroup.addMetricFilter(`${name}ErrorFilter`, {
      filterPattern: logs.FilterPattern.anyTerm('ERROR', 'Error', 'error', 'Exception', 'exception'),
      metricName: `${name}Errors`,
      metricNamespace: 'TestExecution',
      metricValue: '1',
      defaultValue: 0,
    });

    // Create metric filter for timeout tracking
    logGroup.addMetricFilter(`${name}TimeoutFilter`, {
      filterPattern: logs.FilterPattern.anyTerm('timeout', 'timed out', 'time remaining'),
      metricName: `${name}Timeouts`,
      metricNamespace: 'TestExecution',
      metricValue: '1',
      defaultValue: 0,
    });
  }

  /**
   * Create CloudWatch alarms for Lambda functions
   */
  private createLambdaAlarms(props: ExecutionMonitoringProps): void {
    // Test Executor Lambda alarms
    this.createLambdaErrorAlarm(
      'TestExecutorErrors',
      props.testExecutorFunction,
      'Test Executor Lambda has high error rate'
    );

    this.createLambdaThrottleAlarm(
      'TestExecutorThrottles',
      props.testExecutorFunction,
      'Test Executor Lambda is being throttled'
    );

    this.createLambdaDurationAlarm(
      'TestExecutorDuration',
      props.testExecutorFunction,
      'Test Executor Lambda approaching timeout',
      840000 // 14 minutes (Lambda timeout is 15 minutes)
    );

    // Trigger Lambda alarms
    this.createLambdaErrorAlarm(
      'TriggerExecutionErrors',
      props.triggerExecutionFunction,
      'Trigger Execution Lambda has high error rate'
    );

    // Status Lambda alarms
    this.createLambdaErrorAlarm(
      'GetStatusErrors',
      props.getExecutionStatusFunction,
      'Get Status Lambda has high error rate'
    );

    // Results Lambda alarms
    this.createLambdaErrorAlarm(
      'GetResultsErrors',
      props.getExecutionResultsFunction,
      'Get Results Lambda has high error rate'
    );
  }

  /**
   * Create error alarm for a Lambda function
   */
  private createLambdaErrorAlarm(
    id: string,
    lambdaFunction: lambda.Function,
    description: string
  ): cloudwatch.Alarm {
    const metric = lambdaFunction.metricErrors({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    return new cloudwatch.Alarm(this, id, {
      alarmName: `${lambdaFunction.functionName}-errors`,
      alarmDescription: description,
      metric,
      threshold: 5, // Alert if 5 or more errors in 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }

  /**
   * Create throttle alarm for a Lambda function
   */
  private createLambdaThrottleAlarm(
    id: string,
    lambdaFunction: lambda.Function,
    description: string
  ): cloudwatch.Alarm {
    const metric = lambdaFunction.metricThrottles({
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });

    return new cloudwatch.Alarm(this, id, {
      alarmName: `${lambdaFunction.functionName}-throttles`,
      alarmDescription: description,
      metric,
      threshold: 1, // Alert on any throttle
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }

  /**
   * Create duration alarm for a Lambda function
   */
  private createLambdaDurationAlarm(
    id: string,
    lambdaFunction: lambda.Function,
    description: string,
    thresholdMs: number
  ): cloudwatch.Alarm {
    const metric = lambdaFunction.metricDuration({
      period: cdk.Duration.minutes(5),
      statistic: 'Average',
    });

    return new cloudwatch.Alarm(this, id, {
      alarmName: `${lambdaFunction.functionName}-duration`,
      alarmDescription: description,
      metric,
      threshold: thresholdMs,
      evaluationPeriods: 2, // Alert if 2 consecutive periods exceed threshold
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }

  /**
   * Create CloudWatch alarms for SQS queues
   */
  private createQueueAlarms(props: ExecutionMonitoringProps): void {
    // DLQ depth alarm - alert if any messages in DLQ
    const dlqDepthMetric = props.testExecutionDLQ.metricApproximateNumberOfMessagesVisible({
      period: cdk.Duration.minutes(5),
      statistic: 'Maximum',
    });

    new cloudwatch.Alarm(this, 'DLQDepthAlarm', {
      alarmName: `${props.environment}-test-execution-dlq-depth`,
      alarmDescription: 'Test execution DLQ has messages (failed executions)',
      metric: dlqDepthMetric,
      threshold: 1, // Alert on any message in DLQ
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Main queue depth alarm - alert if queue is backing up
    const queueDepthMetric = props.testExecutionQueue.metricApproximateNumberOfMessagesVisible({
      period: cdk.Duration.minutes(5),
      statistic: 'Maximum',
    });

    new cloudwatch.Alarm(this, 'QueueDepthAlarm', {
      alarmName: `${props.environment}-test-execution-queue-depth`,
      alarmDescription: 'Test execution queue depth is high',
      metric: queueDepthMetric,
      threshold: 100, // Alert if more than 100 messages waiting
      evaluationPeriods: 2, // Alert if high for 10 minutes
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Queue age alarm - alert if messages are old (not being processed)
    const queueAgeMetric = props.testExecutionQueue.metricApproximateAgeOfOldestMessage({
      period: cdk.Duration.minutes(5),
      statistic: 'Maximum',
    });

    new cloudwatch.Alarm(this, 'QueueAgeAlarm', {
      alarmName: `${props.environment}-test-execution-queue-age`,
      alarmDescription: 'Test execution queue has old messages',
      metric: queueAgeMetric,
      threshold: 1800, // Alert if messages are older than 30 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
  }

  /**
   * Create CloudWatch dashboard for test execution monitoring
   */
  private createDashboard(props: ExecutionMonitoringProps): void {
    const dashboard = new cloudwatch.Dashboard(this, 'ExecutionDashboard', {
      dashboardName: `${props.environment}-test-execution`,
    });

    // Lambda metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Invocations',
        left: [
          props.testExecutorFunction.metricInvocations(),
          props.triggerExecutionFunction.metricInvocations(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Errors',
        left: [
          props.testExecutorFunction.metricErrors(),
          props.triggerExecutionFunction.metricErrors(),
        ],
        width: 12,
      })
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Duration',
        left: [
          props.testExecutorFunction.metricDuration({ statistic: 'Average' }),
          props.testExecutorFunction.metricDuration({ statistic: 'Maximum' }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Lambda Throttles',
        left: [
          props.testExecutorFunction.metricThrottles(),
          props.triggerExecutionFunction.metricThrottles(),
        ],
        width: 12,
      })
    );

    // Queue metrics
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Queue Depth',
        left: [
          props.testExecutionQueue.metricApproximateNumberOfMessagesVisible(),
          props.testExecutionDLQ.metricApproximateNumberOfMessagesVisible(),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Queue Age',
        left: [
          props.testExecutionQueue.metricApproximateAgeOfOldestMessage(),
        ],
        width: 12,
      })
    );

    // Custom metrics from log filters
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Error Count by Function',
        left: [
          new cloudwatch.Metric({
            namespace: 'TestExecution',
            metricName: 'TestExecutorErrors',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.Metric({
            namespace: 'TestExecution',
            metricName: 'TriggerExecutionErrors',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Timeout Count',
        left: [
          new cloudwatch.Metric({
            namespace: 'TestExecution',
            metricName: 'TestExecutorTimeouts',
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
      })
    );
  }
}
