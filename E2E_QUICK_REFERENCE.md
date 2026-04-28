# E2E Testing - Quick Reference Card

## 🚀 Get Started in 5 Minutes

```bash
# 1. Install
npm install --save-dev @playwright/test imapflow dotenv-cli

# 2. Configure
cp .env.test.example .env.test
# Edit .env.test with your Gmail credentials

# 3. Run
npm run test:e2e -- -g "Quick Verification"
```

## 📋 Common Commands

```bash
# Quick test (30 seconds)
npm run test:e2e -- -g "Quick Verification"

# Full test (2-3 minutes)
npm run test:e2e -- -g "Complete MISRA Analysis"

# See browser
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# View results
npm run test:e2e:report

# Run specific test
npx playwright test e2e-automation.spec.ts -g "test name"
```

## 🔧 Environment Setup

### Gmail App Password (Required)

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Factor Authentication
3. Find "App passwords" → Mail + Windows Computer
4. Copy 16-character password

### .env.test Template

```env
TEST_EMAIL=your-email@gmail.com
TEST_PASSWORD=your-password
IMAP_USER=your-email@gmail.com
IMAP_PASS=your-16-char-app-password
BASE_URL=https://misra.digitransolutions.in
```

## 📊 What Gets Tested

✅ Login with email/password  
✅ OTP extraction from Gmail  
✅ C file upload  
✅ MISRA analysis trigger  
✅ Analysis completion (polling)  
✅ Compliance report verification  
✅ Score extraction  

## ⏱️ Timing

| Step | Duration |
|------|----------|
| Quick Verification | 30s |
| Full Workflow | 2-3 min |
| Login | 10-15s |
| OTP Extraction | 5-10s |
| File Upload | 5-10s |
| Analysis | 30-60s |
| Report Verification | 5-10s |

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| OTP not found | Check email arrives, verify format is 6 digits |
| Login fails | Verify credentials in .env.test, run headed mode |
| Analysis timeout | Increase timeout, check backend logs |
| IMAP connection failed | Verify App Password, check 2FA enabled |

## 🔍 Debug Commands

```bash
# See what's happening
npm run test:e2e:headed

# Step through test
npm run test:e2e:debug

# View detailed report
npm run test:e2e:report

# Run with verbose logging
npx playwright test --debug
```

## 📁 Key Files

| File | Purpose |
|------|---------|
| `packages/backend/tests/e2e-automation.spec.ts` | Main test suite |
| `packages/backend/playwright.config.ts` | Configuration |
| `packages/frontend/src/components/E2ETestButton.tsx` | UI button |
| `.env.test` | Credentials (don't commit!) |
| `E2E_AUTOMATION_SETUP.md` | Detailed guide |
| `QUICK_START_E2E_TESTING.md` | Quick start |
| `E2E_TESTING_README.md` | Full documentation |

## 🔐 Security Checklist

- [ ] Add `.env.test` to `.gitignore`
- [ ] Use Gmail App Password (not main password)
- [ ] Use test account (not production)
- [ ] Rotate App Password every 3 months
- [ ] Use GitHub Secrets for CI/CD
- [ ] Never commit credentials

## 📚 Documentation

- **5 min read:** QUICK_START_E2E_TESTING.md
- **15 min read:** E2E_AUTOMATION_SETUP.md
- **20 min read:** E2E_TESTING_README.md
- **Overview:** E2E_TESTING_SUMMARY.md

## 🎯 Next Steps

1. ✅ Install dependencies
2. ✅ Set up Gmail App Password
3. ✅ Configure .env.test
4. ✅ Run quick verification
5. ✅ Run full workflow test
6. ✅ Check test report
7. ✅ Integrate into CI/CD

## 💡 Pro Tips

```bash
# Run only one test
npm run test:e2e -- -g "Quick Verification"

# Run with specific browser
npx playwright test --project=chromium

# Update snapshots
npx playwright test --update-snapshots

# Generate trace for debugging
npx playwright test --trace on
```

## 🚨 Common Errors

```
Error: OTP not found in email
→ Check email arrives within 2 minutes

Error: Login button not found
→ Run in headed mode to see UI

Error: Analysis did not complete
→ Increase timeout in test file

Error: IMAP connection failed
→ Verify App Password is correct
```

## 📞 Quick Support

1. Check troubleshooting section above
2. Run in headed mode: `npm run test:e2e:headed`
3. Check reports: `npm run test:e2e:report`
4. Read full docs: `E2E_AUTOMATION_SETUP.md`

## ✨ Summary

**Complete E2E automation testing for misra.digitransolutions.in**

- ✅ Automatic OTP extraction
- ✅ Full workflow testing
- ✅ Detailed reports
- ✅ CI/CD ready
- ✅ Production-grade

**Ready to test!** 🚀

---

**Last Updated:** April 28, 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
