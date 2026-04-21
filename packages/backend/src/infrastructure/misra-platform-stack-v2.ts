import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';
import { FileStorageBucket } from './file-storage-bucket';

/**
 * Simplified CDK Stack using pre-bundled Lambda functions
 * This avoids the massive src directory packaging issue
 */
export class MisraPlatformStackV2 extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
    const createLambdaFunction = (
      functionName: string,
      handler: string,
      environment: Record<string, string> = {}
    ): lambda.Function => {
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
    const getProjectsFunction = createLambdaFunction(
      'get-projects',
      'projects/get-projects-simple'
    );

    const createProjectFunction = createLambdaFunction(
      'create-project',
      'projects/create-project-simple'
    );

    const updateProjectFunction = createLambdaFunction(
      'update-project',
      'projects/update-project'
    );

    // Test Suites API Functions
    const getTestSuitesFunction = createLambdaFunction(
      'get-test-suites',
      'test-suites/get-suites'
    );

    const createTestSuiteFunction = createLambdaFunction(
      'create-test-suite',
      'test-suites/create-suite'
    );

    const updateTestSuiteFunction = createLambdaFunction(
      'update-test-suite',
      'test-suites/update-suite'
    );

    // Test Cases API Functions
    const getTestCasesFunction = createLambdaFunction(
      'get-test-cases',
      'test-cases/get-test-cases'
    );

    const createTestCaseFunction = createLambdaFunction(
      'create-test-case',
      'test-cases/create-test-case'
    );

    const updateTestCaseFunction = createLambdaFunction(
      'update-test-case',
      'test-cases/update-test-case'
    );

    // File API Functions
    const getFilesFunction = createLambdaFunction(
      'get-files',
      'file/get-files'
    );

    const uploadFunction = createLambdaFunction(
      'upload-file',
      'file/upload'
    );

    // Analysis API Functions
    const queryAnalysisFunction = createLambdaFunction(
      'query-analysis',
      'analysis/query-results'
    );

    const getUserStatsFunction = createLambdaFunction(
      'get-user-stats',
      'analysis/get-user-stats'
    );

    // Executions API Functions
    const triggerExecutionFunction = createLambdaFunction(
      'trigger-execution',
      'executions/trigger'
    );

    const getExecutionStatusFunction = createLambdaFunction(
      'get-execution-status',
      'executions/get-status'
    );

    const getExecutionResultsFunction = createLambdaFunction(
      'get-execution-results',
      'executions/get-results'
    );

    const getExecutionHistoryFunction = createLambdaFunction(
      'get-execution-history',
      'executions/get-history'
    );

    const getSuiteExecutionResultsFunction = createLambdaFunction(
      'get-suite-execution-results',
      'executions/get-suite-results'
    );

    // Insights API Functions
    const generateInsightsFunction = createLambdaFunction(
      'generate-insights',
      'ai/generate-insights'
    );

    // Auth API Functions
    const loginFunction = createLambdaFunction(
      'login',
      'auth/login'
    );

    const registerFunction = createLambdaFunction(
      'register',
      'auth/register'
    );

    const refreshFunction = createLambdaFunction(
      'refresh',
      'auth/refresh'
    );

    const getProfileFunction = createLambdaFunction(
      'get-profile',
      'auth/get-profile'
    );

    // Notification API Functions
    const getPreferencesFunction = createLambdaFunction(
      'get-preferences',
      'notifications/get-preferences'
    );

    const updatePreferencesFunction = createLambdaFunction(
      'update-preferences',
      'notifications/update-preferences'
    );

    const getHistoryFunction = createLambdaFunction(
      'get-history',
      'notifications/get-history'
    );

    const getNotificationFunction = createLambdaFunction(
      'get-notification',
      'notifications/get-notification'
    );

    const getTemplatesFunction = createLambdaFunction(
      'get-templates',
      'notifications/get-templates'
    );

    const createTemplateFunction = createLambdaFunction(
      'create-template',
      'notifications/create-template'
    );

    const updateTemplateFunction = createLambdaFunction(
      'update-template',
      'notifications/update-template'
    );

    // Create KMS key for encryption
    const kmsKey = new cdk.aws_kms.Key(this, 'FileStorageKey', {
      description: 'KMS key for MISRA Platform file storage encryption',
      enableKeyRotation: true,
      removalPolicy: environment === 'production' 
        ? cdk.RemovalPolicy.RETAIN 
        : cdk.RemovalPolicy.DESTROY,
    });

    // File Storage Bucket (must be defined before Lambda functions that use it)
    const fileStorageBucket = new FileStorageBucket(this, 'FileStorageBucket', {
      environment,
      accountId: this.account,
      kmsKey
    });

    // Analysis Lambda Function (for S3 event notifications)
    const analyzeFileFunction = createLambdaFunction(
      'analyze-file',
      'analysis/analyze-file',
      {
        FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucket.bucketName,
        ENVIRONMENT: environment
      }
    );

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
