# 🚀 How to Use AIBTS Platform - Complete Guide

## Overview

This guide walks you through using the AI-Based Test System (AIBTS) platform from initial setup to running automated tests with AI-generated test cases.

**API Gateway URL**: `https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com`

---

## 📋 Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [Create a Project](#2-create-a-project)
3. [Create Test Cases (Manual)](#3-create-test-cases-manual)
4. [Generate Test Cases with AI](#4-generate-test-cases-with-ai)
5. [Create Test Suites](#5-create-test-suites)
6. [Execute Tests](#6-execute-tests)
7. [View Test Results](#7-view-test-results)
8. [Configure Notifications](#8-configure-notifications)
9. [Monitor and Analyze](#9-monitor-and-analyze)

---

## 1. Initial Setup

### Step 1.1: Create a User Account

First, create a user in the DynamoDB Users table:

```bash
# Using AWS CLI
aws dynamodb put-item \
  --table-name aibts-users \
  --item '{
    "userId": {"S": "user-001"},
    "email": {"S": "your-email@example.com"},
    "name": {"S": "Your Name"},
    "role": {"S": "admin"},
    "createdAt": {"N": "'$(date +%s)'"}
  }'
```

### Step 1.2: Get Authentication Token

For now, you'll need to generate a JWT token manually or use the authentication endpoint:

```bash
# Example: Login (if auth endpoint is configured)
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

**Save the token** - you'll use it in all subsequent requests as:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Step 1.3: Verify API Access

Test the health endpoint:

```bash
curl https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-20T10:00:00.000Z"
}
```

---

## 2. Create a Project

Projects organize your test cases and define the target application.

### Step 2.1: Create a New Project

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "My Web App Tests",
    "description": "Automated tests for my web application",
    "targetUrl": "https://example.com",
    "settings": {
      "timeout": 30000,
      "retryAttempts": 3
    }
  }'
```

Response:
```json
{
  "projectId": "proj-abc123",
  "name": "My Web App Tests",
  "targetUrl": "https://example.com",
  "createdAt": "2026-02-20T10:00:00.000Z"
}
```

**Save the `projectId`** - you'll need it for creating test cases.

### Step 2.2: List All Projects

```bash
curl -X GET https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/projects \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 3. Create Test Cases (Manual)

Test cases define the steps to execute on your web application.

### Step 3.1: Create a Simple Test Case

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/test-cases \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "proj-abc123",
    "name": "Login Test",
    "description": "Test user login functionality",
    "steps": [
      {
        "action": "navigate",
        "target": "https://example.com/login",
        "description": "Navigate to login page"
      },
      {
        "action": "type",
        "target": "#username",
        "value": "testuser@example.com",
        "description": "Enter username"
      },
      {
        "action": "type",
        "target": "#password",
        "value": "password123",
        "description": "Enter password"
      },
      {
        "action": "click",
        "target": "#login-button",
        "description": "Click login button"
      },
      {
        "action": "waitForSelector",
        "target": ".dashboard",
        "description": "Wait for dashboard to load"
      }
    ],
    "expectedResult": "User successfully logs in and sees dashboard"
  }'
```

Response:
```json
{
  "testCaseId": "test-xyz789",
  "projectId": "proj-abc123",
  "name": "Login Test",
  "createdAt": "2026-02-20T10:05:00.000Z"
}
```

### Step 3.2: Available Test Actions

The platform supports these actions:

- **navigate**: Go to a URL
  ```json
  {"action": "navigate", "target": "https://example.com"}
  ```

- **click**: Click an element
  ```json
  {"action": "click", "target": "#button-id"}
  ```

- **type**: Enter text into an input
  ```json
  {"action": "type", "target": "#input-id", "value": "text"}
  ```

- **waitForSelector**: Wait for element to appear
  ```json
  {"action": "waitForSelector", "target": ".element-class"}
  ```

- **assertText**: Verify text content
  ```json
  {"action": "assertText", "target": "#element", "value": "expected text"}
  ```

- **assertVisible**: Verify element is visible
  ```json
  {"action": "assertVisible", "target": "#element"}
  ```

- **screenshot**: Take a screenshot
  ```json
  {"action": "screenshot", "target": "screenshot-name"}
  ```

### Step 3.3: List Test Cases

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/test-cases?projectId=proj-abc123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 4. Generate Test Cases with AI

Use AI to automatically generate test cases by analyzing your web application.

### Step 4.1: Analyze Your Application

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "url": "https://example.com",
    "options": {
      "timeout": 30000,
      "waitForSelector": "body"
    }
  }'
```

Response:
```json
{
  "analysisId": "analysis-123",
  "url": "https://example.com",
  "elements": [
    {
      "selector": "#login-button",
      "type": "button",
      "text": "Login"
    },
    {
      "selector": "#username",
      "type": "input",
      "placeholder": "Email"
    }
  ],
  "suggestions": [
    "Test login functionality",
    "Test form validation",
    "Test navigation"
  ]
}
```

### Step 4.2: Generate Test Cases

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "proj-abc123",
    "url": "https://example.com",
    "testScenarios": [
      "User login with valid credentials",
      "User login with invalid credentials",
      "Form validation on empty fields"
    ],
    "options": {
      "model": "gpt-4",
      "temperature": 0.7
    }
  }'
```

Response:
```json
{
  "generationId": "gen-456",
  "testCases": [
    {
      "testCaseId": "test-ai-001",
      "name": "User login with valid credentials",
      "steps": [...],
      "confidence": 0.95
    },
    {
      "testCaseId": "test-ai-002",
      "name": "User login with invalid credentials",
      "steps": [...],
      "confidence": 0.92
    }
  ],
  "cost": {
    "tokens": 1500,
    "estimatedCost": 0.03
  }
}
```

### Step 4.3: Batch Generate Multiple Tests

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "proj-abc123",
    "requests": [
      {
        "url": "https://example.com/login",
        "scenarios": ["Login flow", "Password reset"]
      },
      {
        "url": "https://example.com/signup",
        "scenarios": ["Registration flow", "Email verification"]
      }
    ]
  }'
```

### Step 4.4: Check AI Usage and Costs

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/usage?userId=user-001" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "userId": "user-001",
  "currentMonth": {
    "totalCalls": 15,
    "totalCost": 2.45,
    "totalTokens": 45000
  },
  "limits": {
    "monthlyCostLimit": 100,
    "dailyCallLimit": 100
  },
  "remaining": {
    "costRemaining": 97.55,
    "callsRemainingToday": 85
  }
}
```

---

## 5. Create Test Suites

Test suites group multiple test cases for organized execution.

### Step 5.1: Create a Test Suite

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/test-suites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "projectId": "proj-abc123",
    "name": "Authentication Tests",
    "description": "All authentication-related tests",
    "testCaseIds": [
      "test-xyz789",
      "test-ai-001",
      "test-ai-002"
    ],
    "schedule": {
      "enabled": true,
      "cron": "0 2 * * *",
      "timezone": "America/New_York"
    }
  }'
```

Response:
```json
{
  "suiteId": "suite-def456",
  "name": "Authentication Tests",
  "testCaseCount": 3,
  "createdAt": "2026-02-20T10:15:00.000Z"
}
```

### Step 5.2: List Test Suites

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/test-suites?projectId=proj-abc123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 6. Execute Tests

### Step 6.1: Execute a Single Test Case

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "testCaseId": "test-xyz789",
    "projectId": "proj-abc123",
    "options": {
      "browser": "chromium",
      "headless": true,
      "timeout": 30000
    }
  }'
```

Response:
```json
{
  "executionId": "exec-111222",
  "testCaseId": "test-xyz789",
  "status": "queued",
  "queuedAt": "2026-02-20T10:20:00.000Z"
}
```

### Step 6.2: Execute a Test Suite

```bash
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/trigger-suite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "suiteId": "suite-def456",
    "projectId": "proj-abc123",
    "options": {
      "parallel": true,
      "maxConcurrency": 3
    }
  }'
```

Response:
```json
{
  "suiteExecutionId": "suite-exec-333",
  "suiteId": "suite-def456",
  "executionIds": [
    "exec-111222",
    "exec-111223",
    "exec-111224"
  ],
  "status": "running",
  "startedAt": "2026-02-20T10:25:00.000Z"
}
```

### Step 6.3: Check Execution Status

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/exec-111222/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "executionId": "exec-111222",
  "status": "running",
  "progress": {
    "currentStep": 3,
    "totalSteps": 5,
    "percentage": 60
  },
  "startedAt": "2026-02-20T10:20:05.000Z"
}
```

---

## 7. View Test Results

### Step 7.1: Get Execution Results

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/exec-111222/results" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "executionId": "exec-111222",
  "testCaseId": "test-xyz789",
  "status": "completed",
  "result": "passed",
  "duration": 5432,
  "steps": [
    {
      "stepNumber": 1,
      "action": "navigate",
      "status": "passed",
      "duration": 1200
    },
    {
      "stepNumber": 2,
      "action": "type",
      "status": "passed",
      "duration": 150
    }
  ],
  "screenshots": [
    "https://s3.amazonaws.com/aibts-screenshots/exec-111222/step-1.png",
    "https://s3.amazonaws.com/aibts-screenshots/exec-111222/step-5.png"
  ],
  "completedAt": "2026-02-20T10:20:10.432Z"
}
```

### Step 7.2: Get Suite Execution Results

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/suite-exec-333/results" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "suiteExecutionId": "suite-exec-333",
  "suiteId": "suite-def456",
  "status": "completed",
  "summary": {
    "total": 3,
    "passed": 2,
    "failed": 1,
    "error": 0
  },
  "executions": [
    {
      "executionId": "exec-111222",
      "testCaseId": "test-xyz789",
      "result": "passed",
      "duration": 5432
    },
    {
      "executionId": "exec-111223",
      "testCaseId": "test-ai-001",
      "result": "passed",
      "duration": 4821
    },
    {
      "executionId": "exec-111224",
      "testCaseId": "test-ai-002",
      "result": "failed",
      "duration": 3210,
      "errorMessage": "Element not found: #submit-button"
    }
  ],
  "completedAt": "2026-02-20T10:25:15.000Z"
}
```

### Step 7.3: Get Execution History

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/history?projectId=proj-abc123&limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 8. Configure Notifications

Get notified when tests complete, fail, or on a schedule.

### Step 8.1: Set Up Notification Preferences

```bash
curl -X PUT https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/notifications/preferences \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "userId": "user-001",
    "preferences": {
      "testCompletion": {
        "enabled": true,
        "channels": ["email"]
      },
      "testFailure": {
        "enabled": true,
        "channels": ["email", "slack"]
      },
      "criticalAlert": {
        "enabled": true,
        "channels": ["email", "sms", "slack"]
      },
      "summaryReport": {
        "enabled": true,
        "channels": ["email"],
        "frequency": "daily"
      }
    },
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00",
      "timezone": "America/New_York"
    },
    "slackWebhooks": [
      {
        "webhookUrl": "https://hooks.slack.com/services/YOUR/WEBHOOK/URL",
        "channel": "#test-alerts",
        "eventTypes": ["test_failure", "critical_alert"]
      }
    ]
  }'
