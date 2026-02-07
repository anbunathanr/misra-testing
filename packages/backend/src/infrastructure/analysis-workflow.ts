import * as cdk from 'aws-cdk-lib';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export interface AnalysisWorkflowProps {
  environment: string;
  analysisFunction: lambda.IFunction;
  notificationFunction: lambda.IFunction;
}

/**
 * Step Functions state machine for MISRA analysis workflow orchestration
 * Coordinates the analysis pipeline from file processing to result notification
 */
export class AnalysisWorkflow extends Construct {
  public readonly stateMachine: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: AnalysisWorkflowProps) {
    super(scope, id);

    // Define workflow steps
    const startAnalysis = new tasks.LambdaInvoke(this, 'StartAnalysis', {
      lambdaFunction: props.analysisFunction,
      outputPath: '$.Payload',
      retryOnServiceExceptions: true,
    });

    const checkAnalysisStatus = new tasks.LambdaInvoke(this, 'CheckAnalysisStatus', {
      lambdaFunction: props.analysisFunction,
      inputPath: '$',
      outputPath: '$.Payload',
    });

    const sendSuccessNotification = new tasks.LambdaInvoke(this, 'SendSuccessNotification', {
      lambdaFunction: props.notificationFunction,
      inputPath: '$',
    });

    const sendFailureNotification = new tasks.LambdaInvoke(this, 'SendFailureNotification', {
      lambdaFunction: props.notificationFunction,
      inputPath: '$',
    });

    const waitForAnalysis = new sfn.Wait(this, 'WaitForAnalysis', {
      time: sfn.WaitTime.duration(cdk.Duration.seconds(30)),
    });

    const analysisSucceeded = new sfn.Succeed(this, 'AnalysisSucceeded');
    const analysisFailed = new sfn.Fail(this, 'AnalysisFailed', {
      error: 'AnalysisError',
      cause: 'MISRA analysis failed',
    });

    // Define workflow logic
    const definition = startAnalysis
      .next(waitForAnalysis)
      .next(checkAnalysisStatus)
      .next(
        new sfn.Choice(this, 'IsAnalysisComplete')
          .when(
            sfn.Condition.stringEquals('$.status', 'COMPLETED'),
            sendSuccessNotification.next(analysisSucceeded)
          )
          .when(
            sfn.Condition.stringEquals('$.status', 'FAILED'),
            sendFailureNotification.next(analysisFailed)
          )
          .when(
            sfn.Condition.stringEquals('$.status', 'IN_PROGRESS'),
            waitForAnalysis
          )
          .otherwise(analysisFailed)
      );

    // Create log group for workflow execution logs
    const logGroup = new logs.LogGroup(this, 'WorkflowLogGroup', {
      logGroupName: `/aws/stepfunctions/misra-analysis-${props.environment}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create state machine
    this.stateMachine = new sfn.StateMachine(this, 'AnalysisStateMachine', {
      stateMachineName: `misra-analysis-workflow-${props.environment}`,
      definition,
      timeout: cdk.Duration.hours(1),
      logs: {
        destination: logGroup,
        level: sfn.LogLevel.ALL,
      },
      tracingEnabled: true,
    });

    // Output state machine ARN
    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: this.stateMachine.stateMachineArn,
      description: 'MISRA Analysis Workflow State Machine ARN',
    });
  }
}
