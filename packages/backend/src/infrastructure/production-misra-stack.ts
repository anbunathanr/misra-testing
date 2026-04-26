import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { CognitoAuth } from './cognito-auth';

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
export class ProductionMisraStack extends cdk.Stack {
  public usersTable: dynamodb.Table;
  public fileMetadataTable: dynamodb.Table;
  public analysisResultsTable: dynamodb.Table;
  public sampleFilesTable: dynamodb.Table;
  public progressTable: dynamodb.Table;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ============ AUTHENTICATION ============
    const cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
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
        FILE_METADATA_TABLE: this.fileMetadataTable.tableName,
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
    this.fileMetadataTable.grantReadData(getAnalysisResultsFunction);
    
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
    } as any);

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
      value: api.url!,
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
