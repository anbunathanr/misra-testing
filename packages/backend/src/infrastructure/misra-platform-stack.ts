import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class MisraPlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Buckets for file storage
    const fileStorageBucket = new s3.Bucket(this, 'FileStorageBucket', {
      bucketName: `misra-platform-files-${this.account}`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `misra-platform-frontend-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // CloudFront distribution for frontend
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'misra-platform-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Add GSI for organization queries
    usersTable.addGlobalSecondaryIndex({
      indexName: 'organizationId-index',
      partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
    });

    // Add GSI for email queries
    usersTable.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
    });

    const projectsTable = new dynamodb.Table(this, 'ProjectsTable', {
      tableName: 'misra-platform-projects',
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Add GSI for organization-based queries
    projectsTable.addGlobalSecondaryIndex({
      indexName: 'organizationId-createdAt-index',
      partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });

    const analysesTable = new dynamodb.Table(this, 'AnalysesTable', {
      tableName: 'misra-platform-analyses',
      partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Add GSIs for efficient querying
    analysesTable.addGlobalSecondaryIndex({
      indexName: 'projectId-createdAt-index',
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });

    analysesTable.addGlobalSecondaryIndex({
      indexName: 'status-createdAt-index',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
    });

    const testRunsTable = new dynamodb.Table(this, 'TestRunsTable', {
      tableName: 'misra-platform-test-runs',
      partitionKey: { name: 'testRunId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // SQS Queue for async processing
    const processingQueue = new sqs.Queue(this, 'ProcessingQueue', {
      queueName: 'misra-platform-processing',
      visibilityTimeout: cdk.Duration.minutes(15),
      deadLetterQueue: {
        queue: new sqs.Queue(this, 'ProcessingDLQ', {
          queueName: 'misra-platform-processing-dlq',
        }),
        maxReceiveCount: 3,
      },
    });

    // Secrets Manager for JWT keys
    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: 'misra-platform-jwt-secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'jwt' }),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\',
      },
    });

    // Authentication Lambda Functions
    const loginFunction = new lambda.Function(this, 'LoginFunction', {
      functionName: 'misra-platform-login',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'functions/auth/login.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',
        N8N_API_KEY: process.env.N8N_API_KEY || '',
      },
      timeout: cdk.Duration.seconds(30),
    });

    const refreshFunction = new lambda.Function(this, 'RefreshFunction', {
      functionName: 'misra-platform-refresh',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'functions/auth/refresh.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // File Upload Lambda Functions
    const fileUploadFunction = new lambda.Function(this, 'FileUploadFunction', {
      functionName: 'misra-platform-file-upload',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'functions/file/upload.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const uploadCompleteFunction = new lambda.Function(this, 'UploadCompleteFunction', {
      functionName: 'misra-platform-upload-complete',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'functions/file/upload-complete.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        PROCESSING_QUEUE_URL: processingQueue.queueUrl,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant permissions
    usersTable.grantReadWriteData(loginFunction);
    usersTable.grantReadWriteData(refreshFunction);
    jwtSecret.grantRead(loginFunction);
    jwtSecret.grantRead(refreshFunction);
    jwtSecret.grantRead(fileUploadFunction);
    
    // File upload permissions
    fileStorageBucket.grantReadWrite(fileUploadFunction);
    fileStorageBucket.grantRead(uploadCompleteFunction);
    processingQueue.grantSendMessages(uploadCompleteFunction);

    // S3 event notification for upload completion
    fileStorageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(uploadCompleteFunction),
      { prefix: 'uploads/' }
    );

    // API Gateway
    const api = new apigateway.HttpApi(this, 'MisraPlatformApi', {
      apiName: 'misra-platform-api',
      description: 'MISRA Platform REST API',
      corsPreflight: {
        allowOrigins: ['*'],
        allowMethods: [
          apigateway.CorsHttpMethod.GET,
          apigateway.CorsHttpMethod.POST,
          apigateway.CorsHttpMethod.PUT,
          apigateway.CorsHttpMethod.DELETE,
          apigateway.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Add authentication routes
    api.addRoutes({
      path: '/auth/login',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('LoginIntegration', loginFunction),
    });

    api.addRoutes({
      path: '/auth/refresh',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('RefreshIntegration', refreshFunction),
    });

    // Add file upload routes
    api.addRoutes({
      path: '/files/upload',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('FileUploadIntegration', fileUploadFunction),
    });

    // Output important values
    new cdk.CfnOutput(this, 'FileStorageBucketName', {
      value: fileStorageBucket.bucketName,
      description: 'S3 bucket for file storage',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionDomain', {
      value: distribution.distributionDomainName,
      description: 'CloudFront distribution domain',
    });

    new cdk.CfnOutput(this, 'ProcessingQueueUrl', {
      value: processingQueue.queueUrl,
      description: 'SQS queue for processing jobs',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });
  }
}