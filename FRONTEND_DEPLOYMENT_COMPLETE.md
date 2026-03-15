# Frontend Deployment - Quick Reference

## ✅ What Was Prepared

1. **Production Environment** (`.env.production`)
   - API URL configured: `https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com`
   - App name set: AIBTS Platform

2. **Optimized Build Configuration** (`vite.config.ts`)
   - Source maps disabled in production
   - Code splitting configured
   - Minification enabled

3. **Vercel Configuration** (`vercel.json`)
   - SPA routing configured
   - Build settings optimized

4. **Deployment Script** (`deploy-frontend.ps1`)
   - Automated deployment process
   - Error handling included

---

## 🚀 Deploy Now (3 Simple Steps)

### Step 1: Run the Deployment Script

```powershell
.\deploy-frontend.ps1
```

This script will:
- Install Vercel CLI (if not already installed)
- Install frontend dependencies
- Build the production bundle
- Deploy to Vercel

### Step 2: Follow the Prompts

When Vercel asks:
- **Set up and deploy?** → Yes
- **Which scope?** → Choose your account
- **Link to existing project?** → No (first time)
- **Project name?** → `aibts-platform` (or your choice)
- **Directory?** → `./` (press Enter)
- **Override settings?** → No

### Step 3: Note Your URL

Vercel will display your deployment URL, like:
```
https://aibts-platform.vercel.app
```

**Save this URL!** You'll need it for CORS configuration.

---

## 🔧 Update API Gateway CORS

After deployment, update your backend to allow requests from your frontend:

### Option 1: Quick Manual Update (AWS Console)

1. Go to AWS Console → API Gateway
2. Find your API: `ai-test-generation-api`
3. Go to CORS settings
4. Add your Vercel URL to allowed origins:
   ```
   https://aibts-platform.vercel.app
   ```
5. Save changes

### Option 2: Update via CDK (Recommended)

Update your API Gateway configuration:

```typescript
// In packages/backend/src/infrastructure/minimal-stack.ts
// Find the API Gateway configuration and update CORS:

const api = new apigatewayv2.HttpApi(this, 'AITestGenerationAPI', {
  apiName: 'ai-test-generation-api',
  corsPreflight: {
    allowOrigins: [
      'http://localhost:3000', // Development
      'https://aibts-platform.vercel.app', // Production - ADD YOUR URL HERE
    ],
    allowMethods: [
      apigatewayv2.CorsHttpMethod.GET,
      apigatewayv2.CorsHttpMethod.POST,
      apigatewayv2.CorsHttpMethod.PUT,
      apigatewayv2.CorsHttpMethod.DELETE,
      apigatewayv2.CorsHttpMethod.OPTIONS,
    ],
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
    ],
    allowCredentials: true,
    maxAge: Duration.days(1),
  },
});
```

Then redeploy:
```powershell
cd packages/backend
npm run build
cdk deploy AITestGenerationStack
```

---

## ✅ Test Your Deployment

1. **Open your frontend URL** in a browser
2. **Check the console** for any errors (F12 → Console)
3. **Test navigation** - click through different pages
4. **Test API calls** - try to load projects or test cases

### Expected Behavior

- ✅ All pages load without errors
- ✅ No CORS errors in console
- ✅ API calls succeed (after CORS update)
- ✅ UI is responsive and looks good

### Common Issues

**Issue: CORS Error**
```
Access to fetch at 'https://...' from origin 'https://aibts-platform.vercel.app' 
has been blocked by CORS policy
```
**Solution:** Update API Gateway CORS settings (see above)

**Issue: 404 on Page Refresh**
```
Cannot GET /projects
```
**Solution:** Already fixed! The `vercel.json` configuration handles SPA routing.

**Issue: API calls fail with 401**
```
Unauthorized
```
**Solution:** This is expected! Authentication will be added in Phase 3.

---

## 📊 Deployment Info

### What Was Deployed

- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **UI Library:** Material-UI (MUI)
- **State Management:** Redux Toolkit
- **Routing:** React Router v6

### Bundle Sizes (Approximate)

- **Vendor chunk:** ~150-200 KB (React, React DOM, Router)
- **MUI chunk:** ~100-150 KB (Material-UI components)
- **Redux chunk:** ~50-80 KB (Redux Toolkit)
- **App code:** ~50-100 KB (your application code)
- **Total:** ~350-530 KB (gzipped: ~100-150 KB)

### Performance Targets

- ✅ Initial load: < 3 seconds
- ✅ Time to Interactive: < 5 seconds
- ✅ Lighthouse Score: > 90

---

## 🔄 Redeploy After Changes

To redeploy after making changes:

```powershell
# Quick redeploy
cd packages/frontend
npm run build
vercel --prod

# Or use the script
.\deploy-frontend.ps1
```

---

## 🎯 Next Steps

Now that your frontend is deployed:

1. ✅ **Phase 1 Complete!** Frontend is live
2. ⏳ **Phase 2:** Complete test execution features
3. ⏳ **Phase 3:** Add authentication (Cognito)
4. ⏳ **Phase 4:** Enable real OpenAI integration

---

## 📝 Vercel Dashboard

Access your deployment dashboard:
```
https://vercel.com/dashboard
```

From there you can:
- View deployment logs
- Configure custom domains
- Set environment variables
- Monitor analytics
- Manage team access

---

## 🆘 Troubleshooting

### Vercel CLI Not Installing

```powershell
# Try with admin privileges
npm install -g vercel --force
```

### Build Fails

```powershell
# Clear cache and rebuild
cd packages/frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Recurse -Force dist
npm install
npm run build
```

### Deployment Hangs

- Check your internet connection
- Try logging in again: `vercel login`
- Check Vercel status: https://www.vercel-status.com/

---

## 💡 Pro Tips

1. **Custom Domain:** Add a custom domain in Vercel dashboard (e.g., `app.yourdomain.com`)
2. **Environment Variables:** Set in Vercel dashboard under Settings → Environment Variables
3. **Preview Deployments:** Every git push creates a preview URL
4. **Automatic Deployments:** Connect to GitHub for automatic deployments on push

---

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check browser console for errors
3. Verify API Gateway CORS settings
4. Test API endpoints directly with curl/Postman

---

**Status:** ✅ Ready to deploy!

Run `.\deploy-frontend.ps1` to get started!
