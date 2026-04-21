import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import { CloudWatchMonitoring } from './cloudwatch-monitoring';
import { IAMRoles } from './iam-roles';
import { VpcConfig } from './vpc-config';
import { WafConfig } from './waf-config';
import { SecurityHeaders } from './security-headers';
import { BackupConfig } from './backup-config';

export interface ProductionMisraStackProps extends cdk.StackProps {
  environment: 'dev' | 'staging' | 'production';
  domainName?: string;
  certificateArn?: string;
  alertEmail?: string; // Email for CloudWatch alarms
}

export class ProductionMisraStack extends cdk.Stack {
  public userPool: cognito.UserPool;
  public userPoolClient: cognito.UserPoolClient;
  public api: apigateway.RestApi;
  public filesBucket: s3.Bucket;
  public kmsKey: kms.Key;
  
  // DynamoDB Tables
  public usersTable: dynamodb.Table;
  public fileMetadataTable: dynamodb.Table;
  public analysisResultsTable: dynamodb.Table;
  public sampleFilesTable: dynamodb.Table;
  public progressTable: dynamodb.Table;

  // Lambda Functions
  public authorizerFunction: lambda.Function;
  public jwtSecret: secretsmanager.Secret;

  // IAM Roles
  public iamRoles: IAMRoles;

  // CloudWatch Monitoring
  public monitoring: CloudWatchMonitoring;

  // VPC Configuration
  public vpcConfig: VpcConfig;

  // WAF Configuration
  public wafConfig: WafConfig;

  // Security Headers
  public securityHeaders: SecurityHeaders;

  // Backup Configuration
  public backupConfig: BackupConfig;

