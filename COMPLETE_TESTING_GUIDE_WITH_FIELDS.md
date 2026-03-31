# 🎯 Complete Testing Guide - All Form Fields Explained

## Platform URL
**Frontend**: https://aibts-platform.vercel.app

---

## 📝 Understanding the Form Fields

### When Creating a Project

Your project creation form has these fields:

1. **Project Name** (Required)
   - Short, descriptive name for your project
   - Example: "E-Commerce Login Tests"

2. **Description** (Required)
   - Detailed description of what you're testing
   - Example: "Testing login functionality for our e-commerce platform"

3. **Target URL** (Required)
   - The base URL of the application you want to test
   - Must be a valid URL starting with http:// or https://
   - Example: "https://example.com"
   - Example: "https://aibts-platform.vercel.app"

4. **Environment** (Required - Dropdown)
   - Select from: Development, Staging, or Production
   - This helps organize tests by environment
   - Development = "dev"
   - Staging = "staging"
   - Production = "production"

---

## 🚀 Complete Examples with All Fields

### Example 1: Testing Your Own E-Commerce Site

#### Step 1: Create Project
```
Project Name: "My Store Login Tests"
Description: "Testing user authentication flows for my online store"
Target URL: "https://mystore.com"
Environment: "Staging"
```

#### Step 2: Create Test Suite
```
Suite Name: "User Authentication"
Description: "Login, logout, and password reset tests"
Project: Select "My Store Login Tests"
```

#### Step 3: Create Test Case
```json
{
  "name": "Valid Login Test",
  "description": "User can login with correct credentials",
  "priority": "High",
  "steps": [
    {
      "action": "navigate",
      "url": "https://mystore.com/login",
      "description": "Go to login page"
    },
    {
      "action": "type",
      "selector": "#email",
      "value": "testuser@example.com",
      "description": "Enter email"
    },
    {
      "action": "type",
      "selector": "#password",
      "value": "TestPassword123!",
      "description": "Enter password"
    },
    {
      "action": "click",
      "selector": "button[type='submit']",
      "description": "Click login button"
    },
    {
      "action": "waitForNavigation",
      "url": "/dashboard",
      "description": "Wait for redirect to dashboard"
    },
    {
      "action": "assertVisible",
      "selector": ".user-profile",
      "description": "Verify user profile is visible"
    }
  ]
}
```

---

### Example 2: Testing AIBTS Platform Itself

#### Step 1: Create Project
```
Project Name: "AIBTS Platform Tests"
Description: "Testing the AIBTS platform features and workflows"
Target URL: "https://aibts-platform.vercel.app"
Environment: "Production"
```

#### Step 2: Create Test Suite
```
Suite Name: "Core Platform Features"
Description: "Tests for login, project creation, and test management"
Project: Select "AIBTS Platform Tests"
```

#### Step 3: Create Test Case - Login
```json
{
  "name": "AIBTS Login Test",
  "description": "User can login to AIBTS platform",
  "priority": "Critical",
  "steps": [
    {
      "action": "navigate",
      "url": "https://aibts-platform.vercel.app/login"
    },
    {
      "action": "type",
      "selector": "input[type='email']",
      "value": "your-email@example.com"
    },
    {
      "action": "type",
      "selector": "input[type='password']",
      "value": "YourPassword123!"
    },
    {
      "action": "click",
      "selector": "button[type='submit']"
    },
    {
      "action": "waitForNavigation",
      "url": "/dashboard",
      "timeout": 5000
    },
    {
      "action": "assertVisible",
      "selector": "h4",
      "description": "Verify dashboard header is visible"
    }
  ]
}
```

---

### Example 3: Testing a Public Website (Google)

#### Step 1: Create Project
```
Project Name: "Google Search Tests"
Description: "Testing Google search functionality"
Target URL: "https://www.google.com"
Environment: "Production"
```

#### Step 2: Create Test Suite
```
Suite Name: "Search Features"
Description: "Tests for search input and results"
Project: Select "Google Search Tests"
```

#### Step 3: Create Test Case
```json
{
  "name": "Basic Search Test",
  "description": "User can perform a search and see results",
  "priority": "High",
  "steps": [
    {
      "action": "navigate",
      "url": "https://www.google.com"
    },
    {
      "action": "type",
      "selector": "textarea[name='q']",
      "value": "automated testing"
    },
    {
      "action": "click",
      "selector": "input[name='btnK']"
    },
    {
      "action": "waitForSelector",
      "selector": "#search",
      "timeout": 5000
    },
    {
      "action": "assertVisible",
      "selector": "#search",
      "description": "Verify search results are visible"
    }
  ]
}
```

---

### Example 4: Testing a Demo E-Commerce Site

#### Step 1: Create Project
```
Project Name: "Demo Store Checkout"
Description: "Testing checkout flow on demo e-commerce site"
Target URL: "https://demo.opencart.com"
Environment: "Development"
```

#### Step 2: Create Test Suite
```
Suite Name: "Shopping Cart Tests"
Description: "Tests for adding items and checkout process"
Project: Select "Demo Store Checkout"
```

