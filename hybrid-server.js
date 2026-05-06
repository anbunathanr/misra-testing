const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const { spawn } = require('child_process')
const path = require('path')
const WebSocket = require('ws')
const http = require('http')

const app = express()
const PORT = 3000

// Create HTTP server for WebSocket support
const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

// Middleware
app.use(cors())
app.use(bodyParser.json())
app.use(express.static('public'))

// In-memory storage for session data
let sessionData = {
  fullName: '',
  email: '',
  mobileNumber: '',
  otpVerified: false,
  testRunning: false
}

// WebSocket clients for real-time updates
let wsClients = new Set()

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected')
  wsClients.add(ws)

  // Send initial progress state
  ws.send(JSON.stringify({
    type: 'progress',
    data: progressData
  }))

  // Handle client disconnect
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected')
    wsClients.delete(ws)
  })

  // Handle errors
  ws.on('error', (error) => {
    console.log(`⚠️  WebSocket error: ${error}`)
    wsClients.delete(ws)
  })
})

// Function to broadcast progress updates to all connected clients
function broadcastProgress(update) {
  const message = JSON.stringify({
    type: 'progress',
    data: update,
    timestamp: new Date().toISOString()
  })

  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  })
}

// Progress tracking
let progressData = {
  isRunning: false,
  currentStep: '',
  steps: [
    { id: 'launch-browser', name: 'Launch Browser', status: 'pending' },
    { id: 'navigate-misra', name: 'Navigate to MISRA', status: 'pending' },
    { id: 'otp-verification', name: 'OTP Verification', status: 'pending' },
    { id: 'file-upload', name: 'File Upload', status: 'pending' },
    { id: 'code-analysis', name: 'Code Analysis', status: 'pending' },
    { id: 'download-reports', name: 'Download Reports', status: 'pending' },
    { id: 'verification-complete', name: 'Verification Complete', status: 'pending' }
  ]
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

// API to store user data and send OTP
app.post('/api/send-otp', async (req, res) => {
  try {
    const { fullName, email, mobileNumber } = req.body
    
    // Validate input
    if (!fullName || !email || !mobileNumber) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      })
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      })
    }

    // Mobile validation (10 digits)
    if (!/^\d{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number must be 10 digits'
      })
    }

    // Store session data
    sessionData = {
      ...sessionData,
      fullName,
      email,
      mobileNumber,
      otpVerified: false
    }

    console.log(`📧 User registered: ${fullName} (${email})`)
    console.log('🚀 Triggering OTP from MISRA platform using direct registration...')

    // Use Playwright to ONLY trigger OTP (no browser window for user)
    try {
      await triggerOTPFromMISRA(fullName, email, mobileNumber)
      
      console.log('✅ OTP request sent to MISRA platform')
      console.log('📨 OTP should arrive from ceo@digitransolutions.in')

      res.json({
        success: true,
        message: 'OTP sent successfully! Check your email from ceo@digitransolutions.in'
      })

    } catch (misraError) {
      console.log('⚠️ Automated OTP trigger failed:', misraError.message)
      console.log('📨 Fallback: Please manually visit misra.digitransolutions.in to receive OTP')
      
      // Fallback: Still return success but with manual instruction
      res.json({
        success: true,
        message: 'Please visit misra.digitransolutions.in and register with these details to receive OTP from ceo@digitransolutions.in'
      })
    }

  } catch (error) {
    console.error('❌ Error in send-otp:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to process registration'
    })
  }
})

