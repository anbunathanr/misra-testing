# Task 7.1: Production Domain and CDN Setup - Deployment Guide

## Overview

This guide covers the setup of production domains and CDN for the MISRA SaaS Platform:
- **Frontend Domain**: `misra.digitransolutions.in` (CloudFront CDN)
- **API Domain**: `api.misra.digitransolutions.in` (API Gateway)
- **SSL/TLS**: Automatic certificate provisioning via AWS Certificate Manager

## Prerequisites

### 1. Route53 Hosted Zone

**CRITICAL**: Before deploying this stack, you MUST have a Route53 hosted zone for `digitransolutions.in`.

#### Check if Hosted Zone Exists:
```powershell
aws route53 list-hosted-zones --query "HostedZones[?Name=='digitransolutions.in.']"
```

#### If Hosted Zone Does NOT Exist:

**Option A: Domain Registered in Route53**
```powershell
# If you registered the domain through Route53, the hosted zone should already exist
# Check your Route53 console: https://console.aws.amazon.com/route53/v2/hostedzones
```

**Option B: Domain Registered Elsewhere (GoDaddy, Namecheap, etc.)**
```powershell
# 1. Create hosted zone in Route53
aws route53 create-hosted-zone --name digitransolutions.in --caller-reference $(Get-Date -Format "yyyyMMddHHmmss")

# 2. Get the nameservers from the output
# 3. Update your domain registrar's nameservers to point to Route53 nameservers
# Example nameservers (yours will be different):
#   ns-1234.awsdns-12.org
#   ns-5678.awsdns-34.com
#   ns-9012.awsdns-56.net
#   ns-3456.awsdns-78.co.uk
```

**Option C: Use Subdomain Only (Recommended for Testing)**
If you don't own `digitransolutions.in`, you can modify the stack to use a domain you own:

```typescript
// In misra-platform-stack.ts, change:
const productionDomain = 'misra.yourdomain.com';
const apiDomain = 'api.misra.yourdomain.com';
const hostedZoneName = 'yourdomain.com';
```

### 2. AWS Region Configuration

**IMPORTANT**: SSL certificates for CloudFront MUST be in `us-east-1` region.

The stack will automatically create certificates in the correct region, but ensure your AWS CLI is configured:

```powershell
# Check current region
aws configure get region

# If not us-east-1, the CDK will handle cross-region certificate creation automatically
```

## Infrastructure Changes

### What Was Added

1. **SSL Certificates**:
   - Frontend certificate for `misra.digitransolutions.in` (CloudFront - us-east-1)
   - API certificate for `api.misra.digitransolutions.in` (API Gateway - current region)
   - Automatic DNS validation via Route53

2. **CloudFront Custom Domain**:
   - Custom domain: `misra.digitransolutions.in`
   - SSL/TLS encryption (HTTPS only)
   - Optimized caching policies
   - Global CDN distribution (North America & Europe)
   - Access logging enabled

3. **API Gateway Custom Domain**:
   - Custom domain: `api.misra.digitransolutions.in`
   - SSL/TLS encryption (HTTPS only)
   - Mapped to default API stage
   - Regional endpoint

4. **Route53 DNS Records**:
   - A record for frontend → CloudFront distribution
   - A record for API → API Gateway custom domain

### Code Changes

**File**: `packages/backend/src/infrastructure/misra-platform-stack.ts`

**Added Imports**:
```typescript
import * as certificatemanager from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53targets from 'aws-cdk-lib/aws-route53-targets';
```

**Added Configuration** (at the beginning of constructor):
```typescript
// Production domain configuration
const productionDomain = 'misra.digitransolutions.in';
const apiDomain = 'api.misra.digitransolutions.in';
const hostedZoneName = 'digitransolutions.in';

// Import existing hosted zone
const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
  domainName: hostedZoneName,
});

// Create SSL certificates
const frontendCertificate = new certificatemanager.Certificate(this, 'FrontendCertificate', {
  domainName: productionDomain,
  validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
});

const apiCertificate = new certificatemanager.Certificate(this, 'ApiCertificate', {
  domainName: apiDomain,
  validation: certificatemanager.CertificateValidation.fromDns(hostedZone),
});
```

## Deployment Steps

### Step 1: Verify Prerequisites

