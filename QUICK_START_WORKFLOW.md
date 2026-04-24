# Quick Start - Run the Complete Automated Workflow

## Prerequisites
- Node.js 18+ installed
- Backend already deployed to AWS (✅ Done)
- Frontend environment configured (✅ Done)

---

## Step 1: Start the Frontend

```bash
cd packages/frontend
npm run dev
```

**Expected Output**:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  press h to show help
```

---

## Step 2: Open in Browser

Navigate to: **http://localhost:3000**

You should see the MISRA Platform dashboard with a "Start Automated Workflow" button.

---

## Step 3: Trigger the Workflow

1. Click **"Start Automated Workflow"** button
2. Enter any email address (e.g., `test@example.com`)
3. Click **"Start"**

---

## Step 4: Watch the Automation

The system will automatically execute these steps:

### 🔐 Step 1: Authentication (5-10 seconds)
- Registers new user or logs in existing user
- Fetches OTP from email
- Verifies OTP
- Obtains JWT token

**Status**: ✅ Complete

### 📁 Step 2: File Upload (5-10 seconds)
- Selects sample C or C++ file
- Requests presigned S3 URL
- Uploads file to S3
- Creates metadata record

**Status**: ✅ Complete

### 🔍 Step 3: MISRA Analysis (10-30 seconds)
- Backend Lambda processes file
- Parses C/C++ code
- Applies 70+ MISRA rules
- Detects violations
- Stores results

**Status**: ✅ In Progress (watch the progress bar)

### 📊 Step 4: Results Display (Automatic)
- Fetches analysis results
- Displays compliance score
- Shows all violations with details
- Highlights severity levels

**Status**: ✅ Complete

---

## Expected Results

### Compliance Score
- **Range**: 60-80% (sample files have intentional violations)
- **Meaning**: Percentage of code compliant with MISRA rules

### Violations Found
- **Count**: 5-15 violations
- **Types**: Naming, type safety, memory, control flow violations

### Violation Details
Each violation shows:
- **Rule ID**: e.g., "MISRA C 2.1"
- **Severity**: Mandatory, Required, or Advisory
- **Line Number**: Where in the code
- **Description**: What the violation is
- **Suggestion**: How to fix it

---

## Timeline

| Step | Time | Status |
|------|------|--------|
| Authentication | 5-10s | ✅ Automatic |
| File Upload | 5-10s | ✅ Automatic |
| Analysis | 10-30s | ✅ Automatic |
| Results | Instant | ✅ Automatic |
| **Total** | **30-60s** | **✅ Fully Automated** |

---

## Troubleshooting

### Issue: "Failed to authenticate"
**Solution**: 
- Check internet connection
- Verify email is valid
- Check browser console for errors

### Issue: "File upload failed"
**Solution**:
- Check API endpoint in `.env` file
- Verify S3 bucket permissions
- Check CloudWatch logs

### Issue: "Analysis timeout"
**Solution**:
- Wait longer (analysis can take up to 5 minutes)
- Check if file is too large (max 10MB)
- Refresh page and try again

### Issue: "No results displayed"
**Solution**:
- Wait for analysis to complete (watch progress bar)
- Check browser console for errors
- Verify DynamoDB tables exist

---

## Testing Multiple Times

### Using Same Email
1. Complete first workflow
2. Click "Start Automated Workflow" again
3. Enter same email
4. System automatically logs out and re-authenticates
5. New analysis runs

### Using Different Emails
1. Complete first workflow
2. Click "Start Automated Workflow" again
3. Enter different email
4. New user is created and workflow runs

---

## What's Being Analyzed

### Sample C File
```c
// Contains violations like:
// - Implicit type conversions
// - Unsafe pointer operations
// - Non-standard naming
```

### Sample C++ File
```cpp
// Contains violations like:
// - Unsafe casts
// - Non-compliant naming
// - Type safety issues
```

---

## Real-Time Progress

The UI shows:
- ✅ Completed steps (green checkmarks)
- 🔄 Current step (spinning indicator)
- ⏳ Pending steps (gray)
- 📊 Analysis progress percentage
- 💬 Current message (what's happening)

---

## After Workflow Completes

### View Results
- Scroll down to see all violations
- Click on violations for more details
- See compliance score and statistics

### Download Results (Optional)
- Results are stored in DynamoDB
- Can be exported later
- Accessible from Dashboard

### Run Another Workflow
- Click "Start Automated Workflow" again
- Enter new email or reuse existing
- System handles everything automatically

---

## Architecture Overview

```
Your Browser (Frontend)
    ↓
React App (http://localhost:3000)
    ↓
AWS API Gateway
    ↓
Lambda Functions (Auth, Upload, Analysis)
    ↓
AWS Services (Cognito, S3, DynamoDB, SQS)
    ↓
Results Back to Browser
```

---

## Key Features

✅ **Fully Automated** - No manual steps required
✅ **Real-Time Progress** - Watch each step complete
✅ **Email Reuse** - Use same email multiple times
✅ **Instant Results** - See violations immediately
✅ **Production Ready** - Uses real AWS services
✅ **Secure** - JWT authentication, encrypted data

---

## Success Indicators

✅ Frontend loads at http://localhost:3000
✅ "Start Automated Workflow" button visible
✅ Can enter email and click Start
✅ Progress bar shows steps completing
✅ Results display with violations
✅ Compliance score shown
✅ Violation details visible

---

## That's It!

The entire MISRA analysis workflow is now **fully automated**. Just:
1. Start frontend
2. Enter email
3. Click Start
4. Watch the magic happen! ✨

No manual uploads, no manual analysis triggers, no manual result fetching. Everything is automatic!

---

## Questions?

Check these files for more details:
- `PRODUCTION_WORKFLOW_STATUS.md` - Complete workflow details
- `FILE_STATUS_ENDPOINT_FIX.md` - Recent fixes
- `CONSISTENT_DEMO_PASSWORD_FIX.md` - Authentication details
- `README.md` - General project info
