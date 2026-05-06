# Quick Setup Guide - AI Verification + Browser Embedding

## 🚀 5-Minute Setup

### Step 1: Start Chrome with Remote Debugging (1 minute)

**Windows:**
```bash
# Close all Chrome windows
taskkill /F /IM chrome.exe

# Start Chrome with remote debugging
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**Mac:**
```bash
# Close all Chrome windows
killall "Google Chrome"

# Start Chrome with remote debugging
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
```

**Linux:**
```bash
# Close all Chrome windows
killall chrome

# Start Chrome with remote debugging
google-chrome --remote-debugging-port=9222
```

### Step 2: Configure API Key (Optional - 1 minute)

For AI-powered verification, set your Anthropic API key:

```bash
# Windows
set ANTHROPIC_API_KEY=sk-ant-...

# Mac/Linux
export ANTHROPIC_API_KEY=sk-ant-...
```

Or add to `.env.test`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Step 3: Install Dependencies (1 minute)

```bash
npm install
```

### Step 4: Run the Test (1 minute)

```bash
npm run test:complete
```

### Step 5: Use the Application (1 minute)

1. **Register** - Enter name, email, mobile
2. **Verify OTP** - Check email for OTP
3. **Click TEST** - Start automation
4. **Watch** - MISRA loads in same tab ✅
5. **Verify** - AI checks files automatically ✅

---

## ✅ What You Get

### Browser Embedding
```
✅ MISRA opens in the SAME browser tab
✅ Same browser session (shared cookies)
✅ You see automation happening live
✅ No separate Playwright window
```

### AI File Verification
```
✅ Report quality validated
✅ Fixes documentation checked
✅ Fixed code verified
✅ Verification score calculated
✅ Report generated automatically
```

---

## 📊 Example Output

### Browser Embedding
```
🔌 Attempting to connect to Chrome via CDP...
   Host: localhost
   Port: 9222
✅ Successfully connected to Chrome via CDP
   Browser: chromium
✅ Using existing browser context
✅ Using existing browser page
🌐 Navigating to: https://misra.digitransolutions.in
✅ Successfully navigated to https://misra.digitransolutions.in
```

### AI Verification
```
🤖 Starting AI-powered file verification...

╔════════════════════════════════════════════════════════════╗
║          🤖 AI-POWERED FILE VERIFICATION REPORT           ║
╚════════════════════════════════════════════════════════════╝

📊 OVERALL STATUS: ✅ VALID
📈 VERIFICATION SCORE: 95/100

📋 VERIFICATION DETAILS:
  • Report Quality: Good
  • Fixes Quality: Good
  • Code Quality: Good
  • Completeness: Complete

═══════════════════════════════════════════════════════════════
```

---

## 🔧 Troubleshooting

### Chrome Not Found
```
❌ Chrome not found on localhost:9222
💡 Make sure Chrome is running with: --remote-debugging-port=9222
```

**Solution:**
1. Make sure Chrome is running with the flag
2. Check port 9222 is not blocked
3. Verify Chrome is fully started

### AI Verification Fails
```
⚠️  Claude API call failed, falling back to basic verification
```

**Solution:**
1. Check `ANTHROPIC_API_KEY` is set
2. Verify API key is valid
3. Check internet connection
4. Basic verification will still work

### Navigation Fails
```
❌ Navigation failed
```

**Solution:**
1. Check URL is correct
2. Verify internet connection
3. Check MISRA is accessible
4. Increase timeout if needed

---

## 📁 Files Created

### Core Implementation
- `packages/backend/tests/ai-file-verifier.ts` - AI verification
- `packages/backend/tests/browser-embedder.ts` - Browser embedding
- `packages/backend/tests/ai-browser-integration.ts` - Integration

### Documentation
- `AI_VERIFICATION_AND_BROWSER_EMBEDDING.md` - Complete guide
- `SETUP_AI_AND_BROWSER_EMBEDDING.md` - This file

---

## 🎯 Key Features

### AI-Powered Verification
- ✅ Validates report quality
- ✅ Checks fixes documentation
- ✅ Verifies fixed code correctness
- ✅ Generates verification report
- ✅ Calculates verification score

### Browser Embedding
- ✅ Uses Chrome DevTools Protocol
- ✅ MISRA in same tab
- ✅ Same browser session
- ✅ Live automation visibility
- ✅ No separate window

### Integration
- ✅ Automatic verification
- ✅ Seamless automation
- ✅ Production-ready
- ✅ Error handling
- ✅ Fallback mechanisms

---

## 💡 Tips

### 1. Keep Chrome Running
- Don't close Chrome while test is running
- Keep the browser window visible
- Monitor the automation

### 2. Check Verification Report
- Report saved to `downloads/ai-verification-report.txt`
- Review score and recommendations
- Check for any warnings

### 3. Use Screenshots for Debugging
- Screenshots saved automatically
- Check `misra-loaded.png` for page state
- Use for troubleshooting

### 4. Monitor Terminal Output
- Watch for progress updates
- Check for errors or warnings
- See verification results

---

## 🚀 Next Steps

1. **Start Chrome** with `--remote-debugging-port=9222`
2. **Set API key** (optional) for AI verification
3. **Run test** with `npm run test:complete`
4. **Register** in your browser
5. **Click TEST** to start automation
6. **Watch** MISRA load in same tab
7. **Review** AI verification report

---

## ✨ Summary

**Setup Time:** ~5 minutes
**Features:** AI verification + Browser embedding
**Status:** Production-ready
**Support:** See `AI_VERIFICATION_AND_BROWSER_EMBEDDING.md`

Ready to go! 🎉

