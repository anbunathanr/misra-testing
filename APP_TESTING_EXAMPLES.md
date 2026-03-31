# 🎯 App Testing Examples - Practical Guide

## Platform URL
**Frontend**: https://aibts-platform.vercel.app

---

## 📋 Example 1: Simple Login Test

### Project Details
- **Name**: "E-Commerce Login Tests"
- **Description**: "Testing login functionality for our e-commerce platform"
- **Target URL**: "https://example.com"
- **Environment**: "Development" (or "Staging" or "Production")

### Test Suite Details
- **Name**: "User Authentication Suite"
- **Description**: "Tests for login, logout, and session management"

### Test Case 1: Valid Login
```json
{
  "name": "TC001 - Valid Login",
  "description": "User can login with valid credentials",
  "priority": "High",
  "steps": [
    {
      "action": "navigate",
      "url": "https://example.com/login",
      "description": "Open login page"
    },
    {
      "action": "type",
      "selector": "#email",
      "value": "user@example.com",
      "description": "Enter email"
    },
    {
      "action": "type",
      "selector": "#password",
      "value": "SecurePass123!",
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
      "selector": ".welcome-message",
      "description": "Verify welcome message appears"
    }
  ]
}
```

### Test Case 2: Invalid Login
```json
{
  "name": "TC002 - Invalid Login",
  "description": "User sees error with invalid credentials",
  "priority": "High",
  "steps": [
    {
      "action": "navigate",
      "url": "https://example.com/login"
    },
    {
      "action": "type",
      "selector": "#email",
      "value": "wrong@example.com"
    },
    {
      "action": "type",
      "selector": "#password",
      "value": "wrongpassword"
    },
    {
      "action": "click",
      "selector": "button[type='submit']"
    },
    {
      "action": "waitForSelector",
      "selector": ".error-message",
      "description": "Wait for error message"
    },
    {
      "action": "assertText",
      "selector": ".error-message",
      "expectedText": "Invalid credentials",
      "description": "Verify error message text"
    }
  ]
}
```

---

## 📋 Example 2: E-Commerce Checkout Flow

### Project Details
- **Name**: "E-Commerce Checkout Tests"
- **Description**: "End-to-end checkout process testing"
- **Target URL**: "https://example.com"
- **Environment**: "Staging"

### Test Suite Details
- **Name**: "Checkout Flow Suite"
- **Description**: "Tests for cart, checkout, and payment"

### Test Case: Complete Purchase
```json
{
  "name": "TC003 - Complete Purchase Flow",
  "description": "User can add item to cart and complete purchase",
  "priority": "Critical",
  "steps": [
    {
      "action": "navigate",
      "url": "https://example.com/products"
    },
    {
      "action": "click",
      "selector": ".product-card:first-child .add-to-cart",
      "description": "Add first product to cart"
    },
    {
      "action": "waitForSelector",
      "selector": ".cart-badge",
      "description": "Wait for cart badge to update"
    },
    {
      "action": "click",
      "selector": ".cart-icon",
      "description": "Open cart"
    },
    {
      "action": "click",
      "selector": ".checkout-button",
      "description": "Proceed to checkout"
    },
    {
      "action": "type",
      "selector": "#shipping-address",
      "value": "123 Main St, City, State 12345"
    },
    {
      "action": "type",
      "selector": "#card-number",
      "value": "4111111111111111"
    },
    {
      "action": "type",
      "selector": "#card-expiry",
      "value": "12/25"
    },
    {
      "action": "type",
      "selector": "#card-cvc",
      "value": "123"
    },
    {
      "action": "click",
      "selector": ".place-order-button"
    },
    {
      "action": "waitForSelector",
      "selector": ".order-confirmation",
      "timeout": 10000
    },
    {
      "action": "assertVisible",
      "selector": ".order-number",
      "description": "Verify order number is displayed"
    }
  ]
}
```

---

## 📋 Example 3: Form Validation Tests

### Project Details
- **Name**: "Contact Form Tests"
- **Description**: "Testing form validation and submission"
- **Target URL**: "https://example.com"
- **Environment**: "Development"

### Test Suite Details
- **Name**: "Form Validation Suite"
- **Description**: "Tests for required fields and validation rules"

### Test Case 1: Empty Form Submission
```json
{
  "name": "TC004 - Empty Form Validation",
  "description": "Form shows errors when submitted empty",
  "priority": "Medium",
  "steps": [
    {
      "action": "navigate",
      "url": "https://example.com/contact"
    },
    {
      "action": "click",
      "selector": "button[type='submit']",
      "description": "Submit empty form"
    },
    {
      "action": "assertVisible",
      "selector": ".error-name",
      "description": "Name field shows error"
    },
    {
      "action": "assertVisible",
      "selector": ".error-email",
      "description": "Email field shows error"
    },
    {
      "action": "assertVisible",
      "selector": ".error-message",
      "description": "Message field shows error"
    }
  ]
}
```

