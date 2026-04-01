# Amazon Bedrock Troubleshooting Guide

## Overview

This guide provides solutions to common issues encountered when using Amazon Bedrock with Claude 3.5 Sonnet for AI-powered test generation. It covers error handling, IAM permissions, rate limiting, and cost optimization.

**Last Updated**: Current Session  
**Target Audience**: Developers, DevOps Engineers, Platform Operators

---

## Table of Contents

1. [Common Bedrock Errors](#common-bedrock-errors)
2. [IAM Permission Issues](#iam-permission-issues)
3. [Rate Limiting Solutions](#rate-limiting-solutions)
4. [Cost Optimization Strategies](#cost-optimization-strategies)
5. [Circuit Breaker Issues](#circuit-breaker-issues)
6. [Performance Optimization](#performance-optimization)
7. [Debugging Tools](#debugging-tools)

---

## Common Bedrock Errors

### 1. ThrottlingException

**Error Message**:
```
ThrottlingException: Rate exceeded
AI_RATE_LIMIT: Bedrock rate limit exceeded
```

**Root Cause**:
- Too many requests to Bedrock API in a short time period
- Default quotas: 10 requests/second for Claude 3.5 Sonnet
- Burst capacity exceeded

**Solutions**:

#### Immediate Fix
The system automatically retries with exponential backoff (1s, 2s, 4s delays).

#### Long-Term Solutions

**1. Request Quota Increase**
```bash
# Request quota increase via AWS Support
aws service-quotas request-service-quota-increase \
  --service-code bedrock \
  --quota-code L-12345678 \
  --desired-value 50
```

**2. Implement Request Throttling**

```typescript
// Add rate limiting to prevent throttling
import { RateLimiter } from 'limiter';

const limiter = new RateLimiter({
  tokensPerInterval: 8,  // 8 requests
  interval: 'second'     // per second (80% of quota)
});

async function invokeWithRateLimit() {
  await limiter.removeTokens(1);
  return bedrockClient.send(command);
}
```

**3. Use Circuit Breaker**
The built-in circuit breaker opens after 5 consecutive failures, preventing further throttling.

**4. Batch Requests**
Combine multiple operations into fewer API calls:
```typescript
// Instead of 10 separate calls
for (const item of items) {
  await bedrock.generate(item);
}

// Batch into 1 call with combined context
await bedrock.generate({
  scenario: items.map(i => i.scenario).join('\n'),
  context: combinedContext
});
```

**Monitoring**:
```bash
# Check throttling metrics
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --dimensions Name=ErrorType,Value=RateLimit \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

---

### 2. ValidationException

**Error Message**:
```
ValidationException: Invalid model input
AI_VALIDATION_ERROR: Invalid request to Bedrock
```

**Root Causes**:

1. **Invalid Model ID**: Model ID doesn't exist or is incorrect
2. **Malformed Request Body**: JSON structure doesn't match Claude's format
3. **Token Limit Exceeded**: Input + output tokens exceed model limits
4. **Invalid Parameters**: Temperature, max_tokens, or other parameters out of range

**Solutions**:

**1. Verify Model ID**
```bash
# List available models in your region
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query "modelSummaries[?contains(modelId, 'claude')]"

# Correct model ID for Claude 3.5 Sonnet
anthropic.claude-3-5-sonnet-20241022-v2:0
```

**2. Validate Request Format**
```typescript
// Correct Claude request format
const requestBody = {
  anthropic_version: 'bedrock-2023-05-31',  // Required
  max_tokens: 4096,                          // Required, max 8192
  temperature: 0.7,                          // Optional, 0-1
  messages: [                                // Required
    {
      role: 'user',                          // Required
      content: 'Your prompt here'            // Required
    }
  ]
};
```

**3. Check Token Limits**
```typescript
// Claude 3.5 Sonnet limits
const MAX_INPUT_TOKENS = 200_000;
const MAX_OUTPUT_TOKENS = 8_192;

// Estimate tokens (rough: 1 token ≈ 4 characters)
const estimatedTokens = prompt.length / 4;

if (estimatedTokens > MAX_INPUT_TOKENS) {
  // Truncate or split prompt
  prompt = prompt.substring(0, MAX_INPUT_TOKENS * 4);
}
```

**4. Validate Parameters**
```typescript
// Valid parameter ranges
const config = {
  temperature: Math.max(0, Math.min(1, temperature)),  // 0-1
  max_tokens: Math.max(1, Math.min(8192, maxTokens)), // 1-8192
  top_p: Math.max(0, Math.min(1, topP)),              // 0-1 (optional)
};
```

**Debugging**:
```typescript
// Log request before sending
console.log('Bedrock Request:', JSON.stringify({
  modelId: this.modelId,
  body: requestBody
}, null, 2));

try {
  const response = await this.client.send(command);
} catch (error) {
  console.error('Validation Error Details:', {
    name: error.name,
    message: error.message,
    requestBody: JSON.stringify(requestBody)
  });
  throw error;
}
```

---

### 3. ModelTimeoutException

**Error Message**:
```
ModelTimeoutException: Model request timed out
AI_TIMEOUT: Bedrock model timeout
```

**Root Causes**:
1. Request timeout too short (default: 30 seconds)
2. Complex prompt requiring long processing time
3. Model temporarily slow or overloaded

**Solutions**:

**1. Increase Timeout**
```bash
# Increase Lambda timeout
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --timeout 60

# Increase Bedrock client timeout
export BEDROCK_TIMEOUT=60000
```

```typescript
// Configure timeout in BedrockEngine
this.client = new BedrockRuntimeClient({
  region: this.region,
  maxAttempts: 3,
  requestHandler: {
    requestTimeout: 60000,  // 60 seconds
  },
});
```

**2. Optimize Prompt Length**
```typescript
// Reduce prompt size to speed up processing
const optimizedPrompt = {
  // Limit elements to first 50
  elements: analysis.elements.slice(0, 50),
  
  // Summarize instead of full details
  patterns: analysis.patterns.map(p => p.type),
  
  // Remove unnecessary context
  context: essentialContextOnly
};
```

**3. Use Streaming (Future Enhancement)**
```typescript
// Stream responses for long-running requests
// Note: Not yet implemented in BedrockEngine
const stream = await bedrock.invokeModelWithResponseStream({
  modelId: this.modelId,
  body: requestBody
});

for await (const chunk of stream.body) {
  // Process chunks as they arrive
  processChunk(chunk);
}
```

**4. Implement Async Processing**
```typescript
// For very long operations, use async processing
async function generateTestAsync(request: AIRequest) {
  // Store request in queue
  await queue.send({ type: 'generate', request });
  
  // Return job ID
  return { jobId: uuid(), status: 'pending' };
}

// Process in background
async function processQueue() {
  const job = await queue.receive();
  const result = await bedrock.generate(job.request);
  await storage.save(job.jobId, result);
}
```

---

### 4. ServiceUnavailableException

**Error Message**:
```
ServiceUnavailableException: Service temporarily unavailable
AI_UNAVAILABLE: Bedrock service unavailable
```

**Root Causes**:
1. AWS service outage or maintenance
2. Regional capacity issues
3. Network connectivity problems

**Solutions**:

**1. Automatic Retry**
The system automatically retries 3 times with exponential backoff.

**2. Check AWS Service Health**
```bash
# Check AWS Health Dashboard
aws health describe-events \
  --filter eventTypeCategories=issue \
  --query "events[?service=='BEDROCK']"

# Check service status page
# https://status.aws.amazon.com/
```

**3. Fallback to OpenAI**
```typescript
// Implement automatic fallback
async function generateWithFallback(request: AIRequest) {
  try {
    return await bedrockEngine.generate(request);
  } catch (error) {
    if (error.message.includes('AI_UNAVAILABLE')) {
      console.warn('Bedrock unavailable, falling back to OpenAI');
      return await openaiEngine.generate(request);
    }
    throw error;
  }
}
```

**4. Use Multi-Region Deployment**
```typescript
// Configure multiple regions for redundancy
const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];

async function invokeWithRegionFailover(request: AIRequest) {
  for (const region of regions) {
    try {
      const client = new BedrockRuntimeClient({ region });
      return await client.send(command);
    } catch (error) {
      console.warn(`Region ${region} failed, trying next...`);
    }
  }
  throw new Error('All regions unavailable');
}
```

**5. Monitor Service Health**
```bash
# Set up CloudWatch alarm for availability
aws cloudwatch put-metric-alarm \
  --alarm-name Bedrock-Service-Unavailable \
  --alarm-description "Alert when Bedrock is unavailable" \
  --metric-name BedrockErrors \
  --namespace AIBTS/Bedrock \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=ErrorType,Value=ServiceUnavailable
```

---

## IAM Permission Issues

### 1. AccessDeniedException: Not Authorized to Invoke Model

**Error Message**:
```
AccessDeniedException: User: arn:aws:sts::123456789012:assumed-role/lambda-role/function-name 
is not authorized to perform: bedrock:InvokeModel on resource: 
arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0
```

**Root Cause**:
Lambda execution role lacks `bedrock:InvokeModel` permission.

**Solution**:

**1. Verify Current Permissions**
```bash
# Get Lambda role name
ROLE_NAME=$(aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Role' --output text | cut -d'/' -f2)

# List attached policies
aws iam list-attached-role-policies --role-name $ROLE_NAME

# Check inline policies
aws iam list-role-policies --role-name $ROLE_NAME
```

**2. Add Bedrock Permission**
```bash
# Create policy document
cat > bedrock-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
      ]
    }
  ]
}
EOF

# Create and attach policy
aws iam create-policy \
  --policy-name BedrockInvokeModelPolicy \
  --policy-document file://bedrock-policy.json

aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/BedrockInvokeModelPolicy
```

**3. Verify Permission Applied**
```bash
# Test Lambda invocation
aws lambda invoke \
  --function-name aibts-ai-generate \
  --payload '{"scenario":"Test","context":{}}' \
  response.json

# Check for AccessDenied errors
cat response.json
```

**4. CDK Automatic Configuration**
If using CDK, ensure the policy is added:

```typescript
// packages/backend/src/infrastructure/misra-platform-stack.ts
import * as iam from 'aws-cdk-lib/aws-iam';

const bedrockPolicy = new iam.PolicyStatement({
  effect: iam.Effect.ALLOW,
  actions: ['bedrock:InvokeModel'],
  resources: [
    `arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0`,
  ],
});

// Apply to all AI Lambda functions
aiAnalyzeFunction.addToRolePolicy(bedrockPolicy);
aiGenerateFunction.addToRolePolicy(bedrockPolicy);
aiBatchFunction.addToRolePolicy(bedrockPolicy);
```

---

### 2. Incorrect Resource ARN

**Error Message**:
```
AccessDeniedException: Resource ARN does not match
```

**Root Cause**:
IAM policy specifies wrong model ARN or uses incorrect wildcard pattern.

**Solution**:

**1. Verify Model ARN Format**
```
Correct Format:
arn:aws:bedrock:{region}::foundation-model/{model-id}

Examples:
arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0
arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0
```

**2. Use Wildcard for All Regions**
```json
{
  "Resource": [
    "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-3-5-sonnet-20241022-v2:0"
  ]
}
```

**3. Allow All Claude Models (Less Restrictive)**
```json
{
  "Resource": [
    "arn:aws:bedrock:*:*:foundation-model/anthropic.claude-*"
  ]
}
```

---

### 3. Credential Provider Issues

**Error Message**:
```
CredentialsProviderError: Could not load credentials from any providers
```

**Root Causes**:
1. Lambda execution role not properly attached
2. AWS SDK not finding credentials
3. Local development missing AWS credentials

**Solutions**:

**1. Lambda Environment**
```bash
# Verify Lambda has execution role
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Role'

# Should return: arn:aws:iam::123456789012:role/lambda-execution-role
```

**2. Local Development**
```bash
# Configure AWS CLI credentials
aws configure

# Or use environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1

# Or use AWS SSO
aws sso login --profile your-profile
export AWS_PROFILE=your-profile
```

**3. Verify Credential Chain**
```typescript
// Test credential resolution
import { defaultProvider } from '@aws-sdk/credential-provider-node';

async function testCredentials() {
  try {
    const credentials = await defaultProvider()();
    console.log('Credentials loaded:', {
      accessKeyId: credentials.accessKeyId.substring(0, 10) + '...',
      region: process.env.AWS_REGION
    });
  } catch (error) {
    console.error('Credential error:', error);
  }
}
```

**4. IAM Role Trust Relationship**
Ensure Lambda service can assume the role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

---

### 4. Cross-Account Access Issues

**Error Message**:
```
AccessDeniedException: Cross-account access denied
```

**Root Cause**:
Attempting to access Bedrock models in a different AWS account.

**Solution**:

Bedrock models are account-agnostic (no account ID in ARN), but ensure:

1. **Same Account**: Lambda and Bedrock in same account
2. **Correct Region**: Model available in Lambda's region
3. **Model Access**: Bedrock model access enabled in your account

```bash
# Check Bedrock model access
aws bedrock list-foundation-models \
  --region us-east-1 \
  --query "modelSummaries[?modelId=='anthropic.claude-3-5-sonnet-20241022-v2:0']"

# If empty, request model access via AWS Console:
# Bedrock → Model access → Request access
```

---

## Rate Limiting Solutions

### 1. Exponential Backoff (Built-in)

The BedrockEngine implements automatic exponential backoff:

```typescript
// Retry logic with exponential backoff
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    return await this.client.send(command);
  } catch (error) {
    if (attempt < 3) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      await this.sleep(delay);
    }
  }
}
```

**Configuration**:
- Attempts: 3
- Delays: 1s, 2s, 4s
- Total max time: ~7 seconds

**Customization**:
```typescript
// Adjust retry configuration
const RETRY_CONFIG = {
  maxAttempts: 5,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2
};

