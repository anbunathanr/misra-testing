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
        // Create KMS key for encryption
        const kmsKey = new cdk.aws_kms.Key(this, 'FileStorageKey', {
            description: 'KMS key for MISRA Platform file storage encryption',
            enableKeyRotation: true,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // File Storage Bucket (must be defined before Lambda functions that use it)
        const fileStorageBucket = new file_storage_bucket_1.FileStorageBucket(this, 'FileStorageBucket', {
            environment,
            accountId: this.account,
            kmsKey
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2stdjIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay12Mi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsK0RBQWlEO0FBQ2pELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUseURBQTJDO0FBRTNDLDJDQUE2QjtBQUM3QiwrREFBMEQ7QUFFMUQ7OztHQUdHO0FBQ0gsTUFBYSxvQkFBcUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNqRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztRQUVyRCxtQkFBbUI7UUFDbkIsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUU7WUFDdEQsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixXQUFXLEVBQUUsb0JBQW9CO1lBQ2pDLGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO2dCQUMvQyxZQUFZLEVBQUU7b0JBQ1osVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUM3QixVQUFVLENBQUMsY0FBYyxDQUFDLElBQUk7b0JBQzlCLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRztvQkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxNQUFNO29CQUNoQyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU87aUJBQ2xDO2dCQUNELFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDbkIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVB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RUgsMEJBQTBCO1FBQzFCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxJQUFJLEtBQUs7WUFDM0IsV0FBVyxFQUFFLDZCQUE2QjtZQUMxQyxVQUFVLEVBQUUsMEJBQTBCO1NBQ3ZDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXJiRCxvREFxYkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IEZpbGVTdG9yYWdlQnVja2V0IH0gZnJvbSAnLi9maWxlLXN0b3JhZ2UtYnVja2V0JztcclxuXHJcbi8qKlxyXG4gKiBTaW1wbGlmaWVkIENESyBTdGFjayB1c2luZyBwcmUtYnVuZGxlZCBMYW1iZGEgZnVuY3Rpb25zXHJcbiAqIFRoaXMgYXZvaWRzIHRoZSBtYXNzaXZlIHNyYyBkaXJlY3RvcnkgcGFja2FnaW5nIGlzc3VlXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgTWlzcmFQbGF0Zm9ybVN0YWNrVjIgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gcHJvY2Vzcy5lbnYuRU5WSVJPTk1FTlQgfHwgJ2Rldic7XHJcblxyXG4gICAgLy8gSFRUUCBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgaHR0cEFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgJ0h0dHBBcGknLCB7XHJcbiAgICAgIGFwaU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIEFQSScsXHJcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuR0VULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QVVQsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSGVscGVyIGZ1bmN0aW9uIHRvIGNyZWF0ZSBMYW1iZGEgZnVuY3Rpb25zIGZyb20gYnVuZGxlZCBjb2RlXHJcbiAgICBjb25zdCBjcmVhdGVMYW1iZGFGdW5jdGlvbiA9IChcclxuICAgICAgZnVuY3Rpb25OYW1lOiBzdHJpbmcsXHJcbiAgICAgIGhhbmRsZXI6IHN0cmluZyxcclxuICAgICAgZW52aXJvbm1lbnQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fVxyXG4gICAgKTogbGFtYmRhLkZ1bmN0aW9uID0+IHtcclxuICAgICAgY29uc3QgemlwUGF0aCA9IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi8uLi9kaXN0LXppcHMnLCBoYW5kbGVyLCAnaW5kZXguemlwJyk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCBmdW5jdGlvbk5hbWUsIHtcclxuICAgICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS0ke2Z1bmN0aW9uTmFtZX1gLFxyXG4gICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoemlwUGF0aCksXHJcbiAgICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFByb2plY3RzIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFByb2plY3RzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1wcm9qZWN0cycsXHJcbiAgICAgICdwcm9qZWN0cy9nZXQtcHJvamVjdHMtc2ltcGxlJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVQcm9qZWN0RnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2NyZWF0ZS1wcm9qZWN0JyxcclxuICAgICAgJ3Byb2plY3RzL2NyZWF0ZS1wcm9qZWN0LXNpbXBsZSdcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlUHJvamVjdEZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICd1cGRhdGUtcHJvamVjdCcsXHJcbiAgICAgICdwcm9qZWN0cy91cGRhdGUtcHJvamVjdCdcclxuICAgICk7XHJcblxyXG4gICAgLy8gVGVzdCBTdWl0ZXMgQVBJIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtdGVzdC1zdWl0ZXMnLFxyXG4gICAgICAndGVzdC1zdWl0ZXMvZ2V0LXN1aXRlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVGVzdFN1aXRlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2NyZWF0ZS10ZXN0LXN1aXRlJyxcclxuICAgICAgJ3Rlc3Qtc3VpdGVzL2NyZWF0ZS1zdWl0ZSdcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3VwZGF0ZS10ZXN0LXN1aXRlJyxcclxuICAgICAgJ3Rlc3Qtc3VpdGVzL3VwZGF0ZS1zdWl0ZSdcclxuICAgICk7XHJcblxyXG4gICAgLy8gVGVzdCBDYXNlcyBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRUZXN0Q2FzZXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXRlc3QtY2FzZXMnLFxyXG4gICAgICAndGVzdC1jYXNlcy9nZXQtdGVzdC1jYXNlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgY3JlYXRlVGVzdENhc2VGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnY3JlYXRlLXRlc3QtY2FzZScsXHJcbiAgICAgICd0ZXN0LWNhc2VzL2NyZWF0ZS10ZXN0LWNhc2UnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVRlc3RDYXNlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3VwZGF0ZS10ZXN0LWNhc2UnLFxyXG4gICAgICAndGVzdC1jYXNlcy91cGRhdGUtdGVzdC1jYXNlJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBGaWxlIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldEZpbGVzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1maWxlcycsXHJcbiAgICAgICdmaWxlL2dldC1maWxlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgdXBsb2FkRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3VwbG9hZC1maWxlJyxcclxuICAgICAgJ2ZpbGUvdXBsb2FkJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBxdWVyeUFuYWx5c2lzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3F1ZXJ5LWFuYWx5c2lzJyxcclxuICAgICAgJ2FuYWx5c2lzL3F1ZXJ5LXJlc3VsdHMnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldFVzZXJTdGF0c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtdXNlci1zdGF0cycsXHJcbiAgICAgICdhbmFseXNpcy9nZXQtdXNlci1zdGF0cydcclxuICAgICk7XHJcblxyXG4gICAgLy8gRXhlY3V0aW9ucyBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCB0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3RyaWdnZXItZXhlY3V0aW9uJyxcclxuICAgICAgJ2V4ZWN1dGlvbnMvdHJpZ2dlcidcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1leGVjdXRpb24tc3RhdHVzJyxcclxuICAgICAgJ2V4ZWN1dGlvbnMvZ2V0LXN0YXR1cydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0RXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtZXhlY3V0aW9uLXJlc3VsdHMnLFxyXG4gICAgICAnZXhlY3V0aW9ucy9nZXQtcmVzdWx0cydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0RXhlY3V0aW9uSGlzdG9yeUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtZXhlY3V0aW9uLWhpc3RvcnknLFxyXG4gICAgICAnZXhlY3V0aW9ucy9nZXQtaGlzdG9yeSdcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0U3VpdGVFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1zdWl0ZS1leGVjdXRpb24tcmVzdWx0cycsXHJcbiAgICAgICdleGVjdXRpb25zL2dldC1zdWl0ZS1yZXN1bHRzJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBJbnNpZ2h0cyBBUEkgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZW5lcmF0ZUluc2lnaHRzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dlbmVyYXRlLWluc2lnaHRzJyxcclxuICAgICAgJ2FpL2dlbmVyYXRlLWluc2lnaHRzJ1xyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBdXRoIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGxvZ2luRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2xvZ2luJyxcclxuICAgICAgJ2F1dGgvbG9naW4nXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHJlZ2lzdGVyRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3JlZ2lzdGVyJyxcclxuICAgICAgJ2F1dGgvcmVnaXN0ZXInXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAncmVmcmVzaCcsXHJcbiAgICAgICdhdXRoL3JlZnJlc2gnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldFByb2ZpbGVGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAnZ2V0LXByb2ZpbGUnLFxyXG4gICAgICAnYXV0aC9nZXQtcHJvZmlsZSdcclxuICAgICk7XHJcblxyXG4gICAgLy8gTm90aWZpY2F0aW9uIEFQSSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFByZWZlcmVuY2VzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1wcmVmZXJlbmNlcycsXHJcbiAgICAgICdub3RpZmljYXRpb25zL2dldC1wcmVmZXJlbmNlcydcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbiA9IGNyZWF0ZUxhbWJkYUZ1bmN0aW9uKFxyXG4gICAgICAndXBkYXRlLXByZWZlcmVuY2VzJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvdXBkYXRlLXByZWZlcmVuY2VzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBnZXRIaXN0b3J5RnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC1oaXN0b3J5JyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvZ2V0LWhpc3RvcnknXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdnZXQtbm90aWZpY2F0aW9uJyxcclxuICAgICAgJ25vdGlmaWNhdGlvbnMvZ2V0LW5vdGlmaWNhdGlvbidcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZ2V0VGVtcGxhdGVzRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2dldC10ZW1wbGF0ZXMnLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy9nZXQtdGVtcGxhdGVzJ1xyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uID0gY3JlYXRlTGFtYmRhRnVuY3Rpb24oXHJcbiAgICAgICdjcmVhdGUtdGVtcGxhdGUnLFxyXG4gICAgICAnbm90aWZpY2F0aW9ucy9jcmVhdGUtdGVtcGxhdGUnXHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVRlbXBsYXRlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ3VwZGF0ZS10ZW1wbGF0ZScsXHJcbiAgICAgICdub3RpZmljYXRpb25zL3VwZGF0ZS10ZW1wbGF0ZSdcclxuICAgICk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEtNUyBrZXkgZm9yIGVuY3J5cHRpb25cclxuICAgIGNvbnN0IGttc0tleSA9IG5ldyBjZGsuYXdzX2ttcy5LZXkodGhpcywgJ0ZpbGVTdG9yYWdlS2V5Jywge1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ0tNUyBrZXkgZm9yIE1JU1JBIFBsYXRmb3JtIGZpbGUgc3RvcmFnZSBlbmNyeXB0aW9uJyxcclxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZSBTdG9yYWdlIEJ1Y2tldCAobXVzdCBiZSBkZWZpbmVkIGJlZm9yZSBMYW1iZGEgZnVuY3Rpb25zIHRoYXQgdXNlIGl0KVxyXG4gICAgY29uc3QgZmlsZVN0b3JhZ2VCdWNrZXQgPSBuZXcgRmlsZVN0b3JhZ2VCdWNrZXQodGhpcywgJ0ZpbGVTdG9yYWdlQnVja2V0Jywge1xyXG4gICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgYWNjb3VudElkOiB0aGlzLmFjY291bnQsXHJcbiAgICAgIGttc0tleVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgTGFtYmRhIEZ1bmN0aW9uIChmb3IgUzMgZXZlbnQgbm90aWZpY2F0aW9ucylcclxuICAgIGNvbnN0IGFuYWx5emVGaWxlRnVuY3Rpb24gPSBjcmVhdGVMYW1iZGFGdW5jdGlvbihcclxuICAgICAgJ2FuYWx5emUtZmlsZScsXHJcbiAgICAgICdhbmFseXNpcy9hbmFseXplLWZpbGUnLFxyXG4gICAgICB7XHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBFTlZJUk9OTUVOVDogZW52aXJvbm1lbnRcclxuICAgICAgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBHcmFudCBTMyBwZXJtaXNzaW9uIHRvIGludm9rZSBMYW1iZGFcclxuICAgIGFuYWx5emVGaWxlRnVuY3Rpb24uYWRkUGVybWlzc2lvbignUzNJbnZva2VQZXJtaXNzaW9uJywge1xyXG4gICAgICBhY3Rpb246ICdsYW1iZGE6SW52b2tlRnVuY3Rpb24nLFxyXG4gICAgICBwcmluY2lwYWw6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnczMuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBzb3VyY2VBcm46IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldC5idWNrZXRBcm5cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IExhbWJkYSBwZXJtaXNzaW9uIHRvIHJlYWQgZnJvbSBTM1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkKGFuYWx5emVGaWxlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFkZCBTMyBldmVudCBub3RpZmljYXRpb24gdG8gdHJpZ2dlciBMYW1iZGEgb24gZmlsZSB1cGxvYWRcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmFkZFVwbG9hZE5vdGlmaWNhdGlvbihhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gUHJvamVjdHNcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9wcm9qZWN0cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQcm9qZWN0c0ludGVncmF0aW9uJywgZ2V0UHJvamVjdHNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVByb2plY3RJbnRlZ3JhdGlvbicsIGNyZWF0ZVByb2plY3RGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMve3Byb2plY3RJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlUHJvamVjdEludGVncmF0aW9uJywgdXBkYXRlUHJvamVjdEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBUZXN0IFN1aXRlc1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFRlc3RTdWl0ZXNJbnRlZ3JhdGlvbicsIGdldFRlc3RTdWl0ZXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVRlc3RTdWl0ZUludGVncmF0aW9uJywgY3JlYXRlVGVzdFN1aXRlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzL3tzdWl0ZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVUZXN0U3VpdGVJbnRlZ3JhdGlvbicsIHVwZGF0ZVRlc3RTdWl0ZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBUZXN0IENhc2VzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1jYXNlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRUZXN0Q2FzZXNJbnRlZ3JhdGlvbicsIGdldFRlc3RDYXNlc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0Q2FzZUludGVncmF0aW9uJywgY3JlYXRlVGVzdENhc2VGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1jYXNlcy97dGVzdENhc2VJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlVGVzdENhc2VJbnRlZ3JhdGlvbicsIHVwZGF0ZVRlc3RDYXNlRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIEZpbGVzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RmlsZXNJbnRlZ3JhdGlvbicsIGdldEZpbGVzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2ZpbGVzL3VwbG9hZCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBsb2FkRmlsZUludGVncmF0aW9uJywgdXBsb2FkRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIEFuYWx5c2lzXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYW5hbHlzaXMvcXVlcnknLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1F1ZXJ5QW5hbHlzaXNJbnRlZ3JhdGlvbicsIHF1ZXJ5QW5hbHlzaXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYW5hbHlzaXMvc3RhdHMve3VzZXJJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VXNlclN0YXRzSW50ZWdyYXRpb24nLCBnZXRVc2VyU3RhdHNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgUm91dGVzIC0gRXhlY3V0aW9uc1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvdHJpZ2dlcicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVHJpZ2dlckV4ZWN1dGlvbkludGVncmF0aW9uJywgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0vc3RhdHVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvblN0YXR1c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMve2V4ZWN1dGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRFeGVjdXRpb25SZXN1bHRzSW50ZWdyYXRpb24nLCBnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvaGlzdG9yeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRFeGVjdXRpb25IaXN0b3J5SW50ZWdyYXRpb24nLCBnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvc3VpdGVzL3tzdWl0ZUV4ZWN1dGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRTdWl0ZUV4ZWN1dGlvblJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldFN1aXRlRXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBJbnNpZ2h0c1xyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpL2luc2lnaHRzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZW5lcmF0ZUluc2lnaHRzSW50ZWdyYXRpb24nLCBnZW5lcmF0ZUluc2lnaHRzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIFJvdXRlcyAtIEF1dGhcclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL2xvZ2luJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdMb2dpbkludGVncmF0aW9uJywgbG9naW5GdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9yZWdpc3RlcicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVnaXN0ZXJJbnRlZ3JhdGlvbicsIHJlZ2lzdGVyRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvcmVmcmVzaCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVmcmVzaEludGVncmF0aW9uJywgcmVmcmVzaEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGh0dHBBcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3Byb2ZpbGUnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJvZmlsZUludGVncmF0aW9uJywgZ2V0UHJvZmlsZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFQSSBSb3V0ZXMgLSBOb3RpZmljYXRpb25zXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy9wcmVmZXJlbmNlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQcmVmZXJlbmNlc0ludGVncmF0aW9uJywgZ2V0UHJlZmVyZW5jZXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy9wcmVmZXJlbmNlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVQcmVmZXJlbmNlc0ludGVncmF0aW9uJywgdXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy9oaXN0b3J5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEhpc3RvcnlJbnRlZ3JhdGlvbicsIGdldEhpc3RvcnlGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy97bm90aWZpY2F0aW9uSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldE5vdGlmaWNhdGlvbkludGVncmF0aW9uJywgZ2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvdGVtcGxhdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFRlbXBsYXRlc0ludGVncmF0aW9uJywgZ2V0VGVtcGxhdGVzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaHR0cEFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvdGVtcGxhdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZW1wbGF0ZUludGVncmF0aW9uJywgY3JlYXRlVGVtcGxhdGVGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBodHRwQXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy90ZW1wbGF0ZXMve3RlbXBsYXRlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlbXBsYXRlSW50ZWdyYXRpb24nLCB1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCB0aGUgQVBJIGVuZHBvaW50XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpRW5kcG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiBodHRwQXBpLnVybCB8fCAnTi9BJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdNSVNSQSBQbGF0Zm9ybSBBUEkgRW5kcG9pbnQnLFxyXG4gICAgICBleHBvcnROYW1lOiAnTWlzcmFQbGF0Zm9ybUFwaUVuZHBvaW50JyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=