#### Step 3: Create Test Case
```json
{
  "name": "Add to Cart Test",
  "description": "User can add product to cart",
  "priority": "High",
  "steps": [
    {
      "action": "navigate",
      "url": "https://demo.opencart.com"
    },
    {
      "action": "click",
      "selector": ".product-thumb:first-child .btn-primary",
      "description": "Click add to cart on first product"
    },
    {
      "action": "waitForSelector",
      "selector": ".alert-success",
      "timeout": 3000,
      "description": "Wait for success message"
    },
    {
      "action": "assertVisible",
      "selector": ".alert-success",
      "description": "Verify success message is shown"
    }
  ]
}
```

---

## 📋 Quick Reference: All Form Fields

### Project Creation Form
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Project Name | Text | Yes | "My App Tests" |
| Description | Text Area | Yes | "Testing core features of my application" |
| Target URL | Text | Yes | "https://myapp.com" |
| Environment | Dropdown | Yes | "Development" / "Staging" / "Production" |

### Test Suite Creation Form
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Suite Name | Text | Yes | "Login Tests" |
| Description | Text Area | Yes | "Tests for user authentication" |
| Project | Dropdown | Yes | Select from your projects |

### Test Case Creation Form
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Test Case Name | Text | Yes | "Valid Login Test" |
| Description | Text Area | Yes | "User can login with valid credentials" |
| Suite | Dropdown | Yes | Select from your suites |
| Priority | Dropdown | Yes | "High" / "Medium" / "Low" |
| Steps | JSON Array | Yes | See examples above |

---

## 🎯 Step-by-Step Workflow

### 1. Login
```
1. Go to: https://aibts-platform.vercel.app/login
2. Enter your email
3. Enter your password
4. Click "Sign In"
```

### 2. Create Project
```
1. Click "Projects" in sidebar
2. Click "New Project" button
3. Fill in ALL fields:
   ✓ Project Name: "Your Project Name"
   ✓ Description: "What you're testing"
   ✓ Target URL: "https://your-site.com"
   ✓ Environment: Select one (Development/Staging/Production)
4. Click "Create"
```

### 3. Create Test Suite
```
1. Click "Test Suites" in sidebar
2. Click "Create New Suite"
3. Fill in:
   ✓ Suite Name: "Your Suite Name"
   ✓ Description: "What this suite tests"
   ✓ Project: Select the project you just created
4. Click "Create"
```

### 4. Create Test Case
```
1. Click "Test Cases" in sidebar
2. Click "Create New Test Case"
3. Fill in:
   ✓ Name: "Your Test Name"
   ✓ Description: "What this test does"
   ✓ Suite: Select the suite you just created
   ✓ Priority: Select priority level
   ✓ Steps: Copy JSON from examples above
4. Click "Create"
```

### 5. Trigger Execution
```
1. Click "Test Executions" in sidebar
2. Click "Trigger Execution"
3. Select:
   ✓ Suite: Your test suite
   ✓ Environment: Match your project environment
4. Click "Start Execution"
```

### 6. View Results
```
1. Wait for execution to complete
2. Click on the execution to view details
3. Review:
   - Overall status (Pass/Fail)
   - Individual test results
   - Screenshots (if captured)
   - Execution logs
```

---

## 💡 Pro Tips

### For Target URL:
- Always include the protocol (https:// or http://)
- Use the base URL without paths
- Good: "https://example.com"
- Bad: "example.com" or "https://example.com/login"

### For Environment:
- **Development**: Use for testing on dev servers
- **Staging**: Use for pre-production testing
- **Production**: Use for testing live sites (be careful!)

### For Test Steps:
- Start with "navigate" action to go to the page
- Use specific selectors (IDs are best)
- Add descriptions to make tests readable
- Use waits to handle loading times
- End with assertions to verify results

---

## 🔍 Common Selectors by Site Type

### E-Commerce Sites
```
Login: #email, #password, button[type='submit']
Products: .product-card, .add-to-cart, .product-title
Cart: .cart-icon, .cart-items, .checkout-button
```

### SaaS Platforms
```
Login: input[type='email'], input[type='password']
Dashboard: .dashboard, .sidebar, .main-content
Forms: #form-field, .submit-button, .error-message
```

### Content Sites
```
Navigation: .nav-link, .menu-item, .header
Search: input[name='search'], .search-button
Content: .article, .post, .content-area
```

---

## ✅ Validation Checklist

Before creating a project:
- [ ] Have a valid Target URL (with https://)
- [ ] Know which environment to test
- [ ] Have a clear project name
- [ ] Have a detailed description

Before creating a test case:
- [ ] Project is created
- [ ] Test suite is created
- [ ] Have valid CSS selectors
- [ ] Test steps are in logical order
- [ ] URLs are accessible

Before triggering execution:
- [ ] Test cases are created
- [ ] Selectors are verified (use browser DevTools)
- [ ] Target URL is accessible
- [ ] Test data is valid

---

## 🎉 Ready to Start!

Now you have all the information you need to create complete test workflows. Start with a simple project and gradually add more complex tests.

**Recommended First Test**: Test the AIBTS platform itself using Example 2 above!

