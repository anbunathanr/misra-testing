import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import * as path from 'path';
import { CognitoAuth } from './cognito-auth';

/**
 * AI Test Generation Stack
 * 
 * Complete AI test generation infrastructure deployed as a separate stack
 * to avoid CDK issues in the main MisraPlatformStack.
 */
export class MinimalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Cognito User Pool for authentication
    const cognitoAuth = new CognitoAuth(this, 'CognitoAuth', {
      namePrefix: 'aibts',
      emailVerification: true,
      selfSignUpEnabled: true,
      passwordMinLength: 8,
    });

    // Reference OpenAI API Key secret (create manually or via AWS Console)
    // To create: aws secretsmanager create-secret --name aibts/openai-api-key --secret-string "sk-YOUR-KEY"
    const openAiSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'OpenAISecret',
      'aibts/openai-api-key'
    );

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
    const testCasesTable = dynamodb.Table.fromTableName(
      this,
      'TestCasesTable',
      'TestCases'
    );

    // Use public Chromium Lambda Layer (alternative to building our own)
    // This is a well-maintained public layer for @sparticuz/chromium
    // ARN format: arn:aws:lambda:{region}:764866452798:layer:chrome-aws-lambda:latest
    // For production, pin to a specific version instead of 'latest'
    const chromiumLayerArn = `arn:aws:lambda:${cdk.Stack.of(this).region}:764866452798:layer:chrome-aws-lambda:45`;
    const chromiumLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      'ChromiumLayer',
      chromiumLayerArn
    );

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
    const cognitoAuthorizer = new authorizers.HttpUserPoolAuthorizer(
      'CognitoAuthorizer',
      cognitoAuth.userPool,
      {
        userPoolClients: [cognitoAuth.userPoolClient],
        identitySource: ['$request.header.Authorization'],
      }
    );

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
      value: api.url!,
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
