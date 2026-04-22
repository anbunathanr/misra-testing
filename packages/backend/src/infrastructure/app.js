#!/usr/bin/env node
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
exports.MisraPlatformMVPStack = void 0;
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const authorizers = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const path = __importStar(require("path"));
const cognito_auth_1 = require("./cognito-auth");
/**
 * MISRA Platform MVP Stack
 *
 * Minimal production-ready infrastructure for core MISRA analysis workflow:
 * - Authentication (Cognito)
 * - File upload/retrieval (S3 + Lambda)
 * - MISRA analysis (Lambda)
 * - Results storage (DynamoDB)
 */
class MisraPlatformMVPStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // ============ AUTHENTICATION ============
        const cognitoAuth = new cognito_auth_1.CognitoAuth(this, 'CognitoAuth', {
            namePrefix: 'misra',
            emailVerification: true,
            selfSignUpEnabled: true,
            passwordMinLength: 8,
        });
        // ============ DYNAMODB TABLES ============
        // Users table
        const usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: 'Users',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // File metadata table
        const fileMetadataTable = new dynamodb.Table(this, 'FileMetadataTable', {
            tableName: 'FileMetadata',
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Analysis results table
        const analysisResultsTable = new dynamodb.Table(this, 'AnalysisResultsTable', {
            tableName: 'AnalysisResults',
            partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for user-based queries
        analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'userId-timestamp-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
        });
        // ============ S3 BUCKET ============
        const fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
            bucketName: `misra-files-${this.account}-${this.region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // ============ LAMBDA FUNCTIONS ============
        // Auth: Register
        const registerFunction = new lambdaNodejs.NodejsFunction(this, 'RegisterFunction', {
            functionName: 'misra-auth-register',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/register.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                COGNITO_USER_POOL_ID: cognitoAuth.userPool.userPoolId,
                COGNITO_CLIENT_ID: cognitoAuth.userPoolClient.userPoolClientId,
                USERS_TABLE: usersTable.tableName,
            },
        });
        // Auth: Login
        const loginFunction = new lambdaNodejs.NodejsFunction(this, 'LoginFunction', {
            functionName: 'misra-auth-login',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/login.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                COGNITO_USER_POOL_ID: cognitoAuth.userPool.userPoolId,
                COGNITO_CLIENT_ID: cognitoAuth.userPoolClient.userPoolClientId,
            },
        });
        // Auth: Verify OTP (Cognito)
        const verifyOtpFunction = new lambdaNodejs.NodejsFunction(this, 'VerifyOtpFunction', {
            functionName: 'misra-auth-verify-otp',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/verify-otp-cognito.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                COGNITO_USER_POOL_ID: cognitoAuth.userPool.userPoolId,
                COGNITO_CLIENT_ID: cognitoAuth.userPoolClient.userPoolClientId,
            },
        });
        // Auth: Get Profile
        const getProfileFunction = new lambdaNodejs.NodejsFunction(this, 'GetProfileFunction', {
            functionName: 'misra-auth-get-profile',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/get-profile.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                USERS_TABLE: usersTable.tableName,
            },
        });
        // Auth: Authorizer
        const authorizerFunction = new lambdaNodejs.NodejsFunction(this, 'AuthorizerFunction', {
            functionName: 'misra-auth-authorizer',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/authorizer.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                COGNITO_USER_POOL_ID: cognitoAuth.userPool.userPoolId,
            },
        });
        // Auth: OPTIONS (CORS preflight handler)
        const optionsFunction = new lambdaNodejs.NodejsFunction(this, 'OptionsFunction', {
            functionName: 'misra-auth-options',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/options.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(5),
            memorySize: 128,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
        });
        // File: Upload
        const uploadFunction = new lambdaNodejs.NodejsFunction(this, 'UploadFunction', {
            functionName: 'misra-file-upload',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/file/upload.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(5),
            memorySize: 512,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                FILE_BUCKET: fileStorageBucket.bucketName,
                FILE_METADATA_TABLE: fileMetadataTable.tableName,
            },
        });
        // File: Get Files
        const getFilesFunction = new lambdaNodejs.NodejsFunction(this, 'GetFilesFunction', {
            functionName: 'misra-file-get-files',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/file/get-files.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                FILE_BUCKET: fileStorageBucket.bucketName,
                FILE_METADATA_TABLE: fileMetadataTable.tableName,
            },
        });
        // Analysis: Analyze File
        const analyzeFileFunction = new lambdaNodejs.NodejsFunction(this, 'AnalyzeFileFunction', {
            functionName: 'misra-analysis-analyze-file',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/analysis/analyze-file.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                FILE_BUCKET: fileStorageBucket.bucketName,
                ANALYSIS_RESULTS_TABLE: analysisResultsTable.tableName,
            },
        });
        // Analysis: Get Results
        const getAnalysisResultsFunction = new lambdaNodejs.NodejsFunction(this, 'GetAnalysisResultsFunction', {
            functionName: 'misra-analysis-get-results',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/analysis/get-analysis-results.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                ANALYSIS_RESULTS_TABLE: analysisResultsTable.tableName,
            },
        });
        // ============ PERMISSIONS ============
        usersTable.grantReadWriteData(registerFunction);
        usersTable.grantReadData(getProfileFunction);
        fileMetadataTable.grantReadWriteData(uploadFunction);
        fileMetadataTable.grantReadData(getFilesFunction);
        analysisResultsTable.grantReadWriteData(analyzeFileFunction);
        analysisResultsTable.grantReadData(getAnalysisResultsFunction);
        fileStorageBucket.grantReadWrite(uploadFunction);
        fileStorageBucket.grantRead(getFilesFunction);
        fileStorageBucket.grantRead(analyzeFileFunction);
        // ============ API GATEWAY ============
        const api = new apigateway.HttpApi(this, 'MisraAPI', {
            apiName: 'misra-platform-api',
            description: 'MISRA Platform API',
        });
        // Create JWT Authorizer
        const jwtAuthorizer = new authorizers.HttpJwtAuthorizer('JwtAuthorizer', `https://cognito-idp.${this.region}.amazonaws.com/${cognitoAuth.userPool.userPoolId}`, {
            jwtAudience: [cognitoAuth.userPoolClient.userPoolClientId]
        });
        // ============ API ROUTES ============
        // Catch-all OPTIONS route for CORS preflight
        api.addRoutes({
            path: '/{proxy+}',
            methods: [apigateway.HttpMethod.OPTIONS],
            integration: new integrations.HttpLambdaIntegration('CatchAllOptionsIntegration', optionsFunction),
        });
        // Auth routes (no authorization required)
        api.addRoutes({
            path: '/auth/register',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('RegisterIntegration', registerFunction),
        });
        api.addRoutes({
            path: '/auth/login',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('LoginIntegration', loginFunction),
        });
        api.addRoutes({
            path: '/auth/verify-otp',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('VerifyOtpIntegration', verifyOtpFunction),
        });
        // Protected routes
        api.addRoutes({
            path: '/auth/profile',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetProfileIntegration', getProfileFunction),
            authorizer: jwtAuthorizer,
        });
        api.addRoutes({
            path: '/files/upload',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('UploadIntegration', uploadFunction),
            authorizer: jwtAuthorizer,
        });
        api.addRoutes({
            path: '/files',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetFilesIntegration', getFilesFunction),
            authorizer: jwtAuthorizer,
        });
        api.addRoutes({
            path: '/analysis/analyze',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AnalyzeIntegration', analyzeFileFunction),
            authorizer: jwtAuthorizer,
        });
        api.addRoutes({
            path: '/analysis/results',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetResultsIntegration', getAnalysisResultsFunction),
            authorizer: jwtAuthorizer,
        });
        // ============ OUTPUTS ============
        new cdk.CfnOutput(this, 'APIEndpoint', {
            value: api.url,
            description: 'MISRA Platform API Endpoint',
        });
        new cdk.CfnOutput(this, 'CognitoUserPoolId', {
            value: cognitoAuth.userPool.userPoolId,
            description: 'Cognito User Pool ID',
        });
        new cdk.CfnOutput(this, 'CognitoClientId', {
            value: cognitoAuth.userPoolClient.userPoolClientId,
            description: 'Cognito Client ID',
        });
        new cdk.CfnOutput(this, 'FileStorageBucket', {
            value: fileStorageBucket.bucketName,
            description: 'S3 File Storage Bucket',
        });
    }
}
exports.MisraPlatformMVPStack = MisraPlatformMVPStack;
const app = new cdk.App();
new MisraPlatformMVPStack(app, 'MisraPlatformMVPStack', {
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
    },
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBcUM7QUFDckMsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCwrREFBaUQ7QUFDakQsNEVBQThEO0FBQzlELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUsc0ZBQXdFO0FBQ3hFLHVEQUF5QztBQUV6QywyQ0FBNkI7QUFDN0IsaURBQTZDO0FBRTdDOzs7Ozs7OztHQVFHO0FBQ0gsTUFBYSxxQkFBc0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUNsRCxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDJDQUEyQztRQUMzQyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUN2RCxVQUFVLEVBQUUsT0FBTztZQUNuQixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsaUJBQWlCLEVBQUUsQ0FBQztTQUNyQixDQUFDLENBQUM7UUFFSCw0Q0FBNEM7UUFDNUMsY0FBYztRQUNkLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFNBQVMsRUFBRSxPQUFPO1lBQ2xCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUNoRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFP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LENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3RDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN6QyxLQUFLLEVBQUUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDbEQsV0FBVyxFQUFFLG1CQUFtQjtTQUNqQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQzNDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO1lBQ25DLFdBQVcsRUFBRSx3QkFBd0I7U0FDdEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbldELHNEQW1XQztBQUVELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLElBQUkscUJBQXFCLENBQUMsR0FBRyxFQUFFLHVCQUF1QixFQUFFO0lBQ3RELEdBQUcsRUFBRTtRQUNILE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtRQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0tBQ3REO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxyXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgbGFtYmRhTm9kZWpzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcclxuaW1wb3J0ICogYXMgaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcclxuaW1wb3J0ICogYXMgYXV0aG9yaXplcnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBDb2duaXRvQXV0aCB9IGZyb20gJy4vY29nbml0by1hdXRoJztcclxuXHJcbi8qKlxyXG4gKiBNSVNSQSBQbGF0Zm9ybSBNVlAgU3RhY2tcclxuICogXHJcbiAqIE1pbmltYWwgcHJvZHVjdGlvbi1yZWFkeSBpbmZyYXN0cnVjdHVyZSBmb3IgY29yZSBNSVNSQSBhbmFseXNpcyB3b3JrZmxvdzpcclxuICogLSBBdXRoZW50aWNhdGlvbiAoQ29nbml0bylcclxuICogLSBGaWxlIHVwbG9hZC9yZXRyaWV2YWwgKFMzICsgTGFtYmRhKVxyXG4gKiAtIE1JU1JBIGFuYWx5c2lzIChMYW1iZGEpXHJcbiAqIC0gUmVzdWx0cyBzdG9yYWdlIChEeW5hbW9EQilcclxuICovXHJcbmV4cG9ydCBjbGFzcyBNaXNyYVBsYXRmb3JtTVZQU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vID09PT09PT09PT09PSBBVVRIRU5USUNBVElPTiA9PT09PT09PT09PT1cclxuICAgIGNvbnN0IGNvZ25pdG9BdXRoID0gbmV3IENvZ25pdG9BdXRoKHRoaXMsICdDb2duaXRvQXV0aCcsIHtcclxuICAgICAgbmFtZVByZWZpeDogJ21pc3JhJyxcclxuICAgICAgZW1haWxWZXJpZmljYXRpb246IHRydWUsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBwYXNzd29yZE1pbkxlbmd0aDogOCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vID09PT09PT09PT09PSBEWU5BTU9EQiBUQUJMRVMgPT09PT09PT09PT09XHJcbiAgICAvLyBVc2VycyB0YWJsZVxyXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnVXNlcnMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgbWV0YWRhdGEgdGFibGVcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdGaWxlTWV0YWRhdGFUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnRmlsZU1ldGFkYXRhJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdmaWxlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyByZXN1bHRzIHRhYmxlXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQW5hbHlzaXNSZXN1bHRzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ0FuYWx5c2lzUmVzdWx0cycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnYW5hbHlzaXNJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXItYmFzZWQgcXVlcmllc1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICd1c2VySWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IFMzIEJVQ0tFVCA9PT09PT09PT09PT1cclxuICAgIGNvbnN0IGZpbGVTdG9yYWdlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGBtaXNyYS1maWxlcy0ke3RoaXMuYWNjb3VudH0tJHt0aGlzLnJlZ2lvbn1gLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIHZlcnNpb25lZDogZmFsc2UsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IExBTUJEQSBGVU5DVElPTlMgPT09PT09PT09PT09XHJcbiAgICBcclxuICAgIC8vIEF1dGg6IFJlZ2lzdGVyXHJcbiAgICBjb25zdCByZWdpc3RlckZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnUmVnaXN0ZXJGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtYXV0aC1yZWdpc3RlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hdXRoL3JlZ2lzdGVyLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICBDT0dOSVRPX0NMSUVOVF9JRDogY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICBVU0VSU19UQUJMRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBMb2dpblxyXG4gICAgY29uc3QgbG9naW5GdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xvZ2luRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLWF1dGgtbG9naW4nLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9sb2dpbi50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ09HTklUT19DTElFTlRfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBWZXJpZnkgT1RQIChDb2duaXRvKVxyXG4gICAgY29uc3QgdmVyaWZ5T3RwRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdWZXJpZnlPdHBGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtYXV0aC12ZXJpZnktb3RwJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvdmVyaWZ5LW90cC1jb2duaXRvLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICBDT0dOSVRPX0NMSUVOVF9JRDogY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IEdldCBQcm9maWxlXHJcbiAgICBjb25zdCBnZXRQcm9maWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRQcm9maWxlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLWF1dGgtZ2V0LXByb2ZpbGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9nZXQtcHJvZmlsZS50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogQXV0aG9yaXplclxyXG4gICAgY29uc3QgYXV0aG9yaXplckZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnQXV0aG9yaXplckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1hdXRoLWF1dGhvcml6ZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9hdXRob3JpemVyLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMTApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IE9QVElPTlMgKENPUlMgcHJlZmxpZ2h0IGhhbmRsZXIpXHJcbiAgICBjb25zdCBvcHRpb25zRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdPcHRpb25zRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLWF1dGgtb3B0aW9ucycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hdXRoL29wdGlvbnMudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTI4LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGaWxlOiBVcGxvYWRcclxuICAgIGNvbnN0IHVwbG9hZEZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnVXBsb2FkRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLWZpbGUtdXBsb2FkJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2ZpbGUvdXBsb2FkLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfQlVDS0VUOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGU6IEdldCBGaWxlc1xyXG4gICAgY29uc3QgZ2V0RmlsZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldEZpbGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLWZpbGUtZ2V0LWZpbGVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2ZpbGUvZ2V0LWZpbGVzLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX0JVQ0tFVDogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFOiBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbmFseXNpczogQW5hbHl6ZSBGaWxlXHJcbiAgICBjb25zdCBhbmFseXplRmlsZUZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnQW5hbHl6ZUZpbGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtYW5hbHlzaXMtYW5hbHl6ZS1maWxlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2FuYWx5c2lzL2FuYWx5emUtZmlsZS50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRklMRV9CVUNLRVQ6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXM6IEdldCBSZXN1bHRzXHJcbiAgICBjb25zdCBnZXRBbmFseXNpc1Jlc3VsdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1hbmFseXNpcy1nZXQtcmVzdWx0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hbmFseXNpcy9nZXQtYW5hbHlzaXMtcmVzdWx0cy50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IFBFUk1JU1NJT05TID09PT09PT09PT09PVxyXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmVnaXN0ZXJGdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0UHJvZmlsZUZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZERhdGEoZ2V0RmlsZXNGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0QW5hbHlzaXNSZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgXHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5ncmFudFJlYWRXcml0ZSh1cGxvYWRGdW5jdGlvbik7XHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5ncmFudFJlYWQoZ2V0RmlsZXNGdW5jdGlvbik7XHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5ncmFudFJlYWQoYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IEFQSSBHQVRFV0FZID09PT09PT09PT09PVxyXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuSHR0cEFwaSh0aGlzLCAnTWlzcmFBUEknLCB7XHJcbiAgICAgIGFwaU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIEFQSScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSldUIEF1dGhvcml6ZXJcclxuICAgIGNvbnN0IGp3dEF1dGhvcml6ZXIgPSBuZXcgYXV0aG9yaXplcnMuSHR0cEp3dEF1dGhvcml6ZXIoJ0p3dEF1dGhvcml6ZXInLCBgaHR0cHM6Ly9jb2duaXRvLWlkcC4ke3RoaXMucmVnaW9ufS5hbWF6b25hd3MuY29tLyR7Y29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZH1gLCB7XHJcbiAgICAgIGp3dEF1ZGllbmNlOiBbY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZF1cclxuICAgIH0gYXMgYW55KTtcclxuXHJcbiAgICAvLyA9PT09PT09PT09PT0gQVBJIFJPVVRFUyA9PT09PT09PT09PT1cclxuICAgIFxyXG4gICAgLy8gQ2F0Y2gtYWxsIE9QVElPTlMgcm91dGUgZm9yIENPUlMgcHJlZmxpZ2h0XHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy97cHJveHkrfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuT1BUSU9OU10sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ2F0Y2hBbGxPcHRpb25zSW50ZWdyYXRpb24nLCBvcHRpb25zRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aCByb3V0ZXMgKG5vIGF1dGhvcml6YXRpb24gcmVxdWlyZWQpXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZ2lzdGVyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdSZWdpc3RlckludGVncmF0aW9uJywgcmVnaXN0ZXJGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL2xvZ2luJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdMb2dpbkludGVncmF0aW9uJywgbG9naW5GdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3ZlcmlmeS1vdHAnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1ZlcmlmeU90cEludGVncmF0aW9uJywgdmVyaWZ5T3RwRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvdGVjdGVkIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9wcm9maWxlJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2ZpbGVJbnRlZ3JhdGlvbicsIGdldFByb2ZpbGVGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGp3dEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcy91cGxvYWQnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwbG9hZEludGVncmF0aW9uJywgdXBsb2FkRnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiBqd3RBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RmlsZXNJbnRlZ3JhdGlvbicsIGdldEZpbGVzRnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiBqd3RBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYW5hbHlzaXMvYW5hbHl6ZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQW5hbHl6ZUludGVncmF0aW9uJywgYW5hbHl6ZUZpbGVGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGp3dEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9yZXN1bHRzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogand0QXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vID09PT09PT09PT09PSBPVVRQVVRTID09PT09PT09PT09PVxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FQSUVuZHBvaW50Jywge1xyXG4gICAgICB2YWx1ZTogYXBpLnVybCEsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTUlTUkEgUGxhdGZvcm0gQVBJIEVuZHBvaW50JyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb2duaXRvVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvZ25pdG9DbGllbnRJZCcsIHtcclxuICAgICAgdmFsdWU6IGNvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBDbGllbnQgSUQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0ZpbGVTdG9yYWdlQnVja2V0Jywge1xyXG4gICAgICB2YWx1ZTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBGaWxlIFN0b3JhZ2UgQnVja2V0JyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxuXHJcbm5ldyBNaXNyYVBsYXRmb3JtTVZQU3RhY2soYXBwLCAnTWlzcmFQbGF0Zm9ybU1WUFN0YWNrJywge1xyXG4gIGVudjoge1xyXG4gICAgYWNjb3VudDogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfQUNDT1VOVCxcclxuICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gIH0sXHJcbn0pO1xyXG5cclxuYXBwLnN5bnRoKCk7XHJcbiJdfQ==