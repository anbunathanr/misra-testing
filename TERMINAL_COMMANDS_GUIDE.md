# Complete Terminal Commands Guide - Production MISRA Platform

## 📋 Prerequisites

Before running any commands, make sure you have:
- Node.js 18+ installed
- npm or yarn installed
- AWS CLI configured with credentials
- Git installed

---

## 🚀 Step 1: Clone & Setup Project

### 1.1 Navigate to your project directory
```bash
cd D:\Code\misra-testing
```

### 1.2 Install dependencies (root level)
```bash
npm install
```

This installs dependencies for the entire monorepo (both frontend and backend).

---

## 🔧 Step 2: Backend Setup & Deployment

### 2.1 Navigate to backend directory
```bash
cd packages/backend
```

### 2.2 Install backend dependencies
```bash
npm install
```

### 2.3 Build backend Lambda functions
```bash
npm run build
```

**Expected output**: "All Lambda functions built and zipped successfully!"

### 2.4 Deploy to AWS
```bash
npm run deploy
```

**Expected output**: 
```
✅  MisraPlatform-dev
Outputs:
MisraPlatform-dev.APIEndpoint = https://jno64tiewg.execute-api.us-east-1.amazonaws.com/
```

**Save the API Endpoint** - you'll need it for testing!

### 2.5 (Optional) Check deployment status
```bash
npm run cdk list
```

---

## 🎨 Step 3: Frontend Setup & Running

### 3.1 Navigate to frontend directory
```bash
cd ../frontend
```

Or from root:
```bash
cd packages/frontend
```

### 3.2 Install frontend dependencies
```bash
npm install
```

### 3.3 Create/Update .env.local file
The file should already exist with:
```
VITE_API_URL=https://jno64tiewg.execute-api.us-east-1.amazonaws.com
VITE_COGNITO_USER_POOL_ID=us-east-1_FUqN6j2Li
VITE_COGNITO_CLIENT_ID=68hu9doq9m2v9tca680a740mio
VITE_COGNITO_REGION=us-east-1
```

### 3.4 Start frontend development server
```bash
npm run dev
```

**Expected output**:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Open browser**: http://localhost:5173/

---

## 🧪 Step 4: Test the One-Click Workflow

### 4.1 Open a new terminal (keep frontend running)

### 4.2 Test Start Workflow endpoint
```bash
curl -X POST https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/start \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"your-email@gmail.com\"}"
```

**Replace** `your-email@gmail.com` with your real email address

**Expected response**:
```json
{
  "workflowId": "workflow-1234567890-abc123",
  "status": "INITIATED",
  "progress": 0,
  "message": "Workflow started successfully"
}
```

**Save the workflowId** - you'll need it for the next step!

### 4.3 Test Get Progress endpoint (in a loop)
```bash
curl https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/progress/workflow-1234567890-abc123
```

**Replace** `workflow-1234567890-abc123` with your actual workflowId

**Expected response**:
```json
{
  "workflowId": "workflow-1234567890-abc123",
  "status": "ANALYSIS_TRIGGERED",
  "progress": 75,
  "currentStep": "🧠 AI Analysis Triggered (Lambda)",
  "timestamp": 1234567890
}
```

**Keep running this command every 2 seconds** to watch progress go from 0% → 100%

---

## 📊 Step 5: Monitor Progress in Real-Time

### 5.1 Create a script to poll progress (Windows PowerShell)
```powershell
$workflowId = "workflow-1234567890-abc123"
$apiUrl = "https://jno64tiewg.execute-api.us-east-1.amazonaws.com"

while ($true) {
    $response = Invoke-RestMethod -Uri "$apiUrl/workflow/progress/$workflowId"
    Write-Host "Progress: $($response.progress)% - $($response.currentStep)"
    
    if ($response.progress -eq 100) {
        Write-Host "✅ Workflow completed!"
        break
    }
    
    Start-Sleep -Seconds 2
}
```

Save this as `monitor-progress.ps1` and run:
```powershell
.\monitor-progress.ps1
```

### 5.2 Or use bash (if you have bash installed)
```bash
#!/bin/bash
WORKFLOW_ID="workflow-1234567890-abc123"
API_URL="https://jno64tiewg.execute-api.us-east-1.amazonaws.com"

while true; do
    RESPONSE=$(curl -s "$API_URL/workflow/progress/$WORKFLOW_ID")
    PROGRESS=$(echo $RESPONSE | grep -o '"progress":[0-9]*' | grep -o '[0-9]*')
    STEP=$(echo $RESPONSE | grep -o '"currentStep":"[^"]*' | cut -d'"' -f4)
    
    echo "Progress: $PROGRESS% - $STEP"
    
    if [ "$PROGRESS" -eq 100 ]; then
        echo "✅ Workflow completed!"
        break
    fi
    
    sleep 2
done
```

Save as `monitor-progress.sh` and run:
```bash
chmod +x monitor-progress.sh
./monitor-progress.sh
```

---

## 🔍 Step 6: View Results

