#!/bin/bash

# Deploy MISRA Platform to Development Environment
set -e

echo "🚀 Deploying MISRA Platform to Development Environment..."

# Set environment variables
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=${AWS_REGION:-us-east-1}

# Build Lambda functions
echo "📦 Building Lambda functions..."
npm run build:lambdas

# Deploy CDK stack
echo "🏗️  Deploying CDK stack..."
npx cdk deploy MisraPlatform-dev \
  --context environment=dev \
  --require-approval never \
  --outputs-file cdk-outputs-dev.json

echo "✅ Development deployment complete!"
echo "📋 Stack outputs saved to cdk-outputs-dev.json"

# Display important outputs
echo ""
echo "🔗 Important URLs and IDs:"
cat cdk-outputs-dev.json | jq -r '
  to_entries[] | 
  select(.key | contains("ApiGatewayUrl") or contains("UserPoolId") or contains("UserPoolClientId")) |
  "\(.key): \(.value)"
'