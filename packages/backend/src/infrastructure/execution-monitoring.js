"use strict";
/**
 * Test Execution Monitoring Infrastructure
 * CloudWatch log groups, alarms, and dashboards for test execution
 */
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
exports.ExecutionMonitoring = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const constructs_1 = require("constructs");
class ExecutionMonitoring extends constructs_1.Construct {
    logGroups;
    alarmTopic;
    constructor(scope, id, props) {
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
    createLogGroup(name, lambdaFunction) {
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
    createLambdaAlarms(props) {
        // Test Executor Lambda alarms
        this.createLambdaErrorAlarm('TestExecutorErrors', props.testExecutorFunction, 'Test Executor Lambda has high error rate');
        this.createLambdaThrottleAlarm('TestExecutorThrottles', props.testExecutorFunction, 'Test Executor Lambda is being throttled');
        this.createLambdaDurationAlarm('TestExecutorDuration', props.testExecutorFunction, 'Test Executor Lambda approaching timeout', 840000 // 14 minutes (Lambda timeout is 15 minutes)
        );
        // Trigger Lambda alarms
        this.createLambdaErrorAlarm('TriggerExecutionErrors', props.triggerExecutionFunction, 'Trigger Execution Lambda has high error rate');
        // Status Lambda alarms
        this.createLambdaErrorAlarm('GetStatusErrors', props.getExecutionStatusFunction, 'Get Status Lambda has high error rate');
        // Results Lambda alarms
        this.createLambdaErrorAlarm('GetResultsErrors', props.getExecutionResultsFunction, 'Get Results Lambda has high error rate');
    }
    /**
     * Create error alarm for a Lambda function
     */
    createLambdaErrorAlarm(id, lambdaFunction, description) {
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
    createLambdaThrottleAlarm(id, lambdaFunction, description) {
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
    createLambdaDurationAlarm(id, lambdaFunction, description, thresholdMs) {
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
    createQueueAlarms(props) {
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
    createDashboard(props) {
        const dashboard = new cloudwatch.Dashboard(this, 'ExecutionDashboard', {
            dashboardName: `${props.environment}-test-execution`,
        });
        // Lambda metrics
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Lambda Invocations',
            left: [
                props.testExecutorFunction.metricInvocations(),
                props.triggerExecutionFunction.metricInvocations(),
            ],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Lambda Errors',
            left: [
                props.testExecutorFunction.metricErrors(),
                props.triggerExecutionFunction.metricErrors(),
            ],
            width: 12,
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Lambda Duration',
            left: [
                props.testExecutorFunction.metricDuration({ statistic: 'Average' }),
                props.testExecutorFunction.metricDuration({ statistic: 'Maximum' }),
            ],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Lambda Throttles',
            left: [
                props.testExecutorFunction.metricThrottles(),
                props.triggerExecutionFunction.metricThrottles(),
            ],
            width: 12,
        }));
        // Queue metrics
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Queue Depth',
            left: [
                props.testExecutionQueue.metricApproximateNumberOfMessagesVisible(),
                props.testExecutionDLQ.metricApproximateNumberOfMessagesVisible(),
            ],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Queue Age',
            left: [
                props.testExecutionQueue.metricApproximateAgeOfOldestMessage(),
            ],
            width: 12,
        }));
        // Custom metrics from log filters
        dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }), new cloudwatch.GraphWidget({
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
        }));
    }
}
exports.ExecutionMonitoring = ExecutionMonitoring;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0aW9uLW1vbml0b3JpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJleGVjdXRpb24tbW9uaXRvcmluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFSCxpREFBbUM7QUFDbkMsMkRBQTZDO0FBQzdDLHVFQUF5RDtBQUd6RCx5REFBMkM7QUFDM0MsMkNBQXVDO0FBY3ZDLE1BQWEsbUJBQW9CLFNBQVEsc0JBQVM7SUFDaEMsU0FBUyxDQUE2QjtJQUN0QyxVQUFVLENBQVk7SUFFdEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUUzQiw4QkFBOEI7UUFDOUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNELFNBQVMsRUFBRSxHQUFHLEtBQUssQ0FBQyxXQUFXLHdCQUF3QjtZQUN2RCxXQUFXLEVBQUUsdUJBQXVCO1NBQ3JDLENBQUMsQ0FBQztRQUVILHdEQUF3RDtRQUN4RCxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNoRSxJQUFJLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxjQUFjLENBQUMsb0JBQW9CLEVBQUUsS0FBSyxDQUFDLDBCQUEwQixDQUFDLENBQUM7UUFDNUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUM5RSxJQUFJLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLEtB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QVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLGVBQWU7b0JBQzFCLFVBQVUsRUFBRSx3QkFBd0I7b0JBQ3BDLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsRUFDRixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLGVBQWU7WUFDdEIsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLGVBQWU7b0JBQzFCLFVBQVUsRUFBRSxzQkFBc0I7b0JBQ2xDLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBOVVELGtEQThVQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBUZXN0IEV4ZWN1dGlvbiBNb25pdG9yaW5nIEluZnJhc3RydWN0dXJlXHJcbiAqIENsb3VkV2F0Y2ggbG9nIGdyb3VwcywgYWxhcm1zLCBhbmQgZGFzaGJvYXJkcyBmb3IgdGVzdCBleGVjdXRpb25cclxuICovXHJcblxyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFeGVjdXRpb25Nb25pdG9yaW5nUHJvcHMge1xyXG4gIHRlc3RFeGVjdXRvckZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBnZXRTdWl0ZVJlc3VsdHNGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHRlc3RFeGVjdXRpb25RdWV1ZTogc3FzLlF1ZXVlO1xyXG4gIHRlc3RFeGVjdXRpb25ETFE6IHNxcy5RdWV1ZTtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRXhlY3V0aW9uTW9uaXRvcmluZyBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxvZ0dyb3VwczogTWFwPHN0cmluZywgbG9ncy5Mb2dHcm91cD47XHJcbiAgcHVibGljIHJlYWRvbmx5IGFsYXJtVG9waWM6IHNucy5Ub3BpYztcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEV4ZWN1dGlvbk1vbml0b3JpbmdQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICB0aGlzLmxvZ0dyb3VwcyA9IG5ldyBNYXAoKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgU05TIHRvcGljIGZvciBhbGFybXNcclxuICAgIHRoaXMuYWxhcm1Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ0V4ZWN1dGlvbkFsYXJtVG9waWMnLCB7XHJcbiAgICAgIHRvcGljTmFtZTogYCR7cHJvcHMuZW52aXJvbm1lbnR9LXRlc3QtZXhlY3V0aW9uLWFsYXJtc2AsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiAnVGVzdCBFeGVjdXRpb24gQWxhcm1zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGxvZyBncm91cHMgZm9yIGFsbCBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICB0aGlzLmNyZWF0ZUxvZ0dyb3VwKCdUZXN0RXhlY3V0b3InLCBwcm9wcy50ZXN0RXhlY3V0b3JGdW5jdGlvbik7XHJcbiAgICB0aGlzLmNyZWF0ZUxvZ0dyb3VwKCdUcmlnZ2VyRXhlY3V0aW9uJywgcHJvcHMudHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKTtcclxuICAgIHRoaXMuY3JlYXRlTG9nR3JvdXAoJ0dldEV4ZWN1dGlvblN0YXR1cycsIHByb3BzLmdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uKTtcclxuICAgIHRoaXMuY3JlYXRlTG9nR3JvdXAoJ0dldEV4ZWN1dGlvblJlc3VsdHMnLCBwcm9wcy5nZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgdGhpcy5jcmVhdGVMb2dHcm91cCgnR2V0RXhlY3V0aW9uSGlzdG9yeScsIHByb3BzLmdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbik7XHJcbiAgICB0aGlzLmNyZWF0ZUxvZ0dyb3VwKCdHZXRTdWl0ZVJlc3VsdHMnLCBwcm9wcy5nZXRTdWl0ZVJlc3VsdHNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zXHJcbiAgICB0aGlzLmNyZWF0ZUxhbWJkYUFsYXJtcyhwcm9wcyk7XHJcbiAgICB0aGlzLmNyZWF0ZVF1ZXVlQWxhcm1zKHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBkYXNoYm9hcmRcclxuICAgIHRoaXMuY3JlYXRlRGFzaGJvYXJkKHByb3BzKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIENsb3VkV2F0Y2ggbG9nIGdyb3VwIGZvciBhIExhbWJkYSBmdW5jdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlTG9nR3JvdXAobmFtZTogc3RyaW5nLCBsYW1iZGFGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uKTogdm9pZCB7XHJcbiAgICBjb25zdCBsb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsIGAke25hbWV9TG9nR3JvdXBgLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvbGFtYmRhLyR7bGFtYmRhRnVuY3Rpb24uZnVuY3Rpb25OYW1lfWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCwgLy8gMzAgZGF5cyByZXRlbnRpb25cclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmxvZ0dyb3Vwcy5zZXQobmFtZSwgbG9nR3JvdXApO1xyXG5cclxuICAgIC8vIENyZWF0ZSBtZXRyaWMgZmlsdGVycyBmb3IgZXJyb3IgdHJhY2tpbmdcclxuICAgIGxvZ0dyb3VwLmFkZE1ldHJpY0ZpbHRlcihgJHtuYW1lfUVycm9yRmlsdGVyYCwge1xyXG4gICAgICBmaWx0ZXJQYXR0ZXJuOiBsb2dzLkZpbHRlclBhdHRlcm4uYW55VGVybSgnRVJST1InLCAnRXJyb3InLCAnZXJyb3InLCAnRXhjZXB0aW9uJywgJ2V4Y2VwdGlvbicpLFxyXG4gICAgICBtZXRyaWNOYW1lOiBgJHtuYW1lfUVycm9yc2AsXHJcbiAgICAgIG1ldHJpY05hbWVzcGFjZTogJ1Rlc3RFeGVjdXRpb24nLFxyXG4gICAgICBtZXRyaWNWYWx1ZTogJzEnLFxyXG4gICAgICBkZWZhdWx0VmFsdWU6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbWV0cmljIGZpbHRlciBmb3IgdGltZW91dCB0cmFja2luZ1xyXG4gICAgbG9nR3JvdXAuYWRkTWV0cmljRmlsdGVyKGAke25hbWV9VGltZW91dEZpbHRlcmAsIHtcclxuICAgICAgZmlsdGVyUGF0dGVybjogbG9ncy5GaWx0ZXJQYXR0ZXJuLmFueVRlcm0oJ3RpbWVvdXQnLCAndGltZWQgb3V0JywgJ3RpbWUgcmVtYWluaW5nJyksXHJcbiAgICAgIG1ldHJpY05hbWU6IGAke25hbWV9VGltZW91dHNgLFxyXG4gICAgICBtZXRyaWNOYW1lc3BhY2U6ICdUZXN0RXhlY3V0aW9uJyxcclxuICAgICAgbWV0cmljVmFsdWU6ICcxJyxcclxuICAgICAgZGVmYXVsdFZhbHVlOiAwLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgQ2xvdWRXYXRjaCBhbGFybXMgZm9yIExhbWJkYSBmdW5jdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUxhbWJkYUFsYXJtcyhwcm9wczogRXhlY3V0aW9uTW9uaXRvcmluZ1Byb3BzKTogdm9pZCB7XHJcbiAgICAvLyBUZXN0IEV4ZWN1dG9yIExhbWJkYSBhbGFybXNcclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRXJyb3JBbGFybShcclxuICAgICAgJ1Rlc3RFeGVjdXRvckVycm9ycycsXHJcbiAgICAgIHByb3BzLnRlc3RFeGVjdXRvckZ1bmN0aW9uLFxyXG4gICAgICAnVGVzdCBFeGVjdXRvciBMYW1iZGEgaGFzIGhpZ2ggZXJyb3IgcmF0ZSdcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5jcmVhdGVMYW1iZGFUaHJvdHRsZUFsYXJtKFxyXG4gICAgICAnVGVzdEV4ZWN1dG9yVGhyb3R0bGVzJyxcclxuICAgICAgcHJvcHMudGVzdEV4ZWN1dG9yRnVuY3Rpb24sXHJcbiAgICAgICdUZXN0IEV4ZWN1dG9yIExhbWJkYSBpcyBiZWluZyB0aHJvdHRsZWQnXHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRHVyYXRpb25BbGFybShcclxuICAgICAgJ1Rlc3RFeGVjdXRvckR1cmF0aW9uJyxcclxuICAgICAgcHJvcHMudGVzdEV4ZWN1dG9yRnVuY3Rpb24sXHJcbiAgICAgICdUZXN0IEV4ZWN1dG9yIExhbWJkYSBhcHByb2FjaGluZyB0aW1lb3V0JyxcclxuICAgICAgODQwMDAwIC8vIDE0IG1pbnV0ZXMgKExhbWJkYSB0aW1lb3V0IGlzIDE1IG1pbnV0ZXMpXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFRyaWdnZXIgTGFtYmRhIGFsYXJtc1xyXG4gICAgdGhpcy5jcmVhdGVMYW1iZGFFcnJvckFsYXJtKFxyXG4gICAgICAnVHJpZ2dlckV4ZWN1dGlvbkVycm9ycycsXHJcbiAgICAgIHByb3BzLnRyaWdnZXJFeGVjdXRpb25GdW5jdGlvbixcclxuICAgICAgJ1RyaWdnZXIgRXhlY3V0aW9uIExhbWJkYSBoYXMgaGlnaCBlcnJvciByYXRlJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBTdGF0dXMgTGFtYmRhIGFsYXJtc1xyXG4gICAgdGhpcy5jcmVhdGVMYW1iZGFFcnJvckFsYXJtKFxyXG4gICAgICAnR2V0U3RhdHVzRXJyb3JzJyxcclxuICAgICAgcHJvcHMuZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24sXHJcbiAgICAgICdHZXQgU3RhdHVzIExhbWJkYSBoYXMgaGlnaCBlcnJvciByYXRlJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBSZXN1bHRzIExhbWJkYSBhbGFybXNcclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRXJyb3JBbGFybShcclxuICAgICAgJ0dldFJlc3VsdHNFcnJvcnMnLFxyXG4gICAgICBwcm9wcy5nZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24sXHJcbiAgICAgICdHZXQgUmVzdWx0cyBMYW1iZGEgaGFzIGhpZ2ggZXJyb3IgcmF0ZSdcclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgZXJyb3IgYWxhcm0gZm9yIGEgTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVMYW1iZGFFcnJvckFsYXJtKFxyXG4gICAgaWQ6IHN0cmluZyxcclxuICAgIGxhbWJkYUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb24sXHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nXHJcbiAgKTogY2xvdWR3YXRjaC5BbGFybSB7XHJcbiAgICBjb25zdCBtZXRyaWMgPSBsYW1iZGFGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsIGlkLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYCR7bGFtYmRhRnVuY3Rpb24uZnVuY3Rpb25OYW1lfS1lcnJvcnNgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbixcclxuICAgICAgbWV0cmljLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUsIC8vIEFsZXJ0IGlmIDUgb3IgbW9yZSBlcnJvcnMgaW4gNSBtaW51dGVzXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9PUl9FUVVBTF9UT19USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgdGhyb3R0bGUgYWxhcm0gZm9yIGEgTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVMYW1iZGFUaHJvdHRsZUFsYXJtKFxyXG4gICAgaWQ6IHN0cmluZyxcclxuICAgIGxhbWJkYUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb24sXHJcbiAgICBkZXNjcmlwdGlvbjogc3RyaW5nXHJcbiAgKTogY2xvdWR3YXRjaC5BbGFybSB7XHJcbiAgICBjb25zdCBtZXRyaWMgPSBsYW1iZGFGdW5jdGlvbi5tZXRyaWNUaHJvdHRsZXMoe1xyXG4gICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsIGlkLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYCR7bGFtYmRhRnVuY3Rpb24uZnVuY3Rpb25OYW1lfS10aHJvdHRsZXNgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiBkZXNjcmlwdGlvbixcclxuICAgICAgbWV0cmljLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEsIC8vIEFsZXJ0IG9uIGFueSB0aHJvdHRsZVxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fT1JfRVFVQUxfVE9fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGR1cmF0aW9uIGFsYXJtIGZvciBhIExhbWJkYSBmdW5jdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlTGFtYmRhRHVyYXRpb25BbGFybShcclxuICAgIGlkOiBzdHJpbmcsXHJcbiAgICBsYW1iZGFGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uLFxyXG4gICAgZGVzY3JpcHRpb246IHN0cmluZyxcclxuICAgIHRocmVzaG9sZE1zOiBudW1iZXJcclxuICApOiBjbG91ZHdhdGNoLkFsYXJtIHtcclxuICAgIGNvbnN0IG1ldHJpYyA9IGxhbWJkYUZ1bmN0aW9uLm1ldHJpY0R1cmF0aW9uKHtcclxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgaWQsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgJHtsYW1iZGFGdW5jdGlvbi5mdW5jdGlvbk5hbWV9LWR1cmF0aW9uYCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogZGVzY3JpcHRpb24sXHJcbiAgICAgIG1ldHJpYyxcclxuICAgICAgdGhyZXNob2xkOiB0aHJlc2hvbGRNcyxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsIC8vIEFsZXJ0IGlmIDIgY29uc2VjdXRpdmUgcGVyaW9kcyBleGNlZWQgdGhyZXNob2xkXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX09SX0VRVUFMX1RPX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgU1FTIHF1ZXVlc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlUXVldWVBbGFybXMocHJvcHM6IEV4ZWN1dGlvbk1vbml0b3JpbmdQcm9wcyk6IHZvaWQge1xyXG4gICAgLy8gRExRIGRlcHRoIGFsYXJtIC0gYWxlcnQgaWYgYW55IG1lc3NhZ2VzIGluIERMUVxyXG4gICAgY29uc3QgZGxxRGVwdGhNZXRyaWMgPSBwcm9wcy50ZXN0RXhlY3V0aW9uRExRLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xyXG4gICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBzdGF0aXN0aWM6ICdNYXhpbXVtJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdETFFEZXB0aEFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS10ZXN0LWV4ZWN1dGlvbi1kbHEtZGVwdGhgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnVGVzdCBleGVjdXRpb24gRExRIGhhcyBtZXNzYWdlcyAoZmFpbGVkIGV4ZWN1dGlvbnMpJyxcclxuICAgICAgbWV0cmljOiBkbHFEZXB0aE1ldHJpYyxcclxuICAgICAgdGhyZXNob2xkOiAxLCAvLyBBbGVydCBvbiBhbnkgbWVzc2FnZSBpbiBETFFcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX09SX0VRVUFMX1RPX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNYWluIHF1ZXVlIGRlcHRoIGFsYXJtIC0gYWxlcnQgaWYgcXVldWUgaXMgYmFja2luZyB1cFxyXG4gICAgY29uc3QgcXVldWVEZXB0aE1ldHJpYyA9IHByb3BzLnRlc3RFeGVjdXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNWaXNpYmxlKHtcclxuICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgc3RhdGlzdGljOiAnTWF4aW11bScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnUXVldWVEZXB0aEFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS10ZXN0LWV4ZWN1dGlvbi1xdWV1ZS1kZXB0aGAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdUZXN0IGV4ZWN1dGlvbiBxdWV1ZSBkZXB0aCBpcyBoaWdoJyxcclxuICAgICAgbWV0cmljOiBxdWV1ZURlcHRoTWV0cmljLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEwMCwgLy8gQWxlcnQgaWYgbW9yZSB0aGFuIDEwMCBtZXNzYWdlcyB3YWl0aW5nXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLCAvLyBBbGVydCBpZiBoaWdoIGZvciAxMCBtaW51dGVzXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX09SX0VRVUFMX1RPX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBRdWV1ZSBhZ2UgYWxhcm0gLSBhbGVydCBpZiBtZXNzYWdlcyBhcmUgb2xkIChub3QgYmVpbmcgcHJvY2Vzc2VkKVxyXG4gICAgY29uc3QgcXVldWVBZ2VNZXRyaWMgPSBwcm9wcy50ZXN0RXhlY3V0aW9uUXVldWUubWV0cmljQXBwcm94aW1hdGVBZ2VPZk9sZGVzdE1lc3NhZ2Uoe1xyXG4gICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBzdGF0aXN0aWM6ICdNYXhpbXVtJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdRdWV1ZUFnZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS10ZXN0LWV4ZWN1dGlvbi1xdWV1ZS1hZ2VgLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnVGVzdCBleGVjdXRpb24gcXVldWUgaGFzIG9sZCBtZXNzYWdlcycsXHJcbiAgICAgIG1ldHJpYzogcXVldWVBZ2VNZXRyaWMsXHJcbiAgICAgIHRocmVzaG9sZDogMTgwMCwgLy8gQWxlcnQgaWYgbWVzc2FnZXMgYXJlIG9sZGVyIHRoYW4gMzAgbWludXRlc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fT1JfRVFVQUxfVE9fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIENsb3VkV2F0Y2ggZGFzaGJvYXJkIGZvciB0ZXN0IGV4ZWN1dGlvbiBtb25pdG9yaW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVEYXNoYm9hcmQocHJvcHM6IEV4ZWN1dGlvbk1vbml0b3JpbmdQcm9wcyk6IHZvaWQge1xyXG4gICAgY29uc3QgZGFzaGJvYXJkID0gbmV3IGNsb3Vkd2F0Y2guRGFzaGJvYXJkKHRoaXMsICdFeGVjdXRpb25EYXNoYm9hcmQnLCB7XHJcbiAgICAgIGRhc2hib2FyZE5hbWU6IGAke3Byb3BzLmVudmlyb25tZW50fS10ZXN0LWV4ZWN1dGlvbmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGEgbWV0cmljc1xyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0xhbWJkYSBJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgcHJvcHMudGVzdEV4ZWN1dG9yRnVuY3Rpb24ubWV0cmljSW52b2NhdGlvbnMoKSxcclxuICAgICAgICAgIHByb3BzLnRyaWdnZXJFeGVjdXRpb25GdW5jdGlvbi5tZXRyaWNJbnZvY2F0aW9ucygpLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnTGFtYmRhIEVycm9ycycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgcHJvcHMudGVzdEV4ZWN1dG9yRnVuY3Rpb24ubWV0cmljRXJyb3JzKCksXHJcbiAgICAgICAgICBwcm9wcy50cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24ubWV0cmljRXJyb3JzKCksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdMYW1iZGEgRHVyYXRpb24nLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIHByb3BzLnRlc3RFeGVjdXRvckZ1bmN0aW9uLm1ldHJpY0R1cmF0aW9uKHsgc3RhdGlzdGljOiAnQXZlcmFnZScgfSksXHJcbiAgICAgICAgICBwcm9wcy50ZXN0RXhlY3V0b3JGdW5jdGlvbi5tZXRyaWNEdXJhdGlvbih7IHN0YXRpc3RpYzogJ01heGltdW0nIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnTGFtYmRhIFRocm90dGxlcycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgcHJvcHMudGVzdEV4ZWN1dG9yRnVuY3Rpb24ubWV0cmljVGhyb3R0bGVzKCksXHJcbiAgICAgICAgICBwcm9wcy50cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24ubWV0cmljVGhyb3R0bGVzKCksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFF1ZXVlIG1ldHJpY3NcclxuICAgIGRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdRdWV1ZSBEZXB0aCcsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgcHJvcHMudGVzdEV4ZWN1dGlvblF1ZXVlLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoKSxcclxuICAgICAgICAgIHByb3BzLnRlc3RFeGVjdXRpb25ETFEubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzVmlzaWJsZSgpLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnUXVldWUgQWdlJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBwcm9wcy50ZXN0RXhlY3V0aW9uUXVldWUubWV0cmljQXBwcm94aW1hdGVBZ2VPZk9sZGVzdE1lc3NhZ2UoKSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gQ3VzdG9tIG1ldHJpY3MgZnJvbSBsb2cgZmlsdGVyc1xyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0Vycm9yIENvdW50IGJ5IEZ1bmN0aW9uJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdUZXN0RXhlY3V0aW9uJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ1Rlc3RFeGVjdXRvckVycm9ycycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ1Rlc3RFeGVjdXRpb24nLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnVHJpZ2dlckV4ZWN1dGlvbkVycm9ycycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1RpbWVvdXQgQ291bnQnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ1Rlc3RFeGVjdXRpb24nLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnVGVzdEV4ZWN1dG9yVGltZW91dHMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG4iXX0=