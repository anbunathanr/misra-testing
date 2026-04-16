const http = require('http');
const url = require('url');

const PORT = process.env.PORT || 3003;

// Mock test login response
const mockTestLoginResponse = {
  accessToken: 'mock-access-token-' + Date.now(),
  refreshToken: 'mock-refresh-token-' + Date.now(),
  user: {
    userId: 'mock-user-id-' + Math.random().toString(36).substring(7),
    email: 'test-misra@example.com',
    name: 'Test User'
  },
  expiresIn: 3600,
  testOtp: Math.floor(100000 + Math.random() * 900000).toString(),
  testMode: true
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  console.log(`[${new Date().toISOString()}] ${req.method} ${path}`);

  // Health check endpoint
  if (path === '/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'MISRA Local Test Server'
    }));
    return;
  }

  // Test login endpoint
  if (path === '/auth/test-login' && req.method === 'POST') {
    // Simulate some processing time
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockTestLoginResponse));
    }, 500); // 500ms delay to simulate real API
    return;
  }

  // Mock file upload endpoint
  if (path === '/file/upload' && req.method === 'POST') {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        fileId: 'mock-file-' + Date.now(),
        fileName: 'test-file.c',
        uploadedAt: new Date().toISOString(),
        status: 'uploaded'
      }));
    }, 800);
    return;
  }

  // Mock analysis endpoint
  if (path === '/analysis/analyze' && req.method === 'POST') {
    setTimeout(() => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        analysisId: 'mock-analysis-' + Date.now(),
        status: 'completed',
        complianceScore: 92,
        violationsFound: 3,
        completedAt: new Date().toISOString(),
        results: {
          totalRules: 50,
          passedRules: 46,
          failedRules: 3,
          skippedRules: 1
        }
      }));
    }, 2000); // 2 second delay to simulate analysis
    return;
  }

  // Default 404 response
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    error: 'Not Found', 
    path: path,
    availableEndpoints: [
      'GET /health',
      'POST /auth/test-login',
      'POST /file/upload',
      'POST /analysis/analyze'
    ]
  }));
});

server.listen(PORT, () => {
  console.log('🚀 MISRA Local Test Server started!');
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   GET  /health           - Health check');
  console.log('   POST /auth/test-login  - Get test credentials');
  console.log('   POST /file/upload      - Mock file upload');
  console.log('   POST /analysis/analyze - Mock MISRA analysis');
  console.log('');
  console.log('💡 To test the server:');
  console.log(`   curl http://localhost:${PORT}/health`);
  console.log('');
  console.log('🔧 To use with test-button.html:');
  console.log('   1. Select "Local Development" environment');
  console.log('   2. Click "Run Test"');
  console.log('');
  console.log('⏹️  Press Ctrl+C to stop the server');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});