// Function to trigger OTP from MISRA platform (HEADLESS - no browser window)
async function triggerOTPFromMISRA(fullName, email, mobileNumber) {
  const { chromium } = require('playwright')
  
  console.log('🎭 Starting headless browser to trigger OTP...')
  
  const browser = await chromium.launch({ headless: true }) // HEADLESS MODE
  const context = await browser.newContext()
  const page = await context.newPage()
  
  try {
    // Navigate to MISRA platform
    console.log('🌐 Navigating to MISRA platform...')
    await page.goto('https://misra.digitransolutions.in', { waitUntil: 'networkidle' })
    
    // Wait for page to load
    await page.waitForTimeout(3000)
    console.log('📝 Looking for registration form...')
    
    // Look for name field with various possible selectors
    let nameField = null
    const nameSelectors = [
      'input[placeholder*="name" i]',
      'input[placeholder*="Name" i]',
      'input[name*="name" i]',
      'input[id*="name" i]',
      'input[type="text"]',
      '#fullName',
      '#name',
      '[name="fullName"]',
      '[name="name"]'
    ]
    
    for (const selector of nameSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 })
        nameField = page.locator(selector).first()
        console.log(`✅ Found name field with selector: ${selector}`)
        break
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!nameField) {
      throw new Error('Could not find name input field on the page')
    }
    
    // Fill name field
    await nameField.fill(fullName)
    console.log('✅ Filled name field')
    
    // Look for email field
    let emailField = null
    const emailSelectors = [
      'input[type="email"]',
      'input[placeholder*="email" i]',
      'input[name*="email" i]',
      'input[id*="email" i]',
      '#email',
      '[name="email"]'
    ]
    
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 })
        emailField = page.locator(selector).first()
        console.log(`✅ Found email field with selector: ${selector}`)
        break
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!emailField) {
      throw new Error('Could not find email input field on the page')
    }
    
    // Fill email field
    await emailField.fill(email)
    console.log('✅ Filled email field')
    
    // Look for mobile field
    let mobileField = null
    const mobileSelectors = [
      'input[type="tel"]',
      'input[placeholder*="mobile" i]',
      'input[placeholder*="phone" i]',
      'input[name*="mobile" i]',
      'input[name*="phone" i]',
      'input[id*="mobile" i]',
      'input[id*="phone" i]',
      '#mobile',
      '#mobileNumber',
      '#phone',
      '[name="mobile"]',
      '[name="mobileNumber"]',
      '[name="phone"]'
    ]
    
    for (const selector of mobileSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 })
        mobileField = page.locator(selector).first()
        console.log(`✅ Found mobile field with selector: ${selector}`)
        break
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!mobileField) {
      throw new Error('Could not find mobile input field on the page')
    }
    
    // Fill mobile field
    await mobileField.fill(mobileNumber)
    console.log('✅ Filled mobile field')
    
    // Look for submit button
    let submitButton = null
    const buttonSelectors = [
      'button:has-text("Start")',
      'button:has-text("Submit")',
      'button:has-text("Send")',
      'button:has-text("Register")',
      'input[type="submit"]',
      'button[type="submit"]',
      'button',
      '[type="submit"]'
    ]
    
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 })
        submitButton = page.locator(selector).first()
        console.log(`✅ Found submit button with selector: ${selector}`)
        break
      } catch (e) {
        // Continue to next selector
      }
    }
    
    if (!submitButton) {
      throw new Error('Could not find submit button on the page')
    }
    
    // Click the submit button
    console.log('🚀 Clicking submit button to trigger OTP...')
    await submitButton.click()
    
    // Wait for response
    await page.waitForTimeout(3000)
    
    console.log('✅ OTP trigger completed successfully (headless)')
    
  } catch (error) {
    console.error('❌ Error triggering OTP:', error.message)
    throw error
  } finally {
    await browser.close()
  }
}

// API to verify OTP (manual entry)
app.post('/api/verify-otp', (req, res) => {
  const { otp } = req.body

  if (!otp) {
    return res.status(400).json({
      success: false,
      message: 'OTP is required'
    })
  }

  if (!sessionData.email) {
    return res.status(400).json({
      success: false,
      message: 'No registration found. Please register first.'
    })
  }

  // For demo purposes, accept any 6-digit OTP
  // In real implementation, you would verify against the actual OTP
  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({
      success: false,
      message: 'OTP must be 6 digits'
    })
  }

  sessionData.otpVerified = true
  console.log(`✅ OTP verified for ${sessionData.email}`)

  res.json({
    success: true,
    message: 'OTP verified successfully',
    userData: {
      fullName: sessionData.fullName,
      email: sessionData.email,
      mobileNumber: sessionData.mobileNumber
    }
  })
})

