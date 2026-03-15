# API Testing Issues and Resolution

## Issue Discovered

**Date**: February 22, 2026  
**Status**: ❌ BLOCKING - API endpoints returning 500 errors

### Problem Description

When testing the deployed AI Test Generation API endpoints, all requests return:
```json
{"message":"Internal Server Error"}
```

### Root Cause

CloudWatch logs show the Lambda functions are failing to initialize:

```
Runtime.ImportModuleError: Error: Cannot find module '../../../package.json'
Require stack:
- /var/task/index.js
- /var/runtime/index.mjs
```

The issue is caused by the `@sparticuz/chromium` package used in `BrowserService`. This package:
1. Is designed for AWS Lambda to provide a headless Chromium binary
2. Tries to load its own `package.json` during initialization
3. The CDK bundling process doesn't include this file in the Lambda deployment package

### Affected Endpoints

All AI Test Generation endpoints are affected:
- ❌ POST `/ai-test-generation/analyze`
- ❌ POST `/ai-test-generation/generate`
- ❌ POST `/ai-test-generation/batch`
- ❌ GET `/ai-test-generation/usage`

### Technical Details

**File**: `packages/backend/src/services/browser-service.ts`
```typescript
import chromiumPkg from '@sparticuz/chromium';

// This import causes the Lambda to try loading package.json
const browser = await chromium.launch({
  args: chromiumPkg.args,
  executablePath: await chromiumPkg.executablePath(),
  headless: chromiumPkg.headless === true || chromiumPkg.headless === 'shell',
});
```

**CDK Configuration**: `packages/backend/src/infrastructure/minimal-stack.ts`
```typescript
bundling: {
  minify: true,
  sourceMap: false,
  externalModules: ['@aws-sdk/*'], // Only AWS SDK is external
}
```

## Solution Options

### Option 1: Include package.json in Bundle (Quick Fix)

Modify the CDK bundling configuration to include package.json:

```typescript
bundling: {
  minify: true,
  sourceMap: false,
  externalModules: ['@aws-sdk/*'],
  nodeModules: ['@sparticuz/chromium'], // Force include this module
  commandHooks: {
    beforeBundling(inputDir: string, outputDir: string): string[] {
      return [];
    },
    afterBundling(inputDir: string, outputDir: string): string[] {
      return [
        `cp ${inputDir}/package.json ${outputDir}/package.json`,
      ];
    },
  },
}
```

### Option 2: Use Lambda Layer for Chromium (Recommended)

Create a Lambda Layer with the Chromium binary:

1. Create a layer with `@sparticuz/chromium`
2. Attach the layer to Lambda functions
3. Update BrowserService to use the layer

```typescript
const chromiumLayer = new lambda.LayerVersion(this, 'ChromiumLayer', {
  code: lambda.Code.fromAsset('layers/chromium'),
  compatibleRuntimes: [lambda.Runtime.NODEJS_20_X],
  description: 'Chromium binary for Playwright',
});

const aiAnalyzeFunction = new lambdaNodejs.NodejsFunction(this, 'AIAnalyzeFunction', {
  // ... other config
  layers: [chromiumLayer],
});
```

### Option 3: Use Playwright's Built-in Chromium

Switch from `@sparticuz/chromium` to Playwright's built-in browser:

```typescript
// Remove @sparticuz/chromium import
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
});
```

**Note**: This requires including Playwright browsers in the Lambda package, which increases size significantly.

### Option 4: Mock Browser Service for Testing

For immediate API testing, temporarily mock the BrowserService:

```typescript
// In analyze.ts
if (process.env.MOCK_BROWSER === 'true') {
  // Return mock analysis data
  return {
    statusCode: 200,
    body: JSON.stringify({
      analysis: {
        url: request.url,
        elements: [],
        patterns: [],
        flows: [],
        metadata: { title: 'Mock', description: '' }
      }
    })
  };
}
```

## Recommended Action Plan

### Immediate (Testing Phase)
1. ✅ Document the issue (this file)
2. ⏳ Implement Option 4 (Mock Browser) to unblock API testing
3. ⏳ Test other endpoints that don't use BrowserService

### Short-term (Production Fix)
1. ⏳ Implement Option 2 (Lambda Layer) - most scalable
2. ⏳ Update CDK stack configuration
3. ⏳ Redeploy and test

### Long-term (Optimization)
1. ⏳ Consider serverless browser solutions (e.g., Browserless.io)
2. ⏳ Evaluate cost vs. performance trade-offs
3. ⏳ Implement browser pooling for better performance

## Testing Without Browser

While the browser issue is being fixed, we can test other parts of the system:

### Endpoints That Don't Need Browser
- ✅ GET `/ai-test-generation/usage` - Only queries DynamoDB
- ✅ POST `/ai-test-generation/generate` - Uses AI but not browser (if analysis is provided)

### Test Commands

```powershell
# Test usage endpoint (requires auth)
$headers = @{
  "Authorization" = "Bearer YOUR_TOKEN"
  "Content-Type" = "application/json"
}
Invoke-WebRequest -Uri "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/usage?userId=test-user" -Headers $headers

# Test generate endpoint with pre-analyzed data
$body = @{
  analysis = @{
    url = "https://example.com"
    elements = @()
    patterns = @()
    flows = @()
    metadata = @{ title = "Test"; description = "" }
  }
  scenario = "Test login"
  projectId = "test-project"
  suiteId = "test-suite"
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri "https://dqn2f3sgu3.execute-api.us-east-1.amazonaws.com/ai-test-generation/generate" -Method POST -Body $body -Headers $headers
```

## Impact Assessment

### Severity: HIGH
- All AI test generation features are non-functional
- Blocks user testing of core features
- Does not affect other parts of the system (test execution, notifications, etc.)

### Affected Features
- ❌ Web application analysis
- ❌ AI test case generation (analyze step)
- ❌ Batch test generation
- ⚠️ Manual test case creation (still works)
- ✅ Test execution (not affected)
- ✅ Notifications (not affected)

## Next Steps

1. User decision needed: Which solution option to implement?
2. If Option 4 (Mock): Quick fix to enable testing
3. If Option 2 (Layer): Proper production fix
4. Redeploy and verify

---

**Status**: Awaiting user input on preferred solution approach
