# Phase 2: Authentication Lambda Deployment Guide

**Quick Start**: Deploy the newly created authentication Lambda functions to AWS

---

## 📋 Pre-Deployment Checklist

- [x] All Lambda functions created
- [x] Utility functions updated
- [x] Environment variables configured
- [ ] Lambda functions built
- [ ] Lambda functions deployed
- [ ] API Gateway routes configured
- [ ] Testing completed

---

## 🚀 Step 1: Build Lambda Functions

```bash
cd packages/backend

# Install dependencies (if not already done)
npm install

# Build all Lambda functions
npm run build:lambdas
```

**Expected Output**:
```
✓ Building Lambda functions...
✓ Bundling register.ts
✓ Bundling login.ts
✓ Bundling verify-otp.ts
✓ Bundling get-profile.ts
✓ Bundling refresh-token.ts
✓ Bundling initiate-flow.ts
✓ Build complete
```

---

## 🚀 Step 2: Deploy to AWS

### Option A: Deploy via CDK (Recommended)

```bash
# Deploy the production stack
npm run deploy:production

# Or deploy specific stack
cdk deploy MisraPlatform-dev --require-approval never
```

### Option B: Deploy Individual Lambda Functions

```bash
# Deploy register Lambda
aws lambda update-function-code \
  --function-name misra-auth-register \
  --zip-file fileb://dist-lambdas/register.zip \
  --region us-east-1

# Deploy verify-otp Lambda
aws lambda update-function-code \
  --function-name misra-auth-verify-otp \
  --zip-file fileb://dist-lambdas/verify-otp.zip \
  --region us-east-1

# Deploy get-profile Lambda
aws lambda update-function-code \
  --function-name misra-auth-get-profile \
  --zip-file fileb://dist-lambdas/get-profile.zip \
  --region us-east-1

# Deploy refresh-token Lambda
aws lambda update-function-code \
  --function-name misra-auth-refresh-token \
  --zip-file fileb://dist-lambdas/refresh-token.zip \
  --region us-east-1
```

---

## 🔧 Step 3: Configure API Gateway Routes

Add the following routes to your API Gateway:

### Authentication Endpoints

| Method | Path | Lambda Function | Auth Required |
|--------|------|-----------------|---------------|
| POST | /auth/initiate-flow | initiate-flow | No |
| POST | /auth/register | register | No |
| POST | /auth/login | login | No |
| POST | /auth/verify-otp | verify-otp | No |
| GET | /auth/profile | get-profile | Yes |
| POST | /auth/refresh | refresh-token | No |

### Using AWS Console

1. Go to API Gateway → Your API
2. Click "Create Resource"
3. Create `/auth` resource
4. Create sub-resources for each endpoint
5. Create methods (POST/GET)
6. Select Lambda integration
7. Choose the appropriate Lambda function
8. Enable CORS
9. Deploy API

### Using AWS CLI

```bash
# Get API ID
API_ID=$(aws apigateway get-rest-apis --query 'items[0].id' --output text)

# Create /auth resource
AUTH_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $(aws apigateway get-resources --rest-api-id $API_ID --query 'items[0].id' --output text) \
  --path-part auth \
  --query 'id' --output text)

# Create /auth/register resource
REGISTER_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $AUTH_RESOURCE \
  --path-part register \
  --query 'id' --output text)

# Create POST method for /auth/register
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE \
  --http-method POST \
  --authorization-type NONE

# Create Lambda integration
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $REGISTER_RESOURCE \
  --http-method POST \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:ACCOUNT_ID:function:misra-auth-register/invocations
```

---

## ✅ Step 4: Verify Deployment

### Check Lambda Functions

```bash
# List all auth Lambda functions
aws lambda list-functions \
  --region us-east-1 \
  --query 'Functions[?contains(FunctionName, `auth`)].{Name:FunctionName,Runtime:Runtime,LastModified:LastModified}' \
  --output table
```

**Expected Output**:
```
|  Name                      | Runtime | LastModified           |
|----------------------------|---------|------------------------|
|  misra-auth-register       | nodejs18.x | 2024-04-22T10:30:00Z |
|  misra-auth-login          | nodejs18.x | 2024-04-22T10:30:00Z |
|  misra-auth-verify-otp     | nodejs18.x | 2024-04-22T10:30:00Z |
|  misra-auth-get-profile    | nodejs18.x | 2024-04-22T10:30:00Z |
|  misra-auth-refresh-token  | nodejs18.x | 2024-04-22T10:30:00Z |
|  misra-auth-initiate-flow  | nodejs18.x | 2024-04-22T10:30:00Z |
```

### Check API Gateway Routes

