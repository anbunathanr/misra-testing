# Complete Guide: How to Use Your Deployed Web Testing Platform

**Live App URL**: https://aibts-platform.vercel.app

## What This App Does

This is a web testing platform that lets you:
1. Create test projects for different websites
2. Organize tests into test suites
3. Create automated test cases with steps
4. Execute tests automatically using a browser
5. View test results and execution history

## Step-by-Step Usage Guide

### Step 1: Login to the App

1. Go to https://aibts-platform.vercel.app
2. Login with your Cognito credentials
3. You'll land on the Dashboard

### Step 2: Create Your First Project

**What is a Project?** A project represents a website you want to test.

1. Click **"Projects"** in the left sidebar
2. Click **"New Project"** button
3. Fill in the form:
   - **Project Name**: "Google Homepage Test" (example)
   - **Description**: "Testing Google search functionality"
   - **Target URL**: `https://www.google.com`
   - **Environment**: Select "Development"
4. Click **"Create"**

**More Example Projects You Can Create:**
- **Name**: "GitHub Login Test"
  - **URL**: `https://github.com/login`
  - **Description**: "Testing GitHub authentication flow"

- **Name**: "Amazon Search Test"
  - **URL**: `https://www.amazon.com`
  - **Description**: "Testing Amazon product search"

### Step 3: Create a Test Suite

**What is a Test Suite?** A collection of related test cases (like "Login Tests" or "Search Tests").

1. Click on your project card to open it
2. Click **"New Test Suite"** button
3. Fill in the form:
   - **Suite Name**: "Search Functionality"
   - **Description**: "Tests for search feature"
   - **Tags**: Add tags like "smoke", "critical" (optional)
4. Click **"Create"**

### Step 4: Create Test Cases

**What is a Test Case?** A specific test with steps to execute (like "Search for a product").

1. Click **"View Tests"** on your test suite
2. Click **"New Test Case"** button
3. Fill in the basic info:
   - **Test Case Name**: "Search for 'testing'"
   - **Description**: "Verify search works correctly"
   - **Type**: Select "Functional"
   - **Priority**: Select "High"

4. **Add Test Steps** (this is the important part):

   **Example Test Steps for Google Search:**
   
   **Step 1:**
   - Action: `Navigate`
   - Target: `https://www.google.com`
   - Expected Result: "Google homepage loads"
   
   **Step 2:**
   - Action: `Type`
   - Target: `input[name="q"]` (the search box CSS selector)
   - Value: `testing`
   - Expected Result: "Text entered in search box"
   
   **Step 3:**
   - Action: `Click`
   - Target: `input[name="btnK"]` (the search button)
   - Expected Result: "Search results appear"
   
   **Step 4:**
   - Action: `Assert`
   - Target: `#search` (results container)
   - Expected Result: "Results are visible"

5. Click **"Add Step"** after each step
6. Click **"Create"** when all steps are added

### Step 5: Run Your Tests

**Option A: Run a Single Test Case**
1. Find your test case in the list
2. Click the **"Run Test"** button
3. Watch the execution status badge update
4. Click **"History"** to see results

**Option B: Run an Entire Test Suite**
1. Go back to Test Suites page
2. Click **"Run Suite"** button on a suite card
3. All test cases in that suite will execute
4. View results in the execution history

### Step 6: View Test Results

1. Click **"History"** on any test case or suite
2. You'll see a table with all executions:
   - Status (passed/failed/running)
   - Duration
   - Timestamp
   - Environment
3. Click on an execution to see detailed results:
   - Step-by-step results
   - Screenshots (if captured)
   - Error messages (if failed)

## Understanding the Sidebar Menu

- **Dashboard**: Overview of your testing activity
- **Projects**: Manage test projects (websites to test)
- **Files**: File upload feature (currently not working)
- **Analysis**: Code analysis results (for MISRA compliance - may not be used for web testing)
- **Insights**: Testing insights and patterns

## Common Test Examples

### Example 1: Login Test

**Project**: Any website with login
**Target URL**: `https://example.com/login`

**Test Steps:**
1. Navigate → `https://example.com/login`
2. Type → `input[name="username"]` → Value: `testuser`
3. Type → `input[name="password"]` → Value: `testpass123`
4. Click → `button[type="submit"]`
5. Assert → `.dashboard` → Expected: "Dashboard is visible"

### Example 2: Form Submission Test

**Project**: Contact form testing
**Target URL**: `https://example.com/contact`

**Test Steps:**
1. Navigate → `https://example.com/contact`
2. Type → `#name` → Value: `John Doe`
3. Type → `#email` → Value: `john@example.com`
4. Type → `#message` → Value: `Test message`
5. Click → `button[type="submit"]`
6. Assert → `.success-message` → Expected: "Success message appears"

### Example 3: Navigation Test

**Project**: Website navigation
**Target URL**: `https://example.com`

**Test Steps:**
1. Navigate → `https://example.com`
2. Click → `a[href="/about"]`
3. Assert → `h1` → Expected: "About page heading visible"
4. Click → `a[href="/contact"]`
5. Assert → `.contact-form` → Expected: "Contact form visible"

## Tips for Creating Good Tests

### Finding CSS Selectors

To find the right CSS selector for elements:
1. Open the website in Chrome/Firefox
2. Right-click on the element you want to test
3. Select "Inspect" or "Inspect Element"
4. In the developer tools, right-click the HTML element
5. Select "Copy" → "Copy selector"
6. Use that selector in your test steps

**Common Selectors:**
- By ID: `#elementId`
- By class: `.className`
- By name: `input[name="fieldName"]`
- By type: `button[type="submit"]`
- By text: `button:contains("Click Me")`

### Test Actions Available

- **Navigate**: Go to a URL
- **Click**: Click on an element
- **Type**: Enter text into an input field
- **Assert**: Verify an element exists or has certain properties
- **Wait**: Wait for a specified time or element
- **API Call**: Make an API request (for API testing)

## What's NOT Working

- **File Upload**: The Files page and file upload functionality is not working
- **AI Test Generation**: There's no dedicated AI test generation page in the UI (backend exists but no frontend integration)

## Troubleshooting

**If tests fail:**
1. Check the execution details for error messages
2. Verify the CSS selectors are correct
3. Make sure the target URL is accessible
4. Check if the website structure has changed

**If you can't find elements:**
1. Use browser developer tools to inspect the page
2. Try different selector strategies (ID, class, name)
3. Wait for elements to load before interacting

**If execution doesn't start:**
1. Check your internet connection
2. Verify the backend API is running
3. Check browser console for errors

## Next Steps

1. **Start Simple**: Create a basic navigation test first
2. **Use Real Websites**: Test public websites like Google, GitHub, etc.
3. **Build Test Suites**: Organize related tests together
4. **Review Results**: Check execution history regularly
5. **Iterate**: Improve tests based on results

## Example Workflow Summary

```
1. Create Project → "Google Test" (https://www.google.com)
2. Create Suite → "Search Tests"
3. Create Test Case → "Basic Search"
   - Navigate to Google
   - Type in search box
   - Click search button
   - Verify results appear
4. Run Test → Click "Run Test" button
5. View Results → Check execution history
```

## Support

If you encounter issues:
1. Check the browser console for errors (F12)
2. Verify all URLs are correct and accessible
3. Make sure you're logged in
4. Try refreshing the page

---

**Remember**: This is a web testing automation platform. You create test cases with steps, and the system executes them automatically using a headless browser, then shows you the results.