const delay = Math.min(
  RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
  RETRY_CONFIG.maxDelay
);
```

---

### 2. Circuit Breaker Pattern (Built-in)

The BedrockEngine includes a circuit breaker to prevent cascading failures:

**States**:
- **CLOSED**: Normal operation, requests pass through
- **OPEN**: Too many failures (5+), requests blocked for 60 seconds
- **HALF_OPEN**: Testing if service recovered, allows 2 test requests

**Configuration**:
```typescript
const circuitBreaker = new CircuitBreaker(
  5,      // failureThreshold: Open after 5 failures
  60000,  // resetTimeoutMs: Stay open for 60 seconds
  2       // halfOpenMaxAttempts: 2 successful requests to close
);
```

**Monitoring Circuit State**:
```typescript
// Check circuit breaker state
const state = bedrockEngine.getCircuitState();
console.log('Circuit breaker state:', state);

// Reset circuit breaker (for testing)
bedrockEngine.resetCircuit();
```

**CloudWatch Metrics**:
```bash
# Monitor circuit breaker state changes
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --filter-pattern "circuitState"
```

**Handling Open Circuit**:
```typescript
try {
  const result = await bedrockEngine.generate(request);
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Fallback to cached results or alternative provider
    return await getCachedResult(request) || await openaiEngine.generate(request);
  }
  throw error;
}
```

---

### 3. Request Throttling

Implement application-level throttling to prevent hitting Bedrock limits:

**Using Token Bucket Algorithm**:
```typescript
import { RateLimiter } from 'limiter';

