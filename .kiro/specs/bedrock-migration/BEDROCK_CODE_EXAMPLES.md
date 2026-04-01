# Amazon Bedrock Code Examples

## Overview

This document provides practical code examples for using Amazon Bedrock with Claude 3.5 Sonnet in the AIBTS platform. These examples demonstrate how to use BedrockEngine directly, switch between AI providers, and configure custom model settings.

**Last Updated**: Current Session  
**Target Audience**: Developers, Backend Engineers

---

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Using BedrockEngine Directly](#using-bedrockengine-directly)
3. [Switching AI Providers](#switching-ai-providers)
4. [Custom Model Configuration](#custom-model-configuration)
5. [Advanced Features](#advanced-features)
6. [Error Handling](#error-handling)
7. [Cost Tracking](#cost-tracking)
8. [Testing Examples](#testing-examples)

---

## Basic Usage

### Simple Test Generation

```typescript
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

// Create AI engine (uses AI_PROVIDER env var, defaults to BEDROCK)
const aiEngine = AIEngineFactory.create();

// Generate test specification
const testSpec = await aiEngine.generateTestSpecification(
  analysis,
  'User logs in with valid credentials'
);

console.log('Generated test:', testSpec.testName);
console.log('Steps:', testSpec.steps.length);
```

### Application Analysis

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

const bedrock = new BedrockEngine();

// Analyze application
const analysisResult = await bedrock.analyze(applicationAnalysis);

console.log('Features:', analysisResult.features);
console.log('User flows:', analysisResult.userFlows);
console.log('Auth required:', analysisResult.authRequired);
```


---

## Using BedrockEngine Directly

### Example 1: Direct Instantiation

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

// Create BedrockEngine with default configuration
const bedrock = new BedrockEngine();

// Use for test generation
const response = await bedrock.generate({
  scenario: 'User adds item to shopping cart',
  context: {
    url: 'https://example.com/products',
    elements: [
      { type: 'button', selector: '[data-testid="add-to-cart"]' },
      { type: 'div', selector: '.cart-count' }
    ]
  }
});

console.log('Generated test code:', response.content);
console.log('Tokens used:', response.usage.totalTokens);
console.log('Cost:', `$${response.cost.toFixed(4)}`);
```

### Example 2: Custom Configuration

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

// Create with custom configuration
const bedrock = new BedrockEngine({
  region: 'us-west-2',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  timeout: 60000  // 60 seconds
});

// Generate selector
const response = await bedrock.generate({
  elementDescription: 'Login button in the header',
  domContext: `
    <header>
      <nav>
        <button data-testid="login-btn">Login</button>
      </nav>
    </header>
  `
});

console.log('Generated selector:', response.content);
```

### Example 3: Multiple Operations

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

const bedrock = new BedrockEngine();

// 1. Analyze application
const analysis = await bedrock.analyze({
  url: 'https://example.com',
  title: 'E-commerce Site',
  elements: [...],
  patterns: [...],
  flows: [...],
  metadata: { isSPA: true, loadTime: 1200 }
});

// 2. Generate test based on analysis
const testSpec = await bedrock.generateTestSpecification(
  analysis,
  'User completes checkout process'
);

// 3. Generate selectors for test steps
for (const step of testSpec.steps) {
  if (step.elementDescription) {
    const selector = await bedrock.generate({
      elementDescription: step.elementDescription,
      domContext: getDOMContext(step)
    });
    console.log(`Selector for ${step.description}:`, selector.content);
  }
}
```

### Example 4: Code Completion

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

const bedrock = new BedrockEngine();

// Complete partial test code
const response = await bedrock.complete({
  partialCode: `
    test('user can filter products', async ({ page }) => {
      await page.goto('/products');
      await page.click('[data-testid="filter-button"]');
      // TODO: Complete the test
  `,
  context: 'Filter products by category and price range'
});

console.log('Completed code:', response.content);
```


---

## Switching AI Providers

### Example 1: Using Environment Variables

```typescript
// Set provider via environment variable
process.env.AI_PROVIDER = 'BEDROCK';  // or 'OPENAI' or 'HUGGINGFACE'

import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

// Factory automatically uses the configured provider
const aiEngine = AIEngineFactory.create();

// Check which provider is being used
const currentProvider = AIEngineFactory.getCurrentProvider();
console.log('Using provider:', currentProvider);
```

### Example 2: Runtime Provider Selection

```typescript
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

// Explicitly specify provider
const bedrockEngine = AIEngineFactory.create('BEDROCK');
const openaiEngine = AIEngineFactory.create('OPENAI');
const huggingfaceEngine = AIEngineFactory.create('HUGGINGFACE');

// Use different providers for different operations
const analysis = await bedrockEngine.generateTestSpecification(
  applicationAnalysis,
  'Login test'
);

const fallbackAnalysis = await openaiEngine.generateTestSpecification(
  applicationAnalysis,
  'Login test'
);
```

### Example 3: Provider Fallback

```typescript
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

async function generateWithFallback(
  analysis: ApplicationAnalysis,
  scenario: string
) {
  const providers: Array<'BEDROCK' | 'OPENAI' | 'HUGGINGFACE'> = [
    'BEDROCK',
    'OPENAI',
    'HUGGINGFACE'
  ];

  for (const provider of providers) {
    try {
      console.log(`Trying provider: ${provider}`);
      const engine = AIEngineFactory.create(provider);
      const result = await engine.generateTestSpecification(analysis, scenario);
      console.log(`Success with ${provider}`);
      return result;
    } catch (error) {
      console.error(`${provider} failed:`, error.message);
      if (provider === providers[providers.length - 1]) {
        throw new Error('All AI providers failed');
      }
    }
  }
}

// Usage
try {
  const testSpec = await generateWithFallback(analysis, 'User registration');
  console.log('Generated test:', testSpec.testName);
} catch (error) {
  console.error('All providers failed:', error);
}
```

### Example 4: A/B Testing Between Providers

```typescript
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

async function compareProviders(
  analysis: ApplicationAnalysis,
  scenario: string
) {
  const bedrock = AIEngineFactory.create('BEDROCK');
  const openai = AIEngineFactory.create('OPENAI');

  // Generate with both providers
  const [bedrockResult, openaiResult] = await Promise.all([
    bedrock.generateTestSpecification(analysis, scenario),
    openai.generateTestSpecification(analysis, scenario)
  ]);

  // Compare results
  return {
    bedrock: {
      testName: bedrockResult.testName,
      steps: bedrockResult.steps.length,
      tags: bedrockResult.tags
    },
    openai: {
      testName: openaiResult.testName,
      steps: openaiResult.steps.length,
      tags: openaiResult.tags
    }
  };
}

// Usage
const comparison = await compareProviders(analysis, 'Checkout flow');
console.log('Comparison:', JSON.stringify(comparison, null, 2));
```

### Example 5: Dynamic Provider Selection Based on Load

```typescript
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

class LoadBalancedAIService {
  private bedrockRequestCount = 0;
  private openaiRequestCount = 0;
  private readonly maxBedrockRequests = 100;

  async generateTest(analysis: ApplicationAnalysis, scenario: string) {
    // Use Bedrock until quota is reached, then switch to OpenAI
    const provider = this.bedrockRequestCount < this.maxBedrockRequests
      ? 'BEDROCK'
      : 'OPENAI';

    const engine = AIEngineFactory.create(provider);
    
    if (provider === 'BEDROCK') {
      this.bedrockRequestCount++;
    } else {
      this.openaiRequestCount++;
    }

    console.log(`Using ${provider} (Bedrock: ${this.bedrockRequestCount}, OpenAI: ${this.openaiRequestCount})`);

    return await engine.generateTestSpecification(analysis, scenario);
  }

  resetCounters() {
    this.bedrockRequestCount = 0;
    this.openaiRequestCount = 0;
  }
}

// Usage
const service = new LoadBalancedAIService();
const testSpec = await service.generateTest(analysis, 'Login test');
```


---

## Custom Model Configuration

### Example 1: Different Regions

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

// US East (N. Virginia)
const usEast = new BedrockEngine({
  region: 'us-east-1',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
});

// Europe (Frankfurt)
const euCentral = new BedrockEngine({
  region: 'eu-central-1',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
});

// Asia Pacific (Tokyo)
const apNortheast = new BedrockEngine({
  region: 'ap-northeast-1',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
});

// Use region closest to user
const userRegion = getUserRegion(); // 'us', 'eu', 'ap'
const engine = userRegion === 'eu' ? euCentral : 
               userRegion === 'ap' ? apNortheast : 
               usEast;

const result = await engine.generate({ scenario: 'Test', context: {} });
```

### Example 2: Different Claude Models

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

// Claude 3.5 Sonnet (recommended - best balance)
const sonnet = new BedrockEngine({
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0'
});

// Claude 3 Opus (highest quality, higher cost)
const opus = new BedrockEngine({
  modelId: 'anthropic.claude-3-opus-20240229-v1:0'
});

// Claude 3 Haiku (fastest, lowest cost)
const haiku = new BedrockEngine({
  modelId: 'anthropic.claude-3-haiku-20240307-v1:0'
});

// Use appropriate model for task complexity
async function generateWithOptimalModel(scenario: string, complexity: 'simple' | 'medium' | 'complex') {
  const engine = complexity === 'simple' ? haiku :
                 complexity === 'complex' ? opus :
                 sonnet;

  return await engine.generate({ scenario, context: {} });
}

// Examples
const simpleTest = await generateWithOptimalModel('Click button', 'simple');
const complexTest = await generateWithOptimalModel('Multi-step checkout with payment', 'complex');
```

### Example 3: Custom Timeout Settings

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

// Short timeout for simple operations
const quickEngine = new BedrockEngine({
  timeout: 10000  // 10 seconds
});

// Long timeout for complex operations
const slowEngine = new BedrockEngine({
  timeout: 120000  // 2 minutes
});

// Use appropriate timeout based on operation
async function generateWithTimeout(scenario: string, isComplex: boolean) {
  const engine = isComplex ? slowEngine : quickEngine;
  
  try {
    return await engine.generate({ scenario, context: {} });
  } catch (error) {
    if (error.message.includes('AI_TIMEOUT')) {
      console.error('Operation timed out, consider increasing timeout');
    }
    throw error;
  }
}
```

### Example 4: Temperature Configuration

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

const bedrock = new BedrockEngine();

// Low temperature (0.3) for deterministic analysis
const analysisResponse = await bedrock.analyze(applicationAnalysis);
// Uses temperature: 0.3, max_tokens: 2048

// Medium temperature (0.7) for creative test generation
const generationResponse = await bedrock.generate({
  scenario: 'User searches for products',
  context: {}
});
// Uses temperature: 0.7, max_tokens: 4096

// Balanced temperature (0.5) for code completion
const completionResponse = await bedrock.complete({
  partialCode: 'test("user can", async ({ page }) => {',
  context: 'Complete the test'
});
// Uses temperature: 0.5, max_tokens: 1024
```

### Example 5: Multi-Region Failover

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

class MultiRegionBedrockService {
  private regions = ['us-east-1', 'us-west-2', 'eu-west-1'];
  private currentRegionIndex = 0;

  async generateWithFailover(scenario: string, context: any) {
    for (let i = 0; i < this.regions.length; i++) {
      const region = this.regions[this.currentRegionIndex];
      
      try {
        console.log(`Attempting region: ${region}`);
        const engine = new BedrockEngine({ region });
        const result = await engine.generate({ scenario, context });
        
        console.log(`Success with region: ${region}`);
        return result;
      } catch (error) {
        console.error(`Region ${region} failed:`, error.message);
        
        // Try next region
        this.currentRegionIndex = (this.currentRegionIndex + 1) % this.regions.length;
        
        if (i === this.regions.length - 1) {
          throw new Error('All regions failed');
        }
      }
    }
  }
}

// Usage
const service = new MultiRegionBedrockService();
const result = await service.generateWithFailover('Login test', {});
```

### Example 6: Environment-Based Configuration

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

// Load configuration from environment variables
const config = {
  region: process.env.BEDROCK_REGION || 'us-east-1',
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  timeout: parseInt(process.env.BEDROCK_TIMEOUT || '30000')
};

console.log('Bedrock configuration:', config);

const bedrock = new BedrockEngine(config);

// Use configured engine
const result = await bedrock.generate({
  scenario: 'User registration',
  context: { url: 'https://example.com/register' }
});
```


---

## Advanced Features

### Example 1: Circuit Breaker Monitoring

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

const bedrock = new BedrockEngine();

// Check circuit breaker state before making requests
const circuitState = bedrock.getCircuitState();
console.log('Circuit breaker state:', circuitState);

if (circuitState === 'OPEN') {
  console.warn('Circuit breaker is OPEN, service temporarily unavailable');
  // Use fallback or cached results
  return getCachedResult();
}

try {
  const result = await bedrock.generate({ scenario: 'Test', context: {} });
  console.log('Request successful, circuit state:', bedrock.getCircuitState());
} catch (error) {
  console.error('Request failed:', error.message);
  console.log('Circuit state after failure:', bedrock.getCircuitState());
}

// Reset circuit breaker (for testing/recovery)
bedrock.resetCircuit();
console.log('Circuit breaker reset to CLOSED');
```

### Example 2: API Interaction Logging

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

const bedrock = new BedrockEngine();

// Make several API calls
await bedrock.generate({ scenario: 'Test 1', context: {} });
await bedrock.generate({ scenario: 'Test 2', context: {} });
await bedrock.analyze(applicationAnalysis);

// Get detailed logs of all API interactions
const logs = bedrock.getLogs();

console.log('API Interaction Summary:');
logs.forEach(log => {
  console.log(`
    Timestamp: ${log.timestamp}
    Operation: ${log.operation}
    Model: ${log.model}
    Status: ${log.status}
    Tokens: ${log.totalTokens || 'N/A'}
    Duration: ${log.duration}ms
    ${log.error ? `Error: ${log.error}` : ''}
  `);
});

// Calculate statistics
const totalTokens = logs.reduce((sum, log) => sum + (log.totalTokens || 0), 0);
const avgDuration = logs.reduce((sum, log) => sum + log.duration, 0) / logs.length;
const successRate = logs.filter(log => log.status === 'success').length / logs.length;

console.log(`
  Total API calls: ${logs.length}
  Total tokens: ${totalTokens}
  Average duration: ${avgDuration.toFixed(2)}ms
  Success rate: ${(successRate * 100).toFixed(2)}%
`);

// Clear logs
bedrock.clearLogs();
```

### Example 3: Batch Test Generation

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

const bedrock = new BedrockEngine();

async function batchGenerateTests(scenarios: string[], context: any) {
  // Combine scenarios into single prompt to reduce API calls
  const combinedPrompt = `Generate Playwright tests for the following scenarios:

${scenarios.map((scenario, index) => `${index + 1}. ${scenario}`).join('\n')}

Return a JSON array with one test specification per scenario:
[
  {
    "testName": "...",
    "description": "...",
    "steps": [...],
    "tags": [...]
  }
]`;

  const response = await bedrock.generate({
    scenario: combinedPrompt,
    context
  });

  // Parse response
  const tests = JSON.parse(response.content);
  
  console.log(`Generated ${tests.length} tests in one API call`);
  console.log(`Total cost: $${response.cost.toFixed(4)}`);
  console.log(`Tokens used: ${response.usage.totalTokens}`);

  return tests;
}

// Usage
const scenarios = [
  'User logs in with valid credentials',
  'User logs in with invalid credentials',
  'User resets password',
  'User updates profile information'
];

const tests = await batchGenerateTests(scenarios, {
  url: 'https://example.com',
  elements: [...]
});

tests.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.testName} (${test.steps.length} steps)`);
});
```

### Example 4: Caching AI Responses

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';
import { LRUCache } from 'lru-cache';

class CachedBedrockEngine {
  private engine: BedrockEngine;
  private cache: LRUCache<string, any>;

  constructor() {
    this.engine = new BedrockEngine();
    this.cache = new LRUCache({
      max: 1000,           // Max 1000 cached responses
      ttl: 1000 * 60 * 60, // 1 hour TTL
    });
  }

  async generate(request: any) {
    const cacheKey = JSON.stringify(request);
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Cache hit! Saved API call and cost');
      return {
        ...cached,
        fromCache: true
      };
    }

    // Generate and cache
    console.log('Cache miss, calling Bedrock API');
    const response = await this.engine.generate(request);
    this.cache.set(cacheKey, response);

    return {
      ...response,
      fromCache: false
    };
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      max: this.cache.max,
      hitRate: this.cache.size > 0 ? 'N/A' : '0%'
    };
  }

  clearCache() {
    this.cache.clear();
  }
}

// Usage
const cachedEngine = new CachedBedrockEngine();

// First call - cache miss
const result1 = await cachedEngine.generate({
  scenario: 'Login test',
  context: {}
});
console.log('From cache:', result1.fromCache); // false

// Second call with same request - cache hit
const result2 = await cachedEngine.generate({
  scenario: 'Login test',
  context: {}
});
console.log('From cache:', result2.fromCache); // true

console.log('Cache stats:', cachedEngine.getCacheStats());
```

### Example 5: Retry with Custom Logic

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

async function generateWithCustomRetry(
  scenario: string,
  context: any,
  maxRetries: number = 5
) {
  const bedrock = new BedrockEngine();
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}`);
      
      const result = await bedrock.generate({ scenario, context });
      
      console.log(`Success on attempt ${attempt}`);
      return result;
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);

      // Don't retry validation errors
      if (error.message.includes('AI_VALIDATION_ERROR')) {
        throw error;
      }

      // Custom backoff: 2s, 4s, 8s, 16s, 32s
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Usage
try {
  const result = await generateWithCustomRetry('Complex test scenario', {
    url: 'https://example.com',
    elements: [...]
  });
  console.log('Generated test:', result.content);
} catch (error) {
  console.error('All retries exhausted:', error.message);
}
```


---

## Error Handling

### Example 1: Comprehensive Error Handling

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

async function generateTestWithErrorHandling(scenario: string, context: any) {
  const bedrock = new BedrockEngine();

  try {
    const result = await bedrock.generate({ scenario, context });
    return {
      success: true,
      data: result
    };
  } catch (error) {
    const errorMessage = error.message || String(error);

    // Handle specific error types
    if (errorMessage.includes('AI_RATE_LIMIT')) {
      console.error('Rate limit exceeded, please try again later');
      return {
        success: false,
        error: 'RATE_LIMIT',
        message: 'Too many requests. Please wait and try again.',
        retryAfter: 60 // seconds
      };
    }

    if (errorMessage.includes('AI_VALIDATION_ERROR')) {
      console.error('Invalid request:', errorMessage);
      return {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Invalid request parameters. Please check your input.',
        details: errorMessage
      };
    }

    if (errorMessage.includes('AI_TIMEOUT')) {
      console.error('Request timed out');
      return {
        success: false,
        error: 'TIMEOUT',
        message: 'Request took too long. Try simplifying your scenario.',
        suggestion: 'Break complex scenarios into smaller steps'
      };
    }

    if (errorMessage.includes('AI_UNAVAILABLE')) {
      console.error('Bedrock service unavailable');
      return {
        success: false,
        error: 'SERVICE_UNAVAILABLE',
        message: 'AI service is temporarily unavailable. Please try again later.',
        fallback: 'Consider using OpenAI as fallback'
      };
    }

    if (errorMessage.includes('Circuit breaker is OPEN')) {
      console.error('Circuit breaker open due to repeated failures');
      return {
        success: false,
        error: 'CIRCUIT_BREAKER_OPEN',
        message: 'Service temporarily disabled due to repeated failures.',
        retryAfter: 60
      };
    }

    // Unknown error
    console.error('Unexpected error:', error);
    return {
      success: false,
      error: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred. Please try again.',
      details: errorMessage
    };
  }
}

// Usage
const result = await generateTestWithErrorHandling('Login test', {});

if (result.success) {
  console.log('Test generated successfully:', result.data.content);
} else {
  console.error(`Error (${result.error}):`, result.message);
  if (result.retryAfter) {
    console.log(`Retry after ${result.retryAfter} seconds`);
  }
}
```

### Example 2: Graceful Degradation

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

async function generateTestWithFallback(scenario: string, context: any) {
  // Try Bedrock first
  try {
    const bedrock = new BedrockEngine();
    const result = await bedrock.generate({ scenario, context });
    return {
      provider: 'BEDROCK',
      result
    };
  } catch (bedrockError) {
    console.warn('Bedrock failed, trying OpenAI:', bedrockError.message);

    // Fallback to OpenAI
    try {
      const openai = AIEngineFactory.create('OPENAI');
      const result = await openai.generateTestSpecification(
        context.analysis,
        scenario
      );
      return {
        provider: 'OPENAI',
        result
      };
    } catch (openaiError) {
      console.error('OpenAI also failed:', openaiError.message);

      // Return cached result or error
      const cached = await getCachedResult(scenario);
      if (cached) {
        console.log('Using cached result');
        return {
          provider: 'CACHE',
          result: cached
        };
      }

      throw new Error('All AI providers failed and no cache available');
    }
  }
}

// Usage
try {
  const { provider, result } = await generateTestWithFallback('Login test', {
    analysis: applicationAnalysis
  });
  console.log(`Test generated using ${provider}`);
} catch (error) {
  console.error('Complete failure:', error.message);
  // Show user-friendly error message
}
```

### Example 3: Error Logging and Monitoring

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

class MonitoredBedrockEngine {
  private engine: BedrockEngine;
  private errorCounts: Map<string, number>;

  constructor() {
    this.engine = new BedrockEngine();
    this.errorCounts = new Map();
  }

  async generate(request: any) {
    try {
      const result = await this.engine.generate(request);
      
      // Log success
      await this.logMetric({
        operation: 'generate',
        status: 'success',
        latency: result.usage.totalTokens,
        cost: result.cost
      });

      return result;
    } catch (error) {
      const errorType = this.extractErrorType(error);
      
      // Track error counts
      const count = this.errorCounts.get(errorType) || 0;
      this.errorCounts.set(errorType, count + 1);

      // Log error
      await this.logMetric({
        operation: 'generate',
        status: 'error',
        errorType,
        errorMessage: error.message
      });

      // Alert if error rate is high
      if (count + 1 >= 5) {
        await this.sendAlert({
          severity: 'HIGH',
          message: `${errorType} occurred ${count + 1} times`,
          errorType
        });
      }

      throw error;
    }
  }

  private extractErrorType(error: any): string {
    const message = error.message || '';
    if (message.includes('AI_RATE_LIMIT')) return 'RATE_LIMIT';
    if (message.includes('AI_VALIDATION_ERROR')) return 'VALIDATION';
    if (message.includes('AI_TIMEOUT')) return 'TIMEOUT';
    if (message.includes('AI_UNAVAILABLE')) return 'UNAVAILABLE';
    return 'UNKNOWN';
  }

  private async logMetric(metric: any) {
    // Send to CloudWatch, DataDog, etc.
    console.log('Metric:', JSON.stringify(metric));
  }

  private async sendAlert(alert: any) {
    // Send to SNS, PagerDuty, etc.
    console.error('ALERT:', JSON.stringify(alert));
  }

  getErrorStats() {
    return Object.fromEntries(this.errorCounts);
  }
}

// Usage
const engine = new MonitoredBedrockEngine();

for (let i = 0; i < 10; i++) {
  try {
    await engine.generate({ scenario: `Test ${i}`, context: {} });
  } catch (error) {
    console.error(`Request ${i} failed:`, error.message);
  }
}

console.log('Error statistics:', engine.getErrorStats());
```


---

## Cost Tracking

### Example 1: Real-Time Cost Monitoring

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

class CostAwareBedrockEngine {
  private engine: BedrockEngine;
  private totalCost: number = 0;
  private dailyCost: number = 0;
  private monthlyCost: number = 0;
  private costLimit: number;

  constructor(dailyCostLimit: number = 100) {
    this.engine = new BedrockEngine();
    this.costLimit = dailyCostLimit;
  }

  async generate(request: any) {
    // Check if we're over budget
    if (this.dailyCost >= this.costLimit) {
      throw new Error(`Daily cost limit reached: $${this.costLimit}`);
    }

    const result = await this.engine.generate(request);

    // Track costs
    this.totalCost += result.cost;
    this.dailyCost += result.cost;
    this.monthlyCost += result.cost;

    console.log(`
      Request cost: $${result.cost.toFixed(4)}
      Daily total: $${this.dailyCost.toFixed(4)} / $${this.costLimit}
      Monthly total: $${this.monthlyCost.toFixed(4)}
    `);

    // Warn if approaching limit
    if (this.dailyCost >= this.costLimit * 0.8) {
      console.warn(`Warning: 80% of daily budget used ($${this.dailyCost.toFixed(2)})`);
    }

    return result;
  }

  getCostSummary() {
    return {
      total: this.totalCost,
      daily: this.dailyCost,
      monthly: this.monthlyCost,
      limit: this.costLimit,
      remaining: Math.max(0, this.costLimit - this.dailyCost),
      percentUsed: (this.dailyCost / this.costLimit) * 100
    };
  }

  resetDailyCost() {
    this.dailyCost = 0;
  }

  resetMonthlyCost() {
    this.monthlyCost = 0;
  }
}

// Usage
const engine = new CostAwareBedrockEngine(50); // $50 daily limit

try {
  for (let i = 0; i < 100; i++) {
    const result = await engine.generate({
      scenario: `Test scenario ${i}`,
      context: {}
    });
    console.log(`Generated test ${i}`);
  }
} catch (error) {
  console.error('Cost limit reached:', error.message);
}

const summary = engine.getCostSummary();
console.log(`
  Cost Summary:
  - Daily: $${summary.daily.toFixed(2)} (${summary.percentUsed.toFixed(1)}% of limit)
  - Monthly: $${summary.monthly.toFixed(2)}
  - Remaining today: $${summary.remaining.toFixed(2)}
`);
```

### Example 2: Cost Comparison Between Providers

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';

async function compareCosts(scenario: string, context: any) {
  const bedrock = new BedrockEngine();
  const openai = AIEngineFactory.create('OPENAI');

  // Generate with Bedrock
  const bedrockStart = Date.now();
  const bedrockResult = await bedrock.generate({ scenario, context });
  const bedrockLatency = Date.now() - bedrockStart;

  // Generate with OpenAI (for comparison)
  const openaiStart = Date.now();
  const openaiResult = await openai.generateTestSpecification(
    context.analysis,
    scenario
  );
  const openaiLatency = Date.now() - openaiStart;

  // Compare costs (OpenAI pricing: $10/1M input, $30/1M output for GPT-4)
  const openaiCost = 
    (1500 / 1_000_000) * 10 +  // Estimated input tokens
    (2000 / 1_000_000) * 30;   // Estimated output tokens

  return {
    bedrock: {
      cost: bedrockResult.cost,
      tokens: bedrockResult.usage.totalTokens,
      latency: bedrockLatency,
      provider: 'BEDROCK'
    },
    openai: {
      cost: openaiCost,
      tokens: 3500, // Estimated
      latency: openaiLatency,
      provider: 'OPENAI'
    },
    savings: {
      amount: openaiCost - bedrockResult.cost,
      percentage: ((openaiCost - bedrockResult.cost) / openaiCost) * 100
    }
  };
}

// Usage
const comparison = await compareCosts('User login test', {
  analysis: applicationAnalysis
});

console.log(`
  Cost Comparison:
  
  Bedrock (Claude 3.5 Sonnet):
  - Cost: $${comparison.bedrock.cost.toFixed(4)}
  - Tokens: ${comparison.bedrock.tokens}
  - Latency: ${comparison.bedrock.latency}ms
  
  OpenAI (GPT-4):
  - Cost: $${comparison.openai.cost.toFixed(4)}
  - Tokens: ${comparison.openai.tokens}
  - Latency: ${comparison.openai.latency}ms
  
  Savings with Bedrock:
  - Amount: $${comparison.savings.amount.toFixed(4)}
  - Percentage: ${comparison.savings.percentage.toFixed(1)}%
`);
```

### Example 3: Cost Optimization Strategies

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

class OptimizedBedrockEngine {
  private engine: BedrockEngine;
  private cache: Map<string, any>;

  constructor() {
    this.engine = new BedrockEngine();
    this.cache = new Map();
  }

  async generate(request: any, options?: { useCache?: boolean; optimize?: boolean }) {
    // Strategy 1: Use cache to avoid API calls
    if (options?.useCache) {
      const cacheKey = JSON.stringify(request);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.log('Using cached result - Cost: $0.00');
        return cached;
      }
    }

    // Strategy 2: Optimize prompt to reduce tokens
    if (options?.optimize) {
      request = this.optimizeRequest(request);
    }

    const result = await this.engine.generate(request);

    // Cache result
    if (options?.useCache) {
      const cacheKey = JSON.stringify(request);
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  private optimizeRequest(request: any) {
    // Reduce context size
    if (request.context?.elements) {
      request.context.elements = request.context.elements.slice(0, 30);
    }

    // Simplify scenario description
    if (request.scenario) {
      request.scenario = request.scenario
        .replace(/please|kindly|could you/gi, '')
        .trim();
    }

    return request;
  }

  async batchGenerate(requests: any[]) {
    // Strategy 3: Batch requests to reduce API calls
    const combinedScenario = requests
      .map((r, i) => `${i + 1}. ${r.scenario}`)
      .join('\n');

    const result = await this.engine.generate({
      scenario: `Generate tests for:\n${combinedScenario}`,
      context: requests[0].context
    });

    console.log(`Batched ${requests.length} requests into 1 API call`);
    console.log(`Cost per test: $${(result.cost / requests.length).toFixed(4)}`);

    return result;
  }
}

// Usage
const engine = new OptimizedBedrockEngine();

// Use caching
const result1 = await engine.generate(
  { scenario: 'Login test', context: {} },
  { useCache: true, optimize: true }
);
console.log('First call cost:', result1.cost);

const result2 = await engine.generate(
  { scenario: 'Login test', context: {} },
  { useCache: true }
);
console.log('Second call cost: $0.00 (cached)');

// Use batching
const batchResult = await engine.batchGenerate([
  { scenario: 'Login test', context: {} },
  { scenario: 'Logout test', context: {} },
  { scenario: 'Register test', context: {} }
]);
```

### Example 4: Cost Tracking with DynamoDB

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

class PersistentCostTracker {
  private engine: BedrockEngine;
  private dynamodb: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.engine = new BedrockEngine();
    this.dynamodb = new DynamoDBClient({ region: 'us-east-1' });
    this.tableName = 'ai-usage-tracking';
  }

  async generate(request: any, userId: string, organizationId: string) {
    const startTime = Date.now();
    const result = await this.engine.generate(request);
    const latency = Date.now() - startTime;

    // Store usage in DynamoDB
    await this.trackUsage({
      userId,
      organizationId,
      timestamp: Date.now(),
      operation: 'generate',
      provider: 'BEDROCK',
      model: 'claude-3-5-sonnet',
      inputTokens: result.usage.promptTokens,
      outputTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
      cost: result.cost,
      latency,
      scenario: request.scenario
    });

    return result;
  }

  private async trackUsage(usage: any) {
    await this.dynamodb.send(new PutItemCommand({
      TableName: this.tableName,
      Item: {
        userId: { S: usage.userId },
        timestamp: { N: usage.timestamp.toString() },
        organizationId: { S: usage.organizationId },
        operation: { S: usage.operation },
        provider: { S: usage.provider },
        model: { S: usage.model },
        inputTokens: { N: usage.inputTokens.toString() },
        outputTokens: { N: usage.outputTokens.toString() },
        totalTokens: { N: usage.totalTokens.toString() },
        cost: { N: usage.cost.toString() },
        latency: { N: usage.latency.toString() },
        scenario: { S: usage.scenario }
      }
    }));
  }

  async getUserCosts(userId: string, days: number = 30) {
    // Query DynamoDB for user's costs
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    // Implementation would query DynamoDB and aggregate costs
    // Simplified for example
    return {
      userId,
      period: `Last ${days} days`,
      totalCost: 45.67,
      totalRequests: 1234,
      avgCostPerRequest: 0.037,
      breakdown: {
        generate: 30.45,
        analyze: 10.22,
        complete: 5.00
      }
    };
  }
}

// Usage
const tracker = new PersistentCostTracker();

await tracker.generate(
  { scenario: 'Login test', context: {} },
  'user-123',
  'org-456'
);

const costs = await tracker.getUserCosts('user-123', 30);
console.log('User costs:', costs);
```


---

## Testing Examples

### Example 1: Unit Testing BedrockEngine

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';

describe('BedrockEngine', () => {
  let engine: BedrockEngine;
  let mockClient: jest.Mocked<BedrockRuntimeClient>;

  beforeEach(() => {
    mockClient = {
      send: jest.fn(),
    } as any;

    engine = new BedrockEngine();
    (engine as any).client = mockClient;
  });

  it('should generate test with correct parameters', async () => {
    // Mock Bedrock response
    mockClient.send.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: 'Generated test code' }],
        usage: { input_tokens: 1500, output_tokens: 2000 },
      })),
    });

    const result = await engine.generate({
      scenario: 'User login test',
      context: { url: 'https://example.com' }
    });

    expect(result.content).toBe('Generated test code');
    expect(result.usage.promptTokens).toBe(1500);
    expect(result.usage.completionTokens).toBe(2000);
    expect(result.usage.totalTokens).toBe(3500);
    expect(result.provider).toBe('BEDROCK');
    expect(result.cost).toBeGreaterThan(0);
  });

  it('should handle throttling with retry', async () => {
    // First call fails with throttling
    mockClient.send
      .mockRejectedValueOnce({ name: 'ThrottlingException' })
      .mockResolvedValueOnce({
        body: new TextEncoder().encode(JSON.stringify({
          content: [{ text: 'Success after retry' }],
          usage: { input_tokens: 100, output_tokens: 200 },
        })),
      });

    const result = await engine.generate({
      scenario: 'Test',
      context: {}
    });

    expect(result.content).toBe('Success after retry');
    expect(mockClient.send).toHaveBeenCalledTimes(2);
  });

  it('should calculate cost correctly', async () => {
    mockClient.send.mockResolvedValue({
      body: new TextEncoder().encode(JSON.stringify({
        content: [{ text: 'Test' }],
        usage: { input_tokens: 1000, output_tokens: 2000 },
      })),
    });

    const result = await engine.generate({
      scenario: 'Test',
      context: {}
    });

    // Cost = (1000/1M * $3) + (2000/1M * $15) = $0.003 + $0.03 = $0.033
    expect(result.cost).toBeCloseTo(0.033, 4);
  });

  it('should handle validation errors', async () => {
    mockClient.send.mockRejectedValue({
      name: 'ValidationException',
      message: 'Invalid model input'
    });

    await expect(engine.generate({
      scenario: 'Test',
      context: {}
    })).rejects.toThrow('AI_VALIDATION_ERROR');
  });

  it('should track circuit breaker state', async () => {
    // Cause 5 failures to open circuit
    mockClient.send.mockRejectedValue({
      name: 'ServiceUnavailableException'
    });

    for (let i = 0; i < 5; i++) {
      try {
        await engine.generate({ scenario: 'Test', context: {} });
      } catch (error) {
        // Expected
      }
    }

    expect(engine.getCircuitState()).toBe('OPEN');

    // Reset circuit
    engine.resetCircuit();
    expect(engine.getCircuitState()).toBe('CLOSED');
  });
});
```

### Example 2: Integration Testing

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

describe('Bedrock Integration Tests', () => {
  let engine: BedrockEngine;

  beforeAll(() => {
    // Use real Bedrock client for integration tests
    engine = new BedrockEngine({
      region: process.env.BEDROCK_REGION || 'us-east-1'
    });
  });

  it('should generate real test from Bedrock', async () => {
    const result = await engine.generate({
      scenario: 'User logs in with valid credentials',
      context: {
        url: 'https://example.com/login',
        elements: [
          { type: 'input', selector: '#email' },
          { type: 'input', selector: '#password' },
          { type: 'button', selector: '#login-btn' }
        ]
      }
    });

    // Verify response structure
    expect(result.content).toBeTruthy();
    expect(result.content.length).toBeGreaterThan(100);
    expect(result.usage.totalTokens).toBeGreaterThan(0);
    expect(result.cost).toBeGreaterThan(0);
    expect(result.provider).toBe('BEDROCK');

    // Verify generated code contains Playwright patterns
    expect(result.content).toMatch(/test\(/);
    expect(result.content).toMatch(/await page\./);
    expect(result.content).toMatch(/expect\(/);

    console.log('Generated test:', result.content);
    console.log('Cost:', `$${result.cost.toFixed(4)}`);
    console.log('Tokens:', result.usage.totalTokens);
  }, 30000); // 30 second timeout

  it('should analyze application', async () => {
    const result = await engine.analyze({
      url: 'https://example.com',
      title: 'Example Site',
      elements: [
        { type: 'button', attributes: { id: 'login' }, text: 'Login' },
        { type: 'input', attributes: { type: 'email' }, text: '' }
      ],
      patterns: [
        { type: 'form', description: 'Login form' }
      ],
      flows: [
        { name: 'Login', steps: ['Navigate', 'Fill form', 'Submit'] }
      ],
      metadata: { isSPA: true, loadTime: 1200 }
    });

    expect(result.features).toBeDefined();
    expect(result.userFlows).toBeDefined();
    expect(result.interactiveElements).toBeDefined();
    expect(typeof result.authRequired).toBe('boolean');

    console.log('Analysis result:', JSON.stringify(result, null, 2));
  }, 30000);

  it('should handle rate limiting gracefully', async () => {
    // Make many requests quickly to trigger rate limiting
    const requests = Array(20).fill(null).map((_, i) => 
      engine.generate({
        scenario: `Test ${i}`,
        context: {}
      })
    );

    const results = await Promise.allSettled(requests);

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Successful: ${successful}, Failed: ${failed}`);

    // Some requests should succeed (with retry)
    expect(successful).toBeGreaterThan(0);
  }, 60000);
});
```

### Example 3: Property-Based Testing

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';
import * as fc from 'fast-check';

describe('BedrockEngine Property Tests', () => {
  let engine: BedrockEngine;

  beforeAll(() => {
    engine = new BedrockEngine();
  });

  it('should always return valid response structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 100 }),
        fc.record({
          url: fc.webUrl(),
          elements: fc.array(fc.record({
            type: fc.constantFrom('button', 'input', 'link'),
            selector: fc.string()
          }))
        }),
        async (scenario, context) => {
          try {
            const result = await engine.generate({ scenario, context });

            // Properties that should always hold
            expect(result).toHaveProperty('content');
            expect(result).toHaveProperty('usage');
            expect(result).toHaveProperty('cost');
            expect(result).toHaveProperty('provider');

            expect(typeof result.content).toBe('string');
            expect(result.content.length).toBeGreaterThan(0);
            expect(result.usage.totalTokens).toBeGreaterThan(0);
            expect(result.cost).toBeGreaterThanOrEqual(0);
            expect(result.provider).toBe('BEDROCK');

            return true;
          } catch (error) {
            // Errors are acceptable, but should be proper Error objects
            expect(error).toBeInstanceOf(Error);
            return true;
          }
        }
      ),
      { numRuns: 10 } // Run 10 times with random inputs
    );
  }, 120000);

  it('should have cost proportional to token usage', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 50, maxLength: 200 }),
        async (scenario) => {
          const result = await engine.generate({
            scenario,
            context: {}
          });

          // Cost should be proportional to tokens
          const expectedMinCost = 
            (result.usage.promptTokens / 1_000_000) * 3 +
            (result.usage.completionTokens / 1_000_000) * 15;

          expect(result.cost).toBeGreaterThanOrEqual(expectedMinCost * 0.9);
          expect(result.cost).toBeLessThanOrEqual(expectedMinCost * 1.1);

          return true;
        }
      ),
      { numRuns: 5 }
    );
  }, 120000);
});
```

### Example 4: Performance Testing

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';

describe('BedrockEngine Performance Tests', () => {
  let engine: BedrockEngine;

  beforeAll(() => {
    engine = new BedrockEngine();
  });

  it('should complete requests within acceptable time', async () => {
    const startTime = Date.now();

    await engine.generate({
      scenario: 'Simple login test',
      context: { url: 'https://example.com' }
    });

    const duration = Date.now() - startTime;

    // Should complete within 30 seconds
    expect(duration).toBeLessThan(30000);
    console.log(`Request completed in ${duration}ms`);
  }, 35000);

  it('should handle concurrent requests efficiently', async () => {
    const concurrency = 5;
    const startTime = Date.now();

    const requests = Array(concurrency).fill(null).map((_, i) =>
      engine.generate({
        scenario: `Test ${i}`,
        context: {}
      })
    );

    const results = await Promise.all(requests);

    const duration = Date.now() - startTime;
    const avgDuration = duration / concurrency;

    console.log(`${concurrency} concurrent requests completed in ${duration}ms`);
    console.log(`Average per request: ${avgDuration}ms`);

    // All requests should succeed
    expect(results).toHaveLength(concurrency);
    results.forEach(result => {
      expect(result.content).toBeTruthy();
    });
  }, 60000);

  it('should track performance metrics', async () => {
    const iterations = 10;
    const latencies: number[] = [];
    const costs: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      
      const result = await engine.generate({
        scenario: `Performance test ${i}`,
        context: {}
      });

      latencies.push(Date.now() - startTime);
      costs.push(result.cost);
    }

    const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
    const avgCost = costs.reduce((a, b) => a + b) / costs.length;
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];

    console.log(`
      Performance Metrics (${iterations} iterations):
      - Average latency: ${avgLatency.toFixed(2)}ms
      - P95 latency: ${p95Latency}ms
      - Average cost: $${avgCost.toFixed(4)}
      - Total cost: $${costs.reduce((a, b) => a + b).toFixed(4)}
    `);

    // Performance assertions
    expect(avgLatency).toBeLessThan(10000); // < 10 seconds average
    expect(p95Latency).toBeLessThan(30000); // < 30 seconds P95
    expect(avgCost).toBeLessThan(0.10); // < $0.10 per request
  }, 180000);
});
```

---

## Complete Example: Production-Ready Implementation

```typescript
import { BedrockEngine } from './services/ai-test-generation/bedrock-engine';
import { AIEngineFactory } from './services/ai-test-generation/ai-engine-factory';
import { LRUCache } from 'lru-cache';

/**
 * Production-ready AI service with all best practices:
 * - Caching
 * - Error handling
 * - Cost tracking
 * - Monitoring
 * - Fallback
 * - Rate limiting
 */
class ProductionAIService {
  private engine: BedrockEngine;
  private fallbackEngine: any;
  private cache: LRUCache<string, any>;
  private dailyCost: number = 0;
  private costLimit: number;
  private requestCount: number = 0;

  constructor(config?: { costLimit?: number }) {
    this.engine = new BedrockEngine({
      region: process.env.BEDROCK_REGION || 'us-east-1',
      timeout: 30000
    });

    this.fallbackEngine = AIEngineFactory.create('OPENAI');

    this.cache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 60, // 1 hour
    });

    this.costLimit = config?.costLimit || 100;
  }

  async generateTest(scenario: string, context: any): Promise<any> {
    // Check cost limit
    if (this.dailyCost >= this.costLimit) {
      throw new Error(`Daily cost limit reached: $${this.costLimit}`);
    }

    // Check cache
    const cacheKey = this.getCacheKey(scenario, context);
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('Cache hit - saved API call');
      return { ...cached, fromCache: true };
    }

    // Check circuit breaker
    const circuitState = this.engine.getCircuitState();
    if (circuitState === 'OPEN') {
      console.warn('Circuit breaker OPEN, using fallback');
      return this.generateWithFallback(scenario, context);
    }

    try {
      // Generate with Bedrock
      const result = await this.engine.generate({ scenario, context });

      // Track cost
      this.dailyCost += result.cost;
      this.requestCount++;

      // Cache result
      this.cache.set(cacheKey, result);

      // Log metrics
      await this.logMetrics({
        operation: 'generate',
        provider: 'BEDROCK',
        cost: result.cost,
        tokens: result.usage.totalTokens,
        cached: false
      });

      return { ...result, fromCache: false };
    } catch (error) {
      console.error('Bedrock failed:', error.message);

      // Use fallback
      return this.generateWithFallback(scenario, context);
    }
  }

  private async generateWithFallback(scenario: string, context: any) {
    try {
      console.log('Using OpenAI fallback');
      const result = await this.fallbackEngine.generateTestSpecification(
        context.analysis,
        scenario
      );

      await this.logMetrics({
        operation: 'generate',
        provider: 'OPENAI_FALLBACK',
        cost: 0, // Not tracked for fallback
        tokens: 0,
        cached: false
      });

      return result;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError.message);
      throw new Error('All AI providers failed');
    }
  }

  private getCacheKey(scenario: string, context: any): string {
    return JSON.stringify({ scenario, context });
  }

  private async logMetrics(metrics: any) {
    // Send to CloudWatch, DataDog, etc.
    console.log('Metrics:', JSON.stringify(metrics));
  }

  getStats() {
    return {
      dailyCost: this.dailyCost,
      costLimit: this.costLimit,
      remaining: this.costLimit - this.dailyCost,
      requestCount: this.requestCount,
      cacheSize: this.cache.size,
      circuitState: this.engine.getCircuitState()
    };
  }

  resetDailyStats() {
    this.dailyCost = 0;
    this.requestCount = 0;
  }
}

// Usage
const aiService = new ProductionAIService({ costLimit: 50 });

// Generate test
const result = await aiService.generateTest(
  'User logs in with valid credentials',
  {
    url: 'https://example.com/login',
    analysis: applicationAnalysis
  }
);

console.log('Generated test:', result.content);
console.log('From cache:', result.fromCache);
console.log('Stats:', aiService.getStats());
```

---

## References

- [Setup Guide](BEDROCK_SETUP_GUIDE.md)
- [Migration Process](BEDROCK_MIGRATION_PROCESS.md)
- [Troubleshooting Guide](BEDROCK_TROUBLESHOOTING_GUIDE.md)
- [Design Document](design.md)
- [Requirements Document](requirements.md)
- [Amazon Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude API Reference](https://docs.anthropic.com/claude/reference)

