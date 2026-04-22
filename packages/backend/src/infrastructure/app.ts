#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import * as path from 'path';
import { CognitoAuth } from './cognito-auth';

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
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1),
      },
    });

    // Create JWT Authorizer
    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer('JwtAuthorizer', `https://cognito-idp.${this.region}.amazonaws.com/${cognitoAuth.userPool.userPoolId}`, {
      audience: [cognitoAuth.userPoolClient.userPoolClientId],
    });

    // ============ API ROUTES ============
    
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

    new cdk.CfnOutput(this, 'FileStorageBucket', {
      value: fileStorageBucket.bucketName,
      description: 'S3 File Storage Bucket',
    });
  }
}

const app = new cdk.App();

new MisraPlatformMVPStack(app, 'MisraPlatformMVPStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

app.synth();
