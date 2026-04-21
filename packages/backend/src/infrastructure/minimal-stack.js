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
exports.MinimalStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const authorizers = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const path = __importStar(require("path"));
const cognito_auth_1 = require("./cognito-auth");
/**
 * AI Test Generation Stack
 *
 * Complete AI test generation infrastructure deployed as a separate stack
 * to avoid CDK issues in the main MisraPlatformStack.
 */
class MinimalStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create Cognito User Pool for authentication
        const cognitoAuth = new cognito_auth_1.CognitoAuth(this, 'CognitoAuth', {
            namePrefix: 'aibts',
            emailVerification: true,
            selfSignUpEnabled: true,
            passwordMinLength: 8,
        });
        // Reference OpenAI API Key secret (create manually or via AWS Console)
        // To create: aws secretsmanager create-secret --name aibts/openai-api-key --secret-string "sk-YOUR-KEY"
        const openAiSecret = secretsmanager.Secret.fromSecretNameV2(this, 'OpenAISecret', 'aibts/openai-api-key');
        // Create the AI Usage Table
        const aiUsageTable = new dynamodb.Table(this, 'AIUsageTable', {
            tableName: 'aibts-ai-usage',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for project-based queries
        aiUsageTable.addGlobalSecondaryIndex({
            indexName: 'projectId-timestamp-index',
            partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
        });
        // Add GSI for operation type queries
        aiUsageTable.addGlobalSecondaryIndex({
            indexName: 'operationType-timestamp-index',
            partitionKey: { name: 'operationType', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
        });
        // Reference existing test cases table from main stack
        const testCasesTable = dynamodb.Table.fromTableName(this, 'TestCasesTable', 'TestCases');
        // Use public Chromium Lambda Layer (alternative to building our own)
        // This is a well-maintained public layer for @sparticuz/chromium
        // ARN format: arn:aws:lambda:{region}:764866452798:layer:chrome-aws-lambda:latest
        // For production, pin to a specific version instead of 'latest'
        const chromiumLayerArn = `arn:aws:lambda:${cdk.Stack.of(this).region}:764866452798:layer:chrome-aws-lambda:45`;
        const chromiumLayer = lambda.LayerVersion.fromLayerVersionArn(this, 'ChromiumLayer', chromiumLayerArn);
        // Lambda Functions with automatic dependency bundling
        const aiAnalyzeFunction = new lambdaNodejs.NodejsFunction(this, 'AIAnalyzeFunction', {
            functionName: 'aibts-ai-analyze',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/ai-test-generation/analyze.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(5),
            memorySize: 2048,
            layers: [chromiumLayer],
            bundling: {
                minify: false, // Disable minification to preserve package.json references
                sourceMap: false,
                externalModules: [
                    '@aws-sdk/*',
                    '@sparticuz/chromium', // Provided by layer
                ],
                nodeModules: ['playwright-core'], // Force include playwright-core with its package.json
            },
            environment: {
                AI_USAGE_TABLE: aiUsageTable.tableName,
                OPENAI_SECRET_NAME: 'aibts/openai-api-key',
                HUGGINGFACE_SECRET_NAME: 'aibts/huggingface-api-key',
                USE_HUGGINGFACE: process.env.USE_HUGGINGFACE || 'true', // Default to Hugging Face
            },
        });
        const aiGenerateFunction = new lambdaNodejs.NodejsFunction(this, 'AIGenerateFunction', {
            functionName: 'aibts-ai-generate',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/ai-test-generation/generate.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(2),
            memorySize: 1024,
            layers: [chromiumLayer],
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: [
                    '@aws-sdk/*',
                    '@sparticuz/chromium', // Provided by layer
                ],
                // playwright-core will be bundled with the function
            },
            environment: {
                AI_USAGE_TABLE: aiUsageTable.tableName,
                TEST_CASES_TABLE_NAME: testCasesTable.tableName,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'MOCK',
                OPENAI_SECRET_NAME: 'aibts/openai-api-key',
                HUGGINGFACE_SECRET_NAME: 'aibts/huggingface-api-key',
                USE_HUGGINGFACE: process.env.USE_HUGGINGFACE || 'true',
            },
        });
        const aiBatchFunction = new lambdaNodejs.NodejsFunction(this, 'AIBatchFunction', {
            functionName: 'aibts-ai-batch',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/ai-test-generation/batch.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(15),
            memorySize: 2048,
            layers: [chromiumLayer],
            bundling: {
                minify: false, // Disable minification to preserve package.json references
                sourceMap: false,
                externalModules: [
                    '@aws-sdk/*',
                    '@sparticuz/chromium', // Provided by layer
                ],
                nodeModules: ['playwright-core'], // Force include playwright-core with its package.json
            },
            environment: {
                AI_USAGE_TABLE: aiUsageTable.tableName,
                TEST_CASES_TABLE_NAME: testCasesTable.tableName,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'MOCK',
                OPENAI_SECRET_NAME: 'aibts/openai-api-key',
                HUGGINGFACE_SECRET_NAME: 'aibts/huggingface-api-key',
                USE_HUGGINGFACE: process.env.USE_HUGGINGFACE || 'true',
            },
        });
        const getUsageFunction = new lambdaNodejs.NodejsFunction(this, 'GetUsageFunction', {
            functionName: 'aibts-ai-usage',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/ai-test-generation/get-usage.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                AI_USAGE_TABLE: aiUsageTable.tableName,
            },
        });
        // Grant permissions
        aiUsageTable.grantReadWriteData(aiAnalyzeFunction);
        aiUsageTable.grantReadWriteData(aiGenerateFunction);
        aiUsageTable.grantReadWriteData(aiBatchFunction);
        aiUsageTable.grantReadData(getUsageFunction);
        testCasesTable.grantReadWriteData(aiGenerateFunction);
        testCasesTable.grantReadWriteData(aiBatchFunction);
        // Grant Secrets Manager read access for OpenAI API key
        openAiSecret.grantRead(aiAnalyzeFunction);
        openAiSecret.grantRead(aiGenerateFunction);
        openAiSecret.grantRead(aiBatchFunction);
        // Create API Gateway
        const api = new apigateway.HttpApi(this, 'AITestGenerationAPI', {
            apiName: 'ai-test-generation-api',
            description: 'AI Test Generation API',
            corsPreflight: {
                allowOrigins: [
                    'http://localhost:3000',
                    'https://aibts-platform.vercel.app',
                    'https://aibts-platform-75bzvkak8-sanjana-rs-projects-0d00e0ae.vercel.app',
                ],
                allowMethods: [
                    apigateway.CorsHttpMethod.GET,
                    apigateway.CorsHttpMethod.POST,
                    apigateway.CorsHttpMethod.PUT,
                    apigateway.CorsHttpMethod.DELETE,
                    apigateway.CorsHttpMethod.OPTIONS,
                ],
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Requested-With',
                    'Accept',
                ],
                allowCredentials: true,
                maxAge: cdk.Duration.days(1),
            },
        });
        // Create Cognito JWT Authorizer
        const cognitoAuthorizer = new authorizers.HttpUserPoolAuthorizer('CognitoAuthorizer', cognitoAuth.userPool, {
            userPoolClients: [cognitoAuth.userPoolClient],
            identitySource: ['$request.header.Authorization'],
        });
        // Add routes with Cognito authorization
        api.addRoutes({
            path: '/ai-test-generation/analyze',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIAnalyzeIntegration', aiAnalyzeFunction),
            authorizer: cognitoAuthorizer,
        });
        api.addRoutes({
            path: '/ai-test-generation/generate',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIGenerateIntegration', aiGenerateFunction),
            authorizer: cognitoAuthorizer,
        });
        api.addRoutes({
            path: '/ai-test-generation/batch',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIBatchIntegration', aiBatchFunction),
            authorizer: cognitoAuthorizer,
        });
        api.addRoutes({
            path: '/ai-test-generation/usage',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('AIGetUsageIntegration', getUsageFunction),
            authorizer: cognitoAuthorizer,
        });
        // Outputs
        new cdk.CfnOutput(this, 'AIUsageTableName', {
            value: aiUsageTable.tableName,
            description: 'AI Usage Table Name',
        });
        new cdk.CfnOutput(this, 'APIEndpoint', {
            value: api.url,
            description: 'AI Test Generation API Endpoint',
        });
        new cdk.CfnOutput(this, 'AnalyzeFunctionName', {
            value: aiAnalyzeFunction.functionName,
            description: 'AI Analyze Function Name',
        });
        new cdk.CfnOutput(this, 'GenerateFunctionName', {
            value: aiGenerateFunction.functionName,
            description: 'AI Generate Function Name',
        });
        new cdk.CfnOutput(this, 'BatchFunctionName', {
            value: aiBatchFunction.functionName,
            description: 'AI Batch Function Name',
        });
        new cdk.CfnOutput(this, 'GetUsageFunctionName', {
            value: getUsageFunction.functionName,
            description: 'Get Usage Function Name',
        });
    }
}
exports.MinimalStack = MinimalStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWluaW1hbC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1pbmltYWwtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCwrREFBaUQ7QUFDakQsNEVBQThEO0FBQzlELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUsc0ZBQXdFO0FBQ3hFLCtFQUFpRTtBQUVqRSwyQ0FBNkI7QUFDN0IsaURBQTZDO0FBRTdDOzs7OztHQUtHO0FBQ0gsTUFBYSxZQUFhLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDekMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qiw4Q0FBOEM7UUFDOUMsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDdkQsVUFBVSxFQUFFLE9BQU87WUFDbkIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGlCQUFpQixFQUFFLENBQUM7U0FDckIsQ0FBQyxDQUFDO1FBRUgsdUVBQXVFO1FBQ3ZFLHdHQUF3RztRQUN4RyxNQUFNLFlBQVksR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUN6RCxJQUFJLEVBQ0osY0FBYyxFQUNkLHNCQUFzQixDQUN2QixDQUFDO1FBRUYsNEJBQTRCO1FBQzVCLE1BQU0sWUFBWSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQzVELFNBQVMsRUFBRSxnQkFBZ0I7WUFDM0IsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsT0FBTyxF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c0IsRUFBRTtZQUM5QyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsWUFBWTtZQUNwQyxXQUFXLEVBQUUseUJBQXlCO1NBQ3ZDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlRRCxvQ0E4UUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCAqIGFzIGF1dGhvcml6ZXJzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgQ29nbml0b0F1dGggfSBmcm9tICcuL2NvZ25pdG8tYXV0aCc7XHJcblxyXG4vKipcclxuICogQUkgVGVzdCBHZW5lcmF0aW9uIFN0YWNrXHJcbiAqIFxyXG4gKiBDb21wbGV0ZSBBSSB0ZXN0IGdlbmVyYXRpb24gaW5mcmFzdHJ1Y3R1cmUgZGVwbG95ZWQgYXMgYSBzZXBhcmF0ZSBzdGFja1xyXG4gKiB0byBhdm9pZCBDREsgaXNzdWVzIGluIHRoZSBtYWluIE1pc3JhUGxhdGZvcm1TdGFjay5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBNaW5pbWFsU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDb2duaXRvIFVzZXIgUG9vbCBmb3IgYXV0aGVudGljYXRpb25cclxuICAgIGNvbnN0IGNvZ25pdG9BdXRoID0gbmV3IENvZ25pdG9BdXRoKHRoaXMsICdDb2duaXRvQXV0aCcsIHtcclxuICAgICAgbmFtZVByZWZpeDogJ2FpYnRzJyxcclxuICAgICAgZW1haWxWZXJpZmljYXRpb246IHRydWUsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBwYXNzd29yZE1pbkxlbmd0aDogOCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFJlZmVyZW5jZSBPcGVuQUkgQVBJIEtleSBzZWNyZXQgKGNyZWF0ZSBtYW51YWxseSBvciB2aWEgQVdTIENvbnNvbGUpXHJcbiAgICAvLyBUbyBjcmVhdGU6IGF3cyBzZWNyZXRzbWFuYWdlciBjcmVhdGUtc2VjcmV0IC0tbmFtZSBhaWJ0cy9vcGVuYWktYXBpLWtleSAtLXNlY3JldC1zdHJpbmcgXCJzay1ZT1VSLUtFWVwiXHJcbiAgICBjb25zdCBvcGVuQWlTZWNyZXQgPSBzZWNyZXRzbWFuYWdlci5TZWNyZXQuZnJvbVNlY3JldE5hbWVWMihcclxuICAgICAgdGhpcyxcclxuICAgICAgJ09wZW5BSVNlY3JldCcsXHJcbiAgICAgICdhaWJ0cy9vcGVuYWktYXBpLWtleSdcclxuICAgICk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBBSSBVc2FnZSBUYWJsZVxyXG4gICAgY29uc3QgYWlVc2FnZVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBSVVzYWdlVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ2FpYnRzLWFpLXVzYWdlJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBwcm9qZWN0LWJhc2VkIHF1ZXJpZXNcclxuICAgIGFpVXNhZ2VUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3Byb2plY3RJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Byb2plY3RJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBvcGVyYXRpb24gdHlwZSBxdWVyaWVzXHJcbiAgICBhaVVzYWdlVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdvcGVyYXRpb25UeXBlLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnb3BlcmF0aW9uVHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBSZWZlcmVuY2UgZXhpc3RpbmcgdGVzdCBjYXNlcyB0YWJsZSBmcm9tIG1haW4gc3RhY2tcclxuICAgIGNvbnN0IHRlc3RDYXNlc1RhYmxlID0gZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZShcclxuICAgICAgdGhpcyxcclxuICAgICAgJ1Rlc3RDYXNlc1RhYmxlJyxcclxuICAgICAgJ1Rlc3RDYXNlcydcclxuICAgICk7XHJcblxyXG4gICAgLy8gVXNlIHB1YmxpYyBDaHJvbWl1bSBMYW1iZGEgTGF5ZXIgKGFsdGVybmF0aXZlIHRvIGJ1aWxkaW5nIG91ciBvd24pXHJcbiAgICAvLyBUaGlzIGlzIGEgd2VsbC1tYWludGFpbmVkIHB1YmxpYyBsYXllciBmb3IgQHNwYXJ0aWN1ei9jaHJvbWl1bVxyXG4gICAgLy8gQVJOIGZvcm1hdDogYXJuOmF3czpsYW1iZGE6e3JlZ2lvbn06NzY0ODY2NDUyNzk4OmxheWVyOmNocm9tZS1hd3MtbGFtYmRhOmxhdGVzdFxyXG4gICAgLy8gRm9yIHByb2R1Y3Rpb24sIHBpbiB0byBhIHNwZWNpZmljIHZlcnNpb24gaW5zdGVhZCBvZiAnbGF0ZXN0J1xyXG4gICAgY29uc3QgY2hyb21pdW1MYXllckFybiA9IGBhcm46YXdzOmxhbWJkYToke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259Ojc2NDg2NjQ1Mjc5ODpsYXllcjpjaHJvbWUtYXdzLWxhbWJkYTo0NWA7XHJcbiAgICBjb25zdCBjaHJvbWl1bUxheWVyID0gbGFtYmRhLkxheWVyVmVyc2lvbi5mcm9tTGF5ZXJWZXJzaW9uQXJuKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICAnQ2hyb21pdW1MYXllcicsXHJcbiAgICAgIGNocm9taXVtTGF5ZXJBcm5cclxuICAgICk7XHJcblxyXG4gICAgLy8gTGFtYmRhIEZ1bmN0aW9ucyB3aXRoIGF1dG9tYXRpYyBkZXBlbmRlbmN5IGJ1bmRsaW5nXHJcbiAgICBjb25zdCBhaUFuYWx5emVGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0FJQW5hbHl6ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1haS1hbmFseXplJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2FpLXRlc3QtZ2VuZXJhdGlvbi9hbmFseXplLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsXHJcbiAgICAgIGxheWVyczogW2Nocm9taXVtTGF5ZXJdLFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogZmFsc2UsIC8vIERpc2FibGUgbWluaWZpY2F0aW9uIHRvIHByZXNlcnZlIHBhY2thZ2UuanNvbiByZWZlcmVuY2VzXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFtcclxuICAgICAgICAgICdAYXdzLXNkay8qJyxcclxuICAgICAgICAgICdAc3BhcnRpY3V6L2Nocm9taXVtJywgLy8gUHJvdmlkZWQgYnkgbGF5ZXJcclxuICAgICAgICBdLFxyXG4gICAgICAgIG5vZGVNb2R1bGVzOiBbJ3BsYXl3cmlnaHQtY29yZSddLCAvLyBGb3JjZSBpbmNsdWRlIHBsYXl3cmlnaHQtY29yZSB3aXRoIGl0cyBwYWNrYWdlLmpzb25cclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBBSV9VU0FHRV9UQUJMRTogYWlVc2FnZVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBPUEVOQUlfU0VDUkVUX05BTUU6ICdhaWJ0cy9vcGVuYWktYXBpLWtleScsXHJcbiAgICAgICAgSFVHR0lOR0ZBQ0VfU0VDUkVUX05BTUU6ICdhaWJ0cy9odWdnaW5nZmFjZS1hcGkta2V5JyxcclxuICAgICAgICBVU0VfSFVHR0lOR0ZBQ0U6IHByb2Nlc3MuZW52LlVTRV9IVUdHSU5HRkFDRSB8fCAndHJ1ZScsIC8vIERlZmF1bHQgdG8gSHVnZ2luZyBGYWNlXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhaUdlbmVyYXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdBSUdlbmVyYXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWFpLWdlbmVyYXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZW5lcmF0ZS50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLFxyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxyXG4gICAgICBsYXllcnM6IFtjaHJvbWl1bUxheWVyXSxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFtcclxuICAgICAgICAgICdAYXdzLXNkay8qJyxcclxuICAgICAgICAgICdAc3BhcnRpY3V6L2Nocm9taXVtJywgLy8gUHJvdmlkZWQgYnkgbGF5ZXJcclxuICAgICAgICBdLFxyXG4gICAgICAgIC8vIHBsYXl3cmlnaHQtY29yZSB3aWxsIGJlIGJ1bmRsZWQgd2l0aCB0aGUgZnVuY3Rpb25cclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBBSV9VU0FHRV9UQUJMRTogYWlVc2FnZVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBPUEVOQUlfQVBJX0tFWTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVkgfHwgJ01PQ0snLFxyXG4gICAgICAgIE9QRU5BSV9TRUNSRVRfTkFNRTogJ2FpYnRzL29wZW5haS1hcGkta2V5JyxcclxuICAgICAgICBIVUdHSU5HRkFDRV9TRUNSRVRfTkFNRTogJ2FpYnRzL2h1Z2dpbmdmYWNlLWFwaS1rZXknLFxyXG4gICAgICAgIFVTRV9IVUdHSU5HRkFDRTogcHJvY2Vzcy5lbnYuVVNFX0hVR0dJTkdGQUNFIHx8ICd0cnVlJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFpQmF0Y2hGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0FJQmF0Y2hGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtYWktYmF0Y2gnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYWktdGVzdC1nZW5lcmF0aW9uL2JhdGNoLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAyMDQ4LFxyXG4gICAgICBsYXllcnM6IFtjaHJvbWl1bUxheWVyXSxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IGZhbHNlLCAvLyBEaXNhYmxlIG1pbmlmaWNhdGlvbiB0byBwcmVzZXJ2ZSBwYWNrYWdlLmpzb24gcmVmZXJlbmNlc1xyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbXHJcbiAgICAgICAgICAnQGF3cy1zZGsvKicsXHJcbiAgICAgICAgICAnQHNwYXJ0aWN1ei9jaHJvbWl1bScsIC8vIFByb3ZpZGVkIGJ5IGxheWVyXHJcbiAgICAgICAgXSxcclxuICAgICAgICBub2RlTW9kdWxlczogWydwbGF5d3JpZ2h0LWNvcmUnXSwgLy8gRm9yY2UgaW5jbHVkZSBwbGF5d3JpZ2h0LWNvcmUgd2l0aCBpdHMgcGFja2FnZS5qc29uXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICdNT0NLJyxcclxuICAgICAgICBPUEVOQUlfU0VDUkVUX05BTUU6ICdhaWJ0cy9vcGVuYWktYXBpLWtleScsXHJcbiAgICAgICAgSFVHR0lOR0ZBQ0VfU0VDUkVUX05BTUU6ICdhaWJ0cy9odWdnaW5nZmFjZS1hcGkta2V5JyxcclxuICAgICAgICBVU0VfSFVHR0lOR0ZBQ0U6IHByb2Nlc3MuZW52LlVTRV9IVUdHSU5HRkFDRSB8fCAndHJ1ZScsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRVc2FnZUZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnR2V0VXNhZ2VGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtYWktdXNhZ2UnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYWktdGVzdC1nZW5lcmF0aW9uL2dldC11c2FnZS50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xyXG4gICAgYWlVc2FnZVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhaUFuYWx5emVGdW5jdGlvbik7XHJcbiAgICBhaVVzYWdlVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpR2VuZXJhdGVGdW5jdGlvbik7XHJcbiAgICBhaVVzYWdlVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpQmF0Y2hGdW5jdGlvbik7XHJcbiAgICBhaVVzYWdlVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRVc2FnZUZ1bmN0aW9uKTtcclxuICAgIHRlc3RDYXNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhaUdlbmVyYXRlRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpQmF0Y2hGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEdyYW50IFNlY3JldHMgTWFuYWdlciByZWFkIGFjY2VzcyBmb3IgT3BlbkFJIEFQSSBrZXlcclxuICAgIG9wZW5BaVNlY3JldC5ncmFudFJlYWQoYWlBbmFseXplRnVuY3Rpb24pO1xyXG4gICAgb3BlbkFpU2VjcmV0LmdyYW50UmVhZChhaUdlbmVyYXRlRnVuY3Rpb24pO1xyXG4gICAgb3BlbkFpU2VjcmV0LmdyYW50UmVhZChhaUJhdGNoRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuSHR0cEFwaSh0aGlzLCAnQUlUZXN0R2VuZXJhdGlvbkFQSScsIHtcclxuICAgICAgYXBpTmFtZTogJ2FpLXRlc3QtZ2VuZXJhdGlvbi1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FJIFRlc3QgR2VuZXJhdGlvbiBBUEknLFxyXG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbXHJcbiAgICAgICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuICAgICAgICAgICdodHRwczovL2FpYnRzLXBsYXRmb3JtLnZlcmNlbC5hcHAnLFxyXG4gICAgICAgICAgJ2h0dHBzOi8vYWlidHMtcGxhdGZvcm0tNzVienZrYWs4LXNhbmphbmEtcnMtcHJvamVjdHMtMGQwMGUwYWUudmVyY2VsLmFwcCcsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuR0VULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QVVQsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCcsXHJcbiAgICAgICAgICAnQWNjZXB0JyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93Q3JlZGVudGlhbHM6IHRydWUsXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uZGF5cygxKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDb2duaXRvIEpXVCBBdXRob3JpemVyXHJcbiAgICBjb25zdCBjb2duaXRvQXV0aG9yaXplciA9IG5ldyBhdXRob3JpemVycy5IdHRwVXNlclBvb2xBdXRob3JpemVyKFxyXG4gICAgICAnQ29nbml0b0F1dGhvcml6ZXInLFxyXG4gICAgICBjb2duaXRvQXV0aC51c2VyUG9vbCxcclxuICAgICAge1xyXG4gICAgICAgIHVzZXJQb29sQ2xpZW50czogW2NvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50XSxcclxuICAgICAgICBpZGVudGl0eVNvdXJjZTogWyckcmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbiddLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFkZCByb3V0ZXMgd2l0aCBDb2duaXRvIGF1dGhvcml6YXRpb25cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9hbmFseXplJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUFuYWx5emVJbnRlZ3JhdGlvbicsIGFpQW5hbHl6ZUZ1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9haS10ZXN0LWdlbmVyYXRpb24vZ2VuZXJhdGUnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0FJR2VuZXJhdGVJbnRlZ3JhdGlvbicsIGFpR2VuZXJhdGVGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGNvZ25pdG9BdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYWktdGVzdC1nZW5lcmF0aW9uL2JhdGNoJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUJhdGNoSW50ZWdyYXRpb24nLCBhaUJhdGNoRnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiBjb2duaXRvQXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi91c2FnZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUdldFVzYWdlSW50ZWdyYXRpb24nLCBnZXRVc2FnZUZ1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogY29nbml0b0F1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQUlVc2FnZVRhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IGFpVXNhZ2VUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQUkgVXNhZ2UgVGFibGUgTmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQVBJRW5kcG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiBhcGkudXJsISxcclxuICAgICAgZGVzY3JpcHRpb246ICdBSSBUZXN0IEdlbmVyYXRpb24gQVBJIEVuZHBvaW50JyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbmFseXplRnVuY3Rpb25OYW1lJywge1xyXG4gICAgICB2YWx1ZTogYWlBbmFseXplRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FJIEFuYWx5emUgRnVuY3Rpb24gTmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnR2VuZXJhdGVGdW5jdGlvbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBhaUdlbmVyYXRlRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FJIEdlbmVyYXRlIEZ1bmN0aW9uIE5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JhdGNoRnVuY3Rpb25OYW1lJywge1xyXG4gICAgICB2YWx1ZTogYWlCYXRjaEZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdBSSBCYXRjaCBGdW5jdGlvbiBOYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHZXRVc2FnZUZ1bmN0aW9uTmFtZScsIHtcclxuICAgICAgdmFsdWU6IGdldFVzYWdlRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0dldCBVc2FnZSBGdW5jdGlvbiBOYW1lJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=