class ThrottledBedrockEngine extends BedrockEngine {
  private limiter: RateLimiter;

  constructor(config?: BedrockConfig) {
    super(config);
    
    // 8 requests per second (80% of 10 req/s quota)
    this.limiter = new RateLimiter({
      tokensPerInterval: 8,
      interval: 'second'
    });
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    // Wait for rate limit token
    await this.limiter.removeTokens(1);
    
    // Proceed with request
    return super.generate(request);
  }
}
```

**Using Queue-Based Throttling**:
```typescript
import { Queue } from 'bull';

const bedrockQueue = new Queue('bedrock-requests', {
  limiter: {
    max: 8,        // 8 requests
    duration: 1000 // per second
  }
});

// Add request to queue
bedrockQueue.add('generate', { request });

// Process queue
bedrockQueue.process('generate', async (job) => {
  return await bedrockEngine.generate(job.data.request);
});
```

**Using AWS SQS for Distributed Throttling**:
```typescript
// Send requests to SQS
await sqs.sendMessage({
  QueueUrl: process.env.BEDROCK_QUEUE_URL,
  MessageBody: JSON.stringify(request)
});

// Lambda processes queue with concurrency limit
// Set Lambda reserved concurrency to 8
aws lambda put-function-concurrency \
  --function-name aibts-ai-generate \
  --reserved-concurrent-executions 8
