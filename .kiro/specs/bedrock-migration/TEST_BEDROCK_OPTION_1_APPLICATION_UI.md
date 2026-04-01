# Option 1: Test Bedrock via Application UI

**Status**: Ready to Execute  
**Date**: April 1, 2026  
**Objective**: Invoke Bedrock through your AIBTS application UI to bypass Lambda rate limit

## What is AIBTS?

AIBTS (AI-Based Test Generation System) is your full-stack web application:
- **Frontend**: React app deployed on Vercel
- **Backend**: Node.js Lambda functions deployed on AWS
- **Database**: DynamoDB tables on AWS

The application has an "AI Test Generation" feature that lets you generate test code automatically.

## Step 1: Find Your Application URL

Your application is deployed on Vercel. You need to find the URL.

### Option A: Check Vercel Dashboard
1. Go to https://vercel.com
2. Log in with your account
3. Find your project (likely named something like "aibts" or "misra-platform")
4. Copy the production URL (e.g., `https://your-project.vercel.app`)

### Option B: Check Your Environment Variables
If you have the Vercel URL saved locally:
```powershell
# Check your frontend .env files
Get-Content packages/frontend/.env
Get-Content packages/frontend/.env.local
```

Look for a variable like `VITE_API_URL` or similar that contains your application URL.

### Option C: Common URL Patterns
- `https://aibts.vercel.app`
- `https://misra-platform.vercel.app`
- `https://your-username-aibts.vercel.app`

**Write down your application URL here**: ___________________

## Step 2: Access Your Application

1. Open your browser
2. Navigate to your application URL
3. You should see a login page

## Step 3: Log In

1. Enter your credentials (email and password)
2. Click "Login"
3. You should be redirected to the dashboard

If you don't have credentials:
- Create a new account by clicking "Register"
- Or use test credentials if you have them

## Step 4: Navigate to AI Test Generation

Once logged in, look for one of these:
- A menu item labeled "AI Test Generation"
- A button labeled "Generate Tests"
- A section in the dashboard for "Test Generation"
- A page with "AI" or "Generate" in the title

Click on it to open the AI Test Generation interface.

## Step 5: Submit a Test Generation Request

You should see a form with fields like:
- **URL**: The website URL to test (e.g., `https://example.com`)
- **Scenario**: What you want to test (e.g., "User logs in with valid credentials")
- **Generate** button: Click to submit

### Example Test Request

Fill in the form with:
- **URL**: `https://example.com/login`
- **Scenario**: `User logs in with valid credentials and sees dashboard`

Then click the **Generate** button.

## Step 6: Monitor CloudWatch Logs

While the test is generating, open a new terminal and monitor the Lambda logs:

```powershell
# Monitor the aibts-ai-generate function logs in real-time
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

This will show you live logs from the Lambda function as it executes.

## Step 7: Look for Bedrock Indicators

In the CloudWatch logs, you should see messages like:

```
[INFO] Creating AI engine for provider: BEDROCK
[INFO] Invoking Bedrock model: us.anthropic.claude-sonnet-4-6
[INFO] Bedrock response received
[INFO] Generated test code: ...
[INFO] Bedrock tokens used: input=XXX, output=YYY
[INFO] Bedrock cost: $0.XX
```

These messages confirm that:
✅ Bedrock is being used instead of OpenAI
✅ Claude Sonnet 4.6 is generating the test code
✅ Token usage and cost are being tracked

## Step 8: Verify Test Generation

Back in your application:
1. Wait for the test generation to complete (usually 10-30 seconds)
2. You should see generated test code displayed
3. The code should be valid Playwright syntax
4. You should see cost information displayed

## Step 9: Document Results

Take note of:
- ✅ Test generation completed successfully
- ✅ Response time (should be similar to OpenAI)
- ✅ Test code quality (compare to OpenAI if possible)
- ✅ CloudWatch logs show Bedrock being used
- ✅ Cost displayed matches Bedrock pricing

## Troubleshooting

### Issue: Application won't load
- Check your internet connection
- Verify the URL is correct
- Check if Vercel deployment is active

### Issue: Login fails
- Verify your credentials are correct
- Check if your user account is confirmed in Cognito
- Try registering a new account

### Issue: AI Test Generation button not visible
- Make sure you're logged in
- Check if the feature is enabled in your account
- Try refreshing the page

### Issue: Test generation times out
- This is normal for first invocation (cold start)
- Wait 30-60 seconds
- Try again

### Issue: CloudWatch logs show errors
- Check the error message in logs
- Common errors:
  - `ThrottlingException`: Rate limit - wait 10-15 minutes
  - `ValidationException`: Invalid request format
  - `AccessDenied`: IAM permissions issue

## Success Criteria

Task 11.2 is complete when you see:

- [x] Bedrock is enabled for `aibts-ai-generate` function
- [x] Configuration verified (AI_PROVIDER=BEDROCK)
- [ ] **First successful invocation through application** ← You are here
- [ ] CloudWatch logs confirm Bedrock usage
- [ ] Test code generated successfully
- [ ] Response quality is acceptable

## Next Steps After Testing

Once you've successfully tested Bedrock through the application:

1. **Document the results** in a new file
2. **Mark Task 11.2 as complete** in tasks.md
3. **Proceed to Task 12** (Canary deployment - 10% traffic to Bedrock)

## Timeline

- **Now**: Test through application UI (5-10 minutes)
- **After success**: Document results (5 minutes)
- **Next phase**: Canary deployment (Task 12)

---

**Ready to test?** Open your application URL and navigate to AI Test Generation!