// API to get current session data
app.get('/api/session', (req, res) => {
  res.json({
    success: true,
    data: sessionData
  })
})

// API to get user credentials for Playwright automation
app.get('/api/credentials', (req, res) => {
  if (!sessionData.otpVerified) {
    return res.status(400).json({
      success: false,
      message: 'User not verified'
    })
  }
  
  res.json({
    success: true,
    credentials: {
      fullName: sessionData.fullName,
      email: sessionData.email,
      mobileNumber: sessionData.mobileNumber
    }
  })
})

// API for troubleshooting - shows current server status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    server: 'running',
    timestamp: new Date().toISOString(),
    session: {
      hasUser: !!sessionData.email,
      otpVerified: sessionData.otpVerified,
      testRunning: sessionData.testRunning,
      userEmail: sessionData.email ? sessionData.email.substring(0, 3) + '***' : 'none'
    }
  })
})

// API to logout and reset session
app.post('/api/logout', (req, res) => {
  console.log(`🚪 User logged out: ${sessionData.email || 'Unknown'}`)
  
  // Reset session data
  sessionData = {
    fullName: '',
    email: '',
    mobileNumber: '',
    otpVerified: false,
    testRunning: false
  }
  
  console.log('✅ Session data reset')
  
  res.json({
    success: true,
    message: 'Logged out successfully'
  })
})

// API to get progress updates
app.get('/api/progress', (req, res) => {
  res.json({
    success: true,
    data: {
      isRunning: progressData.isRunning,
      currentStep: progressData.currentStep,
      steps: progressData.steps
    }
  })
})

// API to update progress (called by Playwright test)
app.post('/api/progress', (req, res) => {
  const { stepId, status, currentStep } = req.body
  
  if (stepId) {
    const step = progressData.steps.find(s => s.id === stepId)
    if (step) {
      step.status = status
      console.log(`📊 Progress: ${step.name} - ${status}`)
    }
  }
  
  if (currentStep) {
    progressData.currentStep = currentStep
  }
  
  // Broadcast progress update to all WebSocket clients
  broadcastProgress(progressData)
  
  res.json({
    success: true,
    message: 'Progress updated'
  })
})

// API to start test (opens MISRA platform AND starts E2E automation)
app.post('/api/start-test', (req, res) => {
  if (!sessionData.otpVerified) {
    return res.status(400).json({
      success: false,
      message: 'Please verify OTP first'
    })
  }

  if (sessionData.testRunning) {
    return res.status(400).json({
      success: false,
      message: 'Test is already running'
    })
  }

  sessionData.testRunning = true
  progressData.isRunning = true
  
  // Reset progress steps
  progressData.steps.forEach(step => {
    step.status = 'pending'
  })
  progressData.currentStep = 'Initializing automation...'
  
  console.log(`🚀 TEST button clicked by ${sessionData.fullName} (${sessionData.email})`)
  console.log(`🌐 MISRA will navigate in the SAME browser tab`)
  console.log(`📧 User Email: ${sessionData.email}`)
  console.log(`👤 User Name: ${sessionData.fullName}`)
  console.log(`📱 User Mobile: ${sessionData.mobileNumber}`)
  console.log(`💡 IMPORTANT: Keep your browser window open - MISRA will load in the same tab`)

  // Note: When using npm run test:complete, the Playwright test handles the MISRA automation
  // This API just confirms the TEST button was clicked and credentials are ready

  res.json({
    success: true,
    message: 'TEST button clicked - MISRA will navigate in the SAME browser tab',
    userData: {
      fullName: sessionData.fullName,
      email: sessionData.email,
      mobileNumber: sessionData.mobileNumber
    },
    misraUrl: 'https://misra.digitransolutions.in',
    note: 'MISRA will open in the same browser tab where you are now'
  })
})

