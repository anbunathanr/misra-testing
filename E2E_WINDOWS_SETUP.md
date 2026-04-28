# E2E Testing Setup for Windows (PowerShell)

Quick setup guide for Windows users running PowerShell.

## Step 1: Install Dependencies ✅ (Already Done)

```powershell
npm install --save-dev @playwright/test imapflow dotenv-cli
```

You've already completed this step!

## Step 2: Set Up Gmail App Password

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication (if not already enabled)
3. Find "App passwords" section
4. Select "Mail" and "Windows Computer"
5. Copy the 16-character password

## Step 3: Create .env.test File

```powershell
# Copy the example file
Copy-Item .env.test.example .env.test

# Edit the file with your credentials
notepad .env.test
```

Fill in your credentials:
```env
TEST_EMAIL=your-email@gmail.com
TEST_PASSWORD=your-password
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-16-char-app-password
BASE_URL=https://misra.digitransolutions.in
```

## Step 4: Run Tests

### Quick Verification (30 seconds)
```powershell
npm run test:e2e -- --grep "Quick Verification"
```

### Full Workflow (2-3 minutes)
```powershell
npm run test:e2e -- --grep "Complete MISRA Analysis"
```

### See Browser (Headed Mode)
```powershell
npm run test:e2e:headed
```

### Debug Mode
```powershell
npm run test:e2e:debug
```

### View Test Report
```powershell
npm run test:e2e:report
```

## Troubleshooting

### Error: "Could not read package.json"

**Solution:** The issue was with the npm script syntax. This has been fixed in the latest version.

Try again:
```powershell
npm run test:e2e -- --grep "Quick Verification"
```

### Error: "No report found"

**Solution:** This means tests haven't run yet. Run a test first:
```powershell
npm run test:e2e -- --grep "Quick Verification"
```

Then view the report:
```powershell
npm run test:e2e:report
```

### Error: "OTP not found"

**Solution:**
1. Verify email is being sent to correct address
2. Check OTP format is 6 digits
3. Verify email arrives within 2 minutes
4. Check IMAP credentials are correct

### Error: "Login button not found"

**Solution:** Run in headed mode to see what's happening:
```powershell
npm run test:e2e:headed
```

## Windows-Specific Tips

### Using PowerShell ISE

If you prefer GUI:
1. Open PowerShell ISE
2. Navigate to project directory
3. Run commands directly

### Using Windows Terminal

Recommended for better experience:
1. Install [Windows Terminal](https://www.microsoft.com/en-us/p/windows-terminal/9n0dx20hk701)
2. Open PowerShell tab
3. Run commands

### File Paths

Windows uses backslashes. If you see path errors:
```powershell
# Use forward slashes in npm scripts (already done)
npm run test:e2e
```

## Quick Commands Reference

```powershell
# List all available test commands
npm run

# Run quick test
npm run test:e2e -- --grep "Quick Verification"

# Run full test
npm run test:e2e -- --grep "Complete MISRA Analysis"

# See browser
npm run test:e2e:headed

# Debug
npm run test:e2e:debug

# View report
npm run test:e2e:report

# Run specific test file
npx playwright test packages/backend/tests/e2e-automation.spec.ts

# Run with verbose output
npx playwright test --verbose
```

## Expected Output

### Successful Quick Test
```
✓ MISRA Platform E2E Automation › Quick Verification Test (30s)

1 passed (30s)
```

### Successful Full Test
```
✓ MISRA Platform E2E Automation › Complete MISRA Analysis Workflow (2m 45s)

1 passed (2m 45s)
```

## Next Steps

1. ✅ Install dependencies (done)
2. ✅ Set up Gmail App Password
3. ✅ Create .env.test file
4. ✅ Run quick verification test
5. ✅ Run full workflow test
6. ✅ Check test report
7. ✅ Integrate into CI/CD (optional)

## Support

For more detailed information, see:
- `QUICK_START_E2E_TESTING.md` - 5 minute overview
- `E2E_AUTOMATION_SETUP.md` - Detailed setup guide
- `E2E_TESTING_README.md` - Comprehensive documentation
- `E2E_QUICK_REFERENCE.md` - Command reference

---

**Ready to test!** 🚀
