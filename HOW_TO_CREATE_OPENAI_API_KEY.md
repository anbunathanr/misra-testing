# How to Create an OpenAI API Key

## Step-by-Step Guide

### Step 1: Go to OpenAI Platform

1. Open your web browser
2. Navigate to: **https://platform.openai.com**
3. You'll see the OpenAI Platform homepage

### Step 2: Sign Up or Log In

**If you don't have an account:**
1. Click **"Sign up"** button (top right)
2. Choose one of these options:
   - Continue with Google
   - Continue with Microsoft Account
   - Continue with Apple
   - Or use email address
3. If using email:
   - Enter your email address
   - Create a password
   - Verify your email (check inbox for verification link)
4. Complete the registration form:
   - First and last name
   - Organization name (optional, can use "Personal")
   - Phone number for verification
5. Verify your phone number with the code sent via SMS

**If you already have an account:**
1. Click **"Log in"** button
2. Enter your credentials
3. Complete 2FA if enabled

### Step 3: Set Up Billing (Required for API Access)

⚠️ **IMPORTANT**: You must add a payment method to use the API

1. After logging in, you'll see a prompt to add billing
2. Click **"Add payment method"** or go to **Settings → Billing**
3. Click **"Add payment method"**
4. Enter your credit/debit card information:
   - Card number
   - Expiration date
   - CVC/CVV code
   - Billing address
5. Click **"Add payment method"**
6. Set up usage limits (recommended):
   - Click **"Usage limits"**
   - Set a **hard limit** (e.g., $10/month to start)
   - Set a **soft limit** for email notifications (e.g., $5)
   - Click **"Save"**

### Step 4: Navigate to API Keys Section

1. Click on your profile icon (top right corner)
2. Select **"API keys"** from the dropdown menu
   - Or go directly to: https://platform.openai.com/api-keys
3. You'll see the API Keys management page

### Step 5: Create a New API Key

1. Click the **"+ Create new secret key"** button
2. A dialog will appear with options:
   - **Name**: Give your key a descriptive name (e.g., "AIBTS Production")
   - **Project**: Select "Default project" or create a new one
   - **Permissions**: Leave as "All" (default) or select specific permissions
3. Click **"Create secret key"**

### Step 6: Copy and Save Your API Key

⚠️ **CRITICAL**: You can only see the key once!

1. A new dialog appears showing your API key
2. The key starts with `sk-proj-` or `sk-`
3. Click the **"Copy"** button to copy the key to clipboard
4. **IMMEDIATELY** save it securely:
   - Paste it into a password manager (recommended)
   - Or save it in a secure note
   - Or write it down in a safe place
5. ✅ Check the box: "I saved my secret key"
6. Click **"Done"**

### Step 7: Verify Your API Key

You can test your API key immediately:

