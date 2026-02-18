import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as apigateway from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';
import { AnalysisWorkflow } from './analysis-workflow';
import { FileMetadataTable } from './file-metadata-table';
import { ProjectsTable } from './projects-table';
import { TestSuitesTable } from './test-suites-table';
import { TestCasesTable } from './test-cases-table';
import { TestExecutionsTable } from './test-executions-table';
import { ScreenshotsBucket } from './screenshots-bucket';
import { NotificationPreferencesTable } from './notification-preferences-table';
import { NotificationTemplatesTable } from './notification-templates-table';
import { NotificationHistoryTable } from './notification-history-table';

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
      websiteErrorDocument: 'index.html',
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
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
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

    // Analysis Results Table for storing detailed MISRA analysis results
    const analysisResultsTable = new dynamodb.Table(this, 'AnalysisResultsTable', {
      tableName: 'misra-platform-analysis-results',
      partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
    });

    // Add GSIs for analysis results queries
    analysisResultsTable.addGlobalSecondaryIndex({
      indexName: 'fileId-timestamp-index',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    analysisResultsTable.addGlobalSecondaryIndex({
      indexName: 'userId-timestamp-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    analysisResultsTable.addGlobalSecondaryIndex({
      indexName: 'ruleSet-timestamp-index',
      partitionKey: { name: 'ruleSet', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    // File Metadata Table for tracking uploaded files and analysis status
    const fileMetadataTable = new FileMetadataTable(this, 'FileMetadataTable', {
      environment: 'dev'
    });

    // Projects Table for Web App Testing System
    const testProjectsTable = new ProjectsTable(this, 'TestProjectsTable');

    // Test Suites Table for Web App Testing System
    const testSuitesTable = new TestSuitesTable(this, 'TestSuitesTable');

    // Test Cases Table for Web App Testing System
    const testCasesTable = new TestCasesTable(this, 'TestCasesTable');

    // Test Executions Table for Web App Testing System
    const testExecutionsTable = new TestExecutionsTable(this, 'TestExecutionsTable');

    // Screenshots Bucket for Test Execution Failures
    const screenshotsBucket = new ScreenshotsBucket(this, 'ScreenshotsBucket', {
      environment: 'dev'
    });

    // Notification System Tables
    const notificationPreferencesTable = new NotificationPreferencesTable(this, 'NotificationPreferencesTable', {
      environment: 'dev'
    });

    const notificationTemplatesTable = new NotificationTemplatesTable(this, 'NotificationTemplatesTable', {
      environment: 'dev'
    });

    const notificationHistoryTable = new NotificationHistoryTable(this, 'NotificationHistoryTable', {
      environment: 'dev'
    });

    // SNS Topics for Notification Delivery
    const emailNotificationTopic = new sns.Topic(this, 'EmailNotificationTopic', {
      topicName: 'aibts-notifications-email',
      displayName: 'AIBTS Email Notifications',
    });

    const smsNotificationTopic = new sns.Topic(this, 'SmsNotificationTopic', {
      topicName: 'aibts-notifications-sms',
      displayName: 'AIBTS SMS Notifications',
    });

    const webhookNotificationTopic = new sns.Topic(this, 'WebhookNotificationTopic', {
      topicName: 'aibts-notifications-webhook',
      displayName: 'AIBTS Webhook Notifications',
    });

    // SQS Queue for notification processing
    const notificationDLQ = new sqs.Queue(this, 'NotificationDLQ', {
      queueName: 'aibts-notification-dlq',
      retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
    });

    const notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
      queueName: 'aibts-notification-queue',
      visibilityTimeout: cdk.Duration.seconds(30), // Match Lambda timeout
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        queue: notificationDLQ,
        maxReceiveCount: 3, // Retry up to 3 times before moving to DLQ
      },
    });

    // EventBridge Rule for Test Completion Events
    // Routes test execution completion events to notification queue
    const testCompletionRule = new events.Rule(this, 'TestCompletionRule', {
      ruleName: 'aibts-test-execution-completion',
      description: 'Routes test execution completion events to notification queue',
      eventPattern: {
        source: ['aibts.test-execution'],
        detailType: ['Test Execution Completed'],
      },
    });

    // Add notification queue as target for test completion events
    testCompletionRule.addTarget(new targets.SqsQueue(notificationQueue));

    // Scheduled Reports Lambda Function
    const scheduledReportsFunction = new lambda.Function(this, 'ScheduledReportsFunction', {
      functionName: 'aibts-scheduled-reports',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/scheduled-reports.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_EXECUTIONS_TABLE: testExecutionsTable.table.tableName,
        NOTIFICATION_QUEUE_URL: notificationQueue.queueUrl,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

    // Grant permissions to scheduled reports function
    testExecutionsTable.table.grantReadData(scheduledReportsFunction);
    notificationQueue.grantSendMessages(scheduledReportsFunction);

    // EventBridge Cron Rules for Scheduled Reports
    // Daily Report - 09:00 UTC daily
    const dailyReportRule = new events.Rule(this, 'DailyReportRule', {
      ruleName: 'aibts-daily-summary-report',
      description: 'Triggers daily test execution summary report',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '9',
      }),
    });
    dailyReportRule.addTarget(new targets.LambdaFunction(scheduledReportsFunction));

    // Weekly Report - 09:00 UTC every Monday
    const weeklyReportRule = new events.Rule(this, 'WeeklyReportRule', {
      ruleName: 'aibts-weekly-summary-report',
      description: 'Triggers weekly test execution summary report',
      schedule: events.Schedule.cron({
        minute: '0',
        hour: '9',
        weekDay: 'MON',
      }),
    });
    weeklyReportRule.addTarget(new targets.LambdaFunction(scheduledReportsFunction));

    // Notification Preferences API Lambda Functions
    const getPreferencesFunction = new lambda.Function(this, 'GetPreferencesFunction', {
      functionName: 'aibts-get-preferences',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/get-preferences.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_PREFERENCES_TABLE: notificationPreferencesTable.table.tableName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const updatePreferencesFunction = new lambda.Function(this, 'UpdatePreferencesFunction', {
      functionName: 'aibts-update-preferences',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/update-preferences.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_PREFERENCES_TABLE: notificationPreferencesTable.table.tableName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Notification History API Lambda Functions
    const getHistoryFunction = new lambda.Function(this, 'GetHistoryFunction', {
      functionName: 'aibts-get-history',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/get-history.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_HISTORY_TABLE: notificationHistoryTable.table.tableName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const getNotificationFunction = new lambda.Function(this, 'GetNotificationFunction', {
      functionName: 'aibts-get-notification',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/get-notification.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_HISTORY_TABLE: notificationHistoryTable.table.tableName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Notification Template API Lambda Functions (Admin Only)
    const createTemplateFunction = new lambda.Function(this, 'CreateTemplateFunction', {
      functionName: 'aibts-create-template',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/create-template.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const updateTemplateFunction = new lambda.Function(this, 'UpdateTemplateFunction', {
      functionName: 'aibts-update-template',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/update-template.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    const getTemplatesFunction = new lambda.Function(this, 'GetTemplatesFunction', {
      functionName: 'aibts-get-templates',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/get-templates.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
    });

    // Grant permissions to notification API functions
    notificationPreferencesTable.table.grantReadData(getPreferencesFunction);
    notificationPreferencesTable.table.grantReadWriteData(updatePreferencesFunction);
    notificationHistoryTable.table.grantReadData(getHistoryFunction);
    notificationHistoryTable.table.grantReadData(getNotificationFunction);
    notificationTemplatesTable.table.grantReadWriteData(createTemplateFunction);
    notificationTemplatesTable.table.grantReadWriteData(updateTemplateFunction);
    notificationTemplatesTable.table.grantReadData(getTemplatesFunction);

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

    // SQS Queue for test execution
    const testExecutionDLQ = new sqs.Queue(this, 'TestExecutionDLQ', {
      queueName: 'misra-platform-test-execution-dlq',
      retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
    });

    const testExecutionQueue = new sqs.Queue(this, 'TestExecutionQueue', {
      queueName: 'misra-platform-test-execution',
      visibilityTimeout: cdk.Duration.minutes(15), // Match Lambda timeout
      receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
      deadLetterQueue: {
        queue: testExecutionDLQ,
        maxReceiveCount: 3, // Retry up to 3 times before moving to DLQ
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
      runtime: lambda.Runtime.NODEJS_20_X,
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
      runtime: lambda.Runtime.NODEJS_20_X,
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
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/file/upload.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
        JWT_SECRET_NAME: jwtSecret.secretName,
        ENVIRONMENT: 'dev',
      },
      timeout: cdk.Duration.seconds(30),
    });

    const uploadCompleteFunction = new lambda.Function(this, 'UploadCompleteFunction', {
      functionName: 'misra-platform-upload-complete',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/file/upload-complete.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        PROCESSING_QUEUE_URL: processingQueue.queueUrl,
        ENVIRONMENT: 'dev',
        STATE_MACHINE_ARN: '', // Will be set after workflow is created
      },
      timeout: cdk.Duration.minutes(5),
    });

    const getFilesFunction = new lambda.Function(this, 'GetFilesFunction', {
      functionName: 'misra-platform-get-files',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/file/get-files.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        ENVIRONMENT: 'dev',
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Project Management Lambda Functions
    const createProjectFunction = new lambda.Function(this, 'CreateProjectFunction', {
      functionName: 'misra-platform-create-project',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/projects/create-project.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        PROJECTS_TABLE_NAME: testProjectsTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const getProjectsFunction = new lambda.Function(this, 'GetProjectsFunction', {
      functionName: 'misra-platform-get-projects',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/projects/get-projects.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        PROJECTS_TABLE_NAME: testProjectsTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const updateProjectFunction = new lambda.Function(this, 'UpdateProjectFunction', {
      functionName: 'misra-platform-update-project',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/projects/update-project.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        PROJECTS_TABLE_NAME: testProjectsTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Test Suite Management Lambda Functions
    const createTestSuiteFunction = new lambda.Function(this, 'CreateTestSuiteFunction', {
      functionName: 'misra-platform-create-test-suite',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/test-suites/create-suite.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const getTestSuitesFunction = new lambda.Function(this, 'GetTestSuitesFunction', {
      functionName: 'misra-platform-get-test-suites',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/test-suites/get-suites.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const updateTestSuiteFunction = new lambda.Function(this, 'UpdateTestSuiteFunction', {
      functionName: 'misra-platform-update-test-suite',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/test-suites/update-suite.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Test Case Management Lambda Functions
    const createTestCaseFunction = new lambda.Function(this, 'CreateTestCaseFunction', {
      functionName: 'misra-platform-create-test-case',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/test-cases/create-test-case.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const getTestCasesFunction = new lambda.Function(this, 'GetTestCasesFunction', {
      functionName: 'misra-platform-get-test-cases',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/test-cases/get-test-cases.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    const updateTestCaseFunction = new lambda.Function(this, 'UpdateTestCaseFunction', {
      functionName: 'misra-platform-update-test-case',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/test-cases/update-test-case.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions
    usersTable.grantReadWriteData(loginFunction);
    usersTable.grantReadWriteData(refreshFunction);
    jwtSecret.grantRead(loginFunction);
    jwtSecret.grantRead(refreshFunction);
    jwtSecret.grantRead(fileUploadFunction);
    jwtSecret.grantRead(getFilesFunction);
    
    // File upload permissions
    fileStorageBucket.grantReadWrite(fileUploadFunction);
    fileStorageBucket.grantRead(uploadCompleteFunction);
    processingQueue.grantSendMessages(uploadCompleteFunction);
    
    // File metadata permissions
    fileMetadataTable.grantReadWriteData(fileUploadFunction);
    fileMetadataTable.grantReadWriteData(uploadCompleteFunction);
    fileMetadataTable.grantReadData(getFilesFunction);

    // Project management permissions
    testProjectsTable.table.grantReadWriteData(createProjectFunction);
    testProjectsTable.table.grantReadData(getProjectsFunction);
    testProjectsTable.table.grantReadWriteData(updateProjectFunction);
    jwtSecret.grantRead(createProjectFunction);
    jwtSecret.grantRead(getProjectsFunction);
    jwtSecret.grantRead(updateProjectFunction);

    // Test suite management permissions
    testSuitesTable.table.grantReadWriteData(createTestSuiteFunction);
    testSuitesTable.table.grantReadData(getTestSuitesFunction);
    testSuitesTable.table.grantReadWriteData(updateTestSuiteFunction);
    jwtSecret.grantRead(createTestSuiteFunction);
    jwtSecret.grantRead(getTestSuitesFunction);
    jwtSecret.grantRead(updateTestSuiteFunction);

    // Test case management permissions
    testCasesTable.table.grantReadWriteData(createTestCaseFunction);
    testCasesTable.table.grantReadData(getTestCasesFunction);
    testCasesTable.table.grantReadWriteData(updateTestCaseFunction);
    jwtSecret.grantRead(createTestCaseFunction);
    jwtSecret.grantRead(getTestCasesFunction);
    jwtSecret.grantRead(updateTestCaseFunction);

    // Test Execution Lambda Functions
    const testExecutorFunction = new lambda.Function(this, 'TestExecutorFunction', {
      functionName: 'misra-platform-test-executor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/executions/executor.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
        TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
        SCREENSHOTS_BUCKET_NAME: screenshotsBucket.bucket.bucketName,
        AWS_REGION: this.region,
      },
      timeout: cdk.Duration.minutes(15), // Maximum Lambda timeout
      memorySize: 2048, // Increased memory for browser automation
    });

    // Grant test executor permissions
    testExecutionsTable.table.grantReadWriteData(testExecutorFunction);
    testCasesTable.table.grantReadData(testExecutorFunction);
    screenshotsBucket.bucket.grantReadWrite(testExecutorFunction);

    // Grant EventBridge permissions to test executor for publishing events
    testExecutorFunction.addToRolePolicy(new cdk.aws_iam.PolicyStatement({
      actions: ['events:PutEvents'],
      resources: ['*'], // EventBridge default bus
    }));

    // Add SQS trigger for test executor
    testExecutorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(testExecutionQueue, {
        batchSize: 1, // Process one test at a time
        maxBatchingWindow: cdk.Duration.seconds(0), // No batching delay
        reportBatchItemFailures: true, // Enable partial batch responses
      })
    );

    // Test Execution Trigger Lambda
    const triggerExecutionFunction = new lambda.Function(this, 'TriggerExecutionFunction', {
      functionName: 'misra-platform-trigger-execution',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/executions/trigger.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
        TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
        TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
        TEST_EXECUTION_QUEUE_URL: testExecutionQueue.queueUrl,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant trigger function permissions
    testExecutionsTable.table.grantReadWriteData(triggerExecutionFunction);
    testCasesTable.table.grantReadData(triggerExecutionFunction);
    testSuitesTable.table.grantReadData(triggerExecutionFunction);
    testExecutionQueue.grantSendMessages(triggerExecutionFunction);
    jwtSecret.grantRead(triggerExecutionFunction);

    // Test Execution Status Lambda
    const getExecutionStatusFunction = new lambda.Function(this, 'GetExecutionStatusFunction', {
      functionName: 'misra-platform-get-execution-status',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/executions/get-status.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant status function permissions
    testExecutionsTable.table.grantReadData(getExecutionStatusFunction);
    jwtSecret.grantRead(getExecutionStatusFunction);

    // Test Execution Results Lambda
    const getExecutionResultsFunction = new lambda.Function(this, 'GetExecutionResultsFunction', {
      functionName: 'misra-platform-get-execution-results',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/executions/get-results.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
        SCREENSHOTS_BUCKET_NAME: screenshotsBucket.bucket.bucketName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant results function permissions
    testExecutionsTable.table.grantReadData(getExecutionResultsFunction);
    screenshotsBucket.bucket.grantRead(getExecutionResultsFunction);
    jwtSecret.grantRead(getExecutionResultsFunction);

    // Test Execution History Lambda
    const getExecutionHistoryFunction = new lambda.Function(this, 'GetExecutionHistoryFunction', {
      functionName: 'misra-platform-get-execution-history',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/executions/get-history.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant history function permissions
    testExecutionsTable.table.grantReadData(getExecutionHistoryFunction);
    jwtSecret.grantRead(getExecutionHistoryFunction);

    // Test Suite Results Lambda
    const getSuiteResultsFunction = new lambda.Function(this, 'GetSuiteResultsFunction', {
      functionName: 'misra-platform-get-suite-results',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/executions/get-suite-results.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
        JWT_SECRET_NAME: jwtSecret.secretName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant suite results function permissions
    testExecutionsTable.table.grantReadData(getSuiteResultsFunction);
    jwtSecret.grantRead(getSuiteResultsFunction);

    // S3 event notification for upload completion
    fileStorageBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(uploadCompleteFunction),
      { prefix: 'uploads/' }
    );

    // Analysis and Notification Lambda Functions
    const analysisFunction = new lambda.Function(this, 'AnalysisFunction', {
      functionName: 'misra-platform-analysis',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/analysis/analyze-file.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        ANALYSES_TABLE_NAME: analysesTable.tableName,
        FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
        ENVIRONMENT: 'dev', // Fixed: was this.stackName
      },
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
    });

    // Notification Processor Lambda Function
    const notificationProcessorFunction = new lambda.Function(this, 'NotificationProcessorFunction', {
      functionName: 'aibts-notification-processor',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/processor.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_PREFERENCES_TABLE: notificationPreferencesTable.table.tableName,
        NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
        NOTIFICATION_HISTORY_TABLE: notificationHistoryTable.table.tableName,
        SNS_TOPIC_ARN_EMAIL: emailNotificationTopic.topicArn,
        SNS_TOPIC_ARN_SMS: smsNotificationTopic.topicArn,
        SNS_TOPIC_ARN_WEBHOOK: webhookNotificationTopic.topicArn,
        N8N_ENABLED: process.env.N8N_ENABLED || 'false',
        N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',
        N8N_API_KEY: process.env.N8N_API_KEY || '',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      reservedConcurrentExecutions: 100,
    });

    // Add SQS trigger for notification processor
    notificationProcessorFunction.addEventSource(
      new lambdaEventSources.SqsEventSource(notificationQueue, {
        batchSize: 10, // Process up to 10 messages at once
        maxBatchingWindow: cdk.Duration.seconds(5),
      })
    );

    // Grant permissions to notification processor
    notificationPreferencesTable.table.grantReadWriteData(notificationProcessorFunction);
    notificationTemplatesTable.table.grantReadData(notificationProcessorFunction);
    notificationHistoryTable.table.grantReadWriteData(notificationProcessorFunction);
    emailNotificationTopic.grantPublish(notificationProcessorFunction);
    smsNotificationTopic.grantPublish(notificationProcessorFunction);
    webhookNotificationTopic.grantPublish(notificationProcessorFunction);

    // Template Seeding Lambda Function
    const seedTemplatesFunction = new lambda.Function(this, 'SeedTemplatesFunction', {
      functionName: 'aibts-seed-templates',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/notifications/seed-templates.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
    });

    // Grant permissions to seed templates function
    notificationTemplatesTable.table.grantReadWriteData(seedTemplatesFunction);

    const notificationFunction = new lambda.Function(this, 'NotificationFunction', {
      functionName: 'misra-platform-notification',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Notification function invoked:', JSON.stringify(event));
          // Placeholder for notification logic (email, webhook, etc.)
          return {
            statusCode: 200,
            message: 'Notification sent successfully'
          };
        };
      `),
      environment: {
        USERS_TABLE_NAME: usersTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant permissions for analysis and notification functions
    analysesTable.grantReadWriteData(analysisFunction);
    analysisResultsTable.grantReadWriteData(analysisFunction);
    fileStorageBucket.grantRead(analysisFunction);
    fileMetadataTable.grantReadWriteData(analysisFunction);
    usersTable.grantReadData(notificationFunction);

    // Query Results Lambda Function
    const queryResultsFunction = new lambda.Function(this, 'QueryResultsFunction', {
      functionName: 'misra-platform-query-results',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/analysis/query-results.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        ENVIRONMENT: this.stackName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // User Stats Lambda Function
    const userStatsFunction = new lambda.Function(this, 'UserStatsFunction', {
      functionName: 'misra-platform-user-stats',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/analysis/get-user-stats.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        ENVIRONMENT: this.stackName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant query and stats functions access to analysis results
    analysisResultsTable.grantReadData(queryResultsFunction);
    analysisResultsTable.grantReadData(userStatsFunction);

    // AI Insights Lambda Function
    const aiInsightsFunction = new lambda.Function(this, 'AIInsightsFunction', {
      functionName: 'misra-platform-ai-insights',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/ai/generate-insights.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        ENVIRONMENT: this.stackName,
      },
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
    });

    // Grant AI insights function access to analysis results
    analysisResultsTable.grantReadData(aiInsightsFunction);
    jwtSecret.grantRead(aiInsightsFunction);

    // AI Feedback Lambda Function
    const aiFeedbackFunction = new lambda.Function(this, 'AIFeedbackFunction', {
      functionName: 'misra-platform-ai-feedback',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/ai/submit-feedback.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        ENVIRONMENT: this.stackName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant feedback function access to store feedback
    jwtSecret.grantRead(aiFeedbackFunction);

    // Report Generation Lambda Function
    const reportFunction = new lambda.Function(this, 'ReportFunction', {
      functionName: 'misra-platform-get-report',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'functions/reports/get-violation-report.handler',
      code: lambda.Code.fromAsset('src'),
      environment: {
        ENVIRONMENT: this.stackName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant report function access to metadata
    // Note: Would need file metadata table reference here

    // Create Step Functions workflow for analysis orchestration
    const workflow = new AnalysisWorkflow(this, 'AnalysisWorkflow', {
      environment: this.stackName,
      analysisFunction,
      notificationFunction,
    });

    // Update upload-complete function with workflow ARN
    uploadCompleteFunction.addEnvironment('STATE_MACHINE_ARN', workflow.stateMachine.stateMachineArn);
    
    // Grant upload-complete function permission to start workflow executions
    workflow.stateMachine.grantStartExecution(uploadCompleteFunction);

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

    api.addRoutes({
      path: '/files',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetFilesIntegration', getFilesFunction),
    });

    // Add report routes
    api.addRoutes({
      path: '/reports/{fileId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ReportIntegration', reportFunction),
    });

    // Add analysis query routes
    api.addRoutes({
      path: '/analysis/query',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('QueryResultsIntegration', queryResultsFunction),
    });

    // Add user stats routes
    api.addRoutes({
      path: '/analysis/stats/{userId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('UserStatsIntegration', userStatsFunction),
    });

    // Add AI insights routes
    api.addRoutes({
      path: '/ai/insights',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('AIInsightsIntegration', aiInsightsFunction),
    });

    // Add AI feedback routes
    api.addRoutes({
      path: '/ai/feedback',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('AIFeedbackIntegration', aiFeedbackFunction),
    });

    // Add project management routes
    api.addRoutes({
      path: '/projects',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateProjectIntegration', createProjectFunction),
    });

    api.addRoutes({
      path: '/projects',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetProjectsIntegration', getProjectsFunction),
    });

    api.addRoutes({
      path: '/projects/{projectId}',
      methods: [apigateway.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration('UpdateProjectIntegration', updateProjectFunction),
    });

    // Add test suite management routes
    api.addRoutes({
      path: '/test-suites',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateTestSuiteIntegration', createTestSuiteFunction),
    });

    api.addRoutes({
      path: '/test-suites',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetTestSuitesIntegration', getTestSuitesFunction),
    });

    api.addRoutes({
      path: '/test-suites/{suiteId}',
      methods: [apigateway.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration('UpdateTestSuiteIntegration', updateTestSuiteFunction),
    });

    // Add test case management routes
    api.addRoutes({
      path: '/test-cases',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateTestCaseIntegration', createTestCaseFunction),
    });

    api.addRoutes({
      path: '/test-cases',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetTestCasesIntegration', getTestCasesFunction),
    });

    api.addRoutes({
      path: '/test-cases/{testCaseId}',
      methods: [apigateway.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration('UpdateTestCaseIntegration', updateTestCaseFunction),
    });

    // Add test execution routes
    api.addRoutes({
      path: '/executions/trigger',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('TriggerExecutionIntegration', triggerExecutionFunction),
    });

    api.addRoutes({
      path: '/executions/{executionId}/status',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetExecutionStatusIntegration', getExecutionStatusFunction),
    });

    api.addRoutes({
      path: '/executions/{executionId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetExecutionResultsIntegration', getExecutionResultsFunction),
    });

    api.addRoutes({
      path: '/executions/history',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetExecutionHistoryIntegration', getExecutionHistoryFunction),
    });

    api.addRoutes({
      path: '/executions/suites/{suiteExecutionId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetSuiteResultsIntegration', getSuiteResultsFunction),
    });

    // Add notification preferences routes
    api.addRoutes({
      path: '/notifications/preferences',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetPreferencesIntegration', getPreferencesFunction),
    });

    api.addRoutes({
      path: '/notifications/preferences',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('UpdatePreferencesIntegration', updatePreferencesFunction),
    });

    // Add notification history routes
    api.addRoutes({
      path: '/notifications/history',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetHistoryIntegration', getHistoryFunction),
    });

    api.addRoutes({
      path: '/notifications/history/{notificationId}',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetNotificationIntegration', getNotificationFunction),
    });

    // Add notification template routes (admin only)
    api.addRoutes({
      path: '/notifications/templates',
      methods: [apigateway.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateTemplateIntegration', createTemplateFunction),
    });

    api.addRoutes({
      path: '/notifications/templates/{templateId}',
      methods: [apigateway.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration('UpdateTemplateIntegration', updateTemplateFunction),
    });

    api.addRoutes({
      path: '/notifications/templates',
      methods: [apigateway.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetTemplatesIntegration', getTemplatesFunction),
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

    new cdk.CfnOutput(this, 'TestExecutionQueueUrl', {
      value: testExecutionQueue.queueUrl,
      description: 'SQS queue for test execution jobs',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: api.apiEndpoint,
      description: 'API Gateway endpoint URL',
    });

    new cdk.CfnOutput(this, 'TestExecutionsTableName', {
      value: testExecutionsTable.table.tableName,
      description: 'DynamoDB table for test executions',
    });

    new cdk.CfnOutput(this, 'ScreenshotsBucketName', {
      value: screenshotsBucket.bucket.bucketName,
      description: 'S3 bucket for test execution screenshots',
    });

    new cdk.CfnOutput(this, 'NotificationQueueUrl', {
      value: notificationQueue.queueUrl,
      description: 'SQS queue for notification processing',
    });

    new cdk.CfnOutput(this, 'EmailNotificationTopicArn', {
      value: emailNotificationTopic.topicArn,
      description: 'SNS topic for email notifications',
    });

    new cdk.CfnOutput(this, 'SmsNotificationTopicArn', {
      value: smsNotificationTopic.topicArn,
      description: 'SNS topic for SMS notifications',
    });

    new cdk.CfnOutput(this, 'WebhookNotificationTopicArn', {
      value: webhookNotificationTopic.topicArn,
      description: 'SNS topic for webhook notifications',
    });
  }
}