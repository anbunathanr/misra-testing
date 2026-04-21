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
        // Get Report Lambda Function for PDF report generation
        const getReportFunction = new lambda.Function(this, 'GetReportFunction', {
            functionName: 'misra-platform-get-report',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/analysis/get-report'),
            environment: {
                ANALYSIS_RESULTS_TABLE: analysisResultsTable.tableName,
                FILE_METADATA_TABLE: fileMetadataTable.table.tableName,
                FILE_STORAGE_BUCKET: fileStorageBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            reservedConcurrentExecutions: 0,
        });
        // Grant query and stats functions access to analysis results
        analysisResultsTable.grantReadData(queryResultsFunction);
        analysisResultsTable.grantReadData(userStatsFunction);
        // Grant get-report function permissions (Task 3.2)
        analysisResultsTable.grantReadData(getReportFunction);
        fileMetadataTable.grantReadData(getReportFunction);
        fileStorageBucket.grantReadWrite(getReportFunction);
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
        // Add report download route (Task 3.3)
        api.addRoutes({
            path: '/reports/{fileId}',
            methods: [apigateway.HttpMethod.GET],
            integration: new integrations.HttpLambdaIntegration('GetReportIntegration', getReportFunction, {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLHNFQUF3RDtBQUN4RCxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBQ2pELHlGQUEyRTtBQUMzRSx5RUFBMkQ7QUFDM0Qsd0ZBQTBFO0FBQzFFLHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQsd0VBQTBEO0FBQzFELCtFQUFpRTtBQUNqRSx1RUFBeUQ7QUFDekQsNEVBQThEO0FBQzlELHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFDbkQsdUZBQXlFO0FBQ3pFLGlFQUFtRDtBQUNuRCxnRkFBa0U7QUFFbEUsK0RBQTBEO0FBRTFELG1FQUE4RDtBQUU5RCwyREFBc0Q7QUFDdEQseURBQW9EO0FBQ3BELG1FQUE4RDtBQUM5RCw2REFBeUQ7QUFDekQscUZBQWdGO0FBQ2hGLGlGQUE0RTtBQUM1RSw2RUFBd0U7QUFDeEUscURBQWdEO0FBQ2hELGlFQUE0RDtBQUU1RCxNQUFhLGtCQUFtQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQy9DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsa0NBQWtDO1FBQ2xDLE1BQU0sZ0JBQWdCLEdBQUcsNEJBQTRCLENBQUM7UUFDdEQsTUFBTSxTQUFTLEdBQUcsZ0NBQWdDLENBQUM7UUFDbkQsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUM7UUFFOUMsc0RBQXNEO1FBQ3RELHdGQUF3RjtRQUN4RixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUs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aW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgczNuIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMy1ub3RpZmljYXRpb25zJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGFFdmVudFNvdXJjZXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyJztcclxuaW1wb3J0ICogYXMgaW50ZWdyYXRpb25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcclxuaW1wb3J0ICogYXMgYXV0aG9yaXplcnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XHJcbmltcG9ydCAqIGFzIHNxcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3FzJztcclxuaW1wb3J0ICogYXMgc25zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zbnMnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcclxuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBjbG91ZGZyb250IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250JztcclxuaW1wb3J0ICogYXMgb3JpZ2lucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udC1vcmlnaW5zJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSAnYXdzLWNkay1saWIvYXdzLWNvZ25pdG8nO1xyXG5pbXBvcnQgKiBhcyBjZXJ0aWZpY2F0ZW1hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xyXG5pbXBvcnQgKiBhcyByb3V0ZTUzdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1My10YXJnZXRzJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IEZpbGVNZXRhZGF0YVRhYmxlIH0gZnJvbSAnLi9maWxlLW1ldGFkYXRhLXRhYmxlJztcclxuaW1wb3J0IHsgU2FtcGxlRmlsZXNUYWJsZSB9IGZyb20gJy4vc2FtcGxlLWZpbGVzLXRhYmxlJztcclxuaW1wb3J0IHsgVXBsb2FkUHJvZ3Jlc3NUYWJsZSB9IGZyb20gJy4vdXBsb2FkLXByb2dyZXNzLXRhYmxlJztcclxuaW1wb3J0IHsgUHJvamVjdHNUYWJsZSB9IGZyb20gJy4vcHJvamVjdHMtdGFibGUnO1xyXG5pbXBvcnQgeyBUZXN0U3VpdGVzVGFibGUgfSBmcm9tICcuL3Rlc3Qtc3VpdGVzLXRhYmxlJztcclxuaW1wb3J0IHsgVGVzdENhc2VzVGFibGUgfSBmcm9tICcuL3Rlc3QtY2FzZXMtdGFibGUnO1xyXG5pbXBvcnQgeyBUZXN0RXhlY3V0aW9uc1RhYmxlIH0gZnJvbSAnLi90ZXN0LWV4ZWN1dGlvbnMtdGFibGUnO1xyXG5pbXBvcnQgeyBTY3JlZW5zaG90c0J1Y2tldCB9IGZyb20gJy4vc2NyZWVuc2hvdHMtYnVja2V0JztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZSB9IGZyb20gJy4vbm90aWZpY2F0aW9uLXByZWZlcmVuY2VzLXRhYmxlJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUgfSBmcm9tICcuL25vdGlmaWNhdGlvbi10ZW1wbGF0ZXMtdGFibGUnO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25IaXN0b3J5VGFibGUgfSBmcm9tICcuL25vdGlmaWNhdGlvbi1oaXN0b3J5LXRhYmxlJztcclxuaW1wb3J0IHsgQUlVc2FnZVRhYmxlIH0gZnJvbSAnLi9haS11c2FnZS10YWJsZSc7XHJcbmltcG9ydCB7IEFuYWx5c2lzQ2FjaGVUYWJsZSB9IGZyb20gJy4vYW5hbHlzaXMtY2FjaGUtdGFibGUnO1xyXG5cclxuZXhwb3J0IGNsYXNzIE1pc3JhUGxhdGZvcm1TdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gUHJvZHVjdGlvbiBkb21haW4gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgcHJvZHVjdGlvbkRvbWFpbiA9ICdtaXNyYS5kaWdpdHJhbnNvbHV0aW9ucy5pbic7XHJcbiAgICBjb25zdCBhcGlEb21haW4gPSAnYXBpLm1pc3JhLmRpZ2l0cmFuc29sdXRpb25zLmluJztcclxuICAgIGNvbnN0IGhvc3RlZFpvbmVOYW1lID0gJ2RpZ2l0cmFuc29sdXRpb25zLmluJztcclxuICAgIFxyXG4gICAgLy8gSW1wb3J0IGV4aXN0aW5nIGhvc3RlZCB6b25lIChtdXN0IGV4aXN0IGluIFJvdXRlNTMpXHJcbiAgICAvLyBOb3RlOiBUaGUgaG9zdGVkIHpvbmUgbXVzdCBiZSBjcmVhdGVkIG1hbnVhbGx5IGluIFJvdXRlNTMgYmVmb3JlIGRlcGxveWluZyB0aGlzIHN0YWNrXHJcbiAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IGhvc3RlZFpvbmVOYW1lLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFNTTCBjZXJ0aWZpY2F0ZSBmb3IgQ2xvdWRGcm9udCAobXVzdCBiZSBpbiB1cy1lYXN0LTEpXHJcbiAgICAvLyBDbG91ZEZyb250IHJlcXVpcmVzIGNlcnRpZmljYXRlcyB0byBiZSBpbiB1cy1lYXN0LTEgcmVnaW9uXHJcbiAgICBjb25zdCBmcm9udGVuZENlcnRpZmljYXRlID0gbmV3IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZSh0aGlzLCAnRnJvbnRlbmRDZXJ0aWZpY2F0ZScsIHtcclxuICAgICAgZG9tYWluTmFtZTogcHJvZHVjdGlvbkRvbWFpbixcclxuICAgICAgdmFsaWRhdGlvbjogY2VydGlmaWNhdGVtYW5hZ2VyLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFNTTCBjZXJ0aWZpY2F0ZSBmb3IgQVBJIEdhdGV3YXkgKGNhbiBiZSBpbiBhbnkgcmVnaW9uKVxyXG4gICAgY29uc3QgYXBpQ2VydGlmaWNhdGUgPSBuZXcgY2VydGlmaWNhdGVtYW5hZ2VyLkNlcnRpZmljYXRlKHRoaXMsICdBcGlDZXJ0aWZpY2F0ZScsIHtcclxuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluLFxyXG4gICAgICB2YWxpZGF0aW9uOiBjZXJ0aWZpY2F0ZW1hbmFnZXIuQ2VydGlmaWNhdGVWYWxpZGF0aW9uLmZyb21EbnMoaG9zdGVkWm9uZSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTMyBCdWNrZXRzIGZvciBmaWxlIHN0b3JhZ2VcclxuICAgIGNvbnN0IGZpbGVTdG9yYWdlQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1maWxlcy0ke3RoaXMuYWNjb3VudH1gLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBmcm9udGVuZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0tZnJvbnRlbmQtJHt0aGlzLmFjY291bnR9YCxcclxuICAgICAgd2Vic2l0ZUluZGV4RG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcclxuICAgICAgd2Vic2l0ZUVycm9yRG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FDTFMsXHJcbiAgICAgIHB1YmxpY1JlYWRBY2Nlc3M6IHRydWUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gZm9yIGZyb250ZW5kIHdpdGggY3VzdG9tIGRvbWFpblxyXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IGNsb3VkZnJvbnQuRGlzdHJpYnV0aW9uKHRoaXMsICdGcm9udGVuZERpc3RyaWJ1dGlvbicsIHtcclxuICAgICAgZGVmYXVsdEJlaGF2aW9yOiB7XHJcbiAgICAgICAgb3JpZ2luOiBuZXcgb3JpZ2lucy5TM09yaWdpbihmcm9udGVuZEJ1Y2tldCksXHJcbiAgICAgICAgdmlld2VyUHJvdG9jb2xQb2xpY3k6IGNsb3VkZnJvbnQuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgY2FjaGVQb2xpY3k6IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kuQ0FDSElOR19PUFRJTUlaRUQsXHJcbiAgICAgICAgb3JpZ2luUmVxdWVzdFBvbGljeTogY2xvdWRmcm9udC5PcmlnaW5SZXF1ZXN0UG9saWN5LkNPUlNfUzNfT1JJR0lOLFxyXG4gICAgICB9LFxyXG4gICAgICBkb21haW5OYW1lczogW3Byb2R1Y3Rpb25Eb21haW5dLFxyXG4gICAgICBjZXJ0aWZpY2F0ZTogZnJvbnRlbmRDZXJ0aWZpY2F0ZSxcclxuICAgICAgZGVmYXVsdFJvb3RPYmplY3Q6ICdpbmRleC5odG1sJyxcclxuICAgICAgZXJyb3JSZXNwb25zZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBodHRwU3RhdHVzOiA0MDQsXHJcbiAgICAgICAgICByZXNwb25zZUh0dHBTdGF0dXM6IDIwMCxcclxuICAgICAgICAgIHJlc3BvbnNlUGFnZVBhdGg6ICcvaW5kZXguaHRtbCcsXHJcbiAgICAgICAgICB0dGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaHR0cFN0YXR1czogNDAzLFxyXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBwcmljZUNsYXNzOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLCAvLyBVc2Ugb25seSBOb3J0aCBBbWVyaWNhIGFuZCBFdXJvcGUgZWRnZSBsb2NhdGlvbnNcclxuICAgICAgZW5hYmxlTG9nZ2luZzogdHJ1ZSxcclxuICAgICAgY29tbWVudDogJ01JU1JBIFBsYXRmb3JtIFByb2R1Y3Rpb24gRnJvbnRlbmQgRGlzdHJpYnV0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBSb3V0ZTUzIEEgcmVjb3JkIGZvciBmcm9udGVuZCBkb21haW5cclxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0Zyb250ZW5kQWxpYXNSZWNvcmQnLCB7XHJcbiAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXHJcbiAgICAgIHJlY29yZE5hbWU6IHByb2R1Y3Rpb25Eb21haW4sXHJcbiAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxyXG4gICAgICAgIG5ldyByb3V0ZTUzdGFyZ2V0cy5DbG91ZEZyb250VGFyZ2V0KGRpc3RyaWJ1dGlvbilcclxuICAgICAgKSxcclxuICAgICAgY29tbWVudDogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciBNSVNSQSBQbGF0Zm9ybSBmcm9udGVuZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbCBmb3IgYXV0aGVudGljYXRpb25cclxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgdXNlcm5hbWU6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgICBhdXRvVmVyaWZ5OiB7XHJcbiAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7XHJcbiAgICAgICAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICAgIG11dGFibGU6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmdWxsbmFtZToge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgXHJcbiAgICAgICAgICBtaW5MZW46IDEsIFxyXG4gICAgICAgICAgbWF4TGVuOiAyNTYsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHJvbGU6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IFxyXG4gICAgICAgICAgbWluTGVuOiAxLCBcclxuICAgICAgICAgIG1heExlbjogNTAsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9LFxyXG4gICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgIG1pbkxlbmd0aDogOCxcclxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlU3ltYm9sczogZmFsc2UsXHJcbiAgICAgICAgdGVtcFBhc3N3b3JkVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICB9LFxyXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTixcclxuICAgICAgbWZhOiBjb2duaXRvLk1mYS5PUFRJT05BTCxcclxuICAgICAgbWZhU2Vjb25kRmFjdG9yOiB7XHJcbiAgICAgICAgc21zOiBmYWxzZSxcclxuICAgICAgICBvdHA6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdWZXJpZnkgeW91ciBlbWFpbCBmb3IgTWlzcmEgUGxhdGZvcm0nLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ1RoYW5rIHlvdSBmb3Igc2lnbmluZyB1cCEgWW91ciB2ZXJpZmljYXRpb24gY29kZSBpcyB7IyMjI30nLFxyXG4gICAgICAgIGVtYWlsU3R5bGU6IGNvZ25pdG8uVmVyaWZpY2F0aW9uRW1haWxTdHlsZS5DT0RFLFxyXG4gICAgICB9LFxyXG4gICAgICB1c2VySW52aXRhdGlvbjoge1xyXG4gICAgICAgIGVtYWlsU3ViamVjdDogJ1dlbGNvbWUgdG8gTWlzcmEgUGxhdGZvcm0nLFxyXG4gICAgICAgIGVtYWlsQm9keTogJ0hlbGxvIHt1c2VybmFtZX0sIHlvdSBoYXZlIGJlZW4gaW52aXRlZCB0byBqb2luIE1pc3JhIFBsYXRmb3JtLiBZb3VyIHRlbXBvcmFyeSBwYXNzd29yZCBpcyB7IyMjI30nLFxyXG4gICAgICB9LFxyXG4gICAgICBkZXZpY2VUcmFja2luZzoge1xyXG4gICAgICAgIGNoYWxsZW5nZVJlcXVpcmVkT25OZXdEZXZpY2U6IHRydWUsXHJcbiAgICAgICAgZGV2aWNlT25seVJlbWVtYmVyZWRPblVzZXJQcm9tcHQ6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IHVzZXJQb29sLmFkZENsaWVudCgnV2ViQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbENsaWVudE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS13ZWItY2xpZW50JyxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLFxyXG4gICAgICBhdXRoRmxvd3M6IHtcclxuICAgICAgICB1c2VyUGFzc3dvcmQ6IHRydWUsXHJcbiAgICAgICAgdXNlclNycDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXHJcbiAgICAgIHJlZnJlc2hUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgIGFjY2Vzc1Rva2VuVmFsaWRpdHk6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgaWRUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGVuYWJsZVRva2VuUmV2b2NhdGlvbjogdHJ1ZSxcclxuICAgICAgcmVhZEF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZW1haWxWZXJpZmllZDogdHJ1ZSxcclxuICAgICAgICAgIGZ1bGxuYW1lOiB0cnVlLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgLndpdGhDdXN0b21BdHRyaWJ1dGVzKCdvcmdhbml6YXRpb25JZCcsICdyb2xlJyksXHJcbiAgICAgIHdyaXRlQXR0cmlidXRlczogbmV3IGNvZ25pdG8uQ2xpZW50QXR0cmlidXRlcygpXHJcbiAgICAgICAgLndpdGhTdGFuZGFyZEF0dHJpYnV0ZXMoe1xyXG4gICAgICAgICAgZW1haWw6IHRydWUsXHJcbiAgICAgICAgICBmdWxsbmFtZTogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcygnb3JnYW5pemF0aW9uSWQnLCAncm9sZScpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRHluYW1vREIgVGFibGVzIC0gVXNpbmcgZXhpc3RpbmcgdGFibGUgbmFtZXMgZnJvbSBwcmV2aW91cyBkZXBsb3ltZW50XHJcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdVc2Vyc1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VycycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIG9yZ2FuaXphdGlvbiBxdWVyaWVzXHJcbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnb3JnYW5pemF0aW9uSWQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ29yZ2FuaXphdGlvbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIGVtYWlsIHF1ZXJpZXNcclxuICAgIHVzZXJzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdlbWFpbC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVXNlIGV4aXN0aW5nIFRlc3RQcm9qZWN0cyB0YWJsZVxyXG4gICAgY29uc3QgcHJvamVjdHNUYWJsZSA9IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ0V4aXN0aW5nVGVzdFByb2plY3RzVGFibGUnLCAnVGVzdFByb2plY3RzJyk7XHJcblxyXG4gICAgY29uc3QgYW5hbHlzZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQW5hbHlzZXNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tYW5hbHlzZXMnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2FuYWx5c2lzSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdwcm9qZWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSXMgZm9yIGVmZmljaWVudCBxdWVyeWluZ1xyXG4gICAgYW5hbHlzZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3Byb2plY3RJZC1jcmVhdGVkQXQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Byb2plY3RJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBhbmFseXNlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnc3RhdHVzLWNyZWF0ZWRBdC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3RhdHVzJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHRlc3RSdW5zVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Rlc3RSdW5zVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogJ21pc3JhLXBsYXRmb3JtLXRlc3QtcnVucycsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndGVzdFJ1bklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIFJlc3VsdHMgVGFibGUgZm9yIHN0b3JpbmcgZGV0YWlsZWQgTUlTUkEgYW5hbHlzaXMgcmVzdWx0c1xyXG4gICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0FuYWx5c2lzUmVzdWx0c1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1yZXN1bHRzJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdhbmFseXNpc0lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0lzIGZvciBhbmFseXNpcyByZXN1bHRzIHF1ZXJpZXNcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZmlsZUlkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZmlsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAncnVsZVNldC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3J1bGVTZXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZSBNZXRhZGF0YSBUYWJsZSBmb3IgdHJhY2tpbmcgdXBsb2FkZWQgZmlsZXMgYW5kIGFuYWx5c2lzIHN0YXR1c1xyXG4gICAgY29uc3QgZmlsZU1ldGFkYXRhVGFibGUgPSBuZXcgRmlsZU1ldGFkYXRhVGFibGUodGhpcywgJ0ZpbGVNZXRhZGF0YVRhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNhbXBsZSBGaWxlcyBUYWJsZSBmb3Igc3RvcmluZyBwcmVkZWZpbmVkIEMvQysrIGZpbGVzIHdpdGgga25vd24gTUlTUkEgdmlvbGF0aW9uc1xyXG4gICAgY29uc3Qgc2FtcGxlRmlsZXNUYWJsZSA9IHsgdGFibGU6IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ0V4aXN0aW5nU2FtcGxlRmlsZXNUYWJsZScsICdTYW1wbGVGaWxlcycpIH07XHJcblxyXG4gICAgLy8gVXBsb2FkIFByb2dyZXNzIFRhYmxlIGZvciB0cmFja2luZyBmaWxlIHVwbG9hZCBwcm9ncmVzc1xyXG4gICAgY29uc3QgdXBsb2FkUHJvZ3Jlc3NUYWJsZSA9IG5ldyBVcGxvYWRQcm9ncmVzc1RhYmxlKHRoaXMsICdVcGxvYWRQcm9ncmVzc1RhYmxlJywgeyBlbnZpcm9ubWVudDogJ2RldicgfSk7XHJcblxyXG4gICAgLy8gUHJvamVjdHMgVGFibGUgZm9yIFdlYiBBcHAgVGVzdGluZyBTeXN0ZW0gLSBVc2luZyBleGlzdGluZyBUZXN0UHJvamVjdHMgdGFibGVcclxuICAgIGNvbnN0IHRlc3RQcm9qZWN0c1RhYmxlID0geyB0YWJsZTogcHJvamVjdHNUYWJsZSB9O1xyXG5cclxuICAgIC8vIFRlc3QgU3VpdGVzIFRhYmxlIGZvciBXZWIgQXBwIFRlc3RpbmcgU3lzdGVtIC0gVXNpbmcgZXhpc3RpbmcgVGVzdFN1aXRlcyB0YWJsZVxyXG4gICAgY29uc3QgdGVzdFN1aXRlc1RhYmxlID0gbmV3IFRlc3RTdWl0ZXNUYWJsZSh0aGlzLCAnVGVzdFN1aXRlc1RhYmxlJyk7XHJcblxyXG4gICAgLy8gVGVzdCBDYXNlcyBUYWJsZSBmb3IgV2ViIEFwcCBUZXN0aW5nIFN5c3RlbSAtIFVzaW5nIGV4aXN0aW5nIFRlc3RDYXNlcyB0YWJsZVxyXG4gICAgY29uc3QgdGVzdENhc2VzVGFibGUgPSBuZXcgVGVzdENhc2VzVGFibGUodGhpcywgJ1Rlc3RDYXNlc1RhYmxlJyk7XHJcblxyXG4gICAgLy8gVGVzdCBFeGVjdXRpb25zIFRhYmxlIGZvciBXZWIgQXBwIFRlc3RpbmcgU3lzdGVtIC0gVXNpbmcgZXhpc3RpbmcgVGVzdEV4ZWN1dGlvbnMgdGFibGVcclxuICAgIGNvbnN0IHRlc3RFeGVjdXRpb25zVGFibGUgPSBuZXcgVGVzdEV4ZWN1dGlvbnNUYWJsZSh0aGlzLCAnVGVzdEV4ZWN1dGlvbnNUYWJsZScpO1xyXG5cclxuICAgIC8vIFNjcmVlbnNob3RzIEJ1Y2tldCBmb3IgVGVzdCBFeGVjdXRpb24gRmFpbHVyZXNcclxuICAgIGNvbnN0IHNjcmVlbnNob3RzQnVja2V0ID0gbmV3IFNjcmVlbnNob3RzQnVja2V0KHRoaXMsICdTY3JlZW5zaG90c0J1Y2tldCcsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6ICdkZXYnXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RpZmljYXRpb24gU3lzdGVtIFRhYmxlc1xyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZSA9IG5ldyBOb3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlKHRoaXMsICdOb3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlID0gbmV3IE5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlKHRoaXMsICdOb3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZScsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6ICdkZXYnXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25IaXN0b3J5VGFibGUgPSBuZXcgTm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlKHRoaXMsICdOb3RpZmljYXRpb25IaXN0b3J5VGFibGUnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiAnZGV2J1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQUkgVXNhZ2UgVGFibGUgZm9yIEFJIFRlc3QgR2VuZXJhdGlvbiAtIFVzaW5nIGV4aXN0aW5nIEFJVXNhZ2UgdGFibGVcclxuICAgIGNvbnN0IGFpVXNhZ2VUYWJsZSA9IG5ldyBBSVVzYWdlVGFibGUodGhpcywgJ0FJVXNhZ2VUYWJsZScpO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIENhY2hlIFRhYmxlIGZvciBNSVNSQSBhbmFseXNpcyBjYWNoaW5nIChSZXF1aXJlbWVudCAxMC43KVxyXG4gICAgY29uc3QgYW5hbHlzaXNDYWNoZVRhYmxlID0gbmV3IEFuYWx5c2lzQ2FjaGVUYWJsZSh0aGlzLCAnQW5hbHlzaXNDYWNoZVRhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ2RldidcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNOUyBUb3BpY3MgZm9yIE5vdGlmaWNhdGlvbiBEZWxpdmVyeVxyXG4gICAgY29uc3QgZW1haWxOb3RpZmljYXRpb25Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ0VtYWlsTm90aWZpY2F0aW9uVG9waWMnLCB7XHJcbiAgICAgIHRvcGljTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbnMtZW1haWwnLFxyXG4gICAgICBkaXNwbGF5TmFtZTogJ0FJQlRTIEVtYWlsIE5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc21zTm90aWZpY2F0aW9uVG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdTbXNOb3RpZmljYXRpb25Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiAnYWlidHMtbm90aWZpY2F0aW9ucy1zbXMnLFxyXG4gICAgICBkaXNwbGF5TmFtZTogJ0FJQlRTIFNNUyBOb3RpZmljYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHdlYmhvb2tOb3RpZmljYXRpb25Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ1dlYmhvb2tOb3RpZmljYXRpb25Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiAnYWlidHMtbm90aWZpY2F0aW9ucy13ZWJob29rJyxcclxuICAgICAgZGlzcGxheU5hbWU6ICdBSUJUUyBXZWJob29rIE5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU1FTIFF1ZXVlIGZvciBub3RpZmljYXRpb24gcHJvY2Vzc2luZ1xyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uRExRID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnTm90aWZpY2F0aW9uRExRJywge1xyXG4gICAgICBxdWV1ZU5hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb24tZGxxJyxcclxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksIC8vIEtlZXAgZmFpbGVkIG1lc3NhZ2VzIGZvciAxNCBkYXlzXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25RdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ05vdGlmaWNhdGlvblF1ZXVlJywge1xyXG4gICAgICBxdWV1ZU5hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb24tcXVldWUnLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLCAvLyBNYXRjaCBMYW1iZGEgdGltZW91dFxyXG4gICAgICByZWNlaXZlTWVzc2FnZVdhaXRUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksIC8vIExvbmcgcG9sbGluZ1xyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDQpLFxyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogbm90aWZpY2F0aW9uRExRLFxyXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMywgLy8gUmV0cnkgdXAgdG8gMyB0aW1lcyBiZWZvcmUgbW92aW5nIHRvIERMUVxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXZlbnRCcmlkZ2UgUnVsZSBmb3IgVGVzdCBDb21wbGV0aW9uIEV2ZW50c1xyXG4gICAgLy8gUm91dGVzIHRlc3QgZXhlY3V0aW9uIGNvbXBsZXRpb24gZXZlbnRzIHRvIG5vdGlmaWNhdGlvbiBxdWV1ZVxyXG4gICAgY29uc3QgdGVzdENvbXBsZXRpb25SdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdUZXN0Q29tcGxldGlvblJ1bGUnLCB7XHJcbiAgICAgIHJ1bGVOYW1lOiAnYWlidHMtdGVzdC1leGVjdXRpb24tY29tcGxldGlvbicsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUm91dGVzIHRlc3QgZXhlY3V0aW9uIGNvbXBsZXRpb24gZXZlbnRzIHRvIG5vdGlmaWNhdGlvbiBxdWV1ZScsXHJcbiAgICAgIGV2ZW50UGF0dGVybjoge1xyXG4gICAgICAgIHNvdXJjZTogWydhaWJ0cy50ZXN0LWV4ZWN1dGlvbiddLFxyXG4gICAgICAgIGRldGFpbFR5cGU6IFsnVGVzdCBFeGVjdXRpb24gQ29tcGxldGVkJ10sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgbm90aWZpY2F0aW9uIHF1ZXVlIGFzIHRhcmdldCBmb3IgdGVzdCBjb21wbGV0aW9uIGV2ZW50c1xyXG4gICAgdGVzdENvbXBsZXRpb25SdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5TcXNRdWV1ZShub3RpZmljYXRpb25RdWV1ZSkpO1xyXG5cclxuICAgIC8vIFNjaGVkdWxlZCBSZXBvcnRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3Qgc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnU2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1zY2hlZHVsZWQtcmVwb3J0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvc2NoZWR1bGVkLXJlcG9ydHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIE5PVElGSUNBVElPTl9RVUVVRV9VUkw6IG5vdGlmaWNhdGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gc2NoZWR1bGVkIHJlcG9ydHMgZnVuY3Rpb25cclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMoc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBFdmVudEJyaWRnZSBDcm9uIFJ1bGVzIGZvciBTY2hlZHVsZWQgUmVwb3J0c1xyXG4gICAgLy8gRGFpbHkgUmVwb3J0IC0gMDk6MDAgVVRDIGRhaWx5XHJcbiAgICBjb25zdCBkYWlseVJlcG9ydFJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0RhaWx5UmVwb3J0UnVsZScsIHtcclxuICAgICAgcnVsZU5hbWU6ICdhaWJ0cy1kYWlseS1zdW1tYXJ5LXJlcG9ydCcsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVHJpZ2dlcnMgZGFpbHkgdGVzdCBleGVjdXRpb24gc3VtbWFyeSByZXBvcnQnLFxyXG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgIG1pbnV0ZTogJzAnLFxyXG4gICAgICAgIGhvdXI6ICc5JyxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuICAgIGRhaWx5UmVwb3J0UnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uKSk7XHJcblxyXG4gICAgLy8gV2Vla2x5IFJlcG9ydCAtIDA5OjAwIFVUQyBldmVyeSBNb25kYXlcclxuICAgIGNvbnN0IHdlZWtseVJlcG9ydFJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ1dlZWtseVJlcG9ydFJ1bGUnLCB7XHJcbiAgICAgIHJ1bGVOYW1lOiAnYWlidHMtd2Vla2x5LXN1bW1hcnktcmVwb3J0JyxcclxuICAgICAgZGVzY3JpcHRpb246ICdUcmlnZ2VycyB3ZWVrbHkgdGVzdCBleGVjdXRpb24gc3VtbWFyeSByZXBvcnQnLFxyXG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgIG1pbnV0ZTogJzAnLFxyXG4gICAgICAgIGhvdXI6ICc5JyxcclxuICAgICAgICB3ZWVrRGF5OiAnTU9OJyxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuICAgIHdlZWtseVJlcG9ydFJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBQcmVmZXJlbmNlcyBBUEkgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0UHJlZmVyZW5jZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFByZWZlcmVuY2VzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWdldC1wcmVmZXJlbmNlcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvZ2V0LXByZWZlcmVuY2VzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1BSRUZFUkVOQ0VTX1RBQkxFOiBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVQcmVmZXJlbmNlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtdXBkYXRlLXByZWZlcmVuY2VzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy91cGRhdGUtcHJlZmVyZW5jZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fUFJFRkVSRU5DRVNfVEFCTEU6IG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBIaXN0b3J5IEFQSSBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRIaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRIaXN0b3J5RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWdldC1oaXN0b3J5JyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9nZXQtaGlzdG9yeScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9ISVNUT1JZX1RBQkxFOiBub3RpZmljYXRpb25IaXN0b3J5VGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWdldC1ub3RpZmljYXRpb24nLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2dldC1ub3RpZmljYXRpb24nKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fSElTVE9SWV9UQUJMRTogbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RpZmljYXRpb24gVGVtcGxhdGUgQVBJIExhbWJkYSBGdW5jdGlvbnMgKEFkbWluIE9ubHkpXHJcbiAgICBjb25zdCBjcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlVGVtcGxhdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtY3JlYXRlLXRlbXBsYXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9jcmVhdGUtdGVtcGxhdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVtcGxhdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVRlbXBsYXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLXVwZGF0ZS10ZW1wbGF0ZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvdXBkYXRlLXRlbXBsYXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1RFTVBMQVRFU19UQUJMRTogbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldFRlbXBsYXRlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VGVtcGxhdGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWdldC10ZW1wbGF0ZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2dldC10ZW1wbGF0ZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gbm90aWZpY2F0aW9uIEFQSSBmdW5jdGlvbnNcclxuICAgIG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0SGlzdG9yeUZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0VGVtcGxhdGVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFNRUyBRdWV1ZSBmb3IgYXN5bmMgcHJvY2Vzc2luZ1xyXG4gICAgY29uc3QgcHJvY2Vzc2luZ1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnUHJvY2Vzc2luZ1F1ZXVlJywge1xyXG4gICAgICBxdWV1ZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1wcm9jZXNzaW5nJyxcclxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XHJcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUodGhpcywgJ1Byb2Nlc3NpbmdETFEnLCB7XHJcbiAgICAgICAgICBxdWV1ZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1wcm9jZXNzaW5nLWRscScsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU1FTIFF1ZXVlIGZvciBNSVNSQSBhbmFseXNpcyAoUmVxdWlyZW1lbnQgMTAuNSlcclxuICAgIGNvbnN0IGFuYWx5c2lzUXVldWVETFEgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdBbmFseXNpc1F1ZXVlRExRJywge1xyXG4gICAgICBxdWV1ZU5hbWU6ICdtaXNyYS1hbmFseXNpcy1kbHEnLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFuYWx5c2lzUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdBbmFseXNpc1F1ZXVlJywge1xyXG4gICAgICBxdWV1ZU5hbWU6ICdtaXNyYS1hbmFseXNpcy1xdWV1ZScsXHJcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgcmVjZWl2ZU1lc3NhZ2VXYWl0VGltZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMjApLFxyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogYW5hbHlzaXNRdWV1ZURMUSxcclxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTUVMgUXVldWUgZm9yIHRlc3QgZXhlY3V0aW9uXHJcbiAgICBjb25zdCB0ZXN0RXhlY3V0aW9uRExRID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnVGVzdEV4ZWN1dGlvbkRMUScsIHtcclxuICAgICAgcXVldWVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tdGVzdC1leGVjdXRpb24tZGxxJyxcclxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksIC8vIEtlZXAgZmFpbGVkIG1lc3NhZ2VzIGZvciAxNCBkYXlzXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB0ZXN0RXhlY3V0aW9uUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdUZXN0RXhlY3V0aW9uUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogJ21pc3JhLXBsYXRmb3JtLXRlc3QtZXhlY3V0aW9uJyxcclxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSwgLy8gTWF0Y2ggTGFtYmRhIHRpbWVvdXRcclxuICAgICAgcmVjZWl2ZU1lc3NhZ2VXYWl0VGltZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMjApLCAvLyBMb25nIHBvbGxpbmdcclxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XHJcbiAgICAgICAgcXVldWU6IHRlc3RFeGVjdXRpb25ETFEsXHJcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLCAvLyBSZXRyeSB1cCB0byAzIHRpbWVzIGJlZm9yZSBtb3ZpbmcgdG8gRExRXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZWNyZXRzIE1hbmFnZXIgZm9yIEpXVCBrZXlzXHJcbiAgICBjb25zdCBqd3RTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdKV1RTZWNyZXQnLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1qd3Qtc2VjcmV0JyxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcclxuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZTogJ2p3dCcgfSksXHJcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdzZWNyZXQnLFxyXG4gICAgICAgIGV4Y2x1ZGVDaGFyYWN0ZXJzOiAnXCJAL1xcXFwnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIEF1dGhvcml6ZXIgZm9yIEpXVCB2ZXJpZmljYXRpb25cclxuICAgIGNvbnN0IGF1dGhvcml6ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhvcml6ZXJGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXV0aG9yaXplcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvYXV0aG9yaXplcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBTZWNyZXRzIE1hbmFnZXIgcmVhZCBhY2Nlc3MgdG8gYXV0aG9yaXplclxyXG4gICAgand0U2VjcmV0LmdyYW50UmVhZChhdXRob3JpemVyRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGxvZ2luRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMb2dpbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1sb2dpbicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvbG9naW4nKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBKV1RfU0VDUkVUX05BTUU6IGp3dFNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICAgIE44Tl9XRUJIT09LX1VSTDogcHJvY2Vzcy5lbnYuTjhOX1dFQkhPT0tfVVJMIHx8ICcnLFxyXG4gICAgICAgIE44Tl9BUElfS0VZOiBwcm9jZXNzLmVudi5OOE5fQVBJX0tFWSB8fCAnJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXJlZ2lzdGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9yZWdpc3RlcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgICAgTjhOX1dFQkhPT0tfVVJMOiBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkwgfHwgJycsXHJcbiAgICAgICAgTjhOX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZWZyZXNoRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdSZWZyZXNoRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXJlZnJlc2gnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hdXRoL3JlZnJlc2gnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBKV1RfU0VDUkVUX05BTUU6IGp3dFNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbWFpbCBWZXJpZmljYXRpb24gYW5kIE9UUCBJbnRlZ3JhdGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBpbml0aWF0ZUZsb3dGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0luaXRpYXRlRmxvd0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1pbml0aWF0ZS1mbG93JyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9pbml0aWF0ZS1mbG93JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHZlcmlmeUVtYWlsV2l0aE9UUEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVmVyaWZ5RW1haWxXaXRoT1RQRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXZlcmlmeS1lbWFpbC13aXRoLW90cCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvdmVyaWZ5LWVtYWlsLXdpdGgtb3RwJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tY29tcGxldGUtb3RwLXNldHVwJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9jb21wbGV0ZS1vdHAtc2V0dXAnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICBKV1RfU0VDUkVUX05BTUU6IGp3dFNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGaWxlIFVwbG9hZCBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBmaWxlVXBsb2FkRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdGaWxlVXBsb2FkRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWZpbGUtdXBsb2FkJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS91cGxvYWQnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdkZXYnLFxyXG4gICAgICAgIEFOQUxZU0lTX1FVRVVFX1VSTDogYW5hbHlzaXNRdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBsb2FkQ29tcGxldGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwbG9hZENvbXBsZXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXVwbG9hZC1jb21wbGV0ZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvdXBsb2FkLWNvbXBsZXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUFJPQ0VTU0lOR19RVUVVRV9VUkw6IHByb2Nlc3NpbmdRdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ2RldicsXHJcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46ICcnLCAvLyBXaWxsIGJlIHNldCBhZnRlciB3b3JrZmxvdyBpcyBjcmVhdGVkXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0RmlsZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEZpbGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1maWxlcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvZ2V0LWZpbGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdkZXYnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTYW1wbGUgRmlsZSBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFNhbXBsZUZpbGVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRTYW1wbGVGaWxlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtc2FtcGxlLWZpbGVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS9nZXQtc2FtcGxlLWZpbGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU0FNUExFX0ZJTEVTX1RBQkxFOiBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11cGxvYWQtc2FtcGxlLWZpbGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlL3VwbG9hZC1zYW1wbGUtZmlsZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNBTVBMRV9GSUxFU19UQUJMRTogc2FtcGxlRmlsZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVDogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFOiBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVBMT0FEX1BST0dSRVNTX1RBQkxFOiB1cGxvYWRQcm9ncmVzc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0VXBsb2FkUHJvZ3Jlc3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFVwbG9hZFByb2dyZXNzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC11cGxvYWQtcHJvZ3Jlc3MnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlL2dldC11cGxvYWQtcHJvZ3Jlc3MnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVUExPQURfUFJPR1JFU1NfVEFCTEU6IHVwbG9hZFByb2dyZXNzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxNSksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBpbml0aWFsaXplU2FtcGxlTGlicmFyeUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSW5pdGlhbGl6ZVNhbXBsZUxpYnJhcnlGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0taW5pdGlhbGl6ZS1zYW1wbGUtbGlicmFyeScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvaW5pdGlhbGl6ZS1zYW1wbGUtbGlicmFyeScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNBTVBMRV9GSUxFU19UQUJMRTogc2FtcGxlRmlsZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQcm9qZWN0IE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY3JlYXRlUHJvamVjdEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlUHJvamVjdEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1jcmVhdGUtcHJvamVjdCcsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Byb2plY3RzL2NyZWF0ZS1wcm9qZWN0JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUFJPSkVDVFNfVEFCTEVfTkFNRTogdGVzdFByb2plY3RzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRQcm9qZWN0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UHJvamVjdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZ2V0LXByb2plY3RzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvcHJvamVjdHMvZ2V0LXByb2plY3RzLW1pbmltYWwnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQUk9KRUNUU19UQUJMRV9OQU1FOiB0ZXN0UHJvamVjdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByb2plY3RGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVByb2plY3RGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXBkYXRlLXByb2plY3QnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9wcm9qZWN0cy91cGRhdGUtcHJvamVjdCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFX05BTUU6IHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVGVzdCBTdWl0ZSBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlVGVzdFN1aXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWNyZWF0ZS10ZXN0LXN1aXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvdGVzdC1zdWl0ZXMvY3JlYXRlLXN1aXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9TVUlURVNfVEFCTEVfTkFNRTogdGVzdFN1aXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VGVzdFN1aXRlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtdGVzdC1zdWl0ZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LXN1aXRlcy9nZXQtc3VpdGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9TVUlURVNfVEFCTEVfTkFNRTogdGVzdFN1aXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGRhdGVUZXN0U3VpdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tdXBkYXRlLXRlc3Qtc3VpdGUnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LXN1aXRlcy91cGRhdGUtc3VpdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUZXN0IENhc2UgTWFuYWdlbWVudCBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlVGVzdENhc2VGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tY3JlYXRlLXRlc3QtY2FzZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3QtY2FzZXMvY3JlYXRlLXRlc3QtY2FzZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRUZXN0Q2FzZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFRlc3RDYXNlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1nZXQtdGVzdC1jYXNlcycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3QtY2FzZXMvZ2V0LXRlc3QtY2FzZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVzdENhc2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVRlc3RDYXNlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXVwZGF0ZS10ZXN0LWNhc2UnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LWNhc2VzL3VwZGF0ZS10ZXN0LWNhc2UnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcclxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxvZ2luRnVuY3Rpb24pO1xyXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmVmcmVzaEZ1bmN0aW9uKTtcclxuICAgIGp3dFNlY3JldC5ncmFudFJlYWQobG9naW5GdW5jdGlvbik7XHJcbiAgICBqd3RTZWNyZXQuZ3JhbnRSZWFkKHJlZnJlc2hGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEVtYWlsIHZlcmlmaWNhdGlvbiBhbmQgT1RQIGludGVncmF0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShpbml0aWF0ZUZsb3dGdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh2ZXJpZnlFbWFpbFdpdGhPVFBGdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjb21wbGV0ZU9UUFNldHVwRnVuY3Rpb24pO1xyXG4gICAgand0U2VjcmV0LmdyYW50UmVhZChjb21wbGV0ZU9UUFNldHVwRnVuY3Rpb24pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCBDb2duaXRvIHBlcm1pc3Npb25zIHRvIHRoZSBuZXcgYXV0aCBmdW5jdGlvbnNcclxuICAgIGluaXRpYXRlRmxvd0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdmVyaWZ5RW1haWxXaXRoT1RQRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ29uZmlybVNpZ25VcCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJNRkFQcmVmZXJlbmNlJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZScsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpWZXJpZnlTb2Z0d2FyZVRva2VuJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxyXG4gICAgfSkpO1xyXG4gICAgXHJcbiAgICAvLyBGaWxlIHVwbG9hZCBwZXJtaXNzaW9uc1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZmlsZVVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZCh1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuICAgIHByb2Nlc3NpbmdRdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyh1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuICAgIGFuYWx5c2lzUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMoZmlsZVVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgLy8gRmlsZSBtZXRhZGF0YSBwZXJtaXNzaW9uc1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZpbGVVcGxvYWRGdW5jdGlvbik7XHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBsb2FkQ29tcGxldGVGdW5jdGlvbik7XHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWREYXRhKGdldEZpbGVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFNhbXBsZSBmaWxlIHBlcm1pc3Npb25zXHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0U2FtcGxlRmlsZXNGdW5jdGlvbik7XHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEodXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uKTtcclxuICAgIHNhbXBsZUZpbGVzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGluaXRpYWxpemVTYW1wbGVMaWJyYXJ5RnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uKTtcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGxvYWRTYW1wbGVGaWxlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFVwbG9hZCBwcm9ncmVzcyBwZXJtaXNzaW9uc1xyXG4gICAgdXBsb2FkUHJvZ3Jlc3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uKTtcclxuICAgIHVwbG9hZFByb2dyZXNzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRVcGxvYWRQcm9ncmVzc0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBQcm9qZWN0IG1hbmFnZW1lbnQgcGVybWlzc2lvbnNcclxuICAgIHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVQcm9qZWN0RnVuY3Rpb24pO1xyXG4gICAgdGVzdFByb2plY3RzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQcm9qZWN0c0Z1bmN0aW9uKTtcclxuICAgIHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVQcm9qZWN0RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3Qgc3VpdGUgbWFuYWdlbWVudCBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZXN0U3VpdGVGdW5jdGlvbik7XHJcbiAgICB0ZXN0U3VpdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRUZXN0U3VpdGVzRnVuY3Rpb24pO1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVUZXN0U3VpdGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVzdCBjYXNlIG1hbmFnZW1lbnQgcGVybWlzc2lvbnNcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uKTtcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0VGVzdENhc2VzRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZVRlc3RDYXNlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFJIFRlc3QgR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBhaUFuYWx5emVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJQW5hbHl6ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1haS1hbmFseXplJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2FuYWx5emUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAvLyBUYXNrIDEwLjE6IEFkZCBCZWRyb2NrIGNvbmZpZ3VyYXRpb24gZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgICAgICAgQUlfUFJPVklERVI6IHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIHx8ICdCRURST0NLJyxcclxuICAgICAgICBCRURST0NLX1JFR0lPTjogcHJvY2Vzcy5lbnYuQkVEUk9DS19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogcHJvY2Vzcy5lbnYuQkVEUk9DS19NT0RFTF9JRCB8fCAnYW50aHJvcGljLmNsYXVkZS0zLTUtc29ubmV0LTIwMjQxMDIyLXYyOjAnLFxyXG4gICAgICAgIEJFRFJPQ0tfVElNRU9VVDogcHJvY2Vzcy5lbnYuQkVEUk9DS19USU1FT1VUIHx8ICczMDAwMCcsXHJcbiAgICAgICAgRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORzogcHJvY2Vzcy5lbnYuRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORyB8fCAndHJ1ZScsXHJcbiAgICAgICAgLy8gVGFzayAxMi4xOiBBZGQgY2FuYXJ5IGRlcGxveW1lbnQgdHJhZmZpYyBwZXJjZW50YWdlXHJcbiAgICAgICAgQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0U6IHByb2Nlc3MuZW52LkJFRFJPQ0tfVFJBRkZJQ19QRVJDRU5UQUdFIHx8ICcwJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksIC8vIEJyb3dzZXIgYXV0b21hdGlvbiBjYW4gdGFrZSB0aW1lXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsIC8vIFB1cHBldGVlciBuZWVkcyBtb3JlIG1lbW9yeVxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsIC8vIFRhc2sgOC4zOiBFbmFibGUgWC1SYXkgdHJhY2luZ1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJR2VuZXJhdGVUZXN0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWFpLWdlbmVyYXRlJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2dlbmVyYXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICcnLFxyXG4gICAgICAgIC8vIFRhc2sgMTAuMTogQWRkIEJlZHJvY2sgY29uZmlndXJhdGlvbiBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgICAgICBBSV9QUk9WSURFUjogcHJvY2Vzcy5lbnYuQUlfUFJPVklERVIgfHwgJ0JFRFJPQ0snLFxyXG4gICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBwcm9jZXNzLmVudi5CRURST0NLX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBwcm9jZXNzLmVudi5CRURST0NLX01PREVMX0lEIHx8ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgICAgQkVEUk9DS19USU1FT1VUOiBwcm9jZXNzLmVudi5CRURST0NLX1RJTUVPVVQgfHwgJzMwMDAwJyxcclxuICAgICAgICBFTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HOiBwcm9jZXNzLmVudi5FTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HIHx8ICd0cnVlJyxcclxuICAgICAgICAvLyBUYXNrIDEyLjE6IEFkZCBjYW5hcnkgZGVwbG95bWVudCB0cmFmZmljIHBlcmNlbnRhZ2VcclxuICAgICAgICBCRURST0NLX1RSQUZGSUNfUEVSQ0VOVEFHRTogcHJvY2Vzcy5lbnYuQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgfHwgJzAnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLCAvLyBUYXNrIDguMzogRW5hYmxlIFgtUmF5IHRyYWNpbmdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlCYXRjaEdlbmVyYXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2FpYnRzLWFpLWJhdGNoJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2JhdGNoJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICcnLFxyXG4gICAgICAgIC8vIFRhc2sgMTAuMTogQWRkIEJlZHJvY2sgY29uZmlndXJhdGlvbiBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgICAgICBBSV9QUk9WSURFUjogcHJvY2Vzcy5lbnYuQUlfUFJPVklERVIgfHwgJ0JFRFJPQ0snLFxyXG4gICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBwcm9jZXNzLmVudi5CRURST0NLX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBwcm9jZXNzLmVudi5CRURST0NLX01PREVMX0lEIHx8ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgICAgQkVEUk9DS19USU1FT1VUOiBwcm9jZXNzLmVudi5CRURST0NLX1RJTUVPVVQgfHwgJzMwMDAwJyxcclxuICAgICAgICBFTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HOiBwcm9jZXNzLmVudi5FTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HIHx8ICd0cnVlJyxcclxuICAgICAgICAvLyBUYXNrIDEyLjE6IEFkZCBjYW5hcnkgZGVwbG95bWVudCB0cmFmZmljIHBlcmNlbnRhZ2VcclxuICAgICAgICBCRURST0NLX1RSQUZGSUNfUEVSQ0VOVEFHRTogcHJvY2Vzcy5lbnYuQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgfHwgJzAnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksIC8vIEJhdGNoIHByb2Nlc3NpbmcgY2FuIHRha2UgbG9uZ2VyXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsXHJcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSwgLy8gVGFzayA4LjM6IEVuYWJsZSBYLVJheSB0cmFjaW5nXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhaUdldFVzYWdlU3RhdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdhaWJ0cy1haS11c2FnZScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZXQtdXNhZ2UnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBBSV9VU0FHRV9UQUJMRTogYWlVc2FnZVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBBSSB0ZXN0IGdlbmVyYXRpb24gZnVuY3Rpb25zXHJcbiAgICBhaVVzYWdlVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24pO1xyXG4gICAgYWlVc2FnZVRhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbik7XHJcbiAgICBhaVVzYWdlVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShhaUdldFVzYWdlU3RhdHNGdW5jdGlvbik7XHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbik7XHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24pO1xyXG4gICAgLy8gQmF0Y2ggNCBmdW5jdGlvbnMgdXNlIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgLSBubyBKV1Qgc2VjcmV0IG5lZWRlZFxyXG4gICAgLy8gYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiwgYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24sIGFpR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uXHJcblxyXG4gICAgLy8gQWRkIEJlZHJvY2sgcGVybWlzc2lvbnMgdG8gQUkgTGFtYmRhIGZ1bmN0aW9ucyAoVGFzayA1LjEpXHJcbiAgICAvLyBVc2luZyBpbmZlcmVuY2UgcHJvZmlsZSBmb3IgQ2xhdWRlIFNvbm5ldCA0LjYgKGNyb3NzLXJlZ2lvbiByb3V0aW5nKVxyXG4gICAgY29uc3QgYmVkcm9ja1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2JlZHJvY2s6SW52b2tlTW9kZWwnXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgJ2Fybjphd3M6YmVkcm9jazoqOio6aW5mZXJlbmNlLXByb2ZpbGUvdXMuYW50aHJvcGljLmNsYXVkZS1zb25uZXQtNC02JyxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFpQW5hbHl6ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShiZWRyb2NrUG9saWN5KTtcclxuICAgIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGJlZHJvY2tQb2xpY3kpO1xyXG4gICAgYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGJlZHJvY2tQb2xpY3kpO1xyXG5cclxuICAgIC8vIFRhc2sgNS4yOiBObyBCRURST0NLX0FQSV9LRVkgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgdXNlZFxyXG4gICAgLy8gVGhlIEJlZHJvY2tSdW50aW1lQ2xpZW50IHVzZXMgQVdTIFNESyBkZWZhdWx0IGNyZWRlbnRpYWwgcHJvdmlkZXIgKElBTSByb2xlcylcclxuICAgIFxyXG4gICAgLy8gVGFzayA1LjM6IENsb3VkV2F0Y2ggTG9ncyBwZXJtaXNzaW9ucyBhcmUgYXV0b21hdGljYWxseSBhZGRlZCBieSBDREtcclxuICAgIC8vIENESyBncmFudHMgbG9nczpDcmVhdGVMb2dHcm91cCwgbG9nczpDcmVhdGVMb2dTdHJlYW0sIGFuZCBsb2dzOlB1dExvZ0V2ZW50c1xyXG4gICAgLy8gdG8gYWxsIExhbWJkYSBmdW5jdGlvbnMgYnkgZGVmYXVsdCB0aHJvdWdoIHRoZSBMYW1iZGEgZXhlY3V0aW9uIHJvbGVcclxuXHJcbiAgICAvLyBUYXNrIDguMjogQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBCZWRyb2NrIG1vbml0b3JpbmdcclxuICAgIC8vIEFkZCBDbG91ZFdhdGNoIFB1dE1ldHJpY0RhdGEgcGVybWlzc2lvbiBmb3IgQmVkcm9jayBtb25pdG9yaW5nXHJcbiAgICBjb25zdCBjbG91ZFdhdGNoTWV0cmljc1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YSddLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYWlBbmFseXplRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGNsb3VkV2F0Y2hNZXRyaWNzUG9saWN5KTtcclxuICAgIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGNsb3VkV2F0Y2hNZXRyaWNzUG9saWN5KTtcclxuICAgIGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShjbG91ZFdhdGNoTWV0cmljc1BvbGljeSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBBbGFybTogSGlnaCBFcnJvciBSYXRlICg+MTAgZXJyb3JzIGluIDUgbWludXRlcylcclxuICAgIGNvbnN0IGJlZHJvY2tFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0JlZHJvY2tIaWdoRXJyb3JSYXRlQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ0FJQlRTLUJlZHJvY2stSGlnaEVycm9yUmF0ZScsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgZXJyb3IgcmF0ZSBleGNlZWRzIDEwIGVycm9ycyBpbiA1IG1pbnV0ZXMnLFxyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tFcnJvcnMnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogMTAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBBbGFybTogSGlnaCBMYXRlbmN5ICg+MzAgc2Vjb25kcyBhdmVyYWdlKVxyXG4gICAgY29uc3QgYmVkcm9ja0xhdGVuY3lBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdCZWRyb2NrSGlnaExhdGVuY3lBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnQUlCVFMtQmVkcm9jay1IaWdoTGF0ZW5jeScsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgYXZlcmFnZSBsYXRlbmN5IGV4Y2VlZHMgMzAgc2Vjb25kcycsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0xhdGVuY3knLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDMwMDAwLCAvLyAzMCBzZWNvbmRzIGluIG1pbGxpc2Vjb25kc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggQWxhcm06IEhpZ2ggQ29zdCAoPiQxMDAvZGF5KVxyXG4gICAgLy8gTm90ZTogVGhpcyBhbGFybSBjaGVja3MgaWYgY29zdCBleGNlZWRzICQxMDAgaW4gYSAyNC1ob3VyIHBlcmlvZFxyXG4gICAgY29uc3QgYmVkcm9ja0Nvc3RBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdCZWRyb2NrSGlnaENvc3RBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnQUlCVFMtQmVkcm9jay1IaWdoQ29zdCcsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgY29zdCBleGNlZWRzICQxMDAgcGVyIGRheScsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0Nvc3QnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAsIC8vICQxMDBcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgYWxhcm0gQVJOcyBmb3IgU05TIHRvcGljIHN1YnNjcmlwdGlvbiAob3B0aW9uYWwpXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmVkcm9ja0Vycm9yQWxhcm1Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBiZWRyb2NrRXJyb3JBbGFybS5hbGFybUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdCZWRyb2NrIEhpZ2ggRXJyb3IgUmF0ZSBBbGFybSBBUk4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JlZHJvY2tMYXRlbmN5QWxhcm1Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBiZWRyb2NrTGF0ZW5jeUFsYXJtLmFsYXJtQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0JlZHJvY2sgSGlnaCBMYXRlbmN5IEFsYXJtIEFSTicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmVkcm9ja0Nvc3RBbGFybUFybicsIHtcclxuICAgICAgdmFsdWU6IGJlZHJvY2tDb3N0QWxhcm0uYWxhcm1Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmVkcm9jayBIaWdoIENvc3QgQWxhcm0gQVJOJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgMTI6IENyZWF0ZSBDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgQmVkcm9jayB2cyBPcGVuQUkgY29tcGFyaXNvblxyXG4gICAgY29uc3QgYmVkcm9ja0Rhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnQmVkcm9ja01pZ3JhdGlvbkRhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogJ0FJQlRTLUJlZHJvY2stTWlncmF0aW9uJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB3aWRnZXRzIHRvIGNvbXBhcmUgQmVkcm9jayB2cyBPcGVuQUkgbWV0cmljc1xyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMTogTGF0ZW5jeSBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIExhdGVuY3kgQ29tcGFyaXNvbicsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgQXZnIExhdGVuY3knLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnT3BlbkFJTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ09wZW5BSSBBdmcgTGF0ZW5jeScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJvdyAxOiBFcnJvciBSYXRlIENvbXBhcmlzb25cclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQUkgUHJvdmlkZXIgRXJyb3IgUmF0ZSBDb21wYXJpc29uJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tFcnJvcnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgRXJyb3JzJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSUVycm9ycycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIEVycm9ycycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMjogQ29zdCBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIENvc3QgQ29tcGFyaXNvbiAoMjRoKScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrQ29zdCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIENvc3QnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnT3BlbkFJQ29zdCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdPcGVuQUkgQ29zdCcsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJvdyAyOiBUb2tlbiBVc2FnZSBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIFRva2VuIFVzYWdlJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tUb2tlbnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgVG9rZW5zJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSVRva2VucycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIFRva2VucycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMzogUmVxdWVzdCBDb3VudFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBSSBQcm92aWRlciBSZXF1ZXN0IENvdW50JyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnQmVkcm9jayBSZXF1ZXN0cycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL09wZW5BSScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdPcGVuQUlSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIFJlcXVlc3RzJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgLy8gUm93IDM6IFRyYWZmaWMgRGlzdHJpYnV0aW9uIChDYW5hcnkpXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlNpbmdsZVZhbHVlV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0JlZHJvY2sgVHJhZmZpYyBQZXJjZW50YWdlJyxcclxuICAgICAgICBtZXRyaWNzOiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NYXRoRXhwcmVzc2lvbih7XHJcbiAgICAgICAgICAgIGV4cHJlc3Npb246ICcoYmVkcm9jayAvIChiZWRyb2NrICsgb3BlbmFpKSkgKiAxMDAnLFxyXG4gICAgICAgICAgICB1c2luZ01ldHJpY3M6IHtcclxuICAgICAgICAgICAgICBiZWRyb2NrOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja1JlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICBvcGVuYWk6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSVJlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIFRyYWZmaWMgJScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGRhc2hib2FyZCBVUkxcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCZWRyb2NrRGFzaGJvYXJkVVJMJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vY29uc29sZS5hd3MuYW1hem9uLmNvbS9jbG91ZHdhdGNoL2hvbWU/cmVnaW9uPSR7dGhpcy5yZWdpb259I2Rhc2hib2FyZHM6bmFtZT0ke2JlZHJvY2tEYXNoYm9hcmQuZGFzaGJvYXJkTmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkV2F0Y2ggRGFzaGJvYXJkIGZvciBCZWRyb2NrIE1pZ3JhdGlvbiBNb25pdG9yaW5nJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IHRlc3RFeGVjdXRvckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGVzdEV4ZWN1dG9yRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLXRlc3QtZXhlY3V0b3InLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9leGVjdXRpb25zL2V4ZWN1dG9yJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFNDUkVFTlNIT1RTX0JVQ0tFVF9OQU1FOiBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyBNYXhpbXVtIExhbWJkYSB0aW1lb3V0XHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsIC8vIEluY3JlYXNlZCBtZW1vcnkgZm9yIGJyb3dzZXIgYXV0b21hdGlvblxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgdGVzdCBleGVjdXRvciBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGVzdEV4ZWN1dG9yRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YSh0ZXN0RXhlY3V0b3JGdW5jdGlvbik7XHJcbiAgICBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuZ3JhbnRSZWFkV3JpdGUodGVzdEV4ZWN1dG9yRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEdyYW50IEV2ZW50QnJpZGdlIHBlcm1pc3Npb25zIHRvIHRlc3QgZXhlY3V0b3IgZm9yIHB1Ymxpc2hpbmcgZXZlbnRzXHJcbiAgICAvLyB0ZXN0RXhlY3V0b3JGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgLy8gICBhY3Rpb25zOiBbJ2V2ZW50czpQdXRFdmVudHMnXSxcclxuICAgIC8vICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gRXZlbnRCcmlkZ2UgZGVmYXVsdCBidXNcclxuICAgIC8vIH0pKTtcclxuXHJcbiAgICAvLyBBZGQgU1FTIHRyaWdnZXIgZm9yIHRlc3QgZXhlY3V0b3JcclxuICAgIHRlc3RFeGVjdXRvckZ1bmN0aW9uLmFkZEV2ZW50U291cmNlKFxyXG4gICAgICBuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlNxc0V2ZW50U291cmNlKHRlc3RFeGVjdXRpb25RdWV1ZSwge1xyXG4gICAgICAgIGJhdGNoU2l6ZTogMSwgLy8gUHJvY2VzcyBvbmUgdGVzdCBhdCBhIHRpbWVcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksIC8vIE5vIGJhdGNoaW5nIGRlbGF5XHJcbiAgICAgICAgcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIEVuYWJsZSBwYXJ0aWFsIGJhdGNoIHJlc3BvbnNlc1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbiBUcmlnZ2VyIExhbWJkYVxyXG4gICAgY29uc3QgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS10cmlnZ2VyLWV4ZWN1dGlvbicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvdHJpZ2dlcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OX1FVRVVFX1VSTDogdGVzdEV4ZWN1dGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCB0cmlnZ2VyIGZ1bmN0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YSh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEodHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKTtcclxuICAgIHRlc3RFeGVjdXRpb25RdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIFN0YXR1cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1leGVjdXRpb24tc3RhdHVzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtc3RhdHVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBzdGF0dXMgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25TdGF0dXNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVzdCBFeGVjdXRpb24gUmVzdWx0cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tZ2V0LWV4ZWN1dGlvbi1yZXN1bHRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtcmVzdWx0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBTQ1JFRU5TSE9UU19CVUNLRVRfTkFNRTogc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHJlc3VsdHMgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmdyYW50UmVhZChnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIEhpc3RvcnkgTGFtYmRhXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1leGVjdXRpb24taGlzdG9yeScsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvZ2V0LWhpc3RvcnknKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEVfTkFNRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IGhpc3RvcnkgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgU3VpdGUgUmVzdWx0cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0U3VpdGVSZXN1bHRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1zdWl0ZS1yZXN1bHRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtc3VpdGUtcmVzdWx0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgc3VpdGUgcmVzdWx0cyBmdW5jdGlvbiBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBTMyBldmVudCBub3RpZmljYXRpb24gZm9yIHVwbG9hZCBjb21wbGV0aW9uXHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcclxuICAgICAgczMuRXZlbnRUeXBlLk9CSkVDVF9DUkVBVEVELFxyXG4gICAgICBuZXcgczNuLkxhbWJkYURlc3RpbmF0aW9uKHVwbG9hZENvbXBsZXRlRnVuY3Rpb24pLFxyXG4gICAgICB7IHByZWZpeDogJ3VwbG9hZHMvJyB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIGFuZCBOb3RpZmljYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgYW5hbHlzaXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FuYWx5c2lzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFuYWx5c2lzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYW5hbHlzaXMvYW5hbHl6ZS1maWxlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFOiBhbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfQ0FDSEVfVEFCTEU6IGFuYWx5c2lzQ2FjaGVUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLCAvLyBSZXF1aXJlbWVudCAxMC42OiBTZXQgdGltZW91dCB0byA1IG1pbnV0ZXNcclxuICAgICAgbWVtb3J5U2l6ZTogMjA0OCwgLy8gUmVxdWlyZW1lbnQgMTAuNDogU2V0IG1lbW9yeSB0byAyR0IgZm9yIEFTVCBwYXJzaW5nXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RpZmljYXRpb24gUHJvY2Vzc29yIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOb3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtbm90aWZpY2F0aW9uLXByb2Nlc3NvcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvcHJvY2Vzc29yJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1BSRUZFUkVOQ0VTX1RBQkxFOiBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX0hJU1RPUllfVEFCTEU6IG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgU05TX1RPUElDX0FSTl9FTUFJTDogZW1haWxOb3RpZmljYXRpb25Ub3BpYy50b3BpY0FybixcclxuICAgICAgICBTTlNfVE9QSUNfQVJOX1NNUzogc21zTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgICAgU05TX1RPUElDX0FSTl9XRUJIT09LOiB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgICAgTjhOX0VOQUJMRUQ6IHByb2Nlc3MuZW52Lk44Tl9FTkFCTEVEIHx8ICdmYWxzZScsXHJcbiAgICAgICAgTjhOX1dFQkhPT0tfVVJMOiBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkwgfHwgJycsXHJcbiAgICAgICAgTjhOX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBTUVMgdHJpZ2dlciBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NvclxyXG4gICAgbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24uYWRkRXZlbnRTb3VyY2UoXHJcbiAgICAgIG5ldyBsYW1iZGFFdmVudFNvdXJjZXMuU3FzRXZlbnRTb3VyY2Uobm90aWZpY2F0aW9uUXVldWUsIHtcclxuICAgICAgICBiYXRjaFNpemU6IDEsIC8vIFByb2Nlc3MgMSBtZXNzYWdlIGF0IGEgdGltZSB0byBhdm9pZCBjb25jdXJyZW5jeSBpc3N1ZXNcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIG5vdGlmaWNhdGlvbiBwcm9jZXNzb3JcclxuICAgIG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBlbWFpbE5vdGlmaWNhdGlvblRvcGljLmdyYW50UHVibGlzaChub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBzbXNOb3RpZmljYXRpb25Ub3BpYy5ncmFudFB1Ymxpc2gobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgd2ViaG9va05vdGlmaWNhdGlvblRvcGljLmdyYW50UHVibGlzaChub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVtcGxhdGUgU2VlZGluZyBMYW1iZGEgRnVuY3Rpb25cclxuICAgIGNvbnN0IHNlZWRUZW1wbGF0ZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NlZWRUZW1wbGF0ZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnYWlidHMtc2VlZC10ZW1wbGF0ZXMnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL3NlZWQtdGVtcGxhdGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1RFTVBMQVRFU19UQUJMRTogbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIHNlZWQgdGVtcGxhdGVzIGZ1bmN0aW9uXHJcbiAgICBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoc2VlZFRlbXBsYXRlc0Z1bmN0aW9uKTtcclxuXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ05vdGlmaWNhdGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1ub3RpZmljYXRpb24nLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuICAgICAgICBleHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdOb3RpZmljYXRpb24gZnVuY3Rpb24gaW52b2tlZDonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xyXG4gICAgICAgICAgLy8gUGxhY2Vob2xkZXIgZm9yIG5vdGlmaWNhdGlvbiBsb2dpYyAoZW1haWwsIHdlYmhvb2ssIGV0Yy4pXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdOb3RpZmljYXRpb24gc2VudCBzdWNjZXNzZnVsbHknXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcbiAgICAgIGApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyBmb3IgYW5hbHlzaXMgYW5kIG5vdGlmaWNhdGlvbiBmdW5jdGlvbnNcclxuICAgIGFuYWx5c2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkKGFuYWx5c2lzRnVuY3Rpb24pOyAvLyBSZXF1aXJlbWVudCAxMC40OiBHcmFudCBTMyByZWFkIHBlcm1pc3Npb25zXHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHlzaXNGdW5jdGlvbik7IC8vIFJlcXVpcmVtZW50IDEwLjQ6IEdyYW50IER5bmFtb0RCIHJlYWQvd3JpdGUgcGVybWlzc2lvbnNcclxuICAgIGFuYWx5c2lzQ2FjaGVUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHlzaXNGdW5jdGlvbik7IC8vIFJlcXVpcmVtZW50IDEwLjc6IEdyYW50IGNhY2hlIHRhYmxlIHBlcm1pc3Npb25zXHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEobm90aWZpY2F0aW9uRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFJlcXVpcmVtZW50IDEwLjQ6IENvbm5lY3QgYW5hbHlzaXMgTGFtYmRhIHRvIFNRUyBxdWV1ZVxyXG4gICAgYW5hbHlzaXNGdW5jdGlvbi5hZGRFdmVudFNvdXJjZShcclxuICAgICAgbmV3IGxhbWJkYUV2ZW50U291cmNlcy5TcXNFdmVudFNvdXJjZShhbmFseXNpc1F1ZXVlLCB7XHJcbiAgICAgICAgYmF0Y2hTaXplOiAxLCAvLyBQcm9jZXNzIG9uZSBhbmFseXNpcyBhdCBhIHRpbWVcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksIC8vIE5vIGJhdGNoaW5nIGRlbGF5XHJcbiAgICAgICAgcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIEVuYWJsZSBwYXJ0aWFsIGJhdGNoIHJlc3BvbnNlc1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBRdWVyeSBSZXN1bHRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgcXVlcnlSZXN1bHRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdRdWVyeVJlc3VsdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiAnbWlzcmEtcGxhdGZvcm0tcXVlcnktcmVzdWx0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL3F1ZXJ5LXJlc3VsdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogdGhpcy5zdGFja05hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgU3RhdHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCB1c2VyU3RhdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VzZXJTdGF0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXN0YXRzJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYW5hbHlzaXMvZ2V0LXVzZXItc3RhdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogdGhpcy5zdGFja05hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBSZXBvcnQgTGFtYmRhIEZ1bmN0aW9uIGZvciBQREYgcmVwb3J0IGdlbmVyYXRpb25cclxuICAgIGNvbnN0IGdldFJlcG9ydEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UmVwb3J0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWdldC1yZXBvcnQnLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hbmFseXNpcy9nZXQtcmVwb3J0JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHF1ZXJ5IGFuZCBzdGF0cyBmdW5jdGlvbnMgYWNjZXNzIHRvIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEocXVlcnlSZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkRGF0YSh1c2VyU3RhdHNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gR3JhbnQgZ2V0LXJlcG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9ucyAoVGFzayAzLjIpXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGdldFJlcG9ydEZ1bmN0aW9uKTtcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZERhdGEoZ2V0UmVwb3J0RnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZ2V0UmVwb3J0RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIFN0YXR1cyBMYW1iZGEgRnVuY3Rpb24gKFRhc2sgNS4yKVxyXG4gICAgY29uc3QgYW5hbHlzaXNTdGF0dXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FuYWx5c2lzU3RhdHVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ21pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLXN0YXR1cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL3N0YXR1cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgYW5hbHlzaXMgc3RhdHVzIGZ1bmN0aW9uIGFjY2VzcyB0byBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGFuYWx5c2lzU3RhdHVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFJIEluc2lnaHRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgYWlJbnNpZ2h0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlJbnNpZ2h0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1haS1pbnNpZ2h0cycsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpL2dlbmVyYXRlLWluc2lnaHRzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHRoaXMuc3RhY2tOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IEFJIGluc2lnaHRzIGZ1bmN0aW9uIGFjY2VzcyB0byBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGFpSW5zaWdodHNGdW5jdGlvbik7XHJcbiAgICAvLyBhaUluc2lnaHRzRnVuY3Rpb24gdXNlcyBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IC0gbm8gSldUIHNlY3JldCBuZWVkZWRcclxuXHJcbiAgICAvLyBDcmVhdGUgU3RlcCBGdW5jdGlvbnMgd29ya2Zsb3cgZm9yIGFuYWx5c2lzIG9yY2hlc3RyYXRpb25cclxuICAgIC8vIFRPRE86IFJlLWVuYWJsZSBBbmFseXNpc1dvcmtmbG93IHdoZW4gdGhlIG1vZHVsZSBpcyBhdmFpbGFibGVcclxuICAgIC8vIGNvbnN0IHdvcmtmbG93ID0gbmV3IEFuYWx5c2lzV29ya2Zsb3codGhpcywgJ0FuYWx5c2lzV29ya2Zsb3cnLCB7XHJcbiAgICAvLyAgIGVudmlyb25tZW50OiB0aGlzLnN0YWNrTmFtZSxcclxuICAgIC8vICAgYW5hbHlzaXNGdW5jdGlvbixcclxuICAgIC8vICAgbm90aWZpY2F0aW9uRnVuY3Rpb24sXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICAvLyBVcGRhdGUgdXBsb2FkLWNvbXBsZXRlIGZ1bmN0aW9uIHdpdGggd29ya2Zsb3cgQVJOXHJcbiAgICAvLyB1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uLmFkZEVudmlyb25tZW50KCdTVEFURV9NQUNISU5FX0FSTicsIHdvcmtmbG93LnN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCB1cGxvYWQtY29tcGxldGUgZnVuY3Rpb24gcGVybWlzc2lvbiB0byBzdGFydCB3b3JrZmxvdyBleGVjdXRpb25zXHJcbiAgICAvLyB3b3JrZmxvdy5zdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSB3aXRoIGN1c3RvbSBkb21haW5cclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgJ01pc3JhUGxhdGZvcm1BcGknLCB7XHJcbiAgICAgIGFwaU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hcGknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIFJFU1QgQVBJJyxcclxuICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkdFVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUE9TVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUFVULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBjdXN0b20gZG9tYWluIGZvciBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgYXBpRG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ0FwaUN1c3RvbURvbWFpbicsIHtcclxuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluLFxyXG4gICAgICBjZXJ0aWZpY2F0ZTogYXBpQ2VydGlmaWNhdGUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNYXAgdGhlIGN1c3RvbSBkb21haW4gdG8gdGhlIEFQSSBHYXRld2F5IHN0YWdlXHJcbiAgICBuZXcgYXBpZ2F0ZXdheS5BcGlNYXBwaW5nKHRoaXMsICdBcGlNYXBwaW5nJywge1xyXG4gICAgICBhcGk6IGFwaSxcclxuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluTmFtZSxcclxuICAgICAgc3RhZ2U6IGFwaS5kZWZhdWx0U3RhZ2UhLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFJvdXRlNTMgQSByZWNvcmQgZm9yIEFQSSBkb21haW5cclxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FwaUFsaWFzUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBhcGlEb21haW4sXHJcbiAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxyXG4gICAgICAgIG5ldyByb3V0ZTUzdGFyZ2V0cy5BcGlHYXRld2F5djJEb21haW5Qcm9wZXJ0aWVzKFxyXG4gICAgICAgICAgYXBpRG9tYWluTmFtZS5yZWdpb25hbERvbWFpbk5hbWUsXHJcbiAgICAgICAgICBhcGlEb21haW5OYW1lLnJlZ2lvbmFsSG9zdGVkWm9uZUlkXHJcbiAgICAgICAgKVxyXG4gICAgICApLFxyXG4gICAgICBjb21tZW50OiAnQVBJIEdhdGV3YXkgY3VzdG9tIGRvbWFpbiBmb3IgTUlTUkEgUGxhdGZvcm0gQVBJJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBIVFRQIEFQSSBMYW1iZGEgQXV0aG9yaXplciBmb3IgSldUIHZlcmlmaWNhdGlvblxyXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhdXRob3JpemVycy5IdHRwTGFtYmRhQXV0aG9yaXplcignSldUQXV0aG9yaXplcicsIGF1dGhvcml6ZXJGdW5jdGlvbiwge1xyXG4gICAgICBhdXRob3JpemVyTmFtZTogJ2p3dC1hdXRob3JpemVyJyxcclxuICAgICAgaWRlbnRpdHlTb3VyY2U6IFsnJHJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nXSxcclxuICAgICAgcmVzcG9uc2VUeXBlczogW2F1dGhvcml6ZXJzLkh0dHBMYW1iZGFSZXNwb25zZVR5cGUuU0lNUExFXSxcclxuICAgICAgcmVzdWx0c0NhY2hlVHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLCAvLyA1IG1pbnV0ZXNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhdXRoZW50aWNhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvbG9naW4nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0xvZ2luSW50ZWdyYXRpb24nLCBsb2dpbkZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9yZWdpc3RlcicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVnaXN0ZXJJbnRlZ3JhdGlvbicsIHJlZ2lzdGVyRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZnJlc2gnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlZnJlc2hJbnRlZ3JhdGlvbicsIHJlZnJlc2hGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBlbWFpbCB2ZXJpZmljYXRpb24gYW5kIE9UUCBpbnRlZ3JhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvaW5pdGlhdGUtZmxvdycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignSW5pdGlhdGVGbG93SW50ZWdyYXRpb24nLCBpbml0aWF0ZUZsb3dGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvdmVyaWZ5LWVtYWlsLXdpdGgtb3RwJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdWZXJpZnlFbWFpbFdpdGhPVFBJbnRlZ3JhdGlvbicsIHZlcmlmeUVtYWlsV2l0aE9UUEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9jb21wbGV0ZS1vdHAtc2V0dXAnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NvbXBsZXRlT1RQU2V0dXBJbnRlZ3JhdGlvbicsIGNvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBmaWxlIHVwbG9hZCByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2ZpbGVzL3VwbG9hZCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmlsZVVwbG9hZEludGVncmF0aW9uJywgZmlsZVVwbG9hZEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RmlsZXNJbnRlZ3JhdGlvbicsIGdldEZpbGVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgc2FtcGxlIGZpbGUgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcy9zYW1wbGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFNhbXBsZUZpbGVzSW50ZWdyYXRpb24nLCBnZXRTYW1wbGVGaWxlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkLXNhbXBsZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBsb2FkU2FtcGxlRmlsZUludGVncmF0aW9uJywgdXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkLXByb2dyZXNzL3tmaWxlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFVwbG9hZFByb2dyZXNzSW50ZWdyYXRpb24nLCBnZXRVcGxvYWRQcm9ncmVzc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvaW5pdGlhbGl6ZS1zYW1wbGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdJbml0aWFsaXplU2FtcGxlTGlicmFyeUludGVncmF0aW9uJywgaW5pdGlhbGl6ZVNhbXBsZUxpYnJhcnlGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhbmFseXNpcyBxdWVyeSByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3F1ZXJ5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1F1ZXJ5UmVzdWx0c0ludGVncmF0aW9uJywgcXVlcnlSZXN1bHRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgdXNlciBzdGF0cyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3N0YXRzL3t1c2VySWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VzZXJTdGF0c0ludGVncmF0aW9uJywgdXNlclN0YXRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYW5hbHlzaXMgc3RhdHVzIHJvdXRlIChUYXNrIDUuMilcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3thbmFseXNpc0lkfS9zdGF0dXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQW5hbHlzaXNTdGF0dXNJbnRlZ3JhdGlvbicsIGFuYWx5c2lzU3RhdHVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgcmVwb3J0IGRvd25sb2FkIHJvdXRlIChUYXNrIDMuMylcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3JlcG9ydHMve2ZpbGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UmVwb3J0SW50ZWdyYXRpb24nLCBnZXRSZXBvcnRGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBBSSBpbnNpZ2h0cyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpL2luc2lnaHRzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUluc2lnaHRzSW50ZWdyYXRpb24nLCBhaUluc2lnaHRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgcHJvamVjdCBtYW5hZ2VtZW50IHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVByb2plY3RJbnRlZ3JhdGlvbicsIGNyZWF0ZVByb2plY3RGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2plY3RzSW50ZWdyYXRpb24nLCBnZXRQcm9qZWN0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMve3Byb2plY3RJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlUHJvamVjdEludGVncmF0aW9uJywgdXBkYXRlUHJvamVjdEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRlc3Qgc3VpdGUgbWFuYWdlbWVudCByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0U3VpdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdFN1aXRlc0ludGVncmF0aW9uJywgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMve3N1aXRlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RTdWl0ZUludGVncmF0aW9uJywgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgdGVzdCBjYXNlIG1hbmFnZW1lbnQgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0Q2FzZUludGVncmF0aW9uJywgY3JlYXRlVGVzdENhc2VGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdENhc2VzSW50ZWdyYXRpb24nLCBnZXRUZXN0Q2FzZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMve3Rlc3RDYXNlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RDYXNlSW50ZWdyYXRpb24nLCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRlc3QgZXhlY3V0aW9uIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy90cmlnZ2VyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdUcmlnZ2VyRXhlY3V0aW9uSW50ZWdyYXRpb24nLCB0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0vc3RhdHVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvblN0YXR1c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RXhlY3V0aW9uUmVzdWx0c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy9oaXN0b3J5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvbkhpc3RvcnlJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvc3VpdGVzL3tzdWl0ZUV4ZWN1dGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRTdWl0ZVJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIG5vdGlmaWNhdGlvbiBwcmVmZXJlbmNlcyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvcHJlZmVyZW5jZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIGdldFByZWZlcmVuY2VzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3ByZWZlcmVuY2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVQcmVmZXJlbmNlc0ludGVncmF0aW9uJywgdXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBub3RpZmljYXRpb24gaGlzdG9yeSByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvaGlzdG9yeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRIaXN0b3J5SW50ZWdyYXRpb24nLCBnZXRIaXN0b3J5RnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL2hpc3Rvcnkve25vdGlmaWNhdGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXROb3RpZmljYXRpb25JbnRlZ3JhdGlvbicsIGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIG5vdGlmaWNhdGlvbiB0ZW1wbGF0ZSByb3V0ZXMgKGFkbWluIG9ubHkpXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcy97dGVtcGxhdGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIHVwZGF0ZVRlbXBsYXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRUZW1wbGF0ZXNJbnRlZ3JhdGlvbicsIGdldFRlbXBsYXRlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEFJIHRlc3QgZ2VuZXJhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9hbmFseXplJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUFuYWx5emVJbnRlZ3JhdGlvbicsIGFpQW5hbHl6ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYWktdGVzdC1nZW5lcmF0aW9uL2dlbmVyYXRlJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUdlbmVyYXRlVGVzdEludGVncmF0aW9uJywgYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9iYXRjaCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQUlCYXRjaEdlbmVyYXRlSW50ZWdyYXRpb24nLCBhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi91c2FnZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUdldFVzYWdlU3RhdHNJbnRlZ3JhdGlvbicsIGFpR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCB2YWx1ZXNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgZmlsZSBzdG9yYWdlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZEJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmcm9udGVuZEJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgZnJvbnRlbmQgaG9zdGluZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbkRvbWFpbicsIHtcclxuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGRvbWFpbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRDdXN0b21Eb21haW4nLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3Byb2R1Y3Rpb25Eb21haW59YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIGZyb250ZW5kIFVSTCB3aXRoIGN1c3RvbSBkb21haW4nLFxyXG4gICAgICBleHBvcnROYW1lOiAnbWlzcmEtcGxhdGZvcm0tZnJvbnRlbmQtdXJsJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlDdXN0b21Eb21haW5VcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2FwaURvbWFpbn1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gQVBJIFVSTCB3aXRoIGN1c3RvbSBkb21haW4nLFxyXG4gICAgICBleHBvcnROYW1lOiAnbWlzcmEtcGxhdGZvcm0tYXBpLXVybCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvY2Vzc2luZ1F1ZXVlVXJsJywge1xyXG4gICAgICB2YWx1ZTogcHJvY2Vzc2luZ1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBmb3IgcHJvY2Vzc2luZyBqb2JzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUZXN0RXhlY3V0aW9uUXVldWVVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0ZXN0RXhlY3V0aW9uUXVldWUucXVldWVVcmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU1FTIHF1ZXVlIGZvciB0ZXN0IGV4ZWN1dGlvbiBqb2JzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xyXG4gICAgICB2YWx1ZTogYXBpLmFwaUVuZHBvaW50LFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGVzdEV4ZWN1dGlvbnNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgdGVzdCBleGVjdXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTY3JlZW5zaG90c0J1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgZm9yIHRlc3QgZXhlY3V0aW9uIHNjcmVlbnNob3RzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOb3RpZmljYXRpb25RdWV1ZVVybCcsIHtcclxuICAgICAgdmFsdWU6IG5vdGlmaWNhdGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VtYWlsTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBlbWFpbE5vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyB0b3BpYyBmb3IgZW1haWwgbm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU21zTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBzbXNOb3RpZmljYXRpb25Ub3BpYy50b3BpY0FybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTTlMgdG9waWMgZm9yIFNNUyBub3RpZmljYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJob29rTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU05TIHRvcGljIGZvciB3ZWJob29rIG5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FJVXNhZ2VUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBhaVVzYWdlVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciBBSSB1c2FnZSB0cmFja2luZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIEFsYXJtcyBmb3IgTm90aWZpY2F0aW9uIFN5c3RlbVxyXG4gICAgLy8gQWxhcm0gZm9yIERMUSBkZXB0aCA+IDAgKGluZGljYXRlcyBmYWlsZWQgbm90aWZpY2F0aW9ucylcclxuICAgIGNvbnN0IGRscUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ05vdGlmaWNhdGlvbkRMUUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb24tZGxxLWRlcHRoJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gbm90aWZpY2F0aW9uIERMUSBoYXMgbWVzc2FnZXMgKGZhaWxlZCBub3RpZmljYXRpb25zKScsXHJcbiAgICAgIG1ldHJpYzogbm90aWZpY2F0aW9uRExRLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoKSxcclxuICAgICAgdGhyZXNob2xkOiAwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsYXJtIGZvciBxdWV1ZSBkZXB0aCA+IDEwMDAgKGluZGljYXRlcyBwcm9jZXNzaW5nIGJhY2tsb2cpXHJcbiAgICBjb25zdCBxdWV1ZURlcHRoQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnTm90aWZpY2F0aW9uUXVldWVEZXB0aEFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdhaWJ0cy1ub3RpZmljYXRpb24tcXVldWUtZGVwdGgnLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnQgd2hlbiBub3RpZmljYXRpb24gcXVldWUgZGVwdGggZXhjZWVkcyAxMDAwIG1lc3NhZ2VzJyxcclxuICAgICAgbWV0cmljOiBub3RpZmljYXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNWaXNpYmxlKCksXHJcbiAgICAgIHRocmVzaG9sZDogMTAwMCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NvciBMYW1iZGEgZXJyb3JzXHJcbiAgICBjb25zdCBwcm9jZXNzb3JFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ05vdGlmaWNhdGlvblByb2Nlc3NvckVycm9yQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogJ2FpYnRzLW5vdGlmaWNhdGlvbi1wcm9jZXNzb3ItZXJyb3JzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gbm90aWZpY2F0aW9uIHByb2Nlc3NvciBMYW1iZGEgaGFzIGVycm9ycycsXHJcbiAgICAgIG1ldHJpYzogbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24ubWV0cmljRXJyb3JzKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsYXJtIGZvciBzY2hlZHVsZWQgcmVwb3J0cyBMYW1iZGEgZXJyb3JzXHJcbiAgICBjb25zdCBzY2hlZHVsZWRSZXBvcnRzRXJyb3JBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTY2hlZHVsZWRSZXBvcnRzRXJyb3JBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnYWlidHMtc2NoZWR1bGVkLXJlcG9ydHMtZXJyb3JzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gc2NoZWR1bGVkIHJlcG9ydHMgTGFtYmRhIGhhcyBlcnJvcnMnLFxyXG4gICAgICBtZXRyaWM6IHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxhcm0gZm9yIFNOUyBkZWxpdmVyeSBmYWlsdXJlcyAoZW1haWwpXHJcbiAgICBjb25zdCBzbnNFbWFpbEZhaWx1cmVBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTTlNFbWFpbEZhaWx1cmVBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiAnYWlidHMtc25zLWVtYWlsLWZhaWx1cmVzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gU05TIGVtYWlsIGRlbGl2ZXJ5IGZhaWxzJyxcclxuICAgICAgbWV0cmljOiBlbWFpbE5vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0ZhaWxlZCh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3IgU05TIGRlbGl2ZXJ5IGZhaWx1cmVzIChTTVMpXHJcbiAgICBjb25zdCBzbnNTbXNGYWlsdXJlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU05TU21zRmFpbHVyZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6ICdhaWJ0cy1zbnMtc21zLWZhaWx1cmVzJyxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gU05TIFNNUyBkZWxpdmVyeSBmYWlscycsXHJcbiAgICAgIG1ldHJpYzogc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggRGFzaGJvYXJkIGZvciBOb3RpZmljYXRpb24gU3lzdGVtXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25EYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ05vdGlmaWNhdGlvbkRhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogJ0FJQlRTLU5vdGlmaWNhdGlvbi1TeXN0ZW0nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHdpZGdldHMgdG8gZGFzaGJvYXJkXHJcbiAgICBub3RpZmljYXRpb25EYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgLy8gUXVldWUgbWV0cmljc1xyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdOb3RpZmljYXRpb24gUXVldWUgRGVwdGgnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblF1ZXVlLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ01lc3NhZ2VzIFZpc2libGUnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBub3RpZmljYXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNOb3RWaXNpYmxlKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdNZXNzYWdlcyBJbiBGbGlnaHQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdETFEgRGVwdGggKEZhaWxlZCBOb3RpZmljYXRpb25zKScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbm90aWZpY2F0aW9uRExRLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCBNZXNzYWdlcycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgbm90aWZpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIC8vIExhbWJkYSBtZXRyaWNzXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ05vdGlmaWNhdGlvbiBQcm9jZXNzb3IgUGVyZm9ybWFuY2UnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0ludm9jYXRpb25zKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0Vycm9ycyh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRXJyb3JzJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmlnaHQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0R1cmF0aW9uKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEdXJhdGlvbicsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdTY2hlZHVsZWQgUmVwb3J0cyBQZXJmb3JtYW5jZScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uLm1ldHJpY0ludm9jYXRpb25zKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0Vycm9ycycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICBzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24ubWV0cmljRHVyYXRpb24oe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0R1cmF0aW9uJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgbm90aWZpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIC8vIFNOUyBkZWxpdmVyeSBtZXRyaWNzXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1NOUyBFbWFpbCBEZWxpdmVyeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk1lc3NhZ2VzUHVibGlzaGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdQdWJsaXNoZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBlbWFpbE5vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0RlbGl2ZXJlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRGVsaXZlcmVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNGYWlsZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiA4LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU05TIFNNUyBEZWxpdmVyeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZNZXNzYWdlc1B1Ymxpc2hlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnUHVibGlzaGVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRGVsaXZlcmVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEZWxpdmVyZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBzbXNOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNGYWlsZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiA4LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU05TIFdlYmhvb2sgRGVsaXZlcnknLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIHdlYmhvb2tOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk1lc3NhZ2VzUHVibGlzaGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdQdWJsaXNoZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRGVsaXZlcmVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEZWxpdmVyZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdGYWlsZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogOCxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGRhc2hib2FyZCBVUkxcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOb3RpZmljYXRpb25EYXNoYm9hcmRVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly9jb25zb2xlLmF3cy5hbWF6b24uY29tL2Nsb3Vkd2F0Y2gvaG9tZT9yZWdpb249JHt0aGlzLnJlZ2lvbn0jZGFzaGJvYXJkczpuYW1lPSR7bm90aWZpY2F0aW9uRGFzaGJvYXJkLmRhc2hib2FyZE5hbWV9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgTm90aWZpY2F0aW9uIFN5c3RlbScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2duaXRvIG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtaWQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtY2xpZW50LWlkJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbEFybicsIHtcclxuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtYXJuJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4iXX0=