// Function to start E2E automation (uses existing e2e-automation.spec.ts)
function startE2EAutomation() {
  try {
    // Path to the backend directory where the Playwright test is located
    const backendPath = path.join(__dirname, 'packages', 'backend')
    
    // Set environment variables for the E2E test
    const env = {
      ...process.env,
      TEST_EMAIL: sessionData.email,
      TEST_NAME: sessionData.fullName,
      TEST_MOBILE: sessionData.mobileNumber,
      BASE_URL: 'https://misra.digitransolutions.in',
      LOCALHOST_URL: 'http://localhost:3000'
    }

    console.log(`🎭 Starting E2E Playwright automation...`)
    console.log(`🌐 MISRA URL: https://misra.digitransolutions.in`)
    console.log(`📧 Test Email: ${sessionData.email}`)
    console.log(`👤 Test Name: ${sessionData.fullName}`)
    console.log(`📱 Test Mobile: ${sessionData.mobileNumber}`)

    // Use full path to node and npx for better compatibility
    const isWindows = process.platform === 'win32'
    const npxCommand = isWindows ? 'npx.cmd' : 'npx'
    
    console.log(`🔧 Using npx command: ${npxCommand}`)
    console.log(`📁 Working directory: ${backendPath}`)

    // Spawn the E2E Playwright test process (existing e2e-automation.spec.ts)
    const playwrightProcess = spawn(npxCommand, [
      'playwright', 'test', 
      '--grep', 'Complete MISRA Analysis Workflow',
      '--headed'
    ], {
      cwd: backendPath,
      env,
      stdio: 'inherit', // This will show output in the terminal
      shell: true // Use shell to resolve npx path
    })

    // Handle process completion
    playwrightProcess.on('close', (code) => {
      sessionData.testRunning = false
      
      if (code === 0) {
        console.log('✅ E2E automation completed successfully!')
        console.log('📁 Check for downloaded files and screenshots')
      } else {
        console.log(`❌ E2E automation failed with exit code: ${code}`)
      }
    })

    // Handle process errors
    playwrightProcess.on('error', (error) => {
      console.error(`❌ E2E automation process error: ${error}`)
      sessionData.testRunning = false
      
      // Fallback: Provide manual command
      console.log(`\n🔧 FALLBACK: Run this command manually in a new terminal:`)
      console.log(`cd packages/backend`)
      console.log(`npx playwright test --grep "Complete MISRA Analysis Workflow" --headed`)
      console.log(`\nOr use the npm script:`)
      console.log(`npm run test:e2e:full`)
    })

  } catch (error) {
    console.error(`❌ Error starting E2E automation: ${error}`)
    sessionData.testRunning = false
    
    // Provide manual fallback
    console.log(`\n🔧 MANUAL FALLBACK: Please run this command in a new terminal:`)
    console.log(`npm run test:e2e:full`)
  }
}

// Start server with error handling and port fallback
function startServer(port) {
  server.listen(port, () => {
    console.log(`🚀 Hybrid MISRA Testing Server running on http://localhost:${port}`)
    console.log(`📊 Dashboard: http://localhost:${port}`)
    console.log(`🔌 WebSocket: ws://localhost:${port}`)
    console.log(`🔧 Session Data: ${JSON.stringify(sessionData, null, 2)}`)
    console.log(`📁 Working Directory: ${__dirname}`)
    console.log(`🎭 Playwright Path: ${path.join(__dirname, 'packages', 'backend')}`)
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${port} is already in use!`)
      const nextPort = port + 1
      console.log(`🔄 Trying port ${nextPort}...`)
      startServer(nextPort)
    } else {
      console.error(`❌ Server error:`, err)
      process.exit(1)
    }
  })
}

startServer(PORT)