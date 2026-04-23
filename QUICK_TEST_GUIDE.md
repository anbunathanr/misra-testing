# Quick Test Guide - One-Click MISRA Analysis

## 🎯 Test in 5 Minutes

### What You Need
- Real email address (Gmail, Outlook, Yahoo, etc.)
- API endpoint: `https://jno64tiewg.execute-api.us-east-1.amazonaws.com`

### Test Flow

#### 1️⃣ Start Workflow (30 seconds)
```bash
curl -X POST https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/start \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

**Save the `workflowId` from response**

#### 2️⃣ Poll Progress (2-3 minutes)
```bash
curl https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/progress/{workflowId}
```

**Watch progress go from 0% → 100%**

#### 3️⃣ Get Results (30 seconds)
Once progress reaches 100%, fetch analysis results:
```bash
curl https://jno64tiewg.execute-api.us-east-1.amazonaws.com/analysis/results \
  -H "Authorization: Bearer {accessToken}"
```

---

## 📊 Expected Progress Timeline

| Time | Progress | Status | What's Happening |
|------|----------|--------|------------------|
| 0s | 0% | INITIATED | Workflow starting |
| 5s | 25% | AUTH_VERIFIED | User created & authenticated |
| 10s | 50% | FILE_INGESTED | Sample C file uploaded to S3 |
| 15s | 75% | ANALYSIS_TRIGGERED | MISRA analysis started |
| 30-60s | 100% | COMPLETED | Report generated |

---

## ✅ Success Indicators

- ✅ Workflow starts without errors
- ✅ Progress updates every 2 seconds
- ✅ Progress reaches 100%
- ✅ Status changes to "COMPLETED"
- ✅ Analysis results contain MISRA violations

---

## 🐛 Troubleshooting

### Issue: "Invalid email format"
**Solution**: Use a real, deliverable email address

### Issue: "Workflow not found"
**Solution**: Make sure you copied the `workflowId` correctly

### Issue: Progress stuck at 75%
**Solution**: Wait longer (analysis can take 30-60 seconds)

### Issue: 500 error on start
**Solution**: Check AWS credentials and region

---

## 📱 Frontend Integration

The frontend automatically:
1. Calls `/workflow/start` with email
2. Polls `/workflow/progress/{workflowId}` every 2 seconds
3. Shows animated progress tracker
4. Displays results when complete

---

## 🔍 Sample MISRA Violations in Test File

The sample file contains violations for:
- Unreachable code
- Uninitialized variables
- Type conversions
- Function pointer issues
- Side effects
- Identical conditions
- Goto statements
- Missing break statements
- Memory leaks
- Double free
- And more...

**Expected violations**: 15+

---

## 💡 Pro Tips

1. **Use Gmail**: Most reliable for testing
2. **Check spam folder**: OTP email might go to spam
3. **Multiple tests**: Try different email addresses
4. **Monitor CloudWatch**: Check Lambda logs for debugging
5. **Check DynamoDB**: Verify progress is being stored

---

## 🎬 Full Test Scenario

```
User enters email → Workflow starts → User created → User logged in → 
File uploaded → Analysis triggered → Progress tracked → Report generated → 
Results displayed
```

**Total time**: 30-60 seconds
**User interaction**: Email input only
**Everything else**: Automatic

---

**Ready to test? Start with Step 1 above!**
