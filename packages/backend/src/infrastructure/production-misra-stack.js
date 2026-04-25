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
exports.ProductionMisraStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const authorizers = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const lambdaEventSources = __importStar(require("aws-cdk-lib/aws-lambda-event-sources"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const path = __importStar(require("path"));
const cognito_auth_1 = require("./cognito-auth");
/**
 * Production MISRA Platform Stack
 *
 * Complete production-ready infrastructure for MISRA analysis:
 * - Authentication (Cognito)
 * - File upload/retrieval (S3 + Lambda)
 * - MISRA analysis (Lambda)
 * - Results storage (DynamoDB)
 * - API Gateway with CORS
 */
class ProductionMisraStack extends cdk.Stack {
    usersTable;
    fileMetadataTable;
    analysisResultsTable;
    sampleFilesTable;
    progressTable;
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
        this.usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: 'Users',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // File metadata table
        this.fileMetadataTable = new dynamodb.Table(this, 'FileMetadataTable', {
            tableName: 'FileMetadata',
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Analysis results table
        this.analysisResultsTable = new dynamodb.Table(this, 'AnalysisResultsTable', {
            tableName: 'AnalysisResults',
            partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for user-based queries
        this.analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'userId-timestamp-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
        });
        // Sample files table
        this.sampleFilesTable = new dynamodb.Table(this, 'SampleFilesTable', {
            tableName: 'SampleFiles',
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Progress tracking table
        this.progressTable = new dynamodb.Table(this, 'ProgressTable', {
            tableName: 'AnalysisProgress',
            partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Analysis costs tracking table
        const analysisCostsTable = new dynamodb.Table(this, 'AnalysisCostsTable', {
            tableName: 'AnalysisCosts',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // OTP storage table (for webhook-based OTP capture)
        const otpStorageTable = new dynamodb.Table(this, 'OTPStorageTable', {
            tableName: 'OTPStorage',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            timeToLiveAttribute: 'ttl', // Auto-delete after 15 minutes
        });
        // ============ S3 BUCKET ============
        const fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
            bucketName: `misra-files-${this.account}-${this.region}`,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: false,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [
                {
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST, s3.HttpMethods.HEAD, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ['*'],
                    exposedHeaders: ['ETag', 'x-amz-version-id'],
                    maxAge: 86400, // 24 hours in seconds
                }
            ]
        });
        // ============ SQS QUEUE FOR ANALYSIS ============
        const analysisQueue = new sqs.Queue(this, 'AnalysisQueue', {
            queueName: 'misra-analysis-queue',
            visibilityTimeout: cdk.Duration.minutes(15),
            retentionPeriod: cdk.Duration.hours(1),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // ============ LAMBDA FUNCTIONS ============
        // Auth: Register
        const registerFunction = new lambdaNodejs.NodejsFunction(this, 'RegisterFunction', {
            functionName: 'misra-platform-auth-register',
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
                USERS_TABLE: this.usersTable.tableName,
            },
        });
        // Auth: Login
        const loginFunction = new lambdaNodejs.NodejsFunction(this, 'LoginFunction', {
            functionName: 'misra-platform-auth-login',
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
            functionName: 'misra-platform-auth-verify-otp',
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
            functionName: 'misra-platform-auth-get-profile',
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
                USERS_TABLE: this.usersTable.tableName,
            },
        });
        // Auth: Authorizer
        const authorizerFunction = new lambdaNodejs.NodejsFunction(this, 'AuthorizerFunction', {
            functionName: 'misra-platform-auth-authorizer',
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
            functionName: 'misra-platform-auth-options',
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
        // Auth: Fetch OTP
        const fetchOtpFunction = new lambdaNodejs.NodejsFunction(this, 'FetchOtpFunction', {
            functionName: 'misra-platform-auth-fetch-otp',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/fetch-otp.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
        });
        // Auth: Auto-Login
        const autoLoginFunction = new lambdaNodejs.NodejsFunction(this, 'AutoLoginFunction', {
            functionName: 'misra-platform-auth-auto-login',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/auto-login.ts'),
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
        // Auth: OTP Webhook (receives OTP emails from SES)
        const otpWebhookFunction = new lambdaNodejs.NodejsFunction(this, 'OTPWebhookFunction', {
            functionName: 'misra-platform-auth-otp-webhook',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/otp-webhook.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                OTP_STORAGE_TABLE: 'OTPStorage',
            },
        });
        // File: Upload
        const uploadFunction = new lambdaNodejs.NodejsFunction(this, 'UploadFunction', {
            functionName: 'misra-platform-file-upload',
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
                FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
                FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
                ANALYSIS_QUEUE_URL: analysisQueue.queueUrl,
            },
        });
        // File: Get Files
        const getFilesFunction = new lambdaNodejs.NodejsFunction(this, 'GetFilesFunction', {
            functionName: 'misra-platform-file-get-files',
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
                FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
                FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
            },
        });
        // File: Get File Status
        const getFileStatusFunction = new lambdaNodejs.NodejsFunction(this, 'GetFileStatusFunction', {
            functionName: 'misra-platform-file-get-status',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/file/get-file-status.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
                ANALYSIS_RESULTS_TABLE: this.analysisResultsTable.tableName,
            },
        });
        // Analysis: Analyze File
        const analyzeFileFunction = new lambdaNodejs.NodejsFunction(this, 'AnalyzeFileFunction', {
            functionName: 'misra-platform-analysis-analyze-file',
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
                FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
                FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
                ANALYSIS_RESULTS_TABLE: this.analysisResultsTable.tableName,
                ANALYSIS_COSTS_TABLE: analysisCostsTable.tableName,
            },
        });
        // Grant FILE_METADATA_TABLE read/write permissions to analyzeFileFunction
        this.fileMetadataTable.grantReadWriteData(analyzeFileFunction);
        // Connect SQS queue to analyze function
        analyzeFileFunction.addEventSource(new lambdaEventSources.SqsEventSource(analysisQueue, {
            batchSize: 1,
            maxConcurrency: 10,
        }));
        // Analysis: Get Results
        const getAnalysisResultsFunction = new lambdaNodejs.NodejsFunction(this, 'GetAnalysisResultsFunction', {
            functionName: 'misra-platform-analysis-get-results',
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
                ANALYSIS_RESULTS_TABLE: this.analysisResultsTable.tableName,
            },
        });
        // Workflow: Start Workflow
        const startWorkflowFunction = new lambdaNodejs.NodejsFunction(this, 'StartWorkflowFunction', {
            functionName: 'misra-platform-workflow-start',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/workflow/start-workflow.ts'),
            handler: 'handler',
            timeout: cdk.Duration.minutes(5),
            memorySize: 512,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                COGNITO_USER_POOL_ID: cognitoAuth.userPool.userPoolId,
                COGNITO_CLIENT_ID: cognitoAuth.userPoolClient.userPoolClientId,
                FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
                ANALYSIS_RESULTS_TABLE: this.analysisResultsTable.tableName,
            },
        });
        // Workflow: Get Progress
        const getProgressFunction = new lambdaNodejs.NodejsFunction(this, 'GetProgressFunction', {
            functionName: 'misra-platform-workflow-get-progress',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/workflow/get-progress.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
        });
        // ============ PERMISSIONS ============
        this.usersTable.grantReadWriteData(registerFunction);
        this.usersTable.grantReadData(getProfileFunction);
        // Grant Cognito permissions to auth functions
        registerFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:AdminSetUserMFAPreference'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        loginFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge',
                'cognito-idp:AssociateSoftwareToken'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        startWorkflowFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge',
                'cognito-idp:AssociateSoftwareToken'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        startWorkflowFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'lambda:InvokeFunction'
            ],
            resources: [analyzeFileFunction.functionArn]
        }));
        verifyOtpFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge',
                'cognito-idp:AssociateSoftwareToken',
                'cognito-idp:VerifySoftwareToken',
                'cognito-idp:AdminSetUserMFAPreference'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        autoLoginFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        this.fileMetadataTable.grantReadWriteData(uploadFunction);
        this.fileMetadataTable.grantReadData(getFilesFunction);
        this.fileMetadataTable.grantReadData(getFileStatusFunction);
        this.fileMetadataTable.grantReadWriteData(analyzeFileFunction);
        this.analysisResultsTable.grantReadWriteData(analyzeFileFunction);
        this.analysisResultsTable.grantReadData(getAnalysisResultsFunction);
        this.analysisResultsTable.grantReadData(getFileStatusFunction);
        // Grant AnalysisCosts table permissions to analyzeFileFunction
        analysisCostsTable.grantReadWriteData(analyzeFileFunction);
        otpStorageTable.grantReadWriteData(otpWebhookFunction);
        otpStorageTable.grantReadData(fetchOtpFunction);
        // Grant progress table permissions
        this.progressTable.grantReadWriteData(startWorkflowFunction);
        this.progressTable.grantReadData(getProgressFunction);
        // Grant S3 permissions to Lambda functions
        fileStorageBucket.grantReadWrite(uploadFunction);
        fileStorageBucket.grantRead(getFilesFunction);
        fileStorageBucket.grantRead(analyzeFileFunction);
        // Explicitly grant PutObject permission for presigned URL generation
        uploadFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                's3:PutObject',
                's3:PutObjectAcl',
                's3:GetObject',
                's3:DeleteObject'
            ],
            resources: [`${fileStorageBucket.bucketArn}/*`]
        }));
        // Grant SQS permissions to Lambda functions
        analysisQueue.grantSendMessages(uploadFunction);
        analysisQueue.grantConsumeMessages(analyzeFileFunction);
        // ============ API GATEWAY ============
        const api = new apigateway.HttpApi(this, 'MisraAPI', {
            apiName: 'misra-platform-api',
            description: 'MISRA Platform API',
            corsPreflight: {
                allowOrigins: ['*'],
                allowMethods: [apigateway.CorsHttpMethod.GET, apigateway.CorsHttpMethod.POST, apigateway.CorsHttpMethod.PUT, apigateway.CorsHttpMethod.DELETE, apigateway.CorsHttpMethod.OPTIONS, apigateway.CorsHttpMethod.PATCH],
                allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key', 'X-Amz-Security-Token', 'X-Correlation-ID', 'X-Requested-With'],
                maxAge: cdk.Duration.hours(24),
            },
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
        api.addRoutes({
            path: '/auth/fetch-otp',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('FetchOtpIntegration', fetchOtpFunction),
        });
        api.addRoutes({
            path: '/auth/auto-login',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AutoLoginIntegration', autoLoginFunction),
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
            path: '/files/{fileId}/status',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetFileStatusIntegration', getFileStatusFunction),
            authorizer: jwtAuthorizer,
        });
        api.addRoutes({
            path: '/analysis/analyze',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AnalyzeIntegration', analyzeFileFunction),
            authorizer: jwtAuthorizer,
        });
        api.addRoutes({
            path: '/analysis/results/{fileId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetResultsIntegration', getAnalysisResultsFunction),
            authorizer: jwtAuthorizer,
        });
        // Workflow routes (no authorization required for start, but get-progress is public)
        api.addRoutes({
            path: '/workflow/start',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('StartWorkflowIntegration', startWorkflowFunction),
        });
        api.addRoutes({
            path: '/workflow/progress/{workflowId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetProgressIntegration', getProgressFunction),
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
        new cdk.CfnOutput(this, 'FileStorageBucketOutput', {
            value: fileStorageBucket.bucketName,
            description: 'S3 File Storage Bucket',
        });
    }
}
exports.ProductionMisraStack = ProductionMisraStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdGlvbi1taXNyYS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2R1Y3Rpb24tbWlzcmEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCwrREFBaUQ7QUFDakQsNEVBQThEO0FBQzlELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUsc0ZBQXdFO0FBQ3hFLHVEQUF5QztBQUN6Qyx5REFBMkM7QUFDM0MseUZBQTJFO0FBQzNFLHlEQUEyQztBQUMzQywyQ0FBNkI7QUFDN0IsaURBQTZDO0FBRTdDOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsVUFBVSxDQUFpQjtJQUMzQixpQkFBaUIsQ0FBaUI7SUFDbEMsb0JBQW9CLENBQWlCO0lBQ3JDLGdCQUFnQixDQUFpQjtJQUNqQyxhQUFhLENBQWlCO0lBRXJDLFlBQVksS0FBYyxFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QiwyQ0FBMkM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDdkQsVUFBVSxFQUFFLE9BQU87WUFDbkIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGlCQUFpQixFQUFFLENBQUM7U0FDckIsQ0FBQyxDQUFDO1FBRUgsNENBQTRDO1FBQzVDLGNBQWM7UUFDZCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3ZELFNBQVMsRUFBRSxPQUFPO1lBQ2xCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUNoRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILHNCQUFzQjtRQUN0QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNyRSxTQUFTLEVBQUUsY0FBYztZQUN6QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNyRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNoRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDM0UsU0FBUyxFQUFFLGlCQUFpQjtZQUM1QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN6RSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNuRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixDQUFDO1lBQ2hELFNBQVMsRUFBRSx3QkFBd0I7WUFDbkMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ25FLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUNoRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1NBQ3pDLENBQUMsQ0FBQztRQUVILDBCQUEwQjtRQUMxQixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzdELFNBQVMsRUFBRSxrQkFBa0I7WUFDN0IsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDekUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgsZ0NBQWdDO1FBQ2hDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUN4RSxTQUFTLEVBQUUsZUFBZTtZQUMxQixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNyRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNuRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxvREFBb0Q7UUFDcEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUNsRSxTQUFTLEVBQUUsWUFBWTtZQUN2QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNwRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNuRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxtQkFBbUIsRUFBRSxLQUFLLEVBQUUsK0JBQStCO1NBQzVELENBQUMsQ0FBQztRQUVILHNDQUFzQztRQUN0QyxNQUFNLGlCQUFpQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDakUsVUFBVSxFQUFFLGVBQWUsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFO1lBQ3hELGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxTQUFTLEVBQUUsS0FBSztZQUNoQixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO29CQUN6SCxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsTUFBTSxFQUFFLGtCQUFrQixDQUFDO29CQUM1QyxNQUFNLEVBQUUsS0FBSyxFQUFFLHNCQUFzQjtpQkFDdEM7YUFDRjtTQUNGLENBQUMsQ0FBQztRQUVILG1EQUFtRDtRQUNuRCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN6RCxTQUFTLEVBQUUsc0JBQXNCO1lBQ2pDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87U0FDekMsQ0FBQyxDQUFDO1FBRUgsNkNBQTZDO1FBRTdDLGlCQUFpQjtRQUNqQixNQUFNLGdCQUFnQixHQUFHLElBQUksWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDakYsWUFBWSxFQUFFLDhCQUE4QjtZQUM1QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwrQkFBK0IsQ0FBQztZQUM1RCxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsUUFBUSxFQUFFO2dCQUNSLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixlQUFlLEVBQUUsQ0FBQyxZQUFZLENBQUM7YUFDaEM7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsb0JBQW9CLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVO2dCQUNyRCxpQkFBaUIsRUFBRSxXQUFXLENBQUMsY0FBYyxDQUFDLGdCQUFnQjtnQkFDOUQsV0FBVyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUzthQUN2QztTQUNGLENBQUMsQ0FBQztRQUVILGNBQWM7UUFDZCxNQUFNLGFBQWEsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMzRSxZQUFZLEVBQUUsMkJBQTJCO1lBQ3pDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDRCQUE0QixDQUFDO1lBQ3pELE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztZQUNELFdBQVcsRUFBRTtnQkFDWCxvQkFBb0IsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVU7Z0JBQ3JELGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO2FBQy9EO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsNkJBQTZCO1FBQzdCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNuRixZQUFZLEVBQUUsZ0NBQWdDO1lBQzlDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHlDQUF5QyxDQUFDO1lBQ3RFLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztZQUNELFdBQVcsRUFBRTtnQkFDWCxvQkFBb0IsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVU7Z0JBQ3JELGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO2FBQy9EO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CO1FBQ3BCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUNyRixZQUFZLEVBQUUsaUNBQWlDO1lBQy9DLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGtDQUFrQyxDQUFDO1lBQy9ELE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztZQUNELFdBQVcsRUFBRTtnQkFDWCxXQUFXLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTO2FBQ3ZDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsbUJBQW1CO1FBQ25CLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUNyRixZQUFZLEVBQUUsZ0NBQWdDO1lBQzlDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLGlDQUFpQyxDQUFDO1lBQzlELE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztZQUNELFdBQVcsRUFBRTtnQkFDWCxvQkFBb0IsRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFVBQVU7YUFDdEQ7U0FDRixDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsTUFBTSxlQUFlLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUMvRSxZQUFZLEVBQUUsNkJBQTZCO1lBQzNDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDhCQUE4QixDQUFDO1lBQzNELE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztTQUNGLENBQUMsQ0FBQztRQUVILGtCQUFrQjtRQUNsQixNQUFNLGdCQUFnQixHQUFHLElBQUksWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDakYsWUFBWSxFQUFFLCtCQUErQjtZQUM3QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxnQ0FBZ0MsQ0FBQztZQUM3RCxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsUUFBUSxFQUFFO2dCQUNSLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixlQUFlLEVBQUUsQ0FBQyxZQUFZLENBQUM7YUFDaEM7U0FDRixDQUFDLENBQUM7UUFFSCxtQkFBbUI7UUFDbkIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ25GLFlBQVksRUFBRSxnQ0FBZ0M7WUFDOUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsaUNBQWlDLENBQUM7WUFDOUQsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLFFBQVEsRUFBRTtnQkFDUixNQUFNLEVBQUUsSUFBSTtnQkFDWixTQUFTLEVBQUUsS0FBSztnQkFDaEIsZUFBZSxFQUFFLENBQUMsWUFBWSxDQUFDO2FBQ2hDO1lBQ0QsV0FBVyxFQUFFO2dCQUNYLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVTtnQkFDckQsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7YUFDL0Q7U0FDRixDQUFDLENBQUM7UUFFSCxtREFBbUQ7UUFDbkQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3JGLFlBQVksRUFBRSxpQ0FBaUM7WUFDL0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsa0NBQWtDLENBQUM7WUFDL0QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLFFBQVEsRUFBRTtnQkFDUixNQUFNLEVBQUUsSUFBSTtnQkFDWixTQUFTLEVBQUUsS0FBSztnQkFDaEIsZUFBZSxFQUFFLENBQUMsWUFBWSxDQUFDO2FBQ2hDO1lBQ0QsV0FBVyxFQUFFO2dCQUNYLGlCQUFpQixFQUFFLFlBQVk7YUFDaEM7U0FDRixDQUFDLENBQUM7UUFFSCxlQUFlO1FBQ2YsTUFBTSxjQUFjLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUM3RSxZQUFZLEVBQUUsNEJBQTRCO1lBQzFDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLDZCQUE2QixDQUFDO1lBQzFELE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztZQUNELFdBQVcsRUFBRTtnQkFDWCx3QkFBd0IsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO2dCQUN0RCxtQkFBbUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUztnQkFDckQsa0JBQWtCLEVBQUUsYUFBYSxDQUFDLFFBQVE7YUFDM0M7U0FDRixDQUFDLENBQUM7UUFFSCxrQkFBa0I7UUFDbEIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ2pGLFlBQVksRUFBRSwrQkFBK0I7WUFDN0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsZ0NBQWdDLENBQUM7WUFDN0QsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLFFBQVEsRUFBRTtnQkFDUixNQUFNLEVBQUUsSUFBSTtnQkFDWixTQUFTLEVBQUUsS0FBSztnQkFDaEIsZUFBZSxFQUFFLENBQUMsWUFBWSxDQUFDO2FBQ2hDO1lBQ0QsV0FBVyxFQUFFO2dCQUNYLHdCQUF3QixFQUFFLGlCQUFpQixDQUFDLFVBQVU7Z0JBQ3RELG1CQUFtQixFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO2FBQ3REO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsd0JBQXdCO1FBQ3hCLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMzRixZQUFZLEVBQUUsZ0NBQWdDO1lBQzlDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHNDQUFzQyxDQUFDO1lBQ25FLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztZQUNELFdBQVcsRUFBRTtnQkFDWCxtQkFBbUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUztnQkFDckQsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVM7YUFDNUQ7U0FDRixDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQ3ZGLFlBQVksRUFBRSxzQ0FBc0M7WUFDcEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsdUNBQXVDLENBQUM7WUFDcEUsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxVQUFVLEVBQUUsSUFBSTtZQUNoQixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztZQUNELFdBQVcsRUFBRTtnQkFDWCx3QkFBd0IsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO2dCQUN0RCxtQkFBbUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUztnQkFDckQsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVM7Z0JBQzNELG9CQUFvQixFQUFFLGtCQUFrQixDQUFDLFNBQVM7YUFDbkQ7U0FDRixDQUFDLENBQUM7UUFFSCwwRUFBMEU7UUFDMUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFL0Qsd0NBQXdDO1FBQ3hDLG1CQUFtQixDQUFDLGNBQWMsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUU7WUFDdEYsU0FBUyxFQUFFLENBQUM7WUFDWixjQUFjLEVBQUUsRUFBRTtTQUNuQixDQUFDLENBQUMsQ0FBQztRQUVKLHdCQUF3QjtRQUN4QixNQUFNLDBCQUEwQixHQUFHLElBQUksWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLEVBQUU7WUFDckcsWUFBWSxFQUFFLHFDQUFxQztZQUNuRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwrQ0FBK0MsQ0FBQztZQUM1RSxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsUUFBUSxFQUFFO2dCQUNSLE1BQU0sRUFBRSxJQUFJO2dCQUNaLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixlQUFlLEVBQUUsQ0FBQyxZQUFZLENBQUM7YUFDaEM7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVM7YUFDNUQ7U0FDRixDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQzNGLFlBQVksRUFBRSwrQkFBK0I7WUFDN0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUseUNBQXlDLENBQUM7WUFDdEUsT0FBTyxFQUFFLFNBQVM7WUFDbEIsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxVQUFVLEVBQUUsR0FBRztZQUNmLFFBQVEsRUFBRTtnQkFDUixNQUFNLEVBQUUsSUFBSTtnQkFDWixTQUFTLEVBQUUsS0FBSztnQkFDaEIsZUFBZSxFQUFFLENBQUMsWUFBWSxDQUFDO2FBQ2hDO1lBQ0QsV0FBVyxFQUFFO2dCQUNYLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsVUFBVTtnQkFDckQsaUJBQWlCLEVBQUUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7Z0JBQzlELHdCQUF3QixFQUFFLGlCQUFpQixDQUFDLFVBQVU7Z0JBQ3RELHNCQUFzQixFQUFFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTO2FBQzVEO1NBQ0YsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUN2RixZQUFZLEVBQUUsc0NBQXNDO1lBQ3BELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLHVDQUF1QyxDQUFDO1lBQ3BFLE9BQU8sRUFBRSxTQUFTO1lBQ2xCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZixRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLElBQUk7Z0JBQ1osU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUNoQztTQUNGLENBQUMsQ0FBQztRQUVILHdDQUF3QztRQUN4QyxJQUFJLENBQUMsVUFBVSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVsRCw4Q0FBOEM7UUFDOUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNsRSxPQUFPLEVBQUU7Z0JBQ1AsMEJBQTBCO2dCQUMxQiw2QkFBNkI7Z0JBQzdCLGtDQUFrQztnQkFDbEMsdUNBQXVDO2FBQ3hDO1lBQ0QsU0FBUyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7U0FDOUMsQ0FBQyxDQUFDLENBQUM7UUFFSixhQUFhLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUMvRCxPQUFPLEVBQUU7Z0JBQ1AsK0JBQStCO2dCQUMvQix5Q0FBeUM7Z0JBQ3pDLG9DQUFvQzthQUNyQztZQUNELFNBQVMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1NBQzlDLENBQUMsQ0FBQyxDQUFDO1FBRUoscUJBQXFCLENBQUMsSUFBSSxFQUFFLG9CQUFvQixDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN2RSxPQUFPLEVBQUU7Z0JBQ1AsNkJBQTZCO2dCQUM3QixrQ0FBa0M7Z0JBQ2xDLCtCQUErQjtnQkFDL0IseUNBQXlDO2dCQUN6QyxvQ0FBb0M7YUFDckM7WUFDRCxTQUFTLEVBQUUsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztTQUM5QyxDQUFDLENBQUMsQ0FBQztRQUVKLHFCQUFxQixDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdkUsT0FBTyxFQUFFO2dCQUNQLHVCQUF1QjthQUN4QjtZQUNELFNBQVMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FBQztTQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVKLGlCQUFpQixDQUFDLElBQUksRUFBRSxvQkFBb0IsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDbkUsT0FBTyxFQUFFO2dCQUNQLCtCQUErQjtnQkFDL0IseUNBQXlDO2dCQUN6QyxvQ0FBb0M7Z0JBQ3BDLGlDQUFpQztnQkFDakMsdUNBQXVDO2FBQ3hDO1lBQ0QsU0FBUyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUM7U0FDOUMsQ0FBQyxDQUFDLENBQUM7UUFFSixpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ25FLE9BQU8sRUFBRTtnQkFDUCwrQkFBK0I7Z0JBQy9CLHlDQUF5QzthQUMxQztZQUNELFNBQVMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1NBQzlDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQzFELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN2RCxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFL0QsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDbEUsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUUvRCwrREFBK0Q7UUFDL0Qsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUUzRCxlQUFlLENBQUMsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN2RCxlQUFlLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFaEQsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUM3RCxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRXRELDJDQUEyQztRQUMzQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDakQsaUJBQWlCLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDOUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFFakQscUVBQXFFO1FBQ3JFLGNBQWMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ2hFLE9BQU8sRUFBRTtnQkFDUCxjQUFjO2dCQUNkLGlCQUFpQjtnQkFDakIsY0FBYztnQkFDZCxpQkFBaUI7YUFDbEI7WUFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsSUFBSSxDQUFDO1NBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUosNENBQTRDO1FBQzVDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUNoRCxhQUFhLENBQUMsb0JBQW9CLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUV4RCx3Q0FBd0M7UUFDeEMsTUFBTSxHQUFHLEdBQUcsSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDbkQsT0FBTyxFQUFFLG9CQUFvQjtZQUM3QixXQUFXLEVBQUUsb0JBQW9CO1lBQ2pDLGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLFlBQVksRUFBRSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO2dCQUNsTixZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUM7Z0JBQzFJLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7YUFDL0I7U0FDRixDQUFDLENBQUM7UUFFSCx3QkFBd0I7UUFDeEIsTUFBTSxhQUFhLEdBQUcsSUFBSSxXQUFXLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLHVCQUF1QixJQUFJLENBQUMsTUFBTSxrQkFBa0IsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUM5SixXQUFXLEVBQUUsQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDO1NBQ3BELENBQUMsQ0FBQztRQUVWLHVDQUF1QztRQUV2Qyw2Q0FBNkM7UUFDN0MsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxXQUFXO1lBQ2pCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDO1lBQ3hDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSxlQUFlLENBQUM7U0FDbkcsQ0FBQyxDQUFDO1FBRUgsMENBQTBDO1FBQzFDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsQ0FBQztTQUM3RixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGFBQWE7WUFDbkIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixFQUFFLGFBQWEsQ0FBQztTQUN2RixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGtCQUFrQjtZQUN4QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLEVBQUUsaUJBQWlCLENBQUM7U0FDL0YsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixFQUFFLGdCQUFnQixDQUFDO1NBQzdGLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsa0JBQWtCO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRSxpQkFBaUIsQ0FBQztTQUMvRixDQUFDLENBQUM7UUFFSCxtQkFBbUI7UUFDbkIsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxlQUFlO1lBQ3JCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRSxrQkFBa0IsQ0FBQztZQUNoRyxVQUFVLEVBQUUsYUFBYTtTQUMxQixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGVBQWU7WUFDckIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQztZQUN4RixVQUFVLEVBQUUsYUFBYTtTQUMxQixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLENBQUM7WUFDNUYsVUFBVSxFQUFFLGFBQWE7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDBCQUEwQixFQUFFLHFCQUFxQixDQUFDO1lBQ3RHLFVBQVUsRUFBRSxhQUFhO1NBQzFCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsbUJBQW1CO1lBQ3pCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxvQkFBb0IsRUFBRSxtQkFBbUIsQ0FBQztZQUM5RixVQUFVLEVBQUUsYUFBYTtTQUMxQixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLDRCQUE0QjtZQUNsQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsMEJBQTBCLENBQUM7WUFDeEcsVUFBVSxFQUFFLGFBQWE7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsb0ZBQW9GO1FBQ3BGLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywwQkFBMEIsRUFBRSxxQkFBcUIsQ0FBQztTQUN2RyxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGlDQUFpQztZQUN2QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLEVBQUUsbUJBQW1CLENBQUM7U0FDbkcsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3JDLEtBQUssRUFBRSxHQUFHLENBQUMsR0FBSTtZQUNmLFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUMzQyxLQUFLLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQ3RDLFdBQVcsRUFBRSxzQkFBc0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN6QyxLQUFLLEVBQUUsV0FBVyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDbEQsV0FBVyxFQUFFLG1CQUFtQjtTQUNqQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO1lBQ25DLFdBQVcsRUFBRSx3QkFBd0I7U0FDdEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBcHBCRCxvREFvcEJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGFOb2RlanMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xyXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xyXG5pbXBvcnQgKiBhcyBpbnRlZ3JhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBhdXRob3JpemVycyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGFFdmVudFNvdXJjZXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBDb2duaXRvQXV0aCB9IGZyb20gJy4vY29nbml0by1hdXRoJztcclxuXHJcbi8qKlxyXG4gKiBQcm9kdWN0aW9uIE1JU1JBIFBsYXRmb3JtIFN0YWNrXHJcbiAqIFxyXG4gKiBDb21wbGV0ZSBwcm9kdWN0aW9uLXJlYWR5IGluZnJhc3RydWN0dXJlIGZvciBNSVNSQSBhbmFseXNpczpcclxuICogLSBBdXRoZW50aWNhdGlvbiAoQ29nbml0bylcclxuICogLSBGaWxlIHVwbG9hZC9yZXRyaWV2YWwgKFMzICsgTGFtYmRhKVxyXG4gKiAtIE1JU1JBIGFuYWx5c2lzIChMYW1iZGEpXHJcbiAqIC0gUmVzdWx0cyBzdG9yYWdlIChEeW5hbW9EQilcclxuICogLSBBUEkgR2F0ZXdheSB3aXRoIENPUlNcclxuICovXHJcbmV4cG9ydCBjbGFzcyBQcm9kdWN0aW9uTWlzcmFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHVzZXJzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHB1YmxpYyBmaWxlTWV0YWRhdGFUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgcHVibGljIGFuYWx5c2lzUmVzdWx0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBwdWJsaWMgc2FtcGxlRmlsZXNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgcHVibGljIHByb2dyZXNzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogY2RrLkFwcCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IEFVVEhFTlRJQ0FUSU9OID09PT09PT09PT09PVxyXG4gICAgY29uc3QgY29nbml0b0F1dGggPSBuZXcgQ29nbml0b0F1dGgodGhpcywgJ0NvZ25pdG9BdXRoJywge1xyXG4gICAgICBuYW1lUHJlZml4OiAnbWlzcmEnLFxyXG4gICAgICBlbWFpbFZlcmlmaWNhdGlvbjogdHJ1ZSxcclxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IHRydWUsXHJcbiAgICAgIHBhc3N3b3JkTWluTGVuZ3RoOiA4LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IERZTkFNT0RCIFRBQkxFUyA9PT09PT09PT09PT1cclxuICAgIC8vIFVzZXJzIHRhYmxlXHJcbiAgICB0aGlzLnVzZXJzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1VzZXJzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ1VzZXJzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGaWxlIG1ldGFkYXRhIHRhYmxlXHJcbiAgICB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdGaWxlTWV0YWRhdGFUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnRmlsZU1ldGFkYXRhJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdmaWxlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyByZXN1bHRzIHRhYmxlXHJcbiAgICB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBbmFseXNpc1Jlc3VsdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnQW5hbHlzaXNSZXN1bHRzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdhbmFseXNpc0lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgdXNlci1iYXNlZCBxdWVyaWVzXHJcbiAgICB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNhbXBsZSBmaWxlcyB0YWJsZVxyXG4gICAgdGhpcy5zYW1wbGVGaWxlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTYW1wbGVGaWxlc1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdTYW1wbGVGaWxlcycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZmlsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvZ3Jlc3MgdHJhY2tpbmcgdGFibGVcclxuICAgIHRoaXMucHJvZ3Jlc3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUHJvZ3Jlc3NUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnQW5hbHlzaXNQcm9ncmVzcycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnYW5hbHlzaXNJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIGNvc3RzIHRyYWNraW5nIHRhYmxlXHJcbiAgICBjb25zdCBhbmFseXNpc0Nvc3RzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0FuYWx5c2lzQ29zdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnQW5hbHlzaXNDb3N0cycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT1RQIHN0b3JhZ2UgdGFibGUgKGZvciB3ZWJob29rLWJhc2VkIE9UUCBjYXB0dXJlKVxyXG4gICAgY29uc3Qgb3RwU3RvcmFnZVRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdPVFBTdG9yYWdlVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ09UUFN0b3JhZ2UnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VtYWlsJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJywgLy8gQXV0by1kZWxldGUgYWZ0ZXIgMTUgbWludXRlc1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IFMzIEJVQ0tFVCA9PT09PT09PT09PT1cclxuICAgIGNvbnN0IGZpbGVTdG9yYWdlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGBtaXNyYS1maWxlcy0ke3RoaXMuYWNjb3VudH0tJHt0aGlzLnJlZ2lvbn1gLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIHZlcnNpb25lZDogZmFsc2UsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgICBjb3JzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBVVCwgczMuSHR0cE1ldGhvZHMuUE9TVCwgczMuSHR0cE1ldGhvZHMuSEVBRCwgczMuSHR0cE1ldGhvZHMuREVMRVRFXSxcclxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcclxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcclxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnLCAneC1hbXotdmVyc2lvbi1pZCddLFxyXG4gICAgICAgICAgbWF4QWdlOiA4NjQwMCwgLy8gMjQgaG91cnMgaW4gc2Vjb25kc1xyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IFNRUyBRVUVVRSBGT1IgQU5BTFlTSVMgPT09PT09PT09PT09XHJcbiAgICBjb25zdCBhbmFseXNpc1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnQW5hbHlzaXNRdWV1ZScsIHtcclxuICAgICAgcXVldWVOYW1lOiAnbWlzcmEtYW5hbHlzaXMtcXVldWUnLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vID09PT09PT09PT09PSBMQU1CREEgRlVOQ1RJT05TID09PT09PT09PT09PVxyXG4gICAgXHJcbiAgICAvLyBBdXRoOiBSZWdpc3RlclxyXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtcmVnaXN0ZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9yZWdpc3Rlci50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ09HTklUT19DTElFTlRfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgVVNFUlNfVEFCTEU6IHRoaXMudXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBMb2dpblxyXG4gICAgY29uc3QgbG9naW5GdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xvZ2luRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtbG9naW4nLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9sb2dpbi50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ09HTklUT19DTElFTlRfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBWZXJpZnkgT1RQIChDb2duaXRvKVxyXG4gICAgY29uc3QgdmVyaWZ5T3RwRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdWZXJpZnlPdHBGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC12ZXJpZnktb3RwJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvdmVyaWZ5LW90cC1jb2duaXRvLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICBDT0dOSVRPX0NMSUVOVF9JRDogY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IEdldCBQcm9maWxlXHJcbiAgICBjb25zdCBnZXRQcm9maWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdHZXRQcm9maWxlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtZ2V0LXByb2ZpbGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9nZXQtcHJvZmlsZS50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEU6IHRoaXMudXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBBdXRob3JpemVyXHJcbiAgICBjb25zdCBhdXRob3JpemVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdBdXRob3JpemVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtYXV0aG9yaXplcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hdXRoL2F1dGhvcml6ZXIudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENPR05JVE9fVVNFUl9QT09MX0lEOiBjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogT1BUSU9OUyAoQ09SUyBwcmVmbGlnaHQgaGFuZGxlcilcclxuICAgIGNvbnN0IG9wdGlvbnNGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ09wdGlvbnNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC1vcHRpb25zJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvb3B0aW9ucy50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAxMjgsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IEZldGNoIE9UUFxyXG4gICAgY29uc3QgZmV0Y2hPdHBGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0ZldGNoT3RwRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtZmV0Y2gtb3RwJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvZmV0Y2gtb3RwLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IEF1dG8tTG9naW5cclxuICAgIGNvbnN0IGF1dG9Mb2dpbkZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnQXV0b0xvZ2luRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtYXV0by1sb2dpbicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hdXRoL2F1dG8tbG9naW4udHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENPR05JVE9fVVNFUl9QT09MX0lEOiBjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIENPR05JVE9fQ0xJRU5UX0lEOiBjb2duaXRvQXV0aC51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogT1RQIFdlYmhvb2sgKHJlY2VpdmVzIE9UUCBlbWFpbHMgZnJvbSBTRVMpXHJcbiAgICBjb25zdCBvdHBXZWJob29rRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdPVFBXZWJob29rRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtb3RwLXdlYmhvb2snLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9vdHAtd2ViaG9vay50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgT1RQX1NUT1JBR0VfVEFCTEU6ICdPVFBTdG9yYWdlJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGU6IFVwbG9hZFxyXG4gICAgY29uc3QgdXBsb2FkRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdVcGxvYWRGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZmlsZS11cGxvYWQnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvZmlsZS91cGxvYWQudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IHRoaXMuZmlsZU1ldGFkYXRhVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEFOQUxZU0lTX1FVRVVFX1VSTDogYW5hbHlzaXNRdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGU6IEdldCBGaWxlc1xyXG4gICAgY29uc3QgZ2V0RmlsZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldEZpbGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWZpbGUtZ2V0LWZpbGVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2ZpbGUvZ2V0LWZpbGVzLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRklMRV9NRVRBREFUQV9UQUJMRTogdGhpcy5maWxlTWV0YWRhdGFUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGaWxlOiBHZXQgRmlsZSBTdGF0dXNcclxuICAgIGNvbnN0IGdldEZpbGVTdGF0dXNGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldEZpbGVTdGF0dXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZmlsZS1nZXQtc3RhdHVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2ZpbGUvZ2V0LWZpbGUtc3RhdHVzLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFOiB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFOiB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzOiBBbmFseXplIEZpbGVcclxuICAgIGNvbnN0IGFuYWx5emVGaWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdBbmFseXplRmlsZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1hbmFseXplLWZpbGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYW5hbHlzaXMvYW5hbHl6ZS1maWxlLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRklMRV9NRVRBREFUQV9UQUJMRTogdGhpcy5maWxlTWV0YWRhdGFUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfQ09TVFNfVEFCTEU6IGFuYWx5c2lzQ29zdHNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBGSUxFX01FVEFEQVRBX1RBQkxFIHJlYWQvd3JpdGUgcGVybWlzc2lvbnMgdG8gYW5hbHl6ZUZpbGVGdW5jdGlvblxyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQ29ubmVjdCBTUVMgcXVldWUgdG8gYW5hbHl6ZSBmdW5jdGlvblxyXG4gICAgYW5hbHl6ZUZpbGVGdW5jdGlvbi5hZGRFdmVudFNvdXJjZShuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlNxc0V2ZW50U291cmNlKGFuYWx5c2lzUXVldWUsIHtcclxuICAgICAgYmF0Y2hTaXplOiAxLFxyXG4gICAgICBtYXhDb25jdXJyZW5jeTogMTAsXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXM6IEdldCBSZXN1bHRzXHJcbiAgICBjb25zdCBnZXRBbmFseXNpc1Jlc3VsdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1nZXQtcmVzdWx0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hbmFseXNpcy9nZXQtYW5hbHlzaXMtcmVzdWx0cy50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBXb3JrZmxvdzogU3RhcnQgV29ya2Zsb3dcclxuICAgIGNvbnN0IHN0YXJ0V29ya2Zsb3dGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1N0YXJ0V29ya2Zsb3dGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0td29ya2Zsb3ctc3RhcnQnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvd29ya2Zsb3cvc3RhcnQtd29ya2Zsb3cudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ09HTklUT19DTElFTlRfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEFOQUxZU0lTX1JFU1VMVFNfVEFCTEU6IHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gV29ya2Zsb3c6IEdldCBQcm9ncmVzc1xyXG4gICAgY29uc3QgZ2V0UHJvZ3Jlc3NGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldFByb2dyZXNzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXdvcmtmbG93LWdldC1wcm9ncmVzcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy93b3JrZmxvdy9nZXQtcHJvZ3Jlc3MudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IFBFUk1JU1NJT05TID09PT09PT09PT09PVxyXG4gICAgdGhpcy51c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyZWdpc3RlckZ1bmN0aW9uKTtcclxuICAgIHRoaXMudXNlcnNUYWJsZS5ncmFudFJlYWREYXRhKGdldFByb2ZpbGVGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEdyYW50IENvZ25pdG8gcGVybWlzc2lvbnMgdG8gYXV0aCBmdW5jdGlvbnNcclxuICAgIHJlZ2lzdGVyRnVuY3Rpb24ucm9sZT8uYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlclBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICB9KSk7XHJcblxyXG4gICAgbG9naW5GdW5jdGlvbi5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5Jbml0aWF0ZUF1dGgnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblJlc3BvbmRUb0F1dGhDaGFsbGVuZ2UnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBc3NvY2lhdGVTb2Z0d2FyZVRva2VuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbEFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICBzdGFydFdvcmtmbG93RnVuY3Rpb24ucm9sZT8uYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlclBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5Jbml0aWF0ZUF1dGgnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblJlc3BvbmRUb0F1dGhDaGFsbGVuZ2UnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBc3NvY2lhdGVTb2Z0d2FyZVRva2VuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbEFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICBzdGFydFdvcmtmbG93RnVuY3Rpb24ucm9sZT8uYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2xhbWJkYTpJbnZva2VGdW5jdGlvbidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbYW5hbHl6ZUZpbGVGdW5jdGlvbi5mdW5jdGlvbkFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB2ZXJpZnlPdHBGdW5jdGlvbi5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5Jbml0aWF0ZUF1dGgnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblJlc3BvbmRUb0F1dGhDaGFsbGVuZ2UnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBc3NvY2lhdGVTb2Z0d2FyZVRva2VuJyxcclxuICAgICAgICAnY29nbml0by1pZHA6VmVyaWZ5U29mdHdhcmVUb2tlbicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlck1GQVByZWZlcmVuY2UnXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW2NvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sQXJuXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGF1dG9Mb2dpbkZ1bmN0aW9uLnJvbGU/LmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkluaXRpYXRlQXV0aCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICB9KSk7XHJcbiAgICBcclxuICAgIHRoaXMuZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIHRoaXMuZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRGaWxlc0Z1bmN0aW9uKTtcclxuICAgIHRoaXMuZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRGaWxlU3RhdHVzRnVuY3Rpb24pO1xyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5emVGaWxlRnVuY3Rpb24pO1xyXG4gICAgdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGdldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uKTtcclxuICAgIHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRGaWxlU3RhdHVzRnVuY3Rpb24pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCBBbmFseXNpc0Nvc3RzIHRhYmxlIHBlcm1pc3Npb25zIHRvIGFuYWx5emVGaWxlRnVuY3Rpb25cclxuICAgIGFuYWx5c2lzQ29zdHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIG90cFN0b3JhZ2VUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEob3RwV2ViaG9va0Z1bmN0aW9uKTtcclxuICAgIG90cFN0b3JhZ2VUYWJsZS5ncmFudFJlYWREYXRhKGZldGNoT3RwRnVuY3Rpb24pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCBwcm9ncmVzcyB0YWJsZSBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5wcm9ncmVzc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShzdGFydFdvcmtmbG93RnVuY3Rpb24pO1xyXG4gICAgdGhpcy5wcm9ncmVzc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0UHJvZ3Jlc3NGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEdyYW50IFMzIHBlcm1pc3Npb25zIHRvIExhbWJkYSBmdW5jdGlvbnNcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZFdyaXRlKHVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZChnZXRGaWxlc0Z1bmN0aW9uKTtcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZChhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgLy8gRXhwbGljaXRseSBncmFudCBQdXRPYmplY3QgcGVybWlzc2lvbiBmb3IgcHJlc2lnbmVkIFVSTCBnZW5lcmF0aW9uXHJcbiAgICB1cGxvYWRGdW5jdGlvbi5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAnczM6UHV0T2JqZWN0QWNsJyxcclxuICAgICAgICAnczM6R2V0T2JqZWN0JyxcclxuICAgICAgICAnczM6RGVsZXRlT2JqZWN0J1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtgJHtmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXRBcm59LypgXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEdyYW50IFNRUyBwZXJtaXNzaW9ucyB0byBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICBhbmFseXNpc1F1ZXVlLmdyYW50U2VuZE1lc3NhZ2VzKHVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIGFuYWx5c2lzUXVldWUuZ3JhbnRDb25zdW1lTWVzc2FnZXMoYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IEFQSSBHQVRFV0FZID09PT09PT09PT09PVxyXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuSHR0cEFwaSh0aGlzLCAnTWlzcmFBUEknLCB7XHJcbiAgICAgIGFwaU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIEFQSScsXHJcbiAgICAgIGNvcnNQcmVmbGlnaHQ6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IFsnKiddLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogW2FwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuR0VULCBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLlBPU1QsIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUFVULCBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkRFTEVURSwgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5PUFRJT05TLCBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLlBBVENIXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BbXotRGF0ZScsICdYLUFwaS1LZXknLCAnWC1BbXotU2VjdXJpdHktVG9rZW4nLCAnWC1Db3JyZWxhdGlvbi1JRCcsICdYLVJlcXVlc3RlZC1XaXRoJ10sXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEpXVCBBdXRob3JpemVyXHJcbiAgICBjb25zdCBqd3RBdXRob3JpemVyID0gbmV3IGF1dGhvcml6ZXJzLkh0dHBKd3RBdXRob3JpemVyKCdKd3RBdXRob3JpemVyJywgYGh0dHBzOi8vY29nbml0by1pZHAuJHt0aGlzLnJlZ2lvbn0uYW1hem9uYXdzLmNvbS8ke2NvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWR9YCwge1xyXG4gICAgICBqd3RBdWRpZW5jZTogW2NvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRdXHJcbiAgICB9IGFzIGFueSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IEFQSSBST1VURVMgPT09PT09PT09PT09XHJcbiAgICBcclxuICAgIC8vIENhdGNoLWFsbCBPUFRJT05TIHJvdXRlIGZvciBDT1JTIHByZWZsaWdodFxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcve3Byb3h5K30nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLk9QVElPTlNdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NhdGNoQWxsT3B0aW9uc0ludGVncmF0aW9uJywgb3B0aW9uc0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGggcm91dGVzIChubyBhdXRob3JpemF0aW9uIHJlcXVpcmVkKVxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9yZWdpc3RlcicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVnaXN0ZXJJbnRlZ3JhdGlvbicsIHJlZ2lzdGVyRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9sb2dpbicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignTG9naW5JbnRlZ3JhdGlvbicsIGxvZ2luRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC92ZXJpZnktb3RwJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdWZXJpZnlPdHBJbnRlZ3JhdGlvbicsIHZlcmlmeU90cEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvZmV0Y2gtb3RwJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdGZXRjaE90cEludGVncmF0aW9uJywgZmV0Y2hPdHBGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL2F1dG8tbG9naW4nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0F1dG9Mb2dpbkludGVncmF0aW9uJywgYXV0b0xvZ2luRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvdGVjdGVkIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9wcm9maWxlJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2ZpbGVJbnRlZ3JhdGlvbicsIGdldFByb2ZpbGVGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGp3dEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcy91cGxvYWQnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwbG9hZEludGVncmF0aW9uJywgdXBsb2FkRnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiBqd3RBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RmlsZXNJbnRlZ3JhdGlvbicsIGdldEZpbGVzRnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiBqd3RBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMve2ZpbGVJZH0vc3RhdHVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEZpbGVTdGF0dXNJbnRlZ3JhdGlvbicsIGdldEZpbGVTdGF0dXNGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGp3dEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9hbmFseXplJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBbmFseXplSW50ZWdyYXRpb24nLCBhbmFseXplRmlsZUZ1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogand0QXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3Jlc3VsdHMve2ZpbGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UmVzdWx0c0ludGVncmF0aW9uJywgZ2V0QW5hbHlzaXNSZXN1bHRzRnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiBqd3RBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gV29ya2Zsb3cgcm91dGVzIChubyBhdXRob3JpemF0aW9uIHJlcXVpcmVkIGZvciBzdGFydCwgYnV0IGdldC1wcm9ncmVzcyBpcyBwdWJsaWMpXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy93b3JrZmxvdy9zdGFydCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignU3RhcnRXb3JrZmxvd0ludGVncmF0aW9uJywgc3RhcnRXb3JrZmxvd0Z1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3dvcmtmbG93L3Byb2dyZXNzL3t3b3JrZmxvd0lkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQcm9ncmVzc0ludGVncmF0aW9uJywgZ2V0UHJvZ3Jlc3NGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyA9PT09PT09PT09PT0gT1VUUFVUUyA9PT09PT09PT09PT1cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBUElFbmRwb2ludCcsIHtcclxuICAgICAgdmFsdWU6IGFwaS51cmwhLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIEFQSSBFbmRwb2ludCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29nbml0b1VzZXJQb29sSWQnLCB7XHJcbiAgICAgIHZhbHVlOiBjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDb2duaXRvQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiBjb2duaXRvQXV0aC51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gQ2xpZW50IElEJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldE91dHB1dCcsIHtcclxuICAgICAgdmFsdWU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgRmlsZSBTdG9yYWdlIEJ1Y2tldCcsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19