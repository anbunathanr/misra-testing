# API Gateway Enhancements - Task 1.5

## Overview
This document describes the API Gateway enhancements implemented for the production deployment of the MISRA Platform.

## Implemented Features

### 1. Rate Limiting and Throttling ✅

#### Usage Plans
Three usage plans have been configured with different rate limits:

**Premium Usage Plan** (for authenticated premium users)
- Rate Limit: 2000 requests/second (production), 200 (dev)
- Burst Limit: 5000 requests (production), 500 (dev)
- Daily Quota: 500,000 requests (production), 50,000 (dev)

**Standard Usage Plan** (for authenticated users)
- Rate Limit: 1000 requests/second (production), 100 (dev)
- Burst Limit: 2000 requests (production), 200 (dev)
- Daily Quota: 100,000 requests (production), 10,000 (dev)

**Limited Usage Plan** (for public/unauthenticated endpoints)
- Rate Limit: 100 requests/second (production), 50 (dev)
- Burst Limit: 200 requests (production), 100 (dev)
- Daily Quota: 10,000 requests (production), 1,000 (dev)

#### Per-Endpoint Throttling
Method-specific throttling has been configured for critical endpoints:

| Endpoint | Burst Limit (prod) | Rate Limit (prod) |
|----------|-------------------|-------------------|
| /auth/login | 50 | 100 |
| /auth/register | 10 | 20 |
| /auth/refresh | 100 | 200 |
| /files/upload | 20 | 50 |
| /files/list | 100 | 200 |
| /analysis/start | 30 | 60 |
| /analysis/status | 200 | 500 |
| /analysis/results | 100 | 200 |
| /health | 1000 | 2000 |

#### API Keys
Three API keys have been created for different access levels:
- **Premium API Key**: For premium tier users
- **Standard API Key**: For standard tier users
- **Monitoring API Key**: For health checks and monitoring

### 2. CORS Configuration ✅

#### Production Origins
```typescript
const productionOrigins = [
  'https://misra.yourdomain.com',
  'https://www.misra.yourdomain.com',
  'https://app.misra.yourdomain.com'
];
```

#### Development Origins
```typescript
const developmentOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://*.vercel.app',
  'https://*.netlify.app'
];
```

#### Allowed Methods
- GET
- POST
- PUT
- DELETE
- PATCH
- HEAD
- OPTIONS

#### Allowed Headers
- Content-Type
- Authorization
- X-Amz-Date
- X-Api-Key
- X-Correlation-ID
- X-Requested-With
- Accept
- Origin
- X-Amz-Security-Token
- X-Amz-User-Agent
- X-Amz-Content-Sha256
- Cache-Control
- If-Match
- If-None-Match
- If-Modified-Since
- If-Unmodified-Since

#### Exposed Headers
- X-Correlation-ID
- X-Request-ID
- X-Amz-Request-ID
- ETag
- Content-Length
- Content-Type

### 3. Request/Response Validation ✅

#### Validation Models

**User Registration Model**
```typescript
{
  email: string (email format, max 255 chars),
  password: string (min 8, max 128 chars, complexity pattern),
  firstName: string (min 1, max 50 chars),
  lastName: string (min 1, max 50 chars),
  organizationId: string (optional, max 256 chars)
}
```

**File Upload Model**
```typescript
{
  fileName: string (pattern: ^[a-zA-Z0-9._-]+\.(c|cpp|h|hpp)$),
  fileSize: integer (min 1, max 10485760 bytes = 10MB),
  contentType: string (enum: text/plain, text/x-c, text/x-c++, application/octet-stream),
  checksum: string (SHA-256 hash pattern)
}
```

**Analysis Request Model**
```typescript
{
  fileId: string (pattern: ^[a-zA-Z0-9-_]{1,128}$),
  analysisType: string (enum: full, quick, custom),
  ruleSet: string (enum: misra-c-2012, misra-cpp-2008, custom),
  options: {
    includeWarnings: boolean,
    severity: string (enum: low, medium, high, critical)
  }
}
```

**Error Response Model**
```typescript
{
  error: string,
  message: string,
  correlationId: string,
  timestamp: string (date-time format),
  path: string,
  details: object (optional)
}
```

#### Validators
Three request validators have been configured:

1. **Strict Validator**: Validates both request body and parameters
2. **Body Only Validator**: Validates only request body
3. **Params Only Validator**: Validates only request parameters

#### Endpoint Validation Configuration

| Endpoint | Method | Validator | Request Model | Response Models |
|----------|--------|-----------|---------------|-----------------|
| /auth/login | POST | Strict | - | 200, 400, 401 |
| /auth/register | POST | Strict | UserRegistration | 201, 400, 409 |
| /auth/refresh | POST | BodyOnly | - | 200, 401 |
| /auth/logout | POST | ParamsOnly | - | 200 |
| /files/upload | POST | Strict | FileUpload | 201, 400, 401, 413 |
| /files/{fileId} | GET | ParamsOnly | - | 200, 404 |
| /files/{fileId} | DELETE | ParamsOnly | - | 204, 404 |
| /files/list | GET | ParamsOnly | - | 200 |
| /analysis/start | POST | Strict | AnalysisRequest | 202, 400, 404 |
| /analysis/status/{analysisId} | GET | ParamsOnly | - | 200, 404 |
| /analysis/results/{analysisId} | GET | ParamsOnly | - | 200, 404 |
| /user/profile | GET | - | - | 200 |
| /user/profile | PUT | BodyOnly | - | 200, 400 |
| /user/preferences | GET | - | - | 200 |
| /user/preferences | PATCH | BodyOnly | - | 200, 400 |