```powershell
# 1. Check Route53 hosted zone exists
aws route53 list-hosted-zones --query "HostedZones[?Name=='digitransolutions.in.']"

# 2. Verify AWS credentials
aws sts get-caller-identity

# 3. Check CDK version
cdk --version
```

### Step 2: Build Lambda Functions

```powershell
cd packages/backend

# Build all Lambda functions
npm run build
```

### Step 3: Synthesize CDK Stack

```powershell
# Generate CloudFormation template
cdk synth

# Review the changes (optional)
cdk diff
```

### Step 4: Deploy Infrastructure

```powershell
# Deploy the stack
cdk deploy MisraPlatformStack

# Confirm the changes when prompted
# Type 'y' and press Enter
```

**Expected Deployment Time**: 15-20 minutes
- Certificate validation: 5-10 minutes
- CloudFront distribution: 5-10 minutes
- API Gateway custom domain: 2-3 minutes

### Step 5: Verify Deployment

```powershell
# Get stack outputs
aws cloudformation describe-stacks --stack-name MisraPlatformStack --query "Stacks[0].Outputs"
```

**Expected Outputs**:
```json
[
  {
    "OutputKey": "FrontendCustomDomain",
    "OutputValue": "https://misra.digitransolutions.in",
    "Description": "Production frontend URL with custom domain"
  },
  {
    "OutputKey": "ApiCustomDomain",
    "OutputValue": "https://api.misra.digitransolutions.in",
    "Description": "Production API URL with custom domain"
  },
  {
    "OutputKey": "CloudFrontDistributionDomain",
    "OutputValue": "d1234567890abc.cloudfront.net",
    "Description": "CloudFront distribution domain"
  }
]
```

### Step 6: Test Custom Domains

```powershell
# Test frontend domain (should return 403 until frontend is deployed)
curl -I https://misra.digitransolutions.in

# Test API domain (should return 404 - API is working but no route matches)
curl -I https://api.misra.digitransolutions.in

# Test API health (if health endpoint exists)
curl https://api.misra.digitransolutions.in/health
```

## DNS Propagation

After deployment, DNS changes may take time to propagate:

- **Route53 to CloudFront**: Usually instant (1-2 minutes)
- **Route53 to API Gateway**: Usually instant (1-2 minutes)
- **Global DNS propagation**: Up to 48 hours (typically 15-30 minutes)

### Check DNS Propagation:

```powershell
# Check frontend domain
nslookup misra.digitransolutions.in

# Check API domain
nslookup api.misra.digitransolutions.in

# Verify SSL certificate
curl -vI https://misra.digitransolutions.in 2>&1 | Select-String "SSL certificate"
```

## Security Configuration

### SSL/TLS Settings

**CloudFront**:
- Protocol: TLS 1.2 minimum
- Cipher suites: AWS recommended security policy
- HTTPS only (HTTP redirects to HTTPS)

**API Gateway**:
- Protocol: TLS 1.2 minimum
- Regional endpoint with custom domain
- HTTPS only

### CORS Configuration

**API Gateway CORS**:
```typescript
allowOrigins: ['*']  // Update to specific domains in production
allowMethods: [GET, POST, PUT, DELETE, OPTIONS]
allowHeaders: ['Content-Type', 'Authorization']
```

**Recommended Production CORS**:
```typescript
allowOrigins: [
  'https://misra.digitransolutions.in',
  'https://staging.misra.digitransolutions.in'
]
```

## Cost Estimation

### Monthly Costs (Estimated)

**CloudFront**:
- Data transfer: $0.085/GB (first 10 TB)
- HTTPS requests: $0.01 per 10,000 requests
- Estimated: $5-20/month (low traffic)

**API Gateway**:
- HTTP API requests: $1.00 per million requests
- Data transfer: $0.09/GB
- Estimated: $5-15/month (low traffic)

**Route53**:
- Hosted zone: $0.50/month
- DNS queries: $0.40 per million queries
- Estimated: $1-2/month

**Certificate Manager**:
- Public SSL certificates: FREE

**Total Estimated Cost**: $11-37/month (low traffic)

## Troubleshooting

### Issue: Certificate Validation Stuck

**Symptom**: CDK deployment hangs at certificate creation

