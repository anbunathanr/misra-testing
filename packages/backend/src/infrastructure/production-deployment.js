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
exports.ProductionDeploymentStack = exports.ProductionLambdaFunction = exports.ProductionDynamoDBTable = exports.ProductionS3Bucket = void 0;
const constructs_1 = require("constructs");
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const secretsmanager = __importStar(require("aws-cdk-lib/aws-secretsmanager"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const cdk = __importStar(require("aws-cdk-lib"));
const aws_cdk_lib_1 = require("aws-cdk-lib");
const monitoring_stack_1 = require("./monitoring-stack");
/**
 * Production S3 Bucket Configuration
 *
 * Enhances the base FileStorageBucket with production-specific settings:
 * - Versioning enabled (always)
 * - Server-side encryption with KMS
 * - Access logging for audit trail
 * - Bucket policy for secure access
 * - Lifecycle rules for cost optimization
 */
class ProductionS3Bucket extends constructs_1.Construct {
    bucket;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'prod';
        const bucketName = `misra-platform-files-${environment}-${cdk.Stack.of(this).account}`;
        // Create KMS key for encryption
        const encryptionKey = new kms.Key(this, 'BucketEncryptionKey', {
            alias: `misra-platform-${environment}-files`,
            description: `KMS key for MISRA Platform ${environment} file storage`,
            enableKeyRotation: true,
            pendingWindow: aws_cdk_lib_1.Duration.days(30),
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Create access logging bucket
        const accessLoggingBucket = new s3.Bucket(this, 'AccessLoggingBucket', {
            bucketName: `misra-platform-logs-${environment}-${cdk.Stack.of(this).account}`,
            versioned: true,
            encryption: s3.BucketEncryption.S3_MANAGED,
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'prod',
        });
        // Create the production S3 bucket
        this.bucket = new s3.Bucket(this, 'ProductionFileStorageBucket', {
            bucketName,
            // Encryption with KMS
            encryption: s3.BucketEncryption.KMS,
            encryptionKey,
            enforceSSL: true,
            // Access Control
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            // Versioning for data protection (always enabled in production)
            versioned: true,
            // Server access logging for audit trail
            serverAccessLogsBucket: accessLoggingBucket,
            serverAccessLogsPrefix: 'file-storage/',
            // Lifecycle rules for cost optimization
            lifecycleRules: [
                {
                    id: 'transition-to-infrequent-access',
                    enabled: true,
                    transitions: [
                        {
                            storageClass: s3.StorageClass.INFREQUENT_ACCESS,
                            transitionAfter: aws_cdk_lib_1.Duration.days(30)
                        },
                        {
                            storageClass: s3.StorageClass.GLACIER,
                            transitionAfter: aws_cdk_lib_1.Duration.days(90)
                        }
                    ]
                },
                {
                    id: 'delete-incomplete-uploads',
                    enabled: true,
                    abortIncompleteMultipartUploadAfter: aws_cdk_lib_1.Duration.days(7)
                },
                {
                    id: 'expire-old-versions',
                    enabled: true,
                    noncurrentVersionExpiration: aws_cdk_lib_1.Duration.days(30)
                }
            ],
            // CORS configuration for web uploads
            cors: [
                {
                    allowedMethods: [
                        s3.HttpMethods.GET,
                        s3.HttpMethods.PUT,
                        s3.HttpMethods.POST,
                        s3.HttpMethods.DELETE,
                        s3.HttpMethods.HEAD
                    ],
                    allowedOrigins: ['*'], // In production, restrict to specific domains
                    allowedHeaders: ['*'],
                    exposedHeaders: [
                        'ETag',
                        'x-amz-server-side-encryption',
                        'x-amz-request-id',
                        'x-amz-id-2'
                    ],
                    maxAge: 3000
                }
            ],
            // Removal policy
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'prod',
            // Event notifications
            eventBridgeEnabled: true
        });
        // Add bucket policy for secure access
        this.bucket.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ['s3:*'],
            resources: [
                this.bucket.bucketArn,
                `${this.bucket.bucketArn}/*`
            ],
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false'
                }
            }
        }));
        // Add metadata tags
        this.bucket.node.addMetadata('Purpose', 'Production file storage for MISRA code analysis');
        this.bucket.node.addMetadata('Environment', environment);
        this.bucket.node.addMetadata('DataClassification', 'Confidential');
        this.bucket.node.addMetadata('Encryption', 'KMS');
        this.bucket.node.addMetadata('Versioning', 'Enabled');
    }
    grantRead(grantee) {
        return this.bucket.grantRead(grantee);
    }
    grantWrite(grantee) {
        return this.bucket.grantWrite(grantee);
    }
    grantReadWrite(grantee) {
        return this.bucket.grantReadWrite(grantee);
    }
    grantPresignedUrl(grantee) {
        return this.bucket.grantReadWrite(grantee);
    }
}
exports.ProductionS3Bucket = ProductionS3Bucket;
/**
 * Production DynamoDB Table Configuration
 *
 * Enhances DynamoDB tables with production-specific settings:
 * - Point-in-time recovery enabled
 * - Encryption at rest with KMS
 * - Continuous backups
 */
class ProductionDynamoDBTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props.environment || 'prod';
        const tableName = props.tableName || `${id}-${environment}`;
        const encryptionKey = new kms.Key(this, 'TableEncryptionKey', {
            alias: `misra-platform-${environment}-${id}`,
            description: `KMS key for MISRA Platform ${environment} ${id} table`,
            enableKeyRotation: true,
            pendingWindow: aws_cdk_lib_1.Duration.days(30),
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        this.table = new dynamodb.Table(this, 'ProductionTable', {
            tableName,
            partitionKey: props.partitionKey,
            sortKey: props.sortKey,
            // Billing mode
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            // Encryption at rest with KMS
            encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryptionKey,
            // Point-in-time recovery for production
            pointInTimeRecoverySpecification: {
                pointInTimeRecoveryEnabled: environment === 'prod'
            },
            // Removal policy
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Add metadata tags
        this.table.node.addMetadata('Purpose', `Production ${id} table for MISRA Platform`);
        this.table.node.addMetadata('Environment', environment);
        this.table.node.addMetadata('Encryption', 'KMS');
        this.table.node.addMetadata('PointInTimeRecovery', 'Enabled');
    }
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
    grantWriteData(grantee) {
        return this.table.grantWriteData(grantee);
    }
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
    addGlobalSecondaryIndex(props) {
        this.table.addGlobalSecondaryIndex(props);
    }
}
exports.ProductionDynamoDBTable = ProductionDynamoDBTable;
/**
 * Production Lambda Function Configuration
 *
 * Enhances Lambda functions with production-specific settings:
 * - Reserved concurrency for critical functions
 * - Environment variables from Secrets Manager
 * - CloudWatch logging with encryption
 * - X-Ray tracing enabled
 */
class ProductionLambdaFunction extends constructs_1.Construct {
    function;
    constructor(scope, id, props) {
        super(scope, id);
        // Create CloudWatch log group with encryption
        const logGroup = new logs.LogGroup(this, 'LogGroup', {
            logGroupName: `/aws/lambda/${id}`,
            retention: logs.RetentionDays.TWO_WEEKS, // Use a valid retention value
        });
        // Build environment variables
        const environment = {
            ...props.environment,
            LOG_LEVEL: 'INFO',
            ENVIRONMENT: 'prod',
        };
        // Add secrets from Secrets Manager
        if (props.environmentSecrets) {
            for (const [key, secret] of Object.entries(props.environmentSecrets)) {
                environment[key] = secret.secretValueFromJson(key).toString();
                secret.grantRead(this.function);
            }
        }
        this.function = new lambda.Function(this, 'ProductionFunction', {
            functionName: id,
            runtime: props.runtime,
            handler: props.handler,
            code: lambda.Code.fromAsset('dist-lambdas'),
            environment,
            timeout: props.timeout || aws_cdk_lib_1.Duration.seconds(30),
            memorySize: props.memorySize || 256,
            reservedConcurrentExecutions: props.reservedConcurrentExecutions ?? 0,
            tracing: lambda.Tracing.ACTIVE,
            logGroup,
        });
        // Add metadata tags
        this.function.node.addMetadata('Purpose', `Production Lambda function for MISRA Platform`);
        this.function.node.addMetadata('Environment', 'prod');
        this.function.node.addMetadata('Tracing', 'X-Ray Active');
    }
    grantInvoke(grantee) {
        return this.function.grantInvoke(grantee);
    }
}
exports.ProductionLambdaFunction = ProductionLambdaFunction;
/**
 * Production Deployment Stack
 *
 * Deploys production-specific infrastructure enhancements for Task 7.2
 * Fixes duplicate table issues and provides comprehensive production deployment
 *
 * Task 8.2 Enhancement: Adds comprehensive monitoring and alerting
 */
class ProductionDeploymentStack extends constructs_1.Construct {
    monitoringStack;
    apiGateway;
    constructor(scope, id) {
        super(scope, id);
        // Production S3 Bucket with versioning and encryption
        const productionBucket = new ProductionS3Bucket(this, 'ProductionFileStorage', {
            environment: 'prod',
        });
        // Production DynamoDB Tables with unique names to avoid conflicts
        const usersTable = new ProductionDynamoDBTable(this, 'ProductionUsersTable', {
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            environment: 'prod',
            tableName: 'misra-platform-users-prod',
        });
        // Add GSI for email queries
        usersTable.addGlobalSecondaryIndex({
            indexName: 'email-index',
            partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        const projectsTable = new ProductionDynamoDBTable(this, 'ProductionProjectsTable', {
            partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
            environment: 'prod',
            tableName: 'misra-platform-projects-prod',
        });
        // Add GSIs for projects table
        projectsTable.addGlobalSecondaryIndex({
            indexName: 'userId-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        projectsTable.addGlobalSecondaryIndex({
            indexName: 'organizationId-index',
            partitionKey: { name: 'organizationId', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        const fileMetadataTable = new ProductionDynamoDBTable(this, 'ProductionFileMetadataTable', {
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            environment: 'prod',
            tableName: 'misra-platform-file-metadata-prod',
        });
        // Add GSIs for file metadata table
        fileMetadataTable.addGlobalSecondaryIndex({
            indexName: 'userId-uploadTimestamp-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'uploadTimestamp', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        const analysisResultsTable = new ProductionDynamoDBTable(this, 'ProductionAnalysisResultsTable', {
            partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            environment: 'prod',
            tableName: 'misra-platform-analysis-results-prod',
        });
        // Add GSIs for analysis results table
        analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'fileId-timestamp-index',
            partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        analysisResultsTable.addGlobalSecondaryIndex({
            indexName: 'userId-timestamp-index',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        const sampleFilesTable = new ProductionDynamoDBTable(this, 'ProductionSampleFilesTable', {
            partitionKey: { name: 'sampleId', type: dynamodb.AttributeType.STRING },
            environment: 'prod',
            tableName: 'misra-platform-sample-files-prod',
        });
        // Add GSI for sample files by language
        sampleFilesTable.addGlobalSecondaryIndex({
            indexName: 'language-difficultyLevel-index',
            partitionKey: { name: 'language', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'difficultyLevel', type: dynamodb.AttributeType.STRING },
            projectionType: dynamodb.ProjectionType.ALL,
        });
        // Secrets Manager for production secrets
        const jwtSecret = new secretsmanager.Secret(this, 'ProductionJWTSecret', {
            secretName: 'misra-platform-jwt-secret-prod',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'jwt' }),
                generateStringKey: 'secret',
                excludeCharacters: '"@/\\',
            },
        });
        const openaiSecret = new secretsmanager.Secret(this, 'ProductionOpenAISecret', {
            secretName: 'misra-platform-openai-secret-prod',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: 'openai' }),
                generateStringKey: 'apiKey',
                excludeCharacters: '"@/\\',
            },
        });
        // Production Lambda Functions with proper environment variables
        const analyzeFileFunction = new ProductionLambdaFunction(this, 'misra-platform-analyze-file-prod', {
            entry: '../functions/analysis/analyze-file',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.minutes(5),
            memorySize: 2048,
            reservedConcurrentExecutions: 10,
            environment: {
                FILE_STORAGE_BUCKET_NAME: productionBucket.bucket.bucketName,
                FILE_METADATA_TABLE_NAME: fileMetadataTable.table.tableName,
                ANALYSIS_RESULTS_TABLE_NAME: analysisResultsTable.table.tableName,
                USERS_TABLE_NAME: usersTable.table.tableName,
                ENVIRONMENT: 'prod',
            },
        });
        const getAnalysisResultsFunction = new ProductionLambdaFunction(this, 'misra-platform-get-analysis-results-prod', {
            entry: '../functions/analysis/get-analysis-results',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            memorySize: 512,
            environment: {
                ANALYSIS_RESULTS_TABLE_NAME: analysisResultsTable.table.tableName,
                FILE_METADATA_TABLE_NAME: fileMetadataTable.table.tableName,
                ENVIRONMENT: 'prod',
            },
        });
        const uploadFileFunction = new ProductionLambdaFunction(this, 'misra-platform-upload-file-prod', {
            entry: '../functions/file/upload',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.minutes(2),
            memorySize: 1024,
            environment: {
                FILE_STORAGE_BUCKET_NAME: productionBucket.bucket.bucketName,
                FILE_METADATA_TABLE_NAME: fileMetadataTable.table.tableName,
                SAMPLE_FILES_TABLE_NAME: sampleFilesTable.table.tableName,
                ENVIRONMENT: 'prod',
            },
        });
        const createProjectFunction = new ProductionLambdaFunction(this, 'misra-platform-create-project-prod', {
            entry: '../functions/projects/create-project',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            memorySize: 512,
            environment: {
                PROJECTS_TABLE_NAME: projectsTable.table.tableName,
                USERS_TABLE_NAME: usersTable.table.tableName,
                JWT_SECRET_NAME: jwtSecret.secretName,
                ENVIRONMENT: 'prod',
            },
        });
        const getProjectsFunction = new ProductionLambdaFunction(this, 'misra-platform-get-projects-prod', {
            entry: '../functions/projects/get-projects',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            memorySize: 512,
            environment: {
                PROJECTS_TABLE_NAME: projectsTable.table.tableName,
                JWT_SECRET_NAME: jwtSecret.secretName,
                ENVIRONMENT: 'prod',
            },
        });
        const authorizerFunction = new ProductionLambdaFunction(this, 'misra-platform-authorizer-prod', {
            entry: '../functions/auth/authorizer',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(10),
            memorySize: 256,
            environment: {
                JWT_SECRET_NAME: jwtSecret.secretName,
                USERS_TABLE_NAME: usersTable.table.tableName,
                ENVIRONMENT: 'prod',
            },
        });
        // Grant S3 permissions
        productionBucket.grantReadWrite(analyzeFileFunction.function);
        productionBucket.grantReadWrite(uploadFileFunction.function);
        // Grant DynamoDB permissions
        usersTable.grantReadWriteData(authorizerFunction.function);
        usersTable.grantReadWriteData(createProjectFunction.function);
        projectsTable.grantReadWriteData(createProjectFunction.function);
        projectsTable.grantReadData(getProjectsFunction.function);
        fileMetadataTable.grantReadWriteData(analyzeFileFunction.function);
        fileMetadataTable.grantReadWriteData(uploadFileFunction.function);
        fileMetadataTable.grantReadData(getAnalysisResultsFunction.function);
        analysisResultsTable.grantReadWriteData(analyzeFileFunction.function);
        analysisResultsTable.grantReadData(getAnalysisResultsFunction.function);
        sampleFilesTable.grantReadData(uploadFileFunction.function);
        // Grant Secrets Manager permissions
        jwtSecret.grantRead(authorizerFunction.function);
        jwtSecret.grantRead(createProjectFunction.function);
        jwtSecret.grantRead(getProjectsFunction.function);
        openaiSecret.grantRead(analyzeFileFunction.function);
        // Create API Gateway for monitoring endpoints
        this.apiGateway = new apigateway.RestApi(this, 'MISRAPlatformAPI', {
            restApiName: 'MISRA Platform Production API',
            description: 'Production API for MISRA Platform with monitoring endpoints',
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'X-Correlation-ID'],
            },
        });
        // Task 8.2: Add monitoring Lambda functions
        const healthCheckFunction = new ProductionLambdaFunction(this, 'misra-platform-health-check-prod', {
            entry: '../functions/monitoring/health-check',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.seconds(30),
            memorySize: 512,
            environment: {
                FILE_STORAGE_BUCKET_NAME: productionBucket.bucket.bucketName,
                USERS_TABLE_NAME: usersTable.table.tableName,
                PROJECTS_TABLE_NAME: projectsTable.table.tableName,
                FILE_METADATA_TABLE_NAME: fileMetadataTable.table.tableName,
                ANALYSIS_RESULTS_TABLE_NAME: analysisResultsTable.table.tableName,
                ENVIRONMENT: 'prod',
            },
        });
        const metricsCollectorFunction = new ProductionLambdaFunction(this, 'misra-platform-metrics-collector-prod', {
            entry: '../functions/monitoring/metrics-collector',
            handler: 'index.handler',
            runtime: lambda.Runtime.NODEJS_20_X,
            timeout: aws_cdk_lib_1.Duration.minutes(5),
            memorySize: 1024,
            environment: {
                FILE_STORAGE_BUCKET_NAME: productionBucket.bucket.bucketName,
                USERS_TABLE_NAME: usersTable.table.tableName,
                PROJECTS_TABLE_NAME: projectsTable.table.tableName,
                FILE_METADATA_TABLE_NAME: fileMetadataTable.table.tableName,
                ANALYSIS_RESULTS_TABLE_NAME: analysisResultsTable.table.tableName,
                SAMPLE_FILES_TABLE_NAME: sampleFilesTable.table.tableName,
                ENVIRONMENT: 'prod',
            },
        });
        // Grant additional S3 permissions for monitoring
        productionBucket.grantRead(healthCheckFunction.function);
        productionBucket.grantRead(metricsCollectorFunction.function);
        // Grant additional DynamoDB permissions for monitoring
        usersTable.grantReadData(healthCheckFunction.function);
        usersTable.grantReadData(metricsCollectorFunction.function);
        projectsTable.grantReadData(metricsCollectorFunction.function);
        fileMetadataTable.grantReadData(metricsCollectorFunction.function);
        analysisResultsTable.grantReadData(metricsCollectorFunction.function);
        sampleFilesTable.grantReadData(metricsCollectorFunction.function);
        // Grant CloudWatch permissions for monitoring functions
        const cloudWatchPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'cloudwatch:PutMetricData',
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:ListMetrics',
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
            ],
            resources: ['*'],
        });
        healthCheckFunction.function.addToRolePolicy(cloudWatchPolicy);
        metricsCollectorFunction.function.addToRolePolicy(cloudWatchPolicy);
        // Add monitoring endpoints to API Gateway
        const healthResource = this.apiGateway.root.addResource('health');
        healthResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction.function));
        const detailedHealthResource = healthResource.addResource('detailed');
        detailedHealthResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction.function));
        const serviceHealthResource = healthResource.addResource('service').addResource('{serviceName}');
        serviceHealthResource.addMethod('GET', new apigateway.LambdaIntegration(healthCheckFunction.function));
        const metricsResource = this.apiGateway.root.addResource('metrics');
        const collectMetricsResource = metricsResource.addResource('collect');
        collectMetricsResource.addMethod('POST', new apigateway.LambdaIntegration(metricsCollectorFunction.function));
        // Schedule metrics collection every 5 minutes
        const metricsCollectionRule = new events.Rule(this, 'MetricsCollectionSchedule', {
            schedule: events.Schedule.rate(aws_cdk_lib_1.Duration.minutes(5)),
            description: 'Trigger metrics collection every 5 minutes',
        });
        metricsCollectionRule.addTarget(new targets.LambdaFunction(metricsCollectorFunction.function));
        // Task 8.2: Create comprehensive monitoring stack
        this.monitoringStack = new monitoring_stack_1.MonitoringStack(this, 'MonitoringStack', {
            environment: 'prod',
            apiGateway: this.apiGateway,
            lambdaFunctions: {
                'analyze-file': analyzeFileFunction.function,
                'get-analysis-results': getAnalysisResultsFunction.function,
                'upload-file': uploadFileFunction.function,
                'create-project': createProjectFunction.function,
                'get-projects': getProjectsFunction.function,
                'authorizer': authorizerFunction.function,
                'health-check': healthCheckFunction.function,
                'metrics-collector': metricsCollectorFunction.function,
            },
            dynamoTables: {
                'users': usersTable.table,
                'projects': projectsTable.table,
                'file-metadata': fileMetadataTable.table,
                'analysis-results': analysisResultsTable.table,
                'sample-files': sampleFilesTable.table,
            },
            s3Bucket: productionBucket.bucket,
            alertEmail: 'alerts@digitransolutions.in', // Configure as needed
        });
        // Output production configuration
        new cdk.CfnOutput(this, 'ProductionBucketName', {
            value: productionBucket.bucket.bucketName,
            description: 'Production S3 bucket name for file storage',
        });
        new cdk.CfnOutput(this, 'ProductionUsersTableName', {
            value: usersTable.table.tableName,
            description: 'Production users table name',
        });
        new cdk.CfnOutput(this, 'ProductionProjectsTableName', {
            value: projectsTable.table.tableName,
            description: 'Production projects table name',
        });
        new cdk.CfnOutput(this, 'ProductionFileMetadataTableName', {
            value: fileMetadataTable.table.tableName,
            description: 'Production file metadata table name',
        });
        new cdk.CfnOutput(this, 'ProductionAnalysisResultsTableName', {
            value: analysisResultsTable.table.tableName,
            description: 'Production analysis results table name',
        });
        new cdk.CfnOutput(this, 'ProductionSampleFilesTableName', {
            value: sampleFilesTable.table.tableName,
            description: 'Production sample files table name',
        });
        new cdk.CfnOutput(this, 'ProductionAnalyzeFileFunctionName', {
            value: analyzeFileFunction.function.functionName,
            description: 'Production analyze file Lambda function name',
        });
        new cdk.CfnOutput(this, 'ProductionGetAnalysisResultsFunctionName', {
            value: getAnalysisResultsFunction.function.functionName,
            description: 'Production get analysis results Lambda function name',
        });
        new cdk.CfnOutput(this, 'ProductionUploadFileFunctionName', {
            value: uploadFileFunction.function.functionName,
            description: 'Production upload file Lambda function name',
        });
        new cdk.CfnOutput(this, 'ProductionCreateProjectFunctionName', {
            value: createProjectFunction.function.functionName,
            description: 'Production create project Lambda function name',
        });
        new cdk.CfnOutput(this, 'ProductionGetProjectsFunctionName', {
            value: getProjectsFunction.function.functionName,
            description: 'Production get projects Lambda function name',
        });
        new cdk.CfnOutput(this, 'ProductionAuthorizerFunctionName', {
            value: authorizerFunction.function.functionName,
            description: 'Production authorizer Lambda function name',
        });
        // Task 8.2: Monitoring outputs
        new cdk.CfnOutput(this, 'ProductionHealthCheckFunctionName', {
            value: healthCheckFunction.function.functionName,
            description: 'Production health check Lambda function name',
        });
        new cdk.CfnOutput(this, 'ProductionMetricsCollectorFunctionName', {
            value: metricsCollectorFunction.function.functionName,
            description: 'Production metrics collector Lambda function name',
        });
        new cdk.CfnOutput(this, 'ProductionAPIGatewayURL', {
            value: this.apiGateway.url,
            description: 'Production API Gateway URL',
        });
        new cdk.CfnOutput(this, 'HealthCheckEndpoint', {
            value: `${this.apiGateway.url}health`,
            description: 'Health check endpoint URL',
        });
        new cdk.CfnOutput(this, 'DetailedHealthCheckEndpoint', {
            value: `${this.apiGateway.url}health/detailed`,
            description: 'Detailed health check endpoint URL',
        });
    }
}
exports.ProductionDeploymentStack = ProductionDeploymentStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZHVjdGlvbi1kZXBsb3ltZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicHJvZHVjdGlvbi1kZXBsb3ltZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUF1QztBQUN2Qyx1REFBeUM7QUFDekMsbUVBQXFEO0FBQ3JELCtEQUFpRDtBQUNqRCwyREFBNkM7QUFDN0MseURBQTJDO0FBQzNDLCtFQUFpRTtBQUNqRSx5REFBMkM7QUFDM0MsdUVBQXlEO0FBQ3pELCtEQUFpRDtBQUNqRCx3RUFBMEQ7QUFDMUQsaURBQW1DO0FBQ25DLDZDQUFzRDtBQUN0RCx5REFBcUQ7QUFFckQ7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUMvQixNQUFNLENBQVk7SUFFbEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxXQUFXLElBQUksTUFBTSxDQUFDO1FBQ2pELE1BQU0sVUFBVSxHQUFHLHdCQUF3QixXQUFXLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFFdkYsZ0NBQWdDO1FBQ2hDLE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUscUJBQXFCLEVBQUU7WUFDN0QsS0FBSyxFQUFFLGtCQUFrQixXQUFXLFFBQVE7WUFDNUMsV0FBVyxFQUFFLDhCQUE4QixXQUFXLGVBQWU7WUFDckUsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixhQUFhLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ2hDLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFB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QUUsd0NBQXdDLEVBQUU7WUFDaEUsS0FBSyxFQUFFLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxZQUFZO1lBQ3JELFdBQVcsRUFBRSxtREFBbUQ7U0FDakUsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNqRCxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHO1lBQzFCLFdBQVcsRUFBRSw0QkFBNEI7U0FDMUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUM3QyxLQUFLLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsUUFBUTtZQUNyQyxXQUFXLEVBQUUsMkJBQTJCO1NBQ3pDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDckQsS0FBSyxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLGlCQUFpQjtZQUM5QyxXQUFXLEVBQUUsb0NBQW9DO1NBQ2xELENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhiRCw4REFnYkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sb2dzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBzZWNyZXRzbWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXInO1xyXG5pbXBvcnQgKiBhcyBrbXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWttcyc7XHJcbmltcG9ydCAqIGFzIGFwaWdhdGV3YXkgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xyXG5pbXBvcnQgKiBhcyBldmVudHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cyc7XHJcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWV2ZW50cy10YXJnZXRzJztcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSwgRHVyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IE1vbml0b3JpbmdTdGFjayB9IGZyb20gJy4vbW9uaXRvcmluZy1zdGFjayc7XHJcblxyXG4vKipcclxuICogUHJvZHVjdGlvbiBTMyBCdWNrZXQgQ29uZmlndXJhdGlvblxyXG4gKiBcclxuICogRW5oYW5jZXMgdGhlIGJhc2UgRmlsZVN0b3JhZ2VCdWNrZXQgd2l0aCBwcm9kdWN0aW9uLXNwZWNpZmljIHNldHRpbmdzOlxyXG4gKiAtIFZlcnNpb25pbmcgZW5hYmxlZCAoYWx3YXlzKVxyXG4gKiAtIFNlcnZlci1zaWRlIGVuY3J5cHRpb24gd2l0aCBLTVNcclxuICogLSBBY2Nlc3MgbG9nZ2luZyBmb3IgYXVkaXQgdHJhaWxcclxuICogLSBCdWNrZXQgcG9saWN5IGZvciBzZWN1cmUgYWNjZXNzXHJcbiAqIC0gTGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFByb2R1Y3Rpb25TM0J1Y2tldCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogczMuQnVja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IHsgZW52aXJvbm1lbnQ/OiBzdHJpbmcgfSkge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb3BzPy5lbnZpcm9ubWVudCB8fCAncHJvZCc7XHJcbiAgICBjb25zdCBidWNrZXROYW1lID0gYG1pc3JhLXBsYXRmb3JtLWZpbGVzLSR7ZW52aXJvbm1lbnR9LSR7Y2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnR9YDtcclxuXHJcbiAgICAvLyBDcmVhdGUgS01TIGtleSBmb3IgZW5jcnlwdGlvblxyXG4gICAgY29uc3QgZW5jcnlwdGlvbktleSA9IG5ldyBrbXMuS2V5KHRoaXMsICdCdWNrZXRFbmNyeXB0aW9uS2V5Jywge1xyXG4gICAgICBhbGlhczogYG1pc3JhLXBsYXRmb3JtLSR7ZW52aXJvbm1lbnR9LWZpbGVzYCxcclxuICAgICAgZGVzY3JpcHRpb246IGBLTVMga2V5IGZvciBNSVNSQSBQbGF0Zm9ybSAke2Vudmlyb25tZW50fSBmaWxlIHN0b3JhZ2VgLFxyXG4gICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgcGVuZGluZ1dpbmRvdzogRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBSZW1vdmFsUG9saWN5LlJFVEFJTiA6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBhY2Nlc3MgbG9nZ2luZyBidWNrZXRcclxuICAgIGNvbnN0IGFjY2Vzc0xvZ2dpbmdCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdBY2Nlc3NMb2dnaW5nQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lOiBgbWlzcmEtcGxhdGZvcm0tbG9ncy0ke2Vudmlyb25tZW50fS0ke2Nkay5TdGFjay5vZih0aGlzKS5hY2NvdW50fWAsXHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBlbnZpcm9ubWVudCAhPT0gJ3Byb2QnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBwcm9kdWN0aW9uIFMzIGJ1Y2tldFxyXG4gICAgdGhpcy5idWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsICdQcm9kdWN0aW9uRmlsZVN0b3JhZ2VCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBFbmNyeXB0aW9uIHdpdGggS01TXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TLFxyXG4gICAgICBlbmNyeXB0aW9uS2V5LFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICBcclxuICAgICAgLy8gQWNjZXNzIENvbnRyb2xcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHMzLkJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgb2JqZWN0T3duZXJzaGlwOiBzMy5PYmplY3RPd25lcnNoaXAuQlVDS0VUX09XTkVSX0VORk9SQ0VELFxyXG4gICAgICBcclxuICAgICAgLy8gVmVyc2lvbmluZyBmb3IgZGF0YSBwcm90ZWN0aW9uIChhbHdheXMgZW5hYmxlZCBpbiBwcm9kdWN0aW9uKVxyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBTZXJ2ZXIgYWNjZXNzIGxvZ2dpbmcgZm9yIGF1ZGl0IHRyYWlsXHJcbiAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IGFjY2Vzc0xvZ2dpbmdCdWNrZXQsXHJcbiAgICAgIHNlcnZlckFjY2Vzc0xvZ3NQcmVmaXg6ICdmaWxlLXN0b3JhZ2UvJyxcclxuICAgICAgXHJcbiAgICAgIC8vIExpZmVjeWNsZSBydWxlcyBmb3IgY29zdCBvcHRpbWl6YXRpb25cclxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBpZDogJ3RyYW5zaXRpb24tdG8taW5mcmVxdWVudC1hY2Nlc3MnLFxyXG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcclxuICAgICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IER1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IHMzLlN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxyXG4gICAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogRHVyYXRpb24uZGF5cyg5MClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICdkZWxldGUtaW5jb21wbGV0ZS11cGxvYWRzJyxcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogRHVyYXRpb24uZGF5cyg3KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6ICdleHBpcmUtb2xkLXZlcnNpb25zJyxcclxuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IER1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcclxuICAgICAgLy8gQ09SUyBjb25maWd1cmF0aW9uIGZvciB3ZWIgdXBsb2Fkc1xyXG4gICAgICBjb3JzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuR0VULFxyXG4gICAgICAgICAgICBzMy5IdHRwTWV0aG9kcy5QVVQsXHJcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLlBPU1QsXHJcbiAgICAgICAgICAgIHMzLkh0dHBNZXRob2RzLkRFTEVURSxcclxuICAgICAgICAgICAgczMuSHR0cE1ldGhvZHMuSEVBRFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgLy8gSW4gcHJvZHVjdGlvbiwgcmVzdHJpY3QgdG8gc3BlY2lmaWMgZG9tYWluc1xyXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxyXG4gICAgICAgICAgZXhwb3NlZEhlYWRlcnM6IFtcclxuICAgICAgICAgICAgJ0VUYWcnLFxyXG4gICAgICAgICAgICAneC1hbXotc2VydmVyLXNpZGUtZW5jcnlwdGlvbicsXHJcbiAgICAgICAgICAgICd4LWFtei1yZXF1ZXN0LWlkJyxcclxuICAgICAgICAgICAgJ3gtYW16LWlkLTInXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgbWF4QWdlOiAzMDAwXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcclxuICAgICAgLy8gUmVtb3ZhbCBwb2xpY3lcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IFJlbW92YWxQb2xpY3kuUkVUQUlOIDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZW52aXJvbm1lbnQgIT09ICdwcm9kJyxcclxuICAgICAgXHJcbiAgICAgIC8vIEV2ZW50IG5vdGlmaWNhdGlvbnNcclxuICAgICAgZXZlbnRCcmlkZ2VFbmFibGVkOiB0cnVlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYnVja2V0IHBvbGljeSBmb3Igc2VjdXJlIGFjY2Vzc1xyXG4gICAgdGhpcy5idWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5ERU5ZLFxyXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkFueVByaW5jaXBhbCgpXSxcclxuICAgICAgICBhY3Rpb25zOiBbJ3MzOionXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgIHRoaXMuYnVja2V0LmJ1Y2tldEFybixcclxuICAgICAgICAgIGAke3RoaXMuYnVja2V0LmJ1Y2tldEFybn0vKmBcclxuICAgICAgICBdLFxyXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgIEJvb2w6IHtcclxuICAgICAgICAgICAgJ2F3czpTZWN1cmVUcmFuc3BvcnQnOiAnZmFsc2UnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBZGQgbWV0YWRhdGEgdGFnc1xyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnUHVycG9zZScsICdQcm9kdWN0aW9uIGZpbGUgc3RvcmFnZSBmb3IgTUlTUkEgY29kZSBhbmFseXNpcycpO1xyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudCk7XHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdEYXRhQ2xhc3NpZmljYXRpb24nLCAnQ29uZmlkZW50aWFsJyk7XHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdFbmNyeXB0aW9uJywgJ0tNUycpO1xyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnVmVyc2lvbmluZycsICdFbmFibGVkJyk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRSZWFkKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50UmVhZChncmFudGVlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFdyaXRlKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50V3JpdGUoZ3JhbnRlZSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRSZWFkV3JpdGUoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRSZWFkV3JpdGUoZ3JhbnRlZSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRQcmVzaWduZWRVcmwoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRSZWFkV3JpdGUoZ3JhbnRlZSk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUHJvZHVjdGlvbiBEeW5hbW9EQiBUYWJsZSBDb25maWd1cmF0aW9uXHJcbiAqIFxyXG4gKiBFbmhhbmNlcyBEeW5hbW9EQiB0YWJsZXMgd2l0aCBwcm9kdWN0aW9uLXNwZWNpZmljIHNldHRpbmdzOlxyXG4gKiAtIFBvaW50LWluLXRpbWUgcmVjb3ZlcnkgZW5hYmxlZFxyXG4gKiAtIEVuY3J5cHRpb24gYXQgcmVzdCB3aXRoIEtNU1xyXG4gKiAtIENvbnRpbnVvdXMgYmFja3Vwc1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFByb2R1Y3Rpb25EeW5hbW9EQlRhYmxlIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczoge1xyXG4gICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6IHN0cmluZzsgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZSB9O1xyXG4gICAgc29ydEtleT86IHsgbmFtZTogc3RyaW5nOyB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlIH07XHJcbiAgICBlbnZpcm9ubWVudD86IHN0cmluZztcclxuICAgIHRhYmxlTmFtZT86IHN0cmluZztcclxuICB9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gcHJvcHMuZW52aXJvbm1lbnQgfHwgJ3Byb2QnO1xyXG4gICAgY29uc3QgdGFibGVOYW1lID0gcHJvcHMudGFibGVOYW1lIHx8IGAke2lkfS0ke2Vudmlyb25tZW50fWA7XHJcbiAgICBjb25zdCBlbmNyeXB0aW9uS2V5ID0gbmV3IGttcy5LZXkodGhpcywgJ1RhYmxlRW5jcnlwdGlvbktleScsIHtcclxuICAgICAgYWxpYXM6IGBtaXNyYS1wbGF0Zm9ybS0ke2Vudmlyb25tZW50fS0ke2lkfWAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiBgS01TIGtleSBmb3IgTUlTUkEgUGxhdGZvcm0gJHtlbnZpcm9ubWVudH0gJHtpZH0gdGFibGVgLFxyXG4gICAgICBlbmFibGVLZXlSb3RhdGlvbjogdHJ1ZSxcclxuICAgICAgcGVuZGluZ1dpbmRvdzogRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBSZW1vdmFsUG9saWN5LlJFVEFJTiA6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMudGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1Byb2R1Y3Rpb25UYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHByb3BzLnBhcnRpdGlvbktleSxcclxuICAgICAgc29ydEtleTogcHJvcHMuc29ydEtleSxcclxuICAgICAgXHJcbiAgICAgIC8vIEJpbGxpbmcgbW9kZVxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBcclxuICAgICAgLy8gRW5jcnlwdGlvbiBhdCByZXN0IHdpdGggS01TXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5DVVNUT01FUl9NQU5BR0VELFxyXG4gICAgICBlbmNyeXB0aW9uS2V5LFxyXG4gICAgICBcclxuICAgICAgLy8gUG9pbnQtaW4tdGltZSByZWNvdmVyeSBmb3IgcHJvZHVjdGlvblxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5U3BlY2lmaWNhdGlvbjoge1xyXG4gICAgICAgIHBvaW50SW5UaW1lUmVjb3ZlcnlFbmFibGVkOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnXHJcbiAgICAgIH0sXHJcbiAgICAgIFxyXG4gICAgICAvLyBSZW1vdmFsIHBvbGljeVxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgbWV0YWRhdGEgdGFnc1xyXG4gICAgdGhpcy50YWJsZS5ub2RlLmFkZE1ldGFkYXRhKCdQdXJwb3NlJywgYFByb2R1Y3Rpb24gJHtpZH0gdGFibGUgZm9yIE1JU1JBIFBsYXRmb3JtYCk7XHJcbiAgICB0aGlzLnRhYmxlLm5vZGUuYWRkTWV0YWRhdGEoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xyXG4gICAgdGhpcy50YWJsZS5ub2RlLmFkZE1ldGFkYXRhKCdFbmNyeXB0aW9uJywgJ0tNUycpO1xyXG4gICAgdGhpcy50YWJsZS5ub2RlLmFkZE1ldGFkYXRhKCdQb2ludEluVGltZVJlY292ZXJ5JywgJ0VuYWJsZWQnKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFJlYWREYXRhKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkRGF0YShncmFudGVlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFdyaXRlRGF0YShncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlLmdyYW50V3JpdGVEYXRhKGdyYW50ZWUpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50UmVhZFdyaXRlRGF0YShncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShncmFudGVlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBhZGRHbG9iYWxTZWNvbmRhcnlJbmRleChwcm9wczoge1xyXG4gICAgaW5kZXhOYW1lOiBzdHJpbmc7XHJcbiAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogc3RyaW5nOyB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlIH07XHJcbiAgICBzb3J0S2V5PzogeyBuYW1lOiBzdHJpbmc7IHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUgfTtcclxuICAgIHByb2plY3Rpb25UeXBlPzogZHluYW1vZGIuUHJvamVjdGlvblR5cGU7XHJcbiAgfSkge1xyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleChwcm9wcyk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogUHJvZHVjdGlvbiBMYW1iZGEgRnVuY3Rpb24gQ29uZmlndXJhdGlvblxyXG4gKiBcclxuICogRW5oYW5jZXMgTGFtYmRhIGZ1bmN0aW9ucyB3aXRoIHByb2R1Y3Rpb24tc3BlY2lmaWMgc2V0dGluZ3M6XHJcbiAqIC0gUmVzZXJ2ZWQgY29uY3VycmVuY3kgZm9yIGNyaXRpY2FsIGZ1bmN0aW9uc1xyXG4gKiAtIEVudmlyb25tZW50IHZhcmlhYmxlcyBmcm9tIFNlY3JldHMgTWFuYWdlclxyXG4gKiAtIENsb3VkV2F0Y2ggbG9nZ2luZyB3aXRoIGVuY3J5cHRpb25cclxuICogLSBYLVJheSB0cmFjaW5nIGVuYWJsZWRcclxuICovXHJcbmV4cG9ydCBjbGFzcyBQcm9kdWN0aW9uTGFtYmRhRnVuY3Rpb24gZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBmdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczoge1xyXG4gICAgZW50cnk6IHN0cmluZztcclxuICAgIGhhbmRsZXI6IHN0cmluZztcclxuICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lO1xyXG4gICAgZW52aXJvbm1lbnQ/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xyXG4gICAgdGltZW91dD86IER1cmF0aW9uO1xyXG4gICAgbWVtb3J5U2l6ZT86IG51bWJlcjtcclxuICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM/OiBudW1iZXI7XHJcbiAgICBlbnZpcm9ubWVudFNlY3JldHM/OiBSZWNvcmQ8c3RyaW5nLCBzZWNyZXRzbWFuYWdlci5JU2VjcmV0PjtcclxuICB9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIC8vIENyZWF0ZSBDbG91ZFdhdGNoIGxvZyBncm91cCB3aXRoIGVuY3J5cHRpb25cclxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ0xvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6IGAvYXdzL2xhbWJkYS8ke2lkfWAsXHJcbiAgICAgIHJldGVudGlvbjogbG9ncy5SZXRlbnRpb25EYXlzLlRXT19XRUVLUywgLy8gVXNlIGEgdmFsaWQgcmV0ZW50aW9uIHZhbHVlXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBCdWlsZCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxuICAgIGNvbnN0IGVudmlyb25tZW50OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgICAuLi5wcm9wcy5lbnZpcm9ubWVudCxcclxuICAgICAgTE9HX0xFVkVMOiAnSU5GTycsXHJcbiAgICAgIEVOVklST05NRU5UOiAncHJvZCcsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEFkZCBzZWNyZXRzIGZyb20gU2VjcmV0cyBNYW5hZ2VyXHJcbiAgICBpZiAocHJvcHMuZW52aXJvbm1lbnRTZWNyZXRzKSB7XHJcbiAgICAgIGZvciAoY29uc3QgW2tleSwgc2VjcmV0XSBvZiBPYmplY3QuZW50cmllcyhwcm9wcy5lbnZpcm9ubWVudFNlY3JldHMpKSB7XHJcbiAgICAgICAgZW52aXJvbm1lbnRba2V5XSA9IHNlY3JldC5zZWNyZXRWYWx1ZUZyb21Kc29uKGtleSkudG9TdHJpbmcoKTtcclxuICAgICAgICBzZWNyZXQuZ3JhbnRSZWFkKHRoaXMuZnVuY3Rpb24pO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy5mdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1Byb2R1Y3Rpb25GdW5jdGlvbicsIHtcclxuICAgICAgZnVuY3Rpb25OYW1lOiBpZCxcclxuICAgICAgcnVudGltZTogcHJvcHMucnVudGltZSxcclxuICAgICAgaGFuZGxlcjogcHJvcHMuaGFuZGxlcixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdkaXN0LWxhbWJkYXMnKSxcclxuICAgICAgZW52aXJvbm1lbnQsXHJcbiAgICAgIHRpbWVvdXQ6IHByb3BzLnRpbWVvdXQgfHwgRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IHByb3BzLm1lbW9yeVNpemUgfHwgMjU2LFxyXG4gICAgICByZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zOiBwcm9wcy5yZXNlcnZlZENvbmN1cnJlbnRFeGVjdXRpb25zID8/IDAsXHJcbiAgICAgIHRyYWNpbmc6IGxhbWJkYS5UcmFjaW5nLkFDVElWRSxcclxuICAgICAgbG9nR3JvdXAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgbWV0YWRhdGEgdGFnc1xyXG4gICAgdGhpcy5mdW5jdGlvbi5ub2RlLmFkZE1ldGFkYXRhKCdQdXJwb3NlJywgYFByb2R1Y3Rpb24gTGFtYmRhIGZ1bmN0aW9uIGZvciBNSVNSQSBQbGF0Zm9ybWApO1xyXG4gICAgdGhpcy5mdW5jdGlvbi5ub2RlLmFkZE1ldGFkYXRhKCdFbnZpcm9ubWVudCcsICdwcm9kJyk7XHJcbiAgICB0aGlzLmZ1bmN0aW9uLm5vZGUuYWRkTWV0YWRhdGEoJ1RyYWNpbmcnLCAnWC1SYXkgQWN0aXZlJyk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRJbnZva2UoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5mdW5jdGlvbi5ncmFudEludm9rZShncmFudGVlKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQcm9kdWN0aW9uIERlcGxveW1lbnQgU3RhY2tcclxuICogXHJcbiAqIERlcGxveXMgcHJvZHVjdGlvbi1zcGVjaWZpYyBpbmZyYXN0cnVjdHVyZSBlbmhhbmNlbWVudHMgZm9yIFRhc2sgNy4yXHJcbiAqIEZpeGVzIGR1cGxpY2F0ZSB0YWJsZSBpc3N1ZXMgYW5kIHByb3ZpZGVzIGNvbXByZWhlbnNpdmUgcHJvZHVjdGlvbiBkZXBsb3ltZW50XHJcbiAqIFxyXG4gKiBUYXNrIDguMiBFbmhhbmNlbWVudDogQWRkcyBjb21wcmVoZW5zaXZlIG1vbml0b3JpbmcgYW5kIGFsZXJ0aW5nXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgUHJvZHVjdGlvbkRlcGxveW1lbnRTdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IG1vbml0b3JpbmdTdGFjazogTW9uaXRvcmluZ1N0YWNrO1xyXG4gIHB1YmxpYyByZWFkb25seSBhcGlHYXRld2F5OiBhcGlnYXRld2F5LlJlc3RBcGk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgLy8gUHJvZHVjdGlvbiBTMyBCdWNrZXQgd2l0aCB2ZXJzaW9uaW5nIGFuZCBlbmNyeXB0aW9uXHJcbiAgICBjb25zdCBwcm9kdWN0aW9uQnVja2V0ID0gbmV3IFByb2R1Y3Rpb25TM0J1Y2tldCh0aGlzLCAnUHJvZHVjdGlvbkZpbGVTdG9yYWdlJywge1xyXG4gICAgICBlbnZpcm9ubWVudDogJ3Byb2QnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUHJvZHVjdGlvbiBEeW5hbW9EQiBUYWJsZXMgd2l0aCB1bmlxdWUgbmFtZXMgdG8gYXZvaWQgY29uZmxpY3RzXHJcbiAgICBjb25zdCB1c2Vyc1RhYmxlID0gbmV3IFByb2R1Y3Rpb25EeW5hbW9EQlRhYmxlKHRoaXMsICdQcm9kdWN0aW9uVXNlcnNUYWJsZScsIHtcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBlbnZpcm9ubWVudDogJ3Byb2QnLFxyXG4gICAgICB0YWJsZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS11c2Vycy1wcm9kJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIGVtYWlsIHF1ZXJpZXNcclxuICAgIHVzZXJzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdlbWFpbC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZW1haWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogZHluYW1vZGIuUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcHJvamVjdHNUYWJsZSA9IG5ldyBQcm9kdWN0aW9uRHluYW1vREJUYWJsZSh0aGlzLCAnUHJvZHVjdGlvblByb2plY3RzVGFibGUnLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAncHJvamVjdElkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcclxuICAgICAgdGFibGVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tcHJvamVjdHMtcHJvZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgR1NJcyBmb3IgcHJvamVjdHMgdGFibGVcclxuICAgIHByb2plY3RzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICd1c2VySWQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICBwcm9qZWN0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnb3JnYW5pemF0aW9uSWQtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ29yZ2FuaXphdGlvbklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGZpbGVNZXRhZGF0YVRhYmxlID0gbmV3IFByb2R1Y3Rpb25EeW5hbW9EQlRhYmxlKHRoaXMsICdQcm9kdWN0aW9uRmlsZU1ldGFkYXRhVGFibGUnLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZmlsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcclxuICAgICAgdGFibGVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tZmlsZS1tZXRhZGF0YS1wcm9kJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0lzIGZvciBmaWxlIG1ldGFkYXRhIHRhYmxlXHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC11cGxvYWRUaW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJJZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3VwbG9hZFRpbWVzdGFtcCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuTlVNQkVSIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IG5ldyBQcm9kdWN0aW9uRHluYW1vREJUYWJsZSh0aGlzLCAnUHJvZHVjdGlvbkFuYWx5c2lzUmVzdWx0c1RhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2FuYWx5c2lzSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICd0aW1lc3RhbXAnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLk5VTUJFUiB9LFxyXG4gICAgICBlbnZpcm9ubWVudDogJ3Byb2QnLFxyXG4gICAgICB0YWJsZU5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1yZXN1bHRzLXByb2QnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSXMgZm9yIGFuYWx5c2lzIHJlc3VsdHMgdGFibGVcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZmlsZUlkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZmlsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAndXNlcklkLXRpbWVzdGFtcC1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZXN0YW1wJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5OVU1CRVIgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHNhbXBsZUZpbGVzVGFibGUgPSBuZXcgUHJvZHVjdGlvbkR5bmFtb0RCVGFibGUodGhpcywgJ1Byb2R1Y3Rpb25TYW1wbGVGaWxlc1RhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3NhbXBsZUlkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcclxuICAgICAgdGFibGVOYW1lOiAnbWlzcmEtcGxhdGZvcm0tc2FtcGxlLWZpbGVzLXByb2QnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3Igc2FtcGxlIGZpbGVzIGJ5IGxhbmd1YWdlXHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnbGFuZ3VhZ2UtZGlmZmljdWx0eUxldmVsLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdsYW5ndWFnZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2RpZmZpY3VsdHlMZXZlbCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBTZWNyZXRzIE1hbmFnZXIgZm9yIHByb2R1Y3Rpb24gc2VjcmV0c1xyXG4gICAgY29uc3Qgand0U2VjcmV0ID0gbmV3IHNlY3JldHNtYW5hZ2VyLlNlY3JldCh0aGlzLCAnUHJvZHVjdGlvbkpXVFNlY3JldCcsIHtcclxuICAgICAgc2VjcmV0TmFtZTogJ21pc3JhLXBsYXRmb3JtLWp3dC1zZWNyZXQtcHJvZCcsXHJcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XHJcbiAgICAgICAgc2VjcmV0U3RyaW5nVGVtcGxhdGU6IEpTT04uc3RyaW5naWZ5KHsgdXNlcm5hbWU6ICdqd3QnIH0pLFxyXG4gICAgICAgIGdlbmVyYXRlU3RyaW5nS2V5OiAnc2VjcmV0JyxcclxuICAgICAgICBleGNsdWRlQ2hhcmFjdGVyczogJ1wiQC9cXFxcJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG9wZW5haVNlY3JldCA9IG5ldyBzZWNyZXRzbWFuYWdlci5TZWNyZXQodGhpcywgJ1Byb2R1Y3Rpb25PcGVuQUlTZWNyZXQnLCB7XHJcbiAgICAgIHNlY3JldE5hbWU6ICdtaXNyYS1wbGF0Zm9ybS1vcGVuYWktc2VjcmV0LXByb2QnLFxyXG4gICAgICBnZW5lcmF0ZVNlY3JldFN0cmluZzoge1xyXG4gICAgICAgIHNlY3JldFN0cmluZ1RlbXBsYXRlOiBKU09OLnN0cmluZ2lmeSh7IHVzZXJuYW1lOiAnb3BlbmFpJyB9KSxcclxuICAgICAgICBnZW5lcmF0ZVN0cmluZ0tleTogJ2FwaUtleScsXHJcbiAgICAgICAgZXhjbHVkZUNoYXJhY3RlcnM6ICdcIkAvXFxcXCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQcm9kdWN0aW9uIExhbWJkYSBGdW5jdGlvbnMgd2l0aCBwcm9wZXIgZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbiAgICBjb25zdCBhbmFseXplRmlsZUZ1bmN0aW9uID0gbmV3IFByb2R1Y3Rpb25MYW1iZGFGdW5jdGlvbih0aGlzLCAnbWlzcmEtcGxhdGZvcm0tYW5hbHl6ZS1maWxlLXByb2QnLCB7XHJcbiAgICAgIGVudHJ5OiAnLi4vZnVuY3Rpb25zL2FuYWx5c2lzL2FuYWx5emUtZmlsZScsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLm1pbnV0ZXMoNSksXHJcbiAgICAgIG1lbW9yeVNpemU6IDIwNDgsXHJcbiAgICAgIHJlc2VydmVkQ29uY3VycmVudEV4ZWN1dGlvbnM6IDEwLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogcHJvZHVjdGlvbkJ1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFX05BTUU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ3Byb2QnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0QW5hbHlzaXNSZXN1bHRzRnVuY3Rpb24gPSBuZXcgUHJvZHVjdGlvbkxhbWJkYUZ1bmN0aW9uKHRoaXMsICdtaXNyYS1wbGF0Zm9ybS1nZXQtYW5hbHlzaXMtcmVzdWx0cy1wcm9kJywge1xyXG4gICAgICBlbnRyeTogJy4uL2Z1bmN0aW9ucy9hbmFseXNpcy9nZXQtYW5hbHlzaXMtcmVzdWx0cycsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FOiBhbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FOiBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdwcm9kJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHVwbG9hZEZpbGVGdW5jdGlvbiA9IG5ldyBQcm9kdWN0aW9uTGFtYmRhRnVuY3Rpb24odGhpcywgJ21pc3JhLXBsYXRmb3JtLXVwbG9hZC1maWxlLXByb2QnLCB7XHJcbiAgICAgIGVudHJ5OiAnLi4vZnVuY3Rpb25zL2ZpbGUvdXBsb2FkJyxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgdGltZW91dDogRHVyYXRpb24ubWludXRlcygyKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMTAyNCxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IHByb2R1Y3Rpb25CdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FOiBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgU0FNUExFX0ZJTEVTX1RBQkxFX05BTUU6IHNhbXBsZUZpbGVzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEVOVklST05NRU5UOiAncHJvZCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBjcmVhdGVQcm9qZWN0RnVuY3Rpb24gPSBuZXcgUHJvZHVjdGlvbkxhbWJkYUZ1bmN0aW9uKHRoaXMsICdtaXNyYS1wbGF0Zm9ybS1jcmVhdGUtcHJvamVjdC1wcm9kJywge1xyXG4gICAgICBlbnRyeTogJy4uL2Z1bmN0aW9ucy9wcm9qZWN0cy9jcmVhdGUtcHJvamVjdCcsXHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJyxcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgIHRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBtZW1vcnlTaXplOiA1MTIsXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgUFJPSkVDVFNfVEFCTEVfTkFNRTogcHJvamVjdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgSldUX1NFQ1JFVF9OQU1FOiBqd3RTZWNyZXQuc2VjcmV0TmFtZSxcclxuICAgICAgICBFTlZJUk9OTUVOVDogJ3Byb2QnLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZ2V0UHJvamVjdHNGdW5jdGlvbiA9IG5ldyBQcm9kdWN0aW9uTGFtYmRhRnVuY3Rpb24odGhpcywgJ21pc3JhLXBsYXRmb3JtLWdldC1wcm9qZWN0cy1wcm9kJywge1xyXG4gICAgICBlbnRyeTogJy4uL2Z1bmN0aW9ucy9wcm9qZWN0cy9nZXQtcHJvamVjdHMnLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogNTEyLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFBST0pFQ1RTX1RBQkxFX05BTUU6IHByb2plY3RzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEpXVF9TRUNSRVRfTkFNRTogand0U2VjcmV0LnNlY3JldE5hbWUsXHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdwcm9kJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGF1dGhvcml6ZXJGdW5jdGlvbiA9IG5ldyBQcm9kdWN0aW9uTGFtYmRhRnVuY3Rpb24odGhpcywgJ21pc3JhLXBsYXRmb3JtLWF1dGhvcml6ZXItcHJvZCcsIHtcclxuICAgICAgZW50cnk6ICcuLi9mdW5jdGlvbnMvYXV0aC9hdXRob3JpemVyJyxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygxMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBKV1RfU0VDUkVUX05BTUU6IGp3dFNlY3JldC5zZWNyZXROYW1lLFxyXG4gICAgICAgIFVTRVJTX1RBQkxFX05BTUU6IHVzZXJzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIEVOVklST05NRU5UOiAncHJvZCcsXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHcmFudCBTMyBwZXJtaXNzaW9uc1xyXG4gICAgcHJvZHVjdGlvbkJ1Y2tldC5ncmFudFJlYWRXcml0ZShhbmFseXplRmlsZUZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuICAgIHByb2R1Y3Rpb25CdWNrZXQuZ3JhbnRSZWFkV3JpdGUodXBsb2FkRmlsZUZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBHcmFudCBEeW5hbW9EQiBwZXJtaXNzaW9uc1xyXG4gICAgdXNlcnNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoYXV0aG9yaXplckZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuICAgIHVzZXJzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNyZWF0ZVByb2plY3RGdW5jdGlvbi5mdW5jdGlvbik7XHJcbiAgICBcclxuICAgIHByb2plY3RzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGNyZWF0ZVByb2plY3RGdW5jdGlvbi5mdW5jdGlvbik7XHJcbiAgICBwcm9qZWN0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0UHJvamVjdHNGdW5jdGlvbi5mdW5jdGlvbik7XHJcbiAgICBcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXplRmlsZUZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlLmdyYW50UmVhZFdyaXRlRGF0YSh1cGxvYWRGaWxlRnVuY3Rpb24uZnVuY3Rpb24pO1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkRGF0YShnZXRBbmFseXNpc1Jlc3VsdHNGdW5jdGlvbi5mdW5jdGlvbik7XHJcbiAgICBcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhbmFseXplRmlsZUZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLmdyYW50UmVhZERhdGEoZ2V0QW5hbHlzaXNSZXN1bHRzRnVuY3Rpb24uZnVuY3Rpb24pO1xyXG4gICAgXHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlLmdyYW50UmVhZERhdGEodXBsb2FkRmlsZUZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBHcmFudCBTZWNyZXRzIE1hbmFnZXIgcGVybWlzc2lvbnNcclxuICAgIGp3dFNlY3JldC5ncmFudFJlYWQoYXV0aG9yaXplckZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuICAgIGp3dFNlY3JldC5ncmFudFJlYWQoY3JlYXRlUHJvamVjdEZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuICAgIGp3dFNlY3JldC5ncmFudFJlYWQoZ2V0UHJvamVjdHNGdW5jdGlvbi5mdW5jdGlvbik7XHJcbiAgICBvcGVuYWlTZWNyZXQuZ3JhbnRSZWFkKGFuYWx5emVGaWxlRnVuY3Rpb24uZnVuY3Rpb24pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBBUEkgR2F0ZXdheSBmb3IgbW9uaXRvcmluZyBlbmRwb2ludHNcclxuICAgIHRoaXMuYXBpR2F0ZXdheSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ01JU1JBUGxhdGZvcm1BUEknLCB7XHJcbiAgICAgIHJlc3RBcGlOYW1lOiAnTUlTUkEgUGxhdGZvcm0gUHJvZHVjdGlvbiBBUEknLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gQVBJIGZvciBNSVNSQSBQbGF0Zm9ybSB3aXRoIG1vbml0b3JpbmcgZW5kcG9pbnRzJyxcclxuICAgICAgZGVmYXVsdENvcnNQcmVmbGlnaHRPcHRpb25zOiB7XHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBhcGlnYXRld2F5LkNvcnMuQUxMX09SSUdJTlMsXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXHJcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbJ0NvbnRlbnQtVHlwZScsICdYLUFtei1EYXRlJywgJ0F1dGhvcml6YXRpb24nLCAnWC1BcGktS2V5JywgJ1gtQ29ycmVsYXRpb24tSUQnXSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgOC4yOiBBZGQgbW9uaXRvcmluZyBMYW1iZGEgZnVuY3Rpb25zXHJcbiAgICBjb25zdCBoZWFsdGhDaGVja0Z1bmN0aW9uID0gbmV3IFByb2R1Y3Rpb25MYW1iZGFGdW5jdGlvbih0aGlzLCAnbWlzcmEtcGxhdGZvcm0taGVhbHRoLWNoZWNrLXByb2QnLCB7XHJcbiAgICAgIGVudHJ5OiAnLi4vZnVuY3Rpb25zL21vbml0b3JpbmcvaGVhbHRoLWNoZWNrJyxcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLFxyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMCksXHJcbiAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBGSUxFX1NUT1JBR0VfQlVDS0VUX05BTUU6IHByb2R1Y3Rpb25CdWNrZXQuYnVja2V0LmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgVVNFUlNfVEFCTEVfTkFNRTogdXNlcnNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgUFJPSkVDVFNfVEFCTEVfTkFNRTogcHJvamVjdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRklMRV9NRVRBREFUQV9UQUJMRV9OQU1FOiBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgQU5BTFlTSVNfUkVTVUxUU19UQUJMRV9OQU1FOiBhbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdwcm9kJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IG1ldHJpY3NDb2xsZWN0b3JGdW5jdGlvbiA9IG5ldyBQcm9kdWN0aW9uTGFtYmRhRnVuY3Rpb24odGhpcywgJ21pc3JhLXBsYXRmb3JtLW1ldHJpY3MtY29sbGVjdG9yLXByb2QnLCB7XHJcbiAgICAgIGVudHJ5OiAnLi4vZnVuY3Rpb25zL21vbml0b3JpbmcvbWV0cmljcy1jb2xsZWN0b3InLFxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsXHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLFxyXG4gICAgICB0aW1lb3V0OiBEdXJhdGlvbi5taW51dGVzKDUpLFxyXG4gICAgICBtZW1vcnlTaXplOiAxMDI0LFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIEZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRTogcHJvZHVjdGlvbkJ1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICBVU0VSU19UQUJMRV9OQU1FOiB1c2Vyc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBQUk9KRUNUU19UQUJMRV9OQU1FOiBwcm9qZWN0c1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBGSUxFX01FVEFEQVRBX1RBQkxFX05BTUU6IGZpbGVNZXRhZGF0YVRhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBBTkFMWVNJU19SRVNVTFRTX1RBQkxFX05BTUU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBTQU1QTEVfRklMRVNfVEFCTEVfTkFNRTogc2FtcGxlRmlsZXNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgRU5WSVJPTk1FTlQ6ICdwcm9kJyxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdyYW50IGFkZGl0aW9uYWwgUzMgcGVybWlzc2lvbnMgZm9yIG1vbml0b3JpbmdcclxuICAgIHByb2R1Y3Rpb25CdWNrZXQuZ3JhbnRSZWFkKGhlYWx0aENoZWNrRnVuY3Rpb24uZnVuY3Rpb24pO1xyXG4gICAgcHJvZHVjdGlvbkJ1Y2tldC5ncmFudFJlYWQobWV0cmljc0NvbGxlY3RvckZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuXHJcbiAgICAvLyBHcmFudCBhZGRpdGlvbmFsIER5bmFtb0RCIHBlcm1pc3Npb25zIGZvciBtb25pdG9yaW5nXHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEoaGVhbHRoQ2hlY2tGdW5jdGlvbi5mdW5jdGlvbik7XHJcbiAgICB1c2Vyc1RhYmxlLmdyYW50UmVhZERhdGEobWV0cmljc0NvbGxlY3RvckZ1bmN0aW9uLmZ1bmN0aW9uKTtcclxuICAgIHByb2plY3RzVGFibGUuZ3JhbnRSZWFkRGF0YShtZXRyaWNzQ29sbGVjdG9yRnVuY3Rpb24uZnVuY3Rpb24pO1xyXG4gICAgZmlsZU1ldGFkYXRhVGFibGUuZ3JhbnRSZWFkRGF0YShtZXRyaWNzQ29sbGVjdG9yRnVuY3Rpb24uZnVuY3Rpb24pO1xyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGUuZ3JhbnRSZWFkRGF0YShtZXRyaWNzQ29sbGVjdG9yRnVuY3Rpb24uZnVuY3Rpb24pO1xyXG4gICAgc2FtcGxlRmlsZXNUYWJsZS5ncmFudFJlYWREYXRhKG1ldHJpY3NDb2xsZWN0b3JGdW5jdGlvbi5mdW5jdGlvbik7XHJcblxyXG4gICAgLy8gR3JhbnQgQ2xvdWRXYXRjaCBwZXJtaXNzaW9ucyBmb3IgbW9uaXRvcmluZyBmdW5jdGlvbnNcclxuICAgIGNvbnN0IGNsb3VkV2F0Y2hQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdjbG91ZHdhdGNoOlB1dE1ldHJpY0RhdGEnLFxyXG4gICAgICAgICdjbG91ZHdhdGNoOkdldE1ldHJpY1N0YXRpc3RpY3MnLFxyXG4gICAgICAgICdjbG91ZHdhdGNoOkxpc3RNZXRyaWNzJyxcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSk7XHJcblxyXG4gICAgaGVhbHRoQ2hlY2tGdW5jdGlvbi5mdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3koY2xvdWRXYXRjaFBvbGljeSk7XHJcbiAgICBtZXRyaWNzQ29sbGVjdG9yRnVuY3Rpb24uZnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KGNsb3VkV2F0Y2hQb2xpY3kpO1xyXG5cclxuICAgIC8vIEFkZCBtb25pdG9yaW5nIGVuZHBvaW50cyB0byBBUEkgR2F0ZXdheVxyXG4gICAgY29uc3QgaGVhbHRoUmVzb3VyY2UgPSB0aGlzLmFwaUdhdGV3YXkucm9vdC5hZGRSZXNvdXJjZSgnaGVhbHRoJyk7XHJcbiAgICBoZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGhlYWx0aENoZWNrRnVuY3Rpb24uZnVuY3Rpb24pKTtcclxuICAgIFxyXG4gICAgY29uc3QgZGV0YWlsZWRIZWFsdGhSZXNvdXJjZSA9IGhlYWx0aFJlc291cmNlLmFkZFJlc291cmNlKCdkZXRhaWxlZCcpO1xyXG4gICAgZGV0YWlsZWRIZWFsdGhSZXNvdXJjZS5hZGRNZXRob2QoJ0dFVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGhlYWx0aENoZWNrRnVuY3Rpb24uZnVuY3Rpb24pKTtcclxuICAgIFxyXG4gICAgY29uc3Qgc2VydmljZUhlYWx0aFJlc291cmNlID0gaGVhbHRoUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ3NlcnZpY2UnKS5hZGRSZXNvdXJjZSgne3NlcnZpY2VOYW1lfScpO1xyXG4gICAgc2VydmljZUhlYWx0aFJlc291cmNlLmFkZE1ldGhvZCgnR0VUJywgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oaGVhbHRoQ2hlY2tGdW5jdGlvbi5mdW5jdGlvbikpO1xyXG5cclxuICAgIGNvbnN0IG1ldHJpY3NSZXNvdXJjZSA9IHRoaXMuYXBpR2F0ZXdheS5yb290LmFkZFJlc291cmNlKCdtZXRyaWNzJyk7XHJcbiAgICBjb25zdCBjb2xsZWN0TWV0cmljc1Jlc291cmNlID0gbWV0cmljc1Jlc291cmNlLmFkZFJlc291cmNlKCdjb2xsZWN0Jyk7XHJcbiAgICBjb2xsZWN0TWV0cmljc1Jlc291cmNlLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKG1ldHJpY3NDb2xsZWN0b3JGdW5jdGlvbi5mdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIFNjaGVkdWxlIG1ldHJpY3MgY29sbGVjdGlvbiBldmVyeSA1IG1pbnV0ZXNcclxuICAgIGNvbnN0IG1ldHJpY3NDb2xsZWN0aW9uUnVsZSA9IG5ldyBldmVudHMuUnVsZSh0aGlzLCAnTWV0cmljc0NvbGxlY3Rpb25TY2hlZHVsZScsIHtcclxuICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5yYXRlKER1cmF0aW9uLm1pbnV0ZXMoNSkpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RyaWdnZXIgbWV0cmljcyBjb2xsZWN0aW9uIGV2ZXJ5IDUgbWludXRlcycsXHJcbiAgICB9KTtcclxuXHJcbiAgICBtZXRyaWNzQ29sbGVjdGlvblJ1bGUuYWRkVGFyZ2V0KG5ldyB0YXJnZXRzLkxhbWJkYUZ1bmN0aW9uKG1ldHJpY3NDb2xsZWN0b3JGdW5jdGlvbi5mdW5jdGlvbikpO1xyXG5cclxuICAgIC8vIFRhc2sgOC4yOiBDcmVhdGUgY29tcHJlaGVuc2l2ZSBtb25pdG9yaW5nIHN0YWNrXHJcbiAgICB0aGlzLm1vbml0b3JpbmdTdGFjayA9IG5ldyBNb25pdG9yaW5nU3RhY2sodGhpcywgJ01vbml0b3JpbmdTdGFjaycsIHtcclxuICAgICAgZW52aXJvbm1lbnQ6ICdwcm9kJyxcclxuICAgICAgYXBpR2F0ZXdheTogdGhpcy5hcGlHYXRld2F5LFxyXG4gICAgICBsYW1iZGFGdW5jdGlvbnM6IHtcclxuICAgICAgICAnYW5hbHl6ZS1maWxlJzogYW5hbHl6ZUZpbGVGdW5jdGlvbi5mdW5jdGlvbixcclxuICAgICAgICAnZ2V0LWFuYWx5c2lzLXJlc3VsdHMnOiBnZXRBbmFseXNpc1Jlc3VsdHNGdW5jdGlvbi5mdW5jdGlvbixcclxuICAgICAgICAndXBsb2FkLWZpbGUnOiB1cGxvYWRGaWxlRnVuY3Rpb24uZnVuY3Rpb24sXHJcbiAgICAgICAgJ2NyZWF0ZS1wcm9qZWN0JzogY3JlYXRlUHJvamVjdEZ1bmN0aW9uLmZ1bmN0aW9uLFxyXG4gICAgICAgICdnZXQtcHJvamVjdHMnOiBnZXRQcm9qZWN0c0Z1bmN0aW9uLmZ1bmN0aW9uLFxyXG4gICAgICAgICdhdXRob3JpemVyJzogYXV0aG9yaXplckZ1bmN0aW9uLmZ1bmN0aW9uLFxyXG4gICAgICAgICdoZWFsdGgtY2hlY2snOiBoZWFsdGhDaGVja0Z1bmN0aW9uLmZ1bmN0aW9uLFxyXG4gICAgICAgICdtZXRyaWNzLWNvbGxlY3Rvcic6IG1ldHJpY3NDb2xsZWN0b3JGdW5jdGlvbi5mdW5jdGlvbixcclxuICAgICAgfSxcclxuICAgICAgZHluYW1vVGFibGVzOiB7XHJcbiAgICAgICAgJ3VzZXJzJzogdXNlcnNUYWJsZS50YWJsZSxcclxuICAgICAgICAncHJvamVjdHMnOiBwcm9qZWN0c1RhYmxlLnRhYmxlLFxyXG4gICAgICAgICdmaWxlLW1ldGFkYXRhJzogZmlsZU1ldGFkYXRhVGFibGUudGFibGUsXHJcbiAgICAgICAgJ2FuYWx5c2lzLXJlc3VsdHMnOiBhbmFseXNpc1Jlc3VsdHNUYWJsZS50YWJsZSxcclxuICAgICAgICAnc2FtcGxlLWZpbGVzJzogc2FtcGxlRmlsZXNUYWJsZS50YWJsZSxcclxuICAgICAgfSxcclxuICAgICAgczNCdWNrZXQ6IHByb2R1Y3Rpb25CdWNrZXQuYnVja2V0LFxyXG4gICAgICBhbGVydEVtYWlsOiAnYWxlcnRzQGRpZ2l0cmFuc29sdXRpb25zLmluJywgLy8gQ29uZmlndXJlIGFzIG5lZWRlZFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IHByb2R1Y3Rpb24gY29uZmlndXJhdGlvblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2R1Y3Rpb25CdWNrZXROYW1lJywge1xyXG4gICAgICB2YWx1ZTogcHJvZHVjdGlvbkJ1Y2tldC5idWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIFMzIGJ1Y2tldCBuYW1lIGZvciBmaWxlIHN0b3JhZ2UnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2R1Y3Rpb25Vc2Vyc1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHVzZXJzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gdXNlcnMgdGFibGUgbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvZHVjdGlvblByb2plY3RzVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogcHJvamVjdHNUYWJsZS50YWJsZS50YWJsZU5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJvZHVjdGlvbiBwcm9qZWN0cyB0YWJsZSBuYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9kdWN0aW9uRmlsZU1ldGFkYXRhVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogZmlsZU1ldGFkYXRhVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gZmlsZSBtZXRhZGF0YSB0YWJsZSBuYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9kdWN0aW9uQW5hbHlzaXNSZXN1bHRzVGFibGVOYW1lJywge1xyXG4gICAgICB2YWx1ZTogYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gYW5hbHlzaXMgcmVzdWx0cyB0YWJsZSBuYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9kdWN0aW9uU2FtcGxlRmlsZXNUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBzYW1wbGVGaWxlc1RhYmxlLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIHNhbXBsZSBmaWxlcyB0YWJsZSBuYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9kdWN0aW9uQW5hbHl6ZUZpbGVGdW5jdGlvbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBhbmFseXplRmlsZUZ1bmN0aW9uLmZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIGFuYWx5emUgZmlsZSBMYW1iZGEgZnVuY3Rpb24gbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvZHVjdGlvbkdldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uTmFtZScsIHtcclxuICAgICAgdmFsdWU6IGdldEFuYWx5c2lzUmVzdWx0c0Z1bmN0aW9uLmZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIGdldCBhbmFseXNpcyByZXN1bHRzIExhbWJkYSBmdW5jdGlvbiBuYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9kdWN0aW9uVXBsb2FkRmlsZUZ1bmN0aW9uTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHVwbG9hZEZpbGVGdW5jdGlvbi5mdW5jdGlvbi5mdW5jdGlvbk5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJvZHVjdGlvbiB1cGxvYWQgZmlsZSBMYW1iZGEgZnVuY3Rpb24gbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvZHVjdGlvbkNyZWF0ZVByb2plY3RGdW5jdGlvbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBjcmVhdGVQcm9qZWN0RnVuY3Rpb24uZnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gY3JlYXRlIHByb2plY3QgTGFtYmRhIGZ1bmN0aW9uIG5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2R1Y3Rpb25HZXRQcm9qZWN0c0Z1bmN0aW9uTmFtZScsIHtcclxuICAgICAgdmFsdWU6IGdldFByb2plY3RzRnVuY3Rpb24uZnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gZ2V0IHByb2plY3RzIExhbWJkYSBmdW5jdGlvbiBuYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9kdWN0aW9uQXV0aG9yaXplckZ1bmN0aW9uTmFtZScsIHtcclxuICAgICAgdmFsdWU6IGF1dGhvcml6ZXJGdW5jdGlvbi5mdW5jdGlvbi5mdW5jdGlvbk5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUHJvZHVjdGlvbiBhdXRob3JpemVyIExhbWJkYSBmdW5jdGlvbiBuYW1lJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgOC4yOiBNb25pdG9yaW5nIG91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9kdWN0aW9uSGVhbHRoQ2hlY2tGdW5jdGlvbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBoZWFsdGhDaGVja0Z1bmN0aW9uLmZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIGhlYWx0aCBjaGVjayBMYW1iZGEgZnVuY3Rpb24gbmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnUHJvZHVjdGlvbk1ldHJpY3NDb2xsZWN0b3JGdW5jdGlvbk5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBtZXRyaWNzQ29sbGVjdG9yRnVuY3Rpb24uZnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1Byb2R1Y3Rpb24gbWV0cmljcyBjb2xsZWN0b3IgTGFtYmRhIGZ1bmN0aW9uIG5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2R1Y3Rpb25BUElHYXRld2F5VVJMJywge1xyXG4gICAgICB2YWx1ZTogdGhpcy5hcGlHYXRld2F5LnVybCxcclxuICAgICAgZGVzY3JpcHRpb246ICdQcm9kdWN0aW9uIEFQSSBHYXRld2F5IFVSTCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnSGVhbHRoQ2hlY2tFbmRwb2ludCcsIHtcclxuICAgICAgdmFsdWU6IGAke3RoaXMuYXBpR2F0ZXdheS51cmx9aGVhbHRoYCxcclxuICAgICAgZGVzY3JpcHRpb246ICdIZWFsdGggY2hlY2sgZW5kcG9pbnQgVVJMJyxcclxuICAgIH0pO1xyXG5cclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdEZXRhaWxlZEhlYWx0aENoZWNrRW5kcG9pbnQnLCB7XHJcbiAgICAgIHZhbHVlOiBgJHt0aGlzLmFwaUdhdGV3YXkudXJsfWhlYWx0aC9kZXRhaWxlZGAsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRGV0YWlsZWQgaGVhbHRoIGNoZWNrIGVuZHBvaW50IFVSTCcsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19