### Test Case 2: Invalid Email Format
```json
{
  "name": "TC005 - Invalid Email Validation",
  "description": "Form validates email format",
  "priority": "Medium",
  "steps": [
    {
      "action": "navigate",
      "url": "https://example.com/contact"
    },
    {
      "action": "type",
      "selector": "#name",
      "value": "John Doe"
    },
    {
      "action": "type",
      "selector": "#email",
      "value": "invalid-email",
      "description": "Enter invalid email"
    },
    {
      "action": "type",
      "selector": "#message",
      "value": "Test message"
    },
    {
      "action": "click",
      "selector": "button[type='submit']"
    },
    {
      "action": "assertVisible",
      "selector": ".error-email"
    },
    {
      "action": "assertText",
      "selector": ".error-email",
      "expectedText": "Please enter a valid email"
    }
  ]
}
```

---

## 📋 Example 4: Search Functionality

### Project Details
- **Name**: "Search Feature Tests"
- **Description**: "Testing search and filter functionality"
- **Target URL**: "https://example.com"
- **Environment**: "Production"

### Test Suite Details
- **Name**: "Search and Filter Suite"
- **Description**: "Tests for search, filters, and results"

### Test Case: Search with Results
```json
{
  "name": "TC006 - Search Returns Results",
  "description": "User can search and see results",
  "priority": "High",
  "steps": [
    {
      "action": "navigate",
      "url": "https://example.com"
    },
    {
      "action": "type",
      "selector": "#search-input",
      "value": "laptop"
    },
    {
      "action": "click",
      "selector": ".search-button"
    },
    {
      "action": "waitForSelector",
      "selector": ".search-results"
    },
    {
      "action": "assertVisible",
      "selector": ".product-card",
      "description": "Verify products are displayed"
    },
    {
      "action": "assertText",
      "selector": ".results-count",
      "expectedText": "Found",
      "description": "Verify results count is shown"
    }
  ]
}
```

---

## 📋 Example 5: Mobile Responsive Test

### Project Details
- **Name**: "Mobile Responsiveness Tests"
- **Description**: "Testing mobile view and interactions"
- **Target URL**: "https://example.com"
- **Environment**: "Staging"

### Test Suite Details
- **Name**: "Mobile Navigation Suite"
- **Description**: "Tests for mobile menu and navigation"

### Test Case: Mobile Menu
```json
{
  "name": "TC007 - Mobile Menu Navigation",
  "description": "Mobile menu opens and navigates correctly",
  "priority": "Medium",
  "steps": [
    {
      "action": "setViewport",
      "width": 375,
      "height": 667,
      "description": "Set mobile viewport (iPhone)"
    },
    {
      "action": "navigate",
      "url": "https://example.com"
    },
    {
      "action": "click",
      "selector": ".hamburger-menu",
      "description": "Open mobile menu"
    },
    {
      "action": "waitForSelector",
      "selector": ".mobile-nav.open"
    },
    {
      "action": "assertVisible",
      "selector": ".mobile-nav-item",
      "description": "Verify menu items are visible"
    },
    {
      "action": "click",
      "selector": ".mobile-nav-item:nth-child(2)"
    },
    {
      "action": "waitForNavigation",
      "url": "/products"
    }
  ]
}
```

---

## 📋 Example 6: API Testing (Your Platform)

### Project Details
- **Name**: "AIBTS Platform API Tests"
- **Description**: "Testing AIBTS platform functionality"
- **Target URL**: "https://aibts-platform.vercel.app"
- **Environment**: "Production"

### Test Suite Details
- **Name**: "Platform Core Features"
- **Description**: "Tests for login, projects, and test management"

### Test Case 1: Login to AIBTS
```json
{
  "name": "TC008 - AIBTS Login",
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
      "selector": ".dashboard-header",
      "description": "Verify dashboard loaded"
    }
  ]
}
```

### Test Case 2: Create Project
```json
{
  "name": "TC009 - Create New Project",
  "description": "User can create a new project",
  "priority": "High",
  "steps": [
    {
      "action": "navigate",
      "url": "https://aibts-platform.vercel.app/projects"
    },
    {
      "action": "click",
      "selector": ".create-project-button"
    },
    {
      "action": "type",
      "selector": "#project-name",
      "value": "Test Project Demo"
    },
    {
      "action": "type",
      "selector": "#project-description",
      "value": "This is a demo project for testing"
    },
    {
      "action": "click",
      "selector": ".submit-button"
    },
    {
      "action": "waitForSelector",
      "selector": ".success-message",
      "timeout": 3000
    },
    {
      "action": "assertText",
      "selector": ".project-name",
      "expectedText": "Test Project Demo"
    }
  ]
}
```

