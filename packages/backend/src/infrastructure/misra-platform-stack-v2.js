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
        const getProjectsFunction = createLambdaFunction('get-projects', 'projects/get-projects-simple');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2stdjIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay12Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUseURBQTJDO0FBRTNDLDJDQUE2QjtBQUM3QiwrREFBMEQ7QUFFMUQ7OztHQUdHO0FBQ0gsTUFBYSxvQkFBcUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNqRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztRQUVyRCxtQkFBbUI7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDdEQsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixXQUFXLEVBQUUsb0JBQW9CO1lBQ2pDLGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO2dCQUMvQyxZQUFZLEVBQUU7b0JBQ1osVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUM3QixVQUFVLENBQUMsY0FBYyxDQUFDLElBQUk7b0JBQzlCLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRztvQkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxNQUFNO29CQUNoQyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU87aUJBQ2xDO2dCQUNELFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDbkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVB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SUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNEJBQTRCLEVBQUUsdUJBQXVCLENBQUM7U0FDM0csQ0FBQyxDQUFDO1FBRUgsT0FBTyxDQUFDLFNBQVMsQ0FBQztZQUNoQixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxvQkFBb0IsQ0FBQztTQUNyRyxDQUFDLENBQUM7UUFFSCxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQ2hCLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixDQUFDO1NBQ3pHLENBQUMsQ0FBQztRQUVILE9BQU8sQ0FBQyxTQUFTLENBQUM7WUFDaEIsSUFBSSxFQUFFLHVDQUF1QztZQUM3QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLENBQUM7U0FDekcsQ0FBQyxDQUFDO1FBRUgsMEJBQTBCO1FBQzFCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxJQUFJLEtBQUs7WUFDM0IsV0FBVyxFQUFFLDZCQUE2QjtZQUMxQyxVQUFVLEVBQUUsMEJBQTBCO1NBQ3ZDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTNhRCxvREEyYUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IEZpbGVTdG9yYWdlQnVja2V0IH0gZnJvbSAnLi9maWxlLXN0b3JhZ2UtYnVja2V0JztcclxuXHJcbi8qKlxyXG4gKiBTaW1wbGlmaWVkIENESyBTdGFjayB1c2luZyBwcmUtYnVuZGxlZCBMYW1iZGEgZnVuY3Rpb25zXHJcbiAqIFRoaXMgYXZvaWRzIHRoZSBtYXNzaXZlIHNyYyBkaXJlY3RvcnkgcGFja2FnaW5nIGlzc3VlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTWlzcmFQbGF0Zm9ybVN0YWNrVjIgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2Rldic7XHJcblxyXG4gICAgLy8gSFRUUCBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgaHR0cEFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgJ0h0dHBBcGknLCB7XHJcbiAgICAgIGFwaU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIEFQSScsXHJcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuR0VULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QVVQsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBMYW1iZGEgZnVuY3Rpb25zIGZyb20gYnVuZGxlZCBjb2RlXHJcbiAgICBjb25zdCBjcmVhdGVMYW1iZGFGdW5jdGlvbiA9IChcclxuICAgICAgZnVuY3Rpb25OYW1lOiBzdHJpbmcsXHJcbiAgICAgIGhhbmRsZXI6IHN0cmluZyxcclxuICAgICAgZW52aXJvbm1lbnQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fVxyXG4gICAgKTogbGFtYmRhLkZ1bmN0aW9uID0+IHtcclxuICAgICAgY29uc3QgemlwUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9kaXN0LXppcHMnLCBoYW5kbGVyLCAnaW5kZXguemlwJyk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBmdW5jdGlvbk5hbWUsIHtcclxuICAgICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS0ke2Z1bmN0aW9uTmFtZX1gLFxyXG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoemlwUGF0aCksXHJcbiAgICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgLy8gUHJvamVjdHMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0UHJvamVjdHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXByb2plY3RzJyxcclxuICAgICAgJ3Byb2plY3RzL2dldC1wcm9qZWN0cy1zaW1wbGUnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVByb2plY3RGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnY3JlYXRlLXByb2plY3QnLFxyXG4gICAgICAncHJvamVjdHMvY3JlYXRlLXByb2plY3Qtc2ltcGxlJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVQcm9qZWN0RnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3VwZGF0ZS1wcm9qZWN0JyxcclxuICAgICAgJ3Byb2plY3RzL3VwZGF0ZS1wcm9qZWN0J1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBUZXN0IFN1aXRlcyBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRUZXN0U3VpdGVzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC10ZXN0LXN1aXRlcycsXHJcbiAgICAgICd0ZXN0LXN1aXRlcy9nZXQtc3VpdGVzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVUZXN0U3VpdGVGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnY3JlYXRlLXRlc3Qtc3VpdGUnLFxyXG4gICAgICAndGVzdC1zdWl0ZXMvY3JlYXRlLXN1aXRlJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZXN0U3VpdGVGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndXBkYXRlLXRlc3Qtc3VpdGUnLFxyXG4gICAgICAndGVzdC1zdWl0ZXMvdXBkYXRlLXN1aXRlJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBUZXN0IENhc2VzIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFRlc3RDYXNlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtdGVzdC1jYXNlcycsXHJcbiAgICAgICd0ZXN0LWNhc2VzL2dldC10ZXN0LWNhc2VzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdjcmVhdGUtdGVzdC1jYXNlJyxcclxuICAgICAgJ3Rlc3QtY2FzZXMvY3JlYXRlLXRlc3QtY2FzZSdcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVzdENhc2VGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndXBkYXRlLXRlc3QtY2FzZScsXHJcbiAgICAgICd0ZXN0LWNhc2VzL3VwZGF0ZS10ZXN0LWNhc2UnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEZpbGUgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0RmlsZXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LWZpbGVzJyxcclxuICAgICAgJ2ZpbGUvZ2V0LWZpbGVzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGxvYWRGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndXBsb2FkLWZpbGUnLFxyXG4gICAgICAnZmlsZS91cGxvYWQnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IHF1ZXJ5QW5hbHlzaXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAncXVlcnktYW5hbHlzaXMnLFxyXG4gICAgICAnYW5hbHlzaXMvcXVlcnktcmVzdWx0cydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0VXNlclN0YXRzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC11c2VyLXN0YXRzJyxcclxuICAgICAgJ2FuYWx5c2lzL2dldC11c2VyLXN0YXRzJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBFeGVjdXRpb25zIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IHRyaWdnZXJFeGVjdXRpb25GdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndHJpZ2dlci1leGVjdXRpb24nLFxyXG4gICAgICAnZXhlY3V0aW9ucy90cmlnZ2VyJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25TdGF0dXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LWV4ZWN1dGlvbi1zdGF0dXMnLFxyXG4gICAgICAnZXhlY3V0aW9ucy9nZXQtc3RhdHVzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1leGVjdXRpb24tcmVzdWx0cycsXHJcbiAgICAgICdleGVjdXRpb25zL2dldC1yZXN1bHRzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1leGVjdXRpb24taGlzdG9yeScsXHJcbiAgICAgICdleGVjdXRpb25zL2dldC1oaXN0b3J5J1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRTdWl0ZUV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXN1aXRlLWV4ZWN1dGlvbi1yZXN1bHRzJyxcclxuICAgICAgJ2V4ZWN1dGlvbnMvZ2V0LXN1aXRlLXJlc3VsdHMnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEluc2lnaHRzIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdlbmVyYXRlSW5zaWdodHNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2VuZXJhdGUtaW5zaWdodHMnLFxyXG4gICAgICAnYWkvZ2VuZXJhdGUtaW5zaWdodHMnXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEF1dGggQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgbG9naW5GdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnbG9naW4nLFxyXG4gICAgICAnYXV0aC9sb2dpbidcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAncmVnaXN0ZXInLFxyXG4gICAgICAnYXV0aC9yZWdpc3RlcidcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgcmVmcmVzaEZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdyZWZyZXNoJyxcclxuICAgICAgJ2F1dGgvcmVmcmVzaCdcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0UHJvZmlsZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtcHJvZmlsZScsXHJcbiAgICAgICdhdXRoL2dldC1wcm9maWxlJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBOb3RpZmljYXRpb24gQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0UHJlZmVyZW5jZXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXByZWZlcmVuY2VzJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvZ2V0LXByZWZlcmVuY2VzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVQcmVmZXJlbmNlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtcHJlZmVyZW5jZXMnLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy91cGRhdGUtcHJlZmVyZW5jZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldEhpc3RvcnlGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LWhpc3RvcnknLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy9nZXQtaGlzdG9yeSdcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1ub3RpZmljYXRpb24nLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy9nZXQtbm90aWZpY2F0aW9uJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRUZW1wbGF0ZXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXRlbXBsYXRlcycsXHJcbiAgICAgICdub3RpZmljYXRpb25zL2dldC10ZW1wbGF0ZXMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2NyZWF0ZS10ZW1wbGF0ZScsXHJcbiAgICAgICdub3RpZmljYXRpb25zL2NyZWF0ZS10ZW1wbGF0ZSdcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVtcGxhdGVGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndXBkYXRlLXRlbXBsYXRlJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvdXBkYXRlLXRlbXBsYXRlJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBGaWxlIFN0b3JhZ2UgQnVja2V0IChtdXN0IGJlIGRlZmluZWQgYmVmb3JlIExhbWJkYSBmdW5jdGlvbnMgdGhhdCB1c2UgaXQpXHJcbiAgICBjb25zdCBmaWxlU3RvcmFnZUJ1Y2tldCA9IG5ldyBGaWxlU3RvcmFnZUJ1Y2tldCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXQnLCB7XHJcbiAgICAgIGVudmlyb25tZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyBMYW1iZGEgRnVuY3Rpb24gKGZvciBTMyBldmVudCBub3RpZmljYXRpb25zKVxyXG4gICAgY29uc3QgYW5hbHl6ZUZpbGVGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnYW5hbHl6ZS1maWxlJyxcclxuICAgICAgJ2FuYWx5c2lzL2FuYWx5emUtZmlsZScsXHJcbiAgICAgIHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEVOVklST05NRU5UOiBlbnZpcm9ubWVudFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdyYW50IFMzIHBlcm1pc3Npb24gdG8gaW52b2tlIExhbWJkYVxyXG4gICAgYW5hbHl6ZUZpbGVGdW5jdGlvbi5hZGRQZXJtaXNzaW9uKCdTM0ludm9rZVBlcm1pc3Npb24nLCB7XHJcbiAgICAgIGFjdGlvbjogJ2xhbWJkYTpJbnZva2VGdW5jdGlvbicsXHJcbiAgICAgIHByaW5jaXBhbDogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdzMy5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIHNvdXJjZUFybjogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0LmJ1Y2tldEFyblxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgTGFtYmRhIHBlcm1pc3Npb24gdG8gcmVhZCBmcm9tIFMzXHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5ncmFudFJlYWQoYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQWRkIFMzIGV2ZW50IG5vdGlmaWNhdGlvbiB0byB0cmlnZ2VyIExhbWJkYSBvbiBmaWxlIHVwbG9hZFxyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuYWRkVXBsb2FkTm90aWZpY2F0aW9uKGFuYWx5emVGaWxlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBQcm9qZWN0c1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2plY3RzSW50ZWdyYXRpb24nLCBnZXRQcm9qZWN0c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9wcm9qZWN0cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlUHJvamVjdEludGVncmF0aW9uJywgY3JlYXRlUHJvamVjdEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9wcm9qZWN0cy97cHJvamVjdElkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVQcm9qZWN0SW50ZWdyYXRpb24nLCB1cGRhdGVQcm9qZWN0RnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIFRlc3QgU3VpdGVzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdFN1aXRlc0ludGVncmF0aW9uJywgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LXN1aXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVzdFN1aXRlSW50ZWdyYXRpb24nLCBjcmVhdGVUZXN0U3VpdGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMve3N1aXRlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RTdWl0ZUludGVncmF0aW9uJywgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIFRlc3QgQ2FzZXNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFRlc3RDYXNlc0ludGVncmF0aW9uJywgZ2V0VGVzdENhc2VzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVRlc3RDYXNlSW50ZWdyYXRpb24nLCBjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzL3t0ZXN0Q2FzZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVUZXN0Q2FzZUludGVncmF0aW9uJywgdXBkYXRlVGVzdENhc2VGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gRmlsZXNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRGaWxlc0ludGVncmF0aW9uJywgZ2V0RmlsZXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGxvYWRGaWxlSW50ZWdyYXRpb24nLCB1cGxvYWRGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gQW5hbHlzaXNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9xdWVyeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUXVlcnlBbmFseXNpc0ludGVncmF0aW9uJywgcXVlcnlBbmFseXNpc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9zdGF0cy97dXNlcklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRVc2VyU3RhdHNJbnRlZ3JhdGlvbicsIGdldFVzZXJTdGF0c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBFeGVjdXRpb25zXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy90cmlnZ2VyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdUcmlnZ2VyRXhlY3V0aW9uSW50ZWdyYXRpb24nLCB0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMve2V4ZWN1dGlvbklkfS9zdGF0dXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RXhlY3V0aW9uU3RhdHVzSW50ZWdyYXRpb24nLCBnZXRFeGVjdXRpb25TdGF0dXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy97ZXhlY3V0aW9uSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvblJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy9oaXN0b3J5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvbkhpc3RvcnlJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy9zdWl0ZXMve3N1aXRlRXhlY3V0aW9uSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFN1aXRlRXhlY3V0aW9uUmVzdWx0c0ludGVncmF0aW9uJywgZ2V0U3VpdGVFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIEluc2lnaHRzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYWkvaW5zaWdodHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dlbmVyYXRlSW5zaWdodHNJbnRlZ3JhdGlvbicsIGdlbmVyYXRlSW5zaWdodHNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gQXV0aFxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvbG9naW4nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0xvZ2luSW50ZWdyYXRpb24nLCBsb2dpbkZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZ2lzdGVyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdSZWdpc3RlckludGVncmF0aW9uJywgcmVnaXN0ZXJGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9yZWZyZXNoJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdSZWZyZXNoSW50ZWdyYXRpb24nLCByZWZyZXNoRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvcHJvZmlsZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQcm9maWxlSW50ZWdyYXRpb24nLCBnZXRQcm9maWxlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIE5vdGlmaWNhdGlvbnNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3ByZWZlcmVuY2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByZWZlcmVuY2VzSW50ZWdyYXRpb24nLCBnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3ByZWZlcmVuY2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVByZWZlcmVuY2VzSW50ZWdyYXRpb24nLCB1cGRhdGVQcmVmZXJlbmNlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL2hpc3RvcnknLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0SGlzdG9yeUludGVncmF0aW9uJywgZ2V0SGlzdG9yeUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3tub3RpZmljYXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0Tm90aWZpY2F0aW9uSW50ZWdyYXRpb24nLCBnZXROb3RpZmljYXRpb25GdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy90ZW1wbGF0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVtcGxhdGVzSW50ZWdyYXRpb24nLCBnZXRUZW1wbGF0ZXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy90ZW1wbGF0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVRlbXBsYXRlSW50ZWdyYXRpb24nLCBjcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcy97dGVtcGxhdGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIHVwZGF0ZVRlbXBsYXRlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IHRoZSBBUEkgZW5kcG9pbnRcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlFbmRwb2ludCcsIHtcclxuICAgICAgdmFsdWU6IGh0dHBBcGkudXJsIHx8ICdOL0EnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIEFQSSBFbmRwb2ludCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdNaXNyYVBsYXRmb3JtQXBpRW5kcG9pbnQnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==