```

---

### 4. Request Batching

Combine multiple operations to reduce API calls:

**Batch Test Generation**:
```typescript
// Instead of N separate calls
async function generateTestsSeparately(scenarios: string[]) {
  const results = [];
  for (const scenario of scenarios) {
    results.push(await bedrock.generate({ scenario, context }));
  }
  return results;
}

// Batch into 1 call
async function generateTestsBatched(scenarios: string[]) {
  const combinedPrompt = `Generate tests for the following scenarios:
${scenarios.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Return a JSON array with one test per scenario.`;

  const response = await bedrock.generate({
    scenario: combinedPrompt,
    context
  });
  
  return JSON.parse(response.content);
}
```

**Batch Selector Generation**:
```typescript
// Batch multiple selector requests
async function generateSelectorsBatch(elements: Element[]) {
  const prompt = `Generate selectors for these elements:
${elements.map((el, i) => `${i + 1}. ${el.description}`).join('\n')}

Return JSON array: [{"element": 1, "selector": "..."}, ...]`;

  const response = await bedrock.generate({ 
    elementDescription: prompt,
    domContext 
  });
  
  return JSON.parse(response.content);
}
```

---

## Cost Optimization Strategies

### 1. Token Usage Optimization

**Reduce Input Tokens**:

```typescript
// ❌ Bad: Sending entire DOM (100K+ tokens)
const prompt = `Analyze this page:\n${fullPageHTML}`;

// ✅ Good: Send only relevant elements (5K tokens)
const prompt = `Analyze these interactive elements:
${interactiveElements.slice(0, 50).map(el => 
  `${el.type}: ${el.id || el.class}`
).join('\n')}`;
```

**Optimize Prompt Structure**:
```typescript
// ❌ Bad: Verbose prompt (2K tokens)
const prompt = `
You are an expert QA engineer with 10 years of experience...
Please carefully analyze the following web application...
Take your time to understand the structure...
Generate comprehensive test cases that cover all scenarios...
`;

// ✅ Good: Concise prompt (500 tokens)
const prompt = `
Analyze this web app and generate test cases.
URL: ${url}
Elements: ${elements}
Return JSON: {testName, steps, assertions}
`;
```

**Limit Context Size**:
```typescript
// Limit elements to reduce tokens
const MAX_ELEMENTS = 50;
const MAX_PATTERNS = 20;
const MAX_FLOWS = 10;

const optimizedAnalysis = {
  elements: analysis.elements.slice(0, MAX_ELEMENTS),
  patterns: analysis.patterns.slice(0, MAX_PATTERNS),
  flows: analysis.flows.slice(0, MAX_FLOWS)
};
```

**Token Estimation**:
```typescript
// Estimate tokens before sending (rough: 1 token ≈ 4 chars)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

const promptTokens = estimateTokens(prompt);
if (promptTokens > 10000) {
  console.warn(`Large prompt: ${promptTokens} tokens, consider reducing`);
}
```

---

### 2. Response Caching

Cache AI responses to avoid redundant API calls:

**In-Memory Cache**:
```typescript
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, AIResponse>({
  max: 1000,           // Max 1000 entries
  ttl: 1000 * 60 * 60, // 1 hour TTL
});

async function generateWithCache(request: AIRequest): Promise<AIResponse> {
  const cacheKey = JSON.stringify(request);
  
  // Check cache
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('Cache hit, saved API call');
    return cached;
  }
  
  // Generate and cache
  const response = await bedrock.generate(request);
  cache.set(cacheKey, response);
  
  return response;
}
```

**DynamoDB Cache**:
```typescript
// Store in DynamoDB for persistent caching
async function generateWithDynamoCache(request: AIRequest): Promise<AIResponse> {
  const cacheKey = hashRequest(request);
  
  // Check DynamoDB
  const cached = await dynamodb.getItem({
    TableName: 'ai-response-cache',
    Key: { cacheKey }
  });
  
  if (cached.Item && !isCacheExpired(cached.Item.timestamp)) {
    return JSON.parse(cached.Item.response);
  }
  
  // Generate and cache
  const response = await bedrock.generate(request);
  
  await dynamodb.putItem({
    TableName: 'ai-response-cache',
    Item: {
      cacheKey,
      response: JSON.stringify(response),
      timestamp: Date.now(),
      ttl: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    }
  });
  
  return response;
}
```

**Cache Invalidation**:
```typescript
// Invalidate cache when application changes
async function invalidateCacheForUrl(url: string) {
  const keys = await cache.keys();
  for (const key of keys) {
    const request = JSON.parse(key);
    if (request.url === url || request.context?.url === url) {
      cache.delete(key);
    }
  }
}
```

---

### 3. Model Selection

Choose the right model for the task:

| Model | Cost (per 1M tokens) | Use Case | Speed |
|-------|---------------------|----------|-------|
| Claude 3.5 Sonnet | $3 input / $15 output | **Recommended** - Best balance | Medium |
| Claude 3 Opus | $15 input / $75 output | Highest quality, complex tasks | Slow |
| Claude 3 Sonnet | $3 input / $15 output | Good balance | Medium |
| Claude 3 Haiku | $0.25 input / $1.25 output | Simple tasks, high volume | Fast |

**Cost Comparison Example**:
```typescript
// Typical test generation: 1500 input + 2000 output tokens

