# Test Button - Quick Start (5 Minutes)

## TL;DR - Get Running Now

### 1. Start Backend (Terminal 1)
```bash
cd packages/backend
$env:TEST_MODE_ENABLED = "true"
$env:ENVIRONMENT = "development"
npm run dev -- --port 3001
```

### 2. Open Test Button (Terminal 2)
```bash
cd packages/backend
npx http-server -p 8080
# Then open: http://localhost:8080/test-button.html
```

### 3. Run Test
1. Environment dropdown should show "Local Development (localhost:3000)"
2. Click "▶ Run Test" button
3. Watch the output for success/failure

## What Happens

The test button automatically:
1. ✓ Gets test credentials from backend
2. ✓ Extracts OTP from response
3. ✓ Simulates login
4. ✓ Simulates file upload
5. ✓ Triggers MISRA analysis
6. ✓ Verifies compliance report

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| "Backend API may not be reachable" | Make sure backend is running on port 3001 |
| "Failed to get test credentials: 403" | Set `TEST_MODE_ENABLED=true` before starting backend |
| CORS error in console | Use `npx http-server` instead of opening file directly |
| "Invalid response from test-login endpoint" | Check backend logs for errors |

## Environment URLs

| Environment | App URL | API URL |
|-------------|---------|---------|
| Local | http://localhost:3000 | http://localhost:3001 |
| Dev | https://dev.misra.digitransolutions.in | https://api-dev.misra.digitransolutions.in |
| Staging | https://staging.misra.digitransolutions.in | https://api-staging.misra.digitransolutions.in |
| Production | https://misra.digitransolutions.in | https://api.misra.digitransolutions.in |

## Files

- **Test Button**: `packages/backend/test-button.html`
- **Backend Endpoint**: `packages/backend/src/functions/auth/test-login.ts`
- **Full Guide**: `packages/backend/MISRA_E2E_TEST_BUTTON_GUIDE.md`

## Next: Deploy to Production

Once local testing works:
1. Deploy backend with TEST_MODE_ENABLED=true
2. Update environment URLs in test button
3. Test against staging/production
4. Verify compliance reports are generated correctly
