/**
 * Test Execution Monitoring Infrastructure
 * CloudWatch log groups, alarms, and dashboards for test execution
 */
import * as logs from 'aws-cdk-lib/aws-logs';
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
export declare class ExecutionMonitoring extends Construct {
    readonly logGroups: Map<string, logs.LogGroup>;
    readonly alarmTopic: sns.Topic;
    constructor(scope: Construct, id: string, props: ExecutionMonitoringProps);
    /**
     * Create a CloudWatch log group for a Lambda function
     */
    private createLogGroup;
    /**
     * Create CloudWatch alarms for Lambda functions
     */
    private createLambdaAlarms;
    /**
     * Create error alarm for a Lambda function
     */
    private createLambdaErrorAlarm;
    /**
     * Create throttle alarm for a Lambda function
     */
    private createLambdaThrottleAlarm;
    /**
     * Create duration alarm for a Lambda function
     */
    private createLambdaDurationAlarm;
    /**
     * Create CloudWatch alarms for SQS queues
     */
    private createQueueAlarms;
    /**
     * Create CloudWatch dashboard for test execution monitoring
     */
    private createDashboard;
}