// Claude 3.5 Sonnet
const cost = (1500 / 1_000_000) * 3 + (2000 / 1_000_000) * 15;
// = $0.0045 + $0.03 = $0.0345

// Claude 3 Haiku (for simple selectors)
const cost = (500 / 1_000_000) * 0.25 + (100 / 1_000_000) * 1.25;
// = $0.000125 + $0.000125 = $0.00025

// Savings: 99% for simple tasks!
```

**Dynamic Model Selection**:
```typescript
function selectModel(operation: string, complexity: 'simple' | 'complex'): string {
  if (operation === 'selector' && complexity === 'simple') {
    return 'anthropic.claude-3-haiku-20240307-v1:0';
  }
  
  if (operation === 'analyze' && complexity === 'complex') {
    return 'anthropic.claude-3-opus-20240229-v1:0';
  }
  
  // Default: Claude 3.5 Sonnet
  return 'anthropic.claude-3-5-sonnet-20241022-v2:0';
}
```

---

### 4. Batch Processing

Process multiple requests in batches to reduce overhead:

**Batch API Calls**:
```typescript
// Process 10 test generations in 1 batch
async function batchGenerate(scenarios: string[]) {
  const batchSize = 10;
  const batches = [];
  
  for (let i = 0; i < scenarios.length; i += batchSize) {
    const batch = scenarios.slice(i, i + batchSize);
    batches.push(generateTestsBatched(batch));
  }
  
  return (await Promise.all(batches)).flat();
}
```

**Scheduled Batch Processing**:
```typescript
// Process non-urgent requests in batches during off-peak hours
const batchQueue = [];

export function queueForBatch(request: AIRequest) {
  batchQueue.push(request);
  
  // Process when batch is full or after timeout
  if (batchQueue.length >= 50) {
    processBatch();
  }
}

async function processBatch() {
  const batch = batchQueue.splice(0, 50);
  const results = await generateTestsBatched(batch.map(r => r.scenario));
  
  // Store results
  for (let i = 0; i < batch.length; i++) {
    await storage.save(batch[i].id, results[i]);
  }
}

// Process remaining items every 5 minutes
setInterval(processBatch, 5 * 60 * 1000);
```

---

### 5. Cost Monitoring and Alerts

Track and alert on AI costs:

**Real-Time Cost Tracking**:
```typescript
// Track costs in real-time
class CostTracker {
  private dailyCost: number = 0;
  private monthlyCost: number = 0;
  
  async trackUsage(usage: TokenUsage, cost: number) {
    this.dailyCost += cost;
    this.monthlyCost += cost;
    
    // Store in DynamoDB
    await dynamodb.putItem({
      TableName: 'ai-usage',
      Item: {
        timestamp: Date.now(),
        provider: 'BEDROCK',
        model: 'claude-3-5-sonnet',
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        cost
      }
    });
    
    // Check thresholds
    if (this.dailyCost > 100) {
      await this.alertHighCost('daily', this.dailyCost);
    }
  }
  
  async alertHighCost(period: string, cost: number) {
    await sns.publish({
      TopicArn: process.env.COST_ALERT_TOPIC,
      Subject: `High AI Cost Alert: ${period}`,
      Message: `AI costs have exceeded threshold: $${cost.toFixed(2)}`
    });
  }
}
```

**Cost Analysis Queries**:
```bash
# Daily cost breakdown
aws dynamodb query \
  --table-name ai-usage \
  --key-condition-expression "provider = :provider AND #ts BETWEEN :start AND :end" \
  --expression-attribute-names '{"#ts":"timestamp"}' \
  --expression-attribute-values '{
    ":provider":{"S":"BEDROCK"},
    ":start":{"N":"'$(date -d 'today 00:00' +%s)'"},
    ":end":{"N":"'$(date +%s)'"}
  }'

# CloudWatch Logs Insights query
fields @timestamp, operation, metrics.cost
| filter service = "BedrockEngine"
| stats sum(metrics.cost) as totalCost by bin(1h)
| sort @timestamp desc
```

**Cost Budget Alerts**:
```bash
# Create CloudWatch alarm for daily cost
aws cloudwatch put-metric-alarm \
  --alarm-name Bedrock-Daily-Cost-High \
  --alarm-description "Alert when daily Bedrock cost exceeds $100" \
  --metric-name BedrockCost \
  --namespace AIBTS/Bedrock \
  --statistic Sum \
  --period 86400 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:cost-alerts
```

**Cost Optimization Report**:
```typescript
async function generateCostReport() {
  const usage = await getCostData(30); // Last 30 days
  
  return {
    totalCost: usage.reduce((sum, u) => sum + u.cost, 0),
    avgCostPerOperation: usage.reduce((sum, u) => sum + u.cost, 0) / usage.length,
    topCostlyOperations: usage
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10),
    recommendations: [
      usage.some(u => u.inputTokens > 10000) && 'Reduce prompt size',
      usage.filter(u => u.operation === 'selector').length > 1000 && 'Use Claude Haiku for selectors',
      'Implement response caching',
      'Batch similar requests'
    ].filter(Boolean)
  };
}
```

---

### 6. Smart Prompt Engineering

Optimize prompts for cost and quality:

**Use Few-Shot Examples**:
```typescript
// ❌ Bad: Zero-shot (requires more tokens for good results)
const prompt = `Generate a test for login functionality.`;

