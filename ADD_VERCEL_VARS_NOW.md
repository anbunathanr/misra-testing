# 🚀 Add These 4 Variables to Vercel NOW

## The Error You're Seeing

```
Uncaught Error: Both UserPoolId and ClientId are required
```

## Why It's Happening

Your code is fixed and deployed, but Vercel doesn't know about your AWS Cognito credentials because they're not configured in the Vercel dashboard.

---

## 📝 DO THIS NOW (5 minutes)

### 1. Open Vercel Dashboard
Go to: https://vercel.com/dashboard

### 2. Open Your Project
Click on: `aibts-platform`

### 3. Go to Settings
Click: **Settings** (top navigation bar)

### 4. Go to Environment Variables
Click: **Environment Variables** (left sidebar)

### 5. Add Variable 1 of 4
```
Click "Add New Variable"

Key:   VITE_API_URL
Value: https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com

Check: ☑ Production
Click: Save
```

### 6. Add Variable 2 of 4
```
Click "Add New Variable"

Key:   VITE_AWS_REGION
Value: us-east-1

Check: ☑ Production
Click: Save
```

### 7. Add Variable 3 of 4
```
Click "Add New Variable"

Key:   VITE_USER_POOL_ID
Value: us-east-1_XPMiT3cNj

Check: ☑ Production
Click: Save
```

### 8. Add Variable 4 of 4
```
Click "Add New Variable"

Key:   VITE_USER_POOL_CLIENT_ID
Value: 3ica1emntcirbd0pij4mf4gbc1

Check: ☑ Production
Click: Save
```

### 9. Redeploy
```
1. Click "Deployments" tab
2. Find latest deployment
3. Click ⋯ (three dots)
4. Click "Redeploy"
5. Wait 1-2 minutes
```

### 10. Test
```
1. Open: https://aibts-platform.vercel.app
2. Press F12
3. Check Console tab
4. Error should be GONE! ✅
```

---

## 📋 Copy-Paste Values

```
Variable 1:
VITE_API_URL
https://jtv0za1wb5.execute-api.us-east-1.amazonaws.com

Variable 2:
VITE_AWS_REGION
us-east-1

Variable 3:
VITE_USER_POOL_ID
us-east-1_XPMiT3cNj

Variable 4:
VITE_USER_POOL_CLIENT_ID
3ica1emntcirbd0pij4mf4gbc1
```

---

## ✅ Success Looks Like This

After redeployment:
- ✅ Page loads (not blank)
- ✅ No console errors
- ✅ Login/Register forms visible
- ✅ Can register new user
- ✅ Can login

---

## 🎯 That's It!

The code is already fixed and deployed. You just need to tell Vercel about your AWS credentials by adding these 4 variables.

**Time Required**: 5 minutes  
**Difficulty**: Easy (just copy-paste)  
**Result**: Working application! 🎉

