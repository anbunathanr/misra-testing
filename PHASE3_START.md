# Phase 3: Authentication System - Getting Started

## Overview
Phase 3 implements AWS Cognito for user authentication, replacing the temporary demo mode with real user registration, login, and session management.

---

## What We'll Build

### 1. AWS Cognito Infrastructure
- User Pool for user management
- User Pool Client for web application
- Cognito Authorizer for API Gateway
- Email verification and password recovery

### 2. Backend Integration
- Cognito authorizer on API Gateway routes
- User profile synchronization to DynamoDB
- JWT token validation (already exists, will integrate with Cognito)

### 3. Frontend Authentication
- Registration page with Cognito integration
- Login page with Cognito integration
- Protected routes (replace demo mode)
- Token management and refresh
- User profile page

### 4. Remove Demo Mode
- Remove `demo-mode` localStorage check
- Remove temporary auth bypass
- Implement real authentication flow

---

## Phase 3 Tasks (14 tasks)

### Task 9: Set Up AWS Cognito (5 subtasks)
- [ ] 9.1 Create Cognito User Pool
- [ ] 9.2 Create User Pool Client
- [ ] 9.3 Deploy Cognito infrastructure
- [ ] 9.4 Create Cognito authorizer for API Gateway
- [ ] 9.5 Apply authorizer to protected routes

### Task 10: Implement User Registration (3 subtasks)
- [ ] 10.1 Create registration Lambda function (optional)
- [ ] 10.2 Update frontend registration page
- [ ] 10.3 Test registration flow

### Task 11: Implement User Login (4 subtasks)
- [ ] 11.1 Create AuthService in frontend
- [ ] 11.2 Update Redux auth slice
- [ ] 11.3 Update login page
- [ ] 11.4 Test login flow

### Task 12: Implement Protected Routes (3 subtasks)
- [ ] 12.1 Create ProtectedRoute component (update existing)
- [ ] 12.2 Wrap protected routes
- [ ] 12.3 Implement token refresh logic

### Task 13: Update API Integration (3 subtasks)
- [ ] 13.1 Update baseApi to include auth token
- [ ] 13.2 Test authenticated API calls
- [ ] 13.3 Test unauthenticated API calls

### Task 14: Implement User Profile (3 subtasks)
- [ ] 14.1 Create profile page
- [ ] 14.2 Implement profile update
- [ ] 14.3 Implement password change

---

## Current State

### ✅ Already Implemented
- Authentication middleware (`packages/backend/src/middleware/auth-middleware.ts`)
- JWT validation utilities
- Protected route component (with demo mode)
- Auth Redux slice (with demo mode)
- Login/Register pages (UI only, no backend integration)
- User profile page (UI only)

### 🔄 Needs Update
- Remove demo mode from ProtectedRoute
- Remove demo mode from authSlice
- Connect login/register pages to Cognito
- Connect profile page to Cognito
- Add Cognito authorizer to API Gateway

### 🆕 Needs Creation
- Cognito User Pool infrastructure
- Cognito User Pool Client
- AuthService for Cognito integration
- Token refresh logic
- User profile sync Lambda (optional)

---

## Implementation Strategy

### Step 1: Backend Infrastructure (Tasks 9.1-9.3)
1. Create Cognito User Pool with CDK
2. Configure password policy and email verification
3. Create User Pool Client for web app
4. Deploy and note User Pool ID and Client ID

### Step 2: API Gateway Integration (Tasks 9.4-9.5)
1. Create Cognito authorizer
2. Apply to all protected routes
3. Test with Cognito tokens

### Step 3: Frontend AuthService (Task 11.1)
1. Install `amazon-cognito-identity-js`
2. Create AuthService with Cognito methods
3. Implement login, register, logout, getToken

### Step 4: Update Redux (Task 11.2)
1. Remove demo mode logic
2. Add Cognito token management
3. Persist tokens to localStorage

### Step 5: Update Components (Tasks 10.2, 11.3, 12.1-12.2)
1. Connect registration page to AuthService
2. Connect login page to AuthService
3. Update ProtectedRoute to use real auth
4. Remove demo mode checks

### Step 6: Profile Management (Task 14)
1. Connect profile page to Cognito
2. Implement profile updates
3. Implement password change