### 6.1 Get analysis results (after workflow completes)
```bash
curl https://jno64tiewg.execute-api.us-east-1.amazonaws.com/analysis/results \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Note**: You need the access token from the login response

---

## 🛠️ Step 7: Useful Development Commands

### 7.1 Backend commands
```bash
# From packages/backend directory

# Build only
npm run build

# Deploy only (without rebuild)
npm run deploy

# Build and deploy
npm run deploy

# View CDK stack
npm run cdk list

# Destroy stack (WARNING: deletes all resources)
npm run cdk destroy
```

### 7.2 Frontend commands
```bash
# From packages/frontend directory

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linter
npm run lint

# Format code
npm run format
```

### 7.3 Root level commands
```bash
# From root directory

# Install all dependencies
npm install

# Build all packages
npm run build

# Run tests
npm run test
```

---

## 📝 Step 8: Complete Testing Workflow

### Full test from start to finish:

**Terminal 1 - Start Frontend**:
```bash
cd packages/frontend
npm install
npm run dev
```

**Terminal 2 - Start Workflow**:
```bash
curl -X POST https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/start \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"your-email@gmail.com\"}"
```

**Terminal 3 - Monitor Progress**:
```bash
# Run this command repeatedly every 2 seconds
curl https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/progress/YOUR_WORKFLOW_ID
```

**Terminal 4 - View Results** (after progress reaches 100%):
```bash
curl https://jno64tiewg.execute-api.us-east-1.amazonaws.com/analysis/results
```

---

## 🐛 Troubleshooting Commands

### Check AWS credentials
```bash
aws sts get-caller-identity
```

**Expected output**:
```json
{
    "UserId": "...",
    "Account": "976193236457",
    "Arn": "arn:aws:iam::976193236457:user/sanjanar"
}
```

### Check AWS region
```bash
aws configure get region
```

**Should output**: `us-east-1`

### View Lambda function logs
```bash
aws logs tail /aws/lambda/misra-platform-workflow-start --follow
```

### View DynamoDB table
```bash
aws dynamodb scan --table-name AnalysisProgress
```

### Check S3 bucket
```bash
aws s3 ls misra-files-976193236457-us-east-1/
```

### Check Cognito user pool
```bash
aws cognito-idp list-users --user-pool-id us-east-1_FUqN6j2Li
```

---

## 📱 Quick Reference - All Commands in Order

### First Time Setup:
```bash
# 1. Navigate to project
cd D:\Code\misra-testing

# 2. Install root dependencies
npm install

# 3. Build and deploy backend
cd packages/backend
npm install
npm run build
npm run deploy

# 4. Setup frontend
cd ../frontend
npm install

# 5. Start frontend
npm run dev
```

### Testing:
```bash
# Terminal 1: Frontend running (from step above)

# Terminal 2: Start workflow
curl -X POST https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/start \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"your-email@gmail.com\"}"

# Terminal 3: Monitor progress (replace WORKFLOW_ID)
curl https://jno64tiewg.execute-api.us-east-1.amazonaws.com/workflow/progress/WORKFLOW_ID
```

---

## ✅ Success Indicators

### Backend Deployment Success:
- ✅ Build completes without errors
- ✅ "All Lambda functions built and zipped successfully!"
- ✅ Deployment shows "UPDATE_COMPLETE"
- ✅ API Endpoint is returned

### Frontend Running Success:
- ✅ "VITE ready in xxx ms"
- ✅ Local URL shows: http://localhost:5173/
- ✅ Browser opens without errors

### Workflow Success:
- ✅ Start workflow returns workflowId
- ✅ Progress updates every 2 seconds
- ✅ Progress goes from 0% → 100%
- ✅ Status changes to "COMPLETED"

---

## 🚨 Common Errors & Solutions

### Error: "npm: command not found"
**Solution**: Install Node.js from https://nodejs.org/

### Error: "AWS credentials not configured"
**Solution**: Run `aws configure` and enter your credentials

### Error: "Port 5173 already in use"
**Solution**: Kill the process or use different port:
```bash
npm run dev -- --port 3000
```

### Error: "Workflow not found"
**Solution**: Make sure you copied the workflowId correctly from the start response

### Error: "Invalid email format"
**Solution**: Use a real, deliverable email address (Gmail, Outlook, etc.)

### Error: "ENOSPC: no space left on device"
**Solution**: Clear disk space or use D: drive instead of C:

---

## 📞 Need Help?

1. Check the logs:
   ```bash
   aws logs tail /aws/lambda/misra-platform-workflow-start --follow
   ```

2. Check DynamoDB:
   ```bash
   aws dynamodb scan --table-name AnalysisProgress
   ```

3. Check CloudFormation stack:
   ```bash
   aws cloudformation describe-stacks --stack-name MisraPlatform-dev
   ```

4. View all resources:
   ```bash
   aws cloudformation list-stack-resources --stack-name MisraPlatform-dev
   ```

---

**Ready to start? Begin with Step 1!**
