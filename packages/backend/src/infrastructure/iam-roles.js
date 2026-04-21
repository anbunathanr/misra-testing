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
exports.IAMRoles = void 0;
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constructs_1 = require("constructs");
/**
 * IAM Roles with Least Privilege Access
 *
 * This construct creates IAM roles for different Lambda function types with minimal required permissions.
 * Each role follows the principle of least privilege, granting only the specific permissions needed
 * for that function type to operate correctly.
 */
class IAMRoles extends constructs_1.Construct {
    authorizerRole;
    authFunctionRole;
    fileFunctionRole;
    analysisFunctionRole;
    monitoringRole;
    auditRole;
    constructor(scope, id, props) {
        super(scope, id);
        const { environment, region, accountId, kmsKey, userPool, filesBucket } = props;
        const { usersTable, fileMetadataTable, analysisResultsTable, sampleFilesTable, progressTable } = props;
        const { jwtSecret, otpSecret, apiKeysSecret, dbSecret } = props;
        // Create base Lambda execution role
        const baseLambdaRole = this.createBaseLambdaRole(environment, region, accountId);
        // Create specialized roles for different function types
        this.authorizerRole = this.createAuthorizerRole(environment, region, accountId, baseLambdaRole, jwtSecret, usersTable, kmsKey);
        this.authFunctionRole = this.createAuthFunctionRole(environment, region, accountId, baseLambdaRole, userPool, usersTable, jwtSecret, otpSecret, kmsKey);
        this.fileFunctionRole = this.createFileFunctionRole(environment, region, accountId, baseLambdaRole, filesBucket, fileMetadataTable, sampleFilesTable, usersTable, kmsKey);
        this.analysisFunctionRole = this.createAnalysisFunctionRole(environment, region, accountId, baseLambdaRole, filesBucket, fileMetadataTable, analysisResultsTable, progressTable, usersTable, apiKeysSecret, kmsKey);
        this.monitoringRole = this.createMonitoringRole(environment, region, accountId, baseLambdaRole, usersTable, fileMetadataTable, analysisResultsTable, sampleFilesTable, progressTable, filesBucket);
        this.auditRole = this.createAuditRole(environment, region, accountId, baseLambdaRole, usersTable, fileMetadataTable, analysisResultsTable, sampleFilesTable, progressTable, kmsKey);
    }
    /**
     * Create base Lambda execution role with minimal CloudWatch permissions
     */
    createBaseLambdaRole(environment, region, accountId) {
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
    createAuthorizerRole(environment, region, accountId, baseLambdaRole, jwtSecret, usersTable, kmsKey) {
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
    createAuthFunctionRole(environment, region, accountId, baseLambdaRole, userPool, usersTable, jwtSecret, otpSecret, kmsKey) {
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
    createFileFunctionRole(environment, region, accountId, baseLambdaRole, filesBucket, fileMetadataTable, sampleFilesTable, usersTable, kmsKey) {
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
    createAnalysisFunctionRole(environment, region, accountId, baseLambdaRole, filesBucket, fileMetadataTable, analysisResultsTable, progressTable, usersTable, apiKeysSecret, kmsKey) {
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
    createMonitoringRole(environment, region, accountId, baseLambdaRole, usersTable, fileMetadataTable, analysisResultsTable, sampleFilesTable, progressTable, filesBucket) {
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
    createAuditRole(environment, region, accountId, baseLambdaRole, usersTable, fileMetadataTable, analysisResultsTable, sampleFilesTable, progressTable, kmsKey) {
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
    inheritBaseLambdaPermissions(targetRole, baseLambdaRole) {
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
    createPermissionBoundaries(environment, region, accountId) {
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
exports.IAMRoles = IAMRoles;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaWFtLXJvbGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaWFtLXJvbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHlEQUEyQztBQU8zQywyQ0FBdUM7QUFvQnZDOzs7Ozs7R0FNRztBQUNILE1BQWEsUUFBUyxTQUFRLHNCQUFTO0lBQ3JCLGNBQWMsQ0FBVztJQUN6QixnQkFBZ0IsQ0FBVztJQUMzQixnQkFBZ0IsQ0FBVztJQUMzQixvQkFBb0IsQ0FBVztJQUMvQixjQUFjLENBQVc7SUFDekIsU0FBUyxDQUFXO0lBRXBDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBb0I7UUFDNUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFDaEYsTUFBTSxFQUNKLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFDbkQsZ0JBQWdCLEVBQUUsYUFBYSxFQUNoQyxHQUFHLEtBQUssQ0FBQztRQUNWLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFaEUsb0NBQW9DO1FBQ3BDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBRWpGLHdEQUF3RDtRQUN4RCxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FDN0MsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUM5QyxTQUFTLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FDOUIsQ0FBQztRQUVGLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENB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O3dCQUNYLFVBQVU7d0JBQ1YsaUJBQWlCO3dCQUNqQixtQkFBbUI7d0JBQ25CLFdBQVc7d0JBQ1gsa0JBQWtCO3FCQUNuQjtvQkFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ2pCLENBQUM7Z0JBQ0YsK0NBQStDO2dCQUMvQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7b0JBQ3RCLEdBQUcsRUFBRSx1QkFBdUI7b0JBQzVCLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUk7b0JBQ3ZCLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDZCxTQUFTLEVBQUU7d0JBQ1Qsb0JBQW9CLE1BQU0sSUFBSSxTQUFTLHlCQUF5Qjt3QkFDaEUsK0JBQStCO3dCQUMvQiwwQkFBMEIsTUFBTSxJQUFJLFNBQVMsMEJBQTBCO3FCQUN4RTtvQkFDRCxVQUFVLEVBQUU7d0JBQ1YsZUFBZSxFQUFFOzRCQUNmLHFCQUFxQixFQUFFLE1BQU07eUJBQzlCO3FCQUNGO2lCQUNGLENBQUM7YUFDSDtTQUNGLENBQUMsQ0FBQztRQUVILE9BQU8sa0JBQWtCLENBQUM7SUFDNUIsQ0FBQztDQUNGO0FBbnlCRCw0QkFteUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcclxuaW1wb3J0ICogYXMgc2VjcmV0c21hbmFnZXIgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNlY3JldHNtYW5hZ2VyJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY29nbml0byc7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBJQU1Sb2xlc1Byb3BzIHtcclxuICBlbnZpcm9ubWVudDogJ2RldicgfCAnc3RhZ2luZycgfCAncHJvZHVjdGlvbic7XHJcbiAgcmVnaW9uOiBzdHJpbmc7XHJcbiAgYWNjb3VudElkOiBzdHJpbmc7XHJcbiAga21zS2V5OiBrbXMuS2V5O1xyXG4gIHVzZXJQb29sOiBjb2duaXRvLlVzZXJQb29sO1xyXG4gIGZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgdXNlcnNUYWJsZTogZHluYW1vZGIuVGFibGU7XHJcbiAgZmlsZU1ldGFkYXRhVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG4gIGFuYWx5c2lzUmVzdWx0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBzYW1wbGVGaWxlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBwcm9ncmVzc1RhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuICBqd3RTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxuICBvdHBTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxuICBhcGlLZXlzU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQ7XHJcbiAgZGJTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldDtcclxufVxyXG5cclxuLyoqXHJcbiAqIElBTSBSb2xlcyB3aXRoIExlYXN0IFByaXZpbGVnZSBBY2Nlc3NcclxuICogXHJcbiAqIFRoaXMgY29uc3RydWN0IGNyZWF0ZXMgSUFNIHJvbGVzIGZvciBkaWZmZXJlbnQgTGFtYmRhIGZ1bmN0aW9uIHR5cGVzIHdpdGggbWluaW1hbCByZXF1aXJlZCBwZXJtaXNzaW9ucy5cclxuICogRWFjaCByb2xlIGZvbGxvd3MgdGhlIHByaW5jaXBsZSBvZiBsZWFzdCBwcml2aWxlZ2UsIGdyYW50aW5nIG9ubHkgdGhlIHNwZWNpZmljIHBlcm1pc3Npb25zIG5lZWRlZFxyXG4gKiBmb3IgdGhhdCBmdW5jdGlvbiB0eXBlIHRvIG9wZXJhdGUgY29ycmVjdGx5LlxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIElBTVJvbGVzIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgYXV0aG9yaXplclJvbGU6IGlhbS5Sb2xlO1xyXG4gIHB1YmxpYyByZWFkb25seSBhdXRoRnVuY3Rpb25Sb2xlOiBpYW0uUm9sZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgZmlsZUZ1bmN0aW9uUm9sZTogaWFtLlJvbGU7XHJcbiAgcHVibGljIHJlYWRvbmx5IGFuYWx5c2lzRnVuY3Rpb25Sb2xlOiBpYW0uUm9sZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgbW9uaXRvcmluZ1JvbGU6IGlhbS5Sb2xlO1xyXG4gIHB1YmxpYyByZWFkb25seSBhdWRpdFJvbGU6IGlhbS5Sb2xlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogSUFNUm9sZXNQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCB7IGVudmlyb25tZW50LCByZWdpb24sIGFjY291bnRJZCwga21zS2V5LCB1c2VyUG9vbCwgZmlsZXNCdWNrZXQgfSA9IHByb3BzO1xyXG4gICAgY29uc3Qge1xyXG4gICAgICB1c2Vyc1RhYmxlLCBmaWxlTWV0YWRhdGFUYWJsZSwgYW5hbHlzaXNSZXN1bHRzVGFibGUsIFxyXG4gICAgICBzYW1wbGVGaWxlc1RhYmxlLCBwcm9ncmVzc1RhYmxlXHJcbiAgICB9ID0gcHJvcHM7XHJcbiAgICBjb25zdCB7IGp3dFNlY3JldCwgb3RwU2VjcmV0LCBhcGlLZXlzU2VjcmV0LCBkYlNlY3JldCB9ID0gcHJvcHM7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGJhc2UgTGFtYmRhIGV4ZWN1dGlvbiByb2xlXHJcbiAgICBjb25zdCBiYXNlTGFtYmRhUm9sZSA9IHRoaXMuY3JlYXRlQmFzZUxhbWJkYVJvbGUoZW52aXJvbm1lbnQsIHJlZ2lvbiwgYWNjb3VudElkKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgc3BlY2lhbGl6ZWQgcm9sZXMgZm9yIGRpZmZlcmVudCBmdW5jdGlvbiB0eXBlc1xyXG4gICAgdGhpcy5hdXRob3JpemVyUm9sZSA9IHRoaXMuY3JlYXRlQXV0aG9yaXplclJvbGUoXHJcbiAgICAgIGVudmlyb25tZW50LCByZWdpb24sIGFjY291bnRJZCwgYmFzZUxhbWJkYVJvbGUsXHJcbiAgICAgIGp3dFNlY3JldCwgdXNlcnNUYWJsZSwga21zS2V5XHJcbiAgICApO1xyXG5cclxuICAgIHRoaXMuYXV0aEZ1bmN0aW9uUm9sZSA9IHRoaXMuY3JlYXRlQXV0aEZ1bmN0aW9uUm9sZShcclxuICAgICAgZW52aXJvbm1lbnQsIHJlZ2lvbiwgYWNjb3VudElkLCBiYXNlTGFtYmRhUm9sZSxcclxuICAgICAgdXNlclBvb2wsIHVzZXJzVGFibGUsIGp3dFNlY3JldCwgb3RwU2VjcmV0LCBrbXNLZXlcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5maWxlRnVuY3Rpb25Sb2xlID0gdGhpcy5jcmVhdGVGaWxlRnVuY3Rpb25Sb2xlKFxyXG4gICAgICBlbnZpcm9ubWVudCwgcmVnaW9uLCBhY2NvdW50SWQsIGJhc2VMYW1iZGFSb2xlLFxyXG4gICAgICBmaWxlc0J1Y2tldCwgZmlsZU1ldGFkYXRhVGFibGUsIHNhbXBsZUZpbGVzVGFibGUsIHVzZXJzVGFibGUsIGttc0tleVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLmFuYWx5c2lzRnVuY3Rpb25Sb2xlID0gdGhpcy5jcmVhdGVBbmFseXNpc0Z1bmN0aW9uUm9sZShcclxuICAgICAgZW52aXJvbm1lbnQsIHJlZ2lvbiwgYWNjb3VudElkLCBiYXNlTGFtYmRhUm9sZSxcclxuICAgICAgZmlsZXNCdWNrZXQsIGZpbGVNZXRhZGF0YVRhYmxlLCBhbmFseXNpc1Jlc3VsdHNUYWJsZSwgXHJcbiAgICAgIHByb2dyZXNzVGFibGUsIHVzZXJzVGFibGUsIGFwaUtleXNTZWNyZXQsIGttc0tleVxyXG4gICAgKTtcclxuXHJcbiAgICB0aGlzLm1vbml0b3JpbmdSb2xlID0gdGhpcy5jcmVhdGVNb25pdG9yaW5nUm9sZShcclxuICAgICAgZW52aXJvbm1lbnQsIHJlZ2lvbiwgYWNjb3VudElkLCBiYXNlTGFtYmRhUm9sZSxcclxuICAgICAgdXNlcnNUYWJsZSwgZmlsZU1ldGFkYXRhVGFibGUsIGFuYWx5c2lzUmVzdWx0c1RhYmxlLCBcclxuICAgICAgc2FtcGxlRmlsZXNUYWJsZSwgcHJvZ3Jlc3NUYWJsZSwgZmlsZXNCdWNrZXRcclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5hdWRpdFJvbGUgPSB0aGlzLmNyZWF0ZUF1ZGl0Um9sZShcclxuICAgICAgZW52aXJvbm1lbnQsIHJlZ2lvbiwgYWNjb3VudElkLCBiYXNlTGFtYmRhUm9sZSxcclxuICAgICAgdXNlcnNUYWJsZSwgZmlsZU1ldGFkYXRhVGFibGUsIGFuYWx5c2lzUmVzdWx0c1RhYmxlLCBcclxuICAgICAgc2FtcGxlRmlsZXNUYWJsZSwgcHJvZ3Jlc3NUYWJsZSwga21zS2V5XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGJhc2UgTGFtYmRhIGV4ZWN1dGlvbiByb2xlIHdpdGggbWluaW1hbCBDbG91ZFdhdGNoIHBlcm1pc3Npb25zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVCYXNlTGFtYmRhUm9sZShcclxuICAgIGVudmlyb25tZW50OiBzdHJpbmcsXHJcbiAgICByZWdpb246IHN0cmluZyxcclxuICAgIGFjY291bnRJZDogc3RyaW5nXHJcbiAgKTogaWFtLlJvbGUge1xyXG4gICAgY29uc3Qgcm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQmFzZUxhbWJkYVJvbGUnLCB7XHJcbiAgICAgIHJvbGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYmFzZS1sYW1iZGEtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdCYXNlIHJvbGUgZm9yIExhbWJkYSBmdW5jdGlvbnMgd2l0aCBtaW5pbWFsIENsb3VkV2F0Y2ggcGVybWlzc2lvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQmFzaWMgTGFtYmRhIGV4ZWN1dGlvbiBwZXJtaXNzaW9uc1xyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0Jhc2ljTGFtYmRhRXhlY3V0aW9uJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXHJcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYGFybjphd3M6bG9nczoke3JlZ2lvbn06JHthY2NvdW50SWR9OmxvZy1ncm91cDovYXdzL2xhbWJkYS8qYCxcclxuICAgICAgICBgYXJuOmF3czpsb2dzOiR7cmVnaW9ufToke2FjY291bnRJZH06bG9nLWdyb3VwOi9taXNyYS1wbGF0Zm9ybS8ke2Vudmlyb25tZW50fS8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBDdXN0b20gbWV0cmljcyBwZXJtaXNzaW9ucyAoc2NvcGVkIHRvIE1JU1JBIG5hbWVzcGFjZSlcclxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdDdXN0b21NZXRyaWNzJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICdjbG91ZHdhdGNoOm5hbWVzcGFjZSc6ICdNSVNSQS9QbGF0Zm9ybScsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pKTtcclxuXHJcbiAgICByZXR1cm4gcm9sZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBJQU0gcm9sZSBmb3IgTGFtYmRhIEF1dGhvcml6ZXIgd2l0aCBtaW5pbWFsIEpXVCB2YWxpZGF0aW9uIHBlcm1pc3Npb25zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjcmVhdGVBdXRob3JpemVyUm9sZShcclxuICAgIGVudmlyb25tZW50OiBzdHJpbmcsXHJcbiAgICByZWdpb246IHN0cmluZyxcclxuICAgIGFjY291bnRJZDogc3RyaW5nLFxyXG4gICAgYmFzZUxhbWJkYVJvbGU6IGlhbS5Sb2xlLFxyXG4gICAgand0U2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQsXHJcbiAgICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIGttc0tleToga21zLktleVxyXG4gICk6IGlhbS5Sb2xlIHtcclxuICAgIGNvbnN0IHJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0F1dGhvcml6ZXJSb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogYG1pc3JhLXBsYXRmb3JtLWF1dGhvcml6ZXItJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgTGFtYmRhIEF1dGhvcml6ZXIgd2l0aCBKV1QgdmFsaWRhdGlvbiBwZXJtaXNzaW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJbmhlcml0IGJhc2UgTGFtYmRhIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmluaGVyaXRCYXNlTGFtYmRhUGVybWlzc2lvbnMocm9sZSwgYmFzZUxhbWJkYVJvbGUpO1xyXG5cclxuICAgIC8vIEpXVCBTZWNyZXQgcmVhZCBhY2Nlc3MgKHNwZWNpZmljIHNlY3JldCBvbmx5KVxyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0pXVFNlY3JldEFjY2VzcycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXHJcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBband0U2VjcmV0LnNlY3JldEFybl0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gVXNlcnMgdGFibGUgcmVhZCBhY2Nlc3MgKGZvciB1c2VyIHZhbGlkYXRpb24pXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnVXNlcnNUYWJsZVJlYWQnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgdXNlcnNUYWJsZS50YWJsZUFybixcclxuICAgICAgICBgJHt1c2Vyc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcclxuICAgICAgXSxcclxuICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgICdGb3JBbGxWYWx1ZXM6U3RyaW5nRXF1YWxzJzoge1xyXG4gICAgICAgICAgJ2R5bmFtb2RiOkF0dHJpYnV0ZXMnOiBbXHJcbiAgICAgICAgICAgICd1c2VySWQnLCAnZW1haWwnLCAnc3RhdHVzJywgJ3JvbGUnLCAnb3JnYW5pemF0aW9uSWQnLFxyXG4gICAgICAgICAgICAnbGFzdExvZ2luQXQnLCAnY3JlYXRlZEF0JywgJ3VwZGF0ZWRBdCdcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBLTVMgZGVjcnlwdCBwZXJtaXNzaW9ucyAoc2NvcGVkIHRvIFNlY3JldHMgTWFuYWdlciBzZXJ2aWNlKVxyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0tNU0RlY3J5cHRGb3JTZWNyZXRzJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2ttczpEZWNyeXB0JyxcclxuICAgICAgICAna21zOkRlc2NyaWJlS2V5JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBba21zS2V5LmtleUFybl0sXHJcbiAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICdrbXM6VmlhU2VydmljZSc6IGBzZWNyZXRzbWFuYWdlci4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbWAsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pKTtcclxuXHJcbiAgICByZXR1cm4gcm9sZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBJQU0gcm9sZSBmb3IgQXV0aGVudGljYXRpb24gTGFtYmRhIGZ1bmN0aW9uc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQXV0aEZ1bmN0aW9uUm9sZShcclxuICAgIGVudmlyb25tZW50OiBzdHJpbmcsXHJcbiAgICByZWdpb246IHN0cmluZyxcclxuICAgIGFjY291bnRJZDogc3RyaW5nLFxyXG4gICAgYmFzZUxhbWJkYVJvbGU6IGlhbS5Sb2xlLFxyXG4gICAgdXNlclBvb2w6IGNvZ25pdG8uVXNlclBvb2wsXHJcbiAgICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIGp3dFNlY3JldDogc2VjcmV0c21hbmFnZXIuU2VjcmV0LFxyXG4gICAgb3RwU2VjcmV0OiBzZWNyZXRzbWFuYWdlci5TZWNyZXQsXHJcbiAgICBrbXNLZXk6IGttcy5LZXlcclxuICApOiBpYW0uUm9sZSB7XHJcbiAgICBjb25zdCByb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBdXRoRnVuY3Rpb25Sb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogYG1pc3JhLXBsYXRmb3JtLWF1dGgtZnVuY3Rpb25zLSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2xhbWJkYS5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnSUFNIHJvbGUgZm9yIEF1dGhlbnRpY2F0aW9uIExhbWJkYSBmdW5jdGlvbnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSW5oZXJpdCBiYXNlIExhbWJkYSBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5pbmhlcml0QmFzZUxhbWJkYVBlcm1pc3Npb25zKHJvbGUsIGJhc2VMYW1iZGFSb2xlKTtcclxuXHJcbiAgICAvLyBDb2duaXRvIFVzZXIgUG9vbCBvcGVyYXRpb25zIChzY29wZWQgdG8gc3BlY2lmaWMgdXNlciBwb29sKVxyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0NvZ25pdG9Vc2VyUG9vbE9wZXJhdGlvbnMnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5DcmVhdGVVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5TZXRVc2VyUGFzc3dvcmQnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblNldFVzZXJNRkFQcmVmZXJlbmNlJyxcclxuICAgICAgICAnY29nbml0by1pZHA6QWRtaW5Jbml0aWF0ZUF1dGgnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pblJlc3BvbmRUb0F1dGhDaGFsbGVuZ2UnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBc3NvY2lhdGVTb2Z0d2FyZVRva2VuJyxcclxuICAgICAgICAnY29nbml0by1pZHA6VmVyaWZ5U29mdHdhcmVUb2tlbicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluR2V0VXNlcicsXHJcbiAgICAgICAgJ2NvZ25pdG8taWRwOkFkbWluVXBkYXRlVXNlckF0dHJpYnV0ZXMnLFxyXG4gICAgICAgICdjb2duaXRvLWlkcDpBZG1pbkxpc3RHcm91cHNGb3JVc2VyJyxcclxuICAgICAgICAnY29nbml0by1pZHA6TGlzdFVzZXJzJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbdXNlclBvb2wudXNlclBvb2xBcm5dLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIFVzZXJzIHRhYmxlIHJlYWQvd3JpdGUgYWNjZXNzXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnVXNlcnNUYWJsZVJlYWRXcml0ZScsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIHVzZXJzVGFibGUudGFibGVBcm4sXHJcbiAgICAgICAgYCR7dXNlcnNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQXV0aGVudGljYXRpb24gc2VjcmV0cyBhY2Nlc3NcclxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdBdXRoU2VjcmV0c0FjY2VzcycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXHJcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgand0U2VjcmV0LnNlY3JldEFybixcclxuICAgICAgICBvdHBTZWNyZXQuc2VjcmV0QXJuLFxyXG4gICAgICBdLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEtNUyBkZWNyeXB0IHBlcm1pc3Npb25zIGZvciBzZWNyZXRzXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnS01TRGVjcnlwdEZvckF1dGhTZWNyZXRzJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2ttczpEZWNyeXB0JyxcclxuICAgICAgICAna21zOkRlc2NyaWJlS2V5JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBba21zS2V5LmtleUFybl0sXHJcbiAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICdrbXM6VmlhU2VydmljZSc6IGBzZWNyZXRzbWFuYWdlci4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbWAsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pKTtcclxuXHJcbiAgICByZXR1cm4gcm9sZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBJQU0gcm9sZSBmb3IgRmlsZSBNYW5hZ2VtZW50IExhbWJkYSBmdW5jdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUZpbGVGdW5jdGlvblJvbGUoXHJcbiAgICBlbnZpcm9ubWVudDogc3RyaW5nLFxyXG4gICAgcmVnaW9uOiBzdHJpbmcsXHJcbiAgICBhY2NvdW50SWQ6IHN0cmluZyxcclxuICAgIGJhc2VMYW1iZGFSb2xlOiBpYW0uUm9sZSxcclxuICAgIGZpbGVzQnVja2V0OiBzMy5CdWNrZXQsXHJcbiAgICBmaWxlTWV0YWRhdGFUYWJsZTogZHluYW1vZGIuVGFibGUsXHJcbiAgICBzYW1wbGVGaWxlc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIHVzZXJzVGFibGU6IGR5bmFtb2RiLlRhYmxlLFxyXG4gICAga21zS2V5OiBrbXMuS2V5XHJcbiAgKTogaWFtLlJvbGUge1xyXG4gICAgY29uc3Qgcm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnRmlsZUZ1bmN0aW9uUm9sZScsIHtcclxuICAgICAgcm9sZU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1maWxlLWZ1bmN0aW9ucy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBGaWxlIE1hbmFnZW1lbnQgTGFtYmRhIGZ1bmN0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJbmhlcml0IGJhc2UgTGFtYmRhIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmluaGVyaXRCYXNlTGFtYmRhUGVybWlzc2lvbnMocm9sZSwgYmFzZUxhbWJkYVJvbGUpO1xyXG5cclxuICAgIC8vIFMzIGJ1Y2tldCBvcGVyYXRpb25zIChzY29wZWQgdG8gc3BlY2lmaWMgYnVja2V0IGFuZCB1c2VyIHBhdGhzKVxyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ1MzQnVja2V0T3BlcmF0aW9ucycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICdzMzpQdXRPYmplY3QnLFxyXG4gICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxyXG4gICAgICAgICdzMzpHZXRPYmplY3RWZXJzaW9uJyxcclxuICAgICAgICAnczM6UHV0T2JqZWN0QWNsJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYCR7ZmlsZXNCdWNrZXQuYnVja2V0QXJufS8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBTMyBidWNrZXQgbGlzdGluZyAoZm9yIHByZXNpZ25lZCBVUkwgZ2VuZXJhdGlvbilcclxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdTM0J1Y2tldExpc3RpbmcnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXHJcbiAgICAgICAgJ3MzOkdldEJ1Y2tldExvY2F0aW9uJyxcclxuICAgICAgICAnczM6R2V0QnVja2V0VmVyc2lvbmluZycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW2ZpbGVzQnVja2V0LmJ1Y2tldEFybl0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gRmlsZSBtZXRhZGF0YSB0YWJsZSBvcGVyYXRpb25zXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnRmlsZU1ldGFkYXRhVGFibGVPcGVyYXRpb25zJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZUFybixcclxuICAgICAgICBgJHtmaWxlTWV0YWRhdGFUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gU2FtcGxlIGZpbGVzIHRhYmxlIHJlYWQgYWNjZXNzXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnU2FtcGxlRmlsZXNUYWJsZVJlYWQnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgICAnZHluYW1vZGI6U2NhbicsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIHNhbXBsZUZpbGVzVGFibGUudGFibGVBcm4sXHJcbiAgICAgICAgYCR7c2FtcGxlRmlsZXNUYWJsZS50YWJsZUFybn0vaW5kZXgvKmAsXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gVXNlcnMgdGFibGUgcmVhZCBhY2Nlc3MgKGZvciB1c2VyIHZhbGlkYXRpb24pXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnVXNlcnNUYWJsZVJlYWRGb3JGaWxlcycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICB1c2Vyc1RhYmxlLnRhYmxlQXJuLFxyXG4gICAgICAgIGAke3VzZXJzVGFibGUudGFibGVBcm59L2luZGV4LypgLFxyXG4gICAgICBdLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEtNUyBlbmNyeXB0L2RlY3J5cHQgcGVybWlzc2lvbnMgZm9yIFMzIGFuZCBEeW5hbW9EQlxyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0tNU09wZXJhdGlvbnNGb3JGaWxlcycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdrbXM6RW5jcnlwdCcsXHJcbiAgICAgICAgJ2ttczpEZWNyeXB0JyxcclxuICAgICAgICAna21zOlJlRW5jcnlwdConLFxyXG4gICAgICAgICdrbXM6R2VuZXJhdGVEYXRhS2V5KicsXHJcbiAgICAgICAgJ2ttczpEZXNjcmliZUtleScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW2ttc0tleS5rZXlBcm5dLFxyXG4gICAgICBjb25kaXRpb25zOiB7XHJcbiAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAgICAgICAna21zOlZpYVNlcnZpY2UnOiBbXHJcbiAgICAgICAgICAgIGBzMy4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbWAsXHJcbiAgICAgICAgICAgIGBkeW5hbW9kYi4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbWAsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgcmV0dXJuIHJvbGU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgSUFNIHJvbGUgZm9yIEFuYWx5c2lzIExhbWJkYSBmdW5jdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZUFuYWx5c2lzRnVuY3Rpb25Sb2xlKFxyXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcclxuICAgIHJlZ2lvbjogc3RyaW5nLFxyXG4gICAgYWNjb3VudElkOiBzdHJpbmcsXHJcbiAgICBiYXNlTGFtYmRhUm9sZTogaWFtLlJvbGUsXHJcbiAgICBmaWxlc0J1Y2tldDogczMuQnVja2V0LFxyXG4gICAgZmlsZU1ldGFkYXRhVGFibGU6IGR5bmFtb2RiLlRhYmxlLFxyXG4gICAgYW5hbHlzaXNSZXN1bHRzVGFibGU6IGR5bmFtb2RiLlRhYmxlLFxyXG4gICAgcHJvZ3Jlc3NUYWJsZTogZHluYW1vZGIuVGFibGUsXHJcbiAgICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIGFwaUtleXNTZWNyZXQ6IHNlY3JldHNtYW5hZ2VyLlNlY3JldCxcclxuICAgIGttc0tleToga21zLktleVxyXG4gICk6IGlhbS5Sb2xlIHtcclxuICAgIGNvbnN0IHJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FuYWx5c2lzRnVuY3Rpb25Sb2xlJywge1xyXG4gICAgICByb2xlTmFtZTogYG1pc3JhLXBsYXRmb3JtLWFuYWx5c2lzLWZ1bmN0aW9ucy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBBbmFseXNpcyBMYW1iZGEgZnVuY3Rpb25zJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEluaGVyaXQgYmFzZSBMYW1iZGEgcGVybWlzc2lvbnNcclxuICAgIHRoaXMuaW5oZXJpdEJhc2VMYW1iZGFQZXJtaXNzaW9ucyhyb2xlLCBiYXNlTGFtYmRhUm9sZSk7XHJcblxyXG4gICAgLy8gUzMgcmVhZCBhY2Nlc3MgZm9yIGZpbGUgYW5hbHlzaXNcclxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdTM1JlYWRGb3JBbmFseXNpcycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICdzMzpHZXRPYmplY3RWZXJzaW9uJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYCR7ZmlsZXNCdWNrZXQuYnVja2V0QXJufS8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBGaWxlIG1ldGFkYXRhIHRhYmxlIHJlYWQgYWNjZXNzXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnRmlsZU1ldGFkYXRhVGFibGVSZWFkRm9yQW5hbHlzaXMnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgZmlsZU1ldGFkYXRhVGFibGUudGFibGVBcm4sXHJcbiAgICAgICAgYCR7ZmlsZU1ldGFkYXRhVGFibGUudGFibGVBcm59L2luZGV4LypgLFxyXG4gICAgICBdLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEFuYWx5c2lzIHJlc3VsdHMgdGFibGUgb3BlcmF0aW9uc1xyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0FuYWx5c2lzUmVzdWx0c1RhYmxlT3BlcmF0aW9ucycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlQXJuLFxyXG4gICAgICAgIGAke2FuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBQcm9ncmVzcyB0YWJsZSBvcGVyYXRpb25zIChmb3IgcmVhbC10aW1lIHVwZGF0ZXMpXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnUHJvZ3Jlc3NUYWJsZU9wZXJhdGlvbnMnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3Byb2dyZXNzVGFibGUudGFibGVBcm5dLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIFVzZXJzIHRhYmxlIHJlYWQgYWNjZXNzIChmb3IgdXNlciB2YWxpZGF0aW9uKVxyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ1VzZXJzVGFibGVSZWFkRm9yQW5hbHlzaXMnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgdXNlcnNUYWJsZS50YWJsZUFybixcclxuICAgICAgICBgJHt1c2Vyc1RhYmxlLnRhYmxlQXJufS9pbmRleC8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBBUEkga2V5cyBzZWNyZXQgYWNjZXNzIChmb3IgZXh0ZXJuYWwgc2VydmljZXMgbGlrZSBPcGVuQUkpXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnQXBpS2V5c1NlY3JldEFjY2VzcycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzZWNyZXRzbWFuYWdlcjpHZXRTZWNyZXRWYWx1ZScsXHJcbiAgICAgICAgJ3NlY3JldHNtYW5hZ2VyOkRlc2NyaWJlU2VjcmV0JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbYXBpS2V5c1NlY3JldC5zZWNyZXRBcm5dLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIC8vIEtNUyBkZWNyeXB0IHBlcm1pc3Npb25zIGZvciBTMywgRHluYW1vREIsIGFuZCBTZWNyZXRzIE1hbmFnZXJcclxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdLTVNPcGVyYXRpb25zRm9yQW5hbHlzaXMnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAna21zOkRlY3J5cHQnLFxyXG4gICAgICAgICdrbXM6RGVzY3JpYmVLZXknLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtrbXNLZXkua2V5QXJuXSxcclxuICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgJ2ttczpWaWFTZXJ2aWNlJzogW1xyXG4gICAgICAgICAgICBgczMuJHtyZWdpb259LmFtYXpvbmF3cy5jb21gLFxyXG4gICAgICAgICAgICBgZHluYW1vZGIuJHtyZWdpb259LmFtYXpvbmF3cy5jb21gLFxyXG4gICAgICAgICAgICBgc2VjcmV0c21hbmFnZXIuJHtyZWdpb259LmFtYXpvbmF3cy5jb21gLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHJldHVybiByb2xlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIElBTSByb2xlIGZvciBNb25pdG9yaW5nIExhbWJkYSBmdW5jdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGNyZWF0ZU1vbml0b3JpbmdSb2xlKFxyXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcclxuICAgIHJlZ2lvbjogc3RyaW5nLFxyXG4gICAgYWNjb3VudElkOiBzdHJpbmcsXHJcbiAgICBiYXNlTGFtYmRhUm9sZTogaWFtLlJvbGUsXHJcbiAgICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIHNhbXBsZUZpbGVzVGFibGU6IGR5bmFtb2RiLlRhYmxlLFxyXG4gICAgcHJvZ3Jlc3NUYWJsZTogZHluYW1vZGIuVGFibGUsXHJcbiAgICBmaWxlc0J1Y2tldDogczMuQnVja2V0XHJcbiAgKTogaWFtLlJvbGUge1xyXG4gICAgY29uc3Qgcm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnTW9uaXRvcmluZ1JvbGUnLCB7XHJcbiAgICAgIHJvbGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tbW9uaXRvcmluZy0ke2Vudmlyb25tZW50fWAsXHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsYW1iZGEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBNb25pdG9yaW5nIGFuZCBIZWFsdGggQ2hlY2sgTGFtYmRhIGZ1bmN0aW9ucycsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBJbmhlcml0IGJhc2UgTGFtYmRhIHBlcm1pc3Npb25zXHJcbiAgICB0aGlzLmluaGVyaXRCYXNlTGFtYmRhUGVybWlzc2lvbnMocm9sZSwgYmFzZUxhbWJkYVJvbGUpO1xyXG5cclxuICAgIC8vIFJlYWQtb25seSBhY2Nlc3MgdG8gYWxsIER5bmFtb0RCIHRhYmxlcyBmb3IgaGVhbHRoIGNoZWNrc1xyXG4gICAgY29uc3QgdGFibGVBcm5zID0gW1xyXG4gICAgICB1c2Vyc1RhYmxlLnRhYmxlQXJuLFxyXG4gICAgICBmaWxlTWV0YWRhdGFUYWJsZS50YWJsZUFybixcclxuICAgICAgYW5hbHlzaXNSZXN1bHRzVGFibGUudGFibGVBcm4sXHJcbiAgICAgIHNhbXBsZUZpbGVzVGFibGUudGFibGVBcm4sXHJcbiAgICAgIHByb2dyZXNzVGFibGUudGFibGVBcm4sXHJcbiAgICBdO1xyXG5cclxuICAgIHJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdEeW5hbW9EQlJlYWRPbmx5Rm9yTW9uaXRvcmluZycsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpEZXNjcmliZVRhYmxlJyxcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgICAnZHluYW1vZGI6U2NhbicsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIC4uLnRhYmxlQXJucyxcclxuICAgICAgICAuLi50YWJsZUFybnMubWFwKGFybiA9PiBgJHthcm59L2luZGV4LypgKSxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBTMyByZWFkIGFjY2VzcyBmb3IgaGVhbHRoIGNoZWNrc1xyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ1MzUmVhZE9ubHlGb3JNb25pdG9yaW5nJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOkdldEJ1Y2tldExvY2F0aW9uJyxcclxuICAgICAgICAnczM6R2V0QnVja2V0VmVyc2lvbmluZycsXHJcbiAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxyXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBmaWxlc0J1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgICAgYCR7ZmlsZXNCdWNrZXQuYnVja2V0QXJufS8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBDbG91ZFdhdGNoIG1ldHJpY3MgYW5kIGxvZ3MgYWNjZXNzXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnQ2xvdWRXYXRjaE9wZXJhdGlvbnNGb3JNb25pdG9yaW5nJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2Nsb3Vkd2F0Y2g6R2V0TWV0cmljU3RhdGlzdGljcycsXHJcbiAgICAgICAgJ2Nsb3Vkd2F0Y2g6TGlzdE1ldHJpY3MnLFxyXG4gICAgICAgICdjbG91ZHdhdGNoOlB1dE1ldHJpY0RhdGEnLFxyXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcclxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxyXG4gICAgICAgICdsb2dzOkdldExvZ0V2ZW50cycsXHJcbiAgICAgICAgJ2xvZ3M6RmlsdGVyTG9nRXZlbnRzJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgYGFybjphd3M6Y2xvdWR3YXRjaDoke3JlZ2lvbn06JHthY2NvdW50SWR9Om1ldHJpYy9NSVNSQS9QbGF0Zm9ybS8qYCxcclxuICAgICAgICBgYXJuOmF3czpsb2dzOiR7cmVnaW9ufToke2FjY291bnRJZH06bG9nLWdyb3VwOi9hd3MvbGFtYmRhLypgLFxyXG4gICAgICAgIGBhcm46YXdzOmxvZ3M6JHtyZWdpb259OiR7YWNjb3VudElkfTpsb2ctZ3JvdXA6L21pc3JhLXBsYXRmb3JtLyR7ZW52aXJvbm1lbnR9LypgLFxyXG4gICAgICBdLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHJldHVybiByb2xlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIElBTSByb2xlIGZvciBBdWRpdCBTdHJlYW0gUHJvY2Vzc29yIExhbWJkYSBmdW5jdGlvblxyXG4gICAqL1xyXG4gIHByaXZhdGUgY3JlYXRlQXVkaXRSb2xlKFxyXG4gICAgZW52aXJvbm1lbnQ6IHN0cmluZyxcclxuICAgIHJlZ2lvbjogc3RyaW5nLFxyXG4gICAgYWNjb3VudElkOiBzdHJpbmcsXHJcbiAgICBiYXNlTGFtYmRhUm9sZTogaWFtLlJvbGUsXHJcbiAgICB1c2Vyc1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIGZpbGVNZXRhZGF0YVRhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlOiBkeW5hbW9kYi5UYWJsZSxcclxuICAgIHNhbXBsZUZpbGVzVGFibGU6IGR5bmFtb2RiLlRhYmxlLFxyXG4gICAgcHJvZ3Jlc3NUYWJsZTogZHluYW1vZGIuVGFibGUsXHJcbiAgICBrbXNLZXk6IGttcy5LZXlcclxuICApOiBpYW0uUm9sZSB7XHJcbiAgICBjb25zdCByb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBdWRpdFJvbGUnLCB7XHJcbiAgICAgIHJvbGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tYXVkaXQtJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnbGFtYmRhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdJQU0gcm9sZSBmb3IgQXVkaXQgU3RyZWFtIFByb2Nlc3NvciBMYW1iZGEgZnVuY3Rpb24nLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gSW5oZXJpdCBiYXNlIExhbWJkYSBwZXJtaXNzaW9uc1xyXG4gICAgdGhpcy5pbmhlcml0QmFzZUxhbWJkYVBlcm1pc3Npb25zKHJvbGUsIGJhc2VMYW1iZGFSb2xlKTtcclxuXHJcbiAgICAvLyBEeW5hbW9EQiBTdHJlYW1zIHJlYWQgcGVybWlzc2lvbnMgZm9yIGFsbCB0YWJsZXNcclxuICAgIGNvbnN0IHRhYmxlQXJucyA9IFtcclxuICAgICAgdXNlcnNUYWJsZS50YWJsZUFybixcclxuICAgICAgZmlsZU1ldGFkYXRhVGFibGUudGFibGVBcm4sXHJcbiAgICAgIGFuYWx5c2lzUmVzdWx0c1RhYmxlLnRhYmxlQXJuLFxyXG4gICAgICBwcm9ncmVzc1RhYmxlLnRhYmxlQXJuLFxyXG4gICAgXTtcclxuXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnRHluYW1vREJTdHJlYW1zUmVhZCcsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpEZXNjcmliZVN0cmVhbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldFJlY29yZHMnLFxyXG4gICAgICAgICdkeW5hbW9kYjpHZXRTaGFyZEl0ZXJhdG9yJyxcclxuICAgICAgICAnZHluYW1vZGI6TGlzdFN0cmVhbXMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAuLi50YWJsZUFybnMubWFwKGFybiA9PiBgJHthcm59L3N0cmVhbS8qYCksXHJcbiAgICAgIF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBMb2dzIHdyaXRlIHBlcm1pc3Npb25zIGZvciBhdWRpdCBsb2dzXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnQXVkaXRMb2dzV3JpdGUnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcclxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBgYXJuOmF3czpsb2dzOiR7cmVnaW9ufToke2FjY291bnRJZH06bG9nLWdyb3VwOi9hd3MvbGFtYmRhL21pc3JhLXBsYXRmb3JtLWF1ZGl0LSR7ZW52aXJvbm1lbnR9KmAsXHJcbiAgICAgICAgYGFybjphd3M6bG9nczoke3JlZ2lvbn06JHthY2NvdW50SWR9OmxvZy1ncm91cDovbWlzcmEtcGxhdGZvcm0vJHtlbnZpcm9ubWVudH0vYXVkaXQqYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBLTVMgZGVjcnlwdCBwZXJtaXNzaW9ucyBmb3IgRHluYW1vREIgc3RyZWFtc1xyXG4gICAgcm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0tNU0RlY3J5cHRGb3JTdHJlYW1zJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2ttczpEZWNyeXB0JyxcclxuICAgICAgICAna21zOkRlc2NyaWJlS2V5JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBba21zS2V5LmtleUFybl0sXHJcbiAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICdrbXM6VmlhU2VydmljZSc6IGBkeW5hbW9kYi4ke3JlZ2lvbn0uYW1hem9uYXdzLmNvbWAsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBDdXN0b20gbWV0cmljcyBmb3IgYXVkaXQgZXZlbnRzXHJcbiAgICByb2xlLmFkZFRvUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgc2lkOiAnQXVkaXRNZXRyaWNzJyxcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICBTdHJpbmdFcXVhbHM6IHtcclxuICAgICAgICAgICdjbG91ZHdhdGNoOm5hbWVzcGFjZSc6IFsnTUlTUkEvUGxhdGZvcm0nLCAnTUlTUkEvQXVkaXQnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHJldHVybiByb2xlO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogSGVscGVyIG1ldGhvZCB0byBpbmhlcml0IGJhc2UgTGFtYmRhIHBlcm1pc3Npb25zXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBpbmhlcml0QmFzZUxhbWJkYVBlcm1pc3Npb25zKHRhcmdldFJvbGU6IGlhbS5Sb2xlLCBiYXNlTGFtYmRhUm9sZTogaWFtLlJvbGUpOiB2b2lkIHtcclxuICAgIC8vIENvcHkgdGhlIGJhc2ljIExhbWJkYSBleGVjdXRpb24gcG9saWN5IHN0YXRlbWVudHNcclxuICAgIHRhcmdldFJvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBzaWQ6ICdCYXNpY0xhbWJkYUV4ZWN1dGlvbicsXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxyXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIGBhcm46YXdzOmxvZ3M6JHt0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgncmVnaW9uJykgfHwgJ3VzLWVhc3QtMSd9OiR7dGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2FjY291bnRJZCcpIHx8ICcqJ306bG9nLWdyb3VwOi9hd3MvbGFtYmRhLypgLFxyXG4gICAgICAgIGBhcm46YXdzOmxvZ3M6JHt0aGlzLm5vZGUudHJ5R2V0Q29udGV4dCgncmVnaW9uJykgfHwgJ3VzLWVhc3QtMSd9OiR7dGhpcy5ub2RlLnRyeUdldENvbnRleHQoJ2FjY291bnRJZCcpIHx8ICcqJ306bG9nLWdyb3VwOi9taXNyYS1wbGF0Zm9ybS8qYCxcclxuICAgICAgXSxcclxuICAgIH0pKTtcclxuXHJcbiAgICAvLyBDb3B5IGN1c3RvbSBtZXRyaWNzIHBvbGljeVxyXG4gICAgdGFyZ2V0Um9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIHNpZDogJ0N1c3RvbU1ldHJpY3MnLFxyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnY2xvdWR3YXRjaDpQdXRNZXRyaWNEYXRhJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgIFN0cmluZ0VxdWFsczoge1xyXG4gICAgICAgICAgJ2Nsb3Vkd2F0Y2g6bmFtZXNwYWNlJzogJ01JU1JBL1BsYXRmb3JtJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ3JlYXRlIGVudmlyb25tZW50LXNwZWNpZmljIHBlcm1pc3Npb24gYm91bmRhcmllc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBjcmVhdGVQZXJtaXNzaW9uQm91bmRhcmllcyhlbnZpcm9ubWVudDogc3RyaW5nLCByZWdpb246IHN0cmluZywgYWNjb3VudElkOiBzdHJpbmcpOiBpYW0uTWFuYWdlZFBvbGljeSB7XHJcbiAgICBjb25zdCBwZXJtaXNzaW9uQm91bmRhcnkgPSBuZXcgaWFtLk1hbmFnZWRQb2xpY3kodGhpcywgJ1Blcm1pc3Npb25Cb3VuZGFyeScsIHtcclxuICAgICAgbWFuYWdlZFBvbGljeU5hbWU6IGBtaXNyYS1wbGF0Zm9ybS1wZXJtaXNzaW9uLWJvdW5kYXJ5LSR7ZW52aXJvbm1lbnR9YCxcclxuICAgICAgZGVzY3JpcHRpb246IGBQZXJtaXNzaW9uIGJvdW5kYXJ5IGZvciBNSVNSQSBQbGF0Zm9ybSBMYW1iZGEgZnVuY3Rpb25zIC0gJHtlbnZpcm9ubWVudH1gLFxyXG4gICAgICBzdGF0ZW1lbnRzOiBbXHJcbiAgICAgICAgLy8gQWxsb3cgYWxsIGFjdGlvbnMgd2l0aGluIHRoZSBNSVNSQSBQbGF0Zm9ybSBzY29wZVxyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIHNpZDogJ0FsbG93TWlzcmFQbGF0Zm9ybUFjdGlvbnMnLFxyXG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgYWN0aW9uczogWycqJ10sXHJcbiAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgYGFybjphd3M6ZHluYW1vZGI6JHtyZWdpb259OiR7YWNjb3VudElkfTp0YWJsZS9taXNyYS1wbGF0Zm9ybS0qYCxcclxuICAgICAgICAgICAgYGFybjphd3M6czM6OjptaXNyYS1wbGF0Zm9ybS0qYCxcclxuICAgICAgICAgICAgYGFybjphd3M6czM6OjptaXNyYS1wbGF0Zm9ybS0qLypgLFxyXG4gICAgICAgICAgICBgYXJuOmF3czpzZWNyZXRzbWFuYWdlcjoke3JlZ2lvbn06JHthY2NvdW50SWR9OnNlY3JldDptaXNyYS1wbGF0Zm9ybS8qYCxcclxuICAgICAgICAgICAgYGFybjphd3M6a21zOiR7cmVnaW9ufToke2FjY291bnRJZH06a2V5LypgLFxyXG4gICAgICAgICAgICBgYXJuOmF3czpjb2duaXRvLWlkcDoke3JlZ2lvbn06JHthY2NvdW50SWR9OnVzZXJwb29sLypgLFxyXG4gICAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7cmVnaW9ufToke2FjY291bnRJZH06bG9nLWdyb3VwOi9hd3MvbGFtYmRhL21pc3JhLXBsYXRmb3JtLSpgLFxyXG4gICAgICAgICAgICBgYXJuOmF3czpsb2dzOiR7cmVnaW9ufToke2FjY291bnRJZH06bG9nLWdyb3VwOi9taXNyYS1wbGF0Zm9ybS8ke2Vudmlyb25tZW50fS8qYCxcclxuICAgICAgICAgICAgYGFybjphd3M6Y2xvdWR3YXRjaDoke3JlZ2lvbn06JHthY2NvdW50SWR9Om1ldHJpYy9NSVNSQS9QbGF0Zm9ybS8qYCxcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgLy8gRGVueSBkYW5nZXJvdXMgYWN0aW9uc1xyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIHNpZDogJ0RlbnlEYW5nZXJvdXNBY3Rpb25zJyxcclxuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5ERU5ZLFxyXG4gICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAnaWFtOionLFxyXG4gICAgICAgICAgICAnb3JnYW5pemF0aW9uczoqJyxcclxuICAgICAgICAgICAgJ2FjY291bnQ6KicsXHJcbiAgICAgICAgICAgICdhd3MtcG9ydGFsOionLFxyXG4gICAgICAgICAgICAnYnVkZ2V0czoqJyxcclxuICAgICAgICAgICAgJ2NvbmZpZzoqJyxcclxuICAgICAgICAgICAgJ2RpcmVjdGNvbm5lY3Q6KicsXHJcbiAgICAgICAgICAgICdhd3MtbWFya2V0cGxhY2U6KicsXHJcbiAgICAgICAgICAgICdzdXBwb3J0OionLFxyXG4gICAgICAgICAgICAndHJ1c3RlZGFkdmlzb3I6KicsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbJyonXSxcclxuICAgICAgICB9KSxcclxuICAgICAgICAvLyBEZW55IGFjY2VzcyB0byBvdGhlciBlbnZpcm9ubWVudHMnIHJlc291cmNlc1xyXG4gICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgIHNpZDogJ0RlbnlPdGhlckVudmlyb25tZW50cycsXHJcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuREVOWSxcclxuICAgICAgICAgIGFjdGlvbnM6IFsnKiddLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgIGBhcm46YXdzOmR5bmFtb2RiOiR7cmVnaW9ufToke2FjY291bnRJZH06dGFibGUvbWlzcmEtcGxhdGZvcm0tKmAsXHJcbiAgICAgICAgICAgIGBhcm46YXdzOnMzOjo6bWlzcmEtcGxhdGZvcm0tKmAsXHJcbiAgICAgICAgICAgIGBhcm46YXdzOnNlY3JldHNtYW5hZ2VyOiR7cmVnaW9ufToke2FjY291bnRJZH06c2VjcmV0Om1pc3JhLXBsYXRmb3JtLypgLFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgICAgU3RyaW5nTm90RXF1YWxzOiB7XHJcbiAgICAgICAgICAgICAgJ2F3czpSZXF1ZXN0ZWRSZWdpb24nOiByZWdpb24sXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICBdLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIHBlcm1pc3Npb25Cb3VuZGFyeTtcclxuICB9XHJcbn0iXX0=