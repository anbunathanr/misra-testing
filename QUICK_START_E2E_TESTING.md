# Quick Start: E2E Automation Testing

Get up and running with automated testing in 5 minutes.

## Step 1: Install Dependencies (1 min)

```bash
npm install --save-dev @playwright/test imapflow dotenv-cli
```

## Step 2: Set Up Gmail (2 min)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication (if not already enabled)
3. Find "App passwords" → Select "Mail" and "Windows Computer"
4. Copy the 16-character password

## Step 3: Configure Environment (1 min)

Copy the example file:
```bash
cp .env.test.example .env.test
```

Edit `.env.test` with your values:
```env
TEST_EMAIL=your-email@gmail.com
TEST_PASSWORD=your-password
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-16-char-app-password
BASE_URL=https://misra.digitransolutions.in
```

## Step 4: Run Tests (1 min)

### Quick Verification (30 seconds)
```bash
npm run test:e2e -- -g "Quick Verification"
```

### Full Workflow Test (2-3 minutes)
```bash
npm run test:e2e -- -g "Complete MISRA Analysis"
```

### See Browser (Headed Mode)
```bash
npm run test:e2e:headed
```

### View Results
```bash
npm run test:e2e:report
```

## What Gets Tested

✅ Login with email/password  
✅ OTP extraction from Gmail  
✅ C file upload  
✅ MISRA analysis trigger  
✅ Analysis completion  
✅ Compliance report verification  
✅ Score extraction  

## Troubleshooting

**OTP not found?**
- Check email arrives within 2 minutes
- Verify OTP format is 6 digits
- Try headed mode to see what's happening

**Login fails?**
- Verify credentials in `.env.test`
- Run in headed mode: `npm run test:e2e:headed`

**Analysis timeout?**
- Check if analysis is actually running
- Increase timeout in test file

## Next Steps

1. ✅ Run quick verification test
2. ✅ Run full workflow test
3. ✅ Check test report
4. ✅ Integrate into CI/CD (see E2E_AUTOMATION_SETUP.md)

## Full Documentation

See `E2E_AUTOMATION_SETUP.md` for:
- Advanced configuration
- CI/CD integration
- Multiple test accounts
- Performance metrics
- Security best practices
