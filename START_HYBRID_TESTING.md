# 🚀 Hybrid MISRA Testing - Quick Start

## Single Command Execution from D:\Code\misra-testing

### Prerequisites ✅
- Ensure you're in the root directory: `D:\Code\misra-testing`
- IMAP credentials are configured in `packages/backend/.env.test`
- Node.js is installed

### One Command to Rule Them All 🎯

```bash
npm run hybrid
```

**Alternative:**
```bash
npm start
```

### What This Does:
1. **Starts Express server** on http://localhost:3000
2. **Serves the hybrid interface** for manual registration
3. **Integrates with existing Playwright tests** in `packages/backend/`
4. **Uses correct paths** - everything runs from the root directory

### The Complete Workflow:

#### Phase 1: Manual (Browser)
1. Open http://localhost:3000
2. Fill registration form (Name, Email, Mobile)
3. Click "Send OTP" 
4. Enter OTP manually from your email
5. Click "Verify & Login"

#### Phase 2: Automated (Playwright)
6. Click the blue "🚀 TEST" button
7. **Playwright automatically:**
   - Navigates to misra.digitransolutions.in
   - Auto-fills form with your data
   - Retrieves OTP via IMAP
   - Uploads C file
   - Runs MISRA analysis
   - Downloads results

### File Structure (All in D:\Code\misra-testing):
```
D:\Code\misra-testing\
├── hybrid-server.js          # Main server (NEW)
├── public/index.html          # Frontend interface (NEW)
├── package.json              # Updated with hybrid commands
├── packages/backend/          # Existing Playwright tests
│   ├── tests/e2e-automation.spec.ts
│   └── .env.test             # IMAP credentials
└── START_HYBRID_TESTING.md   # This file
```

### Path Resolution:
- **Server runs from:** `D:\Code\misra-testing\`
- **Playwright executes in:** `D:\Code\misra-testing\packages\backend\`
- **Frontend served from:** `D:\Code\misra-testing\public\`

### Environment Variables (Automatic):
The server automatically sets these for Playwright:
- `TEST_EMAIL`: From your registration
- `TEST_NAME`: From your registration  
- `TEST_MOBILE`: From your registration
- `BASE_URL`: https://misra.digitransolutions.in

### Terminal Output:
```
🚀 Hybrid MISRA Testing Server running on http://localhost:3000
📊 Dashboard: http://localhost:3000
📁 Working Directory: D:\Code\misra-testing
🎭 Playwright Path: D:\Code\misra-testing\packages\backend
```

### Success Indicators:
✅ Server starts on port 3000  
✅ Frontend loads at localhost:3000  
✅ Registration form works  
✅ OTP verification succeeds  
✅ TEST button launches Playwright  
✅ Browser opens automatically  
✅ Files download automatically  

### Troubleshooting:
- **Port 3000 busy?** Kill other processes or change PORT in hybrid-server.js
- **Playwright not found?** Run `npm install` in packages/backend/
- **IMAP errors?** Check credentials in packages/backend/.env.test
- **Path issues?** Ensure you're in D:\Code\misra-testing root directory

### Next Steps After Testing:
1. Check terminal for completion status
2. Look for downloaded files in default download folder
3. Review screenshots for results verification
4. Check packages/backend/ for any generated files

---

**🎯 Remember: Everything runs from D:\Code\misra-testing with one command: `npm run hybrid`**