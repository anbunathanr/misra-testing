# Quick Start Guide - Hybrid Workflow with File Verification

## Prerequisites

- Node.js 18+ installed
- npm 9+ installed
- Chrome/Chromium browser installed
- Gmail account with App Password (for OTP retrieval)
- (Optional) Twilio account for WhatsApp notifications
- (Optional) Gmail account for email notifications

## Installation

### 1. Install Dependencies

```bash
npm install
```

This installs all required packages including:
- `ws` - WebSocket server
- `nodemailer` - Email notifications
- `twilio` - WhatsApp notifications
- `playwright` - Browser automation
- `express` - Web server

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# Gmail IMAP (for OTP retrieval)
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-app-password

# Email Notifications (optional)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# WhatsApp Notifications (optional)
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Test Configuration
TEST_EMAIL=your-email@gmail.com
TEST_PASSWORD=your-password
BASE_URL=https://misra.digitransolutions.in
PLAYWRIGHT_HEADLESS=false
PLAYWRIGHT_SLOW_MO=1000
```

## Running the Hybrid Workflow

### Step 1: Start the Server

```bash
npm run hybrid
```

Output:
```
🚀 Hybrid MISRA Testing Server running on http://localhost:3000
📊 Dashboard: http://localhost:3000
🔌 WebSocket: ws://localhost:3000
```

### Step 2: Open Browser

The server automatically opens `http://localhost:3000` in your default browser.

### Step 3: Register and Verify OTP

1. Enter your Full Name, Email, and Mobile Number
2. Click "Send OTP"
3. Check your email for OTP from ceo@digitransolutions.in
4. Enter the 6-digit OTP
5. Click "Verify & Login"

### Step 4: Start Automation

1. Click the "TEST" button
2. Watch the progress display below the button update in real-time
3. A Playwright browser window will open with MISRA automation
4. The system will:
   - Navigate to MISRA platform
   - Auto-fill your credentials
   - Verify OTP automatically
   - Upload a C file
   - Start code analysis
   - Download analysis files
   - Verify downloaded files
   - Send email and WhatsApp notifications

### Step 5: Monitor Progress

The progress display shows:
- ✅ Completed steps
- ⏳ In-progress steps
- ❌ Failed steps
- ⭕ Pending steps

Each step shows completion time.

## File Verification

### What Gets Verified

1. **Uploaded C File**
   - Functions extracted
   - Variables extracted
   - Includes extracted
   - MISRA violations detected

2. **Downloaded Report**
   - Mentions same functions
   - Documents violations
   - Contains analysis results

3. **Fixed Code**
   - Contains same functions
   - Has corrections applied
   - Fewer violations than original

4. **Fixes File**
   - Documents violations
   - Provides corrections
   - Explains fixes

### Verification Report

After automation completes, a detailed report is generated showing:
- ✅ Verification status for each file
- 📊 File sizes and types
- 📋 Functions and variables analyzed
- 🔍 Violations found and fixed
- 💡 Recommendations

## Running Tests

### File Verification Tests

```bash
npx playwright test file-verification.spec.ts
```

This runs comprehensive tests for:
- C file analysis
- Report analysis
- Fixed code analysis
- Fixes file analysis
- Verification workflow
- Error handling

### Complete Workflow Test

```bash
npm run test:complete
```

This runs the complete hybrid workflow with all features.

### Debug Mode

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector for step-by-step debugging.

## Notifications

### Email Notifications

When enabled, you'll receive an email with:
- Verification status
- List of downloaded files
- File sizes
- Session ID
- Download location

**Setup**:
1. Use Gmail App Password (not regular password)
2. Set `EMAIL_USER` and `EMAIL_PASS` in `.env`
3. Notifications sent automatically after verification

### WhatsApp Notifications

When enabled, you'll receive a WhatsApp message with:
- Verification results
- File list with status
- Session ID
- Download location

**Setup**:
1. Create Twilio account
2. Set up WhatsApp Business API
3. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` in `.env`
4. Notifications sent automatically after verification

## File Organization

Downloaded files are organized by session:

```
downloads/
├── session-2024-01-15-14-30-45/
│   ├── manifest.json              # File metadata
│   ├── verification-log.txt       # Verification details
│   ├── analysis_report.pdf        # MISRA analysis report
│   ├── fixes.txt                  # Suggested fixes
│   └── sample_fixed.c             # Fixed source code
```

Each session has:
- **manifest.json** - List of all files with metadata
- **verification-log.txt** - Detailed verification results
- **Downloaded files** - Analysis reports and fixed code

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use different port
set PORT=3001 && npm run hybrid
```

### WebSocket Connection Failed

- Check browser console for errors
- Verify firewall allows WebSocket
- System falls back to polling automatically

### OTP Not Received

- Check spam folder
- Verify IMAP credentials
- Check Gmail App Password is correct
- Wait 30 seconds for email to arrive

### Email Notifications Not Sent

- Verify EMAIL_USER and EMAIL_PASS in .env
- Use Gmail App Password, not regular password
- Check email spam folder
- Verify SMTP settings

### WhatsApp Notifications Not Sent

- Verify Twilio credentials
- Check phone number format (+1234567890)
- Verify Twilio account has balance
- Check WhatsApp Business API is enabled

## Performance Tips

1. **Faster Downloads**: Use wired internet connection
2. **Faster Analysis**: Use smaller C files
3. **Faster Verification**: Ensure files are on local disk
4. **Faster Notifications**: Pre-configure email/WhatsApp

## Security Tips

1. **Never commit .env file** - Add to .gitignore
2. **Use App Passwords** - Not main account password
3. **Rotate Credentials** - Change passwords regularly
4. **Secure Downloads** - Keep downloads directory private
5. **Monitor Logs** - Check verification logs for issues

## Next Steps

1. ✅ Install dependencies
2. ✅ Configure environment variables
3. ✅ Start the server
4. ✅ Register and verify OTP
5. ✅ Click TEST button
6. ✅ Monitor progress
7. ✅ Receive notifications
8. ✅ Review verification report

## Support

For issues:
1. Check troubleshooting section
2. Review console output
3. Check environment variables
4. Run tests in debug mode
5. Check verification logs

## Example Workflow

```bash
# Terminal 1: Start server
npm run hybrid

# Browser: Register and verify OTP
# 1. Enter details
# 2. Click "Send OTP"
# 3. Enter OTP from email
# 4. Click "Verify & Login"

# Browser: Start automation
# 1. Click "TEST" button
# 2. Watch progress display update
# 3. Playwright browser opens
# 4. Automation runs automatically

# Terminal 1: Monitor output
# Shows all steps and progress

# Email: Receive verification results
# Shows file verification status

# WhatsApp: Receive notification
# Shows verification summary

# Downloads: Check files
# downloads/session-YYYY-MM-DD-HH-MM-SS/
```

## Conclusion

You now have a complete hybrid workflow with:
- ✅ Automatic file downloads
- ✅ Real-time progress tracking
- ✅ File verification
- ✅ Email notifications
- ✅ WhatsApp notifications
- ✅ Same browser session automation

Enjoy automated MISRA testing!