  constructor(scope: Construct, id: string, props: ProductionMisraStackProps) {
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
      this.vpcConfig = new VpcConfig(this, 'VpcConfig', {
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

  private createDynamoDBTables(environment: string) {
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
  private configureAutoScaling() {
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
    (this as any).capacityAlarms = {
      usersTableRead: usersTableReadAlarm,
      usersTableWrite: usersTableWriteAlarm,
      analysisTableRead: analysisTableReadAlarm,
      analysisTableWrite: analysisTableWriteAlarm,
    };
  }

  private createS3Bucket(environment: string) {
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

  private createCognitoUserPool(environment: string) {
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

  private createApiGateway(environment: string) {
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
    (this as any).usagePlans = {
      premium: premiumUsagePlan,
      standard: standardUsagePlan,
      limited: limitedUsagePlan,
    };

    (this as any).apiKeys = {
      premium: premiumApiKey,
      standard: standardApiKey,
      monitoring: monitoringApiKey,
    };
  }

  /**
   * Create API models for request/response validation
   */
  private createApiModels(environment: string) {
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
    (this as any).apiModels = {
      userRegistration: userRegistrationModel,
      fileUpload: fileUploadModel,
      analysisRequest: analysisRequestModel,
      errorResponse: errorResponseModel,
    };
  }

  /**
   * Configure custom domain and SSL certificate
   */
  private configureCustomDomain(environment: string) {
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
        const certificate = acm.Certificate.fromCertificateArn(
          this,
          'ApiCertificate',
          certificateArn
        );

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
        (this as any).customDomain = customDomain;

        // Create Route 53 record instructions
        new cdk.CfnOutput(this, 'Route53Instructions', {
          value: `Create Route 53 A record: ${domainNameParameter.valueAsString} -> ALIAS -> ${customDomain.domainNameAliasDomainName} (${customDomain.domainNameAliasHostedZoneId})`,
          description: 'Instructions for creating Route 53 DNS record',
        });
      } catch (error) {
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

    (this as any).customDomainConfig = customDomainConfig;

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
    (this as any).domainParameters = {
      certificateArn: certificateArnParameter,
      domainName: domainNameParameter,
      hostedZoneId: hostedZoneIdParameter,
    };
  }

  private createApiEndpoints(environment: string) {
    // Get references to models and usage plans
    const models = (this as any).apiModels;
    const usagePlans = (this as any).usagePlans;

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
    (this as any).apiResources = {
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

    (this as any).apiValidators = {
      strict: strictValidator,
      bodyOnly: bodyOnlyValidator,
      paramsOnly: paramsOnlyValidator,
    };

    (this as any).lambdaAuthorizer = authorizer;

    // Create method-specific throttling configurations
    this.configureMethodThrottling(environment);
  }

  /**
   * Configure per-method throttling and caching
   */
  private configureMethodThrottling(environment: string) {
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
    (this as any).methodThrottling = methodThrottling;

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
  private createSecurityHeaders(environment: string) {
    this.securityHeaders = new SecurityHeaders(this, 'SecurityHeaders', {
      environment: environment as 'dev' | 'staging' | 'production',
    });
  }

  /**
   * Apply security headers to API Gateway
   */
  private applySecurityHeaders() {
    // Apply security headers to all Gateway Responses
    this.securityHeaders.applyToGatewayResponses(this.api);
  }

  /**
   * Create WAF configuration for API Gateway and CloudFront
   */
  private createWafConfiguration(environment: string) {
    // Only enable WAF for staging and production environments
    if (environment === 'dev') {
      console.log('WAF disabled for development environment');
      return;
    }

    // Create WAF for API Gateway (REGIONAL scope)
    const apiWaf = new WafConfig(this, 'ApiWaf', {
      environment: environment as 'dev' | 'staging' | 'production',
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

  private createCloudWatchMonitoring(environment: string, alertEmail?: string) {
    // Create comprehensive CloudWatch monitoring
    this.monitoring = new CloudWatchMonitoring(this, 'CloudWatchMonitoring', {
      environment: environment as 'dev' | 'staging' | 'production',
      api: this.api,
      lambdaFunctions: {
        authorizer: this.authorizerFunction,
        // Additional Lambda functions will be added here as they are implemented
      },
      alertEmail,
    });
  }

  private createSecrets(environment: string) {
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
    (this as any).otpSecret = otpSecret;
    (this as any).apiKeysSecret = apiKeysSecret;
    (this as any).dbSecret = dbSecret;

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
  private generateSecureKey(length: number): string {
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
  private createIAMRoles(environment: string) {
    // Get secret references
    const otpSecret = (this as any).otpSecret as secretsmanager.Secret;
    const apiKeysSecret = (this as any).apiKeysSecret as secretsmanager.Secret;
    const dbSecret = (this as any).dbSecret as secretsmanager.Secret;

    this.iamRoles = new IAMRoles(this, 'IAMRoles', {
      environment: environment as 'dev' | 'staging' | 'production',
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
    const permissionBoundary = this.iamRoles.createPermissionBoundaries(
      environment, 
      this.region, 
      this.account
    );

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

  private createLambdaFunctions(environment: string) {
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
      OTP_SECRET_NAME: (this as any).otpSecret.secretName,
      API_KEYS_SECRET_NAME: (this as any).apiKeysSecret.secretName,
      DATABASE_SECRET_NAME: (this as any).dbSecret.secretName,
      
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
    const otpSecret = (this as any).otpSecret as secretsmanager.Secret;
    const apiKeysSecret = (this as any).apiKeysSecret as secretsmanager.Secret;
    const dbSecret = (this as any).dbSecret as secretsmanager.Secret;

    // VPC Configuration for production security
    let vpcConfig: { vpc: any; securityGroups: any[]; vpcSubnets: any } | undefined;
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
    (this as any).lambdaFunctions = {
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
  private connectStreamsToAuditProcessor(auditProcessor: lambda.Function) {
    // Connect Users table stream
    auditProcessor.addEventSource(new DynamoEventSource(this.usersTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(5),
      retryAttempts: 3,
      parallelizationFactor: 2,
      reportBatchItemFailures: true,
    }));

    // Connect File Metadata table stream
    auditProcessor.addEventSource(new DynamoEventSource(this.fileMetadataTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 10,
      maxBatchingWindow: cdk.Duration.seconds(5),
      retryAttempts: 3,
      parallelizationFactor: 2,
      reportBatchItemFailures: true,
    }));

    // Connect Analysis Results table stream
    auditProcessor.addEventSource(new DynamoEventSource(this.analysisResultsTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 20, // Higher batch size for analysis results
      maxBatchingWindow: cdk.Duration.seconds(10),
      retryAttempts: 3,
      parallelizationFactor: 4, // Higher parallelization for analysis workload
      reportBatchItemFailures: true,
    }));

    // Connect Progress table stream (for real-time monitoring)
    auditProcessor.addEventSource(new DynamoEventSource(this.progressTable, {
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
  private configureCrossRegionReplication() {
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
    (this as any).replicationBucket = replicationBucket;
    (this as any).replicationRole = replicationRole;

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
  private configureS3EventNotifications(s3EventProcessor: lambda.Function, environment: string) {
    // Add S3 event notifications
    this.filesBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(s3EventProcessor),
      { prefix: 'uploads/' }
    );

    this.filesBucket.addEventNotification(
      s3.EventType.OBJECT_REMOVED,
      new s3n.LambdaDestination(s3EventProcessor),
      { prefix: 'uploads/' }
    );

    // Store S3 event processor reference
    (this as any).s3EventProcessor = s3EventProcessor;
  }

  /**
   * Configure Lambda function alarms for production monitoring
   */
  private configureLambdaAlarms() {
    const lambdaFunctions = (this as any).lambdaFunctions as Record<string, lambda.Function>;
    const alarms: cloudwatch.Alarm[] = [];

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
    (this as any).lambdaAlarms = alarms;
  }

  /**
   * Create CloudFront distribution for frontend
   */
  private createCloudFrontDistribution(environment: string, domainName?: string, certificateArn?: string) {
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
      headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
        'Authorization',
        'Content-Type',
        'X-Correlation-ID'
      ),
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
    (this as any).frontendBucket = frontendBucket;
    (this as any).cloudFrontDistribution = distribution;
    (this as any).originAccessIdentity = originAccessIdentity;
  }

  /**
   * Create backup and recovery configuration
   */
  private createBackupConfiguration(environment: string) {
    // Get Lambda functions reference
    const lambdaFunctions = (this as any).lambdaFunctions as Record<string, lambda.Function>;

    // Create backup configuration
    this.backupConfig = new BackupConfig(this, 'BackupConfig', {
      environment: environment as 'dev' | 'staging' | 'production',
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

  private createOutputs() {
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
      value: (this as any).usagePlans.premium.usagePlanId,
      description: 'Premium Usage Plan ID',
      exportName: `${this.stackName}-PremiumUsagePlan`,
    });

    new cdk.CfnOutput(this, 'StandardUsagePlanId', {
      value: (this as any).usagePlans.standard.usagePlanId,
      description: 'Standard Usage Plan ID',
      exportName: `${this.stackName}-StandardUsagePlan`,
    });

    new cdk.CfnOutput(this, 'LimitedUsagePlanId', {
      value: (this as any).usagePlans.limited.usagePlanId,
      description: 'Limited Usage Plan ID',
      exportName: `${this.stackName}-LimitedUsagePlan`,
    });

    // API Keys
    new cdk.CfnOutput(this, 'PremiumApiKeyId', {
      value: (this as any).apiKeys.premium.keyId,
      description: 'Premium API Key ID',
      exportName: `${this.stackName}-PremiumApiKey`,
    });

    new cdk.CfnOutput(this, 'StandardApiKeyId', {
      value: (this as any).apiKeys.standard.keyId,
      description: 'Standard API Key ID',
      exportName: `${this.stackName}-StandardApiKey`,
    });

    new cdk.CfnOutput(this, 'MonitoringApiKeyId', {
      value: (this as any).apiKeys.monitoring.keyId,
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
      value: (this as any).lambdaFunctions.auditStreamProcessor.functionName,
      description: 'Audit Stream Processor Function Name',
      exportName: `${this.stackName}-AuditStreamProcessor`,
    });

    new cdk.CfnOutput(this, 'AuditStreamProcessorArn', {
      value: (this as any).lambdaFunctions.auditStreamProcessor.functionArn,
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
      value: (this as any).otpSecret.secretName,
      description: 'OTP/TOTP Secret Name in Secrets Manager',
      exportName: `${this.stackName}-OtpSecretName`,
    });

    new cdk.CfnOutput(this, 'ApiKeysSecretName', {
      value: (this as any).apiKeysSecret.secretName,
      description: 'API Keys Secret Name in Secrets Manager',
      exportName: `${this.stackName}-ApiKeysSecretName`,
    });

    new cdk.CfnOutput(this, 'DatabaseSecretName', {
      value: (this as any).dbSecret.secretName,
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
      value: (this as any).cloudFrontDistribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: `${this.stackName}-CloudFrontDistributionId`,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionDomainName', {
      value: (this as any).cloudFrontDistribution.distributionDomainName,
      description: 'CloudFront Distribution Domain Name',
      exportName: `${this.stackName}-CloudFrontDomainName`,
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: (this as any).frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: `${this.stackName}-FrontendBucket`,
    });

    // S3 Event Processor
    new cdk.CfnOutput(this, 'S3EventProcessorName', {
      value: (this as any).s3EventProcessor.functionName,
      description: 'S3 Event Processor Function Name',
      exportName: `${this.stackName}-S3EventProcessor`,
    });

    new cdk.CfnOutput(this, 'S3EventProcessorArn', {
      value: (this as any).s3EventProcessor.functionArn,
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