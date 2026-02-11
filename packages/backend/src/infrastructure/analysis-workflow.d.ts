import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
export interface AnalysisWorkflowProps {
    environment: string;
    analysisFunction: lambda.IFunction;
    notificationFunction: lambda.IFunction;
}
/**
 * Step Functions state machine for MISRA analysis workflow orchestration
 * Coordinates the analysis pipeline from file processing to result notification
 *
 * SIMPLIFIED WORKFLOW:
 * - Single Lambda invocation that handles the entire analysis
 * - Lambda updates FileMetadata status internally
 * - Lambda sends notifications internally
 * - Workflow just checks final status and succeeds/fails accordingly
 */
export declare class AnalysisWorkflow extends Construct {
    readonly stateMachine: sfn.StateMachine;
    constructor(scope: Construct, id: string, props: AnalysisWorkflowProps);
}
