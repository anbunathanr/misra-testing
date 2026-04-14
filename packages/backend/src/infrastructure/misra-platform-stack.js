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
const certificatemanager = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const route53 = __importStar(require("aws-cdk-lib/aws-route53"));
const route53targets = __importStar(require("aws-cdk-lib/aws-route53-targets"));
const analysis_workflow_1 = require("./analysis-workflow");
const file_metadata_table_1 = require("./file-metadata-table");
const sample_files_table_1 = require("./sample-files-table");
const upload_progress_table_1 = require("./upload-progress-table");
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
        // Production domain configuration
        const productionDomain = 'misra.digitransolutions.in';
        const apiDomain = 'api.misra.digitransolutions.in';
        const hostedZoneName = 'digitransolutions.in';
        // Import existing hosted zone (must exist in Route53)
        // Note: The hosted zone must be created manually in Route53 before deploying this stack
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: hostedZoneName,
        });
        // Create SSL certificate for CloudFront (must be in us-east-1)
        // CloudFront requires certificates to be in us-east-1 region
        const frontendCertificate = new certificatemanager.Certificate(this, 'FrontendCertificate', {
            domainName: productionDomain,
            validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
        });
        // Create SSL certificate for API Gateway (can be in any region)
        const apiCertificate = new certificatemanager.Certificate(this, 'ApiCertificate', {
            domainName: apiDomain,
            validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
        });
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
        // CloudFront distribution for frontend with custom domain
        const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
            defaultBehavior: {
                origin: new origins.S3Origin(frontendBucket),
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
            },
            domainNames: [productionDomain],
            certificate: frontendCertificate,
            defaultRootObject: 'index.html',
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
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Use only North America and Europe edge locations
            enableLogging: true,
            comment: 'MISRA Platform Production Frontend Distribution',
        });
        // Create Route53 A record for frontend domain
        new route53.ARecord(this, 'FrontendAliasRecord', {
            zone: hostedZone,
            recordName: productionDomain,
            target: route53.RecordTarget.fromAlias(new route53targets.CloudFrontTarget(distribution)),
            comment: 'CloudFront distribution for MISRA Platform frontend',
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
        // Sample Files Table for storing predefined C/C++ files with known MISRA violations
        const sampleFilesTable = new sample_files_table_1.SampleFilesTable(this, 'SampleFilesTable');
        // Upload Progress Table for tracking file upload progress
        const uploadProgressTable = new upload_progress_table_1.UploadProgressTable(this, 'UploadProgressTable', { environment: 'dev' });
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
        // Sample File Management Lambda Functions
        const getSampleFilesFunction = new lambda.Function(this, 'GetSampleFilesFunction', {
            functionName: 'misra-platform-get-sample-files',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/file/get-sample-files'),
            environment: {
                SAMPLE_FILES_TABLE: sampleFilesTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const uploadSampleFileFunction = new lambda.Function(this, 'UploadSampleFileFunction', {
            functionName: 'misra-platform-upload-sample-file',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/file/upload-sample-file'),
            environment: {
                SAMPLE_FILES_TABLE: sampleFilesTable.table.tableName,
                FILE_STORAGE_BUCKET: fileStorageBucket.bucketName,
                FILE_METADATA_TABLE: fileMetadataTable.table.tableName,
                UPLOAD_PROGRESS_TABLE: uploadProgressTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const getUploadProgressFunction = new lambda.Function(this, 'GetUploadProgressFunction', {
            functionName: 'misra-platform-get-upload-progress',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/file/get-upload-progress'),
            environment: {
                UPLOAD_PROGRESS_TABLE: uploadProgressTable.table.tableName,
            },
            timeout: cdk.Duration.seconds(15),
            reservedConcurrentExecutions: 0,
        });
        const initializeSampleLibraryFunction = new lambda.Function(this, 'InitializeSampleLibraryFunction', {
            functionName: 'misra-platform-initialize-sample-library',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/file/initialize-sample-library'),
            environment: {
                SAMPLE_FILES_TABLE: sampleFilesTable.table.tableName,
            },
            timeout: cdk.Duration.minutes(2),
            memorySize: 512,
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
        // Sample file permissions
        sampleFilesTable.table.grantReadData(getSampleFilesFunction);
        sampleFilesTable.table.grantReadData(uploadSampleFileFunction);
        sampleFilesTable.table.grantReadWriteData(initializeSampleLibraryFunction);
        fileStorageBucket.grantReadWrite(uploadSampleFileFunction);
        fileMetadataTable.grantReadWriteData(uploadSampleFileFunction);
        // Upload progress permissions
        uploadProgressTable.grantReadWriteData(uploadSampleFileFunction);
        uploadProgressTable.grantReadData(getUploadProgressFunction);
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
        // Analysis Status Lambda Function (Task 5.2)
        const analysisStatusFunction = new lambda.Function(this, 'AnalysisStatusFunction', {
            functionName: 'misra-platform-analysis-status',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/analysis/status'),
            environment: {
                ANALYSIS_RESULTS_TABLE_NAME: analysisResultsTable.tableName,
                REGION: this.region,
            },
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            reservedConcurrentExecutions: 0,
        });
        // Grant analysis status function access to analysis results
        analysisResultsTable.grantReadData(analysisStatusFunction);
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
        // API Gateway with custom domain
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
        // Create custom domain for API Gateway
        const apiDomainName = new apigateway.DomainName(this, 'ApiCustomDomain', {
            domainName: apiDomain,
            certificate: apiCertificate,
        });
        // Map the custom domain to the API Gateway stage
        new apigateway.ApiMapping(this, 'ApiMapping', {
            api: api,
            domainName: apiDomainName,
            stage: api.defaultStage,
        });
        // Create Route53 A record for API domain
        new route53.ARecord(this, 'ApiAliasRecord', {
            zone: hostedZone,
            recordName: apiDomain,
            target: route53.RecordTarget.fromAlias(new route53targets.ApiGatewayv2DomainProperties(apiDomainName.regionalDomainName, apiDomainName.regionalHostedZoneId)),
            comment: 'API Gateway custom domain for MISRA Platform API',
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
        // Add sample file routes
        api.addRoutes({
            path: '/files/samples',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetSampleFilesIntegration', getSampleFilesFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/files/upload-sample',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('UploadSampleFileIntegration', uploadSampleFileFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/files/upload-progress/{fileId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetUploadProgressIntegration', getUploadProgressFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
            authorizer: authorizer,
        });
        api.addRoutes({
            path: '/files/initialize-samples',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('InitializeSampleLibraryIntegration', initializeSampleLibraryFunction, {
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
        // Add analysis status route (Task 5.2)
        api.addRoutes({
            path: '/analysis/{analysisId}/status',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('AnalysisStatusIntegration', analysisStatusFunction, {
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
        new cdk.CfnOutput(this, 'FrontendCustomDomain', {
            value: `https://${productionDomain}`,
            description: 'Production frontend URL with custom domain',
            exportName: 'misra-platform-frontend-url',
        });
        new cdk.CfnOutput(this, 'ApiCustomDomainUrl', {
            value: `https://${apiDomain}`,
            description: 'Production API URL with custom domain',
            exportName: 'misra-platform-api-url',
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLHNFQUF3RDtBQUN4RCxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBQ2pELHlGQUEyRTtBQUMzRSx5RUFBMkQ7QUFDM0Qsd0ZBQTBFO0FBQzFFLHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQsd0VBQTBEO0FBQzFELCtFQUFpRTtBQUNqRSx1RUFBeUQ7QUFDekQsNEVBQThEO0FBQzlELHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFDbkQsdUZBQXlFO0FBQ3pFLGlFQUFtRDtBQUNuRCxnRkFBa0U7QUFFbEUsMkRBQXVEO0FBQ3ZELCtEQUEwRDtBQUMxRCw2REFBd0Q7QUFDeEQsbUVBQThEO0FBQzlELHFEQUFpRDtBQUNqRCwyREFBc0Q7QUFDdEQseURBQW9EO0FBQ3BELG1FQUE4RDtBQUM5RCw2REFBeUQ7QUFDekQscUZBQWdGO0FBQ2hGLGlGQUE0RTtBQUM1RSw2RUFBd0U7QUFDeEUscURBQWdEO0FBQ2hELGlFQUE0RDtBQUU1RCxNQUFhLGtCQUFtQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQy9DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsa0NBQWtDO1FBQ2xDLE1BQU0sZ0JBQWdCLEdBQUcsNEJBQTRCLENBQUM7UUFDdEQsTUFBTSxTQUFTLEdBQUcsZ0NBQWdDLENBQUM7UUFDbkQsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUM7UUFFOUMsc0RBQXNEO1FBQ3RELHdGQUF3RjtRQUN4RixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ25FLFVBQVUsRUFBRSxjQUFjO1NBQzNCLENBQUMsQ0FBQztRQUVILCtEQUErRDtRQUMvRCw2REFBNkQ7UUFDN0QsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDMUYsVUFBVSxFQUFFLGdCQUFnQjtZQUM1QixVQUFVLEVBQUUsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztTQUN6RSxDQUFDLENBQUM7UUFFSCxnRUFBZ0U7UUFDaEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ2hGLFVBQVUsRUFBRSxTQUFTO1lBQ3JCLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1NBQ3pFLENBQUMsQ0FBQztRQUVILDhCQUE4QjtRQUM5QixNQUFNLGlCQUFpQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDakUsVUFBVSxFQUFFLHdCQUF3QixJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ2xELFVBQVUsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsVUFBVTtZQUMxQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxrQkFBa0I7U0FDN0QsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMzRCxVQUFVLEVBQUUsMkJBQTJCLElBQUksQ0FBQyxPQUFPLEVBQUU7WUFDckQsb0JBQW9CLEVBQUUsWUFBWTtZQUNsQyxvQkFBb0IsRUFBRSxZQUFZO1lBQ2xDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVO1lBQ2xELGdCQUFnQixFQUFFLElBQUk7WUFDdEIsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGtCQUFrQjtTQUM3RCxDQUFDLENBQUM7UUFFSCwwREFBMEQ7UUFDMUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxVQUFVLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM3RSxlQUFlLEVBQUU7Z0JBQ2YsTUFBTSxFQUFFLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUM7Z0JBQzVDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUI7Z0JBQ3ZFLFdBQVcsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLGlCQUFpQjtnQkFDckQsbUJBQW1CLEVBQUUsVUFBVSxDQUFDLG1CQUFtQixDQUFDLGNBQWM7YUFDbkU7WUFDRCxXQUFXLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUMvQixXQUFXLEVBQUUsbUJBQW1CO1lBQ2hDLGlCQUFpQixFQUFFLFlBQVk7WUFDL0IsY0FBYyxFQUFFO2dCQUNkO29CQUNFLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQzdCO2dCQUNEO29CQUNFLFVBQVUsRUFBRSxHQUFHO29CQUNmLGtCQUFrQixFQUFFLEdBQUc7b0JBQ3ZCLGdCQUFnQixFQUFFLGFBQWE7b0JBQy9CLEdBQUcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQzdCO2FBQ0Y7WUFDRCxVQUFVLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUUsbURBQW1EO1lBQ3RHLGFBQWEsRUFBRSxJQUFJO1lBQ25CLE9BQU8sRUFBRSxpREFBaUQ7U0FDM0QsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLFVBQVU7WUFDaEIsVUFBVSxFQUFFLGdCQUFnQjtZQUM1QixNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQ3BDLElBQUksY0FBYyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUNsRDtZQUNELE9BQU8sRUFBRSxxREFBcUQ7U0FDL0QsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLElBQUksT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3RELFlBQVksRUFBRSxzQkFBc0I7WUFDcEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLEtBQUs7YUFDaEI7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELGtCQUFrQixFQUFFO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0wsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2FBQ0Y7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDaEIsY0FBYyxFQUFFLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQztvQkFDMUMsTUFBTSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsT0FBTyxFQUFFLElBQUk7aUJBQ2QsQ0FBQztnQkFDRixJQUFJLEVBQUUsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO29CQUNoQyxNQUFNLEVBQUUsQ0FBQztvQkFDVCxNQUFNLEVBQUUsRUFBRTtvQkFDVixPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDO2FBQ0g7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxLQUFLO2dCQUNyQixvQkFBb0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDM0M7WUFDRCxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQ25ELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07WUFDdkMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUTtZQUN6QixlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxFQUFFLEtBQUs7Z0JBQ1YsR0FBRyxFQUFFLElBQUk7YUFDVjtZQUNELGdCQUFnQixFQUFFO2dCQUNoQixZQUFZLEVBQUUsc0NBQXNDO2dCQUNwRCxTQUFTLEVBQUUsNERBQTREO2dCQUN2RSxVQUFVLEVBQUUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLElBQUk7YUFDaEQ7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsWUFBWSxFQUFFLDJCQUEyQjtnQkFDekMsU0FBUyxFQUFFLG1HQUFtRzthQUMvRztZQUNELGNBQWMsRUFBRTtnQkFDZCw0QkFBNEIsRUFBRSxJQUFJO2dCQUNsQyxnQ0FBZ0MsRUFBRSxJQUFJO2FBQ3ZDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUU7WUFDckQsa0JBQWtCLEVBQUUsMkJBQTJCO1lBQy9DLGNBQWMsRUFBRSxLQUFLO1lBQ3JCLFNBQVMsRUFBRTtnQkFDVCxZQUFZLEVBQUUsSUFBSTtnQkFDbEIsT0FBTyxFQUFFLElBQUk7YUFDZDtZQUNELDBCQUEwQixFQUFFLElBQUk7WUFDaEMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQzNDLG1CQUFtQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUMxQyxlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLHFCQUFxQixFQUFFLElBQUk7WUFDM0IsY0FBYyxFQUFFLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFO2lCQUMzQyxzQkFBc0IsQ0FBQztnQkFDdEIsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLFFBQVEsRUFBRSxJQUFJO2FBQ2YsQ0FBQztpQkFDRCxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUM7WUFDakQsZUFBZSxFQUFFLElBQUksT0FBTyxDQUFDLGdCQUFnQixFQUFFO2lCQUM1QyxzQkFBc0IsQ0FBQztnQkFDdEIsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLElBQUk7YUFDZixDQUFDO2lCQUNELG9CQUFvQixDQUFDLGdCQUFnQixFQUFFLE1BQU0sQ0FBQztTQUNsRCxDQUFDLENBQUM7UUFFSCx3RUFBd0U7UUFDeEUsTUFBTSxVQUFVLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDeEQsU0FBUyxFQUFFLHNCQUFzQjtZQUNqQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNyRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGtCQUFrQjtTQUM3RCxDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxzQkFBc0I7WUFDakMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtTQUM5RSxDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsVUFBVSxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1NBQ3JFLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUM5RCxTQUFTLEVBQUUsY0FBYztZQUN6QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN4RSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3hFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUNoRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCO1NBQzdELENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzlELFNBQVMsRUFBRSx5QkFBeUI7WUFDcEMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDekUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDbkUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxrQkFBa0I7U0FDN0QsQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztZQUNwQyxTQUFTLEVBQUUsMkJBQTJCO1lBQ3RDLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3hFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1NBQ3BFLENBQUMsQ0FBQztRQUVILGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztZQUNwQyxTQUFTLEVBQUUsd0JBQXdCO1lBQ25DLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1NBQ3BFLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzlELFNBQVMsRUFBRSwwQkFBMEI7WUFDckMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDbkUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxrQkFBa0I7U0FDN0QsQ0FBQyxDQUFDO1FBRUgscUVBQXFFO1FBQ3JFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM1RSxTQUFTLEVBQUUsaUNBQWlDO1lBQzVDLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3pFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ25FLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUNoRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCO1NBQzdELENBQUMsQ0FBQztRQUVILHdDQUF3QztRQUN4QyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQztZQUMzQyxTQUFTLEVBQUUsd0JBQXdCO1lBQ25DLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1NBQ3BFLENBQUMsQ0FBQztRQUVILG9CQUFvQixDQUFDLHVCQUF1QixDQUFDO1lBQzNDLFNBQVMsRUFBRSx3QkFBd0I7WUFDbkMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO1FBRUgsb0JBQW9CLENBQUMsdUJBQXVCLENBQUM7WUFDM0MsU0FBUyxFQUFFLHlCQUF5QjtZQUNwQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN0RSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtTQUNwRSxDQUFDLENBQUM7UUFFSCxzRUFBc0U7UUFDdEUsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVDQUFpQixDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUN6RSxXQUFXLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUM7UUFFSCxvRkFBb0Y7UUFDcEYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLHFDQUFnQixDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXhFLDBEQUEwRDtRQUMxRCxNQUFNLG1CQUFtQixHQUFHLElBQUksMkNBQW1CLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFekcsZ0ZBQWdGO1FBQ2hGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSw4QkFBYSxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBRXZFLGlGQUFpRjtRQUNqRixNQUFNLGVBQWUsR0FBRyxJQUFJLG1DQUFlLENBQUMsSUFBSSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFFckUsK0VBQStFO1FBQy9FLE1BQU0sY0FBYyxHQUFHLElBQUksaUNBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztRQUVsRSx5RkFBeUY7UUFDekYsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLDJDQUFtQixDQUFDLElBQUksRUFBRSxxQkFBcUIsQ0FBQyxDQUFDO1FBRWpGLGlEQUFpRDtRQUNqRCxNQUFNLGlCQUFpQixHQUFHLElBQUksc0NBQWlCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3pFLFdBQVcsRUFBRSxLQUFLO1NBQ25CLENBQUMsQ0FBQztRQUVILDZCQUE2QjtRQUM3QixNQUFNLDRCQUE0QixHQUFHLElBQUksNkRBQTRCLENBQUMsSUFBSSxFQUFFLDhCQUE4QixFQUFFO1lBQzFHLFdBQVcsRUFBRSxLQUFLO1NBQ25CLENBQUMsQ0FBQztRQUVILE1BQU0sMEJBQTBCLEdBQUcsSUFBSSx5REFBMEIsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLEVBQUU7WUFDcEcsV0FBVyxFQUFFLEtBQUs7U0FDbkIsQ0FBQyxDQUFDO1FBRUgsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLHFEQUF3QixDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUM5RixXQUFXLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUM7UUFFSCx1RUFBdUU7UUFDdkUsTUFBTSxZQUFZLEdBQUcsSUFBSSw2QkFBWSxDQUFDLElBQUksRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU1RCxxRUFBcUU7UUFDckUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHlDQUFrQixDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1RSxXQUFXLEVBQUUsS0FBSztTQUNuQixDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQzNFLFNBQVMsRUFBRSwyQkFBMkI7WUFDdEMsV0FBVyxFQUFFLDJCQUEyQjtTQUN6QyxDQUFDLENBQUM7UUFFSCxNQUFNLG9CQUFvQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDdkUsU0FBUyxFQUFFLHlCQUF5QjtZQUNwQyxXQUFXLEVBQUUseUJBQXlCO1NBQ3ZDLENBQUMsQ0FBQztRQUVILE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUMvRSxTQUFTLEVBQUUsNkJBQTZCO1lBQ3hDLFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsd0NBQXdDO1FBQ3hDLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDN0QsU0FBUyxFQUFFLHdCQUF3QjtZQUNuQyxlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsbUNBQW1DO1NBQzVFLENBQUMsQ0FBQztRQUVILE1BQU0saUJBQWlCLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNqRSxTQUFTLEVBQUUsMEJBQTBCO1lBQ3JDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLHVCQUF1QjtZQUNwRSxzQkFBc0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxlQUFlO1lBQ2pFLGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDckMsZUFBZSxFQUFFO2dCQUNmLEtBQUssRUFBRSxlQUFlO2dCQUN0QixlQUFlLEVBQUUsQ0FBQyxFQUFFLDJDQUEyQzthQUNoRTtTQUNGLENBQUMsQ0FBQztRQUVILDhDQUE4QztRQUM5QyxnRUFBZ0U7UUFDaEUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3JFLFFBQVEsRUFBRSxpQ0FBaUM7WUFDM0MsV0FBVyxFQUFFLCtEQUErRDtZQUM1RSxZQUFZLEVBQUU7Z0JBQ1osTUFBTSxFQUFFLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFVBQVUsRUFBRSxDQUFDLDBCQUEwQixDQUFDO2FBQ3pDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOERBQThEO1FBQzlELGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRXRFLG9DQUFvQztRQUNwQyxNQUFNLHdCQUF3QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDckYsWUFBWSxFQUFFLHlCQUF5QjtZQUN2QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw4Q0FBOEMsQ0FBQztZQUMzRSxXQUFXLEVBQUU7Z0JBQ1gscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQzFELHNCQUFzQixFQUFFLGlCQUFpQixDQUFDLFFBQVE7YUFDbkQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxrREFBa0Q7UUFDbEQsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2xFLGlCQUFpQixDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFOUQsK0NBQStDO1FBQy9DLGlDQUFpQztRQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQy9ELFFBQVEsRUFBRSw0QkFBNEI7WUFDdEMsV0FBVyxFQUFFLDhDQUE4QztZQUMzRCxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLE1BQU0sRUFBRSxHQUFHO2dCQUNYLElBQUksRUFBRSxHQUFHO2FBQ1YsQ0FBQztTQUNILENBQUMsQ0FBQztRQUNILGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUVoRix5Q0FBeUM7UUFDekMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ2pFLFFBQVEsRUFBRSw2QkFBNkI7WUFDdkMsV0FBVyxFQUFFLCtDQUErQztZQUM1RCxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLE1BQU0sRUFBRSxHQUFHO2dCQUNYLElBQUksRUFBRSxHQUFHO2dCQUNULE9BQU8sRUFBRSxLQUFLO2FBQ2YsQ0FBQztTQUNILENBQUMsQ0FBQztRQUNILGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRWpGLGdEQUFnRDtRQUNoRCxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLHVCQUF1QjtZQUNyQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw0Q0FBNEMsQ0FBQztZQUN6RSxXQUFXLEVBQUU7Z0JBQ1gsOEJBQThCLEVBQUUsNEJBQTRCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDN0U7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDdkYsWUFBWSxFQUFFLDBCQUEwQjtZQUN4QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywrQ0FBK0MsQ0FBQztZQUM1RSxXQUFXLEVBQUU7Z0JBQ1gsOEJBQThCLEVBQUUsNEJBQTRCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDN0U7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCw0Q0FBNEM7UUFDNUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3pFLFlBQVksRUFBRSxtQkFBbUI7WUFDakMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUM7WUFDckUsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3JFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLFlBQVksRUFBRSx3QkFBd0I7WUFDdEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNkNBQTZDLENBQUM7WUFDMUUsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3JFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsMERBQTBEO1FBQzFELE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRixZQUFZLEVBQUUsdUJBQXVCO1lBQ3JDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDO1lBQ3pFLFdBQVcsRUFBRTtnQkFDWCw0QkFBNEIsRUFBRSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN6RTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRixZQUFZLEVBQUUsdUJBQXVCO1lBQ3JDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDO1lBQ3pFLFdBQVcsRUFBRTtnQkFDWCw0QkFBNEIsRUFBRSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN6RTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM3RSxZQUFZLEVBQUUscUJBQXFCO1lBQ25DLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDO1lBQ3ZFLFdBQVcsRUFBRTtnQkFDWCw0QkFBNEIsRUFBRSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN6RTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILGtEQUFrRDtRQUNsRCw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDekUsNEJBQTRCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFDakYsd0JBQXdCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUN0RSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM1RSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM1RSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFFckUsaUNBQWlDO1FBQ2pDLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDN0QsU0FBUyxFQUFFLDJCQUEyQjtZQUN0QyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDM0MsZUFBZSxFQUFFO2dCQUNmLEtBQUssRUFBRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtvQkFDMUMsU0FBUyxFQUFFLCtCQUErQjtpQkFDM0MsQ0FBQztnQkFDRixlQUFlLEVBQUUsQ0FBQzthQUNuQjtTQUNGLENBQUMsQ0FBQztRQUVILGtEQUFrRDtRQUNsRCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0QsU0FBUyxFQUFFLG9CQUFvQjtZQUMvQixlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1NBQ3ZDLENBQUMsQ0FBQztRQUVILE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3pELFNBQVMsRUFBRSxzQkFBc0I7WUFDakMsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzFDLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNoRCxlQUFlLEVBQUU7Z0JBQ2YsS0FBSyxFQUFFLGdCQUFnQjtnQkFDdkIsZUFBZSxFQUFFLENBQUM7YUFDbkI7U0FDRixDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQy9ELFNBQVMsRUFBRSxtQ0FBbUM7WUFDOUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLG1DQUFtQztTQUM1RSxDQUFDLENBQUM7UUFFSCxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDbkUsU0FBUyxFQUFFLCtCQUErQjtZQUMxQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSx1QkFBdUI7WUFDcEUsc0JBQXNCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsZUFBZTtZQUNqRSxlQUFlLEVBQUU7Z0JBQ2YsS0FBSyxFQUFFLGdCQUFnQjtnQkFDdkIsZUFBZSxFQUFFLENBQUMsRUFBRSwyQ0FBMkM7YUFDaEU7U0FDRixDQUFDLENBQUM7UUFFSCwrQkFBK0I7UUFDL0IsTUFBTSxTQUFTLEdBQUcsSUFBSSxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDN0QsVUFBVSxFQUFFLDJCQUEyQjtZQUN2QyxvQkFBb0IsRUFBRTtnQkFDcEIsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsQ0FBQztnQkFDekQsaUJBQWlCLEVBQUUsUUFBUTtnQkFDM0IsaUJBQWlCLEVBQUUsT0FBTzthQUMzQjtTQUNGLENBQUMsQ0FBQztRQUVILHlDQUF5QztRQUN6QyxNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDekUsWUFBWSxFQUFFLDJCQUEyQjtZQUN6QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQztZQUMzRCxXQUFXLEVBQUU7Z0JBQ1gsZUFBZSxFQUFFLFNBQVMsQ0FBQyxVQUFVO2FBQ3RDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELFNBQVMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUV4QyxrQ0FBa0M7UUFDbEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDL0QsWUFBWSxFQUFFLHNCQUFzQjtZQUNwQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyx5QkFBeUIsQ0FBQztZQUN0RCxXQUFXLEVBQUU7Z0JBQ1gsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLFNBQVM7Z0JBQ3RDLGVBQWUsRUFBRSxTQUFTLENBQUMsVUFBVTtnQkFDckMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLEVBQUU7Z0JBQ2xELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxFQUFFO2FBQzNDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUNyRSxZQUFZLEVBQUUseUJBQXlCO1lBQ3ZDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDO1lBQ3pELFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUztnQkFDdEMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxVQUFVO2dCQUNyQyxlQUFlLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksRUFBRTtnQkFDbEQsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEVBQUU7YUFDM0M7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxlQUFlLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUNuRSxZQUFZLEVBQUUsd0JBQXdCO1lBQ3RDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDO1lBQ3hELFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUztnQkFDdEMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxVQUFVO2FBQ3RDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDekUsWUFBWSxFQUFFLDRCQUE0QjtZQUMxQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQkFBMEIsQ0FBQztZQUN2RCxXQUFXLEVBQUU7Z0JBQ1gsd0JBQXdCLEVBQUUsaUJBQWlCLENBQUMsVUFBVTtnQkFDdEQsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLGtCQUFrQixFQUFFLGFBQWEsQ0FBQyxRQUFRO2FBQzNDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRixZQUFZLEVBQUUsZ0NBQWdDO1lBQzlDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG1DQUFtQyxDQUFDO1lBQ2hFLFdBQVcsRUFBRTtnQkFDWCxvQkFBb0IsRUFBRSxlQUFlLENBQUMsUUFBUTtnQkFDOUMsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLGlCQUFpQixFQUFFLEVBQUUsRUFBRSx3Q0FBd0M7YUFDaEU7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ3JFLFlBQVksRUFBRSwwQkFBMEI7WUFDeEMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUM7WUFDMUQsV0FBVyxFQUFFO2dCQUNYLFdBQVcsRUFBRSxLQUFLO2FBQ25CO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDBDQUEwQztRQUMxQyxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLGlDQUFpQztZQUMvQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxvQ0FBb0MsQ0FBQztZQUNqRSxXQUFXLEVBQUU7Z0JBQ1gsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDckQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ3JGLFlBQVksRUFBRSxtQ0FBbUM7WUFDakQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsc0NBQXNDLENBQUM7WUFDbkUsV0FBVyxFQUFFO2dCQUNYLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUNwRCxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO2dCQUNqRCxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDdEQscUJBQXFCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDM0Q7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ3ZGLFlBQVksRUFBRSxvQ0FBb0M7WUFDbEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsdUNBQXVDLENBQUM7WUFDcEUsV0FBVyxFQUFFO2dCQUNYLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQzNEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sK0JBQStCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxpQ0FBaUMsRUFBRTtZQUNuRyxZQUFZLEVBQUUsMENBQTBDO1lBQ3hELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDZDQUE2QyxDQUFDO1lBQzFFLFdBQVcsRUFBRTtnQkFDWCxrQkFBa0IsRUFBRSxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUNyRDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILHNDQUFzQztRQUN0QyxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0UsWUFBWSxFQUFFLCtCQUErQjtZQUM3QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQ0FBc0MsQ0FBQztZQUNuRSxXQUFXLEVBQUU7Z0JBQ1gsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDdkQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzNFLFlBQVksRUFBRSw2QkFBNkI7WUFDM0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUM7WUFDekUsV0FBVyxFQUFFO2dCQUNYLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3ZEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvRSxZQUFZLEVBQUUsK0JBQStCO1lBQzdDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHNDQUFzQyxDQUFDO1lBQ25FLFdBQVcsRUFBRTtnQkFDWCxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN2RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLFlBQVksRUFBRSxrQ0FBa0M7WUFDaEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsdUNBQXVDLENBQUM7WUFDcEUsV0FBVyxFQUFFO2dCQUNYLHNCQUFzQixFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN4RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0UsWUFBWSxFQUFFLGdDQUFnQztZQUM5QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQztZQUNsRSxXQUFXLEVBQUU7Z0JBQ1gsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3hEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNuRixZQUFZLEVBQUUsa0NBQWtDO1lBQ2hELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHVDQUF1QyxDQUFDO1lBQ3BFLFdBQVcsRUFBRTtnQkFDWCxzQkFBc0IsRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDeEQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsd0NBQXdDO1FBQ3hDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRixZQUFZLEVBQUUsaUNBQWlDO1lBQy9DLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDO1lBQ3ZFLFdBQVcsRUFBRTtnQkFDWCxxQkFBcUIsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDdEQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzdFLFlBQVksRUFBRSwrQkFBK0I7WUFDN0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUM7WUFDckUsV0FBVyxFQUFFO2dCQUNYLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN0RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLGlDQUFpQztZQUMvQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQ0FBMEMsQ0FBQztZQUN2RSxXQUFXLEVBQUU7Z0JBQ1gscUJBQXFCLEVBQUUsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3REO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILG9CQUFvQjtRQUNwQixVQUFVLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDN0MsVUFBVSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQy9DLFNBQVMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbkMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVyQywwQkFBMEI7UUFDMUIsaUJBQWlCLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDckQsaUJBQWlCLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDcEQsZUFBZSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDMUQsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFFcEQsNEJBQTRCO1FBQzVCLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDekQsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM3RCxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUVsRCwwQkFBMEI7UUFDMUIsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzdELGdCQUFnQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMvRCxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUMzRSxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUMzRCxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRS9ELDhCQUE4QjtRQUM5QixtQkFBbUIsQ0FBQyxrQkFBa0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ2pFLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBRTdELGlDQUFpQztRQUNqQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUNsRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLENBQUM7UUFDM0QsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFbEUsb0NBQW9DO1FBQ3BDLGVBQWUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNsRSxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQzNELGVBQWUsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUVsRSxtQ0FBbUM7UUFDbkMsY0FBYyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ2hFLGNBQWMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDekQsY0FBYyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRWhFLHNDQUFzQztRQUN0QyxNQUFNLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDdkUsWUFBWSxFQUFFLGtCQUFrQjtZQUNoQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyx5Q0FBeUMsQ0FBQztZQUN0RSxXQUFXLEVBQUU7Z0JBQ1gsNkRBQTZEO2dCQUM3RCxXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksU0FBUztnQkFDakQsY0FBYyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLFdBQVc7Z0JBQ3pELGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksMkNBQTJDO2dCQUM3RixlQUFlLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksT0FBTztnQkFDdkQseUJBQXlCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsSUFBSSxNQUFNO2dCQUMxRSxzREFBc0Q7Z0JBQ3RELDBCQUEwQixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLElBQUksR0FBRzthQUMxRTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxtQ0FBbUM7WUFDckUsVUFBVSxFQUFFLElBQUksRUFBRSw4QkFBOEI7WUFDaEQsNEJBQTRCLEVBQUUsQ0FBQztZQUMvQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsaUNBQWlDO1NBQ2xFLENBQUMsQ0FBQztRQUVILE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNqRixZQUFZLEVBQUUsbUJBQW1CO1lBQ2pDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDO1lBQ3ZFLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUM1QyxxQkFBcUIsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQ3JELGNBQWMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxFQUFFO2dCQUNoRCw2REFBNkQ7Z0JBQzdELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxTQUFTO2dCQUNqRCxjQUFjLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksV0FBVztnQkFDekQsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSwyQ0FBMkM7Z0JBQzdGLGVBQWUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxPQUFPO2dCQUN2RCx5QkFBeUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixJQUFJLE1BQU07Z0JBQzFFLHNEQUFzRDtnQkFDdEQsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsSUFBSSxHQUFHO2FBQzFFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxVQUFVLEVBQUUsSUFBSTtZQUNoQiw0QkFBNEIsRUFBRSxDQUFDO1lBQy9CLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxpQ0FBaUM7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLFlBQVksRUFBRSxnQkFBZ0I7WUFDOUIsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsdUNBQXVDLENBQUM7WUFDcEUsV0FBVyxFQUFFO2dCQUNYLGNBQWMsRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQzVDLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDckQsY0FBYyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLEVBQUU7Z0JBQ2hELDZEQUE2RDtnQkFDN0QsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLFNBQVM7Z0JBQ2pELGNBQWMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxXQUFXO2dCQUN6RCxnQkFBZ0IsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQixJQUFJLDJDQUEyQztnQkFDN0YsZUFBZSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBZSxJQUFJLE9BQU87Z0JBQ3ZELHlCQUF5QixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLElBQUksTUFBTTtnQkFDMUUsc0RBQXNEO2dCQUN0RCwwQkFBMEIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixJQUFJLEdBQUc7YUFDMUU7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsbUNBQW1DO1lBQ3RFLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxpQ0FBaUM7WUFDakUsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLHVCQUF1QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDbkYsWUFBWSxFQUFFLGdCQUFnQjtZQUM5QixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywyQ0FBMkMsQ0FBQztZQUN4RSxXQUFXLEVBQUU7Z0JBQ1gsY0FBYyxFQUFFLFlBQVksQ0FBQyxLQUFLLENBQUMsU0FBUzthQUM3QztZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILG9EQUFvRDtRQUNwRCxZQUFZLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDOUQsWUFBWSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQy9ELFlBQVksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDMUQsY0FBYyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ2hFLGNBQWMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNqRSx5RUFBeUU7UUFDekUsMkVBQTJFO1FBRTNFLDREQUE0RDtRQUM1RCx1RUFBdUU7UUFDdkUsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQzVDLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFLENBQUMscUJBQXFCLENBQUM7WUFDaEMsU0FBUyxFQUFFO2dCQUNULHNFQUFzRTthQUN2RTtTQUNGLENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUNqRCxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDdEQsdUJBQXVCLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRXZELDREQUE0RDtRQUM1RCxnRkFBZ0Y7UUFFaEYsdUVBQXVFO1FBQ3ZFLDhFQUE4RTtRQUM5RSx1RUFBdUU7UUFFdkUsNERBQTREO1FBQzVELGlFQUFpRTtRQUNqRSxNQUFNLHVCQUF1QixHQUFHLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN0RCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDO1lBQ3JDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUM7UUFFSCxpQkFBaUIsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUMzRCxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUNoRSx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUVqRSw4REFBOEQ7UUFDOUQsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ2hGLFNBQVMsRUFBRSw2QkFBNkI7WUFDeEMsZ0JBQWdCLEVBQUUsOERBQThEO1lBQ2hGLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQzVCLFNBQVMsRUFBRSxlQUFlO2dCQUMxQixVQUFVLEVBQUUsZUFBZTtnQkFDM0IsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDaEMsQ0FBQztZQUNGLFNBQVMsRUFBRSxFQUFFO1lBQ2IsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3hFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILHVEQUF1RDtRQUN2RCxNQUFNLG1CQUFtQixHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDaEYsU0FBUyxFQUFFLDJCQUEyQjtZQUN0QyxnQkFBZ0IsRUFBRSx1REFBdUQ7WUFDekUsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztnQkFDNUIsU0FBUyxFQUFFLGVBQWU7Z0JBQzFCLFVBQVUsRUFBRSxnQkFBZ0I7Z0JBQzVCLFNBQVMsRUFBRSxTQUFTO2dCQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsS0FBSyxFQUFFLDZCQUE2QjtZQUMvQyxpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7WUFDeEUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsMENBQTBDO1FBQzFDLG1FQUFtRTtRQUNuRSxNQUFNLGdCQUFnQixHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDMUUsU0FBUyxFQUFFLHdCQUF3QjtZQUNuQyxnQkFBZ0IsRUFBRSw4Q0FBOEM7WUFDaEUsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztnQkFDNUIsU0FBUyxFQUFFLGVBQWU7Z0JBQzFCLFVBQVUsRUFBRSxhQUFhO2dCQUN6QixTQUFTLEVBQUUsS0FBSztnQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQzthQUMvQixDQUFDO1lBQ0YsU0FBUyxFQUFFLEdBQUcsRUFBRSxPQUFPO1lBQ3ZCLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtZQUN4RSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtTQUM1RCxDQUFDLENBQUM7UUFFSCwwREFBMEQ7UUFDMUQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM5QyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsUUFBUTtZQUNqQyxXQUFXLEVBQUUsbUNBQW1DO1NBQ2pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLG1CQUFtQixDQUFDLFFBQVE7WUFDbkMsV0FBVyxFQUFFLGdDQUFnQztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxRQUFRO1lBQ2hDLFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsd0VBQXdFO1FBQ3hFLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNuRixhQUFhLEVBQUUseUJBQXlCO1NBQ3pDLENBQUMsQ0FBQztRQUVILG1EQUFtRDtRQUNuRCxnQkFBZ0IsQ0FBQyxVQUFVO1FBQ3pCLDRCQUE0QjtRQUM1QixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLGdDQUFnQztZQUN2QyxJQUFJLEVBQUU7Z0JBQ0osSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsZUFBZTtvQkFDMUIsVUFBVSxFQUFFLGdCQUFnQjtvQkFDNUIsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQy9CLEtBQUssRUFBRSxxQkFBcUI7aUJBQzdCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsY0FBYztvQkFDekIsVUFBVSxFQUFFLGVBQWU7b0JBQzNCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMvQixLQUFLLEVBQUUsb0JBQW9CO2lCQUM1QixDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUM7UUFDRiwrQkFBK0I7UUFDL0IsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxtQ0FBbUM7WUFDMUMsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLGVBQWU7b0JBQzFCLFVBQVUsRUFBRSxlQUFlO29CQUMzQixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsS0FBSyxFQUFFLGdCQUFnQjtpQkFDeEIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxjQUFjO29CQUN6QixVQUFVLEVBQUUsY0FBYztvQkFDMUIsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQy9CLEtBQUssRUFBRSxlQUFlO2lCQUN2QixDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsQ0FDSCxDQUFDO1FBRUYsZ0JBQWdCLENBQUMsVUFBVTtRQUN6Qix5QkFBeUI7UUFDekIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxtQ0FBbUM7WUFDMUMsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLGVBQWU7b0JBQzFCLFVBQVUsRUFBRSxhQUFhO29CQUN6QixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsS0FBSyxFQUFFLGNBQWM7aUJBQ3RCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsY0FBYztvQkFDekIsVUFBVSxFQUFFLFlBQVk7b0JBQ3hCLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM5QixLQUFLLEVBQUUsYUFBYTtpQkFDckIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDO1FBQ0YsZ0NBQWdDO1FBQ2hDLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUseUJBQXlCO1lBQ2hDLElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxlQUFlO29CQUMxQixVQUFVLEVBQUUsZUFBZTtvQkFDM0IsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQy9CLEtBQUssRUFBRSxnQkFBZ0I7aUJBQ3hCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsY0FBYztvQkFDekIsVUFBVSxFQUFFLGNBQWM7b0JBQzFCLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMvQixLQUFLLEVBQUUsZUFBZTtpQkFDdkIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLGdCQUFnQixDQUFDLFVBQVU7UUFDekIsdUJBQXVCO1FBQ3ZCLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsMkJBQTJCO1lBQ2xDLElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxlQUFlO29CQUMxQixVQUFVLEVBQUUsaUJBQWlCO29CQUM3QixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsS0FBSyxFQUFFLGtCQUFrQjtpQkFDMUIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxjQUFjO29CQUN6QixVQUFVLEVBQUUsZ0JBQWdCO29CQUM1QixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsS0FBSyxFQUFFLGlCQUFpQjtpQkFDekIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDO1FBQ0YsdUNBQXVDO1FBQ3ZDLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDO1lBQy9CLEtBQUssRUFBRSw0QkFBNEI7WUFDbkMsT0FBTyxFQUFFO2dCQUNQLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQztvQkFDNUIsVUFBVSxFQUFFLHNDQUFzQztvQkFDbEQsWUFBWSxFQUFFO3dCQUNaLE9BQU8sRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7NEJBQzdCLFNBQVMsRUFBRSxlQUFlOzRCQUMxQixVQUFVLEVBQUUsaUJBQWlCOzRCQUM3QixTQUFTLEVBQUUsS0FBSzs0QkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt5QkFDOUIsQ0FBQzt3QkFDRixNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDOzRCQUM1QixTQUFTLEVBQUUsY0FBYzs0QkFDekIsVUFBVSxFQUFFLGdCQUFnQjs0QkFDNUIsU0FBUyxFQUFFLEtBQUs7NEJBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7eUJBQzlCLENBQUM7cUJBQ0g7b0JBQ0QsS0FBSyxFQUFFLG1CQUFtQjtpQkFDM0IsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLHVCQUF1QjtRQUN2QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdDLEtBQUssRUFBRSx5REFBeUQsSUFBSSxDQUFDLE1BQU0sb0JBQW9CLGdCQUFnQixDQUFDLGFBQWEsRUFBRTtZQUMvSCxXQUFXLEVBQUUsdURBQXVEO1NBQ3JFLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxNQUFNLG9CQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDN0UsWUFBWSxFQUFFLDhCQUE4QjtZQUM1QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQztZQUMvRCxXQUFXLEVBQUU7Z0JBQ1gsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQy9ELHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDckQsdUJBQXVCLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFVBQVU7YUFDN0Q7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUseUJBQXlCO1lBQzVELFVBQVUsRUFBRSxJQUFJLEVBQUUsMENBQTBDO1lBQzVELDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ25FLGNBQWMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDekQsaUJBQWlCLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRTlELHVFQUF1RTtRQUN2RSxpRUFBaUU7UUFDakUsbUNBQW1DO1FBQ25DLGlEQUFpRDtRQUNqRCxPQUFPO1FBRVAsb0NBQW9DO1FBQ3BDLG9CQUFvQixDQUFDLGNBQWMsQ0FDakMsSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLEVBQUU7WUFDeEQsU0FBUyxFQUFFLENBQUMsRUFBRSw2QkFBNkI7WUFDM0MsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CO1lBQ2hFLHVCQUF1QixFQUFFLElBQUksRUFBRSxpQ0FBaUM7U0FDakUsQ0FBQyxDQUNILENBQUM7UUFFRixnQ0FBZ0M7UUFDaEMsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ3JGLFlBQVksRUFBRSxrQ0FBa0M7WUFDaEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUM7WUFDOUQsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUMvRCxxQkFBcUIsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQ3JELHNCQUFzQixFQUFFLGVBQWUsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDdkQsd0JBQXdCLEVBQUUsa0JBQWtCLENBQUMsUUFBUTthQUN0RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxxQ0FBcUM7UUFDckMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDdkUsY0FBYyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUM3RCxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzlELGtCQUFrQixDQUFDLGlCQUFpQixDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFFL0QsK0JBQStCO1FBQy9CLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUN6RixZQUFZLEVBQUUscUNBQXFDO1lBQ25ELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDO1lBQ2pFLFdBQVcsRUFBRTtnQkFDWCwwQkFBMEIsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUNoRTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRXBFLGdDQUFnQztRQUNoQyxNQUFNLDJCQUEyQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDM0YsWUFBWSxFQUFFLHNDQUFzQztZQUNwRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQztZQUNsRSxXQUFXLEVBQUU7Z0JBQ1gsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQy9ELHVCQUF1QixFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxVQUFVO2FBQzdEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLDJCQUEyQixDQUFDLENBQUM7UUFDckUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBRWhFLGdDQUFnQztRQUNoQyxNQUFNLDJCQUEyQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDM0YsWUFBWSxFQUFFLHNDQUFzQztZQUNwRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQztZQUNsRSxXQUFXLEVBQUU7Z0JBQ1gsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDaEU7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgscUNBQXFDO1FBQ3JDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUVyRSw0QkFBNEI7UUFDNUIsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLFlBQVksRUFBRSxrQ0FBa0M7WUFDaEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMkNBQTJDLENBQUM7WUFDeEUsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ2hFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDJDQUEyQztRQUMzQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFakUsOENBQThDO1FBQzlDLGlCQUFpQixDQUFDLG9CQUFvQixDQUNwQyxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFDM0IsSUFBSSxHQUFHLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsRUFDakQsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQ3ZCLENBQUM7UUFFRiw2Q0FBNkM7UUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ3JFLFlBQVksRUFBRSx5QkFBeUI7WUFDdkMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUM7WUFDakUsV0FBVyxFQUFFO2dCQUNYLHdCQUF3QixFQUFFLGlCQUFpQixDQUFDLFVBQVU7Z0JBQ3RELG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUN0RCxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxTQUFTO2dCQUN0RCxvQkFBb0IsRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN6RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSw2Q0FBNkM7WUFDL0UsVUFBVSxFQUFFLElBQUksRUFBRSxzREFBc0Q7WUFDeEUsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCx5Q0FBeUM7UUFDekMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLCtCQUErQixFQUFFO1lBQy9GLFlBQVksRUFBRSw4QkFBOEI7WUFDNUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsc0NBQXNDLENBQUM7WUFDbkUsV0FBVyxFQUFFO2dCQUNYLDhCQUE4QixFQUFFLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUM1RSw0QkFBNEIsRUFBRSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDeEUsMEJBQTBCLEVBQUUsd0JBQXdCLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQ3BFLG1CQUFtQixFQUFFLHNCQUFzQixDQUFDLFFBQVE7Z0JBQ3BELGlCQUFpQixFQUFFLG9CQUFvQixDQUFDLFFBQVE7Z0JBQ2hELHFCQUFxQixFQUFFLHdCQUF3QixDQUFDLFFBQVE7Z0JBQ3hELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxPQUFPO2dCQUMvQyxlQUFlLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLElBQUksRUFBRTtnQkFDbEQsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEVBQUU7YUFDM0M7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCw2Q0FBNkM7UUFDN0MsNkJBQTZCLENBQUMsY0FBYyxDQUMxQyxJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRTtZQUN2RCxTQUFTLEVBQUUsQ0FBQyxFQUFFLDBEQUEwRDtZQUN4RSxpQkFBaUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7U0FDM0MsQ0FBQyxDQUNILENBQUM7UUFFRiw4Q0FBOEM7UUFDOUMsNEJBQTRCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDckYsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzlFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2pGLHNCQUFzQixDQUFDLFlBQVksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ25FLG9CQUFvQixDQUFDLFlBQVksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2pFLHdCQUF3QixDQUFDLFlBQVksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBRXJFLG1DQUFtQztRQUNuQyxNQUFNLHFCQUFxQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0UsWUFBWSxFQUFFLHNCQUFzQjtZQUNwQyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywyQ0FBMkMsQ0FBQztZQUN4RSxXQUFXLEVBQUU7Z0JBQ1gsNEJBQTRCLEVBQUUsMEJBQTBCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDekU7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCwrQ0FBK0M7UUFDL0MsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFM0UsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzdFLFlBQVksRUFBRSw2QkFBNkI7WUFDM0MsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Ozs7Ozs7OztPQVM1QixDQUFDO1lBQ0YsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxTQUFTO2FBQ3ZDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDREQUE0RDtRQUM1RCxhQUFhLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUNuRCxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQzFELGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsOENBQThDO1FBQzdGLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQywwREFBMEQ7UUFDbEgsa0JBQWtCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxrREFBa0Q7UUFDakgsVUFBVSxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRS9DLHlEQUF5RDtRQUN6RCxnQkFBZ0IsQ0FBQyxjQUFjLENBQzdCLElBQUksa0JBQWtCLENBQUMsY0FBYyxDQUFDLGFBQWEsRUFBRTtZQUNuRCxTQUFTLEVBQUUsQ0FBQyxFQUFFLGlDQUFpQztZQUMvQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxvQkFBb0I7WUFDaEUsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLGlDQUFpQztTQUNqRSxDQUFDLENBQ0gsQ0FBQztRQUVGLGdDQUFnQztRQUNoQyxNQUFNLG9CQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDN0UsWUFBWSxFQUFFLDhCQUE4QjtZQUM1QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQztZQUNsRSxXQUFXLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTO2FBQzVCO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDZCQUE2QjtRQUM3QixNQUFNLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDdkUsWUFBWSxFQUFFLDJCQUEyQjtZQUN6QyxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQ0FBc0MsQ0FBQztZQUNuRSxXQUFXLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTO2FBQzVCO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDZEQUE2RDtRQUM3RCxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUN6RCxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUV0RCw2Q0FBNkM7UUFDN0MsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2pGLFlBQVksRUFBRSxnQ0FBZ0M7WUFDOUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOEJBQThCLENBQUM7WUFDM0QsV0FBVyxFQUFFO2dCQUNYLDJCQUEyQixFQUFFLG9CQUFvQixDQUFDLFNBQVM7Z0JBQzNELE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTthQUNwQjtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDREQUE0RDtRQUM1RCxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUUzRCw4QkFBOEI7UUFDOUIsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3pFLFlBQVksRUFBRSw0QkFBNEI7WUFDMUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUM7WUFDaEUsV0FBVyxFQUFFO2dCQUNYLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUzthQUM1QjtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILHdEQUF3RDtRQUN4RCxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUN2RCwyRUFBMkU7UUFFM0UsNERBQTREO1FBQzVELE1BQU0sUUFBUSxHQUFHLElBQUksb0NBQWdCLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzlELFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUztZQUMzQixnQkFBZ0I7WUFDaEIsb0JBQW9CO1NBQ3JCLENBQUMsQ0FBQztRQUVILG9EQUFvRDtRQUNwRCxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUVsRyx5RUFBeUU7UUFDekUsUUFBUSxDQUFDLFlBQVksQ0FBQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBRWxFLGlDQUFpQztRQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzNELE9BQU8sRUFBRSxvQkFBb0I7WUFDN0IsV0FBVyxFQUFFLHlCQUF5QjtZQUN0QyxhQUFhLEVBQUU7Z0JBQ2IsWUFBWSxFQUFFLENBQUMsR0FBRyxDQUFDO2dCQUNuQixZQUFZLEVBQUU7b0JBQ1osVUFBVSxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUM3QixVQUFVLENBQUMsY0FBYyxDQUFDLElBQUk7b0JBQzlCLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRztvQkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxNQUFNO29CQUNoQyxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU87aUJBQ2xDO2dCQUNELFlBQVksRUFBRSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUM7YUFDaEQ7U0FDRixDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUN2RSxVQUFVLEVBQUUsU0FBUztZQUNyQixXQUFXLEVBQUUsY0FBYztTQUM1QixDQUFDLENBQUM7UUFFSCxpREFBaUQ7UUFDakQsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDNUMsR0FBRyxFQUFFLEdBQUc7WUFDUixVQUFVLEVBQUUsYUFBYTtZQUN6QixLQUFLLEVBQUUsR0FBRyxDQUFDLFlBQWE7U0FDekIsQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDMUMsSUFBSSxFQUFFLFVBQVU7WUFDaEIsVUFBVSxFQUFFLFNBQVM7WUFDckIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUNwQyxJQUFJLGNBQWMsQ0FBQyw0QkFBNEIsQ0FDN0MsYUFBYSxDQUFDLGtCQUFrQixFQUNoQyxhQUFhLENBQUMsb0JBQW9CLENBQ25DLENBQ0Y7WUFDRCxPQUFPLEVBQUUsa0RBQWtEO1NBQzVELENBQUMsQ0FBQztRQUVILHlEQUF5RDtRQUN6RCxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLEVBQUU7WUFDM0YsY0FBYyxFQUFFLGdCQUFnQjtZQUNoQyxjQUFjLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQztZQUNqRCxhQUFhLEVBQUUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDO1lBQzFELGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxZQUFZO1NBQ3pELENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGFBQWE7WUFDbkIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixFQUFFLGFBQWEsRUFBRTtnQkFDckYsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztTQUNILENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsZ0JBQWdCO1lBQ3RCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRTtnQkFDM0Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztTQUNILENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsZUFBZTtZQUNyQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsb0JBQW9CLEVBQUUsZUFBZSxFQUFFO2dCQUN6RixvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsZUFBZTtZQUNyQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9GLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLFFBQVE7WUFDZCxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQzNGLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxnQkFBZ0I7WUFDdEIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixFQUFFO2dCQUN2RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxzQkFBc0I7WUFDNUIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDZCQUE2QixFQUFFLHdCQUF3QixFQUFFO2dCQUMzRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxpQ0FBaUM7WUFDdkMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDhCQUE4QixFQUFFLHlCQUF5QixFQUFFO2dCQUM3RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwyQkFBMkI7WUFDakMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLG9DQUFvQyxFQUFFLCtCQUErQixFQUFFO2dCQUN6SCxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsaUJBQWlCO1lBQ3ZCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyx5QkFBeUIsRUFBRSxvQkFBb0IsRUFBRTtnQkFDbkcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILHdCQUF3QjtRQUN4QixHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLDBCQUEwQjtZQUNoQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsc0JBQXNCLEVBQUUsaUJBQWlCLEVBQUU7Z0JBQzdGLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwrQkFBK0I7WUFDckMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixFQUFFO2dCQUN2RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsY0FBYztZQUNwQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9GLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxnQ0FBZ0M7UUFDaEMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxXQUFXO1lBQ2pCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRTtnQkFDckcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsV0FBVztZQUNqQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUU7Z0JBQ2pHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHVCQUF1QjtZQUM3QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUU7Z0JBQ3JHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSx1QkFBdUIsRUFBRTtnQkFDekcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsY0FBYztZQUNwQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUU7Z0JBQ3JHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNEJBQTRCLEVBQUUsdUJBQXVCLEVBQUU7Z0JBQ3pHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxrQ0FBa0M7UUFDbEMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxhQUFhO1lBQ25CLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsRUFBRTtnQkFDdkcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsYUFBYTtZQUNuQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMseUJBQXlCLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ25HLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLDBCQUEwQjtZQUNoQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLEVBQUU7Z0JBQ3ZHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDZCQUE2QixFQUFFLHdCQUF3QixFQUFFO2dCQUMzRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxrQ0FBa0M7WUFDeEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLCtCQUErQixFQUFFLDBCQUEwQixFQUFFO2dCQUMvRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwyQkFBMkI7WUFDakMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLGdDQUFnQyxFQUFFLDJCQUEyQixFQUFFO2dCQUNqSCxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLGdDQUFnQyxFQUFFLDJCQUEyQixFQUFFO2dCQUNqSCxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSx1Q0FBdUM7WUFDN0MsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDRCQUE0QixFQUFFLHVCQUF1QixFQUFFO2dCQUN6RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsNEJBQTRCO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsRUFBRTtnQkFDdkcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsNEJBQTRCO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw4QkFBOEIsRUFBRSx5QkFBeUIsRUFBRTtnQkFDN0csb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9GLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHlDQUF5QztZQUMvQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNEJBQTRCLEVBQUUsdUJBQXVCLEVBQUU7Z0JBQ3pHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixFQUFFO2dCQUN2RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSx1Q0FBdUM7WUFDN0MsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixFQUFFO2dCQUN2RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixFQUFFLG9CQUFvQixFQUFFO2dCQUNuRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsZ0NBQWdDO1FBQ2hDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsNkJBQTZCO1lBQ25DLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRSxpQkFBaUIsRUFBRTtnQkFDN0Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsRUFBRTtnQkFDdkcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsMkJBQTJCO1lBQ2pDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSx1QkFBdUIsRUFBRTtnQkFDekcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsMkJBQTJCO1lBQ2pDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSx1QkFBdUIsRUFBRTtnQkFDekcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO1lBQ25DLFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsY0FBYyxDQUFDLFVBQVU7WUFDaEMsV0FBVyxFQUFFLGdDQUFnQztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDhCQUE4QixFQUFFO1lBQ3RELEtBQUssRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzFDLFdBQVcsRUFBRSxnQ0FBZ0M7U0FDOUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM5QyxLQUFLLEVBQUUsV0FBVyxnQkFBZ0IsRUFBRTtZQUNwQyxXQUFXLEVBQUUsNENBQTRDO1lBQ3pELFVBQVUsRUFBRSw2QkFBNkI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsV0FBVyxTQUFTLEVBQUU7WUFDN0IsV0FBVyxFQUFFLHVDQUF1QztZQUNwRCxVQUFVLEVBQUUsd0JBQXdCO1NBQ3JDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxRQUFRO1lBQy9CLFdBQVcsRUFBRSwrQkFBK0I7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvQyxLQUFLLEVBQUUsa0JBQWtCLENBQUMsUUFBUTtZQUNsQyxXQUFXLEVBQUUsbUNBQW1DO1NBQ2pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3ZDLEtBQUssRUFBRSxHQUFHLENBQUMsV0FBVztZQUN0QixXQUFXLEVBQUUsMEJBQTBCO1NBQ3hDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDakQsS0FBSyxFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO1lBQzFDLFdBQVcsRUFBRSxvQ0FBb0M7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFVBQVU7WUFDMUMsV0FBVyxFQUFFLDBDQUEwQztTQUN4RCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO1lBQ2pDLFdBQVcsRUFBRSx1Q0FBdUM7U0FDckQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRTtZQUNuRCxLQUFLLEVBQUUsc0JBQXNCLENBQUMsUUFBUTtZQUN0QyxXQUFXLEVBQUUsbUNBQW1DO1NBQ2pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDakQsS0FBSyxFQUFFLG9CQUFvQixDQUFDLFFBQVE7WUFDcEMsV0FBVyxFQUFFLGlDQUFpQztTQUMvQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDZCQUE2QixFQUFFO1lBQ3JELEtBQUssRUFBRSx3QkFBd0IsQ0FBQyxRQUFRO1lBQ3hDLFdBQVcsRUFBRSxxQ0FBcUM7U0FDbkQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTO1lBQ25DLFdBQVcsRUFBRSxzQ0FBc0M7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsNENBQTRDO1FBQzVDLDJEQUEyRDtRQUMzRCxNQUFNLFFBQVEsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ2xFLFNBQVMsRUFBRSw4QkFBOEI7WUFDekMsZ0JBQWdCLEVBQUUsaUVBQWlFO1lBQ25GLE1BQU0sRUFBRSxlQUFlLENBQUMsd0NBQXdDLEVBQUU7WUFDbEUsU0FBUyxFQUFFLENBQUM7WUFDWixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7WUFDeEUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsOERBQThEO1FBQzlELE1BQU0sZUFBZSxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDaEYsU0FBUyxFQUFFLGdDQUFnQztZQUMzQyxnQkFBZ0IsRUFBRSwyREFBMkQ7WUFDN0UsTUFBTSxFQUFFLGlCQUFpQixDQUFDLHdDQUF3QyxFQUFFO1lBQ3BFLFNBQVMsRUFBRSxJQUFJO1lBQ2YsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3hFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILGlEQUFpRDtRQUNqRCxNQUFNLG1CQUFtQixHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUNBQWlDLEVBQUU7WUFDeEYsU0FBUyxFQUFFLHFDQUFxQztZQUNoRCxnQkFBZ0IsRUFBRSxxREFBcUQ7WUFDdkUsTUFBTSxFQUFFLDZCQUE2QixDQUFDLFlBQVksQ0FBQztnQkFDakQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNoQyxDQUFDO1lBQ0YsU0FBUyxFQUFFLENBQUM7WUFDWixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7WUFDeEUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsNENBQTRDO1FBQzVDLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUMxRixTQUFTLEVBQUUsZ0NBQWdDO1lBQzNDLGdCQUFnQixFQUFFLGdEQUFnRDtZQUNsRSxNQUFNLEVBQUUsd0JBQXdCLENBQUMsWUFBWSxDQUFDO2dCQUM1QyxNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsQ0FBQztZQUNaLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtZQUN4RSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtTQUM1RCxDQUFDLENBQUM7UUFFSCwwQ0FBMEM7UUFDMUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlFLFNBQVMsRUFBRSwwQkFBMEI7WUFDckMsZ0JBQWdCLEVBQUUscUNBQXFDO1lBQ3ZELE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxpQ0FBaUMsQ0FBQztnQkFDL0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNoQyxDQUFDO1lBQ0YsU0FBUyxFQUFFLENBQUM7WUFDWixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7WUFDeEUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsd0NBQXdDO1FBQ3hDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUMxRSxTQUFTLEVBQUUsd0JBQXdCO1lBQ25DLGdCQUFnQixFQUFFLG1DQUFtQztZQUNyRCxNQUFNLEVBQUUsb0JBQW9CLENBQUMsaUNBQWlDLENBQUM7Z0JBQzdELE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDaEMsQ0FBQztZQUNGLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3hFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILCtDQUErQztRQUMvQyxNQUFNLHFCQUFxQixHQUFHLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDcEYsYUFBYSxFQUFFLDJCQUEyQjtTQUMzQyxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IscUJBQXFCLENBQUMsVUFBVTtRQUM5QixnQkFBZ0I7UUFDaEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSwwQkFBMEI7WUFDakMsSUFBSSxFQUFFO2dCQUNKLGlCQUFpQixDQUFDLHdDQUF3QyxDQUFDO29CQUN6RCxLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLGlCQUFpQixDQUFDLDJDQUEyQyxDQUFDO29CQUM1RCxLQUFLLEVBQUUsb0JBQW9CO29CQUMzQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsRUFDRixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLGtDQUFrQztZQUN6QyxJQUFJLEVBQUU7Z0JBQ0osZUFBZSxDQUFDLHdDQUF3QyxDQUFDO29CQUN2RCxLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMvQixTQUFTLEVBQUUsS0FBSztpQkFDakIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLHFCQUFxQixDQUFDLFVBQVU7UUFDOUIsaUJBQWlCO1FBQ2pCLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsb0NBQW9DO1lBQzNDLElBQUksRUFBRTtnQkFDSiw2QkFBNkIsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDOUMsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0YsNkJBQTZCLENBQUMsWUFBWSxDQUFDO29CQUN6QyxLQUFLLEVBQUUsUUFBUTtvQkFDZixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsNkJBQTZCLENBQUMsY0FBYyxDQUFDO29CQUMzQyxLQUFLLEVBQUUsVUFBVTtvQkFDakIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsU0FBUyxFQUFFLFNBQVM7aUJBQ3JCLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRSxFQUFFO1NBQ1YsQ0FBQyxFQUNGLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsK0JBQStCO1lBQ3RDLElBQUksRUFBRTtnQkFDSix3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDekMsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0Ysd0JBQXdCLENBQUMsWUFBWSxDQUFDO29CQUNwQyxLQUFLLEVBQUUsUUFBUTtvQkFDZixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsd0JBQXdCLENBQUMsY0FBYyxDQUFDO29CQUN0QyxLQUFLLEVBQUUsVUFBVTtvQkFDakIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsU0FBUyxFQUFFLFNBQVM7aUJBQ3JCLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRSxFQUFFO1NBQ1YsQ0FBQyxDQUNILENBQUM7UUFFRixxQkFBcUIsQ0FBQyxVQUFVO1FBQzlCLHVCQUF1QjtRQUN2QixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLG9CQUFvQjtZQUMzQixJQUFJLEVBQUU7Z0JBQ0osc0JBQXNCLENBQUMsK0JBQStCLENBQUM7b0JBQ3JELEtBQUssRUFBRSxXQUFXO29CQUNsQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLHNCQUFzQixDQUFDLG9DQUFvQyxDQUFDO29CQUMxRCxLQUFLLEVBQUUsV0FBVztvQkFDbEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDaEMsQ0FBQztnQkFDRixzQkFBc0IsQ0FBQyxpQ0FBaUMsQ0FBQztvQkFDdkQsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDaEMsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLENBQUM7U0FDVCxDQUFDLEVBQ0YsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsSUFBSSxFQUFFO2dCQUNKLG9CQUFvQixDQUFDLCtCQUErQixDQUFDO29CQUNuRCxLQUFLLEVBQUUsV0FBVztvQkFDbEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDaEMsQ0FBQztnQkFDRixvQkFBb0IsQ0FBQyxvQ0FBb0MsQ0FBQztvQkFDeEQsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0Ysb0JBQW9CLENBQUMsaUNBQWlDLENBQUM7b0JBQ3JELEtBQUssRUFBRSxRQUFRO29CQUNmLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRSxDQUFDO1NBQ1QsQ0FBQyxFQUNGLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsc0JBQXNCO1lBQzdCLElBQUksRUFBRTtnQkFDSix3QkFBd0IsQ0FBQywrQkFBK0IsQ0FBQztvQkFDdkQsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0Ysd0JBQXdCLENBQUMsb0NBQW9DLENBQUM7b0JBQzVELEtBQUssRUFBRSxXQUFXO29CQUNsQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLHdCQUF3QixDQUFDLGlDQUFpQyxDQUFDO29CQUN6RCxLQUFLLEVBQUUsUUFBUTtvQkFDZixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsQ0FBQztTQUNULENBQUMsQ0FDSCxDQUFDO1FBRUYsdUJBQXVCO1FBQ3ZCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEQsS0FBSyxFQUFFLHlEQUF5RCxJQUFJLENBQUMsTUFBTSxvQkFBb0IscUJBQXFCLENBQUMsYUFBYSxFQUFFO1lBQ3BJLFdBQVcsRUFBRSw4Q0FBOEM7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsa0JBQWtCO1FBQ2xCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVTtZQUMxQixXQUFXLEVBQUUsc0JBQXNCO1lBQ25DLFVBQVUsRUFBRSw2QkFBNkI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtZQUMxQyxLQUFLLEVBQUUsY0FBYyxDQUFDLGdCQUFnQjtZQUN0QyxXQUFXLEVBQUUsNkJBQTZCO1lBQzFDLFVBQVUsRUFBRSxvQ0FBb0M7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxXQUFXO1lBQzNCLFdBQVcsRUFBRSx1QkFBdUI7WUFDcEMsVUFBVSxFQUFFLDhCQUE4QjtTQUMzQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUEvc0VELGdEQStzRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBzM24gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLW5vdGlmaWNhdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYUV2ZW50U291cmNlcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xyXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xyXG5pbXBvcnQgKiBhcyBpbnRlZ3JhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBhdXRob3JpemVycyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcclxuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGNlcnRpZmljYXRlbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XHJcbmltcG9ydCAqIGFzIHJvdXRlNTN0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgQW5hbHlzaXNXb3JrZmxvdyB9IGZyb20gJy4vYW5hbHlzaXMtd29ya2Zsb3cnO1xyXG5pbXBvcnQgeyBGaWxlTWV0YWRhdGFUYWJsZSB9IGZyb20gJy4vZmlsZS1tZXRhZGF0YS10YWJsZSc7XHJcbmltcG9ydCB7IFNhbXBsZUZpbGVzVGFibGUgfSBmcm9tICcuL3NhbXBsZS1maWxlcy10YWJsZSc7XHJcbmltcG9ydCB7IFVwbG9hZFByb2dyZXNzVGFibGUgfSBmcm9tICcuL3VwbG9hZC1wcm9ncmVzcy10YWJsZSc7XHJcbmltcG9ydCB7IFByb2plY3RzVGFibGUgfSBmcm9tICcuL3Byb2plY3RzLXRhYmxlJztcclxuaW1wb3J0IHsgVGVzdFN1aXRlc1RhYmxlIH0gZnJvbSAnLi90ZXN0LXN1aXRlcy10YWJsZSc7XHJcbmltcG9ydCB7IFRlc3RDYXNlc1RhYmxlIH0gZnJvbSAnLi90ZXN0LWNhc2VzLXRhYmxlJztcclxuaW1wb3J0IHsgVGVzdEV4ZWN1dGlvbnNUYWJsZSB9IGZyb20gJy4vdGVzdC1leGVjdXRpb25zLXRhYmxlJztcclxuaW1wb3J0IHsgU2NyZWVuc2hvdHNCdWNrZXQgfSBmcm9tICcuL3NjcmVlbnNob3RzLWJ1Y2tldCc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUgfSBmcm9tICcuL25vdGlmaWNhdGlvbi1wcmVmZXJlbmNlcy10YWJsZSc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlIH0gZnJvbSAnLi9ub3RpZmljYXRpb24tdGVtcGxhdGVzLXRhYmxlJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlIH0gZnJvbSAnLi9ub3RpZmljYXRpb24taGlzdG9yeS10YWJsZSc7XHJcbmltcG9ydCB7IEFJVXNhZ2VUYWJsZSB9IGZyb20gJy4vYWktdXNhZ2UtdGFibGUnO1xyXG5pbXBvcnQgeyBBbmFseXNpc0NhY2hlVGFibGUgfSBmcm9tICcuL2FuYWx5c2lzLWNhY2hlLXRhYmxlJztcclxuXHJcbmV4cG9ydCBjbGFzcyBNaXNyYVBsYXRmb3JtU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIFByb2R1Y3Rpb24gZG9tYWluIGNvbmZpZ3VyYXRpb25cclxuICAgIGNvbnN0IHByb2R1Y3Rpb25Eb21haW4gPSAnbWlzcmEuZGlnaXRyYW5zb2x1dGlvbnMuaW4nO1xyXG4gICAgY29uc3QgYXBpRG9tYWluID0gJ2FwaS5taXNyYS5kaWdpdHJhbnNvbHV0aW9ucy5pbic7XHJcbiAgICBjb25zdCBob3N0ZWRab25lTmFtZSA9ICdkaWdpdHJhbnNvbHV0aW9ucy5pbic7XHJcbiAgICBcclxuICAgIC8vIEltcG9ydCBleGlzdGluZyBob3N0ZWQgem9uZSAobXVzdCBleGlzdCBpbiBSb3V0ZTUzKVxyXG4gICAgLy8gTm90ZTogVGhlIGhvc3RlZCB6b25lIG11c3QgYmUgY3JlYXRlZCBtYW51YWxseSBpbiBSb3V0ZTUzIGJlZm9yZSBkZXBsb3lpbmcgdGhpcyBzdGFja1xyXG4gICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xyXG4gICAgICBkb21haW5OYW1lOiBob3N0ZWRab25lTmFtZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTU0wgY2VydGlmaWNhdGUgZm9yIENsb3VkRnJvbnQgKG11c3QgYmUgaW4gdXMtZWFzdC0xKVxyXG4gICAgLy8gQ2xvdWRGcm9udCByZXF1aXJlcyBjZXJ0aWZpY2F0ZXMgdG8gYmUgaW4gdXMtZWFzdC0xIHJlZ2lvblxyXG4gICAgY29uc3QgZnJvbnRlbmRDZXJ0aWZpY2F0ZSA9IG5ldyBjZXJ0aWZpY2F0ZW1hbmFnZXIuQ2VydGlmaWNhdGUodGhpcywgJ0Zyb250ZW5kQ2VydGlmaWNhdGUnLCB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IHByb2R1Y3Rpb25Eb21haW4sXHJcbiAgICAgIHZhbGlkYXRpb246IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTU0wgY2VydGlmaWNhdGUgZm9yIEFQSSBHYXRld2F5IChjYW4gYmUgaW4gYW55IHJlZ2lvbilcclxuICAgIGNvbnN0IGFwaUNlcnRpZmljYXRlID0gbmV3IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZSh0aGlzLCAnQXBpQ2VydGlmaWNhdGUnLCB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbixcclxuICAgICAgdmFsaWRhdGlvbjogY2VydGlmaWNhdGVtYW5hZ2VyLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUzMgQnVja2V0cyBmb3IgZmlsZSBzdG9yYWdlXHJcbiAgICBjb25zdCBmaWxlU3RvcmFnZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0ZpbGVTdG9yYWdlQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0tZmlsZXMtJHt0aGlzLmFjY291bnR9YCxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZnJvbnRlbmRCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdGcm9udGVuZEJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYG1pc3JhLXBsYXRmb3JtLWZyb250ZW5kLSR7dGhpcy5hY2NvdW50fWAsXHJcbiAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BQ0xTLFxyXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciBmcm9udGVuZCB3aXRoIGN1c3RvbSBkb21haW5cclxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRnJvbnRlbmREaXN0cmlidXRpb24nLCB7XHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oZnJvbnRlbmRCdWNrZXQpLFxyXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxyXG4gICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5DT1JTX1MzX09SSUdJTixcclxuICAgICAgfSxcclxuICAgICAgZG9tYWluTmFtZXM6IFtwcm9kdWN0aW9uRG9tYWluXSxcclxuICAgICAgY2VydGlmaWNhdGU6IGZyb250ZW5kQ2VydGlmaWNhdGUsXHJcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxyXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCwgLy8gVXNlIG9ubHkgTm9ydGggQW1lcmljYSBhbmQgRXVyb3BlIGVkZ2UgbG9jYXRpb25zXHJcbiAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXHJcbiAgICAgIGNvbW1lbnQ6ICdNSVNSQSBQbGF0Zm9ybSBQcm9kdWN0aW9uIEZyb250ZW5kIERpc3RyaWJ1dGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgUm91dGU1MyBBIHJlY29yZCBmb3IgZnJvbnRlbmQgZG9tYWluXHJcbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdGcm9udGVuZEFsaWFzUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBwcm9kdWN0aW9uRG9tYWluLFxyXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcclxuICAgICAgICBuZXcgcm91dGU1M3RhcmdldHMuQ2xvdWRGcm9udFRhcmdldChkaXN0cmlidXRpb24pXHJcbiAgICAgICksXHJcbiAgICAgIGNvbW1lbnQ6ICdDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBmb3IgTUlTUkEgUGxhdGZvcm0gZnJvbnRlbmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29nbml0byBVc2VyIFBvb2wgZm9yIGF1dGhlbnRpY2F0aW9uXHJcbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHtcclxuICAgICAgdXNlclBvb2xOYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgc2lnbkluQWxpYXNlczoge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgYXV0b1ZlcmlmeToge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBlbWFpbDoge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnVsbG5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IFxyXG4gICAgICAgICAgbWluTGVuOiAxLCBcclxuICAgICAgICAgIG1heExlbjogMjU2LFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgICByb2xlOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBcclxuICAgICAgICAgIG1pbkxlbjogMSwgXHJcbiAgICAgICAgICBtYXhMZW46IDUwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgfSxcclxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgIG1mYTogY29nbml0by5NZmEuT1BUSU9OQUwsXHJcbiAgICAgIG1mYVNlY29uZEZhY3Rvcjoge1xyXG4gICAgICAgIHNtczogZmFsc2UsXHJcbiAgICAgICAgb3RwOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XHJcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnVmVyaWZ5IHlvdXIgZW1haWwgZm9yIE1pc3JhIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdUaGFuayB5b3UgZm9yIHNpZ25pbmcgdXAhIFlvdXIgdmVyaWZpY2F0aW9uIGNvZGUgaXMgeyMjIyN9JyxcclxuICAgICAgICBlbWFpbFN0eWxlOiBjb2duaXRvLlZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuQ09ERSxcclxuICAgICAgfSxcclxuICAgICAgdXNlckludml0YXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIE1pc3JhIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdIZWxsbyB7dXNlcm5hbWV9LCB5b3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gam9pbiBNaXNyYSBQbGF0Zm9ybS4gWW91ciB0ZW1wb3JhcnkgcGFzc3dvcmQgaXMgeyMjIyN9JyxcclxuICAgICAgfSxcclxuICAgICAgZGV2aWNlVHJhY2tpbmc6IHtcclxuICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiB0cnVlLFxyXG4gICAgICAgIGRldmljZU9ubHlSZW1lbWJlcmVkT25Vc2VyUHJvbXB0OiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSB1c2VyUG9vbC5hZGRDbGllbnQoJ1dlYkNsaWVudCcsIHtcclxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiAnbWlzcmEtcGxhdGZvcm0td2ViLWNsaWVudCcsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxyXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICBhY2Nlc3NUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICBlbmFibGVUb2tlblJldm9jYXRpb246IHRydWUsXHJcbiAgICAgIHJlYWRBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGVtYWlsVmVyaWZpZWQ6IHRydWUsXHJcbiAgICAgICAgICBmdWxsbmFtZTogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcygnb3JnYW5pemF0aW9uSWQnLCAncm9sZScpLFxyXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZnVsbG5hbWU6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ29yZ2FuaXphdGlvbklkJywgJ3JvbGUnKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIER5bmFtb0RCIFRhYmxlcyAtIFVzaW5nIGV4aXN0aW5nIHRhYmxlIG5hbWVzIGZyb20gcHJldmlvdXMgZGVwbG95bWVudFxyXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXNlcnMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBvcmdhbml6YXRpb24gcXVlcmllc1xyXG4gICAgdXNlcnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ29yZ2FuaXphdGlvbklkLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdvcmdhbml6YXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBlbWFpbCBxdWVyaWVzXHJcbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZW1haWwtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VtYWlsJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZSBleGlzdGluZyBUZXN0UHJvamVjdHMgdGFibGVcclxuICAgIGNvbnN0IHByb2plY3RzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Byb2plY3RzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ1Rlc3RQcm9qZWN0cycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnb3JnYW5pemF0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYW5hbHlzZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQW5hbHlzZXNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tYW5hbHlzZXMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2FuYWx5c2lzSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdwcm9qZWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSXMgZm9yIGVmZmljaWVudCBxdWVyeWluZ1xyXG4gICAgYW5hbHlzZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3Byb2plY3RJZC1jcmVhdGVkQXQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Byb2plY3RJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBhbmFseXNlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnc3RhdHVzLWNyZWF0ZWRBdC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3RhdHVzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHRlc3RSdW5zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Rlc3RSdW5zVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ21pc3JhLXBsYXRmb3JtLXRlc3QtcnVucycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndGVzdFJ1bklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIFJlc3VsdHMgVGFibGUgZm9yIHN0b3JpbmcgZGV0YWlsZWQgTUlTUkEgYW5hbHlzaXMgcmVzdWx0c1xyXG4gICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0FuYWx5c2lzUmVzdWx0c1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1yZXN1bHRzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdhbmFseXNpc0lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0lzIGZvciBhbmFseXNpcyByZXN1bHRzIHF1ZXJpZXNcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZmlsZUlkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZmlsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAncnVsZVNldC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3J1bGVTZXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZSBNZXRhZGF0YSBUYWJsZSBmb3IgdHJhY2tpbmcgdXBsb2FkZWQgZmlsZXMgYW5kIGFuYWx5c2lzIHN0YXR1c1xyXG4gICAgY29uc3QgZmlsZU1ldGFkYXRhVGFibGUgPSBuZXcgRmlsZU1ldGFkYXRhVGFibGUodGhpcywgJ0ZpbGVNZXRhZGF0YVRhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNhbXBsZSBGaWxlcyBUYWJsZSBmb3Igc3RvcmluZyBwcmVkZWZpbmVkIEMvQysrIGZpbGVzIHdpdGgga25vd24gTUlTUkEgdmlvbGF0aW9uc1xyXG4gICAgY29uc3Qgc2FtcGxlRmlsZXNUYWJsZSA9IG5ldyBTYW1wbGVGaWxlc1RhYmxlKHRoaXMsICdTYW1wbGVGaWxlc1RhYmxlJyk7XHJcblxyXG4gICAgLy8gVXBsb2FkIFByb2dyZXNzIFRhYmxlIGZvciB0cmFja2luZyBmaWxlIHVwbG9hZCBwcm9ncmVzc1xyXG4gICAgY29uc3QgdXBsb2FkUHJvZ3Jlc3NUYWJsZSA9IG5ldyBVcGxvYWRQcm9ncmVzc1RhYmxlKHRoaXMsICdVcGxvYWRQcm9ncmVzc1RhYmxlJywgeyBlbnZpcm9ubWVudDogJ2RldicgfSk7XHJcblxyXG4gICAgLy8gUHJvamVjdHMgVGFibGUgZm9yIFdlYiBBcHAgVGVzdGluZyBTeXN0ZW0gLSBVc2luZyBleGlzdGluZyBUZXN0UHJvamVjdHMgdGFibGVcclxuICAgIGNvbnN0IHRlc3RQcm9qZWN0c1RhYmxlID0gbmV3IFByb2plY3RzVGFibGUodGhpcywgJ1Rlc3RQcm9qZWN0c1RhYmxlJyk7XHJcblxyXG4gICAgLy8gVGVzdCBTdWl0ZXMgVGFibGUgZm9yIFdlYiBBcHAgVGVzdGluZyBTeXN0ZW0gLSBVc2luZyBleGlzdGluZyBUZXN0U3VpdGVzIHRhYmxlXHJcbiAgICBjb25zdCB0ZXN0U3VpdGVzVGFibGUgPSBuZXcgVGVzdFN1aXRlc1RhYmxlKHRoaXMsICdUZXN0U3VpdGVzVGFibGUnKTtcclxuXHJcbiAgICAvLyBUZXN0IENhc2VzIFRhYmxlIGZvciBXZWIgQXBwIFRlc3RpbmcgU3lzdGVtIC0gVXNpbmcgZXhpc3RpbmcgVGVzdENhc2VzIHRhYmxlXHJcbiAgICBjb25zdCB0ZXN0Q2FzZXNUYWJsZSA9IG5ldyBUZXN0Q2FzZXNUYWJsZSh0aGlzLCAnVGVzdENhc2VzVGFibGUnKTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbnMgVGFibGUgZm9yIFdlYiBBcHAgVGVzdGluZyBTeXN0ZW0gLSBVc2luZyBleGlzdGluZyBUZXN0RXhlY3V0aW9ucyB0YWJsZVxyXG4gICAgY29uc3QgdGVzdEV4ZWN1dGlvbnNUYWJsZSA9IG5ldyBUZXN0RXhlY3V0aW9uc1RhYmxlKHRoaXMsICdUZXN0RXhlY3V0aW9uc1RhYmxlJyk7XHJcblxyXG4gICAgLy8gU2NyZWVuc2hvdHMgQnVja2V0IGZvciBUZXN0IEV4ZWN1dGlvbiBGYWlsdXJlc1xyXG4gICAgY29uc3Qgc2NyZWVuc2hvdHNCdWNrZXQgPSBuZXcgU2NyZWVuc2hvdHNCdWNrZXQodGhpcywgJ1NjcmVlbnNob3RzQnVja2V0Jywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBTeXN0ZW0gVGFibGVzXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlID0gbmV3IE5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUodGhpcywgJ05vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiAnZGV2J1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUgPSBuZXcgTm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUodGhpcywgJ05vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZSA9IG5ldyBOb3RpZmljYXRpb25IaXN0b3J5VGFibGUodGhpcywgJ05vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZScsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6ICdkZXYnXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBSSBVc2FnZSBUYWJsZSBmb3IgQUkgVGVzdCBHZW5lcmF0aW9uIC0gVXNpbmcgZXhpc3RpbmcgQUlVc2FnZSB0YWJsZVxyXG4gICAgY29uc3QgYWlVc2FnZVRhYmxlID0gbmV3IEFJVXNhZ2VUYWJsZSh0aGlzLCAnQUlVc2FnZVRhYmxlJyk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgQ2FjaGUgVGFibGUgZm9yIE1JU1JBIGFuYWx5c2lzIGNhY2hpbmcgKFJlcXVpcmVtZW50IDEwLjcpXHJcbiAgICBjb25zdCBhbmFseXNpc0NhY2hlVGFibGUgPSBuZXcgQW5hbHlzaXNDYWNoZVRhYmxlKHRoaXMsICdBbmFseXNpc0NhY2hlVGFibGUnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiAnZGV2J1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU05TIFRvcGljcyBmb3IgTm90aWZpY2F0aW9uIERlbGl2ZXJ5XHJcbiAgICBjb25zdCBlbWFpbE5vdGlmaWNhdGlvblRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnRW1haWxOb3RpZmljYXRpb25Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiAnYWlidHMtbm90aWZpY2F0aW9ucy1lbWFpbCcsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiAnQUlCVFMgRW1haWwgTm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzbXNOb3RpZmljYXRpb25Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ1Ntc05vdGlmaWNhdGlvblRvcGljJywge1xyXG4gICAgICB0b3BpY05hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb25zLXNtcycsXHJcbiAgICAgIGRpc3BsYXlOYW1lOiAnQUlCVFMgU01TIE5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgd2ViaG9va05vdGlmaWNhdGlvblRvcGljID0gbmV3IHNucy5Ub3BpYyh0aGlzLCAnV2ViaG9va05vdGlmaWNhdGlvblRvcGljJywge1xyXG4gICAgICB0b3BpY05hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb25zLXdlYmhvb2snLFxyXG4gICAgICBkaXNwbGF5TmFtZTogJ0FJQlRTIFdlYmhvb2sgTm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTUVMgUXVldWUgZm9yIG5vdGlmaWNhdGlvbiBwcm9jZXNzaW5nXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25ETFEgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdOb3RpZmljYXRpb25ETFEnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbi1kbHEnLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSwgLy8gS2VlcCBmYWlsZWQgbWVzc2FnZXMgZm9yIDE0IGRheXNcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvblF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnTm90aWZpY2F0aW9uUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbi1xdWV1ZScsXHJcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksIC8vIE1hdGNoIExhbWJkYSB0aW1lb3V0XHJcbiAgICAgIHJlY2VpdmVNZXNzYWdlV2FpdFRpbWU6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDIwKSwgLy8gTG9uZyBwb2xsaW5nXHJcbiAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoNCksXHJcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xyXG4gICAgICAgIHF1ZXVlOiBub3RpZmljYXRpb25ETFEsXHJcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLCAvLyBSZXRyeSB1cCB0byAzIHRpbWVzIGJlZm9yZSBtb3ZpbmcgdG8gRExRXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFdmVudEJyaWRnZSBSdWxlIGZvciBUZXN0IENvbXBsZXRpb24gRXZlbnRzXHJcbiAgICAvLyBSb3V0ZXMgdGVzdCBleGVjdXRpb24gY29tcGxldGlvbiBldmVudHMgdG8gbm90aWZpY2F0aW9uIHF1ZXVlXHJcbiAgICBjb25zdCB0ZXN0Q29tcGxldGlvblJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ1Rlc3RDb21wbGV0aW9uUnVsZScsIHtcclxuICAgICAgcnVsZU5hbWU6ICdhaWJ0cy10ZXN0LWV4ZWN1dGlvbi1jb21wbGV0aW9uJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdSb3V0ZXMgdGVzdCBleGVjdXRpb24gY29tcGxldGlvbiBldmVudHMgdG8gbm90aWZpY2F0aW9uIHF1ZXVlJyxcclxuICAgICAgZXZlbnRQYXR0ZXJuOiB7XHJcbiAgICAgICAgc291cmNlOiBbJ2FpYnRzLnRlc3QtZXhlY3V0aW9uJ10sXHJcbiAgICAgICAgZGV0YWlsVHlwZTogWydUZXN0IEV4ZWN1dGlvbiBDb21wbGV0ZWQnXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBub3RpZmljYXRpb24gcXVldWUgYXMgdGFyZ2V0IGZvciB0ZXN0IGNvbXBsZXRpb24gZXZlbnRzXHJcbiAgICB0ZXN0Q29tcGxldGlvblJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLlNxc1F1ZXVlKG5vdGlmaWNhdGlvblF1ZXVlKSk7XHJcblxyXG4gICAgLy8gU2NoZWR1bGVkIFJlcG9ydHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCBzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLXNjaGVkdWxlZC1yZXBvcnRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9zY2hlZHVsZWQtcmVwb3J0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1FVRVVFX1VSTDogbm90aWZpY2F0aW9uUXVldWUucXVldWVVcmwsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBzY2hlZHVsZWQgcmVwb3J0cyBmdW5jdGlvblxyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbik7XHJcbiAgICBub3RpZmljYXRpb25RdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyhzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEV2ZW50QnJpZGdlIENyb24gUnVsZXMgZm9yIFNjaGVkdWxlZCBSZXBvcnRzXHJcbiAgICAvLyBEYWlseSBSZXBvcnQgLSAwOTowMCBVVEMgZGFpbHlcclxuICAgIGNvbnN0IGRhaWx5UmVwb3J0UnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnRGFpbHlSZXBvcnRSdWxlJywge1xyXG4gICAgICBydWxlTmFtZTogJ2FpYnRzLWRhaWx5LXN1bW1hcnktcmVwb3J0JyxcclxuICAgICAgZGVzY3JpcHRpb246ICdUcmlnZ2VycyBkYWlseSB0ZXN0IGV4ZWN1dGlvbiBzdW1tYXJ5IHJlcG9ydCcsXHJcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7XHJcbiAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgaG91cjogJzknLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG4gICAgZGFpbHlSZXBvcnRSdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24pKTtcclxuXHJcbiAgICAvLyBXZWVrbHkgUmVwb3J0IC0gMDk6MDAgVVRDIGV2ZXJ5IE1vbmRheVxyXG4gICAgY29uc3Qgd2Vla2x5UmVwb3J0UnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnV2Vla2x5UmVwb3J0UnVsZScsIHtcclxuICAgICAgcnVsZU5hbWU6ICdhaWJ0cy13ZWVrbHktc3VtbWFyeS1yZXBvcnQnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RyaWdnZXJzIHdlZWtseSB0ZXN0IGV4ZWN1dGlvbiBzdW1tYXJ5IHJlcG9ydCcsXHJcbiAgICAgIHNjaGVkdWxlOiBldmVudHMuU2NoZWR1bGUuY3Jvbih7XHJcbiAgICAgICAgbWludXRlOiAnMCcsXHJcbiAgICAgICAgaG91cjogJzknLFxyXG4gICAgICAgIHdlZWtEYXk6ICdNT04nLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG4gICAgd2Vla2x5UmVwb3J0UnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uKSk7XHJcblxyXG4gICAgLy8gTm90aWZpY2F0aW9uIFByZWZlcmVuY2VzIEFQSSBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UHJlZmVyZW5jZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LXByZWZlcmVuY2VzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9nZXQtcHJlZmVyZW5jZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fUFJFRkVSRU5DRVNfVEFCTEU6IG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGRhdGVQcmVmZXJlbmNlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy11cGRhdGUtcHJlZmVyZW5jZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL3VwZGF0ZS1wcmVmZXJlbmNlcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9QUkVGRVJFTkNFU19UQUJMRTogbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTm90aWZpY2F0aW9uIEhpc3RvcnkgQVBJIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldEhpc3RvcnlGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEhpc3RvcnlGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LWhpc3RvcnknLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2dldC1oaXN0b3J5JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX0hJU1RPUllfVEFCTEU6IG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXROb3RpZmljYXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LW5vdGlmaWNhdGlvbicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvZ2V0LW5vdGlmaWNhdGlvbicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9ISVNUT1JZX1RBQkxFOiBub3RpZmljYXRpb25IaXN0b3J5VGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBUZW1wbGF0ZSBBUEkgTGFtYmRhIEZ1bmN0aW9ucyAoQWRtaW4gT25seSlcclxuICAgIGNvbnN0IGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1jcmVhdGUtdGVtcGxhdGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2NyZWF0ZS10ZW1wbGF0ZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9URU1QTEFURVNfVEFCTEU6IG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlVGVtcGxhdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtdXBkYXRlLXRlbXBsYXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy91cGRhdGUtdGVtcGxhdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0VGVtcGxhdGVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRUZW1wbGF0ZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtZ2V0LXRlbXBsYXRlcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvZ2V0LXRlbXBsYXRlcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9URU1QTEFURVNfVEFCTEU6IG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBub3RpZmljYXRpb24gQVBJIGZ1bmN0aW9uc1xyXG4gICAgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldFByZWZlcmVuY2VzRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbik7XHJcbiAgICBub3RpZmljYXRpb25IaXN0b3J5VGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRIaXN0b3J5RnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZVRlbXBsYXRlRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRUZW1wbGF0ZXNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gU1FTIFF1ZXVlIGZvciBhc3luYyBwcm9jZXNzaW5nXHJcbiAgICBjb25zdCBwcm9jZXNzaW5nUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdQcm9jZXNzaW5nUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLXBsYXRmb3JtLXByb2Nlc3NpbmcnLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogbmV3IHNxcy5RdWV1ZSh0aGlzLCAnUHJvY2Vzc2luZ0RMUScsIHtcclxuICAgICAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLXBsYXRmb3JtLXByb2Nlc3NpbmctZGxxJyxcclxuICAgICAgICB9KSxcclxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTUVMgUXVldWUgZm9yIE1JU1JBIGFuYWx5c2lzIChSZXF1aXJlbWVudCAxMC41KVxyXG4gICAgY29uc3QgYW5hbHlzaXNRdWV1ZURMUSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0FuYWx5c2lzUXVldWVETFEnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLWFuYWx5c2lzLWRscScsXHJcbiAgICAgIHJldGVudGlvblBlcmlvZDogY2RrLkR1cmF0aW9uLmRheXMoMTQpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYW5hbHlzaXNRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0FuYWx5c2lzUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLWFuYWx5c2lzLXF1ZXVlJyxcclxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICByZWNlaXZlTWVzc2FnZVdhaXRUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksXHJcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xyXG4gICAgICAgIHF1ZXVlOiBhbmFseXNpc1F1ZXVlRExRLFxyXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNRUyBRdWV1ZSBmb3IgdGVzdCBleGVjdXRpb25cclxuICAgIGNvbnN0IHRlc3RFeGVjdXRpb25ETFEgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdUZXN0RXhlY3V0aW9uRExRJywge1xyXG4gICAgICBxdWV1ZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS10ZXN0LWV4ZWN1dGlvbi1kbHEnLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSwgLy8gS2VlcCBmYWlsZWQgbWVzc2FnZXMgZm9yIDE0IGRheXNcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHRlc3RFeGVjdXRpb25RdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ1Rlc3RFeGVjdXRpb25RdWV1ZScsIHtcclxuICAgICAgcXVldWVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tdGVzdC1leGVjdXRpb24nLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyBNYXRjaCBMYW1iZGEgdGltZW91dFxyXG4gICAgICByZWNlaXZlTWVzc2FnZVdhaXRUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksIC8vIExvbmcgcG9sbGluZ1xyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogdGVzdEV4ZWN1dGlvbkRMUSxcclxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsIC8vIFJldHJ5IHVwIHRvIDMgdGltZXMgYmVmb3JlIG1vdmluZyB0byBETFFcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlY3JldHMgTWFuYWdlciBmb3IgSldUIGtleXNcclxuICAgIGNvbnN0IGp3dFNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0pXVFNlY3JldCcsIHtcclxuICAgICAgc2VjcmV0TmFtZTogJ21pc3JhLXBsYXRmb3JtLWp3dC1zZWNyZXQnLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lOiAnand0JyB9KSxcclxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3NlY3JldCcsXHJcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBMYW1iZGEgQXV0aG9yaXplciBmb3IgSldUIHZlcmlmaWNhdGlvblxyXG4gICAgY29uc3QgYXV0aG9yaXplckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQXV0aG9yaXplckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hdXRob3JpemVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9hdXRob3JpemVyJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgSldUX1NFQ1JFVF9OQU1FOiBqd3RTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IFNlY3JldHMgTWFuYWdlciByZWFkIGFjY2VzcyB0byBhdXRob3JpemVyXHJcbiAgICBqd3RTZWNyZXQuZ3JhbnRSZWFkKGF1dGhvcml6ZXJGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgbG9naW5GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0xvZ2luRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWxvZ2luJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9sb2dpbicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgICAgTjhOX1dFQkhPT0tfVVJMOiBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkwgfHwgJycsXHJcbiAgICAgICAgTjhOX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZWdpc3RlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUmVnaXN0ZXJGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tcmVnaXN0ZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hdXRoL3JlZ2lzdGVyJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgSldUX1NFQ1JFVF9OQU1FOiBqd3RTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgICBOOE5fV0VCSE9PS19VUkw6IHByb2Nlc3MuZW52Lk44Tl9XRUJIT09LX1VSTCB8fCAnJyxcclxuICAgICAgICBOOE5fQVBJX0tFWTogcHJvY2Vzcy5lbnYuTjhOX0FQSV9LRVkgfHwgJycsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHJlZnJlc2hGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlZnJlc2hGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tcmVmcmVzaCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvcmVmcmVzaCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgVXBsb2FkIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGZpbGVVcGxvYWRGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0ZpbGVVcGxvYWRGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZmlsZS11cGxvYWQnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlL3VwbG9hZCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ2RldicsXHJcbiAgICAgICAgQU5BTFlTSVNfUVVFVUVfVVJMOiBhbmFseXNpc1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBsb2FkQ29tcGxldGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXBsb2FkLWNvbXBsZXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS91cGxvYWQtY29tcGxldGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQUk9DRVNTSU5HX1FVRVVFX1VSTDogcHJvY2Vzc2luZ1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICAgIEVOVklST05NRU5UOiAnZGV2JyxcclxuICAgICAgICBTVEFURV9NQUNISU5FX0FSTjogJycsIC8vIFdpbGwgYmUgc2V0IGFmdGVyIHdvcmtmbG93IGlzIGNyZWF0ZWRcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRGaWxlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0RmlsZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZ2V0LWZpbGVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS9nZXQtZmlsZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ2RldicsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNhbXBsZSBGaWxlIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0U2FtcGxlRmlsZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFNhbXBsZUZpbGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1zYW1wbGUtZmlsZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlL2dldC1zYW1wbGUtZmlsZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBTQU1QTEVfRklMRVNfVEFCTEU6IHNhbXBsZUZpbGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGxvYWRTYW1wbGVGaWxlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGxvYWRTYW1wbGVGaWxlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXVwbG9hZC1zYW1wbGUtZmlsZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvdXBsb2FkLXNhbXBsZS1maWxlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU0FNUExFX0ZJTEVTX1RBQkxFOiBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBVUExPQURfUFJPR1JFU1NfVEFCTEU6IHVwbG9hZFByb2dyZXNzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRVcGxvYWRQcm9ncmVzc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VXBsb2FkUHJvZ3Jlc3NGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZ2V0LXVwbG9hZC1wcm9ncmVzcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvZ2V0LXVwbG9hZC1wcm9ncmVzcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVQTE9BRF9QUk9HUkVTU19UQUJMRTogdXBsb2FkUHJvZ3Jlc3NUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDE1KSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGluaXRpYWxpemVTYW1wbGVMaWJyYXJ5RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdJbml0aWFsaXplU2FtcGxlTGlicmFyeUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1pbml0aWFsaXplLXNhbXBsZS1saWJyYXJ5JyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS9pbml0aWFsaXplLXNhbXBsZS1saWJyYXJ5JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU0FNUExFX0ZJTEVTX1RBQkxFOiBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFByb2plY3QgTWFuYWdlbWVudCBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBjcmVhdGVQcm9qZWN0RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVQcm9qZWN0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWNyZWF0ZS1wcm9qZWN0JyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvcHJvamVjdHMvY3JlYXRlLXByb2plY3QnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQUk9KRUNUU19UQUJMRV9OQU1FOiB0ZXN0UHJvamVjdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldFByb2plY3RzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRQcm9qZWN0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtcHJvamVjdHMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9wcm9qZWN0cy9nZXQtcHJvamVjdHMtbWluaW1hbCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFX05BTUU6IHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlUHJvamVjdEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlUHJvamVjdEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11cGRhdGUtcHJvamVjdCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Byb2plY3RzL3VwZGF0ZS1wcm9qZWN0JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUFJPSkVDVFNfVEFCTEVfTkFNRTogdGVzdFByb2plY3RzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUZXN0IFN1aXRlIE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY3JlYXRlVGVzdFN1aXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVUZXN0U3VpdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tY3JlYXRlLXRlc3Qtc3VpdGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LXN1aXRlcy9jcmVhdGUtc3VpdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRUZXN0U3VpdGVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRUZXN0U3VpdGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC10ZXN0LXN1aXRlcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3Qtc3VpdGVzL2dldC1zdWl0ZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZXN0U3VpdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVRlc3RTdWl0ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11cGRhdGUtdGVzdC1zdWl0ZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3Qtc3VpdGVzL3VwZGF0ZS1zdWl0ZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfU1VJVEVTX1RBQkxFX05BTUU6IHRlc3RTdWl0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRlc3QgQ2FzZSBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RDYXNlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdDcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1jcmVhdGUtdGVzdC1jYXNlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvdGVzdC1jYXNlcy9jcmVhdGUtdGVzdC1jYXNlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldFRlc3RDYXNlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VGVzdENhc2VzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC10ZXN0LWNhc2VzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvdGVzdC1jYXNlcy9nZXQtdGVzdC1jYXNlcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlVGVzdENhc2VGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXBkYXRlLXRlc3QtY2FzZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3QtY2FzZXMvdXBkYXRlLXRlc3QtY2FzZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9uc1xyXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobG9naW5GdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShyZWZyZXNoRnVuY3Rpb24pO1xyXG4gICAgand0U2VjcmV0LmdyYW50UmVhZChsb2dpbkZ1bmN0aW9uKTtcclxuICAgIGp3dFNlY3JldC5ncmFudFJlYWQocmVmcmVzaEZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgLy8gRmlsZSB1cGxvYWQgcGVybWlzc2lvbnNcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZFdyaXRlKGZpbGVVcGxvYWRGdW5jdGlvbik7XHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5ncmFudFJlYWQodXBsb2FkQ29tcGxldGVGdW5jdGlvbik7XHJcbiAgICBwcm9jZXNzaW5nUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXModXBsb2FkQ29tcGxldGVGdW5jdGlvbik7XHJcbiAgICBhbmFseXNpc1F1ZXVlLmdyYW50U2VuZE1lc3NhZ2VzKGZpbGVVcGxvYWRGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEZpbGUgbWV0YWRhdGEgcGVybWlzc2lvbnNcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShmaWxlVXBsb2FkRnVuY3Rpb24pO1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwbG9hZENvbXBsZXRlRnVuY3Rpb24pO1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRGaWxlc0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBTYW1wbGUgZmlsZSBwZXJtaXNzaW9uc1xyXG4gICAgc2FtcGxlRmlsZXNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldFNhbXBsZUZpbGVzRnVuY3Rpb24pO1xyXG4gICAgc2FtcGxlRmlsZXNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKHVwbG9hZFNhbXBsZUZpbGVGdW5jdGlvbik7XHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShpbml0aWFsaXplU2FtcGxlTGlicmFyeUZ1bmN0aW9uKTtcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZFdyaXRlKHVwbG9hZFNhbXBsZUZpbGVGdW5jdGlvbik7XHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBVcGxvYWQgcHJvZ3Jlc3MgcGVybWlzc2lvbnNcclxuICAgIHVwbG9hZFByb2dyZXNzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwbG9hZFNhbXBsZUZpbGVGdW5jdGlvbik7XHJcbiAgICB1cGxvYWRQcm9ncmVzc1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0VXBsb2FkUHJvZ3Jlc3NGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gUHJvamVjdCBtYW5hZ2VtZW50IHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0UHJvamVjdHNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlUHJvamVjdEZ1bmN0aW9uKTtcclxuICAgIHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0UHJvamVjdHNGdW5jdGlvbik7XHJcbiAgICB0ZXN0UHJvamVjdHNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBkYXRlUHJvamVjdEZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBUZXN0IHN1aXRlIG1hbmFnZW1lbnQgcGVybWlzc2lvbnNcclxuICAgIHRlc3RTdWl0ZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlVGVzdFN1aXRlRnVuY3Rpb24pO1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uKTtcclxuICAgIHRlc3RTdWl0ZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgY2FzZSBtYW5hZ2VtZW50IHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoY3JlYXRlVGVzdENhc2VGdW5jdGlvbik7XHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldFRlc3RDYXNlc0Z1bmN0aW9uKTtcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBBSSBUZXN0IEdlbmVyYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgYWlBbmFseXplRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUFuYWx5emVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtYWktYW5hbHl6ZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpLXRlc3QtZ2VuZXJhdGlvbi9hbmFseXplJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLy8gVGFzayAxMC4xOiBBZGQgQmVkcm9jayBjb25maWd1cmF0aW9uIGVudmlyb25tZW50IHZhcmlhYmxlc1xyXG4gICAgICAgIEFJX1BST1ZJREVSOiBwcm9jZXNzLmVudi5BSV9QUk9WSURFUiB8fCAnQkVEUk9DSycsXHJcbiAgICAgICAgQkVEUk9DS19SRUdJT046IHByb2Nlc3MuZW52LkJFRFJPQ0tfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgICAgIEJFRFJPQ0tfTU9ERUxfSUQ6IHByb2Nlc3MuZW52LkJFRFJPQ0tfTU9ERUxfSUQgfHwgJ2FudGhyb3BpYy5jbGF1ZGUtMy01LXNvbm5ldC0yMDI0MTAyMi12MjowJyxcclxuICAgICAgICBCRURST0NLX1RJTUVPVVQ6IHByb2Nlc3MuZW52LkJFRFJPQ0tfVElNRU9VVCB8fCAnMzAwMDAnLFxyXG4gICAgICAgIEVOQUJMRV9CRURST0NLX01PTklUT1JJTkc6IHByb2Nlc3MuZW52LkVOQUJMRV9CRURST0NLX01PTklUT1JJTkcgfHwgJ3RydWUnLFxyXG4gICAgICAgIC8vIFRhc2sgMTIuMTogQWRkIGNhbmFyeSBkZXBsb3ltZW50IHRyYWZmaWMgcGVyY2VudGFnZVxyXG4gICAgICAgIEJFRFJPQ0tfVFJBRkZJQ19QRVJDRU5UQUdFOiBwcm9jZXNzLmVudi5CRURST0NLX1RSQUZGSUNfUEVSQ0VOVEFHRSB8fCAnMCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLCAvLyBCcm93c2VyIGF1dG9tYXRpb24gY2FuIHRha2UgdGltZVxyXG4gICAgICBtZW1vcnlTaXplOiAyMDQ4LCAvLyBQdXBwZXRlZXIgbmVlZHMgbW9yZSBtZW1vcnlcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLCAvLyBUYXNrIDguMzogRW5hYmxlIFgtUmF5IHRyYWNpbmdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUdlbmVyYXRlVGVzdEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1haS1nZW5lcmF0ZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZW5lcmF0ZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEFJX1VTQUdFX1RBQkxFOiBhaVVzYWdlVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIE9QRU5BSV9BUElfS0VZOiBwcm9jZXNzLmVudi5PUEVOQUlfQVBJX0tFWSB8fCAnJyxcclxuICAgICAgICAvLyBUYXNrIDEwLjE6IEFkZCBCZWRyb2NrIGNvbmZpZ3VyYXRpb24gZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgICAgICAgQUlfUFJPVklERVI6IHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIHx8ICdCRURST0NLJyxcclxuICAgICAgICBCRURST0NLX1JFR0lPTjogcHJvY2Vzcy5lbnYuQkVEUk9DS19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogcHJvY2Vzcy5lbnYuQkVEUk9DS19NT0RFTF9JRCB8fCAnYW50aHJvcGljLmNsYXVkZS0zLTUtc29ubmV0LTIwMjQxMDIyLXYyOjAnLFxyXG4gICAgICAgIEJFRFJPQ0tfVElNRU9VVDogcHJvY2Vzcy5lbnYuQkVEUk9DS19USU1FT1VUIHx8ICczMDAwMCcsXHJcbiAgICAgICAgRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORzogcHJvY2Vzcy5lbnYuRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORyB8fCAndHJ1ZScsXHJcbiAgICAgICAgLy8gVGFzayAxMi4xOiBBZGQgY2FuYXJ5IGRlcGxveW1lbnQgdHJhZmZpYyBwZXJjZW50YWdlXHJcbiAgICAgICAgQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0U6IHByb2Nlc3MuZW52LkJFRFJPQ0tfVFJBRkZJQ19QRVJDRU5UQUdFIHx8ICcwJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMiksXHJcbiAgICAgIG1lbW9yeVNpemU6IDEwMjQsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSwgLy8gVGFzayA4LjM6IEVuYWJsZSBYLVJheSB0cmFjaW5nXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1haS1iYXRjaCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpLXRlc3QtZ2VuZXJhdGlvbi9iYXRjaCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEFJX1VTQUdFX1RBQkxFOiBhaVVzYWdlVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIE9QRU5BSV9BUElfS0VZOiBwcm9jZXNzLmVudi5PUEVOQUlfQVBJX0tFWSB8fCAnJyxcclxuICAgICAgICAvLyBUYXNrIDEwLjE6IEFkZCBCZWRyb2NrIGNvbmZpZ3VyYXRpb24gZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgICAgICAgQUlfUFJPVklERVI6IHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIHx8ICdCRURST0NLJyxcclxuICAgICAgICBCRURST0NLX1JFR0lPTjogcHJvY2Vzcy5lbnYuQkVEUk9DS19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogcHJvY2Vzcy5lbnYuQkVEUk9DS19NT0RFTF9JRCB8fCAnYW50aHJvcGljLmNsYXVkZS0zLTUtc29ubmV0LTIwMjQxMDIyLXYyOjAnLFxyXG4gICAgICAgIEJFRFJPQ0tfVElNRU9VVDogcHJvY2Vzcy5lbnYuQkVEUk9DS19USU1FT1VUIHx8ICczMDAwMCcsXHJcbiAgICAgICAgRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORzogcHJvY2Vzcy5lbnYuRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORyB8fCAndHJ1ZScsXHJcbiAgICAgICAgLy8gVGFzayAxMi4xOiBBZGQgY2FuYXJ5IGRlcGxveW1lbnQgdHJhZmZpYyBwZXJjZW50YWdlXHJcbiAgICAgICAgQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0U6IHByb2Nlc3MuZW52LkJFRFJPQ0tfVFJBRkZJQ19QRVJDRU5UQUdFIHx8ICcwJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyBCYXRjaCBwcm9jZXNzaW5nIGNhbiB0YWtlIGxvbmdlclxyXG4gICAgICBtZW1vcnlTaXplOiAyMDQ4LFxyXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsIC8vIFRhc2sgOC4zOiBFbmFibGUgWC1SYXkgdHJhY2luZ1xyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYWlHZXRVc2FnZVN0YXRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBSUdldFVzYWdlU3RhdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtYWktdXNhZ2UnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9haS10ZXN0LWdlbmVyYXRpb24vZ2V0LXVzYWdlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gQUkgdGVzdCBnZW5lcmF0aW9uIGZ1bmN0aW9uc1xyXG4gICAgYWlVc2FnZVRhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhaUdlbmVyYXRlVGVzdEZ1bmN0aW9uKTtcclxuICAgIGFpVXNhZ2VUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24pO1xyXG4gICAgYWlVc2FnZVRhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoYWlHZXRVc2FnZVN0YXRzRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uKTtcclxuICAgIC8vIEJhdGNoIDQgZnVuY3Rpb25zIHVzZSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IC0gbm8gSldUIHNlY3JldCBuZWVkZWRcclxuICAgIC8vIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24sIGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uLCBhaUdldFVzYWdlU3RhdHNGdW5jdGlvblxyXG5cclxuICAgIC8vIEFkZCBCZWRyb2NrIHBlcm1pc3Npb25zIHRvIEFJIExhbWJkYSBmdW5jdGlvbnMgKFRhc2sgNS4xKVxyXG4gICAgLy8gVXNpbmcgaW5mZXJlbmNlIHByb2ZpbGUgZm9yIENsYXVkZSBTb25uZXQgNC42IChjcm9zcy1yZWdpb24gcm91dGluZylcclxuICAgIGNvbnN0IGJlZHJvY2tQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogWydiZWRyb2NrOkludm9rZU1vZGVsJ10sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICdhcm46YXdzOmJlZHJvY2s6KjoqOmluZmVyZW5jZS1wcm9maWxlL3VzLmFudGhyb3BpYy5jbGF1ZGUtc29ubmV0LTQtNicsXHJcbiAgICAgIF0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBhaUFuYWx5emVGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3koYmVkcm9ja1BvbGljeSk7XHJcbiAgICBhaUdlbmVyYXRlVGVzdEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShiZWRyb2NrUG9saWN5KTtcclxuICAgIGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShiZWRyb2NrUG9saWN5KTtcclxuXHJcbiAgICAvLyBUYXNrIDUuMjogTm8gQkVEUk9DS19BUElfS0VZIGVudmlyb25tZW50IHZhcmlhYmxlIGlzIHVzZWRcclxuICAgIC8vIFRoZSBCZWRyb2NrUnVudGltZUNsaWVudCB1c2VzIEFXUyBTREsgZGVmYXVsdCBjcmVkZW50aWFsIHByb3ZpZGVyIChJQU0gcm9sZXMpXHJcbiAgICBcclxuICAgIC8vIFRhc2sgNS4zOiBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnMgYXJlIGF1dG9tYXRpY2FsbHkgYWRkZWQgYnkgQ0RLXHJcbiAgICAvLyBDREsgZ3JhbnRzIGxvZ3M6Q3JlYXRlTG9nR3JvdXAsIGxvZ3M6Q3JlYXRlTG9nU3RyZWFtLCBhbmQgbG9nczpQdXRMb2dFdmVudHNcclxuICAgIC8vIHRvIGFsbCBMYW1iZGEgZnVuY3Rpb25zIGJ5IGRlZmF1bHQgdGhyb3VnaCB0aGUgTGFtYmRhIGV4ZWN1dGlvbiByb2xlXHJcblxyXG4gICAgLy8gVGFzayA4LjI6IENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgQmVkcm9jayBtb25pdG9yaW5nXHJcbiAgICAvLyBBZGQgQ2xvdWRXYXRjaCBQdXRNZXRyaWNEYXRhIHBlcm1pc3Npb24gZm9yIEJlZHJvY2sgbW9uaXRvcmluZ1xyXG4gICAgY29uc3QgY2xvdWRXYXRjaE1ldHJpY3NQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogWydjbG91ZHdhdGNoOlB1dE1ldHJpY0RhdGEnXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFpQW5hbHl6ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShjbG91ZFdhdGNoTWV0cmljc1BvbGljeSk7XHJcbiAgICBhaUdlbmVyYXRlVGVzdEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShjbG91ZFdhdGNoTWV0cmljc1BvbGljeSk7XHJcbiAgICBhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3koY2xvdWRXYXRjaE1ldHJpY3NQb2xpY3kpO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggQWxhcm06IEhpZ2ggRXJyb3IgUmF0ZSAoPjEwIGVycm9ycyBpbiA1IG1pbnV0ZXMpXHJcbiAgICBjb25zdCBiZWRyb2NrRXJyb3JBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdCZWRyb2NrSGlnaEVycm9yUmF0ZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdBSUJUUy1CZWRyb2NrLUhpZ2hFcnJvclJhdGUnLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnQgd2hlbiBCZWRyb2NrIGVycm9yIHJhdGUgZXhjZWVkcyAxMCBlcnJvcnMgaW4gNSBtaW51dGVzJyxcclxuICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL0JlZHJvY2snLFxyXG4gICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrRXJyb3JzJyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggQWxhcm06IEhpZ2ggTGF0ZW5jeSAoPjMwIHNlY29uZHMgYXZlcmFnZSlcclxuICAgIGNvbnN0IGJlZHJvY2tMYXRlbmN5QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQmVkcm9ja0hpZ2hMYXRlbmN5QWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ0FJQlRTLUJlZHJvY2stSGlnaExhdGVuY3knLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnQgd2hlbiBCZWRyb2NrIGF2ZXJhZ2UgbGF0ZW5jeSBleGNlZWRzIDMwIHNlY29uZHMnLFxyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tMYXRlbmN5JyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAzMDAwMCwgLy8gMzAgc2Vjb25kcyBpbiBtaWxsaXNlY29uZHNcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIEFsYXJtOiBIaWdoIENvc3QgKD4kMTAwL2RheSlcclxuICAgIC8vIE5vdGU6IFRoaXMgYWxhcm0gY2hlY2tzIGlmIGNvc3QgZXhjZWVkcyAkMTAwIGluIGEgMjQtaG91ciBwZXJpb2RcclxuICAgIGNvbnN0IGJlZHJvY2tDb3N0QWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQmVkcm9ja0hpZ2hDb3N0QWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ0FJQlRTLUJlZHJvY2stSGlnaENvc3QnLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnQgd2hlbiBCZWRyb2NrIGNvc3QgZXhjZWVkcyAkMTAwIHBlciBkYXknLFxyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tDb3N0JyxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogMTAwLCAvLyAkMTAwXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGFsYXJtIEFSTnMgZm9yIFNOUyB0b3BpYyBzdWJzY3JpcHRpb24gKG9wdGlvbmFsKVxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JlZHJvY2tFcnJvckFsYXJtQXJuJywge1xyXG4gICAgICB2YWx1ZTogYmVkcm9ja0Vycm9yQWxhcm0uYWxhcm1Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmVkcm9jayBIaWdoIEVycm9yIFJhdGUgQWxhcm0gQVJOJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCZWRyb2NrTGF0ZW5jeUFsYXJtQXJuJywge1xyXG4gICAgICB2YWx1ZTogYmVkcm9ja0xhdGVuY3lBbGFybS5hbGFybUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdCZWRyb2NrIEhpZ2ggTGF0ZW5jeSBBbGFybSBBUk4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JlZHJvY2tDb3N0QWxhcm1Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBiZWRyb2NrQ29zdEFsYXJtLmFsYXJtQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0JlZHJvY2sgSGlnaCBDb3N0IEFsYXJtIEFSTicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUYXNrIDEyOiBDcmVhdGUgQ2xvdWRXYXRjaCBEYXNoYm9hcmQgZm9yIEJlZHJvY2sgdnMgT3BlbkFJIGNvbXBhcmlzb25cclxuICAgIGNvbnN0IGJlZHJvY2tEYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ0JlZHJvY2tNaWdyYXRpb25EYXNoYm9hcmQnLCB7XHJcbiAgICAgIGRhc2hib2FyZE5hbWU6ICdBSUJUUy1CZWRyb2NrLU1pZ3JhdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgd2lkZ2V0cyB0byBjb21wYXJlIEJlZHJvY2sgdnMgT3BlbkFJIG1ldHJpY3NcclxuICAgIGJlZHJvY2tEYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgLy8gUm93IDE6IExhdGVuY3kgQ29tcGFyaXNvblxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBSSBQcm92aWRlciBMYXRlbmN5IENvbXBhcmlzb24nLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL0JlZHJvY2snLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0xhdGVuY3knLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIEF2ZyBMYXRlbmN5JyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSUxhdGVuY3knLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdPcGVuQUkgQXZnIExhdGVuY3knLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICAvLyBSb3cgMTogRXJyb3IgUmF0ZSBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIEVycm9yIFJhdGUgQ29tcGFyaXNvbicsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrRXJyb3JzJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIEVycm9ycycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL09wZW5BSScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdPcGVuQUlFcnJvcnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ09wZW5BSSBFcnJvcnMnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGJlZHJvY2tEYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgLy8gUm93IDI6IENvc3QgQ29tcGFyaXNvblxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBSSBQcm92aWRlciBDb3N0IENvbXBhcmlzb24gKDI0aCknLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL0JlZHJvY2snLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0Nvc3QnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygyNCksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnQmVkcm9jayBDb3N0JyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSUNvc3QnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygyNCksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIENvc3QnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICAvLyBSb3cgMjogVG9rZW4gVXNhZ2UgQ29tcGFyaXNvblxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBSSBQcm92aWRlciBUb2tlbiBVc2FnZScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrVG9rZW5zJyxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIFRva2VucycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL09wZW5BSScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdPcGVuQUlUb2tlbnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ09wZW5BSSBUb2tlbnMnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIGJlZHJvY2tEYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgLy8gUm93IDM6IFJlcXVlc3QgQ291bnRcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQUkgUHJvdmlkZXIgUmVxdWVzdCBDb3VudCcsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrUmVxdWVzdHMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgUmVxdWVzdHMnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnT3BlbkFJUmVxdWVzdHMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ09wZW5BSSBSZXF1ZXN0cycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJvdyAzOiBUcmFmZmljIERpc3RyaWJ1dGlvbiAoQ2FuYXJ5KVxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5TaW5nbGVWYWx1ZVdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdCZWRyb2NrIFRyYWZmaWMgUGVyY2VudGFnZScsXHJcbiAgICAgICAgbWV0cmljczogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgICAgICBleHByZXNzaW9uOiAnKGJlZHJvY2sgLyAoYmVkcm9jayArIG9wZW5haSkpICogMTAwJyxcclxuICAgICAgICAgICAgdXNpbmdNZXRyaWNzOiB7XHJcbiAgICAgICAgICAgICAgYmVkcm9jazogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL0JlZHJvY2snLFxyXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgICAgb3BlbmFpOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgICAgIG1ldHJpY05hbWU6ICdPcGVuQUlSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGxhYmVsOiAnQmVkcm9jayBUcmFmZmljICUnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIE91dHB1dCBkYXNoYm9hcmQgVVJMXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmVkcm9ja0Rhc2hib2FyZFVSTCcsIHtcclxuICAgICAgdmFsdWU6IGBodHRwczovL2NvbnNvbGUuYXdzLmFtYXpvbi5jb20vY2xvdWR3YXRjaC9ob21lP3JlZ2lvbj0ke3RoaXMucmVnaW9ufSNkYXNoYm9hcmRzOm5hbWU9JHtiZWRyb2NrRGFzaGJvYXJkLmRhc2hib2FyZE5hbWV9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgQmVkcm9jayBNaWdyYXRpb24gTW9uaXRvcmluZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCB0ZXN0RXhlY3V0b3JGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Rlc3RFeGVjdXRvckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS10ZXN0LWV4ZWN1dG9yJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9leGVjdXRvcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBTQ1JFRU5TSE9UU19CVUNLRVRfTkFNRTogc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSwgLy8gTWF4aW11bSBMYW1iZGEgdGltZW91dFxyXG4gICAgICBtZW1vcnlTaXplOiAyMDQ4LCAvLyBJbmNyZWFzZWQgbWVtb3J5IGZvciBicm93c2VyIGF1dG9tYXRpb25cclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHRlc3QgZXhlY3V0b3IgcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHRlc3RFeGVjdXRvckZ1bmN0aW9uKTtcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEodGVzdEV4ZWN1dG9yRnVuY3Rpb24pO1xyXG4gICAgc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmdyYW50UmVhZFdyaXRlKHRlc3RFeGVjdXRvckZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBHcmFudCBFdmVudEJyaWRnZSBwZXJtaXNzaW9ucyB0byB0ZXN0IGV4ZWN1dG9yIGZvciBwdWJsaXNoaW5nIGV2ZW50c1xyXG4gICAgLy8gdGVzdEV4ZWN1dG9yRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgIC8vICAgYWN0aW9uczogWydldmVudHM6UHV0RXZlbnRzJ10sXHJcbiAgICAvLyAgIHJlc291cmNlczogWycqJ10sIC8vIEV2ZW50QnJpZGdlIGRlZmF1bHQgYnVzXHJcbiAgICAvLyB9KSk7XHJcblxyXG4gICAgLy8gQWRkIFNRUyB0cmlnZ2VyIGZvciB0ZXN0IGV4ZWN1dG9yXHJcbiAgICB0ZXN0RXhlY3V0b3JGdW5jdGlvbi5hZGRFdmVudFNvdXJjZShcclxuICAgICAgbmV3IGxhbWJkYUV2ZW50U291cmNlcy5TcXNFdmVudFNvdXJjZSh0ZXN0RXhlY3V0aW9uUXVldWUsIHtcclxuICAgICAgICBiYXRjaFNpemU6IDEsIC8vIFByb2Nlc3Mgb25lIHRlc3QgYXQgYSB0aW1lXHJcbiAgICAgICAgbWF4QmF0Y2hpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLCAvLyBObyBiYXRjaGluZyBkZWxheVxyXG4gICAgICAgIHJlcG9ydEJhdGNoSXRlbUZhaWx1cmVzOiB0cnVlLCAvLyBFbmFibGUgcGFydGlhbCBiYXRjaCByZXNwb25zZXNcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gVGVzdCBFeGVjdXRpb24gVHJpZ2dlciBMYW1iZGFcclxuICAgIGNvbnN0IHRyaWdnZXJFeGVjdXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1RyaWdnZXJFeGVjdXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdHJpZ2dlci1leGVjdXRpb24nLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9leGVjdXRpb25zL3RyaWdnZXInKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEVfTkFNRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9TVUlURVNfVEFCTEVfTkFNRTogdGVzdFN1aXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX0VYRUNVVElPTl9RVUVVRV9VUkw6IHRlc3RFeGVjdXRpb25RdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgdHJpZ2dlciBmdW5jdGlvbiBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKTtcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEodHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKTtcclxuICAgIHRlc3RTdWl0ZXNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKHRyaWdnZXJFeGVjdXRpb25GdW5jdGlvbik7XHJcbiAgICB0ZXN0RXhlY3V0aW9uUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXModHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbiBTdGF0dXMgTGFtYmRhXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25TdGF0dXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtZXhlY3V0aW9uLXN0YXR1cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvZ2V0LXN0YXR1cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgc3RhdHVzIGZ1bmN0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIFJlc3VsdHMgTGFtYmRhXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1leGVjdXRpb24tcmVzdWx0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvZ2V0LXJlc3VsdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEVfTkFNRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgU0NSRUVOU0hPVFNfQlVDS0VUX05BTUU6IHNjcmVlbnNob3RzQnVja2V0LmJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCByZXN1bHRzIGZ1bmN0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0RXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uKTtcclxuICAgIHNjcmVlbnNob3RzQnVja2V0LmJ1Y2tldC5ncmFudFJlYWQoZ2V0RXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbiBIaXN0b3J5IExhbWJkYVxyXG4gICAgY29uc3QgZ2V0RXhlY3V0aW9uSGlzdG9yeUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0RXhlY3V0aW9uSGlzdG9yeUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtZXhlY3V0aW9uLWhpc3RvcnknLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9leGVjdXRpb25zL2dldC1oaXN0b3J5JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBoaXN0b3J5IGZ1bmN0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0RXhlY3V0aW9uSGlzdG9yeUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBUZXN0IFN1aXRlIFJlc3VsdHMgTGFtYmRhXHJcbiAgICBjb25zdCBnZXRTdWl0ZVJlc3VsdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFN1aXRlUmVzdWx0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtc3VpdGUtcmVzdWx0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvZ2V0LXN1aXRlLXJlc3VsdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEVfTkFNRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHN1aXRlIHJlc3VsdHMgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRTdWl0ZVJlc3VsdHNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gUzMgZXZlbnQgbm90aWZpY2F0aW9uIGZvciB1cGxvYWQgY29tcGxldGlvblxyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuYWRkRXZlbnROb3RpZmljYXRpb24oXHJcbiAgICAgIHMzLkV2ZW50VHlwZS5PQkpFQ1RfQ1JFQVRFRCxcclxuICAgICAgbmV3IHMzbi5MYW1iZGFEZXN0aW5hdGlvbih1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKSxcclxuICAgICAgeyBwcmVmaXg6ICd1cGxvYWRzLycgfVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyBhbmQgTm90aWZpY2F0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGFuYWx5c2lzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBbmFseXNpc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL2FuYWx5emUtZmlsZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFOiBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEFOQUxZU0lTX0NBQ0hFX1RBQkxFOiBhbmFseXNpc0NhY2hlVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSwgLy8gUmVxdWlyZW1lbnQgMTAuNjogU2V0IHRpbWVvdXQgdG8gNSBtaW51dGVzXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsIC8vIFJlcXVpcmVtZW50IDEwLjQ6IFNldCBtZW1vcnkgdG8gMkdCIGZvciBBU1QgcGFyc2luZ1xyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTm90aWZpY2F0aW9uIFByb2Nlc3NvciBMYW1iZGEgRnVuY3Rpb25cclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbi1wcm9jZXNzb3InLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL3Byb2Nlc3NvcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9QUkVGRVJFTkNFU19UQUJMRTogbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1RFTVBMQVRFU19UQUJMRTogbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIE5PVElGSUNBVElPTl9ISVNUT1JZX1RBQkxFOiBub3RpZmljYXRpb25IaXN0b3J5VGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFNOU19UT1BJQ19BUk5fRU1BSUw6IGVtYWlsTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgICAgU05TX1RPUElDX0FSTl9TTVM6IHNtc05vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxyXG4gICAgICAgIFNOU19UT1BJQ19BUk5fV0VCSE9PSzogd2ViaG9va05vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxyXG4gICAgICAgIE44Tl9FTkFCTEVEOiBwcm9jZXNzLmVudi5OOE5fRU5BQkxFRCB8fCAnZmFsc2UnLFxyXG4gICAgICAgIE44Tl9XRUJIT09LX1VSTDogcHJvY2Vzcy5lbnYuTjhOX1dFQkhPT0tfVVJMIHx8ICcnLFxyXG4gICAgICAgIE44Tl9BUElfS0VZOiBwcm9jZXNzLmVudi5OOE5fQVBJX0tFWSB8fCAnJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgU1FTIHRyaWdnZXIgZm9yIG5vdGlmaWNhdGlvbiBwcm9jZXNzb3JcclxuICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLmFkZEV2ZW50U291cmNlKFxyXG4gICAgICBuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlNxc0V2ZW50U291cmNlKG5vdGlmaWNhdGlvblF1ZXVlLCB7XHJcbiAgICAgICAgYmF0Y2hTaXplOiAxLCAvLyBQcm9jZXNzIDEgbWVzc2FnZSBhdCBhIHRpbWUgdG8gYXZvaWQgY29uY3VycmVuY3kgaXNzdWVzXHJcbiAgICAgICAgbWF4QmF0Y2hpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBub3RpZmljYXRpb24gcHJvY2Vzc29yXHJcbiAgICBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5ncmFudFB1Ymxpc2gobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgc21zTm90aWZpY2F0aW9uVG9waWMuZ3JhbnRQdWJsaXNoKG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uKTtcclxuICAgIHdlYmhvb2tOb3RpZmljYXRpb25Ub3BpYy5ncmFudFB1Ymxpc2gobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlbXBsYXRlIFNlZWRpbmcgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCBzZWVkVGVtcGxhdGVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTZWVkVGVtcGxhdGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLXNlZWQtdGVtcGxhdGVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9zZWVkLXRlbXBsYXRlcycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9URU1QTEFURVNfVEFCTEU6IG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBzZWVkIHRlbXBsYXRlcyBmdW5jdGlvblxyXG4gICAgbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHNlZWRUZW1wbGF0ZXNGdW5jdGlvbik7XHJcblxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOb3RpZmljYXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tbm90aWZpY2F0aW9uJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUlubGluZShgXHJcbiAgICAgICAgZXhwb3J0cy5oYW5kbGVyID0gYXN5bmMgKGV2ZW50KSA9PiB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZygnTm90aWZpY2F0aW9uIGZ1bmN0aW9uIGludm9rZWQ6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQpKTtcclxuICAgICAgICAgIC8vIFBsYWNlaG9sZGVyIGZvciBub3RpZmljYXRpb24gbG9naWMgKGVtYWlsLCB3ZWJob29rLCBldGMuKVxyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnTm90aWZpY2F0aW9uIHNlbnQgc3VjY2Vzc2Z1bGx5J1xyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9O1xyXG4gICAgICBgKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgZm9yIGFuYWx5c2lzIGFuZCBub3RpZmljYXRpb24gZnVuY3Rpb25zXHJcbiAgICBhbmFseXNlc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXNpc0Z1bmN0aW9uKTtcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXNpc0Z1bmN0aW9uKTtcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZChhbmFseXNpc0Z1bmN0aW9uKTsgLy8gUmVxdWlyZW1lbnQgMTAuNDogR3JhbnQgUzMgcmVhZCBwZXJtaXNzaW9uc1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pOyAvLyBSZXF1aXJlbWVudCAxMC40OiBHcmFudCBEeW5hbW9EQiByZWFkL3dyaXRlIHBlcm1pc3Npb25zXHJcbiAgICBhbmFseXNpc0NhY2hlVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pOyAvLyBSZXF1aXJlbWVudCAxMC43OiBHcmFudCBjYWNoZSB0YWJsZSBwZXJtaXNzaW9uc1xyXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWREYXRhKG5vdGlmaWNhdGlvbkZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBSZXF1aXJlbWVudCAxMC40OiBDb25uZWN0IGFuYWx5c2lzIExhbWJkYSB0byBTUVMgcXVldWVcclxuICAgIGFuYWx5c2lzRnVuY3Rpb24uYWRkRXZlbnRTb3VyY2UoXHJcbiAgICAgIG5ldyBsYW1iZGFFdmVudFNvdXJjZXMuU3FzRXZlbnRTb3VyY2UoYW5hbHlzaXNRdWV1ZSwge1xyXG4gICAgICAgIGJhdGNoU2l6ZTogMSwgLy8gUHJvY2VzcyBvbmUgYW5hbHlzaXMgYXQgYSB0aW1lXHJcbiAgICAgICAgbWF4QmF0Y2hpbmdXaW5kb3c6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLCAvLyBObyBiYXRjaGluZyBkZWxheVxyXG4gICAgICAgIHJlcG9ydEJhdGNoSXRlbUZhaWx1cmVzOiB0cnVlLCAvLyBFbmFibGUgcGFydGlhbCBiYXRjaCByZXNwb25zZXNcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gUXVlcnkgUmVzdWx0cyBMYW1iZGEgRnVuY3Rpb25cclxuICAgIGNvbnN0IHF1ZXJ5UmVzdWx0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUXVlcnlSZXN1bHRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXF1ZXJ5LXJlc3VsdHMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hbmFseXNpcy9xdWVyeS1yZXN1bHRzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHRoaXMuc3RhY2tOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVc2VyIFN0YXRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgdXNlclN0YXRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVc2VyU3RhdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXNlci1zdGF0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL2dldC11c2VyLXN0YXRzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHRoaXMuc3RhY2tOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBxdWVyeSBhbmQgc3RhdHMgZnVuY3Rpb25zIGFjY2VzcyB0byBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKHF1ZXJ5UmVzdWx0c0Z1bmN0aW9uKTtcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEodXNlclN0YXRzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIFN0YXR1cyBMYW1iZGEgRnVuY3Rpb24gKFRhc2sgNS4yKVxyXG4gICAgY29uc3QgYW5hbHlzaXNTdGF0dXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FuYWx5c2lzU3RhdHVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLXN0YXR1cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL3N0YXR1cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgYW5hbHlzaXMgc3RhdHVzIGZ1bmN0aW9uIGFjY2VzcyB0byBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGFuYWx5c2lzU3RhdHVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFJIEluc2lnaHRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgYWlJbnNpZ2h0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlJbnNpZ2h0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1haS1pbnNpZ2h0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpL2dlbmVyYXRlLWluc2lnaHRzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHRoaXMuc3RhY2tOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IEFJIGluc2lnaHRzIGZ1bmN0aW9uIGFjY2VzcyB0byBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGFpSW5zaWdodHNGdW5jdGlvbik7XHJcbiAgICAvLyBhaUluc2lnaHRzRnVuY3Rpb24gdXNlcyBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IC0gbm8gSldUIHNlY3JldCBuZWVkZWRcclxuXHJcbiAgICAvLyBDcmVhdGUgU3RlcCBGdW5jdGlvbnMgd29ya2Zsb3cgZm9yIGFuYWx5c2lzIG9yY2hlc3RyYXRpb25cclxuICAgIGNvbnN0IHdvcmtmbG93ID0gbmV3IEFuYWx5c2lzV29ya2Zsb3codGhpcywgJ0FuYWx5c2lzV29ya2Zsb3cnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiB0aGlzLnN0YWNrTmFtZSxcclxuICAgICAgYW5hbHlzaXNGdW5jdGlvbixcclxuICAgICAgbm90aWZpY2F0aW9uRnVuY3Rpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBVcGRhdGUgdXBsb2FkLWNvbXBsZXRlIGZ1bmN0aW9uIHdpdGggd29ya2Zsb3cgQVJOXHJcbiAgICB1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uLmFkZEVudmlyb25tZW50KCdTVEFURV9NQUNISU5FX0FSTicsIHdvcmtmbG93LnN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCB1cGxvYWQtY29tcGxldGUgZnVuY3Rpb24gcGVybWlzc2lvbiB0byBzdGFydCB3b3JrZmxvdyBleGVjdXRpb25zXHJcbiAgICB3b3JrZmxvdy5zdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSB3aXRoIGN1c3RvbSBkb21haW5cclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgJ01pc3JhUGxhdGZvcm1BcGknLCB7XHJcbiAgICAgIGFwaU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIFJFU1QgQVBJJyxcclxuICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkdFVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUE9TVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUFVULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBjdXN0b20gZG9tYWluIGZvciBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgYXBpRG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ0FwaUN1c3RvbURvbWFpbicsIHtcclxuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluLFxyXG4gICAgICBjZXJ0aWZpY2F0ZTogYXBpQ2VydGlmaWNhdGUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNYXAgdGhlIGN1c3RvbSBkb21haW4gdG8gdGhlIEFQSSBHYXRld2F5IHN0YWdlXHJcbiAgICBuZXcgYXBpZ2F0ZXdheS5BcGlNYXBwaW5nKHRoaXMsICdBcGlNYXBwaW5nJywge1xyXG4gICAgICBhcGk6IGFwaSxcclxuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluTmFtZSxcclxuICAgICAgc3RhZ2U6IGFwaS5kZWZhdWx0U3RhZ2UhLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFJvdXRlNTMgQSByZWNvcmQgZm9yIEFQSSBkb21haW5cclxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FwaUFsaWFzUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBhcGlEb21haW4sXHJcbiAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxyXG4gICAgICAgIG5ldyByb3V0ZTUzdGFyZ2V0cy5BcGlHYXRld2F5djJEb21haW5Qcm9wZXJ0aWVzKFxyXG4gICAgICAgICAgYXBpRG9tYWluTmFtZS5yZWdpb25hbERvbWFpbk5hbWUsXHJcbiAgICAgICAgICBhcGlEb21haW5OYW1lLnJlZ2lvbmFsSG9zdGVkWm9uZUlkXHJcbiAgICAgICAgKVxyXG4gICAgICApLFxyXG4gICAgICBjb21tZW50OiAnQVBJIEdhdGV3YXkgY3VzdG9tIGRvbWFpbiBmb3IgTUlTUkEgUGxhdGZvcm0gQVBJJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBIVFRQIEFQSSBMYW1iZGEgQXV0aG9yaXplciBmb3IgSldUIHZlcmlmaWNhdGlvblxyXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhdXRob3JpemVycy5IdHRwTGFtYmRhQXV0aG9yaXplcignSldUQXV0aG9yaXplcicsIGF1dGhvcml6ZXJGdW5jdGlvbiwge1xyXG4gICAgICBhdXRob3JpemVyTmFtZTogJ2p3dC1hdXRob3JpemVyJyxcclxuICAgICAgaWRlbnRpdHlTb3VyY2U6IFsnJHJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nXSxcclxuICAgICAgcmVzcG9uc2VUeXBlczogW2F1dGhvcml6ZXJzLkh0dHBMYW1iZGFSZXNwb25zZVR5cGUuU0lNUExFXSxcclxuICAgICAgcmVzdWx0c0NhY2hlVHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLCAvLyA1IG1pbnV0ZXNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhdXRoZW50aWNhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvbG9naW4nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0xvZ2luSW50ZWdyYXRpb24nLCBsb2dpbkZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9yZWdpc3RlcicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVnaXN0ZXJJbnRlZ3JhdGlvbicsIHJlZ2lzdGVyRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZnJlc2gnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlZnJlc2hJbnRlZ3JhdGlvbicsIHJlZnJlc2hGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBmaWxlIHVwbG9hZCByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2ZpbGVzL3VwbG9hZCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmlsZVVwbG9hZEludGVncmF0aW9uJywgZmlsZVVwbG9hZEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RmlsZXNJbnRlZ3JhdGlvbicsIGdldEZpbGVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgc2FtcGxlIGZpbGUgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcy9zYW1wbGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFNhbXBsZUZpbGVzSW50ZWdyYXRpb24nLCBnZXRTYW1wbGVGaWxlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkLXNhbXBsZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBsb2FkU2FtcGxlRmlsZUludGVncmF0aW9uJywgdXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkLXByb2dyZXNzL3tmaWxlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFVwbG9hZFByb2dyZXNzSW50ZWdyYXRpb24nLCBnZXRVcGxvYWRQcm9ncmVzc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvaW5pdGlhbGl6ZS1zYW1wbGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdJbml0aWFsaXplU2FtcGxlTGlicmFyeUludGVncmF0aW9uJywgaW5pdGlhbGl6ZVNhbXBsZUxpYnJhcnlGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhbmFseXNpcyBxdWVyeSByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3F1ZXJ5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1F1ZXJ5UmVzdWx0c0ludGVncmF0aW9uJywgcXVlcnlSZXN1bHRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgdXNlciBzdGF0cyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3N0YXRzL3t1c2VySWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VzZXJTdGF0c0ludGVncmF0aW9uJywgdXNlclN0YXRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYW5hbHlzaXMgc3RhdHVzIHJvdXRlIChUYXNrIDUuMilcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3thbmFseXNpc0lkfS9zdGF0dXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQW5hbHlzaXNTdGF0dXNJbnRlZ3JhdGlvbicsIGFuYWx5c2lzU3RhdHVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgQUkgaW5zaWdodHMgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9haS9pbnNpZ2h0cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQUlJbnNpZ2h0c0ludGVncmF0aW9uJywgYWlJbnNpZ2h0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHByb2plY3QgbWFuYWdlbWVudCByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVQcm9qZWN0SW50ZWdyYXRpb24nLCBjcmVhdGVQcm9qZWN0RnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9wcm9qZWN0cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRQcm9qZWN0c0ludGVncmF0aW9uJywgZ2V0UHJvamVjdHNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzL3twcm9qZWN0SWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVByb2plY3RJbnRlZ3JhdGlvbicsIHVwZGF0ZVByb2plY3RGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB0ZXN0IHN1aXRlIG1hbmFnZW1lbnQgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LXN1aXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVzdFN1aXRlSW50ZWdyYXRpb24nLCBjcmVhdGVUZXN0U3VpdGVGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFRlc3RTdWl0ZXNJbnRlZ3JhdGlvbicsIGdldFRlc3RTdWl0ZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzL3tzdWl0ZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVUZXN0U3VpdGVJbnRlZ3JhdGlvbicsIHVwZGF0ZVRlc3RTdWl0ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRlc3QgY2FzZSBtYW5hZ2VtZW50IHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1jYXNlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVzdENhc2VJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlc3RDYXNlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFRlc3RDYXNlc0ludGVncmF0aW9uJywgZ2V0VGVzdENhc2VzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzL3t0ZXN0Q2FzZUlkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUFVUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVUZXN0Q2FzZUludGVncmF0aW9uJywgdXBkYXRlVGVzdENhc2VGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB0ZXN0IGV4ZWN1dGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvdHJpZ2dlcicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVHJpZ2dlckV4ZWN1dGlvbkludGVncmF0aW9uJywgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy97ZXhlY3V0aW9uSWR9L3N0YXR1cycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRFeGVjdXRpb25TdGF0dXNJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy97ZXhlY3V0aW9uSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvblJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvaGlzdG9yeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRFeGVjdXRpb25IaXN0b3J5SW50ZWdyYXRpb24nLCBnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3N1aXRlcy97c3VpdGVFeGVjdXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0U3VpdGVSZXN1bHRzSW50ZWdyYXRpb24nLCBnZXRTdWl0ZVJlc3VsdHNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBub3RpZmljYXRpb24gcHJlZmVyZW5jZXMgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3ByZWZlcmVuY2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByZWZlcmVuY2VzSW50ZWdyYXRpb24nLCBnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy9wcmVmZXJlbmNlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlUHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgbm90aWZpY2F0aW9uIGhpc3Rvcnkgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL2hpc3RvcnknLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0SGlzdG9yeUludGVncmF0aW9uJywgZ2V0SGlzdG9yeUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy9oaXN0b3J5L3tub3RpZmljYXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0Tm90aWZpY2F0aW9uSW50ZWdyYXRpb24nLCBnZXROb3RpZmljYXRpb25GdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBub3RpZmljYXRpb24gdGVtcGxhdGUgcm91dGVzIChhZG1pbiBvbmx5KVxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy90ZW1wbGF0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVRlbXBsYXRlSW50ZWdyYXRpb24nLCBjcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy90ZW1wbGF0ZXMve3RlbXBsYXRlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlbXBsYXRlSW50ZWdyYXRpb24nLCB1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvbm90aWZpY2F0aW9ucy90ZW1wbGF0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVtcGxhdGVzSW50ZWdyYXRpb24nLCBnZXRUZW1wbGF0ZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBBSSB0ZXN0IGdlbmVyYXRpb24gcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9haS10ZXN0LWdlbmVyYXRpb24vYW5hbHl6ZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQUlBbmFseXplSW50ZWdyYXRpb24nLCBhaUFuYWx5emVGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZW5lcmF0ZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQUlHZW5lcmF0ZVRlc3RJbnRlZ3JhdGlvbicsIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9haS10ZXN0LWdlbmVyYXRpb24vYmF0Y2gnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0FJQmF0Y2hHZW5lcmF0ZUludGVncmF0aW9uJywgYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9haS10ZXN0LWdlbmVyYXRpb24vdXNhZ2UnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQUlHZXRVc2FnZVN0YXRzSW50ZWdyYXRpb24nLCBhaUdldFVzYWdlU3RhdHNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBpbXBvcnRhbnQgdmFsdWVzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgZm9yIGZpbGUgc3RvcmFnZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogZnJvbnRlbmRCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgZm9yIGZyb250ZW5kIGhvc3RpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb25Eb21haW4nLCB7XHJcbiAgICAgIHZhbHVlOiBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBkb21haW4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Zyb250ZW5kQ3VzdG9tRG9tYWluJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtwcm9kdWN0aW9uRG9tYWlufWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJvZHVjdGlvbiBmcm9udGVuZCBVUkwgd2l0aCBjdXN0b20gZG9tYWluJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ21pc3JhLXBsYXRmb3JtLWZyb250ZW5kLXVybCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpQ3VzdG9tRG9tYWluVXJsJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHthcGlEb21haW59YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIEFQSSBVUkwgd2l0aCBjdXN0b20gZG9tYWluJyxcclxuICAgICAgZXhwb3J0TmFtZTogJ21pc3JhLXBsYXRmb3JtLWFwaS11cmwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2Nlc3NpbmdRdWV1ZVVybCcsIHtcclxuICAgICAgdmFsdWU6IHByb2Nlc3NpbmdRdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdTUVMgcXVldWUgZm9yIHByb2Nlc3Npbmcgam9icycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGVzdEV4ZWN1dGlvblF1ZXVlVXJsJywge1xyXG4gICAgICB2YWx1ZTogdGVzdEV4ZWN1dGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBmb3IgdGVzdCBleGVjdXRpb24gam9icycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheVVybCcsIHtcclxuICAgICAgdmFsdWU6IGFwaS5hcGlFbmRwb2ludCxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgR2F0ZXdheSBlbmRwb2ludCBVUkwnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Rlc3RFeGVjdXRpb25zVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRHluYW1vREIgdGFibGUgZm9yIHRlc3QgZXhlY3V0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2NyZWVuc2hvdHNCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgYnVja2V0IGZvciB0ZXN0IGV4ZWN1dGlvbiBzY3JlZW5zaG90cycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTm90aWZpY2F0aW9uUXVldWVVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBub3RpZmljYXRpb25RdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdTUVMgcXVldWUgZm9yIG5vdGlmaWNhdGlvbiBwcm9jZXNzaW5nJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdFbWFpbE5vdGlmaWNhdGlvblRvcGljQXJuJywge1xyXG4gICAgICB2YWx1ZTogZW1haWxOb3RpZmljYXRpb25Ub3BpYy50b3BpY0FybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTTlMgdG9waWMgZm9yIGVtYWlsIG5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Ntc05vdGlmaWNhdGlvblRvcGljQXJuJywge1xyXG4gICAgICB2YWx1ZTogc21zTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU05TIHRvcGljIGZvciBTTVMgbm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV2ViaG9va05vdGlmaWNhdGlvblRvcGljQXJuJywge1xyXG4gICAgICB2YWx1ZTogd2ViaG9va05vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyB0b3BpYyBmb3Igd2ViaG9vayBub3RpZmljYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBSVVzYWdlVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogYWlVc2FnZVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgQUkgdXNhZ2UgdHJhY2tpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBBbGFybXMgZm9yIE5vdGlmaWNhdGlvbiBTeXN0ZW1cclxuICAgIC8vIEFsYXJtIGZvciBETFEgZGVwdGggPiAwIChpbmRpY2F0ZXMgZmFpbGVkIG5vdGlmaWNhdGlvbnMpXHJcbiAgICBjb25zdCBkbHFBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdOb3RpZmljYXRpb25ETFFBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnYWlidHMtbm90aWZpY2F0aW9uLWRscS1kZXB0aCcsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIG5vdGlmaWNhdGlvbiBETFEgaGFzIG1lc3NhZ2VzIChmYWlsZWQgbm90aWZpY2F0aW9ucyknLFxyXG4gICAgICBtZXRyaWM6IG5vdGlmaWNhdGlvbkRMUS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNWaXNpYmxlKCksXHJcbiAgICAgIHRocmVzaG9sZDogMCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3IgcXVldWUgZGVwdGggPiAxMDAwIChpbmRpY2F0ZXMgcHJvY2Vzc2luZyBiYWNrbG9nKVxyXG4gICAgY29uc3QgcXVldWVEZXB0aEFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ05vdGlmaWNhdGlvblF1ZXVlRGVwdGhBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnYWlidHMtbm90aWZpY2F0aW9uLXF1ZXVlLWRlcHRoJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gbm90aWZpY2F0aW9uIHF1ZXVlIGRlcHRoIGV4Y2VlZHMgMTAwMCBtZXNzYWdlcycsXHJcbiAgICAgIG1ldHJpYzogbm90aWZpY2F0aW9uUXVldWUubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzVmlzaWJsZSgpLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEwMDAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxhcm0gZm9yIG5vdGlmaWNhdGlvbiBwcm9jZXNzb3IgTGFtYmRhIGVycm9yc1xyXG4gICAgY29uc3QgcHJvY2Vzc29yRXJyb3JBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdOb3RpZmljYXRpb25Qcm9jZXNzb3JFcnJvckFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb24tcHJvY2Vzc29yLWVycm9ycycsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIG5vdGlmaWNhdGlvbiBwcm9jZXNzb3IgTGFtYmRhIGhhcyBlcnJvcnMnLFxyXG4gICAgICBtZXRyaWM6IG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0Vycm9ycyh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3Igc2NoZWR1bGVkIHJlcG9ydHMgTGFtYmRhIGVycm9yc1xyXG4gICAgY29uc3Qgc2NoZWR1bGVkUmVwb3J0c0Vycm9yQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU2NoZWR1bGVkUmVwb3J0c0Vycm9yQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ2FpYnRzLXNjaGVkdWxlZC1yZXBvcnRzLWVycm9ycycsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIHNjaGVkdWxlZCByZXBvcnRzIExhbWJkYSBoYXMgZXJyb3JzJyxcclxuICAgICAgbWV0cmljOiBzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24ubWV0cmljRXJyb3JzKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsYXJtIGZvciBTTlMgZGVsaXZlcnkgZmFpbHVyZXMgKGVtYWlsKVxyXG4gICAgY29uc3Qgc25zRW1haWxGYWlsdXJlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU05TRW1haWxGYWlsdXJlQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ2FpYnRzLXNucy1lbWFpbC1mYWlsdXJlcycsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIFNOUyBlbWFpbCBkZWxpdmVyeSBmYWlscycsXHJcbiAgICAgIG1ldHJpYzogZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNGYWlsZWQoe1xyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDUsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxhcm0gZm9yIFNOUyBkZWxpdmVyeSBmYWlsdXJlcyAoU01TKVxyXG4gICAgY29uc3Qgc25zU21zRmFpbHVyZUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1NOU1Ntc0ZhaWx1cmVBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnYWlidHMtc25zLXNtcy1mYWlsdXJlcycsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIFNOUyBTTVMgZGVsaXZlcnkgZmFpbHMnLFxyXG4gICAgICBtZXRyaWM6IHNtc05vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0ZhaWxlZCh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgTm90aWZpY2F0aW9uIFN5c3RlbVxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uRGFzaGJvYXJkID0gbmV3IGNsb3Vkd2F0Y2guRGFzaGJvYXJkKHRoaXMsICdOb3RpZmljYXRpb25EYXNoYm9hcmQnLCB7XHJcbiAgICAgIGRhc2hib2FyZE5hbWU6ICdBSUJUUy1Ob3RpZmljYXRpb24tU3lzdGVtJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB3aWRnZXRzIHRvIGRhc2hib2FyZFxyXG4gICAgbm90aWZpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIC8vIFF1ZXVlIG1ldHJpY3NcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnTm90aWZpY2F0aW9uIFF1ZXVlIERlcHRoJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBub3RpZmljYXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNWaXNpYmxlKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdNZXNzYWdlcyBWaXNpYmxlJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcygxKSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbm90aWZpY2F0aW9uUXVldWUubWV0cmljQXBwcm94aW1hdGVOdW1iZXJPZk1lc3NhZ2VzTm90VmlzaWJsZSh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnTWVzc2FnZXMgSW4gRmxpZ2h0JyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcygxKSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnRExRIERlcHRoIChGYWlsZWQgTm90aWZpY2F0aW9ucyknLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvbkRMUS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNWaXNpYmxlKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdGYWlsZWQgTWVzc2FnZXMnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIG5vdGlmaWNhdGlvbkRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBMYW1iZGEgbWV0cmljc1xyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdOb3RpZmljYXRpb24gUHJvY2Vzc29yIFBlcmZvcm1hbmNlJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbi5tZXRyaWNJbnZvY2F0aW9ucyh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnSW52b2NhdGlvbnMnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0Vycm9ycycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICBub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbi5tZXRyaWNEdXJhdGlvbih7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRHVyYXRpb24nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU2NoZWR1bGVkIFJlcG9ydHMgUGVyZm9ybWFuY2UnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbi5tZXRyaWNJbnZvY2F0aW9ucyh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnSW52b2NhdGlvbnMnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24ubWV0cmljRXJyb3JzKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdFcnJvcnMnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICByaWdodDogW1xyXG4gICAgICAgICAgc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uLm1ldHJpY0R1cmF0aW9uKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEdXJhdGlvbicsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIG5vdGlmaWNhdGlvbkRhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBTTlMgZGVsaXZlcnkgbWV0cmljc1xyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdTTlMgRW1haWwgRGVsaXZlcnknLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIGVtYWlsTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZNZXNzYWdlc1B1Ymxpc2hlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnUHVibGlzaGVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNEZWxpdmVyZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0RlbGl2ZXJlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIGVtYWlsTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdGYWlsZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogOCxcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1NOUyBTTVMgRGVsaXZlcnknLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIHNtc05vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTWVzc2FnZXNQdWJsaXNoZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ1B1Ymxpc2hlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIHNtc05vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0RlbGl2ZXJlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRGVsaXZlcmVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdGYWlsZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogOCxcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1NOUyBXZWJob29rIERlbGl2ZXJ5JyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZNZXNzYWdlc1B1Ymxpc2hlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnUHVibGlzaGVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgd2ViaG9va05vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0RlbGl2ZXJlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRGVsaXZlcmVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgd2ViaG9va05vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0ZhaWxlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRmFpbGVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDgsXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIE91dHB1dCBkYXNoYm9hcmQgVVJMXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTm90aWZpY2F0aW9uRGFzaGJvYXJkVXJsJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vY29uc29sZS5hd3MuYW1hem9uLmNvbS9jbG91ZHdhdGNoL2hvbWU/cmVnaW9uPSR7dGhpcy5yZWdpb259I2Rhc2hib2FyZHM6bmFtZT0ke25vdGlmaWNhdGlvbkRhc2hib2FyZC5kYXNoYm9hcmROYW1lfWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBEYXNoYm9hcmQgZm9yIE5vdGlmaWNhdGlvbiBTeXN0ZW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29nbml0byBvdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXNlci1wb29sLWlkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBDbGllbnQgSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXNlci1wb29sLWNsaWVudC1pZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbEFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXNlci1wb29sLWFybicsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5cclxuXHJcblxyXG5cclxuIl19