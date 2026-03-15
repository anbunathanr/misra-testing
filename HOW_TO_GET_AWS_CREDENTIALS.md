# How to Get AWS Credentials (Access Key & Secret Access Key)

## Overview

You need AWS credentials to deploy the AIBTS platform. This guide shows you how to create and retrieve your AWS Access Key ID and Secret Access Key.

## Prerequisites

- AWS Account (if you don't have one, create at https://aws.amazon.com)
- Admin or IAM permissions to create access keys

---

## Option 1: Create New IAM User (Recommended for Development)

### Step 1: Sign in to AWS Console

1. Go to https://console.aws.amazon.com
2. Sign in with your AWS account credentials

### Step 2: Navigate to IAM

1. In the AWS Console search bar, type "IAM"
2. Click on "IAM" (Identity and Access Management)

### Step 3: Create New IAM User

1. In the left sidebar, click "Users"
2. Click "Create user" button
3. Enter username: `aibts-deployer` (or any name you prefer)
4. Click "Next"

### Step 4: Set Permissions

1. Select "Attach policies directly"
2. Search and select these policies:
   - `AdministratorAccess` (for full deployment access)
   - OR for minimal permissions, select:
     - `AWSLambda_FullAccess`
     - `AmazonAPIGatewayAdministrator`
     - `AmazonDynamoDBFullAccess`
     - `AmazonCognitoPowerUser`
     - `SecretsManagerReadWrite`
     - `CloudWatchLogsFullAccess`
     - `IAMFullAccess`
3. Click "Next"
4. Review and click "Create user"

### Step 5: Create Access Key

1. Click on the newly created user name
2. Go to "Security credentials" tab
3. Scroll down to "Access keys" section
4. Click "Create access key"
5. Select use case: "Command Line Interface (CLI)"
6. Check the confirmation box
7. Click "Next"
8. (Optional) Add description tag: "AIBTS Deployment"
9. Click "Create access key"

### Step 6: Save Your Credentials

**CRITICAL: This is your ONLY chance to see the Secret Access Key!**

You'll see:
```
Access key ID: AKIA...
Secret access key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Save these immediately:**

1. Click "Download .csv file" button
2. Store the CSV file in a secure location
3. Copy both values to a password manager
4. **Never share these credentials or commit them to Git!**

---

## Option 2: Use Existing IAM User

If you already have an IAM user but lost the secret key:

### You CANNOT retrieve the old secret key!

AWS does not allow retrieving secret access keys after creation. You must create a new one:

1. Go to IAM → Users
2. Click on your username
3. Go to "Security credentials" tab
4. In "Access keys" section:
   - If you have 2 keys already, delete an old one first (max 2 keys per user)
   - Click "Create access key"
5. Follow steps 5-6 from Option 1 above

---

## Option 3: Use AWS CLI to Get Current User Info

If you have AWS CLI configured but don't know which credentials are being used:

```bash
# Check current AWS identity
aws sts get-caller-identity

# This will show:
# - UserId
# - Account
# - Arn (which user/role is being used)
```

**Note:** This doesn't show your secret key. If you need the secret key, create a new access key using Option 1 or 2.

---

## Configure AWS CLI with Your Credentials

Once you have your Access Key ID and Secret Access Key:

### Windows (PowerShell)

```powershell
# Configure AWS CLI
aws configure

# You'll be prompted for:
AWS Access Key ID [None]: AKIA...
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/...
Default region name [None]: us-east-1
Default output format [None]: json
```

### Verify Configuration

```bash
# Test AWS credentials
aws sts get-caller-identity

# Expected output:
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/aibts-deployer"
}
```

---

## Store Credentials Securely

### Option A: AWS CLI Configuration Files (Recommended)

Credentials are stored in:
- Windows: `C:\Users\YourUsername\.aws\credentials`
- Linux/Mac: `~/.aws/credentials`

Format:
```ini
[default]
aws_access_key_id = AKIA...
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/...
```

### Option B: Environment Variables

```powershell
# Windows PowerShell
$env:AWS_ACCESS_KEY_ID="AKIA..."
$env:AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/..."
$env:AWS_DEFAULT_REGION="us-east-1"
```

```bash
# Linux/Mac
export AWS_ACCESS_KEY_ID="AKIA..."
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/..."
export AWS_DEFAULT_REGION="us-east-1"
```

---

## For GitHub Actions (CI/CD)

If you need to add credentials to GitHub for automated deployments:

### Step 1: Go to GitHub Repository Settings

1. Navigate to your GitHub repository
2. Click "Settings" tab
3. Click "Secrets and variables" → "Actions"

### Step 2: Add Secrets

1. Click "New repository secret"
2. Add first secret:
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: Your Access Key ID (AKIA...)
3. Click "Add secret"
4. Add second secret:
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: Your Secret Access Key
5. Click "Add secret"

**Note:** The `.github/workflows/ci.yml` file already references these secrets correctly.

---

## Security Best Practices

### DO:
✅ Store credentials in AWS CLI config files or environment variables
✅ Use IAM users with minimal required permissions
✅ Rotate access keys regularly (every 90 days)
✅ Enable MFA (Multi-Factor Authentication) on your AWS account
✅ Use different credentials for different environments (dev/prod)
✅ Store credentials in password managers

### DON'T:
❌ Commit credentials to Git repositories
❌ Share credentials via email or chat
❌ Use root account credentials
❌ Hardcode credentials in source code
❌ Store credentials in plain text files in project directories
❌ Use the same credentials across multiple projects

---

## Troubleshooting

### Issue: "Unable to locate credentials"

**Solution:**
```bash
# Check if AWS CLI is configured
aws configure list

# If not configured, run:
aws configure
```

### Issue: "Access Denied" errors

**Solution:**
1. Verify your IAM user has the required permissions
2. Check if the access key is active (not deleted/deactivated)
3. Ensure you're using the correct AWS region

### Issue: "Invalid security token"

**Solution:**
1. Your credentials might be expired or invalid
2. Create new access keys following Option 1 or 2 above
3. Update your AWS CLI configuration

### Issue: Lost Secret Access Key

**Solution:**
- You CANNOT retrieve it
- Create a new access key (see Option 2)
- Delete the old key if you have 2 keys already

---

## Quick Reference

### Create IAM User & Get Credentials
```
1. AWS Console → IAM → Users → Create user
2. Attach AdministratorAccess policy
3. Create user → Click username → Security credentials
4. Create access key → CLI → Create
5. Download CSV file immediately!
```

### Configure AWS CLI
```bash
aws configure
# Enter: Access Key ID, Secret Access Key, us-east-1, json
```

### Test Configuration
```bash
aws sts get-caller-identity
```

### Deploy AIBTS
```bash
cd packages/backend
cdk deploy MinimalStack
```

---

## What's Next?

After getting your AWS credentials:

1. ✅ Configure AWS CLI: `aws configure`
2. ✅ Test credentials: `aws sts get-caller-identity`
3. ✅ Get Hugging Face token: https://huggingface.co/settings/tokens
4. ✅ Store Hugging Face token in AWS Secrets Manager
5. ✅ Deploy backend: `cdk deploy MinimalStack`
6. ✅ Deploy frontend: `vercel --prod`

---

## Support

- AWS IAM Documentation: https://docs.aws.amazon.com/IAM/latest/UserGuide/
- AWS CLI Configuration: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS Security Best Practices: https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html

---

**Remember:** Your Secret Access Key is shown only once during creation. Save it immediately!

