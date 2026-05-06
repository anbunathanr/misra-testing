# Architecture Changes - Same Browser Session & Real-Time Progress

## Overview

The implementation now uses a unified browser session where:
1. **Phase 1**: User registers on localhost (manual)
2. **Phase 2**: Playwright automation runs in the SAME browser session (automatic)
3. **Real-time progress** is displayed with checkmarks as each step completes
4. **Downloads happen once** with duplicate detection

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User's Browser                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  localhost:3000 (Registration & Dashboard)           │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ 1. Registration Form (Manual)                  │  │   │
│  │  │    - Full Name, Email, Mobile                  │  │   │
│  │  │    - Send OTP button                           │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ 2. OTP Verification (Manual)                   │  │   │
│  │  │    - Enter 6-digit OTP                         │  │   │
│  │  │    - Verify & Login button                     │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ 3. Dashboard (After OTP Verified)              │  │   │
│  │  │    - Welcome message                           │  │   │
│  │  │    - TEST button                               │  │   │
│  │  │    ┌──────────────────────────────────────┐    │  │   │
│  │  │    │ Progress Display (After TEST clicked)│    │  │   │
│  │  │    │ ✅ Launch Browser                    │    │  │   │
│  │  │    │ ✅ Navigate to MISRA                 │    │  │   │
│  │  │    │ ⏳ OTP Verification                  │    │  │   │
│  │  │    │ ⭕ File Upload                       │    │  │   │
│  │  │    │ ⭕ Code Analysis                     │    │  │   │
│  │  │    │ ⭕ Download Reports                  │    │  │   │
│  │  │    │ ⭕ Verification Complete             │    │  │   │
│  │  │    └──────────────────────────────────────┘    │  │   │
│  │  │    ┌──────────────────────────────────────┐    │  │   │
│  │  │    │ Browser Container (Embedded View)    │    │  │   │
│  │  │    │ Shows: MISRA Platform Loading...     │    │  │   │
│  │  │    │ (Real-time automation happening)     │    │  │   │
│  │  │    └──────────────────────────────────────┘    │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MISRA Platform (https://misra.digitransolutions.in) │   │
│  │  (Opened in SAME browser session after TEST clicked) │   │
│  │  ┌────────────────────────────────────────────────┐  │   │
│  │  │ - Auto-filled credentials                      │  │   │
│  │  │ - File upload (automatic)                      │  │   │
│  │  │ - Code analysis (automatic)                    │  │   │
│  │  │ - Download reports (automatic)                 │  │   │
│  │  └────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
                    (Same Browser Session)
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Playwright Automation                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Browser Instance (Headless: false)                  │   │
│  │ - Reuses existing browser context                   │   │
│  │ - Reuses existing page                              │   │
│  │ - Navigates to MISRA in SAME page                   │   │
│  │ - Auto-fills credentials                            │   │
│  │ - Starts analysis                                   │   │
│  │ - Intercepts downloads                              │   │
│  │ - Verifies files                                    │   │
│  │ - Sends progress updates                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
                    (Progress Updates)
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                   Express Server                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Session Management                                  │   │
│  │ - Store user credentials                            │   │
│  │ - Track OTP verification                            │   │
│  │ - Track test running status                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Progress Tracking                                   │   │
│  │ - Track current step                                │   │
│  │ - Track step status (pending/in-progress/completed) │   │
│  │ - Provide progress API                              │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ API Endpoints                                       │   │
│  │ - POST /api/send-otp                                │   │
│  │ - POST /api/verify-otp                              │   │
│  │ - POST /api/start-test                              │   │
│  │ - GET /api/progress                                 │   │
│  │ - POST /api/progress (update from Playwright)       │   │
│  │ - GET /api/credentials                              │   │
│  │ - POST /api/logout                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Registration Phase
```
User Input (localhost:3000)
    ↓
POST /api/send-otp
    ↓
Server stores credentials
    ↓
Headless browser triggers OTP on MISRA
    ↓
OTP sent to user's email
    ↓
User enters OTP
    ↓
POST /api/verify-otp
    ↓
Server marks OTP as verified
```

### 2. Automation Phase
```
User clicks TEST button
    ↓
POST /api/start-test
    ↓
Server sets testRunning = true
    ↓
Server initializes progress steps
    ↓
Browser polls GET /api/progress every 1 second
    ↓
Playwright test starts
    ↓
For each step:
  - Playwright executes step
  - Playwright sends POST /api/progress
  - Server updates progress
  - Browser receives update
  - Progress display updates with checkmark
    ↓
All steps complete
    ↓
Server sets testRunning = false
    ↓
Browser stops polling
```

### 3. Download Phase
```
Analysis completes on MISRA
    ↓
Download buttons appear
    ↓
Playwright clicks download buttons
    ↓
Download event fires
    ↓
DownloadManager.handleDownload()
    ↓
Check if file already downloaded (Map lookup)
    ↓
If duplicate: delete and return
    ↓
If new: save file
    ↓
Verify file integrity
    ↓
Update manifest
    ↓
Log verification result
```

## Key Components

### 1. Browser Session Management
**File**: `packages/backend/tests/complete-hybrid-workflow.spec.ts`

```typescript
// Reuse existing context
const contexts = browser.contexts();
if (contexts.length > 0) {
  misraContext = contexts[0];
} else {
  misraContext = await browser.newContext();
}

// Reuse existing page
const pages = misraContext.pages();
if (pages.length > 0) {
  misraPage = pages[0];
} else {
  misraPage = await misraContext.newPage();
}

// Navigate in SAME page
await misraPage.goto('https://misra.digitransolutions.in');
```

### 2. Download Deduplication
**File**: `packages/backend/tests/download-manager.ts`

```typescript
// Track downloads in Map
private downloadedFiles: Map<string, DownloadedFile> = new Map();

// Check for duplicates
if (this.downloadedFiles.has(filename)) {
  console.log(`Skipping duplicate: ${filename}`);
  await download.delete();
  return;
}

// Mark as downloading
this.downloadedFiles.set(filename, { /* ... */ });

// Process download
await download.saveAs(filepath);

// Update with complete info
this.downloadedFiles.set(filename, downloadedFile);
```

### 3. Progress Tracking
**File**: `hybrid-server.js`

```javascript
// Progress state
let progressData = {
  isRunning: false,
  currentStep: '',
  steps: [
    { id: 'launch-browser', name: 'Launch Browser', status: 'pending' },
    // ... more steps
  ]
};

// Update progress
app.post('/api/progress', (req, res) => {
  const { stepId, status, currentStep } = req.body;
  
  const step = progressData.steps.find(s => s.id === stepId);
  if (step) {
    step.status = status;
  }
  
  if (currentStep) {
    progressData.currentStep = currentStep;
  }
});

// Get progress
app.get('/api/progress', (req, res) => {
  res.json({
    success: true,
    data: progressData
  });
});
```

### 4. Real-Time Progress Display
**File**: `public/index.html`

```javascript
// Poll for progress updates
async function pollProgressUpdates() {
  const response = await fetch('/api/progress');
  const result = await response.json();
  
  if (result.data) {
    // Update progress steps
    result.data.steps.forEach(step => {
      const localStep = progressSteps.find(s => s.id === step.id);
      if (localStep) {
        localStep.status = step.status;
      }
    });
    
    // Update display
    updateProgressDisplay();
    
    // Continue polling if running
    if (result.data.isRunning) {
      setTimeout(pollProgressUpdates, 1000);
    }
  }
}
```

## Benefits

1. **Same Browser Session**
   - User sees automation happening in real-time
   - No separate Playwright window
   - Unified user experience

2. **Real-Time Progress**
   - Immediate feedback on each step
   - Visual checkmarks for completed steps
   - Current step displayed

3. **No Duplicate Downloads**
   - Each file downloaded exactly once
   - Automatic duplicate detection
   - Prevents file conflicts

4. **Better Error Handling**
   - Failed steps marked with ❌
   - Error messages displayed
   - Graceful fallback mechanisms

5. **Improved User Experience**
   - Clear progress indication
   - No guessing about what's happening
   - Professional appearance

## Technical Improvements

1. **Browser Context Reuse**
   - Reduces memory usage
   - Faster automation
   - Simpler session management

2. **Map-Based Duplicate Detection**
   - O(1) lookup time
   - Prevents race conditions
   - Handles concurrent downloads

3. **Polling-Based Progress**
   - Simple implementation
   - Works with any server
   - Fallback to API if WebSocket fails

4. **Modular Progress Updates**
   - Easy to add new steps
   - Flexible status tracking
   - Extensible architecture

## Future Enhancements

1. **WebSocket Real-Time Updates**
   - Replace polling with WebSocket
   - Reduce server load
   - Instant updates

2. **Browser Content Streaming**
   - Stream MISRA page content to embedded view
   - Show actual page rendering
   - Real-time page updates

3. **Advanced Error Recovery**
   - Automatic retry on failure
   - Alternative download methods
   - Fallback verification

4. **Analytics & Reporting**
   - Track automation metrics
   - Generate reports
   - Performance analysis

## Deployment

### Prerequisites
- Node.js 14+
- Playwright 1.40+
- Chrome/Chromium browser
- Port 3000 available

### Installation
```bash
npm install
```

### Running
```bash
npm run test:complete
```

### Configuration
- IMAP credentials in `.env.test`
- MISRA URL: https://misra.digitransolutions.in
- Localhost URL: http://localhost:3000
- Download timeout: 60 seconds
- Analysis timeout: 5 minutes

## Monitoring

### Server Logs
```
🚀 Hybrid MISRA Testing Server running on http://localhost:3000
📊 Progress: Launch Browser - completed
📊 Progress: Navigate to MISRA - in-progress
📊 Progress: OTP Verification - completed
...
```

### Browser Console
```
Progress polling started
Progress updated: 7 steps
Step status: launch-browser = completed
Step status: navigate-misra = in-progress
...
```

### Download Logs
```
📥 Download started: report.pdf
✅ Download completed: report.pdf
🔍 Verifying file: report.pdf
✅ Verification successful
```
