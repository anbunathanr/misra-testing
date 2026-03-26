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
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const path = __importStar(require("path"));
const file_storage_bucket_1 = require("./file-storage-bucket");
/**
 * Simplified CDK Stack using pre-bundled Lambda functions
 * This avoids the massive src directory packaging issue
 */
class MisraPlatformStackV2 extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const environment = process.env.ENVIRONMENT || 'dev';
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
        const createProjectFunction = createLambdaFunction('create-project', 'projects/create-project-simple');
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
        const registerFunction = createLambdaFunction('register', 'auth/register');
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
        // File Storage Bucket (must be defined before Lambda functions that use it)
        const fileStorageBucket = new file_storage_bucket_1.FileStorageBucket(this, 'FileStorageBucket', {
            environment
        });
        // Analysis Lambda Function (for S3 event notifications)
        const analyzeFileFunction = createLambdaFunction('analyze-file', 'analysis/analyze-file', {
            FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucket.bucketName,
            ENVIRONMENT: environment
        });
        // Grant S3 permission to invoke Lambda
        analyzeFileFunction.addPermission('S3InvokePermission', {
            action: 'lambda:InvokeFunction',
            principal: new iam.ServicePrincipal('s3.amazonaws.com'),
            sourceArn: fileStorageBucket.bucket.bucketArn
        });
        // Grant Lambda permission to read from S3
        fileStorageBucket.grantRead(analyzeFileFunction);
        // Add S3 event notification to trigger Lambda on file upload
        fileStorageBucket.addUploadNotification(analyzeFileFunction);
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
            path: '/auth/register',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('RegisterIntegration', registerFunction),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2stdjIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay12Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUseURBQTJDO0FBRTNDLDJDQUE2QjtBQUM3QiwrREFBMEQ7QUFFMUQ7OztHQUdHO0FBQ0gsTUFBYSxvQkFBcUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNqRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztRQUVyRCxtQkFBbUI7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDdEQsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixXQUFXLEVBQUUsb0JBQW9CO1lBQ2pDLGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO2dCQUMvQyxZQUFZLEVBQUU7b0JBQ1osVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUM3QixVQUFVLENBQUMsY0FBYyxDQUFDLElBQUk7b0JBQzlCLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRztvQkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxNQUFNO29CQUNoQyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU87aUJBQ2xDO2dCQUNELFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDbkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVB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SUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNEJBQTRCLEVBQUUsdUJBQXVCLENBQUM7U0FDM0csQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUNoQixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxvQkFBb0IsQ0FBQztTQUNyRyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQ2hCLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixDQUFDO1NBQ3pHLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDaEIsSUFBSSxFQUFFLHVDQUF1QztZQUM3QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUM7U0FDekcsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxJQUFJLEtBQUs7WUFDM0IsV0FBVyxFQUFFLDZCQUE2QjtZQUMxQyxVQUFVLEVBQUUsMEJBQTBCO1NBQ3ZDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTNhRCxvREEyYUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IEZpbGVTdG9yYWdlQnVja2V0IH0gZnJvbSAnLi9maWxlLXN0b3JhZ2UtYnVja2V0JztcclxuXHJcbi8qKlxyXG4gKiBTaW1wbGlmaWVkIENESyBTdGFjayB1c2luZyBwcmUtYnVuZGxlZCBMYW1iZGEgZnVuY3Rpb25zXHJcbiAqIFRoaXMgYXZvaWRzIHRoZSBtYXNzaXZlIHNyYyBkaXJlY3RvcnkgcGFja2FnaW5nIGlzc3VlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTWlzcmFQbGF0Zm9ybVN0YWNrVjIgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2Rldic7XHJcblxyXG4gICAgLy8gSFRUUCBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgaHR0cEFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgJ0h0dHBBcGknLCB7XHJcbiAgICAgIGFwaU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIEFQSScsXHJcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuR0VULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QVVQsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBMYW1iZGEgZnVuY3Rpb25zIGZyb20gYnVuZGxlZCBjb2RlXHJcbiAgICBjb25zdCBjcmVhdGVMYW1iZGFGdW5jdGlvbiA9IChcclxuICAgICAgZnVuY3Rpb25OYW1lOiBzdHJpbmcsXHJcbiAgICAgIGhhbmRsZXI6IHN0cmluZyxcclxuICAgICAgZW52aXJvbm1lbnQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fVxyXG4gICAgKTogbGFtYmRhLkZ1bmN0aW9uID0+IHtcclxuICAgICAgY29uc3QgemlwUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9kaXN0LXppcHMnLCBoYW5kbGVyLCAnaW5kZXguemlwJyk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBmdW5jdGlvbk5hbWUsIHtcclxuICAgICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS0ke2Z1bmN0aW9uTmFtZX1gLFxyXG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoemlwUGF0aCksXHJcbiAgICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gUHJvamVjdHMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0UHJvamVjdHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXByb2plY3RzJyxcclxuICAgICAgJ3Byb2plY3RzL2dldC1wcm9qZWN0cydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlUHJvamVjdEZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdjcmVhdGUtcHJvamVjdCcsXHJcbiAgICAgICdwcm9qZWN0cy9jcmVhdGUtcHJvamVjdC1zaW1wbGUnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByb2plY3RGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndXBkYXRlLXByb2plY3QnLFxyXG4gICAgICAncHJvamVjdHMvdXBkYXRlLXByb2plY3QnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFRlc3QgU3VpdGVzIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFRlc3RTdWl0ZXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXRlc3Qtc3VpdGVzJyxcclxuICAgICAgJ3Rlc3Qtc3VpdGVzL2dldC1zdWl0ZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdjcmVhdGUtdGVzdC1zdWl0ZScsXHJcbiAgICAgICd0ZXN0LXN1aXRlcy9jcmVhdGUtc3VpdGUnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVRlc3RTdWl0ZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtdGVzdC1zdWl0ZScsXHJcbiAgICAgICd0ZXN0LXN1aXRlcy91cGRhdGUtc3VpdGUnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIFRlc3QgQ2FzZXMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0VGVzdENhc2VzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC10ZXN0LWNhc2VzJyxcclxuICAgICAgJ3Rlc3QtY2FzZXMvZ2V0LXRlc3QtY2FzZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RDYXNlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2NyZWF0ZS10ZXN0LWNhc2UnLFxyXG4gICAgICAndGVzdC1jYXNlcy9jcmVhdGUtdGVzdC1jYXNlJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtdGVzdC1jYXNlJyxcclxuICAgICAgJ3Rlc3QtY2FzZXMvdXBkYXRlLXRlc3QtY2FzZSdcclxuICAgICk7XHJcblxyXG4gICAgLy8gRmlsZSBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRGaWxlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtZmlsZXMnLFxyXG4gICAgICAnZmlsZS9nZXQtZmlsZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwbG9hZEZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGxvYWQtZmlsZScsXHJcbiAgICAgICdmaWxlL3VwbG9hZCdcclxuICAgICk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgcXVlcnlBbmFseXNpc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdxdWVyeS1hbmFseXNpcycsXHJcbiAgICAgICdhbmFseXNpcy9xdWVyeS1yZXN1bHRzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRVc2VyU3RhdHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXVzZXItc3RhdHMnLFxyXG4gICAgICAnYW5hbHlzaXMvZ2V0LXVzZXItc3RhdHMnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEV4ZWN1dGlvbnMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd0cmlnZ2VyLWV4ZWN1dGlvbicsXHJcbiAgICAgICdleGVjdXRpb25zL3RyaWdnZXInXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtZXhlY3V0aW9uLXN0YXR1cycsXHJcbiAgICAgICdleGVjdXRpb25zL2dldC1zdGF0dXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LWV4ZWN1dGlvbi1yZXN1bHRzJyxcclxuICAgICAgJ2V4ZWN1dGlvbnMvZ2V0LXJlc3VsdHMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LWV4ZWN1dGlvbi1oaXN0b3J5JyxcclxuICAgICAgJ2V4ZWN1dGlvbnMvZ2V0LWhpc3RvcnknXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldFN1aXRlRXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtc3VpdGUtZXhlY3V0aW9uLXJlc3VsdHMnLFxyXG4gICAgICAnZXhlY3V0aW9ucy9nZXQtc3VpdGUtcmVzdWx0cydcclxuICAgICk7XHJcblxyXG4gICAgLy8gSW5zaWdodHMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2VuZXJhdGVJbnNpZ2h0c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZW5lcmF0ZS1pbnNpZ2h0cycsXHJcbiAgICAgICdhaS9nZW5lcmF0ZS1pbnNpZ2h0cydcclxuICAgICk7XHJcblxyXG4gICAgLy8gQXV0aCBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBsb2dpbkZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdsb2dpbicsXHJcbiAgICAgICdhdXRoL2xvZ2luJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCByZWdpc3RlckZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdyZWdpc3RlcicsXHJcbiAgICAgICdhdXRoL3JlZ2lzdGVyJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCByZWZyZXNoRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3JlZnJlc2gnLFxyXG4gICAgICAnYXV0aC9yZWZyZXNoJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRQcm9maWxlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1wcm9maWxlJyxcclxuICAgICAgJ2F1dGgvZ2V0LXByb2ZpbGUnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtcHJlZmVyZW5jZXMnLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy9nZXQtcHJlZmVyZW5jZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3VwZGF0ZS1wcmVmZXJlbmNlcycsXHJcbiAgICAgICdub3RpZmljYXRpb25zL3VwZGF0ZS1wcmVmZXJlbmNlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0SGlzdG9yeUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtaGlzdG9yeScsXHJcbiAgICAgICdub3RpZmljYXRpb25zL2dldC1oaXN0b3J5J1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXROb3RpZmljYXRpb25GdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LW5vdGlmaWNhdGlvbicsXHJcbiAgICAgICdub3RpZmljYXRpb25zL2dldC1ub3RpZmljYXRpb24nXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldFRlbXBsYXRlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtdGVtcGxhdGVzJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvZ2V0LXRlbXBsYXRlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVGVtcGxhdGVGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnY3JlYXRlLXRlbXBsYXRlJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvY3JlYXRlLXRlbXBsYXRlJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtdGVtcGxhdGUnLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy91cGRhdGUtdGVtcGxhdGUnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEZpbGUgU3RvcmFnZSBCdWNrZXQgKG11c3QgYmUgZGVmaW5lZCBiZWZvcmUgTGFtYmRhIGZ1bmN0aW9ucyB0aGF0IHVzZSBpdClcclxuICAgIGNvbnN0IGZpbGVTdG9yYWdlQnVja2V0ID0gbmV3IEZpbGVTdG9yYWdlQnVja2V0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldCcsIHtcclxuICAgICAgZW52aXJvbm1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIExhbWJkYSBGdW5jdGlvbiAoZm9yIFMzIGV2ZW50IG5vdGlmaWNhdGlvbnMpXHJcbiAgICBjb25zdCBhbmFseXplRmlsZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdhbmFseXplLWZpbGUnLFxyXG4gICAgICAnYW5hbHlzaXMvYW5hbHl6ZS1maWxlJyxcclxuICAgICAge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6IGVudmlyb25tZW50XHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgLy8gR3JhbnQgUzMgcGVybWlzc2lvbiB0byBpbnZva2UgTGFtYmRhXHJcbiAgICBhbmFseXplRmlsZUZ1bmN0aW9uLmFkZFBlcm1pc3Npb24oJ1MzSW52b2tlUGVybWlzc2lvbicsIHtcclxuICAgICAgYWN0aW9uOiAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJyxcclxuICAgICAgcHJpbmNpcGFsOiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ3MzLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgc291cmNlQXJuOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXQuYnVja2V0QXJuXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBMYW1iZGEgcGVybWlzc2lvbiB0byByZWFkIGZyb20gUzNcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZChhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBBZGQgUzMgZXZlbnQgbm90aWZpY2F0aW9uIHRvIHRyaWdnZXIgTGFtYmRhIG9uIGZpbGUgdXBsb2FkXHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5hZGRVcGxvYWROb3RpZmljYXRpb24oYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIFByb2plY3RzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJvamVjdHNJbnRlZ3JhdGlvbicsIGdldFByb2plY3RzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVQcm9qZWN0SW50ZWdyYXRpb24nLCBjcmVhdGVQcm9qZWN0RnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzL3twcm9qZWN0SWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVByb2plY3RJbnRlZ3JhdGlvbicsIHVwZGF0ZVByb2plY3RGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gVGVzdCBTdWl0ZXNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LXN1aXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRUZXN0U3VpdGVzSW50ZWdyYXRpb24nLCBnZXRUZXN0U3VpdGVzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0U3VpdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LXN1aXRlcy97c3VpdGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlVGVzdFN1aXRlSW50ZWdyYXRpb24nLCB1cGRhdGVUZXN0U3VpdGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gVGVzdCBDYXNlc1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdENhc2VzSW50ZWdyYXRpb24nLCBnZXRUZXN0Q2FzZXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1jYXNlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVzdENhc2VJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlc3RDYXNlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMve3Rlc3RDYXNlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RDYXNlSW50ZWdyYXRpb24nLCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBGaWxlc1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2ZpbGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEZpbGVzSW50ZWdyYXRpb24nLCBnZXRGaWxlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcy91cGxvYWQnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwbG9hZEZpbGVJbnRlZ3JhdGlvbicsIHVwbG9hZEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBBbmFseXNpc1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3F1ZXJ5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdRdWVyeUFuYWx5c2lzSW50ZWdyYXRpb24nLCBxdWVyeUFuYWx5c2lzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3N0YXRzL3t1c2VySWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFVzZXJTdGF0c0ludGVncmF0aW9uJywgZ2V0VXNlclN0YXRzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIEV4ZWN1dGlvbnNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3RyaWdnZXInLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1RyaWdnZXJFeGVjdXRpb25JbnRlZ3JhdGlvbicsIHRyaWdnZXJFeGVjdXRpb25GdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy97ZXhlY3V0aW9uSWR9L3N0YXR1cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRFeGVjdXRpb25TdGF0dXNJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RXhlY3V0aW9uUmVzdWx0c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL2hpc3RvcnknLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RXhlY3V0aW9uSGlzdG9yeUludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uSGlzdG9yeUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3N1aXRlcy97c3VpdGVFeGVjdXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0U3VpdGVFeGVjdXRpb25SZXN1bHRzSW50ZWdyYXRpb24nLCBnZXRTdWl0ZUV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gSW5zaWdodHNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9haS9pbnNpZ2h0cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2VuZXJhdGVJbnNpZ2h0c0ludGVncmF0aW9uJywgZ2VuZXJhdGVJbnNpZ2h0c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBBdXRoXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9sb2dpbicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignTG9naW5JbnRlZ3JhdGlvbicsIGxvZ2luRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvcmVnaXN0ZXInLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlZ2lzdGVySW50ZWdyYXRpb24nLCByZWdpc3RlckZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZnJlc2gnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlZnJlc2hJbnRlZ3JhdGlvbicsIHJlZnJlc2hGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9wcm9maWxlJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2ZpbGVJbnRlZ3JhdGlvbicsIGdldFByb2ZpbGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gTm90aWZpY2F0aW9uc1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvcHJlZmVyZW5jZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIGdldFByZWZlcmVuY2VzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvcHJlZmVyZW5jZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlUHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvaGlzdG9yeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRIaXN0b3J5SW50ZWdyYXRpb24nLCBnZXRIaXN0b3J5RnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMve25vdGlmaWNhdGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXROb3RpZmljYXRpb25JbnRlZ3JhdGlvbicsIGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRUZW1wbGF0ZXNJbnRlZ3JhdGlvbicsIGdldFRlbXBsYXRlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvdGVtcGxhdGVzL3t0ZW1wbGF0ZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVUZW1wbGF0ZUludGVncmF0aW9uJywgdXBkYXRlVGVtcGxhdGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgdGhlIEFQSSBlbmRwb2ludFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUVuZHBvaW50Jywge1xyXG4gICAgICB2YWx1ZTogaHR0cEFwaS51cmwgfHwgJ04vQScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTUlTUkEgUGxhdGZvcm0gQVBJIEVuZHBvaW50JyxcclxuICAgICAgZXhwb3J0TmFtZTogJ01pc3JhUGxhdGZvcm1BcGlFbmRwb2ludCcsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19