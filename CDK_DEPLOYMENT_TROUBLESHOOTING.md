# CDK Deployment Troubleshooting Guide

## Problem
CDK deployment fails with error: `statement.freeze is not a function`

This is a known CDK internal error that can occur due to:
- CDK version incompatibility
- Corrupted node_modules
- Malformed IAM policy statements in the infrastructure code

## Solution 1: Search for Known CDK Issues

### Step 1: Search GitHub Issues
1. Go to: https://github.com/aws/aws-cdk/issues
2. Search for: `statement.freeze is not a function`
3. Look for:
   - Similar error reports
   - Workarounds or fixes
   - Version-specific issues

### Step 2: Check CDK Changelog
1. Visit: https://github.com/aws/aws-cdk/releases
2. Look for fixes related to IAM PolicyStatement
3. Check if upgrading to a newer version resolves the issue

### Step 3: Check Stack Overflow
Search: `aws cdk statement.freeze is not a function`

---

## Solution 2: Upgrade CDK to Latest Version

### Step 1: Check Current Version
```powershell
cd packages/backend
npm list aws-cdk-lib aws-cdk
```

### Step 2: Upgrade CDK Packages
```powershell
# Upgrade to latest stable version
npm install aws-cdk-lib@latest aws-cdk@latest --save

# Or upgrade to a specific version (e.g., 2.150.0)
npm install aws-cdk-lib@2.150.0 aws-cdk@2.150.0 --save
```

### Step 3: Rebuild and Test
```powershell
npm run build
cdk synth
```

### Step 4: If Successful, Deploy
```powershell
cdk deploy --require-approval never
```

---

## Solution 3: Clean Install (Nuclear Option)

### Step 1: Backup package.json
```powershell
Copy-Item package.json package.json.backup
```

### Step 2: Clean Everything
```powershell
cd packages/backend

# Remove node_modules
Remove-Item -Recurse -Force node_modules

# Remove package-lock.json
Remove-Item package-lock.json

# Remove CDK output
if (Test-Path cdk.out) {
    # Force kill any processes that might be locking files
    Remove-Item -Recurse -Force cdk.out -ErrorAction SilentlyContinue
}

# Clear npm cache
npm cache clean --force
```

### Step 3: Reinstall Dependencies
```powershell
npm install
```

### Step 4: Rebuild and Test
```powershell
npm run build
cdk synth
cdk deploy --require-approval never
```

---

## Solution 4: Deploy Incrementally (Recommended)

This approach helps identify which specific resource is causing the issue.

### Step 1: Create Minimal Stack

Create a new file: `packages/backend/src/infrastructure/minimal-stack.ts`

```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class MinimalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Just create the AI Usage Table
    const aiUsageTable = new dynamodb.Table(this, 'AIUsageTable', {
      tableName: 'aibts-ai-usage',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Add GSI
    aiUsageTable.addGlobalSecondaryIndex({
      indexName: 'projectId-timestamp-index',
      partitionKey: { name: 'projectId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    new cdk.CfnOutput(this, 'AIUsageTableName', {
      value: aiUsageTable.tableName,
      description: 'AI Usage Table Name',
    });
  }
}
```

### Step 2: Update app.ts to Use Minimal Stack

Edit `packages/backend/src/infrastructure/app.ts`:

```typescript
#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
// import { MisraPlatformStack } from './misra-platform-stack';
import { MinimalStack } from './minimal-stack';

const app = new cdk.App();

// Use minimal stack for testing
new MinimalStack(app, 'MinimalStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

// Original stack (commented out for now)
// new MisraPlatformStack(app, 'MisraPlatformStack', {
//   env: {
//     account: process.env.CDK_DEFAULT_ACCOUNT,
//     region: process.env.CDK_DEFAULT_REGION,
//   },
// });
```

### Step 3: Deploy Minimal Stack
```powershell
npm run build
cdk synth
cdk deploy MinimalStack --require-approval never
```

### Step 4: Gradually Add Resources

If minimal stack works, gradually add resources back:

1. Add Lambda function (without IAM policies)
2. Add IAM policies one by one
3. Add API Gateway routes
4. Continue until you find the problematic resource

### Step 5: Once Working, Switch Back

After identifying and fixing the issue, switch back to the full stack in `app.ts`.

---

## Solution 5: Manual Lambda Deployment (Workaround)

If CDK continues to fail, deploy Lambda functions manually using AWS CLI.

### Step 1: Package Lambda Function

```powershell
cd packages/backend

# Create deployment package
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$zipFile = "ai-test-generation-$timestamp.zip"

# Create a temporary directory for packaging
New-Item -ItemType Directory -Force -Path "dist"

# Copy source files
Copy-Item -Recurse -Force "src/*" "dist/"

# Install production dependencies in dist
cd dist
npm install --production
cd ..

# Create ZIP file
Compress-Archive -Path "dist/*" -DestinationPath $zipFile -Force

# Clean up
Remove-Item -Recurse -Force "dist"
```

### Step 2: Create IAM Role for Lambda

```powershell
# Create trust policy file
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@ | Out-File -FilePath trust-policy.json -Encoding utf8

# Create IAM role
aws iam create-role `
  --role-name aibts-ai-lambda-role `
  --assume-role-policy-document file://trust-policy.json

# Attach basic Lambda execution policy
aws iam attach-role-policy `
  --role-name aibts-ai-lambda-role `
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

# Create custom policy for DynamoDB and other resources
@"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:*:*:table/aibts-ai-usage",
        "arn:aws:dynamodb:*:*:table/aibts-test-cases"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:misra-platform-jwt-secret-*"
    }
  ]
}
"@ | Out-File -FilePath lambda-policy.json -Encoding utf8

# Create and attach custom policy
aws iam create-policy `
  --policy-name aibts-ai-lambda-policy `
  --policy-document file://lambda-policy.json

# Get your AWS account ID
$accountId = aws sts get-caller-identity --query Account --output text

# Attach custom policy
aws iam attach-role-policy `
  --role-name aibts-ai-lambda-role `
  --policy-arn "arn:aws:iam::${accountId}:policy/aibts-ai-lambda-policy"
```

