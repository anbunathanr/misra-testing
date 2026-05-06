# Run Instructions - Complete Hybrid Workflow

## 🎯 Exact Steps to Run the Test

### Step 1: Open PowerShell and Start Chrome with Remote Debugging

```powershell
# Windows PowerShell - Copy and paste this exact command:
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
```

**What to expect:**
- Chrome opens normally
- You'll see a message in the terminal: "DevTools listening on ws://127.0.0.1:9222/..."
- Keep this PowerShell window open

---

### Step 2: Open Another PowerShell and Run the Test

```bash
# In a NEW PowerShell window, run:
npm run test:complete
```

**What to expect:**
- Test starts
- Your default browser opens to http://localhost:3000
- You see the registration form

---

### Step 3: Complete Registration in Your Browser

In the browser that opened:

1. **Enter Full Name:**
   - Click the "Full Name" field
   - Type your name (e.g., "John Doe")

2. **Enter Email:**
   - Click the "Email" field
   - Type your email (e.g., "your-email@gmail.com")

3. **Enter Mobile Number:**
   - Click the "Mobile Number" field
   - Type your mobile number (e.g., "+1234567890")

4. **Click "Send OTP":**
   - Click the "Send OTP" button
   - Wait for email from ceo@digitransolutions.in

5. **Enter OTP:**
   - Check your email for the 6-digit OTP
   - Copy the OTP
   - Click the "OTP" field in the browser
   - Paste the OTP

6. **Click "Verify & Login":**
   - Click the "Verify & Login" button
   - Wait for dashboard to load

7. **Click "TEST" Button:**
   - Click the "TEST" button
   - **This is the trigger for automation to start**

---

### Step 4: Watch Automation Happen

Once you click "TEST":

1. **Browser navigates to MISRA platform** (in same tab)
2. **Progress display appears** below TEST button showing:
   - ✅ Launch Browser
   - ✅ Navigate to MISRA
   - ✅ OTP Verification
   - ✅ File Upload
   - ✅ Code Analysis
   - ✅ Download Reports
   - ✅ Verification Complete

3. **Files download automatically** to your browser's download manager

4. **AI verification runs** (if AWS credentials configured)

5. **Verification report generated** and saved to downloads folder

---

## 📊 Expected Output

### In PowerShell (Test Output):

```
🚀 Starting Complete Hybrid Workflow
================================================================================
📊 AUTOMATION PROGRESS
================================================================================
1. ⏳ Launch Browser            In Progress
2. ⭕ Navigate to MISRA         Pending
3. ⭕ OTP Verification          Pending
4. ⭕ File Upload               Pending
5. ⭕ Code Analysis             Pending
6. ⭕ Download Reports          Pending
7. ⭕ Verification Complete     Pending
================================================================================

✅ Localhost opened in your default browser
🌐 URL: http://localhost:3000

🔌 Connecting to your Chrome browser...
✅ Connected to your Chrome browser

🌐 Navigating to MISRA in your browser...
✅ MISRA platform loaded in YOUR browser

📝 Auto-filling registration form...
✅ Name filled: John Doe
✅ Email filled: your-email@gmail.com
✅ Mobile filled: +1234567890

... (more output as automation progresses)

🤖 Starting AWS Bedrock AI File Verification...
📋 Files to verify:
   • Report: report.pdf
   • Fixes: fixes.txt
   • Fixed Code: fixed_code.c

╔════════════════════════════════════════════════════════════╗
║     🤖 AWS BEDROCK AI FILE VERIFICATION REPORT            ║
╚════════════════════════════════════════════════════════════╝

🔧 AI Model: Claude 3.5 Sonnet (AWS Bedrock)
⏱️  Analysis Time: 2345ms

📊 OVERALL STATUS: ✅ VALID
📈 VERIFICATION SCORE: 95/100

✅ Complete Hybrid Workflow Finished!
📁 All files downloaded and verified
```

