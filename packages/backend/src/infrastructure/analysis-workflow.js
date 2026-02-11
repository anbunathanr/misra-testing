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
 *
 * SIMPLIFIED WORKFLOW:
 * - Single Lambda invocation that handles the entire analysis
 * - Lambda updates FileMetadata status internally
 * - Lambda sends notifications internally
 * - Workflow just checks final status and succeeds/fails accordingly
 */
class AnalysisWorkflow extends constructs_1.Construct {
    stateMachine;
    constructor(scope, id, props) {
        super(scope, id);
        // Define workflow steps - simplified to single analysis call
        const performAnalysis = new tasks.LambdaInvoke(this, 'PerformAnalysis', {
            lambdaFunction: props.analysisFunction,
            outputPath: '$.Payload',
            retryOnServiceExceptions: true,
            // Pass the entire input to the Lambda, handling optional fields
            payload: sfn.TaskInput.fromJsonPathAt('$')
        });
        const analysisSucceeded = new sfn.Succeed(this, 'AnalysisSucceeded');
        const analysisFailed = new sfn.Fail(this, 'AnalysisFailed', {
            error: 'AnalysisError',
            cause: 'MISRA analysis failed',
        });
        // Define workflow logic - single Lambda call with status check
        const definition = performAnalysis
            .next(new sfn.Choice(this, 'CheckAnalysisResult')
            .when(sfn.Condition.stringEquals('$.status', 'COMPLETED'), analysisSucceeded)
            .when(sfn.Condition.stringEquals('$.status', 'FAILED'), analysisFailed)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtd29ya2Zsb3cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbmFseXNpcy13b3JrZmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsbUVBQXFEO0FBQ3JELDJFQUE2RDtBQUU3RCwyREFBNkM7QUFDN0MsMkNBQXVDO0FBUXZDOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsZ0JBQWlCLFNBQVEsc0JBQVM7SUFDN0IsWUFBWSxDQUFtQjtJQUUvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTRCO1FBQ3BFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsNkRBQTZEO1FBQzdELE1BQU0sZUFBZSxHQUFHLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDdEUsY0FBYyxFQUFFLEtBQUssQ0FBQyxnQkFBZ0I7WUFDdEMsVUFBVSxFQUFFLFdBQVc7WUFDdkIsd0JBQXdCLEVBQUUsSUFBSTtZQUM5QixnRUFBZ0U7WUFDaEUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQztTQUMzQyxDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUNyRSxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzFELEtBQUssRUFBRSxlQUFlO1lBQ3RCLEtBQUssRUFBRSx1QkFBdUI7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsK0RBQStEO1FBQy9ELE1BQU0sVUFBVSxHQUFHLGVBQWU7YUFDL0IsSUFBSSxDQUNILElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUscUJBQXFCLENBQUM7YUFDeEMsSUFBSSxDQUNILEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsRUFDbkQsaUJBQWlCLENBQ2xCO2FBQ0EsSUFBSSxDQUNILEdBQUcsQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFDaEQsY0FBYyxDQUNmO2FBQ0EsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUM3QixDQUFDO1FBRUosK0NBQStDO1FBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDM0QsWUFBWSxFQUFFLHFDQUFxQyxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3RFLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7WUFDdEMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3JFLGdCQUFnQixFQUFFLDJCQUEyQixLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ2hFLFVBQVU7WUFDVixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzlCLElBQUksRUFBRTtnQkFDSixXQUFXLEVBQUUsUUFBUTtnQkFDckIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRzthQUN4QjtZQUNELGNBQWMsRUFBRSxJQUFJO1NBQ3JCLENBQUMsQ0FBQztRQUVILDJCQUEyQjtRQUMzQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ3pDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWU7WUFDeEMsV0FBVyxFQUFFLDJDQUEyQztTQUN6RCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE3REQsNENBNkRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgc2ZuIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zJztcclxuaW1wb3J0ICogYXMgdGFza3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxvZ3MnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHlzaXNXb3JrZmxvd1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG4gIGFuYWx5c2lzRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb247XHJcbiAgbm90aWZpY2F0aW9uRnVuY3Rpb246IGxhbWJkYS5JRnVuY3Rpb247XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdGVwIEZ1bmN0aW9ucyBzdGF0ZSBtYWNoaW5lIGZvciBNSVNSQSBhbmFseXNpcyB3b3JrZmxvdyBvcmNoZXN0cmF0aW9uXHJcbiAqIENvb3JkaW5hdGVzIHRoZSBhbmFseXNpcyBwaXBlbGluZSBmcm9tIGZpbGUgcHJvY2Vzc2luZyB0byByZXN1bHQgbm90aWZpY2F0aW9uXHJcbiAqIFxyXG4gKiBTSU1QTElGSUVEIFdPUktGTE9XOlxyXG4gKiAtIFNpbmdsZSBMYW1iZGEgaW52b2NhdGlvbiB0aGF0IGhhbmRsZXMgdGhlIGVudGlyZSBhbmFseXNpc1xyXG4gKiAtIExhbWJkYSB1cGRhdGVzIEZpbGVNZXRhZGF0YSBzdGF0dXMgaW50ZXJuYWxseVxyXG4gKiAtIExhbWJkYSBzZW5kcyBub3RpZmljYXRpb25zIGludGVybmFsbHlcclxuICogLSBXb3JrZmxvdyBqdXN0IGNoZWNrcyBmaW5hbCBzdGF0dXMgYW5kIHN1Y2NlZWRzL2ZhaWxzIGFjY29yZGluZ2x5XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQW5hbHlzaXNXb3JrZmxvdyBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHN0YXRlTWFjaGluZTogc2ZuLlN0YXRlTWFjaGluZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEFuYWx5c2lzV29ya2Zsb3dQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBEZWZpbmUgd29ya2Zsb3cgc3RlcHMgLSBzaW1wbGlmaWVkIHRvIHNpbmdsZSBhbmFseXNpcyBjYWxsXHJcbiAgICBjb25zdCBwZXJmb3JtQW5hbHlzaXMgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdQZXJmb3JtQW5hbHlzaXMnLCB7XHJcbiAgICAgIGxhbWJkYUZ1bmN0aW9uOiBwcm9wcy5hbmFseXNpc0Z1bmN0aW9uLFxyXG4gICAgICBvdXRwdXRQYXRoOiAnJC5QYXlsb2FkJyxcclxuICAgICAgcmV0cnlPblNlcnZpY2VFeGNlcHRpb25zOiB0cnVlLFxyXG4gICAgICAvLyBQYXNzIHRoZSBlbnRpcmUgaW5wdXQgdG8gdGhlIExhbWJkYSwgaGFuZGxpbmcgb3B0aW9uYWwgZmllbGRzXHJcbiAgICAgIHBheWxvYWQ6IHNmbi5UYXNrSW5wdXQuZnJvbUpzb25QYXRoQXQoJyQnKVxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYW5hbHlzaXNTdWNjZWVkZWQgPSBuZXcgc2ZuLlN1Y2NlZWQodGhpcywgJ0FuYWx5c2lzU3VjY2VlZGVkJyk7XHJcbiAgICBjb25zdCBhbmFseXNpc0ZhaWxlZCA9IG5ldyBzZm4uRmFpbCh0aGlzLCAnQW5hbHlzaXNGYWlsZWQnLCB7XHJcbiAgICAgIGVycm9yOiAnQW5hbHlzaXNFcnJvcicsXHJcbiAgICAgIGNhdXNlOiAnTUlTUkEgYW5hbHlzaXMgZmFpbGVkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIERlZmluZSB3b3JrZmxvdyBsb2dpYyAtIHNpbmdsZSBMYW1iZGEgY2FsbCB3aXRoIHN0YXR1cyBjaGVja1xyXG4gICAgY29uc3QgZGVmaW5pdGlvbiA9IHBlcmZvcm1BbmFseXNpc1xyXG4gICAgICAubmV4dChcclxuICAgICAgICBuZXcgc2ZuLkNob2ljZSh0aGlzLCAnQ2hlY2tBbmFseXNpc1Jlc3VsdCcpXHJcbiAgICAgICAgICAud2hlbihcclxuICAgICAgICAgICAgc2ZuLkNvbmRpdGlvbi5zdHJpbmdFcXVhbHMoJyQuc3RhdHVzJywgJ0NPTVBMRVRFRCcpLFxyXG4gICAgICAgICAgICBhbmFseXNpc1N1Y2NlZWRlZFxyXG4gICAgICAgICAgKVxyXG4gICAgICAgICAgLndoZW4oXHJcbiAgICAgICAgICAgIHNmbi5Db25kaXRpb24uc3RyaW5nRXF1YWxzKCckLnN0YXR1cycsICdGQUlMRUQnKSxcclxuICAgICAgICAgICAgYW5hbHlzaXNGYWlsZWRcclxuICAgICAgICAgIClcclxuICAgICAgICAgIC5vdGhlcndpc2UoYW5hbHlzaXNGYWlsZWQpXHJcbiAgICAgICk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGxvZyBncm91cCBmb3Igd29ya2Zsb3cgZXhlY3V0aW9uIGxvZ3NcclxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1dvcmtmbG93TG9nR3JvdXAnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3Mvc3RlcGZ1bmN0aW9ucy9taXNyYS1hbmFseXNpcy0ke3Byb3BzLmVudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHN0YXRlIG1hY2hpbmVcclxuICAgIHRoaXMuc3RhdGVNYWNoaW5lID0gbmV3IHNmbi5TdGF0ZU1hY2hpbmUodGhpcywgJ0FuYWx5c2lzU3RhdGVNYWNoaW5lJywge1xyXG4gICAgICBzdGF0ZU1hY2hpbmVOYW1lOiBgbWlzcmEtYW5hbHlzaXMtd29ya2Zsb3ctJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZWZpbml0aW9uLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGxvZ3M6IHtcclxuICAgICAgICBkZXN0aW5hdGlvbjogbG9nR3JvdXAsXHJcbiAgICAgICAgbGV2ZWw6IHNmbi5Mb2dMZXZlbC5BTEwsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRyYWNpbmdFbmFibGVkOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IHN0YXRlIG1hY2hpbmUgQVJOXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RhdGVNYWNoaW5lQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5zdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIEFuYWx5c2lzIFdvcmtmbG93IFN0YXRlIE1hY2hpbmUgQVJOJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=