### Step 3: Create Lambda Functions

```powershell
# Wait for role to propagate
Start-Sleep -Seconds 10

# Get role ARN
$roleArn = aws iam get-role --role-name aibts-ai-lambda-role --query 'Role.Arn' --output text

# Create AI Analyze Function
aws lambda create-function `
  --function-name aibts-ai-analyze `
  --runtime nodejs20.x `
  --role $roleArn `
  --handler functions/ai-test-generation/analyze.handler `
  --zip-file fileb://$zipFile `
  --timeout 300 `
  --memory-size 2048

# Create AI Generate Function
aws lambda create-function `
  --function-name aibts-ai-generate `
  --runtime nodejs20.x `
  --role $roleArn `
  --handler functions/ai-test-generation/generate.handler `
  --zip-file fileb://$zipFile `
  --timeout 120 `
  --memory-size 1024 `
  --environment "Variables={AI_USAGE_TABLE=aibts-ai-usage,TEST_CASES_TABLE_NAME=aibts-test-cases,OPENAI_API_KEY=$env:OPENAI_API_KEY}"

# Create AI Batch Function
aws lambda create-function `
  --function-name aibts-ai-batch `
  --runtime nodejs20.x `
  --role $roleArn `
  --handler functions/ai-test-generation/batch.handler `
  --zip-file fileb://$zipFile `
  --timeout 900 `
  --memory-size 2048 `
  --environment "Variables={AI_USAGE_TABLE=aibts-ai-usage,TEST_CASES_TABLE_NAME=aibts-test-cases,OPENAI_API_KEY=$env:OPENAI_API_KEY}"

# Create AI Usage Stats Function
aws lambda create-function `
  --function-name aibts-ai-usage `
  --runtime nodejs20.x `
  --role $roleArn `
  --handler functions/ai-test-generation/get-usage.handler `
  --zip-file fileb://$zipFile `
  --timeout 30 `
  --memory-size 256 `
  --environment "Variables={AI_USAGE_TABLE=aibts-ai-usage,JWT_SECRET_NAME=misra-platform-jwt-secret}"
```

### Step 4: Add Lambda Permissions for API Gateway

```powershell
# Get API Gateway ID (from existing deployment)
$apiId = aws apigatewayv2 get-apis --query "Items[?Name=='misra-platform-api'].ApiId" --output text

# Add permissions for each Lambda
aws lambda add-permission `
  --function-name aibts-ai-analyze `
  --statement-id apigateway-invoke `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:*:*:${apiId}/*"

aws lambda add-permission `
  --function-name aibts-ai-generate `
  --statement-id apigateway-invoke `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:*:*:${apiId}/*"

aws lambda add-permission `
  --function-name aibts-ai-batch `
  --statement-id apigateway-invoke `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:*:*:${apiId}/*"

aws lambda add-permission `
  --function-name aibts-ai-usage `
  --statement-id apigateway-invoke `
  --action lambda:InvokeFunction `
  --principal apigateway.amazonaws.com `
  --source-arn "arn:aws:execute-api:*:*:${apiId}/*"
```

### Step 5: Create API Gateway Routes

You'll need to manually create routes in API Gateway console or use AWS CLI:

```powershell
# Create integration for analyze
$analyzeIntegration = aws apigatewayv2 create-integration `
  --api-id $apiId `
  --integration-type AWS_PROXY `
  --integration-uri "arn:aws:lambda:us-east-1:${accountId}:function:aibts-ai-analyze" `
  --payload-format-version 2.0 `
  --query 'IntegrationId' --output text

# Create route for analyze
aws apigatewayv2 create-route `
  --api-id $apiId `
  --route-key "POST /ai-test-generation/analyze" `
  --target "integrations/$analyzeIntegration"

# Repeat for other functions...
```

---

## Solution 6: Check for Specific Issues

### Check 1: Verify No Circular Dependencies

```powershell
cd packages/backend
npm ls
```

Look for any `UNMET PEER DEPENDENCY` or circular dependency warnings.

### Check 2: Check TypeScript Compilation

```powershell
npx tsc --noEmit
```

This checks for TypeScript errors without emitting files.

### Check 3: Validate CDK App

```powershell
cdk doctor
```

This checks your CDK environment for common issues.

---

## Recommended Approach

1. **Start with Solution 3** (Clean Install) - Most likely to fix the issue
2. **If that fails, try Solution 4** (Incremental Deployment) - Helps identify the problem
3. **If CDK is fundamentally broken, use Solution 5** (Manual Deployment) - Workaround

---

## After Successful Deployment

Once deployed successfully, uncomment the AI test generation functions in the main stack:

1. Edit `packages/backend/src/infrastructure/misra-platform-stack.ts`
2. Uncomment the AI Lambda functions (lines ~653-710)
3. Uncomment the API Gateway routes (lines ~1245-1268)
4. Rebuild and deploy:
   ```powershell
   npm run build
   cdk deploy --require-approval never
   ```

---

## Testing After Deployment

```powershell
# Test the analyze endpoint
$apiUrl = aws apigatewayv2 get-apis --query "Items[?Name=='misra-platform-api'].ApiEndpoint" --output text

curl -X POST "$apiUrl/ai-test-generation/analyze" `
  -H "Content-Type: application/json" `
  -d '{"url": "https://example.com"}'
```