// ✅ Good: Few-shot (better results with fewer output tokens)
const prompt = `Generate a test following this pattern:

Example:
test('user can login', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'user@example.com');
  await page.fill('[data-testid="password"]', 'password123');
  await page.click('[data-testid="login-button"]');
  await expect(page).toHaveURL('/dashboard');
});

Now generate a test for: ${scenario}`;
```

**Structured Output Format**:
```typescript
// ❌ Bad: Unstructured output (requires parsing, more tokens)
const prompt = `Analyze the page and tell me about it.`;

// ✅ Good: Structured JSON output (precise, fewer tokens)
const prompt = `Analyze the page. Return JSON:
{
  "features": ["feature1", "feature2"],
  "elements": [{"type": "button", "action": "click"}],
  "authRequired": true|false
}`;
```

**Reuse System Prompts**:
```typescript
// Define system prompt once
const SYSTEM_PROMPT = `You are a Playwright test expert. 
Generate concise, maintainable tests using TypeScript.
Use data-testid selectors. Include assertions.`;

// Reuse for all requests
async function generate(scenario: string) {
  return bedrock.generate({
    scenario: `${SYSTEM_PROMPT}\n\nScenario: ${scenario}`
  });
}
```

---

## Circuit Breaker Issues

### Circuit Breaker Stuck OPEN

**Symptoms**:
- All requests fail with "Circuit breaker is OPEN"
- Lasts longer than 60 seconds
- Prevents any Bedrock calls

**Root Causes**:
1. Underlying issue not resolved (IAM, service outage)
2. Circuit breaker not resetting properly
3. Continuous failures preventing HALF_OPEN state

**Solutions**:

**1. Check Underlying Issue**
```bash
# Check recent errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/aibts-ai-generate \
  --filter-pattern "ERROR" \
  --start-time $(date -u -d '10 minutes ago' +%s)000

# Common issues:
# - AccessDeniedException → Fix IAM permissions
# - ServiceUnavailableException → Wait for AWS service recovery
# - ThrottlingException → Reduce request rate
```

**2. Manual Circuit Reset**
```typescript
// Reset circuit breaker via admin endpoint
app.post('/admin/reset-circuit', async (req, res) => {
  bedrockEngine.resetCircuit();
  res.json({ status: 'Circuit breaker reset' });
});
```

**3. Automatic Recovery**
The circuit breaker automatically transitions to HALF_OPEN after 60 seconds:
- Allows 2 test requests
- If both succeed → CLOSED (normal operation)
- If either fails → OPEN again for 60 seconds

**4. Fallback to OpenAI**
```typescript
// Implement automatic fallback
if (bedrockEngine.getCircuitState() === CircuitState.OPEN) {
  console.warn('Circuit breaker OPEN, using OpenAI fallback');
  return await openaiEngine.generate(request);
}
```

---

### Circuit Breaker Flapping

**Symptoms**:
- Circuit breaker rapidly switching between OPEN and CLOSED
- Intermittent failures
- Unstable service

**Root Causes**:
1. Threshold too low (5 failures)
2. Intermittent network issues
3. Bedrock service instability

**Solutions**:

**1. Adjust Thresholds**
```typescript
// Increase failure threshold
const circuitBreaker = new CircuitBreaker(
  10,     // failureThreshold: 10 instead of 5
  120000, // resetTimeoutMs: 2 minutes instead of 1
  3       // halfOpenMaxAttempts: 3 instead of 2
);
```

**2. Implement Jitter**
```typescript
// Add random jitter to prevent thundering herd
const resetTimeout = 60000 + Math.random() * 30000; // 60-90 seconds
```

**3. Monitor Flapping**
```typescript
class CircuitBreakerMonitor {
  private stateChanges: Array<{ state: CircuitState; timestamp: number }> = [];
  
  onStateChange(newState: CircuitState) {
    this.stateChanges.push({ state: newState, timestamp: Date.now() });
    
    // Check for flapping (>5 state changes in 5 minutes)
    const recentChanges = this.stateChanges.filter(
      c => Date.now() - c.timestamp < 5 * 60 * 1000
    );
    
    if (recentChanges.length > 5) {
      console.error('Circuit breaker flapping detected!');
      this.alertFlapping();
    }
  }
}
```

---

## Performance Optimization

### 1. Reduce Latency

**Parallel Requests**:
```typescript
// ❌ Bad: Sequential (6 seconds total)
const result1 = await bedrock.generate(request1); // 2s
const result2 = await bedrock.generate(request2); // 2s
const result3 = await bedrock.generate(request3); // 2s

// ✅ Good: Parallel (2 seconds total)
const [result1, result2, result3] = await Promise.all([
  bedrock.generate(request1),
  bedrock.generate(request2),
  bedrock.generate(request3)
]);
```

**Connection Pooling**:
```typescript
// Reuse Bedrock client connections
const client = new BedrockRuntimeClient({
  region: 'us-east-1',
  maxAttempts: 3,
  requestHandler: {
    connectionTimeout: 5000,
    socketTimeout: 30000,
    // Enable connection reuse
    keepAlive: true,
    maxSockets: 50
  }
});
```

**Regional Optimization**:
```typescript
// Use region closest to your users
const REGION_LATENCY = {
  'us-east-1': 50,      // Virginia
  'us-west-2': 80,      // Oregon
  'eu-west-1': 120,     // Ireland
  'ap-southeast-1': 200 // Singapore
};

