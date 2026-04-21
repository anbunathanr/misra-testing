import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { CloudWatchMonitoring } from './cloudwatch-monitoring';
import { IAMRoles } from './iam-roles';

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

    // Create API endpoints
    this.createApiEndpoints(environment);

    // Create comprehensive CloudWatch monitoring
    this.createCloudWatchMonitoring(environment, alertEmail);

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

  private createApiEndpoints(environment: string) {
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
    (this as any).lambdaAuthorizer = authorizer;
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
    // Get monitoring configuration
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

    // Get secret references
    const otpSecret = (this as any).otpSecret as secretsmanager.Secret;
    const apiKeysSecret = (this as any).apiKeysSecret as secretsmanager.Secret;
    const dbSecret = (this as any).dbSecret as secretsmanager.Secret;

    // Lambda Authorizer Function with least privilege IAM role
    this.authorizerFunction = new lambda.Function(this, 'AuthorizerFunction', {
      functionName: `misra-platform-authorizer-${environment}`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist-lambdas/auth/authorizer'),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      role: this.iamRoles.authorizerRole,
      environment: {
        JWT_SECRET_NAME: this.jwtSecret.secretName,
        USERS_TABLE_NAME: this.usersTable.tableName,
        ENVIRONMENT: environment,
        ...structuredLoggingConfig,
      },
      logRetention: environment === 'production' 
        ? logs.RetentionDays.ONE_MONTH 
        : logs.RetentionDays.ONE_WEEK,
    });

    // Store Lambda functions for future endpoint creation
    (this as any).lambdaFunctions = {
      authorizer: this.authorizerFunction,
      // Additional Lambda functions will be added here as they are implemented
      // These will be created in subsequent tasks (Phase 2)
    };

    // Note: IAM permissions are now handled by the IAMRoles construct
    // No need to grant individual permissions here as roles have least privilege access
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
  }
}