**Solution**:
1. Check Route53 hosted zone exists and is correct
2. Verify nameservers are properly configured at domain registrar
3. Wait up to 30 minutes for DNS propagation
4. Check CloudFormation events in AWS Console

```powershell
# Check certificate validation status
aws acm list-certificates --region us-east-1
aws acm describe-certificate --certificate-arn <arn> --region us-east-1
```

### Issue: CloudFront Distribution Not Accessible

**Symptom**: `misra.digitransolutions.in` returns connection error

**Solution**:
1. Wait 10-15 minutes for CloudFront distribution to deploy
2. Check CloudFront distribution status in AWS Console
3. Verify DNS record points to CloudFront distribution

```powershell
# Check CloudFront distribution status
aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items[?contains(@, 'misra.digitransolutions.in')]]"
```

### Issue: API Gateway Custom Domain Not Working

**Symptom**: `api.misra.digitransolutions.in` returns connection error

**Solution**:
1. Verify API Gateway custom domain is created
2. Check API mapping is configured
3. Verify DNS record points to API Gateway

```powershell
# Check API Gateway custom domain
aws apigatewayv2 get-domain-names --query "Items[?DomainName=='api.misra.digitransolutions.in']"

# Check API mappings
aws apigatewayv2 get-api-mappings --domain-name api.misra.digitransolutions.in
```

### Issue: SSL Certificate Errors

**Symptom**: Browser shows "Certificate not valid" error

**Solution**:
1. Wait for certificate validation to complete (5-10 minutes)
2. Verify certificate is issued in ACM
3. Check CloudFront/API Gateway is using the correct certificate

```powershell
# Check certificate status
aws acm list-certificates --region us-east-1 --query "CertificateSummaryList[?DomainName=='misra.digitransolutions.in']"
```

## Rollback Procedure

If deployment fails or you need to rollback:

```powershell
# Option 1: Rollback via CDK
cdk destroy MisraPlatformStack

# Option 2: Rollback via CloudFormation
aws cloudformation delete-stack --stack-name MisraPlatformStack

# Option 3: Manual cleanup (if stack deletion fails)
# 1. Delete CloudFront distribution (disable first, then delete)
# 2. Delete API Gateway custom domain
# 3. Delete Route53 records
# 4. Delete ACM certificates
# 5. Delete CloudFormation stack
```

## Next Steps

After successful deployment of Task 7.1:

1. **Update Frontend Configuration**:
   - Update `packages/frontend/src/config/environments.ts`
   - Set production API URL to `https://api.misra.digitransolutions.in`

2. **Deploy Frontend** (Task 7.2):
   - Build production frontend
   - Upload to S3 frontend bucket
   - Invalidate CloudFront cache

3. **Update Environment Variables**:
   - Update Lambda functions with production domain URLs
   - Configure CORS to use specific production domain

4. **Testing**:
   - Test complete workflow with production domains
   - Verify SSL certificates are working
   - Test API endpoints with custom domain

## Verification Checklist

- [ ] Route53 hosted zone exists for `digitransolutions.in`
- [ ] SSL certificates created and validated in ACM
- [ ] CloudFront distribution deployed with custom domain
- [ ] API Gateway custom domain configured
- [ ] Route53 A records created for both domains
- [ ] DNS propagation complete (can resolve both domains)
- [ ] HTTPS working for both domains (no certificate errors)
- [ ] CloudFront serves content (even if 403 before frontend deployment)
- [ ] API Gateway responds to requests (even if 404 for unknown routes)
- [ ] Stack outputs show correct custom domain URLs

## References

- **Requirements**: 5.2 (Production deployment), 9.1 (HTTPS encryption)
- **Design**: Section "Deployment Architecture" - Production Environment Setup
- **AWS Documentation**:
  - [CloudFront Custom Domains](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/CNAMEs.html)
  - [API Gateway Custom Domains](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)
  - [ACM Certificate Validation](https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html)

## Support

If you encounter issues during deployment:

1. Check CloudFormation events in AWS Console
2. Review CloudWatch logs for Lambda functions
3. Verify all prerequisites are met
4. Check AWS service quotas and limits
5. Contact AWS Support if needed

---

**Task Status**: Implementation Complete
**Next Task**: 7.2 - Deploy production Lambda functions and databases
