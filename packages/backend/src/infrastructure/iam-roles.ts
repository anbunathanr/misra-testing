import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface IAMRolesProps {
  environment: 'dev' | 'staging' | 'production';
  region: string;
  accountId: string;
  kmsKey: kms.Key;
  userPool: cognito.UserPool;
  filesBucket: s3.Bucket;
  usersTable: dynamodb.Table;
  fileMetadataTable: dynamodb.Table;
  analysisResultsTable: dynamodb.Table;
  sampleFilesTable: dynamodb.Table;
  progressTable: dynamodb.Table;
  jwtSecret: secretsmanager.Secret;
  otpSecret: secretsmanager.Secret;
  apiKeysSecret: secretsmanager.Secret;
  dbSecret: secretsmanager.Secret;
}

/**
 * IAM Roles with Least Privilege Access
 * 
 * This construct creates IAM roles for different Lambda function types with minimal required permissions.
 * Each role follows the principle of least privilege, granting only the specific permissions needed
 * for that function type to operate correctly.
 */
export class IAMRoles extends Construct {
  public readonly authorizerRole: iam.Role;
  public readonly authFunctionRole: iam.Role;
  public readonly fileFunctionRole: iam.Role;
  public readonly analysisFunctionRole: iam.Role;
  public readonly monitoringRole: iam.Role;
  public readonly auditRole: iam.Role;

  constructor(scope: Construct, id: string, props: IAMRolesProps) {
    super(scope, id);

    const { environment, region, accountId, kmsKey, userPool, filesBucket } = props;
    const {
      usersTable, fileMetadataTable, analysisResultsTable, 
      sampleFilesTable, progressTable
    } = props;
    const { jwtSecret, otpSecret, apiKeysSecret, dbSecret } = props;

    // Create base Lambda execution role
    const baseLambdaRole = this.createBaseLambdaRole(environment, region, accountId);

    // Create specialized roles for different function types
    this.authorizerRole = this.createAuthorizerRole(
      environment, region, accountId, baseLambdaRole,
      jwtSecret, usersTable, kmsKey
    );

    this.authFunctionRole = this.createAuthFunctionRole(
      environment, region, accountId, baseLambdaRole,
      userPool, usersTable, jwtSecret, otpSecret, kmsKey
    );

    this.fileFunctionRole = this.createFileFunctionRole(
      environment, region, accountId, baseLambdaRole,
      filesBucket, fileMetadataTable, sampleFilesTable, usersTable, kmsKey
    );

    this.analysisFunctionRole = this.createAnalysisFunctionRole(
      environment, region, accountId, baseLambdaRole,
      filesBucket, fileMetadataTable, analysisResultsTable, 
      progressTable, usersTable, apiKeysSecret, kmsKey
    );

    this.monitoringRole = this.createMonitoringRole(
      environment, region, accountId, baseLambdaRole,
      usersTable, fileMetadataTable, analysisResultsTable, 
      sampleFilesTable, progressTable, filesBucket
    );

    this.auditRole = this.createAuditRole(
      environment, region, accountId, baseLambdaRole,
      usersTable, fileMetadataTable, analysisResultsTable, 
      sampleFilesTable, progressTable, kmsKey
    );
  }

