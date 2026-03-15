# Vercel Environment Variables Troubleshooting

**Issue**: "Both UserPoolId and ClientId are required" error  
**Status**: Environment variables not loading in production

---

## 🔍 Problem Diagnosis

The error indicates that `import.meta.env.VITE_USER_POOL_ID` and `import.meta.env.VITE_USER_POOL_CLIENT_ID` are undefined in the production build.

This happens when:
1. Environment variables not set in Vercel dashboard
2. Variables set but deployment didn't rebuild
3. Variables set for wrong environment (Preview instead of Production)
4. Browser cache showing old version

---

## ✅ Solution Steps

### Step 1: Verify Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Click on your project: **aibts-platform**
3. Go to **Settings** → **Environment Variables**
4. **CRITICAL**: Check that ALL 4 variables exist AND are set for **Production**

You should see:
```
VITE_API_URL                    Production
VITE_AWS_REGION                 Production
VITE_USER_POOL_ID              Production
VITE_USER_POOL_CLIENT_ID       Production
```

### Step 2: Check Variable Values

Click on each variable to verify the values (they'll be masked):

1. **VITE_API_URL**: Should end with `.amazonaws.com`
2. **VITE_AWS_REGION**: Should be `us-east-1`
3. **VITE_USER_POOL_ID**: Should start with `us-east-1_`
4. **VITE_USER_POOL_CLIENT_ID**: Should be a long alphanumeric string

### Step 3: If Variables Are Missing or Wrong

**Delete and Re-add Each Variable**:

1. Click on the variable
2. Click **Delete**
3. Click **Add New** and enter:

```
Key: VITE_API_URL
Value: https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com
Environment: ☑ Production (MUST be checked)
```

```
Key: VITE_AWS_REGION
Value: us-east-1
Environment: ☑ Production (MUST be checked)
```

```
Key: VITE_USER_POOL_ID
Value: us-east-1_XPMiT3cNj
Environment: ☑ Production (MUST be checked)
```

```
Key: VITE_USER_POOL_CLIENT_ID
Value: 3ica1emntcirbd0pij4mf4gbc1
Environment: ☑ Production (MUST be checked)
```

### Step 4: Force a New Deployment

**IMPORTANT**: Environment variables only apply to NEW deployments.

**Option A: Redeploy from Vercel Dashboard**
1. Go to **Deployments** tab
2. Find the LATEST deployment (top of list)
3. Click the **three dots** (⋯) on the right
4. Click **Redeploy**
5. **IMPORTANT**: Make sure "Use existing Build Cache" is **UNCHECKED**
6. Click **Redeploy**

**Option B: Redeploy from Command Line**
```powershell
cd packages/frontend
vercel --prod --force
```

The `--force` flag ensures a fresh build without cache.

### Step 5: Wait for Deployment

- Wait for "Deployment Complete" (usually 1-2 minutes)
- Don't refresh the app until deployment is complete
- Check the deployment logs for any errors

### Step 6: Clear Browser Cache

After deployment completes:

1. **Hard Refresh**: Press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
2. **Or Clear Cache**:
   - Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Click "Clear data"
3. **Or Use Incognito**: Press `Ctrl + Shift + N` and visit the site

### Step 7: Verify the Fix

1. Open https://aibts-platform.vercel.app
2. Press F12 (Developer Tools)
3. Go to Console tab
4. Look for the error

**Expected Result**: No "UserPoolId and ClientId" error

---

## 🔍 Advanced Debugging

### Check if Variables Are in Build

1. Go to Vercel Dashboard → Deployments
2. Click on the latest deployment
3. Click on **Build Logs**
4. Search for "VITE_" in the logs
5. You should see the variables being used during build

### Check Network Tab

1. Open the app
2. Press F12 → Network tab
3. Refresh the page
4. Look for the main JavaScript file (e.g., `index-*.js`)
5. Click on it → Preview tab
6. Search for "UserPoolId" or "us-east-1"
7. If you find the actual values, the build worked

### Check Application Tab

1. Press F12 → Application tab (Chrome) or Storage tab (Firefox)
2. Look at Local Storage / Session Storage
3. Check if any auth-related data exists

---

## 🚨 Common Mistakes

### Mistake 1: Variables Set for Preview, Not Production
**Symptom**: Works on preview deployments but not production  
**Fix**: Edit each variable and check the "Production" checkbox

### Mistake 2: Didn't Redeploy After Adding Variables
**Symptom**: Variables exist but error persists  
**Fix**: Redeploy the application (Step 4 above)

### Mistake 3: Browser Cache
**Symptom**: Error persists even after correct deployment  
**Fix**: Hard refresh or use incognito window

### Mistake 4: Wrong Variable Names
**Symptom**: Variables exist but not recognized  
**Fix**: Ensure names start with `VITE_` (case-sensitive)

### Mistake 5: Trailing Spaces in Values
**Symptom**: Variables set but values are wrong  
**Fix**: Copy-paste values carefully, no extra spaces

---

## 📋 Verification Checklist

After following all steps, verify:

- [ ] All 4 environment variables exist in Vercel
- [ ] Each variable is set for "Production" environment
- [ ] Values are correct (no typos, no extra spaces)
- [ ] New deployment completed successfully
- [ ] Browser cache cleared
- [ ] Application loads without errors
- [ ] No "UserPoolId and ClientId" error in console

---

## 🎯 Quick Fix Command

If you want to redeploy quickly from command line:

```powershell
# Navigate to frontend
cd packages/frontend

# Force redeploy to production
vercel --prod --force

# Wait for deployment to complete
# Then clear browser cache and test
```

---

## 📞 Still Not Working?

If the error persists after following all steps:

### Check 1: Verify Vercel Project Settings
```
Dashboard → Project → Settings → General
- Framework Preset: Vite
- Build Command: npm run build
- Output Directory: dist
- Install Command: npm install
```

### Check 2: Check Build Logs
Look for errors during build that might prevent env vars from being included.

### Check 3: Verify Local .env.production
The local file should match Vercel variables:
```
VITE_API_URL=https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=us-east-1_XPMiT3cNj
VITE_USER_POOL_CLIENT_ID=3ica1emntcirbd0pij4mf4gbc1
```

### Check 4: Test Locally
```powershell
cd packages/frontend
npm run build
npm run preview
```

If it works locally but not on Vercel, the issue is with Vercel configuration.

---

## 💡 Pro Tips

1. **Always check "Production" checkbox** when adding env vars
2. **Always redeploy** after changing env vars
3. **Always clear cache** after redeployment
4. **Use incognito** to test without cache issues
5. **Check deployment logs** if build fails

---

## ✅ Success Indicators

You'll know it's fixed when:

1. ✅ No errors in browser console
2. ✅ Login/Register page displays correctly
3. ✅ Application loads without blank screen
4. ✅ Can see the AIBTS interface

---

**Created**: March 9, 2026  
**Issue**: Environment variables not loading  
**Solution**: Verify variables in Vercel, redeploy with --force, clear cache
