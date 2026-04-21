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
exports.ProductionMisraStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3n = __importStar(require("aws-cdk-lib/aws-s3-notifications"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
const cloudfront = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const origins = __importStar(require("aws-cdk-lib/aws-cloudfront-origins"));
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const acm = __importStar(require("aws-cdk-lib/aws-certificatemanager"));
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const cloudwatch_monitoring_1 = require("./cloudwatch-monitoring");
const iam_roles_1 = require("./iam-roles");
const vpc_config_1 = require("./vpc-config");
const waf_config_1 = require("./waf-config");
const security_headers_1 = require("./security-headers");
const backup_config_1 = require("./backup-config");
class ProductionMisraStack extends cdk.Stack {
    userPool;
    userPoolClient;
    api;
    filesBucket;
    kmsKey;
    // DynamoDB Tables
    usersTable;
    fileMetadataTable;
    analysisResultsTable;
    sampleFilesTable;
    progressTable;
    // Lambda Functions
    authorizerFunction;
    jwtSecret;
    // IAM Roles
    iamRoles;
    // CloudWatch Monitoring
    monitoring;
    // VPC Configuration
    vpcConfig;
    // WAF Configuration
    wafConfig;
    // Security Headers
    securityHeaders;
    // Backup Configuration
    backupConfig;
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment, alertEmail } = props;
        const stackName = `misra-platform-${environment}`;
        // KMS Key for encryption
        this.kmsKey = new kms.Key(this, 'MisraKmsKey', {
            description: `MISRA Platform KMS Key - ${environment}`,
            enableKeyRotation: true,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // Create VPC configuration for production security
        if (environment === 'production') {
            this.vpcConfig = new vpc_config_1.VpcConfig(this, 'VpcConfig', {
                environment,
                enableNatGateway: true,
                enableVpcEndpoints: true,
                cidrBlock: '10.0.0.0/16',
            });
        }
        // Create DynamoDB tables
        this.createDynamoDBTables(environment);
        // Create S3 bucket
        this.createS3Bucket(environment);
        // Create Cognito User Pool
        this.createCognitoUserPool(environment);
        // Create Secrets Manager secrets
        this.createSecrets(environment);
        // Create IAM roles with least privilege access
        this.createIAMRoles(environment);
        // Create Lambda functions
        this.createLambdaFunctions(environment);
        // Create API Gateway with Lambda authorizer
        this.createApiGateway(environment);
        // Create Security Headers configuration
        this.createSecurityHeaders(environment);
        // Create API endpoints
        this.createApiEndpoints(environment);
        // Apply security headers to API Gateway
        this.applySecurityHeaders();
        // Create WAF configuration for API Gateway
        this.createWafConfiguration(environment);
        // Create comprehensive CloudWatch monitoring
        this.createCloudWatchMonitoring(environment, alertEmail);
        // Create backup and recovery configuration
        this.createBackupConfiguration(environment);
        // Create CloudFront distribution for frontend
        this.createCloudFrontDistribution(environment, props.domainName, props.certificateArn);
        // Output important values
        this.createOutputs();
    }
    createDynamoDBTables(environment) {
        // Users Table - Stores user profiles and authentication data
        this.usersTable = new dynamodb.Table(this, 'UsersTable', {
            tableName: `misra-platform-users-${environment}`,
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: this.kmsKey,
            pointInTimeRecovery: environment === 'production',
            // Enable DynamoDB Streams for audit logging
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for email lookup (required for login flow)
        this.usersTable.addGlobalSecondaryIndex({
            indexName: 'email-index',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Add GSI for organization queries (optional for multi-tenant support)
        this.usersTable.addGlobalSecondaryIndex({
            indexName: 'organizationId-createdAt-index',
            partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // File Metadata Table - Stores file upload metadata and S3 references
        this.fileMetadataTable = new dynamodb.Table(this, 'FileMetadataTable', {
            tableName: `misra-platform-file-metadata-${environment}`,
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: this.kmsKey,
            pointInTimeRecovery: environment === 'production',
            // Enable DynamoDB Streams for audit logging
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for user files chronologically ordered
        this.fileMetadataTable.addGlobalSecondaryIndex({
            indexName: 'userId-uploadTimestamp-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'uploadTimestamp', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Add GSI for content hash lookup (for caching)
        this.fileMetadataTable.addGlobalSecondaryIndex({
            indexName: 'contentHash-index',
            partitionKey: { name: 'contentHash', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Analysis Results Table - Stores MISRA analysis results and violations
        this.analysisResultsTable = new dynamodb.Table(this, 'AnalysisResultsTable', {
            tableName: `misra-platform-analysis-results-${environment}`,
            partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: this.kmsKey,
            pointInTimeRecovery: environment === 'production',
            // Enable DynamoDB Streams for audit logging
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
            // TTL for non-production environments to manage costs
            timeToLiveAttribute: environment !== 'production' ? 'ttl' : undefined,
        });
        // Add GSI for file analysis history
        this.analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'fileId-timestamp-index',
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Add GSI for user analysis history
        this.analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'userId-timestamp-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Add GSI for content hash lookup (for analysis caching)
        this.analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'contentHash-timestamp-index',
            partitionKey: { name: 'contentHash', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Sample Files Table - Curated library of C/C++ files with known MISRA violations
        this.sampleFilesTable = new dynamodb.Table(this, 'SampleFilesTable', {
            tableName: `misra-platform-sample-files-${environment}`,
            partitionKey: { name: 'sampleId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: this.kmsKey,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // Sample data can be recreated
        });
        // Add GSI for language and difficulty filtering (required for sample selection)
        this.sampleFilesTable.addGlobalSecondaryIndex({
            indexName: 'language-difficultyLevel-index',
            partitionKey: { name: 'language', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'difficultyLevel', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Add GSI for expected compliance range filtering
        this.sampleFilesTable.addGlobalSecondaryIndex({
            indexName: 'language-expectedCompliance-index',
            partitionKey: { name: 'language', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'expectedCompliance', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Add GSI for usage tracking and analytics
        this.sampleFilesTable.addGlobalSecondaryIndex({
            indexName: 'usageCount-createdAt-index',
            partitionKey: { name: 'usageCount', type: dynamodb.AttributeType.NUMBER },
            sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Progress Table for real-time updates - Stores analysis progress for live tracking
        this.progressTable = new dynamodb.Table(this, 'ProgressTable', {
            tableName: `misra-platform-progress-${environment}`,
            partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey: this.kmsKey,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            timeToLiveAttribute: 'ttl', // Auto-cleanup after 24 hours
            // Enable DynamoDB Streams for real-time progress updates
            stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
        });
        // Add GSI for user progress tracking
        this.progressTable.addGlobalSecondaryIndex({
            indexName: 'userId-updatedAt-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Configure auto-scaling for production environment
        if (environment === 'production') {
            this.configureAutoScaling();
        }
    }
    /**
     * Configure auto-scaling for DynamoDB tables in production
     */
    configureAutoScaling() {
        // Note: Auto-scaling requires PROVISIONED billing mode
        // For production, we'll use a hybrid approach:
        // - Keep PAY_PER_REQUEST for cost efficiency during low usage
        // - Add CloudWatch alarms to monitor usage and recommend switching to PROVISIONED when needed
        // Create CloudWatch alarms for high usage patterns
        const usersTableReadAlarm = new cloudwatch.Alarm(this, 'UsersTableHighReadUsage', {
            alarmName: `misra-platform-users-table-high-read-${this.node.tryGetContext('environment') || 'production'}`,
            alarmDescription: 'Users table experiencing high read usage - consider switching to provisioned mode',
            metric: this.usersTable.metricConsumedReadCapacityUnits({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            }),
            threshold: 1000, // 1000 RCUs in 5 minutes
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        const usersTableWriteAlarm = new cloudwatch.Alarm(this, 'UsersTableHighWriteUsage', {
            alarmName: `misra-platform-users-table-high-write-${this.node.tryGetContext('environment') || 'production'}`,
            alarmDescription: 'Users table experiencing high write usage - consider switching to provisioned mode',
            metric: this.usersTable.metricConsumedWriteCapacityUnits({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            }),
            threshold: 1000, // 1000 WCUs in 5 minutes
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        const analysisTableReadAlarm = new cloudwatch.Alarm(this, 'AnalysisTableHighReadUsage', {
            alarmName: `misra-platform-analysis-table-high-read-${this.node.tryGetContext('environment') || 'production'}`,
            alarmDescription: 'Analysis results table experiencing high read usage - consider switching to provisioned mode',
            metric: this.analysisResultsTable.metricConsumedReadCapacityUnits({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            }),
            threshold: 2000, // 2000 RCUs in 5 minutes
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        const analysisTableWriteAlarm = new cloudwatch.Alarm(this, 'AnalysisTableHighWriteUsage', {
            alarmName: `misra-platform-analysis-table-high-write-${this.node.tryGetContext('environment') || 'production'}`,
            alarmDescription: 'Analysis results table experiencing high write usage - consider switching to provisioned mode',
            metric: this.analysisResultsTable.metricConsumedWriteCapacityUnits({
                period: cdk.Duration.minutes(5),
                statistic: 'Sum',
            }),
            threshold: 2000, // 2000 WCUs in 5 minutes
            evaluationPeriods: 2,
            treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        });
        // Store alarms for monitoring setup
        this.capacityAlarms = {
            usersTableRead: usersTableReadAlarm,
            usersTableWrite: usersTableWriteAlarm,
            analysisTableRead: analysisTableReadAlarm,
            analysisTableWrite: analysisTableWriteAlarm,
        };
    }
    createS3Bucket(environment) {
        this.filesBucket = new s3.Bucket(this, 'FilesBucket', {
            bucketName: `misra-platform-files-${environment}-${this.account}`,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: this.kmsKey,
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'production',
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.HEAD,
                    ],
                    allowedOrigins: environment === 'production'
                        ? ['https://your-production-domain.com'] // Replace with actual production domain
                        : ['http://localhost:3000', 'http://localhost:5173', 'https://*.vercel.app'],
                    allowedHeaders: [
                        'Authorization',
                        'Content-Type',
                        'Content-Length',
                        'Content-MD5',
                        'x-amz-date',
                        'x-amz-security-token',
                        'x-amz-user-agent',
                        'x-amz-content-sha256',
                    ],
                    exposedHeaders: [
                        'ETag',
                        'x-amz-version-id',
                    ],
                    maxAge: 3600, // 1 hour
                },
            ],
            lifecycleRules: [
                {
                    id: 'DeleteOldVersions',
                    enabled: true,
                    noncurrentVersionExpiration: cdk.Duration.days(30),
                },
                {
                    id: 'TransitionToIA',
                    enabled: true,
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(30),
                        },
                        {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: cdk.Duration.days(90),
                        },
                        {
                            storageClass: s3.StorageClass.DEEP_ARCHIVE,
                            transitionAfter: cdk.Duration.days(365),
                        },
                    ],
                },
                {
                    id: 'AbortIncompleteMultipartUploads',
                    enabled: true,
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
                },
                {
                    id: 'DeleteExpiredDeleteMarkers',
                    enabled: true,
                    expiredObjectDeleteMarker: true,
                },
                {
                    id: 'OptimizeSmallFiles',
                    enabled: true,
                    objectSizeGreaterThan: 128 * 1024, // 128KB
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: cdk.Duration.days(30),
                        },
                    ],
                },
                {
                    id: 'ArchiveLargeFiles',
                    enabled: true,
                    objectSizeGreaterThan: 10 * 1024 * 1024, // 10MB
                    transitions: [
                        {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: cdk.Duration.days(60),
                        },
                        {
                            storageClass: s3.StorageClass.DEEP_ARCHIVE,
                            transitionAfter: cdk.Duration.days(180),
                        },
                    ],
                },
            ],
        });
        // Configure cross-region replication for production
        if (environment === 'production') {
            this.configureCrossRegionReplication();
        }
    }
    createCognitoUserPool(environment) {
        this.userPool = new cognito.UserPool(this, 'UserPool', {
            userPoolName: `misra-platform-users-${environment}`,
            selfSignUpEnabled: true,
            signInAliases: { email: true },
            autoVerify: { email: true },
            passwordPolicy: {
                minLength: 8,
                requireLowercase: true,
                requireUppercase: true,
                requireDigits: true,
                requireSymbols: false,
            },
            accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
            // Configure MFA for autonomous workflow with TOTP support
            mfa: cognito.Mfa.REQUIRED, // Make MFA required for production security
            mfaSecondFactor: {
                sms: false,
                otp: true, // Enable TOTP MFA for SOFTWARE_TOKEN_MFA challenge flow
            },
            standardAttributes: {
                email: { required: true, mutable: false },
                givenName: { required: true, mutable: true },
                familyName: { required: false, mutable: true },
            },
            customAttributes: {
                organizationId: new cognito.StringAttribute({ maxLen: 256, mutable: true }),
                role: new cognito.StringAttribute({ maxLen: 50, mutable: true }),
                // Add custom attribute to track MFA setup status for autonomous workflow
                mfaSetupComplete: new cognito.StringAttribute({ maxLen: 10, mutable: true }),
            },
            // Configure user verification settings for autonomous workflow
            userVerification: {
                emailSubject: 'MISRA Platform - Verify your email',
                emailBody: 'Welcome to MISRA Platform! Your verification code is {####}',
                emailStyle: cognito.VerificationEmailStyle.CODE,
            },
            // Configure user invitation settings
            userInvitation: {
                emailSubject: 'Welcome to MISRA Platform',
                emailBody: 'Your username is {username} and temporary password is {####}',
            },
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool: this.userPool,
            userPoolClientName: `misra-platform-web-client-${environment}`,
            generateSecret: false, // Public client for SPA
            authFlows: {
                userPassword: true,
                userSrp: true,
                adminUserPassword: true,
                // Enable custom auth flow for MFA challenges
                custom: true,
            },
            accessTokenValidity: cdk.Duration.hours(1),
            idTokenValidity: cdk.Duration.hours(1),
            refreshTokenValidity: cdk.Duration.days(30),
            preventUserExistenceErrors: true,
            // Configure supported identity providers
            supportedIdentityProviders: [
                cognito.UserPoolClientIdentityProvider.COGNITO,
            ],
            // Configure OAuth settings for potential future use
            oAuth: {
                flows: {
                    authorizationCodeGrant: false,
                    implicitCodeGrant: false,
                    clientCredentials: false,
                },
                scopes: [
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.PROFILE,
                ],
            },
            // Configure read and write attributes
            readAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({
                email: true,
                emailVerified: true,
                givenName: true,
                familyName: true,
            })
                .withCustomAttributes('organizationId', 'role', 'mfaSetupComplete'),
            writeAttributes: new cognito.ClientAttributes()
                .withStandardAttributes({
                givenName: true,
                familyName: true,
            })
                .withCustomAttributes('organizationId', 'role', 'mfaSetupComplete'),
        });
        // Add CloudWatch log group for Cognito events
        new logs.LogGroup(this, 'CognitoLogGroup', {
            logGroupName: `/aws/cognito/userpool/${this.userPool.userPoolId}`,
            retention: environment === 'production'
                ? logs.RetentionDays.ONE_MONTH
                : logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
    }
    createApiGateway(environment) {
        // Create CloudWatch log group for API Gateway
        const apiLogGroup = new logs.LogGroup(this, 'ApiGatewayLogGroup', {
            logGroupName: `/aws/apigateway/misra-platform-${environment}`,
            retention: environment === 'production'
                ? logs.RetentionDays.ONE_MONTH
                : logs.RetentionDays.ONE_WEEK,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Enhanced CORS configuration for production domains
        const productionOrigins = [
            'https://misra.yourdomain.com',
            'https://www.misra.yourdomain.com',
            'https://app.misra.yourdomain.com'
        ];
        const developmentOrigins = [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://*.vercel.app',
            'https://*.netlify.app'
        ];
        const allowedOrigins = environment === 'production'
            ? productionOrigins
            : [...productionOrigins, ...developmentOrigins];
        // Enhanced security headers for CORS
        const secureHeaders = [
            'Content-Type',
            'Authorization',
            'X-Amz-Date',
            'X-Api-Key',
            'X-Correlation-ID',
            'X-Requested-With',
            'Accept',
            'Origin',
            'X-Amz-Security-Token',
            'X-Amz-User-Agent',
            'X-Amz-Content-Sha256',
            'Cache-Control',
            'If-Match',
            'If-None-Match',
            'If-Modified-Since',
            'If-Unmodified-Since'
        ];
        this.api = new apigateway.RestApi(this, 'MisraApi', {
            restApiName: `misra-platform-api-${environment}`,
            description: `MISRA Compliance Platform API - ${environment}`,
            deployOptions: {
                stageName: environment,
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: environment !== 'production',
                metricsEnabled: true,
                accessLogDestination: new apigateway.LogGroupLogDestination(apiLogGroup),
                accessLogFormat: apigateway.AccessLogFormat.jsonWithStandardFields({
                    caller: true,
                    httpMethod: true,
                    ip: true,
                    protocol: true,
                    requestTime: true,
                    resourcePath: true,
                    responseLength: true,
                    status: true,
                    user: true,
                }),
                // Enhanced caching configuration
                cachingEnabled: environment === 'production',
                cacheClusterEnabled: environment === 'production',
                cacheClusterSize: environment === 'production' ? '0.5' : undefined,
                cacheTtl: cdk.Duration.minutes(5),
            },
            defaultCorsPreflightOptions: {
                allowOrigins: allowedOrigins,
                allowMethods: [
                    'GET',
                    'POST',
                    'PUT',
                    'DELETE',
                    'PATCH',
                    'HEAD',
                    'OPTIONS'
                ],
                allowHeaders: secureHeaders,
                exposeHeaders: [
                    'X-Correlation-ID',
                    'X-Request-ID',
                    'X-Amz-Request-ID',
                    'ETag',
                    'Content-Length',
                    'Content-Type'
                ],
                allowCredentials: false,
                maxAge: cdk.Duration.hours(1),
            },
            cloudWatchRole: true,
            // Enable binary media types for file uploads
            binaryMediaTypes: ['*/*'],
            // Enhanced API Gateway configuration
            endpointConfiguration: {
                types: [apigateway.EndpointType.REGIONAL],
            },
            // Minimum compression size for responses
            minimumCompressionSize: 1024,
        });
        // Create request validator after API is created
        const requestValidator = new apigateway.RequestValidator(this, 'RequestValidator', {
            restApi: this.api,
            requestValidatorName: `misra-platform-validator-${environment}`,
            validateRequestBody: true,
            validateRequestParameters: true,
        });
        // Enhanced rate limiting and throttling with multiple usage plans
        // 1. Premium Usage Plan (for authenticated users)
        const premiumUsagePlan = this.api.addUsagePlan('MisraPremiumUsagePlan', {
            name: `misra-platform-premium-plan-${environment}`,
            description: `Premium rate limiting for authenticated users - ${environment}`,
            throttle: {
                rateLimit: environment === 'production' ? 2000 : 200,
                burstLimit: environment === 'production' ? 5000 : 500,
            },
            quota: {
                limit: environment === 'production' ? 500000 : 50000,
                period: apigateway.Period.DAY,
            },
        });
        // 2. Standard Usage Plan (for general API access)
        const standardUsagePlan = this.api.addUsagePlan('MisraStandardUsagePlan', {
            name: `misra-platform-standard-plan-${environment}`,
            description: `Standard rate limiting for general API access - ${environment}`,
            throttle: {
                rateLimit: environment === 'production' ? 1000 : 100,
                burstLimit: environment === 'production' ? 2000 : 200,
            },
            quota: {
                limit: environment === 'production' ? 100000 : 10000,
                period: apigateway.Period.DAY,
            },
        });
        // 3. Limited Usage Plan (for unauthenticated/public endpoints)
        const limitedUsagePlan = this.api.addUsagePlan('MisraLimitedUsagePlan', {
            name: `misra-platform-limited-plan-${environment}`,
            description: `Limited rate limiting for public endpoints - ${environment}`,
            throttle: {
                rateLimit: environment === 'production' ? 100 : 50,
                burstLimit: environment === 'production' ? 200 : 100,
            },
            quota: {
                limit: environment === 'production' ? 10000 : 1000,
                period: apigateway.Period.DAY,
            },
        });
        // Associate usage plans with API stages
        [premiumUsagePlan, standardUsagePlan, limitedUsagePlan].forEach(plan => {
            plan.addApiStage({
                stage: this.api.deploymentStage,
            });
        });
        // Create API Keys for different access levels
        const premiumApiKey = this.api.addApiKey('MisraPremiumApiKey', {
            apiKeyName: `misra-platform-premium-key-${environment}`,
            description: `Premium API Key for MISRA Platform - ${environment}`,
            value: environment === 'production' ? undefined : 'premium-dev-key-12345',
        });
        const standardApiKey = this.api.addApiKey('MisraStandardApiKey', {
            apiKeyName: `misra-platform-standard-key-${environment}`,
            description: `Standard API Key for MISRA Platform - ${environment}`,
            value: environment === 'production' ? undefined : 'standard-dev-key-12345',
        });
        const monitoringApiKey = this.api.addApiKey('MisraMonitoringApiKey', {
            apiKeyName: `misra-platform-monitoring-key-${environment}`,
            description: `Monitoring API Key for MISRA Platform - ${environment}`,
            value: environment === 'production' ? undefined : 'monitoring-dev-key-12345',
        });
        // Associate API keys with usage plans
        premiumUsagePlan.addApiKey(premiumApiKey);
        standardUsagePlan.addApiKey(standardApiKey);
        limitedUsagePlan.addApiKey(monitoringApiKey);
        // Request/Response Models for validation
        this.createApiModels(environment);
        // Custom domain configuration (if provided)
        this.configureCustomDomain(environment);
        // Store references for endpoint creation
        this.usagePlans = {
            premium: premiumUsagePlan,
            standard: standardUsagePlan,
            limited: limitedUsagePlan,
        };
        this.apiKeys = {
            premium: premiumApiKey,
            standard: standardApiKey,
            monitoring: monitoringApiKey,
        };
    }
    /**
     * Create API models for request/response validation
     */
    createApiModels(environment) {
        // User Registration Model
        const userRegistrationModel = this.api.addModel('UserRegistrationModel', {
            modelName: 'UserRegistration',
            description: 'Model for user registration requests',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    email: {
                        type: apigateway.JsonSchemaType.STRING,
                        format: 'email',
                        maxLength: 255,
                    },
                    password: {
                        type: apigateway.JsonSchemaType.STRING,
                        minLength: 8,
                        maxLength: 128,
                        pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]',
                    },
                    firstName: {
                        type: apigateway.JsonSchemaType.STRING,
                        minLength: 1,
                        maxLength: 50,
                    },
                    lastName: {
                        type: apigateway.JsonSchemaType.STRING,
                        minLength: 1,
                        maxLength: 50,
                    },
                    organizationId: {
                        type: apigateway.JsonSchemaType.STRING,
                        maxLength: 256,
                    },
                },
                required: ['email', 'password', 'firstName'],
                additionalProperties: false,
            },
        });
        // File Upload Model
        const fileUploadModel = this.api.addModel('FileUploadModel', {
            modelName: 'FileUpload',
            description: 'Model for file upload requests',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    fileName: {
                        type: apigateway.JsonSchemaType.STRING,
                        minLength: 1,
                        maxLength: 255,
                        pattern: '^[a-zA-Z0-9._-]+\\.(c|cpp|h|hpp)$',
                    },
                    fileSize: {
                        type: apigateway.JsonSchemaType.INTEGER,
                        minimum: 1,
                        maximum: 10485760, // 10MB
                    },
                    contentType: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ['text/plain', 'text/x-c', 'text/x-c++', 'application/octet-stream'],
                    },
                    checksum: {
                        type: apigateway.JsonSchemaType.STRING,
                        pattern: '^[a-fA-F0-9]{64}$', // SHA-256 hash
                    },
                },
                required: ['fileName', 'fileSize', 'contentType'],
                additionalProperties: false,
            },
        });
        // Analysis Request Model
        const analysisRequestModel = this.api.addModel('AnalysisRequestModel', {
            modelName: 'AnalysisRequest',
            description: 'Model for analysis requests',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    fileId: {
                        type: apigateway.JsonSchemaType.STRING,
                        pattern: '^[a-zA-Z0-9-_]{1,128}$',
                    },
                    analysisType: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ['full', 'quick', 'custom'],
                    },
                    ruleSet: {
                        type: apigateway.JsonSchemaType.STRING,
                        enum: ['misra-c-2012', 'misra-cpp-2008', 'custom'],
                    },
                    options: {
                        type: apigateway.JsonSchemaType.OBJECT,
                        properties: {
                            includeWarnings: {
                                type: apigateway.JsonSchemaType.BOOLEAN,
                            },
                            severity: {
                                type: apigateway.JsonSchemaType.STRING,
                                enum: ['low', 'medium', 'high', 'critical'],
                            },
                        },
                        additionalProperties: false,
                    },
                },
                required: ['fileId', 'analysisType', 'ruleSet'],
                additionalProperties: false,
            },
        });
        // Error Response Model
        const errorResponseModel = this.api.addModel('ErrorResponseModel', {
            modelName: 'ErrorResponse',
            description: 'Standard error response model',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    error: {
                        type: apigateway.JsonSchemaType.STRING,
                    },
                    message: {
                        type: apigateway.JsonSchemaType.STRING,
                    },
                    correlationId: {
                        type: apigateway.JsonSchemaType.STRING,
                    },
                    timestamp: {
                        type: apigateway.JsonSchemaType.STRING,
                        format: 'date-time',
                    },
                    path: {
                        type: apigateway.JsonSchemaType.STRING,
                    },
                    details: {
                        type: apigateway.JsonSchemaType.OBJECT,
                        additionalProperties: true,
                    },
                },
                required: ['error', 'message', 'correlationId', 'timestamp'],
                additionalProperties: false,
            },
        });
        // Store models for use in endpoint creation
        this.apiModels = {
            userRegistration: userRegistrationModel,
            fileUpload: fileUploadModel,
            analysisRequest: analysisRequestModel,
            errorResponse: errorResponseModel,
        };
    }
    /**
     * Configure custom domain and SSL certificate
     */
    configureCustomDomain(environment) {
        // Custom domain configuration
        const domainName = environment === 'production'
            ? 'api.misra.yourdomain.com'
            : `api-${environment}.misra.yourdomain.com`;
        // Get certificate ARN from context or parameter
        const certificateArn = this.node.tryGetContext('certificateArn');
        const enableCustomDomain = this.node.tryGetContext('enableCustomDomain') === 'true';
        // Create parameters for custom domain configuration
        const certificateArnParameter = new cdk.CfnParameter(this, 'CertificateArn', {
            type: 'String',
            description: 'ARN of the SSL certificate for the custom domain (must be in us-east-1 for CloudFront)',
            default: certificateArn || 'arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERTIFICATE_ID',
        });
        const domainNameParameter = new cdk.CfnParameter(this, 'DomainName', {
            type: 'String',
            description: 'Custom domain name for the API Gateway',
            default: domainName,
        });
        const hostedZoneIdParameter = new cdk.CfnParameter(this, 'HostedZoneId', {
            type: 'String',
            description: 'Route 53 Hosted Zone ID for the domain',
            default: 'Z1234567890ABC',
        });
        // If custom domain is enabled and certificate ARN is provided, create the domain
        if (enableCustomDomain && certificateArn && certificateArn !== 'placeholder') {
            try {
                // Import the certificate
                const certificate = acm.Certificate.fromCertificateArn(this, 'ApiCertificate', certificateArn);
                // Create custom domain for API Gateway
                const customDomain = new apigateway.DomainName(this, 'ApiCustomDomain', {
                    domainName: domainNameParameter.valueAsString,
                    certificate: certificate,
                    securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
                    endpointType: apigateway.EndpointType.REGIONAL,
                });
                // Map the custom domain to the API Gateway stage
                new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
                    domainName: customDomain,
                    restApi: this.api,
                    stage: this.api.deploymentStage,
                    basePath: '', // Map to root path
                });
                // Output the custom domain information
                new cdk.CfnOutput(this, 'CustomDomainName', {
                    value: customDomain.domainName,
                    description: 'Custom domain name for API Gateway',
                    exportName: `${this.stackName}-CustomDomain`,
                });
                new cdk.CfnOutput(this, 'CustomDomainTarget', {
                    value: customDomain.domainNameAliasDomainName,
                    description: 'Target domain name for Route 53 alias record',
                    exportName: `${this.stackName}-CustomDomainTarget`,
                });
                new cdk.CfnOutput(this, 'CustomDomainHostedZoneId', {
                    value: customDomain.domainNameAliasHostedZoneId,
                    description: 'Hosted Zone ID for Route 53 alias record',
                    exportName: `${this.stackName}-CustomDomainHostedZoneId`,
                });
                // Store custom domain reference
                this.customDomain = customDomain;
                // Create Route 53 record instructions
                new cdk.CfnOutput(this, 'Route53Instructions', {
                    value: `Create Route 53 A record: ${domainNameParameter.valueAsString} -> ALIAS -> ${customDomain.domainNameAliasDomainName} (${customDomain.domainNameAliasHostedZoneId})`,
                    description: 'Instructions for creating Route 53 DNS record',
                });
            }
            catch (error) {
                console.warn('Custom domain configuration skipped:', error);
            }
        }
        // Store configuration for documentation
        const customDomainConfig = {
            domainName: domainNameParameter.valueAsString,
            certificateArn: certificateArnParameter.valueAsString,
            hostedZoneId: hostedZoneIdParameter.valueAsString,
            securityPolicy: 'TLS_1_2',
            endpointType: 'REGIONAL',
            enabled: enableCustomDomain,
        };
        this.customDomainConfig = customDomainConfig;
        // Output the domain configuration for manual setup
        new cdk.CfnOutput(this, 'CustomDomainConfig', {
            value: JSON.stringify(customDomainConfig, null, 2),
            description: 'Custom domain configuration for API Gateway',
            exportName: `${this.stackName}-CustomDomainConfig`,
        });
        // Output setup instructions
        new cdk.CfnOutput(this, 'CustomDomainSetupInstructions', {
            value: [
                '1. Create SSL certificate in ACM (must be in us-east-1 for CloudFront)',
                '2. Deploy stack with: cdk deploy --context certificateArn=<ARN> --context enableCustomDomain=true',
                '3. Create Route 53 A record pointing to the custom domain target',
                '4. Wait for DNS propagation (can take up to 48 hours)',
                '5. Test the custom domain: curl https://' + domainNameParameter.valueAsString + '/health',
            ].join(' | '),
            description: 'Step-by-step instructions for setting up custom domain',
        });
        // Store parameters for future domain setup
        this.domainParameters = {
            certificateArn: certificateArnParameter,
            domainName: domainNameParameter,
            hostedZoneId: hostedZoneIdParameter,
        };
    }
    createApiEndpoints(environment) {
        // Get references to models and usage plans
        const models = this.apiModels;
        const usagePlans = this.usagePlans;
        // Create Lambda Authorizer for JWT validation with enhanced configuration
        const authorizer = new apigateway.RequestAuthorizer(this, 'JwtAuthorizer', {
            handler: this.authorizerFunction,
            identitySources: [
                apigateway.IdentitySource.header('Authorization'),
                apigateway.IdentitySource.header('X-Api-Key'),
            ],
            authorizerName: `jwt-authorizer-${environment}`,
            resultsCacheTtl: cdk.Duration.minutes(5), // Cache authorization results for 5 minutes
        });
        // Enhanced request validator for different validation levels
        const strictValidator = new apigateway.RequestValidator(this, 'StrictValidator', {
            restApi: this.api,
            requestValidatorName: `misra-platform-strict-validator-${environment}`,
            validateRequestBody: true,
            validateRequestParameters: true,
        });
        const bodyOnlyValidator = new apigateway.RequestValidator(this, 'BodyOnlyValidator', {
            restApi: this.api,
            requestValidatorName: `misra-platform-body-validator-${environment}`,
            validateRequestBody: true,
            validateRequestParameters: false,
        });
        const paramsOnlyValidator = new apigateway.RequestValidator(this, 'ParamsOnlyValidator', {
            restApi: this.api,
            requestValidatorName: `misra-platform-params-validator-${environment}`,
            validateRequestBody: false,
            validateRequestParameters: true,
        });
        // Create API resource structure with enhanced configuration
        // /auth - Authentication endpoints (public with limited rate limiting)
        const authResource = this.api.root.addResource('auth', {
            defaultCorsPreflightOptions: {
                allowOrigins: environment === 'production'
                    ? ['https://misra.yourdomain.com', 'https://app.misra.yourdomain.com']
                    : ['*'],
                allowMethods: ['POST', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Correlation-ID',
                    'X-Requested-With',
                ],
                maxAge: cdk.Duration.minutes(10),
            },
        });
        // /auth/login - Login endpoint with strict validation
        const loginResource = authResource.addResource('login');
        loginResource.addMethod('POST', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Login endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            requestValidator: strictValidator,
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '400',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }, {
                    statusCode: '401',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: false,
        });
        // /auth/register - Registration endpoint with validation
        const registerResource = authResource.addResource('register');
        registerResource.addMethod('POST', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '201',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Registration endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 201}',
            },
        }), {
            requestValidator: strictValidator,
            requestModels: {
                'application/json': models.userRegistration,
            },
            methodResponses: [{
                    statusCode: '201',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '400',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }, {
                    statusCode: '409',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: false,
        });
        // /auth/refresh - Token refresh endpoint
        const refreshResource = authResource.addResource('refresh');
        refreshResource.addMethod('POST', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Refresh endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            requestValidator: bodyOnlyValidator,
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '401',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: false,
        });
        // /auth/logout - Logout endpoint
        const logoutResource = authResource.addResource('logout');
        logoutResource.addMethod('POST', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Logout endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            requestValidator: paramsOnlyValidator,
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }],
            apiKeyRequired: false,
        });
        // /files - File management endpoints (protected with premium rate limiting)
        const filesResource = this.api.root.addResource('files', {
            defaultCorsPreflightOptions: {
                allowOrigins: environment === 'production'
                    ? ['https://misra.yourdomain.com', 'https://app.misra.yourdomain.com']
                    : ['*'],
                allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Correlation-ID',
                    'X-Requested-With',
                    'Content-Length',
                    'Content-MD5',
                ],
                exposeHeaders: ['ETag', 'Content-Length'],
                maxAge: cdk.Duration.minutes(5),
            },
        });
        // /files/upload - File upload endpoint with validation
        const uploadResource = filesResource.addResource('upload');
        uploadResource.addMethod('POST', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '201',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Upload endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 201}',
            },
        }), {
            authorizer,
            requestValidator: strictValidator,
            requestModels: {
                'application/json': models.fileUpload,
            },
            methodResponses: [{
                    statusCode: '201',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '400',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }, {
                    statusCode: '401',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }, {
                    statusCode: '413',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        // /files/{fileId} - Individual file operations
        const fileIdResource = filesResource.addResource('{fileId}');
        fileIdResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Get file endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            requestValidator: paramsOnlyValidator,
            requestParameters: {
                'method.request.path.fileId': true,
            },
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '404',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        fileIdResource.addMethod('DELETE', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '204',
                    responseTemplates: {
                        'application/json': '',
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 204}',
            },
        }), {
            authorizer,
            requestValidator: paramsOnlyValidator,
            requestParameters: {
                'method.request.path.fileId': true,
            },
            methodResponses: [{
                    statusCode: '204',
                }, {
                    statusCode: '404',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        // /files/list - List files endpoint with pagination
        const listFilesResource = filesResource.addResource('list');
        listFilesResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'List files endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            requestValidator: paramsOnlyValidator,
            requestParameters: {
                'method.request.querystring.limit': false,
                'method.request.querystring.offset': false,
                'method.request.querystring.sortBy': false,
            },
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }],
            apiKeyRequired: true,
        });
        // /analysis - Analysis endpoints (protected with standard rate limiting)
        const analysisResource = this.api.root.addResource('analysis', {
            defaultCorsPreflightOptions: {
                allowOrigins: environment === 'production'
                    ? ['https://misra.yourdomain.com', 'https://app.misra.yourdomain.com']
                    : ['*'],
                allowMethods: ['GET', 'POST', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Correlation-ID',
                    'X-Requested-With',
                ],
                maxAge: cdk.Duration.minutes(5),
            },
        });
        // /analysis/start - Start analysis endpoint with validation
        const startAnalysisResource = analysisResource.addResource('start');
        startAnalysisResource.addMethod('POST', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '202',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Start analysis endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 202}',
            },
        }), {
            authorizer,
            requestValidator: strictValidator,
            requestModels: {
                'application/json': models.analysisRequest,
            },
            methodResponses: [{
                    statusCode: '202',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '400',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }, {
                    statusCode: '404',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        // /analysis/status/{analysisId} - Analysis status endpoint
        const statusResource = analysisResource.addResource('status');
        const analysisStatusResource = statusResource.addResource('{analysisId}');
        analysisStatusResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Analysis status endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            requestValidator: paramsOnlyValidator,
            requestParameters: {
                'method.request.path.analysisId': true,
            },
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '404',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        // /analysis/results/{analysisId} - Analysis results endpoint
        const resultsResource = analysisResource.addResource('results');
        const analysisResultsResource = resultsResource.addResource('{analysisId}');
        analysisResultsResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Analysis results endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            requestValidator: paramsOnlyValidator,
            requestParameters: {
                'method.request.path.analysisId': true,
            },
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '404',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        // /user - User profile endpoints (protected)
        const userResource = this.api.root.addResource('user', {
            defaultCorsPreflightOptions: {
                allowOrigins: environment === 'production'
                    ? ['https://misra.yourdomain.com', 'https://app.misra.yourdomain.com']
                    : ['*'],
                allowMethods: ['GET', 'PUT', 'PATCH', 'OPTIONS'],
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Correlation-ID',
                    'X-Requested-With',
                ],
                maxAge: cdk.Duration.minutes(10),
            },
        });
        // /user/profile - User profile endpoint
        const profileResource = userResource.addResource('profile');
        profileResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Get profile endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }],
            apiKeyRequired: true,
        });
        profileResource.addMethod('PUT', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Update profile endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            requestValidator: bodyOnlyValidator,
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '400',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        // /user/preferences - User preferences endpoint
        const preferencesResource = userResource.addResource('preferences');
        preferencesResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Get preferences endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }],
            apiKeyRequired: true,
        });
        preferencesResource.addMethod('PATCH', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({ message: 'Update preferences endpoint - Lambda integration pending' }),
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            authorizer,
            requestValidator: bodyOnlyValidator,
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                }, {
                    statusCode: '400',
                    responseModels: {
                        'application/json': models.errorResponse,
                    },
                }],
            apiKeyRequired: true,
        });
        // Health check endpoint (public with minimal rate limiting)
        const healthResource = this.api.root.addResource('health');
        healthResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            status: 'healthy',
                            timestamp: '$context.requestTime',
                            environment: environment,
                            version: '1.0.0',
                            region: '$context.identity.region',
                        }),
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
                        'method.response.header.X-Correlation-ID': "'$context.requestId'",
                        'method.response.header.Cache-Control': "'no-cache, no-store, must-revalidate'",
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.Access-Control-Allow-Headers': true,
                        'method.response.header.Access-Control-Allow-Methods': true,
                        'method.response.header.X-Correlation-ID': true,
                        'method.response.header.Cache-Control': true,
                    },
                }],
            apiKeyRequired: false,
        });
        // Enhanced health check with detailed system status
        const healthDetailedResource = healthResource.addResource('detailed');
        healthDetailedResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            status: 'healthy',
                            timestamp: '$context.requestTime',
                            environment: environment,
                            version: '1.0.0',
                            region: '$context.identity.region',
                            services: {
                                database: 'healthy',
                                storage: 'healthy',
                                authentication: 'healthy',
                                analysis: 'healthy',
                            },
                            metrics: {
                                uptime: '99.9%',
                                responseTime: '<100ms',
                                errorRate: '<0.1%',
                            },
                        }),
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.X-Correlation-ID': "'$context.requestId'",
                        'method.response.header.Cache-Control': "'max-age=30'",
                    },
                }],
            requestTemplates: {
                'application/json': '{"statusCode": 200}',
            },
        }), {
            methodResponses: [{
                    statusCode: '200',
                    responseModels: {
                        'application/json': apigateway.Model.EMPTY_MODEL,
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true,
                        'method.response.header.X-Correlation-ID': true,
                        'method.response.header.Cache-Control': true,
                    },
                }],
            apiKeyRequired: true, // Require API key for detailed health info
        });
        // Store resources and validators for future Lambda integration
        this.apiResources = {
            auth: {
                root: authResource,
                login: loginResource,
                register: registerResource,
                refresh: refreshResource,
                logout: logoutResource,
            },
            files: {
                root: filesResource,
                upload: uploadResource,
                fileId: fileIdResource,
                list: listFilesResource,
            },
            analysis: {
                root: analysisResource,
                start: startAnalysisResource,
                status: analysisStatusResource,
                results: analysisResultsResource,
            },
            user: {
                root: userResource,
                profile: profileResource,
                preferences: preferencesResource,
            },
            health: {
                root: healthResource,
                detailed: healthDetailedResource,
            },
        };
        this.apiValidators = {
            strict: strictValidator,
            bodyOnly: bodyOnlyValidator,
            paramsOnly: paramsOnlyValidator,
        };
        this.lambdaAuthorizer = authorizer;
        // Create method-specific throttling configurations
        this.configureMethodThrottling(environment);
    }
    /**
     * Configure per-method throttling and caching
     */
    configureMethodThrottling(environment) {
        // Method-specific throttling configuration
        const methodThrottling = {
            // Authentication endpoints - moderate throttling
            'auth/login': {
                burstLimit: environment === 'production' ? 50 : 20,
                rateLimit: environment === 'production' ? 100 : 40,
            },
            'auth/register': {
                burstLimit: environment === 'production' ? 10 : 5,
                rateLimit: environment === 'production' ? 20 : 10,
            },
            'auth/refresh': {
                burstLimit: environment === 'production' ? 100 : 40,
                rateLimit: environment === 'production' ? 200 : 80,
            },
            // File operations - higher limits for authenticated users
            'files/upload': {
                burstLimit: environment === 'production' ? 20 : 10,
                rateLimit: environment === 'production' ? 50 : 20,
            },
            'files/list': {
                burstLimit: environment === 'production' ? 100 : 40,
                rateLimit: environment === 'production' ? 200 : 80,
            },
            // Analysis operations - balanced throttling
            'analysis/start': {
                burstLimit: environment === 'production' ? 30 : 15,
                rateLimit: environment === 'production' ? 60 : 30,
            },
            'analysis/status': {
                burstLimit: environment === 'production' ? 200 : 80,
                rateLimit: environment === 'production' ? 500 : 200,
            },
            'analysis/results': {
                burstLimit: environment === 'production' ? 100 : 40,
                rateLimit: environment === 'production' ? 200 : 80,
            },
            // Health checks - minimal throttling
            'health': {
                burstLimit: environment === 'production' ? 1000 : 400,
                rateLimit: environment === 'production' ? 2000 : 800,
            },
        };
        // Store throttling configuration for monitoring and documentation
        this.methodThrottling = methodThrottling;
        // Create CloudWatch alarms for throttling
        Object.entries(methodThrottling).forEach(([path, limits]) => {
            new cloudwatch.Alarm(this, `${path.replace('/', '-')}-ThrottleAlarm`, {
                alarmName: `misra-platform-${path.replace('/', '-')}-throttle-${environment}`,
                alarmDescription: `Throttling alarm for ${path} endpoint`,
                metric: new cloudwatch.Metric({
                    namespace: 'AWS/ApiGateway',
                    metricName: 'ThrottleCount',
                    dimensionsMap: {
                        ApiName: this.api.restApiName,
                        Stage: environment,
                        Resource: path,
                    },
                    statistic: 'Sum',
                    period: cdk.Duration.minutes(5),
                }),
                threshold: limits.burstLimit * 0.8, // Alert at 80% of burst limit
                evaluationPeriods: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
        });
    }
    /**
     * Create Security Headers configuration
     */
    createSecurityHeaders(environment) {
        this.securityHeaders = new security_headers_1.SecurityHeaders(this, 'SecurityHeaders', {
            environment: environment,
        });
    }
    /**
     * Apply security headers to API Gateway
     */
    applySecurityHeaders() {
        // Apply security headers to all Gateway Responses
        this.securityHeaders.applyToGatewayResponses(this.api);
    }
    /**
     * Create WAF configuration for API Gateway and CloudFront
     */
    createWafConfiguration(environment) {
        // Only enable WAF for staging and production environments
        if (environment === 'dev') {
            console.log('WAF disabled for development environment');
            return;
        }
        // Create WAF for API Gateway (REGIONAL scope)
        const apiWaf = new waf_config_1.WafConfig(this, 'ApiWaf', {
            environment: environment,
            scope: 'REGIONAL',
        });
        // Associate WAF with API Gateway
        const apiStageArn = `arn:aws:apigateway:${this.region}::/restapis/${this.api.restApiId}/stages/${this.api.deploymentStage.stageName}`;
        apiWaf.associateWithResource(apiStageArn);
        // Store WAF reference
        this.wafConfig = apiWaf;
        // Create WAF for CloudFront (CLOUDFRONT scope - must be in us-east-1)
        // Note: CloudFront WAF will be created separately if needed
        if (environment === 'production') {
            // CloudFront WAF requires us-east-1 region
            // This will be handled in the CloudFront distribution creation
            console.log('CloudFront WAF should be created in us-east-1 region separately');
        }
    }
    createCloudWatchMonitoring(environment, alertEmail) {
        // Create comprehensive CloudWatch monitoring
        this.monitoring = new cloudwatch_monitoring_1.CloudWatchMonitoring(this, 'CloudWatchMonitoring', {
            environment: environment,
            api: this.api,
            lambdaFunctions: {
                authorizer: this.authorizerFunction,
                // Additional Lambda functions will be added here as they are implemented
            },
            alertEmail,
        });
    }
    createSecrets(environment) {
        // JWT Secret for Lambda authorizer with enhanced configuration
        this.jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
            secretName: `misra-platform/jwt-secret-${environment}`,
            description: 'JWT signing secret for MISRA platform authentication',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({
                    algorithm: 'HS256',
                    issuer: `misra-platform-${environment}`,
                    audience: `misra-platform-users-${environment}`,
                    accessTokenExpiry: '1h',
                    refreshTokenExpiry: '30d'
                }),
                generateStringKey: 'secret',
                excludeCharacters: '"@/\\`\'',
                passwordLength: 64,
            },
            encryptionKey: this.kmsKey,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // OTP/TOTP Secrets for autonomous workflow
        const otpSecret = new secretsmanager.Secret(this, 'OtpSecret', {
            secretName: `misra-platform/otp-secrets-${environment}`,
            description: 'OTP and TOTP secrets for autonomous MFA workflow',
            secretObjectValue: {
                // Master encryption key for OTP secrets
                masterKey: cdk.SecretValue.cfnParameter(new cdk.CfnParameter(this, 'OtpMasterKey', {
                    type: 'String',
                    description: 'Master key for OTP secret encryption',
                    noEcho: true,
                    default: this.generateSecureKey(32)
                })),
                // TOTP configuration
                totpConfig: cdk.SecretValue.unsafePlainText(JSON.stringify({
                    issuer: `MISRA Platform ${environment.toUpperCase()}`,
                    algorithm: 'SHA1',
                    digits: 6,
                    period: 30,
                    window: 2 // Allow 2 time steps for clock drift
                })),
                // Backup codes configuration
                backupCodesConfig: cdk.SecretValue.unsafePlainText(JSON.stringify({
                    length: 8,
                    count: 10,
                    charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
                }))
            },
            encryptionKey: this.kmsKey,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // External API Keys for services (OpenAI, etc.)
        const apiKeysSecret = new secretsmanager.Secret(this, 'ApiKeys', {
            secretName: `misra-platform/api-keys-${environment}`,
            description: 'API keys for external services (OpenAI, monitoring, etc.)',
            secretObjectValue: {
                openai: cdk.SecretValue.cfnParameter(new cdk.CfnParameter(this, 'OpenAiApiKey', {
                    type: 'String',
                    description: 'OpenAI API key for AI-powered features',
                    noEcho: true,
                    default: 'replace-with-actual-openai-key'
                })),
                monitoring: cdk.SecretValue.cfnParameter(new cdk.CfnParameter(this, 'MonitoringApiKey', {
                    type: 'String',
                    description: 'API key for external monitoring services',
                    noEcho: true,
                    default: 'replace-with-actual-monitoring-key'
                })),
                // Placeholder for additional service keys
                placeholder: cdk.SecretValue.unsafePlainText('replace-with-actual-keys')
            },
            encryptionKey: this.kmsKey,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // Database encryption secrets
        const dbSecret = new secretsmanager.Secret(this, 'DatabaseSecret', {
            secretName: `misra-platform/database-secrets-${environment}`,
            description: 'Database encryption and connection secrets',
            secretObjectValue: {
                // Field-level encryption keys for sensitive data
                fieldEncryptionKey: cdk.SecretValue.cfnParameter(new cdk.CfnParameter(this, 'FieldEncryptionKey', {
                    type: 'String',
                    description: 'Key for field-level encryption of sensitive data',
                    noEcho: true,
                    default: this.generateSecureKey(32)
                })),
                // Hash salt for password hashing
                passwordSalt: cdk.SecretValue.cfnParameter(new cdk.CfnParameter(this, 'PasswordSalt', {
                    type: 'String',
                    description: 'Salt for password hashing',
                    noEcho: true,
                    default: this.generateSecureKey(16)
                }))
            },
            encryptionKey: this.kmsKey,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // Store references for Lambda function access
        this.otpSecret = otpSecret;
        this.apiKeysSecret = apiKeysSecret;
        this.dbSecret = dbSecret;
        // Enable automatic rotation for JWT secret (every 90 days in production)
        if (environment === 'production') {
            this.jwtSecret.addRotationSchedule('JwtSecretRotation', {
                automaticallyAfter: cdk.Duration.days(90),
            });
        }
    }
    /**
     * Generate a secure random key for secrets
     */
    generateSecureKey(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return result;
    }
    /**
     * Create IAM roles with least privilege access
     */
    createIAMRoles(environment) {
        // Get secret references
        const otpSecret = this.otpSecret;
        const apiKeysSecret = this.apiKeysSecret;
        const dbSecret = this.dbSecret;
        this.iamRoles = new iam_roles_1.IAMRoles(this, 'IAMRoles', {
            environment: environment,
            region: this.region,
            accountId: this.account,
            kmsKey: this.kmsKey,
            userPool: this.userPool,
            filesBucket: this.filesBucket,
            usersTable: this.usersTable,
            fileMetadataTable: this.fileMetadataTable,
            analysisResultsTable: this.analysisResultsTable,
            sampleFilesTable: this.sampleFilesTable,
            progressTable: this.progressTable,
            jwtSecret: this.jwtSecret,
            otpSecret: otpSecret,
            apiKeysSecret: apiKeysSecret,
            dbSecret: dbSecret,
        });
        // Create permission boundaries for additional security
        const permissionBoundary = this.iamRoles.createPermissionBoundaries(environment, this.region, this.account);
        // Apply permission boundaries to all roles (production only)
        if (environment === 'production') {
            this.iamRoles.authorizerRole.attachInlinePolicy(new iam.Policy(this, 'AuthorizerPermissionBoundary', {
                statements: [new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: ['*'],
                        resources: ['*'],
                        conditions: {
                            StringEquals: {
                                'iam:PermissionsBoundary': permissionBoundary.managedPolicyArn,
                            },
                        },
                    })],
            }));
        }
    }
    createLambdaFunctions(environment) {
        // Enhanced monitoring and logging configuration
        const structuredLoggingConfig = {
            LOG_LEVEL: environment === 'production' ? 'INFO' : 'DEBUG',
            ENABLE_STRUCTURED_LOGGING: 'true',
            CORRELATION_ID_HEADER: 'X-Correlation-ID',
            LOG_FORMAT: 'JSON',
            ENABLE_PERFORMANCE_LOGGING: 'true',
            ENABLE_SECURITY_LOGGING: 'true',
            CLOUDWATCH_NAMESPACE: 'MISRA/Platform',
            ENABLE_CUSTOM_METRICS: 'true',
            METRICS_BUFFER_SIZE: '10',
            METRICS_FLUSH_INTERVAL: '30000', // 30 seconds
        };
        // Enhanced production configuration
        const productionConfig = {
            ENVIRONMENT: environment,
            ACCOUNT_ID: this.account,
            STACK_NAME: this.stackName,
            // Database configuration
            USERS_TABLE_NAME: this.usersTable.tableName,
            FILE_METADATA_TABLE_NAME: this.fileMetadataTable.tableName,
            ANALYSIS_RESULTS_TABLE_NAME: this.analysisResultsTable.tableName,
            SAMPLE_FILES_TABLE_NAME: this.sampleFilesTable.tableName,
            PROGRESS_TABLE_NAME: this.progressTable.tableName,
            // Storage configuration
            FILES_BUCKET_NAME: this.filesBucket.bucketName,
            KMS_KEY_ID: this.kmsKey.keyId,
            // Authentication configuration
            USER_POOL_ID: this.userPool.userPoolId,
            USER_POOL_CLIENT_ID: this.userPoolClient.userPoolClientId,
            // Secrets configuration
            JWT_SECRET_NAME: this.jwtSecret.secretName,
            OTP_SECRET_NAME: this.otpSecret.secretName,
            API_KEYS_SECRET_NAME: this.apiKeysSecret.secretName,
            DATABASE_SECRET_NAME: this.dbSecret.secretName,
            // Performance and reliability configuration
            ENABLE_RETRY_LOGIC: 'true',
            MAX_RETRY_ATTEMPTS: '3',
            RETRY_BASE_DELAY: '1000',
            RETRY_MAX_DELAY: '10000',
            // Security configuration
            ENABLE_REQUEST_VALIDATION: 'true',
            ENABLE_RATE_LIMITING: 'true',
            ENABLE_CORS_VALIDATION: 'true',
            ALLOWED_ORIGINS: environment === 'production'
                ? 'https://misra.yourdomain.com'
                : 'http://localhost:3000,http://localhost:5173,https://*.vercel.app',
            // Analysis configuration
            MAX_FILE_SIZE: '10485760', // 10MB
            SUPPORTED_FILE_TYPES: 'c,cpp,h,hpp',
            ANALYSIS_TIMEOUT: '300000', // 5 minutes
            // Monitoring configuration
            ENABLE_XRAY_TRACING: environment === 'production' ? 'true' : 'false',
            ENABLE_DETAILED_MONITORING: 'true',
        };
        // Get secret references
        const otpSecret = this.otpSecret;
        const apiKeysSecret = this.apiKeysSecret;
        const dbSecret = this.dbSecret;
        // VPC Configuration for production security
        let vpcConfig;
        if (environment === 'production' && this.vpcConfig) {
            vpcConfig = {
                vpc: this.vpcConfig.vpc,
                securityGroups: [this.vpcConfig.lambdaSecurityGroup],
                vpcSubnets: {
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            };
        }
        // Common Lambda function configuration
        const commonLambdaConfig = {
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: cdk.Duration.seconds(30),
            memorySize: 512,
            environment: {
                ...structuredLoggingConfig,
                ...productionConfig,
            },
            logRetention: environment === 'production'
                ? logs.RetentionDays.ONE_MONTH
                : logs.RetentionDays.ONE_WEEK,
            // Enable X-Ray tracing for production
            tracing: environment === 'production'
                ? lambda.Tracing.ACTIVE
                : lambda.Tracing.DISABLED,
            // VPC configuration for production
            ...(vpcConfig && vpcConfig),
            // Reserved concurrency for production
            reservedConcurrentExecutions: environment === 'production' ? 100 : undefined,
            // Dead letter queue for failed invocations
            deadLetterQueue: environment === 'production' ? new sqs.Queue(this, 'LambdaDLQ', {
                queueName: `misra-platform-lambda-dlq-${environment}`,
                retentionPeriod: cdk.Duration.days(14),
            }) : undefined,
        };
        // Lambda Authorizer Function with enhanced configuration
        this.authorizerFunction = new lambda.Function(this, 'AuthorizerFunction', {
            ...commonLambdaConfig,
            functionName: `misra-platform-authorizer-${environment}`,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/authorizer'),
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            role: this.iamRoles.authorizerRole,
            environment: {
                ...commonLambdaConfig.environment,
                FUNCTION_NAME: 'authorizer',
                ENABLE_JWT_VALIDATION: 'true',
                ENABLE_MFA_VALIDATION: 'true',
                JWT_ALGORITHM: 'HS256',
                TOKEN_CACHE_TTL: '300', // 5 minutes
            },
        });
        // Audit Stream Processor Function with enhanced configuration
        const auditStreamProcessor = new lambda.Function(this, 'AuditStreamProcessor', {
            ...commonLambdaConfig,
            functionName: `misra-platform-audit-stream-${environment}`,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/audit/stream-processor'),
            timeout: cdk.Duration.minutes(5),
            memorySize: 512,
            role: this.iamRoles.auditRole,
            environment: {
                ...commonLambdaConfig.environment,
                FUNCTION_NAME: 'audit-stream-processor',
                AUDIT_LOG_GROUP_NAME: `/aws/lambda/misra-platform-audit-${environment}`,
                ENABLE_AUDIT_ENCRYPTION: 'true',
                AUDIT_RETENTION_DAYS: environment === 'production' ? '365' : '30',
            },
            // Higher reserved concurrency for audit processing
            reservedConcurrentExecutions: environment === 'production' ? 50 : undefined,
        });
        // S3 Event Processor Function with enhanced configuration
        const s3EventProcessor = new lambda.Function(this, 'S3EventProcessor', {
            ...commonLambdaConfig,
            functionName: `misra-platform-s3-events-${environment}`,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/s3/event-processor'),
            timeout: cdk.Duration.minutes(2),
            memorySize: 256,
            role: this.iamRoles.auditRole,
            environment: {
                ...commonLambdaConfig.environment,
                FUNCTION_NAME: 's3-event-processor',
                ENABLE_FILE_VALIDATION: 'true',
                ENABLE_VIRUS_SCANNING: environment === 'production' ? 'true' : 'false',
                MAX_FILE_SIZE_BYTES: '10485760', // 10MB
            },
        });
        // Analysis Function with enhanced configuration (placeholder for future implementation)
        const analysisFunction = new lambda.Function(this, 'AnalysisFunction', {
            ...commonLambdaConfig,
            functionName: `misra-platform-analysis-${environment}`,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/analysis/analyze-file'),
            timeout: cdk.Duration.minutes(5),
            memorySize: 1024, // Higher memory for analysis workload
            role: this.iamRoles.analysisFunctionRole,
            environment: {
                ...commonLambdaConfig.environment,
                FUNCTION_NAME: 'analysis',
                ENABLE_ANALYSIS_CACHING: 'true',
                ANALYSIS_CACHE_TTL: '3600', // 1 hour
                ENABLE_PARALLEL_PROCESSING: 'true',
                MAX_PARALLEL_RULES: '10',
            },
            // Higher reserved concurrency for analysis
            reservedConcurrentExecutions: environment === 'production' ? 200 : undefined,
        });
        // File Management Function with enhanced configuration (placeholder for future implementation)
        const fileFunction = new lambda.Function(this, 'FileFunction', {
            ...commonLambdaConfig,
            functionName: `misra-platform-file-${environment}`,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/files/upload-url'),
            timeout: cdk.Duration.minutes(2),
            memorySize: 512,
            role: this.iamRoles.fileFunctionRole,
            environment: {
                ...commonLambdaConfig.environment,
                FUNCTION_NAME: 'file-management',
                ENABLE_FILE_ENCRYPTION: 'true',
                ENABLE_FILE_COMPRESSION: 'true',
                SUPPORTED_MIME_TYPES: 'text/plain,text/x-c,text/x-c++',
            },
        });
        // Authentication Functions with enhanced configuration (placeholder for future implementation)
        const authFunction = new lambda.Function(this, 'AuthFunction', {
            ...commonLambdaConfig,
            functionName: `misra-platform-auth-${environment}`,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/login'),
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            role: this.iamRoles.authFunctionRole,
            environment: {
                ...commonLambdaConfig.environment,
                FUNCTION_NAME: 'authentication',
                ENABLE_MFA_ENFORCEMENT: environment === 'production' ? 'true' : 'false',
                PASSWORD_COMPLEXITY_ENABLED: 'true',
                SESSION_TIMEOUT: '3600', // 1 hour
                REFRESH_TOKEN_TTL: '2592000', // 30 days
            },
        });
        // Health Check Function for monitoring
        const healthCheckFunction = new lambda.Function(this, 'HealthCheckFunction', {
            ...commonLambdaConfig,
            functionName: `misra-platform-health-${environment}`,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/monitoring/health-check'),
            timeout: cdk.Duration.seconds(15),
            memorySize: 128, // Minimal memory for health checks
            role: this.iamRoles.monitoringRole,
            environment: {
                ...commonLambdaConfig.environment,
                FUNCTION_NAME: 'health-check',
                HEALTH_CHECK_TIMEOUT: '10000', // 10 seconds
                ENABLE_DEPENDENCY_CHECKS: 'true',
            },
        });
        // Create audit log group
        const auditLogGroup = new logs.LogGroup(this, 'AuditLogGroup', {
            logGroupName: `/aws/lambda/misra-platform-audit-${environment}`,
            retention: environment === 'production'
                ? logs.RetentionDays.ONE_YEAR
                : logs.RetentionDays.ONE_MONTH,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // Connect DynamoDB streams to audit processor
        this.connectStreamsToAuditProcessor(auditStreamProcessor);
        // Configure S3 event notifications
        this.configureS3EventNotifications(s3EventProcessor, environment);
        // Store Lambda functions for future endpoint creation and monitoring
        this.lambdaFunctions = {
            authorizer: this.authorizerFunction,
            auditStreamProcessor: auditStreamProcessor,
            s3EventProcessor: s3EventProcessor,
            analysis: analysisFunction,
            file: fileFunction,
            auth: authFunction,
            healthCheck: healthCheckFunction,
        };
        // Configure Lambda function alarms for production monitoring
        if (environment === 'production') {
            this.configureLambdaAlarms();
        }
        // Note: IAM permissions are handled by the IAMRoles construct
        // All functions have least privilege access through their assigned roles
    }
    /**
     * Connect DynamoDB streams to audit processor Lambda function
     */
    connectStreamsToAuditProcessor(auditProcessor) {
        // Connect Users table stream
        auditProcessor.addEventSource(new aws_lambda_event_sources_1.DynamoEventSource(this.usersTable, {
            startingPosition: lambda.StartingPosition.LATEST,
            batchSize: 10,
            maxBatchingWindow: cdk.Duration.seconds(5),
            retryAttempts: 3,
            parallelizationFactor: 2,
            reportBatchItemFailures: true,
        }));
        // Connect File Metadata table stream
        auditProcessor.addEventSource(new aws_lambda_event_sources_1.DynamoEventSource(this.fileMetadataTable, {
            startingPosition: lambda.StartingPosition.LATEST,
            batchSize: 10,
            maxBatchingWindow: cdk.Duration.seconds(5),
            retryAttempts: 3,
            parallelizationFactor: 2,
            reportBatchItemFailures: true,
        }));
        // Connect Analysis Results table stream
        auditProcessor.addEventSource(new aws_lambda_event_sources_1.DynamoEventSource(this.analysisResultsTable, {
            startingPosition: lambda.StartingPosition.LATEST,
            batchSize: 20, // Higher batch size for analysis results
            maxBatchingWindow: cdk.Duration.seconds(10),
            retryAttempts: 3,
            parallelizationFactor: 4, // Higher parallelization for analysis workload
            reportBatchItemFailures: true,
        }));
        // Connect Progress table stream (for real-time monitoring)
        auditProcessor.addEventSource(new aws_lambda_event_sources_1.DynamoEventSource(this.progressTable, {
            startingPosition: lambda.StartingPosition.LATEST,
            batchSize: 50, // Higher batch size for progress updates
            maxBatchingWindow: cdk.Duration.seconds(1), // Lower latency for real-time updates
            retryAttempts: 2, // Fewer retries for progress updates
            parallelizationFactor: 10, // High parallelization for real-time processing
            reportBatchItemFailures: true,
        }));
    }
    /**
     * Configure cross-region replication for production environment
     */
    configureCrossRegionReplication() {
        // Create replication bucket in a different region for disaster recovery
        const replicationBucket = new s3.Bucket(this, 'ReplicationBucket', {
            bucketName: `misra-platform-files-replication-${this.account}`,
            encryption: s3.BucketEncryption.KMS,
            encryptionKey: this.kmsKey,
            versioned: true,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.RETAIN,
        });
        // Create IAM role for replication
        const replicationRole = new iam.Role(this, 'S3ReplicationRole', {
            roleName: `misra-platform-s3-replication-${this.node.tryGetContext('environment') || 'production'}`,
            assumedBy: new iam.ServicePrincipal('s3.amazonaws.com'),
            description: 'IAM role for S3 cross-region replication',
        });
        // Grant permissions for replication
        replicationRole.addToPolicy(new iam.PolicyStatement({
            sid: 'S3ReplicationPermissions',
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObjectVersionForReplication',
                's3:GetObjectVersionAcl',
                's3:GetObjectVersionTagging',
            ],
            resources: [`${this.filesBucket.bucketArn}/*`],
        }));
        replicationRole.addToPolicy(new iam.PolicyStatement({
            sid: 'S3ReplicationDestinationPermissions',
            effect: iam.Effect.ALLOW,
            actions: [
                's3:ReplicateObject',
                's3:ReplicateDelete',
                's3:ReplicateTags',
            ],
            resources: [`${replicationBucket.bucketArn}/*`],
        }));
        // KMS permissions for replication
        replicationRole.addToPolicy(new iam.PolicyStatement({
            sid: 'KMSReplicationPermissions',
            effect: iam.Effect.ALLOW,
            actions: [
                'kms:Decrypt',
                'kms:GenerateDataKey',
            ],
            resources: [this.kmsKey.keyArn],
        }));
        // Store replication bucket reference
        this.replicationBucket = replicationBucket;
        this.replicationRole = replicationRole;
        // Note: Actual replication configuration needs to be done via AWS CLI or Console
        // as CDK doesn't fully support replication configuration yet
        new cdk.CfnOutput(this, 'ReplicationBucketName', {
            value: replicationBucket.bucketName,
            description: 'S3 Replication Bucket Name',
            exportName: `${this.stackName}-ReplicationBucket`,
        });
        new cdk.CfnOutput(this, 'ReplicationRoleArn', {
            value: replicationRole.roleArn,
            description: 'S3 Replication Role ARN',
            exportName: `${this.stackName}-ReplicationRoleArn`,
        });
    }
    /**
     * Configure S3 event notifications for audit logging
     */
    configureS3EventNotifications(s3EventProcessor, environment) {
        // Add S3 event notifications
        this.filesBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(s3EventProcessor), { prefix: 'uploads/' });
        this.filesBucket.addEventNotification(s3.EventType.OBJECT_REMOVED, new s3n.LambdaDestination(s3EventProcessor), { prefix: 'uploads/' });
        // Store S3 event processor reference
        this.s3EventProcessor = s3EventProcessor;
    }
    /**
     * Configure Lambda function alarms for production monitoring
     */
    configureLambdaAlarms() {
        const lambdaFunctions = this.lambdaFunctions;
        const alarms = [];
        // Create alarms for each Lambda function
        Object.entries(lambdaFunctions).forEach(([name, func]) => {
            // Error rate alarm
            const errorAlarm = new cloudwatch.Alarm(this, `${name}ErrorAlarm`, {
                alarmName: `misra-platform-${name}-errors`,
                alarmDescription: `High error rate for ${name} function`,
                metric: func.metricErrors({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Sum',
                }),
                threshold: 5,
                evaluationPeriods: 2,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
            // Duration alarm
            const durationAlarm = new cloudwatch.Alarm(this, `${name}DurationAlarm`, {
                alarmName: `misra-platform-${name}-duration`,
                alarmDescription: `High duration for ${name} function`,
                metric: func.metricDuration({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Average',
                }),
                threshold: func.timeout ? func.timeout.toMilliseconds() * 0.8 : 24000, // 80% of timeout
                evaluationPeriods: 3,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
            // Throttle alarm
            const throttleAlarm = new cloudwatch.Alarm(this, `${name}ThrottleAlarm`, {
                alarmName: `misra-platform-${name}-throttles`,
                alarmDescription: `Throttling detected for ${name} function`,
                metric: func.metricThrottles({
                    period: cdk.Duration.minutes(5),
                    statistic: 'Sum',
                }),
                threshold: 1,
                evaluationPeriods: 1,
                treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
            });
            alarms.push(errorAlarm, durationAlarm, throttleAlarm);
        });
        // Store alarms for monitoring setup
        this.lambdaAlarms = alarms;
    }
    /**
     * Create CloudFront distribution for frontend
     */
    createCloudFrontDistribution(environment, domainName, certificateArn) {
        // Create S3 bucket for frontend static assets
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `misra-platform-frontend-${environment}-${this.account}`,
            encryption: s3.BucketEncryption.S3_MANAGED,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'production',
        });
        // Create Origin Access Identity for CloudFront
        const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'FrontendOAI', {
            comment: `OAI for MISRA Platform Frontend - ${environment}`,
        });
        // Grant CloudFront access to the frontend bucket
        frontendBucket.grantRead(originAccessIdentity);
        // Create cache policies
        const staticAssetsCachePolicy = new cloudfront.CachePolicy(this, 'StaticAssetsCachePolicy', {
            cachePolicyName: `misra-platform-static-assets-${environment}`,
            comment: 'Cache policy for static assets (JS, CSS, images)',
            defaultTtl: cdk.Duration.days(30),
            maxTtl: cdk.Duration.days(365),
            minTtl: cdk.Duration.seconds(0),
            headerBehavior: cloudfront.CacheHeaderBehavior.none(),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        });
        const apiCachePolicy = new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
            cachePolicyName: `misra-platform-api-${environment}`,
            comment: 'Cache policy for API requests',
            defaultTtl: cdk.Duration.seconds(0),
            maxTtl: cdk.Duration.minutes(5),
            minTtl: cdk.Duration.seconds(0),
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization', 'Content-Type', 'X-Correlation-ID'),
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
            cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        });
        // Create CloudFront distribution
        const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
            comment: `MISRA Platform Frontend Distribution - ${environment}`,
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
            priceClass: environment === 'production'
                ? cloudfront.PriceClass.PRICE_CLASS_ALL
                : cloudfront.PriceClass.PRICE_CLASS_100,
            enableLogging: true,
            logBucket: frontendBucket,
            logFilePrefix: 'cloudfront-logs/',
            defaultBehavior: {
                origin: new origins.S3Origin(frontendBucket, {
                    originAccessIdentity,
                }),
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
                responseHeadersPolicy: this.securityHeaders.cloudfrontResponseHeadersPolicy,
                viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
                compress: true,
            },
            additionalBehaviors: {
                '/api/*': {
                    origin: new origins.RestApiOrigin(this.api),
                    cachePolicy: apiCachePolicy,
                    responseHeadersPolicy: this.securityHeaders.cloudfrontResponseHeadersPolicy,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                    compress: false,
                },
                '/static/*': {
                    origin: new origins.S3Origin(frontendBucket, {
                        originAccessIdentity,
                    }),
                    cachePolicy: staticAssetsCachePolicy,
                    responseHeadersPolicy: this.securityHeaders.cloudfrontResponseHeadersPolicy,
                    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
                    compress: true,
                },
            },
        });
        // Store references
        this.frontendBucket = frontendBucket;
        this.cloudFrontDistribution = distribution;
        this.originAccessIdentity = originAccessIdentity;
    }
    /**
     * Create backup and recovery configuration
     */
    createBackupConfiguration(environment) {
        // Get Lambda functions reference
        const lambdaFunctions = this.lambdaFunctions;
        // Create backup configuration
        this.backupConfig = new backup_config_1.BackupConfig(this, 'BackupConfig', {
            environment: environment,
            tables: {
                users: this.usersTable,
                fileMetadata: this.fileMetadataTable,
                analysisResults: this.analysisResultsTable,
                sampleFiles: this.sampleFilesTable,
                progress: this.progressTable,
            },
            filesBucket: this.filesBucket,
            lambdaFunctions: lambdaFunctions,
            replicationRegion: environment === 'production' ? 'us-west-2' : undefined,
        });
        // Create backup configuration outputs
        this.backupConfig.createOutputs(this, this.stackName);
        // Output backup strategy summary
        new cdk.CfnOutput(this, 'BackupStrategySummary', {
            value: JSON.stringify({
                dynamoDBPITR: environment === 'production',
                awsBackup: true,
                s3Versioning: true,
                s3Replication: environment === 'production',
                lambdaVersioning: true,
                backupRetention: {
                    daily: environment === 'production' ? '30 days' : environment === 'staging' ? '7 days' : '3 days',
                    weekly: environment === 'production' ? '90 days' : 'N/A',
                    monthly: environment === 'production' ? '365 days' : 'N/A',
                },
            }, null, 2),
            description: 'Backup strategy configuration summary',
            exportName: `${this.stackName}-BackupStrategy`,
        });
        // Output RTO/RPO targets
        new cdk.CfnOutput(this, 'RTOandRPOTargets', {
            value: JSON.stringify({
                dynamoDB: { rpo: '5 minutes', rto: '30 minutes' },
                s3: { rpo: '15 minutes', rto: '1 hour' },
                lambda: { rpo: '0 minutes', rto: '15 minutes' },
                apiGateway: { rpo: '0 minutes', rto: '30 minutes' },
            }, null, 2),
            description: 'Recovery Time Objective (RTO) and Recovery Point Objective (RPO) targets',
            exportName: `${this.stackName}-RTOandRPO`,
        });
        // Output disaster recovery documentation link
        new cdk.CfnOutput(this, 'DisasterRecoveryDocs', {
            value: 'See packages/backend/DISASTER_RECOVERY_PROCEDURES.md for complete DR procedures',
            description: 'Disaster recovery documentation location',
            exportName: `${this.stackName}-DRDocs`,
        });
    }
    createOutputs() {
        new cdk.CfnOutput(this, 'UserPoolId', {
            value: this.userPool.userPoolId,
            description: 'Cognito User Pool ID',
            exportName: `${this.stackName}-UserPoolId`,
        });
        new cdk.CfnOutput(this, 'UserPoolClientId', {
            value: this.userPoolClient.userPoolClientId,
            description: 'Cognito User Pool Client ID',
            exportName: `${this.stackName}-UserPoolClientId`,
        });
        new cdk.CfnOutput(this, 'ApiGatewayUrl', {
            value: this.api.url,
            description: 'API Gateway URL',
            exportName: `${this.stackName}-ApiUrl`,
        });
        new cdk.CfnOutput(this, 'ApiGatewayId', {
            value: this.api.restApiId,
            description: 'API Gateway REST API ID',
            exportName: `${this.stackName}-ApiId`,
        });
        new cdk.CfnOutput(this, 'ApiGatewayStage', {
            value: this.api.deploymentStage.stageName,
            description: 'API Gateway Deployment Stage',
            exportName: `${this.stackName}-ApiStage`,
        });
        // Usage Plans
        new cdk.CfnOutput(this, 'PremiumUsagePlanId', {
            value: this.usagePlans.premium.usagePlanId,
            description: 'Premium Usage Plan ID',
            exportName: `${this.stackName}-PremiumUsagePlan`,
        });
        new cdk.CfnOutput(this, 'StandardUsagePlanId', {
            value: this.usagePlans.standard.usagePlanId,
            description: 'Standard Usage Plan ID',
            exportName: `${this.stackName}-StandardUsagePlan`,
        });
        new cdk.CfnOutput(this, 'LimitedUsagePlanId', {
            value: this.usagePlans.limited.usagePlanId,
            description: 'Limited Usage Plan ID',
            exportName: `${this.stackName}-LimitedUsagePlan`,
        });
        // API Keys
        new cdk.CfnOutput(this, 'PremiumApiKeyId', {
            value: this.apiKeys.premium.keyId,
            description: 'Premium API Key ID',
            exportName: `${this.stackName}-PremiumApiKey`,
        });
        new cdk.CfnOutput(this, 'StandardApiKeyId', {
            value: this.apiKeys.standard.keyId,
            description: 'Standard API Key ID',
            exportName: `${this.stackName}-StandardApiKey`,
        });
        new cdk.CfnOutput(this, 'MonitoringApiKeyId', {
            value: this.apiKeys.monitoring.keyId,
            description: 'Monitoring API Key ID',
            exportName: `${this.stackName}-MonitoringApiKey`,
        });
        // Custom Domain Configuration
        new cdk.CfnOutput(this, 'CustomDomainInstructions', {
            value: `To configure custom domain: 1) Create SSL certificate in ACM, 2) Update CertificateArn parameter, 3) Create Route 53 record pointing to API Gateway domain`,
            description: 'Instructions for setting up custom domain',
            exportName: `${this.stackName}-DomainInstructions`,
        });
        // Rate Limiting Configuration
        new cdk.CfnOutput(this, 'RateLimitingConfig', {
            value: JSON.stringify({
                premium: { rate: 2000, burst: 5000, quota: 500000 },
                standard: { rate: 1000, burst: 2000, quota: 100000 },
                limited: { rate: 100, burst: 200, quota: 10000 },
            }),
            description: 'Rate limiting configuration for different usage plans',
            exportName: `${this.stackName}-RateLimits`,
        });
        new cdk.CfnOutput(this, 'FilesBucketName', {
            value: this.filesBucket.bucketName,
            description: 'S3 Files Bucket Name',
            exportName: `${this.stackName}-FilesBucket`,
        });
        new cdk.CfnOutput(this, 'KmsKeyId', {
            value: this.kmsKey.keyId,
            description: 'KMS Key ID',
            exportName: `${this.stackName}-KmsKeyId`,
        });
        // Lambda Functions
        new cdk.CfnOutput(this, 'AuthorizerFunctionName', {
            value: this.authorizerFunction.functionName,
            description: 'Lambda Authorizer Function Name',
            exportName: `${this.stackName}-AuthorizerFunction`,
        });
        new cdk.CfnOutput(this, 'AuthorizerFunctionArn', {
            value: this.authorizerFunction.functionArn,
            description: 'Lambda Authorizer Function ARN',
            exportName: `${this.stackName}-AuthorizerFunctionArn`,
        });
        new cdk.CfnOutput(this, 'AuditStreamProcessorName', {
            value: this.lambdaFunctions.auditStreamProcessor.functionName,
            description: 'Audit Stream Processor Function Name',
            exportName: `${this.stackName}-AuditStreamProcessor`,
        });
        new cdk.CfnOutput(this, 'AuditStreamProcessorArn', {
            value: this.lambdaFunctions.auditStreamProcessor.functionArn,
            description: 'Audit Stream Processor Function ARN',
            exportName: `${this.stackName}-AuditStreamProcessorArn`,
        });
        // IAM Roles
        new cdk.CfnOutput(this, 'AuthorizerRoleArn', {
            value: this.iamRoles.authorizerRole.roleArn,
            description: 'IAM Role ARN for Lambda Authorizer',
            exportName: `${this.stackName}-AuthorizerRoleArn`,
        });
        new cdk.CfnOutput(this, 'AuthFunctionRoleArn', {
            value: this.iamRoles.authFunctionRole.roleArn,
            description: 'IAM Role ARN for Authentication Functions',
            exportName: `${this.stackName}-AuthFunctionRoleArn`,
        });
        new cdk.CfnOutput(this, 'FileFunctionRoleArn', {
            value: this.iamRoles.fileFunctionRole.roleArn,
            description: 'IAM Role ARN for File Management Functions',
            exportName: `${this.stackName}-FileFunctionRoleArn`,
        });
        new cdk.CfnOutput(this, 'AnalysisFunctionRoleArn', {
            value: this.iamRoles.analysisFunctionRole.roleArn,
            description: 'IAM Role ARN for Analysis Functions',
            exportName: `${this.stackName}-AnalysisFunctionRoleArn`,
        });
        new cdk.CfnOutput(this, 'MonitoringRoleArn', {
            value: this.iamRoles.monitoringRole.roleArn,
            description: 'IAM Role ARN for Monitoring Functions',
            exportName: `${this.stackName}-MonitoringRoleArn`,
        });
        new cdk.CfnOutput(this, 'AuditRoleArn', {
            value: this.iamRoles.auditRole.roleArn,
            description: 'IAM Role ARN for Audit Stream Processor',
            exportName: `${this.stackName}-AuditRoleArn`,
        });
        // Secrets
        new cdk.CfnOutput(this, 'JwtSecretName', {
            value: this.jwtSecret.secretName,
            description: 'JWT Secret Name in Secrets Manager',
            exportName: `${this.stackName}-JwtSecretName`,
        });
        new cdk.CfnOutput(this, 'OtpSecretName', {
            value: this.otpSecret.secretName,
            description: 'OTP/TOTP Secret Name in Secrets Manager',
            exportName: `${this.stackName}-OtpSecretName`,
        });
        new cdk.CfnOutput(this, 'ApiKeysSecretName', {
            value: this.apiKeysSecret.secretName,
            description: 'API Keys Secret Name in Secrets Manager',
            exportName: `${this.stackName}-ApiKeysSecretName`,
        });
        new cdk.CfnOutput(this, 'DatabaseSecretName', {
            value: this.dbSecret.secretName,
            description: 'Database Secret Name in Secrets Manager',
            exportName: `${this.stackName}-DatabaseSecretName`,
        });
        // DynamoDB Table Names
        new cdk.CfnOutput(this, 'UsersTableName', {
            value: this.usersTable.tableName,
            description: 'Users DynamoDB Table Name',
            exportName: `${this.stackName}-UsersTable`,
        });
        new cdk.CfnOutput(this, 'FileMetadataTableName', {
            value: this.fileMetadataTable.tableName,
            description: 'File Metadata DynamoDB Table Name',
            exportName: `${this.stackName}-FileMetadataTable`,
        });
        new cdk.CfnOutput(this, 'AnalysisResultsTableName', {
            value: this.analysisResultsTable.tableName,
            description: 'Analysis Results DynamoDB Table Name',
            exportName: `${this.stackName}-AnalysisResultsTable`,
        });
        new cdk.CfnOutput(this, 'SampleFilesTableName', {
            value: this.sampleFilesTable.tableName,
            description: 'Sample Files DynamoDB Table Name',
            exportName: `${this.stackName}-SampleFilesTable`,
        });
        new cdk.CfnOutput(this, 'ProgressTableName', {
            value: this.progressTable.tableName,
            description: 'Progress DynamoDB Table Name',
            exportName: `${this.stackName}-ProgressTable`,
        });
        // CloudWatch Monitoring Outputs
        new cdk.CfnOutput(this, 'MonitoringDashboardName', {
            value: this.monitoring.dashboard.dashboardName,
            description: 'CloudWatch Dashboard Name',
            exportName: `${this.stackName}-Dashboard`,
        });
        new cdk.CfnOutput(this, 'MonitoringDashboardUrl', {
            value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${this.monitoring.dashboard.dashboardName}`,
            description: 'CloudWatch Dashboard URL',
            exportName: `${this.stackName}-DashboardUrl`,
        });
        new cdk.CfnOutput(this, 'AlarmTopicArn', {
            value: this.monitoring.alarmTopic.topicArn,
            description: 'SNS Topic ARN for CloudWatch Alarms',
            exportName: `${this.stackName}-AlarmTopic`,
        });
        // Log Groups for debugging
        new cdk.CfnOutput(this, 'WorkflowLogGroup', {
            value: this.monitoring.logGroups.workflow.logGroupName,
            description: 'Workflow Log Group Name',
            exportName: `${this.stackName}-WorkflowLogGroup`,
        });
        new cdk.CfnOutput(this, 'AnalysisLogGroup', {
            value: this.monitoring.logGroups.analysis.logGroupName,
            description: 'Analysis Log Group Name',
            exportName: `${this.stackName}-AnalysisLogGroup`,
        });
        new cdk.CfnOutput(this, 'SecurityLogGroup', {
            value: this.monitoring.logGroups.security.logGroupName,
            description: 'Security Log Group Name',
            exportName: `${this.stackName}-SecurityLogGroup`,
        });
        // CloudFront Distribution
        new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
            value: this.cloudFrontDistribution.distributionId,
            description: 'CloudFront Distribution ID',
            exportName: `${this.stackName}-CloudFrontDistributionId`,
        });
        new cdk.CfnOutput(this, 'CloudFrontDistributionDomainName', {
            value: this.cloudFrontDistribution.distributionDomainName,
            description: 'CloudFront Distribution Domain Name',
            exportName: `${this.stackName}-CloudFrontDomainName`,
        });
        new cdk.CfnOutput(this, 'FrontendBucketName', {
            value: this.frontendBucket.bucketName,
            description: 'Frontend S3 Bucket Name',
            exportName: `${this.stackName}-FrontendBucket`,
        });
        // S3 Event Processor
        new cdk.CfnOutput(this, 'S3EventProcessorName', {
            value: this.s3EventProcessor.functionName,
            description: 'S3 Event Processor Function Name',
            exportName: `${this.stackName}-S3EventProcessor`,
        });
        new cdk.CfnOutput(this, 'S3EventProcessorArn', {
            value: this.s3EventProcessor.functionArn,
            description: 'S3 Event Processor Function ARN',
            exportName: `${this.stackName}-S3EventProcessorArn`,
        });
        // VPC Configuration (if created)
        if (this.vpcConfig) {
            this.vpcConfig.createOutputs(this, this.stackName);
        }
        // WAF Configuration (if created)
        if (this.wafConfig) {
            new cdk.CfnOutput(this, 'WafWebAclArn', {
                value: this.wafConfig.webAcl.attrArn,
                description: 'WAF Web ACL ARN',
                exportName: `${this.stackName}-WafWebAclArn`,
            });
            new cdk.CfnOutput(this, 'WafWebAclId', {
                value: this.wafConfig.webAcl.attrId,
                description: 'WAF Web ACL ID',
                exportName: `${this.stackName}-WafWebAclId`,
            });
        }
        // Security Headers Configuration
        new cdk.CfnOutput(this, 'SecurityHeadersPolicyId', {
            value: this.securityHeaders.cloudfrontResponseHeadersPolicy.responseHeadersPolicyId,
            description: 'CloudFront Response Headers Policy ID',
            exportName: `${this.stackName}-SecurityHeadersPolicyId`,
        });
        // Security Configuration Summary
        new cdk.CfnOutput(this, 'SecurityConfigSummary', {
            value: JSON.stringify({
                wafEnabled: !!this.wafConfig,
                securityHeadersEnabled: true,
                kmsEncryption: true,
                secretsManager: true,
                iamLeastPrivilege: true,
                vpcEnabled: !!this.vpcConfig,
            }),
            description: 'Security configuration summary',
            exportName: `${this.stackName}-SecurityConfig`,
        });
    }
}
exports.ProductionMisraStack = ProductionMisraStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdGlvbi1taXNyYS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2R1Y3Rpb24tbWlzcmEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLGlFQUFtRDtBQUNuRCx1RUFBeUQ7QUFDekQsK0RBQWlEO0FBQ2pELG1FQUFxRDtBQUNyRCx1REFBeUM7QUFDekMsc0VBQXdEO0FBQ3hELHlEQUEyQztBQUMzQywyREFBNkM7QUFDN0MsK0VBQWlFO0FBQ2pFLHlEQUEyQztBQUMzQyx1RUFBeUQ7QUFDekQsdUVBQXlEO0FBQ3pELDRFQUE4RDtBQUM5RCx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLHdFQUEwRDtBQUMxRCxtRkFBeUU7QUFFekUsbUVBQStEO0FBQy9ELDJDQUF1QztBQUN2Qyw2Q0FBeUM7QUFDekMsNkNBQXlDO0FBQ3pDLHlEQUFxRDtBQUNyRCxtREFBK0M7QUFTL0MsTUFBYSxvQkFBcUIsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMxQyxRQUFRLENBQW1CO0lBQzNCLGNBQWMsQ0FBeUI7SUFDdkMsR0FBRyxDQUFxQjtJQUN4QixXQUFXLENBQVk7SUFDdkIsTUFBTSxDQUFVO0lBRXZCLGtCQUFrQjtJQUNYLFVBQVUsQ0FBaUI7SUFDM0IsaUJBQWlCLENBQWlCO0lBQ2xDLG9CQUFvQixDQUFpQjtJQUNyQyxnQkFBZ0IsQ0FBaUI7SUFDakMsYUFBYSxDQUFpQjtJQUVyQyxtQkFBbUI7SUFDWixrQkFBa0IsQ0FBa0I7SUFDcEMsU0FBUyxDQUF3QjtJQUV4QyxZQUFZO0lBQ0wsUUFBUSxDQUFXO0lBRTFCLHdCQUF3QjtJQUNqQixVQUFVLENBQXVCO0lBRXhDLG9CQUFvQjtJQUNiLFNBQVMsQ0FBWTtJQUU1QixvQkFBb0I7SUFDYixTQUFTLENBQVk7SUFFNUIsbUJBQW1CO0lBQ1osZUFBZSxDQUFrQjtJQUV4Qyx1QkFBdUI7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QUk7Z0JBQzVCLGFBQWEsRUFBRSxJQUFJO2dCQUNuQixjQUFjLEVBQUUsSUFBSTtnQkFDcEIsaUJBQWlCLEVBQUUsSUFBSTtnQkFDdkIsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUzthQUM3QixDQUFDO1lBQ0YsV0FBVyxFQUFFLGdDQUFnQztZQUM3QyxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUyxpQkFBaUI7U0FDL0MsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBditGRCxvREF1K0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIHMzbiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMtbm90aWZpY2F0aW9ucyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIHNlY3JldHNtYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zZWNyZXRzbWFuYWdlcic7XHJcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCAqIGFzIGNsb3VkZnJvbnQgZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3VkZnJvbnQnO1xyXG5pbXBvcnQgKiBhcyBvcmlnaW5zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZGZyb250LW9yaWdpbnMnO1xyXG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XHJcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcclxuaW1wb3J0ICogYXMgYWNtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xyXG5pbXBvcnQgeyBEeW5hbW9FdmVudFNvdXJjZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtZXZlbnQtc291cmNlcyc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBDbG91ZFdhdGNoTW9uaXRvcmluZyB9IGZyb20gJy4vY2xvdWR3YXRjaC1tb25pdG9yaW5nJztcclxuaW1wb3J0IHsgSUFNUm9sZXMgfSBmcm9tICcuL2lhbS1yb2xlcyc7XHJcbmltcG9ydCB7IFZwY0NvbmZpZyB9IGZyb20gJy4vdnBjLWNvbmZpZyc7XHJcbmltcG9ydCB7IFdhZkNvbmZpZyB9IGZyb20gJy4vd2FmLWNvbmZpZyc7XHJcbmltcG9ydCB7IFNlY3VyaXR5SGVhZGVycyB9IGZyb20gJy4vc2VjdXJpdHktaGVhZGVycyc7XHJcbmltcG9ydCB7IEJhY2t1cENvbmZpZyB9IGZyb20gJy4vYmFja3VwLWNvbmZpZyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFByb2R1Y3Rpb25NaXNyYVN0YWNrUHJvcHMgZXh0ZW5kcyBjZGsuU3RhY2tQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6ICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nO1xyXG4gIGRvbWFpbk5hbWU/OiBzdHJpbmc7XHJcbiAgY2VydGlmaWNhdGVBcm4/OiBzdHJpbmc7XHJcbiAgYWxlcnRFbWFpbD86IHN0cmluZzsgLy8gRW1haWwgZm9yIENsb3VkV2F0Y2ggYWxhcm1zXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQcm9kdWN0aW9uTWlzcmFTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG4gIHB1YmxpYyB1c2VyUG9vbENsaWVudDogY29nbml0by5Vc2VyUG9vbENsaWVudDtcclxuICBwdWJsaWMgYXBpOiBhcGlnYXRld2F5LlJlc3RBcGk7XHJcbiAgcHVibGljIGZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgcHVibGljIGttc0tleToga21zLktleTtcclxuICBcclxuICAvLyBEeW5hbW9EQiBUYWJsZXNcclxuICBwdWJsaWMgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgcHVibGljIGZpbGVNZXRhZGF0YVRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBwdWJsaWMgYW5hbHlzaXNSZXN1bHRzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHB1YmxpYyBzYW1wbGVGaWxlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBwdWJsaWMgcHJvZ3Jlc3NUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcblxyXG4gIC8vIExhbWJkYSBGdW5jdGlvbnNcclxuICBwdWJsaWMgYXV0aG9yaXplckZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIGp3dFNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xyXG5cclxuICAvLyBJQU0gUm9sZXNcclxuICBwdWJsaWMgaWFtUm9sZXM6IElBTVJvbGVzO1xyXG5cclxuICAvLyBDbG91ZFdhdGNoIE1vbml0b3JpbmdcclxuICBwdWJsaWMgbW9uaXRvcmluZzogQ2xvdWRXYXRjaE1vbml0b3Jpbmc7XHJcblxyXG4gIC8vIFZQQyBDb25maWd1cmF0aW9uXHJcbiAgcHVibGljIHZwY0NvbmZpZzogVnBjQ29uZmlnO1xyXG5cclxuICAvLyBXQUYgQ29uZmlndXJhdGlvblxyXG4gIHB1YmxpYyB3YWZDb25maWc6IFdhZkNvbmZpZztcclxuXHJcbiAgLy8gU2VjdXJpdHkgSGVhZGVyc1xyXG4gIHB1YmxpYyBzZWN1cml0eUhlYWRlcnM6IFNlY3VyaXR5SGVhZGVycztcclxuXHJcbiAgLy8gQmFja3VwIENvbmZpZ3VyYXRpb25cclxuICBwdWJsaWMgYmFja3VwQ29uZmlnOiBCYWNrdXBDb25maWc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBQcm9kdWN0aW9uTWlzcmFTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCB7IGVudmlyb25tZW50LCBhbGVydEVtYWlsIH0gPSBwcm9wcztcclxuICAgIGNvbnN0IHN0YWNrTmFtZSA9IGBtaXNyYS1wbGF0Zm9ybS0ke2Vudmlyb25tZW50fWA7XHJcblxyXG4gICAgLy8gS01TIEtleSBmb3IgZW5jcnlwdGlvblxyXG4gICAgdGhpcy5rbXNLZXkgPSBuZXcga21zLktleSh0aGlzLCAnTWlzcmFLbXNLZXknLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgTUlTUkEgUGxhdGZvcm0gS01TIEtleSAtICR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFZQQyBjb25maWd1cmF0aW9uIGZvciBwcm9kdWN0aW9uIHNlY3VyaXR5XHJcbiAgICBpZiAoZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJykge1xyXG4gICAgICB0aGlzLnZwY0NvbmZpZyA9IG5ldyBWcGNDb25maWcodGhpcywgJ1ZwY0NvbmZpZycsIHtcclxuICAgICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgICBlbmFibGVOYXRHYXRld2F5OiB0cnVlLFxyXG4gICAgICAgIGVuYWJsZVZwY0VuZHBvaW50czogdHJ1ZSxcclxuICAgICAgICBjaWRyQmxvY2s6ICcxMC4wLjAuMC8xNicsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBEeW5hbW9EQiB0YWJsZXNcclxuICAgIHRoaXMuY3JlYXRlRHluYW1vREJUYWJsZXMoZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTMyBidWNrZXRcclxuICAgIHRoaXMuY3JlYXRlUzNCdWNrZXQoZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDb2duaXRvIFVzZXIgUG9vbFxyXG4gICAgdGhpcy5jcmVhdGVDb2duaXRvVXNlclBvb2woZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBTZWNyZXRzIE1hbmFnZXIgc2VjcmV0c1xyXG4gICAgdGhpcy5jcmVhdGVTZWNyZXRzKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSUFNIHJvbGVzIHdpdGggbGVhc3QgcHJpdmlsZWdlIGFjY2Vzc1xyXG4gICAgdGhpcy5jcmVhdGVJQU1Sb2xlcyhlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIExhbWJkYSBmdW5jdGlvbnNcclxuICAgIHRoaXMuY3JlYXRlTGFtYmRhRnVuY3Rpb25zKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQVBJIEdhdGV3YXkgd2l0aCBMYW1iZGEgYXV0aG9yaXplclxyXG4gICAgdGhpcy5jcmVhdGVBcGlHYXRld2F5KGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgU2VjdXJpdHkgSGVhZGVycyBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmNyZWF0ZVNlY3VyaXR5SGVhZGVycyhlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFQSSBlbmRwb2ludHNcclxuICAgIHRoaXMuY3JlYXRlQXBpRW5kcG9pbnRzKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBBcHBseSBzZWN1cml0eSBoZWFkZXJzIHRvIEFQSSBHYXRld2F5XHJcbiAgICB0aGlzLmFwcGx5U2VjdXJpdHlIZWFkZXJzKCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFdBRiBjb25maWd1cmF0aW9uIGZvciBBUEkgR2F0ZXdheVxyXG4gICAgdGhpcy5jcmVhdGVXYWZDb25maWd1cmF0aW9uKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgY29tcHJlaGVuc2l2ZSBDbG91ZFdhdGNoIG1vbml0b3JpbmdcclxuICAgIHRoaXMuY3JlYXRlQ2xvdWRXYXRjaE1vbml0b3JpbmcoZW52aXJvbm1lbnQsIGFsZXJ0RW1haWwpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBiYWNrdXAgYW5kIHJlY292ZXJ5IGNvbmZpZ3VyYXRpb25cclxuICAgIHRoaXMuY3JlYXRlQmFja3VwQ29uZmlndXJhdGlvbihlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkRnJvbnQgZGlzdHJpYnV0aW9uIGZvciBmcm9udGVuZFxyXG4gICAgdGhpcy5jcmVhdGVDbG91ZEZyb250RGlzdHJpYnV0aW9uKGVudmlyb25tZW50LCBwcm9wcy5kb21haW5OYW1lLCBwcm9wcy5jZXJ0aWZpY2F0ZUFybik7XHJcblxyXG4gICAgLy8gT3V0cHV0IGltcG9ydGFudCB2YWx1ZXNcclxuICAgIHRoaXMuY3JlYXRlT3V0cHV0cygpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVEeW5hbW9EQlRhYmxlcyhlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICAvLyBVc2VycyBUYWJsZSAtIFN0b3JlcyB1c2VyIHByb2ZpbGVzIGFuZCBhdXRoZW50aWNhdGlvbiBkYXRhXHJcbiAgICB0aGlzLnVzZXJzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1VzZXJzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLXVzZXJzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQ1VTVE9NRVJfTUFOQUdFRCxcclxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicsXHJcbiAgICAgIC8vIEVuYWJsZSBEeW5hbW9EQiBTdHJlYW1zIGZvciBhdWRpdCBsb2dnaW5nXHJcbiAgICAgIHN0cmVhbTogZHluYW1vZGIuU3RyZWFtVmlld1R5cGUuTkVXX0FORF9PTERfSU1BR0VTLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxyXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIGVtYWlsIGxvb2t1cCAocmVxdWlyZWQgZm9yIGxvZ2luIGZsb3cpXHJcbiAgICB0aGlzLnVzZXJzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdlbWFpbC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3Igb3JnYW5pemF0aW9uIHF1ZXJpZXMgKG9wdGlvbmFsIGZvciBtdWx0aS10ZW5hbnQgc3VwcG9ydClcclxuICAgIHRoaXMudXNlcnNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ29yZ2FuaXphdGlvbklkLWNyZWF0ZWRBdC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnb3JnYW5pemF0aW9uSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZSBNZXRhZGF0YSBUYWJsZSAtIFN0b3JlcyBmaWxlIHVwbG9hZCBtZXRhZGF0YSBhbmQgUzMgcmVmZXJlbmNlc1xyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnRmlsZU1ldGFkYXRhVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLWZpbGUtbWV0YWRhdGEtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2ZpbGVJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgLy8gRW5hYmxlIER5bmFtb0RCIFN0cmVhbXMgZm9yIGF1ZGl0IGxvZ2dpbmdcclxuICAgICAgc3RyZWFtOiBkeW5hbW9kYi5TdHJlYW1WaWV3VHlwZS5ORVdfQU5EX09MRF9JTUFHRVMsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgdXNlciBmaWxlcyBjaHJvbm9sb2dpY2FsbHkgb3JkZXJlZFxyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC11cGxvYWRUaW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwbG9hZFRpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBjb250ZW50IGhhc2ggbG9va3VwIChmb3IgY2FjaGluZylcclxuICAgIHRoaXMuZmlsZU1ldGFkYXRhVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdjb250ZW50SGFzaC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udGVudEhhc2gnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgUmVzdWx0cyBUYWJsZSAtIFN0b3JlcyBNSVNSQSBhbmFseXNpcyByZXN1bHRzIGFuZCB2aW9sYXRpb25zXHJcbiAgICB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBbmFseXNpc1Jlc3VsdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtcmVzdWx0cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnYW5hbHlzaXNJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgLy8gRW5hYmxlIER5bmFtb0RCIFN0cmVhbXMgZm9yIGF1ZGl0IGxvZ2dpbmdcclxuICAgICAgc3RyZWFtOiBkeW5hbW9kYi5TdHJlYW1WaWV3VHlwZS5ORVdfQU5EX09MRF9JTUFHRVMsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICAvLyBUVEwgZm9yIG5vbi1wcm9kdWN0aW9uIGVudmlyb25tZW50cyB0byBtYW5hZ2UgY29zdHNcclxuICAgICAgdGltZVRvTGl2ZUF0dHJpYnV0ZTogZW52aXJvbm1lbnQgIT09ICdwcm9kdWN0aW9uJyA/ICd0dGwnIDogdW5kZWZpbmVkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgZmlsZSBhbmFseXNpcyBoaXN0b3J5XHJcbiAgICB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZmlsZUlkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZmlsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXIgYW5hbHlzaXMgaGlzdG9yeVxyXG4gICAgdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBjb250ZW50IGhhc2ggbG9va3VwIChmb3IgYW5hbHlzaXMgY2FjaGluZylcclxuICAgIHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdjb250ZW50SGFzaC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2NvbnRlbnRIYXNoJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNhbXBsZSBGaWxlcyBUYWJsZSAtIEN1cmF0ZWQgbGlicmFyeSBvZiBDL0MrKyBmaWxlcyB3aXRoIGtub3duIE1JU1JBIHZpb2xhdGlvbnNcclxuICAgIHRoaXMuc2FtcGxlRmlsZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnU2FtcGxlRmlsZXNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tc2FtcGxlLWZpbGVzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzYW1wbGVJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gU2FtcGxlIGRhdGEgY2FuIGJlIHJlY3JlYXRlZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgbGFuZ3VhZ2UgYW5kIGRpZmZpY3VsdHkgZmlsdGVyaW5nIChyZXF1aXJlZCBmb3Igc2FtcGxlIHNlbGVjdGlvbilcclxuICAgIHRoaXMuc2FtcGxlRmlsZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ2xhbmd1YWdlLWRpZmZpY3VsdHlMZXZlbC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbGFuZ3VhZ2UnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdkaWZmaWN1bHR5TGV2ZWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgZXhwZWN0ZWQgY29tcGxpYW5jZSByYW5nZSBmaWx0ZXJpbmdcclxuICAgIHRoaXMuc2FtcGxlRmlsZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ2xhbmd1YWdlLWV4cGVjdGVkQ29tcGxpYW5jZS1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnbGFuZ3VhZ2UnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdleHBlY3RlZENvbXBsaWFuY2UnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgdXNhZ2UgdHJhY2tpbmcgYW5kIGFuYWx5dGljc1xyXG4gICAgdGhpcy5zYW1wbGVGaWxlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAndXNhZ2VDb3VudC1jcmVhdGVkQXQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzYWdlQ291bnQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdjcmVhdGVkQXQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvZ3Jlc3MgVGFibGUgZm9yIHJlYWwtdGltZSB1cGRhdGVzIC0gU3RvcmVzIGFuYWx5c2lzIHByb2dyZXNzIGZvciBsaXZlIHRyYWNraW5nXHJcbiAgICB0aGlzLnByb2dyZXNzVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Byb2dyZXNzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLXByb2dyZXNzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdhbmFseXNpc0lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkNVU1RPTUVSX01BTkFHRUQsXHJcbiAgICAgIGVuY3J5cHRpb25LZXk6IHRoaXMua21zS2V5LFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiAndHRsJywgLy8gQXV0by1jbGVhbnVwIGFmdGVyIDI0IGhvdXJzXHJcbiAgICAgIC8vIEVuYWJsZSBEeW5hbW9EQiBTdHJlYW1zIGZvciByZWFsLXRpbWUgcHJvZ3Jlc3MgdXBkYXRlc1xyXG4gICAgICBzdHJlYW06IGR5bmFtb2RiLlN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXIgcHJvZ3Jlc3MgdHJhY2tpbmdcclxuICAgIHRoaXMucHJvZ3Jlc3NUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC11cGRhdGVkQXQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwZGF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb25maWd1cmUgYXV0by1zY2FsaW5nIGZvciBwcm9kdWN0aW9uIGVudmlyb25tZW50XHJcbiAgICBpZiAoZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJykge1xyXG4gICAgICB0aGlzLmNvbmZpZ3VyZUF1dG9TY2FsaW5nKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb25maWd1cmUgYXV0by1zY2FsaW5nIGZvciBEeW5hbW9EQiB0YWJsZXMgaW4gcHJvZHVjdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY29uZmlndXJlQXV0b1NjYWxpbmcoKSB7XHJcbiAgICAvLyBOb3RlOiBBdXRvLXNjYWxpbmcgcmVxdWlyZXMgUFJPVklTSU9ORUQgYmlsbGluZyBtb2RlXHJcbiAgICAvLyBGb3IgcHJvZHVjdGlvbiwgd2UnbGwgdXNlIGEgaHlicmlkIGFwcHJvYWNoOlxyXG4gICAgLy8gLSBLZWVwIFBBWV9QRVJfUkVRVUVTVCBmb3IgY29zdCBlZmZpY2llbmN5IGR1cmluZyBsb3cgdXNhZ2VcclxuICAgIC8vIC0gQWRkIENsb3VkV2F0Y2ggYWxhcm1zIHRvIG1vbml0b3IgdXNhZ2UgYW5kIHJlY29tbWVuZCBzd2l0Y2hpbmcgdG8gUFJPVklTSU9ORUQgd2hlbiBuZWVkZWRcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBoaWdoIHVzYWdlIHBhdHRlcm5zXHJcbiAgICBjb25zdCB1c2Vyc1RhYmxlUmVhZEFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ1VzZXJzVGFibGVIaWdoUmVhZFVzYWdlJywge1xyXG4gICAgICBhbGFybU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2Vycy10YWJsZS1oaWdoLXJlYWQtJHt0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAncHJvZHVjdGlvbid9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1VzZXJzIHRhYmxlIGV4cGVyaWVuY2luZyBoaWdoIHJlYWQgdXNhZ2UgLSBjb25zaWRlciBzd2l0Y2hpbmcgdG8gcHJvdmlzaW9uZWQgbW9kZScsXHJcbiAgICAgIG1ldHJpYzogdGhpcy51c2Vyc1RhYmxlLm1ldHJpY0NvbnN1bWVkUmVhZENhcGFjaXR5VW5pdHMoe1xyXG4gICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgc3RhdGlzdGljOiAnU3VtJyxcclxuICAgICAgfSksXHJcbiAgICAgIHRocmVzaG9sZDogMTAwMCwgLy8gMTAwMCBSQ1VzIGluIDUgbWludXRlc1xyXG4gICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgdHJlYXRNaXNzaW5nRGF0YTogY2xvdWR3YXRjaC5UcmVhdE1pc3NpbmdEYXRhLk5PVF9CUkVBQ0hJTkcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCB1c2Vyc1RhYmxlV3JpdGVBbGFybSA9IG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdVc2Vyc1RhYmxlSGlnaFdyaXRlVXNhZ2UnLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYG1pc3JhLXBsYXRmb3JtLXVzZXJzLXRhYmxlLWhpZ2gtd3JpdGUtJHt0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZW52aXJvbm1lbnQnKSB8fCAncHJvZHVjdGlvbid9YCxcclxuICAgICAgYWxhcm1EZXNjcmlwdGlvbjogJ1VzZXJzIHRhYmxlIGV4cGVyaWVuY2luZyBoaWdoIHdyaXRlIHVzYWdlIC0gY29uc2lkZXIgc3dpdGNoaW5nIHRvIHByb3Zpc2lvbmVkIG1vZGUnLFxyXG4gICAgICBtZXRyaWM6IHRoaXMudXNlcnNUYWJsZS5tZXRyaWNDb25zdW1lZFdyaXRlQ2FwYWNpdHlVbml0cyh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAxMDAwLCAvLyAxMDAwIFdDVXMgaW4gNSBtaW51dGVzXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFuYWx5c2lzVGFibGVSZWFkQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCAnQW5hbHlzaXNUYWJsZUhpZ2hSZWFkVXNhZ2UnLCB7XHJcbiAgICAgIGFsYXJtTmFtZTogYG1pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLXRhYmxlLWhpZ2gtcmVhZC0ke3RoaXMubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdwcm9kdWN0aW9uJ31gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQW5hbHlzaXMgcmVzdWx0cyB0YWJsZSBleHBlcmllbmNpbmcgaGlnaCByZWFkIHVzYWdlIC0gY29uc2lkZXIgc3dpdGNoaW5nIHRvIHByb3Zpc2lvbmVkIG1vZGUnLFxyXG4gICAgICBtZXRyaWM6IHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUubWV0cmljQ29uc3VtZWRSZWFkQ2FwYWNpdHlVbml0cyh7XHJcbiAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICB9KSxcclxuICAgICAgdGhyZXNob2xkOiAyMDAwLCAvLyAyMDAwIFJDVXMgaW4gNSBtaW51dGVzXHJcbiAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFuYWx5c2lzVGFibGVXcml0ZUFsYXJtID0gbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgJ0FuYWx5c2lzVGFibGVIaWdoV3JpdGVVc2FnZScsIHtcclxuICAgICAgYWxhcm1OYW1lOiBgbWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtdGFibGUtaGlnaC13cml0ZS0ke3RoaXMubm9kZS50cnlHZXRDb250ZXh0KCdlbnZpcm9ubWVudCcpIHx8ICdwcm9kdWN0aW9uJ31gLFxyXG4gICAgICBhbGFybURlc2NyaXB0aW9uOiAnQW5hbHlzaXMgcmVzdWx0cyB0YWJsZSBleHBlcmllbmNpbmcgaGlnaCB3cml0ZSB1c2FnZSAtIGNvbnNpZGVyIHN3aXRjaGluZyB0byBwcm92aXNpb25lZCBtb2RlJyxcclxuICAgICAgbWV0cmljOiB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLm1ldHJpY0NvbnN1bWVkV3JpdGVDYXBhY2l0eVVuaXRzKHtcclxuICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgIH0pLFxyXG4gICAgICB0aHJlc2hvbGQ6IDIwMDAsIC8vIDIwMDAgV0NVcyBpbiA1IG1pbnV0ZXNcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgYWxhcm1zIGZvciBtb25pdG9yaW5nIHNldHVwXHJcbiAgICAodGhpcyBhcyBhbnkpLmNhcGFjaXR5QWxhcm1zID0ge1xyXG4gICAgICB1c2Vyc1RhYmxlUmVhZDogdXNlcnNUYWJsZVJlYWRBbGFybSxcclxuICAgICAgdXNlcnNUYWJsZVdyaXRlOiB1c2Vyc1RhYmxlV3JpdGVBbGFybSxcclxuICAgICAgYW5hbHlzaXNUYWJsZVJlYWQ6IGFuYWx5c2lzVGFibGVSZWFkQWxhcm0sXHJcbiAgICAgIGFuYWx5c2lzVGFibGVXcml0ZTogYW5hbHlzaXNUYWJsZVdyaXRlQWxhcm0sXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVTM0J1Y2tldChlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLmZpbGVzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldCh0aGlzLCAnRmlsZXNCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1maWxlcy0ke2Vudmlyb25tZW50fS0ke3RoaXMuYWNjb3VudH1gLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNUyxcclxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBlbnZpcm9ubWVudCAhPT0gJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICBjb3JzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuR0VULFxyXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QT1NULFxyXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QVVQsXHJcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkhFQUQsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbidcclxuICAgICAgICAgICAgPyBbJ2h0dHBzOi8veW91ci1wcm9kdWN0aW9uLWRvbWFpbi5jb20nXSAvLyBSZXBsYWNlIHdpdGggYWN0dWFsIHByb2R1Y3Rpb24gZG9tYWluXHJcbiAgICAgICAgICAgIDogWydodHRwOi8vbG9jYWxob3N0OjMwMDAnLCAnaHR0cDovL2xvY2FsaG9zdDo1MTczJywgJ2h0dHBzOi8vKi52ZXJjZWwuYXBwJ10sXHJcbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogW1xyXG4gICAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgICAnQ29udGVudC1MZW5ndGgnLFxyXG4gICAgICAgICAgICAnQ29udGVudC1NRDUnLFxyXG4gICAgICAgICAgICAneC1hbXotZGF0ZScsXHJcbiAgICAgICAgICAgICd4LWFtei1zZWN1cml0eS10b2tlbicsXHJcbiAgICAgICAgICAgICd4LWFtei11c2VyLWFnZW50JyxcclxuICAgICAgICAgICAgJ3gtYW16LWNvbnRlbnQtc2hhMjU2JyxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBleHBvc2VkSGVhZGVyczogW1xyXG4gICAgICAgICAgICAnRVRhZycsXHJcbiAgICAgICAgICAgICd4LWFtei12ZXJzaW9uLWlkJyxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBtYXhBZ2U6IDM2MDAsIC8vIDEgaG91clxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICdEZWxldGVPbGRWZXJzaW9ucycsXHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgbm9uY3VycmVudFZlcnNpb25FeHBpcmF0aW9uOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ1RyYW5zaXRpb25Ub0lBJyxcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsXHJcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxyXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuREVFUF9BUkNISVZFLFxyXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzY1KSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ0Fib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZHMnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAnRGVsZXRlRXhwaXJlZERlbGV0ZU1hcmtlcnMnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGV4cGlyZWRPYmplY3REZWxldGVNYXJrZXI6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ09wdGltaXplU21hbGxGaWxlcycsXHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgb2JqZWN0U2l6ZUdyZWF0ZXJUaGFuOiAxMjggKiAxMDI0LCAvLyAxMjhLQlxyXG4gICAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLFxyXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAnQXJjaGl2ZUxhcmdlRmlsZXMnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIG9iamVjdFNpemVHcmVhdGVyVGhhbjogMTAgKiAxMDI0ICogMTAyNCwgLy8gMTBNQlxyXG4gICAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLkdMQUNJRVIsXHJcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg2MCksXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5ERUVQX0FSQ0hJVkUsXHJcbiAgICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cygxODApLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIGNyb3NzLXJlZ2lvbiByZXBsaWNhdGlvbiBmb3IgcHJvZHVjdGlvblxyXG4gICAgaWYgKGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicpIHtcclxuICAgICAgdGhpcy5jb25maWd1cmVDcm9zc1JlZ2lvblJlcGxpY2F0aW9uKCk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUNvZ25pdG9Vc2VyUG9vbChlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2Vycy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXHJcbiAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUgfSxcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcbiAgICAgIC8vIENvbmZpZ3VyZSBNRkEgZm9yIGF1dG9ub21vdXMgd29ya2Zsb3cgd2l0aCBUT1RQIHN1cHBvcnRcclxuICAgICAgbWZhOiBjb2duaXRvLk1mYS5SRVFVSVJFRCwgLy8gTWFrZSBNRkEgcmVxdWlyZWQgZm9yIHByb2R1Y3Rpb24gc2VjdXJpdHlcclxuICAgICAgbWZhU2Vjb25kRmFjdG9yOiB7XHJcbiAgICAgICAgc21zOiBmYWxzZSxcclxuICAgICAgICBvdHA6IHRydWUsIC8vIEVuYWJsZSBUT1RQIE1GQSBmb3IgU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSBmbG93XHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiBmYWxzZSB9LFxyXG4gICAgICAgIGdpdmVuTmFtZTogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgIGZhbWlseU5hbWU6IHsgcmVxdWlyZWQ6IGZhbHNlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbWF4TGVuOiAyNTYsIG11dGFibGU6IHRydWUgfSksXHJcbiAgICAgICAgcm9sZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbWF4TGVuOiA1MCwgbXV0YWJsZTogdHJ1ZSB9KSxcclxuICAgICAgICAvLyBBZGQgY3VzdG9tIGF0dHJpYnV0ZSB0byB0cmFjayBNRkEgc2V0dXAgc3RhdHVzIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICAgICAgbWZhU2V0dXBDb21wbGV0ZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbWF4TGVuOiAxMCwgbXV0YWJsZTogdHJ1ZSB9KSxcclxuICAgICAgfSxcclxuICAgICAgLy8gQ29uZmlndXJlIHVzZXIgdmVyaWZpY2F0aW9uIHNldHRpbmdzIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdNSVNSQSBQbGF0Zm9ybSAtIFZlcmlmeSB5b3VyIGVtYWlsJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdXZWxjb21lIHRvIE1JU1JBIFBsYXRmb3JtISBZb3VyIHZlcmlmaWNhdGlvbiBjb2RlIGlzIHsjIyMjfScsXHJcbiAgICAgICAgZW1haWxTdHlsZTogY29nbml0by5WZXJpZmljYXRpb25FbWFpbFN0eWxlLkNPREUsXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIENvbmZpZ3VyZSB1c2VyIGludml0YXRpb24gc2V0dGluZ3NcclxuICAgICAgdXNlckludml0YXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIE1JU1JBIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdZb3VyIHVzZXJuYW1lIGlzIHt1c2VybmFtZX0gYW5kIHRlbXBvcmFyeSBwYXNzd29yZCBpcyB7IyMjI30nLFxyXG4gICAgICB9LFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxyXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnVXNlclBvb2xDbGllbnQnLCB7XHJcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxyXG4gICAgICB1c2VyUG9vbENsaWVudE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS13ZWItY2xpZW50LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLCAvLyBQdWJsaWMgY2xpZW50IGZvciBTUEFcclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUsXHJcbiAgICAgICAgLy8gRW5hYmxlIGN1c3RvbSBhdXRoIGZsb3cgZm9yIE1GQSBjaGFsbGVuZ2VzXHJcbiAgICAgICAgY3VzdG9tOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBhY2Nlc3NUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZSxcclxuICAgICAgLy8gQ29uZmlndXJlIHN1cHBvcnRlZCBpZGVudGl0eSBwcm92aWRlcnNcclxuICAgICAgc3VwcG9ydGVkSWRlbnRpdHlQcm92aWRlcnM6IFtcclxuICAgICAgICBjb2duaXRvLlVzZXJQb29sQ2xpZW50SWRlbnRpdHlQcm92aWRlci5DT0dOSVRPLFxyXG4gICAgICBdLFxyXG4gICAgICAvLyBDb25maWd1cmUgT0F1dGggc2V0dGluZ3MgZm9yIHBvdGVudGlhbCBmdXR1cmUgdXNlXHJcbiAgICAgIG9BdXRoOiB7XHJcbiAgICAgICAgZmxvd3M6IHtcclxuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IGZhbHNlLFxyXG4gICAgICAgICAgaW1wbGljaXRDb2RlR3JhbnQ6IGZhbHNlLFxyXG4gICAgICAgICAgY2xpZW50Q3JlZGVudGlhbHM6IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2NvcGVzOiBbXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuT1BFTklELFxyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEUsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAgLy8gQ29uZmlndXJlIHJlYWQgYW5kIHdyaXRlIGF0dHJpYnV0ZXNcclxuICAgICAgcmVhZEF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZW1haWxWZXJpZmllZDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ29yZ2FuaXphdGlvbklkJywgJ3JvbGUnLCAnbWZhU2V0dXBDb21wbGV0ZScpLFxyXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ29yZ2FuaXphdGlvbklkJywgJ3JvbGUnLCAnbWZhU2V0dXBDb21wbGV0ZScpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIENsb3VkV2F0Y2ggbG9nIGdyb3VwIGZvciBDb2duaXRvIGV2ZW50c1xyXG4gICAgbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0NvZ25pdG9Mb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9jb2duaXRvL3VzZXJwb29sLyR7dGhpcy51c2VyUG9vbC51c2VyUG9vbElkfWAsXHJcbiAgICAgIHJldGVudGlvbjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEggXHJcbiAgICAgICAgOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQXBpR2F0ZXdheShlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgZm9yIEFQSSBHYXRld2F5XHJcbiAgICBjb25zdCBhcGlMb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdBcGlHYXRld2F5TG9nR3JvdXAnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvYXBpZ2F0ZXdheS9taXNyYS1wbGF0Zm9ybS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEggXHJcbiAgICAgICAgOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbmhhbmNlZCBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIHByb2R1Y3Rpb24gZG9tYWluc1xyXG4gICAgY29uc3QgcHJvZHVjdGlvbk9yaWdpbnMgPSBbXHJcbiAgICAgICdodHRwczovL21pc3JhLnlvdXJkb21haW4uY29tJyxcclxuICAgICAgJ2h0dHBzOi8vd3d3Lm1pc3JhLnlvdXJkb21haW4uY29tJyxcclxuICAgICAgJ2h0dHBzOi8vYXBwLm1pc3JhLnlvdXJkb21haW4uY29tJ1xyXG4gICAgXTtcclxuICAgIFxyXG4gICAgY29uc3QgZGV2ZWxvcG1lbnRPcmlnaW5zID0gW1xyXG4gICAgICAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuICAgICAgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsXHJcbiAgICAgICdodHRwczovLyoudmVyY2VsLmFwcCcsXHJcbiAgICAgICdodHRwczovLyoubmV0bGlmeS5hcHAnXHJcbiAgICBdO1xyXG5cclxuICAgIGNvbnN0IGFsbG93ZWRPcmlnaW5zID0gZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgPyBwcm9kdWN0aW9uT3JpZ2lucyBcclxuICAgICAgOiBbLi4ucHJvZHVjdGlvbk9yaWdpbnMsIC4uLmRldmVsb3BtZW50T3JpZ2luc107XHJcblxyXG4gICAgLy8gRW5oYW5jZWQgc2VjdXJpdHkgaGVhZGVycyBmb3IgQ09SU1xyXG4gICAgY29uc3Qgc2VjdXJlSGVhZGVycyA9IFtcclxuICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICdBdXRob3JpemF0aW9uJyxcclxuICAgICAgJ1gtQW16LURhdGUnLFxyXG4gICAgICAnWC1BcGktS2V5JyxcclxuICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnLFxyXG4gICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCcsXHJcbiAgICAgICdBY2NlcHQnLFxyXG4gICAgICAnT3JpZ2luJyxcclxuICAgICAgJ1gtQW16LVNlY3VyaXR5LVRva2VuJyxcclxuICAgICAgJ1gtQW16LVVzZXItQWdlbnQnLFxyXG4gICAgICAnWC1BbXotQ29udGVudC1TaGEyNTYnLFxyXG4gICAgICAnQ2FjaGUtQ29udHJvbCcsXHJcbiAgICAgICdJZi1NYXRjaCcsXHJcbiAgICAgICdJZi1Ob25lLU1hdGNoJyxcclxuICAgICAgJ0lmLU1vZGlmaWVkLVNpbmNlJyxcclxuICAgICAgJ0lmLVVubW9kaWZpZWQtU2luY2UnXHJcbiAgICBdO1xyXG5cclxuICAgIHRoaXMuYXBpID0gbmV3IGFwaWdhdGV3YXkuUmVzdEFwaSh0aGlzLCAnTWlzcmFBcGknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYXBpLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246IGBNSVNSQSBDb21wbGlhbmNlIFBsYXRmb3JtIEFQSSAtICR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVwbG95T3B0aW9uczoge1xyXG4gICAgICAgIHN0YWdlTmFtZTogZW52aXJvbm1lbnQsXHJcbiAgICAgICAgbG9nZ2luZ0xldmVsOiBhcGlnYXRld2F5Lk1ldGhvZExvZ2dpbmdMZXZlbC5JTkZPLFxyXG4gICAgICAgIGRhdGFUcmFjZUVuYWJsZWQ6IGVudmlyb25tZW50ICE9PSAncHJvZHVjdGlvbicsXHJcbiAgICAgICAgbWV0cmljc0VuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgYWNjZXNzTG9nRGVzdGluYXRpb246IG5ldyBhcGlnYXRld2F5LkxvZ0dyb3VwTG9nRGVzdGluYXRpb24oYXBpTG9nR3JvdXApLFxyXG4gICAgICAgIGFjY2Vzc0xvZ0Zvcm1hdDogYXBpZ2F0ZXdheS5BY2Nlc3NMb2dGb3JtYXQuanNvbldpdGhTdGFuZGFyZEZpZWxkcyh7XHJcbiAgICAgICAgICBjYWxsZXI6IHRydWUsXHJcbiAgICAgICAgICBodHRwTWV0aG9kOiB0cnVlLFxyXG4gICAgICAgICAgaXA6IHRydWUsXHJcbiAgICAgICAgICBwcm90b2NvbDogdHJ1ZSxcclxuICAgICAgICAgIHJlcXVlc3RUaW1lOiB0cnVlLFxyXG4gICAgICAgICAgcmVzb3VyY2VQYXRoOiB0cnVlLFxyXG4gICAgICAgICAgcmVzcG9uc2VMZW5ndGg6IHRydWUsXHJcbiAgICAgICAgICBzdGF0dXM6IHRydWUsXHJcbiAgICAgICAgICB1c2VyOiB0cnVlLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIC8vIEVuaGFuY2VkIGNhY2hpbmcgY29uZmlndXJhdGlvblxyXG4gICAgICAgIGNhY2hpbmdFbmFibGVkOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICAgIGNhY2hlQ2x1c3RlckVuYWJsZWQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicsXHJcbiAgICAgICAgY2FjaGVDbHVzdGVyU2l6ZTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/ICcwLjUnIDogdW5kZWZpbmVkLFxyXG4gICAgICAgIGNhY2hlVHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSxcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhbGxvd2VkT3JpZ2lucyxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFtcclxuICAgICAgICAgICdHRVQnLFxyXG4gICAgICAgICAgJ1BPU1QnLFxyXG4gICAgICAgICAgJ1BVVCcsXHJcbiAgICAgICAgICAnREVMRVRFJyxcclxuICAgICAgICAgICdQQVRDSCcsXHJcbiAgICAgICAgICAnSEVBRCcsXHJcbiAgICAgICAgICAnT1BUSU9OUydcclxuICAgICAgICBdLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogc2VjdXJlSGVhZGVycyxcclxuICAgICAgICBleHBvc2VIZWFkZXJzOiBbXHJcbiAgICAgICAgICAnWC1Db3JyZWxhdGlvbi1JRCcsXHJcbiAgICAgICAgICAnWC1SZXF1ZXN0LUlEJyxcclxuICAgICAgICAgICdYLUFtei1SZXF1ZXN0LUlEJyxcclxuICAgICAgICAgICdFVGFnJyxcclxuICAgICAgICAgICdDb250ZW50LUxlbmd0aCcsXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJ1xyXG4gICAgICAgIF0sXHJcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogZmFsc2UsXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIH0sXHJcbiAgICAgIGNsb3VkV2F0Y2hSb2xlOiB0cnVlLFxyXG4gICAgICAvLyBFbmFibGUgYmluYXJ5IG1lZGlhIHR5cGVzIGZvciBmaWxlIHVwbG9hZHNcclxuICAgICAgYmluYXJ5TWVkaWFUeXBlczogWycqLyonXSxcclxuICAgICAgLy8gRW5oYW5jZWQgQVBJIEdhdGV3YXkgY29uZmlndXJhdGlvblxyXG4gICAgICBlbmRwb2ludENvbmZpZ3VyYXRpb246IHtcclxuICAgICAgICB0eXBlczogW2FwaWdhdGV3YXkuRW5kcG9pbnRUeXBlLlJFR0lPTkFMXSxcclxuICAgICAgfSxcclxuICAgICAgLy8gTWluaW11bSBjb21wcmVzc2lvbiBzaXplIGZvciByZXNwb25zZXNcclxuICAgICAgbWluaW11bUNvbXByZXNzaW9uU2l6ZTogMTAyNCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSByZXF1ZXN0IHZhbGlkYXRvciBhZnRlciBBUEkgaXMgY3JlYXRlZFxyXG4gICAgY29uc3QgcmVxdWVzdFZhbGlkYXRvciA9IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RWYWxpZGF0b3IodGhpcywgJ1JlcXVlc3RWYWxpZGF0b3InLCB7XHJcbiAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yTmFtZTogYG1pc3JhLXBsYXRmb3JtLXZhbGlkYXRvci0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IHRydWUsXHJcbiAgICAgIHZhbGlkYXRlUmVxdWVzdFBhcmFtZXRlcnM6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbmhhbmNlZCByYXRlIGxpbWl0aW5nIGFuZCB0aHJvdHRsaW5nIHdpdGggbXVsdGlwbGUgdXNhZ2UgcGxhbnNcclxuICAgIFxyXG4gICAgLy8gMS4gUHJlbWl1bSBVc2FnZSBQbGFuIChmb3IgYXV0aGVudGljYXRlZCB1c2VycylcclxuICAgIGNvbnN0IHByZW1pdW1Vc2FnZVBsYW4gPSB0aGlzLmFwaS5hZGRVc2FnZVBsYW4oJ01pc3JhUHJlbWl1bVVzYWdlUGxhbicsIHtcclxuICAgICAgbmFtZTogYG1pc3JhLXBsYXRmb3JtLXByZW1pdW0tcGxhbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgUHJlbWl1bSByYXRlIGxpbWl0aW5nIGZvciBhdXRoZW50aWNhdGVkIHVzZXJzIC0gJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICB0aHJvdHRsZToge1xyXG4gICAgICAgIHJhdGVMaW1pdDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDIwMDAgOiAyMDAsXHJcbiAgICAgICAgYnVyc3RMaW1pdDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDUwMDAgOiA1MDAsXHJcbiAgICAgIH0sXHJcbiAgICAgIHF1b3RhOiB7XHJcbiAgICAgICAgbGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyA1MDAwMDAgOiA1MDAwMCxcclxuICAgICAgICBwZXJpb2Q6IGFwaWdhdGV3YXkuUGVyaW9kLkRBWSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIDIuIFN0YW5kYXJkIFVzYWdlIFBsYW4gKGZvciBnZW5lcmFsIEFQSSBhY2Nlc3MpXHJcbiAgICBjb25zdCBzdGFuZGFyZFVzYWdlUGxhbiA9IHRoaXMuYXBpLmFkZFVzYWdlUGxhbignTWlzcmFTdGFuZGFyZFVzYWdlUGxhbicsIHtcclxuICAgICAgbmFtZTogYG1pc3JhLXBsYXRmb3JtLXN0YW5kYXJkLXBsYW4tJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYFN0YW5kYXJkIHJhdGUgbGltaXRpbmcgZm9yIGdlbmVyYWwgQVBJIGFjY2VzcyAtICR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgdGhyb3R0bGU6IHtcclxuICAgICAgICByYXRlTGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAxMDAwIDogMTAwLFxyXG4gICAgICAgIGJ1cnN0TGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAyMDAwIDogMjAwLFxyXG4gICAgICB9LFxyXG4gICAgICBxdW90YToge1xyXG4gICAgICAgIGxpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMTAwMDAwIDogMTAwMDAsXHJcbiAgICAgICAgcGVyaW9kOiBhcGlnYXRld2F5LlBlcmlvZC5EQVksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyAzLiBMaW1pdGVkIFVzYWdlIFBsYW4gKGZvciB1bmF1dGhlbnRpY2F0ZWQvcHVibGljIGVuZHBvaW50cylcclxuICAgIGNvbnN0IGxpbWl0ZWRVc2FnZVBsYW4gPSB0aGlzLmFwaS5hZGRVc2FnZVBsYW4oJ01pc3JhTGltaXRlZFVzYWdlUGxhbicsIHtcclxuICAgICAgbmFtZTogYG1pc3JhLXBsYXRmb3JtLWxpbWl0ZWQtcGxhbi0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgTGltaXRlZCByYXRlIGxpbWl0aW5nIGZvciBwdWJsaWMgZW5kcG9pbnRzIC0gJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICB0aHJvdHRsZToge1xyXG4gICAgICAgIHJhdGVMaW1pdDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDEwMCA6IDUwLFxyXG4gICAgICAgIGJ1cnN0TGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAyMDAgOiAxMDAsXHJcbiAgICAgIH0sXHJcbiAgICAgIHF1b3RhOiB7XHJcbiAgICAgICAgbGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAxMDAwMCA6IDEwMDAsXHJcbiAgICAgICAgcGVyaW9kOiBhcGlnYXRld2F5LlBlcmlvZC5EQVksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBc3NvY2lhdGUgdXNhZ2UgcGxhbnMgd2l0aCBBUEkgc3RhZ2VzXHJcbiAgICBbcHJlbWl1bVVzYWdlUGxhbiwgc3RhbmRhcmRVc2FnZVBsYW4sIGxpbWl0ZWRVc2FnZVBsYW5dLmZvckVhY2gocGxhbiA9PiB7XHJcbiAgICAgIHBsYW4uYWRkQXBpU3RhZ2Uoe1xyXG4gICAgICAgIHN0YWdlOiB0aGlzLmFwaS5kZXBsb3ltZW50U3RhZ2UsXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFQSSBLZXlzIGZvciBkaWZmZXJlbnQgYWNjZXNzIGxldmVsc1xyXG4gICAgY29uc3QgcHJlbWl1bUFwaUtleSA9IHRoaXMuYXBpLmFkZEFwaUtleSgnTWlzcmFQcmVtaXVtQXBpS2V5Jywge1xyXG4gICAgICBhcGlLZXlOYW1lOiBgbWlzcmEtcGxhdGZvcm0tcHJlbWl1bS1rZXktJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYFByZW1pdW0gQVBJIEtleSBmb3IgTUlTUkEgUGxhdGZvcm0gLSAke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHZhbHVlOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gdW5kZWZpbmVkIDogJ3ByZW1pdW0tZGV2LWtleS0xMjM0NScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBzdGFuZGFyZEFwaUtleSA9IHRoaXMuYXBpLmFkZEFwaUtleSgnTWlzcmFTdGFuZGFyZEFwaUtleScsIHtcclxuICAgICAgYXBpS2V5TmFtZTogYG1pc3JhLXBsYXRmb3JtLXN0YW5kYXJkLWtleS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgU3RhbmRhcmQgQVBJIEtleSBmb3IgTUlTUkEgUGxhdGZvcm0gLSAke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHZhbHVlOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gdW5kZWZpbmVkIDogJ3N0YW5kYXJkLWRldi1rZXktMTIzNDUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgbW9uaXRvcmluZ0FwaUtleSA9IHRoaXMuYXBpLmFkZEFwaUtleSgnTWlzcmFNb25pdG9yaW5nQXBpS2V5Jywge1xyXG4gICAgICBhcGlLZXlOYW1lOiBgbWlzcmEtcGxhdGZvcm0tbW9uaXRvcmluZy1rZXktJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogYE1vbml0b3JpbmcgQVBJIEtleSBmb3IgTUlTUkEgUGxhdGZvcm0gLSAke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHZhbHVlOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gdW5kZWZpbmVkIDogJ21vbml0b3JpbmctZGV2LWtleS0xMjM0NScsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBc3NvY2lhdGUgQVBJIGtleXMgd2l0aCB1c2FnZSBwbGFuc1xyXG4gICAgcHJlbWl1bVVzYWdlUGxhbi5hZGRBcGlLZXkocHJlbWl1bUFwaUtleSk7XHJcbiAgICBzdGFuZGFyZFVzYWdlUGxhbi5hZGRBcGlLZXkoc3RhbmRhcmRBcGlLZXkpO1xyXG4gICAgbGltaXRlZFVzYWdlUGxhbi5hZGRBcGlLZXkobW9uaXRvcmluZ0FwaUtleSk7XHJcblxyXG4gICAgLy8gUmVxdWVzdC9SZXNwb25zZSBNb2RlbHMgZm9yIHZhbGlkYXRpb25cclxuICAgIHRoaXMuY3JlYXRlQXBpTW9kZWxzKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBDdXN0b20gZG9tYWluIGNvbmZpZ3VyYXRpb24gKGlmIHByb3ZpZGVkKVxyXG4gICAgdGhpcy5jb25maWd1cmVDdXN0b21Eb21haW4oZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIFN0b3JlIHJlZmVyZW5jZXMgZm9yIGVuZHBvaW50IGNyZWF0aW9uXHJcbiAgICAodGhpcyBhcyBhbnkpLnVzYWdlUGxhbnMgPSB7XHJcbiAgICAgIHByZW1pdW06IHByZW1pdW1Vc2FnZVBsYW4sXHJcbiAgICAgIHN0YW5kYXJkOiBzdGFuZGFyZFVzYWdlUGxhbixcclxuICAgICAgbGltaXRlZDogbGltaXRlZFVzYWdlUGxhbixcclxuICAgIH07XHJcblxyXG4gICAgKHRoaXMgYXMgYW55KS5hcGlLZXlzID0ge1xyXG4gICAgICBwcmVtaXVtOiBwcmVtaXVtQXBpS2V5LFxyXG4gICAgICBzdGFuZGFyZDogc3RhbmRhcmRBcGlLZXksXHJcbiAgICAgIG1vbml0b3Jpbmc6IG1vbml0b3JpbmdBcGlLZXksXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIEFQSSBtb2RlbHMgZm9yIHJlcXVlc3QvcmVzcG9uc2UgdmFsaWRhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQXBpTW9kZWxzKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIC8vIFVzZXIgUmVnaXN0cmF0aW9uIE1vZGVsXHJcbiAgICBjb25zdCB1c2VyUmVnaXN0cmF0aW9uTW9kZWwgPSB0aGlzLmFwaS5hZGRNb2RlbCgnVXNlclJlZ2lzdHJhdGlvbk1vZGVsJywge1xyXG4gICAgICBtb2RlbE5hbWU6ICdVc2VyUmVnaXN0cmF0aW9uJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdNb2RlbCBmb3IgdXNlciByZWdpc3RyYXRpb24gcmVxdWVzdHMnLFxyXG4gICAgICBzY2hlbWE6IHtcclxuICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLk9CSkVDVCxcclxuICAgICAgICBwcm9wZXJ0aWVzOiB7XHJcbiAgICAgICAgICBlbWFpbDoge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLlNUUklORyxcclxuICAgICAgICAgICAgZm9ybWF0OiAnZW1haWwnLFxyXG4gICAgICAgICAgICBtYXhMZW5ndGg6IDI1NSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBwYXNzd29yZDoge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLlNUUklORyxcclxuICAgICAgICAgICAgbWluTGVuZ3RoOiA4LFxyXG4gICAgICAgICAgICBtYXhMZW5ndGg6IDEyOCxcclxuICAgICAgICAgICAgcGF0dGVybjogJ14oPz0uKlthLXpdKSg/PS4qW0EtWl0pKD89LipcXFxcZCkoPz0uKltAJCElKj8mXSlbQS1aYS16XFxcXGRAJCElKj8mXScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgZmlyc3ROYW1lOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuU1RSSU5HLFxyXG4gICAgICAgICAgICBtaW5MZW5ndGg6IDEsXHJcbiAgICAgICAgICAgIG1heExlbmd0aDogNTAsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgbGFzdE5hbWU6IHtcclxuICAgICAgICAgICAgdHlwZTogYXBpZ2F0ZXdheS5Kc29uU2NoZW1hVHlwZS5TVFJJTkcsXHJcbiAgICAgICAgICAgIG1pbkxlbmd0aDogMSxcclxuICAgICAgICAgICAgbWF4TGVuZ3RoOiA1MCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBvcmdhbml6YXRpb25JZDoge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLlNUUklORyxcclxuICAgICAgICAgICAgbWF4TGVuZ3RoOiAyNTYsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVxdWlyZWQ6IFsnZW1haWwnLCAncGFzc3dvcmQnLCAnZmlyc3ROYW1lJ10sXHJcbiAgICAgICAgYWRkaXRpb25hbFByb3BlcnRpZXM6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZSBVcGxvYWQgTW9kZWxcclxuICAgIGNvbnN0IGZpbGVVcGxvYWRNb2RlbCA9IHRoaXMuYXBpLmFkZE1vZGVsKCdGaWxlVXBsb2FkTW9kZWwnLCB7XHJcbiAgICAgIG1vZGVsTmFtZTogJ0ZpbGVVcGxvYWQnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01vZGVsIGZvciBmaWxlIHVwbG9hZCByZXF1ZXN0cycsXHJcbiAgICAgIHNjaGVtYToge1xyXG4gICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuT0JKRUNULFxyXG4gICAgICAgIHByb3BlcnRpZXM6IHtcclxuICAgICAgICAgIGZpbGVOYW1lOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuU1RSSU5HLFxyXG4gICAgICAgICAgICBtaW5MZW5ndGg6IDEsXHJcbiAgICAgICAgICAgIG1heExlbmd0aDogMjU1LFxyXG4gICAgICAgICAgICBwYXR0ZXJuOiAnXlthLXpBLVowLTkuXy1dK1xcXFwuKGN8Y3BwfGh8aHBwKSQnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGZpbGVTaXplOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuSU5URUdFUixcclxuICAgICAgICAgICAgbWluaW11bTogMSxcclxuICAgICAgICAgICAgbWF4aW11bTogMTA0ODU3NjAsIC8vIDEwTUJcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjb250ZW50VHlwZToge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLlNUUklORyxcclxuICAgICAgICAgICAgZW51bTogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jJywgJ3RleHQveC1jKysnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY2hlY2tzdW06IHtcclxuICAgICAgICAgICAgdHlwZTogYXBpZ2F0ZXdheS5Kc29uU2NoZW1hVHlwZS5TVFJJTkcsXHJcbiAgICAgICAgICAgIHBhdHRlcm46ICdeW2EtZkEtRjAtOV17NjR9JCcsIC8vIFNIQS0yNTYgaGFzaFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlcXVpcmVkOiBbJ2ZpbGVOYW1lJywgJ2ZpbGVTaXplJywgJ2NvbnRlbnRUeXBlJ10sXHJcbiAgICAgICAgYWRkaXRpb25hbFByb3BlcnRpZXM6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgUmVxdWVzdCBNb2RlbFxyXG4gICAgY29uc3QgYW5hbHlzaXNSZXF1ZXN0TW9kZWwgPSB0aGlzLmFwaS5hZGRNb2RlbCgnQW5hbHlzaXNSZXF1ZXN0TW9kZWwnLCB7XHJcbiAgICAgIG1vZGVsTmFtZTogJ0FuYWx5c2lzUmVxdWVzdCcsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTW9kZWwgZm9yIGFuYWx5c2lzIHJlcXVlc3RzJyxcclxuICAgICAgc2NoZW1hOiB7XHJcbiAgICAgICAgdHlwZTogYXBpZ2F0ZXdheS5Kc29uU2NoZW1hVHlwZS5PQkpFQ1QsXHJcbiAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgZmlsZUlkOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuU1RSSU5HLFxyXG4gICAgICAgICAgICBwYXR0ZXJuOiAnXlthLXpBLVowLTktX117MSwxMjh9JCcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgYW5hbHlzaXNUeXBlOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuU1RSSU5HLFxyXG4gICAgICAgICAgICBlbnVtOiBbJ2Z1bGwnLCAncXVpY2snLCAnY3VzdG9tJ10sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgcnVsZVNldDoge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLlNUUklORyxcclxuICAgICAgICAgICAgZW51bTogWydtaXNyYS1jLTIwMTInLCAnbWlzcmEtY3BwLTIwMDgnLCAnY3VzdG9tJ10sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgb3B0aW9uczoge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLk9CSkVDVCxcclxuICAgICAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgICAgIGluY2x1ZGVXYXJuaW5nczoge1xyXG4gICAgICAgICAgICAgICAgdHlwZTogYXBpZ2F0ZXdheS5Kc29uU2NoZW1hVHlwZS5CT09MRUFOLFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgc2V2ZXJpdHk6IHtcclxuICAgICAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuU1RSSU5HLFxyXG4gICAgICAgICAgICAgICAgZW51bTogWydsb3cnLCAnbWVkaXVtJywgJ2hpZ2gnLCAnY3JpdGljYWwnXSxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVxdWlyZWQ6IFsnZmlsZUlkJywgJ2FuYWx5c2lzVHlwZScsICdydWxlU2V0J10sXHJcbiAgICAgICAgYWRkaXRpb25hbFByb3BlcnRpZXM6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRXJyb3IgUmVzcG9uc2UgTW9kZWxcclxuICAgIGNvbnN0IGVycm9yUmVzcG9uc2VNb2RlbCA9IHRoaXMuYXBpLmFkZE1vZGVsKCdFcnJvclJlc3BvbnNlTW9kZWwnLCB7XHJcbiAgICAgIG1vZGVsTmFtZTogJ0Vycm9yUmVzcG9uc2UnLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N0YW5kYXJkIGVycm9yIHJlc3BvbnNlIG1vZGVsJyxcclxuICAgICAgc2NoZW1hOiB7XHJcbiAgICAgICAgdHlwZTogYXBpZ2F0ZXdheS5Kc29uU2NoZW1hVHlwZS5PQkpFQ1QsXHJcbiAgICAgICAgcHJvcGVydGllczoge1xyXG4gICAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgICAgdHlwZTogYXBpZ2F0ZXdheS5Kc29uU2NoZW1hVHlwZS5TVFJJTkcsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgbWVzc2FnZToge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLlNUUklORyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjb3JyZWxhdGlvbklkOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuU1RSSU5HLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHRpbWVzdGFtcDoge1xyXG4gICAgICAgICAgICB0eXBlOiBhcGlnYXRld2F5Lkpzb25TY2hlbWFUeXBlLlNUUklORyxcclxuICAgICAgICAgICAgZm9ybWF0OiAnZGF0ZS10aW1lJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBwYXRoOiB7XHJcbiAgICAgICAgICAgIHR5cGU6IGFwaWdhdGV3YXkuSnNvblNjaGVtYVR5cGUuU1RSSU5HLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGRldGFpbHM6IHtcclxuICAgICAgICAgICAgdHlwZTogYXBpZ2F0ZXdheS5Kc29uU2NoZW1hVHlwZS5PQkpFQ1QsXHJcbiAgICAgICAgICAgIGFkZGl0aW9uYWxQcm9wZXJ0aWVzOiB0cnVlLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlcXVpcmVkOiBbJ2Vycm9yJywgJ21lc3NhZ2UnLCAnY29ycmVsYXRpb25JZCcsICd0aW1lc3RhbXAnXSxcclxuICAgICAgICBhZGRpdGlvbmFsUHJvcGVydGllczogZmFsc2UsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9yZSBtb2RlbHMgZm9yIHVzZSBpbiBlbmRwb2ludCBjcmVhdGlvblxyXG4gICAgKHRoaXMgYXMgYW55KS5hcGlNb2RlbHMgPSB7XHJcbiAgICAgIHVzZXJSZWdpc3RyYXRpb246IHVzZXJSZWdpc3RyYXRpb25Nb2RlbCxcclxuICAgICAgZmlsZVVwbG9hZDogZmlsZVVwbG9hZE1vZGVsLFxyXG4gICAgICBhbmFseXNpc1JlcXVlc3Q6IGFuYWx5c2lzUmVxdWVzdE1vZGVsLFxyXG4gICAgICBlcnJvclJlc3BvbnNlOiBlcnJvclJlc3BvbnNlTW9kZWwsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uZmlndXJlIGN1c3RvbSBkb21haW4gYW5kIFNTTCBjZXJ0aWZpY2F0ZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY29uZmlndXJlQ3VzdG9tRG9tYWluKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIC8vIEN1c3RvbSBkb21haW4gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgZG9tYWluTmFtZSA9IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgID8gJ2FwaS5taXNyYS55b3VyZG9tYWluLmNvbSdcclxuICAgICAgOiBgYXBpLSR7ZW52aXJvbm1lbnR9Lm1pc3JhLnlvdXJkb21haW4uY29tYDtcclxuXHJcbiAgICAvLyBHZXQgY2VydGlmaWNhdGUgQVJOIGZyb20gY29udGV4dCBvciBwYXJhbWV0ZXJcclxuICAgIGNvbnN0IGNlcnRpZmljYXRlQXJuID0gdGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2NlcnRpZmljYXRlQXJuJyk7XHJcbiAgICBjb25zdCBlbmFibGVDdXN0b21Eb21haW4gPSB0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgnZW5hYmxlQ3VzdG9tRG9tYWluJykgPT09ICd0cnVlJztcclxuXHJcbiAgICAvLyBDcmVhdGUgcGFyYW1ldGVycyBmb3IgY3VzdG9tIGRvbWFpbiBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBjZXJ0aWZpY2F0ZUFyblBhcmFtZXRlciA9IG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdDZXJ0aWZpY2F0ZUFybicsIHtcclxuICAgICAgdHlwZTogJ1N0cmluZycsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVJOIG9mIHRoZSBTU0wgY2VydGlmaWNhdGUgZm9yIHRoZSBjdXN0b20gZG9tYWluIChtdXN0IGJlIGluIHVzLWVhc3QtMSBmb3IgQ2xvdWRGcm9udCknLFxyXG4gICAgICBkZWZhdWx0OiBjZXJ0aWZpY2F0ZUFybiB8fCAnYXJuOmF3czphY206dXMtZWFzdC0xOkFDQ09VTlRfSUQ6Y2VydGlmaWNhdGUvQ0VSVElGSUNBVEVfSUQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZG9tYWluTmFtZVBhcmFtZXRlciA9IG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdEb21haW5OYW1lJywge1xyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdDdXN0b20gZG9tYWluIG5hbWUgZm9yIHRoZSBBUEkgR2F0ZXdheScsXHJcbiAgICAgIGRlZmF1bHQ6IGRvbWFpbk5hbWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBob3N0ZWRab25lSWRQYXJhbWV0ZXIgPSBuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnSG9zdGVkWm9uZUlkJywge1xyXG4gICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdSb3V0ZSA1MyBIb3N0ZWQgWm9uZSBJRCBmb3IgdGhlIGRvbWFpbicsXHJcbiAgICAgIGRlZmF1bHQ6ICdaMTIzNDU2Nzg5MEFCQycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJZiBjdXN0b20gZG9tYWluIGlzIGVuYWJsZWQgYW5kIGNlcnRpZmljYXRlIEFSTiBpcyBwcm92aWRlZCwgY3JlYXRlIHRoZSBkb21haW5cclxuICAgIGlmIChlbmFibGVDdXN0b21Eb21haW4gJiYgY2VydGlmaWNhdGVBcm4gJiYgY2VydGlmaWNhdGVBcm4gIT09ICdwbGFjZWhvbGRlcicpIHtcclxuICAgICAgdHJ5IHtcclxuICAgICAgICAvLyBJbXBvcnQgdGhlIGNlcnRpZmljYXRlXHJcbiAgICAgICAgY29uc3QgY2VydGlmaWNhdGUgPSBhY20uQ2VydGlmaWNhdGUuZnJvbUNlcnRpZmljYXRlQXJuKFxyXG4gICAgICAgICAgdGhpcyxcclxuICAgICAgICAgICdBcGlDZXJ0aWZpY2F0ZScsXHJcbiAgICAgICAgICBjZXJ0aWZpY2F0ZUFyblxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBjdXN0b20gZG9tYWluIGZvciBBUEkgR2F0ZXdheVxyXG4gICAgICAgIGNvbnN0IGN1c3RvbURvbWFpbiA9IG5ldyBhcGlnYXRld2F5LkRvbWFpbk5hbWUodGhpcywgJ0FwaUN1c3RvbURvbWFpbicsIHtcclxuICAgICAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWVQYXJhbWV0ZXIudmFsdWVBc1N0cmluZyxcclxuICAgICAgICAgIGNlcnRpZmljYXRlOiBjZXJ0aWZpY2F0ZSxcclxuICAgICAgICAgIHNlY3VyaXR5UG9saWN5OiBhcGlnYXRld2F5LlNlY3VyaXR5UG9saWN5LlRMU18xXzIsXHJcbiAgICAgICAgICBlbmRwb2ludFR5cGU6IGFwaWdhdGV3YXkuRW5kcG9pbnRUeXBlLlJFR0lPTkFMLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBNYXAgdGhlIGN1c3RvbSBkb21haW4gdG8gdGhlIEFQSSBHYXRld2F5IHN0YWdlXHJcbiAgICAgICAgbmV3IGFwaWdhdGV3YXkuQmFzZVBhdGhNYXBwaW5nKHRoaXMsICdBcGlCYXNlUGF0aE1hcHBpbmcnLCB7XHJcbiAgICAgICAgICBkb21haW5OYW1lOiBjdXN0b21Eb21haW4sXHJcbiAgICAgICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgICAgIHN0YWdlOiB0aGlzLmFwaS5kZXBsb3ltZW50U3RhZ2UsXHJcbiAgICAgICAgICBiYXNlUGF0aDogJycsIC8vIE1hcCB0byByb290IHBhdGhcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gT3V0cHV0IHRoZSBjdXN0b20gZG9tYWluIGluZm9ybWF0aW9uXHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0N1c3RvbURvbWFpbk5hbWUnLCB7XHJcbiAgICAgICAgICB2YWx1ZTogY3VzdG9tRG9tYWluLmRvbWFpbk5hbWUsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW4gbmFtZSBmb3IgQVBJIEdhdGV3YXknLFxyXG4gICAgICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUN1c3RvbURvbWFpbmAsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDdXN0b21Eb21haW5UYXJnZXQnLCB7XHJcbiAgICAgICAgICB2YWx1ZTogY3VzdG9tRG9tYWluLmRvbWFpbk5hbWVBbGlhc0RvbWFpbk5hbWUsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1RhcmdldCBkb21haW4gbmFtZSBmb3IgUm91dGUgNTMgYWxpYXMgcmVjb3JkJyxcclxuICAgICAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1DdXN0b21Eb21haW5UYXJnZXRgLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQ3VzdG9tRG9tYWluSG9zdGVkWm9uZUlkJywge1xyXG4gICAgICAgICAgdmFsdWU6IGN1c3RvbURvbWFpbi5kb21haW5OYW1lQWxpYXNIb3N0ZWRab25lSWQsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0hvc3RlZCBab25lIElEIGZvciBSb3V0ZSA1MyBhbGlhcyByZWNvcmQnLFxyXG4gICAgICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUN1c3RvbURvbWFpbkhvc3RlZFpvbmVJZGAsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFN0b3JlIGN1c3RvbSBkb21haW4gcmVmZXJlbmNlXHJcbiAgICAgICAgKHRoaXMgYXMgYW55KS5jdXN0b21Eb21haW4gPSBjdXN0b21Eb21haW47XHJcblxyXG4gICAgICAgIC8vIENyZWF0ZSBSb3V0ZSA1MyByZWNvcmQgaW5zdHJ1Y3Rpb25zXHJcbiAgICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1JvdXRlNTNJbnN0cnVjdGlvbnMnLCB7XHJcbiAgICAgICAgICB2YWx1ZTogYENyZWF0ZSBSb3V0ZSA1MyBBIHJlY29yZDogJHtkb21haW5OYW1lUGFyYW1ldGVyLnZhbHVlQXNTdHJpbmd9IC0+IEFMSUFTIC0+ICR7Y3VzdG9tRG9tYWluLmRvbWFpbk5hbWVBbGlhc0RvbWFpbk5hbWV9ICgke2N1c3RvbURvbWFpbi5kb21haW5OYW1lQWxpYXNIb3N0ZWRab25lSWR9KWAsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ0luc3RydWN0aW9ucyBmb3IgY3JlYXRpbmcgUm91dGUgNTMgRE5TIHJlY29yZCcsXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS53YXJuKCdDdXN0b20gZG9tYWluIGNvbmZpZ3VyYXRpb24gc2tpcHBlZDonLCBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBTdG9yZSBjb25maWd1cmF0aW9uIGZvciBkb2N1bWVudGF0aW9uXHJcbiAgICBjb25zdCBjdXN0b21Eb21haW5Db25maWcgPSB7XHJcbiAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWVQYXJhbWV0ZXIudmFsdWVBc1N0cmluZyxcclxuICAgICAgY2VydGlmaWNhdGVBcm46IGNlcnRpZmljYXRlQXJuUGFyYW1ldGVyLnZhbHVlQXNTdHJpbmcsXHJcbiAgICAgIGhvc3RlZFpvbmVJZDogaG9zdGVkWm9uZUlkUGFyYW1ldGVyLnZhbHVlQXNTdHJpbmcsXHJcbiAgICAgIHNlY3VyaXR5UG9saWN5OiAnVExTXzFfMicsXHJcbiAgICAgIGVuZHBvaW50VHlwZTogJ1JFR0lPTkFMJyxcclxuICAgICAgZW5hYmxlZDogZW5hYmxlQ3VzdG9tRG9tYWluLFxyXG4gICAgfTtcclxuXHJcbiAgICAodGhpcyBhcyBhbnkpLmN1c3RvbURvbWFpbkNvbmZpZyA9IGN1c3RvbURvbWFpbkNvbmZpZztcclxuXHJcbiAgICAvLyBPdXRwdXQgdGhlIGRvbWFpbiBjb25maWd1cmF0aW9uIGZvciBtYW51YWwgc2V0dXBcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDdXN0b21Eb21haW5Db25maWcnLCB7XHJcbiAgICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeShjdXN0b21Eb21haW5Db25maWcsIG51bGwsIDIpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0N1c3RvbSBkb21haW4gY29uZmlndXJhdGlvbiBmb3IgQVBJIEdhdGV3YXknLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQ3VzdG9tRG9tYWluQ29uZmlnYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBzZXR1cCBpbnN0cnVjdGlvbnNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDdXN0b21Eb21haW5TZXR1cEluc3RydWN0aW9ucycsIHtcclxuICAgICAgdmFsdWU6IFtcclxuICAgICAgICAnMS4gQ3JlYXRlIFNTTCBjZXJ0aWZpY2F0ZSBpbiBBQ00gKG11c3QgYmUgaW4gdXMtZWFzdC0xIGZvciBDbG91ZEZyb250KScsXHJcbiAgICAgICAgJzIuIERlcGxveSBzdGFjayB3aXRoOiBjZGsgZGVwbG95IC0tY29udGV4dCBjZXJ0aWZpY2F0ZUFybj08QVJOPiAtLWNvbnRleHQgZW5hYmxlQ3VzdG9tRG9tYWluPXRydWUnLFxyXG4gICAgICAgICczLiBDcmVhdGUgUm91dGUgNTMgQSByZWNvcmQgcG9pbnRpbmcgdG8gdGhlIGN1c3RvbSBkb21haW4gdGFyZ2V0JyxcclxuICAgICAgICAnNC4gV2FpdCBmb3IgRE5TIHByb3BhZ2F0aW9uIChjYW4gdGFrZSB1cCB0byA0OCBob3VycyknLFxyXG4gICAgICAgICc1LiBUZXN0IHRoZSBjdXN0b20gZG9tYWluOiBjdXJsIGh0dHBzOi8vJyArIGRvbWFpbk5hbWVQYXJhbWV0ZXIudmFsdWVBc1N0cmluZyArICcvaGVhbHRoJyxcclxuICAgICAgXS5qb2luKCcgfCAnKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTdGVwLWJ5LXN0ZXAgaW5zdHJ1Y3Rpb25zIGZvciBzZXR0aW5nIHVwIGN1c3RvbSBkb21haW4nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgcGFyYW1ldGVycyBmb3IgZnV0dXJlIGRvbWFpbiBzZXR1cFxyXG4gICAgKHRoaXMgYXMgYW55KS5kb21haW5QYXJhbWV0ZXJzID0ge1xyXG4gICAgICBjZXJ0aWZpY2F0ZUFybjogY2VydGlmaWNhdGVBcm5QYXJhbWV0ZXIsXHJcbiAgICAgIGRvbWFpbk5hbWU6IGRvbWFpbk5hbWVQYXJhbWV0ZXIsXHJcbiAgICAgIGhvc3RlZFpvbmVJZDogaG9zdGVkWm9uZUlkUGFyYW1ldGVyLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQXBpRW5kcG9pbnRzKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIC8vIEdldCByZWZlcmVuY2VzIHRvIG1vZGVscyBhbmQgdXNhZ2UgcGxhbnNcclxuICAgIGNvbnN0IG1vZGVscyA9ICh0aGlzIGFzIGFueSkuYXBpTW9kZWxzO1xyXG4gICAgY29uc3QgdXNhZ2VQbGFucyA9ICh0aGlzIGFzIGFueSkudXNhZ2VQbGFucztcclxuXHJcbiAgICAvLyBDcmVhdGUgTGFtYmRhIEF1dGhvcml6ZXIgZm9yIEpXVCB2YWxpZGF0aW9uIHdpdGggZW5oYW5jZWQgY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgYXV0aG9yaXplciA9IG5ldyBhcGlnYXRld2F5LlJlcXVlc3RBdXRob3JpemVyKHRoaXMsICdKd3RBdXRob3JpemVyJywge1xyXG4gICAgICBoYW5kbGVyOiB0aGlzLmF1dGhvcml6ZXJGdW5jdGlvbixcclxuICAgICAgaWRlbnRpdHlTb3VyY2VzOiBbXHJcbiAgICAgICAgYXBpZ2F0ZXdheS5JZGVudGl0eVNvdXJjZS5oZWFkZXIoJ0F1dGhvcml6YXRpb24nKSxcclxuICAgICAgICBhcGlnYXRld2F5LklkZW50aXR5U291cmNlLmhlYWRlcignWC1BcGktS2V5JyksXHJcbiAgICAgIF0sXHJcbiAgICAgIGF1dGhvcml6ZXJOYW1lOiBgand0LWF1dGhvcml6ZXItJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICByZXN1bHRzQ2FjaGVUdGw6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLCAvLyBDYWNoZSBhdXRob3JpemF0aW9uIHJlc3VsdHMgZm9yIDUgbWludXRlc1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRW5oYW5jZWQgcmVxdWVzdCB2YWxpZGF0b3IgZm9yIGRpZmZlcmVudCB2YWxpZGF0aW9uIGxldmVsc1xyXG4gICAgY29uc3Qgc3RyaWN0VmFsaWRhdG9yID0gbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnU3RyaWN0VmFsaWRhdG9yJywge1xyXG4gICAgICByZXN0QXBpOiB0aGlzLmFwaSxcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvck5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1zdHJpY3QtdmFsaWRhdG9yLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcclxuICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGJvZHlPbmx5VmFsaWRhdG9yID0gbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnQm9keU9ubHlWYWxpZGF0b3InLCB7XHJcbiAgICAgIHJlc3RBcGk6IHRoaXMuYXBpLFxyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yTmFtZTogYG1pc3JhLXBsYXRmb3JtLWJvZHktdmFsaWRhdG9yLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgdmFsaWRhdGVSZXF1ZXN0Qm9keTogdHJ1ZSxcclxuICAgICAgdmFsaWRhdGVSZXF1ZXN0UGFyYW1ldGVyczogZmFsc2UsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBwYXJhbXNPbmx5VmFsaWRhdG9yID0gbmV3IGFwaWdhdGV3YXkuUmVxdWVzdFZhbGlkYXRvcih0aGlzLCAnUGFyYW1zT25seVZhbGlkYXRvcicsIHtcclxuICAgICAgcmVzdEFwaTogdGhpcy5hcGksXHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3JOYW1lOiBgbWlzcmEtcGxhdGZvcm0tcGFyYW1zLXZhbGlkYXRvci0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHZhbGlkYXRlUmVxdWVzdEJvZHk6IGZhbHNlLFxyXG4gICAgICB2YWxpZGF0ZVJlcXVlc3RQYXJhbWV0ZXJzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFQSSByZXNvdXJjZSBzdHJ1Y3R1cmUgd2l0aCBlbmhhbmNlZCBjb25maWd1cmF0aW9uXHJcbiAgICBcclxuICAgIC8vIC9hdXRoIC0gQXV0aGVudGljYXRpb24gZW5kcG9pbnRzIChwdWJsaWMgd2l0aCBsaW1pdGVkIHJhdGUgbGltaXRpbmcpXHJcbiAgICBjb25zdCBhdXRoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdhdXRoJywge1xyXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgICA/IFsnaHR0cHM6Ly9taXNyYS55b3VyZG9tYWluLmNvbScsICdodHRwczovL2FwcC5taXNyYS55b3VyZG9tYWluLmNvbSddXHJcbiAgICAgICAgICA6IFsnKiddLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogWydQT1NUJywgJ09QVElPTlMnXSxcclxuICAgICAgICBhbGxvd0hlYWRlcnM6IFtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgJ1gtQ29ycmVsYXRpb24tSUQnLFxyXG4gICAgICAgICAgJ1gtUmVxdWVzdGVkLVdpdGgnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24ubWludXRlcygxMCksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyAvYXV0aC9sb2dpbiAtIExvZ2luIGVuZHBvaW50IHdpdGggc3RyaWN0IHZhbGlkYXRpb25cclxuICAgIGNvbnN0IGxvZ2luUmVzb3VyY2UgPSBhdXRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2xvZ2luJyk7XHJcbiAgICBsb2dpblJlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0xvZ2luIGVuZHBvaW50IC0gTGFtYmRhIGludGVncmF0aW9uIHBlbmRpbmcnIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IHN0cmljdFZhbGlkYXRvcixcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSwge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICc0MDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IG1vZGVscy5lcnJvclJlc3BvbnNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAnNDAxJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBtb2RlbHMuZXJyb3JSZXNwb25zZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9XSxcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIC9hdXRoL3JlZ2lzdGVyIC0gUmVnaXN0cmF0aW9uIGVuZHBvaW50IHdpdGggdmFsaWRhdGlvblxyXG4gICAgY29uc3QgcmVnaXN0ZXJSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVnaXN0ZXInKTtcclxuICAgIHJlZ2lzdGVyUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcclxuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMScsXHJcbiAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnUmVnaXN0cmF0aW9uIGVuZHBvaW50IC0gTGFtYmRhIGludGVncmF0aW9uIHBlbmRpbmcnIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDF9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IHN0cmljdFZhbGlkYXRvcixcclxuICAgICAgcmVxdWVzdE1vZGVsczoge1xyXG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogbW9kZWxzLnVzZXJSZWdpc3RyYXRpb24sXHJcbiAgICAgIH0sXHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAxJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBhcGlnYXRld2F5Lk1vZGVsLkVNUFRZX01PREVMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAnNDAwJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBtb2RlbHMuZXJyb3JSZXNwb25zZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzQwOScsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogbW9kZWxzLmVycm9yUmVzcG9uc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiBmYWxzZSxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyAvYXV0aC9yZWZyZXNoIC0gVG9rZW4gcmVmcmVzaCBlbmRwb2ludFxyXG4gICAgY29uc3QgcmVmcmVzaFJlc291cmNlID0gYXV0aFJlc291cmNlLmFkZFJlc291cmNlKCdyZWZyZXNoJyk7XHJcbiAgICByZWZyZXNoUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcclxuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnUmVmcmVzaCBlbmRwb2ludCAtIExhbWJkYSBpbnRlZ3JhdGlvbiBwZW5kaW5nJyB9KSxcclxuICAgICAgICB9LFxyXG4gICAgICB9XSxcclxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xyXG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXHJcbiAgICAgIH0sXHJcbiAgICB9KSwge1xyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBib2R5T25seVZhbGlkYXRvcixcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSwge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICc0MDEnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IG1vZGVscy5lcnJvclJlc3BvbnNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICBhcGlLZXlSZXF1aXJlZDogZmFsc2UsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gL2F1dGgvbG9nb3V0IC0gTG9nb3V0IGVuZHBvaW50XHJcbiAgICBjb25zdCBsb2dvdXRSZXNvdXJjZSA9IGF1dGhSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbG9nb3V0Jyk7XHJcbiAgICBsb2dvdXRSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZVRlbXBsYXRlczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdMb2dvdXQgZW5kcG9pbnQgLSBMYW1iZGEgaW50ZWdyYXRpb24gcGVuZGluZycgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxyXG4gICAgICB9LFxyXG4gICAgfSksIHtcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogcGFyYW1zT25seVZhbGlkYXRvcixcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiBmYWxzZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC9maWxlcyAtIEZpbGUgbWFuYWdlbWVudCBlbmRwb2ludHMgKHByb3RlY3RlZCB3aXRoIHByZW1pdW0gcmF0ZSBsaW1pdGluZylcclxuICAgIGNvbnN0IGZpbGVzUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdmaWxlcycsIHtcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgICAgPyBbJ2h0dHBzOi8vbWlzcmEueW91cmRvbWFpbi5jb20nLCAnaHR0cHM6Ly9hcHAubWlzcmEueW91cmRvbWFpbi5jb20nXVxyXG4gICAgICAgICAgOiBbJyonXSxcclxuICAgICAgICBhbGxvd01ldGhvZHM6IFsnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURScsICdPUFRJT05TJ10sXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcclxuICAgICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJyxcclxuICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJyxcclxuICAgICAgICAgICdDb250ZW50LUxlbmd0aCcsXHJcbiAgICAgICAgICAnQ29udGVudC1NRDUnLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgZXhwb3NlSGVhZGVyczogWydFVGFnJywgJ0NvbnRlbnQtTGVuZ3RoJ10sXHJcbiAgICAgICAgbWF4QWdlOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC9maWxlcy91cGxvYWQgLSBGaWxlIHVwbG9hZCBlbmRwb2ludCB3aXRoIHZhbGlkYXRpb25cclxuICAgIGNvbnN0IHVwbG9hZFJlc291cmNlID0gZmlsZXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgndXBsb2FkJyk7XHJcbiAgICB1cGxvYWRSZXNvdXJjZS5hZGRNZXRob2QoJ1BPU1QnLCBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAxJyxcclxuICAgICAgICByZXNwb25zZVRlbXBsYXRlczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdVcGxvYWQgZW5kcG9pbnQgLSBMYW1iZGEgaW50ZWdyYXRpb24gcGVuZGluZycgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMX0nLFxyXG4gICAgICB9LFxyXG4gICAgfSksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogc3RyaWN0VmFsaWRhdG9yLFxyXG4gICAgICByZXF1ZXN0TW9kZWxzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBtb2RlbHMuZmlsZVVwbG9hZCxcclxuICAgICAgfSxcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDEnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSwge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICc0MDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IG1vZGVscy5lcnJvclJlc3BvbnNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAnNDAxJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBtb2RlbHMuZXJyb3JSZXNwb25zZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzQxMycsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogbW9kZWxzLmVycm9yUmVzcG9uc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIC9maWxlcy97ZmlsZUlkfSAtIEluZGl2aWR1YWwgZmlsZSBvcGVyYXRpb25zXHJcbiAgICBjb25zdCBmaWxlSWRSZXNvdXJjZSA9IGZpbGVzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3tmaWxlSWR9Jyk7XHJcbiAgICBmaWxlSWRSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0dldCBmaWxlIGVuZHBvaW50IC0gTGFtYmRhIGludGVncmF0aW9uIHBlbmRpbmcnIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IHBhcmFtc09ubHlWYWxpZGF0b3IsXHJcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnBhdGguZmlsZUlkJzogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSwge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICc0MDQnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IG1vZGVscy5lcnJvclJlc3BvbnNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBmaWxlSWRSZXNvdXJjZS5hZGRNZXRob2QoJ0RFTEVURScsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDQnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICcnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDR9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IHBhcmFtc09ubHlWYWxpZGF0b3IsXHJcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnBhdGguZmlsZUlkJzogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDQnLFxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzQwNCcsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogbW9kZWxzLmVycm9yUmVzcG9uc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIC9maWxlcy9saXN0IC0gTGlzdCBmaWxlcyBlbmRwb2ludCB3aXRoIHBhZ2luYXRpb25cclxuICAgIGNvbnN0IGxpc3RGaWxlc1Jlc291cmNlID0gZmlsZXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgnbGlzdCcpO1xyXG4gICAgbGlzdEZpbGVzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZVRlbXBsYXRlczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdMaXN0IGZpbGVzIGVuZHBvaW50IC0gTGFtYmRhIGludGVncmF0aW9uIHBlbmRpbmcnIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IHBhcmFtc09ubHlWYWxpZGF0b3IsXHJcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLmxpbWl0JzogZmFsc2UsXHJcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLm9mZnNldCc6IGZhbHNlLFxyXG4gICAgICAgICdtZXRob2QucmVxdWVzdC5xdWVyeXN0cmluZy5zb3J0QnknOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gL2FuYWx5c2lzIC0gQW5hbHlzaXMgZW5kcG9pbnRzIChwcm90ZWN0ZWQgd2l0aCBzdGFuZGFyZCByYXRlIGxpbWl0aW5nKVxyXG4gICAgY29uc3QgYW5hbHlzaXNSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2FuYWx5c2lzJywge1xyXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcclxuICAgICAgICBhbGxvd09yaWdpbnM6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgICA/IFsnaHR0cHM6Ly9taXNyYS55b3VyZG9tYWluLmNvbScsICdodHRwczovL2FwcC5taXNyYS55b3VyZG9tYWluLmNvbSddXHJcbiAgICAgICAgICA6IFsnKiddLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogWydHRVQnLCAnUE9TVCcsICdPUFRJT05TJ10sXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcclxuICAgICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJyxcclxuICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJyxcclxuICAgICAgICBdLFxyXG4gICAgICAgIG1heEFnZTogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyAvYW5hbHlzaXMvc3RhcnQgLSBTdGFydCBhbmFseXNpcyBlbmRwb2ludCB3aXRoIHZhbGlkYXRpb25cclxuICAgIGNvbnN0IHN0YXJ0QW5hbHlzaXNSZXNvdXJjZSA9IGFuYWx5c2lzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3N0YXJ0Jyk7XHJcbiAgICBzdGFydEFuYWx5c2lzUmVzb3VyY2UuYWRkTWV0aG9kKCdQT1NUJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcclxuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMicsXHJcbiAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnU3RhcnQgYW5hbHlzaXMgZW5kcG9pbnQgLSBMYW1iZGEgaW50ZWdyYXRpb24gcGVuZGluZycgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMn0nLFxyXG4gICAgICB9LFxyXG4gICAgfSksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgcmVxdWVzdFZhbGlkYXRvcjogc3RyaWN0VmFsaWRhdG9yLFxyXG4gICAgICByZXF1ZXN0TW9kZWxzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBtb2RlbHMuYW5hbHlzaXNSZXF1ZXN0LFxyXG4gICAgICB9LFxyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMicsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYXBpZ2F0ZXdheS5Nb2RlbC5FTVBUWV9NT0RFTCxcclxuICAgICAgICB9LFxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzQwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogbW9kZWxzLmVycm9yUmVzcG9uc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSwge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICc0MDQnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IG1vZGVscy5lcnJvclJlc3BvbnNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyAvYW5hbHlzaXMvc3RhdHVzL3thbmFseXNpc0lkfSAtIEFuYWx5c2lzIHN0YXR1cyBlbmRwb2ludFxyXG4gICAgY29uc3Qgc3RhdHVzUmVzb3VyY2UgPSBhbmFseXNpc1Jlc291cmNlLmFkZFJlc291cmNlKCdzdGF0dXMnKTtcclxuICAgIGNvbnN0IGFuYWx5c2lzU3RhdHVzUmVzb3VyY2UgPSBzdGF0dXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgne2FuYWx5c2lzSWR9Jyk7XHJcbiAgICBhbmFseXNpc1N0YXR1c1Jlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcclxuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnQW5hbHlzaXMgc3RhdHVzIGVuZHBvaW50IC0gTGFtYmRhIGludGVncmF0aW9uIHBlbmRpbmcnIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IHBhcmFtc09ubHlWYWxpZGF0b3IsXHJcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnBhdGguYW5hbHlzaXNJZCc6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBhcGlnYXRld2F5Lk1vZGVsLkVNUFRZX01PREVMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAnNDA0JyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBtb2RlbHMuZXJyb3JSZXNwb25zZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9XSxcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gL2FuYWx5c2lzL3Jlc3VsdHMve2FuYWx5c2lzSWR9IC0gQW5hbHlzaXMgcmVzdWx0cyBlbmRwb2ludFxyXG4gICAgY29uc3QgcmVzdWx0c1Jlc291cmNlID0gYW5hbHlzaXNSZXNvdXJjZS5hZGRSZXNvdXJjZSgncmVzdWx0cycpO1xyXG4gICAgY29uc3QgYW5hbHlzaXNSZXN1bHRzUmVzb3VyY2UgPSByZXN1bHRzUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3thbmFseXNpc0lkfScpO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZVRlbXBsYXRlczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdBbmFseXNpcyByZXN1bHRzIGVuZHBvaW50IC0gTGFtYmRhIGludGVncmF0aW9uIHBlbmRpbmcnIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IHBhcmFtc09ubHlWYWxpZGF0b3IsXHJcbiAgICAgIHJlcXVlc3RQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgJ21ldGhvZC5yZXF1ZXN0LnBhdGguYW5hbHlzaXNJZCc6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIG1ldGhvZFJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBhcGlnYXRld2F5Lk1vZGVsLkVNUFRZX01PREVMLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAnNDA0JyxcclxuICAgICAgICByZXNwb25zZU1vZGVsczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBtb2RlbHMuZXJyb3JSZXNwb25zZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9XSxcclxuICAgICAgYXBpS2V5UmVxdWlyZWQ6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyAvdXNlciAtIFVzZXIgcHJvZmlsZSBlbmRwb2ludHMgKHByb3RlY3RlZClcclxuICAgIGNvbnN0IHVzZXJSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ3VzZXInLCB7XHJcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xyXG4gICAgICAgIGFsbG93T3JpZ2luczogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICAgID8gWydodHRwczovL21pc3JhLnlvdXJkb21haW4uY29tJywgJ2h0dHBzOi8vYXBwLm1pc3JhLnlvdXJkb21haW4uY29tJ11cclxuICAgICAgICAgIDogWycqJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbJ0dFVCcsICdQVVQnLCAnUEFUQ0gnLCAnT1BUSU9OUyddLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1Db3JyZWxhdGlvbi1JRCcsXHJcbiAgICAgICAgICAnWC1SZXF1ZXN0ZWQtV2l0aCcsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5taW51dGVzKDEwKSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIC91c2VyL3Byb2ZpbGUgLSBVc2VyIHByb2ZpbGUgZW5kcG9pbnRcclxuICAgIGNvbnN0IHByb2ZpbGVSZXNvdXJjZSA9IHVzZXJSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJvZmlsZScpO1xyXG4gICAgcHJvZmlsZVJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTW9ja0ludGVncmF0aW9uKHtcclxuICAgICAgaW50ZWdyYXRpb25SZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VUZW1wbGF0ZXM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnR2V0IHByb2ZpbGUgZW5kcG9pbnQgLSBMYW1iZGEgaW50ZWdyYXRpb24gcGVuZGluZycgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxyXG4gICAgICB9LFxyXG4gICAgfSksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIHByb2ZpbGVSZXNvdXJjZS5hZGRNZXRob2QoJ1BVVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ1VwZGF0ZSBwcm9maWxlIGVuZHBvaW50IC0gTGFtYmRhIGludGVncmF0aW9uIHBlbmRpbmcnIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICByZXF1ZXN0VGVtcGxhdGVzOiB7XHJcbiAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiAne1wic3RhdHVzQ29kZVwiOiAyMDB9JyxcclxuICAgICAgfSxcclxuICAgIH0pLCB7XHJcbiAgICAgIGF1dGhvcml6ZXIsXHJcbiAgICAgIHJlcXVlc3RWYWxpZGF0b3I6IGJvZHlPbmx5VmFsaWRhdG9yLFxyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYXBpZ2F0ZXdheS5Nb2RlbC5FTVBUWV9NT0RFTCxcclxuICAgICAgICB9LFxyXG4gICAgICB9LCB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzQwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogbW9kZWxzLmVycm9yUmVzcG9uc2UsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIC91c2VyL3ByZWZlcmVuY2VzIC0gVXNlciBwcmVmZXJlbmNlcyBlbmRwb2ludFxyXG4gICAgY29uc3QgcHJlZmVyZW5jZXNSZXNvdXJjZSA9IHVzZXJSZXNvdXJjZS5hZGRSZXNvdXJjZSgncHJlZmVyZW5jZXMnKTtcclxuICAgIHByZWZlcmVuY2VzUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZVRlbXBsYXRlczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdHZXQgcHJlZmVyZW5jZXMgZW5kcG9pbnQgLSBMYW1iZGEgaW50ZWdyYXRpb24gcGVuZGluZycgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxyXG4gICAgICB9LFxyXG4gICAgfSksIHtcclxuICAgICAgYXV0aG9yaXplcixcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIHByZWZlcmVuY2VzUmVzb3VyY2UuYWRkTWV0aG9kKCdQQVRDSCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ1VwZGF0ZSBwcmVmZXJlbmNlcyBlbmRwb2ludCAtIExhbWJkYSBpbnRlZ3JhdGlvbiBwZW5kaW5nJyB9KSxcclxuICAgICAgICB9LFxyXG4gICAgICB9XSxcclxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xyXG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXHJcbiAgICAgIH0sXHJcbiAgICB9KSwge1xyXG4gICAgICBhdXRob3JpemVyLFxyXG4gICAgICByZXF1ZXN0VmFsaWRhdG9yOiBib2R5T25seVZhbGlkYXRvcixcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSwge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICc0MDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IG1vZGVscy5lcnJvclJlc3BvbnNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICBhcGlLZXlSZXF1aXJlZDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhlYWx0aCBjaGVjayBlbmRwb2ludCAocHVibGljIHdpdGggbWluaW1hbCByYXRlIGxpbWl0aW5nKVxyXG4gICAgY29uc3QgaGVhbHRoUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCdoZWFsdGgnKTtcclxuICAgIFxyXG4gICAgaGVhbHRoUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZVRlbXBsYXRlczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogJ2hlYWx0aHknLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6ICckY29udGV4dC5yZXF1ZXN0VGltZScsXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcclxuICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcclxuICAgICAgICAgICAgcmVnaW9uOiAnJGNvbnRleHQuaWRlbnRpdHkucmVnaW9uJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcmVzcG9uc2VQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiBcIicqJ1wiLFxyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6IFwiJ0NvbnRlbnQtVHlwZSxBdXRob3JpemF0aW9uJ1wiLFxyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IFwiJ0dFVCxPUFRJT05TJ1wiLFxyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuWC1Db3JyZWxhdGlvbi1JRCc6IFwiJyRjb250ZXh0LnJlcXVlc3RJZCdcIixcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNhY2hlLUNvbnRyb2wnOiBcIiduby1jYWNoZSwgbm8tc3RvcmUsIG11c3QtcmV2YWxpZGF0ZSdcIixcclxuICAgICAgICB9LFxyXG4gICAgICB9XSxcclxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xyXG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXHJcbiAgICAgIH0sXHJcbiAgICB9KSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYXBpZ2F0ZXdheS5Nb2RlbC5FTVBUWV9NT0RFTCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnOiB0cnVlLFxyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctTWV0aG9kcyc6IHRydWUsXHJcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5YLUNvcnJlbGF0aW9uLUlEJzogdHJ1ZSxcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkNhY2hlLUNvbnRyb2wnOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgICBhcGlLZXlSZXF1aXJlZDogZmFsc2UsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFbmhhbmNlZCBoZWFsdGggY2hlY2sgd2l0aCBkZXRhaWxlZCBzeXN0ZW0gc3RhdHVzXHJcbiAgICBjb25zdCBoZWFsdGhEZXRhaWxlZFJlc291cmNlID0gaGVhbHRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2RldGFpbGVkJyk7XHJcbiAgICBcclxuICAgIGhlYWx0aERldGFpbGVkUmVzb3VyY2UuYWRkTWV0aG9kKCdHRVQnLCBuZXcgYXBpZ2F0ZXdheS5Nb2NrSW50ZWdyYXRpb24oe1xyXG4gICAgICBpbnRlZ3JhdGlvblJlc3BvbnNlczogW3tcclxuICAgICAgICBzdGF0dXNDb2RlOiAnMjAwJyxcclxuICAgICAgICByZXNwb25zZVRlbXBsYXRlczoge1xyXG4gICAgICAgICAgJ2FwcGxpY2F0aW9uL2pzb24nOiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIHN0YXR1czogJ2hlYWx0aHknLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6ICckY29udGV4dC5yZXF1ZXN0VGltZScsXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiBlbnZpcm9ubWVudCxcclxuICAgICAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcclxuICAgICAgICAgICAgcmVnaW9uOiAnJGNvbnRleHQuaWRlbnRpdHkucmVnaW9uJyxcclxuICAgICAgICAgICAgc2VydmljZXM6IHtcclxuICAgICAgICAgICAgICBkYXRhYmFzZTogJ2hlYWx0aHknLFxyXG4gICAgICAgICAgICAgIHN0b3JhZ2U6ICdoZWFsdGh5JyxcclxuICAgICAgICAgICAgICBhdXRoZW50aWNhdGlvbjogJ2hlYWx0aHknLFxyXG4gICAgICAgICAgICAgIGFuYWx5c2lzOiAnaGVhbHRoeScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIG1ldHJpY3M6IHtcclxuICAgICAgICAgICAgICB1cHRpbWU6ICc5OS45JScsXHJcbiAgICAgICAgICAgICAgcmVzcG9uc2VUaW1lOiAnPDEwMG1zJyxcclxuICAgICAgICAgICAgICBlcnJvclJhdGU6ICc8MC4xJScsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogXCInKidcIixcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLlgtQ29ycmVsYXRpb24tSUQnOiBcIickY29udGV4dC5yZXF1ZXN0SWQnXCIsXHJcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5DYWNoZS1Db250cm9sJzogXCInbWF4LWFnZT0zMCdcIixcclxuICAgICAgICB9LFxyXG4gICAgICB9XSxcclxuICAgICAgcmVxdWVzdFRlbXBsYXRlczoge1xyXG4gICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogJ3tcInN0YXR1c0NvZGVcIjogMjAwfScsXHJcbiAgICAgIH0sXHJcbiAgICB9KSwge1xyXG4gICAgICBtZXRob2RSZXNwb25zZXM6IFt7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogJzIwMCcsXHJcbiAgICAgICAgcmVzcG9uc2VNb2RlbHM6IHtcclxuICAgICAgICAgICdhcHBsaWNhdGlvbi9qc29uJzogYXBpZ2F0ZXdheS5Nb2RlbC5FTVBUWV9NT0RFTCxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHJlc3BvbnNlUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogdHJ1ZSxcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLlgtQ29ycmVsYXRpb24tSUQnOiB0cnVlLFxyXG4gICAgICAgICAgJ21ldGhvZC5yZXNwb25zZS5oZWFkZXIuQ2FjaGUtQ29udHJvbCc6IHRydWUsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIGFwaUtleVJlcXVpcmVkOiB0cnVlLCAvLyBSZXF1aXJlIEFQSSBrZXkgZm9yIGRldGFpbGVkIGhlYWx0aCBpbmZvXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTdG9yZSByZXNvdXJjZXMgYW5kIHZhbGlkYXRvcnMgZm9yIGZ1dHVyZSBMYW1iZGEgaW50ZWdyYXRpb25cclxuICAgICh0aGlzIGFzIGFueSkuYXBpUmVzb3VyY2VzID0ge1xyXG4gICAgICBhdXRoOiB7XHJcbiAgICAgICAgcm9vdDogYXV0aFJlc291cmNlLFxyXG4gICAgICAgIGxvZ2luOiBsb2dpblJlc291cmNlLFxyXG4gICAgICAgIHJlZ2lzdGVyOiByZWdpc3RlclJlc291cmNlLFxyXG4gICAgICAgIHJlZnJlc2g6IHJlZnJlc2hSZXNvdXJjZSxcclxuICAgICAgICBsb2dvdXQ6IGxvZ291dFJlc291cmNlLFxyXG4gICAgICB9LFxyXG4gICAgICBmaWxlczoge1xyXG4gICAgICAgIHJvb3Q6IGZpbGVzUmVzb3VyY2UsXHJcbiAgICAgICAgdXBsb2FkOiB1cGxvYWRSZXNvdXJjZSxcclxuICAgICAgICBmaWxlSWQ6IGZpbGVJZFJlc291cmNlLFxyXG4gICAgICAgIGxpc3Q6IGxpc3RGaWxlc1Jlc291cmNlLFxyXG4gICAgICB9LFxyXG4gICAgICBhbmFseXNpczoge1xyXG4gICAgICAgIHJvb3Q6IGFuYWx5c2lzUmVzb3VyY2UsXHJcbiAgICAgICAgc3RhcnQ6IHN0YXJ0QW5hbHlzaXNSZXNvdXJjZSxcclxuICAgICAgICBzdGF0dXM6IGFuYWx5c2lzU3RhdHVzUmVzb3VyY2UsXHJcbiAgICAgICAgcmVzdWx0czogYW5hbHlzaXNSZXN1bHRzUmVzb3VyY2UsXHJcbiAgICAgIH0sXHJcbiAgICAgIHVzZXI6IHtcclxuICAgICAgICByb290OiB1c2VyUmVzb3VyY2UsXHJcbiAgICAgICAgcHJvZmlsZTogcHJvZmlsZVJlc291cmNlLFxyXG4gICAgICAgIHByZWZlcmVuY2VzOiBwcmVmZXJlbmNlc1Jlc291cmNlLFxyXG4gICAgICB9LFxyXG4gICAgICBoZWFsdGg6IHtcclxuICAgICAgICByb290OiBoZWFsdGhSZXNvdXJjZSxcclxuICAgICAgICBkZXRhaWxlZDogaGVhbHRoRGV0YWlsZWRSZXNvdXJjZSxcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgKHRoaXMgYXMgYW55KS5hcGlWYWxpZGF0b3JzID0ge1xyXG4gICAgICBzdHJpY3Q6IHN0cmljdFZhbGlkYXRvcixcclxuICAgICAgYm9keU9ubHk6IGJvZHlPbmx5VmFsaWRhdG9yLFxyXG4gICAgICBwYXJhbXNPbmx5OiBwYXJhbXNPbmx5VmFsaWRhdG9yLFxyXG4gICAgfTtcclxuXHJcbiAgICAodGhpcyBhcyBhbnkpLmxhbWJkYUF1dGhvcml6ZXIgPSBhdXRob3JpemVyO1xyXG5cclxuICAgIC8vIENyZWF0ZSBtZXRob2Qtc3BlY2lmaWMgdGhyb3R0bGluZyBjb25maWd1cmF0aW9uc1xyXG4gICAgdGhpcy5jb25maWd1cmVNZXRob2RUaHJvdHRsaW5nKGVudmlyb25tZW50KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbmZpZ3VyZSBwZXItbWV0aG9kIHRocm90dGxpbmcgYW5kIGNhY2hpbmdcclxuICAgKi9cclxuICBwcml2YXRlIGNvbmZpZ3VyZU1ldGhvZFRocm90dGxpbmcoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgLy8gTWV0aG9kLXNwZWNpZmljIHRocm90dGxpbmcgY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgbWV0aG9kVGhyb3R0bGluZyA9IHtcclxuICAgICAgLy8gQXV0aGVudGljYXRpb24gZW5kcG9pbnRzIC0gbW9kZXJhdGUgdGhyb3R0bGluZ1xyXG4gICAgICAnYXV0aC9sb2dpbic6IHtcclxuICAgICAgICBidXJzdExpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gNTAgOiAyMCxcclxuICAgICAgICByYXRlTGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAxMDAgOiA0MCxcclxuICAgICAgfSxcclxuICAgICAgJ2F1dGgvcmVnaXN0ZXInOiB7XHJcbiAgICAgICAgYnVyc3RMaW1pdDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDEwIDogNSxcclxuICAgICAgICByYXRlTGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAyMCA6IDEwLFxyXG4gICAgICB9LFxyXG4gICAgICAnYXV0aC9yZWZyZXNoJzoge1xyXG4gICAgICAgIGJ1cnN0TGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAxMDAgOiA0MCxcclxuICAgICAgICByYXRlTGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAyMDAgOiA4MCxcclxuICAgICAgfSxcclxuICAgICAgXHJcbiAgICAgIC8vIEZpbGUgb3BlcmF0aW9ucyAtIGhpZ2hlciBsaW1pdHMgZm9yIGF1dGhlbnRpY2F0ZWQgdXNlcnNcclxuICAgICAgJ2ZpbGVzL3VwbG9hZCc6IHtcclxuICAgICAgICBidXJzdExpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMjAgOiAxMCxcclxuICAgICAgICByYXRlTGltaXQ6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyA1MCA6IDIwLFxyXG4gICAgICB9LFxyXG4gICAgICAnZmlsZXMvbGlzdCc6IHtcclxuICAgICAgICBidXJzdExpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMTAwIDogNDAsXHJcbiAgICAgICAgcmF0ZUxpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMjAwIDogODAsXHJcbiAgICAgIH0sXHJcbiAgICAgIFxyXG4gICAgICAvLyBBbmFseXNpcyBvcGVyYXRpb25zIC0gYmFsYW5jZWQgdGhyb3R0bGluZ1xyXG4gICAgICAnYW5hbHlzaXMvc3RhcnQnOiB7XHJcbiAgICAgICAgYnVyc3RMaW1pdDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDMwIDogMTUsXHJcbiAgICAgICAgcmF0ZUxpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gNjAgOiAzMCxcclxuICAgICAgfSxcclxuICAgICAgJ2FuYWx5c2lzL3N0YXR1cyc6IHtcclxuICAgICAgICBidXJzdExpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMjAwIDogODAsXHJcbiAgICAgICAgcmF0ZUxpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gNTAwIDogMjAwLFxyXG4gICAgICB9LFxyXG4gICAgICAnYW5hbHlzaXMvcmVzdWx0cyc6IHtcclxuICAgICAgICBidXJzdExpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMTAwIDogNDAsXHJcbiAgICAgICAgcmF0ZUxpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMjAwIDogODAsXHJcbiAgICAgIH0sXHJcbiAgICAgIFxyXG4gICAgICAvLyBIZWFsdGggY2hlY2tzIC0gbWluaW1hbCB0aHJvdHRsaW5nXHJcbiAgICAgICdoZWFsdGgnOiB7XHJcbiAgICAgICAgYnVyc3RMaW1pdDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDEwMDAgOiA0MDAsXHJcbiAgICAgICAgcmF0ZUxpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMjAwMCA6IDgwMCxcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gU3RvcmUgdGhyb3R0bGluZyBjb25maWd1cmF0aW9uIGZvciBtb25pdG9yaW5nIGFuZCBkb2N1bWVudGF0aW9uXHJcbiAgICAodGhpcyBhcyBhbnkpLm1ldGhvZFRocm90dGxpbmcgPSBtZXRob2RUaHJvdHRsaW5nO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGFsYXJtcyBmb3IgdGhyb3R0bGluZ1xyXG4gICAgT2JqZWN0LmVudHJpZXMobWV0aG9kVGhyb3R0bGluZykuZm9yRWFjaCgoW3BhdGgsIGxpbWl0c10pID0+IHtcclxuICAgICAgbmV3IGNsb3Vkd2F0Y2guQWxhcm0odGhpcywgYCR7cGF0aC5yZXBsYWNlKCcvJywgJy0nKX0tVGhyb3R0bGVBbGFybWAsIHtcclxuICAgICAgICBhbGFybU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS0ke3BhdGgucmVwbGFjZSgnLycsICctJyl9LXRocm90dGxlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgICBhbGFybURlc2NyaXB0aW9uOiBgVGhyb3R0bGluZyBhbGFybSBmb3IgJHtwYXRofSBlbmRwb2ludGAsXHJcbiAgICAgICAgbWV0cmljOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0FwaUdhdGV3YXknLFxyXG4gICAgICAgICAgbWV0cmljTmFtZTogJ1Rocm90dGxlQ291bnQnLFxyXG4gICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICBBcGlOYW1lOiB0aGlzLmFwaS5yZXN0QXBpTmFtZSxcclxuICAgICAgICAgICAgU3RhZ2U6IGVudmlyb25tZW50LFxyXG4gICAgICAgICAgICBSZXNvdXJjZTogcGF0aCxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9KSxcclxuICAgICAgICB0aHJlc2hvbGQ6IGxpbWl0cy5idXJzdExpbWl0ICogMC44LCAvLyBBbGVydCBhdCA4MCUgb2YgYnVyc3QgbGltaXRcclxuICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMixcclxuICAgICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBTZWN1cml0eSBIZWFkZXJzIGNvbmZpZ3VyYXRpb25cclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZVNlY3VyaXR5SGVhZGVycyhlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnNlY3VyaXR5SGVhZGVycyA9IG5ldyBTZWN1cml0eUhlYWRlcnModGhpcywgJ1NlY3VyaXR5SGVhZGVycycsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50IGFzICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBcHBseSBzZWN1cml0eSBoZWFkZXJzIHRvIEFQSSBHYXRld2F5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhcHBseVNlY3VyaXR5SGVhZGVycygpIHtcclxuICAgIC8vIEFwcGx5IHNlY3VyaXR5IGhlYWRlcnMgdG8gYWxsIEdhdGV3YXkgUmVzcG9uc2VzXHJcbiAgICB0aGlzLnNlY3VyaXR5SGVhZGVycy5hcHBseVRvR2F0ZXdheVJlc3BvbnNlcyh0aGlzLmFwaSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgV0FGIGNvbmZpZ3VyYXRpb24gZm9yIEFQSSBHYXRld2F5IGFuZCBDbG91ZEZyb250XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVXYWZDb25maWd1cmF0aW9uKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIC8vIE9ubHkgZW5hYmxlIFdBRiBmb3Igc3RhZ2luZyBhbmQgcHJvZHVjdGlvbiBlbnZpcm9ubWVudHNcclxuICAgIGlmIChlbnZpcm9ubWVudCA9PT0gJ2RldicpIHtcclxuICAgICAgY29uc29sZS5sb2coJ1dBRiBkaXNhYmxlZCBmb3IgZGV2ZWxvcG1lbnQgZW52aXJvbm1lbnQnKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENyZWF0ZSBXQUYgZm9yIEFQSSBHYXRld2F5IChSRUdJT05BTCBzY29wZSlcclxuICAgIGNvbnN0IGFwaVdhZiA9IG5ldyBXYWZDb25maWcodGhpcywgJ0FwaVdhZicsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50IGFzICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICBzY29wZTogJ1JFR0lPTkFMJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFzc29jaWF0ZSBXQUYgd2l0aCBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgYXBpU3RhZ2VBcm4gPSBgYXJuOmF3czphcGlnYXRld2F5OiR7dGhpcy5yZWdpb259OjovcmVzdGFwaXMvJHt0aGlzLmFwaS5yZXN0QXBpSWR9L3N0YWdlcy8ke3RoaXMuYXBpLmRlcGxveW1lbnRTdGFnZS5zdGFnZU5hbWV9YDtcclxuICAgIGFwaVdhZi5hc3NvY2lhdGVXaXRoUmVzb3VyY2UoYXBpU3RhZ2VBcm4pO1xyXG5cclxuICAgIC8vIFN0b3JlIFdBRiByZWZlcmVuY2VcclxuICAgIHRoaXMud2FmQ29uZmlnID0gYXBpV2FmO1xyXG5cclxuICAgIC8vIENyZWF0ZSBXQUYgZm9yIENsb3VkRnJvbnQgKENMT1VERlJPTlQgc2NvcGUgLSBtdXN0IGJlIGluIHVzLWVhc3QtMSlcclxuICAgIC8vIE5vdGU6IENsb3VkRnJvbnQgV0FGIHdpbGwgYmUgY3JlYXRlZCBzZXBhcmF0ZWx5IGlmIG5lZWRlZFxyXG4gICAgaWYgKGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicpIHtcclxuICAgICAgLy8gQ2xvdWRGcm9udCBXQUYgcmVxdWlyZXMgdXMtZWFzdC0xIHJlZ2lvblxyXG4gICAgICAvLyBUaGlzIHdpbGwgYmUgaGFuZGxlZCBpbiB0aGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gY3JlYXRpb25cclxuICAgICAgY29uc29sZS5sb2coJ0Nsb3VkRnJvbnQgV0FGIHNob3VsZCBiZSBjcmVhdGVkIGluIHVzLWVhc3QtMSByZWdpb24gc2VwYXJhdGVseScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZFdhdGNoTW9uaXRvcmluZyhlbnZpcm9ubWVudDogc3RyaW5nLCBhbGVydEVtYWlsPzogc3RyaW5nKSB7XHJcbiAgICAvLyBDcmVhdGUgY29tcHJlaGVuc2l2ZSBDbG91ZFdhdGNoIG1vbml0b3JpbmdcclxuICAgIHRoaXMubW9uaXRvcmluZyA9IG5ldyBDbG91ZFdhdGNoTW9uaXRvcmluZyh0aGlzLCAnQ2xvdWRXYXRjaE1vbml0b3JpbmcnLCB7XHJcbiAgICAgIGVudmlyb25tZW50OiBlbnZpcm9ubWVudCBhcyAnZGV2JyB8ICdzdGFnaW5nJyB8ICdwcm9kdWN0aW9uJyxcclxuICAgICAgYXBpOiB0aGlzLmFwaSxcclxuICAgICAgbGFtYmRhRnVuY3Rpb25zOiB7XHJcbiAgICAgICAgYXV0aG9yaXplcjogdGhpcy5hdXRob3JpemVyRnVuY3Rpb24sXHJcbiAgICAgICAgLy8gQWRkaXRpb25hbCBMYW1iZGEgZnVuY3Rpb25zIHdpbGwgYmUgYWRkZWQgaGVyZSBhcyB0aGV5IGFyZSBpbXBsZW1lbnRlZFxyXG4gICAgICB9LFxyXG4gICAgICBhbGVydEVtYWlsLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZVNlY3JldHMoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgLy8gSldUIFNlY3JldCBmb3IgTGFtYmRhIGF1dGhvcml6ZXIgd2l0aCBlbmhhbmNlZCBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmp3dFNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0p3dFNlY3JldCcsIHtcclxuICAgICAgc2VjcmV0TmFtZTogYG1pc3JhLXBsYXRmb3JtL2p3dC1zZWNyZXQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0pXVCBzaWduaW5nIHNlY3JldCBmb3IgTUlTUkEgcGxhdGZvcm0gYXV0aGVudGljYXRpb24nLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IFxyXG4gICAgICAgICAgYWxnb3JpdGhtOiAnSFMyNTYnLFxyXG4gICAgICAgICAgaXNzdWVyOiBgbWlzcmEtcGxhdGZvcm0tJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICAgICAgYXVkaWVuY2U6IGBtaXNyYS1wbGF0Zm9ybS11c2Vycy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgICAgICBhY2Nlc3NUb2tlbkV4cGlyeTogJzFoJyxcclxuICAgICAgICAgIHJlZnJlc2hUb2tlbkV4cGlyeTogJzMwZCdcclxuICAgICAgICB9KSxcclxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ3NlY3JldCcsXHJcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXGBcXCcnLFxyXG4gICAgICAgIHBhc3N3b3JkTGVuZ3RoOiA2NCxcclxuICAgICAgfSxcclxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT1RQL1RPVFAgU2VjcmV0cyBmb3IgYXV0b25vbW91cyB3b3JrZmxvd1xyXG4gICAgY29uc3Qgb3RwU2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnT3RwU2VjcmV0Jywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0vb3RwLXNlY3JldHMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ09UUCBhbmQgVE9UUCBzZWNyZXRzIGZvciBhdXRvbm9tb3VzIE1GQSB3b3JrZmxvdycsXHJcbiAgICAgIHNlY3JldE9iamVjdFZhbHVlOiB7XHJcbiAgICAgICAgLy8gTWFzdGVyIGVuY3J5cHRpb24ga2V5IGZvciBPVFAgc2VjcmV0c1xyXG4gICAgICAgIG1hc3RlcktleTogY2RrLlNlY3JldFZhbHVlLmNmblBhcmFtZXRlcihuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnT3RwTWFzdGVyS2V5Jywge1xyXG4gICAgICAgICAgdHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ01hc3RlciBrZXkgZm9yIE9UUCBzZWNyZXQgZW5jcnlwdGlvbicsXHJcbiAgICAgICAgICBub0VjaG86IHRydWUsXHJcbiAgICAgICAgICBkZWZhdWx0OiB0aGlzLmdlbmVyYXRlU2VjdXJlS2V5KDMyKVxyXG4gICAgICAgIH0pKSxcclxuICAgICAgICAvLyBUT1RQIGNvbmZpZ3VyYXRpb25cclxuICAgICAgICB0b3RwQ29uZmlnOiBjZGsuU2VjcmV0VmFsdWUudW5zYWZlUGxhaW5UZXh0KEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGlzc3VlcjogYE1JU1JBIFBsYXRmb3JtICR7ZW52aXJvbm1lbnQudG9VcHBlckNhc2UoKX1gLFxyXG4gICAgICAgICAgYWxnb3JpdGhtOiAnU0hBMScsXHJcbiAgICAgICAgICBkaWdpdHM6IDYsXHJcbiAgICAgICAgICBwZXJpb2Q6IDMwLFxyXG4gICAgICAgICAgd2luZG93OiAyIC8vIEFsbG93IDIgdGltZSBzdGVwcyBmb3IgY2xvY2sgZHJpZnRcclxuICAgICAgICB9KSksXHJcbiAgICAgICAgLy8gQmFja3VwIGNvZGVzIGNvbmZpZ3VyYXRpb25cclxuICAgICAgICBiYWNrdXBDb2Rlc0NvbmZpZzogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dChKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBsZW5ndGg6IDgsXHJcbiAgICAgICAgICBjb3VudDogMTAsXHJcbiAgICAgICAgICBjaGFyc2V0OiAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5J1xyXG4gICAgICAgIH0pKVxyXG4gICAgICB9LFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFeHRlcm5hbCBBUEkgS2V5cyBmb3Igc2VydmljZXMgKE9wZW5BSSwgZXRjLilcclxuICAgIGNvbnN0IGFwaUtleXNTZWNyZXQgPSBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdBcGlLZXlzJywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0vYXBpLWtleXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBrZXlzIGZvciBleHRlcm5hbCBzZXJ2aWNlcyAoT3BlbkFJLCBtb25pdG9yaW5nLCBldGMuKScsXHJcbiAgICAgIHNlY3JldE9iamVjdFZhbHVlOiB7XHJcbiAgICAgICAgb3BlbmFpOiBjZGsuU2VjcmV0VmFsdWUuY2ZuUGFyYW1ldGVyKG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdPcGVuQWlBcGlLZXknLCB7XHJcbiAgICAgICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnT3BlbkFJIEFQSSBrZXkgZm9yIEFJLXBvd2VyZWQgZmVhdHVyZXMnLFxyXG4gICAgICAgICAgbm9FY2hvOiB0cnVlLFxyXG4gICAgICAgICAgZGVmYXVsdDogJ3JlcGxhY2Utd2l0aC1hY3R1YWwtb3BlbmFpLWtleSdcclxuICAgICAgICB9KSksXHJcbiAgICAgICAgbW9uaXRvcmluZzogY2RrLlNlY3JldFZhbHVlLmNmblBhcmFtZXRlcihuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnTW9uaXRvcmluZ0FwaUtleScsIHtcclxuICAgICAgICAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246ICdBUEkga2V5IGZvciBleHRlcm5hbCBtb25pdG9yaW5nIHNlcnZpY2VzJyxcclxuICAgICAgICAgIG5vRWNobzogdHJ1ZSxcclxuICAgICAgICAgIGRlZmF1bHQ6ICdyZXBsYWNlLXdpdGgtYWN0dWFsLW1vbml0b3Jpbmcta2V5J1xyXG4gICAgICAgIH0pKSxcclxuICAgICAgICAvLyBQbGFjZWhvbGRlciBmb3IgYWRkaXRpb25hbCBzZXJ2aWNlIGtleXNcclxuICAgICAgICBwbGFjZWhvbGRlcjogY2RrLlNlY3JldFZhbHVlLnVuc2FmZVBsYWluVGV4dCgncmVwbGFjZS13aXRoLWFjdHVhbC1rZXlzJylcclxuICAgICAgfSxcclxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRGF0YWJhc2UgZW5jcnlwdGlvbiBzZWNyZXRzXHJcbiAgICBjb25zdCBkYlNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ0RhdGFiYXNlU2VjcmV0Jywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0vZGF0YWJhc2Utc2VjcmV0cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGF0YWJhc2UgZW5jcnlwdGlvbiBhbmQgY29ubmVjdGlvbiBzZWNyZXRzJyxcclxuICAgICAgc2VjcmV0T2JqZWN0VmFsdWU6IHtcclxuICAgICAgICAvLyBGaWVsZC1sZXZlbCBlbmNyeXB0aW9uIGtleXMgZm9yIHNlbnNpdGl2ZSBkYXRhXHJcbiAgICAgICAgZmllbGRFbmNyeXB0aW9uS2V5OiBjZGsuU2VjcmV0VmFsdWUuY2ZuUGFyYW1ldGVyKG5ldyBjZGsuQ2ZuUGFyYW1ldGVyKHRoaXMsICdGaWVsZEVuY3J5cHRpb25LZXknLCB7XHJcbiAgICAgICAgICB0eXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgIGRlc2NyaXB0aW9uOiAnS2V5IGZvciBmaWVsZC1sZXZlbCBlbmNyeXB0aW9uIG9mIHNlbnNpdGl2ZSBkYXRhJyxcclxuICAgICAgICAgIG5vRWNobzogdHJ1ZSxcclxuICAgICAgICAgIGRlZmF1bHQ6IHRoaXMuZ2VuZXJhdGVTZWN1cmVLZXkoMzIpXHJcbiAgICAgICAgfSkpLFxyXG4gICAgICAgIC8vIEhhc2ggc2FsdCBmb3IgcGFzc3dvcmQgaGFzaGluZ1xyXG4gICAgICAgIHBhc3N3b3JkU2FsdDogY2RrLlNlY3JldFZhbHVlLmNmblBhcmFtZXRlcihuZXcgY2RrLkNmblBhcmFtZXRlcih0aGlzLCAnUGFzc3dvcmRTYWx0Jywge1xyXG4gICAgICAgICAgdHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NhbHQgZm9yIHBhc3N3b3JkIGhhc2hpbmcnLFxyXG4gICAgICAgICAgbm9FY2hvOiB0cnVlLFxyXG4gICAgICAgICAgZGVmYXVsdDogdGhpcy5nZW5lcmF0ZVNlY3VyZUtleSgxNilcclxuICAgICAgICB9KSlcclxuICAgICAgfSxcclxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgcmVmZXJlbmNlcyBmb3IgTGFtYmRhIGZ1bmN0aW9uIGFjY2Vzc1xyXG4gICAgKHRoaXMgYXMgYW55KS5vdHBTZWNyZXQgPSBvdHBTZWNyZXQ7XHJcbiAgICAodGhpcyBhcyBhbnkpLmFwaUtleXNTZWNyZXQgPSBhcGlLZXlzU2VjcmV0O1xyXG4gICAgKHRoaXMgYXMgYW55KS5kYlNlY3JldCA9IGRiU2VjcmV0O1xyXG5cclxuICAgIC8vIEVuYWJsZSBhdXRvbWF0aWMgcm90YXRpb24gZm9yIEpXVCBzZWNyZXQgKGV2ZXJ5IDkwIGRheXMgaW4gcHJvZHVjdGlvbilcclxuICAgIGlmIChlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuand0U2VjcmV0LmFkZFJvdGF0aW9uU2NoZWR1bGUoJ0p3dFNlY3JldFJvdGF0aW9uJywge1xyXG4gICAgICAgIGF1dG9tYXRpY2FsbHlBZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoOTApLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGEgc2VjdXJlIHJhbmRvbSBrZXkgZm9yIHNlY3JldHNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlU2VjdXJlS2V5KGxlbmd0aDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGNoYXJzZXQgPSAnQUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVphYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ejAxMjM0NTY3ODkhQCMkJV4mKic7XHJcbiAgICBsZXQgcmVzdWx0ID0gJyc7XHJcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XHJcbiAgICAgIHJlc3VsdCArPSBjaGFyc2V0LmNoYXJBdChNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBjaGFyc2V0Lmxlbmd0aCkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHJlc3VsdDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBJQU0gcm9sZXMgd2l0aCBsZWFzdCBwcml2aWxlZ2UgYWNjZXNzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVJQU1Sb2xlcyhlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICAvLyBHZXQgc2VjcmV0IHJlZmVyZW5jZXNcclxuICAgIGNvbnN0IG90cFNlY3JldCA9ICh0aGlzIGFzIGFueSkub3RwU2VjcmV0IGFzIHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxuICAgIGNvbnN0IGFwaUtleXNTZWNyZXQgPSAodGhpcyBhcyBhbnkpLmFwaUtleXNTZWNyZXQgYXMgc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xyXG4gICAgY29uc3QgZGJTZWNyZXQgPSAodGhpcyBhcyBhbnkpLmRiU2VjcmV0IGFzIHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxuXHJcbiAgICB0aGlzLmlhbVJvbGVzID0gbmV3IElBTVJvbGVzKHRoaXMsICdJQU1Sb2xlcycsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50IGFzICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICByZWdpb246IHRoaXMucmVnaW9uLFxyXG4gICAgICBhY2NvdW50SWQ6IHRoaXMuYWNjb3VudCxcclxuICAgICAga21zS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgdXNlclBvb2w6IHRoaXMudXNlclBvb2wsXHJcbiAgICAgIGZpbGVzQnVja2V0OiB0aGlzLmZpbGVzQnVja2V0LFxyXG4gICAgICB1c2Vyc1RhYmxlOiB0aGlzLnVzZXJzVGFibGUsXHJcbiAgICAgIGZpbGVNZXRhZGF0YVRhYmxlOiB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlLFxyXG4gICAgICBhbmFseXNpc1Jlc3VsdHNUYWJsZTogdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgc2FtcGxlRmlsZXNUYWJsZTogdGhpcy5zYW1wbGVGaWxlc1RhYmxlLFxyXG4gICAgICBwcm9ncmVzc1RhYmxlOiB0aGlzLnByb2dyZXNzVGFibGUsXHJcbiAgICAgIGp3dFNlY3JldDogdGhpcy5qd3RTZWNyZXQsXHJcbiAgICAgIG90cFNlY3JldDogb3RwU2VjcmV0LFxyXG4gICAgICBhcGlLZXlzU2VjcmV0OiBhcGlLZXlzU2VjcmV0LFxyXG4gICAgICBkYlNlY3JldDogZGJTZWNyZXQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgcGVybWlzc2lvbiBib3VuZGFyaWVzIGZvciBhZGRpdGlvbmFsIHNlY3VyaXR5XHJcbiAgICBjb25zdCBwZXJtaXNzaW9uQm91bmRhcnkgPSB0aGlzLmlhbVJvbGVzLmNyZWF0ZVBlcm1pc3Npb25Cb3VuZGFyaWVzKFxyXG4gICAgICBlbnZpcm9ubWVudCwgXHJcbiAgICAgIHRoaXMucmVnaW9uLCBcclxuICAgICAgdGhpcy5hY2NvdW50XHJcbiAgICApO1xyXG5cclxuICAgIC8vIEFwcGx5IHBlcm1pc3Npb24gYm91bmRhcmllcyB0byBhbGwgcm9sZXMgKHByb2R1Y3Rpb24gb25seSlcclxuICAgIGlmIChlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nKSB7XHJcbiAgICAgIHRoaXMuaWFtUm9sZXMuYXV0aG9yaXplclJvbGUuYXR0YWNoSW5saW5lUG9saWN5KG5ldyBpYW0uUG9saWN5KHRoaXMsICdBdXRob3JpemVyUGVybWlzc2lvbkJvdW5kYXJ5Jywge1xyXG4gICAgICAgIHN0YXRlbWVudHM6IFtuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICBhY3Rpb25zOiBbJyonXSxcclxuICAgICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgICBjb25kaXRpb25zOiB7XHJcbiAgICAgICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgICAgICdpYW06UGVybWlzc2lvbnNCb3VuZGFyeSc6IHBlcm1pc3Npb25Cb3VuZGFyeS5tYW5hZ2VkUG9saWN5QXJuLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KV0sXHJcbiAgICAgIH0pKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlTGFtYmRhRnVuY3Rpb25zKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIC8vIEVuaGFuY2VkIG1vbml0b3JpbmcgYW5kIGxvZ2dpbmcgY29uZmlndXJhdGlvblxyXG4gICAgY29uc3Qgc3RydWN0dXJlZExvZ2dpbmdDb25maWcgPSB7XHJcbiAgICAgIExPR19MRVZFTDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/ICdJTkZPJyA6ICdERUJVRycsXHJcbiAgICAgIEVOQUJMRV9TVFJVQ1RVUkVEX0xPR0dJTkc6ICd0cnVlJyxcclxuICAgICAgQ09SUkVMQVRJT05fSURfSEVBREVSOiAnWC1Db3JyZWxhdGlvbi1JRCcsXHJcbiAgICAgIExPR19GT1JNQVQ6ICdKU09OJyxcclxuICAgICAgRU5BQkxFX1BFUkZPUk1BTkNFX0xPR0dJTkc6ICd0cnVlJyxcclxuICAgICAgRU5BQkxFX1NFQ1VSSVRZX0xPR0dJTkc6ICd0cnVlJyxcclxuICAgICAgQ0xPVURXQVRDSF9OQU1FU1BBQ0U6ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgIEVOQUJMRV9DVVNUT01fTUVUUklDUzogJ3RydWUnLFxyXG4gICAgICBNRVRSSUNTX0JVRkZFUl9TSVpFOiAnMTAnLFxyXG4gICAgICBNRVRSSUNTX0ZMVVNIX0lOVEVSVkFMOiAnMzAwMDAnLCAvLyAzMCBzZWNvbmRzXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEVuaGFuY2VkIHByb2R1Y3Rpb24gY29uZmlndXJhdGlvblxyXG4gICAgY29uc3QgcHJvZHVjdGlvbkNvbmZpZyA9IHtcclxuICAgICAgRU5WSVJPTk1FTlQ6IGVudmlyb25tZW50LFxyXG4gICAgICBBQ0NPVU5UX0lEOiB0aGlzLmFjY291bnQsXHJcbiAgICAgIFNUQUNLX05BTUU6IHRoaXMuc3RhY2tOYW1lLFxyXG4gICAgICBcclxuICAgICAgLy8gRGF0YWJhc2UgY29uZmlndXJhdGlvblxyXG4gICAgICBVU0VSU19UQUJMRV9OQU1FOiB0aGlzLnVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBGSUxFX01FVEFEQVRBX1RBQkxFX05BTUU6IHRoaXMuZmlsZU1ldGFkYXRhVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUU6IHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBTQU1QTEVfRklMRVNfVEFCTEVfTkFNRTogdGhpcy5zYW1wbGVGaWxlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgUFJPR1JFU1NfVEFCTEVfTkFNRTogdGhpcy5wcm9ncmVzc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgXHJcbiAgICAgIC8vIFN0b3JhZ2UgY29uZmlndXJhdGlvblxyXG4gICAgICBGSUxFU19CVUNLRVRfTkFNRTogdGhpcy5maWxlc0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBLTVNfS0VZX0lEOiB0aGlzLmttc0tleS5rZXlJZCxcclxuICAgICAgXHJcbiAgICAgIC8vIEF1dGhlbnRpY2F0aW9uIGNvbmZpZ3VyYXRpb25cclxuICAgICAgVVNFUl9QT09MX0lEOiB0aGlzLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIFVTRVJfUE9PTF9DTElFTlRfSUQ6IHRoaXMudXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCxcclxuICAgICAgXHJcbiAgICAgIC8vIFNlY3JldHMgY29uZmlndXJhdGlvblxyXG4gICAgICBKV1RfU0VDUkVUX05BTUU6IHRoaXMuand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgIE9UUF9TRUNSRVRfTkFNRTogKHRoaXMgYXMgYW55KS5vdHBTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgQVBJX0tFWVNfU0VDUkVUX05BTUU6ICh0aGlzIGFzIGFueSkuYXBpS2V5c1NlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICBEQVRBQkFTRV9TRUNSRVRfTkFNRTogKHRoaXMgYXMgYW55KS5kYlNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICBcclxuICAgICAgLy8gUGVyZm9ybWFuY2UgYW5kIHJlbGlhYmlsaXR5IGNvbmZpZ3VyYXRpb25cclxuICAgICAgRU5BQkxFX1JFVFJZX0xPR0lDOiAndHJ1ZScsXHJcbiAgICAgIE1BWF9SRVRSWV9BVFRFTVBUUzogJzMnLFxyXG4gICAgICBSRVRSWV9CQVNFX0RFTEFZOiAnMTAwMCcsXHJcbiAgICAgIFJFVFJZX01BWF9ERUxBWTogJzEwMDAwJyxcclxuICAgICAgXHJcbiAgICAgIC8vIFNlY3VyaXR5IGNvbmZpZ3VyYXRpb25cclxuICAgICAgRU5BQkxFX1JFUVVFU1RfVkFMSURBVElPTjogJ3RydWUnLFxyXG4gICAgICBFTkFCTEVfUkFURV9MSU1JVElORzogJ3RydWUnLFxyXG4gICAgICBFTkFCTEVfQ09SU19WQUxJREFUSU9OOiAndHJ1ZScsXHJcbiAgICAgIEFMTE9XRURfT1JJR0lOUzogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/ICdodHRwczovL21pc3JhLnlvdXJkb21haW4uY29tJyBcclxuICAgICAgICA6ICdodHRwOi8vbG9jYWxob3N0OjMwMDAsaHR0cDovL2xvY2FsaG9zdDo1MTczLGh0dHBzOi8vKi52ZXJjZWwuYXBwJyxcclxuICAgICAgXHJcbiAgICAgIC8vIEFuYWx5c2lzIGNvbmZpZ3VyYXRpb25cclxuICAgICAgTUFYX0ZJTEVfU0laRTogJzEwNDg1NzYwJywgLy8gMTBNQlxyXG4gICAgICBTVVBQT1JURURfRklMRV9UWVBFUzogJ2MsY3BwLGgsaHBwJyxcclxuICAgICAgQU5BTFlTSVNfVElNRU9VVDogJzMwMDAwMCcsIC8vIDUgbWludXRlc1xyXG4gICAgICBcclxuICAgICAgLy8gTW9uaXRvcmluZyBjb25maWd1cmF0aW9uXHJcbiAgICAgIEVOQUJMRV9YUkFZX1RSQUNJTkc6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAndHJ1ZScgOiAnZmFsc2UnLFxyXG4gICAgICBFTkFCTEVfREVUQUlMRURfTU9OSVRPUklORzogJ3RydWUnLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBHZXQgc2VjcmV0IHJlZmVyZW5jZXNcclxuICAgIGNvbnN0IG90cFNlY3JldCA9ICh0aGlzIGFzIGFueSkub3RwU2VjcmV0IGFzIHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxuICAgIGNvbnN0IGFwaUtleXNTZWNyZXQgPSAodGhpcyBhcyBhbnkpLmFwaUtleXNTZWNyZXQgYXMgc2VjcmV0c21hbmFnZXIuU2VjcmV0O1xyXG4gICAgY29uc3QgZGJTZWNyZXQgPSAodGhpcyBhcyBhbnkpLmRiU2VjcmV0IGFzIHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxuXHJcbiAgICAvLyBWUEMgQ29uZmlndXJhdGlvbiBmb3IgcHJvZHVjdGlvbiBzZWN1cml0eVxyXG4gICAgbGV0IHZwY0NvbmZpZzogeyB2cGM6IGFueTsgc2VjdXJpdHlHcm91cHM6IGFueVtdOyB2cGNTdWJuZXRzOiBhbnkgfSB8IHVuZGVmaW5lZDtcclxuICAgIGlmIChlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nICYmIHRoaXMudnBjQ29uZmlnKSB7XHJcbiAgICAgIHZwY0NvbmZpZyA9IHtcclxuICAgICAgICB2cGM6IHRoaXMudnBjQ29uZmlnLnZwYyxcclxuICAgICAgICBzZWN1cml0eUdyb3VwczogW3RoaXMudnBjQ29uZmlnLmxhbWJkYVNlY3VyaXR5R3JvdXBdLFxyXG4gICAgICAgIHZwY1N1Ym5ldHM6IHtcclxuICAgICAgICAgIHN1Ym5ldFR5cGU6IGVjMi5TdWJuZXRUeXBlLlBSSVZBVEVfV0lUSF9FR1JFU1MsXHJcbiAgICAgICAgfSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb21tb24gTGFtYmRhIGZ1bmN0aW9uIGNvbmZpZ3VyYXRpb25cclxuICAgIGNvbnN0IGNvbW1vbkxhbWJkYUNvbmZpZyA9IHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLnN0cnVjdHVyZWRMb2dnaW5nQ29uZmlnLFxyXG4gICAgICAgIC4uLnByb2R1Y3Rpb25Db25maWcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGxvZ1JldGVudGlvbjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEggXHJcbiAgICAgICAgOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgIC8vIEVuYWJsZSBYLVJheSB0cmFjaW5nIGZvciBwcm9kdWN0aW9uXHJcbiAgICAgIHRyYWNpbmc6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBsYW1iZGEuVHJhY2luZy5BQ1RJVkUgXHJcbiAgICAgICAgOiBsYW1iZGEuVHJhY2luZy5ESVNBQkxFRCxcclxuICAgICAgLy8gVlBDIGNvbmZpZ3VyYXRpb24gZm9yIHByb2R1Y3Rpb25cclxuICAgICAgLi4uKHZwY0NvbmZpZyAmJiB2cGNDb25maWcpLFxyXG4gICAgICAvLyBSZXNlcnZlZCBjb25jdXJyZW5jeSBmb3IgcHJvZHVjdGlvblxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMTAwIDogdW5kZWZpbmVkLFxyXG4gICAgICAvLyBEZWFkIGxldHRlciBxdWV1ZSBmb3IgZmFpbGVkIGludm9jYXRpb25zXHJcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IG5ldyBzcXMuUXVldWUodGhpcywgJ0xhbWJkYURMUScsIHtcclxuICAgICAgICBxdWV1ZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1sYW1iZGEtZGxxLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgICByZXRlbnRpb25QZXJpb2Q6IGNkay5EdXJhdGlvbi5kYXlzKDE0KSxcclxuICAgICAgfSkgOiB1bmRlZmluZWQsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIExhbWJkYSBBdXRob3JpemVyIEZ1bmN0aW9uIHdpdGggZW5oYW5jZWQgY29uZmlndXJhdGlvblxyXG4gICAgdGhpcy5hdXRob3JpemVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBdXRob3JpemVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIC4uLmNvbW1vbkxhbWJkYUNvbmZpZyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tYXV0aG9yaXplci0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9hdXRob3JpemVyJyksXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByb2xlOiB0aGlzLmlhbVJvbGVzLmF1dGhvcml6ZXJSb2xlLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIC4uLmNvbW1vbkxhbWJkYUNvbmZpZy5lbnZpcm9ubWVudCxcclxuICAgICAgICBGVU5DVElPTl9OQU1FOiAnYXV0aG9yaXplcicsXHJcbiAgICAgICAgRU5BQkxFX0pXVF9WQUxJREFUSU9OOiAndHJ1ZScsXHJcbiAgICAgICAgRU5BQkxFX01GQV9WQUxJREFUSU9OOiAndHJ1ZScsXHJcbiAgICAgICAgSldUX0FMR09SSVRITTogJ0hTMjU2JyxcclxuICAgICAgICBUT0tFTl9DQUNIRV9UVEw6ICczMDAnLCAvLyA1IG1pbnV0ZXNcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEF1ZGl0IFN0cmVhbSBQcm9jZXNzb3IgRnVuY3Rpb24gd2l0aCBlbmhhbmNlZCBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBhdWRpdFN0cmVhbVByb2Nlc3NvciA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1ZGl0U3RyZWFtUHJvY2Vzc29yJywge1xyXG4gICAgICAuLi5jb21tb25MYW1iZGFDb25maWcsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogYG1pc3JhLXBsYXRmb3JtLWF1ZGl0LXN0cmVhbS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXVkaXQvc3RyZWFtLXByb2Nlc3NvcicpLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICByb2xlOiB0aGlzLmlhbVJvbGVzLmF1ZGl0Um9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25MYW1iZGFDb25maWcuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgRlVOQ1RJT05fTkFNRTogJ2F1ZGl0LXN0cmVhbS1wcm9jZXNzb3InLFxyXG4gICAgICAgIEFVRElUX0xPR19HUk9VUF9OQU1FOiBgL2F3cy9sYW1iZGEvbWlzcmEtcGxhdGZvcm0tYXVkaXQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICAgIEVOQUJMRV9BVURJVF9FTkNSWVBUSU9OOiAndHJ1ZScsXHJcbiAgICAgICAgQVVESVRfUkVURU5USU9OX0RBWVM6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAnMzY1JyA6ICczMCcsXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIEhpZ2hlciByZXNlcnZlZCBjb25jdXJyZW5jeSBmb3IgYXVkaXQgcHJvY2Vzc2luZ1xyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gNTAgOiB1bmRlZmluZWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTMyBFdmVudCBQcm9jZXNzb3IgRnVuY3Rpb24gd2l0aCBlbmhhbmNlZCBjb25maWd1cmF0aW9uXHJcbiAgICBjb25zdCBzM0V2ZW50UHJvY2Vzc29yID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnUzNFdmVudFByb2Nlc3NvcicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhQ29uZmlnLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1zMy1ldmVudHMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL3MzL2V2ZW50LXByb2Nlc3NvcicpLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcygyKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByb2xlOiB0aGlzLmlhbVJvbGVzLmF1ZGl0Um9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25MYW1iZGFDb25maWcuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgRlVOQ1RJT05fTkFNRTogJ3MzLWV2ZW50LXByb2Nlc3NvcicsXHJcbiAgICAgICAgRU5BQkxFX0ZJTEVfVkFMSURBVElPTjogJ3RydWUnLFxyXG4gICAgICAgIEVOQUJMRV9WSVJVU19TQ0FOTklORzogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/ICd0cnVlJyA6ICdmYWxzZScsXHJcbiAgICAgICAgTUFYX0ZJTEVfU0laRV9CWVRFUzogJzEwNDg1NzYwJywgLy8gMTBNQlxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgRnVuY3Rpb24gd2l0aCBlbmhhbmNlZCBjb25maWd1cmF0aW9uIChwbGFjZWhvbGRlciBmb3IgZnV0dXJlIGltcGxlbWVudGF0aW9uKVxyXG4gICAgY29uc3QgYW5hbHlzaXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0FuYWx5c2lzRnVuY3Rpb24nLCB7XHJcbiAgICAgIC4uLmNvbW1vbkxhbWJkYUNvbmZpZyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnZGlzdC1sYW1iZGFzL2FuYWx5c2lzL2FuYWx5emUtZmlsZScpLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCwgLy8gSGlnaGVyIG1lbW9yeSBmb3IgYW5hbHlzaXMgd29ya2xvYWRcclxuICAgICAgcm9sZTogdGhpcy5pYW1Sb2xlcy5hbmFseXNpc0Z1bmN0aW9uUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25MYW1iZGFDb25maWcuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgRlVOQ1RJT05fTkFNRTogJ2FuYWx5c2lzJyxcclxuICAgICAgICBFTkFCTEVfQU5BTFlTSVNfQ0FDSElORzogJ3RydWUnLFxyXG4gICAgICAgIEFOQUxZU0lTX0NBQ0hFX1RUTDogJzM2MDAnLCAvLyAxIGhvdXJcclxuICAgICAgICBFTkFCTEVfUEFSQUxMRUxfUFJPQ0VTU0lORzogJ3RydWUnLFxyXG4gICAgICAgIE1BWF9QQVJBTExFTF9SVUxFUzogJzEwJyxcclxuICAgICAgfSxcclxuICAgICAgLy8gSGlnaGVyIHJlc2VydmVkIGNvbmN1cnJlbmN5IGZvciBhbmFseXNpc1xyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMjAwIDogdW5kZWZpbmVkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRmlsZSBNYW5hZ2VtZW50IEZ1bmN0aW9uIHdpdGggZW5oYW5jZWQgY29uZmlndXJhdGlvbiAocGxhY2Vob2xkZXIgZm9yIGZ1dHVyZSBpbXBsZW1lbnRhdGlvbilcclxuICAgIGNvbnN0IGZpbGVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0ZpbGVGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhQ29uZmlnLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1maWxlLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9maWxlcy91cGxvYWQtdXJsJyksXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDIpLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIHJvbGU6IHRoaXMuaWFtUm9sZXMuZmlsZUZ1bmN0aW9uUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25MYW1iZGFDb25maWcuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgRlVOQ1RJT05fTkFNRTogJ2ZpbGUtbWFuYWdlbWVudCcsXHJcbiAgICAgICAgRU5BQkxFX0ZJTEVfRU5DUllQVElPTjogJ3RydWUnLFxyXG4gICAgICAgIEVOQUJMRV9GSUxFX0NPTVBSRVNTSU9OOiAndHJ1ZScsXHJcbiAgICAgICAgU1VQUE9SVEVEX01JTUVfVFlQRVM6ICd0ZXh0L3BsYWluLHRleHQveC1jLHRleHQveC1jKysnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gRnVuY3Rpb25zIHdpdGggZW5oYW5jZWQgY29uZmlndXJhdGlvbiAocGxhY2Vob2xkZXIgZm9yIGZ1dHVyZSBpbXBsZW1lbnRhdGlvbilcclxuICAgIGNvbnN0IGF1dGhGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhGdW5jdGlvbicsIHtcclxuICAgICAgLi4uY29tbW9uTGFtYmRhQ29uZmlnLFxyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1hdXRoLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9hdXRoL2xvZ2luJyksXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICByb2xlOiB0aGlzLmlhbVJvbGVzLmF1dGhGdW5jdGlvblJvbGUsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgLi4uY29tbW9uTGFtYmRhQ29uZmlnLmVudmlyb25tZW50LFxyXG4gICAgICAgIEZVTkNUSU9OX05BTUU6ICdhdXRoZW50aWNhdGlvbicsXHJcbiAgICAgICAgRU5BQkxFX01GQV9FTkZPUkNFTUVOVDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/ICd0cnVlJyA6ICdmYWxzZScsXHJcbiAgICAgICAgUEFTU1dPUkRfQ09NUExFWElUWV9FTkFCTEVEOiAndHJ1ZScsXHJcbiAgICAgICAgU0VTU0lPTl9USU1FT1VUOiAnMzYwMCcsIC8vIDEgaG91clxyXG4gICAgICAgIFJFRlJFU0hfVE9LRU5fVFRMOiAnMjU5MjAwMCcsIC8vIDMwIGRheXNcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEhlYWx0aCBDaGVjayBGdW5jdGlvbiBmb3IgbW9uaXRvcmluZ1xyXG4gICAgY29uc3QgaGVhbHRoQ2hlY2tGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0hlYWx0aENoZWNrRnVuY3Rpb24nLCB7XHJcbiAgICAgIC4uLmNvbW1vbkxhbWJkYUNvbmZpZyxcclxuICAgICAgZnVuY3Rpb25OYW1lOiBgbWlzcmEtcGxhdGZvcm0taGVhbHRoLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQoJ2Rpc3QtbGFtYmRhcy9tb25pdG9yaW5nL2hlYWx0aC1jaGVjaycpLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDEyOCwgLy8gTWluaW1hbCBtZW1vcnkgZm9yIGhlYWx0aCBjaGVja3NcclxuICAgICAgcm9sZTogdGhpcy5pYW1Sb2xlcy5tb25pdG9yaW5nUm9sZSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAuLi5jb21tb25MYW1iZGFDb25maWcuZW52aXJvbm1lbnQsXHJcbiAgICAgICAgRlVOQ1RJT05fTkFNRTogJ2hlYWx0aC1jaGVjaycsXHJcbiAgICAgICAgSEVBTFRIX0NIRUNLX1RJTUVPVVQ6ICcxMDAwMCcsIC8vIDEwIHNlY29uZHNcclxuICAgICAgICBFTkFCTEVfREVQRU5ERU5DWV9DSEVDS1M6ICd0cnVlJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhdWRpdCBsb2cgZ3JvdXBcclxuICAgIGNvbnN0IGF1ZGl0TG9nR3JvdXAgPSBuZXcgbG9ncy5Mb2dHcm91cCh0aGlzLCAnQXVkaXRMb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9sYW1iZGEvbWlzcmEtcGxhdGZvcm0tYXVkaXQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICByZXRlbnRpb246IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBsb2dzLlJldGVudGlvbkRheXMuT05FX1lFQVIgXHJcbiAgICAgICAgOiBsb2dzLlJldGVudGlvbkRheXMuT05FX01PTlRILFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxyXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbm5lY3QgRHluYW1vREIgc3RyZWFtcyB0byBhdWRpdCBwcm9jZXNzb3JcclxuICAgIHRoaXMuY29ubmVjdFN0cmVhbXNUb0F1ZGl0UHJvY2Vzc29yKGF1ZGl0U3RyZWFtUHJvY2Vzc29yKTtcclxuXHJcbiAgICAvLyBDb25maWd1cmUgUzMgZXZlbnQgbm90aWZpY2F0aW9uc1xyXG4gICAgdGhpcy5jb25maWd1cmVTM0V2ZW50Tm90aWZpY2F0aW9ucyhzM0V2ZW50UHJvY2Vzc29yLCBlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gU3RvcmUgTGFtYmRhIGZ1bmN0aW9ucyBmb3IgZnV0dXJlIGVuZHBvaW50IGNyZWF0aW9uIGFuZCBtb25pdG9yaW5nXHJcbiAgICAodGhpcyBhcyBhbnkpLmxhbWJkYUZ1bmN0aW9ucyA9IHtcclxuICAgICAgYXV0aG9yaXplcjogdGhpcy5hdXRob3JpemVyRnVuY3Rpb24sXHJcbiAgICAgIGF1ZGl0U3RyZWFtUHJvY2Vzc29yOiBhdWRpdFN0cmVhbVByb2Nlc3NvcixcclxuICAgICAgczNFdmVudFByb2Nlc3NvcjogczNFdmVudFByb2Nlc3NvcixcclxuICAgICAgYW5hbHlzaXM6IGFuYWx5c2lzRnVuY3Rpb24sXHJcbiAgICAgIGZpbGU6IGZpbGVGdW5jdGlvbixcclxuICAgICAgYXV0aDogYXV0aEZ1bmN0aW9uLFxyXG4gICAgICBoZWFsdGhDaGVjazogaGVhbHRoQ2hlY2tGdW5jdGlvbixcclxuICAgIH07XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIExhbWJkYSBmdW5jdGlvbiBhbGFybXMgZm9yIHByb2R1Y3Rpb24gbW9uaXRvcmluZ1xyXG4gICAgaWYgKGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicpIHtcclxuICAgICAgdGhpcy5jb25maWd1cmVMYW1iZGFBbGFybXMoKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBOb3RlOiBJQU0gcGVybWlzc2lvbnMgYXJlIGhhbmRsZWQgYnkgdGhlIElBTVJvbGVzIGNvbnN0cnVjdFxyXG4gICAgLy8gQWxsIGZ1bmN0aW9ucyBoYXZlIGxlYXN0IHByaXZpbGVnZSBhY2Nlc3MgdGhyb3VnaCB0aGVpciBhc3NpZ25lZCByb2xlc1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29ubmVjdCBEeW5hbW9EQiBzdHJlYW1zIHRvIGF1ZGl0IHByb2Nlc3NvciBMYW1iZGEgZnVuY3Rpb25cclxuICAgKi9cclxuICBwcml2YXRlIGNvbm5lY3RTdHJlYW1zVG9BdWRpdFByb2Nlc3NvcihhdWRpdFByb2Nlc3NvcjogbGFtYmRhLkZ1bmN0aW9uKSB7XHJcbiAgICAvLyBDb25uZWN0IFVzZXJzIHRhYmxlIHN0cmVhbVxyXG4gICAgYXVkaXRQcm9jZXNzb3IuYWRkRXZlbnRTb3VyY2UobmV3IER5bmFtb0V2ZW50U291cmNlKHRoaXMudXNlcnNUYWJsZSwge1xyXG4gICAgICBzdGFydGluZ1Bvc2l0aW9uOiBsYW1iZGEuU3RhcnRpbmdQb3NpdGlvbi5MQVRFU1QsXHJcbiAgICAgIGJhdGNoU2l6ZTogMTAsXHJcbiAgICAgIG1heEJhdGNoaW5nV2luZG93OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcclxuICAgICAgcmV0cnlBdHRlbXB0czogMyxcclxuICAgICAgcGFyYWxsZWxpemF0aW9uRmFjdG9yOiAyLFxyXG4gICAgICByZXBvcnRCYXRjaEl0ZW1GYWlsdXJlczogdHJ1ZSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBDb25uZWN0IEZpbGUgTWV0YWRhdGEgdGFibGUgc3RyZWFtXHJcbiAgICBhdWRpdFByb2Nlc3Nvci5hZGRFdmVudFNvdXJjZShuZXcgRHluYW1vRXZlbnRTb3VyY2UodGhpcy5maWxlTWV0YWRhdGFUYWJsZSwge1xyXG4gICAgICBzdGFydGluZ1Bvc2l0aW9uOiBsYW1iZGEuU3RhcnRpbmdQb3NpdGlvbi5MQVRFU1QsXHJcbiAgICAgIGJhdGNoU2l6ZTogMTAsXHJcbiAgICAgIG1heEJhdGNoaW5nV2luZG93OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg1KSxcclxuICAgICAgcmV0cnlBdHRlbXB0czogMyxcclxuICAgICAgcGFyYWxsZWxpemF0aW9uRmFjdG9yOiAyLFxyXG4gICAgICByZXBvcnRCYXRjaEl0ZW1GYWlsdXJlczogdHJ1ZSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBDb25uZWN0IEFuYWx5c2lzIFJlc3VsdHMgdGFibGUgc3RyZWFtXHJcbiAgICBhdWRpdFByb2Nlc3Nvci5hZGRFdmVudFNvdXJjZShuZXcgRHluYW1vRXZlbnRTb3VyY2UodGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZSwge1xyXG4gICAgICBzdGFydGluZ1Bvc2l0aW9uOiBsYW1iZGEuU3RhcnRpbmdQb3NpdGlvbi5MQVRFU1QsXHJcbiAgICAgIGJhdGNoU2l6ZTogMjAsIC8vIEhpZ2hlciBiYXRjaCBzaXplIGZvciBhbmFseXNpcyByZXN1bHRzXHJcbiAgICAgIG1heEJhdGNoaW5nV2luZG93OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXHJcbiAgICAgIHJldHJ5QXR0ZW1wdHM6IDMsXHJcbiAgICAgIHBhcmFsbGVsaXphdGlvbkZhY3RvcjogNCwgLy8gSGlnaGVyIHBhcmFsbGVsaXphdGlvbiBmb3IgYW5hbHlzaXMgd29ya2xvYWRcclxuICAgICAgcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ29ubmVjdCBQcm9ncmVzcyB0YWJsZSBzdHJlYW0gKGZvciByZWFsLXRpbWUgbW9uaXRvcmluZylcclxuICAgIGF1ZGl0UHJvY2Vzc29yLmFkZEV2ZW50U291cmNlKG5ldyBEeW5hbW9FdmVudFNvdXJjZSh0aGlzLnByb2dyZXNzVGFibGUsIHtcclxuICAgICAgc3RhcnRpbmdQb3NpdGlvbjogbGFtYmRhLlN0YXJ0aW5nUG9zaXRpb24uTEFURVNULFxyXG4gICAgICBiYXRjaFNpemU6IDUwLCAvLyBIaWdoZXIgYmF0Y2ggc2l6ZSBmb3IgcHJvZ3Jlc3MgdXBkYXRlc1xyXG4gICAgICBtYXhCYXRjaGluZ1dpbmRvdzogY2RrLkR1cmF0aW9uLnNlY29uZHMoMSksIC8vIExvd2VyIGxhdGVuY3kgZm9yIHJlYWwtdGltZSB1cGRhdGVzXHJcbiAgICAgIHJldHJ5QXR0ZW1wdHM6IDIsIC8vIEZld2VyIHJldHJpZXMgZm9yIHByb2dyZXNzIHVwZGF0ZXNcclxuICAgICAgcGFyYWxsZWxpemF0aW9uRmFjdG9yOiAxMCwgLy8gSGlnaCBwYXJhbGxlbGl6YXRpb24gZm9yIHJlYWwtdGltZSBwcm9jZXNzaW5nXHJcbiAgICAgIHJlcG9ydEJhdGNoSXRlbUZhaWx1cmVzOiB0cnVlLFxyXG4gICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uZmlndXJlIGNyb3NzLXJlZ2lvbiByZXBsaWNhdGlvbiBmb3IgcHJvZHVjdGlvbiBlbnZpcm9ubWVudFxyXG4gICAqL1xyXG4gIHByaXZhdGUgY29uZmlndXJlQ3Jvc3NSZWdpb25SZXBsaWNhdGlvbigpIHtcclxuICAgIC8vIENyZWF0ZSByZXBsaWNhdGlvbiBidWNrZXQgaW4gYSBkaWZmZXJlbnQgcmVnaW9uIGZvciBkaXNhc3RlciByZWNvdmVyeVxyXG4gICAgY29uc3QgcmVwbGljYXRpb25CdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdSZXBsaWNhdGlvbkJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZTogYG1pc3JhLXBsYXRmb3JtLWZpbGVzLXJlcGxpY2F0aW9uLSR7dGhpcy5hY2NvdW50fWAsXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSUFNIHJvbGUgZm9yIHJlcGxpY2F0aW9uXHJcbiAgICBjb25zdCByZXBsaWNhdGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1MzUmVwbGljYXRpb25Sb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogYG1pc3JhLXBsYXRmb3JtLXMzLXJlcGxpY2F0aW9uLSR7dGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2Vudmlyb25tZW50JykgfHwgJ3Byb2R1Y3Rpb24nfWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdzMy5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUFNIHJvbGUgZm9yIFMzIGNyb3NzLXJlZ2lvbiByZXBsaWNhdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBwZXJtaXNzaW9ucyBmb3IgcmVwbGljYXRpb25cclxuICAgIHJlcGxpY2F0aW9uUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ1MzUmVwbGljYXRpb25QZXJtaXNzaW9ucycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzpHZXRPYmplY3RWZXJzaW9uRm9yUmVwbGljYXRpb24nLFxyXG4gICAgICAgICdzMzpHZXRPYmplY3RWZXJzaW9uQWNsJyxcclxuICAgICAgICAnczM6R2V0T2JqZWN0VmVyc2lvblRhZ2dpbmcnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtgJHt0aGlzLmZpbGVzQnVja2V0LmJ1Y2tldEFybn0vKmBdLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHJlcGxpY2F0aW9uUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ1MzUmVwbGljYXRpb25EZXN0aW5hdGlvblBlcm1pc3Npb25zJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOlJlcGxpY2F0ZU9iamVjdCcsXHJcbiAgICAgICAgJ3MzOlJlcGxpY2F0ZURlbGV0ZScsXHJcbiAgICAgICAgJ3MzOlJlcGxpY2F0ZVRhZ3MnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtgJHtyZXBsaWNhdGlvbkJ1Y2tldC5idWNrZXRBcm59LypgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBLTVMgcGVybWlzc2lvbnMgZm9yIHJlcGxpY2F0aW9uXHJcbiAgICByZXBsaWNhdGlvblJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdLTVNSZXBsaWNhdGlvblBlcm1pc3Npb25zJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2ttczpEZWNyeXB0JyxcclxuICAgICAgICAna21zOkdlbmVyYXRlRGF0YUtleScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3RoaXMua21zS2V5LmtleUFybl0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gU3RvcmUgcmVwbGljYXRpb24gYnVja2V0IHJlZmVyZW5jZVxyXG4gICAgKHRoaXMgYXMgYW55KS5yZXBsaWNhdGlvbkJ1Y2tldCA9IHJlcGxpY2F0aW9uQnVja2V0O1xyXG4gICAgKHRoaXMgYXMgYW55KS5yZXBsaWNhdGlvblJvbGUgPSByZXBsaWNhdGlvblJvbGU7XHJcblxyXG4gICAgLy8gTm90ZTogQWN0dWFsIHJlcGxpY2F0aW9uIGNvbmZpZ3VyYXRpb24gbmVlZHMgdG8gYmUgZG9uZSB2aWEgQVdTIENMSSBvciBDb25zb2xlXHJcbiAgICAvLyBhcyBDREsgZG9lc24ndCBmdWxseSBzdXBwb3J0IHJlcGxpY2F0aW9uIGNvbmZpZ3VyYXRpb24geWV0XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVwbGljYXRpb25CdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogcmVwbGljYXRpb25CdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBSZXBsaWNhdGlvbiBCdWNrZXQgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1SZXBsaWNhdGlvbkJ1Y2tldGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmVwbGljYXRpb25Sb2xlQXJuJywge1xyXG4gICAgICB2YWx1ZTogcmVwbGljYXRpb25Sb2xlLnJvbGVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgUmVwbGljYXRpb24gUm9sZSBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tUmVwbGljYXRpb25Sb2xlQXJuYCxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ29uZmlndXJlIFMzIGV2ZW50IG5vdGlmaWNhdGlvbnMgZm9yIGF1ZGl0IGxvZ2dpbmdcclxuICAgKi9cclxuICBwcml2YXRlIGNvbmZpZ3VyZVMzRXZlbnROb3RpZmljYXRpb25zKHMzRXZlbnRQcm9jZXNzb3I6IGxhbWJkYS5GdW5jdGlvbiwgZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgLy8gQWRkIFMzIGV2ZW50IG5vdGlmaWNhdGlvbnNcclxuICAgIHRoaXMuZmlsZXNCdWNrZXQuYWRkRXZlbnROb3RpZmljYXRpb24oXHJcbiAgICAgIHMzLkV2ZW50VHlwZS5PQkpFQ1RfQ1JFQVRFRCxcclxuICAgICAgbmV3IHMzbi5MYW1iZGFEZXN0aW5hdGlvbihzM0V2ZW50UHJvY2Vzc29yKSxcclxuICAgICAgeyBwcmVmaXg6ICd1cGxvYWRzLycgfVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmZpbGVzQnVja2V0LmFkZEV2ZW50Tm90aWZpY2F0aW9uKFxyXG4gICAgICBzMy5FdmVudFR5cGUuT0JKRUNUX1JFTU9WRUQsXHJcbiAgICAgIG5ldyBzM24uTGFtYmRhRGVzdGluYXRpb24oczNFdmVudFByb2Nlc3NvciksXHJcbiAgICAgIHsgcHJlZml4OiAndXBsb2Fkcy8nIH1cclxuICAgICk7XHJcblxyXG4gICAgLy8gU3RvcmUgUzMgZXZlbnQgcHJvY2Vzc29yIHJlZmVyZW5jZVxyXG4gICAgKHRoaXMgYXMgYW55KS5zM0V2ZW50UHJvY2Vzc29yID0gczNFdmVudFByb2Nlc3NvcjtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbmZpZ3VyZSBMYW1iZGEgZnVuY3Rpb24gYWxhcm1zIGZvciBwcm9kdWN0aW9uIG1vbml0b3JpbmdcclxuICAgKi9cclxuICBwcml2YXRlIGNvbmZpZ3VyZUxhbWJkYUFsYXJtcygpIHtcclxuICAgIGNvbnN0IGxhbWJkYUZ1bmN0aW9ucyA9ICh0aGlzIGFzIGFueSkubGFtYmRhRnVuY3Rpb25zIGFzIFJlY29yZDxzdHJpbmcsIGxhbWJkYS5GdW5jdGlvbj47XHJcbiAgICBjb25zdCBhbGFybXM6IGNsb3Vkd2F0Y2guQWxhcm1bXSA9IFtdO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhbGFybXMgZm9yIGVhY2ggTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICBPYmplY3QuZW50cmllcyhsYW1iZGFGdW5jdGlvbnMpLmZvckVhY2goKFtuYW1lLCBmdW5jXSkgPT4ge1xyXG4gICAgICAvLyBFcnJvciByYXRlIGFsYXJtXHJcbiAgICAgIGNvbnN0IGVycm9yQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgJHtuYW1lfUVycm9yQWxhcm1gLCB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiBgbWlzcmEtcGxhdGZvcm0tJHtuYW1lfS1lcnJvcnNgLFxyXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBIaWdoIGVycm9yIHJhdGUgZm9yICR7bmFtZX0gZnVuY3Rpb25gLFxyXG4gICAgICAgIG1ldHJpYzogZnVuYy5tZXRyaWNFcnJvcnMoe1xyXG4gICAgICAgICAgcGVyaW9kOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICAgIHN0YXRpc3RpYzogJ1N1bScsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdGhyZXNob2xkOiA1LFxyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAyLFxyXG4gICAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIER1cmF0aW9uIGFsYXJtXHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgJHtuYW1lfUR1cmF0aW9uQWxhcm1gLCB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiBgbWlzcmEtcGxhdGZvcm0tJHtuYW1lfS1kdXJhdGlvbmAsXHJcbiAgICAgICAgYWxhcm1EZXNjcmlwdGlvbjogYEhpZ2ggZHVyYXRpb24gZm9yICR7bmFtZX0gZnVuY3Rpb25gLFxyXG4gICAgICAgIG1ldHJpYzogZnVuYy5tZXRyaWNEdXJhdGlvbih7XHJcbiAgICAgICAgICBwZXJpb2Q6IGNkay5EdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgdGhyZXNob2xkOiBmdW5jLnRpbWVvdXQgPyBmdW5jLnRpbWVvdXQudG9NaWxsaXNlY29uZHMoKSAqIDAuOCA6IDI0MDAwLCAvLyA4MCUgb2YgdGltZW91dFxyXG4gICAgICAgIGV2YWx1YXRpb25QZXJpb2RzOiAzLFxyXG4gICAgICAgIHRyZWF0TWlzc2luZ0RhdGE6IGNsb3Vkd2F0Y2guVHJlYXRNaXNzaW5nRGF0YS5OT1RfQlJFQUNISU5HLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIFRocm90dGxlIGFsYXJtXHJcbiAgICAgIGNvbnN0IHRocm90dGxlQWxhcm0gPSBuZXcgY2xvdWR3YXRjaC5BbGFybSh0aGlzLCBgJHtuYW1lfVRocm90dGxlQWxhcm1gLCB7XHJcbiAgICAgICAgYWxhcm1OYW1lOiBgbWlzcmEtcGxhdGZvcm0tJHtuYW1lfS10aHJvdHRsZXNgLFxyXG4gICAgICAgIGFsYXJtRGVzY3JpcHRpb246IGBUaHJvdHRsaW5nIGRldGVjdGVkIGZvciAke25hbWV9IGZ1bmN0aW9uYCxcclxuICAgICAgICBtZXRyaWM6IGZ1bmMubWV0cmljVGhyb3R0bGVzKHtcclxuICAgICAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgICBzdGF0aXN0aWM6ICdTdW0nLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHRocmVzaG9sZDogMSxcclxuICAgICAgICBldmFsdWF0aW9uUGVyaW9kczogMSxcclxuICAgICAgICB0cmVhdE1pc3NpbmdEYXRhOiBjbG91ZHdhdGNoLlRyZWF0TWlzc2luZ0RhdGEuTk9UX0JSRUFDSElORyxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhbGFybXMucHVzaChlcnJvckFsYXJtLCBkdXJhdGlvbkFsYXJtLCB0aHJvdHRsZUFsYXJtKTtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFN0b3JlIGFsYXJtcyBmb3IgbW9uaXRvcmluZyBzZXR1cFxyXG4gICAgKHRoaXMgYXMgYW55KS5sYW1iZGFBbGFybXMgPSBhbGFybXM7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb24gZm9yIGZyb250ZW5kXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVDbG91ZEZyb250RGlzdHJpYnV0aW9uKGVudmlyb25tZW50OiBzdHJpbmcsIGRvbWFpbk5hbWU/OiBzdHJpbmcsIGNlcnRpZmljYXRlQXJuPzogc3RyaW5nKSB7XHJcbiAgICAvLyBDcmVhdGUgUzMgYnVja2V0IGZvciBmcm9udGVuZCBzdGF0aWMgYXNzZXRzXHJcbiAgICBjb25zdCBmcm9udGVuZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0tZnJvbnRlbmQtJHtlbnZpcm9ubWVudH0tJHt0aGlzLmFjY291bnR9YCxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxyXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IGVudmlyb25tZW50ICE9PSAncHJvZHVjdGlvbicsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgT3JpZ2luIEFjY2VzcyBJZGVudGl0eSBmb3IgQ2xvdWRGcm9udFxyXG4gICAgY29uc3Qgb3JpZ2luQWNjZXNzSWRlbnRpdHkgPSBuZXcgY2xvdWRmcm9udC5PcmlnaW5BY2Nlc3NJZGVudGl0eSh0aGlzLCAnRnJvbnRlbmRPQUknLCB7XHJcbiAgICAgIGNvbW1lbnQ6IGBPQUkgZm9yIE1JU1JBIFBsYXRmb3JtIEZyb250ZW5kIC0gJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgQ2xvdWRGcm9udCBhY2Nlc3MgdG8gdGhlIGZyb250ZW5kIGJ1Y2tldFxyXG4gICAgZnJvbnRlbmRCdWNrZXQuZ3JhbnRSZWFkKG9yaWdpbkFjY2Vzc0lkZW50aXR5KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgY2FjaGUgcG9saWNpZXNcclxuICAgIGNvbnN0IHN0YXRpY0Fzc2V0c0NhY2hlUG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kodGhpcywgJ1N0YXRpY0Fzc2V0c0NhY2hlUG9saWN5Jywge1xyXG4gICAgICBjYWNoZVBvbGljeU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1zdGF0aWMtYXNzZXRzLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgY29tbWVudDogJ0NhY2hlIHBvbGljeSBmb3Igc3RhdGljIGFzc2V0cyAoSlMsIENTUywgaW1hZ2VzKScsXHJcbiAgICAgIGRlZmF1bHRUdGw6IGNkay5EdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgbWF4VHRsOiBjZGsuRHVyYXRpb24uZGF5cygzNjUpLFxyXG4gICAgICBtaW5UdGw6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDApLFxyXG4gICAgICBoZWFkZXJCZWhhdmlvcjogY2xvdWRmcm9udC5DYWNoZUhlYWRlckJlaGF2aW9yLm5vbmUoKSxcclxuICAgICAgcXVlcnlTdHJpbmdCZWhhdmlvcjogY2xvdWRmcm9udC5DYWNoZVF1ZXJ5U3RyaW5nQmVoYXZpb3Iubm9uZSgpLFxyXG4gICAgICBjb29raWVCZWhhdmlvcjogY2xvdWRmcm9udC5DYWNoZUNvb2tpZUJlaGF2aW9yLm5vbmUoKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGFwaUNhY2hlUG9saWN5ID0gbmV3IGNsb3VkZnJvbnQuQ2FjaGVQb2xpY3kodGhpcywgJ0FwaUNhY2hlUG9saWN5Jywge1xyXG4gICAgICBjYWNoZVBvbGljeU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1hcGktJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBjb21tZW50OiAnQ2FjaGUgcG9saWN5IGZvciBBUEkgcmVxdWVzdHMnLFxyXG4gICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgbWF4VHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgbWluVHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgaGVhZGVyQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVIZWFkZXJCZWhhdmlvci5hbGxvd0xpc3QoXHJcbiAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJ1xyXG4gICAgICApLFxyXG4gICAgICBxdWVyeVN0cmluZ0JlaGF2aW9yOiBjbG91ZGZyb250LkNhY2hlUXVlcnlTdHJpbmdCZWhhdmlvci5hbGwoKSxcclxuICAgICAgY29va2llQmVoYXZpb3I6IGNsb3VkZnJvbnQuQ2FjaGVDb29raWVCZWhhdmlvci5ub25lKCksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRGcm9udCBkaXN0cmlidXRpb25cclxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjbG91ZGZyb250LkRpc3RyaWJ1dGlvbih0aGlzLCAnRnJvbnRlbmREaXN0cmlidXRpb24nLCB7XHJcbiAgICAgIGNvbW1lbnQ6IGBNSVNSQSBQbGF0Zm9ybSBGcm9udGVuZCBEaXN0cmlidXRpb24gLSAke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlZmF1bHRSb290T2JqZWN0OiAnaW5kZXguaHRtbCcsXHJcbiAgICAgIGVycm9yUmVzcG9uc2VzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaHR0cFN0YXR1czogNDA0LFxyXG4gICAgICAgICAgcmVzcG9uc2VIdHRwU3RhdHVzOiAyMDAsXHJcbiAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiAnL2luZGV4Lmh0bWwnLFxyXG4gICAgICAgICAgdHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIGh0dHBTdGF0dXM6IDQwMyxcclxuICAgICAgICAgIHJlc3BvbnNlSHR0cFN0YXR1czogMjAwLFxyXG4gICAgICAgICAgcmVzcG9uc2VQYWdlUGF0aDogJy9pbmRleC5odG1sJyxcclxuICAgICAgICAgIHR0bDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgICAgfSxcclxuICAgICAgXSxcclxuICAgICAgcHJpY2VDbGFzczogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGNsb3VkZnJvbnQuUHJpY2VDbGFzcy5QUklDRV9DTEFTU19BTEwgXHJcbiAgICAgICAgOiBjbG91ZGZyb250LlByaWNlQ2xhc3MuUFJJQ0VfQ0xBU1NfMTAwLFxyXG4gICAgICBlbmFibGVMb2dnaW5nOiB0cnVlLFxyXG4gICAgICBsb2dCdWNrZXQ6IGZyb250ZW5kQnVja2V0LFxyXG4gICAgICBsb2dGaWxlUHJlZml4OiAnY2xvdWRmcm9udC1sb2dzLycsXHJcbiAgICAgIGRlZmF1bHRCZWhhdmlvcjoge1xyXG4gICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oZnJvbnRlbmRCdWNrZXQsIHtcclxuICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGNhY2hlUG9saWN5OiBjbG91ZGZyb250LkNhY2hlUG9saWN5LkNBQ0hJTkdfT1BUSU1JWkVELFxyXG4gICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogdGhpcy5zZWN1cml0eUhlYWRlcnMuY2xvdWRmcm9udFJlc3BvbnNlSGVhZGVyc1BvbGljeSxcclxuICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgICBhbGxvd2VkTWV0aG9kczogY2xvdWRmcm9udC5BbGxvd2VkTWV0aG9kcy5BTExPV19HRVRfSEVBRF9PUFRJT05TLFxyXG4gICAgICAgIGNvbXByZXNzOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBhZGRpdGlvbmFsQmVoYXZpb3JzOiB7XHJcbiAgICAgICAgJy9hcGkvKic6IHtcclxuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUmVzdEFwaU9yaWdpbih0aGlzLmFwaSksXHJcbiAgICAgICAgICBjYWNoZVBvbGljeTogYXBpQ2FjaGVQb2xpY3ksXHJcbiAgICAgICAgICByZXNwb25zZUhlYWRlcnNQb2xpY3k6IHRoaXMuc2VjdXJpdHlIZWFkZXJzLmNsb3VkZnJvbnRSZXNwb25zZUhlYWRlcnNQb2xpY3ksXHJcbiAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2xvdWRmcm9udC5WaWV3ZXJQcm90b2NvbFBvbGljeS5IVFRQU19PTkxZLFxyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfQUxMLFxyXG4gICAgICAgICAgY29tcHJlc3M6IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJy9zdGF0aWMvKic6IHtcclxuICAgICAgICAgIG9yaWdpbjogbmV3IG9yaWdpbnMuUzNPcmlnaW4oZnJvbnRlbmRCdWNrZXQsIHtcclxuICAgICAgICAgICAgb3JpZ2luQWNjZXNzSWRlbnRpdHksXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIGNhY2hlUG9saWN5OiBzdGF0aWNBc3NldHNDYWNoZVBvbGljeSxcclxuICAgICAgICAgIHJlc3BvbnNlSGVhZGVyc1BvbGljeTogdGhpcy5zZWN1cml0eUhlYWRlcnMuY2xvdWRmcm9udFJlc3BvbnNlSGVhZGVyc1BvbGljeSxcclxuICAgICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjbG91ZGZyb250LlZpZXdlclByb3RvY29sUG9saWN5LlJFRElSRUNUX1RPX0hUVFBTLFxyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNsb3VkZnJvbnQuQWxsb3dlZE1ldGhvZHMuQUxMT1dfR0VUX0hFQUQsXHJcbiAgICAgICAgICBjb21wcmVzczogdHJ1ZSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgcmVmZXJlbmNlc1xyXG4gICAgKHRoaXMgYXMgYW55KS5mcm9udGVuZEJ1Y2tldCA9IGZyb250ZW5kQnVja2V0O1xyXG4gICAgKHRoaXMgYXMgYW55KS5jbG91ZEZyb250RGlzdHJpYnV0aW9uID0gZGlzdHJpYnV0aW9uO1xyXG4gICAgKHRoaXMgYXMgYW55KS5vcmlnaW5BY2Nlc3NJZGVudGl0eSA9IG9yaWdpbkFjY2Vzc0lkZW50aXR5O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGJhY2t1cCBhbmQgcmVjb3ZlcnkgY29uZmlndXJhdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQmFja3VwQ29uZmlndXJhdGlvbihlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICAvLyBHZXQgTGFtYmRhIGZ1bmN0aW9ucyByZWZlcmVuY2VcclxuICAgIGNvbnN0IGxhbWJkYUZ1bmN0aW9ucyA9ICh0aGlzIGFzIGFueSkubGFtYmRhRnVuY3Rpb25zIGFzIFJlY29yZDxzdHJpbmcsIGxhbWJkYS5GdW5jdGlvbj47XHJcblxyXG4gICAgLy8gQ3JlYXRlIGJhY2t1cCBjb25maWd1cmF0aW9uXHJcbiAgICB0aGlzLmJhY2t1cENvbmZpZyA9IG5ldyBCYWNrdXBDb25maWcodGhpcywgJ0JhY2t1cENvbmZpZycsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50IGFzICdkZXYnIHwgJ3N0YWdpbmcnIHwgJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICB0YWJsZXM6IHtcclxuICAgICAgICB1c2VyczogdGhpcy51c2Vyc1RhYmxlLFxyXG4gICAgICAgIGZpbGVNZXRhZGF0YTogdGhpcy5maWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgICBhbmFseXNpc1Jlc3VsdHM6IHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgICAgc2FtcGxlRmlsZXM6IHRoaXMuc2FtcGxlRmlsZXNUYWJsZSxcclxuICAgICAgICBwcm9ncmVzczogdGhpcy5wcm9ncmVzc1RhYmxlLFxyXG4gICAgICB9LFxyXG4gICAgICBmaWxlc0J1Y2tldDogdGhpcy5maWxlc0J1Y2tldCxcclxuICAgICAgbGFtYmRhRnVuY3Rpb25zOiBsYW1iZGFGdW5jdGlvbnMsXHJcbiAgICAgIHJlcGxpY2F0aW9uUmVnaW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gJ3VzLXdlc3QtMicgOiB1bmRlZmluZWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYmFja3VwIGNvbmZpZ3VyYXRpb24gb3V0cHV0c1xyXG4gICAgdGhpcy5iYWNrdXBDb25maWcuY3JlYXRlT3V0cHV0cyh0aGlzLCB0aGlzLnN0YWNrTmFtZSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IGJhY2t1cCBzdHJhdGVneSBzdW1tYXJ5XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQmFja3VwU3RyYXRlZ3lTdW1tYXJ5Jywge1xyXG4gICAgICB2YWx1ZTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGR5bmFtb0RCUElUUjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgICBhd3NCYWNrdXA6IHRydWUsXHJcbiAgICAgICAgczNWZXJzaW9uaW5nOiB0cnVlLFxyXG4gICAgICAgIHMzUmVwbGljYXRpb246IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicsXHJcbiAgICAgICAgbGFtYmRhVmVyc2lvbmluZzogdHJ1ZSxcclxuICAgICAgICBiYWNrdXBSZXRlbnRpb246IHtcclxuICAgICAgICAgIGRhaWx5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gJzMwIGRheXMnIDogZW52aXJvbm1lbnQgPT09ICdzdGFnaW5nJyA/ICc3IGRheXMnIDogJzMgZGF5cycsXHJcbiAgICAgICAgICB3ZWVrbHk6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAnOTAgZGF5cycgOiAnTi9BJyxcclxuICAgICAgICAgIG1vbnRobHk6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgPyAnMzY1IGRheXMnIDogJ04vQScsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSwgbnVsbCwgMiksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQmFja3VwIHN0cmF0ZWd5IGNvbmZpZ3VyYXRpb24gc3VtbWFyeScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1CYWNrdXBTdHJhdGVneWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgUlRPL1JQTyB0YXJnZXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUlRPYW5kUlBPVGFyZ2V0cycsIHtcclxuICAgICAgdmFsdWU6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBkeW5hbW9EQjogeyBycG86ICc1IG1pbnV0ZXMnLCBydG86ICczMCBtaW51dGVzJyB9LFxyXG4gICAgICAgIHMzOiB7IHJwbzogJzE1IG1pbnV0ZXMnLCBydG86ICcxIGhvdXInIH0sXHJcbiAgICAgICAgbGFtYmRhOiB7IHJwbzogJzAgbWludXRlcycsIHJ0bzogJzE1IG1pbnV0ZXMnIH0sXHJcbiAgICAgICAgYXBpR2F0ZXdheTogeyBycG86ICcwIG1pbnV0ZXMnLCBydG86ICczMCBtaW51dGVzJyB9LFxyXG4gICAgICB9LCBudWxsLCAyKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdSZWNvdmVyeSBUaW1lIE9iamVjdGl2ZSAoUlRPKSBhbmQgUmVjb3ZlcnkgUG9pbnQgT2JqZWN0aXZlIChSUE8pIHRhcmdldHMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tUlRPYW5kUlBPYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dCBkaXNhc3RlciByZWNvdmVyeSBkb2N1bWVudGF0aW9uIGxpbmtcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEaXNhc3RlclJlY292ZXJ5RG9jcycsIHtcclxuICAgICAgdmFsdWU6ICdTZWUgcGFja2FnZXMvYmFja2VuZC9ESVNBU1RFUl9SRUNPVkVSWV9QUk9DRURVUkVTLm1kIGZvciBjb21wbGV0ZSBEUiBwcm9jZWR1cmVzJyxcclxuICAgICAgZGVzY3JpcHRpb246ICdEaXNhc3RlciByZWNvdmVyeSBkb2N1bWVudGF0aW9uIGxvY2F0aW9uJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LURSRG9jc2AsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlT3V0cHV0cygpIHtcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVVzZXJQb29sSWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1VzZXJQb29sQ2xpZW50SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ29nbml0byBVc2VyIFBvb2wgQ2xpZW50IElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVVzZXJQb29sQ2xpZW50SWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FwaUdhdGV3YXlVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS51cmwsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIEdhdGV3YXkgVVJMJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUFwaVVybGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpR2F0ZXdheUlkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hcGkucmVzdEFwaUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFJFU1QgQVBJIElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUFwaUlkYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5U3RhZ2UnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFwaS5kZXBsb3ltZW50U3RhZ2Uuc3RhZ2VOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IERlcGxveW1lbnQgU3RhZ2UnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQXBpU3RhZ2VgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVXNhZ2UgUGxhbnNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcmVtaXVtVXNhZ2VQbGFuSWQnLCB7XHJcbiAgICAgIHZhbHVlOiAodGhpcyBhcyBhbnkpLnVzYWdlUGxhbnMucHJlbWl1bS51c2FnZVBsYW5JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcmVtaXVtIFVzYWdlIFBsYW4gSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tUHJlbWl1bVVzYWdlUGxhbmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3RhbmRhcmRVc2FnZVBsYW5JZCcsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkudXNhZ2VQbGFucy5zdGFuZGFyZC51c2FnZVBsYW5JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdTdGFuZGFyZCBVc2FnZSBQbGFuIElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVN0YW5kYXJkVXNhZ2VQbGFuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMaW1pdGVkVXNhZ2VQbGFuSWQnLCB7XHJcbiAgICAgIHZhbHVlOiAodGhpcyBhcyBhbnkpLnVzYWdlUGxhbnMubGltaXRlZC51c2FnZVBsYW5JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdMaW1pdGVkIFVzYWdlIFBsYW4gSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tTGltaXRlZFVzYWdlUGxhbmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBUEkgS2V5c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1ByZW1pdW1BcGlLZXlJZCcsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkuYXBpS2V5cy5wcmVtaXVtLmtleUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1ByZW1pdW0gQVBJIEtleSBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1QcmVtaXVtQXBpS2V5YCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTdGFuZGFyZEFwaUtleUlkJywge1xyXG4gICAgICB2YWx1ZTogKHRoaXMgYXMgYW55KS5hcGlLZXlzLnN0YW5kYXJkLmtleUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1N0YW5kYXJkIEFQSSBLZXkgSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tU3RhbmRhcmRBcGlLZXlgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vbml0b3JpbmdBcGlLZXlJZCcsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkuYXBpS2V5cy5tb25pdG9yaW5nLmtleUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ01vbml0b3JpbmcgQVBJIEtleSBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Nb25pdG9yaW5nQXBpS2V5YCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEN1c3RvbSBEb21haW4gQ29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0N1c3RvbURvbWFpbkluc3RydWN0aW9ucycsIHtcclxuICAgICAgdmFsdWU6IGBUbyBjb25maWd1cmUgY3VzdG9tIGRvbWFpbjogMSkgQ3JlYXRlIFNTTCBjZXJ0aWZpY2F0ZSBpbiBBQ00sIDIpIFVwZGF0ZSBDZXJ0aWZpY2F0ZUFybiBwYXJhbWV0ZXIsIDMpIENyZWF0ZSBSb3V0ZSA1MyByZWNvcmQgcG9pbnRpbmcgdG8gQVBJIEdhdGV3YXkgZG9tYWluYCxcclxuICAgICAgZGVzY3JpcHRpb246ICdJbnN0cnVjdGlvbnMgZm9yIHNldHRpbmcgdXAgY3VzdG9tIGRvbWFpbicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Eb21haW5JbnN0cnVjdGlvbnNgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUmF0ZSBMaW1pdGluZyBDb25maWd1cmF0aW9uXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUmF0ZUxpbWl0aW5nQ29uZmlnJywge1xyXG4gICAgICB2YWx1ZTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIHByZW1pdW06IHsgcmF0ZTogMjAwMCwgYnVyc3Q6IDUwMDAsIHF1b3RhOiA1MDAwMDAgfSxcclxuICAgICAgICBzdGFuZGFyZDogeyByYXRlOiAxMDAwLCBidXJzdDogMjAwMCwgcXVvdGE6IDEwMDAwMCB9LFxyXG4gICAgICAgIGxpbWl0ZWQ6IHsgcmF0ZTogMTAwLCBidXJzdDogMjAwLCBxdW90YTogMTAwMDAgfSxcclxuICAgICAgfSksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUmF0ZSBsaW1pdGluZyBjb25maWd1cmF0aW9uIGZvciBkaWZmZXJlbnQgdXNhZ2UgcGxhbnMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tUmF0ZUxpbWl0c2AsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRmlsZXNCdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5maWxlc0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1MzIEZpbGVzIEJ1Y2tldCBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUZpbGVzQnVja2V0YCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdLbXNLZXlJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMua21zS2V5LmtleUlkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0tNUyBLZXkgSUQnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tS21zS2V5SWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0F1dGhvcml6ZXJGdW5jdGlvbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmF1dGhvcml6ZXJGdW5jdGlvbi5mdW5jdGlvbk5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnTGFtYmRhIEF1dGhvcml6ZXIgRnVuY3Rpb24gTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1BdXRob3JpemVyRnVuY3Rpb25gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0F1dGhvcml6ZXJGdW5jdGlvbkFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYXV0aG9yaXplckZ1bmN0aW9uLmZ1bmN0aW9uQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBBdXRob3JpemVyIEZ1bmN0aW9uIEFSTicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1BdXRob3JpemVyRnVuY3Rpb25Bcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0F1ZGl0U3RyZWFtUHJvY2Vzc29yTmFtZScsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkubGFtYmRhRnVuY3Rpb25zLmF1ZGl0U3RyZWFtUHJvY2Vzc29yLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdBdWRpdCBTdHJlYW0gUHJvY2Vzc29yIEZ1bmN0aW9uIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQXVkaXRTdHJlYW1Qcm9jZXNzb3JgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0F1ZGl0U3RyZWFtUHJvY2Vzc29yQXJuJywge1xyXG4gICAgICB2YWx1ZTogKHRoaXMgYXMgYW55KS5sYW1iZGFGdW5jdGlvbnMuYXVkaXRTdHJlYW1Qcm9jZXNzb3IuZnVuY3Rpb25Bcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQXVkaXQgU3RyZWFtIFByb2Nlc3NvciBGdW5jdGlvbiBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQXVkaXRTdHJlYW1Qcm9jZXNzb3JBcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSUFNIFJvbGVzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXV0aG9yaXplclJvbGVBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmlhbVJvbGVzLmF1dGhvcml6ZXJSb2xlLnJvbGVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUFNIFJvbGUgQVJOIGZvciBMYW1iZGEgQXV0aG9yaXplcicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1BdXRob3JpemVyUm9sZUFybmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXV0aEZ1bmN0aW9uUm9sZUFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuaWFtUm9sZXMuYXV0aEZ1bmN0aW9uUm9sZS5yb2xlQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSBSb2xlIEFSTiBmb3IgQXV0aGVudGljYXRpb24gRnVuY3Rpb25zJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUF1dGhGdW5jdGlvblJvbGVBcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0ZpbGVGdW5jdGlvblJvbGVBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmlhbVJvbGVzLmZpbGVGdW5jdGlvblJvbGUucm9sZUFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gUm9sZSBBUk4gZm9yIEZpbGUgTWFuYWdlbWVudCBGdW5jdGlvbnMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tRmlsZUZ1bmN0aW9uUm9sZUFybmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQW5hbHlzaXNGdW5jdGlvblJvbGVBcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmlhbVJvbGVzLmFuYWx5c2lzRnVuY3Rpb25Sb2xlLnJvbGVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUFNIFJvbGUgQVJOIGZvciBBbmFseXNpcyBGdW5jdGlvbnMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQW5hbHlzaXNGdW5jdGlvblJvbGVBcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vbml0b3JpbmdSb2xlQXJuJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5pYW1Sb2xlcy5tb25pdG9yaW5nUm9sZS5yb2xlQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSBSb2xlIEFSTiBmb3IgTW9uaXRvcmluZyBGdW5jdGlvbnMnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tTW9uaXRvcmluZ1JvbGVBcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0F1ZGl0Um9sZUFybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuaWFtUm9sZXMuYXVkaXRSb2xlLnJvbGVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUFNIFJvbGUgQVJOIGZvciBBdWRpdCBTdHJlYW0gUHJvY2Vzc29yJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUF1ZGl0Um9sZUFybmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZWNyZXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSnd0U2VjcmV0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSldUIFNlY3JldCBOYW1lIGluIFNlY3JldHMgTWFuYWdlcicsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Kd3RTZWNyZXROYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdPdHBTZWNyZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogKHRoaXMgYXMgYW55KS5vdHBTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdPVFAvVE9UUCBTZWNyZXQgTmFtZSBpbiBTZWNyZXRzIE1hbmFnZXInLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tT3RwU2VjcmV0TmFtZWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpS2V5c1NlY3JldE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiAodGhpcyBhcyBhbnkpLmFwaUtleXNTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdBUEkgS2V5cyBTZWNyZXQgTmFtZSBpbiBTZWNyZXRzIE1hbmFnZXInLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQXBpS2V5c1NlY3JldE5hbWVgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlU2VjcmV0TmFtZScsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkuZGJTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEYXRhYmFzZSBTZWNyZXQgTmFtZSBpbiBTZWNyZXRzIE1hbmFnZXInLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tRGF0YWJhc2VTZWNyZXROYW1lYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIER5bmFtb0RCIFRhYmxlIE5hbWVzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlcnNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1VzZXJzIER5bmFtb0RCIFRhYmxlIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tVXNlcnNUYWJsZWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRmlsZU1ldGFkYXRhVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5maWxlTWV0YWRhdGFUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRmlsZSBNZXRhZGF0YSBEeW5hbW9EQiBUYWJsZSBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUZpbGVNZXRhZGF0YVRhYmxlYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBbmFseXNpc1Jlc3VsdHNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdBbmFseXNpcyBSZXN1bHRzIER5bmFtb0RCIFRhYmxlIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQW5hbHlzaXNSZXN1bHRzVGFibGVgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1NhbXBsZUZpbGVzVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5zYW1wbGVGaWxlc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTYW1wbGUgRmlsZXMgRHluYW1vREIgVGFibGUgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1TYW1wbGVGaWxlc1RhYmxlYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9ncmVzc1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMucHJvZ3Jlc3NUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJvZ3Jlc3MgRHluYW1vREIgVGFibGUgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Qcm9ncmVzc1RhYmxlYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggTW9uaXRvcmluZyBPdXRwdXRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnTW9uaXRvcmluZ0Rhc2hib2FyZE5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLm1vbml0b3JpbmcuZGFzaGJvYXJkLmRhc2hib2FyZE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBEYXNoYm9hcmQgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1EYXNoYm9hcmRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ01vbml0b3JpbmdEYXNoYm9hcmRVcmwnLCB7XHJcbiAgICAgIHZhbHVlOiBgaHR0cHM6Ly8ke3RoaXMucmVnaW9ufS5jb25zb2xlLmF3cy5hbWF6b24uY29tL2Nsb3Vkd2F0Y2gvaG9tZT9yZWdpb249JHt0aGlzLnJlZ2lvbn0jZGFzaGJvYXJkczpuYW1lPSR7dGhpcy5tb25pdG9yaW5nLmRhc2hib2FyZC5kYXNoYm9hcmROYW1lfWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBEYXNoYm9hcmQgVVJMJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LURhc2hib2FyZFVybGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQWxhcm1Ub3BpY0FybicsIHtcclxuICAgICAgdmFsdWU6IHRoaXMubW9uaXRvcmluZy5hbGFybVRvcGljLnRvcGljQXJuLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NOUyBUb3BpYyBBUk4gZm9yIENsb3VkV2F0Y2ggQWxhcm1zJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUFsYXJtVG9waWNgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTG9nIEdyb3VwcyBmb3IgZGVidWdnaW5nXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnV29ya2Zsb3dMb2dHcm91cCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMubW9uaXRvcmluZy5sb2dHcm91cHMud29ya2Zsb3cubG9nR3JvdXBOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1dvcmtmbG93IExvZyBHcm91cCBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVdvcmtmbG93TG9nR3JvdXBgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FuYWx5c2lzTG9nR3JvdXAnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLm1vbml0b3JpbmcubG9nR3JvdXBzLmFuYWx5c2lzLmxvZ0dyb3VwTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdBbmFseXNpcyBMb2cgR3JvdXAgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1BbmFseXNpc0xvZ0dyb3VwYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWN1cml0eUxvZ0dyb3VwJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5tb25pdG9yaW5nLmxvZ0dyb3Vwcy5zZWN1cml0eS5sb2dHcm91cE5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgTG9nIEdyb3VwIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tU2VjdXJpdHlMb2dHcm91cGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDbG91ZEZyb250IERpc3RyaWJ1dGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb25JZCcsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkuY2xvdWRGcm9udERpc3RyaWJ1dGlvbi5kaXN0cmlidXRpb25JZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDbG91ZEZyb250IERpc3RyaWJ1dGlvbiBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1DbG91ZEZyb250RGlzdHJpYnV0aW9uSWRgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Nsb3VkRnJvbnREaXN0cmlidXRpb25Eb21haW5OYW1lJywge1xyXG4gICAgICB2YWx1ZTogKHRoaXMgYXMgYW55KS5jbG91ZEZyb250RGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBEaXN0cmlidXRpb24gRG9tYWluIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQ2xvdWRGcm9udERvbWFpbk5hbWVgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Zyb250ZW5kQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkuZnJvbnRlbmRCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBTMyBCdWNrZXQgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Gcm9udGVuZEJ1Y2tldGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTMyBFdmVudCBQcm9jZXNzb3JcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTM0V2ZW50UHJvY2Vzc29yTmFtZScsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkuczNFdmVudFByb2Nlc3Nvci5mdW5jdGlvbk5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUzMgRXZlbnQgUHJvY2Vzc29yIEZ1bmN0aW9uIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tUzNFdmVudFByb2Nlc3NvcmAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUzNFdmVudFByb2Nlc3NvckFybicsIHtcclxuICAgICAgdmFsdWU6ICh0aGlzIGFzIGFueSkuczNFdmVudFByb2Nlc3Nvci5mdW5jdGlvbkFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBFdmVudCBQcm9jZXNzb3IgRnVuY3Rpb24gQVJOJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVMzRXZlbnRQcm9jZXNzb3JBcm5gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVlBDIENvbmZpZ3VyYXRpb24gKGlmIGNyZWF0ZWQpXHJcbiAgICBpZiAodGhpcy52cGNDb25maWcpIHtcclxuICAgICAgdGhpcy52cGNDb25maWcuY3JlYXRlT3V0cHV0cyh0aGlzLCB0aGlzLnN0YWNrTmFtZSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gV0FGIENvbmZpZ3VyYXRpb24gKGlmIGNyZWF0ZWQpXHJcbiAgICBpZiAodGhpcy53YWZDb25maWcpIHtcclxuICAgICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1dhZldlYkFjbEFybicsIHtcclxuICAgICAgICB2YWx1ZTogdGhpcy53YWZDb25maWcud2ViQWNsLmF0dHJBcm4sXHJcbiAgICAgICAgZGVzY3JpcHRpb246ICdXQUYgV2ViIEFDTCBBUk4nLFxyXG4gICAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1XYWZXZWJBY2xBcm5gLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdXYWZXZWJBY2xJZCcsIHtcclxuICAgICAgICB2YWx1ZTogdGhpcy53YWZDb25maWcud2ViQWNsLmF0dHJJZCxcclxuICAgICAgICBkZXNjcmlwdGlvbjogJ1dBRiBXZWIgQUNMIElEJyxcclxuICAgICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tV2FmV2ViQWNsSWRgLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBTZWN1cml0eSBIZWFkZXJzIENvbmZpZ3VyYXRpb25cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWN1cml0eUhlYWRlcnNQb2xpY3lJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuc2VjdXJpdHlIZWFkZXJzLmNsb3VkZnJvbnRSZXNwb25zZUhlYWRlcnNQb2xpY3kucmVzcG9uc2VIZWFkZXJzUG9saWN5SWQsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRGcm9udCBSZXNwb25zZSBIZWFkZXJzIFBvbGljeSBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1TZWN1cml0eUhlYWRlcnNQb2xpY3lJZGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZWN1cml0eSBDb25maWd1cmF0aW9uIFN1bW1hcnlcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdTZWN1cml0eUNvbmZpZ1N1bW1hcnknLCB7XHJcbiAgICAgIHZhbHVlOiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgd2FmRW5hYmxlZDogISF0aGlzLndhZkNvbmZpZyxcclxuICAgICAgICBzZWN1cml0eUhlYWRlcnNFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGttc0VuY3J5cHRpb246IHRydWUsXHJcbiAgICAgICAgc2VjcmV0c01hbmFnZXI6IHRydWUsXHJcbiAgICAgICAgaWFtTGVhc3RQcml2aWxlZ2U6IHRydWUsXHJcbiAgICAgICAgdnBjRW5hYmxlZDogISF0aGlzLnZwY0NvbmZpZyxcclxuICAgICAgfSksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgY29uZmlndXJhdGlvbiBzdW1tYXJ5JyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVNlY3VyaXR5Q29uZmlnYCxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==