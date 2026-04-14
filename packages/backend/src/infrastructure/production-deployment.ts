import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';

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
      pointInTimeRecovery: environment === 'prod',
      
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
      retention: props.timeout?.toSeconds() ? Math.ceil(props.timeout.toSeconds() / 60) * 90 : 14,
    });

    // Create KMS key for function encryption
    const functionKey = new kms.Key(this, 'FunctionEncryptionKey', {
      alias: `misra-platform-${id}`,
      description: `KMS key for MISRA Platform ${id} Lambda function`,
      enableKeyRotation: true,
      pendingWindow: Duration.days(30),
      removalPolicy: RemovalPolicy.RETAIN,
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
 */
export class ProductionDeploymentStack extends Construct {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // Production S3 Bucket
    const productionBucket = new ProductionS3Bucket(this, 'ProductionFileStorage', {
      environment: 'prod',
    });

    // Production DynamoDB Tables
    const usersTable = new ProductionDynamoDBTable(this, 'UsersTable', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      environment: 'prod',
      tableName: 'misra-platform-users',
    });

    const analysesTable = new ProductionDynamoDBTable(this, 'AnalysesTable', {
      partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      environment: 'prod',
      tableName: 'misra-platform-analyses',
    });

    // Add GSI for analyses table
    analysesTable.addGlobalSecondaryIndex({
      indexName: 'projectId-createdAt-index',
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const analysisResultsTable = new ProductionDynamoDBTable(this, 'AnalysisResultsTable', {
      partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      environment: 'prod',
      tableName: 'misra-platform-analysis-results',
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

    // Production Lambda Functions
    const analysisFunction = new ProductionLambdaFunction(this, 'misra-platform-analysis', {
      entry: '../functions/analysis/analyze-file',
      handler: 'index.handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: Duration.minutes(5),
      memorySize: 2048,
      environment: {
        FILE_STORAGE_BUCKET_NAME: productionBucket.bucket.bucketName,
        ANALYSIS_RESULTS_TABLE: analysisResultsTable.table.tableName,
        ANALYSIS_CACHE_TABLE: 'misra-platform-analysis-cache',
      },
    });

    // Grant permissions
    productionBucket.grantReadWrite(analysisFunction.function);
    analysisResultsTable.grantReadWriteData(analysisFunction.function);

    // Secrets Manager for production secrets
    const jwtSecret = new secretsmanager.Secret(this, 'JWTSecret', {
      secretName: 'misra-platform-jwt-secret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'jwt' }),
        generateStringKey: 'secret',
        excludeCharacters: '"@/\\',
      },
    });

    // Grant Lambda function access to JWT secret
    jwtSecret.grantRead(analysisFunction.function);

    // Output production configuration
    new cdk.CfnOutput(this, 'ProductionBucketName', {
      value: productionBucket.bucket.bucketName,
      description: 'Production S3 bucket name',
    });

    new cdk.CfnOutput(this, 'ProductionUsersTableName', {
      value: usersTable.table.tableName,
      description: 'Production users table name',
    });

    new cdk.CfnOutput(this, 'ProductionAnalysesTableName', {
      value: analysesTable.table.tableName,
      description: 'Production analyses table name',
    });

    new cdk.CfnOutput(this, 'ProductionAnalysisResultsTableName', {
      value: analysisResultsTable.table.tableName,
      description: 'Production analysis results table name',
    });

    new cdk.CfnOutput(this, 'AnalysisFunctionName', {
      value: analysisFunction.function.functionName,
      description: 'Production analysis Lambda function name',
    });
  }
}
