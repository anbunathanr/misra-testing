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
exports.MisraPlatformStackV2 = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const path = __importStar(require("path"));
/**
 * Simplified CDK Stack using pre-bundled Lambda functions
 * This avoids the massive src directory packaging issue
 */
class MisraPlatformStackV2 extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // HTTP API Gateway
        const httpApi = new apigateway.HttpApi(this, 'HttpApi', {
            apiName: 'misra-platform-api',
            description: 'MISRA Platform API',
            corsPreflight: {
                allowHeaders: ['Content-Type', 'Authorization'],
                allowMethods: [
                    apigateway.CorsHttpMethod.GET,
                    apigateway.CorsHttpMethod.POST,
                    apigateway.CorsHttpMethod.PUT,
                    apigateway.CorsHttpMethod.DELETE,
                    apigateway.CorsHttpMethod.OPTIONS,
                ],
                allowOrigins: ['*'],
                maxAge: cdk.Duration.hours(24),
            },
        });
        // Helper function to create Lambda functions from bundled code
        const createLambdaFunction = (functionName, handler, environment = {}) => {
            const zipPath = path.join(__dirname, '../../dist-zips', handler, 'index.zip');
            return new lambda.Function(this, functionName, {
                functionName: `misra-${functionName}`,
                runtime: lambda.Runtime.NODEJS_20_X,
                handler: 'index.handler',
                code: lambda.Code.fromAsset(zipPath),
                environment,
                timeout: cdk.Duration.seconds(30),
                memorySize: 256,
                reservedConcurrentExecutions: 0,
            });
        };
        // Projects API Functions
        const getProjectsFunction = createLambdaFunction('get-projects', 'projects/get-projects');
        const createProjectFunction = createLambdaFunction('create-project', 'projects/create-project');
        const updateProjectFunction = createLambdaFunction('update-project', 'projects/update-project');
        // Test Suites API Functions
        const getTestSuitesFunction = createLambdaFunction('get-test-suites', 'test-suites/get-suites');
        const createTestSuiteFunction = createLambdaFunction('create-test-suite', 'test-suites/create-suite');
        const updateTestSuiteFunction = createLambdaFunction('update-test-suite', 'test-suites/update-suite');
        // Test Cases API Functions
        const getTestCasesFunction = createLambdaFunction('get-test-cases', 'test-cases/get-test-cases');
        const createTestCaseFunction = createLambdaFunction('create-test-case', 'test-cases/create-test-case');
        const updateTestCaseFunction = createLambdaFunction('update-test-case', 'test-cases/update-test-case');
        // File API Functions
        const getFilesFunction = createLambdaFunction('get-files', 'file/get-files');
        const uploadFunction = createLambdaFunction('upload-file', 'file/upload');
        // Analysis API Functions
        const queryAnalysisFunction = createLambdaFunction('query-analysis', 'analysis/query-results');
        const getUserStatsFunction = createLambdaFunction('get-user-stats', 'analysis/get-user-stats');
        // Executions API Functions
        const triggerExecutionFunction = createLambdaFunction('trigger-execution', 'executions/trigger');
        const getExecutionStatusFunction = createLambdaFunction('get-execution-status', 'executions/get-status');
        const getExecutionResultsFunction = createLambdaFunction('get-execution-results', 'executions/get-results');
        const getExecutionHistoryFunction = createLambdaFunction('get-execution-history', 'executions/get-history');
        const getSuiteExecutionResultsFunction = createLambdaFunction('get-suite-execution-results', 'executions/get-suite-results');
        // Insights API Functions
        const generateInsightsFunction = createLambdaFunction('generate-insights', 'ai/generate-insights');
        // Auth API Functions
        const loginFunction = createLambdaFunction('login', 'auth/login');
        const refreshFunction = createLambdaFunction('refresh', 'auth/refresh');
        const getProfileFunction = createLambdaFunction('get-profile', 'auth/get-profile');
        // Notification API Functions
        const getPreferencesFunction = createLambdaFunction('get-preferences', 'notifications/get-preferences');
        const updatePreferencesFunction = createLambdaFunction('update-preferences', 'notifications/update-preferences');
        const getHistoryFunction = createLambdaFunction('get-history', 'notifications/get-history');
        const getNotificationFunction = createLambdaFunction('get-notification', 'notifications/get-notification');
        const getTemplatesFunction = createLambdaFunction('get-templates', 'notifications/get-templates');
        const createTemplateFunction = createLambdaFunction('create-template', 'notifications/create-template');
        const updateTemplateFunction = createLambdaFunction('update-template', 'notifications/update-template');
        // API Routes - Projects
        httpApi.addRoutes({
            path: '/projects',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetProjectsIntegration', getProjectsFunction),
        });
        httpApi.addRoutes({
            path: '/projects',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateProjectIntegration', createProjectFunction),
        });
        httpApi.addRoutes({
            path: '/projects/{projectId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateProjectIntegration', updateProjectFunction),
        });
        // API Routes - Test Suites
        httpApi.addRoutes({
            path: '/test-suites',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetTestSuitesIntegration', getTestSuitesFunction),
        });
        httpApi.addRoutes({
            path: '/test-suites',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateTestSuiteIntegration', createTestSuiteFunction),
        });
        httpApi.addRoutes({
            path: '/test-suites/{suiteId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateTestSuiteIntegration', updateTestSuiteFunction),
        });
        // API Routes - Test Cases
        httpApi.addRoutes({
            path: '/test-cases',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetTestCasesIntegration', getTestCasesFunction),
        });
        httpApi.addRoutes({
            path: '/test-cases',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateTestCaseIntegration', createTestCaseFunction),
        });
        httpApi.addRoutes({
            path: '/test-cases/{testCaseId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateTestCaseIntegration', updateTestCaseFunction),
        });
        // API Routes - Files
        httpApi.addRoutes({
            path: '/files',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetFilesIntegration', getFilesFunction),
        });
        httpApi.addRoutes({
            path: '/files/upload',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('UploadFileIntegration', uploadFunction),
        });
        // API Routes - Analysis
        httpApi.addRoutes({
            path: '/analysis/query',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('QueryAnalysisIntegration', queryAnalysisFunction),
        });
        httpApi.addRoutes({
            path: '/analysis/stats/{userId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetUserStatsIntegration', getUserStatsFunction),
        });
        // API Routes - Executions
        httpApi.addRoutes({
            path: '/executions/trigger',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('TriggerExecutionIntegration', triggerExecutionFunction),
        });
        httpApi.addRoutes({
            path: '/executions/{executionId}/status',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetExecutionStatusIntegration', getExecutionStatusFunction),
        });
        httpApi.addRoutes({
            path: '/executions/{executionId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetExecutionResultsIntegration', getExecutionResultsFunction),
        });
        httpApi.addRoutes({
            path: '/executions/history',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetExecutionHistoryIntegration', getExecutionHistoryFunction),
        });
        httpApi.addRoutes({
            path: '/executions/suites/{suiteExecutionId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetSuiteExecutionResultsIntegration', getSuiteExecutionResultsFunction),
        });
        // API Routes - Insights
        httpApi.addRoutes({
            path: '/ai/insights',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('GenerateInsightsIntegration', generateInsightsFunction),
        });
        // API Routes - Auth
        httpApi.addRoutes({
            path: '/auth/login',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('LoginIntegration', loginFunction),
        });
        httpApi.addRoutes({
            path: '/auth/refresh',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('RefreshIntegration', refreshFunction),
        });
        httpApi.addRoutes({
            path: '/auth/profile',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetProfileIntegration', getProfileFunction),
        });
        // API Routes - Notifications
        httpApi.addRoutes({
            path: '/notifications/preferences',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetPreferencesIntegration', getPreferencesFunction),
        });
        httpApi.addRoutes({
            path: '/notifications/preferences',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdatePreferencesIntegration', updatePreferencesFunction),
        });
        httpApi.addRoutes({
            path: '/notifications/history',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetHistoryIntegration', getHistoryFunction),
        });
        httpApi.addRoutes({
            path: '/notifications/{notificationId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetNotificationIntegration', getNotificationFunction),
        });
        httpApi.addRoutes({
            path: '/notifications/templates',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetTemplatesIntegration', getTemplatesFunction),
        });
        httpApi.addRoutes({
            path: '/notifications/templates',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateTemplateIntegration', createTemplateFunction),
        });
        httpApi.addRoutes({
            path: '/notifications/templates/{templateId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateTemplateIntegration', updateTemplateFunction),
        });
        // Output the API endpoint
        new cdk.CfnOutput(this, 'ApiEndpoint', {
            value: httpApi.url || 'N/A',
            description: 'MISRA Platform API Endpoint',
            exportName: 'MisraPlatformApiEndpoint',
        });
    }
}
exports.MisraPlatformStackV2 = MisraPlatformStackV2;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2stdjIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay12Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFHMUUsMkNBQTZCO0FBRTdCOzs7R0FHRztBQUNILE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDakQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixtQkFBbUI7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDdEQsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixXQUFXLEVBQUUsb0JBQW9CO1lBQ2pDLGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO2dCQUMvQyxZQUFZLEVBQUU7b0JBQ1osVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUM3QixVQUFVLENBQUMsY0FBYyxDQUFDLElBQUk7b0JBQzlCLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRztvQkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxNQUFNO29CQUNoQyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU87aUJBQ2xDO2dCQUNELFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDbkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzthQUMvQjtTQUNGLENBQUMsQ0FBQztRQUVILCtEQUErRDtRQUMvRCxNQUFNLG9CQUFvQixHQUFHLENBQzNCLFlBQW9CLEVBQ3BCLE9BQWUs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LFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSx1QkFBdUIsQ0FBQztTQUMzRyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQ2hCLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixFQUFFLG9CQUFvQixDQUFDO1NBQ3JHLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDaEIsSUFBSSxFQUFFLDBCQUEwQjtZQUNoQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUM7U0FDekcsQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUNoQixJQUFJLEVBQUUsdUNBQXVDO1lBQzdDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsQ0FBQztTQUN6RyxDQUFDLENBQUM7UUFFSCwwQkFBMEI7UUFDMUIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxHQUFHLElBQUksS0FBSztZQUMzQixXQUFXLEVBQUUsNkJBQTZCO1lBQzFDLFVBQVUsRUFBRSwwQkFBMEI7U0FDdkMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbFlELG9EQWtZQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcclxuaW1wb3J0ICogYXMgaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbi8qKlxyXG4gKiBTaW1wbGlmaWVkIENESyBTdGFjayB1c2luZyBwcmUtYnVuZGxlZCBMYW1iZGEgZnVuY3Rpb25zXHJcbiAqIFRoaXMgYXZvaWRzIHRoZSBtYXNzaXZlIHNyYyBkaXJlY3RvcnkgcGFja2FnaW5nIGlzc3VlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTWlzcmFQbGF0Zm9ybVN0YWNrVjIgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIEhUVFAgQVBJIEdhdGV3YXlcclxuICAgIGNvbnN0IGh0dHBBcGkgPSBuZXcgYXBpZ2F0ZXdheS5IdHRwQXBpKHRoaXMsICdIdHRwQXBpJywge1xyXG4gICAgICBhcGlOYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXBpJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdNSVNSQSBQbGF0Zm9ybSBBUEknLFxyXG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdBdXRob3JpemF0aW9uJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkdFVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUE9TVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUFVULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd09yaWdpbnM6IFsnKiddLFxyXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhlbHBlciBmdW5jdGlvbiB0byBjcmVhdGUgTGFtYmRhIGZ1bmN0aW9ucyBmcm9tIGJ1bmRsZWQgY29kZVxyXG4gICAgY29uc3QgY3JlYXRlTGFtYmRhRnVuY3Rpb24gPSAoXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogc3RyaW5nLFxyXG4gICAgICBoYW5kbGVyOiBzdHJpbmcsXHJcbiAgICAgIGVudmlyb25tZW50OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge31cclxuICAgICk6IGxhbWJkYS5GdW5jdGlvbiA9PiB7XHJcbiAgICAgIGNvbnN0IHppcFBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vZGlzdC16aXBzJywgaGFuZGxlciwgJ2luZGV4LnppcCcpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgZnVuY3Rpb25OYW1lLCB7XHJcbiAgICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtJHtmdW5jdGlvbk5hbWV9YCxcclxuICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHppcFBhdGgpLFxyXG4gICAgICAgIGVudmlyb25tZW50LFxyXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFByb2plY3RzIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFByb2plY3RzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1wcm9qZWN0cycsXHJcbiAgICAgICdwcm9qZWN0cy9nZXQtcHJvamVjdHMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVByb2plY3RGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnY3JlYXRlLXByb2plY3QnLFxyXG4gICAgICAncHJvamVjdHMvY3JlYXRlLXByb2plY3QnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByb2plY3RGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndXBkYXRlLXByb2plY3QnLFxyXG4gICAgICAncHJvamVjdHMvdXBkYXRlLXByb2plY3QnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFRlc3QgU3VpdGVzIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFRlc3RTdWl0ZXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXRlc3Qtc3VpdGVzJyxcclxuICAgICAgJ3Rlc3Qtc3VpdGVzL2dldC1zdWl0ZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdjcmVhdGUtdGVzdC1zdWl0ZScsXHJcbiAgICAgICd0ZXN0LXN1aXRlcy9jcmVhdGUtc3VpdGUnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVRlc3RTdWl0ZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtdGVzdC1zdWl0ZScsXHJcbiAgICAgICd0ZXN0LXN1aXRlcy91cGRhdGUtc3VpdGUnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFRlc3QgQ2FzZXMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0VGVzdENhc2VzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC10ZXN0LWNhc2VzJyxcclxuICAgICAgJ3Rlc3QtY2FzZXMvZ2V0LXRlc3QtY2FzZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RDYXNlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2NyZWF0ZS10ZXN0LWNhc2UnLFxyXG4gICAgICAndGVzdC1jYXNlcy9jcmVhdGUtdGVzdC1jYXNlJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtdGVzdC1jYXNlJyxcclxuICAgICAgJ3Rlc3QtY2FzZXMvdXBkYXRlLXRlc3QtY2FzZSdcclxuICAgICk7XHJcblxyXG4gICAgLy8gRmlsZSBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRGaWxlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtZmlsZXMnLFxyXG4gICAgICAnZmlsZS9nZXQtZmlsZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwbG9hZEZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGxvYWQtZmlsZScsXHJcbiAgICAgICdmaWxlL3VwbG9hZCdcclxuICAgICk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgcXVlcnlBbmFseXNpc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdxdWVyeS1hbmFseXNpcycsXHJcbiAgICAgICdhbmFseXNpcy9xdWVyeS1yZXN1bHRzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRVc2VyU3RhdHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXVzZXItc3RhdHMnLFxyXG4gICAgICAnYW5hbHlzaXMvZ2V0LXVzZXItc3RhdHMnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEV4ZWN1dGlvbnMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd0cmlnZ2VyLWV4ZWN1dGlvbicsXHJcbiAgICAgICdleGVjdXRpb25zL3RyaWdnZXInXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtZXhlY3V0aW9uLXN0YXR1cycsXHJcbiAgICAgICdleGVjdXRpb25zL2dldC1zdGF0dXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LWV4ZWN1dGlvbi1yZXN1bHRzJyxcclxuICAgICAgJ2V4ZWN1dGlvbnMvZ2V0LXJlc3VsdHMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LWV4ZWN1dGlvbi1oaXN0b3J5JyxcclxuICAgICAgJ2V4ZWN1dGlvbnMvZ2V0LWhpc3RvcnknXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldFN1aXRlRXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtc3VpdGUtZXhlY3V0aW9uLXJlc3VsdHMnLFxyXG4gICAgICAnZXhlY3V0aW9ucy9nZXQtc3VpdGUtcmVzdWx0cydcclxuICAgICk7XHJcblxyXG4gICAgLy8gSW5zaWdodHMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2VuZXJhdGVJbnNpZ2h0c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZW5lcmF0ZS1pbnNpZ2h0cycsXHJcbiAgICAgICdhaS9nZW5lcmF0ZS1pbnNpZ2h0cydcclxuICAgICk7XHJcblxyXG4gICAgLy8gQXV0aCBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBsb2dpbkZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdsb2dpbicsXHJcbiAgICAgICdhdXRoL2xvZ2luJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCByZWZyZXNoRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3JlZnJlc2gnLFxyXG4gICAgICAnYXV0aC9yZWZyZXNoJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRQcm9maWxlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1wcm9maWxlJyxcclxuICAgICAgJ2F1dGgvZ2V0LXByb2ZpbGUnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtcHJlZmVyZW5jZXMnLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy9nZXQtcHJlZmVyZW5jZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3VwZGF0ZS1wcmVmZXJlbmNlcycsXHJcbiAgICAgICdub3RpZmljYXRpb25zL3VwZGF0ZS1wcmVmZXJlbmNlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0SGlzdG9yeUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtaGlzdG9yeScsXHJcbiAgICAgICdub3RpZmljYXRpb25zL2dldC1oaXN0b3J5J1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXROb3RpZmljYXRpb25GdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LW5vdGlmaWNhdGlvbicsXHJcbiAgICAgICdub3RpZmljYXRpb25zL2dldC1ub3RpZmljYXRpb24nXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldFRlbXBsYXRlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtdGVtcGxhdGVzJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvZ2V0LXRlbXBsYXRlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVGVtcGxhdGVGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnY3JlYXRlLXRlbXBsYXRlJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvY3JlYXRlLXRlbXBsYXRlJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtdGVtcGxhdGUnLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy91cGRhdGUtdGVtcGxhdGUnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBQcm9qZWN0c1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2plY3RzSW50ZWdyYXRpb24nLCBnZXRQcm9qZWN0c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9wcm9qZWN0cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlUHJvamVjdEludGVncmF0aW9uJywgY3JlYXRlUHJvamVjdEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9wcm9qZWN0cy97cHJvamVjdElkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVQcm9qZWN0SW50ZWdyYXRpb24nLCB1cGRhdGVQcm9qZWN0RnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIFRlc3QgU3VpdGVzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdFN1aXRlc0ludGVncmF0aW9uJywgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LXN1aXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVzdFN1aXRlSW50ZWdyYXRpb24nLCBjcmVhdGVUZXN0U3VpdGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMve3N1aXRlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RTdWl0ZUludGVncmF0aW9uJywgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIFRlc3QgQ2FzZXNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFRlc3RDYXNlc0ludGVncmF0aW9uJywgZ2V0VGVzdENhc2VzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVRlc3RDYXNlSW50ZWdyYXRpb24nLCBjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzL3t0ZXN0Q2FzZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVUZXN0Q2FzZUludGVncmF0aW9uJywgdXBkYXRlVGVzdENhc2VGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gRmlsZXNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRGaWxlc0ludGVncmF0aW9uJywgZ2V0RmlsZXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGxvYWRGaWxlSW50ZWdyYXRpb24nLCB1cGxvYWRGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gQW5hbHlzaXNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9xdWVyeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUXVlcnlBbmFseXNpc0ludGVncmF0aW9uJywgcXVlcnlBbmFseXNpc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9zdGF0cy97dXNlcklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRVc2VyU3RhdHNJbnRlZ3JhdGlvbicsIGdldFVzZXJTdGF0c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBFeGVjdXRpb25zXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy90cmlnZ2VyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdUcmlnZ2VyRXhlY3V0aW9uSW50ZWdyYXRpb24nLCB0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMve2V4ZWN1dGlvbklkfS9zdGF0dXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RXhlY3V0aW9uU3RhdHVzSW50ZWdyYXRpb24nLCBnZXRFeGVjdXRpb25TdGF0dXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy97ZXhlY3V0aW9uSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvblJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy9oaXN0b3J5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvbkhpc3RvcnlJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy9zdWl0ZXMve3N1aXRlRXhlY3V0aW9uSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFN1aXRlRXhlY3V0aW9uUmVzdWx0c0ludGVncmF0aW9uJywgZ2V0U3VpdGVFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIEluc2lnaHRzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYWkvaW5zaWdodHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dlbmVyYXRlSW5zaWdodHNJbnRlZ3JhdGlvbicsIGdlbmVyYXRlSW5zaWdodHNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gQXV0aFxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvbG9naW4nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0xvZ2luSW50ZWdyYXRpb24nLCBsb2dpbkZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZnJlc2gnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlZnJlc2hJbnRlZ3JhdGlvbicsIHJlZnJlc2hGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9wcm9maWxlJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2ZpbGVJbnRlZ3JhdGlvbicsIGdldFByb2ZpbGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gTm90aWZpY2F0aW9uc1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvcHJlZmVyZW5jZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIGdldFByZWZlcmVuY2VzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvcHJlZmVyZW5jZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlUHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvaGlzdG9yeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRIaXN0b3J5SW50ZWdyYXRpb24nLCBnZXRIaXN0b3J5RnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMve25vdGlmaWNhdGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXROb3RpZmljYXRpb25JbnRlZ3JhdGlvbicsIGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRUZW1wbGF0ZXNJbnRlZ3JhdGlvbicsIGdldFRlbXBsYXRlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvdGVtcGxhdGVzL3t0ZW1wbGF0ZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVUZW1wbGF0ZUludGVncmF0aW9uJywgdXBkYXRlVGVtcGxhdGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgdGhlIEFQSSBlbmRwb2ludFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUVuZHBvaW50Jywge1xyXG4gICAgICB2YWx1ZTogaHR0cEFwaS51cmwgfHwgJ04vQScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTUlTUkEgUGxhdGZvcm0gQVBJIEVuZHBvaW50JyxcclxuICAgICAgZXhwb3J0TmFtZTogJ01pc3JhUGxhdGZvcm1BcGlFbmRwb2ludCcsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19