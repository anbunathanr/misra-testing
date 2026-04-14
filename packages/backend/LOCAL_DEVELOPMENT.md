# Local Development Setup

This guide explains how to run the MISRA backend locally for testing purposes.

## Quick Start

### Option 1: Simple Local Test Server (Recommended)

1. **Start the local test server:**
   ```bash
   cd packages/backend
   npm run dev
   ```

2. **Open the test page:**
   - Open `packages/backend/test-button.html` in your browser
   - Select "Local Development (localhost:3000)" environment
   - Click "Run Test"

The local test server provides mock endpoints that simulate the real AWS Lambda functions:
- `GET /health` - Health check
- `POST /auth/test-login` - Mock authentication
- `POST /file/upload` - Mock file upload
- `POST /analysis/analyze` - Mock MISRA analysis

### Option 2: SAM CLI (Advanced)

If you have AWS SAM CLI installed and configured:

```bash
cd packages/backend
sam local start-api --port 3001
```

## Test Server Features

The local test server (`local-test-server.js`) provides:

- ✅ **CORS enabled** - Works with browser requests
- ✅ **Mock authentication** - Returns test tokens and OTP
- ✅ **Realistic delays** - Simulates network latency
- ✅ **Proper error handling** - Returns appropriate HTTP status codes
- ✅ **Logging** - Shows all incoming requests
- ✅ **Health checks** - Endpoint for connectivity testing

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check endpoint |
| POST | `/auth/test-login` | Get test credentials |
| POST | `/file/upload` | Mock file upload |
| POST | `/analysis/analyze` | Mock MISRA analysis |

## Testing the Server

Test the server directly with curl:

```bash
# Health check
curl http://localhost:3001/health

# Test login
curl -X POST http://localhost:3001/auth/test-login \
  -H "Content-Type: application/json"
```

## Troubleshooting

### Port Already in Use
If port 3001 is already in use, you can:
1. Stop the process using port 3001
2. Or modify the PORT in `local-test-server.js`
3. Update the backend URL in `test-button.html` accordingly

### CORS Issues
The local server has CORS enabled by default. If you still see CORS errors:
1. Make sure you're accessing the test page via `http://` (not `file://`)
2. Check browser console for specific CORS error messages

### Connection Refused
If you see "Connection refused" errors:
1. Make sure the local server is running (`npm run dev`)
2. Check that it's listening on the correct port (3001)
3. Verify the URL in test-button.html matches the server port

## Production vs Local

| Feature | Local Server | Production |
|---------|-------------|------------|
| Authentication | Mock tokens | Real Cognito |
| File Upload | Mock response | Real S3 |
| MISRA Analysis | Mock results | Real analysis engine |
| Database | No persistence | DynamoDB |
| Deployment | Node.js process | AWS Lambda |

## Next Steps

Once local testing works:
1. Deploy to AWS for real backend testing
2. Use Development/Staging environments in test-button.html
3. Test with real file uploads and analysis