---

## 🎨 Common Selectors Reference

### Input Fields
```
Email: input[type='email'], #email, [name='email']
Password: input[type='password'], #password, [name='password']
Text: input[type='text'], #name, [name='name']
Textarea: textarea, #message, [name='message']
```

### Buttons
```
Submit: button[type='submit'], .submit-button, #submit
Cancel: button[type='button'], .cancel-button
Primary: .btn-primary, .primary-button
```

### Common Elements
```
Error Messages: .error, .error-message, .alert-danger
Success Messages: .success, .success-message, .alert-success
Loading: .loading, .spinner, .loader
Modal: .modal, .dialog, .popup
```

---

## 📝 Step-by-Step: How to Use These Examples

### 1. Login to Platform
```
1. Go to: https://aibts-platform.vercel.app/login
2. Enter your email and password
3. Click "Sign In"
```

### 2. Create Project
```
1. Click "Projects" in sidebar
2. Click "Create New Project" or "New Project" button
3. Fill in the form:
   - Name: "E-Commerce Login Tests"
   - Description: "Testing login functionality for our e-commerce platform"
   - Target URL: "https://example.com"
   - Environment: Select "Development" (or "Staging" or "Production")
4. Click "Create"
```

### 3. Create Test Suite
```
1. Click "Test Suites" in sidebar
2. Click "Create New Suite"
3. Enter:
   - Name: "User Authentication Suite"
   - Description: "Tests for login and logout"
   - Project: Select "E-Commerce Login Tests"
4. Click "Create"
```

### 4. Create Test Case
```
1. Click "Test Cases" in sidebar
2. Click "Create New Test Case"
3. Enter:
   - Name: "TC001 - Valid Login"
   - Description: "User can login with valid credentials"
   - Suite: Select "User Authentication Suite"
   - Priority: "High"
4. Add steps (copy from examples above)
5. Click "Create"
```

### 5. Trigger Execution
```
1. Click "Test Executions" in sidebar
2. Click "Trigger Execution"
3. Select:
   - Suite: "User Authentication Suite"
   - Environment: "Production"
4. Click "Start Execution"
```

### 6. View Results
```
1. Wait for execution to complete
2. Click on execution to view details
3. Review:
   - Overall status
   - Individual test results
   - Screenshots (if captured)
   - Execution logs
```

---

## 🚀 Quick Start Templates

### Template 1: Basic Navigation Test
```json
{
  "name": "Navigation Test",
  "steps": [
    {"action": "navigate", "url": "https://example.com"},
    {"action": "click", "selector": ".nav-link"},
    {"action": "waitForNavigation", "url": "/page"},
    {"action": "assertVisible", "selector": ".page-content"}
  ]
}
```

### Template 2: Form Fill Test
```json
{
  "name": "Form Fill Test",
  "steps": [
    {"action": "navigate", "url": "https://example.com/form"},
    {"action": "type", "selector": "#field1", "value": "value1"},
    {"action": "type", "selector": "#field2", "value": "value2"},
    {"action": "click", "selector": "button[type='submit']"},
    {"action": "waitForSelector", "selector": ".success"}
  ]
}
```

### Template 3: Element Visibility Test
```json
{
  "name": "Visibility Test",
  "steps": [
    {"action": "navigate", "url": "https://example.com"},
    {"action": "assertVisible", "selector": ".header"},
    {"action": "assertVisible", "selector": ".footer"},
    {"action": "assertText", "selector": "h1", "expectedText": "Welcome"}
  ]
}
```

---

## ✅ Testing Checklist

Before triggering execution, verify:

- [ ] All test cases have clear names
- [ ] Selectors are correct (use browser DevTools to verify)
- [ ] URLs are accessible
- [ ] Steps are in logical order
- [ ] Timeouts are reasonable (default: 30s)
- [ ] Expected text matches exactly
- [ ] Test data is valid

---

## 💡 Pro Tips

1. **Use Specific Selectors**: Prefer IDs over classes
   - Good: `#email-input`
   - Okay: `.email-field`
   - Avoid: `div > div > input`

2. **Add Descriptions**: Help future you understand the test
   ```json
   {
     "action": "click",
     "selector": ".submit",
     "description": "Submit the login form"
   }
   ```

3. **Use Waits**: Don't rush, let pages load
   ```json
   {"action": "waitForSelector", "selector": ".content", "timeout": 5000}
   ```

4. **Test One Thing**: Each test case should test one specific feature

5. **Use Realistic Data**: Use data that mimics real user behavior

---

**Ready to test?** Start with Example 1 (Simple Login Test) and work your way up! 🚀
