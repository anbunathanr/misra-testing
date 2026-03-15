# Vercel Environment Variables - Update After Deployment

After running `deploy-full-stack.ps1`, you'll need to update ONE environment variable in Vercel.

---

## 🎯 What to Update

### Only This Variable Changes:

**Variable**: `VITE_API_URL`  
**Old Value**: `https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com`  
**New Value**: *(Get from deployment script output)*

### These Stay the Same:

- `VITE_AWS_REGION` = `us-east-1` ✅ (no change)
- `VITE_USER_POOL_ID` = `us-east-1_XPMiT3cNj` ✅ (no change)
- `VITE_USER_POOL_CLIENT_ID` = `3ica1emntcirbd0pij4mf4gbc1` ✅ (no change)

---

## 📋 Step-by-Step Instructions

### Step 1: Get New API URL

After running `deploy-full-stack.ps1`, look for this output:

```
========================================
  Deployment Information
========================================

API Endpoint: https://NEW-API-ID.execute-api.us-east-1.amazonaws.com
User Pool ID: us-east-1_XPMiT3cNj
Client ID: 3ica1emntcirbd0pij4mf4gbc1
```

Copy the **API Endpoint** value.

### Step 2: Open Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Find your project: `aibts-platform`
3. Click on it

### Step 3: Update Environment Variable

1. Click **Settings** (top navigation)
2. Click **Environment Variables** (left sidebar)
3. Find `VITE_API_URL`
4. Click the **⋯** (three dots) next to it
5. Click **Edit**
6. Paste the new API endpoint
7. Make sure **Production** is checked
8. Click **Save**

### Step 4: Redeploy

1. Click **Deployments** (top navigation)
2. Find the latest deployment
3. Click **⋯** (three dots) on the right
4. Click **Redeploy**
5. Wait 1-2 minutes

### Step 5: Verify

1. Open https://aibts-platform.vercel.app in incognito window
2. Press F12 → Console tab
3. Should see NO errors
4. Try creating a project - should work!

---

## 🔍 Verification

### Before Update (Errors)
```
❌ GET https://jtv0za1wb5.../projects net::ERR_FAILED 404
❌ CORS policy: No 'Access-Control-Allow-Origin' header
```

### After Update (Success)
```
✅ GET https://NEW-API-ID.../projects 200 OK
✅ No CORS errors
✅ Projects load successfully
```

---

## ⚠️ Troubleshooting

### Still Seeing Old API URL in Errors?

**Cause**: Browser cache

**Solution**:
1. Clear browser cache (Ctrl + Shift + Delete)
2. Hard refresh (Ctrl + Shift + R)
3. Try incognito window (Ctrl + Shift + N)

### Still Seeing 404 Errors?

**Cause**: Wrong API URL or deployment failed

**Solution**:
1. Verify the API URL in Vercel matches deployment output EXACTLY
2. Check CloudFormation console for deployment status
3. Run: `aws cloudformation describe-stacks --stack-name MisraPlatformStack`

### Vercel Deployment Stuck?

**Cause**: Build error

**Solution**:
1. Check deployment logs in Vercel
2. Look for build errors
3. Verify all 4 environment variables are set

---

## 📝 Quick Reference

### Current Setup (MinimalStack)
```
API: https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com
Endpoints: Only /ai-test-generation/* (4 endpoints)
Status: ❌ Missing most endpoints
```

### After Full Stack Deployment
```
API: https://NEW-ID.execute-api.us-east-1.amazonaws.com
Endpoints: All 30+ endpoints
Status: ✅ Complete platform
```

---

## ✅ Success Criteria

You'll know it worked when:

- [ ] No 404 errors in console
- [ ] No CORS errors in console
- [ ] Projects page loads
- [ ] Can create a project
- [ ] Files page loads
- [ ] Can upload a file
- [ ] Analysis page loads
- [ ] AI features work

---

## 🎉 Expected Result

After updating Vercel and redeploying:

1. ✅ Application loads without errors
2. ✅ All pages accessible
3. ✅ Can create projects
4. ✅ Can upload files
5. ✅ Can run analysis
6. ✅ Can use AI features
7. ✅ Full platform functionality

---

**Remember**: Only `VITE_API_URL` needs to change!  
**Time needed**: 2 minutes  
**Difficulty**: Easy
