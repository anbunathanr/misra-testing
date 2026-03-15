# 🔄 AWS Account Switch Guide

Complete guide for switching to a new AWS account and redeploying the AIBTS Platform.

**Estimated Time**: 20-30 minutes  
**Difficulty**: Easy

---

## 📋 What You Need

- ✅ New AWS account credentials (Access Key ID + Secret Access Key)
- ✅ New AWS account ID
- ✅ Existing project code (already on your machine)
- ✅ Hugging Face API key (can reuse existing or create new)

---

## 🎯 Step-by-Step Migration

### Step 1: Update AWS CLI Configuration (5 minutes)

#### Option A: Reconfigure AWS CLI (Recommended)

```bash
# Reconfigure with new credentials
aws configure

# Enter when prompted:
# AWS Access Key ID: [your-new-access-key]
# AWS Secret Access Key: [your-new-secret-key]
# Default region name: us-east-1
# Default output format: json
```

#### Option B: Use AWS CLI Profiles (Advanced)

```bash
# Create a new profile for the new account
aws configure --profile new-account

# Set the new profile as default
export AWS_PROFILE=new-account  # Linux/Mac
$env:AWS_PROFILE="new-account"  # Windows PowerShell
```

### Step 2: Verify New AWS Account (2 minutes)

```bash
# Check your new AWS identity
aws sts get-caller-identity

# You should see your NEW account ID
# Save this account ID - you'll need it!
```

**Expected Output:**
```json
{
    "UserId": "AIDAXXXXXXXXXXXXXXXXX",
    "Account": "123456789012",  # Your NEW account ID
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### Step 3: Clean Up Old Deployment Artifacts (2 minutes)

```bash
# Navigate to backend directory
cd packages/backend

# Remove old CDK outputs
rm -rf cdk.out
rm -f outputs.json
rm -f deployment-outputs.txt

# Remove old CDK context (contains old account info)
rm -f cdk.context.json
```

**Windows PowerShell:**
```powershell
cd packages\backend
Remove-Item -Recurse -Force cdk.out -ErrorAction SilentlyContinue
Remove-Item outputs.json -ErrorAction SilentlyContinue
Remove-Item deployment-outputs.txt -ErrorAction SilentlyContinue
Remove-Item cdk.context.json -ErrorAction SilentlyContinue
```

### Step 4: Update Environment Variables (2 minutes)

Get your new AWS account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

Set environment variables with your NEW account ID:

**Windows PowerShell:**
```powershell
$env:CDK_DEFAULT_ACCOUNT = "YOUR_NEW_ACCOUNT_ID"
$env:CDK_DEFAULT_REGION = "us-east-1"
```

**Linux/Mac:**
```bash
export CDK_DEFAULT_ACCOUNT="YOUR_NEW_ACCOUNT_ID"
export CDK_DEFAULT_REGION="us-east-1"
```

### Step 5: Bootstrap CDK in New Account (3 minutes)

```bash
# Make sure you're in the backend directory
cd packages/backend

# Bootstrap CDK for the new account
cdk bootstrap aws://YOUR_NEW_ACCOUNT_ID/us-east-1
```

**Wait for completion** (2-3 minutes). You should see:
```
✅  Environment aws://YOUR_NEW_ACCOUNT_ID/us-east-1 bootstrapped
```

### Step 6: Store Hugging Face API Key in New Account (2 minutes)

```bash
# Create secret in the new account
aws secretsmanager create-secret \
  --name aibts/huggingface-api-key \
  --description "Hugging Face API key for AIBTS AI test generation" \
  --secret-string "YOUR_HUGGINGFACE_TOKEN" \
  --region us-east-1
```

**Note**: You can reuse your existing Hugging Face token or create a new one at https://huggingface.co/settings/tokens

 Step 4: Update Environment Variables (2 minutes)

Get your new AWS account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

Set environment variables with your NEW account ID:

**Windows PowerShell:**
```powershell
$env:CDK_DEFAULT_ACCOUNT = "YOUR_NEW_ACCOUNT_ID"
$env:CDK_DEFAULT_REGION = "us-east-1"
```

**Linux/Mac:**
```bash
export CDK_DEFAULT_ACCOUNT="YOUR_NEW_ACCOUNT_ID"
export CDK_DEFAULT_REGION="us-east-1"
```

### Step 5: Bootstrap CDK in New Account (3 minutes)

```bash
# Make sure you're in the backend directory
cd packages/backend

# Bootstrap CDK for the new account
cdk bootstrap aws://YOUR_NEW_ACCOUNT_ID/us-east-1
```

**Wait for completion** (2-3 minutes). You should see:
```
✅  Environment aws://YOUR_NEW_ACCOUNT_ID/us-east-1 bootstrapped
```

### Step 6: Store Hugging Face API Key in New Account (2 minutes)

```bash
# Create secret in the new account
aws secretsmanager create-secret \
  --name aibts/huggingface-api-key \
  --description "Hugging Face API key for AIBTS AI test generation" \
  --secret-string "YOUR_HUGGINGFACE_TOKEN" \
  --region us-east-1
```

**Note**: You can reuse your existing Hugging Face token or create a new one at https://huggingface.co/settings/tokens