```bash
# Get API ID
API_ID=$(aws apigateway get-rest-apis --query 'items[0].id' --output text)

# List all resources
aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[?path==`/auth/*`].{Path:path,Methods:resourceMethods}' \
  --output table
```

### Test Lambda Functions

```bash
# Test register Lambda
aws lambda invoke \
  --function-name misra-auth-register \
  --payload '{"body":"{\"email\":\"test@example.com\",\"password\":\"TestPass123!\",\"name\":\"Test User\"}"}' \
  --region us-east-1 \
  response.json

cat response.json
```

---

## 🧪 Step 5: Test Authentication Flow

### Test 1: User Registration

```bash
curl -X POST https://your-api-gateway-url/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "name": "New User"
  }'
```

**Expected Response**:
```json
{
  "userId": "cognito-user-id",
  "email": "newuser@example.com",
  "message": "User registered successfully. Please verify your email and set up MFA.",
  "requiresEmailVerification": true
}
```

### Test 2: User Login

```bash
curl -X POST https://your-api-gateway-url/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!"
  }'
```

**Expected Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "cognito-user-id",
    "email": "newuser@example.com",
    "name": "New User"
  },
  "expiresIn": 3600,
  "message": "Login successful"
}
```

### Test 3: Get User Profile

```bash
curl -X GET https://your-api-gateway-url/auth/profile \
  -H "Authorization: Bearer <access-token>"
```

**Expected Response**:
```json
{
  "userId": "cognito-user-id",
  "email": "newuser@example.com",
  "name": "New User",
  "emailVerified": true,
  "mfaEnabled": true,
  "createdAt": "2024-04-22T10:30:00Z",
  "lastModified": "2024-04-22T10:30:00Z"
}
```

### Test 4: Refresh Token

```bash
curl -X POST https://your-api-gateway-url/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-token>"
  }'
```

**Expected Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 3600,
  "message": "Token refreshed successfully"
}
```

---

## 🔍 Step 6: Monitor and Debug

### View CloudWatch Logs

```bash
# View logs for register Lambda
aws logs tail /aws/lambda/misra-auth-register --follow

# View logs for verify-otp Lambda
aws logs tail /aws/lambda/misra-auth-verify-otp --follow

# View logs for all auth functions
aws logs tail /aws/lambda --follow --log-group-name-prefix misra-auth
```

### Check Lambda Metrics

```bash
# Get invocation count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=misra-auth-register \
  --start-time 2024-04-22T00:00:00Z \
  --end-time 2024-04-23T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

### Check Lambda Errors

```bash
# Get error count
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=misra-auth-register \
  --start-time 2024-04-22T00:00:00Z \
  --end-time 2024-04-23T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

---

## 🚨 Troubleshooting

### Issue: Lambda function not found

**Solution**:
```bash
# Check if Lambda exists
aws lambda get-function --function-name misra-auth-register

# If not found, deploy it
npm run deploy:production
```

### Issue: API Gateway returns 403 Forbidden

**Solution**:
```bash
# Check Lambda permissions
aws lambda get-policy --function-name misra-auth-register

# Add API Gateway permission
aws lambda add-permission \
  --function-name misra-auth-register \
  --statement-id AllowAPIGateway \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com
```

### Issue: CORS errors in browser

**Solution**:
```bash
# Enable CORS on API Gateway
aws apigateway put-integration-response \
  --rest-api-id $API_ID \
  --resource-id $RESOURCE_ID \
  --http-method POST \
  --status-code 200 \
  --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
  --response-templates '{"application/json":""}'
```

### Issue: Invalid password error

**Solution**: Ensure password meets requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character (!@#$%^&*)

---

## 📊 Deployment Checklist

- [ ] Lambda functions built successfully
- [ ] Lambda functions deployed to AWS
- [ ] API Gateway routes configured
- [ ] CORS enabled on all endpoints
- [ ] Lambda permissions set for API Gateway
- [ ] CloudWatch logs accessible
- [ ] User registration tested
- [ ] User login tested
- [ ] OTP verification tested
- [ ] Profile retrieval tested
- [ ] Token refresh tested
- [ ] Error handling verified
- [ ] Performance acceptable (< 1s response time)
- [ ] Security headers present
- [ ] Rate limiting configured

---

## 🎯 Next Steps

1. **Deploy Lambda Functions**
   - Run `npm run deploy:production`
   - Verify deployment in AWS Console

2. **Configure API Gateway**
   - Add routes for all auth endpoints
   - Enable CORS
   - Test endpoints

3. **Test Complete Flow**
   - Register new user
   - Login with credentials
   - Verify OTP
   - Get profile
   - Refresh token

4. **Monitor Production**
   - Watch CloudWatch logs
   - Monitor Lambda metrics
   - Track error rates

5. **Proceed to Phase 3**
   - Implement File Management Lambda functions
   - Configure S3 integration
   - Test file upload flow

