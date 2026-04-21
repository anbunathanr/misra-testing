#!/bin/bash

# Deploy MISRA Platform to Staging Environment
set -e

echo "🚀 Deploying MISRA Platform to Staging Environment..."

# Validate required environment variables
if [ -z "$STAGING_DOMAIN" ]; then
  echo "❌ Error: STAGING_DOMAIN environment variable is required"
  exit 1
fi

if [ -z "$STAGING_CERTIFICATE_ARN" ]; then
  echo "❌ Error: STAGING_CERTIFICATE_ARN environment variable is required"
  exit 1
fi

# Set environment variables
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=${AWS_REGION:-us-east-1}

# Build Lambda functions
echo "📦 Building Lambda functions..."
npm run build:lambdas

# Deploy CDK stack
echo "🏗️  Deploying CDK stack..."
npx cdk deploy MisraPlatform-staging \
  --context environment=staging \
  --context stagingDomain=$STAGING_DOMAIN \
  --context stagingCertificateArn=$STAGING_CERTIFICATE_ARN \
  --require-approval never \
  --outputs-file cdk-outputs-staging.json

echo "✅ Staging deployment complete!"
echo "📋 Stack outputs saved to cdk-outputs-staging.json"

# Display important outputs
echo ""
echo "🔗 Important URLs and IDs:"
cat cdk-outputs-staging.json | jq -r '
  to_entries[] | 
  select(.key | contains("ApiGatewayUrl") or contains("UserPoolId") or contains("UserPoolClientId")) |
  "\(.key): \(.value)"
'