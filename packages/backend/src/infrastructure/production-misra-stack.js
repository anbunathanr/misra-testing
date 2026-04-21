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
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
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
    constructor(scope, id, props) {
        super(scope, id, props);
        const { environment } = props;
        const stackName = `misra-platform-${environment}`;
        // KMS Key for encryption
        this.kmsKey = new kms.Key(this, 'MisraKmsKey', {
            description: `MISRA Platform KMS Key - ${environment}`,
            enableKeyRotation: true,
            removalPolicy: environment === 'production'
                ? cdk.RemovalPolicy.RETAIN
                : cdk.RemovalPolicy.DESTROY,
        });
        // Create DynamoDB tables
        this.createDynamoDBTables(environment);
        // Create S3 bucket
        this.createS3Bucket(environment);
        // Create Cognito User Pool
        this.createCognitoUserPool(environment);
        // Create Secrets Manager secrets
        this.createSecrets(environment);
        // Create Lambda functions
        this.createLambdaFunctions(environment);
        // Create API Gateway with Lambda authorizer
        this.createApiGateway(environment);
        // Create API endpoints
        this.createApiEndpoints(environment);
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
        });
        // Add GSI for user progress tracking
        this.progressTable.addGlobalSecondaryIndex({
            indexName: 'userId-updatedAt-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
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
                    ],
                },
                {
                    id: 'AbortIncompleteMultipartUploads',
                    enabled: true,
                    abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
                },
            ],
        });
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
            },
            defaultCorsPreflightOptions: {
                allowOrigins: environment === 'production'
                    ? ['https://your-domain.com'] // Replace with actual domain
                    : apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: [
                    'Content-Type',
                    'Authorization',
                    'X-Amz-Date',
                    'X-Api-Key',
                    'X-Correlation-ID',
                    'X-Requested-With',
                    'Accept',
                    'Origin',
                ],
                allowCredentials: false,
                maxAge: cdk.Duration.hours(1),
            },
            cloudWatchRole: true,
            // Enable binary media types for file uploads
            binaryMediaTypes: ['*/*'],
        });
        // Add usage plan for rate limiting and throttling
        const usagePlan = this.api.addUsagePlan('MisraApiUsagePlan', {
            name: `misra-platform-usage-plan-${environment}`,
            description: `Rate limiting and throttling for MISRA Platform API - ${environment}`,
            throttle: {
                rateLimit: environment === 'production' ? 1000 : 100,
                burstLimit: environment === 'production' ? 2000 : 200,
            },
            quota: {
                limit: environment === 'production' ? 100000 : 10000,
                period: apigateway.Period.DAY,
            },
        });
        usagePlan.addApiStage({
            stage: this.api.deploymentStage,
        });
        // Create API Key for monitoring (optional)
        const apiKey = this.api.addApiKey('MisraApiKey', {
            apiKeyName: `misra-platform-api-key-${environment}`,
            description: `API Key for MISRA Platform - ${environment}`,
        });
        usagePlan.addApiKey(apiKey);
    }
    createApiEndpoints(environment) {
        // Create Lambda Authorizer for JWT validation
        const authorizer = new apigateway.RequestAuthorizer(this, 'JwtAuthorizer', {
            handler: this.authorizerFunction,
            identitySources: [apigateway.IdentitySource.header('Authorization')],
            authorizerName: `jwt-authorizer-${environment}`,
            resultsCacheTtl: cdk.Duration.minutes(5), // Cache authorization results for 5 minutes
        });
        // Create API resource structure
        // /auth - Authentication endpoints (public)
        const authResource = this.api.root.addResource('auth');
        // /files - File management endpoints (protected)
        const filesResource = this.api.root.addResource('files');
        // /analysis - Analysis endpoints (protected)
        const analysisResource = this.api.root.addResource('analysis');
        // /user - User profile endpoints (protected)
        const userResource = this.api.root.addResource('user');
        // Health check endpoint (public)
        const healthResource = this.api.root.addResource('health');
        healthResource.addMethod('GET', new apigateway.MockIntegration({
            integrationResponses: [{
                    statusCode: '200',
                    responseTemplates: {
                        'application/json': JSON.stringify({
                            status: 'healthy',
                            timestamp: '$context.requestTime',
                            environment: environment,
                        }),
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': "'*'",
                        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,Authorization'",
                        'method.response.header.Access-Control-Allow-Methods': "'GET,OPTIONS'",
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
                    },
                }],
        });
        // Store authorizer for use in Lambda function creation (when implemented)
        this.lambdaAuthorizer = authorizer;
    }
    createSecrets(environment) {
        // JWT Secret for Lambda authorizer
        this.jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
            secretName: `misra-platform/jwt-secret-${environment}`,
            description: 'JWT signing secret for MISRA platform',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ algorithm: 'HS256' }),
                generateStringKey: 'secret',
                excludeCharacters: '"@/\\',
                passwordLength: 64,
            },
            encryptionKey: this.kmsKey,
        });
        // API Keys for external services (if needed)
        new secretsmanager.Secret(this, 'ApiKeys', {
            secretName: `misra-platform/api-keys-${environment}`,
            description: 'API keys for external services',
            secretObjectValue: {
                placeholder: cdk.SecretValue.unsafePlainText('replace-with-actual-keys'),
            },
            encryptionKey: this.kmsKey,
        });
    }
    createLambdaFunctions(environment) {
        // Lambda Authorizer Function
        this.authorizerFunction = new lambda.Function(this, 'AuthorizerFunction', {
            functionName: `misra-platform-authorizer-${environment}`,
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist-lambdas/auth/authorizer'),
            timeout: cdk.Duration.seconds(10),
            memorySize: 256,
            environment: {
                JWT_SECRET_NAME: this.jwtSecret.secretName,
                USERS_TABLE_NAME: this.usersTable.tableName,
                ENVIRONMENT: environment,
            },
            logRetention: environment === 'production'
                ? logs.RetentionDays.ONE_MONTH
                : logs.RetentionDays.ONE_WEEK,
        });
        // Grant permissions to the authorizer function
        this.jwtSecret.grantRead(this.authorizerFunction);
        this.usersTable.grantReadData(this.authorizerFunction);
        // Add CloudWatch permissions for structured logging
        this.authorizerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/lambda/*`],
        }));
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
        // Secrets
        new cdk.CfnOutput(this, 'JwtSecretName', {
            value: this.jwtSecret.secretName,
            description: 'JWT Secret Name in Secrets Manager',
            exportName: `${this.stackName}-JwtSecretName`,
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
    }
}
exports.ProductionMisraStack = ProductionMisraStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdGlvbi1taXNyYS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInByb2R1Y3Rpb24tbWlzcmEtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLGlFQUFtRDtBQUNuRCx1RUFBeUQ7QUFDekQsK0RBQWlEO0FBQ2pELG1FQUFxRDtBQUNyRCx1REFBeUM7QUFDekMseURBQTJDO0FBQzNDLDJEQUE2QztBQUM3QywrRUFBaUU7QUFDakUseURBQTJDO0FBUzNDLE1BQWEsb0JBQXFCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDMUMsUUFBUSxDQUFtQjtJQUMzQixjQUFjLENBQXlCO0lBQ3ZDLEdBQUcsQ0FBcUI7SUFDeEIsV0FBVyxDQUFZO0lBQ3ZCLE1BQU0sQ0FBVTtJQUV2QixrQkFBa0I7SUFDWCxVQUFVLENBQWlCO0lBQzNCLGlCQUFpQixDQUFpQjtJQUNsQyxvQkFBb0IsQ0FBaUI7SUFDckMsZ0JBQWdCLENBQWlCO0lBQ2pDLGFBQWEsQ0FBaUI7SUFFckMsbUJBQW1CO0lBQ1osa0JBQWtCLENBQWtCO0lBQ3BDLFNBQVMsQ0FBd0I7SUFFeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixNQUFNLEVBQUUsV0FBVyxFQUFFLEdBQUcsS0FBSyxDQUFDO1FBQzlCLE1BQU0sU0FBUyxHQUFHLGtCQUFrQixXQUFXLEVBQUUsQ0FBQztRQUVsRCx5QkFBeUI7UUFDekIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUM3QyxXQUFXLEVBQUUsNEJBQTRCLFdBQVcsRUFBRTtZQUN0RCxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLGFBQWEsRUFBRSxXQUFXLEtB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OEJBQThCO1lBQzNDLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLGdCQUFnQjtTQUM5QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE1cEJELG9EQTRwQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMga21zIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rbXMnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvZHVjdGlvbk1pc3JhU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogJ2RldicgfCAnc3RhZ2luZycgfCAncHJvZHVjdGlvbic7XHJcbiAgZG9tYWluTmFtZT86IHN0cmluZztcclxuICBjZXJ0aWZpY2F0ZUFybj86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFByb2R1Y3Rpb25NaXNyYVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBwdWJsaWMgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2w7XHJcbiAgcHVibGljIHVzZXJQb29sQ2xpZW50OiBjb2duaXRvLlVzZXJQb29sQ2xpZW50O1xyXG4gIHB1YmxpYyBhcGk6IGFwaWdhdGV3YXkuUmVzdEFwaTtcclxuICBwdWJsaWMgZmlsZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICBwdWJsaWMga21zS2V5OiBrbXMuS2V5O1xyXG4gIFxyXG4gIC8vIER5bmFtb0RCIFRhYmxlc1xyXG4gIHB1YmxpYyB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBwdWJsaWMgZmlsZU1ldGFkYXRhVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHB1YmxpYyBhbmFseXNpc1Jlc3VsdHNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgcHVibGljIHNhbXBsZUZpbGVzVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIHB1YmxpYyBwcm9ncmVzc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuXHJcbiAgLy8gTGFtYmRhIEZ1bmN0aW9uc1xyXG4gIHB1YmxpYyBhdXRob3JpemVyRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgand0U2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBQcm9kdWN0aW9uTWlzcmFTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICBjb25zdCB7IGVudmlyb25tZW50IH0gPSBwcm9wcztcclxuICAgIGNvbnN0IHN0YWNrTmFtZSA9IGBtaXNyYS1wbGF0Zm9ybS0ke2Vudmlyb25tZW50fWA7XHJcblxyXG4gICAgLy8gS01TIEtleSBmb3IgZW5jcnlwdGlvblxyXG4gICAgdGhpcy5rbXNLZXkgPSBuZXcga21zLktleSh0aGlzLCAnTWlzcmFLbXNLZXknLCB7XHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgTUlTUkEgUGxhdGZvcm0gS01TIEtleSAtICR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIER5bmFtb0RCIHRhYmxlc1xyXG4gICAgdGhpcy5jcmVhdGVEeW5hbW9EQlRhYmxlcyhlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFMzIGJ1Y2tldFxyXG4gICAgdGhpcy5jcmVhdGVTM0J1Y2tldChlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIENvZ25pdG8gVXNlciBQb29sXHJcbiAgICB0aGlzLmNyZWF0ZUNvZ25pdG9Vc2VyUG9vbChlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIFNlY3JldHMgTWFuYWdlciBzZWNyZXRzXHJcbiAgICB0aGlzLmNyZWF0ZVNlY3JldHMoZW52aXJvbm1lbnQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICB0aGlzLmNyZWF0ZUxhbWJkYUZ1bmN0aW9ucyhlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFQSSBHYXRld2F5IHdpdGggTGFtYmRhIGF1dGhvcml6ZXJcclxuICAgIHRoaXMuY3JlYXRlQXBpR2F0ZXdheShlbnZpcm9ubWVudCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIEFQSSBlbmRwb2ludHNcclxuICAgIHRoaXMuY3JlYXRlQXBpRW5kcG9pbnRzKGVudmlyb25tZW50KTtcclxuXHJcbiAgICAvLyBPdXRwdXQgaW1wb3J0YW50IHZhbHVlc1xyXG4gICAgdGhpcy5jcmVhdGVPdXRwdXRzKCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUR5bmFtb0RCVGFibGVzKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIC8vIFVzZXJzIFRhYmxlIC0gU3RvcmVzIHVzZXIgcHJvZmlsZXMgYW5kIGF1dGhlbnRpY2F0aW9uIGRhdGFcclxuICAgIHRoaXMudXNlcnNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVXNlcnNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tdXNlcnMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBlbWFpbCBsb29rdXAgKHJlcXVpcmVkIGZvciBsb2dpbiBmbG93KVxyXG4gICAgdGhpcy51c2Vyc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZW1haWwtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2VtYWlsJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIG9yZ2FuaXphdGlvbiBxdWVyaWVzIChvcHRpb25hbCBmb3IgbXVsdGktdGVuYW50IHN1cHBvcnQpXHJcbiAgICB0aGlzLnVzZXJzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdvcmdhbml6YXRpb25JZC1jcmVhdGVkQXQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ29yZ2FuaXphdGlvbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnY3JlYXRlZEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEZpbGUgTWV0YWRhdGEgVGFibGUgLSBTdG9yZXMgZmlsZSB1cGxvYWQgbWV0YWRhdGEgYW5kIFMzIHJlZmVyZW5jZXNcclxuICAgIHRoaXMuZmlsZU1ldGFkYXRhVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0ZpbGVNZXRhZGF0YVRhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1maWxlLW1ldGFkYXRhLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdmaWxlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQ1VTVE9NRVJfTUFOQUdFRCxcclxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgdXNlciBmaWxlcyBjaHJvbm9sb2dpY2FsbHkgb3JkZXJlZFxyXG4gICAgdGhpcy5maWxlTWV0YWRhdGFUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC11cGxvYWRUaW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwbG9hZFRpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBjb250ZW50IGhhc2ggbG9va3VwIChmb3IgY2FjaGluZylcclxuICAgIHRoaXMuZmlsZU1ldGFkYXRhVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdjb250ZW50SGFzaC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udGVudEhhc2gnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQW5hbHlzaXMgUmVzdWx0cyBUYWJsZSAtIFN0b3JlcyBNSVNSQSBhbmFseXNpcyByZXN1bHRzIGFuZCB2aW9sYXRpb25zXHJcbiAgICB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdBbmFseXNpc1Jlc3VsdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYW5hbHlzaXMtcmVzdWx0cy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnYW5hbHlzaXNJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGNkay5SZW1vdmFsUG9saWN5LlJFVEFJTiBcclxuICAgICAgICA6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIC8vIFRUTCBmb3Igbm9uLXByb2R1Y3Rpb24gZW52aXJvbm1lbnRzIHRvIG1hbmFnZSBjb3N0c1xyXG4gICAgICB0aW1lVG9MaXZlQXR0cmlidXRlOiBlbnZpcm9ubWVudCAhPT0gJ3Byb2R1Y3Rpb24nID8gJ3R0bCcgOiB1bmRlZmluZWQsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBmaWxlIGFuYWx5c2lzIGhpc3RvcnlcclxuICAgIHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdmaWxlSWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdmaWxlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgdXNlciBhbmFseXNpcyBoaXN0b3J5XHJcbiAgICB0aGlzLmFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIGNvbnRlbnQgaGFzaCBsb29rdXAgKGZvciBhbmFseXNpcyBjYWNoaW5nKVxyXG4gICAgdGhpcy5hbmFseXNpc1Jlc3VsdHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ2NvbnRlbnRIYXNoLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnY29udGVudEhhc2gnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2FtcGxlIEZpbGVzIFRhYmxlIC0gQ3VyYXRlZCBsaWJyYXJ5IG9mIEMvQysrIGZpbGVzIHdpdGgga25vd24gTUlTUkEgdmlvbGF0aW9uc1xyXG4gICAgdGhpcy5zYW1wbGVGaWxlc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTYW1wbGVGaWxlc1RhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1zYW1wbGUtZmlsZXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3NhbXBsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgZW5jcnlwdGlvbjogZHluYW1vZGIuVGFibGVFbmNyeXB0aW9uLkNVU1RPTUVSX01BTkFHRUQsXHJcbiAgICAgIGVuY3J5cHRpb25LZXk6IHRoaXMua21zS2V5LFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBTYW1wbGUgZGF0YSBjYW4gYmUgcmVjcmVhdGVkXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBsYW5ndWFnZSBhbmQgZGlmZmljdWx0eSBmaWx0ZXJpbmcgKHJlcXVpcmVkIGZvciBzYW1wbGUgc2VsZWN0aW9uKVxyXG4gICAgdGhpcy5zYW1wbGVGaWxlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnbGFuZ3VhZ2UtZGlmZmljdWx0eUxldmVsLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdsYW5ndWFnZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2RpZmZpY3VsdHlMZXZlbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciBleHBlY3RlZCBjb21wbGlhbmNlIHJhbmdlIGZpbHRlcmluZ1xyXG4gICAgdGhpcy5zYW1wbGVGaWxlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnbGFuZ3VhZ2UtZXhwZWN0ZWRDb21wbGlhbmNlLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdsYW5ndWFnZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2V4cGVjdGVkQ29tcGxpYW5jZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJIGZvciB1c2FnZSB0cmFja2luZyBhbmQgYW5hbHl0aWNzXHJcbiAgICB0aGlzLnNhbXBsZUZpbGVzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICd1c2FnZUNvdW50LWNyZWF0ZWRBdC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNhZ2VDb3VudCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NyZWF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQcm9ncmVzcyBUYWJsZSBmb3IgcmVhbC10aW1lIHVwZGF0ZXMgLSBTdG9yZXMgYW5hbHlzaXMgcHJvZ3Jlc3MgZm9yIGxpdmUgdHJhY2tpbmdcclxuICAgIHRoaXMucHJvZ3Jlc3NUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnUHJvZ3Jlc3NUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tcHJvZ3Jlc3MtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2FuYWx5c2lzSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQ1VTVE9NRVJfTUFOQUdFRCxcclxuICAgICAgZW5jcnlwdGlvbktleTogdGhpcy5rbXNLZXksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnLCAvLyBBdXRvLWNsZWFudXAgYWZ0ZXIgMjQgaG91cnNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIHVzZXIgcHJvZ3Jlc3MgdHJhY2tpbmdcclxuICAgIHRoaXMucHJvZ3Jlc3NUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC11cGRhdGVkQXQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwZGF0ZWRBdCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlUzNCdWNrZXQoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgdGhpcy5maWxlc0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0ZpbGVzQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0tZmlsZXMtJHtlbnZpcm9ubWVudH0tJHt0aGlzLmFjY291bnR9YCxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5LTVMsXHJcbiAgICAgIGVuY3J5cHRpb25LZXk6IHRoaXMua21zS2V5LFxyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZHVjdGlvbicgXHJcbiAgICAgICAgPyBjZGsuUmVtb3ZhbFBvbGljeS5SRVRBSU4gXHJcbiAgICAgICAgOiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZW52aXJvbm1lbnQgIT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgY29yczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbXHJcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkdFVCxcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUE9TVCxcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuUFVULFxyXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5IRUFELFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nXHJcbiAgICAgICAgICAgID8gWydodHRwczovL3lvdXItcHJvZHVjdGlvbi1kb21haW4uY29tJ10gLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBwcm9kdWN0aW9uIGRvbWFpblxyXG4gICAgICAgICAgICA6IFsnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsICdodHRwczovLyoudmVyY2VsLmFwcCddLFxyXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcclxuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJyxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtTUQ1JyxcclxuICAgICAgICAgICAgJ3gtYW16LWRhdGUnLFxyXG4gICAgICAgICAgICAneC1hbXotc2VjdXJpdHktdG9rZW4nLFxyXG4gICAgICAgICAgICAneC1hbXotdXNlci1hZ2VudCcsXHJcbiAgICAgICAgICAgICd4LWFtei1jb250ZW50LXNoYTI1NicsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgZXhwb3NlZEhlYWRlcnM6IFtcclxuICAgICAgICAgICAgJ0VUYWcnLFxyXG4gICAgICAgICAgICAneC1hbXotdmVyc2lvbi1pZCcsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgbWF4QWdlOiAzNjAwLCAvLyAxIGhvdXJcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGlkOiAnRGVsZXRlT2xkVmVyc2lvbnMnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICdUcmFuc2l0aW9uVG9JQScsXHJcbiAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogczMuU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLFxyXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBzMy5TdG9yYWdlQ2xhc3MuR0xBQ0lFUixcclxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IGNkay5EdXJhdGlvbi5kYXlzKDkwKSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ0Fib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZHMnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBjZGsuRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZUNvZ25pdG9Vc2VyUG9vbChlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLnVzZXJQb29sID0gbmV3IGNvZ25pdG8uVXNlclBvb2wodGhpcywgJ1VzZXJQb29sJywge1xyXG4gICAgICB1c2VyUG9vbE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2Vycy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiB0cnVlLFxyXG4gICAgICBzaWduSW5BbGlhc2VzOiB7IGVtYWlsOiB0cnVlIH0sXHJcbiAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUgfSxcclxuICAgICAgcGFzc3dvcmRQb2xpY3k6IHtcclxuICAgICAgICBtaW5MZW5ndGg6IDgsXHJcbiAgICAgICAgcmVxdWlyZUxvd2VyY2FzZTogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlVXBwZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVEaWdpdHM6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgICBhY2NvdW50UmVjb3Zlcnk6IGNvZ25pdG8uQWNjb3VudFJlY292ZXJ5LkVNQUlMX09OTFksXHJcbiAgICAgIC8vIENvbmZpZ3VyZSBNRkEgZm9yIGF1dG9ub21vdXMgd29ya2Zsb3cgd2l0aCBUT1RQIHN1cHBvcnRcclxuICAgICAgbWZhOiBjb2duaXRvLk1mYS5SRVFVSVJFRCwgLy8gTWFrZSBNRkEgcmVxdWlyZWQgZm9yIHByb2R1Y3Rpb24gc2VjdXJpdHlcclxuICAgICAgbWZhU2Vjb25kRmFjdG9yOiB7XHJcbiAgICAgICAgc21zOiBmYWxzZSxcclxuICAgICAgICBvdHA6IHRydWUsIC8vIEVuYWJsZSBUT1RQIE1GQSBmb3IgU09GVFdBUkVfVE9LRU5fTUZBIGNoYWxsZW5nZSBmbG93XHJcbiAgICAgIH0sXHJcbiAgICAgIHN0YW5kYXJkQXR0cmlidXRlczoge1xyXG4gICAgICAgIGVtYWlsOiB7IHJlcXVpcmVkOiB0cnVlLCBtdXRhYmxlOiBmYWxzZSB9LFxyXG4gICAgICAgIGdpdmVuTmFtZTogeyByZXF1aXJlZDogdHJ1ZSwgbXV0YWJsZTogdHJ1ZSB9LFxyXG4gICAgICAgIGZhbWlseU5hbWU6IHsgcmVxdWlyZWQ6IGZhbHNlLCBtdXRhYmxlOiB0cnVlIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIGN1c3RvbUF0dHJpYnV0ZXM6IHtcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbWF4TGVuOiAyNTYsIG11dGFibGU6IHRydWUgfSksXHJcbiAgICAgICAgcm9sZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbWF4TGVuOiA1MCwgbXV0YWJsZTogdHJ1ZSB9KSxcclxuICAgICAgICAvLyBBZGQgY3VzdG9tIGF0dHJpYnV0ZSB0byB0cmFjayBNRkEgc2V0dXAgc3RhdHVzIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICAgICAgbWZhU2V0dXBDb21wbGV0ZTogbmV3IGNvZ25pdG8uU3RyaW5nQXR0cmlidXRlKHsgbWF4TGVuOiAxMCwgbXV0YWJsZTogdHJ1ZSB9KSxcclxuICAgICAgfSxcclxuICAgICAgLy8gQ29uZmlndXJlIHVzZXIgdmVyaWZpY2F0aW9uIHNldHRpbmdzIGZvciBhdXRvbm9tb3VzIHdvcmtmbG93XHJcbiAgICAgIHVzZXJWZXJpZmljYXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdNSVNSQSBQbGF0Zm9ybSAtIFZlcmlmeSB5b3VyIGVtYWlsJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdXZWxjb21lIHRvIE1JU1JBIFBsYXRmb3JtISBZb3VyIHZlcmlmaWNhdGlvbiBjb2RlIGlzIHsjIyMjfScsXHJcbiAgICAgICAgZW1haWxTdHlsZTogY29nbml0by5WZXJpZmljYXRpb25FbWFpbFN0eWxlLkNPREUsXHJcbiAgICAgIH0sXHJcbiAgICAgIC8vIENvbmZpZ3VyZSB1c2VyIGludml0YXRpb24gc2V0dGluZ3NcclxuICAgICAgdXNlckludml0YXRpb246IHtcclxuICAgICAgICBlbWFpbFN1YmplY3Q6ICdXZWxjb21lIHRvIE1JU1JBIFBsYXRmb3JtJyxcclxuICAgICAgICBlbWFpbEJvZHk6ICdZb3VyIHVzZXJuYW1lIGlzIHt1c2VybmFtZX0gYW5kIHRlbXBvcmFyeSBwYXNzd29yZCBpcyB7IyMjI30nLFxyXG4gICAgICB9LFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgID8gY2RrLlJlbW92YWxQb2xpY3kuUkVUQUlOIFxyXG4gICAgICAgIDogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSBuZXcgY29nbml0by5Vc2VyUG9vbENsaWVudCh0aGlzLCAnVXNlclBvb2xDbGllbnQnLCB7XHJcbiAgICAgIHVzZXJQb29sOiB0aGlzLnVzZXJQb29sLFxyXG4gICAgICB1c2VyUG9vbENsaWVudE5hbWU6IGBtaXNyYS1wbGF0Zm9ybS13ZWItY2xpZW50LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZ2VuZXJhdGVTZWNyZXQ6IGZhbHNlLCAvLyBQdWJsaWMgY2xpZW50IGZvciBTUEFcclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgIHVzZXJTcnA6IHRydWUsXHJcbiAgICAgICAgYWRtaW5Vc2VyUGFzc3dvcmQ6IHRydWUsXHJcbiAgICAgICAgLy8gRW5hYmxlIGN1c3RvbSBhdXRoIGZsb3cgZm9yIE1GQSBjaGFsbGVuZ2VzXHJcbiAgICAgICAgY3VzdG9tOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBhY2Nlc3NUb2tlblZhbGlkaXR5OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgIGlkVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmhvdXJzKDEpLFxyXG4gICAgICByZWZyZXNoVG9rZW5WYWxpZGl0eTogY2RrLkR1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICBwcmV2ZW50VXNlckV4aXN0ZW5jZUVycm9yczogdHJ1ZSxcclxuICAgICAgLy8gQ29uZmlndXJlIHN1cHBvcnRlZCBpZGVudGl0eSBwcm92aWRlcnNcclxuICAgICAgc3VwcG9ydGVkSWRlbnRpdHlQcm92aWRlcnM6IFtcclxuICAgICAgICBjb2duaXRvLlVzZXJQb29sQ2xpZW50SWRlbnRpdHlQcm92aWRlci5DT0dOSVRPLFxyXG4gICAgICBdLFxyXG4gICAgICAvLyBDb25maWd1cmUgT0F1dGggc2V0dGluZ3MgZm9yIHBvdGVudGlhbCBmdXR1cmUgdXNlXHJcbiAgICAgIG9BdXRoOiB7XHJcbiAgICAgICAgZmxvd3M6IHtcclxuICAgICAgICAgIGF1dGhvcml6YXRpb25Db2RlR3JhbnQ6IGZhbHNlLFxyXG4gICAgICAgICAgaW1wbGljaXRDb2RlR3JhbnQ6IGZhbHNlLFxyXG4gICAgICAgICAgY2xpZW50Q3JlZGVudGlhbHM6IGZhbHNlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgc2NvcGVzOiBbXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuRU1BSUwsXHJcbiAgICAgICAgICBjb2duaXRvLk9BdXRoU2NvcGUuT1BFTklELFxyXG4gICAgICAgICAgY29nbml0by5PQXV0aFNjb3BlLlBST0ZJTEUsXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAgLy8gQ29uZmlndXJlIHJlYWQgYW5kIHdyaXRlIGF0dHJpYnV0ZXNcclxuICAgICAgcmVhZEF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICAgICAgZW1haWxWZXJpZmllZDogdHJ1ZSxcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ29yZ2FuaXphdGlvbklkJywgJ3JvbGUnLCAnbWZhU2V0dXBDb21wbGV0ZScpLFxyXG4gICAgICB3cml0ZUF0dHJpYnV0ZXM6IG5ldyBjb2duaXRvLkNsaWVudEF0dHJpYnV0ZXMoKVxyXG4gICAgICAgIC53aXRoU3RhbmRhcmRBdHRyaWJ1dGVzKHtcclxuICAgICAgICAgIGdpdmVuTmFtZTogdHJ1ZSxcclxuICAgICAgICAgIGZhbWlseU5hbWU6IHRydWUsXHJcbiAgICAgICAgfSlcclxuICAgICAgICAud2l0aEN1c3RvbUF0dHJpYnV0ZXMoJ29yZ2FuaXphdGlvbklkJywgJ3JvbGUnLCAnbWZhU2V0dXBDb21wbGV0ZScpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIENsb3VkV2F0Y2ggbG9nIGdyb3VwIGZvciBDb2duaXRvIGV2ZW50c1xyXG4gICAgbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0NvZ25pdG9Mb2dHcm91cCcsIHtcclxuICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9jb2duaXRvL3VzZXJwb29sLyR7dGhpcy51c2VyUG9vbC51c2VyUG9vbElkfWAsXHJcbiAgICAgIHJldGVudGlvbjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEggXHJcbiAgICAgICAgOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQXBpR2F0ZXdheShlbnZpcm9ubWVudDogc3RyaW5nKSB7XHJcbiAgICAvLyBDcmVhdGUgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgZm9yIEFQSSBHYXRld2F5XHJcbiAgICBjb25zdCBhcGlMb2dHcm91cCA9IG5ldyBsb2dzLkxvZ0dyb3VwKHRoaXMsICdBcGlHYXRld2F5TG9nR3JvdXAnLCB7XHJcbiAgICAgIGxvZ0dyb3VwTmFtZTogYC9hd3MvYXBpZ2F0ZXdheS9taXNyYS1wbGF0Zm9ybS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHJldGVudGlvbjogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfTU9OVEggXHJcbiAgICAgICAgOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ01pc3JhQXBpJywge1xyXG4gICAgICByZXN0QXBpTmFtZTogYG1pc3JhLXBsYXRmb3JtLWFwaS0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgTUlTUkEgQ29tcGxpYW5jZSBQbGF0Zm9ybSBBUEkgLSAke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlcGxveU9wdGlvbnM6IHtcclxuICAgICAgICBzdGFnZU5hbWU6IGVudmlyb25tZW50LFxyXG4gICAgICAgIGxvZ2dpbmdMZXZlbDogYXBpZ2F0ZXdheS5NZXRob2RMb2dnaW5nTGV2ZWwuSU5GTyxcclxuICAgICAgICBkYXRhVHJhY2VFbmFibGVkOiBlbnZpcm9ubWVudCAhPT0gJ3Byb2R1Y3Rpb24nLFxyXG4gICAgICAgIG1ldHJpY3NFbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGFjY2Vzc0xvZ0Rlc3RpbmF0aW9uOiBuZXcgYXBpZ2F0ZXdheS5Mb2dHcm91cExvZ0Rlc3RpbmF0aW9uKGFwaUxvZ0dyb3VwKSxcclxuICAgICAgICBhY2Nlc3NMb2dGb3JtYXQ6IGFwaWdhdGV3YXkuQWNjZXNzTG9nRm9ybWF0Lmpzb25XaXRoU3RhbmRhcmRGaWVsZHMoe1xyXG4gICAgICAgICAgY2FsbGVyOiB0cnVlLFxyXG4gICAgICAgICAgaHR0cE1ldGhvZDogdHJ1ZSxcclxuICAgICAgICAgIGlwOiB0cnVlLFxyXG4gICAgICAgICAgcHJvdG9jb2w6IHRydWUsXHJcbiAgICAgICAgICByZXF1ZXN0VGltZTogdHJ1ZSxcclxuICAgICAgICAgIHJlc291cmNlUGF0aDogdHJ1ZSxcclxuICAgICAgICAgIHJlc3BvbnNlTGVuZ3RoOiB0cnVlLFxyXG4gICAgICAgICAgc3RhdHVzOiB0cnVlLFxyXG4gICAgICAgICAgdXNlcjogdHJ1ZSxcclxuICAgICAgICB9KSxcclxuICAgICAgfSxcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgICAgPyBbJ2h0dHBzOi8veW91ci1kb21haW4uY29tJ10gLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBkb21haW5cclxuICAgICAgICAgIDogYXBpZ2F0ZXdheS5Db3JzLkFMTF9PUklHSU5TLFxyXG4gICAgICAgIGFsbG93TWV0aG9kczogYXBpZ2F0ZXdheS5Db3JzLkFMTF9NRVRIT0RTLFxyXG4gICAgICAgIGFsbG93SGVhZGVyczogW1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICAgICAnWC1BbXotRGF0ZScsXHJcbiAgICAgICAgICAnWC1BcGktS2V5JyxcclxuICAgICAgICAgICdYLUNvcnJlbGF0aW9uLUlEJyxcclxuICAgICAgICAgICdYLVJlcXVlc3RlZC1XaXRoJyxcclxuICAgICAgICAgICdBY2NlcHQnLFxyXG4gICAgICAgICAgJ09yaWdpbicsXHJcbiAgICAgICAgXSxcclxuICAgICAgICBhbGxvd0NyZWRlbnRpYWxzOiBmYWxzZSxcclxuICAgICAgICBtYXhBZ2U6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgfSxcclxuICAgICAgY2xvdWRXYXRjaFJvbGU6IHRydWUsXHJcbiAgICAgIC8vIEVuYWJsZSBiaW5hcnkgbWVkaWEgdHlwZXMgZm9yIGZpbGUgdXBsb2Fkc1xyXG4gICAgICBiaW5hcnlNZWRpYVR5cGVzOiBbJyovKiddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHVzYWdlIHBsYW4gZm9yIHJhdGUgbGltaXRpbmcgYW5kIHRocm90dGxpbmdcclxuICAgIGNvbnN0IHVzYWdlUGxhbiA9IHRoaXMuYXBpLmFkZFVzYWdlUGxhbignTWlzcmFBcGlVc2FnZVBsYW4nLCB7XHJcbiAgICAgIG5hbWU6IGBtaXNyYS1wbGF0Zm9ybS11c2FnZS1wbGFuLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246IGBSYXRlIGxpbWl0aW5nIGFuZCB0aHJvdHRsaW5nIGZvciBNSVNSQSBQbGF0Zm9ybSBBUEkgLSAke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIHRocm90dGxlOiB7XHJcbiAgICAgICAgcmF0ZUxpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMTAwMCA6IDEwMCxcclxuICAgICAgICBidXJzdExpbWl0OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nID8gMjAwMCA6IDIwMCxcclxuICAgICAgfSxcclxuICAgICAgcXVvdGE6IHtcclxuICAgICAgICBsaW1pdDogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyA/IDEwMDAwMCA6IDEwMDAwLFxyXG4gICAgICAgIHBlcmlvZDogYXBpZ2F0ZXdheS5QZXJpb2QuREFZLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgdXNhZ2VQbGFuLmFkZEFwaVN0YWdlKHtcclxuICAgICAgc3RhZ2U6IHRoaXMuYXBpLmRlcGxveW1lbnRTdGFnZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgS2V5IGZvciBtb25pdG9yaW5nIChvcHRpb25hbClcclxuICAgIGNvbnN0IGFwaUtleSA9IHRoaXMuYXBpLmFkZEFwaUtleSgnTWlzcmFBcGlLZXknLCB7XHJcbiAgICAgIGFwaUtleU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1hcGkta2V5LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246IGBBUEkgS2V5IGZvciBNSVNSQSBQbGF0Zm9ybSAtICR7ZW52aXJvbm1lbnR9YCxcclxuICAgIH0pO1xyXG5cclxuICAgIHVzYWdlUGxhbi5hZGRBcGlLZXkoYXBpS2V5KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY3JlYXRlQXBpRW5kcG9pbnRzKGVudmlyb25tZW50OiBzdHJpbmcpIHtcclxuICAgIC8vIENyZWF0ZSBMYW1iZGEgQXV0aG9yaXplciBmb3IgSldUIHZhbGlkYXRpb25cclxuICAgIGNvbnN0IGF1dGhvcml6ZXIgPSBuZXcgYXBpZ2F0ZXdheS5SZXF1ZXN0QXV0aG9yaXplcih0aGlzLCAnSnd0QXV0aG9yaXplcicsIHtcclxuICAgICAgaGFuZGxlcjogdGhpcy5hdXRob3JpemVyRnVuY3Rpb24sXHJcbiAgICAgIGlkZW50aXR5U291cmNlczogW2FwaWdhdGV3YXkuSWRlbnRpdHlTb3VyY2UuaGVhZGVyKCdBdXRob3JpemF0aW9uJyldLFxyXG4gICAgICBhdXRob3JpemVyTmFtZTogYGp3dC1hdXRob3JpemVyLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcmVzdWx0c0NhY2hlVHRsOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSwgLy8gQ2FjaGUgYXV0aG9yaXphdGlvbiByZXN1bHRzIGZvciA1IG1pbnV0ZXNcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgcmVzb3VyY2Ugc3RydWN0dXJlXHJcbiAgICAvLyAvYXV0aCAtIEF1dGhlbnRpY2F0aW9uIGVuZHBvaW50cyAocHVibGljKVxyXG4gICAgY29uc3QgYXV0aFJlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYXV0aCcpO1xyXG4gICAgXHJcbiAgICAvLyAvZmlsZXMgLSBGaWxlIG1hbmFnZW1lbnQgZW5kcG9pbnRzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBmaWxlc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnZmlsZXMnKTtcclxuICAgIFxyXG4gICAgLy8gL2FuYWx5c2lzIC0gQW5hbHlzaXMgZW5kcG9pbnRzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc291cmNlID0gdGhpcy5hcGkucm9vdC5hZGRSZXNvdXJjZSgnYW5hbHlzaXMnKTtcclxuICAgIFxyXG4gICAgLy8gL3VzZXIgLSBVc2VyIHByb2ZpbGUgZW5kcG9pbnRzIChwcm90ZWN0ZWQpXHJcbiAgICBjb25zdCB1c2VyUmVzb3VyY2UgPSB0aGlzLmFwaS5yb290LmFkZFJlc291cmNlKCd1c2VyJyk7XHJcblxyXG4gICAgLy8gSGVhbHRoIGNoZWNrIGVuZHBvaW50IChwdWJsaWMpXHJcbiAgICBjb25zdCBoZWFsdGhSZXNvdXJjZSA9IHRoaXMuYXBpLnJvb3QuYWRkUmVzb3VyY2UoJ2hlYWx0aCcpO1xyXG4gICAgXHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5Lk1vY2tJbnRlZ3JhdGlvbih7XHJcbiAgICAgIGludGVncmF0aW9uUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlVGVtcGxhdGVzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgc3RhdHVzOiAnaGVhbHRoeScsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogJyRjb250ZXh0LnJlcXVlc3RUaW1lJyxcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IGVudmlyb25tZW50LFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IFwiJyonXCIsXHJcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogXCInQ29udGVudC1UeXBlLEF1dGhvcml6YXRpb24nXCIsXHJcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJzogXCInR0VULE9QVElPTlMnXCIsXHJcbiAgICAgICAgfSxcclxuICAgICAgfV0sXHJcbiAgICAgIHJlcXVlc3RUZW1wbGF0ZXM6IHtcclxuICAgICAgICAnYXBwbGljYXRpb24vanNvbic6ICd7XCJzdGF0dXNDb2RlXCI6IDIwMH0nLFxyXG4gICAgICB9LFxyXG4gICAgfSksIHtcclxuICAgICAgbWV0aG9kUmVzcG9uc2VzOiBbe1xyXG4gICAgICAgIHN0YXR1c0NvZGU6ICcyMDAnLFxyXG4gICAgICAgIHJlc3BvbnNlTW9kZWxzOiB7XHJcbiAgICAgICAgICAnYXBwbGljYXRpb24vanNvbic6IGFwaWdhdGV3YXkuTW9kZWwuRU1QVFlfTU9ERUwsXHJcbiAgICAgICAgfSxcclxuICAgICAgICByZXNwb25zZVBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6IHRydWUsXHJcbiAgICAgICAgICAnbWV0aG9kLnJlc3BvbnNlLmhlYWRlci5BY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogdHJ1ZSxcclxuICAgICAgICAgICdtZXRob2QucmVzcG9uc2UuaGVhZGVyLkFjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiB0cnVlLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1dLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU3RvcmUgYXV0aG9yaXplciBmb3IgdXNlIGluIExhbWJkYSBmdW5jdGlvbiBjcmVhdGlvbiAod2hlbiBpbXBsZW1lbnRlZClcclxuICAgICh0aGlzIGFzIGFueSkubGFtYmRhQXV0aG9yaXplciA9IGF1dGhvcml6ZXI7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZVNlY3JldHMoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgLy8gSldUIFNlY3JldCBmb3IgTGFtYmRhIGF1dGhvcml6ZXJcclxuICAgIHRoaXMuand0U2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnSnd0U2VjcmV0Jywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0vand0LXNlY3JldC0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSldUIHNpZ25pbmcgc2VjcmV0IGZvciBNSVNSQSBwbGF0Zm9ybScsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XHJcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHsgYWxnb3JpdGhtOiAnSFMyNTYnIH0pLFxyXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAnc2VjcmV0JyxcclxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcJyxcclxuICAgICAgICBwYXNzd29yZExlbmd0aDogNjQsXHJcbiAgICAgIH0sXHJcbiAgICAgIGVuY3J5cHRpb25LZXk6IHRoaXMua21zS2V5LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQVBJIEtleXMgZm9yIGV4dGVybmFsIHNlcnZpY2VzIChpZiBuZWVkZWQpXHJcbiAgICBuZXcgc2VjcmV0c21hbmFnZXIuU2VjcmV0KHRoaXMsICdBcGlLZXlzJywge1xyXG4gICAgICBzZWNyZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0vYXBpLWtleXMtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBrZXlzIGZvciBleHRlcm5hbCBzZXJ2aWNlcycsXHJcbiAgICAgIHNlY3JldE9iamVjdFZhbHVlOiB7XHJcbiAgICAgICAgcGxhY2Vob2xkZXI6IGNkay5TZWNyZXRWYWx1ZS51bnNhZmVQbGFpblRleHQoJ3JlcGxhY2Utd2l0aC1hY3R1YWwta2V5cycpLFxyXG4gICAgICB9LFxyXG4gICAgICBlbmNyeXB0aW9uS2V5OiB0aGlzLmttc0tleSxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjcmVhdGVMYW1iZGFGdW5jdGlvbnMoZW52aXJvbm1lbnQ6IHN0cmluZykge1xyXG4gICAgLy8gTGFtYmRhIEF1dGhvcml6ZXIgRnVuY3Rpb25cclxuICAgIHRoaXMuYXV0aG9yaXplckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQXV0aG9yaXplckZ1bmN0aW9uJywge1xyXG4gICAgICBmdW5jdGlvbk5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1hdXRob3JpemVyLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMvYXV0aC9hdXRob3JpemVyJyksXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogdGhpcy5qd3RTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB0aGlzLnVzZXJzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEVOVklST05NRU5UOiBlbnZpcm9ubWVudCxcclxuICAgICAgfSxcclxuICAgICAgbG9nUmV0ZW50aW9uOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nIFxyXG4gICAgICAgID8gbG9ncy5SZXRlbnRpb25EYXlzLk9ORV9NT05USCBcclxuICAgICAgICA6IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IHBlcm1pc3Npb25zIHRvIHRoZSBhdXRob3JpemVyIGZ1bmN0aW9uXHJcbiAgICB0aGlzLmp3dFNlY3JldC5ncmFudFJlYWQodGhpcy5hdXRob3JpemVyRnVuY3Rpb24pO1xyXG4gICAgdGhpcy51c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEodGhpcy5hdXRob3JpemVyRnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIEFkZCBDbG91ZFdhdGNoIHBlcm1pc3Npb25zIGZvciBzdHJ1Y3R1cmVkIGxvZ2dpbmdcclxuICAgIHRoaXMuYXV0aG9yaXplckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxyXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW2Bhcm46YXdzOmxvZ3M6JHt0aGlzLnJlZ2lvbn06JHt0aGlzLmFjY291bnR9OmxvZy1ncm91cDovYXdzL2xhbWJkYS8qYF0sXHJcbiAgICB9KSk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNyZWF0ZU91dHB1dHMoKSB7XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnVXNlclBvb2xJZCcsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudXNlclBvb2wudXNlclBvb2xJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdDb2duaXRvIFVzZXIgUG9vbCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Vc2VyUG9vbElkYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2VyUG9vbENsaWVudElkJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0NvZ25pdG8gVXNlciBQb29sIENsaWVudCBJRCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Vc2VyUG9vbENsaWVudElkYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBcGlHYXRld2F5VXJsJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hcGkudXJsLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1BcGlVcmxgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0ZpbGVzQnVja2V0TmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuZmlsZXNCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdTMyBGaWxlcyBCdWNrZXQgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1GaWxlc0J1Y2tldGAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnS21zS2V5SWQnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmttc0tleS5rZXlJZCxcclxuICAgICAgZGVzY3JpcHRpb246ICdLTVMgS2V5IElEJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUttc0tleUlkYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExhbWJkYSBGdW5jdGlvbnNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBdXRob3JpemVyRnVuY3Rpb25OYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hdXRob3JpemVyRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0xhbWJkYSBBdXRob3JpemVyIEZ1bmN0aW9uIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQXV0aG9yaXplckZ1bmN0aW9uYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdBdXRob3JpemVyRnVuY3Rpb25Bcm4nLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmF1dGhvcml6ZXJGdW5jdGlvbi5mdW5jdGlvbkFybixcclxuICAgICAgZGVzY3JpcHRpb246ICdMYW1iZGEgQXV0aG9yaXplciBGdW5jdGlvbiBBUk4nLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tQXV0aG9yaXplckZ1bmN0aW9uQXJuYCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNlY3JldHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdKd3RTZWNyZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5qd3RTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdKV1QgU2VjcmV0IE5hbWUgaW4gU2VjcmV0cyBNYW5hZ2VyJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LUp3dFNlY3JldE5hbWVgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRHluYW1vREIgVGFibGUgTmFtZXNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdVc2Vyc1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudXNlcnNUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnVXNlcnMgRHluYW1vREIgVGFibGUgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1Vc2Vyc1RhYmxlYCxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGaWxlTWV0YWRhdGFUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLmZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdGaWxlIE1ldGFkYXRhIER5bmFtb0RCIFRhYmxlIE5hbWUnLFxyXG4gICAgICBleHBvcnROYW1lOiBgJHt0aGlzLnN0YWNrTmFtZX0tRmlsZU1ldGFkYXRhVGFibGVgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0FuYWx5c2lzUmVzdWx0c1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMuYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0FuYWx5c2lzIFJlc3VsdHMgRHluYW1vREIgVGFibGUgTmFtZScsXHJcbiAgICAgIGV4cG9ydE5hbWU6IGAke3RoaXMuc3RhY2tOYW1lfS1BbmFseXNpc1Jlc3VsdHNUYWJsZWAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2FtcGxlRmlsZXNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnNhbXBsZUZpbGVzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1NhbXBsZSBGaWxlcyBEeW5hbW9EQiBUYWJsZSBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVNhbXBsZUZpbGVzVGFibGVgLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2dyZXNzVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5wcm9ncmVzc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9ncmVzcyBEeW5hbW9EQiBUYWJsZSBOYW1lJyxcclxuICAgICAgZXhwb3J0TmFtZTogYCR7dGhpcy5zdGFja05hbWV9LVByb2dyZXNzVGFibGVgLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59Il19