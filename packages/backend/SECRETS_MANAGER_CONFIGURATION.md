# AWS Secrets Manager Configuration

## Overview

The MISRA Compliance Platform uses AWS Secrets Manager to securely store and manage sensitive configuration data including JWT secrets, OTP keys, API keys, and database encryption keys. All secrets are encrypted using AWS KMS and follow security best practices.

## Secrets Structure

### 1. JWT Secret (`misra-platform/jwt-secret-{environment}`)

**Purpose**: JWT token signing and verification for API authentication

**Structure**:
```json
{
  "secret": "64-character-random-string",
  "algorithm": "HS256",
  "issuer": "misra-platform-{environment}",
  "audience": "misra-platform-users-{environment}",
  "accessTokenExpiry": "1h",
  "refreshTokenExpiry": "30d"
}
```

**Usage**:
- Lambda Authorizer function for JWT validation
- Authentication Lambda functions for token generation
- Automatic rotation every 90 days in production

### 2. OTP/TOTP Secrets (`misra-platform/otp-secrets-{environment}`)

**Purpose**: Configuration and master keys for TOTP MFA and autonomous workflow

**Structure**:
```json
{
  "masterKey": "32-character-encryption-key",
  "totpConfig": {
    "issuer": "MISRA Platform {ENVIRONMENT}",
    "algorithm": "SHA1",
    "digits": 6,
    "period": 30,
    "window": 2
  },
  "backupCodesConfig": {
    "length": 8,
    "count": 10,
    "charset": "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  }
}
```

**Usage**:
- OTP Secrets Service for TOTP secret encryption/decryption
- Cognito TOTP Service for autonomous MFA workflow
- User-specific TOTP secrets stored separately

### 3. API Keys (`misra-platform/api-keys-{environment}`)

**Purpose**: External service API keys and integration credentials

**Structure**:
```json
{
  "openai": "sk-...",
  "monitoring": "api-key-...",
  "placeholder": "replace-with-actual-keys"
}
```

**Usage**:
- AI-powered analysis features (OpenAI integration)
- External monitoring and alerting services
- Third-party integrations

### 4. Database Secrets (`misra-platform/database-secrets-{environment}`)

**Purpose**: Database encryption keys and security configuration

**Structure**:
```json
{
  "fieldEncryptionKey": "32-character-field-encryption-key",
  "passwordSalt": "16-character-password-salt"
}
```

**Usage**:
- Field-level encryption for sensitive data in DynamoDB
- Password hashing and security operations
- Data protection compliance

## User-Specific TOTP Secrets

### Structure (`misra-platform/otp-secrets-{environment}/users/{userId}`)

**Purpose**: Individual user TOTP secrets for autonomous MFA

**Encrypted Structure**:
```json
{
  "encrypted": "aes-256-cbc-encrypted-data",
  "algorithm": "aes-256-cbc",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Decrypted Structure**:
```json
{
  "secret": "base32-totp-secret",
  "backupCodes": ["CODE1", "CODE2", ...],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastUsed": "2024-01-01T00:00:00.000Z",
  "usageCount": 42
}
```

## Security Features

### 1. KMS Encryption
- All secrets encrypted with customer-managed KMS key
- Key rotation enabled for production environments
- Separate encryption context for each secret type

### 2. IAM Permissions
- Least privilege access for Lambda functions
- Conditional access based on service context
- Separate permissions for read/write operations

### 3. Automatic Rotation
- JWT secrets rotate every 90 days in production
- OTP master keys can be rotated manually
- API keys rotation handled externally

### 4. Audit Logging
- All secret access logged to CloudWatch
- CloudTrail integration for compliance
- Structured logging with correlation IDs

## Environment Configuration

### Development Environment
- Secrets have shorter retention periods
- Less restrictive access for debugging
- Placeholder values for external services

### Staging Environment
- Production-like security configuration
- Real API keys for integration testing
- Automated testing with mock secrets

### Production Environment
- Maximum security configuration
- Automatic rotation enabled
- Real API keys and credentials
- Comprehensive monitoring and alerting

## Lambda Function Access

### Environment Variables
Each Lambda function receives appropriate secret names:

```typescript
{
  JWT_SECRET_NAME: 'misra-platform/jwt-secret-{environment}',
  OTP_SECRET_NAME: 'misra-platform/otp-secrets-{environment}',
  API_KEYS_SECRET_NAME: 'misra-platform/api-keys-{environment}',
  DATABASE_SECRET_NAME: 'misra-platform/database-secrets-{environment}'
}
```

### IAM Policies
Functions granted specific permissions:

```json
{
  "Effect": "Allow",
  "Action": [
    "secretsmanager:GetSecretValue",
    "secretsmanager:DescribeSecret"
  ],
  "Resource": [
    "arn:aws:secretsmanager:region:account:secret:misra-platform/*"
  ]
}
```

### KMS Permissions
Functions can decrypt secrets:

```json
{
  "Effect": "Allow",
  "Action": [
    "kms:Decrypt",
    "kms:DescribeKey"
  ],
  "Resource": "arn:aws:kms:region:account:key/key-id",
  "Condition": {
    "StringEquals": {
      "kms:ViaService": "secretsmanager.region.amazonaws.com"
    }
  }
}
```

## Usage Examples

### 1. JWT Service Integration

```typescript
import { JWTService } from '../services/auth/jwt-service';

