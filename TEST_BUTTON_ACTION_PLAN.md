# Test Button - Action Plan

## Current Status

The test button is fully built and documented. The error you're seeing (`net::ERR_CONNECTION_REFUSED`) is expected because the backend is not running on port 3001.

## What You Need to Do

### Step 1: Choose Your Approach

**Option A: Test Against Deployed Backend (Recommended)**
- Fastest to get started
- No local setup required
- Tests real infrastructure
- ✅ Recommended for most users

**Option B: Deploy Backend Locally**
- Full control over backend
- Can debug issues
- Requires AWS CDK setup
- For development/debugging

### Step 2: Follow Setup Instructions

**For Option A:**
```bash
# 1. Open test button
cd packages/backend
npx http-server -p 8080

# 2. Navigate to: http://localhost:8080/test-button.html

# 3. Select "Development", "Staging", or "Production" from dropdown

# 4. Click "Run Test"
```

**For Option B:**
```bash
# 1. Build backend
cd packages/backend
npm run build
npm run synth
npm run deploy

# 2. Open test button
npx http-server -p 8080

# 3. Navigate to: http://localhost:8080/test-button.html

# 4. Select "Local Development" and run test
```

### Step 3: Verify Backend is Deployed

**For Option A:**
- Ensure backend is deployed to AWS
- Verify TEST_MODE_ENABLED=true in environment variables
- Check CloudWatch logs if test fails

**For Option B:**
- Verify `npm run deploy` completed successfully
- Check AWS Lambda console for deployed functions
- Or use `sam local start-api` for local testing

### Step 4: Run Test

1. Open test button in browser
2. Select environment from dropdown
3. Click "▶ Run Test" button
4. Monitor output for success/failure

## Documentation to Read

1. **Quick Start** (5 minutes)
   - File: `TEST_BUTTON_QUICK_START.md`
   - Best for: Getting started quickly

2. **Troubleshooting** (if you hit errors)
   - File: `TEST_BUTTON_TROUBLESHOOTING.md`
   - Best for: Diagnosing connection errors

3. **Complete Guide** (detailed reference)
   - File: `MISRA_E2E_TEST_BUTTON_GUIDE.md`
   - Best for: Understanding all features

4. **Setup Clarification** (backend architecture)
   - File: `TEST_BUTTON_SETUP_CORRECTED.md`
   - Best for: Understanding why no `npm run dev` script

## Common Errors and Quick Fixes

### Error: net::ERR_CONNECTION_REFUSED

**Cause:** Backend not running on port 3001

**Quick Fix:**
1. Use Option A (test against deployed backend)
2. Or deploy backend using Option B

### Error: Failed to get test credentials: 403

**Cause:** TEST_MODE_ENABLED not set

**Quick Fix:**
1. Verify TEST_MODE_ENABLED=true in environment
2. Restart backend after changing variables

### Error: CORS error in browser console

**Cause:** Opening HTML file directly (file:// protocol)

**Quick Fix:**
1. Use `npx http-server` to serve the file
2. Navigate to http://localhost:8080/test-button.html

## Timeline

- **Now**: Choose your approach (Option A or B)
- **5 minutes**: Follow setup instructions
- **1 minute**: Open test button and run test
- **Done**: See test results

## Success Criteria

✅ Test button opens in browser
✅ Environment dropdown works
✅ URLs auto-populate based on selection
✅ "Run Test" button is clickable
✅ Test output appears
✅ Test completes with success or clear error message

## Next Steps After Testing

1. **If test succeeds**: Great! Your backend is working
2. **If test fails**: Check error message and troubleshooting guide
3. **For development**: Use Option B to debug locally
4. **For production**: Use Option A with production environment

## Files You Need

- `packages/backend/test-button.html` - The test button UI
- `packages/backend/src/functions/auth/test-login.ts` - Backend endpoint
- Documentation files (see above)

## Questions?

1. Check `TEST_BUTTON_TROUBLESHOOTING.md` for common issues
2. Review browser console (F12) for detailed errors
3. Check backend logs for API errors
4. Verify environment variables are set correctly

## Summary

The test button is ready to use. You just need to:
1. Choose Option A or B
2. Follow the setup steps
3. Open the test button
4. Run the test

That's it! The error you're seeing is just because the backend isn't running yet. Once you deploy it (Option A) or run it locally (Option B), the test button will work perfectly.
