import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Template } from 'aws-cdk-lib/assertions';
import { IAMRoles } from '../../infrastructure/iam-roles';

describe('IAMRoles', () => {
  let app: cdk.App;
  let stack: cdk.Stack;
  let template: Template;

  // Mock AWS resources
  let kmsKey: kms.Key;
  let userPool: cognito.UserPool;
  let filesBucket: s3.Bucket;
  let usersTable: dynamodb.Table;
  let fileMetadataTable: dynamodb.Table;
  let analysisResultsTable: dynamodb.Table;
  let sampleFilesTable: dynamodb.Table;
  let progressTable: dynamodb.Table;
  let jwtSecret: secretsmanager.Secret;
  let otpSecret: secretsmanager.Secret;
  let apiKeysSecret: secretsmanager.Secret;
  let dbSecret: secretsmanager.Secret;

  beforeEach(() => {
    app = new cdk.App();
    stack = new cdk.Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });

    // Create mock resources
    kmsKey = new kms.Key(stack, 'TestKmsKey');
    
    userPool = new cognito.UserPool(stack, 'TestUserPool', {
      userPoolName: 'test-user-pool',
    });

    filesBucket = new s3.Bucket(stack, 'TestFilesBucket', {
      bucketName: 'test-files-bucket',
    });

    // Create DynamoDB tables
    usersTable = new dynamodb.Table(stack, 'TestUsersTable', {
      tableName: 'test-users',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    fileMetadataTable = new dynamodb.Table(stack, 'TestFileMetadataTable', {
      tableName: 'test-file-metadata',
      partitionKey: { name: 'fileId', type: dynamodb.AttributeType.STRING },
    });

    analysisResultsTable = new dynamodb.Table(stack, 'TestAnalysisResultsTable', {
      tableName: 'test-analysis-results',
      partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
    });

    sampleFilesTable = new dynamodb.Table(stack, 'TestSampleFilesTable', {
      tableName: 'test-sample-files',
      partitionKey: { name: 'sampleId', type: dynamodb.AttributeType.STRING },
    });

    progressTable = new dynamodb.Table(stack, 'TestProgressTable', {
      tableName: 'test-progress',
      partitionKey: { name: 'analysisId', type: dynamodb.AttributeType.STRING },
    });

    // Create secrets
    jwtSecret = new secretsmanager.Secret(stack, 'TestJwtSecret', {
      secretName: 'test-jwt-secret',
    });

    otpSecret = new secretsmanager.Secret(stack, 'TestOtpSecret', {
      secretName: 'test-otp-secret',
    });

    apiKeysSecret = new secretsmanager.Secret(stack, 'TestApiKeysSecret', {
      secretName: 'test-api-keys-secret',
    });

    dbSecret = new secretsmanager.Secret(stack, 'TestDbSecret', {
      secretName: 'test-db-secret',
    });
  });

  describe('Role Creation', () => {
    beforeEach(() => {
      new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'dev',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      template = Template.fromStack(stack);
    });

    test('creates all required IAM roles', () => {
      // Verify all roles are created
      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'misra-platform-base-lambda-dev',
      });

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'misra-platform-authorizer-dev',
      });

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'misra-platform-auth-functions-dev',
      });

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'misra-platform-file-functions-dev',
      });

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'misra-platform-analysis-functions-dev',
      });

      template.hasResourceProperties('AWS::IAM::Role', {
        RoleName: 'misra-platform-monitoring-dev',
      });
    });

    test('roles have correct assume role policies', () => {
      // All roles should be assumable by Lambda service
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Principal: {
                Service: 'lambda.amazonaws.com',
              },
              Action: 'sts:AssumeRole',
            },
          ],
        },
      });
    });
  });

  describe('Authorizer Role Permissions', () => {
    let iamRoles: IAMRoles;

    beforeEach(() => {
      iamRoles = new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'dev',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      template = Template.fromStack(stack);
    });

    test('has minimal CloudWatch permissions', () => {
      // Check for CloudWatch logging permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'BasicLambdaExecution',
              Effect: 'Allow',
              Action: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents',
              ],
              Resource: [
                'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/*',
                'arn:aws:logs:us-east-1:123456789012:log-group:/misra-platform/dev/*',
              ],
            },
          ],
        },
      });
    });

    test('has JWT secret access only', () => {
      // Check for JWT secret access
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'JWTSecretAccess',
              Effect: 'Allow',
              Action: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
              ],
            },
          ],
        },
      });
    });

    test('has read-only DynamoDB access with attribute restrictions', () => {
      // Check for DynamoDB read permissions with conditions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'UsersTableRead',
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:Query',
              ],
              Condition: {
                'ForAllValues:StringEquals': {
                  'dynamodb:Attributes': [
                    'userId',
                    'email',
                    'status',
                    'role',
                    'organizationId',
                    'lastLoginAt',
                    'createdAt',
                    'updatedAt',
                  ],
                },
              },
            },
          ],
        },
      });
    });

    test('has KMS decrypt permissions scoped to Secrets Manager', () => {
      // Check for KMS permissions with service condition
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'KMSDecryptForSecrets',
              Effect: 'Allow',
              Action: [
                'kms:Decrypt',
                'kms:DescribeKey',
              ],
              Condition: {
                StringEquals: {
                  'kms:ViaService': 'secretsmanager.us-east-1.amazonaws.com',
                },
              },
            },
          ],
        },
      });
    });
  });

  describe('Authentication Function Role Permissions', () => {
    beforeEach(() => {
      new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'dev',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      template = Template.fromStack(stack);
    });

    test('has Cognito User Pool operations', () => {
      // Check for Cognito permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'CognitoUserPoolOperations',
              Effect: 'Allow',
              Action: [
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
            },
          ],
        },
      });
    });

    test('has Users table read/write access', () => {
      // Check for DynamoDB read/write permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'UsersTableReadWrite',
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:Query',
              ],
            },
          ],
        },
      });
    });

    test('has access to authentication secrets only', () => {
      // Check for JWT and OTP secret access
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'AuthSecretsAccess',
              Effect: 'Allow',
              Action: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
              ],
            },
          ],
        },
      });
    });
  });

  describe('File Function Role Permissions', () => {
    beforeEach(() => {
      new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'dev',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      template = Template.fromStack(stack);
    });

    test('has S3 bucket operations', () => {
      // Check for S3 permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'S3BucketOperations',
              Effect: 'Allow',
              Action: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:GetObjectVersion',
                's3:PutObjectAcl',
              ],
            },
          ],
        },
      });
    });

    test('has file metadata table operations', () => {
      // Check for file metadata table permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'FileMetadataTableOperations',
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
            },
          ],
        },
      });
    });

    test('has read-only access to sample files table', () => {
      // Check for sample files table read permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'SampleFilesTableRead',
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
            },
          ],
        },
      });
    });
  });

  describe('Analysis Function Role Permissions', () => {
    beforeEach(() => {
      new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'dev',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      template = Template.fromStack(stack);
    });

    test('has read-only S3 access for analysis', () => {
      // Check for S3 read permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'S3ReadForAnalysis',
              Effect: 'Allow',
              Action: [
                's3:GetObject',
                's3:GetObjectVersion',
              ],
            },
          ],
        },
      });
    });

    test('has analysis results table operations', () => {
      // Check for analysis results table permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'AnalysisResultsTableOperations',
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:Query',
              ],
            },
          ],
        },
      });
    });

    test('has progress table operations for real-time updates', () => {
      // Check for progress table permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'ProgressTableOperations',
              Effect: 'Allow',
              Action: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
              ],
            },
          ],
        },
      });
    });

    test('has API keys secret access for external services', () => {
      // Check for API keys secret access
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'ApiKeysSecretAccess',
              Effect: 'Allow',
              Action: [
                'secretsmanager:GetSecretValue',
                'secretsmanager:DescribeSecret',
              ],
            },
          ],
        },
      });
    });
  });

  describe('Monitoring Role Permissions', () => {
    beforeEach(() => {
      new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'dev',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      template = Template.fromStack(stack);
    });

    test('has read-only DynamoDB access for health checks', () => {
      // Check for DynamoDB read permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'DynamoDBReadOnlyForMonitoring',
              Effect: 'Allow',
              Action: [
                'dynamodb:DescribeTable',
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan',
              ],
            },
          ],
        },
      });
    });

    test('has read-only S3 access for health checks', () => {
      // Check for S3 read permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'S3ReadOnlyForMonitoring',
              Effect: 'Allow',
              Action: [
                's3:GetBucketLocation',
                's3:GetBucketVersioning',
                's3:ListBucket',
                's3:GetObject',
              ],
            },
          ],
        },
      });
    });

    test('has CloudWatch operations for monitoring', () => {
      // Check for CloudWatch permissions
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'CloudWatchOperationsForMonitoring',
              Effect: 'Allow',
              Action: [
                'cloudwatch:GetMetricStatistics',
                'cloudwatch:ListMetrics',
                'cloudwatch:PutMetricData',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:GetLogEvents',
                'logs:FilterLogEvents',
              ],
            },
          ],
        },
      });
    });

    test('does not have access to any secrets', () => {
      // Monitoring role should not have any Secrets Manager permissions
      const policies = template.findResources('AWS::IAM::Policy');
      
      Object.values(policies).forEach((policy: any) => {
        const statements = policy.Properties?.PolicyDocument?.Statement || [];
        statements.forEach((statement: any) => {
          if (statement.Action) {
            const actions = Array.isArray(statement.Action) ? statement.Action : [statement.Action];
            actions.forEach((action: string) => {
              expect(action).not.toMatch(/secretsmanager:/);
            });
          }
        });
      });
    });
  });

  describe('Permission Boundaries', () => {
    test('creates permission boundary for production environment', () => {
      const iamRoles = new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'production',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      const permissionBoundary = iamRoles.createPermissionBoundaries('production', 'us-east-1', '123456789012');
      
      expect(permissionBoundary).toBeDefined();
      expect(permissionBoundary.managedPolicyName).toBe('misra-platform-permission-boundary-production');
    });

    test('permission boundary allows MISRA platform actions', () => {
      const iamRoles = new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'production',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      iamRoles.createPermissionBoundaries('production', 'us-east-1', '123456789012');

      template = Template.fromStack(stack);

      // Check for permission boundary policy
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        ManagedPolicyName: 'misra-platform-permission-boundary-production',
        PolicyDocument: {
          Statement: [
            {
              Sid: 'AllowMisraPlatformActions',
              Effect: 'Allow',
              Action: ['*'],
              Resource: [
                'arn:aws:dynamodb:us-east-1:123456789012:table/misra-platform-*',
                'arn:aws:s3:::misra-platform-*',
                'arn:aws:s3:::misra-platform-*/*',
                'arn:aws:secretsmanager:us-east-1:123456789012:secret:misra-platform/*',
                'arn:aws:kms:us-east-1:123456789012:key/*',
                'arn:aws:cognito-idp:us-east-1:123456789012:userpool/*',
                'arn:aws:logs:us-east-1:123456789012:log-group:/aws/lambda/misra-platform-*',
                'arn:aws:logs:us-east-1:123456789012:log-group:/misra-platform/production/*',
                'arn:aws:cloudwatch:us-east-1:123456789012:metric/MISRA/Platform/*',
              ],
            },
          ],
        },
      });
    });

    test('permission boundary denies dangerous actions', () => {
      const iamRoles = new IAMRoles(stack, 'TestIAMRoles', {
        environment: 'production',
        region: 'us-east-1',
        accountId: '123456789012',
        kmsKey,
        userPool,
        filesBucket,
        usersTable,
        fileMetadataTable,
        analysisResultsTable,
        sampleFilesTable,
        progressTable,
        jwtSecret,
        otpSecret,
        apiKeysSecret,
        dbSecret,
      });

      iamRoles.createPermissionBoundaries('production', 'us-east-1', '123456789012');

      template = Template.fromStack(stack);

      // Check for dangerous actions denial
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: [
            {
              Sid: 'DenyDangerousActions',
              Effect: 'Deny',
              Action: [
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
              Resource: ['*'],
            },
          ],
        },
      });
    });
  });
});