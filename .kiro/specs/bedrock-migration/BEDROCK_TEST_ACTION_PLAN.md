# Bedrock Test Action Plan - AIBTS Platform

**Application URL**: https://aibts-platform.vercel.app/  
**Status**: Ready to Test  
**Date**: April 1, 2026

## Quick Steps to Test Bedrock

### Step 1: Open Your Application
Go to: https://aibts-platform.vercel.app/

### Step 2: Log In
- Enter your credentials
- If you don't have an account, register a new one

### Step 3: Navigate to AI Test Generation
Once logged in, look for:
- A menu item or button labeled "AI Test Generation"
- Or look in the dashboard for a test generation section
- The feature should be in the main navigation

### Step 4: Submit a Test Request
Fill in the form with:
- **URL**: `https://example.com/login`
- **Scenario**: `User logs in with valid credentials`
- Click **Generate** button

### Step 5: Monitor CloudWatch Logs (in parallel)
Open a new terminal and run:
```powershell
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

This will show you live logs as the Lambda function executes.

### Step 6: Look for Bedrock Indicators
You should see messages like:
```
[INFO] Creating AI engine for provider: BEDROCK
[INFO] Invoking Bedrock model: us.anthropic.claude-sonnet-4-6
[INFO] Bedrock response received
[INFO] Generated test code: ...
```

### Step 7: Verify Success
- ✅ Test code appears in the application
- ✅ CloudWatch logs show Bedrock being used
- ✅ Response time is reasonable (10-30 seconds)
- ✅ Test code quality looks good

## What to Document

After successful test, note:
1. **Test generation completed**: Yes/No
2. **Response time**: ___ seconds
3. **Bedrock logs visible**: Yes/No
4. **Test code quality**: Good/Acceptable/Poor
5. **Any errors**: None / [describe]

## Next Steps After Success

1. Document results in a new file
2. Mark Task 11.2 as complete
3. Proceed to Task 12 (Canary deployment)

## Troubleshooting

**Application won't load**
- Check internet connection
- Verify URL is correct
- Try refreshing the page

**Login fails**
- Verify credentials
- Try registering a new account

**AI Test Generation not visible**
- Make sure you're logged in
- Try refreshing the page
- Check if feature is enabled

**Test generation times out**
- Wait 30-60 seconds (cold start)
- Try again

**CloudWatch logs show errors**
- Check error message
- Common: ThrottlingException (wait 10-15 min), ValidationException, AccessDenied

---

**Ready?** Open https://aibts-platform.vercel.app/ and let's test Bedrock!

