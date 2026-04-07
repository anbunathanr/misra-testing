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
exports.MisraPlatformStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3n = __importStar(require("aws-cdk-lib/aws-s3-notifications"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaEventSources = __importStar(require("aws-cdk-lib/aws-lambda-event-sources"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigatewayv2"));
const integrations = __importStar(require("aws-cdk-lib/aws-apigatewayv2-integrations"));
const authorizers = __importStar(require("aws-cdk-lib/aws-apigatewayv2-authorizers"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const sns = __importStar(require("aws-cdk-lib/aws-sns"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const analysis_workflow_1 = require("./analysis-workflow");
const file_metadata_table_1 = require("./file-metadata-table");
const projects_table_1 = require("./projects-table");
const test_suites_table_1 = require("./test-suites-table");
const test_cases_table_1 = require("./test-cases-table");
const test_executions_table_1 = require("./test-executions-table");
const screenshots_bucket_1 = require("./screenshots-bucket");
const notification_preferences_table_1 = require("./notification-preferences-table");
const notification_templates_table_1 = require("./notification-templates-table");
const notification_history_table_1 = require("./notification-history-table");
const ai_usage_table_1 = require("./ai-usage-table");
const analysis_cache_table_1 = require("./analysis-cache-table");
class MisraPlatformStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        // Cognito User Pool for authentication
        const userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: 'misra-platform-users',
            selfSignUpEnabled: true,
            signInAliases: {
                email: true,
                username: false,
            },
            autoVerify: {
                email: true,
            },
            standardAttributes: {
                email: {
                    required: true,
                    mutable: true,
                },
                fullname: {
                    required: true,
                    mutable: true,
                },
            },
            customAttributes: {
                organizationId: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 256,
                    mutable: true,
                }),
                role: new cognito.StringAttribute({
                    minLen: 1,
                    maxLen: 50,
                    mutable: true,
                }),
            },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
                tempPasswordValidity: cdk.Duration.days(7),
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
            mfa: cognito.Mfa.OPTIONAL,
            mfaSecondFactor: {
                sms: false,
                otp: true,
            },
            userVerification: {
                emailSubject: 'Verify your email for Misra Platform',
                emailBody: 'Thank you for signing up! Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE,
            },
            userInvitation: {
                emailSubject: 'Welcome to Misra Platform',
                emailBody: 'Hello {username}, you have been invited to join Misra Platform. Your temporary password is {####}',
            },
            deviceTracking: {
                challengeRequiredOnNewDevice: true,
                deviceOnlyRememberedOnUserPrompt: true,
            },
        });
        const userPoolClient = userPool.addClient('WebClient', {
            userPoolClientName: 'misra-platform-web-client',
            generateSecret: false,
            authFlows: {
                userPassword: true,
                userSrp: true,
            },
            preventUserExistenceErrors: true,
            refreshTokenValidity: cdk.Duration.days(30),
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            enableTokenRevocation: true,
            readAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({
                email: true,
                emailVerified: true,
                fullname: true,
            })
                .withCustomAttributes('organizationId', 'role'),
            writeAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({
                email: true,
                fullname: true,
            })
                .withCustomAttributes('organizationId', 'role'),
        });
        // DynamoDB Tables - Using existing table names from previous deployment
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
        // Use existing TestProjects table
        const projectsTable = new dynamodb.Table(this, 'ProjectsTable', {
            tableName: 'TestProjects',
            partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
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
        const fileMetadataTable = new file_metadata_table_1.FileMetadataTable(this, 'FileMetadataTable', {
            environment: 'dev'
        });
        // Projects Table for Web App Testing System - Using existing TestProjects table
        const testProjectsTable = new projects_table_1.ProjectsTable(this, 'TestProjectsTable');
        // Test Suites Table for Web App Testing System - Using existing TestSuites table
        const testSuitesTable = new test_suites_table_1.TestSuitesTable(this, 'TestSuitesTable');
        // Test Cases Table for Web App Testing System - Using existing TestCases table
        const testCasesTable = new test_cases_table_1.TestCasesTable(this, 'TestCasesTable');
        // Test Executions Table for Web App Testing System - Using existing TestExecutions table
        const testExecutionsTable = new test_executions_table_1.TestExecutionsTable(this, 'TestExecutionsTable');
        // Screenshots Bucket for Test Execution Failures
        const screenshotsBucket = new screenshots_bucket_1.ScreenshotsBucket(this, 'ScreenshotsBucket', {
            environment: 'dev'
        });
        // Notification System Tables
        const notificationPreferencesTable = new notification_preferences_table_1.NotificationPreferencesTable(this, 'NotificationPreferencesTable', {
            environment: 'dev'
        });
        const notificationTemplatesTable = new notification_templates_table_1.NotificationTemplatesTable(this, 'NotificationTemplatesTable', {
            environment: 'dev'
        });
        const notificationHistoryTable = new notification_history_table_1.NotificationHistoryTable(this, 'NotificationHistoryTable', {
            environment: 'dev'
        });
        // AI Usage Table for AI Test Generation - Using existing AIUsage table
        const aiUsageTable = new ai_usage_table_1.AIUsageTable(this, 'AIUsageTable');
        // Analysis Cache Table for MISRA analysis caching (Requirement 10.7)
        const analysisCacheTable = new analysis_cache_table_1.AnalysisCacheTable(this, 'AnalysisCacheTable', {
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
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/scheduled-reports'),
            environment: {
                TEST_EXECUTIONS_TABLE: testExecutionsTable.table.tableName,
                NOTIFICATION_QUEUE_URL: notificationQueue.queueUrl,
            },
            timeout: cdk.Duration.minutes(5),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
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
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/get-preferences'),
            environment: {
                NOTIFICATION_PREFERENCES_TABLE: notificationPreferencesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        const updatePreferencesFunction = new lambda.Function(this, 'UpdatePreferencesFunction', {
            functionName: 'aibts-update-preferences',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/update-preferences'),
            environment: {
                NOTIFICATION_PREFERENCES_TABLE: notificationPreferencesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        // Notification History API Lambda Functions
        const getHistoryFunction = new lambda.Function(this, 'GetHistoryFunction', {
            functionName: 'aibts-get-history',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/get-history'),
            environment: {
                NOTIFICATION_HISTORY_TABLE: notificationHistoryTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        const getNotificationFunction = new lambda.Function(this, 'GetNotificationFunction', {
            functionName: 'aibts-get-notification',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/get-notification'),
            environment: {
                NOTIFICATION_HISTORY_TABLE: notificationHistoryTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        // Notification Template API Lambda Functions (Admin Only)
        const createTemplateFunction = new lambda.Function(this, 'CreateTemplateFunction', {
            functionName: 'aibts-create-template',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/create-template'),
            environment: {
                NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        const updateTemplateFunction = new lambda.Function(this, 'UpdateTemplateFunction', {
            functionName: 'aibts-update-template',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/update-template'),
            environment: {
                NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        const getTemplatesFunction = new lambda.Function(this, 'GetTemplatesFunction', {
            functionName: 'aibts-get-templates',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/get-templates'),
            environment: {
                NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
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
        // SQS Queue for MISRA analysis (Requirement 10.5)
        const analysisQueueDLQ = new sqs.Queue(this, 'AnalysisQueueDLQ', {
            queueName: 'misra-analysis-dlq',
            retentionPeriod: cdk.Duration.days(14),
        });
        const analysisQueue = new sqs.Queue(this, 'AnalysisQueue', {
            queueName: 'misra-analysis-queue',
            visibilityTimeout: cdk.Duration.minutes(5),
            receiveMessageWaitTime: cdk.Duration.seconds(20),
            deadLetterQueue: {
                queue: analysisQueueDLQ,
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
        // Lambda Authorizer for JWT verification
        const authorizerFunction = new lambda.Function(this, 'AuthorizerFunction', {
            functionName: 'misra-platform-authorizer',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/authorizer'),
            environment: {
                JWT_SECRET_NAME: jwtSecret.secretName,
            },
            timeout: cdk.Duration.seconds(5),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        // Grant Secrets Manager read access to authorizer
        jwtSecret.grantRead(authorizerFunction);
        // Authentication Lambda Functions
        const loginFunction = new lambda.Function(this, 'LoginFunction', {
            functionName: 'misra-platform-login',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/login'),
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
                JWT_SECRET_NAME: jwtSecret.secretName,
                N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',
                N8N_API_KEY: process.env.N8N_API_KEY || '',
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const registerFunction = new lambda.Function(this, 'RegisterFunction', {
            functionName: 'misra-platform-register',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/register'),
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
                JWT_SECRET_NAME: jwtSecret.secretName,
                N8N_WEBHOOK_URL: process.env.N8N_WEBHOOK_URL || '',
                N8N_API_KEY: process.env.N8N_API_KEY || '',
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const refreshFunction = new lambda.Function(this, 'RefreshFunction', {
            functionName: 'misra-platform-refresh',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/refresh'),
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
                JWT_SECRET_NAME: jwtSecret.secretName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // File Upload Lambda Functions
        const fileUploadFunction = new lambda.Function(this, 'FileUploadFunction', {
            functionName: 'misra-platform-file-upload',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/file/upload'),
            environment: {
                FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
                ENVIRONMENT: 'dev',
                ANALYSIS_QUEUE_URL: analysisQueue.queueUrl,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const uploadCompleteFunction = new lambda.Function(this, 'UploadCompleteFunction', {
            functionName: 'misra-platform-upload-complete',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/file/upload-complete'),
            environment: {
                PROCESSING_QUEUE_URL: processingQueue.queueUrl,
                ENVIRONMENT: 'dev',
                STATE_MACHINE_ARN: '', // Will be set after workflow is created
            },
            timeout: cdk.Duration.minutes(5),
            reservedConcurrentExecutions: 0,
        });
        const getFilesFunction = new lambda.Function(this, 'GetFilesFunction', {
            functionName: 'misra-platform-get-files',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/file/get-files'),
            environment: {
                ENVIRONMENT: 'dev',
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Project Management Lambda Functions
        const createProjectFunction = new lambda.Function(this, 'CreateProjectFunction', {
            functionName: 'misra-platform-create-project',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/projects/create-project'),
            environment: {
                PROJECTS_TABLE_NAME: testProjectsTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const getProjectsFunction = new lambda.Function(this, 'GetProjectsFunction', {
            functionName: 'misra-platform-get-projects',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/projects/get-projects-minimal'),
            environment: {
                PROJECTS_TABLE_NAME: testProjectsTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const updateProjectFunction = new lambda.Function(this, 'UpdateProjectFunction', {
            functionName: 'misra-platform-update-project',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/projects/update-project'),
            environment: {
                PROJECTS_TABLE_NAME: testProjectsTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Test Suite Management Lambda Functions
        const createTestSuiteFunction = new lambda.Function(this, 'CreateTestSuiteFunction', {
            functionName: 'misra-platform-create-test-suite',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/test-suites/create-suite'),
            environment: {
                TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const getTestSuitesFunction = new lambda.Function(this, 'GetTestSuitesFunction', {
            functionName: 'misra-platform-get-test-suites',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/test-suites/get-suites'),
            environment: {
                TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const updateTestSuiteFunction = new lambda.Function(this, 'UpdateTestSuiteFunction', {
            functionName: 'misra-platform-update-test-suite',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/test-suites/update-suite'),
            environment: {
                TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Test Case Management Lambda Functions
        const createTestCaseFunction = new lambda.Function(this, 'CreateTestCaseFunction', {
            functionName: 'misra-platform-create-test-case',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/test-cases/create-test-case'),
            environment: {
                TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const getTestCasesFunction = new lambda.Function(this, 'GetTestCasesFunction', {
            functionName: 'misra-platform-get-test-cases',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/test-cases/get-test-cases'),
            environment: {
                TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const updateTestCaseFunction = new lambda.Function(this, 'UpdateTestCaseFunction', {
            functionName: 'misra-platform-update-test-case',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/test-cases/update-test-case'),
            environment: {
                TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant permissions
        usersTable.grantReadWriteData(loginFunction);
        usersTable.grantReadWriteData(refreshFunction);
        jwtSecret.grantRead(loginFunction);
        jwtSecret.grantRead(refreshFunction);
        // File upload permissions
        fileStorageBucket.grantReadWrite(fileUploadFunction);
        fileStorageBucket.grantRead(uploadCompleteFunction);
        processingQueue.grantSendMessages(uploadCompleteFunction);
        analysisQueue.grantSendMessages(fileUploadFunction);
        // File metadata permissions
        fileMetadataTable.grantReadWriteData(fileUploadFunction);
        fileMetadataTable.grantReadWriteData(uploadCompleteFunction);
        fileMetadataTable.grantReadData(getFilesFunction);
        // Project management permissions
        testProjectsTable.table.grantReadWriteData(createProjectFunction);
        testProjectsTable.table.grantReadData(getProjectsFunction);
        testProjectsTable.table.grantReadWriteData(updateProjectFunction);
        // Test suite management permissions
        testSuitesTable.table.grantReadWriteData(createTestSuiteFunction);
        testSuitesTable.table.grantReadData(getTestSuitesFunction);
        testSuitesTable.table.grantReadWriteData(updateTestSuiteFunction);
        // Test case management permissions
        testCasesTable.table.grantReadWriteData(createTestCaseFunction);
        testCasesTable.table.grantReadData(getTestCasesFunction);
        testCasesTable.table.grantReadWriteData(updateTestCaseFunction);
        // AI Test Generation Lambda Functions
        const aiAnalyzeFunction = new lambda.Function(this, 'AIAnalyzeFunction', {
            functionName: 'aibts-ai-analyze',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/analyze'),
            environment: {
                // Task 10.1: Add Bedrock configuration environment variables
                AI_PROVIDER: process.env.AI_PROVIDER || 'BEDROCK',
                BEDROCK_REGION: process.env.BEDROCK_REGION || 'us-east-1',
                BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
                BEDROCK_TIMEOUT: process.env.BEDROCK_TIMEOUT || '30000',
                ENABLE_BEDROCK_MONITORING: process.env.ENABLE_BEDROCK_MONITORING || 'true',
                // Task 12.1: Add canary deployment traffic percentage
                BEDROCK_TRAFFIC_PERCENTAGE: process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0',
            },
            timeout: cdk.Duration.minutes(5), // Browser automation can take time
            memorySize: 2048, // Puppeteer needs more memory
            reservedConcurrentExecutions: 0,
            tracing: lambda.Tracing.ACTIVE, // Task 8.3: Enable X-Ray tracing
        });
        const aiGenerateTestFunction = new lambda.Function(this, 'AIGenerateTestFunction', {
            functionName: 'aibts-ai-generate',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/generate'),
            environment: {
                AI_USAGE_TABLE: aiUsageTable.table.tableName,
                TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
                // Task 10.1: Add Bedrock configuration environment variables
                AI_PROVIDER: process.env.AI_PROVIDER || 'BEDROCK',
                BEDROCK_REGION: process.env.BEDROCK_REGION || 'us-east-1',
                BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
                BEDROCK_TIMEOUT: process.env.BEDROCK_TIMEOUT || '30000',
                ENABLE_BEDROCK_MONITORING: process.env.ENABLE_BEDROCK_MONITORING || 'true',
                // Task 12.1: Add canary deployment traffic percentage
                BEDROCK_TRAFFIC_PERCENTAGE: process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0',
            },
            timeout: cdk.Duration.minutes(2),
            memorySize: 1024,
            reservedConcurrentExecutions: 0,
            tracing: lambda.Tracing.ACTIVE, // Task 8.3: Enable X-Ray tracing
        });
        const aiBatchGenerateFunction = new lambda.Function(this, 'AIBatchGenerateFunction', {
            functionName: 'aibts-ai-batch',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/batch'),
            environment: {
                AI_USAGE_TABLE: aiUsageTable.table.tableName,
                TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
                // Task 10.1: Add Bedrock configuration environment variables
                AI_PROVIDER: process.env.AI_PROVIDER || 'BEDROCK',
                BEDROCK_REGION: process.env.BEDROCK_REGION || 'us-east-1',
                BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
                BEDROCK_TIMEOUT: process.env.BEDROCK_TIMEOUT || '30000',
                ENABLE_BEDROCK_MONITORING: process.env.ENABLE_BEDROCK_MONITORING || 'true',
                // Task 12.1: Add canary deployment traffic percentage
                BEDROCK_TRAFFIC_PERCENTAGE: process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0',
            },
            timeout: cdk.Duration.minutes(15), // Batch processing can take longer
            memorySize: 2048,
            tracing: lambda.Tracing.ACTIVE, // Task 8.3: Enable X-Ray tracing
            reservedConcurrentExecutions: 0,
        });
        const aiGetUsageStatsFunction = new lambda.Function(this, 'AIGetUsageStatsFunction', {
            functionName: 'aibts-ai-usage',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/get-usage'),
            environment: {
                AI_USAGE_TABLE: aiUsageTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        // Grant permissions to AI test generation functions
        aiUsageTable.table.grantReadWriteData(aiGenerateTestFunction);
        aiUsageTable.table.grantReadWriteData(aiBatchGenerateFunction);
        aiUsageTable.table.grantReadData(aiGetUsageStatsFunction);
        testCasesTable.table.grantReadWriteData(aiGenerateTestFunction);
        testCasesTable.table.grantReadWriteData(aiBatchGenerateFunction);
        // Batch 4 functions use Lambda Authorizer context - no JWT secret needed
        // aiGenerateTestFunction, aiBatchGenerateFunction, aiGetUsageStatsFunction
        // Add Bedrock permissions to AI Lambda functions (Task 5.1)
        // Using inference profile for Claude Sonnet 4.6 (cross-region routing)
        const bedrockPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['bedrock:InvokeModel'],
            resources: [
                'arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-sonnet-4-6',
            ],
        });
        aiAnalyzeFunction.addToRolePolicy(bedrockPolicy);
        aiGenerateTestFunction.addToRolePolicy(bedrockPolicy);
        aiBatchGenerateFunction.addToRolePolicy(bedrockPolicy);
        // Task 5.2: No BEDROCK_API_KEY environment variable is used
        // The BedrockRuntimeClient uses AWS SDK default credential provider (IAM roles)
        // Task 5.3: CloudWatch Logs permissions are automatically added by CDK
        // CDK grants logs:CreateLogGroup, logs:CreateLogStream, and logs:PutLogEvents
        // to all Lambda functions by default through the Lambda execution role
        // Task 8.2: Create CloudWatch alarms for Bedrock monitoring
        // Add CloudWatch PutMetricData permission for Bedrock monitoring
        const cloudWatchMetricsPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudwatch:PutMetricData'],
            resources: ['*'],
        });
        aiAnalyzeFunction.addToRolePolicy(cloudWatchMetricsPolicy);
        aiGenerateTestFunction.addToRolePolicy(cloudWatchMetricsPolicy);
        aiBatchGenerateFunction.addToRolePolicy(cloudWatchMetricsPolicy);
        // CloudWatch Alarm: High Error Rate (>10 errors in 5 minutes)
        const bedrockErrorAlarm = new cloudwatch.Alarm(this, 'BedrockHighErrorRateAlarm', {
            alarmName: 'AIBTS-Bedrock-HighErrorRate',
            alarmDescription: 'Alert when Bedrock error rate exceeds 10 errors in 5 minutes',
            metric: new cloudwatch.Metric({
                namespace: 'AIBTS/Bedrock',
                metricName: 'BedrockErrors',
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 10,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // CloudWatch Alarm: High Latency (>30 seconds average)
        const bedrockLatencyAlarm = new cloudwatch.Alarm(this, 'BedrockHighLatencyAlarm', {
            alarmName: 'AIBTS-Bedrock-HighLatency',
            alarmDescription: 'Alert when Bedrock average latency exceeds 30 seconds',
            metric: new cloudwatch.Metric({
                namespace: 'AIBTS/Bedrock',
                metricName: 'BedrockLatency',
                statistic: 'Average',
                period: cdk.Duration.minutes(5),
            }),
            threshold: 30000, // 30 seconds in milliseconds
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // CloudWatch Alarm: High Cost (>$100/day)
        // Note: This alarm checks if cost exceeds $100 in a 24-hour period
        const bedrockCostAlarm = new cloudwatch.Alarm(this, 'BedrockHighCostAlarm', {
            alarmName: 'AIBTS-Bedrock-HighCost',
            alarmDescription: 'Alert when Bedrock cost exceeds $100 per day',
            metric: new cloudwatch.Metric({
                namespace: 'AIBTS/Bedrock',
                metricName: 'BedrockCost',
                statistic: 'Sum',
                period: cdk.Duration.hours(24),
            }),
            threshold: 100, // $100
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Output alarm ARNs for SNS topic subscription (optional)
        new cdk.CfnOutput(this, 'BedrockErrorAlarmArn', {
            value: bedrockErrorAlarm.alarmArn,
            description: 'Bedrock High Error Rate Alarm ARN',
        });
        new cdk.CfnOutput(this, 'BedrockLatencyAlarmArn', {
            value: bedrockLatencyAlarm.alarmArn,
            description: 'Bedrock High Latency Alarm ARN',
        });
        new cdk.CfnOutput(this, 'BedrockCostAlarmArn', {
            value: bedrockCostAlarm.alarmArn,
            description: 'Bedrock High Cost Alarm ARN',
        });
        // Task 12: Create CloudWatch Dashboard for Bedrock vs OpenAI comparison
        const bedrockDashboard = new cloudwatch.Dashboard(this, 'BedrockMigrationDashboard', {
            dashboardName: 'AIBTS-Bedrock-Migration',
        });
        // Add widgets to compare Bedrock vs OpenAI metrics
        bedrockDashboard.addWidgets(
        // Row 1: Latency Comparison
        new cloudwatch.GraphWidget({
            title: 'AI Provider Latency Comparison',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AIBTS/Bedrock',
                    metricName: 'BedrockLatency',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    label: 'Bedrock Avg Latency',
                }),
                new cloudwatch.Metric({
                    namespace: 'AIBTS/OpenAI',
                    metricName: 'OpenAILatency',
                    statistic: 'Average',
                    period: cdk.Duration.minutes(5),
                    label: 'OpenAI Avg Latency',
                }),
            ],
            width: 12,
        }), 
        // Row 1: Error Rate Comparison
        new cloudwatch.GraphWidget({
            title: 'AI Provider Error Rate Comparison',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AIBTS/Bedrock',
                    metricName: 'BedrockErrors',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    label: 'Bedrock Errors',
                }),
                new cloudwatch.Metric({
                    namespace: 'AIBTS/OpenAI',
                    metricName: 'OpenAIErrors',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    label: 'OpenAI Errors',
                }),
            ],
            width: 12,
        }));
        bedrockDashboard.addWidgets(
        // Row 2: Cost Comparison
        new cloudwatch.GraphWidget({
            title: 'AI Provider Cost Comparison (24h)',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AIBTS/Bedrock',
                    metricName: 'BedrockCost',
                    statistic: 'Sum',
                    period: cdk.Duration.hours(24),
                    label: 'Bedrock Cost',
                }),
                new cloudwatch.Metric({
                    namespace: 'AIBTS/OpenAI',
                    metricName: 'OpenAICost',
                    statistic: 'Sum',
                    period: cdk.Duration.hours(24),
                    label: 'OpenAI Cost',
                }),
            ],
            width: 12,
        }), 
        // Row 2: Token Usage Comparison
        new cloudwatch.GraphWidget({
            title: 'AI Provider Token Usage',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AIBTS/Bedrock',
                    metricName: 'BedrockTokens',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    label: 'Bedrock Tokens',
                }),
                new cloudwatch.Metric({
                    namespace: 'AIBTS/OpenAI',
                    metricName: 'OpenAITokens',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    label: 'OpenAI Tokens',
                }),
            ],
            width: 12,
        }));
        bedrockDashboard.addWidgets(
        // Row 3: Request Count
        new cloudwatch.GraphWidget({
            title: 'AI Provider Request Count',
            left: [
                new cloudwatch.Metric({
                    namespace: 'AIBTS/Bedrock',
                    metricName: 'BedrockRequests',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    label: 'Bedrock Requests',
                }),
                new cloudwatch.Metric({
                    namespace: 'AIBTS/OpenAI',
                    metricName: 'OpenAIRequests',
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                    label: 'OpenAI Requests',
                }),
            ],
            width: 12,
        }), 
        // Row 3: Traffic Distribution (Canary)
        new cloudwatch.SingleValueWidget({
            title: 'Bedrock Traffic Percentage',
            metrics: [
                new cloudwatch.MathExpression({
                    expression: '(bedrock / (bedrock + openai)) * 100',
                    usingMetrics: {
                        bedrock: new cloudwatch.Metric({
                            namespace: 'AIBTS/Bedrock',
                            metricName: 'BedrockRequests',
                            statistic: 'Sum',
                            period: cdk.Duration.hours(1),
                        }),
                        openai: new cloudwatch.Metric({
                            namespace: 'AIBTS/OpenAI',
                            metricName: 'OpenAIRequests',
                            statistic: 'Sum',
                            period: cdk.Duration.hours(1),
                        }),
                    },
                    label: 'Bedrock Traffic %',
                }),
            ],
            width: 12,
        }));
        // Output dashboard URL
        new cdk.CfnOutput(this, 'BedrockDashboardURL', {
            value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${bedrockDashboard.dashboardName}`,
            description: 'CloudWatch Dashboard for Bedrock Migration Monitoring',
        });
        // Test Execution Lambda Functions
        const testExecutorFunction = new lambda.Function(this, 'TestExecutorFunction', {
            functionName: 'misra-platform-test-executor',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/executions/executor'),
            environment: {
                TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
                TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
                SCREENSHOTS_BUCKET_NAME: screenshotsBucket.bucket.bucketName,
            },
            timeout: cdk.Duration.minutes(15), // Maximum Lambda timeout
            memorySize: 2048, // Increased memory for browser automation
            reservedConcurrentExecutions: 0,
        });
        // Grant test executor permissions
        testExecutionsTable.table.grantReadWriteData(testExecutorFunction);
        testCasesTable.table.grantReadData(testExecutorFunction);
        screenshotsBucket.bucket.grantReadWrite(testExecutorFunction);
        // Grant EventBridge permissions to test executor for publishing events
        // testExecutorFunction.addToRolePolicy(new iam.PolicyStatement({
        //   actions: ['events:PutEvents'],
        //   resources: ['*'], // EventBridge default bus
        // }));
        // Add SQS trigger for test executor
        testExecutorFunction.addEventSource(new lambdaEventSources.SqsEventSource(testExecutionQueue, {
            batchSize: 1, // Process one test at a time
            maxBatchingWindow: cdk.Duration.seconds(0), // No batching delay
            reportBatchItemFailures: true, // Enable partial batch responses
        }));
        // Test Execution Trigger Lambda
        const triggerExecutionFunction = new lambda.Function(this, 'TriggerExecutionFunction', {
            functionName: 'misra-platform-trigger-execution',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/executions/trigger'),
            environment: {
                TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
                TEST_CASES_TABLE_NAME: testCasesTable.table.tableName,
                TEST_SUITES_TABLE_NAME: testSuitesTable.table.tableName,
                TEST_EXECUTION_QUEUE_URL: testExecutionQueue.queueUrl,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant trigger function permissions
        testExecutionsTable.table.grantReadWriteData(triggerExecutionFunction);
        testCasesTable.table.grantReadData(triggerExecutionFunction);
        testSuitesTable.table.grantReadData(triggerExecutionFunction);
        testExecutionQueue.grantSendMessages(triggerExecutionFunction);
        // Test Execution Status Lambda
        const getExecutionStatusFunction = new lambda.Function(this, 'GetExecutionStatusFunction', {
            functionName: 'misra-platform-get-execution-status',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/executions/get-status'),
            environment: {
                TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant status function permissions
        testExecutionsTable.table.grantReadData(getExecutionStatusFunction);
        // Test Execution Results Lambda
        const getExecutionResultsFunction = new lambda.Function(this, 'GetExecutionResultsFunction', {
            functionName: 'misra-platform-get-execution-results',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/executions/get-results'),
            environment: {
                TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
                SCREENSHOTS_BUCKET_NAME: screenshotsBucket.bucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant results function permissions
        testExecutionsTable.table.grantReadData(getExecutionResultsFunction);
        screenshotsBucket.bucket.grantRead(getExecutionResultsFunction);
        // Test Execution History Lambda
        const getExecutionHistoryFunction = new lambda.Function(this, 'GetExecutionHistoryFunction', {
            functionName: 'misra-platform-get-execution-history',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/executions/get-history'),
            environment: {
                TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant history function permissions
        testExecutionsTable.table.grantReadData(getExecutionHistoryFunction);
        // Test Suite Results Lambda
        const getSuiteResultsFunction = new lambda.Function(this, 'GetSuiteResultsFunction', {
            functionName: 'misra-platform-get-suite-results',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/executions/get-suite-results'),
            environment: {
                TEST_EXECUTIONS_TABLE_NAME: testExecutionsTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant suite results function permissions
        testExecutionsTable.table.grantReadData(getSuiteResultsFunction);
        // S3 event notification for upload completion
        fileStorageBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(uploadCompleteFunction), { prefix: 'uploads/' });
        // Analysis and Notification Lambda Functions
        const analysisFunction = new lambda.Function(this, 'AnalysisFunction', {
            functionName: 'misra-platform-analysis',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/analysis/analyze-file'),
            environment: {
                FILE_STORAGE_BUCKET_NAME: fileStorageBucket.bucketName,
                FILE_METADATA_TABLE: fileMetadataTable.table.tableName,
                ANALYSIS_RESULTS_TABLE: analysisResultsTable.tableName,
                ANALYSIS_CACHE_TABLE: analysisCacheTable.table.tableName,
                AWS_REGION: this.region,
            },
            timeout: cdk.Duration.minutes(5), // Requirement 10.6: Set timeout to 5 minutes
            memorySize: 2048, // Requirement 10.4: Set memory to 2GB for AST parsing
            reservedConcurrentExecutions: 0,
        });
        // Notification Processor Lambda Function
        const notificationProcessorFunction = new lambda.Function(this, 'NotificationProcessorFunction', {
            functionName: 'aibts-notification-processor',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/processor'),
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
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        // Add SQS trigger for notification processor
        notificationProcessorFunction.addEventSource(new lambdaEventSources.SqsEventSource(notificationQueue, {
            batchSize: 1, // Process 1 message at a time to avoid concurrency issues
            maxBatchingWindow: cdk.Duration.seconds(5),
        }));
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
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/notifications/seed-templates'),
            environment: {
                NOTIFICATION_TEMPLATES_TABLE: notificationTemplatesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(60),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
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
            reservedConcurrentExecutions: 0,
        });
        // Grant permissions for analysis and notification functions
        analysesTable.grantReadWriteData(analysisFunction);
        analysisResultsTable.grantReadWriteData(analysisFunction);
        fileStorageBucket.grantRead(analysisFunction); // Requirement 10.4: Grant S3 read permissions
        fileMetadataTable.grantReadWriteData(analysisFunction); // Requirement 10.4: Grant DynamoDB read/write permissions
        analysisCacheTable.table.grantReadWriteData(analysisFunction); // Requirement 10.7: Grant cache table permissions
        usersTable.grantReadData(notificationFunction);
        // Requirement 10.4: Connect analysis Lambda to SQS queue
        analysisFunction.addEventSource(new lambdaEventSources.SqsEventSource(analysisQueue, {
            batchSize: 1, // Process one analysis at a time
            maxBatchingWindow: cdk.Duration.seconds(0), // No batching delay
            reportBatchItemFailures: true, // Enable partial batch responses
        }));
        // Query Results Lambda Function
        const queryResultsFunction = new lambda.Function(this, 'QueryResultsFunction', {
            functionName: 'misra-platform-query-results',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/analysis/query-results'),
            environment: {
                ENVIRONMENT: this.stackName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // User Stats Lambda Function
        const userStatsFunction = new lambda.Function(this, 'UserStatsFunction', {
            functionName: 'misra-platform-user-stats',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/analysis/get-user-stats'),
            environment: {
                ENVIRONMENT: this.stackName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant query and stats functions access to analysis results
        analysisResultsTable.grantReadData(queryResultsFunction);
        analysisResultsTable.grantReadData(userStatsFunction);
        // AI Insights Lambda Function
        const aiInsightsFunction = new lambda.Function(this, 'AIInsightsFunction', {
            functionName: 'misra-platform-ai-insights',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/ai/generate-insights'),
            environment: {
                ENVIRONMENT: this.stackName,
            },
            timeout: cdk.Duration.seconds(60),
            memorySize: 512,
            reservedConcurrentExecutions: 0,
        });
        // Grant AI insights function access to analysis results
        analysisResultsTable.grantReadData(aiInsightsFunction);
        // aiInsightsFunction uses Lambda Authorizer context - no JWT secret needed
        // AI Feedback Lambda Function
        const aiFeedbackFunction = new lambda.Function(this, 'AIFeedbackFunction', {
            functionName: 'misra-platform-ai-feedback',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/ai/submit-feedback'),
            environment: {
                ENVIRONMENT: this.stackName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant feedback function access to store feedback
        // aiFeedbackFunction uses Lambda Authorizer context - no JWT secret needed
        // Report Generation Lambda Function
        const reportFunction = new lambda.Function(this, 'ReportFunction', {
            functionName: 'misra-platform-get-report',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/reports/get-violation-report'),
            environment: {
                ENVIRONMENT: this.stackName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        // Grant report function access to metadata
        // Note: Would need file metadata table reference here
        // Create Step Functions workflow for analysis orchestration
        const workflow = new analysis_workflow_1.AnalysisWorkflow(this, 'AnalysisWorkflow', {
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
        // Create HTTP API Lambda Authorizer for JWT verification
        const authorizer = new authorizers.HttpLambdaAuthorizer('JWTAuthorizer', authorizerFunction, {
            authorizerName: 'jwt-authorizer',
            identitySource: ['$request.header.Authorization'],
            responseTypes: [authorizers.HttpLambdaResponseType.SIMPLE],
            resultsCacheTtl: cdk.Duration.seconds(300), // 5 minutes
        });
        // Add authentication routes
        api.addRoutes({
            path: '/auth/login',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('LoginIntegration', loginFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
        });
        api.addRoutes({
            path: '/auth/register',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('RegisterIntegration', registerFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
        });
        api.addRoutes({
            path: '/auth/refresh',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('RefreshIntegration', refreshFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
        });
        // Add file upload routes
        api.addRoutes({
            path: '/files/upload',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('FileUploadIntegration', fileUploadFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/files',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetFilesIntegration', getFilesFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add report routes
        api.addRoutes({
            path: '/reports/{fileId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('ReportIntegration', reportFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add analysis query routes
        api.addRoutes({
            path: '/analysis/query',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('QueryResultsIntegration', queryResultsFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add user stats routes
        api.addRoutes({
            path: '/analysis/stats/{userId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('UserStatsIntegration', userStatsFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add AI insights routes
        api.addRoutes({
            path: '/ai/insights',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIInsightsIntegration', aiInsightsFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add AI feedback routes
        api.addRoutes({
            path: '/ai/feedback',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIFeedbackIntegration', aiFeedbackFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add project management routes
        api.addRoutes({
            path: '/projects',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateProjectIntegration', createProjectFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/projects',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetProjectsIntegration', getProjectsFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/projects/{projectId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateProjectIntegration', updateProjectFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add test suite management routes
        api.addRoutes({
            path: '/test-suites',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateTestSuiteIntegration', createTestSuiteFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/test-suites',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetTestSuitesIntegration', getTestSuitesFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/test-suites/{suiteId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateTestSuiteIntegration', updateTestSuiteFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add test case management routes
        api.addRoutes({
            path: '/test-cases',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateTestCaseIntegration', createTestCaseFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/test-cases',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetTestCasesIntegration', getTestCasesFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/test-cases/{testCaseId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateTestCaseIntegration', updateTestCaseFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add test execution routes
        api.addRoutes({
            path: '/executions/trigger',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('TriggerExecutionIntegration', triggerExecutionFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/executions/{executionId}/status',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetExecutionStatusIntegration', getExecutionStatusFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/executions/{executionId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetExecutionResultsIntegration', getExecutionResultsFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/executions/history',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetExecutionHistoryIntegration', getExecutionHistoryFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/executions/suites/{suiteExecutionId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetSuiteResultsIntegration', getSuiteResultsFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add notification preferences routes
        api.addRoutes({
            path: '/notifications/preferences',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetPreferencesIntegration', getPreferencesFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/notifications/preferences',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('UpdatePreferencesIntegration', updatePreferencesFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add notification history routes
        api.addRoutes({
            path: '/notifications/history',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetHistoryIntegration', getHistoryFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/notifications/history/{notificationId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetNotificationIntegration', getNotificationFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add notification template routes (admin only)
        api.addRoutes({
            path: '/notifications/templates',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CreateTemplateIntegration', createTemplateFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/notifications/templates/{templateId}',
            methods: [apigateway.HttpMethod.PUT],
            integration: new integrations.HttpLambdaIntegration('UpdateTemplateIntegration', updateTemplateFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/notifications/templates',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetTemplatesIntegration', getTemplatesFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        // Add AI test generation routes
        api.addRoutes({
            path: '/ai-test-generation/analyze',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIAnalyzeIntegration', aiAnalyzeFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/ai-test-generation/generate',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIGenerateTestIntegration', aiGenerateTestFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/ai-test-generation/batch',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('AIBatchGenerateIntegration', aiBatchGenerateFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/ai-test-generation/usage',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('AIGetUsageStatsIntegration', aiGetUsageStatsFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
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
        new cdk.CfnOutput(this, 'AIUsageTableName', {
            value: aiUsageTable.table.tableName,
            description: 'DynamoDB table for AI usage tracking',
        });
        // CloudWatch Alarms for Notification System
        // Alarm for DLQ depth > 0 (indicates failed notifications)
        const dlqAlarm = new cloudwatch.Alarm(this, 'NotificationDLQAlarm', {
            alarmName: 'aibts-notification-dlq-depth',
            alarmDescription: 'Alert when notification DLQ has messages (failed notifications)',
            metric: notificationDLQ.metricApproximateNumberOfMessagesVisible(),
            threshold: 0,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Alarm for queue depth > 1000 (indicates processing backlog)
        const queueDepthAlarm = new cloudwatch.Alarm(this, 'NotificationQueueDepthAlarm', {
            alarmName: 'aibts-notification-queue-depth',
            alarmDescription: 'Alert when notification queue depth exceeds 1000 messages',
            metric: notificationQueue.metricApproximateNumberOfMessagesVisible(),
            threshold: 1000,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Alarm for notification processor Lambda errors
        const processorErrorAlarm = new cloudwatch.Alarm(this, 'NotificationProcessorErrorAlarm', {
            alarmName: 'aibts-notification-processor-errors',
            alarmDescription: 'Alert when notification processor Lambda has errors',
            metric: notificationProcessorFunction.metricErrors({
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Alarm for scheduled reports Lambda errors
        const scheduledReportsErrorAlarm = new cloudwatch.Alarm(this, 'ScheduledReportsErrorAlarm', {
            alarmName: 'aibts-scheduled-reports-errors',
            alarmDescription: 'Alert when scheduled reports Lambda has errors',
            metric: scheduledReportsFunction.metricErrors({
                period: cdk.Duration.minutes(5),
            }),
            threshold: 1,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Alarm for SNS delivery failures (email)
        const snsEmailFailureAlarm = new cloudwatch.Alarm(this, 'SNSEmailFailureAlarm', {
            alarmName: 'aibts-sns-email-failures',
            alarmDescription: 'Alert when SNS email delivery fails',
            metric: emailNotificationTopic.metricNumberOfNotificationsFailed({
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Alarm for SNS delivery failures (SMS)
        const snsSmsFailureAlarm = new cloudwatch.Alarm(this, 'SNSSmsFailureAlarm', {
            alarmName: 'aibts-sns-sms-failures',
            alarmDescription: 'Alert when SNS SMS delivery fails',
            metric: smsNotificationTopic.metricNumberOfNotificationsFailed({
                period: cdk.Duration.minutes(5),
            }),
            threshold: 5,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // CloudWatch Dashboard for Notification System
        const notificationDashboard = new cloudwatch.Dashboard(this, 'NotificationDashboard', {
            dashboardName: 'AIBTS-Notification-System',
        });
        // Add widgets to dashboard
        notificationDashboard.addWidgets(
        // Queue metrics
        new cloudwatch.GraphWidget({
            title: 'Notification Queue Depth',
            left: [
                notificationQueue.metricApproximateNumberOfMessagesVisible({
                    label: 'Messages Visible',
                    period: cdk.Duration.minutes(1),
                }),
                notificationQueue.metricApproximateNumberOfMessagesNotVisible({
                    label: 'Messages In Flight',
                    period: cdk.Duration.minutes(1),
                }),
            ],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'DLQ Depth (Failed Notifications)',
            left: [
                notificationDLQ.metricApproximateNumberOfMessagesVisible({
                    label: 'Failed Messages',
                    period: cdk.Duration.minutes(1),
                    statistic: 'Sum',
                }),
            ],
            width: 12,
        }));
        notificationDashboard.addWidgets(
        // Lambda metrics
        new cloudwatch.GraphWidget({
            title: 'Notification Processor Performance',
            left: [
                notificationProcessorFunction.metricInvocations({
                    label: 'Invocations',
                    period: cdk.Duration.minutes(5),
                }),
                notificationProcessorFunction.metricErrors({
                    label: 'Errors',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            right: [
                notificationProcessorFunction.metricDuration({
                    label: 'Duration',
                    period: cdk.Duration.minutes(5),
                    statistic: 'Average',
                }),
            ],
            width: 12,
        }), new cloudwatch.GraphWidget({
            title: 'Scheduled Reports Performance',
            left: [
                scheduledReportsFunction.metricInvocations({
                    label: 'Invocations',
                    period: cdk.Duration.minutes(5),
                }),
                scheduledReportsFunction.metricErrors({
                    label: 'Errors',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            right: [
                scheduledReportsFunction.metricDuration({
                    label: 'Duration',
                    period: cdk.Duration.minutes(5),
                    statistic: 'Average',
                }),
            ],
            width: 12,
        }));
        notificationDashboard.addWidgets(
        // SNS delivery metrics
        new cloudwatch.GraphWidget({
            title: 'SNS Email Delivery',
            left: [
                emailNotificationTopic.metricNumberOfMessagesPublished({
                    label: 'Published',
                    period: cdk.Duration.minutes(5),
                }),
                emailNotificationTopic.metricNumberOfNotificationsDelivered({
                    label: 'Delivered',
                    period: cdk.Duration.minutes(5),
                }),
                emailNotificationTopic.metricNumberOfNotificationsFailed({
                    label: 'Failed',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            width: 8,
        }), new cloudwatch.GraphWidget({
            title: 'SNS SMS Delivery',
            left: [
                smsNotificationTopic.metricNumberOfMessagesPublished({
                    label: 'Published',
                    period: cdk.Duration.minutes(5),
                }),
                smsNotificationTopic.metricNumberOfNotificationsDelivered({
                    label: 'Delivered',
                    period: cdk.Duration.minutes(5),
                }),
                smsNotificationTopic.metricNumberOfNotificationsFailed({
                    label: 'Failed',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            width: 8,
        }), new cloudwatch.GraphWidget({
            title: 'SNS Webhook Delivery',
            left: [
                webhookNotificationTopic.metricNumberOfMessagesPublished({
                    label: 'Published',
                    period: cdk.Duration.minutes(5),
                }),
                webhookNotificationTopic.metricNumberOfNotificationsDelivered({
                    label: 'Delivered',
                    period: cdk.Duration.minutes(5),
                }),
                webhookNotificationTopic.metricNumberOfNotificationsFailed({
                    label: 'Failed',
                    period: cdk.Duration.minutes(5),
                }),
            ],
            width: 8,
        }));
        // Output dashboard URL
        new cdk.CfnOutput(this, 'NotificationDashboardUrl', {
            value: `https://console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${notificationDashboard.dashboardName}`,
            description: 'CloudWatch Dashboard for Notification System',
        });
        // Cognito outputs
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: 'misra-platform-user-pool-id',
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: 'misra-platform-user-pool-client-id',
        });
        new cdk.CfnOutput(this, 'UserPoolArn', {
            value: userPool.userPoolArn,
            description: 'Cognito User Pool ARN',
            exportName: 'misra-platform-user-pool-arn',
        });
    }
}
exports.MisraPlatformStack = MisraPlatformStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLHNFQUF3RDtBQUN4RCxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBQ2pELHlGQUEyRTtBQUMzRSx5RUFBMkQ7QUFDM0Qsd0ZBQTBFO0FBQzFFLHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQsd0VBQTBEO0FBQzFELCtFQUFpRTtBQUNqRSx1RUFBeUQ7QUFDekQsNEVBQThEO0FBQzlELHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFFbkQsMkRBQXVEO0FBQ3ZELCtEQUEwRDtBQUMxRCxxREFBaUQ7QUFDakQsMkRBQXNEO0FBQ3RELHlEQUFvRDtBQUNwRCxtRUFBOEQ7QUFDOUQsNkRBQXlEO0FBQ3pELHFGQUFnRjtBQUNoRixpRkFBNEU7QUFDNUUsNkVBQXdFO0FBQ3hFLHFEQUFnRDtBQUNoRCxpRUFBNEQ7QUFFNUQsTUFBYSxrQkFBbUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDhCQUE4QjtRQUM5QixNQUFNLGlCQUFpQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDakUsVUFBVSxFQUFFLHdCQUF3QixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2xELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGlCQUFpQixFQUFFLEVBQUUs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YXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgczNuIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1ub3RpZmljYXRpb25zJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGFFdmVudFNvdXJjZXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcclxuaW1wb3J0ICogYXMgaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcclxuaW1wb3J0ICogYXMgYXV0aG9yaXplcnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XHJcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcclxuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcclxuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcclxuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgQW5hbHlzaXNXb3JrZmxvdyB9IGZyb20gJy4vYW5hbHlzaXMtd29ya2Zsb3cnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFUYWJsZSB9IGZyb20gJy4vZmlsZS1tZXRhZGF0YS10YWJsZSc7XHJcbmltcG9ydCB7IFByb2plY3RzVGFibGUgfSBmcm9tICcuL3Byb2plY3RzLXRhYmxlJztcclxuaW1wb3J0IHsgVGVzdFN1aXRlc1RhYmxlIH0gZnJvbSAnLi90ZXN0LXN1aXRlcy10YWJsZSc7XHJcbmltcG9ydCB7IFRlc3RDYXNlc1RhYmxlIH0gZnJvbSAnLi90ZXN0LWNhc2VzLXRhYmxlJztcclxuaW1wb3J0IHsgVGVzdEV4ZWN1dGlvbnNUYWJsZSB9IGZyb20gJy4vdGVzdC1leGVjdXRpb25zLXRhYmxlJztcclxuaW1wb3J0IHsgU2NyZWVuc2hvdHNCdWNrZXQgfSBmcm9tICcuL3NjcmVlbnNob3RzLWJ1Y2tldCc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUgfSBmcm9tICcuL25vdGlmaWNhdGlvbi1wcmVmZXJlbmNlcy10YWJsZSc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlIH0gZnJvbSAnLi9ub3RpZmljYXRpb24tdGVtcGxhdGVzLXRhYmxlJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlIH0gZnJvbSAnLi9ub3RpZmljYXRpb24taGlzdG9yeS10YWJsZSc7XHJcbmltcG9ydCB7IEFJVXNhZ2VUYWJsZSB9IGZyb20gJy4vYWktdXNhZ2UtdGFibGUnO1xyXG5pbXBvcnQgeyBBbmFseXNpc0NhY2hlVGFibGUgfSBmcm9tICcuL2FuYWx5c2lzLWNhY2hlLXRhYmxlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBNaXNyYVBsYXRmb3JtU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIFMzIEJ1Y2tldHMgZm9yIGZpbGUgc3RvcmFnZVxyXG4gICAgY29uc3QgZmlsZVN0b3JhZ2VCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYG1pc3JhLXBsYXRmb3JtLWZpbGVzLSR7dGhpcy5hY2NvdW50fWAsXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGZyb250ZW5kQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRnJvbnRlbmRCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1mcm9udGVuZC0ke3RoaXMuYWNjb3VudH1gLFxyXG4gICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICB3ZWJzaXRlRXJyb3JEb2N1bWVudDogJ2luZGV4Lmh0bWwnLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUNMUyxcclxuICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBmb3IgZnJvbnRlbmRcclxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRnJvbnRlbmREaXN0cmlidXRpb24nLCB7XHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oZnJvbnRlbmRCdWNrZXQpLFxyXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICB9LFxyXG4gICAgICBlcnJvclJlc3BvbnNlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwNCxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDMsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbCBmb3IgYXV0aGVudGljYXRpb25cclxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgdXNlcm5hbWU6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgICBhdXRvVmVyaWZ5OiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmdWxsbmFtZToge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgXHJcbiAgICAgICAgICBtaW5MZW46IDEsIFxyXG4gICAgICAgICAgbWF4TGVuOiAyNTYsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IFxyXG4gICAgICAgICAgbWluTGVuOiAxLCBcclxuICAgICAgICAgIG1heExlbjogNTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG4gICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgIG1pbkxlbmd0aDogOCxcclxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlU3ltYm9sczogZmFsc2UsXHJcbiAgICAgICAgdGVtcFBhc3N3b3JkVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICB9LFxyXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgbWZhOiBjb2duaXRvLk1mYS5PUFRJT05BTCxcclxuICAgICAgbWZhU2Vjb25kRmFjdG9yOiB7XHJcbiAgICAgICAgc21zOiBmYWxzZSxcclxuICAgICAgICBvdHA6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdWZXJpZnkgeW91ciBlbWFpbCBmb3IgTWlzcmEgUGxhdGZvcm0nLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ1RoYW5rIHlvdSBmb3Igc2lnbmluZyB1cCEgWW91ciB2ZXJpZmljYXRpb24gY29kZSBpcyB7IyMjI30nLFxyXG4gICAgICAgIGVtYWlsU3R5bGU6IGNvZ25pdG8uVmVyaWZpY2F0aW9uRW1haWxTdHlsZS5DT0RFLFxyXG4gICAgICB9LFxyXG4gICAgICB1c2VySW52aXRhdGlvbjoge1xyXG4gICAgICAgIGVtYWlsU3ViamVjdDogJ1dlbGNvbWUgdG8gTWlzcmEgUGxhdGZvcm0nLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ0hlbGxvIHt1c2VybmFtZX0sIHlvdSBoYXZlIGJlZW4gaW52aXRlZCB0byBqb2luIE1pc3JhIFBsYXRmb3JtLiBZb3VyIHRlbXBvcmFyeSBwYXNzd29yZCBpcyB7IyMjI30nLFxyXG4gICAgICB9LFxyXG4gICAgICBkZXZpY2VUcmFja2luZzoge1xyXG4gICAgICAgIGNoYWxsZW5nZVJlcXVpcmVkT25OZXdEZXZpY2U6IHRydWUsXHJcbiAgICAgICAgZGV2aWNlT25seVJlbWVtYmVyZWRPblVzZXJQcm9tcHQ6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IHVzZXJQb29sLmFkZENsaWVudCgnV2ViQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbENsaWVudE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS13ZWItY2xpZW50JyxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxyXG4gICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXHJcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXHJcbiAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgIGFjY2Vzc1Rva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGVuYWJsZVRva2VuUmV2b2NhdGlvbjogdHJ1ZSxcclxuICAgICAgcmVhZEF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZW1haWxWZXJpZmllZDogdHJ1ZSxcclxuICAgICAgICAgIGZ1bGxuYW1lOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKCdvcmdhbml6YXRpb25JZCcsICdyb2xlJyksXHJcbiAgICAgIHdyaXRlQXR0cmlidXRlczogbmV3IGNvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpXHJcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBmdWxsbmFtZTogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcygnb3JnYW5pemF0aW9uSWQnLCAncm9sZScpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRHluYW1vREIgVGFibGVzIC0gVXNpbmcgZXhpc3RpbmcgdGFibGUgbmFtZXMgZnJvbSBwcmV2aW91cyBkZXBsb3ltZW50XHJcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2Vyc1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIG9yZ2FuaXphdGlvbiBxdWVyaWVzXHJcbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnb3JnYW5pemF0aW9uSWQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ29yZ2FuaXphdGlvbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIGVtYWlsIHF1ZXJpZXNcclxuICAgIHVzZXJzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdlbWFpbC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVXNlIGV4aXN0aW5nIFRlc3RQcm9qZWN0cyB0YWJsZVxyXG4gICAgY29uc3QgcHJvamVjdHNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUHJvamVjdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnVGVzdFByb2plY3RzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdwcm9qZWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdvcmdhbml6YXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhbmFseXNlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBbmFseXNlc1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNlcycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnYW5hbHlzaXNJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3Byb2plY3RJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJcyBmb3IgZWZmaWNpZW50IHF1ZXJ5aW5nXHJcbiAgICBhbmFseXNlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAncHJvamVjdElkLWNyZWF0ZWRBdC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFuYWx5c2VzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdzdGF0dXMtY3JlYXRlZEF0LWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzdGF0dXMnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdGVzdFJ1bnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVGVzdFJ1bnNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tdGVzdC1ydW5zJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd0ZXN0UnVuSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdwcm9qZWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgUmVzdWx0cyBUYWJsZSBmb3Igc3RvcmluZyBkZXRhaWxlZCBNSVNSQSBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQW5hbHlzaXNSZXN1bHRzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLXJlc3VsdHMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2FuYWx5c2lzSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSXMgZm9yIGFuYWx5c2lzIHJlc3VsdHMgcXVlcmllc1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdmaWxlSWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdmaWxlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICd1c2VySWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdydWxlU2V0LXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncnVsZVNldCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGaWxlIE1ldGFkYXRhIFRhYmxlIGZvciB0cmFja2luZyB1cGxvYWRlZCBmaWxlcyBhbmQgYW5hbHlzaXMgc3RhdHVzXHJcbiAgICBjb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IG5ldyBGaWxlTWV0YWRhdGFUYWJsZSh0aGlzLCAnRmlsZU1ldGFkYXRhVGFibGUnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiAnZGV2J1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvamVjdHMgVGFibGUgZm9yIFdlYiBBcHAgVGVzdGluZyBTeXN0ZW0gLSBVc2luZyBleGlzdGluZyBUZXN0UHJvamVjdHMgdGFibGVcclxuICAgIGNvbnN0IHRlc3RQcm9qZWN0c1RhYmxlID0gbmV3IFByb2plY3RzVGFibGUodGhpcywgJ1Rlc3RQcm9qZWN0c1RhYmxlJyk7XHJcblxyXG4gICAgLy8gVGVzdCBTdWl0ZXMgVGFibGUgZm9yIFdlYiBBcHAgVGVzdGluZyBTeXN0ZW0gLSBVc2luZyBleGlzdGluZyBUZXN0U3VpdGVzIHRhYmxlXHJcbiAgICBjb25zdCB0ZXN0U3VpdGVzVGFibGUgPSBuZXcgVGVzdFN1aXRlc1RhYmxlKHRoaXMsICdUZXN0U3VpdGVzVGFibGUnKTtcclxuXHJcbiAgICAvLyBUZXN0IENhc2VzIFRhYmxlIGZvciBXZWIgQXBwIFRlc3RpbmcgU3lzdGVtIC0gVXNpbmcgZXhpc3RpbmcgVGVzdENhc2VzIHRhYmxlXHJcbiAgICBjb25zdCB0ZXN0Q2FzZXNUYWJsZSA9IG5ldyBUZXN0Q2FzZXNUYWJsZSh0aGlzLCAnVGVzdENhc2VzVGFibGUnKTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbnMgVGFibGUgZm9yIFdlYiBBcHAgVGVzdGluZyBTeXN0ZW0gLSBVc2luZyBleGlzdGluZyBUZXN0RXhlY3V0aW9ucyB0YWJsZVxyXG4gICAgY29uc3QgdGVzdEV4ZWN1dGlvbnNUYWJsZSA9IG5ldyBUZXN0RXhlY3V0aW9uc1RhYmxlKHRoaXMsICdUZXN0RXhlY3V0aW9uc1RhYmxlJyk7XHJcblxyXG4gICAgLy8gU2NyZWVuc2hvdHMgQnVja2V0IGZvciBUZXN0IEV4ZWN1dGlvbiBGYWlsdXJlc1xyXG4gICAgY29uc3Qgc2NyZWVuc2hvdHNCdWNrZXQgPSBuZXcgU2NyZWVuc2hvdHNCdWNrZXQodGhpcywgJ1NjcmVlbnNob3RzQnVja2V0Jywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBTeXN0ZW0gVGFibGVzXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlID0gbmV3IE5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUodGhpcywgJ05vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiAnZGV2J1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUgPSBuZXcgTm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUodGhpcywgJ05vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZSA9IG5ldyBOb3RpZmljYXRpb25IaXN0b3J5VGFibGUodGhpcywgJ05vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZScsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6ICdkZXYnXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSBVc2FnZSBUYWJsZSBmb3IgQUkgVGVzdCBHZW5lcmF0aW9uIC0gVXNpbmcgZXhpc3RpbmcgQUlVc2FnZSB0YWJsZVxyXG4gICAgY29uc3QgYWlVc2FnZVRhYmxlID0gbmV3IEFJVXNhZ2VUYWJsZSh0aGlzLCAnQUlVc2FnZVRhYmxlJyk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgQ2FjaGUgVGFibGUgZm9yIE1JU1JBIGFuYWx5c2lzIGNhY2hpbmcgKFJlcXVpcmVtZW50IDEwLjcpXHJcbiAgICBjb25zdCBhbmFseXNpc0NhY2hlVGFibGUgPSBuZXcgQW5hbHlzaXNDYWNoZVRhYmxlKHRoaXMsICdBbmFseXNpc0NhY2hlVGFibGUnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiAnZGV2J1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU05TIFRvcGljcyBmb3IgTm90aWZpY2F0aW9uIERlbGl2ZXJ5XHJcbiAgICBjb25zdCBlbWFpbE5vdGlmaWNhdGlvblRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnRW1haWxOb3RpZmljYXRpb25Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiAnYWlidHMtbm90aWZpY2F0aW9ucy1lbWFpbCcsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiAnQUlCVFMgRW1haWwgTm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzbXNOb3RpZmljYXRpb25Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ1Ntc05vdGlmaWNhdGlvblRvcGljJywge1xyXG4gICAgICB0b3BpY05hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb25zLXNtcycsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiAnQUlCVFMgU01TIE5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgd2ViaG9va05vdGlmaWNhdGlvblRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnV2ViaG9va05vdGlmaWNhdGlvblRvcGljJywge1xyXG4gICAgICB0b3BpY05hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb25zLXdlYmhvb2snLFxyXG4gICAgICBkaXNwbGF5TmFtZTogJ0FJQlRTIFdlYmhvb2sgTm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTUVMgUXVldWUgZm9yIG5vdGlmaWNhdGlvbiBwcm9jZXNzaW5nXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25ETFEgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdOb3RpZmljYXRpb25ETFEnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbi1kbHEnLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSwgLy8gS2VlcCBmYWlsZWQgbWVzc2FnZXMgZm9yIDE0IGRheXNcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvblF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnTm90aWZpY2F0aW9uUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbi1xdWV1ZScsXHJcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksIC8vIE1hdGNoIExhbWJkYSB0aW1lb3V0XHJcbiAgICAgIHJlY2VpdmVNZXNzYWdlV2FpdFRpbWU6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDIwKSwgLy8gTG9uZyBwb2xsaW5nXHJcbiAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoNCksXHJcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xyXG4gICAgICAgIHF1ZXVlOiBub3RpZmljYXRpb25ETFEsXHJcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLCAvLyBSZXRyeSB1cCB0byAzIHRpbWVzIGJlZm9yZSBtb3ZpbmcgdG8gRExRXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFdmVudEJyaWRnZSBSdWxlIGZvciBUZXN0IENvbXBsZXRpb24gRXZlbnRzXHJcbiAgICAvLyBSb3V0ZXMgdGVzdCBleGVjdXRpb24gY29tcGxldGlvbiBldmVudHMgdG8gbm90aWZpY2F0aW9uIHF1ZXVlXHJcbiAgICBjb25zdCB0ZXN0Q29tcGxldGlvblJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ1Rlc3RDb21wbGV0aW9uUnVsZScsIHtcclxuICAgICAgcnVsZU5hbWU6ICdhaWJ0cy10ZXN0LWV4ZWN1dGlvbi1jb21wbGV0aW9uJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdSb3V0ZXMgdGVzdCBleGVjdXRpb24gY29tcGxldGlvbiBldmVudHMgdG8gbm90aWZpY2F0aW9uIHF1ZXVlJyxcclxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgc291cmNlOiBbJ2FpYnRzLnRlc3QtZXhlY3V0aW9uJ10sXHJcbiAgICAgICAgZGV0YWlsVHlwZTogWydUZXN0IEV4ZWN1dGlvbiBDb21wbGV0ZWQnXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBub3RpZmljYXRpb24gcXVldWUgYXMgdGFyZ2V0IGZvciB0ZXN0IGNvbXBsZXRpb24gZXZlbnRzXHJcbiAgICB0ZXN0Q29tcGxldGlvblJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLlNxc1F1ZXVlKG5vdGlmaWNhdGlvblF1ZXVlKSk7XHJcblxyXG4gICAgLy8gU2NoZWR1bGVkIFJlcG9ydHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCBzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLXNjaGVkdWxlZC1yZXBvcnRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9zY2hlZHVsZWQtcmVwb3J0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1FVRVVFX1VSTDogbm90aWZpY2F0aW9uUXVldWUucXVldWVVcmwsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBzY2hlZHVsZWQgcmVwb3J0cyBmdW5jdGlvblxyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbik7XHJcbiAgICBub3RpZmljYXRpb25RdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyhzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEV2ZW50QnJpZGdlIENyb24gUnVsZXMgZm9yIFNjaGVkdWxlZCBSZXBvcnRzXHJcbiAgICAvLyBEYWlseSBSZXBvcnQgLSAwOTowMCBVVEMgZGFpbHlcclxuICAgIGNvbnN0IGRhaWx5UmVwb3J0UnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnRGFpbHlSZXBvcnRSdWxlJywge1xyXG4gICAgICBydWxlTmFtZTogJ2FpYnRzLWRhaWx5LXN1bW1hcnktcmVwb3J0JyxcclxuICAgICAgZGVzY3JpcHRpb246ICdUcmlnZ2VycyBkYWlseSB0ZXN0IGV4ZWN1dGlvbiBzdW1tYXJ5IHJlcG9ydCcsXHJcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7XHJcbiAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgaG91cjogJzknLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG4gICAgZGFpbHlSZXBvcnRSdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyBXZWVrbHkgUmVwb3J0IC0gMDk6MDAgVVRDIGV2ZXJ5IE1vbmRheVxyXG4gICAgY29uc3Qgd2Vla2x5UmVwb3J0UnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnV2Vla2x5UmVwb3J0UnVsZScsIHtcclxuICAgICAgcnVsZU5hbWU6ICdhaWJ0cy13ZWVrbHktc3VtbWFyeS1yZXBvcnQnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RyaWdnZXJzIHdlZWtseSB0ZXN0IGV4ZWN1dGlvbiBzdW1tYXJ5IHJlcG9ydCcsXHJcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7XHJcbiAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgaG91cjogJzknLFxyXG4gICAgICAgIHdlZWtEYXk6ICdNT04nLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG4gICAgd2Vla2x5UmVwb3J0UnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uKSk7XHJcblxyXG4gICAgLy8gTm90aWZpY2F0aW9uIFByZWZlcmVuY2VzIEFQSSBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UHJlZmVyZW5jZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LXByZWZlcmVuY2VzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9nZXQtcHJlZmVyZW5jZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fUFJFRkVSRU5DRVNfVEFCTEU6IG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGRhdGVQcmVmZXJlbmNlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy11cGRhdGUtcHJlZmVyZW5jZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL3VwZGF0ZS1wcmVmZXJlbmNlcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9QUkVGRVJFTkNFU19UQUJMRTogbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTm90aWZpY2F0aW9uIEhpc3RvcnkgQVBJIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldEhpc3RvcnlGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEhpc3RvcnlGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LWhpc3RvcnknLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2dldC1oaXN0b3J5JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX0hJU1RPUllfVEFCTEU6IG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXROb3RpZmljYXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LW5vdGlmaWNhdGlvbicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvZ2V0LW5vdGlmaWNhdGlvbicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9ISVNUT1JZX1RBQkxFOiBub3RpZmljYXRpb25IaXN0b3J5VGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBUZW1wbGF0ZSBBUEkgTGFtYmRhIEZ1bmN0aW9ucyAoQWRtaW4gT25seSlcclxuICAgIGNvbnN0IGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1jcmVhdGUtdGVtcGxhdGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2NyZWF0ZS10ZW1wbGF0ZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9URU1QTEFURVNfVEFCTEU6IG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlVGVtcGxhdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtdXBkYXRlLXRlbXBsYXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy91cGRhdGUtdGVtcGxhdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0VGVtcGxhdGVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRUZW1wbGF0ZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LXRlbXBsYXRlcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvZ2V0LXRlbXBsYXRlcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9URU1QTEFURVNfVEFCTEU6IG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBub3RpZmljYXRpb24gQVBJIGZ1bmN0aW9uc1xyXG4gICAgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldFByZWZlcmVuY2VzRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbik7XHJcbiAgICBub3RpZmljYXRpb25IaXN0b3J5VGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRIaXN0b3J5RnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZVRlbXBsYXRlRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRUZW1wbGF0ZXNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gU1FTIFF1ZXVlIGZvciBhc3luYyBwcm9jZXNzaW5nXHJcbiAgICBjb25zdCBwcm9jZXNzaW5nUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdQcm9jZXNzaW5nUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLXBsYXRmb3JtLXByb2Nlc3NpbmcnLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZSh0aGlzLCAnUHJvY2Vzc2luZ0RMUScsIHtcclxuICAgICAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLXBsYXRmb3JtLXByb2Nlc3NpbmctZGxxJyxcclxuICAgICAgICB9KSxcclxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTUVMgUXVldWUgZm9yIE1JU1JBIGFuYWx5c2lzIChSZXF1aXJlbWVudCAxMC41KVxyXG4gICAgY29uc3QgYW5hbHlzaXNRdWV1ZURMUSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0FuYWx5c2lzUXVldWVETFEnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLWFuYWx5c2lzLWRscScsXHJcbiAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoMTQpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYW5hbHlzaXNRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0FuYWx5c2lzUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLWFuYWx5c2lzLXF1ZXVlJyxcclxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICByZWNlaXZlTWVzc2FnZVdhaXRUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksXHJcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xyXG4gICAgICAgIHF1ZXVlOiBhbmFseXNpc1F1ZXVlRExRLFxyXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNRUyBRdWV1ZSBmb3IgdGVzdCBleGVjdXRpb25cclxuICAgIGNvbnN0IHRlc3RFeGVjdXRpb25ETFEgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdUZXN0RXhlY3V0aW9uRExRJywge1xyXG4gICAgICBxdWV1ZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS10ZXN0LWV4ZWN1dGlvbi1kbHEnLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSwgLy8gS2VlcCBmYWlsZWQgbWVzc2FnZXMgZm9yIDE0IGRheXNcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHRlc3RFeGVjdXRpb25RdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ1Rlc3RFeGVjdXRpb25RdWV1ZScsIHtcclxuICAgICAgcXVldWVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tdGVzdC1leGVjdXRpb24nLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyBNYXRjaCBMYW1iZGEgdGltZW91dFxyXG4gICAgICByZWNlaXZlTWVzc2FnZVdhaXRUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksIC8vIExvbmcgcG9sbGluZ1xyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogdGVzdEV4ZWN1dGlvbkRMUSxcclxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsIC8vIFJldHJ5IHVwIHRvIDMgdGltZXMgYmVmb3JlIG1vdmluZyB0byBETFFcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlY3JldHMgTWFuYWdlciBmb3IgSldUIGtleXNcclxuICAgIGNvbnN0IGp3dFNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0pXVFNlY3JldCcsIHtcclxuICAgICAgc2VjcmV0TmFtZTogJ21pc3JhLXBsYXRmb3JtLWp3dC1zZWNyZXQnLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lOiAnand0JyB9KSxcclxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3NlY3JldCcsXHJcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGEgQXV0aG9yaXplciBmb3IgSldUIHZlcmlmaWNhdGlvblxyXG4gICAgY29uc3QgYXV0aG9yaXplckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQXV0aG9yaXplckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hdXRob3JpemVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9hdXRob3JpemVyJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgSldUX1NFQ1JFVF9OQU1FOiBqd3RTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IFNlY3JldHMgTWFuYWdlciByZWFkIGFjY2VzcyB0byBhdXRob3JpemVyXHJcbiAgICBqd3RTZWNyZXQuZ3JhbnRSZWFkKGF1dGhvcml6ZXJGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgbG9naW5GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0xvZ2luRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWxvZ2luJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9sb2dpbicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgICAgTjhOX1dFQkhPT0tfVVJMOiBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkwgfHwgJycsXHJcbiAgICAgICAgTjhOX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZWdpc3RlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmVnaXN0ZXJGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tcmVnaXN0ZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hdXRoL3JlZ2lzdGVyJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgSldUX1NFQ1JFVF9OQU1FOiBqd3RTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgICBOOE5fV0VCSE9PS19VUkw6IHByb2Nlc3MuZW52Lk44Tl9XRUJIT09LX1VSTCB8fCAnJyxcclxuICAgICAgICBOOE5fQVBJX0tFWTogcHJvY2Vzcy5lbnYuTjhOX0FQSV9LRVkgfHwgJycsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlZnJlc2hGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tcmVmcmVzaCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvcmVmcmVzaCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgVXBsb2FkIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGZpbGVVcGxvYWRGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0ZpbGVVcGxvYWRGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZmlsZS11cGxvYWQnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlL3VwbG9hZCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ2RldicsXHJcbiAgICAgICAgQU5BTFlTSVNfUVVFVUVfVVJMOiBhbmFseXNpc1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBsb2FkQ29tcGxldGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXBsb2FkLWNvbXBsZXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS91cGxvYWQtY29tcGxldGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQUk9DRVNTSU5HX1FVRVVFX1VSTDogcHJvY2Vzc2luZ1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICAgIEVOVklST05NRU5UOiAnZGV2JyxcclxuICAgICAgICBTVEFURV9NQUNISU5FX0FSTjogJycsIC8vIFdpbGwgYmUgc2V0IGFmdGVyIHdvcmtmbG93IGlzIGNyZWF0ZWRcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRGaWxlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0RmlsZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZ2V0LWZpbGVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS9nZXQtZmlsZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ2RldicsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFByb2plY3QgTWFuYWdlbWVudCBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBjcmVhdGVQcm9qZWN0RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVQcm9qZWN0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWNyZWF0ZS1wcm9qZWN0JyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvcHJvamVjdHMvY3JlYXRlLXByb2plY3QnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQUk9KRUNUU19UQUJMRV9OQU1FOiB0ZXN0UHJvamVjdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldFByb2plY3RzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRQcm9qZWN0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtcHJvamVjdHMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9wcm9qZWN0cy9nZXQtcHJvamVjdHMtbWluaW1hbCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFX05BTUU6IHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlUHJvamVjdEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlUHJvamVjdEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11cGRhdGUtcHJvamVjdCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Byb2plY3RzL3VwZGF0ZS1wcm9qZWN0JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUFJPSkVDVFNfVEFCTEVfTkFNRTogdGVzdFByb2plY3RzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUZXN0IFN1aXRlIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY3JlYXRlVGVzdFN1aXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVUZXN0U3VpdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tY3JlYXRlLXRlc3Qtc3VpdGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LXN1aXRlcy9jcmVhdGUtc3VpdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRUZXN0U3VpdGVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRUZXN0U3VpdGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC10ZXN0LXN1aXRlcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3Qtc3VpdGVzL2dldC1zdWl0ZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZXN0U3VpdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVRlc3RTdWl0ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11cGRhdGUtdGVzdC1zdWl0ZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3Qtc3VpdGVzL3VwZGF0ZS1zdWl0ZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfU1VJVEVTX1RBQkxFX05BTUU6IHRlc3RTdWl0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRlc3QgQ2FzZSBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RDYXNlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1jcmVhdGUtdGVzdC1jYXNlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvdGVzdC1jYXNlcy9jcmVhdGUtdGVzdC1jYXNlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldFRlc3RDYXNlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VGVzdENhc2VzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC10ZXN0LWNhc2VzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvdGVzdC1jYXNlcy9nZXQtdGVzdC1jYXNlcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlVGVzdENhc2VGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXBkYXRlLXRlc3QtY2FzZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3QtY2FzZXMvdXBkYXRlLXRlc3QtY2FzZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xyXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobG9naW5GdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyZWZyZXNoRnVuY3Rpb24pO1xyXG4gICAgand0U2VjcmV0LmdyYW50UmVhZChsb2dpbkZ1bmN0aW9uKTtcclxuICAgIGp3dFNlY3JldC5ncmFudFJlYWQocmVmcmVzaEZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgLy8gRmlsZSB1cGxvYWQgcGVybWlzc2lvbnNcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZFdyaXRlKGZpbGVVcGxvYWRGdW5jdGlvbik7XHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5ncmFudFJlYWQodXBsb2FkQ29tcGxldGVGdW5jdGlvbik7XHJcbiAgICBwcm9jZXNzaW5nUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXModXBsb2FkQ29tcGxldGVGdW5jdGlvbik7XHJcbiAgICBhbmFseXNpc1F1ZXVlLmdyYW50U2VuZE1lc3NhZ2VzKGZpbGVVcGxvYWRGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEZpbGUgbWV0YWRhdGEgcGVybWlzc2lvbnNcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmaWxlVXBsb2FkRnVuY3Rpb24pO1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwbG9hZENvbXBsZXRlRnVuY3Rpb24pO1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRGaWxlc0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBQcm9qZWN0IG1hbmFnZW1lbnQgcGVybWlzc2lvbnNcclxuICAgIHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVQcm9qZWN0RnVuY3Rpb24pO1xyXG4gICAgdGVzdFByb2plY3RzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQcm9qZWN0c0Z1bmN0aW9uKTtcclxuICAgIHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVQcm9qZWN0RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3Qgc3VpdGUgbWFuYWdlbWVudCBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZXN0U3VpdGVGdW5jdGlvbik7XHJcbiAgICB0ZXN0U3VpdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRUZXN0U3VpdGVzRnVuY3Rpb24pO1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVUZXN0U3VpdGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVzdCBjYXNlIG1hbmFnZW1lbnQgcGVybWlzc2lvbnNcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uKTtcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0VGVzdENhc2VzRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZVRlc3RDYXNlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFJIFRlc3QgR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBhaUFuYWx5emVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJQW5hbHl6ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1haS1hbmFseXplJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2FuYWx5emUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAvLyBUYXNrIDEwLjE6IEFkZCBCZWRyb2NrIGNvbmZpZ3VyYXRpb24gZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgICAgICAgQUlfUFJPVklERVI6IHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIHx8ICdCRURST0NLJyxcclxuICAgICAgICBCRURST0NLX1JFR0lPTjogcHJvY2Vzcy5lbnYuQkVEUk9DS19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogcHJvY2Vzcy5lbnYuQkVEUk9DS19NT0RFTF9JRCB8fCAnYW50aHJvcGljLmNsYXVkZS0zLTUtc29ubmV0LTIwMjQxMDIyLXYyOjAnLFxyXG4gICAgICAgIEJFRFJPQ0tfVElNRU9VVDogcHJvY2Vzcy5lbnYuQkVEUk9DS19USU1FT1VUIHx8ICczMDAwMCcsXHJcbiAgICAgICAgRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORzogcHJvY2Vzcy5lbnYuRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORyB8fCAndHJ1ZScsXHJcbiAgICAgICAgLy8gVGFzayAxMi4xOiBBZGQgY2FuYXJ5IGRlcGxveW1lbnQgdHJhZmZpYyBwZXJjZW50YWdlXHJcbiAgICAgICAgQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0U6IHByb2Nlc3MuZW52LkJFRFJPQ0tfVFJBRkZJQ19QRVJDRU5UQUdFIHx8ICcwJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksIC8vIEJyb3dzZXIgYXV0b21hdGlvbiBjYW4gdGFrZSB0aW1lXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsIC8vIFB1cHBldGVlciBuZWVkcyBtb3JlIG1lbW9yeVxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsIC8vIFRhc2sgOC4zOiBFbmFibGUgWC1SYXkgdHJhY2luZ1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJR2VuZXJhdGVUZXN0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWFpLWdlbmVyYXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2dlbmVyYXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICcnLFxyXG4gICAgICAgIC8vIFRhc2sgMTAuMTogQWRkIEJlZHJvY2sgY29uZmlndXJhdGlvbiBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgICAgICBBSV9QUk9WSURFUjogcHJvY2Vzcy5lbnYuQUlfUFJPVklERVIgfHwgJ0JFRFJPQ0snLFxyXG4gICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBwcm9jZXNzLmVudi5CRURST0NLX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBwcm9jZXNzLmVudi5CRURST0NLX01PREVMX0lEIHx8ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgICAgQkVEUk9DS19USU1FT1VUOiBwcm9jZXNzLmVudi5CRURST0NLX1RJTUVPVVQgfHwgJzMwMDAwJyxcclxuICAgICAgICBFTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HOiBwcm9jZXNzLmVudi5FTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HIHx8ICd0cnVlJyxcclxuICAgICAgICAvLyBUYXNrIDEyLjE6IEFkZCBjYW5hcnkgZGVwbG95bWVudCB0cmFmZmljIHBlcmNlbnRhZ2VcclxuICAgICAgICBCRURST0NLX1RSQUZGSUNfUEVSQ0VOVEFHRTogcHJvY2Vzcy5lbnYuQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgfHwgJzAnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLCAvLyBUYXNrIDguMzogRW5hYmxlIFgtUmF5IHRyYWNpbmdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlCYXRjaEdlbmVyYXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWFpLWJhdGNoJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2JhdGNoJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICcnLFxyXG4gICAgICAgIC8vIFRhc2sgMTAuMTogQWRkIEJlZHJvY2sgY29uZmlndXJhdGlvbiBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgICAgICBBSV9QUk9WSURFUjogcHJvY2Vzcy5lbnYuQUlfUFJPVklERVIgfHwgJ0JFRFJPQ0snLFxyXG4gICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBwcm9jZXNzLmVudi5CRURST0NLX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBwcm9jZXNzLmVudi5CRURST0NLX01PREVMX0lEIHx8ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgICAgQkVEUk9DS19USU1FT1VUOiBwcm9jZXNzLmVudi5CRURST0NLX1RJTUVPVVQgfHwgJzMwMDAwJyxcclxuICAgICAgICBFTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HOiBwcm9jZXNzLmVudi5FTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HIHx8ICd0cnVlJyxcclxuICAgICAgICAvLyBUYXNrIDEyLjE6IEFkZCBjYW5hcnkgZGVwbG95bWVudCB0cmFmZmljIHBlcmNlbnRhZ2VcclxuICAgICAgICBCRURST0NLX1RSQUZGSUNfUEVSQ0VOVEFHRTogcHJvY2Vzcy5lbnYuQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgfHwgJzAnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksIC8vIEJhdGNoIHByb2Nlc3NpbmcgY2FuIHRha2UgbG9uZ2VyXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsXHJcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSwgLy8gVGFzayA4LjM6IEVuYWJsZSBYLVJheSB0cmFjaW5nXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhaUdldFVzYWdlU3RhdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1haS11c2FnZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZXQtdXNhZ2UnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBBSV9VU0FHRV9UQUJMRTogYWlVc2FnZVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBBSSB0ZXN0IGdlbmVyYXRpb24gZnVuY3Rpb25zXHJcbiAgICBhaVVzYWdlVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24pO1xyXG4gICAgYWlVc2FnZVRhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbik7XHJcbiAgICBhaVVzYWdlVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShhaUdldFVzYWdlU3RhdHNGdW5jdGlvbik7XHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbik7XHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24pO1xyXG4gICAgLy8gQmF0Y2ggNCBmdW5jdGlvbnMgdXNlIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgLSBubyBKV1Qgc2VjcmV0IG5lZWRlZFxyXG4gICAgLy8gYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiwgYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24sIGFpR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uXHJcblxyXG4gICAgLy8gQWRkIEJlZHJvY2sgcGVybWlzc2lvbnMgdG8gQUkgTGFtYmRhIGZ1bmN0aW9ucyAoVGFzayA1LjEpXHJcbiAgICAvLyBVc2luZyBpbmZlcmVuY2UgcHJvZmlsZSBmb3IgQ2xhdWRlIFNvbm5ldCA0LjYgKGNyb3NzLXJlZ2lvbiByb3V0aW5nKVxyXG4gICAgY29uc3QgYmVkcm9ja1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2JlZHJvY2s6SW52b2tlTW9kZWwnXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgJ2Fybjphd3M6YmVkcm9jazoqOio6aW5mZXJlbmNlLXByb2ZpbGUvdXMuYW50aHJvcGljLmNsYXVkZS1zb25uZXQtNC02JyxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFpQW5hbHl6ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShiZWRyb2NrUG9saWN5KTtcclxuICAgIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGJlZHJvY2tQb2xpY3kpO1xyXG4gICAgYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGJlZHJvY2tQb2xpY3kpO1xyXG5cclxuICAgIC8vIFRhc2sgNS4yOiBObyBCRURST0NLX0FQSV9LRVkgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgdXNlZFxyXG4gICAgLy8gVGhlIEJlZHJvY2tSdW50aW1lQ2xpZW50IHVzZXMgQVdTIFNESyBkZWZhdWx0IGNyZWRlbnRpYWwgcHJvdmlkZXIgKElBTSByb2xlcylcclxuICAgIFxyXG4gICAgLy8gVGFzayA1LjM6IENsb3VkV2F0Y2ggTG9ncyBwZXJtaXNzaW9ucyBhcmUgYXV0b21hdGljYWxseSBhZGRlZCBieSBDREtcclxuICAgIC8vIENESyBncmFudHMgbG9nczpDcmVhdGVMb2dHcm91cCwgbG9nczpDcmVhdGVMb2dTdHJlYW0sIGFuZCBsb2dzOlB1dExvZ0V2ZW50c1xyXG4gICAgLy8gdG8gYWxsIExhbWJkYSBmdW5jdGlvbnMgYnkgZGVmYXVsdCB0aHJvdWdoIHRoZSBMYW1iZGEgZXhlY3V0aW9uIHJvbGVcclxuXHJcbiAgICAvLyBUYXNrIDguMjogQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBCZWRyb2NrIG1vbml0b3JpbmdcclxuICAgIC8vIEFkZCBDbG91ZFdhdGNoIFB1dE1ldHJpY0RhdGEgcGVybWlzc2lvbiBmb3IgQmVkcm9jayBtb25pdG9yaW5nXHJcbiAgICBjb25zdCBjbG91ZFdhdGNoTWV0cmljc1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YSddLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYWlBbmFseXplRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGNsb3VkV2F0Y2hNZXRyaWNzUG9saWN5KTtcclxuICAgIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGNsb3VkV2F0Y2hNZXRyaWNzUG9saWN5KTtcclxuICAgIGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShjbG91ZFdhdGNoTWV0cmljc1BvbGljeSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBBbGFybTogSGlnaCBFcnJvciBSYXRlICg+MTAgZXJyb3JzIGluIDUgbWludXRlcylcclxuICAgIGNvbnN0IGJlZHJvY2tFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0JlZHJvY2tIaWdoRXJyb3JSYXRlQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ0FJQlRTLUJlZHJvY2stSGlnaEVycm9yUmF0ZScsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgZXJyb3IgcmF0ZSBleGNlZWRzIDEwIGVycm9ycyBpbiA1IG1pbnV0ZXMnLFxyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tFcnJvcnMnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogMTAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBBbGFybTogSGlnaCBMYXRlbmN5ICg+MzAgc2Vjb25kcyBhdmVyYWdlKVxyXG4gICAgY29uc3QgYmVkcm9ja0xhdGVuY3lBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdCZWRyb2NrSGlnaExhdGVuY3lBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnQUlCVFMtQmVkcm9jay1IaWdoTGF0ZW5jeScsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgYXZlcmFnZSBsYXRlbmN5IGV4Y2VlZHMgMzAgc2Vjb25kcycsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0xhdGVuY3knLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDMwMDAwLCAvLyAzMCBzZWNvbmRzIGluIG1pbGxpc2Vjb25kc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggQWxhcm06IEhpZ2ggQ29zdCAoPiQxMDAvZGF5KVxyXG4gICAgLy8gTm90ZTogVGhpcyBhbGFybSBjaGVja3MgaWYgY29zdCBleGNlZWRzICQxMDAgaW4gYSAyNC1ob3VyIHBlcmlvZFxyXG4gICAgY29uc3QgYmVkcm9ja0Nvc3RBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdCZWRyb2NrSGlnaENvc3RBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnQUlCVFMtQmVkcm9jay1IaWdoQ29zdCcsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgY29zdCBleGNlZWRzICQxMDAgcGVyIGRheScsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0Nvc3QnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAsIC8vICQxMDBcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgYWxhcm0gQVJOcyBmb3IgU05TIHRvcGljIHN1YnNjcmlwdGlvbiAob3B0aW9uYWwpXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmVkcm9ja0Vycm9yQWxhcm1Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBiZWRyb2NrRXJyb3JBbGFybS5hbGFybUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdCZWRyb2NrIEhpZ2ggRXJyb3IgUmF0ZSBBbGFybSBBUk4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JlZHJvY2tMYXRlbmN5QWxhcm1Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBiZWRyb2NrTGF0ZW5jeUFsYXJtLmFsYXJtQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0JlZHJvY2sgSGlnaCBMYXRlbmN5IEFsYXJtIEFSTicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmVkcm9ja0Nvc3RBbGFybUFybicsIHtcclxuICAgICAgdmFsdWU6IGJlZHJvY2tDb3N0QWxhcm0uYWxhcm1Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmVkcm9jayBIaWdoIENvc3QgQWxhcm0gQVJOJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgMTI6IENyZWF0ZSBDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgQmVkcm9jayB2cyBPcGVuQUkgY29tcGFyaXNvblxyXG4gICAgY29uc3QgYmVkcm9ja0Rhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnQmVkcm9ja01pZ3JhdGlvbkRhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogJ0FJQlRTLUJlZHJvY2stTWlncmF0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB3aWRnZXRzIHRvIGNvbXBhcmUgQmVkcm9jayB2cyBPcGVuQUkgbWV0cmljc1xyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMTogTGF0ZW5jeSBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIExhdGVuY3kgQ29tcGFyaXNvbicsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgQXZnIExhdGVuY3knLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnT3BlbkFJTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ09wZW5BSSBBdmcgTGF0ZW5jeScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJvdyAxOiBFcnJvciBSYXRlIENvbXBhcmlzb25cclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQUkgUHJvdmlkZXIgRXJyb3IgUmF0ZSBDb21wYXJpc29uJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tFcnJvcnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgRXJyb3JzJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSUVycm9ycycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIEVycm9ycycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMjogQ29zdCBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIENvc3QgQ29tcGFyaXNvbiAoMjRoKScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrQ29zdCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIENvc3QnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnT3BlbkFJQ29zdCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdPcGVuQUkgQ29zdCcsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJvdyAyOiBUb2tlbiBVc2FnZSBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIFRva2VuIFVzYWdlJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tUb2tlbnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgVG9rZW5zJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSVRva2VucycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIFRva2VucycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMzogUmVxdWVzdCBDb3VudFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBSSBQcm92aWRlciBSZXF1ZXN0IENvdW50JyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnQmVkcm9jayBSZXF1ZXN0cycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL09wZW5BSScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdPcGVuQUlSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIFJlcXVlc3RzJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgLy8gUm93IDM6IFRyYWZmaWMgRGlzdHJpYnV0aW9uIChDYW5hcnkpXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlNpbmdsZVZhbHVlV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0JlZHJvY2sgVHJhZmZpYyBQZXJjZW50YWdlJyxcclxuICAgICAgICBtZXRyaWNzOiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NYXRoRXhwcmVzc2lvbih7XHJcbiAgICAgICAgICAgIGV4cHJlc3Npb246ICcoYmVkcm9jayAvIChiZWRyb2NrICsgb3BlbmFpKSkgKiAxMDAnLFxyXG4gICAgICAgICAgICB1c2luZ01ldHJpY3M6IHtcclxuICAgICAgICAgICAgICBiZWRyb2NrOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja1JlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICBvcGVuYWk6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSVJlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIFRyYWZmaWMgJScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGRhc2hib2FyZCBVUkxcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCZWRyb2NrRGFzaGJvYXJkVVJMJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vY29uc29sZS5hd3MuYW1hem9uLmNvbS9jbG91ZHdhdGNoL2hvbWU/cmVnaW9uPSR7dGhpcy5yZWdpb259I2Rhc2hib2FyZHM6bmFtZT0ke2JlZHJvY2tEYXNoYm9hcmQuZGFzaGJvYXJkTmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkV2F0Y2ggRGFzaGJvYXJkIGZvciBCZWRyb2NrIE1pZ3JhdGlvbiBNb25pdG9yaW5nJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IHRlc3RFeGVjdXRvckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGVzdEV4ZWN1dG9yRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXRlc3QtZXhlY3V0b3InLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9leGVjdXRpb25zL2V4ZWN1dG9yJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFNDUkVFTlNIT1RTX0JVQ0tFVF9OQU1FOiBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyBNYXhpbXVtIExhbWJkYSB0aW1lb3V0XHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsIC8vIEluY3JlYXNlZCBtZW1vcnkgZm9yIGJyb3dzZXIgYXV0b21hdGlvblxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgdGVzdCBleGVjdXRvciBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGVzdEV4ZWN1dG9yRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YSh0ZXN0RXhlY3V0b3JGdW5jdGlvbik7XHJcbiAgICBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuZ3JhbnRSZWFkV3JpdGUodGVzdEV4ZWN1dG9yRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEdyYW50IEV2ZW50QnJpZGdlIHBlcm1pc3Npb25zIHRvIHRlc3QgZXhlY3V0b3IgZm9yIHB1Ymxpc2hpbmcgZXZlbnRzXHJcbiAgICAvLyB0ZXN0RXhlY3V0b3JGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgLy8gICBhY3Rpb25zOiBbJ2V2ZW50czpQdXRFdmVudHMnXSxcclxuICAgIC8vICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gRXZlbnRCcmlkZ2UgZGVmYXVsdCBidXNcclxuICAgIC8vIH0pKTtcclxuXHJcbiAgICAvLyBBZGQgU1FTIHRyaWdnZXIgZm9yIHRlc3QgZXhlY3V0b3JcclxuICAgIHRlc3RFeGVjdXRvckZ1bmN0aW9uLmFkZEV2ZW50U291cmNlKFxyXG4gICAgICBuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlNxc0V2ZW50U291cmNlKHRlc3RFeGVjdXRpb25RdWV1ZSwge1xyXG4gICAgICAgIGJhdGNoU2l6ZTogMSwgLy8gUHJvY2VzcyBvbmUgdGVzdCBhdCBhIHRpbWVcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksIC8vIE5vIGJhdGNoaW5nIGRlbGF5XHJcbiAgICAgICAgcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIEVuYWJsZSBwYXJ0aWFsIGJhdGNoIHJlc3BvbnNlc1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbiBUcmlnZ2VyIExhbWJkYVxyXG4gICAgY29uc3QgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS10cmlnZ2VyLWV4ZWN1dGlvbicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvdHJpZ2dlcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OX1FVRVVFX1VSTDogdGVzdEV4ZWN1dGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCB0cmlnZ2VyIGZ1bmN0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YSh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEodHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKTtcclxuICAgIHRlc3RFeGVjdXRpb25RdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIFN0YXR1cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1leGVjdXRpb24tc3RhdHVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtc3RhdHVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBzdGF0dXMgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25TdGF0dXNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVzdCBFeGVjdXRpb24gUmVzdWx0cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZ2V0LWV4ZWN1dGlvbi1yZXN1bHRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtcmVzdWx0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBTQ1JFRU5TSE9UU19CVUNLRVRfTkFNRTogc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHJlc3VsdHMgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmdyYW50UmVhZChnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIEhpc3RvcnkgTGFtYmRhXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1leGVjdXRpb24taGlzdG9yeScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvZ2V0LWhpc3RvcnknKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEVfTkFNRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IGhpc3RvcnkgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgU3VpdGUgUmVzdWx0cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0U3VpdGVSZXN1bHRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1zdWl0ZS1yZXN1bHRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtc3VpdGUtcmVzdWx0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgc3VpdGUgcmVzdWx0cyBmdW5jdGlvbiBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBTMyBldmVudCBub3RpZmljYXRpb24gZm9yIHVwbG9hZCBjb21wbGV0aW9uXHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcclxuICAgICAgczMuRXZlbnRUeXBlLk9CSkVDVF9DUkVBVEVELFxyXG4gICAgICBuZXcgczNuLkxhbWJkYURlc3RpbmF0aW9uKHVwbG9hZENvbXBsZXRlRnVuY3Rpb24pLFxyXG4gICAgICB7IHByZWZpeDogJ3VwbG9hZHMvJyB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIGFuZCBOb3RpZmljYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgYW5hbHlzaXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FuYWx5c2lzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFuYWx5c2lzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYW5hbHlzaXMvYW5hbHl6ZS1maWxlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFOiBhbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfQ0FDSEVfVEFCTEU6IGFuYWx5c2lzQ2FjaGVUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQVdTX1JFR0lPTjogdGhpcy5yZWdpb24sXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLCAvLyBSZXF1aXJlbWVudCAxMC42OiBTZXQgdGltZW91dCB0byA1IG1pbnV0ZXNcclxuICAgICAgbWVtb3J5U2l6ZTogMjA0OCwgLy8gUmVxdWlyZW1lbnQgMTAuNDogU2V0IG1lbW9yeSB0byAyR0IgZm9yIEFTVCBwYXJzaW5nXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RpZmljYXRpb24gUHJvY2Vzc29yIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOb3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtbm90aWZpY2F0aW9uLXByb2Nlc3NvcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvcHJvY2Vzc29yJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1BSRUZFUkVOQ0VTX1RBQkxFOiBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX0hJU1RPUllfVEFCTEU6IG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgU05TX1RPUElDX0FSTl9FTUFJTDogZW1haWxOb3RpZmljYXRpb25Ub3BpYy50b3BpY0FybixcclxuICAgICAgICBTTlNfVE9QSUNfQVJOX1NNUzogc21zTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgICAgU05TX1RPUElDX0FSTl9XRUJIT09LOiB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgICAgTjhOX0VOQUJMRUQ6IHByb2Nlc3MuZW52Lk44Tl9FTkFCTEVEIHx8ICdmYWxzZScsXHJcbiAgICAgICAgTjhOX1dFQkhPT0tfVVJMOiBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkwgfHwgJycsXHJcbiAgICAgICAgTjhOX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBTUVMgdHJpZ2dlciBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NvclxyXG4gICAgbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24uYWRkRXZlbnRTb3VyY2UoXHJcbiAgICAgIG5ldyBsYW1iZGFFdmVudFNvdXJjZXMuU3FzRXZlbnRTb3VyY2Uobm90aWZpY2F0aW9uUXVldWUsIHtcclxuICAgICAgICBiYXRjaFNpemU6IDEsIC8vIFByb2Nlc3MgMSBtZXNzYWdlIGF0IGEgdGltZSB0byBhdm9pZCBjb25jdXJyZW5jeSBpc3N1ZXNcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIG5vdGlmaWNhdGlvbiBwcm9jZXNzb3JcclxuICAgIG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBlbWFpbE5vdGlmaWNhdGlvblRvcGljLmdyYW50UHVibGlzaChub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBzbXNOb3RpZmljYXRpb25Ub3BpYy5ncmFudFB1Ymxpc2gobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgd2ViaG9va05vdGlmaWNhdGlvblRvcGljLmdyYW50UHVibGlzaChub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVtcGxhdGUgU2VlZGluZyBMYW1iZGEgRnVuY3Rpb25cclxuICAgIGNvbnN0IHNlZWRUZW1wbGF0ZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NlZWRUZW1wbGF0ZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtc2VlZC10ZW1wbGF0ZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL3NlZWQtdGVtcGxhdGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1RFTVBMQVRFU19UQUJMRTogbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIHNlZWQgdGVtcGxhdGVzIGZ1bmN0aW9uXHJcbiAgICBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoc2VlZFRlbXBsYXRlc0Z1bmN0aW9uKTtcclxuXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ05vdGlmaWNhdGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1ub3RpZmljYXRpb24nLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuICAgICAgICBleHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdOb3RpZmljYXRpb24gZnVuY3Rpb24gaW52b2tlZDonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xyXG4gICAgICAgICAgLy8gUGxhY2Vob2xkZXIgZm9yIG5vdGlmaWNhdGlvbiBsb2dpYyAoZW1haWwsIHdlYmhvb2ssIGV0Yy4pXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdOb3RpZmljYXRpb24gc2VudCBzdWNjZXNzZnVsbHknXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcbiAgICAgIGApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyBmb3IgYW5hbHlzaXMgYW5kIG5vdGlmaWNhdGlvbiBmdW5jdGlvbnNcclxuICAgIGFuYWx5c2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkKGFuYWx5c2lzRnVuY3Rpb24pOyAvLyBSZXF1aXJlbWVudCAxMC40OiBHcmFudCBTMyByZWFkIHBlcm1pc3Npb25zXHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHlzaXNGdW5jdGlvbik7IC8vIFJlcXVpcmVtZW50IDEwLjQ6IEdyYW50IER5bmFtb0RCIHJlYWQvd3JpdGUgcGVybWlzc2lvbnNcclxuICAgIGFuYWx5c2lzQ2FjaGVUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHlzaXNGdW5jdGlvbik7IC8vIFJlcXVpcmVtZW50IDEwLjc6IEdyYW50IGNhY2hlIHRhYmxlIHBlcm1pc3Npb25zXHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEobm90aWZpY2F0aW9uRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFJlcXVpcmVtZW50IDEwLjQ6IENvbm5lY3QgYW5hbHlzaXMgTGFtYmRhIHRvIFNRUyBxdWV1ZVxyXG4gICAgYW5hbHlzaXNGdW5jdGlvbi5hZGRFdmVudFNvdXJjZShcclxuICAgICAgbmV3IGxhbWJkYUV2ZW50U291cmNlcy5TcXNFdmVudFNvdXJjZShhbmFseXNpc1F1ZXVlLCB7XHJcbiAgICAgICAgYmF0Y2hTaXplOiAxLCAvLyBQcm9jZXNzIG9uZSBhbmFseXNpcyBhdCBhIHRpbWVcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksIC8vIE5vIGJhdGNoaW5nIGRlbGF5XHJcbiAgICAgICAgcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIEVuYWJsZSBwYXJ0aWFsIGJhdGNoIHJlc3BvbnNlc1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBRdWVyeSBSZXN1bHRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgcXVlcnlSZXN1bHRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdRdWVyeVJlc3VsdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tcXVlcnktcmVzdWx0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL3F1ZXJ5LXJlc3VsdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogdGhpcy5zdGFja05hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgU3RhdHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCB1c2VyU3RhdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VzZXJTdGF0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXN0YXRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYW5hbHlzaXMvZ2V0LXVzZXItc3RhdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogdGhpcy5zdGFja05hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHF1ZXJ5IGFuZCBzdGF0cyBmdW5jdGlvbnMgYWNjZXNzIHRvIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEocXVlcnlSZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkRGF0YSh1c2VyU3RhdHNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQUkgSW5zaWdodHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCBhaUluc2lnaHRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUluc2lnaHRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFpLWluc2lnaHRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWkvZ2VuZXJhdGUtaW5zaWdodHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogdGhpcy5zdGFja05hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDYwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgQUkgaW5zaWdodHMgZnVuY3Rpb24gYWNjZXNzIHRvIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEoYWlJbnNpZ2h0c0Z1bmN0aW9uKTtcclxuICAgIC8vIGFpSW5zaWdodHNGdW5jdGlvbiB1c2VzIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgLSBubyBKV1Qgc2VjcmV0IG5lZWRlZFxyXG5cclxuICAgIC8vIEFJIEZlZWRiYWNrIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgYWlGZWVkYmFja0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlGZWVkYmFja0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1haS1mZWVkYmFjaycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpL3N1Ym1pdC1mZWVkYmFjaycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEVOVklST05NRU5UOiB0aGlzLnN0YWNrTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgZmVlZGJhY2sgZnVuY3Rpb24gYWNjZXNzIHRvIHN0b3JlIGZlZWRiYWNrXHJcbiAgICAvLyBhaUZlZWRiYWNrRnVuY3Rpb24gdXNlcyBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IC0gbm8gSldUIHNlY3JldCBuZWVkZWRcclxuXHJcbiAgICAvLyBSZXBvcnQgR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb25cclxuICAgIGNvbnN0IHJlcG9ydEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmVwb3J0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1yZXBvcnQnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9yZXBvcnRzL2dldC12aW9sYXRpb24tcmVwb3J0JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHRoaXMuc3RhY2tOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCByZXBvcnQgZnVuY3Rpb24gYWNjZXNzIHRvIG1ldGFkYXRhXHJcbiAgICAvLyBOb3RlOiBXb3VsZCBuZWVkIGZpbGUgbWV0YWRhdGEgdGFibGUgcmVmZXJlbmNlIGhlcmVcclxuXHJcbiAgICAvLyBDcmVhdGUgU3RlcCBGdW5jdGlvbnMgd29ya2Zsb3cgZm9yIGFuYWx5c2lzIG9yY2hlc3RyYXRpb25cclxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IEFuYWx5c2lzV29ya2Zsb3codGhpcywgJ0FuYWx5c2lzV29ya2Zsb3cnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiB0aGlzLnN0YWNrTmFtZSxcclxuICAgICAgYW5hbHlzaXNGdW5jdGlvbixcclxuICAgICAgbm90aWZpY2F0aW9uRnVuY3Rpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVcGRhdGUgdXBsb2FkLWNvbXBsZXRlIGZ1bmN0aW9uIHdpdGggd29ya2Zsb3cgQVJOXHJcbiAgICB1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uLmFkZEVudmlyb25tZW50KCdTVEFURV9NQUNISU5FX0FSTicsIHdvcmtmbG93LnN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCB1cGxvYWQtY29tcGxldGUgZnVuY3Rpb24gcGVybWlzc2lvbiB0byBzdGFydCB3b3JrZmxvdyBleGVjdXRpb25zXHJcbiAgICB3b3JrZmxvdy5zdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgYXBpID0gbmV3IGFwaWdhdGV3YXkuSHR0cEFwaSh0aGlzLCAnTWlzcmFQbGF0Zm9ybUFwaScsIHtcclxuICAgICAgYXBpTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFwaScsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTUlTUkEgUGxhdGZvcm0gUkVTVCBBUEknLFxyXG4gICAgICBjb3JzUHJlZmxpZ2h0OiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJyonXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuR0VULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QT1NULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5QVVQsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkRFTEVURSxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbiddLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEhUVFAgQVBJIExhbWJkYSBBdXRob3JpemVyIGZvciBKV1QgdmVyaWZpY2F0aW9uXHJcbiAgICBjb25zdCBhdXRob3JpemVyID0gbmV3IGF1dGhvcml6ZXJzLkh0dHBMYW1iZGFBdXRob3JpemVyKCdKV1RBdXRob3JpemVyJywgYXV0aG9yaXplckZ1bmN0aW9uLCB7XHJcbiAgICAgIGF1dGhvcml6ZXJOYW1lOiAnand0LWF1dGhvcml6ZXInLFxyXG4gICAgICBpZGVudGl0eVNvdXJjZTogWyckcmVxdWVzdC5oZWFkZXIuQXV0aG9yaXphdGlvbiddLFxyXG4gICAgICByZXNwb25zZVR5cGVzOiBbYXV0aG9yaXplcnMuSHR0cExhbWJkYVJlc3BvbnNlVHlwZS5TSU1QTEVdLFxyXG4gICAgICByZXN1bHRzQ2FjaGVUdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMCksIC8vIDUgbWludXRlc1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGF1dGhlbnRpY2F0aW9uIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9sb2dpbicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignTG9naW5JbnRlZ3JhdGlvbicsIGxvZ2luRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZ2lzdGVyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdSZWdpc3RlckludGVncmF0aW9uJywgcmVnaXN0ZXJGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvcmVmcmVzaCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVmcmVzaEludGVncmF0aW9uJywgcmVmcmVzaEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGZpbGUgdXBsb2FkIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdGaWxlVXBsb2FkSW50ZWdyYXRpb24nLCBmaWxlVXBsb2FkRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRGaWxlc0ludGVncmF0aW9uJywgZ2V0RmlsZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCByZXBvcnQgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9yZXBvcnRzL3tmaWxlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlcG9ydEludGVncmF0aW9uJywgcmVwb3J0RnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYW5hbHlzaXMgcXVlcnkgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9xdWVyeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdRdWVyeVJlc3VsdHNJbnRlZ3JhdGlvbicsIHF1ZXJ5UmVzdWx0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHVzZXIgc3RhdHMgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hbmFseXNpcy9zdGF0cy97dXNlcklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVc2VyU3RhdHNJbnRlZ3JhdGlvbicsIHVzZXJTdGF0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEFJIGluc2lnaHRzIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYWkvaW5zaWdodHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0FJSW5zaWdodHNJbnRlZ3JhdGlvbicsIGFpSW5zaWdodHNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBBSSBmZWVkYmFjayByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpL2ZlZWRiYWNrJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUZlZWRiYWNrSW50ZWdyYXRpb24nLCBhaUZlZWRiYWNrRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgcHJvamVjdCBtYW5hZ2VtZW50IHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVByb2plY3RJbnRlZ3JhdGlvbicsIGNyZWF0ZVByb2plY3RGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2plY3RzSW50ZWdyYXRpb24nLCBnZXRQcm9qZWN0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMve3Byb2plY3RJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlUHJvamVjdEludGVncmF0aW9uJywgdXBkYXRlUHJvamVjdEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRlc3Qgc3VpdGUgbWFuYWdlbWVudCByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0U3VpdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdFN1aXRlc0ludGVncmF0aW9uJywgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMve3N1aXRlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RTdWl0ZUludGVncmF0aW9uJywgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgdGVzdCBjYXNlIG1hbmFnZW1lbnQgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0Q2FzZUludGVncmF0aW9uJywgY3JlYXRlVGVzdENhc2VGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdENhc2VzSW50ZWdyYXRpb24nLCBnZXRUZXN0Q2FzZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMve3Rlc3RDYXNlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RDYXNlSW50ZWdyYXRpb24nLCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRlc3QgZXhlY3V0aW9uIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy90cmlnZ2VyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdUcmlnZ2VyRXhlY3V0aW9uSW50ZWdyYXRpb24nLCB0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0vc3RhdHVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvblN0YXR1c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RXhlY3V0aW9uUmVzdWx0c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy9oaXN0b3J5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvbkhpc3RvcnlJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvc3VpdGVzL3tzdWl0ZUV4ZWN1dGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRTdWl0ZVJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIG5vdGlmaWNhdGlvbiBwcmVmZXJlbmNlcyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvcHJlZmVyZW5jZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIGdldFByZWZlcmVuY2VzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3ByZWZlcmVuY2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVQcmVmZXJlbmNlc0ludGVncmF0aW9uJywgdXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBub3RpZmljYXRpb24gaGlzdG9yeSByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvaGlzdG9yeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRIaXN0b3J5SW50ZWdyYXRpb24nLCBnZXRIaXN0b3J5RnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL2hpc3Rvcnkve25vdGlmaWNhdGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXROb3RpZmljYXRpb25JbnRlZ3JhdGlvbicsIGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIG5vdGlmaWNhdGlvbiB0ZW1wbGF0ZSByb3V0ZXMgKGFkbWluIG9ubHkpXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcy97dGVtcGxhdGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIHVwZGF0ZVRlbXBsYXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRUZW1wbGF0ZXNJbnRlZ3JhdGlvbicsIGdldFRlbXBsYXRlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEFJIHRlc3QgZ2VuZXJhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9hbmFseXplJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUFuYWx5emVJbnRlZ3JhdGlvbicsIGFpQW5hbHl6ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYWktdGVzdC1nZW5lcmF0aW9uL2dlbmVyYXRlJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUdlbmVyYXRlVGVzdEludGVncmF0aW9uJywgYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9iYXRjaCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQUlCYXRjaEdlbmVyYXRlSW50ZWdyYXRpb24nLCBhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi91c2FnZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUdldFVzYWdlU3RhdHNJbnRlZ3JhdGlvbicsIGFpR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCB2YWx1ZXNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgZmlsZSBzdG9yYWdlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZEJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmcm9udGVuZEJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgZnJvbnRlbmQgaG9zdGluZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbkRvbWFpbicsIHtcclxuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGRvbWFpbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvY2Vzc2luZ1F1ZXVlVXJsJywge1xyXG4gICAgICB2YWx1ZTogcHJvY2Vzc2luZ1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBmb3IgcHJvY2Vzc2luZyBqb2JzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUZXN0RXhlY3V0aW9uUXVldWVVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0ZXN0RXhlY3V0aW9uUXVldWUucXVldWVVcmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU1FTIHF1ZXVlIGZvciB0ZXN0IGV4ZWN1dGlvbiBqb2JzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xyXG4gICAgICB2YWx1ZTogYXBpLmFwaUVuZHBvaW50LFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGVzdEV4ZWN1dGlvbnNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgdGVzdCBleGVjdXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTY3JlZW5zaG90c0J1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgZm9yIHRlc3QgZXhlY3V0aW9uIHNjcmVlbnNob3RzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOb3RpZmljYXRpb25RdWV1ZVVybCcsIHtcclxuICAgICAgdmFsdWU6IG5vdGlmaWNhdGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VtYWlsTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBlbWFpbE5vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyB0b3BpYyBmb3IgZW1haWwgbm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU21zTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBzbXNOb3RpZmljYXRpb25Ub3BpYy50b3BpY0FybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTTlMgdG9waWMgZm9yIFNNUyBub3RpZmljYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJob29rTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU05TIHRvcGljIGZvciB3ZWJob29rIG5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FJVXNhZ2VUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBhaVVzYWdlVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciBBSSB1c2FnZSB0cmFja2luZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIEFsYXJtcyBmb3IgTm90aWZpY2F0aW9uIFN5c3RlbVxyXG4gICAgLy8gQWxhcm0gZm9yIERMUSBkZXB0aCA+IDAgKGluZGljYXRlcyBmYWlsZWQgbm90aWZpY2F0aW9ucylcclxuICAgIGNvbnN0IGRscUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ05vdGlmaWNhdGlvbkRMUUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb24tZGxxLWRlcHRoJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gbm90aWZpY2F0aW9uIERMUSBoYXMgbWVzc2FnZXMgKGZhaWxlZCBub3RpZmljYXRpb25zKScsXHJcbiAgICAgIG1ldHJpYzogbm90aWZpY2F0aW9uRExRLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoKSxcclxuICAgICAgdGhyZXNob2xkOiAwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsYXJtIGZvciBxdWV1ZSBkZXB0aCA+IDEwMDAgKGluZGljYXRlcyBwcm9jZXNzaW5nIGJhY2tsb2cpXHJcbiAgICBjb25zdCBxdWV1ZURlcHRoQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnTm90aWZpY2F0aW9uUXVldWVEZXB0aEFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb24tcXVldWUtZGVwdGgnLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnQgd2hlbiBub3RpZmljYXRpb24gcXVldWUgZGVwdGggZXhjZWVkcyAxMDAwIG1lc3NhZ2VzJyxcclxuICAgICAgbWV0cmljOiBub3RpZmljYXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNWaXNpYmxlKCksXHJcbiAgICAgIHRocmVzaG9sZDogMTAwMCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NvciBMYW1iZGEgZXJyb3JzXHJcbiAgICBjb25zdCBwcm9jZXNzb3JFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ05vdGlmaWNhdGlvblByb2Nlc3NvckVycm9yQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbi1wcm9jZXNzb3ItZXJyb3JzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gbm90aWZpY2F0aW9uIHByb2Nlc3NvciBMYW1iZGEgaGFzIGVycm9ycycsXHJcbiAgICAgIG1ldHJpYzogbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24ubWV0cmljRXJyb3JzKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsYXJtIGZvciBzY2hlZHVsZWQgcmVwb3J0cyBMYW1iZGEgZXJyb3JzXHJcbiAgICBjb25zdCBzY2hlZHVsZWRSZXBvcnRzRXJyb3JBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTY2hlZHVsZWRSZXBvcnRzRXJyb3JBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnYWlidHMtc2NoZWR1bGVkLXJlcG9ydHMtZXJyb3JzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gc2NoZWR1bGVkIHJlcG9ydHMgTGFtYmRhIGhhcyBlcnJvcnMnLFxyXG4gICAgICBtZXRyaWM6IHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxhcm0gZm9yIFNOUyBkZWxpdmVyeSBmYWlsdXJlcyAoZW1haWwpXHJcbiAgICBjb25zdCBzbnNFbWFpbEZhaWx1cmVBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTTlNFbWFpbEZhaWx1cmVBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnYWlidHMtc25zLWVtYWlsLWZhaWx1cmVzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gU05TIGVtYWlsIGRlbGl2ZXJ5IGZhaWxzJyxcclxuICAgICAgbWV0cmljOiBlbWFpbE5vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0ZhaWxlZCh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3IgU05TIGRlbGl2ZXJ5IGZhaWx1cmVzIChTTVMpXHJcbiAgICBjb25zdCBzbnNTbXNGYWlsdXJlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU05TU21zRmFpbHVyZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdhaWJ0cy1zbnMtc21zLWZhaWx1cmVzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gU05TIFNNUyBkZWxpdmVyeSBmYWlscycsXHJcbiAgICAgIG1ldHJpYzogc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggRGFzaGJvYXJkIGZvciBOb3RpZmljYXRpb24gU3lzdGVtXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25EYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ05vdGlmaWNhdGlvbkRhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogJ0FJQlRTLU5vdGlmaWNhdGlvbi1TeXN0ZW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHdpZGdldHMgdG8gZGFzaGJvYXJkXHJcbiAgICBub3RpZmljYXRpb25EYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgLy8gUXVldWUgbWV0cmljc1xyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdOb3RpZmljYXRpb24gUXVldWUgRGVwdGgnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblF1ZXVlLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ01lc3NhZ2VzIFZpc2libGUnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBub3RpZmljYXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNOb3RWaXNpYmxlKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdNZXNzYWdlcyBJbiBGbGlnaHQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdETFEgRGVwdGggKEZhaWxlZCBOb3RpZmljYXRpb25zKScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbm90aWZpY2F0aW9uRExRLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCBNZXNzYWdlcycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgbm90aWZpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIC8vIExhbWJkYSBtZXRyaWNzXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ05vdGlmaWNhdGlvbiBQcm9jZXNzb3IgUGVyZm9ybWFuY2UnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0ludm9jYXRpb25zKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0Vycm9ycyh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRXJyb3JzJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmlnaHQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0R1cmF0aW9uKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEdXJhdGlvbicsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdTY2hlZHVsZWQgUmVwb3J0cyBQZXJmb3JtYW5jZScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uLm1ldHJpY0ludm9jYXRpb25zKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0Vycm9ycycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICBzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24ubWV0cmljRHVyYXRpb24oe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0R1cmF0aW9uJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgbm90aWZpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIC8vIFNOUyBkZWxpdmVyeSBtZXRyaWNzXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1NOUyBFbWFpbCBEZWxpdmVyeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk1lc3NhZ2VzUHVibGlzaGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdQdWJsaXNoZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBlbWFpbE5vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0RlbGl2ZXJlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRGVsaXZlcmVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNGYWlsZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiA4LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU05TIFNNUyBEZWxpdmVyeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZNZXNzYWdlc1B1Ymxpc2hlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnUHVibGlzaGVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRGVsaXZlcmVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEZWxpdmVyZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBzbXNOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNGYWlsZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiA4LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU05TIFdlYmhvb2sgRGVsaXZlcnknLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIHdlYmhvb2tOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk1lc3NhZ2VzUHVibGlzaGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdQdWJsaXNoZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRGVsaXZlcmVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEZWxpdmVyZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdGYWlsZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogOCxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGRhc2hib2FyZCBVUkxcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOb3RpZmljYXRpb25EYXNoYm9hcmRVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly9jb25zb2xlLmF3cy5hbWF6b24uY29tL2Nsb3Vkd2F0Y2gvaG9tZT9yZWdpb249JHt0aGlzLnJlZ2lvbn0jZGFzaGJvYXJkczpuYW1lPSR7bm90aWZpY2F0aW9uRGFzaGJvYXJkLmRhc2hib2FyZE5hbWV9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgTm90aWZpY2F0aW9uIFN5c3RlbScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2duaXRvIG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtY2xpZW50LWlkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbEFybicsIHtcclxuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtYXJuJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4iXX0=