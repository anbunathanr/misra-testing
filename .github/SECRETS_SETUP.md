# GitHub Secrets Configuration Guide

This document describes all the secrets required for the CI/CD pipeline to function properly.

## Required Secrets

### AWS Credentials (Per Environment)

#### Development Environment
- `AWS_ACCESS_KEY_ID_DEV` - AWS Access Key ID for development account
- `AWS_SECRET_ACCESS_KEY_DEV` - AWS Secret Access Key for development account
- `AWS_ROLE_ARN_DEV` - IAM Role ARN for development deployments (optional, for role assumption)
- `CLOUDFRONT_DISTRIBUTION_ID_DEV` - CloudFront distribution ID for dev frontend
- `API_URL_DEV` - API Gateway URL for development (e.g., https://api-dev.misra-platform.com)
- `USER_POOL_ID_DEV` - Cognito User Pool ID for development
- `USER_POOL_CLIENT_ID_DEV` - Cognito User Pool Client ID for development

#### Staging Environment
- `AWS_ACCESS_KEY_ID_STAGING` - AWS Access Key ID for staging account
- `AWS_SECRET_ACCESS_KEY_STAGING` - AWS Secret Access Key for staging account
- `AWS_ROLE_ARN_STAGING` - IAM Role ARN for staging deployments (optional)
- `CLOUDFRONT_DISTRIBUTION_ID_STAGING` - CloudFront distribution ID for staging frontend
- `API_URL_STAGING` - API Gateway URL for staging
- `USER_POOL_ID_STAGING` - Cognito User Pool ID for staging
- `USER_POOL_CLIENT_ID_STAGING` - Cognito User Pool Client ID for staging

#### Production Environment
- `AWS_ACCESS_KEY_ID_PROD` - AWS Access Key ID for production account
- `AWS_SECRET_ACCESS_KEY_PROD` - AWS Secret Access Key for production account
- `AWS_ROLE_ARN_PROD` - IAM Role ARN for production deployments (optional)
- `CLOUDFRONT_DISTRIBUTION_ID_PROD` - CloudFront distribution ID for production frontend
- `API_URL_PROD` - API Gateway URL for production
- `USER_POOL_ID_PROD` - Cognito User Pool ID for production
- `USER_POOL_CLIENT_ID_PROD` - Cognito User Pool Client ID for production

### Shared Secrets
- `AWS_ACCOUNT_ID` - AWS Account ID (used for S3 bucket naming)
- `SLACK_WEBHOOK_URL` - Slack webhook URL for deployment notifications
- `SNYK_TOKEN` - Snyk API token for security scanning (optional)
- `EMAIL_USERNAME` - SMTP username for email notifications
- `EMAIL_PASSWORD` - SMTP password for email notifications
- `ALERT_EMAIL` - Email address to receive deployment notifications

## Setting Up Secrets

### 1. Navigate to Repository Settings
Go to your GitHub repository → Settings → Secrets and variables → Actions

### 2. Add Repository Secrets
Click "New repository secret" and add each secret listed above.

### 3. AWS IAM Setup

#### Create IAM User for CI/CD
```bash
# Create IAM user for GitHub Actions
aws iam create-user --user-name github-actions-misra-platform

# Attach necessary policies
aws iam attach-user-policy \
  --user-name github-actions-misra-platform \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess

# Create access keys
aws iam create-access-key --user-name github-actions-misra-platform
```

#### Create IAM Role for Deployment (Recommended)
```bash
# Create trust policy for GitHub OIDC
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
        }
      }
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name GitHubActionsDeploymentRole \
  --assume-role-policy-document file://trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name GitHubActionsDeploymentRole \
  --policy-arn arn:aws:iam::aws:policy/PowerUserAccess
```

### 4. Slack Webhook Setup

1. Go to your Slack workspace
2. Navigate to Apps → Incoming Webhooks
3. Click "Add to Slack"
4. Select the channel for notifications
5. Copy the webhook URL and add it as `SLACK_WEBHOOK_URL` secret

### 5. Email Notification Setup

For Gmail SMTP:
1. Enable 2-factor authentication on your Google account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use your Gmail address as `EMAIL_USERNAME`
4. Use the generated app password as `EMAIL_PASSWORD`

### 6. Snyk Security Scanning (Optional)

1. Sign up at https://snyk.io
2. Go to Account Settings → API Token
3. Copy the token and add it as `SNYK_TOKEN` secret

## Environment-Specific Configuration

### Development
- Deploys automatically on push to `develop` branch
- No manual approval required
- Runs integration tests after deployment

### Staging
- Deploys automatically on push to `staging` branch
- No manual approval required
- Runs full E2E test suite after deployment

### Production
- Deploys automatically on push to `main` branch
- **Requires manual approval** (configured in GitHub Environment settings)
- Creates backup before deployment
- Runs smoke tests after deployment
- Sends email and Slack notifications

## GitHub Environment Protection Rules

### Setting Up Environment Protection

1. Go to Repository Settings → Environments
2. Create three environments: `development`, `staging`, `production`

#### Development Environment
- No protection rules needed
- URL: https://dev.misra-platform.com

#### Staging Environment
- Optional: Require reviewers (1 reviewer)
- URL: https://staging.misra-platform.com

#### Production Environment
- **Required reviewers**: Add 1-2 reviewers
- **Wait timer**: Optional 5-minute wait before deployment
- **Deployment branches**: Only `main` branch
- URL: https://misra-platform.com

## Verifying Secrets

After adding all secrets, verify they are set correctly:

```bash
# This will be visible in GitHub Actions logs (secrets are masked)
echo "Checking AWS credentials..."
aws sts get-caller-identity

echo "Checking S3 access..."
aws s3 ls

echo "Checking CloudFront access..."
aws cloudfront list-distributions
```

## Security Best Practices

1. **Use IAM Roles Instead of Access Keys**: Prefer role assumption over long-lived access keys
2. **Rotate Credentials Regularly**: Rotate AWS access keys every 90 days
3. **Least Privilege**: Grant only the minimum permissions required
4. **Separate Accounts**: Use separate AWS accounts for dev/staging/production
5. **Audit Logs**: Enable CloudTrail to track all API calls
6. **Secret Scanning**: Enable GitHub secret scanning to detect leaked credentials

## Troubleshooting

### Deployment Fails with "Access Denied"
- Verify AWS credentials are correct
- Check IAM permissions for the user/role
- Ensure the role trust policy allows GitHub Actions

### CloudFront Invalidation Fails
- Verify `CLOUDFRONT_DISTRIBUTION_ID` is correct
- Check IAM permissions include `cloudfront:CreateInvalidation`

### Slack Notifications Not Received
- Verify `SLACK_WEBHOOK_URL` is correct
- Test the webhook URL manually with curl
- Check Slack app permissions

### Email Notifications Not Sent
- Verify SMTP credentials are correct
- For Gmail, ensure App Password is used (not regular password)
- Check firewall rules allow SMTP traffic

## Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [CDK Deployment Guide](https://docs.aws.amazon.com/cdk/v2/guide/home.html)
