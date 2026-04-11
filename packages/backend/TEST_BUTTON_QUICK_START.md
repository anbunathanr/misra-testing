# Test Button - Quick Start (5 Minutes)

## TL;DR - Get Running Now

### Option A: Test Against Deployed Backend (Recommended)

1. **Open Test Button**
   ```bash
   cd packages/backend
   npx http-server -p 8080
   # Then open: http://localhost:8080/test-button.html
   ```

2. **Select Environment**
   - Choose "Development", "Staging", or "Production" from dropdown
   - URLs auto-populate with correct endpoints
   - Ensure backend has TEST_MODE_ENABLED=true in that environment

3. **Run Test**
   - Click "▶ Run Test" button
   - Watch the output for success/failure

### Option B: Test Against Local Backend (Advanced)

1. **Build Backend**
   ```bash
   cd packages/backend
   npm run build
   npm run synth
   npm run deploy
   ```

2. **Open Test Button**
   ```bash
   cd packages/backend
   npx http-server -p 8080
   # Then open: http://localhost:8080/test-button.html
   ```

3. **Configure for Local**
   - Select "Local Development (localhost:3000)" from dropdown
   - Update Backend API URL to your local endpoint
   - Click "▶ Run Test" button

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
