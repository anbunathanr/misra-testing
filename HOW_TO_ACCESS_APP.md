# 🔓 How to Access Your Deployed App

## Your Live URL
**https://aibts-platform.vercel.app**

---

## ⚠️ Current Status

Authentication is **not implemented yet** (coming in Phase 3). To access the app, you need to enable demo mode.

---

## 🚀 Quick Access (2 Steps)

### Step 1: Open the App
Visit: **https://aibts-platform.vercel.app**

You'll see a login page.

### Step 2: Enable Demo Mode

1. Press **F12** to open browser console (or right-click → Inspect → Console tab)
2. Paste this command and press Enter:

```javascript
localStorage.setItem('demo-mode', 'true');
window.location.reload();
```

**That's it!** The page will reload and you'll see the dashboard automatically.

---

## 📱 What You'll See

After enabling demo mode, you'll have access to:

- ✅ **Dashboard** - Overview of your testing platform
- ✅ **Projects** - Manage test projects
- ✅ **Test Suites** - Organize test cases
- ✅ **Test Cases** - Individual test scenarios
- ✅ **Test Executions** - Run and monitor tests
- ✅ **Files** - File management
- ✅ **Analysis** - Test analysis
- ✅ **Insights** - Testing insights

---

## 🔒 Why Demo Mode?

Phase 1 focused on deploying the frontend. Authentication (AWS Cognito) will be added in **Phase 3**.

For now, demo mode lets you:
- Explore the UI
- See the app structure
- Test navigation
- Verify the deployment works

---

## ⚠️ Limitations

Without authentication:
- No user accounts
- No data persistence
- API calls may fail (no auth tokens)
- Anyone with demo mode can access

This is **temporary** - full authentication comes in Phase 3!

---

## 🔄 To Disable Demo Mode

If you want to go back to the login page:

```javascript
localStorage.removeItem('demo-mode');
window.location.reload();
```

---

## 🎯 Next Steps

**Phase 2:** Complete test execution features
**Phase 3:** Add real authentication (AWS Cognito)
**Phase 4:** Enable OpenAI integration

---

## 💡 Pro Tip

Bookmark this command for quick access:

```javascript
// Quick access snippet
localStorage.setItem('demo-mode', 'true'); location.reload();
```

Just paste it in the console whenever you visit the app!

---

**Enjoy exploring your deployed SaaS platform!** 🎉