```

### Step 8.2: Get Notification Templates

```bash
curl -X GET https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/notifications/templates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 8.3: View Notification History

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/notifications/history?userId=user-001&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 9. Monitor and Analyze

### Step 9.1: View Dashboard Metrics

Access the frontend dashboard (if deployed):
```
http://localhost:5173
```

Or query metrics via API:

```bash
# Get project statistics
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/projects/proj-abc123/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Response:
```json
{
  "projectId": "proj-abc123",
  "stats": {
    "totalTestCases": 15,
    "totalExecutions": 234,
    "passRate": 87.5,
    "averageDuration": 4523,
    "lastExecution": "2026-02-20T10:25:15.000Z"
  },
  "trends": {
    "executionsThisWeek": 45,
    "passRateChange": 2.3,
    "failureRate": 12.5
  }
}
```

### Step 9.2: Analyze Test Failures

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/failures?projectId=proj-abc123&days=7" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Step 9.3: View AI Generation Insights

```bash
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/insights?projectId=proj-abc123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Complete Workflow Example

Here's a complete workflow from start to finish:

```bash
# 1. Create a project
PROJECT_ID=$(curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"E-commerce Tests","targetUrl":"https://shop.example.com"}' \
  | jq -r '.projectId')

# 2. Generate AI test cases
curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"projectId\":\"$PROJECT_ID\",
    \"url\":\"https://shop.example.com\",
    \"testScenarios\":[\"Add item to cart\",\"Checkout process\",\"Search products\"]
  }"

# 3. Create a test suite
SUITE_ID=$(curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/test-suites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"projectId\":\"$PROJECT_ID\",\"name\":\"E-commerce Flow\",\"testCaseIds\":[...]}" \
  | jq -r '.suiteId')

# 4. Execute the suite
EXEC_ID=$(curl -X POST https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/trigger-suite \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"suiteId\":\"$SUITE_ID\",\"projectId\":\"$PROJECT_ID\"}" \
  | jq -r '.suiteExecutionId')

# 5. Wait and check results
sleep 30
curl -X GET "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/executions/$EXEC_ID/results" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔧 Tips and Best Practices

1. **Start Small**: Begin with 2-3 simple test cases before scaling up
2. **Use AI Wisely**: AI-generated tests are great for coverage, but review and refine them
3. **Monitor Costs**: Check AI usage regularly to stay within budget
4. **Set Up Notifications**: Configure alerts for failures to catch issues quickly
5. **Use Test Suites**: Group related tests for better organization
6. **Schedule Tests**: Run tests automatically on a schedule (nightly, weekly)
7. **Review Screenshots**: Check screenshots on failures to debug issues
8. **Iterate**: Refine test cases based on execution results

---

## 📚 Additional Resources

- **API Documentation**: See `DEPLOYMENT_GUIDE.md` for full API reference
- **Integration Tests**: See `HOW_TO_RUN_INTEGRATION_TESTS.md`
- **AI Features**: See `AI_TEST_GENERATION_DEPLOYMENT.md`
- **Notifications**: See `NOTIFICATION_SYSTEM_COMPLETION.md`

---

## 🆘 Troubleshooting

### Test Execution Fails
- Check if target URL is accessible
- Verify selectors are correct
- Increase timeout values
- Check CloudWatch logs for detailed errors

### AI Generation Errors
- Verify OpenAI API key is configured
- Check usage limits haven't been exceeded
- Ensure target URL is publicly accessible

### Notifications Not Received
- Verify notification preferences are enabled
- Check quiet hours settings
- Verify email/phone/webhook URLs are correct
- Check notification history for delivery status

---

**Ready to start testing!** 🎉

For questions or issues, check the CloudWatch logs or review the deployment documentation.