// Select region based on user location
function selectRegion(userLocation: string): string {
  // Logic to select closest region
  return 'us-east-1';
}
```

**Optimize Prompt Size**:
```typescript
// Smaller prompts = faster processing
function optimizePrompt(prompt: string, maxTokens: number = 4000): string {
  const estimatedTokens = prompt.length / 4;
  
  if (estimatedTokens > maxTokens) {
    // Truncate to max tokens
    return prompt.substring(0, maxTokens * 4);
  }
  
  return prompt;
}
```

---

### 2. Improve Throughput

**Increase Lambda Concurrency**:
```bash
# Allow more concurrent Lambda executions
aws lambda put-function-concurrency \
  --function-name aibts-ai-generate \
  --reserved-concurrent-executions 50
```

**Use Provisioned Concurrency**:
```bash
# Eliminate cold starts
aws lambda put-provisioned-concurrency-config \
  --function-name aibts-ai-generate \
  --provisioned-concurrent-executions 10 \
  --qualifier LIVE
```

**Async Processing**:
```typescript
// For non-urgent requests, use async processing
async function generateAsync(request: AIRequest): Promise<string> {
  const jobId = uuid();
  
  // Queue for background processing
  await sqs.sendMessage({
    QueueUrl: process.env.BEDROCK_QUEUE_URL,
    MessageBody: JSON.stringify({ jobId, request })
  });
  
  return jobId;
}

// Check status
async function getJobStatus(jobId: string) {
  const result = await dynamodb.getItem({
    TableName: 'ai-jobs',
    Key: { jobId }
  });
  
  return result.Item?.status; // 'pending' | 'processing' | 'completed' | 'failed'
}
```

---

## Debugging Tools

### 1. CloudWatch Logs Insights Queries

**Find Errors**:
```sql
fields @timestamp, operation, error
| filter service = "BedrockEngine" and status = "failure"
| sort @timestamp desc
| limit 100
```

**Analyze Latency**:
```sql
fields @timestamp, operation, metrics.latency
| filter service = "BedrockEngine"
| stats avg(metrics.latency) as avgLatency, 
        max(metrics.latency) as maxLatency,
        pct(metrics.latency, 95) as p95Latency
  by operation
```

**Track Costs**:
```sql
fields @timestamp, operation, metrics.cost, metrics.totalTokens
| filter service = "BedrockEngine"
| stats sum(metrics.cost) as totalCost,
        sum(metrics.totalTokens) as totalTokens,
        avg(metrics.cost) as avgCost
  by operation
| sort totalCost desc
```

**Circuit Breaker State**:
```sql
fields @timestamp, circuitState, operation, status
| filter service = "BedrockEngine"
| filter circuitState = "OPEN" or circuitState = "HALF_OPEN"
| sort @timestamp desc
```

**Token Usage Analysis**:
```sql
fields @timestamp, operation, metrics.requestTokens, metrics.responseTokens
| filter service = "BedrockEngine"
| stats avg(metrics.requestTokens) as avgInput,
        avg(metrics.responseTokens) as avgOutput,
        max(metrics.requestTokens) as maxInput
  by operation
```

---

### 2. X-Ray Tracing

**View Trace Map**:
```bash
# Get service graph
aws xray get-service-graph \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s)

# Get trace summaries
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'service("aibts-ai-generate")'
```

**Analyze Slow Traces**:
```bash
# Find traces with high latency
aws xray get-trace-summaries \
  --start-time $(date -u -d '1 hour ago' +%s) \
  --end-time $(date -u +%s) \
  --filter-expression 'duration > 10'
```

---

### 3. Local Testing

**Test Bedrock Locally**:
```typescript
// test-bedrock-local.ts
import { BedrockEngine } from './bedrock-engine';

