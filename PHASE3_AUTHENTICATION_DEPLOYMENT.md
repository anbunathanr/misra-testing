# Phase 3: Authentication System Deployment Guide

## Overview

Phase 3 implements AWS Cognito authentication to replace the temporary demo mode. This guide walks through deploying and configuring the authentication system.

## What Was Implemented

### Backend Changes

1. **Cognito Infrastructure** (`packages/backend/src/infrastructure/cognito-auth.ts`)
   - User Pool with email sign-in
   - Password policy: min 8 chars, uppercase, lowercase, digits required
   - Email verification enabled
   - Custom attributes: organizationId, role
   - User Pool Client for web application (no secret, SPA)
   - Token validity: 1 hour access, 30 days refresh

2. **API Gateway Integration** (`packages/backend/src/infrastructure/minimal-stack.ts`)
   - Cognito JWT Authorizer configured
   - All AI test generation endpoints protected
   - Authorization header required: `Authorization: Bearer <token>`

### Frontend Changes

1. **Authentication Service** (`packages/frontend/src/services/auth-service.ts`)
   - Register new users
   - Login with email/password
   - Logout
   - Get current user and token
   - Change password
   - Forgot password flow

2. **Redux Integration** (`packages/frontend/src/store/slices/authSlice.ts`)
   - Async thunks for login, register, logout
   - Token and user state management
   - Error handling
   - Demo mode removed

3. **Protected Routes** (`packages/frontend/src/components/ProtectedRoute.tsx`)
   - Check authentication status
   - Redirect to login if not authenticated
   - Store intended destination for post-login redirect

4. **Login Page** (`packages/frontend/src/pages/LoginPage.tsx`)
   - Email/password form
   - Cognito integration
   - Error handling
   - Link to registration

5. **Registration Page** (`packages/frontend/src/pages/RegisterPage.tsx`)
   - Full name, email, password fields
   - Password validation (8+ chars, uppercase, lowercase, number)
   - Confirm password
   - Email verification flow

## Deployment Steps

### Step 1: Install Frontend Dependencies

```bash
cd packages/frontend
npm install
```

This will install `amazon-cognito-identity-js` package.

### Step 2: Deploy Backend with Cognito

```bash
cd packages/backend
npm run build
cdk deploy MinimalStack
```

**Important**: Note the CloudFormation outputs:
- `UserPoolId` - e.g., `us-east-1_XXXXXXXXX`
- `UserPoolClientId` - e.g., `XXXXXXXXXXXXXXXXXXXXXXXXXX`
- `UserPoolArn` - e.g., `arn:aws:cognito-idp:us-east-1:XXXX:userpool/us-east-1_XXXXXXXXX`

### Step 3: Update Frontend Environment Variables

Update `packages/frontend/.env.production` with the Cognito values from Step 2:

```env
VITE_API_URL=https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com
VITE_APP_NAME=AIBTS Platform

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
```

Also update `.env.local` for local development:

```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=AIBTS Platform

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
```

### Step 4: Build and Deploy Frontend

```bash
cd packages/frontend
npm run build
vercel --prod
```

Or if using the deployment script:

```powershell
.\deploy-frontend.ps1
```

### Step 5: Test Authentication Flow

1. **Register a new user**:
   - Go to https://aibts-platform.vercel.app/register
   - Fill in name, email, password
   - Submit form
   - Check email for verification code (if email verification enabled)

2. **Verify email** (if required):
   - Check your email inbox
   - Copy the verification code
   - Enter code on verification page

3. **Login**:
   - Go to https://aibts-platform.vercel.app/login
   - Enter email and password
   - Click "Sign In"
   - Should redirect to dashboard

4. **Test protected routes**:
   - Try accessing /dashboard without logging in
   - Should redirect to /login
   - After login, should redirect back to intended page

5. **Test API calls**:
   - Create a project
   - Generate AI test cases
   - Verify Authorization header included in requests
   - Verify API returns data (not 401 Unauthorized)

## Verification Checklist

- [ ] Backend deployed successfully
- [ ] Cognito User Pool created
- [ ] User Pool ID and Client ID noted
- [ ] Frontend environment variables updated
- [ ] Frontend built and deployed
- [ ] Can access registration page
- [ ] Can register new user
- [ ] Receive verification email (if enabled)
- [ ] Can login with credentials
- [ ] Redirected to dashboard after login
- [ ] Protected routes require authentication
- [ ] API calls include Authorization header
- [ ] API calls succeed with valid token
- [ ] API calls fail with 401 without token
- [ ] Can logout successfully
- [ ] Demo mode removed

## Troubleshooting

### Issue: "User Pool ID not found"

**Solution**: Make sure you've updated `.env.production` with the correct User Pool ID from CloudFormation outputs.

### Issue: "Invalid client id"

**Solution**: Verify the Client ID in `.env.production` matches the one from CloudFormation outputs.

### Issue: "User is not confirmed"

**Solution**: Check your email for the verification code. If you didn't receive it, use the "Resend code" option or manually confirm the user in AWS Cognito console.

### Issue: API returns 401 Unauthorized

**Solution**: 
1. Check that the Authorization header is being sent with API requests
2. Verify the token is valid (not expired)
3. Check that the Cognito authorizer is configured correctly in API Gateway
4. Verify the User Pool ID in the authorizer matches your User Pool

### Issue: CORS errors

**Solution**: Verify that the frontend URL is in the CORS allowed origins in `minimal-stack.ts`:

```typescript
allowOrigins: [
  'http://localhost:3000',
  'https://aibts-platform.vercel.app',
],
```

### Issue: "Password did not conform with policy"

**Solution**: Ensure password meets requirements:
- At least 8 characters
- Contains uppercase letter
- Contains lowercase letter
- Contains number

## Manual User Creation (Optional)

If you need to create users manually for testing:

```bash
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username test@example.com \
  --user-attributes Name=email,Value=test@example.com Name=name,Value="Test User" \
  --temporary-password TempPass123! \
  --message-action SUPPRESS
```

Then set permanent password:

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_XXXXXXXXX \
  --username test@example.com \
  --password YourPassword123! \
  --permanent
```

## Next Steps

After Phase 3 is complete:

1. **Phase 4**: Real OpenAI Integration
   - Store OpenAI API key in Secrets Manager
   - Update AI Engine to use real OpenAI API
   - Implement cost tracking and limits

2. **Phase 5**: Integration and Testing
   - End-to-end testing
   - Performance testing
   - Security review
   - Documentation updates

## Security Notes

- Tokens are stored in localStorage (consider using httpOnly cookies for production)
- Tokens expire after 1 hour (refresh tokens valid for 30 days)
- Password policy enforced by Cognito
- Email verification recommended for production
- MFA can be enabled in Cognito User Pool settings

## Rollback Plan

If issues occur:

1. Revert frontend to previous version:
   ```bash
   vercel rollback
   ```

2. Temporarily disable Cognito authorizer:
   - Comment out `authorizer: cognitoAuthorizer` in `minimal-stack.ts`
   - Redeploy backend

3. Re-enable demo mode (temporary):
   - Add back demo mode check in `ProtectedRoute.tsx`
   - Set `localStorage.setItem('demo-mode', 'true')` in browser console

## Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [amazon-cognito-identity-js Documentation](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)
- [AWS CDK Cognito Construct](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito-readme.html)
