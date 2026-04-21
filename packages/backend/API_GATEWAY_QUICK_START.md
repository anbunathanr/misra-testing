# API Gateway Quick Start Guide

## Getting Started

### 1. Deploy the Stack

```bash
# Development
cd packages/backend
npm run deploy:dev

# Production (with custom domain)
npm run deploy:production -- \
  --context certificateArn=arn:aws:acm:us-east-1:ACCOUNT_ID:certificate/CERT_ID \
  --context enableCustomDomain=true
```

### 2. Get API Key

After deployment, retrieve your API key:

```bash
# Get API key value
aws apigateway get-api-key \
  --api-key YOUR_API_KEY_ID \
  --include-value \
  --query 'value' \
  --output text
```

### 3. Test the API

```bash
# Health check (no auth required)
curl https://YOUR_API_URL/health

# Detailed health check (requires API key)
curl -H "X-Api-Key: YOUR_API_KEY" \
  https://YOUR_API_URL/health/detailed
```

## API Endpoints

### Authentication Endpoints

#### Register User
```bash
curl -X POST https://YOUR_API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

#### Login
```bash
curl -X POST https://YOUR_API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

#### Refresh Token
```bash
curl -X POST https://YOUR_API_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_REFRESH_TOKEN"
```

### File Management Endpoints

#### Upload File
```bash
curl -X POST https://YOUR_API_URL/files/upload \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "fileName": "example.c",
    "fileSize": 1024,
    "contentType": "text/x-c",
    "checksum": "abc123..."
  }'
```

#### List Files
```bash
curl https://YOUR_API_URL/files/list?limit=10&offset=0 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY"
```

#### Get File
```bash
curl https://YOUR_API_URL/files/{fileId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY"
```

#### Delete File
```bash
curl -X DELETE https://YOUR_API_URL/files/{fileId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY"
```

### Analysis Endpoints

#### Start Analysis
```bash
curl -X POST https://YOUR_API_URL/analysis/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "fileId": "file-123",
    "analysisType": "full",
    "ruleSet": "misra-c-2012",
    "options": {
      "includeWarnings": true,
      "severity": "high"
    }
  }'
```

#### Get Analysis Status
```bash
curl https://YOUR_API_URL/analysis/status/{analysisId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY"
```

#### Get Analysis Results
```bash
curl https://YOUR_API_URL/analysis/results/{analysisId} \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY"
```

### User Profile Endpoints

#### Get Profile
```bash
curl https://YOUR_API_URL/user/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY"
```

#### Update Profile
```bash
curl -X PUT https://YOUR_API_URL/user/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "firstName": "Jane",
    "lastName": "Smith"
  }'
```

#### Get Preferences
```bash
curl https://YOUR_API_URL/user/preferences \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY"
```

#### Update Preferences
```bash
curl -X PATCH https://YOUR_API_URL/user/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Api-Key: YOUR_API_KEY" \
  -d '{
    "theme": "dark",
    "notifications": true
  }'
```

## Rate Limits

### Usage Plans

| Plan | Rate Limit | Burst Limit | Daily Quota |
|------|-----------|-------------|-------------|
| Premium | 2000/sec | 5000 | 500,000 |
| Standard | 1000/sec | 2000 | 100,000 |
| Limited | 100/sec | 200 | 10,000 |

### Per-Endpoint Limits (Production)

| Endpoint | Burst | Rate |
|----------|-------|------|
| /auth/login | 50 | 100 |
| /auth/register | 10 | 20 |
| /files/upload | 20 | 50 |
| /analysis/start | 30 | 60 |

## Error Handling

### Standard Error Response
```json
{
  "error": "ValidationError",
  "message": "Invalid request body",
  "correlationId": "abc-123-def-456",
  "timestamp": "2024-01-15T10:30:00Z",
  "path": "/auth/register",
  "details": {
    "field": "email",
    "reason": "Invalid email format"
  }
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `202 Accepted`: Request accepted for processing
- `204 No Content`: Request successful, no content to return
- `400 Bad Request`: Invalid request body or parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource already exists
- `413 Payload Too Large`: File size exceeds limit
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## CORS Configuration

### Allowed Origins (Production)
- https://misra.yourdomain.com
- https://www.misra.yourdomain.com
- https://app.misra.yourdomain.com

### Allowed Origins (Development)
- http://localhost:3000
- http://localhost:5173
- https://*.vercel.app
- https://*.netlify.app

### Allowed Methods
- GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS

### Required Headers
- `Content-Type`: application/json
- `Authorization`: Bearer {token}
- `X-Api-Key`: {api-key}
- `X-Correlation-ID`: {correlation-id} (optional, for request tracing)

## Custom Domain Setup

### Prerequisites
1. Domain registered in Route 53 or external registrar
2. SSL certificate created in ACM (us-east-1 region)
3. Hosted zone configured in Route 53

### Setup Steps

1. **Create SSL Certificate**
```bash
aws acm request-certificate \
  --domain-name api.misra.yourdomain.com \
  --validation-method DNS \
  --region us-east-1
```

2. **Validate Certificate**
```bash
# Add DNS validation records to Route 53
# Wait for certificate status to become "ISSUED"
aws acm describe-certificate \
  --certificate-arn YOUR_CERT_ARN \
  --region us-east-1
```

3. **Deploy with Custom Domain**
```bash
cdk deploy \
  --context certificateArn=YOUR_CERT_ARN \
  --context enableCustomDomain=true
```

4. **Create Route 53 Record**
```bash
# Get custom domain target from stack outputs
# Create A record (alias) pointing to the target
```

5. **Test Custom Domain**
```bash
# Wait for DNS propagation (up to 48 hours)
curl https://api.misra.yourdomain.com/health
```

## Monitoring

### CloudWatch Metrics
- API Gateway request count
- API Gateway latency
- API Gateway 4xx/5xx errors
- Throttle count per endpoint

### CloudWatch Alarms
- High error rate (> 10 errors in 5 minutes)
- High latency (> 80% of timeout)
- Throttling detected (> 1 throttle)

### Logs
- API Gateway access logs: `/aws/apigateway/misra-platform-{env}`
- Lambda function logs: `/aws/lambda/misra-platform-*`

## Troubleshooting

### 429 Too Many Requests
- Check your usage plan limits
- Implement exponential backoff in your client
- Consider upgrading to a higher usage plan

### 401 Unauthorized
- Verify your access token is valid and not expired
- Check that the Authorization header is correctly formatted
- Ensure the token was issued by the correct user pool

### 400 Bad Request
- Validate your request body against the API models
- Check that all required fields are present
- Verify data types and formats match the schema

### CORS Errors
- Verify your origin is in the allowed origins list
- Check that you're including the correct headers
- Ensure you're using HTTPS in production

## Support

For issues or questions:
1. Check CloudWatch logs for error details
2. Review the API Gateway documentation
3. Contact the platform team

## Additional Resources

- [Full API Documentation](./API_GATEWAY_ENHANCEMENTS.md)
- [AWS API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [CDK API Gateway Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html)
