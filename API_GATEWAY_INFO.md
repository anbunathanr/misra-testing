# API Gateway Information

## Deployed API Gateway

**API Name**: `ai-test-generation-api`  
**Stage**: `$default` (default stage for HTTP API)  
**Type**: HTTP API (API Gateway v2)

## API URL Structure

```
https://{api-id}.execute-api.{region}.amazonaws.com
```

For your deployment:
```
https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com
```

## How to Find Your API Gateway

### Using AWS CLI

```bash
# List all HTTP APIs
aws apigatewayv2 get-apis

# Find specific API by name
aws apigatewayv2 get-apis --query "Items[?Name=='ai-test-generation-api']"

# Get API URL
aws apigatewayv2 get-apis \
  --query "Items[?Name=='ai-test-generation-api'].ApiEndpoint" \
  --output text
```

### Using AWS Console

1. Go to AWS Console → API Gateway
2. Look for `ai-test-generation-api`
3. The API endpoint will be shown in the details

## Available Routes

Based on the minimal stack configuration:

### AI Test Generation Endpoints

```
POST /ai-test-generation/analyze
POST /ai-test-generation/generate
POST /ai-test-generation/batch
```

## Full API URL Examples

```bash
# Analyze endpoint
https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/analyze

# Generate endpoint
https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate

# Batch endpoint
https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/batch
```

## Notes

- HTTP APIs use `$default` stage by default (no stage name in URL)
- REST APIs typically use explicit stage names like `/prod` or `/dev`
- Your deployment uses HTTP API, so no stage name appears in the URL path
- The stage is managed internally by API Gateway

## Testing the API

```bash
# Test analyze endpoint
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "options": {
      "timeout": 30000
    }
  }'
```

## Stack Information

The API Gateway is defined in:
- **File**: `packages/backend/src/infrastructure/minimal-stack.ts`
- **Construct**: `AITestGenerationAPI`
- **CDK Resource**: `apigateway.HttpApi`
