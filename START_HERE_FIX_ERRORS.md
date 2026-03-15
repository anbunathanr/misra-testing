# 🚨 START HERE - Fix CORS & 404 Errors

Your app is showing errors because you deployed a **partial stack**. Let's fix it!

---

## ⚡ Quick Fix (3 Steps)

### Step 1: Run Deployment Script
```powershell
.\deploy-full-stack.ps1
```
⏱️ Takes 15 minutes

### Step 2: Update Vercel
1. Go to https://vercel.com/dashboard
2. Open `aibts-platform` → Settings → Environment Variables
3. Update `VITE_API_URL` with new API endpoint (from script output)
4. Save

⏱️ Takes 2 minutes

### Step 3: Redeploy Frontend
1. Go to Deployments tab
2. Click ⋯ on latest deployment
3. Click "Redeploy"

⏱️ Takes 2 minutes

---

## ✅ Done!

Open https://aibts-platform.vercel.app - no more errors!

---

## 📖 Need More Details?

Read these guides in order:

1. **FIX_CORS_404_ERRORS_NOW.md** - Quick overview
2. **DEPLOYMENT_ISSUE_SUMMARY.md** - Full explanation
3. **VERCEL_UPDATE_AFTER_DEPLOYMENT.md** - Vercel steps

---

## 🆘 Having Issues?

Check **CORS_404_ISSUE_RESOLUTION.md** for troubleshooting.

---

**Just run the script - it handles everything!**

```powershell
.\deploy-full-stack.ps1
```