### In Browser:

```
Progress Display Below TEST Button:

📊 AUTOMATION PROGRESS
================================================================================
1. ✅ Launch Browser            Completed (5.41s)
2. ✅ Navigate to MISRA         Completed (12.3s)
3. ✅ OTP Verification          Completed (45.2s)
4. ✅ File Upload               Completed (8.1s)
5. ✅ Code Analysis             Completed (120.5s)
6. ✅ Download Reports          Completed (15.3s)
7. ✅ Verification Complete     Completed (8.9s)
================================================================================
⏱️  Total Time: 215.6s
```

---

## 📥 Where to Find Downloaded Files

After the test completes, files are saved to:

```
./downloads/session-2026-05-06-10-19-31/
├── report.pdf                    (MISRA analysis report)
├── fixes.txt                     (Suggested fixes)
├── fixed_code.c                  (Fixed source code)
├── manifest.json                 (File metadata)
├── verification-log.json         (Verification details)
└── ai-verification-report.txt    (AWS Bedrock AI report)
```

**To access files:**
1. Open File Explorer
2. Navigate to the project root directory
3. Open the `downloads` folder
4. Open the `session-YYYY-MM-DD-HH-MM-SS` folder
5. View the files

---

## ⚙️ Optional: Configure AWS Credentials for AI Verification

If you want AI verification to work:

1. **Get AWS Credentials:**
   - Go to AWS IAM Console
   - Create an IAM user with Bedrock access
   - Generate access key and secret key

2. **Edit `.env.test`:**
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key_here
   AWS_SECRET_ACCESS_KEY=your_secret_key_here
   ```

3. **Save and run test again**

---

## 🔧 Troubleshooting

### Issue: Chrome doesn't start with remote debugging

**Solution:**
```powershell
# Make sure Chrome is installed at:
C:\Program Files\Google\Chrome\Application\chrome.exe

# If installed elsewhere, find it:
Get-ChildItem -Path "C:\" -Filter "chrome.exe" -Recurse -ErrorAction SilentlyContinue
```

### Issue: "Port 3000 already in use"

**Solution:**
- Server automatically tries ports 3001, 3002, 3003, etc.
- No action needed - test will continue on next available port

### Issue: "Failed to connect to your browser"

**Solution:**
- Make sure Chrome is running with `--remote-debugging-port=9222`
- Check that Chrome window is still open
- Test will fall back to separate Playwright browser

### Issue: "OTP not found"

**Solution:**
- Check that email is receiving OTP
- Check spam folder
- Verify Gmail IMAP credentials in `.env.test`
- Test will wait 90 seconds for manual OTP entry

### Issue: "MISRA platform server error (500)"

**Solution:**
- This is a MISRA platform issue, not our automation
- Browser will stay open for 3-5 minutes
- You can manually upload file and continue
- Or close browser and try again

---

## ✅ Success Checklist

After running the test, verify:

- [ ] Chrome opened with MISRA in same tab
- [ ] Progress display showed all 7 steps
- [ ] Files downloaded to browser's download manager
- [ ] Files saved to `./downloads/session-YYYY-MM-DD-HH-MM-SS/`
- [ ] AI verification report generated (if AWS configured)
- [ ] Verification score displayed (e.g., 95/100)
- [ ] Terminal output shows "✅ Complete Hybrid Workflow Finished!"

---

## 📞 Need Help?

1. **Quick Reference:** See `QUICK_START.md`
2. **Detailed Setup:** See `INTEGRATION_COMPLETE_SETUP_GUIDE.md`
3. **Technical Details:** See `INTEGRATION_SUMMARY.md`

---

## 🎉 You're Ready!

Everything is set up and ready to run. Just follow the 4 steps above and watch the automation happen in your browser!

**Happy Testing! 🚀**

---

**Last Updated:** May 6, 2026
**Status:** ✅ Ready to Run
