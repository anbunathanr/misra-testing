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
exports.AnalysisWorkflow = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const sfn = __importStar(require("aws-cdk-lib/aws-stepfunctions"));
const tasks = __importStar(require("aws-cdk-lib/aws-stepfunctions-tasks"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const constructs_1 = require("constructs");
/**
 * Step Functions state machine for MISRA analysis workflow orchestration
 * Coordinates the analysis pipeline from file processing to result notification
 */
class AnalysisWorkflow extends constructs_1.Construct {
    stateMachine;
    constructor(scope, id, props) {
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
            .next(new sfn.Choice(this, 'IsAnalysisComplete')
            .when(sfn.Condition.stringEquals('$.status', 'COMPLETED'), sendSuccessNotification.next(analysisSucceeded))
            .when(sfn.Condition.stringEquals('$.status', 'FAILED'), sendFailureNotification.next(analysisFailed))
            .when(sfn.Condition.stringEquals('$.status', 'IN_PROGRESS'), waitForAnalysis)
            .otherwise(analysisFailed));
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
exports.AnalysisWorkflow = AnalysisWorkflow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtd29ya2Zsb3cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbmFseXNpcy13b3JrZmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsbUVBQXFEO0FBQ3JELDJFQUE2RDtBQUU3RCwyREFBNkM7QUFDN0MsMkNBQXVDO0FBUXZDOzs7R0FHRztBQUNILE1BQWEsZ0JBQWlCLFNBQVEsc0JBQVM7SUFDN0IsWUFBWSxDQUFtQjtJQUUvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsd0JBQXdCO1FBQ3hCLE1BQU0sYUFBYSxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ2xFLGNBQWMsRUFBRSxLQUFLLENBQUMsZ0JBQWdCO1lBQ3RDLFVBQVUsRUFBRSxXQUFXO1lBQ3ZCLHdCQUF3QixFQUFFLElBQUk7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzlFLGNBQWMsRUFBRSxLQUFLLENBQUMsZ0JBQWdCO1lBQ3RDLFNBQVMsRUFBRSxHQUFHO1lBQ2QsVUFBVSxFQUFFLFdBQVc7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ3RGLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CO1lBQzFDLFNBQVMsRUFBRSxHQUFHO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ3RGLGNBQWMsRUFBRSxLQUFLLENBQUMsb0JBQW9CO1lBQzFDLFNBQVMsRUFBRSxHQUFHO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUM1RCxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDdEQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFDckUsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMxRCxLQUFLLEVBQUUsZUFBZTtZQUN0QixLQUFLLEVBQUUsdUJBQXVCO1NBQy9CLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixNQUFNLFVBQVUsR0FBRyxhQUFhO2FBQzdCLElBQUksQ0FBQyxlQUFlLENBQUM7YUFDckIsSUFBSSxDQUFDLG1CQUFtQixDQUFDO2FBQ3pCLElBQUksQ0FDSCxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDO2FBQ3ZDLElBQUksQ0FDSCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQ25ELHVCQUF1QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUNoRDthQUNBLElBQUksQ0FDSCxHQUFHLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQ2hELHVCQUF1QixDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FDN0M7YUFDQSxJQUFJLENBQ0gsR0FBRyxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxFQUNyRCxlQUFlLENBQ2hCO2FBQ0EsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUM3QixDQUFDO1FBRUosK0NBQStDO1FBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDM0QsWUFBWSxFQUFFLHFDQUFxQyxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3RFLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7WUFDdEMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3JFLGdCQUFnQixFQUFFLDJCQUEyQixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ2hFLFVBQVU7WUFDVixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzlCLElBQUksRUFBRTtnQkFDSixXQUFXLEVBQUUsUUFBUTtnQkFDckIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRzthQUN4QjtZQUNELGNBQWMsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWU7WUFDeEMsV0FBVyxFQUFFLDJDQUEyQztTQUN6RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFyRkQsNENBcUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgc2ZuIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zJztcclxuaW1wb3J0ICogYXMgdGFza3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHlzaXNXb3JrZmxvd1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIGFuYWx5c2lzRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb247XHJcbiAgbm90aWZpY2F0aW9uRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdGVwIEZ1bmN0aW9ucyBzdGF0ZSBtYWNoaW5lIGZvciBNSVNSQSBhbmFseXNpcyB3b3JrZmxvdyBvcmNoZXN0cmF0aW9uXHJcbiAqIENvb3JkaW5hdGVzIHRoZSBhbmFseXNpcyBwaXBlbGluZSBmcm9tIGZpbGUgcHJvY2Vzc2luZyB0byByZXN1bHQgbm90aWZpY2F0aW9uXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQW5hbHlzaXNXb3JrZmxvdyBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHN0YXRlTWFjaGluZTogc2ZuLlN0YXRlTWFjaGluZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFuYWx5c2lzV29ya2Zsb3dQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBEZWZpbmUgd29ya2Zsb3cgc3RlcHNcclxuICAgIGNvbnN0IHN0YXJ0QW5hbHlzaXMgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdTdGFydEFuYWx5c2lzJywge1xyXG4gICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMuYW5hbHlzaXNGdW5jdGlvbixcclxuICAgICAgb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXHJcbiAgICAgIHJldHJ5T25TZXJ2aWNlRXhjZXB0aW9uczogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNoZWNrQW5hbHlzaXNTdGF0dXMgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdDaGVja0FuYWx5c2lzU3RhdHVzJywge1xyXG4gICAgICBsYW1iZGFGdW5jdGlvbjogcHJvcHMuYW5hbHlzaXNGdW5jdGlvbixcclxuICAgICAgaW5wdXRQYXRoOiAnJCcsXHJcbiAgICAgIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc2VuZFN1Y2Nlc3NOb3RpZmljYXRpb24gPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdTZW5kU3VjY2Vzc05vdGlmaWNhdGlvbicsIHtcclxuICAgICAgbGFtYmRhRnVuY3Rpb246IHByb3BzLm5vdGlmaWNhdGlvbkZ1bmN0aW9uLFxyXG4gICAgICBpbnB1dFBhdGg6ICckJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHNlbmRGYWlsdXJlTm90aWZpY2F0aW9uID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnU2VuZEZhaWx1cmVOb3RpZmljYXRpb24nLCB7XHJcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy5ub3RpZmljYXRpb25GdW5jdGlvbixcclxuICAgICAgaW5wdXRQYXRoOiAnJCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB3YWl0Rm9yQW5hbHlzaXMgPSBuZXcgc2ZuLldhaXQodGhpcywgJ1dhaXRGb3JBbmFseXNpcycsIHtcclxuICAgICAgdGltZTogc2ZuLldhaXRUaW1lLmR1cmF0aW9uKGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhbmFseXNpc1N1Y2NlZWRlZCA9IG5ldyBzZm4uU3VjY2VlZCh0aGlzLCAnQW5hbHlzaXNTdWNjZWVkZWQnKTtcclxuICAgIGNvbnN0IGFuYWx5c2lzRmFpbGVkID0gbmV3IHNmbi5GYWlsKHRoaXMsICdBbmFseXNpc0ZhaWxlZCcsIHtcclxuICAgICAgZXJyb3I6ICdBbmFseXNpc0Vycm9yJyxcclxuICAgICAgY2F1c2U6ICdNSVNSQSBhbmFseXNpcyBmYWlsZWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGVmaW5lIHdvcmtmbG93IGxvZ2ljXHJcbiAgICBjb25zdCBkZWZpbml0aW9uID0gc3RhcnRBbmFseXNpc1xyXG4gICAgICAubmV4dCh3YWl0Rm9yQW5hbHlzaXMpXHJcbiAgICAgIC5uZXh0KGNoZWNrQW5hbHlzaXNTdGF0dXMpXHJcbiAgICAgIC5uZXh0KFxyXG4gICAgICAgIG5ldyBzZm4uQ2hvaWNlKHRoaXMsICdJc0FuYWx5c2lzQ29tcGxldGUnKVxyXG4gICAgICAgICAgLndoZW4oXHJcbiAgICAgICAgICAgIHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnN0YXR1cycsICdDT01QTEVURUQnKSxcclxuICAgICAgICAgICAgc2VuZFN1Y2Nlc3NOb3RpZmljYXRpb24ubmV4dChhbmFseXNpc1N1Y2NlZWRlZClcclxuICAgICAgICAgIClcclxuICAgICAgICAgIC53aGVuKFxyXG4gICAgICAgICAgICBzZm4uQ29uZGl0aW9uLnN0cmluZ0VxdWFscygnJC5zdGF0dXMnLCAnRkFJTEVEJyksXHJcbiAgICAgICAgICAgIHNlbmRGYWlsdXJlTm90aWZpY2F0aW9uLm5leHQoYW5hbHlzaXNGYWlsZWQpXHJcbiAgICAgICAgICApXHJcbiAgICAgICAgICAud2hlbihcclxuICAgICAgICAgICAgc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ0lOX1BST0dSRVNTJyksXHJcbiAgICAgICAgICAgIHdhaXRGb3JBbmFseXNpc1xyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgLm90aGVyd2lzZShhbmFseXNpc0ZhaWxlZClcclxuICAgICAgKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbG9nIGdyb3VwIGZvciB3b3JrZmxvdyBleGVjdXRpb24gbG9nc1xyXG4gICAgY29uc3QgbG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnV29ya2Zsb3dMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9zdGVwZnVuY3Rpb25zL21pc3JhLWFuYWx5c2lzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgc3RhdGUgbWFjaGluZVxyXG4gICAgdGhpcy5zdGF0ZU1hY2hpbmUgPSBuZXcgc2ZuLlN0YXRlTWFjaGluZSh0aGlzLCAnQW5hbHlzaXNTdGF0ZU1hY2hpbmUnLCB7XHJcbiAgICAgIHN0YXRlTWFjaGluZU5hbWU6IGBtaXNyYS1hbmFseXNpcy13b3JrZmxvdy0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIGRlZmluaXRpb24sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgbG9nczoge1xyXG4gICAgICAgIGRlc3RpbmF0aW9uOiBsb2dHcm91cCxcclxuICAgICAgICBsZXZlbDogc2ZuLkxvZ0xldmVsLkFMTCxcclxuICAgICAgfSxcclxuICAgICAgdHJhY2luZ0VuYWJsZWQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgc3RhdGUgbWFjaGluZSBBUk5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTdGF0ZU1hY2hpbmVBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTUlTUkEgQW5hbHlzaXMgV29ya2Zsb3cgU3RhdGUgTWFjaGluZSBBUk4nLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==