const jwtService = new JWTService();
const token = await jwtService.generateToken(payload);
```

### 2. OTP Secrets Service Integration

```typescript
import { OTPSecretsService } from '../services/auth/otp-secrets-service';

const otpService = new OTPSecretsService();
await otpService.initialize();
const totpCode = await otpService.generateTOTPCode(userId);
```

### 3. Manual Secret Retrieval

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });
const response = await client.send(new GetSecretValueCommand({
  SecretId: process.env.JWT_SECRET_NAME
}));
const secret = JSON.parse(response.SecretString!);
```

## Deployment Configuration

### CDK Parameters
Secrets can be configured via CDK parameters:

```bash
cdk deploy --parameters OtpMasterKey=your-master-key \
           --parameters OpenAiApiKey=sk-your-key \
           --parameters MonitoringApiKey=your-monitoring-key
```

### Environment-Specific Values
Different values per environment:

- **Development**: Placeholder/test values
- **Staging**: Limited real credentials
- **Production**: Full production credentials

## Monitoring and Alerting

### CloudWatch Metrics
- Secret access frequency
- Failed secret retrievals
- Rotation status and timing

### CloudWatch Alarms
- Excessive secret access attempts
- Failed KMS decryption operations
- Rotation failures

### Security Alerts
- Unauthorized access attempts
- Unusual access patterns
- Secret modification events

## Troubleshooting

### Common Issues

1. **Secret Not Found**
   - Verify secret name matches environment
   - Check IAM permissions
   - Ensure secret exists in correct region

2. **KMS Decryption Failed**
   - Verify KMS key permissions
   - Check service context conditions
   - Ensure key is not disabled

3. **Access Denied**
   - Review IAM policies
   - Check resource ARN patterns
   - Verify Lambda execution role

### Debug Commands

```bash
# List secrets
aws secretsmanager list-secrets --region us-east-1

# Get secret value (requires permissions)
aws secretsmanager get-secret-value --secret-id misra-platform/jwt-secret-dev

# Describe secret metadata
aws secretsmanager describe-secret --secret-id misra-platform/jwt-secret-dev
```

## Best Practices

1. **Never log secret values** - Use structured logging without sensitive data
2. **Use correlation IDs** - Track secret access across services
3. **Implement caching** - Cache secrets with appropriate TTL
4. **Monitor access patterns** - Alert on unusual secret access
5. **Regular rotation** - Rotate secrets according to security policy
6. **Least privilege** - Grant minimal required permissions
7. **Environment separation** - Use different secrets per environment
8. **Backup and recovery** - Ensure secrets can be recovered if needed

## Compliance

### Security Standards
- Encryption at rest and in transit
- Access logging and monitoring
- Regular security audits
- Compliance with AWS security best practices

### Data Protection
- Field-level encryption for PII
- Secure key management
- Data retention policies
- Right to be forgotten compliance

This configuration ensures secure, scalable, and maintainable secret management for the MISRA Compliance Platform while supporting the autonomous workflow requirements.