**Using curl (Command Line):**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY_HERE"
```

**Using PowerShell:**
```powershell
$headers = @{
    "Authorization" = "Bearer YOUR_API_KEY_HERE"
}
Invoke-RestMethod -Uri "https://api.openai.com/v1/models" -Headers $headers
```

If successful, you'll see a list of available models.

## What Your API Key Looks Like

Your API key will look like one of these formats:
- **New format**: `sk-proj-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ`
- **Legacy format**: `sk-abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQR`

## Important Security Notes

### ✅ DO:
- Store the key in AWS Secrets Manager (for production)
- Use environment variables for local development
- Set usage limits in OpenAI dashboard
- Rotate keys regularly (every 90 days)
- Use different keys for development and production
- Monitor usage in OpenAI dashboard

### ❌ DON'T:
- Never commit API keys to git
- Never share keys publicly
- Never hardcode keys in your application
- Never use the same key across multiple projects
- Never ignore usage alerts

## Pricing Information

### Free Trial
- New accounts get **$5 in free credits**
- Credits expire after **3 months**
- Good for testing and development

### Pay-as-you-go Pricing (as of 2024)

**GPT-4 Turbo:**
- Input: $0.01 per 1K tokens (~750 words)
- Output: $0.03 per 1K tokens

**GPT-3.5 Turbo:**
- Input: $0.0005 per 1K tokens
- Output: $0.0015 per 1K tokens

**Example costs for AIBTS:**
- Generating 1 test case with GPT-4: ~$0.035
- Generating 1 test case with GPT-3.5: ~$0.00175
- 100 test cases/month with GPT-4: ~$3.50
- 100 test cases/month with GPT-3.5: ~$0.18

## Setting Usage Limits (Highly Recommended)

1. Go to **Settings → Billing → Usage limits**
2. Set a **hard limit**:
   - This is the maximum you'll be charged
   - Recommended: Start with $10-20/month
   - API requests will fail if limit is reached
3. Set a **soft limit**:
   - You'll receive email notifications
   - Recommended: 50% of hard limit
   - Helps you monitor usage
4. Click **"Save"**

## Monitoring Usage

### View Usage Dashboard
1. Go to **Settings → Usage**
2. You'll see:
   - Daily usage graph
   - Cost breakdown by model
   - Request counts
   - Token usage

### Set Up Email Alerts
1. Go to **Settings → Billing → Usage limits**
2. Enable email notifications
3. Set threshold (e.g., 80% of limit)

## Troubleshooting

### "Insufficient quota" Error
**Cause**: You've exceeded your usage limit or haven't added billing

**Solution**:
1. Go to **Settings → Billing**
2. Add a payment method
3. Increase usage limits
4. Wait a few minutes for changes to take effect

### "Invalid API key" Error
**Cause**: Key is incorrect, expired, or deleted

**Solution**:
1. Verify you copied the entire key
2. Check for extra spaces or characters
3. Create a new key if needed

### "Rate limit exceeded" Error
**Cause**: Too many requests in a short time

**Solution**:
1. Implement exponential backoff (already in our code)
2. Upgrade to higher tier plan
3. Wait and retry

## Next Steps After Creating Key

Once you have your API key:

1. **Store it in AWS Secrets Manager**:
   ```bash
   aws secretsmanager create-secret \
     --name aibts/openai-api-key \
     --secret-string "sk-YOUR-ACTUAL-KEY" \
     --region us-east-1
   ```

2. **Deploy the backend**:
   ```bash
   cd packages/backend
   npm run build
   cdk deploy MinimalStack
   ```

3. **Test the integration**:
   - Check CloudWatch logs
   - Verify API calls working
   - Monitor costs in OpenAI dashboard

## Support Resources

- **OpenAI Documentation**: https://platform.openai.com/docs
- **API Reference**: https://platform.openai.com/docs/api-reference
- **Community Forum**: https://community.openai.com
- **Status Page**: https://status.openai.com
- **Support**: https://help.openai.com

## FAQ

**Q: How long does it take to get API access?**
A: Immediate after adding a payment method.

**Q: Can I use the free trial for production?**
A: Yes, but set up billing before credits run out.

**Q: What happens if I exceed my limit?**
A: API requests will fail with a 429 error. Increase your limit or wait until next billing cycle.

**Q: Can I delete an API key?**
A: Yes, go to API keys page and click the trash icon. This is irreversible.

**Q: How do I rotate my API key?**
A: Create a new key, update it in Secrets Manager, then delete the old key.

**Q: Is there a free tier?**
A: New accounts get $5 in credits. After that, it's pay-as-you-go.

**Q: Can I get a refund?**
A: OpenAI doesn't offer refunds, but you can set strict usage limits to control costs.

## Summary Checklist

- [ ] Created OpenAI account
- [ ] Verified email and phone
- [ ] Added payment method
- [ ] Set usage limits ($10-20 hard limit recommended)
- [ ] Created API key with descriptive name
- [ ] Copied and saved API key securely
- [ ] Tested API key with curl/PowerShell
- [ ] Stored key in AWS Secrets Manager
- [ ] Set up email alerts for usage
- [ ] Bookmarked usage dashboard

You're now ready to integrate OpenAI with AIBTS! 🚀
