# Vercel Environment Variables Setup Guide

**Date**: March 9, 2026  
**Status**: Action Required

---

## 🎯 Current Issue

The frontend is deployed to Vercel but showing error:
```
Uncaught Error: Both UserPoolId and ClientId are required
```

**Root Cause**: Environment variables from `.env.production` are not loaded in Vercel. Vercel requires environment variables to be set in the dashboard.

---

## ✅ Step-by-Step Instructions

### Step 1: Access Vercel Dashboard

1. Open your browser and go to: https://vercel.com/dashboard
2. Login with your Vercel account
3. Find your project: `aibts-platform`
4. Click on the project to open it

### Step 2: Navigate to Environment Variables

1. In your project dashboard, click on **Settings** (top navigation)
2. In the left sidebar, click on **Environment Variables**

### Step 3: Add Environment Variables

Add the following 4 environment variables one by one:

#### Variable 1: VITE_API_URL
- **Key**: `VITE_API_URL`
- **Value**: `https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com`
- **Environment**: Select **Production** (check the box)
- Click **Save**

#### Variable 2: VITE_AWS_REGION
- **Key**: `VITE_AWS_REGION`
- **Value**: `us-east-1`
- **Environment**: Select **Production** (check the box)
- Click **Save**

#### Variable 3: VITE_USER_POOL_ID
- **Key**: `VITE_USER_POOL_ID`
- **Value**: `us-east-1_XPMiT3cNj`
- **Environment**: Select **Production** (check the box)
- Click **Save**

#### Variable 4: VITE_USER_POOL_CLIENT_ID
- **Key**: `VITE_USER_POOL_CLIENT_ID`
- **Value**: `3ica1emntcirbd0pij4mf4gbc1`
- **Environment**: Select **Production** (check the box)
- Click **Save**

### Step 4: Redeploy the Application

After adding all environment variables, you need to redeploy:

**Option A: Redeploy from Vercel Dashboard**
1. Go to **Deployments** tab
2. Find the latest deployment
3. Click the three dots menu (⋯)
4. Click **Redeploy**
5. Confirm the redeployment

**Option B: Redeploy from Command Line**
```powershell
cd packages/frontend
vercel --prod
```

### Step 5: Wait for Deployment

- Deployment typically takes 1-2 minutes
- Watch the deployment progress in the Vercel dashboard
- Wait for "Deployment Complete" message

### Step 6: Verify the Fix

1. Open your application: https://aibts-platform.vercel.app
2. Open browser Developer Tools (F12)
3. Go to Console tab
4. Check for errors:
   - ✅ No "UserPoolId and ClientId are required" error
   - ✅ No environment variable errors
5. The login/register page should load without errors

---

## 📋 Environment Variables Summary

Here's what each variable does:

| Variable | Purpose | Value |
|----------|---------|-------|
| `VITE_API_URL` | Backend API endpoint | https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com |
| `VITE_AWS_REGION` | AWS region for Cognito | us-east-1 |
| `VITE_USER_POOL_ID` | Cognito User Pool ID | us-east-1_XPMiT3cNj |
| `VITE_USER_POOL_CLIENT_ID` | Cognito App Client ID | 3ica1emntcirbd0pij4mf4gbc1 |

---

## 🔍 How to Verify Environment Variables Are Set

After adding variables in Vercel:

1. Go to **Settings** → **Environment Variables**
2. You should see all 4 variables listed
3. Each should show "Production" environment
4. Click on any variable to view (value will be masked)

---

## 🚨 Common Issues & Solutions

### Issue 1: Variables Not Taking Effect
**Solution**: Make sure you redeployed after adding variables. Environment variables only apply to new deployments.

### Issue 2: Still Getting Error After Redeploy
**Solution**: 
1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh the page (Ctrl + Shift + R)
3. Try in incognito/private window

### Issue 3: Can't Find Environment Variables Section
**Solution**: Make sure you're in the correct project and have proper permissions. You need to be the project owner or have admin access.

### Issue 4: Deployment Fails
**Solution**: Check the deployment logs in Vercel dashboard for specific errors.

---

## 🎯 Next Steps After Vercel Setup

Once environment variables are configured and redeployed:

1. **Test User Registration**:
   - Go to https://aibts-platform.vercel.app
   - Click "Register" or "Sign Up"
   - Enter email and password
   - Check email for verification code
   - Complete verification

2. **Test Login**:
   - Login with your credentials
   - Verify you can access the dashboard

3. **Test API Connectivity**:
   - Check browser console for any errors
   - Verify API calls are working
   - Test AI features if available

---

## 📸 Visual Guide

### Where to Find Environment Variables in Vercel:

```
Vercel Dashboard
  └── Your Project (aibts-platform)
      └── Settings (top navigation)
          └── Environment Variables (left sidebar)
              └── Add New Variable button
```

### What the Environment Variables Page Looks Like:

```
Environment Variables
┌─────────────────────────────────────────────────┐
│ Add New Variable                                │
│                                                 │
│ Key:   [________________]                       │
│ Value: [________________]                       │
│                                                 │
│ Environments:                                   │
│ ☑ Production  ☐ Preview  ☐ Development        │
│                                                 │
│ [Save]                                          │
└─────────────────────────────────────────────────┘

Existing Variables:
- VITE_API_URL (Production)
- VITE_AWS_REGION (Production)
- VITE_USER_POOL_ID (Production)
- VITE_USER_POOL_CLIENT_ID (Production)
```

---

## ✅ Verification Checklist

After completing all steps:

- [ ] All 4 environment variables added in Vercel
- [ ] Each variable set to "Production" environment
- [ ] Application redeployed
- [ ] Deployment completed successfully
- [ ] Application loads without errors
- [ ] No console errors about missing UserPoolId/ClientId
- [ ] Login/Register page displays correctly

---

## 🎉 Success Criteria

Your setup is complete when:

1. ✅ Application loads at https://aibts-platform.vercel.app
2. ✅ No errors in browser console
3. ✅ Login/Register forms are visible
4. ✅ Can register a new user
5. ✅ Receive verification email
6. ✅ Can complete verification and login

---

## 📞 Need Help?

If you encounter issues:

1. Check the Vercel deployment logs
2. Check browser console for specific errors
3. Verify all environment variables are correctly set
4. Try clearing cache and hard refresh
5. Test in incognito/private window

---

**Created**: March 9, 2026  
**AWS Account**: 982479882798  
**Vercel Project**: aibts-platform  
**Status**: ⏳ Waiting for environment variable configuration
