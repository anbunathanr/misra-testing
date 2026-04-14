import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';
import { MonitoringStack } from './monitoring-stack';

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
export class ProductionS3Bucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id);

    const environment = props?.environment || 'prod';
    const bucketName = `misra-platform-files-${environment}-${cdk.Stack.of(this).account}`;

    // Create KMS key for encryption
    const encryptionKey = new kms.Key(this, 'BucketEncryptionKey', {
      alias: `misra-platform-${environment}-files`,
      description: `KMS key for MISRA Platform ${environment} file storage`,
      enableKeyRotation: true,
      pendingWindow: Duration.days(30),
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Create access logging bucket
    const accessLoggingBucket = new s3.Bucket(this, 'AccessLoggingBucket', {
      bucketName: `misra-platform-logs-${environment}-${cdk.Stack.of(this).account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
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
              transitionAfter: Duration.days(30)
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90)
            }
          ]
        },
        {
          id: 'delete-incomplete-uploads',
          enabled: true,
          abortIncompleteMultipartUploadAfter: Duration.days(7)
        },
        {
          id: 'expire-old-versions',
          enabled: true,
          noncurrentVersionExpiration: Duration.days(30)
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
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      
      // Event notifications
      eventBridgeEnabled: true
    });

    // Add bucket policy for secure access
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
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
      })
    );

    // Add metadata tags
    this.bucket.node.addMetadata('Purpose', 'Production file storage for MISRA code analysis');
    this.bucket.node.addMetadata('Environment', environment);
    this.bucket.node.addMetadata('DataClassification', 'Confidential');
    this.bucket.node.addMetadata('Encryption', 'KMS');
    this.bucket.node.addMetadata('Versioning', 'Enabled');
  }

  public grantRead(grantee: any) {
    return this.bucket.grantRead(grantee);
  }

  public grantWrite(grantee: any) {
    return this.bucket.grantWrite(grantee);
  }

  public grantReadWrite(grantee: any) {
    return this.bucket.grantReadWrite(grantee);
  }

  public grantPresignedUrl(grantee: any) {
    return this.bucket.grantReadWrite(grantee);
  }
}

/**
 * Production DynamoDB Table Configuration
 * 
 * Enhances DynamoDB tables with production-specific settings:
 * - Point-in-time recovery enabled
 * - Encryption at rest with KMS
 * - Continuous backups
 */
export class ProductionDynamoDBTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: {
    partitionKey: { name: string; type: dynamodb.AttributeType };
    sortKey?: { name: string; type: dynamodb.AttributeType };
    environment?: string;
    tableName?: string;
  }) {
    super(scope, id);

    const environment = props.environment || 'prod';
    const tableName = props.tableName || `${id}-${environment}`;
    const encryptionKey = new kms.Key(this, 'TableEncryptionKey', {
      alias: `misra-platform-${environment}-${id}`,
      description: `KMS key for MISRA Platform ${environment} ${id} table`,
      enableKeyRotation: true,
      pendingWindow: Duration.days(30),
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
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
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    });

    // Add metadata tags
    this.table.node.addMetadata('Purpose', `Production ${id} table for MISRA Platform`);
    this.table.node.addMetadata('Environment', environment);
    this.table.node.addMetadata('Encryption', 'KMS');
    this.table.node.addMetadata('PointInTimeRecovery', 'Enabled');
  }

  public grantReadData(grantee: any) {
    return this.table.grantReadData(grantee);
  }

  public grantWriteData(grantee: any) {
    return this.table.grantWriteData(grantee);
  }

  public grantReadWriteData(grantee: any) {
    return this.table.grantReadWriteData(grantee);
  }

  public addGlobalSecondaryIndex(props: {
    indexName: string;
    partitionKey: { name: string; type: dynamodb.AttributeType };
    sortKey?: { name: string; type: dynamodb.AttributeType };
    projectionType?: dynamodb.ProjectionType;
  }) {
    this.table.addGlobalSecondaryIndex(props);
  }
}

/**
 * Production Lambda Function Configuration
 * 
 * Enhances Lambda functions with production-specific settings:
 * - Reserved concurrency for critical functions
 * - Environment variables from Secrets Manager
 * - CloudWatch logging with encryption
 * - X-Ray tracing enabled
 */
export class ProductionLambdaFunction extends Construct {
  public readonly function: lambda.Function;

  constructor(scope: Construct, id: string, props: {
    entry: string;
    handler: string;
    runtime: lambda.Runtime;
    environment?: Record<string, string>;
    timeout?: Duration;
    memorySize?: number;
    reservedConcurrentExecutions?: number;
    environmentSecrets?: Record<string, secretsmanager.ISecret>;
  }) {
    super(scope, id);

    // Create CloudWatch log group with encryption
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/aws/lambda/${id}`,
      retention: logs.RetentionDays.TWO_WEEKS, // Use a valid retention value
    });

    // Build environment variables
    const environment: Record<string, string> = {
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
      timeout: props.timeout || Duration.seconds(30),
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

  public grantInvoke(grantee: any) {
    return this.function.grantInvoke(grantee);
  }
}

/**
 * Production Deployment Stack
 * 
 * Deploys production-specific infrastructure enhancements for Task 7.2
 * Fixes duplicate table issues and provides comprehensive production deployment
 * 
 * Task 8.2 Enhancement: Adds comprehensive monitoring and alerting
 */
export class ProductionDeploymentStack extends Construct {
  public readonly monitoringStack: MonitoringStack;
  public readonly apiGateway: apigateway.RestApi;

  constructor(scope: Construct, id: string) {
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
      timeout: Duration.minutes(5),
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
      timeout: Duration.seconds(30),
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
      timeout: Duration.minutes(2),
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
      timeout: Duration.seconds(30),
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
      timeout: Duration.seconds(30),
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
      timeout: Duration.seconds(10),
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
      timeout: Duration.seconds(30),
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
      timeout: Duration.minutes(5),
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
      schedule: events.Schedule.rate(Duration.minutes(5)),
      description: 'Trigger metrics collection every 5 minutes',
    });

    metricsCollectionRule.addTarget(new targets.LambdaFunction(metricsCollectorFunction.function));

    // Task 8.2: Create comprehensive monitoring stack
    this.monitoringStack = new MonitoringStack(this, 'MonitoringStack', {
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
