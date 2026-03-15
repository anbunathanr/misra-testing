# AIBTS Platform - Simple User Guide

**Website:** https://aibts-platform.vercel.app

---

## What This App Does

AIBTS (AI Browser Testing System) is an AI-powered platform for generating and managing automated browser tests for web applications.

---

## How to Use the App

### 1. Register & Login

**First Time:**
1. Click "Register" on the login page
2. Enter your email and password
3. Check your email for a verification code
4. Enter the code to verify your account
5. Login with your credentials

**Returning Users:**
- Just login with your email and password

---

### 2. After Login - Dashboard

Once logged in, you'll see the main dashboard with:

- **Usage Stats:** Shows your AI API usage (you have 1,000 free requests per day with Hugging Face)
- **Navigation Menu:** Access different sections of the app

---

### 3. Main Features (What Works)

#### A. AI Test Generation
**Purpose:** Use AI to automatically generate test cases for your web application

**How it works:**
1. Go to "AI Test Generation" in the sidebar
2. Enter a URL of the website you want to test
3. Click "Analyze" - AI will analyze the page and suggest test scenarios
4. Click "Generate" - AI will create automated test cases
5. View the generated test cases

**Note:** This uses Hugging Face AI (free tier, 1,000 requests/day)

#### B. Projects
**Purpose:** Organize your testing work into projects

**How it works:**
1. Go to "Projects" in the sidebar
2. Click "Create Project"
3. Enter project name and description
4. View all your projects in a list

#### C. Test Cases
**Purpose:** Manually create and manage individual test cases

**How it works:**
1. Go to "Test Cases" in the sidebar
2. Click "Create Test Case"
3. Fill in:
   - Test name
   - Description
   - Steps to execute
   - Expected results
4. View and edit your test cases

#### D. Test Suites
**Purpose:** Group multiple test cases together

**How it works:**
1. Go to "Test Suites" in the sidebar
2. Click "Create Suite"
3. Enter suite name
4. Select test cases to include
5. Run the entire suite at once

#### E. Test Executions
**Purpose:** Run your tests and see results

**How it works:**
1. Go to "Test Executions" in the sidebar
2. Select a test suite
3. Click "Execute"
4. View results:
   - Pass/Fail status
   - Screenshots (if available)
   - Execution logs
   - Timing information

#### F. Profile
**Purpose:** Manage your account

**How it works:**
1. Click your profile icon (top right)
2. View your account details
3. Change password if needed
4. Logout

---

## 🚨 Known Issues

### File Upload Not Working
**Issue:** The file upload feature is currently not functional

**What this means:**
- You cannot upload test files directly
- You cannot import test cases from files
- You need to create test cases manually through the UI

**Workaround:**
- Use the AI Test Generation feature instead
- Manually create test cases through the "Test Cases" page
- Use the API directly if you're technical

**Why:** The file upload endpoints may need additional configuration or the S3 bucket permissions need to be updated

---

## Quick Workflow Example

Here's a typical workflow:

1. **Login** to your account
2. **Create a Project** (e.g., "My Website Tests")
3. **Use AI Generation:**
   - Enter your website URL
   - Let AI analyze and generate test cases
4. **Create a Test Suite:**
   - Group the generated test cases
   - Name it (e.g., "Homepage Tests")
5. **Execute the Suite:**
   - Run all tests at once
   - View results and screenshots
6. **Review Results:**
   - Check which tests passed/failed
   - View execution logs
   - Fix issues and re-run

---

## Tips

1. **Start Small:** Create a few test cases first to understand the system
2. **Use AI:** The AI generation feature is the fastest way to create tests
3. **Organize:** Use projects to keep different websites/apps separate
4. **Check Usage:** Monitor your AI usage to stay within the free tier (1,000 requests/day)
5. **Save Work:** All your data is saved automatically

---

## Limitations (Current MVP)

1. **No File Upload:** Cannot upload test files (noted above)
2. **Basic Browser Testing:** Limited to simple web interactions
3. **No Advanced Features:** No CI/CD integration, no team collaboration yet
4. **Free Tier Only:** Using Hugging Face free tier (1,000 requests/day)

---

## Support

If something doesn't work:
1. Check the browser console (F12) for errors
2. Try logging out and back in
3. Clear your browser cache
4. Check if you've exceeded the daily AI usage limit

---

## What's Next (Future Enhancements)

Potential future features:
- File upload functionality (fix the current issue)
- Advanced test scenarios
- Team collaboration
- CI/CD integration
- More AI models
- Better reporting
- Scheduled test runs

---

## Summary

**What Works:**
- ✅ User registration and login
- ✅ AI test generation (1,000 free requests/day)
- ✅ Manual test case creation
- ✅ Test suite management
- ✅ Test execution with results
- ✅ Project organization
- ✅ User profile management

**What Doesn't Work:**
- ❌ File upload feature

**Cost:** FREE (within Hugging Face limits)

**URL:** https://aibts-platform.vercel.app

Enjoy testing! 🚀