async function testLocal() {
  const engine = new BedrockEngine({
    region: 'us-east-1',
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
  });

  try {
    console.log('Testing analyze...');
    const analysis = await engine.analyze({
      url: 'https://example.com',
      title: 'Example',
      elements: [],
      patterns: [],
      flows: [],
      metadata: { isSPA: false, loadTime: 1000 }
    });
    console.log('✅ Analyze works:', analysis);

    console.log('\nTesting generate...');
    const generated = await engine.generate({
      scenario: 'User logs in',
      context: { url: 'https://example.com' }
    });
    console.log('✅ Generate works:', generated.content.substring(0, 100));

    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testLocal();
```

**Run Local Tests**:
```bash
# Set AWS credentials
export AWS_PROFILE=your-profile
export AWS_REGION=us-east-1

# Run test
npx ts-node test-bedrock-local.ts
```

---

### 4. Integration Test Suite

**Comprehensive Integration Tests**:
```typescript
// bedrock-integration.test.ts
describe('Bedrock Integration', () => {
  let engine: BedrockEngine;

  beforeAll(() => {
    engine = new BedrockEngine();
  });

  it('should handle IAM permissions correctly', async () => {
    // This will fail if IAM permissions are wrong
    const result = await engine.generate({
      scenario: 'Test IAM',
      context: {}
    });
    expect(result.content).toBeTruthy();
  });

  it('should handle rate limiting with retry', async () => {
    // Send multiple requests rapidly
    const requests = Array(20).fill(null).map((_, i) => 
      engine.generate({ scenario: `Test ${i}`, context: {} })
    );
    
    const results = await Promise.all(requests);
    expect(results).toHaveLength(20);
  });

  it('should track costs accurately', async () => {
    const result = await engine.generate({
      scenario: 'Test cost tracking',
      context: {}
    });
    
    expect(result.cost).toBeGreaterThan(0);
    expect(result.usage.totalTokens).toBeGreaterThan(0);
  });

  it('should handle circuit breaker', async () => {
    // Force circuit breaker to open
    engine.resetCircuit();
    
    // Simulate failures
    for (let i = 0; i < 5; i++) {
      try {
        await engine.generate({ scenario: 'Invalid', context: null as any });
      } catch (error) {
        // Expected
      }
    }
    
    expect(engine.getCircuitState()).toBe(CircuitState.OPEN);
  });
});
```

**Run Integration Tests**:
```bash
cd packages/backend
npm test -- bedrock-integration.test.ts
```

---

## Quick Reference

### Common Error Codes

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `AI_RATE_LIMIT` | Too many requests | Wait and retry, implement throttling |
| `AI_VALIDATION_ERROR` | Invalid request | Check model ID, request format |
| `AI_TIMEOUT` | Request timeout | Increase timeout, optimize prompt |
| `AI_UNAVAILABLE` | Service down | Wait, use fallback provider |
| `AccessDeniedException` | Missing IAM permission | Add `bedrock:InvokeModel` permission |
| `Circuit breaker is OPEN` | Too many failures | Wait 60s, check underlying issue |

---

### Cost Optimization Checklist

- [ ] Reduce prompt size (limit elements to 50)
- [ ] Use concise prompts (avoid verbose instructions)
- [ ] Implement response caching (1 hour TTL)
- [ ] Batch similar requests together
- [ ] Use Claude Haiku for simple tasks (selectors)
- [ ] Monitor daily costs with CloudWatch alarms
- [ ] Set cost budgets and alerts ($100/day threshold)
- [ ] Analyze token usage patterns monthly
- [ ] Optimize prompt engineering (few-shot examples)
- [ ] Cache frequently requested analyses

**Expected Savings**: 30-50% with full optimization

---

### Performance Optimization Checklist

- [ ] Use parallel requests where possible
- [ ] Enable connection pooling (keepAlive: true)
- [ ] Select region closest to users
- [ ] Implement request throttling (8 req/s)
- [ ] Use circuit breaker to prevent cascading failures
- [ ] Increase Lambda concurrency (50+)
- [ ] Consider provisioned concurrency for critical functions
- [ ] Optimize prompt size (<4000 tokens)
- [ ] Use async processing for non-urgent requests
- [ ] Monitor P95 latency (<5 seconds)

**Expected Improvement**: 20-40% latency reduction

---

### Monitoring Checklist

- [ ] CloudWatch metrics enabled
- [ ] CloudWatch alarms configured (error rate, latency, cost)
- [ ] X-Ray tracing enabled
- [ ] CloudWatch Logs Insights queries saved
- [ ] Daily cost reports automated
- [ ] Weekly performance reviews scheduled
- [ ] Error log analysis automated
- [ ] Circuit breaker state monitored
- [ ] Token usage tracked per operation
- [ ] User feedback collected

---

## Troubleshooting Workflow

When issues arise, follow this workflow:

### 1. Identify the Issue

```bash
# Check recent errors
aws logs tail /aws/lambda/aibts-ai-generate --follow

# Check CloudWatch alarms
aws cloudwatch describe-alarms --state-value ALARM

# Check circuit breaker state
# (via application logs or admin endpoint)
```

### 2. Classify the Error

- **IAM Permission**: AccessDeniedException → Fix IAM policy
- **Rate Limiting**: ThrottlingException → Implement throttling
- **Validation**: ValidationException → Check request format
- **Timeout**: ModelTimeoutException → Increase timeout
- **Service Outage**: ServiceUnavailableException → Wait or fallback

### 3. Apply Solution

Refer to the specific error section in this guide.

### 4. Verify Fix

```bash
# Test the endpoint
curl -X POST https://api.example.com/ai-test-generation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"scenario":"Test","context":{}}'

# Check metrics
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --start-time $(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 5. Document and Prevent

- Document the issue and solution
- Update monitoring to detect similar issues
- Implement preventive measures
- Share learnings with team

---

## Getting Help

### Internal Resources

- **Setup Guide**: [BEDROCK_SETUP_GUIDE.md](BEDROCK_SETUP_GUIDE.md)
- **Migration Process**: [BEDROCK_MIGRATION_PROCESS.md](BEDROCK_MIGRATION_PROCESS.md)
- **Design Document**: [design.md](design.md)
- **Requirements**: [requirements.md](requirements.md)

### AWS Resources

- **Bedrock Documentation**: https://docs.aws.amazon.com/bedrock/
- **Claude Model Card**: https://www.anthropic.com/claude
- **AWS Support**: Create support case for Bedrock issues
- **Service Health**: https://status.aws.amazon.com/

### Monitoring Dashboards

- **CloudWatch Dashboard**: `Bedrock-Migration-Monitoring`
- **X-Ray Service Map**: AWS X-Ray Console
- **Cost Explorer**: AWS Cost Management Console

---

## Conclusion

This troubleshooting guide covers the most common issues encountered with Amazon Bedrock integration. For issues not covered here:

1. Check CloudWatch Logs for detailed error messages
2. Review X-Ray traces for performance bottlenecks
3. Consult AWS Bedrock documentation
4. Contact AWS Support for service-specific issues
5. Review the design and requirements documents for context

Remember to:
- Monitor costs and performance continuously
- Implement preventive measures (throttling, caching, circuit breaker)
- Keep documentation updated with new issues and solutions
- Share learnings with the team

**Last Updated**: Current Session  
**Maintained By**: Platform Engineering Team

