# IAM Roles Documentation - MISRA Platform

## Overview

This document describes the IAM roles implemented for the MISRA Compliance Platform, following the principle of least privilege access. Each role is designed to grant only the minimum permissions required for specific Lambda function types to operate correctly.

## Architecture Principles

### 1. Least Privilege Access
- Each role grants only the minimum permissions required for its specific function type
- Permissions are scoped to specific resources where possible
- Cross-service permissions are limited to necessary integrations only

### 2. Separation of Concerns
- Different Lambda function types have separate, specialized roles
- Authentication functions cannot access analysis data
- File functions cannot access authentication secrets
- Monitoring functions have read-only access

### 3. Environment-Specific Security
- Production environments have additional permission boundaries
- Development environments have relaxed logging retention
- Resource access is scoped to the specific environment

### 4. Defense in Depth
- Multiple layers of security controls
- Resource-level permissions combined with service-level restrictions
- KMS encryption with service-specific conditions

## IAM Roles

### 1. Base Lambda Role (`BaseLambdaRole`)

**Purpose**: Foundation role providing minimal CloudWatch permissions for all Lambda functions.

**Permissions**:
- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
  - Scoped to: `/aws/lambda/*` and `/misra-platform/{environment}/*`
- `cloudwatch:PutMetricData`
  - Scoped to: `MISRA/Platform` namespace only

**Security Features**:
- No data access permissions
- Logging restricted to platform-specific log groups
- Custom metrics restricted to platform namespace

### 2. Authorizer Role (`AuthorizerRole`)

**Purpose**: JWT token validation and user authorization for API Gateway requests.

**Permissions**:
- **Secrets Manager**: Read access to JWT secret only
- **DynamoDB**: Read access to Users table with attribute restrictions
- **KMS**: Decrypt permissions scoped to Secrets Manager service

**Specific Restrictions**:
- DynamoDB access limited to specific attributes: `userId`, `email`, `status`, `role`, `organizationId`, `lastLoginAt`, `createdAt`, `updatedAt`
- Cannot write to any DynamoDB tables
- Cannot access OTP secrets or API keys
- KMS access only via Secrets Manager service

**Security Rationale**:
- Authorizer runs on every API request, so minimal permissions reduce attack surface
- Read-only access prevents data modification during authorization
- Attribute restrictions prevent access to sensitive user data

### 3. Authentication Function Role (`AuthFunctionRole`)

**Purpose**: User registration, login, OTP verification, and Cognito operations.

**Permissions**:
- **Cognito**: Full user management within specific user pool
- **DynamoDB**: Read/write access to Users table
- **Secrets Manager**: Read access to JWT and OTP secrets
- **KMS**: Decrypt permissions for authentication secrets

**Specific Operations**:
- `cognito-idp:AdminCreateUser`, `AdminSetUserPassword`, `AdminSetUserMFAPreference`
- `cognito-idp:AdminInitiateAuth`, `AdminRespondToAuthChallenge`
- `cognito-idp:AssociateSoftwareToken`, `VerifySoftwareToken`
- `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query` on Users table

**Security Features**:
- Cognito operations scoped to specific user pool ARN
- Cannot access file data or analysis results
- Cannot access external API keys

### 4. File Function Role (`FileFunctionRole`)

**Purpose**: File upload, download, metadata management, and sample file operations.

**Permissions**:
- **S3**: Full object operations within platform bucket
- **DynamoDB**: Read/write access to File Metadata and Sample Files tables
- **DynamoDB**: Read access to Users table for validation
- **KMS**: Encrypt/decrypt permissions for S3 and DynamoDB

**Specific Operations**:
- `s3:GetObject`, `PutObject`, `DeleteObject`, `GetObjectVersion`, `PutObjectAcl`
- `s3:ListBucket`, `GetBucketLocation`, `GetBucketVersioning`
- Full CRUD operations on File Metadata table
- Read-only access to Sample Files table
- Read-only access to Users table for user validation

**Security Features**:
- S3 access limited to platform bucket only
- Cannot access authentication secrets or analysis API keys
- KMS access scoped to S3 and DynamoDB services

### 5. Analysis Function Role (`AnalysisFunctionRole`)

**Purpose**: MISRA code analysis, result storage, and progress tracking.

**Permissions**:
- **S3**: Read access to files for analysis
- **DynamoDB**: Read access to File Metadata, write access to Analysis Results and Progress tables
- **DynamoDB**: Read access to Users table for validation
- **Secrets Manager**: Read access to API keys for external services (OpenAI)
- **KMS**: Decrypt permissions for all required services