### Step 7: Testing (Tasks 10.3, 11.4, 13.2-13.3)
1. Test registration flow
2. Test login flow
3. Test protected routes
4. Test API calls with tokens
5. Test logout

---

## Files to Create

### Backend
```
packages/backend/src/infrastructure/
└── cognito-auth.ts                    # Cognito User Pool infrastructure

packages/backend/src/functions/auth/
└── sync-user.ts                       # Optional: Sync Cognito user to DynamoDB
```

### Frontend
```
packages/frontend/src/services/
└── auth-service.ts                    # Cognito integration service

packages/frontend/src/components/
└── ProtectedRoute.tsx                 # Update to remove demo mode
```

### Configuration
```
packages/frontend/.env.production       # Add Cognito config
```

---

## Files to Update

### Backend
```
packages/backend/src/infrastructure/
└── misra-platform-stack.ts            # Add Cognito authorizer to routes

packages/backend/src/middleware/
└── auth-middleware.ts                 # Update to work with Cognito tokens
```

### Frontend
```
packages/frontend/src/store/slices/
└── authSlice.ts                       # Remove demo mode, add Cognito

packages/frontend/src/store/api/
└── baseApi.ts                         # Add Cognito token to requests

packages/frontend/src/pages/
├── LoginPage.tsx                      # Connect to AuthService
├── RegisterPage.tsx                   # Connect to AuthService (if exists)
└── ProfilePage.tsx                    # Connect to Cognito

packages/frontend/src/App.tsx          # Update route protection
```

---

## Environment Variables

### Frontend (.env.production)
```env
VITE_API_URL=https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_COGNITO_REGION=us-east-1
```

---

## Dependencies

### Frontend
```bash
cd packages/frontend
npm install amazon-cognito-identity-js
```

### Backend
No new dependencies needed (AWS SDK already included)

---

## Testing Checklist

### Registration Flow
- [ ] User can register with email and password
- [ ] Email verification sent (if enabled)
- [ ] User created in Cognito
- [ ] User synced to DynamoDB (if implemented)
- [ ] Error handling for duplicate emails
- [ ] Password validation working

### Login Flow
- [ ] User can login with valid credentials
- [ ] JWT token received and stored
- [ ] User redirected to dashboard
- [ ] Error handling for invalid credentials
- [ ] Error handling for unverified email

### Protected Routes
- [ ] Unauthenticated users redirected to login
- [ ] Authenticated users can access protected pages
- [ ] Token expiration handled
- [ ] Token refresh working
- [ ] Logout clears tokens and redirects

### API Integration
- [ ] API calls include Cognito token
- [ ] 401 responses trigger logout
- [ ] Token refresh before API calls
- [ ] Error messages displayed properly

### Profile Management
- [ ] User can view profile
- [ ] User can update name/email
- [ ] User can change password
- [ ] Changes saved to Cognito
- [ ] Error handling working

---

## Success Criteria

Phase 3 is complete when:
- ✅ Cognito User Pool deployed
- ✅ Users can register and login
- ✅ Demo mode completely removed
- ✅ All API routes protected with Cognito
- ✅ Token refresh working
- ✅ Profile management working
- ✅ Complete auth flow tested end-to-end

---

## Estimated Timeline

- **Task 9 (Cognito Setup)**: 2-3 hours
- **Task 10 (Registration)**: 1-2 hours
- **Task 11 (Login)**: 2-3 hours
- **Task 12 (Protected Routes)**: 1-2 hours
- **Task 13 (API Integration)**: 1-2 hours
- **Task 14 (Profile)**: 2-3 hours

**Total**: 9-15 hours (1-2 days)

---

## Next Steps

1. Start with Task 9.1: Create Cognito User Pool infrastructure
2. Deploy and get User Pool ID and Client ID
3. Create AuthService in frontend
4. Update login/register pages
5. Remove demo mode
6. Test complete flow

Let's begin! 🚀

---

**Started**: February 23, 2024  
**Status**: 🔄 IN PROGRESS (0/14 tasks complete)  
**Previous Phase**: Phase 2 - Complete ✅  
**Next Phase**: Phase 4 - OpenAI Integration
