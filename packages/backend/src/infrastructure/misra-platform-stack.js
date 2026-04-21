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
const screenshots_bucket_1 = require("./screenshots-bucket");
const notification_preferences_table_1 = require("./notification-preferences-table");
const notification_templates_table_1 = require("./notification-templates-table");
const notification_history_table_1 = require("./notification-history-table");
const analysis_cache_table_1 = require("./analysis-cache-table");
class MisraPlatformStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Get environment from props or default to 'production'
        const environment = props?.environment || 'production';
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
            bucketName: `misra-platform-files-${environment}-${this.account}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
        });
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `misra-platform-frontend-${environment}-${this.account}`,
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
            userPoolName: `misra-platform-users-${environment}`,
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
            userPoolClientName: `misra-platform-web-client-${environment}`,
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
            tableName: `misra-platform-users-${environment}`,
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
            tableName: `misra-platform-analyses-${environment}`,
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
            tableName: `misra-platform-test-runs-${environment}`,
            partitionKey: { name: 'testRunId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
        });
        // Analysis Results Table for storing detailed MISRA analysis results
        const analysisResultsTable = new dynamodb.Table(this, 'AnalysisResultsTable', {
            tableName: `misra-platform-analysis-results-${environment}`,
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
            environment: environment
        });
        // Sample Files Table for storing predefined C/C++ files with known MISRA violations
        const sampleFilesTable = { table: dynamodb.Table.fromTableName(this, 'ExistingSampleFilesTable', 'SampleFiles') };
        // Upload Progress Table for tracking file upload progress
        const uploadProgressTable = new upload_progress_table_1.UploadProgressTable(this, 'UploadProgressTable', { environment: environment });
        // Projects Table for Web App Testing System - Using existing TestProjects table
        const testProjectsTable = { table: projectsTable };
        // Test Suites Table for Web App Testing System - Import existing table
        const testSuitesTable = { table: dynamodb.Table.fromTableName(this, 'ExistingTestSuitesTable', 'TestSuites') };
        // Test Cases Table for Web App Testing System - Import existing table
        const testCasesTable = { table: dynamodb.Table.fromTableName(this, 'ExistingTestCasesTable', 'TestCases') };
        // Test Executions Table for Web App Testing System - Import existing table
        const testExecutionsTable = { table: dynamodb.Table.fromTableName(this, 'ExistingTestExecutionsTable', 'TestExecutions') };
        // Screenshots Bucket for Test Execution Failures
        const screenshotsBucket = new screenshots_bucket_1.ScreenshotsBucket(this, 'ScreenshotsBucket', {
            environment: environment
        });
        // Notification System Tables
        const notificationPreferencesTable = new notification_preferences_table_1.NotificationPreferencesTable(this, 'NotificationPreferencesTable', {
            environment: environment
        });
        const notificationTemplatesTable = new notification_templates_table_1.NotificationTemplatesTable(this, 'NotificationTemplatesTable', {
            environment: environment
        });
        const notificationHistoryTable = new notification_history_table_1.NotificationHistoryTable(this, 'NotificationHistoryTable', {
            environment: environment
        });
        // AI Usage Table for AI Test Generation - Import existing table
        const aiUsageTable = { table: dynamodb.Table.fromTableName(this, 'ExistingAIUsageTable', 'AIUsage') };
        // Analysis Cache Table for MISRA analysis caching (Requirement 10.7)
        const analysisCacheTable = new analysis_cache_table_1.AnalysisCacheTable(this, 'AnalysisCacheTable', {
            environment: environment
        });
        // SNS Topics for Notification Delivery
        const emailNotificationTopic = new sns.Topic(this, 'EmailNotificationTopic', {
            topicName: `aibts-notifications-email-${environment}`,
            displayName: 'AIBTS Email Notifications',
        });
        const smsNotificationTopic = new sns.Topic(this, 'SmsNotificationTopic', {
            topicName: `aibts-notifications-sms-${environment}`,
            displayName: 'AIBTS SMS Notifications',
        });
        const webhookNotificationTopic = new sns.Topic(this, 'WebhookNotificationTopic', {
            topicName: `aibts-notifications-webhook-${environment}`,
            displayName: 'AIBTS Webhook Notifications',
        });
        // SQS Queue for notification processing
        const notificationDLQ = new sqs.Queue(this, 'NotificationDLQ', {
            queueName: `aibts-notification-dlq-${environment}`,
            retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
        });
        const notificationQueue = new sqs.Queue(this, 'NotificationQueue', {
            queueName: `aibts-notification-queue-${environment}`,
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
            ruleName: `aibts-test-execution-completion-${environment}`,
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
            functionName: `aibts-scheduled-reports-${environment}`,
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
            ruleName: `aibts-daily-summary-report-${environment}`,
            description: 'Triggers daily test execution summary report',
            schedule: events.Schedule.cron({
                minute: '0',
                hour: '9',
            }),
        });
        dailyReportRule.addTarget(new targets.LambdaFunction(scheduledReportsFunction));
        // Weekly Report - 09:00 UTC every Monday
        const weeklyReportRule = new events.Rule(this, 'WeeklyReportRule', {
            ruleName: `aibts-weekly-summary-report-${environment}`,
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
            functionName: `aibts-get-preferences-${environment}`,
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
            functionName: `aibts-update-preferences-${environment}`,
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
            functionName: `aibts-get-history-${environment}`,
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
            functionName: `aibts-get-notification-${environment}`,
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
            functionName: `aibts-create-template-${environment}`,
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
            functionName: `aibts-update-template-${environment}`,
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
            functionName: `aibts-get-templates-${environment}`,
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
            queueName: `misra-platform-processing-${environment}`,
            visibilityTimeout: cdk.Duration.minutes(15),
            deadLetterQueue: {
                queue: new sqs.Queue(this, 'ProcessingDLQ', {
                    queueName: `misra-platform-processing-dlq-${environment}`,
                }),
                maxReceiveCount: 3,
            },
        });
        // SQS Queue for MISRA analysis (Requirement 10.5)
        const analysisQueueDLQ = new sqs.Queue(this, 'AnalysisQueueDLQ', {
            queueName: `misra-analysis-dlq-${environment}`,
            retentionPeriod: cdk.Duration.days(14),
        });
        const analysisQueue = new sqs.Queue(this, 'AnalysisQueue', {
            queueName: `misra-analysis-queue-${environment}`,
            visibilityTimeout: cdk.Duration.minutes(5),
            receiveMessageWaitTime: cdk.Duration.seconds(20),
            deadLetterQueue: {
                queue: analysisQueueDLQ,
                maxReceiveCount: 3,
            },
        });
        // SQS Queue for test execution
        const testExecutionDLQ = new sqs.Queue(this, 'TestExecutionDLQ', {
            queueName: `misra-platform-test-execution-dlq-${environment}`,
            retentionPeriod: cdk.Duration.days(14), // Keep failed messages for 14 days
        });
        const testExecutionQueue = new sqs.Queue(this, 'TestExecutionQueue', {
            queueName: `misra-platform-test-execution-${environment}`,
            visibilityTimeout: cdk.Duration.minutes(15), // Match Lambda timeout
            receiveMessageWaitTime: cdk.Duration.seconds(20), // Long polling
            deadLetterQueue: {
                queue: testExecutionDLQ,
                maxReceiveCount: 3, // Retry up to 3 times before moving to DLQ
            },
        });
        // Secrets Manager for JWT keys
        const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
            secretName: `misra-platform-jwt-secret-${environment}`,
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'jwt' }),
                generateStringKey: 'secret',
                excludeCharacters: '"@/\\',
            },
        });
        // Lambda Authorizer for JWT verification
        const authorizerFunction = new lambda.Function(this, 'AuthorizerFunction', {
            functionName: `misra-platform-authorizer-${environment}`,
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
            functionName: `misra-platform-login-${environment}`,
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
            functionName: `misra-platform-register-${environment}`,
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
            functionName: `misra-platform-refresh-${environment}`,
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
            functionName: `misra-platform-initiate-flow-${environment}`,
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
            functionName: `misra-platform-verify-email-with-otp-${environment}`,
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
            functionName: `misra-platform-complete-otp-setup-${environment}`,
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
            functionName: `misra-platform-file-upload-${environment}`,
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
            functionName: `misra-platform-upload-complete-${environment}`,
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
            functionName: `misra-platform-get-files-${environment}`,
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
            functionName: `misra-platform-get-sample-files-${environment}`,
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
            functionName: `misra-platform-upload-sample-file-${environment}`,
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
            functionName: `misra-platform-get-upload-progress-${environment}`,
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
            functionName: `misra-platform-initialize-sample-library-${environment}`,
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
            functionName: `misra-platform-create-project-${environment}`,
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
            functionName: `misra-platform-get-projects-${environment}`,
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
            functionName: `misra-platform-update-project-${environment}`,
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
            functionName: `misra-platform-create-test-suite-${environment}`,
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
            functionName: `misra-platform-get-test-suites-${environment}`,
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
            functionName: `misra-platform-update-test-suite-${environment}`,
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
            functionName: `misra-platform-create-test-case-${environment}`,
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
            functionName: `misra-platform-get-test-cases-${environment}`,
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
            functionName: `misra-platform-update-test-case-${environment}`,
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
            functionName: `aibts-ai-analyze-${environment}`,
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
            functionName: `aibts-ai-generate-${environment}`,
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
            functionName: `aibts-ai-batch-${environment}`,
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
            functionName: `aibts-ai-usage-${environment}`,
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
            alarmName: `AIBTS-Bedrock-HighErrorRate-${environment}`,
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
            alarmName: `AIBTS-Bedrock-HighLatency-${environment}`,
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
            alarmName: `AIBTS-Bedrock-HighCost-${environment}`,
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
            dashboardName: `AIBTS-Bedrock-Migration-${environment}`,
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
            functionName: `misra-platform-test-executor-${environment}`,
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
            functionName: `misra-platform-trigger-execution-${environment}`,
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
            functionName: `misra-platform-get-execution-status-${environment}`,
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
            functionName: `misra-platform-get-execution-results-${environment}`,
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
            functionName: `misra-platform-get-execution-history-${environment}`,
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
            functionName: `misra-platform-get-suite-results-${environment}`,
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
            functionName: `misra-platform-analysis-${environment}`,
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
            functionName: `aibts-notification-processor-${environment}`,
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
            functionName: `aibts-seed-templates-${environment}`,
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
            functionName: `misra-platform-notification-${environment}`,
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
            functionName: `misra-platform-query-results-${environment}`,
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
            functionName: `misra-platform-user-stats-${environment}`,
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
            functionName: `misra-platform-get-report-${environment}`,
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
            functionName: `misra-platform-analysis-status-${environment}`,
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
            functionName: `misra-platform-ai-insights-${environment}`,
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
            apiName: `misra-platform-api-${environment}`,
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
            exportName: `misra-platform-frontend-url-${environment}`,
        });
        new cdk.CfnOutput(this, 'ApiCustomDomainUrl', {
            value: `https://${apiDomain}`,
            description: 'Production API URL with custom domain',
            exportName: `misra-platform-api-url-${environment}`,
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
            alarmName: `aibts-notification-dlq-depth-${environment}`,
            alarmDescription: 'Alert when notification DLQ has messages (failed notifications)',
            metric: notificationDLQ.metricApproximateNumberOfMessagesVisible(),
            threshold: 0,
            evaluationPeriods: 1,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Alarm for queue depth > 1000 (indicates processing backlog)
        const queueDepthAlarm = new cloudwatch.Alarm(this, 'NotificationQueueDepthAlarm', {
            alarmName: `aibts-notification-queue-depth-${environment}`,
            alarmDescription: 'Alert when notification queue depth exceeds 1000 messages',
            metric: notificationQueue.metricApproximateNumberOfMessagesVisible(),
            threshold: 1000,
            evaluationPeriods: 2,
            comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Alarm for notification processor Lambda errors
        const processorErrorAlarm = new cloudwatch.Alarm(this, 'NotificationProcessorErrorAlarm', {
            alarmName: `aibts-notification-processor-errors-${environment}`,
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
            alarmName: `aibts-scheduled-reports-errors-${environment}`,
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
            alarmName: `aibts-sns-email-failures-${environment}`,
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
            alarmName: `aibts-sns-sms-failures-${environment}`,
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
            dashboardName: `AIBTS-Notification-System-${environment}`,
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
            exportName: `misra-platform-user-pool-id-${environment}`,
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: `misra-platform-user-pool-client-id-${environment}`,
        });
        new cdk.CfnOutput(this, 'UserPoolArn', {
            value: userPool.userPoolArn,
            description: 'Cognito User Pool ARN',
            exportName: `misra-platform-user-pool-arn-${environment}`,
        });
    }
}
exports.MisraPlatformStack = MisraPlatformStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlzcmEtcGxhdGZvcm0tc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJtaXNyYS1wbGF0Zm9ybS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLHNFQUF3RDtBQUN4RCxtRUFBcUQ7QUFDckQsK0RBQWlEO0FBQ2pELHlGQUEyRTtBQUMzRSx5RUFBMkQ7QUFDM0Qsd0ZBQTBFO0FBQzFFLHNGQUF3RTtBQUN4RSx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQsd0VBQTBEO0FBQzFELCtFQUFpRTtBQUNqRSx1RUFBeUQ7QUFDekQsNEVBQThEO0FBQzlELHVFQUF5RDtBQUN6RCxpRUFBbUQ7QUFDbkQsdUZBQXlFO0FBQ3pFLGlFQUFtRDtBQUNuRCxnRkFBa0U7QUFFbEUsK0RBQTBEO0FBRTFELG1FQUE4RDtBQUs5RCw2REFBeUQ7QUFDekQscUZBQWdGO0FBQ2hGLGlGQUE0RTtBQUM1RSw2RUFBd0U7QUFFeEUsaUVBQTREO0FBTTVELE1BQWEsa0JBQW1CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qix3REFBd0Q7UUFDeEQsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUFFLFdBQVcsSUFBSSxZQUFZLENBQUM7UUFFdkQsa0NBQWtDO1FBQ2xDLE1BQU0sZ0JBQWdCLEdBQUcsNEJBQTRCLENBQUM7UUFDdEQsTUFBTSxTQUFTLEdBQUcsZ0NBQWdDLENBQUM7UUFDbkQsTUFBTSxjQUFjLEdBQUcsc0JBQXNCLENBQUM7UUFFOUMsc0RBQXNEO1FBQ3RELHdGQUF3RjtRQUN4RixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ25FLFVBQVUsRUFBRSxjQUFjO1NBQzNCLENBQUMsQ0FBQztRQUVILCtEQUErRDtRQUMvRCw2REFBNkQ7UUFDN0QsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDMUYsVUFBVSxFQUFFLGdCQUFnQjtZQUM1QixVQUFVLEVBQUUsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztTQUN6RSxDQUFDLENBQUM7UUFFSCxnRUFBZ0U7UUFDaEUsTUFBTSxjQUFjLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQ2hGLFVBQVUsRUFBRSxTQUFTO1lBQ3JCLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO1NBQ3pFLENBQUMsQ0FBQztRQUVILDhCQUE4QjtRQUM5QixNQUFNLGlCQUFpQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDakUsVUFBVSxFQUFFLHdCQUF3QixXQUFXLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNqRSxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFVBQVU7WUFDMUMsU0FBUyxFQUFFLElBQUk7WUFDZixpQkFBaUIsRUFBRSxFQUFFLENBQUMsaUJBQWlCLENBQUMsU0FBUztZQUNqRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCO1NBQzdELENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDM0QsVUFBVSxFQUFFLDJCQUEyQixXQUFXLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNwRSxvQkFBb0IsRUFBRSxZQUFZO1lBQ2xDLG9CQUFvQixFQUFFLFlBQVk7WUFDbEMsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFVBQVU7WUFDbEQsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCO1NBQzdELENBQUMsQ0FBQztRQUVILDBEQUEwRDtRQUMxRCxNQUFNLFlBQVksR0FBRyxJQUFJLFVBQVUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzdFLGVBQWUsRUFBRTtnQkFDZixNQUFNLEVBQUUsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQztnQkFDNUMsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLGlCQUFpQjtnQkFDdkUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsaUJBQWlCO2dCQUNyRCxtQkFBbUIsRUFBRSxVQUFVLENBQUMsbUJBQW1CLENBQUMsY0FBYzthQUNuRTtZQUNELFdBQVcsRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQy9CLFdBQVcsRUFBRSxtQkFBbUI7WUFDaEMsaUJBQWlCLEVBQUUsWUFBWTtZQUMvQixjQUFjLEVBQUU7Z0JBQ2Q7b0JBQ0UsVUFBVSxFQUFFLEdBQUc7b0JBQ2Ysa0JBQWtCLEVBQUUsR0FBRztvQkFDdkIsZ0JBQWdCLEVBQUUsYUFBYTtvQkFDL0IsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDN0I7Z0JBQ0Q7b0JBQ0UsVUFBVSxFQUFFLEdBQUc7b0JBQ2Ysa0JBQWtCLEVBQUUsR0FBRztvQkFDdkIsZ0JBQWdCLEVBQUUsYUFBYTtvQkFDL0IsR0FBRyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDN0I7YUFDRjtZQUNELFVBQVUsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRSxtREFBbUQ7WUFDdEcsYUFBYSxFQUFFLElBQUk7WUFDbkIsT0FBTyxFQUFFLGlEQUFpRDtTQUMzRCxDQUFDLENBQUM7UUFFSCw4Q0FBOEM7UUFDOUMsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUMvQyxJQUFJLEVBQUUsVUFBVTtZQUNoQixVQUFVLEVBQUUsZ0JBQWdCO1lBQzVCLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxjQUFjLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQ2xEO1lBQ0QsT0FBTyxFQUFFLHFEQUFxRDtTQUMvRCxDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDdEQsWUFBWSxFQUFFLHdCQUF3QixXQUFXLEVBQUU7WUFDbkQsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7Z0JBQ1gsUUFBUSxFQUFFLEtBQUs7YUFDaEI7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELGtCQUFrQixFQUFFO2dCQUNsQixLQUFLLEVBQUU7b0JBQ0wsUUFBUSxFQUFFLElBQUk7b0JBQ2QsT0FBTyxFQUFFLElBQUk7aUJBQ2Q7Z0JBQ0QsUUFBUSxFQUFFO29CQUNSLFFBQVEsRUFBRSxJQUFJO29CQUNkLE9BQU8sRUFBRSxJQUFJO2lCQUNkO2FBQ0Y7WUFDRCxnQkFBZ0IsRUFBRTtnQkFDaEIsY0FBYyxFQUFFLElBQUksT0FBTyxDQUFDLGVBQWUsQ0FBQztvQkFDMUMsTUFBTSxFQUFFLENBQUM7b0JBQ1QsTUFBTSxFQUFFLEdBQUc7b0JBQ1gsT0FBTyxFQUFFLElBQUk7aUJBQ2QsQ0FBQztnQkFDRixJQUFJLEVBQUUsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDO29CQUNoQyxNQUFNLEVBQUUsQ0FBQztvQkFDVCxNQUFNLEVBQUUsRUFBRTtvQkFDVixPQUFPLEVBQUUsSUFBSTtpQkFDZCxDQUFDO2FBQ0g7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLENBQUM7Z0JBQ1osZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsZ0JBQWdCLEVBQUUsSUFBSTtnQkFDdEIsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGNBQWMsRUFBRSxLQUFLO2dCQUNyQixvQkFBb0IsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7YUFDM0M7WUFDRCxlQUFlLEVBQUUsT0FBTyxDQUFDLGVBQWUsQ0FBQyxVQUFVO1lBQ25ELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE1BQU07WUFDdkMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUTtZQUN6QixlQUFlLEVBQUU7Z0JBQ2YsR0FBRyxFQUFFLEtBQUs7Z0JBQ1YsR0FBRyxFQUFFLElBQUk7YUFDVjtZQUNELGdCQUFnQixFQUFFO2dCQUNoQixZQUFZLEVBQUUsc0NBQXNDO2dCQUNwRCxTQUFTLEVBQUUsNERBQTREO2dCQUN2RSxVQUFVLEVBQUUsT0FBTyxDQUFDLHNCQUFzQixDQUFDLElBQUk7YUFDaEQ7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsWUFBWSxFQUFFLDJCQUEyQjtnQkFDekMsU0FBUyxFQUFFLG1HQUFtRzthQUMvRztZQUNELGNBQWMsRUFBRTtnQkFDZCw0QkFBNEIsRUFBRSxJQUFJO2dCQUNsQyxnQ0FBZ0MsRUFBRSxJQUFJO2FBQ3ZDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUU7WUFDckQsa0JBQWtCLEVBQUUsNkJBQTZCLFdBQVcsRUFBRTtZQUM5RCxjQUFjLEVBQUUsS0FBSztZQUNyQixTQUFTLEVBQUU7Z0JBQ1QsWUFBWSxFQUFFLElBQUk7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2FBQ2Q7WUFDRCwwQkFBMEIsRUFBRSxJQUFJO1lBQ2hDLG9CQUFvQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUMzQyxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN0QyxxQkFBcUIsRUFBRSxJQUFJO1lBQzNCLGNBQWMsRUFBRSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtpQkFDM0Msc0JBQXNCLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxJQUFJO2dCQUNYLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixRQUFRLEVBQUUsSUFBSTthQUNmLENBQUM7aUJBQ0Qsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDO1lBQ2pELGVBQWUsRUFBRSxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRTtpQkFDNUMsc0JBQXNCLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxJQUFJO2dCQUNYLFFBQVEsRUFBRSxJQUFJO2FBQ2YsQ0FBQztpQkFDRCxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUM7U0FDbEQsQ0FBQyxDQUFDO1FBRUgsd0VBQXdFO1FBQ3hFLE1BQU0sVUFBVSxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3hELFNBQVMsRUFBRSx3QkFBd0IsV0FBVyxFQUFFO1lBQ2hELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxDQUFDLGVBQWU7WUFDakQsVUFBVSxFQUFFLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVztZQUNoRCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsa0JBQWtCO1NBQzdELENBQUMsQ0FBQztRQUVILG1DQUFtQztRQUNuQyxVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLHNCQUFzQjtZQUNqQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1NBQzlFLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixVQUFVLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDckUsQ0FBQyxDQUFDO1FBRUgsa0NBQWtDO1FBQ2xDLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSwyQkFBMkIsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUV0RyxNQUFNLGFBQWEsR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUM5RCxTQUFTLEVBQUUsMkJBQTJCLFdBQVcsRUFBRTtZQUNuRCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN6RSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNuRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGtCQUFrQjtTQUM3RCxDQUFDLENBQUM7UUFFSCxrQ0FBa0M7UUFDbEMsYUFBYSxDQUFDLHVCQUF1QixDQUFDO1lBQ3BDLFNBQVMsRUFBRSwyQkFBMkI7WUFDdEMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO1FBRUgsYUFBYSxDQUFDLHVCQUF1QixDQUFDO1lBQ3BDLFNBQVMsRUFBRSx3QkFBd0I7WUFDbkMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDOUQsU0FBUyxFQUFFLDRCQUE0QixXQUFXLEVBQUU7WUFDcEQsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDbkUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxrQkFBa0I7U0FDN0QsQ0FBQyxDQUFDO1FBRUgscUVBQXFFO1FBQ3JFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM1RSxTQUFTLEVBQUUsbUNBQW1DLFdBQVcsRUFBRTtZQUMzRCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN6RSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNuRSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGtCQUFrQjtTQUM3RCxDQUFDLENBQUM7UUFFSCx3Q0FBd0M7UUFDeEMsb0JBQW9CLENBQUMsdUJBQXVCLENBQUM7WUFDM0MsU0FBUyxFQUFFLHdCQUF3QjtZQUNuQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUNyRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtTQUNwRSxDQUFDLENBQUM7UUFFSCxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FBQztZQUMzQyxTQUFTLEVBQUUsd0JBQXdCO1lBQ25DLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1NBQ3BFLENBQUMsQ0FBQztRQUVILG9CQUFvQixDQUFDLHVCQUF1QixDQUFDO1lBQzNDLFNBQVMsRUFBRSx5QkFBeUI7WUFDcEMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDdEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDcEUsQ0FBQyxDQUFDO1FBRUgsc0VBQXNFO1FBQ3RFLE1BQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDekUsV0FBVyxFQUFFLFdBQVc7U0FDekIsQ0FBQyxDQUFDO1FBRUgsb0ZBQW9GO1FBQ3BGLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUM7UUFFbEgsMERBQTBEO1FBQzFELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwyQ0FBbUIsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUUvRyxnRkFBZ0Y7UUFDaEYsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsQ0FBQztRQUVuRCx1RUFBdUU7UUFDdkUsTUFBTSxlQUFlLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUM7UUFFL0csc0VBQXNFO1FBQ3RFLE1BQU0sY0FBYyxHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRSxXQUFXLENBQUMsRUFBRSxDQUFDO1FBRTVHLDJFQUEyRTtRQUMzRSxNQUFNLG1CQUFtQixHQUFHLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksRUFBRSw2QkFBNkIsRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7UUFFM0gsaURBQWlEO1FBQ2pELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxzQ0FBaUIsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDekUsV0FBVyxFQUFFLFdBQVc7U0FDekIsQ0FBQyxDQUFDO1FBRUgsNkJBQTZCO1FBQzdCLE1BQU0sNEJBQTRCLEdBQUcsSUFBSSw2REFBNEIsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDMUcsV0FBVyxFQUFFLFdBQVc7U0FDekIsQ0FBQyxDQUFDO1FBRUgsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLHlEQUEwQixDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUNwRyxXQUFXLEVBQUUsV0FBVztTQUN6QixDQUFDLENBQUM7UUFFSCxNQUFNLHdCQUF3QixHQUFHLElBQUkscURBQXdCLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQzlGLFdBQVcsRUFBRSxXQUFXO1NBQ3pCLENBQUMsQ0FBQztRQUVILGdFQUFnRTtRQUNoRSxNQUFNLFlBQVksR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUV0RyxxRUFBcUU7UUFDckUsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLHlDQUFrQixDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1RSxXQUFXLEVBQUUsV0FBVztTQUN6QixDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQzNFLFNBQVMsRUFBRSw2QkFBNkIsV0FBVyxFQUFFO1lBQ3JELFdBQVcsRUFBRSwyQkFBMkI7U0FDekMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQ3ZFLFNBQVMsRUFBRSwyQkFBMkIsV0FBVyxFQUFFO1lBQ25ELFdBQVcsRUFBRSx5QkFBeUI7U0FDdkMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQy9FLFNBQVMsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1lBQ3ZELFdBQVcsRUFBRSw2QkFBNkI7U0FDM0MsQ0FBQyxDQUFDO1FBRUgsd0NBQXdDO1FBQ3hDLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDN0QsU0FBUyxFQUFFLDBCQUEwQixXQUFXLEVBQUU7WUFDbEQsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLG1DQUFtQztTQUM1RSxDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDakUsU0FBUyxFQUFFLDRCQUE0QixXQUFXLEVBQUU7WUFDcEQsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsdUJBQXVCO1lBQ3BFLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGVBQWU7WUFDakUsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNyQyxlQUFlLEVBQUU7Z0JBQ2YsS0FBSyxFQUFFLGVBQWU7Z0JBQ3RCLGVBQWUsRUFBRSxDQUFDLEVBQUUsMkNBQTJDO2FBQ2hFO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOENBQThDO1FBQzlDLGdFQUFnRTtRQUNoRSxNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDckUsUUFBUSxFQUFFLG1DQUFtQyxXQUFXLEVBQUU7WUFDMUQsV0FBVyxFQUFFLCtEQUErRDtZQUM1RSxZQUFZLEVBQUU7Z0JBQ1osTUFBTSxFQUFFLENBQUMsc0JBQXNCLENBQUM7Z0JBQ2hDLFVBQVUsRUFBRSxDQUFDLDBCQUEwQixDQUFDO2FBQ3pDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsOERBQThEO1FBQzlELGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRXRFLG9DQUFvQztRQUNwQyxNQUFNLHdCQUF3QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDckYsWUFBWSxFQUFFLDJCQUEyQixXQUFXLEVBQUU7WUFDdEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsOENBQThDLENBQUM7WUFDM0UsV0FBVyxFQUFFO2dCQUNYLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUMxRCxzQkFBc0IsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO2FBQ25EO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELG1CQUFtQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNsRSxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBRTlELCtDQUErQztRQUMvQyxpQ0FBaUM7UUFDakMsTUFBTSxlQUFlLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxpQkFBaUIsRUFBRTtZQUMvRCxRQUFRLEVBQUUsOEJBQThCLFdBQVcsRUFBRTtZQUNyRCxXQUFXLEVBQUUsOENBQThDO1lBQzNELFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDN0IsTUFBTSxFQUFFLEdBQUc7Z0JBQ1gsSUFBSSxFQUFFLEdBQUc7YUFDVixDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBQ0gsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRWhGLHlDQUF5QztRQUN6QyxNQUFNLGdCQUFnQixHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDakUsUUFBUSxFQUFFLCtCQUErQixXQUFXLEVBQUU7WUFDdEQsV0FBVyxFQUFFLCtDQUErQztZQUM1RCxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7Z0JBQzdCLE1BQU0sRUFBRSxHQUFHO2dCQUNYLElBQUksRUFBRSxHQUFHO2dCQUNULE9BQU8sRUFBRSxLQUFLO2FBQ2YsQ0FBQztTQUNILENBQUMsQ0FBQztRQUNILGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRWpGLGdEQUFnRDtRQUNoRCxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLHlCQUF5QixXQUFXLEVBQUU7WUFDcEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUM7WUFDekUsV0FBVyxFQUFFO2dCQUNYLDhCQUE4QixFQUFFLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQzdFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ3ZGLFlBQVksRUFBRSw0QkFBNEIsV0FBVyxFQUFFO1lBQ3ZELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLCtDQUErQyxDQUFDO1lBQzVFLFdBQVcsRUFBRTtnQkFDWCw4QkFBOEIsRUFBRSw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUM3RTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDRDQUE0QztRQUM1QyxNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDekUsWUFBWSxFQUFFLHFCQUFxQixXQUFXLEVBQUU7WUFDaEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUM7WUFDckUsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3JFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLFlBQVksRUFBRSwwQkFBMEIsV0FBVyxFQUFFO1lBQ3JELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDZDQUE2QyxDQUFDO1lBQzFFLFdBQVcsRUFBRTtnQkFDWCwwQkFBMEIsRUFBRSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUNyRTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDBEQUEwRDtRQUMxRCxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLHlCQUF5QixXQUFXLEVBQUU7WUFDcEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUM7WUFDekUsV0FBVyxFQUFFO2dCQUNYLDRCQUE0QixFQUFFLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3pFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2pGLFlBQVksRUFBRSx5QkFBeUIsV0FBVyxFQUFFO1lBQ3BELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDRDQUE0QyxDQUFDO1lBQ3pFLFdBQVcsRUFBRTtnQkFDWCw0QkFBNEIsRUFBRSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN6RTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM3RSxZQUFZLEVBQUUsdUJBQXVCLFdBQVcsRUFBRTtZQUNsRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywwQ0FBMEMsQ0FBQztZQUN2RSxXQUFXLEVBQUU7Z0JBQ1gsNEJBQTRCLEVBQUUsMEJBQTBCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDekU7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxrREFBa0Q7UUFDbEQsNEJBQTRCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3pFLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ2pGLHdCQUF3QixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNqRSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDdEUsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDNUUsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDNUUsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBRXJFLGlDQUFpQztRQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQzdELFNBQVMsRUFBRSw2QkFBNkIsV0FBVyxFQUFFO1lBQ3JELGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxlQUFlLEVBQUU7Z0JBQ2YsS0FBSyxFQUFFLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO29CQUMxQyxTQUFTLEVBQUUsaUNBQWlDLFdBQVcsRUFBRTtpQkFDMUQsQ0FBQztnQkFDRixlQUFlLEVBQUUsQ0FBQzthQUNuQjtTQUNGLENBQUMsQ0FBQztRQUVILGtEQUFrRDtRQUNsRCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0QsU0FBUyxFQUFFLHNCQUFzQixXQUFXLEVBQUU7WUFDOUMsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztTQUN2QyxDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN6RCxTQUFTLEVBQUUsd0JBQXdCLFdBQVcsRUFBRTtZQUNoRCxpQkFBaUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDMUMsc0JBQXNCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2hELGVBQWUsRUFBRTtnQkFDZixLQUFLLEVBQUUsZ0JBQWdCO2dCQUN2QixlQUFlLEVBQUUsQ0FBQzthQUNuQjtTQUNGLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0QsU0FBUyxFQUFFLHFDQUFxQyxXQUFXLEVBQUU7WUFDN0QsZUFBZSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLG1DQUFtQztTQUM1RSxDQUFDLENBQUM7UUFFSCxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDbkUsU0FBUyxFQUFFLGlDQUFpQyxXQUFXLEVBQUU7WUFDekQsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsdUJBQXVCO1lBQ3BFLHNCQUFzQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLGVBQWU7WUFDakUsZUFBZSxFQUFFO2dCQUNmLEtBQUssRUFBRSxnQkFBZ0I7Z0JBQ3ZCLGVBQWUsRUFBRSxDQUFDLEVBQUUsMkNBQTJDO2FBQ2hFO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsK0JBQStCO1FBQy9CLE1BQU0sU0FBUyxHQUFHLElBQUksY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQzdELFVBQVUsRUFBRSw2QkFBNkIsV0FBVyxFQUFFO1lBQ3RELG9CQUFvQixFQUFFO2dCQUNwQixvQkFBb0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUN6RCxpQkFBaUIsRUFBRSxRQUFRO2dCQUMzQixpQkFBaUIsRUFBRSxPQUFPO2FBQzNCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUN6RSxZQUFZLEVBQUUsNkJBQTZCLFdBQVcsRUFBRTtZQUN4RCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw4QkFBOEIsQ0FBQztZQUMzRCxXQUFXLEVBQUU7Z0JBQ1gsZUFBZSxFQUFFLFNBQVMsQ0FBQyxVQUFVO2FBQ3RDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELFNBQVMsQ0FBQyxTQUFTLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUV4QyxrQ0FBa0M7UUFDbEMsTUFBTSxhQUFhLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDL0QsWUFBWSxFQUFFLHdCQUF3QixXQUFXLEVBQUU7WUFDbkQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMseUJBQXlCLENBQUM7WUFDdEQsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUN0QyxlQUFlLEVBQUUsU0FBUyxDQUFDLFVBQVU7Z0JBQ3JDLGVBQWUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxFQUFFO2dCQUNsRCxXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksRUFBRTthQUMzQztZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLGdCQUFnQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDckUsWUFBWSxFQUFFLDJCQUEyQixXQUFXLEVBQUU7WUFDdEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUM7WUFDekQsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUN0QyxlQUFlLEVBQUUsU0FBUyxDQUFDLFVBQVU7Z0JBQ3JDLGVBQWUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxFQUFFO2dCQUNsRCxXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksRUFBRTthQUMzQztZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLGVBQWUsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ25FLFlBQVksRUFBRSwwQkFBMEIsV0FBVyxFQUFFO1lBQ3JELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDJCQUEyQixDQUFDO1lBQ3hELFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUztnQkFDdEMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxVQUFVO2FBQ3RDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDBEQUEwRDtRQUMxRCxNQUFNLG9CQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDN0UsWUFBWSxFQUFFLGdDQUFnQyxXQUFXLEVBQUU7WUFDM0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsaUNBQWlDLENBQUM7WUFDOUQsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxTQUFTO2dCQUN0QyxZQUFZLEVBQUUsUUFBUSxDQUFDLFVBQVU7Z0JBQ2pDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxnQkFBZ0I7YUFDckQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDRCQUE0QixFQUFFO1lBQ3pGLFlBQVksRUFBRSx3Q0FBd0MsV0FBVyxFQUFFO1lBQ25FLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHlDQUF5QyxDQUFDO1lBQ3RFLFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUztnQkFDdEMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxVQUFVO2dCQUNqQyxtQkFBbUIsRUFBRSxjQUFjLENBQUMsZ0JBQWdCO2FBQ3JEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNyRixZQUFZLEVBQUUscUNBQXFDLFdBQVcsRUFBRTtZQUNoRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQ0FBc0MsQ0FBQztZQUNuRSxXQUFXLEVBQUU7Z0JBQ1gsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLFNBQVM7Z0JBQ3RDLFlBQVksRUFBRSxRQUFRLENBQUMsVUFBVTtnQkFDakMsbUJBQW1CLEVBQUUsY0FBYyxDQUFDLGdCQUFnQjtnQkFDcEQsZUFBZSxFQUFFLFNBQVMsQ0FBQyxVQUFVO2FBQ3RDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILCtCQUErQjtRQUMvQixNQUFNLGtCQUFrQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDekUsWUFBWSxFQUFFLDhCQUE4QixXQUFXLEVBQUU7WUFDekQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMEJBQTBCLENBQUM7WUFDdkQsV0FBVyxFQUFFO2dCQUNYLHdCQUF3QixFQUFFLGlCQUFpQixDQUFDLFVBQVU7Z0JBQ3RELFdBQVcsRUFBRSxLQUFLO2dCQUNsQixrQkFBa0IsRUFBRSxhQUFhLENBQUMsUUFBUTthQUMzQztZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLGtDQUFrQyxXQUFXLEVBQUU7WUFDN0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsbUNBQW1DLENBQUM7WUFDaEUsV0FBVyxFQUFFO2dCQUNYLG9CQUFvQixFQUFFLGVBQWUsQ0FBQyxRQUFRO2dCQUM5QyxXQUFXLEVBQUUsS0FBSztnQkFDbEIsaUJBQWlCLEVBQUUsRUFBRSxFQUFFLHdDQUF3QzthQUNoRTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDaEMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLGdCQUFnQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDckUsWUFBWSxFQUFFLDRCQUE0QixXQUFXLEVBQUU7WUFDdkQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNkJBQTZCLENBQUM7WUFDMUQsV0FBVyxFQUFFO2dCQUNYLFdBQVcsRUFBRSxLQUFLO2FBQ25CO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDBDQUEwQztRQUMxQyxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLG1DQUFtQyxXQUFXLEVBQUU7WUFDOUQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUM7WUFDakUsV0FBVyxFQUFFO2dCQUNYLGtCQUFrQixFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3JEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNyRixZQUFZLEVBQUUscUNBQXFDLFdBQVcsRUFBRTtZQUNoRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQ0FBc0MsQ0FBQztZQUNuRSxXQUFXLEVBQUU7Z0JBQ1gsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQ3BELG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLFVBQVU7Z0JBQ2pELG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUN0RCxxQkFBcUIsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUMzRDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDdkYsWUFBWSxFQUFFLHNDQUFzQyxXQUFXLEVBQUU7WUFDakUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsdUNBQXVDLENBQUM7WUFDcEUsV0FBVyxFQUFFO2dCQUNYLHFCQUFxQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQzNEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sK0JBQStCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxpQ0FBaUMsRUFBRTtZQUNuRyxZQUFZLEVBQUUsNENBQTRDLFdBQVcsRUFBRTtZQUN2RSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyw2Q0FBNkMsQ0FBQztZQUMxRSxXQUFXLEVBQUU7Z0JBQ1gsa0JBQWtCLEVBQUUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDckQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxzQ0FBc0M7UUFDdEMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9FLFlBQVksRUFBRSxpQ0FBaUMsV0FBVyxFQUFFO1lBQzVELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHNDQUFzQyxDQUFDO1lBQ25FLFdBQVcsRUFBRTtnQkFDWCxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN2RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLG1CQUFtQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDM0UsWUFBWSxFQUFFLCtCQUErQixXQUFXLEVBQUU7WUFDMUQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsNENBQTRDLENBQUM7WUFDekUsV0FBVyxFQUFFO2dCQUNYLG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3ZEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvRSxZQUFZLEVBQUUsaUNBQWlDLFdBQVcsRUFBRTtZQUM1RCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQ0FBc0MsQ0FBQztZQUNuRSxXQUFXLEVBQUU7Z0JBQ1gsbUJBQW1CLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDdkQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNuRixZQUFZLEVBQUUsb0NBQW9DLFdBQVcsRUFBRTtZQUMvRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1Q0FBdUMsQ0FBQztZQUNwRSxXQUFXLEVBQUU7Z0JBQ1gsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3hEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvRSxZQUFZLEVBQUUsa0NBQWtDLFdBQVcsRUFBRTtZQUM3RCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxxQ0FBcUMsQ0FBQztZQUNsRSxXQUFXLEVBQUU7Z0JBQ1gsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3hEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNuRixZQUFZLEVBQUUsb0NBQW9DLFdBQVcsRUFBRTtZQUMvRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyx1Q0FBdUMsQ0FBQztZQUNwRSxXQUFXLEVBQUU7Z0JBQ1gsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ3hEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILHdDQUF3QztRQUN4QyxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLG1DQUFtQyxXQUFXLEVBQUU7WUFDOUQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMENBQTBDLENBQUM7WUFDdkUsV0FBVyxFQUFFO2dCQUNYLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN0RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLG9CQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDN0UsWUFBWSxFQUFFLGlDQUFpQyxXQUFXLEVBQUU7WUFDNUQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsd0NBQXdDLENBQUM7WUFDckUsV0FBVyxFQUFFO2dCQUNYLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN0RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDakYsWUFBWSxFQUFFLG1DQUFtQyxXQUFXLEVBQUU7WUFDOUQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMENBQTBDLENBQUM7WUFDdkUsV0FBVyxFQUFFO2dCQUNYLHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUN0RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxvQkFBb0I7UUFDcEIsVUFBVSxDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzdDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUMvQyxTQUFTLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ25DLFNBQVMsQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFckMscURBQXFEO1FBQ3JELFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3BELFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQzFELFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQ3hELFNBQVMsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUU5QyxzREFBc0Q7UUFDdEQsb0JBQW9CLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUMzRCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCwwQkFBMEI7Z0JBQzFCLDZCQUE2QjtnQkFDN0Isa0NBQWtDO2dCQUNsQyx1Q0FBdUM7YUFDeEM7WUFDRCxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1NBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUosMEJBQTBCLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNqRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCwwQkFBMEI7Z0JBQzFCLGdDQUFnQztnQkFDaEMsdUNBQXVDO2dCQUN2Qyx1Q0FBdUM7YUFDeEM7WUFDRCxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1NBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUosd0JBQXdCLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUMvRCxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCwwQkFBMEI7Z0JBQzFCLHVDQUF1QztnQkFDdkMsdUNBQXVDO2dCQUN2QyxpQ0FBaUM7YUFDbEM7WUFDRCxTQUFTLEVBQUUsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDO1NBQ2xDLENBQUMsQ0FBQyxDQUFDO1FBRUosMEJBQTBCO1FBQzFCLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3JELGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQ3BELGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzFELGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRXBELDRCQUE0QjtRQUM1QixpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3pELGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDN0QsaUJBQWlCLENBQUMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFbEQsMEJBQTBCO1FBQzFCLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM3RCxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDL0QsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDM0UsaUJBQWlCLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDM0QsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUUvRCw4QkFBOEI7UUFDOUIsbUJBQW1CLENBQUMsa0JBQWtCLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUNqRSxtQkFBbUIsQ0FBQyxhQUFhLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUU3RCxpQ0FBaUM7UUFDakMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDbEUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBQzNELGlCQUFpQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBRWxFLG9DQUFvQztRQUNwQyxlQUFlLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDbEUsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUMzRCxlQUFlLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFbEUsbUNBQW1DO1FBQ25DLGNBQWMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUNoRSxjQUFjLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pELGNBQWMsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUVoRSxzQ0FBc0M7UUFDdEMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ3ZFLFlBQVksRUFBRSxvQkFBb0IsV0FBVyxFQUFFO1lBQy9DLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHlDQUF5QyxDQUFDO1lBQ3RFLFdBQVcsRUFBRTtnQkFDWCw2REFBNkQ7Z0JBQzdELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxTQUFTO2dCQUNqRCxjQUFjLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksV0FBVztnQkFDekQsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSwyQ0FBMkM7Z0JBQzdGLGVBQWUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxPQUFPO2dCQUN2RCx5QkFBeUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixJQUFJLE1BQU07Z0JBQzFFLHNEQUFzRDtnQkFDdEQsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsSUFBSSxHQUFHO2FBQzFFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLG1DQUFtQztZQUNyRSxVQUFVLEVBQUUsSUFBSSxFQUFFLDhCQUE4QjtZQUNoRCw0QkFBNEIsRUFBRSxDQUFDO1lBQy9CLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxpQ0FBaUM7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2pGLFlBQVksRUFBRSxxQkFBcUIsV0FBVyxFQUFFO1lBQ2hELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDBDQUEwQyxDQUFDO1lBQ3ZFLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUM1QyxxQkFBcUIsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQ3JELGNBQWMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxFQUFFO2dCQUNoRCw2REFBNkQ7Z0JBQzdELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxTQUFTO2dCQUNqRCxjQUFjLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksV0FBVztnQkFDekQsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSwyQ0FBMkM7Z0JBQzdGLGVBQWUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxPQUFPO2dCQUN2RCx5QkFBeUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixJQUFJLE1BQU07Z0JBQzFFLHNEQUFzRDtnQkFDdEQsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsSUFBSSxHQUFHO2FBQzFFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUNoQyxVQUFVLEVBQUUsSUFBSTtZQUNoQiw0QkFBNEIsRUFBRSxDQUFDO1lBQy9CLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxpQ0FBaUM7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLFlBQVksRUFBRSxrQkFBa0IsV0FBVyxFQUFFO1lBQzdDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHVDQUF1QyxDQUFDO1lBQ3BFLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUM1QyxxQkFBcUIsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQ3JELGNBQWMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxFQUFFO2dCQUNoRCw2REFBNkQ7Z0JBQzdELFdBQVcsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxTQUFTO2dCQUNqRCxjQUFjLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksV0FBVztnQkFDekQsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSwyQ0FBMkM7Z0JBQzdGLGVBQWUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxPQUFPO2dCQUN2RCx5QkFBeUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixJQUFJLE1BQU07Z0JBQzFFLHNEQUFzRDtnQkFDdEQsMEJBQTBCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsSUFBSSxHQUFHO2FBQzFFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLG1DQUFtQztZQUN0RSxVQUFVLEVBQUUsSUFBSTtZQUNoQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsaUNBQWlDO1lBQ2pFLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ25GLFlBQVksRUFBRSxrQkFBa0IsV0FBVyxFQUFFO1lBQzdDLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDJDQUEyQyxDQUFDO1lBQ3hFLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQzdDO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsb0RBQW9EO1FBQ3BELFlBQVksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBQUMsQ0FBQztRQUM5RCxZQUFZLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDL0QsWUFBWSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsdUJBQXVCLENBQUMsQ0FBQztRQUMxRCxjQUFjLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDaEUsY0FBYyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ2pFLHlFQUF5RTtRQUN6RSwyRUFBMkU7UUFFM0UsNERBQTREO1FBQzVELHVFQUF1RTtRQUN2RSxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDNUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQztZQUNoQyxTQUFTLEVBQUU7Z0JBQ1Qsc0VBQXNFO2FBQ3ZFO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsaUJBQWlCLENBQUMsZUFBZSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQ2pELHNCQUFzQixDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUN0RCx1QkFBdUIsQ0FBQyxlQUFlLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFdkQsNERBQTREO1FBQzVELGdGQUFnRjtRQUVoRix1RUFBdUU7UUFDdkUsOEVBQThFO1FBQzlFLHVFQUF1RTtRQUV2RSw0REFBNEQ7UUFDNUQsaUVBQWlFO1FBQ2pFLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3RELE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFLENBQUMsMEJBQTBCLENBQUM7WUFDckMsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDO1NBQ2pCLENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzNELHNCQUFzQixDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ2hFLHVCQUF1QixDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBRWpFLDhEQUE4RDtRQUM5RCxNQUFNLGlCQUFpQixHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDaEYsU0FBUyxFQUFFLCtCQUErQixXQUFXLEVBQUU7WUFDdkQsZ0JBQWdCLEVBQUUsOERBQThEO1lBQ2hGLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQzVCLFNBQVMsRUFBRSxlQUFlO2dCQUMxQixVQUFVLEVBQUUsZUFBZTtnQkFDM0IsU0FBUyxFQUFFLEtBQUs7Z0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDaEMsQ0FBQztZQUNGLFNBQVMsRUFBRSxFQUFFO1lBQ2IsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3hFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILHVEQUF1RDtRQUN2RCxNQUFNLG1CQUFtQixHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDaEYsU0FBUyxFQUFFLDZCQUE2QixXQUFXLEVBQUU7WUFDckQsZ0JBQWdCLEVBQUUsdURBQXVEO1lBQ3pFLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7Z0JBQzVCLFNBQVMsRUFBRSxlQUFlO2dCQUMxQixVQUFVLEVBQUUsZ0JBQWdCO2dCQUM1QixTQUFTLEVBQUUsU0FBUztnQkFDcEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNoQyxDQUFDO1lBQ0YsU0FBUyxFQUFFLEtBQUssRUFBRSw2QkFBNkI7WUFDL0MsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3hFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILDBDQUEwQztRQUMxQyxtRUFBbUU7UUFDbkUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzFFLFNBQVMsRUFBRSwwQkFBMEIsV0FBVyxFQUFFO1lBQ2xELGdCQUFnQixFQUFFLDhDQUE4QztZQUNoRSxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO2dCQUM1QixTQUFTLEVBQUUsZUFBZTtnQkFDMUIsVUFBVSxFQUFFLGFBQWE7Z0JBQ3pCLFNBQVMsRUFBRSxLQUFLO2dCQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2FBQy9CLENBQUM7WUFDRixTQUFTLEVBQUUsR0FBRyxFQUFFLE9BQU87WUFDdkIsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3hFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILDBEQUEwRDtRQUMxRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxRQUFRO1lBQ2pDLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx3QkFBd0IsRUFBRTtZQUNoRCxLQUFLLEVBQUUsbUJBQW1CLENBQUMsUUFBUTtZQUNuQyxXQUFXLEVBQUUsZ0NBQWdDO1NBQzlDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDN0MsS0FBSyxFQUFFLGdCQUFnQixDQUFDLFFBQVE7WUFDaEMsV0FBVyxFQUFFLDZCQUE2QjtTQUMzQyxDQUFDLENBQUM7UUFFSCx3RUFBd0U7UUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ25GLGFBQWEsRUFBRSwyQkFBMkIsV0FBVyxFQUFFO1NBQ3hELENBQUMsQ0FBQztRQUVILG1EQUFtRDtRQUNuRCxnQkFBZ0IsQ0FBQyxVQUFVO1FBQ3pCLDRCQUE0QjtRQUM1QixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLGdDQUFnQztZQUN2QyxJQUFJLEVBQUU7Z0JBQ0osSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsZUFBZTtvQkFDMUIsVUFBVSxFQUFFLGdCQUFnQjtvQkFDNUIsU0FBUyxFQUFFLFNBQVM7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQy9CLEtBQUssRUFBRSxxQkFBcUI7aUJBQzdCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsY0FBYztvQkFDekIsVUFBVSxFQUFFLGVBQWU7b0JBQzNCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMvQixLQUFLLEVBQUUsb0JBQW9CO2lCQUM1QixDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUM7UUFDRiwrQkFBK0I7UUFDL0IsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxtQ0FBbUM7WUFDMUMsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLGVBQWU7b0JBQzFCLFVBQVUsRUFBRSxlQUFlO29CQUMzQixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsS0FBSyxFQUFFLGdCQUFnQjtpQkFDeEIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxjQUFjO29CQUN6QixVQUFVLEVBQUUsY0FBYztvQkFDMUIsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQy9CLEtBQUssRUFBRSxlQUFlO2lCQUN2QixDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsQ0FDSCxDQUFDO1FBRUYsZ0JBQWdCLENBQUMsVUFBVTtRQUN6Qix5QkFBeUI7UUFDekIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxtQ0FBbUM7WUFDMUMsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQztvQkFDcEIsU0FBUyxFQUFFLGVBQWU7b0JBQzFCLFVBQVUsRUFBRSxhQUFhO29CQUN6QixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsS0FBSyxFQUFFLGNBQWM7aUJBQ3RCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsY0FBYztvQkFDekIsVUFBVSxFQUFFLFlBQVk7b0JBQ3hCLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM5QixLQUFLLEVBQUUsYUFBYTtpQkFDckIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDO1FBQ0YsZ0NBQWdDO1FBQ2hDLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUseUJBQXlCO1lBQ2hDLElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxlQUFlO29CQUMxQixVQUFVLEVBQUUsZUFBZTtvQkFDM0IsU0FBUyxFQUFFLEtBQUs7b0JBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQy9CLEtBQUssRUFBRSxnQkFBZ0I7aUJBQ3hCLENBQUM7Z0JBQ0YsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDO29CQUNwQixTQUFTLEVBQUUsY0FBYztvQkFDekIsVUFBVSxFQUFFLGNBQWM7b0JBQzFCLFNBQVMsRUFBRSxLQUFLO29CQUNoQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMvQixLQUFLLEVBQUUsZUFBZTtpQkFDdkIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLGdCQUFnQixDQUFDLFVBQVU7UUFDekIsdUJBQXVCO1FBQ3ZCLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsMkJBQTJCO1lBQ2xDLElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxlQUFlO29CQUMxQixVQUFVLEVBQUUsaUJBQWlCO29CQUM3QixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsS0FBSyxFQUFFLGtCQUFrQjtpQkFDMUIsQ0FBQztnQkFDRixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxjQUFjO29CQUN6QixVQUFVLEVBQUUsZ0JBQWdCO29CQUM1QixTQUFTLEVBQUUsS0FBSztvQkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsS0FBSyxFQUFFLGlCQUFpQjtpQkFDekIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDO1FBQ0YsdUNBQXVDO1FBQ3ZDLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDO1lBQy9CLEtBQUssRUFBRSw0QkFBNEI7WUFDbkMsT0FBTyxFQUFFO2dCQUNQLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQztvQkFDNUIsVUFBVSxFQUFFLHNDQUFzQztvQkFDbEQsWUFBWSxFQUFFO3dCQUNaLE9BQU8sRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7NEJBQzdCLFNBQVMsRUFBRSxlQUFlOzRCQUMxQixVQUFVLEVBQUUsaUJBQWlCOzRCQUM3QixTQUFTLEVBQUUsS0FBSzs0QkFDaEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQzt5QkFDOUIsQ0FBQzt3QkFDRixNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDOzRCQUM1QixTQUFTLEVBQUUsY0FBYzs0QkFDekIsVUFBVSxFQUFFLGdCQUFnQjs0QkFDNUIsU0FBUyxFQUFFLEtBQUs7NEJBQ2hCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7eUJBQzlCLENBQUM7cUJBQ0g7b0JBQ0QsS0FBSyxFQUFFLG1CQUFtQjtpQkFDM0IsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLHVCQUF1QjtRQUN2QixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHFCQUFxQixFQUFFO1lBQzdDLEtBQUssRUFBRSx5REFBeUQsSUFBSSxDQUFDLE1BQU0sb0JBQW9CLGdCQUFnQixDQUFDLGFBQWEsRUFBRTtZQUMvSCxXQUFXLEVBQUUsdURBQXVEO1NBQ3JFLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxNQUFNLG9CQUFvQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDN0UsWUFBWSxFQUFFLGdDQUFnQyxXQUFXLEVBQUU7WUFDM0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUM7WUFDL0QsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUMvRCxxQkFBcUIsRUFBRSxjQUFjLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQ3JELHVCQUF1QixFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxVQUFVO2FBQzdEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLHlCQUF5QjtZQUM1RCxVQUFVLEVBQUUsSUFBSSxFQUFFLDBDQUEwQztZQUM1RCw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNuRSxjQUFjLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pELGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUU5RCx1RUFBdUU7UUFDdkUsaUVBQWlFO1FBQ2pFLG1DQUFtQztRQUNuQyxpREFBaUQ7UUFDakQsT0FBTztRQUVQLG9DQUFvQztRQUNwQyxvQkFBb0IsQ0FBQyxjQUFjLENBQ2pDLElBQUksa0JBQWtCLENBQUMsY0FBYyxDQUFDLGtCQUFrQixFQUFFO1lBQ3hELFNBQVMsRUFBRSxDQUFDLEVBQUUsNkJBQTZCO1lBQzNDLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLG9CQUFvQjtZQUNoRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsaUNBQWlDO1NBQ2pFLENBQUMsQ0FDSCxDQUFDO1FBRUYsZ0NBQWdDO1FBQ2hDLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNyRixZQUFZLEVBQUUsb0NBQW9DLFdBQVcsRUFBRTtZQUMvRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxpQ0FBaUMsQ0FBQztZQUM5RCxXQUFXLEVBQUU7Z0JBQ1gsMEJBQTBCLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQy9ELHFCQUFxQixFQUFFLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDckQsc0JBQXNCLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUN2RCx3QkFBd0IsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRO2FBQ3REO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILHFDQUFxQztRQUNyQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUN2RSxjQUFjLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzdELGVBQWUsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDOUQsa0JBQWtCLENBQUMsaUJBQWlCLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUUvRCwrQkFBK0I7UUFDL0IsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDRCQUE0QixFQUFFO1lBQ3pGLFlBQVksRUFBRSx1Q0FBdUMsV0FBVyxFQUFFO1lBQ2xFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDO1lBQ2pFLFdBQVcsRUFBRTtnQkFDWCwwQkFBMEIsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUNoRTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxvQ0FBb0M7UUFDcEMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBRXBFLGdDQUFnQztRQUNoQyxNQUFNLDJCQUEyQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDM0YsWUFBWSxFQUFFLHdDQUF3QyxXQUFXLEVBQUU7WUFDbkUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMscUNBQXFDLENBQUM7WUFDbEUsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUMvRCx1QkFBdUIsRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsVUFBVTthQUM3RDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxxQ0FBcUM7UUFDckMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBQ3JFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUVoRSxnQ0FBZ0M7UUFDaEMsTUFBTSwyQkFBMkIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLDZCQUE2QixFQUFFO1lBQzNGLFlBQVksRUFBRSx3Q0FBd0MsV0FBVyxFQUFFO1lBQ25FLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHFDQUFxQyxDQUFDO1lBQ2xFLFdBQVcsRUFBRTtnQkFDWCwwQkFBMEIsRUFBRSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsU0FBUzthQUNoRTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxxQ0FBcUM7UUFDckMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO1FBRXJFLDRCQUE0QjtRQUM1QixNQUFNLHVCQUF1QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDbkYsWUFBWSxFQUFFLG9DQUFvQyxXQUFXLEVBQUU7WUFDL0QsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsMkNBQTJDLENBQUM7WUFDeEUsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxTQUFTO2FBQ2hFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDJDQUEyQztRQUMzQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFakUsOENBQThDO1FBQzlDLGlCQUFpQixDQUFDLG9CQUFvQixDQUNwQyxFQUFFLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFDM0IsSUFBSSxHQUFHLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLENBQUMsRUFDakQsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLENBQ3ZCLENBQUM7UUFFRiw2Q0FBNkM7UUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQ3JFLFlBQVksRUFBRSwyQkFBMkIsV0FBVyxFQUFFO1lBQ3RELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDO1lBQ2pFLFdBQVcsRUFBRTtnQkFDWCx3QkFBd0IsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO2dCQUN0RCxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDdEQsc0JBQXNCLEVBQUUsb0JBQW9CLENBQUMsU0FBUztnQkFDdEQsb0JBQW9CLEVBQUUsa0JBQWtCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDekQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsNkNBQTZDO1lBQy9FLFVBQVUsRUFBRSxJQUFJLEVBQUUsc0RBQXNEO1lBQ3hFLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgseUNBQXlDO1FBQ3pDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSwrQkFBK0IsRUFBRTtZQUMvRixZQUFZLEVBQUUsZ0NBQWdDLFdBQVcsRUFBRTtZQUMzRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQ0FBc0MsQ0FBQztZQUNuRSxXQUFXLEVBQUU7Z0JBQ1gsOEJBQThCLEVBQUUsNEJBQTRCLENBQUMsS0FBSyxDQUFDLFNBQVM7Z0JBQzVFLDRCQUE0QixFQUFFLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUN4RSwwQkFBMEIsRUFBRSx3QkFBd0IsQ0FBQyxLQUFLLENBQUMsU0FBUztnQkFDcEUsbUJBQW1CLEVBQUUsc0JBQXNCLENBQUMsUUFBUTtnQkFDcEQsaUJBQWlCLEVBQUUsb0JBQW9CLENBQUMsUUFBUTtnQkFDaEQscUJBQXFCLEVBQUUsd0JBQXdCLENBQUMsUUFBUTtnQkFDeEQsV0FBVyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLE9BQU87Z0JBQy9DLGVBQWUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsSUFBSSxFQUFFO2dCQUNsRCxXQUFXLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxXQUFXLElBQUksRUFBRTthQUMzQztZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsVUFBVSxFQUFFLEdBQUc7WUFDZiw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILDZDQUE2QztRQUM3Qyw2QkFBNkIsQ0FBQyxjQUFjLENBQzFDLElBQUksa0JBQWtCLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFO1lBQ3ZELFNBQVMsRUFBRSxDQUFDLEVBQUUsMERBQTBEO1lBQ3hFLGlCQUFpQixFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUMzQyxDQUFDLENBQ0gsQ0FBQztRQUVGLDhDQUE4QztRQUM5Qyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsNkJBQTZCLENBQUMsQ0FBQztRQUNyRiwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDOUUsd0JBQXdCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakYsc0JBQXNCLENBQUMsWUFBWSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDbkUsb0JBQW9CLENBQUMsWUFBWSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFDakUsd0JBQXdCLENBQUMsWUFBWSxDQUFDLDZCQUE2QixDQUFDLENBQUM7UUFFckUsbUNBQW1DO1FBQ25DLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUMvRSxZQUFZLEVBQUUsd0JBQXdCLFdBQVcsRUFBRTtZQUNuRCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQywyQ0FBMkMsQ0FBQztZQUN4RSxXQUFXLEVBQUU7Z0JBQ1gsNEJBQTRCLEVBQUUsMEJBQTBCLENBQUMsS0FBSyxDQUFDLFNBQVM7YUFDekU7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCwrQ0FBK0M7UUFDL0MsMEJBQTBCLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFFM0UsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzdFLFlBQVksRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1lBQzFELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDOzs7Ozs7Ozs7T0FTNUIsQ0FBQztZQUNGLFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsU0FBUzthQUN2QztZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDakMsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCw0REFBNEQ7UUFDNUQsYUFBYSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbkQsb0JBQW9CLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUMxRCxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLDhDQUE4QztRQUM3RixpQkFBaUIsQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsMERBQTBEO1FBQ2xILGtCQUFrQixDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsa0RBQWtEO1FBQ2pILFVBQVUsQ0FBQyxhQUFhLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUUvQyx5REFBeUQ7UUFDekQsZ0JBQWdCLENBQUMsY0FBYyxDQUM3QixJQUFJLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUU7WUFDbkQsU0FBUyxFQUFFLENBQUMsRUFBRSxpQ0FBaUM7WUFDL0MsaUJBQWlCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CO1lBQ2hFLHVCQUF1QixFQUFFLElBQUksRUFBRSxpQ0FBaUM7U0FDakUsQ0FBQyxDQUNILENBQUM7UUFFRixnQ0FBZ0M7UUFDaEMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzdFLFlBQVksRUFBRSxnQ0FBZ0MsV0FBVyxFQUFFO1lBQzNELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLHFDQUFxQyxDQUFDO1lBQ2xFLFdBQVcsRUFBRTtnQkFDWCxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVM7YUFDNUI7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsNkJBQTZCO1FBQzdCLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUN2RSxZQUFZLEVBQUUsNkJBQTZCLFdBQVcsRUFBRTtZQUN4RCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxzQ0FBc0MsQ0FBQztZQUNuRSxXQUFXLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTO2FBQzVCO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyw0QkFBNEIsRUFBRSxDQUFDO1NBQ2hDLENBQUMsQ0FBQztRQUVILHVEQUF1RDtRQUN2RCxNQUFNLGlCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDdkUsWUFBWSxFQUFFLDZCQUE2QixXQUFXLEVBQUU7WUFDeEQsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxPQUFPLEVBQUUsZUFBZTtZQUN4QixJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUM7WUFDL0QsV0FBVyxFQUFFO2dCQUNYLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDLFNBQVM7Z0JBQ3RELG1CQUFtQixFQUFFLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTO2dCQUN0RCxtQkFBbUIsRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO2FBQ2xEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsNkRBQTZEO1FBQzdELG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3pELG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBRXRELG1EQUFtRDtRQUNuRCxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUN0RCxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUNuRCxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsQ0FBQztRQUVwRCw2Q0FBNkM7UUFDN0MsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2pGLFlBQVksRUFBRSxrQ0FBa0MsV0FBVyxFQUFFO1lBQzdELE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsT0FBTyxFQUFFLGVBQWU7WUFDeEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLDhCQUE4QixDQUFDO1lBQzNELFdBQVcsRUFBRTtnQkFDWCwyQkFBMkIsRUFBRSxvQkFBb0IsQ0FBQyxTQUFTO2dCQUMzRCxNQUFNLEVBQUUsSUFBSSxDQUFDLE1BQU07YUFDcEI7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ2pDLFVBQVUsRUFBRSxHQUFHO1lBQ2YsNEJBQTRCLEVBQUUsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCw0REFBNEQ7UUFDNUQsb0JBQW9CLENBQUMsYUFBYSxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFFM0QsOEJBQThCO1FBQzlCLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUN6RSxZQUFZLEVBQUUsOEJBQThCLFdBQVcsRUFBRTtZQUN6RCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQztZQUNoRSxXQUFXLEVBQUU7Z0JBQ1gsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTO2FBQzVCO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNqQyxVQUFVLEVBQUUsR0FBRztZQUNmLDRCQUE0QixFQUFFLENBQUM7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsd0RBQXdEO1FBQ3hELG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3ZELDJFQUEyRTtRQUUzRSw0REFBNEQ7UUFDNUQsZ0VBQWdFO1FBQ2hFLG9FQUFvRTtRQUNwRSxpQ0FBaUM7UUFDakMsc0JBQXNCO1FBQ3RCLDBCQUEwQjtRQUMxQixNQUFNO1FBRU4sb0RBQW9EO1FBQ3BELHFHQUFxRztRQUVyRyx5RUFBeUU7UUFDekUscUVBQXFFO1FBRXJFLGlDQUFpQztRQUNqQyxNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzNELE9BQU8sRUFBRSxzQkFBc0IsV0FBVyxFQUFFO1lBQzVDLFdBQVcsRUFBRSx5QkFBeUI7WUFDdEMsYUFBYSxFQUFFO2dCQUNiLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQztnQkFDbkIsWUFBWSxFQUFFO29CQUNaLFVBQVUsQ0FBQyxjQUFjLENBQUMsR0FBRztvQkFDN0IsVUFBVSxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUM5QixVQUFVLENBQUMsY0FBYyxDQUFDLEdBQUc7b0JBQzdCLFVBQVUsQ0FBQyxjQUFjLENBQUMsTUFBTTtvQkFDaEMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxPQUFPO2lCQUNsQztnQkFDRCxZQUFZLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO2FBQ2hEO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsdUNBQXVDO1FBQ3ZDLE1BQU0sYUFBYSxHQUFHLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsaUJBQWlCLEVBQUU7WUFDdkUsVUFBVSxFQUFFLFNBQVM7WUFDckIsV0FBVyxFQUFFLGNBQWM7U0FDNUIsQ0FBQyxDQUFDO1FBRUgsaURBQWlEO1FBQ2pELElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQzVDLEdBQUcsRUFBRSxHQUFHO1lBQ1IsVUFBVSxFQUFFLGFBQWE7WUFDekIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxZQUFhO1NBQ3pCLENBQUMsQ0FBQztRQUVILHlDQUF5QztRQUN6QyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzFDLElBQUksRUFBRSxVQUFVO1lBQ2hCLFVBQVUsRUFBRSxTQUFTO1lBQ3JCLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FDcEMsSUFBSSxjQUFjLENBQUMsNEJBQTRCLENBQzdDLGFBQWEsQ0FBQyxrQkFBa0IsRUFDaEMsYUFBYSxDQUFDLG9CQUFvQixDQUNuQyxDQUNGO1lBQ0QsT0FBTyxFQUFFLGtEQUFrRDtTQUM1RCxDQUFDLENBQUM7UUFFSCx5REFBeUQ7UUFDekQsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFXLENBQUMsb0JBQW9CLENBQUMsZUFBZSxFQUFFLGtCQUFrQixFQUFFO1lBQzNGLGNBQWMsRUFBRSxnQkFBZ0I7WUFDaEMsY0FBYyxFQUFFLENBQUMsK0JBQStCLENBQUM7WUFDakQsYUFBYSxFQUFFLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQztZQUMxRCxlQUFlLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsWUFBWTtTQUN6RCxDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxhQUFhO1lBQ25CLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLEVBQUU7Z0JBQ3JGLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMscUJBQXFCLEVBQUUsZ0JBQWdCLEVBQUU7Z0JBQzNGLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGVBQWU7WUFDckIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLG9CQUFvQixFQUFFLGVBQWUsRUFBRTtnQkFDekYsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztTQUNILENBQUMsQ0FBQztRQUVILG9EQUFvRDtRQUNwRCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHFCQUFxQjtZQUMzQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMseUJBQXlCLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ25HLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLDZCQUE2QjtZQUNuQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsK0JBQStCLEVBQUUsMEJBQTBCLEVBQUU7Z0JBQy9HLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLDBCQUEwQjtZQUNoQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNkJBQTZCLEVBQUUsd0JBQXdCLEVBQUU7Z0JBQzNHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCx5QkFBeUI7UUFDekIsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxlQUFlO1lBQ3JCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsRUFBRSxnQkFBZ0IsRUFBRTtnQkFDM0Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILHlCQUF5QjtRQUN6QixHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGdCQUFnQjtZQUN0QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLEVBQUU7Z0JBQ3ZHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHNCQUFzQjtZQUM1QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNkJBQTZCLEVBQUUsd0JBQXdCLEVBQUU7Z0JBQzNHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLGlDQUFpQztZQUN2QyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsOEJBQThCLEVBQUUseUJBQXlCLEVBQUU7Z0JBQzdHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLDJCQUEyQjtZQUNqQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsb0NBQW9DLEVBQUUsK0JBQStCLEVBQUU7Z0JBQ3pILG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxpQkFBaUI7WUFDdkIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixFQUFFLG9CQUFvQixFQUFFO2dCQUNuRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsd0JBQXdCO1FBQ3hCLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsMEJBQTBCO1lBQ2hDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRSxpQkFBaUIsRUFBRTtnQkFDN0Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILHVDQUF1QztRQUN2QyxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLCtCQUErQjtZQUNyQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLEVBQUU7Z0JBQ3ZHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCx1Q0FBdUM7UUFDdkMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxtQkFBbUI7WUFDekIsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLHNCQUFzQixFQUFFLGlCQUFpQixFQUFFO2dCQUM3RixvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsY0FBYztZQUNwQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQztZQUNyQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9GLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxnQ0FBZ0M7UUFDaEMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxXQUFXO1lBQ2pCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRTtnQkFDckcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsV0FBVztZQUNqQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUU7Z0JBQ2pHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHVCQUF1QjtZQUM3QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUU7Z0JBQ3JHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxtQ0FBbUM7UUFDbkMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxjQUFjO1lBQ3BCLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSx1QkFBdUIsRUFBRTtnQkFDekcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsY0FBYztZQUNwQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUU7Z0JBQ3JHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNEJBQTRCLEVBQUUsdUJBQXVCLEVBQUU7Z0JBQ3pHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxrQ0FBa0M7UUFDbEMsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxhQUFhO1lBQ25CLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsRUFBRTtnQkFDdkcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsYUFBYTtZQUNuQixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMseUJBQXlCLEVBQUUsb0JBQW9CLEVBQUU7Z0JBQ25HLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLDBCQUEwQjtZQUNoQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsMkJBQTJCLEVBQUUsc0JBQXNCLEVBQUU7Z0JBQ3ZHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDZCQUE2QixFQUFFLHdCQUF3QixFQUFFO2dCQUMzRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxrQ0FBa0M7WUFDeEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLCtCQUErQixFQUFFLDBCQUEwQixFQUFFO2dCQUMvRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwyQkFBMkI7WUFDakMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLGdDQUFnQyxFQUFFLDJCQUEyQixFQUFFO2dCQUNqSCxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSxxQkFBcUI7WUFDM0IsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLGdDQUFnQyxFQUFFLDJCQUEyQixFQUFFO2dCQUNqSCxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSx1Q0FBdUM7WUFDN0MsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDRCQUE0QixFQUFFLHVCQUF1QixFQUFFO2dCQUN6RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsNEJBQTRCO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsRUFBRTtnQkFDdkcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsNEJBQTRCO1lBQ2xDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw4QkFBOEIsRUFBRSx5QkFBeUIsRUFBRTtnQkFDN0csb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILGtDQUFrQztRQUNsQyxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHdCQUF3QjtZQUM5QixPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9GLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxHQUFHLENBQUMsU0FBUyxDQUFDO1lBQ1osSUFBSSxFQUFFLHlDQUF5QztZQUMvQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxZQUFZLENBQUMscUJBQXFCLENBQUMsNEJBQTRCLEVBQUUsdUJBQXVCLEVBQUU7Z0JBQ3pHLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXO2FBQ2xFLENBQUM7WUFDRixVQUFVLEVBQUUsVUFBVTtTQUN2QixDQUFDLENBQUM7UUFFSCxnREFBZ0Q7UUFDaEQsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7WUFDckMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixFQUFFO2dCQUN2RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSx1Q0FBdUM7WUFDN0MsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLHNCQUFzQixFQUFFO2dCQUN2RyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNaLElBQUksRUFBRSwwQkFBMEI7WUFDaEMsT0FBTyxFQUFFLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDcEMsV0FBVyxFQUFFLElBQUksWUFBWSxDQUFDLHFCQUFxQixDQUFDLHlCQUF5QixFQUFFLG9CQUFvQixFQUFFO2dCQUNuRyxvQkFBb0IsRUFBRSxVQUFVLENBQUMsb0JBQW9CLENBQUMsV0FBVzthQUNsRSxDQUFDO1lBQ0YsVUFBVSxFQUFFLFVBQVU7U0FDdkIsQ0FBQyxDQUFDO1FBRUgsZ0NBQWdDO1FBQ2hDLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsNkJBQTZCO1lBQ25DLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxzQkFBc0IsRUFBRSxpQkFBaUIsRUFBRTtnQkFDN0Ysb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsOEJBQThCO1lBQ3BDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQywyQkFBMkIsRUFBRSxzQkFBc0IsRUFBRTtnQkFDdkcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsMkJBQTJCO1lBQ2pDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ3JDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSx1QkFBdUIsRUFBRTtnQkFDekcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDWixJQUFJLEVBQUUsMkJBQTJCO1lBQ2pDLE9BQU8sRUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyw0QkFBNEIsRUFBRSx1QkFBdUIsRUFBRTtnQkFDekcsb0JBQW9CLEVBQUUsVUFBVSxDQUFDLG9CQUFvQixDQUFDLFdBQVc7YUFDbEUsQ0FBQztZQUNGLFVBQVUsRUFBRSxVQUFVO1NBQ3ZCLENBQUMsQ0FBQztRQUVILDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxVQUFVO1lBQ25DLFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsY0FBYyxDQUFDLFVBQVU7WUFDaEMsV0FBVyxFQUFFLGdDQUFnQztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDhCQUE4QixFQUFFO1lBQ3RELEtBQUssRUFBRSxZQUFZLENBQUMsc0JBQXNCO1lBQzFDLFdBQVcsRUFBRSxnQ0FBZ0M7U0FDOUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRTtZQUM5QyxLQUFLLEVBQUUsV0FBVyxnQkFBZ0IsRUFBRTtZQUNwQyxXQUFXLEVBQUUsNENBQTRDO1lBQ3pELFVBQVUsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1NBQ3pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLFdBQVcsU0FBUyxFQUFFO1lBQzdCLFdBQVcsRUFBRSx1Q0FBdUM7WUFDcEQsVUFBVSxFQUFFLDBCQUEwQixXQUFXLEVBQUU7U0FDcEQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUM1QyxLQUFLLEVBQUUsZUFBZSxDQUFDLFFBQVE7WUFDL0IsV0FBVyxFQUFFLCtCQUErQjtTQUM3QyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxrQkFBa0IsQ0FBQyxRQUFRO1lBQ2xDLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDdkMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxXQUFXO1lBQ3RCLFdBQVcsRUFBRSwwQkFBMEI7U0FDeEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNqRCxLQUFLLEVBQUUsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVM7WUFDMUMsV0FBVyxFQUFFLG9DQUFvQztTQUNsRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHVCQUF1QixFQUFFO1lBQy9DLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsVUFBVTtZQUMxQyxXQUFXLEVBQUUsMENBQTBDO1NBQ3hELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDOUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLFFBQVE7WUFDakMsV0FBVyxFQUFFLHVDQUF1QztTQUNyRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ25ELEtBQUssRUFBRSxzQkFBc0IsQ0FBQyxRQUFRO1lBQ3RDLFdBQVcsRUFBRSxtQ0FBbUM7U0FDakQsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNqRCxLQUFLLEVBQUUsb0JBQW9CLENBQUMsUUFBUTtZQUNwQyxXQUFXLEVBQUUsaUNBQWlDO1NBQy9DLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDckQsS0FBSyxFQUFFLHdCQUF3QixDQUFDLFFBQVE7WUFDeEMsV0FBVyxFQUFFLHFDQUFxQztTQUNuRCxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFO1lBQzFDLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDLFNBQVM7WUFDbkMsV0FBVyxFQUFFLHNDQUFzQztTQUNwRCxDQUFDLENBQUM7UUFFSCw0Q0FBNEM7UUFDNUMsMkRBQTJEO1FBQzNELE1BQU0sUUFBUSxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDbEUsU0FBUyxFQUFFLGdDQUFnQyxXQUFXLEVBQUU7WUFDeEQsZ0JBQWdCLEVBQUUsaUVBQWlFO1lBQ25GLE1BQU0sRUFBRSxlQUFlLENBQUMsd0NBQXdDLEVBQUU7WUFDbEUsU0FBUyxFQUFFLENBQUM7WUFDWixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7WUFDeEUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsOERBQThEO1FBQzlELE1BQU0sZUFBZSxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDaEYsU0FBUyxFQUFFLGtDQUFrQyxXQUFXLEVBQUU7WUFDMUQsZ0JBQWdCLEVBQUUsMkRBQTJEO1lBQzdFLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyx3Q0FBd0MsRUFBRTtZQUNwRSxTQUFTLEVBQUUsSUFBSTtZQUNmLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtZQUN4RSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtTQUM1RCxDQUFDLENBQUM7UUFFSCxpREFBaUQ7UUFDakQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLGlDQUFpQyxFQUFFO1lBQ3hGLFNBQVMsRUFBRSx1Q0FBdUMsV0FBVyxFQUFFO1lBQy9ELGdCQUFnQixFQUFFLHFEQUFxRDtZQUN2RSxNQUFNLEVBQUUsNkJBQTZCLENBQUMsWUFBWSxDQUFDO2dCQUNqRCxNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsQ0FBQztZQUNaLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtZQUN4RSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtTQUM1RCxDQUFDLENBQUM7UUFFSCw0Q0FBNEM7UUFDNUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLDRCQUE0QixFQUFFO1lBQzFGLFNBQVMsRUFBRSxrQ0FBa0MsV0FBVyxFQUFFO1lBQzFELGdCQUFnQixFQUFFLGdEQUFnRDtZQUNsRSxNQUFNLEVBQUUsd0JBQXdCLENBQUMsWUFBWSxDQUFDO2dCQUM1QyxNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2FBQ2hDLENBQUM7WUFDRixTQUFTLEVBQUUsQ0FBQztZQUNaLGlCQUFpQixFQUFFLENBQUM7WUFDcEIsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLGtCQUFrQixDQUFDLHNCQUFzQjtZQUN4RSxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsZ0JBQWdCLENBQUMsYUFBYTtTQUM1RCxDQUFDLENBQUM7UUFFSCwwQ0FBMEM7UUFDMUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFO1lBQzlFLFNBQVMsRUFBRSw0QkFBNEIsV0FBVyxFQUFFO1lBQ3BELGdCQUFnQixFQUFFLHFDQUFxQztZQUN2RCxNQUFNLEVBQUUsc0JBQXNCLENBQUMsaUNBQWlDLENBQUM7Z0JBQy9ELE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7YUFDaEMsQ0FBQztZQUNGLFNBQVMsRUFBRSxDQUFDO1lBQ1osaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixrQkFBa0IsRUFBRSxVQUFVLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCO1lBQ3hFLGdCQUFnQixFQUFFLFVBQVUsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhO1NBQzVELENBQUMsQ0FBQztRQUVILHdDQUF3QztRQUN4QyxNQUFNLGtCQUFrQixHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDMUUsU0FBUyxFQUFFLDBCQUEwQixXQUFXLEVBQUU7WUFDbEQsZ0JBQWdCLEVBQUUsbUNBQW1DO1lBQ3JELE1BQU0sRUFBRSxvQkFBb0IsQ0FBQyxpQ0FBaUMsQ0FBQztnQkFDN0QsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQzthQUNoQyxDQUFDO1lBQ0YsU0FBUyxFQUFFLENBQUM7WUFDWixpQkFBaUIsRUFBRSxDQUFDO1lBQ3BCLGtCQUFrQixFQUFFLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxzQkFBc0I7WUFDeEUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLGdCQUFnQixDQUFDLGFBQWE7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsK0NBQStDO1FBQy9DLE1BQU0scUJBQXFCLEdBQUcsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUNwRixhQUFhLEVBQUUsNkJBQTZCLFdBQVcsRUFBRTtTQUMxRCxDQUFDLENBQUM7UUFFSCwyQkFBMkI7UUFDM0IscUJBQXFCLENBQUMsVUFBVTtRQUM5QixnQkFBZ0I7UUFDaEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSwwQkFBMEI7WUFDakMsSUFBSSxFQUFFO2dCQUNKLGlCQUFpQixDQUFDLHdDQUF3QyxDQUFDO29CQUN6RCxLQUFLLEVBQUUsa0JBQWtCO29CQUN6QixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLGlCQUFpQixDQUFDLDJDQUEyQyxDQUFDO29CQUM1RCxLQUFLLEVBQUUsb0JBQW9CO29CQUMzQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsRUFDRixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLGtDQUFrQztZQUN6QyxJQUFJLEVBQUU7Z0JBQ0osZUFBZSxDQUFDLHdDQUF3QyxDQUFDO29CQUN2RCxLQUFLLEVBQUUsaUJBQWlCO29CQUN4QixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO29CQUMvQixTQUFTLEVBQUUsS0FBSztpQkFDakIsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLEVBQUU7U0FDVixDQUFDLENBQ0gsQ0FBQztRQUVGLHFCQUFxQixDQUFDLFVBQVU7UUFDOUIsaUJBQWlCO1FBQ2pCLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsb0NBQW9DO1lBQzNDLElBQUksRUFBRTtnQkFDSiw2QkFBNkIsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDOUMsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0YsNkJBQTZCLENBQUMsWUFBWSxDQUFDO29CQUN6QyxLQUFLLEVBQUUsUUFBUTtvQkFDZixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsNkJBQTZCLENBQUMsY0FBYyxDQUFDO29CQUMzQyxLQUFLLEVBQUUsVUFBVTtvQkFDakIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsU0FBUyxFQUFFLFNBQVM7aUJBQ3JCLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRSxFQUFFO1NBQ1YsQ0FBQyxFQUNGLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsK0JBQStCO1lBQ3RDLElBQUksRUFBRTtnQkFDSix3QkFBd0IsQ0FBQyxpQkFBaUIsQ0FBQztvQkFDekMsS0FBSyxFQUFFLGFBQWE7b0JBQ3BCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0Ysd0JBQXdCLENBQUMsWUFBWSxDQUFDO29CQUNwQyxLQUFLLEVBQUUsUUFBUTtvQkFDZixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUU7Z0JBQ0wsd0JBQXdCLENBQUMsY0FBYyxDQUFDO29CQUN0QyxLQUFLLEVBQUUsVUFBVTtvQkFDakIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztvQkFDL0IsU0FBUyxFQUFFLFNBQVM7aUJBQ3JCLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRSxFQUFFO1NBQ1YsQ0FBQyxDQUNILENBQUM7UUFFRixxQkFBcUIsQ0FBQyxVQUFVO1FBQzlCLHVCQUF1QjtRQUN2QixJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUM7WUFDekIsS0FBSyxFQUFFLG9CQUFvQjtZQUMzQixJQUFJLEVBQUU7Z0JBQ0osc0JBQXNCLENBQUMsK0JBQStCLENBQUM7b0JBQ3JELEtBQUssRUFBRSxXQUFXO29CQUNsQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLHNCQUFzQixDQUFDLG9DQUFvQyxDQUFDO29CQUMxRCxLQUFLLEVBQUUsV0FBVztvQkFDbEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDaEMsQ0FBQztnQkFDRixzQkFBc0IsQ0FBQyxpQ0FBaUMsQ0FBQztvQkFDdkQsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDaEMsQ0FBQzthQUNIO1lBQ0QsS0FBSyxFQUFFLENBQUM7U0FDVCxDQUFDLEVBQ0YsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsSUFBSSxFQUFFO2dCQUNKLG9CQUFvQixDQUFDLCtCQUErQixDQUFDO29CQUNuRCxLQUFLLEVBQUUsV0FBVztvQkFDbEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztpQkFDaEMsQ0FBQztnQkFDRixvQkFBb0IsQ0FBQyxvQ0FBb0MsQ0FBQztvQkFDeEQsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0Ysb0JBQW9CLENBQUMsaUNBQWlDLENBQUM7b0JBQ3JELEtBQUssRUFBRSxRQUFRO29CQUNmLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRSxDQUFDO1NBQ1QsQ0FBQyxFQUNGLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsc0JBQXNCO1lBQzdCLElBQUksRUFBRTtnQkFDSix3QkFBd0IsQ0FBQywrQkFBK0IsQ0FBQztvQkFDdkQsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLE1BQU0sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0Ysd0JBQXdCLENBQUMsb0NBQW9DLENBQUM7b0JBQzVELEtBQUssRUFBRSxXQUFXO29CQUNsQixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2dCQUNGLHdCQUF3QixDQUFDLGlDQUFpQyxDQUFDO29CQUN6RCxLQUFLLEVBQUUsUUFBUTtvQkFDZixNQUFNLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO2lCQUNoQyxDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsQ0FBQztTQUNULENBQUMsQ0FDSCxDQUFDO1FBRUYsdUJBQXVCO1FBQ3ZCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEQsS0FBSyxFQUFFLHlEQUF5RCxJQUFJLENBQUMsTUFBTSxvQkFBb0IscUJBQXFCLENBQUMsYUFBYSxFQUFFO1lBQ3BJLFdBQVcsRUFBRSw4Q0FBOEM7U0FDNUQsQ0FBQyxDQUFDO1FBRUgsa0JBQWtCO1FBQ2xCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3BDLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVTtZQUMxQixXQUFXLEVBQUUsc0JBQXNCO1lBQ25DLFVBQVUsRUFBRSwrQkFBK0IsV0FBVyxFQUFFO1NBQ3pELENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsa0JBQWtCLEVBQUU7WUFDMUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxnQkFBZ0I7WUFDdEMsV0FBVyxFQUFFLDZCQUE2QjtZQUMxQyxVQUFVLEVBQUUsc0NBQXNDLFdBQVcsRUFBRTtTQUNoRSxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFdBQVc7WUFDM0IsV0FBVyxFQUFFLHVCQUF1QjtZQUNwQyxVQUFVLEVBQUUsZ0NBQWdDLFdBQVcsRUFBRTtTQUMxRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF4MUVELGdEQXcxRUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgKiBhcyBzM24gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzLW5vdGlmaWNhdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYUV2ZW50U291cmNlcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xyXG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djInO1xyXG5pbXBvcnQgKiBhcyBpbnRlZ3JhdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyBhdXRob3JpemVycyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcclxuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNucyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnO1xyXG5pbXBvcnQgKiBhcyB0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMtdGFyZ2V0cyc7XHJcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGNlcnRpZmljYXRlbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XHJcbmltcG9ydCAqIGFzIHJvdXRlNTN0YXJnZXRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yb3V0ZTUzLXRhcmdldHMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgRmlsZU1ldGFkYXRhVGFibGUgfSBmcm9tICcuL2ZpbGUtbWV0YWRhdGEtdGFibGUnO1xyXG5pbXBvcnQgeyBTYW1wbGVGaWxlc1RhYmxlIH0gZnJvbSAnLi9zYW1wbGUtZmlsZXMtdGFibGUnO1xyXG5pbXBvcnQgeyBVcGxvYWRQcm9ncmVzc1RhYmxlIH0gZnJvbSAnLi91cGxvYWQtcHJvZ3Jlc3MtdGFibGUnO1xyXG5pbXBvcnQgeyBQcm9qZWN0c1RhYmxlIH0gZnJvbSAnLi9wcm9qZWN0cy10YWJsZSc7XHJcbmltcG9ydCB7IFRlc3RTdWl0ZXNUYWJsZSB9IGZyb20gJy4vdGVzdC1zdWl0ZXMtdGFibGUnO1xyXG5pbXBvcnQgeyBUZXN0Q2FzZXNUYWJsZSB9IGZyb20gJy4vdGVzdC1jYXNlcy10YWJsZSc7XHJcbmltcG9ydCB7IFRlc3RFeGVjdXRpb25zVGFibGUgfSBmcm9tICcuL3Rlc3QtZXhlY3V0aW9ucy10YWJsZSc7XHJcbmltcG9ydCB7IFNjcmVlbnNob3RzQnVja2V0IH0gZnJvbSAnLi9zY3JlZW5zaG90cy1idWNrZXQnO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlIH0gZnJvbSAnLi9ub3RpZmljYXRpb24tcHJlZmVyZW5jZXMtdGFibGUnO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZSB9IGZyb20gJy4vbm90aWZpY2F0aW9uLXRlbXBsYXRlcy10YWJsZSc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZSB9IGZyb20gJy4vbm90aWZpY2F0aW9uLWhpc3RvcnktdGFibGUnO1xyXG5pbXBvcnQgeyBBSVVzYWdlVGFibGUgfSBmcm9tICcuL2FpLXVzYWdlLXRhYmxlJztcclxuaW1wb3J0IHsgQW5hbHlzaXNDYWNoZVRhYmxlIH0gZnJvbSAnLi9hbmFseXNpcy1jYWNoZS10YWJsZSc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE1pc3JhUGxhdGZvcm1TdGFja1Byb3BzIGV4dGVuZHMgY2RrLlN0YWNrUHJvcHMge1xyXG4gIGVudmlyb25tZW50Pzogc3RyaW5nOyAvLyAnZGV2JyB8ICdzdGFnaW5nJyB8ICdwcm9kdWN0aW9uJ1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTWlzcmFQbGF0Zm9ybVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IE1pc3JhUGxhdGZvcm1TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBHZXQgZW52aXJvbm1lbnQgZnJvbSBwcm9wcyBvciBkZWZhdWx0IHRvICdwcm9kdWN0aW9uJ1xyXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9wcz8uZW52aXJvbm1lbnQgfHwgJ3Byb2R1Y3Rpb24nO1xyXG5cclxuICAgIC8vIFByb2R1Y3Rpb24gZG9tYWluIGNvbmZpZ3VyYXRpb25cclxuICAgIGNvbnN0IHByb2R1Y3Rpb25Eb21haW4gPSAnbWlzcmEuZGlnaXRyYW5zb2x1dGlvbnMuaW4nO1xyXG4gICAgY29uc3QgYXBpRG9tYWluID0gJ2FwaS5taXNyYS5kaWdpdHJhbnNvbHV0aW9ucy5pbic7XHJcbiAgICBjb25zdCBob3N0ZWRab25lTmFtZSA9ICdkaWdpdHJhbnNvbHV0aW9ucy5pbic7XHJcbiAgICBcclxuICAgIC8vIEltcG9ydCBleGlzdGluZyBob3N0ZWQgem9uZSAobXVzdCBleGlzdCBpbiBSb3V0ZTUzKVxyXG4gICAgLy8gTm90ZTogVGhlIGhvc3RlZCB6b25lIG11c3QgYmUgY3JlYXRlZCBtYW51YWxseSBpbiBSb3V0ZTUzIGJlZm9yZSBkZXBsb3lpbmcgdGhpcyBzdGFja1xyXG4gICAgY29uc3QgaG9zdGVkWm9uZSA9IHJvdXRlNTMuSG9zdGVkWm9uZS5mcm9tTG9va3VwKHRoaXMsICdIb3N0ZWRab25lJywge1xyXG4gICAgICBkb21haW5OYW1lOiBob3N0ZWRab25lTmFtZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTU0wgY2VydGlmaWNhdGUgZm9yIENsb3VkRnJvbnQgKG11c3QgYmUgaW4gdXMtZWFzdC0xKVxyXG4gICAgLy8gQ2xvdWRGcm9udCByZXF1aXJlcyBjZXJ0aWZpY2F0ZXMgdG8gYmUgaW4gdXMtZWFzdC0xIHJlZ2lvblxyXG4gICAgY29uc3QgZnJvbnRlbmRDZXJ0aWZpY2F0ZSA9IG5ldyBjZXJ0aWZpY2F0ZW1hbmFnZXIuQ2VydGlmaWNhdGUodGhpcywgJ0Zyb250ZW5kQ2VydGlmaWNhdGUnLCB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IHByb2R1Y3Rpb25Eb21haW4sXHJcbiAgICAgIHZhbGlkYXRpb246IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZVZhbGlkYXRpb24uZnJvbURucyhob3N0ZWRab25lKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTU0wgY2VydGlmaWNhdGUgZm9yIEFQSSBHYXRld2F5IChjYW4gYmUgaW4gYW55IHJlZ2lvbilcclxuICAgIGNvbnN0IGFwaUNlcnRpZmljYXRlID0gbmV3IGNlcnRpZmljYXRlbWFuYWdlci5DZXJ0aWZpY2F0ZSh0aGlzLCAnQXBpQ2VydGlmaWNhdGUnLCB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IGFwaURvbWFpbixcclxuICAgICAgdmFsaWRhdGlvbjogY2VydGlmaWNhdGVtYW5hZ2VyLkNlcnRpZmljYXRlVmFsaWRhdGlvbi5mcm9tRG5zKGhvc3RlZFpvbmUpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUzMgQnVja2V0cyBmb3IgZmlsZSBzdG9yYWdlXHJcbiAgICBjb25zdCBmaWxlU3RvcmFnZUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0ZpbGVTdG9yYWdlQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0tZmlsZXMtJHtlbnZpcm9ubWVudH0tJHt0aGlzLmFjY291bnR9YCxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZnJvbnRlbmRCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdGcm9udGVuZEJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYG1pc3JhLXBsYXRmb3JtLWZyb250ZW5kLSR7ZW52aXJvbm1lbnR9LSR7dGhpcy5hY2NvdW50fWAsXHJcbiAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BQ0xTLFxyXG4gICAgICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciBmcm9udGVuZCB3aXRoIGN1c3RvbSBkb21haW5cclxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRnJvbnRlbmREaXN0cmlidXRpb24nLCB7XHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oZnJvbnRlbmRCdWNrZXQpLFxyXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxyXG4gICAgICAgIG9yaWdpblJlcXVlc3RQb2xpY3k6IGNsb3VkZnJvbnQuT3JpZ2luUmVxdWVzdFBvbGljeS5DT1JTX1MzX09SSUdJTixcclxuICAgICAgfSxcclxuICAgICAgZG9tYWluTmFtZXM6IFtwcm9kdWN0aW9uRG9tYWluXSxcclxuICAgICAgY2VydGlmaWNhdGU6IGZyb250ZW5kQ2VydGlmaWNhdGUsXHJcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxyXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgcHJpY2VDbGFzczogY2xvdWRmcm9udC5QcmljZUNsYXNzLlBSSUNFX0NMQVNTXzEwMCwgLy8gVXNlIG9ubHkgTm9ydGggQW1lcmljYSBhbmQgRXVyb3BlIGVkZ2UgbG9jYXRpb25zXHJcbiAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXHJcbiAgICAgIGNvbW1lbnQ6ICdNSVNSQSBQbGF0Zm9ybSBQcm9kdWN0aW9uIEZyb250ZW5kIERpc3RyaWJ1dGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgUm91dGU1MyBBIHJlY29yZCBmb3IgZnJvbnRlbmQgZG9tYWluXHJcbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdGcm9udGVuZEFsaWFzUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBwcm9kdWN0aW9uRG9tYWluLFxyXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhcclxuICAgICAgICBuZXcgcm91dGU1M3RhcmdldHMuQ2xvdWRGcm9udFRhcmdldChkaXN0cmlidXRpb24pXHJcbiAgICAgICksXHJcbiAgICAgIGNvbW1lbnQ6ICdDbG91ZEZyb250IGRpc3RyaWJ1dGlvbiBmb3IgTUlTUkEgUGxhdGZvcm0gZnJvbnRlbmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29nbml0byBVc2VyIFBvb2wgZm9yIGF1dGhlbnRpY2F0aW9uXHJcbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBjb2duaXRvLlVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHtcclxuICAgICAgdXNlclBvb2xOYW1lOiBgbWlzcmEtcGxhdGZvcm0tdXNlcnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBzZWxmU2lnblVwRW5hYmxlZDogdHJ1ZSxcclxuICAgICAgc2lnbkluQWxpYXNlczoge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgIHVzZXJuYW1lOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgYXV0b1ZlcmlmeToge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBzdGFuZGFyZEF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBlbWFpbDoge1xyXG4gICAgICAgICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICAgICAgICBtdXRhYmxlOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZnVsbG5hbWU6IHtcclxuICAgICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICBjdXN0b21BdHRyaWJ1dGVzOiB7XHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IG5ldyBjb2duaXRvLlN0cmluZ0F0dHJpYnV0ZSh7IFxyXG4gICAgICAgICAgbWluTGVuOiAxLCBcclxuICAgICAgICAgIG1heExlbjogMjU2LFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgICByb2xlOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBcclxuICAgICAgICAgIG1pbkxlbjogMSwgXHJcbiAgICAgICAgICBtYXhMZW46IDUwLFxyXG4gICAgICAgICAgbXV0YWJsZTogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICAgIHRlbXBQYXNzd29yZFZhbGlkaXR5OiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgfSxcclxuICAgICAgYWNjb3VudFJlY292ZXJ5OiBjb2duaXRvLkFjY291bnRSZWNvdmVyeS5FTUFJTF9PTkxZLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgIG1mYTogY29nbml0by5NZmEuT1BUSU9OQUwsXHJcbiAgICAgIG1mYVNlY29uZEZhY3Rvcjoge1xyXG4gICAgICAgIHNtczogZmFsc2UsXHJcbiAgICAgICAgb3RwOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICB1c2VyVmVyaWZpY2F0aW9uOiB7XHJcbiAgICAgICAgZW1haWxTdWJqZWN0OiAnVmVyaWZ5IHlvdXIgZW1haWwgZm9yIE1pc3JhIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdUaGFuayB5b3UgZm9yIHNpZ25pbmcgdXAhIFlvdXIgdmVyaWZpY2F0aW9uIGNvZGUgaXMgeyMjIyN9JyxcclxuICAgICAgICBlbWFpbFN0eWxlOiBjb2duaXRvLlZlcmlmaWNhdGlvbkVtYWlsU3R5bGUuQ09ERSxcclxuICAgICAgfSxcclxuICAgICAgdXNlckludml0YXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIE1pc3JhIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdIZWxsbyB7dXNlcm5hbWV9LCB5b3UgaGF2ZSBiZWVuIGludml0ZWQgdG8gam9pbiBNaXNyYSBQbGF0Zm9ybS4gWW91ciB0ZW1wb3JhcnkgcGFzc3dvcmQgaXMgeyMjIyN9JyxcclxuICAgICAgfSxcclxuICAgICAgZGV2aWNlVHJhY2tpbmc6IHtcclxuICAgICAgICBjaGFsbGVuZ2VSZXF1aXJlZE9uTmV3RGV2aWNlOiB0cnVlLFxyXG4gICAgICAgIGRldmljZU9ubHlSZW1lbWJlcmVkT25Vc2VyUHJvbXB0OiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSB1c2VyUG9vbC5hZGRDbGllbnQoJ1dlYkNsaWVudCcsIHtcclxuICAgICAgdXNlclBvb2xDbGllbnROYW1lOiBgbWlzcmEtcGxhdGZvcm0td2ViLWNsaWVudC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0OiBmYWxzZSxcclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByZXZlbnRVc2VyRXhpc3RlbmNlRXJyb3JzOiB0cnVlLFxyXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICBhY2Nlc3NUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICBlbmFibGVUb2tlblJldm9jYXRpb246IHRydWUsXHJcbiAgICAgIHJlYWRBdHRyaWJ1dGVzOiBuZXcgY29nbml0by5DbGllbnRBdHRyaWJ1dGVzKClcclxuICAgICAgICAud2l0aFN0YW5kYXJkQXR0cmlidXRlcyh7XHJcbiAgICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgICAgIGVtYWlsVmVyaWZpZWQ6IHRydWUsXHJcbiAgICAgICAgICBmdWxsbmFtZTogdHJ1ZSxcclxuICAgICAgICB9KVxyXG4gICAgICAgIC53aXRoQ3VzdG9tQXR0cmlidXRlcygnb3JnYW5pemF0aW9uSWQnLCAncm9sZScpLFxyXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZnVsbG5hbWU6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ29yZ2FuaXphdGlvbklkJywgJ3JvbGUnKSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIER5bmFtb0RCIFRhYmxlcyAtIFVzaW5nIGV4aXN0aW5nIHRhYmxlIG5hbWVzIGZyb20gcHJldmlvdXMgZGVwbG95bWVudFxyXG4gICAgY29uc3QgdXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tdXNlcnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBvcmdhbml6YXRpb24gcXVlcmllc1xyXG4gICAgdXNlcnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ29yZ2FuaXphdGlvbklkLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdvcmdhbml6YXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBlbWFpbCBxdWVyaWVzXHJcbiAgICB1c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZW1haWwtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VtYWlsJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZSBleGlzdGluZyBUZXN0UHJvamVjdHMgdGFibGVcclxuICAgIGNvbnN0IHByb2plY3RzVGFibGUgPSBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdFeGlzdGluZ1Rlc3RQcm9qZWN0c1RhYmxlJywgJ1Rlc3RQcm9qZWN0cycpO1xyXG5cclxuICAgIGNvbnN0IGFuYWx5c2VzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0FuYWx5c2VzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLWFuYWx5c2VzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdhbmFseXNpc0lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkFXU19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBGb3IgZGV2ZWxvcG1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0lzIGZvciBlZmZpY2llbnQgcXVlcnlpbmdcclxuICAgIGFuYWx5c2VzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdwcm9qZWN0SWQtY3JlYXRlZEF0LWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdwcm9qZWN0SWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgYW5hbHlzZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3N0YXR1cy1jcmVhdGVkQXQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3N0YXR1cycsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB0ZXN0UnVuc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdUZXN0UnVuc1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS10ZXN0LXJ1bnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3Rlc3RSdW5JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3Byb2plY3RJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbmFseXNpcyBSZXN1bHRzIFRhYmxlIGZvciBzdG9yaW5nIGRldGFpbGVkIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBbmFseXNpc1Jlc3VsdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtcmVzdWx0cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnYW5hbHlzaXNJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJcyBmb3IgYW5hbHlzaXMgcmVzdWx0cyBxdWVyaWVzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ2ZpbGVJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2ZpbGVJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3J1bGVTZXQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdydWxlU2V0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgTWV0YWRhdGEgVGFibGUgZm9yIHRyYWNraW5nIHVwbG9hZGVkIGZpbGVzIGFuZCBhbmFseXNpcyBzdGF0dXNcclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YVRhYmxlID0gbmV3IEZpbGVNZXRhZGF0YVRhYmxlKHRoaXMsICdGaWxlTWV0YWRhdGFUYWJsZScsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTYW1wbGUgRmlsZXMgVGFibGUgZm9yIHN0b3JpbmcgcHJlZGVmaW5lZCBDL0MrKyBmaWxlcyB3aXRoIGtub3duIE1JU1JBIHZpb2xhdGlvbnNcclxuICAgIGNvbnN0IHNhbXBsZUZpbGVzVGFibGUgPSB7IHRhYmxlOiBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdFeGlzdGluZ1NhbXBsZUZpbGVzVGFibGUnLCAnU2FtcGxlRmlsZXMnKSB9O1xyXG5cclxuICAgIC8vIFVwbG9hZCBQcm9ncmVzcyBUYWJsZSBmb3IgdHJhY2tpbmcgZmlsZSB1cGxvYWQgcHJvZ3Jlc3NcclxuICAgIGNvbnN0IHVwbG9hZFByb2dyZXNzVGFibGUgPSBuZXcgVXBsb2FkUHJvZ3Jlc3NUYWJsZSh0aGlzLCAnVXBsb2FkUHJvZ3Jlc3NUYWJsZScsIHsgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50IH0pO1xyXG5cclxuICAgIC8vIFByb2plY3RzIFRhYmxlIGZvciBXZWIgQXBwIFRlc3RpbmcgU3lzdGVtIC0gVXNpbmcgZXhpc3RpbmcgVGVzdFByb2plY3RzIHRhYmxlXHJcbiAgICBjb25zdCB0ZXN0UHJvamVjdHNUYWJsZSA9IHsgdGFibGU6IHByb2plY3RzVGFibGUgfTtcclxuXHJcbiAgICAvLyBUZXN0IFN1aXRlcyBUYWJsZSBmb3IgV2ViIEFwcCBUZXN0aW5nIFN5c3RlbSAtIEltcG9ydCBleGlzdGluZyB0YWJsZVxyXG4gICAgY29uc3QgdGVzdFN1aXRlc1RhYmxlID0geyB0YWJsZTogZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnRXhpc3RpbmdUZXN0U3VpdGVzVGFibGUnLCAnVGVzdFN1aXRlcycpIH07XHJcblxyXG4gICAgLy8gVGVzdCBDYXNlcyBUYWJsZSBmb3IgV2ViIEFwcCBUZXN0aW5nIFN5c3RlbSAtIEltcG9ydCBleGlzdGluZyB0YWJsZVxyXG4gICAgY29uc3QgdGVzdENhc2VzVGFibGUgPSB7IHRhYmxlOiBkeW5hbW9kYi5UYWJsZS5mcm9tVGFibGVOYW1lKHRoaXMsICdFeGlzdGluZ1Rlc3RDYXNlc1RhYmxlJywgJ1Rlc3RDYXNlcycpIH07XHJcblxyXG4gICAgLy8gVGVzdCBFeGVjdXRpb25zIFRhYmxlIGZvciBXZWIgQXBwIFRlc3RpbmcgU3lzdGVtIC0gSW1wb3J0IGV4aXN0aW5nIHRhYmxlXHJcbiAgICBjb25zdCB0ZXN0RXhlY3V0aW9uc1RhYmxlID0geyB0YWJsZTogZHluYW1vZGIuVGFibGUuZnJvbVRhYmxlTmFtZSh0aGlzLCAnRXhpc3RpbmdUZXN0RXhlY3V0aW9uc1RhYmxlJywgJ1Rlc3RFeGVjdXRpb25zJykgfTtcclxuXHJcbiAgICAvLyBTY3JlZW5zaG90cyBCdWNrZXQgZm9yIFRlc3QgRXhlY3V0aW9uIEZhaWx1cmVzXHJcbiAgICBjb25zdCBzY3JlZW5zaG90c0J1Y2tldCA9IG5ldyBTY3JlZW5zaG90c0J1Y2tldCh0aGlzLCAnU2NyZWVuc2hvdHNCdWNrZXQnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiBlbnZpcm9ubWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTm90aWZpY2F0aW9uIFN5c3RlbSBUYWJsZXNcclxuICAgIGNvbnN0IG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUgPSBuZXcgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZSh0aGlzLCAnTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZScsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZSA9IG5ldyBOb3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZSh0aGlzLCAnTm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiBlbnZpcm9ubWVudFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlID0gbmV3IE5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZSh0aGlzLCAnTm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogZW52aXJvbm1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFJIFVzYWdlIFRhYmxlIGZvciBBSSBUZXN0IEdlbmVyYXRpb24gLSBJbXBvcnQgZXhpc3RpbmcgdGFibGVcclxuICAgIGNvbnN0IGFpVXNhZ2VUYWJsZSA9IHsgdGFibGU6IGR5bmFtb2RiLlRhYmxlLmZyb21UYWJsZU5hbWUodGhpcywgJ0V4aXN0aW5nQUlVc2FnZVRhYmxlJywgJ0FJVXNhZ2UnKSB9O1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIENhY2hlIFRhYmxlIGZvciBNSVNSQSBhbmFseXNpcyBjYWNoaW5nIChSZXF1aXJlbWVudCAxMC43KVxyXG4gICAgY29uc3QgYW5hbHlzaXNDYWNoZVRhYmxlID0gbmV3IEFuYWx5c2lzQ2FjaGVUYWJsZSh0aGlzLCAnQW5hbHlzaXNDYWNoZVRhYmxlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogZW52aXJvbm1lbnRcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNOUyBUb3BpY3MgZm9yIE5vdGlmaWNhdGlvbiBEZWxpdmVyeVxyXG4gICAgY29uc3QgZW1haWxOb3RpZmljYXRpb25Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ0VtYWlsTm90aWZpY2F0aW9uVG9waWMnLCB7XHJcbiAgICAgIHRvcGljTmFtZTogYGFpYnRzLW5vdGlmaWNhdGlvbnMtZW1haWwtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkaXNwbGF5TmFtZTogJ0FJQlRTIEVtYWlsIE5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3Qgc21zTm90aWZpY2F0aW9uVG9waWMgPSBuZXcgc25zLlRvcGljKHRoaXMsICdTbXNOb3RpZmljYXRpb25Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiBgYWlidHMtbm90aWZpY2F0aW9ucy1zbXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkaXNwbGF5TmFtZTogJ0FJQlRTIFNNUyBOb3RpZmljYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHdlYmhvb2tOb3RpZmljYXRpb25Ub3BpYyA9IG5ldyBzbnMuVG9waWModGhpcywgJ1dlYmhvb2tOb3RpZmljYXRpb25Ub3BpYycsIHtcclxuICAgICAgdG9waWNOYW1lOiBgYWlidHMtbm90aWZpY2F0aW9ucy13ZWJob29rLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGlzcGxheU5hbWU6ICdBSUJUUyBXZWJob29rIE5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU1FTIFF1ZXVlIGZvciBub3RpZmljYXRpb24gcHJvY2Vzc2luZ1xyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uRExRID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnTm90aWZpY2F0aW9uRExRJywge1xyXG4gICAgICBxdWV1ZU5hbWU6IGBhaWJ0cy1ub3RpZmljYXRpb24tZGxxLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksIC8vIEtlZXAgZmFpbGVkIG1lc3NhZ2VzIGZvciAxNCBkYXlzXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25RdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ05vdGlmaWNhdGlvblF1ZXVlJywge1xyXG4gICAgICBxdWV1ZU5hbWU6IGBhaWJ0cy1ub3RpZmljYXRpb24tcXVldWUtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLCAvLyBNYXRjaCBMYW1iZGEgdGltZW91dFxyXG4gICAgICByZWNlaXZlTWVzc2FnZVdhaXRUaW1lOiBjZGsuRHVyYXRpb24uc2Vjb25kcygyMCksIC8vIExvbmcgcG9sbGluZ1xyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDQpLFxyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogbm90aWZpY2F0aW9uRExRLFxyXG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMywgLy8gUmV0cnkgdXAgdG8gMyB0aW1lcyBiZWZvcmUgbW92aW5nIHRvIERMUVxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXZlbnRCcmlkZ2UgUnVsZSBmb3IgVGVzdCBDb21wbGV0aW9uIEV2ZW50c1xyXG4gICAgLy8gUm91dGVzIHRlc3QgZXhlY3V0aW9uIGNvbXBsZXRpb24gZXZlbnRzIHRvIG5vdGlmaWNhdGlvbiBxdWV1ZVxyXG4gICAgY29uc3QgdGVzdENvbXBsZXRpb25SdWxlID0gbmV3IGV2ZW50cy5SdWxlKHRoaXMsICdUZXN0Q29tcGxldGlvblJ1bGUnLCB7XHJcbiAgICAgIHJ1bGVOYW1lOiBgYWlidHMtdGVzdC1leGVjdXRpb24tY29tcGxldGlvbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUm91dGVzIHRlc3QgZXhlY3V0aW9uIGNvbXBsZXRpb24gZXZlbnRzIHRvIG5vdGlmaWNhdGlvbiBxdWV1ZScsXHJcbiAgICAgIGV2ZW50UGF0dGVybjoge1xyXG4gICAgICAgIHNvdXJjZTogWydhaWJ0cy50ZXN0LWV4ZWN1dGlvbiddLFxyXG4gICAgICAgIGRldGFpbFR5cGU6IFsnVGVzdCBFeGVjdXRpb24gQ29tcGxldGVkJ10sXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgbm90aWZpY2F0aW9uIHF1ZXVlIGFzIHRhcmdldCBmb3IgdGVzdCBjb21wbGV0aW9uIGV2ZW50c1xyXG4gICAgdGVzdENvbXBsZXRpb25SdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5TcXNRdWV1ZShub3RpZmljYXRpb25RdWV1ZSkpO1xyXG5cclxuICAgIC8vIFNjaGVkdWxlZCBSZXBvcnRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3Qgc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnU2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBhaWJ0cy1zY2hlZHVsZWQtcmVwb3J0cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvc2NoZWR1bGVkLXJlcG9ydHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIE5PVElGSUNBVElPTl9RVUVVRV9VUkw6IG5vdGlmaWNhdGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gc2NoZWR1bGVkIHJlcG9ydHMgZnVuY3Rpb25cclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMoc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBFdmVudEJyaWRnZSBDcm9uIFJ1bGVzIGZvciBTY2hlZHVsZWQgUmVwb3J0c1xyXG4gICAgLy8gRGFpbHkgUmVwb3J0IC0gMDk6MDAgVVRDIGRhaWx5XHJcbiAgICBjb25zdCBkYWlseVJlcG9ydFJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ0RhaWx5UmVwb3J0UnVsZScsIHtcclxuICAgICAgcnVsZU5hbWU6IGBhaWJ0cy1kYWlseS1zdW1tYXJ5LXJlcG9ydC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVHJpZ2dlcnMgZGFpbHkgdGVzdCBleGVjdXRpb24gc3VtbWFyeSByZXBvcnQnLFxyXG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgIG1pbnV0ZTogJzAnLFxyXG4gICAgICAgIGhvdXI6ICc5JyxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuICAgIGRhaWx5UmVwb3J0UnVsZS5hZGRUYXJnZXQobmV3IHRhcmdldHMuTGFtYmRhRnVuY3Rpb24oc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uKSk7XHJcblxyXG4gICAgLy8gV2Vla2x5IFJlcG9ydCAtIDA5OjAwIFVUQyBldmVyeSBNb25kYXlcclxuICAgIGNvbnN0IHdlZWtseVJlcG9ydFJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ1dlZWtseVJlcG9ydFJ1bGUnLCB7XHJcbiAgICAgIHJ1bGVOYW1lOiBgYWlidHMtd2Vla2x5LXN1bW1hcnktcmVwb3J0LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdUcmlnZ2VycyB3ZWVrbHkgdGVzdCBleGVjdXRpb24gc3VtbWFyeSByZXBvcnQnLFxyXG4gICAgICBzY2hlZHVsZTogZXZlbnRzLlNjaGVkdWxlLmNyb24oe1xyXG4gICAgICAgIG1pbnV0ZTogJzAnLFxyXG4gICAgICAgIGhvdXI6ICc5JyxcclxuICAgICAgICB3ZWVrRGF5OiAnTU9OJyxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuICAgIHdlZWtseVJlcG9ydFJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBQcmVmZXJlbmNlcyBBUEkgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgZ2V0UHJlZmVyZW5jZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFByZWZlcmVuY2VzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGFpYnRzLWdldC1wcmVmZXJlbmNlcy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvZ2V0LXByZWZlcmVuY2VzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1BSRUZFUkVOQ0VTX1RBQkxFOiBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1cGRhdGVQcmVmZXJlbmNlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgYWlidHMtdXBkYXRlLXByZWZlcmVuY2VzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy91cGRhdGUtcHJlZmVyZW5jZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fUFJFRkVSRU5DRVNfVEFCTEU6IG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE5vdGlmaWNhdGlvbiBIaXN0b3J5IEFQSSBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBnZXRIaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRIaXN0b3J5RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGFpYnRzLWdldC1oaXN0b3J5LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9nZXQtaGlzdG9yeScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIE5PVElGSUNBVElPTl9ISVNUT1JZX1RBQkxFOiBub3RpZmljYXRpb25IaXN0b3J5VGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0Tm90aWZpY2F0aW9uRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGFpYnRzLWdldC1ub3RpZmljYXRpb24tJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2dldC1ub3RpZmljYXRpb24nKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fSElTVE9SWV9UQUJMRTogbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RpZmljYXRpb24gVGVtcGxhdGUgQVBJIExhbWJkYSBGdW5jdGlvbnMgKEFkbWluIE9ubHkpXHJcbiAgICBjb25zdCBjcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlVGVtcGxhdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgYWlidHMtY3JlYXRlLXRlbXBsYXRlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvbm90aWZpY2F0aW9ucy9jcmVhdGUtdGVtcGxhdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVtcGxhdGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVRlbXBsYXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGFpYnRzLXVwZGF0ZS10ZW1wbGF0ZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvdXBkYXRlLXRlbXBsYXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1RFTVBMQVRFU19UQUJMRTogbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGdldFRlbXBsYXRlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VGVtcGxhdGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGFpYnRzLWdldC10ZW1wbGF0ZXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL2dldC10ZW1wbGF0ZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgdG8gbm90aWZpY2F0aW9uIEFQSSBmdW5jdGlvbnNcclxuICAgIG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQcmVmZXJlbmNlc0Z1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZVByZWZlcmVuY2VzRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0SGlzdG9yeUZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZW1wbGF0ZUZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVUZW1wbGF0ZUZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0VGVtcGxhdGVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFNRUyBRdWV1ZSBmb3IgYXN5bmMgcHJvY2Vzc2luZ1xyXG4gICAgY29uc3QgcHJvY2Vzc2luZ1F1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnUHJvY2Vzc2luZ1F1ZXVlJywge1xyXG4gICAgICBxdWV1ZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1wcm9jZXNzaW5nLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XHJcbiAgICAgICAgcXVldWU6IG5ldyBzcXMuUXVldWUodGhpcywgJ1Byb2Nlc3NpbmdETFEnLCB7XHJcbiAgICAgICAgICBxdWV1ZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1wcm9jZXNzaW5nLWRscS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU1FTIFF1ZXVlIGZvciBNSVNSQSBhbmFseXNpcyAoUmVxdWlyZW1lbnQgMTAuNSlcclxuICAgIGNvbnN0IGFuYWx5c2lzUXVldWVETFEgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdBbmFseXNpc1F1ZXVlRExRJywge1xyXG4gICAgICBxdWV1ZU5hbWU6IGBtaXNyYS1hbmFseXNpcy1kbHEtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFuYWx5c2lzUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdBbmFseXNpc1F1ZXVlJywge1xyXG4gICAgICBxdWV1ZU5hbWU6IGBtaXNyYS1hbmFseXNpcy1xdWV1ZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHZpc2liaWxpdHlUaW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgcmVjZWl2ZU1lc3NhZ2VXYWl0VGltZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMjApLFxyXG4gICAgICBkZWFkTGV0dGVyUXVldWU6IHtcclxuICAgICAgICBxdWV1ZTogYW5hbHlzaXNRdWV1ZURMUSxcclxuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTUVMgUXVldWUgZm9yIHRlc3QgZXhlY3V0aW9uXHJcbiAgICBjb25zdCB0ZXN0RXhlY3V0aW9uRExRID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnVGVzdEV4ZWN1dGlvbkRMUScsIHtcclxuICAgICAgcXVldWVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tdGVzdC1leGVjdXRpb24tZGxxLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBjZGsuRHVyYXRpb24uZGF5cygxNCksIC8vIEtlZXAgZmFpbGVkIG1lc3NhZ2VzIGZvciAxNCBkYXlzXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB0ZXN0RXhlY3V0aW9uUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdUZXN0RXhlY3V0aW9uUXVldWUnLCB7XHJcbiAgICAgIHF1ZXVlTmFtZTogYG1pc3JhLXBsYXRmb3JtLXRlc3QtZXhlY3V0aW9uLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSwgLy8gTWF0Y2ggTGFtYmRhIHRpbWVvdXRcclxuICAgICAgcmVjZWl2ZU1lc3NhZ2VXYWl0VGltZTogY2RrLkR1cmF0aW9uLnNlY29uZHMoMjApLCAvLyBMb25nIHBvbGxpbmdcclxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XHJcbiAgICAgICAgcXVldWU6IHRlc3RFeGVjdXRpb25ETFEsXHJcbiAgICAgICAgbWF4UmVjZWl2ZUNvdW50OiAzLCAvLyBSZXRyeSB1cCB0byAzIHRpbWVzIGJlZm9yZSBtb3ZpbmcgdG8gRExRXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZWNyZXRzIE1hbmFnZXIgZm9yIEpXVCBrZXlzXHJcbiAgICBjb25zdCBqd3RTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdKV1RTZWNyZXQnLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1qd3Qtc2VjcmV0LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcclxuICAgICAgICBzZWNyZXRTdHJpbmdUZW1wbGF0ZTogSlNPTi5zdHJpbmdpZnkoeyB1c2VybmFtZTogJ2p3dCcgfSksXHJcbiAgICAgICAgZ2VuZXJhdGVTdHJpbmdLZXk6ICdzZWNyZXQnLFxyXG4gICAgICAgIGV4Y2x1ZGVDaGFyYWN0ZXJzOiAnXCJAL1xcXFwnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIEF1dGhvcml6ZXIgZm9yIEpXVCB2ZXJpZmljYXRpb25cclxuICAgIGNvbnN0IGF1dGhvcml6ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhvcml6ZXJGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tYXV0aG9yaXplci0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvYXV0aG9yaXplcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBTZWNyZXRzIE1hbmFnZXIgcmVhZCBhY2Nlc3MgdG8gYXV0aG9yaXplclxyXG4gICAgand0U2VjcmV0LmdyYW50UmVhZChhdXRob3JpemVyRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEF1dGhlbnRpY2F0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGxvZ2luRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMb2dpbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1sb2dpbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvbG9naW4nKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBKV1RfU0VDUkVUX05BTUU6IGp3dFNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICAgIE44Tl9XRUJIT09LX1VSTDogcHJvY2Vzcy5lbnYuTjhOX1dFQkhPT0tfVVJMIHx8ICcnLFxyXG4gICAgICAgIE44Tl9BUElfS0VZOiBwcm9jZXNzLmVudi5OOE5fQVBJX0tFWSB8fCAnJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVnaXN0ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1JlZ2lzdGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLXJlZ2lzdGVyLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9yZWdpc3RlcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgICAgTjhOX1dFQkhPT0tfVVJMOiBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkwgfHwgJycsXHJcbiAgICAgICAgTjhOX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZWZyZXNoRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdSZWZyZXNoRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLXJlZnJlc2gtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hdXRoL3JlZnJlc2gnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBKV1RfU0VDUkVUX05BTUU6IGp3dFNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbWFpbCBWZXJpZmljYXRpb24gYW5kIE9UUCBJbnRlZ3JhdGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBpbml0aWF0ZUZsb3dGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0luaXRpYXRlRmxvd0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1pbml0aWF0ZS1mbG93LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9pbml0aWF0ZS1mbG93JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHZlcmlmeUVtYWlsV2l0aE9UUEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVmVyaWZ5RW1haWxXaXRoT1RQRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLXZlcmlmeS1lbWFpbC13aXRoLW90cC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2F1dGgvdmVyaWZ5LWVtYWlsLXdpdGgtb3RwJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUl9QT09MX0lEOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0NvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tY29tcGxldGUtb3RwLXNldHVwLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9jb21wbGV0ZS1vdHAtc2V0dXAnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBVU0VSX1BPT0xfSUQ6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgVVNFUl9QT09MX0NMSUVOVF9JRDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgICBKV1RfU0VDUkVUX05BTUU6IGp3dFNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBGaWxlIFVwbG9hZCBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBmaWxlVXBsb2FkRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdGaWxlVXBsb2FkRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWZpbGUtdXBsb2FkLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS91cGxvYWQnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IGZpbGVTdG9yYWdlQnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdkZXYnLFxyXG4gICAgICAgIEFOQUxZU0lTX1FVRVVFX1VSTDogYW5hbHlzaXNRdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBsb2FkQ29tcGxldGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwbG9hZENvbXBsZXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLXVwbG9hZC1jb21wbGV0ZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvdXBsb2FkLWNvbXBsZXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUFJPQ0VTU0lOR19RVUVVRV9VUkw6IHByb2Nlc3NpbmdRdWV1ZS5xdWV1ZVVybCxcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ2RldicsXHJcbiAgICAgICAgU1RBVEVfTUFDSElORV9BUk46ICcnLCAvLyBXaWxsIGJlIHNldCBhZnRlciB3b3JrZmxvdyBpcyBjcmVhdGVkXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0RmlsZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEZpbGVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWdldC1maWxlcy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvZ2V0LWZpbGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdkZXYnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTYW1wbGUgRmlsZSBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGdldFNhbXBsZUZpbGVzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRTYW1wbGVGaWxlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1nZXQtc2FtcGxlLWZpbGVzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZmlsZS9nZXQtc2FtcGxlLWZpbGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgU0FNUExFX0ZJTEVTX1RBQkxFOiBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11cGxvYWQtc2FtcGxlLWZpbGUtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlL3VwbG9hZC1zYW1wbGUtZmlsZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNBTVBMRV9GSUxFU19UQUJMRTogc2FtcGxlRmlsZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVDogZmlsZVN0b3JhZ2VCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFOiBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVBMT0FEX1BST0dSRVNTX1RBQkxFOiB1cGxvYWRQcm9ncmVzc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0VXBsb2FkUHJvZ3Jlc3NGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFVwbG9hZFByb2dyZXNzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWdldC11cGxvYWQtcHJvZ3Jlc3MtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlL2dldC11cGxvYWQtcHJvZ3Jlc3MnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBVUExPQURfUFJPR1JFU1NfVEFCTEU6IHVwbG9hZFByb2dyZXNzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxNSksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBpbml0aWFsaXplU2FtcGxlTGlicmFyeUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnSW5pdGlhbGl6ZVNhbXBsZUxpYnJhcnlGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0taW5pdGlhbGl6ZS1zYW1wbGUtbGlicmFyeS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2ZpbGUvaW5pdGlhbGl6ZS1zYW1wbGUtbGlicmFyeScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFNBTVBMRV9GSUxFU19UQUJMRTogc2FtcGxlRmlsZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQcm9qZWN0IE1hbmFnZW1lbnQgTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgY3JlYXRlUHJvamVjdEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlUHJvamVjdEZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1jcmVhdGUtcHJvamVjdC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Byb2plY3RzL2NyZWF0ZS1wcm9qZWN0JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUFJPSkVDVFNfVEFCTEVfTkFNRTogdGVzdFByb2plY3RzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRQcm9qZWN0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UHJvamVjdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tZ2V0LXByb2plY3RzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvcHJvamVjdHMvZ2V0LXByb2plY3RzLW1pbmltYWwnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBQUk9KRUNUU19UQUJMRV9OQU1FOiB0ZXN0UHJvamVjdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVwZGF0ZVByb2plY3RGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVByb2plY3RGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tdXBkYXRlLXByb2plY3QtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9wcm9qZWN0cy91cGRhdGUtcHJvamVjdCcpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFX05BTUU6IHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVGVzdCBTdWl0ZSBNYW5hZ2VtZW50IExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlVGVzdFN1aXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWNyZWF0ZS10ZXN0LXN1aXRlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvdGVzdC1zdWl0ZXMvY3JlYXRlLXN1aXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9TVUlURVNfVEFCTEVfTkFNRTogdGVzdFN1aXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0VGVzdFN1aXRlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1nZXQtdGVzdC1zdWl0ZXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LXN1aXRlcy9nZXQtc3VpdGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9TVUlURVNfVEFCTEVfTkFNRTogdGVzdFN1aXRlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdVcGRhdGVUZXN0U3VpdGVGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tdXBkYXRlLXRlc3Qtc3VpdGUtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LXN1aXRlcy91cGRhdGUtc3VpdGUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUZXN0IENhc2UgTWFuYWdlbWVudCBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQ3JlYXRlVGVzdENhc2VGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tY3JlYXRlLXRlc3QtY2FzZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3QtY2FzZXMvY3JlYXRlLXRlc3QtY2FzZScpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBnZXRUZXN0Q2FzZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldFRlc3RDYXNlc0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1nZXQtdGVzdC1jYXNlcy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3Rlc3QtY2FzZXMvZ2V0LXRlc3QtY2FzZXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgdXBkYXRlVGVzdENhc2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VwZGF0ZVRlc3RDYXNlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLXVwZGF0ZS10ZXN0LWNhc2UtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy90ZXN0LWNhc2VzL3VwZGF0ZS10ZXN0LWNhc2UnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnNcclxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGxvZ2luRnVuY3Rpb24pO1xyXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEocmVmcmVzaEZ1bmN0aW9uKTtcclxuICAgIGp3dFNlY3JldC5ncmFudFJlYWQobG9naW5GdW5jdGlvbik7XHJcbiAgICBqd3RTZWNyZXQuZ3JhbnRSZWFkKHJlZnJlc2hGdW5jdGlvbik7XHJcbiAgICBcclxuICAgIC8vIEVtYWlsIHZlcmlmaWNhdGlvbiBhbmQgT1RQIGludGVncmF0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShpbml0aWF0ZUZsb3dGdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh2ZXJpZnlFbWFpbFdpdGhPVFBGdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjb21wbGV0ZU9UUFNldHVwRnVuY3Rpb24pO1xyXG4gICAgand0U2VjcmV0LmdyYW50UmVhZChjb21wbGV0ZU9UUFNldHVwRnVuY3Rpb24pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCBDb2duaXRvIHBlcm1pc3Npb25zIHRvIHRoZSBuZXcgYXV0aCBmdW5jdGlvbnNcclxuICAgIGluaXRpYXRlRmxvd0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkdldFVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkNyZWF0ZVVzZXInLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJQYXNzd29yZCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFt1c2VyUG9vbC51c2VyUG9vbEFybl0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdmVyaWZ5RW1haWxXaXRoT1RQRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluQ29uZmlybVNpZ25VcCcsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJNRkFQcmVmZXJlbmNlJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIGNvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5HZXRVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyTUZBUHJlZmVyZW5jZScsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpWZXJpZnlTb2Z0d2FyZVRva2VuJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxyXG4gICAgfSkpO1xyXG4gICAgXHJcbiAgICAvLyBGaWxlIHVwbG9hZCBwZXJtaXNzaW9uc1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZmlsZVVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIGZpbGVTdG9yYWdlQnVja2V0LmdyYW50UmVhZCh1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuICAgIHByb2Nlc3NpbmdRdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyh1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuICAgIGFuYWx5c2lzUXVldWUuZ3JhbnRTZW5kTWVzc2FnZXMoZmlsZVVwbG9hZEZ1bmN0aW9uKTtcclxuICAgIFxyXG4gICAgLy8gRmlsZSBtZXRhZGF0YSBwZXJtaXNzaW9uc1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGZpbGVVcGxvYWRGdW5jdGlvbik7XHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBsb2FkQ29tcGxldGVGdW5jdGlvbik7XHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWREYXRhKGdldEZpbGVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFNhbXBsZSBmaWxlIHBlcm1pc3Npb25zXHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0U2FtcGxlRmlsZXNGdW5jdGlvbik7XHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEodXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uKTtcclxuICAgIHNhbXBsZUZpbGVzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGluaXRpYWxpemVTYW1wbGVMaWJyYXJ5RnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUodXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uKTtcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGxvYWRTYW1wbGVGaWxlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFVwbG9hZCBwcm9ncmVzcyBwZXJtaXNzaW9uc1xyXG4gICAgdXBsb2FkUHJvZ3Jlc3NUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEodXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uKTtcclxuICAgIHVwbG9hZFByb2dyZXNzVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRVcGxvYWRQcm9ncmVzc0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBQcm9qZWN0IG1hbmFnZW1lbnQgcGVybWlzc2lvbnNcclxuICAgIHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVQcm9qZWN0RnVuY3Rpb24pO1xyXG4gICAgdGVzdFByb2plY3RzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRQcm9qZWN0c0Z1bmN0aW9uKTtcclxuICAgIHRlc3RQcm9qZWN0c1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVQcm9qZWN0RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3Qgc3VpdGUgbWFuYWdlbWVudCBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZXN0U3VpdGVGdW5jdGlvbik7XHJcbiAgICB0ZXN0U3VpdGVzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRUZXN0U3VpdGVzRnVuY3Rpb24pO1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGRhdGVUZXN0U3VpdGVGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVzdCBjYXNlIG1hbmFnZW1lbnQgcGVybWlzc2lvbnNcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShjcmVhdGVUZXN0Q2FzZUZ1bmN0aW9uKTtcclxuICAgIHRlc3RDYXNlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEoZ2V0VGVzdENhc2VzRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKHVwZGF0ZVRlc3RDYXNlRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFJIFRlc3QgR2VuZXJhdGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAgICBjb25zdCBhaUFuYWx5emVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJQW5hbHl6ZUZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBhaWJ0cy1haS1hbmFseXplLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2FuYWx5emUnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAvLyBUYXNrIDEwLjE6IEFkZCBCZWRyb2NrIGNvbmZpZ3VyYXRpb24gZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgICAgICAgQUlfUFJPVklERVI6IHByb2Nlc3MuZW52LkFJX1BST1ZJREVSIHx8ICdCRURST0NLJyxcclxuICAgICAgICBCRURST0NLX1JFR0lPTjogcHJvY2Vzcy5lbnYuQkVEUk9DS19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICAgICAgQkVEUk9DS19NT0RFTF9JRDogcHJvY2Vzcy5lbnYuQkVEUk9DS19NT0RFTF9JRCB8fCAnYW50aHJvcGljLmNsYXVkZS0zLTUtc29ubmV0LTIwMjQxMDIyLXYyOjAnLFxyXG4gICAgICAgIEJFRFJPQ0tfVElNRU9VVDogcHJvY2Vzcy5lbnYuQkVEUk9DS19USU1FT1VUIHx8ICczMDAwMCcsXHJcbiAgICAgICAgRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORzogcHJvY2Vzcy5lbnYuRU5BQkxFX0JFRFJPQ0tfTU9OSVRPUklORyB8fCAndHJ1ZScsXHJcbiAgICAgICAgLy8gVGFzayAxMi4xOiBBZGQgY2FuYXJ5IGRlcGxveW1lbnQgdHJhZmZpYyBwZXJjZW50YWdlXHJcbiAgICAgICAgQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0U6IHByb2Nlc3MuZW52LkJFRFJPQ0tfVFJBRkZJQ19QRVJDRU5UQUdFIHx8ICcwJyxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksIC8vIEJyb3dzZXIgYXV0b21hdGlvbiBjYW4gdGFrZSB0aW1lXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsIC8vIFB1cHBldGVlciBuZWVkcyBtb3JlIG1lbW9yeVxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsIC8vIFRhc2sgOC4zOiBFbmFibGUgWC1SYXkgdHJhY2luZ1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJR2VuZXJhdGVUZXN0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGFpYnRzLWFpLWdlbmVyYXRlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2dlbmVyYXRlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICcnLFxyXG4gICAgICAgIC8vIFRhc2sgMTAuMTogQWRkIEJlZHJvY2sgY29uZmlndXJhdGlvbiBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgICAgICBBSV9QUk9WSURFUjogcHJvY2Vzcy5lbnYuQUlfUFJPVklERVIgfHwgJ0JFRFJPQ0snLFxyXG4gICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBwcm9jZXNzLmVudi5CRURST0NLX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBwcm9jZXNzLmVudi5CRURST0NLX01PREVMX0lEIHx8ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgICAgQkVEUk9DS19USU1FT1VUOiBwcm9jZXNzLmVudi5CRURST0NLX1RJTUVPVVQgfHwgJzMwMDAwJyxcclxuICAgICAgICBFTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HOiBwcm9jZXNzLmVudi5FTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HIHx8ICd0cnVlJyxcclxuICAgICAgICAvLyBUYXNrIDEyLjE6IEFkZCBjYW5hcnkgZGVwbG95bWVudCB0cmFmZmljIHBlcmNlbnRhZ2VcclxuICAgICAgICBCRURST0NLX1RSQUZGSUNfUEVSQ0VOVEFHRTogcHJvY2Vzcy5lbnYuQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgfHwgJzAnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgICAgdHJhY2luZzogbGFtYmRhLlRyYWNpbmcuQUNUSVZFLCAvLyBUYXNrIDguMzogRW5hYmxlIFgtUmF5IHRyYWNpbmdcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlCYXRjaEdlbmVyYXRlRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYGFpYnRzLWFpLWJhdGNoLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYWktdGVzdC1nZW5lcmF0aW9uL2JhdGNoJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQUlfVVNBR0VfVEFCTEU6IGFpVXNhZ2VUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVEVTVF9DQVNFU19UQUJMRV9OQU1FOiB0ZXN0Q2FzZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgT1BFTkFJX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk9QRU5BSV9BUElfS0VZIHx8ICcnLFxyXG4gICAgICAgIC8vIFRhc2sgMTAuMTogQWRkIEJlZHJvY2sgY29uZmlndXJhdGlvbiBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgICAgICBBSV9QUk9WSURFUjogcHJvY2Vzcy5lbnYuQUlfUFJPVklERVIgfHwgJ0JFRFJPQ0snLFxyXG4gICAgICAgIEJFRFJPQ0tfUkVHSU9OOiBwcm9jZXNzLmVudi5CRURST0NLX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgICAgICBCRURST0NLX01PREVMX0lEOiBwcm9jZXNzLmVudi5CRURST0NLX01PREVMX0lEIHx8ICdhbnRocm9waWMuY2xhdWRlLTMtNS1zb25uZXQtMjAyNDEwMjItdjI6MCcsXHJcbiAgICAgICAgQkVEUk9DS19USU1FT1VUOiBwcm9jZXNzLmVudi5CRURST0NLX1RJTUVPVVQgfHwgJzMwMDAwJyxcclxuICAgICAgICBFTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HOiBwcm9jZXNzLmVudi5FTkFCTEVfQkVEUk9DS19NT05JVE9SSU5HIHx8ICd0cnVlJyxcclxuICAgICAgICAvLyBUYXNrIDEyLjE6IEFkZCBjYW5hcnkgZGVwbG95bWVudCB0cmFmZmljIHBlcmNlbnRhZ2VcclxuICAgICAgICBCRURST0NLX1RSQUZGSUNfUEVSQ0VOVEFHRTogcHJvY2Vzcy5lbnYuQkVEUk9DS19UUkFGRklDX1BFUkNFTlRBR0UgfHwgJzAnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygxNSksIC8vIEJhdGNoIHByb2Nlc3NpbmcgY2FuIHRha2UgbG9uZ2VyXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsXHJcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSwgLy8gVGFzayA4LjM6IEVuYWJsZSBYLVJheSB0cmFjaW5nXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhaUdldFVzYWdlU3RhdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FJR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBhaWJ0cy1haS11c2FnZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpLXRlc3QtZ2VuZXJhdGlvbi9nZXQtdXNhZ2UnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBBSV9VU0FHRV9UQUJMRTogYWlVc2FnZVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyB0byBBSSB0ZXN0IGdlbmVyYXRpb24gZnVuY3Rpb25zXHJcbiAgICBhaVVzYWdlVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24pO1xyXG4gICAgYWlVc2FnZVRhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbik7XHJcbiAgICBhaVVzYWdlVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShhaUdldFVzYWdlU3RhdHNGdW5jdGlvbik7XHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbik7XHJcbiAgICB0ZXN0Q2FzZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24pO1xyXG4gICAgLy8gQmF0Y2ggNCBmdW5jdGlvbnMgdXNlIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgLSBubyBKV1Qgc2VjcmV0IG5lZWRlZFxyXG4gICAgLy8gYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiwgYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24sIGFpR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uXHJcblxyXG4gICAgLy8gQWRkIEJlZHJvY2sgcGVybWlzc2lvbnMgdG8gQUkgTGFtYmRhIGZ1bmN0aW9ucyAoVGFzayA1LjEpXHJcbiAgICAvLyBVc2luZyBpbmZlcmVuY2UgcHJvZmlsZSBmb3IgQ2xhdWRlIFNvbm5ldCA0LjYgKGNyb3NzLXJlZ2lvbiByb3V0aW5nKVxyXG4gICAgY29uc3QgYmVkcm9ja1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2JlZHJvY2s6SW52b2tlTW9kZWwnXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgJ2Fybjphd3M6YmVkcm9jazoqOio6aW5mZXJlbmNlLXByb2ZpbGUvdXMuYW50aHJvcGljLmNsYXVkZS1zb25uZXQtNC02JyxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFpQW5hbHl6ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShiZWRyb2NrUG9saWN5KTtcclxuICAgIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGJlZHJvY2tQb2xpY3kpO1xyXG4gICAgYWlCYXRjaEdlbmVyYXRlRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGJlZHJvY2tQb2xpY3kpO1xyXG5cclxuICAgIC8vIFRhc2sgNS4yOiBObyBCRURST0NLX0FQSV9LRVkgZW52aXJvbm1lbnQgdmFyaWFibGUgaXMgdXNlZFxyXG4gICAgLy8gVGhlIEJlZHJvY2tSdW50aW1lQ2xpZW50IHVzZXMgQVdTIFNESyBkZWZhdWx0IGNyZWRlbnRpYWwgcHJvdmlkZXIgKElBTSByb2xlcylcclxuICAgIFxyXG4gICAgLy8gVGFzayA1LjM6IENsb3VkV2F0Y2ggTG9ncyBwZXJtaXNzaW9ucyBhcmUgYXV0b21hdGljYWxseSBhZGRlZCBieSBDREtcclxuICAgIC8vIENESyBncmFudHMgbG9nczpDcmVhdGVMb2dHcm91cCwgbG9nczpDcmVhdGVMb2dTdHJlYW0sIGFuZCBsb2dzOlB1dExvZ0V2ZW50c1xyXG4gICAgLy8gdG8gYWxsIExhbWJkYSBmdW5jdGlvbnMgYnkgZGVmYXVsdCB0aHJvdWdoIHRoZSBMYW1iZGEgZXhlY3V0aW9uIHJvbGVcclxuXHJcbiAgICAvLyBUYXNrIDguMjogQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBCZWRyb2NrIG1vbml0b3JpbmdcclxuICAgIC8vIEFkZCBDbG91ZFdhdGNoIFB1dE1ldHJpY0RhdGEgcGVybWlzc2lvbiBmb3IgQmVkcm9jayBtb25pdG9yaW5nXHJcbiAgICBjb25zdCBjbG91ZFdhdGNoTWV0cmljc1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YSddLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYWlBbmFseXplRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGNsb3VkV2F0Y2hNZXRyaWNzUG9saWN5KTtcclxuICAgIGFpR2VuZXJhdGVUZXN0RnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGNsb3VkV2F0Y2hNZXRyaWNzUG9saWN5KTtcclxuICAgIGFpQmF0Y2hHZW5lcmF0ZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShjbG91ZFdhdGNoTWV0cmljc1BvbGljeSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBBbGFybTogSGlnaCBFcnJvciBSYXRlICg+MTAgZXJyb3JzIGluIDUgbWludXRlcylcclxuICAgIGNvbnN0IGJlZHJvY2tFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0JlZHJvY2tIaWdoRXJyb3JSYXRlQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYEFJQlRTLUJlZHJvY2stSGlnaEVycm9yUmF0ZS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgZXJyb3IgcmF0ZSBleGNlZWRzIDEwIGVycm9ycyBpbiA1IG1pbnV0ZXMnLFxyXG4gICAgICBtZXRyaWM6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tFcnJvcnMnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogMTAsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBBbGFybTogSGlnaCBMYXRlbmN5ICg+MzAgc2Vjb25kcyBhdmVyYWdlKVxyXG4gICAgY29uc3QgYmVkcm9ja0xhdGVuY3lBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdCZWRyb2NrSGlnaExhdGVuY3lBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgQUlCVFMtQmVkcm9jay1IaWdoTGF0ZW5jeS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgYXZlcmFnZSBsYXRlbmN5IGV4Y2VlZHMgMzAgc2Vjb25kcycsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0xhdGVuY3knLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDMwMDAwLCAvLyAzMCBzZWNvbmRzIGluIG1pbGxpc2Vjb25kc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggQWxhcm06IEhpZ2ggQ29zdCAoPiQxMDAvZGF5KVxyXG4gICAgLy8gTm90ZTogVGhpcyBhbGFybSBjaGVja3MgaWYgY29zdCBleGNlZWRzICQxMDAgaW4gYSAyNC1ob3VyIHBlcmlvZFxyXG4gICAgY29uc3QgYmVkcm9ja0Nvc3RBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdCZWRyb2NrSGlnaENvc3RBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgQUlCVFMtQmVkcm9jay1IaWdoQ29zdC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdBbGVydCB3aGVuIEJlZHJvY2sgY29zdCBleGNlZWRzICQxMDAgcGVyIGRheScsXHJcbiAgICAgIG1ldHJpYzogbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja0Nvc3QnLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24uaG91cnMoMjQpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAsIC8vICQxMDBcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgYWxhcm0gQVJOcyBmb3IgU05TIHRvcGljIHN1YnNjcmlwdGlvbiAob3B0aW9uYWwpXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmVkcm9ja0Vycm9yQWxhcm1Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBiZWRyb2NrRXJyb3JBbGFybS5hbGFybUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdCZWRyb2NrIEhpZ2ggRXJyb3IgUmF0ZSBBbGFybSBBUk4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0JlZHJvY2tMYXRlbmN5QWxhcm1Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBiZWRyb2NrTGF0ZW5jeUFsYXJtLmFsYXJtQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0JlZHJvY2sgSGlnaCBMYXRlbmN5IEFsYXJtIEFSTicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmVkcm9ja0Nvc3RBbGFybUFybicsIHtcclxuICAgICAgdmFsdWU6IGJlZHJvY2tDb3N0QWxhcm0uYWxhcm1Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmVkcm9jayBIaWdoIENvc3QgQWxhcm0gQVJOJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgMTI6IENyZWF0ZSBDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgQmVkcm9jayB2cyBPcGVuQUkgY29tcGFyaXNvblxyXG4gICAgY29uc3QgYmVkcm9ja0Rhc2hib2FyZCA9IG5ldyBjbG91ZHdhdGNoLkRhc2hib2FyZCh0aGlzLCAnQmVkcm9ja01pZ3JhdGlvbkRhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogYEFJQlRTLUJlZHJvY2stTWlncmF0aW9uLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCB3aWRnZXRzIHRvIGNvbXBhcmUgQmVkcm9jayB2cyBPcGVuQUkgbWV0cmljc1xyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMTogTGF0ZW5jeSBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIExhdGVuY3kgQ29tcGFyaXNvbicsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgQXZnIExhdGVuY3knLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnT3BlbkFJTGF0ZW5jeScsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ09wZW5BSSBBdmcgTGF0ZW5jeScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJvdyAxOiBFcnJvciBSYXRlIENvbXBhcmlzb25cclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnQUkgUHJvdmlkZXIgRXJyb3IgUmF0ZSBDb21wYXJpc29uJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tFcnJvcnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgRXJyb3JzJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSUVycm9ycycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIEVycm9ycycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMjogQ29zdCBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIENvc3QgQ29tcGFyaXNvbiAoMjRoKScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdCZWRyb2NrQ29zdCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIENvc3QnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICBtZXRyaWNOYW1lOiAnT3BlbkFJQ29zdCcsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLmhvdXJzKDI0KSxcclxuICAgICAgICAgICAgbGFiZWw6ICdPcGVuQUkgQ29zdCcsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIC8vIFJvdyAyOiBUb2tlbiBVc2FnZSBDb21wYXJpc29uXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0FJIFByb3ZpZGVyIFRva2VuIFVzYWdlJyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tUb2tlbnMnLFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgICBsYWJlbDogJ0JlZHJvY2sgVG9rZW5zJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvT3BlbkFJJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSVRva2VucycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIFRva2VucycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYmVkcm9ja0Rhc2hib2FyZC5hZGRXaWRnZXRzKFxyXG4gICAgICAvLyBSb3cgMzogUmVxdWVzdCBDb3VudFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdBSSBQcm92aWRlciBSZXF1ZXN0IENvdW50JyxcclxuICAgICAgICBsZWZ0OiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9CZWRyb2NrJyxcclxuICAgICAgICAgICAgbWV0cmljTmFtZTogJ0JlZHJvY2tSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnQmVkcm9jayBSZXF1ZXN0cycsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgIG5hbWVzcGFjZTogJ0FJQlRTL09wZW5BSScsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdPcGVuQUlSZXF1ZXN0cycsXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIGxhYmVsOiAnT3BlbkFJIFJlcXVlc3RzJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICAgLy8gUm93IDM6IFRyYWZmaWMgRGlzdHJpYnV0aW9uIChDYW5hcnkpXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLlNpbmdsZVZhbHVlV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0JlZHJvY2sgVHJhZmZpYyBQZXJjZW50YWdlJyxcclxuICAgICAgICBtZXRyaWNzOiBbXHJcbiAgICAgICAgICBuZXcgY2xvdWR3YXRjaC5NYXRoRXhwcmVzc2lvbih7XHJcbiAgICAgICAgICAgIGV4cHJlc3Npb246ICcoYmVkcm9jayAvIChiZWRyb2NrICsgb3BlbmFpKSkgKiAxMDAnLFxyXG4gICAgICAgICAgICB1c2luZ01ldHJpY3M6IHtcclxuICAgICAgICAgICAgICBiZWRyb2NrOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQUlCVFMvQmVkcm9jaycsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnQmVkcm9ja1JlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICBvcGVuYWk6IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgICAgICAgICAgICBuYW1lc3BhY2U6ICdBSUJUUy9PcGVuQUknLFxyXG4gICAgICAgICAgICAgICAgbWV0cmljTmFtZTogJ09wZW5BSVJlcXVlc3RzJyxcclxuICAgICAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGFiZWw6ICdCZWRyb2NrIFRyYWZmaWMgJScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGRhc2hib2FyZCBVUkxcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdCZWRyb2NrRGFzaGJvYXJkVVJMJywge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vY29uc29sZS5hd3MuYW1hem9uLmNvbS9jbG91ZHdhdGNoL2hvbWU/cmVnaW9uPSR7dGhpcy5yZWdpb259I2Rhc2hib2FyZHM6bmFtZT0ke2JlZHJvY2tEYXNoYm9hcmQuZGFzaGJvYXJkTmFtZX1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkV2F0Y2ggRGFzaGJvYXJkIGZvciBCZWRyb2NrIE1pZ3JhdGlvbiBNb25pdG9yaW5nJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIGNvbnN0IHRlc3RFeGVjdXRvckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVGVzdEV4ZWN1dG9yRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLXRlc3QtZXhlY3V0b3ItJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9leGVjdXRpb25zL2V4ZWN1dG9yJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfQ0FTRVNfVEFCTEVfTkFNRTogdGVzdENhc2VzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFNDUkVFTlNIT1RTX0JVQ0tFVF9OQU1FOiBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLCAvLyBNYXhpbXVtIExhbWJkYSB0aW1lb3V0XHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsIC8vIEluY3JlYXNlZCBtZW1vcnkgZm9yIGJyb3dzZXIgYXV0b21hdGlvblxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgdGVzdCBleGVjdXRvciBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEodGVzdEV4ZWN1dG9yRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YSh0ZXN0RXhlY3V0b3JGdW5jdGlvbik7XHJcbiAgICBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuZ3JhbnRSZWFkV3JpdGUodGVzdEV4ZWN1dG9yRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEdyYW50IEV2ZW50QnJpZGdlIHBlcm1pc3Npb25zIHRvIHRlc3QgZXhlY3V0b3IgZm9yIHB1Ymxpc2hpbmcgZXZlbnRzXHJcbiAgICAvLyB0ZXN0RXhlY3V0b3JGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgLy8gICBhY3Rpb25zOiBbJ2V2ZW50czpQdXRFdmVudHMnXSxcclxuICAgIC8vICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gRXZlbnRCcmlkZ2UgZGVmYXVsdCBidXNcclxuICAgIC8vIH0pKTtcclxuXHJcbiAgICAvLyBBZGQgU1FTIHRyaWdnZXIgZm9yIHRlc3QgZXhlY3V0b3JcclxuICAgIHRlc3RFeGVjdXRvckZ1bmN0aW9uLmFkZEV2ZW50U291cmNlKFxyXG4gICAgICBuZXcgbGFtYmRhRXZlbnRTb3VyY2VzLlNxc0V2ZW50U291cmNlKHRlc3RFeGVjdXRpb25RdWV1ZSwge1xyXG4gICAgICAgIGJhdGNoU2l6ZTogMSwgLy8gUHJvY2VzcyBvbmUgdGVzdCBhdCBhIHRpbWVcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksIC8vIE5vIGJhdGNoaW5nIGRlbGF5XHJcbiAgICAgICAgcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIEVuYWJsZSBwYXJ0aWFsIGJhdGNoIHJlc3BvbnNlc1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBUZXN0IEV4ZWN1dGlvbiBUcmlnZ2VyIExhbWJkYVxyXG4gICAgY29uc3QgdHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnVHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS10cmlnZ2VyLWV4ZWN1dGlvbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvdHJpZ2dlcicpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX0NBU0VTX1RBQkxFX05BTUU6IHRlc3RDYXNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBURVNUX1NVSVRFU19UQUJMRV9OQU1FOiB0ZXN0U3VpdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OX1FVRVVFX1VSTDogdGVzdEV4ZWN1dGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCB0cmlnZ2VyIGZ1bmN0aW9uIHBlcm1pc3Npb25zXHJcbiAgICB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG4gICAgdGVzdENhc2VzVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YSh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG4gICAgdGVzdFN1aXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEodHJpZ2dlckV4ZWN1dGlvbkZ1bmN0aW9uKTtcclxuICAgIHRlc3RFeGVjdXRpb25RdWV1ZS5ncmFudFNlbmRNZXNzYWdlcyh0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIFN0YXR1cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblN0YXR1c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWdldC1leGVjdXRpb24tc3RhdHVzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtc3RhdHVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgVEVTVF9FWEVDVVRJT05TX1RBQkxFX05BTUU6IHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBzdGF0dXMgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25TdGF0dXNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVzdCBFeGVjdXRpb24gUmVzdWx0cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dldEV4ZWN1dGlvblJlc3VsdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tZ2V0LWV4ZWN1dGlvbi1yZXN1bHRzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtcmVzdWx0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBTQ1JFRU5TSE9UU19CVUNLRVRfTkFNRTogc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHJlc3VsdHMgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgc2NyZWVuc2hvdHNCdWNrZXQuYnVja2V0LmdyYW50UmVhZChnZXRFeGVjdXRpb25SZXN1bHRzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgRXhlY3V0aW9uIEhpc3RvcnkgTGFtYmRhXHJcbiAgICBjb25zdCBnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdHZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWdldC1leGVjdXRpb24taGlzdG9yeS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2V4ZWN1dGlvbnMvZ2V0LWhpc3RvcnknKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBURVNUX0VYRUNVVElPTlNfVEFCTEVfTkFNRTogdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IGhpc3RvcnkgZnVuY3Rpb24gcGVybWlzc2lvbnNcclxuICAgIHRlc3RFeGVjdXRpb25zVGFibGUudGFibGUuZ3JhbnRSZWFkRGF0YShnZXRFeGVjdXRpb25IaXN0b3J5RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFRlc3QgU3VpdGUgUmVzdWx0cyBMYW1iZGFcclxuICAgIGNvbnN0IGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0U3VpdGVSZXN1bHRzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWdldC1zdWl0ZS1yZXN1bHRzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvZXhlY3V0aW9ucy9nZXQtc3VpdGUtcmVzdWx0cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFRFU1RfRVhFQ1VUSU9OU19UQUJMRV9OQU1FOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgc3VpdGUgcmVzdWx0cyBmdW5jdGlvbiBwZXJtaXNzaW9uc1xyXG4gICAgdGVzdEV4ZWN1dGlvbnNUYWJsZS50YWJsZS5ncmFudFJlYWREYXRhKGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBTMyBldmVudCBub3RpZmljYXRpb24gZm9yIHVwbG9hZCBjb21wbGV0aW9uXHJcbiAgICBmaWxlU3RvcmFnZUJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcclxuICAgICAgczMuRXZlbnRUeXBlLk9CSkVDVF9DUkVBVEVELFxyXG4gICAgICBuZXcgczNuLkxhbWJkYURlc3RpbmF0aW9uKHVwbG9hZENvbXBsZXRlRnVuY3Rpb24pLFxyXG4gICAgICB7IHByZWZpeDogJ3VwbG9hZHMvJyB9XHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIGFuZCBOb3RpZmljYXRpb24gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgY29uc3QgYW5hbHlzaXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FuYWx5c2lzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYW5hbHlzaXMvYW5hbHl6ZS1maWxlJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFOiBhbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfQ0FDSEVfVEFCTEU6IGFuYWx5c2lzQ2FjaGVUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLCAvLyBSZXF1aXJlbWVudCAxMC42OiBTZXQgdGltZW91dCB0byA1IG1pbnV0ZXNcclxuICAgICAgbWVtb3J5U2l6ZTogMjA0OCwgLy8gUmVxdWlyZW1lbnQgMTAuNDogU2V0IG1lbW9yeSB0byAyR0IgZm9yIEFTVCBwYXJzaW5nXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBOb3RpZmljYXRpb24gUHJvY2Vzc29yIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3Qgbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdOb3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgYWlidHMtbm90aWZpY2F0aW9uLXByb2Nlc3Nvci0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL25vdGlmaWNhdGlvbnMvcHJvY2Vzc29yJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1BSRUZFUkVOQ0VTX1RBQkxFOiBub3RpZmljYXRpb25QcmVmZXJlbmNlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBOT1RJRklDQVRJT05fVEVNUExBVEVTX1RBQkxFOiBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX0hJU1RPUllfVEFCTEU6IG5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgU05TX1RPUElDX0FSTl9FTUFJTDogZW1haWxOb3RpZmljYXRpb25Ub3BpYy50b3BpY0FybixcclxuICAgICAgICBTTlNfVE9QSUNfQVJOX1NNUzogc21zTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgICAgU05TX1RPUElDX0FSTl9XRUJIT09LOiB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgICAgTjhOX0VOQUJMRUQ6IHByb2Nlc3MuZW52Lk44Tl9FTkFCTEVEIHx8ICdmYWxzZScsXHJcbiAgICAgICAgTjhOX1dFQkhPT0tfVVJMOiBwcm9jZXNzLmVudi5OOE5fV0VCSE9PS19VUkwgfHwgJycsXHJcbiAgICAgICAgTjhOX0FQSV9LRVk6IHByb2Nlc3MuZW52Lk44Tl9BUElfS0VZIHx8ICcnLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBTUVMgdHJpZ2dlciBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NvclxyXG4gICAgbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24uYWRkRXZlbnRTb3VyY2UoXHJcbiAgICAgIG5ldyBsYW1iZGFFdmVudFNvdXJjZXMuU3FzRXZlbnRTb3VyY2Uobm90aWZpY2F0aW9uUXVldWUsIHtcclxuICAgICAgICBiYXRjaFNpemU6IDEsIC8vIFByb2Nlc3MgMSBtZXNzYWdlIGF0IGEgdGltZSB0byBhdm9pZCBjb25jdXJyZW5jeSBpc3N1ZXNcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoNSksXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIG5vdGlmaWNhdGlvbiBwcm9jZXNzb3JcclxuICAgIG5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGUudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uKTtcclxuICAgIG5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlLnRhYmxlLmdyYW50UmVhZERhdGEobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgbm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBlbWFpbE5vdGlmaWNhdGlvblRvcGljLmdyYW50UHVibGlzaChub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcbiAgICBzbXNOb3RpZmljYXRpb25Ub3BpYy5ncmFudFB1Ymxpc2gobm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24pO1xyXG4gICAgd2ViaG9va05vdGlmaWNhdGlvblRvcGljLmdyYW50UHVibGlzaChub3RpZmljYXRpb25Qcm9jZXNzb3JGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gVGVtcGxhdGUgU2VlZGluZyBMYW1iZGEgRnVuY3Rpb25cclxuICAgIGNvbnN0IHNlZWRUZW1wbGF0ZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NlZWRUZW1wbGF0ZXNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgYWlidHMtc2VlZC10ZW1wbGF0ZXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9ub3RpZmljYXRpb25zL3NlZWQtdGVtcGxhdGVzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgTk9USUZJQ0FUSU9OX1RFTVBMQVRFU19UQUJMRTogbm90aWZpY2F0aW9uVGVtcGxhdGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIHNlZWQgdGVtcGxhdGVzIGZ1bmN0aW9uXHJcbiAgICBub3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoc2VlZFRlbXBsYXRlc0Z1bmN0aW9uKTtcclxuXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25GdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ05vdGlmaWNhdGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1ub3RpZmljYXRpb24tJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tSW5saW5lKGBcclxuICAgICAgICBleHBvcnRzLmhhbmRsZXIgPSBhc3luYyAoZXZlbnQpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKCdOb3RpZmljYXRpb24gZnVuY3Rpb24gaW52b2tlZDonLCBKU09OLnN0cmluZ2lmeShldmVudCkpO1xyXG4gICAgICAgICAgLy8gUGxhY2Vob2xkZXIgZm9yIG5vdGlmaWNhdGlvbiBsb2dpYyAoZW1haWwsIHdlYmhvb2ssIGV0Yy4pXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICdOb3RpZmljYXRpb24gc2VudCBzdWNjZXNzZnVsbHknXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgIH07XHJcbiAgICAgIGApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyBmb3IgYW5hbHlzaXMgYW5kIG5vdGlmaWNhdGlvbiBmdW5jdGlvbnNcclxuICAgIGFuYWx5c2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFuYWx5c2lzRnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkKGFuYWx5c2lzRnVuY3Rpb24pOyAvLyBSZXF1aXJlbWVudCAxMC40OiBHcmFudCBTMyByZWFkIHBlcm1pc3Npb25zXHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHlzaXNGdW5jdGlvbik7IC8vIFJlcXVpcmVtZW50IDEwLjQ6IEdyYW50IER5bmFtb0RCIHJlYWQvd3JpdGUgcGVybWlzc2lvbnNcclxuICAgIGFuYWx5c2lzQ2FjaGVUYWJsZS50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYW5hbHlzaXNGdW5jdGlvbik7IC8vIFJlcXVpcmVtZW50IDEwLjc6IEdyYW50IGNhY2hlIHRhYmxlIHBlcm1pc3Npb25zXHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEobm90aWZpY2F0aW9uRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIFJlcXVpcmVtZW50IDEwLjQ6IENvbm5lY3QgYW5hbHlzaXMgTGFtYmRhIHRvIFNRUyBxdWV1ZVxyXG4gICAgYW5hbHlzaXNGdW5jdGlvbi5hZGRFdmVudFNvdXJjZShcclxuICAgICAgbmV3IGxhbWJkYUV2ZW50U291cmNlcy5TcXNFdmVudFNvdXJjZShhbmFseXNpc1F1ZXVlLCB7XHJcbiAgICAgICAgYmF0Y2hTaXplOiAxLCAvLyBQcm9jZXNzIG9uZSBhbmFseXNpcyBhdCBhIHRpbWVcclxuICAgICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoMCksIC8vIE5vIGJhdGNoaW5nIGRlbGF5XHJcbiAgICAgICAgcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIEVuYWJsZSBwYXJ0aWFsIGJhdGNoIHJlc3BvbnNlc1xyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBRdWVyeSBSZXN1bHRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgcXVlcnlSZXN1bHRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdRdWVyeVJlc3VsdHNGdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tcXVlcnktcmVzdWx0cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL3F1ZXJ5LXJlc3VsdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogdGhpcy5zdGFja05hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFVzZXIgU3RhdHMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAgICBjb25zdCB1c2VyU3RhdHNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1VzZXJTdGF0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2VyLXN0YXRzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYW5hbHlzaXMvZ2V0LXVzZXItc3RhdHMnKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBFTlZJUk9OTUVOVDogdGhpcy5zdGFja05hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdldCBSZXBvcnQgTGFtYmRhIEZ1bmN0aW9uIGZvciBQREYgcmVwb3J0IGdlbmVyYXRpb25cclxuICAgIGNvbnN0IGdldFJlcG9ydEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2V0UmVwb3J0RnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWdldC1yZXBvcnQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hbmFseXNpcy9nZXQtcmVwb3J0JyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEZJTEVfTUVUQURBVEFfVEFCTEU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHF1ZXJ5IGFuZCBzdGF0cyBmdW5jdGlvbnMgYWNjZXNzIHRvIGFuYWx5c2lzIHJlc3VsdHNcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEocXVlcnlSZXN1bHRzRnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkRGF0YSh1c2VyU3RhdHNGdW5jdGlvbik7XHJcblxyXG4gICAgLy8gR3JhbnQgZ2V0LXJlcG9ydCBmdW5jdGlvbiBwZXJtaXNzaW9ucyAoVGFzayAzLjIpXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGdldFJlcG9ydEZ1bmN0aW9uKTtcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZERhdGEoZ2V0UmVwb3J0RnVuY3Rpb24pO1xyXG4gICAgZmlsZVN0b3JhZ2VCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoZ2V0UmVwb3J0RnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIFN0YXR1cyBMYW1iZGEgRnVuY3Rpb24gKFRhc2sgNS4yKVxyXG4gICAgY29uc3QgYW5hbHlzaXNTdGF0dXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FuYWx5c2lzU3RhdHVzRnVuY3Rpb24nLCB7XHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLXN0YXR1cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL3N0YXR1cycpLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFJFR0lPTjogdGhpcy5yZWdpb24sXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiAwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgYW5hbHlzaXMgc3RhdHVzIGZ1bmN0aW9uIGFjY2VzcyB0byBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGFuYWx5c2lzU3RhdHVzRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFJIEluc2lnaHRzIExhbWJkYSBGdW5jdGlvblxyXG4gICAgY29uc3QgYWlJbnNpZ2h0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQUlJbnNpZ2h0c0Z1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1haS1pbnNpZ2h0cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FpL2dlbmVyYXRlLWluc2lnaHRzJyksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6IHRoaXMuc3RhY2tOYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgcmVzZXJ2ZWRDb25jdXJyZW50RXhlY3V0aW9uczogMCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IEFJIGluc2lnaHRzIGZ1bmN0aW9uIGFjY2VzcyB0byBhbmFseXNpcyByZXN1bHRzXHJcbiAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZS5ncmFudFJlYWREYXRhKGFpSW5zaWdodHNGdW5jdGlvbik7XHJcbiAgICAvLyBhaUluc2lnaHRzRnVuY3Rpb24gdXNlcyBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IC0gbm8gSldUIHNlY3JldCBuZWVkZWRcclxuXHJcbiAgICAvLyBDcmVhdGUgU3RlcCBGdW5jdGlvbnMgd29ya2Zsb3cgZm9yIGFuYWx5c2lzIG9yY2hlc3RyYXRpb25cclxuICAgIC8vIFRPRE86IFJlLWVuYWJsZSBBbmFseXNpc1dvcmtmbG93IHdoZW4gdGhlIG1vZHVsZSBpcyBhdmFpbGFibGVcclxuICAgIC8vIGNvbnN0IHdvcmtmbG93ID0gbmV3IEFuYWx5c2lzV29ya2Zsb3codGhpcywgJ0FuYWx5c2lzV29ya2Zsb3cnLCB7XHJcbiAgICAvLyAgIGVudmlyb25tZW50OiB0aGlzLnN0YWNrTmFtZSxcclxuICAgIC8vICAgYW5hbHlzaXNGdW5jdGlvbixcclxuICAgIC8vICAgbm90aWZpY2F0aW9uRnVuY3Rpb24sXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICAvLyBVcGRhdGUgdXBsb2FkLWNvbXBsZXRlIGZ1bmN0aW9uIHdpdGggd29ya2Zsb3cgQVJOXHJcbiAgICAvLyB1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uLmFkZEVudmlyb25tZW50KCdTVEFURV9NQUNISU5FX0FSTicsIHdvcmtmbG93LnN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm4pO1xyXG4gICAgXHJcbiAgICAvLyBHcmFudCB1cGxvYWQtY29tcGxldGUgZnVuY3Rpb24gcGVybWlzc2lvbiB0byBzdGFydCB3b3JrZmxvdyBleGVjdXRpb25zXHJcbiAgICAvLyB3b3JrZmxvdy5zdGF0ZU1hY2hpbmUuZ3JhbnRTdGFydEV4ZWN1dGlvbih1cGxvYWRDb21wbGV0ZUZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBBUEkgR2F0ZXdheSB3aXRoIGN1c3RvbSBkb21haW5cclxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5Lkh0dHBBcGkodGhpcywgJ01pc3JhUGxhdGZvcm1BcGknLCB7XHJcbiAgICAgIGFwaU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1hcGktJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01JU1JBIFBsYXRmb3JtIFJFU1QgQVBJJyxcclxuICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogWycqJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLkdFVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUE9TVCxcclxuICAgICAgICAgIGFwaWdhdGV3YXkuQ29yc0h0dHBNZXRob2QuUFVULFxyXG4gICAgICAgICAgYXBpZ2F0ZXdheS5Db3JzSHR0cE1ldGhvZC5ERUxFVEUsXHJcbiAgICAgICAgICBhcGlnYXRld2F5LkNvcnNIdHRwTWV0aG9kLk9QVElPTlMsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFsnQ29udGVudC1UeXBlJywgJ0F1dGhvcml6YXRpb24nXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBjdXN0b20gZG9tYWluIGZvciBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgYXBpRG9tYWluTmFtZSA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ0FwaUN1c3RvbURvbWFpbicsIHtcclxuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluLFxyXG4gICAgICBjZXJ0aWZpY2F0ZTogYXBpQ2VydGlmaWNhdGUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBNYXAgdGhlIGN1c3RvbSBkb21haW4gdG8gdGhlIEFQSSBHYXRld2F5IHN0YWdlXHJcbiAgICBuZXcgYXBpZ2F0ZXdheS5BcGlNYXBwaW5nKHRoaXMsICdBcGlNYXBwaW5nJywge1xyXG4gICAgICBhcGk6IGFwaSxcclxuICAgICAgZG9tYWluTmFtZTogYXBpRG9tYWluTmFtZSxcclxuICAgICAgc3RhZ2U6IGFwaS5kZWZhdWx0U3RhZ2UhLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFJvdXRlNTMgQSByZWNvcmQgZm9yIEFQSSBkb21haW5cclxuICAgIG5ldyByb3V0ZTUzLkFSZWNvcmQodGhpcywgJ0FwaUFsaWFzUmVjb3JkJywge1xyXG4gICAgICB6b25lOiBob3N0ZWRab25lLFxyXG4gICAgICByZWNvcmROYW1lOiBhcGlEb21haW4sXHJcbiAgICAgIHRhcmdldDogcm91dGU1My5SZWNvcmRUYXJnZXQuZnJvbUFsaWFzKFxyXG4gICAgICAgIG5ldyByb3V0ZTUzdGFyZ2V0cy5BcGlHYXRld2F5djJEb21haW5Qcm9wZXJ0aWVzKFxyXG4gICAgICAgICAgYXBpRG9tYWluTmFtZS5yZWdpb25hbERvbWFpbk5hbWUsXHJcbiAgICAgICAgICBhcGlEb21haW5OYW1lLnJlZ2lvbmFsSG9zdGVkWm9uZUlkXHJcbiAgICAgICAgKVxyXG4gICAgICApLFxyXG4gICAgICBjb21tZW50OiAnQVBJIEdhdGV3YXkgY3VzdG9tIGRvbWFpbiBmb3IgTUlTUkEgUGxhdGZvcm0gQVBJJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBIVFRQIEFQSSBMYW1iZGEgQXV0aG9yaXplciBmb3IgSldUIHZlcmlmaWNhdGlvblxyXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhdXRob3JpemVycy5IdHRwTGFtYmRhQXV0aG9yaXplcignSldUQXV0aG9yaXplcicsIGF1dGhvcml6ZXJGdW5jdGlvbiwge1xyXG4gICAgICBhdXRob3JpemVyTmFtZTogJ2p3dC1hdXRob3JpemVyJyxcclxuICAgICAgaWRlbnRpdHlTb3VyY2U6IFsnJHJlcXVlc3QuaGVhZGVyLkF1dGhvcml6YXRpb24nXSxcclxuICAgICAgcmVzcG9uc2VUeXBlczogW2F1dGhvcml6ZXJzLkh0dHBMYW1iZGFSZXNwb25zZVR5cGUuU0lNUExFXSxcclxuICAgICAgcmVzdWx0c0NhY2hlVHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApLCAvLyA1IG1pbnV0ZXNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhdXRoZW50aWNhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvbG9naW4nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0xvZ2luSW50ZWdyYXRpb24nLCBsb2dpbkZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9yZWdpc3RlcicsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUmVnaXN0ZXJJbnRlZ3JhdGlvbicsIHJlZ2lzdGVyRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9hdXRoL3JlZnJlc2gnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1JlZnJlc2hJbnRlZ3JhdGlvbicsIHJlZnJlc2hGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBlbWFpbCB2ZXJpZmljYXRpb24gYW5kIE9UUCBpbnRlZ3JhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvaW5pdGlhdGUtZmxvdycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignSW5pdGlhdGVGbG93SW50ZWdyYXRpb24nLCBpbml0aWF0ZUZsb3dGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2F1dGgvdmVyaWZ5LWVtYWlsLXdpdGgtb3RwJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdWZXJpZnlFbWFpbFdpdGhPVFBJbnRlZ3JhdGlvbicsIHZlcmlmeUVtYWlsV2l0aE9UUEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYXV0aC9jb21wbGV0ZS1vdHAtc2V0dXAnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NvbXBsZXRlT1RQU2V0dXBJbnRlZ3JhdGlvbicsIGNvbXBsZXRlT1RQU2V0dXBGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBmaWxlIHVwbG9hZCByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2ZpbGVzL3VwbG9hZCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmlsZVVwbG9hZEludGVncmF0aW9uJywgZmlsZVVwbG9hZEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RmlsZXNJbnRlZ3JhdGlvbicsIGdldEZpbGVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgc2FtcGxlIGZpbGUgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9maWxlcy9zYW1wbGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFNhbXBsZUZpbGVzSW50ZWdyYXRpb24nLCBnZXRTYW1wbGVGaWxlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkLXNhbXBsZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBsb2FkU2FtcGxlRmlsZUludGVncmF0aW9uJywgdXBsb2FkU2FtcGxlRmlsZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvdXBsb2FkLXByb2dyZXNzL3tmaWxlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFVwbG9hZFByb2dyZXNzSW50ZWdyYXRpb24nLCBnZXRVcGxvYWRQcm9ncmVzc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZmlsZXMvaW5pdGlhbGl6ZS1zYW1wbGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdJbml0aWFsaXplU2FtcGxlTGlicmFyeUludGVncmF0aW9uJywgaW5pdGlhbGl6ZVNhbXBsZUxpYnJhcnlGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhbmFseXNpcyBxdWVyeSByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3F1ZXJ5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1F1ZXJ5UmVzdWx0c0ludGVncmF0aW9uJywgcXVlcnlSZXN1bHRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgdXNlciBzdGF0cyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3N0YXRzL3t1c2VySWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VzZXJTdGF0c0ludGVncmF0aW9uJywgdXNlclN0YXRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYW5hbHlzaXMgc3RhdHVzIHJvdXRlIChUYXNrIDUuMilcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FuYWx5c2lzL3thbmFseXNpc0lkfS9zdGF0dXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQW5hbHlzaXNTdGF0dXNJbnRlZ3JhdGlvbicsIGFuYWx5c2lzU3RhdHVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgcmVwb3J0IGRvd25sb2FkIHJvdXRlIChUYXNrIDMuMylcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3JlcG9ydHMve2ZpbGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UmVwb3J0SW50ZWdyYXRpb24nLCBnZXRSZXBvcnRGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBBSSBpbnNpZ2h0cyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpL2luc2lnaHRzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUluc2lnaHRzSW50ZWdyYXRpb24nLCBhaUluc2lnaHRzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgcHJvamVjdCBtYW5hZ2VtZW50IHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NyZWF0ZVByb2plY3RJbnRlZ3JhdGlvbicsIGNyZWF0ZVByb2plY3RGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Byb2plY3RzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldFByb2plY3RzSW50ZWdyYXRpb24nLCBnZXRQcm9qZWN0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvcHJvamVjdHMve3Byb2plY3RJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlUHJvamVjdEludGVncmF0aW9uJywgdXBkYXRlUHJvamVjdEZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRlc3Qgc3VpdGUgbWFuYWdlbWVudCByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3Qtc3VpdGVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0U3VpdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlc3RTdWl0ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdFN1aXRlc0ludGVncmF0aW9uJywgZ2V0VGVzdFN1aXRlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvdGVzdC1zdWl0ZXMve3N1aXRlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RTdWl0ZUludGVncmF0aW9uJywgdXBkYXRlVGVzdFN1aXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgdGVzdCBjYXNlIG1hbmFnZW1lbnQgcm91dGVzXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy90ZXN0LWNhc2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdDcmVhdGVUZXN0Q2FzZUludGVncmF0aW9uJywgY3JlYXRlVGVzdENhc2VGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0VGVzdENhc2VzSW50ZWdyYXRpb24nLCBnZXRUZXN0Q2FzZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL3Rlc3QtY2FzZXMve3Rlc3RDYXNlSWR9JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QVVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1VwZGF0ZVRlc3RDYXNlSW50ZWdyYXRpb24nLCB1cGRhdGVUZXN0Q2FzZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRlc3QgZXhlY3V0aW9uIHJvdXRlc1xyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy90cmlnZ2VyJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdUcmlnZ2VyRXhlY3V0aW9uSW50ZWdyYXRpb24nLCB0cmlnZ2VyRXhlY3V0aW9uRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0vc3RhdHVzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvblN0YXR1c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uU3RhdHVzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9leGVjdXRpb25zL3tleGVjdXRpb25JZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0RXhlY3V0aW9uUmVzdWx0c0ludGVncmF0aW9uJywgZ2V0RXhlY3V0aW9uUmVzdWx0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvZXhlY3V0aW9ucy9oaXN0b3J5JyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IGludGVncmF0aW9ucy5IdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0dldEV4ZWN1dGlvbkhpc3RvcnlJbnRlZ3JhdGlvbicsIGdldEV4ZWN1dGlvbkhpc3RvcnlGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2V4ZWN1dGlvbnMvc3VpdGVzL3tzdWl0ZUV4ZWN1dGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRTdWl0ZVJlc3VsdHNJbnRlZ3JhdGlvbicsIGdldFN1aXRlUmVzdWx0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIG5vdGlmaWNhdGlvbiBwcmVmZXJlbmNlcyByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvcHJlZmVyZW5jZXMnLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignR2V0UHJlZmVyZW5jZXNJbnRlZ3JhdGlvbicsIGdldFByZWZlcmVuY2VzRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3ByZWZlcmVuY2VzJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdVcGRhdGVQcmVmZXJlbmNlc0ludGVncmF0aW9uJywgdXBkYXRlUHJlZmVyZW5jZXNGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBub3RpZmljYXRpb24gaGlzdG9yeSByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL25vdGlmaWNhdGlvbnMvaGlzdG9yeScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRIaXN0b3J5SW50ZWdyYXRpb24nLCBnZXRIaXN0b3J5RnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL2hpc3Rvcnkve25vdGlmaWNhdGlvbklkfScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXROb3RpZmljYXRpb25JbnRlZ3JhdGlvbicsIGdldE5vdGlmaWNhdGlvbkZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIG5vdGlmaWNhdGlvbiB0ZW1wbGF0ZSByb3V0ZXMgKGFkbWluIG9ubHkpXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ3JlYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIGNyZWF0ZVRlbXBsYXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcy97dGVtcGxhdGVJZH0nLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ2F0ZXdheS5IdHRwTWV0aG9kLlBVVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignVXBkYXRlVGVtcGxhdGVJbnRlZ3JhdGlvbicsIHVwZGF0ZVRlbXBsYXRlRnVuY3Rpb24sIHtcclxuICAgICAgICBwYXlsb2FkRm9ybWF0VmVyc2lvbjogYXBpZ2F0ZXdheS5QYXlsb2FkRm9ybWF0VmVyc2lvbi5WRVJTSU9OXzFfMCxcclxuICAgICAgfSksXHJcbiAgICAgIGF1dGhvcml6ZXI6IGF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBhcGkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogJy9ub3RpZmljYXRpb25zL3RlbXBsYXRlcycsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdHZXRUZW1wbGF0ZXNJbnRlZ3JhdGlvbicsIGdldFRlbXBsYXRlc0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEFJIHRlc3QgZ2VuZXJhdGlvbiByb3V0ZXNcclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9hbmFseXplJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUFuYWx5emVJbnRlZ3JhdGlvbicsIGFpQW5hbHl6ZUZ1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXBpLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6ICcvYWktdGVzdC1nZW5lcmF0aW9uL2dlbmVyYXRlJyxcclxuICAgICAgbWV0aG9kczogW2FwaWdhdGV3YXkuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUdlbmVyYXRlVGVzdEludGVncmF0aW9uJywgYWlHZW5lcmF0ZVRlc3RGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi9iYXRjaCcsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgaW50ZWdyYXRpb25zLkh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQUlCYXRjaEdlbmVyYXRlSW50ZWdyYXRpb24nLCBhaUJhdGNoR2VuZXJhdGVGdW5jdGlvbiwge1xyXG4gICAgICAgIHBheWxvYWRGb3JtYXRWZXJzaW9uOiBhcGlnYXRld2F5LlBheWxvYWRGb3JtYXRWZXJzaW9uLlZFUlNJT05fMV8wLFxyXG4gICAgICB9KSxcclxuICAgICAgYXV0aG9yaXplcjogYXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGFwaS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiAnL2FpLXRlc3QtZ2VuZXJhdGlvbi91c2FnZScsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnYXRld2F5Lkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBpbnRlZ3JhdGlvbnMuSHR0cExhbWJkYUludGVncmF0aW9uKCdBSUdldFVzYWdlU3RhdHNJbnRlZ3JhdGlvbicsIGFpR2V0VXNhZ2VTdGF0c0Z1bmN0aW9uLCB7XHJcbiAgICAgICAgcGF5bG9hZEZvcm1hdFZlcnNpb246IGFwaWdhdGV3YXkuUGF5bG9hZEZvcm1hdFZlcnNpb24uVkVSU0lPTl8xXzAsXHJcbiAgICAgIH0pLFxyXG4gICAgICBhdXRob3JpemVyOiBhdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCB2YWx1ZXNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmaWxlU3RvcmFnZUJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgZmlsZSBzdG9yYWdlJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZEJ1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBmcm9udGVuZEJ1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIGJ1Y2tldCBmb3IgZnJvbnRlbmQgaG9zdGluZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ2xvdWRGcm9udERpc3RyaWJ1dGlvbkRvbWFpbicsIHtcclxuICAgICAgdmFsdWU6IGRpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25Eb21haW5OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0Nsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGRvbWFpbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRnJvbnRlbmRDdXN0b21Eb21haW4nLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3Byb2R1Y3Rpb25Eb21haW59YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIGZyb250ZW5kIFVSTCB3aXRoIGN1c3RvbSBkb21haW4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgbWlzcmEtcGxhdGZvcm0tZnJvbnRlbmQtdXJsLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlDdXN0b21Eb21haW5VcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke2FwaURvbWFpbn1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gQVBJIFVSTCB3aXRoIGN1c3RvbSBkb21haW4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgbWlzcmEtcGxhdGZvcm0tYXBpLXVybC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvY2Vzc2luZ1F1ZXVlVXJsJywge1xyXG4gICAgICB2YWx1ZTogcHJvY2Vzc2luZ1F1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBmb3IgcHJvY2Vzc2luZyBqb2JzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUZXN0RXhlY3V0aW9uUXVldWVVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0ZXN0RXhlY3V0aW9uUXVldWUucXVldWVVcmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU1FTIHF1ZXVlIGZvciB0ZXN0IGV4ZWN1dGlvbiBqb2JzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xyXG4gICAgICB2YWx1ZTogYXBpLmFwaUVuZHBvaW50LFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IGVuZHBvaW50IFVSTCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVGVzdEV4ZWN1dGlvbnNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0ZXN0RXhlY3V0aW9uc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3IgdGVzdCBleGVjdXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTY3JlZW5zaG90c0J1Y2tldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBzY3JlZW5zaG90c0J1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBidWNrZXQgZm9yIHRlc3QgZXhlY3V0aW9uIHNjcmVlbnNob3RzJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOb3RpZmljYXRpb25RdWV1ZVVybCcsIHtcclxuICAgICAgdmFsdWU6IG5vdGlmaWNhdGlvblF1ZXVlLnF1ZXVlVXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NRUyBxdWV1ZSBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NpbmcnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0VtYWlsTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBlbWFpbE5vdGlmaWNhdGlvblRvcGljLnRvcGljQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyB0b3BpYyBmb3IgZW1haWwgbm90aWZpY2F0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU21zTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiBzbXNOb3RpZmljYXRpb25Ub3BpYy50b3BpY0FybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTTlMgdG9waWMgZm9yIFNNUyBub3RpZmljYXRpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXZWJob29rTm90aWZpY2F0aW9uVG9waWNBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMudG9waWNBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU05TIHRvcGljIGZvciB3ZWJob29rIG5vdGlmaWNhdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FJVXNhZ2VUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBhaVVzYWdlVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciBBSSB1c2FnZSB0cmFja2luZycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIEFsYXJtcyBmb3IgTm90aWZpY2F0aW9uIFN5c3RlbVxyXG4gICAgLy8gQWxhcm0gZm9yIERMUSBkZXB0aCA+IDAgKGluZGljYXRlcyBmYWlsZWQgbm90aWZpY2F0aW9ucylcclxuICAgIGNvbnN0IGRscUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ05vdGlmaWNhdGlvbkRMUUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBhaWJ0cy1ub3RpZmljYXRpb24tZGxxLWRlcHRoLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gbm90aWZpY2F0aW9uIERMUSBoYXMgbWVzc2FnZXMgKGZhaWxlZCBub3RpZmljYXRpb25zKScsXHJcbiAgICAgIG1ldHJpYzogbm90aWZpY2F0aW9uRExRLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoKSxcclxuICAgICAgdGhyZXNob2xkOiAwLFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsYXJtIGZvciBxdWV1ZSBkZXB0aCA+IDEwMDAgKGluZGljYXRlcyBwcm9jZXNzaW5nIGJhY2tsb2cpXHJcbiAgICBjb25zdCBxdWV1ZURlcHRoQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnTm90aWZpY2F0aW9uUXVldWVEZXB0aEFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBhaWJ0cy1ub3RpZmljYXRpb24tcXVldWUtZGVwdGgtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQWxlcnQgd2hlbiBub3RpZmljYXRpb24gcXVldWUgZGVwdGggZXhjZWVkcyAxMDAwIG1lc3NhZ2VzJyxcclxuICAgICAgbWV0cmljOiBub3RpZmljYXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNWaXNpYmxlKCksXHJcbiAgICAgIHRocmVzaG9sZDogMTAwMCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3Igbm90aWZpY2F0aW9uIHByb2Nlc3NvciBMYW1iZGEgZXJyb3JzXHJcbiAgICBjb25zdCBwcm9jZXNzb3JFcnJvckFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ05vdGlmaWNhdGlvblByb2Nlc3NvckVycm9yQWxhcm0nLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYGFpYnRzLW5vdGlmaWNhdGlvbi1wcm9jZXNzb3ItZXJyb3JzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gbm90aWZpY2F0aW9uIHByb2Nlc3NvciBMYW1iZGEgaGFzIGVycm9ycycsXHJcbiAgICAgIG1ldHJpYzogbm90aWZpY2F0aW9uUHJvY2Vzc29yRnVuY3Rpb24ubWV0cmljRXJyb3JzKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFsYXJtIGZvciBzY2hlZHVsZWQgcmVwb3J0cyBMYW1iZGEgZXJyb3JzXHJcbiAgICBjb25zdCBzY2hlZHVsZWRSZXBvcnRzRXJyb3JBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTY2hlZHVsZWRSZXBvcnRzRXJyb3JBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgYWlidHMtc2NoZWR1bGVkLXJlcG9ydHMtZXJyb3JzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gc2NoZWR1bGVkIHJlcG9ydHMgTGFtYmRhIGhhcyBlcnJvcnMnLFxyXG4gICAgICBtZXRyaWM6IHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEsXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAxLFxyXG4gICAgICBjb21wYXJpc29uT3BlcmF0b3I6IGNsb3Vkd2F0Y2guQ29tcGFyaXNvbk9wZXJhdG9yLkdSRUFURVJfVEhBTl9USFJFU0hPTEQsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWxhcm0gZm9yIFNOUyBkZWxpdmVyeSBmYWlsdXJlcyAoZW1haWwpXHJcbiAgICBjb25zdCBzbnNFbWFpbEZhaWx1cmVBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdTTlNFbWFpbEZhaWx1cmVBbGFybScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgYWlidHMtc25zLWVtYWlsLWZhaWx1cmVzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gU05TIGVtYWlsIGRlbGl2ZXJ5IGZhaWxzJyxcclxuICAgICAgbWV0cmljOiBlbWFpbE5vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0ZhaWxlZCh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogNSxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDEsXHJcbiAgICAgIGNvbXBhcmlzb25PcGVyYXRvcjogY2xvdWR3YXRjaC5Db21wYXJpc29uT3BlcmF0b3IuR1JFQVRFUl9USEFOX1RIUkVTSE9MRCxcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBbGFybSBmb3IgU05TIGRlbGl2ZXJ5IGZhaWx1cmVzIChTTVMpXHJcbiAgICBjb25zdCBzbnNTbXNGYWlsdXJlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnU05TU21zRmFpbHVyZUFsYXJtJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBhaWJ0cy1zbnMtc21zLWZhaWx1cmVzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ0FsZXJ0IHdoZW4gU05TIFNNUyBkZWxpdmVyeSBmYWlscycsXHJcbiAgICAgIG1ldHJpYzogc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgY29tcGFyaXNvbk9wZXJhdG9yOiBjbG91ZHdhdGNoLkNvbXBhcmlzb25PcGVyYXRvci5HUkVBVEVSX1RIQU5fVEhSRVNIT0xELFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggRGFzaGJvYXJkIGZvciBOb3RpZmljYXRpb24gU3lzdGVtXHJcbiAgICBjb25zdCBub3RpZmljYXRpb25EYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ05vdGlmaWNhdGlvbkRhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogYEFJQlRTLU5vdGlmaWNhdGlvbi1TeXN0ZW0tJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHdpZGdldHMgdG8gZGFzaGJvYXJkXHJcbiAgICBub3RpZmljYXRpb25EYXNoYm9hcmQuYWRkV2lkZ2V0cyhcclxuICAgICAgLy8gUXVldWUgbWV0cmljc1xyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdOb3RpZmljYXRpb24gUXVldWUgRGVwdGgnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblF1ZXVlLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ01lc3NhZ2VzIFZpc2libGUnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBub3RpZmljYXRpb25RdWV1ZS5tZXRyaWNBcHByb3hpbWF0ZU51bWJlck9mTWVzc2FnZXNOb3RWaXNpYmxlKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdNZXNzYWdlcyBJbiBGbGlnaHQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDEpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdETFEgRGVwdGggKEZhaWxlZCBOb3RpZmljYXRpb25zKScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbm90aWZpY2F0aW9uRExRLm1ldHJpY0FwcHJveGltYXRlTnVtYmVyT2ZNZXNzYWdlc1Zpc2libGUoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCBNZXNzYWdlcycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgbm90aWZpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIC8vIExhbWJkYSBtZXRyaWNzXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ05vdGlmaWNhdGlvbiBQcm9jZXNzb3IgUGVyZm9ybWFuY2UnLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0ludm9jYXRpb25zKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0Vycm9ycyh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRXJyb3JzJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmlnaHQ6IFtcclxuICAgICAgICAgIG5vdGlmaWNhdGlvblByb2Nlc3NvckZ1bmN0aW9uLm1ldHJpY0R1cmF0aW9uKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEdXJhdGlvbicsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICAgIHN0YXRpc3RpYzogJ0F2ZXJhZ2UnLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMTIsXHJcbiAgICAgIH0pLFxyXG4gICAgICBuZXcgY2xvdWR3YXRjaC5HcmFwaFdpZGdldCh7XHJcbiAgICAgICAgdGl0bGU6ICdTY2hlZHVsZWQgUmVwb3J0cyBQZXJmb3JtYW5jZScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgc2NoZWR1bGVkUmVwb3J0c0Z1bmN0aW9uLm1ldHJpY0ludm9jYXRpb25zKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdJbnZvY2F0aW9ucycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIHNjaGVkdWxlZFJlcG9ydHNGdW5jdGlvbi5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0Vycm9ycycsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJpZ2h0OiBbXHJcbiAgICAgICAgICBzY2hlZHVsZWRSZXBvcnRzRnVuY3Rpb24ubWV0cmljRHVyYXRpb24oe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0R1cmF0aW9uJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgbm90aWZpY2F0aW9uRGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIC8vIFNOUyBkZWxpdmVyeSBtZXRyaWNzXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1NOUyBFbWFpbCBEZWxpdmVyeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk1lc3NhZ2VzUHVibGlzaGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdQdWJsaXNoZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBlbWFpbE5vdGlmaWNhdGlvblRvcGljLm1ldHJpY051bWJlck9mTm90aWZpY2F0aW9uc0RlbGl2ZXJlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnRGVsaXZlcmVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgZW1haWxOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNGYWlsZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiA4LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU05TIFNNUyBEZWxpdmVyeScsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZNZXNzYWdlc1B1Ymxpc2hlZCh7XHJcbiAgICAgICAgICAgIGxhYmVsOiAnUHVibGlzaGVkJyxcclxuICAgICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgc21zTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRGVsaXZlcmVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEZWxpdmVyZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBzbXNOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk5vdGlmaWNhdGlvbnNGYWlsZWQoe1xyXG4gICAgICAgICAgICBsYWJlbDogJ0ZhaWxlZCcsXHJcbiAgICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIHdpZHRoOiA4LFxyXG4gICAgICB9KSxcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guR3JhcGhXaWRnZXQoe1xyXG4gICAgICAgIHRpdGxlOiAnU05TIFdlYmhvb2sgRGVsaXZlcnknLFxyXG4gICAgICAgIGxlZnQ6IFtcclxuICAgICAgICAgIHdlYmhvb2tOb3RpZmljYXRpb25Ub3BpYy5tZXRyaWNOdW1iZXJPZk1lc3NhZ2VzUHVibGlzaGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdQdWJsaXNoZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRGVsaXZlcmVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdEZWxpdmVyZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICB3ZWJob29rTm90aWZpY2F0aW9uVG9waWMubWV0cmljTnVtYmVyT2ZOb3RpZmljYXRpb25zRmFpbGVkKHtcclxuICAgICAgICAgICAgbGFiZWw6ICdGYWlsZWQnLFxyXG4gICAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogOCxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGRhc2hib2FyZCBVUkxcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOb3RpZmljYXRpb25EYXNoYm9hcmRVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly9jb25zb2xlLmF3cy5hbWF6b24uY29tL2Nsb3Vkd2F0Y2gvaG9tZT9yZWdpb249JHt0aGlzLnJlZ2lvbn0jZGFzaGJvYXJkczpuYW1lPSR7bm90aWZpY2F0aW9uRGFzaGJvYXJkLmRhc2hib2FyZE5hbWV9YCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZFdhdGNoIERhc2hib2FyZCBmb3IgTm90aWZpY2F0aW9uIFN5c3RlbScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb2duaXRvIG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtaWQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtY2xpZW50LWlkLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbEFybicsIHtcclxuICAgICAgdmFsdWU6IHVzZXJQb29sLnVzZXJQb29sQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2VyLXBvb2wtYXJuLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG5cclxuXHJcblxyXG4iXX0=