### 4. Custom Domain with SSL Certificate ✅

#### Configuration
The custom domain setup supports:
- TLS 1.2 security policy
- Regional endpoint type
- ACM certificate integration
- Route 53 DNS configuration

#### Setup Instructions

**Step 1: Create SSL Certificate**
```bash
# Create certificate in ACM (must be in us-east-1 for CloudFront)
aws acm request-certificate \
  --domain-name api.misra.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

**Step 2: Deploy with Custom Domain**
```bash
# Deploy stack with certificate ARN
cdk deploy \
  --context certificateArn=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID \
  --context enableCustomDomain=true
```

**Step 3: Create Route 53 Record**
```bash
# Get the custom domain target from stack outputs
DOMAIN_TARGET=$(aws cloudformation describe-stacks \
  --stack-name misra-platform-production \
  --query 'Stacks[0].Outputs[?OutputKey==`CustomDomainTarget`].OutputValue' \
  --output text)

# Create Route 53 A record (alias)
aws route53 change-resource-record-sets \
  --hosted-zone-id YOUR_HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "api.misra.yourdomain.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "CLOUDFRONT_HOSTED_ZONE_ID",
          "DNSName": "'$DOMAIN_TARGET'",
          "EvaluateTargetHealth": false
        }
      }
    }]
  }'
```

**Step 4: Test Custom Domain**
```bash
# Wait for DNS propagation (can take up to 48 hours)
# Test the custom domain
curl https://api.misra.yourdomain.com/health
```

#### Domain Configuration Parameters
The stack accepts the following parameters for custom domain setup:

- `CertificateArn`: ARN of the SSL certificate (must be in us-east-1)
- `DomainName`: Custom domain name for the API Gateway
- `HostedZoneId`: Route 53 Hosted Zone ID for the domain

#### Context Variables
- `certificateArn`: Certificate ARN for custom domain
- `enableCustomDomain`: Set to 'true' to enable custom domain

## Monitoring and Alarms

### CloudWatch Alarms
Alarms have been configured for:
- Throttling detection (per endpoint)
- High error rates
- High latency
- API Gateway 4xx/5xx errors

### Metrics
Custom metrics are tracked for:
- Request count per endpoint
- Response time per endpoint
- Error rate per endpoint
- Throttle count per endpoint

## Security Features

### Authentication
- JWT-based authentication via Lambda authorizer
- API key requirement for protected endpoints
- Token caching (5 minutes TTL)

### Authorization
- Role-based access control (RBAC)
- Resource-level permissions
- Least privilege IAM policies

### Security Headers
All responses include:
- X-Correlation-ID (for request tracing)
- Cache-Control (for caching policies)
- Content-Type (for content negotiation)

## Testing

### Health Check Endpoints

**Basic Health Check**
```bash
curl https://api.misra.yourdomain.com/health
```

**Detailed Health Check** (requires API key)
```bash
curl -H "X-Api-Key: YOUR_API_KEY" \
  https://api.misra.yourdomain.com/health/detailed
```

### Rate Limiting Test
```bash
# Test rate limiting
for i in {1..150}; do
  curl -H "X-Api-Key: YOUR_API_KEY" \
    https://api.misra.yourdomain.com/health &
done
wait
```

### CORS Test
```bash
# Test CORS preflight
curl -X OPTIONS \
  -H "Origin: https://misra.yourdomain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://api.misra.yourdomain.com/auth/login
```

### Validation Test
```bash
# Test request validation (should return 400)
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}' \
  https://api.misra.yourdomain.com/auth/register
```

## Deployment

### Development
```bash
npm run deploy:dev
```

### Staging
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

## Outputs

After deployment, the following outputs are available:

- `ApiGatewayUrl`: API Gateway endpoint URL
- `ApiGatewayId`: API Gateway REST API ID
- `ApiGatewayStage`: Deployment stage name
- `PremiumUsagePlanId`: Premium usage plan ID
- `StandardUsagePlanId`: Standard usage plan ID
- `LimitedUsagePlanId`: Limited usage plan ID
- `PremiumApiKeyId`: Premium API key ID
- `StandardApiKeyId`: Standard API key ID
- `MonitoringApiKeyId`: Monitoring API key ID
- `CustomDomainName`: Custom domain name (if enabled)
- `CustomDomainTarget`: Target for Route 53 alias record
- `RateLimitingConfig`: Rate limiting configuration JSON

## Next Steps

1. **Lambda Integration**: Connect Lambda functions to API endpoints
2. **WAF Configuration**: Add AWS WAF for additional security
3. **API Documentation**: Generate OpenAPI/Swagger documentation
4. **Load Testing**: Perform load testing to validate rate limits
5. **Monitoring Dashboard**: Create CloudWatch dashboard for API metrics

## References

- [API Gateway Rate Limiting](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [API Gateway CORS](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html)
- [API Gateway Request Validation](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html)
- [API Gateway Custom Domains](https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-custom-domains.html)
