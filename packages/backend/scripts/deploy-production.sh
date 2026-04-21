#!/bin/bash

# Deploy MISRA Platform to Production Environment
set -e

echo "🚀 Deploying MISRA Platform to Production Environment..."

# Validate required environment variables
if [ -z "$PRODUCTION_DOMAIN" ]; then
  echo "❌ Error: PRODUCTION_DOMAIN environment variable is required"
  exit 1
fi

if [ -z "$PRODUCTION_CERTIFICATE_ARN" ]; then
  echo "❌ Error: PRODUCTION_CERTIFICATE_ARN environment variable is required"
  exit 1
fi

# Set environment variables
export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
export CDK_DEFAULT_REGION=${AWS_REGION:-us-east-1}

# Build Lambda functions
echo "📦 Building Lambda functions..."
npm run build:lambdas

# Diff first to show changes
echo "🔍 Showing deployment diff..."
npx cdk diff MisraPlatform-production \
  --context environment=production \
  --context productionDomain=$PRODUCTION_DOMAIN \
  --context productionCertificateArn=$PRODUCTION_CERTIFICATE_ARN

# Confirm deployment
echo ""
read -p "🤔 Do you want to proceed with production deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Production deployment cancelled"
  exit 1
fi

# Deploy CDK stack with manual approval
echo "🏗️  Deploying CDK stack..."
npx cdk deploy MisraPlatform-production \
  --context environment=production \
  --context productionDomain=$PRODUCTION_DOMAIN \
  --context productionCertificateArn=$PRODUCTION_CERTIFICATE_ARN \
  --require-approval broadening \
  --outputs-file cdk-outputs-production.json

echo "✅ Production deployment complete!"
echo "📋 Stack outputs saved to cdk-outputs-production.json"

# Display important outputs
echo ""
echo "🔗 Important URLs and IDs:"
cat cdk-outputs-production.json | jq -r '
  to_entries[] | 
  select(.key | contains("ApiGatewayUrl") or contains("UserPoolId") or contains("UserPoolClientId")) |
  "\(.key): \(.value)"
'

echo ""
echo "🎉 Production deployment successful!"
echo "🔒 Remember to update DNS records if using custom domain"