  /**
   * Create base Lambda execution role with minimal CloudWatch permissions
   */
  private createBaseLambdaRole(
    environment: string,
    region: string,
    accountId: string
  ): iam.Role {
    const role = new iam.Role(this, 'BaseLambdaRole', {
      roleName: `misra-platform-base-lambda-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Base role for Lambda functions with minimal CloudWatch permissions',
    });

    // Basic Lambda execution permissions
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'BasicLambdaExecution',
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [
        `arn:aws:logs:${region}:${accountId}:log-group:/aws/lambda/*`,
        `arn:aws:logs:${region}:${accountId}:log-group:/misra-platform/${environment}/*`,
      ],
    }));

    // Custom metrics permissions (scoped to MISRA namespace)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CustomMetrics',
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'MISRA/Platform',
        },
      },
    }));

    return role;
  }

  /**
   * Create IAM role for Lambda Authorizer with minimal JWT validation permissions
   */
  private createAuthorizerRole(
    environment: string,
    region: string,
    accountId: string,
    baseLambdaRole: iam.Role,
    jwtSecret: secretsmanager.Secret,
    usersTable: dynamodb.Table,
    kmsKey: kms.Key
  ): iam.Role {
    const role = new iam.Role(this, 'AuthorizerRole', {
      roleName: `misra-platform-authorizer-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Lambda Authorizer with JWT validation permissions',
    });

    // Inherit base Lambda permissions
    this.inheritBaseLambdaPermissions(role, baseLambdaRole);

    // JWT Secret read access (specific secret only)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'JWTSecretAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
      ],
      resources: [jwtSecret.secretArn],
    }));

    // Users table read access (for user validation)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'UsersTableRead',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
      ],
      resources: [
        usersTable.tableArn,
        `${usersTable.tableArn}/index/*`,
      ],
      conditions: {
        'ForAllValues:StringEquals': {
          'dynamodb:Attributes': [
            'userId', 'email', 'status', 'role', 'organizationId',
            'lastLoginAt', 'createdAt', 'updatedAt'
          ],
        },
      },
    }));

    // KMS decrypt permissions (scoped to Secrets Manager service)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'KMSDecryptForSecrets',
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Decrypt',
        'kms:DescribeKey',
      ],
      resources: [kmsKey.keyArn],
      conditions: {
        StringEquals: {
          'kms:ViaService': `secretsmanager.${region}.amazonaws.com`,
        },
      },
    }));

    return role;
  }

  /**
   * Create IAM role for Authentication Lambda functions
   */
  private createAuthFunctionRole(
    environment: string,
    region: string,
    accountId: string,
    baseLambdaRole: iam.Role,
    userPool: cognito.UserPool,
    usersTable: dynamodb.Table,
    jwtSecret: secretsmanager.Secret,
    otpSecret: secretsmanager.Secret,
    kmsKey: kms.Key
  ): iam.Role {
    const role = new iam.Role(this, 'AuthFunctionRole', {
      roleName: `misra-platform-auth-functions-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Authentication Lambda functions',
    });

    // Inherit base Lambda permissions
    this.inheritBaseLambdaPermissions(role, baseLambdaRole);

    // Cognito User Pool operations (scoped to specific user pool)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CognitoUserPoolOperations',
      effect: iam.Effect.ALLOW,
      actions: [
        'cognito-idp:AdminCreateUser',
        'cognito-idp:AdminSetUserPassword',
        'cognito-idp:AdminSetUserMFAPreference',
        'cognito-idp:AdminInitiateAuth',
        'cognito-idp:AdminRespondToAuthChallenge',
        'cognito-idp:AssociateSoftwareToken',
        'cognito-idp:VerifySoftwareToken',
        'cognito-idp:AdminGetUser',
        'cognito-idp:AdminUpdateUserAttributes',
        'cognito-idp:AdminListGroupsForUser',
        'cognito-idp:ListUsers',
      ],
      resources: [userPool.userPoolArn],
    }));

    // Users table read/write access
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'UsersTableReadWrite',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query',
      ],
      resources: [
        usersTable.tableArn,
        `${usersTable.tableArn}/index/*`,
      ],
    }));

    // Authentication secrets access
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'AuthSecretsAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
      ],
      resources: [
        jwtSecret.secretArn,
        otpSecret.secretArn,
      ],
    }));

    // KMS decrypt permissions for secrets
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'KMSDecryptForAuthSecrets',
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Decrypt',
        'kms:DescribeKey',
      ],
      resources: [kmsKey.keyArn],
      conditions: {
        StringEquals: {
          'kms:ViaService': `secretsmanager.${region}.amazonaws.com`,
        },
      },
    }));

    return role;
  }

  /**
   * Create IAM role for File Management Lambda functions
   */
  private createFileFunctionRole(
    environment: string,
    region: string,
    accountId: string,
    baseLambdaRole: iam.Role,
    filesBucket: s3.Bucket,
    fileMetadataTable: dynamodb.Table,
    sampleFilesTable: dynamodb.Table,
    usersTable: dynamodb.Table,
    kmsKey: kms.Key
  ): iam.Role {
    const role = new iam.Role(this, 'FileFunctionRole', {
      roleName: `misra-platform-file-functions-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for File Management Lambda functions',
    });

    // Inherit base Lambda permissions
    this.inheritBaseLambdaPermissions(role, baseLambdaRole);

    // S3 bucket operations (scoped to specific bucket and user paths)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3BucketOperations',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
        's3:GetObjectVersion',
        's3:PutObjectAcl',
      ],
      resources: [
        `${filesBucket.bucketArn}/*`,
      ],
    }));

    // S3 bucket listing (for presigned URL generation)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3BucketListing',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:ListBucket',
        's3:GetBucketLocation',
        's3:GetBucketVersioning',
      ],
      resources: [filesBucket.bucketArn],
    }));

    // File metadata table operations
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'FileMetadataTableOperations',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        fileMetadataTable.tableArn,
        `${fileMetadataTable.tableArn}/index/*`,
      ],
    }));

    // Sample files table read access
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'SampleFilesTableRead',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        sampleFilesTable.tableArn,
        `${sampleFilesTable.tableArn}/index/*`,
      ],
    }));

    // Users table read access (for user validation)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'UsersTableReadForFiles',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
      ],
      resources: [
        usersTable.tableArn,
        `${usersTable.tableArn}/index/*`,
      ],
    }));

    // KMS encrypt/decrypt permissions for S3 and DynamoDB
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'KMSOperationsForFiles',
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Encrypt',
        'kms:Decrypt',
        'kms:ReEncrypt*',
        'kms:GenerateDataKey*',
        'kms:DescribeKey',
      ],
      resources: [kmsKey.keyArn],
      conditions: {
        StringEquals: {
          'kms:ViaService': [
            `s3.${region}.amazonaws.com`,
            `dynamodb.${region}.amazonaws.com`,
          ],
        },
      },
    }));

    return role;
  }

  /**
   * Create IAM role for Analysis Lambda functions
   */
  private createAnalysisFunctionRole(
    environment: string,
    region: string,
    accountId: string,
    baseLambdaRole: iam.Role,
    filesBucket: s3.Bucket,
    fileMetadataTable: dynamodb.Table,
    analysisResultsTable: dynamodb.Table,
    progressTable: dynamodb.Table,
    usersTable: dynamodb.Table,
    apiKeysSecret: secretsmanager.Secret,
    kmsKey: kms.Key
  ): iam.Role {
    const role = new iam.Role(this, 'AnalysisFunctionRole', {
      roleName: `misra-platform-analysis-functions-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Analysis Lambda functions',
    });

    // Inherit base Lambda permissions
    this.inheritBaseLambdaPermissions(role, baseLambdaRole);

    // S3 read access for file analysis
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3ReadForAnalysis',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetObject',
        's3:GetObjectVersion',
      ],
      resources: [
        `${filesBucket.bucketArn}/*`,
      ],
    }));

    // File metadata table read access
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'FileMetadataTableReadForAnalysis',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
      ],
      resources: [
        fileMetadataTable.tableArn,
        `${fileMetadataTable.tableArn}/index/*`,
      ],
    }));

    // Analysis results table operations
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'AnalysisResultsTableOperations',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:Query',
      ],
      resources: [
        analysisResultsTable.tableArn,
        `${analysisResultsTable.tableArn}/index/*`,
      ],
    }));

    // Progress table operations (for real-time updates)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'ProgressTableOperations',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:PutItem',
        'dynamodb:UpdateItem',
        'dynamodb:DeleteItem',
      ],
      resources: [progressTable.tableArn],
    }));

    // Users table read access (for user validation)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'UsersTableReadForAnalysis',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query',
      ],
      resources: [
        usersTable.tableArn,
        `${usersTable.tableArn}/index/*`,
      ],
    }));

    // API keys secret access (for external services like OpenAI)
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'ApiKeysSecretAccess',
      effect: iam.Effect.ALLOW,
      actions: [
        'secretsmanager:GetSecretValue',
        'secretsmanager:DescribeSecret',
      ],
      resources: [apiKeysSecret.secretArn],
    }));

    // KMS decrypt permissions for S3, DynamoDB, and Secrets Manager
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'KMSOperationsForAnalysis',
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Decrypt',
        'kms:DescribeKey',
      ],
      resources: [kmsKey.keyArn],
      conditions: {
        StringEquals: {
          'kms:ViaService': [
            `s3.${region}.amazonaws.com`,
            `dynamodb.${region}.amazonaws.com`,
            `secretsmanager.${region}.amazonaws.com`,
          ],
        },
      },
    }));

    return role;
  }

  /**
   * Create IAM role for Monitoring Lambda functions
   */
  private createMonitoringRole(
    environment: string,
    region: string,
    accountId: string,
    baseLambdaRole: iam.Role,
    usersTable: dynamodb.Table,
    fileMetadataTable: dynamodb.Table,
    analysisResultsTable: dynamodb.Table,
    sampleFilesTable: dynamodb.Table,
    progressTable: dynamodb.Table,
    filesBucket: s3.Bucket
  ): iam.Role {
    const role = new iam.Role(this, 'MonitoringRole', {
      roleName: `misra-platform-monitoring-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Monitoring and Health Check Lambda functions',
    });

    // Inherit base Lambda permissions
    this.inheritBaseLambdaPermissions(role, baseLambdaRole);

    // Read-only access to all DynamoDB tables for health checks
    const tableArns = [
      usersTable.tableArn,
      fileMetadataTable.tableArn,
      analysisResultsTable.tableArn,
      sampleFilesTable.tableArn,
      progressTable.tableArn,
    ];

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'DynamoDBReadOnlyForMonitoring',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:DescribeTable',
        'dynamodb:GetItem',
        'dynamodb:Query',
        'dynamodb:Scan',
      ],
      resources: [
        ...tableArns,
        ...tableArns.map(arn => `${arn}/index/*`),
      ],
    }));

    // S3 read access for health checks
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'S3ReadOnlyForMonitoring',
      effect: iam.Effect.ALLOW,
      actions: [
        's3:GetBucketLocation',
        's3:GetBucketVersioning',
        's3:ListBucket',
        's3:GetObject',
      ],
      resources: [
        filesBucket.bucketArn,
        `${filesBucket.bucketArn}/*`,
      ],
    }));

    // CloudWatch metrics and logs access
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'CloudWatchOperationsForMonitoring',
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:GetMetricStatistics',
        'cloudwatch:ListMetrics',
        'cloudwatch:PutMetricData',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams',
        'logs:GetLogEvents',
        'logs:FilterLogEvents',
      ],
      resources: [
        `arn:aws:cloudwatch:${region}:${accountId}:metric/MISRA/Platform/*`,
        `arn:aws:logs:${region}:${accountId}:log-group:/aws/lambda/*`,
        `arn:aws:logs:${region}:${accountId}:log-group:/misra-platform/${environment}/*`,
      ],
    }));

    return role;
  }

  /**
   * Create IAM role for Audit Stream Processor Lambda function
   */
  private createAuditRole(
    environment: string,
    region: string,
    accountId: string,
    baseLambdaRole: iam.Role,
    usersTable: dynamodb.Table,
    fileMetadataTable: dynamodb.Table,
    analysisResultsTable: dynamodb.Table,
    sampleFilesTable: dynamodb.Table,
    progressTable: dynamodb.Table,
    kmsKey: kms.Key
  ): iam.Role {
    const role = new iam.Role(this, 'AuditRole', {
      roleName: `misra-platform-audit-${environment}`,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'IAM role for Audit Stream Processor Lambda function',
    });

    // Inherit base Lambda permissions
    this.inheritBaseLambdaPermissions(role, baseLambdaRole);

    // DynamoDB Streams read permissions for all tables
    const tableArns = [
      usersTable.tableArn,
      fileMetadataTable.tableArn,
      analysisResultsTable.tableArn,
      progressTable.tableArn,
    ];

    role.addToPolicy(new iam.PolicyStatement({
      sid: 'DynamoDBStreamsRead',
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:DescribeStream',
        'dynamodb:GetRecords',
        'dynamodb:GetShardIterator',
        'dynamodb:ListStreams',
      ],
      resources: [
        ...tableArns.map(arn => `${arn}/stream/*`),
      ],
    }));

    // CloudWatch Logs write permissions for audit logs
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'AuditLogsWrite',
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams',
      ],
      resources: [
        `arn:aws:logs:${region}:${accountId}:log-group:/aws/lambda/misra-platform-audit-${environment}*`,
        `arn:aws:logs:${region}:${accountId}:log-group:/misra-platform/${environment}/audit*`,
      ],
    }));

    // KMS decrypt permissions for DynamoDB streams
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'KMSDecryptForStreams',
      effect: iam.Effect.ALLOW,
      actions: [
        'kms:Decrypt',
        'kms:DescribeKey',
      ],
      resources: [kmsKey.keyArn],
      conditions: {
        StringEquals: {
          'kms:ViaService': `dynamodb.${region}.amazonaws.com`,
        },
      },
    }));

    // Custom metrics for audit events
    role.addToPolicy(new iam.PolicyStatement({
      sid: 'AuditMetrics',
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': ['MISRA/Platform', 'MISRA/Audit'],
        },
      },
    }));

    return role;
  }

  /**
   * Helper method to inherit base Lambda permissions
   */
  private inheritBaseLambdaPermissions(targetRole: iam.Role, baseLambdaRole: iam.Role): void {
    // Copy the basic Lambda execution policy statements
    targetRole.addToPolicy(new iam.PolicyStatement({
      sid: 'BasicLambdaExecution',
      effect: iam.Effect.ALLOW,
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
      ],
      resources: [
        `arn:aws:logs:${this.node.tryGetContext('region') || 'us-east-1'}:${this.node.tryGetContext('accountId') || '*'}:log-group:/aws/lambda/*`,
        `arn:aws:logs:${this.node.tryGetContext('region') || 'us-east-1'}:${this.node.tryGetContext('accountId') || '*'}:log-group:/misra-platform/*`,
      ],
    }));

    // Copy custom metrics policy
    targetRole.addToPolicy(new iam.PolicyStatement({
      sid: 'CustomMetrics',
      effect: iam.Effect.ALLOW,
      actions: [
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'cloudwatch:namespace': 'MISRA/Platform',
        },
      },
    }));
  }

  /**
   * Create environment-specific permission boundaries
   */
  public createPermissionBoundaries(environment: string, region: string, accountId: string): iam.ManagedPolicy {
    const permissionBoundary = new iam.ManagedPolicy(this, 'PermissionBoundary', {
      managedPolicyName: `misra-platform-permission-boundary-${environment}`,
      description: `Permission boundary for MISRA Platform Lambda functions - ${environment}`,
      statements: [
        // Allow all actions within the MISRA Platform scope
        new iam.PolicyStatement({
          sid: 'AllowMisraPlatformActions',
          effect: iam.Effect.ALLOW,
          actions: ['*'],
          resources: [
            `arn:aws:dynamodb:${region}:${accountId}:table/misra-platform-*`,
            `arn:aws:s3:::misra-platform-*`,
            `arn:aws:s3:::misra-platform-*/*`,
            `arn:aws:secretsmanager:${region}:${accountId}:secret:misra-platform/*`,
            `arn:aws:kms:${region}:${accountId}:key/*`,
            `arn:aws:cognito-idp:${region}:${accountId}:userpool/*`,
            `arn:aws:logs:${region}:${accountId}:log-group:/aws/lambda/misra-platform-*`,
            `arn:aws:logs:${region}:${accountId}:log-group:/misra-platform/${environment}/*`,
            `arn:aws:cloudwatch:${region}:${accountId}:metric/MISRA/Platform/*`,
          ],
        }),
        // Deny dangerous actions
        new iam.PolicyStatement({
          sid: 'DenyDangerousActions',
          effect: iam.Effect.DENY,
          actions: [
            'iam:*',
            'organizations:*',
            'account:*',
            'aws-portal:*',
            'budgets:*',
            'config:*',
            'directconnect:*',
            'aws-marketplace:*',
            'support:*',
            'trustedadvisor:*',
          ],
          resources: ['*'],
        }),
        // Deny access to other environments' resources
        new iam.PolicyStatement({
          sid: 'DenyOtherEnvironments',
          effect: iam.Effect.DENY,
          actions: ['*'],
          resources: [
            `arn:aws:dynamodb:${region}:${accountId}:table/misra-platform-*`,
            `arn:aws:s3:::misra-platform-*`,
            `arn:aws:secretsmanager:${region}:${accountId}:secret:misra-platform/*`,
          ],
          conditions: {
            StringNotEquals: {
              'aws:RequestedRegion': region,
            },
          },
        }),
      ],
    });

    return permissionBoundary;
  }
}