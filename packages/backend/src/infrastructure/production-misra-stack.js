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
        // Add GSI for file-based queries (used by verification loop and get-analysis-results)
        this.analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'FileIndex',
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
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
        // OTP table for generate-otp function
        const otpTable = new dynamodb.Table(this, 'OTPTable', {
            tableName: 'OTP',
            partitionKey: { name: 'otpId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            timeToLiveAttribute: 'ttl', // Auto-delete after 10 minutes
        });
        // Add GSI for email-based queries
        otpTable.addGlobalSecondaryIndex({
            indexName: 'EmailIndex',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
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
                OTP_TABLE_NAME: 'OTP',
                SES_FROM_EMAIL: 'noreply@misra-platform.com',
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
        // Auth: Generate OTP (sends fresh OTP via email)
        const generateOtpFunction = new lambdaNodejs.NodejsFunction(this, 'GenerateOtpFunction', {
            functionName: 'misra-platform-auth-generate-otp',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/generate-otp.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                OTP_TABLE_NAME: 'OTP',
                SES_FROM_EMAIL: 'noreply@misra-platform.com',
            },
        });
        // Auth: Verify OTP (Email-based)
        const verifyOtpEmailFunction = new lambdaNodejs.NodejsFunction(this, 'VerifyOtpEmailFunction', {
            functionName: 'misra-platform-auth-verify-otp-email',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/verify-otp-email.ts'),
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
                OTP_TABLE_NAME: 'OTP',
                USERS_TABLE_NAME: this.usersTable.tableName,
            },
        });
        // Auth: Auto Verify OTP (Automatic verification without user input)
        const autoVerifyOtpFunction = new lambdaNodejs.NodejsFunction(this, 'AutoVerifyOtpFunction', {
            functionName: 'misra-platform-auth-auto-verify-otp',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/auto-verify-otp.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(60), // Longer timeout for polling
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                COGNITO_USER_POOL_ID: cognitoAuth.userPool.userPoolId,
                COGNITO_CLIENT_ID: cognitoAuth.userPoolClient.userPoolClientId,
                OTP_TABLE_NAME: 'OTP',
                USERS_TABLE_NAME: this.usersTable.tableName,
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
        // Auth: Resend OTP (for existing users)
        const resendOtpFunction = new lambdaNodejs.NodejsFunction(this, 'ResendOtpFunction', {
            functionName: 'misra-platform-auth-resend-otp',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/auth/resend-otp.ts'),
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
                OTP_TABLE_NAME: 'OTP',
                SES_FROM_EMAIL: 'noreply@misra-platform.com',
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
        // File: Queue Analysis (after S3 upload completes)
        const queueAnalysisFunction = new lambdaNodejs.NodejsFunction(this, 'QueueAnalysisFunction', {
            functionName: 'misra-platform-file-queue-analysis',
            runtime: lambda.Runtime.NODEJS_20_X,
            entry: path.join(__dirname, '../functions/file/queue-analysis.ts'),
            handler: 'handler',
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            bundling: {
                minify: true,
                sourceMap: false,
                externalModules: ['@aws-sdk/*'],
            },
            environment: {
                ANALYSIS_QUEUE_URL: analysisQueue.queueUrl,
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
                CACHE_BUSTER: '2024-04-25-fileindex-gsi-added', // Force Lambda code reload
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
        // Grant OTP table permissions to register function
        otpTable.grantReadWriteData(registerFunction);
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
        // Grant SES permissions to register function for OTP email
        registerFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail'
            ],
            resources: ['*']
        }));
        loginFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge',
                'cognito-idp:AssociateSoftwareToken'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        // Grant SES and DynamoDB permissions to generate-otp function
        generateOtpFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'ses:SendEmail',
                'ses:SendRawEmail'
            ],
            resources: ['*']
        }));
        otpTable.grantReadWriteData(generateOtpFunction);
        // Grant permissions to resend-otp function
        resendOtpFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminGetUser',
                'ses:SendEmail',
                'ses:SendRawEmail'
            ],
            resources: ['*']
        }));
        otpTable.grantReadWriteData(resendOtpFunction);
        // Grant permissions to verify-otp-email function
        verifyOtpEmailFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        otpTable.grantReadData(verifyOtpEmailFunction);
        this.usersTable.grantReadData(verifyOtpEmailFunction);
        // Grant permissions to auto-verify-otp function
        autoVerifyOtpFunction.role?.addToPrincipalPolicy(new iam.PolicyStatement({
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminInitiateAuth',
                'cognito-idp:AdminRespondToAuthChallenge'
            ],
            resources: [cognitoAuth.userPool.userPoolArn]
        }));
        otpTable.grantReadWriteData(autoVerifyOtpFunction);
        this.usersTable.grantReadData(autoVerifyOtpFunction);
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
        analysisQueue.grantSendMessages(queueAnalysisFunction);
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
            path: '/auth/generate-otp',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('GenerateOtpIntegration', generateOtpFunction),
        });
        api.addRoutes({
            path: '/auth/resend-otp',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('ResendOtpIntegration', resendOtpFunction),
        });
        api.addRoutes({
            path: '/auth/verify-otp',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('VerifyOtpIntegration', verifyOtpFunction),
        });
        api.addRoutes({
            path: '/auth/verify-otp-email',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('VerifyOtpEmailIntegration', verifyOtpEmailFunction),
        });
        api.addRoutes({
            path: '/auth/auto-verify-otp',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AutoVerifyOtpIntegration', autoVerifyOtpFunction),
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
            path: '/files/queue-analysis',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('QueueAnalysisIntegration', queueAnalysisFunction),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdGlvbi1taXNyYS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2R1Y3Rpb24tbWlzcmEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCwrREFBaUQ7QUFDakQsNEVBQThEO0FBQzlELHlFQUEyRDtBQUMzRCx3RkFBMEU7QUFDMUUsc0ZBQXdFO0FBQ3hFLHVEQUF5QztBQUN6Qyx5REFBMkM7QUFDM0MseUZBQTJFO0FBQzNFLHlEQUEyQztBQUMzQywyQ0FBNkI7QUFDN0IsaURBQTZDO0FBRTdDOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsVUFBVSxDQUFpQjtJQUMzQixpQkFBaUIsQ0FBaUI7SUFDbEMsb0JBQW9CLENBQWlCO0lBQ3JDLGdCQUFnQixDQUFpQjtJQUNqQyxhQUFhLENBQWlCO0lBRXJDLFlBQVksS0FBYyxFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM1RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QiwyQ0FBMkM7UUFDM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDdkQsVUFBVSxFQUFFLE9BQU87WUFDbkIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGlCQUFpQixFQUFFLENBQUM7U0FDckIsQ0FBQyxDQUFDO1FBRUgsNENBQTRDO1FBQzVDLGNBQWM7UUFDZCxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3ZELFNBQVMsRUFBRSxPQUFPO1lBQ2xCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFB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QUM7SUFDTCxDQUFDO0NBQ0Y7QUEvMkJELG9EQSsyQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYU5vZGVqcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLW5vZGVqcyc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mic7XHJcbmltcG9ydCAqIGFzIGludGVncmF0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCAqIGFzIGF1dGhvcml6ZXJzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYUV2ZW50U291cmNlcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IENvZ25pdG9BdXRoIH0gZnJvbSAnLi9jb2duaXRvLWF1dGgnO1xyXG5cclxuLyoqXHJcbiAqIFByb2R1Y3Rpb24gTUlTUkEgUGxhdGZvcm0gU3RhY2tcclxuICogXHJcbiAqIENvbXBsZXRlIHByb2R1Y3Rpb24tcmVhZHkgaW5mcmFzdHJ1Y3R1cmUgZm9yIE1JU1JBIGFuYWx5c2lzOlxyXG4gKiAtIEF1dGhlbnRpY2F0aW9uIChDb2duaXRvKVxyXG4gKiAtIEZpbGUgdXBsb2FkL3JldHJpZXZhbCAoUzMgKyBMYW1iZGEpXHJcbiAqIC0gTUlTUkEgYW5hbHlzaXMgKExhbWJkYSlcclxuICogLSBSZXN1bHRzIHN0b3JhZ2UgKER5bmFtb0RCKVxyXG4gKiAtIEFQSSBHYXRld2F5IHdpdGggQ09SU1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFByb2R1Y3Rpb25NaXNyYVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBwdWJsaWMgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgcHVibGljIGZpbGVNZXRhZGF0YVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBwdWJsaWMgYW5hbHlzaXNSZXN1bHRzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHB1YmxpYyBzYW1wbGVGaWxlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBwdWJsaWMgcHJvZ3Jlc3NUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBjZGsuQXBwLCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyA9PT09PT09PT09PT0gQVVUSEVOVElDQVRJT04gPT09PT09PT09PT09XHJcbiAgICBjb25zdCBjb2duaXRvQXV0aCA9IG5ldyBDb2duaXRvQXV0aCh0aGlzLCAnQ29nbml0b0F1dGgnLCB7XHJcbiAgICAgIG5hbWVQcmVmaXg6ICdtaXNyYScsXHJcbiAgICAgIGVtYWlsVmVyaWZpY2F0aW9uOiB0cnVlLFxyXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgcGFzc3dvcmRNaW5MZW5ndGg6IDgsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyA9PT09PT09PT09PT0gRFlOQU1PREIgVEFCTEVTID09PT09PT09PT09PVxyXG4gICAgLy8gVXNlcnMgdGFibGVcclxuICAgIHRoaXMudXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnVXNlcnMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgbWV0YWRhdGEgdGFibGVcclxuICAgIHRoaXMuZmlsZU1ldGFkYXRhVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0ZpbGVNZXRhZGF0YVRhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdGaWxlTWV0YWRhdGEnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2ZpbGVJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIHJlc3VsdHMgdGFibGVcclxuICAgIHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0FuYWx5c2lzUmVzdWx0c1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdBbmFseXNpc1Jlc3VsdHMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2FuYWx5c2lzSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBmaWxlLWJhc2VkIHF1ZXJpZXMgKHVzZWQgYnkgdmVyaWZpY2F0aW9uIGxvb3AgYW5kIGdldC1hbmFseXNpcy1yZXN1bHRzKVxyXG4gICAgdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0ZpbGVJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZmlsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXItYmFzZWQgcXVlcmllc1xyXG4gICAgdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTYW1wbGUgZmlsZXMgdGFibGVcclxuICAgIHRoaXMuc2FtcGxlRmlsZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnU2FtcGxlRmlsZXNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnU2FtcGxlRmlsZXMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2ZpbGVJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFByb2dyZXNzIHRyYWNraW5nIHRhYmxlXHJcbiAgICB0aGlzLnByb2dyZXNzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Byb2dyZXNzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ0FuYWx5c2lzUHJvZ3Jlc3MnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2FuYWx5c2lzSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyBjb3N0cyB0cmFja2luZyB0YWJsZVxyXG4gICAgY29uc3QgYW5hbHlzaXNDb3N0c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBbmFseXNpc0Nvc3RzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ0FuYWx5c2lzQ29zdHMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE9UUCBzdG9yYWdlIHRhYmxlIChmb3Igd2ViaG9vay1iYXNlZCBPVFAgY2FwdHVyZSlcclxuICAgIGNvbnN0IG90cFN0b3JhZ2VUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnT1RQU3RvcmFnZVRhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdPVFBTdG9yYWdlJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdlbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsIC8vIEF1dG8tZGVsZXRlIGFmdGVyIDE1IG1pbnV0ZXNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE9UUCB0YWJsZSBmb3IgZ2VuZXJhdGUtb3RwIGZ1bmN0aW9uXHJcbiAgICBjb25zdCBvdHBUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnT1RQVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ09UUCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnb3RwSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdlbWFpbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogJ3R0bCcsIC8vIEF1dG8tZGVsZXRlIGFmdGVyIDEwIG1pbnV0ZXNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIGVtYWlsLWJhc2VkIHF1ZXJpZXNcclxuICAgIG90cFRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnRW1haWxJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IFMzIEJVQ0tFVCA9PT09PT09PT09PT1cclxuICAgIGNvbnN0IGZpbGVTdG9yYWdlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGBtaXNyYS1maWxlcy0ke3RoaXMuYWNjb3VudH0tJHt0aGlzLnJlZ2lvbn1gLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIHZlcnNpb25lZDogZmFsc2UsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgICBjb3JzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsIHMzLkh0dHBNZXRob2RzLlBVVCwgczMuSHR0cE1ldGhvZHMuUE9TVCwgczMuSHR0cE1ldGhvZHMuSEVBRCwgczMuSHR0cE1ldGhvZHMuREVMRVRFXSxcclxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSxcclxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcclxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbJ0VUYWcnLCAneC1hbXotdmVyc2lvbi1pZCddLFxyXG4gICAgICAgICAgbWF4QWdlOiA4NjQwMCwgLy8gMjQgaG91cnMgaW4gc2Vjb25kc1xyXG4gICAgICAgIH1cclxuICAgICAgXVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IFNRUyBRVUVVRSBGT1IgQU5BTFlTSVMgPT09PT09PT09PT09XHJcbiAgICBjb25zdCBhbmFseXNpc1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnQW5hbHlzaXNRdWV1ZScsIHtcclxuICAgICAgcXVldWVOYW1lOiAnbWlzcmEtYW5hbHlzaXMtcXVldWUnLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vID09PT09PT09PT09PSBMQU1CREEgRlVOQ1RJT05TID09PT09PT09PT09PVxyXG4gICAgXHJcbiAgICAvLyBBdXRoOiBSZWdpc3RlclxyXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtcmVnaXN0ZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9yZWdpc3Rlci50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ09HTklUT19DTElFTlRfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgVVNFUlNfVEFCTEU6IHRoaXMudXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1RQX1RBQkxFX05BTUU6ICdPVFAnLFxyXG4gICAgICAgIFNFU19GUk9NX0VNQUlMOiAnbm9yZXBseUBtaXNyYS1wbGF0Zm9ybS5jb20nLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogTG9naW5cclxuICAgIGNvbnN0IGxvZ2luRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdMb2dpbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hdXRoLWxvZ2luJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvbG9naW4udHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENPR05JVE9fVVNFUl9QT09MX0lEOiBjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIENPR05JVE9fQ0xJRU5UX0lEOiBjb2duaXRvQXV0aC51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogR2VuZXJhdGUgT1RQIChzZW5kcyBmcmVzaCBPVFAgdmlhIGVtYWlsKVxyXG4gICAgY29uc3QgZ2VuZXJhdGVPdHBGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dlbmVyYXRlT3RwRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtZ2VuZXJhdGUtb3RwJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvZ2VuZXJhdGUtb3RwLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBPVFBfVEFCTEVfTkFNRTogJ09UUCcsXHJcbiAgICAgICAgU0VTX0ZST01fRU1BSUw6ICdub3JlcGx5QG1pc3JhLXBsYXRmb3JtLmNvbScsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBWZXJpZnkgT1RQIChFbWFpbC1iYXNlZClcclxuICAgIGNvbnN0IHZlcmlmeU90cEVtYWlsRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdWZXJpZnlPdHBFbWFpbEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hdXRoLXZlcmlmeS1vdHAtZW1haWwnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC92ZXJpZnktb3RwLWVtYWlsLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICBDT0dOSVRPX0NMSUVOVF9JRDogY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICBPVFBfVEFCTEVfTkFNRTogJ09UUCcsXHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdGhpcy51c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IEF1dG8gVmVyaWZ5IE9UUCAoQXV0b21hdGljIHZlcmlmaWNhdGlvbiB3aXRob3V0IHVzZXIgaW5wdXQpXHJcbiAgICBjb25zdCBhdXRvVmVyaWZ5T3RwRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdBdXRvVmVyaWZ5T3RwRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWF1dGgtYXV0by12ZXJpZnktb3RwJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvYXV0by12ZXJpZnktb3RwLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAvLyBMb25nZXIgdGltZW91dCBmb3IgcG9sbGluZ1xyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICBDT0dOSVRPX0NMSUVOVF9JRDogY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICBPVFBfVEFCTEVfTkFNRTogJ09UUCcsXHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdGhpcy51c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IFZlcmlmeSBPVFAgKENvZ25pdG8pXHJcbiAgICBjb25zdCB2ZXJpZnlPdHBGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1ZlcmlmeU90cEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hdXRoLXZlcmlmeS1vdHAnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC92ZXJpZnktb3RwLWNvZ25pdG8udHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENPR05JVE9fVVNFUl9QT09MX0lEOiBjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIENPR05JVE9fQ0xJRU5UX0lEOiBjb2duaXRvQXV0aC51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogR2V0IFByb2ZpbGVcclxuICAgIGNvbnN0IGdldFByb2ZpbGVGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0dldFByb2ZpbGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC1nZXQtcHJvZmlsZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hdXRoL2dldC1wcm9maWxlLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRTogdGhpcy51c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1dGg6IEF1dGhvcml6ZXJcclxuICAgIGNvbnN0IGF1dGhvcml6ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0F1dGhvcml6ZXJGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC1hdXRob3JpemVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvYXV0aG9yaXplci50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBPUFRJT05TIChDT1JTIHByZWZsaWdodCBoYW5kbGVyKVxyXG4gICAgY29uc3Qgb3B0aW9uc0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnT3B0aW9uc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hdXRoLW9wdGlvbnMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9vcHRpb25zLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDEyOCxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogUmVzZW5kIE9UUCAoZm9yIGV4aXN0aW5nIHVzZXJzKVxyXG4gICAgY29uc3QgcmVzZW5kT3RwRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdSZXNlbmRPdHBGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC1yZXNlbmQtb3RwJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvcmVzZW5kLW90cC50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgT1RQX1RBQkxFX05BTUU6ICdPVFAnLFxyXG4gICAgICAgIFNFU19GUk9NX0VNQUlMOiAnbm9yZXBseUBtaXNyYS1wbGF0Zm9ybS5jb20nLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogRmV0Y2ggT1RQXHJcbiAgICBjb25zdCBmZXRjaE90cEZ1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnRmV0Y2hPdHBGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC1mZXRjaC1vdHAnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvYXV0aC9mZXRjaC1vdHAudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aDogQXV0by1Mb2dpblxyXG4gICAgY29uc3QgYXV0b0xvZ2luRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdBdXRvTG9naW5GdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC1hdXRvLWxvZ2luJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2F1dGgvYXV0by1sb2dpbi50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQ09HTklUT19VU0VSX1BPT0xfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgQ09HTklUT19DTElFTlRfSUQ6IGNvZ25pdG9BdXRoLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRoOiBPVFAgV2ViaG9vayAocmVjZWl2ZXMgT1RQIGVtYWlscyBmcm9tIFNFUylcclxuICAgIGNvbnN0IG90cFdlYmhvb2tGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ09UUFdlYmhvb2tGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aC1vdHAtd2ViaG9vaycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hdXRoL290cC13ZWJob29rLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBPVFBfU1RPUkFHRV9UQUJMRTogJ09UUFN0b3JhZ2UnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZTogVXBsb2FkXHJcbiAgICBjb25zdCB1cGxvYWRGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ1VwbG9hZEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1maWxlLXVwbG9hZCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9maWxlL3VwbG9hZC50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRklMRV9NRVRBREFUQV9UQUJMRTogdGhpcy5maWxlTWV0YWRhdGFUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfUVVFVUVfVVJMOiBhbmFseXNpc1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZTogR2V0IEZpbGVzXHJcbiAgICBjb25zdCBnZXRGaWxlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnR2V0RmlsZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZmlsZS1nZXQtZmlsZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvZmlsZS9nZXQtZmlsZXMudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFOiB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGU6IEdldCBGaWxlIFN0YXR1c1xyXG4gICAgY29uc3QgZ2V0RmlsZVN0YXR1c0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnR2V0RmlsZVN0YXR1c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1maWxlLWdldC1zdGF0dXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvZmlsZS9nZXQtZmlsZS1zdGF0dXMudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IHRoaXMuZmlsZU1ldGFkYXRhVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEFOQUxZU0lTX1JFU1VMVFNfVEFCTEU6IHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZTogUXVldWUgQW5hbHlzaXMgKGFmdGVyIFMzIHVwbG9hZCBjb21wbGV0ZXMpXHJcbiAgICBjb25zdCBxdWV1ZUFuYWx5c2lzRnVuY3Rpb24gPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdRdWV1ZUFuYWx5c2lzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWZpbGUtcXVldWUtYW5hbHlzaXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLi9mdW5jdGlvbnMvZmlsZS9xdWV1ZS1hbmFseXNpcy50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQU5BTFlTSVNfUVVFVUVfVVJMOiBhbmFseXNpc1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXM6IEFuYWx5emUgRmlsZVxyXG4gICAgY29uc3QgYW5hbHl6ZUZpbGVGdW5jdGlvbiA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0FuYWx5emVGaWxlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLWFuYWx5emUtZmlsZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy9hbmFseXNpcy9hbmFseXplLWZpbGUudHMnKSxcclxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcclxuICAgICAgYnVuZGxpbmc6IHtcclxuICAgICAgICBtaW5pZnk6IHRydWUsXHJcbiAgICAgICAgc291cmNlTWFwOiBmYWxzZSxcclxuICAgICAgICBleHRlcm5hbE1vZHVsZXM6IFsnQGF3cy1zZGsvKiddLFxyXG4gICAgICB9LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFOiB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFOiB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19DT1NUU19UQUJMRTogYW5hbHlzaXNDb3N0c1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBDQUNIRV9CVVNURVI6ICcyMDI0LTA0LTI1LWZpbGVpbmRleC1nc2ktYWRkZWQnLCAvLyBGb3JjZSBMYW1iZGEgY29kZSByZWxvYWRcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IEZJTEVfTUVUQURBVEFfVEFCTEUgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyB0byBhbmFseXplRmlsZUZ1bmN0aW9uXHJcbiAgICB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBDb25uZWN0IFNRUyBxdWV1ZSB0byBhbmFseXplIGZ1bmN0aW9uXHJcbiAgICBhbmFseXplRmlsZUZ1bmN0aW9uLmFkZEV2ZW50U291cmNlKG5ldyBsYW1iZGFFdmVudFNvdXJjZXMuU3FzRXZlbnRTb3VyY2UoYW5hbHlzaXNRdWV1ZSwge1xyXG4gICAgICBiYXRjaFNpemU6IDEsXHJcbiAgICAgIG1heENvbmN1cnJlbmN5OiAxMCxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBBbmFseXNpczogR2V0IFJlc3VsdHNcclxuICAgIGNvbnN0IGdldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnR2V0QW5hbHlzaXNSZXN1bHRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLWdldC1yZXN1bHRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL2FuYWx5c2lzL2dldC1hbmFseXNpcy1yZXN1bHRzLnRzJyksXHJcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFOiB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdvcmtmbG93OiBTdGFydCBXb3JrZmxvd1xyXG4gICAgY29uc3Qgc3RhcnRXb3JrZmxvd0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnU3RhcnRXb3JrZmxvd0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS13b3JrZmxvdy1zdGFydCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uL2Z1bmN0aW9ucy93b3JrZmxvdy9zdGFydC13b3JrZmxvdy50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgbWluaWZ5OiB0cnVlLFxyXG4gICAgICAgIHNvdXJjZU1hcDogZmFsc2UsXHJcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSxcclxuICAgICAgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDT0dOSVRPX1VTRVJfUE9PTF9JRDogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgICBDT0dOSVRPX0NMSUVOVF9JRDogY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBXb3JrZmxvdzogR2V0IFByb2dyZXNzXHJcbiAgICBjb25zdCBnZXRQcm9ncmVzc0Z1bmN0aW9uID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnR2V0UHJvZ3Jlc3NGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0td29ya2Zsb3ctZ2V0LXByb2dyZXNzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGVudHJ5OiBwYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vZnVuY3Rpb25zL3dvcmtmbG93L2dldC1wcm9ncmVzcy50cycpLFxyXG4gICAgICBoYW5kbGVyOiAnaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBidW5kbGluZzoge1xyXG4gICAgICAgIG1pbmlmeTogdHJ1ZSxcclxuICAgICAgICBzb3VyY2VNYXA6IGZhbHNlLFxyXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyA9PT09PT09PT09PT0gUEVSTUlTU0lPTlMgPT09PT09PT09PT09XHJcbiAgICB0aGlzLnVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJlZ2lzdGVyRnVuY3Rpb24pO1xyXG4gICAgdGhpcy51c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0UHJvZmlsZUZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgLy8gR3JhbnQgT1RQIHRhYmxlIHBlcm1pc3Npb25zIHRvIHJlZ2lzdGVyIGZ1bmN0aW9uXHJcbiAgICBvdHBUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmVnaXN0ZXJGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEdyYW50IENvZ25pdG8gcGVybWlzc2lvbnMgdG8gYXV0aCBmdW5jdGlvbnNcclxuICAgIHJlZ2lzdGVyRnVuY3Rpb24ucm9sZT8uYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ3JlYXRlVXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluU2V0VXNlclBhc3N3b3JkJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gR3JhbnQgU0VTIHBlcm1pc3Npb25zIHRvIHJlZ2lzdGVyIGZ1bmN0aW9uIGZvciBPVFAgZW1haWxcclxuICAgIHJlZ2lzdGVyRnVuY3Rpb24ucm9sZT8uYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxyXG4gICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddXHJcbiAgICB9KSk7XHJcblxyXG4gICAgbG9naW5GdW5jdGlvbi5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5Jbml0aWF0ZUF1dGgnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblJlc3BvbmRUb0F1dGhDaGFsbGVuZ2UnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBc3NvY2lhdGVTb2Z0d2FyZVRva2VuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbEFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBHcmFudCBTRVMgYW5kIER5bmFtb0RCIHBlcm1pc3Npb25zIHRvIGdlbmVyYXRlLW90cCBmdW5jdGlvblxyXG4gICAgZ2VuZXJhdGVPdHBGdW5jdGlvbi5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnc2VzOlNlbmRFbWFpbCcsXHJcbiAgICAgICAgJ3NlczpTZW5kUmF3RW1haWwnXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ11cclxuICAgIH0pKTtcclxuXHJcbiAgICBvdHBUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2VuZXJhdGVPdHBGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gcmVzZW5kLW90cCBmdW5jdGlvblxyXG4gICAgcmVzZW5kT3RwRnVuY3Rpb24ucm9sZT8uYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICAgJ3NlczpTZW5kRW1haWwnLFxyXG4gICAgICAgICdzZXM6U2VuZFJhd0VtYWlsJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddXHJcbiAgICB9KSk7XHJcblxyXG4gICAgb3RwVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHJlc2VuZE90cEZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byB2ZXJpZnktb3RwLWVtYWlsIGZ1bmN0aW9uXHJcbiAgICB2ZXJpZnlPdHBFbWFpbEZ1bmN0aW9uLnJvbGU/LmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkluaXRpYXRlQXV0aCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICB9KSk7XHJcblxyXG4gICAgb3RwVGFibGUuZ3JhbnRSZWFkRGF0YSh2ZXJpZnlPdHBFbWFpbEZ1bmN0aW9uKTtcclxuICAgIHRoaXMudXNlcnNUYWJsZS5ncmFudFJlYWREYXRhKHZlcmlmeU90cEVtYWlsRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIGF1dG8tdmVyaWZ5LW90cCBmdW5jdGlvblxyXG4gICAgYXV0b1ZlcmlmeU90cEZ1bmN0aW9uLnJvbGU/LmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkluaXRpYXRlQXV0aCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICB9KSk7XHJcblxyXG4gICAgb3RwVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGF1dG9WZXJpZnlPdHBGdW5jdGlvbik7XHJcbiAgICB0aGlzLnVzZXJzVGFibGUuZ3JhbnRSZWFkRGF0YShhdXRvVmVyaWZ5T3RwRnVuY3Rpb24pO1xyXG5cclxuICAgIHN0YXJ0V29ya2Zsb3dGdW5jdGlvbi5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyUGFzc3dvcmQnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkluaXRpYXRlQXV0aCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZScsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFzc29jaWF0ZVNvZnR3YXJlVG9rZW4nXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW2NvZ25pdG9BdXRoLnVzZXJQb29sLnVzZXJQb29sQXJuXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIHN0YXJ0V29ya2Zsb3dGdW5jdGlvbi5yb2xlPy5hZGRUb1ByaW5jaXBhbFBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFthbmFseXplRmlsZUZ1bmN0aW9uLmZ1bmN0aW9uQXJuXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIHZlcmlmeU90cEZ1bmN0aW9uLnJvbGU/LmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkluaXRpYXRlQXV0aCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluUmVzcG9uZFRvQXV0aENoYWxsZW5nZScsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFzc29jaWF0ZVNvZnR3YXJlVG9rZW4nLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpWZXJpZnlTb2Z0d2FyZVRva2VuJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xBcm5dXHJcbiAgICB9KSk7XHJcblxyXG4gICAgYXV0b0xvZ2luRnVuY3Rpb24ucm9sZT8uYWRkVG9QcmluY2lwYWxQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluSW5pdGlhdGVBdXRoJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5SZXNwb25kVG9BdXRoQ2hhbGxlbmdlJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtjb2duaXRvQXV0aC51c2VyUG9vbC51c2VyUG9vbEFybl1cclxuICAgIH0pKTtcclxuICAgIFxyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBsb2FkRnVuY3Rpb24pO1xyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWREYXRhKGdldEZpbGVzRnVuY3Rpb24pO1xyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWREYXRhKGdldEZpbGVTdGF0dXNGdW5jdGlvbik7XHJcbiAgICB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHl6ZUZpbGVGdW5jdGlvbik7XHJcbiAgICB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0QW5hbHlzaXNSZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGdldEZpbGVTdGF0dXNGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEdyYW50IEFuYWx5c2lzQ29zdHMgdGFibGUgcGVybWlzc2lvbnMgdG8gYW5hbHl6ZUZpbGVGdW5jdGlvblxyXG4gICAgYW5hbHlzaXNDb3N0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgb3RwU3RvcmFnZVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShvdHBXZWJob29rRnVuY3Rpb24pO1xyXG4gICAgb3RwU3RvcmFnZVRhYmxlLmdyYW50UmVhZERhdGEoZmV0Y2hPdHBGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEdyYW50IHByb2dyZXNzIHRhYmxlIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLnByb2dyZXNzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHN0YXJ0V29ya2Zsb3dGdW5jdGlvbik7XHJcbiAgICB0aGlzLnByb2dyZXNzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQcm9ncmVzc0Z1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgLy8gR3JhbnQgUzMgcGVybWlzc2lvbnMgdG8gTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodXBsb2FkRnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkKGdldEZpbGVzRnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkKGFuYWx5emVGaWxlRnVuY3Rpb24pO1xyXG4gICAgXHJcbiAgICAvLyBFeHBsaWNpdGx5IGdyYW50IFB1dE9iamVjdCBwZXJtaXNzaW9uIGZvciBwcmVzaWduZWQgVVJMIGdlbmVyYXRpb25cclxuICAgIHVwbG9hZEZ1bmN0aW9uLnJvbGU/LmFkZFRvUHJpbmNpcGFsUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzpQdXRPYmplY3QnLFxyXG4gICAgICAgICdzMzpQdXRPYmplY3RBY2wnLFxyXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICdzMzpEZWxldGVPYmplY3QnXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW2Ake2ZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldEFybn0vKmBdXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gR3JhbnQgU1FTIHBlcm1pc3Npb25zIHRvIExhbWJkYSBmdW5jdGlvbnNcclxuICAgIGFuYWx5c2lzUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXModXBsb2FkRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNRdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyhxdWV1ZUFuYWx5c2lzRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNRdWV1ZS5ncmFudENvbnN1bWVNZXNzYWdlcyhhbmFseXplRmlsZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyA9PT09PT09PT09PT0gQVBJIEdBVEVXQVkgPT09PT09PT09PT09XHJcbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5IdHRwQXBpKHRoaXMsICdNaXNyYUFQSScsIHtcclxuICAgICAgYXBpTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFwaScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTUlTUkEgUGxhdGZvcm0gQVBJJyxcclxuICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5HRVQsIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUE9TVCwgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QVVQsIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuREVMRVRFLCBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUEFUQ0hdLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbicsICdYLUFtei1EYXRlJywgJ1gtQXBpLUtleScsICdYLUFtei1TZWN1cml0eS1Ub2tlbicsICdYLUNvcnJlbGF0aW9uLUlEJywgJ1gtUmVxdWVzdGVkLVdpdGgnXSxcclxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5ob3VycygyNCksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSldUIEF1dGhvcml6ZXJcclxuICAgIGNvbnN0IGp3dEF1dGhvcml6ZXIgPSBuZXcgYXV0aG9yaXplcnMuSHR0cEp3dEF1dGhvcml6ZXIoJ0p3dEF1dGhvcml6ZXInLCBgaHR0cHM6Ly9jb2duaXRvLWlkcC4ke3RoaXMucmVnaW9ufS5hbWF6b25hd3MuY29tLyR7Y29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZH1gLCB7XHJcbiAgICAgIGp3dEF1ZGllbmNlOiBbY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZF1cclxuICAgIH0gYXMgYW55KTtcclxuXHJcbiAgICAvLyA9PT09PT09PT09PT0gQVBJIFJPVVRFUyA9PT09PT09PT09PT1cclxuICAgIFxyXG4gICAgLy8gQ2F0Y2gtYWxsIE9QVElPTlMgcm91dGUgZm9yIENPUlMgcHJlZmxpZ2h0XHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy97cHJveHkrfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuT1BUSU9OU10sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ2F0Y2hBbGxPcHRpb25zSW50ZWdyYXRpb24nLCBvcHRpb25zRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aCByb3V0ZXMgKG5vIGF1dGhvcml6YXRpb24gcmVxdWlyZWQpXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZ2lzdGVyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdSZWdpc3RlckludGVncmF0aW9uJywgcmVnaXN0ZXJGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL2xvZ2luJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdMb2dpbkludGVncmF0aW9uJywgbG9naW5GdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL2dlbmVyYXRlLW90cCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2VuZXJhdGVPdHBJbnRlZ3JhdGlvbicsIGdlbmVyYXRlT3RwRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9yZXNlbmQtb3RwJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdSZXNlbmRPdHBJbnRlZ3JhdGlvbicsIHJlc2VuZE90cEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvdmVyaWZ5LW90cCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVmVyaWZ5T3RwSW50ZWdyYXRpb24nLCB2ZXJpZnlPdHBGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3ZlcmlmeS1vdHAtZW1haWwnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1ZlcmlmeU90cEVtYWlsSW50ZWdyYXRpb24nLCB2ZXJpZnlPdHBFbWFpbEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvYXV0by12ZXJpZnktb3RwJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBdXRvVmVyaWZ5T3RwSW50ZWdyYXRpb24nLCBhdXRvVmVyaWZ5T3RwRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9mZXRjaC1vdHAnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0ZldGNoT3RwSW50ZWdyYXRpb24nLCBmZXRjaE90cEZ1bmN0aW9uKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvYXV0by1sb2dpbicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQXV0b0xvZ2luSW50ZWdyYXRpb24nLCBhdXRvTG9naW5GdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQcm90ZWN0ZWQgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3Byb2ZpbGUnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJvZmlsZUludGVncmF0aW9uJywgZ2V0UHJvZmlsZUZ1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogand0QXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2ZpbGVzL3VwbG9hZCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBsb2FkSW50ZWdyYXRpb24nLCB1cGxvYWRGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGp3dEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRGaWxlc0ludGVncmF0aW9uJywgZ2V0RmlsZXNGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGp3dEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcy97ZmlsZUlkfS9zdGF0dXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RmlsZVN0YXR1c0ludGVncmF0aW9uJywgZ2V0RmlsZVN0YXR1c0Z1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogand0QXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2ZpbGVzL3F1ZXVlLWFuYWx5c2lzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdRdWV1ZUFuYWx5c2lzSW50ZWdyYXRpb24nLCBxdWV1ZUFuYWx5c2lzRnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiBqd3RBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYW5hbHlzaXMvYW5hbHl6ZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQW5hbHl6ZUludGVncmF0aW9uJywgYW5hbHl6ZUZpbGVGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGp3dEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9yZXN1bHRzL3tmaWxlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogand0QXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFdvcmtmbG93IHJvdXRlcyAobm8gYXV0aG9yaXphdGlvbiByZXF1aXJlZCBmb3Igc3RhcnQsIGJ1dCBnZXQtcHJvZ3Jlc3MgaXMgcHVibGljKVxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvd29ya2Zsb3cvc3RhcnQnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1N0YXJ0V29ya2Zsb3dJbnRlZ3JhdGlvbicsIHN0YXJ0V29ya2Zsb3dGdW5jdGlvbiksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy93b3JrZmxvdy9wcm9ncmVzcy97d29ya2Zsb3dJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJvZ3Jlc3NJbnRlZ3JhdGlvbicsIGdldFByb2dyZXNzRnVuY3Rpb24pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gPT09PT09PT09PT09IE9VVFBVVFMgPT09PT09PT09PT09XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQVBJRW5kcG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiBhcGkudXJsISxcclxuICAgICAgZGVzY3JpcHRpb246ICdNSVNSQSBQbGF0Zm9ybSBBUEkgRW5kcG9pbnQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0NvZ25pdG9Vc2VyUG9vbElkJywge1xyXG4gICAgICB2YWx1ZTogY29nbml0b0F1dGgudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ29nbml0b0NsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogY29nbml0b0F1dGgudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIENsaWVudCBJRCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXRPdXRwdXQnLCB7XHJcbiAgICAgIHZhbHVlOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEZpbGUgU3RvcmFnZSBCdWNrZXQnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==