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
const file_metadata_table_1 = require("./file-metadata-table");
const upload_progress_table_1 = require("./upload-progress-table");
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
        const projectsTable = dynamodb.Table.fromTableName(this, 'ExistingTestProjectsTable', 'TestProjects');
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
        const sampleFilesTable = { table: dynamodb.Table.fromTableName(this, 'ExistingSampleFilesTable', 'SampleFiles') };
        // Upload Progress Table for tracking file upload progress
        const uploadProgressTable = new upload_progress_table_1.UploadProgressTable(this, 'UploadProgressTable', { environment: 'dev' });
        // Projects Table for Web App Testing System - Using existing TestProjects table
        const testProjectsTable = { table: projectsTable };
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
        // Email Verification and OTP Integration Lambda Functions
        const initiateFlowFunction = new lambda.Function(this, 'InitiateFlowFunction', {
            functionName: 'misra-platform-initiate-flow',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/initiate-flow'),
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const verifyEmailWithOTPFunction = new lambda.Function(this, 'VerifyEmailWithOTPFunction', {
            functionName: 'misra-platform-verify-email-with-otp',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/verify-email-with-otp'),
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
            },
            timeout: cdk.Duration.seconds(30),
            reservedConcurrentExecutions: 0,
        });
        const completeOTPSetupFunction = new lambda.Function(this, 'CompleteOTPSetupFunction', {
            functionName: 'misra-platform-complete-otp-setup',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/complete-otp-setup'),
            environment: {
                USERS_TABLE_NAME: usersTable.tableName,
                USER_POOL_ID: userPool.userPoolId,
                USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
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
        // Email verification and OTP integration permissions
        usersTable.grantReadWriteData(initiateFlowFunction);
        usersTable.grantReadWriteData(verifyEmailWithOTPFunction);
        usersTable.grantReadWriteData(completeOTPSetupFunction);
        jwtSecret.grantRead(completeOTPSetupFunction);
        // Grant Cognito permissions to the new auth functions
        initiateFlowFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminSetUserPassword',
                'cognito-idp:AdminUpdateUserAttributes',
            ],
            resources: [userPool.userPoolArn],
        }));
        verifyEmailWithOTPFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminConfirmSignUp',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:AdminSetUserMFAPreference',
            ],
            resources: [userPool.userPoolArn],
        }));
        completeOTPSetupFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cognito-idp:AdminGetUser',
                'cognito-idp:AdminSetUserMFAPreference',
                'cognito-idp:AdminUpdateUserAttributes',
                'cognito-idp:VerifySoftwareToken',
            ],
            resources: [userPool.userPoolArn],
        }));
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
        // TODO: Re-enable AnalysisWorkflow when the module is available
        // const workflow = new AnalysisWorkflow(this, 'AnalysisWorkflow', {
        //   environment: this.stackName,
        //   analysisFunction,
        //   notificationFunction,
        // });
        // Update upload-complete function with workflow ARN
        // uploadCompleteFunction.addEnvironment('STATE_MACHINE_ARN', workflow.stateMachine.stateMachineArn);
        // Grant upload-complete function permission to start workflow executions
        // workflow.stateMachine.grantStartExecution(uploadCompleteFunction);
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
        // Add email verification and OTP integration routes
        api.addRoutes({
            path: '/auth/initiate-flow',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('InitiateFlowIntegration', initiateFlowFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
        });
        api.addRoutes({
            path: '/auth/verify-email-with-otp',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('VerifyEmailWithOTPIntegration', verifyEmailWithOTPFunction, {
                payloadFormatVersion: apigateway.PayloadFormatVersion.VERSION_1_0,
            }),
        });
        api.addRoutes({
            path: '/auth/complete-otp-setup',
            methods: [apigateway.HttpMethod.POST],
            integration: new integrations.HttpLambdaIntegration('CompleteOTPSetupIntegration', completeOTPSetupFunction, {
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