**Specific Operations**:
- `s3:GetObject`, `GetObjectVersion` for file analysis
- `dynamodb:GetItem`, `Query` on File Metadata table
- `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `Query` on Analysis Results table
- Full CRUD operations on Progress table for real-time updates
- Read access to external API keys for AI services

**Security Features**:
- Cannot modify file metadata or user data
- Cannot access authentication secrets
- S3 access is read-only for analysis purposes
- Progress table has TTL for automatic cleanup

### 6. Monitoring Role (`MonitoringRole`)

**Purpose**: Health checks, metrics collection, and system monitoring.

**Permissions**:
- **DynamoDB**: Read-only access to all tables for health checks
- **S3**: Read-only access to bucket for health validation
- **CloudWatch**: Metrics and logs access for monitoring
- **No Secrets Manager access**: Cannot access any secrets

**Specific Operations**:
- `dynamodb:DescribeTable`, `GetItem`, `Query`, `Scan` on all tables
- `s3:GetBucketLocation`, `ListBucket`, `GetObject` for health checks
- `cloudwatch:GetMetricStatistics`, `ListMetrics`, `PutMetricData`
- `logs:DescribeLogGroups`, `GetLogEvents`, `FilterLogEvents`

**Security Features**:
- Completely read-only access to data
- Cannot access any secrets or authentication data
- Cannot modify any resources
- Scoped to platform-specific CloudWatch resources

## Permission Boundaries

### Production Environment

In production, additional permission boundaries are applied to provide an extra layer of security:

**Allowed Actions**:
- All actions within MISRA Platform resource scope
- Actions on platform-specific DynamoDB tables, S3 buckets, secrets, etc.

**Denied Actions**:
- IAM operations (prevents privilege escalation)
- Organization and account management
- Billing and support operations
- Access to other environments' resources

**Resource Scoping**:
- All resources must be prefixed with `misra-platform-`
- Actions restricted to the specific AWS region
- Cross-environment access is explicitly denied

## Security Best Practices Implemented

### 1. Resource-Level Permissions
- All permissions specify exact resource ARNs where possible
- Wildcard permissions are avoided except where necessary
- Service-specific resource patterns are used

### 2. Condition-Based Access
- KMS access restricted by service (`kms:ViaService`)
- CloudWatch metrics restricted by namespace
- DynamoDB attribute-level restrictions where applicable

### 3. Temporal Security
- Progress table has TTL for automatic data cleanup
- Log retention varies by environment (shorter for dev/staging)
- Secret rotation enabled for production JWT secrets

### 4. Cross-Service Security
- Each role can only access secrets relevant to its function
- File functions cannot access authentication data
- Analysis functions cannot modify user or file metadata

### 5. Monitoring and Auditing
- All roles have CloudWatch logging permissions
- Custom metrics are scoped to platform namespace
- Monitoring role provides read-only system visibility

## Usage Guidelines

### For Lambda Function Development

1. **Use the appropriate role** for your function type:
   - Authentication operations → `AuthFunctionRole`
   - File operations → `FileFunctionRole`
   - Analysis operations → `AnalysisFunctionRole`
   - Monitoring/health checks → `MonitoringRole`

2. **Test permissions** in development environment first
3. **Follow the principle of least privilege** when requesting additional permissions
4. **Document any new permission requirements** with business justification

### For Infrastructure Updates

1. **Review role permissions** before adding new AWS services
2. **Update permission boundaries** when adding new resource types
3. **Test in non-production** environments first
4. **Document security implications** of any changes

### For Security Reviews

1. **Verify resource scoping** in all policy statements
2. **Check condition restrictions** are appropriate
3. **Validate cross-service access** is necessary and minimal
4. **Review permission boundaries** for completeness

## Compliance and Auditing

### AWS Config Rules
- Monitor IAM role changes
- Detect overly permissive policies
- Alert on permission boundary violations

### CloudTrail Integration
- All IAM operations are logged
- Role assumption events are tracked
- Permission usage is auditable

### Regular Reviews
- Quarterly permission reviews
- Annual security assessments
- Continuous monitoring of unused permissions

## Troubleshooting

### Common Permission Issues

1. **"Access Denied" errors**:
   - Check if the Lambda function is using the correct role
   - Verify resource ARNs match the environment
   - Ensure KMS permissions include the correct service condition

2. **Secrets Manager access issues**:
   - Verify the secret ARN is correct for the environment
   - Check KMS decrypt permissions include `secretsmanager.{region}.amazonaws.com`
   - Ensure the role has access to the specific secret

3. **DynamoDB access issues**:
   - Verify table names match the environment pattern
   - Check if GSI access is required and included
   - Ensure attribute restrictions don't block required fields

### Permission Testing

Use the AWS CLI to test permissions:

```bash
# Test DynamoDB access
aws dynamodb get-item --table-name misra-platform-users-dev --key '{"userId":{"S":"test"}}'

# Test S3 access
aws s3 ls s3://misra-platform-files-dev-123456789012/

# Test Secrets Manager access
aws secretsmanager get-secret-value --secret-id misra-platform/jwt-secret-dev
```

## Future Enhancements

### Planned Improvements

1. **Dynamic Permission Scaling**: Adjust permissions based on usage patterns
2. **Zero-Trust Architecture**: Implement additional verification layers
3. **Automated Permission Reviews**: Use AWS Access Analyzer for continuous optimization
4. **Cross-Account Access**: Prepare for multi-account deployment scenarios

### Security Roadmap

1. **Q1**: Implement AWS Config rules for automated compliance checking
2. **Q2**: Add AWS Access Analyzer integration for permission optimization
3. **Q3**: Implement dynamic permission boundaries based on function behavior
4. **Q4**: Add cross-account access patterns for enterprise deployment